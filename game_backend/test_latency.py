"""
Latency benchmark for the Mafia AI backend.

Reuses an existing audio file (voice_sample.wav) as fake user input and
measures the full pipeline: STT → Ollama (streaming) → TTS.

Reports per-chunk timings (time-to-first-audio is what UX cares about) and
totals as p50/p95 across N runs. Time-to-first-audio is critical because
once the first sentence starts playing, subsequent ones can stream
underneath it — the user perceives <3s if TTFA <3s, even if the full reply
takes longer.

Usage:
    python test_latency.py                          # 10 runs, default URL
    python test_latency.py --runs 50
    python test_latency.py --url ws://10.0.0.5:8000/ws/audio
    python test_latency.py --audio path/to/clip.wav
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import json
import statistics
import sys
import time
from pathlib import Path

try:
    import websockets
except ImportError:
    sys.exit("!!! Install websockets first:  pip install websockets")


DEFAULT_URL = "ws://127.0.0.1:8000/ws/audio"
DEFAULT_AUDIO = Path(__file__).parent / "voice_sample.wav"

GAME_CONTEXT = {
    "phase": "نهار",
    "day": 2,
    "alivePlayers": [
        {"name": "عمر", "role": "مواطن", "isBot": False},
        {"name": "خالد", "role": "مافيا", "isBot": True},
        {"name": "سارة", "role": "طبيب", "isBot": True},
        {"name": "أحمد", "role": "مواطن", "isBot": True},
    ],
}


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


async def one_run(url: str, audio_b64: str, run_idx: int, api_key: str) -> dict:
    headers = [("authorization", f"Bearer {api_key}")] if api_key else None
    t_send = None
    t_first_chunk = None
    t_done = None
    chunks = 0
    timings_from_server = None
    full_text = ""
    tts_per_chunk: list[dict] = []

    async with websockets.connect(url, additional_headers=headers, max_size=20_000_000) as ws:
        request = {
            "event": "audio_complete",
            "audio_data": audio_b64,
            "speaker_id": f"bench_run_{run_idx}",  # unique → bypass TTS cache per run
            "game_context": GAME_CONTEXT,
        }
        t_send = time.perf_counter()
        await ws.send(json.dumps(request))

        while True:
            msg = await ws.recv()
            now = time.perf_counter()
            data = json.loads(msg)
            status = data.get("status")
            if status == "chunk":
                chunks += 1
                if t_first_chunk is None and data.get("audio_data"):
                    t_first_chunk = now
                if data.get("tts_timings"):
                    tts_per_chunk.append(data["tts_timings"])
            elif status == "done":
                t_done = now
                timings_from_server = data.get("timings")
                full_text = data.get("full_text", "")
                break
            elif status == "error":
                raise RuntimeError(f"server error: {data.get('message')}")

    return {
        "ttfa_s": (t_first_chunk - t_send) if t_first_chunk else None,
        "total_s": (t_done - t_send) if t_done else None,
        "chunks": chunks,
        "server": timings_from_server,
        "text": full_text,
        "tts_per_chunk": tts_per_chunk,
    }


async def main_async(args) -> None:
    audio_bytes = args.audio.read_bytes()
    audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
    print(f">>> Audio: {args.audio.name} ({len(audio_bytes) / 1024:.1f} KB)")
    print(f">>> URL:   {args.url}")
    print(f">>> Runs:  {args.runs}\n")

    ttfa_samples: list[float] = []
    total_samples: list[float] = []
    failures = 0

    for i in range(args.runs):
        try:
            r = await one_run(args.url, audio_b64, i, args.api_key)
        except Exception as e:
            failures += 1
            print(f"[{i + 1:3d}/{args.runs}] FAIL: {e}")
            continue

        if r["ttfa_s"] is not None:
            ttfa_samples.append(r["ttfa_s"])
        if r["total_s"] is not None:
            total_samples.append(r["total_s"])

        srv = r["server"] or {}
        tts_gens = [t.get("gen_s", 0) for t in r["tts_per_chunk"]]
        tts_summary = (
            f"tts=[{', '.join(f'{g:.2f}s' for g in tts_gens)}]" if tts_gens else "tts=[]"
        )
        print(
            f"[{i + 1:3d}/{args.runs}] "
            f"TTFA={r['ttfa_s']:.2f}s  total={r['total_s']:.2f}s  "
            f"chunks={r['chunks']}  "
            f"stt={srv.get('stt_s', '?')}  llm={srv.get('llm_s', '?')}  "
            f"{tts_summary}  "
            f"text=\"{r['text'][:50]}\""
        )

    print("\n" + "=" * 60)
    print(f"Runs: {args.runs}  |  Successful: {args.runs - failures}  |  Failed: {failures}")
    if ttfa_samples:
        print("Time-to-first-audio (TTFA) — what the user perceives:")
        print(f"  p50 = {percentile(ttfa_samples, 0.50):.2f}s   "
              f"p95 = {percentile(ttfa_samples, 0.95):.2f}s   "
              f"min = {min(ttfa_samples):.2f}s   "
              f"max = {max(ttfa_samples):.2f}s   "
              f"mean = {statistics.mean(ttfa_samples):.2f}s")
    if total_samples:
        print("End-to-end (until last sentence audio sent):")
        print(f"  p50 = {percentile(total_samples, 0.50):.2f}s   "
              f"p95 = {percentile(total_samples, 0.95):.2f}s   "
              f"min = {min(total_samples):.2f}s   "
              f"max = {max(total_samples):.2f}s   "
              f"mean = {statistics.mean(total_samples):.2f}s")
    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--runs", "-n", type=int, default=10)
    parser.add_argument("--audio", type=Path, default=DEFAULT_AUDIO)
    parser.add_argument("--api-key", default="", help="Bearer token if MAFIA_API_KEY is set on server")
    args = parser.parse_args()

    if not args.audio.is_file():
        sys.exit(f"!!! Audio file not found: {args.audio}")

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
