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
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
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
    const num = pg.deleted ? '' : T('ed.page', { n });
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
function showGrid() { S.adding = false; renderGrid(); }
async function renderPage() {
  const live = S.pages.filter(p => !p.deleted), pos = live.findIndex(p => p.id === S.current);
  const pg = live[pos]; if (!pg) return renderGrid();
  $('#edTools').innerHTML = `
    <button class="btn sm" type="button" id="edBack">← ${esc(T('ed.allPages'))}</button>
    <span class="ed-pager"><button class="ed-ico" type="button" id="edPrev" aria-label="${esc(T('ed.prev'))}" ${pos ? '' : 'disabled'}>‹</button>
      <span>${esc(T('ed.of', { n: pos + 1, total: live.length }))}</span>
      <button class="ed-ico" type="button" id="edNext" aria-label="${esc(T('ed.next'))}" ${pos < live.length - 1 ? '' : 'disabled'}>›</button></span>
    <button class="btn sm${S.adding ? ' primary' : ''}" type="button" id="edAddText" aria-pressed="${S.adding}">${esc(T('ed.addText'))}</button>
    <label class="ed-size"><span>${esc(T('ed.size'))}</span><select id="edSize">${[9, 10, 11, 12, 14, 16, 20, 24, 32].map(v => `<option value="${v}"${v === (S.size || 12) ? ' selected' : ''}>${v} pt</option>`).join('')}</select></label>
    <span class="ed-hint" id="edPageHint"></span>`;
  $('#edBack').onclick = showGrid;
  $('#edPrev').onclick = () => openPage(live[pos - 1].id);
  $('#edNext').onclick = () => openPage(live[pos + 1].id);
  $('#edAddText').onclick = () => { S.adding = !S.adding; renderPage(); };
  $('#edSize').onchange = e => { S.size = +e.target.value; };

  const body = $('#edBody');
  body.innerHTML = `<div class="ed-stage-wrap"><div class="ed-stage${S.adding ? ' adding' : ''}" id="edStage"><canvas></canvas><div class="ed-layer" id="edLayer"></div></div></div>`;
  const page = await S.docs[pg.doc].js.getPage(pg.index + 1);
  if (S.view !== 'page' || S.current !== pg.id) return;
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

  const layer = $('#edLayer');
  let fields = 0;
  if (pg.doc === 0) fields = await formFields(page, vp, layer);
  S.texts.filter(t => t.pageId === pg.id).forEach(t => textBox(t, vp, layer, rot));
  $('#edPageHint').textContent = S.adding ? T('ed.addTextHint') : fields ? T('ed.formHint', { n: fields }) : T('ed.pageHint');

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
  const btn = $('#edSave'); btn.disabled = true; btn.textContent = T('ed.saving');
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
    // fields whose widgets all sit on deleted pages go too
    if (keptMain.size < origPages.length) {
      try {
        const form = out.getForm(), keptRefs = new Set([...keptMain].map(i => origPages[i].ref.toString()));
        for (const f of form.getFields()) {
          const ws = f.acroField.getWidgets();
          if (ws.length && ws.every(w => { const p = w.P(); return p && !keptRefs.has(p.toString()); })) form.removeField(f);
        }
      } catch (e) { console.warn('Form clean-up skipped', e); }
    }
    for (let i = out.getPageCount() - 1; i >= 0; i--) out.removePage(i);
    for (const { page } of final) out.addPage(page);
    // 3. rotation and added text
    const font = await out.embedFont(StandardFonts.Helvetica);
    for (const { pg, page } of final) {
      const turn = (page.getRotation().angle + pg.rotate) % 360;
      if (pg.rotate) page.setRotation(degrees(turn));
      // Text is drawn turned with the page, so it reads upright however the page is shown.
      for (const t of S.texts.filter(x => x.pageId === pg.id && x.text.trim())) {
        page.drawText(t.text.replace(app().WIN_ANSI, '?'), { x: t.x, y: t.y, size: t.size, font, color: rgb(0, 0, 0), lineHeight: t.size * 1.2, rotate: degrees(turn) });
      }
    }
    const bytes = await out.save();
    const name = app().base(S.docs[0].file.name) + '-edited.pdf';
    app().addResult(S.docs.map(d => d.file.name).join(', '), 'edit', [{ name, blob: new Blob([bytes], { type: 'application/pdf' }) }]);
    S.dirty = false; close();
    app().toast(T('ed.saved', { name }));
  } catch (e) {
    console.error(e); app().toast(e.message || T('job.failed'));
    btn.disabled = false; btn.textContent = T('ed.save');
  }
}

// ---------- open ----------
async function open(files) {
  S = { docs: [], pages: [], texts: [], values: {}, view: 'grid', current: null, adding: false, dirty: false, size: 12 };
  thumbCache.clear();
  build(); labels();
  $('#edBody').innerHTML = `<p class="ed-loading">${esc(T('ed.loading'))}</p>`;
  try { for (const f of files) await addDoc(f); }
  catch (e) { close(); app().toast(e.message); return; }
  render();
  $('#edSave').focus();
}
document.addEventListener('lv-lang', () => { if (S) render(); });
window.LVEditor = { open };
})();
