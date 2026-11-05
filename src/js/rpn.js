/* RPN engines: 42S-style (soft menus, 2-line dot-matrix), 35s-style (2-line), 12C-style financial (7-segment) */
(function (G) {
  'use strict';
  const E = G.CalcEngine, U = G.CalcUI, M = E.math;
  const ANG = { deg: Math.PI / 180, rad: 1, grad: Math.PI / 200 };
  const isCx = (v) => v && typeof v === 'object' && v.re !== undefined;
  const clean = (v) => { if (isCx(v)) { if (Math.abs(v.im) < 1e-15 * Math.max(1, Math.abs(v.re))) return E.round15(v.re); return M.complex(E.round15(v.re), E.round15(v.im)); } return E.round15(v); };

  class RPNApp {
    constructor(model, el) { this.model = model; this.el = el; this.cfg = Object.assign({ variant: '42s', digits: 12 }, model.cfg || {}); this.reset(); }
    reset() {
      this.s = { x: 0, y: 0, z: 0, t: 0 }; this.lastX = 0; this.lift = true; this.entry = null; this.shift = false; this.gshift = false; this.angle = 'deg';
      this.fmt = { mode: 'fix', n: this.cfg.fixDefault != null ? this.cfg.fixDefault : 4 }; this.regs = Array(20).fill(0); this.vars = {}; this.menu = null; this.menuPage = 0; this.msg = null; this.err = null; this.pending = null; this.on = true; this.polar = false; this.base = 10; this.sigma = { n: 0, sx: 0, sy: 0, sx2: 0, sy2: 0, sxy: 0 };
      if (this.initExtra) this.initExtra();
    }
    // ---- stack ----
    x() { return this.entry != null ? this.parseEntry() : this.s.x; }
    parseEntry() { const s = this.entry; if (this.base !== 10) return parseInt(s || '0', this.base) | 0; const v = parseFloat((s || '0').replace('E', 'e').replace(/e-?$/, '')); return isNaN(v) ? 0 : v; }
    finish() { if (this.entry != null) { this.s.x = this.parseEntry(); this.entry = null; this.lift = true; } }
    push(v) { const s = this.s; s.t = s.z; s.z = s.y; s.y = s.x; s.x = v; }
    chk(v) { v = clean(v); if (isCx(v)) { if (!isFinite(v.re) || !isFinite(v.im)) throw new E.CalcError('Out of Range'); return v; } if (isNaN(v)) throw new E.CalcError('Invalid Data'); if (!isFinite(v) || Math.abs(v) > 9.99999999999e499) throw new E.CalcError('Out of Range'); return v; }
    un(fn) { this.finish(); const x = this.s.x; this.lastX = x; this.s.x = this.chk(fn(x)); this.lift = true; }
    bin(fn) { this.finish(); const s = this.s; const x = s.x, y = s.y; this.lastX = x; const r = this.chk(fn(y, x)); s.x = r; s.y = s.z; s.z = s.t; this.lift = true; }
    enter() { this.finish(); this.push(this.s.x); this.lift = false; }
    digit(d) {
      if (this.entry == null) { if (this.lift) this.push(this.s.x); this.entry = ''; }
      const mant = this.entry.split('E')[0].replace(/[-.]/g, '');
      if (this.entry.includes('E')) { const ex = this.entry.split('E')[1].replace('-', ''); if (ex.length >= (this.cfg.expDigits || 3)) return; this.entry += d; return; }
      if (mant.length >= this.cfg.digits) return; this.entry += d;
    }
    // math helpers that support complex
    add(a, b) { return isCx(a) || isCx(b) ? M.add(a, b) : (Math.abs(a + b) < 1e-13 * Math.max(Math.abs(a), Math.abs(b)) ? 0 : a + b); }
    trigf(f, x) { if (isCx(x)) return M[f](x); return E.FUNCS[f]([x], { angle: this.angle }); }
    atrigf(f, x) { if (isCx(x) || ((f === 'asin' || f === 'acos') && Math.abs(x) > 1)) return M[f](x); return E.FUNCS[f]([x], { angle: this.angle }); }
    // ---- common operations (by name) ----
    op(a) {
      const s = this.s; const P = (fn) => this.un(fn), B = (fn) => this.bin(fn);
      switch (a) {
        case 'enter': this.enter(); return true;
        case 'add': B((y, x) => this.add(y, x)); return true;
        case 'sub': B((y, x) => this.add(y, isCx(x) ? M.unaryMinus(x) : -x)); return true;
        case 'mul': B((y, x) => isCx(x) || isCx(y) ? M.multiply(y, x) : y * x); return true;
        case 'div': B((y, x) => { if (!isCx(x) && x === 0) throw new E.CalcError('Divide by 0'); return isCx(x) || isCx(y) ? M.divide(y, x) : y / x; }); return true;
        case 'ypow': B((y, x) => { if (!isCx(y) && y < 0 && x !== Math.round(x)) return M.pow(M.complex(y, 0), x); return isCx(x) || isCx(y) ? M.pow(y, x) : Math.pow(y, x); }); return true;
        case 'xroot': B((y, x) => E.FUNCS.nroot([x, y], {})); return true;
        case 'inv': P(x => { if (x === 0) throw new E.CalcError('Divide by 0'); return isCx(x) ? M.divide(1, x) : 1 / x; }); return true;
        case 'sqrt': P(x => isCx(x) || x < 0 ? M.sqrt(isCx(x) ? x : M.complex(x, 0)) : Math.sqrt(x)); return true;
        case 'sq': P(x => isCx(x) ? M.multiply(x, x) : x * x); return true;
        case 'log': P(x => { if (x === 0) throw new E.CalcError('Invalid Data'); return isCx(x) || x < 0 ? M.log10(x) : Math.log10(x); }); return true;
        case 'ln': P(x => { if (x === 0) throw new E.CalcError('Invalid Data'); return isCx(x) || x < 0 ? M.log(isCx(x) ? x : M.complex(x, 0)) : Math.log(x); }); return true;
        case 'pow10': P(x => isCx(x) ? M.pow(10, x) : Math.pow(10, x)); return true;
        case 'epow': P(x => isCx(x) ? M.exp(x) : Math.exp(x)); return true;
        case 'sin': case 'cos': case 'tan': P(x => this.trigf(a, x)); return true;
        case 'asin': case 'acos': case 'atan': P(x => this.atrigf(a, x)); return true;
        case 'sinh': case 'cosh': case 'tanh': case 'asinh': case 'acosh': case 'atanh': P(x => E.FUNCS[a]([x], {})); return true;
        case 'chs':
          if (this.entry != null) { if (this.entry.includes('E')) { const [m, e] = this.entry.split('E'); this.entry = m + 'E' + (e.startsWith('-') ? e.slice(1) : '-' + e); } else this.entry = this.entry.startsWith('-') ? this.entry.slice(1) : '-' + this.entry; return true; }
          s.x = isCx(s.x) ? M.unaryMinus(s.x) : -s.x; return true;
        case 'eex': if (this.entry == null) { this.digit('1'); } if (!this.entry.includes('E')) this.entry += 'E'; return true;
        case 'dot': if (this.base !== 10) return true; if (this.entry == null) { this.digit('0'); } if (!this.entry.includes('.') && !this.entry.includes('E')) this.entry += '.'; return true;
        case 'swap': this.finish(); [s.x, s.y] = [s.y, s.x]; this.lift = true; return true;
        case 'rdn': this.finish(); [s.x, s.y, s.z, s.t] = [s.y, s.z, s.t, s.x]; this.lift = true; return true;
        case 'rup': this.finish(); [s.x, s.y, s.z, s.t] = [s.t, s.x, s.y, s.z]; this.lift = true; return true;
        case 'lastx': this.finish(); if (this.lift) this.push(this.lastX); else s.x = this.lastX; this.lift = true; return true;
        case 'bksp': if (this.entry != null) { this.entry = this.entry.slice(0, -1); if (this.entry === '' || this.entry === '-') { this.entry = null; s.x = 0; this.lift = false; } } else { s.x = 0; this.lift = false; } return true;
        case 'clx': this.entry = null; s.x = 0; this.lift = false; return true;
        case 'clst': this.entry = null; this.s = { x: 0, y: 0, z: 0, t: 0 }; return true;
        case 'pct': this.finish(); this.lastX = s.x; s.x = this.chk(s.y * s.x / 100); this.lift = true; return true;
        case 'pctch': this.finish(); if (s.y === 0) throw new E.CalcError('Divide by 0'); this.lastX = s.x; s.x = this.chk((s.x - s.y) / s.y * 100); this.lift = true; return true;
        case 'pctt': this.finish(); if (s.y === 0) throw new E.CalcError('Divide by 0'); this.lastX = s.x; s.x = this.chk(s.x / s.y * 100); this.lift = true; return true;
        case 'pi': this.finish(); if (this.lift) this.push(Math.PI); else s.x = Math.PI; this.lift = true; return true;
        case 'fact': P(x => E.FUNCS.fact([x], E.makeEnv({ factMax: 170 }))); return true;
        case 'gamma': P(x => M.gamma(x)); return true;
        case 'comb': B((y, x) => E.FUNCS.ncr([y, x])); return true;
        case 'perm': B((y, x) => E.FUNCS.npr([y, x])); return true;
        case 'ran': this.finish(); if (this.lift) this.push(Math.random()); else s.x = Math.random(); this.lift = true; return true;
        case 'abs': P(x => isCx(x) ? M.abs(x) : Math.abs(x)); return true;
        case 'ip': P(x => Math.trunc(x)); return true; case 'fp': P(x => x - Math.trunc(x)); return true;
        case 'rnd': P(x => parseFloat(this.fmtNum(x).replace(/,/g, '').replace('E', 'e'))); return true;
        case 'sign': P(x => Math.sign(x)); return true;
        case 'mod': B((y, x) => { if (x === 0) return y; return y - x * Math.floor(y / x); }); return true;
        case 'todeg': P(x => x * 180 / Math.PI); return true; case 'torad': P(x => x * Math.PI / 180); return true;
        case 'tohr': P(x => { const sg = Math.sign(x); x = Math.abs(x); const h = Math.floor(x + 1e-12); const mm = Math.floor((x - h) * 100 + 1e-9); const ss = ((x - h) * 100 - mm) * 100; return sg * (h + mm / 60 + ss / 3600); }); return true;
        case 'tohms': P(x => { const d = E.toDMS(x); return Math.sign(x) * (Math.abs(d.d) + d.m / 100 + d.s / 10000); }); return true;
        case 'topol': this.finish(); { const x = s.x, y = s.y; this.lastX = x; s.x = this.chk(Math.hypot(x, y)); s.y = this.chk(Math.atan2(y, x) / ANG[this.angle]); } return true;
        case 'torec': this.finish(); { const r = s.x, t = s.y; this.lastX = r; s.x = this.chk(r * Math.cos(t * ANG[this.angle])); s.y = this.chk(r * Math.sin(t * ANG[this.angle])); } return true;
        case 'complex': this.finish(); if (isCx(s.x)) { const z = s.x; s.x = this.polar ? E.round15(M.arg(z) / ANG[this.angle]) : E.round15(z.im); this.push(0); s.x = s.y; s.y = this.polar ? E.round15(M.abs(z)) : E.round15(z.re); [s.x, s.y] = [this.polar ? E.round15(M.arg(z) / ANG[this.angle]) : E.round15(z.im), this.polar ? E.round15(M.abs(z)) : E.round15(z.re)]; }
          else { const re = s.y, im = s.x; const z = this.polar ? M.complex({ r: re, phi: im * ANG[this.angle] }) : M.complex(re, im); s.x = clean(z); s.y = s.z; s.z = s.t; } this.lift = true; return true;
        case 'sigplus': case 'sigminus': { this.finish(); const k = a === 'sigplus' ? 1 : -1; const x = s.x, y = s.y; const g = this.sigma; g.n += k; g.sx += k * x; g.sy += k * y; g.sx2 += k * x * x; g.sy2 += k * y * y; g.sxy += k * x * y; this.lastX = x; s.x = g.n; this.lift = false; return true; }
        case 'clsig': this.sigma = { n: 0, sx: 0, sy: 0, sx2: 0, sy2: 0, sxy: 0 }; return true;
        case 'mean': this.finish(); { const g = this.sigma; if (!g.n) throw new E.CalcError('Stat Math Error'); this.push(g.sy / g.n); this.push(g.sx / g.n); s.x = E.round15(g.sx / g.n); s.y = E.round15(g.sy / g.n); } this.lift = true; return true;
        case 'sdev': this.finish(); { const g = this.sigma; if (g.n < 2) throw new E.CalcError('Stat Math Error'); const sx = Math.sqrt((g.sx2 - g.sx * g.sx / g.n) / (g.n - 1)), sy = Math.sqrt((g.sy2 - g.sy * g.sy / g.n) / (g.n - 1)); this.push(sy); this.push(sx); s.y = E.round15(sy); s.x = E.round15(sx); } this.lift = true; return true;
        case 'sum': this.finish(); this.push(this.sigma.sy); this.push(this.sigma.sx); this.lift = true; return true;
        case 'linreg': this.finish(); { const g = this.sigma; const Sxx = g.sx2 - g.sx * g.sx / g.n, Sxy = g.sxy - g.sx * g.sy / g.n, Syy = g.sy2 - g.sy * g.sy / g.n; const b = Sxy / Sxx, a0 = g.sy / g.n - b * g.sx / g.n; this.reg = { a: a0, b, r: Sxy / Math.sqrt(Sxx * Syy) }; } return true;
        case 'yhat': this.finish(); { if (!this.reg) this.op('linreg'); const r = this.reg; this.lastX = s.x; s.x = this.chk(r.a + r.b * s.x); this.push(0); [s.x, s.y] = [s.y, E.round15(r.r)]; [s.x, s.y] = [s.y, s.x]; } this.lift = true; return true;
        case 'xhat': this.finish(); { if (!this.reg) this.op('linreg'); const r = this.reg; this.lastX = s.x; s.x = this.chk((s.x - r.a) / r.b); } this.lift = true; return true;
        case 'corr': this.finish(); this.op('linreg'); this.push(E.round15(this.reg.r)); this.lift = true; return true;
        case 'slope': this.finish(); this.op('linreg'); this.push(E.round15(this.reg.b)); this.lift = true; return true;
        case 'yint': this.finish(); this.op('linreg'); this.push(E.round15(this.reg.a)); this.lift = true; return true;
        case 'deg': this.angle = 'deg'; return true; case 'rad': this.angle = 'rad'; return true; case 'grad': this.angle = 'grad'; return true;
        case 'rect': this.polar = false; return true; case 'polar': this.polar = true; return true;
        case 'and': B((y, x) => (y & x)); return true; case 'or': B((y, x) => (y | x)); return true; case 'xor': B((y, x) => (y ^ x)); return true; case 'not': P(x => ~x); return true;
        case 'hexm': this.finish(); this.base = 16; return true; case 'decm': this.finish(); this.base = 10; return true; case 'octm': this.finish(); this.base = 8; return true; case 'binm': this.finish(); this.base = 2; return true;
        case 'cube': P(x => x * x * x); return true; case 'cbrt': P(x => Math.cbrt(x)); return true;
        case 'noop': return true;
      }
      return false;
    }
    fmtNum(v, maxLen) {
      maxLen = maxLen || this.cfg.digits;
      if (isCx(v)) { if (this.polar) return this.fmtNum(M.abs(v), 8) + ' ∠' + this.fmtNum(M.arg(v) / ANG[this.angle], 8); return this.fmtNum(v.re, 8) + ' i' + this.fmtNum(v.im, 8); }
      if (this.base !== 10) return (v < 0 ? (v >>> 0) : v).toString(this.base).toUpperCase() + { 16: 'h', 8: 'o', 2: 'b' }[this.base];
      const f = this.fmt; const mode = f.mode === 'all' ? 'norm1' : f.mode;
      const r = E.formatNumber(v, { mode, n: f.n, digits: Math.min(12, maxLen) });
      let m = r.mant; if (this.cfg.dotAlways !== false && !m.includes('.')) m += '.';
      if (this.cfg.commas) { const [ip, fp] = m.split('.'); m = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + (fp || ''); }
      return m + (r.exp != null ? 'E' + r.exp : '');
    }
    entryText() { let s = this.entry; if (s === '') s = ''; return s.replace('E', 'ᴇ') + '_'; }
    press(kd) {
      let a = kd.act;
      if (this.shift && kd.s) a = kd.s[1]; else if (this.gshift && kd.g) a = kd.g[1];
      if (a === 'shift' || a === 'fshift') { this.shift = !this.shift; this.gshift = false; this.render(); return; }
      if (a === 'gshift') { this.gshift = !this.gshift; this.shift = false; this.render(); return; }
      this.shift = false; this.gshift = false; this.msg = null;
      if (!this.on && a !== 'on' && a !== 'onoff' && a !== 'exit') return;
      try {
        if (this.err) { this.err = null; if (a === 'bksp' || a === 'exit' || a === 'clx') { this.render(); return; } }
        this.handle(a, kd);
      } catch (e) { this.err = e.kind || 'Error'; this.entry = null; if (!(e instanceof E.CalcError)) console.error(e); }
      this.render();
    }
    // ---- 42S-style handle with soft menus ----
    handle(a, kd) {
      if (this.pending) { const p = this.pending; this.pending = null; return this.pendingKey(p, a, kd); }
      if (this.menu && /^m[1-6]$/.test(kd.menuKey || '') && !['shift'].includes(a)) { const items = this.menuItems(); const it = items[this.menuPage * 6 + (+kd.menuKey[1]) - 1]; if (it && it[1]) { if (typeof it[1] === 'function') it[1](); else this.handle(it[1], {}); } return; }
      const d = /^d(\d)$/.exec(a); if (d) { if (this.base === 2 && +d[1] > 1 || this.base === 8 && +d[1] > 7) return; this.digit(d[1]); return; }
      if (a.startsWith('hex:')) { if (this.base === 16) this.digit(a[4]); return; }
      if (a.startsWith('menu:')) { this.menu = a.slice(5); this.menuPage = 0; return; }
      if (a === 'exit' && !this.on) { this.on = true; return; }
      if (a === 'exit') { if (this.menu) { this.menu = this.parentMenu || null; this.parentMenu = null; return; } this.base === 10 || 0; return; }
      if (a === 'up' && this.menu) { const n = Math.ceil(this.menuItems().length / 6); this.menuPage = (this.menuPage - 1 + n) % n; return; }
      if (a === 'down' && this.menu) { const n = Math.ceil(this.menuItems().length / 6); this.menuPage = (this.menuPage + 1) % n; return; }
      if (a === 'sto' || a === 'rcl') { this.finish(); this.pending = { k: a, op: null, digits: '' }; return; }
      if (a === 'fix' || a === 'sci' || a === 'eng') { this.pending = { k: a, digits: '' }; this.menu = null; return; }
      if (a === 'all') { this.fmt = { mode: 'all' }; this.menu = null; return; }
      if (a === 'on') { this.on = true; return; } if (a === 'off') { this.on = false; return; }
      if (a === 'show') { this.finish(); this.msg = E.fmtPlain(this.s.x, { mode: 'norm1', digits: 12 }); return; }
      if (a === 'reset') { this.reset(); return; }
      if (a.startsWith('msg:')) { this.msg = a.slice(4); return; }
      if (this.op(a)) { if (this.menuCloseOnOp && this.menu === 'CONVERT') {} return; }
      if (this.extraKey) this.extraKey(a, kd);
    }
    pendingKey(p, a, kd) {
      const d = /^d(\d)$/.exec(a);
      if (p.k === 'fix' || p.k === 'sci' || p.k === 'eng') { if (d) { p.digits += d[1]; if (p.digits.length >= (this.cfg.fixDigits || 2) || +p.digits > 1) { this.fmt = { mode: p.k, n: Math.min(11, +p.digits) }; return; } this.pending = p; return; } if (a === 'enter') { this.fmt = { mode: p.k, n: +(p.digits || 0) }; } return; }
      if (p.k === 'sto' || p.k === 'rcl') {
        if (['add', 'sub', 'mul', 'div'].includes(a) && !p.op) { p.op = a; this.pending = p; return; }
        if (a === 'dot' && !p.dot) { p.dot = true; this.pending = p; return; }
        if (d) { p.digits += d[1]; if (p.digits.length < (this.cfg.regDigits || 2) && !p.dot) { this.pending = p; return; } const idx = (p.dot ? 10 : 0) + +p.digits; return this.regOp(p, idx); }
        if (a === 'enter' && p.digits) return this.regOp(p, +p.digits);
        if (kd && kd.a && /^var:/.test(kd.a[1])) return this.regOp(p, kd.a[1].slice(4));
        if (p.k === 'rcl' && kd && kd.regName) return this.regOp(p, kd.regName);
        if (kd && kd.regName) return this.regOp(p, kd.regName);
      }
    }
    regOp(p, idx) {
      const get = (i) => typeof i === 'number' ? (this.regs[i] || 0) : (this.vars[i] || 0); const set = (i, v) => { if (typeof i === 'number') this.regs[i] = v; else this.vars[i] = v; };
      if (typeof idx === 'number' && idx >= this.regs.length) throw new E.CalcError('Nonexistent');
      if (p.k === 'sto') { const x = this.s.x; if (!p.op) set(idx, x); else { const r = get(idx); set(idx, this.chk(p.op === 'add' ? r + x : p.op === 'sub' ? r - x : p.op === 'mul' ? r * x : r / x)); } this.lift = true; return; }
      const v = get(idx);
      if (!p.op) { if (this.lift) this.push(v); else this.s.x = v; this.lift = true; return; }
      this.bin((y, x) => p.op === 'add' ? x + v : p.op === 'sub' ? x - v : p.op === 'mul' ? x * v : x / v); this.s.y = this.s.x; // simplified
    }
    menuItems() {
      const g = (l, a) => [l, a];
      const MENUS = {
        TOP: [g('Σ+', 'sigplus'), g('1/x', 'inv'), g('√x', 'sqrt'), g('LOG', 'log'), g('LN', 'ln'), g('XEQ', 'noop')],
        MODES: [g('DEG', 'deg'), g('RAD', 'rad'), g('GRAD', 'grad'), g('', null), g('RECT', 'rect'), g('POLAR', 'polar')],
        DISP: [g('FIX', 'fix'), g('SCI', 'sci'), g('ENG', 'eng'), g('ALL', 'all'), g('', null), g('', null)],
        CLEAR: [g('CLΣ', 'clsig'), g('CLP', 'noop'), g('CLV', () => { this.vars = {}; }), g('CLST', 'clst'), g('CLA', 'noop'), g('CLX', 'clx'), g('CLRG', () => { this.regs.fill(0); }), g('DEL', 'noop'), g('CLKEY', 'noop'), g('CLLCD', 'noop'), g('CLMENU', 'noop'), g('CLALL', 'reset')],
        CONVERT: [g('→DEG', 'todeg'), g('→RAD', 'torad'), g('→HR', 'tohr'), g('→HMS', 'tohms'), g('→REC', 'torec'), g('→POL', 'topol'), g('IP', 'ip'), g('FP', 'fp'), g('RND', 'rnd'), g('ABS', 'abs'), g('SIGN', 'sign'), g('MOD', 'mod')],
        PROB: [g('COMB', 'comb'), g('PERM', 'perm'), g('N!', 'fact'), g('GAM', 'gamma'), g('RAN', 'ran'), g('SEED', 'noop')],
        STAT: [g('Σ+', 'sigplus'), g('SUM', 'sum'), g('MEAN', 'mean'), g('WMN', 'mean'), g('SDEV', 'sdev'), g('CFIT', () => { this.menu = 'CFIT'; this.parentMenu = 'STAT'; })],
        CFIT: [g('FCSTX', 'xhat'), g('FCSTY', 'yhat'), g('SLOPE', 'slope'), g('YINT', 'yint'), g('CORR', 'corr'), g('MODL', 'noop')],
        BASE: [g('A', 'hex:A'), g('B', 'hex:B'), g('C', 'hex:C'), g('D', 'hex:D'), g('E', 'hex:E'), g('F', 'hex:F'), g('HEXM', 'hexm'), g('DECM', 'decm'), g('OCTM', 'octm'), g('BINM', 'binm'), g('LOGIC', () => { this.menu = 'LOGIC'; this.parentMenu = 'BASE'; }), g('', null)],
        LOGIC: [g('AND', 'and'), g('OR', 'or'), g('XOR', 'xor'), g('NOT', 'not'), g('', null), g('', null)],
        COMPLEX: [g('COMPLEX', 'complex'), g('RECT', 'rect'), g('POLAR', 'polar'), g('', null), g('', null), g('', null)],
        SOLVER: [g('n/a', () => this.msg = 'Programs not available'), g('', null), g('', null), g('', null), g('', null), g('', null)],
      };
      return MENUS[this.menu] || [];
    }
    // ---- rendering ----
    render() {
      if (!this.on) { this.el.innerHTML = '<div class="dm off"></div>'; return; }
      if (this.cfg.variant === '35s') return this.render35();
      const lines = [];
      const xs = this.err ? this.err : this.msg ? this.msg : this.pending ? this.pendText() : (this.entry != null ? 'x: ' + this.entryText() : 'x: ' + this.fmtNum(this.s.x));
      let top;
      if (this.menu) { const items = this.menuItems(); const pg = items.slice(this.menuPage * 6, this.menuPage * 6 + 6); while (pg.length < 6) pg.push(['', null]); top = `<div class="smenu">${pg.map(it => `<span class="${it[0] ? '' : 'empty'}">${it[0]}</span>`).join('')}</div>`; }
      else top = `<div class="dl">y: ${this.fmtNum(this.s.y)}</div>`;
      const ann = [this.shift ? '⮣' : '', this.angle === 'rad' ? 'RAD' : this.angle === 'grad' ? 'GRAD' : '', this.menu && Math.ceil(this.menuItems().length / 6) > 1 ? '▲▼' : '', this.base !== 10 ? { 16: 'HEX', 8: 'OCT', 2: 'BIN' }[this.base] : ''].filter(Boolean);
      this.el.innerHTML = `<div class="dm two"><div class="ann">${ann.map(x => `<span>${x}</span>`).join('')}</div>` + (this.menu ? `<div class="dl">${xs}</div>${top}` : `${top}<div class="dl">${xs}</div>`) + '</div>';
      if (this.menu) { const dm = this.el.firstChild; const [l1, l2] = [dm.children[1], dm.children[2]]; dm.insertBefore(l1, null); }
    }
    pendText() { const p = this.pending; return ({ sto: 'STO ', rcl: 'RCL ', fix: 'FIX ', sci: 'SCI ', eng: 'ENG ' }[p.k]) + (p.op ? { add: '+', sub: '−', mul: '×', div: '÷' }[p.op] + ' ' : '') + (p.dot ? '.' : '') + (p.digits || '') + '_ _'.slice(0, Math.max(1, 2 - (p.digits || '').length) * 2 - 1); }
    render35() {
      const x = this.err ? this.err : this.msg ? this.msg : this.pending ? this.pendText() : this.entry != null ? this.entryText() : this.fmtNum(this.s.x);
      const y = this.menuText || this.fmtNum(this.s.y);
      const ann = ['⮢', '⮣', 'RAD', 'GRAD', 'HEX', 'OCT', 'BIN', 'RPN'].map(t => `<span class="${(t === '⮢' && this.shift) || (t === '⮣' && this.gshift) || (t === 'RAD' && this.angle === 'rad') || (t === 'GRAD' && this.angle === 'grad') || t === 'RPN' || (t === { 16: 'HEX', 8: 'OCT', 2: 'BIN' }[this.base]) ? 'on' : 'off'}">${t}</span>`).join('');
      this.el.innerHTML = `<div class="dm two s35"><div class="ann">${ann}</div><div class="dl r">${this.menuText ? this.menuText : y}</div><div class="dl r big">${x}</div></div>`;
    }
  }

  // 35s-style: menus appear as text on line 1 and are selected by number keys
  class RPN35 extends RPNApp {
    initExtra() { this.menuText = null; this.menuSel = null; this.fmt = { mode: 'fix', n: 4 }; }
    handle(a, kd) {
      if (this.menuSel) { const m = this.menuSel; const d = /^d(\d)$/.exec(a); this.menuSel = null; this.menuText = null; if (d && m[+d[1] - 1]) { const act = m[+d[1] - 1][1]; if (typeof act === 'function') act(); else super.handle(act, {}); } return; }
      const MENUS = {
        modemenu: [['1DEG', 'deg'], ['2RAD', 'rad'], ['3GRD', 'grad'], ['4ALG', () => this.msg = 'RPN mode only'], ['5RPN', 'noop']],
        dispmenu: [['1FX', 'fix'], ['2SC', 'sci'], ['3EN', 'eng'], ['4ALL', 'all']],
        clearmenu: [['1x', 'clx'], ['2VARS', () => { this.vars = {}; }], ['3ALL', 'reset'], ['4Σ', 'clsig']],
        basemenu: [['1DEC', 'decm'], ['2HEX', 'hexm'], ['3OCT', 'octm'], ['4BIN', 'binm']],
        lsmenu: [['1x̄', 'mean'], ['2ŷ', 'yhat'], ['3r', 'corr'], ['4m', 'slope'], ['5b', 'yint']],
        sumsmenu: [['1n', () => { this.finish(); this.push(this.sigma.n); }], ['2Σx', () => { this.finish(); this.push(this.sigma.sx); }], ['3Σy', () => { this.finish(); this.push(this.sigma.sy); }], ['4Σx²', () => { this.finish(); this.push(this.sigma.sx2); }]],
        sdmenu: [['1sx', 'sdev'], ['2σx', () => { this.finish(); const g = this.sigma; this.push(E.round15(Math.sqrt(g.sx2 / g.n - (g.sx / g.n) ** 2))); }]],
        convmenu: [['1→°', 'todeg'], ['2→r', 'torad'], ['3→HR', 'tohr'], ['4→HMS', 'tohms']],
        intgmenu: [['1INTG', 'ip'], ['2FP', 'fp'], ['3ABS', 'abs'], ['4RND', 'rnd'], ['5SGN', 'sign']],
        probmenu: [['1Cn,r', 'comb'], ['2Pn,r', 'perm'], ['3RAND', 'ran'], ['4n!', 'fact']],
        logicmenu: [['1AND', 'and'], ['2OR', 'or'], ['3XOR', 'xor'], ['4NOT', 'not']],
      };
      if (MENUS[a]) { this.menuSel = MENUS[a]; this.menuText = MENUS[a].map(x => x[0]).join(' '); return; }
      if (a === 'cmplxi') { this.finish(); this.op('complex'); return; }
      super.handle(a, kd);
    }
  }

  // 12C-style financial RPN
  class RPN12 extends RPNApp {
    initExtra() { this.fmt = { mode: 'fix', n: 2 }; this.cfg.digits = 10; this.cfg.dotAlways = true; this.tvm = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 }; this.beg = false; this.cfj = []; this.dmy = false; this.lastFin = null; this.prog = false; }
    fmtNum(v) {
      const f = this.fmt; let r = E.formatNumber(v, { mode: f.mode === 'all' ? 'norm1' : f.mode, n: f.n, digits: 10 });
      if (f.mode === 'fix' && r.exp == null && r.mant.replace(/[-.]/g, '').length > 10) r = E.formatNumber(v, { mode: 'sci', n: 6, digits: 10 });
      let [ip, fp] = r.mant.split('.'); ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return { main: ip + '.' + (fp || ''), exp: r.exp != null ? String(r.exp) : '' };
    }
    handle(a, kd) {
      if (this.pending) { const p = this.pending; this.pending = null; if (p.k === 'fixf') { const d = /^d(\d)$/.exec(a); if (d) this.fmt = { mode: 'fix', n: +d[1] }; else if (a === 'dot') this.fmt = { mode: 'sci', n: 6 }; return; } return this.pendingKey(Object.assign(p, {}), a, kd); }
      const T = { n: 'n', i: 'i', pv: 'PV', pmt: 'PMT', fv: 'FV' };
      if (T[a]) {
        const k = T[a];
        if (!(this.prevAct && T[this.prevAct])) { this.finish(); this.tvm[k] = this.s.x; this.lift = true; this.lastWasNumber = false; this.lastFin = k; return; }
        // compute
        const v = { N: this.tvm.n, IY: this.tvm.i, PV: this.tvm.PV, PMT: this.tvm.PMT, FV: this.tvm.FV, PY: 1, CY: 1, BGN: this.beg };
        const map = { n: 'N', i: 'IY', PV: 'PV', PMT: 'PMT', FV: 'FV' };
        this.running(); let r = E.tvmSolve(map[k], v); if (k === 'n') r = Math.ceil(r - 1e-9);
        this.tvm[k] = this.chk(r); if (this.lift) this.push(this.tvm[k]); else this.s.x = this.tvm[k]; this.lift = true; return;
      }
      this.lastWasNumber = false;
      switch (a) {
        case 'fixf': this.pending = { k: 'fixf' }; return;
        case 'n12': this.finish(); this.tvm.n = this.chk(this.s.x * 12); this.s.x = this.tvm.n; this.lift = true; return;
        case 'i12': this.finish(); this.tvm.i = this.chk(this.s.x / 12); this.s.x = this.tvm.i; this.lift = true; return;
        case 'beg': this.beg = true; return; case 'end': this.beg = false; return;
        case 'clfin': this.tvm = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 }; this.cfj = []; return;
        case 'clreg': this.regs.fill(0); this.op('clsig'); this.tvm = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 }; this.cfj = []; this.s = { x: 0, y: 0, z: 0, t: 0 }; this.entry = null; return;
        case 'clprefix': return;
        case 'clsig12': this.op('clsig'); this.s = { x: 0, y: 0, z: 0, t: 0 }; return;
        case 'cf0': this.finish(); this.cfj = [{ v: this.s.x, n: 1 }]; this.tvm.n = 0; this.lift = true; return;
        case 'cfj': this.finish(); if (!this.cfj.length) this.cfj = [{ v: 0, n: 1 }]; this.cfj.push({ v: this.s.x, n: 1 }); this.tvm.n = this.cfj.length - 1; this.lift = true; return;
        case 'nj': this.finish(); if (this.cfj.length > 1) this.cfj[this.cfj.length - 1].n = this.s.x; this.lift = true; return;
        case 'npv': this.finish(); this.running(); this.push(this.tvm.PV = this.chk(E.npv(this.tvm.i, this.cfj.length ? this.cfj : [{ v: 0, n: 1 }]))); this.lift = true; return;
        case 'irr': this.finish(); this.running(); this.push(this.tvm.i = this.chk(E.irr(this.cfj))); this.lift = true; return;
        case 'amort': { this.finish(); const k = this.s.x; const start = this.amortDone || 0; const a2 = E.amort({ N: this.tvm.n, IY: this.tvm.i, PV: this.tvm.PV, PMT: this.tvm.PMT, PY: 12, CY: 12, BGN: this.beg }, start + 1, start + k); this.amortDone = start + k;
          // 12C uses per-period i directly
          const r = this.tvm.i / 100; let bal = this.tvm.PV, prn = 0, int = 0; for (let p = 1; p <= start + k; p++) { let ik = (this.beg && p === 1) ? 0 : Math.round(bal * r * Math.pow(10, this.fmt.n)) / Math.pow(10, this.fmt.n); const pr = this.tvm.PMT + (-ik); if (p > start) { int += -ik; prn += pr; } bal += pr; }
          this.s.z = k; this.s.y = E.round15(prn); this.s.x = E.round15(int); this.tvm.PV = E.round15(bal); this.tvm.n += k; this.lift = true; void a2; return; }
        case 'int': { this.finish(); const days = this.s.x, iy = this.tvm.i, pv = this.tvm.PV; const i360 = E.round15(-pv * iy / 100 * days / 360), i365 = E.round15(-pv * iy / 100 * days / 365); this.s.z = i365; this.s.y = -pv; this.s.x = i360; this.lift = true; this.int365 = i365; return; }
        case 'ddys': { this.finish(); const d1 = this.parseDate(this.s.y), d2 = this.parseDate(this.s.x); const actual = Math.round((d2 - d1) / 86400000); const a1 = new Date(d1), b1 = new Date(d2); let D1 = Math.min(30, a1.getUTCDate()), D2 = b1.getUTCDate(); if (D2 === 31 && D1 === 30) D2 = 30; const d30 = (b1.getUTCFullYear() - a1.getUTCFullYear()) * 360 + (b1.getUTCMonth() - a1.getUTCMonth()) * 30 + D2 - D1; this.lastX = this.s.x; this.s.x = actual; this.s.y = d30; this.lift = true; return; }
        case 'date': { this.finish(); const d1 = this.parseDate(this.s.y); const r = new Date(d1 + this.s.x * 86400000); const m = r.getUTCMonth() + 1, d = r.getUTCDate(), y = r.getUTCFullYear(); const v = this.dmy ? d + m / 100 + y / 1e6 : m + d / 100 + y / 1e6; this.lastX = this.s.x; this.s.x = E.round15(v); this.s.y = this.s.z; this.s.z = this.s.t; this.msg12 = ' ' + ((r.getUTCDay() + 6) % 7 + 1); this.lift = true; return; }
        case 'dmy': this.dmy = true; return; case 'mdy': this.dmy = false; return;
        case 'sl': case 'soy': case 'db': { this.finish(); const yr = this.s.x, cost = this.tvm.PV, sal = this.tvm.FV, life = this.tvm.n, fac = this.tvm.i; let dep = 0, acc = 0, book = cost;
          for (let y = 1; y <= yr; y++) { if (a === 'sl') dep = (cost - sal) / life; else if (a === 'soy') dep = (cost - sal) * (life - y + 1) / (life * (life + 1) / 2); else dep = Math.min(book * fac / 100 / life, book - sal); acc += dep; book -= dep; }
          this.s.x = E.round15(dep); this.s.y = E.round15(cost - sal - acc); this.lift = true; return; }
        case 'price': case 'ytm': this.msg = 'Error 0'; return;
        case 'xbar': this.op('mean'); return; case 'sdev12': this.op('sdev'); return;
        case 'xw': { this.finish(); const g = this.sigma; if (!g.sx) throw new E.CalcError('Error 2'); this.push(E.round15(g.sxy / g.sx)); this.lift = true; return; }
        case 'yhatr': this.op('linreg'); { this.finish(); const r = this.reg; const x = this.s.x; this.lastX = x; this.s.x = this.chk(r.a + r.b * x); this.push(E.round15(r.r)); [this.s.x, this.s.y] = [this.s.y, this.s.x]; } return;
        case 'xhatr': this.op('linreg'); { this.finish(); const r = this.reg; const y = this.s.x; this.lastX = y; this.s.x = this.chk((y - r.a) / r.b); this.push(E.round15(r.r)); [this.s.x, this.s.y] = [this.s.y, this.s.x]; } return;
        case 'onoff': this.on = !this.on; return;
        case 'pse': case 'rs': case 'sst': case 'bst': case 'gto': case 'pr': case 'ptm': this.msg = 'Programs n/a'; return;
        case 'mem': this.msg = 'P-08 r-20'; return;
        case 'sqrt12': this.op('sqrt'); return;
        case 'rcl12': case 'sto12': this.finish(); this.pending = { k: a === 'sto12' ? 'sto' : 'rcl', digits: '' }; this.cfg.regDigits = 1; return;
      }
      super.handle(a, kd);
    }
    pendingKey(p, a, kd) {
      const T = { n: 'n', i: 'i', pv: 'PV', pmt: 'PMT', fv: 'FV' };
      if ((p.k === 'sto' || p.k === 'rcl') && T[a]) { if (p.k === 'sto') this.tvm[T[a]] = this.s.x; else { if (this.lift) this.push(this.tvm[T[a]]); else this.s.x = this.tvm[T[a]]; } this.lift = true; return; }
      return super.pendingKey(p, a, kd);
    }
    parseDate(v) { const s = Math.abs(v).toFixed(6); const [a0, r] = s.split('.'); const b0 = +r.slice(0, 2), y = +r.slice(2, 6); let m, d; if (this.dmy) { d = +a0; m = b0; } else { m = +a0; d = b0; } const t = Date.UTC(y, m - 1, d); const dt = new Date(t); if (dt.getUTCMonth() !== m - 1) throw new E.CalcError('Error 8'); return t; }
    running() { this.runFlash = Date.now(); }
    digit(d) { super.digit(d); this.lastWasNumber = true; }
    press(kd) {
      let a = kd.act; if (this.shift && kd.s) a = kd.s[1]; else if (this.gshift && kd.g) a = kd.g[1];
      if (this.shift && (/^d\d$/.test(kd.act) || kd.act === 'dot') && !this.pending) { this.shift = false; this.finish(); this.fmt = kd.act === 'dot' ? { mode: 'sci', n: 6 } : { mode: 'fix', n: +kd.act[1] }; this.prevAct = null; this.render(); return; }
      const wasPref = this.shift || this.gshift || this.pending; super.press(kd);
      if (!['fshift', 'gshift', 'shift'].includes(a)) this.prevAct = wasPref && this.pending ? null : a;
    }
    render() {
      if (!this.on) { this.el.innerHTML = '<div class="segwrap off"></div>'; return; }
      let t;
      if (this.err) t = { main: this.err.startsWith('Error') ? this.err : 'Error 0', exp: '' };
      else if (this.msg) t = { main: this.msg, exp: '' };
      else if (this.entry != null) { let s = this.entry; if (s.includes('E')) { const [m, e] = s.split('E'); t = { main: (m || '1') + (m.includes('.') ? '' : '.'), exp: e || ' ' }; } else { let [ip, fp] = (s || '0').split('.'); ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ','); t = { main: ip + (s.includes('.') ? '.' + fp : '.'), exp: '' }; } }
      else t = this.fmtNum(this.s.x);
      const ann = [['f', this.shift], ['g', this.gshift], ['BEGIN', this.beg], ['D.MY', this.dmy], ['C', false], ['PRGM', false]];
      this.el.innerHTML = `<div class="segwrap s12"><div class="segrow"><span class="segmain">${U.segSVG(t.main.replace(/ /g, ' '), 10, { commas: true })}</span>${t.exp ? `<span class="segexp">${U.segSVG(t.exp, 3)}</span>` : ''}</div><div class="ind">${ann.map(([l, on]) => `<span class="${on ? 'on' : 'off'}">${l}</span>`).join('')}</div></div>`;
    }
  }

  G.RPNApp = RPNApp; G.RPN35 = RPN35; G.RPN12 = RPN12;
})(window);
