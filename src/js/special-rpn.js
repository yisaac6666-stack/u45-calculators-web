/* U-45 CALCULATORS v1.3 — RPN-family special calculators (original code):
 *   #4  RPL Stack & List Processor (rpl)    — unlimited stack, lists, vectors, symbolic algebraics, keystroke programs
 *   #19 Rational & Number-Theory RPN (ratn) — exact fraction stack, primes, modular arithmetic
 *   #37 Navigation & Flight Computer RPN (navt) — HMS time, great-circle, wind, altitude and unit tools */
(function (G) {
  'use strict';
  const C = G.SpecCore, MX = C.MX, MF = C.MF, esc = C.esc, DEG = C.DEG, fmtAny = C.fmtAny, fmtReal = C.fmtReal;
  const D = G.SPEC_DEFS = G.SPEC_DEFS || {};
  const isAlg = (v) => v && typeof v === 'object' && typeof v.alg === 'string';
  const isArr = (v) => Array.isArray(v);
  const nn = (v) => v == null ? 0 : v.isFraction ? Number(v.valueOf()) : typeof v === 'number' ? v : Number(v);
  const asList = (a) => { const r = a.slice(); r.isList = true; return r; };

  // ============================ #4 rpl ============================
  function rplParse(S, str) {
    const s = str.trim().replace(/−/g, '-');
    if (s.startsWith("'")) return { alg: s.replace(/^'|'$/g, '') };
    if (s.startsWith('{')) return asList(s.replace(/[{}]/g, ' ').trim().split(/[\s,]+/).filter(Boolean).map(t => rplParse(S, t)));
    if (s.startsWith('[')) { const inner = s.replace(/^\[|\]$/g, '').trim(); if (/\[/.test(inner)) return MX.evaluate('[' + inner.replace(/\]\s*\[/g, '];[').replace(/(\d)\s+(?=[-\d.])/g, '$1,') + ']').toArray(); return inner.split(/[\s,]+/).filter(Boolean).map(Number); }
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(s)) return S.vars[s] != null ? S.vars[s] : { alg: s };
    const v = Number(s.replace(/E(-?\d+)$/, 'e$1')); if (isNaN(v)) throw new Error('Invalid Syntax'); return v;
  }
  function rplFmt(S, v) {
    if (isAlg(v)) return "'" + v.alg + "'";
    if (isArr(v)) { if (isArr(v[0])) return '[' + v.map(r => '[' + r.map(x => rplFmt(S, x)).join(' ') + ']').join(' ') + ']'; return (v.isList ? '{ ' : '[ ') + v.map(x => rplFmt(S, x)).join(' ') + (v.isList ? ' }' : ' ]'); }
    return fmtAny(v, S.fmt);
  }
  const algStr = (v) => isAlg(v) ? (/^[A-Za-z0-9.]+$/.test(v.alg) ? v.alg : '(' + v.alg + ')') : typeof v === 'number' ? String(v) : rplFmt({ fmt: { m: 'norm', d: 12 } }, v);
  const symb = (op, f) => (S) => S.binary((y, x) => isAlg(y) || isAlg(x) ? { alg: algStr(y) + op + algStr(x) } : f(y, x));
  const needList = (v) => { if (!isArr(v)) throw new Error('Bad Argument Type'); return v; };
  const evalAlg = (S, v) => { if (!isAlg(v)) return v; const sc = Object.assign({}, S.vars); const r = MX.evaluate(v.alg, sc); return r && r.isMatrix ? r.toArray() : r; };
  const TYPE_CH = { add: '+', sub: '-', mul: '*', div: '/', pow: '^', ypow: '^', lp: '(', rp: ')', dot: '.', space: ' ', comma: ' ', chs: '-', eex: 'E' };
  const SOFT = [
    ['STACK', [['DUP', 'dup'], ['DROP', 'drop'], ['OVER', 'over'], ['ROT', 'rot'], ['PICK', 'pick'], ['DEPTH', 'depth']]],
    ['STACK2', [['DUP2', 'dup2'], ['DROP2', 'drop2'], ['NIP', 'nip'], ['UNROT', 'unrot'], ['ROLL', 'roll'], ['ROLLD', 'rolld']]],
    ['LIST', [['→LIST', 'tolist'], ['LIST→', 'listto'], ['ΣLIST', 'slist'], ['ΠLIST', 'plist'], ['SORT', 'sort'], ['REVLST', 'revlist']]],
    ['LIST2', [['SIZE', 'size'], ['GET', 'get'], ['HEAD', 'head'], ['TAIL', 'tail'], ['ΔLIST', 'dlist'], ['SEQ', 'seq']]],
    ['VECT', [['DOT', 'dot'], ['CROSS', 'cross'], ['NORM', 'norm'], ['MEAN', 'mean'], ['MAX', 'lmax'], ['MIN', 'lmin']]],
    ['PRG', [['REC', 'prg'], ['RUN', 'run'], ['VIEW', 'prgview'], ['VARS', 'vars'], ['PURGE', 'purge'], ['EVAL', 'eval']]],
  ];
  D.rpl = {
    family: 'rpn', styleName: 'RPL: objects go on an unlimited stack with ENTER; commands act on level 1, 2, …; algebraics in quotes', app: 'specrpn', rpl: true, levels: 6,
    init(S) { S.page = 0; S.rec = null; S.prog = []; },
    ind(S) { return (S.rec ? 'REC ' : '') + 'RPL'; },
    parse: rplParse, format: rplFmt,
    footer(S) { return `<div class="sx-soft">${SOFT[S.page][1].map(([t]) => `<span>${esc(t)}</span>`).join('')}</div>`; },
    pre(S, act) {
      if (S.rec && !/^(prg|run|prgview|shift|alpha|on|reset)$/.test(act)) S.rec.push(act);
      if (S.cmd && /^['[{]/.test(S.cmd)) {
        const m = /^d(\d)$/.exec(act); if (m) { S.cmd += m[1]; return true; }
        if (act.startsWith('chr:')) { S.cmd += act.slice(4); return true; }
        if (TYPE_CH[act] != null) { S.cmd += TYPE_CH[act]; return true; }
        if (act === 'sq') { S.cmd += '^2'; return true; }
        if (act === 'sqrt' || act === 'sin' || act === 'cos' || act === 'tan' || act === 'ln' || act === 'log') { S.cmd += act + '('; return true; }
      }
      return false;
    },
    acts: {
      space: (S) => { S.cmd += ' '; }, quote: (S) => { S.cmd += "'"; }, lbr: (S) => { S.cmd += '['; }, lbrace: (S) => { S.cmd += '{'; },
      'chr:A': 0,
      add: symb('+', (y, x) => MX.add(y, x)), sub: symb('-', (y, x) => MX.subtract(y, x)), mul: symb('*', (y, x) => isArr(y) && isArr(x) && !isArr(y[0]) ? MX.dotMultiply(y, x) : MX.multiply(y, x)),
      div: symb('/', (y, x) => { if (typeof x === 'number' && x === 0) throw new Error('Infinite Result'); return isArr(x) ? MX.dotDivide(y, x) : MX.divide(y, x); }), pow: symb('^', (y, x) => MX.pow(y, x)),
      eval: (S) => S.unary(v => evalAlg(S, v)), tonum: (S) => S.unary(v => evalAlg(S, v)),
      dup: (S) => { S.endEntry(); S.need(1); S.snapshot(); S.push(S.st[0]); },
      drop: (S) => { if (S.cmd) { S.cmd = ''; return; } S.need(1); S.snapshot(); S.st.shift(); },
      over: (S) => { S.endEntry(); S.need(2); S.snapshot(); S.push(S.st[1]); },
      rot: (S) => { S.endEntry(); S.need(3); S.snapshot(); const z = S.st.splice(2, 1)[0]; S.st.unshift(z); },
      unrot: (S) => { S.endEntry(); S.need(3); S.snapshot(); const x = S.st.shift(); S.st.splice(2, 0, x); },
      pick: (S) => { S.endEntry(); S.need(1); const n = nn(S.st[0]); S.need(n + 1); S.snapshot(); S.st.shift(); S.push(S.st[n - 1]); },
      roll: (S) => { S.endEntry(); S.need(1); const n = nn(S.st[0]); S.need(n + 1); S.snapshot(); S.st.shift(); const v = S.st.splice(n - 1, 1)[0]; S.st.unshift(v); },
      rolld: (S) => { S.endEntry(); S.need(1); const n = nn(S.st[0]); S.need(n + 1); S.snapshot(); S.st.shift(); const v = S.st.shift(); S.st.splice(n - 1, 0, v); },
      depth: (S) => { S.endEntry(); S.push(S.st.length); },
      dup2: (S) => { S.endEntry(); S.need(2); S.snapshot(); S.st.unshift(S.st[0], S.st[1]); },
      drop2: (S) => { S.endEntry(); S.need(2); S.snapshot(); S.st.splice(0, 2); },
      nip: (S) => { S.endEntry(); S.need(2); S.snapshot(); S.st.splice(1, 1); },
      tolist: (S) => { S.endEntry(); S.need(1); const n = nn(S.st[0]); S.need(n + 1); S.snapshot(); S.st.shift(); const items = S.st.splice(0, n).reverse(); S.push(asList(items)); },
      listto: (S) => { S.endEntry(); S.need(1); const L = needList(S.st[0]); S.snapshot(); S.st.shift(); L.forEach(v => S.push(v)); S.push(L.length); },
      slist: (S) => S.unary(L => needList(L).reduce((a, b) => MX.add(a, b), 0)), plist: (S) => S.unary(L => needList(L).reduce((a, b) => MX.multiply(a, b), 1)),
      sort: (S) => S.unary(L => asList(needList(L).slice().sort((a, b) => nn(a) - nn(b)))), revlist: (S) => S.unary(L => asList(needList(L).slice().reverse())),
      size: (S) => S.unary(L => isArr(L) ? (isArr(L[0]) ? asList([L.length, L[0].length]) : L.length) : isAlg(L) ? L.alg.length : 1),
      get: (S) => S.binary((L, i) => { needList(L); const k = nn(i); if (k < 1 || k > L.length) throw new Error('Bad Argument Value'); return L[k - 1]; }),
      head: (S) => S.unary(L => { if (!needList(L).length) throw new Error('Bad Argument Value'); return L[0]; }), tail: (S) => S.unary(L => asList(needList(L).slice(1))),
      dlist: (S) => S.unary(L => asList(needList(L).slice(1).map((v, i) => MX.subtract(v, L[i])))),
      seq: (S) => S.unary(n => { const k = nn(n); if (k < 0 || k > 10000) throw new Error('Bad Argument Value'); return asList(Array.from({ length: k }, (_, i) => i + 1)); }),
      dot: (S) => S.binary((a, b) => MX.dot(needList(a), needList(b))), cross: (S) => S.binary((a, b) => MX.cross(needList(a), needList(b))),
      norm: (S) => S.unary(v => isArr(v) ? MX.norm(v) : MX.abs(v)), mean: (S) => S.unary(L => MX.mean(needList(L))),
      lmax: (S) => S.unary(L => Math.max(...needList(L).map(nn))), lmin: (S) => S.unary(L => Math.min(...needList(L).map(nn))),
      sto: (S) => { S.endEntry(); if (isAlg(S.st[0]) && /^[A-Za-z][A-Za-z0-9]*$/.test(S.st[0].alg)) { S.need(2); S.snapshot(); const nm = S.st.shift().alg, v = S.st.shift(); S.vars[nm] = v; S.msg = 'Stored ' + nm; return; } S.pend = 'sto'; S.msg = 'STO: digit for R0–R9, or put a quoted name on level 1'; },
      rcl: (S) => { S.endEntry(); if (isAlg(S.st[0]) && S.vars[S.st[0].alg] != null) { S.st[0] = S.vars[S.st[0].alg]; return; } S.pend = 'rcl'; },
      purge: (S) => { S.endEntry(); if (isAlg(S.st[0])) { delete S.vars[S.st.shift().alg]; S.msg = 'Purged'; } else { S.vars = {}; S.msg = 'All variables purged'; } },
      vars: (S) => S.showInfo('VARIABLES', Object.keys(S.vars).length ? Object.keys(S.vars).map(k => k + ' = ' + rplFmt(S, S.vars[k])) : ['(none)']),
      prg: (S) => { S.endEntry(); if (S.rec) { S.prog = S.rec; S.rec = null; S.msg = 'Program saved: ' + S.prog.length + ' steps'; } else { S.rec = []; S.msg = 'Recording keystrokes… press REC again to stop'; } },
      run: (S) => { if (S.rec) throw new Error('Stop recording first'); S.endEntry(); const p = S.prog.slice(); for (const a of p) { S.exec(a); if (S.err) break; } S.msg = 'Ran ' + p.length + ' steps'; },
      prgview: (S) => S.showInfo('PROGRAM', S.prog.length ? S.prog.map((a, i) => String(i + 1).padStart(2, '0') + '  ' + a.replace(/^chr:|^d/, '')) : ['(empty — REC to record)']),
      nxt: (S) => { S.page = (S.page + 1) % SOFT.length; }, prev: (S) => { S.page = (S.page + SOFT.length - 1) % SOFT.length; },
      sk1: (S) => S.exec(SOFT[S.page][1][0][1]), sk2: (S) => S.exec(SOFT[S.page][1][1][1]), sk3: (S) => S.exec(SOFT[S.page][1][2][1]),
      sk4: (S) => S.exec(SOFT[S.page][1][3][1]), sk5: (S) => S.exec(SOFT[S.page][1][4][1]), sk6: (S) => S.exec(SOFT[S.page][1][5][1]),
    },
    features: [
      'Unlimited-depth stack with six visible levels and scrolling ▲▼', 'Command line with editing ⌫ before ENTER', 'Six soft-menu keys F1–F6 with six menu pages (NXT / PREV)',
      'DUP, DROP, SWAP, OVER, ROT, UNROT', 'PICK, ROLL, ROLLD, DEPTH', 'DUP2, DROP2, NIP and CLEAR', 'Lists { … } entered on the command line', '→LIST and LIST→ build and explode lists',
      'ΣLIST and ΠLIST', 'SORT and REVLIST', 'SIZE, GET, HEAD, TAIL', 'ΔLIST first differences and SEQ 1…n', 'Element-wise list arithmetic with + − × ÷ and scalars',
      'Vectors [ … ] with DOT, CROSS and NORM', 'MEAN, MAX and MIN of a list', 'Symbolic algebraics in quotes, e.g. \'2+3*4\'', 'Arithmetic on algebraics builds a new algebraic',
      'EVAL / →NUM evaluates an algebraic with stored variables', 'Named variables: value, \'NAME\', STO; RCL and typing the name recalls it', 'Registers R0–R9 via STO/RCL + digit',
      'VARS list and PURGE (one or all)', 'Keystroke program recorder REC with RUN and step VIEW', 'UNDO of the last stack operation', 'LASTARG (LAST X)',
      'Alpha keyboard for names (ALPHA layer)', 'Scientific functions sin cos tan, ln, log, eˣ, 10ˣ, √, x², 1/x, n!', 'Degree / radian / grad modes', 'Clear error texts: Too Few Arguments, Bad Argument Type',
      'Numbers in standard, fixed, scientific and engineering formats', 'Matrix entry [[a b][c d]] on the command line',
    ],
    examples: [
      { kind: 'radd', title: 'Basic RPL arithmetic', human: '2 ENTER 3 +', exp: 5, keys: ['d2', 'enter', 'd3', 'add'] },
      { kind: 'rdup', title: 'DUP then multiply (square)', human: '7 DUP ×', exp: 49, keys: ['d7', 'dup', 'mul'] },
      { kind: 'rlist', title: 'Build a list and sum it', human: '1 ENTER 2 ENTER 3 ENTER 3 →LIST ΣLIST', exp: 6, keys: ['d1', 'enter', 'd2', 'enter', 'd3', 'enter', 'd3', 'tolist', 'slist'] },
      { kind: 'ralg', title: 'Evaluate an algebraic', human: "'2+3*4' EVAL", exp: 14, keys: ['quote', 'd2', 'add', 'd3', 'mul', 'd4', 'enter', 'eval'] },
      { kind: 'rover', title: 'OVER copies level 2', human: '2 ENTER 5 OVER +', exp: 7, keys: ['d2', 'enter', 'd5', 'over', 'add'] },
      { kind: 'rrot', title: 'ROT brings level 3 to level 1', human: '1 ENTER 2 ENTER 3 ROT', exp: 1, keys: ['d1', 'enter', 'd2', 'enter', 'd3', 'rot'] },
      { kind: 'rsort', title: 'Sort a list, take its head', human: '{3 1 2} SORT HEAD', exp: 1, keys: ['lbrace', 'd3', 'space', 'd1', 'space', 'd2', 'enter', 'sort', 'head'] },
      { kind: 'rvar', title: 'Named variable', human: "5 'A' STO  A 2 ×", exp: 10, keys: ['d5', 'enter', 'quote', 'chr:A', 'enter', 'sto', 'chr:A', 'enter', 'd2', 'mul'] },
    ],
    notes: ['Reverse-Polish-Lisp style stack processor: every object (number, list, vector, algebraic) lives on an unlimited stack. All stack and list logic is original U-45 code.', 'An algebraic typed in quotes stays symbolic until EVAL; arithmetic between algebraics joins them into a new algebraic.'],
    model({ K }) {
      const A = (f, act, o) => K(f, act, o);
      const L = (ch) => ({ a: [ch, 'chr:' + ch] });
      return {
        w: 352,
        theme: { body: 'linear-gradient(#3d4a3f,#1f2621)', cls: 'th-sp dark', vars: { '--bezel': '#141a15', '--key': '#2c3a30', '--kt': '#e9f5ea', '--knum': '#d7dccf', '--knt': '#1b211c', '--kop': '#4a5d4e', '--kopt': '#fff', '--kdel': '#8c2f1b', '--kdelt': '#fff', '--kshift': '#e07b00', '--kshiftt': '#000', '--kalpha': '#f2f2f2', '--kalphat': '#111', '--ls': '#ff9d2e', '--la': '#f2f2f2', '--pad': '#4a5d4e', '--padt': '#fff', '--lcd': '#b9c4a6', '--kr': '3px 3px 9px 9px' } },
        display: { w: 316, h: 150, cls: 'sx-lcdrpl' },
        sections: [
          { cols: 6, cls: 'ksoft', kc: 'sm', keys: [A('F1', 'sk1', { tip: 'Soft key 1 (label on screen)' }), A('F2', 'sk2', { tip: 'Soft key 2' }), A('F3', 'sk3', { tip: 'Soft key 3' }), A('F4', 'sk4', { tip: 'Soft key 4' }), A('F5', 'sk5', { tip: 'Soft key 5' }), A('F6', 'sk6', { tip: 'Soft key 6' })] },
          { cols: 6, cls: 'kfn', kc: 'fn sm', keys: [
            A('SHIFT', 'shift', { c: 'shift sm' }), A('ALPHA', 'alpha', { c: 'alpha sm' }), A('NXT', 'nxt', { tip: 'Next soft-menu page', s: ['PREV', 'prev', 'Previous soft-menu page'] }), A('▲', 'up', { tip: 'Scroll stack up' }), A('UNDO', 'undo', { s: ['LAST', 'lastx', 'Last argument'] }), A('ON', 'on', { c: 'del sm' }),
            A("' '", 'quote', Object.assign({ tip: 'Start an algebraic' }, L('A'))), A('{ }', 'lbrace', Object.assign({ tip: 'Start a list' }, L('B'))), A('[ ]', 'lbr', Object.assign({ tip: 'Start a vector' }, L('C'))), A('▼', 'down', Object.assign({ tip: 'Scroll stack down' }, L('D'))), A('EVAL', 'eval', Object.assign({ tip: 'Evaluate level 1', s: ['→NUM', 'tonum', 'Numeric value'] }, L('E'))), A('STO', 'sto', Object.assign({ s: ['RCL', 'rcl', 'Recall'] }, L('F'))),
            A('DUP', 'dup', Object.assign({ tip: 'Duplicate level 1', s: ['DUP2', 'dup2', 'Duplicate levels 1–2'] }, L('G'))), A('DROP', 'drop', Object.assign({ tip: 'Drop level 1', s: ['DROP2', 'drop2', 'Drop levels 1–2'] }, L('H'))), A('SWAP', 'swap', Object.assign({ tip: 'Swap levels 1 and 2', s: ['NIP', 'nip', 'Drop level 2'] }, L('I'))), A('OVER', 'over', Object.assign({ tip: 'Copy level 2', s: ['PICK', 'pick', 'Copy level n'] }, L('J'))), A('ROT', 'rot', Object.assign({ tip: 'Level 3 to level 1', s: ['ROLL', 'roll', 'Roll level n to 1'] }, L('K'))), A('→LIST', 'tolist', Object.assign({ tip: 'n items into a list', s: ['LIST→', 'listto', 'Explode a list'] }, L('L'))),
            A('ΣLIST', 'slist', Object.assign({ tip: 'Sum of list', s: ['ΠLIST', 'plist', 'Product of list'] }, L('M'))), A('SORT', 'sort', Object.assign({ tip: 'Sort a list', s: ['REVLST', 'revlist', 'Reverse a list'] }, L('N'))), A('HEAD', 'head', Object.assign({ tip: 'First element', s: ['TAIL', 'tail', 'All but first'] }, L('O'))), A('<i>x</i>²', 'sq', Object.assign({ s: ['√', 'sqrt'] }, L('P'))), A('<i>y</i><sup>x</sup>', 'pow', Object.assign({ s: ['1/<i>x</i>', 'inv'] }, L('Q'))), A('SIN', 'sin', Object.assign({ s: ['ASIN', 'asin'] }, L('R'))),
            A('COS', 'cos', Object.assign({ s: ['ACOS', 'acos'] }, L('S'))), A('TAN', 'tan', Object.assign({ s: ['ATAN', 'atan'] }, L('T'))), A('LN', 'ln', Object.assign({ s: ['e<sup>x</sup>', 'epow'] }, L('U'))), A('LOG', 'log', Object.assign({ s: ['10<sup>x</sup>', 'pow10'] }, L('V'))), A('REC', 'prg', Object.assign({ tip: 'Record keystrokes', s: ['VIEW', 'prgview', 'View program'] }, L('W'))), A('RUN', 'run', Object.assign({ tip: 'Run recorded program', s: ['VARS', 'vars', 'List variables'] }, L('X')))] },
          { cols: 5, cls: 'knum', keys: [
            A('ENTER', 'enter', { c: 'op exe', w: 2 }), A('+/−', 'chs', Object.assign({ c: 'num' }, L('Y'))), A('EEX', 'eex', Object.assign({ c: 'num' }, L('Z'))), A('⌫', 'bksp', { c: 'del', s: ['CLEAR', 'ac', 'Clear stack'] }),
            A('7', 'd7', { c: 'num' }), A('8', 'd8', { c: 'num' }), A('9', 'd9', { c: 'num' }), A('÷', 'div', { c: 'op' }), A('DRG', 'drg', { c: 'sm', s: ['MODE', 'setup', 'Display format'] }),
            A('4', 'd4', { c: 'num' }), A('5', 'd5', { c: 'num' }), A('6', 'd6', { c: 'num' }), A('×', 'mul', { c: 'op' }), A('n!', 'fact', { c: 'sm', s: ['DEPTH', 'depth', 'Stack depth'] }),
            A('1', 'd1', { c: 'num' }), A('2', 'd2', { c: 'num' }), A('3', 'd3', { c: 'num' }), A('−', 'sub', { c: 'op' }), A('SPC', 'space', { c: 'sm', tip: 'Space separator', s: ['π', 'pi'] }),
            A('0', 'd0', { c: 'num' }), A('.', 'dot', { c: 'num' }), A('DOT', 'dot', { c: 'sm', tip: 'Vector dot product' }), A('+', 'add', { c: 'op' }), A('CROSS', 'cross', { c: 'sm', tip: 'Vector cross product', s: ['NORM', 'norm', 'Vector length'] })] },
        ],
      };
    },
  };
  delete D.rpl.acts['chr:A'];
  for (let c = 65; c <= 90; c++) { const ch = String.fromCharCode(c); D.rpl.acts['chr:' + ch] = (S) => { S.cmd += ch; }; }

  // ============================ #19 ratn ============================
  const F = (v) => v && v.isFraction ? v : MF.fraction(nn(v));
  const int = (v) => { const x = nn(v); if (!Number.isInteger(x)) throw new Error('Integer needed'); if (Math.abs(x) > 9007199254740991) throw new Error('Too large'); return x; };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const isPrime = (n) => { if (n < 2) return false; if (n % 2 === 0) return n === 2; if (n % 3 === 0) return n === 3; for (let i = 5; i * i <= n; i += 6) if (n % i === 0 || n % (i + 2) === 0) return false; return true; };
  const factor = (n) => { const out = []; n = Math.abs(n); for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) { let e = 0; while (n % p === 0) { n /= p; e++; } if (e) out.push([p, e]); } if (n > 1) out.push([n, 1]); return out; };
  const mulmod = (a, b, m) => Number((BigInt(a) * BigInt(b)) % BigInt(m));
  const powmod = (b, e, m) => { if (m === 1) return 0; let r = 1n, B = ((BigInt(b) % BigInt(m)) + BigInt(m)) % BigInt(m), E = BigInt(e); const M = BigInt(m); while (E > 0n) { if (E & 1n) r = r * B % M; B = B * B % M; E >>= 1n; } return Number(r); };
  const egcd = (a, b) => { let [r0, r1, s0, s1] = [a, b, 1, 0]; while (r1) { const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; } return [r0, s0]; };
  const modinv = (a, m) => { const [g, s] = egcd(((a % m) + m) % m, m); if (g !== 1) throw new Error('No inverse (gcd ≠ 1)'); return ((s % m) + m) % m; };
  const bestFrac = (x, maxD) => { let [h0, h1, k0, k1] = [0, 1, 1, 0], v = x; for (let i = 0; i < 64; i++) { const a = Math.floor(v); const h2 = a * h1 + h0, k2 = a * k1 + k0; if (k2 > maxD) break; [h0, h1, k0, k1] = [h1, h2, k1, k2]; if (Math.abs(v - a) < 1e-12) break; v = 1 / (v - a); } return MF.fraction(h1, k1); };
  const cfrac = (fr) => { let n = BigInt(fr.s) * BigInt(fr.n), d = BigInt(fr.d); const out = []; while (d && out.length < 40) { let q = n / d; if (n < 0n && q * d !== n) q -= 1n; out.push(q); [n, d] = [d, n - q * d]; } return out; };
  const R = (k) => MF.fraction(k);
  const ratU = (fn) => (S) => S.unary(x => fn(x)), ratB = (fn) => (S) => S.binary((y, x) => fn(y, x));
  D.ratn = {
    family: 'rpn', styleName: 'four-level RPN with an exact rational (fraction) stack: key a number, ENTER, key the next, then the operation', app: 'specrpn',
    zero: () => MF.fraction(0),
    init(S) { S.disp = 'frac'; },
    ind(S) { return { frac: 'a/b', mixed: 'a b/c', dec: 'DEC' }[S.disp]; },
    parse(S, str) { const s = str.replace(/−/g, '-'); if (/\//.test(s)) { const [a, b] = s.split('/'); const nb = b === '' ? 1 : Number(b); if (nb === 0) return MF.fraction(Number(a || 0)); return MF.fraction(Number(a || 0)).div(nb); } const v = Number(s.replace(/E(-?\d+)$/, 'e$1') || 0); return Number.isFinite(v) && Math.abs(v) < 1e15 ? MF.fraction(v) : v; },
    format(S, v) {
      if (v && v.isFraction) { if (S.disp === 'dec' || v.d > 100000000n) return fmtReal(Number(v.valueOf()), S.fmt); return S.disp === 'mixed' ? C.fmtFrac(v, true).replace(/⌟(?=[^⌟]*⌟)/, ' ').replace('⌟', '/') : C.fmtFrac(v, false).replace('⌟', '/'); }
      return fmtAny(v, S.fmt);
    },
    acts: {
      fsep: (S) => { if (!S.entering) { S.digit('1'); } if (!/[/E]/.test(S.cmd)) S.cmd += '/'; },
      fd: (S) => { S.disp = { frac: 'mixed', mixed: 'dec', dec: 'frac' }[S.disp]; },
      toq: ratU(x => bestFrac(nn(x), 10000)), numer: ratU(x => R(Number(F(x).n) * Number(F(x).s))), denom: ratU(x => R(Number(F(x).d))),
      gcd: ratB((y, x) => R(gcd(int(y), int(x)))), lcm: ratB((y, x) => { const a = int(y), b = int(x); return R(a && b ? Math.abs(a / gcd(a, b) * b) : 0); }),
      mod: ratB((y, x) => { const b = nn(x); if (!b) throw new Error('Divide by 0'); return MF.mod(F(y), F(x)); }), idiv: ratB((y, x) => { if (!nn(x)) throw new Error('Divide by 0'); return R(Math.floor(nn(y) / nn(x))); }),
      isprime: (S) => { S.endEntry(); const n = int(S.st[0]); const p = isPrime(n); S.msg = n + (p ? ' is PRIME' : ' is NOT prime'); },
      factor: (S) => { S.endEntry(); const n = int(S.st[0]); if (Math.abs(n) < 2) { S.msg = 'No prime factors'; return; } const f = factor(n); S.showInfo('Prime factors of ' + n, [(n < 0 ? '−' : '') + f.map(([p, e]) => e > 1 ? p + '^' + e : String(p)).join(' × '), f.length + ' distinct prime(s)', 'divisors: ' + f.reduce((a, [, e]) => a * (e + 1), 1)]); },
      nextp: ratU(x => { let n = Math.floor(nn(x)) + 1; while (!isPrime(n)) n++; return R(n); }), prevp: ratU(x => { let n = Math.ceil(nn(x)) - 1; while (n >= 2 && !isPrime(n)) n--; if (n < 2) throw new Error('No smaller prime'); return R(n); }),
      phi: ratU(x => { const n = int(x); if (n < 1) throw new Error('n ≥ 1'); return R(factor(n).reduce((a, [p]) => a / p * (p - 1), n)); }),
      sigma: ratU(x => { const n = int(x); if (n < 1) throw new Error('n ≥ 1'); return R(factor(n).reduce((a, [p, e]) => a * (Math.pow(p, e + 1) - 1) / (p - 1), 1)); }),
      ndiv: ratU(x => { const n = int(x); if (n < 1) throw new Error('n ≥ 1'); return R(factor(n).reduce((a, [, e]) => a * (e + 1), 1)); }),
      modinv: ratB((y, x) => R(modinv(int(y), int(x)))),
      modpow: (S) => S.nary(3, (b, e, m) => { const M = int(m), E = int(e); if (M < 1) throw new Error('Modulus ≥ 1'); if (E < 0) return R(powmod(modinv(int(b), M), -E, M)); return R(powmod(int(b), E, M)); }),
      crt: (S) => S.nary(4, (a1, m1, a2, m2) => { const A1 = int(a1), M1 = int(m1), A2 = int(a2), M2 = int(m2); const g = gcd(M1, M2); if ((A2 - A1) % g) throw new Error('No solution'); const l = M1 / g * M2; const k = mulmod(((A2 - A1) / g % (M2 / g) + M2 / g) % (M2 / g), M2 / g === 1 ? 0 : modinv(M1 / g, M2 / g), M2 / g); const r = ((A1 + M1 * k) % l + l) % l; S.msg = 'x ≡ ' + r + ' (mod ' + l + ')'; return R(r); }),
      fib: ratU(x => { const n = int(x); if (n < 0 || n > 78) throw new Error('0 ≤ n ≤ 78'); let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return R(a); }),
      digsum: ratU(x => R(String(Math.abs(int(x))).split('').reduce((a, d) => a + +d, 0))), revdig: ratU(x => { const n = int(x); return R(Math.sign(n) * Number(String(Math.abs(n)).split('').reverse().join(''))); }),
      perfect: (S) => { S.endEntry(); const n = int(S.st[0]); const s = n > 0 ? factor(n).reduce((a, [p, e]) => a * (Math.pow(p, e + 1) - 1) / (p - 1), 1) - n : 0; S.msg = n + (s === n ? ' is PERFECT' : s > n ? ' is ABUNDANT' : ' is DEFICIENT') + ' (aliquot sum ' + s + ')'; },
      cfrac: (S) => { S.endEntry(); const fr = F(S.st[0]); const a = cfrac(fr); S.showInfo('Continued fraction', ['[' + a[0] + (a.length > 1 ? '; ' + a.slice(1).join(', ') : '') + ']', a.length + ' partial quotient(s)']); },
      egypt: (S) => { S.endEntry(); let fr = F(S.st[0]); if (nn(fr) <= 0 || nn(fr) >= 1) throw new Error('Need 0 < x < 1'); const out = []; while (fr.n > 0n && out.length < 12) { const d = (fr.d + fr.n - 1n) / fr.n; out.push('1/' + d); fr = fr.sub(MF.fraction(1).div(Number(d))); } S.showInfo('Egyptian fraction', [out.join(' + '), out.length + ' unit fraction(s) (greedy method)']); },
      mediant: ratB((y, x) => { const a = F(y), b = F(x); return MF.fraction(Number(a.n * BigInt(a.s) + b.n * BigInt(b.s)), Number(a.d + b.d)); }),
      floor: ratU(x => R(Math.floor(nn(x)))), ceil: ratU(x => R(Math.ceil(nn(x)))), round: ratU(x => R(Math.round(nn(x)))), ip: ratU(x => R(Math.trunc(nn(x)))), fp: ratU(x => F(x).sub(Math.trunc(nn(x)))),
      ncr: ratB((y, x) => R(Number(MX.combinations(int(y), int(x))))), npr: ratB((y, x) => R(Number(MX.permutations(int(y), int(x))))),
      tri: ratU(x => { const n = int(x); return R(n * (n + 1) / 2); }), collatz: ratU(x => { let n = int(x), k = 0; if (n < 1) throw new Error('n ≥ 1'); while (n !== 1 && k < 10000) { n = n % 2 ? 3 * n + 1 : n / 2; k++; } return R(k); }),
      pcount: ratU(x => { const n = int(x); if (n > 10000000) throw new Error('n ≤ 10⁷'); let c = 0; for (let i = 2; i <= n; i++) if (isPrime(i)) c++; return R(c); }),
      sq: ratU(x => MX.multiply(F(x), F(x))), inv: ratU(x => { if (!nn(x)) throw new Error('Divide by 0'); return MF.fraction(1).div(F(x)); }),
      ypow: ratB((y, x) => { const e = nn(x); if (Number.isInteger(e) && Math.abs(e) < 200) { if (!nn(y) && e < 0) throw new Error('Divide by 0'); return F(y).pow(e); } return Math.pow(nn(y), e); }),
      sqrt: ratU(x => { const v = nn(x); if (v < 0) throw new Error('Domain ERROR'); const fr = F(x); const a = Math.round(Math.sqrt(Number(fr.n))), b = Math.round(Math.sqrt(Number(fr.d))); return a * a === Number(fr.n) && b * b === Number(fr.d) ? MF.fraction(a, b) : Math.sqrt(v); }),
    },
    features: [
      'Exact rational stack: every level holds a fraction, never a rounded decimal', 'Fraction entry with the a/b key (3 a/b 4)', 'Decimal entry converts exactly (0.75 → 3/4)',
      'Display cycle: improper fraction → mixed number → decimal', 'Four-level stack X Y Z T with ENTER, x↔y, R↓, LAST X and UNDO', '→Q best fraction approximation (denominator ≤ 10 000)',
      'NUM and DEN extract numerator and denominator', 'GCD and LCM', 'MOD and integer division DIV', 'Primality test IS PRIME?', 'Prime factorization screen with exponents', 'Next prime and previous prime',
      'Euler totient φ(n)', 'Divisor sum σ(n) and divisor count d(n)', 'Modular inverse a⁻¹ mod m', 'Modular power bᵉ mod m (BigInt, any size exponent)', 'Chinese remainder theorem for two congruences',
      'Fibonacci F(n)', 'Digit sum and digit reversal', 'Perfect / abundant / deficient classification', 'Continued-fraction expansion', 'Egyptian-fraction (greedy) decomposition',
      'Mediant of two fractions', 'FLOOR, CEIL, ROUND, IP and FP', 'nCr and nPr', 'Triangular numbers', 'Collatz step count', 'Prime-counting π(n)', 'Exact powers of fractions with integer exponents',
      'Exact square roots of perfect-square fractions', 'Registers R0–R9 via STO / RCL + digit',
    ],
    examples: [
      { kind: 'qadd', title: 'Add two fractions', human: '3/4 ENTER 1/6 +', exp: 11 / 12, keys: ['d3', 'fsep', 'd4', 'enter', 'd1', 'fsep', 'd6', 'add'] },
      { kind: 'qgcd', title: 'Greatest common divisor', human: '12 ENTER 18 GCD', exp: 6, keys: ['d1', 'd2', 'enter', 'd1', 'd8', 'gcd'] },
      { kind: 'qlcm', title: 'Least common multiple', human: '4 ENTER 6 LCM', exp: 12, keys: ['d4', 'enter', 'd6', 'lcm'] },
      { kind: 'qphi', title: 'Euler totient', human: 'φ(10)', exp: 4, keys: ['d1', 'd0', 'phi'] },
      { kind: 'qnext', title: 'Next prime', human: 'NEXTP after 14', exp: 17, keys: ['d1', 'd4', 'nextp'] },
      { kind: 'qpowm', title: 'Modular power', human: '3 ENTER 4 ENTER 5 bᵉmod', exp: 1, keys: ['d3', 'enter', 'd4', 'enter', 'd5', 'modpow'] },
      { kind: 'qinv', title: 'Modular inverse', human: '3 ENTER 7 INV mod', exp: 5, keys: ['d3', 'enter', 'd7', 'modinv'] },
      { kind: 'qnum', title: 'Numerator of a decimal', human: '0.75 NUM', exp: 3, keys: ['d0', 'dot', 'd7', 'd5', 'numer'] },
    ],
    notes: ['Rational & number-theory RPN: the four-level stack holds exact fractions (math.js Fraction objects). Number-theory routines are original U-45 code; modular power uses BigInt.', 'Results that cannot be exact (e.g. √2) are shown as decimals.'],
    model({ K }) {
      return {
        w: 344,
        theme: { body: 'linear-gradient(#ffffff,#eceff1)', cls: 'th-sp', vars: { '--bezel': '#b71c1c', '--key': '#37474f', '--kt': '#fff', '--knum': '#ffffff', '--knt': '#b71c1c', '--kop': '#b71c1c', '--kopt': '#fff', '--kdel': '#263238', '--kdelt': '#fff', '--kshift': '#1565c0', '--kshiftt': '#fff', '--ls': '#1565c0', '--la': '#1565c0', '--lcd': '#e3f2fd', '--kr': '14px' } },
        display: { w: 304, h: 104, cls: 'sx-lcdq' },
        sections: [
          { cols: 6, cls: 'knt', kc: 'fn sm', keys: [K('SHIFT', 'shift', { c: 'shift sm' }), K('PRIME?', 'isprime', { tip: 'Primality test of X', s: ['FACTOR', 'factor', 'Prime factorization'] }), K('NXTP', 'nextp', { tip: 'Next prime', s: ['PRVP', 'prevp', 'Previous prime'] }), K('φ', 'phi', { tip: 'Euler totient', s: ['σ', 'sigma', 'Divisor sum'] }), K('GCD', 'gcd', { tip: 'GCD of Y and X', s: ['LCM', 'lcm', 'LCM of Y and X'] }), K('ON', 'on', { c: 'del sm' }),
            K('MOD', 'mod', { tip: 'Y mod X', s: ['DIV', 'idiv', 'Integer quotient'] }), K('INV m', 'modinv', { tip: 'Y⁻¹ mod X', s: ['CRT', 'crt', 'Chinese remainder (T mod Z, Y mod X)'] }), K('bᵉmod', 'modpow', { tip: 'Z^Y mod X', s: ['d(n)', 'ndiv', 'Divisor count'] }), K('→Q', 'toq', { tip: 'Best fraction approximation', s: ['CF', 'cfrac', 'Continued fraction'] }), K('NUM', 'numer', { tip: 'Numerator', s: ['DEN', 'denom', 'Denominator'] }), K('EGYPT', 'egypt', { tip: 'Egyptian fraction', s: ['MEDNT', 'mediant', 'Mediant'] }),
            K('FIB', 'fib', { tip: 'Fibonacci number', s: ['TRI', 'tri', 'Triangular number'] }), K('DSUM', 'digsum', { tip: 'Digit sum', s: ['DREV', 'revdig', 'Reverse digits'] }), K('PERF?', 'perfect', { tip: 'Perfect / abundant / deficient', s: ['COLTZ', 'collatz', 'Collatz steps'] }), K('π(n)', 'pcount', { tip: 'Count primes ≤ n', s: ['FLOOR', 'floor'] }), K('IP', 'ip', { s: ['CEIL', 'ceil'] }), K('FP', 'fp', { s: ['RND', 'round'] })] },
          { cols: 5, cls: 'knum', keys: [
            K('a/b', 'fsep', { c: 'fn', tip: 'Fraction bar during entry' }), K('F↔D', 'fd', { c: 'fn', tip: 'Fraction / mixed / decimal display', s: ['MODE', 'setup'] }), K('<i>x</i>²', 'sq', { c: 'fn', s: ['√<i>x</i>', 'sqrt'] }), K('<i>y</i><sup>x</sup>', 'ypow', { c: 'fn', s: ['1/<i>x</i>', 'inv'] }), K('<i>n</i>C<i>r</i>', 'ncr', { c: 'fn', s: ['<i>n</i>P<i>r</i>', 'npr'] }),
            K('ENTER', 'enter', { c: 'op exe', w: 2 }), K('<i>x</i>↔<i>y</i>', 'swap', { c: 'fn' }), K('R↓', 'rdn', { c: 'fn', s: ['LAST<i>x</i>', 'lastx'] }), K('CLx', 'clx', { c: 'del', s: ['CLST', 'ac', 'Clear stack'] }),
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('÷', 'div', { c: 'op' }), K('⌫', 'bksp', { c: 'del', s: ['UNDO', 'undo'] }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('STO', 'sto', { c: 'fn' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('−', 'sub', { c: 'op' }), K('RCL', 'rcl', { c: 'fn' }),
            K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('CHS', 'chs', { c: 'num' }), K('+', 'add', { c: 'op' }), K('EEX', 'eex', { c: 'fn' })] },
        ],
      };
    },
  };

  // ============================ #37 navt ============================
  const NM_KM = 1.852, FT_M = 0.3048, KT_FPM = 101.2686, RE_NM = 3440.065;
  const toHMS = (h) => { const s = h < 0 ? -1 : 1; let t = Math.round(Math.abs(h) * 360000) / 100; const H = Math.floor(t / 3600); t -= H * 3600; const M = Math.floor(t / 60); const S = t - M * 60; return s * (H + M / 100 + S / 10000); };
  const fromHMS = (x) => { const s = x < 0 ? -1 : 1; const a = Math.abs(x) + 1e-12; const H = Math.floor(a); const M = Math.floor((a - H) * 100); const S = ((a - H) * 100 - M) * 100; return s * (H + M / 60 + S / 3600); };
  const norm360 = (a) => ((a % 360) + 360) % 360;
  const nU = (fn) => (S) => S.unary(x => fn(S.num(x))), nB = (fn) => (S) => S.binary((y, x) => fn(S.num(y), S.num(x)));
  function windForm(S) {
    S.openForm('WIND TRIANGLE', [['tc', 'True course °', 90], ['tas', 'TAS kt', 120], ['wd', 'Wind from °', 30], ['ws', 'Wind kt', 20]], (A, v) => {
      const wca = Math.asin(v.ws * Math.sin((v.wd - v.tc) * DEG) / v.tas) / DEG; if (!isFinite(wca)) return 'Wind too strong for this TAS';
      const hdg = norm360(v.tc + wca), gs = v.tas * Math.cos(wca * DEG) - v.ws * Math.cos((v.wd - v.tc) * DEG);
      A.lift && A.push(A.st[0]); A.st[0] = gs; A.push(hdg); A.lift = true;
      A.showInfo('Wind triangle', ['Heading ' + fmtReal(hdg, { m: 'fix', d: 1 }) + '° (X)', 'Ground speed ' + fmtReal(gs, { m: 'fix', d: 1 }) + ' kt (Y)', 'Wind correction ' + fmtReal(wca, { m: 'fix', d: 1 }) + '°']);
    });
  }
  D.navt = {
    family: 'rpn', styleName: 'four-level RPN navigation computer: enter the inputs bottom-up (Y then X; for 4-input tools T, Z, Y, X) and press the tool key', app: 'specrpn', angle: 'deg',
    regNames: ['T', 'Z', 'Y', 'X'],
    ind() { return 'NAV'; },
    acts: {
      tohms: nU(toHMS), hmsto: nU(fromHMS), hmsadd: nB((y, x) => toHMS(fromHMS(y) + fromHMS(x))), hmssub: nB((y, x) => toHMS(fromHMS(y) - fromHMS(x))),
      ttime: nB((d, s) => { if (!s) throw new Error('Speed is 0'); return d / s; }), tspd: nB((d, t) => { if (!t) throw new Error('Time is 0'); return d / t; }), tdist: nB((s, t) => s * t), fuel: nB((rate, t) => rate * t),
      endur: nB((fuelQ, rate) => { if (!rate) throw new Error('Rate is 0'); return toHMS(fuelQ / rate); }),
      gcd: (S) => S.nary(4, (la1, lo1, la2, lo2) => { const [a, b, c, d] = [la1, lo1, la2, lo2].map(v => S.num(v) * DEG); const h = Math.sin((c - a) / 2) ** 2 + Math.cos(a) * Math.cos(c) * Math.sin((d - b) / 2) ** 2; const dist = 2 * RE_NM * Math.asin(Math.min(1, Math.sqrt(h))); const crs = norm360(Math.atan2(Math.sin(d - b) * Math.cos(c), Math.cos(a) * Math.sin(c) - Math.sin(a) * Math.cos(c) * Math.cos(d - b)) / DEG); S.msg = 'Initial course ' + fmtReal(crs, { m: 'fix', d: 1 }) + '° (Y)'; return [crs, dist]; }),
      recip: nU(x => norm360(x + 180)), magv: nB((t, v) => norm360(t - v)), wind: (S) => windForm(S),
      xwind: (S) => S.nary(2, (ang, spd) => { const a = S.num(ang) * DEG, w = S.num(spd); const hw = w * Math.cos(a), xw = w * Math.sin(a); S.msg = 'Headwind ' + fmtReal(hw, { m: 'fix', d: 1 }) + ' kt (Y), crosswind ' + fmtReal(xw, { m: 'fix', d: 1 }) + ' kt (X)'; return [hw, xw]; }),
      nm2km: nU(x => x * NM_KM), km2nm: nU(x => x / NM_KM), nm2mi: nU(x => x * 1.150779), mi2nm: nU(x => x / 1.150779), kt2kmh: nU(x => x * NM_KM), kmh2kt: nU(x => x / NM_KM),
      ft2m: nU(x => x * FT_M), m2ft: nU(x => x / FT_M), c2f: nU(x => x * 9 / 5 + 32), f2c: nU(x => (x - 32) * 5 / 9), lb2kg: nU(x => x * 0.45359237), kg2lb: nU(x => x / 0.45359237),
      gal2l: nU(x => x * 3.785411784), l2gal: nU(x => x / 3.785411784), inhg2hpa: nU(x => x * 33.8638866), hpa2inhg: nU(x => x / 33.8638866),
      isa: nU(alt => 15 - 1.98 * alt / 1000), palt: nB((elev, setting) => elev + (29.92 - setting) * 1000), dalt: nB((pa, oat) => pa + 118.8 * (oat - (15 - 1.98 * pa / 1000))),
      tod: nU(dAlt => dAlt / 1000 * 3), rod: nB((gs, ang) => gs * KT_FPM * Math.tan(ang * DEG)), glide: nB((alt, ratio) => alt * ratio / 6076.12), grad: nB((fpm, gs) => { if (!gs) throw new Error('GS is 0'); return fpm * 60 / gs; }),
      mach: nB((tas, oat) => tas / (38.967854 * Math.sqrt(oat + 273.15))), tas: nB((cas, dAlt) => cas * (1 + 0.02 * dAlt / 1000)),
      turnr: nU(tas => tas / 188.5), bank: nU(tas => Math.atan(tas * NM_KM / 3.6 * 0.05236 / 9.80665) / DEG),
      slope: nU(pct => Math.atan(pct / 100) / DEG), pctof: nU(deg => Math.tan(deg * DEG) * 100), tz: nB((utc, off) => toHMS(((fromHMS(utc) + fromHMS(off)) % 24 + 24) % 24)),
      eta: nB((dep, ete) => toHMS(((fromHMS(dep) + fromHMS(ete)) % 24 + 24) % 24)),
    },
    features: [
      'Four-level RPN stack X Y Z T with ENTER, x↔y, R↓, LAST X and UNDO', 'Decimal hours → H.MMSS (→HMS) and back (HMS→)', 'HMS addition and subtraction', 'Time from distance and speed',
      'Speed from distance and time', 'Distance from speed and time', 'Fuel used from burn rate and time', 'Endurance (H.MMSS) from fuel on board and burn rate', 'Great-circle distance between two lat/lon points',
      'Initial great-circle course', 'Reciprocal heading (±180°)', 'True → magnetic with variation', 'Wind triangle: heading, ground speed and wind-correction angle', 'Headwind and crosswind components',
      'Nautical miles ↔ kilometres', 'Nautical miles ↔ statute miles', 'Knots ↔ km/h', 'Feet ↔ metres', '°C ↔ °F', 'Pounds ↔ kilograms', 'US gallons ↔ litres', 'inHg ↔ hPa',
      'ISA temperature at an altitude', 'Pressure altitude from field elevation and altimeter setting', 'Density altitude from pressure altitude and OAT', 'Top-of-descent distance (3 nm per 1 000 ft)',
      'Rate of descent for a glide-path angle and ground speed', 'Glide distance from altitude and glide ratio', 'Climb gradient (ft/nm) from rate and ground speed', 'Mach number from TAS and OAT',
      'TAS estimate from CAS and altitude (2 % per 1 000 ft)', 'Standard-rate turn radius and bank angle', 'Slope % ↔ degrees', 'Time-zone conversion and ETA in H.MMSS',
    ],
    examples: [
      { kind: 'ntime', title: 'Flight time', human: '120 nm ENTER 100 kt TIME', exp: 1.2, keys: ['d1', 'd2', 'd0', 'enter', 'd1', 'd0', 'd0', 'ttime'] },
      { kind: 'nrecip', title: 'Reciprocal heading', human: '90 RECIP', exp: 270, keys: ['d9', 'd0', 'recip'] },
      { kind: 'nkm', title: 'Nautical miles to km', human: '10 nm→km', exp: 18.52, keys: ['d1', 'd0', 'nm2km'] },
      { kind: 'nhms', title: 'Decimal hours to H.MMSS', human: '1.5 →HMS', exp: 1.3, keys: ['d1', 'dot', 'd5', 'tohms'] },
      { kind: 'nft', title: 'Feet to metres', human: '1000 ft→m', exp: 304.8, keys: ['d1', 'd0', 'd0', 'd0', 'ft2m'] },
      { kind: 'nc2f', title: 'ISA sea-level temperature in °F', human: '15 °C→°F', exp: 59, keys: ['d1', 'd5', 'c2f'] },
      { kind: 'ngc', title: 'Great-circle distance along the equator', human: '0 ENTER 0 ENTER 0 ENTER 1 GC', exp: RE_NM * Math.PI / 180, keys: ['d0', 'enter', 'd0', 'enter', 'd0', 'enter', 'd1', 'gcd'] },
      { kind: 'ntod', title: 'Top-of-descent distance', human: '9000 ft TOD', exp: 27, keys: ['d9', 'd0', 'd0', 'd0', 'tod'] },
    ],
    notes: ['Navigation & flight-computer RPN for training and planning exercises (not certified for real navigation). Formulas: haversine great-circle on a 3 440.065 nm sphere, standard wind-triangle trigonometry, ISA lapse 1.98 °C / 1 000 ft.', 'Times use the H.MMSS convention: 1.3000 means 1 h 30 min 00 s.'],
    model({ K }) {
      return {
        w: 470,
        theme: { body: 'linear-gradient(#0b2545,#13315c)', cls: 'th-sp dark', vars: { '--bezel': '#061a33', '--key': '#1d3d6b', '--kt': '#fff', '--knum': '#eef4ed', '--knt': '#0b2545', '--kop': '#ff8c00', '--kopt': '#000', '--kdel': '#c0392b', '--kdelt': '#fff', '--kshift': '#8da9c4', '--kshiftt': '#000', '--ls': '#8da9c4', '--la': '#ff8c00', '--lcd': '#0d1b2a', '--kr': '4px' } },
        display: { w: 430, h: 96, cls: 'sx-lcdnav' },
        sections: [
          { cols: 8, cls: 'knav', kc: 'fn sm', keys: [
            K('SHIFT', 'shift', { c: 'shift sm' }), K('TIME', 'ttime', { tip: 'Time = Y dist ÷ X speed', s: ['ETA', 'eta', 'ETA = Y dep + X ete (H.MMSS)'] }), K('SPD', 'tspd', { tip: 'Speed = Y dist ÷ X time', s: ['ENDUR', 'endur', 'Endurance = Y fuel ÷ X rate'] }), K('DIST', 'tdist', { tip: 'Distance = Y speed × X time', s: ['FUEL', 'fuel', 'Fuel = Y rate × X time'] }), K('→HMS', 'tohms', { tip: 'Decimal hours to H.MMSS', s: ['HMS→', 'hmsto', 'H.MMSS to decimal hours'] }), K('HMS+', 'hmsadd', { s: ['HMS−', 'hmssub', 'Subtract H.MMSS'] }), K('TZ', 'tz', { tip: 'UTC (Y) + offset (X)' }), K('ON', 'on', { c: 'del sm' }),
            K('WIND', 'wind', { tip: 'Wind triangle form' }), K('XWIND', 'xwind', { tip: 'Head/crosswind: Y angle, X wind speed' }), K('GC', 'gcd', { tip: 'Great circle: T lat1, Z lon1, Y lat2, X lon2' }), K('RECIP', 'recip', { s: ['MAG', 'magv', 'Magnetic = Y true − X variation (E+)'] }), K('ISA', 'isa', { tip: 'ISA temperature at X ft', s: ['PALT', 'palt', 'Pressure alt: Y elevation, X altimeter inHg'] }), K('DALT', 'dalt', { tip: 'Density alt: Y pressure alt, X OAT °C' }), K('MACH', 'mach', { tip: 'Mach: Y TAS kt, X OAT °C', s: ['TAS', 'tas', 'TAS: Y CAS, X altitude ft'] }), K('TOD', 'tod', { tip: 'Descent distance for X ft', s: ['ROD', 'rod', 'Rate of descent: Y GS, X angle'] }),
            K('nm→km', 'nm2km', { s: ['km→nm', 'km2nm'] }), K('nm→mi', 'nm2mi', { s: ['mi→nm', 'mi2nm'] }), K('kt→kmh', 'kt2kmh', { s: ['kmh→kt', 'kmh2kt'] }), K('ft→m', 'ft2m', { s: ['m→ft', 'm2ft'] }), K('°C→°F', 'c2f', { s: ['°F→°C', 'f2c'] }), K('lb→kg', 'lb2kg', { s: ['kg→lb', 'kg2lb'] }), K('gal→L', 'gal2l', { s: ['L→gal', 'l2gal'] }), K('inHg→hPa', 'inhg2hpa', { s: ['hPa→inHg', 'hpa2inhg'] }),
            K('GLIDE', 'glide', { tip: 'Glide distance: Y alt ft, X ratio', s: ['GRAD', 'grad', 'Climb gradient: Y fpm, X GS'] }), K('TURN R', 'turnr', { tip: 'Standard-rate turn radius (nm) at X kt', s: ['BANK', 'bank', 'Standard-rate bank angle'] }), K('SLOPE°', 'slope', { tip: 'Slope % to degrees', s: ['%SLOPE', 'pctof', 'Degrees to slope %'] }), K('SIN', 'sin', { s: ['ASIN', 'asin'] }), K('COS', 'cos', { s: ['ACOS', 'acos'] }), K('TAN', 'tan', { s: ['ATAN', 'atan'] }), K('√<i>x</i>', 'sqrt', { s: ['<i>x</i>²', 'sq'] }), K('<i>y</i><sup>x</sup>', 'ypow', { s: ['1/<i>x</i>', 'inv'] })] },
          { cols: 8, cls: 'knum', keys: [
            K('7', 'd7', { c: 'num' }), K('8', 'd8', { c: 'num' }), K('9', 'd9', { c: 'num' }), K('÷', 'div', { c: 'op' }), K('<i>x</i>↔<i>y</i>', 'swap', { c: 'fn' }), K('R↓', 'rdn', { c: 'fn' }), K('STO', 'sto', { c: 'fn' }), K('RCL', 'rcl', { c: 'fn' }),
            K('4', 'd4', { c: 'num' }), K('5', 'd5', { c: 'num' }), K('6', 'd6', { c: 'num' }), K('×', 'mul', { c: 'op' }), K('LAST<i>x</i>', 'lastx', { c: 'fn' }), K('UNDO', 'undo', { c: 'fn' }), K('CLx', 'clx', { c: 'del' }), K('CLST', 'ac', { c: 'del' }),
            K('1', 'd1', { c: 'num' }), K('2', 'd2', { c: 'num' }), K('3', 'd3', { c: 'num' }), K('−', 'sub', { c: 'op' }), K('CHS', 'chs', { c: 'fn' }), K('EEX', 'eex', { c: 'fn' }), K('%', 'pct', { c: 'fn', s: ['Δ%', 'dpct'] }), K('MODE', 'setup', { c: 'sm' }),
            K('0', 'd0', { c: 'num' }), K('.', 'dot', { c: 'num' }), K('⌫', 'bksp', { c: 'del' }), K('+', 'add', { c: 'op' }), K('ENTER', 'enter', { c: 'op exe', w: 4 })] },
        ],
      };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
