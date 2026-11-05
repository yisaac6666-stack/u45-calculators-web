/* U-45 CALCULATORS v1.3 — shared helpers for the special calculators: data-list editor,
 * descriptive statistics and regression models (original code). */
(function (G) {
  'use strict';
  const C = G.SpecCore, MX = C.MX, esc = C.esc, DEG = C.DEG, fmtReal = C.fmtReal;
  const ang = (S, x) => S.angle === 'deg' ? x * DEG : S.angle === 'gra' ? x * Math.PI / 200 : x;
  const unang = (S, x) => S.angle === 'deg' ? x / DEG : S.angle === 'gra' ? x * 200 / Math.PI : x;
  const num = (v) => typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : v && v.isComplex ? v.re : v && v.isFraction ? Number(v.valueOf()) : Number(v);
  const maxLen = (E) => Math.max(...E.cols.map(c => E.data[c].length));
  const DataEd = {
    init(S, cols) { S.de = { cols, data: Object.fromEntries(cols.map(c => [c, []])), r: 0, c: 0, buf: '', on: false }; },
    list(S, col) { return S.de.data[col].filter(v => typeof v === 'number' && isFinite(v)); },
    pairs(S, a, b) { const A = S.de.data[a], B = S.de.data[b], x = [], y = []; for (let i = 0; i < Math.max(A.length, B.length); i++) if (typeof A[i] === 'number' && typeof B[i] === 'number') { x.push(A[i]); y.push(B[i]); } return { x, y }; },
    key(S, act) {
      const E = S.de, arr = E.data[E.cols[E.c]];
      const dg = /^d(\d)$/.exec(act); if (dg) { E.buf += dg[1]; return; }
      const map = { dot: '.', neg: '-', sub: '-', exp10: 'e', eex: 'e', chs: '-' }; if (map[act]) { E.buf += map[act]; return; }
      if (/^(exe|ok|enter|eq)$/.test(act)) { if (E.buf) { const v = Number(E.buf); if (!isFinite(v)) { S.msg = 'Not a number'; return; } arr[E.r] = v; E.buf = ''; } E.r = Math.min(E.r + 1, maxLen(E)); return; }
      if (act === 'up') { E.buf = ''; E.r = Math.max(0, E.r - 1); return; }
      if (act === 'down') { E.buf = ''; E.r = Math.min(E.r + 1, maxLen(E)); return; }
      if (act === 'left' || act === 'right') { E.buf = ''; E.c = (E.c + (act === 'left' ? -1 : 1) + E.cols.length) % E.cols.length; return; }
      if (act === 'del' || act === 'bksp') { if (E.buf) E.buf = E.buf.slice(0, -1); else if (E.r < arr.length) arr.splice(E.r, 1); return; }
      if (act === 'ac' || act === 'clx') { if (E.buf) E.buf = ''; else E.on = false; return; }
      S.msg = 'Data editor: digits, EXE, arrows, DEL, AC';
    },
    html(S, title) {
      const E = S.de, n = maxLen(E) + 1, top = Math.max(0, Math.min(E.r - 2, n - 5));
      let h = `<table class="sx-tbl sx-de"><tr><th>${esc(title || '#')}</th>${E.cols.map((c, j) => `<th class="${j === E.c ? 'sel' : ''}">${esc(c)}</th>`).join('')}</tr>`;
      for (let r = top; r < Math.min(n, top + 5); r++) h += `<tr><td>${r + 1}</td>${E.cols.map((c, j) => { const cur = r === E.r && j === E.c, v = E.data[c][r]; return `<td class="${cur ? 'sel' : ''}">${cur && E.buf ? esc(E.buf) + '<span class="cur"></span>' : v == null ? (cur ? '<span class="cur"></span>' : '') : esc(C.fmtShort(v))}</td>`; }).join('')}</tr>`;
      return h + '</table><div class="sx-hint">type · EXE store · ◀▶▲▼ move · DEL delete · AC exit</div>';
    },
  };
  const ST = {
    sum: (a) => a.reduce((s, v) => s + v, 0), mean: (a) => ST.sum(a) / a.length,
    svar: (a) => { const m = ST.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); },
    pvar: (a) => { const m = ST.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length; },
    quart(a) {
      const s = a.slice().sort((x, y) => x - y), n = s.length, med = (b) => b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
      if (!n) throw new Error('No data');
      return { min: s[0], q1: n > 1 ? med(s.slice(0, Math.floor(n / 2))) : s[0], med: med(s), q3: n > 1 ? med(s.slice(Math.ceil(n / 2))) : s[0], max: s[n - 1], sorted: s };
    },
    mode(a) { const c = {}; a.forEach(v => { c[v] = (c[v] || 0) + 1; }); const mx = Math.max(...Object.values(c)); return Object.keys(c).filter(k => c[k] === mx).map(Number); },
    one(a) {
      if (!a.length) throw new Error('No data');
      const q = ST.quart(a), n = a.length;
      return [['n', n], ['x̄', ST.mean(a)], ['Σx', ST.sum(a)], ['Σx²', ST.sum(a.map(v => v * v))], ['sx', n > 1 ? Math.sqrt(ST.svar(a)) : NaN], ['σx', Math.sqrt(ST.pvar(a))], ['minX', q.min], ['Q1', q.q1], ['Med', q.med], ['Q3', q.q3], ['maxX', q.max], ['Range', q.max - q.min], ['IQR', q.q3 - q.q1], ['Mode', ST.mode(a).slice(0, 3).join(' ')]];
    },
    two(x, y) {
      if (x.length < 2) throw new Error('Need 2+ pairs');
      const n = x.length, mx = ST.mean(x), my = ST.mean(y), sxy = ST.sum(x.map((v, i) => (v - mx) * (y[i] - my))), sx = Math.sqrt(ST.svar(x)), sy = Math.sqrt(ST.svar(y));
      return [['n', n], ['x̄', mx], ['ȳ', my], ['Σx', ST.sum(x)], ['Σy', ST.sum(y)], ['Σxy', ST.sum(x.map((v, i) => v * y[i]))], ['Σx²', ST.sum(x.map(v => v * v))], ['Σy²', ST.sum(y.map(v => v * v))], ['sx', sx], ['sy', sy], ['cov', sxy / (n - 1)], ['r', sxy / (n - 1) / (sx * sy)]];
    },
    r2(x, y, f) { const my = ST.mean(y); return 1 - ST.sum(y.map((v, i) => (v - f(x[i])) ** 2)) / ST.sum(y.map(v => (v - my) ** 2)); },
    lin(x, y) { if (x.length < 2) throw new Error('Need 2+ pairs'); const mx = ST.mean(x), my = ST.mean(y); const b = ST.sum(x.map((v, i) => (v - mx) * (y[i] - my))) / ST.sum(x.map(v => (v - mx) ** 2)); return { a: my - b * mx, b }; },
  };
  const REG = {
    lin: { name: 'Linear y=a+bx', fit(x, y) { const { a, b } = ST.lin(x, y); return { f: (t) => a + b * t, inv: (v) => (v - a) / b, coef: [['a', a], ['b', b]], eq: `y=${fmtReal(a)}+${fmtReal(b)}x` }; } },
    quad: { name: 'Quadratic y=a+bx+cx²', fit(x, y) { if (x.length < 3) throw new Error('Need 3+ pairs'); const S = (p) => ST.sum(x.map(v => v ** p)), T = (p) => ST.sum(x.map((v, i) => v ** p * y[i])); const s = MX.lusolve([[x.length, S(1), S(2)], [S(1), S(2), S(3)], [S(2), S(3), S(4)]], [T(0), T(1), T(2)]).map(r => r[0]); const [a, b, c] = s; return { f: (t) => a + b * t + c * t * t, inv: (v) => { const d = b * b - 4 * c * (a - v); return d < 0 ? NaN : (-b + Math.sqrt(d)) / (2 * c); }, coef: [['a', a], ['b', b], ['c', c]], eq: `y=${fmtReal(a)}+${fmtReal(b)}x+${fmtReal(c)}x²` }; } },
    exp: { name: 'Exponential y=a·e^(bx)', fit(x, y) { if (y.some(v => v <= 0)) throw new Error('y must be > 0'); const { a, b } = ST.lin(x, y.map(Math.log)); const A = Math.exp(a); return { f: (t) => A * Math.exp(b * t), inv: (v) => Math.log(v / A) / b, coef: [['a', A], ['b', b]], eq: `y=${fmtReal(A)}e^(${fmtReal(b)}x)` }; } },
    pwr: { name: 'Power y=a·x^b', fit(x, y) { if (y.some(v => v <= 0) || x.some(v => v <= 0)) throw new Error('x,y must be > 0'); const { a, b } = ST.lin(x.map(Math.log), y.map(Math.log)); const A = Math.exp(a); return { f: (t) => A * Math.pow(t, b), inv: (v) => Math.pow(v / A, 1 / b), coef: [['a', A], ['b', b]], eq: `y=${fmtReal(A)}x^${fmtReal(b)}` }; } },
    ln: { name: 'Logarithmic y=a+b·ln x', fit(x, y) { if (x.some(v => v <= 0)) throw new Error('x must be > 0'); const { a, b } = ST.lin(x.map(Math.log), y); return { f: (t) => a + b * Math.log(t), inv: (v) => Math.exp((v - a) / b), coef: [['a', a], ['b', b]], eq: `y=${fmtReal(a)}+${fmtReal(b)}ln x` }; } },
  };
  function regFit(kind, x, y) { const R = REG[kind].fit(x, y); R.kind = kind; R.name = REG[kind].name; R.r2 = ST.r2(x, y, R.f); if (kind === 'lin') R.r = (R.coef[1][1] >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, R.r2)); return R; }
  function catalog(S, title, items) { S.openMenu(title || 'CATALOG', items.map(([t, src, disp]) => ({ t, run: (A) => A.typeTok(src, disp || src) }))); }
  G.SpecLib = { DataEd, ST, REG, regFit, ang, unang, num, catalog };
})(typeof window !== 'undefined' ? window : globalThis);
