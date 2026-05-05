import argparse
import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path


def run_manifest_export(root: Path) -> None:
    script = root / "scripts" / "export_quiz_audio_manifest.py"
    subprocess.run(["py", str(script)], check=True)


def call_tts(tts_url: str, text: str, voice: str, timeout_sec: int) -> bytes:
    payload = json.dumps({"text": text, "voice": voice}).encode("utf-8")
    req = urllib.request.Request(
        tts_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        return resp.read()


def sync_once(root: Path, tts_url: str, voice: str, timeout_sec: int) -> None:
    run_manifest_export(root)
    manifest_path = root / "assets" / "quiz-audio" / "manifest.json"
    items = json.loads(manifest_path.read_text(encoding="utf-8"))
    total = len(items)
    created = 0
    skipped = 0
    failed = 0

    for idx, item in enumerate(items, start=1):
        rel = item.get("path") or ""
        question = item.get("question") or ""
        if not rel or not question:
            failed += 1
            continue
        out_path = root / rel
        # Keep one offline pack per voice preset:
        # assets/quiz-audio/<voice>/<filename>.mp3
        if out_path.suffix.lower() == ".mp3":
            out_path = out_path.parent / voice / out_path.name
        out_path.parent.mkdir(parents=True, exist_ok=True)
        if out_path.exists():
            skipped += 1
            continue
        text = f"Domanda. {question}"
        try:
            audio = call_tts(tts_url, text, voice, timeout_sec=timeout_sec)
            out_path.write_bytes(audio)
            created += 1
            print(f"[{idx}/{total}] created {out_path.name}")
        except urllib.error.HTTPError as exc:
            failed += 1
            body = ""
            try:
                body = exc.read().decode("utf-8", errors="ignore")[:180]
            except Exception:
                body = ""
            print(f"[{idx}/{total}] failed {out_path.name}: http_{exc.code} {body}")
        except Exception as exc:
            failed += 1
            print(f"[{idx}/{total}] failed {out_path.name}: {exc}")

    print(f"sync done | total={total} created={created} skipped={skipped} failed={failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate missing offline quiz audio from Piper TTS.")
    parser.add_argument(
        "--tts-url",
        default="https://quiz-piper-tts.onrender.com/tts",
        help="Piper TTS endpoint",
    )
    parser.add_argument(
        "--voice",
        default="naturale",
        choices=["naturale", "telecronaca", "chiara", "profonda"],
        help="Voice preset",
    )
    parser.add_argument("--timeout", type=int, default=90, help="HTTP timeout seconds per audio")
    parser.add_argument("--watch", action="store_true", help="Watch index and auto-sync on changes")
    parser.add_argument("--interval", type=int, default=10, help="Watch polling interval seconds")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]

    if not args.watch:
        sync_once(root, args.tts_url, args.voice, args.timeout)
        return

    index_path = root / "index.html"
    last_mtime = index_path.stat().st_mtime
    print("watch mode active: auto-sync on index.html changes")
    sync_once(root, args.tts_url, args.voice, args.timeout)
    while True:
        time.sleep(max(2, args.interval))
        cur = index_path.stat().st_mtime
        if cur != last_mtime:
            last_mtime = cur
            print("index.html changed -> syncing audio...")
            sync_once(root, args.tts_url, args.voice, args.timeout)


if __name__ == "__main__":
    main()
