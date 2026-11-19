#!/usr/bin/env python3
"""Copy the built v3 site (redesign/v3/) to the repository root, where GitHub Pages serves it.

redesign/v3/ stays the place to edit and build. Run this after the builders:
  python3 -I redesign/_tools/build_site.py
  python3 -I redesign/_tools/build_v3_pages.py
  python3 -I redesign/_tools/publish_v3.py

The script also deletes files at the root that an earlier publish copied but v3 no longer has.
It deletes only files that git tracks, so ignored and untracked files (such as .redesign/ drafts) are
never touched. legacy/, redesign/, design/, .github/ and the repo files also stay.
The previous production site is kept, unpublished, in legacy/ (see _config.yml). No build reads
from legacy/, so it can be deleted at any time.
"""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "redesign" / "v3"
# Root entries that are not part of the published v3 site.
NOT_SITE = {".git", ".github", ".gitignore", "LICENSE", "_config.yml", "legacy", "redesign", "design", ".DS_Store",
            "README.md", "CNAME", ".nojekyll", "robots.txt"}
SKIP = {".DS_Store"}


def site_files(base):
    return {p.relative_to(base) for p in base.rglob("*")
            if p.is_file() and p.name not in SKIP and p.relative_to(base).parts[0] not in NOT_SITE}


def tracked_site_files():
    """Root files that git tracks and that belong to the site. Ignored and untracked files never appear here."""
    out = subprocess.run(["git", "-C", str(ROOT), "ls-files", "-z"],
                         capture_output=True, check=True).stdout.decode()
    return {Path(p) for p in out.split("\0")
            if p and Path(p).parts[0] not in NOT_SITE and Path(p).name not in SKIP}


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
    stale = sorted(tracked_site_files() - wanted)
    for rel in stale:
        (ROOT / rel).unlink(missing_ok=True)
    for d in sorted({(ROOT / r).parent for r in stale}, reverse=True):
        if d != ROOT and d.exists() and not any(d.iterdir()):
            d.rmdir()
    print(f"{len(wanted)} files in v3; {copied} copied, {len(stale)} stale removed")
    for rel in stale:
        print(f"  removed {rel}")


if __name__ == "__main__":
    main()
