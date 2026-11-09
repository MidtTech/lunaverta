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
  tesseract: 'tesseract/tesseract.min.js',
  mp4box: 'mp4box.all.min.js',
  mp4mux: 'mp4-muxer.js',
  qr: 'qrcode.js'
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
  image: { color: '--c-image', exts: ['png','jpg','jpeg','webp','gif','bmp','avif','svg','ico','heic','heif'], targets: ['png','jpg','webp','gif','pdf','ocr','ico','bmp','imgedit','clean'] },
  pdf:   { color: '--c-doc', exts: ['pdf'], targets: ['edit','redact','ocr','merge','split','protect','unlock','docx','xlsx','png','jpg'] },
  doc:   { color: '--c-doc', exts: ['docx','md','markdown','txt','html','htm'], targets: ['pdf','html','md','txt'] },
  data:  { color: '--c-data', exts: ['xlsx','xls','ods','csv','tsv','json'], targets: ['xlsx','csv','json','pdf','html','md'] },
  slides: { color: '--c-doc', exts: ['pptx'], targets: ['pdf'] },
  audio: { color: '--c-audio', exts: ['mp3','wav','ogg','oga','opus','flac','m4a','aac','weba'], targets: ['mp3','wav'] },
  video: { color: '--c-video', exts: ['mp4','webm','mov','m4v','mkv'], targets: ['vshrink','gif','mp3','wav','png','jpg'] }
};
const OUT = {
  png: { k: '--c-image' }, jpg: { k: '--c-image' }, webp: { k: '--c-image' }, gif: { k: '--c-image' }, ico: { k: '--c-image' }, bmp: { k: '--c-image' }, clean: { k: '--c-image', tool: true }, imgedit: { k: '--c-image', tool: true }, scan: { k: '--c-doc', tool: true },
  pdf: { k: '--c-doc' }, edit: { k: '--c-doc', tool: true }, redact: { k: '--c-doc', tool: true }, ocr: { k: '--c-doc', tool: true }, prices: { k: '--c-doc', tool: true }, merge: { k: '--c-doc', tool: true }, split: { k: '--c-doc', tool: true }, extract: { k: '--c-doc', tool: true }, shrink: { k: '--c-doc', tool: true }, protect: { k: '--c-doc', tool: true }, unlock: { k: '--c-doc', tool: true },
  html: { k: '--c-doc' }, md: { k: '--c-doc' }, txt: { k: '--c-doc' }, docx: { k: '--c-doc' }, compare: { k: '--c-doc', tool: true },
  xlsx: { k: '--c-data' }, csv: { k: '--c-data' }, json: { k: '--c-data' },
  mp3: { k: '--c-audio' }, wav: { k: '--c-audio' }, vshrink: { k: '--c-video', tool: true },
  altmerge: { k: '--c-doc', tool: true }, blank: { k: '--c-doc', tool: true }, flatten: { k: '--c-doc', tool: true }, grey: { k: '--c-doc', tool: true }, repair: { k: '--c-doc', tool: true },
  meta: { k: '--c-doc', tool: true }, images: { k: '--c-image', tool: true }, nup: { k: '--c-doc', tool: true }, crop: { k: '--c-doc', tool: true }, headfoot: { k: '--c-doc', tool: true }
};
// Tools (merge, split, shrink, clean) are named in words; formats by extension.
const label = t => (OUT[t] && OUT[t].tool ? T('tgt.' + t).toUpperCase() : t.toUpperCase());
const ORDER = ['vshrink','edit','redact','ocr','merge','altmerge','split','extract','shrink','protect','unlock','blank','flatten','grey','repair','meta','images','nup','crop','headfoot','png','jpg','webp','gif','pdf','docx','html','md','txt','xlsx','csv','json','mp3','wav','ico','bmp','imgedit','scan','clean'];
const MIME_KIND = [[/^image\//, 'image'], [/^application\/pdf/, 'pdf'], [/^audio\//, 'audio'], [/^video\//, 'video'],
  [/presentationml/, 'slides'], [/(spreadsheet|excel|csv|json|tab-separated)/, 'data'], [/(wordprocessingml|markdown|^text\/plain|^text\/html)/, 'doc']];
const SAME = { jpeg: 'jpg', htm: 'html', markdown: 'md' };

const ext = name => { const m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; };
const base = name => (name || 'file').replace(/\.[^.]+$/, '');
function kindOfExt(e) { for (const k in KINDS) if (KINDS[k].exts.includes(e)) return k; return null; }
function kindOf(file) { return kindOfExt(ext(file.name)) || kindOfMime(file.type); }
function kindOfMime(t) { if (!t) return null; for (const [re, k] of MIME_KIND) if (re.test(t)) return k; return null; }
// Tools kept out of the ring for a kind, but still used by their own pages
// (Compress PDF, Remove PDF metadata, PDF to text, Remove prices).
const PAGE_ONLY = { pdf: ['shrink', 'clean', 'txt', 'prices', 'compare', 'extract', 'altmerge', 'blank', 'flatten', 'grey', 'repair', 'meta', 'images', 'nup', 'crop', 'headfoot'], image: ['scan'] };
let chainTarget = ''; // set while a finished result is sent on to another tool ("Continue with this file")
function targetsFor(file) {
  const k = kindOf(file); if (!k) return [];
  const e = SAME[ext(file.name)] || ext(file.name);
  const list = KINDS[k].targets.filter(t => t !== e);
  if (PRESET && (PAGE_ONLY[k] || []).includes(PRESET)) list.push(PRESET);
  if (chainTarget && (PAGE_ONLY[k] || []).includes(chainTarget) && !list.includes(chainTarget)) list.push(chainTarget);
  if (k === 'image') list.push('merge'); // images can join a PDF merge
  return list;
}
// Merging needs at least one PDF and at least two PDFs or images in total.
const canMerge = kinds => kinds.includes('pdf') && kinds.filter(k => k === 'pdf' || k === 'image').length > 1;
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
const OPT_IDS = ['optQuality', 'optSize', 'optKbps', 'optGif', 'optMerge', 'optPdfQ', 'optOcr'];
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
// Browsers refuse canvases above a certain size (iPhone and iPad: about 16.7 million pixels; others far more).
// Pictures bigger than that are drawn a little smaller instead of failing; a failed write on a big canvas
// is reported as a memory problem, which is what it almost always is.
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const MAX_AREA = IOS ? 16777216 : 120000000;
function canvasToBlob(c, type, q) { return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error(c.width * c.height > 8e6 ? T('err.memory') : T('err.write', { type }))), type, q)); }
function capArea(w, h) { if (w * h <= MAX_AREA) return [w, h]; const s = Math.sqrt(MAX_AREA / (w * h)) * .999; return [Math.max(1, Math.floor(w * s)), Math.max(1, Math.floor(h * s))]; }
function fit(w, h, maxDim) { if (maxDim && Math.max(w, h) > maxDim) { const s = maxDim / Math.max(w, h); w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s)); } return capArea(w, h); }
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
  if (target === 'pdf') return [{ name: title + '.pdf', blob: await sheetsToPDF(wb, title) }];
}

// ---------- Excel (and CSV, ODS, JSON) to PDF ----------
// Each sheet becomes a table with real, selectable text: the first row as a heading repeated on every page,
// numbers right-aligned, light grid lines. Wide sheets turn the page sideways and shrink the text to fit.
async function sheetsToPDF(wb, title) {
  await lib('jspdf');
  let doc = null;
  const names = wb.SheetNames.filter(n => wb.Sheets[n] && wb.Sheets[n]['!ref']);
  for (const name of names) {
    let rows = sheetRows(wb.Sheets[name]).map(r => r.map(v => String(v ?? '').replace(WIN_ANSI, '?')));
    while (rows.length && rows[rows.length - 1].every(v => !v.trim())) rows.pop();
    if (!rows.length) continue;
    let cols = Math.max(...rows.map(r => r.length));
    while (cols > 1 && rows.every(r => !(r[cols - 1] || '').trim())) cols--;
    rows = rows.map(r => Array.from({ length: cols }, (_, i) => r[i] || ''));
    const isNum = v => /^[-+(]?[\d\s.,]+%?\)?(\s?(kr\.?|DKK|EUR|SEK|NOK|USD|€|\$|£))?$/i.test(v.trim()) && /\d/.test(v) && !/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(v.trim());
    // natural column widths at 10 pt, then fit to the page
    const probe = await newPDF('a4', 'p');
    const natural = Array.from({ length: cols }, (_, c) => Math.min(220, Math.max(28, ...rows.slice(0, 400).map((r, i) => { probe.setFont('helvetica', i ? 'normal' : 'bold'); return probe.getStringUnitWidth(r[c]) * 10 + 10; }))));
    const total = natural.reduce((a, b) => a + b, 0), M = 36;
    const orient = total > 595 - 2 * M ? 'l' : 'p', PW = orient === 'l' ? 842 : 595, PH = orient === 'l' ? 595 : 842, usable = PW - 2 * M;
    const k = Math.min(1, usable / total), size = Math.max(5.5, 10 * k), widths = natural.map(w => w * k);
    const lineH = size * 1.25, pad = 3 * Math.max(k, .6);
    if (!doc) doc = await newPDF('a4', orient); else doc.addPage('a4', orient);
    let y = M;
    const heading = names.length > 1;
    const cellLines = (txt, w) => doc.splitTextToSize(txt, Math.max(4, w - 2 * pad));
    const drawRow = (r, bold) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
      const parts = r.map((v, c) => cellLines(v, widths[c])), h = Math.max(1, ...parts.map(p => p.length)) * lineH + pad * 1.4;
      if (y + h > PH - M - 14) return false;
      let x = M;
      if (bold) { doc.setFillColor(236, 239, 245); doc.rect(M, y, widths.reduce((a, b) => a + b, 0), h, 'F'); }
      parts.forEach((p, c) => {
        const right = !bold && isNum(r[c]);
        p.forEach((ln, i) => doc.text(ln, right ? x + widths[c] - pad : x + pad, y + pad + size * .9 + i * lineH, right ? { align: 'right' } : undefined));
        doc.setDrawColor(205, 210, 220); doc.setLineWidth(.4); doc.rect(x, y, widths[c], h);
        x += widths[c];
      });
      y += h; return true;
    };
    const startPage = () => { y = M; if (heading) { doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(String(name).replace(WIN_ANSI, '?'), M, y + 10); y += 22; } drawRow(rows[0], true); };
    startPage();
    for (const r of rows.slice(1)) {
      if (!drawRow(r, false)) { doc.addPage('a4', orient); startPage(); drawRow(r, false); }
    }
  }
  if (!doc) throw new Error(T('err.sheet.empty'));
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120); const { width, height } = doc.internal.pageSize; doc.text(`${title.replace(WIN_ANSI, '?')} · ${i} / ${n}`, width - 36, height - 20, { align: 'right' }); doc.setTextColor(0); }
  return doc.output('blob');
}

// ---------- PDF to Excel ----------
// Reads the text on each page and rebuilds the table: words on the same line form a row, and the
// gaps that run down the page split it into columns (so right-aligned amounts land in the right column).
// Amounts written as numbers (1.234,50 or 1,234.50) become real numbers that Excel can add up.
function toNumber(v) {
  const t = v.trim().replace(/\s?(kr\.?|DKK|EUR|SEK|NOK|USD|€|\$|£)$/i, '').replace(/^(kr\.?|DKK|EUR|€|\$|£)\s?/i, '').trim();
  if (!/^[-+]?(\d{1,3}([.,  ]\d{3})+|\d+)([.,]\d+)?$/.test(t) || /^0\d/.test(t)) return v;
  let s = t.replace(/[  ]/g, '');
  const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');           // 1.234,50
  else if (lastDot > lastComma && lastComma >= 0) s = s.replace(/,/g, '');        // 1,234.50
  else if (lastComma >= 0) s = /,\d{3}$/.test(s) && s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (/\.\d{3}$/.test(s) && (s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s); return Number.isFinite(n) ? n : v;
}
// Letter positions straight from the page's drawing instructions (pdf-text.js), so two cells close together
// are never glued into one, as pdf.js's own text reading sometimes does. Letters become words; null if unreadable.
async function pageWords(doc, index) {
  try {
    const page = doc.getPage(index), rd = await window.LVPdfText.readPage(doc, page);
    if (!rd || rd.unknown) return null;
    const H = page.getHeight(), gl = rd.glyphs.filter(g => g.upright && !g.hidden && g.ch).sort((a, b) => (b.y0 - a.y0) || a.xL - b.xL);
    const words = [];
    for (const g of gl) {
      const w = words[words.length - 1], y = H - g.y0, h = g.size || 10;
      if (g.ch === ' ' || /\s/.test(g.ch)) { if (w) w.space = true; continue; }
      if (w && Math.abs(w.y - y) < h * .3 && g.xL - (w.x + w.w) < h * .15 && g.xL - (w.x + w.w) > -h * .5 && !w.space) { w.s += g.ch; w.w = g.xR - w.x; }
      else words.push({ s: g.ch, x: g.xL, y, w: g.xR - g.xL, h });
    }
    return words;
  } catch (e) { console.warn('Letter positions unavailable', e); return null; }
}
async function pdfToExcel(file, pdf, title, progress) {
  await lib('xlsx');
  let doc = null;
  try { await loadEditor(); doc = await loadPdfBytes(new Uint8Array(await file.arrayBuffer())); } catch (e) { doc = null; }
  const wb = XLSX.utils.book_new(), all = [];
  let anyText = false;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p), vp = page.getViewport({ scale: 1 });
    let items = (await page.getTextContent()).items.filter(it => it.str && it.str.trim()).map(it => {
      const m = pdfjsLib.Util.transform(vp.transform, it.transform), h = Math.hypot(m[2], m[3]) || 10;
      return { s: it.str, x: m[4], y: m[5], w: it.width * (vp.scale || 1), h };
    }).filter(it => it.w > 0);
    // use the exact letter positions when they account for (nearly) all the text pdf.js sees, and the page isn't turned
    const words = doc && !page.rotate ? await pageWords(doc, p - 1) : null, count = list => list.reduce((n, it) => n + it.s.replace(/\s/g, '').length, 0);
    if (words && words.length && count(words) >= count(items) * .9) items = words;
    if (items.length) anyText = true;
    // lines: items whose baselines are close
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const it of items) { const ln = lines.find(l => Math.abs(l.y - it.y) < Math.min(l.h, it.h) * .45); if (ln) ln.items.push(it); else lines.push({ y: it.y, h: it.h, items: [it] }); }
    lines.sort((a, b) => a.y - b.y);
    // cells: pieces of a line separated by a clear gap
    for (const ln of lines) {
      ln.items.sort((a, b) => a.x - b.x); ln.cells = [];
      for (const it of ln.items) {
        const c = ln.cells[ln.cells.length - 1], gap = c ? it.x - (c.x + c.w) : Infinity;
        if (c && gap < it.h * .45) { c.s += (gap > it.h * .15 && !/\s$/.test(c.s) && !/^\s/.test(it.s) ? ' ' : '') + it.s; c.w = it.x + it.w - c.x; }
        else ln.cells.push({ s: it.s, x: it.x, w: it.w });
      }
    }
    // Columns: cells that start at the same place (or end at the same place, for right-aligned amounts)
    // belong together. Columns that never meet in one row and overlap on the page are then joined.
    const cells = lines.flatMap((ln, r) => ln.cells.map(c => ({ ...c, r })));
    const cluster = vals => { const out = []; for (const v of vals.sort((x, y) => x - y)) { const g = out[out.length - 1]; if (g && v - g.last <= 4) { g.n++; g.sum += v; g.last = v; } else out.push({ n: 1, sum: v, last: v }); } return out.filter(g => g.n >= 2).map(g => ({ v: g.sum / g.n, n: g.n })); };
    const multi = cells.filter(c => lines[c.r].cells.length > 1);
    const lefts = cluster(multi.map(c => c.x)), rights = cluster(multi.map(c => c.x + c.w));
    const near = (list, v) => list.find(a => Math.abs(a.v - v) <= 4);
    let cols = [];
    for (const c of cells) {
      // the edge shared with more cells wins: amounts line up on the right, words on the left
      const l = near(lefts, c.x), rr = near(rights, c.x + c.w);
      const key = l && (!rr || l.n >= rr.n) ? 'L' + l.v.toFixed(1) : rr ? 'R' + rr.v.toFixed(1) : 'X' + c.r + ':' + c.x.toFixed(1);
      let col = cols.find(k => k.key === key); if (!col) cols.push(col = { key, cells: [], rows: new Set(), x1: Infinity, x2: -Infinity });
      col.cells.push(c); col.rows.add(c.r); col.x1 = Math.min(col.x1, c.x); col.x2 = Math.max(col.x2, c.x + c.w);
    }
    const mid = k => k.cells.reduce((n, c) => n + c.x + c.w / 2, 0) / k.cells.length;
    cols.sort((x, y) => mid(x) - mid(y));
    // join the pair that overlaps most first (a heading with the amounts under it), then look again
    for (;;) {
      let best = -1, most = 0;
      for (let i = 0; i + 1 < cols.length; i++) {
        const A = cols[i], B = cols[i + 1], ov = Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
        if (ov > 0 && ov / Math.min(A.x2 - A.x1, B.x2 - B.x1) > most && ![...A.rows].some(r => B.rows.has(r))) { most = ov / Math.min(A.x2 - A.x1, B.x2 - B.x1); best = i; }
      }
      if (best < 0) break;
      const A = cols[best], B = cols[best + 1];
      A.cells.push(...B.cells); B.rows.forEach(r => A.rows.add(r)); A.x1 = Math.min(A.x1, B.x1); A.x2 = Math.max(A.x2, B.x2);
      cols.splice(best + 1, 1);
    }
    const rowsOut = lines.map(() => Array(cols.length).fill(''));
    cols.forEach((k, i) => { for (const c of k.cells.sort((x, y) => x.x - y.x)) rowsOut[c.r][i] = rowsOut[c.r][i] ? rowsOut[c.r][i] + ' ' + c.s.trim() : c.s.trim(); });
    for (const row of rowsOut) all.push(row.map(toNumber));
    if (p < pdf.numPages) all.push([]);
    progress(p / pdf.numPages);
  }
  if (!anyText) throw new Error(T('docx.noText'));
  const ws = XLSX.utils.aoa_to_sheet(all);
  // column widths from the longest text in each column
  const n = Math.max(...all.map(r => r.length));
  ws['!cols'] = Array.from({ length: n }, (_, c) => ({ wch: Math.min(60, Math.max(6, ...all.map(r => String(r[c] ?? '').length + 1))) }));
  XLSX.utils.book_append_sheet(wb, ws, 'PDF');
  return [{ name: title + '.xlsx', blob: new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) }];
}

// ---------- compress video (MP4, MOV) ----------
// The browser's own video decoder and encoder (WebCodecs) re-encode the picture at a lower size and bit rate;
// the sound is copied as it is. MP4Box reads the file, mp4-muxer writes the new one. Nothing leaves the device.
const VSIZES = { small: { side: 1280, bpp: .055 }, medium: { side: 1920, bpp: .075 }, high: { side: 1920, bpp: .11 } };
function askVideoSize() {
  return new Promise(resolve => {
    const d = document.createElement('dialog'); d.className = 'pw-dialog';
    const last = (() => { try { return localStorage.getItem('lunaverta-vsize') || 'medium'; } catch (e) { return 'medium'; } })();
    d.innerHTML = `<form method="dialog"><h2>${esc(T('vs.title'))}</h2>
      ${['small', 'medium', 'high'].map(k => `<label class="pw-show"><input type="radio" name="vs" value="${k}" ${k === last ? 'checked' : ''}> <span><b>${esc(T('vs.' + k))}</b><br><small class="pw-note">${esc(T('vs.' + k + '.d'))}</small></span></label>`).join('')}
      <div class="pw-btns"><button type="button" class="btn sm" value="cancel">${esc(T('pw.cancel'))}</button><button type="submit" class="btn sm primary" value="ok">${esc(T('vs.ok'))}</button></div></form>`;
    d.querySelector('[value="cancel"]').onclick = () => d.close('cancel');
    d.addEventListener('close', () => { const v = d.returnValue === 'ok' ? d.querySelector('input:checked').value : null; if (v) try { localStorage.setItem('lunaverta-vsize', v); } catch (e) {} d.remove(); resolve(v); });
    document.body.appendChild(d); d.showModal();
  });
}
function boxBytes(box) { // a codec description box (avcC, hvcC, vpcC, av1C) without its 8-byte header
  const s = new DataStream(undefined, 0, DataStream.BIG_ENDIAN); box.write(s); return new Uint8Array(s.buffer, 8);
}
async function compressVideo(file, size, progress) {
  if (!('VideoEncoder' in window) || !('VideoDecoder' in window)) throw new Error(T('vs.unsupported'));
  if (!/^(mp4|mov|m4v)$/.test(ext(file.name)) && !/mp4|quicktime/.test(file.type)) throw new Error(T('vs.format'));
  await lib('mp4box'); await lib('mp4mux');
  const preset = VSIZES[size] || VSIZES.medium;
  // read the whole file: tracks, codec details and every sample
  const mp4 = MP4Box.createFile(), samples = {}, buf = await file.arrayBuffer();
  const info = await new Promise((res, rej) => {
    mp4.onError = e => rej(new Error(T('vs.read'))); mp4.onReady = i => res(i);
    buf.fileStart = 0; mp4.appendBuffer(buf); mp4.flush();
    setTimeout(() => rej(new Error(T('vs.read'))), 15000);
  });
  const vt = info.videoTracks[0], at = info.audioTracks[0];
  if (!vt) throw new Error(T('vs.read'));
  for (const t of [vt, at].filter(Boolean)) { samples[t.id] = []; mp4.setExtractionOptions(t.id, null, { nbSamples: Infinity }); }
  mp4.onSamples = (id, u, list) => { samples[id].push(...list); };
  mp4.start(); mp4.flush();
  const trak = mp4.getTrackById(vt.id), entry = trak.mdia.minf.stbl.stsd.entries[0];
  const descBox = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
  const decConfig = { codec: vt.codec.startsWith('vp08') ? 'vp8' : vt.codec, codedWidth: vt.video.width, codedHeight: vt.video.height, ...(descBox ? { description: boxBytes(descBox) } : {}) };
  if (!(await VideoDecoder.isConfigSupported(decConfig).catch(() => ({}))).supported) throw new Error(T('vs.codec'));
  // size and bit rate of the new video
  const srcW = vt.video.width, srcH = vt.video.height, k = Math.min(1, preset.side / Math.max(srcW, srcH));
  const W = Math.max(2, Math.round(srcW * k / 2) * 2), H = Math.max(2, Math.round(srcH * k / 2) * 2);
  const dur = vt.duration / vt.timescale || 1, fps = Math.min(60, Math.max(10, vt.nb_samples / dur || 30));
  const bitrate = Math.round(Math.max(400e3, W * H * fps * preset.bpp));
  let encCodec = null, muxCodec = null;
  for (const [c, m] of [['avc1.640028', 'avc'], ['avc1.4d0028', 'avc'], ['avc1.42001f', 'avc'], ['vp09.00.40.08', 'vp9'], ['av01.0.08M.08', 'av1']]) {
    const sup = await VideoEncoder.isConfigSupported({ codec: c, width: W, height: H, bitrate, framerate: fps }).catch(() => ({}));
    if (sup.supported) { encCodec = c; muxCodec = m; break; }
  }
  if (!encCodec) throw new Error(T('vs.unsupported'));
  // portrait phone videos keep their turn (stored as a matrix, not in the picture)
  const m = vt.matrix || [], rot = m[0] === 0 && m[1] > 0 ? 90 : m[0] < 0 && m[4] < 0 ? 180 : m[0] === 0 && m[1] < 0 ? 270 : 0;
  const aEntry = at ? mp4.getTrackById(at.id).mdia.minf.stbl.stsd.entries[0] : null;
  const aac = at && /^mp4a/.test(at.codec), opus = at && /^opus/i.test(at.codec);
  const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), fastStart: 'in-memory', firstTimestampBehavior: 'offset',
    video: { codec: muxCodec, width: W, height: H, rotation: rot },
    audio: aac || opus ? { codec: aac ? 'aac' : 'opus', numberOfChannels: at.audio.channel_count, sampleRate: at.audio.sample_rate } : undefined });
  let encErr = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { encErr = e; } });
  enc.configure({ codec: encCodec, width: W, height: H, bitrate, framerate: fps, latencyMode: 'quality', ...(muxCodec === 'avc' ? { avc: { format: 'avc' } } : {}) });
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  let n = 0, decErr = null;
  const vs = samples[vt.id], keyEvery = Math.round(fps * 2);
  const dec = new VideoDecoder({
    output: frame => {
      ctx.drawImage(frame, 0, 0, W, H);
      const f2 = new VideoFrame(cv, { timestamp: frame.timestamp, duration: frame.duration || undefined });
      frame.close(); enc.encode(f2, { keyFrame: n % keyEvery === 0 }); f2.close(); n++;
      if (n % 15 === 0) progress(Math.min(.97, n / vs.length));
    }, error: e => { decErr = e; } });
  dec.configure(decConfig);
  for (const s of vs) {
    if (encErr || decErr) break;
    dec.decode(new EncodedVideoChunk({ type: s.is_sync ? 'key' : 'delta', timestamp: Math.round(s.cts * 1e6 / s.timescale), duration: Math.round(s.duration * 1e6 / s.timescale), data: s.data }));
    while (dec.decodeQueueSize > 8 || enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 4));
  }
  await dec.flush().catch(e => { decErr = decErr || e; }); await enc.flush().catch(e => { encErr = encErr || e; });
  dec.close(); enc.close();
  if (decErr || encErr) { console.error(decErr || encErr); throw new Error(T('vs.codec')); }
  // the sound, copied as it is
  if (aac || opus) {
    const desc = aac ? (() => { try { return aEntry.esds.esd.descs[0].descs[0].data; } catch (e) { return null; } })() : null;
    let first = true;
    for (const s of samples[at.id]) {
      const meta = first ? { decoderConfig: { codec: at.codec, sampleRate: at.audio.sample_rate, numberOfChannels: at.audio.channel_count, ...(desc ? { description: desc } : {}) } } : undefined;
      muxer.addAudioChunkRaw(s.data, 'key', Math.round(s.cts * 1e6 / s.timescale), Math.round(s.duration * 1e6 / s.timescale), meta); first = false;
    }
  }
  muxer.finalize();
  const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
  progress(1);
  if (blob.size >= file.size * .95) return [{ name: file.name, blob: file.slice(0, file.size, file.type || 'video/mp4'), noteKey: 'vs.kept' }];
  return [{ name: base(file.name) + '-small.mp4', blob, noteKey: (at && !aac && !opus) ? 'vs.noSound' : 'shrink.saved', noteVars: { p: Math.round((1 - blob.size / file.size) * 100) } }];
}

// ---------- PowerPoint (.pptx) to PDF ----------
// Reads the slides straight from the .pptx (it is a zip of XML) and draws them into a PDF with real text:
// positions, text styles inherited from the slide master and layout, bullets, colours from the theme,
// pictures, simple shapes, tables and groups. Unusual effects (shadows, 3D, charts, SmartArt) are left out.
const EMU = 12700; // EMU per point
async function slidesToPDF(file, progress = () => {}) {
  await Promise.all([lib('jszip'), lib('jspdf')]);
  let zip; try { zip = await JSZip.loadAsync(file); } catch (e) { throw new Error(T('err.pptx')); }
  const text = async p => { const f = zip.file(p); return f ? f.async('string') : null; };
  const parse = s => new DOMParser().parseFromString(s, 'application/xml');
  const kids = (el, n) => (el ? [...el.children].filter(c => c.localName === n) : []);
  const kid = (el, n) => kids(el, n)[0] || null;
  const path = (el, ...ns) => ns.reduce((e, n) => kid(e, n), el);
  const num = (el, a, d = 0) => (el && el.getAttribute(a) !== null ? +el.getAttribute(a) : d);
  const resolve = (base, t) => { const parts = base.split('/').slice(0, -1); for (const seg of t.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); } return parts.join('/'); };
  const rels = async p => { const s = await text(p.replace(/([^/]+)$/, '_rels/$1.rels')); const m = {}; if (s) for (const r of parse(s).documentElement.children) m[r.getAttribute('Id')] = { t: r.getAttribute('TargetMode') === 'External' ? null : resolve(p, r.getAttribute('Target')), type: r.getAttribute('Type') }; return m; };
  const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const pres = parse(await text('ppt/presentation.xml') || '');
  if (!pres.documentElement || pres.documentElement.localName !== 'presentation') throw new Error(T('err.pptx'));
  const sz = path(pres.documentElement, 'sldSz'), PW = num(sz, 'cx', 9144000) / EMU, PH = num(sz, 'cy', 6858000) / EMU;
  const presRels = await rels('ppt/presentation.xml');
  const slideIds = kids(path(pres.documentElement, 'sldIdLst'), 'sldId').map(e => presRels[e.getAttributeNS(RNS, 'id')]).filter(r => r && r.t);
  if (!slideIds.length) throw new Error(T('err.pptx'));
  const cache = {}, load = async p => (cache[p] = cache[p] || (async () => ({ doc: parse(await text(p)), rels: await rels(p), p }))());
  const relOf = (part, type) => Object.values(part.rels).find(r => r.type.endsWith('/' + type));
  // colours: theme scheme, master colour map, and the usual modifiers
  const hex2rgb = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  const toHsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h / 6, s, l]; };
  const fromHsl = ([h, s, l]) => { if (!s) return [l, l, l].map(v => Math.round(v * 255)); const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255)); };
  function colorOf(ctx, el) { // el: a solidFill-like element holding srgbClr / schemeClr / sysClr / prstClr
    if (!el) return null;
    const c = el.children[0]; if (!c) return null;
    let rgb = null;
    if (c.localName === 'srgbClr') rgb = hex2rgb(c.getAttribute('val'));
    else if (c.localName === 'sysClr') rgb = hex2rgb(c.getAttribute('lastClr') || (c.getAttribute('val') === 'window' ? 'FFFFFF' : '000000'));
    else if (c.localName === 'prstClr') rgb = ({ black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], blue: [0, 0, 255], green: [0, 128, 0] })[c.getAttribute('val')] || [0, 0, 0];
    else if (c.localName === 'schemeClr') { let v = c.getAttribute('val'); if (v === 'phClr') v = ctx.phClr || 'tx1'; v = ctx.clrMap[v] || v; rgb = ctx.theme[v] ? hex2rgb(ctx.theme[v]) : [0, 0, 0]; }
    if (!rgb) return null;
    for (const m of c.children) {
      const v = num(m, 'val') / 100000;
      if (m.localName === 'lumMod' || m.localName === 'lumOff') { const h = toHsl(rgb); h[2] = m.localName === 'lumMod' ? h[2] * v : Math.min(1, h[2] + v); rgb = fromHsl(h); }
      else if (m.localName === 'tint') rgb = rgb.map(x => Math.round(x + (255 - x) * (1 - v)));
      else if (m.localName === 'shade') rgb = rgb.map(x => Math.round(x * v));
    }
    return rgb;
  }
  const fillOf = (ctx, spPr) => { if (!spPr) return undefined; if (kid(spPr, 'noFill')) return null; const f = kid(spPr, 'solidFill'); return f ? colorOf(ctx, f) : undefined; };
  // text styles: one level of a list style (lvl1pPr … lvl9pPr) gathered from the whole inheritance chain
  const lvlStyle = (lst, lvl) => (lst ? kid(lst, `lvl${lvl + 1}pPr`) : null);
  function styleFrom(ctx, pPr, st) {
    if (!pPr) return st;
    st = { ...st };
    if (pPr.getAttribute('algn')) st.algn = pPr.getAttribute('algn');
    if (pPr.getAttribute('marL') !== null) st.marL = num(pPr, 'marL') / EMU;
    if (pPr.getAttribute('indent') !== null) st.indent = num(pPr, 'indent') / EMU;
    if (kid(pPr, 'buNone')) st.bullet = null; else if (kid(pPr, 'buChar')) st.bullet = kid(pPr, 'buChar').getAttribute('char'); else if (kid(pPr, 'buAutoNum')) st.bullet = '#';
    const sb = path(pPr, 'spcBef', 'spcPts'); if (sb) st.spcBef = num(sb, 'val') / 100;
    const ls = path(pPr, 'lnSpc', 'spcPct'); if (ls) st.lnSpc = num(ls, 'val') / 100000;
    const d = kid(pPr, 'defRPr'); if (d) st = runFrom(ctx, d, st);
    return st;
  }
  function runFrom(ctx, rPr, st) {
    if (!rPr) return st;
    st = { ...st };
    if (rPr.getAttribute('sz')) st.sz = num(rPr, 'sz') / 100;
    if (rPr.getAttribute('b') !== null) st.b = rPr.getAttribute('b') === '1' || rPr.getAttribute('b') === 'true';
    if (rPr.getAttribute('i') !== null) st.i = rPr.getAttribute('i') === '1' || rPr.getAttribute('i') === 'true';
    const f = kid(rPr, 'solidFill'); if (f) st.color = colorOf(ctx, f);
    const lat = kid(rPr, 'latin'); if (lat) st.font = lat.getAttribute('typeface');
    return st;
  }
  const phOf = sp => { const ph = path(sp, 'nvSpPr', 'nvPr', 'ph') || path(sp, 'nvPicPr', 'nvPr', 'ph') || path(sp, 'nvGraphicFramePr', 'nvPr', 'ph'); return ph ? { type: ph.getAttribute('type') || 'body', idx: ph.getAttribute('idx') } : null; };
  const findPh = (tree, ph, byIdx) => { if (!tree) return null; const all = [...tree.getElementsByTagNameNS('*', 'sp')]; const t = ph.type === 'ctrTitle' ? 'title' : ph.type === 'subTitle' ? 'body' : ph.type; return (byIdx && ph.idx !== null && all.find(s => { const p = phOf(s); return p && p.idx === ph.idx; })) || all.find(s => { const p = phOf(s); return p && (p.type === ph.type || (p.type === 'ctrTitle' ? 'title' : p.type === 'subTitle' ? 'body' : p.type) === t); }) || null; };
  const FONT = st => { const f = (st.font || '').toLowerCase(); return /times|georgia|garamond|cambria|serif|book/.test(f) && !/sans/.test(f) ? 'times' : /courier|mono|consolas/.test(f) ? 'courier' : 'helvetica'; };
  const clean = s => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(WIN_ANSI, '?');
  const pdf = await newPDF([PW, PH], PW > PH ? 'l' : 'p');
  const imgCache = {};
  async function picture(part, rid) {
    const r = part.rels[rid]; if (!r || !r.t) return null;
    if (imgCache[r.t] !== undefined) return imgCache[r.t];
    const f = zip.file(r.t); if (!f) return (imgCache[r.t] = null);
    let blob = await f.async('blob'), e = ext(r.t);
    try {
      if (!/^(jpe?g|png)$/.test(e)) { const { img, w, h } = await decodeNative(blob); const c = drawToCanvas(img, w, h, 2000); blob = await canvasToBlob(c, 'image/png'); e = 'png'; }
      return (imgCache[r.t] = { data: new Uint8Array(await blob.arrayBuffer()), type: /png/.test(e) ? 'PNG' : 'JPEG' });
    } catch (err) { return (imgCache[r.t] = null); }
  }
  // draws one shape tree (slide, layout or master); tf maps child coordinates (for groups)
  async function drawTree(ctx, part, tree, tf, skipPh) {
    for (const el of tree.children) {
      const n = el.localName;
      if (n === 'grpSp') {
        const x = path(el, 'grpSpPr', 'xfrm'); if (!x) continue;
        const o = kid(x, 'off'), e = kid(x, 'ext'), co = kid(x, 'chOff'), ce = kid(x, 'chExt');
        const sx = num(ce, 'cx') ? num(e, 'cx') / num(ce, 'cx') : 1, sy = num(ce, 'cy') ? num(e, 'cy') / num(ce, 'cy') : 1;
        const inner = (px, py, pw, ph) => tf(num(o, 'x') + (px - num(co, 'x')) * sx, num(o, 'y') + (py - num(co, 'y')) * sy, pw * sx, ph * sy);
        await drawTree(ctx, part, el, inner, skipPh);
      } else if (n === 'sp' || n === 'pic' || n === 'cxnSp' || n === 'graphicFrame') {
        const ph = phOf(el);
        if (ph && skipPh) continue; // placeholders on a layout or master only show their prompt text, never on the slide
        await drawShape(ctx, part, el, ph, tf);
      }
    }
  }
  async function drawShape(ctx, part, el, ph, tf) {
    const spPr = kid(el, 'spPr') || kid(el, 'grpSpPr');
    let xfrm = path(spPr, 'xfrm') || kid(el, 'xfrm');
    const lPh = ph ? findPh(ctx.layoutTree, ph, true) : null, mPh = ph ? findPh(ctx.masterTree, ph, false) : null;
    if (!xfrm && lPh) xfrm = path(lPh, 'spPr', 'xfrm');
    if (!xfrm && mPh) xfrm = path(mPh, 'spPr', 'xfrm');
    if (!xfrm) return;
    const o = kid(xfrm, 'off'), e = kid(xfrm, 'ext');
    const [x, y, w, h] = tf(num(o, 'x'), num(o, 'y'), num(e, 'cx'), num(e, 'cy')).map(v => v / EMU);
    if (el.localName === 'pic') {
      const blip = path(el, 'blipFill', 'blip'); const im = blip && await picture(part, blip.getAttributeNS(RNS, 'embed'));
      if (im) try { pdf.addImage(im.data, im.type, x, y, w, h, undefined, 'FAST'); } catch (err) {}
      return;
    }
    if (el.localName === 'graphicFrame') { const tbl = el.getElementsByTagNameNS('*', 'tbl')[0]; if (tbl) drawTable(ctx, tbl, x, y, w, h); return; }
    // fill and outline
    const style = kid(el, 'style');
    let fill = fillOf(ctx, spPr); if (fill === undefined && style && num(path(style, 'fillRef'), 'idx') > 0) fill = colorOf(ctx, path(style, 'fillRef'));
    const ln = kid(spPr, 'ln'); let line = ln ? (kid(ln, 'noFill') ? null : colorOf(ctx, kid(ln, 'solidFill'))) : undefined;
    if (line === undefined && style && num(path(style, 'lnRef'), 'idx') > 0) line = colorOf(ctx, path(style, 'lnRef')); if (line === undefined) line = null;
    const geom = (path(spPr, 'prstGeom') || { getAttribute: () => 'rect' }).getAttribute('prst') || 'rect';
    if (fill || line) {
      if (fill) pdf.setFillColor(...fill); if (line) { pdf.setDrawColor(...line); pdf.setLineWidth(Math.max(.5, num(ln, 'w', 9525) / EMU)); }
      const mode = fill && line ? 'FD' : fill ? 'F' : 'S';
      if (el.localName === 'cxnSp' || geom === 'line') { if (line) pdf.line(x, y, x + w, y + h); }
      else if (geom === 'ellipse') pdf.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, mode);
      else if (geom === 'roundRect') pdf.roundedRect(x, y, w, h, Math.min(w, h) * .16, Math.min(w, h) * .16, mode);
      else pdf.rect(x, y, w, h, mode);
    }
    const body = kid(el, 'txBody'); if (!body) return;
    // the style chain for this shape's text
    const isTitle = ph && (ph.type === 'title' || ph.type === 'ctrTitle');
    const master = isTitle ? path(ctx.masterDoc, 'txStyles', 'titleStyle') : ph ? path(ctx.masterDoc, 'txStyles', 'bodyStyle') : path(ctx.masterDoc, 'txStyles', 'otherStyle');
    const lists = [master, mPh && path(mPh, 'txBody', 'lstStyle'), lPh && path(lPh, 'txBody', 'lstStyle'), kid(body, 'lstStyle')];
    const bodyPrs = [mPh && path(mPh, 'txBody', 'bodyPr'), lPh && path(lPh, 'txBody', 'bodyPr'), kid(body, 'bodyPr')].filter(Boolean);
    const bp = a => { let v = null; for (const b of bodyPrs) if (b.getAttribute(a) !== null) v = b.getAttribute(a); return v; };
    const scale = (() => { const af = path(kid(body, 'bodyPr'), 'normAutofit'); return af && af.getAttribute('fontScale') ? num(af, 'fontScale') / 100000 : 1; })();
    const lI = (bp('lIns') !== null ? +bp('lIns') : 91440) / EMU, rI = (bp('rIns') !== null ? +bp('rIns') : 91440) / EMU, tI = (bp('tIns') !== null ? +bp('tIns') : 45720) / EMU, bI = (bp('bIns') !== null ? +bp('bIns') : 45720) / EMU;
    const anchor = bp('anchor') || (isTitle ? 'ctr' : 't'), wrapW = w - lI - rI;
    const fontColor = style ? colorOf(ctx, path(style, 'fontRef')) : null;
    // lay out the paragraphs into lines of styled words
    const lines = []; let autoNo = 0;
    for (const p of kids(body, 'p')) {
      const pPr = kid(p, 'pPr'), lvl = num(pPr, 'lvl');
      let st = { sz: 18, b: false, i: false, color: fontColor || colorOf(ctx, { children: [{ localName: 'schemeClr', getAttribute: () => 'tx1', children: [] }] }), algn: 'l', marL: 0, indent: 0, bullet: null, spcBef: 0, lnSpc: 1 };
      for (const l of lists) st = styleFrom(ctx, lvlStyle(l, lvl), st);
      if (fontColor) st.color = fontColor; // the shape's own text colour (from its style) wins over the master's
      st = styleFrom(ctx, pPr, st);
      const runs = [];
      for (const r of p.children) {
        if (r.localName === 'r' || r.localName === 'fld') { const t = path(r, 't'); if (t && t.textContent) runs.push({ t: clean(t.textContent), st: runFrom(ctx, kid(r, 'rPr'), st) }); }
        else if (r.localName === 'br') runs.push({ br: true, st });
      }
      const endSz = runFrom(ctx, kid(p, 'endParaRPr'), st).sz;
      const pts = (runs.find(r => !r.br) || { st: { sz: endSz } }).st.sz * scale;
      if (!runs.some(r => r.t && r.t.trim())) { lines.push({ words: [], h: pts * 1.2 * st.lnSpc, before: st.spcBef, st }); autoNo = 0; continue; }
      const bullet = st.bullet === '#' ? `${++autoNo}.` : st.bullet ? (WIN_ANSI.test(st.bullet) ? '•' : st.bullet) : null;
      WIN_ANSI.lastIndex = 0;
      const left = st.marL, first = st.marL + st.indent;
      let line = { words: [], h: 0, before: st.spcBef, st, bullet, bx: first, start: bullet ? left : first }, xw = 0;
      const avail = () => wrapW - line.start;
      for (const r of runs) {
        if (r.br) { lines.push(line); line = { words: [], h: 0, before: 0, st, start: left }; xw = 0; continue; }
        const size = r.st.sz * scale, f = FONT(r.st), style = r.st.b && r.st.i ? 'bolditalic' : r.st.b ? 'bold' : r.st.i ? 'italic' : 'normal';
        pdf.setFont(f, style); pdf.setFontSize(size);
        for (const tok of r.t.split(/(\s+)/)) {
          if (!tok) continue;
          const tw = pdf.getTextWidth(tok);
          if (xw + tw > avail() && xw > 0 && tok.trim()) { lines.push(line); line = { words: [], h: 0, before: 0, st, start: left }; xw = 0; }
          if (!tok.trim() && xw === 0) continue;
          line.words.push({ t: tok, x: xw, w: tw, size, f, style, color: r.st.color }); xw += tw;
          line.h = Math.max(line.h, size * 1.2 * st.lnSpc);
        }
      }
      lines.push(line);
    }
    const total = lines.reduce((s, l) => s + l.before + (l.h || 0), 0);
    let cy = anchor === 'ctr' ? y + (h - total) / 2 : anchor === 'b' ? y + h - bI - total : y + tI;
    for (const l of lines) {
      cy += l.before; if (!l.h) continue;
      const base = cy + l.h * .8;
      const width = l.words.length ? l.words[l.words.length - 1].x + l.words[l.words.length - 1].w : 0;
      const room = wrapW - l.start;
      const off = l.st.algn === 'ctr' ? (room - width) / 2 : l.st.algn === 'r' ? room - width : 0;
      if (l.bullet && l.words.length) { const wd = l.words[0]; pdf.setFont('helvetica', 'normal'); pdf.setFontSize(wd.size); pdf.setTextColor(...(wd.color || [0, 0, 0])); pdf.text(l.bullet, x + lI + l.bx + off, base); }
      for (const wd of l.words) { if (!wd.t.trim()) continue; pdf.setFont(wd.f, wd.style); pdf.setFontSize(wd.size); pdf.setTextColor(...(wd.color || [0, 0, 0])); pdf.text(wd.t, x + lI + l.start + off + wd.x, base); }
      cy += l.h;
    }
  }
  function drawTable(ctx, tbl, x, y, w, h) {
    const cols = kids(path(tbl, 'tblGrid'), 'gridCol').map(c => num(c, 'w') / EMU);
    let ry = y;
    kids(tbl, 'tr').forEach((tr, ri) => {
      const rh = num(tr, 'h') / EMU; let cx = x;
      kids(tr, 'tc').forEach((tc, ci) => {
        const cw = cols[ci] || 60, tcPr = kid(tc, 'tcPr');
        const fill = tcPr ? fillOf(ctx, tcPr) : undefined;
        if (fill) { pdf.setFillColor(...fill); pdf.rect(cx, ry, cw, rh, 'F'); } else if (ri === 0) { pdf.setFillColor(...(ctx.theme.accent1 ? hex2rgb(ctx.theme.accent1) : [70, 90, 160])); pdf.rect(cx, ry, cw, rh, 'F'); }
        pdf.setDrawColor(200, 205, 215); pdf.setLineWidth(.5); pdf.rect(cx, ry, cw, rh, 'S');
        const txt = clean([...tc.getElementsByTagNameNS('*', 'p')].map(p => [...p.getElementsByTagNameNS('*', 't')].map(t => t.textContent).join('')).join('\n'));
        const r0 = tc.getElementsByTagNameNS('*', 'rPr')[0], st = runFrom(ctx, r0, { sz: 18, b: ri === 0, color: ri === 0 && !fill ? [255, 255, 255] : [0, 0, 0] });
        pdf.setFont('helvetica', st.b ? 'bold' : 'normal'); pdf.setFontSize(st.sz); pdf.setTextColor(...(st.color || [0, 0, 0]));
        const linesT = pdf.splitTextToSize(txt, Math.max(4, cw - 10));
        linesT.forEach((t, k) => pdf.text(t, cx + 5, ry + 5 + st.sz * .9 + k * st.sz * 1.15));
        cx += cw;
      });
      ry += rh;
    });
  }
  const bgOf = async (ctx, part) => { const bg = path(part.doc.documentElement, 'cSld', 'bg'); if (!bg) return undefined; const pr = kid(bg, 'bgPr'); if (pr) { const f = kid(pr, 'solidFill'); if (f) return { color: colorOf(ctx, f) }; const bl = path(pr, 'blipFill', 'blip'); if (bl) return { img: await picture(part, bl.getAttributeNS(RNS, 'embed')) }; } const ref = kid(bg, 'bgRef'); if (ref) return { color: colorOf(ctx, ref) }; return undefined; };
  for (const [i, sl] of slideIds.entries()) {
    const slide = await load(sl.t), layout = await load(relOf(slide, 'slideLayout').t), master = await load(relOf(layout, 'slideMaster').t);
    const themeRel = relOf(master, 'theme'), theme = themeRel ? await load(themeRel.t) : null;
    const scheme = {}; if (theme) for (const c of (path(theme.doc.documentElement, 'themeElements', 'clrScheme') || { children: [] }).children) { const v = c.children[0]; scheme[c.localName] = v ? (v.getAttribute('val') && v.localName === 'srgbClr' ? v.getAttribute('val') : v.getAttribute('lastClr') || v.getAttribute('val')) : '000000'; }
    const cm = kid(master.doc.documentElement, 'clrMap'), clrMap = {}; if (cm) for (const a of cm.attributes) clrMap[a.name] = a.value;
    const ctx = { theme: scheme, clrMap, masterDoc: master.doc.documentElement, layoutTree: path(layout.doc.documentElement, 'cSld', 'spTree'), masterTree: path(master.doc.documentElement, 'cSld', 'spTree') };
    if (i) pdf.addPage([PW, PH], PW > PH ? 'l' : 'p');
    const bg = (await bgOf(ctx, slide)) || (await bgOf(ctx, layout)) || (await bgOf(ctx, master));
    if (bg && bg.color) { pdf.setFillColor(...bg.color); pdf.rect(0, 0, PW, PH, 'F'); }
    else if (bg && bg.img) try { pdf.addImage(bg.img.data, bg.img.type, 0, 0, PW, PH, undefined, 'FAST'); } catch (e) {}
    const id = (px, py, pw, ph) => [px, py, pw, ph];
    const showMaster = s => (s.doc.documentElement.getAttribute('showMasterSp') !== '0');
    if (showMaster(slide) && showMaster(layout)) await drawTree(ctx, master, ctx.masterTree, id, true);
    if (showMaster(slide)) await drawTree(ctx, layout, ctx.layoutTree, id, true);
    await drawTree(ctx, slide, path(slide.doc.documentElement, 'cSld', 'spTree'), id, false);
    progress((i + 1) / slideIds.length);
  }
  return [{ name: base(file.name) + '.pdf', blob: pdf.output('blob') }];
}
// ---------- More PDF tools: each has its own page (alternate merge, blank pages, flatten, grey, repair,
// details, pictures, booklet, crop and page size, header and footer) ----------
// A small window of choices, built from a list: radio groups, tick boxes, text fields and selects.
function askOptions(title, fields, okKey = 'opt.go', note = '') {
  return new Promise(resolve => {
    const d = document.createElement('dialog'); d.className = 'pw-dialog opt-dialog';
    const row = f => {
      if (f.type === 'radio') return `<fieldset class="opt-radio"><legend>${esc(f.label || '')}</legend>${f.options.map(([v, l, ds]) => `<label class="pw-show"><input type="radio" name="${f.id}" value="${v}"${v === f.value ? ' checked' : ''}> <span><b>${esc(l)}</b>${ds ? `<br><small class="pw-note">${esc(ds)}</small>` : ''}</span></label>`).join('')}</fieldset>`;
      if (f.type === 'check') return `<label class="pw-show"><input type="checkbox" name="${f.id}"${f.value ? ' checked' : ''}> ${esc(f.label)}</label>`;
      if (f.type === 'select') return `<label>${esc(f.label)}<select name="${f.id}">${f.options.map(([v, l]) => `<option value="${v}"${v === f.value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
      return `<label>${esc(f.label)}<input type="text" name="${f.id}" value="${esc(f.value || '')}" placeholder="${esc(f.ph || '')}" autocomplete="off"></label>`;
    };
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>${note ? `<p class="pw-note">${esc(note)}</p>` : ''}${fields.map(row).join('')}
      <div class="pw-btns"><button type="button" class="btn sm" value="cancel">${esc(T('pw.cancel'))}</button><button type="submit" class="btn sm primary" value="ok">${esc(T(okKey))}</button></div></form>`;
    const form = d.querySelector('form'); let answer = null;
    d.querySelector('[value="cancel"]').onclick = () => d.close();
    form.onsubmit = e => {
      e.preventDefault(); answer = {};
      for (const f of fields) answer[f.id] = f.type === 'check' ? form.elements[f.id].checked : f.type === 'radio' ? (form.querySelector(`input[name="${f.id}"]:checked`) || {}).value : form.elements[f.id].value;
      d.close();
    };
    d.addEventListener('close', () => { d.remove(); resolve(answer); });
    document.body.appendChild(d); d.showModal();
  });
}
const pdfOut = async (doc, name, note) => ({ name, blob: new Blob([await doc.save()], { type: 'application/pdf' }), ...(note || {}) });

// Alternate merge: front pages and back pages scanned as two stacks become one document in the right order.
// One file works too (all fronts first, then all backs).
async function alternateMerge(files, o) {
  await lib('pdflib');
  const docs = await Promise.all(files.slice(0, 2).map(openPdfLib));
  let fronts, backs;
  if (docs.length === 1) { const n = docs[0].getPageCount(), h = Math.ceil(n / 2); fronts = [...Array(h).keys()].map(i => [0, i]); backs = [...Array(n - h).keys()].map(i => [0, h + i]); }
  else { fronts = docs[0].getPageIndices().map(i => [0, i]); backs = docs[1].getPageIndices().map(i => [1, i]); }
  if (o.reversed) backs.reverse();
  const order = []; for (let i = 0; i < Math.max(fronts.length, backs.length); i++) { if (fronts[i]) order.push(fronts[i]); if (backs[i]) order.push(backs[i]); }
  const out = await PDFLib.PDFDocument.create();
  for (const [d, i] of order) out.addPage((await out.copyPages(docs[d], [i]))[0]);
  return [await pdfOut(out, base(files[0].name) + '-merged.pdf')];
}

// Blank pages: a page counts as blank when almost nothing is printed on it (scanner noise and a bare page number are allowed).
async function removeBlankPages(file, pdf, progress) {
  await lib('pdflib');
  const keep = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i), vp = page.getViewport({ scale: 60 / 72 });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const mx = Math.round(c.width * .04), my = Math.round(c.height * .04), d = ctx.getImageData(mx, my, c.width - 2 * mx, c.height - 2 * my).data;
    let ink = 0; for (let k = 0; k < d.length; k += 4) if (d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11 < 200) ink++;
    const words = (await page.getTextContent()).items.map(t => t.str).join('').replace(/[\s\d\-–.,/|]+/g, '');
    if (ink / (d.length / 4) > .0015 || words.length > 0) keep.push(i - 1);
    progress(i / pdf.numPages);
  }
  const removed = pdf.numPages - keep.length;
  if (!removed) return [{ name: file.name, blob: file.slice(0, file.size, 'application/pdf'), noteKey: 'blank.none' }];
  if (!keep.length) throw new Error(T('blank.all'));
  const src = await openPdfLib(file), out = await PDFLib.PDFDocument.create();
  (await out.copyPages(src, keep)).forEach(pg => out.addPage(pg));
  return [await pdfOut(out, base(file.name) + '-no-blanks.pdf', { noteKey: 'blank.removed', noteVars: { n: removed } })];
}

// Flatten: filled-in form fields become ordinary, fixed text on the page.
async function flattenPDF(file) {
  const doc = await openPdfLib(file), form = doc.getForm(), n = form.getFields().length;
  if (!n) return [{ name: file.name, blob: file.slice(0, file.size, 'application/pdf'), noteKey: 'flat.none' }];
  try { form.updateFieldAppearances(); } catch (e) {}
  form.flatten();
  return [await pdfOut(doc, base(file.name) + '-flat.pdf', { noteKey: 'flat.done', noteVars: { n } })];
}

// Repair: qpdf reads damaged PDFs leniently and writes a clean copy.
async function repairPDF(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const r = await qpdf(bytes, ['/in.pdf', '/out.pdf']);
  if (r.out && r.out.length > 100) return [{ name: base(file.name) + '-repaired.pdf', blob: new Blob([r.out], { type: 'application/pdf' }), noteKey: r.rc === 3 ? 'repair.fixed' : 'repair.ok' }];
  try { await lib('pdflib'); const d = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false }); return [await pdfOut(d, base(file.name) + '-repaired.pdf', { noteKey: 'repair.fixed' })]; }
  catch (e) { throw new Error(T('repair.fail')); }
}

// Details (title, author, subject, keywords): read for the window, written back exactly as typed.
async function readPdfInfo(file) {
  await lib('pdflib');
  try { const d = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true, updateMetadata: false }); return { title: d.getTitle() || '', author: d.getAuthor() || '', subject: d.getSubject() || '', keywords: d.getKeywords() || '' }; }
  catch (e) { return { title: '', author: '', subject: '', keywords: '' }; }
}
async function editMetadata(file, m) {
  await lib('pdflib');
  let doc; try { doc = await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { updateMetadata: false }); } catch (e) { doc = await openPdfLib(file); }
  doc.setTitle(m.title || '', { showInWindowTitleBar: !!m.title }); doc.setAuthor(m.author || ''); doc.setSubject(m.subject || '');
  doc.setKeywords((m.keywords || '').split(/[,;]\s*/).filter(Boolean));
  if (m.strip) { doc.setCreator(''); doc.setProducer(''); const info = doc.getInfoDict(); info.delete(PDFLib.PDFName.of('CreationDate')); info.delete(PDFLib.PDFName.of('ModDate')); }
  return [await pdfOut(doc, file.name)];
}

// Pictures: every picture in the PDF saved as its own file (photos as JPG, the rest as PNG), in one .zip.
async function extractImages(file, pdf, progress) {
  const outs = [], seen = new Set(), b = base(file.name);
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i), ops = await page.getOperatorList();
    let k = 0;
    for (let j = 0; j < ops.fnArray.length; j++) {
      if (ops.fnArray[j] !== pdfjsLib.OPS.paintImageXObject && ops.fnArray[j] !== pdfjsLib.OPS.paintJpegXObject) continue;
      const name = ops.argsArray[j][0]; if (seen.has(name)) continue; seen.add(name);
      const img = await new Promise(res => { const store = name.startsWith('g_') ? page.commonObjs : page.objs; try { store.get(name, res); } catch (e) { res(null); } setTimeout(() => res(null), 4000); });
      if (!img || !img.width || img.width * img.height < 1600) continue; // tiny bits (lines, dots) are not pictures
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d');
      if (img.bitmap) ctx.drawImage(img.bitmap, 0, 0);
      else if (img.data) {
        const id = ctx.createImageData(img.width, img.height), src = img.data, dst = id.data, px = img.width * img.height;
        if (src.length === px * 4) dst.set(src);
        else if (src.length === px * 3) for (let q = 0, r = 0; q < px; q++) { dst[r++] = src[q * 3]; dst[r++] = src[q * 3 + 1]; dst[r++] = src[q * 3 + 2]; dst[r++] = 255; }
        else { const row = Math.ceil(img.width / 8); for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) { const on = (src[y * row + (x >> 3)] >> (7 - (x & 7))) & 1, v = on ? 255 : 0, r = (y * img.width + x) * 4; dst[r] = dst[r + 1] = dst[r + 2] = v; dst[r + 3] = 255; } }
        ctx.putImageData(id, 0, 0);
      } else continue;
      k++;
      const photo = img.width * img.height > 90000 && !(img.data && img.data.length === img.width * img.height * 4);
      outs.push({ name: `${b}-p${i}-${k}.${photo ? 'jpg' : 'png'}`, blob: await canvasToBlob(c, photo ? 'image/jpeg' : 'image/png', .92) });
    }
    progress(i / pdf.numPages);
  }
  if (!outs.length) throw new Error(T('img.none'));
  return outs;
}

// Booklet and several pages per sheet. Booklet: A4 sheets folded in the middle, pages in printing order
// (print on both sides, flip on the short edge). 2 or 4 pages on one A4 side otherwise.
async function nupPDF(file, mode) {
  const src = await openPdfLib(file), out = await PDFLib.PDFDocument.create();
  const pages = await out.embedPages(src.getPages());
  const A4 = [595.28, 841.89], M = 14;
  const place = (sheet, ep, x, y, w, h) => { if (!ep) return; const k = Math.min((w - 2 * M) / ep.width, (h - 2 * M) / ep.height); const pw = ep.width * k, ph = ep.height * k; sheet.drawPage(ep, { x: x + (w - pw) / 2, y: y + (h - ph) / 2, width: pw, height: ph }); };
  if (mode === 'booklet') {
    const n = Math.ceil(pages.length / 4) * 4, list = [...pages, ...Array(n - pages.length).fill(null)];
    for (let i = 0; i < n / 2; i += 2) {
      for (const [l, r] of [[list[n - 1 - i], list[i]], [list[i + 1], list[n - 2 - i]]]) {
        const sh = out.addPage([A4[1], A4[0]]); place(sh, l, 0, 0, A4[1] / 2, A4[0]); place(sh, r, A4[1] / 2, 0, A4[1] / 2, A4[0]);
      }
    }
  } else if (mode === '2') {
    for (let i = 0; i < pages.length; i += 2) { const sh = out.addPage([A4[1], A4[0]]); place(sh, pages[i], 0, 0, A4[1] / 2, A4[0]); place(sh, pages[i + 1], A4[1] / 2, 0, A4[1] / 2, A4[0]); }
  } else {
    for (let i = 0; i < pages.length; i += 4) { const sh = out.addPage(A4), w = A4[0] / 2, h = A4[1] / 2; [[0, h], [w, h], [0, 0], [w, 0]].forEach(([x, y], k) => place(sh, pages[i + k], x, y, w, h)); }
  }
  return [await pdfOut(out, base(file.name) + (mode === 'booklet' ? '-booklet.pdf' : `-${mode}up.pdf`))];
}

// Crop: white margins trimmed automatically (the page shows only what is printed, plus a little room),
// or every page put on one paper size (A4 or Letter), scaled to fit.
async function cropPDF(file, pdf, mode, progress) {
  const doc = await openPdfLib(file), pgs = doc.getPages();
  if (mode === 'trim') {
    for (let i = 0; i < pgs.length; i++) {
      const page = await pdf.getPage(i + 1), vp = page.getViewport({ scale: 1 });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const d = ctx.getImageData(0, 0, c.width, c.height).data; let x1 = c.width, y1 = c.height, x2 = -1, y2 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const k = (y * c.width + x) * 4; if (d[k] < 245 || d[k + 1] < 245 || d[k + 2] < 245) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; } }
      if (x2 >= 0) {
        const pad = 18, [ax, ay] = vp.convertToPdfPoint(Math.max(0, x1 - pad), Math.max(0, y1 - pad)), [bx, by] = vp.convertToPdfPoint(Math.min(c.width, x2 + pad), Math.min(c.height, y2 + pad));
        const X = Math.min(ax, bx), Y = Math.min(ay, by); pgs[i].setCropBox(X, Y, Math.abs(bx - ax), Math.abs(by - ay)); pgs[i].setMediaBox(X, Y, Math.abs(bx - ax), Math.abs(by - ay));
      }
      progress((i + 1) / pgs.length);
    }
    return [await pdfOut(doc, base(file.name) + '-cropped.pdf')];
  }
  const size = mode === 'letter' ? [612, 792] : [595.28, 841.89], out = await PDFLib.PDFDocument.create(), eps = await out.embedPages(pgs);
  eps.forEach((ep, i) => {
    const rot = (pgs[i].getRotation().angle % 360 + 360) % 360, turned = rot === 90 || rot === 270, w = turned ? ep.height : ep.width, h = turned ? ep.width : ep.height;
    const [W, H] = w > h ? [size[1], size[0]] : size, sh = out.addPage([W, H]), k = Math.min(W / w, H / h), pw = w * k, ph = h * k;
    if (!turned) sh.drawPage(ep, { x: (W - pw) / 2, y: (H - ph) / 2, width: pw, height: ph });
    else sh.drawPage(ep, { x: rot === 90 ? (W + pw) / 2 : (W - pw) / 2, y: rot === 90 ? (H - ph) / 2 : (H + ph) / 2, width: ph, height: pw, rotate: PDFLib.degrees(rot === 90 ? 90 : 270) });
    progress((i + 1) / eps.length);
  });
  return [await pdfOut(out, base(file.name) + (mode === 'letter' ? '-letter.pdf' : '-a4.pdf'))];
}

// Header and footer: the same line at the top and/or bottom of every page, with {page}, {pages}, {date} and {name}.
async function headerFooter(file, h) {
  const doc = await openPdfLib(file), font = await doc.embedFont(PDFLib.StandardFonts.Helvetica), pgs = doc.getPages(), size = +h.size || 10;
  const lg = document.documentElement.lang || 'en', date = new Date().toLocaleDateString(lg === 'en' ? 'en-GB' : lg === 'no' ? 'nb-NO' : lg);
  const fill = t => String(t || '').replace(/\{page\}/g, '\u0001').replace(/\{pages\}/g, pgs.length).replace(/\{date\}/g, date).replace(/\{name\}/g, base(file.name));
  pgs.forEach((pg, i) => {
    if (h.skipFirst && i === 0) return;
    const { x: bx, y: by, width: W, height: H } = pg.getCropBox();
    for (const [txt, top] of [[h.header, true], [h.footer, false]]) {
      const t = fill(txt).replace('\u0001', String(i + 1)).replace(new RegExp(WIN_ANSI.source, 'g'), '?'); if (!t.trim()) continue;
      const w = font.widthOfTextAtSize(t, size), x = h.align === 'left' ? bx + 36 : h.align === 'right' ? bx + W - 36 - w : bx + (W - w) / 2;
      pg.drawText(t, { x, y: top ? by + H - 24 - size * .8 : by + 22, size, font, color: PDFLib.rgb(.25, .25, .3) });
    }
  });
  return [await pdfOut(doc, base(file.name) + '-header.pdf')];
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
// "1-3, 5, 8-" → [[1,3],[5,5],[8,Infinity]]; null if it can't be read
function parsePages(text) {
  const parts = String(text).replace(/[–—]/g, '-').split(/[,;\s]+/).filter(Boolean), out = [];
  for (const p of parts) {
    const m = /^(\d+)?-(\d+)?$/.exec(p) || /^(\d+)$/.exec(p);
    if (!m) return null;
    if (m.length === 2) { out.push([+m[1], +m[1]]); continue; }
    if (!m[1] && !m[2]) return null;
    out.push([m[1] ? +m[1] : 1, m[2] ? +m[2] : Infinity]);
  }
  return out.length ? out : null;
}
function askPages() {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'pw-dialog';
    d.innerHTML = `<form method="dialog">
      <h2>${esc(T('ex.title'))}</h2>
      <p class="pw-note">${esc(T('ex.note'))}</p>
      <label>${esc(T('ex.label'))}<input name="pages" inputmode="numeric" autocomplete="off" placeholder="1-3, 5" required></label>
      <p class="pw-err" role="alert" hidden></p>
      <div class="pw-btns"><button type="button" class="btn sm" value="cancel">${esc(T('pw.cancel'))}</button><button type="submit" class="btn sm primary" value="ok">${esc(T('ex.ok'))}</button></div>
    </form>`;
    document.body.appendChild(d);
    const f = d.querySelector('form'), err = d.querySelector('.pw-err');
    let answer = null;
    d.querySelector('[value="cancel"]').onclick = () => d.close();
    f.onsubmit = e => {
      e.preventDefault();
      const r = parsePages(f.pages.value);
      if (!r) { err.textContent = T('ex.bad'); err.hidden = false; f.pages.focus(); return; }
      answer = r; d.close();
    };
    d.addEventListener('close', () => { d.remove(); resolve(answer); });
    d.showModal(); f.pages.focus();
  });
}
// A new PDF with only the chosen pages, in the order they were typed.
async function extractPages(file, ranges, progress) {
  const src = await openPdfLib(file), n = src.getPageCount(), idx = [];
  for (const [a, b] of ranges) for (let i = a; i <= Math.min(b, n); i++) if (i >= 1) idx.push(i - 1);
  if (!idx.length) throw new Error(T('ex.none', { n }));
  src.getPages().forEach(keepUsedImages);
  const out = await PDFLib.PDFDocument.create();
  (await out.copyPages(src, idx)).forEach(p => out.addPage(p));
  progress(1);
  return [{ name: `${base(file.name)}-${T('ex.name')}.pdf`, blob: new Blob([await out.save()], { type: 'application/pdf' }), noteKey: 'ex.kept', noteVars: { n: idx.length, total: n } }];
}
// Split: one file per page, a file for every N pages, or parts that stay under a size (for e-mail).
// For the size, each page's own size is measured and pages are grouped while the sum stays under the limit;
// pages share fonts and pictures, so the real parts come out a little smaller than the sum.
async function splitPDF(file, progress, o = {}) {
  const src = await openPdfLib(file), n = src.getPageCount(), b = base(file.name), outs = [];
  src.getPages().forEach(keepUsedImages);
  const save = async idx => { const d = await PDFLib.PDFDocument.create(); (await d.copyPages(src, idx)).forEach(pg => d.addPage(pg)); return d.save(); };
  let groups;
  if (o.mode === 'n') { const k = Math.max(1, parseInt(o.n, 10) || 1); groups = []; for (let i = 0; i < n; i += k) groups.push([...Array(Math.min(k, n - i)).keys()].map(j => i + j)); }
  else if (o.mode === 'size') {
    const limit = Math.max(0.1, parseFloat(String(o.mb).replace(',', '.')) || 10) * 1024 * 1024, sizes = [];
    for (let i = 0; i < n; i++) { sizes.push((await save([i])).length); progress(0.5 * (i + 1) / n); }
    groups = []; let cur = [], sum = 0;
    for (let i = 0; i < n; i++) { if (cur.length && sum + sizes[i] > limit) { groups.push(cur); cur = []; sum = 0; } cur.push(i); sum += sizes[i]; }
    if (cur.length) groups.push(cur);
  } else groups = [...Array(n).keys()].map(i => [i]);
  const pad = String(groups.length).length, single = groups.every(g => g.length === 1);
  for (const [k, g] of groups.entries()) {
    const name = single ? `${b}-${String(g[0] + 1).padStart(String(n).length, '0')}.pdf` : `${b}-${String(k + 1).padStart(pad, '0')}-p${g[0] + 1}-${g[g.length - 1] + 1}.pdf`;
    outs.push({ name, blob: new Blob([await save(g)], { type: 'application/pdf' }) });
    progress((o.mode === 'size' ? 0.5 : 0) + (o.mode === 'size' ? 0.5 : 1) * (k + 1) / groups.length);
  }
  return outs;
}
// Redraw every page as a compact image with an invisible text layer, so the
// smaller file can still be searched and copied from. Keeps the original if
// that turns out smaller.
async function shrinkPDF(file, pdf, progress, grey = false) {
  await lib('jspdf');
  let doc;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 125 / 72 });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    if (grey) { const id = ctx.getImageData(0, 0, c.width, c.height), d = id.data; for (let k = 0; k < d.length; k += 4) { const v = Math.round(d[k] * .299 + d[k + 1] * .587 + d[k + 2] * .114); d[k] = d[k + 1] = d[k + 2] = v; } ctx.putImageData(id, 0, 0); }
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
  if (grey) return [{ name: base(file.name) + '-grey.pdf', blob }];
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
// Tesseract reads the text in the picture on this device: the page's language
// (or the one chosen under settings) together with English. Only that language's
// data (about 2 MB) is fetched, the first time, and then kept for offline use.
// English and Danish pages read Danish and English, as before.
// The result is a PDF with the picture as before and the recognised words as
// invisible text on top, so the text can be searched, selected and copied.
let ocrWorker = null, ocrProgress = null, ocrLangs = '';
const OCR_FOR_PAGE = { da: 'dan', en: 'dan', sv: 'swe', no: 'nor', de: 'deu', es: 'spa', fr: 'fra' };
function ocrLanguages() {
  const pick = ($('optOcr') || {}).value || 'auto';
  const main = pick === 'auto' ? (OCR_FOR_PAGE[document.documentElement.lang] || 'dan') : pick;
  return main === 'eng' ? ['eng'] : [main, 'eng'];
}
async function ocrEngine() {
  await lib('tesseract');
  const langs = ocrLanguages();
  if (ocrWorker && ocrLangs !== langs.join('+')) { try { await ocrWorker.terminate(); } catch (e) {} ocrWorker = null; }
  if (!ocrWorker) {
    ocrLangs = langs.join('+');
    ocrWorker = await window.Tesseract.createWorker(langs, 1, {
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
  if (target === 'imgedit') return editImage(file, o.img);
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
// ---------- Compress, resize or crop pictures ----------
const IMG_OUT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const sameFormat = file => { const e = SAME[ext(file.name)] || ext(file.name); return IMG_OUT[e] ? e : 'jpg'; };
// The size a picture comes out at: s.size is 'orig', a fraction (0.75) or 'w' with s.width pixels; never larger than it is.
function outSize(w, h, s) {
  let k = 1;
  if (s.size === 'w' && s.width) k = Math.min(1, s.width / w);
  else if (s.size !== 'orig') k = +s.size;
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
}
async function renderEdited(img, w, h, s, crop, fmt) {
  const r = crop || { x: 0, y: 0, w, h };
  const [ow, oh] = capArea(...outSize(r.w, r.h, s));
  const c = document.createElement('canvas'); c.width = ow; c.height = oh;
  const x = c.getContext('2d');
  if (fmt === 'jpg') { x.fillStyle = '#fff'; x.fillRect(0, 0, ow, oh); }
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, ow, oh);
  return { blob: await canvasToBlob(c, IMG_OUT[fmt], fmt === 'png' ? undefined : s.quality), w: ow, h: oh };
}
async function editImage(file, s) {
  const { img, w, h } = await decodeImage(file);
  const crop = s.crop && s.cropFile === file ? s.crop : null, fmt = s.format === 'same' ? sameFormat(file) : s.format;
  const out = await renderEdited(img, w, h, s, crop, fmt);
  const b = base(file.name), resized = s.size !== 'orig';
  // nothing cropped or resized, same format, and it didn't get smaller: keep the original
  if (!crop && !resized && fmt === (SAME[ext(file.name)] || ext(file.name)) && out.blob.size >= file.size) return [{ name: file.name, blob: file, noteKey: 'im.kept' }];
  const name = `${b}-${crop ? 'cropped' : resized ? 'resized' : 'small'}.${fmt}`;
  return [{ name, blob: out.blob, noteKey: out.blob.size < file.size ? 'im.smaller' : undefined, noteVars: { p: Math.round((1 - out.blob.size / file.size) * 100) } }];
}
function askImage(files) {
  return new Promise(async resolve => {
    if (!files.length) return resolve(null);
    const mode = (document.querySelector('main[data-mode]') || {}).dataset?.mode || '';
    const one = files.length === 1, first = files[0];
    let pic;
    try { pic = await decodeImage(first); } catch (e) { toast(e.message); return resolve(null); }
    const { img, w, h } = pic;
    const s = { size: mode === 'resize' ? '0.5' : 'orig', width: Math.round(w / 2), format: 'same', quality: mode === 'compress' ? 0.7 : 0.82 };
    let crop = { x: 0, y: 0, w, h }, aspect = null;
    const d = document.createElement('dialog');
    d.className = 'pw-dialog img-dialog';
    const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
    d.innerHTML = `<form method="dialog">
      <h2>${esc(T('im.title'))}</h2>
      <div class="im-stage"><canvas class="im-pic"></canvas>${one ? '<div class="im-box"><i data-c="nw"></i><i data-c="ne"></i><i data-c="sw"></i><i data-c="se"></i></div>' : ''}</div>
      ${one ? `<div class="im-row im-crop"><span class="im-lbl">${esc(T('im.crop'))}</span>
        <button type="button" data-a="0" aria-pressed="true">${esc(T('im.whole'))}</button><button type="button" data-a="free" aria-pressed="false">${esc(T('im.free'))}</button><button type="button" data-a="1" aria-pressed="false">${esc(T('im.square'))}</button><button type="button" data-a="1.3333" aria-pressed="false">4:3</button><button type="button" data-a="1.7778" aria-pressed="false">16:9</button></div>
        <p class="pw-note im-hint" hidden>${esc(T('im.cropHint'))}</p>` : `<p class="pw-note">${esc(T('im.cropOne', { n: files.length }))}</p>`}
      <div class="im-grid">
        <label>${esc(T('im.size'))}<select name="size">${opt('orig', T('im.orig'), s.size === 'orig')}${opt('0.75', '75 %')}${opt('0.5', '50 %', s.size === '0.5')}${opt('0.25', '25 %')}${opt('w', T('im.custom'))}</select></label>
        <label class="im-w" hidden>${esc(T('im.width'))}<input name="width" type="number" min="16" max="20000" inputmode="numeric" value="${s.width}"></label>
        <label>${esc(T('im.format'))}<select name="format">${opt('same', T('im.same'), true)}${opt('jpg', 'JPG')}${opt('png', 'PNG')}${opt('webp', 'WebP')}</select></label>
        <label class="im-q">${esc(T('im.quality'))} <output>${Math.round(s.quality * 100)} %</output><input name="quality" type="range" min="10" max="100" step="5" value="${Math.round(s.quality * 100)}"></label>
      </div>
      <p class="im-est" aria-live="polite"></p>
      <div class="pw-btns"><button type="button" class="btn sm" value="cancel">${esc(T('pw.cancel'))}</button><button type="submit" class="btn sm primary" value="ok">${esc(T('im.ok'))}</button></div>
    </form>`;
    document.body.appendChild(d);
    const f = d.querySelector('form'), cv = d.querySelector('.im-pic'), box = d.querySelector('.im-box'), est = d.querySelector('.im-est');
    // the preview: the picture scaled to fit the dialog
    // (sized once the dialog is open, from the room it really has, so the frame lines up with the picture)
    let k = 1;
    const sizePreview = () => {
      const room = f.clientWidth - parseFloat(getComputedStyle(f).paddingLeft) - parseFloat(getComputedStyle(f).paddingRight);
      k = Math.min(room / w, Math.min(340, window.innerHeight * 0.38) / h, 1);
      cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    };
    const drawBox = () => {
      if (!box) return;
      box.hidden = aspect === null;
      Object.assign(box.style, { left: crop.x * k + 'px', top: crop.y * k + 'px', width: crop.w * k + 'px', height: crop.h * k + 'px' });
    };
    const setAspect = a => {
      aspect = a === '0' ? null : a === 'free' ? 'free' : +a;
      d.querySelectorAll('[data-a]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.a === a)));
      d.querySelector('.im-hint').hidden = aspect === null;
      if (aspect === null) crop = { x: 0, y: 0, w, h };
      else if (aspect !== 'free') { // the biggest frame of that shape, centred
        let cw = w, ch = Math.round(w / aspect); if (ch > h) { ch = h; cw = Math.round(h * aspect); }
        crop = { x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: cw, h: ch };
      } else crop = { x: Math.round(w * .1), y: Math.round(h * .1), w: Math.round(w * .8), h: Math.round(h * .8) };
      drawBox(); later();
    };
    d.querySelectorAll('[data-a]').forEach(b => b.onclick = () => setAspect(b.dataset.a));
    // drag the frame, or a corner to resize it (keeping the shape when one is chosen)
    if (box) {
      let drag = null;
      box.addEventListener('pointerdown', e => {
        e.preventDefault(); box.setPointerCapture(e.pointerId);
        drag = { c: e.target.dataset.c || 'move', x: e.clientX, y: e.clientY, r: { ...crop } };
      });
      box.addEventListener('pointermove', e => {
        if (!drag) return;
        const dx = (e.clientX - drag.x) / k, dy = (e.clientY - drag.y) / k, r = drag.r, min = Math.max(16, Math.min(w, h) * 0.05);
        let { x, y, w: cw, h: ch } = r;
        if (drag.c === 'move') { x = Math.min(Math.max(0, r.x + dx), w - cw); y = Math.min(Math.max(0, r.y + dy), h - ch); }
        else {
          const left = drag.c.includes('w'), top = drag.c.includes('n');
          cw = Math.max(min, r.w + (left ? -dx : dx)); ch = Math.max(min, r.h + (top ? -dy : dy));
          if (typeof aspect === 'number') { if (Math.abs(dx) > Math.abs(dy)) ch = cw / aspect; else cw = ch * aspect; }
          const maxW2 = left ? r.x + r.w : w - r.x, maxH2 = top ? r.y + r.h : h - r.y;
          if (cw > maxW2) { cw = maxW2; if (typeof aspect === 'number') ch = cw / aspect; }
          if (ch > maxH2) { ch = maxH2; if (typeof aspect === 'number') cw = ch * aspect; }
          x = left ? r.x + r.w - cw : r.x; y = top ? r.y + r.h - ch : r.y;
        }
        crop = { x: Math.round(x), y: Math.round(y), w: Math.round(cw), h: Math.round(ch) }; drawBox();
      });
      const up = () => { if (drag) { drag = null; later(); } };
      box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    }
    // the size estimate, worked out on the first picture
    let timer = 0, seq = 0;
    const read = () => { s.size = f.size.value; s.width = +f.width.value || s.width; s.format = f.format.value; s.quality = +f.quality.value / 100;
      d.querySelector('.im-w').hidden = s.size !== 'w';
      const fmt = s.format === 'same' ? sameFormat(first) : s.format;
      d.querySelector('.im-q').hidden = fmt === 'png'; d.querySelector('.im-q output').textContent = Math.round(s.quality * 100) + ' %'; };
    const later = () => { read(); clearTimeout(timer); timer = setTimeout(async () => {
      const my = ++seq, fmt = s.format === 'same' ? sameFormat(first) : s.format;
      try { const r = await renderEdited(img, w, h, s, aspect === null ? null : crop, fmt); if (my === seq) est.textContent = T('im.est', { size: fmtSize(r.blob.size), was: fmtSize(first.size), w: r.w, h: r.h }); } catch (e) { est.textContent = ''; }
    }, 250); };
    f.addEventListener('input', later); f.addEventListener('change', later);
    d.querySelector('[value="cancel"]').onclick = () => d.close();
    let answer = null;
    f.onsubmit = e => { e.preventDefault(); read(); answer = { ...s, crop: one && aspect !== null ? crop : null, cropFile: first }; d.close(); };
    d.addEventListener('close', () => { d.remove(); resolve(answer); });
    d.showModal(); sizePreview(); drawBox(); later();
    if (mode === 'crop' && one) setAspect('free');
  });
}
// ---------- Scan to PDF: photos of paper, straightened and cleaned up ----------
// Finding the paper: the biggest bright area in a small copy of the photo; its corners are the points
// furthest along each diagonal. Good enough for a sheet on a darker table; the corners can be moved by hand.
function findPaper(img, w, h) {
  const k = Math.min(1, 360 / Math.max(w, h)), sw = Math.max(8, Math.round(w * k)), sh = Math.max(8, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = sw; c.height = sh;
  const x = c.getContext('2d', { willReadFrequently: true }); x.filter = 'blur(2px)'; x.drawImage(img, 0, 0, sw, sh);
  const d = x.getImageData(0, 0, sw, sh).data, n = sw * sh, g = new Uint8Array(n), hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) { const v = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8; g[i] = v; hist[v]++; }
  // Otsu's threshold between paper and background
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = n - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = t; } }
  // the largest bright region
  const lab = new Int32Array(n).fill(-1); let bestId = -1, bestSize = 0, id = 0; const stack = [];
  for (let i = 0; i < n; i++) {
    if (g[i] <= th || lab[i] !== -1) continue;
    let size = 0; stack.push(i); lab[i] = id;
    while (stack.length) { const p = stack.pop(); size++; const px = p % sw, py = (p / sw) | 0;
      for (const q of [px > 0 ? p - 1 : -1, px < sw - 1 ? p + 1 : -1, py > 0 ? p - sw : -1, py < sh - 1 ? p + sw : -1]) if (q >= 0 && lab[q] === -1 && g[q] > th) { lab[q] = id; stack.push(q); } }
    if (size > bestSize) { bestSize = size; bestId = id; } id++;
  }
  const margin = [[.04, .04], [.96, .04], [.96, .96], [.04, .96]].map(([a, b]) => [a * w, b * h]);
  if (bestId < 0 || bestSize < n * 0.15 || bestSize > n * 0.97) return margin;
  let tl = [0, 0, 1e9], tr = [0, 0, -1e9], br = [0, 0, -1e9], bl = [0, 0, 1e9];
  for (let i = 0; i < n; i++) { if (lab[i] !== bestId) continue; const px = i % sw, py = (i / sw) | 0, s1 = px + py, s2 = px - py;
    if (s1 < tl[2]) tl = [px, py, s1]; if (s1 > br[2]) br = [px, py, s1]; if (s2 > tr[2]) tr = [px, py, s2]; if (s2 < bl[2]) bl = [px, py, s2]; }
  return [tl, tr, br, bl].map(([px, py]) => [(px + .5) / k, (py + .5) / k]);
}
// The homography that maps the output rectangle onto the four corners in the photo.
function homography(q, W, H) {
  const src = [[0, 0], [W, 0], [W, H], [0, H]], A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = q[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let i = 0; i < 8; i++) { // Gaussian elimination
    let m = i; for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = 0; r < 8; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c < 8; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  return b.map((v, i) => v / A[i][i]);
}
// Straighten the paper and give it the chosen look (colour, grey, or black and white with shadows evened out).
function flattenPage(pg, maxSide = 2000) {
  const { img, w, h, q, look, rot } = pg;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let W = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), H = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  const k = Math.min(1, maxSide / Math.max(W, H)); W = Math.max(8, Math.round(W * k)); H = Math.max(8, Math.round(H * k));
  const sk = Math.min(1, 3000 / Math.max(w, h)), sw = Math.round(w * sk), sh = Math.round(h * sk);
  const sc = document.createElement('canvas'); sc.width = sw; sc.height = sh;
  const sx = sc.getContext('2d', { willReadFrequently: true }); sx.drawImage(img, 0, 0, sw, sh);
  const S = sx.getImageData(0, 0, sw, sh).data;
  const Hm = homography(q.map(([u, v]) => [u * sk, v * sk]), W, H);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const ox = out.getContext('2d'), O = ox.createImageData(W, H), D = O.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const z = Hm[6] * x + Hm[7] * y + 1, u = (Hm[0] * x + Hm[1] * y + Hm[2]) / z, v = (Hm[3] * x + Hm[4] * y + Hm[5]) / z;
    const iu = Math.min(sw - 2, Math.max(0, u | 0)), iv = Math.min(sh - 2, Math.max(0, v | 0)), fu = Math.min(1, Math.max(0, u - iu)), fv = Math.min(1, Math.max(0, v - iv));
    const o = (y * W + x) * 4, a = (iv * sw + iu) * 4, b2 = a + 4, c = a + sw * 4, d = c + 4;
    for (let ch = 0; ch < 3; ch++) D[o + ch] = (S[a + ch] * (1 - fu) + S[b2 + ch] * fu) * (1 - fv) + (S[c + ch] * (1 - fu) + S[d + ch] * fu) * fv;
    D[o + 3] = 255;
  }
  if (look !== 'color') {
    // the paper's brightness, blurred, so shadows and uneven light can be divided out
    const bw = Math.max(4, Math.round(W / 24)), bh = Math.max(4, Math.round(H / 24)), bc = document.createElement('canvas'); bc.width = bw; bc.height = bh;
    ox.putImageData(O, 0, 0);
    const bx = bc.getContext('2d', { willReadFrequently: true }); bx.filter = 'blur(2px)'; bx.drawImage(out, 0, 0, bw, bh);
    const big = document.createElement('canvas'); big.width = W; big.height = H; const gx = big.getContext('2d', { willReadFrequently: true }); gx.imageSmoothingQuality = 'high'; gx.drawImage(bc, 0, 0, W, H);
    const B = gx.getImageData(0, 0, W, H).data;
    for (let i = 0; i < D.length; i += 4) {
      const l = D[i] * .299 + D[i + 1] * .587 + D[i + 2] * .114, bg = Math.max(30, B[i] * .299 + B[i + 1] * .587 + B[i + 2] * .114);
      let v = Math.min(255, l / bg * 245);
      if (look === 'bw') v = v > 175 ? 255 : v < 115 ? 0 : (v - 115) / 60 * 255;
      D[i] = D[i + 1] = D[i + 2] = v;
    }
  }
  ox.putImageData(O, 0, 0);
  if (!rot) return out;
  const r = document.createElement('canvas'), odd = rot % 180 !== 0; r.width = odd ? H : W; r.height = odd ? W : H;
  const rx = r.getContext('2d'); rx.translate(r.width / 2, r.height / 2); rx.rotate(rot * Math.PI / 180); rx.drawImage(out, -W / 2, -H / 2);
  return r;
}
async function scanPagesToPDF(canvases, quality) {
  let doc;
  for (const c of canvases) {
    const w = 595, h = 595 * c.height / c.width, o = w > h ? 'l' : 'p';
    if (!doc) doc = await newPDF([w, h], o); else doc.addPage([w, h], o);
    doc.addImage(c.toDataURL('image/jpeg', quality), 'JPEG', 0, 0, w, h);
  }
  return doc.output('blob');
}
async function openScanner(files) {
  const pages = [];
  const add = async list => {
    for (const f of list) { try { const { img, w, h } = await decodeImage(f); pages.push({ img, w, h, q: findPaper(img, w, h), look: 'gray', rot: 0, name: f.name }); } catch (e) { toast(e.message); } }
  };
  await add(files);
  if (!pages.length) return;
  let cur = 0;
  const d = document.createElement('div'); d.className = 'cmp scan'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = `<div class="cmp-bar"><h2>${esc(T('sc.title'))}</h2><span class="cmp-sum sc-count"></span><button type="button" class="btn sm" data-x>${esc(T('sc.close'))}</button></div>
    <div class="sc-main">
      <div class="sc-work"><p class="sc-hint">${esc(T('sc.hint'))}</p><div class="sc-stage"><canvas></canvas><svg class="sc-quad"><polygon/></svg>${[0, 1, 2, 3].map(i => `<i data-k="${i}"></i>`).join('')}</div>
        <div class="sc-tools"><label>${esc(T('sc.look'))} <select class="sc-look"><option value="color">${esc(T('sc.color'))}</option><option value="gray">${esc(T('sc.gray'))}</option><option value="bw">${esc(T('sc.bw'))}</option></select></label>
          <button type="button" class="btn sm" data-a="rot">↻ ${esc(T('sc.rotate'))}</button><button type="button" class="btn sm" data-a="whole">${esc(T('sc.whole'))}</button><button type="button" class="btn sm ghost" data-a="del">${esc(T('sc.remove'))}</button></div></div>
      <div class="sc-side"><b>${esc(T('sc.preview'))}</b><div class="sc-result"></div><div class="sc-thumbs"></div>
        <label class="btn sm sc-addbtn">＋ ${esc(T('sc.add'))}<input type="file" accept="image/*" capture="environment" multiple hidden></label>
        <label class="sc-ocr"><input type="checkbox"> ${esc(T('sc.ocr'))}</label>
        <button type="button" class="btn primary sc-make">${esc(T('sc.make'))}</button></div>
    </div>`;
  document.body.appendChild(d); document.documentElement.classList.add('ed-open');
  const close = () => { d.remove(); document.documentElement.classList.remove('ed-open'); };
  d.querySelector('[data-x]').onclick = close;
  d.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  const stage = d.querySelector('.sc-stage'), cv = stage.querySelector('canvas'), poly = stage.querySelector('polygon'), dots = [...stage.querySelectorAll('i')];
  let k = 1, previewTimer = 0;
  const showQuad = () => { const pg = pages[cur]; poly.setAttribute('points', pg.q.map(([x, y]) => `${x * k},${y * k}`).join(' ')); dots.forEach((dt, i) => { dt.style.left = pg.q[i][0] * k + 'px'; dt.style.top = pg.q[i][1] * k + 'px'; }); };
  const preview = () => { clearTimeout(previewTimer); previewTimer = setTimeout(() => {
    const pg = pages[cur], c = flattenPage(pg, 700), box = d.querySelector('.sc-result'); box.innerHTML = ''; c.className = 'sc-res'; box.appendChild(c);
    const th = d.querySelectorAll('.sc-thumbs button')[cur]; if (th) { th.innerHTML = ''; const t = flattenPage(pg, 160); th.appendChild(t); }
  }, 120); };
  const thumbs = () => {
    d.querySelector('.sc-thumbs').innerHTML = pages.map((p, i) => `<button type="button" data-i="${i}" aria-label="${esc(T('sc.page', { n: i + 1 }))}"${i === cur ? ' aria-current="true"' : ''}></button>`).join('');
    d.querySelectorAll('.sc-thumbs button').forEach((b, i) => { b.appendChild(flattenPage(pages[i], 160)); b.onclick = () => { cur = i; show(); }; });
    d.querySelector('.sc-count').textContent = T('sc.page', { n: `${cur + 1} / ${pages.length}` });
  };
  const show = () => {
    const pg = pages[cur], room = stage.parentElement.clientWidth - 8, maxH = Math.max(240, window.innerHeight - 330);
    k = Math.min(room / pg.w, maxH / pg.h, 1);
    cv.width = Math.round(pg.w * k); cv.height = Math.round(pg.h * k); cv.getContext('2d').drawImage(pg.img, 0, 0, cv.width, cv.height);
    stage.style.width = cv.width + 'px'; stage.style.height = cv.height + 'px';
    const svg = stage.querySelector('svg'); svg.setAttribute('width', cv.width); svg.setAttribute('height', cv.height);
    d.querySelector('.sc-look').value = pg.look;
    showQuad(); thumbs(); preview();
  };
  // drag a corner
  let drag = -1;
  dots.forEach((dt, i) => dt.addEventListener('pointerdown', e => { e.preventDefault(); drag = i; dt.setPointerCapture(e.pointerId); }));
  stage.addEventListener('pointermove', e => {
    if (drag < 0) return; const r = cv.getBoundingClientRect(), pg = pages[cur];
    pg.q[drag] = [Math.min(pg.w, Math.max(0, (e.clientX - r.left) / k)), Math.min(pg.h, Math.max(0, (e.clientY - r.top) / k))]; showQuad();
  });
  const up = () => { if (drag >= 0) { drag = -1; preview(); } };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  d.querySelector('.sc-look').onchange = e => { pages[cur].look = e.target.value; preview(); };
  d.querySelector('[data-a="rot"]').onclick = () => { pages[cur].rot = (pages[cur].rot + 90) % 360; preview(); };
  d.querySelector('[data-a="whole"]').onclick = () => { const p = pages[cur]; p.q = [[0, 0], [p.w, 0], [p.w, p.h], [0, p.h]]; showQuad(); preview(); };
  d.querySelector('[data-a="del"]').onclick = () => { pages.splice(cur, 1); if (!pages.length) return close(); cur = Math.min(cur, pages.length - 1); show(); };
  d.querySelector('.sc-addbtn input').onchange = async e => { const n0 = pages.length; await add([...e.target.files]); e.target.value = ''; if (pages.length > n0) { cur = n0; show(); } };
  d.querySelector('.sc-make').onclick = () => {
    const list = pages.slice(), ocr = d.querySelector('.sc-ocr input').checked, name = `${T('sc.name')}.pdf`;
    close();
    const j = newJob(`${list.length} ${T('job.files')}`, 'scan'); j.label = name; j.srcLabel = 'JPG';
    schedule(async () => {
      const cs = [];
      for (let i = 0; i < list.length; i++) { cs.push(flattenPage(list[i])); setProgress(j, (i + 1) / list.length * (ocr ? .3 : .9)); await new Promise(r => setTimeout(r)); }
      let outs = [{ name, blob: await scanPagesToPDF(cs, list.some(p => p.look === 'color') ? 0.82 : 0.7) }];
      if (ocr) outs = (await convertPDF(new File([outs[0].blob], name, { type: 'application/pdf' }), 'ocr', opts(), p => setProgress(j, .3 + p * .7))).map(o => ({ ...o, name }));
      await finishJob(j, outs);
    }).catch(e => failJob(j, e));
  };
  window.addEventListener('resize', () => { if (d.isConnected) show(); });
  show();
}
async function convertPDF(file, target, o, progress) {
  if (target === 'split') return splitPDF(file, progress, o.split);
  if (target === 'extract') return extractPages(file, o.pages, progress);
  if (target === 'protect') return protectPDF(file, o.password);
  if (target === 'unlock') return unlockPDF(file, o.password);
  if (target === 'clean') return cleanPDF(file);
  if (target === 'flatten') return flattenPDF(file);
  if (target === 'repair') return repairPDF(file);
  if (target === 'meta') return editMetadata(file, o.meta || {});
  if (target === 'nup') return nupPDF(file, o.nup || 'booklet');
  if (target === 'headfoot') return headerFooter(file, o.hf || {});
  await lib('pdfjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js';
  let pdf;
  try { pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise; }
  catch (e) { throw new Error(T(e && e.name === 'PasswordException' ? 'err.pdf.locked' : 'err.pdf.read')); }
  if (target === 'shrink') return shrinkPDF(file, pdf, progress);
  if (target === 'grey') return shrinkPDF(file, pdf, progress, true);
  if (target === 'blank') return removeBlankPages(file, pdf, progress);
  if (target === 'images') return extractImages(file, pdf, progress);
  if (target === 'crop') return cropPDF(file, pdf, o.crop || 'trim', progress);
  if (target === 'ocr') return ocrPDF(file, pdf, progress);
  const b = base(file.name), out = [], pad = String(pdf.numPages).length;
  if (target === 'docx') return pdfToWord(pdf, b, progress);
  if (target === 'xlsx') return pdfToExcel(file, pdf, b, progress);
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
// ---------- Compare two PDFs: the text, line by line, with what was added, removed and changed ----------
function lcsDiff(a, b, eq) {
  const n = a.length, m = b.length, w = m + 1, L = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i * w + j] = eq(a[i], b[j]) ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) { if (eq(a[i], b[j])) { out.push(['=', a[i], b[j]]); i++; j++; } else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) out.push(['-', a[i++], null]); else out.push(['+', null, b[j++]]); }
  while (i < n) out.push(['-', a[i++], null]); while (j < m) out.push(['+', null, b[j++]]);
  return out;
}
const norm = s => s.replace(/\s+/g, ' ').trim();
// Where the words differ, as character ranges in each line (for the marks on the pages)
function changedSpans(a, b) {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/), d = lcsDiff(A, B, (x, y) => x === y), ra = [], rb = [];
  let i = 0, j = 0;
  for (const [op, x, y] of d) {
    if (op === '=') { i += x.length; j += y.length; }
    else if (op === '-') { if (x.trim()) ra.push([i, i + x.length]); i += x.length; }
    else { if (y.trim()) rb.push([j, j + y.length]); j += y.length; }
  }
  // words next to each other become one mark
  const join = (r, t) => r.reduce((o, x) => { const l = o[o.length - 1]; if (l && !t.slice(l[1], x[0]).trim()) l[1] = x[1]; else o.push([...x]); return o; }, []);
  return [join(ra, a), join(rb, b)];
}
// How far into a line a character is, by the width of the text before it (close enough to place a mark)
let measureCtx = null;
function textShare(t, i) {
  if (!measureCtx) { measureCtx = document.createElement('canvas').getContext('2d'); measureCtx.font = '100px Helvetica, Arial, sans-serif'; }
  const all = measureCtx.measureText(t).width;
  return all ? measureCtx.measureText(t.slice(0, i)).width / all : i / t.length;
}
function wordDiff(a, b) {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/), d = lcsDiff(A, B, (x, y) => x === y);
  let L = '', R = '';
  for (const [op, x, y] of d) { if (op === '=') { L += esc(x); R += esc(y); } else if (op === '-') L += `<del>${esc(x)}</del>`; else R += `<ins>${esc(y)}</ins>`; }
  return [L, R];
}
async function openCompare(fa, fb) {
  const d = document.createElement('div'); d.id = 'compare'; d.className = 'cmp'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = `<div class="cmp-bar"><h2>${esc(T('cmp.title'))}</h2><span class="cmp-sum">${esc(T('cmp.reading'))}</span><div class="cmp-view" role="group" aria-label="${esc(T('cmp.view'))}"><button type="button" data-v="text" aria-pressed="true">${esc(T('cmp.text'))}</button><button type="button" data-v="pages" aria-pressed="false">${esc(T('cmp.pages'))}</button></div><label class="cmp-only"><input type="checkbox" checked> ${esc(T('cmp.onlyChanges'))}</label><button type="button" class="btn sm" data-x>${esc(T('cmp.close'))}</button></div>
    <div class="cmp-head"><div><b>${esc(T('cmp.old'))}</b> <span>${esc(fa.name)}</span></div><div><b>${esc(T('cmp.new'))}</b> <span>${esc(fb.name)}</span></div></div><div class="cmp-body"></div><div class="cmp-pages" hidden></div>`;
  document.body.appendChild(d); document.documentElement.classList.add('ed-open');
  const close = () => { d.remove(); document.documentElement.classList.remove('ed-open'); };
  d.querySelector('[data-x]').onclick = close;
  d.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  d.querySelector('[data-x]').focus();
  await lib('pdfjs'); pdfjsLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js';
  const docs = [];
  const read = async (f, side) => { const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false }).promise; docs[side] = pdf; return (await pdfLines(pdf)).flatMap((ls, pi) => ls.map(l => ({ t: norm(l.t.replace(/\t/g, ' ')), p: pi + 1, x: l.x, y: l.y, end: l.end, h: l.h }))).filter(l => l.t); };
  let A, B;
  try { [A, B] = await Promise.all([read(fa, 0), read(fb, 1)]); } catch (e) { d.querySelector('.cmp-sum').textContent = T('err.pdf.read'); return; }
  // pair a removed line with an added one next to it: that is a changed line, shown word by word
  const raw = lcsDiff(A, B, (x, y) => x.t === y.t), rows = [];
  for (let k = 0; k < raw.length; k++) {
    const [op, a, b] = raw[k];
    if (op === '-' && raw[k + 1] && raw[k + 1][0] === '+') { rows.push(['~', a, raw[k + 1][2]]); k++; }
    else rows.push([op, a, b]);
  }
  const n = { a: 0, r: 0, c: 0 }; rows.forEach(r => { if (r[0] === '+') n.a++; else if (r[0] === '-') n.r++; else if (r[0] === '~') n.c++; });
  const total = n.a + n.r + n.c;
  d.querySelector('.cmp-sum').textContent = total ? T('cmp.sum', { n: total, a: n.a, r: n.r, c: n.c }) : T('cmp.same');
  const pg = l => l ? `<span class="cmp-pg">${esc(T('cmp.page', { n: l.p }))}</span>` : '';
  d.querySelector('.cmp-body').innerHTML = rows.map(([op, a, b]) => {
    if (op === '~') { const [L, R] = wordDiff(a.t, b.t); return `<div class="cmp-row chg"><div>${pg(a)}${L}</div><div>${pg(b)}${R}</div></div>`; }
    return `<div class="cmp-row ${op === '=' ? 'same' : op === '+' ? 'add' : 'del'}"><div>${a ? pg(a) + esc(a.t) : ''}</div><div>${b ? pg(b) + esc(b.t) : ''}</div></div>`;
  }).join('');
  const only = d.querySelector('.cmp-only input'); const apply = () => d.classList.toggle('only', only.checked && total > 0); only.onchange = apply; apply();
  // The pages view: both versions side by side, page by page, with the changes marked where they are
  const marks = [new Map(), new Map()]; // side → page → [{ l, kind, spans }]
  const put = (side, l, kind, spans) => { if (!l) return; const m = marks[side]; if (!m.has(l.p)) m.set(l.p, []); m.get(l.p).push({ l, kind, spans }); };
  for (const [op, a, b] of rows) {
    if (op === '-') put(0, a, 'del'); else if (op === '+') put(1, b, 'add');
    else if (op === '~') { const [sa, sb] = changedSpans(a.t, b.t); put(0, a, 'chg', sa); put(1, b, 'chg', sb); }
  }
  const pagesBox = d.querySelector('.cmp-pages'), body = d.querySelector('.cmp-body');
  let built = false;
  const buildPages = () => {
    built = true;
    const n = Math.max(docs[0].numPages, docs[1].numPages);
    pagesBox.innerHTML = Array.from({ length: n }, (_, i) => `<div class="cmp-prow" data-p="${i + 1}">${[0, 1].map(s => `<figure class="cmp-page" data-s="${s}"><figcaption>${esc(T('cmp.pageN', { n: i + 1 }))}${marks[s].has(i + 1) ? ` <b>${marks[s].get(i + 1).length}</b>` : ''}</figcaption><div class="cmp-sheet"></div></figure>`).join('')}</div>`).join('');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); drawRow(e.target); } }), { root: pagesBox, rootMargin: '600px 0px' });
    pagesBox.querySelectorAll('.cmp-prow').forEach(r => io.observe(r));
  };
  const drawRow = row => row.querySelectorAll('.cmp-page').forEach(async fig => {
    const side = +fig.dataset.s, p = +row.dataset.p, sheet = fig.querySelector('.cmp-sheet');
    if (p > docs[side].numPages) { sheet.classList.add('none'); sheet.textContent = T('cmp.noPage', { n: p }); return; }
    const page = await docs[side].getPage(p), base1 = page.getViewport({ scale: 1 });
    const scale = Math.min(2, (fig.clientWidth || 400) / base1.width), vp = page.getViewport({ scale }), dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas'); c.width = Math.round(vp.width * dpr); c.height = Math.round(vp.height * dpr);
    c.style.width = vp.width + 'px'; c.style.height = vp.height + 'px';
    sheet.style.width = vp.width + 'px'; sheet.style.height = vp.height + 'px'; sheet.appendChild(c);
    await page.render({ canvasContext: c.getContext('2d'), viewport: page.getViewport({ scale: scale * dpr }) }).promise;
    for (const { l, kind, spans } of marks[side].get(p) || []) {
      // a whole line, or for a changed line only the words that changed (placed by their share of the line)
      const parts = spans && spans.length ? spans.map(([s0, s1]) => [l.x + (l.end - l.x) * textShare(l.t, s0), l.x + (l.end - l.x) * textShare(l.t, s1)]) : [[l.x, l.end]];
      for (const [x0, x1] of parts) {
        const [a, b, cc, dd] = vp.convertToViewportRectangle([x0 - 1, l.y - l.h * 0.28, x1 + 1, l.y + l.h * 0.92]);
        const m = document.createElement('i'); m.className = 'cmp-mark ' + (kind === 'chg' ? (side ? 'add' : 'del') : kind);
        Object.assign(m.style, { left: Math.min(a, cc) + 'px', top: Math.min(b, dd) + 'px', width: Math.abs(cc - a) + 'px', height: Math.abs(dd - b) + 'px' });
        sheet.appendChild(m);
      }
    }
  });
  d.querySelectorAll('[data-v]').forEach(btn => btn.onclick = () => {
    const pages = btn.dataset.v === 'pages';
    d.querySelectorAll('[data-v]').forEach(o => o.setAttribute('aria-pressed', String(o === btn)));
    body.hidden = pages; pagesBox.hidden = !pages; d.querySelector('.cmp-only').hidden = pages;
    if (pages && !built) buildPages();
    if (pages) { const first = [...marks[0].keys(), ...marks[1].keys()].sort((x, y) => x - y)[0]; if (first > 1) pagesBox.querySelector(`[data-p="${first}"]`)?.scrollIntoView({ block: 'start' }); }
  });
}

// ---------- PDF to Word: the text and paragraphs as an editable .docx ----------
// Lines are rebuilt from the text positions; a bigger line becomes a heading. The exact layout is not kept.
async function pdfLines(pdf, progress) {
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent();
    const items = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ s: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || it.height || 10, w: it.width || 0 }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const it of items) {
      const l = lines[lines.length - 1];
      if (l && Math.abs(l.y - it.y) < Math.max(2, it.h * 0.4)) { const gap = it.x - l.end; l.t += (gap > it.h * 0.15 && !/\s$/.test(l.t) ? (gap > it.h * 2.5 ? '\t' : ' ') : '') + it.s; l.end = it.x + it.w; l.h = Math.max(l.h, it.h); }
      else lines.push({ t: it.s, y: it.y, x: it.x, end: it.x + it.w, h: it.h });
    }
    pages.push(lines);
    if (progress) progress(i / pdf.numPages * 0.8);
  }
  return pages;
}
// The layout is rebuilt as a normal, editable Word document: each line's font, size, weight,
// slant and colour; paragraphs with their alignment, indent and spacing; columns kept apart
// with tab stops; pictures where they were; the page size and margins of the PDF.
const DOCX_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const xmlEsc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// "ABCDEF+TimesNewRomanPS-BoldMT" → { family: 'Times New Roman', bold: true, italic: false }
function wordFont(raw, fallbackFamily) {
  const name = String(raw || '').replace(/^[A-Z]{6}\+/, '');
  const bold = /bold|black|heavy|semibold|demi/i.test(name), italic = /italic|oblique/i.test(name);
  let fam = name.split(/[-,]/)[0].replace(/(PS)?MT$|PSMT$|PS$/, '');
  const known = { timesnewroman: 'Times New Roman', times: 'Times New Roman', arial: 'Arial', helvetica: 'Arial', couriernew: 'Courier New', courier: 'Courier New', calibri: 'Calibri', cambria: 'Cambria', georgia: 'Georgia', verdana: 'Verdana', tahoma: 'Tahoma', garamond: 'Garamond', segoeui: 'Segoe UI', symbol: 'Symbol' };
  const key = fam.toLowerCase().replace(/[^a-z]/g, '');
  fam = known[key] || fam.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  if (!fam || /^(g_d|f\d|t\d|tt\d)/i.test(fam) || fam.length < 2) fam = { serif: 'Times New Roman', monospace: 'Courier New' }[fallbackFamily] || 'Arial';
  return { family: fam, bold, italic };
}
// The colour of a piece of text: the darkest pixel inside it on the drawn page
function inkAt(ctx, box) {
  const x = Math.max(0, Math.floor(box.x)), y = Math.max(0, Math.floor(box.y)), w = Math.max(1, Math.min(ctx.canvas.width - x, Math.ceil(box.w))), h = Math.max(1, Math.min(ctx.canvas.height - y, Math.ceil(box.h)));
  let d; try { d = ctx.getImageData(x, y, w, h).data; } catch (e) { return null; }
  let best = 765, c = null;
  for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i + 1] + d[i + 2]; if (l < best) { best = l; c = [d[i], d[i + 1], d[i + 2]]; } }
  if (!c || (c[0] < 70 && c[1] < 70 && c[2] < 70)) return null; // black: leave it as automatic
  return c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
// Where the pictures are on a page: follow the drawing operations and note each picture's box
async function pagePictures(page) {
  const ops = await page.getOperatorList(), O = pdfjsLib.OPS, mul = pdfjsLib.Util.transform, out = [];
  let m = [1, 0, 0, 1, 0, 0]; const stack = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], args = ops.argsArray[i];
    if (fn === O.save) stack.push(m);
    else if (fn === O.restore) m = stack.pop() || m;
    else if (fn === O.transform) m = mul(m, args);
    else if (fn === O.paintFormXObjectBegin) { stack.push(m); if (args && args[0]) m = mul(m, args[0]); }
    else if (fn === O.paintFormXObjectEnd) m = stack.pop() || m;
    else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject || fn === O.paintImageMaskXObject || fn === O.paintImageXObjectRepeat) {
      const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      out.push({ x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) });
    }
  }
  return out;
}
async function pdfToWord(pdf, b, progress) {
  await lib('jszip');
  const SC = 2, body = [], media = [], rels = [];
  let hasText = false, sect = null;
  const tw = pt => Math.round(pt * 20), emu = pt => Math.round(pt * 12700);
  for (let pn = 1; pn <= pdf.numPages; pn++) {
    const page = await pdf.getPage(pn), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: SC });
    const W = vp1.width, Hh = vp1.height;
    // draw the page once: for the text colours, the fonts' names and the pictures
    const cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const tc = await page.getTextContent();
    const fontOf = id => { try { if (page.commonObjs.has(id)) { const f = page.commonObjs.get(id); return f && (f.name || f.loadedName); } } catch (e) {} return ''; };
    // the text pieces in page coordinates (top-down, in points)
    const items = [];
    for (const it of tc.items) {
      if (!it.str || !it.transform) continue;
      const [a, bb, c, d, e, f] = pdfjsLib.Util.transform(vp1.transform, it.transform);
      if (Math.abs(bb) > .01 || Math.abs(c) > .01) continue; // turned text: left out
      const size = Math.abs(d) || Math.abs(it.height) || 10;
      if (!it.str.trim()) { items.push({ space: true, x: e, y: f, w: it.width, size }); continue; }
      const font = wordFont(fontOf(it.fontName), tc.styles[it.fontName] && tc.styles[it.fontName].fontFamily);
      const ink = inkAt(ctx, { x: e * SC, y: (f - size * .8) * SC, w: it.width * SC, h: size * SC });
      items.push({ str: it.str, x: e, y: f, w: it.width, size, font, ink });
    }
    const textItems = items.filter(i => !i.space);
    if (textItems.length) hasText = true;
    // lines: pieces on the same baseline, left to right
    const lines = [];
    for (const it of textItems.sort((p, q) => p.y - q.y || p.x - q.x)) {
      const l = lines.find(L => Math.abs(L.y - it.y) < Math.max(L.size, it.size) * .35);
      if (l) { l.items.push(it); l.size = Math.max(l.size, it.size); } else lines.push({ y: it.y, size: it.size, items: [it] });
    }
    lines.forEach(l => { l.items.sort((p, q) => p.x - q.x); l.x1 = l.items[0].x; const last = l.items[l.items.length - 1]; l.x2 = last.x + last.w; l.main = l.items.reduce((s, i) => s + i.str.length, 0); });
    lines.sort((p, q) => p.y - q.y);
    // the margins: where the text starts and ends on this page
    const minX = lines.length ? Math.min(...lines.map(l => l.x1)) : 72, maxX = lines.length ? Math.max(...lines.map(l => l.x2)) : W - 72;
    const ml = Math.max(18, Math.min(minX, 144)), mr = Math.max(18, Math.min(W - maxX, 144)), mt = Math.max(18, Math.min(lines.length ? lines[0].y - lines[0].size : 72, 108));
    if (!sect) sect = { W, H: Hh, ml, mr, mt };
    const textW = W - sect.ml - sect.mr;
    // paragraphs: lines close together, same size, lined up
    const paras = [];
    for (const l of lines) {
      const p = paras[paras.length - 1], prev = p && p.lines[p.lines.length - 1];
      const multiCol = l.items.some((it, i) => i && it.x - (l.items[i - 1].x + l.items[i - 1].w) > it.size * 2.5);
      const joins = prev && !multiCol && !p.multiCol && Math.abs(prev.size - l.size) < l.size * .15 && l.y - prev.y < l.size * 1.75 && l.y - prev.y > l.size * .5
        && (Math.abs(l.x1 - prev.x1) < l.size * 1.5 || (p.lines.length === 1 && l.x1 < prev.x1 && prev.x1 - l.x1 < l.size * 4))
        && !/[.:!?]$/.test(prev.items.map(i => i.str).join('').trim()) || (joins0(prev, l, p));
      if (joins) p.lines.push(l); else paras.push({ lines: [l], multiCol });
    }
    function joins0(prev, l, p) { // a long paragraph line that ends a sentence still continues if the next line is in the same block
      return !!prev && !p.multiCol && Math.abs(prev.size - l.size) < l.size * .15 && l.y - prev.y < l.size * 1.6 && l.y - prev.y > l.size * .5 && Math.abs(l.x1 - prev.x1) < l.size && prev.x2 > sect.ml + textW * .85;
    }
    // the pictures, cut out of the drawn page
    const pics = [];
    try {
      for (const r of await pagePictures(page)) {
        const [x1, y1, x2, y2] = vp1.convertToViewportRectangle([r.x1, r.y1, r.x2, r.y2]);
        const bx = Math.max(0, Math.min(x1, x2)), by = Math.max(0, Math.min(y1, y2)), bw = Math.min(W, Math.max(x1, x2)) - bx, bh = Math.min(Hh, Math.max(y1, y2)) - by;
        if (bw < 12 || bh < 12) continue;
        const c2 = document.createElement('canvas'); c2.width = Math.round(bw * SC); c2.height = Math.round(bh * SC);
        c2.getContext('2d').drawImage(cv, bx * SC, by * SC, bw * SC, bh * SC, 0, 0, c2.width, c2.height);
        const id = media.length + 1, blob = await canvasToBlob(c2, 'image/jpeg', .88);
        media.push({ name: `image${id}.jpeg`, blob });
        rels.push(`<Relationship Id="rIdImg${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${id}.jpeg"/>`);
        const scale = Math.min(1, textW / bw);
        pics.push({ y: by, x: bx, id, w: bw * scale, h: bh * scale });
      }
    } catch (e) { console.warn('Pictures skipped', e); }
    // write the page: paragraphs and pictures from top to bottom
    const blocks = [...paras.map(p => ({ y: p.lines[0].y - p.lines[0].size, p })), ...pics.map(g => ({ y: g.y, g }))].sort((u, v) => u.y - v.y);
    let lastBottom = mt, firstOnPage = true;
    const run = (it, text) => {
      const f = it.font, sz = Math.max(2, Math.round(it.size * 2));
      return `<w:r><w:rPr><w:rFonts w:ascii="${xmlEsc(f.family)}" w:hAnsi="${xmlEsc(f.family)}" w:cs="${xmlEsc(f.family)}"/>${f.bold ? '<w:b/>' : ''}${f.italic ? '<w:i/>' : ''}${it.ink ? `<w:color w:val="${it.ink}"/>` : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
    };
    const tabRun = '<w:r><w:tab/></w:r>';
    for (const blk of blocks) {
      const before = Math.max(0, blk.y - lastBottom);
      const brk = firstOnPage && pn > 1 ? '<w:pageBreakBefore/>' : '';
      firstOnPage = false;
      if (blk.g) {
        const g = blk.g, ind = Math.max(0, g.x - sect.ml);
        body.push(`<w:p><w:pPr>${brk}<w:spacing w:before="${tw(Math.min(before, 72))}" w:after="0"/><w:ind w:left="${tw(Math.min(ind, textW - g.w))}"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emu(g.w)}" cy="${emu(g.h)}"/><wp:docPr id="${g.id}" name="Picture ${g.id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${g.id}" name="image${g.id}.jpeg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${g.id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(g.w)}" cy="${emu(g.h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
        lastBottom = blk.y + g.h; continue;
      }
      const p = blk.p, L = p.lines, first = L[0], size = first.size;
      // alignment from where the lines start and end
      const lefts = L.map(l => l.x1), rights = L.map(l => l.x2), mids = L.map(l => (l.x1 + l.x2) / 2), centre = sect.ml + textW / 2;
      let jc = 'left';
      if (!p.multiCol && mids.every(m => Math.abs(m - centre) < size * 1.2) && lefts.every(x => x > sect.ml + size * 2)) jc = 'center';
      else if (!p.multiCol && rights.every(x => Math.abs(x - (W - sect.mr)) < size) && lefts.every(x => x > sect.ml + textW * .3)) jc = 'right';
      else if (L.length > 2 && rights.slice(0, -1).every(x => Math.abs(x - Math.max(...rights)) < size * .6) && Math.max(...rights) > W - sect.mr - size * 2) jc = 'both';
      const body1 = L.length > 1 ? Math.min(...lefts.slice(1)) : first.x1;
      const indL = jc === 'center' || jc === 'right' ? 0 : Math.max(0, body1 - sect.ml), first1 = jc === 'center' || jc === 'right' ? 0 : first.x1 - body1;
      const gaps = L.slice(1).map((l, i) => l.y - L[i].y), lh = gaps.length ? gaps.reduce((u, v) => u + v, 0) / gaps.length : size * 1.2;
      // tab stops for text in columns
      let tabs = '';
      if (p.multiCol) {
        const stops = [];
        L[0].items.forEach((it, i) => { if (i && it.x - (L[0].items[i - 1].x + L[0].items[i - 1].w) > it.size * 2.5) stops.push(it.x - sect.ml - indL); });
        if (stops.length) tabs = `<w:tabs>${stops.map(x => `<w:tab w:val="left" w:pos="${tw(Math.max(0, x))}"/>`).join('')}</w:tabs>`;
      }
      let runs = '';
      L.forEach((l, li) => {
        if (li) {
          const prevText = runs.slice(-60);
          runs += /-<\/w:t><\/w:r>$/.test(prevText) ? '' : run(l.items[0], ' ');
          if (/-<\/w:t><\/w:r>$/.test(prevText)) runs = runs.replace(/-<\/w:t><\/w:r>$/, '</w:t></w:r>');
        }
        l.items.forEach((it, i) => {
          if (i) { const gap = it.x - (l.items[i - 1].x + l.items[i - 1].w); if (gap > it.size * 2.5 && p.multiCol) runs += tabRun; else if (gap > it.size * .18 && !/\s$/.test(l.items[i - 1].str) && !/^\s/.test(it.str)) runs += run(it, ' '); }
          runs += run(it, it.str);
        });
      });
      const line = Math.round(Math.max(1, Math.min(2.5, lh / (size * 1.17))) * 240);
      body.push(`<w:p><w:pPr>${brk}${tabs}<w:spacing w:before="${tw(Math.min(before, 48))}" w:after="0" w:line="${line}" w:lineRule="auto"/><w:ind w:left="${tw(indL)}"${first1 > 1 ? ` w:firstLine="${tw(first1)}"` : first1 < -1 ? ` w:hanging="${tw(-first1)}"` : ''}/><w:jc w:val="${jc}"/></w:pPr>${runs}</w:p>`);
      lastBottom = L[L.length - 1].y + size * .3;
    }
    if (progress) progress(pn / pdf.numPages * .9);
  }
  if (!hasText && !media.length) throw new Error(T('docx.noText'));
  const s0 = sect || { W: 595, H: 842, ml: 72, mr: 72, mt: 72 };
  const sectPr = `<w:sectPr><w:pgSz w:w="${tw(s0.W)}" w:h="${tw(s0.H)}"${s0.W > s0.H ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${tw(s0.mt)}" w:right="${tw(s0.mr)}" w:bottom="${tw(36)}" w:left="${tw(s0.ml)}" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>`;
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.join('')}</Relationships>`);
  z.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>');
  media.forEach(m => z.file('word/media/' + m.name, m.blob));
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${DOCX_NS}><w:body>${body.join('')}${sectPr}</w:body></w:document>`);
  const blob = await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  if (progress) progress(1);
  return [{ name: b + '.docx', blob, noteKey: 'docx.note' }];
}

async function convertAudio(file, target, o, progress) {
  const buf = await decodeAudio(file), b = base(file.name);
  progress(.15);
  if (target === 'wav') return [{ name: b + '.wav', blob: toWAV(buf) }];
  return [{ name: b + '.mp3', blob: await toMP3(buf, o.kbps, p => progress(.15 + p * .85)) }];
}
async function convertVideo(file, target, o, progress) {
  if (target === 'vshrink') return compressVideo(file, o.vsize, progress);
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
const CONVERT = { image: (f, t, o, p) => convertImage(f, t, o, p), pdf: convertPDF, audio: convertAudio, video: convertVideo, doc: (f, t, o, p) => convertDoc(f, t, o, p), data: (f, t) => convertData(f, t), slides: (f, t, o, p) => slidesToPDF(f, p) };

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
  const added = []; let skipped = 0;
  for (const file of list) {
    const kind = kindOf(file);
    if (!kind) { if (opts.quiet) skipped++; else toast(T('toast.unsupported', { name: file.name })); continue; }
    const item = { id: ++uid, file, kind };
    tray.push(item); added.push(item);
  }
  if (skipped) toast(T('folder.skipped', { n: skipped }));
  if (added.length) document.dispatchEvent(new Event('lv-files'));
  renderTray();
  return added;
}
// Tool pages (e.g. /heic-to-jpg/) name the format they convert to.
const PRESET = (document.querySelector('main[data-preset]') || {}).dataset?.preset || '';
// The PDF editor is big, so it is fetched only when a page needs it: right away (when idle) on the PDF editing pages,
// otherwise the moment a PDF is sent to it. The version tag of app.js is reused so a new editor is never mixed with an old app.
const ASSET_V = ((document.currentScript && document.currentScript.src) || '').split('?')[1] || '';
const ASSET_MIN = /\.min\.js(\?|$)/.test((document.currentScript && document.currentScript.src) || '') ? '.min' : ''; // the built pages use the compact copies
let editorLoading = null;
// The editor's text search uses look-behind patterns, which Safari only reads from version 16.4 (iOS 16.4).
// Older browsers get a clear message instead of a silent failure.
const editorSupported = (() => { try { new RegExp('(?<=a)b'); return true; } catch (e) { return false; } })();
function loadEditor() {
  if (!editorSupported) return Promise.reject(new Error(T('err.oldBrowser')));
  if (window.LVEditor && window.LVPdfText) return Promise.resolve(window.LVEditor);
  if (!editorLoading) {
    const add = name => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = `/assets/${name}${ASSET_MIN}.js${ASSET_V ? '?' + ASSET_V : ''}`; sc.onload = ok; sc.onerror = () => no(new Error('Could not load ' + name)); document.head.appendChild(sc); });
    editorLoading = Promise.all([add('pdf-text'), add('editor')]).then(() => window.LVEditor).catch(e => { editorLoading = null; throw e; });
  }
  return editorLoading;
}
window.LVLoadEditor = loadEditor;
// The PDF reader (viewer.js), only fetched when the installed app is asked to open a PDF.
let viewerLoading = null;
function loadViewer() {
  if (window.LVViewer) return Promise.resolve(window.LVViewer);
  if (!viewerLoading) viewerLoading = new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = `/assets/viewer${ASSET_MIN}.js${ASSET_V ? '?' + ASSET_V : ''}`; sc.onload = () => ok(window.LVViewer); sc.onerror = () => { viewerLoading = null; no(new Error('Could not load viewer')); }; document.head.appendChild(sc); });
  return viewerLoading;
}
window.LVLoadViewer = loadViewer;
if (['edit', 'redact', 'prices'].includes(PRESET)) {
  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(() => loadEditor().catch(() => {}));
}
// Unsaved work from the PDF editor (kept in this browser only, see editor.js): offer to carry on.
(async () => {
  if (!window.indexedDB || !editorSupported || !$('dock')) return;
  try {
    const d = await new Promise((ok, no) => {
      const r = indexedDB.open('lunaverta-draft', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('d');
      r.onerror = () => no(r.error);
      r.onsuccess = () => { const db = r.result, g = db.transaction('d').objectStore('d').get('state'); g.onsuccess = () => { db.close(); ok(g.result); }; g.onerror = () => { db.close(); no(g.error); }; };
    });
    if (!d || !d.names || !d.names.length) return;
    const drop = () => { const r = indexedDB.open('lunaverta-draft', 1); r.onsuccess = () => { const db = r.result, tx = db.transaction('d', 'readwrite'); tx.objectStore('d').clear(); tx.oncomplete = () => db.close(); }; };
    if (Date.now() - d.when > 7 * 864e5) { drop(); return; } // a week old: let it go
    const bar = document.createElement('div');
    bar.className = 'draft-bar'; bar.setAttribute('role', 'status');
    const when = new Date(d.when).toLocaleString(document.documentElement.lang || undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    bar.innerHTML = `<span>${esc(T('draft.q', { name: d.names.join(', '), when }))}</span><button class="btn sm primary" type="button" data-d="go">${esc(T('draft.go'))}</button><button class="btn sm ghost" type="button" data-d="no">${esc(T('draft.no'))}</button>`;
    bar.querySelector('[data-d="go"]').onclick = () => { bar.remove(); loadEditor().then(E => E.resume()).catch(e => toast(e.message)); };
    bar.querySelector('[data-d="no"]').onclick = () => { bar.remove(); drop(); };
    $('dock').prepend(bar);
  } catch (e) { /* storage blocked: nothing to offer */ }
})();
// On a tool page, new files go straight to that page's format when they can;
// otherwise the ring opens as usual.
function afterAdd(added, x, y) {
  if (!added.length) return;
  const files = added.map(a => a.file), targets = fileTargets(files);
  // Prices is not in the ring; it lives in the editor. Its page opens the editor with prices marked.
  if (PRESET === 'prices') { const pdfs = files.filter(f => kindOf(f) === 'pdf'); if (pdfs.length) { loadEditor().then(E => E.open(pdfs, { find: true, preset: 'prices' })).catch(e => toast(e.message)); return; } }
  // Compare PDFs: as soon as two PDFs are in, they are compared
  if (PRESET === 'compare') { const pdfs = tray.filter(t => t.kind === 'pdf').map(t => t.file); if (pdfs.length >= 2) openCompare(pdfs[pdfs.length - 2], pdfs[pdfs.length - 1]); else toast(T('cmp.need2')); return; }
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
    // With several files the order matters (merge follows it), so each one shows its first page.
    const many = tray.length > 1, pic = many && (it.kind === 'pdf' || it.kind === 'image');
    if (pic && it.kind === 'image' && !it.thumb) it.thumb = URL.createObjectURL(it.file);
    if (pic && it.kind === 'pdf' && !it.thumb && !it.thumbing) { it.thumbing = true; pdfThumb(it.file, 64).then(r => { it.thumb = r.url; it.pages = r.pages; if (tray.includes(it)) renderTray(); }).catch(() => {}); }
    const idx = tray.indexOf(it);
    el.innerHTML = `${pic && it.thumb ? `<img class="chip-pg" src="${it.thumb}" alt="">` : '<span class="dot"></span>'}<span class="nm" title="${esc(it.file.name)}">${esc(it.file.name)}</span><span class="sz">${it.pages ? esc(T('job.pages', { n: it.pages })) + ' · ' : ''}${fmtSize(it.file.size)}</span>${many && idx > 0 ? `<button type="button" class="chip-up" aria-label="${esc(T('tray.up', { name: it.file.name }))}" title="${esc(T('tray.up', { name: it.file.name }))}">&#8592;</button>` : ''}<button type="button" class="chip-x" aria-label="${esc(T('tray.remove', { name: it.file.name }))}">&times;</button>`;
    el.querySelector('.chip-x').onclick = () => { tray = tray.filter(x => x !== it); if (it.thumb && it.kind === 'image') URL.revokeObjectURL(it.thumb); renderTray(); };
    const up = el.querySelector('.chip-up'); if (up) up.onclick = () => { tray.splice(idx, 1); tray.splice(idx - 1, 0, it); renderTray(); const b = $('tray').children[idx - 1]?.querySelector('.chip-up, .chip-x'); if (b) b.focus(); };
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
  if (isPdfOut(j)) pdfPreview(j).catch(() => {}); // locked or odd PDFs simply keep the plain icon
}
const isPdfOut = j => j.out && /\.pdf$/i.test(j.out.name);
// A small picture of the first page and the page count, so you can see the result before saving it
// A small picture of page 1 and the page count, for results and for the files waiting to be merged.
async function pdfThumb(file, w) {
  const pdf = await pdfjsDoc(file);
  try {
    const page = await pdf.getPage(1), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: w / vp1.width });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return { pages: pdf.numPages, url: c.toDataURL('image/png') };
  } finally { pdf.destroy(); }
}
async function pdfPreview(j) {
  const r = await pdfThumb(new File([j.out.blob], j.out.name, { type: 'application/pdf' }), 112);
  j.pages = r.pages; j.preview = r.url;
  if (j.status === 'done') renderJob(j);
}
// What people usually do next with a result; the result goes straight into the next tool, without saving it first
const NEXT = { merge: ['shrink', 'edit', 'protect'], redact: ['protect', 'shrink'], prices: ['protect', 'shrink'], shrink: ['protect', 'edit'], unlock: ['edit', 'shrink'], ocr: ['redact', 'shrink'],
  edit: ['protect', 'shrink'], protect: [], pdf: ['shrink', 'protect', 'edit'], '*pdf': ['shrink', 'protect', 'edit'], '*image': ['pdf', 'clean', 'imgedit'] };
function nextSteps(j) {
  if (!j.out || /\.zip$/i.test(j.out.name)) return [];
  const pdf = isPdfOut(j), img = /^image\//.test(j.out.blob.type);
  if (!pdf && !img) return [];
  return (NEXT[j.target] || NEXT[pdf ? '*pdf' : '*image']).filter(t => t !== j.target).slice(0, 3);
}
async function continueWith(j, target) {
  const file = new File([j.out.blob], j.out.name, { type: j.out.blob.type });
  chainTarget = target;
  try { await runBatch([file], target); } finally { chainTarget = ''; }
}
const canShareFiles = (() => { try { return !!(navigator.canShare && matchMedia('(pointer: coarse)').matches && navigator.canShare({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] })); } catch (e) { return false; } })();
function failJob(j, err) {
  console.error(err);
  // running out of memory shows up as cryptic browser errors; say what it means instead
  if (err && (err.name === 'RangeError' || /allocation failed|out of memory|Array buffer|Invalid array length/i.test(err.message || ''))) err = new Error(T('err.memory'));
  j.status = 'err'; j.error = (err && err.message) || T('job.failed');
  renderJob(j); updateFoot();
  reportError(err, j.target || '');
}
async function runBatch(files, target) {
  closeRing();
  const o = opts();
  if (target === 'protect' || target === 'unlock') {
    o.password = await askPassword(target);
    if (o.password === null) return;
  }
  if (target === 'extract') {
    o.pages = await askPages();
    if (o.pages === null) return;
  }
  if (target === 'scan') { openScanner(files.filter(f => kindOf(f) === 'image')); return; }
  if (target === 'vshrink') { o.vsize = await askVideoSize(); if (!o.vsize) return; }
  if (target === 'meta') {
    const first = files.find(f => kindOf(f) === 'pdf'); if (!first) return;
    const cur = await readPdfInfo(first);
    const a = await askOptions(T('meta.title'), [{ id: 'title', label: T('meta.t'), value: cur.title }, { id: 'author', label: T('meta.a'), value: cur.author }, { id: 'subject', label: T('meta.s'), value: cur.subject }, { id: 'keywords', label: T('meta.k'), value: cur.keywords, ph: T('meta.kPh') }, { id: 'strip', type: 'check', label: T('meta.strip'), value: true }], 'meta.ok');
    if (!a) return; o.meta = a;
  }
  if (target === 'split') {
    const a = await askOptions(T('split.title'), [{ id: 'mode', type: 'radio', value: 'each', options: [['each', T('split.each'), T('split.eachD')], ['n', T('split.n'), T('split.nD')], ['size', T('split.size'), T('split.sizeD')]] },
      { id: 'n', label: T('split.nLabel'), value: '2' }, { id: 'mb', label: T('split.mbLabel'), value: '10' }]);
    if (!a) return; o.split = a;
  }
  if (target === 'nup') {
    const a = await askOptions(T('nup.title'), [{ id: 'mode', type: 'radio', value: 'booklet', options: [['booklet', T('nup.booklet'), T('nup.bookletD')], ['2', T('nup.2'), T('nup.2D')], ['4', T('nup.4'), T('nup.4D')]] }]);
    if (!a) return; o.nup = a.mode;
  }
  if (target === 'crop') {
    const a = await askOptions(T('crop.title'), [{ id: 'mode', type: 'radio', value: 'trim', options: [['trim', T('crop.trim'), T('crop.trimD')], ['a4', T('crop.a4'), T('crop.a4D')], ['letter', T('crop.letter'), T('crop.letterD')]] }]);
    if (!a) return; o.crop = a.mode;
  }
  if (target === 'headfoot') {
    const a = await askOptions(T('hf.title'), [{ id: 'header', label: T('hf.header'), ph: T('hf.headerPh') }, { id: 'footer', label: T('hf.footer'), value: T('hf.footerDef') },
      { id: 'align', type: 'select', label: T('hf.align'), value: 'center', options: [['left', T('hf.left')], ['center', T('hf.center')], ['right', T('hf.right')]] },
      { id: 'size', type: 'select', label: T('hf.size'), value: '10', options: [['8', '8 pt'], ['10', '10 pt'], ['12', '12 pt'], ['14', '14 pt']] }, { id: 'skipFirst', type: 'check', label: T('hf.skipFirst') }], 'opt.go', T('hf.note'));
    if (!a || (!a.header.trim() && !a.footer.trim())) return; o.hf = a;
  }
  if (target === 'altmerge') {
    // on its own page, the files added one after the other count together (fronts first, then backs)
    const pdfs = (PRESET === 'altmerge' ? tray.map(t => t.file) : files).filter(f => kindOf(f) === 'pdf').slice(-2);
    if (!pdfs.length) return;
    const a = await askOptions(T('alt.title'), [{ id: 'reversed', type: 'check', label: T('alt.reversed'), value: true }], 'opt.go', pdfs.length >= 2 ? T('alt.two', { a: pdfs[0].name, b: pdfs[1].name }) : T('alt.one'));
    if (!a) return;
    const j = newJob(pdfs.length >= 2 ? `${pdfs[0].name} + ${pdfs[1].name}` : pdfs[0].name, 'altmerge');
    schedule(async () => finishJob(j, await alternateMerge(pdfs, a))).catch(e => failJob(j, e));
    return;
  }
  if (target === 'imgedit') {
    o.img = await askImage(files.filter(f => kindOf(f) === 'image'));
    if (o.img === null) return;
  }
  const items = files.map(f => ({ f, kind: kindOf(f) })).filter(x => x.kind);
  const ok = items.filter(x => targetsFor(x.f).includes(target));
  const skipped = items.length - ok.length;
  if (target === 'redact' || target === 'prices') { // the editor with the suggestions for sensitive text
    const pdfs = ok.filter(x => x.kind === 'pdf').map(x => x.f);
    if (pdfs.length) { try { (await loadEditor()).open(pdfs, { find: true, preset: target === 'prices' ? 'prices' : null }); } catch (e) { toast(e.message); } }
    return;
  }
  if (target === 'edit') { // opens the PDF editor with every selected PDF
    const pdfs = ok.filter(x => x.kind === 'pdf').map(x => x.f);
    const mode = (document.querySelector('main[data-mode]') || {}).dataset?.mode || '';
    if (pdfs.length) { try { (await loadEditor()).open(pdfs, { redact: mode === 'redact', action: mode }); } catch (e) { toast(e.message); } }
    return;
  }
  if (target === 'merge') {
    if (!canMerge(ok.map(x => x.kind))) { toast(T('toast.mergeTwo')); return; }
    const j = newJob(`${ok.length} ${T('job.files')}`, 'merge');
    j.label = T('merge.name') + '.pdf'; j.srcLabel = 'PDF';
    track(j, async () => [{ name: T('merge.name') + '.pdf', blob: await mergeToPDF(ok.map(x => x.f), o, p => setProgress(j, p)) }]);
    return;
  }
  if (skipped) toast(T('toast.skipped', { n: skipped, t: label(target) }));
  if (!ok.length) return;
  // Images → one merged PDF
  const imgs = ok.filter(x => x.kind === 'image');
  if (target === 'pdf' && o.merge && imgs.length > 1) {
    const j = newJob(`${imgs.length} images`, 'pdf');
    j.label = 'images-merged.pdf';
    track(j, async () => {
      const cs = [];
      for (let i = 0; i < imgs.length; i++) {
        const { img, w, h } = await decodeImage(imgs[i].f);
        cs.push(drawToCanvas(img, w, h, o.maxDim || 2480, '#fff'));
        setProgress(j, (i + 1) / imgs.length * .8);
      }
      return [{ name: 'images-merged.pdf', blob: await imagesToPDF(cs, o.quality) }];
    });
  }
  for (const x of ok) {
    if (target === 'pdf' && o.merge && imgs.length > 1 && x.kind === 'image') continue;
    const j = newJob(x.f.name, target); j.src = x.f;
    track(j, () => CONVERT[x.kind](x.f, target, o, p => setProgress(j, p)));
  }
}
// Runs a job, and keeps how it was run, so a failed file can be tried again with the same
// settings (the other files in the batch keep their results).
function track(j, run) {
  j.retry = () => { j.status = 'working'; j.error = ''; j.progress = 0; renderJob(j); updateFoot(); track(j, run); };
  return schedule(async () => {
    const outs = await run();
    if (!outs || !outs.length) throw new Error(T('job.empty'));
    await finishJob(j, outs);
  }).catch(e => failJob(j, e));
}
function setProgress(j, p) { j.progress = p; const bar = j.el && j.el.querySelector('.bar'); if (bar) { bar.style.strokeDashoffset = 100.5 * (1 - p); j.el.querySelector('.ring-progress').classList.remove('spin'); } const st = j.el && j.el.querySelector('.state'); if (st) st.textContent = Math.round(p * 100) + '%'; }

const SHRINKS = new Set(['shrink', 'vshrink', 'imgedit', 'grey', 'clean', 'jpg', 'webp']);
function renderJob(j, isNew) {
  if (!j.el) { j.el = document.createElement('div'); }
  const el = j.el;
  el.className = 'row ' + j.status; el.style.setProperty('--k', kv(j.k));
  const name = j.out ? j.out.name : (j.label || base(j.srcName) + '.' + (OUT[j.target].tool ? 'pdf' : j.target));
  const srcExt = j.srcLabel || ext(j.srcName) || T('job.files');
  let thumb;
  if (j.status === 'working') thumb = `<svg class="ring-progress spin" viewBox="0 0 36 36" aria-hidden="true"><circle class="trk" cx="18" cy="18" r="16"/><circle class="bar" cx="18" cy="18" r="16" stroke-dasharray="100.5" stroke-dashoffset="${100.5 * (1 - Math.max(.25, j.progress))}"/></svg>`;
  else if (j.url || j.preview) thumb = `<img src="${j.url || j.preview}" alt=""${j.preview ? ' class="page"' : ''}>`;
  else thumb = esc(j.status === 'err' ? '!' : OUT[j.target].tool ? (ext(name) || 'pdf') : j.target);
  // Tools that make files smaller say how much: 8.4 MB → 2.1 MB · 75 % smaller
  const pct = j.status === 'done' && j.src && SHRINKS.has(j.target) && !/\.zip$/i.test(j.out.name) ? Math.round(100 * (1 - j.out.blob.size / j.src.size)) : 0;
  const state = j.status === 'working' ? (j.progress ? Math.round(j.progress * 100) + '%' : T('job.converting')) : j.status === 'done' ? (pct >= 1 ? T('job.smaller', { a: fmtSize(j.src.size), b: fmtSize(j.out.blob.size), p: pct }) : fmtSize(j.out.blob.size)) : '';
  const note = [j.noteKey ? T(j.noteKey, j.noteVars) : '', j.pages ? T('job.pages', { n: j.pages }) : ''].filter(Boolean).join(' · ');
  const next = j.status === 'done' ? nextSteps(j) : [];
  el.innerHTML = `<div class="thumb">${thumb}</div>
    <div class="info"><span class="fn" title="${esc(name)}">${esc(name)}</span>
    <span class="meta"><span class="route">${esc(srcExt.toUpperCase())} &rarr; <b>${esc(label(j.target))}</b></span><span class="state">${esc(state)}</span>${note ? `<span>${esc(note)}</span>` : ''}${j.error ? `<span class="msg">${esc(j.error)}</span>` : ''}</span></div>
    <div class="acts">${j.status === 'done' ? `${canShareFiles ? `<button class="btn sm ghost share" type="button">${esc(T('job.share'))}</button>` : ''}<button class="btn sm save" type="button">${esc(T(j.saved ? 'job.saved' : 'job.save'))}</button>` : j.status === 'err' ? `${j.error === T('err.pdf.locked') && j.src && j.target !== 'unlock' ? `<button class="btn sm unlock" type="button">${esc(T('tgt.unlock'))}</button>` : j.retry ? `<button class="btn sm retry" type="button">${esc(T('job.retry'))}</button>` : ''}<button class="btn sm ghost dismiss" type="button">${esc(T('job.dismiss'))}</button>` : ''}</div>
    ${next.length ? `<div class="next"><span>${esc(T('next.h'))}</span>${next.map(t => `<button type="button" class="nx" data-next="${t}">${esc(OUT[t] && OUT[t].tool ? T('tgt.' + t) : t.toUpperCase())}</button>`).join('')}</div>` : ''}`;
  el.querySelectorAll('[data-next]').forEach(b => { b.onclick = () => continueWith(j, b.dataset.next).catch(e => toast(e.message)); });
  const sh = el.querySelector('.share'); if (sh) sh.onclick = async () => { try { await navigator.share({ files: [new File([j.out.blob], j.out.name, { type: j.out.blob.type })], title: j.out.name }); } catch (e) { if (e.name !== 'AbortError') toast(T('save.failed')); } };
  const sv = el.querySelector('.save'); if (sv) sv.onclick = async () => { if (await saveFile(j.out.name, j.out.blob, sv)) j.saved = true; };
  const rt = el.querySelector('.retry'); if (rt) rt.onclick = () => j.retry();
  const ul = el.querySelector('.unlock'); if (ul) ul.onclick = () => { jobs = jobs.filter(x => x !== j); el.remove(); updateFoot(); runBatch([j.src], 'unlock'); };
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
// Long labels (BEARBEITEN, ANONYMISÉR …) get a smaller font so they stay inside their slice.
function fitLabel(text, room) { const w = text.length * 8.4; return w > room ? ` style="font-size:${Math.max(9, Math.floor(13 * room / w))}px"` : ''; }
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
      <text class="lab" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central"${fitLabel(label(t), n === 1 ? 999 : 2 * lr * Math.sin((a1 - a0) / 2) - 14)}>${esc(label(t))}</text></g>`;
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
  // Folders: the entries must be taken now, while the drop event lasts; reading them can wait.
  const entries = [...(e.dataTransfer.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  closeRing();
  const x = e.clientX, y = e.clientY;
  if (entries.some(en => en.isDirectory)) { filesFromFolders(entries).then(list => { const added = addFiles(list, { quiet: true }); afterAdd(added, x, y); }).catch(err => toast(err.message)); return; }
  if (!files.length) return;
  const added = addFiles(files);
  afterAdd(added, x, y);
});
// Everything inside the dropped folders (and their subfolders), sorted by path the way people
// number things (scan2 before scan10), so pages scanned in order stay in order.
const FOLDER_MAX = 500;
async function filesFromFolders(entries) {
  const out = [];
  const walk = async (en, path) => {
    if (out.length >= FOLDER_MAX) return;
    if (en.isFile) { if (!en.name.startsWith('.')) { const f = await new Promise((ok, no) => en.file(ok, no)); out.push({ path: path + en.name, f }); } return; }
    if (!en.isDirectory) return;
    const r = en.createReader();
    for (;;) { const batch = await new Promise((ok, no) => r.readEntries(ok, no)); if (!batch.length) break; for (const c of batch) await walk(c, path + en.name + '/'); }
  };
  for (const en of entries) await walk(en, '');
  const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  out.sort((a, b) => coll.compare(a.path, b.path));
  if (out.length >= FOLDER_MAX) toast(T('folder.max', { n: FOLDER_MAX }));
  return out.map(o => o.f);
}

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
// "Try it with a sample file": a made-up PDF from this site, opened as if the visitor had chosen it
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-sample]'); if (!b) return;
  b.disabled = true;
  try {
    const r = await fetch(b.dataset.sample); if (!r.ok) throw new Error(r.status);
    const file = new File([await r.blob()], b.dataset.sample.split('/').pop(), { type: 'application/pdf' });
    const added = addFiles([file]);
    if (added.length) { const p = $('pick').getBoundingClientRect(); afterAdd(added, Math.min(innerWidth / 2, p.left + p.width / 2), Math.min(innerHeight / 2 + 40, p.bottom + 170)); }
  } catch (err) { toast(T('job.failed')); } finally { b.disabled = false; }
});
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

// ---------- "Something went wrong? Send us the error" ----------
// When something fails, a small note offers to show what went wrong. Nothing is ever sent by itself:
// the person sees the text (no file contents), can edit it, and copies it or opens their own email with it.
const ERRS = [];
let errPillT;
// Messages written for people ("This video has no soundtrack…", "Wrong password") already say what to do;
// they are not faults, so they don't offer a report. Anything else (a real bug) does.
let knownMsgs = null;
function isKnownMessage(msg) {
  if (!knownMsgs) {
    const all = window.LV_STR || {}, rx = s => new RegExp('^' + String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '.+?') + '$');
    knownMsgs = [];
    for (const L of Object.keys(all)) for (const [k, v] of Object.entries(all[L])) if (/^(err|toast|job|pw|ocr|sc|im|ex|ed|find)\./.test(k) && typeof v === 'string') knownMsgs.push(rx(v));
  }
  return knownMsgs.some(r => r.test(msg));
}
function reportError(err, where) {
  const e = err instanceof Error ? err : new Error(String((err && err.message) || err || 'Unknown error'));
  if (/^(AbortError|NotAllowedError)$/.test(e.name)) return; // a closed Save as window is not an error
  if (where !== 'page' && isKnownMessage(e.message)) return;
  ERRS.push({ when: new Date().toISOString(), where: where || '', msg: e.message, stack: String(e.stack || '').split('\n').slice(0, 6).join('\n') });
  if (ERRS.length > 5) ERRS.shift();
  let pill = $('errPill');
  if (!pill) {
    pill = document.createElement('button'); pill.type = 'button'; pill.id = 'errPill'; pill.className = 'err-pill';
    pill.addEventListener('click', () => { pill.classList.remove('show'); openErrorReport(); });
    document.body.appendChild(pill);
  }
  pill.textContent = T('err.pill'); pill.classList.add('show');
  clearTimeout(errPillT); errPillT = setTimeout(() => pill.classList.remove('show'), 15000);
}
function errorText(note) {
  const v = ($('buildVer') && $('buildVer').title) || '';
  return [note ? note + '\n' : '', ...ERRS.map(x => `${x.when}${x.where ? ' · ' + x.where : ''}\n${x.msg}\n${x.stack}`),
    '---', 'Page: ' + location.pathname, 'Tool: ' + (PRESET || 'home') + ((document.querySelector('main[data-mode]') || {}).dataset?.mode ? ' / ' + document.querySelector('main').dataset.mode : ''),
    'Browser: ' + navigator.userAgent, v, 'Language: ' + document.documentElement.lang].filter(x => x !== '').join('\n');
}
function openErrorReport() {
  const d = document.createElement('dialog');
  d.className = 'pw-dialog err-dialog';
  d.innerHTML = `<form method="dialog"><h2>${esc(T('err.title'))}</h2><p class="pw-note">${esc(T('err.text'))}</p>
    <label>${esc(T('err.what'))}<input type="text" name="note" autocomplete="off"></label>
    <textarea name="txt" rows="8" spellcheck="false"></textarea>
    <div class="pw-btns"><button type="submit" class="btn sm">${esc(T('err.close'))}</button><button type="button" class="btn sm" data-a="copy">${esc(T('err.copy'))}</button><a class="btn sm primary" data-a="mail" href="#">${esc(T('err.mail'))}</a></div></form>`;
  const ta = d.querySelector('textarea'), note = d.querySelector('input'), mail = d.querySelector('[data-a="mail"]');
  ta.value = errorText('');
  const link = () => { mail.href = 'mailto:lee@midttech.com?subject=' + encodeURIComponent(T('report.subject')) + '&body=' + encodeURIComponent(((note.value ? note.value + '\n\n' : '') + ta.value).slice(0, 1500)); };
  link(); note.addEventListener('input', link); ta.addEventListener('input', link);
  d.querySelector('[data-a="copy"]').addEventListener('click', async ev => {
    const txt = (note.value ? note.value + '\n\n' : '') + ta.value;
    try { await navigator.clipboard.writeText(txt); } catch (e) { ta.select(); document.execCommand('copy'); }
    ev.target.textContent = T('err.copied');
  });
  d.addEventListener('close', () => d.remove());
  document.body.appendChild(d); d.showModal();
}
window.addEventListener('error', e => { if (e.error) reportError(e.error, 'page'); });
window.addEventListener('unhandledrejection', e => reportError(e.reason, 'page'));

// ---------- One-click recipes: a few steps people often need, done in one go ----------
// Each takes the chosen files and returns finished files, using the same converters as everything else.
const asFile = o => new File([o.blob], o.name, { type: o.blob.type || '' });
async function pdfjsDoc(file) { await lib('pdfjs'); pdfjsLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js'; return pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise; }
const RECIPES = {
  // photos or scans of paper → one PDF, small enough for e-mail
  'photos-pdf': { accept: 'image/*,.heic,.heif', async run(files, o, prog) {
    const imgs = files.filter(f => kindOf(f) === 'image'); if (!imgs.length) throw new Error(T('recipe.none'));
    const pdf = new File([await mergeToPDF(imgs, { ...o, maxDim: 2000, quality: .78 }, p => prog(p * .6))], 'photos.pdf', { type: 'application/pdf' });
    const small = await shrinkPDF(pdf, await pdfjsDoc(pdf), p => prog(.6 + p * .4));
    return [{ ...small[0], name: (imgs.length === 1 ? base(imgs[0].name) : 'photos') + '.pdf' }];
  } },
  // photos ready to share: smaller, and without location or camera details (a fresh JPG carries none)
  'share-photos': { accept: 'image/*,.heic,.heif', target: 'jpg', group: 'photos', async run(files, o, prog) {
    const imgs = files.filter(f => kindOf(f) === 'image'); if (!imgs.length) throw new Error(T('recipe.none'));
    const outs = [];
    for (const [i, f] of imgs.entries()) { outs.push(...await convertImage(f, 'jpg', { ...o, maxDim: 2048, quality: .82 })); prog((i + 1) / imgs.length); }
    return outs.map(x => ({ ...x, name: base(x.name) + '-share.jpg' }));
  } },
  // a PDF ready to send: hidden data (author, software, dates) removed, then made smaller
  'pdf-send': { accept: '.pdf,application/pdf', async run(files, o, prog) {
    const pdfs = files.filter(f => kindOf(f) === 'pdf'); if (!pdfs.length) throw new Error(T('recipe.none'));
    const outs = [];
    for (const [i, f] of pdfs.entries()) {
      const clean = asFile((await cleanPDF(f))[0]);
      const small = await shrinkPDF(clean, await pdfjsDoc(clean), p => prog((i + p) / pdfs.length));
      outs.push({ ...small[0], name: base(f.name) + '-ready.pdf' });
    }
    return outs;
  } },
  // a scanned PDF → searchable text, then small
  'scan-search': { accept: '.pdf,application/pdf', async run(files, o, prog) {
    const pdfs = files.filter(f => kindOf(f) === 'pdf'); if (!pdfs.length) throw new Error(T('recipe.none'));
    const outs = [];
    for (const [i, f] of pdfs.entries()) {
      const ocr = asFile((await ocrPDF(f, await pdfjsDoc(f), p => prog((i + p * .8) / pdfs.length)))[0]);
      const small = await shrinkPDF(ocr, await pdfjsDoc(ocr), p => prog((i + .8 + p * .2) / pdfs.length));
      outs.push({ ...small[0], name: base(f.name) + '-searchable.pdf' });
    }
    return outs;
  } },
  // Word files, pictures and PDFs → one PDF, in the order chosen
  'docs-one-pdf': { accept: '.pdf,.docx,.md,.txt,.html,image/*,.heic,.heif', async run(files, o, prog) {
    const parts = [];
    for (const [i, f] of files.entries()) {
      const k = kindOf(f);
      if (k === 'pdf' || k === 'image') parts.push(f);
      else if (k === 'doc') parts.push(asFile((await convertDoc(f, 'pdf', o))[0]));
      prog((i + 1) / files.length * .7);
    }
    if (!parts.length) throw new Error(T('recipe.none'));
    const blob = await mergeToPDF(parts, o, p => prog(.7 + p * .3));
    return [{ name: 'combined.pdf', blob: blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' }) }];
  } }
};
async function runRecipe(id, files) {
  const r = RECIPES[id]; if (!r || !files.length) return;
  const j = newJob(files.length === 1 ? files[0].name : (r.group || 'files'), r.target || 'pdf');
  j.srcLabel = T('recipe.' + id + '.t');
  // "kept the original" would be misleading after earlier steps changed the file
  const tidy = outs => outs.map(x => (x.noteKey === 'shrink.kept' ? { name: x.name, blob: x.blob } : x));
  try { await finishJob(j, tidy(await r.run(files, opts(), p => setProgress(j, Math.min(.99, p))))); }
  catch (e) { failJob(j, e); }
  const out = document.querySelector('.manifest'); if (out) out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-recipe]'); if (!b) return;
  const r = RECIPES[b.dataset.recipe]; if (!r) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = r.accept;
  inp.onchange = () => runRecipe(b.dataset.recipe, [...inp.files]);
  inp.click();
});

// ---------- QR code generator (its own page) ----------
// The code is made right here and holds the text itself, so there is no redirect link that could track or expire.
async function openQR() {
  const panel = document.querySelector('.panel'); if (!panel) return;
  await lib('qr');
  qrcode.stringToBytes = s => Array.from(new TextEncoder().encode(s));
  document.querySelectorAll('.main > .panel').forEach(el => { el.hidden = true; }); // no file list on this page
  const box = document.createElement('section'); box.className = 'qr-panel';
  const f = (id, key, type = 'text', extra = '') => `<label>${esc(T(key))}<input id="${id}" type="${type}" ${extra}></label>`;
  box.innerHTML = `<h2 id="h-qr" class="sr-only">${esc(T('qr.h'))}</h2>
    <div class="qr-grid"><div class="qr-form">
      <div class="seg qr-type" role="radiogroup" aria-label="${esc(T('qr.h'))}">${['link', 'wifi', 'contact'].map((k, i) => `<label><input type="radio" name="qrType" value="${k}"${i ? '' : ' checked'}><span>${esc(T('qr.' + k))}</span></label>`).join('')}</div>
      <div data-q="link"><label>${esc(T('qr.link'))}<textarea id="qrText" rows="3" placeholder="${esc(T('qr.linkPh'))}"></textarea></label></div>
      <div data-q="wifi" hidden>${f('qrSsid', 'qr.ssid')}${f('qrPass', 'qr.pass', 'text', 'autocomplete="off"')}
        <label>${esc(T('qr.sec'))}<select id="qrSec"><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">${esc(T('qr.secNone'))}</option></select></label>
        <label class="pw-show"><input type="checkbox" id="qrHidden"> ${esc(T('qr.hidden'))}</label></div>
      <div data-q="contact" hidden>${f('qrName', 'qr.name')}${f('qrPhone', 'qr.phone', 'tel')}${f('qrMail', 'qr.email', 'email')}${f('qrOrg', 'qr.org')}${f('qrWeb', 'qr.web', 'url')}</div>
      <label class="qr-color">${esc(T('qr.color'))}<input id="qrColor" type="color" value="#151a2d"></label>
      <div class="qr-logo"><span class="qr-logo-lbl">${esc(T('qr.logo'))}</span>
        <span class="qr-logo-row"><img id="qrLogoPrev" alt="" hidden><label class="btn sm qr-logo-pick"><input id="qrLogoFile" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" class="sr-only"><span id="qrLogoPickTxt">${esc(T('qr.logoAdd'))}</span></label>
          <button type="button" class="btn sm" id="qrLogoDel" hidden>${esc(T('qr.logoDel'))}</button>
          <label class="qr-logo-size" hidden>${esc(T('qr.logoSize'))} <select id="qrLogoSize"><option value=".16">${esc(T('qr.logoSmall'))}</option><option value=".22" selected>${esc(T('qr.logoMedium'))}</option><option value=".27">${esc(T('qr.logoLarge'))}</option></select></label></span>
        <small class="pw-note" id="qrLogoNote" hidden>${esc(T('qr.logoNote'))}</small></div>
      <p class="pw-note">${esc(T('qr.note'))}</p>
    </div><div class="qr-out"><canvas id="qrCanvas" width="512" height="512" aria-label="QR"></canvas><p class="qr-msg" id="qrMsg" aria-live="polite"></p>
      <div class="pw-btns"><button type="button" class="btn sm" id="qrSvg">${esc(T('qr.svg'))}</button><button type="button" class="btn sm primary" id="qrPng">${esc(T('qr.png'))}</button></div></div></div>`;
  panel.after(box);
  const $q = id => box.querySelector('#' + id), type = () => box.querySelector('input[name="qrType"]:checked').value;
  const escW = v => String(v).replace(/([\;,:"])/g, '\\$1'), escV = v => String(v).replace(/([\;,])/g, '\\$1').replace(/\n/g, '\\n');
  const payload = () => {
    const t = type();
    if (t === 'link') return $q('qrText').value.trim();
    if (t === 'wifi') { const ssid = $q('qrSsid').value; if (!ssid) return ''; const sec = $q('qrSec').value; return `WIFI:T:${sec};S:${escW(ssid)};${sec === 'nopass' ? '' : `P:${escW($q('qrPass').value)};`}${$q('qrHidden').checked ? 'H:true;' : ''};`; }
    const n = $q('qrName').value.trim(); if (!n && !$q('qrPhone').value && !$q('qrMail').value) return '';
    return ['BEGIN:VCARD', 'VERSION:3.0', `N:${escV(n.split(' ').slice(1).join(' '))};${escV(n.split(' ')[0] || '')};;;`, `FN:${escV(n)}`,
      $q('qrOrg').value && `ORG:${escV($q('qrOrg').value)}`, $q('qrPhone').value && `TEL;TYPE=CELL:${escV($q('qrPhone').value)}`,
      $q('qrMail').value && `EMAIL:${escV($q('qrMail').value)}`, $q('qrWeb').value && `URL:${escV($q('qrWeb').value)}`, 'END:VCARD'].filter(Boolean).join('\r\n');
  };
  let code = null, logo = null; // logo: { img, w, h, png (data URL for the SVG) }
  // Draws the code into a square of `size` pixels; with a logo, the modules under it are left out
  // and the logo sits on a white rounded patch (high error correction keeps the code readable).
  const paint = (ctx, size) => {
    const n = code.getModuleCount(), cell = size / (n + 8), off = 4 * cell;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    let hole = null;
    if (logo) { const L = Math.max(5, Math.round(n * +$q('qrLogoSize').value) | 1), s0 = (n - L) / 2; hole = [Math.floor(s0), Math.floor(s0) + L]; }
    ctx.fillStyle = $q('qrColor').value;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (hole && r >= hole[0] && r < hole[1] && c >= hole[0] && c < hole[1]) continue;
      if (code.isDark(r, c)) ctx.fillRect(Math.floor(off + c * cell), Math.floor(off + r * cell), Math.ceil(cell), Math.ceil(cell));
    }
    if (hole) {
      const x0 = off + hole[0] * cell, w = (hole[1] - hole[0]) * cell, pad = cell * .6;
      ctx.fillStyle = '#fff'; ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(x0, x0, w, w, cell) : ctx.rect(x0, x0, w, w)); ctx.fill();
      const room = w - 2 * pad, k = Math.min(room / logo.w, room / logo.h), lw = logo.w * k, lh = logo.h * k;
      ctx.drawImage(logo.img, x0 + (w - lw) / 2, x0 + (w - lh) / 2, lw, lh);
    }
    return { n, hole };
  };
  const draw = () => {
    box.querySelectorAll('[data-q]').forEach(d => { d.hidden = d.dataset.q !== type(); });
    const text = payload(), cv = $q('qrCanvas'), ctx = cv.getContext('2d'), msg = $q('qrMsg');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); code = null;
    if (!text) { msg.textContent = T('qr.empty'); return; }
    try { const q = qrcode(0, logo ? 'H' : 'M'); q.addData(text, 'Byte'); q.make(); code = q; } catch (e) { msg.textContent = T('qr.tooLong'); return; }
    msg.textContent = '';
    paint(ctx, cv.width);
  };
  box.addEventListener('input', e => { if (e.target.id !== 'qrLogoFile') draw(); }); box.addEventListener('change', e => { if (e.target.id !== 'qrLogoFile') draw(); });
  const showLogo = () => {
    $q('qrLogoPrev').hidden = $q('qrLogoDel').hidden = $q('qrLogoNote').hidden = !logo;
    box.querySelector('.qr-logo-size').hidden = !logo;
    $q('qrLogoPickTxt').textContent = T(logo ? 'qr.logoChange' : 'qr.logoAdd');
    if (logo) $q('qrLogoPrev').src = logo.png;
  };
  $q('qrLogoFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const { img, w, h } = await decodeImage(f);
      // kept as a PNG of sensible size: drawn on the canvas, and embedded as-is in the SVG
      const c = drawToCanvas(img, w, h, 600), png = c.toDataURL('image/png');
      logo = { img: c, w: c.width, h: c.height, png };
    } catch (err) { toast(T('qr.logoBad')); return; }
    showLogo(); draw();
  });
  $q('qrLogoDel').onclick = () => { logo = null; showLogo(); draw(); };
  const fileBase = () => 'qr-' + (type() === 'wifi' ? 'wifi' : type() === 'contact' ? 'contact' : 'code');
  $q('qrPng').onclick = async () => {
    if (!code) return draw();
    const n = code.getModuleCount(), size = Math.max(8, Math.ceil(1024 / (n + 8))) * (n + 8), c = document.createElement('canvas'); c.width = c.height = size;
    paint(c.getContext('2d'), size);
    download(fileBase() + '.png', await canvasToBlob(c, 'image/png'));
  };
  $q('qrSvg').onclick = () => {
    if (!code) return draw();
    const n = code.getModuleCount(); let d = '', hole = null, extra = '';
    if (logo) {
      const L = Math.max(5, Math.round(n * +$q('qrLogoSize').value) | 1), s0 = Math.floor((n - L) / 2); hole = [s0, s0 + L];
      const x0 = s0 + 4, pad = .6, room = L - 2 * pad, k = Math.min(room / logo.w, room / logo.h), lw = logo.w * k, lh = logo.h * k;
      extra = `<rect x="${x0}" y="${x0}" width="${L}" height="${L}" rx="1" fill="#fff"/><image href="${logo.png}" x="${(x0 + (L - lw) / 2).toFixed(3)}" y="${(x0 + (L - lh) / 2).toFixed(3)}" width="${lw.toFixed(3)}" height="${lh.toFixed(3)}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      if (hole && r >= hole[0] && r < hole[1] && k >= hole[0] && k < hole[1]) continue;
      if (code.isDark(r, k)) d += `M${k + 4} ${r + 4}h1v1h-1z`;
    }
    download(fileBase() + '.svg', new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 8} ${n + 8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${$q('qrColor').value}"/>${extra}</svg>`], { type: 'image/svg+xml' }));
  };
  draw();
}
if (PRESET === 'qr') openQR().catch(e => toast(e.message));

// The PDF editor (editor.js) uses these.
window.LVApp = {
  T, esc, lib, VENDOR, WIN_ANSI, base, toast: (m, ok, blob) => toast(m, ok, blob), reportError, qpdf, tidyPDF, pickTarget, writeTo, download, loadPdfBytes, askOptions,
  openTools(files) { const added = addFiles(files); afterAdd(added, innerWidth / 2, innerHeight / 2); },
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

// ---------- "Buy us a coffee": the company's MobilePay number, shown in a small window ----------
// A plain number, no payment script or tracking is loaded. Change it here.
const MOBILEPAY = '549075', MOBILEPAY_URL = 'https://qr.mobilepay.dk/vp/ZrUTxp1tM';
document.addEventListener('click', e => {
  if (!e.target.closest('[data-coffee]')) return;
  e.preventDefault();
  const d = document.createElement('dialog');
  d.className = 'pw-dialog coffee-dialog';
  d.innerHTML = `<form method="dialog">
    <div class="coffee-cup" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c0 1.2 1 1.4 1 2.6M12 3c0 1.2 1 1.4 1 2.6"/></svg></div>
    <h2>${esc(T('coffee.title'))}</h2>
    <p>${esc(T('coffee.text'))}</p>
    <a class="btn primary coffee-open" href="${MOBILEPAY_URL}" target="_blank" rel="noopener">${esc(T('coffee.open'))}</a>
    <div class="coffee-qr"><img src="/icons/mobilepay-qr.png" width="180" height="180" alt="${esc(T('coffee.qrAlt'))}"><span>${esc(T('coffee.scan'))}</span></div>
    <div class="coffee-no"><span>${esc(T('coffee.number'))}</span><b>${esc(MOBILEPAY)}</b><button type="button" class="btn sm ghost" data-copy>${esc(T('coffee.copy'))}</button></div>
    <p class="coffee-note">${esc(T('coffee.note'))}</p>
    <div class="coffee-btns"><button type="submit" class="btn ghost">${esc(T('coffee.close'))}</button></div>
  </form>`;
  d.querySelector('[data-copy]').onclick = async ev => {
    try { await navigator.clipboard.writeText(MOBILEPAY); ev.target.textContent = T('coffee.copied'); } catch (err) {}
  };
  d.addEventListener('close', () => d.remove());
  document.body.appendChild(d); d.showModal();
});

// ---------- "See how it works": the convert video in a small window ----------
// Subtitles in every language; the video itself is the Danish or the English one.
// bump when a video changes, so browsers fetch the new one instead of a kept copy
const VIDEO_REV = '?v=20261102';
const SUB_NAMES = { da: 'Dansk', en: 'English', sv: 'Svenska', no: 'Norsk', de: 'Deutsch', es: 'Español', fr: 'Français' };
function subTracks(key, page) {
  const order = [page, 'en', 'da', 'sv', 'no', 'de', 'es', 'fr'].filter((l, i, a) => SUB_NAMES[l] && a.indexOf(l) === i);
  return order.map((l, i) => `<track kind="subtitles" srclang="${l}" label="${SUB_NAMES[l]}" src="/videos/${key}.${l}.vtt${VIDEO_REV}"${i === 0 ? ' default' : ''}>`).join('');
}
function playVideo(key, title, page) {
  const L = page === 'da' ? 'da' : 'en';
  const d = document.createElement('dialog');
  d.className = 'pw-dialog howto-dialog';
  d.innerHTML = `<form method="dialog"><div class="howto-head"><h2>${esc(title)}</h2><button type="submit" class="ed-ico" aria-label="${esc(T('coffee.close'))}">×</button></div>
    <video controls playsinline autoplay preload="auto" width="1280" height="720" poster="/videos/${key}-${L}.jpg${VIDEO_REV}"><source src="/videos/${key}-${L}.mp4${VIDEO_REV}" type="video/mp4">${subTracks(key, page)}</video>
    <p class="howto-cap">${esc(T('howto.caption'))}</p></form>`;
  d.addEventListener('close', () => { const v = d.querySelector('video'); if (v) v.pause(); d.remove(); });
  document.body.appendChild(d); d.showModal();
}
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-howto]'); if (!btn) return;
  playVideo('convert', T('howto.title'), btn.dataset.howto);
});
// First visit: a small, polite offer of a 40-second welcome video. Shown once; never again after a choice.
(() => {
  const KEY = 'lunaverta-welcome';
  // only on the front page, and only until the visitor has made a choice
  try { if (localStorage.getItem(KEY) || PRESET) return; } catch (e) { return; }
  const L = document.documentElement.lang === 'da' ? 'da' : 'en';
  const card = document.createElement('div');
  card.className = 'welcome-card'; card.setAttribute('role', 'region'); card.setAttribute('aria-label', T('welcome.title'));
  card.innerHTML = `<img src="/videos/welcome-${L}-thumb.jpg" alt="" width="96" height="54"><div><b>${esc(T('welcome.ask'))}</b><button type="button" class="linkish" data-w="play">▶ ${esc(T('welcome.watch'))}</button></div><button type="button" class="ed-ico" data-w="close" aria-label="${esc(T('welcome.close'))}" title="${esc(T('welcome.close'))}">×</button>`;
  const done = () => { try { localStorage.setItem(KEY, '1'); } catch (e) {} card.remove(); };
  card.querySelector('[data-w="close"]').onclick = done;
  card.querySelector('[data-w="play"]').onclick = () => { done(); playVideo('welcome', T('welcome.title'), document.documentElement.lang); };
  card.querySelector('img').onclick = card.querySelector('[data-w="play"]').onclick;
  setTimeout(() => { document.body.appendChild(card); requestAnimationFrame(() => card.classList.add('show')); }, 2500);
})();

// ---------- iPhone/iPad: stop Safari zooming in when a small text field is tapped ----------
// iOS ignores maximum-scale for pinch zoom, so people can still zoom by hand.
if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp && !/maximum-scale/.test(vp.content)) vp.content += ', maximum-scale=1';
  document.documentElement.classList.add('ios');
}

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
    // One PDF opened from Windows/macOS ("Open with", or LunaVerta as the PDF reader): show it
    // straight away, like a PDF reader. The handle lets the editor save back to the same file.
    if (files.length === 1 && kindOf(files[0]) === 'pdf') {
      try { (await loadViewer()).open(files[0], params.files[0]); return; } catch (e) { /* fall back to the tools */ }
    }
    const added = addFiles(files);
    afterAdd(added, innerWidth / 2, innerHeight / 2);
  });
}

// "Install as an app": offered only when the browser can install it, as a small button in the footer.
// Once installed, files can be opened from the computer (above) and it works offline.
let installEvt = null;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); installEvt = e;
  if ($('installApp')) return;
  const foot = document.querySelector('footer'); if (!foot) return;
  const b = document.createElement('button'); b.type = 'button'; b.id = 'installApp'; b.className = 'install-app';
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"/></svg><span data-i18n="install.btn">${esc(T('install.btn'))}</span>`;
  b.title = T('install.hint'); b.setAttribute('data-i18n-attr', 'title:install.hint');
  b.addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); if (r && r.outcome === 'accepted') b.remove(); installEvt = null; });
  foot.insertBefore(b, foot.querySelector('.foot-promise'));
  installHint();
});
addEventListener('appinstalled', () => { toast(T('toast.installed')); const b = $('installApp'); if (b) b.remove(); $('installHint')?.remove(); });
// Chrome and Edge on a computer: a small card at the top right, with an arrow up towards the install
// icon in the address bar and a button that opens the same install window. Only when the browser says
// LunaVerta can be installed (so never when it already is), and never again once closed.
const HINT_KEY = 'lunaverta-install-hint';
function installHint() {
  const brands = ((navigator.userAgentData && navigator.userAgentData.brands) || []).map(b => b.brand).join(' ');
  if (!/Google Chrome|Microsoft Edge/.test(brands) || navigator.userAgentData.mobile || !matchMedia('(pointer: fine) and (min-width: 900px)').matches) return;
  try { if (localStorage.getItem(HINT_KEY)) return; } catch (e) { return; }
  if ($('installHint') || document.documentElement.classList.contains('ed-open') || document.documentElement.classList.contains('vw-open')) return;
  setTimeout(() => {
    if (!installEvt || tray.length || jobs.length || $('installHint') || document.documentElement.classList.contains('ed-open')) return;
    const h = document.createElement('aside'); h.id = 'installHint'; h.className = 'install-hint'; h.setAttribute('aria-labelledby', 'installHintH');
    // Where the install icon sits differs: Edge has more buttons to the right of the address bar
    // (profile, menu, Copilot) than Chrome. Measured from the right edge of the window, at 100 % zoom.
    const edge = /Microsoft Edge/.test(brands), fromRight = edge ? 260 : 150;
    const icon = edge
      ? '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M17.5 3v7M14 6.5h7"/></svg>'
      : '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4M12 7v5m0 0-2.5-2.5M12 12l2.5-2.5"/></svg>';
    h.innerHTML = `<span class="ih-arrow" aria-hidden="true" style="right:${fromRight - 20 - 12}px"><svg viewBox="0 0 24 30"><path d="M12 28V4m0 0-8 8m8-8 8 8"/></svg></span>
      <b id="installHintH">${esc(T('install.hintH'))}</b><p>${esc(T('install.hintP'))}</p>
      <p class="ih-look">${esc(T('install.look'))} <span class="ih-ico" aria-hidden="true">${icon}</span></p>
      <div class="ih-acts"><button type="button" class="btn sm primary" data-ih="go">${esc(T('install.btn'))}</button><button type="button" class="btn sm ghost" data-ih="no">${esc(T('install.later'))}</button></div>`;
    const gone = () => { h.remove(); try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {} };
    h.addEventListener('click', async e => {
      const b = e.target.closest('[data-ih]'); if (!b) return;
      if (b.dataset.ih === 'no' || !installEvt) { gone(); return; }
      installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null);
      if (r && r.outcome === 'accepted') { $('installApp')?.remove(); installEvt = null; } gone();
    });
    document.body.appendChild(h);
  }, 2500);
}
// Files added or the editor opened: the card steps aside (it is shown again on a later visit).
document.addEventListener('lv-files', () => $('installHint')?.remove());

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
    // A small note that stays until it is answered (a toast was easy to miss).
    const busy = tray.length || jobs.length || document.documentElement.classList.contains('ed-open');
    const n = document.createElement('div'); n.className = 'upd-note'; n.setAttribute('role', 'status');
    n.innerHTML = `<span><b>${esc(T('toast.updated'))}</b>${busy ? ' ' + esc(T('upd.later')) : ''}</span>
      ${busy ? '' : `<button type="button" class="btn sm primary" data-u="go">${esc(T('toast.reload'))}</button>`}<button type="button" class="btn sm" data-u="no">${esc(T(busy ? 'err.close' : 'upd.close'))}</button>`;
    n.addEventListener('click', e => { const u = e.target.closest('[data-u]'); if (!u) return; if (u.dataset.u === 'go') location.reload(); else n.remove(); });
    document.body.appendChild(n);
  });
}
const net = $('net');
const showNet = () => { net.hidden = navigator.onLine; };
addEventListener('online', showNet); addEventListener('offline', showNet); showNet();

// ---------- the list of all tools: search as you type, and "Show all" for long groups on phones ----------
// Every tool in the list carries its name, description and extra search words (in all languages) in data-k,
// so "smaller", "signature" or "flette" find the right tool even when its name says something else.
document.querySelectorAll('.tg-more').forEach(b => b.addEventListener('click', () => {
  const g = b.closest('.tg'); g.classList.remove('folded'); b.remove();
  const next = g.querySelectorAll('.tool-grid li')[8]; if (next) next.querySelector('a').focus();
}));
const find = $('toolFind');
if (find) {
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/œ/g, 'oe');
  const nav = find.closest('.tools'), none = $('toolNone');
  const items = [...nav.querySelectorAll('.tool-grid li')].map(li => ({ li, words: fold(li.dataset.k || li.textContent).split(/[^a-z0-9]+/).filter(Boolean) }));
  const groups = [...nav.querySelectorAll('.tg')];
  const run = () => {
    const q = fold(find.value).split(/[^a-z0-9]+/).filter(Boolean);
    nav.classList.toggle('searching', q.length > 0);
    let hits = 0;
    for (const it of items) { const ok = !q.length || q.every(w => it.words.some(x => x.startsWith(w))); it.li.hidden = !ok; if (ok) hits++; }
    for (const g of groups) {
      const n = g.querySelectorAll('.tool-grid li:not([hidden])').length, small = g.querySelector('h3 small');
      g.hidden = q.length > 0 && !n;
      if (small) { small.dataset.n = small.dataset.n || small.textContent; small.textContent = q.length ? n : small.dataset.n; }
    }
    none.hidden = hits > 0;
  };
  find.addEventListener('input', run);
  find.addEventListener('keydown', e => {
    if (e.key === 'Escape' && find.value) { find.value = ''; run(); e.preventDefault(); }
    if (e.key === 'Enter') { const first = nav.querySelector('.tool-grid li:not([hidden]) a'); if (first && find.value.trim()) { e.preventDefault(); location.href = first.href; } }
  });
  if (find.value) run(); // the browser may restore the text when going back
}
// "Copy link" on a tool page: the address of the tool, never any file.
const cl = $('copyLink');
if (cl) cl.onclick = async () => {
  const u = location.origin + location.pathname;
  try { await navigator.clipboard.writeText(u); toast(T('link.copied'), true); } catch (e) { toast(u); }
};
// "Clear everything": for shared computers. Removes what this visit left in the browser.
if ($('clearAll')) $('clearAll').onclick = async () => {
  const a = await askOptions(T('clear.title'), [{ id: 'saved', type: 'check', label: T('clear.saved') }], 'clear.ok', T('clear.note'));
  if (!a) return;
  tray = []; renderTray();
  jobs.forEach(j => j.url && URL.revokeObjectURL(j.url)); jobs = jobs.filter(j => j.status === 'working');
  $('manifest').querySelectorAll('.row:not(.working)').forEach(r => r.remove()); updateFoot();
  document.querySelector('.draft-bar')?.remove();
  try { indexedDB.deleteDatabase('lunaverta-draft'); } catch (e) {}
  try { if ('caches' in window) caches.delete('lunaverta-share'); } catch (e) {}
  if (a.saved) try { ['lunaverta-signatures', 'lunaverta-templates'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
  toast(T('clear.done'), true);
};
// The search at the top of the front page: the first matches drop down under it, so a visitor
// who knows what they want can go straight there. Enter opens the first one.
const top = $('topFind'), hits = $('topHits');
if (top && find) {
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/œ/g, 'oe');
  const items = [...document.querySelectorAll('.tools .tool-grid li')].map(li => ({ a: li.querySelector('a'), words: fold(li.dataset.k || li.textContent).split(/[^a-z0-9]+/).filter(Boolean) }));
  const show = () => {
    const q = fold(top.value).split(/[^a-z0-9]+/).filter(Boolean);
    const found = q.length ? items.filter(it => q.every(w => it.words.some(x => x.startsWith(w)))) : [];
    hits.innerHTML = q.length ? (found.length ? found.slice(0, 6).map(it => `<li><a href="${it.a.getAttribute('href')}">${it.a.innerHTML}</a></li>`).join('') + (found.length > 6 ? `<li class="more"><a href="#h-tools" data-all="1">${esc(T('tools.allHits', { n: found.length }))}</a></li>` : '') : `<li class="none">${esc(T('tools.none'))}</li>`) : '';
    hits.hidden = !q.length;
    top.setAttribute('aria-expanded', String(!hits.hidden));
  };
  top.addEventListener('input', show);
  top.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const a = hits.querySelector('a:not([data-all])'); if (a) { e.preventDefault(); location.href = a.href; } }
    if (e.key === 'ArrowDown') { const a = hits.querySelector('a'); if (a) { e.preventDefault(); a.focus(); } }
    if (e.key === 'Escape' && top.value) { top.value = ''; show(); e.preventDefault(); }
  });
  hits.addEventListener('keydown', e => {
    const links = [...hits.querySelectorAll('a')], i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? links[i - 1] : top).focus(); }
    if (e.key === 'Escape') { e.preventDefault(); top.focus(); hits.hidden = true; }
  });
  // "All N results": the full list below, filtered by the same words
  hits.addEventListener('click', e => { if (!e.target.closest('[data-all]')) return; find.value = top.value; find.dispatchEvent(new Event('input')); hits.hidden = true; });
  document.addEventListener('click', e => { if (!e.target.closest('.top-find')) hits.hidden = true; });
  top.addEventListener('focus', () => { if (top.value) show(); });
}
})();
