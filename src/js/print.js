/* Printing desk calculator (adding-machine logic) with paper tape */
(function (G) {
  'use strict';
  const E = G.CalcEngine, U = G.CalcUI;
  class PrintApp {
    constructor(model, el) { this.model = model; this.el = el; this.cfg = Object.assign({ digits: 12 }, model.cfg || {}); this.reset(true); }
    reset(all) {
      this.entry = null; this.x = 0; this.acc = 0; this.accActive = false; this.mulOp = null; this.mulA = null; this.err = false; this.items = 0;
      if (all) { this.M = 0; this.GT = 0; this.rate = 8; this.dec = 'F'; this.round = '5/4'; this.print = true; this.tape = []; this.gtOn = true; this.csm = {}; }
      this.pctPending = null; this.rateSet = false; this.lastSym = ''; this.lastCalc = [];
    }
    setTapeEl(el) { this.tapeEl = el; }
    // ---- formatting ----
    roundV(v) {
      const d = this.dec; if (d === 'F' || d === 'A' && this.entry != null) return E.round15(v);
      const n = d === 'A' ? 2 : +d; const f = Math.pow(10, n);
      if (this.round === '↑') return Math.ceil(v * f - 1e-9) / f; if (this.round === '↓') return Math.trunc(v * f) / f; return Math.round(v * f + (v >= 0 ? 1e-9 : -1e-9)) / f;
    }
    fmt(v, forTape) {
      v = this.roundV(v); const d = this.dec;
      let s;
      if (d === 'F') { s = E.formatNumber(v, { mode: 'norm1', digits: this.cfg.digits }); if (s.exp != null) { this.err = true; return 'E'; } s = s.mant; }
      else s = v.toFixed(d === 'A' ? 2 : +d);
      let [ip, fp] = s.replace('-', '').split('.'); ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (v < 0 ? '-' : '') + ip + '.' + (fp || '');
    }
    out(num, sym, cls) { if (!this.print) return; this.tape.push({ n: num == null ? '' : (typeof num === 'string' ? num : this.fmt(num, true)), s: sym || '', c: cls || '' }); if (this.tape.length > 300) this.tape.shift(); this.lastCalc.push(this.tape[this.tape.length - 1]); }
    val() { if (this.entry == null) return this.x; let v = parseFloat(this.entry || '0'); if (this.dec === 'A' && !this.entry.includes('.')) v = v / 100; return v; }
    check(v) { if (!isFinite(v) || Math.abs(v) >= 1e12) { this.err = true; throw new E.CalcError('E'); } return E.round15(v); }
    digit(d) { if (this.entry == null) this.entry = ''; if (this.entry.replace(/[-.]/g, '').length >= this.cfg.digits) return; if (this.entry === '0') this.entry = ''; this.entry += d; }
    // ---- keys ----
    press(kd) {
      const a = kd.act;
      if (this.err && !['ca', 'c', 'onca', 'clr'].includes(a)) { this.render(); return; }
      try { this.handle(a); } catch (e) { this.err = true; if (!(e instanceof E.CalcError)) console.error(e); }
      this.render();
    }
    handle(a) {
      const dm = /^d(\d)$/.exec(a); if (dm) { this.digit(dm[1]); return; }
      if (a.startsWith('decsw:')) { this.dec = a.slice(6); return; }
      if (a.startsWith('rndsw:')) { this.round = a.slice(6); return; }
      if (a.startsWith('prtsw:')) { this.print = a.slice(6) !== 'NP'; return; }
      if (this.rateSet && !/^d|dot|^tax/.test(a)) this.rateSet = false;
      switch (a) {
        case 'd00': this.digit('0'); this.digit('0'); return;
        case 'd000': this.digit('0'); this.digit('0'); this.digit('0'); return;
        case 'dot': if (this.entry == null) this.entry = '0'; if (!this.entry.includes('.')) this.entry += '.'; return;
        case 'bksp': if (this.entry != null) { this.entry = this.entry.slice(0, -1); if (!this.entry) { this.entry = null; this.x = 0; } } return;
        case 'chs': if (this.entry != null) this.entry = this.entry.startsWith('-') ? this.entry.slice(1) : '-' + this.entry; else this.x = -this.x; return;
        case 'c': if (this.entry != null) { this.entry = null; this.x = this.accActive ? this.acc : 0; return; } this.err = false; this.entry = null; this.x = 0; return;
        case 'ca': case 'onca': this.out(null, '', 'sep'); this.reset(false); this.x = 0; this.err = false; return;
        case 'add': case 'sub': case 'addeq': {
          if (this.mulOp && this.entry != null && this.pctPending == null) { // e.g. a × b +  -> = then add
            this.equals(); }
          const v = this.val(); this.entry = null;
          if (this.pctPending) { const p = this.pctPending; this.pctPending = null; const r = this.check(a === 'sub' ? p.base - p.part : p.base + p.part); this.out(r, a === 'sub' ? '−' : '+'); this.x = r; return; }
          this.acc = this.check(this.acc + (a === 'sub' ? -v : v)); this.accActive = true; this.items++;
          this.out(v, a === 'sub' ? '−' : '+', a === 'sub' ? 'neg' : ''); this.x = this.acc; this.lastSym = a === 'sub' ? '−' : '+'; return; }
        case 'mul': case 'div': { const v = this.val(); this.entry = null; this.mulA = v; this.mulOp = a; this.out(v, a === 'mul' ? '×' : '÷'); this.x = v; return; }
        case 'eq': case 'addeq=': return this.equals();
        case 'pct': {
          const v = this.val(); this.entry = null;
          if (!this.mulOp) { this.x = v / 100; this.out(v, '%'); return; }
          const A = this.mulA; let r;
          if (this.mulOp === 'mul') { r = A * v / 100; this.pctPending = { base: A, part: r }; } else { if (!v) throw new E.CalcError('E'); r = A / v * 100; }
          this.out(v, '%'); r = this.check(r); this.out(r, '', 'res'); this.mulOp = null; this.x = r; this.addGT(r); return; }
        case 'dpct': { const v = this.val(); this.entry = null; if (this.dpA == null) { this.dpA = v; this.out(v, 'Δ%'); this.x = v; return; } const A = this.dpA; this.dpA = null; if (!A) throw new E.CalcError('E'); const r = this.check((v - A) / A * 100); this.out(v, ''); this.out(r, '%', 'res'); this.x = r; return; }
        case 'mumd': { const v = this.val(); this.entry = null;
          if (this.mulOp === 'div') { const cost = this.mulA; if (v >= 100) throw new E.CalcError('E'); const sell = this.check(cost / (1 - v / 100)); this.out(v, 'MU'); this.out(sell, '', 'res'); this.muProfit = sell - cost; this.mulOp = null; this.x = sell; return; }
          if (this.muProfit != null) { this.x = this.check(this.muProfit); this.out(this.x, '', ''); this.muProfit = null; } return; }
        case 'tot': case 'star': { if (this.mulOp && this.entry != null) this.equals(); const v = this.accActive ? this.acc : this.val(); this.entry = null; this.out(v, '*', 'tot'); if (this.accActive) this.addGT(v); this.x = v; this.acc = 0; this.accActive = false; this.itemsShown = this.items; this.items = 0; return; }
        case 'sub*': case 'subtot': { const v = this.acc; this.entry = null; this.out(v, '◇', 'tot'); this.x = v; return; }
        case 'gt': { this.entry = null; this.out(this.GT, 'G*', 'tot'); this.x = this.GT; this.GT = 0; return; }
        case 'gtsub': { this.entry = null; this.out(this.GT, 'G◇', 'tot'); this.x = this.GT; return; }
        case 'mplus': case 'mminus': { if (this.mulOp && this.entry != null) this.equals(); const v = this.val(); this.entry = null; this.M = this.check(this.M + (a === 'mplus' ? v : -v)); this.out(v, a === 'mplus' ? 'M+' : 'M−'); this.x = v; return; }
        case 'msub': this.entry = null; this.x = this.M; this.out(this.M, 'M◇', 'tot'); return;
        case 'mtot': this.entry = null; this.x = this.M; this.out(this.M, 'M*', 'tot'); this.M = 0; return;
        case 'mr': this.entry = null; this.x = this.M; return;
        case 'mc': this.M = 0; return;
        case 'rateset': this.rateSet = true; this.entry = null; this.x = this.rate; return;
        case 'taxp': case 'taxm': {
          const v = this.val(); this.entry = null;
          if (this.rateSet) { this.rate = v; this.rateSet = false; this.out(v, '%', ''); this.out('RATE', '', 'lab'); this.x = v; return; }
          const r = this.rate / 100; let total, tax;
          if (a === 'taxp') { tax = this.roundV(v * r); total = v + tax; this.out(v, ''); this.out(tax, 'TAX+'); this.out(total, '*', 'tot'); }
          else { total = this.roundV(v / (1 + r)); tax = v - total; this.out(v, ''); this.out(tax, 'TAX−'); this.out(total, '*', 'tot'); }
          this.x = this.check(total); this.taxShown = true; return; }
        case 'cost': case 'sell': case 'mar': {
          const nm = { cost: 'COST', sell: 'SELL', mar: 'MAR' }[a];
          if (this.entry != null) { const v = this.val(); this.entry = null; this.csm[a] = v; this.out(v, nm); this.x = v; this.csmLabel = nm; }
          const k = this.csm; const known = ['cost', 'sell', 'mar'].filter(q => k[q] != null);
          if (known.length >= 2) { const miss = ['cost', 'sell', 'mar'].find(q => k[q] == null) || (known.includes(a) ? ['cost', 'sell', 'mar'].find(q => q !== a && q !== known.find(z => z !== a)) : a);
            if (miss && k[miss] == null) { const r = E.csm(k.cost, k.sell, k.mar); k[miss] = r; this.out(r, { cost: 'COST', sell: 'SELL', mar: 'MAR%' }[miss], 'res'); if (miss !== 'mar') this.out(k.sell - k.cost, 'PROFIT', ''); this.x = r; this.csmLabel = { cost: 'COST', sell: 'SELL', mar: 'MAR' }[miss]; this.csm = {}; } }
          return; }
        case 'nonadd': { const v = this.val(); this.entry = null; this.out(this.entry || String(Math.trunc(v)), '#', ''); this.x = v; return; }
        case 'it': this.x = this.items; this.entry = null; this.itemShow = true; return;
        case 'time': { const d = new Date(); this.out(d.toLocaleDateString() + ' ' + d.toTimeString().slice(0, 5), '', 'lab'); this.clock = true; return; }
        case 'date': { const d = new Date(); this.out(d.toLocaleDateString(), '', 'lab'); return; }
        case 'feed': this.tape.push({ n: '', s: '', c: 'blank' }); return;
        case 'reprint': { const L = this.lastCalc.slice(-12); this.tape.push({ n: '-- REPRINT --', s: '', c: 'lab' }); L.forEach(l => this.tape.push(Object.assign({}, l))); return; }
        case 'prt': this.print = !this.print; return;
        case 'up': this.rateSet = true; this.x = this.rate; this.entry = null; return;
        case 'down': this.x = this.rate; this.entry = null; return;
        case 'noop': return;
      }
    }
    equals() {
      const v = this.val(); this.entry = null;
      if (!this.mulOp) { this.x = v; return; }
      const A = this.mulA; let r = this.mulOp === 'mul' ? A * v : (v === 0 ? NaN : A / v);
      if (isNaN(r)) throw new E.CalcError('E');
      r = this.check(r); this.out(v, '='); this.out(r, '*', 'res'); this.x = this.roundV(r); this.mulOp = null; this.addGT(this.x); this.lastSym = '=';
    }
    addGT(v) { if (this.gtOn) this.GT = this.check(this.GT + v); }
    render() {
      const txt = this.err ? 'E' : this.entry != null ? (this.entry || '0') + (this.entry.includes('.') ? '' : '.') : this.fmt(this.x);
      const ann = [['M', this.M !== 0], ['−', !this.err && (this.entry != null ? this.entry.startsWith('-') : this.x < 0)], ['E', this.err], ['GT', this.GT !== 0], ['RATE', this.rateSet], ['TAX', this.taxShown], ['K', false]];
      this.taxShown = false;
      const items = String(this.items).padStart(3, ' ');
      this.el.innerHTML = `<div class="segwrap desk"><div class="ind">${ann.map(([l, on]) => `<span class="${on ? 'on' : 'off'}">${l}</span>`).join('')}<span class="it">${U.segSVG(items, 3)}</span></div><div class="segrow"><span class="segmain">${U.segSVG(txt.replace('-', ''), this.cfg.digits, { commas: true })}</span></div></div>`;
      if (this.tapeEl) {
        this.tapeEl.innerHTML = this.tape.slice(-40).map(l => `<div class="tl ${l.c}"><span class="tn">${l.n}</span><span class="ts">${l.s}</span></div>`).join('');
        this.tapeEl.scrollTop = this.tapeEl.scrollHeight;
      }
    }
  }
  G.PrintApp = PrintApp;
})(window);
