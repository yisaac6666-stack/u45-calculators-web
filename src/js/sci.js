/* Scientific (expression-entry) calculator app: shared by all natural/linear display scientific models
   and used as the "home" calculator inside graphing models. */
(function (G) {
  'use strict';
  const E = G.CalcEngine, U = G.CalcUI; const M = E.math;
  const HEXCH = { A: '\uE00A', B: '\uE00B', C: '\uE00C', D: '\uE00D', E: '\uE00E', F: '\uE00F' };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ---------- probability distributions ----------
  function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
  function normCdf(a, b, mu, sd) { // high accuracy via integration
    return E.integrate(x => Math.exp(-((x - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI)), Math.max(a, mu - 40 * sd), Math.min(b, mu + 40 * sd));
  }
  function invNorm(p, mu, sd) { if (p <= 0 || p >= 1) throw new E.CalcError('Math ERROR'); return E.solve(x => normCdf(-1e99, x, mu, sd) - p, mu) ; }
  function binPD(x, n, p) { return E.FUNCS.ncr([n, x]) * Math.pow(p, x) * Math.pow(1 - p, n - x); }
  function poiPD(x, l) { let f = 1; for (let i = 2; i <= x; i++) f *= i; return Math.exp(-l) * Math.pow(l, x) / f; }

  const CONSTS = [['mp', 'm<sub>p</sub>', 1.67262192369e-27, 'proton mass'], ['mn', 'm<sub>n</sub>', 1.67492749804e-27, 'neutron mass'], ['me', 'm<sub>e</sub>', 9.1093837015e-31, 'electron mass'],
    ['h', '<i>h</i>', 6.62607015e-34, 'Planck const'], ['qe', '<i>e</i>', 1.602176634e-19, 'elem. charge'], ['NA', 'N<sub>A</sub>', 6.02214076e23, 'Avogadro'], ['kB', '<i>k</i>', 1.380649e-23, 'Boltzmann'],
    ['Rgas', 'R', 8.314462618, 'molar gas'], ['c0', 'C<sub>0</sub>', 299792458, 'speed of light'], ['eps0', 'ε<sub>0</sub>', 8.8541878128e-12, 'permittivity'], ['mu0', 'μ<sub>0</sub>', 1.25663706212e-6, 'permeability'],
    ['gn', 'g', 9.80665, 'std gravity'], ['Gc', 'G', 6.6743e-11, 'gravitation'], ['atm', 'atm', 101325, 'std atmosphere']];
  const CONVS = [['in▶cm', 2.54, 0], ['cm▶in', 1 / 2.54, 0], ['ft▶m', 0.3048, 0], ['m▶ft', 1 / 0.3048, 0], ['mile▶km', 1.609344, 0], ['km▶mile', 1 / 1.609344, 0], ['lb▶kg', 0.45359237, 0], ['kg▶lb', 1 / 0.45359237, 0],
    ['oz▶g', 28.349523125, 0], ['g▶oz', 1 / 28.349523125, 0], ['gal(US)▶L', 3.785411784, 0], ['L▶gal(US)', 1 / 3.785411784, 0], ['°F▶°C', 'F2C', 0], ['°C▶°F', 'C2F', 0], ['km/h▶m/s', 1 / 3.6, 0], ['m/s▶km/h', 3.6, 0], ['atm▶Pa', 101325, 0], ['Pa▶atm', 1 / 101325, 0], ['J▶cal', 1 / 4.184, 0], ['cal▶J', 4.184, 0]];
  E.FUNCS.F2C = (a) => (a[0] - 32) * 5 / 9; E.FUNCS.C2F = (a) => a[0] * 9 / 5 + 32;
  CONVS.forEach((c, i) => { if (typeof c[1] === 'number') E.FUNCS['cv' + i] = (a) => a[0] * c[1]; });

  // ---------- generic screens ----------
  class MenuScreen { // items: [{label, fn}] ; cols
    constructor(app, title, items, o) { this.app = app; this.title = title; this.items = items; this.sel = 0; this.o = o || {}; this.page = 0; }
    render() {
      const per = this.o.per || this.app.cfg.menuPer || 8; const start = Math.floor(this.sel / per) * per; const vis = this.items.slice(start, start + per);
      const cols = this.o.cols || this.app.cfg.menuCols || 2;
      return `<div class="menu">${this.title ? `<div class="mt">${this.title}</div>` : ''}<div class="mg" style="grid-template-columns:repeat(${cols},1fr)">` +
        vis.map((it, j) => `<div class="mi ${start + j === this.sel ? 'sel' : ''}">${this.o.nonum ? '' : (keyName(start + j) + ':')}${it.label}</div>`).join('') + `</div>${this.items.length > per ? '<div class="mmore">' + (start > 0 ? '▲' : '') + (start + per < this.items.length ? '▼' : '') + '</div>' : ''}</div>`;
    }
    handle(a) {
      const n = this.items.length; const cols = this.o.cols || this.app.cfg.menuCols || 2;
      if (/^d[0-9]$/.test(a)) { const i = parseInt(a[1]) - 1 + (a === 'd0' ? 10 : 0); if (i >= 0 && i < n) return this.pick(i); return true; }
      if (a.startsWith('hex:')) { const i = 9 + 'ABCDEF'.indexOf(a[4]) + 1; if (i < n) return this.pick(i); return true; }
      if (a === 'down') { this.sel = Math.min(n - 1, this.sel + (cols > 1 && this.o.grid ? cols : 1)); return true; }
      if (a === 'up') { this.sel = Math.max(0, this.sel - (cols > 1 && this.o.grid ? cols : 1)); return true; }
      if (a === 'right') { this.sel = Math.min(n - 1, this.sel + 1); return true; }
      if (a === 'left') { this.sel = Math.max(0, this.sel - 1); return true; }
      if (['exe', 'ok', 'enter'].includes(a)) return this.pick(this.sel);
      if (['ac', 'back', 'esc', 'clear', 'quit', 'exit', 'on'].includes(a) || a === this.o.closeKey) { this.app.pop(); return true; }
      return true;
    }
    pick(i) { const it = this.items[i]; if (!this.o.keep) this.app.pop(); if (it.fn) it.fn(); return true; }
  }
  function keyName(i) { return i < 9 ? String(i + 1) : (i === 9 ? '0' : 'ABCDEFGH'[i - 10]); }

  class FormScreen { // fields: [{label, value(number|null), expr?}] ; onDone(values)
    constructor(app, title, fields, onDone, o) { this.app = app; this.title = title; this.fields = fields; this.onDone = onDone; this.sel = 0; this.edit = null; this.o = o || {}; }
    render() {
      const per = this.o.per || this.app.cfg.formPer || 3; const start = Math.max(0, Math.min(this.sel - per + 1, this.fields.length - per)); const s0 = Math.max(0, Math.min(start, this.sel));
      const vis = this.fields.slice(s0, s0 + per);
      const fmt = (v) => v == null ? '' : U.valueHTML(v, { fmt: this.app.fmt, eStyle: this.app.cfg.eStyle });
      return `<div class="form">${this.title ? `<div class="mt">${this.title}</div>` : ''}` + vis.map((f, j) => {
        const i = s0 + j; const isSel = i === this.sel;
        const val = isSel && this.edit != null ? esc(this.edit) + '<span class="cur"></span>' : fmt(f.value);
        return `<div class="fr ${isSel ? 'sel' : ''}"><span class="fl">${f.label}</span><span class="fv">${val}</span></div>`;
      }).join('') + (this.o.hint ? `<div class="fh">${this.o.hint}</div>` : '') + '</div>';
    }
    commit() {
      if (this.edit == null) return true;
      if (this.edit === '' || this.edit === '-') { this.edit = null; return true; }
      try { const v = E.evaluate(this.edit.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/E/g, 'ᴇ'), this.app.env()); this.fields[this.sel].value = v; this.edit = null; return true; }
      catch (e) { this.app.flash(e.kind || 'Syntax ERROR'); this.edit = null; return false; }
    }
    handle(a) {
      const f = this.fields;
      const map = { d0: '0', d1: '1', d2: '2', d3: '3', d4: '4', d5: '5', d6: '6', d7: '7', d8: '8', d9: '9', dot: '.', neg: '−', sub: '−', add: '+', mul: '×', div: '÷', exp10: 'E', eex: 'E', lp: '(', rp: ')', pi: 'π', sq: '²', frac: '/', ans: 'Ans' };
      if (map[a] !== undefined) { if (this.edit == null) this.edit = ''; this.edit += map[a]; return true; }
      if (a === 'del' || a === 'bksp' || a === 'back' && this.edit) { if (this.edit) this.edit = this.edit.slice(0, -1); else if (a !== 'back') f[this.sel].value = this.o.nullable ? null : 0; return true; }
      if (a === 'chs' && this.edit != null) { this.edit = this.edit.startsWith('−') ? this.edit.slice(1) : '−' + this.edit; return true; }
      if (a === 'down' || a === 'right' && this.o.grid) { this.commit(); this.sel = Math.min(f.length - 1, this.sel + 1); return true; }
      if (a === 'up' || a === 'left' && this.o.grid) { this.commit(); this.sel = Math.max(0, this.sel - 1); return true; }
      if (['exe', 'ok', 'enter'].includes(a)) {
        const wasEditing = this.edit != null; if (!this.commit()) return true;
        if (this.sel < f.length - 1 && (wasEditing || !this.o.solveAnywhere)) { this.sel++; return true; }
        if (this.onDone) this.onDone(f.map(x => x.value), this); return true;
      }
      if (a === 'cpt' && this.o.onCpt) { this.commit(); this.o.onCpt(this.sel, this); return true; }
      if (['ac', 'esc', 'clear', 'quit', 'exit', 'on'].includes(a)) { if (this.edit != null) { this.edit = null; return true; } this.app.pop(); return true; }
      if (a === 'solveNow' && this.onDone) { this.commit(); this.onDone(f.map(x => x.value), this); return true; }
      return true;
    }
  }
  class ResultScreen { // lines: [[label, value]] scrollable
    constructor(app, title, lines, o) { this.app = app; this.title = title; this.lines = lines; this.sel = 0; this.o = o || {}; }
    render() {
      const per = this.o.per || this.app.cfg.formPer || 3; const s0 = Math.max(0, Math.min(this.sel, this.lines.length - per));
      return `<div class="form res">${this.title ? `<div class="mt">${this.title}</div>` : ''}` + this.lines.slice(s0, s0 + per).map(([l, v], j) => `<div class="fr ${s0 + j === this.sel ? 'sel' : ''}"><span class="fl">${l}</span><span class="fv">${typeof v === 'string' ? v : U.valueHTML(v, { fmt: this.app.fmt, exact: this.o.exact && this.app.cfg.natural, hint: { sqrt: 1 }, eStyle: this.app.cfg.eStyle })}</span></div>`).join('') + (this.lines.length > per ? `<div class="mmore">${s0 > 0 ? '▲' : ''}${s0 + per < this.lines.length ? '▼' : ''}</div>` : '') + '</div>';
    }
    handle(a) {
      if (a === 'down' || a === 'exe' && this.o.exeNext && this.sel < this.lines.length - 1) { this.sel = Math.min(this.lines.length - 1, this.sel + 1); return true; }
      if (a === 'up') { this.sel = Math.max(0, this.sel - 1); return true; }
      if (['ac', 'exe', 'esc', 'back', 'clear', 'quit', 'exit', 'ok', 'enter', 'on'].includes(a)) { this.app.pop(); if (this.o.onClose) this.o.onClose(a); return true; }
      return true;
    }
  }
  class GridScreen { // editable table: cols [names], rows [[..]]
    constructor(app, title, cols, rows, o) { this.app = app; this.title = title; this.cols = cols; this.rows = rows; this.r = 0; this.c = 0; this.edit = null; this.o = o || {}; }
    render() {
      const per = this.o.per || (this.app.cfg.lines >= 4 ? 4 : 3); const s0 = Math.max(0, this.r - per + 1);
      const fmt = (v) => v == null ? '' : U.plainHTML(v, { fmt: { mode: 'norm1', digits: 6 }, eStyle: 'E' });
      let html = `<div class="grid">${this.title ? `<div class="mt">${this.title}</div>` : ''}<table><tr><th></th>${this.cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
      for (let i = s0; i < Math.min(this.rows.length + (this.o.growable ? 1 : 0), s0 + per); i++) {
        const row = this.rows[i] || [];
        html += `<tr><td class="rn">${i + 1}</td>` + this.cols.map((_, j) => { const sel = i === this.r && j === this.c; return `<td class="${sel ? 'sel' : ''}">${sel && this.edit != null ? esc(this.edit) + '<span class="cur"></span>' : fmt(row[j])}</td>`; }).join('') + '</tr>';
      }
      const cur = this.rows[this.r] && this.rows[this.r][this.c];
      return html + `</table><div class="gfoot">${this.edit != null ? '' : (cur != null ? E.fmtPlain(cur) : '')}</div></div>`;
    }
    commit() {
      if (this.edit == null || this.edit === '') { this.edit = null; return; }
      try { const v = E.evaluate(this.edit.replace(/−/g, '~').replace(/E/g, 'ᴇ'), this.app.env()); while (this.rows.length <= this.r) this.rows.push(this.cols.map(() => this.o.fill != null ? this.o.fill : null)); this.rows[this.r][this.c] = v; if (this.o.fillRow) this.rows[this.r] = this.rows[this.r].map((x, j) => x == null ? (j === this.c ? v : this.o.fillRow(j)) : x); }
      catch (e) { this.app.flash('Syntax ERROR'); }
      this.edit = null;
    }
    handle(a) {
      if (this.o.readonly && /^d|dot|neg/.test(a) && a !== 'down') { if (a !== 'del') return true; }
      const map = { d0: '0', d1: '1', d2: '2', d3: '3', d4: '4', d5: '5', d6: '6', d7: '7', d8: '8', d9: '9', dot: '.', neg: '−', sub: '−', exp10: 'E', eex: 'E' };
      if (map[a] !== undefined && !this.o.readonly) { if (this.edit == null) this.edit = ''; this.edit += map[a]; return true; }
      const maxR = this.rows.length - (this.o.growable ? 0 : 1);
      if (a === 'del' && !this.o.readonly) { if (this.edit) { this.edit = this.edit.slice(0, -1); return true; } if (this.o.growable && this.rows.length > this.r) { this.rows.splice(this.r, 1); this.r = Math.max(0, Math.min(this.r, this.rows.length)); } return true; }
      if (['exe', 'ok', 'enter'].includes(a)) { this.commit(); if (this.o.onChange) this.o.onChange(this.rows); this.r = Math.min(this.r + 1, this.rows.length - (this.o.growable ? 0 : 1)); return true; }
      if (a === 'down') { this.commit(); this.r = Math.min(this.r + 1, maxR); return true; }
      if (a === 'up') { this.commit(); this.r = Math.max(0, this.r - 1); return true; }
      if (a === 'right') { this.commit(); this.c = Math.min(this.cols.length - 1, this.c + 1); return true; }
      if (a === 'left') { this.commit(); this.c = Math.max(0, this.c - 1); return true; }
      if (['ac', 'esc', 'clear', 'quit', 'exit', 'on', 'back'].includes(a)) { this.commit(); if (this.o.onChange) this.o.onChange(this.rows); this.app.pop(); if (this.o.onClose) this.o.onClose(); return true; }
      if (this.o.extra && this.o.extra(a, this)) return true;
      return true;
    }
  }
  class MsgScreen { constructor(app, text) { this.app = app; this.text = text; } render() { return `<div class="msg">${this.text}</div>`; } handle(a) { this.app.pop(); return true; } }

  // ---------- main calculation screen ----------
  class CalcScreen {
    constructor(app) { this.app = app; }
    render() { return this.app.renderCalc(); }
    handle(a, kd) { return this.app.calcKey(a, kd); }
  }

  class SciApp {
    constructor(model, el) {
      this.model = model; this.cfg = Object.assign({ natural: true, lines: 2, eStyle: '×10', implicitHigh: true, modeKey: 'mode', family: 'es', history: false, menuPer: 8, menuCols: 2, formPer: 3, digits: 10 }, model.cfg || {});
      this.el = el; this.reset();
    }
    reset() {
      this.vars = {}; 'ABCDEFXYM'.split('').forEach(c => this.vars[c] = 0); this.ans = 0; this.preAns = 0;
      this.angle = this.cfg.angle || 'deg'; this.fmt = { mode: 'norm1', digits: this.cfg.digits }; this.mode = 'COMP'; this.base = 10;
      this.ed = new U.Editor(); this.hist = []; this.histIdx = -1; this.res = null; this.err = null; this.shift = false; this.alpha = false; this.hyp = false; this.sto = false; this.rcl = false;
      this.statType = 'lin'; this.stat = []; this.mats = { MatA: null, MatB: null, MatC: null }; this.vcts = { VctA: null, VctB: null, VctC: null }; this.fns = {};
      this.natural = this.cfg.natural; this.stack = [new CalcScreen(this)]; this.on = true; this.lastCycle = null; this.mixedOut = false;
    }
    get top() { return this.stack[this.stack.length - 1]; }
    push(s) { this.stack.push(s); } pop() { if (this.stack.length > 1) this.stack.pop(); }
    flash(msg) { this.err = msg; }
    env(extra) {
      const vars = Object.assign({}, this.vars, this.mats, this.vcts);
      for (const k in vars) if (vars[k] == null) delete vars[k];
      return Object.assign(E.makeEnv({ angle: this.angle, vars, ans: this.ans, preAns: this.preAns, complex: this.mode === 'CMPLX' || this.cfg.alwaysComplex, base: this.mode === 'BASE' ? this.base : null, implicitHigh: this.cfg.implicitHigh, fmt: this.fmt, constants: this.constants(), crossOnMul: this.mode === 'VECTOR' }), { fns: this.fns, __env: true }, extra || {});
    }
    constants() { const o = {}; CONSTS.forEach(c => o['K_' + c[0]] = c[2]); return o; }

    // ---- key press entry point ----
    press(kd) {
      if (!this.on && kd.act !== 'on' && kd.act !== 'ac' && kd.act !== 'onac' && kd.act !== 'onc') return;
      let a = kd.act;
      if (this.shift && kd.s) a = kd.s[1];
      else if (this.alpha && kd.a) a = kd.a[1];
      else if (this.mode === 'BASE' && kd.b && !this.shift) a = kd.b[1];
      else if (this.mode === 'BASE' && kd.a && /^var:[A-F]$/.test(kd.a[1]) && !this.shift && !this.alpha) a = 'hex:' + kd.a[1][4];
      if (this.sto && kd.a && /^var:/.test(kd.a[1]) && !['shift', 'alpha'].includes(a)) a = kd.a[1];
      if (this.sto && (kd.act === 'mplus')) a = 'var:M';
      if (this.rcl && kd.a && /^var:/.test(kd.a[1])) a = kd.a[1];
      if (kd.cyc && a === kd.act && !this.shift && !this.alpha && this.top instanceof CalcScreen && !this.sto && !this.rcl) {
        // multi-tap key (e.g. "ln log", "sin sin⁻¹"): repeated presses cycle through the functions printed on the key
        if (this.cycKey === kd && this.cycSnap) { this.ed = this.cycSnap.ed.clone(); this.res = this.cycSnap.res; this.cycIdx = (this.cycIdx + 1) % kd.cyc.length; }
        else { this.cycSnap = { ed: this.ed.clone(), res: this.res }; this.cycIdx = 0; }
        this.cycKey = kd; this.err = null;
        try { this.top.handle(kd.cyc[this.cycIdx], kd); } catch (e) { this.err = e.kind || 'Error'; }
        this.render(); return;
      }
      if (!['shift', 'alpha'].includes(a)) this.cycKey = null;
      if (a === 'shift') { this.shift = !this.shift; this.alpha = false; this.render(); return; }
      if (a === 'alpha') { this.alpha = !this.alpha; this.shift = false; this.render(); return; }
      this.shift = false; if (!this.alphaLock) this.alpha = false;
      if (this.err && !(this.top instanceof CalcScreen)) this.err = null;
      try { this.top.handle(a, kd); }
      catch (e) { if (e instanceof E.CalcError || e.kind) this.err = e.kind || 'Math ERROR'; else { console.error(e); this.err = 'Error'; } }
      this.render();
    }
    // ---- token table ----
    tok(a) {
      const nat = this.natural; const fam = this.cfg.family;
      const T = (d, s) => ({ d, s: s == null ? d : s });
      const F = (name, disp) => T((disp || name) + '(', name + '(');
      if (/^d[0-9]$/.test(a)) return T(a[1]);
      if (a.startsWith('hex:')) return { d: a[4], s: HEXCH[a[4]] };
      if (a.startsWith('var:')) { const v = a.slice(4); return T(`<i>${v.length === 1 && this.cfg.lowerVars ? v.toLowerCase() : v}</i>`, v); }
      switch (a) {
        case 'dot': return T('.');
        case 'exp10': return T(this.cfg.eStyle === 'E' ? '<span class="ee">E</span>' : '<span class="e10">×₁₀</span>', 'ᴇ');
        case 'add': return T('+'); case 'sub': return T('−', '-'); case 'mul': return T('×', '*'); case 'div': return T('÷', '/');
        case 'neg': return T('−', '~'); case 'lp': return T('('); case 'rp': return T(')'); case 'comma': return T(','); case 'eq': return T('='); case 'colon': return T(':');
        case 'sin': case 'cos': case 'tan': return this.hyp ? F(a + 'h', a + 'h') : F(a);
        case 'asin': case 'acos': case 'atan': return this.hyp ? F(a + 'h', a.slice(1) + 'h<sup>−1</sup>') : F(a, a.slice(1) + '<sup>−1</sup>');
        case 'sinh': case 'cosh': case 'tanh': return F(a);
        case 'asinh': case 'acosh': case 'atanh': return F(a, a.slice(1) + '<sup>−1</sup>');
        case 'log': return F('log'); case 'ln': return F('ln');
        case 'sq': return T('<sup>2</sup>', '²'); case 'cube': return T('<sup>3</sup>', '³'); case 'inv': return T('<sup>−1</sup>', 'ˉ');
        case 'fact': return T('!'); case 'pct': return T('%'); case 'npr': return T('<b class="op">P</b>', 'ℙ'); case 'ncr': return T('<b class="op">C</b>', 'ℂ');
        case 'pi': return T('π'); case 'e': return T('<i>e</i>', 'ℯ'); case 'i': return T('<i>i</i>', 'ⅈ'); case 'ans': return T('Ans'); case 'preans': return T('PreAns');
        case 'dms': return T('°'); case 'degm': return T('°', 'ᴰ'); case 'radm': return T('<sup>r</sup>', 'ʳ'); case 'gradm': return T('<sup>g</sup>', 'ᵍ');
        case 'pol': return F('pol', 'Pol'); case 'rec': return F('rec', 'Rec'); case 'ran': return T('Ran#', 'ran(0)'); case 'ranint': return F('ranint', 'RanInt#');
        case 'rnd': return F('rnd', 'Rnd'); case 'gcd': return F('gcd', 'GCD'); case 'lcm': return F('lcm', 'LCM'); case 'int': return F('int', 'Int'); case 'intg': return F('intg', 'Intg');
        case 'arg': return F('arg'); case 'conj': return F('conj', 'Conjg'); case 're': return F('re', 'ReP'); case 'im': return F('im', 'ImP');
        case 'det': return F('det'); case 'trn': return F('trn', 'Trn'); case 'dotp': return F('dot', 'Dot'); case 'cross': return F('cross', 'Cross'); case 'idt': return F('identity', 'Identity');
        case 'and': return T(' and ', ' and '); case 'or': return T(' or ', ' or '); case 'xor': return T(' xor ', ' xor '); case 'xnor': return T(' xnor ', ' xnor '); case 'not': return F('not', 'Not'); case 'negb': return F('neg', 'Neg');
        case 'x': return T('<i>x</i>', 'X');
        case 'angle': return T('∠');
        case 'pow': return nat ? null : T('^');
        case 'ypow': return T('^');
        case 'sqrt': return nat ? null : F('sqrt', '√');
        case 'cbrt': return nat ? null : F('cbrt', '³√');
        case 'nroot': return nat ? null : F('nroot', 'ˣ√');
        case 'pow10': return nat ? null : F('pow10', '10^');
        case 'epow': return nat ? null : F('exp', '<i>e</i>^');
        case 'frac': case 'mixed': return nat ? null : T('⌟');
        case 'abs': return nat ? null : F('abs', 'Abs');
        case 'logab': return nat ? null : F('log', 'log');
        case 'integ': return nat ? null : F('integ', '∫');
        case 'deriv': return nat ? null : F('deriv', 'd/dx');
        case 'sigma': return nat ? null : F('sigma', 'Σ');
        case 'prod': return nat ? null : F('prodf', 'Π');
        case 'mod': return F('mod', 'MOD'); case 'round': return F('round');
        case 'tenx': return T('×10'); // display only
      }
      if (a.startsWith('ins:')) { const s = a.slice(4); return T(s); }
      if (a.startsWith('fn:')) { const [nm, disp] = a.slice(3).split('|'); return F(nm, disp || nm); }
      if (a.startsWith('src:')) { const [s, d] = a.slice(4).split('|'); return T(d || s, s); }
      return undefined;
    }
    tplFor(a) { return { pow: 'pow', sqrt: 'sqrt', cbrt: 'cbrt', nroot: 'nroot', pow10: 'pow10', epow: 'epow', frac: 'frac', mixed: 'mixed', abs: 'abs', logab: 'logab', integ: 'integ', deriv: 'deriv', sigma: 'sigma', prod: 'prod' }[a]; }

    startNew(withAns) {
      this.ed.clear(); this.res = null; this.hyp = false; this.histIdx = -1;
      if (withAns) this.ed.put({ d: 'Ans', s: 'Ans' });
    }
    calcKey(a, kd) {
      if (this.err) {
        if (a === 'left' || a === 'right' || a === 'del') { this.err = null; this.res = null; return true; }
        this.err = null; if (a === 'ac' || a === 'on' || a === 'onac' || a === 'clear' || a === 'onc') return true;
      }
      if (this.sto) return this.doSto(a);
      if (this.rcl) { this.rcl = false; if (a.startsWith('var:')) { const v = a.slice(4); this.res = { label: v + '=', value: this.vars[v] || 0, tokens: this.ed.t.slice() }; } return true; }
      const resultShown = !!this.res;
      // varcycle (TI multiview style x y z t a b c)
      if (a === 'varcycle') {
        const L = this.cfg.cycleVars || ['x', 'y', 'z', 't', 'a', 'b', 'c'];
        if (resultShown) this.startNew();
        if (this.lastCycle != null && this.ed.c > 0 && this.ed.t[this.ed.c - 1].cyc) { const i = (L.indexOf(this.ed.t[this.ed.c - 1].s) + 1) % L.length; this.ed.t[this.ed.c - 1] = { d: `<i>${L[i]}</i>`, s: L[i], cyc: 1 }; }
        else this.ed.put({ d: `<i>${L[0]}</i>`, s: L[0], cyc: 1 });
        this.lastCycle = 1; return true;
      }
      this.lastCycle = null;
      switch (a) {
        case 'ac': case 'onac': case 'onc': case 'clear':
          if (!this.on) { this.on = true; return true; }
          if (a === 'clear' && !this.res && !this.ed.empty) { this.ed.clear(); return true; }
          this.startNew(); this.hyp = false; return true;
        case 'on': this.on = true; this.startNew(); return true;
        case 'off': this.on = false; this.startNew(); return true;
        case 'del': case 'bksp':
          if (resultShown) { this.res = null; this.ed.end(); return true; }
          this.ed.del(); return true;
        case 'ins': this.ed.insert = !this.ed.insert; return true;
        case 'left': if (resultShown) { this.res = null; this.ed.end(); return true; } this.ed.left(); return true;
        case 'right': if (resultShown) { this.res = null; this.ed.home(); return true; } this.ed.right(); return true;
        case 'up': case 'down':
          if (this.ed.vert(a === 'up' ? -1 : 1) && !resultShown) return true;
          if (!this.hist.length) return true;
          if (resultShown || this.ed.empty || this.histIdx >= 0) {
            if (this.histIdx < 0) this.histIdx = this.hist.length - (resultShown ? 1 : 0);
            this.histIdx = Math.max(0, Math.min(this.hist.length - 1, this.histIdx + (a === 'up' ? -1 : 1)));
            const h = this.hist[this.histIdx]; this.ed.fromTokens(h.tokens); this.res = { value: h.value, tokens: h.tokens }; this.displayDec = false; return true;
          }
          return true;
        case 'exe': case 'enter': case 'ok': return this.execute();
        case 'sto': this.sto = true; return true;
        case 'stoarrow': if (resultShown) this.startNew(true); this.ed.put({ d: '→', s: '→' }); return true;
        case 'rcl': this.rcl = true; return true;
        case 'mplus': case 'mminus': return this.memAdd(a === 'mplus' ? 1 : -1);
        case 'sd': if (resultShown) { this.displayDec = !this.displayDec; return true; } return this.execute(true);
        case 'fd': if (resultShown) { this.displayDec = !this.displayDec; return true; } return true;
        case 'mixedtoggle': if (resultShown) { this.mixedOut = !this.mixedOut; this.displayDec = false; } return true;
        case 'eng': case 'engl': if (resultShown && E.isNum(this.res.value)) { this.res.eng = (this.res.eng || 0) + (a === 'eng' ? 1 : -1); } return true;
        case 'hyp': return this.menu('hyp', [['sinh', 'sinh'], ['cosh', 'cosh'], ['tanh', 'tanh'], ['sinh<sup>−1</sup>', 'asinh'], ['cosh<sup>−1</sup>', 'acosh'], ['tanh<sup>−1</sup>', 'atanh']].map(([l, x]) => ({ label: l, fn: () => this.calcKey(x) })));
        case 'hypflag': this.hyp = !this.hyp; return true;
        case 'mode': case 'menu': case 'home': return this.modeMenu();
        case 'setup': case 'settings': return this.setupMenu();
        case 'clr': return this.menu('CLR', [{ label: 'Setup', fn: () => { this.angle = 'deg'; this.fmt = { mode: 'norm1', digits: this.cfg.digits }; this.natural = this.cfg.natural; } }, { label: 'Memory', fn: () => { 'ABCDEFXYM'.split('').forEach(c => this.vars[c] = 0); this.ans = 0; } }, { label: 'All', fn: () => { this.reset(); } }]);
        case 'reset': return this.menu('Reset all?', [{ label: 'Yes', fn: () => this.reset() }, { label: 'No' }]);
        case 'const': return this.menu('CONST', CONSTS.map(c => ({ label: c[1] + ' ' + c[3], fn: () => this.insert({ d: c[1], s: 'K_' + c[0] }) })), { cols: 1, per: this.cfg.lines >= 4 ? 4 : 3 });
        case 'conv': return this.menu('CONV', CONVS.map((c, i) => ({ label: c[0], fn: () => this.insert({ d: `<span class="cv">${c[0]}</span>`, s: (typeof c[1] === 'string' ? c[1] : 'cv' + i) + '(' }) })), { cols: 1, per: this.cfg.lines >= 4 ? 4 : 3 });
        case 'drg': return this.menu('DRG', [{ label: '°', fn: () => this.insert(this.tok('degm')) }, { label: '<sup>r</sup>', fn: () => this.insert(this.tok('radm')) }, { label: '<sup>g</sup>', fn: () => this.insert(this.tok('gradm')) }], { cols: 3 });
        case 'drgcycle': this.angle = { deg: 'rad', rad: 'grad', grad: 'deg' }[this.angle]; return true;
        case 'basemenu': return this.menu('BASE', [['and', 'and'], ['or', 'or'], ['xor', 'xor'], ['xnor', 'xnor'], ['Not(', 'not'], ['Neg(', 'negb']].map(([l, x]) => ({ label: l, fn: () => this.calcKey(x) })), { cols: 2 });
        case 'cmplxmenu': return this.menu('CMPLX', [{ label: 'arg', fn: () => this.calcKey('arg') }, { label: 'Conjg', fn: () => this.calcKey('conj') }, { label: '▶r∠θ', fn: () => { this.polar = true; } }, { label: '▶a+b<i>i</i>', fn: () => { this.polar = false; } }, { label: 'ReP', fn: () => this.calcKey('re') }, { label: 'ImP', fn: () => this.calcKey('im') }]);
        case 'statmenu': return this.statMenu();
        case 'matmenu': return this.matMenu();
        case 'vctmenu': return this.vctMenu();
        case 'optn': case 'tools': return this.optnMenu();
        case 'catalog': return this.catalogMenu();
        case 'format': return this.formatMenu();
        case 'variable': return this.varMenu();
        case 'function': return this.funcMenu();
        case 'calc': return this.doCalc();
        case 'solve': return this.doSolve();
        case 'eqnmode': return this.eqnMenu();
        case 'tablemode': return this.tableStart();
        case 'stat1': this.mode = 'STAT'; this.statType = '1var'; return this.statEditor();
        case 'stat2': this.mode = 'STAT'; this.statType = 'lin'; return this.statEditor();
        case 'statdata': return this.statEditor();
        case 'distmenu': return this.distMenu();
        case 'prb': return this.menu('PRB', [{ label: 'nPr', fn: () => this.calcKey('npr') }, { label: 'nCr', fn: () => this.calcKey('ncr') }, { label: '!', fn: () => this.calcKey('fact') }, { label: 'rand', fn: () => this.calcKey('ran') }, { label: 'randint(', fn: () => this.calcKey('ranint') }], { cols: 1 });
        case 'mathmenu': return this.mathMenu();
        case 'polymenu': return this.eqnMenu('poly');
        case 'sysmenu': return this.eqnMenu('sys');
        case 'numsolve': return this.doSolve();
        case 'cmplxmode': this.mode = this.mode === 'CMPLX' ? 'COMP' : 'CMPLX'; return true;
        case 'basen': this.mode = 'BASE'; this.startNew(); return this.baseNMenu();
        case 'quit': this.stack = [this.stack[0]]; return true;
        case 'convmenu': return this.calcKey('conv');
        case 'pctchange': return true;
        case 'clearvar': 'ABCDEFXYM'.split('').forEach(c => this.vars[c] = 0); ['x', 'y', 'z', 't', 'a', 'b', 'c', 'd'].forEach(c => delete this.vars[c]); this.flash('Cleared'); return true;
        case 'recall': return this.varMenu();
        case 'answer': return this.calcKey('ans');
        case 'tofrac': if (resultShown) { this.displayDec = false; } return true;
        case 'todec': if (resultShown) { this.displayDec = true; } return true;
        case 'noop': return true;
      }
      if (a.startsWith('base:')) { if (this.mode === 'BASE') { this.base = parseInt(a.slice(5)); } return true; }
      if (a.startsWith('mode:')) { this.setMode(a.slice(5)); return true; }
      if (a.startsWith('fix:')) { this.fmt = { mode: 'fix', n: parseInt(a.slice(4)), digits: this.cfg.digits }; return true; }
      if (a.startsWith('msg:')) { this.push(new MsgScreen(this, a.slice(4))); return true; }
      // token insertion
      const opStart = ['add', 'sub', 'mul', 'div', 'sq', 'cube', 'inv', 'pow', 'ypow', 'fact', 'pct', 'npr', 'ncr', 'stoarrow', 'and', 'or', 'xor', 'xnor', 'angle'];
      if (resultShown) this.startNew(opStart.includes(a) && !this.cfg.noAnsChain);
      const tp = this.natural ? this.tplFor(a) : null;
      if (tp) {
        if (tp === 'cbrt') { this.ed.tpl('nroot'); this.ed.put({ d: '3', s: '3' }); this.ed.c++; return true; }
        if (tp === 'logab' && this.cfg.logabFirstEmpty) { this.ed.tpl('logab'); return true; }
        this.ed.tpl(tp, tp === 'frac' && this.cfg.fracGrab); return true;
      }
      const t = this.tok(a);
      if (t) { this.ed.put(t); if (a !== 'hypflag') this.hyp = false; return true; }
      return true;
    }
    insert(t) { if (this.res) this.startNew(); this.ed.put(t); }
    menu(title, items, o) { this.push(new MenuScreen(this, title, items, o)); return true; }
    source() {
      let s = this.ed.source();
      if (this.mode === 'BASE') { const b = this.base; s = s.replace(/[0-9\uE00A-\uE00F]+/g, (m) => { const str = m.replace(/[\uE00A-\uE00F]/g, c => 'ABCDEF'[c.charCodeAt(0) - 0xE00A]); const v = parseInt(str, b); if (isNaN(v) || str.split('').some(ch => parseInt(ch, 16) >= b)) throw new E.CalcError('Syntax ERROR'); if (b !== 10 && v > 0x7fffffff) return String(v | 0).replace('-', '~'); return String(v); }); }
      return s;
    }
    execute(forceDec) {
      if (this.res && !this.ed.empty) { // re-execute same expression
        this.res = null;
      }
      if (this.ed.empty) { if (this.hist.length && this.cfg.repeatLast) { this.ed.fromTokens(this.hist[this.hist.length - 1].tokens); } else return true; }
      let src = this.source();
      let storeTo = null; const ai = src.lastIndexOf('→');
      if (ai >= 0) { storeTo = src.slice(ai + 1).trim(); src = src.slice(0, ai); if (!/^[A-Za-zθ]$/.test(storeTo)) throw new E.CalcError('Syntax ERROR'); if (!src) src = 'Ans'; }
      // multi-statement with ':' -> evaluate sequentially
      const env = this.env();
      let v; const parts = src.split(':');
      for (const p of parts) { v = E.evaluate(p, env); }
      if (E.isMat(v)) v = E.toMat(v);
      if (storeTo) this.vars[storeTo] = v;
      this.preAns = this.ans; this.ans = v;
      if (E.isMat(v)) this.mats.MatAns = v;
      const hasDec = /[0-9]\.|\.[0-9]/.test(src) || /ᴇ/.test(src);
      const hint = { pi: /π/.test(src) || (this.angle === 'rad' && /a(sin|cos|tan)/.test(src)), sqrt: true };
      this.res = { value: v, tokens: this.ed.t.slice(), exactOK: !hasDec && this.natural && !/integ|deriv|ran/.test(src), hint, multi: env.multi };
      this.displayDec = !!forceDec || !!this.cfg.decDefault; this.mixedOut = false;
      this.hist.push({ tokens: this.ed.t.slice(), value: v, src }); if (this.hist.length > 30) this.hist.shift();
      this.histIdx = -1;
      if (env.multi && this.cfg.lines < 4) { // Pol/Rec on 2-line: show both values
        this.push(new ResultScreen(this, '', env.multi.map(([l, x]) => [l + '=', x]), { per: 2 }));
      }
      return true;
    }
    doSto(a) {
      this.sto = false;
      if (!a.startsWith('var:')) return true;
      const v = a.slice(4);
      if (!this.ed.empty && !this.res) this.execute();
      const val = this.res ? this.res.value : this.ans;
      this.vars[v] = val; this.res = { value: val, label: '→' + v, tokens: this.ed.t.slice(), exactOK: this.res && this.res.exactOK, hint: this.res ? this.res.hint : {} };
      return true;
    }
    memAdd(sign) {
      if (!this.ed.empty && !this.res) this.execute();
      const val = this.res ? this.res.value : this.ans;
      if (!E.isNum(val)) throw new E.CalcError('Math ERROR');
      this.vars.M = E.round15((this.vars.M || 0) + sign * val); this.ans = val;
      if (this.res) this.res.label = sign > 0 ? 'M+' : 'M−';
      return true;
    }
    setMode(m) {
      this.mode = m; this.startNew(); this.stack = [this.stack[0]];
      if (m === 'STAT') return this.statTypeMenu();
      if (m === 'EQN') return this.eqnMenu();
      if (m === 'TABLE') return this.tableStart();
      if (m === 'MATRIX') return this.matMenu(true);
      if (m === 'VECTOR') return this.vctMenu(true);
      if (m === 'DIST') return this.distMenu();
      if (m === 'BASE') { this.base = 10; return true; }
    }
    modeMenu() {
      const L = this.cfg.modes || [['COMP', 'COMP'], ['CMPLX', 'CMPLX'], ['STAT', 'STAT'], ['BASE-N', 'BASE'], ['EQN', 'EQN'], ['MATRIX', 'MATRIX'], ['TABLE', 'TABLE'], ['VECTOR', 'VECTOR']];
      return this.menu(this.cfg.modeTitle || '', L.map(([l, m]) => ({ label: l, fn: () => this.setMode(m) })), { cols: this.cfg.modeCols || 2 });
    }
    setupMenu() {
      const items = [
        { label: 'MthIO', fn: () => { this.natural = true; } }, { label: 'LineIO', fn: () => { this.natural = false; } },
        { label: 'Deg', fn: () => this.angle = 'deg' }, { label: 'Rad', fn: () => this.angle = 'rad' }, { label: 'Gra', fn: () => this.angle = 'grad' },
        { label: 'Fix', fn: () => this.pickDigits('Fix 0~9?', n => this.fmt = { mode: 'fix', n, digits: this.cfg.digits }) },
        { label: 'Sci', fn: () => this.pickDigits('Sci 0~9?', n => this.fmt = { mode: 'sci', n: n || 10, digits: this.cfg.digits }) },
        { label: 'Norm', fn: () => this.menu('Norm 1~2?', [{ label: 'Norm1', fn: () => this.fmt = { mode: 'norm1', digits: this.cfg.digits } }, { label: 'Norm2', fn: () => this.fmt = { mode: 'norm2', digits: this.cfg.digits } }]) },
        { label: 'ab/c ↔ d/c', fn: () => { this.cfg.mixedDefault = !this.cfg.mixedDefault; } },
        { label: 'CMPLX a+b<i>i</i>/r∠θ', fn: () => { this.polar = !this.polar; } },
      ];
      return this.menu(this.cfg.setupTitle || '', items);
    }
    pickDigits(title, fn) { return this.menu(title, '1234567890'.split('').map(d => ({ label: d, fn: () => fn(parseInt(d)) })), { cols: 5, nonum: true, per: 10 }); }
    optnMenu() {
      const items = [];
      if (this.mode === 'MATRIX') return this.matMenu();
      if (this.mode === 'VECTOR') return this.vctMenu();
      if (this.mode === 'CMPLX') return this.calcKey('cmplxmenu');
      if (this.mode === 'STAT') return this.statMenu();
      if (this.mode === 'BASE') return this.calcKey('basemenu');
      items.push({ label: 'Hyperbolic', fn: () => this.calcKey('hyp') }, { label: 'Angle unit', fn: () => this.calcKey('drg') }, { label: 'Engineer sym', fn: () => this.calcKey('eng') },
        { label: '∫ / d/dx / Σ', fn: () => this.menu('Calculus', [{ label: '∫dx', fn: () => this.calcKey('integ') }, { label: 'd/dx', fn: () => this.calcKey('deriv') }, { label: 'Σ', fn: () => this.calcKey('sigma') }, { label: 'Π', fn: () => this.calcKey('prod') }]) },
        { label: 'Numeric calc', fn: () => this.menu('Numeric', [{ label: 'GCD', fn: () => this.calcKey('gcd') }, { label: 'LCM', fn: () => this.calcKey('lcm') }, { label: 'Int', fn: () => this.calcKey('int') }, { label: 'Intg', fn: () => this.calcKey('intg') }, { label: 'Abs', fn: () => this.calcKey('abs') }, { label: 'Rnd', fn: () => this.calcKey('rnd') }]) },
        { label: 'Probability', fn: () => this.calcKey('prb') }, { label: 'Constants', fn: () => this.calcKey('const') }, { label: 'Conversions', fn: () => this.calcKey('conv') });
      return this.menu(this.cfg.optnTitle || 'OPTN', items, { cols: 1, per: this.cfg.lines >= 4 ? 4 : 3 });
    }
    catalogMenu() {
      const F = [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'], ['sin⁻¹', 'asin'], ['cos⁻¹', 'acos'], ['tan⁻¹', 'atan'], ['sinh', 'sinh'], ['cosh', 'cosh'], ['tanh', 'tanh'], ['log', 'log'], ['ln', 'ln'], ['e^', 'epow'], ['10^', 'pow10'], ['√', 'sqrt'], ['³√', 'cbrt'], ['ˣ√', 'nroot'], ['logₐb', 'logab'], ['Abs', 'abs'], ['Pol', 'pol'], ['Rec', 'rec'], ['nPr', 'npr'], ['nCr', 'ncr'], ['!', 'fact'], ['GCD', 'gcd'], ['LCM', 'lcm'], ['Int', 'int'], ['Intg', 'intg'], ['RanInt#', 'ranint'], ['Ran#', 'ran'], ['Rnd', 'rnd'], ['∫', 'integ'], ['d/dx', 'deriv'], ['Σ', 'sigma'], ['π', 'pi'], ['e', 'e'], ['°', 'degm'], ['ʳ', 'radm'], ['ᵍ', 'gradm']];
      return this.menu('CATALOG', F.map(([l, x]) => ({ label: l, fn: () => this.calcKey(x) })), { cols: 2, per: this.cfg.lines >= 4 ? 8 : 6 });
    }
    formatMenu() {
      if (!this.res) return true;
      return this.menu('FORMAT', [{ label: 'Standard', fn: () => { this.displayDec = false; this.mixedOut = false; this.res.eng = 0; this.res.dms = false; } }, { label: 'Decimal', fn: () => { this.displayDec = true; } },
        { label: 'Improper frac', fn: () => { this.displayDec = false; this.mixedOut = false; } }, { label: 'Mixed fraction', fn: () => { this.displayDec = false; this.mixedOut = true; } },
        { label: 'ENG notation', fn: () => { this.res.eng = 1; } }, { label: 'Sexagesimal', fn: () => { this.res.dms = true; } }, { label: 'Polar Coord', fn: () => { this.polar = true; } }, { label: 'Rect Coord', fn: () => { this.polar = false; } }], { cols: 1, per: 4 });
    }
    varMenu() {
      const names = this.cfg.varNames || ['A', 'B', 'C', 'D', 'E', 'F', 'X', 'Y', 'M'];
      return this.menu('VARIABLE', names.map(n => ({ label: `${this.cfg.lowerVars ? n.toLowerCase() : n}=${E.fmtPlain(this.vars[n] || 0)}`, fn: () => this.menu(n, [{ label: 'Recall', fn: () => this.insert(this.tok('var:' + n)) }, { label: 'Store Ans', fn: () => { this.vars[n] = this.ans; } }, { label: 'Clear', fn: () => { this.vars[n] = 0; } }]) })), { cols: 1, per: this.cfg.lines >= 4 ? 4 : 3 });
    }
    funcMenu() {
      return this.menu('FUNCTION', [{ label: 'Define f(x)', fn: () => this.defineFn('f') }, { label: 'Define g(x)', fn: () => this.defineFn('g') }, { label: 'Insert f(', fn: () => this.insert({ d: '<i>f</i>(', s: 'f(' }) }, { label: 'Insert g(', fn: () => this.insert({ d: '<i>g</i>(', s: 'g(' }) }], { cols: 1, per: 4 });
    }
    defineFn(name) {
      const app = this; const ed = new U.Editor(); if (this.fns[name]) ed.fromTokens(this.fns[name].tokens);
      this.push(new ExprEntryScreen(this, `<i>${name}</i>(<i>x</i>)=`, ed, (tokens, src) => { app.fns[name] = { ast: E.parse(src, { implicitHigh: app.cfg.implicitHigh }), tokens, v: 'X' }; app.pop(); }));
      return true;
    }
    mathMenu() { // TI-style math/templates menu
      return this.menu('MATH', [{ label: 'n/d', fn: () => this.calcKey('frac') }, { label: 'Un/d', fn: () => this.calcKey('mixed') }, { label: 'logBASE(', fn: () => this.calcKey('logab') }, { label: '<sup>3</sup>√(', fn: () => this.calcKey('cbrt') }, { label: '<sup>x</sup>√(', fn: () => this.calcKey('nroot') }, { label: 'd/dx(', fn: () => this.calcKey('deriv') }, { label: '∫(', fn: () => this.calcKey('integ') }, { label: 'Σ(', fn: () => this.calcKey('sigma') }, { label: 'abs(', fn: () => this.calcKey('abs') }, { label: 'round(', fn: () => this.calcKey('round') }, { label: 'iPart(', fn: () => this.calcKey('int') }, { label: 'gcd(', fn: () => this.calcKey('gcd') }, { label: 'lcm(', fn: () => this.calcKey('lcm') }, { label: 'remainder(', fn: () => this.calcKey('mod') }, { label: '▶n/d◀▶Un/d', fn: () => this.calcKey('mixedtoggle') }, { label: 'f◀▶d', fn: () => this.calcKey('fd') }], { cols: 1, per: this.cfg.lines >= 4 ? 4 : 3 });
    }
    baseNMenu() { return this.menu('BASE', [{ label: 'DEC', fn: () => this.base = 10 }, { label: 'HEX', fn: () => this.base = 16 }, { label: 'BIN', fn: () => this.base = 2 }, { label: 'OCT', fn: () => this.base = 8 }, { label: 'and/or/xor…', fn: () => this.calcKey('basemenu') }], { cols: 2 }); }

    // ---- CALC / SOLVE ----
    varsIn(src) { const s = new Set(); src.replace(/(?<![A-Za-z_])([A-FMXY])(?![A-Za-z_])/g, (m, v) => { s.add(v); return m; }); return [...s]; }
    doCalc() {
      if (this.ed.empty) return true; this.res = null;
      const src = this.source(); const vs = this.varsIn(src);
      const run = (vals) => { vs.forEach((v, i) => this.vars[v] = vals[i]); this.pop(); const s = src.includes('=') ? src.split('=')[0] : src; const v = E.evaluate(s.includes('=') ? s : s, this.env()); this.ans = v; this.res = { value: v, tokens: this.ed.t.slice(), exactOK: this.natural, hint: { sqrt: true } }; };
      if (!vs.length) return this.execute();
      this.push(new FormScreen(this, '', vs.map(v => ({ label: v + '?', value: this.vars[v] || 0 })), run));
      return true;
    }
    doSolve() {
      if (this.ed.empty) return true; this.res = null;
      const src = this.source(); let f;
      const parts = src.split('='); const L = parts[0], R = parts[1] || '0';
      const solveVar = this.varsIn(src).includes('X') ? 'X' : (this.varsIn(src)[0] || 'X');
      const others = this.varsIn(src).filter(v => v !== solveVar);
      const go = (vals) => {
        others.forEach((v, i) => this.vars[v] = vals[i]);
        const guess = vals[others.length]; this.pop();
        const astL = E.parse(L, { implicitHigh: this.cfg.implicitHigh }), astR = E.parse(R, { implicitHigh: this.cfg.implicitHigh });
        const env = this.env();
        f = (x) => { env.vars[solveVar] = x; const a = E.evalNode(astL, env), b = E.evalNode(astR, env); return a - b; };
        const x = E.solve(f, guess); this.vars[solveVar] = x; const lr = E.round15(f(x));
        this.push(new ResultScreen(this, '', [[solveVar + '=', x], ['L−R=', Math.abs(lr) < 1e-14 ? 0 : lr]], { per: Math.min(3, this.cfg.formPer) }));
        this.ans = x;
      };
      this.push(new FormScreen(this, 'Solve for ' + solveVar, others.map(v => ({ label: v + '?', value: this.vars[v] || 0 })).concat([{ label: solveVar + '? (guess)', value: this.vars[solveVar] || 0 }]), go));
      return true;
    }
    // ---- STAT ----
    statTypeMenu() {
      const T = [['1-VAR', '1var'], ['A+BX', 'lin'], ['_+CX²', 'quad'], ['ln X', 'log'], ['e^X', 'exp'], ['A•B^X', 'abx'], ['A•X^B', 'pow'], ['1/X', 'inv']];
      return this.menu('', T.map(([l, t]) => ({ label: l, fn: () => { this.statType = t; this.statEditor(); } })));
    }
    statEditor() {
      const two = this.statType !== '1var';
      this.push(new GridScreen(this, '', two ? ['X', 'Y'] : ['X'], this.stat, { growable: true, onChange: (rows) => { this.stat = rows.filter(r => r[0] != null); }, fillRow: (j) => j === 1 ? 0 : 0, onClose: () => {}, extra: (a) => { if (a === 'statmenu' || a === 'optn') { this.statMenu(); return true; } return false; } }));
      return true;
    }
    statResults() {
      const rows = this.stat.filter(r => r[0] != null); if (!rows.length) throw new E.CalcError('Math ERROR');
      const xs = rows.map(r => r[0]); const two = this.statType !== '1var'; const ys = two ? rows.map(r => r[1] || 0) : null;
      const s = E.stats(xs, ys); const L = [['n', s.n], ['x̄', s.mean], ['Σx', s.Σx], ['Σx²', s.Σx2], ['σx', s.σx], ['sx', s.sx], ['minX', s.min], ['Q1', s.Q1], ['med', s.med], ['Q3', s.Q3], ['maxX', s.max]];
      if (two) {
        L.push(['ȳ', s.ymean], ['Σy', s.Σy], ['Σy²', s.Σy2], ['Σxy', s.Σxy], ['σy', s.σy], ['sy', s.sy]);
        const rg = E.regression(this.statType, xs, ys); L.push(['Reg', rg.label], ['a', rg.a], ['b', rg.b]); if (rg.c != null) L.push(['c', rg.c]); if (rg.r != null) L.push(['r', rg.r]);
        this.lastReg = rg;
      }
      Object.assign(this.vars, { X: this.vars.X });
      this.push(new ResultScreen(this, 'STAT', L.map(([l, v]) => [l + '=', typeof v === 'number' && isNaN(v) ? 'ERROR' : v]), { per: this.cfg.lines >= 4 ? 4 : 2 }));
      return true;
    }
    statMenu() {
      const items = [{ label: 'Type', fn: () => this.statTypeMenu() }, { label: 'Data', fn: () => this.statEditor() }, { label: 'Results', fn: () => this.statResults() }];
      if (this.lastReg) items.push({ label: 'ŷ estimate', fn: () => this.push(new FormScreen(this, 'ŷ', [{ label: 'x=', value: 0 }], (v) => { this.pop(); const y = this.lastReg.f(v[0], this.lastReg); this.push(new ResultScreen(this, '', [['ŷ=', E.round15(y)]])); })) });
      items.push({ label: 'Distribution', fn: () => this.distMenu() });
      return this.menu('STAT', items, { cols: 1, per: this.cfg.lines >= 4 ? 4 : 3 });
    }
    distMenu() {
      const R = (L) => this.push(new ResultScreen(this, '', L));
      const D = [
        ['Normal PD', [['x', 0], ['σ', 1], ['μ', 0]], (v) => R([['p=', E.round15(Math.exp(-((v[0] - v[2]) ** 2) / (2 * v[1] ** 2)) / (v[1] * Math.sqrt(2 * Math.PI)))]])],
        ['Normal CD', [['Lower', -1], ['Upper', 1], ['σ', 1], ['μ', 0]], (v) => R([['p=', E.round15(normCdf(v[0], v[1], v[3], v[2]))]])],
        ['Inverse Normal', [['Area', 0.5], ['σ', 1], ['μ', 0]], (v) => R([['xInv=', E.round15(invNorm(v[0], v[2], v[1]))]])],
        ['Binomial PD', [['x', 0], ['N', 10], ['p', 0.5]], (v) => R([['p=', E.round15(binPD(v[0], v[1], v[2]))]])],
        ['Binomial CD', [['x', 0], ['N', 10], ['p', 0.5]], (v) => { let s = 0; for (let k = 0; k <= v[0]; k++) s += binPD(k, v[1], v[2]); R([['P=', E.round15(s)]]); }],
        ['Poisson PD', [['x', 0], ['λ', 1]], (v) => R([['p=', E.round15(poiPD(v[0], v[1]))]])],
        ['Poisson CD', [['x', 0], ['λ', 1]], (v) => { let s = 0; for (let k = 0; k <= v[0]; k++) s += poiPD(k, v[1]); R([['P=', E.round15(s)]]); }],
      ];
      return this.menu('DIST', D.map(([l, f, fn]) => ({ label: l, fn: () => this.push(new FormScreen(this, l, f.map(([n, v]) => ({ label: n, value: v })), (vals) => { this.pop(); fn(vals); })) })), { cols: 1, per: this.cfg.lines >= 4 ? 4 : 3 });
    }
    // ---- EQN ----
    eqnMenu(which) {
      const sys = (n) => { const names = 'abcd'.slice(0, n) + 'd'; const fields = []; for (let r = 1; r <= n; r++) for (let c = 0; c <= n; c++) fields.push({ label: (c < n ? 'abcd'[c] : (n === 2 ? 'c' : 'd')).replace(/./, m => c === n ? (n === 2 ? 'c' : 'd') : m) + '<sub>' + r + '</sub>', value: 0 }); if (n === 2) fields.forEach((f, i) => f.label = ['a', 'b', 'c'][i % 3] + '<sub>' + (Math.floor(i / 3) + 1) + '</sub>'); if (n === 3) fields.forEach((f, i) => f.label = ['a', 'b', 'c', 'd'][i % 4] + '<sub>' + (Math.floor(i / 4) + 1) + '</sub>'); if (n === 4) fields.forEach((f, i) => f.label = ['a', 'b', 'c', 'd', 'e'][i % 5] + '<sub>' + (Math.floor(i / 5) + 1) + '</sub>');
        this.push(new FormScreen(this, `Simul ${n} unknowns`, fields, (v) => { const A = [], b = []; for (let r = 0; r < n; r++) { A.push(v.slice(r * (n + 1), r * (n + 1) + n)); b.push(v[r * (n + 1) + n]); } const x = E.solveLinear(A, b); this.push(new ResultScreen(this, '', x.map((xi, i) => ['xyzt'[i] + '=', xi]), { exact: true })); }, { per: this.cfg.formPer, solveAnywhere: false })); };
      const poly = (n) => { const fields = []; for (let i = 0; i <= n; i++) fields.push({ label: 'abcde'[i] + (i < n ? (n - i > 1 ? 'x<sup>' + (n - i) + '</sup>' : 'x') : ''), value: i === 0 ? 1 : 0 }); this.push(new FormScreen(this, `Polynomial deg ${n}`, fields, (v) => { const r = E.polyRoots(v); const L = r.map((x, i) => ['x<sub>' + (i + 1) + '</sub>=', x]); if (n === 2 && v[0]) { const xm = -v[1] / (2 * v[0]); L.push(['x-Min/Max=', E.round15(xm)], ['y-Min/Max=', E.round15(v[0] * xm * xm + v[1] * xm + v[2])]); } this.push(new ResultScreen(this, '', L, { exact: true })); })); };
      const items = [];
      if (which !== 'poly') items.push({ label: this.cfg.family === 'es' ? 'anX+bnY=cn' : 'Simul 2 unknowns', fn: () => sys(2) }, { label: this.cfg.family === 'es' ? 'anX+bnY+cnZ=dn' : 'Simul 3 unknowns', fn: () => sys(3) });
      if (which !== 'poly' && this.cfg.family !== 'es') items.push({ label: 'Simul 4 unknowns', fn: () => sys(4) });
      if (which !== 'sys') items.push({ label: this.cfg.family === 'es' ? 'aX²+bX+c=0' : 'Polynomial deg 2', fn: () => poly(2) }, { label: this.cfg.family === 'es' ? 'aX³+bX²+cX+d=0' : 'Polynomial deg 3', fn: () => poly(3) });
      if (which !== 'sys' && this.cfg.family !== 'es') items.push({ label: 'Polynomial deg 4', fn: () => poly(4) });
      return this.menu('', items, { cols: 1, per: this.cfg.lines >= 4 ? 4 : 2 });
    }
    // ---- TABLE ----
    tableStart() {
      const app = this; const ed = new U.Editor(); if (this.tableFn) ed.fromTokens(this.tableFn.tokens);
      this.push(new ExprEntryScreen(this, '<i>f</i>(<i>x</i>)=', ed, (tokens, src) => {
        app.pop(); const ast = E.parse(src, { implicitHigh: app.cfg.implicitHigh }); app.tableFn = { tokens, ast };
        app.push(new FormScreen(app, 'Table Range', [{ label: 'Start', value: app.tblS != null ? app.tblS : 1 }, { label: 'End', value: app.tblE != null ? app.tblE : 5 }, { label: 'Step', value: app.tblD != null ? app.tblD : 1 }], (v) => {
          app.pop(); const [s, e, d] = v; app.tblS = s; app.tblE = e; app.tblD = d; if (!(d > 0) || e < s || (e - s) / d > 199) throw new E.CalcError('Range ERROR');
          const rows = []; const env = app.env();
          for (let x = s, i = 0; x <= e + 1e-12 && i < 200; i++, x = E.round15(s + i * d)) { env.vars.X = x; let y; try { y = E.round15(E.evalNode(ast, env)); } catch (er) { y = 'ERROR'; } rows.push([x, typeof y === 'number' ? y : null]); }
          app.push(new GridScreen(app, '', ['X', 'F(X)'], rows, { readonly: true }));
        }));
      }));
      return true;
    }
    // ---- MATRIX / VECTOR ----
    matMenu(fromMode) {
      const edit = (nm) => this.dimMenu(nm, false);
      const items = [{ label: 'Define/Dim', fn: () => this.menu('Define', ['MatA', 'MatB', 'MatC'].map(n => ({ label: n, fn: () => edit(n) }))) }, { label: 'Edit Data', fn: () => this.menu('Edit', ['MatA', 'MatB', 'MatC'].map(n => ({ label: n, fn: () => this.matData(n) }))) },
        { label: 'MatA', fn: () => this.insert({ d: 'MatA', s: 'MatA' }) }, { label: 'MatB', fn: () => this.insert({ d: 'MatB', s: 'MatB' }) }, { label: 'MatC', fn: () => this.insert({ d: 'MatC', s: 'MatC' }) }, { label: 'MatAns', fn: () => this.insert({ d: 'MatAns', s: 'MatAns' }) },
        { label: 'det', fn: () => this.calcKey('det') }, { label: 'Trn', fn: () => this.calcKey('trn') }, { label: 'Identity', fn: () => this.calcKey('idt') }];
      return this.menu('MATRIX', items, { cols: 2 });
    }
    vctMenu() {
      const items = [{ label: 'Define/Dim', fn: () => this.menu('Define', ['VctA', 'VctB', 'VctC'].map(n => ({ label: n, fn: () => this.dimMenu(n, true) }))) }, { label: 'Edit Data', fn: () => this.menu('Edit', ['VctA', 'VctB', 'VctC'].map(n => ({ label: n, fn: () => this.matData(n, true) }))) },
        { label: 'VctA', fn: () => this.insert({ d: 'VctA', s: 'VctA' }) }, { label: 'VctB', fn: () => this.insert({ d: 'VctB', s: 'VctB' }) }, { label: 'VctC', fn: () => this.insert({ d: 'VctC', s: 'VctC' }) }, { label: 'VctAns', fn: () => this.insert({ d: 'VctAns', s: 'Ans' }) },
        { label: 'Dot', fn: () => this.calcKey('dotp') }, { label: 'Cross', fn: () => this.calcKey('cross') }, { label: 'Angle', fn: () => this.insert({ d: 'Angle(', s: 'angle(' }) }, { label: 'UnitV', fn: () => this.insert({ d: 'UnitV(', s: 'unitv(' }) }];
      return this.menu('VECTOR', items, { cols: 2 });
    }
    dimMenu(nm, vec) {
      const opts = vec ? [[3, 1], [2, 1]] : [[3, 3], [3, 2], [3, 1], [2, 3], [2, 2], [2, 1], [1, 3], [1, 2]];
      return this.menu(nm + ' (m×n)', opts.map(([m, n]) => ({ label: vec ? `${m}` : `${m}×${n}`, fn: () => { const z = []; for (let i = 0; i < m; i++) { const r = []; for (let j = 0; j < (vec ? 1 : n); j++) r.push(0); z.push(r); } (vec ? this.vcts : this.mats)[nm] = vec ? M.matrix(z.map(r => r[0])) : M.matrix(z); this.matData(nm, vec); } })), { cols: vec ? 2 : 4 });
    }
    matData(nm, vec) {
      const store = vec ? this.vcts : this.mats; const m = store[nm]; if (!m) return this.dimMenu(nm, vec);
      let arr = m.valueOf(); if (vec) arr = arr.map(x => [x]);
      const rows = arr.map(r => r.slice());
      this.push(new GridScreen(this, nm, rows[0].map((_, j) => String(j + 1)), rows, { onChange: (rs) => { store[nm] = vec ? M.matrix(rs.map(r => r[0])) : M.matrix(rs.map(r => r.slice())); } }));
      return true;
    }

    // ---------- rendering ----------
    indicators() {
      const I = []; if (this.shift) I.push('S'); if (this.alpha) I.push('A'); if (this.vars.M) I.push('M'); if (this.sto) I.push('STO'); if (this.rcl) I.push('RCL'); if (this.hyp) I.push('hyp');
      if (this.mode === 'STAT') I.push('STAT'); if (this.mode === 'CMPLX') I.push('CMPLX'); if (this.mode === 'MATRIX') I.push('MAT'); if (this.mode === 'VECTOR') I.push('VCT');
      if (this.mode === 'BASE') I.push({ 16: 'Hex', 10: 'Dec', 8: 'Oct', 2: 'Bin' }[this.base]);
      I.push({ deg: 'D', rad: 'R', grad: 'G' }[this.angle]);
      if (this.fmt.mode === 'fix') I.push('FIX'); if (this.fmt.mode === 'sci') I.push('SCI');
      if (this.natural && this.cfg.showMath !== false) I.push('Math'); if (!this.ed.insert) I.push('OVR');
      if (this.shift) I.push('2nd'); if (this.hyp) I.push('HYP'); if (this.mode === 'STAT') I.push('STAT');
      I.push({ deg: 'DEG', rad: 'RAD', grad: 'GRAD' }[this.angle]);
      if (this.mode === 'BASE') I.push({ 16: 'HEX', 10: 'DEC', 8: 'OCT', 2: 'BIN' }[this.base]);
      return I;
    }
    renderIndicators() {
      const I = this.indicators(); const all = this.cfg.indicatorSet || ['S', 'A', 'M', 'STO', 'RCL', 'STAT', 'CMPLX', 'MAT', 'VCT', 'hyp', 'Hex', 'Dec', 'Oct', 'Bin', 'D', 'R', 'G', 'FIX', 'SCI', 'Math', 'OVR'];
      return '<div class="ind">' + all.map(x => `<span class="${I.includes(x) ? 'on' : 'off'}">${x}</span>`).join('') + '</div>';
    }
    resultHTML() {
      const r = this.res; let v = r.value;
      if (r.label && r.label.endsWith('=') && !r.tokens) {}
      const o = { fmt: this.fmt, exact: r.exactOK && !this.displayDec && this.mode !== 'BASE', hint: r.hint, mixed: this.mixedOut || this.cfg.mixedDefault, polar: this.polar, angle: this.angle, eStyle: this.cfg.eStyle, linearFrac: !this.natural };
      if (this.mode === 'BASE' && E.isNum(v)) return E.toBase(v, this.base) + (this.cfg.baseSuffix ? `<sub>${{ 16: 'h', 10: 'd', 8: 'o', 2: 'b' }[this.base]}</sub>` : '');
      if (r.dms && E.isNum(v)) return E.toDMS(v).str;
      if (r.eng && E.isNum(v) && v !== 0) {
        const f = E.formatNumber(v, { mode: 'eng', digits: this.cfg.digits }); let e = f.exp - 3 * (r.eng - 1); let m = v / Math.pow(10, e);
        let ms = E.trimZeros(parseFloat(Math.abs(m).toPrecision(this.cfg.digits)).toFixed(Math.max(0, this.cfg.digits - String(Math.floor(Math.abs(m))).length)));
        return (v < 0 ? '−' : '') + ms + (this.cfg.eStyle === 'E' ? `<span class="ee">E</span>${String(e).replace('-', '−')}` : `×10<sup>${String(e).replace('-', '−')}</sup>`);
      }
      if (!this.natural && E.isNum(v) && !this.displayDec && r.exactOK === undefined) {}
      if (!this.natural && E.isNum(v) && this.displayDec === false && this.res.fracLinear) {}
      return U.valueHTML(v, o);
    }
    renderCalc() {
      if (!this.on) return '';
      const nat = this.natural; let html = this.renderIndicators();
      const cursor = (this.res || this.err) ? -1 : this.ed.c;
      const inHTML = nat ? U.renderNatural(this.ed.t, cursor) : U.renderNatural(this.ed.t.map(x => x.tpl ? x : x), cursor);
      let lines = '';
      if (this.err) {
        lines = `<div class="errbox"><div class="et">${this.err}</div><div class="eh">[AC] :Cancel<br>[◀][▶]:Goto</div></div>`;
      } else {
        if (this.cfg.history && this.cfg.lines >= 4) {
          const prev = this.hist.slice(this.res ? -3 : -2, this.res ? -1 : undefined).slice(-(this.cfg.lines >= 4 ? 1 : 0));
          lines += prev.map(h => `<div class="hin">${U.renderNatural(h.tokens, -1)}</div><div class="hout">${U.valueHTML(h.value, { fmt: this.fmt, exact: this.natural, hint: { sqrt: 1 }, eStyle: this.cfg.eStyle })}</div>`).join('');
        }
        lines += `<div class="in ${nat ? 'nat' : 'lin'}">${inHTML || (cursor >= 0 ? '' : '')}</div>`;
        if (this.res) lines += `<div class="out">${this.res.label && !this.res.label.endsWith('=') ? `<span class="olab">${this.res.label}</span>` : ''}${this.res.label && this.res.label.endsWith('=') ? this.res.label : ''}${this.resultHTML()}</div>`;
        else lines += `<div class="out"></div>`;
      }
      return html + `<div class="lines">${lines}</div>`;
    }
    render() {
      const top = this.top; let html;
      if (top instanceof CalcScreen) html = this.renderCalc();
      else html = this.renderIndicators() + `<div class="lines sub">${top.render()}</div>` + (this.err ? `<div class="toast">${this.err}</div>` : '');
      this.el.innerHTML = html;
      if (this.err && !(top instanceof CalcScreen)) this.err = null;
      const inl = this.el.querySelector('.in'); if (inl && inl.scrollWidth > inl.clientWidth) { const c = inl.querySelector('.cur'); inl.scrollLeft = c ? c.offsetLeft - inl.clientWidth + 20 : inl.scrollWidth; }
      if (this.afterRender) this.afterRender();
    }
  }

  // Expression entry sub-screen (for f(x)= etc.), reusing the editor
  class ExprEntryScreen {
    constructor(app, prompt, ed, onDone) { this.app = app; this.prompt = prompt; this.ed = ed; this.onDone = onDone; }
    render() { return `<div class="form"><div class="in nat">${this.prompt}${U.renderNatural(this.ed.t, this.ed.c)}</div></div>`; }
    handle(a) {
      const app = this.app;
      if (['exe', 'enter', 'ok'].includes(a)) { const saved = app.ed; app.ed = this.ed; let src; try { src = app.source(); } finally { app.ed = saved; } if (!src) return true; this.onDone(this.ed.t.slice(), src); return true; }
      if (['ac', 'esc', 'quit', 'exit', 'back', 'on'].includes(a)) { if (!this.ed.empty && a === 'ac') { this.ed.clear(); return true; } app.pop(); return true; }
      if (a === 'del' || a === 'bksp') { this.ed.del(); return true; }
      if (a === 'left') { this.ed.left(); return true; } if (a === 'right') { this.ed.right(); return true; }
      if (a === 'up' || a === 'down') { this.ed.vert(a === 'up' ? -1 : 1); return true; }
      const tp = app.natural ? app.tplFor(a) : null;
      if (tp) { if (tp === 'cbrt') { this.ed.tpl('nroot'); this.ed.put({ d: '3', s: '3' }); this.ed.c++; } else this.ed.tpl(tp); return true; }
      if (a === 'varcycle') { this.ed.put({ d: '<i>x</i>', s: 'X' }); return true; }
      const t = app.tok(a); if (t) this.ed.put(t);
      return true;
    }
  }

  G.SciApp = SciApp; G.SciScreens = { MenuScreen, FormScreen, ResultScreen, GridScreen, MsgScreen, CalcScreen, ExprEntryScreen, CONSTS, CONVS };
})(window);
