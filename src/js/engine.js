/* calc45 shared math engine: tokenizer + Pratt parser + evaluator + formatter + numeric tools.
   Works in browser (global CalcEngine) and node (module.exports). Uses math.js for complex & matrix ops. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../vendor/math.js'));
  else root.CalcEngine = factory(root.math);
})(this, function (math) {
  'use strict';
  class CalcError extends Error { constructor(kind, msg) { super(msg || kind); this.kind = kind; } }
  const ERR = (k) => { throw new CalcError(k); };

  // ---------------- Tokenizer ----------------
  // Internal source alphabet (generated from key presses):
  //  numbers 12.5  exponent ᴇ  negation ~  + - * / ^  ( ) , ! %
  //  postfix ² ³ ˉ(inverse) ° (DMS) ᴰ ʳ ᵍ (angle unit markers)  ⌟ (a⌟b fraction)  ℙ nPr ℂ nCr ∠ polar
  //  π ℯ ⅈ constants  identifiers: function names / variables;  infix words and or xor xnor  ; = (equation)
  const POSTFIX = { '²': 1, '³': 1, 'ˉ': 1, '!': 1, '%': 1, '°': 1, 'ᴰ': 1, 'ʳ': 1, 'ᵍ': 1, '′': 1, '″': 1 };
  const SINGLE = '+-*/^(),~!%²³ˉ°ᴰʳᵍ⌟ℙℂ∠πℯⅈ=:[];′″×÷−';
  function tokenize(src) {
    const out = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === ' ') { i++; continue; }
      if (/[0-9.]/.test(c) || (c === 'ᴇ')) {
        let s = ''; let dots = 0;
        while (i < src.length && /[0-9.]/.test(src[i])) { if (src[i] === '.') dots++; s += src[i++]; }
        if (dots > 1) ERR('Syntax ERROR');
        if (src[i] === 'ᴇ') {
          if (s === '') s = '1';
          i++; let e = '';
          if (src[i] === '~' || src[i] === '-' || src[i] === '−') { e = '-'; i++; } else if (src[i] === '+') i++;
          while (i < src.length && /[0-9]/.test(src[i])) e += src[i++];
          if (e === '' || e === '-') ERR('Syntax ERROR');
          s += 'e' + e;
        }
        if (s === '.') ERR('Syntax ERROR');
        out.push({ t: 'num', v: parseFloat(s), s }); continue;
      }
      if (/[A-Za-z_θ#]/.test(c)) {
        let s = '';
        while (i < src.length && /[A-Za-z_0-9θ#]/.test(src[i])) s += src[i++];
        if (['and', 'or', 'xor', 'xnor'].includes(s)) out.push({ t: 'op', v: s });
        else out.push({ t: 'id', v: s });
        continue;
      }
      if (c === '"') { let s = ''; i++; while (i < src.length && src[i] !== '"') s += src[i++]; i++; out.push({ t: 'str', v: s }); continue; }
      if (SINGLE.includes(c)) {
        let v = c; if (c === '×') v = '*'; if (c === '÷') v = '/'; if (c === '−') v = '-';
        out.push({ t: 'op', v }); i++; continue;
      }
      ERR('Syntax ERROR');
    }
    return out;
  }

  // ---------------- Parser (Pratt) ----------------
  // cfg.implicitHigh: implicit multiplication binds tighter than * and / (textbook style). Default true.
  function parse(src, cfg) {
    cfg = cfg || {};
    const toks = typeof src === 'string' ? tokenize(src) : src;
    let p = 0;
    const peek = () => toks[p];
    const next = () => toks[p++];
    const isOp = (t, v) => t && t.t === 'op' && t.v === v;
    const BP = { '=': 2, 'or': 5, 'xor': 5, 'xnor': 5, 'and': 6, '+': 10, '-': 10, '*': 20, '/': 20, 'ℙ': 30, 'ℂ': 30, '∠': 30, '^': 40, '⌟': 45 };
    const IMPL = cfg.implicitHigh === false ? 20 : 25;
    function startsOperand(t) {
      if (!t) return false;
      if (t.t === 'num' || t.t === 'id' || t.t === 'str') return true;
      return t.t === 'op' && ['(', 'π', 'ℯ', 'ⅈ', '['].includes(t.v);
    }
    function parseExpr(rbp) {
      let left = nud(next());
      for (;;) {
        const t = peek();
        if (!t) break;
        if (t.t === 'op' && POSTFIX[t.v]) {
          if (50 <= rbp) break;
          next();
          if (t.v === '°' && peek() && peek().t === 'num') {
            // DMS a°b°c°
            const m = parseDMSRest(); left = { t: 'dms', d: left, m: m[0], s: m[1] }; continue;
          }
          left = { t: 'post', op: t.v, a: left }; continue;
        }
        if (t.t === 'op' && BP[t.v] !== undefined) {
          const bp = BP[t.v]; if (bp <= rbp) break;
          next();
          if (t.v === '⌟') {
            const b = nud(next());
            if (isOp(peek(), '⌟')) { next(); const c = nud(next()); left = { t: 'mixed', w: left, n: b, d: c }; }
            else left = { t: 'bin', op: '/', a: left, b, frac: true };
            continue;
          }
          const rb = t.v === '^' ? bp - 1 : bp; // ^ right assoc
          if (!peek()) { if (cfg.lenient) break; ERR('Syntax ERROR'); }
          left = { t: 'bin', op: t.v, a: left, b: parseExpr(rb) };
          continue;
        }
        if (startsOperand(t)) {
          if (IMPL <= rbp) break;
          left = { t: 'bin', op: '*', a: left, b: parseExpr(IMPL), implicit: true }; continue;
        }
        break;
      }
      return left;
    }
    function parseDMSRest() {
      let m = { t: 'num', v: 0 }, s = { t: 'num', v: 0 };
      m = nud(next()); if (isOp(peek(), '°')) next();
      if (peek() && peek().t === 'num') { s = nud(next()); if (isOp(peek(), '°')) next(); }
      return [m, s];
    }
    function parseArgs() {
      const args = [];
      if (isOp(peek(), ')')) { next(); return args; }
      if (!peek()) return args;
      for (;;) {
        args.push(parseExpr(0));
        const t = peek();
        if (isOp(t, ',')) { next(); continue; }
        if (isOp(t, ')')) { next(); break; }
        if (!t) break; // auto-close
        ERR('Syntax ERROR');
      }
      return args;
    }
    function nud(t) {
      if (!t) ERR('Syntax ERROR');
      if (t.t === 'num') return { t: 'num', v: t.v };
      if (t.t === 'str') return { t: 'str', v: t.v };
      if (t.t === 'id') {
        if (isOp(peek(), '(')) { next(); return { t: 'call', f: t.v, args: parseArgs() }; }
        return { t: 'var', n: t.v };
      }
      if (t.t === 'op') {
        switch (t.v) {
          case '(': {
            if (!peek()) ERR('Syntax ERROR');
            const e = parseExpr(0);
            if (isOp(peek(), ',')) { // tuple, e.g. (x,y) for Pol / list
              const items = [e]; while (isOp(peek(), ',')) { next(); items.push(parseExpr(0)); }
              if (isOp(peek(), ')')) next(); return { t: 'list', items };
            }
            if (isOp(peek(), ')')) next(); else if (peek()) ERR('Syntax ERROR');
            return { t: 'group', a: e };
          }
          case '[': { // matrix / vector literal [[1,2],[3,4]] or [1,2]
            const rows = [];
            if (isOp(peek(), ']')) { next(); return { t: 'mat', rows }; }
            for (;;) { rows.push(parseExpr(0)); if (isOp(peek(), ',')) { next(); continue; } if (isOp(peek(), ']')) { next(); break; } if (!peek()) break; ERR('Syntax ERROR'); }
            return { t: 'mat', rows };
          }
          case '~': case '-': return { t: 'neg', a: parseExpr(35) };
          case '+': return parseExpr(35);
          case 'π': return { t: 'const', n: 'pi' };
          case 'ℯ': return { t: 'const', n: 'e' };
          case 'ⅈ': return { t: 'const', n: 'i' };
        }
      }
      ERR('Syntax ERROR');
    }
    if (!toks.length) ERR('Syntax ERROR');
    const ast = parseExpr(0);
    if (p < toks.length) { if (isOp(peek(), ')')) { // stray close paren -> syntax error
        ERR('Syntax ERROR'); } ERR('Syntax ERROR'); }
    return ast;
  }

  // ---------------- Evaluator ----------------
  const isNum = (x) => typeof x === 'number';
  const isCx = (x) => x && x.isComplex;
  const isMat = (x) => x && (x.isMatrix || Array.isArray(x));
  function toMat(x) { return Array.isArray(x) ? math.matrix(x) : x; }
  function cleanCx(z) {
    if (!isCx(z)) return z;
    let re = z.re, im = z.im;
    const m = Math.max(Math.abs(re), Math.abs(im));
    if (Math.abs(im) < 1e-13 * m || Math.abs(im) < 1e-300) im = 0;
    if (Math.abs(re) < 1e-13 * m) re = 0;
    if (im === 0) return re;
    return math.complex(re, im);
  }
  function snap(r, a, b) { // kill cancellation noise in add/sub
    if (isNum(r) && isNum(a) && isNum(b)) { const m = Math.max(Math.abs(a), Math.abs(b)); if (r !== 0 && Math.abs(r) < m * 1e-14) return 0; }
    return r;
  }
  function round15(x) { if (!isFinite(x) || x === 0) return x; return parseFloat(x.toPrecision(15)); }
  const ANG = { deg: Math.PI / 180, rad: 1, grad: Math.PI / 200 };

  function makeEnv(o) {
    return Object.assign({ angle: 'deg', vars: {}, ans: 0, complex: false, base: null, maxAbs: 1e100, implicitHigh: true, fns: {}, factMax: 69, random: Math.random, fixN: null }, o || {});
  }

  /** Last error cause hint for UI feedback (sound); never affects results. */
  const HINT = { cause: null, t: 0 };
  function checkReal(x, env) {
    if (isCx(x)) { x = cleanCx(x); if (isCx(x) && !env.complex) ERR('Math ERROR'); }
    if (isNum(x)) { if (isNaN(x)) ERR('Math ERROR'); if (!isFinite(x) || Math.abs(x) >= env.maxAbs) { HINT.cause = 'overflow'; HINT.t = Date.now(); ERR('Math ERROR'); } }
    return x;
  }

  function toRad(x, env) { return x * ANG[env.angle]; }
  function fromRad(x, env) { return x / ANG[env.angle]; }
  function trig(fn, x, env) {
    if (isCx(x)) return math[fn](x); // complex: radians
    if (isMat(x)) ERR('Math ERROR');
    // exact values at special angles
    const unitsPerTurn = { deg: 360, rad: 2 * Math.PI, grad: 400 }[env.angle];
    let q = x / (unitsPerTurn / 4); // quarter turns
    if (Math.abs(x) > 1e10 * (unitsPerTurn / 360)) ERR('Math ERROR');
    const qr = Math.round(q);
    if (Math.abs(q - qr) < 1e-12) {
      const k = ((qr % 4) + 4) % 4;
      if (fn === 'sin') return [0, 1, 0, -1][k];
      if (fn === 'cos') return [1, 0, -1, 0][k];
      if (fn === 'tan') { if (k % 2) ERR('Math ERROR'); return 0; }
    }
    // 30/60 degree style exact halves
    const r = toRad(x, env);
    let v = Math[fn](r);
    if (Math.abs(v - Math.round(v * 2) / 2) < 1e-14) v = Math.round(v * 2) / 2;
    if (fn === 'tan' && Math.abs(Math.abs(v) - 1) < 1e-14) v = Math.sign(v);
    return v;
  }
  function atrig(fn, x, env) {
    if (isCx(x)) return math[fn](x);
    if ((fn === 'asin' || fn === 'acos') && Math.abs(x) > 1) { if (env.complex) return math[fn](x); ERR('Math ERROR'); }
    const v = fromRad(Math[fn](x), env);
    return Math.abs(v - Math.round(v)) < 1e-11 ? Math.round(v) : v;
  }
  function factorial(n, env) {
    if (!isNum(n) || n < 0 || n !== Math.floor(n)) { if (env.gammaFact && isNum(n) && n > -1) return math.gamma(n + 1); ERR('Math ERROR'); }
    if (n > env.factMax) ERR('Math ERROR');
    let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
  }
  function nPr(n, r) { if (!(n >= 0 && r >= 0 && r <= n && n === Math.floor(n) && r === Math.floor(r)) || n >= 1e10) ERR('Math ERROR'); let v = 1; for (let i = 0; i < r; i++) v *= (n - i); return v; }
  function nCr(n, r) { if (!(n >= 0 && r >= 0 && r <= n && n === Math.floor(n) && r === Math.floor(r)) || n >= 1e10) ERR('Math ERROR'); r = Math.min(r, n - r); let v = 1; for (let i = 1; i <= r; i++) v = v * (n - r + i) / i; return Math.round(v); }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); if (a !== Math.floor(a) || b !== Math.floor(b)) ERR('Math ERROR'); while (b) { [a, b] = [b, a % b]; } return a; }
  function lcm(a, b) { if (!a || !b) return 0; return Math.abs(a * b) / gcd(a, b); }

  function binop(op, a, b, env) {
    if (env.base) return baseBin(op, a, b, env);
    switch (op) {
      case '+': return isNum(a) && isNum(b) ? snap(a + b, a, b) : math.add(a, b);
      case '-': return isNum(a) && isNum(b) ? snap(a - b, a, -b) : math.subtract(a, b);
      case '*':
        if (isMat(a) && isMat(b) && vecLike(a) && vecLike(b) && env.crossOnMul) return math.cross(vflat(a), vflat(b));
        return isNum(a) && isNum(b) ? a * b : math.multiply(a, b);
      case '/':
        if (isMat(b)) ERR('Math ERROR');
        if (isNum(b) && b === 0) ERR('Math ERROR');
        if (isCx(b) && b.re === 0 && b.im === 0) ERR('Math ERROR');
        return isNum(a) && isNum(b) ? a / b : math.divide(a, b);
      case '^': return power(a, b, env);
      case 'ℙ': return nPr(a, b);
      case 'ℂ': return nCr(a, b);
      case '∠': { const th = toRad(b, env); return cleanCx(math.complex({ r: a, phi: th })); }
      case '=': return { eq: true, l: a, r: b };
      case 'and': case 'or': case 'xor': case 'xnor': return baseBin(op, a, b, env);
    }
    ERR('Syntax ERROR');
  }
  function vecLike(m) { const s = math.size(m).valueOf(); return s.length === 1 || (s.length === 2 && (s[0] === 1 || s[1] === 1)); }
  function vflat(m) { return math.flatten(toMat(m)).valueOf(); }
  function power(a, b, env) {
    if (isMat(a)) { if (!isNum(b) || b !== Math.floor(b)) ERR('Math ERROR'); return math.pow(a, b); }
    if (isNum(a) && isNum(b)) {
      if (a === 0 && b <= 0) ERR('Math ERROR');
      if (a < 0 && b !== Math.floor(b)) {
        // odd-denominator rational exponent -> real root
        const f = toFraction(b, 99);
        if (f && f.d % 2 === 1) { const r = Math.pow(-a, b); return (f.n % 2 ? -r : r); }
        if (env.complex) return cleanCx(math.pow(math.complex(a, 0), b));
        ERR('Math ERROR');
      }
      const r = Math.pow(a, b);
      return r;
    }
    return cleanCx(math.pow(a, b));
  }
  function nroot(x, n, env) { // n-th root of x
    if (isNum(x) && isNum(n)) {
      if (n === 0) ERR('Math ERROR');
      if (x < 0) { if (Math.abs(n % 2) === 1) return -Math.pow(-x, 1 / n); if (env.complex) return cleanCx(math.pow(math.complex(x, 0), 1 / n)); ERR('Math ERROR'); }
      const r = Math.pow(x, 1 / n); const rr = Math.round(r); return Math.abs(r - rr) < 1e-12 * Math.max(1, rr) && Math.abs(Math.pow(rr, n) - x) < 1e-9 * Math.abs(x) ? rr : r;
    }
    return math.pow(x, math.divide(1, n));
  }
  function sqrt(x, env) {
    if (isNum(x)) { if (x < 0) { if (env.complex) return math.complex(0, Math.sqrt(-x)); ERR('Math ERROR'); } return Math.sqrt(x); }
    return cleanCx(math.sqrt(x));
  }
  function logf(x, env, base) {
    if (isNum(x) && x > 0) { if (base === 10) { const r = Math.log10(x); const rr = Math.round(r); return Math.abs(r - rr) < 1e-13 ? rr : r; } return Math.log(x); }
    if (isNum(x) && x <= 0 && !env.complex) ERR('Math ERROR');
    if (isNum(x) && x === 0) ERR('Math ERROR');
    return cleanCx(base === 10 ? math.log10(x) : math.log(x));
  }

  // Base-N integer arithmetic (32-bit two's complement)
  function toInt32(x) { if (!isNum(x)) ERR('Math ERROR'); if (x !== Math.floor(x)) x = Math.trunc(x); if (x > 4294967295 || x < -2147483648) ERR('Math ERROR'); return x | 0; }
  function baseBin(op, a, b, env) {
    a = toInt32(a); b = toInt32(b); let r;
    switch (op) {
      case '+': r = a + b; break; case '-': r = a - b; break; case '*': r = a * b; break;
      case '/': if (b === 0) ERR('Math ERROR'); r = Math.trunc(a / b); break;
      case 'and': r = a & b; break; case 'or': r = a | b; break; case 'xor': r = a ^ b; break; case 'xnor': r = ~(a ^ b); break;
      default: ERR('Syntax ERROR');
    }
    if (r > 2147483647 || r < -2147483648) ERR('Math ERROR');
    return r | 0;
  }

  const FUNCS = {
    sin: (a, e) => trig('sin', a[0], e), cos: (a, e) => trig('cos', a[0], e), tan: (a, e) => trig('tan', a[0], e),
    asin: (a, e) => atrig('asin', a[0], e), acos: (a, e) => atrig('acos', a[0], e), atan: (a, e) => atrig('atan', a[0], e),
    sinh: (a) => isNum(a[0]) ? Math.sinh(a[0]) : math.sinh(a[0]), cosh: (a) => isNum(a[0]) ? Math.cosh(a[0]) : math.cosh(a[0]), tanh: (a) => isNum(a[0]) ? Math.tanh(a[0]) : math.tanh(a[0]),
    asinh: (a) => Math.asinh(a[0]), acosh: (a, e) => { if (a[0] < 1) ERR('Math ERROR'); return Math.acosh(a[0]); }, atanh: (a) => { if (Math.abs(a[0]) >= 1) ERR('Math ERROR'); return Math.atanh(a[0]); },
    log: (a, e) => a.length > 1 ? divLog(a[0], a[1], e) : logf(a[0], e, 10),
    logab: (a, e) => divLog(a[0], a[1], e),
    ln: (a, e) => logf(a[0], e, 0),
    exp: (a) => isNum(a[0]) ? Math.exp(a[0]) : math.exp(a[0]),
    pow10: (a) => isNum(a[0]) ? (a[0] === Math.round(a[0]) ? parseFloat('1e' + a[0]) : Math.pow(10, a[0])) : math.pow(10, a[0]),
    sqrt: (a, e) => sqrt(a[0], e), cbrt: (a) => isNum(a[0]) ? nroot(a[0], 3, {}) : math.cbrt(a[0]),
    nroot: (a, e) => nroot(a[1], a[0], e), // nroot(n, x)
    abs: (a) => isNum(a[0]) ? Math.abs(a[0]) : (isMat(a[0]) ? math.norm(vflat(a[0])) : math.abs(a[0])),
    int: (a) => Math.trunc(a[0]), intg: (a) => Math.floor(a[0]), frac: (a) => a[0] - Math.trunc(a[0]),
    rnd: (a, e) => { const s = formatNumber(a[0], e.fmt || { mode: 'norm1' }); return parseFloat(s.mant + (s.exp != null ? 'e' + s.exp : '')); },
    round: (a) => { const d = a[1] || 0; return Math.round(a[0] * Math.pow(10, d)) / Math.pow(10, d); },
    ran: (a, e) => Math.floor(e.random() * 1000) / 1000,
    ranint: (a, e) => { const lo = Math.ceil(a[0]), hi = Math.floor(a[1]); if (hi < lo) ERR('Math ERROR'); return lo + Math.floor(e.random() * (hi - lo + 1)); },
    gcd: (a) => gcd(a[0], a[1]), lcm: (a) => lcm(a[0], a[1]),
    mod: (a) => { if (a[1] === 0) ERR('Math ERROR'); return a[0] - a[1] * Math.floor(a[0] / a[1]); },
    fact: (a, e) => factorial(a[0], e),
    npr: (a) => nPr(a[0], a[1]), ncr: (a) => nCr(a[0], a[1]),
    pol: (a, e) => { const r = Math.hypot(a[0], a[1]); const th = fromRad(Math.atan2(a[1], a[0]), e); e.vars.X = r; e.vars.Y = th; e.multi = [['r', r], ['θ', th]]; return r; },
    rec: (a, e) => { const x = a[0] * trig('cos', a[1], e), y = a[0] * trig('sin', a[1], e); e.vars.X = x; e.vars.Y = y; e.multi = [['x', x], ['y', y]]; return x; },
    conj: (a) => isNum(a[0]) ? a[0] : math.conj(a[0]),
    arg: (a, e) => isNum(a[0]) ? (a[0] < 0 ? fromRad(Math.PI, e) : 0) : fromRad(math.arg(a[0]), e),
    re: (a) => isNum(a[0]) ? a[0] : math.re(a[0]), im: (a) => isNum(a[0]) ? 0 : math.im(a[0]),
    det: (a) => { const m = toMat(a[0]); if (!isMat(m)) ERR('Math ERROR'); const s = math.size(m).valueOf(); if (s[0] !== s[1]) ERR('Dimension ERROR'); return round15(math.det(m)); },
    trn: (a) => math.transpose(toMat(a[0])),
    inv: (a) => { if (isMat(a[0])) { if (Math.abs(math.det(toMat(a[0]))) < 1e-300) ERR('Math ERROR'); return math.inv(toMat(a[0])); } if (a[0] === 0) ERR('Math ERROR'); return isNum(a[0]) ? 1 / a[0] : math.divide(1, a[0]); },
    identity: (a) => math.identity(a[0]),
    dot: (a) => math.dot(vflat(a[0]), vflat(a[1])),
    cross: (a) => math.cross(vflat(a[0]), vflat(a[1])),
    unitv: (a) => math.divide(toMat(a[0]), math.norm(vflat(a[0]))),
    angle: (a, e) => fromRad(Math.acos(Math.max(-1, Math.min(1, math.dot(vflat(a[0]), vflat(a[1])) / (math.norm(vflat(a[0])) * math.norm(vflat(a[1])))))), e),
    not: (a) => ~toInt32(a[0]), neg: (a) => (-toInt32(a[0])) | 0,
    max: (a) => Math.max.apply(null, flatArgs(a)), min: (a) => Math.min.apply(null, flatArgs(a)),
    sum: (a) => flatArgs(a).reduce((s, x) => s + x, 0),
    mean: (a) => { const v = flatArgs(a); return v.reduce((s, x) => s + x, 0) / v.length; },
    floor: (a) => Math.floor(a[0]), ceil: (a) => Math.ceil(a[0]), sign: (a) => Math.sign(a[0]),
    torect: (a) => a[0], topolar: (a) => a[0],
    todeg: (a, e) => a[0] * 180 / Math.PI, torad: (a) => a[0] * Math.PI / 180,
  };
  function flatArgs(a) { const r = []; a.forEach(x => { if (Array.isArray(x)) r.push(...x); else if (isMat(x)) r.push(...math.flatten(x).valueOf()); else r.push(x); }); return r; }
  function divLog(b, x, e) { const lb = logf(b, e, 0), lx = logf(x, e, 0); if (lb === 0) ERR('Math ERROR'); const r = lx / lb; const rr = Math.round(r); return Math.abs(r - rr) < 1e-13 ? rr : r; }

  // Lazy (higher-order) functions: integrals, derivatives, sums, products, solve
  const LAZY = {
    integ: (args, env) => { const [f, a, b] = args; const A = evalNode(a, env), B = evalNode(b, env); return integrate(x => withVar(env, 'X', x, () => evalNode(f, env)), A, B); },
    deriv: (args, env) => { const [f, at] = args; const x0 = evalNode(at, env); return derivative(x => withVar(env, 'X', x, () => evalNode(f, env)), x0); },
    sigma: (args, env) => { const [f, a, b] = args; const A = evalNode(a, env), B = evalNode(b, env); if (A !== Math.floor(A) || B !== Math.floor(B) || B < A || B - A > 1e6) ERR('Math ERROR'); let s = 0; for (let k = A; k <= B; k++) s = binop('+', s, withVar(env, 'X', k, () => evalNode(f, env)), env); return s; },
    prodf: (args, env) => { const [f, a, b] = args; const A = evalNode(a, env), B = evalNode(b, env); if (B < A || B - A > 1e6) ERR('Math ERROR'); let s = 1; for (let k = A; k <= B; k++) s = binop('*', s, withVar(env, 'X', k, () => evalNode(f, env)), env); return s; },
  };
  function withVar(env, name, val, fn) { const old = env.vars[name]; env.vars[name] = val; try { return checkReal(fn(), env); } finally { env.vars[name] = old; } }

  function evalNode(n, env) {
    switch (n.t) {
      case 'num': return n.v;
      case 'str': return n.v;
      case 'group': return evalNode(n.a, env);
      case 'const': return n.n === 'pi' ? Math.PI : n.n === 'e' ? Math.E : math.complex(0, 1);
      case 'var': {
        const nm = n.n;
        if (nm === 'Ans' || nm === 'ans') return env.ans;
        if (nm === 'PreAns') return env.preAns || 0;
        if (env.vars[nm] !== undefined) return env.vars[nm];
        if (env.constants && env.constants[nm] !== undefined) return env.constants[nm];
        if (/^[A-Zθ]$|^[a-z]$|^M$/.test(nm)) return 0;
        ERR('Syntax ERROR');
      }
      case 'neg': { const a = evalNode(n.a, env); return env.base ? (-toInt32(a)) | 0 : (isNum(a) ? -a : math.unaryMinus(a)); }
      case 'post': {
        const a = evalNode(n.a, env);
        switch (n.op) {
          case '²': return binop('*', a, a, env);
          case '³': return env.base ? baseBin('*', baseBin('*', a, a, env), a, env) : (isNum(a) ? a * a * a : math.pow(a, 3));
          case 'ˉ': return FUNCS.inv([a], env);
          case '!': return factorial(a, env);
          case '%': return isNum(a) ? a / 100 : math.divide(a, 100);
          case '°': return a; // DMS degrees value
          case '′': return a / 60; case '″': return a / 3600;
          case 'ᴰ': return a * ANG.deg / ANG[env.angle];
          case 'ʳ': return a * ANG.rad / ANG[env.angle];
          case 'ᵍ': return a * ANG.grad / ANG[env.angle];
        }
        ERR('Syntax ERROR');
      }
      case 'dms': { const d = evalNode(n.d, env), m = evalNode(n.m, env), s = evalNode(n.s, env); const sg = d < 0 ? -1 : 1; return sg * (Math.abs(d) + m / 60 + s / 3600); }
      case 'mixed': { const w = evalNode(n.w, env), a = evalNode(n.n, env), b = evalNode(n.d, env); if (b === 0) ERR('Math ERROR'); return w < 0 ? w - a / b : w + a / b; }
      case 'bin': return checkReal(binop(n.op, evalNode(n.a, env), evalNode(n.b, env), env), env);
      case 'list': return n.items.map(x => evalNode(x, env));
      case 'mat': {
        const rows = n.rows.map(r => evalNode(r, env));
        const arr = rows.map(r => isMat(r) ? (r.valueOf ? r.valueOf() : r) : r);
        return math.matrix(arr);
      }
      case 'call': {
        const f = n.f;
        if (LAZY[f]) return checkReal(LAZY[f](n.args, env), env);
        if (env.fns[f]) { // user function f(x) defined by AST
          const def = env.fns[f]; const val = evalNode(n.args[0], env);
          return withVar(env, def.v || 'X', val, () => evalNode(def.ast, env));
        }
        const fn = FUNCS[f];
        if (!fn) { // implicit multiplication of variable by group, e.g. A(2)
          if (/^[A-Zθ]$/.test(f)) { const v = evalNode({ t: 'var', n: f }, env); return binop('*', v, evalNode(n.args[0] || { t: 'num', v: 1 }, env), env); }
          ERR('Syntax ERROR');
        }
        const args = n.args.map(a => evalNode(a, env));
        if (!args.length && !['ran'].includes(f)) ERR('Syntax ERROR');
        return checkReal(fn(args, env), env);
      }
    }
    ERR('Syntax ERROR');
  }

  function evaluate(src, envOpts) {
    const env = envOpts && envOpts.__env ? envOpts : makeEnv(envOpts);
    const ast = typeof src === 'string' ? parse(src, { implicitHigh: env.implicitHigh }) : src;
    env.multi = null;
    let v = evalNode(ast, env);
    if (v && v.eq) v = v.l; // "A=B" in plain calc returns left (ignored)
    v = checkReal(v, env);
    if (isNum(v)) v = round15(v);
    if (isCx(v)) v = cleanCx(math.complex(round15(v.re), round15(v.im)));
    return v;
  }

  // ---------------- Numeric tools ----------------
  function integrate(f, a, b) {
    if (a === b) return 0;
    // adaptive Gauss-Kronrod 7-15
    const xgk = [0.991455371120813, 0.949107912342759, 0.864864423359769, 0.741531185599394, 0.586087235467691, 0.405845151377397, 0.207784955007898, 0];
    const wgk = [0.022935322010529, 0.063092092629979, 0.104790010322250, 0.140653259715525, 0.169004726639267, 0.190350578064785, 0.204432940075298, 0.209482141084728];
    const wg = [0.129484966168870, 0.279705391489277, 0.381830050505119, 0.417959183673469];
    function gk(a, b) {
      const c = (a + b) / 2, h = (b - a) / 2; const fc = f(c);
      let rk = fc * wgk[7], rg = fc * wg[3];
      for (let j = 0; j < 7; j++) {
        const dx = h * xgk[j]; const s = f(c - dx) + f(c + dx);
        rk += wgk[j] * s; if (j % 2 === 1) rg += wg[(j - 1) / 2] * s;
      }
      return [rk * h, Math.abs((rk - rg) * h)];
    }
    let total = 0, count = 0;
    function rec(a, b, tol, depth) {
      const [r, err] = gk(a, b); count++;
      if (count > 4000) ERR('Time Out');
      if (err <= tol || depth > 40) return r;
      const m = (a + b) / 2; return rec(a, m, tol / 2, depth + 1) + rec(m, b, tol / 2, depth + 1);
    }
    total = rec(a, b, 1e-11, 0);
    if (!isFinite(total)) ERR('Math ERROR');
    return Math.abs(total) < 1e-13 ? 0 : total;
  }
  function derivative(f, x) {
    // Ridders' method
    let h = Math.max(1e-3, Math.abs(x) * 1e-3); const ntab = 10; const a = [];
    let best = NaN, err = Infinity;
    a[0] = [(f(x + h) - f(x - h)) / (2 * h)];
    for (let i = 1; i < ntab; i++) {
      h /= 1.4; a[i] = [(f(x + h) - f(x - h)) / (2 * h)]; let fac = 1.96;
      for (let j = 1; j <= i; j++) {
        a[i][j] = (a[i][j - 1] * fac - a[i - 1][j - 1]) / (fac - 1); fac *= 1.96;
        const e = Math.max(Math.abs(a[i][j] - a[i][j - 1]), Math.abs(a[i][j] - a[i - 1][j - 1]));
        if (e <= err) { err = e; best = a[i][j]; }
      }
      if (Math.abs(a[i][i] - a[i - 1][i - 1]) >= 2 * err) break;
    }
    if (!isFinite(best)) ERR('Math ERROR');
    const r = Math.round(best * 1e9) / 1e9; return Math.abs(best - r) < 1e-9 * Math.max(1, Math.abs(best)) ? r : best;
  }
  function solve(f, x0) {
    // Newton with numeric derivative, fallback to bracket search + bisection
    let x = isFinite(x0) ? x0 : 0;
    const g = (t) => { try { const v = f(t); return isFinite(v) ? v : NaN; } catch (e) { return NaN; } };
    for (let it = 0; it < 200; it++) {
      const fx = g(x); if (isNaN(fx)) break;
      if (Math.abs(fx) < 1e-15) return clean(x);
      const h = Math.max(1e-8, Math.abs(x) * 1e-8); const d = (g(x + h) - g(x - h)) / (2 * h);
      if (!isFinite(d) || d === 0) break;
      let xn = x - fx / d;
      if (Math.abs(xn - x) <= 1e-14 * Math.max(1, Math.abs(x))) { x = xn; if (Math.abs(g(x)) < 1e-9 * Math.max(1, Math.abs(fx))) return clean(x); break; }
      x = xn;
    }
    if (isFinite(x) && Math.abs(g(x)) < 1e-10) return clean(x);
    // bracket search
    const start = isFinite(x0) ? x0 : 0;
    for (let span = 1; span < 1e8; span *= 2) {
      const pts = 40; let prevX = start - span, prev = g(prevX);
      for (let k = 1; k <= pts; k++) {
        const xx = start - span + (2 * span * k) / pts; const v = g(xx);
        if (!isNaN(prev) && !isNaN(v) && prev * v <= 0) return clean(bisect(g, prevX, xx));
        prevX = xx; prev = v;
      }
    }
    ERR("Can't Solve");
    function clean(v) { const r = Math.round(v); if (Math.abs(v - r) < 1e-10) return r; return round15(v); }
  }
  function bisect(g, a, b) { let fa = g(a); for (let i = 0; i < 200; i++) { const m = (a + b) / 2, fm = g(m); if (fm === 0) return m; if (fa * fm < 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; }

  // polynomial roots (coefficients highest first) -> array of numbers or complex
  function polyRoots(c) {
    while (c.length && c[0] === 0) c = c.slice(1);
    const n = c.length - 1; if (n < 1) ERR('Math ERROR');
    if (n === 1) return [-c[1] / c[0]];
    if (n === 2) {
      const [a, b, cc] = c; const D = b * b - 4 * a * cc;
      if (Math.abs(D) < 1e-14 * b * b) return [-b / (2 * a)];
      if (D >= 0) { const s = Math.sqrt(D); const q = -0.5 * (b + Math.sign(b || 1) * s); const r = [q / a, cc / q].sort((x, y) => y - x); return r.map(round15); }
      const s = Math.sqrt(-D) / (2 * a); return [cleanCx(math.complex(round15(-b / (2 * a)), round15(Math.abs(s)))), cleanCx(math.complex(round15(-b / (2 * a)), -round15(Math.abs(s))))];
    }
    // Durand–Kerner
    const a0 = c[0]; const co = c.map(x => x / a0);
    let z = []; for (let i = 0; i < n; i++) z.push(math.complex({ r: 1 + Math.abs(co[n]) ** (1 / n), phi: 2 * Math.PI * i / n + 0.4 }));
    const P = (x) => co.reduce((s, k) => math.add(math.multiply(s, x), k), math.complex(0, 0));
    for (let it = 0; it < 2000; it++) {
      let delta = 0;
      z = z.map((zi, i) => { let den = math.complex(1, 0); z.forEach((zj, j) => { if (i !== j) den = math.multiply(den, math.subtract(zi, zj)); }); const d = math.divide(P(zi), den); delta = Math.max(delta, math.abs(d)); return math.subtract(zi, d); });
      if (delta < 1e-15) break;
    }
    // polish with Newton
    const dco = co.slice(0, -1).map((k, i) => k * (n - i));
    const D = (x) => dco.reduce((s, k) => math.add(math.multiply(s, x), k), math.complex(0, 0));
    z = z.map(zi => { for (let k = 0; k < 5; k++) { const d = D(zi); if (math.abs(d) === 0) break; zi = math.subtract(zi, math.divide(P(zi), d)); } return zi; });
    const res = z.map(zi => { let re = round15(zi.re), im = round15(zi.im); if (Math.abs(im) < 1e-10 * Math.max(1, Math.abs(re))) im = 0; if (Math.abs(re - Math.round(re)) < 1e-10) re = Math.round(re); return im === 0 ? re : math.complex(re, im); });
    res.sort((p, q) => { const pr = isNum(p), qr = isNum(q); if (pr && qr) return q - p; if (pr) return -1; if (qr) return 1; return q.im - p.im; });
    return res;
  }
  function solveLinear(A, b) { // Gaussian elimination with partial pivoting
    const n = A.length; const M = A.map((r, i) => r.slice().concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-13) ERR('No Solution');
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => { const v = r[n] / r[i]; const rr = Math.round(v); return Math.abs(v - rr) < 1e-11 ? rr : round15(v); });
  }

  // ---------------- Statistics ----------------
  function stats(xs, ys, freq) {
    const n0 = xs.length; const f = freq || xs.map(() => 1);
    let n = 0, sx = 0, sx2 = 0, sy = 0, sy2 = 0, sxy = 0, sx3 = 0, sx4 = 0, sx2y = 0;
    for (let i = 0; i < n0; i++) { const x = xs[i], w = f[i]; n += w; sx += w * x; sx2 += w * x * x; sx3 += w * x ** 3; sx4 += w * x ** 4; if (ys) { const y = ys[i]; sy += w * y; sy2 += w * y * y; sxy += w * x * y; sx2y += w * x * x * y; } }
    const r = { n, Σx: sx, Σx2: sx2, mean: sx / n };
    r.σx = Math.sqrt(Math.max(0, sx2 / n - r.mean ** 2)); r.sx = n > 1 ? Math.sqrt(Math.max(0, (sx2 - n * r.mean ** 2) / (n - 1))) : NaN;
    const sorted = []; xs.forEach((x, i) => { for (let k = 0; k < f[i]; k++) sorted.push(x); }); sorted.sort((a, b) => a - b);
    r.min = sorted[0]; r.max = sorted[sorted.length - 1];
    const med = (arr) => { const m = arr.length; return m % 2 ? arr[(m - 1) / 2] : (arr[m / 2 - 1] + arr[m / 2]) / 2; };
    r.med = med(sorted); const h = Math.floor(sorted.length / 2);
    r.Q1 = sorted.length > 1 ? med(sorted.slice(0, h)) : sorted[0]; r.Q3 = sorted.length > 1 ? med(sorted.slice(sorted.length % 2 ? h + 1 : h)) : sorted[0];
    if (ys) {
      Object.assign(r, { Σy: sy, Σy2: sy2, Σxy: sxy, Σx3: sx3, Σx4: sx4, Σx2y: sx2y, ymean: sy / n });
      r.σy = Math.sqrt(Math.max(0, sy2 / n - r.ymean ** 2)); r.sy = n > 1 ? Math.sqrt(Math.max(0, (sy2 - n * r.ymean ** 2) / (n - 1))) : NaN;
      const Sxx = sx2 - sx * sx / n, Syy = sy2 - sy * sy / n, Sxy = sxy - sx * sy / n;
      r.b = Sxy / Sxx; r.a = r.ymean - r.b * r.mean; r.r = Sxy / Math.sqrt(Sxx * Syy);
    }
    for (const k in r) if (typeof r[k] === 'number') r[k] = round15(r[k]);
    return r;
  }
  // regression types: lin a+bx, quad a+bx+cx², log a+b·lnx, exp a·e^(bx), abx a·b^x, pow a·x^b, inv a+b/x
  function regression(type, xs, ys) {
    const lin = (X, Y) => { const s = stats(X, Y); return { a: s.a, b: s.b, r: s.r }; };
    switch (type) {
      case 'lin': return Object.assign(lin(xs, ys), { f: (x, c) => c.a + c.b * x, label: 'y=a+bx' });
      case 'log': return Object.assign(lin(xs.map(Math.log), ys), { f: (x, c) => c.a + c.b * Math.log(x), label: 'y=a+b·ln x' });
      case 'inv': return Object.assign(lin(xs.map(x => 1 / x), ys), { f: (x, c) => c.a + c.b / x, label: 'y=a+b/x' });
      case 'exp': { const l = lin(xs, ys.map(Math.log)); return { a: Math.exp(l.a), b: l.b, r: l.r, f: (x, c) => c.a * Math.exp(c.b * x), label: 'y=a·e^(bx)' }; }
      case 'abx': { const l = lin(xs, ys.map(Math.log)); return { a: Math.exp(l.a), b: Math.exp(l.b), r: l.r, f: (x, c) => c.a * Math.pow(c.b, x), label: 'y=a·b^x' }; }
      case 'pow': { const l = lin(xs.map(Math.log), ys.map(Math.log)); return { a: Math.exp(l.a), b: l.b, r: l.r, f: (x, c) => c.a * Math.pow(x, c.b), label: 'y=a·x^b' }; }
      case 'quad': {
        const n = xs.length; const S = (p, q) => xs.reduce((s, x, i) => s + x ** p * (q ? ys[i] : 1), 0);
        const sol = solveLinear([[n, S(1), S(2)], [S(1), S(2), S(3)], [S(2), S(3), S(4)]], [S(0, 1), S(1, 1), S(2, 1)]);
        return { a: sol[0], b: sol[1], c: sol[2], f: (x, c) => c.a + c.b * x + c.c * x * x, label: 'y=a+bx+cx²' };
      }
    }
    ERR('Math ERROR');
  }

  // ---------------- Financial ----------------
  // TVM with sign convention (cash out negative). i = nominal annual % (I/Y), py payments/yr, cy compounding/yr, bgn boolean
  function tvmRate(iy, py, cy) { const i = iy / 100; if (cy === py) return i / py; return Math.pow(1 + i / cy, cy / py) - 1; }
  function tvmEq(N, iy, PV, PMT, FV, py, cy, bgn) {
    const r = tvmRate(iy, py || 1, cy || py || 1);
    if (Math.abs(r) < 1e-14) return PV + PMT * N + FV;
    const g = Math.pow(1 + r, N); const k = bgn ? 1 + r : 1;
    return PV * g + PMT * k * (g - 1) / r + FV;
  }
  function tvmSolve(which, v) { // v: {N, IY, PV, PMT, FV, PY, CY, BGN}
    const py = v.PY || 1, cy = v.CY || py, bgn = !!v.BGN;
    const r = tvmRate(v.IY, py, cy); const k = bgn ? 1 + r : 1;
    switch (which) {
      case 'PV': { if (Math.abs(r) < 1e-14) return -(v.PMT * v.N + v.FV); const g = Math.pow(1 + r, v.N); return round15(-(v.FV + v.PMT * k * (g - 1) / r) / g); }
      case 'FV': { if (Math.abs(r) < 1e-14) return -(v.PV + v.PMT * v.N); const g = Math.pow(1 + r, v.N); return round15(-(v.PV * g + v.PMT * k * (g - 1) / r)); }
      case 'PMT': { if (Math.abs(r) < 1e-14) { if (!v.N) ERR('Error 5'); return -(v.PV + v.FV) / v.N; } const g = Math.pow(1 + r, v.N); return round15(-(v.FV + v.PV * g) * r / (k * (g - 1))); }
      case 'N': {
        if (Math.abs(r) < 1e-14) { if (!v.PMT) ERR('Error 5'); return -(v.PV + v.FV) / v.PMT; }
        const num = v.PMT * k - v.FV * r, den = v.PMT * k + v.PV * r;
        if (num / den <= 0) ERR('Error 5');
        return round15(Math.log(num / den) / Math.log(1 + r));
      }
      case 'IY': {
        const f = (iy) => tvmEq(v.N, iy, v.PV, v.PMT, v.FV, py, cy, bgn);
        let x = 10; // percent guess
        for (let it = 0; it < 100; it++) { const fx = f(x); const h = 1e-6; const d = (f(x + h) - f(x - h)) / (2 * h); if (!isFinite(d) || d === 0) break; const xn = x - fx / d; if (Math.abs(xn - x) < 1e-12) { x = xn; break; } x = xn; if (x <= -100 * py) x = -99 * py; }
        if (!isFinite(x) || Math.abs(f(x)) > 1e-6 * (Math.abs(v.PV) + Math.abs(v.FV) + Math.abs(v.PMT) + 1)) {
          // scan
          let found = null, prev = f(-99), px = -99; for (let t = -98; t <= 1000; t += 0.5) { const ft = f(t); if (prev * ft <= 0) { found = bisect(f, px, t); break; } prev = ft; px = t; }
          if (found == null) ERR('Error 5'); x = found;
        }
        return round15(x);
      }
    }
  }
  function npv(rate, cfs) { // cfs: [{v, n}] first is CF0
    const r = rate / 100; let t = 0, s = 0;
    cfs.forEach((c, idx) => { const cnt = idx === 0 ? 1 : (c.n || 1); for (let k = 0; k < cnt; k++) { s += c.v / Math.pow(1 + r, t); t++; } });
    return round15(s);
  }
  function irr(cfs) {
    const f = (x) => npv(x, cfs);
    let x = 10; for (let it = 0; it < 100; it++) { const fx = f(x), h = 1e-5, d = (f(x + h) - f(x - h)) / (2 * h); if (!d) break; const xn = x - fx / d; if (Math.abs(xn - x) < 1e-10) { x = xn; break; } x = Math.max(-99.9, xn); }
    if (!isFinite(x) || Math.abs(f(x)) > 1e-6 * Math.max(1, Math.abs(cfs[0].v))) ERR('Error 5');
    return round15(x);
  }
  function amort(v, p1, p2) { // returns {bal, prn, int}; interest rounded to 2 dp per period like financial calcs
    const py = v.PY || 1, cy = v.CY || py; const r = tvmRate(v.IY, py, cy); const pmt = v.PMT;
    let bal = v.PV, prn = 0, int = 0;
    for (let k = 1; k <= p2; k++) {
      let ik = (v.BGN && k === 1) ? 0 : bal * r;
      if (v.round !== false) ik = Math.round(ik * 100) / 100;
      const principal = pmt + ik;
      if (k >= p1) { int += -ik; prn += principal; }
      bal = bal + principal;
    }
    return { bal: round15(bal), prn: round15(prn), int: round15(int) };
  }
  // business: cost / sell / margin % (two known -> third)
  function csm(cost, sell, mar) {
    if (cost != null && mar != null && sell == null) { if (mar >= 100) ERR('E'); return round15(cost / (1 - mar / 100)); }
    if (sell != null && mar != null && cost == null) return round15(sell * (1 - mar / 100));
    if (cost != null && sell != null) { if (!sell) ERR('E'); return round15((sell - cost) / sell * 100); }
    ERR('E');
  }

  // ---------------- Fractions / exact forms ----------------
  function toFraction(x, maxDen) {
    maxDen = maxDen || 1e6; if (!isFinite(x)) return null;
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
    for (let i = 0; i < 40; i++) {
      const a = Math.floor(b); const h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(x - h1 / k1) <= 1e-12 * Math.max(1, x)) return { n: sign * h1, d: k1 };
      const fr = b - a; if (fr < 1e-15) break; b = 1 / fr;
    }
    if (k1 && Math.abs(x - h1 / k1) <= 1e-12 * Math.max(1, x)) return { n: sign * h1, d: k1 };
    return null;
  }
  function fracDigits(f) { return String(Math.abs(f.n)).length + String(f.d).length; }
  // exact form for natural display: returns {kind:'int'|'frac'|'surd'|'pi', ...} or null
  function exactForm(x, hint) {
    hint = hint || {};
    if (!isNum(x) || !isFinite(x)) return null;
    if (x === Math.round(x) && Math.abs(x) < 1e10) return { kind: 'int', n: x };
    const f = toFraction(x, 1e5);
    if (f && fracDigits(f) <= 10) return { kind: 'frac', n: f.n, d: f.d };
    if (hint.pi) { const g = toFraction(x / Math.PI, 1000); if (g && Math.abs(g.n) < 1000) return { kind: 'pi', n: g.n, d: g.d }; }
    if (hint.sqrt) { // x = (a√b)/c
      const sq = x * x; const g = toFraction(sq, 10000);
      if (g) {
        // x^2 = n/d  -> x = √(n d)/d ; simplify √(n d)
        let rad = Math.abs(g.n) * g.d; if (rad < 1e9) {
          let out = 1; for (let k = 2; k * k <= rad; k++) while (rad % (k * k) === 0) { rad /= k * k; out *= k; }
          let num = out, den = g.d; const gg = gcd(num, den); num /= gg; den /= gg;
          if (rad > 1 && rad < 10000) return { kind: 'surd', a: (x < 0 ? -1 : 1) * num, b: rad, c: den };
        }
      }
    }
    return null;
  }

  // ---------------- Number formatting ----------------
  // returns {mant: string, exp: number|null, neg}
  function formatNumber(x, opt) {
    opt = opt || {}; const mode = opt.mode || 'norm1'; const D = opt.digits || 10;
    if (!isFinite(x)) return { mant: 'Error', exp: null };
    if (x === 0) { if (mode === 'fix') return { mant: (0).toFixed(opt.n), exp: null }; if (mode === 'sci') return { mant: (0).toFixed(Math.max(0, (opt.n || 10) - 1)), exp: 0 }; return { mant: '0', exp: null }; }
    const ax = Math.abs(x); const neg = x < 0 ? '-' : '';
    const sciFmt = (sig) => {
      let e = Math.floor(Math.log10(ax)); let m = ax / Math.pow(10, e);
      let ms = m.toFixed(sig - 1); if (parseFloat(ms) >= 10) { e++; ms = (ax / Math.pow(10, e)).toFixed(sig - 1); }
      return { ms, e };
    };
    if (mode === 'sci') { const { ms, e } = sciFmt(opt.n || D); return { mant: neg + ms, exp: e }; }
    if (mode === 'eng') {
      let { ms, e } = sciFmt(D); let m = parseFloat(ms); let e3 = Math.floor(e / 3) * 3; m = m * Math.pow(10, e - e3);
      let s = trimZeros(m.toPrecision(D)); return { mant: neg + s, exp: e3 };
    }
    if (mode === 'fix') {
      const n = opt.n || 0;
      if (ax >= Math.pow(10, D) || (ax < 0.5 * Math.pow(10, -n) && false)) { const { ms, e } = sciFmt(D); return { mant: neg + trimZeros(ms), exp: e }; }
      let s = ax.toFixed(n); const intLen = s.split('.')[0].length;
      if (intLen + n > D) s = ax.toFixed(Math.max(0, D - intLen));
      return { mant: neg + s, exp: null };
    }
    // norm1 / norm2 / float
    const lo = mode === 'norm2' ? 1e-9 : (opt.lo || 0.01);
    const p = parseFloat(ax.toPrecision(D));
    if (p >= Math.pow(10, D) || p < lo) { const { ms, e } = sciFmt(D); return { mant: neg + trimZeros(ms), exp: e }; }
    // fixed: D significant digits total
    const intDigits = Math.floor(Math.log10(p)) + 1;
    let s = p.toFixed(Math.min(20, Math.max(0, D - intDigits))); s = trimZeros(s);
    return { mant: neg + s, exp: null };
  }
  function trimZeros(s) { if (s.indexOf('.') < 0) return s; s = s.replace(/0+$/, ''); return s.replace(/\.$/, ''); }
  function fmtPlain(x, opt) { // string like 1.23E5 or 1.23×10^5 (ascii)
    if (isCx(x)) return fmtComplex(x, opt);
    if (isMat(x)) return JSON.stringify(toMat(x).valueOf());
    if (Array.isArray(x)) return x.map(v => fmtPlain(v, opt)).join(',');
    const f = formatNumber(x, opt); return f.mant + (f.exp != null ? 'E' + f.exp : '');
  }
  function fmtComplex(z, opt) {
    opt = opt || {};
    if (opt.polar) { const r = math.abs(z), th = math.arg(z) / ANG[opt.angle || 'deg']; return fmtPlain(round15(r), opt) + '∠' + fmtPlain(round15(th), opt); }
    const re = round15(z.re), im = round15(z.im);
    const sre = re !== 0 ? fmtPlain(re, opt) : '';
    const aim = Math.abs(im); const sim = (aim === 1 ? '' : fmtPlain(aim, opt)) + 'i';
    if (!sre) return (im < 0 ? '-' : '') + sim;
    return sre + (im < 0 ? '-' : '+') + sim;
  }
  function toBase(x, base, bits) {
    bits = bits || 32; x = toInt32(x);
    if (base === 10) return String(x);
    let u = x >>> 0; if (bits < 32) u = u & ((1 << bits) - 1);
    return u.toString(base).toUpperCase();
  }
  function fromBase(s, base) { const v = parseInt(s, base); if (isNaN(v)) ERR('Syntax ERROR'); return base === 10 ? v : (v | 0); }
  function toDMS(x) {
    const sg = x < 0 ? -1 : 1; x = Math.abs(x); let d = Math.floor(x); let mf = (x - d) * 60; let m = Math.floor(mf + 1e-9); let s = (mf - m) * 60; s = Math.round(s * 100) / 100; if (s >= 60) { s -= 60; m++; } if (m >= 60) { m -= 60; d++; }
    return { d: sg * d, m, s, str: (sg < 0 ? '-' : '') + d + '°' + m + '°' + trimZeros(s.toFixed(2)) + '°' };
  }

  return { HINT, CalcError, tokenize, parse, evaluate, evalNode, makeEnv, formatNumber, fmtPlain, fmtComplex, toFraction, exactForm, integrate, derivative, solve, polyRoots, solveLinear, stats, regression, tvmSolve, tvmEq, npv, irr, amort, csm, toBase, fromBase, toDMS, round15, isNum, isCx, isMat, toMat, math, FUNCS, trimZeros, gcd };
});
