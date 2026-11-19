#!/usr/bin/env python3
"""Draw one link-preview card (1200 x 630 PNG) for every v3 page, into v3/img/og/.

Needs a Chromium "headless shell" (the one Playwright downloads is used when present).
Run after build_v3_pages.py; the pages already point at these file names.
"""
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

TOOLS = Path(__file__).resolve().parent
OUT = TOOLS.parent / "v3"
KICKER = {"index": "Portfolio", "portfolio": "Work", "publications": "Research", "agents": "How I work", "404": "Not found"}


def browser():
    found = sorted(Path.home().glob(".cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell"))
    if not found:
        sys.exit("No headless Chromium found. Install one with: npx playwright install chromium-headless-shell")
    return str(found[-1])


def main():
    exe = browser()
    pages = [p for p in OUT.glob("*.html") if p.name != "technical_reports.html"] + list((OUT / "blog").glob("*.html"))
    for page in sorted(pages):
        html = page.read_text()
        title = re.search(r"<title>(.*?)</title>", html, re.S).group(1).split(" · Abdullah Sarwar")[0].strip()
        in_blog = page.parent.name == "blog"
        slug = ("writing" if page.stem == "index" else page.stem) if in_blog else ("home" if page.stem == "index" else page.stem)
        if page.name == "index.html" and not in_blog:
            title = "Senior Software Engineer. Public API lead at ShareTrip."
        kicker = ("Writing" if page.stem == "index" else "Essay") if in_blog else KICKER.get(page.stem, "")
        url = f"file://{TOOLS / 'og-card.html'}?kicker={quote(kicker)}&title={quote(title)}"
        target = OUT / "img" / "og" / f"{slug}.png"
        subprocess.run([exe, "--no-sandbox", "--hide-scrollbars", "--virtual-time-budget=4000", "--window-size=1200,630",
                        f"--screenshot={target}", url], check=True, capture_output=True)
        print(target.relative_to(OUT), "·", title)


if __name__ == "__main__":
    main()
