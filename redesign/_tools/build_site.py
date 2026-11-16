#!/usr/bin/env python3
"""Build the redesign's inner pages from the live site content.

Writes, inside redesign/:
  blog/<post>.html      each live post, text and diagrams unchanged, in the new template
  blog/index.html       the writing index
  publications.html     papers and technical reports (merged)
  technical_reports.html  a redirect to publications.html#reports, so the old URL keeps working
  portfolio.html        the Work page
  404.html              the not-found page

The homepage (redesign/index.html) is hand-written and not touched.
Standard library only. Run: python3 -I redesign/_tools/build_site.py
"""
from html import escape, unescape
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC_BLOG = ROOT / "legacy" / "blog"   # the old site keeps the source text of each post
OUT = ROOT / "redesign"
DATA = Path(__file__).resolve().parent

# Newest first. "no" is the public essay number; None means unlisted.
POSTS = [
    {"slug": "making-booking-retries-safe", "no": 5, "featured": True,
     "work_fields": [("From", "Retry"), ("To", "Same booking"), ("Topic", "Idempotency")], "vs": ("Retry", "Duplicates")},
    {"slug": "optimizing-hotel-search-performance", "no": 4, "featured": True,
     "work_fields": [("From", "Chunk by chunk"), ("To", "Bounded overlap"), ("Topic", "Concurrency")], "vs": ("Overlap", "Waiting")},
    {"slug": "setting-up-postgresql-on-wsl", "no": 3},
    {"slug": "setting-up-wsl-on-windows", "no": 2},
    {"slug": "scoring-goals-securely", "no": 1},
    {"slug": "why-db-optimization-is-not-always-the-best-solution", "no": None},
]

MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
MODE_SCRIPT = ("try { var m = new URLSearchParams(location.search).get('mode') || localStorage.getItem('mode'); "
               "if (m === 'match') document.documentElement.dataset.mode = 'match'; "
               "if (localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light'; } catch (e) {}")


# ---------- small helpers ----------

def fmt_date(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {MONTHS[m - 1]} {y}"


def strip_tags(s):
    return unescape(re.sub(r"<[^>]+>", "", s)).strip()


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def swap(tag, work, match, extra=""):
    """An element whose text changes with the Workday / Matchday switch."""
    return f'<{tag}{extra} data-work="{escape(work)}" data-match="{escape(match)}">{escape(work)}</{tag}>'


# ---------- shared page frame ----------

def links(base):
    return {"home": f"{base}index.html", "writing": f"{base}blog/index.html",
            "work": f"{base}portfolio.html", "research": f"{base}publications.html"}


def head(base, title, metas, canonical, extra=""):
    meta_html = "\n".join("  " + m for m in metas)
    return f"""<!DOCTYPE html>
<html lang="en" data-mode="work">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
{meta_html}
  <title>{escape(title)}</title>
  {canonical}
  <link rel="icon" type="image/jpeg" href="{base}../img/profile_picture.jpg">{extra}
  <script>
    {MODE_SCRIPT}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=DM+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{base}styles.css">
</head>"""


def site_header(base, current):
    lk = links(base)

    def nav(key, label):
        cur = ' aria-current="page"' if key == current else ""
        return f'<a class="link" href="{lk[key]}"{cur}>{label}</a>'
    return f"""    <header class="site-header">
      <a class="site-id" href="{lk['home']}">
        <span class="mini-portrait" aria-hidden="true">
          <img class="portrait__img portrait__img--work" src="{base}img/portrait-work.jpg" alt="" width="480" height="600">
          <img class="portrait__img portrait__img--match" src="{base}img/portrait-match.jpg" alt="" width="480" height="600">
        </span>
        <span class="site-id__name">Abdullah Sarwar</span>
      </a>
      <nav class="site-nav" aria-label="Main">
        {nav('writing', 'Writing')}
        {nav('work', 'Work')}
        {nav('research', 'Research')}
      </nav>
      <div class="controls">
      <button class="theme-btn" id="theme-toggle" type="button" aria-label="Switch to light theme">
        <svg class="theme-btn__sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>
        <svg class="theme-btn__moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19.5 14.6A7.5 7.5 0 0 1 9.4 4.5a7.5 7.5 0 1 0 10.1 10.1z"/></svg>
      </button>
      <button class="switch" id="mode-switch" type="button" role="switch" aria-checked="false" aria-label="Show the personal Matchday view">
        <span class="switch__word switch__word--work">Workday</span>
        <span class="switch__track" aria-hidden="true"><span class="switch__ball"></span></span>
        <span class="switch__word switch__word--match">Matchday</span>
      </button>
      </div>
    </header>"""


def page(base, title, metas, canonical, current, main_html, skip="Skip to content"):
    return f"""{head(base, title, metas, canonical)}
<body>
  <a class="skip" href="#main">{skip}</a>

  <div class="page page--inner">
{site_header(base, current)}

    <main id="main">
{main_html}
    </main>

    <footer class="foot">
      <p><a class="link" href="mailto:abdullah.md.sarwar@gmail.com">abdullah.md.sarwar@gmail.com</a> · <a class="link" href="https://github.com/thedrowsywinger" target="_blank" rel="noopener">GitHub</a> · <a class="link" href="https://www.linkedin.com/in/abdullah-md-sarwar/" target="_blank" rel="noopener">LinkedIn</a> · <a class="link" href="https://drive.google.com/file/d/1YnQN7jGuS_z25cZA5cOdOv-a0zBbXJ-p/view?usp=sharing" target="_blank" rel="noopener">Résumé</a></p>
      <p>© 2026 Abdullah Md. Sarwar</p>
    </footer>
  </div>

  <script src="{base}main.js"></script>
</body>
</html>
"""


def row(label_work, label_match, content, hid, first=False, heading="h2"):
    cls = "row row--top" if first else "row"
    return f"""      <section class="{cls}" aria-labelledby="{hid}">
        {swap(heading, label_work, label_match, f' class="label" id="{hid}"')}
        <div class="content">
{content}
        </div>
      </section>"""


# ---------- blog ----------

def inner_block(html, class_name):
    """Return the inner HTML of the first div or section with class_name, balancing nested tags."""
    m = re.search(r'<(div|section) class="%s">' % re.escape(class_name), html)
    tag, open_end = m.group(1), m.end()
    depth = 1
    for t in re.finditer(r"<%s\b|</%s>" % (tag, tag), html[open_end:]):
        depth += -1 if t.group(0).startswith("</") else 1
        if depth == 0:
            return html[open_end:open_end + t.start()]
    raise ValueError("unbalanced " + tag)


def parse_post(slug):
    html = (SRC_BLOG / f"{slug}.html").read_text()
    head_html = html[:html.index("</head>")]
    article = html[html.index("<article"):html.index("</article>")]
    kicker = re.search(r'<p class="article-kicker">(.*?)</p>', article, re.S)
    note = re.search(r'<aside class="article-note".*?</aside>', article, re.S)
    updated = re.search(r'Updated <time datetime="([\d-]+)"', article)
    body = inner_block(article, "blog-post__content")
    canonical = re.search(r'<link rel="canonical"[^>]*>', head_html)
    return {
        "metas": re.findall(r'<meta\s+(?:name="(?:description|keywords|author)"|property="[^"]+")[^>]*>', head_html),
        "canonical": canonical.group(0) if canonical else "",
        "title": strip_tags(re.search(r"<h1[^>]*>(.*?)</h1>", article, re.S).group(1)),
        "kicker": strip_tags(kicker.group(1)) if kicker else "",
        "published": re.findall(r'<time datetime="([\d-]+)"', article)[0],
        "updated": updated.group(1) if updated else None,
        "tags": [strip_tags(t) for t in re.findall(r'class="tag"[^>]*>(.*?)</', article)],
        # Keep a notice only when it sits outside the body, so it is not shown twice.
        "note": note.group(0) if note and note.group(0) not in body else "",
        "body": body,
    }


def prepare_body(body):
    """Give every h2 an id, collect the contents list, and fix paths for the deeper folder."""
    toc = []

    def add_id(m):
        attrs, inner = m.group(1), m.group(2)
        found = re.search(r'id="([^"]+)"', attrs)
        hid = found.group(1) if found else slugify(strip_tags(inner))
        toc.append((hid, strip_tags(inner)))
        return m.group(0) if found else f'<h2 id="{hid}"{attrs}>{inner}</h2>'

    body = re.sub(r"<h2([^>]*)>(.*?)</h2>", add_id, body, flags=re.S)
    body = body.replace('src="../img/', 'src="../../img/')
    return body, toc


def reading_minutes(body):
    return max(1, round(len(strip_tags(body).split()) / 220))


def essay_label(no, match=False):
    kind = "Match report" if match else "Essay"
    return f"{kind} · Archive" if no is None else f"{kind} · No. {no:03d}"


def ticket(post, data, href):
    """A boarding-pass ticket linking to a post (same markup as the homepage)."""
    fields = post.get("work_fields") or [("Topic", data["kicker"] or "Engineering")]
    field_html = "".join(f'<span class="f"><small>{escape(k)}</small><span>{escape(v)}</span></span>' for k, v in fields)
    vs = post.get("vs")
    fields_cls = "tk__fields tk__fields--work" if vs else "tk__fields"
    vs_html = f'<span class="tk__vs">{escape(vs[0])} <b>vs</b> {escape(vs[1])}</span>' if vs else ""
    return f"""<a class="tk" href="{href}" aria-label="Read: {escape(data['title'])}">
              <span class="tk__notch tk__notch--t"></span><span class="tk__notch tk__notch--b"></span>
              <span class="tk__main">
                <span class="tk__top">{swap('span', essay_label(post['no']), essay_label(post['no'], True))}<time datetime="{data['published']}">{fmt_date(data['published'])}</time></span>
                <span class="tk__title">{escape(data['title'])}</span>
                <span class="{fields_cls}">{field_html}</span>
                {vs_html}
                <span class="tk__bar"><i aria-hidden="true"></i><code>/blog/{post['slug']}</code></span>
              </span>
              <span class="tk__stub"><span class="tk__action">Read</span><span class="tk__no">ADMIT<br>ONE</span></span>
            </a>"""


def build_post(post, data, nxt, nxt_data):
    body, toc = prepare_body(data["body"])
    updated = (f'<span class="post__sep">·</span><span>Updated <time datetime="{data["updated"]}">{fmt_date(data["updated"])}</time></span>'
               if data["updated"] else "")
    tags = "".join(f"<li>{escape(t)}</li>" for t in data["tags"])
    toc_items = "".join(f'<li><a href="#{hid}">{escape(text)}</a></li>' for hid, text in toc)
    toc_block = (f'<details class="toc" open>{swap("summary", "Contents", "Team talk")}<ol>{toc_items}</ol></details>'
                 if toc else '<div class="toc toc--empty" aria-hidden="true"></div>')
    url = f"https://thedrowsywinger.github.io/blog/{post['slug']}.html"
    tweet = escape(data["title"]).replace(" ", "%20")
    kicker = f'<p class="post__kicker">{escape(data["kicker"])}</p>' if data["kicker"] else ""
    tag_list = f'<ul class="post__tags" aria-label="Topics">{tags}</ul>' if tags else ""
    main = f"""      <article class="post">
        <header class="post__head">
          <p class="post__strip">{swap('span', essay_label(post['no']), essay_label(post['no'], True))}<span class="post__sep">·</span><time datetime="{data['published']}">{fmt_date(data['published'])}</time><span class="post__sep">·</span><span>{reading_minutes(body)} min read</span>{updated}</p>
          {kicker}
          <h1 class="post__title">{escape(data['title'])}</h1>
          {tag_list}
        </header>

        <div class="post__layout">
          {toc_block}
          <div class="post__body">
{data['note']}
{body}
          </div>
        </div>

        <footer class="post__foot">
          <div class="row row--flush">
            {swap('h2', 'Next departure', 'Next fixture', ' class="label"')}
            <div class="content">
            {ticket(nxt, nxt_data, nxt['slug'] + '.html')}
            </div>
          </div>
          <div class="row row--flush">
            <h2 class="label">Share</h2>
            <div class="content">
              <ul class="links links--inline">
                <li><a class="link" href="https://www.linkedin.com/sharing/share-offsite/?url={url}" target="_blank" rel="noopener">LinkedIn</a></li>
                <li><a class="link" href="https://twitter.com/intent/tweet?text={tweet}&amp;url={url}" target="_blank" rel="noopener">X / Twitter</a></li>
                <li><a class="link" href="index.html">All writing <span class="arrow" aria-hidden="true">→</span></a></li>
              </ul>
            </div>
          </div>
        </footer>
      </article>"""
    return page("../", f"{data['title']} · Abdullah Sarwar", data["metas"], data["canonical"], "writing", main, "Skip to article")


def build_blog_index(parsed):
    listed = [p for p in POSTS if p["no"] is not None]
    featured = "\n            ".join(ticket(p, parsed[p["slug"]], p["slug"] + ".html") for p in listed if p.get("featured"))
    years = {}
    for p in listed:
        years.setdefault(parsed[p["slug"]]["published"][:4], []).append(p)
    rows = [row("Departures", "Fixtures", f"""          <p class="lead">Notes on backend engineering: keeping bookings safe under retries, running work concurrently, routing messages between services, authentication, and local development setup.</p>
          <div class="tickets tickets--spaced">
            {featured}
          </div>""", "writing-h", first=True, heading="h1")]
    for year, posts in years.items():
        items = "".join(
            f'<li><span class="list__main"><a class="link" href="{p["slug"]}.html">{escape(parsed[p["slug"]]["title"])}</a>'
            f'<span class="list__sub">{escape(parsed[p["slug"]]["kicker"])}</span></span>'
            f'<time class="list__meta" datetime="{parsed[p["slug"]]["published"]}">{fmt_date(parsed[p["slug"]]["published"])}</time></li>'
            for p in posts)
        rows.append(row(year, f"Season {year}", f'          <ol class="list list--first">{items}</ol>', f"y{year}"))
    metas = ['<meta name="description" content="Writing by Abdullah Md. Sarwar on backend engineering: booking safety, concurrency, authentication, and development setup.">',
             '<meta name="author" content="Abdullah Md. Sarwar">']
    return page("../", "Writing · Abdullah Sarwar", metas,
                '<link rel="canonical" href="https://thedrowsywinger.github.io/blog/">', "writing", "\n\n".join(rows))


# ---------- research ----------

def build_research():
    data = json.loads((DATA / "research.json").read_text())
    papers = "".join(f"""
            <li class="entry">
              <p class="entry__title">{escape(p['title'])}</p>
              <p class="entry__meta">{escape(p['venue'])}</p>
              <p class="entry__meta"><time datetime="{p['date']}">{fmt_date(p['date'])}</time> · <a class="link" href="https://doi.org/{p['doi']}" target="_blank" rel="noopener">DOI {escape(p['doi'])}</a></p>
              <details class="entry__abstract"><summary>Abstract</summary><p>{escape(p['abstract'])}</p></details>
            </li>""" for p in data["papers"])
    reports = "".join(f"""
            <li class="entry">
              <p class="entry__title">{escape(r['title'])}</p>
              <details class="entry__abstract"><summary>Abstract</summary><p>{escape(r['abstract'])}</p></details>
            </li>""" for r in data["reports"])
    main = "\n\n".join([
        row("Research", "Programme archive",
            '          <p class="lead">Peer-reviewed research from 2019–2020 in natural language processing and data mining, followed by four technical reports.</p>',
            "research-h", first=True, heading="h1"),
        row("Papers", "Cup runs", f'          <ol class="entries">{papers}\n          </ol>', "papers"),
        row("Reports", "Friendlies", f'          <ol class="entries">{reports}\n          </ol>', "reports"),
    ])
    metas = ['<meta name="description" content="Research by Abdullah Md. Sarwar: peer-reviewed papers in natural language processing and data mining, and technical reports.">',
             '<meta name="author" content="Abdullah Md. Sarwar">']
    return page("", "Research · Abdullah Sarwar", metas,
                '<link rel="canonical" href="https://thedrowsywinger.github.io/publications.html">', "research", main)


def build_reports_redirect():
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Technical reports moved · Abdullah Sarwar</title>
  <link rel="canonical" href="https://thedrowsywinger.github.io/publications.html#reports">
  <meta http-equiv="refresh" content="0; url=publications.html#reports">
  <meta name="robots" content="noindex">
</head>
<body>
  <p>The technical reports now live on the <a href="publications.html#reports">Research page</a>.</p>
</body>
</html>
"""


# ---------- work ----------

def build_work():
    # Descriptions only where the facts are confirmed; the rest show the name alone.
    domains = [
        ("Public gateways", ""),
        ("Flights", ""),
        ("Hotels", "Supplier integrations and booking states."),
        ("E-commerce", ""),
        ("Mobile recharge", ""),
        ("Utility bill payments", ""),
        ("Visa", "Including B2B visa services."),
        ("Holidays", ""),
        ("B2B", ""),
        ("B2E", ""),
    ]
    domain_html = "".join(f'<li class="domain"><span class="domain__name">{escape(n)}</span>' + (f'<span class="domain__desc">{escape(d)}</span>' if d else '') + '</li>' for n, d in domains)
    also = [
        "A coupon engine with inclusive and exclusive rules across services and brands.",
        "B2B visa services, travel insurance, and virtual card management.",
        "AI travel-planning workflows: tool integration and controls on provider-call usage.",
        "Hotel supplier API integrations, and public API documentation.",
    ]
    also_html = "".join(f"<li>{escape(a)}</li>" for a in also)
    roles = [
        # Talvette hidden for now (2026-11-07, at Abdullah's request). Uncomment to show it again.
        # ("Talvette", "Consultant Backend Engineer, part-time", "May – Dec 2024",
        #  "APIs for a recruitment platform: candidate, job-post, and company workflows; candidate matching; profile filters; role-based access; API documentation."),
        ("mPower Social Enterprise", "Software Engineer", "May 2021 – Oct 2022",
         "Systems across humanitarian, agricultural, and financial work: an agricultural stock and distribution ERP, a relief-tracking platform with QR codes, an emissions-survey dashboard, a nutrition content platform, and a cattle-insurance app with image recognition."),
        ("Early Advantage Bangladesh", "Software Engineer", "Jul 2020 – Apr 2021",
         "The backend of an SME management platform: contracts, inventory, e-invoicing, cash planning, analytics, and accounts (Django, PostgreSQL)."),
        ("Alter F4", "Software Engineer", "Jan – Jul 2020",
         "A content management backend with authorization and media uploads (Django)."),
    ]
    role_html = "".join(f"""
            <li class="entry">
              <p class="entry__title">{escape(c)} <span class="muted">· {escape(t)}</span></p>
              <p class="entry__meta">{escape(d)}</p>
              <p class="entry__text">{escape(x)}</p>
            </li>""" for c, t, d, x in roles)
    team_sheet = """          <div class="kit kit--work">
            <p><strong>Data</strong> PostgreSQL · MySQL · MongoDB · Redis</p>
            <p><strong>Queries</strong> Raw SQL first, TypeORM where it helps</p>
            <p><strong>Services</strong> NestJS · Node.js · Express, with Python as well</p>
            <p><strong>Language</strong> TypeScript</p>
            <p><strong>Messaging</strong> RabbitMQ · scheduled jobs (cron)</p>
            <p><strong>Search</strong> Typesense</p>
            <p><strong>AI integration</strong> MCP</p>
            <p><strong>Observability</strong> Grafana · Loki</p>
            <p><strong>AI tools</strong> Claude Code · Codex · T3 Code, with every change reviewed by a person</p>
          </div>

          <div class="kit kit--match">
            <div class="sheet">
              <div class="pitch" role="img" aria-label="Team sheet in a 4-4-1-1. Goalkeeper Grafana. Defence, left to right: MongoDB, PostgreSQL, MySQL, Redis. Midfield RabbitMQ, Loki, Raw SQL, Cron jobs. AI agents as false 9, NestJS up front. Home ground Node.js, away ground Python. Substitutes TypeScript, TypeORM, Typesense, MCP and Express.">
                <span class="pitch__box pitch__box--l"></span><span class="pitch__box pitch__box--r"></span>
                <span class="pl" style="left:6%;top:50%">Grafana</span>
                <span class="pl" style="left:20%;top:15%">MongoDB</span><span class="pl" style="left:20%;top:38%">Postgres</span><span class="pl" style="left:20%;top:62%">MySQL</span><span class="pl" style="left:20%;top:85%">Redis</span>
                <span class="pl" style="left:40%;top:15%">RabbitMQ</span><span class="pl" style="left:37%;top:38%">Loki</span><span class="pl" style="left:37%;top:62%">Raw SQL</span><span class="pl" style="left:40%;top:85%">Cron jobs</span>
                <span class="pl" style="left:64%;top:50%">AI agents</span>
                <span class="pl" style="left:82%;top:50%">NestJS</span>
              </div>
              <div class="dugout">
                <div><small>Manager</small><p class="manager"><i aria-hidden="true"></i>Abdullah Sarwar</p></div>
                <span class="dugout__sep" aria-hidden="true"></span>
                <div><small>Home ground</small><p class="ground">Node.js</p></div>
                <span class="dugout__sep" aria-hidden="true"></span>
                <div><small>Away ground</small><p class="ground">Python</p></div>
              </div>
              <div class="bench">
                <small>Substitutes</small>
                <ul class="staff staff--subs"><li>TypeScript</li><li>TypeORM</li><li>Typesense</li><li>MCP</li><li>Express</li></ul>
              </div>
            </div>
            <p class="caption">4-4-1-1: data at the back, the plumbing in midfield, NestJS up front. AI agents (Claude Code, Codex, T3 Code) play false 9: they drop deep and set up the finish. The manager picks the team and owns the result.</p>
          </div>"""
    main = "\n\n".join([
        row("Work", "The club",
            '          <p class="lead">I joined ShareTrip in Dhaka in November 2022, and I lead its Public API team. The work is as much business logic as engineering: clear booking states, careful supplier integrations, and prices that come out right. As team lead, I plan the team\'s work, review its code and take changes from staging to production.</p>',
            "work-h", first=True, heading="h1"),
        row("Public API team", "The squad",
            f'          <ul class="domains">{domain_html}</ul>\n          <p class="caption">The services my team builds and maintains.</p>', "team-h"),
        row("Also at ShareTrip", "Set pieces", f'          <ul class="plain-list">{also_html}</ul>', "also-h"),
        row("Earlier", "Past seasons", f'          <ol class="entries">{role_html}\n          </ol>', "earlier-h"),
        row("Toolkit", "Team sheet", team_sheet, "kit-h"),
        row("Education", "Academy",
            '          <p class="entry__title">North South University <span class="muted">· BSc, Computer Science and Engineering</span></p>', "edu-h"),
    ])
    metas = ['<meta name="description" content="The work of Abdullah Md. Sarwar, Senior Software Engineer at ShareTrip and lead of its Public API team.">',
             '<meta name="author" content="Abdullah Md. Sarwar">']
    return page("", "Work · Abdullah Sarwar", metas,
                '<link rel="canonical" href="https://thedrowsywinger.github.io/portfolio.html">', "work", main)


# ---------- 404 ----------

def build_404():
    main = """      <section class="lost" aria-labelledby="lost-h">
        <div class="lost__scene lost__scene--work" aria-hidden="true">
          <svg viewBox="0 0 320 120" width="320" height="120">
            <path class="lost__trail" d="M20 96 C110 20 230 20 250 60 C270 100 200 110 180 80 C160 50 220 30 300 40"/>
            <g class="lost__plane">
              <path d="M-11 0 L11 -9 L4 9 L0 1 Z" fill="#fff" stroke="#2A2623" stroke-width="1.4" stroke-linejoin="round"/>
              <animateMotion dur="3.4s" begin="0.3s" fill="freeze" rotate="auto" path="M20 96 C110 20 230 20 250 60 C270 100 200 110 180 80 C160 50 220 30 300 40"/>
            </g>
          </svg>
        </div>
        <div class="lost__scene lost__scene--match" aria-hidden="true">
          <svg viewBox="0 0 320 120" width="320" height="120">
            <line x1="0" y1="110" x2="320" y2="110" class="lost__line"/>
            <g class="lost__ref"><circle cx="150" cy="40" r="8"/><line x1="150" y1="48" x2="150" y2="80"/><line x1="150" y1="80" x2="142" y2="108"/><line x1="150" y1="80" x2="158" y2="108"/><line x1="150" y1="58" x2="138" y2="72"/>
              <g class="lost__arm"><line x1="150" y1="58" x2="166" y2="64"/><line x1="166" y1="64" x2="166" y2="38" class="lost__pole"/><rect x="166" y="38" width="16" height="11" class="lost__flag"/></g>
            </g>
          </svg>
        </div>
        """ + swap("p", "Gate not found · 404", "Offside · 404", ' class="lost__kicker"') + """
        """ + swap("h1", "This page has no departures.", "That run was offside.", ' class="lost__title" id="lost-h"') + """
        <p class="lead">The link may be old, or the page may have moved. Try one of these instead.</p>
        <ul class="links links--inline lost__links">
          <li><a class="link" href="index.html">Home</a></li>
          <li><a class="link" href="blog/index.html">Writing</a></li>
          <li><a class="link" href="portfolio.html">Work</a></li>
          <li><a class="link" href="publications.html">Research</a></li>
        </ul>
      </section>"""
    return page("", "Page not found · Abdullah Sarwar", ['<meta name="robots" content="noindex">'], "", "", main)


def main():
    (OUT / "blog").mkdir(parents=True, exist_ok=True)
    parsed = {p["slug"]: parse_post(p["slug"]) for p in POSTS}
    listed = [p for p in POSTS if p["no"] is not None]
    for p in POSTS:
        # Next departure: the next older listed post, wrapping to the newest.
        nxt = listed[0] if p["no"] is None else listed[(listed.index(p) + 1) % len(listed)]
        (OUT / "blog" / f"{p['slug']}.html").write_text(build_post(p, parsed[p["slug"]], nxt, parsed[nxt["slug"]]))
    (OUT / "blog" / "index.html").write_text(build_blog_index(parsed))
    (OUT / "publications.html").write_text(build_research())
    (OUT / "technical_reports.html").write_text(build_reports_redirect())
    (OUT / "portfolio.html").write_text(build_work())
    (OUT / "404.html").write_text(build_404())
    for f in sorted(OUT.rglob("*.html")):
        print(f.relative_to(OUT))


if __name__ == "__main__":
    main()
