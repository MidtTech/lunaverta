// LunaVerta: removes text from a PDF page for real. The page's drawing
// instructions are read, the letters inside a line are found by position, and
// those letters are taken out of the instructions, so the text is gone rather
// than covered. When only some words are deleted, the rest of the line keeps
// its original font and closes up. Works with pdf-lib (window.PDFLib).
(() => {
'use strict';

// ---------- reading the instructions ----------
const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set([40, 41, 60, 62, 91, 93, 123, 125, 47, 37]);

function tokenize(s) {
  // s is a binary string (one char per byte). Returns operators with operands
  // and the character range they cover.
  const ops = [];
  let i = 0, args = [], argStart = -1;
  const n = s.length;
  const skipWs = () => {
    for (;;) {
      while (i < n && WS.has(s.charCodeAt(i))) i++;
      if (s[i] === '%') { while (i < n && s[i] !== '\n' && s[i] !== '\r') i++; continue; }
      return;
    }
  };
  function value() {
    const c = s[i];
    if (c === '(') {
      let depth = 1, out = '';
      i++;
      while (i < n && depth) {
        const ch = s[i];
        if (ch === '\\') {
          const nx = s[i + 1];
          const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
          if (nx in map) { out += map[nx]; i += 2; }
          else if (nx >= '0' && nx <= '7') { let o = ''; i++; while (o.length < 3 && s[i] >= '0' && s[i] <= '7') o += s[i++]; out += String.fromCharCode(parseInt(o, 8) & 255); }
          else if (nx === '\r') { i += s[i + 2] === '\n' ? 3 : 2; }
          else if (nx === '\n') { i += 2; }
          else { i++; }
          continue;
        }
        if (ch === '(') depth++;
        else if (ch === ')') { depth--; if (!depth) { i++; break; } }
        out += ch; i++;
      }
      return { t: 'str', v: out };
    }
    if (c === '<' && s[i + 1] === '<') {
      i += 2; const d = [];
      for (;;) { skipWs(); if (i >= n) break; if (s[i] === '>' && s[i + 1] === '>') { i += 2; break; } d.push(value()); }
      return { t: 'dict', v: d };
    }
    if (c === '<') {
      const end = s.indexOf('>', i);
      let hex = s.slice(i + 1, end < 0 ? n : end).replace(/[^0-9a-fA-F]/g, '');
      if (hex.length % 2) hex += '0';
      let out = '';
      for (let k = 0; k < hex.length; k += 2) out += String.fromCharCode(parseInt(hex.substr(k, 2), 16));
      i = end < 0 ? n : end + 1;
      return { t: 'str', v: out };
    }
    if (c === '[') {
      i++; const a = [];
      for (;;) { skipWs(); if (i >= n) break; if (s[i] === ']') { i++; break; } a.push(value()); }
      return { t: 'arr', v: a };
    }
    if (c === '/') {
      let j = i + 1;
      while (j < n && !WS.has(s.charCodeAt(j)) && !DELIM.has(s.charCodeAt(j))) j++;
      const v = s.slice(i + 1, j); i = j; return { t: 'name', v };
    }
    let j = i;
    while (j < n && !WS.has(s.charCodeAt(j)) && !DELIM.has(s.charCodeAt(j))) j++;
    if (j === i) { i++; return { t: 'junk' }; }
    const word = s.slice(i, j); i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return { t: 'num', v: parseFloat(word) };
    return { t: 'op', v: word };
  }
  for (;;) {
    skipWs();
    if (i >= n) break;
    const start = i;
    const v = value();
    if (v.t !== 'op') { if (argStart < 0) argStart = start; args.push(v); continue; }
    if (v.v === 'BI') {
      // inline image: skip its data up to EI
      const id = s.indexOf('ID', i);
      let k = id < 0 ? n : id + 3;
      const re = /[\0\t\n\f\r ]EI(?=[\0\t\n\f\r ]|$)/g;
      re.lastIndex = k; const m = re.exec(s);
      i = m ? m.index + 3 : n;
      ops.push({ op: 'BI', args: [], start: argStart < 0 ? start : argStart, end: i });
    } else ops.push({ op: v.v, args, start: argStart < 0 ? start : argStart, end: i });
    args = []; argStart = -1;
  }
  return ops;
}

// ---------- fonts ----------
const toUni = bytes => { let s = ''; for (let k = 0; k + 1 < bytes.length; k += 2) s += String.fromCharCode(bytes.charCodeAt(k) << 8 | bytes.charCodeAt(k + 1)); return s; };
const hexBytes = h => { let s = ''; h = h.replace(/[^0-9a-fA-F]/g, ''); if (h.length % 2) h += '0'; for (let k = 0; k < h.length; k += 2) s += String.fromCharCode(parseInt(h.substr(k, 2), 16)); return s; };
const hexNum = h => parseInt(h.replace(/[^0-9a-fA-F]/g, '') || '0', 16);
function parseToUnicode(text) {
  const map = new Map();
  for (const blk of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const m of blk[1].matchAll(/<([0-9a-fA-F\s]+)>\s*<([0-9a-fA-F\s]*)>/g)) map.set(hexNum(m[1]), toUni(hexBytes(m[2])));
  for (const blk of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of blk[1].matchAll(/<([0-9a-fA-F\s]+)>\s*<([0-9a-fA-F\s]+)>\s*(<[0-9a-fA-F\s]*>|\[[^\]]*\])/g)) {
      const lo = hexNum(m[1]), hi = Math.min(hexNum(m[2]), lo + 65535);
      if (m[3][0] === '[') { const list = [...m[3].matchAll(/<([0-9a-fA-F\s]*)>/g)]; for (let c = lo; c <= hi && c - lo < list.length; c++) map.set(c, toUni(hexBytes(list[c - lo][1]))); }
      else { const base = hexBytes(m[3].slice(1, -1)); const u = toUni(base); for (let c = lo; c <= hi; c++) map.set(c, u.slice(0, -1) + String.fromCharCode(u.charCodeAt(u.length - 1) + (c - lo))); }
    }
  }
  return map;
}
const CP1252 = (() => { try { return new TextDecoder('windows-1252'); } catch (e) { return null; } })();
function fontInfo(P, dict, streamText) {
  const N = k => P.PDFName.of(k);
  const num = o => (o && o.asNumber ? o.asNumber() : (o && typeof o.numberValue === 'number' ? o.numberValue : null));
  const name = o => (o && o.decodeText ? o.decodeText() : o ? String(o).replace(/^\//, '') : '');
  const sub = name(dict.lookup(N('Subtype')));
  const f = { ok: true, bytes: 1, widths: new Map(), dw: 0, scale: .001, uni: null, std: name(dict.lookup(N('BaseFont'))) };
  try {
    const tu = dict.lookup(N('ToUnicode'));
    if (tu) f.uni = parseToUnicode(streamText(tu));
  } catch (e) {}
  if (sub === 'Type0') {
    const enc = name(dict.lookup(N('Encoding')));
    if (!/^Identity-[HV]$/.test(enc)) f.ok = false;
    f.bytes = 2;
    const desc = dict.lookup(N('DescendantFonts')); const cid = desc && desc.lookup ? desc.lookup(0) : null;
    f.dw = 1000;
    if (cid) {
      const dw = num(cid.lookup(N('DW'))); if (dw !== null) f.dw = dw;
      const w = cid.lookup(N('W'));
      if (w && w.size) {
        for (let k = 0; k < w.size();) {
          const a = num(w.lookup(k)), b = w.lookup(k + 1);
          if (b && b.size) { for (let j = 0; j < b.size(); j++) f.widths.set(a + j, num(b.lookup(j))); k += 2; }
          else { const last = num(b), wv = num(w.lookup(k + 2)); for (let c = a; c <= last && c - a < 65536; c++) f.widths.set(c, wv); k += 3; }
        }
      }
    }
    return f;
  }
  if (sub === 'Type3') {
    const fm = dict.lookup(N('FontMatrix')); if (fm && fm.size) f.scale = num(fm.lookup(0)) || .001;
  }
  const first = num(dict.lookup(N('FirstChar'))) || 0, ws = dict.lookup(N('Widths'));
  if (ws && ws.size) for (let k = 0; k < ws.size(); k++) f.widths.set(first + k, num(ws.lookup(k)));
  const fd = dict.lookup(N('FontDescriptor'));
  const mw = fd && num(fd.lookup(N('MissingWidth')));
  f.dw = mw || 0;
  f.noWidths = !(ws && ws.size);
  return f;
}
function charOf(f, code) {
  if (f.uni && f.uni.has(code)) return f.uni.get(code);
  if (f.bytes === 2) return null;
  if (code < 128) return String.fromCharCode(code);
  return CP1252 ? CP1252.decode(new Uint8Array([code])) : String.fromCharCode(code);
}

// The 14 standard fonts may come without widths; take them from pdf-lib.
function stdWidth(base) {
  const P = window.PDFLib, b = (base || '').replace(/^[A-Z]{6}\+/, '');
  const bold = /bold|black|heavy/i.test(b), it = /italic|oblique/i.test(b);
  let name;
  if (/symbol/i.test(b)) name = 'Symbol';
  else if (/dingbat/i.test(b)) name = 'ZapfDingbats';
  else if (/courier|mono/i.test(b)) name = 'Courier' + (bold || it ? '-' + (bold ? 'Bold' : '') + (it ? 'Oblique' : '') : '');
  else if (/times|roman|serif/i.test(b) && !/sans/i.test(b)) name = 'Times-' + (bold ? (it ? 'BoldItalic' : 'Bold') : it ? 'Italic' : 'Roman');
  else name = 'Helvetica' + (bold || it ? '-' + (bold ? 'Bold' : '') + (it ? 'Oblique' : '') : '');
  let emb = null;
  try { emb = P.StandardFontEmbedder.for(name); } catch (e) {}
  return code => {
    if (!emb) return 500;
    try { return emb.widthOfTextAtSize(code < 128 ? String.fromCharCode(code) : CP1252.decode(new Uint8Array([code])), 1000); } catch (e) { return 500; }
  };
}

// ---------- matrices ----------
const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3], m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// ---------- the main job ----------
// edits: [{ x, y, w, size, orig, text }] in PDF user space (as pdf.js reports).
// Returns, per edit, 'kept' (only deleted words were removed, nothing to draw),
// 'removed' (the whole line was removed, draw the new text), 'picture' (the
// line is part of a picture: its hidden text layer was removed, but it must
// still be covered) or 'failed'.
async function strip(doc, page, edits) {
  const P = window.PDFLib, N = k => P.PDFName.of(k);
  const result = edits.map(() => 'failed');
  const decode = st => (st instanceof P.PDFRawStream ? P.decodePDFRawStream(st).decode() : st.getContents ? st.getContents() : new Uint8Array());
  const bin = u8 => { let s = ''; for (let k = 0; k < u8.length; k += 8192) s += String.fromCharCode.apply(null, u8.subarray(k, k + 8192)); return s; };
  const streamText = st => bin(decode(st));
  let src;
  try {
    const c = page.node.Contents();
    if (!c) return result;
    const parts = [];
    if (c.size && !(c instanceof P.PDFStream)) for (let k = 0; k < c.size(); k++) parts.push(streamText(c.lookup(k)));
    else parts.push(streamText(c));
    src = parts.join('\n');
  } catch (e) { console.warn('Could not read page content', e); return result; }
  const ops = tokenize(src);
  const res = page.node.Resources();
  const fontDict = res && res.lookup(N('Font'));
  const fonts = {};
  const stdFonts = {};
  const getFont = async nm => {
    if (nm in fonts) return fonts[nm];
    let f = null;
    try {
      const d = fontDict && fontDict.lookup(N(nm));
      if (d) {
        f = fontInfo(P, d, streamText);
        if (f.noWidths) f.stdWidth = stdWidth(f.std);
      }
    } catch (e) { console.warn('Font', nm, e); }
    return (fonts[nm] = f);
  };

  // pass 1: find every letter and where it is drawn
  const glyphs = [];
  let gs = { ctm: [1, 0, 0, 1, 0, 0], tr: 0, tc: 0, tw: 0, th: 1, tl: 0, rise: 0, font: null, fs: 0 };
  const stack = [];
  let tm = [1, 0, 0, 1, 0, 0], tlm = tm;
  const nums = a => a.map(x => (x.t === 'num' ? x.v : 0));
  const show = async (op, idx, items) => {
    const f = gs.font;
    op.show = { factor: 0, ok: false };
    if (!f || !f.ok || !gs.fs || !gs.th) return;
    const trm0 = mul(tm, gs.ctm);
    const sx = Math.hypot(trm0[0], trm0[1]);
    op.show = { ok: true, factor: 1000 / (gs.fs * gs.th * (sx || 1)), bytes: f.bytes };
    let k = 0;
    for (const it of items) {
      if (it.t === 'num') { tm = mul([1, 0, 0, 1, -it.v / 1000 * gs.fs * gs.th, 0], tm); continue; }
      if (it.t !== 'str') continue;
      const s = it.v;
      for (let p = 0; p + f.bytes <= s.length; p += f.bytes) {
        const code = f.bytes === 2 ? (s.charCodeAt(p) << 8 | s.charCodeAt(p + 1)) : s.charCodeAt(p);
        let w = f.widths.get(code);
        if (w === undefined || w === null) w = f.stdWidth ? f.stdWidth(code) : f.dw || (f.bytes === 2 ? 1000 : 500);
        const w0 = w * f.scale;
        const adv = (w0 * gs.fs + gs.tc + (f.bytes === 1 && code === 32 ? gs.tw : 0)) * gs.th;
        const m = mul(tm, gs.ctm);
        const [x0, y0] = apply(m, 0, gs.rise);
        const [x1] = apply(m, w0 * gs.fs * gs.th, gs.rise);
        const [, yc] = apply(m, 0, gs.rise + gs.fs * .3);
        const [xa] = apply(m, adv, gs.rise);
        glyphs.push({ op: idx, k: k++, code, xL: Math.min(x0, x1), xR: Math.max(x0, x1), xc: (x0 + x1) / 2, yc, y0, adv: xa - x0, ch: charOf(f, code), hidden: gs.tr === 3 || gs.tr === 7, upright: Math.abs(m[1]) < 1e-6 && Math.abs(m[2]) < 1e-6 && m[0] > 0 });
        tm = mul([1, 0, 0, 1, adv, 0], tm);
      }
    }
  };
  for (let idx = 0; idx < ops.length; idx++) {
    const o = ops[idx], a = o.args;
    switch (o.op) {
      case 'q': stack.push({ ...gs }); break;
      case 'Q': if (stack.length) gs = stack.pop(); break;
      case 'cm': gs.ctm = mul(nums(a), gs.ctm); break;
      case 'BT': tm = tlm = [1, 0, 0, 1, 0, 0]; break;
      case 'Tf': gs.font = a[0] && a[0].t === 'name' ? await getFont(a[0].v) : null; gs.fs = a[1] && a[1].t === 'num' ? a[1].v : 0; break;
      case 'Tc': gs.tc = nums(a)[0] || 0; break;
      case 'Tw': gs.tw = nums(a)[0] || 0; break;
      case 'Tz': gs.th = (nums(a)[0] ?? 100) / 100; break;
      case 'TL': gs.tl = nums(a)[0] || 0; break;
      case 'Ts': gs.rise = nums(a)[0] || 0; break;
      case 'Tr': gs.tr = nums(a)[0] || 0; break;
      case 'Td': { const [x, y] = nums(a); tm = tlm = mul([1, 0, 0, 1, x, y], tlm); break; }
      case 'TD': { const [x, y] = nums(a); gs.tl = -y; tm = tlm = mul([1, 0, 0, 1, x, y], tlm); break; }
      case 'Tm': tm = tlm = nums(a); break;
      case 'T*': tm = tlm = mul([1, 0, 0, 1, 0, -gs.tl], tlm); break;
      case 'Tj': await show(o, idx, [a[0]]); break;
      case 'TJ': await show(o, idx, a[0] && a[0].t === 'arr' ? a[0].v : []); break;
      case "'": tm = tlm = mul([1, 0, 0, 1, 0, -gs.tl], tlm); await show(o, idx, [a[0]]); break;
      case '"': { const [aw, ac] = nums(a); gs.tw = aw; gs.tc = ac; tm = tlm = mul([1, 0, 0, 1, 0, -gs.tl], tlm); await show(o, idx, [a[2]]); break; }
    }
  }

  // decide, per line, which letters go and how far the rest moves
  const plan = new Map(); // glyph -> { removed, shift }
  edits.forEach((ed, ei) => {
    const x1 = ed.x - 1, x2 = ed.x + ed.w + 1, y1 = ed.y - ed.size * .25, y2 = ed.y + ed.size * .95;
    const inBox = glyphs.filter(g => g.upright && !plan.has(g) && g.xc >= x1 && g.xc <= x2 && g.yc >= y1 && g.yc <= y2);
    if (!inBox.length) return;
    // Invisible text over a picture (a scan, or a page saved as an image): the
    // hidden letters go, but the picture still shows the old words.
    if (inBox.every(g => g.hidden)) {
      for (const g of inBox) plan.set(g, { removed: true, shift: 0 });
      result[ei] = 'picture';
      return;
    }
    // Only deleted characters? Then keep the rest in its own font.
    const spans = deletionSpans(ed, inBox);
    if (spans) {
      for (const g of inBox) {
        const removed = spans.some(([l, r]) => g.xc >= l && g.xc <= r);
        const shift = removed ? 0 : spans.reduce((s, [l, r]) => s + (r <= g.xc ? r - l : 0), 0);
        plan.set(g, { removed, shift });
      }
      result[ei] = 'kept';
    } else {
      for (const g of inBox) plan.set(g, { removed: true, shift: 0 });
      result[ei] = 'removed';
    }
  });
  if (!plan.size) return result;

  // pass 2: write the instructions again without those letters
  const hex = (code, bytes) => '<' + code.toString(16).padStart(bytes * 2, '0') + '>';
  const fmt = v => (Math.round(v * 1000) / 1000).toString();
  const byOp = new Map();
  for (const g of glyphs) { if (!byOp.has(g.op)) byOp.set(g.op, []); byOp.get(g.op).push(g); }
  const repl = [];
  let carried = 0; // how far the current text position has moved left
  for (let idx = 0; idx < ops.length; idx++) {
    const o = ops[idx];
    if (['BT', 'ET', 'Td', 'TD', 'Tm', 'T*'].includes(o.op)) { carried = 0; continue; }
    if (!o.show || !o.show.ok) continue;
    if (o.op === "'" || o.op === '"') carried = 0;
    const gl = byOp.get(idx) || [];
    const touched = gl.some(g => plan.has(g)) || carried;
    if (!touched) continue;
    const items = o.op === 'TJ' ? (o.args[0] && o.args[0].t === 'arr' ? o.args[0].v : []) : [o.op === '"' ? o.args[2] : o.args[0]];
    const out = [];
    let cur = '';
    const flush = () => { if (cur) { out.push('<' + cur + '>'); cur = ''; } };
    const move = d => { if (Math.abs(d) > 1e-6) { flush(); out.push(fmt(d * o.show.factor)); } };
    let gi = 0;
    for (const it of items) {
      if (it.t === 'num') { flush(); out.push(fmt(it.v)); continue; }
      if (it.t !== 'str') continue;
      for (let p = 0; p + o.show.bytes <= it.v.length; p += o.show.bytes) {
        const g = gl[gi++];
        if (!g) continue;
        const pl = plan.get(g) || { removed: false, shift: 0 };
        if (pl.removed) { carried += g.adv; continue; }
        if (Math.abs(pl.shift - carried) > 1e-6) { move(pl.shift - carried); carried = pl.shift; }
        cur += hex(g.code, o.show.bytes).slice(1, -1);
      }
    }
    flush();
    const arr = '[' + out.join(' ') + '] TJ';
    let text = arr;
    if (o.op === "'") text = 'T* ' + arr;
    if (o.op === '"') text = `${fmt(o.args[0].v)} Tw ${fmt(o.args[1].v)} Tc T* ` + arr;
    repl.push([o.start, o.end, text]);
  }
  if (!repl.length) return result.map(() => 'failed');
  let outStr = '', last = 0;
  for (const [s, e, t] of repl.sort((a, b) => a[0] - b[0])) { outStr += src.slice(last, s) + t; last = e; }
  outStr += src.slice(last);
  const bytes = new Uint8Array(outStr.length);
  for (let k = 0; k < outStr.length; k++) bytes[k] = outStr.charCodeAt(k) & 255;
  const ref = doc.context.register(doc.context.flateStream(bytes));
  page.node.set(N('Contents'), doc.context.obj([ref]));
  return result;
}

// When the new text is the old text with characters taken out, and the letters
// on the page match the old text, returns the stretches of the line to remove
// (as [left, right] in page units). Otherwise null.
function deletionSpans(ed, inBox) {
  const norm = s => (s || '').normalize('NFKC');
  const orig = norm(ed.orig), text = norm(ed.text);
  if (!text.trim()) return null;
  // letters on the page against the characters of the old text
  const chars = [];
  for (const g of inBox) {
    if (g.ch === null || g.ch === undefined) return null;
    for (const c of norm(g.ch)) if (!/\s/.test(c)) chars.push({ c, g });
  }
  const origIdx = [];
  for (let k = 0; k < orig.length; k++) if (!/\s/.test(orig[k])) origIdx.push(k);
  if (origIdx.length !== chars.length || origIdx.some((k, j) => orig[k] !== chars[j].c)) return null;
  const glyphAt = new Map(origIdx.map((k, j) => [k, chars[j].g]));
  // which characters were deleted (new text must be the old with some taken out)
  const del = new Array(orig.length).fill(true);
  let p = 0;
  for (let k = 0; k < orig.length && p < text.length; k++) if (orig[k] === text[p]) { del[k] = false; p++; }
  if (p < text.length) return null;
  // a letter drawn as one glyph for several characters (ligature) must go whole
  const gDel = new Map();
  for (const [k, g] of glyphAt) { const v = gDel.get(g); gDel.set(g, v === undefined ? del[k] : v === del[k] ? v : 'mixed'); }
  if ([...gDel.values()].includes('mixed')) return null;
  // boundaries between characters, in page units
  const B = k => {
    if (k >= orig.length) return Infinity;
    if (glyphAt.has(k)) return glyphAt.get(k).xL;
    for (let j = k - 1; j >= 0; j--) if (glyphAt.has(j)) return glyphAt.get(j).xR;
    return -Infinity;
  };
  const spans = [];
  for (let k = 0; k < orig.length;) {
    if (!del[k]) { k++; continue; }
    let j = k; while (j + 1 < orig.length && del[j + 1]) j++;
    const l = Math.max(B(k), ed.x - 1), r = B(j + 1);
    spans.push([l, r]);
    k = j + 1;
  }
  return spans;
}

window.LVPdfText = { strip, tokenize };
})();
