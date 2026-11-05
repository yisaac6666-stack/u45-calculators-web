/* =====================================================================
 * U-45 CALCULATORS — feature catalogue (30+ features per calculator)
 *
 * Each feature carries a status so nothing is over-claimed:
 *   'live' – wired to the simulated engine and working now
 *   'ui'   – app / UI capability (numbering, colours, zoom, copy, offline …)
 *   'plan' – realistic add-on for this calculator type that is NOT simulated
 *            yet (documented as roadmap; the key may show a notice).
 * Features of kind 'live' that depend on a key are only listed when the
 * calculator's keyboard actually carries that action (checked from the model).
 * ===================================================================== */
(function (G) {
  'use strict';

  // ---- capability pool: [acts that enable it, text] -------------------
  const POOL = [
    [['frac'], 'Fraction template ▭/▭ with exact fraction results'],
    [['mixed'], 'Mixed-number entry (a b/c) and improper ↔ mixed conversion'],
    [['sd', 'todec', 'mixedtoggle', 'fd', 'dc'], 'S⇔D / F⇔D toggle between exact (fraction, √, π) and decimal answers'],
    [['sqrt'], 'Square root √'], [['cbrt'], 'Cube root ∛'], [['nroot', 'root', 'xroot'], 'Any-index root ˣ√y'],
    [['sq'], 'Square x²'], [['cube'], 'Cube x³'], [['inv'], 'Reciprocal x⁻¹ (1/x)'],
    [['pow', 'ypow'], 'Power xʸ / ^ with right-to-left chaining (2^3^2 = 512)'],
    [['log'], 'Common logarithm log₁₀'], [['ln'], 'Natural logarithm ln'],
    [['logab'], 'Logarithm to any base logₐb'], [['pow10'], 'Antilog 10ˣ'], [['epow'], 'Exponential eˣ'],
    [['sin', 'cos', 'tan'], 'Trigonometry sin / cos / tan honouring the current angle unit'],
    [['asin', 'acos', 'atan'], 'Inverse trigonometry sin⁻¹ / cos⁻¹ / tan⁻¹ with domain checking (Math ERROR outside −1…1)'],
    [['hyp', 'hypflag'], 'Hyperbolic sinh / cosh / tanh and their inverses via hyp'],
    [['drg', 'drgcycle', 'drgconv', 'angle'], 'Angle units DEG / RAD / GRA with unit-suffix conversion (°, ʳ, ᵍ)'],
    [['dms', 'todms', 'fromdms'], 'Sexagesimal ° ′ ″ entry and decimal ↔ DMS conversion'],
    [['pol', 'r2p'], 'Rectangular → polar conversion Pol(x,y) → r, θ'], [['rec', 'pr'], 'Polar → rectangular conversion Rec(r,θ) → x, y'],
    [['fact'], 'Factorial x! (exact up to 69!)'], [['npr', 'perm'], 'Permutations nPr'], [['ncr', 'comb'], 'Combinations nCr'],
    [['ran'], 'Random number Ran# (0 ≤ r < 1)'], [['ranint'], 'Random integer RanInt#(a,b)'],
    [['rnd', 'round'], 'Rnd — round the value to the displayed precision'],
    [['abs'], 'Absolute value |x|'], [['pct', 'pctt'], 'Percent key (x %, add-on and discount chains)'],
    [['pctch', 'dpct'], 'Percent change Δ% between two values'],
    [['pi'], 'π constant to full internal precision'], [['e'], 'Euler e constant'],
    [['exp10', 'exp', 'eex'], 'Scientific-notation entry ×10ˣ / EXP / EEX'],
    [['neg', 'chs'], 'Sign change (−) / +/− / CHS'],
    [['eng', 'engmode'], 'Engineering notation ENG (exponent multiple of 3)'], [['engl'], 'ENG← shift the exponent the other way'],
    [['ans', 'answer'], 'Ans recall of the last result; operators auto-insert Ans'],
    [['sto', 'stoarrow', 'min'], 'Store a value into memory / a variable (STO, sto▸, →, Min)'],
    [['rcl', 'recall', 'mr'], 'Recall memory / variables (RCL, MR, recall)'],
    [['mplus'], 'Independent memory M+'], [['mminus'], 'Independent memory M−'],
    [['var:A', 'varx', 'varcycle'], 'Named variables (A–F, X, Y, M … or A–Z) usable inside expressions'],
    [['integ'], 'Numeric definite integral ∫ₐᵇ f(x)dx'], [['deriv'], 'Numeric derivative d/dx at a point'],
    [['sigma'], 'Summation Σ(f(x), x=a…b)'], [['calc'], 'CALC — evaluate a stored expression for new variable values'],
    [['solve', 'numsolve', 'solveapp'], 'SOLVE — numeric equation solver (Newton / bisection)'],
    [['tablemode', 'table'], 'TABLE — tabulate f(x) over start / end / step'],
    [['statmenu', 'statdata', 'stat', 'statmode1', 'sigplus'], 'Statistics: data entry, n, x̄, σ, s, Σx, Σx²'],
    [['statmode2', 'statmenu', 'stat'], 'Two-variable statistics and linear regression (a, b, r)'],
    [['matmenu'], 'Matrix mode: define, add, multiply, det, transpose, identity'], [['vctmenu'], 'Vector mode: dot and cross products, magnitude'],
    [['cmplxmenu', 'i', 'complex', 'cmplxi'], 'Complex numbers: i, arg, conjugate, Re / Im, polar ↔ rectangular'],
    [['basemenu', 'base:16', 'base:2'], 'BASE-N: DEC / HEX / BIN / OCT conversions'],
    [['and', 'logicmenu', 'basemenu'], 'Bitwise logic AND / OR / XOR / XNOR / NOT'],
    [['const'], 'Built-in scientific constants'], [['conv', 'convmenu', 'conv:2.54'], 'Unit conversions (length, mass, volume, temperature)'],
    [['polymenu'], 'Polynomial solver (quadratic / cubic roots, real and complex)'], [['sysmenu'], 'Linear systems solver (2×2, 3×3)'],
    [['mode', 'setup', 'settings'], 'MODE / SETUP: Fix / Sci / Norm display, angle unit, fraction format'],
    [['del', 'bksp', 'back'], 'Backspace / DEL editing of the current entry'], [['ins'], 'INS insert mode for editing in the middle of an expression'],
    [['up'], 'Replay ▲▼ — scroll back to previous calculations and re-edit them'],
    [['swap', 'xm', 'exc'], 'Exchange x ⇄ y / x ⇄ M'], [['k'], 'Constant calculations (K) on repeated operators'],
    [['fix'], 'FIX — fixed number of decimal places'],
    [['catalog'], 'CATALOG — alphabetical list of every function'], [['mathmenu'], 'MATH / Toolbox menu of templates and functions'],
    [['distmenu', 'prb'], 'Probability distributions (normal, binomial, Poisson) and PRB menu'],
  ];

  const APP = [
    ['ui', 'Every key numbered 1…N in reading order — matches the key map in the user manual'],
    ['ui', 'High-contrast 6-colour key groups (digits, operators, functions, memory, clear, modes) with a “Classic” toggle'],
    ['ui', 'Three bundled offline fonts: Oxanium (display/titles), Barlow Condensed (key faces), JetBrains Mono (key numbers & helpers)'],
    ['ui', 'Show / hide key numbers with one button (remembered between sessions)'],
    ['ui', 'Copy the current display text to the clipboard'],
    ['ui', 'Physical-keyboard shortcuts: digits, + − * / ^ ( ) . Enter Backspace Esc arrows, s c t l n r ! % e p q i'],
    ['ui', 'Fit / 1:1 zoom that never pushes keys off a phone screen'],
    ['ui', 'Reference photo viewer and tool-tip name on every key'],
    ['ui', 'Reset = fresh power-on state; works fully offline (PWA cache / Android APK)'],
  ];

  // ---- family-specific (engine) features -----------------------------
  const FAM = {
    es: { live: ['Natural textbook display: fractions, roots, powers, logs shown as printed', 'MODE: COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR', 'SHIFT / ALPHA one-shot modifiers with on-screen S / A indicators', 'Multi-statement entry with “:” separators', 'Math ERROR / Syntax ERROR screens with cursor jump to the error'],
      plan: ['Spreadsheet mode (5×45 cells with formulas)', 'Verify mode (true/false check of equations)', 'Ratio solver A:B = X:D', 'Inequality solver (ax²+bx+c > 0)', 'QR-code export of the current result', 'Prime factorisation FACT', 'Recurring-decimal display', 'Distribution PD / CD with inverse normal'] },
    ex: { live: ['High-resolution natural display with exact √ and π forms', 'MODE: COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR', 'S⇔D converts exact ↔ decimal on the last answer', 'SHIFT / ALPHA one-shot modifiers with S / A indicators', 'Multi-statement entry with “:” separators'],
      plan: ['Spreadsheet app', 'Verify (equation true/false)', 'Ratio solver', 'Inequality solver', 'QR-code result export', 'Prime factorisation', 'Recurring decimals', 'Inverse-normal distribution'] },
    cw: { live: ['Icon-key navigation: HOME (apps), ⚙ settings, ↩ back', 'VARIABLE menu for A–F, x, y and M', 'FUNCTION menu for user f(x) definitions', 'TOOLS menu (solver, table, statistics helpers)', 'FORMAT converts the last answer: decimal, fraction, ENG, sexagesimal'],
      plan: ['Spreadsheet app', 'Distribution app', 'Algorithm (flowchart) app', 'Math box: dice / coin simulation', 'QR-code export', 'Ratio app', 'Inequality app', 'Prime factorisation'] },
    wv: { live: ['Multi-line textbook display with history', 'D1 = CALC, D2 = SOLVE, D3 = TABLE direct keys', 'MATH menu of extra functions (GCD, LCM, mod, Int)', 'Π product operator and Σ summation', 'Base-N menu →HEX / →BIN / →OCT'],
      plan: ['Pentadecimal (→PEN) base', 'Drill / quiz mode for arithmetic practice', 'Simultaneous equations app', 'Complex-number app', 'Matrix app', 'Vector app', 'Normal distribution', 'Prime factorisation'] },
    w29: { live: ['Solar natural-display layout (white body)', 'MODE: COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR', 'SHIFT / ALPHA one-shot modifiers', 'Multi-statement entry “:”', 'Exact ↔ decimal S⇔D'],
      plan: ['Spreadsheet mode', 'Verify mode', 'Ratio solver', 'Inequality solver', 'QR export', 'Prime factorisation', 'Recurring decimals', 'Inverse normal'] },
    mv: { live: ['Four-line MultiView display with scrollable history', 'x / yzt / abc variable cycling key', 'sto▸ stores the result into the next variable', 'data / stat list editor with 1-var and 2-var statistics', 'prb menu: nPr, nCr, !, random'],
      plan: ['Constant (K) operator mode', 'Fraction simplification step-by-step', 'Number-line visual for inequalities', 'Teacher “reset to defaults” lock', 'Integer division with remainder (Q, r)', 'Percent-change shortcut', 'Factor finder', 'Exam-mode lock'] },
    pro: { live: ['Advanced MultiView display with history', 'Multi-tap keys cycle all printed functions (ln/log, eⁿ/10ⁿ, sin/cos/tan …)', '2nd: num-solv, poly-solv, sys-solv', 'Matrix, vector and complex menus', 'Hex digits A–F on keys in base-n mode'],
      plan: ['Function table with graph preview', 'Equation recall history', 'Physical constants by category', 'Unit-conversion favourites', 'Regression model choice (power, log)', 'Inferential statistics (t-test)', 'Exam-mode lock', 'Matrix inverse display as fractions'] },
    m34: { live: ['Natural display with replay pad', 'SHIFT functions printed under the digit keys', 'OPTN context menu', 'Numeric ∫ and d/dx templates', 'Engineering notation ENG / ENG←'],
      plan: ['Spreadsheet', 'Verify', 'Ratio', 'Inequality solver', 'QR export', 'Prime factorisation', 'Recurring decimals', 'Inverse normal'] },
    c3: { live: ['Compact two-line dot display', 'SHIFT 0 = ÷, SHIFT − = “=”, SHIFT + = Ans, SHIFT x² = √ (key-saving layout)', 'OPTN menu', 'Pol / Rec conversions', 'Physical keyboard / ) Enter fill in the missing keys'],
      plan: ['Statistics mode', 'Base-N mode', 'Equation solver', 'Fraction template', 'Memory M+ / M−', 'Table mode', 'Constants', 'Unit conversions'] },
    c41: { live: ['Pocket two-line display', 'S⇔D acts as “=” and fraction/decimal toggle', 'SHIFT functions printed under each key', 'Any-index root and x³', 'M+ independent memory'],
      plan: ['Statistics mode', 'Base-N mode', 'Equation solver', 'Table mode', 'Constants', 'Unit conversions', 'Replay history', 'Complex numbers'] },
    t36: { live: ['One-line AOS with 2nd and 3rd shifts', 'STAT1 / STAT2 with Σ+ / Σ− data entry (x⇄y separates pairs)', 'DEC / HEX / OCT / BIN with hex digits A–F on 3rd', 'Unit conversions ►cm/►in, ►L/►gal, ►kg/►lb, °F⇄°C', 'FIX, SCI, ENG, FLO display modes', 'Constant K operation', 'EXC memory exchange'],
      plan: ['Two-line display preview', 'Fraction simplify step', 'Complex mode', 'Regression ŷ / x̂ prediction', 'Physical constants list'] },
    fx82: { live: ['Classic one-line immediate-execution algebraic logic', 'MODE 0 COMP, MODE 2 SD statistics', 'MODE 4/5/6 = DEG / RAD / GRA, 7/8/9 = FIX / SCI / NORM', 'SD: M+ = DATA, SHIFT M+ = delete; x̄, σn, σn−1, Σx², Σx, n', 'a b/c fractions and d/c conversion', 'Constant calculations (K) on repeated operators', 'x ⇄ M exchange'],
      plan: ['Linear regression mode', 'Base-N mode', 'Replay', 'Equation solver', 'Two-line display'] },
    ba: { live: ['TVM: N, I/Y, PV, PMT, FV with CPT for the unknown', 'P/Y and C/Y payments / compounding per year', 'BGN / END annuity mode', 'AMORT schedule: principal, interest, balance for P1–P2', 'Cash flows CF0, Cnn with frequencies; NPV and IRR', 'DATA / STAT worksheet with LIN, LN, EXP, PWR regressions', 'BOND worksheet', 'DEPR straight-line', 'Δ% percent change', 'BRKEVN break-even', 'PROFIT cost / sell / margin', 'ICONV nominal ↔ effective rate', 'DATE days between dates', 'MEM ten memories', 'FORMAT decimals and date format', 'CLR TVM / CLR WORK'],
      plan: ['MIRR / NFV / payback', 'SYD, DB, DDB depreciation', 'Bond yield to call'] },
    r42: { live: ['RPN 4-level stack X Y Z T with LAST X', 'Two-line display (Y above X)', 'Soft-menu system with six menu keys: MODES, DISP, CLEAR, CONVERT, PROB, STAT, BASE, COMPLEX, SOLVER', 'STO / RCL registers 00–99 with arithmetic (STO + 05)', 'R↓ roll-down and x⇄y', 'SHOW full-precision display', 'Σ+ / Σ− statistics'],
      plan: ['Keystroke programming', 'Matrix editor', '∫f(x) integration', 'ALPHA strings', 'Flags'] },
    r35: { live: ['RPN stack with 2-line (Y over X) display', 'Yellow / blue shifts', 'Numbered menus: MODE, DISPLAY, CLEAR, BASE, LOGIC, L.R., SUMS, s,σ, INTG, PROB', 'Complex i entry', '→HR / →RAD conversions', 'Linear regression ŷ, x̂, r', 'SHOW full precision'],
      plan: ['Equation list', 'Programs', 'SOLVE', '∫ integration', 'Unit conversions (°F, lb)'] },
    r12: { live: ['Landscape financial RPN with 4-level stack', 'TVM n, i, PV, PMT, FV (enter + key; key alone computes)', 'g 12× / 12÷ monthly conversions', 'BEG / END', 'CF0, CFj, Nj with NPV / IRR', 'AMORT schedule', 'INT simple interest', 'Dates D.MY / M.DY, DATE, ΔDYS', 'Depreciation SL / SOYD / DB', 'Statistics Σ+, x̄, s, ŷ,r, x̂,r, x̄w', 'f + digit sets decimals', 'f CLEAR Σ / FIN / REG / PREFIX', '%T and Δ%'],
      plan: ['PRICE / YTM bond functions', 'Keystroke programming', 'Continuous memory snapshot'] },
    print: { live: ['On-screen paper tape with negative values in red', 'Adding-machine logic +=, −=, ✱ total, ◇ subtotal', 'Item count IT', 'Memory M+ M− M◇ M✱', 'Grand total G✱', 'MU / MD mark-up / mark-down', 'COST / SELL / MAR margin', 'TAX+ / TAX− (rate via ▲▼, default 8 %)', 'Δ% change', 'Decimal slide F 4 3 2 1 0 ADD2', 'Rounding slide UP / 5/4 / CUT', 'Non-add # / date print', 'REPRINT and FEED', 'TIME / DATE from system clock', '00 / 000 fast-zero keys'],
      plan: ['Currency conversion', 'Tape export to PDF / CSV'] },
    ti: { live: ['Home screen with history', 'Y= editor Y1–Y6', 'WINDOW', 'ZOOM In / Out / Standard / Trig / Fit / Decimal / Square', 'TRACE', 'TABLE with TBLSET', '2nd CALC: value, zero, minimum, maximum, intersect, dy/dx, ∫f(x)dx', 'STAT list editor, 1-Var / 2-Var, linear / quadratic / exponential regression', 'STAT PLOT scatter', 'MATH menu: fractions, ∛, abs, round, nDeriv, fnInt', 'MATRIX', 'DISTR normal / binomial / Poisson', 'ALPHA SOLVE numeric solver', 'Variables A–Z and θ'],
      plan: ['Programs (PRGM)', 'LINK transfer', 'List literals {…}'] },
    fx: { live: ['Icon MAIN MENU: Run-Matrix, Statistics, Graph, Table, Equation, Matrix, Distribution, Base-N, System', 'F1–F6 soft keys', 'SHIFT F1–F6: Trace, Zoom, V-Window, Sketch, G-Solv, G↔T', 'G-Solv: root, max, min, intersect, ∫dx', 'Equation app (simultaneous / polynomial)', 'Statistics lists with regressions', 'Distribution app', 'Base-N app', 'OPTN / VARS menus', 'Variables A–Z, r, θ'],
      plan: ['Programs', 'e-Activity', 'Spreadsheet', 'CAPTURE / CLIP / PASTE'] },
    cp: { live: ['Touch-screen menu bar and tappable app icons', 'On-screen soft keyboard (Keyboard key) with functions, templates, variables', 'Main (numeric) application with history', 'Graph & Table', 'Statistics', 'Equation solving (numeric)', 'Variables x, y, z on hard keys', 'Numeric Solver app', 'Matrix app', 'Distribution app'],
      plan: ['Symbolic CAS algebra (solve, factor, expand)', 'Geometry app', 'eActivity', 'Spreadsheet', 'Stylus drawing'] },
    cgx: { live: ['Home view with textbook entry and ≈ result alongside exact', 'Apps: Function, Statistics 2Var, Solve, Linear Solver, Matrix, Distributions, Base', 'Symb view (F1–F6 function list)', 'Plot view with zoom', 'Num view (table)', 'Toolbox math menu', 'Vars menu', 'Variables A–Z'],
      plan: ['CAS view', 'Help system', 'Notes', 'Programming', 'Geometry app'] },
    tpad: { live: ['Scratchpad calculator with templates and history', 'Documents home ⌂ with Graphs, Lists & Spreadsheet (statistics), Solver, Equations, Matrix, Distributions', 'Letter keys enter variables A–Z directly', 'Touchpad works as a cursor pad, centre = Enter', 'Template menu (fractions, roots, Σ)', 'Graph with trace'],
      plan: ['Symbolic CAS algebra', 'Documents / pages', 'Python', 'Touchpad gestures', 'Geometry'] },
    nw: { live: ['App grid home: Calculation, Grapher, Equations, Statistics, Probability, Solver, Matrices, Base, Settings', '⌂ home and ↩ back keys, OK / EXE select', 'Grapher with f/g/h expressions, zoom, trace and table', 'Toolbox math catalogue', 'Linear / quadratic / exponential regression', 'Paste re-inserts the last entry', 'Variables A–Z via alpha'],
      plan: ['Python scripts', 'Sequences app', 'More regression models', 'Cut / copy clipboard'] },
  };

  // generic roadmap items by engine (to reach 30+ with honest proposals)
  const PLAN_BY_APP = {
    sci: ['Exam mode (locks memory & shows indicator)', 'Answer history export to text', 'Speech read-out of results', 'Colour-blind safe key theme', 'Custom shortcut keys'],
    aos: ['Answer history export', 'Speech read-out of results', 'Colour-blind key theme', 'Exam lock', 'Custom shortcut keys'],
    fin: ['Loan-comparison side-by-side', 'Amortisation table export (CSV)', 'Inflation-adjusted returns', 'Currency formatting by locale', 'Speech read-out of results'],
    rpn42: ['Stack history view (8 levels)', 'Undo last operation', 'Program library import', 'Speech read-out', 'Colour-blind key theme'],
    rpn35: ['Stack history view', 'Undo', 'Equation library', 'Speech read-out', 'Colour-blind key theme'],
    rpn12: ['Amortisation export (CSV)', 'Loan comparison', 'Undo', 'Speech read-out', 'Colour-blind key theme'],
    print: ['Tape search / filter', 'Tape save & reload', 'Speech read-out', 'Colour-blind theme', 'Custom tax presets'],
    graph: ['Graph image export (PNG)', 'Shareable function list link', 'Dark screen theme', 'Speech read-out of values', 'Exam mode'],
  };

  function actsOf(model) {
    const s = new Set();
    (model.sections || []).forEach(sec => (sec.keys || []).forEach(k => {
      if (k.act) s.add(k.act);
      ['s', 'a', 'b', 't', 'u'].forEach(x => { if (k[x] && k[x][1]) s.add(k[x][1]); });
      if (k.pad) { s.add('up'); s.add('left'); }
    }));
    if (model.app === 'graph') {
      ['table', 'stat'].forEach(a => s.add(a));
      const map = { solve: 'solveapp', matrix: 'matmenu', dist: 'distmenu', base: 'basemenu' };
      ((model.cfg || {}).appItems || []).forEach(it => { if (map[it[3]]) s.add(map[it[3]]); });
    }
    // ▲▼ are worksheet / menu / tax-rate keys on these engines, not replay
    if (['print', 'fin', 'rpn12', 'rpn42', 'rpn35', 'aos'].includes(model.app)) s.delete('up');
    return s;
  }
  function familyOf(model) {
    const c = ' ' + (model.cls || '') + ' ';
    const order = ['pro', 'w29', 'm34', 'c3', 'c41', 't36', 'fx82', 'ba', 'r42', 'r35', 'r12', 'print', 'cgx', 'tpad', 'nw', 'cp', 'ti', 'fx', 'mv', 'wv', 'cw', 'ex', 'es'];
    for (const f of order) if (c.includes(' ' + f + ' ')) return f;
    return 'es';
  }
  /** Returns [{st:'live'|'ui'|'plan', t:text}] — always ≥ 30 entries. */
  function featuresFor(model) {
    if (model._features) return model._features;
    const out = [], seen = new Set();
    const add = (st, t) => { if (!seen.has(t)) { seen.add(t); out.push({ st, t }); } };
    if (model.specFeatures) {   // v1.3 calculators: every feature listed by the definition is implemented
      model.specFeatures.forEach(t => add('live', t));
      APP.forEach(([st, t]) => add(st, t));
      (PLAN_BY_APP[model.app === 'specgraph' ? 'graph' : model.app === 'specrpn' ? 'rpn35' : 'sci']).forEach(t => add('plan', t));
      model._features = out;
      return out;
    }
    const acts = actsOf(model), fam = FAM[familyOf(model)] || { live: [], plan: [] };
    fam.live.forEach(t => add('live', t));
    POOL.forEach(([req, t]) => { if (req.some(a => acts.has(a))) add('live', t); });
    APP.forEach(([st, t]) => add(st, t));
    fam.plan.forEach(t => add('plan', t));
    (PLAN_BY_APP[model.app] || PLAN_BY_APP.sci).forEach(t => add('plan', t));
    model._features = out;
    return out;
  }
  G.CalcFeatures = { featuresFor, familyOf, actsOf, POOL, FAM, APP };
})(typeof window !== 'undefined' ? window : globalThis);
