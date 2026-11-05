/* U-45 CALCULATORS — main category menu: 5 numbered categories, 43 numbered items.
 * Every item opens a real calculator (by catalogue id) and runs a preset so the
 * screen shows a worked example for that purpose. Presets use the calculators'
 * own handlers (press / editor tokens / TVM solver), never placeholders. */
(function (G) {
  'use strict';
  // ---- preset helpers -------------------------------------------------------
  const FN = { sin: 'sin', cos: 'cos', tan: 'tan', sqrt: '√', exp: '<i>e</i>^', abs: 'Abs', log: 'log', ln: 'ln' };
  /** Expression string -> editor tokens identical to what the keys insert. */
  function toks(str) {
    const out = []; let i = 0; const T = (d, s) => out.push({ d, s: s == null ? d : s });
    while (i < str.length) {
      const m = /^(sin|cos|tan|sqrt|exp|abs|log|ln)\(/.exec(str.slice(i));
      if (m) { T(FN[m[1]] + '(', m[1] + '('); i += m[0].length; continue; }
      const c = str[i++];
      if (/[0-9.()+%⌟π]/.test(c)) T(c);
      else if (c === '-') T('−', '-'); else if (c === '*') T('×', '*'); else if (c === '/') T('÷', '/');
      else if (c === '~') T('−', '~'); else if (c === '^') T('^');
      else if (c === '²') T('<sup>2</sup>', '²'); else if (c === '³') T('<sup>3</sup>', '³');
      else if (c === 'X') T('<i>x</i>', 'X'); else if (c === 'e') T('<i>e</i>', 'ℯ');
      else if (c !== ' ') T(c);
    }
    return out;
  }
  /** Scientific (SciApp): type expression into the editor and execute it. */
  function sciRun(app, expr, angle) {
    if (angle) app.angle = angle;
    app.toHome && app.toHome(); app.stack = [app.stack[0]];
    app.ed.clear(); app.res = null; app.err = null;
    toks(expr).forEach(t => app.ed.put(t));
    app.press({ act: 'exe' });
  }
  /** Press a list of acts; numbers in the list are typed digit by digit. */
  function keys(app, list) {
    list.forEach(k => {
      if (typeof k === 'number' || /^-?[0-9.]+$/.test(k)) {
        const s = String(k); const neg = s.startsWith('-');
        for (const ch of s.replace('-', '')) app.press({ act: ch === '.' ? 'dot' : 'd' + ch });
        if (neg) app.press({ act: app.handleChs ? 'chs' : (app.s ? 'chs' : 'neg') });
      } else app.press({ act: k });
    });
  }
  /** Graphing: load Y= functions, window, radian mode, then show the graph. */
  function graphRun(app, fns, win, view) {
    app.angle = 'rad';
    app.yf.forEach(f => { f.ed.clear(); f.on = true; });
    fns.forEach((src, i) => toks(src).forEach(t => app.yf[i].ed.put(t)));
    if (win) Object.assign(app.win, win);
    app.dirty(); app.stack = [app.home];
    app.navKey(view || 'graph'); app.render();
  }
  /** Financial (FinAOS): load TVM registers, then CPT the unknown. */
  function tvm(app, regs, solve) {
    Object.assign(app.tvm, { N: 0, IY: 0, PV: 0, PMT: 0, FV: 0, PY: 1, CY: 1, BGN: false }, regs);
    app.ws = null; app.label = null; app.entry = null;
    app.press({ act: 'cpt' }); app.press({ act: solve });
  }
  const x = (a) => a.x, sx = (a) => a.s.x, res = (a) => (a.res ? +a.res.value : NaN);
  const fx = (i, xv) => (a) => a.evalF(i, xv);

  // ---- the menu -------------------------------------------------------------
  // item: t = title, id = calculator catalogue id, ex = worked example shown/tested,
  //       run(app) = preset, get(app) = value read back, v = expected value.
  const MENU = [
    { n: 1, key: 'sci', t: 'Scientific', color: '#7CFFFB', items: [
      { t: 'Non-programmable scientific', id: 34, ex: '(3+4)²÷7 = 7', run: a => sciRun(a, '(3+4)²/7'), get: res, v: 7 },
      { t: 'Programmable scientific', id: 22, ex: 'RPN program-style keystrokes: 12 ENTER 5 × 3 + = 63', run: a => keys(a, [12, 'enter', 5, 'mul', 3, 'add']), get: sx, v: 63 },
      { t: 'Textbook display scientific', id: 13, ex: '1⌟3 + 1⌟6 = 1⌟2 (textbook fraction)', run: a => sciRun(a, '1⌟3+1⌟6'), get: res, v: 0.5 },
      { t: 'Exam scientific', id: 44, ex: '√(144) + 2³ = 20', run: a => sciRun(a, 'sqrt(144)+2³'), get: res, v: 20 },
      { t: 'Solar scientific', id: 6, ex: 'sin(30°) + cos(60°) = 1', run: a => sciRun(a, 'sin(30)+cos(60)', 'deg'), get: res, v: 1 },
      { t: 'School scientific', id: 29, ex: '25% of 360 → 360×25% = 90', run: a => sciRun(a, '360*25%'), get: res, v: 90 },
      { t: 'Statistics scientific', id: 31, ex: '1-VAR data 2,4,4,4,5,5,7,9 → x̄ = 5, σx = 2 (check: 10·x̄+σx = 52)', run: a => { a.mode = 'STAT'; a.statType = '1var'; a.stat = [2, 4, 4, 4, 5, 5, 7, 9].map(v => [v]); a.stack = [a.stack[0]]; a.statResults(); a.render(); }, get: a => { const s = G.CalcEngine.stats(a.stat.map(r => r[0])); return s.mean * 10 + s.σx; }, v: 52 }
    ] },
    { n: 2, key: 'pocket', t: 'Pocket', color: '#FFD600', items: [
      { t: 'Pocket solar scientific', id: 12, ex: '2 × 3.5 + 4 = 11', run: a => keys(a, [2, 'mul', 3.5, 'add', 4, 'eq']), get: x, v: 11 },
      { t: 'Pocket arithmetic', id: 3, ex: '125 + 75 × 2 = 275', run: a => sciRun(a, '125+75*2'), get: res, v: 275 },
      { t: 'Pocket trigonometry', id: 41, ex: 'tan(45°) + sin(90°) = 2', run: a => sciRun(a, 'tan(45)+sin(90)', 'deg'), get: res, v: 2 },
      { t: 'Pocket powers and roots', id: 3, ex: '2^10 + √(144) = 1036', run: a => sciRun(a, '2^10+sqrt(144)'), get: res, v: 1036 },
      { t: 'Pocket percent', id: 23, ex: '200 × 15 % = 30', run: a => keys(a, [200, 'mul', 15, 'pct', 'eq']), get: x, v: 30 },
      { t: 'Pocket fractions', id: 41, ex: '1⌟2 + 1⌟3 = 5⌟6', run: a => sciRun(a, '1⌟2+1⌟3'), get: res, v: 5 / 6 }
    ] },
    { n: 3, key: 'graph', t: 'Graphing', color: '#76FF03', items: [
      { t: 'Straight lines', id: 20, ex: 'y = 2x + 1 (at x=3, y=7)', run: a => graphRun(a, ['2X+1']), get: fx(0, 3), v: 7 },
      { t: 'Parabolas', id: 20, ex: 'y = x² − 4 (roots ±2)', run: a => graphRun(a, ['X²-4']), get: fx(0, 2), v: 0 },
      { t: 'Cubics', id: 20, ex: 'y = x³ − 2x (at x=2, y=4)', run: a => graphRun(a, ['X³-2X']), get: fx(0, 2), v: 4 },
      { t: 'Sine curves', id: 5, ex: 'y = sin x, radians (sin(π/2)=1)', run: a => graphRun(a, ['sin(X)'], { xmin: -7, xmax: 7, ymin: -2, ymax: 2, xscl: 1, yscl: 1 }), get: fx(0, Math.PI / 2), v: 1 },
      { t: 'Cosine curves', id: 24, ex: 'y = cos x, radians (cos 0 = 1)', run: a => graphRun(a, ['cos(X)'], { xmin: -7, xmax: 7, ymin: -2, ymax: 2, xscl: 1, yscl: 1 }), get: fx(0, 0), v: 1 },
      { t: 'Exponential growth', id: 16, ex: 'y = eˣ (at x=1, y=e)', run: a => graphRun(a, ['exp(X)'], { xmin: -4, xmax: 4, ymin: -1, ymax: 10, xscl: 1, yscl: 1 }), get: fx(0, 1), v: Math.E },
      { t: 'Exponential decay', id: 16, ex: 'y = e⁻ˣ (at x=1, y=1/e)', run: a => graphRun(a, ['exp(~X)'], { xmin: -2, xmax: 6, ymin: -1, ymax: 5, xscl: 1, yscl: 1 }), get: fx(0, 1), v: 1 / Math.E },
      { t: 'Reciprocal curves', id: 17, ex: 'y = 1/x (at x=4, y=0.25)', run: a => graphRun(a, ['1/X'], { xmin: -5, xmax: 5, ymin: -5, ymax: 5, xscl: 1, yscl: 1 }), get: fx(0, 4), v: 0.25 },
      { t: 'Square-root curves', id: 17, ex: 'y = √x (at x=9, y=3)', run: a => graphRun(a, ['sqrt(X)'], { xmin: -1, xmax: 16, ymin: -1, ymax: 5, xscl: 1, yscl: 1 }), get: fx(0, 9), v: 3 },
      { t: 'Absolute-value curves', id: 2, ex: 'y = |x| (at x=−3, y=3)', run: a => graphRun(a, ['abs(X)']), get: fx(0, -3), v: 3 },
      { t: 'Two-curve compare', id: 27, ex: 'y₁ = x², y₂ = 2x + 3 (meet at x = −1 and 3)', run: a => graphRun(a, ['X²', '2X+3'], { xmin: -5, xmax: 5, ymin: -2, ymax: 12, xscl: 1, yscl: 1 }), get: a => a.evalF(0, 3) - a.evalF(1, 3), v: 0 },
      { t: 'Window and scale', id: 7, ex: 'WINDOW Xmin −5, Xmax 5, Xscl 1, Ymin −5, Ymax 10, Yscl 2 for y = x² − 2', run: a => graphRun(a, ['X²-2'], { xmin: -5, xmax: 5, xscl: 1, ymin: -5, ymax: 10, yscl: 2 }, 'window'), get: a => a.win.xmax - a.win.xmin + a.win.yscl, v: 12 }
    ] },
    { n: 4, key: 'fin', t: 'Financial', color: '#FF80AB', items: [
      { t: 'Personal loans', id: 9, ex: '5,000 over 36 months at 12%/yr → PMT = −166.07', run: a => tvm(a, { N: 36, IY: 1, PV: 5000 }, 'PMT'), get: x, v: -166.0715, tol: 0.01 },
      { t: 'Mortgages', id: 9, ex: '200,000 over 360 months at 6%/yr → PMT = −1,199.10', run: a => tvm(a, { N: 360, IY: 0.5, PV: 200000 }, 'PMT'), get: x, v: -1199.1010, tol: 0.01 },
      { t: 'Auto finance', id: 15, ex: '25,000 over 60 months at 0.5%/month → PMT = −483.32 (RPN: n i PV, then PMT)', run: a => keys(a, [60, 'n', 0.5, 'i', 25000, 'pv', 0, 'fv', 'pmt', 'pmt']), get: sx, v: -483.3201, tol: 0.01 },
      { t: 'Future value of an annuity', id: 9, ex: '100/yr for 10 yrs at 5% → FV = 1,257.79', run: a => tvm(a, { N: 10, IY: 5, PMT: -100 }, 'FV'), get: x, v: 1257.7893, tol: 0.01 },
      { t: 'Present value of an annuity', id: 9, ex: '100/yr for 10 yrs at 5% → PV = 772.17', run: a => tvm(a, { N: 10, IY: 5, PMT: -100 }, 'PV'), get: x, v: 772.1735, tol: 0.01 },
      { t: 'Future value of a lump', id: 9, ex: '1,000 for 10 yrs at 5% → FV = 1,628.89', run: a => tvm(a, { N: 10, IY: 5, PV: -1000 }, 'FV'), get: x, v: 1628.8946, tol: 0.01 },
      { t: 'Present value of a lump', id: 9, ex: '1,000 due in 10 yrs at 5% → PV = −613.91', run: a => tvm(a, { N: 10, IY: 5, FV: 1000 }, 'PV'), get: x, v: -613.9133, tol: 0.01 },
      { t: 'Solve the number of periods', id: 9, ex: 'Double 1,000 at 5% → N = 14.21 years', run: a => tvm(a, { IY: 5, PV: -1000, FV: 2000 }, 'N'), get: x, v: 14.2067, tol: 0.01 },
      { t: 'Solve the payment', id: 45, ex: 'Repay 1,000 in 10 periods at 5% → PMT = −129.50 (RPN)', run: a => keys(a, [10, 'n', 5, 'i', 1000, 'pv', 0, 'fv', 'pmt', 'pmt']), get: sx, v: -129.5046, tol: 0.01 },
      { t: 'Savings plan', id: 9, ex: 'Save 200/month for 10 yrs at 4%/yr → FV = 29,449.96', run: a => tvm(a, { N: 120, IY: 4 / 12, PMT: -200 }, 'FV'), get: x, v: 29449.96, tol: 0.05 },
      { t: 'Named rate cases', id: 9, ex: 'ICONV: NOM 12%, C/Y 12 → EFF = 12.68%', run: a => { a.wsData.ICONV = { NOM: 12, EFF: 0, CY: 12 }; a.press({ act: 'ws:ICONV' }); a.press({ act: 'down' }); a.press({ act: 'cpt' }); }, get: x, v: 12.6825, tol: 0.001 },
      { t: 'End-mode baseline', id: 9, ex: 'END mode: 1,000/yr for 5 yrs at 8% → FV = 5,866.60 (BGN would be 6,335.93)', run: a => tvm(a, { N: 5, IY: 8, PMT: -1000, BGN: false }, 'FV'), get: x, v: 5866.601, tol: 0.01 }
    ] },
    { n: 5, key: 'rpn', t: 'Reverse Polish Notation', color: '#FFAB40', items: [
      { t: 'Stack arithmetic', id: 10, ex: '3 ENTER 4 + 5 × = 35', run: a => keys(a, [3, 'enter', 4, 'add', 5, 'mul']), get: sx, v: 35 },
      { t: 'Stack powers and roots', id: 10, ex: '2 ENTER 10 yˣ = 1024, then √x = 32', run: a => keys(a, [2, 'enter', 10, 'ypow', 'sqrt']), get: sx, v: 32 },
      { t: 'Stack trigonometry', id: 10, ex: 'DEG: 30 SIN = 0.5', run: a => { a.angle = 'deg'; keys(a, [30, 'sin']); }, get: sx, v: 0.5 },
      { t: 'Stack logarithms', id: 22, ex: '1000 LOG = 3', run: a => keys(a, [1000, 'log']), get: sx, v: 3 },
      { t: 'Specialist stack', id: 22, ex: '6 ENTER 4 ENTER 3 × + = 18 with a 4-level stack (T Z Y X)', run: a => keys(a, [6, 'enter', 4, 'enter', 3, 'mul', 'add']), get: sx, v: 18 },
      { t: 'Stack money', id: 45, ex: '250 ENTER 8 % = 20.00 (percent of a price)', run: a => keys(a, [250, 'enter', 8, 'pct']), get: sx, v: 20 }
    ] }
  ];
  MENU.forEach(c => c.items.forEach((it, i) => { it.n = i + 1; it.cat = c.n; it.code = c.n + '.' + (i + 1); }));
  function find(code) { const [c, i] = String(code).split('.').map(Number); const cat = MENU[c - 1]; return cat && cat.items[i - 1] ? { cat, item: cat.items[i - 1] } : null; }
  /** Apply an item preset to a freshly constructed calculator app. */
  function apply(app, item) { item.run(app); if (app.render) app.render(); return item.get(app); }
  G.CALC_MENU = MENU;
  G.U45Menu = { MENU, find, apply, toks, total: MENU.reduce((n, c) => n + c.items.length, 0) };
})(window);
