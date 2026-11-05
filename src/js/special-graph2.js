/* U-45 CALCULATORS v1.3 — #21 Statistics Plotter (splot), #39 3-D Surface (surf). Original code. */
(function (G) {
  'use strict';
  const C = G.SpecCore, NUM = C.NUM, fs = C.fmtShort, SF = C.SF;
  const L = G.SpecLib, DataEd = L.DataEd, ST = L.ST, REG = L.REG;
  const GK = G.SpecGK, D = G.SPEC_DEFS = G.SPEC_DEFS || {};
  const N = (v) => fs(v), TAU = 2 * Math.PI;
  const numpad = (K, exeFace) => [
    K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('DEL', 'del', { c: 'del' }), K('AC', 'ac', { c: 'del' }),
    K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('÷', 'div', { c: 'op' }),
    K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('+', 'add', { c: 'op' }), K('−', 'sub', { c: 'op' }),
    K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('(−)', 'neg', { c: 'num', s: ['Ans', 'ans'] }), K('E', 'exp10', { c: 'num' }), K(exeFace || 'EXE', 'exe', { c: 'op exe' })];
  GK.numpad = numpad;
  // route a key to the default SpecGraph behaviour for the current view (for defs that override arrows)
  GK.fallThrough = function (S, act, kd) { if (S.view === 'home') return G.SpecApp.prototype.exec.call(S, act, kd); if (S.view === 'edit') return S.editKey(act, kd); if (S.view === 'table') return S.tableKey(act, kd); return S.graphKey(act, kd); };
  const nphi = (z) => 0.5 * (1 + SF.erf(z / Math.SQRT2));
  const npdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(TAU));
  GK.nphi = nphi; GK.npdf = npdf;

  // ============================ #21 splot ============================
  const SAMPLE = { L1: [52, 61, 64, 67, 68, 70, 71, 72, 74, 75, 75, 77, 78, 80, 82, 83, 85, 88, 91, 98], L2: [2, 3, 3.5, 4, 4, 5, 5, 5.5, 6, 6, 6.5, 7, 7, 7.5, 8, 8.5, 9, 9.5, 10, 12], L3: [] };
  const LS = ['L1', 'L2', 'L3'];
  const lst = (S, k) => DataEd.list(S, LS[Math.round(k) - 1] || 'L1');
  function bins(S, a) { const W = S.win, bw = W.bw > 0 ? W.bw : 1, b0 = W.b0; const out = []; if (!a.length) return out; const hi = Math.max.apply(null, a); for (let lo = b0; lo <= hi && out.length < 200; lo += bw) out.push({ lo, hi: lo + bw, n: a.filter(v => v >= lo && v < lo + bw).length }); return out; }
  function five(a) { const q = ST.quart(a), iqr = q.q3 - q.q1, lf = q.q1 - 1.5 * iqr, uf = q.q3 + 1.5 * iqr; const inl = q.sorted.filter(v => v >= lf && v <= uf); return Object.assign(q, { iqr, lf, uf, wlo: inl[0], whi: inl[inl.length - 1], out: q.sorted.filter(v => v < lf || v > uf) }); }
  const pctl = (a, p) => { const s = a.slice().sort((x, y) => x - y); if (!s.length) return NaN; const r = (p / 100) * (s.length - 1), i = Math.floor(r); return i + 1 < s.length ? s[i] + (r - i) * (s[i + 1] - s[i]) : s[i]; };
  const invN = (p) => { let lo = -8, hi = 8; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (nphi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
  const PT = { hist: 'HISTOGRAM', box: 'BOX PLOT', dot: 'DOT PLOT', scat: 'SCATTER', xyl: 'xy-LINE', ogive: 'OGIVE', nprob: 'NORMAL PROB', pie: 'PIE', dist: 'NORMAL CURVE' };
  const mm = (a) => [Math.min.apply(null, a), Math.max.apply(null, a)];
  function zoomStat(S) {
    const a = lst(S, 1), W = S.win; if (!a.length) return;
    const [lo, hi] = mm(a), sp = (hi - lo) || 1;
    if (S.ptype === 'scat' || S.ptype === 'xyl') { const p = DataEd.pairs(S, 'L2', 'L1'); if (p.x.length) { const [x0, x1] = mm(p.x), [y0, y1] = mm(p.y); Object.assign(W, { xmin: x0 - (x1 - x0) * 0.1 - 0.5, xmax: x1 + (x1 - x0) * 0.1 + 0.5, ymin: y0 - (y1 - y0) * 0.1 - 0.5, ymax: y1 + (y1 - y0) * 0.1 + 0.5, xscl: 1, yscl: 10 }); } return; }
    if (S.ptype === 'nprob') { Object.assign(W, { xmin: lo - sp * 0.1, xmax: hi + sp * 0.1, ymin: -2.6, ymax: 2.6, yscl: 1 }); return; }
    if (S.ptype === 'dist') { const m = ST.mean(a), s = Math.sqrt(ST.svar(a)); Object.assign(W, { xmin: m - 4 * s, xmax: m + 4 * s, ymin: -0.15 / s, ymax: 1.2 / (s * Math.sqrt(TAU)), yscl: 0 }); return; }
    const B = bins(S, a), top = Math.max(1, ...B.map(b => b.n));
    Object.assign(W, { xmin: Math.min(lo, W.b0) - sp * 0.08, xmax: hi + sp * 0.12, ymin: S.ptype === 'hist' || S.ptype === 'ogive' ? -top * 0.12 : -1, ymax: S.ptype === 'ogive' ? a.length * 1.1 : S.ptype === 'hist' ? top * 1.15 : 3, yscl: Math.max(1, Math.round(top / 5)), xscl: W.bw });
  }
  function spPanel(S) {
    const T = S.trace; if (!T) return; const a = lst(S, 1); if (!a.length) { S.panel = ['L1 is empty']; return; }
    if (S.ptype === 'hist' || S.ptype === 'ogive' || S.ptype === 'pie') { const B = bins(S, a); T.i = Math.max(0, Math.min(T.i, B.length - 1)); const b = B[T.i]; let cum = 0; for (let i = 0; i <= T.i; i++) cum += B[i].n; S.panel = b ? [`bin [${N(b.lo)}, ${N(b.hi)})  n = ${b.n}`, `cumulative ${cum} (${N(100 * cum / a.length)}%)  rel ${N(100 * b.n / a.length)}%`] : ['no bins']; return; }
    if (S.ptype === 'box') { const f = five(a), names = [['minX', f.min], ['Q1', f.q1], ['Med', f.med], ['Q3', f.q3], ['maxX', f.max]]; T.i = ((T.i % 5) + 5) % 5; S.panel = [`${names[T.i][0]} = ${N(names[T.i][1])}`, `IQR ${N(f.iqr)}  outliers ${f.out.length}`]; T.x = names[T.i][1]; return; }
    if (S.ptype === 'scat' || S.ptype === 'xyl' || S.ptype === 'dot') { const p = S.ptype === 'dot' ? { x: a.slice().sort((u, v) => u - v), y: a.map(() => 0) } : DataEd.pairs(S, 'L2', 'L1'); if (!p.x.length) return; T.i = ((T.i % p.x.length) + p.x.length) % p.x.length; S.panel = [`point ${T.i + 1}/${p.x.length}`, S.ptype === 'dot' ? `x = ${N(p.x[T.i])}` : `(L2, L1) = (${N(p.x[T.i])}, ${N(p.y[T.i])})`]; return; }
    if (S.ptype === 'dist') { const m = ST.mean(a), s = Math.sqrt(ST.svar(a)); T.x = T.x == null ? m : T.x; S.panel = [`x = ${N(T.x)}  z = ${N((T.x - m) / s)}`, `pdf ${N(npdf(T.x, m, s))}  P(X≤x) ${N(nphi((T.x - m) / s))}`]; return; }
    if (S.ptype === 'nprob') { const s = a.slice().sort((u, v) => u - v); T.i = ((T.i % s.length) + s.length) % s.length; S.panel = [`x = ${N(s[T.i])}`, `normal score z = ${N(invN((T.i + 0.625) / (s.length + 0.25)))}`]; }
  }
  function spDraw(S, g, P) {
    const W = S.win, a = lst(S, 1), pal = ['#e76f51', '#2a9d8f', '#e9c46a', '#264653', '#f4a261', '#8ab17d', '#b5838d', '#6d597a'];
    GK.grid(g, P, W, '#f0ebe0'); GK.axes(g, P, W, '#5c4d3c');
    if (!a.length) { GK.text(g, 'L1 is empty — press DATA', 8, 16, '#c00'); return; }
    const t = S.ptype, T = S.trace;
    if (t === 'hist') bins(S, a).forEach((b, i) => { g.fillStyle = T && i === T.i ? '#f4a261' : '#e76f51'; const x0 = P.X(b.lo), x1 = P.X(b.hi), y = P.Y(b.n); g.fillRect(x0, y, x1 - x0, P.Y(0) - y); g.strokeStyle = '#5c2a1a'; g.lineWidth = 1; g.strokeRect(x0, y, x1 - x0, P.Y(0) - y); });
    if (t === 'ogive') { const B = bins(S, a); let c = 0; const pts = [[B.length ? B[0].lo : 0, 0]]; B.forEach(b => { c += b.n; pts.push([b.hi, c]); }); GK.path(g, P, pts, '#2a9d8f', 2); pts.forEach(p => GK.dot(g, P, p[0], p[1], '#264653', 3)); }
    if (t === 'box') {
      const f = five(a), y = 1, h = 0.6, X0 = P.X(f.q1), X1 = P.X(f.q3), Yt = P.Y(y + h / 2), Yb = P.Y(y - h / 2);
      g.fillStyle = '#e9c46a'; g.fillRect(X0, Yt, X1 - X0, Yb - Yt); g.strokeStyle = '#264653'; g.lineWidth = 1.6; g.strokeRect(X0, Yt, X1 - X0, Yb - Yt);
      GK.seg(g, P, f.med, y - h / 2, f.med, y + h / 2, '#264653', 2.4); GK.seg(g, P, f.wlo, y, f.q1, y, '#264653', 1.4); GK.seg(g, P, f.q3, y, f.whi, y, '#264653', 1.4);
      GK.seg(g, P, f.wlo, y - 0.15, f.wlo, y + 0.15, '#264653'); GK.seg(g, P, f.whi, y - 0.15, f.whi, y + 0.15, '#264653'); f.out.forEach(v => GK.ring(g, P, v, y, '#e76f51', 4));
      if (T && T.x != null) GK.seg(g, P, T.x, y - 0.6, T.x, y + 0.6, '#e76f51', 1, [3, 2]);
    }
    if (t === 'dot') { const cnt = {}, w = (W.bw / 5) || 1; a.slice().sort((u, v) => u - v).forEach(v => { const k = Math.round(v / w) * w; cnt[k] = (cnt[k] || 0) + 1; GK.dot(g, P, k, cnt[k] * 0.35, '#264653', 3.2); }); }
    if (t === 'scat' || t === 'xyl') {
      const p = DataEd.pairs(S, 'L2', 'L1');
      if (t === 'xyl') { const idx = p.x.map((_, i) => i).sort((i, j) => p.x[i] - p.x[j]); GK.path(g, P, idx.map(i => [p.x[i], p.y[i]]), '#2a9d8f', 1.5); }
      p.x.forEach((x, i) => { g.fillStyle = '#264653'; g.fillRect(P.X(x) - 2.5, P.Y(p.y[i]) - 2.5, 5, 5); });
      if (S.fit && p.x.length > 2) { try { const F = REG[S.fit].fit(p.x, p.y); S.plotY(g, P, F.f, '#e76f51', 1.8); } catch (e) { /* not enough data */ } }
      if (T && p.x[T.i] != null) GK.ring(g, P, p.x[T.i], p.y[T.i], '#e76f51', 6);
    }
    if (t === 'nprob') { const s = a.slice().sort((u, v) => u - v); s.forEach((v, i) => GK.dot(g, P, v, invN((i + 0.625) / (s.length + 0.25)), '#6d597a', 3)); const m = ST.mean(a), sd = Math.sqrt(ST.svar(a)); GK.seg(g, P, m - 3 * sd, -3, m + 3 * sd, 3, '#b5838d', 1, [4, 3]); }
    if (t === 'pie') {
      const B = bins(S, a).filter(b => b.n), cx = P.w / 2, cy = P.h / 2, R = Math.min(P.w, P.h) * 0.42; let ang = -Math.PI / 2; g.fillStyle = S.def.bg; g.fillRect(0, 0, P.w, P.h);
      B.forEach((b, i) => { const da = TAU * b.n / a.length; g.fillStyle = pal[i % pal.length]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, ang, ang + da); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.stroke(); const mid = ang + da / 2; GK.text(g, `${N(b.lo)}–${N(b.hi)}`, cx + Math.cos(mid) * R * 0.62 - 14, cy + Math.sin(mid) * R * 0.62 + 3, '#111', '9px sans-serif'); ang += da; });
    }
    if (t === 'dist') {
      const m = ST.mean(a), s = Math.sqrt(ST.svar(a));
      if (S.shadeAB) { const [lo, hi] = S.shadeAB; g.fillStyle = 'rgba(42,157,143,.35)'; for (let px = Math.max(0, Math.floor(P.X(lo))); px <= Math.min(P.w, P.X(hi)); px++) { const y = npdf(P.x(px), m, s); g.fillRect(px, P.Y(y), 1, P.Y(0) - P.Y(y)); } }
      S.plotY(g, P, x => npdf(x, m, s), '#264653', 2); [-1, 1, -2, 2].forEach(k => GK.seg(g, P, m + k * s, 0, m + k * s, npdf(m + k * s, m, s), '#8ab17d', 1, [2, 2]));
      if (T && T.x != null) GK.ring(g, P, T.x, npdf(T.x, m, s), '#e76f51', 5);
    }
    if (S.slots[0].on && S.slots[0].buf.src() && t !== 'pie') S.plotY(g, P, x => S.fn(0, { x }), '#6d597a', 1.4);
  }
  function spTools(S) {
    const setP = (t) => ({ t: 'Plot: ' + PT[t], run: (S) => { S.ptype = t; S.trace = null; zoomStat(S); S.view = 'graph'; } });
    const a = () => lst(S, 1);
    return [setP('hist'), setP('box'), setP('dot'), setP('scat'), setP('xyl'), setP('ogive'), setP('nprob'), setP('pie'), setP('dist'),
      { t: 'Zoom to data (ZoomStat)', run: (S) => { zoomStat(S); S.view = 'graph'; } },
      { t: 'Fit on scatter: none/lin/quad/exp', run: (S) => { const order = [null, 'lin', 'quad', 'exp']; S.fit = order[(order.indexOf(S.fit) + 1) % order.length]; if (S.fit && !REG[S.fit]) S.fit = 'lin'; S.ptype = 'scat'; zoomStat(S); const p = DataEd.pairs(S, 'L2', 'L1'); if (S.fit) { const F = REG[S.fit].fit(p.x, p.y); S.panel = [F.eq, `R² = ${N(ST.r2(p.x, p.y, F.f))}`]; } else S.panel = null; S.view = 'graph'; } },
      { t: 'Shade normal area a…b', run: (S) => { const m = ST.mean(a()), s = Math.sqrt(ST.svar(a())); S.openForm('SHADE', [['a', 'from', m - s], ['b', 'to', m + s]], (S2, v) => { S2.ptype = 'dist'; zoomStat(S2); S2.shadeAB = [v.a, v.b]; const p = nphi((v.b - m) / s) - nphi((v.a - m) / s); S2.ans = p; S2.panel = [`P(${N(v.a)} ≤ X ≤ ${N(v.b)}) = ${N(p)}`, `normal μ=${N(m)} σ=${N(s)}`]; S2.view = 'graph'; }); } },
      { t: 'Five-number summary', run: (S) => { const f = five(a()); S.ans = f.med; S.info = { title: 'Five-number summary L1', lines: [`min ${N(f.min)}   Q1 ${N(f.q1)}`, `Med ${N(f.med)}   Q3 ${N(f.q3)}`, `max ${N(f.max)}   IQR ${N(f.iqr)}`] }; } },
      { t: 'Outliers (1.5 × IQR fences)', run: (S) => { const f = five(a()); S.ans = f.out.length; S.info = { title: 'Outliers in L1', lines: [`fences ${N(f.lf)} … ${N(f.uf)}`, f.out.length ? 'outliers: ' + f.out.map(N).join(', ') : 'no outliers'] }; } },
      { t: 'Stem-and-leaf display', run: (S) => { const s = a().slice().sort((u, v) => u - v), m = {}; s.forEach(v => { const st = Math.floor(v / 10), lf = Math.round(Math.abs(v) % 10); (m[st] = m[st] || []).push(lf); }); S.info = { title: 'Stem | leaf (L1)', lines: Object.keys(m).map(Number).sort((x, y) => x - y).map(k => `${String(k).padStart(3)} | ${m[k].join(' ')}`).concat(['key: 7 | 4 = 74']) }; } },
      { t: 'Frequency table', run: (S) => { const B = bins(S, a()); let c = 0; S.info = { title: 'Frequency table L1', lines: B.map(b => { c += b.n; return `[${N(b.lo)},${N(b.hi)})  f=${b.n}  cf=${c}  ${N(100 * b.n / a().length)}%`; }) }; } },
      { t: 'Percentile of L1', run: (S) => S.openForm('PERCENTILE', [['p', 'p (0–100)', 90]], (S2, v) => { const x = pctl(lst(S2, 1), v.p); S2.ans = x; S2.msg = `P${N(v.p)} = ${N(x)}`; }) },
      { t: 'Sort L1 ascending', run: (S) => { S.de.data.L1 = lst(S, 1).sort((u, v) => u - v); S.msg = 'L1 sorted'; } },
      { t: 'Load sample lists', run: (S) => { LS.forEach(c => { S.de.data[c] = SAMPLE[c].slice(); }); S.msg = 'Sample data loaded'; } },
      { t: 'Clear all lists', run: (S) => { LS.forEach(c => { S.de.data[c] = []; }); S.msg = 'Lists cleared'; } },
    ];
  }
  D.splot = {
    family: 'graph', app: 'specgraph', angle: 'rad', bg: '#fffdf8', styleName: 'statistics plotting from lists L1–L3 (histogram, box, scatter, ogive, normal curve)',
    slots: [{ name: 'fit', label: 'f(x)=', init: '' }],
    win: { xmin: 45, xmax: 105, ymin: -1, ymax: 8, xscl: 10, yscl: 1, bw: 10, b0: 50 },
    winFields: [['b0', 'Bin start'], ['bw', 'Bin width'], ['xmin', 'Xmin'], ['xmax', 'Xmax'], ['xscl', 'Xscl'], ['ymin', 'Ymin'], ['ymax', 'Ymax'], ['yscl', 'Yscl']],
    editHint: 'optional overlay curve y = f(x) drawn over the plot',
    ginit(S) { DataEd.init(S, LS.slice()); LS.forEach(c => { S.de.data[c] = SAMPLE[c].slice(); }); S.ptype = 'hist'; S.fit = null; S.shadeAB = null; },
    ind: (S) => PT[S.ptype] + (S.fit ? ' +' + S.fit.toUpperCase() : ''),
    render(S) { if (S.de && S.de.on && !S.menu && !S.form && !S.info) { S.scr.innerHTML = S.indHtml() + `<div class="sx-body">${DataEd.html(S, 'LIST')}</div>`; return true; } return false; },
    pre(S, act) { if (S.de && S.de.on && !/^(data|ptype|tools|zoom|graph|shift|on)$/.test(act)) { DataEd.key(S, act); return true; } return false; },
    draw: spDraw,
    startTrace(S) { const t = { i: 0, x: null }; S.trace = t; spPanel(S); return t; },
    traceKey(S, act) { const T = S.trace; if (!T) return undefined; if (act === 'left' || act === 'right') { const d = act === 'left' ? -1 : 1; if (S.ptype === 'dist') { const a = lst(S, 1); T.x = (T.x == null ? ST.mean(a) : T.x) + d * (S.win.xmax - S.win.xmin) / 60; } else T.i += d; spPanel(S); return true; } if (act === 'up' || act === 'down') return true; return undefined; },
    tableCols: (S) => [{ h: '#', f: v => v }].concat(LS.map(c => ({ h: c, f: v => S.de.data[c][v - 1] == null ? '' : S.de.data[c][v - 1] }))),
    tools: spTools,
    acts: {
      data: (S) => { S.de.on = !S.de.on; S.view = 'home'; },
      ptype: (S) => { const k = Object.keys(PT); S.ptype = k[(k.indexOf(S.ptype) + 1) % k.length]; S.trace = null; zoomStat(S); S.view = 'graph'; },
      zoom: (S) => S.openMenu('ZOOM', [{ t: 'ZoomStat (fit data)', run: (S) => { zoomStat(S); S.view = 'graph'; } }].concat(GK.zoomMenu(S))),
    },
    scope: (S) => ({
      avg: (k) => ST.mean(lst(S, k)), sdev: (k) => Math.sqrt(ST.svar(lst(S, k))), psd: (k) => Math.sqrt(ST.pvar(lst(S, k))), cnt: (k) => lst(S, k).length,
      med: (k) => ST.quart(lst(S, k)).med, q1: (k) => ST.quart(lst(S, k)).q1, q3: (k) => ST.quart(lst(S, k)).q3, iqr: (k) => five(lst(S, k)).iqr, outl: (k) => five(lst(S, k)).out.length,
      pctl: (k, p) => pctl(lst(S, k), p), bincount: (i) => { const B = bins(S, lst(S, 1)); return B[Math.round(i) - 1] ? B[Math.round(i) - 1].n : 0; },
      corrl: () => { const p = DataEd.pairs(S, 'L2', 'L1'); return ST.two(p.x, p.y)[11][1]; }, slope: () => { const p = DataEd.pairs(S, 'L2', 'L1'); return ST.lin(p.x, p.y).b; }, icept: () => { const p = DataEd.pairs(S, 'L2', 'L1'); return ST.lin(p.x, p.y).a; },
      npdf: (x, m, s) => npdf(x, m == null ? 0 : m, s == null ? 1 : s), ncdf: (a, b, m, s) => { m = m == null ? 0 : m; s = s == null ? 1 : s; return nphi((b - m) / s) - nphi((a - m) / s); }, invn: (p, m, s) => (m || 0) + (s == null ? 1 : s) * invN(p),
    }),
    features: [
      'Three data lists L1, L2, L3 in a spreadsheet-style editor', 'Sample exam-score and study-hours data preloaded', 'Histogram with adjustable bin start and bin width',
      'Box plot with whiskers to the 1.5·IQR fences and outlier circles', 'Dot plot (stacked dots)', 'Scatter plot of L1 against L2', 'xy-line plot joined in x order',
      'Ogive (cumulative frequency polygon)', 'Normal probability plot with reference line', 'Pie chart of bin frequencies with labels', 'Normal curve fitted to L1 with ±1σ, ±2σ guides',
      'Trace bins with count, cumulative and relative frequency', 'Trace box-plot five numbers', 'Trace scatter points in order', 'Trace the normal curve with z, pdf and P(X≤x)',
      'ZoomStat automatic window for every plot type', 'Fit overlay on scatter: linear, quadratic or exponential with R²', 'Shade a normal area between two values with probability',
      'Five-number summary screen', 'Outlier report with fences', 'Stem-and-leaf display', 'Frequency table with cf and %', 'Percentile with linear interpolation',
      'Sort L1, load sample data, clear lists', 'Optional overlay curve y = f(x) on any plot', 'PLOT key cycles the nine plot types',
      'Home list statistics avg(), sdev(), psd(), cnt(), med(), q1(), q3(), iqr(), outl()', 'Home pctl(k,p) and bincount(i)', 'Home regression slope(), icept(), corrl() for L1 vs L2',
      'Home normal functions npdf(), ncdf(), invn()', 'Table view listing L1–L3 side by side',
    ],
    examples: [
      { kind: 'pavg', title: 'Mean of the sample exam scores L1', human: 'avg(1)', exp: 75.55, keys: ['ins:avg(|avg(', 'd1', 'rp', 'exe'] },
      { kind: 'pmed', title: 'Median of L1', human: 'med(1)', exp: 75, keys: ['ins:med(|med(', 'd1', 'rp', 'exe'] },
      { kind: 'piqr', title: 'Interquartile range of L1 (median-of-halves)', human: 'iqr(1)', exp: 13.5, keys: ['ins:iqr(|IQR(', 'd1', 'rp', 'exe'] },
      { kind: 'pbin', title: 'Histogram bin 3 count (bins of width 10 from 50)', human: 'bincount(3)', exp: 8, keys: ['ins:bincount(|bin#(', 'd3', 'rp', 'exe'] },
      { kind: 'pslope', title: 'Least-squares slope of L1 on L2', human: 'slope()', exp: 4.153447588680749, keys: ['ins:slope(|slope(', 'rp', 'exe'] },
      { kind: 'pncdf', title: 'Standard normal probability within one σ', human: 'ncdf(−1,1)', exp: 0.6826894921, keys: ['ins:ncdf(|ncdf(', 'neg', 'd1', 'comma', 'd1', 'rp', 'exe'] },
      { kind: 'pcorr', title: 'Correlation coefficient r of L1 and L2', human: 'corrl()', exp: 0.9898083759732216, keys: ['ins:corrl(|r(', 'rp', 'exe'] },
    ],
    notes: ['Statistics plotter. L1 is the main variable; scatter plots use L2 on the x-axis and L1 on the y-axis.', 'Quartiles use the median-of-halves rule; percentiles interpolate linearly between order statistics.'],
    model({ K, I, PAD }) {
      return {
        w: 370,
        theme: { body: 'linear-gradient(#fdf0d5,#f6bd60)', cls: 'th-sp', vars: { '--bezel': '#264653', '--key': '#2a9d8f', '--kt': '#fff', '--knum': '#fffdf8', '--knt': '#264653', '--kop': '#e76f51', '--kopt': '#fff', '--kdel': '#9b2226', '--kdelt': '#fff', '--kshift': '#e9c46a', '--kshiftt': '#222', '--kalpha': '#6d597a', '--kalphat': '#fff', '--ls': '#b5651d', '--la': '#6d597a', '--pad': '#264653', '--padt': '#fff', '--lcd': '#fffdf8', '--kr': '10px 10px 3px 3px' } },
        display: { w: 328, h: 208, cls: 'sx-lcdcream' },
        sections: [
          { cols: 5, cls: 'kgfun', kc: 'fn sm', keys: [K('DATA', 'data', { tip: 'Open or close the list editor' }), K('PLOT', 'ptype', { tip: 'Cycle plot type' }), K('ZOOM', 'zoom', { tip: 'ZoomStat and zoom menu' }), K('TRACE', 'trace'), K('GRAPH', 'graph', { s: ['TABLE', 'table'] })] },
          { cols: 6, cls: 'kgnav', kc: 'sm', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('TOOLS', 'tools', { tip: 'Plot types, fits, summaries' }), K('WINDOW', 'window', { tip: 'Bins and view' }), PAD('ring', { r: 2, w: 2, center: ['OK', 'ok'] }), K('ON', 'on', { c: 'del sm' }),
            K('f(x)=', 'yeq', { tip: 'Overlay curve' }), K('HOME', 'home'), K('MODE', 'setup'), K('SEL', 'sel')] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [I('avg', 'avg(', 'avg(', 'Mean of list k', { s: ['σ', 'ins:psd(|σ(', 'Population s.d.'] }), I('s', 'sdev(', 's(', 'Sample s.d. of list k'), I('Med', 'med(', 'med(', 'Median of list k', { s: ['Q1', 'ins:q1(|Q1(', 'First quartile'] }), I('IQR', 'iqr(', 'IQR(', 'Interquartile range', { s: ['Q3', 'ins:q3(|Q3(', 'Third quartile'] }), I('n', 'cnt(', 'n(', 'Count of list k', { s: ['out', 'ins:outl(|out(', 'Number of outliers'] }), I('P%', 'pctl(', 'P%(', 'Percentile'),
            I('bin#', 'bincount(', 'bin#(', 'Count in histogram bin i'), I('b', 'slope(', 'slope(', 'Regression slope', { s: ['a', 'ins:icept(|icept(', 'Regression intercept'] }), I('r', 'corrl(', 'r(', 'Correlation L1–L2'), I('φ', 'npdf(', 'npdf(', 'Normal density'), I('Φ', 'ncdf(', 'ncdf(', 'Normal probability a…b', { s: ['Φ⁻¹', 'ins:invn(|invn(', 'Inverse normal'] }), K('√', 'sqrt', { s: ['<i>x</i>²', 'sq'] }),
            K('(', 'lp'), K(')', 'rp'), K(',', 'comma'), K('^', 'pow'), K('<i>x</i>!', 'fact'), K('π', 'pi')] },
          { cols: 5, cls: 'knum', keys: numpad(K) },
        ],
      };
    },
  };

  // ============================ #39 surf ============================
  const CMAP = (t) => { t = Math.max(0, Math.min(1, t)); const c = (k) => Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - k)))); return `rgb(${c(3)},${c(2)},${c(1)})`; };
  const SU = {
    z: (S, k, x, y) => S.fn(k, { x, y }),
    dx: (S, k, x, y) => { const h = 1e-5 * (1 + Math.abs(x)); return (SU.z(S, k, x + h, y) - SU.z(S, k, x - h, y)) / (2 * h); },
    dy: (S, k, x, y) => { const h = 1e-5 * (1 + Math.abs(y)); return (SU.z(S, k, x, y + h) - SU.z(S, k, x, y - h)) / (2 * h); },
    hess(S, k, x, y) { const h = 1e-3, f = (a, b) => SU.z(S, k, a, b); const fxx = (f(x + h, y) - 2 * f(x, y) + f(x - h, y)) / (h * h), fyy = (f(x, y + h) - 2 * f(x, y) + f(x, y - h)) / (h * h), fxy = (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) / (4 * h * h); return { fxx, fyy, fxy, det: fxx * fyy - fxy * fxy }; },
    dint: (S, k, a, b, c, d, n) => NUM.simpson(x => NUM.simpson(y => SU.z(S, k, x, y), c, d, n || 80), a, b, n || 80),
    crit(S, k, x, y) {
      for (let i = 0; i < 50; i++) { const gx = SU.dx(S, k, x, y), gy = SU.dy(S, k, x, y), H = SU.hess(S, k, x, y); if (!H.det) break; const ddx = (gx * H.fyy - gy * H.fxy) / H.det, ddy = (H.fxx * gy - H.fxy * gx) / H.det; x -= ddx; y -= ddy; if (Math.abs(ddx) + Math.abs(ddy) < 1e-10) break; }
      const H = SU.hess(S, k, x, y); return { x, y, z: SU.z(S, k, x, y), kind: H.det < 0 ? 'saddle point' : H.fxx > 0 ? 'local minimum' : H.fxx < 0 ? 'local maximum' : 'degenerate' };
    },
  };
  function surfZ(S) {
    const W = S.win;
    if (W.zauto) { let lo = Infinity, hi = -Infinity; const n = 16; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const z = SU.z(S, 0, W.xmin + i * (W.xmax - W.xmin) / n, W.ymin + j * (W.ymax - W.ymin) / n); if (isFinite(z)) { lo = Math.min(lo, z); hi = Math.max(hi, z); } } if (isFinite(lo)) return [lo, hi > lo ? hi : lo + 1]; }
    return [W.zmin, W.zmax];
  }
  function proj(S, P) {
    const W = S.win, [z0, z1] = surfZ(S), az = S.az * Math.PI / 180, el = S.el * Math.PI / 180, sc = Math.min(P.w, P.h) * 0.36 * S.zoom3;
    return (x, y, z) => { const u = 2 * (x - W.xmin) / (W.xmax - W.xmin) - 1, v = 2 * (y - W.ymin) / (W.ymax - W.ymin) - 1, w = 2 * (z - z0) / (z1 - z0) - 1; const X = u * Math.cos(az) - v * Math.sin(az), Yd = u * Math.sin(az) + v * Math.cos(az); return [P.w / 2 + sc * X, P.h / 2 - sc * (w * Math.cos(el) + Yd * Math.sin(el)) * 0.9, Yd * Math.cos(el) - w * Math.sin(el), (w + 1) / 2]; };
  }
  function surfPanel(S) { const T = S.trace; if (!T) return; const z = SU.z(S, 0, T.x, T.y); S.panel = [`x=${N(T.x)} y=${N(T.y)} z=${N(z)}`, `∂z/∂x=${N(SU.dx(S, 0, T.x, T.y))} ∂z/∂y=${N(SU.dy(S, 0, T.x, T.y))}`]; }
  function surfDraw(S, g, P) {
    const W = S.win, n = Math.max(6, Math.min(60, Math.round(W.gn)));
    if (S.smode === 'contour') {
      GK.grid(g, P, W, '#16213e'); GK.axes(g, P, W, '#4cc9f0'); const [z0, z1] = surfZ(S);
      for (let l = 1; l < 12; l++) { const lev = z0 + (z1 - z0) * l / 12; GK.drawSegs(g, P, GK.march((x, y) => SU.z(S, 0, x, y) - lev, P, 4), CMAP(l / 12), 1.2); }
      if (S.trace) GK.ring(g, P, S.trace.x, S.trace.y, '#fff', 5);
      if (S.overlay && S.overlay.pts) S.overlay.pts.forEach(p => GK.ring(g, P, p[0], p[1], '#ff006e', 6));
      return;
    }
    if (S.smode === 'section') {
      const [z0, z1] = surfZ(S), W2 = { xmin: W.xmin, xmax: W.xmax, ymin: z0, ymax: z1, xscl: W.xscl, yscl: 0.5 }, P2 = S.P(W2, P.w, P.h);
      GK.axes(g, P2, W2, '#4cc9f0'); S.plotY(g, P2, x => SU.z(S, 0, x, W.ycut), '#f72585', 2); if (S.slots[1].on) S.plotY(g, P2, x => SU.z(S, 1, x, W.ycut), '#4cc9f0', 1.5);
      GK.text(g, `section y = ${N(W.ycut)}`, 6, 12, '#fff'); return;
    }
    const pr = proj(S, P), quads = [];
    [0, 1].forEach(k => {
      if (!S.slots[k].on || !S.slots[k].buf.src()) return; const pts = [];
      for (let i = 0; i <= n; i++) { const row = []; for (let j = 0; j <= n; j++) { const x = W.xmin + i * (W.xmax - W.xmin) / n, y = W.ymin + j * (W.ymax - W.ymin) / n; row.push(pr(x, y, SU.z(S, k, x, y))); } pts.push(row); }
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const q = [pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1]]; if (q.every(p => p.every(isFinite))) quads.push({ q, d: (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4, h: (q[0][3] + q[2][3]) / 2, k }); }
    });
    const c = [[W.xmin, W.ymin], [W.xmax, W.ymin], [W.xmax, W.ymax], [W.xmin, W.ymax]], [z0, z1] = surfZ(S);
    g.strokeStyle = '#2b3a67'; g.lineWidth = 1; g.beginPath();
    c.forEach((p, i) => { const a = pr(p[0], p[1], z0), b = pr(c[(i + 1) % 4][0], c[(i + 1) % 4][1], z0), t = pr(p[0], p[1], z1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(a[0], a[1]); g.lineTo(t[0], t[1]); });
    g.stroke();
    quads.sort((a, b) => b.d - a.d).forEach(Q => { g.beginPath(); g.moveTo(Q.q[0][0], Q.q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(Q.q[i][0], Q.q[i][1]); g.closePath(); if (S.smode === 'solid') { g.fillStyle = Q.k ? 'rgba(76,201,240,.55)' : CMAP(Q.h); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; } else g.strokeStyle = Q.k ? '#4cc9f0' : CMAP(Q.h); g.lineWidth = 0.6; g.stroke(); });
    const ax = pr(W.xmax, W.ymin, z0), ay = pr(W.xmin, W.ymax, z0); GK.text(g, 'x', ax[0] + 3, ax[1], '#ffbe0b'); GK.text(g, 'y', ay[0] + 3, ay[1], '#ffbe0b');
    const mark = (x, y, col, fill) => { const p = pr(x, y, SU.z(S, 0, x, y)); g.beginPath(); g.arc(p[0], p[1], fill ? 4 : 5, 0, TAU); if (fill) { g.fillStyle = col; g.fill(); } else { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); } };
    if (S.trace) mark(S.trace.x, S.trace.y, '#fff');
    if (S.overlay && S.overlay.pts) S.overlay.pts.forEach(q => mark(q[0], q[1], '#ff006e', true));
  }
  function surfTools(S) {
    const pt = (title, done, ex) => S.openForm(title, [['x', 'x', 0], ['y', 'y', 0]].concat(ex || []), (S2, v) => { S2.view = 'graph'; done(S2, v); });
    const mode = (m, t) => ({ t, run: (S) => { S.smode = m; S.view = 'graph'; } });
    return [
      mode('solid', 'View: solid shaded'), mode('wire', 'View: wireframe'), mode('contour', 'View: contour map'),
      { t: 'View: cross-section z(x, y=c)', run: (S) => S.openForm('SECTION', [['c', 'y =', S.win.ycut]], (S2, v) => { S2.win.ycut = v.c; S2.smode = 'section'; S2.view = 'graph'; }) },
      { t: 'Value z(x,y)', run: (S) => pt('VALUE', (S2, v) => { const z = SU.z(S2, 0, v.x, v.y); S2.ans = z; S2.overlay = { pts: [[v.x, v.y]] }; S2.panel = [`z₁(${N(v.x)}, ${N(v.y)}) = ${N(z)}`]; }) },
      { t: 'Partial derivatives & gradient', run: (S) => pt('GRADIENT', (S2, v) => { const a = SU.dx(S2, 0, v.x, v.y), b = SU.dy(S2, 0, v.x, v.y); S2.ans = Math.hypot(a, b); S2.overlay = { pts: [[v.x, v.y]] }; S2.panel = [`∂z/∂x=${N(a)}  ∂z/∂y=${N(b)}`, `|∇z|=${N(S2.ans)}`]; }) },
      { t: 'Tangent plane', run: (S) => pt('TANGENT PLANE', (S2, v) => { const z = SU.z(S2, 0, v.x, v.y), a = SU.dx(S2, 0, v.x, v.y), b = SU.dy(S2, 0, v.x, v.y); S2.ans = z; S2.panel = [`z = ${N(z)} + ${N(a)}(x−${N(v.x)}) + ${N(b)}(y−${N(v.y)})`]; }) },
      { t: 'Directional derivative', run: (S) => pt('DIRECTIONAL', (S2, v) => { const L2 = Math.hypot(v.ux, v.uy) || 1, d = (SU.dx(S2, 0, v.x, v.y) * v.ux + SU.dy(S2, 0, v.x, v.y) * v.uy) / L2; S2.ans = d; S2.panel = [`D_u z = ${N(d)}`]; }, [['ux', 'u x', 1], ['uy', 'u y', 1]]) },
      { t: 'Critical point (Newton) + type', run: (S) => S.openForm('CRITICAL POINT', [['x', 'guess x', 1.4], ['y', 'guess y', 0.2]], (S2, v) => { const c = SU.crit(S2, 0, v.x, v.y); S2.ans = c.z; S2.overlay = { pts: [[c.x, c.y]] }; S2.panel = [`(${N(c.x)}, ${N(c.y)}) z=${N(c.z)}`, c.kind]; S2.view = 'graph'; }) },
      { t: 'Double integral over window', run: (S) => { const W = S.win, v = SU.dint(S, 0, W.xmin, W.xmax, W.ymin, W.ymax); S.ans = v; S.panel = [`∬ z₁ dA = ${N(v)}`, `over [${N(W.xmin)},${N(W.xmax)}]×[${N(W.ymin)},${N(W.ymax)}]`]; S.view = 'graph'; } },
      { t: 'Volume between z₁ and z₂', run: (S) => { const W = S.win, v = NUM.simpson(x => NUM.simpson(y => Math.abs(SU.z(S, 0, x, y) - SU.z(S, 1, x, y)), W.ymin, W.ymax, 60), W.xmin, W.xmax, 60); S.ans = v; S.panel = [`∬ |z₁ − z₂| dA = ${N(v)}`]; S.view = 'graph'; } },
      { t: 'Grid max / min', run: (S) => { const W = S.win, n = 60; let mx = [-Infinity, 0, 0], mn = [Infinity, 0, 0]; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = W.xmin + i * (W.xmax - W.xmin) / n, y = W.ymin + j * (W.ymax - W.ymin) / n, z = SU.z(S, 0, x, y); if (z > mx[0]) mx = [z, x, y]; if (z < mn[0]) mn = [z, x, y]; } S.ans = mx[0]; S.overlay = { pts: [[mx[1], mx[2]], [mn[1], mn[2]]] }; S.panel = [`max ${N(mx[0])} at (${N(mx[1])}, ${N(mx[2])})`, `min ${N(mn[0])} at (${N(mn[1])}, ${N(mn[2])})`]; S.view = 'graph'; } },
      { t: 'Reset view angles', run: (S) => { S.az = 35; S.el = 28; S.zoom3 = 1; S.view = 'graph'; } },
    ];
  }
  const rot = (S) => S.view === 'graph' && !S.trace && S.smode !== 'contour' && S.smode !== 'section';
  const rotAct = (dir, fn) => (S, kd) => rot(S) ? fn(S) : GK.fallThrough(S, dir, kd);
  D.surf = {
    family: 'graph', app: 'specgraph', angle: 'rad', bg: '#070b18', styleName: '3-D surface graphing z = f(x,y) with rotation, contours and cross-sections',
    slots: [{ name: 'z1', label: 'z₁(x,y)=', init: 'sin(x)*cos(y)' }, { name: 'z2', label: 'z₂(x,y)=', init: '0.1*(x^2+y^2)-1', on: false }],
    win: { xmin: -3, xmax: 3, ymin: -3, ymax: 3, zmin: -1.5, zmax: 1.5, xscl: 1, yscl: 1, gn: 24, zauto: 0, ycut: 0 },
    winFields: [['xmin', 'Xmin'], ['xmax', 'Xmax'], ['ymin', 'Ymin'], ['ymax', 'Ymax'], ['zmin', 'Zmin'], ['zmax', 'Zmax'], ['gn', 'Grid n'], ['zauto', 'Auto z (1/0)'], ['ycut', 'Section y=']],
    editHint: 'z in terms of x and y · SEL on/off · arrows rotate the view in GRAPH',
    ginit(S) { S.az = 35; S.el = 28; S.zoom3 = 1; S.smode = 'solid'; },
    ind: (S) => S.smode.toUpperCase() + ` ${Math.round(S.az)}°/${Math.round(S.el)}°`,
    draw: surfDraw,
    startTrace(S) { const t = { x: (S.win.xmin + S.win.xmax) / 2, y: (S.win.ymin + S.win.ymax) / 2 }; S.trace = t; surfPanel(S); return t; },
    traceKey(S, act) {
      const T = S.trace; if (!T) return undefined; const W = S.win, dx = (W.xmax - W.xmin) / Math.max(6, W.gn), dy = (W.ymax - W.ymin) / Math.max(6, W.gn);
      if (act === 'left') T.x -= dx; else if (act === 'right') T.x += dx; else if (act === 'up') T.y += dy; else if (act === 'down') T.y -= dy;
      else if (act === 'exe' || act === 'ok') { S.openForm('TRACE TO', [['x', 'x', T.x], ['y', 'y', T.y]], (S2, v) => { Object.assign(S2.trace, v); S2.view = 'graph'; surfPanel(S2); }); return true; }
      else return undefined;
      T.x = Math.max(W.xmin, Math.min(W.xmax, T.x)); T.y = Math.max(W.ymin, Math.min(W.ymax, T.y)); surfPanel(S); return true;
    },
    tableCols: (S) => [{ h: 'x', f: v => v }, { h: 'z₁(x,0)', f: v => SU.z(S, 0, v, 0) }, { h: 'z₁(x,1)', f: v => SU.z(S, 0, v, 1) }, { h: 'z₁(0,x)', f: v => SU.z(S, 0, 0, v) }],
    tools: surfTools,
    passHome: ['left', 'right', 'up', 'down'],
    acts: {
      left: rotAct('left', (S) => { S.az -= 15; }), right: rotAct('right', (S) => { S.az += 15; }),
      up: rotAct('up', (S) => { S.el = Math.min(89, S.el + 10); }), down: rotAct('down', (S) => { S.el = Math.max(-89, S.el - 10); }),
      smode: (S) => { S.smode = { solid: 'wire', wire: 'contour', contour: 'section', section: 'solid' }[S.smode]; S.view = 'graph'; S.msg = S.smode.toUpperCase(); },
      zoom: (S) => S.openMenu('ZOOM 3-D', [{ t: 'Closer ×1.25', run: (S) => { S.zoom3 *= 1.25; S.view = 'graph'; } }, { t: 'Farther ÷1.25', run: (S) => { S.zoom3 /= 1.25; S.view = 'graph'; } }, { t: 'Auto z-range on/off', run: (S) => { S.win.zauto = S.win.zauto ? 0 : 1; S.view = 'graph'; } }, { t: 'Top view (el 89°)', run: (S) => { S.el = 89; S.view = 'graph'; } }, { t: 'Side view (el 0°)', run: (S) => { S.el = 0; S.view = 'graph'; } }].concat(GK.zoomMenu(S))),
    },
    scope: (S) => ({
      Z1: (x, y) => SU.z(S, 0, x, y), Z2: (x, y) => SU.z(S, 1, x, y), dzdx: (x, y) => SU.dx(S, 0, x, y), dzdy: (x, y) => SU.dy(S, 0, x, y),
      gnorm: (x, y) => Math.hypot(SU.dx(S, 0, x, y), SU.dy(S, 0, x, y)), dirder: (x, y, a, b) => (SU.dx(S, 0, x, y) * a + SU.dy(S, 0, x, y) * b) / Math.hypot(a, b),
      hessd: (x, y) => SU.hess(S, 0, x, y).det, dint: (a, b, c, d) => SU.dint(S, 0, a, b, c, d), crx: (x, y) => SU.crit(S, 0, x, y).x, cry: (x, y) => SU.crit(S, 0, x, y).y,
    }),
    features: [
      'Two surfaces z₁(x,y), z₂(x,y) in the same 3-D box', 'Solid shaded surface with painter’s-algorithm hidden-surface ordering', 'Height colour map (blue → red)',
      'Wireframe mode coloured by height', 'Contour-map mode with 11 level curves', 'Cross-section mode z(x, y = c) for both surfaces', 'Rotate azimuth with ◀▶ in 15° steps',
      'Tilt elevation with ▲▼ in 10° steps', 'Zoom closer/farther', 'Top view and side view presets', 'Automatic z-range option', 'Adjustable grid resolution 6–60',
      'Bounding box with axis labels', '3-D trace cursor moving over the x-y grid', 'Trace read-out of z and both partial derivatives',
      'Tool: value z(x,y)', 'Tool: partial derivatives and gradient magnitude', 'Tool: tangent-plane equation', 'Tool: directional derivative along (ux,uy)',
      'Tool: critical point by Newton’s method with second-derivative test', 'Tool: double integral over the window (nested Simpson)', 'Tool: volume between two surfaces',
      'Tool: grid maximum and minimum with markers', 'VIEW key cycles SOLID → WIRE → CONTOUR → SECTION', 'Table of sections z(x,0), z(x,1), z(0,x)',
      'Home Z1(), Z2(), dzdx(), dzdy(), gnorm()', 'Home directional derivative dirder(x,y,a,b)', 'Home Hessian determinant hessd(x,y)', 'Home double integral dint(a,b,c,d)',
      'Home critical-point coordinates crx(), cry()', 'Night-sky display distinct from the 2-D graphers',
    ],
    examples: [
      { kind: 'sz', title: 'Height of z = sin x cos y at (π/2, 0)', human: 'Z1(π/2,0)', exp: 1, keys: ['ins:Z1(|Z₁(', 'pi', 'div', 'd2', 'comma', 'd0', 'rp', 'exe'] },
      { kind: 'sdx', title: 'Partial derivative ∂z/∂x at the origin', human: 'dzdx(0,0)', exp: 1, keys: ['ins:dzdx(|∂z/∂x(', 'd0', 'comma', 'd0', 'rp', 'exe'] },
      { kind: 'sdint', title: 'Double integral of sin x cos y over [0,π]×[0,π/2]', human: 'dint(0,π,0,π/2)', exp: 2, keys: ['ins:dint(|∬(', 'd0', 'comma', 'pi', 'comma', 'd0', 'comma', 'pi', 'div', 'd2', 'rp', 'exe'] },
      { kind: 'shess', title: 'Hessian determinant at the peak (π/2, 0)', human: 'hessd(π/2,0)', exp: 1, keys: ['ins:hessd(|det H(', 'pi', 'div', 'd2', 'comma', 'd0', 'rp', 'exe'] },
      { kind: 'sdir', title: 'Directional derivative at the origin toward (1,1)', human: 'dirder(0,0,1,1)', exp: Math.SQRT1_2, keys: ['ins:dirder(|D_u(', 'd0', 'comma', 'd0', 'comma', 'd1', 'comma', 'd1', 'rp', 'exe'] },
      { kind: 'scrit', title: 'Critical point near (1.4, 0.2): x-coordinate (= π/2)', human: 'crx(1.4,0.2)', exp: Math.PI / 2, keys: ['ins:crx(|crit x(', 'd1', 'dot', 'd4', 'comma', 'd0', 'dot', 'd2', 'rp', 'exe'] },
    ],
    notes: ['3-D surface grapher. Arrow keys rotate the view; TRACE moves a cursor over the x-y grid.', 'Double integrals use nested Simpson rules (80 × 80 panels); critical points use Newton’s method on the gradient with a numerical Hessian.'],
    model({ K, I, PAD }) {
      return {
        w: 380,
        theme: { body: 'radial-gradient(circle at 30% 0%,#3a0ca3,#10002b 70%)', cls: 'th-sp', vars: { '--bezel': '#10002b', '--key': '#240046', '--kt': '#e0aaff', '--knum': '#3c096c', '--knt': '#fff', '--kop': '#f72585', '--kopt': '#fff', '--kdel': '#ff9e00', '--kdelt': '#10002b', '--kshift': '#4cc9f0', '--kshiftt': '#10002b', '--kalpha': '#b5179e', '--kalphat': '#fff', '--ls': '#4cc9f0', '--la': '#f72585', '--pad': '#4cc9f0', '--padt': '#10002b', '--lcd': '#070b18', '--kr': '50%' } },
        display: { w: 336, h: 220, cls: 'sx-lcdnight' },
        sections: [
          { cols: 5, cls: 'kgfun', kc: 'fn sm', keys: [K('z=', 'yeq', { tip: 'Edit surfaces' }), K('WINDOW', 'window', { tip: 'x, y, z ranges and grid' }), K('ZOOM', 'zoom'), K('TRACE', 'trace'), K('GRAPH', 'graph', { s: ['TABLE', 'table'] })] },
          { cols: 6, cls: 'kgnav', kc: 'sm', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('VIEW', 'smode', { tip: 'Solid / wire / contour / section' }), PAD('replay', { r: 2, w: 2 }), K('TOOLS', 'tools'), K('ON', 'on', { c: 'del sm' }),
            I('x', 'x', 'x', 'Variable x', { c: 'fn sm' }), I('y', 'y', 'y', 'Variable y', { c: 'fn sm' }), K('HOME', 'home'), K('SEL', 'sel')] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [K('sin', 'sin'), K('cos', 'cos'), K('tan', 'tan'), K('e<sup>x</sup>', 'epow', { s: ['ln', 'ln'] }), K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }), K('^', 'pow'),
            I('Z₁(', 'Z1(', 'Z₁(', 'Height of surface 1', { s: ['Z₂(', 'ins:Z2(|Z₂(', 'Height of surface 2'] }), I('∂x', 'dzdx(', '∂z/∂x(', 'Partial derivative in x'), I('∂y', 'dzdy(', '∂z/∂y(', 'Partial derivative in y'), I('∇', 'gnorm(', '|∇z|(', 'Gradient magnitude', { s: ['Dᵤ', 'ins:dirder(|D_u(', 'Directional derivative'] }), I('∬', 'dint(', '∬(', 'Double integral of z₁'), I('H', 'hessd(', 'det H(', 'Hessian determinant', { s: ['cx', 'ins:crx(|crit x(', 'Critical point x'] }),
            I('cy', 'cry(', 'crit y(', 'Critical point y'), K('(', 'lp'), K(')', 'rp'), K(',', 'comma'), K('π', 'pi'), K('MODE', 'setup')] },
          { cols: 5, cls: 'knum', keys: numpad(K) },
        ],
      };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
