/* 45 calculator model specs: layout (keys/labels/colors/display) + behaviour config.
   All names are generic; no brand names or logos. */
(function (G) {
  'use strict';
  const U = G.CalcUI;
  const K = (face, act, o) => U.k(face, act, o);
  const sp = (w, r) => Object.assign(U.sp(w), r ? { r } : {});
  const PAD = (kind, o) => Object.assign({ pad: kind }, o || {});
  const SOLAR = '<div class="solar"></div>';

  // =====================================================================
  //  Natural-display scientific (2-line, SHIFT/ALPHA/REPLAY) — #1 #6 #25 #44
  // =====================================================================
  function esFnRows(v) {
    return [
      K('<span class="tf">▭/▭</span>', 'frac', { s: ['▭⌟▭/▭', 'mixed'] }),
      K('√▭', 'sqrt', { s: ['∛▭', 'cbrt'] }),
      K('<i>x</i>²', 'sq', { s: ['<i>x</i>³', 'cube'], b: ['DEC', 'base:10'] }),
      K('<i>x</i><sup>▭</sup>', 'pow', { s: ['<sup>▭</sup>√▭', 'nroot'], b: ['HEX', 'base:16'] }),
      K('log', 'log', { s: ['10<sup>▭</sup>', 'pow10'], b: ['BIN', 'base:2'] }),
      K('ln', 'ln', { s: ['e<sup>▭</sup>', 'epow'], b: ['OCT', 'base:8'] }),
      K('(−)', 'neg', { s: ['∠', 'angle'], a: ['A', 'var:A'] }),
      K('°′″', 'dms', { s: [v === 'b' ? 'FACT' : '←', v === 'b' ? 'msg:Prime factorisation:<br>use FACT in BASE-free COMP' : 'dms'], a: ['B', 'var:B'] }),
      K('hyp', 'hyp', { s: ['Abs', 'abs'], a: ['C', 'var:C'] }),
      K('sin', 'sin', { s: ['sin⁻¹', 'asin'], a: ['D', 'var:D'] }),
      K('cos', 'cos', { s: ['cos⁻¹', 'acos'], a: ['E', 'var:E'] }),
      K('tan', 'tan', { s: ['tan⁻¹', 'atan'], a: ['F', 'var:F'] }),
      K('RCL', 'rcl', { s: ['STO', 'sto'] }),
      K('ENG', 'eng', { s: ['←', 'engl'], a: ['<i>i</i>', 'i'] }),
      K('(', 'lp', { s: ['%', 'pct'] }),
      K(')', 'rp', { s: [',', 'comma'], a: ['X', 'var:X'] }),
      K('S⇔D', 'sd', { s: ['a<sup>b</sup>/<sub>c</sub>⇔<sup>d</sup>/<sub>c</sub>', 'mixedtoggle'], a: ['Y', 'var:Y'] }),
      K('M+', 'mplus', { s: ['M−', 'mminus'], a: ['M', 'var:M'] }),
    ];
  }
  function esNumRows(o) {
    o = o || {};
    const n = 'num', del = 'del';
    return [
      K('7', 'd7', { c: n, s: o.noConst ? undefined : ['CONST', 'const'] }), K('8', 'd8', { c: n, s: o.noConst ? undefined : ['CONV', 'conv'] }), K('9', 'd9', { c: n, s: ['CLR', 'clr'] }),
      K('DEL', 'del', { c: del, s: ['INS', 'ins'] }), K('AC', 'onac', { c: del, s: ['OFF', 'off'] }),
      K('4', 'd4', { c: n, s: o.noMat ? undefined : ['MATRIX', 'matmenu'] }), K('5', 'd5', { c: n, s: o.noMat ? undefined : ['VECTOR', 'vctmenu'] }), K('6', 'd6', { c: n }),
      K('×', 'mul', { c: 'op', s: ['<i>n</i>P<i>r</i>', 'npr'], a: o.gcd ? ['GCD', 'gcd'] : undefined }), K('÷', 'div', { c: 'op', s: ['<i>n</i>C<i>r</i>', 'ncr'], a: o.gcd ? ['LCM', 'lcm'] : undefined }),
      K('1', 'd1', { c: n, s: ['STAT', 'statmenu'] }), K('2', 'd2', { c: n, s: o.noMat ? undefined : ['CMPLX', 'cmplxmenu'] }), K('3', 'd3', { c: n, s: o.noMat ? undefined : ['BASE', 'basemenu'] }),
      K('+', 'add', { c: 'op', s: ['Pol', 'pol'], a: o.gcd ? ['Int', 'int'] : undefined }), K('−', 'sub', { c: 'op', s: ['Rec', 'rec'], a: o.gcd ? ['Intg', 'intg'] : undefined }),
      K('0', 'd0', { c: n, s: ['Rnd', 'rnd'] }), K('•', 'dot', { c: n, s: ['Ran#', 'ran'], a: ['RanInt', 'ranint'] }),
      K('×10<sup><i>x</i></sup>', 'exp10', { c: n, s: ['π', 'pi'], a: ['<i>e</i>', 'e'] }),
      K('Ans', 'ans', { c: n, s: ['DRG▶', 'drg'], a: o.gcd ? ['PreAns', 'preans'] : undefined }), K('=', 'exe', { c: n }),
    ];
  }
  function esModel(id, name, v, theme) {
    const top = v === 'b'
      ? [K('Abs', 'abs', { s: ['÷R', 'msg:÷R: use Int( and MOD'] }), K('<i>x</i>³', 'cube', { s: ['∛▭', 'cbrt'], a: [':', 'colon'] }),
         K('<i>x</i>⁻¹', 'inv', { s: ['<i>x</i>!', 'fact'] }), K('log<sub>▭</sub>▭', 'logab', { s: ['Σ', 'sigma'] })]
      : [K('CALC', 'calc', { s: ['SOLVE', 'solve'], a: ['=', 'eq'] }), K('∫▭', 'integ', { s: ['d/d<i>x</i>', 'deriv'], a: [':', 'colon'] }),
         K('<i>x</i>⁻¹', 'inv', { s: ['<i>x</i>!', 'fact'] }), K('log<sub>▭</sub>▭', 'logab', { s: ['Σ', 'sigma'] })];
    return {
      id, name, app: 'sci', w: 360, theme, cls: 'es', top: SOLAR,
      display: { kind: 'nat', w: 296, h: 96 },
      cfg: { natural: true, lines: 2, family: 'es', digits: 10 },
      sections: [
        { cols: '1fr 1fr 1.6fr 1fr 1fr', cls: 'ktop', keys: [
          K('SHIFT', 'shift', { c: 'shift sm round' }), K('ALPHA', 'alpha', { c: 'alpha sm round' }),
          PAD('replay', { r: 2, label: 'REPLAY' }),
          K('MODE', 'mode', { c: 'sm round fnlite', s: ['SETUP', 'setup'] }), K('ON', 'on', { c: 'sm round fnlite' }),
          top[0], top[1], top[2], top[3] ] },
        { cols: 6, cls: 'kfn', kc: 'fn sm', keys: esFnRows(v) },
        { cols: 5, cls: 'knum', keys: esNumRows(v === 'b' ? { noConst: true, noMat: true, gcd: true } : {}) },
      ],
      notes: 'Natural textbook input with templates (fraction, root, power, log base, ∫, d/dx, Σ). MODE: COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR. SHIFT/ALPHA act on the next key; ALPHA + letter recalls a variable, SHIFT RCL (STO) stores to it.',
    };
  }
  const TH_ES_SILVER = { body: 'linear-gradient(#e9eaef,#c9cad3)', cls: 'th-es', vars: { '--bezel': '#cfd0d8', '--key': '#3a3b45', '--kt': '#fff', '--knum': '#f7f7f9', '--knt': '#222', '--kop': '#f7f7f9', '--kopt': '#222', '--kdel': '#f39a3a', '--kdelt': '#fff', '--kshift': '#7b74b8', '--kshiftt': '#fff', '--kalpha': '#7b74b8', '--kalphat': '#fff', '--ls': '#a8761a', '--la': '#c3243a', '--lb': '#2b62b8', '--pad': '#8a83c6', '--padt': '#fff', '--edge': '#7d73bd', '--lcd': '#cfd6c6' } };
  const TH_ES_NAVY = { body: 'linear-gradient(#2a2c44,#1b1c2c)', cls: 'th-es dark', vars: { '--bezel': '#23243a', '--key': '#3e4055', '--kt': '#fff', '--knum': '#2b2c3b', '--knt': '#fff', '--kop': '#2b2c3b', '--kopt': '#fff', '--kdel': '#f08a2c', '--kdelt': '#222', '--kshift': '#6a5fc8', '--kshiftt': '#fff', '--kalpha': '#6a5fc8', '--kalphat': '#fff', '--ls': '#e0b040', '--la': '#ff5a6a', '--lb': '#6aa8ff', '--pad': '#6a5fc8', '--padt': '#dcd8ff', '--edge': '#9a9ab0', '--lcd': '#cfd6c6' } };

  // =====================================================================
  //  High-res natural (4-line, cross pad) — #8 #26 #42 black, #18 white
  // =====================================================================
  function exModel(id, name, white) {
    const m = esModel(id, name, 'a', white ? TH_EX_WHITE : TH_EX_BLACK);
    m.cls = 'ex'; m.display = { kind: 'nat', cls: 'l4', w: 300, h: 124 };
    m.cfg = { natural: true, lines: 4, family: 'ex', digits: 10 };
    m.sections[0] = { cols: '1fr 1fr 1.6fr 1fr 1fr', cls: 'ktop', keys: [
      K('SHIFT', 'shift', { c: 'shift sm round' }), K('ALPHA', 'alpha', { c: 'alpha sm round' }),
      PAD('cross', { r: 2 }),
      K('MENU', 'mode', { c: 'sm round fnlite', s: ['SETUP', 'setup'] }), K('ON', 'on', { c: 'sm round fnlite' }),
      ...m.sections[0].keys.slice(5)] };
    m.sections[1].keys[13] = K('ENG', 'eng', { s: ['←', 'engl'], a: ['<i>i</i>', 'i'] });
    m.sections[1].keys[16] = K('S⇔D', 'sd', { s: ['≈', 'todec'], a: ['Y', 'var:Y'] });
    m.notes = 'High-resolution 4-line natural display. MENU opens the calculation-mode menu (Calculate, Complex, Base-N, Matrix, Vector, Statistics, Table, Equation). Spreadsheet, Inequality, Ratio and Distribution modes are not included.';
    m.cfg.modes = ['COMP', 'CMPLX', 'BASE', 'MATRIX', 'VECTOR', 'STAT', 'TABLE', 'EQN'];
    return m;
  }
  const TH_EX_BLACK = { body: 'linear-gradient(#2b2c2f,#18191b)', cls: 'th-ex dark', vars: { '--bezel': '#1f2022', '--key': '#2f3034', '--kt': '#fff', '--knum': '#5a5c62', '--knt': '#fff', '--kop': '#5a5c62', '--kopt': '#fff', '--kdel': '#86c440', '--kdelt': '#111', '--kshift': '#3b3c40', '--kshiftt': '#e7b33a', '--kalpha': '#3b3c40', '--kalphat': '#ff5f6e', '--ls': '#e7b33a', '--la': '#ff5f6e', '--lb': '#7ab8ff', '--pad': '#3b3c40', '--padt': '#ddd', '--lcd': '#cdd5c6' } };
  const TH_EX_WHITE = { body: 'linear-gradient(#fbfbfb,#e4e5e7)', cls: 'th-ex', vars: { '--bezel': '#ecedef', '--key': '#f6f6f7', '--kt': '#333', '--knum': '#d5d6da', '--knt': '#222', '--kop': '#d5d6da', '--kopt': '#222', '--kdel': '#8bc64a', '--kdelt': '#fff', '--kshift': '#f6f6f7', '--kshiftt': '#c88a10', '--kalpha': '#f6f6f7', '--kalphat': '#d12a3a', '--ls': '#c88a10', '--la': '#d12a3a', '--lb': '#2b62b8', '--pad': '#e3e4e7', '--padt': '#555', '--lcd': '#d6dccf' } };

  // =====================================================================
  //  Icon-key generation (#14)
  // =====================================================================
  function cwModel(id, name) {
    const n = 'num round';
    return {
      id, name, app: 'sci', w: 360, cls: 'cw', top: SOLAR,
      theme: { body: 'linear-gradient(#2a2b2e,#141516)', cls: 'th-cw dark', vars: { '--bezel': '#1d1e20', '--key': '#2c2d31', '--kt': '#fff', '--knum': '#3a3b40', '--knt': '#fff', '--kop': '#3a3b40', '--kopt': '#fff', '--kdel': '#3a3b40', '--kdelt': '#fff', '--kshift': '#d9a93a', '--kshiftt': '#222', '--ls': '#d9a93a', '--la': '#d9a93a', '--pad': '#3a3b40', '--padt': '#ddd', '--lcd': '#cdd5c6', '--kr': '50%' } },
      display: { kind: 'nat', cls: 'l4', w: 300, h: 124 },
      cfg: { natural: true, lines: 4, family: 'cw', digits: 10, modes: ['COMP', 'CMPLX', 'BASE', 'MATRIX', 'VECTOR', 'STAT', 'TABLE', 'EQN'], modeTitle: 'HOME' },
      sections: [
        { cols: '1fr 1fr 2.2fr 1fr', cls: 'ktop', keys: [
          K('⏻', 'on', { c: 'sm round fnlite', tip: 'ON' }), K('⌂', 'home', { c: 'sm round fnlite', tip: 'HOME' }), PAD('cross', { r: 2, center: ['OK', 'ok'] }),
          K('⌃<br>⌄', 'up', { c: 'sm fnlite tall', r: 2, tip: 'Page up/down' }),
          K('⚙', 'settings', { c: 'sm round fnlite', tip: 'SETTINGS' }), K('↩', 'back', { c: 'sm round fnlite', tip: 'Back' }) ] },
        { cols: 5, cls: 'krow', keys: [
          K('SHIFT', 'shift', { c: 'shift sm' }), K('<i>x</i>▭', 'variable', { c: 'fn sm', tip: 'VARIABLE', below: 'VARIABLE' }), K('<i>f</i>(<i>x</i>)', 'function', { c: 'fn sm', tip: 'FUNCTION', below: 'FUNCTION' }),
          K('☰', 'catalog', { c: 'fn sm', tip: 'CATALOG', below: 'CATALOG' }), K('⚒', 'tools', { c: 'fn sm', tip: 'TOOLS', below: 'TOOLS' }) ] },
        { cols: 6, kc: 'fn sm round', keys: [
          K('<i>x</i>', 'x', { s: ['⇄', 'sd'] }), K('▭/▭', 'frac', { s: ['▭⌟▭/▭', 'mixed'] }), K('√▭', 'sqrt', { s: ['∛▭', 'cbrt'] }),
          K('<i>x</i><sup>▭</sup>', 'pow', { s: ['▭⁻¹', 'inv'] }), K('<i>x</i>²', 'sq', { s: ['log', 'log'] }), K('log<sub>▭</sub>▭', 'logab', { s: ['ln', 'ln'] }),
          K('Ans', 'ans', { s: ['DRG▶', 'drg'] }), K('sin', 'sin', { s: ['sin⁻¹', 'asin'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'] }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'] }),
          K('(', 'lp', { s: ['=', 'eq'] }), K(')', 'rp', { s: [',', 'comma'] }) ] },
        { cols: 5, kc: n, keys: [
          K('7', 'd7', { s: ['π', 'pi'] }), K('8', 'd8', { s: ['<i>e</i>', 'e'] }), K('9', 'd9', { s: ['<i>i</i>', 'i'] }), K('⌫', 'del', { s: ['INS', 'ins'] }), K('AC', 'onac', { s: ['OFF', 'off'] }),
          K('4', 'd4', { s: ['A', 'var:A'] }), K('5', 'd5', { s: ['B', 'var:B'] }), K('6', 'd6', { s: ['C', 'var:C'] }), K('×', 'mul'), K('÷', 'div'),
          K('1', 'd1', { s: ['D', 'var:D'] }), K('2', 'd2', { s: ['E', 'var:E'] }), K('3', 'd3', { s: ['F', 'var:F'] }), K('+', 'add', { s: ['°′″', 'dms'] }), K('−', 'sub', { s: ['(−)', 'neg'] }),
          K('0', 'd0', { s: ['<i>x</i>', 'var:X'] }), K('•', 'dot', { s: ['<i>y</i>', 'var:Y'] }), K('×10<sup>▭</sup>', 'exp10', { s: ['<i>z</i>', 'var:M'] }), K('FORMAT', 'format', { c: 'num round xs' }), K('=', 'exe', { s: ['≈', 'todec'] }) ] },
      ],
      notes: 'Icon-key generation: HOME opens the calculation apps, ⚙ the settings, VARIABLE / FUNCTION / CATALOG / TOOLS menus, FORMAT converts the last result (decimal, fraction, ENG, sexagesimal). SHIFT + 4/5/6/1/2/3 enter variables A–F; SHIFT 0 / • enter x / y; SHIFT ×10 is mapped to the memory variable M.',
    };
  }

  // =====================================================================
  //  Multi-line textbook, 2ndF/MATH (#13)
  // =====================================================================
  function wvModel(id, name) {
    return {
      id, name, app: 'sci', w: 360, cls: 'wv',
      theme: { body: 'linear-gradient(#26272a,#121314)', cls: 'th-wv dark', vars: { '--bezel': '#1b1c1e', '--key': '#34353a', '--kt': '#fff', '--knum': '#101113', '--knt': '#fff', '--kop': '#101113', '--kopt': '#fff', '--kdel': '#34353a', '--kdelt': '#fff', '--kshift': '#e8761e', '--kshiftt': '#fff', '--kalpha': '#34353a', '--kalphat': '#fff', '--ls': '#f0a040', '--la': '#9bd060', '--lb': '#9bd060', '--pad': '#c9cbd0', '--padt': '#333', '--lcd': '#cdd5c6', '--kr': '6px' } },
      display: { kind: 'nat', cls: 'l4', w: 300, h: 124 },
      cfg: { natural: true, lines: 4, family: 'wv', digits: 10, modeTitle: 'MODE', mixedDefault: false },
      sections: [
        { cols: '1fr 1fr 2.4fr 1fr 1fr', cls: 'ktop', keys: [
          K('HOME', 'home', { c: 'sm fn' }), K('ON/C', 'onc', { c: 'sm fn', s: ['OFF', 'off'] }), PAD('cross', { r: 2 }), K('2ndF', 'shift', { c: 'shift sm' }), K('MODE', 'mode', { c: 'sm fn', s: ['CA', 'clr'] }),
          K('ALPHA', 'alpha', { c: 'sm fn', s: ['M-CLR', 'clearvar'] }), sp(1), sp(1), sp(1),
          K('MATH', 'mathmenu', { c: 'sm fn', s: ['SET UP', 'setup'] }), K('D1', 'calc', { c: 'sm fn', s: ['ALGB', 'calc'] }), K('D2', 'solve', { c: 'sm fn', s: ['SOLVER', 'numsolve'] }), K('D3', 'tablemode', { c: 'sm fn', s: ['TABLE', 'tablemode'] }), K('BS', 'del', { c: 'sm fn', s: ['DEL', 'del'] }) ] },
        { cols: 6, kc: 'fn sm', keys: [
          K('hyp', 'hyp', { s: ['arc hyp', 'hypflag'] }), K('sin', 'sin', { s: ['sin⁻¹', 'asin'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'] }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'] }),
          K('π', 'pi', { s: ['log<sub><i>a</i></sub><i>x</i>', 'logab'] }), K('D°M′S', 'dms', { s: ['↔DEG', 'todec'] }),
          K('<i>y</i><sup><i>x</i></sup>', 'pow', { s: ['<sup><i>x</i></sup>√', 'nroot'], a: ['A', 'var:A'] }), K('√', 'sqrt', { s: ['∛', 'cbrt'], a: ['B', 'var:B'] }), K('<i>x</i>²', 'sq', { s: ['<i>x</i>⁻¹', 'inv'], a: ['C', 'var:C'] }),
          K('log', 'log', { s: ['10<sup><i>x</i></sup>', 'pow10'], a: ['D', 'var:D'] }), K('ln', 'ln', { s: ['<i>e</i><sup><i>x</i></sup>', 'epow'], a: ['E', 'var:E'] }), K('(<i>x</i>,<i>y</i>)', 'comma', { s: ['∠', 'angle'], a: ['F', 'var:F'] }),
          K('Exp', 'exp10', { s: ['<i>e</i>', 'e'] }), K('<sup>a</sup>/<sub>b</sub>', 'frac', { s: ['a<sup>b</sup>/<sub>c</sub>', 'mixed'] }), K('RCL', 'rcl', { s: ['<i>x</i>³', 'cube'], a: ['X', 'var:X'] }),
          K('STO', 'sto', { s: ['int÷', 'mod'], a: ['Y', 'var:Y'] }), K('M+', 'mplus', { s: ['M−', 'mminus'], a: ['M', 'var:M'] }), K('CHANGE', 'sd', { s: ['DATA', 'statdata'] }) ] },
        { cols: 5, keys: [
          K('7', 'd7', { c: 'num', s: ['RANDOM', 'ran'] }), K('8', 'd8', { c: 'num', s: ['→<i>r</i>θ', 'pol'], a: ['STAT', 'statmenu'] }), K('9', 'd9', { c: 'num', s: ['→<i>xy</i>', 'rec'] }),
          K('(', 'lp', { c: 'op', s: ['∫d<i>x</i>', 'integ'] }), K(')', 'rp', { c: 'op', s: ['d/d<i>x</i>', 'deriv'] }),
          K('4', 'd4', { c: 'num', s: ['<i>n</i>!', 'fact'], a: ['CONST', 'const'] }), K('5', 'd5', { c: 'num', s: ['<i>n</i>C<i>r</i>', 'ncr'], a: ['CONV', 'conv'] }), K('6', 'd6', { c: 'num', s: ['<i>n</i>P<i>r</i>', 'npr'] }),
          K('×', 'mul', { c: 'op', s: ['Σ', 'sigma'], a: ['→HEX', 'basemenu'] }), K('÷', 'div', { c: 'op', s: ['Π', 'prod'], a: ['→BIN', 'basemenu'] }),
          K('1', 'd1', { c: 'num', s: ['%', 'pct'], a: ['◀ENG', 'engl'] }), K('2', 'd2', { c: 'num', s: ['GCD', 'gcd'], a: ['ENG▶', 'eng'] }), K('3', 'd3', { c: 'num', s: ['LCM', 'lcm'] }),
          K('+', 'add', { c: 'op', s: ['→PEN', 'basemenu'] }), K('−', 'sub', { c: 'op', s: ['→OCT', 'basemenu'] }),
          K('0', 'd0', { c: 'num', s: ['MDF', 'sd'] }), K('•', 'dot', { c: 'num', s: ['DRG▶', 'drgcycle'] }), K('(−)', 'neg', { c: 'num', s: ['abs', 'abs'] }), K('=', 'exe', { c: 'num', w: 2, s: ['→DEC', 'todec'], a: ['ANS', 'ans'] }) ] },
      ],
      notes: 'D1 = algebraic evaluation (CALC), D2 = SOLVE, D3 = TABLE (the photo leaves D1–D3 unprinted, so they are mapped to these). MATH opens the math-function menu; →HEX/→BIN/→PEN/→OCT open the base-N menu. The pentadecimal (→PEN) base is not supported.',
    };
  }

  // =====================================================================
  //  White solar natural with Abs/CONVT (#29)
  // =====================================================================
  function w29Model(id, name) {
    const n = 'num';
    return {
      id, name, app: 'sci', w: 360, cls: 'es w29', top: SOLAR,
      theme: { body: 'linear-gradient(#fafafa,#e2e3e6)', cls: 'th-es', vars: { '--bezel': '#e6e7ea', '--key': '#5a5f6a', '--kt': '#fff', '--knum': '#f5f5f6', '--knt': '#222', '--kop': '#f5f5f6', '--kopt': '#222', '--kdel': '#f5f5f6', '--kdelt': '#d0302a', '--kshift': '#d9a93a', '--kshiftt': '#222', '--kalpha': '#c0313d', '--kalphat': '#fff', '--ls': '#b07d10', '--la': '#c0313d', '--lb': '#2b62b8', '--pad': '#6b7080', '--padt': '#fff', '--lcd': '#d0d8c7' } },
      display: { kind: 'nat', w: 296, h: 96 },
      cfg: { natural: true, lines: 2, family: 'es', digits: 10 },
      sections: [
        { cols: '1fr 1fr 1.6fr 1fr 1fr', cls: 'ktop', keys: [
          K('Shift', 'shift', { c: 'shift sm round' }), K('Alpha', 'alpha', { c: 'alpha sm round' }), PAD('cross', { r: 3 }), K('MODE', 'mode', { c: 'sm round fn', s: ['SET-UP', 'setup'] }), K('ON', 'on', { c: 'sm round fn' }),
          K('Abs', 'abs', { c: 'sm fn' }), K('CONVT', 'conv', { c: 'sm fn', s: ['C-VALUE', 'const'] }), K('▭/▭', 'frac', { c: 'sm fn', s: ['▭⌟▭/▭', 'mixed'] }), K('ENG', 'eng', { c: 'sm fn', s: ['◀ENG', 'engl'], a: ['<i>i</i>', 'i'] }),
          K('CALC', 'calc', { c: 'sm fn', s: ['Solve', 'solve'], a: ['=', 'eq'] }), K('<i>x</i>⁻¹', 'inv', { c: 'sm fn', s: ['<i>x</i>!', 'fact'], a: [':', 'colon'] }), K('∫▭', 'integ', { c: 'sm fn', s: ['d/d<i>x</i>', 'deriv'] }), K('log<sub>▭</sub>▭', 'logab', { c: 'sm fn', s: ['Σ', 'sigma'] }) ] },
        { cols: 6, kc: 'fn sm', keys: [
          K('√▭', 'sqrt', { s: ['∛', 'cbrt'], b: ['DEC', 'base:10'] }), K('<i>x</i><sup>▭</sup>', 'pow', { s: ['<sup>▭</sup>√', 'nroot'], b: ['HEX', 'base:16'] }), K('<i>x</i>²', 'sq', { s: ['<i>x</i>³', 'cube'], b: ['BIN', 'base:2'] }),
          K('<i>x</i>³', 'cube', { s: ['∛', 'cbrt'], b: ['OCT', 'base:8'] }), K('log', 'log', { s: ['10<sup>▭</sup>', 'pow10'] }), K('ln', 'ln', { s: ['<i>e</i><sup>▭</sup>', 'epow'] }),
          K('(−)', 'neg', { s: ['∠', 'angle'], a: ['A', 'var:A'] }), K('°′″', 'dms', { s: ['←', 'dms'], a: ['B', 'var:B'] }), K('hyp', 'hyp', { a: ['C', 'var:C'] }),
          K('sin', 'sin', { s: ['sin⁻¹', 'asin'], a: ['D', 'var:D'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'], a: ['E', 'var:E'] }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'], a: ['F', 'var:F'] }),
          K('RCL', 'rcl', { s: ['STO', 'sto'] }), K('Abs', 'abs', { s: ['|▭|', 'abs'] }), K('(', 'lp', { s: ['%', 'pct'] }), K(')', 'rp', { s: [',', 'comma'], a: ['X', 'var:X'] }),
          K('F↔D', 'sd', { s: ['a<sup>b</sup>/<sub>c</sub>↔<sup>d</sup>/<sub>c</sub>', 'mixedtoggle'], a: ['Y', 'var:Y'] }), K('M+', 'mplus', { s: ['M−', 'mminus'], a: ['M', 'var:M'] }) ] },
        { cols: 5, keys: [
          K('7', 'd7', { c: n, s: ['CONST', 'const'] }), K('8', 'd8', { c: n, s: ['CONV', 'conv'] }), K('9', 'd9', { c: n, s: ['CLR', 'clr'] }), K('DEL', 'del', { c: 'del', s: ['Insert', 'ins'] }), K('CA', 'onac', { c: 'del', s: ['OFF', 'off'] }),
          K('4', 'd4', { c: n, s: ['MATRIX', 'matmenu'] }), K('5', 'd5', { c: n, s: ['VECTOR', 'vctmenu'] }), K('6', 'd6', { c: n }), K('×', 'mul', { c: 'op', s: ['<i>n</i>P<i>r</i>', 'npr'] }), K('÷', 'div', { c: 'op', s: ['<i>n</i>C<i>r</i>', 'ncr'] }),
          K('1', 'd1', { c: n, s: ['STAT', 'statmenu'] }), K('2', 'd2', { c: n, s: ['CMPLX', 'cmplxmenu'] }), K('3', 'd3', { c: n, s: ['BASE', 'basemenu'] }), K('+', 'add', { c: 'op', s: ['Pol', 'pol'] }), K('−', 'sub', { c: 'op', s: ['Rect', 'rec'] }),
          K('0', 'd0', { c: n, s: ['ROUND', 'rnd'] }), K('•', 'dot', { c: n, s: ['Rand', 'ran'], a: ['i-Rand', 'ranint'] }), K('EXP', 'exp10', { c: n, s: ['π', 'pi'], a: ['<i>e</i>', 'e'] }), K('Ans', 'ans', { c: n, s: ['DRG', 'drg'] }), K('=', 'exe', { c: n }) ] },
      ],
      notes: 'White solar natural-display model. Some printed labels in the photo were unreadable and were replaced by the standard function for that key position (x³/OCT key, Abs duplicate shows |▭|).',
    };
  }
  G.__M1 = { esModel, exModel, cwModel, wvModel, w29Model, TH_ES_SILVER, TH_ES_NAVY, K, sp, PAD, SOLAR };
})(window);
(function (G) {
  'use strict';
  const { K, sp, PAD, SOLAR } = G.__M1;
  // =====================================================================
  //  Multi-view 4-line (#31) and advanced multi-view with multi-tap keys (#35)
  // =====================================================================
  function mvModel(id, name) {
    return {
      id, name, app: 'sci', w: 350, cls: 'mv', top: SOLAR,
      theme: { body: 'linear-gradient(#8ea3bd,#6f87a5)', cls: 'th-mv', vars: { '--bezel': '#f2f4f6', '--key': '#2c3e66', '--kt': '#fff', '--knum': '#f4f5f7', '--knt': '#1d2a44', '--kop': '#2c3e66', '--kopt': '#fff', '--kdel': '#2c3e66', '--kdelt': '#fff', '--kshift': '#58b34a', '--kshiftt': '#fff', '--ls': '#3d9a33', '--la': '#3d9a33', '--pad': '#2c3e66', '--padt': '#fff', '--lcd': '#cfd7c9', '--kr': '40%' } },
      display: { kind: 'nat', cls: 'l4 mvd', w: 290, h: 120 },
      cfg: { natural: true, lines: 4, family: 'mv', digits: 10, eStyle: 'E', cycleVars: ['x', 'y', 'z', 't', 'a', 'b', 'c'], lowerVars: true, modeTitle: 'MODE', mixedDefault: false, indicatorSet: ['2nd', 'HYP', 'DEG', 'RAD', 'GRAD', 'FIX', 'SCI', 'ENG', 'STAT', 'HEX', 'OCT', 'BIN', 'DEC', '( )', 'K'] },
      sections: [
        { cols: '1fr 1fr 1fr 1.7fr', cls: 'ktop', keys: [
          K('2nd', 'shift', { c: 'shift sm round' }), K('mode', 'mode', { c: 'fn sm round', s: ['quit', 'quit'] }), K('delete', 'del', { c: 'fn sm round xs', s: ['insert', 'ins'] }), PAD('ring', { r: 2 }),
          K('log', 'log', { c: 'fn sm round', s: ['10<sup>▭</sup>', 'pow10'] }), K('prb', 'prb', { c: 'fn sm round', s: ['angle', 'drg'] }), K('data', 'statdata', { c: 'fn sm round', s: ['stat', 'statmenu'] }) ] },
        { cols: 5, kc: 'fn sm round', keys: [
          K('ln', 'ln', { s: ['<i>e</i><sup>▭</sup>', 'epow'] }), K('<sup>n</sup>/<sub>d</sub>', 'frac', { s: ['U<sup>n</sup>/<sub>d</sub>', 'mixed'] }), K('×10<sup>n</sup>', 'exp10', { s: ['<sup>n</sup>/<sub>d</sub>◀▶U<sup>n</sup>/<sub>d</sub>', 'mixedtoggle'] }),
          K('table', 'tablemode', { s: ['f◀▶d', 'sd'] }), K('clear', 'clear'),
          K('π', 'pi', { s: ['hyp', 'hypflag'] }), K('sin', 'sin', { s: ['sin⁻¹', 'asin'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'] }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'] }), K('÷', 'div', { s: ['K', 'msg:Constant mode (K)<br>is not available'] }),
          K('^', 'pow', { s: ['<sup>x</sup>√', 'nroot'] }), K('<i>x</i>⁻¹', 'inv', { s: ['%', 'pct'] }), K('(', 'lp', { s: ['%', 'pct'] }), K(')', 'rp', { s: ['▶%', 'pct'] }), K('×', 'mul'),
          K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }), K('7', 'd7', { c: 'num round' }), K('8', 'd8', { c: 'num round' }), K('9', 'd9', { c: 'num round' }), K('−', 'sub'),
          K('<i>x</i><sub>yzt</sub><sup>abc</sup>', 'varcycle', { s: ['clear var', 'clearvar'] }), K('4', 'd4', { c: 'num round' }), K('5', 'd5', { c: 'num round' }), K('6', 'd6', { c: 'num round' }), K('+', 'add'),
          K('sto▸', 'stoarrow', { s: ['recall', 'recall'] }), K('1', 'd1', { c: 'num round' }), K('2', 'd2', { c: 'num round' }), K('3', 'd3', { c: 'num round' }), K('◀▶', 'sd', { s: ['≈', 'todec'] }),
          K('on', 'on', { s: ['off', 'off'] }), K('0', 'd0', { c: 'num round', s: ['reset', 'reset'] }), K('.', 'dot', { c: 'num round', s: [',', 'comma'] }), K('(−)', 'neg', { c: 'num round', s: ['ans', 'answer'] }), K('enter', 'exe', { c: 'exe sm' }) ] },
      ],
      notes: 'Four-line multi-view textbook display. x/yzt/abc cycles through variables on each press; sto▸ stores the result into the next variable. table builds a function table, data/stat open the list editor and 1-/2-variable statistics. The constant (K) feature is not available.',
    };
  }
  function proModel(id, name) {
    const nk = { c: 'num' };
    return {
      id, name, app: 'sci', w: 350, cls: 'mv pro', top: SOLAR,
      theme: { body: 'linear-gradient(#2a2b2e,#141516)', cls: 'th-pro dark', vars: { '--bezel': '#1b1c1e', '--key': '#2d2f33', '--kt': '#fff', '--knum': '#9b9ea4', '--knt': '#111', '--kop': '#f08a24', '--kopt': '#111', '--kdel': '#2d2f33', '--kdelt': '#fff', '--kshift': '#7fc4ec', '--kshiftt': '#111', '--ls': '#7fc4ec', '--la': '#7fc4ec', '--lb': '#bbb', '--pad': '#3a3c40', '--padt': '#ddd', '--lcd': '#cfd7c9', '--kr': '8px' } },
      display: { kind: 'nat', cls: 'l4 mvd', w: 290, h: 120 },
      cfg: { natural: true, lines: 4, family: 'mv', digits: 10, eStyle: 'E', cycleVars: ['x', 'y', 'z', 't', 'a', 'b', 'c', 'd'], lowerVars: true, modeTitle: 'MODE', mixedDefault: false, indicatorSet: ['2nd', 'HYP', 'DEG', 'RAD', 'GRAD', 'FIX', 'SCI', 'ENG', 'STAT', 'HEX', 'OCT', 'BIN', 'DEC', '( )', 'K'] },
      sections: [
        { cols: '1fr 1fr 1fr 1.7fr', cls: 'ktop', keys: [
          K('2nd', 'shift', { c: 'shift sm' }), K('mode', 'mode', { c: 'fn sm', s: ['quit', 'quit'] }), K('delete', 'del', { c: 'fn sm xs', s: ['insert', 'ins'] }), PAD('ring', { r: 2 }),
          K('ln <small>log</small>', 'ln', { c: 'fn sm', cyc: ['ln', 'log'], s: ['d/d▭', 'deriv'], tip: 'ln / log (press again)' }), K('math', 'mathmenu', { c: 'fn sm', s: ['matrix', 'matmenu'] }), K('data', 'statdata', { c: 'fn sm', s: ['stat-reg/distr', 'statmenu'] }) ] },
        { cols: 5, kc: 'fn sm', keys: [
          K('<i>e</i><sup>▭</sup> <small>10<sup>▭</sup></small>', 'epow', { cyc: ['epow', 'pow10'], s: ['∫▭d▭', 'integ'] }), K('EE', 'exp10', { s: ['vector', 'vctmenu'] }),
          K('! <small><i>n</i>C<i>r</i> <i>n</i>P<i>r</i></small>', 'fact', { cyc: ['fact', 'ncr', 'npr'], s: ['random', 'prb'] }), K('table', 'tablemode', { s: ['expr-eval', 'calc'] }), K('clear', 'clear'),
          K('π <small><i>e</i> <i>i</i></small>', 'pi', { cyc: ['pi', 'e', 'i'], s: ['complex', 'cmplxmenu'] }), K('sin <small>sin⁻¹</small>', 'sin', { cyc: ['sin', 'asin'], s: ['num-solv', 'numsolve'] }),
          K('cos <small>cos⁻¹</small>', 'cos', { cyc: ['cos', 'acos'], s: ['poly-solv', 'polymenu'] }), K('tan <small>tan⁻¹</small>', 'tan', { cyc: ['tan', 'atan'], s: ['sys-solv', 'sysmenu'] }), K('÷', 'div', { c: 'op sm', s: ['%', 'pct'] }),
          K('<i>x</i><sup>▭</sup>', 'pow', { s: ['<sup>x</sup>√', 'nroot'] }), K('<sup>n</sup>/<sub>d</sub>', 'frac', { s: ['U<sup>n</sup>/<sub>d</sub>', 'mixed'] }), K('(', 'lp', { s: ['constants', 'const'] }), K(')', 'rp', { s: ['base n', 'basemenu'] }), K('×', 'mul', { c: 'op sm', s: ['convert', 'conv'] }),
          K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }), K('7', 'd7', nk), K('8', 'd8', nk), K('9', 'd9', nk), K('−', 'sub', { c: 'op sm', s: ['◀▶ deg', 'drgcycle'] }),
          K('<i>x</i><sub>yzt</sub><sup>abcd</sup>', 'varcycle', { s: ['clear var', 'clearvar'] }), K('4', 'd4', { c: 'num', b: ['D', 'hex:D'] }), K('5', 'd5', { c: 'num', b: ['E', 'hex:E'] }), K('6', 'd6', { c: 'num', b: ['F', 'hex:F'] }), K('+', 'add', { c: 'op sm' }),
          K('sto▸', 'stoarrow', { s: ['recall', 'recall'] }), K('1', 'd1', { c: 'num', b: ['A', 'hex:A'] }), K('2', 'd2', { c: 'num', b: ['B', 'hex:B'] }), K('3', 'd3', { c: 'num', b: ['C', 'hex:C'] }), K('◀▶<br><small>≈</small>', 'sd', { c: 'op sm', s: ['f◀▶d', 'todec'] }),
          K('on', 'on', { s: ['off', 'off'] }), K('0', 'd0', { c: 'num', s: ['reset', 'reset'] }), K('.', 'dot', { c: 'num', s: [',', 'comma'] }), K('(−)', 'neg', { c: 'num', s: ['answer', 'answer'] }), K('enter', 'exe', { c: 'exe sm' }) ] },
      ],
      notes: 'Multi-tap keys: pressing ln/log, eⁿ/10ⁿ, !/nCr/nPr, π/e/i and sin/cos/tan repeatedly cycles through the functions printed on the key. 2nd gives num-solv, poly-solv, sys-solv, matrix, vector, complex, base n, constants, convert, stat-reg/distr. Hex digits A–F are on 1–6 in base-n mode.',
    };
  }

  // =====================================================================
  //  White/violet natural with numeric-key functions (#34)
  // =====================================================================
  function m34Model(id, name) {
    const nf = (f, act, lab, lact) => K(f, act, { c: 'num', s: ['', lact], u: [lab] });
    return {
      id, name, app: 'sci', w: 360, cls: 'es m34',
      theme: { body: 'linear-gradient(#ffffff,#e9e9ef)', cls: 'th-es', vars: { '--bezel': '#e7e7ee', '--key': '#ececf2', '--kt': '#2c2c3a', '--knum': '#f9f9fb', '--knt': '#2c2c3a', '--kop': '#f9f9fb', '--kopt': '#2c2c3a', '--kdel': '#f09a3c', '--kdelt': '#fff', '--kshift': '#ececf2', '--kshiftt': '#b07b10', '--kalpha': '#ececf2', '--kalphat': '#c0313d', '--kexe': '#6d5fc0', '--kexet': '#fff', '--ls': '#b07b10', '--la': '#c0313d', '--lb': '#6d5fc0', '--pad': '#7c70c8', '--padt': '#fff', '--lcd': '#cfd6c6', '--edge': '#6d5fc0' } },
      display: { kind: 'nat', w: 296, h: 96 },
      cfg: { natural: true, lines: 2, family: 'es', digits: 10 },
      sections: [
        { cols: '1fr 1fr 1.6fr 1fr 1fr', cls: 'ktop', keys: [
          K('SHIFT', 'shift', { c: 'shift sm', s: ['←', 'left'] }), K('ALPHA', 'alpha', { c: 'alpha sm' }), PAD('replay', { r: 2, label: 'REPLAY' }), K('MENU', 'mode', { c: 'fn sm' }), K('SETUP', 'setup', { c: 'fn sm' }),
          K('OPTN', 'optn', { c: 'fn sm' }), K('CALC', 'calc', { c: 'fn sm', s: ['SOLVE', 'solve'] }), K('DEL', 'del', { c: 'del sm', s: ['INS', 'ins'] }), K('AC/ON', 'onac', { c: 'del sm', s: ['OFF', 'off'] }) ] },
        { cols: 6, kc: 'fn sm', keys: [
          K('STO', 'sto'), K('S⇄D', 'sd'), K('√▭', 'sqrt', { s: ['∛', 'cbrt'] }), K('∫▭', 'integ', { s: ['d/d<i>x</i>', 'deriv'] }), K('▭/▭', 'frac', { s: ['▭⌟▭/▭', 'mixed'] }), K('<i>x</i>²', 'sq', { s: ['<i>x</i>³', 'cube'] }),
          K('RCL', 'rcl'), K('ENG', 'eng', { s: ['←', 'engl'] }), K('(', 'lp', { s: ['%', 'pct'] }), K(')', 'rp', { s: [',', 'comma'] }), K('<i>x</i>⁻¹', 'inv', { s: ['<i>x</i>!', 'fact'] }), K('(−)', 'neg', { s: ['Ans', 'ans'] }) ] },
        { cols: 5, keys: [
          nf('7', 'd7', 'sin', 'sin'), nf('8', 'd8', 'cos', 'cos'), nf('9', 'd9', 'tan', 'tan'), K('<i>x</i><sup>▭</sup>', 'pow', { c: 'fn', s: ['', 'hyp'], u: ['hyp'] }), K('÷', 'div', { c: 'num' }),
          nf('4', 'd4', 'ln', 'ln'), nf('5', 'd5', 'log', 'log'), nf('6', 'd6', 'log<sub>▭</sub>▭', 'logab'), K('sin⁻¹', 'asin', { c: 'fn', s: ['', 'acos'], u: ['cos⁻¹'] }), K('×', 'mul', { c: 'num' }),
          nf('1', 'd1', '<i>e</i><sup>▭</sup>', 'epow'), nf('2', 'd2', '10<sup>▭</sup>', 'pow10'), nf('3', 'd3', '°′″', 'dms'), K('tan⁻¹', 'atan', { c: 'fn', s: ['', 'nroot'], u: ['ˣ√'] }), K('−', 'sub', { c: 'num' }),
          nf('0', 'd0', '×10<sup>▭</sup>', 'exp10'), nf('•', 'dot', 'Ran#', 'ran'), K('π', 'pi', { c: 'num', s: ['', 'e'], u: ['<i>e</i>'] }), K('+', 'add', { c: 'num' }), K('=', 'exe', { c: 'exe' }) ] },
      ],
      notes: 'Functions printed under the digit keys (sin, cos, tan, ln, log, eˣ, 10ˣ …) are reached with SHIFT + that key. Several labels in the photo were garbled/duplicated and were replaced with the closest standard function (e.g. the duplicate STO is RCL, the duplicate √ is x²).',
    };
  }

  // =====================================================================
  //  Compact pocket scientific (#3 and #41)
  // =====================================================================
  function compact3(id, name) {
    const nf = (f, act, lab, lact, o) => K(f, act, Object.assign({ c: 'num', s: [lab, lact] }, o || {}));
    return {
      id, name, app: 'sci', w: 300, cls: 'compact c3',
      theme: { body: 'linear-gradient(#2a2b2e,#141516)', cls: 'th-cp dark', vars: { '--bezel': '#1d1e21', '--key': '#3a3b40', '--kt': '#fff', '--knum': '#222326', '--knt': '#fff', '--kop': '#222326', '--kopt': '#fff', '--kdel': '#2f68c8', '--kdelt': '#fff', '--kshift': '#e8b23a', '--kshiftt': '#111', '--kalpha': '#2f68c8', '--kalphat': '#fff', '--ls': '#e8e8e8', '--la': '#ff5f6e', '--pad': '#3a3b40', '--padt': '#ddd', '--lcd': '#cdd5c6', '--kr': '5px' } },
      display: { kind: 'dot', cls: 'compactd', w: 250, h: 74 },
      cfg: { natural: false, lines: 2, family: 'es', digits: 10, eStyle: 'E', implicitHigh: true },
      sections: [
        { cols: 5, keys: [
          K('SHIFT', 'shift', { c: 'shift sm' }), K('ALPHA', 'alpha', { c: 'alpha sm' }), K('◀', 'left', { c: 'fn sm', a: ['MENU', 'mode'], s: ['▶', 'right'] }), K('SETUP', 'setup', { c: 'fn sm', a: [')', 'rp'] }), K('OPTN', 'optn', { c: 'fn sm', s: ['✱', 'mul'] }),
          nf('7', 'd7', 'sin', 'sin'), nf('8', 'd8', 'cos', 'cos'), nf('9', 'd9', 'tan', 'tan'), K('×10<sup><i>x</i></sup>', 'exp10', { c: 'fn', s: ['π', 'pi'] }), K('log', 'log', { c: 'fn', s: ['10<sup><i>x</i></sup>', 'pow10'] }),
          nf('4', 'd4', 'hyp', 'hyp'), nf('5', 'd5', 'sin⁻¹', 'asin'), nf('6', 'd6', 'cos⁻¹', 'acos'), K('(', 'lp', { c: 'fn', s: ['ln', 'ln'] }), K('DEL', 'del', { c: 'del', s: ['INS', 'ins'] }),
          nf('1', 'd1', 'R↔P', 'pol'), nf('2', 'd2', 'Pol(', 'pol'), nf('3', 'd3', 'Rec(', 'rec'), K('×', 'mul', { c: 'op', s: ['<i>n</i>C<i>r</i>', 'ncr'] }), K('AC/ON', 'onac', { c: 'del', s: ['OFF', 'off'] }),
          nf('0', 'd0', '÷', 'div'), nf('•', 'dot', 'tan⁻¹', 'atan'), K('<i>x</i>²', 'sq', { c: 'fn', s: ['√', 'sqrt'] }), K('+', 'add', { c: 'op', s: ['Ans', 'ans'] }), K('−', 'sub', { c: 'op', s: ['=', 'exe'] }) ] },
      ],
      notes: 'This compact model has no dedicated ÷, ) or = keys in the photo, so: SHIFT 0 = ÷, ALPHA SETUP = ), SHIFT − = "=" (EXE), SHIFT + = Ans, SHIFT x² = √. The physical keyboard Enter, /, ) keys also work. Several duplicated labels were rationalised.',
    };
  }
  function compact41(id, name) {
    const uf = (f, act, lab, lact, o) => K(f, act, Object.assign({ c: 'num', s: ['', lact], u: [lab] }, o || {}));
    return {
      id, name, app: 'sci', w: 300, cls: 'compact c41',
      theme: { body: 'linear-gradient(#232427,#0f1011)', cls: 'th-cp dark', vars: { '--bezel': '#18191b', '--key': '#2f3034', '--kt': '#fff', '--knum': '#2a2b2f', '--knt': '#fff', '--kop': '#2a2b2f', '--kopt': '#fff', '--kdel': '#86c440', '--kdelt': '#111', '--kshift': '#3a3b40', '--kshiftt': '#e8b23a', '--kalpha': '#3a3b40', '--kalphat': '#ff5f6e', '--ls': '#e8b23a', '--lb': '#9ccc6a', '--pad': '#3a3b40', '--padt': '#ddd', '--lcd': '#cdd5c6', '--kr': '5px' } },
      display: { kind: 'dot', cls: 'compactd', w: 250, h: 74 },
      cfg: { natural: false, lines: 2, family: 'es', digits: 10, eStyle: 'E' },
      sections: [
        { cols: 4, keys: [
          K('SHIFT', 'shift', { c: 'shift sm' }), K('ALPHA', 'alpha', { c: 'alpha sm' }), K('DEL▶', 'del', { c: 'del sm', s: ['INS', 'ins'] }), K('AC/ON', 'onac', { c: 'del sm', s: ['OFF', 'off'] }),
          uf('7', 'd7', 'hyp', 'hyp'), uf('8', 'd8', 'sin', 'sin'), uf('9', 'd9', 'cos', 'cos'), uf('÷', 'div', '°′″', 'dms'),
          uf('4', 'd4', 'π', 'pi'), uf('5', 'd5', 'tan', 'tan'), uf('6', 'd6', 'log', 'log'), uf('×', 'mul', '×10<sup><i>x</i></sup>', 'exp10'),
          uf('1', 'd1', '<i>x</i>²', 'sq'), uf('2', 'd2', '<i>x</i>⁻¹', 'inv'), uf('3', 'd3', 'ln', 'ln'), uf('−', 'sub', '<i>e</i><sup><i>x</i></sup>', 'epow'),
          uf('0', 'd0', '<i>x</i>³', 'cube'), uf('•', 'dot', 'Ran#', 'ran'), uf('√', 'sqrt', '∛', 'cbrt'), K('+', 'add', { c: 'num tall', r: 2 }),
          uf('<i>x</i><sup>▭</sup>', 'pow', 'ˣ√', 'nroot'), uf('(', 'lp', '%', 'pct'), uf(')', 'rp', ',', 'comma'),
          uf('×10<sup><i>x</i></sup>', 'exp10', 'Ans', 'ans'), PAD('cross', { w: 2 }), uf('S⇔D', 'sd', 'M+', 'mplus') ] },
      ],
      notes: 'Pocket model: functions printed under each key are reached with SHIFT. The photo shows no "=" key, so S⇔D works as "=" (and toggles fraction/decimal once a result is shown); Enter on the keyboard also evaluates. Some garbled key faces (0³, √³, ( ),1) were mapped to xʸ, ( and ).',
    };
  }
  G.__M2 = { mvModel, proModel, m34Model, compact3, compact41 };
})(window);
(function (G) {
  'use strict';
  const { K, sp, PAD, SOLAR } = G.__M1;
  // =====================================================================
  //  One-line 2nd/3rd scientific (#12)
  // =====================================================================
  function ti36Model(id, name) {
    const N = 'num oval', F = 'fn oval';
    return {
      id, name, app: 'aos', w: 340, cls: 'oneline t36', top: SOLAR,
      theme: { body: 'linear-gradient(#d9dadd,#b4b6ba)', cls: 'th-36', vars: { '--bezel': '#3a3c40', '--key': '#8c8f95', '--kt': '#fff', '--knum': '#1e1f22', '--knt': '#fff', '--kop': '#8c8f95', '--kopt': '#fff', '--kdel': '#1e1f22', '--kdelt': '#fff', '--kshift': '#3f7fd0', '--kshiftt': '#fff', '--kalpha': '#4aa24a', '--kalphat': '#fff', '--ls': '#2a64b8', '--la': '#2f8f2f', '--lab': '#2f8f2f', '--kr': '45%' } },
      display: { kind: 'seg', cls: 'oneline', w: 270, h: 70 },
      cfg: { digits: 10, expDigits: 2, pct: 'ti', chain: false, maxPar: 15, errText: 'Error', shiftName: '2nd', indicatorSet: ['2nd', '3rd', 'HYP', 'DEG', 'RAD', 'GRAD', 'FIX', 'SCI', 'ENG', 'STAT', 'K', 'HEX', 'OCT', 'BIN', '( )'] },
      sections: [
        { cols: 5, keys: [
          K('3rd', '3rd', { c: 'alpha oval sm' }), K('LOG', 'log', { c: F, s: ['10<sup><i>x</i></sup>', 'pow10'], t: ['DRG▶', 'drgconv'] }), K('LN', 'ln', { c: F, s: ['<i>e</i><sup><i>x</i></sup>', 'epow'], t: ['<i>x</i>!', 'fact'] }),
          K('DRG', 'drg', { c: F, s: ['<sup><i>x</i></sup>√<i>y</i>', 'root'], t: ['HYP', 'hyp'] }), K('ON/AC', 'onac', { c: N }),
          K('2nd', 'shift', { c: 'shift oval sm' }), K('SIN', 'sin', { c: F, s: ['SIN⁻¹', 'asin'], t: ['CONST', 'const'] }), K('COS', 'cos', { c: F, s: ['COS⁻¹', 'acos'], t: ['FIX', 'fix'] }), K('TAN', 'tan', { c: F, s: ['TAN⁻¹', 'atan'], t: ['π', 'pi'] }), K('CE/C', 'cec', { c: N }),
          K('Σ+', 'sigplus', { c: F, s: ['Σ−', 'sigminus'], t: ['STAT1', 'statmode1'] }), K('1/<i>x</i>', 'inv', { c: F, s: ['FRC', 'frac'], t: ['STAT2', 'statmode2'] }), K('<i>x</i>²', 'sq', { c: F, s: ['∛', 'cbrt'], t: ['<i>x</i>³', 'cube'] }), K('√<i>x</i>', 'sqrt', { c: F, s: ['INT', 'int'], t: ['ABS', 'abs'] }), K('<i>y</i><sup><i>x</i></sup>', 'pow', { c: F, s: ['%', 'pct'], t: ['RND', 'rnd'] }),
          K('π', 'pi', { c: F, s: ['x̄', 'smean'], t: ['ȳ', 'symean'] }), K('EE', 'exp', { c: F, s: ['DEC', 'base:10'], t: ['ENG', 'engmode'] }), K('(', 'lp', { c: F, s: ['HEX', 'base:16'], t: ['SCI', 'scimode'] }), K(')', 'rp', { c: F, s: ['OCT', 'base:8'], t: ['FLO', 'flomode'] }), K('÷', 'div', { c: F, s: ['BIN', 'base:2'] }),
          K('K', 'k', { c: F, s: ['AND', 'and'], t: ['A', 'hex:A'] }), K('7', 'd7', { c: N, s: ['OR', 'or'], t: ['B', 'hex:B'] }), K('8', 'd8', { c: N, s: ['XOR', 'xor'], t: ['C', 'hex:C'] }), K('9', 'd9', { c: N, s: ['XNOR', 'xnor'], t: ['D', 'hex:D'] }), K('×', 'mul', { c: F, s: ['NOT', 'not'] }),
          K('RCL', 'rcl', { c: F, s: ['EXC', 'exc'], t: ['E', 'hex:E'] }), K('4', 'd4', { c: N, s: ['<i>n</i>P<i>r</i>', 'npr'], t: ['F', 'hex:F'] }), K('5', 'd5', { c: N, s: ['S<sub>x</sub>', 'ssx'], t: ['σ<sub>x</sub>', 'ssig'] }), K('6', 'd6', { c: N, s: ['Σ<i>x</i>', 'ssumx'], t: ['Σ<i>x</i>²', 'ssumx2'] }), K('−', 'sub', { c: F, s: ['<i>n</i>', 'sn'] }),
          K('STO', 'sto', { c: F, s: ['F↔D', 'fd'], t: ['a', 'sa'] }), K('1', 'd1', { c: N, s: ['►cm', 'conv:2.54'], t: ['►in', 'conv:0.3937007874'] }), K('2', 'd2', { c: N, s: ['►L', 'conv:3.785411784'], t: ['►gal', 'conv:0.2641720524'] }), K('3', 'd3', { c: N, s: ['►kg', 'conv:0.45359237'], t: ['►lb', 'conv:2.2046226218'] }), K('+', 'add', { c: F, s: ['b', 'sb'], t: ['r', 'sr'] }),
          K('<i>x</i>⇄<i>y</i>', 'swap', { c: F, s: ['<i>n</i>C<i>r</i>', 'ncr'] }), K('0', 'd0', { c: N, s: ['►°C', 'f2c'], t: ['►°F', 'c2f'] }), K('.', 'dot', { c: N, s: ['►DMS', 'todms'], t: ['►DD', 'fromdms'] }), K('+/−', 'chs', { c: N, s: ['R▶P', 'r2p'], t: ['P▶R', 'pr'] }), K('=', 'eq', { c: N }) ] },
      ],
      notes: 'One-line algebraic (AOS) model with 2nd and 3rd shifts. STAT1/STAT2 (3rd Σ+/1/x) start 1- and 2-variable statistics; Σ+ enters data (x⇄y separates x and y). DEC/HEX/OCT/BIN base modes with AND/OR/XOR/XNOR/NOT (2nd), hex digits A–F on 3rd. Unit conversions ►cm/►in etc. on 1/2/3/0. Several unreadable labels were completed with this family\'s standard functions.',
    };
  }

  // =====================================================================
  //  Classic one-line (#23 #28)
  // =====================================================================
  function fx82Model(id, name, v) {
    const N = 'num', F = 'fn sm';
    return {
      id, name, app: 'aos', w: 330, cls: 'oneline fx82',
      theme: { body: 'repeating-linear-gradient(45deg,#1d1e20 0 2px,#232427 2px 4px)', cls: 'th-82 dark', vars: { '--bezel': '#141516', '--key': '#2d2e32', '--kt': '#fff', '--knum': '#2d2e32', '--knt': '#fff', '--kop': '#2d2e32', '--kopt': '#fff', '--kdel': '#2a66c8', '--kdelt': '#fff', '--kshift': '#2d2e32', '--kshiftt': '#e7b33a', '--ls': '#e7b33a', '--la': '#5aa0ff', '--lab': '#5aa0ff', '--kr': '5px' } },
      display: { kind: 'seg', cls: 'oneline', w: 270, h: 66 },
      cfg: { digits: 10, expDigits: 2, pct: 'fxg', chain: false, maxPar: 18, errText: 'E', shiftName: 'SHIFT', kFirst: false, indicatorSet: ['S', 'M', 'K', 'DEG', 'RAD', 'GRA', 'FIX', 'SCI', 'SD', 'HYP', '( )', 'a b/c'] },
      sections: [
        { cols: 6, kc: F, keys: [
          K('SHIFT', 'shift', { c: 'fn sm', cc: 'shiftk' }), K('MODE', 'mode'), K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'] }), K('log', 'log', { s: ['10<sup><i>x</i></sup>', 'pow10'] }), K('ln', 'ln', { s: ['<i>e</i><sup><i>x</i></sup>', 'epow'] }), K('ON', 'on'),
          K('a<sup>b</sup>/<sub>c</sub>', 'abc', { s: ['d/c', 'dc'] }), K('°′″', 'dms', { s: ['←', 'fromdms'] }), K('hyp', 'hyp'), K('sin', 'sin', { s: ['sin⁻¹', 'asin'] }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'] }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'] }),
          K('+/−', 'chs', { s: ['∛', 'cbrt'] }), K('►', 'bksp', { s: ['<i>x</i>³', 'cube'] }), K('[(', 'lp', { s: ['X↔Y', 'swap'] }), K(')]', 'rp', { s: ['1/<i>x</i>', 'inv'] }), K('<i>x</i><sup><i>y</i></sup>', 'pow', { s: ['<i>x</i><sup>1/<i>y</i></sup>', 'root'] }), K('MR', 'mr', { s: ['Min', 'min'] }) ] },
        { cols: 5, keys: [
          K('7', 'd7', { c: N, s: ['x̄', 'smean'] }), K('8', 'd8', { c: N, s: ['σ<sub>n</sub>', 'ssig'] }), K('9', 'd9', { c: N, s: ['σ<sub>n−1</sub>', 'ssx'] }), K('C', 'c', { c: 'del', s: ['X↔M', 'xm'] }), K('AC', 'ac', { c: 'del', s: ['SAC', 'statclr'] }),
          K('4', 'd4', { c: N, s: ['Σ<i>x</i>²', 'ssumx2'] }), K('5', 'd5', { c: N, s: ['Σ<i>x</i>', 'ssumx'] }), K('6', 'd6', { c: N, s: ['<i>n</i>', 'sn'] }), K('×', 'mul', { c: 'op', s: ['ENG←', 'engl'] }), K('÷', 'div', { c: 'op', s: ['ENG', 'eng'] }),
          K('1', 'd1', { c: N, s: ['<i>n</i>P<i>r</i>', 'npr'] }), K('2', 'd2', { c: N, s: ['<i>n</i>C<i>r</i>', 'ncr'] }), K('3', 'd3', { c: N, s: ['<i>x</i>!', 'fact'] }), K('+', 'add', { c: 'op', s: ['R→P', 'r2p'] }), K('−', 'sub', { c: 'op', s: ['P→R', 'pr'] }),
          K('0', 'd0', { c: N, s: ['RND', 'rnd'] }), K('•', 'dot', { c: N, s: ['RAN#', 'ran'] }), K('EXP', 'exp', { c: N, s: ['π', 'pi'] }), K('=', 'eq', { c: N, s: ['%', 'pct'] }), K('M+', 'mplus', { c: N, s: ['M−', 'mminus'], st: ['DATA', 'data'], below: '<span class="lst">DATA</span> <span class="lst">DEL</span>' }) ] },
      ],
      notes: 'Classic one-line immediate-execution algebraic model. MODE then 0 = COMP, 2 = SD (single-variable stats), 4/5/6 = DEG/RAD/GRA, 7/8/9 = FIX/SCI/NORM. In SD mode M+ enters DATA and SHIFT M+ deletes it; x̄, σn, σn−1, Σx², Σx, n are SHIFT 7/8/9/4/5/6. a b/c fractions with d/c conversion, constant calculations (K) on repeated operators.',
    };
  }

  // =====================================================================
  //  Financial algebraic with worksheets (#9)
  // =====================================================================
  function baModel(id, name) {
    const N = 'num', F = 'fn sm', W = 'tvm sm';
    return {
      id, name, app: 'fin', w: 330, cls: 'fin ba',
      theme: { body: 'linear-gradient(#262729,#121314)', cls: 'th-ba dark', vars: { '--bezel': '#9a9ca0', '--key': '#2e2f33', '--kt': '#fff', '--knum': '#a9abaf', '--knt': '#fff', '--kop': '#2e2f33', '--kopt': '#fff', '--kdel': '#2e2f33', '--kdelt': '#fff', '--kshift': '#e8d7b0', '--kshiftt': '#7a5a20', '--ls': '#eee', '--kr': '40%' } },
      display: { kind: 'seg', cls: 'fin', w: 270, h: 70 },
      cfg: { digits: 10, pct: 'ti', chain: false, errText: 'Error', shiftName: '2ND' },
      sections: [
        { cols: 5, kc: F, keys: [
          K('CPT', 'cpt', { s: ['QUIT', 'quit'] }), K('ENTER', 'enter', { s: ['SET', 'set'] }), K('↑', 'up', { s: ['DEL', 'del'] }), K('↓', 'down', { s: ['INS', 'ins'] }), K('ON|OFF', 'onoff', { c: 'fn sm onoff' }),
          K('2ND', '2nd', { c: 'shift sm' }), K('CF', 'ws:CF'), K('NPV', 'ws:NPV'), K('IRR', 'ws:IRR'), K('→', 'bksp'),
          K('N', 'N', { c: W, s: ['<i>x</i>P/Y', 'xpy'] }), K('I/Y', 'IY', { c: W, s: ['P/Y', 'ws:PY'] }), K('PV', 'PV', { c: W, s: ['AMORT', 'ws:AMORT'] }), K('PMT', 'PMT', { c: W, s: ['BGN', 'ws:BGN'] }), K('FV', 'FV', { c: W, s: ['CLR TVM', 'clrtvm'] }),
          K('%', 'pct', { s: ['K', 'k'] }), K('√<i>x</i>', 'sqrt'), K('<i>x</i>²', 'sq'), K('1/<i>x</i>', 'inv'), K('÷', 'div', { s: ['RAND', 'ran'] }),
          K('INV', 'inva', { s: ['HYP', 'hyp'] }), K('(', 'lp', { s: ['SIN', 'sin'] }), K(')', 'rp', { s: ['COS', 'cos'] }), K('<i>y</i><sup><i>x</i></sup>', 'pow', { s: ['TAN', 'tan'] }), K('×', 'mul', { s: ['<i>x</i>!', 'fact'] }),
          K('LN', 'ln', { s: ['<i>e</i><sup><i>x</i></sup>', 'epow'] }), K('7', 'd7', { c: N, s: ['DATA', 'ws:DATA'] }), K('8', 'd8', { c: N, s: ['STAT', 'ws:STAT'] }), K('9', 'd9', { c: N, s: ['BOND', 'ws:BOND'] }), K('−', 'sub', { s: ['<i>n</i>P<i>r</i>', 'npr'] }),
          K('STO', 'sto', { s: ['ROUND', 'round'] }), K('4', 'd4', { c: N, s: ['DEPR', 'ws:DEPR'] }), K('5', 'd5', { c: N, s: ['Δ%', 'ws:DCH'] }), K('6', 'd6', { c: N, s: ['BRKEVN', 'ws:BRKEVN'] }), K('+', 'add', { s: ['<i>n</i>C<i>r</i>', 'ncr'] }),
          K('RCL', 'rcl'), K('1', 'd1', { c: N, s: ['DATE', 'ws:DATE'] }), K('2', 'd2', { c: N, s: ['ICONV', 'ws:ICONV'] }), K('3', 'd3', { c: N, s: ['PROFIT', 'ws:PROFIT'] }), K('=', 'eq', { s: ['ANS', 'ans'] }),
          K('CE|C', 'cec', { s: ['CLR WORK', 'clrwork'] }), K('0', 'd0', { c: N, s: ['MEM', 'ws:MEM'] }), K('.', 'dot', { c: N, s: ['FORMAT', 'ws:FORMAT'] }), K('+|−', 'chs', { c: N, s: ['RESET', 'reset'] }), sp(1) ] },
      ],
      notes: 'Financial algebraic model. TVM: key in values then N, I/Y, PV, PMT, FV and press CPT + the unknown. 2ND P/Y, BGN, AMORT, CF/NPV/IRR (cash-flow list with frequencies), DATA/STAT, BOND, DEPR (straight-line only), Δ%, BRKEVN, PROFIT, ICONV, DATE, MEM, FORMAT worksheets; ↑/↓ move between worksheet variables, ENTER stores, CPT computes.',
    };
  }

  // =====================================================================
  //  RPN 42-style (#4 #10 #19 #37)
  // =====================================================================
  function rpn42Model(id, name) {
    const F = 'fn sm', N = 'num';
    const L = (t) => ({ a: [t, 'noop'] });
    return {
      id, name, app: 'rpn42', w: 360, cls: 'rpn r42',
      theme: { body: 'linear-gradient(#2a2a2c,#151516)', cls: 'th-42 dark', vars: { '--bezel': '#bcbcb0', '--key': '#3b3b3e', '--kt': '#fff', '--knum': '#3b3b3e', '--knt': '#fff', '--kop': '#3b3b3e', '--kopt': '#fff', '--kshift': '#f2b230', '--kshiftt': '#222', '--ls': '#f2b230', '--la': '#9aa', '--lcd': '#c3c9b3', '--kr': '4px' } },
      display: { kind: 'dm', cls: 'r42d', w: 300, h: 74 },
      cfg: { variant: '42s', digits: 12 },
      sections: [
        { cols: 6, cls: 'soft', keys: [1, 2, 3, 4, 5, 6].map(i => K('', 'noop', { c: 'fn sm softk', menuKey: 'm' + i, tip: 'Menu key ' + i })) },
        { cols: 6, kc: F, keys: [
          K('Σ+', 'sigplus', Object.assign({ s: ['Σ−', 'sigminus'] }, L('A'))), K('1/<i>x</i>', 'inv', Object.assign({ s: ['<i>y</i><sup><i>x</i></sup>', 'ypow'] }, L('B'))), K('√<i>x</i>', 'sqrt', Object.assign({ s: ['<i>x</i>²', 'sq'] }, L('C'))),
          K('LOG', 'log', Object.assign({ s: ['10<sup><i>x</i></sup>', 'pow10'] }, L('D'))), K('LN', 'ln', Object.assign({ s: ['<i>e</i><sup><i>x</i></sup>', 'epow'] }, L('E'))), K('XEQ', 'msg:Programs n/a', Object.assign({ s: ['GTO', 'msg:Programs n/a'] }, L('F'))),
          K('STO', 'sto', { s: ['COMPLEX', 'complex'], a: ['G', 'noop'] }), K('RCL', 'rcl', { s: ['%', 'pct'], a: ['H', 'noop'] }), K('R↓', 'rdn', { s: ['π', 'pi'], a: ['I', 'noop'] }),
          K('SIN', 'sin', { s: ['ASIN', 'asin'], a: ['J', 'noop'] }), K('COS', 'cos', { s: ['ACOS', 'acos'], a: ['K', 'noop'] }), K('TAN', 'tan', { s: ['ATAN', 'atan'], a: ['L', 'noop'] }) ] },
        { cols: '2fr 1fr 1fr 1fr 1fr', kc: F, keys: [
          K('ENTER', 'enter', { s: ['ALPHA', 'msg:ALPHA mode n/a'], a: ['M', 'noop'] }), K('<i>x</i>≷<i>y</i>', 'swap', { s: ['LAST<i>x</i>', 'lastx'], a: ['N', 'noop'] }), K('+/−', 'chs', { s: ['MODES', 'menu:MODES'], a: ['O', 'noop'] }),
          K('E', 'eex', { s: ['DISP', 'menu:DISP'], a: ['P', 'noop'] }), K('←', 'bksp', { s: ['CLEAR', 'menu:CLEAR'] }) ] },
        { cols: '1fr 1.2fr 1.2fr 1.2fr 1.2fr', keys: [
          K('▲', 'up', { c: F, s: ['BST', 'up'] }), K('7', 'd7', { c: N, s: ['SOLVER', 'menu:SOLVER'], a: ['Q', 'noop'] }), K('8', 'd8', { c: N, s: ['∫<i>f</i>(<i>x</i>)', 'msg:∫f(x) needs a program'], a: ['R', 'noop'] }), K('9', 'd9', { c: N, s: ['MATRIX', 'msg:MATRIX n/a'], a: ['S', 'noop'] }), K('÷', 'div', { c: N, s: ['STAT', 'menu:STAT'], a: ['T', 'noop'] }),
          K('▼', 'down', { c: F, s: ['SST', 'down'] }), K('4', 'd4', { c: N, s: ['BASE', 'menu:BASE'], a: ['U', 'noop'] }), K('5', 'd5', { c: N, s: ['CONVERT', 'menu:CONVERT'], a: ['V', 'noop'] }), K('6', 'd6', { c: N, s: ['FLAGS', 'msg:FLAGS n/a'], a: ['W', 'noop'] }), K('×', 'mul', { c: N, s: ['PROB', 'menu:PROB'], a: ['X', 'noop'] }),
          K('', 'shift', { c: 'shift sm', tip: 'Shift' }), K('1', 'd1', { c: N, s: ['ASSIGN', 'msg:ASSIGN n/a'], a: ['Y', 'noop'] }), K('2', 'd2', { c: N, s: ['CUSTOM', 'msg:CUSTOM n/a'], a: ['Z', 'noop'] }), K('3', 'd3', { c: N, s: ['PGM.FCN', 'msg:Programs n/a'] }), K('−', 'sub', { c: N, s: ['PRINT', 'msg:No printer'], a: ['−', 'noop'] }),
          K('EXIT', 'exit', { c: F, s: ['OFF', 'off'] }), K('0', 'd0', { c: N, s: ['TOP.FCN', 'menu:TOP'] }), K('•', 'dot', { c: N, s: ['SHOW', 'show'] }), K('R/S', 'msg:Programs n/a', { c: N, s: ['PRGM', 'msg:Programs n/a'] }), K('+', 'add', { c: N, s: ['CATALOG', 'menu:TOP'] }) ] },
      ],
      notes: 'RPN with a 4-level stack (X Y Z T, LAST X) and 2-line display. Shift + key opens soft menus (MODES, DISP, CLEAR, CONVERT, PROB, STAT, BASE, COMPLEX, SOLVER) that are operated with the six blank keys under the display; ▲▼ page through menus, EXIT closes them. STO/RCL accept 00–99 and arithmetic (STO + 05). Programming, matrices, ∫f(x), ALPHA and flags are not simulated.',
    };
  }

  // =====================================================================
  //  RPN 35-style (#22)
  // =====================================================================
  function rpn35Model(id, name) {
    const F = 'fn sm', N = 'num';
    const kk = (f, act, s, g, o) => K(f, act, Object.assign({ c: F }, s ? { s } : {}, g ? { g, u: [g[0]] } : {}, o || {}));
    return {
      id, name, app: 'rpn35', w: 360, cls: 'rpn r35',
      theme: { body: 'linear-gradient(#262628,#111112)', cls: 'th-35 dark', vars: { '--bezel': '#1a1a1b', '--key': '#3b3c40', '--kt': '#fff', '--knum': '#3b3c40', '--knt': '#fff', '--kop': '#3b3c40', '--kopt': '#fff', '--kshift': '#f2c230', '--kshiftt': '#222', '--kalpha': '#38a8e8', '--kalphat': '#111', '--ls': '#f2c230', '--lb': '#5cc0f0', '--lcd': '#c3c9b3', '--kr': '5px' } },
      display: { kind: 'dm', cls: 'r35d', w: 300, h: 74 },
      cfg: { variant: '35s', digits: 12 },
      sections: [
        { cols: '1fr 1fr 1fr 1fr 2fr', keys: [
          kk('R/S', 'msg:Programs n/a', ['FN#', 'msg:Programs n/a'], ['PRGM', 'msg:Programs n/a']), kk('GTO', 'msg:Programs n/a', ['ISG', 'noop'], ['RSE', 'noop']), kk('XEQ', 'msg:Programs n/a', ['RTN', 'noop'], ['ERL', 'noop']),
          kk('MODE', 'modemenu', ['<i>x</i>?<i>y</i>', 'noop'], ['XTD', 'noop']), PAD('cross', { r: 2, labels: ['FLAGS', 'MEM', 'DISPLAY', 'CONST'] }),
          kk('RCL', 'rcl', ['<i>x</i>≤', 'noop'], ['STD', 'noop']), kk('R↓', 'rdn', ['VIEW', 'noop'], ['R↑', 'rup']), kk('<i>x</i>↔<i>y</i>', 'swap', ['INPUT', 'noop'], ['PSE', 'noop']), kk('<i>i</i>', 'cmplxi', ['ARG', 'msg:ARG: use →POL'], ['BASE', 'basemenu']) ] },
        { cols: 6, keys: [
          kk('SIN', 'sin', ['HYP', 'msg:HYP: press SHIFT HYP then SIN'], ['ASIN', 'asin']), kk('COS', 'cos', ['π', 'pi'], ['ACOS', 'acos']), kk('TAN', 'tan', ['INTG', 'intgmenu'], ['ATAN', 'atan']),
          kk('√<i>x</i>', 'sqrt', ['<i>x</i>/<i>y</i>', 'xroot'], ['<i>x</i>²', 'sq']), kk('<i>y</i><sup><i>x</i></sup>', 'ypow', ['LOG', 'log'], ['LN', 'ln']), kk('1/<i>x</i>', 'inv', ['10<sup><i>x</i></sup>', 'pow10'], ['<i>e</i><sup><i>x</i></sup>', 'epow']) ] },
        { cols: '2fr 1fr 1fr 1fr 1fr', keys: [
          kk('ENTER', 'enter', ['SHOW', 'show'], ['LASTx', 'lastx']), kk('+/−', 'chs', ['=', 'noop'], ['ABS', 'abs']), kk('E', 'eex', ['←ENG', 'eng'], ['RND', 'rnd']), kk('( )', 'noop', ['ENG→', 'eng'], ['1|', 'noop']), kk('←', 'bksp', ['UNDO', 'noop'], ['CLEAR', 'clearmenu']) ] },
        { cols: '1fr 1.2fr 1.2fr 1.2fr 1.2fr', keys: [
          kk('EQN', 'msg:Equations n/a', ['∫', 'msg:∫ needs an equation'], ['SOLVE', 'msg:SOLVE n/a']), kk('7', 'd7', ['→°F', 'msg:→°F: use CONVERT'], ['→°C', 'noop'], { c: N }), kk('8', 'd8', ['HMS→', 'tohr'], ['→HMS', 'tohms'], { c: N }), kk('9', 'd9', ['→RAD', 'torad'], ['→DEG', 'todeg'], { c: N }), kk('÷', 'div', ['%CHG', 'pctch'], ['%', 'pct'], { c: N }),
          K('', 'shift', { c: 'shift sm', tip: 'Left shift' }), kk('4', 'd4', ['→lb', 'msg:→lb n/a'], ['→kg', 'noop'], { c: N }), kk('5', 'd5', ['→MILE', 'noop'], ['→KM', 'noop'], { c: N }), kk('6', 'd6', ['→in', 'noop'], ['→cm', 'noop'], { c: N }), kk('×', 'mul', ['<i>n</i>C<i>r</i>', 'comb'], ['<i>n</i>P<i>r</i>', 'perm'], { c: N }),
          K('', 'gshift', { c: 'alpha sm', tip: 'Right shift' }), kk('1', 'd1', ['LOGIC', 'logicmenu'], ['BASE', 'basemenu'], { c: N }), kk('2', 'd2', ['→gal', 'noop'], ['→l', 'noop'], { c: N }), kk('3', 'd3', ['SEED', 'noop'], ['RAND', 'ran'], { c: N }), kk('−', 'sub', ['L.R.', 'lsmenu'], ['SUMS', 'sumsmenu'], { c: N }),
          kk('C', 'clx', ['OFF', 'off'], ['ON', 'on']), kk('0', 'd0', ['␣', 'noop'], ['SPACE', 'noop'], { c: N }), kk('•', 'dot', ['/c', 'noop'], ['FDISP', 'noop'], { c: N }), kk('Σ+', 'sigplus', ['Σ−', 'sigminus'], ['s,σ', 'sdmenu'], { c: N }), kk('+', 'add', ['x̄,ȳ', 'mean'], ['$,σ', 'sdmenu'], { c: N }) ] },
      ],
      notes: 'RPN with 2-line display (Y over X). Yellow (left) and blue (right) shifts; MODE, DISPLAY, CLEAR, BASE, LOGIC, L.R., SUMS, s,σ, INTG and PROB menus show numbered choices – press the digit. Unit conversions not wired are shown as labels only. Equations, programs, SOLVE and ∫ are not simulated.',
    };
  }

  // =====================================================================
  //  Financial RPN landscape (#15 #45)
  // =====================================================================
  function rpn12Model(id, name, plat) {
    const kk = (f, act, s, g, o) => K(f, act, Object.assign({ c: 'fn' }, s ? { s } : {}, g ? { g, u: [g[0]] } : {}, o || {}));
    return {
      id, name, app: 'rpn12', w: 620, cls: 'rpn r12 landscape',
      theme: { body: plat ? 'linear-gradient(#e9e9e6,#bfc0bb)' : 'linear-gradient(#d4d5d7 0 27%,#1e1e20 27%,#131314)', cls: 'th-12', vars: { '--bezel': '#d8d8d4', '--key': '#1c1c1e', '--kt': '#fff', '--knum': '#1c1c1e', '--knt': '#fff', '--kshift': '#f0782a', '--kshiftt': '#fff', '--kalpha': '#2a8fd8', '--kalphat': '#fff', '--ls': plat ? '#d58a1e' : '#e2652a', '--lb': '#5ab7ee', '--lcd': '#c6ccb6', '--kpanel': '#151516', '--kr': '4px' } },
      display: { kind: 'seg', cls: 'r12d', w: 380, h: 64 },
      cfg: { digits: 10 },
      sections: [
        { cols: 10, cls: 'panel12', keys: [
          kk('<i>n</i>', 'n', ['AMORT', 'amort'], ['12×', 'n12']), kk('<i>i</i>', 'i', ['INT', 'int'], ['12÷', 'i12']), kk('PV', 'pv', ['NPV', 'npv'], ['CF<sub>0</sub>', 'cf0']), kk('PMT', 'pmt', ['RND', 'rnd'], ['CF<sub>j</sub>', 'cfj']), kk('FV', 'fv', ['IRR', 'irr'], ['N<sub>j</sub>', 'nj']),
          kk('CHS', 'chs', ['RPN', 'noop'], ['DATE', 'date']), kk('7', 'd7', null, ['BEG', 'beg']), kk('8', 'd8', null, ['END', 'end']), kk('9', 'd9', null, ['MEM', 'mem']), kk('÷', 'div', null, ['↶', 'noop']),
          kk('<i>y</i><sup><i>x</i></sup>', 'ypow', ['PRICE', 'price'], ['√<i>x</i>', 'sqrt12']), kk('1/<i>x</i>', 'inv', ['YTM', 'ytm'], ['<i>e</i><sup><i>x</i></sup>', 'epow']), kk('%T', 'pctt', ['SL', 'sl'], ['LN', 'ln']), kk('Δ%', 'pctch', ['SOYD', 'soy'], ['FRAC', 'fp']), kk('%', 'pct', ['DB', 'db'], ['INTG', 'ip']),
          kk('EEX', 'eex', ['ALG', 'noop'], ['ΔDYS', 'ddys']), kk('4', 'd4', null, ['D.MY', 'dmy']), kk('5', 'd5', null, ['M.DY', 'mdy']), kk('6', 'd6', null, ['x̄w', 'xw']), kk('×', 'mul', null, ['<i>x</i>²', 'sq']),
          kk('R/S', 'rs', ['P/R', 'pr'], ['PSE', 'pse']), kk('SST', 'sst', ['Σ', 'clsig12'], ['BST', 'bst']), kk('R↓', 'rdn', ['PRGM', 'msg:Programs n/a'], ['GTO', 'gto']), kk('<i>x</i>≷<i>y</i>', 'swap', ['FIN', 'clfin'], ['<i>x</i>≤<i>y</i>', 'noop']), kk('CL<i>x</i>', 'clx', ['REG', 'clreg'], ['<i>x</i>=0', 'noop']),
          kk('E<br>N<br>T<br>E<br>R', 'enter', ['PREFIX', 'clprefix'], ['=', 'noop'], { r: 2, c: 'fn tall enter12' }), kk('1', 'd1', null, ['x̂,r', 'xhatr']), kk('2', 'd2', null, ['ŷ,r', 'yhatr']), kk('3', 'd3', null, ['n!', 'fact']), kk('−', 'sub', null, ['←', 'bksp']),
          kk('ON', 'onoff', ['OFF', 'onoff']), K('f', 'fshift', { c: 'shift' }), K('g', 'gshift', { c: 'alpha' }), kk('STO', 'sto', null, ['(', 'noop']), kk('RCL', 'rcl', null, [')', 'noop']),
          kk('0', 'd0', null, ['x̄', 'xbar']), kk('•', 'dot', null, ['s', 'sdev12']), kk('Σ+', 'sigplus', null, ['Σ−', 'sigminus']), kk('+', 'add', null, ['LST<i>x</i>', 'lastx']) ] },
      ],
      notes: 'Landscape financial RPN. TVM with n, i, PV, PMT, FV (enter value + key; press the key alone to compute), g 12× / 12÷, BEG/END; cash flows CF0, CFj, Nj with NPV/IRR; AMORT, INT (simple interest), dates (D.MY/M.DY, DATE, ΔDYS), depreciation SL/SOYD/DB, statistics Σ+, x̄, s, ŷ,r, x̂,r, x̄w; f + digit sets the number of decimals. PRICE/YTM and programming are not simulated. f CLEAR Σ/FIN/REG/PREFIX are on SST, x≷y, CLx and ENTER.' + (plat ? ' Some function labels on this photo were garbled; the standard labels for each key are used.' : ''),
    };
  }

  // =====================================================================
  //  Printing desk calculators (#33 #38)
  // =====================================================================
  function printModel(id, name, white) {
    const N = 'num', F = 'fn sm';
    const keys = white ? [
      K('FEED', 'feed', { c: F }), K('DATE', 'date', { c: F }), K('COST', 'cost', { c: F }), K('SELL', 'sell', { c: F }), K('MAR', 'mar', { c: F }), K('+/−', 'chs', { c: F }), K('TAX−', 'taxm', { c: 'fn sm tax' }), K('TAX+', 'taxp', { c: 'fn sm tax' }),
      K('CA', 'ca', { c: F }), K('MU<br>MD', 'mumd', { c: F }), K('%/#', 'nonadd', { c: F }), K('▶', 'bksp', { c: F }), K('M+', 'mplus', { c: 'fn sm mem' }), K('M−', 'mminus', { c: 'fn sm mem' }), K('M◇', 'msub', { c: 'fn sm mem' }), K('M✱', 'mtot', { c: 'fn sm mem' }),
      K('%', 'pct', { c: F }), K('7', 'd7', { c: N }), K('8', 'd8', { c: N }), K('9', 'd9', { c: N }), K('−', 'sub', { c: 'del' }), K('×', 'mul', { c: 'op' }), K('÷', 'div', { c: 'op' }), K('Δ%', 'dpct', { c: F }),
      K('C', 'c', { c: 'del' }), K('4', 'd4', { c: N }), K('5', 'd5', { c: N }), K('6', 'd6', { c: N }), K('+', 'add', { c: 'op tall', r: 3 }), K('=', 'eq', { c: 'op' }), K('G✱', 'gt', { c: 'op' }), K('▲', 'up', { c: F, tip: 'Rate up' }),
      sp(1), K('1', 'd1', { c: N }), K('2', 'd2', { c: N }), K('3', 'd3', { c: N }), K('✱', 'tot', { c: 'op tall', r: 2 }), K('◇', 'subtot', { c: 'op' }), K('▼', 'down', { c: F, tip: 'Rate down' }),
      sp(1), K('0', 'd0', { c: N }), K('00', 'd00', { c: N }), K('•', 'dot', { c: N }), K('PRT', 'prt', { c: F }), K('REPRINT', 'reprint', { c: 'fn xs' }) ]
      : [
      K('TIME', 'time', { c: F }), K('IT', 'it', { c: F }), K('COST', 'cost', { c: F }), K('SELL', 'sell', { c: F }), K('MAR', 'mar', { c: F }), K('PRT', 'prt', { c: F }), K('REPRINT', 'reprint', { c: 'fn xs reprint' }), K('FEED', 'feed', { c: F }),
      K('CA', 'ca', { c: F }), K('▶', 'bksp', { c: F }), K('+/−', 'chs', { c: F }), K('#', 'nonadd', { c: F, tip: 'Non-add / date (Q/N)' }), K('CONNECT', 'noop', { c: 'fn xs' }), K('Δ%', 'dpct', { c: F }), K('▲', 'up', { c: 'fn sm blue', tip: 'Rate up' }), K('▼', 'down', { c: 'fn sm blue', tip: 'Rate down' }),
      K('%', 'pct', { c: F }), K('7', 'd7', { c: N }), K('8', 'd8', { c: N }), K('9', 'd9', { c: N }), K('−', 'sub', { c: 'del' }), K('TAX−', 'taxm', { c: 'fn sm tax' }), K('TAX+', 'taxp', { c: 'fn sm tax' }), K('M✱', 'mtot', { c: 'op' }),
      K('MU<br>MD', 'mumd', { c: F }), K('4', 'd4', { c: N }), K('5', 'd5', { c: N }), K('6', 'd6', { c: N }), K('+<br>=', 'addeq', { c: 'op tall', r: 3 }), K('÷', 'div', { c: 'op' }), K('×', 'mul', { c: 'op' }), K('M◇', 'msub', { c: 'op' }),
      K('C', 'c', { c: 'del' }), K('1', 'd1', { c: N }), K('2', 'd2', { c: N }), K('3', 'd3', { c: N }), K('G✱', 'gt', { c: 'op' }), K('✱', 'tot', { c: 'op' }), K('M−', 'mminus', { c: 'op' }),
      sp(1), K('0', 'd0', { c: N }), K('00', 'd00', { c: N }), K('•', 'dot', { c: N }), K('◇', 'subtot', { c: 'op' }), sp(1), K('M+', 'mplus', { c: 'op' }) ];
    return {
      id, name, app: 'print', w: 560, cls: 'desk print' + (white ? ' white' : ''),
      theme: white
        ? { body: 'linear-gradient(#f6f6f4,#dcdcd8)', cls: 'th-pr', vars: { '--bezel': '#2a2a2c', '--key': '#3a3b3f', '--kt': '#fff', '--knum': '#8e9096', '--knt': '#fff', '--kop': '#3a3b3f', '--kopt': '#fff', '--kdel': '#ef5a78', '--kdelt': '#fff', '--kr': '5px' } }
        : { body: 'repeating-linear-gradient(45deg,#26272a 0 2px,#2c2d30 2px 4px)', cls: 'th-pr dark', vars: { '--bezel': '#141516', '--key': '#2e2f33', '--kt': '#fff', '--knum': '#2e2f33', '--knt': '#fff', '--kop': '#2e2f33', '--kopt': '#fff', '--kdel': '#b6359c', '--kdelt': '#fff', '--kr': '5px' } },
      display: { kind: 'seg', cls: 'desk vfd', w: 420, h: 64 },
      tape: true,
      afterDisplay: `<div class="slides">
        <div class="slide"><b>DEC</b><span class="opts">${['F', '4', '3', '2', '1', '0', 'ADD2'].map(v => `<button data-act="decsw:${v}" class="${v === 'F' ? 'on' : ''}">${v}</button>`).join('')}</span></div>
        <div class="slide"><b>ROUND</b><span class="opts">${['UP', '5/4', 'CUT'].map(v => `<button data-act="rndsw:${v}" class="${v === '5/4' ? 'on' : ''}">${v}</button>`).join('')}</span></div>
        <div class="slide"><b>PRINT</b><span class="opts">${['P', 'NP'].map(v => `<button data-act="prtsw:${v}" class="${v === 'P' ? 'on' : ''}">${v}</button>`).join('')}</span></div></div>`,
      sections: [{ cols: 8, keys }],
      cfg: { digits: 12 },
      notes: 'Two-colour printing desk calculator with on-screen paper tape (negative values in red). Adding-machine logic (+= / − accumulate, ✱ total, ◇ subtotal), item count, memory M+ M− M◇ M✱, grand total G✱, MU/MD mark-up, COST/SELL/MAR margin, TAX+/TAX− (rate: hold the ▲/▼ keys to change, default 8 %), Δ%, decimal (F 4 3 2 1 0 ADD2) and rounding (UP 5/4 CUT) slide switches, non-add/date print (#), REPRINT and FEED. TIME/DATE use the system clock; CONNECT (PC link) is a no-op.',
    };
  }
  G.__M3 = { ti36Model, fx82Model, baModel, rpn42Model, rpn35Model, rpn12Model, printModel };
})(window);
(function (G) {
  'use strict';
  const { K, sp, PAD } = G.__M1;
  const V = (l) => ['<span>' + l + '</span>', 'var:' + l];

  // =====================================================================
  //  83/84-style monochrome graphing (#2 #43 dark slate, #7 #40 silver)
  // =====================================================================
  function tiModel(id, name, silver) {
    const F = 'fn sm', N = 'num', O = 'op';
    const th = silver
      ? { body: 'linear-gradient(#d4d6da,#a9acb2)', cls: 'th-ti silver', vars: { '--bezel': '#55585e', '--key': '#2b2d31', '--kt': '#fff', '--knum': '#f3f3f3', '--knt': '#111', '--kop': '#2b2d31', '--kopt': '#fff', '--kshift': '#e8b53a', '--kshiftt': '#111', '--kalpha': '#58b558', '--kalphat': '#111', '--kexe': '#2b2d31', '--kexet': '#fff', '--ls': '#9b6a00', '--la': '#1d7d1d', '--pad': '#2b2d31', '--kr': '6px' } }
      : { body: 'linear-gradient(#3a4150,#262b35)', cls: 'th-ti dark', vars: { '--bezel': '#1d2128', '--key': '#111317', '--kt': '#fff', '--knum': '#f2f2f2', '--knt': '#111', '--kop': '#3d6fb0', '--kopt': '#fff', '--kshift': '#e6c34a', '--kshiftt': '#111', '--kalpha': '#61b968', '--kalphat': '#111', '--ls': '#e6c34a', '--la': '#7fcf86', '--pad': '#111317', '--kr': '6px' } };
    return {
      id, name, app: 'graph', w: 360, cls: 'graph ti', theme: th,
      display: { kind: 'gmono', cls: 'ti', w: 300, h: 200 },
      cfg: { gfam: 'ti', mono: true, W: 96, H: 64, lines: 8, natural: false, shiftName: '2nd', xName: 'X', menuPer: 7, yArg: false, implicitHigh: true },
      sections: [
        { cols: 5, cls: 'fkeys', kc: 'fn xs fk', keys: [
          K('Y=', 'yeq', { s: ['STAT PLOT', 'statplot'] }), K('WINDOW', 'window', { s: ['TBLSET', 'tblset'] }), K('ZOOM', 'zoom', { s: ['FORMAT', 'draw'] }), K('TRACE', 'trace', { s: ['CALC', 'calcmenu'] }), K('GRAPH', 'graph', { s: ['TABLE', 'table'] }) ] },
        { cols: '1fr 1fr 1fr 2fr', cls: 'ktop', kc: F, keys: [
          K('2nd', 'shift', { c: 'shift sm' }), K('MODE', 'mode', { s: ['QUIT', 'quit'] }), K('DEL', 'del', { s: ['INS', 'ins'] }), PAD('cross', { r: 2 }),
          K('ALPHA', 'alpha', { c: 'alpha sm', s: ['A-LOCK', 'alpha'] }), K('X,T,θ,<i>n</i>', 'varx', { s: ['LINK', 'msg:Link not available'] }), K('STAT', 'stat', { s: ['LIST', 'list'] }) ] },
        { cols: 5, kc: F, keys: [
          K('MATH', 'mathmenu', { s: ['TEST', 'msg:TEST: type = < > with ALPHA'], a: V('A') }), K('APPS', 'apps', { s: ['ANGLE', 'angle'], a: V('B') }), K('PRGM', 'prgm', { s: ['DRAW', 'draw'], a: V('C') }), K('VARS', 'vars', { s: ['DISTR', 'distmenu'] }), K('CLEAR', 'clear'),
          K('<i>x</i>⁻¹', 'inv', { s: ['MATRIX', 'matmenu'], a: V('D') }), K('SIN', 'sin', { s: ['SIN⁻¹', 'asin'], a: V('E') }), K('COS', 'cos', { s: ['COS⁻¹', 'acos'], a: V('F') }), K('TAN', 'tan', { s: ['TAN⁻¹', 'atan'], a: V('G') }), K('^', 'pow', { c: O, s: ['π', 'pi'], a: V('H') }),
          K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'], a: V('I') }), K(',', 'comma', { s: ['EE', 'exp10'], a: V('J') }), K('(', 'lp', { s: ['{', 'ins:{'], a: V('K') }), K(')', 'rp', { s: ['}', 'ins:}'], a: V('L') }), K('÷', 'div', { c: O, s: ['<i>e</i>', 'e'], a: V('M') }),
          K('LOG', 'log', { s: ['10<sup><i>x</i></sup>', 'pow10'], a: V('N') }), K('7', 'd7', { c: N, s: ['u', 'noop'], a: V('O') }), K('8', 'd8', { c: N, s: ['v', 'noop'], a: V('P') }), K('9', 'd9', { c: N, s: ['w', 'noop'], a: V('Q') }), K('×', 'mul', { c: O, s: ['[', 'ins:['], a: V('R') }),
          K('LN', 'ln', { s: ['<i>e</i><sup><i>x</i></sup>', 'epow'], a: V('S') }), K('4', 'd4', { c: N, s: ['L4', 'list'], a: V('T') }), K('5', 'd5', { c: N, s: ['L5', 'list'], a: V('U') }), K('6', 'd6', { c: N, s: ['L6', 'list'], a: V('V') }), K('−', 'sub', { c: O, s: [']', 'ins:]'], a: V('W') }),
          K('STO▸', 'stoarrow', { s: ['RCL', 'recall'], a: V('X') }), K('1', 'd1', { c: N, s: ['L1', 'list'], a: V('Y') }), K('2', 'd2', { c: N, s: ['L2', 'list'], a: V('Z') }), K('3', 'd3', { c: N, s: ['L3', 'list'], a: V('θ') }), K('+', 'add', { c: O, s: ['MEM', 'reset'], a: ['"', 'noop'] }),
          K('ON', 'on', { s: ['OFF', 'off'] }), K('0', 'd0', { c: N, s: ['CATALOG', 'catalog'], a: ['␣', 'noop'] }), K('.', 'dot', { c: N, s: ['<i>i</i>', 'i'], a: [':', 'colon'] }), K('(−)', 'neg', { c: N, s: ['ANS', 'ans'], a: ['?', 'noop'] }), K('ENTER', 'exe', { c: O, s: ['ENTRY', 'entry'], a: ['SOLVE', 'solveapp'] }) ] },
      ],
      notes: 'Monochrome graphing model. Home screen with history; Y= editor (Y1–Y6), WINDOW, ZOOM (box-free: In/Out/Standard/Trig/Fit), TRACE, GRAPH, TABLE/TBLSET, 2nd CALC (value, zero, minimum, maximum, intersect, dy/dx, ∫f(x)dx), STAT (list editor, 1-Var/2-Var and linear/quadratic/exponential regressions, scatter STAT PLOT), MATH (fractions, cube root, abs, round, nDeriv/fnInt), MATRIX, DISTR (normal/binomial/Poisson), ALPHA SOLVE (numeric solver). Programs, LINK and list literals {…} are not simulated.',
    };
  }

  // =====================================================================
  //  F-key graphing (#32 mono white/violet, #24 colour black)
  // =====================================================================
  const FK_APPS = [['Run-Matrix', '×÷<br>+−', '#3d7bd6', 'run'], ['Statistics', '📊', '#e0703a', 'stat'], ['Graph', '📈', '#2c9c5a', 'graph'], ['Table', '▦', '#7a5cc4', 'table'], ['Equation', 'EQ', '#c43d6a', 'eqn'], ['Matrix', '[ ]', '#4a8fa8', 'matrix'], ['Distribution', 'Dist', '#b38b22', 'dist'], ['Base-N', 'BIN', '#666', 'base'], ['System', '⚙', '#555', 'settings']];
  function fkeyModel(id, name, color) {
    const F = 'fn sm', N = 'num', A = (l) => V(l);
    const th = color
      ? { body: 'linear-gradient(#26272b,#111214)', cls: 'th-fx dark', vars: { '--bezel': '#151618', '--key': '#2f3034', '--kt': '#fff', '--knum': '#ebebeb', '--knt': '#111', '--kop': '#ebebeb', '--kopt': '#111', '--kdel': '#ebebeb', '--kdelt': '#111', '--kexe': '#2a64c8', '--kexet': '#fff', '--kshift': '#e7b33a', '--kshiftt': '#111', '--kalpha': '#c3243a', '--kalphat': '#fff', '--ls': '#e7b33a', '--la': '#ff6a6a', '--pad': '#3a3b40', '--kr': '6px' } }
      : { body: 'linear-gradient(#f3f2f6,#d7d5df)', cls: 'th-fx white', vars: { '--bezel': '#4b3e7a', '--key': '#4b4c55', '--kt': '#fff', '--knum': '#f7f7f9', '--knt': '#222', '--kop': '#f7f7f9', '--kopt': '#222', '--kdel': '#f7f7f9', '--kdelt': '#222', '--kexe': '#3a6fd0', '--kexet': '#fff', '--kshift': '#e7b33a', '--kshiftt': '#111', '--kalpha': '#c3243a', '--kalphat': '#fff', '--ls': '#a8761a', '--la': '#c3243a', '--pad': '#5a4a9a', '--kr': '6px' } };
    return {
      id, name, app: 'graph', w: 360, cls: 'graph fx' + (color ? ' color' : ''), theme: th,
      display: { kind: color ? 'gcolor' : 'gmono', cls: 'fx', w: 300, h: color ? 196 : 176 },
      cfg: Object.assign({ gfam: 'fxg', mono: !color, W: color ? 384 : 128, H: color ? 192 : 64, lines: color ? 6 : 7, natural: !!color, softKeys: true, startGrid: true, appItems: FK_APPS, gridCols: 3, gridNums: true, shiftName: 'S', xName: 'x', fnames: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'], yArg: false, lineW: 2, axisLabels: !!color,
        homeSoft: [['JUMP', 'noop'], ['DEL', 'clear'], ['MAT', 'matmenu'], ['MATH', 'mathmenu'], ['', 'noop'], ['', 'noop']] }, {}),
      sections: [
        { cols: 6, cls: 'fkeys', kc: 'fn xs fk', keys: [
          K('F1', 'f1', { s: ['Trace', 'trace'] }), K('F2', 'f2', { s: ['Zoom', 'zoom'] }), K('F3', 'f3', { s: ['V-Window', 'vwin'] }), K('F4', 'f4', { s: ['Sketch', 'draw'] }), K('F5', 'f5', { s: ['G-Solv', 'calcmenu'] }), K('F6', 'f6', { s: ['G↔T', 'table'] }) ] },
        { cols: '1fr 1fr 1fr 1fr 2fr', cls: 'ktop', kc: F, keys: [
          K('SHIFT', 'shift', { c: 'shift sm' }), K('OPTN', 'optn'), K('VARS', 'vars', { s: ['PRGM', 'prgm'] }), K('MENU', 'menu', { s: ['SET UP', 'gmode'] }), PAD('replay', { r: 2, label: 'REPLAY' }),
          K('ALPHA', 'alpha', { c: 'alpha sm', s: ['A-LOCK', 'alpha'] }), K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'], a: ['<i>r</i>', 'var:r'] }), K('^', 'pow', { s: ['<sup>x</sup>√', 'nroot'], a: ['θ', 'var:θ'] }), K('EXIT', 'quit', { s: ['QUIT', 'quit'] }) ] },
        { cols: 6, kc: F, keys: [
          K('X,θ,T', 'varx', { s: ['∠', 'noop'], a: A('A') }), K('log', 'log', { s: ['10<sup><i>x</i></sup>', 'pow10'], a: A('B') }), K('ln', 'ln', { s: ['<i>e</i><sup><i>x</i></sup>', 'epow'], a: A('C') }), K('sin', 'sin', { s: ['sin⁻¹', 'asin'], a: A('D') }), K('cos', 'cos', { s: ['cos⁻¹', 'acos'], a: A('E') }), K('tan', 'tan', { s: ['tan⁻¹', 'atan'], a: A('F') }),
          K('<sup>a</sup>⁄<sub>b</sub>', 'frac', { s: ['<sup>□</sup>⁄<sub>□</sub>', 'mixed'], a: A('G') }), K('F↔D', 'sd', { a: A('H') }), K('(', 'lp', { s: ['∛', 'cbrt'], a: A('I') }), K(')', 'rp', { s: ['<i>x</i>⁻¹', 'inv'], a: A('J') }), K(',', 'comma', { a: A('K') }), K('→', 'stoarrow', { a: A('L') }) ] },
        { cols: 5, keys: [
          K('7', 'd7', { c: N, s: ['CAPTURE', 'noop'], a: A('M') }), K('8', 'd8', { c: N, s: ['CLIP', 'noop'], a: A('N') }), K('9', 'd9', { c: N, s: ['PASTE', 'noop'], a: A('O') }), K('DEL', 'del', { c: 'del', s: ['INS', 'ins'] }), K('AC/ON', 'onac', { c: 'del', s: ['OFF', 'off'] }),
          K('4', 'd4', { c: N, s: ['CATALOG', 'catalog'], a: A('P') }), K('5', 'd5', { c: N, s: ['FORMAT', 'format'], a: A('Q') }), K('6', 'd6', { c: N, a: A('R') }), K('×', 'mul', { c: 'op', s: ['{', 'ins:{'], a: A('S') }), K('÷', 'div', { c: 'op', s: ['}', 'ins:}'], a: A('T') }),
          K('1', 'd1', { c: N, s: ['List', 'list'], a: A('U') }), K('2', 'd2', { c: N, s: ['Mat', 'matmenu'], a: A('V') }), K('3', 'd3', { c: N, a: A('W') }), K('+', 'add', { c: 'op', s: ['[', 'ins:['], a: A('X') }), K('−', 'sub', { c: 'op', s: [']', 'ins:]'], a: A('Y') }),
          K('0', 'd0', { c: N, s: ['<i>i</i>', 'i'], a: A('Z') }), K('.', 'dot', { c: N, s: ['=', 'eq'], a: ['SPACE', 'noop'] }), K('EXP', 'exp10', { c: N, s: ['π', 'pi'], a: ['"', 'noop'] }), K('(−)', 'neg', { c: N, s: ['Ans', 'ans'] }), K('EXE', 'exe', { c: 'exe', s: ['↵', 'exe'] }) ] },
      ],
      notes: 'F-key graphing model. MENU opens the icon menu (Run-Matrix, Statistics, Graph, Table, Equation, Matrix, Distribution, Base-N, System) – pick with the cursor + EXE or the number. F1–F6 act on the soft-key bar; SHIFT F1–F6 give Trace, Zoom, V-Window, Sketch, G-Solv (root, max, min, intersect, ∫dx) and G↔T. ' + (color ? 'Colour screen with natural input.' : 'Monochrome dot screen, linear input.') + ' Programs, e-Activity, spreadsheet, CAPTURE/CLIP/PASTE are not simulated.',
    };
  }

  // =====================================================================
  //  Touch-screen colour (#5)
  // =====================================================================
  function cpModel(id, name) {
    const N = 'num', F = 'fn sm';
    return {
      id, name, app: 'graph', w: 340, cls: 'graph cp', 
      theme: { body: 'linear-gradient(#fafafa,#dcdde0)', cls: 'th-cp', vars: { '--bezel': '#1d1e20', '--key': '#e9eaed', '--kt': '#222', '--knum': '#fff', '--knt': '#222', '--kop': '#fff', '--kopt': '#222', '--kexe': '#3a6fd0', '--kexet': '#fff', '--kshift': '#e9eaed', '--kshiftt': '#c58b10', '--pad': '#c9cbd0', '--padt': '#333', '--kr': '6px' } },
      display: { kind: 'gcolor', cls: 'cp', w: 290, h: 330 },
      cfg: { gfam: 'cp', mono: false, W: 290, H: 200, lines: 7, natural: true, shiftName: 'Shift', xName: 'x', axisLabels: true, approxToo: false, appItems: [['Main', '√α', '#3d7bd6', 'run'], ['Graph&Table', '📈', '#2c9c5a', 'graph'], ['Statistics', '📊', '#e0703a', 'stat'], ['Numeric Solver', 'x=?', '#c43d6a', 'solve'], ['Equation', 'EQ', '#7a5cc4', 'eqn'], ['Matrix', '[ ]', '#4a8fa8', 'matrix'], ['Distribution', 'Dist', '#b38b22', 'dist'], ['Setting', '⚙', '#555', 'settings']], gridCols: 4,
        touchKbd: [
          [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'], ['ln', 'ln'], ['log', 'log'], ['√', 'sqrt'], ['x²', 'sq'], ['π', 'pi']],
          [['sin⁻¹', 'asin'], ['cos⁻¹', 'acos'], ['tan⁻¹', 'atan'], ['eˣ', 'epow'], ['10ˣ', 'pow10'], ['ⁿ√', 'nroot'], ['▭/▭', 'frac'], ['i', 'i']],
          [['a', 'var:A'], ['b', 'var:B'], ['c', 'var:C'], ['abs', 'abs'], ['!', 'fact'], ['nCr', 'ncr'], ['nPr', 'npr'], ['∫', 'integ']],
          [['d/dx', 'deriv'], ['Σ', 'sigma'], ['°', 'dms'], ['ans', 'ans'], ['◀', 'left'], ['▶', 'right'], ['⌫', 'del'], ['EXE', 'exe']] ],
        homeSoft: null },
      sections: [
        { cols: '1fr 1fr 1.6fr 1fr 1fr', cls: 'ktop', kc: F, keys: [
          K('Keyboard', 'keyboard', { c: 'fn xs' }), K('Shift', 'shift', { c: 'shift xs' }), PAD('oval', { r: 1 }), K('⌫', 'del'), K('Clear', 'onac', { below: '<span class="lst">⏻</span>' }) ] },
        { cols: 6, keys: [
          K('=', 'eq', { c: N }), K('<i>x</i>', 'var:X', { c: N }), K('<i>y</i>', 'var:Y', { c: N }), K('<i>z</i>', 'var:Z', { c: N }), K('^', 'pow', { c: N }), K('÷', 'div', { c: N }) ] },
        { cols: 5, keys: [
          K('(', 'lp', { c: N }), K('7', 'd7', { c: N }), K('8', 'd8', { c: N }), K('9', 'd9', { c: N }), K('×', 'mul', { c: N }),
          K(')', 'rp', { c: N }), K('4', 'd4', { c: N }), K('5', 'd5', { c: N }), K('6', 'd6', { c: N }), K('−', 'sub', { c: N }),
          K(',', 'comma', { c: N }), K('1', 'd1', { c: N }), K('2', 'd2', { c: N }), K('3', 'd3', { c: N }), K('+', 'add', { c: N }),
          K('(−)', 'neg', { c: N }), K('0', 'd0', { c: N }), K('.', 'dot', { c: N }), K('EXP', 'exp10', { c: N }), K('EXE', 'exe', { c: 'exe' }) ] },
      ],
      notes: 'Touch-screen colour model. Tap "Keyboard" to toggle the on-screen soft keyboard (functions, templates, variables). The touch screen menu bar items and app icons are tappable; the stylus-driven geometry, eActivity, spreadsheet and CAS algebra (solve/factor/expand symbolic) are simplified to numeric work.',
    };
  }
  G.__M4a = { tiModel, fkeyModel, cpModel };
})(window);
(function (G) {
  'use strict';
  const { K, sp, PAD } = G.__M1;
  const V = (l) => ['<span>' + l + '</span>', 'var:' + l];

  // =====================================================================
  //  Colour CAS-style graphing (#11 #27 #39 black/silver, #16 all dark)
  // =====================================================================
  function cgxModel(id, name, dark) {
    const F = 'fn sm', N = 'num';
    return {
      id, name, app: 'graph', w: 360, cls: 'graph cgx' + (dark ? ' alldark' : ''),
      theme: { body: dark ? 'linear-gradient(#2a2b2e,#141517)' : 'linear-gradient(#1b1c1e 0 38%,#c9cbcf 38%,#a8abb0)', cls: 'th-cgx' + (dark ? ' dark' : ''), vars: { '--bezel': '#0d0d0e', '--key': dark ? '#34353a' : '#f4f4f4', '--kt': dark ? '#fff' : '#222', '--knum': dark ? '#34353a' : '#fff', '--knt': dark ? '#fff' : '#222', '--kop': dark ? '#34353a' : '#fff', '--kopt': dark ? '#fff' : '#222', '--kexe': dark ? '#34353a' : '#fff', '--kexet': dark ? '#fff' : '#222', '--kshift': '#3a8fd8', '--kshiftt': '#fff', '--kalpha': '#f08a2c', '--kalphat': '#fff', '--ls': '#3a8fd8', '--la': '#e07a1c', '--pad': '#3a3b40', '--kr': '6px' } },
      display: { kind: 'gcolor', cls: 'cgx', w: 310, h: 232 },
      cfg: { gfam: 'cgx', mono: false, W: 320, H: 220, lines: 7, natural: true, shiftName: 'Shift', xName: 'X', fnames: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'], yArg: true, axisLabels: true, approxToo: true, softKeys: false, homeTitle: 'Function',
        appItems: [['Function', '📈', '#2c7fd0', 'graph'], ['Statistics 2Var', '📊', '#e0703a', 'stat'], ['Solve', 'x=?', '#2c9c5a', 'solve'], ['Linear Solver', 'EQ', '#7a5cc4', 'eqn'], ['Matrix', '[ ]', '#4a8fa8', 'matrix'], ['Distributions', 'Dist', '#b38b22', 'dist'], ['Base', 'HEX', '#666', 'base'], ['Home', '⌂', '#333', 'run'], ['Settings', '⚙', '#555', 'settings']], gridCols: 3 },
      sections: [
        { cols: 5, cls: 'ktop dark', kc: 'fn xs', keys: [
          K('Apps', 'apps', { s: ['Info', 'msg:Info'] }), K('Symb', 'symb', { s: ['Setup', 'tblset'] }), PAD('ring', { r: 3 }), K('Help', 'msg:Help is not available', {}), K('Esc', 'quit', { s: ['Clear', 'clear'] }),
          K('⌂', 'home', { s: ['Settings', 'gmode'] }), K('Plot', 'plot', { s: ['Setup', 'window'] }), K('View', 'zoom', { s: ['Setup', 'window'] }), K('CAS', 'msg:CAS not available:<br>numeric Home only', { s: ['Settings', 'gmode'] }),
          sp(1), K('Num', 'num', { s: ['Setup', 'tblset'] }), K('Menu', 'mathmenu', { s: ['Paste', 'entry'] }), sp(1) ] },
        { cols: 6, kc: F, keys: [
          K('Vars', 'vars', { s: ['Chars', 'catalog'], a: V('A') }), K('Toolbox', 'mathmenu', { s: ['Mem', 'reset'], a: V('B') }), K('▭▭', 'frac', { s: ['Units', 'convmenu'], a: V('C') }), K('<i>x</i>t θ<i>n</i>', 'varx', { s: ['Define', 'yeq'], a: V('D') }), K('<sup>a</sup>⁄<sub>b</sub>', 'sd', { a: V('E') }), K('⌫', 'del', { s: ['Clear', 'clear'] }),
          K('<i>x</i><sup><i>y</i></sup>', 'pow', { s: ['<sup>y</sup>√<i>x</i>', 'nroot'], a: V('F') }), K('SIN', 'sin', { s: ['ASIN', 'asin'], a: V('G') }), K('COS', 'cos', { s: ['ACOS', 'acos'], a: V('H') }), K('TAN', 'tan', { s: ['ATAN', 'atan'], a: V('I') }), K('LN', 'ln', { s: ['<i>e</i><sup><i>x</i></sup>', 'epow'], a: V('J') }), K('LOG', 'log', { s: ['10<sup><i>x</i></sup>', 'pow10'], a: V('K') }),
          K('<i>x</i>²', 'sq', { s: ['√', 'sqrt'], a: V('L') }), K('+/−', 'neg', { s: ['|<i>x</i>|', 'abs'], a: V('M') }), K('( )', 'lp', { s: [')', 'rp'], a: V('N') }), K(',', 'comma', { s: ['Eval', 'exe'], a: V('O') }), K('Enter', 'exe', { w: 2, c: 'fn sm wide', s: ['≈', 'todec'] }) ] },
        { cols: 5, keys: [
          K('EEX', 'exp10', { c: F, s: ['Sto ▸', 'stoarrow'], a: V('P') }), K('7', 'd7', { c: N, s: ['List', 'list'], a: V('Q') }), K('8', 'd8', { c: N, s: ['{ }', 'ins:{'], a: V('R') }), K('9', 'd9', { c: N, s: ['Matrix', 'matmenu'], a: V('S') }), K('÷', 'div', { c: N, s: ['<i>x</i>⁻¹', 'inv'], a: V('T') }),
          K('ALPHA', 'alpha', { c: 'alpha sm' }), K('4', 'd4', { c: N, s: ['Matrix', 'matmenu'], a: V('U') }), K('5', 'd5', { c: N, s: ['[ ]', 'ins:['], a: V('V') }), K('6', 'd6', { c: N, s: ['≤≥≠', 'ins:≠'], a: V('W') }), K('×', 'mul', { c: N, s: ['∠', 'noop'], a: V('X') }),
          K('Shift', 'shift', { c: 'shift sm' }), K('1', 'd1', { c: N, s: ['Program', 'prgm'], a: V('Y') }), K('2', 'd2', { c: N, s: ['<i>i</i>', 'i'], a: V('Z') }), K('3', 'd3', { c: N, s: ['π', 'pi'], a: ['#', 'noop'] }), K('−', 'sub', { c: N, s: ['Base', 'basemenu'] }),
          K('On', 'onac', { c: F, s: ['Off', 'off'] }), K('0', 'd0', { c: N, s: ['Notes', 'msg:Notes not available'] }), K('.', 'dot', { c: N, s: ['=', 'eq'] }), K('␣', 'noop', { c: N, s: ['_', 'noop'] }), K('+', 'add', { c: N, s: ['Ans', 'ans'] }) ] },
      ],
      notes: 'Colour graphing model with Home view (textbook entry, ≈ result alongside exact), Apps (Function, Statistics 2Var, Solve, Linear Solver, Matrix, Distributions, Base), Symb (function list F1–F6), Plot, Num (table), View (zoom), Toolbox (math menu) and Vars. The CAS view, Help, Notes and programming are not simulated (CAS key shows a notice).',
    };
  }

  // =====================================================================
  //  Touchpad CAS-style (#17 #21)
  // =====================================================================
  function tpadModel(id, name, blue) {
    const F = 'fn sm', N = 'num', L = (c) => K(c, 'var:' + c, { c: 'fn xs alk' });
    return {
      id, name, app: 'graph', w: 360, cls: 'graph tpad',
      theme: { body: blue ? 'linear-gradient(90deg,#2b5f9a 0 6%,#f4f5f7 6% 94%,#2b5f9a 94%)' : 'linear-gradient(#f7f8fa,#dfe1e5)', cls: 'th-ns', vars: { '--bezel': '#e6e8ec', '--key': '#ffffff', '--kt': '#222', '--knum': '#ffffff', '--knt': '#222', '--kop': '#ffffff', '--kopt': '#222', '--kexe': '#ffffff', '--kexet': '#222', '--kshift': '#ffffff', '--kshiftt': '#222', '--kalpha': '#2a73c8', '--kalphat': '#fff', '--ls': '#2a73c8', '--la': '#2a73c8', '--pad': '#d3d6dc', '--padt': '#333', '--kr': '7px' } },
      display: { kind: 'gcolor', cls: 'tpad', w: 300, h: 226 },
      cfg: { gfam: 'tpad', mono: false, W: 320, H: 210, lines: 7, natural: true, shiftName: 'ctrl', xName: 'x', fnames: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'], yArg: true, axisLabels: true, approxToo: false, homeTitle: 'Scratchpad',
        appItems: [['Calculator', '√x', '#2c7fd0', 'run'], ['Graphs', '📈', '#2c9c5a', 'graph'], ['Lists & Spreadsheet', '▦', '#e0703a', 'stat'], ['Solver', 'x=?', '#c43d6a', 'solve'], ['Equations', 'EQ', '#7a5cc4', 'eqn'], ['Matrix', '[ ]', '#4a8fa8', 'matrix'], ['Distributions', 'Dist', '#b38b22', 'dist'], ['Settings', '⚙', '#555', 'settings']], gridCols: 4 },
      sections: [
        { cols: '1fr 2.2fr 1fr', cls: 'ktop', kc: F, keys: [
          K('esc', 'quit'), PAD('ring', { r: 3, center: ['', 'exe'] }), K('⌂ on', 'apps', { s: ['off', 'off'] }),
          K('🗒', 'quit', { tip: 'Scratchpad' }), K('doc', 'apps', { s: ['+page', 'noop'] }),
          K('tab', 'down'), K('menu', 'mathmenu', { s: ['context', 'optn'] }) ] },
        { cols: 4, kc: F, keys: [K('ctrl', 'shift', { c: 'alpha sm' }), K('shift', 'noop', { tip: 'Capitals' }), K('var', 'vars', { s: ['sto→', 'stoarrow'] }), K('del', 'del', { s: ['clear', 'clear'] })] },
        { cols: 7, keys: [
          K('=', 'eq', { c: F, s: ['≠≥▸', 'ins:≠'] }), K('trig', 'sin', { c: F, s: ['sin⁻¹', 'asin'], tip: 'sin (trig palette simplified)' }), K('7', 'd7', { c: N }), K('8', 'd8', { c: N }), K('9', 'd9', { c: N }), K('▭▭', 'frac', { c: F, s: ['∞β°', 'dms'] }), K('📖', 'catalog', { c: F, s: ['Σ', 'sigma'] }),
          K('^', 'pow', { c: F, s: ['<sup>n</sup>√', 'nroot'] }), K('<i>x</i>²', 'sq', { c: F, s: ['√', 'sqrt'] }), K('4', 'd4', { c: N }), K('5', 'd5', { c: N }), K('6', 'd6', { c: N }), K('×', 'mul', { c: F, s: ['""', 'noop'] }), K('÷', 'div', { c: F, s: ['⁄', 'frac'] }),
          K('<i>e</i><sup><i>x</i></sup>', 'epow', { c: F, s: ['ln', 'ln'] }), K('10<sup><i>x</i></sup>', 'pow10', { c: F, s: ['log', 'log'] }), K('1', 'd1', { c: N }), K('2', 'd2', { c: N }), K('3', 'd3', { c: N }), K('+', 'add', { c: F }), K('−', 'sub', { c: F }),
          K('(', 'lp', { c: F, s: ['[ ]', 'ins:['] }), K(')', 'rp', { c: F, s: ['{ }', 'ins:{'] }), K('0', 'd0', { c: N }), K('.', 'dot', { c: N, s: ['capture', 'noop'] }), K('(−)', 'neg', { c: N, s: ['ans', 'ans'] }), K('enter', 'exe', { c: F, w: 2, s: ['≈', 'todec'] }) ] },
        { cols: 9, cls: 'alpha9', keys: [
          K('EE', 'exp10', { c: 'fn xs alk' }), ...'ABCDEFG'.split('').map(L), K('?!▸', 'noop', { c: 'fn xs alk' }),
          K('π▸', 'pi', { c: 'fn xs alk' }), ...'HIJKLMN'.split('').map(L), K('⚑', 'noop', { c: 'fn xs alk' }),
          K(',', 'comma', { c: 'fn xs alk' }), ...'OPQRSTU'.split('').map(L), K('↵', 'exe', { c: 'fn xs alk' }),
          ...'VWXYZ'.split('').map(L), K('␣', 'noop', { c: 'fn xs alk', w: 2 }), sp(2) ] },
      ],
      notes: 'Touchpad CAS-style colour model: Scratchpad calculator with templates and history, documents home (⌂) with Graphs, Lists & Spreadsheet (statistics), Solver, Equations, Matrix, Distributions. Letter keys enter variables A–Z directly. The trig key types sin (ctrl gives sin⁻¹; cos/tan via the menu). Symbolic CAS algebra, documents/pages, Python and the touchpad gestures are simplified (the touchpad works as a cursor pad, its centre as Enter).',
    };
  }

  // =====================================================================
  //  Round-key white colour graphing (#20 #30 #36)
  // =====================================================================
  function nwModel(id, name) {
    const F = 'fn sm', N = 'num';
    return {
      id, name, app: 'graph', w: 340, cls: 'graph nw',
      theme: { body: 'linear-gradient(#fdfdfd,#e8e9ec)', cls: 'th-nw', vars: { '--bezel': '#f4f4f6', '--key': '#f2f3f5', '--kt': '#333', '--knum': '#ffffff', '--knt': '#222', '--kop': '#ffffff', '--kopt': '#222', '--kexe': '#ffffff', '--kexet': '#222', '--kshift': '#f2f3f5', '--kshiftt': '#e0a020', '--kalpha': '#f2f3f5', '--kalphat': '#666', '--ls': '#e0a020', '--la': '#888', '--pad': '#e7e8eb', '--padt': '#444', '--kr': '50%' } },
      display: { kind: 'gcolor', cls: 'nw', w: 290, h: 216 },
      cfg: { gfam: 'nw', mono: false, W: 320, H: 200, lines: 6, natural: true, shiftName: 'shift', xName: 'x', fnames: ['f', 'g', 'h', 'p', 'q', 'r'], yArg: true, axisLabels: true, approxToo: true, startGrid: true, gridCols: 3, homeTitle: 'Calculation',
        appItems: [['Calculation', '+−<br>×÷', '#f0a030', 'run'], ['Grapher', '📈', '#3a8fd8', 'graph'], ['Equations', 'x=?', '#c43d6a', 'eqn'], ['Statistics', '📊', '#2c9c5a', 'stat'], ['Probability', 'Dist', '#7a5cc4', 'dist'], ['Solver', 'f=0', '#4a8fa8', 'solve'], ['Matrices', '[ ]', '#b38b22', 'matrix'], ['Base', 'HEX', '#666', 'base'], ['Settings', '⚙', '#555', 'settings']] },
      sections: [
        { cols: '2fr 1fr 1fr', cls: 'ktop', kc: 'fn sm', keys: [
          PAD('cross', { r: 2 }), K('⌂', 'home', { c: 'fn sm homek', tip: 'Home' }), K('OK', 'exe', { tip: 'OK' }),
          K('↩', 'quit', { tip: 'Back' }), K('⏻', 'off', { c: 'fn sm powk', tip: 'Power' }) ] },
        { cols: 6, kc: F, keys: [
          K('shift', 'shift', { c: 'shift sm' }), K('alpha', 'alpha', { c: 'alpha sm' }), K('<i>x,n,t</i>', 'varx', { s: ['cut', 'noop'], a: [':', 'colon'] }), K('var', 'vars', { s: ['copy', 'noop'], a: [';', 'noop'] }), K('toolbox', 'mathmenu', { s: ['paste', 'entry'], a: ['"', 'noop'] }), K('⌫', 'del', { s: ['clear', 'clear'], a: ['%', 'noop'] }),
          K('<i>e</i><sup><i>x</i></sup>', 'epow', { s: ['[', 'ins:['], a: V('A') }), K('ln', 'ln', { s: [']', 'ins:]'], a: V('B') }), K('log', 'log', { s: ['{', 'ins:{'], a: V('C') }), K('<i>i</i>', 'i', { s: ['}', 'ins:}'], a: V('D') }), K(',', 'comma', { s: ['_', 'noop'], a: V('E') }), K('<i>x</i><sup><i>y</i></sup>', 'pow', { s: ['→', 'stoarrow'], a: V('F') }),
          K('sin', 'sin', { s: ['asin', 'asin'], a: V('G') }), K('cos', 'cos', { s: ['acos', 'acos'], a: V('H') }), K('tan', 'tan', { s: ['atan', 'atan'], a: V('I') }), K('π', 'pi', { s: ['=', 'eq'], a: V('J') }), K('√', 'sqrt', { s: ['<', 'noop'], a: V('K') }), K('<i>x</i>²', 'sq', { s: ['>', 'noop'], a: V('L') }) ] },
        { cols: 5, keys: [
          K('7', 'd7', { c: N, a: V('M') }), K('8', 'd8', { c: N, a: V('N') }), K('9', 'd9', { c: N, a: V('O') }), K('(', 'lp', { c: N, a: V('P') }), K(')', 'rp', { c: N, a: V('Q') }),
          K('4', 'd4', { c: N, a: V('R') }), K('5', 'd5', { c: N, a: V('S') }), K('6', 'd6', { c: N, a: V('T') }), K('×', 'mul', { c: N, a: V('U') }), K('÷', 'div', { c: N, a: V('V') }),
          K('1', 'd1', { c: N, a: V('W') }), K('2', 'd2', { c: N, a: V('X') }), K('3', 'd3', { c: N, a: V('Y') }), K('+', 'add', { c: N, a: V('Z') }), K('−', 'sub', { c: N, a: ['␣', 'noop'] }),
          K('0', 'd0', { c: N, a: ['?', 'noop'] }), K('.', 'dot', { c: N, a: ['!', 'fact'] }), K('×10<sup><i>x</i></sup>', 'exp10', { c: N }), K('Ans', 'ans', { c: N }), K('EXE', 'exe', { c: N }) ] },
      ],
      notes: 'Round-key colour graphing model. Starts on the app grid (Calculation, Grapher, Equations, Statistics, Probability, Solver, Matrices, Base, Settings); ⌂ returns to it, ↩ goes back, OK/EXE select. Grapher has f/g/h… expressions, graph with zoom & trace, and a table. Toolbox is the math catalogue. Python, sequences and regression model choice beyond linear/quadratic/exponential are not simulated; cut/copy are no-ops (paste re-inserts the last entry).',
    };
  }
  G.__M4b = { cgxModel, tpadModel, nwModel };
})(window);

// =====================================================================
//  The list of all 45 calculators
// =====================================================================
(function (G) {
  'use strict';
  const M = Object.assign({}, G.__M1, G.__M2, G.__M3, G.__M4a, G.__M4b);
  const GROUPS = {
    sciNat:  { n:1, name:'Scientific – natural display', desc:'Multi-line textbook LCD with fractions, roots and exact results.', use:'Algebra, calculus homework and exam-style natural entry.', nameColor:'#00E5FF', descColor:'#FFEB3B', useColor:'#76FF03' },
    compact: { n:2, name:'Scientific – compact pocket', desc:'Slim pocket scientific with classic two-line dot-matrix display.', use:'Everyday portable math on the go.', nameColor:'#FF1744', descColor:'#00E676', useColor:'#FFEA00' },
    oneline: { n:3, name:'Scientific – classic one-line', desc:'Traditional one-line segment display with algebraic entry.', use:'Quick trig, logs and schoolwork in classic style.', nameColor:'#FF9100', descColor:'#00B0FF', useColor:'#E040FB' },
    rpn:     { n:4, name:'Scientific – RPN', desc:'Stack-based Reverse Polish Notation scientific engines.', use:'Fast chain calculations for engineers and power users.', nameColor:'#76FF03', descColor:'#FF4081', useColor:'#40C4FF' },
    fin:     { n:5, name:'Financial', desc:'Business and financial calculators with TVM and cash-flow tools.', use:'Loans, investments, amortization and business analysis.', nameColor:'#FFD600', descColor:'#18FFFF', useColor:'#FF6E40' },
    gmono:   { n:6, name:'Graphing – monochrome', desc:'Pixel LCD graphing with function plots, tables and apps.', use:'Algebra II, precalc and standardized-test graphing.', nameColor:'#B388FF', descColor:'#69F0AE', useColor:'#FFAB40' },
    gcolor:  { n:7, name:'Graphing – colour', desc:'Full-color graphing and CAS-style models with rich apps.', use:'Advanced math, CAS, statistics and classroom demos.', nameColor:'#F50057', descColor:'#AEEA00', useColor:'#00E5FF' },
    desk:    { n:8, name:'Desk – printing', desc:'Wide desk adding-machine style with paper-tape simulation.', use:'Bookkeeping, totaling and desk-side arithmetic.', nameColor:'#FF6D00', descColor:'#EEFF41', useColor:'#7C4DFF' },
  };
  function groupLabel(g) { const x = GROUPS[g]; return x && typeof x === 'object' ? x.name : x; }
  const L = [
    [1, 'Complex-Number Engineering Scientific (teal)', 'sciNat', (id, n) => G.specModel('cplx')(id, n)],
    [2, 'Graphing Monochrome (dark slate)', 'gmono', (id, n) => M.tiModel(id, n, false)],
    [3, 'Compact Pocket Scientific (black, blue AC)', 'compact', M.compact3],
    [4, 'RPL Object-Stack Scientific (graphite)', 'rpn', (id, n) => G.specModel('rpl')(id, n)],
    [5, 'Touch-Screen Color Graphing (white)', 'gcolor', M.cpModel],
    [6, 'Scientific Natural-Display Solar (silver/violet)', 'sciNat', (id, n) => M.esModel(id, n, 'a', M.TH_ES_SILVER)],
    [7, 'Graphing Monochrome (silver edition)', 'gmono', (id, n) => M.tiModel(id, n, true)],
    [8, 'Scientific High-Res Natural (black)', 'sciNat', (id, n) => M.exModel(id, n, false)],
    [9, 'Financial Business Analyst', 'fin', M.baModel],
    [10, 'RPN Scientific Programmable (black, yellow shift)', 'rpn', M.rpn42Model],
    [11, 'Polar & Parametric Grapher (polar grid)', 'gcolor', (id, n) => G.specModel('polpar')(id, n)],
    [12, 'One-Line Scientific with 3rd/2nd (solar, silver)', 'oneline', M.ti36Model],
    [13, 'Multi-Line Textbook Scientific (black/orange)', 'sciNat', M.wvModel],
    [14, 'Scientific Natural-Display Icon-Key Generation (black)', 'sciNat', M.cwModel],
    [15, 'Financial RPN (landscape, gold/black)', 'fin', (id, n) => M.rpn12Model(id, n, false)],
    [16, 'Color CAS Graphing (all dark)', 'gcolor', (id, n) => M.cgxModel(id, n, true)],
    [17, 'Color CAS Graphing with Touchpad (white)', 'gcolor', (id, n) => M.tpadModel(id, n, false)],
    [18, 'Scientific High-Res Natural (white)', 'sciNat', (id, n) => M.exModel(id, n, true)],
    [19, 'Exact-Fraction RPN Scientific (walnut)', 'rpn', (id, n) => G.specModel('ratn')(id, n)],
    [20, 'Color Graphing (white, round keys)', 'gcolor', M.nwModel],
    [21, 'Statistics Plotting Grapher (cream/teal)', 'gcolor', (id, n) => G.specModel('splot')(id, n)],
    [22, 'RPN Scientific Programmable (2-line, black)', 'rpn', M.rpn35Model],
    [23, 'Classic One-Line Scientific (textured black)', 'oneline', M.fx82Model],
    [24, 'Color Graphing with F-keys (black)', 'gcolor', (id, n) => M.fkeyModel(id, n, true)],
    [25, 'Matrix & Vector Scientific (steel blue)', 'sciNat', (id, n) => G.specModel('matx')(id, n)],
    [26, 'Programmer Base-N Scientific (terminal green)', 'sciNat', (id, n) => G.specModel('prog')(id, n)],
    [27, 'Color CAS Graphing (II)', 'gcolor', (id, n) => M.cgxModel(id, n, false)],
    [28, 'Fraction & Units One-Line (paper white)', 'oneline', (id, n) => G.specModel('frac1')(id, n)],
    [29, 'Scientific Natural-Display Solar (white)', 'sciNat', M.w29Model],
    [30, 'Sequence & Recursion Grapher (cobweb)', 'gcolor', (id, n) => G.specModel('seqg')(id, n)],
    [31, 'Multi-View Scientific (blue-grey)', 'sciNat', M.mvModel],
    [32, 'Monochrome Graphing with F-keys (white/violet)', 'gmono', (id, n) => M.fkeyModel(id, n, false)],
    [33, 'Printing Desk Calculator (black, two-color print)', 'desk', (id, n) => M.printModel(id, n, false)],
    [34, 'Scientific Natural-Display (white/violet, replay pad)', 'sciNat', M.m34Model],
    [35, 'Advanced Multi-View Scientific (black/orange)', 'sciNat', M.proModel],
    [36, 'Implicit Relation & Inequality Grapher', 'gcolor', (id, n) => G.specModel('impl')(id, n)],
    [37, 'Navigation & Flight Computer RPN (aviation)', 'rpn', (id, n) => G.specModel('navt')(id, n)],
    [38, 'Printing Desk Calculator Heavy-Duty (white)', 'desk', (id, n) => M.printModel(id, n, true)],
    [39, '3-D Surface Grapher (purple night)', 'gcolor', (id, n) => G.specModel('surf')(id, n)],
    [40, 'Calculus Visualiser Monochrome (grey)', 'gmono', (id, n) => G.specModel('calc')(id, n)],
    [41, 'Compact Pocket Scientific (black, green DEL/AC)', 'compact', M.compact41],
    [42, 'Statistics Data-Editor Scientific (orange)', 'sciNat', (id, n) => G.specModel('stat')(id, n)],
    [43, 'Differential-Equation Grapher (navy chart)', 'gcolor', (id, n) => G.specModel('odeg')(id, n)],
    [44, 'Scientific Natural-Display (navy/violet)', 'sciNat', (id, n) => M.esModel(id, n, 'b', M.TH_ES_NAVY)],
    [45, 'Financial RPN (landscape, platinum)', 'fin', (id, n) => M.rpn12Model(id, n, true)],
  ];
  const cache = {};
  G.CALC_GROUPS = GROUPS;
  G.groupLabel = groupLabel;
  G.CALC_LIST = L.map(([id, name, group]) => ({ id, name, group, groupName: groupLabel(group) }));
  G.getCalcModel = function (id) {
    if (cache[id]) return cache[id];
    const e = L.find(x => x[0] === id); if (!e) return null;
    const m = e[3](id, e[1]); m.id = id; m.name = e[1]; m.group = e[2]; m.groupName = groupLabel(e[2]);
    if (id === 6) m.cls += ' v' + id;
    return (cache[id] = m);
  };
})(window);
