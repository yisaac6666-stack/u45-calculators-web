/* U-45 v1.5 — navigation stack: "← Back" everywhere.
 * Every page change (hash route) and every overlay (sheet, PIN box, photo, dialog) is an entry in one stack backed by
 * window.history, so the on-screen "← Back" buttons, the browser Back button / popstate, Android's hardware Back
 * (Capacitor App plugin), Alt+Left / mouse Back on desktop and Esc all return to the previous screen or task. */
(function (G) {
  'use strict';
  if (typeof document === 'undefined') { G.U45Nav = { open: () => ({ done() {} }), back() {}, depth: () => 0 }; return; }
  const H = G.history; let D = 0, seq = 0, parentFn = null, pendingTarget = null;
  const stack = []; // {id, d, close(src)}
  const stamp = () => { const s = H.state; if (!s || typeof s.d !== 'number') { try { H.replaceState(Object.assign({}, s || {}, { d: D }), ''); } catch (e) { /* */ } } else D = s.d; };
  if (!H.state || typeof H.state.d !== 'number') { try { H.replaceState({ d: 0 }, ''); } catch (e) { /* */ } } else D = H.state.d;

  /** Register an overlay. close(src) must remove it; src is 'pop' when the history entry is already gone. */
  function prune() { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].el && !stack[i].el.isConnected && !stack[i].el.classList.contains('u45-sheet-stacked')) { const o = stack.splice(i, 1)[0]; if (i === stack.length) { /* top ghost: its history entry is skipped by popstate */ } void o; } }
  function open(kind, close, el) {
    prune(); const id = kind + ':' + (++seq); const o = { id, n: seq, d: D + 1, close, kind, el }; stack.push(o); D = o.d;
    try { H.pushState({ d: D, ov: id }, ''); } catch (e) { /* */ }
    return { id, done: () => done(id) };
  }
  /** The overlay closed itself (button, code). Consume its history entry so Back is not "wasted". */
  function done(id) {
    const i = stack.findIndex(o => o.id === id); if (i < 0) return; const o = stack[i]; stack.splice(i, 1);
    const tgt = o.d - 1; pendingTarget = pendingTarget == null ? tgt : Math.min(pendingTarget, tgt);
    setTimeout(() => {
      const t = pendingTarget; pendingTarget = null; if (t == null) return;
      const s = H.state; if (!s || !s.ov || s.d <= t || stack.some(x => x.id === s.ov)) return; // a newer page/overlay took over: leave history alone
      skipping = 'done'; goSeq = seq; H.go(t - s.d);
    }, 0);
  }
  let skipping = false, goSeq = 0;
  function closeAbove(d, maxN) {
    for (let i = stack.length - 1; i >= 0; i--) { const o = stack[i]; if (o.d <= d) break; if (maxN != null && o.n > maxN) continue; stack.splice(i, 1); try { o.close('pop'); } catch (e) { console.error(e); } }
  }
  G.addEventListener('popstate', (e) => {
    const s = e.state;
    if (!s || typeof s.d !== 'number') { D = D + 1; stamp(); skipping = false; return; } // new hash navigation
    const prev = D; D = s.d;
    if (skipping === 'done') {
      // our own clean-up traversal finished; an overlay opened while it was in flight must survive it, so re-push its entry
      skipping = false; closeAbove(D, goSeq);
      for (const o of stack) if (o.n > goSeq) { D = D + 1; o.d = D; try { H.pushState({ d: D, ov: o.id }, ''); } catch (e) { /* */ } }
      return;
    }
    closeAbove(D);
    if (skipping) { skipping = false; return; }
    if (s.ov && !stack.some(o => o.id === s.ov)) { skipping = true; if (D < prev) H.back(); else H.forward(); } // stale overlay entry: skip over it
  });
  G.addEventListener('hashchange', () => { stamp(); });
  /** Drop every overlay without touching history (page teardown). */
  function dropAll() { while (stack.length) { const o = stack.pop(); try { o.close('drop'); } catch (e) { /* */ } } }

  function locked() { return !!document.getElementById('u45-lock') || !!document.getElementById('u45-block'); }
  function parentOf(h) {
    if (parentFn) { const p = parentFn(h); if (p) return p; }
    let m; if ((m = /^#\/m\/(\d+)\./.exec(h))) return '#/cat/' + m[1];
    if (/^#\/(library|social)\/./.test(h)) return '#/' + h.split('/')[1];
    return (h && h !== '#/' && h !== '#') ? '#/' : null;
  }
  const isRoot = () => { const h = location.hash || '#/'; return h === '#/' || h === '#'; };
  const cap = () => G.Capacitor && G.Capacitor.isNativePlatform && G.Capacitor.isNativePlatform() ? G.Capacitor : null;
  /** Go back one step: top overlay, else previous screen, else the parent screen; on Android at the main menu, leave the app. */
  function back(src) {
    if (locked()) return 'locked';
    prune(); if (stack.length) { const o = stack[stack.length - 1]; o.close('back'); return 'overlay'; }
    if (document.body && /\bvm-/.test(document.body.className) && G.U45Rail) { G.U45Rail.setMode('normal'); return 'restore'; }
    if (D > 0) { H.back(); return 'history'; }
    const p = parentOf(location.hash || '#/'); if (p) { const old = location.href; try { H.replaceState({ d: D }, '', p); G.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: old, newURL: location.href })); } catch (e) { location.hash = p; } return 'parent'; } // replace, so Back never loops
    if (src === 'hardware' && cap() && cap().Plugins.App) { cap().Plugins.App.exitApp(); return 'exit'; }
    return 'root';
  }
  const editable = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); back('key'); return; }
    if (e.key === 'BrowserBack') { e.preventDefault(); back('key'); return; }
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    prune(); if (stack.length) { e.preventDefault(); e.stopPropagation(); back('esc'); return; }
    if (/\bvm-/.test(document.body.className)) return; // rail restores the view
    if (document.getElementById('stage') || locked() || editable(e.target)) return; // on a calculator Esc stays AC / clear
    if (!isRoot()) { e.preventDefault(); back('esc'); }
  }, true);
  document.addEventListener('mouseup', (e) => { if (e.button === 3) { e.preventDefault(); back('mouse'); } });
  // Android hardware / gesture back (Capacitor App plugin). Registering a listener replaces Capacitor's default.
  function hookCapacitor() { const c = cap(); if (!c || !c.Plugins || !c.Plugins.App || hookCapacitor.done) return; hookCapacitor.done = true; try { c.Plugins.App.addListener('backButton', () => back('hardware')); } catch (e) { /* */ } }
  hookCapacitor(); G.addEventListener('DOMContentLoaded', hookCapacitor); setTimeout(hookCapacitor, 800);

  /** Standard labelled back button HTML. */
  const button = (cls, label) => `<button type="button" class="u45-back ${cls || ''}" aria-label="Back to the previous screen">← ${label || 'Back'}</button>`;
  G.U45Nav = { open, done, back, dropAll, button, parentOf, setParent: (f) => { parentFn = f; }, depth: () => D, overlays: () => { prune(); return stack.map(o => o.kind); }, isRoot };
})(typeof window !== 'undefined' ? window : globalThis);
