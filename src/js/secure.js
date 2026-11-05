/* U-45 CALCULATORS — owner-authorized protection & security features
 * (a) runtime integrity self-check  (b) devtools/debugger trap
 * (c) disable context-menu / view-source shortcuts
 * (d) PIN app-lock + AES-GCM encrypted local settings (SubtleCrypto)
 * (e) hooks for native FLAG_SECURE / contentProtection / root stubs
 */
(function (G) {
  'use strict';
  const NS = 'u45';
  const INTEGRITY_META = 'u45-integrity'; // sha-256 hex of production bundle, injected at build
  let unlocked = false;
  let cryptoKey = null;

  // ---------- helpers ----------
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  function b64(buf) {
    const u = new Uint8Array(buf); let s = '';
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function unb64(s) {
    const bin = atob(s); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  async function sha256Hex(str) {
    const dig = await crypto.subtle.digest('SHA-256', enc.encode(str));
    return [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function deriveKey(pin, saltBuf) {
    const base = await crypto.subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuf, iterations: 120000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  // ---------- Encrypted local storage (feature 2) ----------
  const Store = {
    async ensureKey(pin) {
      let saltB64 = localStorage.getItem(NS + '.salt');
      let salt;
      if (!saltB64) {
        salt = crypto.getRandomValues(new Uint8Array(16));
        localStorage.setItem(NS + '.salt', b64(salt));
      } else salt = new Uint8Array(unb64(saltB64));
      cryptoKey = await deriveKey(pin, salt);
      return cryptoKey;
    },
    async set(key, value) {
      if (!cryptoKey) throw new Error('locked');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, enc.encode(JSON.stringify(value)));
      localStorage.setItem(NS + '.e.' + key, JSON.stringify({ iv: b64(iv), ct: b64(ct) }));
    },
    async get(key, fallback) {
      if (!cryptoKey) return fallback;
      const raw = localStorage.getItem(NS + '.e.' + key);
      if (!raw) return fallback;
      try {
        const { iv, ct } = JSON.parse(raw);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(unb64(iv)) }, cryptoKey, unb64(ct));
        return JSON.parse(dec.decode(pt));
      } catch (_) { return fallback; }
    },
    // Legacy cleartext migration helper — wipe after first lock setup
    wipePlain() {
      Object.keys(localStorage).forEach(k => { if (k.startsWith(NS + '.plain.')) localStorage.removeItem(k); });
    }
  };

  // ---------- App lock PIN (feature 1) ----------
  async function verifyPin(pin) {
    const hash = localStorage.getItem(NS + '.pin');
    if (!hash) {
      // First run: set PIN
      const h = await sha256Hex('u45:' + pin);
      localStorage.setItem(NS + '.pin', h);
      await Store.ensureKey(pin);
      await Store.set('boot', { t: Date.now() });
      Store.wipePlain();
      return true;
    }
    const h = await sha256Hex('u45:' + pin);
    if (h !== hash) return false;
    await Store.ensureKey(pin);
    // Confirm key works
    const boot = await Store.get('boot', null);
    if (!boot) await Store.set('boot', { t: Date.now() });
    return true;
  }

  function showLock() {
    if (document.getElementById('u45-lock')) return;
    const hasPin = !!localStorage.getItem(NS + '.pin');
    const el = document.createElement('div');
    el.id = 'u45-lock';
    el.innerHTML = `<h2>U-45 CALCULATORS</h2>
      <p>${hasPin ? 'Enter your passcode to unlock' : 'Create a 4–8 digit passcode to protect this app'}</p>
      <input id="u45-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" autofocus>
      <button id="u45-go" type="button">${hasPin ? 'Unlock' : 'Set & Unlock'}</button>
      <div class="err" id="u45-err"></div>
      <p class="hint">The passcode is stored only on this device (as a one-way hash) and is never sent anywhere.</p>`;
    document.body.appendChild(el);
    const input = el.querySelector('#u45-pin');
    const err = el.querySelector('#u45-err');
    const go = async () => {
      const pin = input.value.trim();
      if (!/^\d{4,8}$/.test(pin)) { err.textContent = 'Use 4–8 digits'; return; }
      const ok = await verifyPin(pin);
      if (!ok) { err.textContent = 'Incorrect passcode'; try { if (G.U45Sound) G.U45Sound.play('pinWrong'); } catch (_) {} input.value = ''; input.focus(); return; }
      // Correct PIN: unlock and STAND DOWN the inspector/debugger trap for this session.
      unlocked = true;
      standDown();
      el.remove();
      document.documentElement.classList.remove('u45-locked-ui');
      const blk = document.getElementById('u45-block'); if (blk) blk.remove();
      document.documentElement.classList.add('u45-unlocked');
      try { if (G.U45Sound) G.U45Sound.play('pinOk'); } catch (_) {}
      try { routeAfterUnlock(); } catch (_) {}
    };
    el.querySelector('#u45-go').onclick = go;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }

  function routeAfterUnlock() {
    // Trigger app route if already loaded
    if (typeof G.CalcApp !== 'undefined' && G.CalcApp.route) { G.CalcApp.route(); return; }
    if (typeof G.CalcApp !== 'undefined') {
      const m = /^#\/calc\/(\d+)/.exec(location.hash);
      if (m) G.CalcApp.show(+m[1]); else G.CalcApp.home();
    } else {
      window.dispatchEvent(new Event('hashchange'));
    }
  }

  // ---------- Integrity self-check (feature 5 / task 5e) ----------
  async function integrityOk() {
    const expected = document.documentElement.getAttribute('data-integrity') ||
      (document.querySelector('meta[name="' + INTEGRITY_META + '"]') || {}).content;
    // Dev / unbundled mode: no expected hash → skip (owner sources stay readable)
    if (!expected || expected === 'DEV') return true;
    try {
      const scripts = [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src')).filter(s => /bundle|app\.min|secure/.test(s) || s.includes('js/'));
      // Prefer the production bundle if present
      const bundle = document.querySelector('script[data-bundle="u45"]');
      if (bundle && bundle.src) {
        const res = await fetch(bundle.src, { cache: 'no-store' });
        const text = await res.text();
        const hex = await sha256Hex(text);
        return hex === expected;
      }
      // Fallback: hash concatenated listed module sources (shipped www without single bundle)
      if (!scripts.length) return true;
      let acc = '';
      for (const src of scripts) {
        if (/math\.js|vendor/.test(src)) continue;
        try { const r = await fetch(src, { cache: 'no-store' }); acc += await r.text(); } catch (_) {}
      }
      if (!acc) return true;
      return (await sha256Hex(acc)) === expected;
    } catch (_) { return false; }
  }

  function showBlock(title, msg) {
    let el = document.getElementById('u45-block');
    if (!el) { el = document.createElement('div'); el.id = 'u45-block'; document.body.appendChild(el); }
    el.innerHTML = `<h2>${title}</h2><p>${msg}</p>`;
  }

  // ---------- Devtools / debugger trap (task 5c) ----------
  // IMPORTANT: the trap is only active BEFORE unlock. The moment the correct PIN
  // is entered, standDown() permanently disarms it for the session so the real
  // user is never locked out of their own app. Capacitor/Electron WebViews can
  // trip naive size/timing heuristics, so once unlocked we stop checking entirely.
  let trapArmed = true;
  let stoodDown = false;
  let trapTimers = [];

  function standDown() {
    stoodDown = true;
    trapArmed = false;
    trapTimers.forEach(id => { clearTimeout(id); clearInterval(id); });
    trapTimers = [];
    document.documentElement.classList.remove('u45-locked-ui');
    const blk = document.getElementById('u45-block'); if (blk) blk.remove();
  }

  // A real docked DevTools pane on desktop changes outer/inner delta substantially
  // AND reports a non-touch, non-native environment. Native app WebViews (Capacitor)
  // are excluded so system bars / soft keyboards never look like DevTools.
  function isNativeWebView() {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return true;
    } catch (_) {}
    if (window.__u45 && (window.__u45.platform === 'android' || window.__u45.platform === 'ios')) return true;
    // Touch-primary devices (phones/tablets) don't have docked DevTools we need to fear
    if (('ontouchstart' in window) && navigator.maxTouchPoints > 0 && !window.__u45_isElectron) return true;
    return false;
  }

  function tripInspector() {
    if (stoodDown || unlocked) return;            // never fire once the user is in
    document.documentElement.classList.add('u45-locked-ui');
    showBlock('Inspector blocked', 'Developer tools were detected. Close the inspector and reload to continue.');
  }

  function armDevtoolsTrap() {
    // Only guards the LOCKED state. Skip timing/debugger entirely in native WebViews
    // (they trip naive heuristics) — the PIN lock is the real gate there.
    if (isNativeWebView()) return;

    // Debugger-timing trap: only while locked, and only on desktop-like webviews.
    const tick = () => {
      if (stoodDown || unlocked) return;          // stand down: stop scheduling
      if (trapArmed) {
        const t0 = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const dt = performance.now() - t0;
        if (dt > 200) tripInspector();            // higher threshold = fewer false positives
      }
      trapTimers.push(setTimeout(tick, 1500));
    };
    trapTimers.push(setTimeout(tick, 2500));

    // Docked-DevTools size heuristic: desktop only, require a large, stable delta,
    // and never once unlocked. Excludes native WebViews via the early return above.
    const sizeId = setInterval(() => {
      if (stoodDown || unlocked) { clearInterval(sizeId); return; }
      const wGap = Math.abs(window.outerWidth - window.innerWidth);
      const hGap = Math.abs(window.outerHeight - window.innerHeight);
      // Require a clearly devtools-sized docked pane (>250px) on at least one axis
      if ((wGap > 250 || hGap > 250) && window.outerWidth > 0) tripInspector();
    }, 2000);
    trapTimers.push(sizeId);
  }

  // ---------- Disable context menu / shortcuts (task 5d) ----------
  function hardenInput() {
    window.addEventListener('contextmenu', (e) => { e.preventDefault(); }, true);
    window.addEventListener('keydown', (e) => {
      const k = e.key || '';
      const ctrl = e.ctrlKey || e.metaKey;
      if (k === 'F12') { e.preventDefault(); e.stopPropagation(); return; }
      if (ctrl && e.shiftKey && /[IJCKijkc]/.test(k)) { e.preventDefault(); e.stopPropagation(); return; }
      if (ctrl && /[UuSs]/.test(k)) { e.preventDefault(); e.stopPropagation(); return; }
    }, true);
    // Block common view-source
    document.addEventListener('dragstart', (e) => e.preventDefault(), true);
  }

  // ---------- Tamper / root-jailbreak stub (feature 5) ----------
  async function checkEnvironment() {
    const issues = [];
    // Integrity
    const ok = await integrityOk();
    if (!ok) issues.push('Bundle integrity check failed (files may have been modified).');
    // Capacitor / Electron bridge hooks if present
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.U45Security) {
        const r = await window.Capacitor.Plugins.U45Security.checkDevice();
        if (r && r.rooted) G.__u45RootFlag = true;
        if (r && r.debugger) issues.push('Native debugger attached.');
      }
    } catch (_) {}
    // Native / Electron preload flags
    if (window.__u45 && window.__u45.tampered) issues.push('Desktop integrity flag raised.');
    if (window.__u45 && window.__u45.rooted) G.__u45RootFlag = true;
    return issues;
  }

  // Rooted / jailbroken devices: dismissible warning (once per launch), app stays usable.
  function showRootWarning() {
    try { if (sessionStorage.getItem('u45-root-ack') === '1') return; } catch (_) {}
    if (document.getElementById('u45-root-warn')) return;
    const d = document.createElement('div');
    d.id = 'u45-root-warn';
    d.setAttribute('role', 'alertdialog');
    d.setAttribute('aria-labelledby', 'u45-root-warn-t');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px';
    d.innerHTML = '<div style="max-width:420px;background:#1b1f2e;color:#fff;border:3px solid #ffd600;border-radius:14px;padding:20px;font:16px/1.5 system-ui,sans-serif">' +
      '<h2 id="u45-root-warn-t" style="margin:0 0 8px;color:#ffd600;font-size:20px">\u26a0\ufe0f Security warning</h2>' +
      '<p style="margin:0 0 16px">This device appears to be rooted or jailbroken. Other apps may be able to read data stored by U-45 CALCULATORS, including your encrypted history. You can continue, but your data is less protected.</p>' +
      '<button type="button" id="u45-root-ack" style="width:100%;padding:12px;font-size:17px;font-weight:700;background:#ffd600;color:#000;border:0;border-radius:10px;cursor:pointer">I understand</button></div>';
    (document.body || document.documentElement).appendChild(d);
    const b = d.querySelector('#u45-root-ack');
    b.addEventListener('click', () => { try { sessionStorage.setItem('u45-root-ack', '1'); } catch (_) {} d.remove(); });
    try { b.focus(); } catch (_) {}
  }

  function isPackaged() {
    if (window.__u45 && window.__u45.packaged) return true;
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return true;
    if (document.documentElement.hasAttribute('data-packaged')) return true;
    // Capacitor / Electron custom protocols
    if (/^capacitor:|^ionic:|^file:/.test(location.protocol) && /www/.test(location.href)) return true;
    return false;
  }

  async function boot() {
    const packaged = isPackaged();
    const integrityMeta = (document.querySelector('meta[name="' + INTEGRITY_META + '"]') || {}).content || 'DEV';
    const enforce = packaged || integrityMeta !== 'DEV' || document.documentElement.hasAttribute('data-lock');

    if (enforce) hardenInput();

    const issues = await checkEnvironment();
    // Integrity only hard-blocks when an expected hash is configured (production)
    if (issues.length && integrityMeta !== 'DEV') {
      showBlock('Security gate', issues.join(' ') + ' The app will not run until this is resolved.');
      return;
    }
    if (G.__u45RootFlag) showRootWarning();
    if (enforce) {
      showLock();
      armDevtoolsTrap();
      trapArmed = true;
    } else {
      // Owner / readable source tree: unlock quietly so index.html stays usable
      unlocked = true;
      document.documentElement.classList.add('u45-unlocked');
      trapArmed = false;
    }
  }

  // Public API
  G.U45Secure = {
    Store, verifyPin, showLock, integrityOk, checkEnvironment,
    changePin: async (oldPin, newPin) => {
      if (!(await verifyPin(oldPin))) return false;
      if (!/^\d{4,8}$/.test(newPin)) return false;
      localStorage.setItem(NS + '.pin', await sha256Hex('u45:' + newPin));
      await Store.ensureKey(newPin);
      await Store.set('boot', { t: Date.now() });
      return true;
    },
    unlockStatus: () => unlocked,
    rootWarning: showRootWarning,
    // Allow owner builds to disable trap via console in DEV only
    _disarm: () => { if ((document.querySelector('meta[name="' + INTEGRITY_META + '"]') || {}).content === 'DEV') trapArmed = false; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
