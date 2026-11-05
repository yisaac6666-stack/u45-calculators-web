/* U-45 CALCULATORS — modal sheet helper + Sound settings panel. */
(function (G) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /** Full-screen accessible sheet. Returns {el, body, close}.
   * v1.5: opening a sheet over another keeps the first one underneath; "← Back" (or any Back key) returns to it,
   * "✕ Close" closes the whole stack. Every sheet is an entry in the U45Nav back stack. */
  function sheet(title, html, opts) {
    opts = opts || {};
    const prev = document.querySelector('.u45-sheet');
    const el = document.createElement('div'); el.className = 'u45-sheet' + (opts.wide ? ' wide' : '');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', title);
    let under = null;
    if (prev) { if (prev._close && prev.getAttribute('aria-label') !== title && !opts.replace) { under = prev; prev.classList.remove('u45-sheet'); prev.classList.add('u45-sheet-stacked'); } else if (prev._close) { under = prev._under || null; prev._close('replace'); } else prev.remove(); }
    const backTo = under ? under.getAttribute('aria-label').replace(/^\W+\s*/, '').slice(0, 28) : '';
    el.innerHTML = `<div class="sh-card"><div class="sh-head"><button type="button" class="u45-back sh-back" aria-label="Back to the previous screen" title="${under ? 'Back to: ' + esc(backTo) : 'Back to the previous screen'}">← Back</button><h2>${esc(title)}</h2><button type="button" class="sh-x" aria-label="Close">✕ Close</button></div><div class="sh-body">${html}</div></div>`;
    document.body.appendChild(el);
    let closed = false, nav = null;
    const close = (how) => {
      if (closed) return; closed = true; el.remove();
      if (nav && how !== 'pop' && how !== 'drop') nav.done();
      if (opts.onClose) { try { opts.onClose(); } catch (e) { console.error(e); } }
      if (under && how !== 'replace') { if (how === 'all' || how === 'drop') { if (under._close) under._close(how === 'drop' ? 'drop' : 'all'); else under.remove(); } else { under.classList.remove('u45-sheet-stacked'); under.classList.add('u45-sheet'); const f = under.querySelector('.sh-back'); if (f) f.focus(); } }
    };
    el._close = close; el._under = under;
    if (G.U45Nav) nav = G.U45Nav.open('sheet', (src) => close(src === 'pop' || src === 'drop' ? src : 'back'), el);
    el.querySelector('.sh-back').onclick = () => { snd('back'); close('back'); };
    el.querySelector('.sh-x').onclick = () => { snd('back'); close('all'); };
    el.addEventListener('click', (e) => { if (e.target === el) close('back'); });
    if (!G.U45Nav) { const onKey = (e) => { if (e.key === 'Escape' && el.isConnected) { e.stopPropagation(); close('back'); document.removeEventListener('keydown', onKey, true); } }; document.addEventListener('keydown', onKey, true); }
    return { el, body: el.querySelector('.sh-body'), close: () => close('back'), closeAll: () => close('all') };
  }
  function toast(msg, ms) {
    let t = document.getElementById('u45-toast'); if (!t) { t = document.createElement('div'); t.id = 'u45-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms || 2200);
  }
  const snd = (o) => { try { if (G.U45Sound) G.U45Sound.play(o); } catch (e) { /* ignore */ } };

  function openSoundPanel() {
    const S = G.U45Sound; if (!S) return;
    const st = S.settings();
    const pick = (list, off) => list.map((s, i) => `<div class="sp-row${st.theme === s ? ' sel' : ''}" data-s="${s}"><button type="button" class="sp-pick" data-s="${s}" aria-pressed="${st.theme === s}"><span class="nb">${off + i + 1}</span>${esc(S.label(s))}</button><button type="button" class="sp-prev" data-s="${s}" aria-label="Preview ${esc(S.label(s))}">▶</button></div>`).join('');
    const occRows = S.OCC.map((o, i) => `<tr><td class="nb">${i + 1}</td><td>${esc(o[1])}${o[3] === 'err' ? ' <b class="errtag">ERROR</b>' : ''}</td><td><select data-occ="${o[0]}" aria-label="Sound for ${esc(o[1])}"><option value="">Theme (${esc(S.label(st.theme))})</option>${S.SOUNDS.map((s, j) => `<option value="${s}"${st.map[o[0]] === s ? ' selected' : ''}>${j + 1}. ${esc(S.label(s))}</option>`).join('')}</select></td><td><button type="button" class="sp-test" data-occ="${o[0]}" aria-label="Test ${esc(o[1])}">▶</button></td></tr>`).join('');
    const sh = sheet('♪ Sound settings', `
      <div class="sp-top">
        <label class="sw"><span class="nb">1</span><input type="checkbox" id="sp-on"${st.on ? ' checked' : ''}> Sound ON</label>
        <label class="sw"><span class="nb">2</span><input type="checkbox" id="sp-mute"${st.mute ? ' checked' : ''}> Mute</label>
        <label class="sw vol"><span class="nb">3</span>Volume <input type="range" id="sp-vol" min="0" max="1" step="0.05" value="${st.vol}"> <output id="sp-volo">${Math.round(st.vol * 100)}%</output></label>
        <label class="sw"><span class="nb">4</span><input type="checkbox" id="sp-per"${st.perOcc ? ' checked' : ''}> Assign sounds per occasion</label>
        <button type="button" id="sp-reset"><span class="nb">5</span>Reset defaults</button>
      </div>
      <p class="sp-note" id="sp-note">${st.on ? '' : 'Sound is OFF — switch it on to hear previews.'} All 30 sounds are generated on the device (WebAudio): offline, no recordings. Errors always add a low buzz so they never sound like a tap.</p>
      <h3>Theme sound (30) — tap a name to choose, ▶ to preview</h3>
      <div class="sp-grid"><div class="sp-col">${pick(S.LEFT, 0)}</div><div class="sp-col">${pick(S.RIGHT, 15)}</div></div>
      <h3>Occasions (${S.OCC.length}) ${st.perOcc ? '' : '<small>— turn on option 4 to override per occasion</small>'}</h3>
      <table class="sp-occ"><tbody>${occRows}</tbody></table>`, { wide: true });
    const b = sh.body; const note = b.querySelector('#sp-note');
    const needOn = () => { const s = S.settings(); if (!s.on) { note.textContent = 'Sound is OFF — switch on option 1 to hear previews.'; return false; } if (s.mute) { note.textContent = 'Muted — clear option 2 to hear previews.'; return false; } return true; };
    b.querySelector('#sp-on').onchange = (e) => { S.set('on', e.target.checked); if (e.target.checked) { S.unlock(); note.textContent = 'Sound ON.'; snd('settingsToggle'); } };
    b.querySelector('#sp-mute').onchange = (e) => { S.set('mute', e.target.checked); if (!e.target.checked) snd('settingsToggle'); };
    b.querySelector('#sp-vol').oninput = (e) => { S.set('vol', +e.target.value); b.querySelector('#sp-volo').textContent = Math.round(e.target.value * 100) + '%'; };
    b.querySelector('#sp-vol').onchange = () => snd('settingsToggle');
    b.querySelector('#sp-per').onchange = (e) => { S.set('perOcc', e.target.checked); snd('settingsToggle'); };
    b.querySelector('#sp-reset').onclick = () => { S._reset(); sh.close(); openSoundPanel(); };
    b.querySelectorAll('.sp-pick').forEach(x => x.onclick = () => {
      S.set('theme', x.dataset.s);
      b.querySelectorAll('.sp-row').forEach(r => { r.classList.toggle('sel', r.dataset.s === x.dataset.s); r.querySelector('.sp-pick').setAttribute('aria-pressed', r.dataset.s === x.dataset.s); });
      b.querySelectorAll('.sp-occ select option[value=""]').forEach(o => { o.textContent = 'Theme (' + S.label(x.dataset.s) + ')'; });
      if (needOn()) S.preview(x.dataset.s, 'equals');
    });
    b.querySelectorAll('.sp-prev').forEach(x => x.onclick = () => { if (needOn()) S.preview(x.dataset.s, 'equals'); });
    b.querySelectorAll('.sp-occ select').forEach(s => s.onchange = () => { S.setMap(s.dataset.occ, s.value); if (s.value && !S.settings().perOcc) { S.set('perOcc', true); b.querySelector('#sp-per').checked = true; } if (needOn()) S.play(s.dataset.occ, { force: true }); });
    b.querySelectorAll('.sp-test').forEach(x => x.onclick = () => { if (needOn()) S.play(x.dataset.occ, { force: true }); });
    return sh;
  }

  G.U45Sheet = { sheet, toast, esc, snd };
  G.U45SoundUI = { open: openSoundPanel };
})(window);
