// Shared by every page. Each feature checks that its elements exist first.
(function () {
  var root = document.documentElement;
  // Calm (the switch in the header) stops automatic motion, like the reduced-motion setting of the system.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('calm');
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

  function playMatch() {
    // A scene that waits for scrolling (v2) is played by the observer instead.
    replay('#cross:not(.scene-observe)');
    replay('.chalk');
    // hero-scenes.js restarts the tactics board on 'modechange'.
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

    // Inner pages have no switch; they must not overwrite the mode chosen on the homepage.
    if (toggle) { try { localStorage.setItem('mode', mode); } catch (e) {} }

    if (animate) {
      runFlap();
      if (isMatch) playMatch(); else playPlane();
    }
    document.dispatchEvent(new CustomEvent('modechange'));
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var change = function () { setMode(root.dataset.mode === 'match' ? 'work' : 'match', true); };
      // No view transition here: it cannot be interrupted. v3.js moves the page in, and a second press redirects it.
      change();
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

  // ---------- Scenes: one at a time, in the middle of the screen ----------
  // A scene starts when it reaches the middle band of the screen. Scenes that arrive together start one
  // after another. A scene that leaves the screen is paused, and it continues when it returns.
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene-observe'));
  if (reduce || !('IntersectionObserver' in window)) {
    scenes.forEach(function (el) { el.classList.add('play'); });
  } else {
    var waiting = [];
    var busy = false;
    var startNext = function () {
      var el = waiting.shift();
      if (!el) { busy = false; return; }
      busy = true;
      el.classList.add('play');
      setTimeout(startNext, 450);
    };
    var enqueue = function (el) {
      if (el.classList.contains('play') || waiting.indexOf(el) !== -1) return;
      waiting.push(el);
      if (!busy) startNext();
    };
    var middle = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        middle.unobserve(entry.target);
        enqueue(entry.target);
      });
    }, { rootMargin: '-25% 0px -25% 0px' });
    var onScreen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target.classList.toggle('paused', !entry.isIntersecting); });
    });
    scenes.forEach(function (el) { middle.observe(el); onScreen.observe(el); });
    // The first and last scenes of a page can never reach the middle, so the two ends of the page start what is visible.
    var atEnds = function () {
      var top = window.scrollY < 8;
      var bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (!top && !bottom) return;
      scenes.forEach(function (el) {
        if (el.classList.contains('play') || !el.offsetParent) return;
        var box = el.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) enqueue(el);
      });
    };
    window.addEventListener('scroll', atEnds, { passive: true });
    document.addEventListener('modechange', function () { setTimeout(atEnds, 80); });
    window.addEventListener('load', atEnds);
    atEnds();
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
