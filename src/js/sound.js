/* U-45 CALCULATORS — sound system.
 * 30 instruments synthesised at runtime with WebAudio (no sample files, no
 * third-party audio): works offline and in the Android WebView after a gesture.
 * Occasion -> motif (short note pattern) -> instrument voice.
 * Errors add a low "buzz" layer so they never sound like a key tap.
 * Low latency: one AudioContext (interactive), cached buffers, voice cap,
 * per-occasion throttle, master compressor to prevent clipping. */
(function (G) {
  'use strict';
  const LEFT = ['drum', 'guitar', 'strings', 'flute', 'synth', 'jazz', 'reggae', 'folk', 'hiphop', 'blues', 'waltz', 'sitar', 'shanty', 'rain', 'coin'];
  const RIGHT = ['piano', 'brass', 'choir', 'bass', 'chip', 'latin', 'rock', 'opera', 'country', 'march', 'gamelan', 'bagpipe', 'bell', 'thunder', 'typewriter'];
  const SOUNDS = LEFT.concat(RIGHT);
  const LABEL = { hiphop: 'Hip-hop', typewriter: 'Typewriter' };
  const label = (s) => LABEL[s] || s[0].toUpperCase() + s.slice(1);

  // [semitone, start(s), dur(s), velocity]
  const OCC = [
    ['keyTap', 'Key tap (any key)', [[0, 0, 0.08, 0.5]]],
    ['digit', 'Digit key', [[7, 0, 0.08, 0.55]]],
    ['operator', 'Operator (+ − × ÷ ^)', [[12, 0, 0.09, 0.6]]],
    ['equals', 'Equals / result', [[0, 0, 0.1, 0.6], [4, 0.07, 0.1, 0.6], [7, 0.14, 0.2, 0.7]]],
    ['clear', 'Clear (C / CE / CLx)', [[7, 0, 0.08, 0.5], [0, 0.07, 0.12, 0.5]]],
    ['allClear', 'All-clear (AC / CLΣ)', [[12, 0, 0.07, 0.5], [7, 0.06, 0.07, 0.5], [0, 0.12, 0.16, 0.5]]],
    ['del', 'Delete / backspace', [[-5, 0, 0.06, 0.45]]],
    ['syntaxError', 'Syntax error', [[-12, 0, 0.2, 0.8], [-11, 0.2, 0.3, 0.8]], 'err'],
    ['mathError', 'Math error (÷0 etc.)', [[-12, 0, 0.15, 0.8], [-18, 0.15, 0.4, 0.8]], 'err'],
    ['overflow', 'Overflow / out of range', [[0, 0, 0.07, 0.7], [12, 0.07, 0.07, 0.7], [24, 0.14, 0.07, 0.7], [-12, 0.22, 0.4, 0.9]], 'err'],
    ['memStore', 'Memory store (STO / M+)', [[0, 0, 0.08, 0.55], [12, 0.06, 0.12, 0.55]]],
    ['memRecall', 'Memory recall (RCL / MR)', [[12, 0, 0.08, 0.55], [0, 0.06, 0.12, 0.55]]],
    ['modeChange', 'Mode / setup change', [[0, 0, 0.08, 0.5], [5, 0.06, 0.12, 0.5]]],
    ['angleChange', 'Angle unit change (DRG)', [[0, 0, 0.06, 0.5], [7, 0.05, 0.06, 0.5], [0, 0.1, 0.1, 0.5]]],
    ['calcOpen', 'Calculator open', [[0, 0, 0.1, 0.55], [7, 0.08, 0.1, 0.55], [12, 0.16, 0.25, 0.6]]],
    ['back', 'Back / home', [[12, 0, 0.08, 0.5], [5, 0.07, 0.15, 0.5]]],
    ['categoryOpen', 'Category open', [[0, 0, 0.08, 0.5], [4, 0.06, 0.13, 0.5]]],
    ['graphPlot', 'Graph plotted', [[0, 0, 0.06, 0.5], [4, 0.05, 0.06, 0.5], [7, 0.1, 0.06, 0.5], [11, 0.15, 0.06, 0.5], [14, 0.2, 0.3, 0.6]]],
    ['finSolve', 'Financial solve (CPT)', [[0, 0, 0.08, 0.6], [7, 0.07, 0.08, 0.6], [12, 0.14, 0.08, 0.6], [16, 0.21, 0.3, 0.7]]],
    ['rpnEnter', 'RPN ENTER / stack push', [[-5, 0, 0.07, 0.55], [0, 0.06, 0.1, 0.55]]],
    ['stackPop', 'Stack pop / roll / swap', [[0, 0, 0.07, 0.5], [-5, 0.06, 0.1, 0.5]]],
    ['pinOk', 'PIN correct', [[0, 0, 0.1, 0.6], [4, 0.08, 0.1, 0.6], [7, 0.16, 0.1, 0.6], [12, 0.24, 0.35, 0.7]]],
    ['pinWrong', 'PIN wrong', [[-12, 0, 0.25, 0.8], [-12, 0.3, 0.3, 0.8]], 'err'],
    ['settingsToggle', 'Settings toggle', [[9, 0, 0.06, 0.45]]],
    ['copy', 'Copy result', [[12, 0, 0.05, 0.5], [19, 0.05, 0.09, 0.5]]],
    ['shift', 'SHIFT / 2nd / ALPHA', [[3, 0, 0.05, 0.4]]],
    ['navigate', 'Cursor / menu navigation', [[2, 0, 0.04, 0.35]]],
    ['save', 'Save session', [[0, 0, 0.08, 0.55], [7, 0.08, 0.08, 0.55], [16, 0.16, 0.2, 0.6]]],
    ['share', 'Share / export', [[7, 0, 0.07, 0.55], [12, 0.06, 0.07, 0.55], [19, 0.12, 0.16, 0.6]]],
    ['print', 'Print', [[0, 0, 0.05, 0.5], [0, 0.06, 0.05, 0.5], [0, 0.12, 0.05, 0.5], [12, 0.2, 0.15, 0.55]]],
    ['undo', 'Undo', [[5, 0, 0.07, 0.5], [0, 0.06, 0.1, 0.5]]],
    ['redo', 'Redo', [[0, 0, 0.07, 0.5], [5, 0.06, 0.1, 0.5]]],
    ['deleteItem', 'Delete step / item', [[-5, 0, 0.06, 0.5], [-10, 0.06, 0.1, 0.5]]],
    ['speak', 'Read aloud (TTS)', [[7, 0, 0.1, 0.45]]],
    ['pin', 'Pin to favourites', [[12, 0, 0.06, 0.5], [16, 0.05, 0.06, 0.5], [19, 0.1, 0.12, 0.5]]]
  ];
  const OCC_MAP = {}; OCC.forEach(o => { OCC_MAP[o[0]] = o; });

  // ---- settings -------------------------------------------------------------
  const KEY = 'u45.snd';
  const DEF = { on: false, mute: false, vol: 0.35, theme: 'piano', perOcc: false, map: {} };
  let S = load();
  function load() { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, DEF); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage off */ } }
  function set(k, v) { S[k] = v; save(); if (k === 'vol' || k === 'mute' || k === 'on') applyGain(); }
  function soundFor(occ) { return (S.perOcc && S.map[occ] && SOUNDS.includes(S.map[occ])) ? S.map[occ] : S.theme; }

  // ---- audio graph ----------------------------------------------------------
  let ac = null, master = null, comp = null, noiseBuf = null, brownBuf = null;
  const ksCache = {}; const active = []; const last = {}; const MAX_VOICES = 14;
  function ctx() {
    if (ac) return ac;
    const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return null;
    try { ac = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ac = new AC(); } catch (e2) { return null; } }
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 8; comp.attack.value = 0.002; comp.release.value = 0.12;
    master = ac.createGain(); master.connect(comp); comp.connect(ac.destination); applyGain();
    const n = ac.sampleRate; noiseBuf = ac.createBuffer(1, n, n); brownBuf = ac.createBuffer(1, n * 2, n);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const b = brownBuf.getChannelData(0); let l = 0; for (let i = 0; i < b.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = l * 3.5; }
    return ac;
  }
  function applyGain() { if (master) master.gain.setTargetAtTime((S.on && !S.mute) ? S.vol * 0.8 : 0, ac.currentTime, 0.01); }
  /** Must be called from a user gesture (Android WebView / iOS autoplay rules). */
  function unlock() { if (!S.on) return; const c = ctx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(ev => G.addEventListener(ev, unlock, { capture: true, passive: true }));

  // ---- building blocks ------------------------------------------------------
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, d, sus, rel, end) {
    const p = g.gain; p.cancelScheduledValues(t); p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (sus != null) { p.setTargetAtTime(peak * sus, t + a, d / 3); p.setTargetAtTime(0.0001, end, rel / 4); }
    else p.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f, t, stop, dest, detune) {
    const o = ac.createOscillator(); if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(stop); return o;
  }
  function gain(dest, v) { const g = ac.createGain(); g.gain.value = v == null ? 1 : v; g.connect(dest); return g; }
  function filt(type, f, q, dest) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; b.connect(dest); return b; }
  function noise(t, stop, dest, brown) { const s = ac.createBufferSource(); s.buffer = brown ? brownBuf : noiseBuf; s.loop = true; s.connect(dest); s.start(t, Math.random() * 0.5); s.stop(stop); return s; }
  let shaper = null;
  function drive(dest, amt) { const w = ac.createWaveShaper(); const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = Math.tanh(x * amt); } w.curve = c; w.oversample = '2x'; w.connect(dest); return w; }
  /** Karplus–Strong plucked string, cached per (freq, brightness). */
  function ks(f, dur, bright, buzz) {
    const k = Math.round(f) + ':' + bright + ':' + (buzz ? 1 : 0) + ':' + dur.toFixed(2); if (ksCache[k]) return ksCache[k];
    const sr = ac.sampleRate, len = Math.floor(sr * dur), N = Math.max(2, Math.round(sr / f));
    const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    let p = 0; for (let i = 0; i < len; i++) { const nx = (p + 1) % N; const v = ring[p]; ring[p] = (bright * v + (1 - bright) * ring[nx]) * 0.996; if (buzz && v > 0.25) ring[p] *= 0.82; d[i] = v; p = nx; }
    if (Object.keys(ksCache).length > 120) for (const kk in ksCache) delete ksCache[kk];
    return (ksCache[k] = buf);
  }
  function play(buf, t, dest, rate) { const s = ac.createBufferSource(); s.buffer = buf; if (rate) s.playbackRate.value = rate; s.connect(dest); s.start(t); return s; }
  let pw125 = null; function pulse() { if (pw125) return pw125; const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.125); return (pw125 = ac.createPeriodicWave(re, im)); }
  function vibrato(o, t, rate, depth) { const l = ac.createOscillator(); const g = ac.createGain(); l.frequency.value = rate; g.gain.value = depth; l.connect(g); g.connect(o.frequency); l.start(t); l.stop(t + 3); }

  // ---- 30 instruments: (t, midi, dur, vel, out) -> end time --------------------
  const I = {
    drum(t, m, d, v, out) { const g = gain(out); const o = osc('sine', 60 + (m - 60) * 3, t, t + 0.4, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.25); env(g, t, 0.002, v, 0.3); const ng = gain(out); noise(t, t + 0.06, filt('highpass', 1800, 0.7, ng)); env(ng, t, 0.001, v * 0.35, 0.05); return t + 0.4; },
    guitar(t, m, d, v, out) { const f = mtof(m); const g = gain(filt('lowpass', 3200, 0.5, out), v * 0.9); play(ks(f, 1.2, 0.5), t, g); return t + 1.0; },
    strings(t, m, d, v, out) { const f = mtof(m), e = t + Math.max(d, 0.18); const lp = filt('lowpass', 2400, 0.6, out); const g = gain(lp); [-9, 0, 8].forEach(dt => { const o = osc('sawtooth', f, t, e + 0.3, g, dt); vibrato(o, t, 5.5, f * 0.006); }); env(g, t, 0.06, v * 0.22, 0.2, 0.85, 0.25, e); return e + 0.3; },
    flute(t, m, d, v, out) { const f = mtof(m + 12), e = t + Math.max(d, 0.15); const g = gain(out); const o = osc('sine', f, t, e + 0.2, g); vibrato(o, t + 0.05, 5, f * 0.008); osc('sine', f * 2, t, e + 0.2, gain(g, 0.12)); const n = gain(out); noise(t, e, filt('bandpass', f * 2, 3, n)); env(n, t, 0.02, v * 0.12, 0.1, 0.4, 0.1, e); env(g, t, 0.04, v * 0.55, 0.1, 0.8, 0.15, e); return e + 0.2; },
    synth(t, m, d, v, out) { const f = mtof(m), e = t + Math.max(d, 0.12); const lp = filt('lowpass', 400, 8, out); lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(4800, t + 0.06); lp.frequency.exponentialRampToValueAtTime(700, e + 0.1); const g = gain(lp); osc('square', f, t, e + 0.15, g, -7); osc('sawtooth', f, t, e + 0.15, g, 7); env(g, t, 0.005, v * 0.3, 0.1, 0.6, 0.1, e); return e + 0.15; },
    jazz(t, m, d, v, out) { const f = mtof(m); const g = gain(out); const mod = ac.createOscillator(); const mg = ac.createGain(); mod.frequency.value = f; mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.1, t + 0.5); mod.connect(mg); const c = osc('sine', f, t, t + 0.9, g); mg.connect(c.frequency); mod.start(t); mod.stop(t + 0.9); const trem = ac.createOscillator(); const tg = ac.createGain(); trem.frequency.value = 5.5; tg.gain.value = v * 0.12; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t + 0.9); env(g, t, 0.004, v * 0.5, 0.8); const b = gain(out); noise(t, t + 0.12, filt('highpass', 6000, 0.5, b)); env(b, t, 0.01, v * 0.08, 0.1); return t + 0.9; },
    reggae(t, m, d, v, out) { const dl = ac.createDelay(1); dl.delayTime.value = 0.18; const fb = gain(dl, 0.35); dl.connect(fb); const wet = gain(out, 0.5); dl.connect(wet); const g = gain(out); g.connect(dl); const bp = filt('bandpass', 1400, 1.2, g); [0, 4, 7].forEach(s => osc('square', mtof(m + s), t, t + 0.1, bp)); env(g, t, 0.002, v * 0.3, 0.07); return t + 0.8; },
    folk(t, m, d, v, out) { const f = mtof(m + 12); const g = gain(filt('peaking', 2500, 2, out), v); play(ks(f, 0.6, 0.15), t, g); play(ks(f * 1.5, 0.5, 0.15), t + 0.012, gain(g, 0.5)); return t + 0.6; },
    hiphop(t, m, d, v, out) { const g = gain(out); const o = osc('sine', 110, t, t + 0.45, g); o.frequency.exponentialRampToValueAtTime(mtof(m - 24), t + 0.08); env(g, t, 0.003, v * 0.9, 0.42); const c = gain(drive(out, 3)); const k = osc('triangle', 180, t, t + 0.05, c); k.frequency.exponentialRampToValueAtTime(50, t + 0.05); env(c, t, 0.001, v * 0.4, 0.05); if (d > 0.09) { const n = gain(out); noise(t + 0.05, t + 0.2, filt('bandpass', 1800, 0.8, n)); env(n, t + 0.05, 0.002, v * 0.35, 0.13); } return t + 0.45; },
    blues(t, m, d, v, out) { const f = mtof(m + 12), e = t + Math.max(d, 0.16); const bp = filt('bandpass', 1600, 2.5, out); const g = gain(bp); const o = osc('sawtooth', f * Math.pow(2, -1 / 12), t, e + 0.15, g); o.frequency.linearRampToValueAtTime(f, t + 0.07); vibrato(o, t + 0.08, 6, f * 0.01); env(g, t, 0.02, v * 0.55, 0.1, 0.8, 0.12, e); return e + 0.15; },
    waltz(t, m, d, v, out) { const g = gain(filt('lowpass', 2600, 0.6, out)); const step = 0.07; [[m - 12, 0], [m + 4, step], [m + 7, step * 2]].forEach(([n, o]) => { const gg = gain(g); osc('sawtooth', mtof(n), t + o, t + o + 0.12, gg, 6); osc('square', mtof(n), t + o, t + o + 0.12, gg, -6); env(gg, t + o, 0.005, v * 0.14, 0.1); }); return t + step * 2 + 0.15; },
    sitar(t, m, d, v, out) { const f = mtof(m); const sh = drive(filt('peaking', 3000, 3, out), 2.2); const g = gain(sh, v * 0.7); const s = play(ks(f, 1.3, 0.62, true), t, g); s.playbackRate.setValueAtTime(1, t + 0.08); s.playbackRate.linearRampToValueAtTime(1.06, t + 0.3); play(ks(mtof(m - 12), 1.3, 0.6, true), t, gain(g, 0.25)); return t + 1.2; },
    shanty(t, m, d, v, out) { const f = mtof(m), e = t + Math.max(d, 0.16); const g = gain(filt('lowpass', 3000, 0.7, out)); [-14, 0, 14].forEach(dt => osc('sawtooth', f, t, e + 0.15, g, dt)); osc('square', f / 2, t, e + 0.15, gain(g, 0.4)); env(g, t, 0.05, v * 0.16, 0.1, 0.9, 0.12, e); return e + 0.15; },
    rain(t, m, d, v, out) { const ng = gain(filt('highpass', 3000, 0.4, out)); noise(t, t + 0.35, ng); env(ng, t, 0.04, v * 0.08, 0.3); for (let i = 0; i < 4; i++) { const tt = t + Math.random() * 0.25; const g = gain(out); const o = osc('sine', mtof(m + 24 + Math.random() * 10), tt, tt + 0.06, g); o.frequency.exponentialRampToValueAtTime(mtof(m + 36), tt + 0.03); env(g, tt, 0.001, v * 0.3, 0.05); } return t + 0.4; },
    coin(t, m, d, v, out) { const g = gain(out); const o = osc('square', mtof(m + 23), t, t + 0.35, g); o.frequency.setValueAtTime(mtof(m + 28), t + 0.06); env(g, t, 0.001, v * 0.18, 0.33); return t + 0.35; },
    piano(t, m, d, v, out) { const f = mtof(m); const g = gain(out); [[1, 1], [2, 0.42], [3, 0.2], [4, 0.1], [5.02, 0.05]].forEach(([h, a]) => { const gg = gain(g, a); osc('sine', f * h, t, t + 1.2, gg, h > 1 ? 2 : 0); }); env(g, t, 0.003, v * 0.45, 1.0); const hm = gain(out); noise(t, t + 0.02, filt('bandpass', 2500, 1, hm)); env(hm, t, 0.001, v * 0.08, 0.02); return t + 1.2; },
    brass(t, m, d, v, out) { const f = mtof(m), e = t + Math.max(d, 0.14); const lp = filt('lowpass', 500, 2, out); lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(3400, t + 0.05); lp.frequency.setTargetAtTime(1800, t + 0.06, 0.1); const g = gain(lp); const o = osc('sawtooth', f * 0.97, t, e + 0.15, g); o.frequency.linearRampToValueAtTime(f, t + 0.04); osc('sawtooth', f, t, e + 0.15, g, 5); env(g, t, 0.03, v * 0.3, 0.1, 0.85, 0.1, e); return e + 0.15; },
    choir(t, m, d, v, out) { const f = mtof(m), e = t + Math.max(d, 0.2); const mix = gain(out); const g = ac.createGain(); [[800, 6, 1], [1150, 8, 0.5], [2900, 10, 0.25]].forEach(([fr, q, a]) => { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = q; g.connect(b); b.connect(gain(mix, a * 3)); }); [-10, 0, 9, 4].forEach(dt => { const o = osc('sawtooth', f, t, e + 0.3, g, dt); vibrato(o, t, 4.8 + Math.random(), f * 0.006); }); env(mix, t, 0.08, v * 0.4, 0.15, 0.85, 0.3, e); return e + 0.3; },
    bass(t, m, d, v, out) { const f = mtof(m - 24); const g = gain(filt('lowpass', 900, 1, out), v * 1.1); play(ks(f, 0.9, 0.2), t, g); osc('sine', f, t, t + 0.5, (() => { const s = gain(out); env(s, t, 0.004, v * 0.4, 0.45); return s; })()); return t + 0.8; },
    chip(t, m, d, v, out) { const g = gain(out); const o = osc(pulse(), mtof(m + 12), t, t + Math.max(d, 0.08) + 0.05, g); [0, 4, 7].forEach((s, i) => o.frequency.setValueAtTime(mtof(m + 12 + s), t + i * 0.025)); env(g, t, 0.001, v * 0.2, Math.max(d, 0.08)); return t + Math.max(d, 0.08) + 0.05; },
    latin(t, m, d, v, out) { const cl = gain(filt('bandpass', 2500, 8, out)); osc('sine', 2500, t, t + 0.05, cl); env(cl, t, 0.001, v * 1.2, 0.04); const f = mtof(m + 12); const g = gain(out); osc('sine', f, t + 0.01, t + 0.5, g); osc('sine', f * 4, t + 0.01, t + 0.2, gain(g, 0.25)); env(g, t + 0.01, 0.002, v * 0.45, 0.45); return t + 0.5; },
    rock(t, m, d, v, out) { const e = t + Math.max(d, 0.18); const cab = filt('lowpass', 3500, 0.8, out); const g = gain(drive(cab, 6)); [0, 7, 12].forEach(s => osc('sawtooth', mtof(m - 12 + s), t, e + 0.2, g, Math.random() * 8)); env(g, t, 0.004, v * 0.3, 0.2, 0.6, 0.2, e); return e + 0.2; },
    opera(t, m, d, v, out) { const f = mtof(m + 12), e = t + Math.max(d, 0.22); const mix = gain(out); const g = ac.createGain(); [[900, 9, 1], [1300, 10, 0.5], [3100, 12, 0.3]].forEach(([fr, q, a]) => { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = q; g.connect(b); b.connect(gain(mix, a * 4)); }); const o = osc('sawtooth', f, t, e + 0.3, g); vibrato(o, t + 0.04, 6.2, f * 0.03); osc('sine', f, t, e + 0.3, gain(mix, 0.3)); env(mix, t, 0.05, v * 0.45, 0.1, 0.9, 0.25, e); return e + 0.3; },
    country(t, m, d, v, out) { const f = mtof(m + 12); const g = gain(filt('highshelf', 2500, null, out), v); const s = play(ks(f, 1.0, 0.3), t, g); s.playbackRate.setValueAtTime(Math.pow(2, -2 / 12), t); s.playbackRate.linearRampToValueAtTime(1, t + 0.09); return t + 1.0; },
    march(t, m, d, v, out) { const hits = d > 0.09 ? [0, 0.045, 0.09] : [0]; hits.forEach((o, i) => { const n = gain(out); noise(t + o, t + o + 0.14, filt('bandpass', 2600, 0.6, n)); env(n, t + o, 0.001, v * (i === hits.length - 1 ? 0.6 : 0.35), 0.12); const g = gain(out); osc('triangle', 185 * Math.pow(2, (m - 60) / 48), t + o, t + o + 0.1, g); env(g, t + o, 0.001, v * 0.35, 0.08); }); return t + 0.3; },
    gamelan(t, m, d, v, out) { const f = mtof(m + 12); const g = gain(out); [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]].forEach(([h, a]) => { osc('sine', f * h, t, t + 1.4, gain(g, a)); osc('sine', f * h * 1.004, t, t + 1.4, gain(g, a * 0.6)); }); env(g, t, 0.002, v * 0.3, 1.3); return t + 1.4; },
    bagpipe(t, m, d, v, out) { const f = mtof(m + 12), e = t + Math.max(d, 0.18); const dr = gain(filt('lowpass', 900, 1, out)); osc('sawtooth', mtof(45), t, e + 0.12, dr); env(dr, t, 0.03, v * 0.12, 0.1, 1, 0.1, e); const g = gain(filt('bandpass', 1500, 1.4, out)); const o = osc('square', f * 2, t, e + 0.12, g); o.frequency.setValueAtTime(f, t + 0.035); env(g, t, 0.005, v * 0.3, 0.1, 0.95, 0.1, e); return e + 0.12; },
    bell(t, m, d, v, out) { const f = mtof(m + 12); const g = gain(out); const mod = ac.createOscillator(); const mg = ac.createGain(); mod.frequency.value = f * 1.4; mg.gain.setValueAtTime(f * 2.5, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.4); mod.connect(mg); const c = osc('sine', f, t, t + 1.6, g); mg.connect(c.frequency); mod.start(t); mod.stop(t + 1.6); env(g, t, 0.001, v * 0.4, 1.5); return t + 1.6; },
    thunder(t, m, d, v, out) { const len = Math.min(1.2, 0.35 + d * 3); const lp = filt('lowpass', 160 + (m - 48) * 4, 0.7, out); const g = gain(lp); noise(t, t + len, g, true); env(g, t, 0.02, v * 1.6, len); const cr = gain(filt('lowpass', 2200, 0.5, out)); noise(t, t + 0.12, cr); env(cr, t, 0.002, v * 0.4, 0.1); return t + len; },
    typewriter(t, m, d, v, out) { const n = gain(filt('highpass', 2500 + (m - 60) * 40, 1.5, out)); noise(t, t + 0.03, n); env(n, t, 0.0005, v * 0.9, 0.025); const b = gain(filt('bandpass', 700, 4, out)); noise(t + 0.008, t + 0.04, b); env(b, t + 0.008, 0.001, v * 0.6, 0.03); if (d >= 0.2) { const g = gain(out); osc('sine', 2093, t + 0.05, t + 0.8, g); env(g, t + 0.05, 0.001, v * 0.25, 0.7); } return t + (d >= 0.2 ? 0.8 : 0.06); }
  };
  const BASE = { bass: 60, drum: 60, thunder: 48, typewriter: 60, hiphop: 60 };

  /** Low "wrong" buzz layered under every error occasion. */
  function errBuzz(t, v) {
    const g = gain(filt('lowpass', 900, 3, master)); const o = osc('square', 110, t, t + 0.42, g); osc('sawtooth', 116.5, t, t + 0.42, g);
    o.frequency.linearRampToValueAtTime(92, t + 0.4); env(g, t, 0.005, v * 0.22, 0.12, 0.8, 0.1, t + 0.32); return t + 0.42;
  }

  function prune(now) { for (let i = active.length - 1; i >= 0; i--) if (active[i].end < now) active.splice(i, 1); }
  /** Play an occasion (or a raw preview when opts.sound is given). */
  function playOcc(occ, opts) {
    opts = opts || {};
    if (!opts.force && (!S.on || S.mute)) return false;
    const o = OCC_MAP[occ] || OCC_MAP.keyTap; const c = ctx(); if (!c) return false;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const now = c.currentTime; if (!opts.force && last[occ] && now - last[occ] < 0.03) return false; last[occ] = now;
    prune(now);
    while (active.length > MAX_VOICES) { const v = active.shift(); try { v.g.gain.setTargetAtTime(0, now, 0.01); } catch (e) { /* gone */ } }
    const snd = opts.sound || soundFor(occ); const inst = I[snd] || I.piano; const base = BASE[snd] || 60;
    const bus = c.createGain(); bus.gain.value = 1; bus.connect(master);
    const t0 = now + 0.005; let end = t0;
    try {
      o[2].forEach(([st, at, dur, vel]) => { end = Math.max(end, inst(t0 + at, base + st, dur, vel, bus)); });
      if (o[3] === 'err') end = Math.max(end, errBuzz(t0, 1));
    } catch (e) { return false; }
    active.push({ g: bus, end });
    setTimeout(() => { try { bus.disconnect(); } catch (e) { /* ok */ } }, (end - now) * 1000 + 400);
    return true;
  }
  function preview(sound, occ) { if (!S.on) return false; return playOcc(occ || 'equals', { sound, force: true }); }

  // ---- classify a calculator key press into an occasion ---------------------
  const RX = [
    [/^d[0-9]$|^dot$|^hex:|^exp10$|^ee$|^eex$|^neg$|^chs$|^d00$/, 'digit'],
    [/^(add|sub|mul|div|pow|ypow|root|xroot|npr|ncr|lp|rp|mod)$/, 'operator'],
    [/^(exe|eq|ok|tot|subtot|gt|addeq|mtot)$/, 'equals'],
    [/^(ac|onac|on|clst|clreg|clall|clearall|ca|onca|clrtvm|clfin)$/, 'allClear'],
    [/^(c|ce|cec|clx|onc|clear|clrwork)$/, 'clear'],
    [/^(del|bksp|back|undo)$/, 'del'],
    [/^(sto|stoarrow|min|mplus|mminus|msto|xm|stoplus)$/, 'memStore'],
    [/^(rcl|mr|mrc|rm)$/, 'memRecall'],
    [/^(drg|drgcycle|deg|rad|grad|degm|radm|gradm|drgm)$/, 'angleChange'],
    [/^(mode|setup|setupg|gmode|modemenu|format|disp|menu:MODES|ws:FORMAT)$/, 'modeChange'],
    [/^(rdn|rup|swap|xy|xyswap|rolld|rollu|lastx|clxpop)$/, 'stackPop'],
    [/^(shift|alpha|second|2nd|third|f|g|gshift|fshift|hyp)$/, 'shift'],
    [/^(up|down|left|right|quit|exit|esc|home|menu|esc)$/, 'navigate'],
    [/^(graph|plot|trace|zoom|zfit|zsq|zstd)$/, 'graphPlot'],
    [/^(copy)$/, 'copy']
  ];
  function classify(act, app) {
    if (!act) return 'keyTap';
    const isRPN = app && app.s && typeof app.s === 'object' && 'x' in app.s;
    if (act === 'enter') return isRPN ? 'rpnEnter' : 'equals';
    for (const [re, o] of RX) if (re.test(act)) return o;
    return 'keyTap';
  }
  function errorOcc(text, hint) {
    const t = String(text || '');
    if (/syntax|argument|dim/i.test(t)) return 'syntaxError';
    if (/range|overflow/i.test(t) || hint === 'overflow') return 'overflow';
    return 'mathError';
  }

  G.U45Sound = {
    SOUNDS, LEFT, RIGHT, OCC, label, settings: () => Object.assign({}, S, { map: Object.assign({}, S.map) }), set,
    setMap(occ, snd) { if (snd) S.map[occ] = snd; else delete S.map[occ]; save(); },
    play: playOcc, preview, classify, errorOcc, unlock, soundFor,
    _instruments: I, _reset() { S = Object.assign({}, DEF, { map: {} }); save(); }
  };
})(window);
