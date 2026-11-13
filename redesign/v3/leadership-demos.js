// Illustrative mechanisms for the leadership case. No requests leave the page.
(function () {
  'use strict';
  const stage = document.getElementById('leadership-stage');
  if (!stage) return;
  const root = document.documentElement;
  const choices = [...document.querySelectorAll('[data-lead-demo]')];
  const rail = document.querySelector('.leadership__rail');
  const wide = matchMedia('(min-width: 1000px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const contexts = {
    supplier: {
      title: 'The slow supplier', slot: 'scope',
      before: 'A search can ask several suppliers. One slow answer must not hold back the others.',
      prompt: 'Set a time limit. Run the search and watch which suppliers answer.',
      after: 'Keep the answers that arrive in time. A time limit bounds the wait for supplier integrations.'
    },
    states: {
      title: 'Booking states', slot: 'scope',
      before: 'A booking has a state. Payment, confirmation, cancellation and refund must follow agreed rules.',
      prompt: 'Try a move. Confirm before paying, or refund before cancelling.',
      after: 'A refused move leaves the booking unchanged. Explicit rules keep booking states consistent.'
    },
    pricing: {
      title: 'The price ticket, live', slot: 'scope',
      before: 'The same adjustments can produce different prices when their order changes.',
      prompt: 'Toggle an adjustment. Reverse the order and compare the total.',
      after: 'One fixed order gives every screen the same price. These example rules are not ShareTrip’s formula.'
    },
    ack: {
      title: 'Acknowledge or redeliver', slot: 'ack',
      before: 'A worker can finish the effect, then crash before it acknowledges the message.',
      prompt: 'Deliver, crash, then redeliver. Try again without the duplicate check.',
      after: 'Agree the acknowledgement and duplicate rules on both sides. This is “Contract first”.'
    },
    profile: {
      title: 'Guess, then profile', slot: 'measure',
      before: 'A slow request has several steps. The step that looks expensive may not be the slowest.',
      prompt: 'Guess the slowest step. Reveal the timings, then count the database trips.',
      after: 'The profile tells us where to look. This is “Measure first”.'
    },
    trips: {
      title: 'Count the round trips', slot: 'measure',
      before: 'One booking saves many rows. Each save is a trip to the database, and each trip costs time.',
      prompt: 'Press Book. Then tick a box and press again.',
      after: "Same booking, fewer trips. This is 'Measure first'."
    },
    trace: {
      title: 'One ID through four services', slot: 'trace',
      before: 'A booking crosses four services. Each one writes its own logs.',
      prompt: 'Press the button. Watch one ID appear in all four.',
      after: "One search, four lines, one story. This is 'One request, one trail'."
    },
    gate: {
      title: 'Staging gate', slot: 'gate',
      before: 'A change can build successfully and still fail a check before it reaches customers.',
      prompt: 'Run the checks. Fix the failure, check again, then promote.',
      after: 'A failed check blocks promotion. This is “Staging first”.'
    }
  };
  let active = 'pricing';
  let pending = [];
  let generation = 0;
  let ghost = null;
  let fade = null;
  const reduced = () => motion.matches || root.classList.contains('calm');
  const $ = selector => stage.querySelector(selector);
  function stop() {
    generation += 1;
    pending.forEach(clearTimeout);
    pending = [];
    if (fade) { fade.cancel(); fade = null; }
    if (ghost) { ghost.remove(); ghost = null; }
  }
  function later(fn, delay) {
    if (reduced()) { fn(); return; }
    const ownGeneration = generation;
    pending.push(setTimeout(() => { if (ownGeneration === generation) fn(); }, delay));
  }
  function message(text) { $('.lead-demo__log').textContent = text; }
  function main(text, fn) {
    const button = $('.lead-demo__main');
    button.textContent = text;
    button.disabled = false;
    button.onclick = fn;
    return button;
  }
  function content(html, options = '') {
    $('.lead-demo__visual').innerHTML = html;
    $('.lead-demo__options').innerHTML = options;
  }
  function place() {
    const target = wide.matches ? rail : document.querySelector('[data-stage-slot="' + contexts[active].slot + '"]');
    if (stage.parentElement !== target) target.append(stage);
    choices.forEach(button => {
      if (wide.matches) button.removeAttribute('aria-expanded');
      else button.setAttribute('aria-expanded', String(button.dataset.leadDemo === active));
    });
  }
  function select(key, animate = true) {
    if (!contexts[key]) return;
    const restoreFocus = stage.contains(document.activeElement);
    stop();
    const old = animate && !reduced() && stage.firstElementChild ? stage.firstElementChild.cloneNode(true) : null;
    active = key;
    const c = contexts[key];
    stage.hidden = false;
    stage.dataset.demo = key;
    stage.innerHTML = '<div class="lead-demo__view"><header class="lead-demo__head"><h4 id="lead-demo-title"></h4><span class="demo__tag">Example values</span></header><p class="lead-demo__before"></p><p class="lead-demo__prompt"></p><div class="lead-demo__visual"></div><div class="lead-demo__options"></div><div class="lead-demo__actions"><button class="demo__btn lead-demo__main" type="button"></button><button class="demo__reset" type="button">Reset</button></div><p class="lead-demo__log" role="status" aria-live="polite" aria-atomic="true"></p><p class="lead-demo__after"></p><small class="lead-demo__example">Illustrative mechanism · not production measurements</small></div>';
    $('#lead-demo-title').textContent = c.title;
    $('.lead-demo__before').textContent = c.before;
    $('.lead-demo__prompt').textContent = c.prompt;
    $('.lead-demo__after').textContent = c.after;
    $('.demo__reset').onclick = () => select(active, false);
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.leadDemo === key)));
    place();
    demos[key]();
    if (restoreFocus && !document.hidden) $('.lead-demo__main').focus({ preventScroll: true });
    if (old && stage.animate) {
      old.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      old.classList.add('lead-demo__ghost');
      ghost = old;
      stage.append(old);
      const outgoing = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
      fade = $('.lead-demo__view').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
      outgoing.onfinish = () => { old.remove(); if (ghost === old) ghost = null; };
    }
  }
  function open(key, scroll) {
    if (!contexts[key]) return;
    const show = () => {
      select(key);
      if (scroll) {
        document.getElementById('case-team').classList.add('in');
        // Font loading and mode changes can both move the destination.
        document.fonts.ready.then(() => requestAnimationFrame(() => {
          if (active === key && root.dataset.mode === 'work') {
            document.getElementById('demo-' + key).scrollIntoView({ block: 'start', behavior: 'auto' });
          }
        }));
      }
    };
    if (root.dataset.mode === 'match') {
      const afterMode = () => {
        if (root.dataset.mode !== 'work') return;
        document.removeEventListener('modechange', afterMode);
        show();
      };
      document.addEventListener('modechange', afterMode);
      document.getElementById('mode-switch').click();
    } else {
      show();
    }
  }
  function navigate(key) {
    if (location.hash !== '#demo-' + key) history.pushState(null, '', '#demo-' + key);
    open(key, false);
  }
  const demos = {
    supplier() {
      const times = [400, 800, 2400];
      content('<ol class="lead-suppliers">' + times.map((t, i) => '<li><span>Supplier ' + ['A', 'B', 'C'][i] + '</span><b>Ready</b><i><em></em></i></li>').join('') + '</ol>', '<label class="lead-demo__field">Time limit <output>1.0 s</output><input type="range" min="0.5" max="3" step="0.5" value="1" aria-label="Supplier time limit"></label>');
      const slider = $('input');
      const rows = [...stage.querySelectorAll('.lead-suppliers li')];
      slider.oninput = () => { $('output').textContent = Number(slider.value).toFixed(1) + ' s'; };
      main('Run the search', () => {
        stop();
        const limit = Number(slider.value) * 1000;
        const run = $('.lead-demo__main');
        run.disabled = true;
        slider.disabled = true;
        let done = 0;
        let answers = 0;
        message('Waiting within the time limit. Each supplier settles independently.');
        rows.forEach((row, i) => {
          row.className = '';
          row.querySelector('b').textContent = 'Waiting…';
          row.querySelector('em').style.width = '0';
          later(() => {
            const answered = times[i] <= limit;
            if (answered) answers += 1;
            row.className = answered ? 'is-pass' : 'is-fail';
            row.querySelector('b').textContent = answered ? 'Answered · ' + times[i] + ' ms' : 'Timed out · ' + limit + ' ms';
            row.querySelector('em').style.width = (Math.min(times[i], limit) / 3000 * 100) + '%';
            done += 1;
            message(answers + ' supplier' + (answers === 1 ? '' : 's') + ' answered. ' + (3 - done) + ' still waiting.');
            if (done === 3) {
              message(answers + ' answers kept. ' + (3 - answers) + ' timed out. The search does not wait past ' + (limit / 1000).toFixed(1) + ' s.');
              run.disabled = false;
              slider.disabled = false;
            }
          }, Math.min(times[i], limit));
        });
      });
      message('Three suppliers, one time limit. Nothing runs until you press the button.');
    },
    states() {
      let state = 'held';
      let paid = false;
      content('<p class="lead-state">Booking <strong>Held</strong></p><ol class="lead-state__path"><li>Held</li><li>Paid</li><li>Confirmed</li><li>Cancelled</li><li>Refunded</li></ol>', '<label class="lead-demo__field">Move to try<select aria-label="Booking move"><option value="pay">Pay</option><option value="confirm">Confirm</option><option value="cancel">Cancel</option><option value="refund">Refund</option></select></label>');
      const names = { held: 'Held', paid: 'Paid', confirmed: 'Confirmed', cancelled: 'Cancelled', refunded: 'Refunded' };
      main('Try the move', () => {
        const action = $('select').value;
        let next = null;
        let reason = '';
        if (action === 'pay') { if (state === 'held') { next = 'paid'; paid = true; } else reason = 'Payment is allowed only for a held booking.'; }
        if (action === 'confirm') { if (state === 'paid') next = 'confirmed'; else reason = 'Confirmation requires a paid booking.'; }
        if (action === 'cancel') { if (['held', 'paid', 'confirmed'].includes(state)) next = 'cancelled'; else reason = 'Only an active booking can be cancelled.'; }
        if (action === 'refund') { if (state === 'cancelled' && paid) next = 'refunded'; else reason = 'Refund requires cancellation and an earlier payment.'; }
        const previous = state;
        if (next) state = next;
        $('.lead-state strong').textContent = names[state];
        stage.querySelectorAll('.lead-state__path li').forEach(li => li.classList.toggle('is-current', li.textContent === names[state]));
        message(next ? names[previous] + ' → ' + names[state] + '. Move allowed by these example rules.' : 'Move refused. ' + reason + ' State stays ' + names[state] + '.');
      });
      $('.lead-state__path li').classList.add('is-current');
      message('Held and unpaid. This is a small example policy, not the full product state machine.');
    },
    pricing() {
      let reverse = false;
      const adjustments = [
        { key: 'markup', label: 'Markup +20%', enabled: true, apply: n => n * 1.2 },
        { key: 'discount', label: 'Discount −10%', enabled: true, apply: n => n * 0.9 },
        { key: 'coupon', label: 'Coupon −5', enabled: true, apply: n => n - 5 }
      ];
      content('<div class="lead-price"><p><span>Base price</span><b>100.00</b></p><div class="lead-price__lines"></div><p class="lead-price__total"><span>Customer pays</span><b></b></p></div>', '<div class="lead-demo__checks">' + adjustments.map(a => '<label><input type="checkbox" value="' + a.key + '" checked> ' + a.label + '</label>').join('') + '</div>');
      const draw = () => {
        let amount = 100;
        const order = reverse ? [...adjustments].reverse() : adjustments;
        $('.lead-price__lines').innerHTML = order.map(a => {
          if (!a.enabled) return '<p class="is-muted"><span>' + a.label + '</span><b>off</b></p>';
          amount = Math.round((a.apply(amount) + Number.EPSILON) * 100) / 100;
          return '<p><span>' + a.label + '</span><b>' + amount.toFixed(2) + '</b></p>';
        }).join('');
        $('.lead-price__total b').textContent = amount.toFixed(2);
        $('.lead-demo__main').textContent = reverse ? 'Use the fixed order' : 'Reverse the order';
      };
      const total = order => order.reduce((amount, adjustment) => adjustment.enabled
        ? Math.round((adjustment.apply(amount) + Number.EPSILON) * 100) / 100 : amount, 100);
      stage.querySelectorAll('input').forEach(input => { input.onchange = () => {
        adjustments.find(a => a.key === input.value).enabled = input.checked;
        draw();
        message('Adjustment changed. Every screen must use the same adjustments and the same order.');
      }; });
      main('Reverse the order', () => {
        reverse = !reverse;
        draw();
        const fixed = total(adjustments);
        const reversed = total([...adjustments].reverse());
        message(fixed === reversed
          ? 'These adjustments give the same total in either order. Turn on all three to see why order matters.'
          : 'Fixed order: ' + fixed.toFixed(2) + '. Reversed order: ' + reversed.toFixed(2) + '. The order is part of the pricing rule.');
      });
      draw();
      message('Fixed order: markup → discount → coupon. Change an input to compare.');
    },
    ack() {
      let phase = 0;
      let effects = 0;
      content('<div class="lead-queue"><p><span>Queue</span><b data-q>1 message</b></p><span aria-hidden="true">→</span><p><span>Worker</span><b data-worker>Waiting</b></p></div><p class="lead-effect">Booking effects <strong>0</strong></p>', '<div class="lead-demo__checks"><label><input type="checkbox" checked> Check for duplicates</label></div>');
      const check = $('input');
      const action = main('Deliver the message', () => {
        if (phase === 0) {
          phase = 1; effects = 1;
          $('[data-q]').textContent = 'Unacknowledged';
          $('[data-worker]').textContent = 'Effect saved';
          check.disabled = true;
          action.textContent = 'Crash before acknowledgement';
          message('The effect is saved. The broker still has no acknowledgement.');
        } else if (phase === 1) {
          phase = 2;
          $('[data-q]').textContent = '1 redelivery';
          $('[data-worker]').textContent = 'Crashed';
          action.textContent = 'Redeliver the message';
          message('The worker disconnected. The unacknowledged message returns to the queue.');
        } else {
          phase = 3;
          if (!check.checked) effects += 1;
          $('[data-q]').textContent = '0 messages';
          $('[data-worker]').textContent = 'Acknowledged';
          action.disabled = true;
          message(check.checked ? 'Duplicate recognised. No second effect. The worker acknowledges the redelivery.' : 'No duplicate check: the effect happened twice. Acknowledgement alone cannot prevent that.');
        }
        $('.lead-effect strong').textContent = effects;
      });
      message('One queued message. The duplicate rule belongs to the consumer; redelivery belongs to the broker.');
    },
    profile() {
      const steps = [['Gateway', 30], ['Supplier', 35], ['Database', 420], ['Response', 15]];
      let revealed = false;
      content('<ol class="lead-profile">' + steps.map(s => '<li><span>' + s[0] + '</span><i><em></em></i><b>?</b></li>').join('') + '</ol>', '<label class="lead-demo__field">Your guess<select aria-label="Slowest request step">' + steps.map(s => '<option>' + s[0] + '</option>').join('') + '</select></label>');
      const action = main('Reveal the timings', () => {
        if (revealed) { navigate('trips'); return; }
        revealed = true;
        const guess = $('select').value;
        $('select').disabled = true;
        stage.querySelectorAll('.lead-profile li').forEach((li, i) => {
          li.querySelector('b').textContent = steps[i][1] + ' ms';
          li.querySelector('em').style.width = (steps[i][1] / 420 * 100) + '%';
        });
        message((guess === 'Database' ? 'Your guess matched. ' : 'The profile changes the guess. ') + 'Database: 420 of 500 ms. Next, examine its round trips.');
        action.textContent = 'Count the round trips →';
      });
      message('Example timings are hidden. Guess before looking at the profile.');
    },
    trips() {
      content('<p class="trips__count"><b>0</b><span>round trips to the database</span></p><ol class="trips__rows" aria-label="Six booking rows">' + '<li></li>'.repeat(6) + '</ol>', '<div class="lead-demo__checks"><label><input type="checkbox" value="batch"> Batch the saves</label><label><input type="checkbox" value="reuse"> Reuse loaded rows</label></div>');
      const action = main('Book', () => {
        stop();
        const batch = $('input[value="batch"]').checked;
        const reuse = $('input[value="reuse"]').checked;
        const rows = [...stage.querySelectorAll('.trips__rows li')];
        const inputs = [...stage.querySelectorAll('input')];
        const steps = [];
        if (batch) steps.push(() => rows.forEach(row => row.classList.add('saved')));
        else rows.forEach(row => steps.push(() => row.classList.add('saved')));
        if (!reuse) rows.forEach(row => steps.push(() => row.classList.add('loaded')));
        rows.forEach(row => row.className = '');
        $('.trips__count b').textContent = '0';
        action.disabled = true;
        inputs.forEach(input => input.disabled = true);
        message('Saving the same six rows. Count each database trip.');
        steps.forEach((step, i) => later(() => {
          step();
          $('.trips__count b').textContent = i + 1;
          if (i === steps.length - 1) {
            const saves = batch ? 1 : 6;
            const loads = reuse ? 0 : 6;
            message(saves + (saves === 1 ? ' save' : ' saves') + ' and ' + loads + ' reloads make ' + steps.length + (steps.length === 1 ? ' round trip.' : ' round trips.'));
            action.disabled = false;
            inputs.forEach(input => input.disabled = false);
          }
        }, (i + 1) * 130));
      });
      message('One booking writes six rows. Press Book.');
    },
    trace() {
      const services = [
        ['gateway', 'req-19c2 GET /hotels', 'req-7f3a POST /book'],
        ['bookings', 'req-02ee hold room', 'req-7f3a create booking'],
        ['payments', 'req-51aa refund', 'req-7f3a charge'],
        ['notifications', 'req-02ee sms', 'req-7f3a send receipt']
      ];
      content('<ol class="lead-trace">' + services.map(s => '<li><b>' + s[0] + '</b><code>' + s[1] + '</code><code class="lead-trace__hit">' + s[2] + '</code></li>').join('') + '</ol>');
      const action = main('Follow one request', () => {
        stop();
        const boxes = [...stage.querySelectorAll('.lead-trace li')];
        boxes.forEach(box => box.classList.remove('is-found'));
        action.disabled = true;
        message('Searching for req-7f3a across four services.');
        boxes.forEach((box, i) => later(() => {
          box.classList.add('is-found');
          message('Found in ' + services[i][0] + ': ' + services[i][2]);
          if (i === 3) {
            action.disabled = false;
            message('One search for req-7f3a finds four log lines, one in each service.');
          }
        }, i * 400));
      });
      message('Different logs, one request ID: req-7f3a.');
    },
    gate() {
      let phase = 'ready';
      content('<ol class="lead-gate"><li><span>Build</span><b>Waiting</b></li><li><span>Booking contract check</span><b>Waiting</b></li><li><span>Production</span><b>Blocked</b></li></ol>');
      const checks = [...stage.querySelectorAll('.lead-gate li')];
      const set = (i, text, pass) => { checks[i].querySelector('b').textContent = text; checks[i].className = pass ? 'is-pass' : 'is-fail'; };
      const action = main('Run staging checks', () => {
        if (phase === 'failed') {
          phase = 'fixed';
          set(1, 'Fixed · needs recheck', true);
          action.textContent = 'Run staging checks again';
          message('The example defect is fixed. Production is still blocked until checks run again.');
        } else if (phase === 'passed') {
          phase = 'promoted';
          set(2, 'Promoted', true);
          action.disabled = true;
          message('The checked change reaches production. In this demo, a passed staging gate is required.');
        } else {
          const fixed = phase === 'fixed';
          action.disabled = true;
          message('Running the build and the booking contract check in staging.');
          later(() => {
            set(0, 'Passed', true);
            set(1, fixed ? 'Passed' : 'Failed', fixed);
            phase = fixed ? 'passed' : 'failed';
            action.disabled = false;
            action.textContent = fixed ? 'Promote to production' : 'Fix the failed check';
            message(fixed ? 'Both staging checks pass. The change can now be promoted.' : 'The build passes. The booking contract check fails. Production stays blocked.');
          }, 650);
        }
      });
      message('No check has run. Production is blocked.');
    }
  };
  choices.forEach(button => {
    button.addEventListener('click', () => navigate(button.dataset.leadDemo));
  });
  function followHash() {
    const match = /^#demo-([a-z]+)$/.exec(location.hash);
    if (match && contexts[match[1]]) open(match[1], true);
  }
  window.addEventListener('hashchange', followHash);
  wide.addEventListener('change', place);
  motion.addEventListener('change', () => select(active, false));
  document.addEventListener('modechange', () => {
    // A hidden Workday demo must not keep doing work in Matchday.
    select(active, false);
    if (root.dataset.mode === 'work') place();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) select(active, false); });
  document.querySelector('.calm-btn')?.addEventListener('click', () => select(active, false));
  select('pricing', false);
  followHash();
})();
