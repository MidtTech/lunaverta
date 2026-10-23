// LunaVerta PDF editor: organise pages, add text and fill in forms, all in the
// browser. Opened from the converter with one or more PDFs; the first PDF's
// form fields can be filled in, and the result is saved as a new PDF.
(() => {
'use strict';
const app = () => window.LVApp;
const T = (k, v) => app().T(k, v);
const esc = s => app().esc(s);
const $ = sel => document.querySelector(sel);
const ICON = {
  rotL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6M4.6 10A8 8 0 1 1 6 17.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rotR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4v6h-6M19.4 10A8 8 0 1 0 18 17.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

// ---------- state ----------
let S = null; // { docs:[{file, js}], pages:[{id, doc, index, rotate, deleted}], texts:[], values:{}, view, current, adding, dirty }
let uid = 0;

async function loadPdfJs(file) {
  await app().lib('pdfjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = app().VENDOR + 'pdf.worker.min.js';
  try { return await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise; }
  catch (e) { throw new Error(T(e && e.name === 'PasswordException' ? 'err.pdf.locked' : 'err.pdf.read')); }
}
async function addDoc(file) {
  const js = await loadPdfJs(file), d = S.docs.length;
  S.docs.push({ file, js });
  for (let i = 0; i < js.numPages; i++) S.pages.push({ id: ++uid, doc: d, index: i, rotate: 0, deleted: false });
}

// ---------- shell ----------
function build() {
  let el = $('#editor');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'editor'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'edTitle');
  el.innerHTML = `
    <div class="ed-bar">
      <div class="ed-name"><strong id="edTitle"></strong><span id="edFile"></span></div>
      <div class="ed-tools" id="edTools"></div>
      <div class="ed-actions">
        <button class="btn ghost" type="button" id="edCancel"></button>
        <button class="btn primary" type="button" id="edSave"></button>
      </div>
    </div>
    <div class="ed-confirm" id="edConfirm" hidden role="alertdialog" aria-labelledby="edConfirmText">
      <span id="edConfirmText"></span>
      <button class="btn sm" type="button" id="edKeep"></button>
      <button class="btn sm danger" type="button" id="edDiscard"></button>
    </div>
    <div class="ed-body" id="edBody"></div>
    <input type="file" id="edAddInput" accept=".pdf,application/pdf" multiple hidden>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('ed-open');
  $('#edCancel').onclick = cancel;
  $('#edSave').onclick = save;
  $('#edKeep').onclick = () => { $('#edConfirm').hidden = true; };
  $('#edDiscard').onclick = close;
  $('#edAddInput').onchange = async e => {
    const files = [...e.target.files]; e.target.value = '';
    for (const f of files) { try { await addDoc(f); S.dirty = true; } catch (err) { app().toast(err.message); } }
    render();
  };
  el.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.target.closest('textarea, input, select')) { e.preventDefault(); S.view === 'page' ? showGrid() : cancel(); } });
}
function labels() {
  $('#edTitle').textContent = T('ed.title');
  $('#edFile').textContent = S.docs.map(d => d.file.name).join(', ');
  $('#edCancel').textContent = T('ed.cancel');
  $('#edSave').textContent = T('ed.save');
  $('#edConfirmText').textContent = T('ed.discardQ');
  $('#edKeep').textContent = T('ed.keep');
  $('#edDiscard').textContent = T('ed.discard');
}
function render() { labels(); S.view === 'page' ? renderPage() : renderGrid(); }
function cancel() { if (S && S.dirty) { $('#edConfirm').hidden = false; $('#edKeep').focus(); } else close(); }
function close() {
  const el = $('#editor'); if (el) el.remove();
  document.documentElement.classList.remove('ed-open');
  S = null;
  const back = document.getElementById('pick'); if (back) back.focus();
}

// ---------- page thumbnails ----------
const thumbCache = new Map();
async function thumb(pg) {
  const key = pg.doc + ':' + pg.index;
  if (!thumbCache.has(key)) thumbCache.set(key, (async () => {
    const page = await S.docs[pg.doc].js.getPage(pg.index + 1), vp1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 260 / Math.max(vp1.width, vp1.height) });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return c.toDataURL('image/png');
  })());
  return thumbCache.get(key);
}
function renderGrid() {
  S.view = 'grid';
  $('#edTools').innerHTML = `<button class="btn sm" type="button" id="edAdd">${esc(T('ed.addPages'))}</button><span class="ed-hint">${esc(T('ed.gridHint'))}</span>`;
  $('#edAdd').onclick = () => $('#edAddInput').click();
  const body = $('#edBody');
  body.innerHTML = `<div class="ed-grid" id="edGrid"></div>`;
  const grid = $('#edGrid');
  let n = 0;
  S.pages.forEach((pg, i) => {
    if (!pg.deleted) n++;
    const card = document.createElement('div');
    card.className = 'ed-card' + (pg.deleted ? ' deleted' : '');
    card.draggable = !pg.deleted; card.dataset.id = pg.id;
    const changed = S.edits.some(x => x.pageId === pg.id && x.text !== x.orig) || S.texts.some(t => t.pageId === pg.id && t.text.trim()) || S.boxes.some(b => b.pageId === pg.id);
    const num = pg.deleted ? '' : T('ed.page', { n }) + (changed ? ' · ' + T('ed.changed') : '');
    card.innerHTML = `
      <button class="ed-thumb" type="button" aria-label="${esc(T('ed.openPage', { n: num || '' }))}" ${pg.deleted ? 'disabled' : ''}><img alt="" style="transform:rotate(${pg.rotate}deg)"></button>
      <div class="ed-card-foot">
        <span class="ed-num">${esc(num || T('ed.deleted'))}</span>
        <span class="ed-btns">${pg.deleted
          ? `<button type="button" class="ed-ico" data-act="restore" aria-label="${esc(T('ed.restore'))}" title="${esc(T('ed.restore'))}">${ICON.undo}</button>`
          : `<button type="button" class="ed-ico" data-act="rotL" aria-label="${esc(T('ed.rotL'))}" title="${esc(T('ed.rotL'))}">${ICON.rotL}</button><button type="button" class="ed-ico" data-act="rotR" aria-label="${esc(T('ed.rotR'))}" title="${esc(T('ed.rotR'))}">${ICON.rotR}</button><button type="button" class="ed-ico" data-act="del" aria-label="${esc(T('ed.del'))}" title="${esc(T('ed.del'))}">${ICON.del}</button>`}
        </span>
      </div>`;
    thumb(pg).then(src => { const im = card.querySelector('img'); if (im) im.src = src; });
    card.querySelector('.ed-thumb').onclick = () => { if (!pg.deleted) openPage(pg.id); };
    card.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const act = b.dataset.act;
      if (act === 'del' && S.pages.filter(p => !p.deleted).length === 1) { app().toast(T('ed.keepOne')); return; }
      if (act === 'rotL') pg.rotate = (pg.rotate + 270) % 360;
      if (act === 'rotR') pg.rotate = (pg.rotate + 90) % 360;
      if (act === 'del') pg.deleted = true;
      if (act === 'restore') pg.deleted = false;
      S.dirty = true; renderGrid();
      const again = grid.querySelector(`[data-id="${pg.id}"] [data-act="${act === 'del' ? 'restore' : act === 'restore' ? 'del' : act}"]`); if (again) again.focus();
    });
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/x-lunaverta-page', String(pg.id)); e.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('text/x-lunaverta-page')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
    card.addEventListener('drop', e => {
      const id = +e.dataTransfer.getData('text/x-lunaverta-page'); if (!id || id === pg.id) return;
      e.preventDefault();
      const from = S.pages.findIndex(p => p.id === id), moved = S.pages.splice(from, 1)[0];
      const r = card.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
      S.pages.splice(S.pages.indexOf(pg) + (after ? 1 : 0), 0, moved);
      S.dirty = true; renderGrid();
    });
    grid.appendChild(card);
  });
}

// ---------- one page: add text, fill in forms ----------
function openPage(id) { S.view = 'page'; S.current = id; S.adding = false; renderPage(); }
function showGrid() { S.adding = false; S.editing = false; S.redacting = false; renderGrid(); }
let renderSeq = 0;
async function renderPage() {
  const seq = ++renderSeq;
  const live = S.pages.filter(p => !p.deleted), pos = live.findIndex(p => p.id === S.current);
  const pg = live[pos]; if (!pg) return renderGrid();
  $('#edTools').innerHTML = `
    <button class="btn sm" type="button" id="edBack">← ${esc(T('ed.allPages'))}</button>
    <span class="ed-pager"><button class="ed-ico" type="button" id="edPrev" aria-label="${esc(T('ed.prev'))}" ${pos ? '' : 'disabled'}>‹</button>
      <span>${esc(T('ed.of', { n: pos + 1, total: live.length }))}</span>
      <button class="ed-ico" type="button" id="edNext" aria-label="${esc(T('ed.next'))}" ${pos < live.length - 1 ? '' : 'disabled'}>›</button></span>
    <button class="btn sm${S.editing ? ' primary' : ''}" type="button" id="edEditText" aria-pressed="${!!S.editing}">${esc(T('ed.editText'))}</button>
    <button class="btn sm${S.adding ? ' primary' : ''}" type="button" id="edAddText" aria-pressed="${S.adding}">${esc(T('ed.addText'))}</button>
    <button class="btn sm${S.redacting ? ' primary' : ''}" type="button" id="edRedact" aria-pressed="${!!S.redacting}">${esc(T('ed.redact'))}</button>
    <label class="ed-size"><span>${esc(T('ed.size'))}</span><select id="edSize">${[9, 10, 11, 12, 14, 16, 20, 24, 32].map(v => `<option value="${v}"${v === (S.size || 12) ? ' selected' : ''}>${v} pt</option>`).join('')}</select></label>
    ${S.editing || S.adding || S.redacting ? `<button class="btn sm primary ed-done-btn" type="button" id="edDone">${ICON.tick}<span>${esc(T('ed.donePage'))}</span></button>` : ''}
    <span class="ed-hint" id="edPageHint"></span>`;
  $('#edBack').onclick = showGrid;
  const done = $('#edDone');
  if (done) done.onclick = () => { if (document.activeElement) document.activeElement.blur(); S.editing = false; S.adding = false; S.redacting = false; S.justDone = true; renderPage(); };
  $('#edRedact').onclick = () => { S.redacting = !S.redacting; S.editing = false; S.adding = false; renderPage(); };
  $('#edPrev').onclick = () => openPage(live[pos - 1].id);
  $('#edNext').onclick = () => openPage(live[pos + 1].id);
  $('#edAddText').onclick = () => { S.adding = !S.adding; S.editing = false; S.redacting = false; renderPage(); };
  $('#edEditText').onclick = () => { S.editing = !S.editing; S.adding = false; S.redacting = false; renderPage(); };
  $('#edSize').onchange = e => { S.size = +e.target.value; };

  const body = $('#edBody');
  body.innerHTML = `<div class="ed-stage-wrap"><div class="ed-stage${S.adding ? ' adding' : ''}${S.redacting ? ' redacting' : ''}" id="edStage"><canvas></canvas><div class="ed-layer" id="edLayer"></div></div></div>`;
  const page = await S.docs[pg.doc].js.getPage(pg.index + 1);
  if (seq !== renderSeq || S.view !== 'page' || S.current !== pg.id) return;
  const rot = (page.rotate + pg.rotate) % 360;
  const base1 = page.getViewport({ scale: 1, rotation: rot });
  const avail = Math.min(body.clientWidth - 32, 980);
  const scale = Math.max(.4, avail / base1.width), dpr = window.devicePixelRatio || 1;
  const vp = page.getViewport({ scale, rotation: rot });
  const stage = $('#edStage'), canvas = stage.querySelector('canvas');
  canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
  canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
  stage.style.width = vp.width + 'px'; stage.style.height = vp.height + 'px';
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  // A newer render (say, Edit text pressed while this one ran) owns the page now.
  if (seq !== renderSeq) return;

  const layer = $('#edLayer');
  let fields = 0;
  if (pg.doc === 0) fields = await formFields(page, vp, layer);
  let runs = 0;
  if (S.editing || S.edits.some(x => x.pageId === pg.id)) runs = await textRuns(page, pg, vp, layer, canvas, dpr);
  if (seq !== renderSeq) return;
  S.texts.filter(t => t.pageId === pg.id).forEach(t => textBox(t, vp, layer, rot));
  S.boxes.filter(b => b.pageId === pg.id).forEach(b => blackBox(b, vp, layer));
  if (S.redacting) drawBoxes(pg, vp, layer);
  const justDone = S.justDone; S.justDone = false;
  $('#edPageHint').textContent = justDone ? T('ed.doneHint') : S.redacting ? T('ed.redactHint') : S.adding ? T('ed.addTextHint') : S.editing ? (runs ? T('ed.editHint') : T('ed.noText')) : fields ? T('ed.formHint', { n: fields }) : T('ed.pageHint');

  stage.addEventListener('click', e => {
    if (!S.adding || e.target !== layer) return;
    const r = layer.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const size = S.size || 12;
    const [px, py] = vp.convertToPdfPoint(x, y + size * scale * .85); // baseline under the click
    const t = { id: ++uid, pageId: pg.id, x: px, y: py, size, rot, text: '' };
    S.texts.push(t); S.dirty = true; S.adding = false;
    $('#edAddText').classList.remove('primary'); $('#edAddText').setAttribute('aria-pressed', 'false');
    stage.classList.remove('adding'); $('#edPageHint').textContent = T('ed.pageHint');
    textBox(t, vp, layer, rot).querySelector('textarea').focus();
  });
}
// ---------- correcting existing text ----------
// Text in a PDF is drawn at fixed positions. On saving, the old letters are
// removed from the page (see pdf-text.js). Deleted words simply disappear and
// the rest of the line keeps its font; changed text is written in the same
// spot in the closest standard font, size and colour.
function fontStyle(page, fontName, styles) {
  let name = '';
  try { if (page.commonObjs.has(fontName)) { const f = page.commonObjs.get(fontName); name = (f && (f.name || f.loadedName)) || ''; } } catch (e) {}
  const all = name + ' ' + ((styles[fontName] && styles[fontName].fontFamily) || '');
  const mono = /courier|mono|consol/i.test(all);
  const serif = !mono && /times|georgia|garamond|cambria|minion|palatino|book|serif/i.test(all) && !/sans/i.test(all);
  return { family: mono ? 'mono' : serif ? 'serif' : 'sans', bold: /bold|black|heavy|semibold|demi/i.test(name), italic: /italic|oblique/i.test(name) };
}
function lineRuns(items) {
  const runs = [];
  for (const it of items) {
    if (it.str === undefined || !it.transform) continue;
    const [a, b, c, d, e, f] = it.transform;
    if (Math.abs(b) > .01 || Math.abs(c) > .01 || a <= 0 || d <= 0) continue; // straight, upright text only
    const size = d, last = runs[runs.length - 1];
    const sameLine = last && Math.abs(last.y - f) < size * .2 && Math.abs(last.size - size) < .6 && last.fontName === it.fontName;
    const gap = last ? e - (last.x + last.w) : 0;
    if (sameLine && gap > -size * .3 && gap < size * .9) {
      last.str += (gap > size * .15 && !/\s$/.test(last.str) && !/^\s/.test(it.str) ? ' ' : '') + it.str;
      // Spaces don't widen the line: some PDFs use one wide space to reach the next column.
      if (it.str.trim()) last.w = Math.max(last.w, e + it.width - last.x);
    } else if (it.str.trim()) runs.push({ str: it.str, x: e, y: f, w: it.width, size, fontName: it.fontName });
  }
  return runs.map(r => ({ ...r, str: r.str.replace(/\s+$/, '') })).filter(r => r.str.trim() && r.w > 0);
}
function sampleColours(canvas, dpr, box) {
  const ctx = canvas.getContext('2d');
  const x = Math.max(0, Math.floor(box.left * dpr) - 2), y = Math.max(0, Math.floor(box.top * dpr) - 2);
  const w = Math.min(canvas.width - x, Math.ceil(box.width * dpr) + 4), h = Math.min(canvas.height - y, Math.ceil(box.height * dpr) + 4);
  if (w < 3 || h < 3) return { ink: [0, 0, 0], bg: [255, 255, 255] };
  const d = ctx.getImageData(x, y, w, h).data, lum = i => d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
  let darkest = 0, dl = 999;
  for (let i = 0; i < d.length; i += 4) { const l = lum(i); if (l < dl) { dl = l; darkest = i; } }
  const edge = [];
  for (let i = 0; i < w; i++) edge.push((i) * 4, ((h - 1) * w + i) * 4);
  for (let j = 0; j < h; j++) edge.push((j * w) * 4, (j * w + w - 1) * 4);
  edge.sort((p, q) => lum(q) - lum(p));
  const m = edge[Math.floor(edge.length * .3)]; // a light, typical edge pixel
  return { ink: [d[darkest], d[darkest + 1], d[darkest + 2]], bg: [d[m], d[m + 1], d[m + 2]] };
}
const CSS_FONT = { sans: 'Helvetica, Arial, sans-serif', serif: '"Times New Roman", Times, serif', mono: '"Courier New", Courier, monospace' };
async function textRuns(page, pg, vp, layer, canvas, dpr) {
  let tc;
  try { tc = await page.getTextContent(); } catch (e) { return 0; }
  const runs = lineRuns(tc.items);
  for (const r of runs) {
    const key = `${pg.id}:${Math.round(r.x)}:${Math.round(r.y)}`;
    const [x1, y1, x2, y2] = vp.convertToViewportRectangle([r.x - 1, r.y - r.size * .25, r.x + r.w + 1, r.y + r.size * .95]);
    const box = { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
    let edit = S.edits.find(x => x.key === key);
    if (!edit && !S.editing) continue;
    const show = () => {
      const el = document.createElement('input');
      el.type = 'text'; el.className = 'ed-edit'; el.value = edit.text; el.spellcheck = true;
      el.setAttribute('aria-label', T('ed.editLabel', { text: edit.orig }));
      if (!S.editing) { el.readOnly = true; el.tabIndex = -1; el.classList.add('ed-done'); }
      Object.assign(el.style, {
        left: box.left + 'px', top: box.top + 'px', minWidth: box.width + 'px', height: box.height + 'px',
        fontFamily: CSS_FONT[edit.font.family], fontWeight: edit.font.bold ? '700' : '400', fontStyle: edit.font.italic ? 'italic' : 'normal',
        fontSize: (edit.size * vp.scale) + 'px', color: `rgb(${edit.ink})`, background: `rgb(${edit.bg})`
      });
      // Size the box to its text in the font it is shown in, so all of it is visible.
      const fit = () => {
        const c = fit.c || (fit.c = document.createElement('canvas').getContext('2d'));
        c.font = `${el.style.fontStyle} ${el.style.fontWeight} ${el.style.fontSize} ${el.style.fontFamily}`;
        el.style.width = Math.ceil(c.measureText(edit.text || '  ').width + 12) + 'px';
      };
      if (!S.editing) { layer.append(el); fit(); if (!edit.text) el.style.width = box.width + 'px'; return el; } // finished: just show the result
      el.oninput = () => { edit.text = el.value; S.dirty = true; fit(); };
      // Enter finishes the line. If some text is selected, Enter deletes it
      // first: select what should go, press Enter.
      el.onkeydown = e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (el.selectionStart !== el.selectionEnd) {
          el.setRangeText('', el.selectionStart, el.selectionEnd, 'end');
          el.value = el.value.replace(/\s{2,}/g, ' ').trim();
          edit.text = el.value; S.dirty = true; fit(); el.dispatchEvent(new Event('input'));
        }
        el.blur();
      };
      const undo = document.createElement('button');
      undo.type = 'button'; undo.className = 'ed-ico ed-undo'; undo.innerHTML = ICON.undo;
      undo.title = undo.ariaLabel = T('ed.undoEdit'); undo.setAttribute('aria-label', T('ed.undoEdit'));
      Object.assign(undo.style, { left: (box.left + Math.max(box.width, el.offsetWidth || box.width) + 4) + 'px', top: (box.top - 4) + 'px' });
      undo.onclick = () => { S.edits = S.edits.filter(x => x !== edit); S.dirty = true; renderPage(); };
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'ed-ico ed-undo ed-delline'; del.innerHTML = ICON.del;
      del.title = T('ed.deleteLine'); del.setAttribute('aria-label', T('ed.deleteLine'));
      del.onclick = () => { el.value = ''; edit.text = ''; S.dirty = true; fit(); el.focus(); };
      // The buttons sit just above the end of the line, so they don't hide the next column.
      const place = () => { const l = box.left + Math.max(el.offsetWidth, box.width) - 52, t = Math.max(0, box.top - 28) + 'px'; undo.style.left = l + 'px'; del.style.left = (l + 28) + 'px'; undo.style.top = del.style.top = t; };
      layer.append(el, undo, del); fit(); place();
      el.addEventListener('input', place);
      requestAnimationFrame(place);
      return el;
    };
    if (edit) { show(); continue; }
    const hit = document.createElement('button');
    hit.type = 'button'; hit.className = 'ed-run';
    hit.setAttribute('aria-label', T('ed.editLabel', { text: r.str }));
    Object.assign(hit.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
    hit.onclick = () => {
      const c = sampleColours(canvas, dpr, box);
      edit = { key, pageId: pg.id, x: r.x, y: r.y, w: r.w, size: r.size, orig: r.str, text: r.str, font: fontStyle(page, r.fontName, tc.styles), ink: c.ink, bg: c.bg };
      S.edits.push(edit); S.dirty = true;
      hit.remove();
      const el = show(); el.focus(); el.select();
    };
    layer.appendChild(hit);
  }
  return runs.length;
}
function textBox(t, vp, layer, rot) {
  const scale = vp.scale;
  const box = document.createElement('div');
  box.className = 'ed-text';
  const place = () => {
    const [vx, vy] = vp.convertToViewportPoint(t.x, t.y);
    box.style.left = vx + 'px'; box.style.top = (vy - t.size * scale * .85) + 'px';
  };
  box.innerHTML = `<span class="ed-grip" title="${esc(T('ed.move'))}" aria-hidden="true"></span><textarea rows="1" spellcheck="true" placeholder="${esc(T('ed.typeHere'))}" aria-label="${esc(T('ed.textLabel'))}"></textarea><button type="button" class="ed-ico ed-x" aria-label="${esc(T('ed.removeText'))}" title="${esc(T('ed.removeText'))}">${ICON.x}</button>`;
  const ta = box.querySelector('textarea');
  ta.value = t.text;
  ta.style.fontSize = (t.size * scale) + 'px';
  const grow = () => {
    ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
    ta.style.width = 'auto';
    const lines = ta.value.split('\n'), longest = Math.max(4, ...lines.map(l => l.length));
    ta.style.width = `calc(${longest + 1}ch + 8px)`;
  };
  ta.addEventListener('input', () => { t.text = ta.value; S.dirty = true; grow(); });
  box.querySelector('.ed-x').onclick = () => { S.texts = S.texts.filter(x => x !== t); box.remove(); S.dirty = true; };
  // drag by the grip
  box.querySelector('.ed-grip').addEventListener('pointerdown', e => {
    e.preventDefault();
    const r = layer.getBoundingClientRect(), start = box.getBoundingClientRect(), ox = e.clientX - start.left, oy = e.clientY - start.top;
    const move = ev => {
      const x = Math.min(Math.max(0, ev.clientX - r.left - ox), r.width - 20), y = Math.min(Math.max(0, ev.clientY - r.top - oy), r.height - 10);
      [t.x, t.y] = vp.convertToPdfPoint(x + 14, y + t.size * scale * .85);
      place(); S.dirty = true;
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
  place(); layer.appendChild(box); grow();
  return box;
}

// ---------- blacking out ----------
// Boxes are kept in PDF units, so they stay put whatever the zoom or rotation.
function blackBox(b, vp, layer) {
  const [x1, y1, x2, y2] = vp.convertToViewportRectangle([b.x1, b.y1, b.x2, b.y2]);
  const el = document.createElement('div');
  el.className = 'ed-box';
  Object.assign(el.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px' });
  if (S.redacting) {
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'ed-ico ed-box-x'; x.innerHTML = ICON.x;
    x.title = T('ed.removeBox'); x.setAttribute('aria-label', T('ed.removeBox'));
    x.onclick = e => { e.stopPropagation(); S.boxes = S.boxes.filter(o => o !== b); S.dirty = true; el.remove(); };
    el.appendChild(x);
  }
  layer.appendChild(el);
  return el;
}
function drawBoxes(pg, vp, layer) {
  layer.addEventListener('pointerdown', e => {
    if (!S.redacting || e.target !== layer || e.button) return;
    e.preventDefault();
    const r = layer.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const ghost = document.createElement('div'); ghost.className = 'ed-box drawing'; layer.appendChild(ghost);
    let ex = sx, ey = sy;
    const move = ev => {
      ex = Math.min(Math.max(0, ev.clientX - r.left), r.width); ey = Math.min(Math.max(0, ev.clientY - r.top), r.height);
      Object.assign(ghost.style, { left: Math.min(sx, ex) + 'px', top: Math.min(sy, ey) + 'px', width: Math.abs(ex - sx) + 'px', height: Math.abs(ey - sy) + 'px' });
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); ghost.remove();
      if (Math.abs(ex - sx) < 4 || Math.abs(ey - sy) < 4) return;
      const [ax, ay] = vp.convertToPdfPoint(sx, sy), [bx, by] = vp.convertToPdfPoint(ex, ey);
      const b = { id: ++uid, pageId: pg.id, x1: Math.min(ax, bx), y1: Math.min(ay, by), x2: Math.max(ax, bx), y2: Math.max(ay, by) };
      S.boxes.push(b); S.dirty = true; blackBox(b, vp, layer);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}

async function formFields(page, vp, layer) {
  let annots = [];
  try { annots = await page.getAnnotations({ intent: 'display' }); } catch (e) { return 0; }
  let n = 0;
  for (const a of annots) {
    if (a.subtype !== 'Widget' || !a.fieldName || a.readOnly) continue;
    const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect);
    const left = Math.min(x1, x2), top = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    const name = a.fieldName, cur = name in S.values ? S.values[name] : undefined;
    let el;
    if (a.fieldType === 'Tx') {
      el = document.createElement(a.multiLine ? 'textarea' : 'input');
      if (!a.multiLine) el.type = 'text';
      el.value = cur !== undefined ? cur : (a.fieldValue || '');
      el.style.fontSize = Math.max(9, Math.min(h * .62, 16 * vp.scale)) + 'px';
      if (a.maxLen) el.maxLength = a.maxLen;
      el.oninput = () => { S.values[name] = el.value; S.dirty = true; };
    } else if (a.fieldType === 'Btn' && (a.checkBox || a.radioButton)) {
      el = document.createElement('input');
      el.type = a.checkBox ? 'checkbox' : 'radio';
      if (a.radioButton) { el.name = 'ed-radio-' + name; el.value = a.buttonValue; el.checked = cur !== undefined ? cur === a.buttonValue : a.fieldValue === a.buttonValue; }
      else el.checked = cur !== undefined ? !!cur : (a.fieldValue && a.fieldValue !== 'Off');
      el.onchange = () => { S.values[name] = a.radioButton ? (el.checked ? a.buttonValue : S.values[name]) : el.checked; S.dirty = true; };
    } else if (a.fieldType === 'Ch' && a.options) {
      el = document.createElement('select');
      el.innerHTML = a.options.map(o => `<option value="${esc(o.exportValue)}">${esc(o.displayValue)}</option>`).join('');
      const v = cur !== undefined ? cur : (Array.isArray(a.fieldValue) ? a.fieldValue[0] : a.fieldValue);
      if (v !== undefined) el.value = v;
      el.onchange = () => { S.values[name] = el.value; S.dirty = true; };
    } else continue;
    el.className = 'ed-field'; el.setAttribute('aria-label', a.alternativeText || name);
    Object.assign(el.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' });
    layer.appendChild(el); n++;
  }
  return n;
}

// ---------- saving ----------
async function save() {
  const btn = $('#edSave');
  // Ask where to save first, while the click still counts as the visitor's.
  const name = app().base(S.docs[0].file.name) + '-edited.pdf';
  const handle = await app().pickTarget(name, 'application/pdf');
  if (handle === null) return; // cancelled: stay in the editor
  btn.disabled = true; btn.textContent = T('ed.saving');
  try {
    await app().lib('pdflib');
    const { PDFDocument, StandardFonts, degrees, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, rgb } = PDFLib;
    const libs = [];
    for (const d of S.docs) {
      try { libs.push(await PDFDocument.load(new Uint8Array(await d.file.arrayBuffer()))); }
      catch (e) { throw new Error(T(/encrypt/i.test(e && e.message) ? 'err.pdf.locked' : 'err.pdf.read')); }
    }
    const out = libs[0];
    // 1. form values (first PDF only)
    if (Object.keys(S.values).length) {
      const form = out.getForm();
      for (const [name, v] of Object.entries(S.values)) {
        try {
          const f = form.getField(name);
          if (f instanceof PDFTextField) f.setText(String(v || '').replace(app().WIN_ANSI, '?'));
          else if (f instanceof PDFCheckBox) v ? f.check() : f.uncheck();
          else if (f instanceof PDFRadioGroup) {
            // The page shows each button's own "on" name; pick the button with that name.
            const on = v && f.acroField.getOnValues().find(n => (n.decodeText ? n.decodeText() : n.asString().slice(1)) === String(v));
            if (on) f.acroField.setValue(on); else if (v) f.select(v);
          }
          else if (f instanceof PDFDropdown || f instanceof PDFOptionList) { if (v) f.select(v); }
        } catch (e) { console.warn('Could not fill', name, e); }
      }
    }
    // 2. pages in their new order, with pages from other PDFs copied in
    const origPages = out.getPages(), keptMain = new Set();
    const final = [];
    for (const pg of S.pages) {
      if (pg.deleted) continue;
      let page;
      if (pg.doc === 0) { page = origPages[pg.index]; keptMain.add(pg.index); }
      else page = (await out.copyPages(libs[pg.doc], [pg.index]))[0];
      final.push({ pg, page });
    }
    // Deleted pages are emptied, so nothing of them is left in the file even if
    // a bookmark still points at them.
    const N = k => PDFLib.PDFName.of(k), oldRefs = [];
    origPages.forEach((p, i) => {
      if (keptMain.has(i)) return;
      oldRefs.push(p.node.get(N('Contents')));
      p.node.set(N('Contents'), out.context.obj([]));
      p.node.set(N('Resources'), out.context.obj({}));
      p.node.delete(N('Annots'));
    });
    for (let i = out.getPageCount() - 1; i >= 0; i--) out.removePage(i);
    for (const { page } of final) out.addPage(page);
    // 3. rotation, corrected text and added text
    const font = await out.embedFont(StandardFonts.Helvetica);
    const STD = { sans: ['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'], serif: ['TimesRoman', 'TimesRomanBold', 'TimesRomanItalic', 'TimesRomanBoldItalic'], mono: ['Courier', 'CourierBold', 'CourierOblique', 'CourierBoldOblique'] };
    const fonts = {};
    const fontFor = async f => { const n = STD[f.family][(f.bold ? 1 : 0) + (f.italic ? 2 : 0)]; return fonts[n] || (fonts[n] = await out.embedFont(StandardFonts[n])); };
    const col = c => rgb(c[0] / 255, c[1] / 255, c[2] / 255);
    let covered = 0;
    const flatten = [];
    for (const [pi, { pg, page }] of final.entries()) {
      const turn = (page.getRotation().angle + pg.rotate) % 360;
      if (pg.rotate) page.setRotation(degrees(turn));
      const mb = page.getMediaBox();
      // Changed lines: the old letters are taken out of the page. Where that
      // isn't possible, the old line is covered with its background colour.
      const eds = S.edits.filter(x => x.pageId === pg.id && x.text !== x.orig);
      const boxes = S.boxes.filter(b => b.pageId === pg.id).map(b => [b.x1, b.y1, b.x2, b.y2]);
      let how = eds.map(() => 'failed');
      if (eds.length || boxes.length) {
        try { how = await window.LVPdfText.strip(out, page, eds, boxes); if (how.oldContents) oldRefs.push(how.oldContents); }
        catch (e) { console.warn('Text removal failed', e); how.flatten = boxes.length > 0; }
      }
      // Black-out boxes: letters under them are gone (above); draw the box, and
      // drop comments and form fields under it.
      for (const [x1, y1, x2, y2] of boxes) page.drawRectangle({ x: x1, y: y1, width: x2 - x1, height: y2 - y1, color: rgb(0, 0, 0) });
      if (boxes.length) {
        const annots = page.node.lookup(N('Annots'));
        if (annots && annots.size) {
          const keep = [];
          for (let i = 0; i < annots.size(); i++) {
            const a = annots.lookup(i), r = a && a.lookup && a.lookup(N('Rect'));
            const rc = r && r.size ? [0, 1, 2, 3].map(k => r.lookup(k).asNumber()) : null;
            const under = rc && boxes.some(b => Math.max(rc[0], rc[2]) > b[0] && Math.min(rc[0], rc[2]) < b[2] && Math.max(rc[1], rc[3]) > b[1] && Math.min(rc[1], rc[3]) < b[3]);
            if (!under) keep.push(annots.get(i));
          }
          page.node.set(N('Annots'), out.context.obj(keep));
        }
      }
      if (how.flatten) flatten.push(pi);
      for (const [i, ed] of eds.entries()) {
        if (how[i] === 'kept') continue; // only words were deleted; the rest stays in its own font
        if (how[i] === 'failed' || how[i] === 'picture') { covered++; page.drawRectangle({ x: ed.x - 1, y: ed.y - ed.size * .25, width: ed.w + 2, height: ed.size * 1.2, color: col(ed.bg) }); }
        if (!ed.text.trim()) continue;
        const f = await fontFor(ed.font), text = ed.text.replace(app().WIN_ANSI, '?');
        // Size the standard font so the original line would have had its original width.
        const natural = f.widthOfTextAtSize(ed.orig.replace(app().WIN_ANSI, '?'), ed.size);
        const size = natural ? ed.size * Math.min(1.1, Math.max(.75, ed.w / natural)) : ed.size;
        // Keep centred lines centred.
        const mid = ed.x + ed.w / 2, centred = Math.abs(mid - (mb.x + mb.width / 2)) < mb.width * .03 && ed.w < mb.width * .8;
        const x = centred ? mid - f.widthOfTextAtSize(text, size) / 2 : ed.x;
        page.drawText(text, { x, y: ed.y, size, font: f, color: col(ed.ink) });
      }
      // Text is drawn turned with the page, so it reads upright however the page is shown.
      for (const t of S.texts.filter(x => x.pageId === pg.id && x.text.trim())) {
        page.drawText(t.text.replace(app().WIN_ANSI, '?'), { x: t.x, y: t.y, size: t.size, font, color: rgb(0, 0, 0), lineHeight: t.size * 1.2, rotate: degrees(turn) });
      }
    }
    // Pages where a box covers a picture (or text LunaVerta can't read) become
    // an image of the finished page, so nothing under the box survives.
    if (flatten.length) {
      await app().lib('pdfjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = app().VENDOR + 'pdf.worker.min.js';
      const js = await pdfjsLib.getDocument({ data: await out.save(), isEvalSupported: false }).promise;
      const pages = out.getPages();
      for (const pi of flatten) {
        const jp = await js.getPage(pi + 1), vp = jp.getViewport({ scale: 200 / 72, rotation: 0 });
        const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await jp.render({ canvasContext: ctx, viewport: vp, annotationMode: 0 }).promise;
        const jpg = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
        const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const [bx, by, bx2, by2] = jp.view, page = pages[pi];
        const tmp = out.addPage([bx2 - bx, by2 - by]);
        tmp.drawImage(img, { x: bx, y: by, width: bx2 - bx, height: by2 - by });
        oldRefs.push(page.node.get(N('Contents')));
        page.node.set(N('Contents'), tmp.node.get(N('Contents')));
        page.node.set(N('Resources'), tmp.node.get(N('Resources')));
        page.node.delete(N('Annots'));
        out.removePage(out.getPageCount() - 1);
      }
    }
    // Form fields left without a visible box (deleted or blacked-out pages) go.
    if (oldRefs.length || S.boxes.length) {
      try {
        const shown = new Set();
        for (const p of out.getPages()) { const a = p.node.lookup(N('Annots')); if (a && a.size) for (let i = 0; i < a.size(); i++) shown.add(String(a.get(i))); }
        const form = out.getForm();
        for (const f of form.getFields()) {
          const ws = f.acroField.getWidgets();
          if (ws.length && ws.every(w => !shown.has(String(out.context.getObjectRef(w.dict))))) form.removeField(f);
        }
      } catch (e) { console.warn('Form clean-up skipped', e); }
    }
    // Old page drawings that are no longer used are deleted from the file.
    const inUse = new Set();
    for (const p of out.getPages()) { const c = p.node.get(N('Contents')); (c && c.asArray ? c.asArray() : [c]).forEach(r => inUse.add(String(r))); }
    for (const c of oldRefs) for (const r of (c && c.asArray ? c.asArray() : [c])) if (r instanceof PDFLib.PDFRef && !inUse.has(String(r))) out.context.delete(r);
    let bytes = await out.save();
    // Rewrite so only what the PDF still uses is kept (removed pages, letters,
    // pictures and fields are then really gone).
    if (oldRefs.length || S.boxes.length) { try { bytes = await app().tidyPDF(bytes); } catch (e) { console.warn('Tidy-up skipped', e); } }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    let where = handle ? handle.name : name;
    if (handle) await app().writeTo(handle, blob); else app().download(name, blob);
    app().addResult(S.docs.map(d => d.file.name).join(', '), 'edit', [{ name: where, blob }], true);
    S.dirty = false; close();
    app().toast(T(covered ? 'ed.savedCovered' : 'ed.saved', { name: where }));
  } catch (e) {
    console.error(e); app().toast(e.message || T('job.failed'));
    btn.disabled = false; btn.textContent = T('ed.save');
  }
}

// ---------- open ----------
async function open(files, opt = {}) {
  S = { docs: [], pages: [], texts: [], edits: [], boxes: [], redacting: false, editing: false, values: {}, view: 'grid', current: null, adding: false, dirty: false, size: 12 };
  thumbCache.clear();
  build(); labels();
  $('#edBody').innerHTML = `<p class="ed-loading">${esc(T('ed.loading'))}</p>`;
  try { for (const f of files) await addDoc(f); }
  catch (e) { close(); app().toast(e.message); return; }
  // The Redact PDF page opens the first page ready to black out.
  if (opt.redact && S.pages.length) { S.view = 'page'; S.current = S.pages[0].id; S.redacting = true; }
  render();
  $('#edSave').focus();
}
document.addEventListener('lv-lang', () => { if (S) render(); });
window.LVEditor = { open };
})();
