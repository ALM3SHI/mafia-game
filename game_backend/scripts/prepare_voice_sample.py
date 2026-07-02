"""
One-shot converter: voice_sample.m4a → voice_sample.wav (24 kHz, mono, PCM16).

Why a script (not just `ffmpeg ...`):
    - Self-contained: bootstraps a portable ffmpeg via `imageio-ffmpeg` if the
      system doesn't have one. No "install ffmpeg first" hurdle.
    - Idempotent: skips work if the target WAV is already present and newer.
    - Cloud-friendly: same script runs on the dev box and on the remote GPU
      server. No platform-specific assumptions.

Run from anywhere:
    python scripts/prepare_voice_sample.py
    python scripts/prepare_voice_sample.py --force
    python scripts/prepare_voice_sample.py --input some.m4a --output other.wav
"""
from __future__ import annotations

import argparse
import io
import shutil
import subprocess
import sys
from pathlib import Path

# Windows cp1252 console can't print non-ASCII; force UTF-8 so prints don't crash.
if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = BACKEND_DIR / "voice_sample.m4a"
DEFAULT_OUTPUT = BACKEND_DIR / "voice_sample.wav"

TARGET_SAMPLE_RATE = 24_000
TARGET_CHANNELS = 1
TARGET_CODEC = "pcm_s16le"


def find_ffmpeg() -> str:
    """Return path to an ffmpeg binary, installing one via pip if needed."""
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    print(">>> No system ffmpeg found. Trying portable ffmpeg via imageio-ffmpeg...")
    try:
        import imageio_ffmpeg  # type: ignore
    except ImportError:
        print(">>> Installing imageio-ffmpeg (one-time, ~30 MB)...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "imageio-ffmpeg"],
            check=True,
        )
        import imageio_ffmpeg  # type: ignore

    return imageio_ffmpeg.get_ffmpeg_exe()


def convert(input_path: Path, output_path: Path, force: bool) -> None:
    if not input_path.is_file():
        sys.exit(f"!!! Input not found: {input_path}")

    if output_path.exists() and not force:
        if output_path.stat().st_mtime >= input_path.stat().st_mtime:
            print(f">>> Up-to-date: {output_path} (use --force to regenerate)")
            return

    ffmpeg = find_ffmpeg()
    cmd = [
        ffmpeg,
        "-y",                          # overwrite output
        "-loglevel", "error",
        "-i", str(input_path),
        "-ar", str(TARGET_SAMPLE_RATE),
        "-ac", str(TARGET_CHANNELS),
        "-c:a", TARGET_CODEC,
        str(output_path),
    ]
    print(f">>> Converting: {input_path.name}  →  {output_path.name}  "
          f"({TARGET_SAMPLE_RATE} Hz, {TARGET_CHANNELS} ch, PCM16)")
    subprocess.run(cmd, check=True)
    size_kb = output_path.stat().st_size / 1024
    print(f">>> Done. {output_path}  ({size_kb:.1f} KB)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", "-i", type=Path, default=DEFAULT_INPUT,
                        help=f"Source audio (default: {DEFAULT_INPUT.name})")
    parser.add_argument("--output", "-o", type=Path, default=DEFAULT_OUTPUT,
                        help=f"Target WAV (default: {DEFAULT_OUTPUT.name})")
    parser.add_argument("--force", "-f", action="store_true",
                        help="Reconvert even if output is up-to-date.")
    args = parser.parse_args()
    convert(args.input.resolve(), args.output.resolve(), args.force)


if __name__ == "__main__":
    main()
