(() => {
'use strict';
// ---------- libraries, loaded on demand ----------
// Self-hosted copies (see scripts/vendor.mjs). Nothing loads from third parties.
const VENDOR = new URL('../vendor/', document.currentScript ? document.currentScript.src : location.href).href;
const LIBS = {
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
  h2c: 'html2canvas.min.js'
};
const loaded = {};
function lib(name) {
  if (!loaded[name]) loaded[name] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = VENDOR + LIBS[name];
    s.onload = res;
    s.onerror = () => { delete loaded[name]; rej(new Error(navigator.onLine ? 'A helper for this conversion failed to load. Reload the page and try again.' : 'This conversion needs a helper that is not saved for offline use yet. Go online once and try again.')); };
    document.head.appendChild(s);
  });
  return loaded[name];
}

// ---------- formats ----------
const KINDS = {
  image: { label: 'Images', color: '--c-image', exts: ['png','jpg','jpeg','webp','gif','bmp','avif','svg','ico','heic','heif'], targets: ['png','jpg','webp','gif','pdf','ico','bmp'], note: 'HEIC photos from iPhones work too. SVGs are rasterised.' },
  pdf:   { label: 'PDF', color: '--c-doc', exts: ['pdf'], targets: ['png','jpg','txt'], note: 'Each page becomes an image. Multi-page files come back as a .zip.' },
  doc:   { label: 'Documents', color: '--c-doc', exts: ['docx','md','markdown','txt','html','htm'], targets: ['pdf','html','md','txt'], note: 'Word to PDF keeps the page layout, fonts, colours, tables, images, headers and footers, and the text stays searchable.' },
  data:  { label: 'Spreadsheets & data', color: '--c-data', exts: ['xlsx','xls','ods','csv','tsv','json'], targets: ['xlsx','csv','json','html','md'], note: 'Workbooks with several sheets give one CSV per sheet.' },
  audio: { label: 'Audio', color: '--c-audio', exts: ['mp3','wav','ogg','oga','opus','flac','m4a','aac','weba'], targets: ['mp3','wav'], note: 'Decoding uses your browser, so formats vary slightly by browser.' },
  video: { label: 'Video', color: '--c-video', exts: ['mp4','webm','mov','m4v','mkv'], targets: ['gif','mp3','wav','png','jpg'], note: 'Make a GIF from the opening seconds, pull the soundtrack, or grab a frame.' }
};
const OUT = {
  png: { k: '--c-image' }, jpg: { k: '--c-image' }, webp: { k: '--c-image' }, gif: { k: '--c-image' }, ico: { k: '--c-image' }, bmp: { k: '--c-image' },
  pdf: { k: '--c-doc' }, html: { k: '--c-doc' }, md: { k: '--c-doc' }, txt: { k: '--c-doc' },
  xlsx: { k: '--c-data' }, csv: { k: '--c-data' }, json: { k: '--c-data' },
  mp3: { k: '--c-audio' }, wav: { k: '--c-audio' }
};
const ORDER = ['png','jpg','webp','gif','pdf','docx','html','md','txt','xlsx','csv','json','mp3','wav','ico','bmp'];
const MIME_KIND = [[/^image\//, 'image'], [/^application\/pdf/, 'pdf'], [/^audio\//, 'audio'], [/^video\//, 'video'],
  [/(spreadsheet|excel|csv|json|tab-separated)/, 'data'], [/(wordprocessingml|markdown|^text\/plain|^text\/html)/, 'doc']];
const SAME = { jpeg: 'jpg', htm: 'html', markdown: 'md' };

const ext = name => { const m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; };
const base = name => (name || 'file').replace(/\.[^.]+$/, '');
function kindOfExt(e) { for (const k in KINDS) if (KINDS[k].exts.includes(e)) return k; return null; }
function kindOf(file) { return kindOfExt(ext(file.name)) || kindOfMime(file.type); }
function kindOfMime(t) { if (!t) return null; for (const [re, k] of MIME_KIND) if (re.test(t)) return k; return null; }
function targetsFor(file) {
  const k = kindOf(file); if (!k) return [];
  const e = SAME[ext(file.name)] || ext(file.name);
  return KINDS[k].targets.filter(t => t !== e);
}
function unionTargets(kinds) {
  const s = new Set(); kinds.forEach(k => k && KINDS[k].targets.forEach(t => s.add(t)));
  return ORDER.filter(t => s.has(t));
}
function fileTargets(files) {
  const s = new Set(); files.forEach(f => targetsFor(f).forEach(t => s.add(t)));
  return ORDER.filter(t => s.has(t));
}
const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const kv = k => `var(${k})`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- settings ----------
const $ = id => document.getElementById(id);
const opts = () => ({
  quality: +$('optQuality').value / 100, maxDim: +$('optSize').value, kbps: +$('optKbps').value,
  gifSeconds: +$('optGif').value, merge: $('optMerge').checked
});
const OPT_IDS = ['optQuality', 'optSize', 'optKbps', 'optGif', 'optMerge'];
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
function canvasToBlob(c, type, q) { return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Your browser cannot write ' + type)), type, q)); }
function fit(w, h, maxDim) { if (!maxDim || Math.max(w, h) <= maxDim) return [w, h]; const s = maxDim / Math.max(w, h); return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))]; }
let heifMod = null;
function heif() {
  if (!heifMod) heifMod = (async () => {
    await lib('heif');
    const res = await fetch(VENDOR + 'libheif.wasm');
    if (!res.ok) throw new Error('The HEIC helper could not be loaded.');
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
  if (!images || !images.length) throw new Error('This HEIC file contains no image LunaVerta can read.');
  const im = images[0], w = im.get_width(), h = im.get_height();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), data = ctx.createImageData(w, h);
  await new Promise((res, rej) => im.display(data, d => d ? res() : rej(new Error('This HEIC photo could not be decoded.'))));
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
    await img.decode().catch(() => { throw new Error('This image could not be read. It may be damaged, or your browser does not support the format.'); });
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
  catch (e) { throw new Error(kindOf(file) === 'video' ? 'This video has no soundtrack your browser can read.' : 'Your browser cannot decode this audio file.'); }
}

// ---------- video ----------
function loadVideo(file) {
  return new Promise((res, rej) => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.src = URL.createObjectURL(file);
    v.onloadeddata = () => res(v);
    v.onerror = () => rej(new Error('Your browser cannot play this video format, so it cannot be converted here.'));
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
const PAGE_SCALE = 2; // about 190 dpi
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
async function docxToPDF(file, title, progress) {
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
    await docx.renderAsync(file, pagesBox, styles, {
      className: 'lvdocx', inWrapper: false, breakPages: true, ignoreLastRenderedPageBreak: true,
      ignoreWidth: false, ignoreHeight: false, experimental: true, useBase64URL: true,
      renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true
    });
    fixSymbolBullets(styles, pagesBox);
    await Promise.all([...pagesBox.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    if (document.fonts) await document.fonts.ready;
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
          const shot = await html2canvas(pg.sec, { scale: PAGE_SCALE, backgroundColor: '#ffffff', logging: false, x: 0, y: part.y, width: pg.w, height: Math.ceil(part.height) });
          img = shot.toDataURL('image/jpeg', .92);
          if (part.alias) shots[part.alias] = img;
        }
        doc.addImage(img, 'JPEG', 0, part.at * .75, wPt, part.height * .75, part.alias ? part.alias + '-' + pg.si : undefined, 'FAST');
        doc.setFont('helvetica', 'normal');
        for (const b of pg.words) {
          if (b.y < part.y || b.y >= part.y + part.height) continue;
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
    try { return [{ name: base(file.name) + '.pdf', blob: await docxToPDF(file, base(file.name), progress) }]; }
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
    let v; try { v = JSON.parse(await file.text()); } catch (err) { throw new Error('This JSON file has a syntax error, so it cannot be turned into a table.'); }
    const wb = XLSX.utils.book_new();
    if (v && !Array.isArray(v) && typeof v === 'object' && Object.values(v).every(Array.isArray)) {
      for (const [k, arr] of Object.entries(v)) XLSX.utils.book_append_sheet(wb, sheetFromArray(arr), k.slice(0, 31) || 'Sheet');
    } else XLSX.utils.book_append_sheet(wb, sheetFromArray(Array.isArray(v) ? v : [v]), 'Sheet1');
    return wb;
  }
  if (e === 'csv' || e === 'tsv') {
    const text = await file.text();
    if (e === 'tsv') { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(text.replace(/\r/g, '').split('\n').filter(Boolean).map(l => l.split('\t'))), 'Sheet1'); return wb; }
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
const IMG_MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
async function convertImage(file, target, o) {
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
  await lib('pdfjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
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
const CONVERT = { image: convertImage, pdf: convertPDF, audio: convertAudio, video: convertVideo, doc: (f, t, o, p) => convertDoc(f, t, o, p), data: (f, t) => convertData(f, t) };

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
    if (!kind) { toast(`${file.name} isn't a format LunaVerta can convert yet.`); continue; }
    const item = { id: ++uid, file, kind };
    tray.push(item); added.push(item);
  }
  renderTray();
  return added;
}
function renderTray() {
  const t = $('tray');
  t.innerHTML = '';
  if (!tray.length) { t.innerHTML = '<span class="tray-empty">No files yet. Drop some here, paste them, or use Choose files.</span>'; }
  for (const it of tray) {
    const el = document.createElement('span');
    el.className = 'chip'; el.style.setProperty('--k', kv(KINDS[it.kind].color));
    el.innerHTML = `<span class="dot"></span><span class="nm" title="${esc(it.file.name)}">${esc(it.file.name)}</span><span class="sz">${fmtSize(it.file.size)}</span><button type="button" aria-label="Remove ${esc(it.file.name)}">&times;</button>`;
    el.querySelector('button').onclick = () => { tray = tray.filter(x => x !== it); renderTray(); };
    t.appendChild(el);
  }
  const targets = fileTargets(tray.map(x => x.file));
  $('targets').hidden = !targets.length;
  const row = $('targetRow'); row.innerHTML = '';
  for (const tg of targets) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tgt'; b.style.setProperty('--k', kv(OUT[tg].k)); b.textContent = tg.toUpperCase();
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
    j.note = `${outs.length} files in a zip`;
  } else j.out = outs[0];
  if (/^image\//.test(j.out.blob.type)) j.url = URL.createObjectURL(j.out.blob);
  j.status = 'done'; j.progress = 1; renderJob(j); updateFoot();
}
function failJob(j, err) {
  j.status = 'err'; j.error = (err && err.message) || 'Something went wrong while converting this file.';
  console.error(err); renderJob(j); updateFoot();
}
function runBatch(files, target) {
  closeRing();
  const o = opts();
  const items = files.map(f => ({ f, kind: kindOf(f) })).filter(x => x.kind);
  const ok = items.filter(x => targetsFor(x.f).includes(target));
  const skipped = items.length - ok.length;
  if (skipped) toast(`${skipped} file${skipped > 1 ? 's' : ''} can't become ${target.toUpperCase()} and ${skipped > 1 ? 'were' : 'was'} skipped.`);
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
      if (!outs || !outs.length) throw new Error('Nothing came out of this conversion.');
      await finishJob(j, outs);
    }).catch(e => failJob(j, e));
  }
}
function setProgress(j, p) { j.progress = p; const bar = j.el && j.el.querySelector('.bar'); if (bar) { bar.style.strokeDashoffset = 100.5 * (1 - p); j.el.querySelector('.ring-progress').classList.remove('spin'); } const st = j.el && j.el.querySelector('.state'); if (st) st.textContent = Math.round(p * 100) + '%'; }

function renderJob(j, isNew) {
  if (!j.el) { j.el = document.createElement('div'); }
  const el = j.el;
  el.className = 'row ' + j.status; el.style.setProperty('--k', kv(j.k));
  const name = j.out ? j.out.name : (j.label || base(j.srcName) + '.' + j.target);
  const srcExt = ext(j.srcName) || 'files';
  let thumb;
  if (j.status === 'working') thumb = `<svg class="ring-progress spin" viewBox="0 0 36 36" aria-hidden="true"><circle class="trk" cx="18" cy="18" r="16"/><circle class="bar" cx="18" cy="18" r="16" stroke-dasharray="100.5" stroke-dashoffset="${100.5 * (1 - Math.max(.25, j.progress))}"/></svg>`;
  else if (j.url) thumb = `<img src="${j.url}" alt="">`;
  else thumb = esc(j.status === 'err' ? '!' : j.target);
  const state = j.status === 'working' ? (j.progress ? Math.round(j.progress * 100) + '%' : 'Converting') : j.status === 'done' ? fmtSize(j.out.blob.size) : '';
  el.innerHTML = `<div class="thumb">${thumb}</div>
    <div class="info"><span class="fn" title="${esc(name)}">${esc(name)}</span>
    <span class="meta"><span class="route">${esc(srcExt.toUpperCase())} &rarr; <b>${esc(j.target.toUpperCase())}</b></span><span class="state">${esc(state)}</span>${j.note ? `<span>${esc(j.note)}</span>` : ''}${j.error ? `<span class="msg">${esc(j.error)}</span>` : ''}</span></div>
    <div>${j.status === 'done' ? '<button class="btn sm save" type="button">Save</button>' : j.status === 'err' ? '<button class="btn sm ghost dismiss" type="button">Dismiss</button>' : ''}</div>`;
  const sv = el.querySelector('.save'); if (sv) sv.onclick = () => saveFile(j.out.name, j.out.blob, sv);
  const dm = el.querySelector('.dismiss'); if (dm) dm.onclick = () => { jobs = jobs.filter(x => x !== j); el.remove(); updateFoot(); };
  if (isNew) $('manifest').prepend(el);
}
function updateFoot() {
  const done = jobs.filter(j => j.status === 'done');
  $('emptyOut').hidden = jobs.length > 0;
  $('saveAll').disabled = done.length < 1;
  $('clearOut').disabled = !jobs.length || jobs.some(j => j.status === 'working');
  const w = jobs.filter(j => j.status === 'working').length;
  $('outCount').textContent = jobs.length ? (w ? `${w} converting` : `${done.length} ready`) : '';
}

// ---------- saving ----------
function saveFile(filename, blob, btn) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  if (btn && btn.classList.contains('save')) btn.textContent = 'Saved';
}
$('saveAll').onclick = async () => {
  const done = jobs.filter(j => j.status === 'done');
  if (!done.length) return;
  if (done.length === 1) return saveFile(done[0].out.name, done[0].out.blob, $('saveAll'));
  const b = $('saveAll'); b.disabled = true; b.textContent = 'Zipping…';
  try { const z = await zipOf(done.map(j => j.out)); saveFile('lunaverta-converted.zip', z); }
  catch (e) { toast(e.message); }
  finally { b.textContent = 'Save all as .zip'; updateFoot(); }
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
    s += `<g class="slice" role="menuitem" tabindex="0" data-t="${t}" aria-label="Convert to ${t.toUpperCase()}" style="--k:${kv(OUT[t].k)}">
      <path d="${n === 1 ? arc(-Math.PI / 2, Math.PI * 1.5 - 0.0001, R.r0, R.r1) : arc(a0, a1, R.r0, R.r1)}"/>
      <circle class="tick" cx="${tx}" cy="${ty}" r="3"/>
      <text class="lab" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central">${t.toUpperCase()}</text></g>`;
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
  const t2 = $('hubT2'); if (t2) t2.textContent = t ? '→ ' + t.toUpperCase() : ringState.subtitle;
}
function placeRing(x, y) {
  const s = 320, m = 8;
  const left = Math.min(Math.max(m, x - s / 2), innerWidth - s - m), top = Math.min(Math.max(m, y - s / 2), innerHeight - s - m);
  ring.style.left = left + 'px'; ring.style.top = top + 'px';
  ringState.center = { x: left + s / 2, y: top + s / 2 };
}
function openRing({ targets, files, x, y, count, subtitle, modal }) {
  if (!targets.length) return;
  ringState = { targets, files, hot: null, subtitle };
  drawRing(targets, count, subtitle);
  placeRing(x, y);
  ring.classList.add('open');
  if (modal) { scrim.classList.add('open'); setTimeout(() => { const f = svg.querySelector('.slice'); f && f.focus({ preventScroll: true }); }, 30); }
}
function closeRing() { ring.classList.remove('open'); scrim.classList.remove('open'); ringState = null; }
function pick(t) { if (!ringState) return; const files = ringState.files; closeRing(); if (files) runBatch(files, t); }
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
  if (dragDepth === 1) {
    dragKinds = kindsFromDrag(e);
    $('dock').classList.add('over');
    const n = dragKinds.length, known = dragKinds.every(Boolean) && n > 0;
    const targets = known ? unionTargets(dragKinds) : [];
    if (targets.length) openRing({ targets, files: null, x: e.clientX, y: e.clientY, count: n, subtitle: n === 1 ? 'file' : 'files' });
  }
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
  if (!dragDepth) { $('dock').classList.remove('over'); closeRing(); }
});
addEventListener('drop', e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragDepth = 0; $('dock').classList.remove('over');
  const files = [...e.dataTransfer.files];
  const t = sliceAt(e.clientX, e.clientY);
  closeRing();
  if (!files.length) return;
  if (t) { runBatch(files, t); return; }
  const added = addFiles(files);
  if (added.length) openRing({ targets: fileTargets(added.map(a => a.file)), files: added.map(a => a.file), x: e.clientX, y: e.clientY, count: added.length, subtitle: added.length === 1 ? 'file' : 'files', modal: true });
});

// ---------- picking files ----------
$('pick').onclick = () => $('fileInput').click();
$('fileInput').accept = Object.values(KINDS).flatMap(k => k.exts.map(e => '.' + e)).join(',');
$('fileInput').onchange = e => {
  const added = addFiles([...e.target.files]); e.target.value = '';
  if (!added.length) return;
  const r = $('pick').getBoundingClientRect();
  openRing({ targets: fileTargets(added.map(a => a.file)), files: added.map(a => a.file), x: Math.min(innerWidth / 2, r.left + r.width / 2), y: Math.min(innerHeight / 2 + 40, r.bottom + 170), count: added.length, subtitle: added.length === 1 ? 'file' : 'files', modal: true });
};
// Paste files or screenshots straight in
addEventListener('paste', e => { const f = [...(e.clipboardData && e.clipboardData.files || [])]; if (f.length) { addFiles(f); toast(`Added ${f.length} pasted file${f.length > 1 ? 's' : ''}.`); } });

// ---------- reference grid ----------
$('refGrid').innerHTML = Object.values(KINDS).map(k => `<div class="kind" style="--k:${kv(k.color)}"><h3>${k.label}</h3>
  <p class="from">From ${k.exts.filter(e => !SAME[e]).map(e => e.toUpperCase()).join(' · ')}</p>
  <p class="to">To <b>${k.targets.map(t => t.toUpperCase()).join(' · ')}</b></p><p class="note">${k.note}</p></div>`).join('');

// ---------- toast ----------
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }

renderTray(); updateFoot();

// ---------- installed app: open files from the OS ("Open with LunaVerta") ----------
let launched = false;
if ('launchQueue' in window) {
  launchQueue.setConsumer(async params => {
    if (!params.files || !params.files.length) return;
    launched = true;
    const files = await Promise.all(params.files.map(h => h.getFile()));
    const added = addFiles(files);
    if (added.length) openRing({ targets: fileTargets(added.map(a => a.file)), files: added.map(a => a.file), x: innerWidth / 2, y: innerHeight / 2, count: added.length, subtitle: added.length === 1 ? 'file' : 'files', modal: true });
  });
}

// ---------- install button ----------
let installEvt = null;
const installBtn = $('install');
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; installBtn.hidden = false; });
installBtn.onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; installBtn.hidden = true; };
addEventListener('appinstalled', () => { installBtn.hidden = true; toast('LunaVerta is installed. You can open files with it from your computer.'); });

// ---------- offline support ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !navigator.serviceWorker.controller) return;
    refreshing = true; toast('LunaVerta was updated. It will use the new version next time you open it.');
  });
}
const net = $('net');
const showNet = () => { net.hidden = navigator.onLine; };
addEventListener('online', showNet); addEventListener('offline', showNet); showNet();
})();
