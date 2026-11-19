// Matchday hero: the tactics board in #move. The 7 runs the wing, sees his options and crosses, and the
// 9 heads in a Fergie-time winner. The next play cuts in from the left wing and curls into the far corner.
//   ?heroT=0.36  Holds the scene on one moment of its loop (for screenshots).
// The scene is a draw(u) function for u in 0..1 of one loop. The loop runs only while the scene is on
// the screen, the tab is visible and Matchday is showing. With Calm or reduced motion, the scene shows
// its goal frame, and a click plays it once.
(function () {
  var move = document.getElementById('move');
  if (!move) return;
  var root = document.documentElement;

  var NS = 'http://www.w3.org/2000/svg';
  var FONTS = { cond: 'font-family: var(--cond); font-weight: 700' };
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
  // A live board. All 22 players keep their shape and shift with the ball. The 7 sees his
  // options before the cross, the board zooms in on the box, and the ball's shadow shows its height.
  // After the goal the team runs to the corner, then the magnets slide back for the next play.
  // Plays alternate: right wing (cross, the 9 heads in), then left wing (cut inside, far corner).
  // Positions are written for an attack along the bottom touchline; the left-wing play mirrors them.
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

    var HOME = {
      us: [[38, 123], [118, 62], [112, 104], [112, 142], [124, 186], [196, 48], [186, 104], [192, 146], [262, 72], [250, 104], [150, 218]],
      them: [[168, 86], [160, 132], [252, 52], [246, 92], [244, 134], [302, 70], [296, 98], [213, 213], [274, 228], [300, 146], [338, 123]]
    };
    // Named players. us: 0 keeper, 7 the 8, 8 the 10, 9 the 9, 10 the 7 (you). them: 7 and 8 full-backs, 9 centre-back, 10 keeper.
    var P7 = 10, P9 = 9, P10 = 8, P8 = 7, D1 = 7, D2 = 8, CB = 9, GK = 10;

    var PLAYS = [
      { // Right wing: two defenders beaten, cross, the 9 heads in.
        wing: 'Right wing', cap: 'Fergie-time winner · Assist: <b>Abdullah</b>',
        run: track([[[150, 218], [175, 218], [190, 227], [215, 227]], [[215, 227], [245, 227], [255, 216], [275, 216]], [[275, 216], [296, 216], [308, 223], [322, 222]]]),
        runKeys: [[.10, 0], [.17, .25], [.22, .42, 'lin'], [.30, .62], [.36, .8, 'lin'], [.44, 1, 'out']],
        flight: track([[[326, 220], [338, 168], [316, 126]]]), fly: [.44, .52], lift: 16,
        finish: track([[[316, 126], [346, 119]]]), hit: [.525, .555],
        goal: .555,
        nine: [[0, [250, 104]], [.28, [252, 106]], [.40, [290, 114]], [.50, [316, 124], 'out'], [.56, [321, 124]], [.69, [328, 210]], [.82, [328, 210]], [.95, [250, 104]]],
        jump: [[.48, 1], [.515, 1.4, 'out'], [.55, 1, 'in']],
        ten: [[.30, [262, 72]], [.50, [326, 96]], [.58, [328, 98]]],
        eight: [[.25, [192, 146]], [.48, [280, 164]]],
        d1: [[0, [213, 213]], [.14, [208, 214]], [.19, [197, 223], 'out'], [.25, [194, 229]], [.58, [214, 224]]],
        d2: [[.24, [274, 228]], [.30, [279, 219], 'out'], [.36, [268, 224]], [.58, [292, 214]]],
        beat: [[.18, 0], [.23, 1], [.30, 1], [.35, 2]],
        cb: [[.38, [300, 146]], [.52, [309, 133], 'out']],
        gk: [[.44, [338, 123]], [.50, [337, 121]], [.555, [339, 112], 'out']], dive: [[.52, 0], [.56, 1, 'out']],
        options: [[P9, [316, 124]], [P10, [326, 96]], [P8, [280, 164]]]
      },
      { // Left wing (mirrored): beat one, cut inside, curl it into the far top corner.
        wing: 'Left wing', cap: 'Fergie-time winner · Goal: <b>Abdullah</b>',
        run: track([[[150, 218], [175, 218], [190, 227], [215, 227]], [[215, 227], [238, 227], [252, 214], [266, 198]], [[266, 198], [274, 189], [280, 181], [286, 176]]]),
        runKeys: [[.10, 0], [.17, .27], [.23, .48, 'lin'], [.40, 1, 'out']],
        flight: track([[[292, 173], [312, 120], [348, 115]]]), fly: [.42, .5], lift: 11,
        goal: .5,
        nine: [[0, [250, 104]], [.22, [252, 106]], [.36, [322, 150]], [.46, [334, 151], 'out'], [.52, [334, 151]], [.66, [328, 210]], [.82, [328, 210]], [.95, [250, 104]]],
        ten: [[.24, [262, 72]], [.44, [300, 92]]],
        eight: [[.22, [192, 146]], [.44, [262, 178]]],
        d1: [[0, [213, 213]], [.14, [208, 214]], [.19, [197, 223], 'out'], [.25, [194, 229]], [.58, [222, 214]]],
        d2: [[.24, [274, 228]], [.40, [282, 212]]],
        beat: [[.18, 0], [.23, 1]],
        cb: [[.30, [300, 146]], [.42, [306, 144], 'out'], [.48, [296, 160], 'out']],
        gk: [[.40, [338, 123]], [.46, [338, 126]], [.51, [340, 116], 'out']], dive: [[.47, 0], [.52, 1, 'out']],
        options: [[null, [348, 115]]]
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
    var net = el('rect', { x: 348, y: 111.3, width: 6, height: 23.4, rx: 1, fill: GOLD, 'fill-opacity': 0, stroke: CHALK, 'stroke-opacity': .45, 'stroke-width': 1.2 }, cam);
    var ripples = [0, 1].map(function () { return el('circle', { cx: 351, cy: 123, r: 4, fill: 'none', stroke: GOLD, 'stroke-width': 1.4, opacity: 0 }, cam); });

    var options = [0, 1, 2].map(function () { return el('path', { fill: 'none', stroke: CHALK, 'stroke-width': 1, 'stroke-dasharray': '1.5 3', 'stroke-linecap': 'round', opacity: 0 }, cam); });
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
    var us = HOME.us.map(function (p, i) { return dot('us', i === P9 ? '9' : null); });
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

    // ---- Draw ----
    var shown = {};
    function setText(node, key, html) { if (node && shown[key] !== html) { shown[key] = html; node.innerHTML = html; } }
    function draw(u) {
      var pi = u < .5 ? 0 : 1, P = PLAYS[pi], w = (u - pi * .5) * 2, flip = pi === 1;
      function Y(y) { return flip ? 246 - y : y; }
      function put(node, p, extra) { mv(node, p[0], Y(p[1]), extra); }

      // Ball, on the ground and in the air.
      var sRun = keys(w, P.runKeys), seven = P.run.at(sRun), b, h = 0;
      if (w < .04) b = [192, 146];
      else if (w < .10) b = keys(w, [[.04, [192, 146]], [.10, [150, 218], 'out']]);
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
        else if (i === P10 && w >= P.ten[0][0]) p = keys(w, P.ten);
        else if (i === P8 && w >= P.eight[0][0]) p = keys(w, P.eight);
        else if (i === 0) p = [hm[0] + sx * .04, hm[1] + sy * .1];
        if (i !== 0 && i !== P9) {
          var a = i * 2.4, r = i === P7 ? 0 : 9 + (i % 3) * 5;
          var c = [corner[0] + Math.cos(a) * r, corner[1] + Math.sin(a) * r * .55];
          p = [lerp(p[0], c[0], party), lerp(p[1], c[1], party)];
        }
        if (w > .84 && i !== P9) p = [lerp(p[0], hm[0], reset), lerp(p[1], hm[1], reset)];
        var wob = i === P7 || i === P9 ? 0 : Math.sin(u * 40 + i) * .6;
        put(d.g, [p[0] + wob, p[1]], i === P9 ? ' scale(' + keys(w, P.jump || [[0, 1]]).toFixed(3) + ')' : '');
        if (i === P7) {
          put(halo, p);
          halo.setAttribute('r', (11 + Math.sin(u * 60) * 1.2).toFixed(2));
          op(halo, .25 + .2 * (1 - party));
          var ty = Y(p[1]);
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
        put(d.g, p); op(d.g, o);
      });

      put(shadow, [b[0] + h * .35, b[1] + h * .5]);
      put(ball, [b[0], b[1] - h * .9]);
      ball.setAttribute('r', (2.8 + h * .09).toFixed(2));
      op(shadow, .2 + .1 * (1 - h / 16));

      // Chalk: the run, the options he sees, the ball's path.
      var fade = 1 - keys(w, [[.84, 0], [.9, 1]]);
      trail.setAttribute('d', pathD(P.run.upTo(sRun).map(function (q) { return [q[0], Y(q[1])]; })));
      op(trail, .6 * fade);
      var fly = seg(w, P.fly[0], P.fly[1]);
      var arcPts = P.flight.upTo(fly);
      if (P.finish && w > P.hit[0]) arcPts = arcPts.concat(P.finish.upTo(seg(w, P.hit[0], P.hit[1])));
      arc.setAttribute('d', w > P.fly[0] ? pathD(arcPts.map(function (q) { return [q[0], Y(q[1])]; })) : '');
      op(arc, .9 * fade);
      var see = keys(w, [[P.fly[0] - .08, 0], [P.fly[0] - .04, 1], [P.fly[0], 1], [P.fly[0] + .03, 0]]);
      var pick = seg(w, P.fly[0] - .03, P.fly[0] - .01);
      options.forEach(function (o, k) {
        var opt = P.options[k];
        if (!opt) { op(o, 0); return; }
        var to = opt[1];
        o.setAttribute('d', 'M' + seven[0].toFixed(1) + ' ' + Y(seven[1]).toFixed(1) + ' L' + to[0] + ' ' + Y(to[1]));
        var chosen = k === 0;
        o.setAttribute('stroke', chosen && pick > 0 ? GOLD : CHALK);
        op(o, see * (chosen ? .5 + .4 * pick : .45 * (1 - pick)));
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
      var fx = lerp(180, 305, z), fy = lerp(123, Y(165), z), sc = lerp(1, 1.6, z);
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
    return { D: 20000, still: .36, draw: draw, label: 'Tactics board. The 7 runs down the wing and crosses, and the 9 heads in a Fergie-time winner. Then the 7 cuts in from the left wing and scores.' };
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
  // ?heroT=0.36 holds the scene on one moment of its loop, for screenshots and review.
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
