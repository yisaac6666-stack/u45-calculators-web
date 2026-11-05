/* U-45 CALCULATORS v1.3 — #1 Complex-Number Scientific (cplx) and #25 Matrix & Vector Scientific (matx). Original code. */
(function (G) {
  'use strict';
  const C = G.SpecCore, MX = C.MX, esc = C.esc, fmtAny = C.fmtAny, fmtReal = C.fmtReal;
  const L = G.SpecLib, ang = L.ang, unang = L.unang, num = L.num;
  const D = G.SPEC_DEFS = G.SPEC_DEFS || {};

  // ============================ #1 cplx ============================
  function cplxFmt(S, v) {
    if (Array.isArray(v)) return v.map(z => cplxFmt(S, z)).join(' ; ');
    if (v && v.isComplex && Math.abs(v.im) > 1e-12 * Math.max(1, Math.abs(v.re))) {
      if (S.cf === 'polar') return fmtAny(v, S.fmt, { polar: true, deg: S.angle === 'deg' });
      if (S.cf === 'exp') return fmtReal(Math.hypot(v.re, v.im), S.fmt) + '·e^(' + fmtReal(Math.atan2(v.im, v.re), S.fmt) + '𝑖)';
    }
    if (v && v.isComplex && Math.abs(v.im) <= 1e-12 * Math.max(1, Math.abs(v.re))) return fmtReal(v.re, S.fmt);
    return fmtAny(v, S.fmt);
  }
  function infix(s, sym, fn) {
    const opd = '(\\((?:[^()]|\\([^()]*\\))*\\)|[\\d.]+i?|[A-Za-z]\\w*|-[\\d.]+)';
    const re = new RegExp(opd + '\\s*' + sym + '\\s*' + opd); let g = 0;
    while (re.test(s) && g++ < 20) s = s.replace(re, fn + '($1,$2)');
    return s;
  }
  const refmt = (S) => { if (S.fresh && S.ans != null) { S.res = cplxFmt(S, S.ans); S.resHtml = D.cplx.resHtml(S, S.ans); } };
  D.cplx = {
    family: 'sci', styleName: 'algebraic complex-number entry (type a+b𝑖 or r∠θ, then EXE)', histLines: 2,
    init(S) { S.cf = 'rect'; },
    ind(S) { return { rect: 'a+b𝑖', polar: 'r∠θ', exp: 're^𝑖θ' }[S.cf]; },
    scope(S) {
      const cis = (t) => MX.exp(MX.complex(0, ang(S, num(t))));
      return {
        pang: (r, t) => MX.multiply(r, cis(t)), cis, arg: (z) => unang(S, MX.arg(MX.complex(z))), re: (z) => MX.re(z), im: (z) => MX.im(z), conj: (z) => MX.conj(z),
        par: (a, b) => MX.divide(MX.multiply(a, b), MX.add(a, b)),
        Zc: (c, f) => MX.complex(0, -1 / (2 * Math.PI * num(f) * num(c))), Zl: (l, f) => MX.complex(0, 2 * Math.PI * num(f) * num(l)),
        nroots: (z, n) => { n = Math.round(num(n)); if (n < 1) throw new Error('Domain ERROR'); const c = MX.complex(z), r = Math.pow(MX.abs(c), 1 / n), t = MX.arg(c); const out = []; for (let k = 0; k < n; k++) out.push(MX.complex({ r, phi: (t + 2 * Math.PI * k) / n })); return out; },
        db: (z) => 20 * Math.log10(num(MX.abs(z))), cdist: (a, b) => MX.abs(MX.subtract(a, b)), rot: (z, t) => MX.multiply(z, cis(t)),
        sgnz: (z) => { const a = num(MX.abs(z)); if (!a) throw new Error('Math ERROR'); return MX.divide(z, a); },
      };
    },
    prep(S, s) { return infix(infix(s, '∠', 'pang'), '∥', 'par'); },
    format: cplxFmt,
    resHtml(S, v) { return Array.isArray(v) ? v.map((z, k) => `<div>k=${k}: ${esc(cplxFmt(S, z))}</div>`).join('') : null; },
    acts: {
      i: (S) => S.typeTok('i', '𝑖'), angle: (S) => S.typeTok('∠', '∠'), par: (S) => S.typeTok('∥', '∥', true),
      re: (S) => S.typeTok('re(', 'Re('), im: (S) => S.typeTok('im(', 'Im('), arg: (S) => S.typeTok('arg(', 'Arg('), conj: (S) => S.typeTok('conj(', 'Conj('), db: (S) => S.typeTok('db(', 'dB('),
      cfmt: (S) => { S.cf = { rect: 'polar', polar: 'exp', exp: 'rect' }[S.cf]; refmt(S); S.msg = 'Result form: ' + D.cplx.ind(S); },
      torect: (S) => { S.cf = 'rect'; refmt(S); }, topolar: (S) => { S.cf = 'polar'; refmt(S); },
      quad: (S) => S.openForm('aX²+bX+c=0', [['a', 'a', 1], ['b', 'b', 2], ['c', 'c', 5]], (A, v) => {
        if (!num(v.a)) throw new Error('a must not be 0');
        const d = MX.subtract(MX.multiply(v.b, v.b), MX.multiply(4, MX.multiply(v.a, v.c))), sq = MX.sqrt(d);
        const x1 = MX.divide(MX.add(MX.unaryMinus(v.b), sq), MX.multiply(2, v.a)), x2 = MX.divide(MX.subtract(MX.unaryMinus(v.b), sq), MX.multiply(2, v.a));
        A.vars.X1 = x1; A.vars.X2 = x2; A.ans = x1;
        A.showInfo('Quadratic roots', ['Δ = ' + cplxFmt(A, d), 'X1 = ' + cplxFmt(A, x1), 'X2 = ' + cplxFmt(A, x2), '(stored in X1, X2; Ans = X1)']);
      }),
      cubic: (S) => S.openForm('aX³+bX²+cX+d=0', [['a', 'a', 1], ['b', 'b', 0], ['c', 'c', 0], ['d', 'd', -8]], (A, v) => {
        if (!num(v.a)) throw new Error('a must not be 0');
        const r = MX.polynomialRoot(num(v.d), num(v.c), num(v.b), num(v.a)); r.forEach((z, i) => { A.vars['X' + (i + 1)] = z; });
        A.ans = r[0]; A.showInfo('Cubic roots', r.map((z, i) => 'X' + (i + 1) + ' = ' + cplxFmt(A, z)));
      }),
      catalog: (S) => L.catalog(S, 'COMPLEX CATALOG', [['Re(z) real part', 're(', 'Re('], ['Im(z) imaginary part', 'im(', 'Im('], ['Conj(z)', 'conj(', 'Conj('], ['Arg(z) argument', 'arg(', 'Arg('], ['ⁿRoots(z,n)', 'nroots(', 'ⁿRoots('], ['cis(θ)', 'cis(', 'cis('], ['Rot(z,θ) rotate', 'rot(', 'Rot('], ['Sgn(z) unit phasor', 'sgnz(', 'Sgn('], ['dB(z) 20·log|z|', 'db(', 'dB('], ['Dist(a,b)', 'cdist(', 'Dist('], ['Zc(C,f)', 'Zc(', 'Zc('], ['ZL(L,f)', 'Zl(', 'ZL(']]),
    },
    features: [
      'Imaginary unit 𝑖 key: type complex numbers as a+b𝑖 (e.g. 3+4𝑖)', 'Polar entry r∠θ with the ∠ key (θ in the current angle unit)',
      'Complex addition, subtraction, multiplication and division', 'Complex powers z^w and integer powers', 'Square root of negative and complex numbers (√−4 = 2𝑖)',
      'Complex exponential e^z and natural log ln z (principal value)', 'Complex sin, cos, tan and hyperbolic functions', 'Real part Re(z)', 'Imaginary part Im(z)',
      'Complex conjugate Conj(z)', 'Argument Arg(z) in degrees, radians or grads', 'Modulus |z|', 'All n complex n-th roots ⁿRoots(z,n) listed k = 0…n−1',
      'Result-form cycle a+b𝑖 → r∠θ → r·e^(θ𝑖) with one key (re-formats the last answer)', 'Direct ▸a+b𝑖 and ▸r∠θ display keys', 'cis(θ) unit phasor',
      'Rotate a phasor: Rot(z,θ)', 'Unit phasor Sgn(z) = z/|z|', 'Parallel-impedance operator a∥b = ab/(a+b)', 'Capacitor impedance Zc(C,f) = −𝑖/(2πfC)',
      'Inductor impedance ZL(L,f) = 2πfL·𝑖', 'Gain in decibels dB(z) = 20·log₁₀|z|', 'Distance between two complex points Dist(a,b)',
      'Quadratic solver with complex roots (stores X1, X2)', 'Cubic solver with complex roots (stores X1…X3)', 'Variables A–F, X1, X2 and M with STO / RCL',
      'M+ / M− running memory', 'Two-line history with ▲▼ recall and editing', 'Cursor editing with ◀ ▶ and DEL', 'Angle-unit cycle D → R → G (DRG)',
      'SETUP menu: angle units and Fix / Sci / Eng / Normal formats', 'Catalogue menu of every complex function', 'Auto-closing brackets on EXE', 'Ans chaining (an operator first continues from Ans)',
      'π, e, x², x³, x⁻¹, ∛, log, 10^x and n! on the keys',
    ],
    examples: [
      { kind: 'cmul', title: 'Multiply two complex numbers (real part)', human: 'Re((2+3𝑖)(4−𝑖))', exp: 11, keys: ['re', 'lp', 'd2', 'add', 'd3', 'i', 'rp', 'lp', 'd4', 'sub', 'i', 'rp', 'rp', 'exe'] },
      { kind: 'cabs', title: 'Modulus of a complex number', human: '|3+4𝑖|', exp: 5, keys: ['abs', 'd3', 'add', 'd4', 'i', 'rp', 'exe'] },
      { kind: 'cim', title: 'Imaginary part of a quotient', human: 'Im((1+𝑖)÷(1−𝑖))', exp: 1, keys: ['im', 'lp', 'd1', 'add', 'i', 'rp', 'div', 'lp', 'd1', 'sub', 'i', 'rp', 'rp', 'exe'] },
      { kind: 'cpol', title: 'Polar to rectangular (real part)', human: 'Re(2∠60°)', exp: 1, keys: ['re', 'd2', 'angle', 'd6', 'd0', 'rp', 'exe'] },
      { kind: 'carg', title: 'Argument in degrees', human: 'Arg(1+𝑖)', exp: 45, keys: ['arg', 'd1', 'add', 'i', 'rp', 'exe'] },
      { kind: 'csq', title: 'Square of a complex number (imaginary part)', human: 'Im((1+2𝑖)²)', exp: 4, keys: ['im', 'lp', 'd1', 'add', 'd2', 'i', 'rp', 'sq', 'rp', 'exe'] },
      { kind: 'cpar', title: 'Parallel resistors', human: '6 ∥ 3 (Ω)', exp: 2, keys: ['d6', 'par', 'd3', 'exe'] },
      { kind: 'cdb', title: 'Gain in dB', human: 'dB(10)', exp: 20, keys: ['db', 'd1', 'd0', 'rp', 'exe'] },
    ],
    notes: ['Complex-number scientific for electrical engineering and algebra. Every value may be complex; results can be shown in rectangular, polar (r∠θ) or exponential form.', 'Trig functions of real arguments use the selected angle unit; complex arguments are always in radians (principal values).', 'The logic is original U-45 code using the bundled open-source math.js library (Apache-2.0).'],
    model({ K, I, PAD }) {
      return {
        w: 362,
        theme: { body: 'linear-gradient(160deg,#0e4f5c,#062f38)', cls: 'th-sp dark', vars: { '--bezel': '#04252c', '--key': '#1c6b78', '--kt': '#fff', '--knum': '#e9f4f2', '--knt': '#06303a', '--kop': '#f6c445', '--kopt': '#102226', '--kdel': '#e2553b', '--kdelt': '#fff', '--kshift': '#ff9f1c', '--kshiftt': '#111', '--kalpha': '#7bdff2', '--kalphat': '#062f38', '--ls': '#ffb347', '--la': '#7bdff2', '--pad': '#0b3d46', '--padt': '#e0f7fa', '--lcd': '#d6efe9', '--kr': '10px 10px 4px 4px' } },
        display: { w: 316, h: 104, cls: 'sx-lcdteal' },
        sections: [
          { cols: '1fr 1fr 1.5fr 1fr 1fr', cls: 'ktop', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('ALPHA', 'alpha', { c: 'alpha sm' }), PAD('ring', { r: 2, center: ['EXE', 'exe'] }), K('SETUP', 'setup', { c: 'sm' }), K('ON', 'on', { c: 'del sm' }),
            K('<i>i</i>', 'i', { tip: 'Imaginary unit 𝑖', a: ['X1', 'var:X1', 'Variable X1'] }), K('∠', 'angle', { tip: 'Polar entry r∠θ', a: ['X2', 'var:X2', 'Variable X2'] }),
            K('a+b<i>i</i>⇄', 'cfmt', { tip: 'Cycle result form: rectangular → polar → exponential', s: ['▸a+b<i>i</i>', 'torect', 'Show results in rectangular form'] }), K('QUAD', 'quad', { tip: 'Quadratic equation solver (complex roots)', s: ['CUBIC', 'cubic', 'Cubic equation solver (complex roots)'] })] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [
            K('Conj', 'conj', { tip: 'Complex conjugate', a: ['A', 'var:A'], s: ['Sgn', 'ins:sgnz(|Sgn(', 'Unit phasor z/|z|'] }), K('Re', 're', { tip: 'Real part', a: ['B', 'var:B'], s: ['Rot', 'ins:rot(|Rot(', 'Rotate z by angle θ: Rot(z,θ)'] }),
            K('Im', 'im', { tip: 'Imaginary part', a: ['C', 'var:C'], s: ['▸r∠θ', 'topolar', 'Show results in polar form'] }), K('Arg', 'arg', { tip: 'Argument (angle) of z in the current unit', a: ['D', 'var:D'], s: ['cis', 'ins:cis(|cis(', 'cis(θ) = cos θ + 𝑖 sin θ'] }),
            K('|z|', 'abs', { tip: 'Modulus |z|', a: ['E', 'var:E'], s: ['Dist', 'ins:cdist(|Dist(', 'Distance between two complex points'] }), I('ⁿ√z', 'nroots(', 'ⁿRoots(', 'All n complex n-th roots: ⁿRoots(z,n)', { a: ['F', 'var:F'], s: ['CAT', 'catalog', 'Catalogue of complex functions'] }),
            K('<i>x</i>²', 'sq', { s: ['<i>x</i>³', 'cube'] }), K('√', 'sqrt', { s: ['∛', 'cbrt'] }), K('<i>x</i><sup>y</sup>', 'pow', { s: ['<i>x</i>⁻¹', 'inv'] }),
            K('ln', 'ln', { s: ['e<sup>z</sup>', 'epow'] }), K('log', 'log', { s: ['10<sup>x</sup>', 'pow10'] }), K('dB', 'db', { tip: 'Gain in decibels 20·log|z|', s: ['n!', 'fact'] }),
            K('sin', 'sin', { s: ['sin⁻¹', 'asin'], a: ['sinh', 'sinh'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'], a: ['cosh', 'cosh'] }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'], a: ['tanh', 'tanh'] }),
            K('∥', 'par', { tip: 'Parallel combination a∥b = ab/(a+b)' }), I('Z<sub>C</sub>', 'Zc(', 'Zc(', 'Capacitor impedance Zc(C,f)', { s: ['Z<sub>L</sub>', 'ins:Zl(|ZL(', 'Inductor impedance ZL(L,f)'] }), K('DRG', 'drg', { s: ['CLRv', 'clearvar'] }),
            K('(', 'lp'), K(')', 'rp'), K(',', 'comma'), K('STO', 'sto', { c: 'fn' }), K('RCL', 'rcl', { c: 'fn' }), K('M+', 'mplus', { s: ['M−', 'mminus'], a: ['M', 'var:M'] })] },
          { cols: 5, cls: 'knum', keys: [
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('DEL', 'del', { c: 'del' }), K('AC', 'ac', { c: 'del' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('÷', 'div', { c: 'op' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('+', 'add', { c: 'op' }), K('−', 'sub', { c: 'op' }),
            K('0', 'd0', { c: 'num' }), K('•', 'dot', { c: 'num', s: ['π', 'pi'] }), K('EXP', 'exp10', { c: 'num', s: ['<i>e</i>', 'e'] }), K('(−)', 'neg', { c: 'num' }), K('Ans', 'ans', { c: 'num', s: ['HIST', 'history'] })] },
        ],
      };
    },
  };

  // ============================ #25 matx ============================
  function rref(Ain) {
    const A = (Ain.isMatrix ? Ain.toArray() : Ain).map(r => (Array.isArray(r) ? r : [r]).map(num)); const R = A.length, Cn = A[0].length; let lead = 0, rank = 0;
    const clean = () => A.map(r => r.map(v => Math.abs(v) < 1e-12 ? 0 : v));
    for (let r = 0; r < R && lead < Cn; r++) {
      let i = r; while (Math.abs(A[i][lead]) < 1e-12) { i++; if (i === R) { i = r; lead++; if (lead === Cn) return { m: clean(), rank }; } }
      [A[i], A[r]] = [A[r], A[i]]; const lv = A[r][lead]; A[r] = A[r].map(v => v / lv);
      for (let j = 0; j < R; j++) if (j !== r) { const f = A[j][lead]; A[j] = A[j].map((v, k) => v - f * A[r][k]); }
      lead++; rank++;
    }
    return { m: clean(), rank };
  }
  function cofactor(Ain) { const A = Ain.isMatrix ? Ain.toArray() : Ain, n = A.length; if (n === 1) return [[1]]; return A.map((row, i) => row.map((_, j) => ((i + j) % 2 ? -1 : 1) * MX.det(A.filter((_, r) => r !== i).map(r => r.filter((_, c) => c !== j))))); }
  const MATN = ['MatA', 'MatB', 'MatC', 'MatD', 'VctA', 'VctB', 'VctC'];
  const sz = (m) => { const s = MX.size(m); return (s.toArray ? s.toArray() : s).join('×'); };
  const is2D = (v) => v && v.isMatrix && v.size().length === 2;
  D.matx = {
    family: 'sci', styleName: 'algebraic matrix entry (MatA…MatD, VctA…VctC or [1,2;3,4], then EXE)', histLines: 1,
    init(S) { Object.assign(S.vars, { MatA: MX.matrix([[2, 1], [1, 3]]), MatB: MX.matrix([[1, 2], [3, 4]]), MatC: MX.identity(3), MatD: MX.matrix([[4, -2], [1, 1]]), VctA: MX.matrix([1, 2, 3]), VctB: MX.matrix([4, 5, 6]), VctC: MX.matrix([0, 1, 0]) }); },
    ind(S) { return S.ans && S.ans.isMatrix ? 'MatAns ' + sz(S.ans) : 'MAT'; },
    scope(S) {
      return {
        det: (m) => MX.det(m), inv: (m) => MX.inv(m), trn: (m) => MX.transpose(m), rref: (m) => MX.matrix(rref(m).m), rank: (m) => rref(m).rank, trace: (m) => MX.trace(m),
        eig: (m) => { const e = MX.eigs(m).values; return MX.matrix(e.toArray ? e.toArray() : e); }, dot: (a, b) => MX.dot(a, b), cross: (a, b) => MX.cross(a, b), norm: (v) => MX.norm(v),
        vang: (a, b) => unang(S, Math.acos(Math.max(-1, Math.min(1, num(MX.dot(a, b)) / (num(MX.norm(a)) * num(MX.norm(b))))))), ident: (n) => MX.identity(num(n)),
        lsolve: (A, b) => { const r = MX.lusolve(A, b); const a = r.toArray ? r.toArray() : r; return MX.matrix(a.map(x => Array.isArray(x) ? x[0] : x)); },
        adj: (m) => MX.matrix(MX.transpose(cofactor(m))), cof: (m) => MX.matrix(cofactor(m)), kron: (a, b) => MX.kron(a, b),
        dim: (m) => { const s = MX.size(m); return MX.matrix(s.toArray ? s.toArray() : s); }, unitv: (v) => MX.divide(v, MX.norm(v)),
        proj: (a, b) => MX.multiply(b, num(MX.dot(a, b)) / num(MX.dot(b, b))), diag: (m) => MX.diag(m),
        ranm: (r, c) => MX.matrix(Array.from({ length: num(r) }, () => Array.from({ length: num(c == null ? r : c) }, () => Math.floor(Math.random() * 19) - 9))),
      };
    },
    after(S, v) { if (v && v.isMatrix) S.vars.MatAns = v; },
    resHtml(S, v) { return is2D(v) ? fmtAny(v, S.fmt, { html: true }) : null; },
    acts: {
      matedit: (S) => S.openMenu('EDIT MATRIX / VECTOR', MATN.map(nm => ({ t: nm + '  ' + sz(S.vars[nm]), run: (A) => D.matx.editDims(A, nm) }))),
      matlist: (S) => S.showInfo('Matrices & vectors', MATN.concat(S.vars.MatAns ? ['MatAns'] : []).map(nm => nm + ' ' + sz(S.vars[nm]) + ' = ' + fmtAny(S.vars[nm], { m: 'norm', d: 4 }))),
      matmenu: (S) => L.catalog(S, 'MATRIX FUNCTIONS', [['det( determinant', 'det(', 'det('], ['Inv( inverse', 'inv(', 'Inv('], ['Trn( transpose', 'trn(', 'Trn('], ['Rref( reduced row echelon', 'rref(', 'Rref('], ['Rank(', 'rank(', 'Rank('], ['Trace(', 'trace(', 'Trace('], ['Eig( eigenvalues', 'eig(', 'Eig('], ['Adj( adjugate', 'adj(', 'Adj('], ['Cof( cofactor matrix', 'cof(', 'Cof('], ['Ident(n) identity', 'ident(', 'Ident('], ['Solve(A,b) Ax=b', 'lsolve(', 'Solve('], ['Kron(A,B)', 'kron(', 'Kron('], ['Dim( size', 'dim(', 'Dim('], ['Diag(', 'diag(', 'Diag('], ['RanMat(r,c) random', 'ranm(', 'RanMat(']]),
      vctmenu: (S) => L.catalog(S, 'VECTOR FUNCTIONS', [['Dot(a,b)', 'dot(', 'Dot('], ['Cross(a,b)', 'cross(', 'Cross('], ['Norm(v) length', 'norm(', 'Norm('], ['Angle(a,b)', 'vang(', 'Angle('], ['Unit(v)', 'unitv(', 'Unit('], ['Proj(a,b) projection of a on b', 'proj(', 'Proj(']]),
      lu: (S) => { const use = S.ans && is2D(S.ans); const m = use ? S.ans : S.vars.MatA; const r = MX.lup(m); S.showInfo('LUP of ' + (use ? 'MatAns' : 'MatA'), ['L = ' + fmtAny(r.L, { m: 'norm', d: 4 }), 'U = ' + fmtAny(r.U, { m: 'norm', d: 4 }), 'P = [' + r.p.join(', ') + ']']); },
      sys: (S) => S.openForm('Ax=b — size', [['n', 'n (2 or 3)', 3]], (A, v) => {
        const n = num(v.n) === 2 ? 2 : 3; const f = [];
        for (let i = 1; i <= n; i++) { for (let j = 1; j <= n; j++) f.push(['a' + i + j, 'a' + i + j, i === j ? 1 : 0]); f.push(['b' + i, 'b' + i, i]); }
        A.openForm('Ax=b coefficients', f, (B, w) => { const M = [], b = []; for (let i = 1; i <= n; i++) { const r = []; for (let j = 1; j <= n; j++) r.push(num(w['a' + i + j])); M.push(r); b.push(num(w['b' + i])); } const x = MX.lusolve(M, b).map(r => r[0]); B.ans = MX.matrix(x); B.vars.MatAns = B.ans; B.showInfo('Solution', x.map((v2, i) => 'x' + (i + 1) + ' = ' + fmtReal(v2, B.fmt))); });
      }),
      lbr: (S) => S.typeTok('[', '['), rbr: (S) => S.typeTok(']', ']'), semi: (S) => S.typeTok(';', ';'), emul: (S) => S.typeTok('.*', '∘', true),
    },
    editDims(S, nm) {
      const isV = nm.startsWith('Vct'); const s1 = MX.size(S.vars[nm]), s0 = s1.toArray ? s1.toArray() : s1;
      S.openForm(nm + ' dimensions', isV ? [['n', 'dim', s0[0]]] : [['r', 'rows', s0[0]], ['c', 'cols', s0[1]]], (A, v) => {
        const r = Math.max(1, Math.min(6, Math.round(num(isV ? v.n : v.r)))), c = isV ? 1 : Math.max(1, Math.min(6, Math.round(num(v.c))));
        const old = A.vars[nm].toArray(); const f = [];
        for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) { const ov = isV ? old[i] : (old[i] || [])[j]; f.push([i + ',' + j, isV ? nm[3] + (i + 1) : nm[3] + (i + 1) + (j + 1), ov == null ? 0 : ov]); }
        A.openForm(nm + ' cells', f, (B, w) => { const m = []; for (let i = 0; i < r; i++) { if (isV) m.push(num(w[i + ',0'])); else { const row = []; for (let j = 0; j < c; j++) row.push(num(w[i + ',' + j])); m.push(row); } } B.vars[nm] = MX.matrix(m); B.msg = nm + ' stored ' + r + (isV ? '' : '×' + c); });
      });
    },
    features: [
      'Four matrices MatA–MatD (up to 6×6) with a cell-by-cell editor', 'Three vectors VctA–VctC (up to 6 elements)', 'Literal matrix entry with [ , ; ] e.g. [1,2;3,4]',
      'Matrix addition, subtraction and scalar multiplication', 'Matrix product A×B with dimension check', 'Element-wise (Hadamard) product ∘', 'Integer matrix powers A^n', 'Inverse A⁻¹',
      'Determinant det(A)', 'Transpose Trn(A)', 'Reduced row-echelon form Rref(A) (Gauss-Jordan)', 'Rank(A)', 'Trace(A)', 'Eigenvalues Eig(A)',
      'Adjugate Adj(A) and cofactor matrix Cof(A)', 'Identity matrix Ident(n)', 'Solve A·x = b with Solve(A,b)', 'Guided 2×2 / 3×3 linear-system solver form',
      'LUP decomposition viewer (L, U and permutation)', 'Kronecker product Kron(A,B)', 'Dimensions Dim(A)', 'Diagonal Diag(v or A)', 'Random integer matrix RanMat(r,c)',
      'Dot product Dot(a,b)', 'Cross product Cross(a,b)', 'Vector length Norm(v)', 'Angle between vectors Angle(a,b) in the current unit', 'Unit vector Unit(v)', 'Projection Proj(a,b)',
      'MatAns: every matrix result is kept for the next calculation', 'Matrix results drawn as a grid on the display', 'Matrix list screen showing all sizes and contents',
      'Scalar calculator with trig, logs, powers and memory', 'History recall with ▲▼', 'SETUP menu with angle units and number formats',
    ],
    examples: [
      { kind: 'mdet', title: 'Determinant of a stored matrix', human: 'det(MatB), MatB = [[1,2],[3,4]]', exp: -2, keys: ['ins:det(|det(', 'var:MatB', 'rp', 'exe'] },
      { kind: 'mdet2', title: 'Determinant of MatA', human: 'det(MatA), MatA = [[2,1],[1,3]]', exp: 5, keys: ['ins:det(|det(', 'var:MatA', 'rp', 'exe'] },
      { kind: 'mdot', title: 'Dot product of two vectors', human: 'Dot(VctA,VctB) = [1,2,3]·[4,5,6]', exp: 32, keys: ['ins:dot(|Dot(', 'var:VctA', 'comma', 'var:VctB', 'rp', 'exe'] },
      { kind: 'mtr', title: 'Trace of a matrix product', human: 'Trace(MatA×MatB)', exp: 19, keys: ['ins:trace(|Trace(', 'var:MatA', 'mul', 'var:MatB', 'rp', 'exe'] },
      { kind: 'mrank', title: 'Rank of the 3×3 identity', human: 'Rank(MatC)', exp: 3, keys: ['ins:rank(|Rank(', 'var:MatC', 'rp', 'exe'] },
      { kind: 'mnorm', title: 'Length of a vector', human: 'Norm([3,4])', exp: 5, keys: ['ins:norm(|Norm(', 'lbr', 'd3', 'comma', 'd4', 'rbr', 'rp', 'exe'] },
      { kind: 'mlit', title: 'Determinant of a typed matrix', human: 'det([4,3;6,3])', exp: -6, keys: ['ins:det(|det(', 'lbr', 'd4', 'comma', 'd3', 'semi', 'd6', 'comma', 'd3', 'rbr', 'rp', 'exe'] },
    ],
    notes: ['Matrix & vector scientific: four matrices and three vectors are kept between calculations, edited with a cell form, and combined in ordinary algebraic expressions.', 'Rref, rank, cofactor and adjugate are U-45 code; determinant, inverse, eigenvalues and LU use the bundled math.js library (Apache-2.0).'],
    model({ K, I, PAD }) {
      const Mv = (f, nm) => K(f, 'var:' + nm, { tip: 'Recall ' + nm, c: 'fn sm' });
      return {
        w: 368,
        theme: { body: 'linear-gradient(#f3efe6,#d9d0bf)', cls: 'th-sp', vars: { '--bezel': '#3d3a35', '--key': '#5b4b8a', '--kt': '#fff', '--knum': '#fffdf7', '--knt': '#2b2540', '--kop': '#5b4b8a', '--kopt': '#fff', '--kdel': '#b03a2e', '--kdelt': '#fff', '--kshift': '#2a9d8f', '--kshiftt': '#fff', '--kalpha': '#e9c46a', '--kalphat': '#222', '--ls': '#1f7a6f', '--la': '#9a6b00', '--pad': '#5b4b8a', '--padt': '#fff', '--lcd': '#e8ecd9', '--kr': '3px' } },
        display: { w: 330, h: 118, cls: 'sx-lcdgrid' },
        sections: [
          { cols: 7, cls: 'kmat', keys: [Mv('MatA', 'MatA'), Mv('MatB', 'MatB'), Mv('MatC', 'MatC'), Mv('MatD', 'MatD'), Mv('VctA', 'VctA'), Mv('VctB', 'VctB'), Mv('VctC', 'VctC'),
            K('EDIT', 'matedit', { tip: 'Edit a matrix or vector (size, then cells)', c: 'sm' }), K('LIST', 'matlist', { tip: 'Show all matrices and vectors', c: 'sm' }), K('MAT▸', 'matmenu', { tip: 'Matrix function catalogue', c: 'sm' }), K('VCT▸', 'vctmenu', { tip: 'Vector function catalogue', c: 'sm' }), K('SYS', 'sys', { tip: 'Solve a 2×2 or 3×3 linear system', c: 'sm' }), K('LUP', 'lu', { tip: 'LUP decomposition of MatAns (or MatA)', c: 'sm' }), K('MAns', 'var:MatAns', { tip: 'Recall the last matrix result MatAns', c: 'fn sm' })] },
          { cols: '1fr 1fr 1fr 1.6fr 1fr', cls: 'ktop', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), I('det', 'det(', 'det(', 'Determinant', { s: ['Adj', 'ins:adj(|Adj(', 'Adjugate'] }), I('Trn', 'trn(', 'Trn(', 'Transpose', { s: ['Cof', 'ins:cof(|Cof(', 'Cofactor matrix'] }), PAD('cross', { r: 2 }), K('MODE', 'setup', { c: 'sm' }),
            K('A⁻¹', 'inv', { tip: 'Inverse / reciprocal' }), I('Rref', 'rref(', 'Rref(', 'Reduced row echelon form', { s: ['Rank', 'ins:rank(|Rank(', 'Rank'] }), I('Eig', 'eig(', 'Eig(', 'Eigenvalues', { s: ['Trace', 'ins:trace(|Trace(', 'Trace'] }), K('ON', 'on', { c: 'del sm' })] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [
            K('[', 'lbr', { tip: 'Open a matrix literal' }), K(']', 'rbr', { tip: 'Close a matrix literal' }), K(';', 'semi', { tip: 'Next matrix row' }), K(',', 'comma'), I('Dot', 'dot(', 'Dot(', 'Dot product', { s: ['Proj', 'ins:proj(|Proj(', 'Projection of a on b'] }), I('Cross', 'cross(', 'Cross(', 'Cross product', { s: ['∠(a,b)', 'ins:vang(|Angle(', 'Angle between vectors'] }),
            K('<i>x</i>²', 'sq', { s: ['∘', 'emul', 'Element-wise product'] }), K('<i>x</i><sup>n</sup>', 'pow'), K('√', 'sqrt'), I('Norm', 'norm(', 'Norm(', 'Vector length', { s: ['Unit', 'ins:unitv(|Unit(', 'Unit vector'] }), I('Ident', 'ident(', 'Ident(', 'Identity matrix', { s: ['Diag', 'ins:diag(|Diag(', 'Diagonal'] }), I('Solve', 'lsolve(', 'Solve(', 'Solve A·x=b', { s: ['RanM', 'ins:ranm(|RanMat(', 'Random integer matrix'] }),
            K('sin', 'sin', { s: ['sin⁻¹', 'asin'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'] }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'] }), K('ln', 'ln', { s: ['e<sup>x</sup>', 'epow'] }), K('log', 'log', { s: ['10<sup>x</sup>', 'pow10'] }), I('Kron', 'kron(', 'Kron(', 'Kronecker product', { s: ['Dim', 'ins:dim(|Dim(', 'Dimensions'] }),
            K('(', 'lp'), K(')', 'rp'), K('STO', 'sto', { c: 'fn' }), K('RCL', 'rcl', { c: 'fn' }), K('DRG', 'drg'), K('π', 'pi', { s: ['HIST', 'history'] })] },
          { cols: 5, cls: 'knum', keys: [
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('DEL', 'del', { c: 'del' }), K('AC', 'ac', { c: 'del' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('÷', 'div', { c: 'op' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('+', 'add', { c: 'op' }), K('−', 'sub', { c: 'op' }),
            K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('(−)', 'neg', { c: 'num' }), K('×10ⁿ', 'exp10', { c: 'num' }), K('EXE', 'exe', { c: 'op exe' })] },
        ],
      };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
