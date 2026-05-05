import json
import re
from pathlib import Path


def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[\"'`]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "quiz-item"


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "index.html"
    out = root / "assets" / "quiz-audio" / "manifest.json"
    html = src.read_text(encoding="utf-8", errors="ignore")

    # Parse question rows in current object style: { ..., ref: '...', q: '...' ... }
    rx = re.compile(r"ref:\s*'((?:\\'|[^'])*)'\s*,\s*q:\s*'((?:\\'|[^'])*)'", re.MULTILINE)
    rows = []
    for ref, q in rx.findall(html):
        ref = ref.replace("\\'", "'").replace('\\"', '"')
        q = q.replace("\\'", "'").replace('\\"', '"')
        ref_slug = slugify(ref)
        q_slug = slugify(q)[:36]
        filename = f"{ref_slug}--{q_slug}.mp3"
        rows.append(
            {
                "ref": ref,
                "question": q,
                "file": filename,
                "path": f"assets/quiz-audio/{filename}",
            }
        )

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"written: {out}")
    print(f"items: {len(rows)}")


if __name__ == "__main__":
    main()
