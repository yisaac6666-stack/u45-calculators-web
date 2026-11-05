/* U-45 CALCULATORS app shell: home list, routing, stage scaling, PWA */
(function (G) {
  'use strict';
  const U = G.CalcUI;
  const $ = (s) => document.querySelector(s);
  const CLASSES = { sci: 'SciApp', aos: 'AOSApp', fin: 'FinAOS', rpn42: 'RPNApp', rpn35: 'RPN35', rpn12: 'RPN12', print: 'PrintApp', graph: 'GraphApp', spec: 'SpecApp', specrpn: 'SpecRPN', specgraph: 'SpecGraph' };
  let current = null, detachKbd = null;
  const pad2 = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const SND = (o) => { try { if (G.U45Sound) G.U45Sound.play(o); } catch (e) { /* audio is optional */ } };
  let lastList = '#/';
  let pageParent = '#/';
  /** Page header. v1.5: every non-root page gets a labelled "← Back" (previous screen, via the U45Nav stack) and "⌂ Menu". */
  function header(title, sub, back, backTo, backLabel, noJump) {
    const brand = back ? '' : ' brand'; pageParent = back ? (backTo || '#/') : null;
    $('#hdr').innerHTML = (back ? `<button class="back u45-back" id="bk" aria-label="Back to the previous screen" title="Back (previous screen${backLabel ? ' · else ' + esc(backLabel) : ''}) — also Alt+← / browser or phone Back">← Back</button><button class="back home" id="hm" aria-label="Main menu">⌂ Menu</button>` : '') + `<h1 class="${brand.trim()}">${title}</h1><span class="sub">${sub || ''}</span><span class="sp"></span>` +
      (back && !noJump ? '<select id="jump" aria-label="Jump to calculator">' + G.CALC_LIST.map(c => `<option value="${c.id}">#${c.id} ${esc(c.name)}</option>`).join('') + '</select>' : back ? '' : '<button type="button" class="hbtn" id="hsnd" aria-label="Sound settings">♪ Sounds</button>');
    if (back) { $('#bk').onclick = () => { SND('back'); if (G.U45Nav) G.U45Nav.back('button'); else location.hash = backTo || '#/'; }; $('#hm').onclick = () => { SND('back'); location.hash = '#/'; }; }
    else $('#hsnd').onclick = () => G.U45SoundUI && G.U45SoundUI.open();
  }
  if (G.U45Nav) G.U45Nav.setParent(() => pageParent);

  /** Main menu: exactly 5 numbered, expandable categories with counts and numbered items. */
  function menuHome(open) {
    teardown(); lastList = open ? '#/cat/' + open : '#/';
    if (open) header('U-45 CALCULATORS', 'category ' + open, true, '#/', 'Menu', true); else header('U-45 CALCULATORS', 'choose a category');
    const M = G.U45Menu.MENU;
    const favs = G.U45Workout ? G.U45Workout.getFavs() : [];
    const snd = G.U45Sound ? G.U45Sound.settings() : { on: false };
    $('#main').innerHTML = `<div id="menu">
      <p class="mintro">${M.length} categories · ${G.U45Menu.total} purpose presets · each opens a working calculator with a worked example. <a class="soundchip" href="#" id="msnd">♪ Sound: ${snd.on ? (snd.mute ? 'muted' : 'on') : 'off'}</a></p>
      ${M.map(c => { const on = open === c.n; return `<section class="mcat${on ? ' open' : ''}" style="--mc:${c.color}">
        <button type="button" class="mcat-h" data-c="${c.n}" aria-expanded="${on}" aria-controls="mc${c.n}"><span class="nb big">${c.n}</span><span class="mt">${esc(c.t)}</span><span class="mcount" aria-label="${c.items.length} items">${c.items.length}</span><span class="chev" aria-hidden="true">${on ? '▾' : '▸'}</span></button>
        <ol class="mitems" id="mc${c.n}"${on ? '' : ' hidden'}>${c.items.map(it => { const m = G.getCalcModel(it.id); return `<li><a href="#/m/${it.code}"><span class="nb">${it.code}</span><span class="mi-t">${esc(it.t)}</span><span class="mi-s">#${it.id} ${esc(m ? m.name : '')} · ${esc(it.ex)}</span></a></li>`; }).join('')}</ol></section>`; }).join('')}
      ${favs.length ? `<section class="mfav"><h2>★ Pinned (${favs.length})</h2><ol class="mitems">${favs.map((f, i) => `<li><a href="${esc(f.href)}"><span class="nb">${i + 1}</span><span class="mi-t">${esc(f.title)}</span></a></li>`).join('')}</ol></section>` : ''}
      <a class="allbtn" href="#/all"><span class="nb big">45</span><span>All 45 calculators — full catalogue by group</span></a>
      <nav class="xhome" aria-label="Extra features">${XPAGES.map((x, i) => `<a class="xtra" href="${x.h}"><span class="nb">${23 + i}</span><span class="ni" aria-hidden="true">${x.i}</span><span class="nl">${x.t}</span><small>${x.d()}</small></a>`).join('')}</nav>
    </div>`;
    document.querySelectorAll('.mcat-h').forEach(b => b.onclick = () => { const n = +b.dataset.c; SND(open === n ? 'back' : 'categoryOpen'); location.hash = open === n ? '#/' : '#/cat/' + n; });
    $('#msnd').onclick = (e) => { e.preventDefault(); if (G.U45SoundUI) G.U45SoundUI.open(); };
    if (open) { const el = document.querySelector('.mcat.open'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); } else window.scrollTo(0, 0);
  }

  /** Full catalogue of all 45 (the original grouped home). */
  function home() {
    teardown(); lastList = '#/all';
    header('U-45 CALCULATORS', 'all 45 calculators', true, '#/', 'Menu');
    $('#jump').outerHTML = '<input id="flt" placeholder="Filter…" aria-label="Filter">';
    const groups = {};
    G.CALC_LIST.forEach(c => (groups[c.group] = groups[c.group] || []).push(c));
    const order = Object.keys(G.CALC_GROUPS);
    $('#main').innerHTML = `<div id="home">${order.filter(g => groups[g]).map(g => {
      const meta = G.CALC_GROUPS[g];
      const list = groups[g];
      const name = typeof meta === 'object' ? meta.name : meta;
      const n = typeof meta === 'object' ? meta.n : '';
      const desc = typeof meta === 'object' ? meta.desc : '';
      const use = typeof meta === 'object' ? meta.use : '';
      const nc = (meta && meta.nameColor) || '#aab2c0';
      const dc = (meta && meta.descColor) || '#cfd6e4';
      const uc = (meta && meta.useColor) || '#9ad1ff';
      return `<section class="group" data-g="${g}" style="--g-name:${nc};--g-desc:${dc};--g-use:${uc}">
        <h2><span class="gseq">GROUP ${n}</span> — <span class="gname">${esc(name)}</span> <span class="gcount">(${list.length})</span></h2>
        <p class="gdesc">${esc(desc)}</p>
        <p class="guse"><span class="guse-lab">Use:</span> ${esc(use)}</p>
        <div class="cards">${list.map((c, i) =>
          `<a class="card" href="#/calc/${c.id}" data-n="${esc((c.name + ' ' + c.id).toLowerCase())}"><div class="th"><img loading="lazy" src="img/thumbs/${pad2(c.id)}.jpg" alt=""></div><div class="cn"><span class="badge-seq">${i + 1}</span><b>#${c.id}</b>${esc(c.name)}</div></a>`
        ).join('')}</div></section>`;
    }).join('')}</div>`;
    $('#flt').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.card').forEach(c => { c.style.display = c.dataset.n.includes(q) ? '' : 'none'; });
      document.querySelectorAll('.group').forEach(g => { g.style.display = [...g.querySelectorAll('.card')].some(c => c.style.display !== 'none') ? '' : 'none'; });
    };
    window.scrollTo(0, 0);
  }

  /** Split prose notes into discrete feature items for a numbered list. */
  function notesToFeatures(notes) {
    if (!notes) return [];
    let s = String(notes).replace(/\s+/g, ' ').trim();
    // Split on semicolons and on sentence boundaries (capital letter after .!?)
    let parts = s.split(/\s*;\s*|(?<=[.!?])\s+(?=[A-Z(])/);
    // If still a single long blob, soft-split on " and " / " with " clauses that look like features
    if (parts.length === 1 && parts[0].length > 180) {
      const soft = parts[0].split(/\s+(?=(?:Also|Not |Does |Supports |Includes |Starts |Features )\b)/i);
      if (soft.length > 1) parts = soft;
    }
    return parts.map(p => p.trim().replace(/^[-•*]\s*/, '').replace(/[.;]+$/, '').trim()).filter(p => p.length > 2);
  }

  const ST_LABEL = { live: '✔ LIVE', ui: 'UI', plan: 'PLANNED' };
  const ST_TITLE = { live: 'Working now on this calculator (engine-backed)', ui: 'App / interface capability (works now, not calculator math)', plan: 'Documented roadmap item — not yet wired in this build' };
  const LEGEND = [['num', '#FFFFFF'], ['op', '#FFD600'], ['fn', '#0039CB'], ['mem', '#00C853'], ['clr', '#C00000'], ['mod', '#000000']];

  function renderNotes(notes, model) {
    const kb = '<p class="kbdhelp"><b>Keyboard:</b> digits, <kbd>+ − * / ^ ( ) .</kbd>, <kbd>Enter</kbd> = EXE/=, <kbd>Backspace</kbd> = DEL, <kbd>Esc</kbd> = AC/clear, arrow keys = cursor pad. Every key carries a number badge (<kbd>#</kbd> button hides them); hover a key to see “#N name”. Full manual: <code>docs/manuals/</code>.</p>';
    const CF = G.CalcFeatures;
    let out = '';
    if (CF && model) {
      const fl = CF.featuresFor(model);
      const n = { live: 0, ui: 0, plan: 0 }; fl.forEach(f => n[f.st]++);
      out += `<h3>${fl.length} features — ${n.live} live · ${n.ui} app/UI · ${n.plan} planned</h3>`;
      out += '<ol class="feat-list">' + fl.map(f => `<li><span class="fst ${f.st}" title="${ST_TITLE[f.st]}">${ST_LABEL[f.st]}</span>${esc(f.t)}</li>`).join('') + '</ol>';
      const feats = notesToFeatures(notes);
      if (feats.length) out += '<h3>Model notes</h3><ul class="mnotes">' + feats.map(f => `<li>${esc(f)}</li>`).join('') + '</ul>';
    } else {
      const feats = notesToFeatures(notes);
      if (feats.length) out += '<ol class="feat-list">' + feats.map(f => `<li>${esc(f)}</li>`).join('') + '</ol>';
    }
    return out + kb;
  }

  function legendHtml() {
    const GN = U.GROUP_NAMES || {};
    return '<div class="klegend" aria-label="Key colour groups">' + LEGEND.map(([g, c]) => `<span><i style="background:${c}${g === 'mod' ? ';box-shadow:inset 0 0 0 2px #00E5FF' : ''}"></i>${esc(GN[g] || g)}</span>`).join('') + '</div>';
  }

  function pref(k, v) { try { if (v === undefined) return localStorage.getItem('u45.' + k); localStorage.setItem('u45.' + k, v); } catch (e) { return null; } }
  function applyPrefs() {
    document.body.classList.toggle('no-knum', pref('knum') === 'off');
    document.body.classList.toggle('classic-keys', pref('kcol') === 'classic');
  }

  /** Visible display text: lit annunciators only, 7-segment SVGs read from their data-t. */
  function screenText(scr) {
    const c = scr.cloneNode(true);
    c.querySelectorAll('.off,.soff,.scoff,.ghost').forEach(e => e.remove());
    c.querySelectorAll('svg[data-t]').forEach(e => e.replaceWith(document.createTextNode(' ' + e.getAttribute('data-t') + ' ')));
    c.querySelectorAll('div,br,tr,li').forEach(e => e.insertAdjacentText('afterend', '\n'));
    return (c.textContent || '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  }

  function fallbackCopy(t) {
    try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }

  function teardown() { document.body.className = document.body.className.replace(/\b(vm|lay)-[\w-]+/g, '').trim(); { const r = document.getElementById('u45-restore'); if (r) r.hidden = true; } if (detachKbd) { detachKbd(); detachKbd = null; } if (current && G.U45Workout) G.U45Workout.detach(); current = null; window.__calc = null; if (G.U45Nav) G.U45Nav.dropAll(); document.querySelectorAll('.u45-sheet,.u45-sheet-stacked,.photo-pop').forEach(e => e.remove()); }

  /** Sound + workout hook around every key press (calculator keys, keyboard, slides, paste). */
  function pressHook(kd) {
    const app = current; if (!app) return;
    const GS = G.GraphScreens && G.GraphScreens.GraphScreen; const onGraph = () => !!(GS && app.top instanceof GS);
    const before = { err: app.err, graph: onGraph(), mark: app.mark, prevAct: app.prevAct };
    const E = G.CalcEngine; const t0 = Date.now();
    app.press(kd);
    if (current !== app) return;
    const S = G.U45Sound; let occ = S ? S.classify(kd.act, app) : 'keyTap';
    const errNow = app.err;
    if (errNow && errNow !== before.err) {
      const hint = E && E.HINT && E.HINT.t >= t0 - 5 ? E.HINT.cause : null;
      occ = S ? S.errorOcc(errNow === true ? 'E' : String(errNow), hint) : 'mathError';
    } else {
      const TVM = { n: 1, i: 1, pv: 1, pmt: 1, fv: 1 };
      if (onGraph() && !before.graph) occ = 'graphPlot';
      else if (app.mark === '*' && before.mark !== '*') occ = 'finSolve';
      else if (TVM[kd.act] && TVM[before.prevAct] && 'tvm' in app) occ = 'finSolve';
      else if (/^(npv|irr|cpt|amort|bond)$/.test(kd.act || '') && !errNow) occ = 'finSolve';
    }
    SND(occ);
    if (G.U45Workout) G.U45Workout.onKey(kd, occ);
  }

  function show(id, item) {
    teardown();
    const model = G.getCalcModel(id);
    if (!model) { location.hash = '#/'; return; }
    const backTo = item ? '#/cat/' + item.cat : (lastList || '#/');
    header(`#${id} ${model.name}`, item ? item.code + ' ' + esc(item.t) : model.groupName, true, backTo, item ? 'Category' : (backTo === '#/all' ? 'All 45' : 'Menu'));
    $('#jump').value = String(id); $('#jump').onchange = (e) => { location.hash = '#/calc/' + e.target.value; };
    const W = G.U45Workout;
    $('#main').innerHTML = `<div id="view">${W ? W.navHTML() : ''}<div class="viewbar"><img class="ref" src="img/thumbs/${pad2(id)}.jpg" alt="Reference photo" title="Reference photo (click to enlarge)"><button id="rst">Reset</button><button id="zoom">Fit</button>${G.U45Rail ? G.U45Rail.layoutSelectHTML() : ''}<button id="knum" title="Show / hide key numbers">#</button><button id="kcol" title="Switch key colours">Classic</button><button id="copy" title="Copy the display text">Copy</button><span>Click keys or use the keyboard</span></div>${item ? `<div class="preset" role="note"><span class="nb">${item.code}</span><div><b>${esc(item.t)}</b><span>Worked example: ${esc(item.ex)}</span></div><button type="button" id="rerun">Run again</button></div>` : ''}${legendHtml()}<div id="stagewrap"><div id="stage"></div></div><section class="workout" id="workout" aria-label="Workout" aria-live="polite"></section><div class="notes" id="notes"></div></div>`;
    const Cls = G[CLASSES[model.app]];
    const proxy = { press: (kd) => current && pressHook(kd) };
    const built = U.buildCalc(model, proxy);
    const app = new Cls(model, built.screen);
    current = app; window.__calc = app;
    if (model.tape && app.setTapeEl) {
      const box = U.h('div', 'tapebox'); const tape = U.h('div', 'tape'); box.appendChild(tape);
      built.body.insertBefore(box, built.body.firstChild); app.setTapeEl(tape);
    }
    built.body.querySelectorAll('.slides button[data-act]').forEach(b => b.addEventListener('click', () => {
      b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      proxy.press({ act: b.dataset.act, face: b.textContent });
    }));
    $('#stage').appendChild(built.body);
    app.render();
    detachKbd = U.attachKeyboard(proxy, built.keyEls) || null;
    $('#notes').innerHTML = renderNotes(model.notes, model);
    if (W) W.attach({ app, model, item, screenEl: built.screen, proxy, keyEls: built.keyEls });
    const runPreset = () => {
      if (!item) return;
      try { G.U45Menu.apply(app, item); if (W) W.addStep('Preset ' + item.code + ': ' + item.ex, null, 'preset'); SND('equals'); }
      catch (e) { console.error(e); SND('mathError'); }
    };
    runPreset();
    if (item) $('#rerun').onclick = () => runPreset();
    applyPrefs();
    const syncBtns = () => {
      const kn = !document.body.classList.contains('no-knum'), cl = document.body.classList.contains('classic-keys');
      $('#knum').classList.toggle('on', kn); $('#knum').textContent = kn ? '# On' : '# Off';
      $('#kcol').textContent = cl ? 'Hi-Contrast' : 'Classic';
    };
    syncBtns();
    $('#knum').onclick = () => { SND('settingsToggle'); pref('knum', document.body.classList.contains('no-knum') ? 'on' : 'off'); applyPrefs(); syncBtns(); };
    $('#kcol').onclick = () => { pref('kcol', document.body.classList.contains('classic-keys') ? 'hc' : 'classic'); applyPrefs(); syncBtns(); };
    $('#copy').onclick = () => {
      const txt = screenText(built.screen);
      const done = (ok) => { const b = $('#copy'); if (!b) return; b.textContent = ok ? 'Copied ✔' : 'Copy failed'; setTimeout(() => { if ($('#copy')) $('#copy').textContent = 'Copy'; }, 1400); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => done(true), () => done(fallbackCopy(txt)));
        else done(fallbackCopy(txt));
      } catch (e) { done(fallbackCopy(txt)); }
    };
    $('#rst').onclick = () => { SND('allClear'); show(id, item); };
    $('.ref').onclick = () => {
      const p = U.h('div', 'photo-pop', `<button type="button" class="u45-back pp-back" aria-label="Back to the calculator">← Back</button><img src="img/photos/${pad2(id)}.jpg" alt="Reference photo of calculator ${id}">`); p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Reference photo');
      let nav = null, gone = false; const close = (src) => { if (gone) return; gone = true; p.remove(); if (nav && src !== 'pop' && src !== 'drop') nav.done(); };
      p.onclick = () => close('back'); document.body.appendChild(p); if (G.U45Nav) nav = G.U45Nav.open('photo', close, p);
    };
    if (G.U45Rail) { try { G.U45Rail.mount(id, item, app); } catch (e) { console.error(e); } syncBtns(); }
    let fit = true; $('#zoom').onclick = () => { fit = !fit; $('#zoom').textContent = fit ? 'Fit' : '1:1'; scale(fit); };
    scale(true);
    window.scrollTo(0, 0);
  }

  /**
   * Fit the calculator body into the viewport width.
   * Wide landscape bodies (Financial RPN 620px, Desk print 560px) must scale
   * below 1.0 on phones. Layout box width matches the scaled visual width so
   * nothing overflows horizontally.
   */
  /** Width available to the calculator — v1.5 restores the v1.3 rule (viewport minus 16 px); the feature strip now sits below. */
  function availW() { return Math.max(240, (window.innerWidth || document.documentElement.clientWidth) - 16); }
  function scale(fit) {
    const st = $('#stage'); if (!st || !st.firstChild) return;
    const body = st.firstChild;
    st.style.transform = '';
    st.style.width = '';
    st.style.height = '';
    st.style.overflow = '';
    st.style.transformOrigin = 'top left';
    if (!fit) {
      // 1:1 — still clamp if wider than viewport so phones never overflow
      const w = body.offsetWidth;
      const aw = availW();
      if (w > aw) {
        const s = aw / w;
        st.style.transform = `scale(${s})`;
        st.style.width = (w * s) + 'px';
        st.style.height = (body.offsetHeight * s) + 'px';
        st.style.overflow = 'hidden';
      }
      return;
    }
    // Force layout read of natural size
    const w = body.offsetWidth, h = body.offsetHeight;
    if (!w || !h) return;
    const L = G.U45Rail ? G.U45Rail.scaleOpts() : { max: 1.35, frac: 1 };
    const aw = availW() * L.frac;
    // Allow scale well below 1 for landscape bodies; cap upscale per layout (default 1.35)
    const s = Math.min(L.max, aw / w);
    st.style.transform = `scale(${s})`;
    // Layout box = visual size after scale (prevents horizontal overflow)
    st.style.width = Math.ceil(w * s) + 'px';
    st.style.height = Math.ceil(h * s) + 'px';
    st.style.overflow = 'hidden';
  }

  let lastRoute = '';
  const XPAGES = [
    { k: 'social', h: '#/social', i: '💬', t: 'Social', d: () => `${G.U45Social ? G.U45Social.FEATURES.length : 200}+ features · local-only, no server` },
    { k: 'ai', h: '#/ai', i: '🤖', t: 'AI Agent', d: () => `${G.U45AI ? G.U45AI.caps().length : 1000}+ capabilities · offline step-by-step solver` },
    { k: 'library', h: '#/library', i: '📚', t: 'Library', d: () => `${G.U45Library ? G.U45Library.COUNT : 1000} original books & guides · CC0` }];
  /** Social / AI Agent / Library pages (toolbar buttons 23–25). */
  function xpage(k, rest) {
    teardown(); const x = XPAGES.find(p => p.k === k);
    header(`${x.i} ${x.t}`, x.d(), true, rest ? '#/' + k : '#/', rest ? x.t : 'Menu');
    const j = $('#jump'); if (j) j.onchange = () => { location.hash = '#/calc/' + j.value; };
    $('#main').innerHTML = `<div id="xroot" class="xwrap"></div>`; const root = $('#xroot');
    if (k === 'social') G.U45Social.mount(root, rest); else if (k === 'ai') G.U45AI.page(root); else G.U45Library.page(root, rest ? +rest : 0);
    window.scrollTo(0, 0);
  }
  function route() {
    const h = location.hash || '#/';
    let m;
    if ((m = /^#\/m\/(\d+\.\d+)/.exec(h))) { const f = G.U45Menu.find(m[1]); if (f) { if (!/^#\/m\//.test(lastRoute)) SND('calcOpen'); show(f.item.id, f.item); } else menuHome(); }
    else if ((m = /^#\/calc\/(\d+)/.exec(h))) { SND('calcOpen'); show(+m[1]); }
    else if ((m = /^#\/cat\/(\d)/.exec(h))) menuHome(+m[1]);
    else if (/^#\/all/.test(h)) home();
    else if ((m = /^#\/(social|ai|library)(?:\/(.+))?$/.exec(h))) xpage(m[1], m[2] ? decodeURIComponent(m[2]) : '');
    else menuHome();
    lastRoute = h;
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', () => scale(!$('#zoom') || $('#zoom').textContent === 'Fit'));
  window.addEventListener('DOMContentLoaded', route);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

  // expose for security / tests
  G.CalcApp = { home, menuHome, show, route, scale, notesToFeatures, renderNotes, screenText };
})(window);
