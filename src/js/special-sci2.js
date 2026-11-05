/* U-45 CALCULATORS v1.3 — #26 Programmer Base-N (prog), #42 Statistics & Probability (stat),
 * #28 One-Line Fraction & Measurement (frac1). Original code. */
(function (G) {
  'use strict';
  const C = G.SpecCore, MX = C.MX, MF = C.MF, SF = C.SF, esc = C.esc, DEG = C.DEG, fmtAny = C.fmtAny, fmtReal = C.fmtReal;
  const L = G.SpecLib, num = L.num, DataEd = L.DataEd, ST = L.ST, REG = L.REG;
  const D = G.SPEC_DEFS = G.SPEC_DEFS || {};

  // ============================ #26 prog ============================
  const BASEN = { 16: 'HEX', 10: 'DEC', 8: 'OCT', 2: 'BIN' };
  const BN = {
    mask: (S) => (1n << BigInt(S.ws)) - 1n,
    wrap: (S, v) => BigInt.asUintN(S.ws, v),
    sgn: (S, v) => S.signed ? BigInt.asIntN(S.ws, v) : BigInt.asUintN(S.ws, v),
    str(S, v, base) { return base === 10 ? BN.sgn(S, v).toString() : BN.wrap(S, v).toString(base).toUpperCase(); },
    group(s, n) { const out = []; for (let i = s.length; i > 0; i -= n) out.unshift(s.slice(Math.max(0, i - n), i)); return out.join(' '); },
  };
  function bnEval(S, s) {
    const toks = []; let i = 0;
    while (i < s.length) {
      const rest = s.slice(i), ch = s[i];
      if (ch === ' ') { i++; continue; }
      if (rest.startsWith('Ans')) { toks.push({ t: 'ans' }); i += 3; continue; }
      if (/^R[0-9]/.test(rest)) { toks.push({ t: 'reg', v: rest.slice(0, 2) }); i += 2; continue; }
      let m = /^[a-z][a-z0-9]*/.exec(rest); if (m) { toks.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
      m = /^[0-9A-F]+/.exec(rest); if (m) { toks.push({ t: 'n', v: m[0] }); i += m[0].length; continue; }
      if (rest.startsWith('<<') || rest.startsWith('>>')) { toks.push({ t: 'op', v: rest.slice(0, 2) }); i += 2; continue; }
      toks.push({ t: 'op', v: ch }); i++;
    }
    let p = 0; const peek = () => toks[p], next = () => toks[p++];
    const W = (v) => BN.wrap(S, v), SG = (v) => BN.sgn(S, v), ws = BigInt(S.ws);
    const BIN = [[['|', 'nor'], 1], [['^', 'xnor'], 2], [['&', 'nand'], 3], [['<<', '>>', 'rol', 'ror', 'asr'], 4], [['+', '-'], 5], [['*', '/', '%'], 6]];
    const prec = (tk) => { if (!tk || (tk.t !== 'op' && tk.t !== 'id')) return 0; for (const [ops, pr] of BIN) if (ops.includes(tk.v)) return pr; return 0; };
    const apply = (op, a, b) => {
      switch (op) {
        case '+': return W(a + b); case '-': return W(a - b); case '*': return W(a * b);
        case '/': if (W(b) === 0n) throw new Error('Divide by 0'); return S.signed ? W(SG(a) / SG(b)) : W(a) / W(b);
        case '%': if (W(b) === 0n) throw new Error('Divide by 0'); return S.signed ? W(SG(a) % SG(b)) : W(a) % W(b);
        case '&': return W(a & b); case '|': return W(a | b); case '^': return W(a ^ b);
        case 'nand': return W(~(a & b)); case 'nor': return W(~(a | b)); case 'xnor': return W(~(a ^ b));
        case '<<': return W(a << (W(b) % 256n)); case '>>': return W(a) >> (W(b) % 256n);
        case 'asr': return W(SG(a) >> (W(b) % 256n));
        case 'rol': { const k = W(b) % ws; return k ? W((W(a) << k) | (W(a) >> (ws - k))) : W(a); }
        case 'ror': { const k = W(b) % ws; return k ? W((W(a) >> k) | (W(a) << (ws - k))) : W(a); }
      }
      throw new Error('Syntax ERROR');
    };
    const pc = (a) => BigInt([...W(a).toString(2)].filter(c => c === '1').length);
    const FN = {
      pcnt: pc, par: (a) => pc(a) & 1n,
      clz: (a) => W(a) === 0n ? ws : ws - BigInt(W(a).toString(2).length),
      ctz: (a) => { a = W(a); if (a === 0n) return ws; let n = 0n; while (!(a & 1n)) { a >>= 1n; n++; } return n; },
      setb: (a, n) => W(a | (1n << n)), clrb: (a, n) => W(a & ~(1n << n)), flipb: (a, n) => W(a ^ (1n << n)), tstb: (a, n) => (W(a) >> n) & 1n,
      bswap: (a) => { a = W(a); let r = 0n; for (let k = 0n; k < ws / 8n; k++) r = (r << 8n) | ((a >> (8n * k)) & 255n); return r; },
      rbit: (a) => { a = W(a); let r = 0n; for (let k = 0n; k < ws; k++) r = (r << 1n) | ((a >> k) & 1n); return r; },
      gcd: (a, b) => { a = SG(a) < 0n ? -SG(a) : SG(a); b = SG(b) < 0n ? -SG(b) : SG(b); while (b) [a, b] = [b, a % b]; return a; },
      absv: (a) => { const v = SG(a); return W(v < 0n ? -v : v); }, sext: (a, n) => W(BigInt.asIntN(Number(n), a)),
      lsb: (a) => W(a) & W(-a), msb: (a) => { a = W(a); return a ? 1n << BigInt(a.toString(2).length - 1) : 0n; },
    };
    const prim = () => {
      const tk = next(); if (!tk) throw new Error('Syntax ERROR');
      if (tk.t === 'n') { const base = BigInt(S.base); let v = 0n; for (const c of tk.v) { const d = BigInt(parseInt(c, 16)); if (d >= base) throw new Error('Not a ' + BASEN[S.base] + ' digit'); v = v * base + d; } return W(v); }
      if (tk.t === 'ans') return S.ansBig || 0n;
      if (tk.t === 'reg') return S.regs[tk.v] || 0n;
      if (tk.t === 'op' && tk.v === '(') { const v = expr(0); if (peek() && peek().v === ')') next(); return v; }
      if (tk.t === 'op' && tk.v === '-') return W(-prim());
      if (tk.t === 'op' && tk.v === '~') return W(~prim());
      if (tk.t === 'id' && FN[tk.v]) {
        if (peek() && peek().v === '(') { next(); const args = []; if (!(peek() && peek().v === ')')) { args.push(expr(0)); while (peek() && peek().v === ',') { next(); args.push(expr(0)); } } if (peek() && peek().v === ')') next(); if (args.length < FN[tk.v].length) throw new Error('Argument ERROR'); return FN[tk.v](...args); }
        return FN[tk.v](prim());
      }
      throw new Error('Syntax ERROR');
    };
    const expr = (minP) => { let a = prim(); for (;;) { const tk = peek(), pr = prec(tk); if (!pr || pr <= minP) break; next(); a = apply(tk.v, a, expr(pr)); } return a; };
    const v = expr(0); if (p < toks.length) throw new Error('Syntax ERROR'); return v;
  }
  function progShow(S) {
    const v = S.ansBig || 0n;
    const aux = [16, 10, 8, 2].filter(b => b !== S.base).map(b => `<div class="sx-aux"><span>${BASEN[b]}</span>${esc(b === 2 ? BN.group(BN.str(S, v, 2), 4) : BN.str(S, v, b))}</div>`).join('');
    const bits = S.bitview ? `<div class="sx-bits">${BN.group(BN.wrap(S, v).toString(2).padStart(S.ws, '0'), 4).split(' ').map(g => `<span>${g}</span>`).join('')}</div>` : '';
    const cp = Number(BN.wrap(S, v) & 0x1FFFFFn), chr = S.showChr ? `<div class="sx-aux"><span>CHR</span>${esc(cp >= 32 && cp <= 0x10FFFF ? String.fromCodePoint(cp) : '·')}</div>` : '';
    return aux + bits + chr + `<div class="sx-main">${esc(BN.str(S, v, S.base))}</div>`;
  }
  const reshow = (S) => { if (S.fresh) { S.res = BN.str(S, S.ansBig, S.base); S.resHtml = progShow(S); } };
  const notDigit = (S, d) => { S.msg = d + ' is not a ' + BASEN[S.base] + ' digit'; return true; };
  D.prog = {
    family: 'sci', styleName: 'integer algebraic entry in the selected base (HEX/DEC/OCT/BIN), then =', histLines: 1,
    init(S) { S.base = 10; S.ws = 32; S.signed = true; S.ansBig = 0n; S.ans = 0n; S.regs = {}; S.bitview = false; S.showChr = false; },
    ind(S) { return BASEN[S.base] + ' ' + S.ws + 'b ' + (S.signed ? 'S' : 'U'); },
    toNum: (S, v) => Number(BN.sgn(S, v)),
    evaluate(S, src) { return bnEval(S, src); },
    format(S, v) { return typeof v === 'bigint' ? BN.str(S, v, S.base) : String(v); },
    resHtml(S, v) { S.ansBig = v; return progShow(S); },
    pre(S, act) {
      if (S.pend === 'psto' || S.pend === 'prcl') {
        const pd = S.pend; S.pend = null; const m = /^d(\d)$/.exec(act); if (!m) return true; const r = 'R' + m[1];
        if (pd === 'psto') { S.regs[r] = S.fresh || S.buf.empty ? S.ansBig : bnEval(S, S.buf.src()); S.msg = 'STO ' + r + ' = ' + BN.str(S, S.regs[r], S.base); } else S.typeTok(r, r);
        return true;
      }
      if (act.startsWith('hex:')) { const d = act.slice(4); if (parseInt(d, 16) >= S.base) return notDigit(S, d); S.typeTok(d); return true; }
      const m = /^d(\d)$/.exec(act); if (m && +m[1] >= S.base) return notDigit(S, m[1]);
      return false;
    },
    acts: {
      'base:16': (S) => { S.base = 16; reshow(S); }, 'base:10': (S) => { S.base = 10; reshow(S); }, 'base:8': (S) => { S.base = 8; reshow(S); }, 'base:2': (S) => { S.base = 2; reshow(S); },
      ws: (S) => { S.ws = { 8: 16, 16: 32, 32: 64, 64: 8 }[S.ws]; S.ansBig = BN.wrap(S, S.ansBig); reshow(S); S.msg = 'Word size ' + S.ws + ' bits'; },
      sign: (S) => { S.signed = !S.signed; reshow(S); S.msg = S.signed ? 'Signed (two’s complement)' : 'Unsigned'; },
      bits: (S) => { S.bitview = !S.bitview; S.fresh = true; S.res = BN.str(S, S.ansBig, S.base); S.resHtml = progShow(S); },
      chr: (S) => { S.showChr = !S.showChr; S.fresh = true; S.res = BN.str(S, S.ansBig, S.base); S.resHtml = progShow(S); },
      sto: (S) => { S.pend = 'psto'; S.msg = 'STO to R0–R9: press a digit'; }, rcl: (S) => { S.pend = 'prcl'; S.msg = 'RCL R0–R9: press a digit'; },
      ans: (S) => S.typeTok('Ans', 'Ans'), zz: (S) => { S.typeTok('0'); S.typeTok('0'); },
      and: (S) => S.typeTok('&', ' AND ', true), or: (S) => S.typeTok('|', ' OR ', true), xor: (S) => S.typeTok('^', ' XOR ', true),
      nand: (S) => S.typeTok(' nand ', ' NAND ', true), nor: (S) => S.typeTok(' nor ', ' NOR ', true), xnor: (S) => S.typeTok(' xnor ', ' XNOR ', true),
      not: (S) => S.typeTok('~', 'NOT '), neg: (S) => S.typeTok('-', '−'), shl: (S) => S.typeTok('<<', ' SHL ', true), shr: (S) => S.typeTok('>>', ' SHR ', true),
      rol: (S) => S.typeTok(' rol ', ' ROL ', true), ror: (S) => S.typeTok(' ror ', ' ROR ', true), asr: (S) => S.typeTok(' asr ', ' ASR ', true), mod: (S) => S.typeTok('%', ' MOD ', true),
      ascii: (S) => S.openMenu('CHARACTER → CODE', [...'AZaz09 !#$%&*+-/=?@'].map(ch => ({ t: `"${ch}" = ${ch.charCodeAt(0)} = 0x${ch.charCodeAt(0).toString(16).toUpperCase()}`, run: (A) => { A.buf.clear(); A.ansBig = BigInt(ch.charCodeAt(0)); A.ans = A.ansBig; A.fresh = true; A.res = BN.str(A, A.ansBig, A.base); A.resHtml = progShow(A); } }))),
      clrreg: (S) => { S.regs = {}; S.msg = 'R0–R9 cleared'; },
      regs: (S) => S.showInfo('Registers', Array.from({ length: 10 }, (_, i) => 'R' + i + ' = ' + BN.str(S, S.regs['R' + i] || 0n, S.base))),
      pmenu: (S) => L.catalog(S, 'BIT FUNCTIONS', [['POPCNT( count 1-bits', 'pcnt(', 'POPCNT('], ['CLZ( leading zeros', 'clz(', 'CLZ('], ['CTZ( trailing zeros', 'ctz(', 'CTZ('], ['PARITY(', 'par(', 'PARITY('], ['SETB(x,n)', 'setb(', 'SETB('], ['CLRB(x,n)', 'clrb(', 'CLRB('], ['FLIP(x,n)', 'flipb(', 'FLIP('], ['TSTB(x,n)', 'tstb(', 'TSTB('], ['BSWAP( byte swap', 'bswap(', 'BSWAP('], ['RBIT( reverse bits', 'rbit(', 'RBIT('], ['SEXT(x,n) sign-extend', 'sext(', 'SEXT('], ['LSB( lowest set bit', 'lsb(', 'LSB('], ['MSB( highest set bit', 'msb(', 'MSB('], ['ABS(', 'absv(', 'ABS('], ['GCD(a,b)', 'gcd(', 'GCD(']]),
      setup: (S) => S.openMenu('PROGRAMMER SETUP', [8, 16, 32, 64].map(w => ({ t: 'Word size ' + w + ' bits', run: (A) => { A.ws = w; A.ansBig = BN.wrap(A, A.ansBig); reshow(A); } })).concat([{ t: 'Signed', run: (A) => { A.signed = true; reshow(A); } }, { t: 'Unsigned', run: (A) => { A.signed = false; reshow(A); } }, { t: 'Reset', run: (A) => A.reset() }])),
    },
    features: [
      'Exact integer arithmetic on BigInt values (no rounding at any word size)', 'HEX, DEC, OCT and BIN entry and display modes', 'Hex digits A–F on dedicated keys (refused in DEC/OCT/BIN)',
      'Simultaneous view of the result in the three other bases', 'Word size 8 / 16 / 32 / 64 bits with wrap-around', 'Signed (two’s complement) or unsigned interpretation',
      'AND, OR, XOR bitwise operators', 'NAND, NOR, XNOR bitwise operators', 'NOT (one’s complement) and NEG (two’s complement)', 'Shift left SHL and logical shift right SHR',
      'Arithmetic shift right ASR (keeps the sign bit)', 'Rotate left ROL and rotate right ROR within the word size', 'Integer division ÷ (truncates toward zero) and MOD remainder',
      'C-like precedence: × ÷ MOD, then + −, shifts, AND, XOR, OR', 'Population count POPCNT', 'Count leading zeros CLZ and trailing zeros CTZ', 'Parity bit PARITY',
      'Set / clear / flip / test single bits SETB, CLRB, FLIP, TSTB', 'Byte swap BSWAP (endianness)', 'Bit reversal RBIT', 'Sign extension SEXT(x,n)', 'Lowest and highest set bit LSB / MSB',
      'GCD and ABS on integers', 'Bit-grid view of the whole word in groups of four', 'Character view: the result shown as a Unicode character', 'Character → code table (ASCII)',
      'Ten registers R0–R9 with STO / RCL and a register list', 'Ans in the current base', 'Brackets with precedence', 'History recall ▲▼ and cursor editing',
      'Base switch re-displays the last answer without recalculating', 'Clear error messages for divide by 0 and digits outside the base', 'Double-zero 00 key for fast entry',
    ],
    examples: [
      { kind: 'pand', title: 'Bitwise AND (decimal)', human: '12 AND 10', exp: 8, keys: ['d1', 'd2', 'and', 'd1', 'd0', 'exe'] },
      { kind: 'por', title: 'Bitwise OR', human: '12 OR 3', exp: 15, keys: ['d1', 'd2', 'or', 'd3', 'exe'] },
      { kind: 'pxor', title: 'Bitwise XOR', human: '15 XOR 5', exp: 10, keys: ['d1', 'd5', 'xor', 'd5', 'exe'] },
      { kind: 'pshl', title: 'Shift left', human: '1 SHL 10', exp: 1024, keys: ['d1', 'shl', 'd1', 'd0', 'exe'] },
      { kind: 'pmod', title: 'Remainder', human: '100 MOD 7', exp: 2, keys: ['d1', 'd0', 'd0', 'mod', 'd7', 'exe'] },
      { kind: 'pnot', title: 'One’s complement of 0 (signed)', human: 'NOT 0', exp: -1, keys: ['not', 'd0', 'exe'] },
      { kind: 'pdiv', title: 'Integer division', human: '17 ÷ 5', exp: 3, keys: ['d1', 'd7', 'div', 'd5', 'exe'] },
      { kind: 'pcnt', title: 'Population count', human: 'POPCNT(255)', exp: 8, keys: ['ins:pcnt(|POPCNT(', 'd2', 'd5', 'd5', 'rp', 'exe'] },
    ],
    notes: ['Programmer calculator working on exact integers (JavaScript BigInt) with a selectable word size. The evaluator, bit functions and display are original U-45 code.', 'DEC mode shows signed values when SIGNED is on; HEX/OCT/BIN always show the raw bit pattern of the word.'],
    model({ K, I, PAD }) {
      const H = (d) => K(d, 'hex:' + d, { c: 'num', tip: 'Hex digit ' + d });
      return {
        w: 372,
        theme: { body: 'linear-gradient(#1a1a1a,#0a0a0a)', cls: 'th-sp dark', vars: { '--bezel': '#000', '--key': '#2b2b2b', '--kt': '#39ff14', '--knum': '#101010', '--knt': '#e8ffe0', '--kop': '#0f3d0f', '--kopt': '#c8ffb8', '--kdel': '#6b0f0f', '--kdelt': '#fff', '--kshift': '#39ff14', '--kshiftt': '#000', '--ls': '#39ff14', '--la': '#9cf', '--pad': '#222', '--padt': '#39ff14', '--lcd': '#021a02', '--kr': '2px' } },
        display: { w: 336, h: 124, cls: 'sx-term' },
        sections: [
          { cols: 6, cls: 'kbase', kc: 'sm', keys: [K('HEX', 'base:16', { tip: 'Hexadecimal mode' }), K('DEC', 'base:10', { tip: 'Decimal mode' }), K('OCT', 'base:8', { tip: 'Octal mode' }), K('BIN', 'base:2', { tip: 'Binary mode' }), K('WORD', 'ws', { tip: 'Word size 8 → 16 → 32 → 64 bits' }), K('±SIGN', 'sign', { tip: 'Signed / unsigned' }),
            K('SHIFT', 'shift', { c: 'shift sm' }), K('BITS', 'bits', { tip: 'Bit-grid view on/off', s: ['CHR', 'chr', 'Character view on/off'] }), K('FUNC', 'pmenu', { tip: 'Bit-function catalogue' }), K('REGS', 'regs', { tip: 'Show registers R0–R9', s: ['CLR R', 'clrreg', 'Clear all registers'] }), K('ASCII', 'ascii', { tip: 'Character → code table', s: ['SETUP', 'setup', 'Word size / signed menu'] }), K('ON', 'on', { c: 'del sm' })] },
          { cols: 6, cls: 'klogic', kc: 'fn sm', keys: [K('AND', 'and', { tip: 'Bitwise AND', s: ['NAND', 'nand', 'Bitwise NAND'] }), K('OR', 'or', { tip: 'Bitwise OR', s: ['NOR', 'nor', 'Bitwise NOR'] }), K('XOR', 'xor', { tip: 'Bitwise XOR', s: ['XNOR', 'xnor', 'Bitwise XNOR'] }), K('NOT', 'not', { tip: 'One’s complement' }), K('SHL', 'shl', { tip: 'Shift left', s: ['ROL', 'rol', 'Rotate left'] }), K('SHR', 'shr', { tip: 'Logical shift right', s: ['ROR', 'ror', 'Rotate right'] }),
            I('POPC', 'pcnt(', 'POPCNT(', 'Count 1-bits', { s: ['PAR', 'ins:par(|PARITY(', 'Parity'] }), I('CLZ', 'clz(', 'CLZ(', 'Count leading zeros', { s: ['CTZ', 'ins:ctz(|CTZ(', 'Count trailing zeros'] }), I('SETB', 'setb(', 'SETB(', 'Set bit n', { s: ['CLRB', 'ins:clrb(|CLRB(', 'Clear bit n'] }), I('FLIP', 'flipb(', 'FLIP(', 'Flip bit n', { s: ['TSTB', 'ins:tstb(|TSTB(', 'Test bit n'] }), I('BSWP', 'bswap(', 'BSWAP(', 'Byte swap', { s: ['RBIT', 'ins:rbit(|RBIT(', 'Reverse bits'] }), K('ASR', 'asr', { tip: 'Arithmetic shift right' })] },
          { cols: 6, cls: 'knum', keys: [
            H('D'), H('E'), H('F'), K('(', 'lp', { c: 'fn' }), K(')', 'rp', { c: 'fn' }), K('DEL', 'del', { c: 'del' }),
            H('A'), H('B'), H('C'), K('MOD', 'mod', { c: 'op' }), K(',', 'comma', { c: 'fn' }), K('AC', 'ac', { c: 'del' }),
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('÷', 'div', { c: 'op' }), K('STO', 'sto', { c: 'fn' }), K('RCL', 'rcl', { c: 'fn' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('◀', 'left', { c: 'sm' }), K('▶', 'right', { c: 'sm' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('−', 'sub', { c: 'op' }), K('NEG', 'neg', { c: 'num' }), K('Ans', 'ans', { c: 'num', s: ['▲', 'up'] }),
            K('0', 'd0', { c: 'num' }), K('00', 'zz', { c: 'num', tip: 'Two zeros' }), K('+', 'add', { c: 'op' }), K('=', 'exe', { c: 'op exe', w: 3 })] },
        ],
      };
    },
  };

  // ============================ #42 stat ============================
  function statDist(S) {
    const F = (t, fields, fn, lab) => ({ t, run: (A) => A.openForm(t, fields, (B, v) => { const args = fields.map(f => num(v[f[0]])); const r = fn(...args); B.buf.clear(); B.ans = r; B.res = fmtReal(r, B.fmt); B.resHtml = null; B.fresh = true; B.hist.push({ txt: lab + '(' + args.map(x => fmtReal(x)).join(',') + ')', out: B.res, toks: [] }); }) });
    S.openMenu('DISTRIBUTIONS', [
      F('Normal PD', [['x', 'x', 0], ['m', 'μ', 0], ['s', 'σ', 1]], SF.normpdf, 'NormPD'), F('Normal CD', [['a', 'Lower', -1], ['b', 'Upper', 1], ['m', 'μ', 0], ['s', 'σ', 1]], SF.normcdf, 'NormCD'),
      F('Inverse Normal', [['p', 'Area', 0.95], ['m', 'μ', 0], ['s', 'σ', 1]], SF.invnorm, 'InvN'),
      F('Binomial PD', [['n', 'n', 10], ['p', 'p', 0.5], ['k', 'x', 5]], SF.binompdf, 'BinPD'), F('Binomial CD', [['n', 'n', 10], ['p', 'p', 0.5], ['k', 'x', 5]], SF.binomcdf, 'BinCD'),
      F('Poisson PD', [['l', 'λ', 3], ['k', 'x', 2]], SF.poisspdf, 'PoiPD'), F('Poisson CD', [['l', 'λ', 3], ['k', 'x', 2]], SF.poisscdf, 'PoiCD'),
      F('Geometric PD', [['p', 'p', 0.2], ['k', 'x', 3]], SF.geompdf, 'GeoPD'), F('Geometric CD', [['p', 'p', 0.2], ['k', 'x', 3]], SF.geomcdf, 'GeoCD'),
      F('Student t CD', [['a', 'Lower', -2], ['b', 'Upper', 2], ['v', 'df', 10]], SF.tcdf, 'tCD'), F('Inverse t', [['p', 'Area left', 0.975], ['v', 'df', 10]], SF.invt, 'Invt'),
      F('χ² CD (0..x)', [['x', 'x', 3.84], ['k', 'df', 1]], SF.chi2cdf, 'χ²CD'), F('Exponential CD', [['l', 'λ', 0.5], ['x', 'x', 2]], SF.expcdf, 'ExpCD'), F('Uniform CD', [['a', 'a', 0], ['b', 'b', 10], ['x', 'x', 3]], SF.unifcdf, 'UniCD'),
    ]);
  }
  const STATV = ['LX', 'LY', 'xbar', 'sx', 'px', 'sumx2', 'sumx', 'nn', 'ybar', 'sumxy', 'med', 'q1', 'q3', 'corr'];
  D.stat = {
    family: 'sci', styleName: 'algebraic with a statistics data editor (enter data in DATA, then 1-VAR, 2-VAR, REG or DIST)', histLines: 2,
    init(S) { DataEd.init(S, ['X', 'Y']); S.reg = null; },
    ind(S) { return 'STAT n=' + DataEd.list(S, 'X').length + (S.reg ? ' ' + S.reg.kind.toUpperCase() : ''); },
    render(S) { if (S.de.on && !S.menu && !S.form && !S.info) { S.scr.innerHTML = S.indHtml() + `<div class="sx-body">${DataEd.html(S, 'STAT')}</div>`; return true; } return false; },
    pre(S, act) { if (S.de.on && !/^(data|dist|onevar|twovar|reg|clrdata|sample)$/.test(act)) { DataEd.key(S, act); return true; } return false; },
    scope(S) {
      const X = () => DataEd.list(S, 'X'), P = () => DataEd.pairs(S, 'X', 'Y'), R = () => { if (!S.reg) throw new Error('Run REG first'); return S.reg; };
      const need = (a) => { if (!a.length) throw new Error('No data'); return a; };
      return {
        LX: () => X(), LY: () => DataEd.list(S, 'Y'), xbar: () => ST.mean(need(X())), sx: () => Math.sqrt(ST.svar(need(X()))), px: () => Math.sqrt(ST.pvar(need(X()))), sumx: () => ST.sum(X()), sumx2: () => ST.sum(X().map(v => v * v)), nn: () => X().length,
        ybar: () => ST.mean(need(P().y)), sumxy: () => { const p = P(); return ST.sum(p.x.map((v, i) => v * p.y[i])); }, med: () => ST.quart(X()).med, q1: () => ST.quart(X()).q1, q3: () => ST.quart(X()).q3,
        corr: () => { const p = P(); return ST.two(p.x, p.y)[11][1]; }, yhat: (x) => R().f(num(x)), xhat: (y) => R().inv(num(y)), zsc: (x) => (num(x) - ST.mean(X())) / Math.sqrt(ST.svar(X())),
        rannorm: (m, s) => { m = m == null ? 0 : m; s = s == null ? 1 : s; const u = Math.random() || 1e-12, v = Math.random(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
        ranbin: (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k; },
      };
    },
    prep(S, s) { return s.replace(new RegExp('\\b(' + STATV.join('|') + ')\\b(?!\\s*\\()', 'g'), '$1()'); },
    acts: {
      data: (S) => { S.de.on = true; },
      onevar: (S) => { S.de.on = false; S.showInfo('1-Variable (X)', ST.one(DataEd.list(S, 'X')).map(([k, v]) => k + ' = ' + (typeof v === 'number' ? fmtReal(v, S.fmt) : v))); },
      twovar: (S) => { S.de.on = false; const p = DataEd.pairs(S, 'X', 'Y'); S.showInfo('2-Variable (X,Y)', ST.two(p.x, p.y).map(([k, v]) => k + ' = ' + fmtReal(v, S.fmt))); },
      reg: (S) => { S.de.on = false; S.openMenu('REGRESSION', Object.keys(REG).map(k => ({ t: REG[k].name, run: (A) => { const p = DataEd.pairs(A, 'X', 'Y'); const R = L.regFit(k, p.x, p.y); A.reg = R; A.showInfo(R.name, R.coef.map(([n, v]) => n + ' = ' + fmtReal(v, A.fmt)).concat(R.r != null ? ['r = ' + fmtReal(R.r, A.fmt)] : [], ['r² = ' + fmtReal(R.r2, A.fmt), R.eq, 'ŷ( and x̂( now use this model'])); } }))); },
      dist: (S) => { S.de.on = false; statDist(S); },
      clrdata: (S) => { DataEd.init(S, ['X', 'Y']); S.reg = null; S.msg = 'Data cleared'; },
      sample: (S) => { DataEd.init(S, ['X', 'Y']); S.de.data.X = [1, 2, 3, 4, 5, 6, 7, 8]; S.de.data.Y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1]; S.msg = 'Sample data loaded (8 pairs)'; },
      scat: (S) => L.catalog(S, 'STAT VARIABLES', [['x̄ mean of X', 'xbar', 'x̄'], ['sx sample s.d.', 'sx', 'sx'], ['σx population s.d.', 'px', 'σx'], ['n count', 'nn', 'n'], ['Σx', 'sumx', 'Σx'], ['Σx²', 'sumx2', 'Σx²'], ['ȳ mean of Y', 'ybar', 'ȳ'], ['Σxy', 'sumxy', 'Σxy'], ['Median', 'med', 'Med'], ['Q1', 'q1', 'Q1'], ['Q3', 'q3', 'Q3'], ['r correlation', 'corr', 'r'], ['ŷ(x) predict y', 'yhat(', 'ŷ('], ['x̂(y) predict x', 'xhat(', 'x̂('], ['z(x) z-score', 'zsc(', 'z('], ['RanNorm(μ,σ)', 'rannorm(', 'RanNorm('], ['RanBin(n,p)', 'ranbin(', 'RanBin(']]),
    },
    features: [
      'Two-column X / Y data editor with row numbers, append, edit and delete', 'One-variable statistics: n, mean, Σx, Σx², sample and population standard deviation',
      'Five-number summary: min, Q1, median, Q3, max, plus range and IQR', 'Mode (all most-frequent values)', 'Two-variable statistics: means, sums, Σxy, sx, sy, covariance and r',
      'Linear regression y = a + bx with r and r²', 'Quadratic regression y = a + bx + cx²', 'Exponential regression y = a·e^(bx)', 'Power regression y = a·x^b', 'Logarithmic regression y = a + b·ln x',
      'Prediction ŷ(x) from the last regression', 'Inverse prediction x̂(y)', 'z-score of a value', 'Normal probability density', 'Normal cumulative probability between two bounds',
      'Inverse normal', 'Binomial PD and CD', 'Poisson PD and CD', 'Geometric PD and CD', 'Student-t cumulative probability and inverse t', 'χ² cumulative probability',
      'Exponential and uniform cumulative probability', 'Statistics variables usable in formulas (x̄, sx, σx, n, Σx, Σx², ȳ, Σxy, Med, Q1, Q3, r)', 'nCr and nPr combinatorics, n!',
      'Random numbers: Ran#, RanInt, RanNorm(μ,σ), RanBin(n,p)', 'Sample data set for practice', 'Clear-data key', 'Distribution results go to Ans and the history',
      'Scientific functions, powers, logs and memory', 'Two-line history with recall', 'SETUP formats Fix / Sci / Eng',
    ],
    examples: [
      { kind: 'sncr', title: 'Combinations', human: '10C3', exp: 120, keys: ['d1', 'd0', 'ncr', 'd3', 'exe'] },
      { kind: 'snpr', title: 'Permutations', human: '6P2', exp: 30, keys: ['d6', 'npr', 'd2', 'exe'] },
      { kind: 'smean', title: 'Mean of entered data', human: 'x̄ of 2, 4, 9 (DATA editor)', exp: 5, keys: ['data', 'd2', 'exe', 'd4', 'exe', 'd9', 'exe', 'ac', 'ins:xbar|x̄', 'exe'] },
      { kind: 'ssum', title: 'Sum of entered data', human: 'Σx of 3, 5, 7', exp: 15, keys: ['data', 'd3', 'exe', 'd5', 'exe', 'd7', 'exe', 'ac', 'ins:sumx|Σx', 'exe'] },
      { kind: 'sn', title: 'Count of data', human: 'n for 1, 1, 2, 3', exp: 4, keys: ['data', 'd1', 'exe', 'd1', 'exe', 'd2', 'exe', 'd3', 'exe', 'ac', 'ins:nn|n', 'exe'] },
      { kind: 'smed', title: 'Median', human: 'Median of 8, 1, 5', exp: 5, keys: ['data', 'd8', 'exe', 'd1', 'exe', 'd5', 'exe', 'ac', 'ins:med|Med', 'exe'] },
    ],
    notes: ['Statistics & probability calculator with an on-screen data editor. Sample standard deviation sx uses n−1; σx uses n. Quartiles use the median-of-halves method.', 'Distribution functions are original numerical code (series, continued fractions and Simpson integration) accurate to about 9 significant digits.'],
    model({ K, I, PAD }) {
      return {
        w: 360,
        theme: { body: 'linear-gradient(#ffe8d6,#f4c7a1)', cls: 'th-sp', vars: { '--bezel': '#6d2e46', '--key': '#a26769', '--kt': '#fff', '--knum': '#fff7f0', '--knt': '#3b1f2b', '--kop': '#6d2e46', '--kopt': '#fff', '--kdel': '#d1495b', '--kdelt': '#fff', '--kshift': '#00798c', '--kshiftt': '#fff', '--kalpha': '#edae49', '--kalphat': '#222', '--ls': '#00798c', '--la': '#b5651d', '--pad': '#6d2e46', '--padt': '#fff', '--lcd': '#f1f3e4', '--kr': '50% 50% 12px 12px' } },
        display: { w: 316, h: 110, cls: 'sx-lcdwarm' },
        sections: [
          { cols: 5, cls: 'kstat', kc: 'sm', keys: [K('DATA', 'data', { tip: 'Open the X/Y data editor', s: ['CLR DATA', 'clrdata', 'Clear all data'] }), K('1-VAR', 'onevar', { tip: 'One-variable statistics of X' }), K('2-VAR', 'twovar', { tip: 'Two-variable statistics of X,Y' }), K('REG', 'reg', { tip: 'Regression models' }), K('DIST', 'dist', { tip: 'Probability distributions' }),
            K('SHIFT', 'shift', { c: 'shift sm' }), K('STAT▸', 'scat', { tip: 'Statistics variables and functions menu', s: ['SAMPLE', 'sample', 'Load sample data'] }), PAD('ring', { center: ['OK', 'ok'], r: 2 }), K('SETUP', 'setup'), K('ON', 'on', { c: 'del sm' }),
            I('x̄', 'xbar', 'x̄', 'Mean of X', { s: ['ȳ', 'ins:ybar|ȳ', 'Mean of Y'] }), I('σx', 'px', 'σx', 'Population s.d.', { s: ['sx', 'ins:sx|sx', 'Sample s.d.'] }), I('n', 'nn', 'n', 'Number of data', { s: ['Σx', 'ins:sumx|Σx', 'Sum of X'] }), I('ŷ', 'yhat(', 'ŷ(', 'Predict y from the regression', { s: ['x̂', 'ins:xhat(|x̂(', 'Predict x'] })] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [K('<i>n</i>C<i>r</i>', 'ncr', { s: ['<i>n</i>P<i>r</i>', 'npr'] }), K('<i>x</i>!', 'fact'), K('Ran#', 'ran', { s: ['RanInt', 'ranint'] }), I('Med', 'med', 'Med', 'Median', { s: ['Q1', 'ins:q1|Q1', 'First quartile'] }), I('r', 'corr', 'r', 'Correlation coefficient', { s: ['Q3', 'ins:q3|Q3', 'Third quartile'] }), I('z', 'zsc(', 'z(', 'z-score', { s: ['Σxy', 'ins:sumxy|Σxy', 'Sum of products'] }),
            K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }), K('<i>x</i><sup>y</sup>', 'pow', { s: ['<i>x</i>⁻¹', 'inv'] }), K('ln', 'ln', { s: ['e<sup>x</sup>', 'epow'] }), K('log', 'log', { s: ['10<sup>x</sup>', 'pow10'] }), K('%', 'pct'), K('Abs', 'abs'),
            K('(', 'lp'), K(')', 'rp'), K(',', 'comma'), K('STO', 'sto', { c: 'fn' }), K('RCL', 'rcl', { c: 'fn' }), K('π', 'pi', { a: ['A', 'var:A'] })] },
          { cols: 5, cls: 'knum', keys: [
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('DEL', 'del', { c: 'del' }), K('AC', 'ac', { c: 'del' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('÷', 'div', { c: 'op' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('+', 'add', { c: 'op' }), K('−', 'sub', { c: 'op' }),
            K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('E', 'exp10', { c: 'num' }), K('(−)', 'neg', { c: 'num', s: ['Ans', 'ans'] }), K('EXE', 'exe', { c: 'op exe' })] },
        ],
      };
    },
  };

  // ============================ #28 frac1 ============================
  const IN_M = 0.0254;
  function ftin(meters, den) {
    let inch = meters / IN_M; const sg = inch < 0 ? '−' : ''; inch = Math.abs(inch);
    let ft = Math.floor(inch / 12 + 1e-9), n = Math.round((inch - ft * 12) * den);
    if (n >= 12 * den) { ft++; n -= 12 * den; }
    const whole = Math.floor(n / den); let fn = n - whole * den, fd = den; while (fn && fn % 2 === 0 && fd % 2 === 0) { fn /= 2; fd /= 2; }
    return `${sg}${ft}′ ${whole}${fn ? '-' + fn + '/' + fd : ''}″`;
  }
  const UNIT_RE = /\b(ft|inch|yd|mi|mm|cm|m|km|sqft|acre|L|gal|lb|kg|to)\b/;
  const fr1 = (S) => { if (S.fresh && S.ans != null) S.res = D.frac1.format(S, S.ans); S.msg = D.frac1.ind(S); };
  D.frac1 = {
    family: 'sci', styleName: 'one-line algebraic: exact fractions with a⌟b⌟c and measurement units (type, then =)', histLines: 0,
    init(S) { S.fd = 'frac'; S.den = 16; },
    ind(S) { return { frac: 'FRAC', mixed: 'MIXED', dec: 'DEC', ftin: 'FT-IN 1/' + S.den }[S.fd]; },
    render(S) {
      if (S.menu || S.form || S.info) return false;
      const line = S.err ? `<div class="sx-r sx-err">${esc(S.err)}</div>` : S.fresh && S.res != null ? `<div class="sx-r">${esc(S.res)}</div>` : `<div class="sx-r sx-typing">${S.buf.html(true)}</div>`;
      S.scr.innerHTML = S.indHtml() + `<div class="sx-body sx-one">${S.msg ? `<div class="sx-msg">${esc(S.msg)}</div>` : ''}${S.fresh && S.res != null ? `<div class="sx-l sx-echo">${esc(S.buf.text())}</div>` : ''}${line}</div>`;
      return true;
    },
    prep(S, s) { return s.replace(/(\d+)⌟(\d+)⌟(\d+)/g, '($1+$2/$3)').replace(/(\d+)⌟(\d+)/g, '($1/$2)'); },
    evaluate(S, src) {
      const s = S.prep(src);
      if (!UNIT_RE.test(s) && !/\./.test(s) && !/[a-z]\w*\(/.test(s.replace(/\bsqrt\(/g, ''))) {
        try {
          const toF = (v) => v && v.isFraction ? v : MF.fraction(num(v || 0));
          const r = MF.evaluate(s, { Ans: toF(S.ans && S.ans.isUnit ? 0 : S.ans), M: toF(S.vars.M) });
          if (r && r.isFraction) return r;
        } catch (e) { if (/zero/i.test(e.message)) throw new Error('Math ERROR: divide by 0'); }
      }
      const r = MX.evaluate(s, S.scope());
      if (typeof r === 'number' && !isFinite(r)) throw new Error('Math ERROR');
      return r;
    },
    scope(S) {
      const toN = (v) => v && v.isFraction ? Number(v.valueOf()) : v;
      return {
        Ans: toN(S.ans), M: toN(S.vars.M || 0),
        hyp: (a, b) => MX.sqrt(MX.add(MX.multiply(a, a), MX.multiply(b, b))),
        pitch: (rise, run) => { S.msg = 'pitch ' + fmtReal(12 * num(rise) / num(run), { m: 'fix', d: 2 }) + '/12'; return Math.atan2(num(rise), num(run)) / DEG; },
        stair: (total, maxr) => { const n = Math.ceil(num(total) / num(maxr) - 1e-9); S.msg = n + ' risers of ' + fmtReal(num(total) / n, { m: 'fix', d: 3 }); return num(total) / n; },
        bf: (t, w, l) => num(t) * num(w) * num(l) / 12, c2f: (c) => num(c) * 9 / 5 + 32, f2c: (f) => (num(f) - 32) * 5 / 9, circ: (d) => MX.multiply(Math.PI, d), acirc: (d) => MX.multiply(Math.PI / 4, MX.multiply(d, d)),
      };
    },
    format(S, v) {
      if (v && v.isUnit) { if (S.fd === 'ftin' && v.equalBase(MX.unit('m'))) return ftin(v.toNumber('m'), S.den); return fmtAny(v, S.fmt); }
      if (v && v.isFraction) { if (S.fd === 'dec') return fmtReal(Number(v.valueOf()), S.fmt); if (S.fd === 'ftin') return ftin(Number(v.valueOf()) * IN_M, S.den); return C.fmtFrac(v, S.fd === 'mixed'); }
      if (S.fd === 'ftin' && typeof v === 'number') return ftin(v * IN_M, S.den);
      return fmtAny(v, S.fmt);
    },
    after(S, v) { S.vars.M = S.vars.M || 0; },
    acts: {
      abc: (S) => S.typeTok('⌟', '⌟'),
      fd: (S) => { S.fd = { frac: 'mixed', mixed: 'dec', dec: 'frac', ftin: 'frac' }[S.fd]; fr1(S); },
      ftinv: (S) => { S.fd = S.fd === 'ftin' ? 'frac' : 'ftin'; fr1(S); },
      den: (S) => { S.den = { 2: 4, 4: 8, 8: 16, 16: 32, 32: 64, 64: 2 }[S.den]; fr1(S); S.msg = 'Fraction precision 1/' + S.den; },
      conv: (S) => S.openMenu('CONVERT Ans TO', [['ft', 'ft'], ['inch', 'inch'], ['yd', 'yd'], ['m', 'm'], ['cm', 'cm'], ['mm', 'mm'], ['km', 'km'], ['mi', 'mi'], ['sqft', 'sqft'], ['m²', 'm^2'], ['acre', 'acre'], ['L', 'L'], ['gal', 'gal'], ['kg', 'kg'], ['lb', 'lb']].map(([t, u]) => ({ t: '→ ' + t, run: (A) => { if (!(A.ans && A.ans.isUnit)) throw new Error('Ans has no unit'); A.buf.clear(); A.buf.put('Ans to ' + u, 'Ans→' + t); A.fresh = false; A.execute(); } }))),
      mr: (S) => S.typeTok('M', 'M'), mc: (S) => { S.vars.M = 0; S.msg = 'M cleared'; },
      simp: (S) => { const v = S.ans; if (!(v && v.isFraction)) throw new Error('Ans is not a fraction'); S.showInfo('Fraction facts', ['Ans = ' + C.fmtFrac(v) + ' = ' + C.fmtFrac(v, true), 'decimal ' + fmtReal(Number(v.valueOf())), 'numerator ' + v.n * (v.s < 0 ? -1n : 1n) + ', denominator ' + v.d, 'percent ' + fmtReal(Number(v.valueOf()) * 100) + '%', v.n ? 'reciprocal ' + C.fmtFrac(MF.divide(1, v)) : 'reciprocal undefined']); },
    },
    features: [
      'Exact fraction arithmetic (no rounding): 1⌟3 + 1⌟6 = 1⌟2', 'Mixed numbers a⌟b⌟c entry', 'Result cycle: improper fraction → mixed number → decimal (F↔D)', 'Automatic lowest terms',
      'A decimal point switches that calculation to decimals automatically', 'Fraction-facts screen: mixed, decimal, numerator, denominator, percent, reciprocal',
      'Length units on keys: ft, in, m, cm, mm (yd, mi, km on SHIFT)', 'Mixed-unit arithmetic (5 ft + 7 in)', 'Feet-inch-fraction display with 1/2 … 1/64 precision', 'Fraction precision cycle 1/2 → 1/64',
      'Convert Ans to any of 15 length / area / volume / mass units', 'Square units: area from length × length', 'Diagonal / hypotenuse Hyp(a,b)', 'Roof pitch Pitch(rise,run) in degrees with an x/12 ratio',
      'Stair calculator Stair(total rise, max riser): number of risers and exact riser height', 'Board feet BF(thickness in, width in, length ft)', 'Circumference Circ(d) and circle area ACirc(d)',
      '°C → °F and °F → °C conversions', 'x², √, x⁻¹, powers and percent', 'Memory M+, M−, MR and MC', 'One-line display with the expression echoed above the answer',
      'Ans chaining', 'Bracket entry with automatic closing', 'History recall ▲', 'Cursor editing ◀ ▶ and ⌫', 'Fix / Sci / Eng number formats in SETUP',
      'Fractions mixed with units (1⌟2 ft + 3 in)', 'π and n! keys', 'Clear C and ON reset', 'Divide-by-zero and unit-mismatch errors',
    ],
    examples: [
      { kind: 'fadd', title: 'Add two fractions exactly (decimal view)', human: '1⌟4 + 1⌟4, then F↔D twice', exp: 0.5, keys: ['d1', 'abc', 'd4', 'add', 'd1', 'abc', 'd4', 'exe', 'fd', 'fd'] },
      { kind: 'fmul', title: 'Fraction times whole number', human: '3⌟4 × 8', exp: 6, keys: ['d3', 'abc', 'd4', 'mul', 'd8', 'exe'] },
      { kind: 'fhyp', title: 'Diagonal of a rectangle', human: 'Hyp(6, 8)', exp: 10, keys: ['ins:hyp(|Hyp(', 'd6', 'comma', 'd8', 'rp', 'exe'] },
      { kind: 'fbf', title: 'Board feet', human: 'BF(2, 6, 10)', exp: 10, keys: ['ins:bf(|BF(', 'd2', 'comma', 'd6', 'comma', 'd1', 'd0', 'rp', 'exe'] },
      { kind: 'fc2f', title: 'Celsius to Fahrenheit', human: '100 °C → °F', exp: 212, keys: ['ins:c2f(|°F(', 'd1', 'd0', 'd0', 'rp', 'exe'] },
      { kind: 'fmix', title: 'Mixed numbers', human: '2⌟1⌟2 + 1⌟1⌟2', exp: 4, keys: ['d2', 'abc', 'd1', 'abc', 'd2', 'add', 'd1', 'abc', 'd1', 'abc', 'd2', 'exe'] },
    ],
    notes: ['One-line fraction & measurement calculator for workshop, building and kitchen work. Whole-number and fraction input stays exact; any decimal point switches that calculation to decimals.', 'Units use the bundled math.js unit system; the feet-inch-fraction display, stair, pitch and board-feet functions are U-45 code.'],
    model({ K, I }) {
      return {
        w: 340,
        theme: { body: 'linear-gradient(#ffd23f,#f4b400)', cls: 'th-sp', vars: { '--bezel': '#222', '--key': '#333', '--kt': '#fff', '--knum': '#fafafa', '--knt': '#111', '--kop': '#222', '--kopt': '#ffd23f', '--kdel': '#c1121f', '--kdelt': '#fff', '--kshift': '#1d3557', '--kshiftt': '#fff', '--ls': '#1d3557', '--la': '#1d3557', '--lcd': '#c9d1b8', '--kr': '6px' } },
        display: { w: 300, h: 70, cls: 'sx-oneline' },
        sections: [
          { cols: 6, cls: 'kunit', kc: 'fn sm', keys: [I('ft', ' ft', ' ft', 'Unit: feet', { s: ['yd', 'ins: yd| yd', 'Unit: yards'] }), I('in', ' inch', ' in', 'Unit: inches', { s: ['mi', 'ins: mi| mi', 'Unit: miles'] }), I('m', ' m', ' m', 'Unit: metres', { s: ['km', 'ins: km| km', 'Unit: kilometres'] }), I('cm', ' cm', ' cm', 'Unit: centimetres', { s: ['kg', 'ins: kg| kg', 'Unit: kilograms'] }), I('mm', ' mm', ' mm', 'Unit: millimetres', { s: ['lb', 'ins: lb| lb', 'Unit: pounds'] }), K('CONV', 'conv', { tip: 'Convert Ans to another unit' }),
            K('SHIFT', 'shift', { c: 'shift sm' }), K('FT-IN', 'ftinv', { tip: 'Feet-inch-fraction display on/off', s: ['1/n', 'den', 'Fraction precision 1/2 … 1/64'] }), I('Hyp', 'hyp(', 'Hyp(', 'Diagonal √(a²+b²)', { s: ['Pitch', 'ins:pitch(|Pitch(', 'Roof pitch angle'] }), I('Stair', 'stair(', 'Stair(', 'Stair risers', { s: ['BF', 'ins:bf(|BF(', 'Board feet'] }), I('Circ', 'circ(', 'Circ(', 'Circumference from diameter', { s: ['ACirc', 'ins:acirc(|ACirc(', 'Circle area from diameter'] }), I('°C→°F', 'c2f(', '°F(', 'Celsius to Fahrenheit', { s: ['°F→°C', 'ins:f2c(|°C(', 'Fahrenheit to Celsius'] })] },
          { cols: 5, cls: 'kfr', keys: [K('a⌟b', 'abc', { c: 'fn', tip: 'Fraction separator (a⌟b or a⌟b⌟c)' }), K('F↔D', 'fd', { c: 'fn', tip: 'Fraction / mixed / decimal display', s: ['FACTS', 'simp', 'Fraction facts'] }), K('<i>x</i>²', 'sq', { c: 'fn', s: ['√', 'sqrt'] }), K('<i>x</i>⁻¹', 'inv', { c: 'fn', s: ['<i>x</i><sup>y</sup>', 'pow'] }), K('ON', 'on', { c: 'del' }),
            K('(', 'lp', { c: 'fn' }), K(')', 'rp', { c: 'fn' }), K(',', 'comma', { c: 'fn' }), K('%', 'pct', { c: 'fn', s: ['π', 'pi'] }), K('SETUP', 'setup', { c: 'sm' })] },
          { cols: 5, cls: 'knum', keys: [
            K('MR', 'mr', { c: 'fn', s: ['MC', 'mc', 'Clear memory'] }), K('M−', 'mminus', { c: 'fn' }), K('M+', 'mplus', { c: 'fn' }), K('◀', 'left', { c: 'sm' }), K('▶', 'right', { c: 'sm' }),
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('÷', 'div', { c: 'op' }), K('C', 'ac', { c: 'del' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('⌫', 'del', { c: 'del' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('−', 'sub', { c: 'op' }), K('▲', 'up', { c: 'sm', s: ['n!', 'fact'] }),
            K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('±', 'neg', { c: 'num' }), K('+', 'add', { c: 'op' }), K('=', 'exe', { c: 'op exe' })] },
        ],
      };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
