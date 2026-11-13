// One journey, using the four approved scenes. Pause when hidden or off screen.
(function () {
  'use strict';
  const journey = document.querySelector('.booking-journey');
  if (!journey) return;
  const root = document.documentElement;
  const scenes = [...journey.querySelectorAll('.journey-scene')];
  const steps = [...journey.querySelectorAll('[data-journey-step]')];
  const pause = journey.querySelector('[data-journey-pause]');
  const replay = journey.querySelector('[data-journey-replay]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const titles = ['Stamped and ready', 'Check-in to take-off', 'A room waiting after a long day', 'The holiday starts'];
  const captions = [
    'The passport opens, the stamp lands, and the boarding pass slides into place.',
    'The bag is tagged and checked in. Beyond the window, the plane takes off.',
    'A taxi arrives at night. The door opens, the bag goes in, and the hotel lights come on.',
    'The umbrella opens beside the sea. The trip settles into waves, sunshine and quiet.'
  ];
  let current = 0;
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let visible = false;
  let userPaused = false;
  let calm = root.classList.contains('calm');
  let still = motion.matches || calm;
  function update() {
    steps.forEach((step, i) => {
      step.querySelector('i').style.width = (i < current ? 100 : i === current ? Math.min(100, elapsed / 70) : 0) + '%';
      if (i === current) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    const confirmed = current > 0 || elapsed >= 3500;
    journey.querySelector('.journey-ticket').classList.toggle('is-confirmed', confirmed);
    journey.querySelector('.journey-ticket strong').textContent = confirmed ? 'CONFIRMED ✓' : 'Documents ready';
    pause.hidden = motion.matches;
    pause.textContent = still || userPaused ? 'Play journey' : 'Pause';
    pause.setAttribute('aria-pressed', String(still || userPaused));
    replay.textContent = motion.matches ? 'Reset journey' : 'Replay journey';
  }
  function show(index) {
    current = index;
    elapsed = still ? 7000 : 0;
    scenes.forEach(scene => scene.classList.remove('is-active'));
    // Remove the animation names for a frame so revisiting a scene restarts it.
    void journey.offsetWidth;
    scenes[index].classList.add('is-active');
    journey.classList.toggle('is-static', still);
    journey.querySelector('[data-journey-title]').textContent = titles[index];
    journey.querySelector('[data-journey-caption]').textContent = captions[index];
    update();
  }
  function tick(now) {
    elapsed += Math.min(now - last, 100);
    last = now;
    if (elapsed >= 7000) show((current + 1) % scenes.length);
    update();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    const running = visible && !document.hidden && root.dataset.mode === 'match' && !still && !userPaused;
    journey.classList.toggle('is-running', running);
    if (running) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    update();
  }
  pause.addEventListener('click', () => {
    if (still) { still = false; userPaused = false; show(0); }
    else userPaused = !userPaused;
    sync();
  });
  replay.addEventListener('click', () => {
    still = motion.matches;
    userPaused = false;
    show(still ? 3 : 0);
    sync();
  });
  steps.forEach((step, i) => step.addEventListener('click', () => {
    show(i);
    sync();
  }));
  motion.addEventListener('change', () => {
    still = motion.matches || calm;
    userPaused = false;
    show(still ? 3 : 0);
    sync();
  });
  new MutationObserver(() => {
    const nextCalm = root.classList.contains('calm');
    if (nextCalm !== calm) {
      calm = nextCalm;
      still = motion.matches || calm;
      userPaused = false;
      show(still ? 3 : 0);
    }
    sync();
  }).observe(root, { attributes: true, attributeFilter: ['class', 'data-mode'] });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.15 }).observe(journey);
  } else {
    visible = true;
  }
  show(still ? 3 : 0);
  sync();
})();
