// v3 extras, loaded after ../main.js: in-page mode links, the Matchday story bar,
// parts that arrive on scroll, the team walk-out order and substitutions.
var siteBase = new URL('.', document.currentScript.src).href;
(function () {
  var root = document.documentElement;
  var osReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Calm stops automatic motion. The demos still move when they are pressed, unless the system asks for less motion.
  var reduce = osReduce || root.classList.contains('calm');
  var toggle = document.getElementById('mode-switch');

  // The mode-change motion (page slide, portrait turn) starts with the first use of the switch.
  if (toggle) toggle.addEventListener('click', function () {
    root.classList.add('switched');
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  // In-page links use the same switch as the header, then return to the top.
  document.querySelectorAll('[data-swap]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (toggle) toggle.click();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // ---------- Parts arrive as they are reached ----------
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(function (el) { revealer.observe(el); });
  }

  // Run fn once, the first time el is mostly on screen.
  function onSeen(el, fn, amount) {
    if (!el) return;
    if (reduce || !('IntersectionObserver' in window)) { fn(true); return; }
    var seen = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      seen.disconnect();
      fn(false);
    }, { threshold: amount || 0.6 });
    seen.observe(el);
  }

  // ---------- Team sheet: walk-out, player notes, substitutions, formation ----------
  var sheet = document.querySelector('.sheet');
  var players = Array.prototype.slice.call(document.querySelectorAll('.sheet .pl'));
  var note = document.querySelector('.sheet__note');
  var why = {
    'Grafana': 'Sees everything first.',
    'MongoDB': 'Flexible. Takes any shape.',
    'Postgres': 'Never out of position.',
    'MySQL': 'Holds the line under load.',
    'Redis': 'The fastest player in the side.',
    'RabbitMQ': 'Every pass goes through it.',
    'Loki': 'Remembers every touch.',
    'Raw SQL': 'Plays the direct ball.',
    'Cron jobs': 'Always arrives on time.',
    'AI agents': 'Drop deep and set up the finish.',
    'NestJS': 'Finishes the move.',
    'TypeScript': 'Keeps every pass accurate.',
    'TypeORM': 'Comes on when the direct ball is not needed.',
    'Typesense': 'Finds space nobody else can.',
    'MCP': 'Links the play with the AI agents.',
    'Express': 'Light and quick off the bench.'
  };

  function showNote(player) {
    if (!note) return;
    var name = player.dataset.name;
    players.forEach(function (pl) { pl.classList.toggle('is-on', pl === player); });
    note.textContent = '';
    var strong = document.createElement('b');
    strong.textContent = name;
    note.appendChild(strong);
    note.appendChild(document.createTextNode(' · ' + (why[name] || '')));
    note.classList.remove('swap-in');
    void note.offsetWidth;
    note.classList.add('swap-in');
  }

  players.forEach(function (pl, i) {
    pl.style.setProperty('--i', i);
    pl.tabIndex = 0;
    pl.setAttribute('role', 'button');
    pl.addEventListener('click', function () { showNote(pl); });
    pl.addEventListener('mouseenter', function () { showNote(pl); });
    pl.addEventListener('focus', function () { showNote(pl); });
    pl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showNote(pl); } });
  });

  // When the last player has walked out, plain left/top take over so a formation change can move the dots.
  if (sheet && players.length) {
    players[players.length - 1].addEventListener('animationend', function (e) {
      if (e.animationName === 'walk-out') sheet.classList.add('walked');
    });
  }

  var board = document.querySelector('.subboard');
  document.querySelectorAll('.sub').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var goingOff = btn.dataset.for;
      var comingOn = btn.textContent;
      var player = players.filter(function (pl) { return pl.dataset.name === goingOff; })[0];
      if (!player) return;
      player.textContent = comingOn;
      player.dataset.name = comingOn;
      btn.textContent = goingOff;
      btn.dataset.for = comingOn;
      player.classList.remove('pl--in');
      void player.offsetWidth;
      player.classList.add('pl--in');
      showNote(player);
      if (board) {
        board.hidden = false;
        board.querySelector('.subboard__off').textContent = 'Off · ' + goingOff;
        board.querySelector('.subboard__on').textContent = 'On · ' + comingOn;
        board.classList.remove('flip');
        void board.offsetWidth;
        board.classList.add('flip');
      }
    });
  });

  var formation = document.querySelector('.formation');
  var caption = document.querySelector('.sheet__caption');
  if (formation && sheet) {
    var shape = 'a';
    formation.addEventListener('click', function () {
      shape = shape === 'a' ? 'b' : 'a';
      sheet.classList.add('walked');
      players.forEach(function (pl) {
        var spot = pl.dataset[shape].split(';');
        pl.style.left = spot[0] + '%';
        pl.style.top = spot[1] + '%';
      });
      formation.textContent = (shape === 'a' ? '4-4-1-1' : '4-3-3') + ' ⇄';
      if (caption) caption.textContent = caption.dataset[shape];
    });
  }

  // ---------- Luggage tag: copy the email ----------
  var tag = document.querySelector('.tag[data-copy]');
  if (tag && navigator.clipboard && navigator.clipboard.writeText) {
    tag.addEventListener('click', function (e) {
      e.preventDefault();
      navigator.clipboard.writeText(tag.dataset.copy).then(function () {
        tag.classList.remove('copied');
        void tag.offsetWidth;
        tag.classList.add('copied');
        var status = document.getElementById('copy-status');
        if (status) status.textContent = 'Email address copied.';
      }, function () { location.href = tag.href; });
    });
  } else {
    var hint = document.querySelector('.tag__hint');
    if (hint) hint.hidden = true; // No clipboard here: the tag stays a plain email link.
  }

  // ---------- A query types itself ----------
  var sql = document.querySelector('.sqlbox');
  if (sql && !reduce) {
    var code = sql.querySelector('code');
    var full = code.textContent;
    code.textContent = '';
    sql.classList.add('waiting');
    onSeen(sql, function () {
      sql.classList.remove('waiting');
      sql.classList.add('typing');
      var at = 0;
      var typer = setInterval(function () {
        at += 1;
        code.textContent = full.slice(0, at);
        if (at >= full.length) {
          clearInterval(typer);
          setTimeout(function () { sql.classList.remove('typing'); sql.classList.add('typed'); }, 450);
        }
      }, 11);
    });
  }

  // ---------- Full time: the clock runs out, then stops ----------
  var ft = document.querySelector('.ftboard');
  if (ft) {
    var ftClock = ft.querySelector('.ftboard__clock');
    onSeen(ft, function (instant) {
      ft.classList.add('play');
      if (instant) { ft.classList.add('done'); return; }
      var started = performance.now();
      (function tick(now) {
        var t = (now - started) / 1400;
        if (t >= 1) { ftClock.textContent = '90+3′'; ft.classList.add('done'); fergieTime(); return; }
        var secs = 160 + Math.floor(t * 20); // 92:40 to 92:59
        ftClock.textContent = '92:' + String(secs - 120).padStart(2, '0');
        requestAnimationFrame(tick);
      })(started);
    }, 0.9);
  }

  // Fergie time: while the board stays on screen, the clock keeps adding minutes. At 90+6 a late goal goes in.
  function fergieTime() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var added = 3;
    var onScreen = true;
    var addboard = document.querySelector('.addboard');
    var ftScore = ft.querySelector('.ftboard__score');
    var chapterMin = document.querySelector('#full-time .chapter__min');
    new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; }).observe(ft);
    function bump(el) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
    var timer = setInterval(function () {
      if (!onScreen || document.hidden || root.dataset.mode !== 'match') return;
      added += 1;
      ftClock.textContent = '90+' + added + '′';
      bump(ftClock);
      if (addboard) addboard.textContent = '+' + added;
      if (chapterMin) chapterMin.textContent = '90+' + added + '′';
      if (added < 6) return;
      clearInterval(timer);
      ftScore.textContent = '2–0';
      bump(ftScore);
      var tag = document.createElement('span');
      tag.className = 'ftboard__fergie';
      tag.textContent = 'Fergie time';
      ft.appendChild(tag);
      ft.setAttribute('aria-label', 'Full time. Two nil. A late goal in Fergie time, ninety plus six minutes.');
    }, 4000);
  }

  // ---------- Articles: reading progress ----------
  var article = document.querySelector('.post__body');
  if (article) {
    var bar = document.createElement('div');
    bar.className = 'read-bar';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var leftEl = document.querySelector('.toc__left');
    var minutes = leftEl ? Number(leftEl.dataset.minutes) || 0 : 0;
    var readQueued = false;
    var readUpdate = function () {
      readQueued = false;
      var box = article.getBoundingClientRect();
      var span = box.height - window.innerHeight * 0.6;
      var done = span > 0 ? Math.min(1, Math.max(0, -box.top / span)) : 1;
      bar.style.setProperty('--read', done);
      if (leftEl) {
        var left = Math.ceil(minutes * (1 - done));
        leftEl.textContent = done >= 1 ? 'Finished' : left + ' min left';
      }
    };
    window.addEventListener('scroll', function () { if (!readQueued) { readQueued = true; requestAnimationFrame(readUpdate); } }, { passive: true });
    readUpdate();
  }

  // ---------- Work page: career timeline ----------
  document.querySelectorAll('[data-timeline]').forEach(function (timeline) {
    var stops = Array.prototype.slice.call(timeline.querySelectorAll('[role="tab"]'));
    var panels = stops.map(function (stop) { return document.getElementById(stop.getAttribute('aria-controls')); });
    function choose(index, animate) {
      stops.forEach(function (stop, i) {
        var on = i === index;
        stop.setAttribute('aria-selected', String(on));
        stop.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
        panels[i].classList.toggle('swap-in', on && animate);
      });
    }
    stops.forEach(function (stop, i) {
      stop.addEventListener('click', function () { choose(i, true); });
      stop.addEventListener('keydown', function (e) {
        var to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (to < 0 || to >= stops.length) return;
        e.preventDefault();
        choose(to, true);
        stops[to].focus();
      });
    });
    var start = stops.map(function (stop) { return stop.getAttribute('aria-selected'); }).indexOf('true');
    choose(start < 0 ? stops.length - 1 : start, false);
  });

  // ---------- Matchday kits: the theme button swaps home and away ----------
  var kitBtn = document.getElementById('theme-toggle');
  function nameKit() {
    if (!kitBtn) return;
    var match = root.dataset.mode === 'match';
    var light = root.dataset.theme === 'light';
    kitBtn.title = match ? (light ? 'Away kit, by day. Switch to the home kit.' : 'Home kit, at night. Switch to the away kit.') : (light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  if (kitBtn) kitBtn.addEventListener('click', function () { setTimeout(nameKit, 0); });
  document.addEventListener('modechange', nameKit);
  nameKit();

  // ---------- Instant page changes: load a page of this site when its link is hovered ----------
  if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
    var rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({ prefetch: [{ where: { selector_matches: 'a[href$=".html"], a[href*=".html?"], a[href*=".html#"]' }, eagerness: 'moderate' }] });
    document.head.appendChild(rules);
  }

  // ---------- Back to the top ----------
  var toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Back to the top');
  toTop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  document.body.appendChild(toTop);
  window.addEventListener('scroll', function () { toTop.classList.toggle('show', window.scrollY > window.innerHeight * 1.2); }, { passive: true });

  // ---------- Jump menu: Ctrl+K, or the button in the header ----------
  var places = [
    ['Home', 'index.html', 'Page'], ['Work', 'portfolio.html', 'Page'], ['Writing', 'blog/index.html', 'Page'],
    ['Research', 'publications.html', 'Page'], ['How I work with AI agents', 'agents.html', 'Page'], ['Uses', 'uses.html', 'Page'],
    ['Workday', 'index.html?mode=work', 'Mode'], ['Matchday', 'index.html?mode=match', 'Mode'],
    ['Selected work', 'index.html?mode=work#work', 'Section'], ['Experience', 'index.html?mode=work#experience', 'Section'],
    ['Projects', 'index.html?mode=work#projects', 'Section'], ['Toolkit', 'index.html?mode=work#toolkit', 'Section'], ['Contact', 'index.html?mode=work#contact', 'Section'],
    ['Team sheet', 'index.html?mode=match#half-time', 'Section'],
    ['Making Booking Retries Safe', 'blog/making-booking-retries-safe.html', 'Essay'],
    ['Speeding Up Hotel Search with Concurrent Chunks', 'blog/optimizing-hotel-search-performance.html', 'Essay']
  ];
  var jump = document.createElement('dialog');
  jump.className = 'jump';
  jump.setAttribute('aria-label', 'Jump to a page or section');
  jump.innerHTML = '<input type="text" placeholder="Search or jump to…" aria-label="Search pages, essays, headings and notes" autocomplete="off" spellcheck="false"><ul></ul><p class="jump__hint">Searches pages, essays, headings and notes</p>';
  document.body.appendChild(jump);
  var jumpInput = jump.querySelector('input');
  var jumpList = jump.querySelector('ul');
  var active = 0;

  // The index of essay titles, headings and notes is written by the build script. It loads on first use.
  var indexAsked = false, indexReady = false;
  function loadIndex() {
    if (indexAsked) return;
    indexAsked = true;
    var tag = document.createElement('script');
    tag.src = siteBase + 'search-index.js';
    tag.onload = function () {
      indexReady = true;
      var have = {};
      places.forEach(function (p) { have[p[1]] = true; });
      (window.SITE_INDEX || []).forEach(function (p) { if (!have[p[1]]) { have[p[1]] = true; places.push(p); } });
      if (jump.open) drawJump();
    };
    document.head.appendChild(tag);
  }

  function drawJump() {
    var words = jumpInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var found = places.filter(function (p) {
      var text = (p[0] + ' ' + p[2] + ' ' + (p[3] || '')).toLowerCase();
      return words.every(function (w) { return text.indexOf(w) !== -1; });
    });
    if (!words.length) found = found.filter(function (p) { return !p[3]; }); // a short list until the visitor types
    found = found.slice(0, 14);
    jumpList.textContent = '';
    if (!found.length) {
      var none = document.createElement('li');
      none.className = 'jump__empty';
      none.textContent = 'Nothing matches.';
      jumpList.appendChild(none);
      return;
    }
    active = Math.min(active, found.length - 1);
    found.forEach(function (p, i) {
      var li = document.createElement('li');
      var link = document.createElement('a');
      var kind = document.createElement('small');
      var label = document.createElement('span');
      link.href = siteBase + p[1];
      label.textContent = p[0];
      if (p[3]) { var where = document.createElement('em'); where.textContent = p[3]; label.appendChild(where); }
      link.appendChild(label);
      kind.textContent = p[2];
      link.appendChild(kind);
      if (i === active) link.className = 'is-active';
      li.appendChild(link);
      jumpList.appendChild(li);
    });
  }
  function openJump() {
    if (!jump.showModal || jump.open) return;
    loadIndex();
    jumpInput.value = '';
    active = 0;
    drawJump();
    jump.showModal();
  }
  jumpInput.addEventListener('input', function () { active = 0; drawJump(); });
  jumpInput.addEventListener('keydown', function (e) {
    var count = jumpList.querySelectorAll('a').length;
    if (e.key === 'ArrowDown' && count) { e.preventDefault(); active = (active + 1) % count; drawJump(); }
    else if (e.key === 'ArrowUp' && count) { e.preventDefault(); active = (active - 1 + count) % count; drawJump(); }
    else if (e.key === 'Enter') { var go = jumpList.querySelector('a.is-active'); if (go) { e.preventDefault(); go.click(); } }
  });
  jump.addEventListener('click', function (e) { if (e.target === jump) jump.close(); }); // a click on the backdrop
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (jump.open) jump.close(); else openJump(); }
  });
  var controls = document.querySelector('.controls');
  if (controls && jump.showModal) {
    var jumpBtn = document.createElement('button');
    jumpBtn.type = 'button';
    jumpBtn.className = 'jump-btn';
    jumpBtn.setAttribute('aria-label', 'Jump to a page or section (Ctrl K)');
    jumpBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><span>Ctrl K</span>';
    jumpBtn.addEventListener('click', openJump);
    var themeBtn = controls.querySelector('.theme-btn');
    controls.insertBefore(jumpBtn, themeBtn || null);
  }

  // ---------- Demo: send the same booking request many times ----------
  document.querySelectorAll('[data-retry-demo]').forEach(function (demo) {
    demo.hidden = false;
    var send = demo.querySelector('.demo__btn');
    var protect = demo.querySelector('input');
    var lane = demo.querySelector('.demo__lane');
    var log = demo.querySelector('.demo__log');
    var out = {};
    demo.querySelectorAll('[data-n]').forEach(function (dd) { out[dd.dataset.n] = dd; });
    var state;
    function show(key, bad) {
      var dd = out[key];
      if (dd.textContent !== String(state[key])) { dd.classList.remove('bump'); void dd.offsetWidth; dd.classList.add('bump'); }
      dd.textContent = state[key];
      dd.classList.toggle('is-bad', !!bad);
    }
    function reset(message) {
      state = { req: 0, book: 0, rooms: 5 };
      ['req', 'book', 'rooms'].forEach(function (k) { out[k].textContent = state[k]; out[k].classList.remove('is-bad', 'bump'); });
      demo.classList.toggle('is-off', !protect.checked);
      send.disabled = false;
      log.textContent = message || 'Press the button more than once.';
    }
    function dot(kind) {
      if (osReduce) return;
      var d = document.createElement('span');
      d.className = 'demo__dot demo__dot--' + kind;
      d.addEventListener('animationend', function () { d.remove(); });
      lane.appendChild(d);
    }
    send.addEventListener('click', function () {
      state.req += 1;
      var n = state.req;
      if (protect.checked) {
        if (state.book === 0) {
          state.book = 1; state.rooms -= 1;
          dot('pass');
          log.textContent = 'Request ' + n + ': a new booking. One room is taken.';
        } else {
          dot('back');
          log.textContent = 'Request ' + n + ': the same booking identifier. The existing booking is returned. No room is taken.';
        }
        show('req'); show('book'); show('rooms');
      } else {
        state.book += 1; state.rooms -= 1;
        dot(n > 1 ? 'bad' : 'pass');
        log.textContent = n > 1 ? 'Request ' + n + ': treated as new. Another room is taken for the same customer.' : 'Request ' + n + ': a new booking. One room is taken.';
        if (state.rooms === 0) { send.disabled = true; log.textContent += ' No rooms are left.'; }
        show('req'); show('book', state.book > 1); show('rooms', state.book > 1);
      }
    });
    protect.addEventListener('change', function () {
      reset(protect.checked ? 'Repeats are recognised again. Press the button more than once.' : 'Now repeats are not recognised. Press the button more than once.');
    });
    demo.querySelector('.demo__reset').addEventListener('click', function () { reset(); });
    reset();
  });

  // ---------- Demo: the same chunks on two schedules ----------
  document.querySelectorAll('[data-race]').forEach(function (race) {
    race.hidden = false;
    var run = race.querySelector('.demo__btn');
    var log = race.querySelector('.demo__log');
    var lanes = Array.prototype.slice.call(race.querySelectorAll('.race__lane'));
    var timers = [];
    function flag(lane, text) { lane.querySelector('b').textContent = text; }
    function finish() {
      race.classList.remove('run');
      race.classList.add('ran');
      run.disabled = false;
      run.textContent = 'Run it again';
      log.textContent = 'The second schedule shows first results sooner, and it finishes sooner.';
    }
    run.addEventListener('click', function () {
      timers.forEach(clearTimeout);
      timers = [];
      race.classList.remove('run', 'ran');
      lanes.forEach(function (lane) { flag(lane, ''); });
      if (osReduce) { lanes.forEach(function (lane) { flag(lane, 'done'); }); finish(); return; }
      void race.offsetWidth;
      race.classList.add('run');
      run.disabled = true;
      log.textContent = 'Searching…';
      var last = 0;
      lanes.forEach(function (lane) {
        var first = Number(lane.dataset.first);
        var done = Number(lane.dataset.done);
        last = Math.max(last, done);
        timers.push(setTimeout(function () { flag(lane, 'first results'); }, first));
        timers.push(setTimeout(function () { flag(lane, 'done'); }, done));
      });
      timers.push(setTimeout(finish, last + 150));
    });
    race.querySelector('.demo__reset').addEventListener('click', function () {
      timers.forEach(clearTimeout);
      timers = [];
      race.classList.remove('run', 'ran');
      lanes.forEach(function (lane) { flag(lane, ''); });
      run.disabled = false;
      run.textContent = 'Run the search';
      log.textContent = 'Each bar is one chunk of hotel IDs. The timings are not measured.';
    });
  });

  // ---------- Toolkit: a tool shows where it was used ----------
  var usedIn = {
    'MySQL': [['Case: booking retries', 'index.html?mode=work#case-retries'], ['Essay: Making Booking Retries Safe', 'blog/making-booking-retries-safe.html']],
    'PostgreSQL': [['Guide: PostgreSQL on WSL', 'blog/setting-up-postgresql-on-wsl.html'], ['My setup', 'uses.html']],
    'MongoDB': [['Case: hotel search', 'index.html?mode=work#case-search'], ['Essay: Speeding Up Hotel Search', 'blog/optimizing-hotel-search-performance.html#count-race']],
    'Node.js': [['Essay: Speeding Up Hotel Search', 'blog/optimizing-hotel-search-performance.html']],
    'RabbitMQ': [['Case: the Public API team', 'index.html?mode=work#case-team']],
    'Grafana': [['Case: the Public API team', 'index.html?mode=work#case-team'], ['My setup', 'uses.html']],
    'Loki': [['Case: the Public API team', 'index.html?mode=work#case-team'], ['My setup', 'uses.html']],
    'Redis': [['My setup', 'uses.html']],
    'NestJS': [['My setup', 'uses.html']],
    'Claude Code': [['How I work with AI agents', 'agents.html'], ['My setup', 'uses.html']],
    'Codex': [['How I work with AI agents', 'agents.html'], ['My setup', 'uses.html']],
    'T3 Code': [['How I work with AI agents', 'agents.html'], ['My setup', 'uses.html']]
  };
  var kit = document.querySelector('.kit--work');
  var usedBox = document.getElementById('kit-used');
  if (kit && usedBox) {
    var toolButtons = {};
    var showTool = function (name, animate) {
      var uses = usedIn[name];
      if (!uses) return;
      Object.keys(toolButtons).forEach(function (key) { toolButtons[key].setAttribute('aria-pressed', String(key === name)); });
      usedBox.textContent = '';
      var head = document.createElement('b');
      head.textContent = name + ' · used in';
      usedBox.appendChild(head);
      uses.forEach(function (use) {
        var a = document.createElement('a');
        a.className = 'link';
        a.href = siteBase + use[1];
        a.textContent = use[0];
        usedBox.appendChild(a);
      });
      usedBox.hidden = false;
      if (animate) { usedBox.classList.remove('swap-in'); void usedBox.offsetWidth; usedBox.classList.add('swap-in'); }
    };
    // Each known tool name in the list becomes a button. Text nodes only, so the row labels stay as they are.
    var names = Object.keys(usedIn).sort(function (a, b) { return b.length - a.length; });
    kit.querySelectorAll('p').forEach(function (row) {
      Array.prototype.slice.call(row.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) return;
        var parts = [node.textContent];
        names.forEach(function (name) {
          var next = [];
          parts.forEach(function (part) {
            if (typeof part !== 'string') { next.push(part); return; }
            var at = part.indexOf(name);
            if (at === -1) { next.push(part); return; }
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool';
            btn.textContent = name;
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('aria-controls', 'kit-used');
            btn.addEventListener('click', function () { showTool(name, true); });
            toolButtons[name] = btn;
            next.push(part.slice(0, at), btn, part.slice(at + name.length));
          });
          parts = next;
        });
        if (parts.length === 1) return;
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) { frag.appendChild(typeof part === 'string' ? document.createTextNode(part) : part); });
        row.replaceChild(frag, node);
      });
    });
    var asked = new URLSearchParams(location.search).get('tool');
    if (asked && usedIn[asked]) showTool(asked, false);
  }

  // A link that lands on a case or a note marks it for a moment.
  function markTarget() {
    var el = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (!el || !(el.classList.contains('case') || el.classList.contains('note'))) return;
    el.classList.remove('is-target');
    void el.offsetWidth;
    el.classList.add('is-target');
  }
  window.addEventListener('hashchange', markTarget);
  markTarget();

  // ---------- Essay covers draw again when the pointer or the focus reaches them ----------
  document.querySelectorAll('.essay-card').forEach(function (card) {
    var cover = card.querySelector('.scene-observe');
    if (!cover || reduce) return;
    var redraw = function () {
      if (!cover.classList.contains('play')) return; // the first run belongs to the scroll observer
      cover.classList.remove('play');
      void cover.offsetWidth;
      cover.classList.add('play');
    };
    card.addEventListener('mouseenter', redraw);
    card.addEventListener('focus', redraw);
  });

  // ---------- The switch: floodlights for Matchday at night, daylight otherwise ----------
  if (toggle && !reduce) {
    var lights = document.createElement('div');
    lights.className = 'switch-lights';
    lights.setAttribute('aria-hidden', 'true');
    lights.innerHTML = '<i></i><i></i>';
    document.body.appendChild(lights);
    var firstMode = true;
    document.addEventListener('modechange', function () {
      if (firstMode || reduce) return;
      var night = root.dataset.mode === 'match' && root.dataset.theme !== 'light';
      lights.classList.remove('night', 'day');
      void lights.offsetWidth;
      lights.classList.add(night ? 'night' : 'day');
    });
    setTimeout(function () { firstMode = false; }, 0);
  }

  // ---------- Demo frame: every demo has a main button, a reset and a log line in the same places ----------
  function demoParts(demo) {
    demo.hidden = false;
    return { main: demo.querySelector('.demo__btn'), reset: demo.querySelector('.demo__reset'), log: demo.querySelector('.demo__log'), stage: demo.querySelector('.demo__stage') };
  }

  // ---------- Demo: one shared bucket, or one bucket for each caller ----------
  document.querySelectorAll('[data-rate-demo]').forEach(function (demo) {
    var ui = demoParts(demo);
    var slider = demo.querySelector('input[type="range"]');
    var out = demo.querySelector('output');
    var rows = Array.prototype.slice.call(demo.querySelectorAll('.rate__rows li'));
    var SHARED = 15, OWN = 5, SCALE = 30;
    var own = false;
    function draw() {
      var busy = Number(slider.value);
      out.textContent = busy + '/s';
      var asked = rows.map(function (row) { return row.dataset.req === 'busy' ? busy : Number(row.dataset.req); });
      var total = asked.reduce(function (a, b) { return a + b; }, 0);
      var bounced = 0;
      rows.forEach(function (row, i) {
        var pass = own ? Math.min(asked[i], OWN) : (total <= SHARED ? asked[i] : Math.floor(asked[i] * SHARED / total));
        var bounce = asked[i] - pass;
        if (i > 0) bounced += bounce;
        row.querySelector('b').style.width = (pass / SCALE * 100) + '%';
        row.querySelector('em').style.width = (bounce / SCALE * 100) + '%';
        row.querySelector('small').textContent = bounce ? pass + ' pass · ' + bounce + ' bounce' : pass + ' pass';
        row.classList.toggle('is-bad', bounce > 0);
      });
      ui.main.setAttribute('aria-pressed', String(own));
      ui.main.textContent = own ? 'Go back to one shared bucket' : 'Give each caller its own bucket';
      var over = own ? busy > OWN : total > SHARED;
      ui.log.textContent = own
        ? (over ? 'Each caller has a bucket of ' + OWN + ' per second. Only the busy caller bounces.' : 'Each caller has a bucket of ' + OWN + ' per second. Nobody bounces.')
        : (over ? 'One bucket of ' + SHARED + ' per second for everyone. ' + (bounced ? 'The normal callers bounce too.' : 'The busy caller bounces.') : 'One bucket of ' + SHARED + ' per second for everyone. The traffic fits, for now.');
    }
    slider.addEventListener('input', draw);
    ui.main.addEventListener('click', function () { own = !own; draw(); });
    ui.reset.addEventListener('click', function () { own = false; slider.value = 18; draw(); });
    demo.setRateMode = function (mode) { own = mode === 'own'; draw(); };
    draw();
  });

  // ---------- Demo: count the round trips ----------
  document.querySelectorAll('[data-trips-demo]').forEach(function (demo) {
    var ui = demoParts(demo);
    var count = demo.querySelector('.trips__count b');
    var cells = Array.prototype.slice.call(demo.querySelectorAll('.trips__rows li'));
    var opts = {};
    demo.querySelectorAll('[data-opt]').forEach(function (box) { opts[box.dataset.opt] = box; });
    var timer = null;
    function clear(message) {
      clearInterval(timer);
      count.textContent = '0';
      cells.forEach(function (cell) { cell.className = ''; });
      ui.main.disabled = false;
      if (message) ui.log.textContent = message;
    }
    ui.main.addEventListener('click', function () {
      clear();
      var rowsN = cells.length;
      var steps = [];
      if (opts.batch.checked) steps.push({ all: true, cls: 'saved' });
      else cells.forEach(function (c, i) { steps.push({ i: i, cls: 'saved' }); });
      if (!opts.reuse.checked) cells.forEach(function (c, i) { steps.push({ i: i, cls: 'loaded' }); });
      var saves = opts.batch.checked ? 1 : rowsN;
      var loads = opts.reuse.checked ? 0 : rowsN;
      var done = 0;
      ui.main.disabled = true;
      var apply = function (step) {
        (step.all ? cells : [cells[step.i]]).forEach(function (cell) { cell.classList.add(step.cls); });
        done += 1;
        count.textContent = done;
      };
      var end = function () {
        clearInterval(timer);
        cells.forEach(function (cell) { cell.classList.add('saved'); });
        ui.main.disabled = false;
        ui.log.textContent = saves + (saves === 1 ? ' save' : ' saves') + ' and ' + loads + (loads === 1 ? ' reload' : ' reloads') + ' make ' + (saves + loads) + (saves + loads === 1 ? ' round trip.' : ' round trips.') + (saves + loads > 1 ? ' Tick a box and press Book again.' : '');
      };
      if (osReduce) { steps.forEach(apply); end(); return; }
      timer = setInterval(function () { if (steps.length) apply(steps.shift()); if (!steps.length) end(); }, 170);
    });
    ui.reset.addEventListener('click', function () { opts.batch.checked = false; opts.reuse.checked = false; clear('One booking writes six rows. Press Book.'); });
  });

  // ---------- Demo: one request ID in the logs of four services ----------
  document.querySelectorAll('[data-trace-demo]').forEach(function (demo) {
    var ui = demoParts(demo);
    var boxes = Array.prototype.slice.call(demo.querySelectorAll('ol li'));
    var tag = demo.querySelector('.trace4__tag');
    var timers = [];
    function clear() {
      timers.forEach(clearTimeout); timers = [];
      boxes.forEach(function (box) { box.classList.remove('lit'); });
      tag.style.setProperty('--at', 0);
      tag.classList.remove('moving');
      ui.main.disabled = false;
    }
    ui.main.addEventListener('click', function () {
      clear();
      ui.main.disabled = true;
      tag.classList.add('moving');
      boxes.forEach(function (box, i) {
        timers.push(setTimeout(function () {
          tag.style.setProperty('--at', i);
          box.classList.add('lit');
          ui.log.textContent = 'Found in ' + box.querySelector('b').textContent + ': ' + box.querySelector('.hit').textContent;
          if (i === boxes.length - 1) { ui.main.disabled = false; ui.log.textContent = 'One search for req-7f3a finds four log lines, one in each service.'; }
        }, osReduce ? 0 : i * 650));
      });
    });
    ui.reset.addEventListener('click', function () { clear(); ui.log.textContent = 'Every service writes the same ID into its log line.'; });
  });

  // ---------- Demo: a queue name that kept its quotes ----------
  document.querySelectorAll('[data-quotes-demo]').forEach(function (demo) {
    var ui = demoParts(demo);
    var strip = demo.querySelector('input');
    var pile = demo.querySelector('[data-n="pile"]');
    var read = demo.querySelector('[data-n="read"]');
    var name = demo.querySelector('.quotes__name');
    var state = { pile: 0, read: 0 };
    var drain = null;
    function draw() {
      pile.textContent = state.pile;
      read.textContent = state.read;
      name.textContent = strip.checked ? 'bookings' : '"bookings"';
      demo.classList.toggle('is-fixed', strip.checked);
      demo.classList.toggle('has-pile', state.pile > 0);
    }
    ui.main.addEventListener('click', function () {
      if (strip.checked) { state.read += 1; ui.log.textContent = 'The publisher sends to bookings. The consumer reads the message.'; }
      else { state.pile += 1; ui.log.textContent = 'The publisher sends to "bookings", with the quotes. Nobody reads that queue. The consumer of bookings stays healthy and idle.'; }
      draw();
    });
    strip.addEventListener('change', function () {
      clearInterval(drain);
      draw();
      if (!strip.checked) { ui.log.textContent = 'The config value keeps its quote characters again.'; return; }
      ui.log.textContent = state.pile ? 'The quotes are stripped. The names match, and the pile drains.' : 'The quotes are stripped. The names match.';
      drain = setInterval(function () {
        if (!state.pile) { clearInterval(drain); return; }
        state.pile -= 1; state.read += 1; draw();
      }, osReduce ? 0 : 220);
    });
    ui.reset.addEventListener('click', function () { clearInterval(drain); state = { pile: 0, read: 0 }; strip.checked = false; draw(); ui.log.textContent = 'Publish a few messages.'; });
    draw();
  });

  // ---------- Demo: a broker change in three deploys ----------
  document.querySelectorAll('[data-deploys-demo]').forEach(function (demo) {
    var ui = demoParts(demo);
    var plugs = Array.prototype.slice.call(demo.querySelectorAll('.plugs i'));
    var steps = Array.prototype.slice.call(demo.querySelectorAll('.deploys__steps li'));
    var left = [9, 7, 5, 3];
    var say = ['Nine connections before the change.', 'Deploy 1: the new subscribers are bound. Seven connections stay.', 'Deploy 2: the publishers have moved. Five connections stay.', 'Deploy 3: the old transports are removed. Three connections stay.'];
    var at = 0;
    function draw() {
      plugs.forEach(function (plug, i) { plug.classList.toggle('out', i >= left[at]); });
      steps.forEach(function (step, i) { step.classList.toggle('done', i < at); step.classList.toggle('now', i === at); });
      ui.main.disabled = at === 3;
      ui.main.textContent = at === 3 ? 'All three deploys are done' : 'Next deploy';
      ui.log.textContent = say[at];
    }
    ui.main.addEventListener('click', function () { if (at < 3) { at += 1; draw(); } });
    ui.reset.addEventListener('click', function () { at = 0; draw(); });
    draw();
  });

  // ---------- Demo: the same 403 for a good signature and a bad one ----------
  document.querySelectorAll('[data-lamps-demo]').forEach(function (demo) {
    var ui = demoParts(demo);
    var key = demo.querySelector('input');
    var lamps = {};
    demo.querySelectorAll('[data-lamp]').forEach(function (lamp) { lamps[lamp.dataset.lamp] = lamp; });
    var timers = [];
    function set(name, cls, text) { var lamp = lamps[name]; lamp.className = 'lamp2 ' + cls; lamp.querySelector('em').textContent = text; }
    function clear() { timers.forEach(clearTimeout); timers = []; set('good', '', '–'); set('bad', '', '–'); set('key', '', '–'); ui.main.disabled = false; }
    ui.main.addEventListener('click', function () {
      clear();
      ui.main.disabled = true;
      var ok = key.checked;
      var wait = osReduce ? 0 : 500;
      timers.push(setTimeout(function () { set('good', ok ? 'green' : 'red', ok ? '200' : '403'); }, wait));
      timers.push(setTimeout(function () { set('bad', 'red', '403'); }, wait * 2));
      timers.push(setTimeout(function () {
        set('key', ok ? 'green' : 'red', ok ? 'yes' : 'no');
        ui.main.disabled = false;
        ui.log.textContent = ok
          ? 'The key is accepted, so the signature is checked. Good gives 200 and bad gives 403. Now the test proves something.'
          : 'Both requests give 403. The access key is rejected first, so the signature is never checked. This 403 proves nothing.';
      }, wait * 3.4));
    });
    key.addEventListener('change', function () { clear(); ui.log.textContent = 'Send both requests again.'; });
    ui.reset.addEventListener('click', function () { key.checked = false; clear(); ui.log.textContent = 'Send one request with a good signature and one with a bad signature.'; });
  });

  // ---------- Demo: a group table ranked by tie-break rules ----------
  document.querySelectorAll('[data-ladder-demo]').forEach(function (demo) {
    var ui = demoParts(demo);
    var teams = ['Falcons', 'Kites', 'Herons', 'Swifts'];
    var results = [[6, 4], [6, 2], [7, 5], [5, 7], [4, 6], [2, 6]];
    var pairs = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
    var start = [0, 1, 3, 0, 1, 2];   // three teams level on points, so the later rules decide
    var picked = start.slice();
    var matchBox = demo.querySelector('.ladder__matches');
    var table = demo.querySelector('.ladder__table');
    var rowEls = teams.map(function (name) {
      var li = document.createElement('li');
      li.innerHTML = '<b></b><span class="ladder__team"></span><span class="ladder__nums"></span><em></em>';
      li.querySelector('.ladder__team').textContent = name;
      table.appendChild(li);
      return li;
    });
    var buttons = pairs.map(function (pair, m) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ladder__match';
      btn.addEventListener('click', function () { picked[m] = (picked[m] + 1) % results.length; draw(true); });
      matchBox.appendChild(btn);
      return btn;
    });
    function rank() {
      var stat = teams.map(function (name, i) { return { i: i, pts: 0, wins: 0, won: 0, lost: 0 }; });
      var beat = {};
      pairs.forEach(function (pair, m) {
        var score = results[picked[m]];
        var a = stat[pair[0]], b = stat[pair[1]];
        a.won += score[0]; a.lost += score[1]; b.won += score[1]; b.lost += score[0];
        var winner = score[0] > score[1] ? a : b;
        winner.wins += 1; winner.pts += 1;
        beat[winner.i + '>' + (winner === a ? b.i : a.i)] = true;
      });
      stat.forEach(function (t) { t.gd = t.won - t.lost; });
      var byPts = {};
      stat.forEach(function (t) { (byPts[t.pts] = byPts[t.pts] || []).push(t); });
      var order = [];
      Object.keys(byPts).map(Number).sort(function (a, b) { return b - a; }).forEach(function (pts) {
        var group = byPts[pts];
        if (group.length === 1) { group[0].rule = 'Points'; }
        else if (group.length === 2) {
          if (beat[group[1].i + '>' + group[0].i]) group.reverse();
          group.forEach(function (t) { t.rule = 'Head-to-head'; });
        } else {
          group.sort(function (a, b) { return b.gd - a.gd || b.won - a.won || b.wins - a.wins; });
          group.forEach(function (t, k) {
            var other = group[k + 1] || group[k - 1];
            t.rule = t.gd !== other.gd ? 'Game difference' : t.won !== other.won ? 'Games won' : t.wins !== other.wins ? 'Wins' : 'Level on every rule';
          });
        }
        order = order.concat(group);
      });
      return order;
    }
    function draw(animate) {
      pairs.forEach(function (pair, m) {
        var score = results[picked[m]];
        buttons[m].textContent = teams[pair[0]] + ' ' + score[0] + '–' + score[1] + ' ' + teams[pair[1]];
      });
      var before = rowEls.map(function (el) { return el.getBoundingClientRect().top; });
      rank().forEach(function (t, place) {
        var el = rowEls[t.i];
        el.style.order = place;
        el.querySelector('b').textContent = place + 1;
        el.querySelector('.ladder__nums').textContent = t.pts + ' pts · ' + (t.gd > 0 ? '+' : '') + t.gd + ' · ' + t.won + ' games';
        el.querySelector('em').textContent = t.rule;
      });
      if (!animate || osReduce) return;
      rowEls.forEach(function (el, i) {     // slide each row from its old place to its new place
        var moved = before[i] - el.getBoundingClientRect().top;
        if (!moved) return;
        el.style.transition = 'none';
        el.style.transform = 'translateY(' + moved + 'px)';
        void el.offsetWidth;
        el.style.transition = '';
        el.style.transform = '';
      });
    }
    ui.main.addEventListener('click', function () { picked = picked.map(function () { return Math.floor(Math.random() * results.length); }); draw(true); ui.log.textContent = 'New results. The tag on each row names the rule that decided its place.'; });
    ui.reset.addEventListener('click', function () { picked = start.slice(); draw(true); ui.log.textContent = 'Press a match to change its score.'; });
    draw(false);
  });

  // ---------- Cases as steps: the current step is marked, and the diagram follows it ----------
  var cases = Array.prototype.slice.call(document.querySelectorAll('.case'));
  var stepCases = cases.map(function (el) {
    var steps = Array.prototype.slice.call(el.querySelectorAll('.case__facts dd'));
    steps.forEach(function (dd) { if (dd.previousElementSibling) dd.previousElementSibling.classList.add('step-label'); });
    return { el: el, steps: steps, cap: el.querySelector('.case__cap'), stage: el.querySelector('.case__stage'), rate: el.querySelector('[data-rate-demo]'), at: -1 };
  }).filter(function (c) { return c.steps.length; });
  var wideCases = window.matchMedia('(min-width: 1000px)');
  function setStep(c, index) {
    if (c.at === index) return;
    c.at = index;
    var dd = c.steps[index];
    c.steps.forEach(function (step, i) {
      step.classList.toggle('is-step', i === index);
      if (step.previousElementSibling) step.previousElementSibling.classList.toggle('is-step', i === index);
    });
    if (c.cap) c.cap.textContent = dd.dataset.cap || '';
    var state = dd.dataset.state || '';
    c.el.dataset.state = state;
    if (c.rate && c.rate.setRateMode && state) c.rate.setRateMode(state);
    if (c.stage && c.stage.classList.contains('play') && !reduce) {   // the diagram plays again in its new state
      c.stage.classList.remove('play');
      void c.stage.offsetWidth;
      c.stage.classList.add('play');
    }
  }
  var stepQueued = false;
  function updateSteps() {
    stepQueued = false;
    var on = wideCases.matches;
    root.classList.toggle('steps-on', on);
    if (!on) return;
    var line = window.innerHeight * 0.42;
    stepCases.forEach(function (c) {
      if (!c.el.offsetParent) return;
      var index = 0;
      c.steps.forEach(function (dd, i) { if (dd.getBoundingClientRect().top <= line) index = i; });
      setStep(c, index);
    });
  }
  if (stepCases.length) {
    var queueSteps = function () { if (!stepQueued) { stepQueued = true; requestAnimationFrame(updateSteps); } };
    window.addEventListener('scroll', queueSteps, { passive: true });
    window.addEventListener('resize', queueSteps);
    document.addEventListener('modechange', queueSteps);
    stepCases.forEach(function (c) { if (c.cap) c.cap.textContent = c.steps[c.steps.length - 1].dataset.cap || ''; });
    updateSteps();
  }

  // The tempting answer: the strike line draws when the line is reached.
  document.querySelectorAll('.tempt').forEach(function (el) { onSeen(el, function () { el.classList.add('struck'); }, 0.9); });

  // ---------- The board: the newest essay flips from its old status to "Published" ----------
  document.querySelectorAll('[data-flip-from]').forEach(function (cell) {
    var final = cell.textContent;
    if (reduce) return;
    cell.textContent = cell.dataset.flipFrom;
    var boardEl = cell.closest('.scene-observe');
    onSeen(cell, function () {
      var wait = setInterval(function () {      // the rows of the board arrive first, then the status flips
        if (boardEl && !boardEl.classList.contains('play')) return;
        clearInterval(wait);
        setTimeout(function () {
          cell.classList.add('flipping');
          setTimeout(function () { cell.textContent = final; }, 260);
          setTimeout(function () { cell.classList.remove('flipping'); cell.classList.add('flipped'); }, 560);
        }, 1500);
      }, 200);
    }, 1);
  });

  // ---------- Calm: a switch in the header stops automatic motion ----------
  var controlsBox = document.querySelector('.controls');
  if (controlsBox) {
    var calmBtn = document.createElement('button');
    calmBtn.type = 'button';
    calmBtn.className = 'calm-btn';
    var nameCalm = function () {
      var on = root.classList.contains('calm');
      calmBtn.setAttribute('aria-pressed', String(on));
      calmBtn.setAttribute('aria-label', on ? 'Calm is on. Turn automatic motion back on.' : 'Calm: stop automatic motion');
      calmBtn.title = on ? 'Calm is on. Motion plays only when you press a demo.' : 'Calm: stop automatic motion';
      calmBtn.innerHTML = on ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
    };
    calmBtn.addEventListener('click', function () {
      var on = !root.classList.contains('calm');
      try { localStorage.setItem('calm', on ? '1' : '0'); } catch (e) {}
      if (!on) { location.reload(); return; }     // motion starts again from a fresh page
      root.classList.add('calm');
      reduce = true;
      document.querySelectorAll('.scene-observe').forEach(function (el) { el.classList.add('play'); el.classList.remove('paused'); });
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      nameCalm();
    });
    nameCalm();
    controlsBox.insertBefore(calmBtn, controlsBox.querySelector('.theme-btn') || null);
  }

  // ---------- Inner pages: the plane marks how far the page is read ----------
  var readBar = document.querySelector('.read-bar');
  if (!readBar && document.querySelector('.page--inner')) {
    readBar = document.createElement('div');
    readBar.className = 'read-bar';
    readBar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(readBar);
    var pageRead = function () {
      var span = document.documentElement.scrollHeight - window.innerHeight;
      readBar.style.setProperty('--read', span > 0 ? Math.min(1, window.scrollY / span) : 0);
    };
    window.addEventListener('scroll', pageRead, { passive: true });
    pageRead();
  }
  if (readBar) {
    var guide = document.createElement('b');
    guide.className = 'read-bar__guide';
    readBar.appendChild(guide);
  }

  // ---------- Pick up where you left: essays remember the place, the home page offers it ----------
  var essayTitle = document.querySelector('.post__title');
  var essayBody = document.querySelector('.post__body');
  if (essayTitle && essayBody) {
    var herePath = location.pathname.slice(new URL(siteBase).pathname.length);
    var wanted = Number(new URLSearchParams(location.search).get('at'));
    var place = function () { var box = essayBody.getBoundingClientRect(); return { top: box.top + window.scrollY, span: box.height - window.innerHeight * 0.6 }; };
    if (wanted > 0 && wanted < 1) window.addEventListener('load', function () { var at = place(); window.scrollTo({ top: at.top + at.span * wanted, behavior: 'auto' }); });
    var saveTimer = null;
    window.addEventListener('scroll', function () {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        var at = place();
        var done = at.span > 0 ? (window.scrollY - at.top) / at.span : 1;
        try {
          if (done >= 0.97) localStorage.removeItem('resume');
          else if (done > 0.05) localStorage.setItem('resume', JSON.stringify({ p: herePath, t: essayTitle.textContent, f: Math.round(done * 100) / 100 }));
        } catch (e) {}
      }, 300);
    }, { passive: true });
  }
  var resumeSlot = document.querySelector('.resume-slot');
  if (resumeSlot) {
    try {
      var kept = JSON.parse(localStorage.getItem('resume') || 'null');
      if (kept && /^blog\/[a-z0-9-]+\.html$/.test(kept.p)) {
        var chip = document.createElement('a');
        chip.className = 'resume';
        chip.href = siteBase + kept.p + '?at=' + kept.f;
        chip.textContent = 'Continue: ' + kept.t;
        var drop = document.createElement('button');
        drop.type = 'button';
        drop.className = 'resume__drop';
        drop.setAttribute('aria-label', 'Forget this place');
        drop.textContent = '×';
        drop.addEventListener('click', function () { try { localStorage.removeItem('resume'); } catch (e) {} resumeSlot.hidden = true; });
        resumeSlot.appendChild(chip);
        resumeSlot.appendChild(drop);
        resumeSlot.hidden = false;
      }
    } catch (e) {}
  }

  // ---------- Link previews: a small card for a link to another page of this site ----------
  var pageCard = document.createElement('div');
  pageCard.className = 'link-card';
  pageCard.setAttribute('aria-hidden', 'true');
  pageCard.hidden = true;
  document.body.appendChild(pageCard);
  var cardTimer = null;
  var basePath = new URL(siteBase).pathname;
  function pathOf(link) {
    if (link.origin !== location.origin || link.pathname.indexOf(basePath) !== 0) return null;
    var path = link.pathname.slice(basePath.length) || 'index.html';
    return link.pathname === location.pathname ? null : path;
  }
  function showCard(link) {
    var info = (window.SITE_PAGES || {})[pathOf(link)];
    if (!info) return;
    pageCard.textContent = '';
    var img = document.createElement('img');
    img.src = siteBase + 'img/og/' + info[2] + '.png';
    img.alt = '';
    var title = document.createElement('b');
    title.textContent = info[0];
    var text = document.createElement('span');
    text.textContent = info[1];
    pageCard.appendChild(img); pageCard.appendChild(title); pageCard.appendChild(text);
    pageCard.hidden = false;
    var box = link.getBoundingClientRect();
    var width = pageCard.offsetWidth, height = pageCard.offsetHeight;
    var left = Math.min(Math.max(12, box.left), window.innerWidth - width - 12);
    var top = box.top - height - 10 > 8 ? box.top - height - 10 : box.bottom + 10;
    pageCard.style.left = left + 'px';
    pageCard.style.top = top + 'px';
    pageCard.classList.add('show');
  }
  function hideCard() { clearTimeout(cardTimer); pageCard.classList.remove('show'); pageCard.hidden = true; }
  function previewable(target) {
    var link = target.closest && target.closest('main a[href]');
    return link && !link.closest('.matchnav, .peek, .essay-card') && pathOf(link) ? link : null;
  }
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse') return;
    var link = previewable(e.target);
    if (!link) return;
    loadIndex();
    clearTimeout(cardTimer);
    cardTimer = setTimeout(function () { showCard(link); }, 450);
  });
  document.addEventListener('pointerout', function (e) { if (e.pointerType === 'mouse' && previewable(e.target)) hideCard(); });
  // A long press shows the card on a touch screen. The press that showed it does not also open the link.
  var pressTimer = null, pressed = false;
  document.addEventListener('touchstart', function (e) {
    var link = previewable(e.target);
    hideCard();
    pressed = false;
    if (!link) return;
    loadIndex();
    pressTimer = setTimeout(function () { pressed = true; showCard(link); }, 480);
  }, { passive: true });
  document.addEventListener('touchmove', function () { clearTimeout(pressTimer); }, { passive: true });
  document.addEventListener('touchend', function () { clearTimeout(pressTimer); }, { passive: true });
  document.addEventListener('click', function (e) { if (pressed && previewable(e.target)) { e.preventDefault(); pressed = false; } }, true);
  document.addEventListener('contextmenu', function (e) { if (pressed) e.preventDefault(); });
  window.addEventListener('scroll', hideCard, { passive: true });

  // ---------- The next page peeks under the footer: scroll on, or tap, to open it ----------
  var peek = document.querySelector('.peek');
  if (peek) {
    var pull = 0, pullTimer = null, leaving = false;
    var fill = peek.querySelector('.peek__fill');
    window.addEventListener('wheel', function (e) {
      if (leaving || !peek.offsetParent) return;
      var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (!atBottom || e.deltaY <= 0) { pull = 0; fill.style.transform = 'scaleX(0)'; return; }
      pull += e.deltaY;
      fill.style.transform = 'scaleX(' + Math.min(1, pull / 900) + ')';
      clearTimeout(pullTimer);
      pullTimer = setTimeout(function () { pull = 0; fill.style.transform = 'scaleX(0)'; }, 700);
      if (pull >= 900) { leaving = true; location.href = peek.href; }
    }, { passive: true });
  }

  // ---------- Phones: the section bar shrinks to a pill on the way down and returns on the way up ----------
  var bars = document.querySelectorAll('.matchnav');
  if (bars.length) {
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (Math.abs(y - lastY) < 12) return;
      var down = y > lastY && y > 300;
      lastY = y;
      bars.forEach(function (bar) { bar.classList.toggle('is-min', down); });
    }, { passive: true });
  }

  // ---------- Section bars: the Matchday match clock and the Workday plane ----------
  function sectionBar(nav, extent, onProgress) {
    if (!nav || !extent) return;
    var fill = nav.querySelector('.matchnav__bar i');
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var parts = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var queued = false;
    function update() {
      queued = false;
      if (!nav.offsetParent) return; // the other mode is showing
      var line = nav.getBoundingClientRect().bottom + 24;
      var box = extent.getBoundingClientRect();
      var span = box.height - window.innerHeight * 0.5;
      var done = span > 0 ? Math.min(1, Math.max(0, (line - box.top) / span)) : 1;
      var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atEnd) done = 1;
      if (fill) fill.style.transform = 'scaleX(' + done + ')';
      nav.style.setProperty('--p', done);
      if (onProgress) onProgress(done);
      var current = 0;
      parts.forEach(function (part, i) { if (part && part.offsetParent && part.getBoundingClientRect().top <= line) current = i; });
      if (atEnd) current = parts.length - 1; // the last part may be too short to reach the line
      links.forEach(function (a, i) {
        if (i === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    document.addEventListener('modechange', function () { setTimeout(queue, 60); });
    update();
  }

  var matchNav = document.querySelector('.matchnav:not(.worknav)');
  var minute = matchNav && matchNav.querySelector('.matchnav__min');
  sectionBar(matchNav, document.querySelector('.story'), function (done) {
    matchNav.classList.toggle('late', done > 0.5);
    if (minute) minute.textContent = done >= 1 ? '90+3′' : Math.max(1, Math.round(done * 90)) + '′';
  });
  sectionBar(document.querySelector('.worknav'), document.getElementById('main'));
})();
