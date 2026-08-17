#!/usr/bin/env python3
"""Extrait les Considérants des fiches HTML ru-public vers considerants.json.

Usage :
  python3 scripts/extract-considerants.py /chemin/vers/ru-public/arrets \\
      > assets/considerants.json
"""
from __future__ import annotations

import html as htmllib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def decode_html(text: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = htmllib.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract(arrets_dir: Path) -> dict[str, str]:
    by_slug: dict[str, str] = {}
    for page in sorted(arrets_dir.glob("*/index.html")):
        slug = page.parent.name
        raw = page.read_text(encoding="utf-8", errors="replace")
        match = re.search(
            r"<blockquote>\s*<p>([\s\S]*?)</p>\s*</blockquote>",
            raw,
            re.I,
        )
        if not match:
            continue
        text = decode_html(match.group(1))
        if text:
            by_slug[slug] = text
    return by_slug


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    arrets_dir = Path(sys.argv[1])
    by_slug = extract(arrets_dir)
    payload = {
        "kind": "considerants",
        "count": len(by_slug),
        "source": "ru-public/arrets/*/index.html blockquote",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "bySlug": by_slug,
    }
    json.dump(payload, sys.stdout, ensure_ascii=False, separators=(",", ":"))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
