/* U-45 v1.4 — preferences, PIN guard, number formatting, image protection, watermark. */
(function (G) {
  'use strict';
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } }
  };
  let calcId = 0;

  // ---------- global settings ----------
  const SET_DEF = {
    lang: 'en', precision: 12, fxAuto: true, fxHours: 12, fxSource: 'erapi', offline: false, histOn: true, histMax: 500,
    confirmDel: true, ocrOnline: false, ocrLang: 'eng', pinExport: true, watermark: true, wmText: 'U-45 CALCULATORS',
    blockSave: true, reduceMotion: false, railLabels: 'auto', autoLayout: true, startPage: 'menu', dateFmt: 'iso',
    clock24: true, weekStart: 1, country: 'UG', privacyNoNet: false, pinTimeout: 2, analytics: false
  };
  function settings() { return Object.assign({}, SET_DEF, LS.get('u45.settings', {})); }
  function setSetting(k, v) { const s = LS.get('u45.settings', {}); s[k] = v; LS.set('u45.settings', s); apply(); return settings(); }

  // ---------- per-calculator customization ----------
  const CUST_DEF = {
    theme: 'model', bg: '', text: '', key: '', keyText: '', accent: '', fontDisplay: 'model', fontKeys: 'model', fontScale: 100,
    keyScale: 100, keyShape: 'model', gap: 0, border: 0, bold: false, sound: 'keep', vol: 35, haptics: false, hapticMs: 15,
    decimals: -1, thousands: ',', decimal: '.', angle: 'model', knum: 'keep', reduceMotion: false, outline: false, upper: false
  };
  const THEMES = {
    model: null,
    'black-yellow': { bg: '#000000', text: '#FFFF00', key: '#000000', keyText: '#FFFF00', accent: '#FFFF00' },
    'white-black': { bg: '#FFFFFF', text: '#000000', key: '#FFFFFF', keyText: '#000000', accent: '#000000' },
    'black-white': { bg: '#000000', text: '#FFFFFF', key: '#000000', keyText: '#FFFFFF', accent: '#FFFFFF' },
    'black-cyan': { bg: '#000000', text: '#00FFFF', key: '#000000', keyText: '#00FFFF', accent: '#00FFFF' },
    'black-green': { bg: '#000000', text: '#00FF00', key: '#000000', keyText: '#00FF00', accent: '#00FF00' },
    'yellow-black': { bg: '#FFFF00', text: '#000000', key: '#FFFF00', keyText: '#000000', accent: '#000000' },
    'navy-white': { bg: '#000040', text: '#FFFFFF', key: '#000080', keyText: '#FFFFFF', accent: '#FFFF00' },
    'magenta-white': { bg: '#000000', text: '#FF00FF', key: '#000000', keyText: '#FFFFFF', accent: '#FF00FF' }
  };
  const FONTS = {
    model: '', 'U45 Display': '"U45 Display"', 'U45 Keys': '"U45 Keys"', 'U45 Mono': '"U45 Mono"',
    Atkinson: '"Atkinson Hyperlegible"', Lexend: '"Lexend"', Inter: '"Inter"', 'Roboto Slab': '"Roboto Slab"',
    'Noto Serif': '"Noto Serif"', OpenDyslexic: '"OpenDyslexic"', Merriweather: '"Merriweather"', System: 'system-ui'
  };
  function cust(id) { const g = LS.get('u45.cust.*', {}); return Object.assign({}, CUST_DEF, g, LS.get('u45.cust.' + (id == null ? calcId : id), {})); }
  function setCust(k, v, id) { const key = 'u45.cust.' + (id == null ? calcId : id); const c = LS.get(key, {}); c[k] = v; LS.set(key, c); apply(); }
  function resetCust(id) { LS.del('u45.cust.' + (id == null ? calcId : id)); apply(); }

  function cssFor(c) {
    const t = Object.assign({}, THEMES[c.theme] || {}); ['bg', 'text', 'key', 'keyText', 'accent'].forEach(k => { if (c[k]) t[k] = c[k]; });
    const R = [], S = '#stage .calc', K = '#stage .key';
    if (t.bg) R.push(`${S}{background:${t.bg}!important;--bezel:${t.bg}!important;--lab:${t.text || t.keyText}!important}`);
    if (t.key) R.push(`${S}{--key:${t.key}!important;--knum:${t.key}!important;--kop:${t.key}!important;--kfn:${t.key}!important;--kdel:${t.key}!important;--kexe:${t.key}!important;--kshift:${t.key}!important;--kalpha:${t.key}!important}`);
    if (t.keyText) R.push(`${S}{--kt:${t.keyText}!important;--knt:${t.keyText}!important;--kopt:${t.keyText}!important;--kfnt:${t.keyText}!important;--kdelt:${t.keyText}!important;--kexet:${t.keyText}!important;--kshiftt:${t.keyText}!important;--kalphat:${t.keyText}!important}`);
    if (t.accent) R.push(`${S}{--ls:${t.accent}!important;--la:${t.accent}!important;--lb:${t.accent}!important}${K}{box-shadow:0 0 0 2px ${t.accent} inset!important}`);
    if (t.text) R.push(`${S} .kl,${S} .ctop,${S} .cbot,${S} .kbelow{color:${t.text}!important}`);
    if (FONTS[c.fontDisplay]) R.push(`${S} .ctop,${S} .cbot,${S} .kl,#workout{font-family:${FONTS[c.fontDisplay]},system-ui,sans-serif!important}`);
    if (FONTS[c.fontKeys]) R.push(`${K}{font-family:${FONTS[c.fontKeys]},system-ui,sans-serif!important}`);
    const fs = +c.fontScale / 100, ks = +c.keyScale / 100;
    if (fs !== 1 || ks !== 1) R.push(`${K}{font-size:calc(var(--kfs) * ${fs * ks})!important}${S} .kl{font-size:calc(var(--lfs) * ${fs})!important}`);
    if (ks !== 1) R.push(`${K}:not(.tall):not(.round){min-height:calc(var(--kh) * ${ks})}`);
    const SH = { square: '0', rounded: '10px', pill: '999px', circle: '50%', soft: '4px' };
    if (SH[c.keyShape] != null) R.push(`${K}{border-radius:${SH[c.keyShape]}!important}`);
    if (+c.gap) R.push(`${S}{--gap:${+c.gap}px!important}`);
    if (+c.border) R.push(`${K}{outline:${+c.border}px solid ${t.accent || '#FFFF00'};outline-offset:-${+c.border}px}`);
    if (c.bold) R.push(`${K},${S} .kl{font-weight:800!important}`);
    if (c.upper) R.push(`${K},${S} .kl{text-transform:uppercase}`);
    if (c.outline) R.push(`${S} .screen,${S} .lcd,${S} .dispwrap{outline:4px solid #FFFF00!important}`);
    if (c.reduceMotion) R.push(`${K}{transition:none!important}`);
    return R.join('\n');
  }
  function apply() {
    if (typeof document === 'undefined') return;
    const c = cust(), s = settings();
    let st = document.getElementById('u45-cust'); if (!st) { st = document.createElement('style'); st.id = 'u45-cust'; document.head.appendChild(st); }
    st.textContent = cssFor(c);
    document.body && document.body.classList.toggle('u45-reduce', !!(s.reduceMotion || c.reduceMotion));
    document.body && document.body.classList.toggle('u45-protect', s.blockSave !== false);
  }
  /** Apply per-calculator runtime options (sound, angle, key numbers) when a calculator opens. */
  function onCalc(id, app) {
    calcId = id; const c = cust(id); apply();
    try { const S = G.U45Sound; if (S && c.sound !== 'keep') { S.set('on', c.sound === 'on'); if (c.sound === 'on') S.set('vol', (+c.vol || 0) / 100); } } catch (e) { /* */ }
    try { if (app && c.angle !== 'model' && 'angle' in app) { app.angle = c.angle; if (app.cfg) app.cfg.angle = c.angle; app.render && app.render(); } } catch (e) { /* */ }
    try { if (c.knum !== 'keep') { localStorage.setItem('u45.knum', c.knum); document.body.classList.toggle('no-knum', c.knum === 'off'); } } catch (e) { /* */ }
  }
  function haptic() { const c = cust(); if (c.haptics && navigator.vibrate) try { navigator.vibrate(+c.hapticMs || 15); } catch (e) { /* */ } }

  // ---------- number formatting ----------
  function fmt(v, c) {
    c = c || cust();
    if (typeof v !== 'number') return v == null ? '' : String(v);
    if (!isFinite(v)) return isNaN(v) ? 'NaN' : (v > 0 ? '∞' : '−∞');
    const p = Math.max(1, Math.min(15, +settings().precision || 12));
    let s;
    const a = Math.abs(v);
    if (+c.decimals >= 0) s = v.toFixed(Math.min(20, +c.decimals));
    else if (a !== 0 && (a >= 1e15 || a < 1e-7)) return v.toPrecision(Math.min(p, 10)).replace(/\.?0+e/, 'e');
    else { s = String(+v.toPrecision(p)); if (/e/.test(s)) return s; }
    let [i, f] = s.split('.'); const neg = i[0] === '-'; if (neg) i = i.slice(1);
    const th = c.thousands === 'none' ? '' : c.thousands === 'space' ? '\u202F' : c.thousands;
    if (th) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, th);
    return (neg ? '−' : '') + i + (f != null ? (c.decimal || '.') + f : '');
  }

  // ---------- PIN guard ----------
  let pinOkUntil = 0;
  async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  async function checkPin(pin) {
    if (!/^\d{4,8}$/.test(String(pin))) return false;
    const h = localStorage.getItem('u45.pin');
    if (!h) { if (G.U45Secure) return G.U45Secure.verifyPin(String(pin)); localStorage.setItem('u45.pin', await sha('u45:' + pin)); return true; }
    return (await sha('u45:' + pin)) === h;
  }
  /** Ask for the app passcode. Resolves true/false. A correct PIN is remembered for `pinTimeout` minutes. */
  function requirePin(reason, opts) {
    opts = opts || {};
    if (!opts.always && Date.now() < pinOkUntil) return Promise.resolve(true);
    return new Promise(res => {
      const hasPin = !!localStorage.getItem('u45.pin');
      const d = document.createElement('div'); d.className = 'u45-pinbox'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.innerHTML = `<form><h3>🔒 Passcode required</h3><p>${(reason || 'This action').replace(/[<>&]/g, '')} needs the app passcode.${hasPin ? '' : ' No passcode is set yet — the 4–8 digits you enter now become it.'}</p>
        <input type="password" inputmode="numeric" maxlength="8" autocomplete="off" class="u45-pinin" aria-label="Passcode"><div class="u45-pinerr" aria-live="polite"></div>
        <div class="u45-pinbtns"><button type="button" class="no u45-back" aria-label="Back (cancel)">← Back (cancel)</button><button type="submit" class="ok">OK</button></div></form>`;
      document.body.appendChild(d);
      const inp = d.querySelector('input'); setTimeout(() => inp.focus(), 30);
      let fin = false, nav = null;
      const done = (v, src) => { if (fin) return; fin = true; d.remove(); if (nav && src !== 'pop' && src !== 'drop') nav.done(); res(v); };
      if (window.U45Nav) nav = window.U45Nav.open('pin', (src) => done(false, src), d);
      d.querySelector('.no').onclick = () => done(false);
      d.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        if (await checkPin(inp.value)) { pinOkUntil = Date.now() + 60000 * Math.max(0, +settings().pinTimeout || 0); done(true); }
        else { d.querySelector('.u45-pinerr').textContent = 'Wrong passcode (4–8 digits).'; inp.value = ''; inp.focus(); }
      };
    });
  }
  function lockNow() { pinOkUntil = 0; }

  // ---------- watermark + image export ----------
  function watermark(c, o) {
    const s = settings(); // watermark is always applied to exported images
    if (o && o.strip) { // keep the image itself untouched (e.g. QR codes) and add a labelled strip below
      const fs = Math.max(12, Math.round(c.width / 22)); const n = document.createElement('canvas'); n.width = c.width; n.height = c.height + fs * 2;
      const y = n.getContext('2d'); y.fillStyle = '#000'; y.fillRect(0, 0, n.width, n.height); y.drawImage(c, 0, 0); y.fillStyle = '#FFFF00'; y.font = `bold ${fs}px system-ui,sans-serif`; y.textAlign = 'center'; y.textBaseline = 'middle';
      y.fillText((s.wmText || 'U-45 CALCULATORS') + ' • ' + new Date().toISOString().slice(0, 10), n.width / 2, c.height + fs); n._wm = true; return n;
    }
    const x = c.getContext('2d'); const w = c.width, h = c.height; const txt = (s.wmText || 'U-45 CALCULATORS') + ' • ' + new Date().toISOString().slice(0, 10);
    x.save();
    const fs = Math.max(12, Math.round(Math.min(w, h) / 28));
    x.font = `bold ${fs}px system-ui,sans-serif`; x.textBaseline = 'bottom';
    const tw = x.measureText(txt).width;
    x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(w - tw - fs * 1.2, h - fs * 1.7, tw + fs * 1.2, fs * 1.7);
    x.fillStyle = '#FFFF00'; x.fillText(txt, w - tw - fs * 0.6, h - fs * 0.35);
    // faint diagonal tiling
    x.globalAlpha = 0.10; x.fillStyle = '#808080'; x.translate(w / 2, h / 2); x.rotate(-Math.PI / 6);
    const step = fs * 9; x.font = `bold ${fs * 1.4}px system-ui,sans-serif`;
    for (let yy = -h; yy < h; yy += step / 2) for (let xx = -w; xx < w; xx += step * 1.6) x.fillText('U-45', xx, yy);
    x.restore(); c._wm = true; return c;
  }
  function b64bytes(dataURL) { const b = atob(dataURL.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  /** Minimal image-only PDF (one JPEG page per canvas). */
  function pdfFromCanvases(canvases) {
    const enc = new TextEncoder(); const parts = []; const offs = []; let len = 0;
    const push = (x) => { const u = typeof x === 'string' ? enc.encode(x) : x; parts.push(u); len += u.length; };
    const obj = (n, body) => { offs[n] = len; push(n + ' 0 obj\n'); body.forEach(push); push('\nendobj\n'); };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[\u0080-\u00ff]/g, 'x'));
    const n = canvases.length; const kids = [];
    for (let i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    obj(2, [`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`]);
    canvases.forEach((c, i) => {
      const jpg = b64bytes(c.toDataURL('image/jpeg', 0.92)); const pw = 595.28, ph = pw * c.height / c.width;
      const P = 3 + i * 3, I = P + 1, C = P + 2;
      const content = `q ${pw.toFixed(2)} 0 0 ${ph.toFixed(2)} 0 0 cm /Im0 Do Q`;
      obj(P, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /XObject << /Im0 ${I} 0 R >> >> /Contents ${C} 0 R >>`]);
      obj(I, [`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, '\nendstream']);
      obj(C, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
    });
    const total = 3 + n * 3; const xref = len;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(len); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out;
  }
  /** PIN-gated, watermarked export of canvas(es). fmt: png | jpg | pdf. */
  async function exportCanvas(canvases, name, fmt, mode) {
    canvases = [].concat(canvases);
    { if (!(await requirePin('Exporting an image'))) { toast('Export cancelled — passcode required'); return false; } }
    canvases.forEach(watermark);
    let file;
    if (fmt === 'pdf') file = { name: name + '.pdf', mime: 'application/pdf', data: pdfFromCanvases(canvases) };
    else { const m = fmt === 'jpg' ? 'image/jpeg' : 'image/png'; file = { name: name + '.' + fmt, mime: m, data: b64bytes(canvases[0].toDataURL(m, 0.92)), _pinOk: true }; }
    return saveFile(file, mode || 'download');
  }
  async function saveFile(file, mode) {
    file._pinOk = true;
    if (G.U45Workout && G.U45Workout.deliver) return G.U45Workout.deliver(file, mode || 'download');
    const blob = new Blob([file.data], { type: file.mime }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return true;
  }
  function toast(m) { if (G.U45Sheet && G.U45Sheet.toast) G.U45Sheet.toast(m); }

  // ---------- image/download protection ----------
  let deferredInstall = null;
  function protect() {
    const blockT = (e) => { const t = e.target; if (settings().blockSave === false) return; if (t && t.closest && (t.closest('img,canvas,video,svg,picture,.u45-noimg') || (t.tagName === 'A' && t.hasAttribute('download')))) { e.preventDefault(); return false; } };
    document.addEventListener('contextmenu', blockT, true);
    document.addEventListener('dragstart', blockT, true);
    document.addEventListener('selectstart', (e) => { const t = e.target; if (t && t.closest && t.closest && t.nodeType === 1 && t.closest('img,canvas')) e.preventDefault(); }, true);
    // install prompt (download/install the app) gated behind PIN
    G.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
    apply();
  }
  async function installApp() {
    if (!(await requirePin('Installing / downloading the app'))) return false;
    if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; return true; }
    toast('Install is offered by your browser menu (Add to Home screen) — not available from here right now.'); return false;
  }
  async function shareApp() {
    if (!(await requirePin('Sharing the app'))) return false;
    const url = (G.location && /^https?:/.test(G.location.protocol)) ? G.location.origin + G.location.pathname : 'https://github.com/yisaac6666-stack/u45-calculators/releases';
    try { if (navigator.share) { await navigator.share({ title: 'U-45 CALCULATORS', url }); return true; } } catch (e) { return false; }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch (e) { toast(url); } return true;
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', protect); else protect(); }

  G.U45Prefs = { LS, settings, setSetting, SET_DEF, cust, setCust, resetCust, CUST_DEF, THEMES, FONTS, apply, onCalc, fmt, haptic, cssFor, calcId: () => calcId };
  G.U45Guard = { requirePin, checkPin, lockNow, watermark, pdfFromCanvases, exportCanvas, saveFile, installApp, shareApp, pinFresh: () => Date.now() < pinOkUntil };
})(typeof window !== 'undefined' ? window : globalThis);
