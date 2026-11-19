// LunaVerta PDF reader: what the installed app shows when Windows (or macOS) opens a PDF with it.
// The pages are drawn with PDF.js, with a text layer so text can be selected, copied and found
// with Ctrl+F. The toolbar hands the file to the editor (edit, sign, fill in, remove sensitive)
// or to the other tools. Like everything else, the file never leaves the device.
(() => {
'use strict';
const app = () => window.LVApp;
const T = (k, v) => app().T(k, v);
const esc = s => app().esc(s);
const $ = s => document.querySelector(s);

// Several PDFs can be open at once, each in its own tab (like a PDF reader). V is the tab in front.
let tabs = [], V = null, seq = 0; // tab: { id, file, handle, pdf, zoom, io, forms, locked, body, mod }

function shell() {
  let el = $('#viewer');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'viewer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'vwName');
  el.innerHTML = `
    <div class="vw-tabs" id="vwTabs" role="tablist" hidden></div>
    <div class="vw-bar">
      <div class="vw-name"><strong id="vwName"></strong><span id="vwInfo"></span></div>
      <div class="vw-tools" id="vwTools"></div>
    </div>
    <div class="vw-bodies" id="vwBodies"></div>
    <input type="file" id="vwPick" accept="application/pdf,.pdf" multiple hidden>`;
  document.body.appendChild(el);
  $('#vwPick').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; fs.forEach(f => open(f)); };
  $('#vwTabs').addEventListener('click', e => {
    const x = e.target.closest('[data-x]'); if (x) { closeTab(+x.dataset.x); return; }
    const t = e.target.closest('[data-t]'); if (t) show(+t.dataset.t);
    if (e.target.closest('#vwAdd')) $('#vwPick').click();
  });
  $('#vwTabs').addEventListener('auxclick', e => { const t = e.target.closest('[data-t]'); if (t && e.button === 1) { e.preventDefault(); closeTab(+t.dataset.t); } });
  $('#vwTabs').addEventListener('keydown', e => {
    const t = e.target.closest('[data-t]'); if (!t) return;
    const i = tabs.findIndex(x => x.id === +t.dataset.t);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; show(n.id); $(`#vwTabs [data-t="${n.id}"]`).focus(); }
    else if (e.key === 'Delete') { e.preventDefault(); closeTab(+t.dataset.t); }
  });
  document.documentElement.classList.add('vw-open');
  return el;
}

// Open a PDF in a new tab, or show its tab if it is already open.
async function open(file, handle) {
  shell(); unhide();
  for (const t of tabs) {
    let same = t.file.name === file.name && t.file.size === file.size && t.file.lastModified === file.lastModified;
    if (!same && handle && t.handle && t.handle.isSameEntry) { try { same = await t.handle.isSameEntry(handle); } catch (e) { same = false; } }
    if (same) { show(t.id); return; }
  }
  const body = document.createElement('div');
  body.className = 'vw-body'; body.tabIndex = -1; body.hidden = true;
  body.innerHTML = `<p class="vw-loading">${esc(T('vw.loading'))}</p>`;
  $('#vwBodies').appendChild(body);
  const t = { id: ++seq, file, handle: handle || null, pdf: null, zoom: 1, io: null, forms: false, locked: false, failed: false, body, mod: file.lastModified };
  tabs.push(t);
  show(t.id);
  await load(t);
}
async function load(t) {
  try {
    await app().lib('pdfjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = app().VENDOR + 'pdf.worker.min.js';
    t.pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await t.file.arrayBuffer()), isEvalSupported: false }).promise;
  } catch (e) {
    if (!tabs.includes(t)) return;
    t.locked = e && e.name === 'PasswordException'; t.failed = true;
    t.body.innerHTML = `<p class="vw-loading">${esc(T(t.locked ? 'err.pdf.locked' : 'err.pdf.read'))}</p>`;
    if (t === V) head();
    return;
  }
  if (!tabs.includes(t)) { t.pdf.destroy(); return; }
  try { const f = await t.pdf.getFieldObjects(); t.forms = !!(f && Object.keys(f).length); } catch (e) { t.forms = false; }
  if (t === V) head();
  await layout(t);
  if (t === V) t.body.focus();
}

// Bring a tab to the front.
function show(id) {
  const t = tabs.find(x => x.id === id); if (!t) return;
  V = t;
  tabs.forEach(x => { x.body.hidden = x !== t; });
  head(); strip();
  if (t.pdf && !t.body.querySelector('.vw-page')) layout(t);
}
// The name, page count and toolbar of the tab in front.
function head() {
  if (!V) return;
  $('#vwName').textContent = V.file.name;
  $('#vwInfo').textContent = V.pdf ? T('vw.pages', { n: V.pdf.numPages }) : '';
  document.title = V.file.name + ' · LunaVerta';
  tools(V.failed ? V.locked : null);
}
// The tab strip: shown once two or more PDFs are open.
function strip() {
  const el = $('#vwTabs'); if (!el) return;
  el.hidden = tabs.length < 2;
  el.setAttribute('aria-label', T('vw.tabs'));
  el.innerHTML = tabs.map(t => `<div class="vw-tab${t === V ? ' on' : ''}"><button type="button" role="tab" data-t="${t.id}" aria-selected="${t === V}" tabindex="${t === V ? 0 : -1}" title="${esc(t.file.name)}">${esc(t.file.name)}</button><button type="button" class="vw-tab-x" data-x="${t.id}" aria-label="${esc(T('vw.closeTab', { name: t.file.name }))}" title="${esc(T('vw.closeTab', { name: t.file.name }))}">×</button></div>`).join('')
    + `<button type="button" class="vw-add" id="vwAdd" aria-label="${esc(T('vw.openMore'))}" title="${esc(T('vw.openMore'))}">+</button>`;
}
function closeTab(id) {
  const i = tabs.findIndex(x => x.id === id); if (i < 0) return;
  const t = tabs[i];
  if (t.io) t.io.disconnect();
  if (t.pdf) t.pdf.destroy();
  t.body.remove(); tabs.splice(i, 1);
  if (!tabs.length) { close(); return; }
  if (t === V) show(tabs[Math.min(i, tabs.length - 1)].id); else strip();
}

// The toolbar. A PDF that could not be read only gets "All tools" (where Unlock is) and Close.
function tools(locked) {
  const b = (id, key, cls = '', tag = '') => `<button type="button" class="btn sm ${cls}" id="${id}">${esc(T(key))}${tag}</button>`;
  $('#vwTools').innerHTML = locked !== null && locked !== undefined
    ? `${b('vwMore', 'vw.more')}${b('vwClose', 'vw.close', 'ghost')}`
    : `<span class="vw-zoom"><button type="button" class="ed-ico" id="vwOut" aria-label="${esc(T('vw.zoomOut'))}" title="${esc(T('vw.zoomOut'))}">−</button><button type="button" class="vw-zoomv" id="vwFit" title="${esc(T('vw.fit'))}">${Math.round(V.zoom * 100)} %</button><button type="button" class="ed-ico" id="vwIn" aria-label="${esc(T('vw.zoomIn'))}" title="${esc(T('vw.zoomIn'))}">+</button></span>
      ${b('vwEdit', 'vw.edit', 'primary')}${b('vwSign', 'vw.sign')}${V.forms ? b('vwFill', 'vw.fill') : ''}${b('vwRedact', 'vw.redact')}${b('vwMarkup', 'mk.btn', '', ` <span class="beta">${esc(T('beta'))}</span>`)}${b('vwPrint', 'vw.print')}${b('vwMore', 'vw.more')}${b('vwClose', 'vw.close', 'ghost')}`;
  const on = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  on('vwClose', () => closeTab(V.id));
  on('vwMore', () => { const f = V.file; closeTab(V.id); if (tabs.length) hide(); app().openTools([f]); });
  on('vwEdit', () => toEditor({}));
  on('vwSign', () => toEditor({ action: 'sign' }));
  on('vwFill', () => toEditor({ action: 'form' }));
  on('vwRedact', () => toEditor({ find: true }));
  on('vwMarkup', () => toEditor({ action: 'markup' }));
  on('vwPrint', () => print().catch(e => app().toast(e.message)));
  on('vwIn', () => zoom(1));
  on('vwOut', () => zoom(-1));
  on('vwFit', () => { V.zoom = 1; layout(V); });
}

// The editor opens on top of the reader and gets the file and, from "Open with", the file's handle,
// so Save can write back to it. When the editor closes, the tab shows the file as it is now.
async function toEditor(opt) {
  const t = V;
  try { const E = await window.LVLoadEditor(); E.open([t.file], { ...opt, handle: t.handle }); watchEditor(t); } catch (e) { app().toast(e.message); }
}
function watchEditor(t) {
  let seen = !!$('#editor');
  const mo = new MutationObserver(() => {
    if ($('#editor')) { seen = true; return; }
    if (!seen) return;
    mo.disconnect();
    if (tabs.includes(t)) { show(t.id); refresh(t); }
  });
  mo.observe(document.body, { childList: true });
}
async function refresh(t) {
  if (!t.handle || !t.handle.getFile) return;
  let f; try { f = await t.handle.getFile(); } catch (e) { return; }
  if (!f || f.lastModified === t.mod) return;
  t.file = f; t.mod = f.lastModified;
  if (t.io) t.io.disconnect();
  if (t.pdf) { t.pdf.destroy(); t.pdf = null; }
  t.failed = false;
  t.body.innerHTML = `<p class="vw-loading">${esc(T('vw.loading'))}</p>`;
  if (t === V) head();
  await load(t);
  strip();
}

// "All tools" with other PDFs still open: the reader steps aside, and a button brings it back.
function hide() {
  const el = $('#viewer'); if (!el) return;
  el.hidden = true; document.documentElement.classList.remove('vw-open');
  let b = $('#vwBack');
  if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'vwBack'; b.className = 'btn sm primary vw-back'; b.onclick = unhide; document.body.appendChild(b); }
  b.textContent = T('vw.back', { n: tabs.length });
}
function unhide() {
  const el = $('#viewer'); if (el && el.hidden) { el.hidden = false; document.documentElement.classList.add('vw-open'); if (V) document.title = V.file.name + ' · LunaVerta'; }
  const b = $('#vwBack'); if (b) b.remove();
}

// One box per page at the right size straight away (so the scroll bar is right), drawn when it comes into view.
async function layout(t) {
  const body = t.body; if (!body || !t.pdf || body.hidden) return;
  if (t.io) t.io.disconnect();
  const width = Math.min(body.clientWidth - 32, 980) * t.zoom;
  if (t === V && $('#vwFit')) $('#vwFit').textContent = Math.round(t.zoom * 100) + ' %';
  body.innerHTML = '';
  const first = await t.pdf.getPage(1), vp1 = first.getViewport({ scale: 1 });
  t.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !e.target.dataset.drawn) draw(t, e.target).catch(() => {}); }), { root: body, rootMargin: '600px 0px' });
  for (let i = 1; i <= t.pdf.numPages; i++) {
    const pg = document.createElement('div');
    pg.className = 'vw-page'; pg.dataset.n = i;
    pg.style.width = width + 'px'; pg.style.height = (width * vp1.height / vp1.width) + 'px';
    pg.setAttribute('aria-label', T('vw.pageN', { n: i }));
    body.appendChild(pg); t.io.observe(pg);
  }
}
async function draw(t, pg) {
  pg.dataset.drawn = '1';
  const page = await t.pdf.getPage(+pg.dataset.n), w = parseFloat(pg.style.width);
  const vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: w / vp1.width });
  pg.style.height = vp.height + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const c = document.createElement('canvas'); c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
  pg.appendChild(c);
  // The text layer: invisible text on top of the picture, so it can be selected, copied and found.
  try {
    const tl = document.createElement('div'); tl.className = 'textLayer'; tl.style.setProperty('--scale-factor', vp.scale);
    pg.appendChild(tl);
    await pdfjsLib.renderTextLayer({ textContentSource: page.streamTextContent(), container: tl, viewport: vp }).promise;
  } catch (e) { /* a page without text is just a picture */ }
}
function zoom(d) {
  const steps = [.5, .75, 1, 1.25, 1.5, 2, 3], i = steps.findIndex(z => z >= V.zoom - 1e-6);
  V.zoom = steps.at(Math.min(steps.length - 1, Math.max(0, (i < 0 ? 2 : i) + d)));
  const t = V, body = t.body, at = body.scrollTop / Math.max(1, body.scrollHeight);
  layout(t).then(() => { body.scrollTop = at * body.scrollHeight; });
}

// Printing: the pages as pictures in a print-only block (the page cannot print a PDF directly).
async function print() {
  if (!V || !V.pdf) return;
  const btn = $('#vwPrint'); btn.disabled = true; btn.textContent = T('vw.printing');
  const box = document.createElement('div'); box.id = 'vwPrintPages';
  try {
    for (let i = 1; i <= V.pdf.numPages; i++) {
      const page = await V.pdf.getPage(i), vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const img = new Image(); img.src = c.toDataURL('image/jpeg', .92); img.alt = '';
      box.appendChild(img); c.width = c.height = 0;
    }
    document.body.appendChild(box);
    document.documentElement.classList.add('vw-printing');
    await new Promise(r => setTimeout(r, 50));
    window.print();
  } finally {
    document.documentElement.classList.remove('vw-printing'); box.remove();
    btn.disabled = false; btn.textContent = T('vw.print');
  }
}

function close() {
  tabs.forEach(t => { if (t.io) t.io.disconnect(); if (t.pdf) t.pdf.destroy(); });
  tabs = []; V = null;
  const el = $('#viewer'); if (el) el.remove();
  const b = $('#vwBack'); if (b) b.remove();
  document.documentElement.classList.remove('vw-open');
}

document.addEventListener('keydown', e => {
  if (!V || !$('#viewer') || $('#viewer').hidden || $('#editor')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoom(1); }
  else if (mod && e.key === '-') { e.preventDefault(); zoom(-1); }
  else if (mod && e.key === '0') { e.preventDefault(); V.zoom = 1; layout(V); }
  else if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); print().catch(err => app().toast(err.message)); }
  else if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); $('#vwPick').click(); }
  else if (e.altKey && /^[1-9]$/.test(e.key) && tabs.length > 1) { e.preventDefault(); const t = e.key === '9' ? tabs.at(-1) : tabs[+e.key - 1]; if (t) show(t.id); }
});
let resizeT = 0;
addEventListener('resize', () => { if (!V || !V.pdf) return; clearTimeout(resizeT); resizeT = setTimeout(() => { tabs.forEach(t => { if (t.pdf && t !== V) t.body.innerHTML = ''; }); layout(V); }, 200); });
document.addEventListener('lv-lang', () => { if (V) { head(); strip(); const b = $('#vwBack'); if (b) b.textContent = T('vw.back', { n: tabs.length }); } });

window.LVViewer = { open, close, get count() { return tabs.length; } };
})();
