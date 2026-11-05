/* U-45 CALCULATORS — per-calculator navigation bar + workout recorder.
 * Bar: Sounds, Manual, Write, Draw, Text, TTS, Save (encrypted), Save as (19 formats),
 * Share (57 targets), Print, Download, Undo, Redo, Delete, Clear all, Duplicate,
 * Copy, Paste, Pin, Rename, History, Restore.
 * Everything works offline; network is only used when the user picks a web share target. */
(function (G) {
  'use strict';
  const SH = () => G.U45Sheet, X = () => G.U45Export;
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const strip = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  const snd = (o) => { try { if (G.U45Sound) G.U45Sound.play(o); } catch (e) { /* ignore */ } };
  const toast = (m, t) => SH().toast(m, t);
  const pad2 = (n) => String(n).padStart(2, '0');
  const cap = () => G.Capacitor && G.Capacitor.isNativePlatform && G.Capacitor.isNativePlatform() ? G.Capacitor : null;
  const plug = (n) => { const c = cap(); return c && c.Plugins ? c.Plugins[n] : null; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const NAV = [
    ['sounds', '♪', 'Sounds'], ['manual', '📖', 'Manual'], ['write', '✍', 'Write'], ['draw', '🖌', 'Draw'], ['text', '📝', 'Text'], ['tts', '🔊', 'TTS'],
    ['save', '💾', 'Save'], ['saveas', '🗂', 'Save as'], ['share', '↗', 'Share'], ['print', '🖨', 'Print'], ['download', '⬇', 'Download'],
    ['undo', '↶', 'Undo'], ['redo', '↷', 'Redo'], ['delete', '⌫', 'Delete'], ['clearall', '🗑', 'Clear all'], ['duplicate', '⧉', 'Duplicate'],
    ['copy', '📋', 'Copy'], ['paste', '📥', 'Paste'], ['pin', '★', 'Pin'], ['rename', '✎', 'Rename'], ['history', '🕘', 'History'], ['restore', '♻', 'Restore']
  ];

  // ---------- share targets (public endpoints only; others via the system share sheet) ----------
  // kind: 't' = text accepted, 'u' = needs a public web link, 'sheet' = system share sheet, 'copy', 'copylink', 'qr', 'native'
  const E = encodeURIComponent;
  const SHARE = [
    ['Share sheet (all apps)', 'native'], ['WhatsApp', 't', (t) => 'https://wa.me/?text=' + E(t)], ['Telegram', 't', (t, u) => 'https://t.me/share/url?url=' + E(u || ' ') + '&text=' + E(t)],
    ['X (Twitter)', 't', (t) => 'https://twitter.com/intent/tweet?text=' + E(t.slice(0, 270))], ['Facebook', 'u', (t, u) => 'https://www.facebook.com/sharer/sharer.php?u=' + E(u)],
    ['LinkedIn', 'u', (t, u) => 'https://www.linkedin.com/sharing/share-offsite/?url=' + E(u)], ['Reddit', 't', (t, u, ti) => 'https://www.reddit.com/submit?title=' + E(ti) + '&selftext=true&text=' + E(t)],
    ['Email (mail app)', 't', (t, u, ti) => 'mailto:?subject=' + E(ti) + '&body=' + E(t)], ['SMS', 't', (t) => 'sms:?body=' + E(t)],
    ['Gmail', 't', (t, u, ti) => 'https://mail.google.com/mail/?view=cm&fs=1&su=' + E(ti) + '&body=' + E(t)], ['Outlook.com', 't', (t, u, ti) => 'https://outlook.live.com/mail/0/deeplink/compose?subject=' + E(ti) + '&body=' + E(t)],
    ['Pinterest', 'u', (t, u) => 'https://www.pinterest.com/pin/create/button/?url=' + E(u) + '&description=' + E(t.slice(0, 480))], ['Tumblr', 't', (t, u, ti) => 'https://www.tumblr.com/widgets/share/tool?posttype=text&title=' + E(ti) + '&content=' + E(t)],
    ['VK', 'u', (t, u, ti) => 'https://vk.com/share.php?url=' + E(u) + '&title=' + E(ti)], ['LINE', 't', (t) => 'https://line.me/R/msg/text/?' + E(t)], ['Viber', 't', (t) => 'viber://forward?text=' + E(t)],
    ['Signal', 'sheet'], ['Skype (retired — via sheet)', 'sheet'], ['Messenger', 'u', (t, u) => 'fb-messenger://share?link=' + E(u)], ['WeChat', 'sheet'], ['Pocket (closed — via sheet)', 'sheet'],
    ['Evernote', 'u', (t, u, ti) => 'https://www.evernote.com/clip.action?url=' + E(u) + '&title=' + E(ti)], ['OneNote', 'sheet'], ['Google Classroom', 'u', (t, u) => 'https://classroom.google.com/share?url=' + E(u)],
    ['Slack', 'sheet'], ['Discord (copies text)', 'copy'], ['Microsoft Teams', 'u', (t, u) => 'https://teams.microsoft.com/share?href=' + E(u) + '&msgText=' + E(t.slice(0, 400))],
    ['Trello', 't', (t, u, ti) => 'https://trello.com/add-card?name=' + E(ti) + '&desc=' + E(t)], ['Blogger', 't', (t, u, ti) => 'https://www.blogger.com/blog-this.g?n=' + E(ti) + '&t=' + E(t) + (u ? '&u=' + E(u) : '')],
    ['WordPress', 'u', (t, u, ti) => 'https://wordpress.com/wp-admin/press-this.php?u=' + E(u) + '&t=' + E(ti)], ['Mastodon (mastodon.social)', 't', (t) => 'https://mastodon.social/share?text=' + E(t.slice(0, 480))],
    ['Bluesky', 't', (t) => 'https://bsky.app/intent/compose?text=' + E(t.slice(0, 290))], ['Threads', 't', (t) => 'https://www.threads.net/intent/post?text=' + E(t.slice(0, 480))],
    ['Hacker News', 'u', (t, u, ti) => 'https://news.ycombinator.com/submitlink?u=' + E(u) + '&t=' + E(ti)], ['Weibo', 't', (t, u) => 'https://service.weibo.com/share/share.php?title=' + E(t.slice(0, 1800)) + (u ? '&url=' + E(u) : '')],
    ['QZone', 'u', (t, u, ti) => 'https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=' + E(u) + '&title=' + E(ti) + '&summary=' + E(t.slice(0, 200))], ['XING', 'u', (t, u) => 'https://www.xing.com/spi/shares/new?url=' + E(u)],
    ['Mix (closed — via sheet)', 'sheet'], ['Flipboard', 'u', (t, u, ti) => 'https://share.flipboard.com/bookmarklet/popout?v=2&url=' + E(u) + '&title=' + E(ti)],
    ['Buffer', 't', (t, u) => 'https://buffer.com/add?text=' + E(t.slice(0, 480)) + (u ? '&url=' + E(u) : '')], ['Hootsuite', 'u', (t, u, ti) => 'https://hootsuite.com/hootlet/load?address=' + E(u) + '&title=' + E(ti)],
    ['Instapaper', 'u', (t, u, ti) => 'https://www.instapaper.com/edit?url=' + E(u) + '&title=' + E(ti)], ['diaspora*', 'u', (t, u, ti) => 'https://share.diasporafoundation.org/?title=' + E(ti) + '&url=' + E(u)],
    ['KakaoTalk', 'sheet'], ['Naver', 'u', (t, u, ti) => 'https://share.naver.com/web/shareView?url=' + E(u) + '&title=' + E(ti)], ['OK.ru', 'u', (t, u, ti) => 'https://connect.ok.ru/offer?url=' + E(u) + '&title=' + E(ti)],
    ['Douban', 'u', (t, u, ti) => 'https://www.douban.com/share/service?href=' + E(u) + '&name=' + E(ti) + '&text=' + E(t.slice(0, 200))], ['Plurk', 't', (t) => 'https://www.plurk.com/?qualifier=shares&status=' + E(t.slice(0, 360))],
    ['Wykop', 'u', (t, u, ti) => 'https://wykop.pl/dodaj/link/?url=' + E(u) + '&title=' + E(ti)], ['Snapchat', 'sheet'], ['Instagram (image via sheet)', 'sheet', null, 'png'], ['Google Drive', 'sheet', null, 'pdf'],
    ['Dropbox', 'sheet', null, 'pdf'], ['Copy link', 'copylink'], ['Copy text', 'copy'], ['QR code', 'qr'], ['Save to device', 'download']
  ];

  // ---------- state ----------
  let ctx = null; // {app, model, item, screenEl, proxy, keyEls, calcId}
  let S = null; let pending = []; let sel = -1; const undoS = [], redoS = []; const trash = [];
  const isRPN = (app) => app && app.s && typeof app.s === 'object' && 'x' in app.s;
  function newSession(model, item) { return { id: uid(), name: (item ? item.code + ' ' + item.t : '#' + model.id + ' ' + model.name) + ' — ' + new Date().toLocaleDateString(), calcId: model.id, calcName: '#' + model.id + ' ' + model.name, item: item ? item.code + ' ' + item.t : '', steps: [], notes: '', write: null, draw: null, created: Date.now(), updated: Date.now() }; }
  const snap = () => JSON.stringify({ steps: S.steps, notes: S.notes, name: S.name, write: S.write, draw: S.draw });
  function mutate(fn) { undoS.push(snap()); if (undoS.length > 100) undoS.shift(); redoS.length = 0; fn(); S.updated = Date.now(); render(); }
  function restoreSnap(j) { const o = JSON.parse(j); S.steps = o.steps; S.notes = o.notes; S.name = o.name; S.write = o.write; S.draw = o.draw; }
  function screenText() { try { return G.CalcApp.screenText(ctx.screenEl); } catch (e) { return ''; } }
  function lastResult() { const t = screenText().split('\n').map(x => x.trim()).filter(Boolean); const e = t.find(x => /error|ERR\b|^E$|overflow/i.test(x)); return (e || t[t.length - 1] || '').slice(0, 240); }

  function doc() {
    return { title: S.name, calc: S.calcName, item: S.item, created: S.created, steps: S.steps, notes: S.notes, screen: ctx ? screenText() : '',
      images: [S.write && { name: 'Handwriting', dataURL: S.write }, S.draw && { name: 'Drawing', dataURL: S.draw }].filter(Boolean) };
  }

  // ---------- recording ----------
  const RESULT_OCC = { equals: 1, finSolve: 1, graphPlot: 1, syntaxError: 1, mathError: 1, overflow: 1 };
  function onKey(kd, occ) {
    if (!S) return;
    const face = strip(kd.face || kd.f || kd.act || '');
    if (occ === 'allClear') { pending = []; render(); return; }
    if (occ === 'del') { pending.pop(); render(); return; }
    if (occ === 'navigate' || occ === 'shift') { render(); return; }
    if (face) pending.push(occ === 'rpnEnter' ? 'ENTER' : face);
    const rpnOut = isRPN(ctx.app) && (occ === 'operator' || occ === 'keyTap') && !/^(f|g|shift|sto|rcl)$/i.test(kd.act || '');
    if (RESULT_OCC[occ] || rpnOut) addStep(pending.join(' '), lastResult(), occ);
    else render();
  }
  function addStep(input, result, occ) {
    const r = result == null ? lastResult() : result;
    mutate(() => { S.steps.push({ input: input || '(preset)', result: r, occ: occ || '', t: Date.now() }); pending = []; sel = -1; });
    try { if (G.U45History && G.U45Prefs && r != null && r !== '') G.U45History.log(G.U45Prefs.calcId(), input || '(preset)', r, { src: 'calc', occ: occ || '' }); } catch (e) { /* history is best-effort */ }
  }
  /** Called by app.js after an occasion with a result changes the display. */
  function onResult(occ) { if (S && (occ === 'graphPlot') && !pending.length) addStep('GRAPH', lastResult(), occ); }

  // ---------- render ----------
  function render() {
    const box = document.getElementById('workout'); if (!box || !S) return;
    const st = S.steps;
    box.innerHTML = `<div class="wo-head"><b class="wo-title" title="Session name">${esc(S.name)}</b><span class="wo-meta">${st.length} step${st.length === 1 ? '' : 's'}${S.notes ? ' · notes' : ''}${S.write ? ' · handwriting' : ''}${S.draw ? ' · drawing' : ''}</span></div>` +
      `<div class="wo-res"><span>RESULT</span><output>${esc(lastResult() || '—')}</output></div>` +
      (pending.length ? `<div class="wo-pend">Keys: ${esc(pending.join(' '))}</div>` : '') +
      `<ol class="wo-steps">${st.map((s, i) => `<li class="${i === sel ? 'sel' : ''}" data-i="${i}" tabindex="0"><span class="wi">${esc(s.input)}</span><span class="wr">= ${esc(s.result)}</span></li>`).join('') || '<li class="empty">Press keys — every calculation is logged here step by step.</li>'}</ol>`;
    box.querySelectorAll('.wo-steps li[data-i]').forEach(li => { li.onclick = () => { sel = sel === +li.dataset.i ? -1 : +li.dataset.i; snd('navigate'); render(); }; });
  }

  // ---------- storage (encrypted when the app lock is active) ----------
  const SEC = () => G.U45Secure && G.U45Secure.Store;
  async function loadAll() {
    let list = null;
    try { if (SEC()) list = await SEC().get('sessions', null); } catch (e) { list = null; }
    if (!list) { try { list = JSON.parse(localStorage.getItem('u45.sessions.plain') || '[]'); } catch (e) { list = []; } }
    return Array.isArray(list) ? list : [];
  }
  async function storeAll(list) {
    try { if (SEC()) { await SEC().set('sessions', list); localStorage.removeItem('u45.sessions.plain'); return 'encrypted (AES-GCM)'; } } catch (e) { /* locked / dev build */ }
    localStorage.setItem('u45.sessions.plain', JSON.stringify(list)); return 'NOT encrypted — app lock is not active in this build';
  }
  async function saveSession(copy) {
    const list = await loadAll(); const s = JSON.parse(JSON.stringify(S)); if (copy) { s.id = uid(); s.name = s.name + ' (copy)'; s.created = Date.now(); }
    s.updated = Date.now(); const i = list.findIndex(x => x.id === s.id); if (i >= 0) list[i] = s; else list.unshift(s);
    const how = await storeAll(list.slice(0, 200)); return how;
  }

  // ---------- file building & delivery ----------
  function dataURLtoJPEG(url) {
    return new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0); const j = c.toDataURL('image/jpeg', 0.9); res({ jpeg: X().b64ToBytes(j.split(',')[1]), w: c.width, h: c.height }); }; im.onerror = () => res(null); im.src = url; });
  }
  function textCanvas(d) {
    const lines = []; X().toText(d).split('\n').forEach(l => { while (l.length > 70) { lines.push(l.slice(0, 70)); l = l.slice(70); } lines.push(l); });
    const W = 900, lh = 24, c = document.createElement('canvas'); c.width = W; c.height = 60 + lines.length * lh; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, c.height); g.fillStyle = '#FFD600'; g.fillRect(0, 0, W, 8); g.fillStyle = '#000';
    lines.forEach((l, i) => { g.font = (i === 0 ? 'bold 22px ' : '18px ') + '"U45 Mono", monospace'; g.fillText(l, 20, 40 + i * lh); });
    return c;
  }
  async function imageCanvas(d) {
    const tc = textCanvas(d); const imgs = await Promise.all(d.images.map(im => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = im.dataURL; })));
    const ok = imgs.filter(Boolean); const W = tc.width; const H = tc.height + ok.reduce((a, i) => a + Math.round(i.height * Math.min(1, (W - 40) / i.width)) + 20, 0);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(tc, 0, 0);
    let y = tc.height; ok.forEach(i => { const s = Math.min(1, (W - 40) / i.width); g.strokeStyle = '#000'; g.strokeRect(19, y - 1, i.width * s + 2, i.height * s + 2); g.drawImage(i, 20, y, i.width * s, i.height * s); y += i.height * s + 20; });
    return c;
  }
  function qrCanvas(text) {
    const enc = new TextEncoder(); let t = text; while (enc.encode(t).length > 2800) t = t.slice(0, Math.floor(t.length * 0.9));
    const q = X().qr(t); const s = Math.max(4, Math.floor(720 / (q.size + 8))), n = (q.size + 8) * s; const c = document.createElement('canvas'); c.width = n; c.height = n; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, n, n); g.fillStyle = '#000'; for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.get(x, y)) g.fillRect((x + 4) * s, (y + 4) * s, s, s);
    c._truncated = t.length < text.length; return c;
  }
  const canvasBytes = (c, mime) => X().b64ToBytes(c.toDataURL(mime, 0.92).split(',')[1]);
  async function build(fmt) {
    const d = doc(); const base = X().safeName(d.title);
    if (fmt === 'png' || fmt === 'jpg') { let c = await imageCanvas(d); if (G.U45Guard) c = G.U45Guard.watermark(c); return { name: base + '.' + fmt, mime: fmt === 'png' ? 'image/png' : 'image/jpeg', data: canvasBytes(c, fmt === 'png' ? 'image/png' : 'image/jpeg') }; }
    if (fmt === 'qr') { let c = qrCanvas(X().toText(d)); if (G.U45Guard) { const t = c._truncated; c = G.U45Guard.watermark(c, { strip: true }); c._truncated = t; } if (c._truncated) toast('Workout too long for one QR code — text was shortened'); return { name: base + '-qr.png', mime: 'image/png', data: canvasBytes(c, 'image/png') }; }
    if (fmt === 'pdf') d._jpegs = (await Promise.all(d.images.map(async im => { const j = await dataURLtoJPEG(im.dataURL); return j && Object.assign(j, { name: im.name }); }))).filter(Boolean);
    return X().write(fmt, d);
  }
  const toBytes = (data) => typeof data === 'string' ? new TextEncoder().encode(data) : data;
  async function nativeWrite(file, dir) {
    const FS = plug('Filesystem'); if (!FS) return null;
    const r = await FS.writeFile({ path: 'U45/' + file.name, data: X().bytesToB64(toBytes(file.data)), directory: dir, recursive: true });
    return r && r.uri;
  }
  async function deliver(file, mode) {
    // mode: 'download' | 'share'
    // v1.4: images (and the app itself) may only leave the app after the passcode is entered
    if (/^image\//.test(file.mime || '') && !file._pinOk && G.U45Guard && !(await G.U45Guard.requirePin((mode === 'share' ? 'Sharing' : 'Saving') + ' an image'))) { toast('Cancelled — passcode required for images'); return false; }
    if (cap()) {
      try {
        if (mode === 'download') { try { const uri = await nativeWrite(file, 'DOCUMENTS'); if (uri) { toast('Saved to Documents/U45/' + file.name); return true; } } catch (e) { /* scoped storage: fall through to share sheet */ } }
        const uri = await nativeWrite(file, 'CACHE'); const Sh = plug('Share');
        if (uri && Sh) { await Sh.share({ title: file.name, text: mode === 'share' ? X().toText(doc()).slice(0, 1500) : undefined, files: [uri], dialogTitle: mode === 'download' ? 'Save ' + file.name : 'Share ' + file.name }); return true; }
      } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Could not ' + mode + ': ' + (e && e.message || e)); return false; }
    }
    const blob = new Blob([toBytes(file.data)], { type: file.mime });
    if (mode === 'share' && navigator.canShare) { try { const f = new File([blob], file.name, { type: file.mime }); if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: file.name }); return true; } } catch (e) { if (e && e.name === 'AbortError') return false; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast((mode === 'share' ? 'Sharing not available here — downloaded ' : 'Downloaded ') + file.name); return true;
  }
  async function copyText(t) {
    try { if (cap() && plug('Clipboard')) { await plug('Clipboard').write({ string: t }); return true; } } catch (e) { /* fallthrough */ }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); return true; } } catch (e) { /* fallthrough */ }
    try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  function publicURL() { const l = G.location; if (!l || !/^https?:$/.test(l.protocol) || /^(localhost|127\.|10\.|192\.168\.|\[?::1)/.test(l.hostname)) return ''; return l.href; }
  function openExternal(url) { if (cap() || /^(mailto|sms|viber|fb-messenger):/.test(url)) G.location.href = url; else G.open(url, '_blank', 'noopener'); }
  async function nativeSheet(text, title, fileFmt) {
    try {
      if (fileFmt) { const f = await build(fileFmt); return deliver(f, 'share'); }
      const Sh = plug('Share'); if (Sh) { await Sh.share({ title, text, dialogTitle: 'Share workout' }); return true; }
      if (navigator.share) { await navigator.share({ title, text }); return true; }
    } catch (e) { if (e && (e.name === 'AbortError' || /cancel/i.test(e.message))) return false; }
    const ok = await copyText(text); toast(ok ? 'No share sheet here — text copied, paste it into the app' : 'Sharing not available'); return ok;
  }

  // ---------- panels ----------
  /* Manual viewer (v1.2): the HTML manual renders in-app in every build (browser, PWA, Electron, Android).
   * The original PDF opens in the system PDF viewer (desktop app, via the preload bridge) or in a new browser tab. */
  function manualUrls(id) { const n = pad2(id); return { html: `docs/manuals/html/U45-manual-${n}.html`, pdf: `docs/manuals/U45-manual-${n}.pdf` }; }
  async function openManualPdf(id) {
    const u = manualUrls(id); const E = G.__u45 || {};
    if (E.platform === 'electron' && typeof E.openManual === 'function') {
      try { const r = await E.openManual(id, 'pdf'); if (r && r.ok) { toast('Opening the PDF manual…'); return true; } toast('PDF not available here — showing the built-in manual' + (r && r.error ? ' (' + r.error + ')' : '')); } catch (e) { toast('Could not open the PDF: ' + e.message); }
      return false;
    }
    if (cap()) { toast('The full manual is shown in-app on this device'); return false; }
    const w = G.open(u.pdf, '_blank'); if (!w) { const a = document.createElement('a'); a.href = u.pdf; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }
    return true;
  }
  function openManualWindow(id) {
    const u = manualUrls(id); const E = G.__u45 || {};
    if (E.platform === 'electron' && typeof E.openManual === 'function') { E.openManual(id, 'html').catch(() => {}); return; }
    const w = G.open(u.html, '_blank'); if (!w) toast('Pop-up blocked — allow pop-ups to open the manual in a new window');
  }
  function openManual() {
    const id = ctx.model.id; const u = manualUrls(id); const E = G.__u45 || {};
    const desktop = E.platform === 'electron' || !cap();
    const bar = `<div class="man-bar"><span class="nb">#${id}</span><span class="man-t">User manual — ${esc(ctx.model.name)}</span>` +
      (desktop ? `<button type="button" id="man-win" title="Open the manual in its own window">⧉ New window</button><button type="button" id="man-pdf" class="pri" title="Open the printable PDF manual">📄 Open PDF</button>` : '') + `</div>`;
    const sh = SH().sheet('📖 Manual — #' + id + ' ' + ctx.model.name, bar + `<div class="man-wrap"><iframe class="man-frame" src="${u.html}" title="Manual for calculator ${id}"></iframe><p class="man-fail" hidden>The built-in manual could not be shown here. Use “Open PDF” or “New window”.</p></div>`, { wide: true });
    sh.el.classList.add('full', 'manual');
    const fr = sh.body.querySelector('.man-frame');
    fr.addEventListener('load', () => { let ok = false; try { const d = fr.contentDocument; ok = !d || (d.body && d.body.innerText.length > 50); } catch (e) { ok = true; /* cross-origin = loaded */ } if (!ok) sh.body.querySelector('.man-fail').hidden = false; });
    const b1 = sh.body.querySelector('#man-pdf'); if (b1) b1.onclick = () => openManualPdf(id);
    const b2 = sh.body.querySelector('#man-win'); if (b2) b2.onclick = () => openManualWindow(id);
  }
  function padPanel(kind) {
    const isW = kind === 'write'; const COLORS = ['#000000', '#FFFFFF', '#FFD600', '#C00000', '#00C853', '#0039CB', '#00E5FF', '#FF6D00'];
    const sh = SH().sheet(isW ? '✍ Write (handwriting)' : '🖌 Draw', `<div class="pad-tools">${isW ? '' : COLORS.map((c, i) => `<button type="button" class="pc${i === 0 ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="Colour ${i + 1}"><span class="nb">${i + 1}</span></button>`).join('')}
      <label>Size <input type="range" id="pz" min="1" max="${isW ? 8 : 30}" value="${isW ? 3 : 5}"></label>${isW ? '' : '<button type="button" id="per" aria-pressed="false">Eraser</button>'}<button type="button" id="pun">↶ Stroke</button><button type="button" id="pcl">Clear</button><button type="button" id="psv" class="pri">Save to workout</button></div>
      <canvas id="pcv" class="pad-cv ${kind}" aria-label="${isW ? 'Handwriting area' : 'Drawing canvas'}"></canvas><p class="sp-note">${isW ? 'Write with finger or stylus on the lined paper. Saved with the session and included in exports.' : 'Pick a colour, pen size or the eraser. Saved with the session and included in PNG/JPG/PDF/HTML/MD/ZIP exports.'}</p>`, { wide: true });
    const cv = sh.body.querySelector('#pcv'); const W = Math.min(900, sh.body.clientWidth - 4 || 340), H = isW ? 320 : 420; const dpr = G.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; const g = cv.getContext('2d'); g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round';
    const bg = () => { g.fillStyle = isW ? '#FFFDE7' : '#FFFFFF'; g.fillRect(0, 0, W, H); if (isW) { g.strokeStyle = '#90CAF9'; g.lineWidth = 1; for (let y = 40; y < H; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.strokeStyle = '#EF9A9A'; g.beginPath(); g.moveTo(40, 0); g.lineTo(40, H); g.stroke(); } };
    const strokes = []; let cur = null, color = isW ? '#0D1B5E' : '#000000', eraser = false;
    const redraw = () => { bg(); strokes.forEach(s => { g.strokeStyle = s.e ? (isW ? '#FFFDE7' : '#FFFFFF') : s.c; g.lineWidth = s.w; g.beginPath(); s.p.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); if (s.p.length === 1) g.lineTo(s.p[0][0] + 0.1, s.p[0][1]); g.stroke(); }); };
    const existing = isW ? S.write : S.draw; bg(); if (existing) { const im = new Image(); im.onload = () => { g.drawImage(im, 0, 0, W, H); strokes.push({ img: im }); }; im.src = existing; }
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const w = +sh.body.querySelector('#pz').value * (e.pressure && e.pointerType === 'pen' ? 0.5 + e.pressure : 1); cur = { c: color, w, e: eraser, p: [pos(e)] }; strokes.push(cur); redrawWithImg(); });
    cv.addEventListener('pointermove', (e) => { if (!cur) return; e.preventDefault(); cur.p.push(pos(e)); const p = cur.p, n = p.length; g.strokeStyle = cur.e ? (isW ? '#FFFDE7' : '#FFFFFF') : cur.c; g.lineWidth = cur.w; g.beginPath(); g.moveTo(p[n - 2][0], p[n - 2][1]); g.lineTo(p[n - 1][0], p[n - 1][1]); g.stroke(); });
    const end = () => { cur = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.style.touchAction = 'none';
    function redrawWithImg() { bg(); strokes.forEach(s => { if (s.img) { g.drawImage(s.img, 0, 0, W, H); return; } g.strokeStyle = s.e ? (isW ? '#FFFDE7' : '#FFFFFF') : s.c; g.lineWidth = s.w; g.beginPath(); s.p.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); if (s.p.length === 1) g.lineTo(s.p[0][0] + 0.1, s.p[0][1]); g.stroke(); }); }
    void redraw;
    sh.body.querySelectorAll('.pc').forEach(b => b.onclick = () => { color = b.dataset.c; eraser = false; const er = sh.body.querySelector('#per'); if (er) { er.classList.remove('on'); er.setAttribute('aria-pressed', 'false'); } sh.body.querySelectorAll('.pc').forEach(x => x.classList.toggle('on', x === b)); snd('settingsToggle'); });
    const er = sh.body.querySelector('#per'); if (er) er.onclick = () => { eraser = !eraser; er.classList.toggle('on', eraser); er.setAttribute('aria-pressed', String(eraser)); snd('settingsToggle'); };
    sh.body.querySelector('#pun').onclick = () => { strokes.pop(); redrawWithImg(); snd('undo'); };
    sh.body.querySelector('#pcl').onclick = () => { strokes.length = 0; bg(); snd('clear'); };
    sh.body.querySelector('#psv').onclick = () => { const url = cv.toDataURL('image/png'); mutate(() => { if (isW) S.write = strokes.length ? url : null; else S.draw = strokes.length ? url : null; }); snd('save'); toast((isW ? 'Handwriting' : 'Drawing') + ' saved to the workout'); sh.close(); };
  }
  function textPanel() {
    const sh = SH().sheet('📝 Text notes', `<textarea id="tn" class="tn" rows="12" placeholder="Type notes for this workout…">${esc(S.notes)}</textarea><div class="pad-tools"><button type="button" id="tir">Insert result</button><button type="button" id="tiw">Insert workout</button><button type="button" id="tsv" class="pri">Save notes</button></div>`, { wide: true });
    const ta = sh.body.querySelector('#tn'); ta.focus();
    const ins = (t) => { const p = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, p) + t + ta.value.slice(p); ta.focus(); };
    sh.body.querySelector('#tir').onclick = () => ins(lastResult());
    sh.body.querySelector('#tiw').onclick = () => ins(S.steps.map((s, i) => (i + 1) + '. ' + s.input + ' = ' + s.result).join('\n'));
    sh.body.querySelector('#tsv').onclick = () => { mutate(() => { S.notes = ta.value; }); snd('save'); toast('Notes saved'); sh.close(); };
  }
  async function ttsVoices() {
    const T = plug('TextToSpeech');
    if (G.speechSynthesis) { let v = G.speechSynthesis.getVoices(); if (!v.length) await new Promise(r => { const h = () => r(); G.speechSynthesis.addEventListener('voiceschanged', h, { once: true }); setTimeout(r, 800); }); v = G.speechSynthesis.getVoices(); if (v.length || !T) return { kind: 'web', voices: v.map((x, i) => ({ i, name: x.name + ' (' + x.lang + ')', raw: x })) }; }
    if (T) { try { const r = await T.getSupportedVoices(); return { kind: 'native', voices: (r.voices || []).map((x, i) => ({ i, name: (x.name || 'Voice ' + (i + 1)) + ' (' + (x.lang || '') + ')', lang: x.lang })) }; } catch (e) { return { kind: 'native', voices: [] }; } }
    return { kind: 'none', voices: [] };
  }
  async function ttsPanel() {
    const sh = SH().sheet('🔊 Read aloud (TTS)', '<p class="sp-note">Loading voices…</p>', { wide: true, onClose: () => ttsStop() });
    const V = await ttsVoices(); const pref = JSON.parse(localStorage.getItem('u45.tts') || '{"rate":1,"pitch":1,"v":-1}');
    if (V.kind === 'none') { sh.body.innerHTML = '<p class="sp-note">Text-to-speech is not available on this device/browser.</p>'; return; }
    sh.body.innerHTML = `<div class="tts-grid"><label><span class="nb">1</span>Voice <select id="tv"><option value="-1">Default voice</option>${V.voices.map(v => `<option value="${v.i}"${pref.v === v.i ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
      <label><span class="nb">2</span>Rate <input type="range" id="tr" min="0.5" max="2" step="0.1" value="${pref.rate}"> <output id="tro">${pref.rate}×</output></label>
      <label><span class="nb">3</span>Pitch <input type="range" id="tp" min="0.5" max="2" step="0.1" value="${pref.pitch}"></label></div>
      <div class="pad-tools"><button type="button" id="ts1" class="pri"><span class="nb">4</span>Read result</button><button type="button" id="ts2"><span class="nb">5</span>Read full workout</button><button type="button" id="ts3"><span class="nb">6</span>Read notes</button><button type="button" id="ts4"><span class="nb">7</span>Stop</button></div><p class="sp-note">Engine: ${V.kind === 'web' ? 'Web Speech API' : 'Android system TTS'} · ${V.voices.length} voices.</p>`;
    const b = sh.body; const save = () => { pref.v = +b.querySelector('#tv').value; pref.rate = +b.querySelector('#tr').value; pref.pitch = +b.querySelector('#tp').value; localStorage.setItem('u45.tts', JSON.stringify(pref)); b.querySelector('#tro').textContent = pref.rate + '×'; };
    ['#tv', '#tr', '#tp'].forEach(s => { b.querySelector(s).oninput = save; b.querySelector(s).onchange = save; });
    const say = (t) => { save(); snd('speak'); speak(spoken(t), V, pref); };
    b.querySelector('#ts1').onclick = () => say(lastResult() || 'No result yet');
    b.querySelector('#ts2').onclick = () => say(S.steps.length ? S.steps.map((s, i) => 'Step ' + (i + 1) + '. ' + s.input + '. equals ' + s.result).join('. ') : 'The workout is empty');
    b.querySelector('#ts3').onclick = () => say(S.notes || 'There are no notes');
    b.querySelector('#ts4').onclick = () => ttsStop();
  }
  const spoken = (t) => String(t).replace(/−/g, ' minus ').replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/\^/g, ' to the power ').replace(/√/g, ' square root of ').replace(/π/g, ' pi ').replace(/²/g, ' squared ').replace(/³/g, ' cubed ').replace(/=/g, ' equals ').replace(/\|/g, '. ');
  function speak(text, V, pref) {
    ttsStop();
    if (V.kind === 'web') { const u = new SpeechSynthesisUtterance(text); u.rate = pref.rate; u.pitch = pref.pitch; const v = V.voices.find(x => x.i === pref.v); if (v) { u.voice = v.raw; u.lang = v.raw.lang; } G.speechSynthesis.speak(u); return; }
    const T = plug('TextToSpeech'); const v = V.voices.find(x => x.i === pref.v);
    if (T) T.speak(Object.assign({ text, rate: pref.rate, pitch: pref.pitch, volume: 1, category: 'ambient' }, v ? { voice: v.i, lang: v.lang } : {})).catch(e => toast('TTS: ' + (e && e.message || e)));
  }
  function ttsStop() { try { if (G.speechSynthesis) G.speechSynthesis.cancel(); } catch (e) { /* ok */ } try { const T = plug('TextToSpeech'); if (T) T.stop(); } catch (e) { /* ok */ } }

  function formatPanel(title, mode) {
    const F = X().FORMATS; const last = localStorage.getItem('u45.fmt') || 'pdf';
    const sh = SH().sheet(title, `<p class="sp-note">${F.length} formats, all generated on this device (offline). ${mode === 'share' ? 'The file goes to the system share sheet.' : ''}</p><div class="fmt-grid">${F.map((f, i) => `<button type="button" data-f="${f[0]}" class="${f[0] === last ? 'on' : ''}"><span class="nb">${i + 1}</span>${esc(f[1])}</button>`).join('')}</div>`, { wide: true });
    sh.body.querySelectorAll('.fmt-grid button').forEach(b => b.onclick = async () => {
      const f = b.dataset.f; localStorage.setItem('u45.fmt', f);
      try {
        if (f === 'clip') { const ok = await copyText(X().toText(doc())); snd('copy'); toast(ok ? 'Workout copied to the clipboard' : 'Copy failed'); sh.close(); return; }
        const file = await build(f); const ok = await deliver(file, mode || 'download'); if (ok) snd(mode === 'share' ? 'share' : 'save'); sh.close();
      } catch (e) { snd('mathError'); toast('Export failed: ' + (e && e.message || e)); }
    });
  }
  function sharePanel() {
    const url = publicURL();
    const sh = SH().sheet('↗ Share (' + SHARE.length + ' targets)', `<p class="sp-note">${url ? 'Link: ' + esc(url) : 'This copy has no public web link, so link-only services open the share sheet instead.'} Services without a public share link are marked “sheet” and use the system share sheet.</p>
      <div class="pad-tools"><label>Attach file for sheet: <select id="sf"><option value="">Text only</option>${X().FORMATS.filter(f => f[0] !== 'clip').map(f => `<option value="${f[0]}">${esc(f[1])}</option>`).join('')}</select></label><button type="button" id="sas">More formats…</button></div>
      <div class="share-grid">${SHARE.map((s, i) => `<button type="button" data-i="${i}"><span class="nb">${i + 1}</span>${esc(s[0])}${s[1] === 'sheet' || (s[1] === 'u' && !url) ? ' <small>sheet</small>' : ''}</button>`).join('')}</div>`, { wide: true });
    sh.body.querySelector('#sas').onclick = () => { sh.close(); formatPanel('↗ Share as file', 'share'); };
    sh.body.querySelectorAll('.share-grid button').forEach(b => b.onclick = async () => {
      const [name, kind, fn, fileFmt] = SHARE[+b.dataset.i]; const d = doc(); const text = X().toText(d).slice(0, 3000); const title = d.title;
      snd('share');
      if (kind === 'copy') { const ok = await copyText(X().toText(d)); toast(ok ? 'Text copied — paste it into ' + name.replace(/ \(.*/, '') : 'Copy failed'); return; }
      if (kind === 'copylink') { if (!url) { toast('No public web link for this offline copy — copied the text instead'); await copyText(text); return; } const ok = await copyText(url); toast(ok ? 'Link copied' : 'Copy failed'); return; }
      if (kind === 'qr') { const c = qrCanvas(X().toText(d)); SH().sheet('QR code', `<div class="qr-box"><img alt="QR code of the workout" src="${c.toDataURL('image/png')}"></div><p class="sp-note">${c._truncated ? 'Shortened to fit one QR code. ' : ''}Scan with any QR reader to get the workout text.</p><div class="pad-tools"><button type="button" id="qd" class="pri">Save QR image</button></div>`).body.querySelector('#qd').onclick = async () => deliver({ name: X().safeName(title) + '-qr.png', mime: 'image/png', data: canvasBytes(G.U45Guard ? G.U45Guard.watermark(c, { strip: true }) : c, 'image/png') }, 'download'); return; }
      if (kind === 'download') { formatPanel('⬇ Save to device', 'download'); return; }
      const fmt = sh.body.querySelector('#sf').value || fileFmt || '';
      if (kind === 'native' || kind === 'sheet' || (kind === 'u' && !url)) { await nativeSheet(text, title, fmt); return; }
      openExternal(fn(text, url, title));
    });
  }
  async function printIt() {
    const d = doc(); snd('print');
    const canPrint = !cap() && typeof G.print === 'function';
    if (canPrint) {
      const f = document.createElement('iframe'); f.className = 'print-frame'; f.setAttribute('aria-hidden', 'true'); f.srcdoc = X().toHTML(d, true); document.body.appendChild(f);
      f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { G.print(); } setTimeout(() => f.remove(), 60000); };
      return;
    }
    // Android WebView has no window.print(): make a print-ready PDF and hand it to the share sheet (choose Print / Drive / a PDF viewer).
    try { const file = await build('pdf'); await deliver(file, 'share'); toast('Print-ready PDF created — pick Print or a PDF app'); } catch (e) { toast('Print failed: ' + (e && e.message || e)); }
  }
  function renamePanel() {
    const sh = SH().sheet('✎ Rename session', `<input id="rn" class="rn" maxlength="80" value="${esc(S.name)}" aria-label="Session name"><div class="pad-tools"><button type="button" id="rok" class="pri">Rename</button></div>`);
    const i = sh.body.querySelector('#rn'); i.focus(); i.select();
    const ok = () => { const v = i.value.trim(); if (v) mutate(() => { S.name = v; }); snd('settingsToggle'); sh.close(); };
    sh.body.querySelector('#rok').onclick = ok; i.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
  }
  async function historyPanel() {
    const list = await loadAll(); const favs = getFavs();
    const sh = SH().sheet('🕘 History (' + list.length + ' saved)', `<p class="sp-note">Saved sessions are kept on this device${SEC() ? ' and encrypted when the app lock is on' : ''}.</p>
      <ol class="hist">${list.map((s, i) => `<li data-i="${i}"><b>${esc(s.name)}</b><small>${esc(s.calcName)} · ${s.steps.length} steps · ${new Date(s.updated).toLocaleString()}</small><span class="hb"><button type="button" data-a="open">Open</button><button type="button" data-a="dup">Duplicate</button><button type="button" data-a="del">Delete</button></span></li>`).join('') || '<li>No saved sessions yet — use Save.</li>'}</ol>
      ${favs.length ? '<h3>★ Pinned</h3><ol class="hist">' + favs.map(f => `<li><a href="${esc(f.href)}">${esc(f.title)}</a></li>`).join('') + '</ol>' : ''}`, { wide: true });
    sh.body.querySelectorAll('.hist li[data-i] button').forEach(b => b.onclick = async () => {
      const i = +b.closest('li').dataset.i; const s = list[i];
      if (b.dataset.a === 'open') { sh.close(); openSession(s); return; }
      if (b.dataset.a === 'dup') { const c = JSON.parse(JSON.stringify(s)); c.id = uid(); c.name += ' (copy)'; c.updated = Date.now(); list.unshift(c); await storeAll(list); snd('save'); sh.close(); historyPanel(); return; }
      if (b.dataset.a === 'del') { trash.push({ type: 'session', s }); list.splice(i, 1); await storeAll(list); snd('deleteItem'); toast('Deleted — use Restore to bring it back'); sh.close(); historyPanel(); }
    });
  }
  function openSession(s) {
    if (s.calcId !== ctx.model.id) { sessionStorage.setItem('u45.open', JSON.stringify(s)); location.hash = '#/calc/' + s.calcId; return; }
    mutate(() => { Object.assign(S, JSON.parse(JSON.stringify(s))); }); toast('Opened “' + s.name + '”');
  }
  async function restore() {
    const t = trash.pop();
    if (!t) { if (undoS.length) { act('undo'); return; } toast('Nothing to restore'); return; }
    if (t.type === 'session') { const list = await loadAll(); list.unshift(t.s); await storeAll(list); toast('Restored “' + t.s.name + '” to History'); }
    else if (t.type === 'steps') { mutate(() => { S.steps = t.steps.concat(S.steps); }); toast('Restored ' + t.steps.length + ' step(s)'); }
    else if (t.type === 'step') { mutate(() => { S.steps.splice(Math.min(t.i, S.steps.length), 0, t.step); }); toast('Restored step ' + (t.i + 1)); }
    snd('undo');
  }
  function getFavs() { try { return JSON.parse(localStorage.getItem('u45.favs') || '[]'); } catch (e) { return []; } }
  function pinToggle() {
    const href = location.hash || '#/calc/' + ctx.model.id; const favs = getFavs(); const i = favs.findIndex(f => f.href === href);
    if (i >= 0) { favs.splice(i, 1); toast('Removed from favourites'); } else { favs.unshift({ href, title: ctx.item ? ctx.item.code + ' ' + ctx.item.t + ' (#' + ctx.model.id + ')' : '#' + ctx.model.id + ' ' + ctx.model.name }); toast('Pinned to favourites (shown on the main menu)'); }
    localStorage.setItem('u45.favs', JSON.stringify(favs.slice(0, 50))); snd('pin'); syncPin();
  }
  function syncPin() { const b = document.querySelector('#calcnav [data-a="pin"]'); if (!b) return; const on = getFavs().some(f => f.href === (location.hash || '#/calc/' + ctx.model.id)); b.classList.toggle('on', on); b.querySelector('.nl').textContent = on ? 'Pinned' : 'Pin'; }
  async function pasteIt() {
    let t = '';
    try { if (cap() && plug('Clipboard')) t = (await plug('Clipboard').read()).value || ''; else if (navigator.clipboard && navigator.clipboard.readText) t = await navigator.clipboard.readText(); } catch (e) { t = ''; }
    if (!t) {
      const sh = SH().sheet('📥 Paste', '<p class="sp-note">Paste a number or expression below (long-press → Paste), then tap Enter keys.</p><input id="pi" class="rn" inputmode="decimal" aria-label="Text to paste"><div class="pad-tools"><button type="button" id="pok" class="pri">Enter keys</button></div>');
      const i = sh.body.querySelector('#pi'); i.focus(); sh.body.querySelector('#pok').onclick = () => { sh.close(); typeInto(i.value); }; return;
    }
    typeInto(t);
  }
  function typeInto(t) {
    const KBD = G.CalcUI.KBD; let n = 0, skipped = 0;
    String(t).replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '').trim().slice(0, 64).split('').forEach(ch => {
      if (ch === ' ') return; const c = KBD[ch]; const hit = c && c.map(a => ctx.keyEls.find(x => x.kd.act === a)).find(Boolean);
      if (hit) { ctx.proxy.press(hit.kd); n++; } else skipped++;
    });
    toast(n ? 'Pasted ' + n + ' key(s)' + (skipped ? ' · ' + skipped + ' character(s) have no key on this model' : '') : 'Nothing pasteable for this calculator');
  }

  // ---------- dispatcher ----------
  async function act(a) {
    switch (a) {
      case 'sounds': G.U45SoundUI.open(); return;
      case 'manual': snd('navigate'); openManual(); return;
      case 'write': case 'draw': snd('navigate'); padPanel(a); return;
      case 'text': snd('navigate'); textPanel(); return;
      case 'tts': ttsPanel(); return;
      case 'save': { const how = await saveSession(false); snd('save'); toast('Saved “' + S.name + '” — ' + how, 3200); return; }
      case 'saveas': formatPanel('🗂 Save as…', 'download'); return;
      case 'share': sharePanel(); return;
      case 'print': printIt(); return;
      case 'download': { const f = localStorage.getItem('u45.fmt') || 'pdf'; if (f === 'clip') { formatPanel('⬇ Download', 'download'); return; } try { const file = await build(f); if (await deliver(file, 'download')) snd('save'); } catch (e) { toast('Download failed: ' + e.message); } return; }
      case 'undo': if (!undoS.length) { toast('Nothing to undo'); return; } redoS.push(snap()); restoreSnap(undoS.pop()); snd('undo'); render(); return;
      case 'redo': if (!redoS.length) { toast('Nothing to redo'); return; } undoS.push(snap()); restoreSnap(redoS.pop()); snd('redo'); render(); return;
      case 'delete': { if (!S.steps.length) { if (pending.length) { pending = []; render(); snd('deleteItem'); } else toast('No steps to delete'); return; } const i = sel >= 0 ? sel : S.steps.length - 1; const step = S.steps[i]; trash.push({ type: 'step', i, step }); mutate(() => { S.steps.splice(i, 1); sel = -1; }); snd('deleteItem'); toast('Deleted step ' + (i + 1)); return; }
      case 'clearall': if (!S.steps.length && !pending.length) { toast('Workout already empty'); return; } trash.push({ type: 'steps', steps: S.steps.slice() }); mutate(() => { S.steps = []; pending = []; sel = -1; }); snd('allClear'); toast('Workout cleared — Undo or Restore brings it back'); return;
      case 'duplicate': if (sel >= 0) { mutate(() => { S.steps.splice(sel + 1, 0, Object.assign({}, S.steps[sel], { t: Date.now() })); }); toast('Step duplicated'); } else { const how = await saveSession(true); toast('Session duplicated into History — ' + how); } snd('save'); return;
      case 'copy': { const ok = await copyText(sel >= 0 ? S.steps[sel].input + ' = ' + S.steps[sel].result : X().toText(doc())); snd('copy'); toast(ok ? (sel >= 0 ? 'Step copied' : 'Workout copied') : 'Copy failed'); return; }
      case 'paste': pasteIt(); return;
      case 'pin': pinToggle(); return;
      case 'rename': renamePanel(); return;
      case 'history': snd('navigate'); historyPanel(); return;
      case 'restore': restore(); return;
      case 'camsolve': if (G.U45CamSolve) G.U45CamSolve.open(); else toast('Camera Solve not available'); return;
    }
  }

  const navCollapsed = () => { try { return localStorage.getItem('u45.navCollapsed') === '1'; } catch (e) { return false; } };
  function navHTML() { const c = navCollapsed(); return `<nav class="calcnav${c ? ' collapsed' : ''}" id="calcnav" aria-label="Calculator tools"><button type="button" class="nav-toggle" data-t="1" aria-expanded="${!c}" title="Show / hide the tool bar"><span class="ni" aria-hidden="true">${c ? '▾' : '▴'}</span><span class="nl">${c ? 'Tools' : 'Hide'}</span></button>${NAV.map((n, i) => `<button type="button" data-a="${n[0]}" title="${i + 1}. ${n[2]}"><span class="nb">${i + 1}</span><span class="ni" aria-hidden="true">${n[1]}</span><span class="nl">${n[2]}</span></button>`).join('')}<button type="button" data-a="camsolve" class="camsolve" title="Camera Solve — photo / image / PDF → step-by-step solution"><span class="nb">CS</span><span class="ni" aria-hidden="true">📷</span><span class="nl">Camera Solve</span></button>${XTRA.map((x, i) => `<a class="xtra" href="${x[0]}" title="${NAV.length + i + 1}. ${x[2]}"><span class="nb">${NAV.length + i + 1}</span><span class="ni" aria-hidden="true">${x[1]}</span><span class="nl">${x[2]}</span></a>`).join('')}</nav>`; }
  const XTRA = [['#/social', '💬', 'Social'], ['#/ai', '🤖', 'AI Agent'], ['#/library', '📚', 'Library']];
  /** Wire the bar for a freshly shown calculator. */
  function attach(c) {
    ctx = c; pending = []; sel = -1; undoS.length = 0; redoS.length = 0;
    S = newSession(c.model, c.item);
    try { const o = sessionStorage.getItem('u45.open'); if (o) { const s = JSON.parse(o); sessionStorage.removeItem('u45.open'); if (s.calcId === c.model.id) Object.assign(S, s); } } catch (e) { /* ignore */ }
    document.querySelectorAll('#calcnav button[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
    const tg = document.querySelector('#calcnav .nav-toggle');
    if (tg) tg.onclick = () => { const nav = document.getElementById('calcnav'); const c = !nav.classList.contains('collapsed'); nav.classList.toggle('collapsed', c); tg.setAttribute('aria-expanded', String(!c)); tg.querySelector('.ni').textContent = c ? '▾' : '▴'; tg.querySelector('.nl').textContent = c ? 'Tools' : 'Hide'; try { localStorage.setItem('u45.navCollapsed', c ? '1' : '0'); } catch (e) { /* ignore */ } snd('navigate'); };
    syncPin(); render();
  }
  function detach() { try { if (ctx && S) { localStorage.setItem('u45.lastCalc', String(ctx.model.id)); localStorage.setItem('u45.lastResult', JSON.stringify({ id: ctx.model.id, calc: S.calcName, result: lastResult() })); } } catch (e) { /* storage off */ } ttsStop(); ctx = null; S = null; }

  G.U45Workout = { NAV, XTRA, SHARE, navHTML, attach, openManual: () => ctx && openManual(), openManualPdf, detach, onKey, onResult, addStep, render, act, getFavs, build, deliver, typeInto: (t) => ctx && typeInto(t), _state: () => S, _doc: () => doc() };
})(window);
