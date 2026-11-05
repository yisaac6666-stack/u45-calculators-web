/* U-45 CALCULATORS v1.3 — #40 Calculus Visualiser (calc), #43 Differential-Equation Grapher (odeg). Original code. */
(function (G) {
  'use strict';
  const C = G.SpecCore, NUM = C.NUM, fs = C.fmtShort;
  const GK = G.SpecGK, D = G.SPEC_DEFS = G.SPEC_DEFS || {};
  const N = (v) => fs(v), TAU = 2 * Math.PI, numpad = GK.numpad;
  const dash = (g, d) => { if (g.setLineDash) g.setLineDash(d); };

  // ============================ #40 calc (monochrome) ============================
  const CA = {
    f: (S, x) => S.fn(0, { x }), g: (S, x) => S.fn(1, { x }),
    d: (S, x) => NUM.d1(t => CA.f(S, t), x), d2: (S, x) => NUM.d2(t => CA.f(S, t), x),
    dk(S, a, k) {
      if (k === 0) return CA.f(S, a); if (k === 1) return CA.d(S, a); if (k === 2) return CA.d2(S, a);
      const h = 0.02 * Math.max(1, Math.abs(a)) * (k > 4 ? 2 : 1); let s = 0, c = 1;
      for (let j = 0; j <= k; j++) { s += (j % 2 ? -1 : 1) * c * CA.f(S, a + (k / 2 - j) * h); c = c * (k - j) / (j + 1); }
      return s / Math.pow(h, k);
    },
    taylor(S, a, n, x) { let s = 0, fact = 1; for (let k = 0; k <= n; k++) { if (k) fact *= k; s += CA.dk(S, a, k) / fact * Math.pow(x - a, k); } return s; },
    riem(S, a, b, n, t) { n = Math.max(1, Math.round(n)); const h = (b - a) / n; let s = 0; for (let i = 0; i < n; i++) { const x0 = a + i * h; s += t === 'L' ? CA.f(S, x0) : t === 'R' ? CA.f(S, x0 + h) : t === 'M' ? CA.f(S, x0 + h / 2) : (CA.f(S, x0) + CA.f(S, x0 + h)) / 2; } return s * h; },
    newton(S, x, steps) { const out = [x]; for (let i = 0; i < (steps || 40); i++) { const d = CA.d(S, x); if (!d) break; const nx = x - CA.f(S, x) / d; out.push(nx); if (Math.abs(nx - x) < 1e-13 * (1 + Math.abs(x))) break; x = nx; } return out; },
    integ: (S, a, b) => NUM.simpson(t => CA.f(S, t), a, b, 1000),
    arclen: (S, a, b) => NUM.simpson(t => Math.hypot(1, CA.d(S, t)), a, b, 600),
  };
  const caVal = (S, c, x) => c === 0 ? CA.f(S, x) : c === 1 ? CA.d(S, x) : CA.d2(S, x);
  function caPanel(S) { const T = S.trace; if (!T) return; S.panel = [`${['f', 'f′', 'f″'][T.c]}(${N(T.x)}) = ${N(caVal(S, T.c, T.x))}`, `f=${N(CA.f(S, T.x))} f′=${N(CA.d(S, T.x))}`]; }
  function caDraw(S, g, P) {
    const W = S.win, ink = '#1d2318', O = S.ov; GK.axes(g, P, W, ink);
    if (O.riem) {
      const { a, b, n, t } = O.riem, h = (b - a) / n; g.fillStyle = 'rgba(29,35,24,.25)'; g.strokeStyle = ink; g.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const x0 = a + i * h;
        if (t === 'T') { g.beginPath(); g.moveTo(P.X(x0), P.Y(0)); g.lineTo(P.X(x0), P.Y(CA.f(S, x0))); g.lineTo(P.X(x0 + h), P.Y(CA.f(S, x0 + h))); g.lineTo(P.X(x0 + h), P.Y(0)); g.closePath(); g.fill(); g.stroke(); }
        else { const y = CA.f(S, t === 'L' ? x0 : t === 'R' ? x0 + h : x0 + h / 2), top = Math.min(P.Y(y), P.Y(0)), hh = Math.abs(P.Y(y) - P.Y(0)); g.fillRect(P.X(x0), top, P.X(x0 + h) - P.X(x0), hh); g.strokeRect(P.X(x0), top, P.X(x0 + h) - P.X(x0), hh); }
      }
    }
    if (O.area) { const { a, b, between } = O.area; g.fillStyle = 'rgba(29,35,24,.35)'; for (let px = Math.max(0, Math.floor(P.X(a))); px <= Math.min(P.w, P.X(b)); px += 2) { const x = P.x(px), y1 = CA.f(S, x), y0 = between ? CA.g(S, x) : 0; g.fillRect(px, Math.min(P.Y(y1), P.Y(y0)), 1, Math.abs(P.Y(y1) - P.Y(y0))); } }
    if (S.slots[0].on) S.plotY(g, P, x => CA.f(S, x), ink, 2);
    if (S.slots[1].on && S.slots[1].buf.src()) { dash(g, [2, 2]); S.plotY(g, P, x => CA.g(S, x), ink, 1.4); dash(g, []); }
    if (O.d1) { dash(g, [6, 3]); S.plotY(g, P, x => CA.d(S, x), ink, 1.2); dash(g, []); }
    if (O.d2) { dash(g, [1, 3]); S.plotY(g, P, x => CA.d2(S, x), ink, 1.2); dash(g, []); }
    if (O.tan) { const a = O.tan.a, y = CA.f(S, a), m = CA.d(S, a); S.plotY(g, P, x => y + m * (x - a), ink, 1); GK.dot(g, P, a, y, ink, 3); }
    if (O.sec) { const { a, b, c } = O.sec, ya = CA.f(S, a), m = (CA.f(S, b) - ya) / (b - a); S.plotY(g, P, x => ya + m * (x - a), ink, 1); GK.dot(g, P, a, ya, ink, 3); GK.dot(g, P, b, CA.f(S, b), ink, 3); if (c != null) { const yc = CA.f(S, c); S.plotY(g, P, x => yc + m * (x - c), ink, 0.8); GK.ring(g, P, c, yc, ink, 4); } }
    if (O.newton) { const xs = O.newton; for (let i = 0; i < xs.length - 1 && i < 8; i++) { const x = xs[i], y = CA.f(S, x); GK.seg(g, P, x, 0, x, y, ink, 0.8, [2, 2]); GK.seg(g, P, x, y, xs[i + 1], 0, ink, 1); GK.dot(g, P, xs[i + 1], 0, ink, 2.5); } }
    if (O.taylor) { const { a, n } = O.taylor; dash(g, [8, 2, 2, 2]); S.plotY(g, P, x => CA.taylor(S, a, n, x), ink, 1.3); dash(g, []); GK.ring(g, P, a, CA.f(S, a), ink, 4); }
    if (O.pts) O.pts.forEach(p => GK.ring(g, P, p[0], p[1], ink, 5));
    if (S.trace) { const T = S.trace, y = caVal(S, T.c, T.x); g.strokeStyle = ink; g.lineWidth = 1; g.strokeRect(P.X(T.x) - 4, P.Y(y) - 4, 8, 8); }
  }
  function caTools(S) {
    const ab = (title, extra, done) => S.openForm(title, [['a', 'a', 0], ['b', 'b', 2]].concat(extra || []), (S2, v) => { S2.view = 'graph'; done(S2, v); });
    const RS = (t, name) => ({ t: 'Riemann sum: ' + name, run: (S) => ab('RIEMANN ' + t, [['n', 'n', 8]], (S2, v) => { S2.ov.riem = { a: v.a, b: v.b, n: Math.max(1, Math.round(v.n)), t }; const r = CA.riem(S2, v.a, v.b, v.n, t), ex = CA.integ(S2, v.a, v.b); S2.ans = r; S2.panel = [`${name} n=${Math.round(v.n)}: ${N(r)}`, `∫ = ${N(ex)}  error ${N(r - ex)}`]; }) });
    return [
      { t: 'Show/hide f′ graph', run: (S) => { S.ov.d1 = !S.ov.d1; S.view = 'graph'; } }, { t: 'Show/hide f″ graph', run: (S) => { S.ov.d2 = !S.ov.d2; S.view = 'graph'; } },
      { t: 'Tangent line at a', run: (S) => S.openForm('TANGENT', [['a', 'a', 1]], (S2, v) => { S2.ov.tan = { a: v.a }; const m = CA.d(S2, v.a), y = CA.f(S2, v.a); S2.ans = m; S2.panel = [`y = ${N(m)}x + ${N(y - m * v.a)}`, `slope f′(${N(v.a)}) = ${N(m)}`]; S2.view = 'graph'; }) },
      { t: 'Secant + mean-value point', run: (S) => ab('SECANT / MVT', [], (S2, v) => { const m = (CA.f(S2, v.b) - CA.f(S2, v.a)) / (v.b - v.a); const cs = NUM.roots(x => CA.d(S2, x) - m, v.a, v.b, 400); S2.ov.sec = { a: v.a, b: v.b, c: cs[0] }; S2.ans = m; S2.panel = [`secant slope ${N(m)}`, cs.length ? `MVT: f′(c)=${N(m)} at c=${cs.map(N).join(', ')}` : 'no MVT point found']; }) },
      RS('L', 'left'), RS('R', 'right'), RS('M', 'midpoint'), RS('T', 'trapezoid'),
      { t: '∫ f dx with shading', run: (S) => ab('INTEGRAL', [], (S2, v) => { const I2 = CA.integ(S2, v.a, v.b); S2.ov.area = { a: v.a, b: v.b }; S2.ans = I2; S2.panel = [`∫ f dx = ${N(I2)}`, `[${N(v.a)}, ${N(v.b)}]`]; }) },
      { t: 'Area between f and g', run: (S) => ab('AREA f−g', [], (S2, v) => { const A = NUM.simpson(x => Math.abs(CA.f(S2, x) - CA.g(S2, x)), v.a, v.b, 1000); S2.ov.area = { a: v.a, b: v.b, between: true }; S2.slots[1].on = true; S2.ans = A; S2.panel = [`∫|f−g| dx = ${N(A)}`]; }) },
      { t: 'Newton’s method from x₀', run: (S) => S.openForm('NEWTON', [['x0', 'x₀', 1]], (S2, v) => { const xs = CA.newton(S2, v.x0); S2.ov.newton = xs; S2.ans = xs[xs.length - 1]; S2.panel = [`root ≈ ${N(S2.ans)} after ${xs.length - 1} steps`, xs.slice(0, 4).map(N).join(' → ')]; S2.view = 'graph'; }) },
      { t: 'Taylor polynomial', run: (S) => S.openForm('TAYLOR', [['a', 'centre a', 0], ['n', 'degree n (≤6)', 3]], (S2, v) => { const n = Math.max(0, Math.min(6, Math.round(v.n))); S2.ov.taylor = { a: v.a, n }; const co = []; let fact = 1; for (let k = 0; k <= n; k++) { if (k) fact *= k; co.push(CA.dk(S2, v.a, k) / fact); } S2.ans = co[0]; S2.panel = ['T(x) = ' + co.map((c, k) => `${N(c)}${k ? '(x−a)' + (k > 1 ? '^' + k : '') : ''}`).join(' + ').slice(0, 90)]; S2.view = 'graph'; }) },
      { t: 'Roots, extrema, inflections', run: (S) => { const W = S.win; const r = NUM.roots(x => CA.f(S, x), W.xmin, W.xmax), e = NUM.roots(x => CA.d(S, x), W.xmin, W.xmax), i2 = NUM.roots(x => CA.d2(S, x), W.xmin, W.xmax); S.ov.pts = r.map(x => [x, 0]).concat(e.map(x => [x, CA.f(S, x)])); S.ans = r.length ? r[r.length - 1] : NaN; S.panel = [`roots: ${r.map(N).join(', ') || '—'}`, `extrema x: ${e.map(N).join(', ') || '—'}  inflect x: ${i2.map(N).join(', ') || '—'}`]; S.view = 'graph'; } },
      { t: 'Average value + arc length', run: (S) => ab('AVERAGE / ARC', [], (S2, v) => { const av = CA.integ(S2, v.a, v.b) / (v.b - v.a), L2 = CA.arclen(S2, v.a, v.b); S2.ans = av; S2.panel = [`average value ${N(av)}`, `arc length ${N(L2)}`]; }) },
      { t: 'Clear overlays', run: (S) => { S.ov = { d1: false, d2: false }; S.panel = null; S.view = 'graph'; } },
    ];
  }
  D.calc = {
    family: 'graph', app: 'specgraph', angle: 'rad', mono: true, styleName: 'calculus visualiser on a monochrome dot-matrix: derivatives, Riemann sums, Newton, Taylor',
    slots: [{ name: 'f', label: 'f(x)=', init: 'x^2-2' }, { name: 'g', label: 'g(x)=', init: 'cos(x)', on: false }],
    win: { xmin: -3, xmax: 3, ymin: -3, ymax: 4, xscl: 1, yscl: 1 },
    ginit(S) { S.ov = { d1: false, d2: false }; },
    ind: (S) => [S.ov.d1 ? 'f′' : '', S.ov.d2 ? 'f″' : '', S.ov.riem ? 'Σ' + S.ov.riem.t : '', S.ov.taylor ? 'T' + S.ov.taylor.n : ''].filter(Boolean).join(' ') || 'CALC',
    draw: caDraw,
    startTrace(S) { const t = { c: 0, x: (S.win.xmin + S.win.xmax) / 2 }; S.trace = t; caPanel(S); return t; },
    traceKey(S, act) {
      const T = S.trace; if (!T) return undefined; const dx = (S.win.xmax - S.win.xmin) / 96;
      if (act === 'left') T.x -= dx; else if (act === 'right') T.x += dx; else if (act === 'up' || act === 'down') T.c = (T.c + (act === 'up' ? 1 : 2)) % 3;
      else if (act === 'exe' || act === 'ok') { S.openForm('TRACE TO x', [['x', 'x', T.x]], (S2, v) => { S2.trace.x = v.x; S2.view = 'graph'; caPanel(S2); }); return true; }
      else return undefined; caPanel(S); return true;
    },
    tableCols: (S) => [{ h: 'x', f: v => v }, { h: 'f', f: v => CA.f(S, v) }, { h: 'f′', f: v => CA.d(S, v) }, { h: 'f″', f: v => CA.d2(S, v) }],
    tools: caTools,
    acts: { zoom: (S) => S.openMenu('ZOOM', GK.zoomMenu(S)), dshow: (S) => { S.ov.d1 = !S.ov.d1; S.msg = S.ov.d1 ? 'f′ shown' : 'f′ hidden'; } },
    scope: (S) => ({
      F: (x) => CA.f(S, x), der: (x) => CA.d(S, x), der2: (x) => CA.d2(S, x), integ: (a, b) => CA.integ(S, a, b),
      lsum: (a, b, n) => CA.riem(S, a, b, n, 'L'), rsum: (a, b, n) => CA.riem(S, a, b, n, 'R'), msum: (a, b, n) => CA.riem(S, a, b, n, 'M'), tsum: (a, b, n) => CA.riem(S, a, b, n, 'T'),
      newt: (x) => { const xs = CA.newton(S, x); return xs[xs.length - 1]; }, taylor: (a, n, x) => CA.taylor(S, a, Math.min(6, Math.round(n)), x), avgv: (a, b) => CA.integ(S, a, b) / (b - a), arclen: (a, b) => CA.arclen(S, a, b),
    }),
    features: [
      'Monochrome dot-matrix display with ink-on-grey styling', 'Function f(x) and comparison function g(x) (dashed)', 'Toggle the derivative graph f′ (long dashes)', 'Toggle the second-derivative graph f″ (dotted)',
      'Trace f, f′ or f″ (▲▼ switches) with combined read-out', 'Tangent line at a with its equation', 'Secant line and mean-value-theorem point(s)',
      'Left Riemann sum with drawn rectangles', 'Right Riemann sum', 'Midpoint Riemann sum', 'Trapezoid rule with drawn trapezoids', 'Riemann error against the exact integral',
      'Definite integral with shaded region', 'Area between f and g (absolute)', 'Newton’s method with drawn tangent steps', 'Taylor polynomial up to degree 6 overlaid',
      'Taylor coefficients listed', 'Roots, extrema and inflection points in the window', 'Average value of f on [a,b]', 'Arc length of y = f(x)', 'Clear all overlays',
      'Table of x, f, f′, f″', 'Home F(x), der(x), der2(x)', 'Home integ(a,b) by Simpson’s rule (1000 panels)', 'Home lsum(), rsum(), msum(), tsum()',
      'Home newt(x₀) root finder', 'Home taylor(a,n,x) value', 'Home avgv(a,b) and arclen(a,b)', 'f′ quick-toggle key', 'Zoom menu with square/integer/decimal', 'Trace jump to x with EXE',
    ],
    examples: [
      { kind: 'cder', title: 'Derivative of x² − 2 at x = 1.5', human: 'der(1.5)', exp: 3, keys: ['ins:der(|d/dx(', 'd1', 'dot', 'd5', 'rp', 'exe'] },
      { kind: 'cint', title: '∫₀³ (x² − 2) dx', human: 'integ(0,3)', exp: 3, keys: ['ins:integ(|∫(', 'd0', 'comma', 'd3', 'rp', 'exe'] },
      { kind: 'clsum', title: 'Left Riemann sum, 4 strips on [0,2]', human: 'lsum(0,2,4)', exp: -2.25, keys: ['ins:lsum(|L∑(', 'd0', 'comma', 'd2', 'comma', 'd4', 'rp', 'exe'] },
      { kind: 'cmsum', title: 'Midpoint sum, 4 strips on [0,2]', human: 'msum(0,2,4)', exp: -1.375, keys: ['ins:msum(|M∑(', 'd0', 'comma', 'd2', 'comma', 'd4', 'rp', 'exe'] },
      { kind: 'cnewt', title: 'Newton’s method for x² − 2 from 1 (√2)', human: 'newt(1)', exp: Math.SQRT2, keys: ['ins:newt(|Newt(', 'd1', 'rp', 'exe'] },
      { kind: 'ctay', title: 'Degree-2 Taylor polynomial about 1, evaluated at 3', human: 'taylor(1,2,3)', exp: 7, keys: ['ins:taylor(|Tay(', 'd1', 'comma', 'd2', 'comma', 'd3', 'rp', 'exe'] },
      { kind: 'cavg', title: 'Average value of x² − 2 on [0,3]', human: 'avgv(0,3)', exp: 1, keys: ['ins:avgv(|avg(', 'd0', 'comma', 'd3', 'rp', 'exe'] },
    ],
    notes: ['Calculus visualiser on a monochrome screen. Line styles distinguish f (solid), g (short dash), f′ (long dash) and f″ (dotted).', 'Higher Taylor derivatives use central finite differences, so degrees above 4 are approximate.'],
    model({ K, I, PAD }) {
      return {
        w: 340,
        theme: { body: 'linear-gradient(#5b5f55,#3a3d36)', cls: 'th-sp', vars: { '--bezel': '#2b2d28', '--key': '#1d1f1b', '--kt': '#e8e6d8', '--knum': '#d8d4c0', '--knt': '#1d1f1b', '--kop': '#8a8f7d', '--kopt': '#111', '--kdel': '#b23a2b', '--kdelt': '#fff', '--kshift': '#d1a03a', '--kshiftt': '#111', '--kalpha': '#5d7a4a', '--kalphat': '#fff', '--ls': '#d1a03a', '--la': '#9dc183', '--pad': '#1d1f1b', '--padt': '#e8e6d8', '--lcd': '#a6b29a', '--kr': '3px 3px 9px 9px' } },
        display: { w: 300, h: 190, cls: 'sx-lcdmono' },
        sections: [
          { cols: 5, cls: 'kgfun', kc: 'fn sm', keys: [K('f(x)', 'yeq', { s: ['f′ ON', 'dshow', 'Toggle derivative graph'] }), K('WIN', 'window'), K('ZOOM', 'zoom'), K('TRACE', 'trace'), K('PLOT', 'graph', { s: ['TABLE', 'table'] })] },
          { cols: 5, cls: 'kgnav', kc: 'sm', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('CALC', 'tools', { tip: 'Riemann, Newton, Taylor, tangent' }), PAD('cross', { r: 2 }), K('HOME', 'home'), K('ON', 'on', { c: 'del sm' }), I('X', 'x', 'x', 'Variable x', { c: 'fn sm' }), K('SEL', 'sel'), K('MODE', 'setup')] },
          { cols: 5, cls: 'kfn', kc: 'fn sm', keys: [I('d/dx', 'der(', 'd/dx(', 'Derivative of f', { s: ['d²', 'ins:der2(|d²/dx²(', 'Second derivative'] }), I('∫', 'integ(', '∫(', 'Definite integral of f'), I('L∑', 'lsum(', 'L∑(', 'Left Riemann sum', { s: ['R∑', 'ins:rsum(|R∑(', 'Right Riemann sum'] }), I('M∑', 'msum(', 'M∑(', 'Midpoint sum', { s: ['T∑', 'ins:tsum(|T∑(', 'Trapezoid rule'] }), I('Newt', 'newt(', 'Newt(', 'Newton root from x₀'),
            I('Tay', 'taylor(', 'Tay(', 'Taylor polynomial value'), I('avg', 'avgv(', 'avg(', 'Average value'), I('arc', 'arclen(', 'arc(', 'Arc length'), I('F(', 'F(', 'F(', 'Evaluate f'), K('^', 'pow', { s: ['√', 'sqrt'] }),
            K('sin', 'sin'), K('cos', 'cos'), K('e<sup>x</sup>', 'epow', { s: ['ln', 'ln'] }), K('(', 'lp'), K(')', 'rp'), K(',', 'comma'), K('π', 'pi'), K('<i>x</i>²', 'sq'), K('|x|', 'abs'), K('tan', 'tan')] },
          { cols: 5, cls: 'knum', keys: numpad(K, '=') },
        ],
      };
    },
  };

  // ============================ #43 odeg ============================
  const OD = {
    f: (S, x, y) => S.fn(0, { x, y }), px: (S, x, y) => S.fn(1, { x, y }), py: (S, x, y) => S.fn(2, { x, y }),
    step(S, x, y, h, m) {
      const f = (a, b) => OD.f(S, a, b);
      if (m === 'euler') return y + h * f(x, y);
      if (m === 'heun') { const k1 = f(x, y), k2 = f(x + h, y + h * k1); return y + h * (k1 + k2) / 2; }
      const k1 = f(x, y), k2 = f(x + h / 2, y + h * k1 / 2), k3 = f(x + h / 2, y + h * k2 / 2), k4 = f(x + h, y + h * k3); return y + h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
    },
    solve(S, x0, y0, x1, n, m) { n = Math.max(1, Math.round(n)); const h = (x1 - x0) / n; let y = y0; for (let i = 0; i < n; i++) y = OD.step(S, x0 + i * h, y, h, m); return y; },
    path(S, x0, y0, x1, h, m) { const pts = [[x0, y0]]; let x = x0, y = y0; const n = Math.max(1, Math.min(4000, Math.ceil(Math.abs(x1 - x0) / h))), hh = (x1 - x0) / n; for (let i = 0; i < n; i++) { y = OD.step(S, x, y, hh, m); x += hh; if (!isFinite(y) || Math.abs(y) > 1e6) break; pts.push([x, y]); } return pts; },
    sys(S, x0, y0, t1, h) {
      const pts = [[x0, y0]]; let x = x0, y = y0; const F = (a, b) => [OD.px(S, a, b), OD.py(S, a, b)];
      for (let i = 0; i < Math.min(5000, t1 / h); i++) { const k1 = F(x, y), k2 = F(x + h * k1[0] / 2, y + h * k1[1] / 2), k3 = F(x + h * k2[0] / 2, y + h * k2[1] / 2), k4 = F(x + h * k3[0], y + h * k3[1]); x += h * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6; y += h * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6; if (!isFinite(x) || !isFinite(y) || Math.abs(x) + Math.abs(y) > 1e6) break; pts.push([x, y]); }
      return pts;
    },
    jac(S, x, y) { const h = 1e-5; return [[(OD.px(S, x + h, y) - OD.px(S, x - h, y)) / (2 * h), (OD.px(S, x, y + h) - OD.px(S, x, y - h)) / (2 * h)], [(OD.py(S, x + h, y) - OD.py(S, x - h, y)) / (2 * h), (OD.py(S, x, y + h) - OD.py(S, x, y - h)) / (2 * h)]]; },
    equil(S, x, y) {
      for (let i = 0; i < 60; i++) { const J = OD.jac(S, x, y), f = OD.px(S, x, y), g = OD.py(S, x, y), det = J[0][0] * J[1][1] - J[0][1] * J[1][0]; if (!det) break; const dx = (f * J[1][1] - g * J[0][1]) / det, dy = (J[0][0] * g - J[1][0] * f) / det; x -= dx; y -= dy; if (Math.abs(dx) + Math.abs(dy) < 1e-12) break; }
      return Math.abs(OD.px(S, x, y)) + Math.abs(OD.py(S, x, y)) < 1e-8 ? [x, y] : null;
    },
    classify(J) { const tr = J[0][0] + J[1][1], det = J[0][0] * J[1][1] - J[0][1] * J[1][0], disc = tr * tr - 4 * det; if (det < 0) return 'saddle'; if (Math.abs(tr) < 1e-9) return 'centre'; if (disc < 0) return tr < 0 ? 'stable spiral' : 'unstable spiral'; return tr < 0 ? 'stable node' : 'unstable node'; },
  };
  const OCOL = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b', '#c77dff'];
  const nSteps = (S, x0, x) => Math.max(1, Math.round(Math.abs(x - x0) / S.win.h));
  function odPanel(S) {
    const T = S.trace; if (!T) return; const L2 = S.omode === 'phase' ? S.pics : S.ics, ic = L2[T.c]; if (!ic) { S.panel = ['no initial conditions']; return; }
    if (S.omode === 'phase') { const pts = OD.sys(S, ic[0], ic[1], S.win.tmax, S.win.h); T.i = Math.max(0, Math.min(T.i, pts.length - 1)); const p = pts[T.i]; T.pt = p; S.panel = [`curve ${T.c + 1}: t=${N(T.i * S.win.h)}`, `x=${N(p[0])} y=${N(p[1])}`]; return; }
    const y = OD.solve(S, ic[0], ic[1], T.x, nSteps(S, ic[0], T.x), S.meth); T.pt = [T.x, y]; S.panel = [`IC ${T.c + 1}: x=${N(T.x)} y=${N(y)}`, `slope y′=${N(OD.f(S, T.x, y))} (${S.meth.toUpperCase()})`];
  }
  function odDraw(S, g, P) {
    const W = S.win, phase = S.omode === 'phase'; GK.axes(g, P, W, '#3d4b6b');
    const n = Math.max(6, Math.min(40, Math.round(W.fd))), ny = Math.max(4, Math.round(n * P.h / P.w)), L = P.w / n * 0.38;
    g.strokeStyle = '#7d8bb0'; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < n; i++) for (let j = 0; j < ny; j++) {
      const px = (i + 0.5) * P.w / n, py = (j + 0.5) * P.h / ny, x = P.x(px), y = P.y(py); let dx, dy;
      if (phase) { dx = OD.px(S, x, y); dy = OD.py(S, x, y); } else { dx = 1; dy = OD.f(S, x, y); }
      const sx = dx * P.w / (W.xmax - W.xmin), sy = -dy * P.h / (W.ymax - W.ymin), m = Math.hypot(sx, sy); if (!isFinite(m) || !m) continue;
      const ex = px + sx / m * L, ey = py + sy / m * L; g.moveTo(px - sx / m * L, py - sy / m * L); g.lineTo(ex, ey);
      if (phase) { g.moveTo(ex + 1.2, ey); g.arc(ex, ey, 1.2, 0, TAU); }
    }
    g.stroke();
    if (S.ncl && phase) { GK.drawSegs(g, P, GK.march((x, y) => OD.px(S, x, y), P, 4), '#ff9f1c', 1.2); GK.drawSegs(g, P, GK.march((x, y) => OD.py(S, x, y), P, 4), '#2ec4b6', 1.2); }
    if (S.ncl && !phase) GK.drawSegs(g, P, GK.march((x, y) => OD.f(S, x, y), P, 4), '#ff9f1c', 1.2);
    if (phase) S.pics.forEach((ic, i) => { GK.path(g, P, OD.sys(S, ic[0], ic[1], W.tmax, W.h), OCOL[i % 6], 1.8); GK.dot(g, P, ic[0], ic[1], OCOL[i % 6], 3.5); });
    else S.ics.forEach((ic, i) => { const col = OCOL[i % 6]; GK.path(g, P, OD.path(S, ic[0], ic[1], W.xmax, W.h, S.meth), col, 1.8); GK.path(g, P, OD.path(S, ic[0], ic[1], W.xmin, W.h, S.meth), col, 1.8); GK.dot(g, P, ic[0], ic[1], col, 3.5); });
    if (S.overlay && S.overlay.pts) S.overlay.pts.forEach(p => GK.ring(g, P, p[0], p[1], '#fff', 6));
    if (S.overlay && S.overlay.cmp) S.overlay.cmp.forEach((pts, i) => GK.path(g, P, pts, ['#ff006e', '#fb5607', '#ffbe0b'][i], 1.2, [4, 2]));
    if (S.trace && S.trace.pt) GK.ring(g, P, S.trace.pt[0], S.trace.pt[1], '#fff', 5);
  }
  const NEXTM = { euler: 'heun', heun: 'rk4', rk4: 'euler' };
  function odTools(S) {
    return [
      { t: 'Slope-field mode y′ = f(x,y)', run: (S) => { S.omode = 'field'; S.trace = null; S.view = 'graph'; } },
      { t: 'Phase-plane mode (x′, y′)', run: (S) => { S.omode = 'phase'; S.trace = null; S.view = 'graph'; } },
      { t: 'Method: Euler → Heun → RK4', run: (S) => { S.meth = NEXTM[S.meth]; S.msg = 'Method ' + S.meth.toUpperCase(); S.view = 'graph'; } },
      { t: 'Add initial condition', run: (S) => S.openForm('INITIAL CONDITION', [['x', S.omode === 'phase' ? 'x(0)' : 'x₀', 0], ['y', S.omode === 'phase' ? 'y(0)' : 'y₀', 0.5]], (S2, v) => { const L2 = S2.omode === 'phase' ? S2.pics : S2.ics; L2.push([v.x, v.y]); if (L2.length > 6) L2.shift(); S2.view = 'graph'; }) },
      { t: 'Clear initial conditions', run: (S) => { if (S.omode === 'phase') S.pics = []; else S.ics = []; S.trace = null; S.view = 'graph'; } },
      { t: 'Solve y(x) from IC', run: (S) => S.openForm('SOLVE', [['x0', 'x₀', 0], ['y0', 'y₀', 1], ['x', 'x', 1]], (S2, v) => { const n = nSteps(S2, v.x0, v.x), y = OD.solve(S2, v.x0, v.y0, v.x, n, S2.meth); S2.ans = y; S2.omode = 'field'; S2.overlay = { pts: [[v.x, y]] }; S2.panel = [`y(${N(v.x)}) = ${N(y)}  (${S2.meth.toUpperCase()}, ${n} steps)`]; S2.view = 'graph'; }) },
      { t: 'Compare Euler / Heun / RK4', run: (S) => S.openForm('COMPARE', [['x0', 'x₀', 0], ['y0', 'y₀', 1], ['x', 'x', 2]], (S2, v) => { const n = nSteps(S2, v.x0, v.x), ms = ['euler', 'heun', 'rk4'], r = ms.map(m => OD.solve(S2, v.x0, v.y0, v.x, n, m)), ref = OD.solve(S2, v.x0, v.y0, v.x, n * 20, 'rk4'); S2.overlay = { cmp: ms.map(m => OD.path(S2, v.x0, v.y0, v.x, S2.win.h * 4, m)) }; S2.ans = r[2]; S2.info = { title: `y(${N(v.x)}) with h=${N(S2.win.h)}`, lines: ms.map((m, i) => `${m.toUpperCase().padEnd(5)} ${N(r[i])}  err ${N(r[i] - ref)}`) }; }) },
      { t: 'Equilibrium point + type (system)', run: (S) => S.openForm('EQUILIBRIUM', [['x', 'guess x', 1], ['y', 'guess y', 0]], (S2, v) => { const e = OD.equil(S2, v.x, v.y); S2.omode = 'phase'; S2.view = 'graph'; if (!e) { S2.panel = ['no equilibrium found']; S2.ans = NaN; return; } const J = OD.jac(S2, e[0], e[1]); S2.ans = e[0]; S2.overlay = { pts: [e] }; S2.panel = [`equilibrium (${N(e[0])}, ${N(e[1])})`, `${OD.classify(J)}  tr=${N(J[0][0] + J[1][1])} det=${N(J[0][0] * J[1][1] - J[0][1] * J[1][0])}`]; }) },
      { t: 'Show/hide nullclines', run: (S) => { S.ncl = !S.ncl; S.view = 'graph'; } },
      { t: 'Isocline y′ = c', run: (S) => S.openForm('ISOCLINE', [['c', 'slope c', 0]], (S2, v) => { const d = S2.dims(), P = S2.P(S2.win, d.w, d.h), segs = GK.march((x, y) => OD.f(S2, x, y) - v.c, P, 4); S2.omode = 'field'; S2.overlay = { pts: segs.filter((_, i) => i % 12 === 0).map(s => s[0]) }; S2.ans = segs.length; S2.panel = [`isocline f(x,y) = ${N(v.c)}: ${segs.length} segments`]; S2.view = 'graph'; }) },
      { t: 'Field density', run: (S) => S.openForm('DENSITY', [['fd', 'arrows across', S.win.fd]], (S2, v) => { S2.win.fd = v.fd; S2.view = 'graph'; }) },
    ];
  }
  D.odeg = {
    family: 'graph', app: 'specgraph', angle: 'rad', bg: '#10141f', styleName: 'differential-equation graphing: slope fields, Euler/Heun/RK4 solutions and phase planes',
    slots: [{ name: 'f', label: 'y′=', init: 'x-y' }, { name: 'p', label: 'x′=', init: 'y' }, { name: 'q', label: 'y′(sys)=', init: 'x-x^3-0.3*y' }],
    win: { xmin: -4, xmax: 4, ymin: -3, ymax: 3, xscl: 1, yscl: 1, h: 0.05, tmax: 20, fd: 18 },
    winFields: [['xmin', 'Xmin'], ['xmax', 'Xmax'], ['ymin', 'Ymin'], ['ymax', 'Ymax'], ['h', 'Step h'], ['tmax', 'Phase t max'], ['fd', 'Field density'], ['xscl', 'Xscl'], ['yscl', 'Yscl']],
    editHint: 'slot 1: dy/dx = f(x,y) · slots 2–3: system x′, y′ for the phase plane',
    ginit(S) { S.omode = 'field'; S.meth = 'rk4'; S.ics = [[0, 1], [0, -1], [-2, 2]]; S.pics = [[1.5, 0], [-0.2, 0.4], [0.2, -0.4]]; S.ncl = false; },
    ind: (S) => (S.omode === 'field' ? 'FIELD ' + S.meth.toUpperCase() : 'PHASE') + (S.ncl ? ' NULL' : ''),
    draw: odDraw,
    startTrace(S) { const L2 = S.omode === 'phase' ? S.pics : S.ics; if (!L2.length) return null; const t = { c: 0, x: L2[0][0], i: 0 }; S.trace = t; odPanel(S); return t; },
    traceKey(S, act) {
      const T = S.trace; if (!T) return undefined; const nIC = (S.omode === 'phase' ? S.pics : S.ics).length || 1;
      if (act === 'left' || act === 'right') { const d = act === 'left' ? -1 : 1; if (S.omode === 'phase') T.i += d * 4; else T.x += d * (S.win.xmax - S.win.xmin) / 80; }
      else if (act === 'up' || act === 'down') T.c = (T.c + (act === 'up' ? 1 : nIC - 1)) % nIC;
      else if (act === 'exe' || act === 'ok') { S.openForm('TRACE TO x', [['x', 'x', T.x]], (S2, v) => { S2.trace.x = v.x; S2.view = 'graph'; odPanel(S2); }); return true; }
      else return undefined; odPanel(S); return true;
    },
    tableCols: (S) => { const ic = S.ics[0] || [0, 0], col = (m) => (v) => OD.solve(S, ic[0], ic[1], v, nSteps(S, ic[0], v), m); return [{ h: 'x', f: v => v }, { h: 'Euler', f: col('euler') }, { h: 'Heun', f: col('heun') }, { h: 'RK4', f: col('rk4') }]; },
    tools: odTools,
    acts: {
      zoom: (S) => S.openMenu('ZOOM', GK.zoomMenu(S)),
      omode: (S) => { S.omode = S.omode === 'field' ? 'phase' : 'field'; S.trace = null; S.msg = S.omode.toUpperCase(); },
      meth: (S) => { S.meth = NEXTM[S.meth]; S.msg = 'Method ' + S.meth.toUpperCase(); },
    },
    scope: (S) => ({
      slope: (x, y) => OD.f(S, x, y), ode: (x0, y0, x) => OD.solve(S, x0, y0, x, Math.max(1, Math.round(Math.abs(x - x0) / 0.01)), 'rk4'),
      euler: (x0, y0, x, n) => OD.solve(S, x0, y0, x, n, 'euler'), heun: (x0, y0, x, n) => OD.solve(S, x0, y0, x, n, 'heun'), rk4: (x0, y0, x, n) => OD.solve(S, x0, y0, x, n, 'rk4'),
      divg: (x, y) => { const J = OD.jac(S, x, y); return J[0][0] + J[1][1]; }, jdet: (x, y) => { const J = OD.jac(S, x, y); return J[0][0] * J[1][1] - J[0][1] * J[1][0]; },
      eqx: (x, y) => (OD.equil(S, x, y) || [NaN])[0], eqy: (x, y) => (OD.equil(S, x, y) || [NaN, NaN])[1],
    }),
    features: [
      'Slope field for dy/dx = f(x,y)', 'Direction field with arrow heads for autonomous systems', 'Up to six initial conditions per mode, solved forwards and backwards',
      'Solution method choice: Euler, Heun (improved Euler) or RK4', 'Adjustable step size h', 'Adjustable field density', 'Phase-plane trajectories over 0…t max',
      'Nullclines (x′ = 0 and y′ = 0) or the zero-slope isocline', 'Isocline y′ = c tool', 'Trace along a solution with y and slope read-out', 'Trace phase trajectories in time steps',
      'Switch traced curve with ▲▼', 'Tool: solve y(x) from any initial condition', 'Tool: Euler / Heun / RK4 comparison with error against a fine reference', 'Comparison curves drawn dashed',
      'Tool: equilibrium point by Newton’s method', 'Equilibrium classification (node, spiral, saddle, centre) from the Jacobian', 'Tool: add or clear initial conditions',
      'FIELD key toggles slope field / phase plane', 'METHOD key cycles the integrator', 'Table comparing Euler, Heun and RK4 from the first IC',
      'Home slope(x,y)', 'Home ode(x₀,y₀,x) high-accuracy RK4 (h = 0.01)', 'Home euler(), heun(), rk4() with n steps', 'Home divergence divg(x,y) of the system',
      'Home Jacobian determinant jdet(x,y)', 'Home equilibrium coordinates eqx(), eqy()', 'Damped double-well (Duffing-type) oscillator preset', 'Dark chart display with colour-coded curves', 'Window form with step, t max and density',
    ],
    examples: [
      { kind: 'oslope', title: 'Slope of y′ = x − y at (2, 1)', human: 'slope(2,1)', exp: 1, keys: ['ins:slope(|y′(', 'd2', 'comma', 'd1', 'rp', 'exe'] },
      { kind: 'ork4', title: 'RK4 solution of y′ = x − y, y(0)=1, at x = 1 (exact 2/e)', human: 'ode(0,1,1)', exp: 2 / Math.E, keys: ['ins:ode(|ODE(', 'd0', 'comma', 'd1', 'comma', 'd1', 'rp', 'exe'] },
      { kind: 'oeul', title: 'Euler’s method, 10 steps, same problem', human: 'euler(0,1,1,10)', exp: 0.6973568802, keys: ['ins:euler(|Euler(', 'd0', 'comma', 'd1', 'comma', 'd1', 'comma', 'd1', 'd0', 'rp', 'exe'] },
      { kind: 'odiv', title: 'Divergence of the system x′ = y, y′ = x − x³ − 0.3y', human: 'divg(0,0)', exp: -0.3, keys: ['ins:divg(|div(', 'd0', 'comma', 'd0', 'rp', 'exe'] },
      { kind: 'ojdet', title: 'Jacobian determinant at the equilibrium (1, 0)', human: 'jdet(1,0)', exp: 2, keys: ['ins:jdet(|det J(', 'd1', 'comma', 'd0', 'rp', 'exe'] },
      { kind: 'oeq', title: 'Equilibrium found from guess (0.8, 0.1): x-coordinate', human: 'eqx(0.8,0.1)', exp: 1, keys: ['ins:eqx(|eq x(', 'd0', 'dot', 'd8', 'comma', 'd0', 'dot', 'd1', 'rp', 'exe'] },
    ],
    notes: ['Differential-equation grapher. Slot 1 is dy/dx = f(x,y); slots 2 and 3 define the autonomous system used in phase-plane mode.', 'Euler is first order, Heun second order and RK4 fourth order; the comparison tool shows the error against RK4 with 20× smaller steps.'],
    model({ K, I, PAD }) {
      return {
        w: 378,
        theme: { body: 'linear-gradient(135deg,#1b263b,#0d1b2a)', cls: 'th-sp', vars: { '--bezel': '#0d1b2a', '--key': '#415a77', '--kt': '#e0e1dd', '--knum': '#778da9', '--knt': '#0d1b2a', '--kop': '#ffd166', '--kopt': '#0d1b2a', '--kdel': '#ef476f', '--kdelt': '#fff', '--kshift': '#06d6a0', '--kshiftt': '#0d1b2a', '--kalpha': '#118ab2', '--kalphat': '#fff', '--ls': '#06d6a0', '--la': '#118ab2', '--pad': '#ffd166', '--padt': '#0d1b2a', '--lcd': '#10141f', '--kr': '4px 14px' } },
        display: { w: 336, h: 212, cls: 'sx-lcdchart' },
        sections: [
          { cols: 5, cls: 'kgfun', kc: 'fn sm', keys: [K('y′=', 'yeq', { tip: 'Edit the equation and system' }), K('WINDOW', 'window'), K('ZOOM', 'zoom'), K('TRACE', 'trace'), K('GRAPH', 'graph', { s: ['TABLE', 'table'] })] },
          { cols: 6, cls: 'kgnav', kc: 'sm', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('FIELD', 'omode', { tip: 'Toggle slope field / phase plane' }), K('METHOD', 'meth', { tip: 'Euler → Heun → RK4' }), PAD('cross', { r: 2, center: ['OK', 'ok'] }), K('TOOLS', 'tools'), K('ON', 'on', { c: 'del sm' }),
            I('x', 'x', 'x', 'Variable x', { c: 'fn sm' }), I('y', 'y', 'y', 'Variable y', { c: 'fn sm' }), K('HOME', 'home'), K('MODE', 'setup')] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [I('y′(', 'slope(', 'y′(', 'Slope field value'), I('ODE', 'ode(', 'ODE(', 'Accurate RK4 solution'), I('Euler', 'euler(', 'Euler(', 'Euler’s method with n steps', { s: ['Heun', 'ins:heun(|Heun(', 'Heun’s method'] }), I('RK4', 'rk4(', 'RK4(', 'Runge–Kutta 4 with n steps'), I('div', 'divg(', 'div(', 'Divergence of the system'), I('detJ', 'jdet(', 'det J(', 'Jacobian determinant'),
            I('eq x', 'eqx(', 'eq x(', 'Equilibrium x from a guess', { s: ['eq y', 'ins:eqy(|eq y(', 'Equilibrium y'] }), K('sin', 'sin'), K('cos', 'cos'), K('e<sup>x</sup>', 'epow', { s: ['ln', 'ln'] }), K('^', 'pow'), K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }),
            K('(', 'lp'), K(')', 'rp'), K(',', 'comma'), K('π', 'pi'), K('SEL', 'sel'), K('|x|', 'abs')] },
          { cols: 5, cls: 'knum', keys: numpad(K) },
        ],
      };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
