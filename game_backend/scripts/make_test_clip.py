"""
Cut a short clip from voice_sample.wav for realistic latency testing.

Why: the full voice_sample.wav is ~30 seconds, but in actual gameplay a
player utterance is 3-5 seconds. STT time scales with input length, so the
30s clip overstates real latency by ~6x.

Default: produces voice_sample_5s.wav (first 5 seconds of voice_sample.wav).

    python scripts/make_test_clip.py
    python scripts/make_test_clip.py --duration 3
    python scripts/make_test_clip.py --start 5 --duration 4
"""
from __future__ import annotations

import argparse
import io
import shutil
import subprocess
import sys
from pathlib import Path

if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = BACKEND_DIR / "voice_sample.wav"


def find_ffmpeg() -> str:
    sys_ffmpeg = shutil.which("ffmpeg")
    if sys_ffmpeg:
        return sys_ffmpeg
    try:
        import imageio_ffmpeg  # type: ignore
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "imageio-ffmpeg"], check=True)
        import imageio_ffmpeg  # type: ignore
    return imageio_ffmpeg.get_ffmpeg_exe()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", "-i", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", "-o", type=Path, default=None,
                        help="Default: voice_sample_<duration>s.wav next to input.")
    parser.add_argument("--start", "-s", type=float, default=0.0, help="Start offset in seconds.")
    parser.add_argument("--duration", "-d", type=float, default=5.0, help="Clip length in seconds.")
    args = parser.parse_args()

    if not args.input.is_file():
        sys.exit(f"!!! Input not found: {args.input}")

    output = args.output or args.input.with_name(f"{args.input.stem}_{int(args.duration)}s.wav")
    ffmpeg = find_ffmpeg()
    cmd = [
        ffmpeg, "-y", "-loglevel", "error",
        "-ss", str(args.start),
        "-t", str(args.duration),
        "-i", str(args.input),
        "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le",
        str(output),
    ]
    print(f">>> Cutting {args.duration}s from {args.input.name} (offset {args.start}s)  ->  {output.name}")
    subprocess.run(cmd, check=True)
    print(f">>> Done. {output} ({output.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
