// Matchday hero: the tactics board in #move. Sir Alex draws the plan in marker and gives the team talk.
// It is his Treble-era 4-4-2: the 7 goes wide to the byline and crosses, and the 9 heads in a Fergie-time
// winner. The next play is a one-two with the 19 and an early ball for the 9.
//   ?heroT=0.41  Holds the scene on one moment of its loop (for screenshots).
// The scene is a draw(u) function for u in 0..1 of one loop. The loop runs only while the scene is on
// the screen, the tab is visible and Matchday is showing. With Calm or reduced motion, the scene shows
// its goal frame, and a click plays it once.
(function () {
  var move = document.getElementById('move');
  if (!move) return;
  var root = document.documentElement;

  var NS = 'http://www.w3.org/2000/svg';
  var FONTS = { cond: 'font-family: var(--cond); font-weight: 700', hand: 'font-family: Caveat, cursive; font-weight: 600' };
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'font') e.setAttribute('style', FONTS[attrs[k]]);
      else e.setAttribute(k, attrs[k]);
    }
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(u, a, b) { return clamp((u - a) / (b - a)); }
  var EASE = {
    io: function (v) { return v < .5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2; },
    out: function (v) { return 1 - Math.pow(1 - v, 3); },
    in: function (v) { return v * v * v; },
    lin: function (v) { return v; }
  };
  function lerp(a, b, v) { return a + (b - a) * v; }
  // Key frames: [[u, value, easing into this key], ...]. A value is a number or an [x, y] pair.
  function keys(u, k, def) {
    if (u <= k[0][0]) return k[0][1];
    for (var i = 1; i < k.length; i++) {
      if (u > k[i][0]) continue;
      var v = EASE[k[i][2] || def || 'io'](seg(u, k[i - 1][0], k[i][0])), a = k[i - 1][1], b = k[i][1];
      return typeof a === 'number' ? lerp(a, b, v) : [lerp(a[0], b[0], v), lerp(a[1], b[1], v)];
    }
    return k[k.length - 1][1];
  }
  function mv(node, x, y, extra) { node.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')' + (extra || '')); }
  function op(node, v) { node.setAttribute('opacity', clamp(v).toFixed(3)); }

  /* ================= Tactics board ================= */
  // A live board of Sir Alex's Treble-era 4-4-2. Before each play he draws it in marker and gives the
  // team talk. All 22 players keep their shape and shift with the ball. The 7 sees his options before
  // the cross, the board zooms in on the box, and the ball's shadow shows its height. After the goal
  // the team runs to the corner, then the magnets slide back for the next play.
  // Two plays, both down the right wing: wide to the byline and cross; then a one-two and an early ball.
  function tactics(svg, light) {
    var css = getComputedStyle(root);
    function v(name, def) { return (css.getPropertyValue(name) || '').trim() || def; }
    var PITCH = v('--pitch', '#173d2c'), CHALK = v('--chalk', '#f3efe4'), GOLD = v('--gold', '#e6d38a'), RED = v('--red', '#c8463c');
    var ME = light ? { fill: '#f6f6f3', stroke: '#151515', num: '#151515' } : { fill: RED, stroke: CHALK, num: CHALK };
    var ui = {
      score: move.querySelector('.mv-score'), clock: move.querySelector('.mv-clock'),
      cap: move.querySelector('.mv-cap'), wing: move.querySelector('.mv-wing')
    };

    // Point tables: sample a curve once, then read it by distance along it (even speed).
    function cubic(a, b, c, d, t) { var s = 1 - t; return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d; }
    function track(segs) {
      var pts = [], len = [0];
      segs.forEach(function (g, gi) {
        for (var i = gi ? 1 : 0; i <= 30; i++) {
          var t = i / 30;
          pts.push(g.length === 2 ? [lerp(g[0][0], g[1][0], t), lerp(g[0][1], g[1][1], t)] : g.length === 3
            ? [lerp(lerp(g[0][0], g[1][0], t), lerp(g[1][0], g[2][0], t), t), lerp(lerp(g[0][1], g[1][1], t), lerp(g[1][1], g[2][1], t), t)]
            : [cubic(g[0][0], g[1][0], g[2][0], g[3][0], t), cubic(g[0][1], g[1][1], g[2][1], g[3][1], t)]);
          if (pts.length > 1) { var p = pts[pts.length - 2], q = pts[pts.length - 1]; len.push(len[len.length - 1] + Math.hypot(q[0] - p[0], q[1] - p[1])); }
        }
      });
      var total = len[len.length - 1];
      return {
        pts: pts,
        at: function (s) {
          var d = clamp(s) * total, i = 1;
          while (i < len.length - 1 && len[i] < d) i++;
          var f = (d - len[i - 1]) / ((len[i] - len[i - 1]) || 1);
          return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
        },
        upTo: function (s) {
          var d = clamp(s) * total, out = [pts[0]];
          for (var i = 1; i < pts.length && len[i] <= d; i++) out.push(pts[i]);
          if (s > 0 && s < 1) out.push(this.at(s));
          return out;
        }
      };
    }
    function pathD(list) { return list.length < 2 ? '' : 'M' + list.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L'); }

    // Sir Alex's 4-4-2 of the Treble years: two wingers on the touchlines, two strikers who play off each other.
    var HOME = {
      us: [[38, 123], [112, 58], [104, 102], [104, 144], [112, 190], [200, 34], [178, 104], [186, 146], [252, 104], [258, 140], [150, 218]],
      them: [[168, 86], [160, 132], [252, 52], [246, 92], [244, 134], [302, 70], [296, 98], [213, 213], [274, 228], [300, 146], [338, 123]]
    };
    // Named players. us: 0 keeper, 5 the left winger (11), 7 a centre midfielder, 8 and 9 the strikers (19 and 9),
    // 10 the right winger (the 7, you). them: 7 and 8 defend the right wing, 9 centre-back, 10 keeper.
    var LW = 5, P8 = 7, P19 = 8, P9 = 9, P7 = 10, D1 = 7, D2 = 8, CB = 9, GK = 10;
    function line(a, b) { return track([[a, b]]); }

    var PLAYS = [
      { // Wide to the byline: beat two, cross; the 9 near post, the 19 far post, the 11 at the back post.
        wing: 'Byline cross', cap: 'Fergie-time winner · Assist: <b>Abdullah</b>',
        run: track([[[150, 218], [175, 218], [190, 227], [215, 227]], [[215, 227], [245, 227], [255, 216], [275, 216]], [[275, 216], [296, 216], [308, 223], [322, 222]]]),
        runKeys: [[.10, 0], [.17, .25], [.22, .42, 'lin'], [.30, .62], [.36, .8, 'lin'], [.44, 1, 'out']],
        flight: track([[[326, 220], [338, 168], [316, 126]]]), fly: [.44, .52], lift: 16,
        finish: line([316, 126], [346, 119]), hit: [.525, .555],
        goal: .555,
        nine: [[0, [258, 140]], [.28, [260, 140]], [.40, [292, 134]], [.50, [316, 128], 'out'], [.56, [321, 126]], [.69, [328, 210]], [.82, [328, 210]], [.95, [258, 140]]],
        jump: [[.48, 1], [.515, 1.4, 'out'], [.55, 1, 'in']],
        nineteen: [[0, [252, 104]], [.30, [254, 104]], [.50, [326, 98]], [.58, [328, 100]]],
        eleven: [[0, [200, 34]], [.28, [204, 34]], [.52, [300, 70]]],
        eight: [[0, [186, 146]], [.25, [190, 146]], [.48, [280, 164]]],
        d1: [[0, [213, 213]], [.14, [208, 214]], [.19, [197, 223], 'out'], [.25, [194, 229]], [.58, [214, 224]]],
        d2: [[.24, [274, 228]], [.30, [279, 219], 'out'], [.36, [268, 224]], [.58, [292, 214]]],
        beat: [[.18, 0], [.23, 1], [.30, 1], [.35, 2]],
        cb: [[.38, [300, 146]], [.52, [309, 133], 'out']],
        gk: [[.44, [338, 123]], [.50, [337, 121]], [.555, [339, 112], 'out']], dive: [[.52, 0], [.56, 1, 'out']],
        options: [[P9, [316, 128]], [P19, [326, 98]], [P8, [280, 164]]],
        note: '4-4-2 · get to the byline',
        plan: [{ k: 'run', a: .06, b: .32, off: -4 }, { k: 'flight', a: .32, b: .4 }, { tr: line([262, 140], [314, 129]), a: .4, b: .46 }, { tr: line([256, 104], [322, 98]), a: .46, b: .52 }]
      },
      { // A one-two with the 19, then an early ball from deep before the defence can turn; the 9 at the far post.
        wing: 'One-two, early ball', cap: 'Fergie-time winner · Assist: <b>Abdullah</b>',
        run: track([[[150, 218], [170, 218], [185, 224], [205, 225]], [[205, 225], [225, 226], [245, 222], [264, 218]]]),
        runKeys: [[.10, 0], [.18, .4], [.30, .86, 'lin'], [.36, 1, 'out']],
        wall: { out: [.18, .22], back: [.23, .29], at: [236, 198] },
        flight: track([[[268, 216], [318, 176], [326, 103]]]), fly: [.37, .46], lift: 14,
        finish: line([326, 103], [347, 115]), hit: [.465, .49],
        goal: .49,
        nine: [[0, [258, 140]], [.30, [262, 138]], [.38, [300, 118]], [.46, [326, 103], 'out'], [.50, [330, 104]], [.62, [328, 210]], [.82, [328, 210]], [.95, [258, 140]]],
        jump: [[.43, 1], [.455, 1.4, 'out'], [.49, 1, 'in']],
        nineteen: [[0, [252, 104]], [.08, [252, 106]], [.20, [236, 198]], [.24, [238, 196]], [.30, [264, 170]], [.44, [302, 128]]],
        eleven: [[0, [200, 34]], [.26, [204, 34]], [.46, [296, 76]]],
        eight: [[0, [186, 146]], [.22, [200, 160]], [.44, [276, 168]]],
        d1: [[0, [213, 213]], [.16, [210, 216]], [.21, [206, 221], 'out'], [.28, [214, 223]], [.58, [230, 218]]],
        d2: [[.24, [274, 228]], [.36, [272, 219], 'out'], [.58, [290, 214]]],
        beat: [[.22, 0], [.27, 1]],
        cb: [[.30, [300, 146]], [.44, [316, 146], 'out']],
        gk: [[.37, [338, 123]], [.44, [338, 117]], [.49, [340, 108], 'out']], dive: [[.46, 0], [.50, 1, 'out']],
        options: [[P9, [326, 103]], [P19, [302, 128]], [P8, [276, 168]]],
        note: '4-4-2 · one-two, cross early',
        plan: [{ k: 'run', a: .06, b: .28, off: -4 }, { tr: line([202, 220], [234, 200]), a: .28, b: .32 }, { tr: line([238, 202], [256, 218]), a: .32, b: .36 },
          { k: 'flight', a: .36, b: .44 }, { tr: line([262, 136], [322, 104]), a: .44, b: .52 }]
      }
    ];

    // ---- Build ----
    var cam = el('g', {}, svg);
    var lines = el('g', { fill: 'none', stroke: CHALK, 'stroke-opacity': .16, 'stroke-width': 1.2 }, cam);
    ['M12 14 H348 V232 H12 Z', 'M180 14 V232', 'M348 58.5 H295.2 V187.5 H348 M348 93.7 H330.4 V152.3 H348', 'M295.2 99.6 A29.3 29.3 0 0 0 295.2 146.4',
      'M12 58.5 H64.8 V187.5 H12 M12 93.7 H29.6 V152.3 H12', 'M64.8 99.6 A29.3 29.3 0 0 1 64.8 146.4', 'M12 22 A8 8 0 0 0 20 14 M340 14 A8 8 0 0 0 348 22 M20 232 A8 8 0 0 0 12 224 M348 224 A8 8 0 0 0 340 232'
    ].forEach(function (d) { el('path', { d: d }, lines); });
    el('circle', { cx: 180, cy: 123, r: 29.3 }, lines);
    [[180, 123], [312.8, 123], [47.2, 123]].forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 1.4, fill: CHALK, 'fill-opacity': .3, stroke: 'none' }, cam); });
    el('rect', { x: 6, y: 111.3, width: 6, height: 23.4, rx: 1, fill: 'none', stroke: CHALK, 'stroke-opacity': .35, 'stroke-width': 1.2 }, cam);
    // Old Trafford: the four stands around the board, and the ground's name around the centre circle.
    // The 7 attacks the Stretford End, which bounces when the ball goes in.
    var NAMES = { fill: CHALK, opacity: .4, 'text-anchor': 'middle', font: 'cond', 'font-size': 5.5, 'letter-spacing': 1.4 };
    function stand(text, x, y, turn) {
      var a = {}; for (var k in NAMES) a[k] = NAMES[k];
      a.transform = 'translate(' + x + ' ' + y + ')' + (turn ? ' rotate(' + turn + ')' : '');
      a.y = 2;
      return el('text', a, cam, text);
    }
    stand('SIR ALEX FERGUSON STAND', 180, 7);
    stand('SIR BOBBY CHARLTON STAND', 96, 239);
    stand('EAST STAND', 4, 123, -90);
    var stretford = stand('STRETFORD END', 356.5, 123, 90);
    var crowd = [];
    [[18, 88], [158, 228]].forEach(function (r) {
      for (var y = r[0], i = 0; y <= r[1]; y += 7, i++) {
        crowd.push(el('circle', { cx: 357 + (i % 2 ? .8 : -.8), cy: y, r: 1.3, fill: [RED, CHALK, '#151515'][i % 3], opacity: .3 }, cam));
      }
    });
    var ring = el('defs', {}, cam);
    el('path', { id: 'ot-ring-top', d: 'M147 123 A33 33 0 0 1 213 123' }, ring);
    el('path', { id: 'ot-ring-bot', d: 'M143.5 123 A36.5 36.5 0 0 0 216.5 123' }, ring);
    [['ot-ring-top', 'OLD TRAFFORD'], ['ot-ring-bot', 'THEATRE OF DREAMS']].forEach(function (r) {
      var t = el('text', { fill: CHALK, opacity: .22, font: 'cond', 'font-size': 5, 'letter-spacing': 1.6, 'text-anchor': 'middle' }, cam);
      el('textPath', { href: '#' + r[0], startOffset: '50%' }, t, r[1]);
    });
    // The fourth official's board at halfway: three minutes added. Fergie time.
    var added = el('g', { opacity: 0 }, cam);
    el('rect', { x: -12, y: -5.5, width: 24, height: 11, rx: 1.5, fill: '#141414', stroke: '#3a3a3a', 'stroke-width': .8 }, added);
    el('text', { y: 2.6, 'text-anchor': 'middle', font: 'cond', 'font-size': 8, 'letter-spacing': .6, fill: '#ff5a4e' }, added, '+3');
    mv(added, 180, 239);
    var net = el('rect', { x: 348, y: 111.3, width: 6, height: 23.4, rx: 1, fill: GOLD, 'fill-opacity': 0, stroke: CHALK, 'stroke-opacity': .45, 'stroke-width': 1.2 }, cam);
    var ripples = [0, 1].map(function () { return el('circle', { cx: 351, cy: 123, r: 4, fill: 'none', stroke: GOLD, 'stroke-width': 1.4, opacity: 0 }, cam); });

    var options = [0, 1, 2].map(function () { return el('path', { fill: 'none', stroke: CHALK, 'stroke-width': 1, 'stroke-dasharray': '1.5 3', 'stroke-linecap': 'round', opacity: 0 }, cam); });
    // Sir Alex's plan, drawn in red marker before each play. It stays, faint, while the 7 runs it.
    var MARKER = '#e0372b';
    var plan = [0, 1, 2, 3, 4].map(function () { return el('path', { fill: 'none', stroke: MARKER, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, cam); });
    var heads = [0, 1, 2, 3, 4].map(function () { return el('path', { fill: 'none', stroke: MARKER, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, cam); });
    var note = el('text', { x: 24, y: 226, font: 'hand', 'font-size': 11, fill: MARKER, opacity: 0 }, cam, '');
    var trail = el('path', { fill: 'none', stroke: CHALK, 'stroke-width': 1.4, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round', opacity: .6 }, cam);
    var arc = el('path', { fill: 'none', stroke: GOLD, 'stroke-width': 1.5, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round', opacity: .9 }, cam);

    function dot(team, num) {
      var g = el('g', {}, cam);
      var big = num != null;
      var body = team === 'us'
        ? el('ellipse', { rx: big ? 6.5 : 4.5, ry: big ? 6.5 : 4.5, fill: CHALK, 'fill-opacity': big ? 1 : .7 }, g)
        : el('ellipse', { rx: 5, ry: 5, fill: PITCH, stroke: CHALK, 'stroke-opacity': .42, 'stroke-width': 1.4 }, g);
      if (big) el('text', { y: 3, 'text-anchor': 'middle', font: 'cond', 'font-size': 9, fill: PITCH }, g, num);
      return { g: g, body: body };
    }
    var us = HOME.us.map(function (p, i) { return dot('us', i === P9 ? '9' : i === P19 ? '19' : i === LW ? '11' : null); });
    var them = HOME.them.map(function () { return dot('them'); });
    // The 7: kit colour, a soft gold ring, and a name tag at the start.
    var halo = el('circle', { r: 11, fill: 'none', stroke: GOLD, 'stroke-width': 1, opacity: .4 }, cam);
    cam.insertBefore(halo, us[P7].g);
    us[P7].body.setAttribute('rx', 7); us[P7].body.setAttribute('ry', 7);
    us[P7].body.setAttribute('fill', ME.fill); us[P7].body.setAttribute('fill-opacity', 1);
    us[P7].body.setAttribute('stroke', ME.stroke); us[P7].body.setAttribute('stroke-width', 1.4);
    el('text', { y: 3.2, 'text-anchor': 'middle', font: 'cond', 'font-size': 9, fill: ME.num }, us[P7].g, '7');
    var tag = el('text', { 'text-anchor': 'middle', font: 'cond', 'font-size': 7, 'letter-spacing': .8, fill: CHALK, opacity: 0 }, cam, 'ABDULLAH');
    var shadow = el('ellipse', { rx: 2.8, ry: 1.8, fill: '#000', 'fill-opacity': .3 }, cam);
    // '#ffffff', not '#fff': styles.css repaints [fill="#fff"] in site icons.
    var ball = el('circle', { r: 2.8, fill: '#ffffff', stroke: PITCH, 'stroke-width': 1 }, cam);

    // The marker pen in Sir Alex's hand.
    var pen = el('g', { opacity: 0 }, cam);
    el('rect', { x: -1.8, y: -16, width: 3.6, height: 13, rx: 1, fill: '#151515', stroke: CHALK, 'stroke-width': .6 }, pen);
    el('path', { d: 'M-1.8 -3 L0 0 L1.8 -3 Z', fill: MARKER }, pen);
    el('rect', { x: -1.8, y: -16, width: 3.6, height: 3, rx: 1, fill: MARKER }, pen);

    // The team talk: a card with Sir Alex and what he says. First the 2003 quote, then the hair dryer.
    var heat = el('g', { opacity: 0 }, cam);
    var waves = [118, 152, 186, 220, 254].map(function (x, k) {
      var d = 'M' + x + ' 62';
      for (var y = 62; y < 104; y += 7) d += ' q ' + (k % 2 ? 4 : -4) + ' 3.5 0 7';
      return el('path', { d: d, fill: 'none', stroke: k % 2 ? GOLD : '#ff7a45', 'stroke-width': 1.3, 'stroke-linecap': 'round', 'stroke-dasharray': '5 4' }, heat);
    });
    var talk = el('g', { opacity: 0 }, cam);
    var card = el('rect', { x: 78, y: 20, width: 204, height: 40, rx: 6, fill: '#141210', 'fill-opacity': .94, stroke: CHALK, 'stroke-opacity': .25 }, talk);
    // Sir Alex: silver hair, dark coat; his face reddens for the hair dryer.
    var saf = el('g', { transform: 'translate(98 38)' }, talk);
    el('path', { d: 'M-11 13 Q-11 4 0 4 Q11 4 11 13 Z', fill: '#1d2026' }, saf);
    el('path', { d: 'M-2.5 5 L0 9 L2.5 5 Z', fill: '#f3efe4' }, saf);
    el('circle', { r: 7, cy: -3, fill: '#e9bc9c' }, saf);
    var flush = el('circle', { r: 7, cy: -3, fill: '#e2604a', opacity: 0 }, saf);
    el('path', { d: 'M-7.2 -4 Q-7.5 -11.5 0 -11.5 Q7.5 -11.5 7.2 -4 Q5 -8 0 -8.2 Q-5 -8 -7.2 -4 Z', fill: '#d8d8d4' }, saf);
    el('text', { y: 18.5, 'text-anchor': 'middle', font: 'cond', 'font-size': 4.6, 'letter-spacing': .5, fill: GOLD }, saf, 'SIR ALEX');
    var say = el('g', {}, talk);
    el('text', { x: 116, y: 34, font: 'cond', 'font-size': 8.6, fill: CHALK }, say, '“It’s getting tickly now –');
    el('text', { x: 116, y: 44.5, font: 'cond', 'font-size': 8.6, fill: CHALK }, say, 'squeaky-bum time, I call it.”');
    el('text', { x: 116, y: 53.5, font: 'cond', 'font-size': 4.8, 'letter-spacing': .8, fill: GOLD, opacity: .85 }, say, 'SIR ALEX FERGUSON · THE 2003 TITLE RACE');
    var shout = el('g', { opacity: 0 }, talk);
    el('text', { x: 194, y: 46, 'text-anchor': 'middle', font: 'cond', 'font-size': 17, 'letter-spacing': 1, fill: '#ffffff' }, shout, 'IT’S FERGIE TIME!');

    // ---- Draw ----
    var TALK = .355; // 5.5 s of each 15.5 s play
    var shown = {};
    function setText(node, key, html) { if (node && shown[key] !== html) { shown[key] = html; node.innerHTML = html; } }
    function draw(u) {
      var pi = u < .5 ? 0 : 1, P = PLAYS[pi], raw = (u - pi * .5) * 2;
      // Each play opens with the team talk (the first TALK of it); the play itself runs on w in 0..1.
      var talking = raw < TALK, pl = talking ? raw / TALK : 1, w = talking ? 0 : (raw - TALK) / (1 - TALK);
      var hair = talking ? keys(pl, [[.56, 0], [.62, 1], [.9, 1], [.96, 0]]) : 0;
      function put(node, p, extra) { mv(node, p[0], p[1], extra); }

      // Ball, on the ground and in the air.
      var sRun = keys(w, P.runKeys), seven = P.run.at(sRun), b, h = 0;
      if (w < .04) b = [192, 146];
      else if (w < .10) b = keys(w, [[.04, [192, 146]], [.10, [150, 218], 'out']]);
      else if (P.wall && w >= P.wall.out[0] && w < P.wall.back[1]) {
        // The one-two: out to the 19, and first time back into the 7's run.
        var o0 = P.run.at(keys(P.wall.out[0], P.runKeys)), o1 = P.run.at(keys(P.wall.back[1], P.runKeys));
        b = w < P.wall.out[1] ? keys(w, [[P.wall.out[0], [o0[0] + 6, o0[1] - 1]], [P.wall.out[1], P.wall.at, 'lin']])
          : w < P.wall.back[0] ? P.wall.at : keys(w, [[P.wall.back[0], P.wall.at], [P.wall.back[1], [o1[0] + 6, o1[1] - 1], 'lin']]);
      }
      else if (w < P.fly[0]) b = [seven[0] + 6, seven[1] - 1];
      else if (w < P.fly[1]) { var f = seg(w, P.fly[0], P.fly[1]); b = P.flight.at(f); h = Math.sin(Math.PI * f) * P.lift; }
      else if (P.finish && w < P.hit[1]) b = P.finish.at(seg(w, P.hit[0], P.hit[1]));
      else b = P.finish ? P.finish.at(1) : P.flight.at(1);
      var reset = keys(w, [[.84, 0], [.95, 1]]);
      if (w >= .84) b = [lerp(b[0], 192, reset), lerp(b[1], 146, reset)];
      var scored = w >= P.goal && w < .95;

      // Celebration: everyone but the keeper runs to the corner, then the board resets.
      var party = keys(w, [[P.goal + .03, 0], [P.goal + .14, 1], [.82, 1], [.93, 0]]);
      var corner = [328, 214];

      // Team shape: off-ball players slide with the ball.
      var sx = (b[0] - 200), sy = (b[1] - 123);
      us.forEach(function (d, i) {
        var hm = HOME.us[i], p = [hm[0] + sx * .1, hm[1] + sy * .14];
        if (i === P7) {
          p = seven;
          if (w >= P.fly[0]) p = [lerp(seven[0], seven[0] + 6, seg(w, P.fly[0], P.goal)), seven[1]];
        } else if (i === P9) p = keys(w, P.nine);
        else if (i === P19) p = keys(w, P.nineteen);
        else if (i === LW) p = keys(w, P.eleven);
        else if (i === P8) p = keys(w, P.eight);
        else if (i === 0) p = [hm[0] + sx * .04, hm[1] + sy * .1];
        if (i !== 0 && i !== P9) {
          var a = i * 2.4, r = i === P7 ? 0 : 9 + (i % 3) * 5;
          var c = [corner[0] + Math.cos(a) * r, corner[1] + Math.sin(a) * r * .55];
          p = [lerp(p[0], c[0], party), lerp(p[1], c[1], party)];
        }
        if (w > .84 && i !== P9) p = [lerp(p[0], hm[0], reset), lerp(p[1], hm[1], reset)];
        var wob = (i === P7 || i === P9 ? 0 : Math.sin(u * 40 + i) * .6) + Math.sin(u * 900 + i * 2) * hair * .9;
        put(d.g, [p[0] + wob, p[1]], i === P9 ? ' scale(' + keys(w, P.jump || [[0, 1]]).toFixed(3) + ')' : '');
        if (i === P7) {
          put(halo, p);
          halo.setAttribute('r', (11 + Math.sin(u * 60) * 1.2).toFixed(2));
          op(halo, .25 + .2 * (1 - party));
          var ty = p[1];
          tag.setAttribute('x', p[0].toFixed(1)); tag.setAttribute('y', (ty < 60 ? ty + 19 : ty - 12).toFixed(1));
          op(tag, keys(w, [[.02, 0], [.07, .85], [.18, .85], [.24, 0]]));
        }
      });
      var beat = keys(w, P.beat);
      them.forEach(function (d, i) {
        var hm = HOME.them[i], p = [hm[0] + sx * .07, hm[1] + sy * .2], o = 1;
        if (i === D1) { p = keys(w, P.d1); o = 1 - .55 * clamp(beat); }
        else if (i === D2) { p = keys(w, P.d2); o = 1 - .55 * clamp(beat - 1); }
        else if (i === CB) p = w >= P.cb[0][0] ? keys(w, P.cb) : [hm[0] + sx * .04, hm[1] + sy * .1];
        else if (i === GK) {
          p = w >= P.gk[0][0] ? keys(w, P.gk) : [hm[0], hm[1] + sy * .08];
          var dv = keys(w, P.dive);
          d.body.setAttribute('rx', (5 - dv * 1.2).toFixed(2)); d.body.setAttribute('ry', (5 + dv * 4).toFixed(2));
        }
        if (w > P.goal) o = Math.min(o, lerp(1, .45, seg(w, P.goal, P.goal + .06)));
        if (w > .84) { p = [lerp(p[0], hm[0], reset), lerp(p[1], hm[1], reset)]; o = lerp(o, 1, reset); if (i === GK) { d.body.setAttribute('rx', 5); d.body.setAttribute('ry', 5); } }
        put(d.g, [p[0] + Math.sin(u * 900 + i) * hair * .9, p[1]]); op(d.g, o);
      });

      put(shadow, [b[0] + h * .35, b[1] + h * .5]);
      put(ball, [b[0], b[1] - h * .9]);
      ball.setAttribute('r', (2.8 + h * .09).toFixed(2));
      op(shadow, .2 + .1 * (1 - h / 16));

      // Chalk: the run, the options he sees, the ball's path.
      var fade = 1 - keys(w, [[.84, 0], [.9, 1]]);
      trail.setAttribute('d', pathD(P.run.upTo(sRun)));
      op(trail, .6 * fade);
      var fly = seg(w, P.fly[0], P.fly[1]);
      var arcPts = P.flight.upTo(fly);
      if (P.finish && w > P.hit[0]) arcPts = arcPts.concat(P.finish.upTo(seg(w, P.hit[0], P.hit[1])));
      arc.setAttribute('d', w > P.fly[0] ? pathD(arcPts) : '');
      op(arc, .9 * fade);
      var see = keys(w, [[P.fly[0] - .08, 0], [P.fly[0] - .04, 1], [P.fly[0], 1], [P.fly[0] + .03, 0]]);
      var pick = seg(w, P.fly[0] - .03, P.fly[0] - .01);
      options.forEach(function (o, k) {
        var opt = P.options[k];
        if (!opt) { op(o, 0); return; }
        var to = opt[1];
        o.setAttribute('d', 'M' + seven[0].toFixed(1) + ' ' + seven[1].toFixed(1) + ' L' + to[0] + ' ' + to[1]);
        var chosen = k === 0;
        o.setAttribute('stroke', chosen && pick > 0 ? GOLD : CHALK);
        op(o, see * (chosen ? .5 + .4 * pick : .45 * (1 - pick)));
      });

      // The fourth official holds up +3 before each play; the Stretford End bounces after the goal.
      op(added, talking ? keys(pl, [[.6, 0], [.66, 1]]) : keys(w, [[.16, 1], [.2, 0]]));

      // The plan: the run, then the ball, drawn with the pen; then it stays faint under the real run.
      var ink = talking ? .9 : .3 * (1 - keys(w, [[.84, 0], [.9, 1]])), tip = null;
      plan.forEach(function (path, k) {
        var it = P.plan[k];
        if (!it) { path.setAttribute('d', ''); heads[k].setAttribute('d', ''); return; }
        var r = it.tr || P[it.k], amount = talking ? seg(pl, it.a, it.b) : 1;
        var pts = r.upTo(amount).map(function (q, j) {
          // A hand-drawn line: a little off the real path, and not quite straight.
          return [q[0], q[1] + (it.off || 0) + Math.sin(j * .6 + k) * 1.1];
        });
        path.setAttribute('d', amount > 0 ? pathD(pts) : '');
        op(path, ink);
        if (amount >= 1 && pts.length > 2) {
          var a = pts[pts.length - 1], b = pts[pts.length - 3], ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
          var l = [a[0] - 6 * Math.cos(ang - .5), a[1] - 6 * Math.sin(ang - .5)], rr = [a[0] - 6 * Math.cos(ang + .5), a[1] - 6 * Math.sin(ang + .5)];
          heads[k].setAttribute('d', 'M' + l[0].toFixed(1) + ' ' + l[1].toFixed(1) + ' L' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L' + rr[0].toFixed(1) + ' ' + rr[1].toFixed(1));
        } else heads[k].setAttribute('d', '');
        op(heads[k], ink);
        if (amount > 0 && amount < 1) tip = pts[pts.length - 1];
      });
      // The tactic, written in marker in the corner of the board.
      if (note.textContent !== P.note) note.textContent = P.note;
      op(note, talking ? .9 * seg(pl, .02, .06) : ink * 2);
      if (tip) mv(pen, tip[0], tip[1], ' rotate(28)');
      op(pen, tip ? 1 : 0);

      // The team talk card: it shakes during the hair dryer.
      var shake = hair ? ' translate(' + (Math.sin(u * 1300) * hair * 1.3).toFixed(2) + ' ' + (Math.cos(u * 1100) * hair * .8).toFixed(2) + ')' : '';
      talk.setAttribute('transform', shake);
      op(talk, talking ? keys(pl, [[.02, 0], [.06, 1], [.93, 1], [.99, 0]]) : 0);
      op(say, 1 - seg(pl, .55, .6));
      op(shout, hair);
      card.setAttribute('fill', hair > .5 ? '#a8261c' : '#141210');
      op(flush, hair);
      op(heat, hair * .85);
      waves.forEach(function (wv, k) { wv.setAttribute('stroke-dashoffset', (-u * 2600 - k * 3).toFixed(1)); });
      var roar = w >= P.goal && w < .9 ? 1 - seg(w, P.goal + .25, .9) : 0;
      stretford.setAttribute('fill', roar > 0 ? GOLD : CHALK);
      op(stretford, .4 + .6 * roar);
      crowd.forEach(function (c, k) {
        var hop = roar * Math.abs(Math.sin(u * 140 + k * 1.7));
        c.setAttribute('r', (1.3 + hop * .9).toFixed(2));
        op(c, .3 + .6 * roar);
      });
      // The net and the ripples.
      var n = seg(w, P.goal, P.goal + .1);
      net.setAttribute('fill-opacity', (w >= P.goal && w < .9 ? (n < .25 ? n * 1.4 : .35 - .2 * n) : 0).toFixed(3));
      net.setAttribute('stroke', w >= P.goal && w < .9 ? GOLD : CHALK);
      ripples.forEach(function (r, k) {
        var q = seg(w, P.goal + k * .03, P.goal + .12 + k * .03);
        r.setAttribute('r', (4 + q * 34).toFixed(1));
        op(r, q > 0 && q < 1 ? (1 - q) * .8 : 0);
      });

      // Camera: zoom into the box for the finish, then back out.
      var z = keys(w, [[P.fly[0] - .05, 0], [P.fly[0] + .05, 1], [P.goal + .06, 1], [P.goal + .16, 0]]);
      var fx = lerp(180, 305, z), fy = lerp(123, 165, z), sc = lerp(1, 1.6, z);
      cam.setAttribute('transform', 'translate(180 123) scale(' + sc.toFixed(3) + ') translate(' + (-fx).toFixed(2) + ' ' + (-fy).toFixed(2) + ')');

      // The board above and the caption below.
      var secs = Math.min(59, Math.floor(seg(w, 0, P.goal) * 60));
      setText(ui.clock, 'clock', scored ? '90+3′' : '92:' + String(secs).padStart(2, '0'));
      setText(ui.score, 'score', scored ? '1–0' : '0–0');
      move.classList.toggle('scored', scored);
      setText(ui.wing, 'wing', P.wing);
      setText(ui.cap, 'cap', P.cap);
      if (ui.cap) ui.cap.style.opacity = keys(w, [[P.goal + .03, 0], [P.goal + .08, 1], [.9, 1], [.95, 0]]).toFixed(3);
    }
    return { D: 31000, still: .41, draw: draw, label: 'Tactics board at Old Trafford. Sir Alex Ferguson draws the plan: “It’s getting tickly now – squeaky-bum time, I call it.” Then: “It’s Fergie time!” In his 4-4-2, the 7 runs down the right wing to the byline and crosses, and the 9 heads in a Fergie-time winner. Then the 7 plays a one-two with the 19 and crosses early for the 9.' };
  }

  var osReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function calm() { return osReduce || root.classList.contains('calm'); }
  var svg, s, t = 0, last = 0, seen = true, once = false;
  function build() {
    var fresh = document.createElementNS(NS, 'svg');
    fresh.setAttribute('viewBox', '0 0 360 246');
    fresh.setAttribute('width', 360);
    fresh.setAttribute('height', 246);
    fresh.setAttribute('role', 'img');
    var old = move.querySelector('svg');
    if (old) old.replaceWith(fresh); else move.appendChild(fresh);
    svg = fresh;
    s = tactics(svg, root.dataset.theme === 'light');
    svg.setAttribute('aria-label', s.label);
    show();
  }
  function running() { return (!calm() || once) && seen && !document.hidden && root.dataset.mode === 'match'; }
  function show() { s.draw(calm() && !once ? s.still : (t % s.D) / s.D); }
  function frame(now) {
    var dt = Math.min(now - last, 100);
    last = now;
    if (running()) {
      t += dt;
      // Calm: a click plays the scene once, then it rests on the goal frame.
      if (once && t >= s.D) { once = false; t = 0; }
      show();
    }
    requestAnimationFrame(frame);
  }
  build();
  // ?heroT=0.41 holds the scene on one moment of its loop, for screenshots and review.
  var hold = parseFloat(new URLSearchParams(location.search).get('heroT'));
  if (hold >= 0 && hold < 1) { s.draw(hold); return; }
  move.addEventListener('click', function () { t = 0; if (calm()) once = true; show(); });
  document.addEventListener('modechange', function () { if (root.dataset.mode === 'match') { t = 0; show(); } });
  // The pitch colour comes from the mode and the theme, so a change of either rebuilds the scene.
  new MutationObserver(build).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });
  new MutationObserver(show).observe(root, { attributes: true, attributeFilter: ['class'] });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { seen = e[e.length - 1].isIntersecting; }, { threshold: 0.3 }).observe(move);
  requestAnimationFrame(function (now) { last = now; frame(now); });
})();
