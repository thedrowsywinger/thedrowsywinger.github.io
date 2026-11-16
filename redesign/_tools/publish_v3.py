#!/usr/bin/env python3
"""Copy the built v3 site (redesign/v3/) to the repository root, where GitHub Pages serves it.

redesign/v3/ stays the place to edit and build. Run this after the builders:
  python3 -I redesign/_tools/build_site.py
  python3 -I redesign/_tools/build_v3_pages.py
  python3 -I redesign/_tools/publish_v3.py

The script also deletes files at the root that an earlier publish copied but v3 no longer has.
It touches only the paths v3 owns, so legacy/, redesign/, design/ and the repo files stay.
The previous production site is kept, unpublished, in legacy/ (see _config.yml).
"""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "redesign" / "v3"
# Root entries that are not part of the published v3 site.
NOT_SITE = {".git", ".gitignore", "LICENSE", "_config.yml", "legacy", "redesign", "design", ".DS_Store", "README.md", "CNAME", ".nojekyll"}
SKIP = {".DS_Store"}


def site_files(base):
    return {p.relative_to(base) for p in base.rglob("*")
            if p.is_file() and p.name not in SKIP and p.relative_to(base).parts[0] not in NOT_SITE}


def main():
    assert (SRC / "index.html").exists(), f"{SRC} has no index.html; build v3 first"
    wanted = site_files(SRC)
    copied = 0
    for rel in sorted(wanted):
        src, dst = SRC / rel, ROOT / rel
        if dst.exists() and dst.read_bytes() == src.read_bytes():
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        copied += 1
    stale = sorted(site_files(ROOT) - wanted)
    for rel in stale:
        (ROOT / rel).unlink()
    for d in sorted({(ROOT / r).parent for r in stale}, reverse=True):
        if d != ROOT and d.exists() and not any(d.iterdir()):
            d.rmdir()
    print(f"{len(wanted)} files in v3; {copied} copied, {len(stale)} stale removed")
    for rel in stale:
        print(f"  removed {rel}")


if __name__ == "__main__":
    main()
