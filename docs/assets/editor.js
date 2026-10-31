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
  redo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
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
function render() { labels(); S.view === 'page' ? buildPages(S.current) : renderGrid(); }
function cancel() { if (S && S.dirty) { $('#edConfirm').hidden = false; $('#edKeep').focus(); } else close(); }
function close() {
  closeFind(true);
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
  $('#edTools').innerHTML = `${undoHTML()}<button class="btn sm" type="button" id="edAdd">${esc(T('ed.addPages'))}</button><button class="btn sm" type="button" id="edFind">${ICON.search}<span>${esc(T('ed.find'))}</span></button><span class="ed-hint">${esc(T('ed.gridHint'))}</span>`;
  $('#edAdd').onclick = () => $('#edAddInput').click();
  $('#edFind').onclick = openFind;
  wireUndo();
  const body = $('#edBody');
  body.innerHTML = `<div class="ed-grid" id="edGrid"></div>`;
  const grid = $('#edGrid');
  let n = 0;
  S.pages.forEach((pg, i) => {
    if (!pg.deleted) n++;
    const card = document.createElement('div');
    card.className = 'ed-card' + (pg.deleted ? ' deleted' : '');
    card.draggable = !pg.deleted; card.dataset.id = pg.id;
    const changed = S.edits.some(x => x.pageId === pg.id && x.text !== x.orig) || S.texts.some(t => t.pageId === pg.id && t.text.trim()) || S.boxes.some(b => b.pageId === pg.id) || S.images.some(im => im.pageId === pg.id) || S.marks.some(m => m.pageId === pg.id);
    const num = pg.deleted ? '' : T('ed.page', { n }) + (changed ? ' · ' + T('ed.changed') : '');
    card.innerHTML = `
      <button class="ed-thumb" type="button" aria-label="${esc(T('ed.openPage', { n: num || '' }))}" ${pg.deleted ? 'disabled' : ''}><img alt="" style="transform:rotate(${pg.rotate}deg)"></button>
      <div class="ed-card-foot">
        <span class="ed-num">${esc(num || T('ed.deleted'))}</span>
        <span class="ed-btns">${pg.deleted
          ? `<button type="button" class="ed-ico" data-act="restore" aria-label="${esc(T('ed.restore'))}" title="${esc(T('ed.restore'))}">${ICON.undo}</button>`
          : `<button type="button" class="ed-ico" data-act="rotL" aria-label="${esc(T('ed.rotL'))}" title="${esc(T('ed.rotL'))}">${ICON.rotL}</button><button type="button" class="ed-ico" data-act="rotR" aria-label="${esc(T('ed.rotR'))}" title="${esc(T('ed.rotR'))}">${ICON.rotR}</button><button type="button" class="ed-ico" data-act="del" aria-label="${esc(T('ed.del'))}" title="${esc(T('ed.del'))}">${ICON.del}</button><button type="button" class="ed-ico" data-act="blank" aria-label="${esc(T('blank.add'))}" title="${esc(T('blank.add'))}">+</button>`}
        </span>
      </div>`;
    thumb(pg).then(src => { const im = card.querySelector('img'); if (im) im.src = src; });
    card.querySelector('.ed-thumb').onclick = () => { if (!pg.deleted) openPage(pg.id); };
    card.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const act = b.dataset.act;
      if (act === 'blank') { insertBlank(pg); return; }
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
// All pages are shown one under the other, so you can scroll through the PDF
// and edit any page. Pages are drawn when they come near the screen and let go
// again when far away, so long PDFs stay light.
function openPage(id) { S.view = 'page'; S.current = id; S.adding = false; buildPages(id); }
function showGrid() {
  S.adding = false; S.editing = false; S.redacting = false; S.marking = false; S.justDone = false;
  const f = $('#edFinish'); if (f) f.remove();
  dropPages(); renderGrid();
}
function dropPages() {
  if (!S.pv) return;
  S.pv.io.disconnect(); S.pv.body.removeEventListener('scroll', S.pv.onScroll);
  S.pv = null;
}
let renderSeq = 0;
// Redraws the page view: in place when it is already built (mode changes,
// undo), from scratch otherwise.
// Only one tool shows as chosen at a time. "Remove sensitive" counts as chosen
// while its panel is open and no other tool is on, because clicks on the page then go to it.
function endModes() { S.editing = S.adding = S.redacting = S.marking = false; S.justDone = false; }
function findOn() { return !!document.getElementById('edFindPanel') && !S.editing && !S.adding && !S.redacting && !S.marking; }
function renderPage() { if (S.pv && S.view === 'page') refreshModes(); else buildPages(S.current); }

// A short tour the first time someone opens a page: three steps, shown once.
const TOUR_KEY = 'lunaverta-tour';
function maybeTour() {
  try { if (localStorage.getItem(TOUR_KEY) || $('#edTour') || document.querySelector('dialog[open]')) return; } catch (e) { return; }
  const steps = [['#edEditText', 'tour.1'], ['#edFind', 'tour.2'], ['#edSave', 'tour.3']];
  let i = 0;
  const card = document.createElement('div');
  card.id = 'edTour'; card.className = 'ed-tour'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
  $('#editor').appendChild(card);
  const end = () => { try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) {} document.querySelectorAll('.ed-tour-hl').forEach(n => n.classList.remove('ed-tour-hl')); card.remove(); };
  const show = () => {
    document.querySelectorAll('.ed-tour-hl').forEach(n => n.classList.remove('ed-tour-hl'));
    const t = document.querySelector(steps[i][0]); if (t) t.classList.add('ed-tour-hl');
    card.innerHTML = `<span class="ed-tour-n">${i + 1} / ${steps.length}</span><p>${esc(T(steps[i][1]))}</p>
      <div class="ed-tour-btns"><button type="button" class="linkish" data-t="skip">${esc(T('tour.skip'))}</button><button type="button" class="btn sm primary" data-t="next">${esc(T(i === steps.length - 1 ? 'tour.done' : 'tour.next'))}</button></div>`;
    card.querySelector('[data-t="skip"]').onclick = end;
    card.querySelector('[data-t="next"]').onclick = () => { i++; if (i >= steps.length) end(); else show(); };
    card.querySelector('[data-t="next"]').focus();
  };
  show();
}
function pageTools() {
  const live = S.pages.filter(p => !p.deleted);
  $('#edTools').innerHTML = `
    <button class="btn sm" type="button" id="edBack">← ${esc(T('ed.allPages'))}</button>
    ${undoHTML()}
    <span class="ed-zoom"><button class="ed-ico" type="button" id="edZoomOut" aria-label="${esc(T('zoom.out'))}" title="${esc(T('zoom.out'))} (Ctrl −)">−</button><button class="ed-zoomv" type="button" id="edZoomReset" title="${esc(T('zoom.reset'))} (Ctrl 0)">${Math.round((S.zoom || 1) * 100)} %</button><button class="ed-ico" type="button" id="edZoomIn" aria-label="${esc(T('zoom.in'))}" title="${esc(T('zoom.in'))} (Ctrl +)">+</button></span>
    <button class="ed-ico" type="button" id="edSearchBtn" aria-label="${esc(T('search.open'))}" title="${esc(T('search.open'))} (Ctrl+F)">${ICON.search}</button>
    <span class="ed-pager"><button class="ed-ico" type="button" id="edPrev" aria-label="${esc(T('ed.prev'))}">‹</button>
      <span id="edPagerText"></span>
      <button class="ed-ico" type="button" id="edNext" aria-label="${esc(T('ed.next'))}">›</button></span>
    <span class="ed-group" role="group" aria-label="${esc(T('grp.text'))}" data-label="${esc(T('grp.text'))}">
      <button class="btn sm${S.editing ? ' primary' : ''}" type="button" id="edEditText" aria-pressed="${!!S.editing}" title="${esc(T('tip.edit'))}">${esc(T('ed.editText'))}</button>
      <button class="btn sm${S.adding ? ' primary' : ''}" type="button" id="edAddText" aria-pressed="${!!S.adding}" title="${esc(T('tip.add'))}">${esc(T('ed.addText'))}</button>
      <label class="ed-size" title="${esc(T('tip.size'))}"><span class="sr-only">${esc(T('ed.size'))}</span><select id="edSize">${[9, 10, 11, 12, 14, 16, 20, 24, 32].map(v => `<option value="${v}"${v === (S.size || 12) ? ' selected' : ''}>${v} pt</option>`).join('')}</select></label>
    </span>
    <span class="ed-group" role="group" aria-label="${esc(T('grp.mark'))}" data-label="${esc(T('grp.mark'))}">
      <button class="btn sm${S.marking ? ' primary' : ''}" type="button" id="edMark" aria-pressed="${!!S.marking}" title="${esc(T('tip.mark'))}">${esc(T('ed.mark'))}</button>
      <button class="btn sm${S.redacting ? ' primary' : ''}" type="button" id="edRedact" aria-pressed="${!!S.redacting}" title="${esc(T('tip.redact'))}">${esc(T('ed.redact'))}</button>
    </span>
    <span class="ed-group" role="group" aria-label="${esc(T('grp.insert'))}" data-label="${esc(T('grp.insert'))}">
      <button class="btn sm" type="button" id="edSign" title="${esc(T('tip.sign'))}">${esc(T('ed.sign'))}</button>
      <button class="btn sm" type="button" id="edStamp" title="${esc(T('tip.stamp'))}">${esc(T('ed.stamp'))}</button>
    </span>
    <span class="ed-group ed-group-find" role="group" aria-label="${esc(T('grp.privacy'))}" data-label="${esc(T('grp.privacy'))}">
      <button class="btn sm${findOn() ? ' primary' : ''}" type="button" id="edFind" aria-pressed="${findOn()}" title="${esc(T('tip.find'))}">${ICON.search}<span>${esc(T('ed.find'))}</span></button>
    </span>
    <span class="ed-hint" id="edPageHint"></span>`;
  $('#edBack').onclick = showGrid;
  setTimeout(maybeTour, 400);
  const go = d => { const i = live.findIndex(p => p.id === S.current); const t = live[i + d]; if (t) scrollToPage(t.id, true); };
  $('#edPrev').onclick = () => go(-1);
  $('#edNext').onclick = () => go(1);
  $('#edRedact').onclick = () => { S.redacting = !S.redacting; S.editing = false; S.adding = false; S.marking = false; S.justDone = false; renderPage(); };
  $('#edAddText').onclick = () => { S.adding = !S.adding; S.editing = false; S.redacting = false; S.marking = false; S.justDone = false; renderPage(); };
  $('#edEditText').onclick = () => { S.editing = !S.editing; S.adding = false; S.redacting = false; S.marking = false; S.justDone = false; renderPage(); };
  $('#edSize').onchange = e => { S.size = +e.target.value; };
  $('#edFind').onclick = () => { endModes(); openFind(); renderPage(); };
  $('#edSign').onclick = () => { endModes(); renderPage(); openSign(); };
  $('#edStamp').onclick = () => { endModes(); renderPage(); openStamps(); };
  $('#edMark').onclick = () => { S.marking = !S.marking; S.editing = S.adding = S.redacting = false; S.justDone = false; renderPage(); };
  $('#edZoomOut').onclick = () => stepZoom(-1); $('#edZoomIn').onclick = () => stepZoom(1); $('#edZoomReset').onclick = () => setZoom(1);
  $('#edSearchBtn').onclick = openSearch;
  wireUndo();
  updatePager();
}
function updatePager() {
  const live = S.pages.filter(p => !p.deleted), i = live.findIndex(p => p.id === S.current);
  const t = $('#edPagerText'); if (!t) return;
  t.textContent = T('ed.of', { n: i + 1, total: live.length });
  $('#edPrev').disabled = i <= 0; $('#edNext').disabled = i >= live.length - 1;
}
function setHint() {
  const h = $('#edPageHint'); if (!h) return;
  const justDone = S.justDone;
  const views = S.pv ? [...S.pv.views.values()] : [];
  const fields = views.reduce((n, v) => n + (v.fields || 0), 0);
  const noText = S.editing && views.some(v => v.drawn) && views.every(v => !v.drawn || v.runs === 0);
  h.textContent = justDone ? T('ed.doneHint') : S.redacting ? T('ed.redactHint') : S.adding ? T('ed.addTextHint')
    : S.editing ? (noText ? T('ed.noText') : T('ed.editHint')) : fields ? T('ed.formHint', { n: fields }) : T('ed.pageHint');
}
function scrollToPage(id, smooth) {
  const v = S.pv && S.pv.views.get(id); if (!v) return;
  // position inside the scrolling area (offsetTop would also count the toolbar above it)
  const body = S.pv.body, top = v.wrap.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
  body.scrollTo({ top: Math.max(0, top - 12), behavior: smooth ? 'smooth' : 'auto' });
  S.current = id; updatePager();
}

async function buildPages(startId) {
  const seq = ++renderSeq;
  dropPages();
  const live = S.pages.filter(p => !p.deleted);
  if (!live.length) return renderGrid();
  if (!live.some(p => p.id === startId)) startId = live[0].id;
  S.current = startId;
  pageTools();
  const body = $('#edBody');
  body.innerHTML = `<div class="ed-pages" id="edPages"></div>`;
  const list = $('#edPages');
  const avail = Math.min(body.clientWidth - 32, 980), dpr = window.devicePixelRatio || 1;
  const views = new Map();
  for (const pg of live) {
    const page = await S.docs[pg.doc].js.getPage(pg.index + 1);
    if (seq !== renderSeq || !S) return;
    const rot = (page.rotate + pg.rotate) % 360;
    const scale = Math.max(.3, avail * (S.zoom || 1) / page.getViewport({ scale: 1, rotation: rot }).width);
    const vp = page.getViewport({ scale, rotation: rot });
    const wrap = document.createElement('div');
    wrap.className = 'ed-stage-wrap'; wrap.dataset.id = pg.id;
    wrap.innerHTML = `<div class="ed-stage" aria-label="${esc(T('ed.page', { n: live.indexOf(pg) + 1 }))}"><canvas></canvas><div class="ed-layer"></div></div>`;
    const stage = wrap.firstChild;
    stage.style.width = vp.width + 'px'; stage.style.height = vp.height + 'px';
    const cv = stage.querySelector('canvas'); cv.width = cv.height = 0; cv.style.width = vp.width + 'px'; cv.style.height = vp.height + 'px';
    list.appendChild(wrap);
    const v = { pg, page, rot, scale, vp, dpr, wrap, stage, canvas: stage.querySelector('canvas'), layer: stage.querySelector('.ed-layer'), drawn: false, near: false, fields: 0, runs: 0, job: 0 };
    stage.classList.toggle('adding', !!S.adding); stage.classList.toggle('redacting', !!S.redacting); stage.classList.toggle('marking', !!S.marking);
    stage.addEventListener('click', e => addTextAt(v, e));
    views.set(pg.id, v);
  }
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      const v = views.get(+en.target.dataset.id); if (!v) continue;
      v.near = en.isIntersecting;
      if (v.near) drawPage(v); else releasePage(v);
    }
  }, { root: body, rootMargin: '1200px 0px' });
  // The page across the middle of the screen is the current one.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const mid = body.getBoundingClientRect().top + body.clientHeight / 2;
      for (const v of views.values()) {
        const r = v.wrap.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) { if (S.current !== v.pg.id) { S.current = v.pg.id; updatePager(); } break; }
      }
    });
  };
  S.pv = { views, io, body, onScroll };
  body.addEventListener('scroll', onScroll, { passive: true });
  views.forEach(v => io.observe(v.wrap));
  scrollToPage(startId);
  finishBar(); setHint();
}
async function drawPage(v) {
  if (v.drawn) return;
  v.drawn = true;
  const job = ++v.job, { canvas, vp, dpr } = v;
  canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
  canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  try { await v.page.render({ canvasContext: ctx, viewport: vp }).promise; } catch (e) { return; }
  if (job !== v.job || !v.drawn) return;
  await fillLayer(v);
}
function releasePage(v) {
  if (!v.drawn || v.layer.contains(document.activeElement)) return;
  v.drawn = false; v.job++;
  v.canvas.width = v.canvas.height = 0;
  const fresh = document.createElement('div'); fresh.className = 'ed-layer';
  v.layer.replaceWith(fresh); v.layer = fresh;
}
// Puts the clickable lines, form fields, added text and boxes on a drawn page,
// in a fresh layer so no old handlers linger.
async function fillLayer(v) {
  const job = v.job, { pg, page, vp, rot, canvas, dpr } = v;
  const layer = document.createElement('div'); layer.className = 'ed-layer';
  v.layer.replaceWith(layer); v.layer = layer;
  v.fields = pg.doc === 0 ? await formFields(page, vp, layer) : 0;
  if (job !== v.job) return;
  v.runs = (S.editing || S.edits.some(x => x.pageId === pg.id)) ? await textRuns(page, pg, vp, layer, canvas, dpr) : 0;
  if (job !== v.job) return;
  S.texts.filter(t => t.pageId === pg.id).forEach(t => textBox(t, vp, layer, rot));
  S.boxes.filter(b => b.pageId === pg.id).forEach(b => blackBox(b, vp, layer));
  S.images.filter(im => im.pageId === pg.id).forEach(im => sigBox(v, im));
  S.marks.filter(m => m.pageId === pg.id).forEach(m => markEl(v, m));
  if (S.marking) markDraw(v);
  pageOverlays(v); searchMarks(v);
  if (S.redacting) drawBoxes(pg, vp, layer);
  hitMarks(v);
  setHint();
}
// Mode changes: new toolbar, and the drawn pages get their layers again.
function refreshModes() {
  pageTools();
  for (const v of S.pv.views.values()) {
    v.stage.classList.toggle('adding', !!S.adding); v.stage.classList.toggle('redacting', !!S.redacting); v.stage.classList.toggle('marking', !!S.marking);
    if (v.drawn) { v.job++; fillLayer(v); }
  }
  finishBar(); setHint();
}
function addTextAt(v, e) {
  // placing a signature: it goes where the page was clicked, 150 points wide
  if (S.placing && (e.target === v.layer || e.target.classList.contains('ed-seg'))) {
    const r = v.layer.getBoundingClientRect(), [px, py] = v.vp.convertToPdfPoint(e.clientX - r.left, e.clientY - r.top);
    const w = 150, h = w * S.placing.ratio;
    const im = { id: ++uid, pageId: v.pg.id, x: px - w / 2, y: py - h / 2, w, h, src: S.placing.src };
    S.images.push(im); S.dirty = true; placingMode(false); sigBox(v, im); setHint();
    return;
  }
  if (!S.adding || e.target !== v.layer) return;
  const r = v.layer.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const size = S.size || 12;
  const [px, py] = v.vp.convertToPdfPoint(x, y + size * v.scale * .85); // baseline under the click
  const t = { id: ++uid, pageId: v.pg.id, x: px, y: py, size, rot: v.rot, text: '' };
  S.texts.push(t); S.dirty = true; S.adding = false;
  $('#edAddText').classList.remove('primary'); $('#edAddText').setAttribute('aria-pressed', 'false');
  S.pv.views.forEach(o => o.stage.classList.remove('adding'));
  finishBar(); $('#edPageHint').textContent = T('ed.pageHint');
  textBox(t, v.vp, v.layer, v.rot).querySelector('textarea').focus();
}
// ---------- finishing a page ----------
// While editing text, blacking out or adding text, a bar at the bottom of the
// page says what has been done and holds the Done button, so it is always
// clear how to finish.
function finishBar() {
  let bar = $('#edFinish');
  const mode = S.editing ? 'edit' : S.redacting ? 'redact' : S.adding ? 'add' : S.marking ? 'mark' : '';
  if (!mode) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'edFinish'; bar.className = 'ed-finish'; bar.setAttribute('role', 'status');
    $('#editor').appendChild(bar);
  }
  bar.innerHTML = `${mode === 'mark' ? markTools() : ''}<span class="ed-finish-text" id="edFinishText"></span>
    <button class="btn primary ed-done-btn" type="button" id="edDone">${ICON.tick}<span>${esc(T('ed.donePage'))}</span></button>`;
  $('#edDone').onclick = finishPage;
  bar.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { S.markTool = b.dataset.tool; finishBar(); });
  bar.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { S.markColor = b.dataset.col; finishBar(); });
  updateFinish();
}
function updateFinish() {
  const el = $('#edFinishText'); if (!el) return;
  const live = new Set(S.pages.filter(p => !p.deleted).map(p => p.id));
  const lines = S.edits.filter(x => live.has(x.pageId) && x.text !== x.orig).length;
  const boxes = S.boxes.filter(b => live.has(b.pageId)).length;
  el.textContent = S.editing ? (lines ? T('ed.barEdit', { n: lines }) : T('ed.barEditNone'))
    : S.redacting ? (boxes ? T('ed.barRedact', { n: boxes }) : T('ed.barRedactNone'))
    : S.marking ? T('mark.hint.' + S.markTool)
    : T('ed.barAdd');
}
function finishPage() {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  S.editing = false; S.adding = false; S.redacting = false; S.marking = false; S.justDone = true;
  renderPage();
  const sv = $('#edSave'); sv.classList.remove('pulse'); void sv.offsetWidth; sv.classList.add('pulse');
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
      el.oninput = () => { edit.text = el.value; S.dirty = true; fit(); updateFinish(); };
      // Enter (or the tick) finishes the line. If some text is selected, Enter
      // deletes it first: select what should go, press Enter. Esc also finishes.
      el.onkeydown = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); el.blur(); return; }
        if (e.key !== 'Enter') return;
        e.preventDefault(); finishLine();
      };
      const finishLine = () => {
        if (el.selectionStart !== el.selectionEnd) {
          el.setRangeText('', el.selectionStart, el.selectionEnd, 'end');
          el.value = el.value.replace(/\s{2,}/g, ' ').trim();
          edit.text = el.value; S.dirty = true; fit(); el.dispatchEvent(new Event('input'));
        }
        el.blur();
      };
      const ok = document.createElement('button');
      ok.type = 'button'; ok.className = 'ed-ico ed-undo ed-ok'; ok.innerHTML = ICON.tick;
      ok.title = T('ed.finishLine'); ok.setAttribute('aria-label', T('ed.finishLine'));
      ok.onclick = () => finishLine();
      const undo = document.createElement('button');
      undo.type = 'button'; undo.className = 'ed-ico ed-undo'; undo.innerHTML = ICON.undo;
      undo.title = undo.ariaLabel = T('ed.undoEdit'); undo.setAttribute('aria-label', T('ed.undoEdit'));
      Object.assign(undo.style, { left: (box.left + Math.max(box.width, el.offsetWidth || box.width) + 4) + 'px', top: (box.top - 4) + 'px' });
      undo.onclick = () => { S.edits = S.edits.filter(x => x !== edit); S.dirty = true; renderPage(); };
      const badge = document.createElement('span');
      badge.className = 'ed-badge'; badge.innerHTML = ICON.tick; badge.setAttribute('aria-hidden', 'true');
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'ed-ico ed-undo ed-delline'; del.innerHTML = ICON.del;
      del.title = T('ed.deleteLine'); del.setAttribute('aria-label', T('ed.deleteLine'));
      del.onclick = () => { el.value = ''; edit.text = ''; S.dirty = true; fit(); el.focus(); };
      // The buttons sit just above the end of the line, so they don't hide the next column.
      const btns = [ok, undo, del];
      const place = () => {
        const end = box.left + Math.max(el.offsetWidth, box.width), t = Math.max(0, box.top - 30) + 'px';
        btns.forEach((b, i) => { b.style.left = (end - 82 + i * 28) + 'px'; b.style.top = t; });
        badge.style.left = (end - 9) + 'px'; badge.style.top = (box.top - 9) + 'px';
      };
      // The buttons show only for the line being edited; a finished line gets a tick.
      btns.forEach(b => b.addEventListener('pointerdown', e => e.preventDefault())); // keep the line focused
      const state = active => {
        btns.forEach(b => { b.hidden = !active; });
        el.classList.toggle('ed-set', !active && edit.text !== edit.orig);
        badge.hidden = active || edit.text === edit.orig;
      };
      el.addEventListener('focus', () => state(true));
      el.addEventListener('blur', () => {
        // A line clicked but left unchanged goes back to normal.
        if (edit.text === edit.orig) {
          S.edits = S.edits.filter(x => x !== edit); edit = null;
          [el, ...btns, badge].forEach(n => n.remove()); addHit(); updateFinish(); return;
        }
        state(false); updateFinish();
      });
      layer.append(el, ...btns, badge); fit(); place(); state(false);
      el.addEventListener('input', place);
      requestAnimationFrame(place);
      return el;
    };
    const addHit = () => {
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
    };
    if (edit) show(); else addHit();
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

// ---------- undo and redo ----------
// Every change sets S.dirty; a moment later the state is noted down. Undo and
// redo step through those notes (Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y).
const H = { stack: [], i: -1, timer: 0, quiet: false };
const snap = () => JSON.stringify({ pages: S.pages, texts: S.texts, edits: S.edits, boxes: S.boxes, images: S.images, marks: S.marks, values: S.values, wm: S.watermark, nums: S.pageNums });
function trackChanges() {
  let dirty = false;
  Object.defineProperty(S, 'dirty', { configurable: true, enumerable: true, get: () => dirty, set: v => { dirty = v; if (v && !H.quiet) { clearTimeout(H.timer); H.timer = setTimeout(noteState, 350); } } });
  H.stack = [snap()]; H.i = 0;
}
function noteState() {
  if (!S) return;
  clearTimeout(H.timer); H.timer = 0;
  const j = snap();
  if (j === H.stack[H.i]) return;
  H.stack = H.stack.slice(0, H.i + 1); H.stack.push(j);
  if (H.stack.length > 100) H.stack.shift();
  H.i = H.stack.length - 1;
  undoButtons();
}
function undoButtons() {
  const u = $('#edUndo'), r = $('#edRedo');
  if (u) u.disabled = H.i <= 0;
  if (r) r.disabled = H.i >= H.stack.length - 1;
}
function stepHistory(d) {
  if (H.timer) noteState();
  const to = H.i + d;
  if (to < 0 || to >= H.stack.length) return;
  H.i = to;
  const o = JSON.parse(H.stack[to]);
  H.quiet = true;
  Object.assign(S, { pages: o.pages, texts: o.texts, edits: o.edits, boxes: o.boxes, images: o.images, marks: o.marks || [], values: o.values, watermark: o.wm || null, pageNums: o.nums || null });
  S.dirty = true; H.quiet = false;
  if (S.view === 'page') buildPages(S.current); else renderGrid();
  app().toast(T(d < 0 ? 'hist.undone' : 'hist.redone'));
}
const undoHTML = () => `<span class="ed-undo-grp"><button class="ed-ico" type="button" id="edUndo" aria-label="${esc(T('hist.undo'))}" title="${esc(T('hist.undo'))} (Ctrl+Z)">${ICON.undo}</button><button class="ed-ico" type="button" id="edRedo" aria-label="${esc(T('hist.redo'))}" title="${esc(T('hist.redo'))} (Ctrl+Y)">${ICON.redo}</button></span>`;
function wireUndo() { $('#edUndo').onclick = () => stepHistory(-1); $('#edRedo').onclick = () => stepHistory(1); undoButtons(); }

// ---------- zoom ----------
const ZOOMS = [.5, .75, 1, 1.25, 1.5, 2, 3];
function setZoom(z) {
  S.zoom = Math.min(3, Math.max(.5, z));
  if (S.view === 'page') buildPages(S.current);
}
const stepZoom = d => { const i = ZOOMS.findIndex(z => z >= (S.zoom || 1) - 1e-6); setZoom(ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? 2 : i) + d))]); };

// ---------- search (Ctrl+F) ----------
function openSearch() {
  if (S.view !== 'page') { openPage(S.current || S.pages.find(p => !p.deleted).id); setTimeout(openSearch, 300); return; }
  let bar = $('#edSearch');
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'edSearch'; bar.className = 'ed-search'; bar.setAttribute('role', 'search');
    bar.innerHTML = `<input type="search" id="edSearchQ" placeholder="${esc(T('search.ph'))}" aria-label="${esc(T('search.ph'))}"><span id="edSearchN" class="ed-search-n"></span>
      <button class="ed-ico" type="button" id="edSearchPrev" aria-label="${esc(T('search.prev'))}" title="${esc(T('search.prev'))}">↑</button><button class="ed-ico" type="button" id="edSearchNext" aria-label="${esc(T('search.next'))}" title="${esc(T('search.next'))}">↓</button>
      <button class="ed-ico" type="button" id="edSearchX" aria-label="${esc(T('find.close'))}">${ICON.x}</button>`;
    $('#editor').appendChild(bar);
    let t = 0;
    $('#edSearchQ').addEventListener('input', () => { clearTimeout(t); t = setTimeout(runSearch, 250); });
    $('#edSearchQ').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); moveSearch(e.shiftKey ? -1 : 1); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSearch(); }
    });
    $('#edSearchPrev').onclick = () => moveSearch(-1); $('#edSearchNext').onclick = () => moveSearch(1); $('#edSearchX').onclick = closeSearch;
  }
  $('#edSearchQ').focus(); $('#edSearchQ').select();
}
function closeSearch() { const b = $('#edSearch'); if (b) b.remove(); S.search = null; paintSearch(); }
async function runSearch() {
  const q = ($('#edSearchQ') || {}).value || '';
  if (!q.trim()) { S.search = null; $('#edSearchN').textContent = ''; paintSearch(); return; }
  const hits = await findAll(new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'gi'));
  S.search = { hits, i: hits.length ? 0 : -1 };
  if (hits.length) { const cur = hits.findIndex(h => h.pg.id === S.current); S.search.i = cur < 0 ? 0 : cur; }
  showSearchHit();
}
function moveSearch(d) { if (!S.search || !S.search.hits.length) return; S.search.i = (S.search.i + d + S.search.hits.length) % S.search.hits.length; showSearchHit(); }
function showSearchHit() {
  const s = S.search, n = $('#edSearchN');
  if (n) n.textContent = s && s.hits.length ? T('search.count', { i: s.i + 1, n: s.hits.length }) : T('search.none');
  paintSearch();
  if (s && s.hits[s.i]) { const h = s.hits[s.i]; if (S.current !== h.pg.id) { S.current = h.pg.id; updatePager(); } peek(h); }
}
function searchMarks(v) {
  v.layer.querySelectorAll('.ed-shit').forEach(n => n.remove());
  if (!S.search) return;
  S.search.hits.forEach((h, k) => {
    if (h.pg.id !== v.pg.id) return;
    const [x1, y1, x2, y2] = v.vp.convertToViewportRectangle([h.x1, h.y1, h.x2, h.y2]);
    const el = document.createElement('div'); el.className = 'ed-shit' + (k === S.search.i ? ' cur' : '');
    Object.assign(el.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px' });
    v.layer.appendChild(el);
  });
}
function paintSearch() { if (S && S.pv) for (const v of S.pv.views.values()) if (v.drawn) searchMarks(v); }

// ---------- blank pages ----------
async function insertBlank(after) {
  await app().lib('pdflib');
  const page = await S.docs[after.doc].js.getPage(after.index + 1), [x0, y0, x1, y1] = page.view;
  const doc = await PDFLib.PDFDocument.create(); doc.addPage([x1 - x0, y1 - y0]);
  const file = new File([await doc.save()], T('blank.name') + '.pdf', { type: 'application/pdf' });
  await addDoc(file);
  const blank = S.pages.pop();
  S.pages.splice(S.pages.indexOf(after) + 1, 0, blank);
  S.dirty = true;
  renderGrid();
}

// ---------- stamps, watermark and page numbers ----------
const STAMP_COLORS = { red: '#c62828', blue: '#1f4fb8', green: '#1b7a3c', grey: '#555b66' };
function stampImage(text, color, withDate) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), fs = 64;
  const lines = [text.toUpperCase()]; if (withDate) lines.push(new Date().toLocaleDateString(window.LV && window.LV.lang === 'da' ? 'da-DK' : 'en-GB'));
  ctx.font = `800 ${fs}px Arial, Helvetica, sans-serif`;
  const w = Math.max(...lines.map((l, i) => { ctx.font = `${i ? 600 : 800} ${i ? fs * .45 : fs}px Arial, Helvetica, sans-serif`; return ctx.measureText(l).width; })) + 60;
  const h = fs + 44 + (withDate ? fs * .55 : 0);
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  ctx.strokeStyle = ctx.fillStyle = STAMP_COLORS[color] || color; ctx.lineWidth = 7;
  const r = 14; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(5, 5, c.width - 10, c.height - 10, r) : ctx.rect(5, 5, c.width - 10, c.height - 10); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${fs}px Arial, Helvetica, sans-serif`; ctx.fillText(lines[0], c.width / 2, 22 + fs * .85);
  if (withDate) { ctx.font = `600 ${fs * .45}px Arial, Helvetica, sans-serif`; ctx.fillText(lines[1], c.width / 2, 22 + fs * .85 + fs * .55); }
  return c.toDataURL('image/png');
}
function openStamps(startTab) {
  const wm = S.watermark || { text: T('stamp.copy'), color: 'red', opacity: .15 }, nums = S.pageNums || { pos: 'bc', fmt: 'n', start: 1 };
  const d = document.createElement('dialog');
  d.className = 'pw-dialog sig-dialog';
  const colors = sel => Object.keys(STAMP_COLORS).map(k => `<label class="st-col"><input type="radio" name="${sel}" value="${k}"><span style="background:${STAMP_COLORS[k]}" title="${esc(T('stamp.col.' + k))}"></span><span class="sr-only">${esc(T('stamp.col.' + k))}</span></label>`).join('');
  d.innerHTML = `<form method="dialog">
    <h2>${esc(T('stamp.title'))}</h2>
    <div class="sig-tabs" role="tablist">
      <button type="button" role="tab" data-tab="stamp" aria-selected="true">${esc(T('stamp.stamp'))}</button>
      <button type="button" role="tab" data-tab="wm" aria-selected="false">${esc(T('stamp.wm'))}</button>
      <button type="button" role="tab" data-tab="nums" aria-selected="false">${esc(T('stamp.nums'))}</button>
    </div>
    <div class="sig-pane" data-pane="stamp">
      <div class="st-presets">${['copy', 'draft', 'paid', 'approved', 'confidential'].map(k => `<button type="button" class="ed-chip" data-text="${esc(T('stamp.' + k))}">${esc(T('stamp.' + k))}</button>`).join('')}</div>
      <label>${esc(T('stamp.text'))}<input type="text" name="stext" maxlength="30" value="${esc(T('stamp.copy'))}"></label>
      <div class="st-row">${colors('scol')}<label class="pw-show"><input type="checkbox" name="sdate"> ${esc(T('stamp.date'))}</label></div>
      <img class="sig-preview st-prev" alt="">
    </div>
    <div class="sig-pane" data-pane="wm" hidden>
      <label class="pw-show"><input type="checkbox" name="won" ${S.watermark ? 'checked' : ''}> ${esc(T('stamp.wmOn'))}</label>
      <label>${esc(T('stamp.text'))}<input type="text" name="wtext" maxlength="30" value="${esc(wm.text)}"></label>
      <div class="st-row">${colors('wcol')}<label>${esc(T('stamp.opacity'))} <input type="range" name="wop" min="5" max="40" value="${Math.round(wm.opacity * 100)}"></label></div>
    </div>
    <div class="sig-pane" data-pane="nums" hidden>
      <label class="pw-show"><input type="checkbox" name="non" ${S.pageNums ? 'checked' : ''}> ${esc(T('stamp.numsOn'))}</label>
      <label>${esc(T('stamp.pos'))}<select name="npos">${['bc', 'br', 'bl', 'tr', 'tc'].map(k => `<option value="${k}"${nums.pos === k ? ' selected' : ''}>${esc(T('stamp.pos.' + k))}</option>`).join('')}</select></label>
      <label>${esc(T('stamp.fmt'))}<select name="nfmt">${['n', 'page', 'pageof', 'slash'].map(k => `<option value="${k}"${nums.fmt === k ? ' selected' : ''}>${esc(numText(k, 1, 5))}</option>`).join('')}</select></label>
      <label>${esc(T('stamp.start'))}<input type="number" name="nstart" min="0" max="9999" value="${nums.start}"></label>
    </div>
    <div class="pw-btns"><button type="button" class="btn sm" value="cancel">${esc(T('pw.cancel'))}</button><button type="submit" class="btn sm primary" id="stOk">${esc(T('stamp.place'))}</button></div>
  </form>`;
  document.body.appendChild(d);
  const f = d.querySelector('form'); let tab = 'stamp';
  f.scol.value = 'red'; f.wcol.value = wm.color;
  const prev = () => { d.querySelector('.st-prev').src = stampImage(f.stext.value || ' ', f.scol.value, f.sdate.checked); };
  d.querySelectorAll('.st-presets [data-text]').forEach(b => b.onclick = () => { f.stext.value = b.dataset.text; prev(); });
  [f.stext, f.sdate, ...f.scol].forEach(i => i.addEventListener('input', prev)); prev();
  d.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    tab = b.dataset.tab;
    d.querySelectorAll('[data-tab]').forEach(o => o.setAttribute('aria-selected', String(o === b)));
    d.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab; });
    $('#stOk').textContent = T(tab === 'stamp' ? 'stamp.place' : 'stamp.apply');
  });
  d.querySelector('[value="cancel"]').onclick = () => d.close();
  f.onsubmit = e => {
    e.preventDefault();
    if (tab === 'stamp') {
      const src = stampImage(f.stext.value.trim() || T('stamp.copy'), f.scol.value, f.sdate.checked);
      d.close();
      const im = new Image(); im.onload = () => { S.placing = { src, ratio: im.height / im.width }; placingMode(true); }; im.src = src;
      return;
    }
    if (tab === 'wm') S.watermark = f.won.checked ? { text: f.wtext.value.trim() || T('stamp.copy'), color: f.wcol.value, opacity: +f.wop.value / 100 } : null;
    if (tab === 'nums') S.pageNums = f.non.checked ? { pos: f.npos.value, fmt: f.nfmt.value, start: +f.nstart.value || 0 } : null;
    S.dirty = true; d.close();
    if (S.view === 'page' && S.pv) for (const v of S.pv.views.values()) if (v.drawn) { v.job++; fillLayer(v); }
  };
  d.addEventListener('close', () => d.remove());
  d.showModal();
  if (startTab) { const b = d.querySelector(`[data-tab="${startTab}"]`); if (b) b.click(); }
}
function numText(fmt, n, total) {
  return fmt === 'page' ? T('stamp.f.page', { n }) : fmt === 'pageof' ? T('stamp.f.pageof', { n, total }) : fmt === 'slash' ? `${n} / ${total}` : String(n);
}
// previews on the page: the watermark across it and the page number
function pageOverlays(v) {
  v.layer.querySelectorAll('.ed-wm, .ed-pnum').forEach(n => n.remove());
  const live = S.pages.filter(p => !p.deleted), i = live.indexOf(v.pg);
  if (S.watermark) {
    const el = document.createElement('div'); el.className = 'ed-wm';
    el.innerHTML = `<span style="color:${STAMP_COLORS[S.watermark.color]};opacity:${S.watermark.opacity}">${esc(S.watermark.text)}</span>`;
    el.firstChild.style.fontSize = Math.min(v.vp.width, v.vp.height) * .16 + 'px';
    v.layer.appendChild(el);
  }
  if (S.pageNums) {
    const p = S.pageNums, el = document.createElement('div'); el.className = 'ed-pnum ' + p.pos;
    el.textContent = numText(p.fmt, i + p.start, live.length - 1 + p.start);
    el.style.fontSize = 10 * v.scale + 'px';
    v.layer.appendChild(el);
  }
}

// ---------- marking up: highlighter, box, arrow, note ----------
const MARK_COLORS = { yellow: '#ffd400', red: '#e0312b', blue: '#2f6fe4', green: '#22a052' };
const MARK_TOOLS = ['hl', 'rect', 'arrow', 'note'];
function markTools() {
  return `<span class="ed-mtools" role="radiogroup" aria-label="${esc(T('mark.tools'))}">${MARK_TOOLS.map(k => `<button type="button" class="ed-chip${S.markTool === k ? ' on' : ''}" data-tool="${k}" aria-pressed="${S.markTool === k}">${esc(T('mark.' + k))}</button>`).join('')}</span>
    <span class="ed-mcolors">${Object.keys(MARK_COLORS).map(k => `<button type="button" class="ed-mcol${S.markColor === k ? ' on' : ''}" data-col="${k}" style="background:${MARK_COLORS[k]}" aria-label="${esc(T('stamp.col.' + (k === 'yellow' ? 'yellow' : k)))}" aria-pressed="${S.markColor === k}"></button>`).join('')}</span>`;
}
function markEl(v, m) {
  const r = m.type === 'arrow' ? [Math.min(m.x1, m.x2), Math.min(m.y1, m.y2), Math.max(m.x1, m.x2), Math.max(m.y1, m.y2)] : [m.x1, m.y1, m.x2, m.y2];
  const [a, b, c, d] = v.vp.convertToViewportRectangle(r);
  const left = Math.min(a, c), top = Math.min(b, d), w = Math.abs(c - a), h = Math.abs(d - b);
  const el = document.createElement('div'); el.className = 'ed-mark ' + m.type;
  const col = MARK_COLORS[m.color] || m.color;
  if (m.type === 'arrow') {
    const pad = 12, [sx, sy] = v.vp.convertToViewportPoint(m.x1, m.y1), [ex, ey] = v.vp.convertToViewportPoint(m.x2, m.y2);
    Object.assign(el.style, { left: left - pad + 'px', top: top - pad + 'px', width: w + pad * 2 + 'px', height: h + pad * 2 + 'px' });
    const ang = Math.atan2(ey - sy, ex - sx), L = 12 * v.scale / 1.4, x2 = ex - left + pad, y2 = ey - top + pad;
    const h1 = [x2 - L * Math.cos(ang - .45), y2 - L * Math.sin(ang - .45)], h2 = [x2 - L * Math.cos(ang + .45), y2 - L * Math.sin(ang + .45)];
    el.innerHTML = `<svg width="100%" height="100%"><g stroke="${col}" stroke-width="${2.2 * v.scale / 1.4}" stroke-linecap="round" fill="none"><line x1="${sx - left + pad}" y1="${sy - top + pad}" x2="${x2}" y2="${y2}"/><polyline points="${h1.join(',')} ${x2},${y2} ${h2.join(',')}"/></g></svg>`;
  } else {
    Object.assign(el.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' });
    if (m.type === 'hl') el.style.background = col;
    if (m.type === 'rect') el.style.borderColor = col;
    if (m.type === 'note') {
      el.style.fontSize = 10 * v.scale + 'px';
      el.innerHTML = `<textarea aria-label="${esc(T('mark.note'))}" placeholder="${esc(T('mark.notePh'))}"></textarea>`;
      const ta = el.querySelector('textarea'); ta.value = m.text || ''; ta.readOnly = !S.marking;
      ta.oninput = () => { m.text = ta.value; S.dirty = true; };
    }
  }
  if (S.marking) {
    const x = document.createElement('button'); x.type = 'button'; x.className = 'ed-ico ed-box-x'; x.innerHTML = ICON.x;
    x.title = T('mark.remove'); x.setAttribute('aria-label', T('mark.remove'));
    x.onclick = e => { e.stopPropagation(); S.marks = S.marks.filter(o => o !== m); S.dirty = true; el.remove(); updateFinish(); };
    el.appendChild(x);
  }
  v.layer.appendChild(el);
  return el;
}
function markDraw(v) {
  const layer = v.layer;
  layer.addEventListener('pointerdown', e => {
    if (!S.marking || e.target !== layer || e.button) return;
    e.preventDefault();
    const r = layer.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const [px, py] = v.vp.convertToPdfPoint(sx, sy);
    if (S.markTool === 'note') {
      const m = { id: ++uid, pageId: v.pg.id, type: 'note', color: S.markColor, x1: px, y1: py - 60, x2: px + 150, y2: py, text: '' };
      S.marks.push(m); S.dirty = true; const el = markEl(v, m); el.querySelector('textarea').focus(); updateFinish();
      return;
    }
    let ex = sx, ey = sy;
    const ghost = document.createElement('div'); ghost.className = 'ed-box drawing'; layer.appendChild(ghost);
    const move = ev => {
      ex = Math.min(Math.max(0, ev.clientX - r.left), r.width); ey = Math.min(Math.max(0, ev.clientY - r.top), r.height);
      Object.assign(ghost.style, { left: Math.min(sx, ex) + 'px', top: Math.min(sy, ey) + 'px', width: Math.abs(ex - sx) + 'px', height: Math.abs(ey - sy) + 'px' });
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); ghost.remove();
      if (Math.hypot(ex - sx, ey - sy) < 5) return;
      const [qx, qy] = v.vp.convertToPdfPoint(ex, ey);
      const m = S.markTool === 'arrow'
        ? { id: ++uid, pageId: v.pg.id, type: 'arrow', color: S.markColor, x1: px, y1: py, x2: qx, y2: qy }
        : { id: ++uid, pageId: v.pg.id, type: S.markTool, color: S.markColor, x1: Math.min(px, qx), y1: Math.min(py, qy), x2: Math.max(px, qx), y2: Math.max(py, qy) };
      S.marks.push(m); S.dirty = true; markEl(v, m); updateFinish();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}
// writes the marks, the watermark and the page number into a saved page
async function drawExtras(out, page, pg, i, total, fonts) {
  const { rgb, degrees, StandardFonts } = PDFLib;
  const hex = h => { const n = parseInt(h.slice(1), 16); return rgb((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
  fonts.reg = fonts.reg || await out.embedFont(StandardFonts.Helvetica);
  fonts.bold = fonts.bold || await out.embedFont(StandardFonts.HelveticaBold);
  for (const m of S.marks.filter(x => x.pageId === pg.id)) {
    const col = hex(MARK_COLORS[m.color] || '#ffd400');
    if (m.type === 'hl') page.drawRectangle({ x: m.x1, y: m.y1, width: m.x2 - m.x1, height: m.y2 - m.y1, color: col, opacity: .38 });
    if (m.type === 'rect') page.drawRectangle({ x: m.x1, y: m.y1, width: m.x2 - m.x1, height: m.y2 - m.y1, borderColor: col, borderWidth: 2 });
    if (m.type === 'arrow') {
      const ang = Math.atan2(m.y2 - m.y1, m.x2 - m.x1), L = 10;
      page.drawLine({ start: { x: m.x1, y: m.y1 }, end: { x: m.x2, y: m.y2 }, thickness: 2, color: col });
      for (const s of [-.45, .45]) page.drawLine({ start: { x: m.x2, y: m.y2 }, end: { x: m.x2 - L * Math.cos(ang + s), y: m.y2 - L * Math.sin(ang + s) }, thickness: 2, color: col });
    }
    if (m.type === 'note') {
      page.drawRectangle({ x: m.x1, y: m.y1, width: m.x2 - m.x1, height: m.y2 - m.y1, color: rgb(1, .96, .66), borderColor: hex(MARK_COLORS[m.color] || '#ffd400'), borderWidth: 1 });
      const words = (m.text || '').replace(app().WIN_ANSI, '?').split(/(\s+)/), lines = [];
      let cur = '';
      for (const part of words) { if (part === '\n' || /\n/.test(part)) { lines.push(cur); cur = ''; continue; } const t = cur + part; if (fonts.reg.widthOfTextAtSize(t, 10) > m.x2 - m.x1 - 8 && cur) { lines.push(cur); cur = part.trimStart(); } else cur = t; }
      lines.push(cur);
      lines.forEach((l, k) => { const y = m.y2 - 14 - k * 12; if (y > m.y1 + 2) page.drawText(l, { x: m.x1 + 4, y, size: 10, font: fonts.reg, color: rgb(.15, .15, .15) }); });
    }
  }
  const { width: W, height: Hh, x: X0, y: Y0 } = page.getMediaBox();
  if (S.watermark) {
    const wm = S.watermark, text = wm.text.replace(app().WIN_ANSI, '?'), size = Math.min(W, Hh) * .16, tw = fonts.bold.widthOfTextAtSize(text, size);
    const a = Math.PI / 4, cx = X0 + W / 2, cy = Y0 + Hh / 2;
    page.drawText(text, { x: cx - Math.cos(a) * tw / 2 + Math.sin(a) * size * .35, y: cy - Math.sin(a) * tw / 2 - Math.cos(a) * size * .35, size, font: fonts.bold, color: hex(STAMP_COLORS[wm.color]), opacity: wm.opacity, rotate: degrees(45) });
  }
  if (S.pageNums) {
    const p = S.pageNums, text = numText(p.fmt, i + p.start, total - 1 + p.start).replace(app().WIN_ANSI, '?'), size = 10, tw = fonts.reg.widthOfTextAtSize(text, size);
    const x = p.pos.endsWith('c') ? X0 + (W - tw) / 2 : p.pos.endsWith('r') ? X0 + W - 36 - tw : X0 + 36;
    const y = p.pos.startsWith('b') ? Y0 + 22 : Y0 + Hh - 30;
    page.drawText(text, { x, y, size, font: fonts.reg, color: rgb(.3, .3, .3) });
  }
}

// ---------- signatures ----------
// Draw a signature or choose a picture of one, then click a page to place it.
// It can be moved and resized, and is written into the PDF as a picture.
// Signatures are only remembered (in this browser) when the visitor asks.
const SIG_KEY = 'lunaverta-signatures';
const savedSigs = () => { try { return JSON.parse(localStorage.getItem(SIG_KEY) || '[]'); } catch (e) { return []; } };
const storeSigs = list => { try { localStorage.setItem(SIG_KEY, JSON.stringify(list.slice(0, 6))); } catch (e) {} };
// Crops to the ink and, if asked, makes near-white pixels transparent.
function cleanSig(src, dropWhite) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data;
  let x1 = c.width, y1 = c.height, x2 = -1, y2 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    if (dropWhite && d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) d[i + 3] = 0;
    if (d[i + 3] > 20) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
  }
  if (x2 < 0) return null;
  ctx.putImageData(img, 0, 0);
  const pad = 4, out = document.createElement('canvas');
  out.width = x2 - x1 + 1 + pad * 2; out.height = y2 - y1 + 1 + pad * 2;
  out.getContext('2d').drawImage(c, x1 - pad, y1 - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
function openSign() {
  const d = document.createElement('dialog');
  d.className = 'pw-dialog sig-dialog';
  d.innerHTML = `<form method="dialog">
    <h2>${esc(T('sign.title'))}</h2>
    <div class="sig-tabs" role="tablist">
      <button type="button" role="tab" data-tab="draw" aria-selected="true">${esc(T('sign.draw'))}</button>
      <button type="button" role="tab" data-tab="upload" aria-selected="false">${esc(T('sign.upload'))}</button>
      <button type="button" role="tab" data-tab="saved" aria-selected="false">${esc(T('sign.saved'))}</button>
    </div>
    <div class="sig-pane" data-pane="draw"><p class="pw-note">${esc(T('sign.drawHint'))}</p><canvas class="sig-pad" width="560" height="200"></canvas><button type="button" class="linkish" data-act="clear">${esc(T('sign.clear'))}</button></div>
    <div class="sig-pane" data-pane="upload" hidden><label>${esc(T('sign.pick'))}<input type="file" accept="image/*"></label><label class="pw-show"><input type="checkbox" name="white" checked> ${esc(T('sign.white'))}</label><img class="sig-preview" alt="" hidden></div>
    <div class="sig-pane" data-pane="saved" hidden><div class="sig-saved"></div></div>
    <label class="pw-show"><input type="checkbox" name="remember"> ${esc(T('sign.remember'))}</label>
    <p class="pw-err" role="alert" hidden></p>
    <div class="pw-btns"><button type="button" class="btn sm" value="cancel">${esc(T('pw.cancel'))}</button><button type="submit" class="btn sm primary">${esc(T('sign.place'))}</button></div>
  </form>`;
  document.body.appendChild(d);
  const f = d.querySelector('form'), err = d.querySelector('.pw-err');
  let tab = 'draw', chosen = null, upload = null;
  d.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    tab = b.dataset.tab;
    d.querySelectorAll('[data-tab]').forEach(o => o.setAttribute('aria-selected', String(o === b)));
    d.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab; });
  });
  // drawing pad
  const pad = d.querySelector('.sig-pad'), pctx = pad.getContext('2d');
  pctx.lineWidth = 2.6; pctx.lineCap = pctx.lineJoin = 'round'; pctx.strokeStyle = '#0b1a5c';
  let drawing = false, inked = false, last = null;
  const at = e => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height]; };
  pad.addEventListener('pointerdown', e => { drawing = true; last = at(e); pad.setPointerCapture(e.pointerId); });
  pad.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = at(e);
    pctx.beginPath(); pctx.moveTo(last[0], last[1]); pctx.quadraticCurveTo(last[0], last[1], (last[0] + p[0]) / 2, (last[1] + p[1]) / 2); pctx.lineTo(p[0], p[1]); pctx.stroke();
    last = p; inked = true;
  });
  pad.addEventListener('pointerup', () => { drawing = false; });
  d.querySelector('[data-act="clear"]').onclick = () => { pctx.clearRect(0, 0, pad.width, pad.height); inked = false; };
  // picture
  const prev = d.querySelector('.sig-preview');
  const loadUpload = async () => {
    const file = d.querySelector('input[type="file"]').files[0]; if (!file) return;
    const im = await createImageBitmap(file);
    const k = Math.min(1, 1200 / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    upload = cleanSig(c, f.white.checked); prev.src = upload || ''; prev.hidden = !upload;
  };
  d.querySelector('input[type="file"]').onchange = loadUpload;
  f.white.onchange = loadUpload;
  // saved ones
  const drawSaved = () => {
    const list = savedSigs(), box = d.querySelector('.sig-saved');
    box.innerHTML = list.length ? list.map((src, i) => `<div class="sig-item${chosen === src ? ' on' : ''}"><button type="button" data-i="${i}" aria-label="${esc(T('sign.use'))}"><img src="${src}" alt=""></button><button type="button" class="ed-ico" data-del="${i}" aria-label="${esc(T('sign.forget'))}" title="${esc(T('sign.forget'))}">${ICON.x}</button></div>`).join('') : `<p class="pw-note">${esc(T('sign.none'))}</p>`;
    box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { chosen = list[+b.dataset.i]; drawSaved(); });
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const l = savedSigs(); l.splice(+b.dataset.del, 1); storeSigs(l); chosen = null; drawSaved(); });
  };
  drawSaved();
  if (savedSigs().length) d.querySelector('[data-tab="saved"]').click();
  d.querySelector('[value="cancel"]').onclick = () => d.close();
  f.onsubmit = e => {
    e.preventDefault();
    const src = tab === 'draw' ? (inked ? cleanSig(pad, false) : null) : tab === 'upload' ? upload : chosen;
    if (!src) { err.textContent = T('sign.empty'); err.hidden = false; return; }
    if (f.remember.checked && tab !== 'saved') storeSigs([src, ...savedSigs().filter(s => s !== src)]);
    d.close();
    const im = new Image();
    im.onload = () => { S.placing = { src, ratio: im.height / im.width }; placingMode(true); };
    im.src = src;
  };
  d.addEventListener('close', () => d.remove());
  d.showModal();
}
function placingMode(on) {
  document.documentElement.classList.toggle('ed-placing', on);
  const h = $('#edPageHint'); if (h && on) h.textContent = T('sign.placeHint');
  if (!on) S.placing = null;
}
// a placed signature: drag to move, corner to resize, × to remove
function sigBox(v, im) {
  const el = document.createElement('div');
  el.className = 'ed-img';
  el.innerHTML = `<img src="${im.src}" alt="" draggable="false"><span class="ed-img-size" title="${esc(T('sign.resize'))}" aria-hidden="true"></span><button type="button" class="ed-ico ed-box-x" aria-label="${esc(T('sign.remove'))}" title="${esc(T('sign.remove'))}">${ICON.x}</button>`;
  const place = () => {
    const [x1, y1, x2, y2] = v.vp.convertToViewportRectangle([im.x, im.y, im.x + im.w, im.y + im.h]);
    Object.assign(el.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px' });
  };
  place();
  el.querySelector('.ed-box-x').onclick = e => { e.stopPropagation(); S.images = S.images.filter(o => o !== im); S.dirty = true; el.remove(); };
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('.ed-box-x')) return;
    e.preventDefault(); e.stopPropagation();
    const resize = e.target.classList.contains('ed-img-size');
    const start = { x: e.clientX, y: e.clientY, im: { ...im } }, k = 1 / v.scale;
    const move = ev => {
      const dx = (ev.clientX - start.x) * k, dy = (ev.clientY - start.y) * k;
      if (resize) { const w = Math.max(20, start.im.w + dx), h = w * (start.im.h / start.im.w); im.w = w; im.h = h; im.y = start.im.y + start.im.h - h; }
      else { im.x = start.im.x + dx; im.y = start.im.y - dy; }
      S.dirty = true; place();
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
  v.layer.appendChild(el);
}

// ---------- blacking out ----------
// Boxes are kept in PDF units, so they stay put whatever the zoom or rotation.
function blackBox(b, vp, layer) {
  const [x1, y1, x2, y2] = vp.convertToViewportRectangle([b.x1, b.y1, b.x2, b.y2]);
  const el = document.createElement('div');
  el.className = 'ed-box' + (b.blank ? ' blank' : '');
  Object.assign(el.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px' });
  if (S.redacting) {
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'ed-ico ed-box-x'; x.innerHTML = ICON.x;
    x.title = T('ed.removeBox'); x.setAttribute('aria-label', T('ed.removeBox'));
    x.onclick = e => { e.stopPropagation(); S.boxes = S.boxes.filter(o => o !== b); S.dirty = true; el.remove(); updateFinish(); };
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
      S.boxes.push(b); S.dirty = true; blackBox(b, vp, layer); updateFinish();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}

// ---------- find and remove ----------
// Search all pages for text (or amounts, CPR numbers, e-mails, phone numbers),
// tick the hits to remove, and remove them all at once. Each hit becomes a box
// that deletes the letters under it when the PDF is saved: "blank" boxes leave
// the spot empty, black boxes black it out.
// Suggestions: kinds of text people usually want gone before sharing a PDF.
const CATS = {
  prices: /(?:(?:kr\.?|DKK|EUR|€|\$|£|SEK|NOK|USD)\s?-?\d[\d.  ]*(?:,\d{1,2}|,-)?|-?(?:\d{1,3}(?:[.  ]\d{3})+|\d+),(?:\d{2}|-)(?:\s?(?:kr\.?|DKK|EUR|€))?|\d{1,3}(?:,\d{3})+\.\d{2}|-?\d[\d.  ]*\s?(?:kr\.?|DKK|EUR|€)(?![A-Za-zÆØÅæøå]))/gi,
  priceText: null, // found by findPriceText: labels, terms and notes about money
  cpr: /\b(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])\d{2}[-\s]?\d{4}\b/g,
  accounts: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b|\b(?:\d{4}[\s-]){3}\d{4}\b|\b\d{4}[\s-]\d{6,10}\b/g,
  emails: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  phones: /(?<!\d\s?)(?:\+45\s?)?\b\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b(?!\s?\d)/g,
  addresses: /\b[A-ZÆØÅ][a-zæøåé]+(?:vej|gade|allé|alle|vænge|plads|torv|stræde|parken|boulevard|have|toften|bakken|høj|vang|park|sti|gyde)\s\d{1,4}[A-Za-z]?(?:,?\s?\d{1,2}\.?\s?(?:th|tv|mf)\.?)?|(?<![\d./-])\b(?:[1-9]\d{3})\s(?:[A-ZÆØÅ][a-zæøå]+)(?:\s[A-ZÆØÅ][a-zæøå]+)?(?=\s|,|$)|\b[A-ZÆØÅ]{3,}(?:VEJ|GADE|ALLÉ|ALLE|VÆNGE|PLADS|TORV|STRÆDE|PARKEN|BOULEVARD|HAVE|BAKKEN|VANG|PARK)\s\d{1,4}[A-Z]?(?:,?\s?\d{1,2}\.?\s?(?:TH|TV|MF)\.?)?|(?<![\d./-])\b[1-9]\d{3}\s{1,2}[A-ZÆØÅ]{3,}(?:\s[A-ZÆØÅ]{1,3}\b)?/g,
  dates: /(?<![\d./-])(?:0?[1-9]|[12]\d|3[01])([./-])(?:0?[1-9]|1[0-2])\1(?:\d{4}|\d{2})(?![\d./-]?\d)|\b\d{1,2}\.?\s(?:januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december|january|february|march|may|june|july|october)\s\d{4}\b/gi,
  refs: /(?<=(?:ordre|faktura|kunde|tilbuds?|sags|order|invoice|customer|quote)\s?(?:nr\.?|nummer|no\.?|#)?\s?:?\s?)\d[\d-]{3,}/gi
};
const textCache = new Map(), libDocs = new Map(), pathCache = new Map();
// The page's text as lines, with each character's position. The exact letter
// positions come from reading the page (pdf-text.js), the same way they are
// removed; pdf.js text (positions estimated) is the fallback.
async function pageLines(pg) {
  const key = pg.doc + ':' + pg.index;
  if (textCache.has(key)) return textCache.get(key);
  const est = await estimatedLines(pg);
  let exact = null;
  try { exact = await exactLines(pg); } catch (e) { console.warn('Exact text positions unavailable', e); }
  const count = ls => ls.reduce((n, l) => n + l.str.replace(/\s/g, '').length, 0);
  const lines = exact && count(exact) >= count(est) * .9 ? exact : est;
  textCache.set(key, lines);
  return lines;
}
async function exactLines(pg) {
  await app().lib('pdflib');
  if (!libDocs.has(pg.doc)) libDocs.set(pg.doc, S.docs[pg.doc].file.arrayBuffer().then(b => app().loadPdfBytes(new Uint8Array(b), { updateMetadata: false })));
  const doc = await libDocs.get(pg.doc);
  const rd = await window.LVPdfText.readPage(doc, doc.getPage(pg.index));
  if (!rd) return null;
  pathCache.set(pg.doc + ':' + pg.index, rd.paths || []);
  const rows = [];
  for (const g of rd.glyphs) {
    if (!g.upright || !g.ch || !g.size) continue;
    let row = rows.find(r => Math.abs(r.y - g.y0) < g.size * .25 && Math.abs(r.size - g.size) < g.size * .5);
    if (!row) rows.push(row = { y: g.y0, size: g.size, gl: [] });
    row.gl.push(g);
  }
  return rows.map(row => {
    row.gl.sort((p, q) => p.xL - q.xL);
    let str = '', pos = [], end = null;
    for (const g of row.gl) {
      const ch = g.ch.normalize('NFKC');
      if (end !== null) {
        const gap = g.xL - end;
        const sep = gap > row.size * 1.5 ? '\t\t' : gap > row.size * .2 && !/\s$/.test(str) && !/^\s/.test(ch) ? ' ' : '';
        for (const c of sep) { str += c; pos.push(null); }
      }
      for (const c of ch) { str += c; pos.push(/\s/.test(c) ? null : [g.xL, g.xR]); }
      end = Math.max(end ?? -Infinity, g.xR);
    }
    return { str, pos, y: row.y, size: row.size };
  });
}
async function estimatedLines(pg) {
  const page = await S.docs[pg.doc].js.getPage(pg.index + 1);
  let items = [];
  try { items = (await page.getTextContent()).items; } catch (e) {}
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.transform) continue;
    const [a, b, c, d, e, f] = it.transform;
    if (Math.abs(b) > .01 || Math.abs(c) > .01 || a <= 0 || d <= 0 || !it.width) continue;
    let row = rows.find(r => Math.abs(r.y - f) < d * .25 && Math.abs(r.size - d) < d * .5);
    if (!row) rows.push(row = { y: f, size: d, items: [] });
    row.items.push({ str: it.str, x: e, w: it.width });
  }
  const lines = rows.map(row => {
    row.items.sort((p, q) => p.x - q.x);
    let str = '', pos = [], end = null;
    for (const it of row.items) {
      if (end !== null) {
        const gap = it.x - end;
        // a wide gap is a new column: two tabs keep a search from running across it
        const sep = gap > row.size * 1.5 ? '\t\t' : gap > row.size * .15 && !/\s$/.test(str) ? ' ' : '';
        for (const ch of sep) { str += ch; pos.push(null); }
      }
      const n = it.str.length;
      for (let k = 0; k < n; k++) { str += it.str[k]; pos.push([it.x + it.w * k / n, it.x + it.w * (k + 1) / n]); }
      end = it.x + it.w;
    }
    return { str, pos, y: row.y, size: row.size };
  });
  return lines;
}
async function findAll(re, progress, judge) {
  const hits = [];
  const live = S.pages.filter(p => !p.deleted);
  for (const [i, pg] of live.entries()) {
    for (const ln of await pageLines(pg)) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(ln.str))) {
        if (!m[0]) { re.lastIndex++; continue; }
        let s0 = m.index, s1 = m.index + m[0].length;
        while (s0 < s1 && /\s/.test(ln.str[s0])) s0++;
        while (s1 > s0 && /\s/.test(ln.str[s1 - 1])) s1--;
        // judge: 0 = skip, a number = how sure, or { kind, grow } to take in a few more characters (a % sign)
        let kind = judge ? judge(ln.str.slice(s0, s1), ln.str.slice(0, s0), ln.str.slice(s1), ln.str) : 1;
        let rate = false, dot = false;
        if (kind && typeof kind === 'object') { s1 += kind.grow || 0; rate = !!kind.rate; dot = !!kind.dot; kind = kind.kind; }
        if (!kind) continue;
        const xs = ln.pos.slice(s0, s1).filter(Boolean);
        if (!xs.length) continue;
        const x1 = Math.min(...xs.map(p => p[0])), x2 = Math.max(...xs.map(p => p[1]));
        hits.push({ pg, n: i + 1, kind, rate, dot, text: ln.str.slice(s0, s1), before: ln.str.slice(Math.max(0, s0 - 28), s0).replace(/\s+/g, ' '), after: ln.str.slice(s1, s1 + 28).replace(/\s+/g, ' '),
          x1: x1 - .5, y1: ln.y - ln.size * .25, x2: x2 + .5, y2: ln.y + ln.size * .95 });
      }
    }
    if (progress) progress(i + 1, live.length);
  }
  return hits;
}
// Prices: finds amounts and leaves other numbers (measurements, technical values,
// dates, quantities, order numbers) alone. A number counts as a price when it
// has a currency (kr., DKK, €, ,-) or is written like money (18.175,94);
// a plain number with two decimals (0,00 or 499,00) counts when its line
// talks about money or it sits in the same column as other prices.
const MONEY = /(?:(?:kr\.?|DKK|EUR|€|\$|£|SEK|NOK|USD)\s?)?-?(?:\d{1,3}(?:[.  ,]\d{3})+|\d+)(?:[.,]\d{2}(?!\d)|,-)?(?:\s?(?:kr\.?|DKK|EUR|€|,-)(?![A-Za-zÆØÅæøå]))?/gi;
const CUR = /kr\.?|DKK|EUR|€|\$|£|SEK|NOK|USD|,-/i;
const RATE_WORDS = /moms|rabat|rente|renter|rentesats|gebyr|afgift|tillæg|vat|discount|interest|fee/i;
const PAY_WORDS = /betaling|betales|forfald|rettidig|sidste frist|due|payment/i;
// column headings above prices (Pris, Beløb …) and words about money, for the "Price words" suggestion
const PRICE_HEAD = /(?<![A-Za-zæøåÆØÅ])(?:pris|priser|stykpris|enhedspris|à-pris|a-pris|totalpris|beløb|total(?!\s?\/\s?gennemsnit)|i alt|moms(?!\s?[-.]?\s?(?:nr|nummer|reg))|rabat|price|amount|unit price|subtotal)(?![A-Za-zæøåÆØÅ])/gi;
const MONEY_WORDS = /\b(?:pris|priser|stykpris|enhedspris|beløb|total|totalt|i alt|subtotal|moms|rabat|netto|brutto|sum|at betale|price|amount|vat|discount|dkk|kr)\b/i;
function judgePrice(m, before, after, line) {
  const num = m.replace(/(?:kr\.?|DKK|EUR|€|\$|£|SEK|NOK|USD|,-)/gi, '').trim();
  if (!/\d/.test(num)) return 0;
  // not part of a date, a range like 4-20-4, a size like 728 x 2178, or a code
  if (/[\d./-]$/.test(before) || /^[./-]?\d/.test(after) || /^[./]\d{4}/.test(after)) return 0;
  if (/[x×]\s*$/i.test(before) || /^\s*[x×]\s*\d/i.test(after)) return 0;
  // a rate on a line about VAT, discount or interest: 25,00 % moms, 2,00 % rente
  const pct = /^\s*%/.exec(after);
  if (pct) return { kind: RATE_WORDS.test(line) ? 2 : 1, grow: pct[0].length, rate: true };
  // a value with a unit or label that isn't money
  if (/(?:\b[UgRλ][a-z]{0,2}\s*[=:]|værdi\s*:?|nr\.?\s*:?|no\.?\s*:?|#)\s*$/i.test(before)) return 0;
  if (/^\s*(?:mm|cm|m²|m2|m³|m3|m\b|km|kg|g\b|t\b|l\b|ml|%|‰|w\b|kw|kwh|°|stk|pcs|timer|t\.|dage|sider|år)/i.test(after)) return 0;
  const cur = CUR.test(m) || /(?:kr\.?|DKK|EUR|€|\$)\s?$/i.test(before) || /^\s?(?:kr|DKK|€|,-)/i.test(after);
  const dec = /\d[.,]\d{2}$/.test(num), thou = /\d[.  ,]\d{3}(?:[.,]\d{2})?$/.test(num);
  if (cur && (dec || thou || /\d/.test(num))) return 2;      // with a currency
  // 0.72 (point decimals, no currency): a measurement in Danish documents; decided below
  if (/^-?\d+\.\d{2}$/.test(num)) return { kind: 1, dot: true };
  if (dec && thou) return 2;                                  // 18.175,94
  // averages ("Total / gennemsnit") are not money
  const money = (MONEY_WORDS.test(line) || /(?:^|\s)à\s/.test(line)) && !/gennemsnit|middel|average|mean/i.test(line);
  if (thou && money) return 2;                                // Pris i alt: 1.234
  if (dec) return money ? 2 : 1;                              // 0,00: decided by its column below
  return 0;
}
async function findPrices(progress) {
  let hits = await findAll(new RegExp(MONEY.source, MONEY.flags), progress, judgePrice);
  // A document that writes money with decimal commas (3.951,34) uses points
  // for other things (0.72, 1.59): those are not prices.
  const comma = hits.some(h => h.kind === 2 && /\d,\d{2}|,-/.test(h.text));
  if (comma) hits = hits.filter(h => !h.dot);
  const strong = hits.filter(h => h.kind === 2 && !h.dot);
  const heads = await findAll(new RegExp(PRICE_HEAD.source, PRICE_HEAD.flags));
  // plain decimals count when right-aligned with a price, or under a Pris/Beløb heading
  const rateHeads = await findAll(new RegExp(RATE_WORDS.source, 'gi'));
  const keep = hits.filter(h => h.kind === 2
    // a percentage just under a heading like Rentesats or Moms
    || (h.rate && rateHeads.some(c => c.pg.id === h.pg.id && h.y2 < c.y1 + 1 && c.y1 - h.y2 < 30 && h.x2 > c.x1 - 20 && h.x1 < c.x2 + 20))
    || (!h.rate && strong.some(s => s.pg.id === h.pg.id && Math.abs(s.x2 - h.x2) < 2.5))
    || (!h.rate && heads.some(c => c.pg.id === h.pg.id && h.y2 < c.y1 + 1 && h.x2 > c.x1 - 12 && h.x1 < c.x2 + 12)));
  // payment dates (Betaling 02.12.26, Forfald …)
  const dates = await findAll(new RegExp(CATS.dates.source, CATS.dates.flags), null, (m, b, a, line) => (PAY_WORDS.test(line) ? 2 : 0));
  return keep.concat(dates.filter(d => !keep.some(k => sameSpot(k, d))));
}
// One hit from characters s0..s1 of a line.
function makeHit(pg, n, ln, s0, s1) {
  while (s0 < s1 && /\s/.test(ln.str[s0])) s0++;
  while (s1 > s0 && /\s/.test(ln.str[s1 - 1])) s1--;
  const xs = ln.pos.slice(s0, s1).filter(Boolean);
  if (!xs.length) return null;
  const x1 = Math.min(...xs.map(p => p[0])), x2 = Math.max(...xs.map(p => p[1]));
  return { pg, n, text: ln.str.slice(s0, s1), before: ln.str.slice(Math.max(0, s0 - 28), s0).replace(/\s+/g, ' '), after: ln.str.slice(s1, s1 + 28).replace(/\s+/g, ' '),
    x1: x1 - .5, y1: ln.y - ln.size * .25, x2: x2 + .5, y2: ln.y + ln.size * .95 };
}
// The pieces of a line between column gaps: a cell, a label, a value.
function segments(ln) {
  const out = []; let s0 = 0;
  const re = /\t\t/g; let m;
  while ((m = re.exec(ln.str))) { if (m.index > s0) out.push([s0, m.index]); s0 = m.index + 2; }
  if (s0 < ln.str.length) out.push([s0, ln.str.length]);
  return out.filter(([a, b]) => ln.str.slice(a, b).trim());
}
// Words that show a text is about money. Every sender lays out invoices
// differently, so this is a broad list in Danish and English.
const PRICE_TEXT = /(?<![A-Za-zæøåÆØÅ])(?:(?:liste|netto|brutto|enheds|styk|total|salgs|kost|ny|tilbuds|vejl\.?\s?|udsalgs)?pris(?:er|en)?|[a-zæøå-]*beløb(?:et)?|moms(?:grundlag|beløb|fri|pligtig)?(?!\s?[-.]?\s?(?:nr|nummer|reg))|ekskl\.?\s?moms|inkl\.?\s?moms|rabat(?:ten)?|total(?:t|en)?|i alt|sub-?total|sum(?:men)?|netto|brutto|at betale|til betaling|betaling(?:s?betingelse(?:r)?|sfrist|sdato|en)?|betales|betalt|forfald(?:sdato)?|sidste rettidige|rente(?:sats|r)?|gebyr(?:er)?|fragt|afgift(?:er)?|[a-zæøå]*tillæg|depositum|saldo|kredit|debet|udlæg|valuta|DKK|EUR|NOK|SEK|kr\.|pr\.?\s?(?:md|mdr|måned|stk|enhed|time)\.?|à|a-pris|price|prices|amount|subtotal|vat|tax|discount|due|payment|balance|net|gross|freight|fee|interest|currency|paid)(?![A-Za-zæøåÆØÅ])/i;
async function findPriceText(progress) {
  const hits = [];
  const live = S.pages.filter(p => !p.deleted);
  for (const [i, pg] of live.entries()) {
    for (const ln of await pageLines(pg)) {
      for (const [a, b] of segments(ln)) {
        const seg = ln.str.slice(a, b);
        if (/gennemsnit|middel|average/i.test(seg)) continue; // "Total / gennemsnit" is an average, not money
        // small linking words between amounts ("25,00 % af 1,00", "2 à 499,00") go too
        const link = /^\s*(?:af|à|a|x|pr\.?|of|at|á)\s*$/i.test(seg) && /\d[.,]\d{2}/.test(ln.str);
        if (!link && !PRICE_TEXT.test(seg)) continue;
        // A short label or term goes whole ("Betalingsbetingelse: PBS: Lbm + 32 dage netto").
        // In a sentence, or a cell that also holds a quantity or amount ("1 STK a DKK 18.175,94"),
        // only the money words go (the amount itself is a Price), so "1 STK" stays.
        const amount = /(?<![\d.,])\d{1,3}(?:[.  ]\d{3})*,\d{2}(?![\d.,])/.test(seg);
        const qty = /\b\d+\s?(?:stk|pcs|styk|sæt|par|m²|m2|m|kg|l)\b/i.test(seg);
        if (link || (seg.trim().length <= 60 && !amount && !qty)) { const h = makeHit(pg, i + 1, ln, a, b); if (h) hits.push(h); continue; }
        const re = new RegExp(PRICE_TEXT.source + '|(?<![A-Za-zæøåÆØÅ])(?:a|à|á|af)(?=\\s+(?:DKK|kr\\.?|EUR|€)?\\s?\\d)', 'gi'); let m;
        while ((m = re.exec(seg))) { const h = makeHit(pg, i + 1, ln, a + m.index, a + m.index + m[0].length); if (h) hits.push(h); }
      }
    }
    if (progress) progress(i + 1, live.length);
  }
  return hits;
}
const covers = (b, h) => b.pageId === h.pg.id && b.x1 <= h.x1 + 1 && b.x2 >= h.x2 - 1 && b.y1 <= h.y1 + 1 && b.y2 >= h.y2 - 1;
const sameSpot = (a, b) => a.pg.id === b.pg.id && Math.abs(a.x1 - b.x1) < 1 && Math.abs(a.x2 - b.x2) < 1 && Math.abs(a.y1 - b.y1) < 1;

// Templates: the choices made for one sender's documents, kept in this
// browser only. A template remembers which suggestions were on, which texts
// were kept or added, and marked areas and lines (by page number). It is
// recognised again by the sender's CVR number, e-mail domain or website.
const TPL_KEY = 'lunaverta-templates';
const loadTpls = () => { try { return JSON.parse(localStorage.getItem(TPL_KEY) || '[]'); } catch (e) { return []; } };
const saveTpls = list => { try { localStorage.setItem(TPL_KEY, JSON.stringify(list.slice(0, 50))); } catch (e) {} };
const FREE_MAIL = /^(gmail|hotmail|outlook|live|yahoo|icloud|me|mail|msn|protonmail|proton)\./i;
async function docKeys() {
  const keys = new Set();
  for (const pg of S.pages.filter(p => !p.deleted).slice(0, 3)) for (const ln of await pageLines(pg)) {
    for (const m of ln.str.matchAll(/(?:CVR|SE|VAT)[\s.:-]*(?:nr\.?|no\.?)?[\s.:-]*(?:DK)?[\s-]?(\d{2}\s?\d{2}\s?\d{2}\s?\d{2})\b/gi)) keys.add('cvr:' + m[1].replace(/\s/g, ''));
    for (const m of ln.str.matchAll(/@([\w-]+(?:\.[\w-]+)+)/g)) if (!FREE_MAIL.test(m[1])) keys.add('dom:' + m[1].toLowerCase());
    for (const m of ln.str.matchAll(/\bwww\.([\w-]+(?:\.[\w-]+)+)/gi)) keys.add('dom:' + m[1].toLowerCase());
  }
  return [...keys].slice(0, 6);
}

// The panel. S.find holds the suggestions: per category its hits, which
// categories are switched on, and each hit's on/off (also clickable on the pages).
async function openFind() {
  let panel = $('#edFindPanel');
  if (panel) { panel.querySelector('input[type="search"]').focus(); return; }
  panel = document.createElement('aside');
  panel.id = 'edFindPanel'; panel.className = 'ed-findpanel'; panel.setAttribute('aria-labelledby', 'edFindTitle');
  panel.innerHTML = `
    <div class="ed-find-head"><h2 id="edFindTitle">${esc(T('find.title'))}</h2><button type="button" class="ed-ico ed-find-min" id="edFindMin" aria-expanded="true" aria-label="${esc(T('find.fold'))}" title="${esc(T('find.fold'))}">⌄</button><button type="button" class="ed-ico" id="edFindClose" aria-label="${esc(T('find.close'))}" title="${esc(T('find.close'))}">${ICON.x}</button></div>
    <p class="ed-find-intro">${esc(T('find.intro'))}</p>
    <div class="ed-tpl"><label for="edTplSel">${esc(T('tpl.label'))}</label><select id="edTplSel"></select>
      <button type="button" class="linkish" id="edTplSave">${esc(T('tpl.save'))}</button><button type="button" class="linkish" id="edTplDel" hidden>${esc(T('tpl.delete'))}</button></div>
    <form class="ed-tpl-form" id="edTplForm" hidden><input id="edTplName" maxlength="40" placeholder="${esc(T('tpl.namePh'))}" aria-label="${esc(T('tpl.namePh'))}"><button class="btn sm primary" type="submit">${esc(T('tpl.saveBtn'))}</button></form>
    <div class="ed-find-cats" id="edFindCats" role="group" aria-label="${esc(T('find.suggest'))}"></div>
    <form class="ed-find-form" id="edFindForm"><input type="search" id="edFindQ" placeholder="${esc(T('find.placeholder'))}" aria-label="${esc(T('find.placeholder'))}" autocomplete="off"><button class="btn sm" type="submit">${esc(T('find.add'))}</button></form>
    <div class="ed-find-status" id="edFindStatus" role="status"></div>
    <div class="ed-find-list" id="edFindList"></div>
    <div class="ed-find-foot" id="edFindFoot" hidden>
      <div class="ed-find-drag" role="radiogroup" aria-label="${esc(T('find.dragLabel'))}"><span>${esc(T('find.dragLabel'))}</span>
        <label><input type="radio" name="edFindDrag" value="add" checked> ${esc(T('find.dragAdd'))}</label>
        <label><input type="radio" name="edFindDrag" value="off"> ${esc(T('find.dragOff'))}</label></div>
      <div class="ed-find-sel"><button type="button" class="linkish" id="edFindAll">${esc(T('find.all'))}</button><button type="button" class="linkish" id="edFindNone">${esc(T('find.noneSel'))}</button></div>
      <fieldset class="ed-find-mode"><legend class="sr-only">${esc(T('find.how'))}</legend>
        <label><input type="radio" name="edFindMode" value="blank" checked> ${esc(T('find.modeBlank'))}</label>
        <label><input type="radio" name="edFindMode" value="black"> ${esc(T('find.modeBlack'))}</label></fieldset>
      <p class="ed-find-sum" id="edFindSum" role="status" hidden></p>
      <div class="ed-find-btns"><button type="button" class="btn" id="edFindApply"></button><button type="button" class="btn primary" id="edFindSave"></button></div>
    </div>`;
  $('#editor').appendChild(panel);
  document.documentElement.classList.add('ed-finding');
  const F = S.find = { cats: {}, active: new Set(), custom: [], hits: [] };
  const status = $('#edFindStatus'), list = $('#edFindList'), foot = $('#edFindFoot'), catsEl = $('#edFindCats');
  // the hits shown: those of the switched-on categories, one per spot
  const collect = () => {
    const out = [];
    for (const k of [...Object.keys(CATS), 'custom']) {
      if (!F.active.has(k)) continue;
      for (const h of (k === 'custom' ? F.custom : F.cats[k] || [])) if (!out.some(o => sameSpot(o, h))) out.push(h);
    }
    out.sort((a, b) => a.n - b.n || b.y1 - a.y1 || a.x1 - b.x1);
    out.forEach(h => { h.done = S.boxes.some(b => covers(b, h)); });
    F.hits = out;
  };
  const drawCats = () => {
    catsEl.innerHTML = Object.keys(CATS).map(k => {
      const n = F.cats[k] ? F.cats[k].length : null;
      return `<button type="button" class="ed-cat${F.active.has(k) ? ' on' : ''}" data-k="${k}" aria-pressed="${F.active.has(k)}" ${n === 0 ? 'disabled' : ''}>
        <span class="ed-cat-name">${esc(T('find.cat.' + k))}</span><span class="ed-cat-n">${n === null ? '…' : n}</span>
        <span class="ed-cat-ex">${n ? esc(F.cats[k].slice(0, 2).map(h => h.text).join(', ')) : esc(T(n === 0 ? 'find.noneFound' : 'find.searching'))}</span></button>`;
    }).join('');
    catsEl.querySelectorAll('.ed-cat').forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      if (F.active.has(k)) F.active.delete(k); else { F.active.add(k); (F.cats[k] || []).forEach(h => { h.on = true; }); }
      update();
    });
  };
  const count = () => {
    const sel = F.hits.filter(h => h.on && !h.done).length;
    // Say plainly what will happen before anything is removed.
    const selPages = new Set(F.hits.filter(h => h.on && !h.done).map(h => h.n)).size;
    const sum = $('#edFindSum'); if (sum) { sum.hidden = !sel; sum.textContent = T(selPages === 1 ? 'find.sum1' : 'find.sum', { n: sel, p: selPages }); }
    $('#edFindApply').textContent = T('find.remove', { n: sel }); $('#edFindApply').disabled = !sel;
    $('#edFindSave').textContent = T('find.removeSave', { n: sel }); $('#edFindSave').disabled = !sel && !S.boxes.length;
  };
  const drawList = () => {
    const open = F.hits.filter(h => !h.done), pages = new Set(open.map(h => h.n)).size;
    status.textContent = !F.active.size ? T('find.pick') : F.hits.length ? T('find.count', { n: open.length }) + (open.length ? ' ' + T('find.pages', { n: pages }) : '') : T('find.none');
    list.innerHTML = '';
    let lastN = 0;
    for (const h of F.hits) {
      if (h.n !== lastN) {
        // the page heading switches every hit on that page at once
        const onPage = F.hits.filter(o => o.n === h.n && !o.done), sel = onPage.filter(o => o.on).length;
        const hd = document.createElement('label'); hd.className = 'ed-find-page';
        hd.innerHTML = `<input type="checkbox" ${sel === onPage.length && sel ? 'checked' : ''}> <span>${esc(T('ed.page', { n: h.n }))}</span><span class="ed-find-pcount">${esc(T('find.pageSel', { n: sel, m: onPage.length }))}</span>`;
        const cb = hd.querySelector('input'); cb.indeterminate = sel > 0 && sel < onPage.length; cb.disabled = !onPage.length;
        cb.onchange = () => { onPage.forEach(o => { o.on = cb.checked; }); drawList(); paintHits(); };
        list.appendChild(hd); lastN = h.n;
      }
      const row = document.createElement('label');
      row.className = 'ed-find-hit' + (h.done ? ' done' : '');
      row.innerHTML = `<input type="checkbox" ${h.on && !h.done ? 'checked' : ''} ${h.done ? 'disabled' : ''}><span class="ctx">${esc(h.before)}<mark>${esc(h.text)}</mark>${esc(h.after)}</span>${h.done ? `<span class="tag">${esc(T('find.already'))}</span>` : ''}`;
      row.querySelector('input').onchange = e => { h.on = e.target.checked; drawList(); paintHits(); };
      row.addEventListener('mouseenter', () => peek(h));
      row.addEventListener('focusin', () => peek(h));
      h.row = row;
      list.appendChild(row);
    }
    foot.hidden = !F.hits.length && !S.boxes.length; count();
  };
  const update = () => { collect(); drawCats(); drawList(); paintHits(); };
  // one click on the page: that text is added (or switched back on if it was a suggestion)
  F.add = h => {
    const known = F.hits.find(o => sameSpot(o, h));
    if (known) { known.on = true; } else { h.on = true; h.cat = 'custom'; F.custom.push(h); F.active.add('custom'); }
    update();
  };
  F.dragMode = () => (panel.querySelector('input[name="edFindDrag"]:checked') || {}).value || 'add';
  // switch off every hit inside an area of a page
  F.deselectIn = (pg, r) => {
    let n = 0;
    for (const h of F.hits) if (h.pg.id === pg.id && h.on && !h.done && h.x1 < r.x2 && h.x2 > r.x1 && h.y1 < r.y2 && h.y2 > r.y1) { h.on = false; n++; }
    drawList(); paintHits();
    status.textContent = T('find.deselected', { n });
  };
  F.toggle = h => { h.on = !h.on; const cb = h.row && h.row.querySelector('input'); if (cb) cb.checked = h.on; count(); };
  // apply: every ticked hit becomes a removal box
  const apply = () => {
    const blank = panel.querySelector('input[name="edFindMode"]:checked').value === 'blank';
    let n = 0;
    // found text removes only its own letters; a dragged area removes everything in it
    for (const h of F.hits) if (h.on && !h.done) { S.boxes.push({ id: ++uid, pageId: h.pg.id, x1: h.x1, y1: h.y1, x2: h.x2, y2: h.y2, blank, found: !h.area }); n++; }
    if (n) S.dirty = true;
    return n;
  };
  $('#edFindApply').onclick = () => {
    const before = S.boxes.length, n = apply(), added = S.boxes.slice(before);
    update(); refreshAfterFind();
    status.innerHTML = `${esc(T('find.removed', { n }))} <button type="button" class="linkish" id="edFindUndo">${esc(T('find.undo'))}</button>`;
    $('#edFindUndo').onclick = () => { const gone = new Set(added); S.boxes = S.boxes.filter(b => !gone.has(b)); update(); refreshAfterFind(); };
  };
  $('#edFindSave').onclick = () => { apply(); save({ suffix: '-redacted' }); };
  $('#edFindForm').onsubmit = async e => {
    e.preventDefault();
    const q = $('#edFindQ').value.trim(); if (!q) return;
    status.textContent = T('find.searching');
    const found = await findAll(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'gi'));
    found.forEach(h => { h.on = true; });
    F.custom = F.custom.concat(found.filter(h => !F.custom.some(o => sameSpot(o, h))));
    F.active.add('custom'); $('#edFindQ').value = '';
    update();
  };
  // ---- templates ("remember my choices") ----
  const drawTpls = sel => {
    const list = loadTpls(), el = $('#edTplSel');
    el.innerHTML = `<option value="">${esc(T('tpl.none'))}</option>` + list.map(t => `<option value="${t.id}"${t.id === sel ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    $('#edTplDel').hidden = !el.value;
  };
  const applyTpl = async (t, auto) => {
    F.active = new Set((t.cats || []).filter(k => F.cats[k] && F.cats[k].length));
    for (const k of Object.keys(F.cats)) (F.cats[k] || []).forEach(h => { h.on = !(t.keep || []).includes(h.text); });
    F.custom = [];
    const live = S.pages.filter(p => !p.deleted);
    for (const text of t.remove || []) {
      const found = await findAll(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'g'));
      for (const h of found) if (!F.custom.some(o => sameSpot(o, h))) { h.on = true; h.cat = 'custom'; F.custom.push(h); }
    }
    for (const a of t.areas || []) if (live[a.n - 1]) F.custom.push({ pg: live[a.n - 1], n: a.n, area: true, line: !!a.line, text: T(a.line ? 'find.line' : 'find.area'), before: '', after: '', x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, on: true, cat: 'custom' });
    if (F.custom.length) F.active.add('custom');
    const m = panel.querySelector(`input[name="edFindMode"][value="${t.mode === 'black' ? 'black' : 'blank'}"]`); if (m) m.checked = true;
    update();
    status.textContent = T(auto ? 'tpl.autoUsed' : 'tpl.used', { name: t.name });
  };
  F.drawTpls = drawTpls; F.applyTpl = applyTpl;
  drawTpls();
  $('#edTplSel').onchange = async () => {
    const t = loadTpls().find(o => o.id === $('#edTplSel').value);
    $('#edTplDel').hidden = !t;
    if (t) await applyTpl(t, false);
  };
  $('#edTplSave').onclick = () => {
    const f = $('#edTplForm'); f.hidden = !f.hidden;
    const cur = loadTpls().find(o => o.id === $('#edTplSel').value);
    $('#edTplName').value = cur ? cur.name : ''; if (!f.hidden) $('#edTplName').focus();
  };
  $('#edTplForm').onsubmit = async e => {
    e.preventDefault();
    const name = $('#edTplName').value.trim(); if (!name) return;
    const uniq = a => [...new Set(a)];
    const t = {
      id: (loadTpls().find(o => o.name.toLowerCase() === name.toLowerCase()) || {}).id || 't' + Date.now().toString(36),
      name, keys: await docKeys(), at: Date.now(),
      cats: [...F.active].filter(k => k !== 'custom'),
      keep: uniq(Object.values(F.cats).flat().filter(h => !h.on && !h.done).map(h => h.text)).slice(0, 200),
      remove: uniq(F.custom.filter(h => !h.area && h.on).map(h => h.text)).slice(0, 100),
      areas: F.custom.filter(h => h.area && h.on).map(h => ({ n: h.n, line: !!h.line, x1: h.x1, y1: h.y1, x2: h.x2, y2: h.y2 })).slice(0, 100),
      mode: (panel.querySelector('input[name="edFindMode"]:checked') || {}).value || 'blank'
    };
    saveTpls([t, ...loadTpls().filter(o => o.id !== t.id)]);
    $('#edTplForm').hidden = true; drawTpls(t.id);
    status.textContent = T(t.keys.length ? 'tpl.saved' : 'tpl.savedManual', { name });
  };
  $('#edTplDel').onclick = () => {
    const id = $('#edTplSel').value; if (!id) return;
    saveTpls(loadTpls().filter(o => o.id !== id)); drawTpls('');
    status.textContent = T('tpl.deleted');
  };
  $('#edFindAll').onclick = () => { F.hits.forEach(h => { if (!h.done) h.on = true; }); drawList(); paintHits(); };
  $('#edFindNone').onclick = () => { F.hits.forEach(h => { h.on = false; }); drawList(); paintHits(); };
  $('#edFindClose').onclick = () => closeFind();
  // On a phone the panel is a sheet at the bottom; fold it down to see the page, tap again to open it.
  $('#edFindMin').onclick = () => { const p = $('#edFindPanel'), min = p.classList.toggle('min'); $('#edFindMin').setAttribute('aria-expanded', String(!min)); document.documentElement.classList.toggle('ed-find-min', min); };
  relayout();
  drawCats(); drawList();
  // Look for every kind of suggestion straight away.
  status.textContent = T('find.scanning');
  for (const k of Object.keys(CATS)) {
    if (!S || S.find !== F) return;
    F.cats[k] = (k === 'prices' ? await findPrices() : k === 'priceText' ? await findPriceText() : await findAll(new RegExp(CATS[k].source, CATS[k].flags))).map(h => ({ ...h, on: true, cat: k }));
    if (!S || S.find !== F) return;
    drawCats();
  }
  update();
  // a saved template for this sender is used straight away
  const keys = await docKeys(), tpl = loadTpls().find(t => t.keys && t.keys.some(k => keys.includes(k)));
  drawTpls(tpl && tpl.id);
  if (tpl) await applyTpl(tpl, true);
}
function closeFind(leaving) {
  const p = $('#edFindPanel'); if (!p) return;
  p.remove(); document.documentElement.classList.remove('ed-finding', 'ed-find-min');
  if (!S) return;
  S.find = null;
  if (leaving) return;
  paintHits(); relayout();
  if (S.view === 'page' && S.pv) pageTools();
}
// On wide screens the panel sits beside the pages, so the pages are laid out again to fit.
function relayout() { if (S && S.view === 'page' && S.pv && innerWidth >= 900) buildPages(S.current); }
function refreshAfterFind() {
  if (S.view === 'page' && S.pv) { for (const v of S.pv.views.values()) if (v.drawn) { v.job++; fillLayer(v); } updateFinish(); }
  else if (S.view === 'grid') renderGrid();
}
// The suggested spots on the pages: yellow means "will be removed", outlined
// means "stays". Clicking one switches it.
function hitMarks(v) {
  v.layer.querySelectorAll('.ed-hit, .ed-seg').forEach(n => n.remove());
  if (!S.find) return;
  if (!S.editing && !S.adding && !S.redacting) { segMarks(v); areaSelect(v); }
  for (const h of S.find.hits) {
    if (h.pg.id !== v.pg.id || h.done) continue;
    const [x1, y1, x2, y2] = v.vp.convertToViewportRectangle([h.x1, h.y1, h.x2, h.y2]);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'ed-hit' + (h.on ? ' on' : '');
    el.setAttribute('aria-pressed', String(!!h.on)); el.setAttribute('aria-label', T(h.on ? 'find.markOn' : 'find.markOff', { text: h.text }));
    el.title = T(h.on ? 'find.markOn' : 'find.markOff', { text: h.text });
    Object.assign(el.style, { left: Math.min(x1, x2) - 1 + 'px', top: Math.min(y1, y2) - 1 + 'px', width: Math.abs(x2 - x1) + 2 + 'px', height: Math.abs(y2 - y1) + 2 + 'px' });
    el.onclick = e => { e.stopPropagation(); S.find.toggle(h); paintHits(); };
    v.layer.appendChild(el);
  }
}
// While the panel is open, any text on the page can be added with one click:
// each cell or label is a clickable area.
async function segMarks(v) {
  const F = S.find, job = v.job, mine = v.segJob = (v.segJob || 0) + 1;
  const lines = await pageLines(v.pg);
  if (S.find !== F || job !== v.job || !v.drawn || mine !== v.segJob) return; // a newer call draws them
  v.layer.querySelectorAll('.ed-seg').forEach(n => n.remove());
  const n = S.pages.filter(p => !p.deleted).indexOf(v.pg) + 1;
  const frag = document.createDocumentFragment();
  for (const ln of lines) for (const [a, b] of segments(ln)) {
    const h = makeHit(v.pg, n, ln, a, b);
    if (!h || F.hits.some(o => o.pg.id === h.pg.id && o.x1 < h.x2 && o.x2 > h.x1 && o.y1 < h.y2 && o.y2 > h.y1 && !o.done && o.on)) continue;
    const [x1, y1, x2, y2] = v.vp.convertToViewportRectangle([h.x1, h.y1, h.x2, h.y2]);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'ed-seg';
    el.title = el.ariaLabel = T('find.addThis', { text: h.text }); el.setAttribute('aria-label', T('find.addThis', { text: h.text }));
    Object.assign(el.style, { left: Math.min(x1, x2) - 1 + 'px', top: Math.min(y1, y2) - 1 + 'px', width: Math.abs(x2 - x1) + 2 + 'px', height: Math.abs(y2 - y1) + 2 + 'px' });
    el.onclick = e => { e.stopPropagation(); if (v.justDragged) return; F.add(h); };
    frag.appendChild(el);
  }
  // Lines and rules (underlines, sum lines, table borders) can be clicked away too.
  for (const pa of pathCache.get(v.pg.doc + ':' + v.pg.index) || []) {
    const w = pa.x2 - pa.x1, hgt = pa.y2 - pa.y1;
    if (Math.min(w, hgt) > 3 || Math.max(w, hgt) < 8) continue; // only thin lines, not boxes or backgrounds
    const pad = pa.w / 2 + 1.5;
    const h = { pg: v.pg, n, area: true, line: true, text: T('find.line'), before: '', after: '', x1: pa.x1 - pad, y1: pa.y1 - pad, x2: pa.x2 + pad, y2: pa.y2 + pad };
    if (F.hits.some(o => o.on && !o.done && sameSpot(o, h)) || S.boxes.some(b => covers(b, h))) continue;
    const [x1, y1, x2, y2] = v.vp.convertToViewportRectangle([h.x1, h.y1, h.x2, h.y2]);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'ed-seg ed-seg-line';
    el.title = T('find.addLine'); el.setAttribute('aria-label', T('find.addLine'));
    const top = Math.min(y1, y2), height = Math.max(8, Math.abs(y2 - y1)); // at least 8px to hit
    Object.assign(el.style, { left: Math.min(x1, x2) + 'px', top: top - (height - Math.abs(y2 - y1)) / 2 + 'px', width: Math.max(8, Math.abs(x2 - x1)) + 'px', height: height + 'px' });
    el.onclick = e => { e.stopPropagation(); if (v.justDragged) return; F.add(h); };
    frag.appendChild(el);
  }
  v.layer.prepend(frag); // under the yellow marks
}
// Anything else in the PDF (a logo, a stamp, a signature, part of a picture,
// a few words): drag a box over it. Text, pictures and drawings under the box
// are removed when saving.
function areaSelect(v) {
  const layer = v.layer;
  if (layer.dataset.area) return;
  layer.dataset.area = '1';
  layer.addEventListener('pointerdown', e => {
    if (!S.find || S.editing || S.adding || S.redacting || e.button) return;
    if (e.target !== layer && !e.target.classList.contains('ed-seg') && !e.target.classList.contains('ed-hit')) return;
    const r = layer.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    let ghost = null, ex = sx, ey = sy;
    // Shift-drag, or the "Deselect" choice, switches off everything in the box instead
    const off = e.shiftKey || (S.find.dragMode && S.find.dragMode() === 'off');
    v.justDragged = false;
    const move = ev => {
      ex = Math.min(Math.max(0, ev.clientX - r.left), r.width); ey = Math.min(Math.max(0, ev.clientY - r.top), r.height);
      if (!ghost && Math.hypot(ex - sx, ey - sy) < 6) return; // a click, not a drag
      if (!ghost) { ghost = document.createElement('div'); ghost.className = off ? 'ed-hit drawing off' : 'ed-hit on drawing'; layer.appendChild(ghost); }
      Object.assign(ghost.style, { left: Math.min(sx, ex) + 'px', top: Math.min(sy, ey) + 'px', width: Math.abs(ex - sx) + 'px', height: Math.abs(ey - sy) + 'px' });
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      if (!ghost) return;
      ghost.remove(); v.justDragged = true; setTimeout(() => { v.justDragged = false; }, 0);
      const [ax, ay] = v.vp.convertToPdfPoint(sx, sy), [bx, by] = v.vp.convertToPdfPoint(ex, ey);
      const n = S.pages.filter(p => !p.deleted).indexOf(v.pg) + 1;
      if (off) { S.find.deselectIn(v.pg, { x1: Math.min(ax, bx), y1: Math.min(ay, by), x2: Math.max(ax, bx), y2: Math.max(ay, by) }); return; }
      S.find.add({ pg: v.pg, n, area: true, text: T('find.area'), before: '', after: '',
        x1: Math.min(ax, bx), y1: Math.min(ay, by), x2: Math.max(ax, bx), y2: Math.max(ay, by) });
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}
function paintHits() {
  if (S && S.view === 'page' && S.pv) for (const v of S.pv.views.values()) if (v.drawn) hitMarks(v);
  if (S && S.view === 'grid') { /* thumbnails don't show marks */ }
}
// Shows where a hit is: opens the page view if needed, scrolls to it and flashes the spot.
function peek(h) {
  if (S.view !== 'page' || !S.pv) return;
  const v = S.pv.views.get(h.pg.id); if (!v) return;
  const [x1, y1, x2, y2] = v.vp.convertToViewportRectangle([h.x1, h.y1, h.x2, h.y2]);
  const top = v.wrap.offsetTop + v.stage.offsetTop + Math.min(y1, y2), body = S.pv.body;
  if (top < body.scrollTop + 40 || top > body.scrollTop + body.clientHeight - 80) body.scrollTo({ top: top - body.clientHeight / 3, behavior: 'smooth' });
  let f = $('#edFlash');
  if (!f) { f = document.createElement('div'); f.id = 'edFlash'; f.className = 'ed-flash'; }
  v.stage.appendChild(f);
  Object.assign(f.style, { left: Math.min(x1, x2) - 3 + 'px', top: Math.min(y1, y2) - 3 + 'px', width: Math.abs(x2 - x1) + 6 + 'px', height: Math.abs(y2 - y1) + 6 + 'px' });
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
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
async function save(opt) {
  const btn = $('#edSave');
  // Ask where to save first, while the click still counts as the visitor's.
  const name = app().base(S.docs[0].file.name) + ((opt && opt.suffix) || '-edited') + '.pdf';
  const handle = await app().pickTarget(name, 'application/pdf');
  if (handle === null) return; // cancelled: stay in the editor
  btn.disabled = true; btn.textContent = T('ed.saving');
  try {
    await app().lib('pdflib');
    const { PDFDocument, StandardFonts, degrees, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, rgb } = PDFLib;
    const libs = [];
    for (const d of S.docs) {
      libs.push(await app().loadPdfBytes(new Uint8Array(await d.file.arrayBuffer())));
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
    const sigCache = {}, extraFonts = {};
    const flatten = [];
    for (const [pi, { pg, page }] of final.entries()) {
      const turn = (page.getRotation().angle + pg.rotate) % 360;
      if (pg.rotate) page.setRotation(degrees(turn));
      const mb = page.getMediaBox();
      // Changed lines: the old letters are taken out of the page. Where that
      // isn't possible, the old line is covered with its background colour.
      const eds = S.edits.filter(x => x.pageId === pg.id && x.text !== x.orig);
      const boxList = S.boxes.filter(b => b.pageId === pg.id);
      const boxes = boxList.map(b => [b.x1, b.y1, b.x2, b.y2, !!b.found]);
      let how = eds.map(() => 'failed');
      if (eds.length || boxes.length) {
        try { how = await window.LVPdfText.strip(out, page, eds, boxes); if (how.oldContents) oldRefs.push(how.oldContents); }
        catch (e) { console.warn('Text removal failed', e); how.flatten = boxes.length > 0; }
      }
      // Black-out boxes: letters under them are gone (above); draw the box, and
      // drop comments and form fields under it.
      // Deleted (blank) text needs no box, unless the page has to become an
      // image (text in a picture): then it is painted over in white.
      for (const b of boxList) if (!b.blank || how.flatten) page.drawRectangle({ x: b.x1, y: b.y1, width: b.x2 - b.x1, height: b.y2 - b.y1, color: b.blank ? rgb(1, 1, 1) : rgb(0, 0, 0) });
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
      // signatures and other pictures
      for (const im of S.images.filter(x => x.pageId === pg.id)) {
        sigCache[im.src] = sigCache[im.src] || await out.embedPng(await (await fetch(im.src)).arrayBuffer());
        page.drawImage(sigCache[im.src], { x: im.x, y: im.y, width: im.w, height: im.h });
      }
      await drawExtras(out, page, pg, pi, final.length, extraFonts);
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
    app().toast(T(covered ? 'ed.savedCovered' : 'ed.saved', { name: where }), true, blob);
  } catch (e) {
    console.error(e); app().toast(e.message || T('job.failed'));
    // The Save as window has already made an empty file: take it away again.
    if (handle && handle.remove) handle.remove().catch(() => {});
    btn.disabled = false; btn.textContent = T('ed.save');
  }
}

// ---------- open ----------
async function open(files, opt = {}) {
  S = { docs: [], pages: [], texts: [], edits: [], boxes: [], images: [], marks: [], watermark: null, pageNums: null, zoom: 1, marking: false, markTool: 'hl', markColor: 'yellow', search: null, placing: null, redacting: false, editing: false, values: {}, view: 'grid', current: null, adding: false, dirty: false, size: 12 };
  thumbCache.clear(); textCache.clear(); libDocs.clear(); pathCache.clear();
  build(); labels();
  $('#edBody').innerHTML = `<p class="ed-loading">${esc(T('ed.loading'))}</p>`;
  try { for (const f of files) await addDoc(f); }
  catch (e) { close(); app().toast(e.message); return; }
  trackChanges();
  // The Redact PDF page opens the first page ready to black out.
  if (opt.redact && S.pages.length) { S.view = 'page'; S.current = S.pages[0].id; S.redacting = true; }
  if (opt.find && S.pages.length) { S.view = 'page'; S.current = S.pages[0].id; }
  // Tool pages that open straight at one job: sign, page numbers, watermark, filling in a form.
  if (['sign', 'nums', 'wm', 'form'].includes(opt.action) && S.pages.length) { S.view = 'page'; S.current = S.pages[0].id; }
  render();
  if (opt.action === 'sign') openSign();
  else if (opt.action === 'nums' || opt.action === 'wm') openStamps(opt.action);
  // Opened to remove sensitive text: the suggestions panel opens, with amounts switched on.
  if (opt.find) {
    await openFind();
    // "Prices" opens with the prices marked; Redact lets the visitor choose.
    // Prices: the amounts and the words about them (Moms, Pris, Beløb …).
    const want = opt.preset === 'prices' ? ['prices', 'priceText'] : opt.preset ? [opt.preset] : [];
    if (S && S.find && !S.find.active.size) for (const k of want) { const c = document.querySelector(`#edFindCats .ed-cat[data-k="${k}"]:not([disabled])`); if (c) c.click(); }
  }
  $('#edSave').focus();
}
document.addEventListener('lv-lang', () => { if (S) render(); });
// Editor shortcuts: undo/redo, search, zoom.
document.addEventListener('keydown', e => {
  if (!S || !$('#editor') || !(e.ctrlKey || e.metaKey)) return;
  const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
  const k = e.key.toLowerCase();
  if (k === 'f') { e.preventDefault(); openSearch(); return; }
  if (typing) return;
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); stepHistory(-1); }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); stepHistory(1); }
  else if (S.view === 'page' && (k === '+' || k === '=')) { e.preventDefault(); stepZoom(1); }
  else if (S.view === 'page' && k === '-') { e.preventDefault(); stepZoom(-1); }
  else if (S.view === 'page' && k === '0') { e.preventDefault(); setZoom(1); }
});
// Esc: finishes a line, then the page, then goes back to all pages.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !S || !$('#editor')) return;
  // In a line being edited, Esc finishes that line (handled there).
  if (S.placing) { placingMode(false); setHint(); return; }
  if (!e.target.closest || e.target.closest('.ed-edit')) return;
  if (e.target.closest('textarea, input, select')) return;
  e.preventDefault();
  if (S.view === 'page' && (S.editing || S.adding || S.redacting || S.marking)) finishPage();
  else S.view === 'page' ? showGrid() : cancel();
});
window.LVEditor = { open };
})();
