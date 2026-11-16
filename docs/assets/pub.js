// LunaVerta: Microsoft Publisher (.pub) to PDF, on the device.
// libmspub (the reader LibreOffice uses), built to WebAssembly, turns the file into drawing steps:
// pages, shapes, pictures and text boxes with their paragraphs. This file draws those steps on a
// canvas page by page, laying out the text itself with the computer's own fonts, and the pages
// become a PDF. Nothing is uploaded.
(() => {
'use strict';
const VENDOR = (window.LVApp && window.LVApp.VENDOR) || new URL('../vendor/', document.currentScript ? document.currentScript.src : location.href).href;
let modP = null;
function engine() {
  if (!modP) modP = new Promise((ok, bad) => {
    const s = document.createElement('script');
    s.src = VENDOR + 'libmspub/lv-pub.js';
    s.onload = () => window.LVPubModule({ locateFile: f => VENDOR + 'libmspub/' + f }).then(ok, bad);
    s.onerror = () => bad(new Error('Could not load the Publisher reader'));
    document.head.appendChild(s);
  });
  return modP;
}
// The file → the list of drawing steps. null when it isn't a Publisher file.
async function read(file) {
  const M = await engine(), bytes = new Uint8Array(await file.arrayBuffer());
  const p = M._malloc(bytes.length); M.HEAPU8.set(bytes, p);
  let r;
  try { r = M._pub2json(p, bytes.length); } finally { M._free(p); }
  if (r === 0) return null;
  if (r === 1) throw new Error('This Publisher file could not be read');
  const s = M.UTF8ToString(r); M._free(r);
  return JSON.parse(s);
}

// ---------- units ----------
// librevenge gives lengths as text with a unit; everything here is in points (1/72 in).
function pt(v, base) {
  if (v == null) return 0;
  const m = String(v).match(/^\s*(-?[\d.]+(?:e-?\d+)?)\s*([a-z%]*)/i); if (!m) return 0;
  const n = parseFloat(m[1]), u = m[2].toLowerCase();
  return u === 'in' || u === '' ? n * 72 : u === 'pt' ? n : u === 'cm' ? n * 72 / 2.54 : u === 'mm' ? n * 72 / 25.4 : u === 'twip' ? n / 20 : u === '%' ? (base || 0) * n / 100 : n * 72;
}
const num = v => (v == null ? null : parseFloat(v));
const pct = v => { if (v == null) return null; const n = parseFloat(v); return /%/.test(v) ? n / 100 : n; };

// ---------- pages ----------
// Splits the steps into pages: [{w, h, ops}]
function pages(ops) {
  const out = []; let cur = null;
  for (const o of ops) {
    if (o.op === 'startPage') { cur = { w: pt(o.p['svg:width']) || 612, h: pt(o.p['svg:height']) || 792, ops: [] }; out.push(cur); }
    else if (o.op === 'endPage') cur = null;
    else if (cur) cur.ops.push(o);
  }
  return out;
}

// ---------- pictures ----------
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
// A DIB (bitmap without its file header) becomes a .bmp the browser can show.
function dibToBmp(u8) {
  const hdr = u8[0] | (u8[1] << 8) | (u8[2] << 16) | (u8[3] << 24), bpp = u8[14] | (u8[15] << 8);
  let colors = u8[32] | (u8[33] << 8) | (u8[34] << 16) | (u8[35] << 24);
  if (!colors && bpp <= 8) colors = 1 << bpp;
  const off = 14 + hdr + colors * 4, out = new Uint8Array(14 + u8.length), dv = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d; dv.setUint32(2, out.length, true); dv.setUint32(10, off, true); out.set(u8, 14);
  return out;
}
async function picture(data, mime) {
  try {
    let u8 = b64(data);
    if (mime === 'image/bmp' && !(u8[0] === 0x42 && u8[1] === 0x4d)) u8 = dibToBmp(u8);
    if (!/^image\/(png|jpeg|gif|bmp|webp)$/.test(mime)) return null; // WMF, EMF, TIFF and PICT: not yet
    return await createImageBitmap(new Blob([u8], { type: mime }));
  } catch (e) { return null; }
}

// ---------- drawing ----------
function pathFromD(ctx, d, k) {
  ctx.beginPath();
  let x = 0, y = 0;
  for (const s of d || []) {
    const a = (s['librevenge:path-action'] || '').toUpperCase(), X = pt(s['svg:x']) * k, Y = pt(s['svg:y']) * k;
    if (a === 'M') ctx.moveTo(X, Y);
    else if (a === 'L') ctx.lineTo(X, Y);
    else if (a === 'C') ctx.bezierCurveTo(pt(s['svg:x1']) * k, pt(s['svg:y1']) * k, pt(s['svg:x2']) * k, pt(s['svg:y2']) * k, X, Y);
    else if (a === 'Q') ctx.quadraticCurveTo(pt(s['svg:x1']) * k, pt(s['svg:y1']) * k, X, Y);
    else if (a === 'A') arcTo(ctx, x, y, pt(s['svg:rx']) * k, pt(s['svg:ry']) * k, num(s['librevenge:rotate']) || 0, s['librevenge:large-arc'] === 'true' || s['librevenge:large-arc'] === '1', s['librevenge:sweep'] === 'true' || s['librevenge:sweep'] === '1', X, Y);
    else if (a === 'Z') ctx.closePath();
    if (a !== 'Z') { x = X; y = Y; }
  }
}
// SVG-style elliptical arc as canvas arcs
function arcTo(ctx, x1, y1, rx, ry, rot, large, sweep, x2, y2) {
  if (!rx || !ry) { ctx.lineTo(x2, y2); return; }
  const phi = rot * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  let l = xp * xp / (rx * rx) + yp * yp / (ry * ry); if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l); }
  const sign = large === sweep ? -1 : 1, num2 = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const co = sign * Math.sqrt(Math.max(0, num2 / (rx * rx * yp * yp + ry * ry * xp * xp)));
  const cxp = co * rx * yp / ry, cyp = -co * ry * xp / rx, cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry); let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI; else if (sweep && dt < 0) dt += 2 * Math.PI;
  ctx.ellipse(cx, cy, rx, ry, phi, t1, t1 + dt, !sweep);
}
function pathFromString(ctx, s, k) {
  ctx.beginPath();
  const t = String(s).match(/[MLZ]|-?[\d.]+(?:e-?\d+)?/gi) || []; let i = 0;
  while (i < t.length) {
    const c = t[i++].toUpperCase();
    if (c === 'Z') { ctx.closePath(); continue; }
    const X = parseFloat(t[i++]) * 72 * k, Y = parseFloat(t[i++]) * 72 * k;
    if (c === 'M') ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
}
function fillStyle(ctx, st, bounds, k) {
  const f = st['draw:fill'];
  if (f === 'solid') return withOpacity(st['draw:fill-color'] || '#000000', pct(st['draw:opacity']));
  if (f === 'gradient') {
    const stops = st['svg:linearGradient'] || [];
    if (!bounds || !stops.length) return stops.length ? stops[0]['svg:stop-color'] : null;
    const [x, y, w, h] = bounds, ang = (num(st['draw:angle']) || 0) * Math.PI / 180;
    const cx = x + w / 2, cy = y + h / 2, r = Math.hypot(w, h) / 2;
    const g = st['libmspub:shade'] === 'center' || st['libmspub:shade'] === 'shape'
      ? ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      : ctx.createLinearGradient(cx - Math.sin(ang) * r, cy - Math.cos(ang) * r, cx + Math.sin(ang) * r, cy + Math.cos(ang) * r);
    for (const s of stops) { try { g.addColorStop(Math.min(1, Math.max(0, pct(s['svg:offset']))), withOpacity(s['svg:stop-color'], pct(s['svg:stop-opacity']))); } catch (e) {} }
    return g;
  }
  if (f === 'bitmap' && st._img) { try { return ctx.createPattern(st._img, 'repeat'); } catch (e) { return null; } }
  return null;
}
function withOpacity(c, a) {
  if (a == null || a >= 1 || !/^#[0-9a-f]{6}$/i.test(c)) return c;
  const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function paint(ctx, st, bounds, k, closed = true) {
  const f = closed ? fillStyle(ctx, st, bounds, k) : null;
  if (f) { ctx.fillStyle = f; ctx.fill(st['svg:fill-rule'] === 'evenodd' ? 'evenodd' : 'nonzero'); }
  if (st['draw:stroke'] && st['draw:stroke'] !== 'none') {
    ctx.strokeStyle = withOpacity(st['svg:stroke-color'] || '#000000', pct(st['svg:stroke-opacity']));
    ctx.lineWidth = Math.max(.5, pt(st['svg:stroke-width'] || '0.01in') * k);
    ctx.setLineDash(st['draw:stroke'] === 'dash' ? [ctx.lineWidth * 3, ctx.lineWidth * 2] : []);
    ctx.lineCap = st['svg:stroke-linecap'] || 'butt';
    ctx.stroke(); ctx.setLineDash([]);
  }
}
function rotateAbout(ctx, p, cx, cy) {
  const r = num(p['librevenge:rotate']);
  if (!r) return;
  ctx.translate(cx, cy); ctx.rotate(-r * Math.PI / 180); ctx.translate(-cx, -cy);
}

// ---------- text ----------
const fontStack = name => `"${(name || 'Arial').replace(/"/g, '')}", ${/times|garamond|georgia|cambria|book|serif/i.test(name || '') ? 'serif' : 'sans-serif'}`;
// Lays out and draws one text box: paragraphs of spans, wrapped to the box width.
function drawText(ctx, box, paras, k, words) {
  const pad = ['top', 'right', 'bottom', 'left'].map(s => pt(box.p['fo:padding-' + s]) * k);
  const X = pt(box.p['svg:x']) * k, Y = pt(box.p['svg:y']) * k, W = pt(box.p['svg:width']) * k, H = pt(box.p['svg:height']) * k;
  const cols = Math.max(1, parseInt(box.p['fo:column-count'] || '1', 10) || 1), gap = pt(box.p['fo:column-gap']) * k;
  const colW = (W - pad[1] - pad[3] - gap * (cols - 1)) / cols;
  // lines first, so vertical alignment can be worked out
  const lines = [];
  for (const para of paras) {
    const pp = para.p || {}, ml = pt(pp['fo:margin-left']) * k, mr = pt(pp['fo:margin-right']) * k, ind = pt(pp['fo:text-indent']) * k;
    const maxW = Math.max(10, colW - ml - mr);
    let line = { items: [], w: 0, size: 0, para: pp, ml, first: true }, x = ind;
    const push = () => { lines.push(line); line = { items: [], w: 0, size: 0, para: pp, ml, first: false }; x = 0; };
    const pieces = [];
    for (const run of para.runs) {
      const sp = run.p || {}, size = (pt(sp['fo:font-size']) || 10) * k;
      const font = `${sp['fo:font-style'] === 'italic' ? 'italic ' : ''}${sp['fo:font-weight'] === 'bold' ? 'bold ' : ''}${size}px ${fontStack(sp['style:font-name'])}`;
      let text = run.t; if (sp['fo:text-transform'] === 'uppercase') text = text.toUpperCase();
      for (const part of text.split(/(\n|\t|\s+)/)) if (part) pieces.push({ part, font, size, color: sp['fo:color'] || '#000000', ul: sp['style:text-underline-type'] && sp['style:text-underline-type'] !== 'none' || (sp['style:text-underline-style'] && sp['style:text-underline-style'] !== 'none'), pos: sp['style:text-position'] });
    }
    if (!pieces.length) { const sp = (para.runs[0] || {}).p || {}; line.size = (pt(sp['fo:font-size']) || 10) * k; }
    for (const pc of pieces) {
      if (pc.part === '\n') { line.size = line.size || pc.size; push(); continue; }
      ctx.font = pc.font;
      const t = pc.part === '\t' ? '    ' : pc.part, w = ctx.measureText(t).width;
      if (x + w > maxW && line.items.length && !/^\s+$/.test(t)) { push(); }
      if (!line.items.length && /^\s+$/.test(t) && !line.first) continue; // no spaces at the start of a wrapped line
      line.items.push({ ...pc, t, x, w }); x += w; line.w = x; line.size = Math.max(line.size, pc.size);
    }
    line.last = true; push();
    if (lines.length) lines[lines.length - 1].paraEnd = true;
    lines[lines.length - 1].after = pt(pp['fo:margin-bottom']) * k;
    const firstOfPara = lines.find(l => l.para === pp); if (firstOfPara) firstOfPara.before = pt(pp['fo:margin-top']) * k;
  }
  const lh = l => { const v = l.para['fo:line-height']; if (!v) return l.size * 1.2; return /%/.test(v) ? l.size * 1.2 * parseFloat(v) / 100 : pt(v) * k; };
  // split into columns by height
  const innerH = H - pad[0] - pad[2];
  let total = 0; for (const l of lines) total += (l.before || 0) + lh(l) + (l.after || 0);
  const va = box.p['draw:textarea-vertical-align'];
  let col = 0, y = cols === 1 && va === 'middle' ? Math.max(0, (innerH - total) / 2) : cols === 1 && va === 'bottom' ? Math.max(0, innerH - total) : 0;
  ctx.save();
  rotateAbout(ctx, box.p, X + W / 2, Y + H / 2);
  for (const l of lines) {
    const h = (l.before || 0) + lh(l);
    if (cols > 1 && y + h > innerH && col < cols - 1) { col++; y = 0; }
    y += l.before || 0;
    const left = X + pad[3] + col * (colW + gap) + l.ml, avail = colW - l.ml - pt(l.para['fo:margin-right']) * k;
    const align = l.para['fo:text-align'];
    let trimmed = l.items; while (trimmed.length && /^\s+$/.test(trimmed[trimmed.length - 1].t)) trimmed = trimmed.slice(0, -1);
    const lw = trimmed.length ? trimmed[trimmed.length - 1].x + trimmed[trimmed.length - 1].w - (trimmed[0].x > 0 && !l.first ? 0 : 0) : 0;
    let dx = align === 'center' ? (avail - lw) / 2 : align === 'end' || align === 'right' ? avail - lw : 0;
    let extra = 0;
    if (align === 'justify' && !l.paraEnd && !l.last) { const gaps = trimmed.filter(it => /^\s+$/.test(it.t)).length; if (gaps) extra = (avail - lw) / gaps; }
    const base = Y + pad[0] + y + lh(l) * .8;
    let add = 0;
    for (const it of trimmed) {
      if (/^\s+$/.test(it.t)) { add += extra; continue; }
      ctx.font = it.font; ctx.fillStyle = it.color;
      const tx = left + dx + it.x + add, ty = base + (it.pos && /^super/.test(it.pos) ? -it.size * .35 : it.pos && /^sub/.test(it.pos) ? it.size * .2 : 0);
      ctx.fillText(it.t, tx, ty);
      if (it.ul) ctx.fillRect(tx, ty + it.size * .12, it.w, Math.max(1, it.size * .06));
      if (words) words.push({ t: it.t, x: tx, y: ty, w: it.w, size: it.size });
    }
    y += lh(l) + (l.after || 0);
  }
  ctx.restore();
}

// ---------- one page on a canvas ----------
async function drawPage(page, dpi = 150, words) {
  const k = dpi / 72, c = document.createElement('canvas');
  c.width = Math.ceil(page.w * k); c.height = Math.ceil(page.h * k);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  let st = {}, text = null, table = null, para = null, missing = 0;
  for (const o of page.ops) {
    const p = o.p || {};
    switch (o.op) {
      case 'setStyle': st = { ...p }; if (p['draw:fill'] === 'bitmap' && p['draw:fill-image']) st._img = await picture(p['draw:fill-image'], p['librevenge:mime-type']); break;
      case 'startLayer': ctx.save(); if (p['svg:clip-path']) { pathFromString(ctx, p['svg:clip-path'], k); ctx.clip(); } break;
      case 'endLayer': ctx.restore(); break;
      case 'rect': {
        const x = pt(p['svg:x']) * k, y = pt(p['svg:y']) * k, w = pt(p['svg:width']) * k, h = pt(p['svg:height']) * k;
        ctx.save(); rotateAbout(ctx, p, x + w / 2, y + h / 2); ctx.beginPath();
        const r = pt(p['svg:rx']) * k; if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
        paint(ctx, st, [x, y, w, h], k); ctx.restore(); break;
      }
      case 'ellipse': {
        const cx = pt(p['svg:cx']) * k, cy = pt(p['svg:cy']) * k, rx = pt(p['svg:rx']) * k, ry = pt(p['svg:ry']) * k;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, -(num(p['librevenge:rotate']) || 0) * Math.PI / 180, 0, Math.PI * 2);
        paint(ctx, st, [cx - rx, cy - ry, rx * 2, ry * 2], k); break;
      }
      case 'polygon': case 'polyline': {
        const pts = p['svg:points'] || []; if (!pts.length) break;
        ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, pt(q['svg:x']) * k, pt(q['svg:y']) * k));
        if (o.op === 'polygon') ctx.closePath();
        const xs = pts.map(q => pt(q['svg:x']) * k), ys = pts.map(q => pt(q['svg:y']) * k);
        paint(ctx, st, [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)], k, o.op === 'polygon'); break;
      }
      case 'path': case 'connector': {
        const d = p['svg:d'] || []; pathFromD(ctx, d, k);
        const xs = d.map(q => pt(q['svg:x']) * k), ys = d.map(q => pt(q['svg:y']) * k);
        paint(ctx, st, xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)] : null, k, d.some(q => /z/i.test(q['librevenge:path-action'] || ''))); break;
      }
      case 'image': {
        const x = pt(p['svg:x']) * k, y = pt(p['svg:y']) * k, w = pt(p['svg:width']) * k, h = pt(p['svg:height']) * k;
        const img = p['office:binary-data'] ? await picture(p['office:binary-data'], p['librevenge:mime-type']) : null;
        ctx.save(); rotateAbout(ctx, p, x + w / 2, y + h / 2);
        if (img) ctx.drawImage(img, x, y, w, h);
        else { missing++; ctx.fillStyle = '#eef0f4'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#b8bfcc'; ctx.lineWidth = k; ctx.strokeRect(x, y, w, h); }
        ctx.restore(); break;
      }
      case 'startText': text = { p, paras: [] }; break;
      case 'openPara': para = { p, runs: [] }; (table && table.cell ? table.cell.paras : text ? text.paras : []).push(para); break;
      case 'openSpan': if (para) para.runs.push({ p, t: '' }); break;
      case 'text': if (para) { if (!para.runs.length) para.runs.push({ p: {}, t: '' }); para.runs[para.runs.length - 1].t += o.t.replace(/\r/g, ''); } break;
      case 'space': if (para && para.runs.length) para.runs[para.runs.length - 1].t += ' '; break;
      case 'tab': if (para && para.runs.length) para.runs[para.runs.length - 1].t += '\t'; break;
      case 'br': if (para && para.runs.length) para.runs[para.runs.length - 1].t += '\n'; break;
      case 'closePara': para = null; break;
      case 'endText': if (text) drawText(ctx, text, text.paras, k, words); text = null; break;
      case 'startTable': table = { p, cols: (p['librevenge:table-columns'] || []).map(c2 => pt(c2['style:column-width']) * k), rows: [], cell: null }; break;
      case 'openRow': if (table) table.rows.push({ h: pt(p['librevenge:row-height'] || p['style:row-height']) * k, cells: [] }); break;
      case 'openCell': if (table && table.rows.length) { table.cell = { p, paras: [] }; table.rows[table.rows.length - 1].cells.push(table.cell); } break;
      case 'closeCell': if (table) table.cell = null; break;
      case 'endTable': if (table) drawTable(ctx, table, k, words); table = null; break;
    }
  }
  return { canvas: c, missing };
}
function drawTable(ctx, t, k, words) {
  const X = pt(t.p['svg:x']) * k, Y = pt(t.p['svg:y']) * k, colX = [X]; t.cols.forEach(w => colX.push(colX[colX.length - 1] + w));
  let y = Y;
  for (const row of t.rows) {
    for (const cell of row.cells) {
      const c0 = parseInt(cell.p['librevenge:column'] || '0', 10), span = parseInt(cell.p['table:number-columns-spanned'] || '1', 10);
      const x = colX[c0] || X, w = (colX[c0 + span] || colX[colX.length - 1]) - x, h = row.h;
      if (cell.p['fo:background-color']) { ctx.fillStyle = cell.p['fo:background-color']; ctx.fillRect(x, y, w, h); }
      for (const side of ['top', 'right', 'bottom', 'left']) {
        const b = cell.p['fo:border-' + side]; if (!b || b === 'none') continue;
        const m = String(b).match(/([\d.]+[a-z]*)\s+\S+\s+(#[0-9a-f]{6})/i); if (!m) continue;
        ctx.fillStyle = m[2]; const bw = Math.max(1, pt(m[1]) * k);
        if (side === 'top') ctx.fillRect(x, y, w, bw); if (side === 'bottom') ctx.fillRect(x, y + h - bw, w, bw);
        if (side === 'left') ctx.fillRect(x, y, bw, h); if (side === 'right') ctx.fillRect(x + w - bw, y, bw, h);
      }
      drawText(ctx, { p: { 'svg:x': x / k / 72 + 'in', 'svg:y': y / k / 72 + 'in', 'svg:width': w / k / 72 + 'in', 'svg:height': h / k / 72 + 'in', 'fo:padding-left': '0.04in', 'fo:padding-right': '0.04in', 'fo:padding-top': '0.04in', 'draw:textarea-vertical-align': cell.p['style:vertical-align'] } }, cell.paras, k, words);
    }
    y += row.h;
  }
}

// ---------- the PDF ----------
// One picture per page (the look kept exactly), with the text written invisibly on top so it can be
// found and copied.
async function toPDF(file, progress = () => {}, dpi = 200) {
  const ops = await read(file);
  if (!ops) throw new Error('This is not a Publisher file');
  const list = pages(ops);
  if (!list.length) throw new Error('The Publisher file has no pages');
  if (!window.PDFLib && window.LVApp) await window.LVApp.lib('pdflib');
  const { PDFDocument, StandardFonts } = PDFLib;
  const doc = await PDFDocument.create(), helv = await doc.embedFont(StandardFonts.Helvetica);
  let missing = 0;
  for (let i = 0; i < list.length; i++) {
    const words = [], { canvas, missing: m } = await drawPage(list[i], dpi, words); missing += m;
    const jpg = new Uint8Array(await (await new Promise(r => canvas.toBlob(r, 'image/jpeg', .9))).arrayBuffer());
    const page = doc.addPage([list[i].w, list[i].h]), img = await doc.embedJpg(jpg);
    page.drawImage(img, { x: 0, y: 0, width: list[i].w, height: list[i].h });
    const k = dpi / 72;
    for (const w of words) {
      const t = w.t.replace(/[^\x20-\x7e -ÿ]/g, '?'), size = w.size / k;
      if (!t.trim() || size < 1) continue;
      try { page.drawText(t, { x: w.x / k, y: list[i].h - w.y / k, size, font: helv, opacity: 0 }); } catch (e) {}
    }
    canvas.width = canvas.height = 0;
    progress((i + 1) / list.length);
  }
  const meta = (ops.find(o => o.op === 'meta') || {}).p || {};
  if (meta['dc:title']) doc.setTitle(meta['dc:title']);
  if (meta['dc:creator']) doc.setAuthor(meta['dc:creator']);
  doc.setProducer('LunaVerta');
  return { blob: new Blob([await doc.save()], { type: 'application/pdf' }), pages: list.length, missing };
}

window.LVPub = { read, pages, drawPage, toPDF };
})();
