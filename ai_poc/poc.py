import time
import os
import sys
import io
import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
from faster_whisper import WhisperModel
from llama_cpp import Llama
import asyncio
import edge_tts
import pygame

# Force UTF-8 for Windows Terminal to support Arabic output
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_AUDIO = os.path.join(BASE_DIR, "input.wav")
OUTPUT_AUDIO = os.path.join(BASE_DIR, "output.mp3")
# Use the correct model filename found in the directory
MODEL_PATH = os.path.join(BASE_DIR, "Llama-3.1-8B-Instruct-UD-Q4_K_XL.gguf")

def record_audio(duration=5, sample_rate=16000):
    """
    Record audio from the microphone for 'duration' seconds.
    Save it to INPUT_AUDIO using scipy.io.wavfile.
    Print 'Recording...' at the start and 'Finished recording' at the end.
    """
    print("Recording...")
    # Record mono audio
    recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1, dtype='int16')
    sd.wait()  # Wait until recording is finished
    wav.write(INPUT_AUDIO, sample_rate, recording)
    print("Finished recording")

def transcribe_audio():
    """
    Load Faster-Whisper (model='base', device='cuda' if available else 'cpu').
    Transcribe INPUT_AUDIO.
    Return the transcribed Arabic text.
    """
    # Check for CUDA availability (using a simple check)
    device = "cpu"
    try:
        import torch
        if torch.cuda.is_available():
            device = "cuda"
    except ImportError:
        pass
    
    # Initialize WhisperModel
    # Note: compute_type="int8" is safer for CPU, "float16" for GPU
    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel("base", device=device, compute_type=compute_type)
    
    segments, info = model.transcribe(INPUT_AUDIO, beam_size=5)
    
    transcribed_text = ""
    for segment in segments:
        transcribed_text += segment.text
        
    return transcribed_text.strip()

def generate_text(prompt_text):
    """
    Load Llama model using llama_cpp.
    IMPORTANT: Optimize for speed (max_tokens=20, simple system prompt).
    System prompt: "أنت لاعب في لعبة مافيا. أجب بجملة واحدة قصيرة جدا وباللغة العربية."
    Pass the transcribed 'prompt_text' to the model.
    Return the generated string.
    """
    # Load model
    llm = Llama(
        model_path=MODEL_PATH,
        n_ctx=512,
        n_threads=os.cpu_count(), # Use all available cores for CPU speed
        verbose=False
    )
    
    system_prompt = "أنت لاعب في لعبة مافيا. أجب بجملة واحدة قصيرة جدا وباللغة العربية."
    # Formatting for Llama-3 style if possible, or just a simple prompt
    formatted_prompt = f"System: {system_prompt}\nUser: {prompt_text}\nAssistant:"
    
    response = llm(
        formatted_prompt,
        max_tokens=20,
        stop=["User:", "\n"],
        echo=False
    )
    
    return response['choices'][0]['text'].strip()

async def text_to_speech(text):
    """
    Use edge_tts to convert 'text' to audio.
    Save to OUTPUT_AUDIO.
    Use an Arabic voice (e.g., 'ar-SA-HamedNeural').
    """
    communicate = edge_tts.Communicate(text, "ar-SA-HamedNeural")
    await communicate.save(OUTPUT_AUDIO)

def play_audio():
    """
    Play the OUTPUT_AUDIO using pygame.mixer.
    Block execution until the audio finishes playing.
    """
    pygame.mixer.init()
    pygame.mixer.music.load(OUTPUT_AUDIO)
    pygame.mixer.music.play()
    
    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)
    
    pygame.mixer.quit()

def main():
    print("--- STARTING MAFIA AI PoC ---")
    
    # 1. Record
    record_audio(duration=5)
    
    # 2. STT
    t0 = time.time()
    text = transcribe_audio()
    t1 = time.time()
    print(f"[STT] Time: {t1-t0:.2f}s | Text: {text}")
    
    # 3. LLM
    if not text.strip():
        print("No speech detected.")
        return
        
    t2 = time.time()
    response = generate_text(text)
    t3 = time.time()
    print(f"[LLM] Time: {t3-t2:.2f}s | Response: {response}")
    
    # 4. TTS
    t4 = time.time()
    asyncio.run(text_to_speech(response))
    t5 = time.time()
    print(f"[TTS] Time: {t5-t4:.2f}s")
    
    # 5. Play
    play_audio()
    
    print(f"--- TOTAL PIPELINE TIME: {(t1-t0) + (t3-t2) + (t5-t4):.2f}s ---")

if __name__ == "__main__":
    main()
