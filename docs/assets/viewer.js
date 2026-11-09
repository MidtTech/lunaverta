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

let V = null; // { file, handle, pdf, zoom, io }

async function open(file, handle) {
  close();
  const el = document.createElement('div');
  el.id = 'viewer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'vwName');
  el.innerHTML = `
    <div class="vw-bar">
      <div class="vw-name"><strong id="vwName"></strong><span id="vwInfo"></span></div>
      <div class="vw-tools" id="vwTools"></div>
    </div>
    <div class="vw-body" id="vwBody"><p class="vw-loading">${esc(T('vw.loading'))}</p></div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('vw-open');
  V = { file, handle, pdf: null, zoom: 1, io: null, forms: false };
  $('#vwName').textContent = file.name;
  document.title = file.name + ' · LunaVerta';
  try {
    await app().lib('pdfjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = app().VENDOR + 'pdf.worker.min.js';
    V.pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  } catch (e) {
    const locked = e && e.name === 'PasswordException';
    $('#vwBody').innerHTML = `<p class="vw-loading">${esc(T(locked ? 'err.pdf.locked' : 'err.pdf.read'))}</p>`;
    tools(locked);
    return;
  }
  try { const f = await V.pdf.getFieldObjects(); V.forms = !!(f && Object.keys(f).length); } catch (e) { V.forms = false; }
  $('#vwInfo').textContent = T('vw.pages', { n: V.pdf.numPages });
  tools(false);
  await layout();
  $('#vwBody').focus();
}

// The toolbar. A locked PDF only gets "All tools" (where Unlock is) and Close.
function tools(locked) {
  const b = (id, key, cls = '') => `<button type="button" class="btn sm ${cls}" id="${id}">${esc(T(key))}</button>`;
  $('#vwTools').innerHTML = locked
    ? `${b('vwMore', 'vw.more')}${b('vwClose', 'vw.close', 'ghost')}`
    : `<span class="vw-zoom"><button type="button" class="ed-ico" id="vwOut" aria-label="${esc(T('vw.zoomOut'))}" title="${esc(T('vw.zoomOut'))}">−</button><button type="button" class="vw-zoomv" id="vwFit" title="${esc(T('vw.fit'))}">100 %</button><button type="button" class="ed-ico" id="vwIn" aria-label="${esc(T('vw.zoomIn'))}" title="${esc(T('vw.zoomIn'))}">+</button></span>
      ${b('vwEdit', 'vw.edit', 'primary')}${b('vwSign', 'vw.sign')}${V.forms ? b('vwFill', 'vw.fill') : ''}${b('vwRedact', 'vw.redact')}${b('vwMarkup', 'mk.btn')}${b('vwPrint', 'vw.print')}${b('vwMore', 'vw.more')}${b('vwClose', 'vw.close', 'ghost')}`;
  const on = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  on('vwClose', close);
  on('vwMore', () => { const f = V.file; close(); app().openTools([f]); });
  on('vwEdit', () => toEditor({}));
  on('vwSign', () => toEditor({ action: 'sign' }));
  on('vwFill', () => toEditor({ action: 'form' }));
  on('vwRedact', () => toEditor({ find: true }));
  on('vwMarkup', () => toEditor({ action: 'markup' }));
  on('vwPrint', () => print().catch(e => app().toast(e.message)));
  on('vwIn', () => zoom(1));
  on('vwOut', () => zoom(-1));
  on('vwFit', () => { V.zoom = 1; layout(); });
}

// The editor gets the file and, from "Open with", the file's handle, so Save can write back to it.
async function toEditor(opt) {
  const f = V.file, h = V.handle;
  try { const E = await window.LVLoadEditor(); close(); E.open([f], { ...opt, handle: h }); } catch (e) { app().toast(e.message); }
}

// One box per page at the right size straight away (so the scroll bar is right), drawn when it comes into view.
async function layout() {
  const body = $('#vwBody'); if (!body || !V.pdf) return;
  if (V.io) V.io.disconnect();
  const width = Math.min(body.clientWidth - 32, 980) * V.zoom;
  $('#vwFit').textContent = Math.round(V.zoom * 100) + ' %';
  body.innerHTML = '';
  const first = await V.pdf.getPage(1), vp1 = first.getViewport({ scale: 1 });
  V.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !e.target.dataset.drawn) draw(e.target).catch(() => {}); }), { root: body, rootMargin: '600px 0px' });
  for (let i = 1; i <= V.pdf.numPages; i++) {
    const pg = document.createElement('div');
    pg.className = 'vw-page'; pg.dataset.n = i;
    pg.style.width = width + 'px'; pg.style.height = (width * vp1.height / vp1.width) + 'px';
    pg.setAttribute('aria-label', T('vw.pageN', { n: i }));
    body.appendChild(pg); V.io.observe(pg);
  }
}
async function draw(pg) {
  pg.dataset.drawn = '1';
  const page = await V.pdf.getPage(+pg.dataset.n), w = parseFloat(pg.style.width);
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
  const body = $('#vwBody'), at = body.scrollTop / Math.max(1, body.scrollHeight);
  layout().then(() => { body.scrollTop = at * body.scrollHeight; });
}

// Printing: the pages as pictures in a print-only block (the page cannot print a PDF directly).
async function print() {
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
  if (!V) return;
  if (V.io) V.io.disconnect();
  if (V.pdf) V.pdf.destroy();
  const el = $('#viewer'); if (el) el.remove();
  document.documentElement.classList.remove('vw-open');
  V = null;
}

document.addEventListener('keydown', e => {
  if (!V || !$('#viewer')) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoom(1); }
  else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoom(-1); }
  else if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); V.zoom = 1; layout(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); print().catch(err => app().toast(err.message)); }
});
let resizeT = 0;
addEventListener('resize', () => { if (!V || !V.pdf) return; clearTimeout(resizeT); resizeT = setTimeout(layout, 200); });
document.addEventListener('lv-lang', () => { if (V && V.pdf) { $('#vwInfo').textContent = T('vw.pages', { n: V.pdf.numPages }); tools(false); } });

window.LVViewer = { open, close };
})();
