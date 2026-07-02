"""
Centralized configuration for the Mafia AI backend.

Every tunable lives here, sourced from environment variables with safe
defaults for local development on the RTX 3050 dev box. Designed so that
moving to a cloud GPU host requires only a different `.env` — zero code
changes.

Usage:
    from config import settings
    settings.ollama_url
    settings.tts_default_ref_audio_path  # resolved absolute path
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# .env loader — zero external deps (no python-dotenv requirement)
# ---------------------------------------------------------------------------
def _load_dotenv(path: Path) -> None:
    """Minimal .env loader. Ignores comments and blank lines."""
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Don't override values that are already set in the real environment.
        os.environ.setdefault(key, value)


_BACKEND_DIR = Path(__file__).resolve().parent
_load_dotenv(_BACKEND_DIR / ".env")


def _env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


def _env_float(key: str, default: float) -> float:
    raw = os.environ.get(key)
    return float(raw) if raw not in (None, "") else default


def _env_int(key: str, default: int) -> int:
    raw = os.environ.get(key)
    return int(raw) if raw not in (None, "") else default


# ---------------------------------------------------------------------------
# Settings dataclass
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Settings:
    # Server
    host: str = field(default_factory=lambda: _env("MAFIA_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: _env_int("MAFIA_PORT", 8000))
    api_key: str = field(default_factory=lambda: _env("MAFIA_API_KEY", ""))

    # Ollama
    ollama_url: str = field(default_factory=lambda: _env("OLLAMA_URL", "http://127.0.0.1:11434/api/generate"))
    ollama_model: str = field(default_factory=lambda: _env("OLLAMA_MODEL", "qwen2.5:3b"))
    ollama_num_predict: int = field(default_factory=lambda: _env_int("OLLAMA_NUM_PREDICT", 80))
    ollama_temperature: float = field(default_factory=lambda: _env_float("OLLAMA_TEMPERATURE", 0.6))
    ollama_keep_alive: str = field(default_factory=lambda: _env("OLLAMA_KEEP_ALIVE", "1h"))

    # Whisper
    whisper_model: str = field(default_factory=lambda: _env("WHISPER_MODEL", "small"))
    whisper_device: str = field(default_factory=lambda: _env("WHISPER_DEVICE", "cpu"))
    whisper_compute_type: str = field(default_factory=lambda: _env("WHISPER_COMPUTE_TYPE", "int8"))
    whisper_language: str = field(default_factory=lambda: _env("WHISPER_LANGUAGE", "ar"))

    # TTS
    tts_base_url: str = field(default_factory=lambda: _env("TTS_BASE_URL", "http://127.0.0.1:7860/"))
    tts_engine: str = field(default_factory=lambda: _env("TTS_ENGINE", "Chatterbox Multilingual"))
    tts_language: str = field(default_factory=lambda: _env("TTS_LANGUAGE", "ar"))
    tts_format: str = field(default_factory=lambda: _env("TTS_FORMAT", "wav"))
    tts_temperature: float = field(default_factory=lambda: _env_float("TTS_TEMPERATURE", 0.7))
    tts_exaggeration: float = field(default_factory=lambda: _env_float("TTS_EXAGGERATION", 0.55))
    tts_cfg_weight: float = field(default_factory=lambda: _env_float("TTS_CFG_WEIGHT", 0.5))
    tts_repetition_penalty: float = field(default_factory=lambda: _env_float("TTS_REPETITION_PENALTY", 2.0))
    tts_min_p: float = field(default_factory=lambda: _env_float("TTS_MIN_P", 0.05))
    tts_top_p: float = field(default_factory=lambda: _env_float("TTS_TOP_P", 1.0))
    tts_chunk_size: int = field(default_factory=lambda: _env_int("TTS_CHUNK_SIZE", 120))
    tts_seed: int = field(default_factory=lambda: _env_int("TTS_SEED", 0))
    tts_default_ref_audio: str = field(default_factory=lambda: _env("TTS_DEFAULT_REF_AUDIO", "voice_sample.wav"))

    # Paths
    data_dir: str = field(default_factory=lambda: _env("MAFIA_DATA_DIR", "./data"))
    cache_dir: str = field(default_factory=lambda: _env("MAFIA_CACHE_DIR", "./data/tts_cache"))
    clones_dir: str = field(default_factory=lambda: _env("MAFIA_CLONES_DIR", "./data/clones"))

    # ----- Path resolution helpers -----
    def _resolve(self, p: str) -> Path:
        path = Path(p)
        return path if path.is_absolute() else (_BACKEND_DIR / path).resolve()

    @property
    def data_path(self) -> Path:
        return self._resolve(self.data_dir)

    @property
    def cache_path(self) -> Path:
        return self._resolve(self.cache_dir)

    @property
    def clones_path(self) -> Path:
        return self._resolve(self.clones_dir)

    @property
    def tts_default_ref_audio_path(self) -> Optional[Path]:
        if not self.tts_default_ref_audio:
            return None
        # Try as absolute or relative-to-backend first; then relative-to-data.
        primary = self._resolve(self.tts_default_ref_audio)
        if primary.exists():
            return primary
        secondary = self.data_path / self.tts_default_ref_audio
        return secondary if secondary.exists() else primary

    def ensure_directories(self) -> None:
        """Create all data/cache directories. Safe to call multiple times."""
        for p in (self.data_path, self.cache_path, self.clones_path):
            p.mkdir(parents=True, exist_ok=True)


settings = Settings()
