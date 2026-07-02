"""
Disk-backed TTS cache.

Why: many bot replies repeat (yes/no, accusations, vote demands). Caching the
generated WAV by SHA-256 of the input text + voice context turns a 1-2 second
neural inference into a ~5 ms file read. Survives restarts. Cloud-portable
(directory can be mounted as a volume).

Key shape: sha256(f"{voice_id}|{text}").hexdigest()  →  {key}.wav
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Optional


class TTSCache:
    def __init__(self, cache_dir: Path) -> None:
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.hits = 0
        self.misses = 0

    @staticmethod
    def _key(voice_id: str, text: str) -> str:
        h = hashlib.sha256()
        h.update(voice_id.encode("utf-8"))
        h.update(b"|")
        h.update(text.encode("utf-8"))
        return h.hexdigest()

    def _path(self, voice_id: str, text: str) -> Path:
        return self.cache_dir / f"{self._key(voice_id, text)}.wav"

    def get(self, voice_id: str, text: str) -> Optional[bytes]:
        p = self._path(voice_id, text)
        if p.is_file():
            self.hits += 1
            try:
                return p.read_bytes()
            except OSError:
                return None
        self.misses += 1
        return None

    def put(self, voice_id: str, text: str, audio_bytes: bytes) -> None:
        if not audio_bytes:
            return
        p = self._path(voice_id, text)
        # Atomic write: tmp then rename so concurrent reads can't see a half file.
        tmp = p.with_suffix(".wav.tmp")
        try:
            tmp.write_bytes(audio_bytes)
            tmp.replace(p)
        except OSError:
            try:
                tmp.unlink(missing_ok=True)
            except OSError:
                pass

    def stats(self) -> dict:
        total = self.hits + self.misses
        rate = (self.hits / total) if total else 0.0
        return {"hits": self.hits, "misses": self.misses, "hit_rate": round(rate, 3)}
