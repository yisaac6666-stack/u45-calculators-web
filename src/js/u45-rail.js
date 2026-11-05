/* U-45 v1.4/v1.5 — labelled feature strip below the calculator (was a right-hand rail in v1.4), numbered tool panels, customization, settings, history UI, hide popup, view modes, layouts. */
(function (G) {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const P = () => G.U45Prefs, SH = () => G.U45Sheet, esc = (s) => SH().esc(s), toast = (m) => SH().toast(m);
  const LS = () => P().LS;
  const RAIL = [
    { k: 'currency', i: '💱', t: 'Currency' }, { k: 'units', i: '📏', t: 'Units' }, { k: 'health', i: '❤️', t: 'Health' },
    { k: 'simple', i: '➕', t: 'Simple' }, { k: 'complex', i: '∑', t: 'Complex' }, { k: 'loan', i: '🏦', t: 'Loans' },
    { k: 'construction', i: '🏗️', t: 'Construction' }, { k: 'mechanical', i: '🔩', t: 'Mechanical' }, { k: 'engineering', i: '📐', t: 'Engineering' },
    { k: 'calendar', i: '📅', t: 'Calendar' }, { k: 'customize', i: '🎨', t: 'Customize' }, { k: 'settings', i: '⚙️', t: 'Settings' },
    { k: 'history', i: '🕘', t: 'History' }, { k: 'hide', i: '🙈', t: 'Hide' }, { k: 'view', i: '🖥️', t: 'Layouts' }, { k: 'camsolve', i: '📷', t: 'Camera Solve' }];
  const I18N = {
    fr: { Currency: 'Devises', Units: 'Unités', Health: 'Santé', Simple: 'Simple', Complex: 'Avancé', Loans: 'Prêts', Construction: 'Bâtiment', Mechanical: 'Mécanique', Engineering: 'Ingénierie', Calendar: 'Calendrier', Customize: 'Personnaliser', Settings: 'Réglages', History: 'Historique', Hide: 'Masquer', View: 'Affichage', Layouts: 'Dispositions', 'Camera Solve': 'Photo-calcul', Back: 'Retour' },
    sw: { Currency: 'Sarafu', Units: 'Vipimo', Health: 'Afya', Simple: 'Rahisi', Complex: 'Changamani', Loans: 'Mikopo', Construction: 'Ujenzi', Mechanical: 'Mitambo', Engineering: 'Uhandisi', Calendar: 'Kalenda', Customize: 'Badilisha', Settings: 'Mipangilio', History: 'Historia', Hide: 'Ficha', View: 'Mwonekano', Layouts: 'Mpangilio', 'Camera Solve': 'Tatua kwa Picha', Back: 'Rudi' },
    es: { Currency: 'Divisas', Units: 'Unidades', Health: 'Salud', Simple: 'Simple', Complex: 'Avanzado', Loans: 'Préstamos', Construction: 'Construcción', Mechanical: 'Mecánica', Engineering: 'Ingeniería', Calendar: 'Calendario', Customize: 'Personalizar', Settings: 'Ajustes', History: 'Historial', Hide: 'Ocultar', View: 'Vista', Layouts: 'Diseños', 'Camera Solve': 'Resolver con cámara', Back: 'Atrás' },
    lg: { Currency: 'Ssente', Units: 'Ebipimo', Health: 'Obulamu', Calendar: 'Kalenda', Settings: 'Entegeka', History: 'Ebyayita', Hide: 'Kweka', View: 'Endabika', Layouts: 'Entegeka y’endabika', 'Camera Solve': 'Kamera', Back: 'Ddayo' }
  };
  const tr = (t) => { const l = P().settings().lang; return (I18N[l] && I18N[l][t]) || t; };
  let calcId = 0, appRef = null;

  // ================= layouts =================
  const LAYOUTS = [['auto', 'Auto'], ['3d-classic', '3D classic'], ['3d-hc', '3D high-contrast'], ['classic', 'Classic'], ['pocket', 'Pocket'], ['compact', 'Compact'], ['expanded', 'Expanded'], ['desktop-wide', 'Desktop wide'], ['split', 'Split'], ['one-left', 'One-hand left'], ['one-right', 'One-hand right'], ['large-print', 'Large-print'], ['minimal', 'Minimal']];
  const CAPS = { pocket: { max: 0.9, frac: 0.82 }, compact: { max: 1.1, frac: 1 }, expanded: { max: 1.8, frac: 1 }, 'large-print': { max: 2.2, frac: 1 }, 'one-left': { max: 1.2, frac: 0.9 }, 'one-right': { max: 1.2, frac: 0.9 }, 'desktop-wide': { max: 1.5, frac: 1 }, split: { max: 1.5, frac: 1 } };
  /** v1.5: Auto keeps the original v1.3 calculator fit on every screen (the feature strip is below the keypad). */
  function suggest() { return 'classic'; }
  function layoutChoice(id) { return LS().get('u45.lay.' + (id == null ? calcId : id), null) || LS().get('u45.lay', 'auto'); }
  function effectiveLayout() { const c = layoutChoice(); return c === 'auto' ? (P().settings().autoLayout === false ? 'classic' : suggest()) : c; }
  const sideBySide = (L) => (L === 'split' || L === 'desktop-wide') && (G.innerWidth || 0) >= 900;
  function applyLayout() {
    const b = document.body; LAYOUTS.forEach(([k]) => b.classList.remove('lay-' + k)); const L = effectiveLayout(); b.classList.add('lay-' + L);
    const sw = $('#stagewrap'), wo = $('#workout'); let row = $('#u45-row');
    if (sw && wo) {
      if (sideBySide(L)) { if (!row) { row = document.createElement('div'); row.id = 'u45-row'; sw.parentNode.insertBefore(row, sw); row.appendChild(sw); row.appendChild(wo); } }
      else if (row) { const strip = $('#u45-strip'); row.before(sw); if (strip) sw.after(strip); (strip || sw).after(wo); row.remove(); }
      const strip = $('#u45-strip'); if (strip) { const anchor = $('#u45-row') || sw; if (anchor.nextElementSibling !== strip) anchor.after(strip); }
    }
    const sel = $('#lay'); if (sel) { sel.value = layoutChoice(); const o = sel.querySelector('option[value="auto"]'); if (o) o.textContent = 'Auto (original fit)'; }
    return L;
  }
  function scaleOpts() { const L = effectiveLayout(); const o = Object.assign({ max: 1.35, frac: 1 }, CAPS[L] || {}); if (L === 'split' || L === 'desktop-wide') o.frac = sideBySide(L) ? (L === 'split' ? 0.52 : 0.64) : 1; return o; }
  function layoutSelectHTML() { return `<label class="laylab" for="lay"><span class="ll-i" aria-hidden="true">🖥️</span> Layout</label><select id="lay" title="Layout" aria-label="Layout">${LAYOUTS.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select>`; }
  function setLayout(v) { LS().set('u45.lay.' + calcId, v); LS().set('u45.lay', v); applyLayout(); rescale(); }
  function rescale() { if (G.CalcApp) G.CalcApp.scale(!$('#zoom') || $('#zoom').textContent === 'Fit'); }

  // ================= view / hide modes =================
  const MODES = [['normal', 'Normal (show everything)'], ['full', 'Full-screen calculator'], ['no-tools', 'Hide toolbar icons only'], ['no-rail', 'Hide feature strip only'], ['no-top', 'Hide top bars']];
  function setMode(m) {
    const b = document.body; MODES.forEach(([k]) => b.classList.remove('vm-' + k)); if (m && m !== 'normal') b.classList.add('vm-' + m);
    LS().set('u45.vmode', m || 'normal'); let r = $('#u45-restore');
    if (!r) { r = document.createElement('button'); r.id = 'u45-restore'; r.type = 'button'; r.title = 'Restore — show everything (or press Back / Esc)'; r.setAttribute('aria-label', 'Back: restore normal view'); r.innerHTML = '<span aria-hidden="true">⤢</span> Restore'; r.onclick = () => setMode('normal'); document.body.appendChild(r); }
    r.hidden = !(m && m !== 'normal');
    if (m === 'full') { try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* */ } }
    else if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) { /* */ } }
    setTimeout(rescale, 60);
  }
  if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.className.includes('vm-') && !$('.u45-sheet') && !$('.u45-pinbox')) setMode('normal'); });

  // ================= hide popup (per calculator) =================
  function hideItems() {
    const out = [];
    $$('#calcnav button[data-a]').forEach(b => { if (b.classList.contains('nav-toggle')) return; out.push(['nav:' + b.dataset.a, 'Toolbar', (b.querySelector('.nl') || b).textContent.trim()]); });
    $$('#calcnav a.xtra').forEach(a => out.push(['x:' + a.getAttribute('href'), 'Toolbar', a.textContent.replace(/\s+/g, ' ').trim()]));
    RAIL.forEach(r => out.push(['rail:' + r.k, 'Feature strip', r.t]));
    [['vb:ref', 'Reference photo'], ['vb:rst', 'Reset button'], ['vb:zoom', 'Fit button'], ['vb:lay', 'Layout selector'], ['vb:knum', '# key numbers button'], ['vb:kcol', 'Colours button'], ['vb:copy', 'Copy button'], ['vb:hint', 'Keyboard hint']].forEach(([k, t]) => out.push([k, 'View bar', t]));
    [['sec:preset', 'Preset / worked example'], ['sec:legend', 'Key colour legend'], ['sec:notes', 'Model notes']].forEach(([k, t]) => out.push([k, 'Sections', t]));
    [['me:workout', 'Workout steps & result (personal)'], ['me:history', 'History panel (personal)'], ['me:calendar', 'Calendar & my events (personal)'], ['me:camsolve', 'Camera Solve (personal photos)']].forEach(([k, t]) => out.push([k, 'Personal items', t]));
    return out;
  }
  function elFor(k) {
    const [t, v] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
    if (t === 'nav') return $$(`#calcnav button[data-a="${v}"]`); if (t === 'x') return $$(`#calcnav a.xtra[href="${v}"]`);
    if (t === 'rail') return $$(`#u45-rail [data-r="${v}"]`);
    if (t === 'vb' && v === 'lay') return $$('#lay, .laylab'); if (t === 'vb') return v === 'hint' ? $$('.viewbar > span') : v === 'ref' ? $$('.viewbar .ref') : $$('#' + v);
    if (t === 'sec') return v === 'preset' ? $$('.preset') : v === 'legend' ? $$('.klegend') : $$('#notes');
    if (t === 'me') return v === 'workout' ? $$('#workout') : v === 'history' ? $$('#u45-rail [data-r="history"]') : v === 'calendar' ? $$('#u45-rail [data-r="calendar"]') : $$('#calcnav [data-a="camsolve"], #u45-rail [data-r="camsolve"]');
    return [];
  }
  const hidden = (id) => LS().get('u45.hide.' + (id == null ? calcId : id), []);
  function applyHidden() { $$('.u45-hid').forEach(e => e.classList.remove('u45-hid')); hidden().forEach(k => elFor(k).forEach(e => e.classList.add('u45-hid'))); }
  async function setHidden(list, id) {
    const before = hidden(id); const unhiding = before.filter(k => !list.includes(k));
    if (unhiding.length && !(await G.U45Guard.requirePin('Unhiding ' + unhiding.length + ' item(s)', { always: true }))) return false;
    LS().set('u45.hide.' + (id == null ? calcId : id), list); applyHidden(); return true;
  }
  function openHide() {
    const items = hideItems(), cur = new Set(hidden()); let grp = '';
    const html = `<p class="u45-note">Tick what to hide on <b>this calculator</b>. Hiding is instant; <b>unhiding needs the passcode</b>.</p><div class="hid-tools"><input type="search" class="hid-q" placeholder="Filter…" aria-label="Filter items"><button class="hid-all">Tick all</button><button class="hid-none">Untick all 🔒</button></div><div class="hid-list">` +
      items.map(([k, g, t], i) => { const h = g !== grp ? `${grp ? '</fieldset>' : ''}<fieldset><legend>${esc(g)}</legend>` : ''; grp = g; const lock = k === 'rail:hide' || k === 'rail:view'; return h + `<label class="ck"><input type="checkbox" value="${esc(k)}"${cur.has(k) ? ' checked' : ''}${lock ? ' disabled' : ''}><span class="nb">${i + 1}</span>${esc(t)}${lock ? ' (always visible)' : ''}</label>`; }).join('') + '</fieldset></div><div class="cal-btns"><button class="pri hid-ok">Apply</button><button class="hid-cancel">Cancel</button></div>';
    const sh = SH().sheet('🙈 Hide items — calculator #' + calcId, html, { wide: true }); const b = sh.body;
    b.querySelector('.hid-q').oninput = (e) => { const q = e.target.value.toLowerCase(); $$('.hid-list label', b).forEach(l => { l.hidden = q && !l.textContent.toLowerCase().includes(q); }); };
    b.querySelector('.hid-all').onclick = () => $$('.hid-list input:not(:disabled)', b).forEach(c => { c.checked = true; });
    b.querySelector('.hid-none').onclick = () => $$('.hid-list input', b).forEach(c => { c.checked = false; });
    b.querySelector('.hid-cancel').onclick = () => sh.close();
    b.querySelector('.hid-ok').onclick = async () => { const list = $$('.hid-list input:checked', b).map(c => c.value); if (await setHidden(list)) { sh.close(); toast(list.length + ' item(s) hidden'); } else toast('Not changed — passcode needed to unhide'); };
  }

  // ================= generic tool panel =================
  const NAMES = { currency: 'Currency', units: 'Units (exact SI factors)', health: 'Health', simple: 'Simple', complex: 'Complex', loan: 'Loans', construction: 'Construction', mechanical: 'Mechanical', engineering: 'Engineering' };
  function inputHTML(spec, idx) {
    const [k, label, d, opt] = spec; const id = 'tp' + idx + '-' + k;
    let ctl;
    if (opt === 'cur') { const N = G.U45FX.names(); ctl = `<select id="${id}" name="${k}">${G.U45FX.codes().map(c => `<option value="${c}"${c === d ? ' selected' : ''}>${c}${N[c] ? ' — ' + esc(N[c]) : ''}</option>`).join('')}</select>`; }
    else if (Array.isArray(opt)) ctl = `<select id="${id}" name="${k}">${opt.map(o => `<option${String(o) === String(d) ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (typeof d === 'number') ctl = `<input id="${id}" name="${k}" type="text" inputmode="decimal" value="${d}" autocomplete="off">`;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) ctl = `<input id="${id}" name="${k}" type="date" value="${d}">`;
    else ctl = `<input id="${id}" name="${k}" type="text" value="${esc(d)}" autocomplete="off">`;
    return `<label for="${id}">${esc(label)}</label>${ctl}`;
  }
  function num(s) { const n = Number(String(s).replace(/[,_\s\u202F]/g, '').replace(/^−/, '-')); if (!isFinite(n) || String(s).trim() === '') throw new Error('enter a valid number'); return n; }
  function fmtCell(v) { return typeof v === 'number' ? P().fmt(+v.toPrecision(15)) : esc(v); }
  async function runTool(panel, tool, form, out, log) {
    const v = {}; try {
      tool.i.forEach(([k, , d]) => { const el = form.elements[k]; v[k] = typeof d === 'number' ? num(el.value) : el.value; });
      out.innerHTML = '<span class="tp-busy">…</span>';
      const r = await tool.f(v, {}); const rows = Array.isArray(r) ? r : r.rows || []; const tb = Array.isArray(r) ? null : r.table;
      out.innerHTML = `<table class="tp-res">${rows.map(([l, val, u]) => `<tr><th>${esc(l)}</th><td>${fmtCell(val)}</td><td>${esc(u || '')}</td></tr>`).join('')}</table>` +
        (tb ? `<details class="tp-more"><summary>Full table (${tb.rows.length})</summary><table class="tp-tab"><tr>${tb.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${tb.rows.slice(0, 400).map(rw => `<tr>${rw.map(c => `<td>${fmtCell(c)}</td>`).join('')}</tr>`).join('')}</table></details>` : '') +
        (tool.d ? `<p class="tp-d">${esc(tool.d)}</p>` : '');
      if (log && rows.length && G.U45History) { const first = rows[0]; G.U45History.log(calcId, `${NAMES[panel] || panel}: ${tool.t} (${tool.i.map(([k, l]) => l + '=' + v[k]).join(', ')})`, (typeof first[1] === 'number' ? P().fmt(first[1]) : first[1]) + (first[2] ? ' ' + first[2] : ''), { src: 'rail:' + panel }); }
      return rows;
    } catch (e) { out.innerHTML = `<p class="tp-err" role="alert">⚠ ${esc(e.message || e)}</p>`; return null; }
  }
  function fxStatus() { const i = G.U45FX.info(); const age = Date.now() - (i.fetched || new Date(i.date).getTime()); const h = age / 3600e3; return `Rates: <b>${esc(i.source)}</b> · dated ${esc(String(i.date).slice(0, 16).replace('T', ' '))} UTC · ${i.count} currencies · ${h < 1 ? Math.round(h * 60) + ' min' : h < 48 ? h.toFixed(1) + ' h' : Math.round(h / 24) + ' days'} old${i.bundled ? ' (offline bundled snapshot)' : ''}`; }
  function openPanel(k) {
    const tools = (G.U45Panels || {})[k] || []; const r = RAIL.find(x => x.k === k);
    const sh = SH().sheet(`${r.i} ${tr(r.t)} — ${tools.length} features`, `${k === 'health' ? '<p class="tp-warn" role="note">⚕ <b>Not medical advice.</b> These are standard published formulas for information and education only. Always consult a qualified health professional.</p>' : ''}${k === 'currency' ? '<div class="fx-bar"><span class="fx-st"></span> <button class="fx-up">↻ Update now</button></div>' : ''}<input type="search" class="tp-q rn" placeholder="Search ${tools.length} tools…" aria-label="Search tools"><ol class="tp-list">${tools.map((t, i) => `<li data-i="${i}"><details><summary><span class="nb">${i + 1}</span> ${esc(t.t)}</summary><form class="tp-form" data-i="${i}"></form><div class="tp-out" aria-live="polite"></div></details></li>`).join('')}</ol>`, { wide: true });
    const b = sh.body;
    if (k === 'currency') {
      const st = b.querySelector('.fx-st'); const paint = () => { st.innerHTML = fxStatus(); }; paint();
      G.U45FX.update(false).then(r2 => { paint(); if (r2 && r2.ok && !r2.cached) toast('Exchange rates updated'); });
      b.querySelector('.fx-up').onclick = async () => { st.textContent = 'Updating…'; const r2 = await G.U45FX.update(true, P().settings().fxSource); paint(); toast(r2.ok ? 'Rates updated' : 'Not updated: ' + r2.error); };
    }
    b.querySelector('.tp-q').oninput = (e) => { const q = e.target.value.toLowerCase(); $$('.tp-list > li', b).forEach(li => { li.hidden = q && !li.textContent.toLowerCase().includes(q); }); };
    $$('.tp-list details', b).forEach(d => d.addEventListener('toggle', () => {
      if (!d.open) return; const f = d.querySelector('form'); if (f.childElementCount) return; const i = +f.dataset.i, t = tools[i];
      f.innerHTML = `<div class="tp-grid">${t.i.map(s => inputHTML(s, i)).join('')}</div><button type="submit" class="pri">= Calculate</button>`;
      const out = d.querySelector('.tp-out'); f.onsubmit = (e) => { e.preventDefault(); runTool(k, t, f, out, true); };
      if (!/Update rates/.test(t.t)) runTool(k, t, f, out, false);
    }));
    return sh;
  }

  // ================= customization =================
  const CUST_UI = [
    ['theme', 'Colour theme (max contrast)', 'theme'], ['bg', 'Calculator body colour', 'color'], ['text', 'Label text colour', 'color'], ['key', 'Key colour', 'color'], ['keyText', 'Key text colour', 'color'], ['accent', 'Accent / outline colour', 'color'],
    ['fontDisplay', 'Display & label font', 'font'], ['fontKeys', 'Key font', 'font'], ['fontScale', 'Text size %', [70, 200, 5]], ['keyScale', 'Key size %', [70, 160, 5]],
    ['keyShape', 'Key shape', ['model', 'square', 'soft', 'rounded', 'pill', 'circle']], ['gap', 'Key spacing px (0 = model)', [0, 20, 1]], ['border', 'Key border px', [0, 6, 1]], ['bold', 'Bold key text', 'bool'], ['upper', 'Uppercase labels', 'bool'],
    ['sound', 'Key sound', ['keep', 'on', 'off']], ['vol', 'Sound volume %', [0, 100, 5]], ['haptics', 'Haptic feedback (vibration)', 'bool'], ['hapticMs', 'Haptic strength ms', [5, 60, 5]],
    ['decimals', 'Decimal places for panels & history (−1 = auto)', [-1, 12, 1]], ['thousands', 'Thousands separator', [',', '.', 'space', "'", 'none']], ['decimal', 'Decimal mark', ['.', ',']],
    ['angle', 'Angle mode (scientific models)', ['model', 'deg', 'rad', 'grad']], ['knum', 'Key numbers #', ['keep', 'on', 'off']], ['outline', 'Thick display outline', 'bool'], ['reduceMotion', 'Reduce motion', 'bool']];
  function custField(spec, c, i) {
    const [k, label, kind] = spec; const v = c[k]; const id = 'cu-' + k; let ctl;
    if (k === 'theme') ctl = `<select id="${id}">${Object.keys(P().THEMES).map(t => `<option value="${t}"${t === v ? ' selected' : ''}>${t === 'model' ? 'Model default' : t}</option>`).join('')}</select>`;
    else if (kind === 'color') ctl = `<span class="cu-col"><input type="color" id="${id}" value="${v || '#000000'}"><label class="ck"><input type="checkbox" data-use="${k}"${v ? ' checked' : ''}>use</label></span>`;
    else if (kind === 'font') ctl = `<select id="${id}">${Object.keys(P().FONTS).map(f => `<option value="${f}"${f === v ? ' selected' : ''} style="font-family:${P().FONTS[f] || 'inherit'}">${f === 'model' ? 'Model default' : f}</option>`).join('')}</select>`;
    else if (kind === 'bool') ctl = `<input type="checkbox" id="${id}"${v ? ' checked' : ''}>`;
    else if (Array.isArray(kind) && typeof kind[0] === 'number') ctl = `<span class="cu-rng"><input type="range" id="${id}" min="${kind[0]}" max="${kind[1]}" step="${kind[2]}" value="${v}"><output>${v}</output></span>`;
    else ctl = `<select id="${id}">${kind.map(o => `<option value="${esc(o)}"${String(o) === String(v) ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    return `<div class="cu-row"><label for="${id}"><span class="nb">${i + 1}</span>${esc(label)}</label>${ctl}</div>`;
  }
  function openCustomize() {
    const c = P().cust();
    const sh = SH().sheet(`🎨 Customize calculator #${calcId} — ${CUST_UI.length} options`, `<p class="u45-note">Saved for <b>this calculator</b> only. <label class="ck"><input type="checkbox" class="cu-glob"> Apply changes to all calculators</label></p><div class="cu-grid">${CUST_UI.map((s, i) => custField(s, c, i)).join('')}</div><div class="cal-btns"><button class="cu-reset">Reset this calculator</button><button class="pri cu-done">Done</button></div>`, { wide: true });
    const b = sh.body; const glob = () => b.querySelector('.cu-glob').checked;
    const set = (k, v) => { P().setCust(k, v, glob() ? '*' : calcId); if (glob()) P().setCust(k, v, calcId); P().onCalc(calcId, appRef); rescale(); };
    CUST_UI.forEach(([k, , kind]) => {
      const el = b.querySelector('#cu-' + k); if (!el) return;
      if (kind === 'color') { const use = b.querySelector(`[data-use="${k}"]`); const upd = () => set(k, use.checked ? el.value : ''); el.oninput = () => { use.checked = true; upd(); }; use.onchange = upd; return; }
      el.oninput = el.onchange = () => { let v = el.type === 'checkbox' ? el.checked : el.value; if (el.type === 'range') { v = +v; const o = el.parentNode.querySelector('output'); if (o) o.textContent = v; } set(k, v); };
    });
    b.querySelector('.cu-reset').onclick = () => { P().resetCust(calcId); sh.close(); P().onCalc(calcId, appRef); rescale(); toast('Customization reset'); };
    b.querySelector('.cu-done').onclick = () => sh.close();
  }

  // ================= settings =================
  const SET_UI = [
    ['lang', 'Language (rail & panel labels)', [['en', 'English'], ['fr', 'Français'], ['sw', 'Kiswahili'], ['lg', 'Luganda'], ['es', 'Español']]], ['precision', 'Display precision (significant digits)', [4, 15, 1]],
    ['fxAuto', 'Auto-update exchange rates', 'bool'], ['fxHours', 'Rate update interval (hours)', [1, 72, 1]], ['fxSource', 'Exchange-rate source', [['erapi', 'open.er-api.com (166 currencies)'], ['frankfurter', 'Frankfurter / ECB (≈30)']]],
    ['offline', 'Offline mode (never use the network)', 'bool'], ['_fxnow', 'Update exchange rates now', 'btn'], ['histOn', 'Save calculation history', 'bool'], ['histMax', 'History entries kept per calculator', [50, 5000, 50]], ['confirmDel', 'Confirm before deleting', 'bool'],
    ['pinTimeout', 'Remember passcode for (minutes, 0 = ask every time)', [0, 30, 1]], ['_pin', 'Change passcode', 'btn'], ['_lock', 'Lock now (forget passcode)', 'btn'], ['wmText', 'Watermark text on exported images', 'text'], ['blockSave', 'Block right-click / drag / long-press image saving', 'bool'],
    ['ocrOnline', 'Camera Solve: allow online OCR languages', 'bool'], ['ocrLang', 'Camera Solve: default OCR language', [['eng', 'English (offline)'], ['fra', 'French'], ['deu', 'German'], ['spa', 'Spanish'], ['por', 'Portuguese'], ['swa', 'Swahili']]],
    ['reduceMotion', 'Reduce motion', 'bool'], ['railLabels', 'Feature-strip label size (labels always shown)', [['auto', 'Normal'], ['on', 'Large'], ['off', 'Compact']]], ['autoLayout', 'Auto layout = original calculator fit', 'bool'],
    ['clock24', '24-hour clock', 'bool'], ['weekStart', 'Week starts on', [[1, 'Monday'], [0, 'Sunday'], [6, 'Saturday']]], ['_backup', 'Backup settings, customization & history (JSON) 🔒', 'btn'], ['_restore', 'Restore from backup 🔒', 'btn'],
    ['_resetCalc', "Reset this calculator's customization & hidden items 🔒", 'btn'], ['_resetAll', 'Reset all settings 🔒', 'btn'], ['_clearHist', 'Delete ALL history (all calculators) 🔒', 'btn'], ['_privacy', 'Privacy summary', 'btn'],
    ['_install', 'Install / download this app 🔒', 'btn'], ['_share', 'Share this app 🔒', 'btn'], ['_about', 'About & version', 'btn']];
  async function confirmPin(reason) { return G.U45Guard.requirePin(reason, { always: true }); }
  function openSettings() {
    const s = P().settings();
    const field = ([k, label, kind], i) => {
      const id = 'se-' + k; let ctl; const v = s[k];
      if (kind === 'btn') ctl = `<button type="button" id="${id}">${esc(label.replace(/ 🔒$/, ''))}${/🔒/.test(label) ? ' 🔒' : ''}</button>`;
      else if (kind === 'bool') ctl = `<input type="checkbox" id="${id}"${v ? ' checked' : ''}>`;
      else if (kind === 'text') ctl = `<input type="text" id="${id}" value="${esc(v)}" maxlength="40">`;
      else if (typeof kind[0] === 'number') ctl = `<span class="cu-rng"><input type="range" id="${id}" min="${kind[0]}" max="${kind[1]}" step="${kind[2]}" value="${v}"><output>${v}</output></span>`;
      else ctl = `<select id="${id}">${kind.map(([o, t]) => `<option value="${o}"${String(o) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
      return `<div class="cu-row"><label for="${id}"><span class="nb">${i + 1}</span>${esc(kind === 'btn' ? label.replace(/ 🔒$/, '') : label)}</label>${ctl}</div>`;
    };
    const sh = SH().sheet(`⚙️ Settings — ${SET_UI.length} options`, `<div class="cu-grid">${SET_UI.map(field).join('')}</div><p class="u45-note se-msg" aria-live="polite"></p><input type="file" accept="application/json,.json" class="se-file" hidden>`, { wide: true });
    const b = sh.body, msg = b.querySelector('.se-msg');
    SET_UI.forEach(([k, , kind]) => {
      const el = b.querySelector('#se-' + k); if (!el || kind === 'btn') return;
      el.oninput = el.onchange = () => { let v = el.type === 'checkbox' ? el.checked : el.value; if (el.type === 'range' || k === 'weekStart') v = +v; if (el.type === 'range') el.parentNode.querySelector('output').textContent = v; P().setSetting(k, v); if (k === 'lang' || k === 'railLabels') buildRail(); if (k === 'autoLayout') { applyLayout(); rescale(); } };
    });
    const on = (k, f) => { const el = b.querySelector('#se-' + k); if (el) el.onclick = f; };
    on('_fxnow', async () => { msg.textContent = 'Updating…'; const r = await G.U45FX.update(true, P().settings().fxSource); msg.innerHTML = r.ok ? fxStatus() : 'Not updated: ' + esc(r.error); });
    on('_pin', async () => {
      const o = prompt('Current passcode'); if (o == null) return; const n = prompt('New passcode (4–8 digits)'); if (n == null) return;
      if (!/^\d{4,8}$/.test(n)) { msg.textContent = 'New passcode must be 4–8 digits.'; return; }
      let ok = false; if (G.U45Secure) ok = await G.U45Secure.changePin(o, n); else ok = await G.U45Guard.checkPin(o);
      msg.textContent = ok ? 'Passcode changed.' : 'Current passcode is wrong.';
    });
    on('_lock', () => { G.U45Guard.lockNow(); msg.textContent = 'Passcode forgotten for this session.'; });
    on('_backup', async () => {
      if (!(await confirmPin('Creating a backup'))) return;
      const data = {}; Object.keys(localStorage).filter(k => /^u45\.(settings|cust\.|lay|hide\.|cal$|hist\.|histk$|knum|kcol|fx\.cache|vmode)/.test(k)).forEach(k => { data[k] = localStorage.getItem(k); });
      const note = 'History is stored encrypted; a backup restores it only on a device that keeps the same key (u45.histk) — the key is included only if history uses the local key.';
      const txt = JSON.stringify({ app: 'U-45 CALCULATORS', v: '1.5.2', created: new Date().toISOString(), note, data }, null, 1);
      G.U45Guard.saveFile({ name: 'U45-backup-' + new Date().toISOString().slice(0, 10) + '.json', mime: 'application/json', data: new TextEncoder().encode(txt) }, 'download');
    });
    on('_restore', async () => { if (!(await confirmPin('Restoring a backup'))) return; const f = b.querySelector('.se-file'); f.onchange = async () => { try { const j = JSON.parse(await f.files[0].text()); let n = 0; Object.entries(j.data || {}).forEach(([k, v]) => { if (/^u45\./.test(k) && k !== 'u45.pin') { localStorage.setItem(k, v); n++; } }); msg.textContent = 'Restored ' + n + ' item(s). Reloading…'; setTimeout(() => location.reload(), 800); } catch (e) { msg.textContent = 'Not a valid backup: ' + e.message; } }; f.click(); });
    on('_resetCalc', async () => { if (!(await confirmPin('Resetting this calculator'))) return; P().resetCust(calcId); LS().del('u45.hide.' + calcId); LS().del('u45.lay.' + calcId); applyHidden(); applyLayout(); P().onCalc(calcId, appRef); rescale(); msg.textContent = 'Calculator #' + calcId + ' reset.'; });
    on('_resetAll', async () => { if (!(await confirmPin('Resetting all settings'))) return; if (P().settings().confirmDel && !confirm('Reset ALL settings, customizations, layouts and hidden items? History is kept.')) return; Object.keys(localStorage).filter(k => /^u45\.(settings|cust\.|lay|hide\.|vmode)/.test(k)).forEach(k => localStorage.removeItem(k)); P().apply(); applyHidden(); applyLayout(); buildRail(); rescale(); sh.close(); toast('All settings reset'); });
    on('_clearHist', async () => { if (!(await confirmPin('Deleting all history'))) return; if (P().settings().confirmDel && !confirm('Delete the history of ALL calculators? This cannot be undone.')) return; await G.U45History.clearAll(); msg.textContent = 'All history deleted.'; });
    on('_privacy', () => { msg.innerHTML = 'No accounts, no analytics, no tracking. Everything stays on this device (history is AES-GCM encrypted). The network is used only to: update exchange rates (open.er-api.com or api.frankfurter.app) and, if you enable it, to download extra OCR languages (cdn.jsdelivr.net). Turn on <b>Offline mode</b> to block both.'; });
    on('_install', () => G.U45Guard.installApp());
    on('_share', () => G.U45Guard.shareApp());
    on('_about', () => { msg.innerHTML = 'U-45 CALCULATORS v1.5.2 · 45 calculators · all data stays on this device · feature-strip panels: ' + Object.entries(counts()).map(([k, v]) => esc(k) + ' ' + v).join(', '); });
  }

  // ================= history UI =================
  async function openHistory() {
    const sh = SH().sheet(`🕘 History — calculator #${calcId}`, `<div class="hi-bar"><input type="search" class="hi-q rn" placeholder="Search history…" aria-label="Search history"></div>
      <div class="cal-btns"><label class="ck"><input type="checkbox" class="hi-all"> Select all</label><button class="hi-del" disabled>Delete selected</button><button class="hi-clear">Delete all</button>
      <select class="hi-fmt" aria-label="Export format"><option value="json">JSON</option><option value="csv">CSV</option><option value="txt">Text</option></select><button class="hi-exp">Export 🔒</button><label class="btnlike">Import<input type="file" accept=".json,application/json" class="hi-imp" hidden></label></div>
      <p class="u45-note hi-info"></p><ol class="hi-list" aria-live="polite"></ol>`, { wide: true });
    const b = sh.body, ol = b.querySelector('.hi-list'), q = b.querySelector('.hi-q'), del = b.querySelector('.hi-del');
    const enc = await G.U45History.encrypted();
    const paint = async () => {
      const l = await G.U45History.list(calcId, q.value.trim());
      b.querySelector('.hi-info').textContent = `${l.length} entr${l.length === 1 ? 'y' : 'ies'}${q.value ? ' match' : ''} · stored ${enc ? 'encrypted (AES-GCM 256)' : 'locally (encryption unavailable in this browser)'} · auto-logged with timestamps`;
      ol.innerHTML = l.map(e => `<li data-id="${e.id}"><label class="ck"><input type="checkbox" value="${e.id}" aria-label="Select"></label><div class="hi-e"><time>${esc(new Date(e.t).toLocaleString())}</time><span class="hi-in">${esc(e.input)}</span><b class="hi-r">= ${esc(e.result)}</b></div><button class="hi-use" title="Re-use: type the result into the calculator">Use</button><button class="hi-cp" title="Copy">⧉</button><button class="hi-x" aria-label="Delete entry">✕</button></li>`).join('') || '<li class="empty">No history yet — every calculation on this calculator is logged here automatically.</li>';
      const upd = () => { const n = $$('.hi-list input:checked', b).length; del.disabled = !n; del.textContent = n ? `Delete selected (${n})` : 'Delete selected'; };
      $$('.hi-list input', b).forEach(c => { c.onchange = upd; }); upd(); b.querySelector('.hi-all').checked = false;
      $$('.hi-list li[data-id]', b).forEach(li => {
        const e = l.find(x => x.id === li.dataset.id);
        li.querySelector('.hi-x').onclick = async () => { await G.U45History.remove(calcId, e.id); paint(); };
        li.querySelector('.hi-use').onclick = () => { const v = String(e.result).replace(/^\s*[a-z]\s*=\s*/i, '').split(/\s/)[0]; if (G.U45Workout && G.U45Workout.typeInto) { sh.close(); G.U45Workout.typeInto(v); } };
        li.querySelector('.hi-cp').onclick = async () => { try { await navigator.clipboard.writeText(e.input + ' = ' + e.result); toast('Copied'); } catch (x) { toast('Copy failed'); } };
      });
    };
    q.oninput = paint;
    b.querySelector('.hi-all').onchange = (e) => { $$('.hi-list input', b).forEach(c => { c.checked = e.target.checked; }); $$('.hi-list input', b)[0] && $$('.hi-list input', b)[0].onchange(); };
    del.onclick = async () => { const ids = $$('.hi-list input:checked', b).map(c => c.value); if (!ids.length) return; if (P().settings().confirmDel && !confirm(`Delete ${ids.length} selected entr${ids.length === 1 ? 'y' : 'ies'}?`)) return; await G.U45History.remove(calcId, ids); paint(); };
    b.querySelector('.hi-clear').onclick = async () => { if (!confirm('Delete ALL history for calculator #' + calcId + '? This cannot be undone.')) return; await G.U45History.clear(calcId); paint(); };
    b.querySelector('.hi-exp').onclick = async () => { if (!(await G.U45Guard.requirePin('Exporting history'))) return; const f = b.querySelector('.hi-fmt').value; const txt = await G.U45History.exportData(calcId, f); G.U45Guard.saveFile({ name: `U45-history-calc${calcId}.${f}`, mime: f === 'json' ? 'application/json' : f === 'csv' ? 'text/csv' : 'text/plain', data: new TextEncoder().encode(txt) }, 'download'); };
    b.querySelector('.hi-imp').onchange = async (e) => { try { const n = await G.U45History.importData(calcId, await e.target.files[0].text()); toast('History now has ' + n + ' entries'); paint(); } catch (x) { toast('Import failed: ' + x.message); } };
    G.U45History.flush().then(paint);
    return sh;
  }

  // ================= view sheet =================
  function openView() {
    const cur = LS().get('u45.vmode', 'normal');
    const sh = SH().sheet('🖥️ View & layout', `<fieldset><legend>Hide modes</legend>${MODES.map(([k, t], i) => `<label class="ck"><input type="radio" name="vm" value="${k}"${k === cur ? ' checked' : ''}><span class="nb">${i + 1}</span>${t}</label>`).join('')}</fieldset><p class="u45-note">A small <b>⤢ restore</b> button stays in the bottom-left corner while anything is hidden (or press Esc).</p>
      <fieldset><legend>Layout (this calculator)</legend>${LAYOUTS.map(([k, t], i) => `<label class="ck"><input type="radio" name="ly" value="${k}"${k === layoutChoice() ? ' checked' : ''}><span class="nb">${i + 1}</span>${k === 'auto' ? 'Auto — original v1.3 calculator fit on every screen' : t}</label>`).join('')}</fieldset>`, {});
    $$('input[name=vm]', sh.body).forEach(r => { r.onchange = () => { sh.close(); setMode(r.value); }; });
    $$('input[name=ly]', sh.body).forEach(r => { r.onchange = () => setLayout(r.value); });
  }

  // ================= rail =================
  function open(k) {
    try { if (G.U45Sound) G.U45Sound.play('menuOpen'); } catch (e) { /* */ }
    if (G.U45Panels && G.U45Panels[k]) return openPanel(k);
    return ({ camsolve: () => G.U45Workout.act('camsolve'), calendar: () => G.U45Calendar.open(), customize: openCustomize, settings: openSettings, history: openHistory, hide: openHide, view: openView })[k]();
  }
  function buildRail() {
    const r = $('#u45-rail'); if (!r) return; const lab = P().settings().railLabels;
    r.className = 'u45-rail labels' + (lab === 'on' ? ' big' : lab === 'off' ? ' small' : '');
    r.innerHTML = RAIL.map((x, i) => `<button type="button" data-r="${x.k}" title="${i + 1}. ${esc(tr(x.t))}${G.U45Panels && G.U45Panels[x.k] ? ' — ' + G.U45Panels[x.k].length + ' features' : ''}"><span class="rn" aria-hidden="true">${i + 1}</span><span class="ri" aria-hidden="true">${x.i}</span><span class="rl">${esc(tr(x.t))}</span></button>`).join('');
    $$('button', r).forEach(b => { b.onclick = () => open(b.dataset.r); });
    applyHidden(); if (r._strip) r._strip.update();
  }
  /** v1.5: horizontal scroller with labelled ◀ / ▶ arrow buttons at both ends. Arrows show only when more content exists that way. */
  function strip(scroller, name) {
    if (!scroller || scroller._strip) return scroller && scroller._strip;
    const wrap = document.createElement('div'); wrap.className = 'u45-stripwrap'; wrap.dataset.strip = name;
    scroller.parentNode.insertBefore(wrap, scroller);
    const mk = (dir) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'u45-arrow ' + (dir < 0 ? 'left' : 'right'); b.setAttribute('aria-label', `Scroll ${name} ${dir < 0 ? 'left' : 'right'} — more ${dir < 0 ? 'before' : 'after'}`); b.title = b.getAttribute('aria-label'); b.innerHTML = dir < 0 ? '<span aria-hidden="true">◀</span>' : '<span aria-hidden="true">▶</span>'; b.onclick = () => { scroller.scrollBy({ left: dir * Math.max(120, scroller.clientWidth * 0.75), behavior: P().settings().reduceMotion ? 'auto' : 'smooth' }); setTimeout(update, 400); }; return b; };
    const L = mk(-1), R = mk(1); wrap.appendChild(L); wrap.appendChild(scroller); wrap.appendChild(R);
    function update() {
      if (!scroller.isConnected) return; const ov = scroller.scrollWidth > scroller.clientWidth + 2;
      wrap.classList.toggle('ovf', ov); const x = Math.abs(scroller.scrollLeft);
      L.classList.toggle('off', !ov || x <= 8); R.classList.toggle('off', !ov || x + scroller.clientWidth >= scroller.scrollWidth - 8);
      L.disabled = L.classList.contains('off'); R.disabled = R.classList.contains('off');
      if (!ov && wrap.classList.contains('ovf')) wrap.classList.remove('ovf');
    }
    scroller.addEventListener('scroll', update, { passive: true }); G.addEventListener('resize', update);
    if (G.ResizeObserver) { const ro = new ResizeObserver(update); ro.observe(scroller); }
    if (G.MutationObserver) new MutationObserver(() => setTimeout(update, 0)).observe(scroller, { attributes: true, attributeFilter: ['class'], childList: true });
    scroller._strip = { update, wrap, left: L, right: R }; update(); setTimeout(update, 120);
    return scroller._strip;
  }
  /** Called by app.js show() after the calculator is built. */
  function mount(id, item, app) {
    calcId = id; appRef = app; try { localStorage.setItem('u45.lastCalc', String(id)); } catch (e) { /* */ }
    const sw = $('#stagewrap'); if (!sw || $('#u45-rail')) return;
    const box = document.createElement('section'); box.id = 'u45-strip'; box.setAttribute('aria-label', 'Calculator features');
    box.innerHTML = '<h2 class="u45-striph"><span aria-hidden="true">▼</span> Features for this calculator <small>(tap a labelled button)</small></h2>';
    const rail = document.createElement('nav'); rail.id = 'u45-rail'; rail.setAttribute('aria-label', 'Calculator features'); box.appendChild(rail);
    sw.after(box);
    buildRail(); strip(rail, 'features'); strip($('#calcnav'), 'toolbar');
    const sel = $('#lay'); if (sel) sel.onchange = () => setLayout(sel.value);
    P().onCalc(id, app); applyLayout(); applyHidden(); setMode(LS().get('u45.vmode', 'normal'));
    const st = $('#stage'); if (st) st.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('.key')) P().haptic(); }, { passive: true });
  }
  function counts() { const o = {}; Object.keys(NAMES).forEach(k => { o[k] = ((G.U45Panels || {})[k] || []).length; }); o.calendar = G.U45Calendar ? G.U45Calendar.FEATURES.length : 0; o.customize = CUST_UI.length; o.settings = SET_UI.length; return o; }
  G.addEventListener && G.addEventListener('resize', () => { if ($('#u45-rail')) { const before = document.body.className; applyLayout(); if (before !== document.body.className) rescale(); } });
  G.U45Rail = { RAIL, LAYOUTS, MODES, mount, open, openPanel, setMode, setLayout, applyLayout, scaleOpts, layoutSelectHTML, suggest, effectiveLayout, counts, hideItems, setHidden, hidden, applyHidden, runTool, calcId: () => calcId, CUST_UI, SET_UI, strip, tr };
})(typeof window !== 'undefined' ? window : globalThis);
