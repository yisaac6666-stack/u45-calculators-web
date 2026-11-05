/* Graphing calculator app family: home, Y=, window, graph (trace/zoom/calc), table, stats, apps */
(function (G) {
  'use strict';
  const E = G.CalcEngine, U = G.CalcUI, S = G.SciScreens;
  const { MenuScreen, FormScreen, ResultScreen, GridScreen, MsgScreen, ExprEntryScreen } = S;
  const COLORS = ['#1f5fd6', '#d62828', '#2a9d3c', '#c77a00', '#8e3fbf', '#0aa3a3'];
  const fmtS = (v, d) => { if (typeof v !== 'number' || !isFinite(v)) return 'undef'; const f = E.formatNumber(E.round15(v), { mode: 'norm1', digits: d || 8 }); return (f.mant + (f.exp != null ? 'E' + f.exp : '')).replace('-', '−'); };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ---- screens ----
  class HomeScreen { constructor(app) { this.app = app; this.title = app.cfg.homeTitle || ''; } render() { return this.app.renderHome(); } handle(a, kd) { return this.app.calcKey(a, kd); } soft() { return this.app.cfg.homeSoft || null; } }

  class AppGrid {
    constructor(app, items) { this.app = app; this.items = items; this.sel = 0; this.title = app.cfg.gridTitle || 'MAIN MENU'; }
    render() {
      const cols = this.app.cfg.gridCols || 3;
      return `<div class="agrid" style="grid-template-columns:repeat(${cols},1fr)">` + this.items.map((it, i) => `<div class="ai ${i === this.sel ? 'sel' : ''}" data-act="pick:${i}"><div class="aic" style="background:${it.c || '#567'}">${it.g}</div><div class="ail">${this.app.cfg.gridNums ? (i < 9 ? i + 1 : 'ABCDEF'[i - 9]) + ' ' : ''}${it.l}</div></div>`).join('') + '</div>';
    }
    handle(a) {
      const n = this.items.length, cols = this.app.cfg.gridCols || 3;
      if (a.startsWith('pick:')) return this.pick(+a.slice(5));
      if (/^d[1-9]$/.test(a)) { const i = +a[1] - 1; if (i < n) this.pick(i); return true; }
      if (a === 'right') this.sel = (this.sel + 1) % n; else if (a === 'left') this.sel = (this.sel + n - 1) % n;
      else if (a === 'down') this.sel = Math.min(n - 1, this.sel + cols); else if (a === 'up') this.sel = Math.max(0, this.sel - cols);
      else if (['exe', 'ok', 'enter'].includes(a)) this.pick(this.sel);
      else if (['back', 'exit', 'esc', 'ac', 'quit'].includes(a) && this.app.stack.length > 1) this.app.pop();
      return true;
    }
    pick(i) { const it = this.items[i]; this.app.stack = [this.app.home]; it.fn(); return true; }
  }

  class YEditScreen {
    constructor(app) { this.app = app; this.sel = 0; this.title = app.cfg.yTitle || 'Graph Func'; }
    get ed() { return this.app.yf[this.sel].ed; }
    render() {
      const app = this.app, nat = app.natural; const n = app.yf.length;
      return `<div class="yed">` + app.yf.map((f, i) => {
        const on = f.on && !f.ed.empty; const nm = app.fname(i);
        return `<div class="yr ${i === this.sel ? 'sel' : ''}" data-act="ysel:${i}"><span class="ysw" style="--fc:${f.color}"></span><span class="yn ${on ? 'on' : ''}">${nm}${app.cfg.yArg ? '(<i>x</i>)' : ''}=</span><span class="ye">${U.renderNatural(f.ed.t, i === this.sel ? f.ed.c : -1)}</span></div>`;
      }).join('') + '</div>';
    }
    soft() { return [['SELECT', 'yselect'], ['DELETE', 'ydelete'], ['TYPE', 'noop'], ['COLOR', 'ycolor'], ['', 'noop'], ['DRAW', 'graph']]; }
    handle(a) {
      const app = this.app, ed = this.ed;
      if (a.startsWith('ysel:')) { this.sel = +a.slice(5); return true; }
      switch (a) {
        case 'down': case 'exe': case 'enter': case 'ok': if (a === 'down' && ed.vert(1)) return true; app.dirty(); this.sel = Math.min(app.yf.length - 1, this.sel + 1); this.ed.end(); return true;
        case 'up': if (ed.vert(-1)) return true; app.dirty(); this.sel = Math.max(0, this.sel - 1); this.ed.end(); return true;
        case 'left': if (ed.c === 0) { app.yf[this.sel].on = !app.yf[this.sel].on; return true; } ed.left(); return true;
        case 'right': ed.right(); return true;
        case 'del': case 'bksp': ed.del(); app.dirty(); return true;
        case 'clear': case 'ac': case 'ydelete': if (ed.empty && a !== 'ydelete') { app.toHome(); return true; } ed.clear(); app.dirty(); return true;
        case 'yselect': app.yf[this.sel].on = !app.yf[this.sel].on; return true;
        case 'ycolor': { const f = app.yf[this.sel]; f.color = COLORS[(COLORS.indexOf(f.color) + 1) % COLORS.length]; return true; }
        case 'varx': case 'x': case 'varcycle': ed.put({ d: '<i>' + (app.cfg.xName || 'X') + '</i>', s: 'X' }); app.dirty(); return true;
      }
      if (app.navKey(a)) return true;
      const tp = app.natural ? app.tplFor(a) : null;
      if (tp) { if (tp === 'cbrt') { ed.tpl('nroot'); ed.put({ d: '3', s: '3' }); ed.c++; } else ed.tpl(tp); app.dirty(); return true; }
      const t = app.tok(a); if (t) { ed.put(t); app.dirty(); }
      return true;
    }
  }

  class WindowScreen extends FormScreen {
    constructor(app) {
      const w = app.win;
      super(app, app.cfg.winTitle || 'WINDOW', [['Xmin', w.xmin], ['Xmax', w.xmax], ['Xscl', w.xscl], ['Ymin', w.ymin], ['Ymax', w.ymax], ['Yscl', w.yscl]].map(([l, v]) => ({ label: l + '=', value: v })), null, { per: app.cfg.formRows || 6 });
      this.title = app.cfg.winTitle || 'WINDOW';
    }
    soft() { return [['INIT', 'zstd'], ['TRIG', 'ztrig'], ['STD', 'zstd'], ['', 'noop'], ['', 'noop'], ['DRAW', 'graph']]; }
    handle(a) {
      if (a === 'zstd' || a === 'ztrig') { this.app.zoom(a); this.sync(true); return true; }
      if (this.app.navKey(a)) { this.commit(); this.sync(); return true; }
      if (['exe', 'enter', 'ok'].includes(a) && this.sel === this.fields.length - 1) { this.commit(); this.sync(); return true; }
      const r = super.handle(a); this.sync(); return r;
    }
    sync(fromApp) {
      const w = this.app.win, k = ['xmin', 'xmax', 'xscl', 'ymin', 'ymax', 'yscl'];
      if (fromApp) { k.forEach((n, i) => this.fields[i].value = w[n]); return; }
      const v = this.fields.map(f => f.value); if (v[0] < v[1] && v[3] < v[4]) k.forEach((n, i) => w[n] = v[i]);
    }
  }

  class TableScreen {
    constructor(app) { this.app = app; this.r = 0; this.c = 0; this.title = app.cfg.tblTitle || 'Table'; }
    render() {
      const app = this.app; const act = app.activeFns(); const rows = app.cfg.tblRows || 6;
      if (!act.length) return `<div class="msg">${app.cfg.noFnMsg || 'No functions selected'}</div>`;
      const top = Math.max(0, this.r - rows + 1); const st = app.tbl.start, d = app.tbl.step;
      let h = `<div class="gtbl"><table><tr><th>${app.cfg.xName || 'X'}</th>${act.map(i => `<th style="color:${app.cfg.mono ? 'inherit' : app.yf[i].color}">${app.fname(i)}</th>`).join('')}</tr>`;
      for (let r = top; r < top + rows; r++) {
        const x = E.round15(st + r * d);
        h += `<tr><td class="${r === this.r && this.c === 0 ? 'sel' : ''}">${fmtS(x, 6)}</td>` + act.map((i, j) => `<td class="${r === this.r && this.c === j + 1 ? 'sel' : ''}">${fmtS(app.evalF(i, x), 6)}</td>`).join('') + '</tr>';
      }
      const x = E.round15(st + this.r * d); const cur = this.c === 0 ? x : app.evalF(act[this.c - 1], x);
      return h + `</table><div class="gfoot">${this.c === 0 ? (app.cfg.xName || 'X') : app.fname(act[this.c - 1])}=${fmtS(cur, 10)}</div></div>`;
    }
    soft() { return [['', 'noop'], ['', 'noop'], ['', 'noop'], ['', 'noop'], ['SET', 'tblset'], ['G-CON', 'graph']]; }
    handle(a) {
      const n = this.app.activeFns().length;
      if (a === 'down') { this.r++; return true; }
      if (a === 'up') { if (this.r > 0) this.r--; else this.app.tbl.start = E.round15(this.app.tbl.start - this.app.tbl.step); return true; }
      if (a === 'right') { this.c = Math.min(n, this.c + 1); return true; }
      if (a === 'left') { this.c = Math.max(0, this.c - 1); return true; }
      if (this.app.navKey(a)) return true;
      if (['ac', 'clear', 'exit', 'back', 'esc'].includes(a)) { this.app.toHome(); return true; }
      return true;
    }
  }

  class GraphScreen {
    constructor(app, trace) { this.app = app; this.trace = !!trace; this.fi = 0; this.title = app.cfg.gTitle || 'Graph'; const w = app.win; this.cx = (w.xmin + w.xmax) / 2; this.cy = (w.ymin + w.ymax) / 2; this.free = false; this.msg = ''; this.shade = null; this.box = null;
      const act = app.activeFns(); this.fi = act.length ? act[0] : -1; if (this.trace) this.snap(); }
    get W() { return this.app.cfg.W; } get H() { return this.app.cfg.H; }
    dx() { const w = this.app.win; return (w.xmax - w.xmin) / (this.W - 1); }
    dy() { const w = this.app.win; return (w.ymax - w.ymin) / (this.H - 1); }
    snap() { if (this.fi < 0) { this.trace = false; return; } this.cy = this.app.evalF(this.fi, this.cx); }
    render() {
      const app = this.app; let ro = '';
      const xn = app.cfg.xName || 'X';
      if (this.trace && this.fi >= 0) ro = `<span>${xn}=${fmtS(this.cx, 7)}</span><span>Y=${fmtS(this.cy, 7)}</span>`;
      else if (this.free) ro = `<span>${xn}=${fmtS(this.cx, 7)}</span><span>Y=${fmtS(this.cy, 7)}</span>`;
      const lab = this.trace && this.fi >= 0 ? `<div class="glab" style="color:${app.cfg.mono ? 'inherit' : app.yf[this.fi].color}">${app.fname(this.fi)}=${U.renderNatural(app.yf[this.fi].ed.t, -1)}</div>` : '';
      return `<div class="gwrap"><canvas class="gcv ${app.cfg.mono ? 'mono' : ''}" width="${this.W}" height="${this.H}"></canvas>${lab}${this.msg ? `<div class="gmsg">${this.msg}</div>` : ''}<div class="gro">${ro}</div></div>`;
    }
    soft() { return [['Trace', 'trace'], ['Zoom', 'zoom'], ['V-Win', 'window'], ['Sketch', 'noop'], ['G-Solv', 'calcmenu'], ['G↔T', 'table']]; }
    after(el) { const cv = el.querySelector('canvas.gcv'); if (cv) this.app.draw(cv, this); }
    handle(a) {
      const app = this.app, w = app.win; this.msg = a === 'noop' ? this.msg : '';
      const act = app.activeFns();
      switch (a) {
        case 'trace': if (!act.length) return true; this.trace = true; this.free = false; if (!act.includes(this.fi)) this.fi = act[0]; if (this.cx < w.xmin || this.cx > w.xmax) this.cx = (w.xmin + w.xmax) / 2; this.snap(); return true;
        case 'left': case 'right': {
          const s = a === 'left' ? -1 : 1;
          if (this.box && this.box.stage === 1) { /* moving second corner */ }
          if (!this.trace) this.free = true;
          this.cx = E.round15(this.cx + s * this.dx());
          if (this.trace) { if (this.cx < w.xmin || this.cx > w.xmax) { const sh = (w.xmax - w.xmin) / 4 * s; w.xmin += sh; w.xmax += sh; } this.snap(); }
          return true; }
        case 'up': case 'down':
          if (this.trace && act.length) { const k = act.indexOf(this.fi); this.fi = act[(k + (a === 'down' ? 1 : act.length - 1)) % act.length]; this.snap(); return true; }
          this.free = true; this.cy = E.round15(this.cy + (a === 'up' ? 1 : -1) * this.dy()); return true;
        case 'exe': case 'enter': case 'ok':
          if (this.box) { if (this.box.stage === 0) { this.box = { stage: 1, x0: this.cx, y0: this.cy }; this.msg = 'Corner 2?'; return true; } const b = this.box; this.box = null; if (b.x0 !== this.cx && b.y0 !== this.cy) { w.xmin = Math.min(b.x0, this.cx); w.xmax = Math.max(b.x0, this.cx); w.ymin = Math.min(b.y0, this.cy); w.ymax = Math.max(b.y0, this.cy); } return true; }
          if (this.trace) { const sx = (w.xmax - w.xmin) / 2, sy = (w.ymax - w.ymin) / 2; if (isFinite(this.cy)) { w.ymin = this.cy - sy; w.ymax = this.cy + sy; } w.xmin = this.cx - sx; w.xmax = this.cx + sx; } return true;
        case 'zoom': app.zoomMenu(this); return true;
        case 'zin': case 'zout': case 'zstd': case 'ztrig': case 'zdec': case 'zsq': case 'zfit': case 'zstat': case 'zint': app.zoom(a, this); if (this.trace) this.snap(); return true;
        case 'zbox': this.box = { stage: 0 }; this.trace = false; this.free = true; this.msg = 'Corner 1?'; return true;
        case 'calcmenu': app.gcalcMenu(this); return true;
        case 'ac': case 'clear': case 'exit': case 'back': case 'esc': if (this.trace || this.free) { this.trace = false; this.free = false; return true; } app.toHome(); return true;
      }
      if (/^d\d$|^neg$|^sub$/.test(a) && this.trace) { app.push(new FormScreen(app, '', [{ label: (app.cfg.xName || 'X') + '=', value: null }], (v) => { app.pop(); if (v[0] != null) { this.cx = v[0]; this.snap(); } }, { nullable: true })); app.top.handle(a); return true; }
      if (app.navKey(a)) return true;
      return true;
    }
  }

  // ---- the app ----
  class GraphApp extends G.SciApp {
    constructor(model, el) {
      model.cfg = Object.assign({ natural: false, lines: 8, eStyle: 'E', angle: 'rad', family: 'graph', W: 96, H: 64, mono: true, gfam: 'ti', history: true, menuPer: 8, menuCols: 1, formPer: 6, digits: 10, noAnsChain: false }, model.cfg || {});
      super(model, el);
      el.addEventListener('click', (ev) => { const t = ev.target.closest('[data-act]'); if (t && el.contains(t)) { ev.preventDefault(); this.press({ act: t.dataset.act }); } });
    }
    reset() {
      super.reset();
      this.home = new HomeScreen(this); this.stack = [this.home];
      this.yf = []; for (let i = 0; i < 6; i++) this.yf.push({ ed: new U.Editor(), on: true, color: COLORS[i], ast: null });
      this.win = { xmin: -10, xmax: 10, xscl: 1, ymin: -10, ymax: 10, yscl: 1 }; this.tbl = { start: 0, step: 1 };
      this.lists = [[], [], []]; this.plot1 = false; this.regType = 'lin'; this.gridOn = !this.cfg.mono; this.cacheOK = false;
      if (this.cfg.startGrid) this.push(this.appGrid());
    }
    fname(i) { const f = this.cfg.fnames; return f ? f[i] : 'Y' + '₁₂₃₄₅₆'[i]; }
    dirty() { this.cacheOK = false; }
    compile() {
      if (this.cacheOK) return; const saved = this.ed;
      this.yf.forEach(f => { f.ast = null; if (f.ed.empty) return; this.ed = f.ed; try { f.ast = E.parse(this.source(), { implicitHigh: this.cfg.implicitHigh }); } catch (e) { f.ast = 'err'; } });
      this.ed = saved; this.cacheOK = true; this._env = null;
    }
    activeFns() { this.compile(); return this.yf.map((f, i) => f.on && f.ast && f.ast !== 'err' ? i : -1).filter(i => i >= 0); }
    genv() { if (!this._env) this._env = this.env(); return this._env; }
    evalF(i, x) { this.compile(); const f = this.yf[i]; if (!f.ast || f.ast === 'err') return NaN; const env = this.genv(); env.vars.X = x; try { const v = E.evalNode(f.ast, env); return typeof v === 'number' ? v : (v && v.re != null && Math.abs(v.im) < 1e-12 ? v.re : NaN); } catch (e) { return NaN; } }
    env(extra) {
      const e = super.env(extra); this.compile();
      this.yf.forEach((f, i) => { if (f.ast && f.ast !== 'err') e.fns['Y' + (i + 1)] = { ast: f.ast, v: 'X' }; });
      Object.assign(e.vars, { Xmin: this.win.xmin, Xmax: this.win.xmax, Ymin: this.win.ymin, Ymax: this.win.ymax });
      return e;
    }
    press(kd) {
      this._env = null; // vars may change
      if (kd.act === 'keyboard') { this.kbdOpen = !this.kbdOpen; this.shift = false; this.render(); return; }
      if (kd.fromTkbd && this.cfg.touchKbd && this.cfg.tkbdAutoClose) this.kbdOpen = false;
      if (/^f[1-6]$/.test(kd.act) && !this.shift && !this.alpha) { const s = this.top.soft && this.top.soft(); if (s && s[+kd.act[1] - 1]) kd = Object.assign({}, kd, { act: s[+kd.act[1] - 1][1] }); }
      super.press(kd);
    }
    toHome() { this.stack = [this.home]; }
    navKey(a) {
      switch (a) {
        case 'yeq': case 'symb': this.stack = [this.home]; this.push(this.yed || (this.yed = new YEditScreen(this))); return true;
        case 'window': case 'vwin': this.stack = [this.home]; this.push(new WindowScreen(this)); return true;
        case 'graph': case 'plot': this.stack = [this.home]; this.push(new GraphScreen(this, false)); return true;
        case 'trace': this.stack = [this.home]; this.push(new GraphScreen(this, true)); return true;
        case 'zoom': this.stack = [this.home]; { const g = new GraphScreen(this, false); this.push(g); this.zoomMenu(g); } return true;
        case 'table': case 'num': this.stack = [this.home]; this.push(new TableScreen(this)); return true;
        case 'tblset': this.push(new FormScreen(this, 'TABLE SETUP', [{ label: 'TblStart=', value: this.tbl.start }, { label: 'ΔTbl=', value: this.tbl.step }], (v) => { this.pop(); if (v[1] > 0 || v[1] < 0) { this.tbl.start = v[0]; this.tbl.step = v[1]; } }, { per: 4 })); return true;
        case 'calcmenu': { const top = this.top instanceof GraphScreen ? this.top : (this.stack = [this.home], this.push(new GraphScreen(this, true)), this.top); this.gcalcMenu(top); return true; }
        case 'quit': case 'home': if (this.cfg.startGrid && a === 'home') { this.push(this.appGrid()); return true; } this.toHome(); return true;
        case 'menu': case 'apps': if (this.cfg.appItems) { this.push(this.appGrid()); return true; } return false;
        case 'stat': this.statMenuG(); return true;
        case 'statplot': this.menu('STAT PLOTS', [{ label: 'Plot1 ' + (this.plot1 ? 'On' : 'Off') + ' → ' + (this.plot1 ? 'Off' : 'On'), fn: () => { this.plot1 = !this.plot1; } }, { label: 'PlotsOff', fn: () => { this.plot1 = false; } }]); return true;
        case 'list': this.listEditor(); return true;
        case 'vars': case 'var': this.varsMenu(); return true;
        case 'gmode': case 'setupg': this.modeScreen(); return true;
        case 'draw': this.menu('DRAW', [{ label: 'ClrDraw', fn: () => {} }, { label: 'Grid ' + (this.gridOn ? 'Off' : 'On'), fn: () => { this.gridOn = !this.gridOn; } }]); return true;
        case 'prgm': case 'python': case 'program': this.push(new MsgScreen(this, 'Programming is not<br>available in this<br>simulation')); return true;
      }
      return false;
    }
    calcKey(a, kd) {
      if (this.navKey(a)) return true;
      if (a === 'mode' && this.cfg.gmode !== false) { this.modeScreen(); return true; }
      if (a === 'clear' && this.top === this.home) { if (this.ed.empty && !this.res) { this.hist = []; return true; } this.startNew(); return true; }
      if (a === 'varx' || (a === 'x' && this.cfg.gfam !== 'none')) { if (this.res) this.startNew(); this.ed.put({ d: '<i>' + (this.cfg.xName || 'X') + '</i>', s: 'X' }); return true; }
      if (/^yfn:\d$/.test(a)) { if (this.res) this.startNew(); const i = +a[4]; this.ed.put({ d: this.fname(i) + '(', s: 'Y' + (i + 1) + '(' }); return true; }
      if (a === 'entry') { if (this.hist.length) { this.startNew(); this.ed.fromTokens(this.hist[this.hist.length - 1].tokens); } return true; }
      if (a === 'eqnapp') { this.eqnMenu(); return true; }
      if (a === 'solveapp') return this.solveApp();
      return super.calcKey(a, kd);
    }
    solveApp() {
      const ed = new U.Editor(); const app = this;
      this.push(new ExprEntryScreen(this, 'Equation: ', ed, () => { app.pop(); const saved = app.ed; app.ed = ed; app.res = null; try { app.doSolve(); } finally { app.ed = saved; } }));
      return true;
    }
    execute(forceDec) { const r = super.execute(forceDec); this.dirty(); return r; }
    // ---- menus ----
    appGrid() {
      const items = (this.cfg.appItems || []).map(([l, g, c, act]) => ({ l, g, c, fn: () => this.launch(act) }));
      return new AppGrid(this, items);
    }
    launch(act) {
      switch (act) {
        case 'run': this.toHome(); return;
        case 'graph': this.navKey('yeq'); return;
        case 'table': this.navKey('yeq'); this.tableAfterY = true; return;
        case 'stat': this.listEditor(); return;
        case 'eqn': this.eqnMenu(); return;
        case 'solve': this.solveApp(); return;
        case 'settings': this.modeScreen(); return;
        case 'matrix': this.matMenu(); return;
        case 'dist': this.distMenu(); return;
        case 'base': this.mode = 'BASE'; this.baseNMenu(); return;
        case 'cmplx': this.mode = this.mode === 'CMPLX' ? 'COMP' : 'CMPLX'; this.toHome(); return;
      }
    }
    modeScreen() {
      const fm = this.fmt; const items = [
        { label: 'Normal', fn: () => this.fmt = { mode: 'norm1', digits: this.cfg.digits } }, { label: 'Sci', fn: () => this.fmt = { mode: 'sci', n: 6, digits: this.cfg.digits } }, { label: 'Eng', fn: () => this.fmt = { mode: 'eng', digits: this.cfg.digits } },
        { label: 'Float', fn: () => this.fmt = { mode: 'norm1', digits: this.cfg.digits } }, { label: 'Fix 0-9…', fn: () => this.pickDigits('Fix', n => this.fmt = { mode: 'fix', n, digits: this.cfg.digits }) },
        { label: (this.angle === 'rad' ? '▶' : '') + 'Radian', fn: () => { this.angle = 'rad'; } }, { label: (this.angle === 'deg' ? '▶' : '') + 'Degree', fn: () => { this.angle = 'deg'; } },
        { label: 'Real / a+b<i>i</i>: ' + (this.mode === 'CMPLX' ? 'a+b<i>i</i>' : 'Real'), fn: () => { this.mode = this.mode === 'CMPLX' ? 'COMP' : 'CMPLX'; } },
        { label: 'Input: ' + (this.natural ? 'Math (textbook)' : 'Linear'), fn: () => { this.natural = !this.natural; } },
        { label: 'Grid: ' + (this.gridOn ? 'On' : 'Off'), fn: () => { this.gridOn = !this.gridOn; } },
        { label: 'Reset all', fn: () => this.reset() }];
      return this.menu(this.cfg.modeTitle || 'MODE', items, { cols: 1, per: this.cfg.menuPer });
    }
    varsMenu() {
      const items = this.yf.map((f, i) => ({ label: this.fname(i), fn: () => this.calcKey('yfn:' + i) }));
      ['Xmin', 'Xmax', 'Ymin', 'Ymax'].forEach(n => items.push({ label: n, fn: () => this.insert({ d: n, s: n }) }));
      ['A', 'B', 'C', 'D', 'X', 'Y'].forEach(n => items.push({ label: n + '=' + fmtS(this.vars[n] || 0, 6), fn: () => this.insert({ d: n, s: n }) }));
      return this.menu('VARS', items, { cols: 1, per: this.cfg.menuPer });
    }
    zoomMenu(g) {
      const Z = [['ZBox', 'zbox'], ['Zoom In', 'zin'], ['Zoom Out', 'zout'], ['ZDecimal', 'zdec'], ['ZSquare', 'zsq'], ['ZStandard', 'zstd'], ['ZTrig', 'ztrig'], ['ZInteger', 'zint'], ['ZoomStat', 'zstat'], ['ZoomFit', 'zfit']];
      this.menu('ZOOM', Z.map(([l, z]) => ({ label: l, fn: () => g.handle(z) })), { cols: 1, per: this.cfg.menuPer });
    }
    zoom(z, g) {
      const w = this.win; const cx = g && (g.trace || g.free) ? g.cx : (w.xmin + w.xmax) / 2, cy = g && (g.trace || g.free) && isFinite(g.cy) ? g.cy : (w.ymin + w.ymax) / 2;
      const set = (a, b, c, d, xs, ys) => Object.assign(w, { xmin: a, xmax: b, ymin: c, ymax: d, xscl: xs != null ? xs : w.xscl, yscl: ys != null ? ys : w.yscl });
      const W = this.cfg.W, H = this.cfg.H;
      switch (z) {
        case 'zin': case 'zout': { const f = z === 'zin' ? 0.25 : 1; const sx = (w.xmax - w.xmin) * f * (z === 'zin' ? 1 : 2), sy = (w.ymax - w.ymin) * f * (z === 'zin' ? 1 : 2); set(cx - sx, cx + sx, cy - sy, cy + sy); break; }
        case 'zstd': set(-10, 10, -10, 10, 1, 1); break;
        case 'ztrig': set(this.angle === 'deg' ? -352.5 : -6.152285613, this.angle === 'deg' ? 352.5 : 6.152285613, -4, 4, this.angle === 'deg' ? 90 : Math.PI / 2, 1); break;
        case 'zdec': set(-(W - 1) / 20, (W - 1) / 20, -(H - 1) / 20, (H - 1) / 20, 1, 1); break;
        case 'zint': set(cx - (W - 1) / 2, cx + (W - 1) / 2, cy - (H - 1) / 2, cy + (H - 1) / 2, 10, 10); break;
        case 'zsq': { const px = (w.xmax - w.xmin) / (W - 1), sy = px * (H - 1) / 2; const my = (w.ymin + w.ymax) / 2; set(w.xmin, w.xmax, my - sy, my + sy); break; }
        case 'zstat': { const rows = this.statRows(); if (!rows.length) break; const xs = rows.map(r => r[0]), ys = rows.map(r => r[1]); const a = Math.min(...xs), b = Math.max(...xs), c = Math.min(...ys), d = Math.max(...ys); const px = (b - a || 1) * 0.1, py = (d - c || 1) * 0.1; this.plot1 = true; set(a - px, b + px, c - py, d + py, null, null); break; }
        case 'zfit': { const act = this.activeFns(); let lo = Infinity, hi = -Infinity; for (let i = 0; i < W; i++) { const x = w.xmin + i * (w.xmax - w.xmin) / (W - 1); act.forEach(f => { const y = this.evalF(f, x); if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }); } if (isFinite(lo)) { if (hi - lo < 1e-9) { lo -= 1; hi += 1; } const p = (hi - lo) * 0.05; set(w.xmin, w.xmax, lo - p, hi + p); } break; }
      }
    }
    gcalcMenu(g) {
      const C = [['value', 'value'], ['zero', 'zero'], ['minimum', 'min'], ['maximum', 'max'], ['intersect', 'isect'], ['dy/dx', 'dydx'], ['∫f(x)dx', 'integ']];
      this.menu(this.cfg.calcTitle || 'CALCULATE', C.map(([l, c]) => ({ label: l, fn: () => this.gcalc(c, g) })), { cols: 1, per: this.cfg.menuPer });
    }
    gcalc(c, g) {
      const act = this.activeFns(); if (!act.length) { this.flash('No function'); return; }
      if (!act.includes(g.fi)) g.fi = act[0];
      const w = this.win, f = (x) => this.evalF(g.fi, x); const W = this.cfg.W;
      if (!(g.cx >= w.xmin && g.cx <= w.xmax)) g.cx = (w.xmin + w.xmax) / 2;
      g.trace = true; g.free = false; g.shade = null;
      const xs = []; for (let i = 0; i < W * 2; i++) xs.push(w.xmin + i * (w.xmax - w.xmin) / (W * 2 - 1));
      const nearest = (cands) => cands.length ? cands.sort((p, q) => Math.abs(p - g.cx) - Math.abs(q - g.cx))[0] : null;
      const bisect = (h, a, b) => { let fa = h(a); for (let k = 0; k < 80; k++) { const m = (a + b) / 2, fm = h(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; };
      const golden = (h, a, b) => { const r = (Math.sqrt(5) - 1) / 2; let c1 = b - r * (b - a), d1 = a + r * (b - a); for (let k = 0; k < 100; k++) { if (h(c1) < h(d1)) b = d1; else a = c1; c1 = b - r * (b - a); d1 = a + r * (b - a); } return (a + b) / 2; };
      const zeroOf = (h) => { const c2 = []; for (let i = 1; i < xs.length; i++) { const a = h(xs[i - 1]), b = h(xs[i]); if (isFinite(a) && isFinite(b) && (a === 0 || a * b < 0) && Math.abs(a - b) < (w.ymax - w.ymin) * 4) c2.push(bisect(h, xs[i - 1], xs[i])); } return nearest(c2); };
      const done = (lab, x, y) => { g.cx = E.round15(x); g.cy = y == null ? f(x) : y; g.msg = lab; };
      switch (c) {
        case 'value': this.push(new FormScreen(this, 'value', [{ label: (this.cfg.xName || 'X') + '=', value: E.round15(g.cx) }], (v) => { this.pop(); done('', v[0]); }, { per: 3 })); return;
        case 'zero': { const z = zeroOf(f); if (z == null) { g.msg = 'No sign change'; return; } done('Zero', z, 0); return; }
        case 'min': case 'max': { const s = c === 'min' ? 1 : -1; const h = (x) => { const y = f(x); return isFinite(y) ? s * y : Infinity; }; const c2 = []; for (let i = 1; i < xs.length - 1; i++) { const a = h(xs[i - 1]), b = h(xs[i]), d = h(xs[i + 1]); if (b <= a && b <= d && isFinite(b) && (b < a || b < d)) c2.push(golden(h, xs[i - 1], xs[i + 1])); } let x = nearest(c2); if (x == null) { g.msg = 'No ' + (c === 'min' ? 'Minimum' : 'Maximum'); return; } done(c === 'min' ? 'Minimum' : 'Maximum', x); return; }
        case 'isect': { const k = act.indexOf(g.fi); if (act.length < 2) { g.msg = 'Need 2 functions'; return; } const o = act[(k + 1) % act.length]; const h = (x) => f(x) - this.evalF(o, x); const z = zeroOf(h); if (z == null) { g.msg = 'No intersection'; return; } done('Intersection', z); return; }
        case 'dydx': { const d = E.derivative(f, g.cx); g.cy = f(g.cx); g.msg = 'dy/dx=' + fmtS(d, 8); return; }
        case 'integ': this.push(new FormScreen(this, '∫f(x)dx', [{ label: 'Lower Limit ' + (this.cfg.xName || 'X') + '=', value: E.round15(w.xmin + (w.xmax - w.xmin) / 4) }, { label: 'Upper Limit ' + (this.cfg.xName || 'X') + '=', value: E.round15(w.xmax - (w.xmax - w.xmin) / 4) }], (v) => { this.pop(); const r = E.integrate(f, v[0], v[1]); g.shade = [v[0], v[1], g.fi]; done('∫f(x)dx=' + fmtS(r, 8), v[1]); }, { per: 3 })); return;
      }
    }
    // ---- stats ----
    statRows() { const L1 = this.lists[0], L2 = this.lists[1]; const r = []; for (let i = 0; i < L1.length; i++) if (L1[i] != null && L2[i] != null) r.push([L1[i], L2[i]]); return r; }
    listEditor() {
      const n = Math.max(this.lists[0].length, this.lists[1].length, this.lists[2].length); const rows = [];
      for (let i = 0; i < n; i++) rows.push([this.lists[0][i] ?? null, this.lists[1][i] ?? null, this.lists[2][i] ?? null]);
      const names = this.cfg.listNames || ['L₁', 'L₂', 'L₃'];
      this.push(new GridScreen(this, this.cfg.listTitle || '', names, rows, { growable: true, per: this.cfg.gridRows || 6, onChange: (rs) => { this.lists = [0, 1, 2].map(j => rs.map(r => r[j]).filter((v, i, arr) => true)); this.lists.forEach(L => { while (L.length && L[L.length - 1] == null) L.pop(); }); }, extra: (a) => { if (a === 'stat' || a === 'calcmenu') { this.statMenuG(); return true; } return this.navKey(a); } }));
      return true;
    }
    statMenuG() {
      const R = (t, L) => this.push(new ResultScreen(this, t, L, { per: this.cfg.menuPer }));
      const xs = () => { const v = this.lists[0].filter(x => x != null); if (!v.length) throw new E.CalcError('ERR:DIM MISMATCH'); return v; };
      const one = () => { const s = E.stats(xs()); R('1-Var Stats', [['x̄=', s.mean], ['Σx=', s.Σx], ['Σx²=', s.Σx2], ['Sx=', s.sx], ['σx=', s.σx], ['n=', s.n], ['minX=', s.min], ['Q1=', s.Q1], ['Med=', s.med], ['Q3=', s.Q3], ['maxX=', s.max]]); };
      const two = () => { const r = this.statRows(); if (!r.length) throw new E.CalcError('ERR:DIM MISMATCH'); const s = E.stats(r.map(q => q[0]), r.map(q => q[1])); R('2-Var Stats', [['x̄=', s.mean], ['Σx=', s.Σx], ['Σx²=', s.Σx2], ['Sx=', s.sx], ['σx=', s.σx], ['n=', s.n], ['ȳ=', s.ymean], ['Σy=', s.Σy], ['Σy²=', s.Σy2], ['Sy=', s.sy], ['σy=', s.σy], ['Σxy=', s.Σxy]]); };
      const reg = (type, name) => {
        const r = this.statRows(); if (r.length < 2) throw new E.CalcError('ERR:DIM MISMATCH');
        const g = E.regression(type, r.map(q => q[0]), r.map(q => q[1])); this.lastReg = g;
        let eq, L;
        if (type === 'lin') { eq = `${g.b}*X+${g.a}`; L = [['y=ax+b', ''], ['a=', g.b], ['b=', g.a]]; }
        else if (type === 'quad') { eq = `${g.c}*X²+${g.b}*X+${g.a}`; L = [['y=ax²+bx+c', ''], ['a=', g.c], ['b=', g.b], ['c=', g.a]]; }
        else if (type === 'log') { eq = `${g.a}+${g.b}*ln(X)`; L = [['y=a+b·ln x', ''], ['a=', g.a], ['b=', g.b]]; }
        else if (type === 'exp' || type === 'abx') { eq = `${g.a}*${type === 'exp' ? Math.exp(g.b) : g.b}^X`; L = [['y=a·b^x', ''], ['a=', g.a], ['b=', type === 'exp' ? Math.exp(g.b) : g.b]]; }
        else { eq = `${g.a}*X^${g.b}`; L = [['y=a·x^b', ''], ['a=', g.a], ['b=', g.b]]; }
        if (g.r != null && isFinite(g.r)) L.push(['r²=', g.r * g.r], ['r=', g.r]);
        this.regEq = eq.replace(/e([+-]?\d+)/g, 'ᴇ$1').replace(/\+-/g, '-').replace(/-/g, '~').replace(/ᴇ~/g, 'ᴇ-');
        L.push(['→' + this.fname(0) + ' & graph', '<span class="hint">[EXE]</span>']);
        this.push(new ResultScreen(this, name, L.map(([l, v]) => [l, v]), { per: this.cfg.menuPer, onClose: (a) => { if (a === 'exe' || a === 'enter' || a === 'ok') this.storeReg(); } }));
      };
      this.menu('STAT', [{ label: 'Edit lists…', fn: () => this.listEditor() }, { label: 'SortA(L₁) (pairs)', fn: () => { const r = this.lists[0].map((x, i) => [x, this.lists[1][i], this.lists[2][i]]).sort((p, q) => p[0] - q[0]); this.lists = [0, 1, 2].map(j => r.map(q => q[j]).filter(v => v != null)); } }, { label: 'ClrList', fn: () => { this.lists = [[], [], []]; } },
        { label: '1-Var Stats', fn: one }, { label: '2-Var Stats', fn: two }, { label: 'LinReg(ax+b)', fn: () => reg('lin', 'LinReg') }, { label: 'QuadReg', fn: () => reg('quad', 'QuadReg') }, { label: 'LnReg', fn: () => reg('log', 'LnReg') }, { label: 'ExpReg', fn: () => reg('abx', 'ExpReg') }, { label: 'PwrReg', fn: () => reg('pow', 'PwrReg') },
        { label: 'Distributions…', fn: () => this.distMenu() }], { cols: 1, per: this.cfg.menuPer });
    }
    storeReg() {
      if (!this.regEq) return; const f = this.yf[0]; f.ed.clear();
      const src = this.regEq; const tok = []; for (const ch of src) tok.push({ d: { '*': '', '~': '−', 'ᴇ': 'ᴇ' }[ch] ?? (ch === 'X' ? '<i>' + (this.cfg.xName || 'X') + '</i>' : ch), s: ch });
      // compact numbers: keep as single tokens per char is fine
      f.ed.fromTokens(tok); f.on = true; this.plot1 = true; this.dirty(); this.zoom('zstat'); this.navKey('graph');
    }
    // ---- drawing ----
    draw(cv, g) {
      const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height, w = this.win, mono = this.cfg.mono;
      const th = this.cfg.gtheme || {}; const bg = th.bg || (mono ? 'rgba(0,0,0,0)' : '#fff'), fg = th.fg || (mono ? '#1d2318' : '#000'), gridC = th.grid || '#e4e4e4', axC = th.axis || fg;
      ctx.clearRect(0, 0, W, H); if (!mono) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
      const px = (x) => (x - w.xmin) / (w.xmax - w.xmin) * (W - 1), py = (y) => (w.ymax - y) / (w.ymax - w.ymin) * (H - 1);
      const dot = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
      const lineM = (x0, y0, x1, y1, c) => { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0; while (n++ < 4000) { if (x0 >= 0 && x0 < W && y0 >= -1 && y0 <= H) dot(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
      // grid
      if (this.gridOn && w.xscl > 0 && w.yscl > 0 && (w.xmax - w.xmin) / w.xscl < W / 3 && (w.ymax - w.ymin) / w.yscl < H / 3) {
        for (let x = Math.ceil(w.xmin / w.xscl) * w.xscl; x <= w.xmax; x += w.xscl) for (let y = Math.ceil(w.ymin / w.yscl) * w.yscl; y <= w.ymax; y += w.yscl) {
          if (mono) dot(px(x), py(y), fg); else { ctx.fillStyle = gridC; ctx.fillRect(Math.round(px(x)), 0, 1, H); ctx.fillRect(0, Math.round(py(y)), W, 1); }
        }
      }
      // axes
      const ax = py(0), ay = px(0);
      ctx.fillStyle = axC;
      if (ax >= 0 && ax <= H - 1) { ctx.fillRect(0, Math.round(ax), W, 1); if (w.xscl > 0 && (w.xmax - w.xmin) / w.xscl < W / 2) for (let x = Math.ceil(w.xmin / w.xscl) * w.xscl; x <= w.xmax; x += w.xscl) ctx.fillRect(Math.round(px(x)), Math.round(ax) - 1, 1, 3); }
      if (ay >= 0 && ay <= W - 1) { ctx.fillRect(Math.round(ay), 0, 1, H); if (w.yscl > 0 && (w.ymax - w.ymin) / w.yscl < H / 2) for (let y = Math.ceil(w.ymin / w.yscl) * w.yscl; y <= w.ymax; y += w.yscl) ctx.fillRect(Math.round(ay) - 1, Math.round(py(y)), 3, 1); }
      if (!mono && this.cfg.axisLabels) { ctx.fillStyle = '#666'; ctx.font = Math.round(H / 22) + 'px sans-serif'; ctx.fillText(fmtS(w.xmax, 3), W - ctx.measureText(fmtS(w.xmax, 3)).width - 2, Math.min(H - 3, Math.max(10, ax + 11))); ctx.fillText(fmtS(w.ymax, 3), Math.min(W - 30, Math.max(2, ay + 3)), 10); }
      // shading for integral
      const act = this.activeFns();
      if (g.shade) { const [a, b, fi] = g.shade; ctx.fillStyle = mono ? fg : this.yf[fi].color + '55'; for (let i = Math.ceil(px(a)); i <= Math.floor(px(b)); i++) { const x = w.xmin + i * (w.xmax - w.xmin) / (W - 1); const y = py(this.evalF(fi, x)); if (!isFinite(y)) continue; const y0 = Math.max(0, Math.min(H, ax)), y1 = Math.max(0, Math.min(H, y)); if (mono && i % 2) continue; ctx.fillRect(i, Math.min(y0, y1), 1, Math.abs(y1 - y0)); } }
      // functions
      act.forEach(fi => {
        const col = mono ? fg : this.yf[fi].color; const samp = mono ? 1 : 2; let prev = null;
        if (!mono) { ctx.strokeStyle = col; ctx.lineWidth = this.cfg.lineW || 2; ctx.lineJoin = 'round'; ctx.beginPath(); }
        for (let i = 0; i <= (W - 1) * samp; i++) {
          const sx = i / samp; const x = w.xmin + sx * (w.xmax - w.xmin) / (W - 1); const y = this.evalF(fi, x); const sy = py(y);
          if (!isFinite(sy) || Math.abs(sy) > H * 20) { prev = null; continue; }
          if (prev && Math.abs(sy - prev[1]) < H * 1.5) { if (mono) lineM(prev[0], prev[1], sx, sy, col); else ctx.lineTo(sx, sy); }
          else { if (mono) { if (sy >= 0 && sy < H) dot(sx, sy, col); } else ctx.moveTo(sx, sy); }
          prev = [sx, sy];
        }
        if (!mono) ctx.stroke();
      });
      // stat plot
      if (this.plot1) { const c = mono ? fg : '#333'; this.statRows().forEach(([x, y]) => { const X = Math.round(px(x)), Y = Math.round(py(y)); if (mono) { ctx.fillStyle = c; ctx.fillRect(X - 1, Y - 1, 3, 3); ctx.clearRect(X, Y, 1, 1); } else { ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.strokeRect(X - 2.5, Y - 2.5, 5, 5); } }); }
      // cursor
      if ((g.trace && g.fi >= 0) || g.free) {
        const X = Math.round(px(g.cx)), Y = Math.round(py(g.cy)); const c = mono ? fg : (g.trace ? this.yf[g.fi].color : '#000');
        if (isFinite(Y)) {
          if (g.trace) { if (mono) { [[-2, -2], [-1, -1], [1, 1], [2, 2], [-2, 2], [-1, 1], [1, -1], [2, -2]].forEach(([a, b]) => dot(X + a, Y + b, c)); ctx.clearRect(X, Y, 1, 1); dot(X, Y, c); } else { ctx.fillStyle = '#fff'; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, 4, 0, 7); ctx.fill(); ctx.stroke(); } }
          else { ctx.fillStyle = c; ctx.fillRect(X - 2, Y, 5, 1); ctx.fillRect(X, Y - 2, 1, 5); }
        }
        if (g.box && g.box.stage === 1) { ctx.strokeStyle = mono ? fg : '#000'; ctx.lineWidth = 1; ctx.strokeRect(Math.min(px(g.box.x0), X) + .5, Math.min(py(g.box.y0), Y) + .5, Math.abs(X - px(g.box.x0)), Math.abs(Y - py(g.box.y0))); }
      }
    }
    // ---- rendering ----
    renderHome() {
      const nat = this.natural; const o = { fmt: this.fmt, eStyle: this.cfg.eStyle, linearFrac: !nat, angle: this.angle };
      const maxH = this.cfg.histShow || 12; const H = this.hist.slice(-maxH);
      let html = '<div class="ghist">';
      H.forEach((h, idx) => {
        const exact = nat && this.cfg.exact !== false && !/[0-9]\.|\.[0-9]|ᴇ/.test(h.src || '');
        let out = U.valueHTML(h.value, Object.assign({}, o, { exact, hint: { sqrt: 1, pi: /π/.test(h.src || '') } }));
        if (this.cfg.approxToo && exact && E.isNum(h.value)) { const d = U.valueHTML(h.value, Object.assign({}, o, { exact: false })); if (U.stripTags(d) !== U.stripTags(out)) out = `${out}<span class="aprx">≈</span>${d}`; }
        html += `<div class="hrow"><div class="hin">${U.renderNatural(h.tokens, -1)}</div><div class="hout">${out}</div></div>`;
      });
      const cur = this.res ? (this.cfg.keepLastInput ? -1 : 0) : this.ed.c;
      html += `<div class="hrow cur"><div class="in ${nat ? 'nat' : 'lin'}">${this.res ? '<span class="cur"></span>' : U.renderNatural(this.ed.t, cur)}</div></div>`;
      if (this.err) html += `<div class="gerr">${this.err}</div>`;
      return html + '</div>';
    }
    status() {
      const fam = this.cfg.gfam; const top = this.top;
      const ang = { deg: 'DEG', rad: 'RAD', grad: 'GRAD' }[this.angle];
      const t = (top && top.title) || this.cfg.homeTitle || '';
      const fl = (this.shift ? `<b class="sf">${this.cfg.shiftName || '2nd'}</b>` : '') + (this.alpha ? '<b class="af">A</b>' : '');
      if (fam === 'ti') return (this.shift || this.alpha) ? `<div class="gstat ti">${fl}</div>` : '';
      if (fam === 'fxg') return `<div class="gstat fxg">${fl}<span>${this.natural ? 'Math' : ''}</span><span>${ang.slice(0, 3)}</span><span>${this.fmt.mode === 'fix' ? 'Fix' : 'Norm1'}</span><span>${this.mode === 'CMPLX' ? 'a+bi' : 'Real'}</span></div>`;
      if (fam === 'nw') { const d = new Date(); return `<div class="gstat nw">${fl}<span class="t">${t || 'Calculation'}</span><span>${ang}</span><span class="bat"></span></div>`; }
      if (fam === 'cgx') { const d = new Date(); return `<div class="gstat cgx">${fl}<span class="t">${t || 'Function'}</span><span>${this.angle === 'deg' ? '°' : 'rad'}</span><span>${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span></div>`; }
      if (fam === 'tpad') return `<div class="gstat tpad"><span class="tab">1.1</span><span class="t">${t || 'Scratchpad'}</span>${fl}<span>${ang}</span><span class="bat"></span></div>`;
      if (fam === 'cp') return `<div class="gstat cp"><span>Edit</span><span>Action</span><span>Interactive</span>${fl}</div><div class="cptools"><span>½⇔½</span><span>Simp</span><span>∫dx</span><span>${this.natural ? 'Standard' : 'Decimal'}</span><span>${ang.slice(0, 3)}</span><span>Real</span></div>`;
      return '';
    }
    render() {
      const top = this.top; let body;
      if (!this.on) { this.el.innerHTML = '<div class="gs off"></div>'; return; }
      try { body = top.render(); } catch (e) { console.error(e); body = '<div class="msg">Error</div>'; }
      let soft = '';
      const s = top.soft && top.soft();
      if (s && this.cfg.softKeys) soft = `<div class="gsk">${s.map((x, i) => `<span data-act="${x[1]}">${x[0]}</span>`).join('')}</div>`;
      if (this.kbdOpen && this.cfg.touchKbd) soft += `<div class="tkbd">${this.cfg.touchKbd.map(r => `<div class="tkr">${r.map(x => `<span data-act="${x[1]}">${x[0]}</span>`).join('')}</div>`).join('')}</div>`;
      const toast = this.err && top !== this.home ? `<div class="toast">${this.err}</div>` : '';
      this.el.innerHTML = `<div class="gs fam-${this.cfg.gfam} ${this.cfg.mono ? 'mono' : 'color'}">${this.status()}<div class="gbody ${top === this.home ? 'home' : ''}">${top === this.home ? body : `<div class="lines sub">${body}</div>`}</div>${soft}${toast}</div>`;
      if (top !== this.home) this.err = null;
      if (top.after) top.after(this.el);
      const hb = this.el.querySelector('.ghist'); if (hb) hb.scrollTop = hb.scrollHeight;
    }
  }
  G.GraphApp = GraphApp; G.GraphScreens = { YEditScreen, GraphScreen, TableScreen, WindowScreen, AppGrid, HomeScreen };
})(window);
