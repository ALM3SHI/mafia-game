"""
Test harness: stubs out the heavy ML deps (faster-whisper, gradio_client)
so the WebSocket protocol and helpers can be tested without a GPU.
"""
import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

fw = types.ModuleType("faster_whisper")
fw.WhisperModel = object
sys.modules.setdefault("faster_whisper", fw)

gc = types.ModuleType("gradio_client")
gc.Client = object
gc.handle_file = lambda p: p
sys.modules.setdefault("gradio_client", gc)
