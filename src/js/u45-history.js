/* U-45 v1.4 — per-calculator calculation history, AES-GCM encrypted at rest. */
(function (G) {
  'use strict';
  const PFX = 'u45.hist.'; const cache = {}; let keyP = null; const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u) => { let s = ''; u = new Uint8Array(u); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  const unb64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const hasCrypto = () => !!(G.crypto && G.crypto.subtle);
  function idbKey() {
    return new Promise((res) => {
      if (!G.indexedDB) return res(null);
      let rq; try { rq = indexedDB.open('u45-keys', 1); } catch (e) { return res(null); }
      rq.onupgradeneeded = () => rq.result.createObjectStore('k');
      rq.onerror = () => res(null);
      rq.onsuccess = () => {
        const db = rq.result; const tx = db.transaction('k', 'readonly').objectStore('k').get('hist');
        tx.onsuccess = async () => {
          if (tx.result) return res(tx.result);
          try {
            const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
            const w = db.transaction('k', 'readwrite'); w.objectStore('k').put(k, 'hist'); w.oncomplete = () => res(k); w.onerror = () => res(null);
          } catch (e) { res(null); }
        };
        tx.onerror = () => res(null);
      };
    });
  }
  async function lsKey() { // fallback when IndexedDB cannot store CryptoKey objects
    let raw = localStorage.getItem('u45.histk');
    if (!raw) { const r = crypto.getRandomValues(new Uint8Array(32)); raw = b64(r); localStorage.setItem('u45.histk', raw); }
    return crypto.subtle.importKey('raw', unb64(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  function key() { if (!keyP) keyP = (async () => { if (!hasCrypto()) return null; const k = localStorage.getItem('u45.histk') ? null : await idbKey(); return k || lsKey(); })().catch(() => null); return keyP; }
  async function seal(obj) {
    const k = await key(); const txt = JSON.stringify(obj);
    if (!k) return { v: 0, p: btoa(unescape(encodeURIComponent(txt))) };
    const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(txt));
    return { v: 1, iv: b64(iv), ct: b64(ct) };
  }
  async function open(rec) {
    if (!rec) return [];
    if (rec.v === 0) return JSON.parse(decodeURIComponent(escape(atob(rec.p))));
    const k = await key(); if (!k) return [];
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, k, unb64(rec.ct)); return JSON.parse(dec.decode(pt));
  }
  async function load(id) {
    id = String(id); if (cache[id]) return cache[id];
    let list = []; try { list = await open(JSON.parse(localStorage.getItem(PFX + id) || 'null')); } catch (e) { list = []; }
    cache[id] = Array.isArray(list) ? list : []; return cache[id];
  }
  let wq = Promise.resolve();
  function save(id) { id = String(id); const list = cache[id] || []; wq = wq.then(async () => { try { localStorage.setItem(PFX + id, JSON.stringify(await seal(list))); } catch (e) { /* quota */ } }); return wq; }
  const S = () => (G.U45Prefs ? G.U45Prefs.settings() : { histOn: true, histMax: 500 });
  let seq = 0; const listeners = [];
  async function log(id, input, result, meta) {
    if (S().histOn === false) return null;
    if (result == null || result === '') return null;
    const list = await load(id);
    const e = { id: Date.now().toString(36) + (seq++).toString(36), t: Date.now(), input: String(input || '').slice(0, 500), result: String(result).slice(0, 500), src: (meta && meta.src) || 'calc', occ: (meta && meta.occ) || '' };
    list.push(e); const max = Math.max(10, +S().histMax || 500); if (list.length > max) list.splice(0, list.length - max);
    await save(id); listeners.forEach(f => { try { f(id, e); } catch (x) { /* */ } }); return e;
  }
  async function list(id, q) {
    const l = (await load(id)).slice().reverse(); if (!q) return l;
    const s = String(q).toLowerCase(); return l.filter(e => (e.input + ' ' + e.result + ' ' + new Date(e.t).toISOString()).toLowerCase().includes(s));
  }
  async function remove(id, ids) { ids = new Set([].concat(ids)); const l = await load(id); const n = l.length; cache[String(id)] = l.filter(e => !ids.has(e.id)); await save(id); return n - cache[String(id)].length; }
  async function clear(id) { cache[String(id)] = []; await save(id); try { localStorage.removeItem(PFX + id); } catch (e) { /* */ } return true; }
  async function clearAll() { Object.keys(localStorage).filter(k => k.startsWith(PFX)).forEach(k => { localStorage.removeItem(k); delete cache[k.slice(PFX.length)]; }); for (const k in cache) delete cache[k]; return true; }
  async function exportData(id, fmt) {
    const l = (await load(id)).slice();
    if (fmt === 'csv') return 'time,input,result,source\n' + l.map(e => [new Date(e.t).toISOString(), e.input, e.result, e.src].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    if (fmt === 'txt') return l.map(e => new Date(e.t).toLocaleString() + '  ' + e.input + ' = ' + e.result).join('\n');
    return JSON.stringify({ app: 'U-45 CALCULATORS', calc: id, exported: new Date().toISOString(), entries: l }, null, 1);
  }
  async function importData(id, json) { const d = typeof json === 'string' ? JSON.parse(json) : json; const l = await load(id); const have = new Set(l.map(e => e.id)); (d.entries || []).forEach(e => { if (e && e.id && !have.has(e.id)) l.push(e); }); l.sort((a, b) => a.t - b.t); await save(id); return l.length; }
  function rawStored(id) { return localStorage.getItem(PFX + id); }
  G.U45History = { log, list, remove, clear, clearAll, exportData, importData, load, rawStored, onLog: (f) => listeners.push(f), flush: () => wq, encrypted: async () => !!(await key()) };
})(typeof window !== 'undefined' ? window : globalThis);
