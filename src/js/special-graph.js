/* U-45 CALCULATORS v1.3 — graphing kit + #11 Polar/Parametric (polpar), #30 Sequence & Cobweb (seqg),
 * #36 Implicit & Inequality (impl). Original code. */
(function (G) {
  'use strict';
  const C = G.SpecCore, MX = C.MX, esc = C.esc, NUM = C.NUM, fs = C.fmtShort;
  const D = G.SPEC_DEFS = G.SPEC_DEFS || {};
  const TAU = 2 * Math.PI;

  // ---------------- shared graph kit ----------------
  const GK = {
    path(g, P, pts, col, lw, dash) {
      g.strokeStyle = col; g.lineWidth = lw || 1.6; if (g.setLineDash) g.setLineDash(dash || []); g.beginPath(); let pen = false, px = 0, py = 0;
      for (const p of pts) { const x = p[0], y = p[1]; if (!isFinite(x) || !isFinite(y)) { pen = false; continue; } const X = P.X(x), Y = P.Y(y); if (pen && (Math.abs(Y - py) > P.h * 1.5 || Math.abs(X - px) > P.w * 1.5)) pen = false; if (pen) g.lineTo(X, Y); else g.moveTo(X, Y); pen = true; px = X; py = Y; }
      g.stroke(); if (g.setLineDash) g.setLineDash([]);
    },
    seg(g, P, x1, y1, x2, y2, col, lw, dash) { GK.path(g, P, [[x1, y1], [x2, y2]], col, lw, dash); },
    dot(g, P, x, y, col, r) { if (!isFinite(x) || !isFinite(y)) return; g.fillStyle = col; g.beginPath(); g.arc(P.X(x), P.Y(y), r || 3, 0, TAU); g.fill(); },
    ring(g, P, x, y, col, r) { if (!isFinite(x) || !isFinite(y)) return; g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.arc(P.X(x), P.Y(y), r || 5, 0, TAU); g.stroke(); },
    text(g, s, x, y, col, font) { g.fillStyle = col; g.font = font || '10px monospace'; g.fillText(s, x, y); },
    grid(g, P, W, col) {
      g.strokeStyle = col; g.lineWidth = 0.6; g.beginPath();
      if (W.xscl > 0 && (W.xmax - W.xmin) / W.xscl < 60) for (let x = Math.ceil(W.xmin / W.xscl) * W.xscl; x <= W.xmax; x += W.xscl) { g.moveTo(P.X(x), 0); g.lineTo(P.X(x), P.h); }
      if (W.yscl > 0 && (W.ymax - W.ymin) / W.yscl < 60) for (let y = Math.ceil(W.ymin / W.yscl) * W.yscl; y <= W.ymax; y += W.yscl) { g.moveTo(0, P.Y(y)); g.lineTo(P.w, P.Y(y)); }
      g.stroke();
    },
    axes(g, P, W, col) { g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, P.Y(0)); g.lineTo(P.w, P.Y(0)); g.moveTo(P.X(0), 0); g.lineTo(P.X(0), P.h); g.stroke();
      g.beginPath(); if (W.xscl > 0 && (W.xmax - W.xmin) / W.xscl < 80) for (let x = Math.ceil(W.xmin / W.xscl) * W.xscl; x <= W.xmax; x += W.xscl) { g.moveTo(P.X(x), P.Y(0) - 3); g.lineTo(P.X(x), P.Y(0) + 3); }
      if (W.yscl > 0 && (W.ymax - W.ymin) / W.yscl < 80) for (let y = Math.ceil(W.ymin / W.yscl) * W.yscl; y <= W.ymax; y += W.yscl) { g.moveTo(P.X(0) - 3, P.Y(y)); g.lineTo(P.X(0) + 3, P.Y(y)); } g.stroke(); },
    range(a, b, st, max) { const out = []; if (!(st > 0)) st = (b - a) / 200; const n = Math.min(max || 4000, Math.floor((b - a) / st + 1e-9)); for (let i = 0; i <= n; i++) out.push(a + i * st); return out; },
    rk4(f, x0, y0, h, n) { const pts = [[x0, y0]]; let x = x0, y = y0; for (let i = 0; i < n; i++) { const k1 = f(x, y), k2 = f(x + h / 2, y + h * k1 / 2), k3 = f(x + h / 2, y + h * k2 / 2), k4 = f(x + h, y + h * k3); y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6; x += h; if (!isFinite(y)) break; pts.push([x, y]); } return pts; },
    // marching squares for F(x,y)=0 -> list of segments in world coords
    march(F, P, cell) {
      cell = cell || 4; const nx = Math.ceil(P.w / cell), ny = Math.ceil(P.h / cell), V = [];
      for (let j = 0; j <= ny; j++) { const row = []; const y = P.y(j * cell); for (let i = 0; i <= nx; i++) row.push(F(P.x(i * cell), y)); V.push(row); }
      const segs = [];
      const lerp = (a, b, va, vb) => a + (b - a) * (va / (va - vb));
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = V[j][i], b = V[j][i + 1], c = V[j + 1][i + 1], d = V[j + 1][i];
        if (![a, b, c, d].every(isFinite)) continue;
        const x0 = P.x(i * cell), x1 = P.x((i + 1) * cell), y0 = P.y(j * cell), y1 = P.y((j + 1) * cell);
        const e = [];
        if ((a > 0) !== (b > 0)) e.push([lerp(x0, x1, a, b), y0]);
        if ((b > 0) !== (c > 0)) e.push([x1, lerp(y0, y1, b, c)]);
        if ((c > 0) !== (d > 0)) e.push([lerp(x1, x0, c, d), y1]);
        if ((d > 0) !== (a > 0)) e.push([x0, lerp(y1, y0, d, a)]);
        // reject sign changes caused by poles (large jumps)
        const big = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));
        const sc = (Math.abs(P.x(cell) - P.x(0)) + Math.abs(P.y(0) - P.y(cell))) * 50 + 1;
        if (big > 1e6 && big > sc * 1e4) continue;
        if (e.length === 2) segs.push([e[0], e[1]]); else if (e.length === 4) { segs.push([e[0], e[1]]); segs.push([e[2], e[3]]); }
      }
      return segs;
    },
    drawSegs(g, P, segs, col, lw) { g.strokeStyle = col; g.lineWidth = lw || 1.8; g.beginPath(); segs.forEach(([p, q]) => { g.moveTo(P.X(p[0]), P.Y(p[1])); g.lineTo(P.X(q[0]), P.Y(q[1])); }); g.stroke(); },
    zoomMenu(S, extra) {
      const W = () => S.win;
      return [
        { t: 'Zoom In ×2', run: (S) => S.zoom(0.5) }, { t: 'Zoom Out ×2', run: (S) => S.zoom(2) },
        { t: 'Standard window', run: (S) => S.exec('zstd') }, { t: 'Square pixels', run: (S) => S.exec('zsq') },
        { t: 'Integer (1 unit per 4 px)', run: (S) => { const d = S.dims(); const w = W(); const cx = Math.round((w.xmin + w.xmax) / 2), cy = Math.round((w.ymin + w.ymax) / 2); w.xmin = cx - d.w / 8; w.xmax = cx + d.w / 8; w.ymin = cy - d.h / 8; w.ymax = cy + d.h / 8; S.view = 'graph'; } },
        { t: 'Decimal (0.1 per px)', run: (S) => { const d = S.dims(); const w = W(); w.xmin = -d.w / 20; w.xmax = d.w / 20; w.ymin = -d.h / 20; w.ymax = d.h / 20; S.view = 'graph'; } },
      ].concat(extra || []);
    },
    // generic trace move helper over a list of curves {name, at(p)->[x,y], p0, p1, step}
    traceMove(S, act, curves, panel) {
      const T = S.trace; if (!T) return undefined; if (!curves.length) { S.trace = null; return undefined; }
      T.c = Math.min(T.c || 0, curves.length - 1); let cv = curves[T.c];
      if (act === 'left' || act === 'right') { T.p += (act === 'left' ? -1 : 1) * cv.step; if (T.p < cv.p0) T.p = cv.p0; if (T.p > cv.p1) T.p = cv.p1; }
      else if (act === 'up' || act === 'down') { T.c = (T.c + (act === 'up' ? -1 : 1) + curves.length) % curves.length; cv = curves[T.c]; T.p = Math.min(Math.max(T.p, cv.p0), cv.p1); }
      else if (act === 'exe' || act === 'ok') { S.openForm('TRACE TO', [['p', cv.pname || 'value', T.p]], (S2, v) => { S2.trace.p = v.p; S2.view = 'graph'; panel(S2); }); return true; }
      else return undefined;
      panel(S); return true;
    },
    num(v) { return fs(v); },
  };
  G.SpecGK = GK;
  const N = (v) => fs(v);

  // common keypad blocks
  const digits = (K, o) => {
    const c = (o && o.c) || 'num';
    return [K('7', 'd7', { c }), K('8', 'd8', { c }), K('9', 'd9', { c }), K('4', 'd4', { c }), K('5', 'd5', { c }), K('6', 'd6', { c }), K('1', 'd1', { c }), K('2', 'd2', { c }), K('3', 'd3', { c }), K('0', 'd0', { c }), K('.', 'dot', { c }), K('(−)', 'neg', { c, s: ['Ans', 'ans'] })];
  };

  // ============================ #11 polpar ============================
  function ppCurves(S) {
    const W = S.win, out = [];
    [0, 1].forEach(i => { const s = S.slots[i]; if (s.on && s.buf.src()) out.push({ name: s.name, i, kind: 'r', pname: 'θ', p0: W.thmin, p1: W.thmax, step: W.thstep, at: (t) => { const r = S.fn(i, { θ: t }); return [r * Math.cos(t), r * Math.sin(t), r]; } }); });
    [2, 4].forEach(i => { const s = S.slots[i]; if (s.on && s.buf.src() && S.slots[i + 1].buf.src()) out.push({ name: s.name.replace('x', 'XY'), i, kind: 't', pname: 't', p0: W.tmin, p1: W.tmax, step: W.tstep, at: (t) => [S.fn(i, { t }), S.fn(i + 1, { t })] }); });
    return out;
  }
  const PP = {
    r: (S, k, th) => S.fn(k, { θ: th }),
    xy: (S, k, t) => [S.fn(k, { t }), S.fn(k + 1, { t })],
    dxy: (S, k, t) => { const h = 1e-5 * Math.max(1, Math.abs(t)); const a = PP.xy(S, k, t - h), b = PP.xy(S, k, t + h); return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)]; },
    pslope(S, k, th) { const r = PP.r(S, k, th), dr = NUM.d1(t => PP.r(S, k, t), th); return (dr * Math.sin(th) + r * Math.cos(th)) / (dr * Math.cos(th) - r * Math.sin(th)); },
    parea: (S, k, a, b) => 0.5 * NUM.simpson(t => PP.r(S, k, t) ** 2, a, b, 800),
    plen: (S, k, a, b) => NUM.simpson(t => Math.hypot(PP.r(S, k, t), NUM.d1(u => PP.r(S, k, u), t)), a, b, 800),
    tlen: (S, k, a, b) => NUM.simpson(t => Math.hypot.apply(null, PP.dxy(S, k, t)), a, b, 800),
    garea: (S, k, a, b) => 0.5 * NUM.simpson(t => { const p = PP.xy(S, k, t), d = PP.dxy(S, k, t); return p[0] * d[1] - p[1] * d[0]; }, a, b, 800),
    curv(S, k, t) { const h = 1e-3; const d = PP.dxy(S, k, t), a = PP.dxy(S, k, t - h), b = PP.dxy(S, k, t + h); const dd = [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)]; return (d[0] * dd[1] - d[1] * dd[0]) / Math.pow(d[0] * d[0] + d[1] * d[1], 1.5); },
  };
  function ppPanel(S) {
    const cs = ppCurves(S), T = S.trace; if (!T || !cs[T.c]) return; const cv = cs[T.c], p = cv.at(T.p);
    S.panel = cv.kind === 'r' ? [`${cv.name}: θ=${N(T.p)}  r=${N(p[2])}`, `x=${N(p[0])}  y=${N(p[1])}  dy/dx=${N(PP.pslope(S, cv.i, T.p))}`]
      : [`${cv.name}: t=${N(T.p)}`, `x=${N(p[0])}  y=${N(p[1])}  dy/dx=${N((d => d[1] / d[0])(PP.dxy(S, cv.i, T.p)))}`];
  }
  const ppForm = (S, title, f, done) => S.openForm(title, f, (S2, v) => { S2.view = 'graph'; done(S2, v); });
  D.polpar = {
    family: 'graph', app: 'specgraph', angle: 'rad', bg: '#fdfbf3', styleName: 'polar r(θ) and parametric X(t),Y(t) graphing with polar grid',
    slots: [{ name: 'r1', label: 'r₁(θ)=', init: '2*cos(θ)' }, { name: 'r2', label: 'r₂(θ)=', init: '1+sin(2*θ)', on: false },
      { name: 'x1', label: 'X₁(t)=', init: '3*cos(t)' }, { name: 'y1', label: 'Y₁(t)=', init: '2*sin(t)' },
      { name: 'x2', label: 'X₂(t)=', init: 'cos(3*t)', on: false }, { name: 'y2', label: 'Y₂(t)=', init: 'sin(2*t)', on: false }],
    win: { xmin: -4.8, xmax: 4.8, ymin: -3.2, ymax: 3.2, xscl: 1, yscl: 1, thmin: 0, thmax: TAU, thstep: 0.04, tmin: 0, tmax: TAU, tstep: 0.04 },
    winFields: [['xmin', 'Xmin'], ['xmax', 'Xmax'], ['xscl', 'Xscl'], ['ymin', 'Ymin'], ['ymax', 'Ymax'], ['yscl', 'Yscl'], ['thmin', 'θmin'], ['thmax', 'θmax'], ['thstep', 'θstep'], ['tmin', 'Tmin'], ['tmax', 'Tmax'], ['tstep', 'Tstep']],
    editHint: '▲▼ slot · θ / T keys · SEL on/off (X slot switches the pair) · GRAPH',
    ginit(S) { S.pgrid = true; S.showPts = false; },
    ind: (S) => (S.pgrid ? 'POLGRID' : 'RECTGRID'),
    draw(S, g, P) {
      const W = S.win;
      if (S.pgrid) {
        const R = Math.hypot(Math.max(Math.abs(W.xmin), Math.abs(W.xmax)), Math.max(Math.abs(W.ymin), Math.abs(W.ymax))), st = W.xscl > 0 ? W.xscl : 1;
        g.strokeStyle = '#d9cfae'; g.lineWidth = 0.7;
        for (let r = st; r <= R && r / st < 60; r += st) { g.beginPath(); g.ellipse(P.X(0), P.Y(0), Math.abs(P.X(r) - P.X(0)), Math.abs(P.Y(r) - P.Y(0)), 0, 0, TAU); g.stroke(); }
        for (let a = 0; a < 360; a += 15) { const t = a * Math.PI / 180; GK.seg(g, P, 0, 0, R * Math.cos(t), R * Math.sin(t), a % 90 ? '#ece4c8' : '#cbbd8f', 0.7); }
      } else GK.grid(g, P, W, '#eee6cf');
      GK.axes(g, P, W, '#5b5137');
      ppCurves(S).forEach((cv, j) => { const pts = GK.range(cv.p0, cv.p1, cv.step / 3, 6000).map(t => cv.at(t)); GK.path(g, P, pts, S.color(cv.i), 1.8); if (S.showPts) GK.range(cv.p0, cv.p1, cv.step * 8, 400).forEach(t => { const p = cv.at(t); GK.dot(g, P, p[0], p[1], S.color(cv.i), 1.6); }); });
      const O = S.overlay;
      if (O && O.kind === 'sector') { g.fillStyle = 'rgba(0,140,150,.25)'; g.beginPath(); g.moveTo(P.X(0), P.Y(0)); GK.range(O.a, O.b, (O.b - O.a) / 200).forEach(t => { const r = PP.r(S, O.k, t); g.lineTo(P.X(r * Math.cos(t)), P.Y(r * Math.sin(t))); }); g.closePath(); g.fill(); }
      if (O && O.kind === 'arc') { const pts = GK.range(O.a, O.b, (O.b - O.a) / 300).map(t => O.k < 2 ? ((r) => [r * Math.cos(t), r * Math.sin(t)])(PP.r(S, O.k, t)) : PP.xy(S, O.k, t)); GK.path(g, P, pts, '#ff7b00', 4); }
      if (O && O.kind === 'tan') { const m = O.m, x0 = O.x, y0 = O.y; if (isFinite(m)) GK.seg(g, P, W.xmin, y0 + m * (W.xmin - x0), W.xmax, y0 + m * (W.xmax - x0), '#c2185b', 1.2, [5, 3]); else GK.seg(g, P, x0, W.ymin, x0, W.ymax, '#c2185b', 1.2, [5, 3]); GK.dot(g, P, x0, y0, '#c2185b', 3.5); }
      if (O && O.pts) O.pts.forEach(p => GK.ring(g, P, p[0], p[1], '#c2185b', 5));
      const T = S.trace; if (T) { const cs = ppCurves(S); const cv = cs[T.c]; if (cv) { const p = cv.at(T.p); GK.seg(g, P, 0, 0, p[0], p[1], '#9a8c5f', 0.8, [2, 2]); GK.ring(g, P, p[0], p[1], '#000', 5); GK.dot(g, P, p[0], p[1], S.color(cv.i), 2.5); } }
    },
    startTrace(S) { const cs = ppCurves(S); if (!cs.length) { S.msg = 'No curve selected'; return null; } const t = { c: 0, p: cs[0].p0 + (cs[0].p1 - cs[0].p0) / 8 }; S.trace = t; ppPanel(S); return t; },
    traceKey: (S, act) => GK.traceMove(S, act, ppCurves(S), ppPanel),
    tableCols: (S) => [{ h: 'θ / t', f: v => v }, { h: 'r₁', f: v => PP.r(S, 0, v) }, { h: 'r₂', f: v => PP.r(S, 1, v) }, { h: 'X₁', f: v => S.fn(2, { t: v }) }, { h: 'Y₁', f: v => S.fn(3, { t: v }) }],
    tools(S) {
      const setAns = (S2, v, lines, ov) => { S2.ans = v; S2.panel = lines; S2.overlay = ov || null; };
      return [
        { t: 'r(θ) value + point', run: (S) => ppForm(S, 'EVALUATE r₁', [['th', 'θ', Math.PI / 4]], (S2, v) => { const r = PP.r(S2, 0, v.th); setAns(S2, r, [`r₁(${N(v.th)}) = ${N(r)}`, `(x,y) = (${N(r * Math.cos(v.th))}, ${N(r * Math.sin(v.th))})`], { kind: 'tan', x: r * Math.cos(v.th), y: r * Math.sin(v.th), m: PP.pslope(S2, 0, v.th) }); }) },
        { t: 'X,Y(t) value + tangent', run: (S) => ppForm(S, 'EVALUATE X₁,Y₁', [['t', 't', 1]], (S2, v) => { const p = PP.xy(S2, 2, v.t), d = PP.dxy(S2, 2, v.t); setAns(S2, d[1] / d[0], [`t=${N(v.t)}: (${N(p[0])}, ${N(p[1])})`, `dx/dt=${N(d[0])} dy/dt=${N(d[1])} dy/dx=${N(d[1] / d[0])}`], { kind: 'tan', x: p[0], y: p[1], m: d[1] / d[0] }); }) },
        { t: 'Polar area ½∫r²dθ', run: (S) => ppForm(S, 'AREA r₁', [['a', 'θ from', 0], ['b', 'θ to', Math.PI]], (S2, v) => { const A = PP.parea(S2, 0, v.a, v.b); setAns(S2, A, [`½∫r₁²dθ = ${N(A)}`, `θ ∈ [${N(v.a)}, ${N(v.b)}]`], { kind: 'sector', k: 0, a: v.a, b: v.b }); }) },
        { t: 'Polar arc length', run: (S) => ppForm(S, 'ARC r₁', [['a', 'θ from', 0], ['b', 'θ to', Math.PI]], (S2, v) => { const L = PP.plen(S2, 0, v.a, v.b); setAns(S2, L, [`arc length r₁ = ${N(L)}`], { kind: 'arc', k: 0, a: v.a, b: v.b }); }) },
        { t: 'Parametric arc length', run: (S) => ppForm(S, 'ARC X₁Y₁', [['a', 't from', 0], ['b', 't to', TAU]], (S2, v) => { const L = PP.tlen(S2, 2, v.a, v.b); setAns(S2, L, [`arc length X₁Y₁ = ${N(L)}`], { kind: 'arc', k: 2, a: v.a, b: v.b }); }) },
        { t: 'Enclosed area (Green)', run: (S) => ppForm(S, 'AREA X₁Y₁', [['a', 't from', 0], ['b', 't to', TAU]], (S2, v) => { const A = PP.garea(S2, 2, v.a, v.b); setAns(S2, A, [`½∮(x dy − y dx) = ${N(A)}`]); }) },
        { t: 'Curvature κ(t)', run: (S) => ppForm(S, 'CURVATURE', [['t', 't', 0]], (S2, v) => { const k = PP.curv(S2, 2, v.t); setAns(S2, k, [`κ(${N(v.t)}) = ${N(k)}`, `radius = ${N(1 / Math.abs(k))}`]); }) },
        { t: 'r₁ = r₂ intersections', run: (S) => { const W = S.win; const rs = NUM.roots(t => PP.r(S, 0, t) - PP.r(S, 1, t), W.thmin, W.thmax, 720); const pts = rs.map(t => { const r = PP.r(S, 0, t); return [r * Math.cos(t), r * Math.sin(t)]; }); setAns(S, rs[0], rs.length ? rs.slice(0, 4).map((t, i) => `θ=${N(t)} → (${N(pts[i][0])}, ${N(pts[i][1])})`) : ['no intersection in θ range'], { pts }); S.view = 'graph'; } },
        { t: 'Farthest point max|r|', run: (S) => { const W = S.win; const th = NUM.golden(t => Math.abs(PP.r(S, 0, t)), W.thmin, W.thmax, true); const r = PP.r(S, 0, th); setAns(S, Math.abs(r), [`max |r₁| ≈ ${N(Math.abs(r))} at θ=${N(th)}`], { pts: [[r * Math.cos(th), r * Math.sin(th)]] }); S.view = 'graph'; } },
        { t: 'Rect → polar point', run: (S) => S.openForm('RECT→POL', [['x', 'x', 1], ['y', 'y', 1]], (S2, v) => { const r = Math.hypot(v.x, v.y), t = Math.atan2(v.y, v.x); S2.ans = r; S2.msg = `r=${N(r)}  θ=${N(t)} rad (${N(t * 180 / Math.PI)}°)`; }) },
        { t: 'Polar → rect point', run: (S) => S.openForm('POL→RECT', [['r', 'r', 2], ['t', 'θ (rad)', Math.PI / 6]], (S2, v) => { const x = v.r * Math.cos(v.t), y = v.r * Math.sin(v.t); S2.ans = x; S2.msg = `x=${N(x)}  y=${N(y)}`; }) },
        { t: 'Toggle polar/rect grid', run: (S) => { S.pgrid = !S.pgrid; S.view = 'graph'; } },
        { t: 'Toggle sample dots', run: (S) => { S.showPts = !S.showPts; S.view = 'graph'; } },
      ];
    },
    acts: {
      zoom: (S) => S.openMenu('ZOOM', GK.zoomMenu(S, [
        { t: 'Trig window (θ 0…2π)', run: (S) => { Object.assign(S.win, { thmin: 0, thmax: TAU, tmin: 0, tmax: TAU }); S.view = 'graph'; } },
        { t: 'Fit to curves', run: (S) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; ppCurves(S).forEach(cv => GK.range(cv.p0, cv.p1, cv.step, 3000).forEach(t => { const p = cv.at(t); if (isFinite(p[0]) && isFinite(p[1])) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } })); if (isFinite(x0)) { const mx = (x1 - x0) * 0.08 || 1, my = (y1 - y0) * 0.08 || 1; Object.assign(S.win, { xmin: x0 - mx, xmax: x1 + mx, ymin: y0 - my, ymax: y1 + my }); } S.view = 'graph'; } }])),
      pgrid: (S) => { S.pgrid = !S.pgrid; S.msg = S.pgrid ? 'Polar grid' : 'Rectangular grid'; },
    },

    scope: (S) => ({
      R1: (t) => PP.r(S, 0, t), R2: (t) => PP.r(S, 1, t), X1: (t) => S.fn(2, { t }), Y1: (t) => S.fn(3, { t }), X2: (t) => S.fn(4, { t }), Y2: (t) => S.fn(5, { t }),
      tor: (x, y) => Math.hypot(x, y), toth: (x, y) => Math.atan2(y, x), torx: (r, t) => r * Math.cos(t), tory: (r, t) => r * Math.sin(t),
      parea: (a, b) => PP.parea(S, 0, a, b), plen: (a, b) => PP.plen(S, 0, a, b), tlen: (a, b) => PP.tlen(S, 2, a, b), garea: (a, b) => PP.garea(S, 2, a, b),
      pslope: (t) => PP.pslope(S, 0, t), tslope: (t) => (d => d[1] / d[0])(PP.dxy(S, 2, t)), curv: (t) => PP.curv(S, 2, t),
    }),
    features: [
      'Two polar function slots r₁(θ), r₂(θ) with dedicated θ key', 'Two parametric pairs X₁/Y₁(t), X₂/Y₂(t) with dedicated T key', 'Per-slot colours and SEL on/off switching',
      'Independent θmin/θmax/θstep and Tmin/Tmax/Tstep window', 'Polar grid of concentric circles and 15° rays (toggle with rectangular grid)', 'Trace along θ or t with radius guide line',
      'Trace read-out of θ, r, x, y and dy/dx', 'Trace jump: EXE on trace types an exact parameter', 'Switch traced curve with ▲▼',
      'Tool: evaluate r₁(θ) with tangent line overlay', 'Tool: evaluate X₁,Y₁(t) with dx/dt, dy/dt and tangent', 'Tool: polar area ½∫r²dθ with shaded sector',
      'Tool: polar arc length with highlighted arc', 'Tool: parametric arc length with highlighted path', 'Tool: enclosed area by Green’s theorem',
      'Tool: curvature κ(t) and radius of curvature', 'Tool: r₁ = r₂ intersection finder (marked points)', 'Tool: farthest point max|r| by golden-section search',
      'Rect→polar and polar→rect point converters', 'Zoom menu: in, out, standard, square, integer, decimal', 'Zoom trig (θ, t reset to 0…2π)', 'Zoom fit to visible curves',
      'Sample-dot display to show θ/t spacing', 'Table of θ/t with r₁, r₂, X₁, Y₁ columns', 'Home functions R1() R2() X1() Y1() X2() Y2() evaluate slots',
      'Home functions tor(), toth(), torx(), tory() for coordinate conversion', 'Home integrals parea(), plen(), tlen(), garea()', 'Home slopes pslope(θ) and tslope(t), curvature curv(t)',
      'Radian-native graphing; home angle mode switchable', 'Pan the view with the cursor cross when not tracing', 'Window form with 12 fields',
    ],
    examples: [
      { kind: 'ptor', title: 'Rectangular to polar radius', human: 'tor(3,4)', exp: 5, keys: ['ins:tor(|tor(', 'd3', 'comma', 'd4', 'rp', 'exe'] },
      { kind: 'pr1', title: 'Evaluate the polar slot r₁ = 2cos θ at θ = 0', human: 'R1(0)', exp: 2, keys: ['ins:R1(|R₁(', 'd0', 'rp', 'exe'] },
      { kind: 'parea', title: 'Area of the circle r = 2cos θ (θ from 0 to π)', human: 'parea(0,π)', exp: Math.PI, keys: ['ins:parea(|∫Area(', 'd0', 'comma', 'pi', 'rp', 'exe'] },
      { kind: 'plen', title: 'Arc length of r = 2cos θ for θ in [0, π]', human: 'plen(0,π)', exp: TAU, keys: ['ins:plen(|∫Arc(', 'd0', 'comma', 'pi', 'rp', 'exe'] },
      { kind: 'px1', title: 'Parametric X₁(t) = 3cos t at t = 0', human: 'X1(0)', exp: 3, keys: ['ins:X1(|X₁(', 'd0', 'rp', 'exe'] },
      { kind: 'tslope', title: 'Slope of the ellipse X=3cos t, Y=2sin t at t = π/4', human: 'tslope(π/4)', exp: -2 / 3, keys: ['ins:tslope(|dy/dx(', 'pi', 'div', 'd4', 'rp', 'exe'] },
      { kind: 'garea', title: 'Area enclosed by the ellipse (Green’s theorem)', human: 'garea(0,2π)', exp: 6 * Math.PI, keys: ['ins:garea(|∮A(', 'd0', 'comma', 'd2', 'pi', 'rp', 'exe'] },
      { kind: 'torx', title: 'Polar to rectangular x for r = 2, θ = π/3', human: 'torx(2,π/3)', exp: 1, keys: ['ins:torx(|→x(', 'd2', 'comma', 'pi', 'div', 'd3', 'rp', 'exe'] },
    ],
    notes: ['Polar & parametric grapher. Angles inside the graph slots are always radians; θ and t are separate variables.', 'Areas use ½∫r²dθ (polar) and ½∮(x dy − y dx) (parametric). Arc length integrates √(r² + (dr/dθ)²) or √(x′² + y′²) with Simpson’s rule (800 panels).'],
    model({ K, I, PAD }) {
      return {
        w: 384,
        theme: { body: 'linear-gradient(160deg,#e9e2cc,#c9bd98)', cls: 'th-sp', vars: { '--bezel': '#0f4c5c', '--key': '#2c7a7b', '--kt': '#fff', '--knum': '#fbf7ea', '--knt': '#173f4f', '--kop': '#e36414', '--kopt': '#fff', '--kdel': '#9a031e', '--kdelt': '#fff', '--kshift': '#fb8b24', '--kshiftt': '#111', '--kalpha': '#5f0f40', '--kalphat': '#fff', '--ls': '#c25b00', '--la': '#5f0f40', '--pad': '#0f4c5c', '--padt': '#fff', '--lcd': '#fdfbf3', '--kr': '7px' } },
        display: { w: 340, h: 214, cls: 'sx-lcdpaper' },
        sections: [
          { cols: 5, cls: 'kgfun', kc: 'fn sm', keys: [K('r(θ)=', 'yeq', { tip: 'Edit polar and parametric slots', s: ['FORMAT', 'pgrid', 'Toggle polar / rectangular grid'] }), K('WINDOW', 'window', { s: ['TBLSET', 'tblset'] }), K('ZOOM', 'zoom', { tip: 'Zoom menu' }), K('TRACE', 'trace', { s: ['CALC', 'tools', 'Polar/parametric tools'] }), K('GRAPH', 'graph', { s: ['TABLE', 'table', 'Table of values'] })] },
          { cols: 6, cls: 'kgnav', kc: 'sm', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('MODE', 'setup'), K('TOOLS', 'tools', { tip: 'Area, arc length, intersections' }), PAD('cross', { r: 2, w: 2 }), K('HOME', 'home', { tip: 'Calculation screen' }),
            I('θ', 'θ', 'θ', 'Polar angle variable', { c: 'fn sm' }), I('T', 't', 't', 'Parameter variable', { c: 'fn sm' }), K('SEL', 'sel', { tip: 'Turn the current slot on/off' }), K('ON', 'on', { c: 'del sm' })] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [K('sin', 'sin', { s: ['sin⁻¹', 'asin'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'] }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'] }), K('π', 'pi'), K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }), K('^', 'pow'),
            I('R₁(', 'R1(', 'R₁(', 'Evaluate polar slot r₁', { s: ['R₂(', 'ins:R2(|R₂(', 'Evaluate r₂'] }), I('X₁(', 'X1(', 'X₁(', 'Evaluate X₁(t)', { s: ['Y₁(', 'ins:Y1(|Y₁(', 'Evaluate Y₁(t)'] }), I('→r', 'tor(', 'tor(', 'Radius from x,y', { s: ['→θ', 'ins:toth(|toth(', 'Angle from x,y'] }), I('→x', 'torx(', '→x(', 'x from r,θ', { s: ['→y', 'ins:tory(|→y(', 'y from r,θ'] }), I('∫A', 'parea(', '∫Area(', 'Polar area of r₁', { s: ['∮A', 'ins:garea(|∮A(', 'Parametric enclosed area'] }), I('∫L', 'plen(', '∫Arc(', 'Polar arc length of r₁', { s: ['∫Lt', 'ins:tlen(|∫Lt(', 'Parametric arc length'] }),
            I('dy/dx', 'tslope(', 'dy/dx(', 'Parametric slope', { s: ['dy/dθ', 'ins:pslope(|pslope(', 'Polar slope'] }), I('κ', 'curv(', 'κ(', 'Curvature of X₁Y₁'), K('(', 'lp'), K(')', 'rp'), K(',', 'comma'), K('ln', 'ln', { s: ['e<sup>x</sup>', 'epow'] })] },
          { cols: 5, cls: 'knum', keys: [
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('DEL', 'del', { c: 'del' }), K('AC', 'ac', { c: 'del' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('÷', 'div', { c: 'op' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('+', 'add', { c: 'op' }), K('−', 'sub', { c: 'op' }),
            K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('(−)', 'neg', { c: 'num', s: ['Ans', 'ans'] }), K('E', 'exp10', { c: 'num' }), K('EXE', 'exe', { c: 'op exe' })] },
        ],
      };
    },
  };

  // ============================ #30 seqg ============================
  const SQN = ['u', 'v', 'w'];
  function seqKey(S) { return S.slots.map(s => s.buf.src()).join('|') + '|' + ['nmin', 'u1', 'u2', 'v1', 'v2', 'w1', 'w2'].map(k => S.win[k]).join(','); }
  function seqVal(S, k, n) {
    if (!S.sqc || S.sqc.key !== seqKey(S)) S.sqc = { key: seqKey(S), a: [[], [], []], busy: [0, 0, 0] };
    const W = S.win, nm = Math.round(W.nmin), A = S.sqc.a[k]; n = Math.round(n);
    if (!(n >= nm) || n - nm > 20000) return NaN;
    const src = S.slots[k].buf.src(); if (!src) return NaN;
    const self = new RegExp('\\b' + SQN[k] + '\\s*\\(').test(src), two = self && /n\s*-\s*2/.test(src);
    if (!self) return S.fn(k, Object.assign({ n }, seqFns(S)));
    if (S.sqc.busy[k]) { // re-entrant: only already computed values are available
      return A[n - nm] !== undefined ? A[n - nm] : NaN;
    }
    S.sqc.busy[k] = 1;
    try {
      for (let m = nm + A.length; m <= n; m++) {
        let v;
        if (m === nm) v = W[SQN[k] + '1']; else if (two && m === nm + 1) v = W[SQN[k] + '2'];
        else v = S.fn(k, Object.assign({ n: m }, seqFns(S)));
        A.push(v);
      }
    } finally { S.sqc.busy[k] = 0; }
    return A[n - nm];
  }
  function seqFns(S) { return { u: (j) => seqVal(S, 0, j), v: (j) => seqVal(S, 1, j), w: (j) => seqVal(S, 2, j) }; }
  function seqMap(S, k, x) { // first-order map f(x) obtained by substituting own(n-1)=x
    const f = seqFns(S); f[SQN[k]] = () => x; return S.fn(k, Object.assign({ n: Math.round(S.win.nmin) + 1 }, f));
  }
  function seqOn(S) { return [0, 1, 2].filter(k => S.slots[k].on && S.slots[k].buf.src()); }
  function seqPanel(S) {
    const T = S.trace; if (!T) return; const ks = seqOn(S); const k = ks[T.c] != null ? ks[T.c] : 0;
    if (S.smode === 'web') { const pts = webPts(S, k, T.p); S.panel = [`cobweb ${SQN[k]}: step ${T.p}`, `${SQN[k]}(${Math.round(S.win.nmin) + T.p}) = ${N(seqVal(S, k, Math.round(S.win.nmin) + T.p))}`]; return pts; }
    if (S.smode === 'uv') { S.panel = [`n=${T.p}`, `u=${N(seqVal(S, 0, T.p))}  v=${N(seqVal(S, 1, T.p))}`]; return; }
    S.panel = [`${SQN[k]}(${T.p}) = ${N(seqVal(S, k, T.p))}`, `Δ = ${N(seqVal(S, k, T.p) - seqVal(S, k, T.p - 1))}   ratio = ${N(seqVal(S, k, T.p) / seqVal(S, k, T.p - 1))}`];
  }
  function webPts(S, k, steps) { const nm = Math.round(S.win.nmin); let x = seqVal(S, k, nm); const pts = [[x, 0]]; for (let i = 0; i < steps; i++) { const y = seqMap(S, k, x); pts.push([x, y]); pts.push([y, y]); x = y; if (!isFinite(x)) break; } return pts; }
  const SEQ = {
    sum: (S, k, a, b) => { let s = 0; for (let n = a; n <= b; n++) s += seqVal(S, k, n); return s; },
    fixed: (S, k) => { const W = S.win; return NUM.roots(x => seqMap(S, k, x) - x, W.xmin, W.xmax, 600); },
    period(S, k) { const nm = Math.round(S.win.nmin); const base = nm + 500; const v0 = seqVal(S, k, base); for (let p = 1; p <= 64; p++) { let ok = true; for (let j = 0; j < 3 && ok; j++) if (Math.abs(seqVal(S, k, base + p + j * p) - v0) > 1e-6 * (1 + Math.abs(v0))) ok = false; if (ok) return p; } return 0; },
  };
  const fib = (n) => { n = Math.round(n); let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };
  D.seqg = {
    family: 'graph', app: 'specgraph', angle: 'rad', bg: '#0b1410', styleName: 'sequence and recursion graphing (time plot, cobweb, phase plot)',
    slots: [{ name: 'u', label: 'u(n)=', init: '1.5*u(n-1)-0.05*u(n-1)^2' }, { name: 'v', label: 'v(n)=', init: 'v(n-1)+v(n-2)', on: false }, { name: 'w', label: 'w(n)=', init: '3+2*(-0.8)^n' }],
    win: { xmin: 0, xmax: 30, ymin: -1, ymax: 14, xscl: 5, yscl: 2, nmin: 1, nmax: 30, u1: 1, u2: 1, v1: 1, v2: 1, w1: 0, w2: 0 },
    winFields: [['nmin', 'nMin'], ['nmax', 'nMax'], ['u1', 'u(nMin)'], ['u2', 'u(nMin+1)'], ['v1', 'v(nMin)'], ['v2', 'v(nMin+1)'], ['w1', 'w(nMin)'], ['w2', 'w(nMin+1)'], ['xmin', 'Xmin'], ['xmax', 'Xmax'], ['xscl', 'Xscl'], ['ymin', 'Ymin'], ['ymax', 'Ymax'], ['yscl', 'Yscl']],
    editHint: 'use u(n−1), u(n−2), v(n−1)… · start values in WINDOW · SEL on/off',
    ginit(S) { S.smode = 'time'; S.psum = false; S.tbl.start = 1; },
    ind: (S) => ({ time: 'TIME', web: 'WEB', uv: 'uv' }[S.smode]) + (S.psum ? ' Σ' : ''),
    draw(S, g, P) {
      const W = S.win; GK.grid(g, P, W, '#14301f'); GK.axes(g, P, W, '#3fbf6f');
      const nm = Math.round(W.nmin), nM = Math.round(W.nmax), ks = seqOn(S), cols = ['#7CFF6B', '#FF6BD5', '#FFD23F'];
      if (S.smode === 'time') {
        ks.forEach(k => { let acc = 0; for (let n = nm; n <= nM && n - nm < 3000; n++) { const v = seqVal(S, k, n); acc += v; const y = S.psum ? acc : v; GK.dot(g, P, n, y, cols[k], 2.6); } });
      } else if (S.smode === 'web') {
        const k = ks[0] != null ? ks[0] : 0; const pts = []; for (let px = 0; px <= P.w; px += 2) { const x = P.x(px); pts.push([x, seqMap(S, k, x)]); }
        GK.path(g, P, pts, cols[k], 1.6); GK.seg(g, P, W.xmin, W.xmin, W.xmax, W.xmax, '#4c8a63', 1, [4, 3]);
        const steps = S.trace ? S.trace.p : Math.min(60, nM - nm); GK.path(g, P, webPts(S, k, steps), '#ffffff', 1);
      } else {
        const pts = []; for (let n = nm; n <= nM && n - nm < 3000; n++) pts.push([seqVal(S, 0, n), seqVal(S, 1, n)]); GK.path(g, P, pts, '#4c8a63', 0.8); pts.forEach(p => GK.dot(g, P, p[0], p[1], '#7CFF6B', 2));
      }
      const T = S.trace; if (T && S.smode !== 'web') { const k = ks[T.c] != null ? ks[T.c] : 0; if (S.smode === 'time') GK.ring(g, P, T.p, seqVal(S, k, T.p), '#fff', 5); else GK.ring(g, P, seqVal(S, 0, T.p), seqVal(S, 1, T.p), '#fff', 5); }
      if (S.overlay && S.overlay.pts) S.overlay.pts.forEach(p => GK.ring(g, P, p[0], p[1], '#FFD23F', 6));
    },
    startTrace(S) { const t = { c: 0, p: S.smode === 'web' ? 1 : Math.round(S.win.nmin) }; S.trace = t; seqPanel(S); return t; },
    traceKey(S, act) {
      const T = S.trace; if (!T) return undefined; const ks = seqOn(S);
      if (act === 'left') T.p = Math.max(S.smode === 'web' ? 0 : Math.round(S.win.nmin), T.p - 1); else if (act === 'right') T.p++;
      else if (act === 'up' || act === 'down') T.c = (T.c + (act === 'up' ? -1 : 1) + Math.max(1, ks.length)) % Math.max(1, ks.length);
      else if (act === 'exe' || act === 'ok') { S.openForm('TRACE TO n', [['p', 'n', T.p]], (S2, v) => { S2.trace.p = Math.round(v.p); S2.view = 'graph'; seqPanel(S2); }); return true; }
      else return undefined; seqPanel(S); return true;
    },
    tableCols: (S) => [{ h: 'n', f: v => v }, { h: 'u(n)', f: v => seqVal(S, 0, v) }, { h: 'v(n)', f: v => seqVal(S, 1, v) }, { h: 'w(n)', f: v => seqVal(S, 2, v) }],
    tools(S) {
      const pickSeq = (title, extra, done) => S.openForm(title, [['k', 'seq 1=u 2=v 3=w', 1]].concat(extra), (S2, v) => { S2.view = 'graph'; done(S2, Math.min(3, Math.max(1, Math.round(v.k))) - 1, v); });
      return [
        { t: 'Time plot n → u(n)', run: (S) => { S.smode = 'time'; S.view = 'graph'; S.trace = null; } },
        { t: 'Cobweb (web) plot', run: (S) => { S.smode = 'web'; S.view = 'graph'; S.trace = null; } },
        { t: 'Phase plot u vs v', run: (S) => { S.smode = 'uv'; S.view = 'graph'; S.trace = null; } },
        { t: 'Toggle partial sums Σ', run: (S) => { S.psum = !S.psum; S.view = 'graph'; } },
        { t: 'Term a(n)', run: (S) => pickSeq('TERM', [['n', 'n', 10]], (S2, k, v) => { const x = seqVal(S2, k, v.n); S2.ans = x; S2.panel = [`${SQN[k]}(${Math.round(v.n)}) = ${N(x)}`]; }) },
        { t: 'Sum of terms Σ', run: (S) => pickSeq('SUM', [['a', 'from n', 1], ['b', 'to n', 10]], (S2, k, v) => { const s = SEQ.sum(S2, k, Math.round(v.a), Math.round(v.b)); S2.ans = s; S2.panel = [`Σ ${SQN[k]}(n), n=${Math.round(v.a)}…${Math.round(v.b)} = ${N(s)}`]; }) },
        { t: 'Limit estimate', run: (S) => pickSeq('LIMIT', [], (S2, k) => { const nm = Math.round(S2.win.nmin); const a = seqVal(S2, k, nm + 2000), b = seqVal(S2, k, nm + 2001); S2.ans = b; S2.panel = Math.abs(a - b) < 1e-8 * (1 + Math.abs(b)) ? [`${SQN[k]}(n) → ${N(b)} (converges)`] : [`no single limit: ${N(a)}, ${N(b)}`, `period ≈ ${SEQ.period(S2, k) || 'none ≤ 64'}`]; }) },
        { t: 'Fixed points + stability', run: (S) => pickSeq('FIXED POINTS', [], (S2, k) => { const fp = SEQ.fixed(S2, k); S2.ans = fp[fp.length - 1]; S2.overlay = { pts: fp.map(x => [x, x]) }; S2.smode = 'web'; S2.panel = fp.length ? fp.slice(0, 4).map(x => { const d = NUM.d1(t => seqMap(S2, k, t), x); return `x*=${N(x)} |f′|=${N(Math.abs(d))} ${Math.abs(d) < 1 ? 'stable' : 'unstable'}`; }) : ['no fixed point in X range']; }) },
        { t: 'Arithmetic / geometric test', run: (S) => pickSeq('PATTERN', [], (S2, k) => { const nm = Math.round(S2.win.nmin); const a = [0, 1, 2, 3, 4].map(i => seqVal(S2, k, nm + i)); const d = a.slice(1).map((x, i) => x - a[i]), r = a.slice(1).map((x, i) => x / a[i]); const same = (L) => L.every(x => Math.abs(x - L[0]) < 1e-9 * (1 + Math.abs(L[0]))); S2.panel = [same(d) ? `arithmetic, d = ${N(d[0])}` : same(r) ? `geometric, r = ${N(r[0])}` : 'neither arithmetic nor geometric', `first terms ${a.map(N).join(', ')}`]; S2.ans = same(d) ? d[0] : same(r) ? r[0] : NaN; }) },
        { t: 'First n with a(n) ≥ value', run: (S) => pickSeq('THRESHOLD', [['y', 'value', 10]], (S2, k, v) => { const nm = Math.round(S2.win.nmin); let n = nm; for (; n < nm + 20000; n++) if (seqVal(S2, k, n) >= v.y) break; S2.ans = n < nm + 20000 ? n : NaN; S2.panel = n < nm + 20000 ? [`first n with ${SQN[k]}(n) ≥ ${N(v.y)} is n = ${n}`] : ['not reached within 20000 terms']; }) },
        { t: 'Cycle (period) detection', run: (S) => pickSeq('PERIOD', [], (S2, k) => { const p = SEQ.period(S2, k); S2.ans = p; S2.panel = [p ? `eventual period ${p}` : 'no cycle ≤ 64 detected']; }) },
      ];
    },
    acts: {
      zoom: (S) => S.openMenu('ZOOM', GK.zoomMenu(S, [{ t: 'Fit terms (nMin…nMax)', run: (S) => { const W = S.win, nm = Math.round(W.nmin), nM = Math.round(W.nmax); let lo = Infinity, hi = -Infinity; seqOn(S).forEach(k => { for (let n = nm; n <= nM; n++) { const v = seqVal(S, k, n); if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } } }); if (isFinite(lo)) { const m = (hi - lo) * 0.1 || 1; Object.assign(W, { xmin: nm - 1, xmax: nM + 1, ymin: lo - m, ymax: hi + m }); } S.view = 'graph'; } }])),
      smode: (S) => { S.smode = { time: 'web', web: 'uv', uv: 'time' }[S.smode]; S.trace = null; S.msg = 'Plot: ' + S.smode.toUpperCase(); },
    },

    scope: (S) => ({
      U: (n) => seqVal(S, 0, n), V: (n) => seqVal(S, 1, n), W: (n) => seqVal(S, 2, n),
      sumu: (a, b) => SEQ.sum(S, 0, Math.round(a), Math.round(b)), sumv: (a, b) => SEQ.sum(S, 1, Math.round(a), Math.round(b)),
      ap: (a, d, n) => a + (n - 1) * d, gp: (a, r, n) => a * Math.pow(r, n - 1), apsum: (a, d, n) => n / 2 * (2 * a + (n - 1) * d), gpsum: (a, r, n) => r === 1 ? a * n : a * (1 - Math.pow(r, n)) / (1 - r), gpinf: (a, r) => Math.abs(r) < 1 ? a / (1 - r) : NaN,
      fib, lucas: (n) => fib(n - 1) + fib(n + 1),
    }),
    features: [
      'Three sequence slots u(n), v(n), w(n)', 'Explicit formulas in n or recursive formulas using u(n−1), u(n−2)', 'Cross-references between sequences (e.g. v(n) uses u(n−1))',
      'Start values u(nMin), u(nMin+1) for first- and second-order recursions', 'Adjustable nMin / nMax plot range', 'Time plot of terms as glowing dots',
      'Cobweb (web) plot with y = x diagonal and staircase iteration', 'Phase plot of u(n) against v(n)', 'Partial-sum Σ display toggle',
      'Trace by term index with Δ and ratio read-out', 'Cobweb trace steps through iterations one at a time', 'Trace jump to any n with EXE',
      'Tool: single term a(n)', 'Tool: sum of terms between two indices', 'Tool: limit estimate with convergence check',
      'Tool: fixed points with |f′| stability test, marked on the cobweb', 'Tool: arithmetic / geometric pattern test', 'Tool: first n reaching a threshold',
      'Tool: eventual period (cycle) detection up to 64', 'Zoom fit to terms nMin…nMax', 'Plot-mode key cycles TIME → WEB → uv',
      'Table of n with u, v, w columns', 'Home functions U(n), V(n), W(n)', 'Home sums sumu(a,b) and sumv(a,b)', 'Arithmetic progression ap() and apsum()',
      'Geometric progression gp(), gpsum() and gpinf()', 'Fibonacci fib(n) and Lucas lucas(n)', 'Memoised evaluation up to 20 000 terms',
      'Re-entrancy guard for mutually recursive definitions', 'Dark phosphor-green display distinct from function graphers', 'Window form with 14 fields',
    ],
    examples: [
      { kind: 'sfib', title: 'Second-order recursion v(n) = v(n−1) + v(n−2), v(1) = v(2) = 1', human: 'V(10)', exp: 55, keys: ['ins:V(|V(', 'd1', 'd0', 'rp', 'exe'] },
      { kind: 'slog', title: 'Logistic-type recursion u(n) = 1.5u − 0.05u² approaches 10', human: 'U(60)', exp: 10, keys: ['ins:U(|U(', 'd6', 'd0', 'rp', 'exe'] },
      { kind: 'sexp', title: 'Explicit sequence w(n) = 3 + 2(−0.8)ⁿ at n = 2', human: 'W(2)', exp: 4.28, keys: ['ins:W(|W(', 'd2', 'rp', 'exe'] },
      { kind: 'sap', title: 'Sum of the first 10 terms of 3, 7, 11, …', human: 'apsum(3,4,10)', exp: 210, keys: ['ins:apsum(|APΣ(', 'd3', 'comma', 'd4', 'comma', 'd1', 'd0', 'rp', 'exe'] },
      { kind: 'sgp', title: 'Infinite geometric series 6 + 3 + 1.5 + …', human: 'gpinf(6,0.5)', exp: 12, keys: ['ins:gpinf(|GP∞(', 'd6', 'comma', 'd0', 'dot', 'd5', 'rp', 'exe'] },
      { kind: 'sfibf', title: 'Fibonacci number F(20)', human: 'fib(20)', exp: 6765, keys: ['ins:fib(|Fib(', 'd2', 'd0', 'rp', 'exe'] },
      { kind: 'ssum', title: 'Sum v(1)+…+v(10) of the Fibonacci slot', human: 'sumv(1,10)', exp: 143, keys: ['ins:sumv(|Σv(', 'd1', 'comma', 'd1', 'd0', 'rp', 'exe'] },
    ],
    notes: ['Sequence & recursion grapher. In a recursive slot, u(n−1) means the previous term; start values are set in WINDOW.', 'The cobweb plot substitutes x for the previous term to draw y = f(x) and iterates from u(nMin).'],
    model({ K, I, PAD }) {
      return {
        w: 372,
        theme: { body: 'linear-gradient(#2d1b4e,#160d2b)', cls: 'th-sp', vars: { '--bezel': '#120a24', '--key': '#3e2a6b', '--kt': '#e8ddff', '--knum': '#241640', '--knt': '#b8ff9f', '--kop': '#7CFF6B', '--kopt': '#0b1410', '--kdel': '#ff5c8a', '--kdelt': '#fff', '--kshift': '#FFD23F', '--kshiftt': '#111', '--kalpha': '#FF6BD5', '--kalphat': '#111', '--ls': '#FFD23F', '--la': '#FF6BD5', '--pad': '#7CFF6B', '--padt': '#0b1410', '--lcd': '#0b1410', '--kr': '16px' } },
        display: { w: 330, h: 206, cls: 'sx-lcdphos' },
        sections: [
          { cols: 4, cls: 'kgfun', kc: 'fn sm', keys: [K('u(n)=', 'yeq', { tip: 'Edit sequences', s: ['PLOT▸', 'smode', 'Cycle time/web/phase plot'] }), K('WINDOW', 'window', { tip: 'n range, start values and view', s: ['TBLSET', 'tblset'] }), K('ZOOM', 'zoom'), K('GRAPH', 'graph', { s: ['TABLE', 'table'] })] },
          { cols: 5, cls: 'kgnav', kc: 'sm', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('TRACE', 'trace'), PAD('replay', { r: 2 }), K('TOOLS', 'tools', { tip: 'Sums, limits, fixed points' }), K('ON', 'on', { c: 'del sm' }),
            K('HOME', 'home'), K('SEL', 'sel'), K('MODE', 'setup'), K('WEB', 'smode', { tip: 'Cycle plot type' })] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [I('n', 'n', 'n', 'Index variable'), I('u(', 'u(', 'u(', 'Previous terms of u'), I('v(', 'v(', 'v(', 'Terms of v'), I('w(', 'w(', 'w(', 'Terms of w'), I('n−1', 'n-1', 'n−1', 'Previous index'), I('n−2', 'n-2', 'n−2', 'Index two back'),
            I('U(', 'U(', 'U(', 'Term of u on the home screen', { s: ['Σu', 'ins:sumu(|Σu(', 'Sum of u terms'] }), I('V(', 'V(', 'V(', 'Term of v', { s: ['Σv', 'ins:sumv(|Σv(', 'Sum of v terms'] }), I('W(', 'W(', 'W(', 'Term of w'), I('AP', 'ap(', 'AP(', 'n-th term of an arithmetic progression', { s: ['APΣ', 'ins:apsum(|APΣ(', 'Arithmetic series'] }), I('GP', 'gp(', 'GP(', 'n-th term of a geometric progression', { s: ['GPΣ', 'ins:gpsum(|GPΣ(', 'Geometric series'] }), I('GP∞', 'gpinf(', 'GP∞(', 'Sum to infinity'),
            I('Fib', 'fib(', 'Fib(', 'Fibonacci number', { s: ['Luc', 'ins:lucas(|Luc(', 'Lucas number'] }), K('^', 'pow'), K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }), K('(', 'lp'), K(')', 'rp'), K(',', 'comma')] },
          { cols: 5, cls: 'knum', keys: [
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('DEL', 'del', { c: 'del' }), K('AC', 'ac', { c: 'del' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('÷', 'div', { c: 'op' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('+', 'add', { c: 'op' }), K('−', 'sub', { c: 'op' }),
            K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('(−)', 'neg', { c: 'num', s: ['Ans', 'ans'] }), K('π', 'pi', { c: 'num' }), K('ENTER', 'exe', { c: 'op exe' })] },
        ],
      };
    },
  };

  // ============================ #36 impl ============================
  const RELS = ['<=', '>=', '≤', '≥', '==', '<', '>', '='];
  function relOf(S, k) {
    const src = S.slots[k].buf.src(); if (!src) return null;
    S.icache = S.icache || {}; const c = S.icache[k]; if (c && c.src === src) return c.r;
    let op = null, at = -1, depth = 0;
    for (let i = 0; i < src.length && at < 0; i++) { const ch = src[i]; if (ch === '(') depth++; else if (ch === ')') depth--; else if (!depth) for (const r of RELS) if (src.startsWith(r, i)) { op = r; at = i; break; } }
    let r;
    try {
      const lhs = at < 0 ? src : src.slice(0, at), rhs = at < 0 ? '0' : src.slice(at + op.length);
      const nop = { '<=': '≤', '>=': '≥', '==': '=' }[op] || op || '=';
      r = { op: nop, code: MX.compile(S.prep('(' + lhs + ')-(' + rhs + ')')) };
    } catch (e) { r = null; }
    S.icache[k] = { src, r }; return r;
  }
  function F(S, k, x, y) { const r = relOf(S, k); if (!r) return NaN; try { const v = r.code.evaluate(Object.assign(S.gscope(), { x, y })); return typeof v === 'number' ? v : Number(v); } catch (e) { return NaN; } }
  const holds = (op, v) => op === '<' ? v < 0 : op === '>' ? v > 0 : op === '≤' ? v <= 0 : op === '≥' ? v >= 0 : Math.abs(v) < 1e-9;
  const IM = {
    grad: (S, k, x, y) => { const h = 1e-5 * (1 + Math.abs(x) + Math.abs(y)); return [(F(S, k, x + h, y) - F(S, k, x - h, y)) / (2 * h), (F(S, k, x, y + h) - F(S, k, x, y - h)) / (2 * h)]; },
    slope: (S, k, x, y) => { const g = IM.grad(S, k, x, y); return -g[0] / g[1]; },
    newtonY: (S, k, x, y) => { for (let i = 0; i < 60; i++) { const f = F(S, k, x, y), d = IM.grad(S, k, x, y)[1]; if (!isFinite(f) || !d) return NaN; const s = f / d; y -= s; if (Math.abs(s) < 1e-13 * (1 + Math.abs(y))) return y; } return Math.abs(F(S, k, x, y)) < 1e-8 ? y : NaN; },
    newtonX: (S, k, x, y) => { for (let i = 0; i < 60; i++) { const f = F(S, k, x, y), d = IM.grad(S, k, x, y)[0]; if (!isFinite(f) || !d) return NaN; const s = f / d; x -= s; if (Math.abs(s) < 1e-13 * (1 + Math.abs(x))) return x; } return Math.abs(F(S, k, x, y)) < 1e-8 ? x : NaN; },
    ysAt: (S, k, x) => NUM.roots(y => F(S, k, x, y), S.win.ymin, S.win.ymax, 500).map(y => IM.newtonY(S, k, x, y)).filter(isFinite),
    // two-curve intersections: grid candidates then 2-D Newton
    inter(S, a, b, P) {
      const sa = GK.march((x, y) => F(S, a, x, y), P, 6); const out = [];
      sa.forEach(([p, q]) => { const fb1 = F(S, b, p[0], p[1]), fb2 = F(S, b, q[0], q[1]); if (isFinite(fb1) && isFinite(fb2) && fb1 * fb2 <= 0) {
        let x = (p[0] + q[0]) / 2, y = (p[1] + q[1]) / 2;
        for (let i = 0; i < 40; i++) { const f1 = F(S, a, x, y), f2 = F(S, b, x, y), g1 = IM.grad(S, a, x, y), g2 = IM.grad(S, b, x, y), det = g1[0] * g2[1] - g1[1] * g2[0]; if (!det) break; const dx = (f1 * g2[1] - f2 * g1[1]) / det, dy = (g1[0] * f2 - g2[0] * f1) / det; x -= dx; y -= dy; if (Math.abs(dx) + Math.abs(dy) < 1e-12) break; }
        if (Math.abs(F(S, a, x, y)) < 1e-7 && Math.abs(F(S, b, x, y)) < 1e-7 && !out.some(o => Math.hypot(o[0] - x, o[1] - y) < 1e-5)) out.push([x, y]); } });
      return out;
    },
    area(S, k, n) { const W = S.win, r = relOf(S, k); if (!r) return NaN; n = n || 300; let c = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = W.xmin + (i + 0.5) * (W.xmax - W.xmin) / n, y = W.ymin + (j + 0.5) * (W.ymax - W.ymin) / n; if (holds(r.op === '=' ? '≤' : r.op, F(S, k, x, y))) c++; } return c / (n * n) * (W.xmax - W.xmin) * (W.ymax - W.ymin); },
  };
  const ICOL = ['#1565c0', '#d84315', '#2e7d32', '#6a1b9a'], IFILL = ['rgba(21,101,192,.18)', 'rgba(216,67,21,.18)', 'rgba(46,125,50,.18)', 'rgba(106,27,154,.18)'];
  function implOn(S) { return [0, 1, 2, 3].filter(k => S.slots[k].on && relOf(S, k)); }
  function implPanel(S) { const T = S.trace; if (!T) return; const ks = implOn(S); const k = ks[T.c]; if (k == null) return; const ys = IM.ysAt(S, k, T.x); T.j = Math.min(T.j || 0, Math.max(0, ys.length - 1)); const y = ys[T.j];
    S.panel = [`R${k + 1}: x=${N(T.x)}  ${ys.length ? 'y=' + N(y) + (ys.length > 1 ? ` (${T.j + 1}/${ys.length})` : '') : 'no point'}`, ys.length ? `dy/dx = ${N(IM.slope(S, k, T.x, y))}` : '']; T.y = y; }
  D.impl = {
    family: 'graph', app: 'specgraph', angle: 'rad', bg: '#f4f7fb', styleName: 'implicit relation and inequality graphing F(x,y) = 0, < , >',
    slots: [{ name: 'R1', label: 'R₁:', init: 'x^2+y^2=9' }, { name: 'R2', label: 'R₂:', init: 'y>x^2-4' }, { name: 'R3', label: 'R₃:', init: 'x^3+y^3=6*x*y', on: false }, { name: 'R4', label: 'R₄:', init: 'sin(x)*cos(y)<0.2', on: false }],
    win: { xmin: -6, xmax: 6, ymin: -4.5, ymax: 4.5, xscl: 1, yscl: 1 },
    editHint: 'type relations with = < > ≤ ≥ in x and y · SEL on/off',
    ginit(S) { S.shade = 'fill'; },
    ind: (S) => 'SHADE:' + S.shade.toUpperCase(),
    draw(S, g, P) {
      const W = S.win; GK.grid(g, P, W, '#dde5f0'); GK.axes(g, P, W, '#26364d');
      implOn(S).forEach(k => {
        const r = relOf(S, k); const f = (x, y) => F(S, k, x, y);
        if (r.op !== '=' && S.shade !== 'off') { const cell = 4; g.fillStyle = IFILL[k]; for (let px = 0; px < P.w; px += cell) for (let py = 0; py < P.h; py += cell) { if (S.shade === 'hatch' && ((px + py) / cell + k) % 3) continue; if (holds(r.op, f(P.x(px + cell / 2), P.y(py + cell / 2)))) g.fillRect(px, py, cell, cell); } }
        const segs = GK.march(f, P, 3); if (r.op === '<' || r.op === '>') { if (g.setLineDash) g.setLineDash([5, 4]); } GK.drawSegs(g, P, segs, ICOL[k], 1.8); if (g.setLineDash) g.setLineDash([]);
      });
      const O = S.overlay; if (O && O.pts) O.pts.forEach(p => GK.ring(g, P, p[0], p[1], '#000', 5));
      if (O && O.normal) { const [x, y, gx, gy] = O.normal; const L = Math.hypot(gx, gy) || 1, s = (W.xmax - W.xmin) / 10; GK.seg(g, P, x, y, x + gx / L * s, y + gy / L * s, '#e91e63', 2); const m = -gx / gy; GK.seg(g, P, x - s, y - m * s, x + s, y + m * s, '#e91e63', 1, [4, 3]); }
      const T = S.trace; if (T && isFinite(T.y)) { GK.seg(g, P, T.x, W.ymin, T.x, W.ymax, '#90a4ae', 0.8, [2, 3]); GK.ring(g, P, T.x, T.y, '#000', 5); }
    },
    startTrace(S) { if (!implOn(S).length) { S.msg = 'No relation selected'; return null; } const t = { c: 0, j: 0, x: (S.win.xmin + S.win.xmax) / 2 }; S.trace = t; implPanel(S); return t; },
    traceKey(S, act) {
      const T = S.trace; if (!T) return undefined; const ks = implOn(S); const dx = (S.win.xmax - S.win.xmin) / 100;
      if (act === 'left' || act === 'right') { T.x += act === 'left' ? -dx : dx; }
      else if (act === 'up') { T.j = (T.j || 0) + 1; const ys = IM.ysAt(S, ks[T.c], T.x); if (T.j >= ys.length) { T.j = 0; T.c = (T.c + 1) % ks.length; } }
      else if (act === 'down') { T.c = (T.c - 1 + ks.length) % ks.length; T.j = 0; }
      else if (act === 'exe' || act === 'ok') { S.openForm('TRACE TO x', [['x', 'x', T.x]], (S2, v) => { S2.trace.x = v.x; S2.view = 'graph'; implPanel(S2); }); return true; }
      else return undefined; implPanel(S); return true;
    },
    tableCols: (S) => [{ h: 'x', f: v => v }, { h: 'R₁ y(s)', f: v => IM.ysAt(S, 0, v).map(N).join(' ') || '—' }, { h: 'R₂ y(s)', f: v => IM.ysAt(S, 1, v).map(N).join(' ') || '—' }],
    tools(S) {
      const one = (title, extra, done) => S.openForm(title, [['k', 'relation 1-4', 1]].concat(extra), (S2, v) => { S2.view = 'graph'; done(S2, Math.min(4, Math.max(1, Math.round(v.k))) - 1, v); });
      return [
        { t: 'Solve y at x', run: (S) => one('Y AT X', [['x', 'x', 0]], (S2, k, v) => { const ys = IM.ysAt(S2, k, v.x); S2.ans = ys[0]; S2.overlay = { pts: ys.map(y => [v.x, y]) }; S2.panel = [ys.length ? `y = ${ys.map(N).join(', ')}` : 'no y in window']; }) },
        { t: 'Solve x at y', run: (S) => one('X AT Y', [['y', 'y', 0]], (S2, k, v) => { const xs = NUM.roots(x => F(S2, k, x, v.y), S2.win.xmin, S2.win.xmax, 500).map(x => IM.newtonX(S2, k, x, v.y)).filter(isFinite); S2.ans = xs[0]; S2.overlay = { pts: xs.map(x => [x, v.y]) }; S2.panel = [xs.length ? `x = ${xs.map(N).join(', ')}` : 'no x in window']; }) },
        { t: 'Intersections R₁ ∩ R₂', run: (S) => { const d = S.dims(), P = S.P(S.win, d.w, d.h); const pts = IM.inter(S, 0, 1, P); S.overlay = { pts }; S.ans = pts.length ? pts[0][0] : NaN; S.panel = pts.length ? pts.slice(0, 4).map(p => `(${N(p[0])}, ${N(p[1])})`) : ['no intersection in window']; S.view = 'graph'; } },
        { t: 'Tangent slope dy/dx at point', run: (S) => one('SLOPE', [['x', 'x', 0], ['y', 'y (near curve)', 3]], (S2, k, v) => { const y = IM.newtonY(S2, k, v.x, v.y); const m = IM.slope(S2, k, v.x, y); const gr = IM.grad(S2, k, v.x, y); S2.ans = m; S2.overlay = { normal: [v.x, y, gr[0], gr[1]] }; S2.panel = [`point (${N(v.x)}, ${N(y)})`, `dy/dx = −Fx/Fy = ${N(m)}`]; }) },
        { t: 'Gradient / normal vector', run: (S) => one('GRADIENT', [['x', 'x', 1], ['y', 'y', 1]], (S2, k, v) => { const gr = IM.grad(S2, k, v.x, v.y); S2.ans = Math.hypot(gr[0], gr[1]); S2.overlay = { normal: [v.x, v.y, gr[0], gr[1]] }; S2.panel = [`∇F = (${N(gr[0])}, ${N(gr[1])})`, `|∇F| = ${N(S2.ans)}`]; }) },
        { t: 'Test a point', run: (S) => one('TEST POINT', [['x', 'x', 0], ['y', 'y', 0]], (S2, k, v) => { const r = relOf(S2, k), f = F(S2, k, v.x, v.y); const ok = r && holds(r.op === '=' ? '=' : r.op, f); S2.ans = ok ? 1 : 0; S2.overlay = { pts: [[v.x, v.y]] }; S2.panel = [`F(${N(v.x)}, ${N(v.y)}) = ${N(f)}`, ok ? 'satisfies the relation (1)' : 'does not satisfy (0)']; }) },
        { t: 'Region area in window', run: (S) => one('AREA', [], (S2, k) => { const A = IM.area(S2, k, 300); S2.ans = A; S2.panel = [`area ≈ ${N(A)} (300×300 grid count)`]; }) },
        { t: 'Curve length in window', run: (S) => one('LENGTH', [], (S2, k) => { const d = S2.dims(), P = S2.P(S2.win, d.w, d.h); const L = GK.march((x, y) => F(S2, k, x, y), P, 2).reduce((s, [p, q]) => s + Math.hypot(q[0] - p[0], q[1] - p[1]), 0); S2.ans = L; S2.panel = [`length ≈ ${N(L)}`]; }) },
        { t: 'Bounding box of curve', run: (S) => one('BOUNDS', [], (S2, k) => { const d = S2.dims(), P = S2.P(S2.win, d.w, d.h); let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity; GK.march((x, y) => F(S2, k, x, y), P, 3).forEach(s => s.forEach(p => { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); e = Math.max(e, p[1]); })); S2.ans = b - a; S2.panel = isFinite(a) ? [`x ∈ [${N(a)}, ${N(b)}]`, `y ∈ [${N(c)}, ${N(e)}]`] : ['no curve']; }) },
        { t: 'Shading: fill / hatch / off', run: (S) => { S.shade = { fill: 'hatch', hatch: 'off', off: 'fill' }[S.shade]; S.view = 'graph'; } },
      ];
    },
    acts: {
      zoom: (S) => S.openMenu('ZOOM', GK.zoomMenu(S)),
      releq: (S) => S.exec('ins:=|='), rellt: (S) => S.exec('ins:<|<'), relgt: (S) => S.exec('ins:>|>'), relle: (S) => S.exec('ins:≤|≤'), relge: (S) => S.exec('ins:≥|≥'),
      shade: (S) => { S.shade = { fill: 'hatch', hatch: 'off', off: 'fill' }[S.shade]; S.msg = 'Shading ' + S.shade; },
    },

    scope: (S) => ({
      F1: (x, y) => F(S, 0, x, y), F2: (x, y) => F(S, 1, x, y), F3: (x, y) => F(S, 2, x, y), F4: (x, y) => F(S, 3, x, y),
      idydx: (x, y) => IM.slope(S, 0, x, y), ysol: (x, g) => IM.newtonY(S, 0, x, g), xsol: (y, g) => IM.newtonX(S, 0, g, y),
      inreg: (k, x, y) => { const r = relOf(S, Math.round(k) - 1); return r && holds(r.op, F(S, Math.round(k) - 1, x, y)) ? 1 : 0; },
      gradn: (x, y) => Math.hypot.apply(null, IM.grad(S, 0, x, y)), dist: (a, b, c, d) => Math.hypot(c - a, d - b),
    }),
    features: [
      'Four relation slots R₁–R₄ accepting = < > ≤ ≥', 'Implicit curves F(x,y)=0 drawn by marching squares', 'Inequality regions shaded per relation colour',
      'Strict inequalities drawn with dashed boundary', 'Shading styles: fill, hatch or off', 'Pole/jump rejection while contouring',
      'Trace along x with all y-solutions cycled by ▲', 'Trace read-out of implicit slope dy/dx', 'Trace jump to an exact x with EXE',
      'Tool: solve y at given x (all roots in window)', 'Tool: solve x at given y', 'Tool: intersections of R₁ and R₂ by 2-D Newton refinement',
      'Tool: tangent slope −Fx/Fy with tangent and normal drawn', 'Tool: gradient vector and magnitude', 'Tool: test whether a point satisfies a relation',
      'Tool: region area estimate (grid count)', 'Tool: curve length estimate in the window', 'Tool: bounding box of a curve',
      'Relation keys = < > ≤ ≥', 'Zoom menu with square and decimal windows', 'Table of x with every y-solution of R₁ and R₂',
      'Home functions F1()…F4() evaluate F = lhs − rhs', 'Home implicit derivative idydx(x,y)', 'Home Newton solvers ysol(x,guess) and xsol(y,guess)',
      'Home region test inreg(k,x,y) → 1/0', 'Home gradient magnitude gradn(x,y) and dist()', 'Pan with the cursor cross',
      'Folium, circle, parabola and trig-region presets in the slots', 'Automatic relation parsing with brackets respected', 'Light steel display with square keys', 'Curves cached per slot for speed',
    ],
    examples: [
      { kind: 'if1', title: 'Value of F = x² + y² − 9 at (1,1)', human: 'F1(1,1)', exp: -7, keys: ['ins:F1(|F₁(', 'd1', 'comma', 'd1', 'rp', 'exe'] },
      { kind: 'iysol', title: 'Upper point of the circle above x = 0 (Newton from 2)', human: 'ysol(0,2)', exp: 3, keys: ['ins:ysol(|ySol(', 'd0', 'comma', 'd2', 'rp', 'exe'] },
      { kind: 'ixsol', title: 'Circle crossing of the x-axis near x = 2', human: 'xsol(0,2)', exp: 3, keys: ['ins:xsol(|xSol(', 'd0', 'comma', 'd2', 'rp', 'exe'] },
      { kind: 'islope', title: 'Implicit slope of the circle at (0, 3)', human: 'idydx(0,3)', exp: 0, keys: ['ins:idydx(|dy/dx(', 'd0', 'comma', 'd3', 'rp', 'exe'] },
      { kind: 'iin', title: 'Is (0,0) inside y > x² − 4 ? (1 = yes)', human: 'inreg(2,0,0)', exp: 1, keys: ['ins:inreg(|In?(', 'd2', 'comma', 'd0', 'comma', 'd0', 'rp', 'exe'] },
      { kind: 'igrad', title: 'Gradient magnitude of x² + y² − 9 at (3,4)', human: 'gradn(3,4)', exp: 10, keys: ['ins:gradn(|‖∇F‖(', 'd3', 'comma', 'd4', 'rp', 'exe'] },
    ],
    notes: ['Implicit & inequality grapher. Each slot is a relation lhs ⋈ rhs; F = lhs − rhs is contoured on a 3-pixel grid.', 'Inequality regions are shaded; boundaries of strict inequalities are dashed.'],
    model({ K, I, PAD }) {
      return {
        w: 376,
        theme: { body: 'linear-gradient(#cfd8e3,#9fb0c4)', cls: 'th-sp', vars: { '--bezel': '#1f2a3a', '--key': '#3a4d66', '--kt': '#fff', '--knum': '#ffffff', '--knt': '#1f2a3a', '--kop': '#1565c0', '--kopt': '#fff', '--kdel': '#d84315', '--kdelt': '#fff', '--kshift': '#00acc1', '--kshiftt': '#04202a', '--kalpha': '#6a1b9a', '--kalphat': '#fff', '--ls': '#007c91', '--la': '#6a1b9a', '--pad': '#1f2a3a', '--padt': '#fff', '--lcd': '#f4f7fb', '--kr': '2px' } },
        display: { w: 334, h: 210, cls: 'sx-lcdsteel' },
        sections: [
          { cols: 5, cls: 'kgfun', kc: 'fn sm', keys: [K('REL', 'yeq', { tip: 'Edit relations' }), K('WINDOW', 'window', { s: ['TBLSET', 'tblset'] }), K('ZOOM', 'zoom'), K('TRACE', 'trace', { s: ['SHADE', 'shade', 'Cycle shading style'] }), K('GRAPH', 'graph', { s: ['TABLE', 'table'] })] },
          { cols: 5, cls: 'krel', kc: 'op sm', keys: [K('=', 'releq', { tip: 'Equals (curve)' }), K('<', 'rellt', { tip: 'Less than (strict region)' }), K('>', 'relgt', { tip: 'Greater than' }), K('≤', 'relle', { tip: 'Less or equal' }), K('≥', 'relge', { tip: 'Greater or equal' })] },
          { cols: 6, cls: 'kgnav', kc: 'sm', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('TOOLS', 'tools', { tip: 'Solve, intersect, slope, area' }), PAD('oval', { r: 2, w: 2, center: ['OK', 'ok'] }), K('SEL', 'sel'), K('ON', 'on', { c: 'del sm' }),
            I('x', 'x', 'x', 'Variable x', { c: 'fn sm' }), I('y', 'y', 'y', 'Variable y', { c: 'fn sm' }), K('HOME', 'home'), K('MODE', 'setup')] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [K('sin', 'sin', { s: ['sin⁻¹', 'asin'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'] }), K('tan', 'tan'), K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }), K('^', 'pow'), K('|x|', 'abs'),
            I('F₁(', 'F1(', 'F₁(', 'Evaluate relation 1', { s: ['F₂(', 'ins:F2(|F₂(', 'Evaluate relation 2'] }), I('ySol', 'ysol(', 'ySol(', 'Newton solve y on R₁'), I('xSol', 'xsol(', 'xSol(', 'Newton solve x on R₁'), I('dy/dx', 'idydx(', 'dy/dx(', 'Implicit slope of R₁'), I('‖∇‖', 'gradn(', '‖∇F‖(', 'Gradient magnitude'), I('In?', 'inreg(', 'In?(', 'Region test'),
            K('(', 'lp'), K(')', 'rp'), K(',', 'comma'), K('π', 'pi'), K('ln', 'ln'), K('e<sup>x</sup>', 'epow')] },
          { cols: 5, cls: 'knum', keys: [
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('DEL', 'del', { c: 'del' }), K('AC', 'ac', { c: 'del' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('÷', 'div', { c: 'op' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('+', 'add', { c: 'op' }), K('−', 'sub', { c: 'op' }),
            K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('(−)', 'neg', { c: 'num', s: ['Ans', 'ans'] }), K('E', 'exp10', { c: 'num' }), K('EXE', 'exe', { c: 'op exe' })] },
        ],
      };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
