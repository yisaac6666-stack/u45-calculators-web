/* U-45 v1.4 — Calendar generator (canvas): month/year/week/planner/wall/desk, photo editing, holidays, events, clock, export. */
(function (G) {
  'use strict';
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pad = (n) => String(n).padStart(2, '0');
  const key = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d);
  function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, da); }
  const addD = (dt, n) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
  const nthDow = (y, m, dow, n) => { const f = new Date(y, m, 1); return new Date(y, m, 1 + ((dow - f.getDay() + 7) % 7) + 7 * (n - 1)); };
  // Eid dates depend on moon sighting; these are the expected (approximate) Uganda dates.
  const EID = { 2024: ['2024-04-10', '2024-06-17'], 2025: ['2025-03-31', '2025-06-06'], 2026: ['2026-03-20', '2026-05-27'], 2027: ['2027-03-10', '2027-05-17'], 2028: ['2028-02-27', '2028-05-05'], 2029: ['2029-02-14', '2029-04-24'], 2030: ['2030-02-04', '2030-04-13'] };
  function holidays(y, set) {
    const H = {}; const add = (dt, n, kind) => { const k = typeof dt === 'string' ? dt : key(dt.getFullYear(), dt.getMonth(), dt.getDate()); (H[k] = H[k] || []).push({ n, kind }); };
    const E = easter(y);
    if (set.ug) {
      [['01-01', "New Year's Day"], ['01-26', 'NRM Liberation Day'], ['02-16', 'Archbishop Janani Luwum Day'], ['03-08', "International Women's Day"], ['05-01', 'Labour Day'], ['06-03', "Uganda Martyrs' Day"], ['06-09', "National Heroes' Day"], ['10-09', 'Independence Day'], ['12-25', 'Christmas Day'], ['12-26', 'Boxing Day']].forEach(([d, n]) => add(y + '-' + d, n, 'ug'));
      add(addD(E, -2), 'Good Friday', 'ug'); add(addD(E, 1), 'Easter Monday', 'ug');
      if (EID[y]) { add(EID[y][0], 'Eid al-Fitr (approx.)', 'ug'); add(EID[y][1], 'Eid al-Adha (approx.)', 'ug'); }
    }
    if (set.intl) {
      [['01-01', 'New Year'], ['02-14', "Valentine's Day"], ['03-08', "Women's Day"], ['03-22', 'World Water Day'], ['04-07', 'World Health Day'], ['04-22', 'Earth Day'], ['05-01', 'Workers\' Day'], ['06-05', 'World Environment Day'], ['08-12', 'International Youth Day'], ['09-21', 'International Day of Peace'], ['10-16', 'World Food Day'], ['10-24', 'United Nations Day'], ['12-01', 'World AIDS Day'], ['12-10', 'Human Rights Day'], ['12-25', 'Christmas'], ['12-31', "New Year's Eve"]].forEach(([d, n]) => add(y + '-' + d, n, 'intl'));
      add(E, 'Easter Sunday', 'intl'); add(nthDow(y, 4, 0, 2), "Mother's Day", 'intl'); add(nthDow(y, 5, 0, 3), "Father's Day", 'intl');
    }
    return H;
  }
  function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); }
  function moon(d) { const syn = 29.530588853; const ref = Date.UTC(2000, 0, 6, 18, 14); const age = (((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12) - ref) / 864e5) % syn + syn) % syn; return age < 1.0 || age > syn - 1.0 ? '●' : Math.abs(age - syn / 2) < 1.0 ? '○' : Math.abs(age - syn / 4) < 1.0 ? '◐' : Math.abs(age - 3 * syn / 4) < 1.0 ? '◑' : ''; }
  const SCHEMES = {
    'Black/Yellow': { bg: '#000000', fg: '#FFFF00', grid: '#FFFF00', head: '#FFFF00', headT: '#000000', hol: '#00FFFF', we: '#FF66FF', today: '#00FF00' },
    'White/Black': { bg: '#FFFFFF', fg: '#000000', grid: '#000000', head: '#000000', headT: '#FFFFFF', hol: '#C00000', we: '#0000C0', today: '#008000' },
    'Black/White': { bg: '#000000', fg: '#FFFFFF', grid: '#FFFFFF', head: '#FFFFFF', headT: '#000000', hol: '#FFFF00', we: '#00FFFF', today: '#00FF00' },
    'Navy/Yellow': { bg: '#000040', fg: '#FFFFFF', grid: '#FFFF00', head: '#FFFF00', headT: '#000040', hol: '#00FFFF', we: '#FF99FF', today: '#00FF00' },
    'Uganda': { bg: '#FFFFFF', fg: '#000000', grid: '#000000', head: '#000000', headT: '#FCDC04', hol: '#D90000', we: '#D90000', today: '#008000' }
  };
  const ST = 'u45.cal';
  const DEF = () => ({ fmt: 'month', y: new Date().getFullYear(), m: new Date().getMonth(), wk: 0, weekStart: 1, ug: true, intl: true, weekNo: true, moon: false, scheme: 'Black/Yellow', font: 'Atkinson Hyperlegible', title: '', titleColor: '#FFFF00', titleSize: 64, photo: null, crop: 'fill', zoom: 100, offX: 0, offY: 0, rot: 0, filter: 'none', bright: 100, contrast: 100, flipH: false, events: [], showEvents: true, paper: 'A4', notesLines: true, today: true });
  let st = null; const LS = (G.U45Prefs && G.U45Prefs.LS) || { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
  function state() { if (!st) { st = Object.assign(DEF(), LS.get(ST, {})); } return st; }
  function persist() { const s = Object.assign({}, st); try { LS.set(ST, s); } catch (e) { s.photo = null; LS.set(ST, s); } }
  let photoImg = null, photoSrc = null;
  function getPhoto() { const s = state(); if (!s.photo) return null; if (photoSrc !== s.photo) { photoSrc = s.photo; photoImg = new Image(); photoImg.onload = () => G.U45Calendar._redraw && G.U45Calendar._redraw(); photoImg.src = s.photo; } return photoImg.complete && photoImg.naturalWidth ? photoImg : null; }

  function sizeFor(fmt, paper) {
    const A = paper === 'Letter' ? [1275, 1650] : [1240, 1754];
    if (fmt === 'year' || fmt === 'week' || fmt === 'desk') return [A[1], A[0]];
    return A;
  }
  function draw(cv, s) {
    s = s || state(); const [W, H] = sizeFor(s.fmt, s.paper); cv.width = W; cv.height = H;
    const x = cv.getContext('2d'); const C = SCHEMES[s.scheme] || SCHEMES['Black/Yellow']; const F = `"${s.font}",system-ui,sans-serif`;
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    const hol = Object.assign({}, holidays(s.y, s), s.fmt === 'week' ? holidays(s.y + 1, s) : {});
    const ev = {}; if (s.showEvents) (s.events || []).forEach(e => { (ev[e.d] = ev[e.d] || []).push(e); if (e.yearly) { const k = s.y + e.d.slice(4); if (k !== e.d) (ev[k] = ev[k] || []).push(e); } });
    const M = 40; let top = M;
    const photoBox = (bx, by, bw, bh) => {
      const im = getPhoto(); x.save(); x.beginPath(); x.rect(bx, by, bw, bh); x.clip();
      if (!im) { x.fillStyle = C.fg; x.globalAlpha = 0.12; x.fillRect(bx, by, bw, bh); x.globalAlpha = 1; x.fillStyle = C.fg; x.font = `bold 36px ${F}`; x.textAlign = 'center'; x.fillText('Import a photo (Calendar → Photo)', bx + bw / 2, by + bh / 2); }
      else {
        x.filter = `${s.filter !== 'none' ? s.filter + ' ' : ''}brightness(${s.bright}%) contrast(${s.contrast}%)`.replace('hc ', 'contrast(200%) grayscale(100%) ');
        const r = (s.rot % 360) * Math.PI / 180; const rotated = (s.rot / 90) % 2 !== 0; const iw = rotated ? im.naturalHeight : im.naturalWidth, ih = rotated ? im.naturalWidth : im.naturalHeight;
        let sc = s.crop === 'fit' ? Math.min(bw / iw, bh / ih) : Math.max(bw / iw, bh / ih); sc *= (s.zoom || 100) / 100;
        x.translate(bx + bw / 2 + (s.offX || 0) * bw / 100, by + bh / 2 + (s.offY || 0) * bh / 100); x.rotate(r); if (s.flipH) x.scale(-1, 1);
        x.drawImage(im, -im.naturalWidth * sc / 2, -im.naturalHeight * sc / 2, im.naturalWidth * sc, im.naturalHeight * sc);
      }
      x.restore(); x.filter = 'none';
      if (s.title) { x.save(); x.font = `bold ${s.titleSize}px ${F}`; x.textAlign = 'center'; x.lineWidth = Math.max(4, s.titleSize / 8); x.strokeStyle = '#000'; x.strokeText(s.title, bx + bw / 2, by + bh - s.titleSize * 0.5); x.fillStyle = s.titleColor; x.fillText(s.title, bx + bw / 2, by + bh - s.titleSize * 0.5); x.restore(); }
      x.lineWidth = 6; x.strokeStyle = C.grid; x.strokeRect(bx, by, bw, bh);
    };
    const monthGrid = (y, m, gx, gy, gw, gh, big) => {
      const first = new Date(y, m, 1); const dim = new Date(y, m + 1, 0).getDate(); const off = (first.getDay() - s.weekStart + 7) % 7; const rows = Math.ceil((off + dim) / 7);
      const wn = s.weekNo && big ? gw * 0.06 : 0; const cw = (gw - wn) / 7; const hh = big ? 56 : Math.max(18, gh * 0.11); const rh = (gh - hh) / (big ? rows : 6);
      x.fillStyle = C.head; x.fillRect(gx, gy, gw, hh); x.fillStyle = C.headT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${Math.round(hh * 0.5)}px ${F}`;
      for (let i = 0; i < 7; i++) { const dn = DN[(i + s.weekStart) % 7]; x.fillText(big ? dn : dn[0] + (dn[1] || ''), gx + wn + cw * i + cw / 2, gy + hh / 2); }
      if (wn) x.fillText('Wk', gx + wn / 2, gy + hh / 2);
      const T = new Date(); const lst = [];
      for (let d = 1; d <= dim; d++) {
        const p = off + d - 1, r = Math.floor(p / 7), c = p % 7; const cx = gx + wn + c * cw, cy = gy + hh + r * rh; const dt = new Date(y, m, d); const k = key(y, m, d); const h = hol[k]; const dow = dt.getDay();
        if (big) { x.strokeStyle = C.grid; x.lineWidth = 2; x.strokeRect(cx, cy, cw, rh); }
        if (s.today && dt.toDateString() === T.toDateString()) { x.lineWidth = big ? 8 : 4; x.strokeStyle = C.today; x.strokeRect(cx + 3, cy + 3, cw - 6, rh - 6); }
        x.fillStyle = h ? C.hol : (dow === 0 || dow === 6) ? C.we : C.fg; x.font = `bold ${Math.round(big ? Math.min(rh * 0.32, 44) : rh * 0.55)}px ${F}`;
        if (big) { x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText(String(d), cx + 8, cy + 6); } else { x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(d), cx + cw / 2, cy + rh / 2); }
        if (big) {
          x.font = `${Math.round(Math.min(rh * 0.14, 20))}px ${F}`; let ly = cy + rh * 0.45; const lines = [];
          (h || []).forEach(o => lines.push([o.n, C.hol])); (ev[k] || []).forEach(e => lines.push([(e.time ? e.time + ' ' : '') + e.t, e.c || C.fg]));
          lines.slice(0, 3).forEach(([t, col]) => { x.fillStyle = col; let tt = t; while (x.measureText(tt).width > cw - 12 && tt.length > 3) tt = tt.slice(0, -2); x.fillText(tt === t ? t : tt + '…', cx + 6, ly); ly += Math.min(rh * 0.16, 22); });
          if (s.moon) { const mp = moon(dt); if (mp) { x.textAlign = 'right'; x.font = `${Math.round(rh * 0.2)}px ${F}`; x.fillStyle = C.fg; x.fillText(mp, cx + cw - 6, cy + 6); } }
          if (wn && (c === 0 || d === 1)) { x.textAlign = 'center'; x.textBaseline = 'top'; x.fillStyle = C.fg; x.font = `${Math.round(Math.min(rh * 0.22, 24))}px ${F}`; x.fillText(String(isoWeek(dt)), gx + wn / 2, cy + 8); }
        } else if (h) lst.push(d);
      }
      if (big && wn) { x.strokeStyle = C.grid; x.lineWidth = 2; x.strokeRect(gx, gy + hh, wn, rows * rh); }
      x.lineWidth = 4; x.strokeStyle = C.grid; x.strokeRect(gx, gy, gw, big ? hh + rows * rh : gh);
      return rows;
    };
    const header = (t, sz) => { x.fillStyle = C.fg; x.textAlign = 'center'; x.textBaseline = 'top'; x.font = `bold ${sz}px ${F}`; x.fillText(t, W / 2, top); top += sz * 1.25; };
    const holList = (y0, m0, bx, by, bw, maxN) => {
      const items = []; Object.keys(hol).sort().forEach(k => { const [yy, mm] = k.split('-').map(Number); if (yy === y0 && mm - 1 === m0) hol[k].forEach(o => items.push(+k.slice(8) + ' ' + o.n)); });
      Object.keys(ev).sort().forEach(k => { const [yy, mm] = k.split('-').map(Number); if (yy === y0 && mm - 1 === m0) ev[k].forEach(e => items.push(+k.slice(8) + ' • ' + e.t)); });
      x.textAlign = 'left'; x.textBaseline = 'top'; x.font = `22px ${F}`; x.fillStyle = C.fg; items.slice(0, maxN).forEach((t, i) => x.fillText(t, bx, by + i * 28));
    };
    const fmt = s.fmt;
    if (fmt === 'month' || fmt === 'planner') {
      header(MN[s.m] + ' ' + s.y, 84);
      const gw = fmt === 'planner' ? (W - 2 * M) * 0.68 : W - 2 * M; const gh = H - top - M - 160;
      monthGrid(s.y, s.m, M, top, gw, gh, true);
      if (fmt === 'planner') { const px = M + gw + 24, pw = W - px - M; x.fillStyle = C.head; x.fillRect(px, top, pw, 56); x.fillStyle = C.headT; x.font = `bold 30px ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Notes & goals', px + pw / 2, top + 28); x.strokeStyle = C.grid; x.lineWidth = 2; for (let yy = top + 100; yy < H - M - 160; yy += 56) { x.beginPath(); x.moveTo(px, yy); x.lineTo(px + pw, yy); x.stroke(); x.strokeRect(px + 4, yy - 40, 26, 26); } }
      holList(s.y, s.m, M, H - M - 150, W - 2 * M, 5);
    } else if (fmt === 'wall') {
      const ph = H * 0.42; photoBox(M, M, W - 2 * M, ph); top = M + ph + 20; header(MN[s.m] + ' ' + s.y, 70);
      monthGrid(s.y, s.m, M, top, W - 2 * M, H - top - M - 70, true); holList(s.y, s.m, M, H - M - 60, W, 2);
    } else if (fmt === 'desk') {
      const pw = W * 0.4; photoBox(M, M, pw, H - 2 * M); const gx = M + pw + 30, gw = W - gx - M; top = M;
      x.fillStyle = C.fg; x.textAlign = 'center'; x.textBaseline = 'top'; x.font = `bold 72px ${F}`; x.fillText(MN[s.m] + ' ' + s.y, gx + gw / 2, top); top += 100;
      monthGrid(s.y, s.m, gx, top, gw, H - top - M - 110, true); holList(s.y, s.m, gx, H - M - 100, gw, 3);
    } else if (fmt === 'year') {
      header(String(s.y), 80); const cols = 4, rowsN = 3, gw = (W - 2 * M - (cols - 1) * 30) / cols, gh = (H - top - M - (rowsN - 1) * 24) / rowsN;
      for (let m = 0; m < 12; m++) { const c = m % cols, r = Math.floor(m / cols); const gx = M + c * (gw + 30), gy = top + r * (gh + 24); x.fillStyle = C.fg; x.font = `bold 30px ${F}`; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillText(MN[m], gx + gw / 2, gy); monthGrid(s.y, m, gx, gy + 40, gw, gh - 44, false); }
    } else if (fmt === 'week') {
      const base = new Date(s.y, s.m, 1 + (s.wk || 0) * 7); const st0 = addD(base, -((base.getDay() - s.weekStart + 7) % 7));
      const en = addD(st0, 6); header(`Week ${isoWeek(addD(st0, 3))} · ${st0.getDate()} ${MN[st0.getMonth()].slice(0, 3)} – ${en.getDate()} ${MN[en.getMonth()].slice(0, 3)} ${en.getFullYear()}`, 60);
      const cw = (W - 2 * M) / 7, gh = H - top - M;
      for (let i = 0; i < 7; i++) {
        const d = addD(st0, i), k = key(d.getFullYear(), d.getMonth(), d.getDate()), cx = M + i * cw;
        x.fillStyle = C.head; x.fillRect(cx, top, cw, 70); x.fillStyle = C.headT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold 28px ${F}`; x.fillText(DN[d.getDay()] + ' ' + d.getDate(), cx + cw / 2, top + 35);
        x.strokeStyle = C.grid; x.lineWidth = 2; x.strokeRect(cx, top, cw, gh);
        if (s.today && d.toDateString() === new Date().toDateString()) { x.strokeStyle = C.today; x.lineWidth = 8; x.strokeRect(cx + 4, top + 4, cw - 8, gh - 8); }
        x.textAlign = 'left'; x.textBaseline = 'top'; x.font = `20px ${F}`; let ly = top + 86;
        (hol[k] || []).forEach(o => { x.fillStyle = C.hol; x.fillText(o.n.slice(0, 22), cx + 8, ly); ly += 26; });
        (ev[k] || []).forEach(e => { x.fillStyle = e.c || C.fg; x.fillText(((e.time ? e.time + ' ' : '') + e.t).slice(0, 22), cx + 8, ly); ly += 26; });
        if (s.notesLines) { x.strokeStyle = C.grid; x.globalAlpha = 0.35; x.lineWidth = 1; for (let yy = Math.max(ly + 20, top + 200); yy < top + gh - 10; yy += 44) { x.beginPath(); x.moveTo(cx + 8, yy); x.lineTo(cx + cw - 8, yy); x.stroke(); } x.globalAlpha = 1; }
      }
    }
    return cv;
  }
  const FEATURES = ['Month calendar', 'Year calendar (12 months)', 'Week calendar', 'Monthly planner with notes & goals', 'Wall calendar with photo', 'Desk calendar (landscape) with photo', 'Week starts Monday/Sunday', 'Month/year navigation & jump to today', 'Uganda public holidays (incl. Easter & Eid)', 'International days & holidays', 'Custom events with time and colour', 'Yearly repeating events', 'Photo import (camera or file)', 'Photo crop: fill / fit + zoom + pan', 'Photo rotate 90° & mirror', 'Photo filters (grayscale, sepia, invert, high-contrast, blur…)', 'Brightness & contrast', 'Text overlay: title, colour, size', 'Live clock (digital + analogue, 12/24 h)', 'ISO week numbers', 'Today highlight', 'Moon phases', 'Max-contrast colour schemes', 'Calendar font choice', 'A4 / Letter paper', 'Export PNG (passcode + watermark)', 'Export PDF (passcode + watermark)', 'Print', 'Lined notes area in week view', 'Holiday & event list per month'];

  function open() {
    const SH = G.U45Sheet; const s = state(); const esc = SH.esc;
    const sh = SH.sheet('📅 Calendar generator — ' + FEATURES.length + ' features', `<div class="cal-wrap">
      <div class="cal-clock" aria-live="off"><canvas class="cal-analog u45-noimg" width="120" height="120" aria-hidden="true"></canvas><div><output class="cal-dig">--:--:--</output><div class="cal-date"></div></div></div>
      <div class="cal-ctrl">
        <label><span class="nb">1–6</span>Format <select data-k="fmt"><option value="month">1 Month</option><option value="year">2 Year</option><option value="week">3 Week</option><option value="planner">4 Planner</option><option value="wall">5 Wall (photo)</option><option value="desk">6 Desk (photo)</option></select></label>
        <label><span class="nb">8</span>Year <input type="number" data-k="y" min="1900" max="2200" step="1"></label>
        <label>Month <select data-k="m">${MN.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select></label>
        <span class="cal-nav"><button data-nav="-1" aria-label="Previous">◀</button><button data-nav="0">Today</button><button data-nav="1" aria-label="Next">▶</button></span>
        <label><span class="nb">7</span>Week starts <select data-k="weekStart"><option value="1">Monday</option><option value="0">Sunday</option><option value="6">Saturday</option></select></label>
        <label class="ck"><input type="checkbox" data-k="ug"><span class="nb">9</span>Uganda holidays</label>
        <label class="ck"><input type="checkbox" data-k="intl"><span class="nb">10</span>International days</label>
        <label class="ck"><input type="checkbox" data-k="weekNo"><span class="nb">20</span>Week numbers</label>
        <label class="ck"><input type="checkbox" data-k="today"><span class="nb">21</span>Highlight today</label>
        <label class="ck"><input type="checkbox" data-k="moon"><span class="nb">22</span>Moon phases</label>
        <label class="ck"><input type="checkbox" data-k="notesLines"><span class="nb">29</span>Lined notes</label>
        <label><span class="nb">23</span>Colours <select data-k="scheme">${Object.keys(SCHEMES).map(n => `<option>${n}</option>`).join('')}</select></label>
        <label><span class="nb">24</span>Font <select data-k="font">${['Atkinson Hyperlegible', 'Lexend', 'Inter', 'Roboto Slab', 'Noto Serif', 'Merriweather', 'OpenDyslexic', 'U45 Display', 'U45 Mono'].map(n => `<option>${n}</option>`).join('')}</select></label>
        <label><span class="nb">25</span>Paper <select data-k="paper"><option>A4</option><option>Letter</option></select></label>
      </div>
      <details class="cal-sec"><summary><span class="nb">13–18</span> Photo &amp; text</summary>
        <div class="cal-ctrl"><label class="btnlike">📷 Import photo<input type="file" accept="image/*" class="cal-photo" hidden></label><button class="cal-nophoto">Remove photo</button>
        <label>Crop <select data-k="crop"><option value="fill">Fill (crop)</option><option value="fit">Fit</option></select></label>
        <label>Zoom % <input type="range" data-k="zoom" min="50" max="300" step="5"></label>
        <label>Pan X <input type="range" data-k="offX" min="-50" max="50"></label><label>Pan Y <input type="range" data-k="offY" min="-50" max="50"></label>
        <button class="cal-rot">⟳ Rotate 90°</button><label class="ck"><input type="checkbox" data-k="flipH">Mirror</label>
        <label>Filter <select data-k="filter"><option value="none">None</option><option value="grayscale(100%)">Grayscale</option><option value="sepia(100%)">Sepia</option><option value="invert(100%)">Invert</option><option value="hc">High-contrast B/W</option><option value="saturate(200%)">Vivid</option><option value="blur(3px)">Soft blur</option><option value="hue-rotate(90deg)">Hue shift</option></select></label>
        <label>Brightness <input type="range" data-k="bright" min="30" max="200"></label><label>Contrast <input type="range" data-k="contrast" min="30" max="250"></label>
        <label>Title text <input type="text" data-k="title" maxlength="60" placeholder="e.g. Family 2027"></label><label>Title colour <input type="color" data-k="titleColor"></label><label>Title size <input type="range" data-k="titleSize" min="24" max="140"></label></div></details>
      <details class="cal-sec"><summary><span class="nb">11–12</span> Events (<span class="cal-evn">0</span>)</summary>
        <div class="cal-ctrl"><input type="date" class="ev-d"><input type="time" class="ev-time"><input type="text" class="ev-t" placeholder="Event" maxlength="60"><input type="color" class="ev-c" value="#00ffff"><label class="ck"><input type="checkbox" class="ev-y">Yearly</label><button class="ev-add">Add event</button><label class="ck"><input type="checkbox" data-k="showEvents">Show events</label></div>
        <ol class="cal-evlist"></ol></details>
      <div class="cal-btns"><button class="cal-png"><span class="nb">26</span>Export PNG 🔒</button><button class="cal-pdf"><span class="nb">27</span>Export PDF 🔒</button><button class="cal-print"><span class="nb">28</span>Print 🔒</button><button class="cal-feat">All ${FEATURES.length} features</button></div>
      <div class="cal-prevwrap"><canvas class="cal-prev u45-noimg" aria-label="Calendar preview"></canvas></div></div>`, { wide: true, onClose: () => clearInterval(tick) });
    const b = sh.body; const cv = b.querySelector('.cal-prev');
    const redraw = () => { draw(cv, s); b.querySelector('.cal-evn').textContent = s.events.length; };
    G.U45Calendar._redraw = redraw;
    b.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k; if (el.type === 'checkbox') el.checked = !!s[k]; else el.value = s[k];
      el.addEventListener(el.type === 'range' || el.type === 'text' || el.type === 'color' ? 'input' : 'change', () => { s[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range' || /^(m|weekStart)$/.test(k)) ? +el.value : el.value; if (k === 'fmt' || k === 'm' || k === 'y') s.wk = 0; persist(); redraw(); });
    });
    b.querySelectorAll('[data-nav]').forEach(bt => bt.onclick = () => {
      const n = +bt.dataset.nav; const T = new Date();
      if (!n) { s.y = T.getFullYear(); s.m = T.getMonth(); s.wk = Math.floor((T.getDate() - 1) / 7); }
      else if (s.fmt === 'year') s.y += n; else if (s.fmt === 'week') { s.wk += n; const d = new Date(s.y, s.m, 1 + s.wk * 7); if (d.getMonth() !== s.m) { s.y = d.getFullYear(); s.m = d.getMonth(); s.wk = Math.floor((d.getDate() - 1) / 7); } }
      else { s.m += n; if (s.m < 0) { s.m = 11; s.y--; } if (s.m > 11) { s.m = 0; s.y++; } }
      b.querySelector('[data-k="y"]').value = s.y; b.querySelector('[data-k="m"]').value = s.m; persist(); redraw();
    });
    b.querySelector('.cal-photo').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return; const r = new FileReader();
      r.onload = () => { const im = new Image(); im.onload = () => { const mx = 1600, sc = Math.min(1, mx / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); s.photo = c.toDataURL('image/jpeg', 0.85); s.rot = 0; s.zoom = 100; s.offX = s.offY = 0; if (s.fmt !== 'wall' && s.fmt !== 'desk') { s.fmt = 'wall'; b.querySelector('[data-k="fmt"]').value = 'wall'; } persist(); redraw(); }; im.src = r.result; };
      r.readAsDataURL(f);
    };
    b.querySelector('.cal-nophoto').onclick = () => { s.photo = null; persist(); redraw(); };
    b.querySelector('.cal-rot').onclick = () => { s.rot = (s.rot + 90) % 360; persist(); redraw(); };
    const evList = () => { b.querySelector('.cal-evlist').innerHTML = s.events.map((e, i) => `<li><span style="color:${esc(e.c)}">■</span> ${esc(e.d)} ${esc(e.time || '')} ${esc(e.t)}${e.yearly ? ' (yearly)' : ''} <button data-del="${i}" aria-label="Delete event">✕</button></li>`).join(''); b.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { s.events.splice(+x.dataset.del, 1); persist(); evList(); redraw(); }); };
    b.querySelector('.ev-d').value = key(s.y, s.m, 1);
    b.querySelector('.ev-add').onclick = () => { const d = b.querySelector('.ev-d').value, t = b.querySelector('.ev-t').value.trim(); if (!d || !t) return SH.toast('Enter a date and a title'); s.events.push({ d, t, time: b.querySelector('.ev-time').value, c: b.querySelector('.ev-c').value, yearly: b.querySelector('.ev-y').checked }); b.querySelector('.ev-t').value = ''; persist(); evList(); redraw(); };
    evList();
    const name = () => 'U45-calendar-' + s.fmt + '-' + s.y + (s.fmt === 'year' ? '' : '-' + pad(s.m + 1));
    const fresh = () => draw(document.createElement('canvas'), s);
    b.querySelector('.cal-png').onclick = () => G.U45Guard.exportCanvas(fresh(), name(), 'png');
    b.querySelector('.cal-pdf').onclick = () => G.U45Guard.exportCanvas(fresh(), name(), 'pdf');
    b.querySelector('.cal-print').onclick = async () => {
      if (!(await G.U45Guard.requirePin('Printing the calendar'))) return; const c = G.U45Guard.watermark(fresh());
      const w = G.open('', '_blank'); if (!w) return SH.toast('Pop-up blocked — use Export PDF and print that.');
      w.document.write(`<title>${name()}</title><style>@page{margin:8mm}body{margin:0}img{width:100%;}</style><img src="${c.toDataURL('image/png')}" onload="setTimeout(()=>print(),300)">`); w.document.close();
    };
    b.querySelector('.cal-feat').onclick = () => SH.sheet('Calendar features', '<ol class="u45-flist">' + FEATURES.map(f => `<li>${esc(f)}</li>`).join('') + '</ol>');
    // live clock
    const ac = b.querySelector('.cal-analog'), dig = b.querySelector('.cal-dig'), dd = b.querySelector('.cal-date');
    const clock = () => {
      const T = new Date(); const h24 = !G.U45Prefs || G.U45Prefs.settings().clock24 !== false;
      dig.textContent = h24 ? T.toTimeString().slice(0, 8) : T.toLocaleTimeString('en-US'); dd.textContent = T.toDateString() + ' · week ' + isoWeek(T) + ' · day ' + (Math.floor((T - new Date(T.getFullYear(), 0, 0)) / 864e5));
      const x = ac.getContext('2d'); x.clearRect(0, 0, 120, 120); x.fillStyle = '#000'; x.beginPath(); x.arc(60, 60, 57, 0, 7); x.fill(); x.strokeStyle = '#FFFF00'; x.lineWidth = 4; x.stroke();
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.beginPath(); x.moveTo(60 + 46 * Math.sin(a), 60 - 46 * Math.cos(a)); x.lineTo(60 + 53 * Math.sin(a), 60 - 53 * Math.cos(a)); x.stroke(); }
      const hand = (a, l, w, c) => { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(60, 60); x.lineTo(60 + l * Math.sin(a), 60 - l * Math.cos(a)); x.stroke(); };
      hand((T.getHours() % 12 + T.getMinutes() / 60) * Math.PI / 6, 28, 6, '#FFFFFF'); hand((T.getMinutes() + T.getSeconds() / 60) * Math.PI / 30, 42, 4, '#FFFF00'); hand(T.getSeconds() * Math.PI / 30, 48, 2, '#00FFFF');
    };
    clock(); const tick = setInterval(() => { if (!document.body.contains(ac)) return clearInterval(tick); clock(); }, 1000);
    redraw(); return sh;
  }
  G.U45Calendar = { open, draw, holidays, easter, isoWeek, moon, state, FEATURES, SCHEMES };
})(typeof window !== 'undefined' ? window : globalThis);
