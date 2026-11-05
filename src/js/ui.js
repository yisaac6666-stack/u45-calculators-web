/* calc45 UI core: key/keypad builder, display helpers (natural textbook, 7-segment), input editor. */
(function (G) {
  'use strict';
  const E = G.CalcEngine;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // ---------- key helpers for model specs ----------
  // k(face, action, {s:[label,action], a:[label,action], b:[label,action] (base-n), u:[label, action] (under-face label, e.g. g-shift), c:'class', w:colspan, r:rowspan, kb:'keyboard key(s)'})
  function k(face, act, o) { return Object.assign({ face, act }, o || {}); }
  const sp = (w) => ({ spacer: true, w: w || 1 });

  // ---------- Editor: token list with templates ----------
  // token: {d: display html, s: source} | {tpl:'frac'|..., role:'open'|'sep'|'close'}
  const TPL = {
    frac: { n: 2, src: (f) => '((' + f[0] + ')/(' + f[1] + '))' },
    mixed: { n: 3, src: (f) => '((' + f[0] + ')+(' + f[1] + ')/(' + f[2] + '))' },
    sqrt: { n: 1, src: (f) => 'sqrt(' + f[0] + ')' },
    pow: { n: 1, src: (f) => '^(' + f[0] + ')' },
    nroot: { n: 2, src: (f) => 'nroot((' + f[0] + '),(' + f[1] + '))' },
    logab: { n: 2, src: (f) => 'logab((' + f[0] + '),(' + f[1] + '))' },
    integ: { n: 3, src: (f) => 'integ((' + f[0] + '),(' + f[1] + '),(' + f[2] + '))' },
    deriv: { n: 2, src: (f) => 'deriv((' + f[0] + '),(' + f[1] + '))' },
    sigma: { n: 3, src: (f) => 'sigma((' + f[0] + '),(' + f[1] + '),(' + f[2] + '))' },
    prod: { n: 3, src: (f) => 'prodf((' + f[0] + '),(' + f[1] + '),(' + f[2] + '))' },
    abs: { n: 1, src: (f) => 'abs(' + f[0] + ')' },
    pow10: { n: 1, src: (f) => 'pow10(' + f[0] + ')' },
    epow: { n: 1, src: (f) => 'exp(' + f[0] + ')' },
  };
  class Editor {
    constructor() { this.t = []; this.c = 0; this.insert = true; }
    clear() { this.t = []; this.c = 0; }
    get empty() { return this.t.length === 0; }
    put(tok) { // insert/overwrite simple token
      if (!this.insert && this.c < this.t.length && !this.t[this.c].tpl) this.t.splice(this.c, 1, tok); else this.t.splice(this.c, 0, tok);
      this.c++;
    }
    tpl(name, grabPrev) {
      const n = TPL[name].n; const toks = [{ tpl: name, role: 'open' }];
      for (let i = 1; i < n; i++) toks.push({ tpl: name, role: 'sep' });
      toks.push({ tpl: name, role: 'close' });
      let grabbed = [];
      if (grabPrev) { // move preceding number/var/group into first field
        let i = this.c; while (i > 0 && this.t[i - 1].s && /^[0-9.]$|^[A-Zπℯ]$/.test(this.t[i - 1].s)) i--;
        if (i < this.c) { grabbed = this.t.splice(i, this.c - i); this.c = i; }
      }
      this.t.splice(this.c, 0, toks[0], ...grabbed, ...toks.slice(1));
      this.c += 1 + grabbed.length;
      if (grabbed.length && n > 1) this.c++; // jump to next field
    }
    left() { if (this.c > 0) this.c--; else this.c = this.t.length; }
    right() { if (this.c < this.t.length) this.c++; else this.c = 0; }
    home() { this.c = 0; } end() { this.c = this.t.length; }
    del() {
      if (this.c === 0) { if (!this.insert && this.t.length) this.t.splice(0, 1); return; }
      const prev = this.t[this.c - 1];
      if (prev.tpl && prev.role !== 'open') { this.c--; return; }
      if (prev.tpl && prev.role === 'open') { // unwrap template
        const start = this.c - 1; let depth = 0, end = start; const parts = [];
        for (let i = start; i < this.t.length; i++) { const x = this.t[i]; if (x.tpl && x.role === 'open') depth++; if (x.tpl && x.role === 'close') { depth--; if (depth === 0) { end = i; break; } } if (depth === 1 && x.tpl && x.role === 'sep') parts.push(i); }
        const keep = this.t.slice(start + 1, end).filter((x, j) => !(parts.includes(start + 1 + j)));
        this.t.splice(start, end - start + 1, ...keep); this.c = start; return;
      }
      this.t.splice(this.c - 1, 1); this.c--;
    }
    // vertical move inside fraction-like templates
    vert(dir) {
      const pos = this.c; let depth = 0;
      for (let i = pos - 1; i >= 0; i--) {
        const x = this.t[i]; if (!x.tpl) continue;
        if (x.role === 'close') depth++; else if (x.role === 'open') { if (depth === 0) { if (x.tpl === 'frac' && dir > 0) { const sep = this.findSep(i, 1); if (sep > pos - 1 || sep < 0) { this.c = sep + 1; return true; } } return false; } depth--; }
        else if (x.role === 'sep' && depth === 0 && x.tpl === 'frac' && dir < 0) { // in denominator -> go to numerator end
          this.c = i; return true; }
      }
      return false;
    }
    findSep(openIdx, nth) { let depth = 0, cnt = 0; for (let i = openIdx; i < this.t.length; i++) { const x = this.t[i]; if (!x.tpl) continue; if (x.role === 'open') depth++; else if (x.role === 'close') { depth--; if (!depth) return -1; } else if (depth === 1) { cnt++; if (cnt === nth) return i; } } return -1; }
    source() {
      const stack = [{ fields: [''] }];
      for (const x of this.t) {
        if (x.tpl) {
          if (x.role === 'open') stack.push({ tpl: x.tpl, fields: [''] });
          else if (x.role === 'sep') stack[stack.length - 1].fields.push('');
          else { const fr = stack.pop(); const p = stack[stack.length - 1]; p.fields[p.fields.length - 1] += TPL[fr.tpl].src(fr.fields.map(f => f || 'EMPTY')); }
        } else { const p = stack[stack.length - 1]; p.fields[p.fields.length - 1] += x.s; }
      }
      while (stack.length > 1) { const fr = stack.pop(); const p = stack[stack.length - 1]; p.fields[p.fields.length - 1] += TPL[fr.tpl].src(fr.fields); }
      return stack[0].fields[0];
    }
    linearText() { const O = { frac: '(', mixed: '(', sqrt: '√(', pow: '^(', nroot: '√(', logab: 'log(', integ: '∫(', deriv: 'd/dx(', sigma: 'Σ(', prod: 'Π(', abs: 'Abs(', pow10: '10^(', epow: 'e^(' }; return this.t.map(x => x.tpl ? (x.role === 'open' ? (O[x.tpl] || '(') : x.role === 'sep' ? ',' : ')') : x.d).join(''); }
    clone() { const e = new Editor(); e.t = this.t.slice(); e.c = this.c; return e; }
    fromTokens(t) { this.t = t.slice(); this.c = this.t.length; }
  }

  // render tokens to textbook HTML. cursor: index or -1
  function renderNatural(tokens, cursor, opt) {
    opt = opt || {};
    const CUR = '<span class="cur"></span>';
    const root = { kids: [''] }; const stack = [root];
    const top = () => stack[stack.length - 1];
    const add = (s) => { const t = top(); t.kids[t.kids.length - 1] += s; };
    for (let i = 0; i <= tokens.length; i++) {
      if (i === cursor) add(CUR);
      if (i === tokens.length) break;
      const x = tokens[i];
      if (x.tpl) {
        if (x.role === 'open') stack.push({ tpl: x.tpl, kids: [''] });
        else if (x.role === 'sep') top().kids.push('');
        else { const fr = stack.pop(); add(tplHTML(fr.tpl, fr.kids)); }
      } else add(x.d);
    }
    while (stack.length > 1) { const fr = stack.pop(); add(tplHTML(fr.tpl, fr.kids)); }
    return root.kids[0];
  }
  const box = (s) => s === '' ? '<span class="ebox"></span>' : (s === '<span class="cur"></span>' ? '<span class="ebox"></span>' + s : s);
  function tplHTML(t, f) {
    const B = f.map(box);
    switch (t) {
      case 'frac': return `<span class="nfr"><span class="nnu">${B[0]}</span><span class="nde">${B[1] || ''}</span></span>`;
      case 'mixed': return `${B[0]}<span class="nfr"><span class="nnu">${B[1] || ''}</span><span class="nde">${B[2] || ''}</span></span>`;
      case 'sqrt': return `<span class="nsq"><span class="nrad">√</span><span class="nov">${B[0]}</span></span>`;
      case 'pow': return `<sup class="npw">${B[0]}</sup>`;
      case 'nroot': return `<sup class="nri">${B[0]}</sup><span class="nsq"><span class="nrad">√</span><span class="nov">${B[1] || ''}</span></span>`;
      case 'logab': return `log<sub class="nsb">${B[0]}</sub>(${B[1] || ''})`;
      case 'integ': return `<span class="nint"><span class="nlim"><span>${B[2] || ''}</span><span>${B[1] || ''}</span></span><span class="nis">∫</span></span>${B[0]}<i>dx</i>`;
      case 'deriv': return `<span class="nfr"><span class="nnu"><i>d</i></span><span class="nde"><i>dx</i></span></span>(${B[0]})<span class="nat">|<sub>x=${B[1] || ''}</sub></span>`;
      case 'sigma': case 'prod': return `<span class="nint"><span class="nlim"><span>${B[2] || ''}</span><span>x=${B[1] || ''}</span></span><span class="nis">${t === 'sigma' ? 'Σ' : 'Π'}</span></span>(${B[0]})`;
      case 'abs': return `<span class="nabs">|${B[0]}|</span>`;
      case 'pow10': return `10<sup class="npw">${B[0]}</sup>`;
      case 'epow': return `<i>e</i><sup class="npw">${B[0]}</sup>`;
    }
    return B.join(',');
  }

  // format a value for natural display. returns html
  function valueHTML(v, o) {
    o = o || {};
    if (E.isMat(v)) {
      const arr = E.toMat(v).valueOf(); const rows = Array.isArray(arr[0]) ? arr : [arr];
      return '<span class="nmat"><table>' + rows.map(r => '<tr>' + r.map(c => '<td>' + plainHTML(c, o) + '</td>').join('') + '</tr>').join('') + '</table></span>';
    }
    if (Array.isArray(v)) return v.map(x => valueHTML(x, o)).join(', ');
    if (E.isCx(v)) {
      if (o.polar) { const r = E.math.abs(v), th = E.math.arg(v) * { deg: 180 / Math.PI, rad: 1, grad: 200 / Math.PI }[o.angle || 'deg']; return valueHTML(E.round15(r), o) + '∠' + valueHTML(E.round15(th), o); }
      const re = E.round15(v.re), im = E.round15(v.im);
      const ai = Math.abs(im); const ims = (ai === 1 ? '' : valueHTML(ai, o)) + '<i>i</i>';
      return (re !== 0 ? valueHTML(re, o) + (im < 0 ? '−' : '+') : (im < 0 ? '−' : '')) + ims;
    }
    if (typeof v === 'string') return v;
    if (o.exact && !o.decimal && o.fmt && o.fmt.mode !== 'fix' && o.fmt.mode !== 'sci') {
      const ex = E.exactForm(v, o.hint);
      if (ex && ex.kind === 'frac') {
        const neg = ex.n < 0 ? '−' : ''; const n = Math.abs(ex.n);
        if (o.mixed && n > ex.d) { const w = Math.floor(n / ex.d), r = n % ex.d; return `${neg}${w}<span class="nfr"><span class="nnu">${r}</span><span class="nde">${ex.d}</span></span>`; }
        if (o.linearFrac) return `${neg}${n}⌟${ex.d}`;
        return `${neg}<span class="nfr"><span class="nnu">${n}</span><span class="nde">${ex.d}</span></span>`;
      }
      if (ex && ex.kind === 'surd') {
        const neg = ex.a < 0 ? '−' : ''; const a = Math.abs(ex.a); const num = (a === 1 ? '' : a) + `<span class="nsq"><span class="nrad">√</span><span class="nov">${ex.b}</span></span>`;
        return ex.c === 1 ? neg + num : `${neg}<span class="nfr"><span class="nnu">${num}</span><span class="nde">${ex.c}</span></span>`;
      }
      if (ex && ex.kind === 'pi') {
        const neg = ex.n < 0 ? '−' : ''; const n = Math.abs(ex.n); const num = (n === 1 ? '' : n) + 'π';
        return ex.d === 1 ? neg + num : `${neg}<span class="nfr"><span class="nnu">${num}</span><span class="nde">${ex.d}</span></span>`;
      }
    }
    return plainHTML(v, o);
  }
  function plainHTML(v, o) {
    if (E.isCx(v)) return valueHTML(v, o);
    const f = E.formatNumber(v, o.fmt || { mode: 'norm1' });
    let m = f.mant.replace('-', '−');
    if (o.dot === false) m = m; // keep
    if (f.exp == null) return m;
    if (o.eStyle === 'E') return m + '<span class="ee">E</span>' + String(f.exp).replace('-', '−');
    return m + '×10<sup>' + String(f.exp).replace('-', '−') + '</sup>';
  }

  // ---------- 7-segment SVG ----------
  const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '', 'E': 'afged', 'r': 'eg', 'o': 'cdeg', 'A': 'abcefg', 'b': 'cdefg', 'C': 'adef', 'c': 'deg', 'd': 'bcdeg', 'F': 'aefg', 'H': 'bcefg', 'h': 'cefg', 'L': 'def', 'n': 'ceg', 'P': 'abefg', 'U': 'bcdef', 'u': 'cde', 'y': 'bcdfg', 'Y': 'bcdfg', 't': 'defg', 'S': 'afgcd', 'I': 'bc', 'i': 'c', 'G': 'acdef', 'J': 'bcde', 'O': 'abcdef', 'N': 'abcef', 'R': 'eg', 'T': 'defg', 'V': 'bcdef', 'X': 'bcefg', 'M': 'abcef', 'K': 'bcefg', 'W': 'bcdef', 'Z': 'abged', 'D': 'bcdeg', 'B': 'cdefg', 'Q': 'abcfg', 'q': 'abcfg', 'g': 'abcdfg', 'e': 'abdefg', 'l': 'ef', '_': 'd', '=': 'dg', "'": 'f', '°': 'abfg' };
  function segDigit(ch, x, opts) {
    const on = SEG[ch] || ''; const w = 20, H = 36, t = 3.6, sk = opts.skew || 0;
    const segs = {
      a: [[t, 0], [w - t, 0], [w - 2 * t, t], [2 * t, t]], d: [[2 * t, H - t], [w - 2 * t, H - t], [w - t, H], [t, H]],
      g: [[t, H / 2], [2 * t, H / 2 - t / 2], [w - 2 * t, H / 2 - t / 2], [w - t, H / 2], [w - 2 * t, H / 2 + t / 2], [2 * t, H / 2 + t / 2]],
      f: [[0, t], [t, 2 * t], [t, H / 2 - t], [0, H / 2 - t / 2]], b: [[w, t], [w, H / 2 - t / 2], [w - t, H / 2 - t], [w - t, 2 * t]],
      e: [[0, H / 2 + t / 2], [t, H / 2 + t], [t, H - 2 * t], [0, H - t]], c: [[w, H / 2 + t / 2], [w, H - t], [w - t, H - 2 * t], [w - t, H / 2 + t]],
    };
    let s = '';
    for (const nm in segs) {
      const pts = segs[nm].map(([px, py]) => [x + px + sk * (H - py) / H, py + 2]).map(p => p.join(',')).join(' ');
      const lit = on.includes(nm);
      if (lit || opts.ghost) s += `<polygon points="${pts}" class="${lit ? 'son' : 'soff'}"/>`;
    }
    return s;
  }
  // text: string with digits, '.', ',' attached to previous digit. n: number of digit cells
  function segSVG(text, n, opts) {
    opts = Object.assign({ skew: 3, ghost: true }, opts || {});
    const cells = []; // {ch, dot, comma}
    for (const ch of String(text)) {
      if ((ch === '.' || ch === ',' || ch === "'") && cells.length && !cells[cells.length - 1][ch === '.' ? 'dot' : 'comma']) { cells[cells.length - 1][ch === '.' ? 'dot' : 'comma'] = true; continue; }
      if (ch === '.') { cells.push({ ch: ' ', dot: true }); continue; }
      cells.push({ ch });
    }
    while (cells.length < n) cells.unshift({ ch: ' ' });
    const cw = 26; let s = '';
    cells.slice(-n).forEach((c, i) => {
      const x = 4 + i * cw; s += segDigit(c.ch, x, opts);
      s += `<circle cx="${x + 23}" cy="37" r="2.1" class="${c.dot ? 'son' : 'soff'}"/>`;
      if (opts.commas) s += `<path d="M${x + 22.5} 41 l-2 4" stroke-width="1.8" class="${c.comma ? 'scon' : 'scoff'}"/>`;
    });
    const tt = String(text).trim().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return `<svg class="seg" data-t="${tt}" role="img" aria-label="${tt}" viewBox="0 0 ${n * cw + 6} 46" preserveAspectRatio="xMaxYMid meet">${s}</svg>`;
  }

  // ---------- Key groups (high-contrast colours) + numbering ----------
  // 6 groups: num (digits/entry), op (operators/=), fn (functions), mem (memory/variables/registers),
  // clr (clear/delete/power), mod (shift/mode/menus/navigation).
  const G_NUM = /^(d\d+|d00|d000|dot|hex:[A-F]|exp10|eex|exp|ee|neg|chs|pm)$/;
  const G_OP = /^(add|sub|mul|div|eq|exe|enter|ok|addeq|subeq|lp|rp|comma|colon|pow|ypow|pct|dpct|mumd|tot|subtot|gt|nonadd|swap|rdn|cpt|xpy)$/;
  const G_MEM = /^(sto|rcl|recall|mplus|mminus|mr|mc|min|xm|exc|msub|mtot|var:.*|varx|varcycle|variable|vars|stoarrow|ans|answer|preans|sigplus|sigminus|lastx|N|IY|PV|PMT|FV|pv|pmt|fv|cf0|cfj|nj|cost|sell|mar|taxp|taxm|it|statdata|data|list)$/;
  const G_CLR = /^(ac|c|ca|cec|ce|clear|del|bksp|back|on|off|onac|onc|onoff|clx|clr.*|clreg|clfin|clprefix|clsig12|clearvar|reset|quit|exit|esc|feed|reprint|prt)$/;
  const G_MOD = /^(shift|2nd|3rd|alpha|fshift|gshift|inva|hyp|hypflag|mode|setup|optn|menu|menu:.*|apps|catalog|settings|tools|drg|drgcycle|format|keyboard|home|mathmenu|up|down|left|right|ins|symb|tblset|statplot|draw|yeq|window|zoom|trace|graph|table|plot|num|apps|f[1-6]|set|2nd|modemenu|lsmenu|logicmenu|intgmenu|basemenu|statmenu|matmenu|vctmenu|cmplxmenu|convmenu|function|show|gmode|prgm|noop|msg:.*)$/;
  function keyGroup(kd, app) {
    const a = kd.act || '', c = ' ' + (kd.c || '') + ' ';
    if (app === 'rpn12' && (a === 'n' || a === 'i')) return 'mem'; // TVM registers n, i
    if (G_NUM.test(a)) return 'num';
    if (G_CLR.test(a) || / del /.test(c)) return 'clr';
    if (G_OP.test(a)) return 'op';
    if (G_MEM.test(a)) return 'mem';
    if (/ (shift|alpha) /.test(c) || G_MOD.test(a)) return 'mod';
    return 'fn';
  }
  const GROUP_NAMES = { num: 'Digits & number entry', op: 'Operators & execute', fn: 'Functions', mem: 'Memory, variables & registers', clr: 'Clear, delete & power', mod: 'Shift, modes, menus & navigation' };
  const PAD_PARTS = [['up', '▲'], ['down', '▼'], ['left', '◀'], ['right', '▶']];
  /** Flat, numbered key list in the exact order buildCalc numbers them. */
  function keyList(model) {
    const out = []; let n = 0;
    (model.sections || []).forEach((sec, si) => (sec.keys || []).forEach(kd => {
      if (kd.spacer || kd.html) return;
      if (kd.pad) {
        PAD_PARTS.forEach(([act, face]) => out.push({ n: ++n, sec: si, face, act, group: 'mod', pad: true }));
        if (kd.center) out.push({ n: ++n, sec: si, face: kd.center[0], act: kd.center[1], group: keyGroup({ act: kd.center[1] }, model.app), pad: true });
        return;
      }
      out.push({ n: ++n, sec: si, face: kd.face, act: kd.act, s: kd.s, a: kd.a, b: kd.b, t: kd.t, u: kd.u, tip: kd.tip, group: keyGroup(Object.assign({}, kd, { c: kd.c || sec.kc }), model.app), kd });
    }));
    return out;
  }

  // ---------- Keypad builder ----------
  function buildCalc(model, app) {
    const th = model.theme || {};
    const body = h('div', 'calc ' + (model.cls || '') + ' ' + (th.cls || ''));
    body.style.setProperty('--body', th.body || '#ccc');
    for (const key in th.vars || {}) body.style.setProperty(key, th.vars[key]);
    body.style.width = (model.w || 360) + 'px';
    if (model.top) { const top = h('div', 'ctop', model.top); body.appendChild(top); }
    const disp = h('div', 'dispwrap ' + (model.dispCls || ''));
    const screen = h('div', 'screen ' + (model.display.kind) + ' ' + (model.display.cls || ''));
    if (model.display.w) screen.style.width = model.display.w + 'px';
    if (model.display.h) screen.style.height = model.display.h + 'px';
    disp.appendChild(screen); body.appendChild(disp);
    if (model.afterDisplay) body.appendChild(h('div', 'adisp', model.afterDisplay));
    const keyEls = []; const ctr = { n: 0 };
    (model.sections || []).forEach(sec => {
      const grid = h('div', 'ksec ' + (sec.cls || ''));
      grid.style.gridTemplateColumns = sec.cols ? (typeof sec.cols === 'number' ? `repeat(${sec.cols},1fr)` : sec.cols) : '';
      if (sec.gap) grid.style.gap = sec.gap;
      if (sec.style) Object.assign(grid.style, sec.style);
      sec.keys.forEach(kd => {
        if (kd.spacer) { const s = h('div', 'kspace'); s.style.gridColumn = 'span ' + kd.w; if (kd.r) s.style.gridRow = 'span ' + kd.r; grid.appendChild(s); return; }
        if (kd.pad) { const p = buildPad(kd, app, ctr); grid.appendChild(p); return; }
        if (kd.html) { const x = h('div', 'kdeco ' + (kd.c || ''), kd.html); if (kd.w) x.style.gridColumn = 'span ' + kd.w; if (kd.r) x.style.gridRow = 'span ' + kd.r; grid.appendChild(x); return; }
        const cell = h('div', 'kc ' + (kd.cc || sec.cc || ''));
        if (kd.w) cell.style.gridColumn = 'span ' + kd.w;
        if (kd.r) cell.style.gridRow = 'span ' + kd.r;
        if (!sec.nolabels) {
          const lab = h('div', 'kl' + (kd.lc ? ' ' + kd.lc : ''));
          if (kd.s) lab.appendChild(h('span', 'ls', kd.s[0]));
          if (kd.b) lab.appendChild(h('span', 'lb', kd.b[0]));
          if (kd.a) lab.appendChild(h('span', 'la', kd.a[0]));
          if (kd.t) lab.appendChild(h('span', 'lt', kd.t[0]));
          if (kd.top) lab.innerHTML = kd.top;
          cell.appendChild(lab);
        }
        const kcls = kd.c || sec.kc || '';
        const grpName = keyGroup(Object.assign({}, kd, { c: kcls }), model.app);
        const num = ++ctr.n;
        const btn = h('button', 'key ' + kcls + ' kg-' + grpName);
        btn.innerHTML = `<span class="kno" aria-hidden="true">${num}</span><span class="kf">${kd.face}</span>` + (kd.u ? `<span class="ku">${kd.u[0]}</span>` : '');
        btn.type = 'button'; btn.dataset.n = num; btn.title = '#' + num + ' ' + (kd.tip || stripTags(kd.face));
        btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); btn.classList.add('down'); app.press(kd); });
        const up = () => btn.classList.remove('down');
        btn.addEventListener('pointerup', up); btn.addEventListener('pointerleave', up);
        cell.appendChild(btn); if (kd.below) cell.appendChild(h('div', 'kbelow', kd.below));
        grid.appendChild(cell); keyEls.push({ kd, btn });
      });
      body.appendChild(grid);
    });
    if (model.bottom) body.appendChild(h('div', 'cbot', model.bottom));
    return { body, screen, keyEls };
  }
  function stripTags(s) { return String(s).replace(/<[^>]+>/g, ''); }
  function buildPad(kd, app, ctr) {
    ctr = ctr || { n: 0 };
    // kd.pad: 'replay' (round), 'cross', 'ring' (round with OK center), 'oval'
    const p = h('div', 'pad pad-' + kd.pad + ' ' + (kd.c || ''));
    if (kd.w) p.style.gridColumn = 'span ' + kd.w; if (kd.r) p.style.gridRow = 'span ' + kd.r;
    const mk = (cls, act, txt) => { const num = ++ctr.n; const b = h('button', 'pk ' + cls, `<span class="kno" aria-hidden="true">${num}</span>` + (txt || '')); b.type = 'button'; b.dataset.n = num; b.title = '#' + num + ' ' + act; b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); app.press({ act, face: act }); }); b.addEventListener('pointerup', () => b.classList.remove('down')); b.addEventListener('pointerleave', () => b.classList.remove('down')); return b; };
    p.appendChild(mk('pu', 'up', '▲')); p.appendChild(mk('pd', 'down', '▼')); p.appendChild(mk('pl', 'left', '◀')); p.appendChild(mk('pr', 'right', '▶'));
    if (kd.center) p.appendChild(mk('pc', kd.center[1], kd.center[0]));
    else if (kd.label) p.appendChild(h('span', 'plabel', kd.label));
    return p;
  }

  // keyboard mapping: physical key -> action candidates
  const KBD = {
    '0': ['d0'], '1': ['d1'], '2': ['d2'], '3': ['d3'], '4': ['d4'], '5': ['d5'], '6': ['d6'], '7': ['d7'], '8': ['d8'], '9': ['d9'],
    '.': ['dot'], ',': ['comma', 'dot'], '+': ['add', 'addeq'], '-': ['sub', 'subeq'], '*': ['mul'], 'x': ['mul'], '/': ['div'], '^': ['pow', 'ypow'], '(': ['lp'], ')': ['rp'],
    'Enter': ['exe', 'enter', 'addeq', 'ok'], '=': ['exe', 'addeq', 'eq'], 'Backspace': ['del', 'bksp', 'back'], 'Delete': ['del', 'bksp'], 'Escape': ['ac', 'clear', 'esc', 'ca', 'cec'],
    'ArrowLeft': ['left'], 'ArrowRight': ['right'], 'ArrowUp': ['up'], 'ArrowDown': ['down'], 's': ['sin'], 'c': ['cos'], 't': ['tan'], 'l': ['log'], 'n': ['ln'], 'r': ['sqrt'], '!': ['fact'], '%': ['pct'], 'e': ['exp10', 'eex'], 'p': ['pi'], 'q': ['sq'], 'Shift': [], 'Tab': ['tab'], 'i': ['inv'],
  };
  function attachKeyboard(app, keyEls) {
    const handler = (ev) => {
      if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const cands = KBD[ev.key]; if (!cands) return;
      for (const a of cands) {
        const hit = keyEls.find(x => x.kd.act === a) ;
        if (hit) { ev.preventDefault(); hit.btn.classList.add('down'); setTimeout(() => hit.btn.classList.remove('down'), 120); app.press(Object.assign({}, hit.kd, { fromKbd: true })); return; }
        if (['up', 'down', 'left', 'right'].includes(a)) { ev.preventDefault(); app.press({ act: a }); return; }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }

  G.CalcUI = { h, k, sp, Editor, TPL, renderNatural, valueHTML, plainHTML, segSVG, buildCalc, attachKeyboard, stripTags, keyGroup, keyList, GROUP_NAMES, KBD };
})(window);
