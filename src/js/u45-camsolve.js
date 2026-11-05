/* U-45 v1.4 — Camera Solve: camera / image / PDF / text → offline OCR (bundled tesseract.js + eng) → editable text → step-by-step solve. */
(function (G) {
  'use strict';
  const base = () => new URL('vendor/tesseract/', G.location.href).href;
  const loadScript = (src) => new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
  let workerP = null, workerLang = '';
  async function worker(lang) {
    lang = lang || 'eng';
    if (workerP && workerLang === lang) return workerP;
    if (workerP) { try { (await workerP).terminate(); } catch (e) { /* */ } }
    workerLang = lang;
    workerP = (async () => {
      await loadScript(base() + 'tesseract.min.js');
      const T = G.Tesseract; const b = base();
      const online = lang !== 'eng';
      return T.createWorker(lang, 1, { workerPath: b + 'worker.min.js', corePath: b + 'core/', langPath: online ? 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/' + lang + '/4.0.0_best_int' : b + 'lang', workerBlobURL: false, gzip: true, cacheMethod: online ? 'write' : 'none' });
    })();
    workerP.catch(() => { workerP = null; });
    return workerP;
  }
  /** Grayscale + contrast stretch + upscale small images: better OCR on photos of printed/handwritten maths. */
  function prep(src) {
    const w0 = src.naturalWidth || src.videoWidth || src.width, h0 = src.naturalHeight || src.videoHeight || src.height;
    const sc = Math.max(1, Math.min(3, 1400 / Math.max(w0, h0))) * Math.min(1, 2400 / Math.max(w0, h0));
    const c = document.createElement('canvas'); c.width = Math.round(w0 * sc); c.height = Math.round(h0 * sc);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data; let mn = 255, mx = 0; const g = new Uint8Array(p.length / 4);
    for (let i = 0, j = 0; i < p.length; i += 4, j++) { const v = (p[i] * 299 + p[i + 1] * 587 + p[i + 2] * 114) / 1000; g[j] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
    const r = Math.max(1, mx - mn); for (let i = 0, j = 0; i < p.length; i += 4, j++) { const v = Math.max(0, Math.min(255, (g[j] - mn) * 255 / r)); p[i] = p[i + 1] = p[i + 2] = v; }
    x.putImageData(d, 0, 0); return c;
  }
  async function ocr(src, lang, onProg) {
    const S = G.U45Prefs ? G.U45Prefs.settings() : {};
    let use = 'eng'; if (S.ocrOnline && lang && lang !== 'eng' && navigator.onLine) use = lang;
    let w;
    try { w = await worker(use); } catch (e) {
      if (use !== 'eng') { try { w = await worker('eng'); } catch (e2) { throw friendly(e2); } } else throw friendly(e);
    }
    if (onProg) onProg('Reading text…');
    const r = await w.recognize(prep(src));
    return { text: (r.data.text || '').trim(), conf: r.data.confidence, lang: workerLang };
  }
  function friendly(e) {
    const m = String(e && e.message || e);
    if (G.location.protocol === 'file:' && !(navigator.userAgent || '').includes('Electron')) return new Error('Offline OCR cannot start when this page is opened directly from a file in a normal browser (browser security blocks the OCR worker). Use the installed app (Android / Windows / Mac / Linux) or open it over http(s). You can still type or paste the problem below and press Solve.');
    return new Error('OCR could not start: ' + m + '. You can type or paste the problem below and press Solve.');
  }
  // ---------- text normalisation → AI engine queries ----------
  function clean(t) {
    return String(t).replace(/[×✕✖]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt').replace(/π/g, 'pi')
      .replace(/(\d)\s*[lI|](?=\d)/g, '$11').replace(/(\d)[oO](?=\d)/g, '$10').replace(/(\d)\s*[xX]\s*(?=\d)/g, '$1*')
      .replace(/[ \t]+/g, ' ').split(/\r?\n/).map(l => l.trim().replace(/^(\(?[a-z0-9]{1,3}[).]|Q\d+[.:)]?|\d+[.)])\s+/i, '').replace(/[.;,:]$/, '')).filter(l => l && /[\d=a-z]/i.test(l)).join('\n');
  }
  const KW = /^(solve|derivative|differentiate|d\/dx|integrate|integral|simplify|factor|evaluate|expand|limit|convert|what|how|is|gcd|lcm|mean|median|truth|prime)/i;
  function toQueries(text) {
    const lines = clean(text).split('\n').filter(Boolean); if (!lines.length) return [];
    const eqs = [], out = [];
    lines.forEach(l => {
      if (KW.test(l)) { out.push(l); return; }
      const ln = l.replace(/=\s*\??\s*$/, '').trim();
      if (/=/.test(ln) && /[a-z]/i.test(ln.replace(/\b(sin|cos|tan|log|ln|sqrt|pi|exp|abs)\b/gi, ''))) eqs.push(ln);
      else if (ln) out.push(ln);
    });
    if (eqs.length === 1) out.unshift('solve ' + eqs[0]);
    else if (eqs.length > 1) out.unshift('solve ' + eqs.join(', '));
    return out;
  }
  function solve(text) {
    const AI = G.U45AI; const qs = toQueries(text);
    if (!qs.length) return [{ q: '', ok: false, error: 'No maths found — edit the text and try again.' }];
    return qs.slice(0, 8).map(q => { let r; try { r = AI ? AI.ask(q) : { ok: false, error: 'Solver not loaded' }; } catch (e) { r = { ok: false, error: e.message }; } return Object.assign({ q }, r); });
  }
  // ---------- file inputs ----------
  function fileToImage(f) { return new Promise((res, rej) => { const u = URL.createObjectURL(f); const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Not an image')); im.src = u; }); }
  async function pdfToCanvas(f, page) {
    if (!G.pdfjsLib) { const b = new URL('vendor/pdfjs/', G.location.href).href; await loadScript(b + 'pdf.min.js'); if (!G.pdfjsWorker) { try { await loadScript(b + 'pdf.worker.min.js'); } catch (e) { /* main-thread fallback */ } } G.pdfjsLib.GlobalWorkerOptions.workerSrc = b + 'pdf.worker.min.js'; }
    const doc = await G.pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false }).promise;
    const pg = await doc.getPage(Math.min(doc.numPages, page || 1)); const tc = await pg.getTextContent().catch(() => null);
    const txt = tc ? tc.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('').trim() : '';
    const vp = pg.getViewport({ scale: 2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; return { canvas: c, text: txt, pages: doc.numPages };
  }

  const FEATURES = ['Live camera capture', 'Take photo (device camera app)', 'Import image (PNG/JPG/WebP)', 'Import PDF (page select, text layer or OCR)', 'Import text file', 'Offline OCR (bundled English data)', 'Optional online OCR languages', 'Image pre-processing (grayscale, contrast, upscale)', 'Editable recognised text', 'Auto-detect equations & systems', 'Step-by-step solution', 'Send answer to calculator', 'Copy solution', 'Saved to calculator history'];
  function open() {
    const SH = G.U45Sheet, esc = SH.esc, S = G.U45Prefs ? G.U45Prefs.settings() : {};
    const sh = SH.sheet('📷 Camera Solve', `<div class="cs-wrap">
      <p class="cs-note">Photograph or import a maths problem, check the recognised text, then solve. OCR runs <b>offline</b> on this device.</p>
      <div class="cs-src"><button class="cs-cam"><span class="nb">1</span>📷 Camera</button><label class="btnlike"><span class="nb">2</span>📸 Take photo<input type="file" accept="image/*" capture="environment" class="cs-shot" hidden></label>
      <label class="btnlike"><span class="nb">3</span>🖼 Image / PDF / text<input type="file" accept="image/*,application/pdf,.pdf,text/plain,.txt" class="cs-file" hidden></label>
      <label class="cs-pg" hidden>PDF page <input type="number" class="cs-page" min="1" value="1"></label>
      <label><span class="nb">7</span>OCR language <select class="cs-lang"><option value="eng">English (offline)</option><option value="fra">French (online)</option><option value="deu">German (online)</option><option value="spa">Spanish (online)</option><option value="por">Portuguese (online)</option><option value="swa">Swahili (online)</option></select></label></div>
      <div class="cs-camwrap" hidden><video class="cs-video" playsinline muted></video><div><button class="cs-snap">● Capture</button><button class="cs-stop">Stop camera</button></div></div>
      <canvas class="cs-prev u45-noimg" hidden></canvas>
      <div class="cs-status" aria-live="polite"></div>
      <label class="cs-tl">Recognised text (edit before solving):<textarea class="cs-text" rows="4" spellcheck="false" placeholder="e.g. 3x + 5 = 20"></textarea></label>
      <div class="cs-btns"><button class="cs-solve xbig">Solve ▶</button><button class="cs-ins" disabled>Send answer to calculator</button><button class="cs-copy" disabled>Copy</button></div>
      <div class="cs-out" aria-live="polite"></div></div>`, { wide: true, onClose: () => stopCam() });
    const b = sh.body, st = b.querySelector('.cs-status'), ta = b.querySelector('.cs-text'), out = b.querySelector('.cs-out'), pv = b.querySelector('.cs-prev'), video = b.querySelector('.cs-video');
    const lang = b.querySelector('.cs-lang'); lang.value = S.ocrLang || 'eng'; if (!S.ocrOnline) [...lang.options].forEach(o => { if (o.value !== 'eng') o.disabled = true; });
    lang.title = S.ocrOnline ? '' : 'Enable “Online OCR languages” in Settings to use other languages';
    let stream = null, lastAns = '', lastTxt = '', lastFile = null;
    function stopCam() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } b.querySelector('.cs-camwrap').hidden = true; }
    const run = async (src) => {
      pv.hidden = false; const c = prep(src); pv.width = c.width; pv.height = c.height; pv.getContext('2d').drawImage(c, 0, 0);
      st.textContent = 'Loading offline OCR…'; out.innerHTML = '';
      try { const r = await ocr(src, lang.value, (m) => { st.textContent = m; }); ta.value = r.text; st.textContent = r.text ? `Recognised (${Math.round(r.conf)}% confidence, ${r.lang}). Check and edit the text, then press Solve.` : 'No text found — try a sharper, closer photo or type the problem.'; if (r.text) doSolve(); }
      catch (e) { st.textContent = e.message; }
    };
    b.querySelector('.cs-cam').onclick = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { b.querySelector('.cs-shot').click(); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false }); video.srcObject = stream; await video.play(); b.querySelector('.cs-camwrap').hidden = false; st.textContent = 'Point at the problem and press Capture.'; }
      catch (e) { st.textContent = 'Camera unavailable (' + (e.name || e.message) + ') — use “Take photo” or import an image.'; }
    };
    b.querySelector('.cs-snap').onclick = () => { if (!stream) return; const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext('2d').drawImage(video, 0, 0); stopCam(); run(c); };
    b.querySelector('.cs-stop').onclick = stopCam;
    const onFile = async (f) => {
      if (!f) return; lastFile = f; out.innerHTML = '';
      try {
        if (/^text\/|\.txt$/i.test(f.type || f.name)) { ta.value = (await f.text()).slice(0, 4000); pv.hidden = true; st.textContent = 'Text file loaded.'; doSolve(); return; }
        if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
          st.textContent = 'Opening PDF…'; const r = await pdfToCanvas(f, +b.querySelector('.cs-page').value || 1); const pg = b.querySelector('.cs-pg'); pg.hidden = r.pages < 2; b.querySelector('.cs-page').max = r.pages;
          if (r.text && r.text.replace(/\s/g, '').length > 2) { ta.value = r.text.slice(0, 4000); pv.hidden = false; pv.width = r.canvas.width; pv.height = r.canvas.height; pv.getContext('2d').drawImage(r.canvas, 0, 0); st.textContent = `PDF text layer read (page ${Math.min(r.pages, +b.querySelector('.cs-page').value || 1)} of ${r.pages}).`; doSolve(); }
          else run(r.canvas); return;
        }
        run(await fileToImage(f));
      } catch (e) { st.textContent = 'Could not read that file: ' + e.message; }
    };
    b.querySelector('.cs-file').onchange = (e) => onFile(e.target.files[0]);
    b.querySelector('.cs-shot').onchange = (e) => onFile(e.target.files[0]);
    b.querySelector('.cs-page').onchange = () => { if (lastFile && /pdf/i.test(lastFile.type || lastFile.name)) onFile(lastFile); };
    function doSolve() {
      const rs = solve(ta.value); lastTxt = ''; lastAns = '';
      out.innerHTML = rs.map((r, i) => r.ok ? `<div class="ai-card"><div class="ai-t"><span class="nb">${i + 1}</span> ${esc(r.title || r.q)} <small>${esc(r.q)}</small></div><ol>${(r.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="ai-a">Answer: <b>${esc(r.answer)}</b></div></div>` : `<div class="ai-card err"><b>${esc(r.q || 'Problem')}</b>: ${esc(r.error)}</div>`).join('');
      const good = rs.filter(r => r.ok);
      if (good.length) {
        lastAns = String(good[0].answer); lastTxt = good.map(r => r.q + '\n' + (r.steps || []).join('\n') + '\nAnswer: ' + r.answer).join('\n\n');
        const id = G.U45Prefs ? G.U45Prefs.calcId() : 0; if (G.U45History) good.forEach(r => G.U45History.log(id, r.q, r.answer, { src: 'camsolve' }));
      }
      b.querySelector('.cs-ins').disabled = !/^-?[\d.]+(e-?\d+)?$/i.test(lastAns.replace(/\s|,/g, '').replace(/^x\s*=\s*/, '')); b.querySelector('.cs-copy').disabled = !lastTxt;
    }
    b.querySelector('.cs-solve').onclick = doSolve;
    b.querySelector('.cs-ins').onclick = () => { const v = lastAns.replace(/^\s*[a-z]\s*=\s*/i, ''); if (G.U45Workout && G.U45Workout.typeInto) G.U45Workout.typeInto(v); };
    b.querySelector('.cs-copy').onclick = async () => { try { await navigator.clipboard.writeText(lastTxt); SH.toast('Solution copied'); } catch (e) { SH.toast('Copy failed'); } };
    return sh;
  }
  G.U45CamSolve = { open, ocr, solve, toQueries, clean, prep, FEATURES, _worker: worker };
})(typeof window !== 'undefined' ? window : globalThis);
