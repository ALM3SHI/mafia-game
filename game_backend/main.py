"""
Mafia AI Orchestrator — FastAPI backend.

Pipeline per user turn:
    [Unity Host] → WebSocket (audio) → Whisper STT → Ollama LLM
                                              ↓
                            sentence-streaming dispatch
                                              ↓
                       Chatterbox MTL (voice cloning) → audio chunks
                                              ↓
                  WebSocket back → [Unity Host] → Photon Voice → all clients

Designed to be drop-in portable to a cloud GPU host: every host/port/path is
sourced from `config.py` (env vars). No hardcoded localhost or paths in this
file.
"""
from __future__ import annotations

import asyncio
import base64
import binascii
import hmac
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from faster_whisper import WhisperModel
from gradio_client import Client as GradioClient, handle_file

from config import settings
from tts_cache import TTSCache

# Force UTF-8 stdout on Windows so Arabic logs don't crash cp1252 console.
if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


# ---------------------------------------------------------------------------
# Text preprocessing — clean LLM output before feeding into neural TTS
# ---------------------------------------------------------------------------
_RE_HA_LAUGH = re.compile(r"[هـ]{3,}")
_RE_REPEAT_CHAR = re.compile(r"(.)\1{2,}")
_RE_PARENTHETICAL = re.compile(r"[\(\[][^\)\]]{0,40}[\)\]]")
_RE_WHITESPACE = re.compile(r"\s+")
# Sentence boundary: Arabic question mark (؟), Latin .!?, Arabic full stop (۔).
_RE_SENTENCE_END = re.compile(r"([.!?؟۔])\s+")


def clean_text_for_tts(text: str) -> str:
    if not text:
        return ""
    text = _RE_PARENTHETICAL.sub("", text)
    text = _RE_HA_LAUGH.sub("", text)
    text = _RE_REPEAT_CHAR.sub(r"\1\1", text)
    text = _RE_WHITESPACE.sub(" ", text).strip()
    return text


def split_into_sentences(text: str) -> list[str]:
    """Split on sentence boundaries while keeping the punctuation."""
    parts = _RE_SENTENCE_END.split(text)
    sentences: list[str] = []
    buf = ""
    for token in parts:
        buf += token
        if _RE_SENTENCE_END.fullmatch(token + " "):  # token is just punctuation
            sentences.append(buf.strip())
            buf = ""
    if buf.strip():
        sentences.append(buf.strip())
    return [s for s in sentences if s]


# ---------------------------------------------------------------------------
# Globals (initialized in lifespan)
# ---------------------------------------------------------------------------
whisper_model: Optional[WhisperModel] = None
tts_client: Optional[GradioClient] = None
tts_cache: Optional[TTSCache] = None
tts_lock = asyncio.Lock()  # serialize TTS calls — single GPU, single user of Chatterbox

# Cache of handle_file() wrappers keyed by absolute path. Each gradio_client
# call with a path uploads that file to the studio; wrapping once and reusing
# avoids re-uploading 1.4 MB of WAV per generation.
_ref_audio_cache: dict[str, object] = {}


def _get_ref_audio_arg(ref_audio: Optional[str]):
    if not ref_audio:
        return None
    cached = _ref_audio_cache.get(ref_audio)
    if cached is None:
        cached = handle_file(ref_audio)
        _ref_audio_cache[ref_audio] = cached
    return cached


# ---------------------------------------------------------------------------
# Local TTS caller — Chatterbox Multilingual via gradio_client
# ---------------------------------------------------------------------------
def _predict_unified_tts(text: str, ref_audio: Optional[str]) -> Optional[str]:
    """Blocking gradio call. Returns generated WAV path or None."""
    if tts_client is None:
        return None
    # Newer Gradio versions require file inputs to be wrapped via handle_file()
    # so they're serialized as FileData with the right `meta` envelope.
    # Wrapper is cached per path so we don't re-upload the 1.4 MB WAV every call.
    ref_audio_arg = _get_ref_audio_arg(ref_audio)
    try:
        result = tts_client.predict(
            text_input=text,
            tts_engine=settings.tts_engine,
            audio_format=settings.tts_format,

            # Chatterbox vanilla — unused.
            chatterbox_ref_audio=None,
            chatterbox_exaggeration=0.5, chatterbox_temperature=0.8,
            chatterbox_cfg_weight=0.5, chatterbox_chunk_size=300, chatterbox_seed=0,

            # Chatterbox Multilingual — THIS IS OUR ENGINE.
            chatterbox_mtl_ref_audio=ref_audio_arg,             # ← voice cloning (FileData-wrapped)
            chatterbox_mtl_language=settings.tts_language,
            chatterbox_mtl_exaggeration=settings.tts_exaggeration,
            chatterbox_mtl_temperature=settings.tts_temperature,
            chatterbox_mtl_cfg_weight=settings.tts_cfg_weight,
            chatterbox_mtl_repetition_penalty=settings.tts_repetition_penalty,
            chatterbox_mtl_min_p=settings.tts_min_p,
            chatterbox_mtl_top_p=settings.tts_top_p,
            chatterbox_mtl_chunk_size=settings.tts_chunk_size,
            chatterbox_mtl_seed=settings.tts_seed,

            # Chatterbox Turbo — unused.
            chatterbox_turbo_ref_audio=None,
            chatterbox_turbo_exaggeration=0.5, chatterbox_turbo_temperature=0.8,
            chatterbox_turbo_cfg_weight=0.5, chatterbox_turbo_repetition_penalty=1.2,
            chatterbox_turbo_min_p=0.05, chatterbox_turbo_top_p=1.0,
            chatterbox_turbo_chunk_size=300, chatterbox_turbo_seed=0,

            # Other engines — defaults so signature validates.
            kokoro_voice="af_heart", kokoro_speed=1.0,
            fish_ref_audio=None, fish_ref_text=None, fish_temperature=0.8,
            fish_top_p=0.8, fish_repetition_penalty=1.1, fish_max_tokens=1024, fish_seed=None,
            fish_s2_ref_audio=None, fish_s2_ref_text=None, fish_s2_temperature=0.8,
            fish_s2_top_p=0.8, fish_s2_repetition_penalty=1.1, fish_s2_max_tokens=2048, fish_s2_seed=None,
            indextts_ref_audio=None, indextts_temperature=0.8, indextts_seed=None,
            indextts2_ref_audio=None, indextts2_emotion_mode="audio_reference",
            indextts2_emotion_audio=None, indextts2_emotion_description="",
            indextts2_emo_alpha=1.0, indextts2_happy=0, indextts2_angry=0, indextts2_sad=0,
            indextts2_afraid=0, indextts2_disgusted=0, indextts2_melancholic=0,
            indextts2_surprised=0, indextts2_calm=1, indextts2_temperature=0.8,
            indextts2_top_p=0.9, indextts2_top_k=50, indextts2_repetition_penalty=1.1,
            indextts2_max_mel_tokens=1500, indextts2_seed=None, indextts2_use_random=False,
            f5_ref_audio=None, f5_ref_text=None, f5_speed=1.0,
            f5_cross_fade=0.15, f5_remove_silence=False, f5_seed=0,
            higgs_ref_audio=None, higgs_ref_text=None, higgs_voice_preset="EMPTY",
            higgs_system_prompt="", higgs_temperature=1.0, higgs_top_p=0.95,
            higgs_top_k=50, higgs_max_tokens=1024, higgs_ras_win_len=7, higgs_ras_win_max_num_repeat=2,
            kitten_voice="expr-voice-2-f",
            voxcpm_ref_audio=None, voxcpm_ref_text=None, voxcpm_cfg_value=2,
            voxcpm_inference_timesteps=10, voxcpm_normalize=True, voxcpm_denoise=True,
            voxcpm_retry_badcase=True, voxcpm_retry_badcase_max_times=3,
            voxcpm_retry_badcase_ratio_threshold=6, voxcpm_seed=-1,
            qwen_mode="voice_clone", qwen_voice_description="", qwen_ref_audio=None,
            qwen_ref_text="", qwen_xvector_only=False, qwen_clone_model_size="1.7B",
            qwen_chunk_size=200, qwen_chunk_gap=0, qwen_speaker="Ryan",
            qwen_custom_model_size="1.7B", qwen_style_instruct="", qwen_language="Auto",
            qwen_seed=-1,

            # Post-FX — bypass for raw voice.
            gain_db=0, enable_eq=False, eq_bass=0, eq_mid=0, eq_treble=0,
            enable_reverb=False, reverb_room=0.3, reverb_damping=0.5, reverb_wet=0.3,
            enable_echo=False, echo_delay=0.3, echo_decay=0.5,
            enable_pitch=False, pitch_semitones=0,

            api_name="/generate_unified_tts",
        )
        if isinstance(result, (list, tuple)) and result:
            return result[0]
        if isinstance(result, str):
            return result
        return None
    except Exception as e:
        print(f">>> [TTS] gradio predict failed: {e}")
        return None


async def synth_tts(
    text: str, ref_audio_path: Optional[str], voice_id: str
) -> tuple[Optional[bytes], dict]:
    """
    Cache-aware TTS. voice_id is part of the cache key so the same text
    cloned into different voices doesn't collide.

    Returns (audio_bytes, timing_dict). timing_dict includes:
        cached:       True if served from cache (sub-millisecond)
        gen_s:        wall-clock seconds spent in Chatterbox (gradio call)
        wait_s:       seconds spent waiting on the tts_lock (queued behind another call)
    """
    timings = {"cached": False, "gen_s": 0.0, "wait_s": 0.0}
    if not text or tts_client is None:
        return None, timings

    if tts_cache is not None:
        cached = tts_cache.get(voice_id, text)
        if cached is not None:
            timings["cached"] = True
            return cached, timings

    t_wait = time.perf_counter()
    async with tts_lock:
        timings["wait_s"] = round(time.perf_counter() - t_wait, 3)
        t_gen = time.perf_counter()
        audio_path = await asyncio.to_thread(_predict_unified_tts, text, ref_audio_path)
        timings["gen_s"] = round(time.perf_counter() - t_gen, 3)

    if not audio_path or not os.path.exists(audio_path):
        return None, timings

    try:
        audio_bytes = Path(audio_path).read_bytes()
    except OSError:
        return None, timings
    finally:
        try:
            os.remove(audio_path)
        except OSError:
            pass

    if tts_cache is not None:
        tts_cache.put(voice_id, text, audio_bytes)
    return audio_bytes, timings


# ---------------------------------------------------------------------------
# Ollama streaming — yields token chunks as they arrive
# ---------------------------------------------------------------------------
def _validate_ollama_url() -> Optional[str]:
    """Return a human-readable error if OLLAMA_URL is malformed, else None."""
    url = settings.ollama_url
    if not url.startswith(("http://", "https://")):
        return (f"OLLAMA_URL must start with http:// or https:// "
                f"(got: {url!r}). Common cause: pasted as Markdown link "
                f"with [brackets]. Edit .env and remove them.")
    if "/api/generate" not in url:
        return (f"OLLAMA_URL must end with /api/generate "
                f"(got: {url!r}). Append it.")
    return None


async def stream_ollama(prompt: str) -> AsyncIterator[str]:
    """
    Async generator over Ollama's streaming response. Each yielded value is
    a partial text fragment (1+ tokens). Caller can accumulate and watch for
    sentence boundaries to dispatch TTS without waiting for full completion.

    Raises RuntimeError on misconfigured URL or unreachable Ollama host so
    callers can surface a clean error to the client instead of crashing the
    whole websocket loop.
    """
    err = _validate_ollama_url()
    if err:
        raise RuntimeError(err)

    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": True,
        # Per-request keep_alive overrides any server-side default and
        # ensures the model stays resident in VRAM between game turns.
        "keep_alive": settings.ollama_keep_alive,
        "options": {
            "num_predict": settings.ollama_num_predict,
            "temperature": settings.ollama_temperature,
        },
    }
    body = json.dumps(payload).encode("utf-8")

    def open_stream():
        req = urllib.request.Request(
            settings.ollama_url, body, {"Content-Type": "application/json"}
        )
        return urllib.request.urlopen(req, timeout=15)

    try:
        response = await asyncio.to_thread(open_stream)
    except urllib.error.URLError as e:
        raise RuntimeError(
            f"Cannot reach Ollama at {settings.ollama_url}. "
            f"Check: (1) Ollama is running on the laptop, "
            f"(2) it's bound to 0.0.0.0:11434 (not 127.0.0.1), "
            f"(3) firewall allows port 11434, "
            f"(4) both machines are on the same LAN. "
            f"Underlying error: {e}"
        ) from e
    except Exception as e:
        raise RuntimeError(f"Ollama request failed: {type(e).__name__}: {e}") from e

    try:
        while True:
            line = await asyncio.to_thread(response.readline)
            if not line:
                break
            try:
                obj = json.loads(line.decode("utf-8"))
            except json.JSONDecodeError:
                continue
            if "error" in obj:
                raise RuntimeError(f"Ollama returned error: {obj['error']}")
            chunk = obj.get("response", "")
            if chunk:
                yield chunk
            if obj.get("done"):
                break
    finally:
        response.close()


def _names(items, limit: int = 12) -> str:
    out = [str(x)[:30] for x in (items or [])][:limit]
    return "، ".join(out) if out else "لا أحد"


def build_system_prompt(game_context: dict) -> str:
    """
    Prompt for ONE bot. The bot only learns what its role would know in a
    real game: its own role, its mafia teammates (if mafia), who is alive and
    who is dead. It is never told the human's role or other bots' roles, so
    it cannot leak them.
    """
    ctx = game_context if isinstance(game_context, dict) else {}
    speaker = ctx.get("speaker") if isinstance(ctx.get("speaker"), dict) else {}
    name = str(speaker.get("name") or "بوت")[:30]
    role = str(speaker.get("role") or "مواطن")[:20]
    teammates = speaker.get("mafiaTeammates") or []
    human = str(ctx.get("humanName") or "اللاعب")[:30]
    phase = str(ctx.get("phase") or "النهار")[:20]
    round_no = ctx.get("round", 1)
    alive = _names(ctx.get("alivePlayers"))
    dead = _names(
        f"{d.get('name')} ({d.get('role')})" if isinstance(d, dict) and d.get("role") else (d.get("name") if isinstance(d, dict) else d)
        for d in (ctx.get("deadPlayers") or [])
    )

    if role == "مافيا":
        secret = (
            f"أنت سراً من المافيا وشركاؤك: {_names(teammates)}. "
            "لا تعترف أبداً أنك مافيا، ودافع عن نفسك وعن شركائك، ووجّه الشك لغيركم."
        )
    else:
        secret = f"دورك الحقيقي: {role}. أنت مع المدينة وتحاول تكشف المافيا. لا تكشف دورك إلا إذا كان في مصلحتك."

    return f"""أنت "{name}"، لاعب في لعبة مافيا صوتية.
{secret}

حالة اللعبة:
- المرحلة: {phase} (الجولة {round_no})
- الأحياء: {alive}
- الموتى: {dead}
- اللاعب الذي يكلمك الآن: {human}

قواعد الرد (التزم بها حرفياً):
0. اكتب بالعربية فقط، بدون أي حروف إنجليزية.
1. افهم المعنى العام وتجاهل أخطاء تحويل الصوت إلى نص.
2. تكلم بلهجة سعودية بيضاء طبيعية كأنك شاب يلعب أونلاين.
3. رد بجملة أو جملتين قصيرتين فقط.
4. لا تكتب ملاحظات بين أقواس ولا تذكر أنك ذكاء اصطناعي.

أمثلة للأسلوب:
- "يا حبيبي طير بس، أنا مواطن والمافيا معروف مين."
- "أنت المافيا وجاي ترمي بلاك عليّ؟ مكشوفة حركاتك."
- "كلامك مردود عليك، تصويتي بيكون ضدك اليوم."
"""


# ---------------------------------------------------------------------------
# Whisper STT
# ---------------------------------------------------------------------------
def transcribe_blocking(tmp_path: str) -> str:
    """
    STT tuned for short conversational utterances (3-7 seconds typical).

    Speed knobs vs the previous "max quality" config:
      - beam_size 5 -> 1   : greedy decoding, ~2-3x faster on CPU. Quality
                              drop is negligible for clear single-speaker
                              audio (which is what a player mic provides).
      - temperature [0.0, 0.2, 0.4] -> 0.0 only : disables the fallback
                              re-runs that fired on "difficult" clips and
                              caused the 49s spikes. With clean input,
                              temperature=0 is the right call.
      - condition_on_previous_text=False : every utterance is independent
                              in a Mafia game; previous-context conditioning
                              just adds noise here.
    """
    if whisper_model is None:
        return ""
    segs, _ = whisper_model.transcribe(
        tmp_path,
        language=settings.whisper_language,
        beam_size=1,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
        temperature=0.0,
        condition_on_previous_text=False,
        initial_prompt="نلعب مافيا: مواطن، طبيب، محقق، تصويت، طرد، أتهمك، أنا بريء، مين المافيا؟",
    )
    return "".join(s.text for s in segs).strip()


# ---------------------------------------------------------------------------
# Auth — optional Bearer token check, no-op if MAFIA_API_KEY is empty
# ---------------------------------------------------------------------------
def check_ws_api_key(websocket: WebSocket) -> bool:
    """
    Accepts either `Authorization: Bearer <key>` (Unity / native clients) or
    `?token=<key>` (browsers cannot set headers on a WebSocket handshake).
    """
    if not settings.api_key:
        return True
    expected = settings.api_key
    auth = websocket.headers.get("authorization", "")
    supplied = auth[7:] if auth.lower().startswith("bearer ") else websocket.query_params.get("token", "")
    return hmac.compare_digest(supplied.encode(), expected.encode())


def resolve_ref_audio(ref: Optional[str]) -> Optional[str]:
    """
    Resolve a client-supplied voice reference to a file INSIDE the data
    directory. Absolute paths and `..` escapes are rejected — previously a
    client could make the server upload any file on disk to the TTS studio.
    """
    if not ref or not isinstance(ref, str):
        return None
    base = settings.data_path.resolve()
    candidate = (base / ref).resolve()
    if base != candidate and base not in candidate.parents:
        return None
    return str(candidate) if candidate.is_file() else None


# ---------------------------------------------------------------------------
# Lifespan: load models, create dirs, preload Chatterbox
# ---------------------------------------------------------------------------
def _init_tts_client_blocking() -> Optional[GradioClient]:
    try:
        client = GradioClient(settings.tts_base_url, verbose=False)
    except Exception as e:
        print(f">>> [TTS] Could not connect to studio: {e}")
        return None

    # Preload Chatterbox Multilingual into VRAM so first user-facing call is hot.
    try:
        client.predict(api_name="/handle_load_chatterbox_multilingual")
        print(">>> [SUCCESS] Chatterbox Multilingual preloaded on GPU.")
    except Exception as e:
        print(f">>> [WARN] Could not preload Chatterbox Multilingual: {e}")

    return client


@asynccontextmanager
async def lifespan(app: FastAPI):
    global whisper_model, tts_client, tts_cache
    print(">>> [SYSTEM] Starting AI Orchestrator...")

    settings.ensure_directories()
    tts_cache = TTSCache(settings.cache_path)
    print(f">>> [CACHE] TTS cache @ {settings.cache_path}")

    # Whisper — try the configured device, fall back to CPU on cuBLAS/cuDNN
    # errors so a missing CUDA Toolkit (cublas64_12.dll, cudnn_*.dll) doesn't
    # take the whole server down. The fallback path is the same code as a
    # CPU-only setup, so behavior is deterministic.
    try:
        whisper_model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        print(f">>> [SUCCESS] Whisper '{settings.whisper_model}' on "
              f"{settings.whisper_device}/{settings.whisper_compute_type}.")
    except Exception as e:
        if settings.whisper_device != "cpu":
            print(f">>> [WARN] Whisper failed on {settings.whisper_device} "
                  f"({type(e).__name__}: {e}). Falling back to CPU/int8.")
            try:
                whisper_model = WhisperModel(
                    settings.whisper_model, device="cpu", compute_type="int8"
                )
                print(f">>> [SUCCESS] Whisper '{settings.whisper_model}' on cpu/int8 (fallback).")
            except Exception as e2:
                print(f">>> [ERROR] Whisper CPU fallback also failed: {e2}")
        else:
            print(f">>> [ERROR] Whisper load failed: {e}")

    # Ollama health check
    try:
        ollama_root = settings.ollama_url.rsplit("/api/", 1)[0] + "/"
        with urllib.request.urlopen(urllib.request.Request(ollama_root, method="GET"), timeout=3) as r:
            if r.status == 200:
                print(f">>> [SUCCESS] Ollama reachable @ {ollama_root}")
    except Exception:
        print(f">>> [CRITICAL] Ollama not reachable @ {settings.ollama_url}")

    # TTS studio
    print(f">>> [SYSTEM] Connecting to TTS studio @ {settings.tts_base_url}...")
    tts_client = await asyncio.to_thread(_init_tts_client_blocking)
    if tts_client:
        print(">>> [SUCCESS] TTS studio ready.")
        # Warm-up: dummy generation to compile CUDA kernels before real users.
        ref = settings.tts_default_ref_audio_path
        ref_str = str(ref) if ref and ref.exists() else None
        if ref_str:
            print(f">>> [TTS] Default voice ref: {ref_str}")
        else:
            print(">>> [TTS] No voice ref found — using default Chatterbox voice.")
        warm_audio, warm_t = await synth_tts("جاهز.", ref_str, voice_id="_warmup")
        if warm_audio:
            print(f">>> [TTS] Warm-up OK in {warm_t['gen_s']}s "
                  f"({len(warm_audio)} bytes).")
        else:
            print(">>> [TTS] Warm-up failed — first real call will be slow.")
    else:
        print(f">>> [WARN] TTS studio unreachable @ {settings.tts_base_url}")

    print(">>> [SYSTEM] Server fully operational.")
    yield
    print(">>> [SYSTEM] Shutting down...")


app = FastAPI(title="Mafia AI Orchestrator", lifespan=lifespan)


# ---------------------------------------------------------------------------
# HTTP endpoints — health + cache stats (handy for cloud monitoring later)
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "whisper_loaded": whisper_model is not None,
        "tts_loaded": tts_client is not None,
        "cache_stats": tts_cache.stats() if tts_cache else None,
    }


# ---------------------------------------------------------------------------
# WebSocket: /ws/audio — main game pipeline
# ---------------------------------------------------------------------------
MAX_AUDIO_B64_CHARS = 12 * 1024 * 1024  # ~9 MB of audio — far more than a push-to-talk clip
_RE_SAFE_ID = re.compile(r"[^A-Za-z0-9_\-]")


def _safe_voice_id(raw: object, default: str) -> str:
    """Speaker ids become cache keys; keep them short and boring."""
    text = _RE_SAFE_ID.sub("", str(raw or ""))[:64]
    return text or default


async def _receive_message(websocket: WebSocket) -> Optional[dict]:
    """Return the next JSON object, or None for malformed frames (never raises on bad JSON)."""
    raw = await websocket.receive_text()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        await websocket.send_json({"status": "error", "message": "رسالة غير صالحة"})
        return None
    if not isinstance(data, dict):
        await websocket.send_json({"status": "error", "message": "رسالة غير صالحة"})
        return None
    return data


async def _handle_audio_turn(websocket: WebSocket, data: dict) -> None:
    t_start = time.perf_counter()
    base64_audio = data.get("audio_data") or ""
    game_context = data.get("game_context") or {}
    speaker_id = _safe_voice_id(data.get("speaker_id"), "default_bot")

    if not whisper_model:
        await websocket.send_json({"status": "error", "message": "خدمة تحويل الصوت غير جاهزة"})
        return
    if not isinstance(base64_audio, str) or not base64_audio or len(base64_audio) > MAX_AUDIO_B64_CHARS:
        await websocket.send_json({"status": "error", "message": "مقطع صوتي فارغ أو كبير جداً"})
        return
    try:
        audio_bytes = base64.b64decode(base64_audio, validate=True)
    except (binascii.Error, ValueError):
        await websocket.send_json({"status": "error", "message": "ترميز الصوت غير صالح"})
        return

    # 1. STT (Whisper needs a file path).
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    t_stt0 = time.perf_counter()
    try:
        user_text = await asyncio.to_thread(transcribe_blocking, tmp_path)
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
    t_stt1 = time.perf_counter()

    if not user_text:
        await websocket.send_json({"status": "error", "message": "لم أسمعك جيداً"})
        return
    print(f"[STT {t_stt1 - t_stt0:.2f}s] {user_text}")
    await websocket.send_json({"status": "transcript", "text": user_text})

    # 2. LLM (streaming) → 3. TTS per sentence.
    ref_path = resolve_ref_audio(data.get("ref_audio")) or (
        str(settings.tts_default_ref_audio_path)
        if settings.tts_default_ref_audio_path and settings.tts_default_ref_audio_path.exists()
        else None
    )
    system_prompt = build_system_prompt(game_context)
    full_prompt = f"System: {system_prompt}\nUser: {user_text}\nAssistant:"

    t_llm0 = time.perf_counter()
    buffer = ""
    full_reply = ""
    sentence_index = 0
    tts_total_gen = 0.0

    async def speak(sentence: str) -> None:
        nonlocal sentence_index, tts_total_gen
        clean = clean_text_for_tts(sentence)
        if not clean:
            return
        audio, tts_t = await synth_tts(clean, ref_path, voice_id=speaker_id)
        tts_total_gen += tts_t["gen_s"]
        await _send_audio_chunk(websocket, sentence_index, clean, audio, tts_t)
        sentence_index += 1

    try:
        async for chunk in stream_ollama(full_prompt):
            buffer += chunk
            full_reply += chunk
            sentences = split_into_sentences(buffer)
            if len(sentences) >= 2:
                *complete, buffer = sentences  # last item may be incomplete
                for sentence in complete:
                    await speak(sentence)
    except RuntimeError as e:
        await websocket.send_json({"status": "error", "message": str(e)})
        return
    t_llm1 = time.perf_counter()

    await speak(buffer)

    t_total = time.perf_counter() - t_start
    await websocket.send_json({
        "status": "done",
        "full_text": clean_text_for_tts(full_reply),
        "sentence_count": sentence_index,
        "timings": {
            "stt_s": round(t_stt1 - t_stt0, 3),
            "llm_s": round(t_llm1 - t_llm0, 3),
            "tts_total_gen_s": round(tts_total_gen, 3),
            "total_s": round(t_total, 3),
        },
    })
    print(f"[DONE {t_total:.2f}s] {sentence_index} sentence(s).")


@app.websocket("/ws/audio")
async def audio_endpoint(websocket: WebSocket):
    if not check_ws_api_key(websocket):
        await websocket.close(code=4401)
        return
    await websocket.accept()
    print("[WS /ws/audio] Client connected.")
    try:
        while True:
            data = await _receive_message(websocket)
            if data is None or data.get("event") != "audio_complete":
                continue
            try:
                await _handle_audio_turn(websocket, data)
            except WebSocketDisconnect:
                raise
            except Exception as e:  # one bad turn must not kill the session
                print(f"[WS /ws/audio] turn failed: {type(e).__name__}: {e}")
                await websocket.send_json({"status": "error", "message": "حدث خطأ أثناء معالجة الصوت"})
    except WebSocketDisconnect:
        print("[WS /ws/audio] Client disconnected.")


async def _send_audio_chunk(
    ws: WebSocket,
    idx: int,
    text: str,
    audio: Optional[bytes],
    tts_timings: Optional[dict] = None,
) -> None:
    payload = {
        "status": "chunk",
        "index": idx,
        "text": text,
        "audio_data": base64.b64encode(audio).decode("utf-8") if audio else "",
        "tts_timings": tts_timings or {},
    }
    await ws.send_json(payload)


# ---------------------------------------------------------------------------
# WebSocket: /ws/clone — request bot speech in a specific player's voice
# ---------------------------------------------------------------------------
@app.websocket("/ws/clone")
async def clone_endpoint(websocket: WebSocket):
    """
    Request shape:
        { "text": "...", "ref_audio": "clones/playerXYZ.wav", "speaker_id": "playerXYZ" }
    ref_audio must be a path relative to MAFIA_DATA_DIR (no absolute paths, no `..`).
    """
    if not check_ws_api_key(websocket):
        await websocket.close(code=4401)
        return
    await websocket.accept()
    print("[WS /ws/clone] Client connected.")
    try:
        while True:
            data = await _receive_message(websocket)
            if data is None:
                continue
            text = str(data.get("text") or "").strip()[:500]
            speaker_id = _safe_voice_id(data.get("speaker_id"), "clone")
            ref_arg = data.get("ref_audio") or ""
            if not text:
                await websocket.send_json({"status": "error", "message": "empty text"})
                continue

            ref_path = resolve_ref_audio(ref_arg) if ref_arg else None
            if ref_arg and ref_path is None:
                await websocket.send_json({"status": "error", "message": "ref_audio not found"})
                continue

            try:
                clean = clean_text_for_tts(text)
                audio, tts_t = await synth_tts(clean, ref_path, voice_id=speaker_id)
            except Exception as e:
                print(f"[WS /ws/clone] TTS failed: {type(e).__name__}: {e}")
                audio, tts_t, clean = None, {}, text
            if audio is None:
                await websocket.send_json({"status": "error", "message": "TTS failed"})
                continue
            await websocket.send_json({
                "status": "ok",
                "text": clean,
                "audio_data": base64.b64encode(audio).decode("utf-8"),
                "tts_timings": tts_t,
            })
    except WebSocketDisconnect:
        print("[WS /ws/clone] Client disconnected.")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    print(f">>> Binding {settings.host}:{settings.port}  "
          f"(API key {'enabled' if settings.api_key else 'DISABLED'})")
    uvicorn.run("main:app", host=settings.host, port=settings.port, log_level="warning")
