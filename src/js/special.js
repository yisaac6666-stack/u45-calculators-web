/* U-45 CALCULATORS v1.3 — "special" calculator engine (original code).
 * One shared core for the 15 calculators added in v1.3 (ids 1 4 11 19 21 25 26 28 30 36 37 39 40 42 43):
 *   SpecApp   algebraic line-entry core (expression buffer, history, menus, forms, angle/format modes)
 *   SpecRPN   stack core (classic 4-level or unlimited RPL command-line stack)
 *   SpecGraph graphing core (slot editor, window, zoom, trace, table, tools, home calculation screen)
 * The behaviour of each calculator comes from its definition in js/special-defs.js (G.SPEC_DEFS[key]). */
(function (G) {
  'use strict';
  const MJ = G.math;
  const MX = MJ.create(MJ.all, {});                       // number instance (with custom functions imported)
  const MF = MJ.create(MJ.all); MF.config({ number: 'Fraction' });   // exact fractions instance
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEG = Math.PI / 180;

  // ---------- number formatting ----------
  function trimNum(s) { return s.indexOf('e') < 0 && s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s; }
  function fmtReal(x, f) {
    f = f || { m: 'norm', d: 10 };
    if (typeof x === 'bigint') return x.toString();
    if (typeof x !== 'number') x = Number(x);
    if (!isFinite(x)) return isNaN(x) ? 'Math ERROR' : (x > 0 ? '∞' : '−∞');
    if (Math.abs(x) < 1e-13 && f.m === 'norm') x = 0;
    const ex = (s) => s.replace(/e\+?(-?\d+)$/, 'E$1');
    if (f.m === 'fix') { const a = Math.abs(x); if (a >= 1e10 || (a && a < Math.pow(10, -f.d))) return ex(x.toExponential(f.d)); return x.toFixed(f.d); }
    if (f.m === 'sci') return ex(x.toExponential(Math.max(0, f.d - 1)));
    if (f.m === 'eng') { if (x === 0) return '0'; const e3 = Math.floor(Math.log10(Math.abs(x)) / 3) * 3; const m = x / Math.pow(10, e3); return trimNum(m.toPrecision(Math.max(1, f.d))) + (e3 ? 'E' + e3 : ''); }
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e10 || a < 1e-9)) return ex(trimNum(x.toExponential(9)).replace(/\.?0+e/, 'e'));
    return trimNum(x.toPrecision(10));
  }
  function isFrac(v) { return v && typeof v === 'object' && v.isFraction; }
  function fmtFrac(fr, mixed) {
    const s = Number(fr.s) < 0 ? '−' : '', n = BigInt(fr.n), d = BigInt(fr.d);
    if (d === 1n) return s + n.toString();
    if (mixed && n > d) return s + (n / d).toString() + '⌟' + (n % d).toString() + '⌟' + d.toString();
    return s + n.toString() + '⌟' + d.toString();
  }
  function fmtAny(v, f, opt) {
    opt = opt || {};
    if (v == null) return '';
    if (typeof v === 'number' || typeof v === 'bigint') return fmtReal(v, f);
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'string') return v;
    if (isFrac(v)) return opt.dec ? fmtReal(Number(v.valueOf()), f) : fmtFrac(v, opt.mixed);
    if (v.isComplex) {
      if (Math.abs(v.im) < 1e-12 * Math.max(1, Math.abs(v.re))) return fmtReal(v.re, f);
      if (opt.polar) { const r = Math.hypot(v.re, v.im), t = Math.atan2(v.im, v.re) / (opt.deg ? DEG : 1); return fmtReal(r, f) + '∠' + fmtReal(t, f) + (opt.deg ? '°' : ''); }
      const re = Math.abs(v.re) < 1e-12 * Math.abs(v.im) ? 0 : v.re;
      const im = fmtReal(Math.abs(v.im), f); const imS = (im === '1' ? '' : im) + 'i';
      return (re ? fmtReal(re, f) + (v.im < 0 ? '−' : '+') : (v.im < 0 ? '−' : '')) + imS;
    }
    if (v.isMatrix || Array.isArray(v)) {
      const a = v.isMatrix ? v.toArray() : v;
      if (opt.html) {
        const rows = Array.isArray(a[0]) ? a : [a];
        return '<table class="sx-mat">' + rows.map(r => '<tr>' + r.map(c => '<td>' + esc(fmtAny(c, f, opt)) + '</td>').join('') + '</tr>').join('') + '</table>';
      }
      return '[' + a.map(r => Array.isArray(r) ? '[' + r.map(c => fmtAny(c, f, opt)).join(', ') + ']' : fmtAny(r, f, opt)).join(', ') + ']';
    }
    if (v.isUnit) return v.toString().replace(/(\d\.\d{6})\d+/g, '$1');
    if (v.isBigNumber) return fmtReal(v.toNumber(), f);
    if (typeof v.toString === 'function') return v.toString();
    return String(v);
  }

  // ---------- expression buffer ----------
  class Buf {
    constructor() { this.t = []; this.c = 0; }
    clear() { this.t = []; this.c = 0; }
    get empty() { return !this.t.length; }
    put(s, d) { this.t.splice(this.c, 0, { s, d: d == null ? s : d }); this.c++; }
    set(str) { this.t = [...String(str)].map(ch => ({ s: ch, d: ch })); this.c = this.t.length; }
    setToks(toks) { this.t = toks.map(x => Object.assign({}, x)); this.c = this.t.length; }
    del() { if (this.c > 0) { this.t.splice(this.c - 1, 1); this.c--; } else if (this.t.length) this.t.splice(0, 1); }
    left() { this.c = this.c > 0 ? this.c - 1 : this.t.length; }
    right() { this.c = this.c < this.t.length ? this.c + 1 : 0; }
    src() { return this.t.map(x => x.s).join(''); }
    text() { return this.t.map(x => x.d).join(''); }
    html(cur) { const a = this.t.map(x => esc(x.d)); if (cur) a.splice(this.c, 0, '<span class="cur"></span>'); return a.join('') || (cur ? '' : '&nbsp;'); }
  }

  // ---------- custom maths shared by all special calculators ----------
  const SF = G.SPEC_FUNCS = {};
  function lnGamma(z) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lnGamma(1 - z); z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); }
  function erf(x) { // Abramowitz-Stegun 7.1.26 refined with series for small |x|
    const s = Math.sign(x); x = Math.abs(x);
    if (x < 2.5) { let sum = x, term = x, n = 0; while (Math.abs(term) > 1e-17 * Math.abs(sum) && n < 200) { n++; term *= -x * x / n; sum += term / (2 * n + 1); } return s * 2 / Math.sqrt(Math.PI) * sum; }
    // continued fraction for erfc
    let f = 0; for (let k = 60; k >= 1; k--) f = k / 2 / (x + f); const erfc = Math.exp(-x * x) / Math.sqrt(Math.PI) / (x + f); return s * (1 - erfc);
  }
  const normcdf1 = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  function invNorm(p) { if (p <= 0 || p >= 1) throw new Error('Domain ERROR'); let lo = -40, hi = 40; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (normcdf1(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
  function simpson(f, a, b, n) { n = n || 400; if (n % 2) n++; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; }
  function tpdf(t, v) { return Math.exp(lnGamma((v + 1) / 2) - lnGamma(v / 2)) / Math.sqrt(v * Math.PI) * Math.pow(1 + t * t / v, -(v + 1) / 2); }
  function tcdf(a, b, v) { const A = Math.max(a, -60), B = Math.min(b, 60); if (B <= A) return 0; return simpson(t => tpdf(t, v), A, B, 4000); }
  function chi2pdf(x, k) { return x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.log(2) - lnGamma(k / 2)); }
  const C = (n, k) => { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r) === r || r > 1e15 ? r : Math.round(r); };
  Object.assign(SF, {
    erf, lnGamma, normcdf1, invNorm, simpson, tpdf, tcdf, chi2pdf, C,
    normpdf: (x, m, s) => { m = m == null ? 0 : m; s = s == null ? 1 : s; return Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI)); },
    normcdf: (a, b, m, s) => { m = m == null ? 0 : m; s = s == null ? 1 : s; return normcdf1((b - m) / s) - normcdf1((a - m) / s); },
    invnorm: (p, m, s) => (m == null ? 0 : m) + (s == null ? 1 : s) * invNorm(p),
    binompdf: (n, p, k) => C(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k),
    binomcdf: (n, p, k) => { let s = 0; for (let i = 0; i <= Math.floor(k); i++) s += C(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i); return Math.min(1, s); },
    poisspdf: (l, k) => Math.exp(-l + k * Math.log(l) - lnGamma(k + 1)),
    poisscdf: (l, k) => { let s = 0; for (let i = 0; i <= Math.floor(k); i++) s += Math.exp(-l + i * Math.log(l) - lnGamma(i + 1)); return Math.min(1, s); },
    geompdf: (p, k) => Math.pow(1 - p, k - 1) * p,
    geomcdf: (p, k) => 1 - Math.pow(1 - p, Math.floor(k)),
    expcdf: (l, x) => x < 0 ? 0 : 1 - Math.exp(-l * x),
    unifcdf: (a, b, x) => x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a),
    tcdf, tpdf,
    chi2cdf: (x, k) => x <= 0 ? 0 : Math.min(1, simpson(t => chi2pdf(t, k), 1e-12, x, 4000)),
    invt: (p, v) => { let lo = -60, hi = 60; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (tcdf(-60, m, v) < p) lo = m; else hi = m; } return (lo + hi) / 2; },
  });

  // ---------- generic form / menu helpers ----------
  // menu: {title, items:[{t, run(app)}], sel, top}
  // form: {title, fields:[[key,label,default]], vals:{}, sel, buf, done(app, vals)}
  function menuHtml(m) {
    const per = 6; const top = Math.max(0, Math.min(m.sel - 2, m.items.length - per));
    const rows = m.items.slice(top, top + per).map((it, j) => { const i = top + j; return `<div class="sx-mi${i === m.sel ? ' sel' : ''}"><b>${i < 9 ? i + 1 : i === 9 ? 0 : '·'}</b>${esc(it.t)}</div>`; }).join('');
    return `<div class="sx-menu"><div class="sx-mt">${esc(m.title)} <small>${m.sel + 1}/${m.items.length}</small></div>${rows}</div>`;
  }
  function formHtml(fm, f) {
    const per = 5; const top = Math.max(0, Math.min(fm.sel - 2, fm.fields.length - per));
    const rows = fm.fields.slice(top, top + per).map(([k, lab], j) => { const i = top + j; const cur = i === fm.sel; return `<div class="sx-fi${cur ? ' sel' : ''}"><span>${esc(lab)}=</span><b>${cur && !fm.buf.empty ? fm.buf.html(true) : esc(fmtAny(fm.vals[k], f)) + (cur ? '<span class="cur"></span>' : '')}</b></div>`; }).join('');
    return `<div class="sx-menu sx-form"><div class="sx-mt">${esc(fm.title)}</div>${rows}<div class="sx-hint">▲▼ field · type · EXE store · EXE on last = run</div></div>`;
  }

  // ---------- algebraic core ----------
  class SpecApp {
    constructor(model, screen) {
      this.model = model; this.cfg = model.cfg || {}; this.scr = screen;
      this.def = G.SPEC_DEFS[model.spec]; if (!this.def) throw new Error('Unknown special calculator ' + model.spec);
      this.MX = MX; this.MF = MF; this.SF = SF; this.fmtAny = fmtAny; this.fmtReal = fmtReal;
      this.reset();
    }
    reset() {
      this.buf = new Buf(); this.hist = []; this.hi = -1; this.ans = 0; this.vars = {}; this.shift = false; this.alpha = false;
      this.angle = this.def.angle || 'deg'; this.fmt = { m: 'norm', d: 10 }; this.res = null; this.resHtml = null; this.err = null; this.msg = null;
      this.menu = null; this.form = null; this.fresh = false; this.pend = null; this.lastAct = null; this.prevAct = null; this.info = null;
      if (this.def.init) this.def.init(this);
    }
    get label() { return this.model.name; }
    indHtml() {
      const on = [this.shift ? 'SHIFT' : '', this.alpha ? 'ALPHA' : '', this.pend ? this.pend.toUpperCase() : '', this.angle === 'deg' ? 'D' : this.angle === 'rad' ? 'R' : 'G', this.fmt.m !== 'norm' ? this.fmt.m.toUpperCase() + this.fmt.d : ''];
      const extra = this.def.ind ? this.def.ind(this) : '';
      return `<div class="sx-ind">${on.filter(Boolean).map(x => `<span>${x}</span>`).join('')}${extra ? `<span class="sx-mode">${esc(extra)}</span>` : ''}</div>`;
    }
    render() {
      if (!this.scr || typeof document === 'undefined') return;
      if (this.def.render && this.def.render(this) === true) return;
      let body;
      if (this.form) body = formHtml(this.form, this.fmt);
      else if (this.menu) body = menuHtml(this.menu);
      else if (this.info) body = `<div class="sx-info"><div class="sx-mt">${esc(this.info.title)}</div>${this.info.lines.map(l => `<div>${esc(l)}</div>`).join('')}<div class="sx-hint">AC/EXE: back</div></div>`;
      else {
        const h = this.hist.slice(-(this.def.histLines || 1)).map(e => `<div class="sx-h"><span>${esc(e.txt)}</span><b>${esc(e.out)}</b></div>`).join('');
        const out = this.err ? `<div class="sx-r sx-err">${esc(this.err)}</div>` : this.resHtml ? `<div class="sx-r sx-rh">${this.resHtml}</div>` : this.res != null ? `<div class="sx-r">${esc(this.res)}</div>` : '';
        body = `${h}<div class="sx-l">${this.buf.html(!this.fresh || this.buf.empty)}</div>${this.msg ? `<div class="sx-msg">${esc(this.msg)}</div>` : ''}${out}`;
      }
      this.scr.innerHTML = this.indHtml() + `<div class="sx-body">${body}</div>`;
    }
    press(kd) {
      let act = kd.act;
      if (this.shift && kd.s) act = kd.s[1]; else if (this.alpha && kd.a) act = kd.a[1];
      const tog = act === 'shift' || act === 'alpha';
      if (!tog) { this.shift = false; this.alpha = false; }
      this.prevAct = this.lastAct; this.lastAct = act; this.msg = null;
      try { this.exec(act, kd); } catch (e) { this.err = (e && e.message) ? shortErr(e.message) : 'Math ERROR'; this.fresh = true; }
      this.render();
    }
    // overridable per family
    exec(act, kd) {
      if (act === 'shift') { this.shift = !this.shift; this.alpha = false; return; }
      if (act === 'alpha') { this.alpha = !this.alpha; this.shift = false; return; }
      if (act === 'on' || act === 'reset') { this.reset(); return; }
      if (this.form) return this.formKey(act);
      if (this.menu) return this.menuKey(act);
      if (this.info) { if (/^(ac|exe|ok|del|exit|esc)$/.test(act)) this.info = null; return; }
      if (this.def.pre && this.def.pre(this, act, kd)) return;
      if (this.err) { this.err = null; if (/^(ac|del|left|right)$/.test(act)) { if (act === 'ac') this.buf.clear(); return; } }
      if (this.pend) { const p = this.pend; this.pend = null; if (/^var:/.test(act)) return this.memOp(p, act.slice(4)); if (act === 'ac') return; }
      const A = this.def.acts && this.def.acts[act] && !(this.def.passHome && this.view === 'home' && this.def.passHome.includes(act)) ? this.def.acts[act] : null;
      if (A) return A(this, kd);
      return this.common(act, kd);
    }
    typeTok(s, d, isOp) {
      if (this.fresh) { this.buf.clear(); if (isOp) this.buf.put('Ans', 'Ans'); this.fresh = false; this.res = null; this.resHtml = null; }
      this.buf.put(s, d);
    }
    common(act) {
      const T = (s, d, op) => this.typeTok(s, d, op);
      const m = /^d(\d)$/.exec(act); if (m) return T(m[1]);
      const map = {
        dot: ['.'], add: ['+', '+', 1], sub: ['-', '−', 1], mul: ['*', '×', 1], div: ['/', '÷', 1], pow: ['^', '^', 1], lp: ['('], rp: [')'], comma: [','],
        sq: ['^2', '²', 1], cube: ['^3', '³', 1], inv: ['^(-1)', '⁻¹', 1], fact: ['!', '!', 1], pct: ['%', '%', 1], neg: ['-', '−'], exp10: ['*10^', '×10^', 1],
        sqrt: ['sqrt(', '√('], cbrt: ['cbrt(', '∛('], pi: ['pi', 'π'], e: ['(e)', 'e'], ans: ['Ans', 'Ans'], abs: ['abs(', 'Abs('],
        sin: ['sin(', 'sin('], cos: ['cos(', 'cos('], tan: ['tan(', 'tan('], asin: ['asin(', 'sin⁻¹('], acos: ['acos(', 'cos⁻¹('], atan: ['atan(', 'tan⁻¹('],
        sinh: ['sinh(', 'sinh('], cosh: ['cosh(', 'cosh('], tanh: ['tanh(', 'tanh('],
        log: ['log10(', 'log('], ln: ['log(', 'ln('], pow10: ['10^(', '10^('], epow: ['exp(', 'e^('], ncr: [' nCr ', 'C', 1], npr: [' nPr ', 'P', 1],
        ran: ['random()', 'Ran#'], ranint: ['randomInt(', 'RanInt('], gcd: ['gcd(', 'GCD('], lcm: ['lcm(', 'LCM('], mod: [' mod ', ' mod ', 1], intg: ['fix(', 'Int('], rnd: ['round(', 'Rnd('],
      };
      if (map[act]) { const [s, d, op] = map[act]; return T(s, d, op); }
      if (act.startsWith('ins:')) { const [s, d, op] = act.slice(4).split('|'); return T(s, d == null || d === '' ? s : d, op === '1'); }
      if (act.startsWith('var:')) return T(act.slice(4));
      switch (act) {
        case 'exe': case 'eq': case 'ok': return this.execute();
        case 'ac': this.buf.clear(); this.res = null; this.resHtml = null; this.fresh = false; this.err = null; return;
        case 'del': if (this.fresh) { this.fresh = false; this.res = null; this.resHtml = null; } this.buf.del(); return;
        case 'left': this.fresh = false; this.buf.left(); return;
        case 'right': this.fresh = false; this.buf.right(); return;
        case 'up': case 'down': return this.histNav(act === 'up' ? -1 : 1);
        case 'sto': this.pend = 'sto'; return;
        case 'rcl': this.pend = 'rcl'; return;
        case 'mplus': case 'mminus': { const v = this.execute(true); const cur = this.vars.M || 0; this.vars.M = MX.add(cur, act === 'mplus' ? v : MX.unaryMinus(v)); this.msg = 'M=' + fmtAny(this.vars.M, this.fmt); return; }
        case 'drg': case 'drgcycle': this.angle = this.angle === 'deg' ? 'rad' : this.angle === 'rad' ? 'gra' : 'deg'; this.msg = 'Angle: ' + this.angle.toUpperCase(); return;
        case 'mode': case 'setup': return this.setupMenu();
        case 'clearvar': this.vars = {}; this.msg = 'Variables cleared'; return;
        case 'history': return this.showInfo('History', this.hist.map((h, i) => (i + 1) + ': ' + h.txt + ' = ' + h.out));
      }
      if (act.startsWith('msg:')) { this.msg = act.slice(4); return; }
      throw new Error('Key not used here');
    }
    memOp(p, name) {
      if (p === 'sto') { this.vars[name] = this.ansVal(); this.msg = name + '=' + fmtAny(this.vars[name], this.fmt); return; }
      if (p === 'rcl') { this.typeTok(name, name); return; }
    }
    ansVal() { return this.ans; }
    setupMenu() {
      const S = this;
      this.menu = { title: 'SETUP', sel: 0, items: [
        { t: 'Angle: Degrees', run: () => { S.angle = 'deg'; } }, { t: 'Angle: Radians', run: () => { S.angle = 'rad'; } }, { t: 'Angle: Grads', run: () => { S.angle = 'gra'; } },
        { t: 'Format: Normal', run: () => { S.fmt = { m: 'norm', d: 10 }; } },
        { t: 'Format: Fix 2', run: () => { S.fmt = { m: 'fix', d: 2 }; } }, { t: 'Format: Fix 4', run: () => { S.fmt = { m: 'fix', d: 4 }; } },
        { t: 'Format: Sci 6', run: () => { S.fmt = { m: 'sci', d: 6 }; } }, { t: 'Format: Eng 6', run: () => { S.fmt = { m: 'eng', d: 6 }; } },
        { t: 'Clear variables', run: () => { S.vars = {}; } }, { t: 'Reset calculator', run: () => S.reset() },
      ].concat(this.def.setup ? this.def.setup(this) : []) };
    }
    showInfo(title, lines) { this.info = { title, lines: lines.length ? lines : ['(empty)'] }; }
    openMenu(title, items) { this.menu = { title, items, sel: 0 }; }
    openForm(title, fields, done, vals) {
      const v = Object.assign({}, vals || {}); fields.forEach(([k, , d]) => { if (!(k in v)) v[k] = d; });
      this.form = { title, fields, vals: v, sel: 0, buf: new Buf(), done };
    }
    menuKey(act) {
      const m = this.menu; const n = m.items.length;
      if (act === 'up') { m.sel = (m.sel - 1 + n) % n; return; }
      if (act === 'down') { m.sel = (m.sel + 1) % n; return; }
      if (/^(ac|exit|esc|del|left|clx|bksp)$/.test(act) || act === m.closeAct) { this.menu = null; return; }
      let pick = -1; const d = /^d(\d)$/.exec(act); if (d) pick = d[1] === '0' ? 9 : +d[1] - 1;
      if (/^(exe|ok|eq|enter|right)$/.test(act)) pick = m.sel;
      if (pick >= 0 && pick < n) { this.menu = null; const r = m.items[pick].run(this); if (typeof r === 'string') this.msg = r; }
    }
    formKey(act) {
      const fm = this.form; const k = fm.fields[fm.sel][0];
      const store = () => { if (!fm.buf.empty) { fm.vals[k] = this.evalPlain(fm.buf.src()); fm.buf.clear(); } };
      if (act === 'up' || act === 'down') { store(); fm.sel = (fm.sel + (act === 'up' ? -1 : 1) + fm.fields.length) % fm.fields.length; return; }
      if (act === 'ac' || act === 'exit' || act === 'esc' || act === 'clx') { if (!fm.buf.empty) fm.buf.clear(); else this.form = null; return; }
      if (act === 'del' || act === 'bksp') { fm.buf.del(); return; }
      if (/^(exe|ok|eq|enter)$/.test(act)) {
        store();
        if (fm.sel < fm.fields.length - 1) { fm.sel++; return; }
        this.form = null; const r = fm.done(this, fm.vals); if (typeof r === 'string') this.msg = r; return;
      }
      const m = /^d(\d)$/.exec(act); if (m) return fm.buf.put(m[1]);
      const map = { dot: '.', sub: '-', neg: '-', chs: '-', eex: 'e', add: '+', mul: '*', div: '/', lp: '(', rp: ')', pi: 'pi', pow: '^', comma: ',', exp10: 'e' };
      if (map[act]) return fm.buf.put(map[act], act === 'sub' || act === 'neg' || act === 'chs' ? '−' : map[act] === 'pi' ? 'π' : map[act]);
      if (act.startsWith('hex:')) return fm.buf.put(act.slice(4));
    }
    evalPlain(src) { return MX.evaluate(src.replace(/π/g, 'pi')); }
    scope() {
      const S = this, ang = (x) => typeof x === 'number' ? (S.angle === 'deg' ? x * DEG : S.angle === 'gra' ? x * Math.PI / 200 : x) : x;
      const unang = (x) => typeof x === 'number' ? (S.angle === 'deg' ? x / DEG : S.angle === 'gra' ? x * 200 / Math.PI : x) : x;
      const sc = Object.assign({ Ans: this.ans, ans: this.ans }, this.vars);
      if (!this.def.radOnly) {
        ['sin', 'cos', 'tan', 'sec', 'csc', 'cot'].forEach(f => { sc[f] = (x) => { const r = MX[f](ang(x)); return typeof r === 'number' && Math.abs(r) < 1e-15 ? 0 : r; }; });
        ['asin', 'acos', 'atan'].forEach(f => { sc[f] = (x) => unang(MX[f](x)); });
        sc.atan2 = (y, x) => unang(Math.atan2(y, x));
      }
      if (this.def.scope) Object.assign(sc, this.def.scope(this));
      return sc;
    }
    prep(src) {
      let s = src;
      s = s.replace(/(\d+(?:\.\d+)?|\))\s*nCr\s*(\d+(?:\.\d+)?)/g, (m0, a, b) => `combinations(${a === ')' ? 'Ans' : a},${b})`)
           .replace(/(\d+(?:\.\d+)?)\s*nPr\s*(\d+(?:\.\d+)?)/g, 'permutations($1,$2)');
      if (this.def.prep) s = this.def.prep(this, s);
      // auto-close brackets
      let open = 0; for (const ch of s) { if (ch === '(' || ch === '[') open++; else if (ch === ')' || ch === ']') open--; }
      while (open-- > 0) s += ')';
      return s;
    }
    evaluate(src) {
      if (this.def.evaluate) return this.def.evaluate(this, src);
      return MX.evaluate(this.prep(src), this.scope());
    }
    execute(silent) {
      if (this.buf.empty) { if (this.fresh || silent) return this.ans; if (this.hist.length) { this.buf.setToks(this.hist[this.hist.length - 1].toks); } else return this.ans; }
      const src = this.buf.src(); const txt = this.buf.text();
      let v = this.evaluate(src);
      if (v && typeof v === 'object' && v.isResultSet) v = v.entries[v.entries.length - 1]; // ResultSet
      if (typeof v === 'function') throw new Error('Syntax ERROR');
      if (silent) return v;
      this.ans = v;
      const out = this.formatResult(v);
      this.res = out; this.resHtml = this.def.resHtml ? this.def.resHtml(this, v) : (v && (v.isMatrix || Array.isArray(v)) && (Array.isArray((v.isMatrix ? v.toArray() : v)[0])) ? fmtAny(v, this.fmt, { html: true }) : null);
      this.hist.push({ txt, out, toks: this.buf.t.map(x => Object.assign({}, x)) }); if (this.hist.length > 50) this.hist.shift();
      this.hi = -1; this.fresh = true;
      if (this.def.after) this.def.after(this, v);
      return v;
    }
    formatResult(v) { return this.def.format ? this.def.format(this, v) : fmtAny(v, this.fmt); }
    histNav(dir) {
      if (!this.hist.length) return;
      if (this.hi < 0) this.hi = this.hist.length;
      this.hi = Math.max(0, Math.min(this.hist.length - 1, this.hi + dir));
      const h = this.hist[this.hi]; this.buf.setToks(h.toks); this.res = h.out; this.resHtml = null; this.fresh = false;
    }
    /** helper for menus/tests: type an expression string then EXE */
    runExpr(str) { this.buf.clear(); this.fresh = false; this.buf.set(str); return this.execute(); }
  }
  function shortErr(m) {
    if (/Undefined symbol/i.test(m)) return 'Syntax ERROR';
    if (/Unexpected|Parenthesis|Value expected|Syntax/i.test(m)) return 'Syntax ERROR';
    if (/Dimension|dimension|Matrix|square/i.test(m)) return 'Dimension ERROR';
    if (/Domain|NaN|singular|Cannot/i.test(m)) return 'Math ERROR';
    return m.length > 40 ? 'Math ERROR' : m;
  }

  // ---------- RPN core ----------
  class SpecRPN {
    constructor(model, screen) {
      this.model = model; this.cfg = model.cfg || {}; this.scr = screen; this.def = G.SPEC_DEFS[model.spec];
      this.MX = MX; this.MF = MF; this.SF = SF; this.fmtAny = fmtAny; this.fmtReal = fmtReal;
      this.reset();
    }
    reset() {
      this.rpl = !!this.def.rpl; this.st = this.rpl ? [] : [this.zero(), this.zero(), this.zero(), this.zero()];
      this.cmd = ''; this.entering = false; this.lift = true; this.shift = false; this.alpha = false; this.err = null; this.msg = null;
      this.angle = this.def.angle || 'deg'; this.fmt = { m: 'norm', d: 10 }; this.lastx = this.zero(); this.undo = null; this.vars = {}; this.pend = null;
      this.menu = null; this.form = null; this.info = null; this.view = 0; this.lastAct = null; this.prevAct = null;
      if (this.def.init) this.def.init(this);
    }
    zero() { return this.def.zero ? this.def.zero() : 0; }
    get label() { return this.model.name; }
    get s() { const S = this; return { get x() { return S.num(S.X()); }, get y() { return S.num(S.st[1]); } }; }
    get stack() { return this.st; }
    num(v) { return v == null ? 0 : isFrac(v) ? Number(v.valueOf()) : typeof v === 'number' ? v : Number(v); }
    X() { if (this.rpl && this.cmd) return this.parse(this.cmd); return this.st[0] == null ? this.zero() : this.st[0]; }
    parse(str) { return this.def.parse ? this.def.parse(this, str) : Number(str.replace('−', '-').replace(/E(-?\d+)$/, 'e$1')); }
    push(v) { this.st.unshift(v); if (!this.rpl && this.st.length > 4) this.st.length = 4; }
    pop() { const v = this.st.shift(); if (!this.rpl) { while (this.st.length < 4) this.st.push(this.st.length ? this.st[this.st.length - 1] : this.zero()); } if (v === undefined) throw new Error('Too Few Arguments'); return v; }
    need(n) { if (this.rpl && this.st.length < n) throw new Error('Too Few Arguments'); }
    endEntry() {
      if (this.rpl) { if (this.cmd) { const v = this.parse(this.cmd); this.cmd = ''; this.push(v); } this.entering = false; return; }
      if (this.entering) { this.st[0] = this.parse(this.cmd); this.entering = false; this.cmd = ''; }
    }
    digit(ch) {
      if (this.rpl) { this.cmd += ch; return; }
      if (!this.entering) { if (this.lift) this.push(this.st[0]); this.cmd = ''; this.entering = true; }
      if (ch === '.' && /\.|E/.test(this.cmd)) return;
      if (ch === '.' && this.cmd === '') ch = '0.';
      this.cmd += ch; this.st[0] = this.parse(this.cmd);
    }
    snapshot() { this.undo = { st: this.st.slice(), lastx: this.lastx }; }
    unary(f) { this.endEntry(); this.need(1); this.snapshot(); const x = this.rpl ? this.st[0] : this.st[0]; this.lastx = x; const r = f(x); this.st[0] = r; this.lift = true; }
    binary(f) { this.endEntry(); this.need(2); this.snapshot(); const x = this.pop(), y = this.pop(); this.lastx = x; try { this.push(f(y, x)); } catch (e) { this.push(y); this.push(x); throw e; } this.lift = true; }
    nary(n, f) { this.endEntry(); this.need(n); this.snapshot(); const a = []; for (let i = 0; i < n; i++) a.unshift(this.pop()); this.lastx = a[n - 1]; let r; try { r = f(...a); } catch (e) { a.forEach(v => this.push(v)); throw e; } (Array.isArray(r) ? r : [r]).forEach(v => this.push(v)); this.lift = true; }
    exec(act, kd) {
      if (act === 'shift') { this.shift = !this.shift; this.alpha = false; return; }
      if (act === 'alpha') { this.alpha = !this.alpha; this.shift = false; return; }
      if (act === 'on' || act === 'reset') { this.reset(); return; }
      if (this.form) return SpecApp.prototype.formKey.call(this, act);
      if (this.menu) return SpecApp.prototype.menuKey.call(this, act);
      if (this.info) { if (/^(ac|exe|ok|del|exit|esc|enter|clx)$/.test(act)) this.info = null; return; }
      if (this.def.pre && this.def.pre(this, act, kd)) return;
      if (this.err) { this.err = null; if (/^(clx|del|ac|bksp)$/.test(act)) return; }
      if (this.pend) { const p = this.pend; this.pend = null; if (/^(var:|d\d$)/.test(act)) { const nm = act.startsWith('var:') ? act.slice(4) : 'R' + act.slice(1); this.endEntry(); if (p === 'sto') { this.vars[nm] = this.X(); this.msg = 'STO ' + nm; } else { const v = this.vars[nm] == null ? this.zero() : this.vars[nm]; if (this.rpl) this.push(v); else { if (this.lift) this.push(this.st[0]); this.st[0] = v; this.lift = true; } } return; } }
      const A = this.def.acts && this.def.acts[act]; if (A) return A(this, kd);
      const m = /^d(\d)$/.exec(act); if (m) return this.digit(m[1]);
      const S = this, M = this.def.ops || MX, b = (f) => this.binary(f), u = (f) => this.unary(f);
      const ang = (x) => this.angle === 'deg' ? x * DEG : this.angle === 'gra' ? x * Math.PI / 200 : x, una = (x) => this.angle === 'deg' ? x / DEG : this.angle === 'gra' ? x * 200 / Math.PI : x;
      const n = (v) => this.num(v);
      switch (act) {
        case 'dot': return this.digit('.');
        case 'eex': if (!this.entering && !this.cmd) this.digit('1'); if (!/E/.test(this.cmd)) { this.cmd += 'E'; } return;
        case 'chs': if ((this.entering || this.cmd) && /E/.test(this.cmd)) { this.cmd = this.cmd.replace(/E(-?)/, (m0, s) => 'E' + (s ? '' : '-')); if (!this.rpl) this.st[0] = this.parse(this.cmd); return; }
          if (this.entering || (this.rpl && this.cmd)) { this.cmd = this.cmd.startsWith('-') ? this.cmd.slice(1) : '-' + this.cmd; if (!this.rpl) this.st[0] = this.parse(this.cmd); return; }
          return u(x => M.unaryMinus ? M.unaryMinus(x) : -x);
        case 'enter':
          if (this.rpl) { if (this.cmd) this.endEntry(); else { this.need(1); this.snapshot(); this.push(this.st[0]); } this.lift = true; return; }
          this.endEntry(); this.snapshot(); this.push(this.st[0]); this.lift = false; return;
        case 'add': return b((y, x) => MX.add(y, x));
        case 'sub': return b((y, x) => MX.subtract(y, x));
        case 'mul': return b((y, x) => MX.multiply(y, x));
        case 'div': return b((y, x) => { if (n(x) === 0) throw new Error('Divide by 0'); return MX.divide(y, x); });
        case 'ypow': case 'pow': return b((y, x) => MX.pow(y, x));
        case 'sq': return u(x => MX.multiply(x, x));
        case 'sqrt': return u(x => { if (n(x) < 0) throw new Error('Domain ERROR'); return Math.sqrt(n(x)); });
        case 'inv': return u(x => { if (n(x) === 0) throw new Error('Divide by 0'); return MX.divide(isFrac(x) ? MF.fraction(1) : 1, x); });
        case 'pct': return this.rpl ? b((y, x) => n(y) * n(x) / 100) : (() => { this.endEntry(); this.snapshot(); this.lastx = this.st[0]; this.st[0] = n(this.st[1]) * n(this.st[0]) / 100; this.lift = true; })();
        case 'dpct': return b((y, x) => (n(x) - n(y)) / n(y) * 100);
        case 'ln': return u(x => { if (n(x) <= 0) throw new Error('Domain ERROR'); return Math.log(n(x)); });
        case 'log': return u(x => { if (n(x) <= 0) throw new Error('Domain ERROR'); return Math.log10(n(x)); });
        case 'epow': return u(x => Math.exp(n(x)));
        case 'pow10': return u(x => Math.pow(10, n(x)));
        case 'sin': return u(x => clean(Math.sin(ang(n(x))))); case 'cos': return u(x => clean(Math.cos(ang(n(x))))); case 'tan': return u(x => clean(Math.tan(ang(n(x)))));
        case 'asin': return u(x => una(Math.asin(n(x)))); case 'acos': return u(x => una(Math.acos(n(x)))); case 'atan': return u(x => una(Math.atan(n(x))));
        case 'pi': this.endEntry(); if (this.rpl) this.push(Math.PI); else { if (this.lift) this.push(this.st[0]); this.st[0] = Math.PI; } this.lift = true; return;
        case 'fact': return u(x => { const v = n(x); if (v < 0 || v !== Math.floor(v) || v > 170) throw new Error('Domain ERROR'); return MX.factorial(v); });
        case 'abs': return u(x => MX.abs(x));
        case 'swap': case 'xy': this.endEntry(); this.need(2); this.snapshot(); [this.st[0], this.st[1]] = [this.st[1], this.st[0]]; this.lift = true; return;
        case 'rdn': this.endEntry(); this.snapshot(); if (this.rpl) { if (this.st.length) this.st.push(this.st.shift()); } else this.st.push(this.st.shift()); this.lift = true; return;
        case 'clx': case 'del': case 'bksp':
          if (this.rpl && this.cmd) { this.cmd = act === 'clx' ? '' : this.cmd.slice(0, -1); return; }
          if (!this.rpl && this.entering && act !== 'clx') { this.cmd = this.cmd.slice(0, -1); if (this.cmd === '' || this.cmd === '-') { this.st[0] = this.zero(); this.entering = false; this.lift = false; } else this.st[0] = this.parse(this.cmd); return; }
          this.snapshot(); if (this.rpl) { if (this.st.length) this.st.shift(); } else { this.st[0] = this.zero(); this.entering = false; } this.lift = false; return;
        case 'ac': case 'clst': this.snapshot(); this.st = this.rpl ? [] : [this.zero(), this.zero(), this.zero(), this.zero()]; this.cmd = ''; this.entering = false; this.lift = true; return;
        case 'lastx': this.endEntry(); if (this.rpl) this.push(this.lastx); else { if (this.lift) this.push(this.st[0]); this.st[0] = this.lastx; } this.lift = true; return;
        case 'undo': if (this.undo) { this.st = this.undo.st; this.lastx = this.undo.lastx; this.undo = null; this.cmd = ''; this.entering = false; this.msg = 'Undone'; } return;
        case 'sto': this.pend = 'sto'; return;
        case 'rcl': this.pend = 'rcl'; return;
        case 'drg': this.angle = this.angle === 'deg' ? 'rad' : this.angle === 'rad' ? 'gra' : 'deg'; this.msg = 'Angle ' + this.angle.toUpperCase(); return;
        case 'mode': case 'setup': return SpecApp.prototype.setupMenu.call(this);
        case 'up': this.view = Math.min(this.view + 1, Math.max(0, this.st.length - 4)); return;
        case 'down': this.view = Math.max(0, this.view - 1); return;
      }
      if (act.startsWith('msg:')) { this.msg = act.slice(4); return; }
      throw new Error('Key not used here');
    }
    press(kd) { return SpecApp.prototype.press.call(this, kd); }
    showInfo(t, l) { return SpecApp.prototype.showInfo.call(this, t, l); }
    openMenu(t, i) { return SpecApp.prototype.openMenu.call(this, t, i); }
    openForm(t, f, d, v) { return SpecApp.prototype.openForm.call(this, t, f, d, v); }
    evalPlain(src) { return MX.evaluate(src); }
    fmtV(v) { return this.def.format ? this.def.format(this, v) : fmtAny(v, this.fmt); }
    render() {
      if (!this.scr || typeof document === 'undefined') return;
      const ind = `<div class="sx-ind">${[this.shift ? 'SHIFT' : '', this.alpha ? 'ALPHA' : '', this.pend ? this.pend.toUpperCase() : '', this.angle.toUpperCase(), this.fmt.m !== 'norm' ? this.fmt.m.toUpperCase() + this.fmt.d : '', this.def.ind ? this.def.ind(this) : ''].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
      let body;
      if (this.form) body = formHtml(this.form, this.fmt);
      else if (this.menu) body = menuHtml(this.menu);
      else if (this.info) body = `<div class="sx-info"><div class="sx-mt">${esc(this.info.title)}</div>${this.info.lines.map(l => `<div>${esc(l)}</div>`).join('')}<div class="sx-hint">CLx/ENTER: back</div></div>`;
      else if (this.rpl) {
        const lv = this.def.levels || 5; const rows = [];
        for (let i = lv - 1 + this.view; i >= this.view; i--) rows.push(`<div class="sx-lv"><span>${i + 1}:</span><b>${this.st[i] != null ? esc(this.fmtV(this.st[i])) : ''}</b></div>`);
        body = rows.join('') + (this.msg ? `<div class="sx-msg">${esc(this.msg)}</div>` : '') + (this.err ? `<div class="sx-err">${esc(this.err)}</div>` : '') + (this.cmd ? `<div class="sx-cmd">${esc(this.cmd.replace('-', '−'))}<span class="cur"></span></div>` : '');
      } else {
        const names = this.def.regNames || ['T', 'Z', 'Y', 'X'];
        const shown = this.def.showRegs || 4;
        const rows = [];
        for (let i = shown - 1; i >= 0; i--) {
          const val = i === 0 && this.entering ? this.cmd.replace('-', '−') + '_' : this.fmtV(this.st[i]);
          rows.push(`<div class="sx-lv${i === 0 ? ' x' : ''}"><span>${names[4 - shown + (shown - 1 - i)] || ''}</span><b>${esc(val)}</b></div>`);
        }
        body = (this.msg ? `<div class="sx-msg">${esc(this.msg)}</div>` : '') + rows.join('') + (this.err ? `<div class="sx-err">${esc(this.err)}</div>` : '');
      }
      if (this.def.footer) body += this.def.footer(this);
      this.scr.innerHTML = ind + `<div class="sx-body">${body}</div>`;
    }
  }
  function clean(v) { return Math.abs(v) < 1e-15 ? 0 : v; }

  // ---------- graphing core ----------
  const PALETTE = ['#0047FF', '#E00000', '#008A00', '#B000B0', '#FF7A00', '#00A0B0'];
  class SpecGraph extends SpecApp {
    reset() {
      super.reset();
      this.view = 'home';     // home | edit | graph | table | win
      this.win = Object.assign({ xmin: -10, xmax: 10, ymin: -10, ymax: 10, xscl: 1, yscl: 1 }, this.def.win || {});
      this.slots = (this.def.slots || []).map(s => ({ name: s.name, label: s.label, buf: (() => { const b = new Buf(); if (s.init) b.set(s.init); return b; })(), on: s.on !== false, rel: s.rel }));
      this.sel = 0; this.trace = null; this.overlay = null; this.panel = null; this.tbl = { start: 0, step: 1, row: 0 };
      this.cache = {}; this.dirty = true;
      if (this.def.ginit) this.def.ginit(this);
    }
    fn(i, vars) { // evaluate slot i at given scope vars
      const sl = this.slots[i]; if (!sl) return NaN; const src = sl.buf.src(); if (!src) return NaN;
      let c = this.cache[i]; if (!c || c.src !== src) { c = this.cache[i] = { src, code: MX.compile(this.prep(src)) }; }
      try { const v = c.code.evaluate(Object.assign(this.gscope(), vars)); return typeof v === 'number' ? v : v && v.isComplex ? (Math.abs(v.im) < 1e-12 ? v.re : NaN) : typeof v === 'boolean' ? (v ? 1 : 0) : Number(v); } catch (e) { return NaN; }
    }
    gscope() { if (!this._gs || this._gsAns !== this.ans) { this._gs = Object.assign({}, this.scope()); ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sec', 'csc', 'cot'].forEach(f => delete this._gs[f]); this._gsAns = this.ans; } return this._gs; }
    exec(act, kd) {
      if (act === 'shift' || act === 'alpha' || act === 'on' || act === 'reset' || this.form || this.menu || this.info) return super.exec(act, kd);
      if (this.err) { this.err = null; if (/^(ac|del)$/.test(act)) return; }
      const D = this.def;
      if (D.acts && D.acts[act] && !(D.passHome && this.view === 'home' && D.passHome.includes(act))) return D.acts[act](this, kd);
      switch (act) {
        case 'home': case 'quit': this.view = 'home'; this.panel = null; return;
        case 'yeq': case 'edit': this.view = 'edit'; return;
        case 'graph': this.view = 'graph'; this.trace = null; return;
        case 'trace': this.view = 'graph'; this.trace = this.trace || this.startTrace(); return;
        case 'table': this.view = 'table'; this.tbl.row = 0; return;
        case 'window': return this.openForm('WINDOW', (D.winFields || [['xmin', 'Xmin'], ['xmax', 'Xmax'], ['xscl', 'Xscl'], ['ymin', 'Ymin'], ['ymax', 'Ymax'], ['yscl', 'Yscl']]).map(([k, l]) => [k, l, this.win[k]]), (S, v) => { Object.assign(S.win, v); S.view = 'graph'; });
        case 'zin': return this.zoom(0.5);
        case 'zout': return this.zoom(2);
        case 'zstd': this.win = Object.assign({ xmin: -10, xmax: 10, ymin: -10, ymax: 10, xscl: 1, yscl: 1 }, D.win || {}); this.view = 'graph'; return;
        case 'zsq': { const W = this.dims(); const cx = (this.win.xmin + this.win.xmax) / 2, hy = (this.win.ymax - this.win.ymin) / 2, hx = hy * W.w / W.h; this.win.xmin = cx - hx; this.win.xmax = cx + hx; this.view = 'graph'; return; }
        case 'tools': if (D.tools) { this.openMenu(D.toolsTitle || 'TOOLS', D.tools(this)); } return;
      }
      if (this.view === 'home') return super.exec(act, kd);
      if (this.view === 'edit') return this.editKey(act, kd);
      if (this.view === 'graph') return this.graphKey(act, kd);
      if (this.view === 'table') return this.tableKey(act, kd);
    }
    editKey(act, kd) {
      const sl = this.slots[this.sel];
      if (act === 'up') { this.sel = (this.sel - 1 + this.slots.length) % this.slots.length; return; }
      if (act === 'down' || act === 'exe' || act === 'ok') { this.sel = (this.sel + 1) % this.slots.length; return; }
      if (act === 'left') return sl.buf.left(); if (act === 'right') return sl.buf.right();
      if (act === 'del') return sl.buf.del();
      if (act === 'ac') { sl.buf.clear(); return; }
      if (act === 'sel') { sl.on = !sl.on; return; }
      // reuse home token map: temporarily route tokens into the slot buffer
      const keep = this.buf, kf = this.fresh; this.buf = sl.buf; this.fresh = false;
      try { super.common(act, kd); } finally { this.buf = keep; this.fresh = kf; }
      this.cache = {};
    }
    graphKey(act) {
      if (this.trace && this.def.traceKey) { const r = this.def.traceKey(this, act); if (r !== undefined) return; }
      if (act === 'ac' || act === 'del') { if (this.trace) this.trace = null; else if (this.overlay) { this.overlay = null; this.panel = null; } else this.view = 'home'; return; }
      const W = this.win, dx = (W.xmax - W.xmin) / 8, dy = (W.ymax - W.ymin) / 8;
      if (!this.trace) {
        if (act === 'left') { W.xmin -= dx; W.xmax -= dx; } else if (act === 'right') { W.xmin += dx; W.xmax += dx; }
        else if (act === 'up') { W.ymin += dy; W.ymax += dy; } else if (act === 'down') { W.ymin -= dy; W.ymax -= dy; }
      }
    }
    tableKey(act) {
      const T = this.tbl;
      if (act === 'down') { T.row++; if (T.row > 5) { T.start += T.step; T.row = 5; } return; }
      if (act === 'up') { T.row--; if (T.row < 0) { T.start -= T.step; T.row = 0; } return; }
      if (act === 'ac' || act === 'del') { this.view = 'home'; return; }
      if (act === 'exe' || act === 'ok' || act === 'tblset') return this.openForm('TABLE SETUP', [['start', 'Start', T.start], ['step', 'Step', T.step]], (S, v) => { S.tbl.start = v.start; S.tbl.step = v.step || 1; S.view = 'table'; });
    }
    zoom(f) { const W = this.win, cx = (W.xmin + W.xmax) / 2, cy = (W.ymin + W.ymax) / 2; W.xmin = cx - (cx - W.xmin) * f; W.xmax = cx + (W.xmax - cx) * f; W.ymin = cy - (cy - W.ymin) * f; W.ymax = cy + (W.ymax - cy) * f; this.view = 'graph'; }
    startTrace() { return this.def.startTrace ? this.def.startTrace(this) : { i: 0, x: (this.win.xmin + this.win.xmax) / 2 }; }
    dims() { const d = this.model.display || {}; return { w: d.w || 300, h: (d.h || 200) - 16 }; }
    // world <-> pixel
    P(W, w, h) { return { X: (x) => (x - W.xmin) / (W.xmax - W.xmin) * w, Y: (y) => h - (y - W.ymin) / (W.ymax - W.ymin) * h, x: (px) => W.xmin + px / w * (W.xmax - W.xmin), y: (py) => W.ymin + (h - py) / h * (W.ymax - W.ymin), w, h }; }
    axes(g, P, W, col) {
      g.strokeStyle = col || '#bbb'; g.lineWidth = 1; g.beginPath();
      if (W.xscl > 0 && (W.xmax - W.xmin) / W.xscl < 80) for (let x = Math.ceil(W.xmin / W.xscl) * W.xscl; x <= W.xmax; x += W.xscl) { g.moveTo(P.X(x), P.Y(0) - 3); g.lineTo(P.X(x), P.Y(0) + 3); }
      if (W.yscl > 0 && (W.ymax - W.ymin) / W.yscl < 80) for (let y = Math.ceil(W.ymin / W.yscl) * W.yscl; y <= W.ymax; y += W.yscl) { g.moveTo(P.X(0) - 3, P.Y(y)); g.lineTo(P.X(0) + 3, P.Y(y)); }
      g.stroke(); g.strokeStyle = this.def.mono ? '#1d2318' : '#555'; g.beginPath(); g.moveTo(0, P.Y(0)); g.lineTo(P.w, P.Y(0)); g.moveTo(P.X(0), 0); g.lineTo(P.X(0), P.h); g.stroke();
    }
    plotY(g, P, f, col, lw) { // y = f(x) with break on jumps / NaN
      g.strokeStyle = col; g.lineWidth = lw || 1.6; g.beginPath(); let pen = false, py = 0;
      for (let px = 0; px <= P.w; px += 1) { const y = f(P.x(px)); if (!isFinite(y)) { pen = false; continue; } const Y = P.Y(y); if (pen && Math.abs(Y - py) > P.h * 2) pen = false; if (pen) g.lineTo(px, Y); else g.moveTo(px, Y); pen = true; py = Y; }
      g.stroke();
    }
    color(i) { return this.def.mono ? '#1d2318' : PALETTE[i % PALETTE.length]; }
    render() {
      if (!this.scr || typeof document === 'undefined') return;
      if (this.form || this.menu || this.info || this.view === 'home') { this.scr.classList.remove('sx-gview'); return super.render(); }
      this.scr.classList.add('sx-gview');
      const ind = this.indHtml().replace('</div>', `<span class="sx-mode">${this.view.toUpperCase()}</span></div>`);
      if (this.view === 'edit') {
        const rows = this.slots.map((s, i) => `<div class="sx-slot${i === this.sel ? ' sel' : ''}${s.on ? '' : ' off'}"><span style="color:${this.color(i)}">${esc(s.label)}</span>${s.buf.html(i === this.sel)}</div>`).join('');
        this.scr.innerHTML = ind + `<div class="sx-body sx-edit">${rows}<div class="sx-hint">${esc(this.def.editHint || '▲▼ choose · type · SEL on/off · GRAPH draw')}</div></div>`; return;
      }
      if (this.view === 'table') {
        const cols = this.def.tableCols ? this.def.tableCols(this) : [];
        const T = this.tbl; let html = '<table class="sx-tbl"><tr>' + cols.map(c => `<th>${esc(c.h)}</th>`).join('') + '</tr>';
        for (let r = 0; r < 6; r++) { const v = T.start + r * T.step; html += `<tr class="${r === T.row ? 'sel' : ''}">` + cols.map(c => `<td>${esc(fmtShort(c.f(v)))}</td>`).join('') + '</tr>'; }
        this.scr.innerHTML = ind + `<div class="sx-body">${html}</table></div>`; return;
      }
      const D = this.dims();
      this.scr.innerHTML = ind + `<canvas class="sx-cv" width="${D.w}" height="${D.h}"></canvas>` + (this.panel ? `<div class="sx-panel">${this.panel.map(l => `<div>${esc(l)}</div>`).join('')}</div>` : '') + (this.msg ? `<div class="sx-msg sx-gmsg">${esc(this.msg)}</div>` : '');
      const cv = this.scr.querySelector('canvas'); const g = cv && cv.getContext && cv.getContext('2d'); if (!g) return;
      g.fillStyle = this.def.bg || (this.def.mono ? '#a6b29a' : '#fff'); g.fillRect(0, 0, D.w, D.h);
      const P = this.P(this.win, D.w, D.h);
      try { this.def.draw(this, g, P); } catch (e) { g.fillStyle = '#c00'; g.fillText('Draw error: ' + e.message, 4, 14); }
    }
  }
  function fmtShort(v) { if (typeof v === 'string') return v; if (v == null || (typeof v === 'number' && isNaN(v))) return 'ERR'; return fmtReal(v, { m: 'norm', d: 6 }).replace(/(\.\d{6})\d+/, '$1'); }

  // numeric helpers for graph tools
  const NUM = {
    d1: (f, x, h) => { h = h || 1e-4 * Math.max(1, Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); },
    d2: (f, x, h) => { h = h || 1e-3 * Math.max(1, Math.abs(x)); return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h); },
    simpson,
    root: (f, a, b) => { let fa = f(a), fb = f(b); if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return NaN; for (let i = 0; i < 200; i++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; } } return (a + b) / 2; },
    roots: (f, a, b, n) => { n = n || 400; const out = []; let px = a, pf = f(a); for (let i = 1; i <= n; i++) { const x = a + (b - a) * i / n, fx = f(x); if (isFinite(pf) && isFinite(fx)) { if (pf === 0) out.push(px); else if (pf * fx < 0) { const r = NUM.root(f, px, x); if (isFinite(r) && Math.abs(f(r)) < 1e-6 * (1 + Math.abs(pf) + Math.abs(fx))) out.push(r); } } px = x; pf = fx; } return out.filter((r, i, A) => i === 0 || Math.abs(r - A[i - 1]) > 1e-9); },
    golden: (f, a, b, max) => { const g = (Math.sqrt(5) - 1) / 2; let c = b - g * (b - a), d = a + g * (b - a); const s = max ? -1 : 1; for (let i = 0; i < 120; i++) { if (s * f(c) < s * f(d)) b = d; else a = c; c = b - g * (b - a); d = a + g * (b - a); } return (a + b) / 2; },
  };

  G.SpecCore = { Buf, fmtAny, fmtReal, fmtFrac, fmtShort, esc, MX, MF, SF, NUM, PALETTE, menuHtml, formHtml, DEG };
  G.SpecApp = SpecApp; G.SpecRPN = SpecRPN; G.SpecGraph = SpecGraph;
})(typeof window !== 'undefined' ? window : globalThis);

/* ---- model factory shared by the v1.3 calculators ---- */
(function (G) {
  'use strict';
  G.SPEC_DEFS = G.SPEC_DEFS || {};
  G.__M5 = G.__M5 || {};
  function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, ''); }
  /** Build a calculator model from definition G.SPEC_DEFS[key]. */
  G.specModel = function (key) {
    return function (id, name) {
      const d = G.SPEC_DEFS[key]; const U = G.CalcUI;
      const K = (f, a, o) => U.k(f, a, o);
      const I = (face, src, disp, tip, o) => K(face, 'ins:' + src + '|' + (disp == null ? src : disp), Object.assign({ tip }, o || {}));
      const sp = (w, r) => Object.assign(U.sp(w), r ? { r } : {});
      const PAD = (kind, o) => Object.assign({ pad: kind }, o || {});
      const m = d.model({ K, I, sp, PAD });
      const descs = Object.assign({}, d.desc || {});
      (m.sections || []).forEach(sec => (sec.keys || []).forEach(k => {
        if (k.act && k.tip && !descs[k.act]) descs[k.act] = k.tip;
        ['s', 'a'].forEach(L => { if (k[L] && k[L][2] && !descs[k[L][1]]) descs[k[L][1]] = k[L][2]; });
        if (k.act && !descs[k.act] && /^ins:/.test(k.act)) descs[k.act] = 'Types “' + stripTags(k.face) + '”';
      }));
      return Object.assign({
        id, name, app: d.app || 'spec', spec: key, cfg: Object.assign({ style: d.style || 'alg' }, d.cfg || {}),
        specFeatures: d.features, descs, notes: d.notes || [], specFamily: d.family,
      }, m, { cls: 'spx sp-' + key + ' ' + (m.cls || ''), display: Object.assign({ kind: 'spec' }, m.display, { cls: 'sx-' + key + ' ' + ((m.display && m.display.cls) || '') }) });
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
