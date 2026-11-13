import re, sys, pathlib
root = pathlib.Path(sys.argv[1])            # redesign/
v1 = (root / 'index.html').read_text()
parts = pathlib.Path(sys.argv[2])

def section(key):
    m = re.search(r'      <section class="row[^"]*" aria-labelledby="%s-h">[\s\S]*?</section>\n' % key, v1)
    return m.group(0)

def up(html):
    # v2 lives one folder deeper
    html = re.sub(r'(href|src)="(?!https?:|mailto:|#|\.\./)', r'\1="../', html)
    return html

shared = ''.join(up(section(k)) for k in ['writing', 'honours', 'research', 'contact'])
shared = shared.replace('data-work="Departures" data-match="Match reports">Departures<', 'data-work="Writing" data-match="Match reports">Writing<')
cross = (parts / 'cross.html').read_text().replace('<div class="cross" id="cross">', '<div class="cross scene-observe" id="cross">')
sheet = (parts / 'sheet.html').read_text()

RESUME = 'https://drive.google.com/file/d/1YnQN7jGuS_z25cZA5cOdOv-a0zBbXJ-p/view?usp=sharing'

page = f'''<!DOCTYPE html>
<html lang="en" data-mode="work">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abdullah Sarwar · Senior Software Engineer</title>
  <meta name="description" content="Abdullah Md. Sarwar is a Senior Software Engineer in Dhaka who leads the Public API team at ShareTrip.">
  <meta name="robots" content="noindex">
  <script>
    try {{ var m = new URLSearchParams(location.search).get('mode') || localStorage.getItem('mode'); if (m === 'match') document.documentElement.dataset.mode = 'match'; if (localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light'; }} catch (e) {{}}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=DM+Mono:wght@400;500&family=Literata:opsz,wght@7..72,400;7..72,600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="v2.css">
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>

  <div class="page v2">
    <div class="v2-bar">
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
    </div>

    <!-- Workday intro: everything a hiring manager needs in the first screen -->
    <header class="intro only-work">
      <div class="ident">
        <figure class="portrait">
          <img class="portrait__img portrait__img--work" src="../img/portrait-work.jpg" alt="Abdullah Sarwar in a suit" width="480" height="600">
        </figure>
        <h1 class="name">Abdullah Sarwar</h1>
        <p class="role">
          <span class="flap" id="flap" aria-label="Senior Software Engineer" data-text="SENIOR SOFTWARE ENGINEER"></span>
          <span class="role__place">Dhaka, Bangladesh</span>
        </p>
      </div>
      <p class="pitch-line">I lead the Public API team at ShareTrip, a travel company in Dhaka. We build the services behind flight, hotel, holiday, visa, and lifestyle bookings. I write about how we keep them correct.</p>
      <ul class="quick-links">
        <li><a class="btn-resume" href="{RESUME}" target="_blank" rel="noopener">Résumé <span aria-hidden="true">↗</span></a></li>
        <li><a class="link" href="mailto:abdullah.md.sarwar@gmail.com">Email</a></li>
        <li><a class="link" href="https://github.com/thedrowsywinger" target="_blank" rel="noopener">GitHub</a></li>
        <li><a class="link" href="https://www.linkedin.com/in/abdullah-md-sarwar/" target="_blank" rel="noopener">LinkedIn</a></li>
      </ul>
    </header>

    <!-- Matchday cover: a match programme front page -->
    <header class="cover only-match">
      <div class="cover__bar"><span>Official matchday programme</span><span>Dhaka · Season 2026/27</span></div>
      <div class="cover__body">
        <div class="cover__text">
          <p class="cover__kicker">Tonight's line-up features</p>
          <h1 class="cover__name">Abdullah<br>Sarwar</h1>
          <p class="cover__sub">Senior Software Engineer · Public API lead, ShareTrip</p>
        </div>
        <figure class="cover__photo">
          <img src="../img/portrait-match.jpg" alt="Abdullah Sarwar in a Manchester United shirt" width="480" height="600">
        </figure>
      </div>
      <div class="cover__bar cover__bar--foot"><span>Manchester United supporter</span><span>Price: free</span></div>
    </header>

    <main id="main">
      <!-- ===== Workday only ===== -->
      <section class="row only-work" aria-labelledby="work-h">
        <h2 class="label" id="work-h">Selected work</h2>
        <div class="content">
          <article class="case">
            <p class="case__kicker">ShareTrip · Bookings</p>
            <h3 class="case__title">Making booking retries safe</h3>
            <dl class="case__facts">
              <dt>Problem</dt><dd>Booking requests can arrive more than once, after a timeout or a repeated tap. A repeat must not take another room.</dd>
              <dt>What we did</dt><dd>We use the booking identifier to recognise repeats. A MySQL named lock orders work on the same booking, and a transaction groups the database changes. Cancellation follows the same rules.</dd>
              <dt>Result</dt><dd>A repeated submit returns the existing booking, and inventory changes once. <span class="todo">Add a measured result if you have one</span></dd>
            </dl>
            <a class="link case__more" href="../blog/making-booking-retries-safe.html">Read the write-up <span class="arrow" aria-hidden="true">→</span></a>
          </article>
          <article class="case">
            <p class="case__kicker">ShareTrip · Hotel search</p>
            <h3 class="case__title">Speeding up hotel search</h3>
            <dl class="case__facts">
              <dt>Problem</dt><dd>Search processed hotel IDs in chunks, one after another, so later chunks waited for earlier ones.</dd>
              <dt>What we did</dt><dd>The search returns a session at once and fills it in the background. Chunks run concurrently within a bound, smaller early chunks bring first results sooner, and shared counts update atomically.</dd>
              <dt>Result</dt><dd>Results appear while the rest of the search continues. <span class="todo">Add a measured result if you have one</span></dd>
            </dl>
            <a class="link case__more" href="../blog/optimizing-hotel-search-performance.html">Read the write-up <span class="arrow" aria-hidden="true">→</span></a>
          </article>
          <article class="case">
            <p class="case__kicker">ShareTrip · Public API team</p>
            <h3 class="case__title">Leading the Public API services</h3>
            <dl class="case__facts">
              <dt>Scope</dt><dd>Public gateways, flights, hotels, lifestyle (e-commerce, utility bill payment, mobile recharge), visa, and holiday.</dd>
              <dt>What we do</dt><dd>Business logic and engineering for each domain, hotel supplier integrations, and the public API documentation.</dd>
              <dt>Result</dt><dd><span class="todo">Add team size, scale, or an outcome you can share</span></dd>
            </dl>
            <a class="link case__more" href="../portfolio.html">More about this work <span class="arrow" aria-hidden="true">→</span></a>
          </article>
        </div>
      </section>

      <section class="row only-work" aria-labelledby="xp-h">
        <h2 class="label" id="xp-h">Experience</h2>
        <div class="content">
          <ol class="list list--first xp">
            <li><span class="list__main"><strong>Senior Software Engineer</strong> <span class="muted">· ShareTrip · Public API lead</span></span><span class="list__meta">Nov 2022 – now</span></li>
            <li><span class="list__main"><strong>Consultant Backend Engineer</strong> <span class="muted">· Talvette · part-time</span></span><span class="list__meta">May – Dec 2024</span></li>
            <li><span class="list__main"><strong>Software Engineer</strong> <span class="muted">· mPower Social Enterprise</span></span><span class="list__meta">May 2020 – Oct 2021</span></li>
            <li><span class="list__main"><strong>Software Engineer</strong> <span class="muted">· Early Advantage Bangladesh</span></span><span class="list__meta">Jul 2020 – Apr 2021</span></li>
            <li><span class="list__main"><strong>Software Engineer</strong> <span class="muted">· Alter F4</span></span><span class="list__meta">Jan – Jul 2020</span></li>
            <li><span class="list__main"><strong>BSc, Computer Science and Engineering</strong> <span class="muted">· North South University</span></span><span class="list__meta">Education</span></li>
          </ol>
          <p class="xp__stack"><span>Works with</span> Node.js · NestJS · Express · Python · PostgreSQL · MySQL · MongoDB · Redis · RabbitMQ · Grafana · Loki</p>
        </div>
      </section>

      <!-- ===== Matchday only ===== -->
      <section class="row only-match" aria-labelledby="notes-h">
        <h2 class="label" id="notes-h">Manager's notes</h2>
        <div class="content">
          <p class="lead notes">Manchester United supporter, Dhaka. <span class="todo">Write two or three lines in your own words: what football means to you, where you play</span></p>
        </div>
      </section>

      <section class="row only-match" aria-labelledby="sheet-h">
        <h2 class="label" id="sheet-h">Team sheet</h2>
        <div class="content">
          {sheet.strip()}
        </div>
      </section>

      <section class="row only-match" aria-labelledby="fix-h">
        <h2 class="label" id="fix-h">Fixtures</h2>
        <div class="content">
          <table class="fixtures">
            <caption class="sr-only">Career as a season of fixtures</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Club</th><th scope="col">Position</th><th scope="col">Status</th></tr></thead>
            <tbody>
              <tr><td>Nov 2022 –</td><th scope="row">ShareTrip</th><td>Senior Software Engineer · Public API lead</td><td><span class="res res--live">Live</span></td></tr>
              <tr><td>May – Dec 2024</td><th scope="row">Talvette</th><td>Consultant Backend Engineer · part-time loan</td><td><span class="res">FT</span></td></tr>
              <tr><td>May 2020 – Oct 2021</td><th scope="row">mPower</th><td>Software Engineer</td><td><span class="res">FT</span></td></tr>
              <tr><td>Jul 2020 – Apr 2021</td><th scope="row">Early Advantage</th><td>Software Engineer</td><td><span class="res">FT</span></td></tr>
              <tr><td>Jan – Jul 2020</td><th scope="row">Alter F4</th><td>Software Engineer</td><td><span class="res">FT</span></td></tr>
              <tr><td>Youth</td><th scope="row">North South University</th><td>BSc, Computer Science and Engineering</td><td><span class="res">Academy</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="row only-match" aria-labelledby="hl-h">
        <h2 class="label" id="hl-h">Highlights</h2>
        <div class="content">
          {cross.strip()}
        </div>
      </section>

      <!-- ===== Both modes: labels and styling change with the mode ===== -->
{shared}    </main>

    <footer class="foot">
      <p><a class="link" href="../blog/index.html">Writing</a> · <a class="link" href="../portfolio.html">Work</a> · <a class="link" href="../publications.html">Research</a></p>
      <p>Preview v2 · <a class="link" href="../index.html">Compare with v1</a></p>
    </footer>
  </div>

  <script src="../main.js"></script>
</body>
</html>
'''
(root / 'v2' / 'index.html').write_text(page)
print('written', len(page))
