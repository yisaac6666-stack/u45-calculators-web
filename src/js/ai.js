/* U-45 AI Agent: an offline, rule-based maths & logic assistant. It parses a request,
   picks one of its registered capabilities, shows the working step by step, and can
   drive the app (open calculators, presets, library, social, toolbar tools).
   No network: everything runs on this device. An optional API key field exists but
   is OFF by default and never used unless the user turns it on. */
(function (G) {
  'use strict';
  const M = () => G.math;
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = (v) => { try { return M().format(v, { precision: 12 }); } catch (e) { return String(v); } };
  const num = (s) => { const v = Number(String(s).replace(/,/g, '')); if (!isFinite(v)) throw new Error('not a number: ' + s); return v; };
  const nums = (s) => (String(s).match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) || []).map(Number);
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const res = (title, steps, answer, action) => ({ ok: true, title, steps, answer: String(answer), action: action || null });
  const CAPS = []; // { id, name, cat, ex, re, run(m, text) }
  let SEQ = 0;
  const cap = (cat, name, ex, re, run) => { CAPS.push({ n: ++SEQ, cat, name, ex, re, run }); };

  // ---------- logic parser (¬ ∧ ∨ → ↔ ⊕) ----------
  function parseLogic(src) {
    const s = src.toLowerCase().replace(/<->|<=>|↔|\biff\b/g, ' ↔ ').replace(/->|=>|→|\bimplies\b/g, ' → ').replace(/\bxor\b|⊕/g, ' ⊕ ').replace(/\band\b|&&|&|∧|\^/g, ' ∧ ').replace(/\bor\b|\|\||\||∨/g, ' ∨ ').replace(/\bnot\b|!|~|¬/g, ' ¬ ');
    const tk = s.match(/[a-z]\w*|[()¬∧∨→↔⊕]|[01]/g) || []; let i = 0; const vars = new Set();
    const peek = () => tk[i], eat = (t) => { if (tk[i] !== t) throw new Error('expected ' + t); i++; };
    const prim = () => { const t = tk[i++]; if (t === '(') { const e = iff(); eat(')'); return e; } if (t === '¬') { const e = prim(); return (v) => !e(v); } if (t === '1' || t === 'true') return () => true; if (t === '0' || t === 'false') return () => false; if (t && /^[a-z]/.test(t)) { vars.add(t); return (v) => !!v[t]; } throw new Error('unexpected ' + (t || 'end')); };
    const and = () => { let l = prim(); while (peek() === '∧') { i++; const a = l, b = prim(); l = (v) => a(v) && b(v); } return l; };
    const xor = () => { let l = and(); while (peek() === '⊕') { i++; const a = l, b = and(); l = (v) => a(v) !== b(v); } return l; };
    const or = () => { let l = xor(); while (peek() === '∨') { i++; const a = l, b = xor(); l = (v) => a(v) || b(v); } return l; };
    const imp = () => { const l = or(); if (peek() === '→') { i++; const r = imp(); return (v) => !l(v) || r(v); } return l; };
    const iff = () => { let l = imp(); while (peek() === '↔') { i++; const a = l, b = imp(); l = (v) => a(v) === b(v); } return l; };
    const f = iff(); if (i < tk.length) throw new Error('unexpected ' + tk[i]);
    return { f, vars: [...vars].sort() };
  }
  function truth(src) {
    const { f, vars } = parseLogic(src); if (vars.length > 6) throw new Error('at most 6 variables');
    const rows = []; for (let k = 0; k < 1 << vars.length; k++) { const v = {}; vars.forEach((x, j) => v[x] = !((k >> (vars.length - 1 - j)) & 1)); rows.push({ v, r: f(v) }); }
    return { vars, rows, kind: rows.every(r => r.r) ? 'tautology' : rows.some(r => r.r) ? 'contingent (satisfiable)' : 'contradiction' };
  }

  // ---------- step-by-step solvers ----------
  const lhsRhs = (eq) => { const p = eq.split('='); if (p.length !== 2) throw new Error('need one “=”'); return M().parse('(' + p[0] + ')-(' + p[1] + ')'); };
  function polyCoeffs(node, v) { // returns coefficients [c0, c1, c2, ...] of a polynomial in v
    const r = M().rationalize(node, {}, true); const cs = (r.coefficients || []).map(c => Number(M().evaluate(c.toString ? c.toString() : String(c))));
    if (!cs.length) throw new Error('not a polynomial'); if (r.variables && r.variables.length > 1) throw new Error('only one unknown please'); return cs;
  }
  cap('Algebra', 'Solve a linear or quadratic equation step by step', 'solve 3x + 5 = 20', /^solve\s+([^,;]*=[^,;]*)$/i, (m) => {
    const node = lhsRhs(m[1]); const vars = []; node.traverse(n => { if (n.isSymbolNode && !M()[n.name] && !vars.includes(n.name)) vars.push(n.name); }); const v = vars[0] || 'x';
    const cs = polyCoeffs(node, v); while (cs.length > 1 && Math.abs(cs[cs.length - 1]) < 1e-12) cs.pop();
    if (cs.length === 2) { const [b, a] = cs; const x = -b / a; return res('Linear equation', [`Move everything to one side: ${M().simplify(node).toString()} = 0.`, `Collect terms: ${fmt(a)}${v} + (${fmt(b)}) = 0.`, `Subtract ${fmt(b)} and divide by ${fmt(a)}: ${v} = ${fmt(-b)} / ${fmt(a)}.`, `Check by substituting ${v} = ${fmt(x)} into both sides.`], `${v} = ${fmt(x)}`); }
    if (cs.length === 3) return quad(cs[2], cs[1], cs[0], v);
    if (cs.length === 1) return res('Equation', [`Both sides simplify to the constant ${fmt(cs[0])} = 0.`], Math.abs(cs[0]) < 1e-12 ? 'true for every value (identity)' : 'no solution');
    return cubicish(cs, v);
  });
  function quad(a, b, c, v) {
    v = v || 'x'; const D = b * b - 4 * a * c, st = [`Standard form: ${fmt(a)}${v}² + (${fmt(b)})${v} + (${fmt(c)}) = 0, so a = ${fmt(a)}, b = ${fmt(b)}, c = ${fmt(c)}.`, `Discriminant Δ = b² − 4ac = ${fmt(b * b)} − ${fmt(4 * a * c)} = ${fmt(D)}.`];
    if (D > 0) { const r1 = (-b - Math.sqrt(D)) / (2 * a), r2 = (-b + Math.sqrt(D)) / (2 * a); st.push('Δ > 0: two real roots.', `${v} = (−b ± √Δ) / 2a = (${fmt(-b)} ± ${fmt(Math.sqrt(D))}) / ${fmt(2 * a)}.`); return res('Quadratic equation', st, `${v} = ${fmt(Math.min(r1, r2))} or ${v} = ${fmt(Math.max(r1, r2))}`); }
    if (D === 0) { st.push('Δ = 0: one repeated root.', `${v} = −b / 2a = ${fmt(-b / (2 * a))}.`); return res('Quadratic equation', st, `${v} = ${fmt(-b / (2 * a))}`); }
    const re = -b / (2 * a), im = Math.sqrt(-D) / (2 * Math.abs(a)); st.push('Δ < 0: two complex conjugate roots.', `${v} = ${fmt(re)} ± ${fmt(im)}i.`); return res('Quadratic equation', st, `${v} = ${fmt(re)} ± ${fmt(im)}i`);
  }
  function cubicish(cs, v) { // numeric roots via companion-free Durand–Kerner
    const n = cs.length - 1, a = cs.map(c => c / cs[n]); let z = Array.from({ length: n }, (_, k) => M().complex({ r: 0.9, phi: 2 * Math.PI * k / n + 0.4 }));
    const P = (x) => a.reduceRight((s, c) => M().add(M().multiply(s, x), c), M().complex(0, 0));
    for (let it = 0; it < 500; it++) z = z.map((zi, i) => { let d = M().complex(1, 0); z.forEach((zj, j) => { if (j !== i) d = M().multiply(d, M().subtract(zi, zj)); }); return M().subtract(zi, M().divide(P(zi), d)); });
    const roots = z.map(r => Math.abs(r.im) < 1e-9 ? fmt(Math.round(r.re * 1e10) / 1e10) : fmt(M().complex(Math.round(r.re * 1e10) / 1e10, Math.round(r.im * 1e10) / 1e10)));
    return res('Polynomial equation (degree ' + n + ')', [`Collected coefficients (ascending): ${cs.map(fmt).join(', ')}.`, 'Divide by the leading coefficient to make it monic.', 'Apply the Durand–Kerner simultaneous iteration (500 rounds) to find all roots.'], `${v} ∈ { ${roots.join(', ')} }`);
  }
  cap('Algebra', 'Solve a quadratic with the discriminant', 'quadratic 2 -3 -5', /^quadratic\s+(\S+)\s+(\S+)\s+(\S+)$/i, (m) => quad(num(m[1]), num(m[2]), num(m[3])));
  cap('Algebra', 'Solve simultaneous linear equations (2–4 unknowns)', 'solve 2x + y = 5, x - y = 1', /^solve\s+(.+=.+[,;].+=.+)$/i, (m) => {
    const eqs = m[1].split(/[,;]/).map(s => s.trim()).filter(Boolean); const nodes = eqs.map(lhsRhs); const vars = [];
    nodes.forEach(n => n.traverse(x => { if (x.isSymbolNode && !M()[x.name] && !vars.includes(x.name)) vars.push(x.name); })); vars.sort();
    if (vars.length !== eqs.length) throw new Error(`${eqs.length} equations but ${vars.length} unknowns`);
    const A = [], b = []; nodes.forEach(n => { const f = n.compile(); const zero = {}; vars.forEach(v => zero[v] = 0); const c0 = f.evaluate(zero); A.push(vars.map(v => { const s = Object.assign({}, zero, { [v]: 1 }); return f.evaluate(s) - c0; })); b.push(-c0); });
    const D = M().det(A); if (Math.abs(D) < 1e-12) throw new Error('the system has no unique solution (determinant 0)');
    const x = M().lusolve(A, b).map(r => r[0]);
    return res('Linear system', [`Unknowns: ${vars.join(', ')}.`, `Coefficient matrix A = ${JSON.stringify(A)}, constants b = ${JSON.stringify(b)}.`, `det A = ${fmt(D)} ≠ 0, so there is exactly one solution.`, 'Solve A·x = b by LU decomposition (Gaussian elimination).'], vars.map((v, i) => `${v} = ${fmt(Math.round(x[i] * 1e10) / 1e10)}`).join(', '));
  });
  cap('Algebra', 'Solve a linear inequality', 'inequality 2x + 3 < 11', /^(?:solve\s+)?inequality\s+(.+?)\s*(<=|>=|<|>|≤|≥)\s*(.+)$/i, (m) => {
    const node = M().parse('(' + m[1] + ')-(' + m[3] + ')'); const f = node.compile(); const c = f.evaluate({ x: 0 }), a = f.evaluate({ x: 1 }) - c; if (Math.abs(a) < 1e-12) throw new Error('no x term');
    const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '≤': '≥', '≥': '≤' }; const op = a < 0 ? flip[m[2]] : m[2];
    return res('Linear inequality', [`Bring everything to the left: ${fmt(a)}x + (${fmt(c)}) ${m[2]} 0.`, `Divide by ${fmt(a)}${a < 0 ? ' — negative, so the inequality sign reverses' : ''}.`], `x ${op.replace('<=', '≤').replace('>=', '≥')} ${fmt(-c / a)}`);
  });
  cap('Algebra', 'Simplify an algebraic expression', 'simplify 2x + 3x - x^2/x', /^simplify\s+(?!(?:sqrt|√)\s*\(?\d+\)?$)(.+)$/i, (m) => { const s = M().simplify(m[1]); return res('Simplify', [`Parse: ${M().parse(m[1]).toString()}.`, 'Apply algebraic rules (collect like terms, cancel common factors).'], s.toString()); });
  cap('Algebra', 'Expand a polynomial product', 'expand (x + 2)(x - 3)', /^expand\s+(.+)$/i, (m) => { const src = m[1].replace(/\)\s*\(/g, ')*('); const r = M().rationalize(src); return res('Expand', [`Rewrite as ${src}.`, 'Multiply every term in each bracket and collect like terms.'], r.toString()); });
  cap('Calculus', 'Differentiate symbolically', 'derivative of x^3 * sin(x)', /^(?:derivative|differentiate|d\/dx)(?:\s+of)?\s+(.+?)(?:\s+(?:wrt|with respect to)\s+([a-z]))?$/i, (m) => { const v = m[2] || 'x'; const d = M().derivative(m[1], v); return res('Derivative', [`f(${v}) = ${M().parse(m[1]).toString()}.`, 'Apply the sum, product, quotient and chain rules term by term.', `Simplify the result.`], `d/d${v} = ${d.toString()}`); });
  cap('Calculus', 'Definite integral (Simpson’s rule, 2000 strips)', 'integrate x^2 from 0 to 3', /^(?:integrate|integral(?: of)?)\s+(.+?)\s+from\s+(\S+)\s+to\s+(\S+)$/i, (m) => {
    const f = M().compile(m[1]), a = M().evaluate(m[2]), b = M().evaluate(m[3]), n = 2000, h = (b - a) / n; let s = f.evaluate({ x: a }) + f.evaluate({ x: b });
    for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f.evaluate({ x: a + i * h }); const v = s * h / 3;
    return res('Definite integral', [`f(x) = ${m[1]} on [${fmt(a)}, ${fmt(b)}].`, `Simpson’s rule with n = ${n} strips, h = ${fmt(h)}.`, `Sum (h/3)[f₀ + 4f₁ + 2f₂ + … + fₙ].`], fmt(Math.round(v * 1e9) / 1e9));
  });
  cap('Calculus', 'Find a root with Newton’s method', 'root of x^3 - 2x - 5 near 2', /^root\s+of\s+(.+?)\s+near\s+(\S+)$/i, (m) => {
    const f = M().compile(m[1]), d = M().derivative(m[1], 'x').compile(); let x = num(m[2]); const st = [];
    for (let i = 0; i < 40; i++) { const fx = f.evaluate({ x }), dx = d.evaluate({ x }); if (!dx) throw new Error('zero derivative'); const nx = x - fx / dx; if (i < 5) st.push(`x${i + 1} = ${fmt(x)} − f/f′ = ${fmt(nx)}`); if (Math.abs(nx - x) < 1e-13) { x = nx; break; } x = nx; }
    return res('Newton–Raphson', [`f′(x) = ${M().derivative(m[1], 'x').toString()}.`].concat(st), `x ≈ ${fmt(x)}`);
  });
  cap('Calculus', 'Limit by numerical approach', 'limit sin(x)/x as x -> 0', /^limit\s+(.+?)\s+as\s+x\s*(?:->|→|to)\s*(\S+)$/i, (m) => {
    const f = M().compile(m[1]), a = M().evaluate(m[2]); const hs = [1e-2, 1e-4, 1e-6]; const vals = hs.map(h => [(f.evaluate({ x: a - h })), (f.evaluate({ x: a + h }))]);
    const L = vals[2], ok = Math.abs(L[0] - L[1]) < 1e-4; return res('Limit', vals.map((v, i) => `h = ${hs[i]}: f(a−h) = ${fmt(v[0])}, f(a+h) = ${fmt(v[1])}`), ok ? fmt(Math.round((L[0] + L[1]) / 2 * 1e8) / 1e8) : 'left and right values differ — no two-sided limit');
  });
  const pf = (n) => { const o = []; for (let p = 2; p * p <= n; p++) while (n % p === 0) { o.push(p); n /= p; } if (n > 1) o.push(n); return o; };
  const isPrime = (n) => n > 1 && Number.isInteger(n) && pf(n).length === 1;
  cap('Number theory', 'Prime factorisation', 'factor 360', /^(?:factor|factorise|factorize|prime factors(?: of)?)\s+(\d+)$/i, (m) => { const n = num(m[1]); if (n > 1e13) throw new Error('number too large'); const f = pf(n), g = {}; f.forEach(p => g[p] = (g[p] || 0) + 1); return res('Prime factorisation', f.map((p, i) => `÷ ${p} → ${n / f.slice(0, i + 1).reduce((a, b) => a * b, 1)}`), Object.keys(g).map(p => g[p] > 1 ? `${p}^${g[p]}` : p).join(' × ')); });
  cap('Number theory', 'Primality test', 'is 97 prime', /^is\s+(\d+)\s+(?:a\s+)?prime\??$/i, (m) => { const n = num(m[1]); const f = pf(n); return res('Primality', [`Trial division by every prime up to √${n} ≈ ${fmt(Math.floor(Math.sqrt(n)))}.`, f.length === 1 && n > 1 ? 'No divisor found.' : `Divisor found: ${f[0]}.`], n > 1 && f.length === 1 ? 'prime' : 'not prime' + (n > 1 ? ` (${f.join(' × ')})` : '')); });
  cap('Number theory', 'n-th prime number', '100th prime', /^(\d+)(?:st|nd|rd|th)?\s+prime$/i, (m) => { const k = num(m[1]); if (k > 200000) throw new Error('too large'); let c = 0, p = 1; while (c < k) { p++; if (isPrime(p)) c++; } return res('n-th prime', [`Count primes 2, 3, 5, 7, … until the ${k}th.`], String(p)); });
  cap('Number theory', 'Greatest common divisor with Euclid’s algorithm', 'gcd 252 105', /^(?:gcd|hcf|euclid)\s+(.+)$/i, (m) => { const xs = nums(m[1]); if (xs.length < 2) throw new Error('give two numbers'); const st = []; let [a, b] = xs; while (b) { st.push(`${a} = ${Math.floor(a / b)} × ${b} + ${a % b}`); [a, b] = [b, a % b]; } let g = a; xs.slice(2).forEach(x => g = gcd(g, x)); return res('Euclid’s algorithm', st, String(g)); });
  cap('Number theory', 'Least common multiple', 'lcm 4 6 15', /^lcm\s+(.+)$/i, (m) => { const xs = nums(m[1]); const l = xs.reduce((a, b) => a * b / gcd(a, b)); return res('LCM', xs.slice(1).map((x, i) => `lcm so far × ${x} ÷ gcd`), String(l)); });
  cap('Number theory', 'Modular exponentiation (square and multiply)', 'modpow 3^200 mod 13', /^modpow\s+(\d+)\s*\^\s*(\d+)\s+mod\s+(\d+)$/i, (m) => { let b = BigInt(m[1]), e = BigInt(m[2]); const n = BigInt(m[3]); let r = 1n; const st = [`Exponent in binary: ${e.toString(2)}.`]; b %= n; while (e > 0n) { if (e & 1n) r = r * b % n; b = b * b % n; e >>= 1n; } st.push('Square the base each step; multiply in when the bit is 1.'); return res('Modular power', st, r.toString()); });
  cap('Number theory', 'Divisors of a number', 'divisors of 84', /^divisors\s+(?:of\s+)?(\d+)$/i, (m) => { const n = num(m[1]); const d = []; for (let k = 1; k * k <= n; k++) if (n % k === 0) { d.push(k); if (k * k !== n) d.push(n / k); } d.sort((a, b) => a - b); return res('Divisors', [`Test k = 1 … √${n}; each divisor k pairs with ${n}/k.`, `Count = ${d.length}, sum = ${d.reduce((a, b) => a + b, 0)}.`], d.join(', ')); });
  cap('Number theory', 'Decimal to fraction', 'fraction 0.375', /^(?:to\s+)?fraction\s+(?:of\s+)?(-?[\d.]+)$/i, (m) => { const f = M().fraction(num(m[1])); return res('Decimal → fraction', [`Write over a power of ten and cancel by the GCD.`], `${f.s < 0 ? '-' : ''}${f.n}/${f.d}`); });
  cap('Number theory', 'Simplify a fraction', 'reduce 84/126', /^(?:reduce|simplify fraction)\s+(-?\d+)\s*\/\s*(\d+)$/i, (m) => { const a = num(m[1]), b = num(m[2]), g = gcd(a, b); return res('Simplify fraction', [`gcd(${a}, ${b}) = ${g}.`, `Divide top and bottom by ${g}.`], `${a / g}/${b / g}`); });
  cap('Number theory', 'Simplify a square root', 'simplify sqrt 72', /^simplify\s+(?:sqrt|√)\s*\(?(\d+)\)?$/i, (m) => { let n = num(m[1]), k = 1; for (let d = Math.floor(Math.sqrt(n)); d > 1; d--) if (n % (d * d) === 0) { k = d; break; } const r = n / (k * k); return res('Simplify surd', [`Largest square factor of ${n} is ${k * k}.`, `√${n} = √${k * k} × √${r}.`], r === 1 ? String(k) : (k > 1 ? k : '') + '√' + r); });
  cap('Number theory', 'Roman numerals (to and from)', 'roman 1994', /^roman\s+(\d+|[ivxlcdm]+)$/i, (m) => { const V = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; if (/^\d+$/.test(m[1])) { let n = num(m[1]), s = ''; if (n < 1 || n > 3999) throw new Error('1–3999 only'); const st = []; V.forEach(([v, r]) => { while (n >= v) { s += r; n -= v; st.push(`take ${r} (${v})`); } }); return res('Roman numerals', st, s); } const t = m[1].toUpperCase(); let n = 0, i = 0; V.forEach(([v, r]) => { while (t.startsWith(r, i)) { n += v; i += r.length; } }); if (i !== t.length) throw new Error('invalid numeral'); return res('Roman numerals', ['Read the largest symbols first, subtracting pairs like CM and IV.'], String(n)); });
  cap('Statistics', 'Summary statistics (mean, median, mode, SD)', 'stats 4, 8, 15, 16, 23, 42', /^(?:stats|statistics|describe|mean|average)\s+(?:of\s+)?(.+)$/i, (m) => { const xs = nums(m[1]); if (!xs.length) throw new Error('no data'); const s = xs.slice().sort((a, b) => a - b), n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n; const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; const c = {}; xs.forEach(x => c[x] = (c[x] || 0) + 1); const mx = Math.max(...Object.values(c)); const mode = mx > 1 ? Object.keys(c).filter(k => c[k] === mx).join(', ') : 'none'; const sd = n > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1)) : 0; return res('Summary statistics', [`n = ${n}, sum = ${fmt(mean * n)}.`, `Sorted: ${s.join(', ')}.`, `Sample SD uses n − 1 = ${n - 1}.`], `mean ${fmt(mean)}, median ${fmt(med)}, mode ${mode}, SD ${fmt(Math.round(sd * 1e6) / 1e6)}, range ${fmt(s[n - 1] - s[0])}`); });
  cap('Statistics', 'Linear regression y = a + bx', 'regression 1,2 2,4.1 3,5.9 4,8.2', /^(?:regression|fit line)\s+(.+)$/i, (m) => { const ps = m[1].trim().split(/\s+|;/).map(p => p.split(',').map(Number)).filter(p => p.length === 2 && p.every(isFinite)); if (ps.length < 2) throw new Error('give x,y pairs'); const n = ps.length, sx = ps.reduce((a, p) => a + p[0], 0), sy = ps.reduce((a, p) => a + p[1], 0), sxx = ps.reduce((a, p) => a + p[0] * p[0], 0), sxy = ps.reduce((a, p) => a + p[0] * p[1], 0), syy = ps.reduce((a, p) => a + p[1] * p[1], 0); const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n, r = (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy)); return res('Least-squares line', [`n = ${n}, Σx = ${fmt(sx)}, Σy = ${fmt(sy)}, Σxy = ${fmt(sxy)}, Σx² = ${fmt(sxx)}.`, `b = (nΣxy − ΣxΣy)/(nΣx² − (Σx)²) = ${fmt(b)}.`, `a = ȳ − b·x̄ = ${fmt(a)}.`], `y = ${fmt(Math.round(a * 1e6) / 1e6)} + ${fmt(Math.round(b * 1e6) / 1e6)}x, r = ${fmt(Math.round(r * 1e6) / 1e6)}`); });
  cap('Combinatorics', 'Combinations n choose r', '10 choose 3', /^(?:ncr\s+)?(\d+)\s+(?:choose|c|ncr)\s+(\d+)$/i, (m) => { const n = num(m[1]), r = num(m[2]); return res('Combinations', [`C(n, r) = n! / (r!(n − r)!).`, `= ${n}! / (${r}! × ${n - r}!).`], fmt(M().combinations(n, r))); });
  cap('Combinatorics', 'Permutations nPr', 'permutations 10 3', /^(?:permutations|npr|arrangements)\s+(\d+)\s+(\d+)$/i, (m) => { const n = num(m[1]), r = num(m[2]); return res('Permutations', [`P(n, r) = n! / (n − r)! = ${Array.from({ length: r }, (_, i) => n - i).join(' × ')}.`], fmt(M().permutations(n, r))); });
  cap('Combinatorics', 'Factorial', 'factorial 12', /^(?:factorial\s+(\d+)|(\d+)!)$/i, (m) => { const n = num(m[1] || m[2]); if (n > 170) throw new Error('too large'); return res('Factorial', [`${n}! = ${n <= 12 ? Array.from({ length: n }, (_, i) => n - i).join(' × ') : 'n × (n − 1) × … × 1'}.`], fmt(M().factorial(n))); });
  cap('Probability', 'Binomial probability P(X = k)', 'binomial n=10 p=0.3 k=4', /^binomial\s+n\s*=\s*(\d+)\s+p\s*=\s*([\d.]+)\s+k\s*=\s*(\d+)$/i, (m) => { const n = num(m[1]), p = num(m[2]), k = num(m[3]); const v = M().combinations(n, k) * p ** k * (1 - p) ** (n - k); return res('Binomial', [`P(X = k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ.`, `C(${n}, ${k}) = ${M().combinations(n, k)}.`, `× ${p}^${k} × ${fmt(1 - p)}^${n - k}.`], fmt(Math.round(v * 1e10) / 1e10)); });
  cap('Logic', 'Truth table of a formula', 'truth table (p -> q) and p', /^truth\s*table\s+(?:of\s+)?(.+)$/i, (m) => { const t = truth(m[1]); return res('Truth table', [t.vars.join(' ') + ' | result'].concat(t.rows.map(r => t.vars.map(v => r.v[v] ? 'T' : 'F').join(' ') + ' | ' + (r.r ? 'T' : 'F'))), t.kind); });
  cap('Logic', 'Tautology / satisfiability check', 'is p or not p a tautology', /^is\s+(.+?)\s+a\s+(?:tautology|contradiction)\??$/i, (m) => { const t = truth(m[1]); return res('Tautology check', [`Checked all ${t.rows.length} rows.`, `True in ${t.rows.filter(r => r.r).length} rows.`], t.kind); });
  cap('Logic', 'Logical equivalence of two formulas', 'equivalent not (p and q) ; not p or not q', /^equivalent\s+(.+?)\s*;\s*(.+)$/i, (m) => { const A = parseLogic(m[1]), B = parseLogic(m[2]); const vars = [...new Set(A.vars.concat(B.vars))].sort(); let diff = null; for (let k = 0; k < 1 << vars.length; k++) { const v = {}; vars.forEach((x, j) => v[x] = !!((k >> j) & 1)); if (A.f(v) !== B.f(v)) { diff = v; break; } } return res('Equivalence', [`Compare both formulas on all ${1 << vars.length} assignments of ${vars.join(', ')}.`, diff ? 'Counter-example: ' + vars.map(x => x + '=' + (diff[x] ? 'T' : 'F')).join(', ') : 'They agree on every row.'], diff ? 'not equivalent' : 'equivalent'); });
  cap('Logic', 'Validity of an argument (premises ⊢ conclusion)', 'valid p -> q, p therefore q', /^valid\s+(.+?)\s+therefore\s+(.+)$/i, (m) => { const P = m[1].split(',').map(s => parseLogic(s)), C = parseLogic(m[2]); const vars = [...new Set(P.flatMap(p => p.vars).concat(C.vars))].sort(); for (let k = 0; k < 1 << vars.length; k++) { const v = {}; vars.forEach((x, j) => v[x] = !!((k >> j) & 1)); if (P.every(p => p.f(v)) && !C.f(v)) return res('Argument validity', ['Found a row where all premises are true and the conclusion false:', vars.map(x => x + '=' + (v[x] ? 'T' : 'F')).join(', ')], 'invalid'); } return res('Argument validity', [`In every one of the ${1 << vars.length} rows where all premises hold, the conclusion holds.`], 'valid'); });
  cap('Reasoning', 'Next term of a number sequence', 'sequence 2, 6, 12, 20, 30', /^(?:sequence|next term(?: of)?|pattern)\s+(.+)$/i, (m) => { const s = nums(m[1]); if (s.length < 3) throw new Error('give at least 3 terms'); let rows = [s], st = []; while (rows[rows.length - 1].length > 1 && !rows[rows.length - 1].every(v => v === rows[rows.length - 1][0])) { const r = rows[rows.length - 1]; rows.push(r.slice(1).map((v, i) => v - r[i])); } const last = rows[rows.length - 1]; if (last.length > 1 && last.every(v => v === last[0]) && rows.length < s.length) { rows.forEach((r, i) => st.push(`Δ${i ? '^' + i : '⁰'}: ${r.join(', ')}`)); let add = last[0]; for (let i = rows.length - 2; i >= 0; i--) add = rows[i][rows[i].length - 1] + add; return res('Sequence (finite differences)', st.concat([`Level ${rows.length - 1} is constant, so extend it back up.`]), String(add)); } const q = s.slice(1).map((v, i) => v / s[i]); if (q.every(v => Math.abs(v - q[0]) < 1e-12)) return res('Sequence (geometric)', [`Ratios: ${q.map(fmt).join(', ')}.`], fmt(s[s.length - 1] * q[0])); const fib = s.slice(2).every((v, i) => v === s[i] + s[i + 1]); if (fib) return res('Sequence (Fibonacci-type)', ['Each term is the sum of the two before.'], String(s[s.length - 1] + s[s.length - 2])); throw new Error('no simple rule found'); });
  cap('Geometry', 'Pythagoras (hypotenuse or missing leg)', 'hypotenuse 5 12', /^(hypotenuse|leg)\s+(\S+)\s+(\S+)$/i, (m) => { const a = num(m[2]), b = num(m[3]); if (/hyp/i.test(m[1])) return res('Pythagoras', [`c² = ${a}² + ${b}² = ${fmt(a * a + b * b)}.`], fmt(Math.sqrt(a * a + b * b))); return res('Pythagoras', [`leg² = ${fmt(Math.max(a, b))}² − ${fmt(Math.min(a, b))}² = ${fmt(Math.abs(a * a - b * b))}.`], fmt(Math.sqrt(Math.abs(a * a - b * b)))); });
  cap('Geometry', 'Triangle from three sides (Heron, angles)', 'triangle 3 4 5', /^triangle\s+(\S+)\s+(\S+)\s+(\S+)$/i, (m) => { const [a, b, c] = [m[1], m[2], m[3]].map(num); if (a + b <= c || a + c <= b || b + c <= a) throw new Error('these sides do not make a triangle'); const s = (a + b + c) / 2, A = Math.sqrt(s * (s - a) * (s - b) * (s - c)); const ang = (x, y, z) => Math.acos((y * y + z * z - x * x) / (2 * y * z)) * 180 / Math.PI; return res('Triangle (SSS)', [`s = (a + b + c)/2 = ${fmt(s)}.`, `Area = √(s(s−a)(s−b)(s−c)) = ${fmt(A)}.`, `Angles by the cosine rule: A = ${fmt(ang(a, b, c))}°, B = ${fmt(ang(b, a, c))}°, C = ${fmt(ang(c, a, b))}°.`], `area ${fmt(Math.round(A * 1e6) / 1e6)}, perimeter ${fmt(a + b + c)}`); });
  cap('Geometry', 'Circle measurements from radius', 'circle radius 7', /^circle\s+(?:radius|r)\s*=?\s*(\S+)$/i, (m) => { const r = num(m[1]); return res('Circle', [`d = 2r = ${fmt(2 * r)}.`, `C = 2πr = ${fmt(2 * Math.PI * r)}.`, `A = πr² = ${fmt(Math.PI * r * r)}.`], `area ${fmt(Math.PI * r * r)}, circumference ${fmt(2 * Math.PI * r)}`); });
  cap('Geometry', 'Sphere volume & surface', 'sphere radius 3', /^sphere\s+(?:radius|r)\s*=?\s*(\S+)$/i, (m) => { const r = num(m[1]); return res('Sphere', [`V = 4/3 πr³.`, `S = 4πr².`], `volume ${fmt(4 / 3 * Math.PI * r ** 3)}, surface ${fmt(4 * Math.PI * r * r)}`); });
  cap('Geometry', 'Distance, midpoint and gradient of two points', 'distance (1,2) (4,6)', /^(?:distance|points|line)\s*\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?\s*(?:and|to)?\s*\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?$/i, (m) => { const [x1, y1, x2, y2] = [m[1], m[2], m[3], m[4]].map(num); const d = Math.hypot(x2 - x1, y2 - y1), g = (y2 - y1) / (x2 - x1); return res('Two points', [`Δx = ${fmt(x2 - x1)}, Δy = ${fmt(y2 - y1)}.`, `Distance = √(Δx² + Δy²) = ${fmt(d)}.`, `Midpoint = (${fmt((x1 + x2) / 2)}, ${fmt((y1 + y2) / 2)}).`, isFinite(g) ? `Gradient = ${fmt(g)}; line: y = ${fmt(g)}x + ${fmt(y1 - g * x1)}.` : 'Vertical line.'], `distance ${fmt(d)}`); });
  cap('Geometry', 'Regular polygon angles', 'polygon 9', /^polygon\s+(\d+)$/i, (m) => { const n = num(m[1]); if (n < 3) throw new Error('n ≥ 3'); return res('Regular polygon', [`Interior sum = (n − 2) × 180° = ${(n - 2) * 180}°.`, `Each interior = ${fmt((n - 2) * 180 / n)}°; each exterior = ${fmt(360 / n)}°.`], `${fmt((n - 2) * 180 / n)}° interior`); });
  cap('Finance', 'Compound interest', 'compound 1000 at 5% for 10 years', /^compound\s+(\S+)\s+at\s+([\d.]+)%\s+for\s+(\S+)\s+years?(?:\s+(monthly|quarterly|daily))?$/i, (m) => { const P = num(m[1]), r = num(m[2]) / 100, t = num(m[3]), k = { monthly: 12, quarterly: 4, daily: 365 }[(m[4] || '').toLowerCase()] || 1; const A = P * (1 + r / k) ** (k * t); return res('Compound interest', [`A = P(1 + r/k)^(kt) with P = ${P}, r = ${r}, k = ${k}, t = ${t}.`, `(1 + ${fmt(r / k)})^${k * t} = ${fmt((1 + r / k) ** (k * t))}.`, `Interest = ${fmt(Math.round((A - P) * 100) / 100)}.`], fmt(Math.round(A * 100) / 100)); });
  cap('Finance', 'Loan repayment (amortised)', 'loan 20000 at 6% for 5 years', /^loan\s+(\S+)\s+at\s+([\d.]+)%\s+for\s+(\S+)\s+years?$/i, (m) => { const P = num(m[1]), i = num(m[2]) / 1200, n = num(m[3]) * 12; const pay = i ? P * i / (1 - (1 + i) ** -n) : P / n; return res('Monthly repayment', [`Monthly rate i = ${fmt(i)}, n = ${n} payments.`, `Payment = P·i / (1 − (1 + i)^−n).`, `Total paid = ${fmt(Math.round(pay * n * 100) / 100)}.`], fmt(Math.round(pay * 100) / 100) + ' per month'); });
  cap('Arithmetic', 'Percentage of a quantity', '15% of 80', /^([\d.]+)\s*%\s+of\s+(\S+)$/i, (m) => { const p = num(m[1]), q = num(m[2]); return res('Percentage', [`${p}% = ${p / 100}.`, `${p / 100} × ${q}.`], fmt(p * q / 100)); });
  cap('Arithmetic', 'Percentage change', 'percentage change 50 to 65', /^(?:percentage|percent)\s+change\s+(\S+)\s+to\s+(\S+)$/i, (m) => { const a = num(m[1]), b = num(m[2]); return res('Percentage change', [`Change = ${fmt(b - a)}.`, `÷ original ${a} × 100.`], fmt((b - a) / a * 100) + '%'); });
  cap('Linear algebra', 'Determinant of a matrix', 'det [[1,2],[3,4]]', /^det(?:erminant)?\s+(\[.+\])$/i, (m) => { const A = M().evaluate(m[1]); return res('Determinant', [`Matrix size ${[].concat(M().size(A).valueOf ? M().size(A).valueOf() : M().size(A)).join('×')}.`, 'Expand by LU decomposition.'], fmt(M().det(A))); });
  cap('Linear algebra', 'Inverse of a matrix', 'inverse [[2,1],[1,1]]', /^inverse\s+(\[.+\])$/i, (m) => { const A = M().evaluate(m[1]); const d = M().det(A); if (Math.abs(d) < 1e-12) throw new Error('singular matrix (det 0)'); return res('Inverse', [`det = ${fmt(d)} ≠ 0, so the inverse exists.`, 'Gauss–Jordan elimination on [A | I].'], fmt(M().inv(A))); });
  cap('Linear algebra', 'Eigenvalues of a symmetric/real matrix', 'eigenvalues [[2,0],[0,3]]', /^eigen(?:values)?\s+(\[.+\])$/i, (m) => { const A = M().evaluate(m[1]); const e = M().eigs(A); return res('Eigenvalues', ['Solve det(A − λI) = 0 numerically.'], fmt(e.values)); });

  // ---------- generated capability families (each one individually runnable) ----------
  const UNITS = {
    Length: ['nm', 'um', 'mm', 'cm', 'm', 'km', 'inch', 'foot', 'yard', 'mile', 'nmi', 'au', 'lightyear'], Mass: ['mg', 'g', 'kg', 'tonne', 'ounce', 'lbm', 'stone'], Time: ['ms', 's', 'minute', 'hour', 'day', 'week', 'year', 'decade', 'century'],
    Volume: ['mL', 'L', 'm3', 'gallon', 'quart', 'pint', 'cup', 'fluidounce'], Area: ['cm2', 'm2', 'km2', 'hectare', 'acre', 'sqft', 'sqmi'], Speed: ['m/s', 'km/h', 'mi/h', 'ft/s', 'cm/s', 'knot'],
    Temperature: ['degC', 'degF', 'K'], Energy: ['J', 'kJ', 'kWh', 'eV', 'BTU'], Pressure: ['Pa', 'kPa', 'bar', 'atm', 'psi', 'mmHg'], Data: ['b', 'B', 'kB', 'MB', 'GB', 'KiB', 'MiB'],
    Power: ['mW', 'W', 'kW', 'MW', 'hp', 'BTU/h'], Angle: ['deg', 'rad', 'grad', 'arcmin', 'arcsec', 'cycle'], Force: ['N', 'kN', 'lbf', 'dyne', 'kip'], Frequency: ['Hz', 'kHz', 'MHz', 'GHz']
  };
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  function regUnits() {
    Object.keys(UNITS).forEach(cat => UNITS[cat].forEach(a => UNITS[cat].forEach(b => {
      if (a === b) return; try { M().unit(1, a).to(b); } catch (e) { return; }
      cap('Units: ' + cat, `Convert ${a} → ${b}`, `convert 3 ${a} to ${b}`, new RegExp('^[Cc]onvert\\s+(-?[\\d.]+(?:e[-+]?\\d+)?)\\s*' + reEsc(a) + '\\s+(?:to|in)\\s+' + reEsc(b) + '$'), (m) => { const u = M().unit(num(m[1]), a), v = u.to(b); return res('Unit conversion', [`Express ${m[1]} ${a} in SI base units: ${u.toSI().format({ precision: 10 })}.`, `Divide by the size of one ${b}.`], v.format({ precision: 10 })); });
    })));
  }
  const BASES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const BN = { 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hex' };
  function regBases() {
    BASES.forEach(a => BASES.forEach(b => {
      if (a === b) return; const dig = '0123456789abcdef'.slice(0, a);
      const ex = (a === 10 ? '2026' : (2026).toString(a));
      cap('Number bases', `Convert base ${a}${BN[a] ? ' (' + BN[a] + ')' : ''} → base ${b}${BN[b] ? ' (' + BN[b] + ')' : ''}`, `${ex} base ${a} to base ${b}`, new RegExp('^(?:convert\\s+)?([' + dig + ']+)\\s+base\\s+' + a + '\\s+to\\s+base\\s+' + b + '$', 'i'), (m) => {
        const n = parseInt(m[1], a); const st = [`${m[1]}₍${a}₎ = ${m[1].toLowerCase().split('').map((d, i, s) => `${parseInt(d, a)}×${a}^${s.length - 1 - i}`).join(' + ')} = ${n}₍₁₀₎.`];
        let k = n; const rr = []; while (k > 0 && rr.length < 12) { rr.push(`${k} ÷ ${b} = ${Math.floor(k / b)} r ${(k % b).toString(b)}`); k = Math.floor(k / b); }
        return res('Base conversion', st.concat(rr, ['Read the remainders bottom to top.']), n.toString(b).toUpperCase() + '₍' + b + '₎');
      });
    }));
  }
  const SKIPFN = /^(import|createUnit|evaluate|parse|compile|help|parser|config|chain|typed|reviver|replacer|on|off|once|emit|create|factory|print|format|simplifyConstant|simplifyCore|resolve|derivative|rationalize|simplify|leafCount|symbolicEqual|map|forEach|filter|sort|partitionSelect|apply|matrixFromFunction|solveODE|random|randomInt|pickRandom|bignumber|splitUnit|to|unit|isPrime)$/;
  function regMathFns() {
    const docs = (M().expression && M().expression.mathWithTransform) ? null : null; void docs;
    Object.keys(M()).sort().forEach(name => {
      const fn = M()[name]; if (typeof fn !== 'function' || SKIPFN.test(name) || /^[A-Z_]|Dependencies$|Node$|^is[A-Z]/.test(name)) return;
      let ex = null; try { const h = M().help(name); const exs = (h && h.doc && h.doc.examples) || []; ex = exs.find(e => !/[=;]/.test(e.replace(/==|!=|<=|>=/g, '')) && e.startsWith(name + '(')) || null; } catch (e) { ex = null; }
      if (!ex || !/\)$/.test(ex)) return; try { const v = M().evaluate(ex); if (/NaN|undefined/.test(fmt(v))) return; } catch (e) { return; }
      cap('Function library', `${name}() — ${(M().help(name).doc.description || '').split('.')[0].slice(0, 70)}`, ex, new RegExp('^(?:calc(?:ulate)?\\s+|compute\\s+|evaluate\\s+)?(' + reEsc(name) + '\\s*\\(.*\\))$', 'i'), (m) => { const node = M().parse(m[1]); const v = node.evaluate(); return res(name + '()', [`Parsed: ${node.toString()}.`, `Evaluate with math.js’s ${name}.`], fmt(v)); });
    });
  }
  function regApp() {
    const go = (to) => ({ type: 'hash', to });
    (G.CALC_LIST || []).forEach(c => cap('App: calculators', `Open calculator #${c.id} ${c.name}`, `open calculator ${c.id}`, new RegExp('^(?:open|go to|show|launch)\\s+(?:calc(?:ulator)?\\s*)?#?' + c.id + '$', 'i'), () => res('Open calculator', [`Calculator #${c.id}: ${c.name}.`], 'opening #' + c.id, go('#/calc/' + c.id))));
    const MENU = (G.U45Menu && G.U45Menu.MENU) || [];
    MENU.forEach(cat => { cap('App: menu', `Open category ${cat.n} ${cat.t}`, `open category ${cat.n}`, new RegExp('^open\\s+category\\s+' + cat.n + '$', 'i'), () => res('Open category', [cat.t], 'opening category ' + cat.n, go('#/cat/' + cat.n))); (cat.items || []).forEach(it => cap('App: presets', `Run preset ${it.code} ${it.t}`, `run preset ${it.code}`, new RegExp('^(?:run|open)\\s+preset\\s+' + reEsc(it.code) + '$', 'i'), () => res('Run preset', [`${it.code} ${it.t}`, it.ex ? 'Worked example: ' + it.ex : 'Opens with a worked example.'], 'opening preset ' + it.code, go('#/m/' + it.code)))); });
    [['home', '#/', 'main menu'], ['all calculators', '#/all', 'list of all 45'], ['library', '#/library', 'the Library'], ['social', '#/social', 'the local Social feed'], ['ai', '#/ai', 'this AI Agent']].forEach(([k, to, d]) => cap('App: pages', `Open ${d}`, `open ${k}`, new RegExp('^(?:open|go to|show)\\s+' + k + '$', 'i'), () => res('Navigate', ['Go to ' + d + '.'], 'opening ' + d, go(to))));
    const Lb = G.U45Library;
    if (Lb) {
      Lb.TOPICS.forEach(t => cap('App: library topics', `Find books on ${t.title}`, `books on ${t.title.toLowerCase()}`, new RegExp('^(?:books?|guides?|pamphlets?|read)\\s+(?:on|about)\\s+' + reEsc(t.title.toLowerCase()) + '$', 'i'), () => res('Library search', [`${Lb.search({ q: t.title }).length} books match “${t.title}”.`], 'opening the library', { type: 'library', q: t.title })));
      Lb.TYPES.forEach(ty => cap('App: library formats', `List every ${ty.n.toLowerCase()}`, `list ${ty.n.toLowerCase()}s`, new RegExp('^list\\s+' + reEsc(ty.n.toLowerCase()) + 's?$', 'i'), () => res('Library filter', [`${Lb.search({ type: ty.k }).length} items.`], 'opening the library', { type: 'library', ftype: ty.k })));
      Lb.LEVELS.forEach((l, i) => cap('App: library levels', `List books for ${l} level`, `level ${l.toLowerCase()}`, new RegExp('^level\\s+' + reEsc(l.toLowerCase()) + '$', 'i'), () => res('Library filter', [`${Lb.search({ level: i }).length} items.`], 'opening the library', { type: 'library', level: i })));
      cap('App: library', 'Open library book by number', 'read book 77', /^(?:read|open)\s+book\s+#?(\d+)$/i, (m) => { const b = Lb.meta(+m[1]); if (!b) throw new Error(`books are numbered 1–${Lb.COUNT}`); return res('Open book', [b.title, b.sub], 'opening #' + b.id, go('#/library/' + b.id)); });
    }
    const NAV = (G.U45Workout && G.U45Workout.NAV) || [];
    NAV.forEach((n, i) => cap('App: toolbar', `Toolbar ${i + 1}: ${n[2]}`, `tool ${n[2].toLowerCase()}`, new RegExp('^(?:tool|toolbar|press tool)\\s+(?:' + (i + 1) + '|' + reEsc(n[2].toLowerCase()) + ')$', 'i'), () => res('Toolbar action', [`Runs toolbar button ${i + 1} (${n[2]}) on the open calculator.`], n[2], { type: 'tool', a: n[0] })));
    cap('App: social', 'Post to the local Social feed', 'post Just solved x^2 = 9!', /^post\s+(.+)$/i, (m) => res('Social post', ['Saved on this device only (IndexedDB, no server).'], 'posted', { type: 'social-post', text: m[1] }));
    cap('App: calculators', 'Type keys into the open calculator', 'type 12+30=', /^type\s+(.+)$/i, (m) => res('Key entry', [`Sends the keystrokes “${m[1]}” to the calculator on screen.`], 'typed', { type: 'keys', keys: m[1] }));
  }
  cap('Arithmetic', 'Evaluate any expression (exact fractions where possible)', 'evaluate 3/4 + 5/6', /^(?:evaluate|calc(?:ulate)?|compute|what is|=)\s*(.+?)\??$/i, (m) => evalExpr(m[1]));
  function evalExpr(src) {
    const node = M().parse(src.replace(/×/g, '*').replace(/÷/g, '/').replace(/√/g, 'sqrt').replace(/π/g, 'pi')); const v = node.evaluate();
    const st = [`Parsed as ${node.toString()}.`, 'Brackets → powers → × ÷ → + − (left to right).'];
    let exact = null; if (typeof v === 'number' && /^[\d\s+\-*/().]+$/.test(src)) { try { const f = M().evaluate(src, {}); const fr = M().fraction(M().evaluate(src.replace(/(\d+(?:\.\d+)?)/g, 'fraction($1)'))); if (fr.d !== 1) exact = `${fr.s < 0 ? '-' : ''}${fr.n}/${fr.d}`; void f; } catch (e) { exact = null; } }
    if (exact) st.push(`Exact value: ${exact}.`);
    return res('Evaluate', st, fmt(v));
  }
  let built = false;
  function build() { if (built) return; built = true; const tail = CAPS.splice(CAPS.findIndex(c => c.name.startsWith('Evaluate any')), 1); regApp(); regUnits(); regBases(); regMathFns(); CAPS.push(...tail); CAPS.forEach((c, i) => c.n = i + 1); }
  function ask(text) {
    build(); const t = String(text || '').trim().replace(/\s+/g, ' ');
    if (!t) return { ok: false, error: 'Type a question, e.g. “solve 3x + 5 = 20”, or tap a capability.' };
    for (const c of CAPS) { const m = c.re.exec(t); if (!m) continue; try { const r = c.run(m, t); r.cap = c.n; r.capName = c.name; return r; } catch (e) { return { ok: false, cap: c.n, capName: c.name, error: e.message || String(e) }; } }
    try { const r = evalExpr(t); r.cap = CAPS.length; r.capName = 'Evaluate any expression'; return r; } catch (e) { return { ok: false, error: 'I could not understand that. Try “help” or browse the capability list.' }; }
  }

  // divisibility rules (one capability per divisor, each with its own test)
  const DIVR = {
    2: ['last digit even', n => /[02468]$/.test(n)], 3: ['digit sum divisible by 3', n => dsum(n) % 3 === 0], 4: ['last two digits divisible by 4', n => +n.slice(-2) % 4 === 0],
    5: ['last digit 0 or 5', n => /[05]$/.test(n)], 6: ['divisible by 2 and by 3', n => /[02468]$/.test(n) && dsum(n) % 3 === 0], 7: ['double the last digit, subtract from the rest, repeat', n => BigInt(n) % 7n === 0n],
    8: ['last three digits divisible by 8', n => +n.slice(-3) % 8 === 0], 9: ['digit sum divisible by 9', n => dsum(n) % 9 === 0], 10: ['last digit 0', n => /0$/.test(n)],
    11: ['alternating digit sum divisible by 11', n => n.split('').reverse().reduce((a, d, i) => a + (i % 2 ? -d : +d), 0) % 11 === 0], 12: ['divisible by 3 and by 4', n => dsum(n) % 3 === 0 && +n.slice(-2) % 4 === 0],
    25: ['last two digits 00, 25, 50 or 75', n => /(00|25|50|75)$/.test(n) || n === '0'], 100: ['last two digits 00', n => /00$/.test(n)]
  };
  function dsum(n) { return n.split('').reduce((a, d) => a + +d, 0); }
  Object.keys(DIVR).forEach(d => cap('Number theory', `Divisibility test for ${d}`, `is 123456 divisible by ${d}`, new RegExp('^is\\s+(\\d+)\\s+divisible\\s+by\\s+' + d + '\\??$', 'i'), (m) => { const [rule, f] = DIVR[d]; const ok = f(m[1]); return res(`Divisible by ${d}?`, [`Rule: ${rule}.`, d === '3' || d === '9' ? `Digit sum = ${dsum(m[1])}.` : `Check ${m[1]}.`, `Confirm: ${m[1]} mod ${d} = ${BigInt(m[1]) % BigInt(d)}.`], ok ? 'yes' : 'no'); }));
  // mensuration formulas (one capability per shape)
  const SHAPES = [
    ['area of square', ['side'], 's^2', ([s]) => s * s], ['area of rectangle', ['length', 'width'], 'l × w', ([l, w]) => l * w], ['area of triangle', ['base', 'height'], '½ b h', ([b, h]) => b * h / 2],
    ['area of parallelogram', ['base', 'height'], 'b × h', ([b, h]) => b * h], ['area of trapezium', ['a', 'b', 'height'], '½(a+b)h', ([a, b, h]) => (a + b) * h / 2], ['area of rhombus', ['d1', 'd2'], '½ d₁d₂', ([p, q]) => p * q / 2],
    ['area of ellipse', ['a', 'b'], 'π a b', ([a, b]) => Math.PI * a * b], ['area of sector', ['radius', 'angle°'], '(θ/360) π r²', ([r, t]) => t / 360 * Math.PI * r * r], ['area of annulus', ['R', 'r'], 'π(R²−r²)', ([R, r]) => Math.PI * (R * R - r * r)],
    ['perimeter of rectangle', ['length', 'width'], '2(l+w)', ([l, w]) => 2 * (l + w)], ['arc length', ['radius', 'angle°'], '(θ/360) 2πr', ([r, t]) => t / 360 * 2 * Math.PI * r],
    ['volume of cube', ['side'], 's³', ([s]) => s ** 3], ['volume of cuboid', ['l', 'w', 'h'], 'l w h', ([l, w, h]) => l * w * h], ['volume of cylinder', ['radius', 'height'], 'π r² h', ([r, h]) => Math.PI * r * r * h],
    ['volume of cone', ['radius', 'height'], '⅓ π r² h', ([r, h]) => Math.PI * r * r * h / 3], ['volume of pyramid', ['base area', 'height'], '⅓ A h', ([a, h]) => a * h / 3], ['volume of hemisphere', ['radius'], '⅔ π r³', ([r]) => 2 / 3 * Math.PI * r ** 3],
    ['surface area of cube', ['side'], '6s²', ([s]) => 6 * s * s], ['surface area of cylinder', ['radius', 'height'], '2πr(r+h)', ([r, h]) => 2 * Math.PI * r * (r + h)], ['surface area of cone', ['radius', 'slant'], 'πr(r+l)', ([r, l]) => Math.PI * r * (r + l)]
  ];
  SHAPES.forEach(([nm, ps, f, fn]) => cap('Geometry', `${nm[0].toUpperCase() + nm.slice(1)} (${f})`, `${nm} ${ps.map((p, i) => i + 3).join(' ')}`, new RegExp('^' + nm + '\\s+' + ps.map(() => '(-?[\\d.]+)').join('[\\s,]+') + '$', 'i'), (m) => { const v = ps.map((p, i) => num(m[i + 1])); if (v.some(x => x < 0)) throw new Error('lengths must be non-negative'); return res(nm, [`Formula: ${f}.`, ps.map((p, i) => `${p} = ${v[i]}`).join(', ') + '.'], fmt(fn(v))); }));

  // ---------- actions & UI ----------
  function perform(a) {
    if (!a) return;
    const onCalc = () => !!document.querySelector('#calcnav');
    const later = (fn) => { if (onCalc()) fn(); else { location.hash = '#/calc/' + (localStorage.getItem('u45.lastCalc') || 34); setTimeout(fn, 500); } };
    if (a.type === 'hash') location.hash = a.to;
    else if (a.type === 'library') { location.hash = '#/library'; setTimeout(() => { const q = document.querySelector('#lq'); if (q && a.q) { q.value = a.q; q.dispatchEvent(new Event('input')); } const t = document.querySelector('#lt'); if (t && a.ftype) { t.value = a.ftype; t.dispatchEvent(new Event('change')); } const l = document.querySelector('#ll'); if (l && a.level != null) { l.value = String(a.level); l.dispatchEvent(new Event('change')); } }, 60); }
    else if (a.type === 'tool') later(() => { const b = document.querySelector(`#calcnav [data-a="${a.a}"]`); if (b) b.click(); });
    else if (a.type === 'keys') later(() => { for (const ch of a.keys) document.dispatchEvent(new KeyboardEvent('keydown', { key: ch === '=' ? 'Enter' : ch, bubbles: true })); });
    else if (a.type === 'social-post' && G.U45Social) G.U45Social.ready().then(c => { c.post({ text: a.text }); location.hash = '#/social'; });
  }
  const HIST_KEY = 'u45.ai.hist';
  const settings = () => { try { return Object.assign({ external: false, key: '', endpoint: '' }, JSON.parse(localStorage.getItem('u45.ai.settings') || '{}')); } catch (e) { return { external: false, key: '', endpoint: '' }; } };
  function page(root) {
    build(); const cats = [...new Set(CAPS.map(c => c.cat))];
    const hist = (() => { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (e) { return []; } })();
    const S = settings();
    root.innerHTML = `<div class="xpage ai"><div class="xhead"><h2>🤖 AI Agent <small>${CAPS.length} capabilities · offline maths & logic solver · step-by-step working</small></h2></div>
      <form class="xbar" id="af"><input id="aq" autocomplete="off" placeholder="Ask: solve 3x + 5 = 20 · derivative of x^2 sin(x) · truth table p -> q · open calculator 12" aria-label="Ask the agent"><button type="submit" class="xbig">Solve ▶</button></form>
      <div id="aout" class="ai-out" aria-live="polite"></div>
      <details class="ai-caps"><summary>📋 Capability list (${CAPS.length}) — tap one to try its example</summary><div class="xbar"><input id="acs" type="search" placeholder="Filter capabilities…" aria-label="Filter capabilities"><select id="acc" aria-label="Category"><option value="">All categories (${cats.length})</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></div><ol id="acl" class="ai-cl"></ol></details>
      <details class="ai-set"><summary>⚙ Settings</summary><label><input type="checkbox" id="aext"${S.external ? ' checked' : ''}> Use my own AI API key (off by default)</label><input id="akey" type="password" placeholder="API key (stored on this device only)" value="${esc(S.key)}" ${S.external ? '' : 'disabled'} aria-label="API key"><input id="aend" placeholder="HTTPS endpoint (OpenAI-compatible chat completions)" value="${esc(S.endpoint)}" ${S.external ? '' : 'disabled'} aria-label="Endpoint"><p class="xnote">When this is off (default) nothing leaves your device. The app's security policy only allows network calls to its own origin, so an external endpoint is refused unless a build explicitly permits it; the offline solver is always used first.</p><button type="button" id="ahc">Clear history</button></details>
      <h3>History</h3><ol class="ai-hist" id="ahl">${hist.slice(-20).reverse().map(h => `<li><a href="#" data-q="${esc(h)}">${esc(h)}</a></li>`).join('')}</ol></div>`;
    const out = root.querySelector('#aout');
    const show = (q) => {
      const r = ask(q); hist.push(q); localStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(-100)));
      out.innerHTML = r.ok ? `<div class="ai-card"><div class="ai-t">${esc(r.title)} <small>capability #${r.cap}: ${esc(r.capName)}</small></div><ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="ai-a">Answer: <b>${esc(r.answer)}</b></div>${r.action ? '<button type="button" id="ado" class="xbig">Do it ▶</button>' : ''}<button type="button" id="acp">Copy</button></div>` : `<div class="ai-card err">${esc(r.error)}${r.capName ? `<small> (capability #${r.cap}: ${esc(r.capName)})</small>` : ''}</div>`;
      const d = out.querySelector('#ado'); if (d) d.onclick = () => perform(r.action);
      const c = out.querySelector('#acp'); if (c) c.onclick = () => { try { navigator.clipboard.writeText(`${q}\n${r.steps.join('\n')}\nAnswer: ${r.answer}`); } catch (e) { /* clipboard optional */ } };
      if (r.ok && r.action && /^(hash|library)$/.test(r.action.type)) perform(r.action);
    };
    root.querySelector('#af').onsubmit = (e) => { e.preventDefault(); const q = root.querySelector('#aq').value; if (q.trim()) show(q); };
    const list = () => { const f = root.querySelector('#acs').value.toLowerCase(), c = root.querySelector('#acc').value; const xs = CAPS.filter(x => (!c || x.cat === c) && (!f || (x.name + ' ' + x.ex + ' ' + x.cat).toLowerCase().includes(f))); root.querySelector('#acl').innerHTML = xs.slice(0, 300).map(x => `<li value="${x.n}"><a href="#" data-q="${esc(x.ex)}"><b>${esc(x.name)}</b> <small>${esc(x.cat)} · e.g. ${esc(x.ex)}</small></a></li>`).join('') + (xs.length > 300 ? `<li class="xnote">…${xs.length - 300} more — refine the filter</li>` : ''); };
    root.querySelector('#acs').oninput = list; root.querySelector('#acc').onchange = list; list();
    root.addEventListener('click', (e) => { const a = e.target.closest('a[data-q]'); if (!a) return; e.preventDefault(); root.querySelector('#aq').value = a.dataset.q; show(a.dataset.q); });
    const saveS = () => { const s = { external: root.querySelector('#aext').checked, key: root.querySelector('#akey').value, endpoint: root.querySelector('#aend').value }; localStorage.setItem('u45.ai.settings', JSON.stringify(s)); root.querySelector('#akey').disabled = root.querySelector('#aend').disabled = !s.external; };
    ['#aext', '#akey', '#aend'].forEach(s => root.querySelector(s).addEventListener('change', saveS));
    root.querySelector('#ahc').onclick = () => { localStorage.removeItem(HIST_KEY); hist.length = 0; root.querySelector('#ahl').innerHTML = ''; };
    root.querySelector('#aq').focus();
  }
  G.U45AI = { ask, perform, page, caps: () => (build(), CAPS), truth, parseLogic, settings };
})(typeof window !== 'undefined' ? window : globalThis);
