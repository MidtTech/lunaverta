(() => {
'use strict';
// ---------- libraries, loaded on demand ----------
// Self-hosted copies (see scripts/vendor.mjs). Nothing loads from third parties.
const VENDOR = new URL('../vendor/', document.currentScript ? document.currentScript.src : location.href).href;
const T = (k, v) => (window.LV ? window.LV.t(k, v) : k);
const LIBS = {
  pdflib: 'pdf-lib.min.js',
  pdfjs: 'pdf.min.js',
  jspdf: 'jspdf.umd.min.js',
  jszip: 'jszip.min.js',
  xlsx: 'xlsx.full.min.js',
  mammoth: 'mammoth.browser.min.js',
  marked: 'marked.min.js',
  lame: 'lame.min.js',
  turndown: 'turndown.js',
  heif: 'libheif.js',
  docx: 'docx-preview.min.js',
  h2c: 'html2canvas.min.js',
  qpdf: 'qpdf.js',
  tesseract: 'tesseract/tesseract.min.js'
};
const loaded = {};
function lib(name) {
  if (!loaded[name]) loaded[name] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = VENDOR + LIBS[name];
    s.onload = res;
    s.onerror = () => { delete loaded[name]; rej(new Error(T(navigator.onLine ? 'err.lib.online' : 'err.lib.offline'))); };
    document.head.appendChild(s);
  });
  return loaded[name];
}

// ---------- formats ----------
const KINDS = {
  image: { color: '--c-image', exts: ['png','jpg','jpeg','webp','gif','bmp','avif','svg','ico','heic','heif'], targets: ['png','jpg','webp','gif','pdf','ocr','ico','bmp','clean'] },
  pdf:   { color: '--c-doc', exts: ['pdf'], targets: ['edit','redact','ocr','merge','split','protect','unlock','png','jpg'] },
  doc:   { color: '--c-doc', exts: ['docx','md','markdown','txt','html','htm'], targets: ['pdf','html','md','txt'] },
  data:  { color: '--c-data', exts: ['xlsx','xls','ods','csv','tsv','json'], targets: ['xlsx','csv','json','html','md'] },
  audio: { color: '--c-audio', exts: ['mp3','wav','ogg','oga','opus','flac','m4a','aac','weba'], targets: ['mp3','wav'] },
  video: { color: '--c-video', exts: ['mp4','webm','mov','m4v','mkv'], targets: ['gif','mp3','wav','png','jpg'] }
};
const OUT = {
  png: { k: '--c-image' }, jpg: { k: '--c-image' }, webp: { k: '--c-image' }, gif: { k: '--c-image' }, ico: { k: '--c-image' }, bmp: { k: '--c-image' }, clean: { k: '--c-image', tool: true },
  pdf: { k: '--c-doc' }, edit: { k: '--c-doc', tool: true }, redact: { k: '--c-doc', tool: true }, ocr: { k: '--c-doc', tool: true }, prices: { k: '--c-doc', tool: true }, merge: { k: '--c-doc', tool: true }, split: { k: '--c-doc', tool: true }, shrink: { k: '--c-doc', tool: true }, protect: { k: '--c-doc', tool: true }, unlock: { k: '--c-doc', tool: true },
  html: { k: '--c-doc' }, md: { k: '--c-doc' }, txt: { k: '--c-doc' },
  xlsx: { k: '--c-data' }, csv: { k: '--c-data' }, json: { k: '--c-data' },
  mp3: { k: '--c-audio' }, wav: { k: '--c-audio' }
};
// Tools (merge, split, shrink, clean) are named in words; formats by extension.
const label = t => (OUT[t] && OUT[t].tool ? T('tgt.' + t).toUpperCase() : t.toUpperCase());
const ORDER = ['edit','redact','ocr','merge','split','shrink','protect','unlock','png','jpg','webp','gif','pdf','docx','html','md','txt','xlsx','csv','json','mp3','wav','ico','bmp','clean'];
const MIME_KIND = [[/^image\//, 'image'], [/^application\/pdf/, 'pdf'], [/^audio\//, 'audio'], [/^video\//, 'video'],
  [/(spreadsheet|excel|csv|json|tab-separated)/, 'data'], [/(wordprocessingml|markdown|^text\/plain|^text\/html)/, 'doc']];
const SAME = { jpeg: 'jpg', htm: 'html', markdown: 'md' };

const ext = name => { const m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; };
const base = name => (name || 'file').replace(/\.[^.]+$/, '');
function kindOfExt(e) { for (const k in KINDS) if (KINDS[k].exts.includes(e)) return k; return null; }
function kindOf(file) { return kindOfExt(ext(file.name)) || kindOfMime(file.type); }
function kindOfMime(t) { if (!t) return null; for (const [re, k] of MIME_KIND) if (re.test(t)) return k; return null; }
// Tools kept out of the ring for a kind, but still used by their own pages
// (Compress PDF, Remove PDF metadata, PDF to text, Remove prices).
const PAGE_ONLY = { pdf: ['shrink', 'clean', 'txt', 'prices'] };
function targetsFor(file) {
  const k = kindOf(file); if (!k) return [];
  const e = SAME[ext(file.name)] || ext(file.name);
  const list = KINDS[k].targets.filter(t => t !== e);
  if (PRESET && (PAGE_ONLY[k] || []).includes(PRESET)) list.push(PRESET);
  if (k === 'image') list.push('merge'); // images can join a PDF merge
  return list;
}
// Merging needs at least one PDF and at least two PDFs or images in total.
const canMerge = kinds => kinds.includes('pdf') && kinds.filter(k => k === 'pdf' || k === 'image').length > 1;
function unionTargets(kinds) {
  const s = new Set(); kinds.forEach(k => k && KINDS[k].targets.forEach(t => s.add(t)));
  if (!canMerge(kinds)) s.delete('merge');
  return ORDER.filter(t => s.has(t));
}
function fileTargets(files) {
  const s = new Set(); files.forEach(f => targetsFor(f).forEach(t => s.add(t)));
  if (!canMerge(files.map(kindOf))) s.delete('merge');
  return ORDER.filter(t => s.has(t));
}
const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const kv = k => `var(${k})`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- settings ----------
const $ = id => document.getElementById(id);
const opts = () => ({
  quality: +$('optQuality').value / 100, maxDim: +$('optSize').value, kbps: +$('optKbps').value,
  gifSeconds: +$('optGif').value, merge: $('optMerge').checked, pdfQ: $('optPdfQ').value
});
const OPT_IDS = ['optQuality', 'optSize', 'optKbps', 'optGif', 'optMerge', 'optPdfQ'];
try {
  const saved = JSON.parse(localStorage.getItem('lunaverta-opts') || '{}');
  OPT_IDS.forEach(id => { if (id in saved) { const el = $(id); if (el.type === 'checkbox') el.checked = saved[id]; else el.value = saved[id]; } });
} catch (e) {}
function persistOpts() {
  $('qOut').textContent = $('optQuality').value + '%';
  try { const o = {}; OPT_IDS.forEach(id => { const el = $(id); o[id] = el.type === 'checkbox' ? el.checked : el.value; }); localStorage.setItem('lunaverta-opts', JSON.stringify(o)); } catch (e) {}
}
OPT_IDS.forEach(id => $(id).addEventListener('input', persistOpts));
persistOpts();

// ---------- canvas helpers ----------
function canvasToBlob(c, type, q) { return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error(T('err.write', { type }))), type, q)); }
function fit(w, h, maxDim) { if (!maxDim || Math.max(w, h) <= maxDim) return [w, h]; const s = maxDim / Math.max(w, h); return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))]; }
let heifMod = null;
function heif() {
  if (!heifMod) heifMod = (async () => {
    await lib('heif');
    const res = await fetch(VENDOR + 'libheif.wasm');
    if (!res.ok) throw new Error(T('err.heic.load'));
    let m = libheif({ wasmBinary: await res.arrayBuffer() });
    if (m && typeof m.then === 'function') m = await m;
    if (m && m.ready && typeof m.ready.then === 'function') await m.ready;
    return m;
  })().catch(e => { heifMod = null; throw e; });
  return heifMod;
}
async function decodeHEIC(file) {
  const m = await heif();
  const images = new m.HeifDecoder().decode(new Uint8Array(await file.arrayBuffer()));
  if (!images || !images.length) throw new Error(T('err.heic.none'));
  const im = images[0], w = im.get_width(), h = im.get_height();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), data = ctx.createImageData(w, h);
  await new Promise((res, rej) => im.display(data, d => d ? res() : rej(new Error(T('err.heic.decode')))));
  ctx.putImageData(data, 0, 0);
  images.forEach(i => i.free && i.free());
  return { img: c, w, h };
}
async function decodeImage(file) {
  const e = ext(file.name);
  if (e === 'heic' || e === 'heif' || /hei[cf]/.test(file.type)) {
    try { return await decodeNative(file); } catch (err) { return decodeHEIC(file); } // Safari reads HEIC natively
  }
  return decodeNative(file);
}
async function decodeNative(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url;
    await img.decode().catch(() => { throw new Error(T('err.image')); });
    let w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) { w = 1024; h = 1024; }
    return { img, w, h };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
function drawToCanvas(src, w, h, maxDim, background) {
  const [cw, ch] = fit(w, h, maxDim);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, cw, ch); }
  ctx.drawImage(src, 0, 0, cw, ch);
  return c;
}

// ---------- GIF encoder (popularity palette + LZW) ----------
function quantize(data) {
  const hist = new Uint32Array(32768);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    hist[((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3)]++;
  }
  const keys = [];
  for (let k = 0; k < 32768; k++) if (hist[k]) keys.push(k);
  keys.sort((a, b) => hist[b] - hist[a]);
  const pal = keys.slice(0, 255).map(k => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]);
  if (!pal.length) pal.push([0, 0, 0]);
  const cache = new Int16Array(32768).fill(-1);
  const transparent = pal.length; // index reserved for transparency
  const idx = new Uint8Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (data[i + 3] < 128) { idx[p] = transparent; continue; }
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    let c = cache[key];
    if (c < 0) {
      let best = 0, bd = 1e9; const r = data[i], g = data[i + 1], b = data[i + 2];
      for (let j = 0; j < pal.length; j++) { const d = (pal[j][0] - r) ** 2 * 2 + (pal[j][1] - g) ** 2 * 4 + (pal[j][2] - b) ** 2 * 3; if (d < bd) { bd = d; best = j; } }
      c = cache[key] = best;
    }
    idx[p] = c;
  }
  return { pal, idx, transparent };
}
function lzw(idx, minCode) {
  const out = []; let cur = 0, bits = 0;
  const emit = (code, size) => { cur |= code << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; } };
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1, next = eoi + 1, dict = new Map();
  emit(clear, size);
  let prefix = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = prefix * 4096 + k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix, size);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear, size); dict = new Map(); size = minCode + 1; next = eoi + 1; }
    prefix = k;
  }
  emit(prefix, size); emit(eoi, size);
  if (bits > 0) out.push(cur & 255);
  return out;
}
function encodeGIF(frames, w, h) {
  const bytes = [];
  const str = s => { for (const ch of s) bytes.push(ch.charCodeAt(0)); };
  const u16 = v => bytes.push(v & 255, (v >> 8) & 255);
  str('GIF89a'); u16(w); u16(h); bytes.push(0, 0, 0);
  if (frames.length > 1) { bytes.push(0x21, 0xff, 11); str('NETSCAPE2.0'); bytes.push(3, 1, 0, 0, 0); }
  for (const f of frames) {
    const { pal, idx, transparent } = quantize(f.data);
    let depth = 1; while ((1 << depth) < pal.length + 1) depth++;
    bytes.push(0x21, 0xf9, 4, 0b00001001, f.delay & 255, (f.delay >> 8) & 255, transparent, 0);
    bytes.push(0x2c); u16(0); u16(0); u16(w); u16(h); bytes.push(0x80 | (depth - 1));
    for (let i = 0; i < (1 << depth); i++) { const c = pal[i] || [0, 0, 0]; bytes.push(c[0], c[1], c[2]); }
    const minCode = Math.max(2, depth);
    bytes.push(minCode);
    const data = lzw(idx, minCode);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); bytes.push(n); for (let j = 0; j < n; j++) bytes.push(data[i + j]); }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

// ---------- ICO / BMP / WAV writers ----------
async function toICO(canvas) {
  const c = canvas.width > 256 || canvas.height > 256 ? drawToCanvas(canvas, canvas.width, canvas.height, 256) : canvas;
  const png = new Uint8Array(await (await canvasToBlob(c, 'image/png')).arrayBuffer());
  const head = new DataView(new ArrayBuffer(22));
  head.setUint16(2, 1, true); head.setUint16(4, 1, true);
  head.setUint8(6, c.width >= 256 ? 0 : c.width); head.setUint8(7, c.height >= 256 ? 0 : c.height);
  head.setUint16(10, 1, true); head.setUint16(12, 32, true); head.setUint32(14, png.length, true); head.setUint32(18, 22, true);
  return new Blob([head.buffer, png], { type: 'image/x-icon' });
}
function toBMP(canvas) {
  const w = canvas.width, h = canvas.height, d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const row = Math.ceil(w * 3 / 4) * 4, size = 54 + row * h, buf = new ArrayBuffer(size), v = new DataView(buf);
  v.setUint8(0, 66); v.setUint8(1, 77); v.setUint32(2, size, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true);
  v.setInt32(18, w, true); v.setInt32(22, h, true); v.setUint16(26, 1, true); v.setUint16(28, 24, true); v.setUint32(34, row * h, true);
  const b = new Uint8Array(buf);
  for (let y = 0; y < h; y++) { let o = 54 + (h - 1 - y) * row; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; b[o++] = d[i + 2]; b[o++] = d[i + 1]; b[o++] = d[i]; } }
  return new Blob([buf], { type: 'image/bmp' });
}
function channels(buf) {
  const ch = []; for (let i = 0; i < Math.min(2, buf.numberOfChannels); i++) ch.push(buf.getChannelData(i));
  if (buf.numberOfChannels > 2) { // downmix extra channels evenly into stereo
    const L = new Float32Array(buf.length), R = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c), t = c % 2 ? R : L; for (let i = 0; i < d.length; i++) t[i] += d[i] / Math.ceil(buf.numberOfChannels / 2); }
    return [L, R];
  }
  return ch;
}
function toWAV(buf) {
  const ch = channels(buf), n = ch.length, len = buf.length, sr = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + len * n * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + len * n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, n, true); out.setUint32(24, sr, true);
  out.setUint32(28, sr * n * 2, true); out.setUint16(32, n * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, len * n * 2, true);
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < n; c++) { const s = Math.max(-1, Math.min(1, ch[c][i])); out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Blob([out.buffer], { type: 'audio/wav' });
}
const toI16 = f => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return o; };
async function toMP3(buf, kbps, progress) {
  await lib('lame');
  let src = buf;
  if (![32000, 44100, 48000, 22050, 24000, 16000].includes(buf.sampleRate)) { // resample odd rates
    const off = new OfflineAudioContext(Math.min(2, buf.numberOfChannels), Math.ceil(buf.duration * 44100), 44100);
    const s = off.createBufferSource(); s.buffer = buf; s.connect(off.destination); s.start(); src = await off.startRendering();
  }
  const ch = channels(src).map(toI16), n = ch.length;
  const enc = new lamejs.Mp3Encoder(n, src.sampleRate, kbps), parts = [], step = 1152 * 40;
  for (let i = 0; i < ch[0].length; i += step) {
    const l = ch[0].subarray(i, i + step), r = n > 1 ? ch[1].subarray(i, i + step) : undefined;
    const mp3 = n > 1 ? enc.encodeBuffer(l, r) : enc.encodeBuffer(l);
    if (mp3.length) parts.push(new Uint8Array(mp3));
    progress(i / ch[0].length);
    if ((i / step) % 20 === 0) await new Promise(r => setTimeout(r));
  }
  const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
  return new Blob(parts, { type: 'audio/mpeg' });
}
async function decodeAudio(file) {
  const ab = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  try { return await ctx.decodeAudioData(ab); }
  catch (e) { throw new Error(T(kindOf(file) === 'video' ? 'err.noSound' : 'err.audio')); }
}

// ---------- video ----------
function loadVideo(file) {
  return new Promise((res, rej) => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.src = URL.createObjectURL(file);
    v.onloadeddata = () => res(v);
    v.onerror = () => rej(new Error(T('err.video')));
  });
}
const seek = (v, t) => new Promise(res => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = t; });

// ---------- PDF writer ----------
async function newPDF(fmt, orient) { await lib('jspdf'); return new window.jspdf.jsPDF({ unit: 'pt', format: fmt || 'a4', orientation: orient || 'p', compress: true }); }
async function imagesToPDF(canvases, quality) {
  let doc;
  for (const c of canvases) {
    const w = c.width * .75, h = c.height * .75, o = w > h ? 'l' : 'p';
    if (!doc) doc = await newPDF([w, h], o); else doc.addPage([w, h], o);
    doc.addImage(c.toDataURL('image/jpeg', quality), 'JPEG', 0, 0, w, h);
  }
  return doc.output('blob');
}
// ---------- rich text -> PDF ----------
// Inline styling survives the trip: bold, italic, code, links, sub/superscript,
// line breaks, images and real table columns.
const PDF_INK = [26, 29, 38], PDF_LINK = [22, 82, 172], PDF_RULE = [205, 209, 219], PDF_MUTED = [120, 124, 134];
const EMPH = { B: 'bold', STRONG: 'bold', I: 'italic', EM: 'italic', CITE: 'italic', VAR: 'italic', DFN: 'italic' };
const MONO = /^(CODE|KBD|SAMP|TT)$/, SKIP = /^(SCRIPT|STYLE|NOSCRIPT)$/;
const BLOCKISH = /^(DIV|SECTION|ARTICLE|MAIN|BODY|HEADER|FOOTER|ASIDE|NAV|FIGURE|FIGCAPTION|DL|DD|DT|FORM|LABEL|ADDRESS|DETAILS|SUMMARY)$/;
const BULLETS = ['•', '–', '·'];

function runsOf(node, st, out = []) {
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { const t = st.pre ? n.nodeValue : n.nodeValue.replace(/\s+/g, ' '); if (t) out.push({ ...st, text: t }); continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.tagName;
    if (SKIP.test(tag)) continue;
    if (tag === 'BR') { out.push({ br: true }); continue; }
    if (tag === 'IMG') { out.push({ img: n.getAttribute('src') || '', alt: n.getAttribute('alt') || '' }); continue; }
    // jsPDF's base fonts only cover WinAnsi, so a checkbox glyph here must stay plain ASCII.
    if (tag === 'INPUT' && (n.getAttribute('type') || '').toLowerCase() === 'checkbox') { out.push({ ...st, font: 'courier', text: (n.hasAttribute('checked') ? '[x]' : '[ ]') + ' ' }); continue; }
    const s = { ...st };
    if (EMPH[tag]) s[EMPH[tag]] = true;
    if (MONO.test(tag)) { s.font = 'courier'; s.size = st.size * .94; }
    if (tag === 'U' || tag === 'INS') s.underline = true;
    if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') s.strike = true;
    if (tag === 'SMALL') s.size = st.size * .85;
    if (tag === 'SUP' || tag === 'SUB') { s.rise = (tag === 'SUP' ? .34 : -.16) * s.size; s.size *= .72; }
    if (tag === 'A') { const h = n.getAttribute('href'); if (h && !/^\s*javascript:/i.test(h)) { s.href = h; s.color = PDF_LINK; s.underline = true; } }
    runsOf(n, s, out);
  }
  return out;
}
// Only inline data is drawn; the page never reaches out to the network for an image.
async function pdfImage(src) {
  if (!/^(data:image\/|blob:)/i.test(src)) return null;
  const img = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  if (!img || !img.naturalWidth) return null;
  const jpeg = /^data:image\/jpe?g/i.test(src), [w, h] = fit(img.naturalWidth, img.naturalHeight, 1600);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (jpeg) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(img, 0, 0, w, h);
  try { return { data: c.toDataURL(jpeg ? 'image/jpeg' : 'image/png', .92), fmt: jpeg ? 'JPEG' : 'PNG', w: img.naturalWidth, h: img.naturalHeight }; }
  catch (e) { return null; }
}
async function htmlToPDF(html, title) {
  const doc = await newPDF('a4', 'p');
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 56, maxW = W - M * 2, bottom = H - M;
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  body.querySelectorAll('script,style,noscript').forEach(n => n.remove());
  const images = new Map();
  for (const el of body.querySelectorAll('img')) { const s = el.getAttribute('src'); if (s && !images.has(s)) images.set(s, await pdfImage(s)); }

  let y = M, off = 0;
  const left = () => M + off, avail = () => maxW - off;
  const face = r => { doc.setFont(r.font || 'helvetica', ((r.bold ? 'bold' : '') + (r.italic ? 'italic' : '')) || 'normal'); doc.setFontSize(r.size || 11); };
  const widthOf = r => { face(r); return doc.getTextWidth(r.text); };
  const room = h => { if (y + h > bottom && y > M) { doc.addPage(); y = M; } };
  const page = () => { try { return doc.internal.getCurrentPageInfo().pageNumber; } catch (e) { return doc.internal.getNumberOfPages(); } };
  const rule = (x, from, atPage, color) => { doc.setDrawColor(color[0], color[1], color[2]); doc.setLineWidth(2.5); doc.line(x, (page() === atPage ? from : M) + 2, x, y - 8); };

  // a word with no break opportunity (a long URL, say) is cut to the column
  const chop = (r, piece, w) => {
    const out = []; let s = piece;
    while (s) {
      const full = widthOf({ ...r, text: s });
      if (full <= w) { out.push(s); break; }
      let i = Math.max(1, Math.floor(s.length * w / full));
      while (i > 1 && widthOf({ ...r, text: s.slice(0, i) }) > w) i--;
      while (i < s.length && widthOf({ ...r, text: s.slice(0, i + 1) }) <= w) i++;
      out.push(s.slice(0, i)); s = s.slice(i);
    }
    return out;
  };
  // word-wrap a run list into lines of tokens
  const flow = (runs, w) => {
    const lines = []; let line = [], used = 0;
    const wrap = () => { while (line.length && line[line.length - 1].space) line.pop(); lines.push(line); line = []; used = 0; };
    for (const r of runs) {
      if (r.br) { wrap(); continue; }
      if (r.img) { if (line.length) wrap(); lines.push([r]); continue; }
      if (!r.text) continue;
      r.text.replace(/\t/g, '    ').split('\n').forEach((part, i) => {
        if (i) wrap();
        for (const piece of part.split(/( +)/)) {
          if (!piece) continue;
          const space = piece[0] === ' ';
          const pieces = !space && widthOf({ ...r, text: piece }) > w ? chop(r, piece, w) : [piece];
          for (const text of pieces) {
            const tok = { ...r, text, space };
            if (space && !line.length && !r.pre) continue;
            const tw = widthOf(tok);
            if (!space && line.length && used + tw > w) wrap();
            line.push(tok); used += tw;
          }
        }
      });
    }
    if (line.length) wrap();
    return lines;
  };
  const lineSize = line => line.reduce((m, t) => Math.max(m, t.size || 11), 0) || 11;
  const paint = (line, x, top, lh) => {
    const sz = lineSize(line), baseY = top + sz;
    let cx = x;
    for (const t of line) {
      face(t);
      const tw = doc.getTextWidth(t.text), c = t.color || PDF_INK, ts = t.size || 11, by = baseY - (t.rise || 0);
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(t.text, cx, by);
      if (t.underline || t.strike) {
        doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(Math.max(.4, ts * .045));
        const uy = by + (t.strike ? -ts * .28 : ts * .13);
        doc.line(cx, uy, cx + tw, uy);
      }
      if (t.href) doc.link(cx, baseY - sz, tw, sz * 1.15, { url: t.href });
      cx += tw;
    }
    return sz * lh;
  };
  const drawImage = (t, x, w) => {
    const im = images.get(t.img);
    if (!im) { if (t.alt) block([{ font: 'helvetica', size: 10, italic: true, color: PDF_MUTED, text: t.alt }], x, w, 1.4, 6); return; }
    let iw = im.w * .75, ih = im.h * .75;
    if (iw > w) { ih *= w / iw; iw = w; }
    if (ih > bottom - M) { iw *= (bottom - M) / ih; ih = bottom - M; }
    room(ih);
    try { doc.addImage(im.data, im.fmt, x, y, iw, ih); y += ih + 8; } catch (e) { y += 2; }
  };
  const block = (runs, x, w, lh, gap, marker) => {
    flow(runs, w).forEach((line, i) => {
      if (line.length === 1 && line[0].img) { drawImage(line[0], x, w); return; }
      const sz = lineSize(line);
      room(sz * lh);
      if (!i && marker) { face(marker); doc.setTextColor(PDF_INK[0], PDF_INK[1], PDF_INK[2]); doc.text(marker.text, x - doc.getTextWidth(marker.text) - 6, y + sz); }
      y += paint(line, x, y, lh);
    });
    y += gap;
  };
  const emit = (el, o = {}) => {
    const size = o.size || 11, indent = o.indent || 0;
    const runs = runsOf(el, { font: o.font || 'helvetica', size, bold: !!o.bold, italic: !!o.italic, pre: !!o.pre });
    if (!runs.some(r => r.img || (r.text && r.text.trim()))) return;
    block(runs, left() + indent, avail() - indent, o.lh || 1.45, o.gap ?? 7, o.marker ? { font: 'helvetica', size, text: o.marker } : null);
  };
  const list = (el, depth, ordered) => {
    let n = parseInt(el.getAttribute('start') || '1', 10) || 1;
    for (const li of el.children) {
      if (li.tagName !== 'LI') continue;
      const clone = li.cloneNode(true), nests = [...clone.children].filter(c => c.tagName === 'UL' || c.tagName === 'OL');
      nests.forEach(x => x.remove());
      emit(clone, { indent: 20 + depth * 18, gap: 3, marker: ordered ? (n++) + '.' : BULLETS[depth % 3] });
      nests.forEach(x => list(x, depth + 1, x.tagName === 'OL'));
    }
    y += 5;
  };
  const pre = el => {
    const at = page(), top = y;
    off += 14;
    block(runsOf(el, { font: 'courier', size: 9.5, pre: true }), left(), avail(), 1.32, 12);
    off -= 14;
    rule(left() + 5, top, at, [214, 218, 228]);
  };
  const quote = (el, depth) => {
    const at = page(), top = y;
    off += 18;
    if (el.children.length) walk(el, depth); else emit(el, { italic: true });
    off -= 18;
    rule(left() + 6, top, at, [190, 196, 208]);
  };
  const table = el => {
    const size = 10, pad = 5, lh = 1.35, w0 = avail();
    const trs = [...el.querySelectorAll('tr')].filter(tr => tr.children.length);
    if (!trs.length) return;
    // Walk the rows accounting for colspan/rowspan so a merged cell doesn't
    // shift every column after it out of alignment on the rows below it.
    // A rowspan cell is drawn once, at its own row's height only — tall
    // merges won't visually stretch, but the grid stays correctly aligned.
    const placed = [], carry = [];
    let cols = 0;
    for (const tr of trs) {
      const row = []; let col = 0;
      for (const td of tr.children) {
        while (carry[col] > 0) col++;
        const span = Math.max(1, td.colSpan || 1), rspan = Math.max(1, td.rowSpan || 1);
        row.push({ td, col, span });
        for (let k = 0; k < span; k++) carry[col + k] = Math.max(carry[col + k] || 0, rspan - 1);
        col += span;
      }
      cols = Math.max(cols, col);
      placed.push(row);
      for (let c = 0; c < carry.length; c++) if (carry[c] > 0) carry[c]--;
    }
    const headRow = trs[0].querySelector('th') ? placed[0] : null;
    const nat = Array(cols).fill(24);
    placed.forEach(row => row.forEach(({ td, col, span }) => {
      face({ size, bold: td.tagName === 'TH' });
      const w = Math.min(doc.getTextWidth((td.textContent || '').replace(/\s+/g, ' ').trim()) + pad * 2, w0 * .55) / span;
      for (let k = 0; k < span; k++) nat[col + k] = Math.max(nat[col + k], w);
    }));
    const total = nat.reduce((a, b) => a + b, 0) || 1, widths = nat.map(n => n / total * w0);
    const colX = c => left() + widths.slice(0, c).reduce((a, b) => a + b, 0);
    const spanW = (c, span) => widths.slice(c, c + span).reduce((a, b) => a + b, 0);
    const drawRow = (row, isHead) => {
      const laid = row.map(({ td, col, span }) => flow(runsOf(td, { font: 'helvetica', size, bold: isHead || td.tagName === 'TH' }), spanW(col, span) - pad * 2));
      const h = Math.max(size * lh, ...laid.map(ls => ls.length * size * lh)) + pad * 2;
      if (y + h > bottom && y > M) { doc.addPage(); y = M; if (headRow && !isHead) drawRow(headRow, true); }
      row.forEach(({ col, span }, i) => {
        const x = colX(col), w = spanW(col, span);
        if (isHead) { doc.setFillColor(240, 242, 247); doc.rect(x, y, w, h, 'F'); }
        doc.setDrawColor(PDF_RULE[0], PDF_RULE[1], PDF_RULE[2]); doc.setLineWidth(.5); doc.rect(x, y, w, h);
        let ty = y + pad;
        for (const line of laid[i]) ty += paint(line, x + pad, ty, lh);
      });
      y += h;
    };
    y += 2;
    placed.forEach((row, i) => drawRow(row, !!headRow && i === 0));
    y += 12;
  };
  const SIZES = { H1: 21, H2: 17, H3: 14.5, H4: 12.5, H5: 11.5, H6: 11 };
  const walk = (node, depth) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t) block([{ font: 'helvetica', size: 11, text: t }], left(), avail(), 1.45, 7); continue; }
      if (n.nodeType !== 1) continue;
      const el = n, t = el.tagName;
      if (SKIP.test(t)) continue;
      if (SIZES[t]) { y += t === 'H1' ? 6 : 10; room(SIZES[t] * 2.8); emit(el, { size: SIZES[t], bold: true, gap: 5, lh: 1.3 }); }
      else if (t === 'P') emit(el);
      else if (t === 'UL' || t === 'OL') list(el, depth, t === 'OL');
      else if (t === 'PRE') pre(el);
      else if (t === 'BLOCKQUOTE') quote(el, depth);
      else if (t === 'TABLE') table(el);
      else if (t === 'HR') { room(20); y += 6; doc.setDrawColor(PDF_RULE[0], PDF_RULE[1], PDF_RULE[2]); doc.setLineWidth(.7); doc.line(left(), y, W - M, y); y += 14; }
      else if (t === 'IMG') drawImage({ img: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '' }, left(), avail());
      else if (BLOCKISH.test(t) && el.children.length) walk(el, depth);
      else emit(el);
    }
  };
  walk(body, 0);
  doc.setProperties({ title });
  return doc.output('blob');
}

// ---------- document helpers ----------
function htmlToText(html) {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  body.querySelectorAll('script,style').forEach(n => n.remove());
  body.querySelectorAll('br').forEach(n => n.replaceWith('\n'));
  body.querySelectorAll('li').forEach(n => n.prepend('- '));
  body.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,tr,pre,blockquote,table,ul,ol').forEach(n => n.append('\n'));
  return body.textContent.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function standaloneHTML(title, inner) {
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1b1d26}table{border-collapse:collapse}td,th{border:1px solid #ccd;padding:.35rem .6rem;text-align:left}th{background:#f0f2f6}pre{background:#f4f5f8;padding:1rem;overflow:auto}img{max-width:100%}</style>
</head><body>\n${inner}\n</body></html>\n`;
}
async function readDoc(file) {
  const e = ext(file.name);
  if (e === 'docx') { await lib('mammoth'); const ab = await file.arrayBuffer(); const r = await mammoth.convertToHtml({ arrayBuffer: ab }); return { html: r.value, ab }; }
  const text = await file.text();
  if (e === 'md' || e === 'markdown') { await lib('marked'); return { html: marked.parse(text), md: text, text }; }
  if (e === 'html' || e === 'htm') return { html: text };
  return { html: text.split(/\n{2,}/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('\n'), text, md: text };
}
// ---------- Word -> PDF, laid out the way Word lays it out ----------
// docx-preview reproduces Word's page size, margins, fonts, colours, alignment,
// tables, images, headers and footers in the page. Each page is then drawn into
// the PDF as an image, with an invisible text layer on top so the PDF can still
// be searched and copied from.
const PAGE_QUALITY = { best: { scale: 2, jpeg: .92 }, small: { scale: 1.35, jpeg: .72 } }; // about 190 / 130 dpi
const WIN_ANSI = /[^\x20-\x7e\xa0-\xff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]/g;
function wordBoxes(section) {
  const top = section.getBoundingClientRect(), out = [];
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.data.trim()) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const size = parseFloat(cs.fontSize) || 14;
    for (const m of n.data.matchAll(/\S+/g)) {
      range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
      const r = range.getClientRects()[0];
      if (!r || !r.width) continue;
      out.push({ text: m[0], x: r.left - top.left, y: r.top - top.top, w: r.width, h: r.height, size });
    }
  }
  return out;
}
// Word draws most bullets with private characters from the Symbol and Wingdings
// fonts, which only show up when those fonts are installed. Swap them for the
// Unicode characters they stand for.
const SYMBOL_BULLETS = { '': '•', '': '▪', '': '➢', '': '❖', '': '✔', '': '□', '': '■', '': '➤', '': '▸' };
function fixSymbolBullets(styles, pages) {
  const re = /[-]/g, swap = t => t.replace(re, c => SYMBOL_BULLETS[c] || '•');
  for (const st of styles.querySelectorAll('style')) {
    if (!/[\uf020-\uf0ff]/.test(st.textContent)) continue;
    st.textContent = st.textContent.replace(/content:\s*"([^"]*)"([^}]*?)font-family:\s*(?:Symbol|Wingdings[^;]*)/g, (m, c, mid) => `content: "${swap(c)}"${mid}font-family: inherit`).replace(re, c => SYMBOL_BULLETS[c] || '•');
  }
  const walker = document.createTreeWalker(pages, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/[-]/.test(n.data)) n.data = swap(n.data);
}
// Word hides everything inside a field's code (between its begin and separate
// marks), including paragraph breaks. Mail-merge documents often have IF fields
// whose code spans several paragraphs; left alone, those show up as empty lines
// and duplicated text. Remove the hidden parts so only what Word shows remains.
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function stripFieldCodes(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return xml;
  const stack = []; // one entry per open field: true while inside its code
  const hidden = () => stack.some(Boolean);
  const paras = [...doc.getElementsByTagNameNS(W_NS, 'p')], joins = [];
  let changed = false;
  for (const p of paras) {
    for (const r of [...p.getElementsByTagNameNS(W_NS, 'r')]) {
      for (const el of [...r.childNodes]) {
        if (el.nodeType !== 1) continue;
        if (el.localName === 'fldChar') {
          const t = el.getAttributeNS(W_NS, 'fldCharType') || el.getAttribute('w:fldCharType');
          if (t === 'begin') stack.push(true); else if (t === 'separate') { if (stack.length) stack[stack.length - 1] = false; } else if (t === 'end') stack.pop();
        } else if (el.localName !== 'rPr' && hidden()) { el.remove(); changed = true; }
      }
    }
    // This paragraph's break is inside a field code, so Word joins it with the next one.
    if (hidden()) joins.push(p);
  }
  // Join only after reading everything, so no field mark is counted twice.
  for (const p of joins.reverse()) {
    const next = p.nextSibling && p.nextSibling.localName === 'p' ? p.nextSibling : null;
    if (!next) continue;
    const ppr = [...next.childNodes].find(n => n.localName === 'pPr'), at = ppr ? ppr.nextSibling : next.firstChild;
    [...p.childNodes].filter(n => n.localName !== 'pPr').forEach(n => next.insertBefore(n, at));
    p.remove(); changed = true;
  }
  return changed ? new XMLSerializer().serializeToString(doc) : xml;
}
// The renderer starts every section on a new page, but Word continues a
// "continuous" section on the same page. Join such a section into the one
// before it when the page size matches, keeping that section's header/footer.
function joinContinuousSections(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return xml;
  const sects = [...doc.getElementsByTagNameNS(W_NS, 'sectPr')].filter(el => el.parentNode.localName === 'pPr' || el.parentNode.localName === 'body');
  const child = (el, name) => [...el.childNodes].find(n => n.localName === name);
  const attr = (el, name) => el && (el.getAttributeNS(W_NS, name) || el.getAttribute('w:' + name));
  let changed = false;
  for (let i = sects.length - 1; i > 0; i--) {
    const b = sects[i], a = sects[i - 1];
    if (attr(child(b, 'type'), 'val') !== 'continuous') continue;
    const pa = child(a, 'pgSz'), pb = child(b, 'pgSz');
    if (pa && pb && (attr(pa, 'w') !== attr(pb, 'w') || attr(pa, 'h') !== attr(pb, 'h'))) continue;
    const hasRefs = [...b.childNodes].some(n => /^(header|footer)Reference$/.test(n.localName));
    if (!hasRefs) [...a.childNodes].filter(n => /^(header|footer)Reference$|^titlePg$/.test(n.localName)).reverse().forEach(n => b.insertBefore(n, b.firstChild));
    for (const name of ['pgSz', 'pgMar']) if (!child(b, name) && child(a, name)) b.appendChild(child(a, name));
    const t = child(b, 'type'); if (t) t.remove();
    const at = child(a, 'type'); if (at) b.insertBefore(at, b.firstChild); // the joined section starts the way the first one did
    a.remove(); changed = true;
  }
  return changed ? new XMLSerializer().serializeToString(doc) : xml;
}
// Word draws consecutive paragraphs with identical borders as one bordered
// block: a top line above the first, a bottom line below the last. The renderer
// draws every paragraph's own lines, so remove the ones Word leaves out.
function groupParagraphBorders(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return xml;
  const ser = new XMLSerializer();
  const props = p => { const ppr = [...p.childNodes].find(n => n.localName === 'pPr'); return ppr ? [...ppr.childNodes] : []; };
  const key = p => { const kids = props(p), b = kids.find(n => n.localName === 'pBdr'); if (!b) return null; const ind = kids.find(n => n.localName === 'ind'); return ser.serializeToString(b) + '|' + (ind ? ser.serializeToString(ind) : ''); };
  const drop = (p, side) => { const b = props(p).find(n => n.localName === 'pBdr'); const el = b && [...b.childNodes].find(n => n.localName === side); if (el) el.remove(); };
  let changed = false;
  for (const p of [...doc.getElementsByTagNameNS(W_NS, 'p')]) {
    const next = p.nextSibling;
    if (!next || next.localName !== 'p') continue;
    const k = key(p);
    if (k && k === key(next)) { drop(p, 'bottom'); drop(next, 'top'); changed = true; }
  }
  return changed ? ser.serializeToString(doc) : xml;
}
async function prepareDocx(file) {
  try {
    const zip = await JSZip.loadAsync(file);
    const parts = Object.keys(zip.files).filter(n => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
    let touched = false;
    for (const n of parts) {
      const xml = await zip.file(n).async('string');
      let out = stripFieldCodes(xml);
      if (n === 'word/document.xml') out = groupParagraphBorders(joinContinuousSections(out));
      if (out !== xml) { zip.file(n, out); touched = true; }
    }
    return touched ? await zip.generateAsync({ type: 'blob' }) : file;
  } catch (e) { return file; }
}
// docx-preview finishes some layout (tab stops) after it reports done, so wait
// until the page heights stop changing before measuring anything.
async function settleLayout(box) {
  const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 40)));
  let last = '', same = 0;
  for (let i = 0; i < 50 && same < 3; i++) {
    await frame();
    const now = [...box.querySelectorAll('section')].map(s => s.scrollHeight + 'x' + s.scrollWidth).join(',');
    same = now === last ? same + 1 : 0; last = now;
  }
}
async function docxToPDF(file, title, progress, quality = 'best') {
  const Q = PAGE_QUALITY[quality] || PAGE_QUALITY.best;
  await lib('jszip'); // docx-preview reads the .docx with JSZip
  await Promise.all([lib('docx'), lib('h2c'), lib('jspdf')]);
  const stage = document.createElement('div');
  stage.className = 'docx-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.style.cssText = 'position:absolute;left:-30000px;top:0;background:#fff;color:#000;color-scheme:light;line-height:normal;font:initial';
  const styles = document.createElement('div'), pagesBox = document.createElement('div');
  stage.append(styles, pagesBox);
  document.body.appendChild(stage);
  try {
    await docx.renderAsync(await prepareDocx(file), pagesBox, styles, {
      className: 'lvdocx', inWrapper: false, breakPages: true, ignoreLastRenderedPageBreak: true,
      ignoreWidth: false, ignoreHeight: false, experimental: false, useBase64URL: true,
      renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true
    });
    fixSymbolBullets(styles, pagesBox);
    await Promise.all([...pagesBox.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    if (document.fonts) await document.fonts.ready;
    await settleLayout(pagesBox);
    const sections = [...pagesBox.querySelectorAll('section.lvdocx')];
    if (!sections.length) throw new Error('No pages were rendered.');
    progress(.15);

    const ptToPx = v => { const m = /([\d.]+)pt/.exec(v || ''); return m ? +m[1] * 96 / 72 : 0; };
    // Plan the PDF pages. Word only stores some page breaks in the file, so a
    // section taller than one page is split between lines of text, and its
    // header and footer are repeated on every page it covers.
    const plan = [];
    sections.forEach((sec, si) => {
      const w = sec.offsetWidth, h = ptToPx(sec.style.minHeight) || Math.round(w * 1.4142);
      const total = Math.max(sec.scrollHeight, sec.offsetHeight), words = wordBoxes(sec);
      const article = sec.querySelector(':scope > article'), footer = sec.querySelector(':scope > footer');
      if (total <= h + 2 || !article) { plan.push({ sec, si, w, h, parts: [{ y: 0, height: total, at: 0 }], words }); return; }
      const header = sec.querySelector(':scope > header');
      // Keep the whole header line, including letters that hang below its box.
      const headerBottom = header ? Math.max(...[...header.querySelectorAll('*')].map(el => {
        const r = el.getBoundingClientRect(), t = sec.getBoundingClientRect(); return r.bottom - t.top;
      }), header.offsetTop + header.offsetHeight) + 3 : 0;
      const head = Math.ceil(Math.max(article.offsetTop, headerBottom)), foot = footer ? footer.offsetTop : article.offsetTop + article.offsetHeight;
      const footH = total - foot, room = Math.max(h * .4, h - head - footH);
      for (let start = article.offsetTop; start < foot - 2;) {
        let end = Math.min(start + room, foot);
        if (end < foot) {
          for (let i = 0; i < 60; i++) {
            const cut = words.find(b => b.y > start && b.y < end && b.y + b.h > end);
            if (!cut) break;
            end = cut.y - 1;
          }
          if (end - start < room * .5) end = Math.min(start + room, foot);
        }
        plan.push({ sec, si, w, h, parts: [
          { y: 0, height: head, at: 0, alias: 'head' + si },
          { y: start, height: end - start, at: head },
          { y: foot, height: footH, at: h - footH, alias: 'foot' + si }
        ], words });
        start = end;
      }
      // Never end on a page with no text (just a signature line or empty
      // paragraphs): move the last line of the page before onto it.
      const mine = plan.filter(pg => pg.sec === sec);
      if (mine.length > 1) {
        const last = mine[mine.length - 1].parts[1], prev = mine[mine.length - 2].parts[1];
        const inPart = (b, part) => b.y >= part.y && b.y < part.y + part.height;
        if (!words.some(b => inPart(b, last))) {
          const lineTop = Math.max(...words.filter(b => inPart(b, prev)).map(b => b.y));
          if (isFinite(lineTop) && lineTop > prev.y && (last.y + last.height) - lineTop <= room) {
            const cut = lineTop - 1;
            prev.height = cut - prev.y;
            last.height = last.y + last.height - cut; last.y = cut;
          }
        }
      }
    });

    let doc;
    const shots = {};
    for (let i = 0; i < plan.length; i++) {
      const pg = plan[i], wPt = pg.w * .75, hPt = pg.h * .75, orient = wPt > hPt ? 'l' : 'p';
      if (!doc) doc = await newPDF([wPt, hPt], orient); else doc.addPage([wPt, hPt], orient);
      for (const part of pg.parts) {
        if (part.height < 1) continue;
        let img = part.alias && shots[part.alias];
        if (!img) {
          const shot = await html2canvas(pg.sec, { scale: Q.scale, backgroundColor: '#ffffff', logging: false, x: 0, y: part.y, width: pg.w, height: Math.ceil(part.height) });
          img = shot.toDataURL('image/jpeg', Q.jpeg);
          if (part.alias) shots[part.alias] = img;
        }
        doc.addImage(img, 'JPEG', 0, part.at * .75, wPt, part.height * .75, part.alias ? part.alias + '-' + pg.si : undefined, 'FAST');
        doc.setFont('helvetica', 'normal');
        for (const b of pg.words) {
          const mid = b.y + b.h / 2; // each word belongs to exactly one band, by its centre
          if (mid < part.y || mid >= part.y + part.height) continue;
          const text = b.text.replace(WIN_ANSI, '?');
          doc.setFontSize(b.size * .75);
          const natural = doc.getTextWidth(text);
          doc.text(text + ' ', b.x * .75, (b.y - part.y + part.at + b.h * .8) * .75, {
            renderingMode: 'invisible', horizontalScale: natural ? Math.min(4, Math.max(.25, (b.w * .75) / natural)) : 1
          });
        }
      }
      progress(.15 + .85 * (i + 1) / plan.length);
      await new Promise(r => setTimeout(r));
    }
    doc.setProperties({ title });
    return doc.output('blob');
  } finally { stage.remove(); }
}

async function convertDoc(file, target, o, progress = () => {}) {
  if (target === 'pdf' && ext(file.name) === 'docx') {
    try { return [{ name: base(file.name) + '.pdf', blob: await docxToPDF(file, base(file.name), progress, o && o.pdfQ) }]; }
    catch (err) { console.warn('Exact Word layout failed, using the simplified layout instead.', err); }
  }
  const d = await readDoc(file), title = base(file.name);
  if (target === 'html') return [{ name: title + '.html', blob: new Blob([standaloneHTML(title, d.html)], { type: 'text/html' }) }];
  if (target === 'txt') {
    let t = d.text;
    if (!t && d.ab) t = (await mammoth.extractRawText({ arrayBuffer: d.ab })).value;
    if (!t) t = htmlToText(d.html);
    return [{ name: title + '.txt', blob: new Blob([t], { type: 'text/plain' }) }];
  }
  if (target === 'md') {
    let m = d.md;
    if (!m) {
      await lib('turndown');
      const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
      td.remove(['script', 'style']);
      m = td.turndown(new DOMParser().parseFromString(d.html, 'text/html').body.innerHTML);
    }
    return [{ name: title + '.md', blob: new Blob([m], { type: 'text/markdown' }) }];
  }
  if (target === 'pdf') return [{ name: title + '.pdf', blob: await htmlToPDF(d.html, title) }];
}

// ---------- data ----------
async function readWorkbook(file) {
  await lib('xlsx');
  const e = ext(file.name);
  if (e === 'json') {
    let v; try { v = JSON.parse(await file.text()); } catch (err) { throw new Error(T('err.json')); }
    const wb = XLSX.utils.book_new();
    if (v && !Array.isArray(v) && typeof v === 'object' && Object.values(v).every(Array.isArray)) {
      for (const [k, arr] of Object.entries(v)) XLSX.utils.book_append_sheet(wb, sheetFromArray(arr), k.slice(0, 31) || 'Sheet');
    } else XLSX.utils.book_append_sheet(wb, sheetFromArray(Array.isArray(v) ? v : [v]), 'Sheet1');
    return wb;
  }
  if (e === 'csv' || e === 'tsv') {
    const text = await file.text();
    if (e === 'tsv') { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(text.replace(/\r/g, '').split('\n').filter(Boolean).map(l => l.split('\t'))), 'Sheet1'); return wb; }
    // Semicolon-separated files (Danish/European Excel) use a decimal comma:
    // read every cell as text, then turn "1.234,50" into the number 1234.5.
    // Values with a leading zero (postcodes, phone numbers) stay text.
    const first = text.split(/\r?\n/, 1)[0];
    if ((first.match(/;/g) || []).length > (first.match(/,/g) || []).length) {
      const wb = XLSX.read(text, { type: 'string', FS: ';', raw: true });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: true });
      const num = v => (typeof v === 'string' && !/^-?0\d/.test(v.trim()) && /^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(v.trim()) ? parseFloat(v.trim().replace(/\./g, '').replace(',', '.')) : v);
      const out = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(out, XLSX.utils.aoa_to_sheet(rows.map(r => r.map(num))), 'Sheet1');
      return out;
    }
    return XLSX.read(text, { type: 'string', raw: false });
  }
  return XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
}
function sheetFromArray(arr) {
  const rows = arr.map(r => (r && typeof r === 'object' && !Array.isArray(r)) ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && typeof v === 'object' ? JSON.stringify(v) : v])) : { value: Array.isArray(r) ? JSON.stringify(r) : r });
  return XLSX.utils.json_to_sheet(rows);
}
const sheetRows = ws => XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
function mdTable(rows) {
  if (!rows.length) return '';
  const w = Math.max(...rows.map(r => r.length)), cell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const line = r => '| ' + Array.from({ length: w }, (_, i) => cell(r[i])).join(' | ') + ' |';
  return [line(rows[0]), '| ' + Array(w).fill('---').join(' | ') + ' |', ...rows.slice(1).map(line)].join('\n') + '\n';
}
function htmlTable(rows) {
  if (!rows.length) return '<p>(empty sheet)</p>';
  const [head, ...rest] = rows;
  return '<table>\n<thead><tr>' + head.map(c => `<th>${esc(c)}</th>`).join('') + '</tr></thead>\n<tbody>\n' + rest.map(r => '<tr>' + head.map((_, i) => `<td>${esc(r[i] ?? '')}</td>`).join('') + '</tr>').join('\n') + '\n</tbody></table>';
}
async function convertData(file, target) {
  const wb = await readWorkbook(file), title = base(file.name), names = wb.SheetNames, multi = names.length > 1;
  const sheetName = n => multi ? `${title}-${n.replace(/[\\/:*?"<>|]+/g, '_')}` : title;
  if (target === 'xlsx') return [{ name: title + '.xlsx', blob: new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) }];
  if (target === 'csv') return names.map(n => ({ name: sheetName(n) + '.csv', blob: new Blob(['﻿' + XLSX.utils.sheet_to_csv(wb.Sheets[n])], { type: 'text/csv' }) }));
  if (target === 'json') {
    const obj = multi ? Object.fromEntries(names.map(n => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null })])) : XLSX.utils.sheet_to_json(wb.Sheets[names[0]], { defval: null });
    return [{ name: title + '.json', blob: new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }) }];
  }
  if (target === 'md') return [{ name: title + '.md', blob: new Blob([names.map(n => (multi ? `## ${n}\n\n` : '') + mdTable(sheetRows(wb.Sheets[n]))).join('\n')], { type: 'text/markdown' }) }];
  if (target === 'html') return [{ name: title + '.html', blob: new Blob([standaloneHTML(title, names.map(n => (multi ? `<h2>${esc(n)}</h2>\n` : '') + htmlTable(sheetRows(wb.Sheets[n]))).join('\n'))], { type: 'text/html' }) }];
}

// ---------- converters by kind ----------
// ---------- PDF tools: merge, split, shrink ----------
// Loads a PDF for changing. Many invoices are "protected" only against
// changes, with no password needed to open them: that protection is removed
// first (with qpdf). A PDF that needs a password to open stays locked.
async function loadPdfBytes(bytes, opts = {}) {
  await lib('pdflib');
  try { return await PDFLib.PDFDocument.load(bytes, opts); }
  catch (e) {
    if (!/encrypt/i.test(e && e.message)) throw new Error(T('err.pdf.read'));
    const r = await qpdf(bytes, ['--password=', '--decrypt', '/in.pdf', '/out.pdf']);
    if (!r.out) throw new Error(T('err.pdf.locked'));
    try { return await PDFLib.PDFDocument.load(r.out, opts); } catch (e2) { throw new Error(T('err.pdf.read')); }
  }
}
async function openPdfLib(file) { return loadPdfBytes(new Uint8Array(await file.arrayBuffer())); }
// PDFs keep their pages as they are (text, links, quality); images become pages.
async function mergeToPDF(files, o, progress) {
  await lib('pdflib');
  const out = await PDFLib.PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (kindOf(f) === 'pdf') {
      const src = await openPdfLib(f);
      (await out.copyPages(src, src.getPageIndices())).forEach(pg => out.addPage(pg));
    } else {
      const { img, w, h } = await decodeImage(f);
      const c = drawToCanvas(img, w, h, o.maxDim || 2480, '#fff');
      const pic = await out.embedJpg(await (await canvasToBlob(c, 'image/jpeg', o.quality)).arrayBuffer());
      const pw = c.width * .75, ph = c.height * .75;
      out.addPage([pw, ph]).drawImage(pic, { x: 0, y: 0, width: pw, height: ph });
    }
    progress((i + 1) / files.length * .9);
  }
  return new Blob([await out.save()], { type: 'application/pdf' });
}
// Some programs give every page one shared list of images. Before a page is
// copied out on its own, keep only the images its content actually draws.
function keepUsedImages(page) {
  try {
    const { PDFName, PDFDict, PDFArray, PDFRawStream, decodePDFRawStream } = PDFLib;
    const res = page.node.Resources(), xo = res && res.lookup(PDFName.of('XObject'));
    if (!(xo instanceof PDFDict)) return;
    const raw = page.node.Contents(), streams = raw instanceof PDFArray ? raw.asArray().map(r => page.doc.context.lookup(r)) : [raw];
    let ops = '';
    for (const st of streams) {
      if (!(st instanceof PDFRawStream)) return; // unknown stream type: leave the page alone
      ops += new TextDecoder('latin1').decode(decodePDFRawStream(st).decode());
    }
    const used = new Set([...ops.matchAll(/\/([^\s\/\[\]()<>{}%]+)\s+Do\b/g)].map(m => m[1]));
    const keepXo = page.doc.context.obj({});
    for (const [k, v] of xo.entries()) if (used.has(k.decodeText ? k.decodeText() : k.asString().slice(1))) keepXo.set(k, v);
    const newRes = page.doc.context.obj({});
    for (const [k, v] of res.entries()) newRes.set(k, k === PDFName.of('XObject') ? keepXo : v);
    page.node.set(PDFName.of('Resources'), newRes);
  } catch (e) { /* keep the page as it is */ }
}
async function splitPDF(file, progress) {
  const src = await openPdfLib(file), n = src.getPageCount(), pad = String(n).length, b = base(file.name), outs = [];
  src.getPages().forEach(keepUsedImages);
  for (let i = 0; i < n; i++) {
    const one = await PDFLib.PDFDocument.create();
    one.addPage((await one.copyPages(src, [i]))[0]);
    outs.push({ name: `${b}-${String(i + 1).padStart(pad, '0')}.pdf`, blob: new Blob([await one.save()], { type: 'application/pdf' }) });
    progress((i + 1) / n);
  }
  return outs;
}
// Redraw every page as a compact image with an invisible text layer, so the
// smaller file can still be searched and copied from. Keeps the original if
// that turns out smaller.
async function shrinkPDF(file, pdf, progress) {
  await lib('jspdf');
  let doc;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 125 / 72 });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const w = vp1.width, h = vp1.height, orient = w > h ? 'l' : 'p';
    if (!doc) doc = await newPDF([w, h], orient); else doc.addPage([w, h], orient);
    doc.addImage(c.toDataURL('image/jpeg', .68), 'JPEG', 0, 0, w, h, undefined, 'FAST');
    doc.setFont('helvetica', 'normal');
    for (const it of (await page.getTextContent()).items) {
      if (!it.str || !it.str.trim()) continue;
      const m = pdfjsLib.Util.transform(vp1.transform, it.transform);
      if (Math.abs(m[1]) > .01 || Math.abs(m[2]) > .01) continue; // rotated text: leave out of the text layer
      const size = Math.hypot(m[2], m[3]) || Math.abs(m[3]) || 10, text = it.str.replace(WIN_ANSI, '?');
      doc.setFontSize(size);
      const natural = doc.getTextWidth(text);
      doc.text(text, m[4], m[5], { renderingMode: 'invisible', horizontalScale: natural && it.width ? Math.min(4, Math.max(.25, it.width / natural)) : 1 });
    }
    progress(i / pdf.numPages);
  }
  const blob = doc.output('blob');
  if (blob.size >= file.size * .95) return [{ name: file.name, blob: file.slice(0, file.size, 'application/pdf'), noteKey: 'shrink.kept' }];
  return [{ name: base(file.name) + '-small.pdf', blob, noteKey: 'shrink.saved', noteVars: { p: Math.round((1 - blob.size / file.size) * 100) } }];
}

// ---------- removing hidden data from photos ----------
// Strips EXIF (location, camera, dates), XMP, IPTC and comments without
// re-encoding, so the picture itself is untouched.
function exifInfo(view) {
  const le = view.getUint16(0) === 0x4949, u16 = o => view.getUint16(o, le), u32 = o => view.getUint32(o, le);
  const ifd = u32(4), n = u16(ifd); let orientation = 1, gps = false;
  for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12, tag = u16(e); if (tag === 0x0112) orientation = u16(e + 8); if (tag === 0x8825) gps = true; }
  return { orientation, gps };
}
const ascii = (u, at, len) => String.fromCharCode(...u.subarray(at, at + len));
function cleanJPEG(buf) {
  const u = new Uint8Array(buf), v = new DataView(buf);
  if (v.getUint16(0) !== 0xFFD8) return null;
  const keep = [u.subarray(0, 2)]; let pos = 2, removed = false, info = { orientation: 1, gps: false };
  while (pos + 4 <= u.length) {
    if (u[pos] !== 0xFF) return null;
    const m = u[pos + 1];
    if (m === 0xFF) { pos++; continue; }
    if (m === 0xDA) { keep.push(u.subarray(pos)); break; } // image data follows; keep the rest as is
    if ((m >= 0xD0 && m <= 0xD8) || m === 0x01) { keep.push(u.subarray(pos, pos + 2)); pos += 2; continue; }
    const len = v.getUint16(pos + 2), seg = u.subarray(pos, pos + 2 + len);
    if (m === 0xE1 && ascii(u, pos + 4, 4) === 'Exif') { try { info = exifInfo(new DataView(buf, pos + 10, len - 8)); } catch (e) {} }
    const icc = m === 0xE2 && ascii(u, pos + 4, 11) === 'ICC_PROFILE';
    const drop = m === 0xFE || (m >= 0xE1 && m <= 0xED && !icc);
    if (drop) removed = true; else keep.push(seg);
    pos += 2 + len;
  }
  return { blob: new Blob(keep, { type: 'image/jpeg' }), removed, ...info };
}
function cleanPNG(buf) {
  const u = new Uint8Array(buf), v = new DataView(buf);
  if (ascii(u, 1, 3) !== 'PNG') return null;
  const keep = [u.subarray(0, 8)]; let pos = 8, removed = false, gps = false;
  while (pos + 12 <= u.length) {
    const len = v.getUint32(pos), type = ascii(u, pos + 4, 4), end = pos + 12 + len;
    if (['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'].includes(type)) {
      removed = true;
      if (type === 'eXIf') { try { gps = exifInfo(new DataView(buf, pos + 8, len)).gps; } catch (e) {} }
    } else keep.push(u.subarray(pos, end));
    pos = end;
    if (type === 'IEND') break;
  }
  return { blob: new Blob(keep, { type: 'image/png' }), removed, gps, orientation: 1 };
}
function cleanWebP(buf) {
  const u = new Uint8Array(buf);
  if (ascii(u, 0, 4) !== 'RIFF' || ascii(u, 8, 4) !== 'WEBP') return null;
  const v = new DataView(buf), keep = []; let pos = 12, removed = false, gps = false;
  while (pos + 8 <= u.length) {
    const type = ascii(u, pos, 4), len = v.getUint32(pos + 4, true), end = pos + 8 + len + (len & 1);
    if (type === 'EXIF' || type === 'XMP ') {
      removed = true;
      if (type === 'EXIF') { try { const off = ascii(u, pos + 8, 4) === 'Exif' ? 6 : 0; gps = exifInfo(new DataView(buf, pos + 8 + off, len - off)).gps; } catch (e) {} }
    } else {
      const chunk = u.slice(pos, end);
      if (type === 'VP8X') chunk[8] &= ~0x0C; // clear the "has EXIF / XMP" flags
      keep.push(chunk);
    }
    pos = end;
  }
  const size = keep.reduce((n, c) => n + c.length, 4), head = new Uint8Array(12);
  head.set([82, 73, 70, 70]); new DataView(head.buffer).setUint32(4, size, true); head.set([87, 69, 66, 80], 8);
  return { blob: new Blob([head, ...keep], { type: 'image/webp' }), removed, gps, orientation: 1 };
}
async function cleanImage(file, o) {
  const e = ext(file.name), b = base(file.name), buf = await file.arrayBuffer();
  const r = e === 'jpg' || e === 'jpeg' ? cleanJPEG(buf) : e === 'png' ? cleanPNG(buf) : e === 'webp' ? cleanWebP(buf) : null;
  const note = x => (x.gps ? 'clean.gps' : x.removed ? 'clean.some' : 'clean.none');
  if (r && r.orientation === 1) return [{ name: `${b}-clean.${e === 'jpeg' ? 'jpg' : e}`, blob: r.blob, noteKey: note(r) }];
  if (r || /^(heic|heif|avif)$/.test(e)) {
    // Turned photos (and HEIC/AVIF) are redrawn upright at high quality instead.
    const { img, w, h } = await decodeImage(file);
    const c = drawToCanvas(img, w, h, 0, '#ffffff');
    return [{ name: `${b}-clean.jpg`, blob: await canvasToBlob(c, 'image/jpeg', .95), noteKey: r ? note(r) : 'clean.some' }];
  }
  return [{ name: `${b}-clean.${e}`, blob: file.slice(0, file.size, file.type), noteKey: 'clean.none' }];
}

// ---------- qpdf: passwords and tidy rewrites ----------
// qpdf compiled to WebAssembly (scripts/vendor.mjs). Each run reads /in.pdf and
// writes /out.pdf in qpdf's own in-memory file system.
let qpdfMod = null;
async function qpdf(bytes, args) {
  await lib('qpdf');
  if (!qpdfMod) {
    const res = await fetch(VENDOR + 'qpdf.wasm');
    if (!res.ok) throw new Error(T(navigator.onLine ? 'err.lib.online' : 'err.lib.offline'));
    qpdfMod = await window.Module({ wasmBinary: await res.arrayBuffer(), print() {}, printErr() {} });
  }
  const q = qpdfMod;
  q.FS.writeFile('/in.pdf', bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  let rc;
  try { rc = q.callMain(args); } catch (e) { rc = e && typeof e.status === 'number' ? e.status : 2; }
  let out = null;
  try { if (rc === 0 || rc === 3) out = q.FS.readFile('/out.pdf'); } catch (e) {}
  for (const f of ['/in.pdf', '/out.pdf']) try { q.FS.unlink(f); } catch (e) {}
  return { rc, out };
}
async function isEncrypted(bytes) {
  await lib('pdflib');
  try { return (await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).isEncrypted; }
  catch (e) { throw new Error(T('err.pdf.read')); }
}
// Rewrites a PDF keeping only what it still uses, so removed pages, text and
// data are really gone from the file.
async function tidyPDF(bytes) {
  const r = await qpdf(bytes, ['/in.pdf', '--object-streams=generate', '/out.pdf']);
  return r.out || bytes;
}
async function protectPDF(file, pw) {
  if (!pw) throw new Error(T('pw.missing'));
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (await isEncrypted(bytes)) throw new Error(T('err.pdf.alreadyLocked'));
  // AES-256. The same password opens it and allows everything.
  const r = await qpdf(bytes, ['--encrypt', pw, pw, '256', '--', '/in.pdf', '/out.pdf']);
  if (!r.out) throw new Error(T('err.pdf.read'));
  return [{ name: base(file.name) + '-protected.pdf', blob: new Blob([r.out], { type: 'application/pdf' }), noteKey: 'pw.protected' }];
}
async function unlockPDF(file, pw) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!(await isEncrypted(bytes))) throw new Error(T('err.pdf.notLocked'));
  const r = await qpdf(bytes, ['--password=' + (pw || ''), '--decrypt', '/in.pdf', '/out.pdf']);
  if (!r.out) throw new Error(T('pw.wrong'));
  return [{ name: base(file.name) + '-unlocked.pdf', blob: new Blob([r.out], { type: 'application/pdf' }), noteKey: 'pw.unlocked' }];
}
// Removes what a PDF carries besides its pages: document information
// (author, software, dates), XMP metadata, attachments, scripts, automatic
// actions and comment notes.
async function cleanPDF(file) {
  await lib('pdflib');
  const P = PDFLib, N = k => P.PDFName.of(k);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await loadPdfBytes(bytes, { updateMetadata: false });
  const found = new Set();
  const del = (dict, key, what) => { if (dict && dict.has && dict.has(N(key))) { dict.delete(N(key)); found.add(what); } };
  if (doc.context.trailerInfo.Info) { doc.context.trailerInfo.Info = undefined; found.add('info'); }
  const cat = doc.catalog;
  del(cat, 'Metadata', 'meta'); del(cat, 'OpenAction', 'script'); del(cat, 'AA', 'script'); del(cat, 'PieceInfo', 'meta');
  const names = cat.lookup(N('Names'));
  if (names && names.has) { del(names, 'JavaScript', 'script'); del(names, 'EmbeddedFiles', 'files'); }
  const af = cat.lookup(N('AcroForm'));
  if (af && af.has) del(af, 'XFA', 'script');
  const DROP = new Set(['/FileAttachment', '/Sound', '/Movie', '/Screen', '/RichMedia', '/Text', '/Popup']);
  for (const page of doc.getPages()) {
    del(page.node, 'AA', 'script'); del(page.node, 'PieceInfo', 'meta'); del(page.node, 'Metadata', 'meta');
    const annots = page.node.lookup(N('Annots'));
    if (!annots || !annots.size) continue;
    const keep = [];
    for (let i = 0; i < annots.size(); i++) {
      const a = annots.lookup(i), sub = a && a.lookup && String(a.lookup(N('Subtype')) || '');
      if (DROP.has(sub)) { found.add(sub === '/FileAttachment' ? 'files' : 'notes'); continue; }
      const act = a && a.lookup && a.lookup(N('A'));
      const s2 = act && act.lookup ? String(act.lookup(N('S')) || '') : '';
      if (s2 === '/JavaScript' || s2 === '/Launch') { found.add('script'); continue; }
      if (a && a.has) del(a, 'AA', 'script');
      keep.push(annots.get(i));
    }
    page.node.set(N('Annots'), doc.context.obj(keep));
  }
  // metadata and scripts tucked into pictures, fonts and form fields
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const d = obj instanceof P.PDFStream ? obj.dict : obj instanceof P.PDFDict ? obj : null;
    if (!d) continue;
    del(d, 'Metadata', 'meta'); del(d, 'PieceInfo', 'meta');
    if (String(d.lookup(N('S')) || '') === '/JavaScript') del(d, 'JS', 'script');
  }
  const saved = await doc.save({ useObjectStreams: true, updateFieldAppearances: false });
  const out = await tidyPDF(saved);
  const list = ['info', 'meta', 'files', 'script', 'notes'].filter(k => found.has(k)).map(k => T('pdfclean.' + k));
  return [{ name: base(file.name) + '-clean.pdf', blob: new Blob([out], { type: 'application/pdf' }),
    noteKey: list.length ? 'pdfclean.removed' : 'clean.none', noteVars: { what: list.join(', ') } }];
}

// ---------- OCR: make scans and photos of text searchable ----------
// Tesseract reads the text in the picture (Danish and English) on this device.
// The result is a PDF with the picture as before and the recognised words as
// invisible text on top, so the text can be searched, selected and copied.
let ocrWorker = null, ocrProgress = null;
async function ocrEngine() {
  await lib('tesseract');
  if (!ocrWorker) {
    ocrWorker = await window.Tesseract.createWorker(['dan', 'eng'], 1, {
      workerPath: VENDOR + 'tesseract/worker.min.js',
      corePath: VENDOR + 'tesseract/',
      langPath: VENDOR + 'tesseract/lang',
      workerBlobURL: false, gzip: true,
      logger: m => { if (ocrProgress && m.status === 'recognizing text') ocrProgress(m.progress || 0); }
    });
  }
  return ocrWorker;
}
async function ocrWords(canvas, onPart) {
  const w = await ocrEngine();
  ocrProgress = onPart;
  try {
    const { data } = await w.recognize(canvas, {}, { blocks: true, text: true });
    const words = [];
    for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) for (const wd of l.words || [])
      if (wd.text && wd.text.trim() && wd.confidence > 30) words.push(wd);
    return words;
  } finally { ocrProgress = null; }
}
// Writes words (pixel boxes) as invisible text (render mode 3, as scanners
// do), stretched to each word's width; toPt turns pixels into page units.
function drawWords(page, font, words, toPt) {
  const P = PDFLib, key = page.node.newFontDictionary(font.name, font.ref);
  const ops = [P.pushGraphicsState(), P.beginText(), P.setTextRenderingMode(P.TextRenderingMode.Invisible)];
  for (const wd of words) {
    const text = wd.text.replace(WIN_ANSI, '?');
    const [ax, ay] = toPt(wd.bbox.x0, wd.bbox.y1), [bx, by] = toPt(wd.bbox.x1, wd.bbox.y0);
    const x = Math.min(ax, bx), y = Math.min(ay, by), w = Math.abs(bx - ax), h = Math.abs(by - ay);
    const size = Math.max(1, h * .9), natural = font.widthOfTextAtSize(text, size);
    if (!natural || !w) continue;
    ops.push(P.setFontAndSize(key, size), P.setCharacterSqueeze(Math.max(10, Math.min(500, w / natural * 100))),
      P.setTextMatrix(1, 0, 0, 1, x, y + h * .18), P.showText(font.encodeText(text)));
  }
  ops.push(P.endText(), P.popGraphicsState());
  page.pushOperators(...ops);
}
async function ocrPDF(file, pdf, progress) {
  const doc = await loadPdfBytes(new Uint8Array(await file.arrayBuffer()));
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const pages = doc.getPages();
  let done = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    // pages that already have text are left as they are
    const tc = await page.getTextContent();
    if (tc.items.map(t => t.str).join('').replace(/\s/g, '').length > 20) { progress(i / pdf.numPages); continue; }
    const vp1 = page.getViewport({ scale: 1, rotation: 0 });
    const scale = Math.min(3, 3500 / Math.max(vp1.width, vp1.height));
    const vp = page.getViewport({ scale, rotation: 0 });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const words = await ocrWords(c, f => progress((i - 1 + f) / pdf.numPages));
    drawWords(pages[i - 1], font, words, (px, py) => vp.convertToPdfPoint(px, py));
    if (words.length) done++;
    progress(i / pdf.numPages);
  }
  if (!done) return [{ name: file.name, blob: file.slice(0, file.size, 'application/pdf'), noteKey: 'ocr.none' }];
  const bytes = await doc.save({ useObjectStreams: true });
  return [{ name: base(file.name) + '-ocr.pdf', blob: new Blob([bytes], { type: 'application/pdf' }), noteKey: 'ocr.done', noteVars: { n: done } }];
}
async function ocrImage(file, progress) {
  await lib('pdflib');
  const { img, w, h } = await decodeImage(file);
  const c = drawToCanvas(img, w, h, 3500, '#ffffff');
  const words = await ocrWords(c, f => progress(f * .95));
  const doc = await PDFLib.PDFDocument.create();
  const k = 72 / 150; // the picture at 150 dpi
  const page = doc.addPage([c.width * k, c.height * k]);
  const jpg = await doc.embedJpg(new Uint8Array(await (await canvasToBlob(c, 'image/jpeg', .88)).arrayBuffer()));
  page.drawImage(jpg, { x: 0, y: 0, width: c.width * k, height: c.height * k });
  drawWords(page, await doc.embedFont(PDFLib.StandardFonts.Helvetica), words, (px, py) => [px * k, (c.height - py) * k]);
  const bytes = await doc.save({ useObjectStreams: true });
  return [{ name: base(file.name) + '-ocr.pdf', blob: new Blob([bytes], { type: 'application/pdf' }), noteKey: words.length ? 'ocr.words' : 'ocr.noText', noteVars: { n: words.length } }];
}

const IMG_MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
async function convertImage(file, target, o, progress) {
  if (target === 'clean') return cleanImage(file, o);
  if (target === 'ocr') return ocrImage(file, progress);
  const { img, w, h } = await decodeImage(file);
  const flat = target === 'jpg' || target === 'bmp' || target === 'pdf';
  const c = drawToCanvas(img, w, h, o.maxDim, flat ? '#ffffff' : null);
  const b = base(file.name);
  if (IMG_MIME[target]) return [{ name: `${b}.${target}`, blob: await canvasToBlob(c, IMG_MIME[target], o.quality) }];
  if (target === 'gif') return [{ name: b + '.gif', blob: encodeGIF([{ data: c.getContext('2d').getImageData(0, 0, c.width, c.height).data, delay: 0 }], c.width, c.height) }];
  if (target === 'ico') return [{ name: b + '.ico', blob: await toICO(c) }];
  if (target === 'bmp') return [{ name: b + '.bmp', blob: toBMP(c) }];
  if (target === 'pdf') return [{ name: b + '.pdf', blob: await imagesToPDF([c], o.quality) }];
}
async function convertPDF(file, target, o, progress) {
  if (target === 'split') return splitPDF(file, progress);
  if (target === 'protect') return protectPDF(file, o.password);
  if (target === 'unlock') return unlockPDF(file, o.password);
  if (target === 'clean') return cleanPDF(file);
  await lib('pdfjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js';
  let pdf;
  try { pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise; }
  catch (e) { throw new Error(T(e && e.name === 'PasswordException' ? 'err.pdf.locked' : 'err.pdf.read')); }
  if (target === 'shrink') return shrinkPDF(file, pdf, progress);
  if (target === 'ocr') return ocrPDF(file, pdf, progress);
  const b = base(file.name), out = [], pad = String(pdf.numPages).length;
  if (target === 'txt') {
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const tc = await (await pdf.getPage(i)).getTextContent();
      pages.push(tc.items.map(it => it.str + (it.hasEOL ? '\n' : '')).join(''));
      progress(i / pdf.numPages);
    }
    return [{ name: b + '.txt', blob: new Blob([pages.join('\n\n')], { type: 'text/plain' }) }];
  }
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i), vp1 = page.getViewport({ scale: 1 });
    let scale = 2; if (o.maxDim) scale = Math.min(scale, o.maxDim / Math.max(vp1.width, vp1.height));
    const vp = page.getViewport({ scale }), c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const nm = pdf.numPages > 1 ? `${b}-page-${String(i).padStart(pad, '0')}` : b;
    out.push({ name: `${nm}.${target}`, blob: await canvasToBlob(c, IMG_MIME[target], o.quality) });
    progress(i / pdf.numPages);
  }
  return out;
}
async function convertAudio(file, target, o, progress) {
  const buf = await decodeAudio(file), b = base(file.name);
  progress(.15);
  if (target === 'wav') return [{ name: b + '.wav', blob: toWAV(buf) }];
  return [{ name: b + '.mp3', blob: await toMP3(buf, o.kbps, p => progress(.15 + p * .85)) }];
}
async function convertVideo(file, target, o, progress) {
  if (target === 'mp3' || target === 'wav') return convertAudio(file, target, o, progress);
  const v = await loadVideo(file), b = base(file.name);
  try {
    const dur = isFinite(v.duration) ? v.duration : 1;
    if (target === 'png' || target === 'jpg') {
      await seek(v, Math.min(1, dur / 2));
      const c = drawToCanvas(v, v.videoWidth, v.videoHeight, o.maxDim, '#000');
      return [{ name: `${b}-frame.${target}`, blob: await canvasToBlob(c, IMG_MIME[target], o.quality) }];
    }
    const fps = 10, len = Math.min(dur, o.gifSeconds), n = Math.max(1, Math.floor(len * fps));
    const [w, h] = fit(v.videoWidth, v.videoHeight, Math.min(o.maxDim || 480, 480));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true }), frames = [];
    for (let i = 0; i < n; i++) {
      await seek(v, Math.min(dur - 0.01, i / fps));
      ctx.drawImage(v, 0, 0, w, h);
      frames.push({ data: ctx.getImageData(0, 0, w, h).data, delay: 10 });
      progress((i + 1) / n * .7);
    }
    await new Promise(r => setTimeout(r));
    const gif = encodeGIF(frames, w, h);
    return [{ name: b + '.gif', blob: gif }];
  } finally { URL.revokeObjectURL(v.src); }
}
const CONVERT = { image: (f, t, o, p) => convertImage(f, t, o, p), pdf: convertPDF, audio: convertAudio, video: convertVideo, doc: (f, t, o, p) => convertDoc(f, t, o, p), data: (f, t) => convertData(f, t) };

async function zipOf(files, onProgress) {
  await lib('jszip');
  const z = new JSZip(), used = new Set();
  for (const f of files) {
    let n = f.name, i = 2; while (used.has(n)) n = f.name.replace(/(\.[^.]+)?$/, m => ` (${i++})` + m);
    used.add(n); z.file(n, f.blob);
  }
  return z.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, m => onProgress && onProgress(m.percent / 100));
}

// ---------- state ----------
let tray = [];          // {id, file, kind, sample}
let jobs = [];          // {id, src, target, status, progress, out:{name, blob}, note, error, el, url}
let uid = 0;

function addFiles(list, opts = {}) {
  const added = [];
  for (const file of list) {
    const kind = kindOf(file);
    if (!kind) { toast(T('toast.unsupported', { name: file.name })); continue; }
    const item = { id: ++uid, file, kind };
    tray.push(item); added.push(item);
  }
  renderTray();
  return added;
}
// Tool pages (e.g. /heic-to-jpg/) name the format they convert to.
const PRESET = (document.querySelector('main[data-preset]') || {}).dataset?.preset || '';
// On a tool page, new files go straight to that page's format when they can;
// otherwise the ring opens as usual.
function afterAdd(added, x, y) {
  if (!added.length) return;
  const files = added.map(a => a.file), targets = fileTargets(files);
  // Prices is not in the ring; it lives in the editor. Its page opens the editor with prices marked.
  if (PRESET === 'prices') { const pdfs = files.filter(f => kindOf(f) === 'pdf'); if (pdfs.length && window.LVEditor) { window.LVEditor.open(pdfs, { find: true, preset: 'prices' }); return; } }
  if (PRESET && PRESET !== 'merge' && targets.includes(PRESET)) { runBatch(files, PRESET); return; }
  if (PRESET === 'merge') return; // merge waits until the files are in order; the MERGE button is first and highlighted
  // A short "getting ready" moment first, so the ring doesn't jump at the visitor.
  preparing(files).then(() => openRing({ targets, files, x, y, count: added.length, subtitle: T('ring.file', { n: added.length }), modal: true }));
}
// A small card with a spinner and a filling bar, shown for about a second and a half.
function preparing(files) {
  return new Promise(resolve => {
    document.getElementById('prep')?.remove();
    const el = document.createElement('div');
    el.id = 'prep'; el.className = 'prep'; el.setAttribute('role', 'status');
    const name = files.length === 1 ? files[0].name : '';
    el.innerHTML = `<div class="prep-card"><span class="prep-spin" aria-hidden="true"></span>
      <div class="prep-text"><strong>${esc(T('prep.title', { n: files.length }))}</strong>${name ? `<span class="prep-name">${esc(name)}</span>` : ''}
      <span class="prep-bar" aria-hidden="true"><span></span></span></div></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    // the full moment the first time; returning visitors get a short one
    let seen = false; try { seen = !!localStorage.getItem('lunaverta-prep-seen'); localStorage.setItem('lunaverta-prep-seen', '1'); } catch (e) {}
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.remove(); resolve(); }, 180); }, seen ? 600 : 1500);
  });
}
function renderTray() {
  const t = $('tray');
  t.innerHTML = '';
  if (!tray.length) { t.innerHTML = `<span class="tray-empty">${esc(T('tray.empty'))}</span>`; }
  for (const it of tray) {
    const el = document.createElement('span');
    el.className = 'chip'; el.style.setProperty('--k', kv(KINDS[it.kind].color));
    el.innerHTML = `<span class="dot"></span><span class="nm" title="${esc(it.file.name)}">${esc(it.file.name)}</span><span class="sz">${fmtSize(it.file.size)}</span><button type="button" aria-label="${esc(T('tray.remove', { name: it.file.name }))}">&times;</button>`;
    el.querySelector('button').onclick = () => { tray = tray.filter(x => x !== it); renderTray(); };
    if (tray.length > 1) { // drag chips to set the order, which a merge follows
      el.draggable = true; el.title = T('tray.drag'); el.dataset.id = it.id;
      el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/x-lunaverta-chip', String(it.id)); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('text/x-lunaverta-chip')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
      el.addEventListener('drop', e => {
        const id = +e.dataTransfer.getData('text/x-lunaverta-chip'); if (!id || id === it.id) return;
        e.preventDefault();
        const from = tray.findIndex(x => x.id === id), moved = tray.splice(from, 1)[0];
        const r = el.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
        tray.splice(tray.indexOf(it) + (after ? 1 : 0), 0, moved);
        renderTray();
      });
    }
    t.appendChild(el);
  }
  const targets = fileTargets(tray.map(x => x.file));
  if (PRESET && targets.includes(PRESET)) targets.unshift(...targets.splice(targets.indexOf(PRESET), 1));
  $('targets').hidden = !targets.length;
  const row = $('targetRow'); row.innerHTML = '';
  for (const tg of targets) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tgt' + (tg === PRESET ? ' preset' : ''); b.style.setProperty('--k', kv(OUT[tg].k)); b.textContent = label(tg);
    b.onclick = () => runBatch(tray.map(x => x.file), tg);
    row.appendChild(b);
  }
  $('clearTray').disabled = !tray.length;
}

// ---------- running jobs ----------
function newJob(srcName, target, kindColor) {
  const j = { id: ++uid, srcName, target, status: 'working', progress: 0, k: OUT[target].k };
  jobs.unshift(j); renderJob(j, true); updateFoot();
  return j;
}
let queue = Promise.resolve();
const POOL = 2; let running = 0; const waiting = [];
function schedule(fn) {
  return new Promise((res, rej) => {
    const go = () => { running++; fn().then(res, rej).finally(() => { running--; const n = waiting.shift(); if (n) n(); }); };
    running < POOL ? go() : waiting.push(go);
  });
}
async function finishJob(j, outs) {
  if (outs.length > 1) {
    j.out = { name: `${base(j.srcName)}-${j.target}.zip`, blob: await zipOf(outs) };
    j.noteKey = 'job.zip'; j.noteVars = { n: outs.length };
  } else {
    j.out = outs[0];
    if (outs[0].noteKey) { j.noteKey = outs[0].noteKey; j.noteVars = outs[0].noteVars; }
  }
  if (/^image\//.test(j.out.blob.type)) j.url = URL.createObjectURL(j.out.blob);
  j.status = 'done'; j.progress = 1; renderJob(j); updateFoot();
}
function failJob(j, err) {
  j.status = 'err'; j.error = (err && err.message) || T('job.failed');
  console.error(err); renderJob(j); updateFoot();
}
async function runBatch(files, target) {
  closeRing();
  const o = opts();
  if (target === 'protect' || target === 'unlock') {
    o.password = await askPassword(target);
    if (o.password === null) return;
  }
  const items = files.map(f => ({ f, kind: kindOf(f) })).filter(x => x.kind);
  const ok = items.filter(x => targetsFor(x.f).includes(target));
  const skipped = items.length - ok.length;
  if (target === 'redact' || target === 'prices') { // the editor with the suggestions for sensitive text
    const pdfs = ok.filter(x => x.kind === 'pdf').map(x => x.f);
    if (pdfs.length && window.LVEditor) window.LVEditor.open(pdfs, { find: true, preset: target === 'prices' ? 'prices' : null });
    return;
  }
  if (target === 'edit') { // opens the PDF editor with every selected PDF
    const pdfs = ok.filter(x => x.kind === 'pdf').map(x => x.f);
    const mode = (document.querySelector('main[data-mode]') || {}).dataset?.mode || '';
    if (pdfs.length && window.LVEditor) window.LVEditor.open(pdfs, { redact: mode === 'redact', action: mode });
    return;
  }
  if (target === 'merge') {
    if (!canMerge(ok.map(x => x.kind))) { toast(T('toast.mergeTwo')); return; }
    const j = newJob(`${ok.length} ${T('job.files')}`, 'merge');
    j.label = T('merge.name') + '.pdf'; j.srcLabel = 'PDF';
    schedule(async () => finishJob(j, [{ name: T('merge.name') + '.pdf', blob: await mergeToPDF(ok.map(x => x.f), o, p => setProgress(j, p)) }])).catch(e => failJob(j, e));
    return;
  }
  if (skipped) toast(T('toast.skipped', { n: skipped, t: label(target) }));
  if (!ok.length) return;
  // Images → one merged PDF
  const imgs = ok.filter(x => x.kind === 'image');
  if (target === 'pdf' && o.merge && imgs.length > 1) {
    const j = newJob(`${imgs.length} images`, 'pdf');
    j.label = 'images-merged.pdf';
    schedule(async () => {
      const cs = [];
      for (let i = 0; i < imgs.length; i++) {
        const { img, w, h } = await decodeImage(imgs[i].f);
        cs.push(drawToCanvas(img, w, h, o.maxDim || 2480, '#fff'));
        setProgress(j, (i + 1) / imgs.length * .8);
      }
      await finishJob(j, [{ name: 'images-merged.pdf', blob: await imagesToPDF(cs, o.quality) }]);
    }).catch(e => failJob(j, e));
  }
  for (const x of ok) {
    if (target === 'pdf' && o.merge && imgs.length > 1 && x.kind === 'image') continue;
    const j = newJob(x.f.name, target);
    schedule(async () => {
      const outs = await CONVERT[x.kind](x.f, target, o, p => setProgress(j, p));
      if (!outs || !outs.length) throw new Error(T('job.empty'));
      await finishJob(j, outs);
    }).catch(e => failJob(j, e));
  }
}
function setProgress(j, p) { j.progress = p; const bar = j.el && j.el.querySelector('.bar'); if (bar) { bar.style.strokeDashoffset = 100.5 * (1 - p); j.el.querySelector('.ring-progress').classList.remove('spin'); } const st = j.el && j.el.querySelector('.state'); if (st) st.textContent = Math.round(p * 100) + '%'; }

function renderJob(j, isNew) {
  if (!j.el) { j.el = document.createElement('div'); }
  const el = j.el;
  el.className = 'row ' + j.status; el.style.setProperty('--k', kv(j.k));
  const name = j.out ? j.out.name : (j.label || base(j.srcName) + '.' + (OUT[j.target].tool ? 'pdf' : j.target));
  const srcExt = j.srcLabel || ext(j.srcName) || T('job.files');
  let thumb;
  if (j.status === 'working') thumb = `<svg class="ring-progress spin" viewBox="0 0 36 36" aria-hidden="true"><circle class="trk" cx="18" cy="18" r="16"/><circle class="bar" cx="18" cy="18" r="16" stroke-dasharray="100.5" stroke-dashoffset="${100.5 * (1 - Math.max(.25, j.progress))}"/></svg>`;
  else if (j.url) thumb = `<img src="${j.url}" alt="">`;
  else thumb = esc(j.status === 'err' ? '!' : OUT[j.target].tool ? (ext(name) || 'pdf') : j.target);
  const state = j.status === 'working' ? (j.progress ? Math.round(j.progress * 100) + '%' : T('job.converting')) : j.status === 'done' ? fmtSize(j.out.blob.size) : '';
  const note = j.noteKey ? T(j.noteKey, j.noteVars) : '';
  el.innerHTML = `<div class="thumb">${thumb}</div>
    <div class="info"><span class="fn" title="${esc(name)}">${esc(name)}</span>
    <span class="meta"><span class="route">${esc(srcExt.toUpperCase())} &rarr; <b>${esc(label(j.target))}</b></span><span class="state">${esc(state)}</span>${note ? `<span>${esc(note)}</span>` : ''}${j.error ? `<span class="msg">${esc(j.error)}</span>` : ''}</span></div>
    <div>${j.status === 'done' ? `<button class="btn sm save" type="button">${esc(T(j.saved ? 'job.saved' : 'job.save'))}</button>` : j.status === 'err' ? `<button class="btn sm ghost dismiss" type="button">${esc(T('job.dismiss'))}</button>` : ''}</div>`;
  const sv = el.querySelector('.save'); if (sv) sv.onclick = async () => { if (await saveFile(j.out.name, j.out.blob, sv)) j.saved = true; };
  const dm = el.querySelector('.dismiss'); if (dm) dm.onclick = () => { jobs = jobs.filter(x => x !== j); el.remove(); updateFoot(); };
  if (isNew) $('manifest').prepend(el);
}
function updateFoot() {
  const done = jobs.filter(j => j.status === 'done');
  $('emptyOut').hidden = jobs.length > 0;
  $('saveAll').disabled = done.length < 1;
  $('clearOut').disabled = !jobs.length || jobs.some(j => j.status === 'working');
  const w = jobs.filter(j => j.status === 'working').length;
  $('outCount').textContent = jobs.length ? (w ? T('out.converting', { n: w }) : T('out.ready', { n: done.length })) : '';
}

// ---------- saving ----------
// Saving: where the browser can, a "Save as" window lets the visitor choose
// the folder and name. Elsewhere the file is downloaded as usual (the browser
// then asks where, or uses the Downloads folder, as set up in the browser).
const canPick = typeof window.showSaveFilePicker === 'function' && window.self === window.top;
// Returns a file handle, null if the visitor cancelled, or undefined if the
// browser can't show the window (then download instead).
// The visitor can turn the Save as window off and use normal downloads
// instead (then files show under the browser's download icon).
const ASK_KEY = 'lunaverta-ask-where';
const askWhere = () => { try { return localStorage.getItem(ASK_KEY) !== '0'; } catch (e) { return true; } };
{
  const box = document.getElementById('optAsk'), wrap = document.getElementById('optAskWrap');
  if (box) {
    if (!canPick) wrap.hidden = true; // browsers without the window always download
    box.checked = askWhere();
    wrap.title = T('opt.askTip');
    box.onchange = () => { try { localStorage.setItem(ASK_KEY, box.checked ? '1' : '0'); } catch (e) {} };
  }
}
async function pickTarget(filename, mime) {
  if (!canPick || !askWhere()) return undefined;
  const e = ext(filename);
  try {
    return await window.showSaveFilePicker({ suggestedName: filename, types: e ? [{ description: e.toUpperCase(), accept: { [mime || 'application/octet-stream']: ['.' + e] } }] : undefined });
  } catch (err) { return err && err.name === 'AbortError' ? null : undefined; }
}
async function writeTo(handle, blob) { const w = await handle.createWritable(); await w.write(blob); await w.close(); }
function download(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
async function saveFile(filename, blob, btn) {
  const handle = await pickTarget(filename, blob.type);
  if (handle === null) return false;
  if (handle) { try { await writeTo(handle, blob); } catch (e) { toast(T('save.failed')); return false; } }
  else download(filename, blob);
  if (btn && btn.classList.contains('save')) btn.textContent = T('job.saved');
  toast(T('save.done', { name: (handle && handle.name) || filename }), true, blob);
  return true;
}
$('saveAll').onclick = async () => {
  const done = jobs.filter(j => j.status === 'done');
  if (!done.length) return;
  if (done.length === 1) return saveFile(done[0].out.name, done[0].out.blob, $('saveAll'));
  const b = $('saveAll'); b.disabled = true; b.textContent = T('out.zipping');
  try { const z = await zipOf(done.map(j => j.out)); saveFile('lunaverta-converted.zip', z); }
  catch (e) { toast(e.message); }
  finally { b.textContent = T('out.saveAll'); updateFoot(); }
};
$('clearOut').onclick = () => { jobs.forEach(j => j.url && URL.revokeObjectURL(j.url)); jobs = jobs.filter(j => j.status === 'working'); $('manifest').querySelectorAll('.row:not(.working)').forEach(r => r.remove()); updateFoot(); };
$('clearTray').onclick = () => { tray = []; renderTray(); };

// ---------- the ring ----------
const ring = $('ring'), svg = $('ringSvg'), scrim = $('scrim');
const R = { cx: 160, cy: 160, r0: 54, r1: 148 };
let ringState = null; // {targets, files|null, anchor:{x,y}, hot}
function arc(a0, a1, r0, r1) {
  const p = (r, a) => [R.cx + r * Math.cos(a), R.cy + r * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`;
}
function drawRing(targets, count, subtitle) {
  const n = targets.length, gap = n > 1 ? 0.03 : 0;
  let s = '';
  targets.forEach((t, i) => {
    const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2 - Math.PI / n + gap, a1 = a0 + Math.PI * 2 / n - gap * 2;
    const mid = (a0 + a1) / 2, lr = (R.r0 + R.r1) / 2 + 4;
    const lx = R.cx + lr * Math.cos(mid), ly = R.cy + lr * Math.sin(mid);
    const tx = R.cx + (R.r1 - 12) * Math.cos(mid), ty = R.cy + (R.r1 - 12) * Math.sin(mid);
    s += `<g class="slice" role="menuitem" tabindex="0" data-t="${t}" aria-label="${esc(T('ring.convertTo', { t: label(t) }) + (T('rd.' + t) !== 'rd.' + t ? '. ' + T('rd.' + t) : ''))}" style="--k:${kv(OUT[t].k)}">
      <path d="${n === 1 ? arc(-Math.PI / 2, Math.PI * 1.5 - 0.0001, R.r0, R.r1) : arc(a0, a1, R.r0, R.r1)}"/>
      <circle class="tick" cx="${tx}" cy="${ty}" r="3"/>
      <text class="lab" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central">${esc(label(t))}</text></g>`;
  });
  s += `<g class="hub"><circle cx="${R.cx}" cy="${R.cy}" r="${R.r0 - 6}"/>
    <text class="t1" id="hubT1" x="${R.cx}" y="${R.cy - 6}" text-anchor="middle">${count}</text>
    <text class="t2" id="hubT2" x="${R.cx}" y="${R.cy + 12}" text-anchor="middle">${esc(subtitle)}</text></g>`;
  svg.innerHTML = s;
  svg.querySelectorAll('.slice').forEach(g => {
    g.addEventListener('mouseenter', () => { if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#ring')) g.focus({ preventScroll: true }); setHot(g.dataset.t); });
    g.addEventListener('focus', () => setHot(g.dataset.t));
    g.addEventListener('mouseleave', () => setHot(null));
    g.addEventListener('click', () => pick(g.dataset.t));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(g.dataset.t); } });
  });
}
function setHot(t) {
  if (!ringState) return;
  ringState.hot = t;
  svg.querySelectorAll('.slice').forEach(g => g.classList.toggle('hot', g.dataset.t === t));
  const t2 = $('hubT2'); if (t2) t2.textContent = t ? '→ ' + label(t) : ringState.subtitle;
  ringTip(t);
}
// One line under the ring that says what the option under the pointer does.
const LAST_T = 'lunaverta-last-target';
function ringTip(t) {
  const el = $('ringTip'); if (!el) return;
  let last = null; try { last = localStorage.getItem(LAST_T); } catch (e) {}
  const key = t && 'rd.' + t;
  el.textContent = t ? (T(key) !== key ? T(key) : T('rd.format', { t: label(t) }))
    : last && ringState && ringState.targets.includes(last) ? T('rd.last', { t: label(last) }) : T('rd.pick');
}
function placeRing(x, y) {
  const s = 320, m = 8;
  const left = Math.min(Math.max(m, x - s / 2), innerWidth - s - m), top = Math.min(Math.max(m, y - s / 2), innerHeight - s - m);
  ring.style.left = left + 'px'; ring.style.top = top + 'px';
  ring.classList.toggle('tip-up', top + s + 54 > innerHeight); // no room below: the tip goes above
  ringState.center = { x: left + s / 2, y: top + s / 2 };
}
function openRing({ targets, files, x, y, count, subtitle, modal }) {
  if (!targets.length) return;
  // The format used last time goes first, at the top of the ring.
  let last = null; try { last = localStorage.getItem(LAST_T); } catch (e) {}
  if (last && targets.includes(last)) targets = [last, ...targets.filter(x => x !== last)];
  ringState = { targets, files, hot: null, subtitle };
  drawRing(targets, count, subtitle); ringTip(null);
  placeRing(x, y);
  ring.classList.add('open');
  if (modal) { scrim.classList.add('open'); setTimeout(() => { const f = svg.querySelector('.slice'); f && f.focus({ preventScroll: true }); }, 30); }
}
function closeRing() { ring.classList.remove('open'); scrim.classList.remove('open'); ringState = null; }
function pick(t) { if (!ringState) return; try { localStorage.setItem(LAST_T, t); } catch (e) {} const files = ringState.files; closeRing(); if (files) runBatch(files, t); }
function sliceAt(x, y) {
  if (!ringState || !ringState.center) return null;
  const dx = x - ringState.center.x, dy = y - ringState.center.y, d = Math.hypot(dx, dy);
  if (d < R.r0 || d > R.r1 + 6) return null;
  const n = ringState.targets.length;
  let a = Math.atan2(dy, dx) + Math.PI / 2 + Math.PI / n; a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return ringState.targets[Math.floor(a / (Math.PI * 2 / n)) % n];
}
scrim.addEventListener('click', closeRing);
addEventListener('keydown', e => { if (e.key === 'Escape' && ringState) closeRing(); });
addEventListener('resize', () => ringState && closeRing());

// ---------- drag and drop: ring at the cursor ----------
let dragDepth = 0, dragKinds = null;
const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
function kindsFromDrag(e) {
  const items = [...(e.dataTransfer.items || [])].filter(i => i.kind === 'file');
  return items.map(i => kindOfMime(i.type));
}
addEventListener('dragenter', e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragDepth++;
  // While dragging, the page only shows where to drop; the ring opens after the drop.
  if (dragDepth === 1) { dragKinds = kindsFromDrag(e); $('dock').classList.add('over'); document.documentElement.dataset.drop = T('drop.here'); document.documentElement.classList.add('dragging-files'); }
});
addEventListener('dragover', e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  if (!ringState) return;
  const c = ringState.center, d = Math.hypot(e.clientX - c.x, e.clientY - c.y);
  if (d > R.r1 + 70) placeRing(e.clientX, e.clientY); // the ring follows until you move into it
  const t = sliceAt(e.clientX, e.clientY); if (t !== ringState.hot) setHot(t);
});
addEventListener('dragleave', e => {
  if (!hasFiles(e)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) { $('dock').classList.remove('over'); document.documentElement.classList.remove('dragging-files'); closeRing(); }
});
addEventListener('drop', e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragDepth = 0; $('dock').classList.remove('over'); document.documentElement.classList.remove('dragging-files');
  const files = [...e.dataTransfer.files];
  closeRing();
  if (!files.length) return;
  const added = addFiles(files);
  afterAdd(added, e.clientX, e.clientY);
});

// ---------- picking files ----------
$('pick').onclick = () => $('fileInput').click();
// Settings stay folded away until someone asks for them.
$('optToggle').onclick = () => { const o = $('options'), open = o.hidden; o.hidden = !open; $('optToggle').setAttribute('aria-expanded', String(open)); };
// Remember the last tool page used, and mark it among the shortcuts on the front page.
try {
  if (PRESET) localStorage.setItem('lunaverta-last', location.pathname);
  const last = localStorage.getItem('lunaverta-last');
  const a = last && [...document.querySelectorAll('.pop-grid a')].find(x => x.getAttribute('href') === last);
  if (a) { a.classList.add('recent'); a.insertAdjacentHTML('afterbegin', `<span class="pop-tag" data-i18n="pop.recent">${esc(T('pop.recent'))}</span>`); }
} catch (e) {}
$('fileInput').accept = Object.values(KINDS).flatMap(k => k.exts.map(e => '.' + e)).join(',');
$('fileInput').onchange = e => {
  const added = addFiles([...e.target.files]); e.target.value = '';
  if (!added.length) return;
  const r = $('pick').getBoundingClientRect();
  afterAdd(added, Math.min(innerWidth / 2, r.left + r.width / 2), Math.min(innerHeight / 2 + 40, r.bottom + 170));
};
// Paste files or screenshots straight in
addEventListener('paste', e => { const f = [...(e.clipboardData && e.clipboardData.files || [])]; if (f.length) { addFiles(f); toast(T('toast.pasted', { n: f.length })); } });

// ---------- reference grid ----------
function renderRef() {
  const chip = x => OUT[x] && OUT[x].tool ? `<span class="fmt tool">${esc(T('tgt.' + x))}</span>` : `<span class="fmt">${esc(x.toUpperCase())}</span>`;
  $('refGrid').innerHTML = Object.entries(KINDS).map(([id, k]) => `<div class="kind" style="--k:${kv(k.color)}"><h3>${esc(T('kind.' + id))}</h3>
  <p class="note">${esc(T('note.' + id))}</p>
  <div class="kind-row"><span class="kind-lbl">${esc(T('ref.from'))}</span><span class="fmts from">${k.exts.filter(e => !SAME[e]).map(e => `<span class="fmt">${esc(e.toUpperCase())}</span>`).join('')}</span></div>
  <div class="kind-row"><span class="kind-lbl">${esc(T('ref.to'))}</span><span class="fmts to">${k.targets.map(chip).join('')}</span></div></div>`).join('');
}
renderRef();

// ---------- toast ----------
// ---------- password prompt ----------
function askPassword(target) {
  return new Promise(resolve => {
    const protect = target === 'protect';
    const d = document.createElement('dialog');
    d.className = 'pw-dialog';
    d.innerHTML = `<form method="dialog">
      <h2>${esc(T(protect ? 'pw.titleProtect' : 'pw.titleUnlock'))}</h2>
      <p class="pw-note">${esc(T(protect ? 'pw.noteProtect' : 'pw.noteUnlock'))}</p>
      <label>${esc(T('pw.label'))}<input type="password" name="pw" autocomplete="${protect ? 'new-password' : 'current-password'}" required></label>
      ${protect ? `<label>${esc(T('pw.repeat'))}<input type="password" name="pw2" autocomplete="new-password" required></label>` : ''}
      <label class="pw-show"><input type="checkbox" name="show"> ${esc(T('pw.show'))}</label>
      <p class="pw-err" role="alert" hidden></p>
      <div class="pw-btns"><button type="button" class="btn sm" value="cancel">${esc(T('pw.cancel'))}</button><button type="submit" class="btn sm primary" value="ok">${esc(T(protect ? 'pw.okProtect' : 'pw.okUnlock'))}</button></div>
    </form>`;
    document.body.appendChild(d);
    const f = d.querySelector('form'), err = d.querySelector('.pw-err');
    let answer = null;
    f.show.onchange = () => d.querySelectorAll('input[name^="pw"]').forEach(i => { i.type = f.show.checked ? 'text' : 'password'; });
    d.querySelector('[value="cancel"]').onclick = () => d.close();
    f.onsubmit = e => {
      e.preventDefault();
      const pw = f.pw.value;
      if (!pw) return;
      if (protect && pw !== f.pw2.value) { err.textContent = T('pw.mismatch'); err.hidden = false; f.pw2.focus(); return; }
      answer = pw; d.close();
    };
    d.addEventListener('close', () => { d.remove(); resolve(answer); });
    d.showModal(); f.pw.focus();
  });
}

let toastT;
// A short message at the bottom. ok adds a tick; a blob the browser can show adds an "Open" button.
const VIEWABLE = /^(application\/pdf|image\/|text\/plain|audio\/|video\/)/;
let toastUrl;
function toast(msg, ok, blob) {
  const t = $('toast');
  t.querySelector('.toast-msg').textContent = msg; t.classList.toggle('ok', !!ok);
  t.querySelector('.toast-open')?.remove();
  if (toastUrl) { const u = toastUrl; setTimeout(() => URL.revokeObjectURL(u), 60000); toastUrl = null; }
  if (blob && blob.run) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'toast-open'; b.textContent = blob.label; b.onclick = blob.run;
    t.appendChild(b);
  } else if (blob && VIEWABLE.test(blob.type)) {
    toastUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.className = 'toast-open'; a.href = toastUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = T('save.open');
    t.appendChild(a);
  }
  t.classList.toggle('has-action', !!t.querySelector('.toast-open'));
  t.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), t.classList.contains('has-action') ? 7000 : 3200);
}

// The PDF editor (editor.js) uses these.
window.LVApp = {
  T, esc, lib, VENDOR, WIN_ANSI, base, toast: (m, ok, blob) => toast(m, ok, blob), qpdf, tidyPDF, pickTarget, writeTo, download, loadPdfBytes,
  addResult(srcName, target, outs, saved) { const j = newJob(srcName, target); j.srcLabel = 'PDF'; j.saved = !!saved; finishJob(j, outs).catch(e => failJob(j, e)); }
};
function gifLabels() { document.querySelectorAll('#optGif option').forEach(op => { op.textContent = T('opt.gifN', { n: op.value }); }); }
gifLabels();
renderTray(); updateFoot();
document.addEventListener('lv-lang', () => {
  gifLabels(); renderTray(); renderRef(); updateFoot();
  jobs.forEach(j => renderJob(j));
  if (ringState) closeRing();
  if (!$('saveAll').disabled || $('saveAll').textContent) $('saveAll').textContent = T('out.saveAll');
});

// ---------- shared from another app (Android "Share to LunaVerta") ----------
if (new URLSearchParams(location.search).has('shared') && 'caches' in window) {
  history.replaceState(null, '', location.pathname);
  caches.open('lunaverta-share').then(async c => {
    const keys = await c.keys(), files = [];
    for (const k of keys) { const r = await c.match(k); const b = await r.blob(); files.push(new File([b], decodeURIComponent(r.headers.get('x-name') || 'file'), { type: b.type })); await c.delete(k); }
    if (files.length) { const added = addFiles(files); afterAdd(added, innerWidth / 2, innerHeight / 2); }
  }).catch(() => {});
}

// ---------- installed app: open files from the OS ("Open with LunaVerta") ----------
let launched = false;
if ('launchQueue' in window) {
  launchQueue.setConsumer(async params => {
    if (!params.files || !params.files.length) return;
    launched = true;
    const files = await Promise.all(params.files.map(h => h.getFile()));
    const added = addFiles(files);
    afterAdd(added, innerWidth / 2, innerHeight / 2);
  });
}

addEventListener('appinstalled', () => { toast(T('toast.installed')); });

// ---------- offline support ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // updateViaCache 'none': always fetch sw.js fresh, so new versions are found straight away.
  // Checking for an update is an ordinary request to lunaverta.com; nothing about the visitor is sent.
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(reg => {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {}));
  let refreshing = false;
  // A first visit also gets a controller once the offline copy is ready; only a real update is news.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController || !navigator.serviceWorker.controller) return;
    refreshing = true;
    // Offer the new version now, unless the visitor is in the middle of something (files in the tray or the editor open).
    const busy = tray.length || jobs.length || document.documentElement.classList.contains('ed-open');
    toast(T('toast.updated'), false, busy ? null : { label: T('toast.reload'), run: () => location.reload() });
  });
}
const net = $('net');
const showNet = () => { net.hidden = navigator.onLine; };
addEventListener('online', showNet); addEventListener('offline', showNet); showNet();
})();
