// Shared by every page. Each feature checks that its elements exist first.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var toggle = document.getElementById('mode-switch');

  // ---------- Split-flap role (homepage) ----------
  var flap = document.getElementById('flap');
  var cells = [];
  var flapText = flap ? flap.dataset.text : '';
  var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (flap) {
    cells = flapText.split('').map(function (ch) {
      var cell = document.createElement('span');
      cell.setAttribute('aria-hidden', 'true');
      if (ch === ' ') cell.className = 'gap';
      flap.appendChild(cell);
      return cell;
    });
  }

  function runFlap() {
    cells.forEach(function (cell, i) {
      var target = flapText[i];
      if (target === ' ' || reduce) { cell.textContent = target; return; }
      var ticks = 0;
      var stopAt = 5 + i;
      var timer = setInterval(function () {
        cell.textContent = ticks >= stopAt ? target : letters[Math.floor(Math.random() * letters.length)];
        if (ticks++ >= stopAt) clearInterval(timer);
      }, 50);
    });
  }

  // ---------- Hero scenes (homepage) ----------
  var fans = document.querySelector('#cross .fans');
  if (fans) {
    for (var i = 0; i < 14; i++) {
      var dot = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      dot.setAttribute('x', 150 + i * 12);
      dot.setAttribute('y', i % 2 ? 10 : 8);
      dot.setAttribute('width', 5);
      dot.setAttribute('height', 5);
      dot.setAttribute('rx', 2.5);
      dot.style.animationDelay = (i * 0.05) + 's';
      fans.appendChild(dot);
    }
  }

  // Replacing a node with its clone restarts every CSS animation inside it.
  function replay(selector) {
    var el = document.querySelector(selector);
    if (!el) return;
    var fresh = el.cloneNode(true);
    el.replaceWith(fresh);
    void fresh.offsetWidth;
    fresh.classList.add('play');
  }

  function playPlane() {
    var hero = document.querySelector('.hero--work');
    if (!hero) return;
    hero.classList.remove('play');
    void hero.offsetWidth;
    hero.classList.add('play');
    var motion = document.getElementById('plane-motion');
    if (!reduce && motion && motion.beginElement) motion.beginElement();
  }

  // The move: the 7 plays both wings, so each replay switches sides.
  var moveOnRight = true;
  function playMove() {
    var move = document.getElementById('move');
    if (!move) return;
    // SVG motion does not start before the page loads; CSS would. Wait, so both stay in step.
    if (document.readyState !== 'complete') {
      if (!playMove.waiting) {
        playMove.waiting = true;
        window.addEventListener('load', function () { playMove.waiting = false; playMove(); }, { once: true });
      }
      return;
    }
    move.classList.toggle('move--left', !moveOnRight);
    var wing = move.querySelector('.mv-wing');
    if (wing) wing.textContent = moveOnRight ? 'Right wing' : 'Left wing';
    moveOnRight = !moveOnRight;
    var next = move.querySelector('.mv-next');
    if (next) next.textContent = moveOnRight ? '↻ Play the right wing' : '↻ Play the left wing';

    // A fresh copy of the SVG drops every queued SMIL start from an earlier replay,
    // so a quick second tap cannot fire the old cross during the new run.
    var oldSvg = move.querySelector('svg');
    var svg = oldSvg.cloneNode(true);
    move.classList.remove('play', 'live', 'still');
    oldSvg.replaceWith(svg);
    void move.getBoundingClientRect();

    // Reduced motion, or no SMIL: jump straight to the final frame.
    // Right wing: cross for the 9 (goal at 5 s). Left wing: cut inside, top corner (goal at 4.2 s).
    var onLeft = move.classList.contains('move--left');
    var cap = move.querySelector('.mv-cap');
    if (cap) cap.innerHTML = onLeft ? 'Fergie-time winner · Goal: <b>Abdullah</b>' : 'Fergie-time winner · Assist: <b>Abdullah</b>';
    var motions = svg.querySelectorAll('[data-wing="' + (onLeft ? 'left' : 'right') + '"] animateMotion');
    var canMove = motions.length && motions[0].beginElementAt;
    if (reduce || !canMove) { move.classList.add('play', 'still'); runClock(move, 0); return; }
    move.classList.add('play', 'live');
    runClock(move, onLeft ? 4.2 : 5);
    motions.forEach(function (m) {
      m.beginElementAt(parseFloat(m.dataset.at) || 0);
    });
  }

  // Fergie-time scoreboard: 90:00 runs to 92:59 during the move, then 90+3′ and 1–0 at the goal.
  var clockFrame = 0;
  function runClock(move, goalAt) {
    var clock = move.querySelector('.mv-clock');
    var score = move.querySelector('.mv-score');
    if (!clock || !score) return;
    cancelAnimationFrame(clockFrame);
    var next = move.querySelector('.mv-next');
    function scored() {
      clock.textContent = '90+3′'; score.textContent = '1–0'; move.classList.add('scored');
      if (next) next.tabIndex = 0;
    }
    if (next) next.tabIndex = -1;
    move.classList.remove('scored');
    if (!goalAt) { scored(); return; }
    score.textContent = '0–0';
    var start = performance.now();
    (function tick(now) {
      var t = (now - start) / 1000;
      if (t >= goalAt) { scored(); return; }
      var secs = Math.floor(t / goalAt * 180);
      clock.textContent = '9' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      clockFrame = requestAnimationFrame(tick);
    })(start);
  }

  var moveEl = document.getElementById('move');
  if (moveEl) moveEl.addEventListener('click', playMove);

  function playMatch() {
    // A scene that waits for scrolling (v2) is played by the observer instead.
    replay('#cross:not(.scene-observe)');
    replay('.chalk');
    playMove();
  }

  // ---------- Modes ----------
  function setMode(mode, animate) {
    root.dataset.mode = mode;
    var isMatch = mode === 'match';
    if (toggle) {
      toggle.setAttribute('aria-checked', String(isMatch));
      toggle.setAttribute('aria-label', isMatch ? 'Show the professional Workday view' : 'Show the personal Matchday view');
    }

    // Only the visible portrait is announced to screen readers.
    document.querySelectorAll('.portrait__img--work').forEach(function (img) { img.setAttribute('aria-hidden', String(isMatch)); });
    document.querySelectorAll('.portrait__img--match').forEach(function (img) { img.setAttribute('aria-hidden', String(!isMatch)); });

    document.querySelectorAll('[data-work][data-match]').forEach(function (el) {
      el.textContent = isMatch ? el.dataset.match : el.dataset.work;
    });

    try { localStorage.setItem('mode', mode); } catch (e) {}

    if (animate) {
      runFlap();
      if (isMatch) playMatch(); else playPlane();
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setMode(root.dataset.mode === 'match' ? 'work' : 'match', true);
    });
  }

  setMode(root.dataset.mode === 'match' ? 'match' : 'work', true);

  // ---------- Theme: dark by default, light when chosen ----------
  var themeBtn = document.getElementById('theme-toggle');
  function syncThemeLabel() {
    if (!themeBtn) return;
    var light = root.dataset.theme === 'light';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var light = root.dataset.theme !== 'light';
      if (light) root.dataset.theme = 'light'; else delete root.dataset.theme;
      try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch (e) {}
      syncThemeLabel();
    });
  }
  syncThemeLabel();

  // ---------- Scenes that play once when scrolled into view ----------
  var scenes = document.querySelectorAll('.scene-observe');
  if (reduce || !('IntersectionObserver' in window)) {
    scenes.forEach(function (el) { el.classList.add('play'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('play');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.45 });
    scenes.forEach(function (el) { observer.observe(el); });
  }

  // ---------- Article contents (article pages) ----------
  var toc = document.querySelector('.toc');
  if (toc) {
    // Open beside the text on wide screens; folded above it on phones.
    var wide = window.matchMedia('(min-width: 900px)');
    var syncOpen = function () { toc.open = wide.matches; };
    syncOpen();
    wide.addEventListener('change', syncOpen);

    var links = toc.querySelectorAll('a[href^="#"]');
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var headings = Array.prototype.map.call(links, function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    }).filter(Boolean);

    if ('IntersectionObserver' in window && headings.length) {
      var current = null;
      var tocObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (current) current.removeAttribute('aria-current');
          current = byId[entry.target.id];
          if (current) current.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '0px 0px -70% 0px' });
      headings.forEach(function (h) { tocObserver.observe(h); });
    }
  }
})();
