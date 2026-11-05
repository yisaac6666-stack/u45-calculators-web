/* U-45 CALCULATORS — offline document exporters (no third-party code).
 * A "doc" is {title, calc, item, created, steps:[{n,input,result}], notes, screen, images:[{name,dataURL}]}.
 * Writers return {name, mime, data: string|Uint8Array}.
 * Includes: store-only ZIP (CRC-32), minimal PDF (Helvetica + JPEG images),
 * QR Code encoder (byte mode, ECC-L, versions 1–40, auto mask), XLSX/DOCX/ODT/ODS. */
(function (G) {
  'use strict';
  const enc = (s) => new TextEncoder().encode(s);
  const xmlEsc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const safeName = (s) => String(s || 'u45-workout').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'u45-workout';

  // ---------- text views ----------
  function rows(doc) { return [['#', 'Input / keys', 'Result']].concat((doc.steps || []).map((s, i) => [String(i + 1), s.input || '', s.result || ''])); }
  function toText(doc) {
    const L = [doc.title || 'U-45 workout', 'Calculator: ' + (doc.calc || ''), doc.item ? 'Menu item: ' + doc.item : null, 'Created: ' + new Date(doc.created || Date.now()).toLocaleString(), ''].filter(x => x != null);
    L.push('WORKOUT (' + (doc.steps || []).length + ' steps)');
    (doc.steps || []).forEach((s, i) => { L.push((i + 1) + '. ' + (s.input || '').trim()); if (s.result) L.push('   = ' + String(s.result).replace(/\n/g, ' | ')); });
    if (doc.screen) { L.push('', 'CURRENT DISPLAY', doc.screen); }
    if (doc.notes) { L.push('', 'NOTES', doc.notes); }
    if ((doc.images || []).length) L.push('', 'ATTACHED: ' + doc.images.map(i => i.name).join(', '));
    return L.join('\n');
  }
  const csvCell = (v) => { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  function toCSV(doc) { return '\uFEFF' + rows(doc).map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
  function toJSON(doc) { return JSON.stringify({ format: 'u45-workout', version: 1, title: doc.title, calc: doc.calc, item: doc.item, created: doc.created, steps: doc.steps, screen: doc.screen, notes: doc.notes, images: doc.images }, null, 2); }
  function toMD(doc) {
    const md = ['# ' + (doc.title || 'U-45 workout'), '', '*Calculator:* ' + (doc.calc || '') + (doc.item ? '  \n*Menu item:* ' + doc.item : ''), '', '| # | Input / keys | Result |', '|---|---|---|'];
    (doc.steps || []).forEach((s, i) => md.push(`| ${i + 1} | ${String(s.input || '').replace(/\|/g, '\\|')} | ${String(s.result || '').replace(/\n/g, ' ').replace(/\|/g, '\\|')} |`));
    if (doc.screen) md.push('', '**Current display**', '', '```', doc.screen, '```');
    if (doc.notes) md.push('', '## Notes', '', doc.notes);
    (doc.images || []).forEach(im => md.push('', `![${im.name}](${im.dataURL})`));
    return md.join('\n') + '\n';
  }
  function toHTML(doc, forPrint) {
    const st = 'body{font:14px/1.45 system-ui,Arial,sans-serif;color:#000;background:#fff;margin:24px}h1{font-size:20px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #000;padding:4px 6px;text-align:left;vertical-align:top}th{background:#FFD600}pre{white-space:pre-wrap;border:1px solid #000;padding:8px}img{max-width:100%;border:1px solid #000;margin:6px 0}.m{color:#333}' + (forPrint ? '@page{margin:14mm}' : '');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${xmlEsc(doc.title)}</title><style>${st}</style></head><body><h1>${xmlEsc(doc.title || 'U-45 workout')}</h1><div class="m">Calculator: ${xmlEsc(doc.calc)}${doc.item ? ' · Menu item: ' + xmlEsc(doc.item) : ''} · ${xmlEsc(new Date(doc.created || Date.now()).toLocaleString())}</div>` +
      `<table><thead><tr><th>#</th><th>Input / keys</th><th>Result</th></tr></thead><tbody>${(doc.steps || []).map((s, i) => `<tr><td>${i + 1}</td><td>${xmlEsc(s.input)}</td><td>${xmlEsc(s.result).replace(/\n/g, '<br>')}</td></tr>`).join('')}</tbody></table>` +
      (doc.screen ? `<h2>Current display</h2><pre>${xmlEsc(doc.screen)}</pre>` : '') + (doc.notes ? `<h2>Notes</h2><pre>${xmlEsc(doc.notes)}</pre>` : '') +
      (doc.images || []).map(im => `<h2>${xmlEsc(im.name)}</h2><img src="${im.dataURL}" alt="${xmlEsc(im.name)}">`).join('') + '</body></html>';
  }
  function toXML(doc) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<workout app="U-45 CALCULATORS" version="1">\n' + `  <title>${xmlEsc(doc.title)}</title>\n  <calculator>${xmlEsc(doc.calc)}</calculator>\n  <item>${xmlEsc(doc.item)}</item>\n  <created>${new Date(doc.created || Date.now()).toISOString()}</created>\n  <steps>\n` +
      (doc.steps || []).map((s, i) => `    <step n="${i + 1}"><input>${xmlEsc(s.input)}</input><result>${xmlEsc(s.result)}</result></step>\n`).join('') + `  </steps>\n  <display>${xmlEsc(doc.screen)}</display>\n  <notes>${xmlEsc(doc.notes)}</notes>\n</workout>\n`;
  }
  const texEsc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\textbackslash{}').replace(/([#$%&_{}])/g, '\\$1').replace(/\^/g, '\\^{}').replace(/~/g, '\\~{}').replace(/×/g, '$\\times$').replace(/÷/g, '$\\div$').replace(/−/g, '$-$').replace(/π/g, '$\\pi$').replace(/√/g, '$\\surd$').replace(/²/g, '$^2$').replace(/³/g, '$^3$');
  function toLaTeX(doc) {
    return '\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{longtable}\n\\begin{document}\n\\section*{' + texEsc(doc.title || 'U-45 workout') + '}\nCalculator: ' + texEsc(doc.calc) + (doc.item ? ' \\\\ Menu item: ' + texEsc(doc.item) : '') + '\n\n\\begin{longtable}{|r|p{6cm}|p{6cm}|}\\hline\n\\# & Input / keys & Result \\\\ \\hline\n' +
      (doc.steps || []).map((s, i) => `${i + 1} & ${texEsc(s.input)} & ${texEsc(s.result).replace(/\n/g, ' \\newline ')} \\\\ \\hline\n`).join('') + '\\end{longtable}\n' + (doc.notes ? '\\subsection*{Notes}\n' + texEsc(doc.notes).replace(/\n/g, '\\\\\n') + '\n' : '') + '\\end{document}\n';
  }
  function toRTF(doc) {
    const r = (s) => String(s == null ? '' : s).replace(/[\\{}]/g, '\\$&').replace(/\n/g, '\\line ').replace(/[^\x00-\x7f]/g, c => { const n = c.charCodeAt(0); return '\\u' + (n > 32767 ? n - 65536 : n) + '?'; });
    return '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs22{\\b\\fs32 ' + r(doc.title) + '}\\par Calculator: ' + r(doc.calc) + '\\par\\par ' + (doc.steps || []).map((s, i) => `${i + 1}. ${r(s.input)}\\par    = ${r(s.result)}\\par `).join('') + (doc.notes ? '\\par{\\b Notes}\\par ' + r(doc.notes) : '') + '}';
  }
  function toSVG(doc) {
    const lines = toText(doc).split('\n'); const lh = 18, w = 820, h = 40 + lines.length * lh;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#fff"/><rect x="0" y="0" width="${w}" height="6" fill="#FFD600"/>` +
      lines.map((l, i) => `<text x="16" y="${30 + i * lh}" font-family="monospace" font-size="${i === 0 ? 16 : 13}" ${i === 0 ? 'font-weight="bold" ' : ''}fill="#000">${xmlEsc(l)}</text>`).join('') + '</svg>';
  }

  // ---------- ZIP (store) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  /** files: [{name, data: string|Uint8Array}] -> Uint8Array (STORE method, UTF-8 names). */
  function zip(files) {
    const parts = [], central = []; let off = 0; const d = new Date();
    const dt = ((d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate()) & 0xFFFF, tm = (d.getHours() << 11 | d.getMinutes() << 5 | (d.getSeconds() >> 1)) & 0xFFFF;
    files.forEach(f => {
      const name = enc(f.name), data = typeof f.data === 'string' ? enc(f.data) : f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    });
    const cs = central.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return concat(parts.concat(central, [new Uint8Array(e.buffer)]));
  }
  function concat(arrs) { const n = arrs.reduce((a, b) => a + b.length, 0); const o = new Uint8Array(n); let p = 0; arrs.forEach(a => { o.set(a, p); p += a.length; }); return o; }

  // ---------- Office formats ----------
  const colName = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  function cellXml(v, r, c) { const ref = colName(c) + (r + 1); const num = v !== '' && /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(String(v).trim()); return num ? `<c r="${ref}"><v>${String(v).trim()}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`; }
  function toXLSX(doc) {
    const R = rows(doc); if (doc.notes) R.push([], ['Notes', doc.notes]);
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="3" width="48" customWidth="1"/></cols><sheetData>${R.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => cellXml(v, i, j)).join('')}</row>`).join('')}</sheetData></worksheet>`;
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Workout" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
      { name: 'xl/worksheets/sheet1.xml', data: sheet }
    ]);
  }
  function toDOCX(doc) {
    const p = (t, b) => `<w:p><w:r>${b ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r></w:p>`;
    const body = toText(doc).split('\n').map((l, i) => p(l, i === 0 || /^(WORKOUT|NOTES|CURRENT DISPLAY)/.test(l))).join('');
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>` }
    ]);
  }
  const ODF_NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" office:version="1.2"';
  function odf(mime, content) {
    return zip([{ name: 'mimetype', data: mime },
      { name: 'META-INF/manifest.xml', data: `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="${mime}"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>` },
      { name: 'content.xml', data: content }]);
  }
  function toODT(doc) { return odf('application/vnd.oasis.opendocument.text', `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${ODF_NS}><office:body><office:text>${toText(doc).split('\n').map(l => `<text:p>${xmlEsc(l)}</text:p>`).join('')}</office:text></office:body></office:document-content>`); }
  function toODS(doc) {
    const R = rows(doc);
    const cell = (v) => /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(String(v).trim()) ? `<table:table-cell office:value-type="float" office:value="${String(v).trim()}"><text:p>${xmlEsc(v)}</text:p></table:table-cell>` : `<table:table-cell office:value-type="string"><text:p>${xmlEsc(v)}</text:p></table:table-cell>`;
    return odf('application/vnd.oasis.opendocument.spreadsheet', `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${ODF_NS}><office:body><office:spreadsheet><table:table table:name="Workout">${R.map(r => `<table:table-row>${r.map(cell).join('')}</table:table-row>`).join('')}</table:table></office:spreadsheet></office:body></office:document-content>`);
  }

  // ---------- PDF (Helvetica, WinAnsi, optional JPEG images) ----------
  const PDF_MAP = { '−': '-', '×': 'x', '÷': '/', '√': 'sqrt', 'π': 'pi', '²': '^2', '³': '^3', 'ℯ': 'e', '⌟': ' r ', '≤': '<=', '≥': '>=', '≠': '!=', '→': '->', '◀': '<', '▶': '>', '▲': '^', '▼': 'v', 'θ': 'theta', 'Σ': 'Sum', 'σ': 'sigma', 'Δ': 'Delta', '∫': 'integral', '⁻¹': '^-1', '°': '\u00B0', 'x̄': 'xbar', '•': '-' };
  function pdfStr(s) {
    s = String(s == null ? '' : s).replace(/x̄|⁻¹|[−×÷√π²³ℯ⌟≤≥≠→◀▶▲▼θΣσΔ∫•]/g, c => PDF_MAP[c] || '?');
    let o = ''; for (const ch of s) { const c = ch.codePointAt(0); if (c === 40 || c === 41 || c === 92) o += '\\' + ch; else if (c >= 32 && c < 127) o += ch; else if (c >= 160 && c < 256) o += '\\' + c.toString(8).padStart(3, '0'); else o += '?'; }
    return o;
  }
  function wrap(line, max) { const out = []; let l = String(line); while (l.length > max) { let k = l.lastIndexOf(' ', max); if (k < max * 0.5) k = max; out.push(l.slice(0, k)); l = l.slice(k).replace(/^ /, ''); } out.push(l); return out; }
  /** images: [{jpeg: Uint8Array, w, h}] */
  function toPDF(doc, images) {
    const lines = []; toText(doc).split('\n').forEach(l => wrap(l, 92).forEach(x => lines.push(x)));
    const perPage = 58, pages = []; for (let i = 0; i < Math.max(1, lines.length); i += perPage) pages.push(lines.slice(i, i + perPage));
    const objs = []; const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(null), pagesId = add(null), font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), fontB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    pages.forEach((pl, pi) => {
      let s = 'BT /F1 10 Tf 13 TL 50 800 Td\n';
      pl.forEach((l, i) => { const bold = pi === 0 && i === 0; s += (bold ? '/F2 14 Tf ' : '') + '(' + pdfStr(l) + ') Tj T*' + (bold ? ' /F1 10 Tf' : '') + '\n'; });
      s += 'ET\n0 0 0 RG 1 w 40 30 m 555 30 l S\nBT /F1 8 Tf 50 18 Td (' + pdfStr('U-45 CALCULATORS - page ' + (pi + 1) + ' of ' + (pages.length + (images || []).length)) + ') Tj ET';
      const c = add({ stream: s }); kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontB} 0 R >> >> /Contents ${c} 0 R >>`));
    });
    (images || []).forEach((im, k) => {
      const x = add({ stream: im.jpeg, dict: `/Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode` });
      const sc = Math.min(495 / im.w, 700 / im.h, 1.5), w = im.w * sc, h = im.h * sc;
      const c = add({ stream: `BT /F2 12 Tf 50 800 Td (${pdfStr(im.name || 'Image ' + (k + 1))}) Tj ET\nq ${w.toFixed(2)} 0 0 ${h.toFixed(2)} 50 ${(780 - h).toFixed(2)} cm /Im${k} Do Q` });
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F2 ${fontB} 0 R >> /XObject << /Im${k} ${x} 0 R >> >> /Contents ${c} 0 R >>`));
    });
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    const chunks = [enc('%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n')]; let len = chunks[0].length; const xref = [];
    const push = (u) => { chunks.push(u); len += u.length; };
    objs.forEach((o, i) => {
      xref.push(len);
      if (typeof o === 'string') push(enc(`${i + 1} 0 obj\n${o}\nendobj\n`));
      else { const data = typeof o.stream === 'string' ? latin1(o.stream) : o.stream; push(enc(`${i + 1} 0 obj\n<< ${o.dict ? o.dict + ' ' : ''}/Length ${data.length} >>\nstream\n`)); push(data); push(enc('\nendstream\nendobj\n')); }
    });
    const xs = len; let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`; xref.forEach(o => { x += String(o).padStart(10, '0') + ' 00000 n \n'; });
    x += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info << /Producer (U-45 CALCULATORS) /Title (${pdfStr(doc.title)}) >> >>\nstartxref\n${xs}\n%%EOF\n`; push(enc(x));
    return concat(chunks);
  }
  function latin1(s) { const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 255; return o; }

  // ---------- QR Code (byte mode, ECC level L) ----------
  const ECC_L = [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
  const BLK_L = [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25];
  function rawModules(v) { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; }
  const dataCw = (v) => Math.floor(rawModules(v) / 8) - ECC_L[v] * BLK_L[v];
  function gfMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; }
  function rsDiv(deg) { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gfMul(root, 2); } return r; }
  function rsRem(data, div) { const r = div.map(() => 0); data.forEach(b => { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); }); return r; }
  function alignPos(v) { if (v === 1) return []; const n = Math.floor(v / 7) + 2; const step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2; const r = [6]; for (let p = v * 4 + 10; r.length < n; p -= step) r.splice(1, 0, p); return r; }
  /** Returns {size, get(x,y)->bool, version}. Throws if text > ~2953 bytes. */
  function qr(text) {
    const bytes = enc(text); let v = 1;
    for (; v <= 40; v++) { const cc = v <= 9 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCw(v) * 8) break; }
    if (v > 40) throw new Error('Too long for a QR code');
    const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v <= 9 ? 8 : 16); bytes.forEach(b => put(b, 8));
    const cap = dataCw(v) * 8; put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
    for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    // interleave
    const nb = BLK_L[v], ecl = ECC_L[v], raw = Math.floor(rawModules(v) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    const div = rsDiv(ecl), blocks = [];
    for (let i = 0, k = 0; i < nb; i++) { const dat = data.slice(k, k + shortLen - ecl + (i < nShort ? 0 : 1)); k += dat.length; const ecc = rsRem(dat, div); if (i < nShort) dat.push(0); blocks.push(dat.concat(ecc)); }
    const cw = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ecl || j >= nShort) cw.push(b[i]); });
    const size = v * 4 + 17; const M = [], F = []; for (let i = 0; i < size; i++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    const setF = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
    for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const ap = alignPos(v), na = ap.length;
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) { if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
    const drawFormat = (mask) => {
      const d = (1 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const b = ((d << 10) | r) ^ 0x5412; const bit = (i) => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) setF(8, i, bit(i)); setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8)); for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i)); for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i)); setF(8, size - 8, true);
    };
    drawFormat(0);
    if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const b = (v << 12) | r; for (let i = 0; i < 18; i++) { const bt = ((b >>> i) & 1) !== 0, a = size - 11 + i % 3, c = Math.floor(i / 3); setF(a, c, bt); setF(c, a, bt); } }
    // data placement
    let i = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert; if (!F[y][x] && i < cw.length * 8) { M[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; } } }
    const maskFn = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
    const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && maskFn[m](x, y)) M[y][x] = !M[y][x]; };
    const penalty = () => {
      let p = 0; const line = (get) => { for (let a = 0; a < size; a++) { let run = 1; for (let b = 1; b <= size; b++) { if (b < size && get(a, b) === get(a, b - 1)) run++; else { if (run >= 5) p += run - 2; run = 1; } } } };
      line((a, b) => M[a][b]); line((a, b) => M[b][a]);
      for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
      const pat = [true, false, true, true, true, false, true];
      for (let y = 0; y < size; y++) for (let x = 0; x + 7 <= size; x++) { let h = true, vv = true; for (let k = 0; k < 7; k++) { if (M[y][x + k] !== pat[k]) h = false; if (M[x + k][y] !== pat[k]) vv = false; } const quietH = (o) => [0, 1, 2, 3].every(k => { const xx = o + k; return xx < 0 || xx >= size || !M[y][xx]; }); const quietV = (o) => [0, 1, 2, 3].every(k => { const yy = o + k; return yy < 0 || yy >= size || !M[yy][y]; }); if (h && (quietH(x - 4) || quietH(x + 7))) p += 40; if (vv && (quietV(x - 4) || quietV(x + 7))) p += 40; }
      let dark = 0; M.forEach(r => r.forEach(c => { if (c) dark++; })); const tot = size * size; p += Math.max(0, Math.ceil(Math.abs(dark * 20 - tot * 10) / tot) - 1) * 10;
      return p;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best);
    return { size, version: v, mask: best, get: (x, y) => x >= 0 && y >= 0 && x < size && y < size && M[y][x] };
  }
  function qrSVG(text, scale) {
    const q = qr(text), s = scale || 6, b = 4, n = q.size + b * 2; let path = '';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.get(x, y)) path += `M${x + b},${y + b}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${n * s}" height="${n * s}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  }

  // ---------- registry: 18 formats ----------
  const FORMATS = [
    ['txt', 'Plain text (.txt)', 'text/plain'], ['csv', 'CSV (.csv)', 'text/csv'], ['json', 'JSON (.json)', 'application/json'], ['html', 'Web page (.html)', 'text/html'],
    ['md', 'Markdown (.md)', 'text/markdown'], ['pdf', 'PDF (.pdf)', 'application/pdf'], ['png', 'PNG image (.png)', 'image/png'], ['jpg', 'JPEG image (.jpg)', 'image/jpeg'],
    ['svg', 'SVG image (.svg)', 'image/svg+xml'], ['xlsx', 'Excel (.xlsx)', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['docx', 'Word (.docx)', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], ['rtf', 'Rich text (.rtf)', 'application/rtf'],
    ['xml', 'XML (.xml)', 'application/xml'], ['tex', 'LaTeX (.tex)', 'application/x-tex'], ['odt', 'OpenDocument text (.odt)', 'application/vnd.oasis.opendocument.text'],
    ['ods', 'OpenDocument sheet (.ods)', 'application/vnd.oasis.opendocument.spreadsheet'], ['zip', 'ZIP bundle (.zip)', 'application/zip'], ['qr', 'QR code image (.png)', 'image/png'], ['clip', 'Copy to clipboard', 'text/plain']
  ];
  /** Synchronous writers (canvas-based png/jpg/qr and PDF images are produced in workout.js). */
  function write(fmt, doc) {
    const base = safeName(doc.title); const f = FORMATS.find(x => x[0] === fmt) || FORMATS[0];
    const out = (ext, data) => ({ name: base + '.' + ext, mime: f[2], data });
    switch (fmt) {
      case 'txt': case 'clip': return out('txt', toText(doc));
      case 'csv': return out('csv', toCSV(doc));
      case 'json': return out('json', toJSON(doc));
      case 'html': return out('html', toHTML(doc));
      case 'md': return out('md', toMD(doc));
      case 'svg': return out('svg', toSVG(doc));
      case 'xlsx': return out('xlsx', toXLSX(doc));
      case 'docx': return out('docx', toDOCX(doc));
      case 'rtf': return out('rtf', toRTF(doc));
      case 'xml': return out('xml', toXML(doc));
      case 'tex': return out('tex', toLaTeX(doc));
      case 'odt': return out('odt', toODT(doc));
      case 'ods': return out('ods', toODS(doc));
      case 'pdf': return out('pdf', toPDF(doc, doc._jpegs || []));
      case 'zip': {
        const files = [{ name: base + '.txt', data: toText(doc) }, { name: base + '.csv', data: toCSV(doc) }, { name: base + '.json', data: toJSON(doc) }, { name: base + '.html', data: toHTML(doc) }, { name: base + '.md', data: toMD(doc) }];
        (doc.images || []).forEach(im => { const m = /^data:image\/(png|jpeg);base64,(.*)$/.exec(im.dataURL || ''); if (m) files.push({ name: safeName(im.name) + (m[1] === 'png' ? '.png' : '.jpg'), data: b64ToBytes(m[2]) }); });
        return out('zip', zip(files));
      }
      default: return null;
    }
  }
  function b64ToBytes(b) { const s = atob(b); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
  function bytesToB64(u) { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }

  G.U45Export = { FORMATS, write, toText, toCSV, toJSON, toHTML, toMD, toXML, toLaTeX, toRTF, toSVG, toXLSX, toDOCX, toODT, toODS, toPDF, zip, crc32, qr, qrSVG, safeName, b64ToBytes, bytesToB64, xmlEsc };
})(typeof window !== 'undefined' ? window : globalThis);
