/* Immediate-execution algebraic engine (one-line classic scientific, TI-style AOS, chain mode) + financial worksheets */
(function (G) {
  'use strict';
  const E = G.CalcEngine, U = G.CalcUI;
  const PREC = { add: 1, sub: 1, mul: 2, div: 2, pow: 3, root: 3, npr: 3, ncr: 3, r2p: 3, pr: 3, and: 0.5, or: 0.4, xor: 0.4, xnor: 0.4, pctch: 1, gcd: 3 };
  const ANG = { deg: Math.PI / 180, rad: 1, grad: Math.PI / 200 };
  const DIGITS = '0123456789ABCDEF';

  class AOSApp {
    constructor(model, el) { this.model = model; this.el = el; this.cfg = Object.assign({ digits: 10, expDigits: 2, pct: 'fxg', chain: false, fixDefault: null, maxPar: 15 }, model.cfg || {}); this.reset(); }
    reset() {
      this.entry = null; this.x = 0; this.stack = []; this.M = 0; this.angle = 'deg'; this.s2 = false; this.s3 = false; this.hyp = false; this.inv = false;
      this.fmt = this.cfg.fixDefault != null ? { mode: 'fix', n: this.cfg.fixDefault } : { mode: 'norm1' }; this.err = null; this.lastBin = null; this.justOp = false; this.mem = Array(10).fill(0);
      this.statOn = false; this.sx = []; this.sy = []; this.base = 10; this.on = true; this.fracShow = false; this.fracInput = false; this.engShift = 0; this.dmsShow = false; this.swapVal = null; this.k = false; this.stoPending = null; this.rclPending = null; this.modePending = false; this.label = null; this.ws = null; this.chain = this.cfg.chain; this.computed = false;
      if (this.initExtra) this.initExtra();
    }
    // ---- helpers ----
    val() { if (this.entry != null) return this.parseEntry(); return this.x; }
    parseEntry() {
      let s = this.entry; if (s === '' || s === '-') return 0;
      if (this.base !== 10) { const neg = s.startsWith('-'); const v = parseInt(s.replace('-', ''), this.base); return neg ? -v : v; }
      if (s.includes('⌟')) { const p = s.replace('-', '').split('⌟').map(Number); const neg = s.startsWith('-'); let v; if (p.length === 3) v = p[0] + p[1] / p[2]; else v = p[0] / p[1]; if (!isFinite(v)) throw new E.CalcError('E'); this.fracInput = true; return neg ? -v : v; }
      if (s.includes('°')) { const p = s.replace('-', '').split('°').map(x => parseFloat(x || '0')); const v = p[0] + (p[1] || 0) / 60 + (p[2] || 0) / 3600; return s.startsWith('-') ? -v : v; }
      const v = parseFloat(s.replace('E', 'e').replace(/e$/, '').replace(/e-$/, '')); return isNaN(v) ? 0 : v;
    }
    commit() { if (this.entry != null) { this.x = this.parseEntry(); this.entry = null; } }
    check(v) { if (!isFinite(v) || isNaN(v) || Math.abs(v) >= (this.cfg.max || 1e100)) { if (!isNaN(v) && E.HINT) { E.HINT.cause = 'overflow'; E.HINT.t = Date.now(); } throw new E.CalcError('E'); } return E.round15(v); }
    apply(op, a, b) {
      switch (op) {
        case 'add': return this.base !== 10 ? (a + b) | 0 : (Math.abs(a + b) < 1e-13 * Math.max(Math.abs(a), Math.abs(b)) ? 0 : a + b);
        case 'sub': return this.base !== 10 ? (a - b) | 0 : (Math.abs(a - b) < 1e-13 * Math.max(Math.abs(a), Math.abs(b)) ? 0 : a - b);
        case 'mul': return this.base !== 10 ? Math.trunc(a * b) | 0 : a * b;
        case 'div': if (b === 0) throw new E.CalcError('E'); return this.base !== 10 ? Math.trunc(a / b) | 0 : a / b;
        case 'pow': return E.evaluate('A^B', { vars: { A: a, B: b } });
        case 'root': return E.FUNCS.nroot([b, a], {});
        case 'npr': return E.FUNCS.npr([a, b]); case 'ncr': return E.FUNCS.ncr([a, b]);
        case 'and': return a & b; case 'or': return a | b; case 'xor': return a ^ b; case 'xnor': return ~(a ^ b);
        case 'r2p': { const r = Math.hypot(a, b); this.swapVal = Math.atan2(b, a) / ANG[this.angle]; return r; }
        case 'pr': { this.swapVal = a * Math.sin(b * ANG[this.angle]); return a * Math.cos(b * ANG[this.angle]); }
        case 'pctch': if (a === 0) throw new E.CalcError('E'); return (b - a) / a * 100;
        case 'gcd': return E.gcd(a, b);
      }
      throw new E.CalcError('E');
    }
    reduce(minPrec) {
      while (this.stack.length) {
        const t = this.stack[this.stack.length - 1];
        if (t.par) break;
        const p = this.chain ? 9 : PREC[t.op];
        if (p < minPrec) break;
        this.stack.pop(); this.x = this.check(this.apply(t.op, t.v, this.x));
      }
    }
    binop(op) {
      if (this.justOp && this.entry == null && this.stack.length && !this.stack[this.stack.length - 1].par) { this.stack[this.stack.length - 1].op = op; return; }
      this.commit(); const p = PREC[op];
      this.reduce(this.chain ? 0 : (op === 'pow' || op === 'root' ? p + 1 : p));
      this.stack.push({ op, v: this.x }); this.justOp = true; this.lastBin = { op, v: null };
    }
    equals() {
      this.commit();
      const top = this.stack.length ? this.stack[this.stack.length - 1] : null;
      if (!this.stack.length && this.lastBin && this.lastBin.v != null) { // repeat (constant) calc
        const lb = this.lastBin; this.x = this.check(lb.op === 'mul' || lb.op === 'add' && this.cfg.kFirst ? this.apply(lb.op, lb.v, this.x) : this.apply(lb.op, this.x, lb.v)); return;
      }
      if (top && !top.par) this.lastBin = { op: top.op, v: top.op === 'mul' && this.cfg.kFirst ? top.v : this.x };
      while (this.stack.length) { const t = this.stack.pop(); if (t.par) continue; this.x = this.check(this.apply(t.op, t.v, this.x)); }
    }
    unary(fn) { this.commit(); this.x = this.check(fn(this.x)); this.justOp = false; }
    trig(name) {
      const v = this.val(); let r;
      if (this.hyp) { r = name.startsWith('a') ? Math[name + 'h'](v) : Math[name + 'h'](v); }
      else if (name.startsWith('a')) r = E.evaluate(name + '(A)', { vars: { A: v }, angle: this.angle });
      else r = E.evaluate(name + '(A)', { vars: { A: v }, angle: this.angle });
      this.entry = null; this.x = this.check(r); this.hyp = false;
    }
    digit(d) {
      if (this.computed || this.entry == null) { this.entry = ''; this.computed = false; this.fracShow = false; this.dmsShow = false; this.engShift = 0; }
      const s = this.entry; const mant = s.split('E')[0].replace(/[-.⌟°]/g, '');
      if (s.includes('E')) { const ex = s.split('E')[1].replace('-', ''); if (ex.length >= this.cfg.expDigits) this.entry = s.replace(/E(-?)\d/, 'E$1'); this.entry += d; this.justOp = false; return; }
      if (mant.length >= this.cfg.digits) return;
      if (s === '0' || s === '-0') this.entry = s.slice(0, -1);
      this.entry += d; this.justOp = false;
    }
    // ---- key handling ----
    press(kd) {
      let a = kd.act;
      if (this.s3 && kd.t) a = kd.t[1];
      else if ((this.s2) && kd.s) a = kd.s[1];
      else if (this.statOn && kd.st) a = kd.st[1];
      if (a === 'shift' || a === '2nd') { this.s2 = !this.s2; this.s3 = false; this.render(); return; }
      if (a === '3rd') { this.s3 = !this.s3; this.s2 = false; this.render(); return; }
      const wasShift = this.s2 || this.s3; this.s2 = false; this.s3 = false;
      if (!this.on && !['on', 'onac', 'ac', 'onoff', 'onc'].includes(a)) return;
      try {
        if (this.err && !['ac', 'onac', 'on', 'onoff', 'cec', 'sac', 'onc'].includes(a)) { this.render(); return; }
        this.handle(a, kd, wasShift);
      } catch (e) { this.err = e.kind === 'Error 5' ? 'Error 5' : (this.cfg.errText || 'E'); this.stack = []; this.entry = null; if (!(e instanceof E.CalcError)) console.error(e); }
      this.render();
    }
    handle(a, kd) {
      if (this.modePending) { this.modePending = false; if (this.modeKey(a)) return; }
      if (this.stoPending) { const p = this.stoPending; this.stoPending = null; const d = /^d(\d)$/.exec(a); if (d) { this.commit(); this.mem[+d[1]] = this.x; } else if (p === 'M') { } return; }
      if (this.rclPending) { this.rclPending = null; const d = /^d(\d)$/.exec(a); if (d) { this.entry = null; this.x = this.mem[+d[1]]; this.computed = true; } return; }
      if (this.fixPending) { this.fixPending = false; const d = /^d(\d)$/.exec(a); if (d) this.fmt = { mode: 'fix', n: +d[1] }; else if (a === 'dot') this.fmt = { mode: 'norm1' }; return; }
      if (this.extraKey && this.extraKey(a, kd)) return;
      const dm = /^d(\d)$/.exec(a);
      if (dm) return this.digit(dm[1]);
      if (a.startsWith('hex:')) { if (this.base === 16) this.digit(a[4]); return; }
      switch (a) {
        case 'd00': this.digit('0'); this.digit('0'); return;
        case 'dot': if (this.base !== 10) return; if (this.computed || this.entry == null) { this.entry = '0'; this.computed = false; } if (!this.entry.includes('.') && !this.entry.includes('E')) this.entry += '.'; return;
        case 'exp': case 'ee': if (this.entry == null || this.computed) { this.entry = this.computed || this.entry == null ? (this.entry == null && this.x !== 0 && !this.justOp ? E.fmtPlain(this.x).replace(/E.*/, '') : '1') : this.entry; this.computed = false; } if (!this.entry.includes('E')) this.entry += 'E'; return;
        case 'chs': case 'pm':
          if (this.entry != null) { if (this.entry.includes('E')) { const [m, e] = this.entry.split('E'); this.entry = m + 'E' + (e.startsWith('-') ? e.slice(1) : '-' + e); } else this.entry = this.entry.startsWith('-') ? this.entry.slice(1) : '-' + this.entry; }
          else { this.x = this.base !== 10 ? (-this.x) | 0 : -this.x; } return;
        case 'add': case 'sub': case 'mul': case 'div': case 'pow': case 'root': case 'npr': case 'ncr': case 'r2p': case 'pr': case 'and': case 'or': case 'xor': case 'xnor': case 'gcd': this.binop(a); this.computed = false; return;
        case 'eq': this.equals(); this.computed = true; this.justOp = false; return;
        case 'lp': if (this.stack.filter(s => s.par).length >= this.cfg.maxPar) throw new E.CalcError('E'); this.stack.push({ par: true }); this.entry = null; this.justOp = true; return;
        case 'rp': { this.commit(); while (this.stack.length && !this.stack[this.stack.length - 1].par) { const t = this.stack.pop(); this.x = this.check(this.apply(t.op, t.v, this.x)); } if (this.stack.length) this.stack.pop(); this.computed = true; this.justOp = false; return; }
        case 'ac': case 'onac': case 'onc': case 'sac0':
          if (!this.on) { this.on = true; }
          if (a === 'onc' && this.entry != null) { this.entry = null; this.x = 0; this.err = null; return; }
          this.entry = null; this.x = 0; this.stack = []; this.err = null; this.lastBin = null; this.computed = false; this.fracShow = false; this.dmsShow = false; this.engShift = 0; this.hyp = false; this.label = null; if (this.ws) this.ws = null; return;
        case 'on': this.on = true; this.reset(); return;
        case 'off': this.on = false; return;
        case 'onoff': if (this.on) this.on = false; else { this.on = true; this.entry = null; this.x = 0; this.stack = []; } return;
        case 'c': case 'cec': case 'ce': if (this.err) { this.err = null; this.stack = []; this.x = 0; this.entry = null; return; } if (this.entry != null) { this.entry = null; this.x = 0; this.computed = false; } else { this.x = 0; this.stack = []; this.lastBin = null; } return;
        case 'bksp': if (this.entry != null && this.entry.length) { this.entry = this.entry.slice(0, -1); if (this.entry === '' || this.entry === '-') this.entry = null, this.x = 0; } return;
        case 'sq': return this.unary(x => this.base !== 10 ? (x * x) | 0 : x * x);
        case 'cube': return this.unary(x => x * x * x);
        case 'sqrt': return this.unary(x => { if (x < 0) throw new E.CalcError('E'); return Math.sqrt(x); });
        case 'cbrt': return this.unary(x => Math.cbrt(x));
        case 'inv': return this.unary(x => { if (x === 0) throw new E.CalcError('E'); return 1 / x; });
        case 'log': return this.unary(x => { if (x <= 0) throw new E.CalcError('E'); return E.evaluate('log(A)', { vars: { A: x } }); });
        case 'ln': return this.unary(x => { if (x <= 0) throw new E.CalcError('E'); return Math.log(x); });
        case 'pow10': return this.unary(x => Math.pow(10, x));
        case 'epow': return this.unary(x => Math.exp(x));
        case 'fact': return this.unary(x => E.FUNCS.fact([x], E.makeEnv()));
        case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan': this.commit(); this.entry = String(this.x); return this.trig(a);
        case 'hyp': this.hyp = !this.hyp; return;
        case 'inva': this.inv = !this.inv; return;
        case 'pi': this.entry = null; this.x = Math.PI; this.computed = true; return;
        case 'ran': this.entry = null; this.x = Math.floor(Math.random() * 1000) / 1000; this.computed = true; return;
        case 'rnd': return this.unary(x => parseFloat(E.fmtPlain(x, this.fmt).replace('E', 'e')));
        case 'int': return this.unary(x => Math.trunc(x)); case 'frac': return this.unary(x => x - Math.trunc(x));
        case 'abs': return this.unary(x => Math.abs(x));
        case 'pct': return this.percent();
        case 'swap': { this.commit(); if (this.swapVal != null) { const t = this.x; this.x = this.swapVal; this.swapVal = t; return; } const t = this.stack.length && !this.stack[this.stack.length - 1].par ? this.stack[this.stack.length - 1] : null; if (t) { const v = t.v; t.v = this.x; this.x = v; } return; }
        case 'mr': case 'rcl': this.entry = null; this.x = this.M; this.computed = true; return;
        case 'min': case 'sto': this.commit(); this.M = this.x; this.computed = true; return;
        case 'xm': { this.commit(); const t = this.M; this.M = this.x; this.x = t; this.computed = true; return; }
        case 'mplus': case 'mminus': { if (this.stack.length) this.equals(); this.commit(); this.M = E.round15(this.M + (a === 'mplus' ? this.x : -this.x)); this.computed = true; return; }
        case 'stoN': this.stoPending = true; return; case 'rclN': this.rclPending = true; return;
        case 'exc': { this.commit(); const t = this.M; this.M = this.x; this.x = t; return; }
        case 'mode': this.modePending = true; return;
        case 'drg': this.angle = { deg: 'rad', rad: 'grad', grad: 'deg' }[this.angle]; return;
        case 'drgconv': { this.commit(); const from = this.angle; const to = { deg: 'rad', rad: 'grad', grad: 'deg' }[from]; this.x = this.check(this.x * ANG[from] / ANG[to]); this.angle = to; this.computed = true; return; }
        case 'eng': this.commit(); this.engShift = (this.engShift || 0) + 1; this.computed = true; return;
        case 'engl': this.commit(); this.engShift = (this.engShift || 0) - 1; this.computed = true; return;
        case 'engmode': this.fmt = { mode: 'eng' }; return; case 'scimode': this.fmt = { mode: 'sci', n: 10 }; return; case 'flomode': this.fmt = { mode: 'norm1' }; return;
        case 'fix': this.fixPending = true; return;
        case 'abc': // fraction entry / toggle
          if (this.entry != null && !this.computed) { if ((this.entry.match(/⌟/g) || []).length < 2) this.entry += '⌟'; return; }
          this.fracShow = !this.fracShow; return;
        case 'dc': this.fracImproper = !this.fracImproper; this.fracShow = true; return;
        case 'fd': this.fracShow = !this.fracShow; return;
        case 'dms': if (this.entry != null && !this.computed) { if ((this.entry.match(/°/g) || []).length < 2) this.entry += '°'; else this.entry += ''; return; } this.commit(); this.dmsShow = !this.dmsShow; this.computed = true; return;
        case 'todms': this.commit(); this.dmsShow = true; this.computed = true; return;
        case 'fromdms': this.commit(); this.dmsShow = false; return;
        case 'statclr': this.sx = []; this.sy = []; return;
        case 'data': case 'sigplus': case 'sigminus': {
          this.commit(); const v = this.x;
          if (this.pairPending != null) { const xx = this.pairPending; this.pairPending = null; if (a === 'sigminus') { const i = this.sx.findIndex((q, j) => q === xx && this.sy[j] === v); if (i >= 0) { this.sx.splice(i, 1); this.sy.splice(i, 1); } } else { this.sx.push(xx); this.sy.push(v); } }
          else if (a === 'sigminus') { const i = this.sx.lastIndexOf(v); if (i >= 0) { this.sx.splice(i, 1); this.sy.splice(i, 1); } }
          else { this.sx.push(v); this.sy.push(null); }
          this.x = this.sx.length; this.computed = true; this.label = 'n='; return; }
        case 'pairsep': this.commit(); this.pairPending = this.x; this.entry = null; return;
        case 'sn': case 'smean': case 'ssx': case 'ssig': case 'ssumx': case 'ssumx2': case 'symean': case 'ssy': case 'ssigy': case 'sa': case 'sb': case 'sr': case 'ssumy': case 'ssumxy': case 'ssumy2': {
          if (!this.sx.length) throw new E.CalcError('E');
          const ys = this.sy.every(y => y != null) ? this.sy : null; const s = E.stats(this.sx, ys);
          const m = { sn: s.n, smean: s.mean, ssx: s.sx, ssig: s.σx, ssumx: s.Σx, ssumx2: s.Σx2, symean: s.ymean, ssy: s.sy, ssigy: s.σy, sa: s.a, sb: s.b, sr: s.r, ssumy: s.Σy, ssumxy: s.Σxy, ssumy2: s.Σy2 };
          if (m[a] == null || isNaN(m[a])) throw new E.CalcError('E'); this.entry = null; this.x = m[a]; this.computed = true; return; }
        case 'statmode1': this.statOn = this.statOn === 1 ? false : 1; this.sx = []; this.sy = []; return;
        case 'statmode2': this.statOn = this.statOn === 2 ? false : 2; this.sx = []; this.sy = []; return;
        case 'base:16': case 'base:10': case 'base:8': case 'base:2': { this.commit(); const nb = +a.slice(5); this.x = nb === 10 ? this.x : Math.trunc(this.x) | 0; this.base = nb; this.computed = true; return; }
        case 'not': return this.unary(x => ~x);
        case 'const': this.entry = null; this.x = this.cfg.constVal || 299792458; this.computed = true; return;
        case 'k': this.k = !this.k; return;
        case 'reset': this.reset(); return;
        case 'noop': return;
      }
      if (a.startsWith('conv:')) { const f = parseFloat(a.slice(5)); return this.unary(x => x * f); }
      if (a === 'f2c') return this.unary(x => (x - 32) * 5 / 9);
      if (a === 'c2f') return this.unary(x => x * 9 / 5 + 32);
    }
    modeKey(a) {
      const m = { d0: () => { this.statOn = false; this.base = 10; }, d1: () => { this.statOn = 1; }, d2: () => { this.statOn = 2; }, d4: () => this.angle = 'deg', d5: () => this.angle = 'rad', d6: () => this.angle = 'grad', d7: () => this.fixPending = true, d8: () => this.fmt = { mode: 'sci', n: 10 }, d9: () => this.fmt = { mode: 'norm1' }, dot: () => { this.statOn = 1; this.sx = []; this.sy = []; } };
      if (m[a]) { m[a](); return true; }
      return false;
    }
    percent() {
      this.commit(); const t = this.stack.length && !this.stack[this.stack.length - 1].par ? this.stack[this.stack.length - 1] : null;
      if (this.cfg.pct === 'ti' || !t) { this.x = this.x / 100; return; }
      const a = t.v, b = this.x; this.stack.pop();
      switch (t.op) { case 'mul': this.x = a * b / 100; break; case 'div': this.x = a / b * 100; break; case 'add': this.x = a + a * b / 100; break; case 'sub': this.x = a - a * b / 100; break; default: this.stack.push(t); this.x = b / 100; }
      this.computed = true;
    }
    // ---- display ----
    displayText() {
      if (this.err) return { main: this.err, exp: '' };
      if (this.entry != null) {
        let s = this.entry; if (this.base !== 10) return { main: s.toUpperCase() || '0', exp: '' };
        if (s.includes('E')) { const [m, e] = s.split('E'); return { main: (m || '0') + (m.includes('.') ? '' : '.'), exp: e || '' }; }
        if (s.includes('⌟')) return { main: s.replace(/⌟/g, '┘'), exp: '', frac: true };
        if (s.includes('°')) return { main: s, exp: '', dms: true };
        if (s === '' ) s = '0'; if (s === '-') s = '-0';
        return { main: s.includes('.') ? s : s + '.', exp: '' };
      }
      const v = this.x;
      if (this.base !== 10) return { main: E.toBase(v, this.base), exp: '' };
      if (this.fracShow) { const f = E.toFraction(Math.abs(v), 9999); if (f && String(f.n).length + String(f.d).length <= this.cfg.digits) { const neg = v < 0 ? '-' : ''; if (!this.fracImproper && f.n > f.d) return { main: neg + Math.floor(f.n / f.d) + '┘' + (f.n % f.d) + '┘' + f.d, exp: '', frac: true }; return { main: neg + f.n + '┘' + f.d, exp: '', frac: true }; } }
      if (this.dmsShow) { const d = E.toDMS(v); return { main: d.d + '°' + d.m + '°' + d.s.toFixed(0), exp: '', dms: true }; }
      let f;
      if (this.engShift) { const e0 = E.formatNumber(v, { mode: 'eng', digits: this.cfg.digits }); const e = (e0.exp || 0) - 3 * (this.engShift - 1); const m = v / Math.pow(10, e); f = { mant: E.trimZeros(parseFloat(m.toPrecision(this.cfg.digits)).toFixed(Math.max(0, this.cfg.digits - String(Math.trunc(Math.abs(m))).length))), exp: e }; }
      else f = E.formatNumber(v, Object.assign({ digits: this.cfg.digits }, this.fmt));
      let main = f.mant; if (!main.includes('.')) main += '.';
      return { main, exp: f.exp != null ? String(f.exp) : '' };
    }
    indicators() {
      const I = []; if (this.s2) I.push(this.cfg.shiftName || 'SHIFT'); if (this.s3) I.push('3rd'); if (this.hyp) I.push('HYP'); if (this.M) I.push('M');
      I.push({ deg: 'DEG', rad: 'RAD', grad: 'GRAD' }[this.angle]); if (this.statOn) I.push(this.cfg.statName || 'SD'); if (this.stack.some(s => s.par)) I.push('( )');
      if (this.fmt.mode === 'fix') I.push('FIX'); if (this.fmt.mode === 'sci') I.push('SCI'); if (this.fmt.mode === 'eng' || this.engShift) I.push('ENG');
      if (this.base !== 10) I.push({ 16: 'HEX', 8: 'OCT', 2: 'BIN' }[this.base]); if (this.lastBin && this.lastBin.v != null && !this.stack.length && this.computed) I.push('K');
      if (this.fracShow) I.push('a b/c');
      return I;
    }
    render() {
      if (!this.on) { this.el.innerHTML = '<div class="segwrap off"></div>'; return; }
      const t = this.displayText(); const I = this.indicators(); const all = this.cfg.indicatorSet || ['SHIFT', '3rd', 'HYP', 'M', 'K', 'DEG', 'RAD', 'GRAD', 'SD', 'FIX', 'SCI', 'ENG', '( )', 'HEX', 'OCT', 'BIN', 'a b/c'];
      const segText = t.main.replace(/┘/g, '_').replace(/°/g, "'");
      this.el.innerHTML = `<div class="segwrap"><div class="ind">${all.map(x => `<span class="${I.includes(x) ? 'on' : 'off'}">${x}</span>`).join('')}</div>` +
        `<div class="segrow">${this.label ? `<span class="seglab">${this.label}</span>` : ''}<span class="segmain">${U.segSVG(segText, this.cfg.digits + 1, { commas: this.cfg.commas })}</span>${this.cfg.expDigits ? `<span class="segexp">${U.segSVG(t.exp.replace('-', '-'), this.cfg.expDigits + 1)}</span>` : ''}</div></div>`;
    }
  }

  // ===================== Financial (BA-II-style) =====================
  function dateFromMDY(v) { // MM.DDYY
    const s = Math.abs(v).toFixed(4); const [mm, rest] = s.split('.'); const dd = +rest.slice(0, 2), yy = +rest.slice(2, 4);
    const year = yy < 50 ? 2000 + yy : 1900 + yy; const d = new Date(Date.UTC(year, +mm - 1, dd)); if (d.getUTCMonth() !== +mm - 1) throw new E.CalcError('E'); return d;
  }
  function mdy(d) { const m = d.getUTCMonth() + 1, dd = d.getUTCDate(), y = d.getUTCFullYear() % 100; return parseFloat(m + '.' + String(dd).padStart(2, '0') + String(y).padStart(2, '0')); }
  const DAY = 86400000;
  function addMonths(d, n) { const r = new Date(d.getTime()); const day = r.getUTCDate(); r.setUTCDate(1); r.setUTCMonth(r.getUTCMonth() + n); const dim = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate(); r.setUTCDate(Math.min(day, dim)); return r; }
  function bondCalc(w, solveY) { // SIA price with semiannual (or annual) coupons, ACT day count
    const sdt = dateFromMDY(w.SDT), rdt = dateFromMDY(w.RDT); const freq = w.FREQ || 2; const step = 12 / freq;
    let nc = rdt; let N = 0; while (nc > sdt) { nc = addMonths(rdt, -step * (N + 1)); N++; }
    const prev = nc, next = addMonths(rdt, -step * (N - 1)); const Edays = (next - prev) / DAY, A = (sdt - prev) / DAY, DSC = Edays - A;
    const C = w.CPN / freq, RV = w.RV;
    const price = (y) => { const r = y / 100 / freq; let p = RV / Math.pow(1 + r, N - 1 + DSC / Edays); for (let k = 1; k <= N; k++) p += C / Math.pow(1 + r, k - 1 + DSC / Edays); return p - C * A / Edays; };
    const AI = C * A / Edays;
    if (solveY) { return { YLD: E.solve(y => price(y) - w.PRI, w.CPN || 5), AI }; }
    return { PRI: price(w.YLD), AI };
  }
  const WS = {
    TVM: { vars: ['N', 'IY', 'PV', 'PMT', 'FV'] },
    PY: { title: 'P/Y', vars: ['PY', 'CY'], labels: { PY: 'P/Y', CY: 'C/Y' } },
    BGN: { toggle: true },
    CF: { cf: true },
    NPV: { vars: ['I', 'NPV'], cpt: { NPV: (s) => E.npv(s.w.I || 0, s.cfList()) } },
    IRR: { vars: ['IRR'], cpt: { IRR: (s) => E.irr(s.cfList()) } },
    AMORT: { vars: ['P1', 'P2', 'BAL', 'PRN', 'INT'], auto: (s) => { const a = E.amort({ N: s.tvm.N, IY: s.tvm.IY, PV: s.tvm.PV, PMT: s.tvm.PMT, PY: s.tvm.PY, CY: s.tvm.CY, BGN: s.tvm.BGN }, s.w.P1 || 1, s.w.P2 || 1); s.w.BAL = a.bal; s.w.PRN = a.prn; s.w.INT = a.int; } },
    DCH: { title: 'Δ%', vars: ['OLD', 'NEW', 'PCH', 'PD'], labels: { PCH: '%CH', PD: '#PD' }, cpt: { NEW: (s) => s.w.OLD * Math.pow(1 + s.w.PCH / 100, s.w.PD || 1), OLD: (s) => s.w.NEW / Math.pow(1 + s.w.PCH / 100, s.w.PD || 1), PCH: (s) => (Math.pow(s.w.NEW / s.w.OLD, 1 / (s.w.PD || 1)) - 1) * 100, PD: (s) => Math.log(s.w.NEW / s.w.OLD) / Math.log(1 + s.w.PCH / 100) } },
    PROFIT: { vars: ['CST', 'SEL', 'MAR'], cpt: { CST: (s) => E.csm(null, s.w.SEL, s.w.MAR), SEL: (s) => E.csm(s.w.CST, null, s.w.MAR), MAR: (s) => E.csm(s.w.CST, s.w.SEL, null) } },
    BRKEVN: { vars: ['FC', 'VC', 'P', 'PFT', 'Q'], cpt: { FC: (s) => s.w.Q * (s.w.P - s.w.VC) - s.w.PFT, VC: (s) => s.w.P - (s.w.PFT + s.w.FC) / s.w.Q, P: (s) => (s.w.PFT + s.w.FC) / s.w.Q + s.w.VC, PFT: (s) => s.w.Q * (s.w.P - s.w.VC) - s.w.FC, Q: (s) => (s.w.PFT + s.w.FC) / (s.w.P - s.w.VC) } },
    ICONV: { vars: ['NOM', 'EFF', 'CY'], labels: { CY: 'C/Y' }, cpt: { EFF: (s) => (Math.pow(1 + s.w.NOM / 100 / s.w.CY, s.w.CY) - 1) * 100, NOM: (s) => (Math.pow(1 + s.w.EFF / 100, 1 / s.w.CY) - 1) * s.w.CY * 100 } },
    DATE: { vars: ['DT1', 'DT2', 'DBD'], cpt: { DBD: (s) => Math.round((dateFromMDY(s.w.DT2) - dateFromMDY(s.w.DT1)) / DAY), DT2: (s) => mdy(new Date(dateFromMDY(s.w.DT1).getTime() + s.w.DBD * DAY)), DT1: (s) => mdy(new Date(dateFromMDY(s.w.DT2).getTime() - s.w.DBD * DAY)) }, fmt: { DT1: 4, DT2: 4, DBD: 0 } },
    DEPR: { title: 'SL', vars: ['LIF', 'M01', 'CST', 'SAL', 'YR', 'DEP', 'RBV', 'RDV'], auto: (s) => { const w = s.w; const lif = w.LIF || 1, m = w.M01 || 1, yr = w.YR || 1; const full = (w.CST - w.SAL) / lif; const first = full * (13 - m) / 12; let acc = 0, dep = 0; for (let y = 1; y <= yr; y++) { dep = y === 1 ? first : Math.min(full, w.CST - w.SAL - acc); acc += dep; } w.DEP = E.round15(dep); w.RBV = E.round15(w.CST - acc); w.RDV = E.round15(w.CST - w.SAL - acc); } },
    BOND: { vars: ['SDT', 'CPN', 'RDT', 'RV', 'YLD', 'PRI', 'AI'], cpt: { PRI: (s) => { const r = bondCalc(s.w); s.w.AI = E.round15(r.AI); return r.PRI; }, YLD: (s) => { const r = bondCalc(s.w, true); s.w.AI = E.round15(r.AI); return r.YLD; } }, fmt: { SDT: 4, RDT: 4 } },
    DATA: { data: true },
    STAT: { stat: true },
    FORMAT: { vars: ['DEC', 'ANG', 'CALC'], fmt: { DEC: 0 } },
    MEM: { vars: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'] },
  };
  class FinAOS extends AOSApp {
    /** Worksheet register bag used by WS cpt/auto formulas (s.w). */
    get w() { return this.ws ? this.ws.w : undefined; }
    initExtra() {
      this.tvm = { N: 0, IY: 0, PV: 0, PMT: 0, FV: 0, PY: 12, CY: 12, BGN: false }; this.cpt = false; this.cfs = [{ v: 0, n: 1 }]; this.wsData = {}; this.fmt = { mode: 'fix', n: 2 }; this.decN = 2; this.ws = null; this.chain = true; this.data = [];
    }
    openWS(name) {
      const def = WS[name]; this.ws = { name, def, i: 0 }; this.entry = null; this.cpt = false;
      if (name === 'TVM') return;
      if (!this.wsData[name]) this.wsData[name] = {};
      this.ws.w = this.wsData[name];
      if (name === 'PY') { this.ws.w = this.tvm; }
      if (name === 'FORMAT') { this.ws.w = { DEC: this.decN, ANG: this.angle === 'deg' ? 0 : 1, CALC: this.chain ? 0 : 1 }; }
      if (name === 'MEM') { this.ws.w = {}; this.mem.forEach((m, i) => this.ws.w['M' + i] = m); }
      if (def.auto) { this.ws.w.P1 = this.ws.w.P1 || 1; this.ws.w.P2 = this.ws.w.P2 || 1; }
      this.showWS();
    }
    wsVars() {
      const ws = this.ws; if (!ws) return [];
      if (ws.def.cf) { const L = [['CFo', 0, 'v']]; for (let i = 1; i < Math.max(2, this.cfs.length + 1) && i < 33; i++) { L.push(['C' + String(i).padStart(2, '0'), i, 'v'], ['F' + String(i).padStart(2, '0'), i, 'n']); } return L; }
      if (ws.def.data) { const L = []; for (let i = 0; i <= this.data.length && i < 50; i++) L.push(['X' + String(i + 1).padStart(2, '0'), i, 0], ['Y' + String(i + 1).padStart(2, '0'), i, 1]); return L; }
      if (ws.def.stat) { const xs = this.data.map(d => d[0]); const ys = this.data.map(d => d[1] == null ? 1 : d[1]); if (!xs.length) return [['n', 0]]; const s = E.stats(xs, ys); return [['LIN', 'LIN'], ['n', s.n], ['x̄', s.mean], ['Sx', s.sx], ['σx', s.σx], ['ȳ', s.ymean], ['Sy', s.sy], ['σy', s.σy], ['a', s.a], ['b', s.b], ['r', s.r], ['Σx', s.Σx], ['Σx²', s.Σx2], ['Σy', s.Σy], ['Σy²', s.Σy2], ['Σxy', s.Σxy]]; }
      if (ws.def.toggle) return [['BGN', 0]];
      return ws.def.vars.map(v => [(ws.def.labels && ws.def.labels[v]) || v, v]);
    }
    cfList() { return this.cfs.map((c, i) => ({ v: c.v, n: i === 0 ? 1 : (c.n || 1) })); }
    getWSVal(item) {
      const ws = this.ws;
      if (ws.def.cf) { const c = this.cfs[item[1]]; return c ? (item[2] === 'n' ? (c.n == null ? 1 : c.n) : c.v) : (item[2] === 'n' ? 1 : 0); }
      if (ws.def.data) { const d = this.data[item[1]]; return d ? (d[item[2]] == null ? (item[2] === 1 ? 1 : 0) : d[item[2]]) : (item[2] === 1 ? 1 : 0); }
      if (ws.def.stat) return typeof item[1] === 'number' ? item[1] : 0;
      if (ws.def.toggle) return this.tvm.BGN ? 1 : 0;
      return ws.w[item[1]] || 0;
    }
    setWSVal(item, v) {
      const ws = this.ws;
      if (ws.def.cf) { while (this.cfs.length <= item[1]) this.cfs.push({ v: 0, n: 1 }); this.cfs[item[1]][item[2]] = v; return; }
      if (ws.def.data) { while (this.data.length <= item[1]) this.data.push([0, null]); this.data[item[1]][item[2]] = v; return; }
      if (ws.def.stat || ws.def.toggle) return;
      ws.w[item[1]] = v;
      if (ws.name === 'FORMAT') { if (item[1] === 'DEC') { this.decN = v; this.fmt = v >= 9 ? { mode: 'norm1' } : { mode: 'fix', n: v }; } if (item[1] === 'ANG') this.angle = v ? 'rad' : 'deg'; if (item[1] === 'CALC') this.chain = !v; }
      if (ws.name === 'MEM') this.mem[+item[1].slice(1)] = v;
      if (ws.name === 'PY' && item[1] === 'PY') this.tvm.CY = v;
      if (ws.def.auto) ws.def.auto(this);
    }
    showWS() {
      const items = this.wsVars(); if (!items.length) return; this.ws.i = Math.max(0, Math.min(this.ws.i, items.length - 1));
      const it = items[this.ws.i]; this.label = it[0] + (it[1] === 'LIN' ? '' : '='); this.entry = null;
      if (this.ws.def.auto) this.ws.def.auto(this);
      if (it[1] === 'LIN') { this.label = 'LIN'; this.x = 0; this.hideNum = true; return; }
      this.hideNum = false;
      if (this.ws.name === 'FORMAT' && it[1] !== 'DEC') { this.label = it[1] === 'ANG' ? (this.angle === 'deg' ? 'DEG' : 'RAD') : (this.chain ? 'Chn' : 'AOS'); this.hideNum = true; return; }
      if (this.ws.def.toggle) { this.label = this.tvm.BGN ? 'BGN' : 'END'; this.hideNum = true; return; }
      this.x = this.getWSVal(it); this.computed = true;
    }
    extraKey(a, kd) {
      const tvmKeys = { N: 'N', IY: 'IY', PV: 'PV', PMT: 'PMT', FV: 'FV' };
      if (a === 'xpy') { this.commit(); this.x = this.check(this.x * this.tvm.PY); this.computed = true; return true; }
      if (a === 'quit') { this.ws = null; this.label = null; this.hideNum = false; this.entry = null; this.x = 0; return true; }
      if (a.startsWith('ws:')) { this.openWS(a.slice(3)); return true; }
      if (a === 'cpt') { this.cpt = true; if (this.ws && this.ws.def.cpt) { const it = this.wsVars()[this.ws.i]; const f = this.ws.def.cpt[it[1]]; if (f) { const v = this.check(f(this)); this.ws.w[it[1]] = v; this.x = v; this.entry = null; this.cpt = false; this.label = it[0] + '='; this.computed = true; this.mark = '*'; } } return true; }
      if (tvmKeys[a]) {
        this.ws = null; this.hideNum = false;
        if (this.cpt) { this.cpt = false; const v = this.check(E.tvmSolve(a, this.tvm)); this.tvm[a] = v; this.x = v; this.entry = null; this.label = { IY: 'I/Y' }[a] || a; this.label += '='; this.computed = true; this.mark = '*'; return true; }
        if (this.entry != null || this.computed || this.justOp === false) { this.commit(); this.tvm[a] = this.x; this.label = ({ IY: 'I/Y' }[a] || a) + '='; this.computed = true; this.mark = '='; return true; }
        return true;
      }
      if (a === 'clrtvm') { Object.assign(this.tvm, { N: 0, IY: 0, PV: 0, PMT: 0, FV: 0 }); this.label = null; this.x = 0; this.entry = null; return true; }
      if (this.ws) {
        const items = this.wsVars();
        if (a === 'down' || a === 'up') { if (this.entry != null) this.entry = null; this.ws.i = (this.ws.i + (a === 'down' ? 1 : -1) + items.length) % items.length; this.showWS(); this.mark = null; return true; }
        if (a === 'enter' || a === 'set') {
          const it = items[this.ws.i];
          if (this.ws.def.toggle || (a === 'set' && this.ws.name === 'FORMAT' && it[1] !== 'DEC')) { if (this.ws.def.toggle) this.tvm.BGN = !this.tvm.BGN; else if (it[1] === 'ANG') this.angle = this.angle === 'deg' ? 'rad' : 'deg'; else this.chain = !this.chain; this.showWS(); return true; }
          if (a === 'enter') { this.commit(); this.setWSVal(it, this.x); this.showWS(); this.mark = '='; }
          return true;
        }
        if (a === 'clrwork') { if (this.ws.def.cf) this.cfs = [{ v: 0, n: 1 }]; else if (this.ws.def.data) this.data = []; else if (this.ws.w) for (const k in this.ws.w) this.ws.w[k] = 0; this.ws.i = 0; this.showWS(); return true; }
        if (a === 'del' && (this.ws.def.cf || this.ws.def.data)) { const it = items[this.ws.i]; (this.ws.def.cf ? this.cfs : this.data).splice(it[1], 1); if (this.ws.def.cf && !this.cfs.length) this.cfs = [{ v: 0, n: 1 }]; this.showWS(); return true; }
        if (a === 'ins' && (this.ws.def.cf || this.ws.def.data)) { const it = items[this.ws.i]; if (this.ws.def.cf && it[1] > 0) this.cfs.splice(it[1], 0, { v: 0, n: 1 }); if (this.ws.def.data) this.data.splice(it[1], 0, [0, null]); this.showWS(); return true; }
        if (a === 'cec' && this.entry == null) { this.ws = null; this.label = null; this.hideNum = false; this.x = 0; return true; }
      } else {
        if (a === 'enter') return true; if (a === 'up' || a === 'down') return true;
        if (a === 'rcl') { this.rclTvm = true; return true; }
        if (a === 'sto') { this.stoPending = true; return true; }
      }
      if (this.rclTvm) { this.rclTvm = false; const d = /^d(\d)$/.exec(a); if (d) { this.x = this.mem[+d[1]]; this.entry = null; this.computed = true; return true; } if (tvmKeys[a]) { this.x = this.tvm[a]; this.label = a + '='; this.entry = null; this.computed = true; return true; } }
      if (/^d\d$|^dot$/.test(a) && this.label && !this.ws) { this.label = null; this.mark = null; }
      if (a === 'reset') { this.reset(); this.x = 0; this.label = 'RST'; return true; }
      if (a === 'ans') { this.entry = null; this.x = this.lastAns || 0; this.computed = true; return true; }
      if (a === 'eq') { this.equals(); this.computed = true; this.justOp = false; this.lastAns = this.x; return true; }
      if (a === 'pct') { this.commit(); this.x = this.x / 100; this.computed = true; return true; }
      if (a === 'round') { this.unary(x => parseFloat(x.toFixed(this.decN))); return true; }
      return false;
    }
    render() {
      if (!this.on) { this.el.innerHTML = '<div class="segwrap off"></div>'; return; }
      const t = this.hideNum ? { main: '', exp: '' } : this.displayText(); const I = [];
      if (this.s2) I.push('2ND'); if (this.inv) I.push('INV'); if (this.hyp) I.push('HYP'); if (this.cpt) I.push('COMPUTE'); if (this.ws && !this.ws.def.cpt && this.ws.name !== 'TVM') I.push('ENTER'); if (this.ws && (this.ws.def.toggle || this.ws.name === 'FORMAT')) I.push('SET'); if (this.ws) I.push('↑↓');
      if (this.tvm.BGN) I.push('BGN'); if (this.angle === 'rad') I.push('RAD'); if (this.mark === '*') I.push('*'); if (this.mark === '=') I.push('=');
      const all = ['2ND', 'INV', 'HYP', 'COMPUTE', 'ENTER', 'SET', '↑↓', 'DEL', 'INS', '*', '=', 'BGN', 'RAD'];
      this.el.innerHTML = `<div class="segwrap fin"><div class="ind">${all.map(x => `<span class="${I.includes(x) ? 'on' : 'off'}">${x}</span>`).join('')}</div>` +
        `<div class="segrow"><span class="seglab">${this.label || ''}</span><span class="segmain">${U.segSVG(t.main, 10, { commas: false })}</span>${t.exp ? `<span class="segexp">${U.segSVG(t.exp, 3)}</span>` : ''}</div></div>`;
    }
  }
  // keep label when typing in a worksheet
  const baseDigit = AOSApp.prototype.digit;
  FinAOS.prototype.digit = function (d) { if (!this.ws) this.mark = null; baseDigit.call(this, d); };

  G.AOSApp = AOSApp; G.FinAOS = FinAOS;
})(window);
