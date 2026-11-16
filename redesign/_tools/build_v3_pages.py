#!/usr/bin/env python3
"""Make redesign/v3/ a complete, self-contained site.

Copies the shared assets (styles.css, main.js, img/) into v3/ on the first run, rebuilds the
v3 inner pages (blog, Work, Research, 404) from the pages in redesign/, and builds the pages
that exist only in v3 from the bodies in _tools/v3-pages/.

Inner pages have no Workday | Matchday switch: the switch lives on the homepage only, and the
inner pages always show the plain professional view. Rerun after build_site.py.

Every page gets the same footer, link-preview tags and a "next page" link, so the site reads
as one loop: Work -> Writing -> Research -> AI agents -> Home.
"""
import html as htmllib
import json
import re
import shutil
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
OUT = SRC / "v3"
SITE = "https://thedrowsywinger.github.io/"

CALM = ("if (localStorage.getItem('calm') === '1' || (localStorage.getItem('calm') === null && "
        "matchMedia('(prefers-reduced-motion: reduce)').matches)) document.documentElement.classList.add('calm');")

HEAD_SCRIPT = ("document.documentElement.classList.add('js'); "
               "try { if ((new URLSearchParams(location.search).get('theme') || localStorage.getItem('theme')) === 'light') "
               "document.documentElement.dataset.theme = 'light'; " + CALM + " } catch (e) {}")

# page path (relative to v3/) -> (label, target path relative to v3/)
NEXT = {
    "portfolio.html": ("Writing", "blog/index.html"),
    "blog/index.html": ("Research", "publications.html"),
    "publications.html": ("How I work with AI agents", "agents.html"),
    "agents.html": ("Home", "index.html"),
}
# essays that are also a case on the homepage
CASE_BACK = {"making-booking-retries-safe.html", "optimizing-hotel-search-performance.html"}


def footer(base):
    """The one footer every v3 page uses. base is '' or '../'."""
    return f'''<footer class="foot foot--site">
      <p class="foot__nav"><a class="link" href="{base}index.html">Home</a> · <a class="link" href="{base}portfolio.html">Work</a> · <a class="link" href="{base}blog/index.html">Writing</a> · <a class="link" href="{base}publications.html">Research</a> · <a class="link" href="{base}agents.html">AI agents</a></p>
      <p><a class="link" href="mailto:abdullah.md.sarwar@gmail.com">Email</a> · <a class="link" href="https://github.com/thedrowsywinger" target="_blank" rel="noopener">GitHub</a> · <a class="link" href="https://www.linkedin.com/in/abdullah-md-sarwar/" target="_blank" rel="noopener">LinkedIn</a> · <a class="link" href="https://drive.google.com/file/d/1YnQN7jGuS_z25cZA5cOdOv-a0zBbXJ-p/view?usp=sharing" target="_blank" rel="noopener">Résumé</a></p>
      <p class="foot__end"><a class="link" href="{base}index.html?mode=match">The Matchday side <span class="arrow" aria-hidden="true">→</span></a><span class="foot__mark"><img src="{base}img/logo.svg" alt="" width="22" height="22">© 2026 Abdullah Md. Sarwar</span></p>
    </footer>'''


def card_name(path):
    """File name of the page's preview card in img/og/ (drawn by build_og_cards.py)."""
    stem = Path(path).stem
    if path.startswith("blog/"):
        return "writing" if stem == "index" else stem
    return "home" if stem == "index" else stem


def preview_tags(html, path):
    """Link-preview tags. Every page points at its own drawn card."""
    card = f'{SITE}img/og/{card_name(path)}.png'
    if 'property="og:title"' in html:      # articles carry their own tags; only the image changes
        html = re.sub(r'<meta property="og:image" content=".*?">', lambda m: f'<meta property="og:image" content="{card}">', html, count=1)
        return html if 'twitter:card' in html else html.replace("<title>", '<meta name="twitter:card" content="summary_large_image">\n  <title>', 1)
    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1).strip()
    desc = re.search(r'<meta name="description" content="(.*?)">', html)
    canonical = re.search(r'<link rel="canonical" href="(.*?)">', html)
    tags = [f'<meta property="og:title" content="{title}">', '<meta property="og:type" content="website">',
            f'<meta property="og:image" content="{card}">', '<meta name="twitter:card" content="summary_large_image">']
    if desc:
        tags.insert(1, f'<meta property="og:description" content="{desc.group(1)}">')
    if canonical:
        tags.append(f'<meta property="og:url" content="{canonical.group(1)}">')
    return html.replace("<title>", "\n  ".join(tags) + "\n  <title>", 1)


def finish(html, base, path):
    """Steps shared by every v3 inner page."""
    nxt = NEXT.get(path)
    if not nxt and path.startswith("blog/"):       # an essay peeks at the next essay
        ticket = re.search(r'<a class="tk" href="([^"]+)" aria-label="Read: ([^"]+)"', html)
        nxt = (ticket.group(2), "blog/" + ticket.group(1)) if ticket else None
    tail = "\n    " + peek(base, nxt[0], nxt[1]) if nxt else ""
    html, n = re.subn(r'<footer class="foot(?: foot--site)?">.*?</footer>(\s*<a class="peek".*?</a>)?', lambda m: footer(base) + tail, html, count=1, flags=re.S)
    assert n == 1, f"{path}: footer not found"
    if path in NEXT:
        label, target = NEXT[path]
        nxt = (f'      <nav class="next-page" aria-label="Next page">\n'
               f'        <a href="{base}{target}"><small>Next</small><span>{label} <span class="arrow" aria-hidden="true">→</span></span></a>\n'
               f'      </nav>\n')
        html, n = re.subn(r"(    </main>)", lambda m: nxt + m.group(1), html, count=1)
        assert n == 1, f"{path}: main not found"
    return preview_tags(html, path)


def convert(html, base):
    """base is '' for pages in v3/ and '../' for pages in v3/blog/."""
    # Theme only; the mode is a homepage matter.
    html, n = re.subn(r"<script>\s*try \{ var m = new URLSearchParams.*?</script>",
                      lambda m: "<script>\n    " + HEAD_SCRIPT + "\n  </script>", html, count=1, flags=re.S)
    assert n == 1, "head script not found"
    # One level deeper than redesign/, so repo-root images move up one step.
    html = html.replace(f'{base}../img/', f'{base}../../img/')
    html, n = re.subn(r'\s*<button class="switch" id="mode-switch".*?</button>', "", html, count=1, flags=re.S)
    assert n == 1, "mode switch not found"
    html = re.sub(r'\s*<img class="portrait__img portrait__img--match"[^>]*>', "", html)
    html = html.replace(f'<link rel="stylesheet" href="{base}styles.css">',
                        f'<link rel="stylesheet" href="{base}styles.css">\n  <link rel="stylesheet" href="{base}v3.css">')
    html = html.replace(f'<script src="{base}main.js"></script>',
                        f'<script src="{base}main.js"></script>\n  <script src="{base}v3.js"></script>')
    assert "v3.css" in html and "v3.js" in html
    # The tab icon is the site mark: a 7 on a ticket stub.
    html = re.sub(r'<link rel="icon"[^>]*>', lambda m: f'<link rel="icon" type="image/svg+xml" href="{base}img/logo.svg">', html, count=1)
    # Inner pages speak plainly: no travel words for headings.
    html = html.replace('data-work="Departures" data-match="Fixtures">Departures<', 'data-work="Writing" data-match="Writing">Writing<')
    html = html.replace('data-work="Next departure" data-match="Next fixture">Next departure<', 'data-work="Next essay" data-match="Next essay">Next essay<')
    # Sections arrive as they are reached (styles and observer live in v3.css / v3.js).
    html = html.replace('<section class="row', '<section class="row reveal')
    return html


def work_page(html):
    """The Work page holds the detail the homepage leaves out, so it drops what the homepage already shows."""
    html, n = re.subn(r'\s*<section class="row reveal" aria-labelledby="kit-h">.*?</section>', "", html, count=1, flags=re.S)
    assert n == 1, "Work page: toolkit row not found"
    pointer = '''
      <section class="row reveal" aria-labelledby="more-h">
        <h2 class="label" id="more-h">Elsewhere</h2>
        <div class="content">
          <p class="more more--pair"><a class="link" href="index.html?mode=work#work">Three cases, on the home page <span class="arrow" aria-hidden="true">→</span></a><a class="link" href="index.html?mode=work#toolkit">Toolkit <span class="arrow" aria-hidden="true">→</span></a><a class="link" href="agents.html">How I work with AI agents <span class="arrow" aria-hidden="true">→</span></a></p>
        </div>
      </section>
'''
    html, n = re.subn(r"(\n    </main>)", lambda m: pointer.rstrip("\n") + m.group(1), html, count=1)
    assert n == 1
    return html


STOP_YEARS = {"Alter F4": "2020", "Early Advantage Bangladesh": "2020 – 21", "mPower Social Enterprise": "2021 – 22"}
SHORT = {"Early Advantage Bangladesh": "Early Advantage", "mPower Social Enterprise": "mPower"}


def career_timeline(html):
    """Replace the 'Earlier' list with a timeline: four stops, oldest first, each opening its own panel."""
    section = re.search(r'\s*<section class="row reveal" aria-labelledby="earlier-h">.*?</section>', html, re.S)
    assert section, "Work page: 'Earlier' row not found"
    roles = re.findall(r'<p class="entry__title">(.*?) <span class="muted">· (.*?)</span></p>\s*<p class="entry__meta">(.*?)</p>\s*<p class="entry__text">(.*?)</p>', section.group(0), re.S)
    assert len(roles) == 3, len(roles)
    roles = roles[::-1] + [("ShareTrip", "Senior Software Engineer · Public API lead", "Nov 2022 – now",
                            "I lead the Public API team. We build and maintain the public gateways, flights, hotels, visa, holidays, e-commerce, mobile recharge, bill payments, B2B and B2E.")]
    stops, panels = [], []
    for i, (org, role, dates, text) in enumerate(roles):
        now = org == "ShareTrip"
        stops.append(f'<button class="timeline__stop{" is-now" if now else ""}" type="button" role="tab" id="tl-t{i}" aria-controls="tl-p{i}" aria-selected="{str(now).lower()}">'
                     f'<b>{SHORT.get(org, org)}</b><span>{STOP_YEARS.get(org, "2022 – now")}</span></button>')
        panels.append(f'<div class="timeline__panel entry" role="tabpanel" id="tl-p{i}" aria-labelledby="tl-t{i}">\n'
                      f'              <p class="entry__title">{org} <span class="muted">· {role}</span></p>\n'
                      f'              <p class="entry__meta">{dates}</p>\n              <p class="entry__text">{text}</p>\n            </div>')
    block = f'''
      <section class="row reveal" aria-labelledby="career-h">
        <h2 class="label" id="career-h">Career</h2>
        <div class="content">
          <div class="timeline scene-observe" data-timeline>
            <div class="timeline__track" role="tablist" aria-label="Career, oldest first">
              {(chr(10) + "              ").join(stops)}
            </div>
            {(chr(10) + "            ").join(panels)}
          </div>
        </div>
      </section>'''
    return html.replace(section.group(0), block)


COVERS = {
    "making-booking-retries-safe.html": ("Essay · No. 005 · 21 Oct 2026", "Making Booking Retries Safe", "Idempotency with MySQL named locks",
        '<div class="idem"><span class="idem__dot" style="top:6px;--dy:18px"></span><span class="idem__dot" style="top:25px;--dy:0px;animation-delay:.15s"></span><span class="idem__dot" style="top:44px;--dy:-18px;animation-delay:.3s"></span><span class="idem__lbl">retry ×3</span><span class="idem__card">1 booking ✓</span></div>'),
    "optimizing-hotel-search-performance.html": ("Essay · No. 004 · 26 Nov 2025", "Speeding Up Hotel Search with Concurrent Chunks", "Bounded concurrency",
        '<div class="trace"><div>chunk 1<i style="width:18%"></i></div><div>chunk 2<i style="width:28%;margin-left:8%;animation-delay:.15s"></i></div><div>chunk 3<i style="width:44%;margin-left:16%;animation-delay:.3s"></i></div><div>chunk 4<i style="width:62%;margin-left:24%;animation-delay:.45s"></i></div></div>'),
}


def writing_index(html):
    """The two main essays get a cover: the same small diagram as their case on the homepage."""
    cards = "".join(f'''
            <a class="essay-card" href="{href}">
              <div class="card__stage essay-card__cover scene-observe" aria-hidden="true" style="view-transition-name: {COVER_NAMES[href]}">{art}</div>
              <span class="essay-card__meta">{meta}</span>
              <span class="essay-card__title">{title}</span>
              <span class="essay-card__sub">{sub}</span>
            </a>''' for href, (meta, title, sub, art) in COVERS.items())
    html, n = re.subn(r'<div class="tickets tickets--spaced">.*?</a>\s*</div>', lambda m: '<div class="essay-cards">' + cards + "\n          </div>", html, count=1, flags=re.S)
    assert n == 1, "Writing index: tickets not found"
    html, n = re.subn(r'(\n\s*<section class="row reveal" aria-labelledby="y\d{4}">)', lambda m: "\n" + notes_row().rstrip("\n") + m.group(1), html, count=1)
    assert n == 1, "Writing index: first year row not found"
    html, n = re.subn(r'(\n\s*<section class="row reveal" aria-labelledby="notes-h">)', lambda m: "\n" + board_row().rstrip("\n") + m.group(1), html, count=1)
    assert n == 1, "Writing index: notes row not found"
    for spec in V3_ESSAYS:     # essays that exist only in v3 join the list of their year
        title = re.search(r"^# (.*)$", (Path(__file__).resolve().parent / "v3-essays" / f"{spec['slug']}.md").read_text(), re.M).group(1)
        item = (f'<li><span class="list__main"><a class="link" href="{spec["slug"]}.html">{title}</a><span class="list__sub">{spec["kicker"]}</span></span>'
                f'<time class="list__meta" datetime="{spec["published"]}">{fmt_date(spec["published"])}</time></li>')
        anchor = f'aria-labelledby="y{spec["published"][:4]}">'
        at = html.index('<ol class="list list--first">', html.index(anchor)) + len('<ol class="list list--first">')
        html = html[:at] + item + html[at:]
    return html


# GitHub Pages serves the 404 page at any missing address, so its links start from the site root.
# A local preview under /redesign/v3/ starts from that folder instead.
LOST_HEAD = ("document.documentElement.classList.add('js'); "
             "try { var q = new URLSearchParams(location.search); "
             "if ((q.get('theme') || localStorage.getItem('theme')) === 'light') document.documentElement.dataset.theme = 'light'; "
             "if ((q.get('mode') || localStorage.getItem('mode')) === 'match') document.documentElement.dataset.mode = 'match'; " + CALM + " } catch (e) {} "
             "var lostPath = location.pathname, lostAt = lostPath.indexOf('/redesign/v3/'); "
             "document.write('<base href=\"' + (lostAt < 0 ? '/' : lostPath.slice(0, lostAt + 13)) + '\">');")
LOST_EDITS = (
    ('data-work="Gate not found · 404" data-match="Offside · 404">Gate not found · 404<', 'data-work="Flight not found · 404" data-match="Offside · 404">Flight not found · 404<'),
    ('data-work="This page has no departures." data-match="That run was offside.">This page has no departures.<', 'data-work="This flight is not on the board." data-match="That run was offside.">This flight is not on the board.<'),
    ('<a class="skip" href="#main">', '<a class="skip" href="#main" onclick="document.getElementById(\'main\').scrollIntoView(); return false;">'),
    ("        </ul>\n      </section>", "        </ul>\n        <p class=\"lost__hint\">Or press <kbd>Ctrl</kbd> <kbd>K</kbd> to search the site.</p>\n      </section>"),
)


def lost_page(html):
    """The 404 page: it works from any address, and it keeps the mode the visitor last chose."""
    html, n = re.subn(r"<script>\s*document\.documentElement\.classList\.add\('js'\);.*?</script>",
                      lambda m: "<script>\n    " + LOST_HEAD + "\n  </script>\n  <noscript><base href=\"/\"></noscript>", html, count=1, flags=re.S)
    assert n == 1, "404: head script not found"
    for old, new in LOST_EDITS:
        assert html.count(old) == 1, f"404: not found: {old[:40]}"
        html = html.replace(old, new)
    return html


def text_of(fragment):
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def search_index():
    """Titles, headings and notes for the jump menu (Ctrl+K). Read from the built pages, so it cannot drift."""
    rows = []
    for page in sorted((OUT / "blog").glob("*.html")):
        if page.name == "index.html":
            continue
        html = page.read_text()
        title = text_of(re.search(r'<h1 class="post__title">(.*?)</h1>', html, re.S).group(1))
        tags = " ".join(text_of(t) for t in re.findall(r"<li>(.*?)</li>", re.search(r'<ul class="post__tags".*?</ul>', html, re.S).group(0)))
        rows.append([title, f"blog/{page.name}", "Essay", tags])
        body = html[html.index('<div class="post__body">'):html.index('<footer class="post__foot">')]
        for anchor, heading in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body, re.S):
            if text_of(heading) != "References":
                rows.append([text_of(heading), f"blog/{page.name}#{anchor}", "Heading", title])
    for i, (title, text, source, href) in enumerate(NOTES, 1):
        rows.append([title, f"blog/index.html#note-{i}", "Note", source])
    for name, label in (("agents.html", "How I work with AI agents"), ("portfolio.html", "Work"), ("publications.html", "Research")):
        html = (OUT / name).read_text()
        for anchor, heading in re.findall(r'<h2 class="label" id="([^"]+)"[^>]*>(.*?)</h2>', html, re.S):
            rows.append([text_of(heading), f"{name}#{anchor}", "Section", label])
    pages = {}
    for page in sorted(OUT.glob("*.html")) + sorted((OUT / "blog").glob("*.html")):
        path = page.relative_to(OUT).as_posix()
        if path in ("404.html", "technical_reports.html"):
            continue
        html = page.read_text()
        desc = re.search(r'<meta name="description" content="(.*?)">', html)
        pages[path] = [text_of(re.search(r"<title>(.*?)</title>", html, re.S).group(1)).split(" · Abdullah Sarwar")[0],
                       htmllib.unescape(desc.group(1)) if desc else "", card_name(path)]
    (OUT / "search-index.js").write_text("// Written by _tools/build_v3_pages.py. Do not edit.\nwindow.SITE_INDEX = "
                                         + json.dumps(rows, ensure_ascii=False) + ";\nwindow.SITE_PAGES = "
                                         + json.dumps(pages, ensure_ascii=False) + ";\n")
    return len(rows)


# Short notes on the Writing page. Each one restates a point from an essay and links to its section.
NOTES = [
    ("A lock and a transaction do different jobs",
     "The lock puts operations on one booking in order. The transaction groups the database changes of one operation. Use each for its own job.",
     "Making Booking Retries Safe", "making-booking-retries-safe.html#give-the-lock-and-transaction-separate-jobs"),
    ("A mock cannot test a lock",
     "Mocked database calls can check the order of method calls. They cannot show how the database coordinates separate connections. Test concurrent requests against the real database engine.",
     "Making Booking Retries Safe", "making-booking-retries-safe.html#verify-concurrent-behavior-with-a-real-database"),
    ("An awaited loop still waits",
     "Concurrency inside a chunk does not make chunks overlap. A loop that awaits each complete chunk still makes the later chunks wait.",
     "Speeding Up Hotel Search with Concurrent Chunks", "optimizing-hotel-search-performance.html#existing-flow"),
    ("Change a shared count in one operation",
     "Save, count, then write the count: a delayed write can replace a newer count with an older one. An atomic increment changes the counter as one database operation.",
     "Speeding Up Hotel Search with Concurrent Chunks", "optimizing-hotel-search-performance.html#count-race"),
    ("Three timers, not one",
     "Session response time, first-result time and completion time are separate measurements. Define where each timer starts and where it stops.",
     "Speeding Up Hotel Search with Concurrent Chunks", "optimizing-hotel-search-performance.html#measurement"),
]
# Essay topics that are also a tool in the homepage Toolkit: the tag links to that tool.
TOOL_TAGS = {"MySQL", "PostgreSQL", "MongoDB"}


def notes_row():
    items = "".join(f'''
            <li class="note" id="note-{i}">
              <p class="note__title">{title}</p>
              <p class="note__text">{text}</p>
              <p class="note__from">From <a class="link" href="{href}">{source}</a></p>
            </li>''' for i, (title, text, source, href) in enumerate(NOTES, 1))
    return f'''
      <section class="row reveal" aria-labelledby="notes-h">
        <h2 class="label" id="notes-h">Notes</h2>
        <div class="content">
          <p class="notes__lead">One point each, taken from the essays.</p>
          <ul class="notes">{items}
          </ul>
        </div>
      </section>
'''


def essay_rail(html):
    """Facts under the contents list: reading time, time left (filled by v3.js), published and updated dates."""
    strip = re.search(r'<p class="post__strip">.*?</p>', html, re.S)
    if not strip:
        return html                       # the Writing index is not an essay
    strip = strip.group(0)
    minutes = re.search(r"(\d+) min read", strip)
    dates = re.findall(r'<time datetime="[^"]*">(.*?)</time>', strip)
    if not minutes or not dates or '<details class="toc"' not in html:
        return html
    lines = [f'<span>{minutes.group(1)} min read</span>', f'<span class="toc__left" data-minutes="{minutes.group(1)}"></span>',
             f'<span>Published {dates[0]}</span>']
    if len(dates) > 1:
        lines.append(f'<span>Updated {dates[1]}</span>')
    meta = '<p class="toc__meta">' + "".join(lines) + "</p>"
    html, n = re.subn(r'(<details class="toc".*?</ol>)(</details>)', lambda m: m.group(1) + meta + m.group(2), html, count=1, flags=re.S)
    assert n == 1, "essay rail: contents list not found"
    return html


def essay(html, name):
    html = essay_cover(essay_rail(html), name)
    for tool in TOOL_TAGS:
        html = html.replace(f"<li>{tool}</li>", f'<li><a href="../index.html?mode=work&amp;tool={tool}#toolkit" title="{tool} in my toolkit">{tool}</a></li>')
    if name not in CASE_BACK:
        return html
    back = ('<footer class="post__foot">\n          <p class="more case-back"><a class="link" href="../index.html?mode=work#work">'
            'The short version of this essay is a case on the home page <span class="arrow" aria-hidden="true">→</span></a></p>')
    assert html.count('<footer class="post__foot">') == 1, name
    return html.replace('<footer class="post__foot">', back)



# ---------------------------------------------------------------------------------------------
# Essays that exist only in v3. The text is Markdown in _tools/v3-essays/. The page is made from the
# shell of "Making Booking Retries Safe", so it has the same format.
# ---------------------------------------------------------------------------------------------
V3_ESSAYS = [{
    "slug": "designing-rabbitmq-routing-for-multiple-markets", "no": 6, "published": "2026-11-13",
    "kicker": "Backend engineering · Messaging", "tags": ["RabbitMQ", "Messaging", "Routing"],
    "description": "A routing design for booking events in several markets: the separate roles of connections, channels, routing keys and queues in RabbitMQ.",
    "next": "making-booking-retries-safe",
}]
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()

DEMO_HEAD = '<p class="demo__head"><span class="demo__title">{title}</span><span class="demo__tag">Example values</span></p>'
QUOTES_DEMO = '''<div class="demo demo--wide" data-quotes-demo hidden>
''' + DEMO_HEAD.format(title="Try it · A queue name that kept its quotes") + '''
  <div class="demo__stage quotes">
    <p class="quotes__config"><code>QUEUE_NAME="bookings"</code><span>The publisher reads the name as <code class="quotes__name">"bookings"</code></span></p>
    <div class="quotes__queues">
      <div class="quotes__q quotes__q--good"><code>bookings</code><b data-n="read">0</b><span>read by the consumer</span></div>
      <div class="quotes__q quotes__q--bad"><code>"bookings"</code><b data-n="pile">0</b><span>waiting, with no consumer</span></div>
    </div>
  </div>
  <p class="demo__opts"><label class="demo__opt"><input type="checkbox"> Strip the quotes from the config value</label></p>
  <p class="demo__row"><button class="demo__btn" type="button">Publish a message</button><button class="demo__reset" type="button">Reset</button></p>
  <p class="demo__log" aria-live="polite">Publish a few messages.</p>
</div>'''
PLUGS = '<div class="plugs" aria-hidden="true">' + "<i></i>" * 9 + "</div>"
DEPLOYS_DEMO = '''<div class="demo demo--wide" data-deploys-demo hidden>
''' + DEMO_HEAD.format(title="Try it · A broker change in three deploys") + '''
  <div class="demo__stage deploys">
    ''' + PLUGS + '''
    <ol class="deploys__steps"><li>Bind the new subscribers</li><li>Move the publishers</li><li>Remove the old transports</li></ol>
  </div>
  <p class="demo__row"><button class="demo__btn" type="button">Next deploy</button><button class="demo__reset" type="button">Reset</button></p>
  <p class="demo__log" aria-live="polite"></p>
</div>'''
# Demos placed inside an essay: after the section with this heading number.
ESSAY_DEMOS = {"designing-rabbitmq-routing-for-multiple-markets": {2: QUOTES_DEMO, 7: DEPLOYS_DEMO}}


def fmt_date(iso):
    y, m, d = iso.split("-")
    return f"{int(d)} {MONTHS[int(m) - 1]} {y}"


def md_inline(text):
    text = htmllib.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)


def md_to_html(md, demos):
    """The small part of Markdown the essays use: h1, h2, paragraphs, numbered lists, fenced code, links, inline code."""
    out, toc, lines, i, figure, section = [], [], md.strip().split("\n"), 0, 0, 0
    title, first = None, True

    def close_section():
        if section in demos:
            out.append(demos[section])

    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
        elif line.startswith("# "):
            title = line[2:].strip()
            i += 1
        elif line.startswith("## "):
            close_section()
            text = line[3:].strip()
            hid = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
            found = re.match(r"(\d+)\.", text)
            section = int(found.group(1)) if found else 0
            toc.append((hid, text))
            out.append(f'<h2 id="{hid}">{md_inline(text)}</h2>')
            i += 1
        elif line.startswith("```"):
            block = []
            i += 1
            while not lines[i].startswith("```"):
                block.append(lines[i])
                i += 1
            i += 1
            figure += 1
            out.append(f'<figure class="article-figure">\n<span class="figure-label">Figure {figure}</span>\n'
                       f'<pre tabindex="0" aria-label="Figure {figure}"><code>{htmllib.escape(chr(10).join(block), quote=False)}</code></pre>\n</figure>')
        elif re.match(r"\d+\. ", line):
            items = []
            while i < len(lines) and re.match(r"\d+\. ", lines[i]):
                items.append("<li>" + md_inline(re.sub(r"^\d+\. ", "", lines[i])) + "</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
        else:
            para = []
            while i < len(lines) and lines[i].strip() and not lines[i].startswith(("#", "```")) and not re.match(r"\d+\. ", lines[i]):
                para.append(lines[i].strip())
                i += 1
            out.append(('<p class="article-lead">' if first else "<p>") + md_inline(" ".join(para)) + "</p>")
            first = False
    close_section()
    return title, "\n\n".join("                " + block for block in out), toc


def v3_essay(spec, shell, ticket_html):
    """shell is the built v3 page of 'Making Booking Retries Safe'."""
    slug = spec["slug"]
    md = (Path(__file__).resolve().parent / "v3-essays" / f"{slug}.md").read_text()
    title, body, toc = md_to_html(md, ESSAY_DEMOS.get(slug, {}))
    words = len(re.sub(r"<[^>]+>", " ", body).split())
    minutes = max(1, round(words / 220))
    old_slug, old_title = "making-booking-retries-safe", "Making Booking Retries Safe"
    head, rest = shell.split("<body>", 1)
    head = head.replace(old_slug, slug).replace(old_title, title)
    head = re.sub(r'(<meta (?:name="description"|property="og:description") content=")[^"]*', lambda m: m.group(1) + spec["description"], head)
    head = re.sub(r'<meta name="keywords" content="[^"]*">', f'<meta name="keywords" content="{", ".join(spec["tags"])}, Backend Engineering">', head)
    head = re.sub(r'(article:published_time" content=")[^"]*', lambda m: m.group(1) + spec["published"], head)
    head = re.sub(r'\s*<meta property="article:tag" content="[^"]*">', "", head)
    head = head.replace('  <meta name="twitter:card"', "".join(f'  <meta property="article:tag" content="{t}">\n' for t in spec["tags"]) + '  <meta name="twitter:card"', 1)
    start, end = rest.index('<article class="post">'), rest.index("</article>")
    url = f"{SITE}blog/{slug}.html"
    toc_items = "".join(f'<li><a href="#{hid}">{htmllib.escape(text)}</a></li>' for hid, text in toc)
    article = f'''<article class="post">
        <header class="post__head">
          <p class="post__strip"><span data-work="Essay · No. {spec["no"]:03d}" data-match="Match report · No. {spec["no"]:03d}">Essay · No. {spec["no"]:03d}</span><span class="post__sep">·</span><time datetime="{spec["published"]}">{fmt_date(spec["published"])}</time><span class="post__sep">·</span><span>{minutes} min read</span></p>
          <p class="post__kicker">{spec["kicker"]}</p>
          <h1 class="post__title">{title}</h1>
          <ul class="post__tags" aria-label="Topics">{"".join(f"<li>{t}</li>" for t in spec["tags"])}</ul>
        </header>

        <div class="post__layout">
          <details class="toc" open><summary data-work="Contents" data-match="Team talk">Contents</summary><ol>{toc_items}</ol></details>
          <div class="post__body">

{body}

          </div>
        </div>

        <footer class="post__foot">
          <div class="row row--flush">
            <h2 class="label" data-work="Next essay" data-match="Next essay">Next essay</h2>
            <div class="content">
            {ticket_html}
            </div>
          </div>
          <div class="row row--flush">
            <h2 class="label">Share</h2>
            <div class="content">
              <ul class="links links--inline">
                <li><a class="link" href="https://www.linkedin.com/sharing/share-offsite/?url={url}" target="_blank" rel="noopener">LinkedIn</a></li>
                <li><a class="link" href="https://twitter.com/intent/tweet?text={title.replace(" ", "%20")}&amp;url={url}" target="_blank" rel="noopener">X / Twitter</a></li>
                <li><a class="link" href="index.html">All writing <span class="arrow" aria-hidden="true">→</span></a></li>
              </ul>
            </div>
          </div>
        </footer>
      '''
    return head + "<body>" + rest[:start] + article + rest[end:], title


# ---------------------------------------------------------------------------------------------
# The board: what is published and what is planned. Planned essays show a title only.
# ---------------------------------------------------------------------------------------------
PLANNED = [
    "Query Profiling Found More Than Slow Queries",
    "Upgrading Node in a Service That Renders PDFs",
    "Building Safer Production Access for AI Coding Agents",
    "One Booking Code Across Several Services",
    "Following One Request Through Logs with Grafana and Loki",
]
PUBLISHED = [   # newest first; the first row flips from its old status when the board is reached
    ("Designing RabbitMQ Routing for Multiple Markets", "designing-rabbitmq-routing-for-multiple-markets.html"),
    ("Making Booking Retries Safe", "making-booking-retries-safe.html"),
    ("Speeding Up Hotel Search with Concurrent Chunks", "optimizing-hotel-search-performance.html"),
]


def board(base, match, planned_shown=None):
    """base is the path from the page to v3/blog/. Workday: Planned / Next / Published. Matchday: fixtures and results.
    planned_shown limits the planned rows; the note then links to the full board on the Writing page."""
    done, todo, was = ("Result", "Fixture", "Fixture") if match else ("Published", "Planned", "Next")
    rows = []
    for i, (title, href) in enumerate(PUBLISHED):
        flip = f' data-flip-from="{was}"' if i == 0 else ""
        rows.append(f'<li class="board__row is-done"><a class="link" href="{base}{href}">{title}</a><span class="board__status"{flip}>{done}</span></li>')
    for title in PLANNED[:planned_shown]:
        rows.append(f'<li class="board__row"><span>{title}</span><span class="board__status">{todo}</span></li>')
    label = "Fixtures and results" if match else "In the works"
    hidden = len(PLANNED[:planned_shown]) and len(PLANNED) - len(PLANNED[:planned_shown])
    note = (f'{hidden} more planned · <a class="link" href="{base}index.html#board-h">See all</a> · Planned titles can change.'
            if hidden else "Planned titles can change.")
    return (f'<div class="board{" board--match" if match else ""} flipboard scene-observe">\n'
            f'                  <p class="board__head"><span>{label}</span><span>Status</span></p>\n'
            f'                  <ol class="board__rows">\n                    ' + "\n                    ".join(rows) + "\n                  </ol>\n"
            f'                  <p class="board__note">{note}</p>\n                </div>')


def board_row():
    return f'''
      <section class="row reveal" aria-labelledby="board-h">
        <h2 class="label" id="board-h">In the works</h2>
        <div class="content">
          {board("", False)}
        </div>
      </section>
'''


def peek(base, label, target):
    """The next page shows its header under the footer. A tap opens it, and so does scrolling on (v3.js)."""
    return f'''<a class="peek" href="{base}{target}" aria-label="Next page: {label}">
      <span class="peek__hint">Next page · keep scrolling, or tap</span>
      <span class="peek__head"><span class="mini-portrait" aria-hidden="true"><img class="portrait__img portrait__img--work" src="{base}img/portrait-work.jpg" alt="" width="480" height="600" loading="lazy"></span><span class="site-id__name">Abdullah Sarwar</span></span>
      <span class="peek__title">{label}</span>
      <i class="peek__fill" aria-hidden="true"></i>
    </a>'''


COVER_NAMES = {"making-booking-retries-safe.html": "cover-retries", "optimizing-hotel-search-performance.html": "cover-search",
               "designing-rabbitmq-routing-for-multiple-markets.html": "cover-rabbit"}


def essay_cover(html, name):
    """The essay opens with the same diagram as its case and its card, so the page change can morph one into the other."""
    if name not in COVERS:
        return html
    art = COVERS[name][3]
    cover = f'<div class="card__stage post__cover scene-observe" aria-hidden="true" style="view-transition-name: {COVER_NAMES[name]}">{art}</div>\n        </header>'
    assert html.count("        </header>") == 1, name
    return html.replace("        </header>", cover, 1)

COVERS = {"designing-rabbitmq-routing-for-multiple-markets.html": ("Essay · No. 006 · 13 Nov 2026", "Designing RabbitMQ Routing for Multiple Markets",
                                                                  "Routing keys, queues and connections", PLUGS), **COVERS}


def main():
    for name in ("styles.css", "main.js"):
        if not (OUT / name).exists():  # v3 owns its copy after the first run
            shutil.copy2(SRC / name, OUT / name)
    if not (OUT / "img").exists():
        shutil.copytree(SRC / "img", OUT / "img")
    (OUT / "blog").mkdir(exist_ok=True)

    shell = None
    for name in ("portfolio.html", "publications.html", "404.html"):
        html = convert((SRC / name).read_text(), "")
        if name == "portfolio.html":
            shell = html                      # before the Work-only edits: the shell for v3-only pages
            html = career_timeline(work_page(html))
        if name == "404.html":
            html = lost_page(html)
        (OUT / name).write_text(finish(html, "", name))
    shutil.copy2(SRC / "technical_reports.html", OUT / "technical_reports.html")
    for page in sorted((SRC / "blog").glob("*.html")):
        html = essay(convert(page.read_text(), "../"), page.name)
        if page.name == "index.html":
            html = writing_index(html)
        if page.name == "why-db-optimization-is-not-always-the-best-solution.html":   # archived: kept at its URL, not indexed
            html = html.replace("<title>", '<meta name="robots" content="noindex">\n  <title>', 1)
        (OUT / "blog" / page.name).write_text(finish(html, "../", f"blog/{page.name}"))

    # Essays that exist only in v3, in the format of "Making Booking Retries Safe".
    essay_shell = convert((SRC / "blog" / "making-booking-retries-safe.html").read_text(), "../")
    for spec in V3_ESSAYS:
        donor = (SRC / "blog" / "scoring-goals-securely.html").read_text()     # its "next essay" ticket is the one for essay No. 005
        ticket_html = re.search(r'<a class="tk" href="%s\.html".*?</a>' % spec["next"], donor, re.S).group(0)
        ticket_html = ticket_html.replace("Next departure", "Next essay")
        html, _ = v3_essay(spec, essay_shell, ticket_html)
        name = spec["slug"] + ".html"
        (OUT / "blog" / name).write_text(finish(essay(html, name), "../", f"blog/{name}"))

    # Pages that exist only in v3: each body in _tools/v3-pages/ is wrapped in the Work page's shell.
    for body_file in sorted((Path(__file__).resolve().parent / "v3-pages").glob("*.html")):
        body = body_file.read_text()
        meta = re.match(r"<!-- title: (.*?) \| description: (.*?) -->\n", body)
        assert meta, f"{body_file.name}: first line must be the title and description comment"
        title, description = meta.group(1), meta.group(2)
        html = shell
        html = re.sub(r"<title>.*?</title>", lambda m: f"<title>{title} · Abdullah Sarwar</title>", html, count=1)
        html = re.sub(r'<meta name="description" content=".*?">', lambda m: f'<meta name="description" content="{description}">', html, count=1)
        html = re.sub(r'<link rel="canonical" href=".*?">', lambda m: f'<link rel="canonical" href="{SITE}{body_file.name}">', html, count=1)
        html = html.replace(' aria-current="page"', "")
        html, n = re.subn(r'(<main id="main">\n).*?(    </main>)', lambda m: m.group(1) + body[meta.end():] + m.group(2), html, count=1, flags=re.S)
        assert n == 1, "main not found"
        (OUT / body_file.name).write_text(finish(html, "", body_file.name))

    # The homepage is hand-written; it only takes the shared footer from here.
    home = OUT / "index.html"
    html = home.read_text()
    home_peek = peek("", "Work", "portfolio.html").replace('class="peek"', 'class="peek work-only"')
    html, n = re.subn(r'<footer class="foot[^"]*">.*?</footer>(\s*<a class="peek[^>]*>.*?</a>)?', lambda m: footer("") + "\n    " + home_peek, html, count=1, flags=re.S)
    assert n == 1, "homepage footer not found"
    html, n = re.subn(r"<!-- board:match -->.*?<!-- /board:match -->", lambda m: "<!-- board:match -->" + board("blog/", True, planned_shown=3) + "<!-- /board:match -->", html, count=1, flags=re.S)
    assert n == 1, "homepage: board marker not found"
    home.write_text(html)

    print("search index rows:", search_index())
    print("v3 pages:", len(list(OUT.glob("*.html"))), "+", len(list((OUT / "blog").glob("*.html"))), "blog")


if __name__ == "__main__":
    main()
