// End-to-end smoke tests: builds nothing, just serves docs/ and drives a real browser.
// Run with:  npm test        (needs: npm install, then npx playwright install chromium)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PDFDocument, StandardFonts, PDFName } = require('pdf-lib');
const JSZip = require('jszip');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain', '.vtt': 'text/vtt', '.mp4': 'video/mp4' };

// ---------- a tiny static server for docs/ ----------
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let f = join(ROOT, p);
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); const b = await readFile(f); res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404, { 'content-type': 'text/html' }); res.end(await readFile(join(ROOT, '404.html')).catch(() => 'not found')); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ---------- test PDFs made on the fly ----------
async function makePdf(pages) {
  const doc = await PDFDocument.create(), font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const lines of pages) {
    const pg = doc.addPage([595, 842]); let y = 780;
    lines.forEach((l, i) => { pg.drawText(l, { x: 60, y, size: i === 0 ? 22 : 12, font: i === 0 ? bold : font }); y -= i === 0 ? 40 : 20; });
  }
  return Buffer.from(await doc.save());
}
const OLD = await makePdf([['Service agreement', 'The price is 12.000 kr. per month.', 'Payment is due within 30 days.', 'Signed in Aarhus.'], ['Page two', 'Nothing changes here.']]);
const NEW = await makePdf([['Service agreement', 'The price is 14.500 kr. per month.', 'Payment is due within 30 days.', 'A new clause about support.'], ['Page two', 'Nothing changes here.']]);
const file = (name, buffer) => ({ name, mimeType: 'application/pdf', buffer });

// ---------- runner ----------
const results = [];
async function test(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return; // ONLY=preview npm test runs just the matching tests
  const t0 = Date.now();
  try { await fn(); results.push([true, name]); console.log(`  ok  ${name} (${Date.now() - t0} ms)`); }
  catch (e) { results.push([false, name]); console.log(`  FAIL ${name}\n       ${String(e && e.message || e).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

const browser = await chromium.launch();
async function page(path, opts = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: opts.viewport || { width: 1280, height: 900 }, locale: 'en-GB' });
  // skip the first-visit niceties and use plain downloads instead of the Save as window
  // (OCR_LANG=dan npm test forces one OCR language, to check that the OCR tests would catch a wrong one)
  await ctx.addInitScript(force => { try { localStorage.setItem('lunaverta-ask-where', '0'); localStorage.setItem('lunaverta-welcome', '1'); localStorage.setItem('lunaverta-prep-seen', '1'); localStorage.setItem('lunaverta-tour', '1'); if (force) localStorage.setItem('lunaverta-opts', JSON.stringify({ optOcr: force })); } catch (e) {} }, process.env.OCR_LANG || '');
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  await p.goto(BASE + path);
  return p;
}
const done = async p => { const errs = p.errors; await p.context().close(); assert(!errs.length, 'page errors: ' + errs.join(' | ')); };

console.log(`LunaVerta smoke tests on ${BASE}`);

await test('every page in the sitemap loads with a heading and no errors', async () => {
  const xml = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map(m => m[1] || '/');
  assert(urls.length > 20, 'sitemap looks empty');
  const p = await page('/');
  for (const u of urls) {
    const r = await p.goto(BASE + u); assert(r.ok(), `${u} gave ${r.status()}`);
    assert(await p.locator('h1').count(), `${u} has no h1`);
  }
  await done(p);
});

await test('"Report a problem" builds an e-mail with the page address', async () => {
  const p = await page('/privacy.html');
  const a = p.locator('[data-report]').first();
  await a.evaluate(el => el.addEventListener('click', e => e.preventDefault()));
  await a.click();
  const href = await a.getAttribute('href');
  assert(href.startsWith('mailto:') && decodeURIComponent(href).includes('/privacy.html'), 'mailto missing page: ' + href);
  await done(p);
});

await test('PDF to Word gives a .docx with the text in it', async () => {
  const p = await page('/pdf-to-word/');
  await p.setInputFiles('#fileInput', file('agreement.pdf', OLD));
  const save = p.locator('.row.done .save').first(); await save.waitFor({ timeout: 30000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), save.click()]);
  assert(dl.suggestedFilename().endsWith('.docx'), 'not a docx: ' + dl.suggestedFilename());
  const zip = await JSZip.loadAsync(await readFile(await dl.path()));
  const xml = await zip.file('word/document.xml').async('string');
  assert(xml.includes('Service agreement') && xml.includes('Nothing changes here.'), 'text missing in document.xml');
  assert(zip.file('[Content_Types].xml'), 'no [Content_Types].xml');
  await done(p);
});

await test('Compare shows the changed, added and removed lines', async () => {
  const p = await page('/compare-pdf/');
  await p.setInputFiles('#fileInput', [file('old.pdf', OLD), file('new.pdf', NEW)]);
  const box = p.locator('.cmp'); await box.waitFor({ timeout: 30000 });
  await p.waitForFunction(() => /\d/.test(document.querySelector('.cmp')?.textContent || '') && document.querySelectorAll('.cmp .chg, .cmp .add, .cmp .del').length > 0, null, { timeout: 30000 });
  const txt = await box.innerText();
  assert(txt.includes('14.500') && txt.includes('12.000'), 'changed price not shown');
  assert(txt.includes('A new clause about support.'), 'added line not shown');
  await done(p);
});

await test('Many files at once can be saved as one .zip', async () => {
  const p = await page('/pdf-to-text/');
  await p.setInputFiles('#fileInput', [file('a.pdf', OLD), file('b.pdf', NEW)]);
  await p.waitForFunction(() => document.querySelectorAll('.row.done .save').length === 2, null, { timeout: 30000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#saveAll')]);
  assert(dl.suggestedFilename().endsWith('.zip'), 'not a zip');
  const zip = await JSZip.loadAsync(await readFile(await dl.path()));
  assert(Object.keys(zip.files).length === 2, 'zip should hold 2 files, has ' + Object.keys(zip.files).length);
  await done(p);
});

await test('A signature can be put on every page at once', async () => {
  const p = await page('/sign-pdf/');
  await p.setInputFiles('#fileInput', file('agreement.pdf', OLD));
  const pad = p.locator('.sig-pad'); await pad.waitFor({ timeout: 30000 });
  const b = await pad.boundingBox();
  await p.mouse.move(b.x + 40, b.y + 120); await p.mouse.down();
  for (let i = 1; i <= 20; i++) await p.mouse.move(b.x + 40 + i * 15, b.y + 120 - Math.sin(i / 2) * 40);
  await p.mouse.up();
  await p.check('.sig-dialog input[name="all"]');
  await p.click('.sig-dialog button[type="submit"]');
  const layer = p.locator('.ed-layer').first(); await layer.waitFor();
  const lb = await layer.boundingBox(); await layer.click({ position: { x: lb.width * .6, y: Math.min(lb.height * .5, 300) } });
  await p.waitForFunction(() => document.querySelectorAll('.ed-layer img, .ed-layer .ed-sig').length > 0, null, { timeout: 5000 }).catch(() => {});
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#edSave')]);
  const doc = await PDFDocument.load(await readFile(await dl.path()));
  for (const [i, pg] of doc.getPages().entries()) {
    const xo = pg.node.Resources() && pg.node.Resources().lookup(PDFName.of('XObject'));
    assert(xo && xo.keys().length, `no signature on page ${i + 1}`);
  }
  await done(p);
});

await test('every language has its own texts and a menu with all languages', async () => {
  const p = await page('/');
  for (const [L, word] of [['da', 'Vælg filer'], ['sv', 'Välj filer'], ['no', 'Velg filer'], ['de', 'Dateien wählen'], ['es', 'Elegir archivos'], ['fr', 'Choisir des fichiers']]) {
    await p.goto(`${BASE}/${L}/`);
    assert((await p.locator('#btnChoose, [data-i18n="btn.choose"]').first().innerText()).trim() === word, `${L}: choose button not translated`);
    assert(await p.locator('.lang-menu a').count() === 7, `${L}: language menu should have 7 languages`);
    assert(await p.evaluate(l => !!(window.LV_STR && window.LV_STR[l]), L), `${L}: texts not loaded`);
  }
  await done(p);
});

// OCR in each language: a "scan" (a picture of text, no text layer) is read back with the right letters.
const SCANS = [
  ['sv', '/sv/gor-pdf-sokbar/', 'Kära kund, fakturan för måndag är betald. Tack för köpet och välkommen åter.', ['Kära', 'måndag', 'köpet', 'välkommen']],
  ['no', '/no/gjor-pdf-sokbar/', 'Kjære kunde, fødselsnummeret må ikke deles. Vi ønsker deg en fin søndag på kontoret.', ['Kjære', 'fødselsnummeret', 'ønsker', 'søndag']],
  ['de', '/de/pdf-durchsuchbar-machen/', 'Sehr geehrte Damen und Herren, die Größe der Lieferung für Grüße aus Köln ist gemäß Übersicht.', ['Größe', 'Grüße', 'Köln', 'Übersicht']],
  ['es', '/es/ocr-pdf/', 'Estimado señor, la factura del miércoles está pagada. Gracias por su atención y feliz año.', ['señor', 'miércoles', 'atención', 'año']],
  ['fr', '/fr/ocr-pdf/', 'Cher client, la facture de février est réglée. Nous vous remercions pour votre fidélité, à bientôt.', ['février', 'réglée', 'fidélité', 'bientôt']]
];
async function scanPdf(text) {
  const p = await browser.newPage({ viewport: { width: 1240, height: 400 } });
  await p.setContent(`<body style="margin:0;background:#fff"><p style="font:34px/1.5 Georgia,serif;margin:60px;width:1100px">${text}</p></body>`);
  const png = await p.screenshot(); await p.close();
  const doc = await PDFDocument.create(), img = await doc.embedPng(png), pg = doc.addPage([595, 192]);
  pg.drawImage(img, { x: 0, y: 0, width: 595, height: 192 });
  return Buffer.from(await doc.save());
}
async function pdfText(buf) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, verbosity: 0 }).promise;
  let out = '';
  for (let i = 1; i <= doc.numPages; i++) out += (await (await doc.getPage(i)).getTextContent()).items.map(it => it.str).join(' ') + '\n';
  return out;
}
for (const [L, path, text, words] of SCANS) {
  await test(`OCR reads ${L} text with its own letters`, async () => {
    const p = await page(path);
    await p.setInputFiles('#fileInput', file('scan.pdf', await scanPdf(text)));
    const save = p.locator('.row.done .save').first(); await save.waitFor({ timeout: 120000 });
    const [dl] = await Promise.all([p.waitForEvent('download'), save.click()]);
    const got = await pdfText(await readFile(await dl.path()));
    const missing = words.filter(w => !got.includes(w));
    assert(!missing.length, `missing ${missing.join(', ')} in: ${got.trim().slice(0, 160)}`);
    await done(p);
  });
}

// a "photo" made in the browser: a gradient with a circle, as a JPEG
async function photo(w = 1600, h = 1200) {
  const g = await browser.newPage({ viewport: { width: w, height: h } });
  await g.setContent(`<body style="margin:0"><div style="width:${w}px;height:${h}px;background:linear-gradient(135deg,#f6d365,#fda085 40%,#5ee7df 70%,#2b5876)"></div></body>`);
  const b = await g.screenshot({ type: 'jpeg', quality: 92 }); await g.close(); return b;
}
const jpg = (name, buffer) => ({ name, mimeType: 'image/jpeg', buffer });
async function imageSize(p, buf, type = 'image/png') {
  return p.evaluate(async ([b64, t]) => { const i = new Image(); i.src = `data:${t};base64,${b64}`; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, [buf.toString('base64'), type]);
}
async function saveFirst(p) {
  const s = p.locator('.row.done .save').first(); await s.waitFor({ timeout: 120000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), s.click()]);
  return { name: dl.suggestedFilename(), buf: await readFile(await dl.path()) };
}

await test('the scripts have no two functions with the same name', async () => {
  for (const f of ['assets/app.js', 'assets/editor.js', 'assets/i18n.js']) {
    const src = await readFile(join(ROOT, f), 'utf8'), seen = new Set();
    for (const m of src.matchAll(/^(?:async )?function ([\w$]+)|^(?:const|let|var) ([\w$]+)/gm)) { const n = m[1] || m[2]; assert(!seen.has(n), `${f}: ${n} is defined twice`); seen.add(n); }
  }
});

await test('a picture converts (PNG to JPG) at its full size', async () => {
  const p = await page('/png-to-jpg/');
  const pg = await browser.newPage({ viewport: { width: 640, height: 480 } }); await pg.setContent('<body style="margin:0;background:#3a7"></body>'); const png = await pg.screenshot(); await pg.close();
  await p.setInputFiles('#fileInput', { name: 'green.png', mimeType: 'image/png', buffer: png });
  const { name, buf } = await saveFirst(p);
  assert(name === 'green.jpg', 'name ' + name);
  const [w, h] = await imageSize(p, buf, 'image/jpeg'); assert(w === 640 && h === 480, `size ${w}x${h}`);
  await done(p);
});

await test('Extract pages keeps only the pages asked for, in that order', async () => {
  const p = await page('/extract-pdf-pages/');
  const four = await makePdf([['Page one'], ['Page two'], ['Page three'], ['Page four']]);
  await p.setInputFiles('#fileInput', file('four.pdf', four));
  await p.fill('dialog input[name="pages"]', '4, 1-2'); await p.click('dialog [value="ok"]');
  const { buf } = await saveFirst(p);
  const text = await pdfText(buf);
  assert(/Page four[\s\S]*Page one[\s\S]*Page two/.test(text) && !text.includes('Page three'), 'wrong pages: ' + text.replace(/\s+/g, ' '));
  await done(p);
});

await test('Resize image halves a picture and keeps its shape', async () => {
  const p = await page('/resize-image/');
  await p.setInputFiles('#fileInput', jpg('photo.jpg', await photo()));
  await p.waitForSelector('.img-dialog'); await p.click('.img-dialog [value="ok"]');
  const { name, buf } = await saveFirst(p);
  assert(name === 'photo-resized.jpg', 'name ' + name);
  const [w, h] = await imageSize(p, buf, 'image/jpeg'); assert(w === 800 && h === 600, `size ${w}x${h}`);
  await done(p);
});

await test('Crop image makes a square', async () => {
  const p = await page('/crop-image/');
  await p.setInputFiles('#fileInput', jpg('photo.jpg', await photo()));
  await p.waitForSelector('.img-dialog'); await p.click('.img-dialog [data-a="1"]'); await p.click('.img-dialog [value="ok"]');
  const { buf } = await saveFirst(p);
  const [w, h] = await imageSize(p, buf, 'image/jpeg'); assert(w === h && w === 1200, `size ${w}x${h}`);
  await done(p);
});

await test('Compare marks the changes on the pages', async () => {
  const p = await page('/compare-pdf/');
  await p.setInputFiles('#fileInput', [file('old.pdf', OLD), file('new.pdf', NEW)]);
  await p.waitForSelector('.cmp [data-v="pages"]'); await p.waitForFunction(() => /\d/.test(document.querySelector('.cmp-sum').textContent));
  await p.click('.cmp [data-v="pages"]');
  await p.waitForFunction(() => document.querySelectorAll('.cmp-page canvas').length >= 2 && document.querySelectorAll('.cmp-mark.del').length && document.querySelectorAll('.cmp-mark.add').length, null, { timeout: 30000 });
  await done(p);
});

await test('Scan to PDF straightens a photo of paper and reads its text', async () => {
  const g = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
  await g.setContent(`<body style="margin:0;background:#4a3526;width:1000px;height:1300px;overflow:hidden;perspective:1200px"><div style="position:absolute;left:170px;top:190px;width:660px;height:930px;background:#fff;transform:rotateX(12deg) rotateZ(-5deg);padding:60px;box-sizing:border-box;font:34px Georgia"><h1 style="margin:0 0 24px">Receipt</h1><p>Bakery in Aarhus</p><p>Total 68.00</p></div></body>`);
  const shot = await g.screenshot({ type: 'jpeg', quality: 90 }); await g.close();
  const p = await page('/scan-to-pdf/');
  await p.setInputFiles('#fileInput', jpg('receipt.jpg', shot));
  await p.waitForSelector('.scan .sc-res', { timeout: 20000 });
  await p.check('.sc-ocr input'); await p.click('.sc-make');
  const { name, buf } = await saveFirst(p);
  assert(name === 'scan.pdf', 'name ' + name);
  const doc = await PDFDocument.load(buf), { width, height } = doc.getPage(0).getSize();
  assert(height > width * 1.2, `page is not upright paper: ${width}x${height}`);
  const text = await pdfText(buf); assert(/Receipt/.test(text) && /Aarhus/.test(text), 'OCR text: ' + text.trim().slice(0, 120));
  await done(p);
});

await test('Move text turns a paragraph into a box that can be rewritten and moved to another page', async () => {
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica);
  const p1 = d.addPage([595, 842]);
  ['The first paragraph explains what the project is about and', 'why it matters to the people who will use it.'].forEach((t, i) => p1.drawText(t, { x: 60, y: 730 - i * 16, size: 12, font: f }));
  d.addPage([595, 842]).drawText('Appendix', { x: 60, y: 780, size: 22, font: f });
  const p = await page('/edit-pdf/');
  await p.setInputFiles('#fileInput', file('report.pdf', Buffer.from(await d.save())));
  await p.waitForTimeout(1000);
  if (!(await p.$('#edParas'))) { await p.locator('#edBody button').first().click(); await p.waitForSelector('#edParas'); }
  await p.click('#edParas'); await p.locator('.ed-stage-wrap').first().locator('.ed-para').first().click();
  await p.locator('.ed-block').first().focus(); await p.click('.ed-block [data-b="rewrite"]');
  const ta = p.locator('.ed-block textarea').first(); await ta.waitFor();
  assert((await ta.inputValue()).startsWith('The first paragraph explains what the project is about and why'), 'paragraph text: ' + await ta.inputValue());
  await ta.fill('A rewritten paragraph.');
  const sel = p.locator('.ed-block select').first(); const opts = await sel.locator('option').evaluateAll(o => o.map(x => x.value)); await sel.selectOption(opts[1]);
  await p.waitForTimeout(500);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edSave')]);
  const out = await readFile(await dl.path());
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js'), doc = await pdfjs.getDocument({ data: new Uint8Array(out), isEvalSupported: false, verbosity: 0 }).promise;
  const pageText = async n => (await (await doc.getPage(n)).getTextContent()).items.map(i => i.str).join(' ');
  const t1 = await pageText(1), t2 = await pageText(2);
  assert(!t1.includes('first paragraph'), 'old text still on page 1: ' + t1);
  assert(t2.includes('A rewritten paragraph.'), 'new text not on page 2: ' + t2);
  await done(p);
});

await test('Moving text without rewriting it keeps its own font and size', async () => {
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.TimesRomanItalic);
  d.addPage([595, 842]).drawText('A line in Times Italic at 17 points.', { x: 60, y: 730, size: 17, font: f });
  d.addPage([595, 842]);
  const p = await page('/edit-pdf/');
  await p.setInputFiles('#fileInput', file('times.pdf', Buffer.from(await d.save())));
  await p.waitForTimeout(1000);
  if (!(await p.$('#edParas'))) { await p.locator('#edBody button').first().click(); await p.waitForSelector('#edParas'); }
  await p.click('#edParas'); await p.locator('.ed-stage-wrap').first().locator('.ed-para').first().click();
  await p.waitForSelector('.ed-block-img');
  await p.locator('.ed-block').first().focus();
  const sel = p.locator('.ed-block select').first(); const opts = await sel.locator('option').evaluateAll(o => o.map(x => x.value)); await sel.selectOption(opts[1]);
  await p.waitForTimeout(400);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edSave')]);
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js'), doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(await dl.path())), isEvalSupported: false, verbosity: 0 }).promise;
  const items = n => doc.getPage(n).then(pg => pg.getTextContent()).then(t => t.items.filter(i => i.str.trim()));
  const one = await items(1), two = await items(2);
  assert(!one.length, 'text left on page 1: ' + one.map(i => i.str).join(' '));
  const it = two.find(i => i.str.includes('Times Italic'));
  assert(it, 'moved text not on page 2');
  assert(Math.abs(Math.abs(it.transform[3]) - 17) < 0.5, 'size changed to ' + it.transform[3]);
  const pg2 = await doc.getPage(2); await pg2.getOperatorList();
  const fobj = pg2.commonObjs.get(it.fontName), fname = (fobj && (fobj.name || fobj.loadedName)) || '';
  assert(/Times.*Italic/i.test(fname), 'font changed to ' + fname);
  await done(p);
});

await test('Rewritten text keeps the PDF\'s own font and size', async () => {
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.TimesRomanItalic);
  d.addPage([595, 842]).drawText('An old line in Times Italic.', { x: 60, y: 730, size: 15, font: f });
  const p = await page('/edit-pdf/');
  await p.setInputFiles('#fileInput', file('times.pdf', Buffer.from(await d.save())));
  await p.waitForTimeout(1000);
  if (!(await p.$('#edParas'))) { await p.locator('#edBody button').first().click(); await p.waitForSelector('#edParas'); }
  await p.click('#edParas'); await p.locator('.ed-para').first().click();
  await p.locator('.ed-block').first().focus(); await p.click('.ed-block [data-b="rewrite"]');
  await p.locator('.ed-block textarea').first().fill('A new sentence, still in Times Italic.');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edSave')]);
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js'), doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(await dl.path())), isEvalSupported: false, verbosity: 0 }).promise;
  const pg = await doc.getPage(1), tc = await pg.getTextContent(); await pg.getOperatorList();
  const it = tc.items.find(i => i.str.includes('new sentence'));
  assert(it, 'new text missing: ' + tc.items.map(i => i.str).join('|'));
  assert(!tc.items.some(i => i.str.includes('old line')), 'old text still there');
  const fo = pg.commonObjs.get(it.fontName), name = (fo && (fo.name || fo.loadedName)) || '';
  assert(/Times.*Italic/i.test(name), 'font is ' + name);
  assert(Math.abs(Math.abs(it.transform[3]) - 15) < .5, 'size is ' + it.transform[3]);
  await done(p);
});

await test('the PDF editor is fetched only when needed, and still opens from the home page', async () => {
  const p = await page('/'); const got = []; p.on('request', r => { if (/assets\/(editor|pdf-text)(\.min)?\.js/.test(r.url())) got.push(r.url()); });
  await p.waitForTimeout(1500); assert(!got.length, 'editor loaded on the home page: ' + got.join(', '));
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica); d.addPage([595, 842]).drawText('Hello', { x: 60, y: 780, size: 20, font: f });
  await p.setInputFiles('#fileInput', file('hello.pdf', Buffer.from(await d.save()))); await p.waitForSelector('#ring.open'); await p.click('.slice[data-t="edit"]');
  await p.waitForSelector('.ed-card', { timeout: 20000 }); assert(got.length === 2, 'editor files fetched: ' + got.length);
  await done(p);
});

await test('an error offers a report to copy or email, and sends nothing by itself', async () => {
  const p = await page('/'); const out = []; p.on('request', r => { if (!r.url().startsWith(BASE)) out.push(r.url()); });
  await p.evaluate(() => setTimeout(() => { throw new Error('Smoke test error'); }, 0)); await p.waitForSelector('#errPill.show');
  p.errors = []; await p.click('#errPill'); await p.waitForSelector('.err-dialog textarea');
  const txt = await p.inputValue('.err-dialog textarea'); assert(txt.includes('Smoke test error') && txt.includes('Page: /'), 'report text: ' + txt.slice(0, 120));
  const href = await p.getAttribute('.err-dialog [data-a="mail"]', 'href'); assert(href.startsWith('mailto:') && href.includes('Smoke%20test%20error'), 'mail link: ' + href.slice(0, 80));
  assert(!out.length, 'requests to other hosts: ' + out.join(', '));
  await done(p);
});

await test('a 200-page PDF with thousands of amounts is searched without freezing the page', async () => {
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 200; i++) { const pg = d.addPage([595, 842]); for (let k = 0; k < 40; k++) pg.drawText(`Line ${k + 1}: Invoice 12.345,00 kr. CPR 010190-1234`, { x: 40, y: 800 - k * 18, size: 9, font: f }); }
  const p = await page('/remove-prices-from-pdf/');
  await p.evaluate(() => { window.__lt = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt = Math.max(window.__lt, e.duration); }).observe({ type: 'longtask' }); });
  await p.setInputFiles('#fileInput', file('long.pdf', Buffer.from(await d.save())));
  await p.waitForSelector('#edFindSave:not([disabled])', { timeout: 60000 }); await p.waitForTimeout(1500);
  const lt = await p.evaluate(() => window.__lt); assert(lt < 1500, `page froze for ${Math.round(lt)} ms`);
  const cpr = await p.$eval('.ed-cat[data-k="cpr"] .ed-cat-n', e => e.textContent); assert(cpr === '8000', 'CPR hits: ' + cpr);
  await done(p);
});

await test('Excel to PDF lays the sheet out as a table with real text, and PDF to Excel brings it back as numbers', async () => {
  const XLSX = (await import('xlsx')).default;
  const rows = [['Dato', 'Kunde', 'Antal', 'Beløb']]; for (let i = 1; i <= 60; i++) rows.push([`0${(i % 9) + 1}.11.2026`, 'Ærø Køkken ApS', i, 100 + i / 2]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Salg');
  let p = await page('/excel-to-pdf/');
  await p.setInputFiles('#fileInput', file('salg.xlsx', Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))));
  const pdf = await saveFirst(p); assert(pdf.name === 'salg.pdf', 'name ' + pdf.name);
  const text = await pdfText(pdf.buf); assert(/Ærø Køkken ApS/.test(text) && /Beløb/.test(text), 'PDF text: ' + text.slice(0, 120));
  await done(p);
  p = await page('/pdf-to-excel/');
  await p.setInputFiles('#fileInput', file('salg.pdf', pdf.buf));
  const xl = await saveFirst(p); assert(xl.name === 'salg.xlsx', 'name ' + xl.name);
  const back = XLSX.utils.sheet_to_json(XLSX.read(xl.buf).Sheets.PDF, { header: 1, raw: true });
  const head = back.findIndex(r => r.includes('Dato')); assert(head >= 0, 'no heading row: ' + JSON.stringify(back.slice(0, 3)));
  const first = back[head + 1]; assert(first[0] === '02.11.2026' && first[1] === 'Ærø Køkken ApS' && first[2] === 1 && first[3] === 100.5, 'first row: ' + JSON.stringify(first));
  await done(p);
});

await test('recipes: photos become one PDF, and documents of mixed kinds become one PDF in order', async () => {
  const p = await page('/');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-recipe="photos-pdf"]')]);
  await fc.setFiles([jpg('a.jpg', await photo()), jpg('b.jpg', await photo())]);
  const one = await saveFirst(p); assert(one.name === 'photos.pdf', 'name ' + one.name);
  assert((await PDFDocument.load(one.buf)).getPageCount() === 2, 'pages');
  await p.click('#clearOut').catch(() => {});
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica); d.addPage([595, 842]).drawText('First document', { x: 60, y: 780, size: 20, font: f });
  const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-recipe="docs-one-pdf"]')]);
  await fc2.setFiles([file('first.pdf', Buffer.from(await d.save())), jpg('pic.jpg', await photo())]);
  await p.waitForFunction(() => [...document.querySelectorAll('.row.done')].some(j => /combined\.pdf/.test(j.textContent)), null, { timeout: 30000 });
  await done(p);
});

await test('Compress video makes an MP4 smaller and keeps its turn (skipped without ffmpeg)', async () => {
  const { execFileSync } = await import('node:child_process'); const { mkdtempSync } = await import('node:fs'); const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'lv-')), src = join(dir, 'clip.mp4');
  // VP9 in MP4: the test browser (open-source Chromium) has no H.264; real Chrome and Safari use H.264 for both
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '5', '-c:v', 'libvpx-vp9', '-b:v', '8M', '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libopus', '-f', 'mp4', join(dir, 'flat.mp4')]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-display_rotation', '90', '-i', join(dir, 'flat.mp4'), '-c', 'copy', src]); // a portrait phone video: turned by a note in the file
  }
  catch (e) { console.log('     (no ffmpeg, skipped)'); return; }
  const p = await page('/compress-video/');
  await p.setInputFiles('#fileInput', src);
  await p.click('dialog[open] input[value="small"]'); await p.click('dialog[open] [value="ok"]');
  const out = await saveFirst(p); assert(out.name === 'clip-small.mp4', 'name ' + out.name);
  assert(out.buf.length < (await readFile(src)).length * .6, `not much smaller: ${out.buf.length}`);
  const { writeFileSync } = await import('node:fs'); writeFileSync(join(dir, 'out.mp4'), out.buf);
  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:stream_side_data=rotation', '-of', 'compact', join(dir, 'out.mp4')]).toString();
  assert(/width=1280\|height=720/.test(probe) && /codec_type=audio/.test(probe) && /rotation=90/.test(probe), 'probe: ' + probe);
  await done(p);
});

await test('PowerPoint to PDF draws each slide with real text, bullets and the table', async () => {
  const p = await page('/powerpoint-to-pdf/');
  await p.setInputFiles('#fileInput', join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'slides.pptx'));
  const out = await saveFirst(p); assert(out.name === 'slides.pdf', 'name ' + out.name);
  assert((await PDFDocument.load(out.buf)).getPageCount() === 3, 'pages');
  const text = await pdfText(out.buf);
  assert(/Årsrapport 2026/.test(text) && /Ny butik i Aarhus/.test(text) && /150\.000/.test(text), 'text: ' + text.replace(/\s+/g, ' ').slice(0, 160));
  await done(p);
});

await test('Make a fillable PDF adds real text and tick-box fields where they are drawn', async () => {
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica); d.addPage([595, 842]).drawText('Name:', { x: 60, y: 780, size: 14, font: f });
  const p = await page('/make-fillable-pdf/');
  await p.setInputFiles('#fileInput', file('blank.pdf', Buffer.from(await d.save())));
  await p.waitForSelector('#edFields[aria-pressed="true"]', { timeout: 20000 }); await p.waitForTimeout(1000);
  const L = await p.locator('.ed-stage-wrap').first().locator('.ed-layer').boundingBox();
  await p.mouse.move(L.x + 150, L.y + 60); await p.mouse.down(); await p.mouse.move(L.x + 400, L.y + 85, { steps: 5 }); await p.mouse.up();
  await p.selectOption('#edFieldKind', 'check'); await p.mouse.click(L.x + 150, L.y + 120);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edSave')]);
  const form = (await PDFDocument.load(await readFile(await dl.path()))).getForm();
  const kinds = form.getFields().map(x => x.constructor.name).sort().join(',');
  assert(kinds === 'PDFCheckBox,PDFTextField', 'fields: ' + kinds);
  await done(p);
});

await test('QR code generator makes a code for a link and for Wi-Fi', async () => {
  const p = await page('/qr-code-generator/');
  await p.waitForSelector('#qrText'); await p.fill('#qrText', 'https://lunaverta.com/');
  let [dl] = await Promise.all([p.waitForEvent('download'), p.click('#qrPng')]);
  assert(dl.suggestedFilename() === 'qr-code.png' && (await readFile(await dl.path())).length > 1000, 'png');
  await p.click('label:has(input[value="wifi"])'); await p.fill('#qrSsid', 'Home'); await p.fill('#qrPass', 'secret');
  [dl] = await Promise.all([p.waitForEvent('download'), p.click('#qrSvg')]);
  const svg = (await readFile(await dl.path())).toString(); assert(dl.suggestedFilename() === 'qr-wifi.svg' && /<path d="M/.test(svg), 'svg');
  // a company logo in the middle: shown, embedded in the SVG, and removable
  await p.setInputFiles('#qrLogoFile', join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'logo.png'));
  await p.waitForSelector('#qrLogoDel:not([hidden])');
  [dl] = await Promise.all([p.waitForEvent('download'), p.click('#qrSvg')]);
  assert(/<image href="data:image\/png;base64,/.test((await readFile(await dl.path())).toString()), 'logo not in SVG');
  await p.click('#qrLogoDel'); assert(await p.isHidden('#qrLogoPrev'), 'logo not removed');
  await done(p);
});

await test('more PDF tools: alternate merge, blank pages, flatten, booklet order, header and footer', async () => {
  const mk = async labels => { const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica); for (const l of labels) { const pg = d.addPage([595, 842]); if (l) pg.drawText(l, { x: 200, y: 600, size: 30, font: f }); } return Buffer.from(await d.save()); };
  const run = async (url, files, before) => { const p = await page(url); await p.setInputFiles('#fileInput', files); if (before) { await p.waitForSelector('dialog[open]'); await before(p); await p.click('dialog[open] [value="ok"]'); } const out = await saveFirst(p); await done(p); return out; };
  let o = await run('/alternate-merge-pdf/', [file('f.pdf', await mk(['F1', 'F2'])), file('b.pdf', await mk(['B2', 'B1']))], async () => {});
  assert((await pdfText(o.buf)).replace(/\s+/g, '') === 'F1B1F2B2', 'order: ' + (await pdfText(o.buf)).replace(/\s+/g, ' '));
  o = await run('/remove-blank-pages-from-pdf/', [file('x.pdf', await mk(['A', '', 'B', '']))]);
  assert((await PDFDocument.load(o.buf)).getPageCount() === 2, 'blank pages left');
  const fd = await PDFDocument.create(); fd.addPage([595, 842]); const tf = fd.getForm().createTextField('n'); tf.setText('Hello'); tf.addToPage(fd.getPage(0), { x: 50, y: 700, width: 200, height: 24 });
  o = await run('/flatten-pdf/', [file('form.pdf', Buffer.from(await fd.save()))]);
  assert((await PDFDocument.load(o.buf)).getForm().getFields().length === 0 && /Hello/.test(await pdfText(o.buf)), 'not flattened');
  o = await run('/pdf-booklet/', [file('e.pdf', await mk(['P1', 'P2', 'P3', 'P4']))], async () => {});
  assert((await pdfText(o.buf)).replace(/\s+/g, '').startsWith('P4P1P2P3'), 'booklet order: ' + (await pdfText(o.buf)).replace(/\s+/g, ' '));
  o = await run('/split-pdf/', [file('s.pdf', await mk(['1', '2', '3', '4', '5']))], async p => { await p.check('dialog[open] input[value="n"]'); await p.fill('dialog[open] input[name="n"]', '2'); });
  const JSZip = createRequire(import.meta.url)('jszip'), zip = await JSZip.loadAsync(o.buf), parts = Object.keys(zip.files).filter(n => n.endsWith('.pdf'));
  assert(parts.length === 3, 'split every 2 pages: ' + parts.join(', '));
  o = await run('/add-header-footer-to-pdf/', [file('h.pdf', await mk(['Body', 'Body']))], async p => { await p.fill('dialog[open] input[name="header"]', 'Confidential'); });
  assert(/Confidential/.test(await pdfText(o.buf)) && /page 2 of 2/.test(await pdfText(o.buf)), 'header/footer: ' + (await pdfText(o.buf)).replace(/\s+/g, ' ').slice(0, 120));
});

await test('Remove sensitive finds international phone numbers and ID numbers', async () => {
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica), pg = d.addPage([595, 842]);
  ['Phone: +44 20 7946 0000', 'Mobile 07700 900123', 'NI number: AB 12 34 56 C', 'SSN 123-45-6789', 'Total $1,257.84 for 24 pcs'].forEach((l, i) => pg.drawText(l, { x: 60, y: 760 - i * 30, size: 14, font: f }));
  const p = await page('/redact-pdf/');
  await p.setInputFiles('#fileInput', file('people.pdf', Buffer.from(await d.save())));
  await p.waitForSelector('#edFindCats button', { timeout: 20000 }); await p.waitForTimeout(2500);
  const counts = await p.evaluate(() => [...document.querySelectorAll('#edFindCats button')].map(b => b.textContent.replace(/\s+/g, ' ')));
  const n = re => +((counts.find(c => re.test(c)) || '').match(/(\d+)/) || [0, 0])[1];
  assert(n(/Phone/) === 2, 'phones: ' + counts.join(' | '));
  assert(n(/ID numbers/) === 2, 'ID numbers: ' + counts.join(' | '));
  await done(p);
});

await test('"Try it with a sample file" opens a made-up PDF in the tool', async () => {
  const p = await page('/da/anonymiser-pdf/');
  await p.click('[data-sample]');
  await p.waitForSelector('#edFindCats button', { timeout: 20000 });
  await done(p);
});

await test('Remove sensitive: go through the finds one at a time, and after saving it checks that the text is gone', async () => {
  const p = await page('/da/anonymiser-pdf/');
  await p.setInputFiles('#fileInput', join(ROOT, 'samples', 'loenseddel.pdf'));
  await p.waitForSelector('#edFindCats button[data-k="cpr"]:not([disabled])', { timeout: 20000 });
  await p.click('#edFindCats button[data-k="cpr"]'); await p.click('#edFindCats button[data-k="accounts"]');
  await p.waitForSelector('#edFindReview'); await p.click('#edFindReview');
  await p.waitForSelector('#edReview mark');
  const first = await p.innerText('#edReview mark');
  assert(/010203-4567/.test(first) || /\d/.test(first), 'review shows: ' + first);
  let guard = 0;
  while (await p.$('#edRvYes') && guard++ < 20) await p.click('#edRvYes');
  assert(/bliver fjernet/.test(await p.innerText('#edReview')), 'no summary: ' + await p.innerText('#edReview'));
  await p.click('#edRvBack');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edFindSave')]);
  const txt = (await pdfText(await readFile(await dl.path()))).replace(/\s+/g, ' ');
  assert(!txt.includes('010203-4567'), 'CPR still in the file');
  await p.waitForFunction(() => /Tjekket/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 15000 });
  assert(/tjekket/.test(await p.innerText('.row.done')), 'result row has no check note: ' + await p.innerText('.row.done'));
  await done(p);
});

await test('a long job shows Stop, and stopping it removes it without an error', async () => {
  const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 80; i++) d.addPage([595, 842]).drawText('Page ' + (i + 1), { x: 60, y: 760, size: 40, font: f });
  const p = await page('/pdf-to-jpg/');
  await p.setInputFiles('#fileInput', file('long.pdf', Buffer.from(await d.save())));
  await p.waitForSelector('.row.working .stop', { timeout: 20000 });
  await p.click('.row.working .stop');
  await p.waitForFunction(() => !document.querySelector('.row'), null, { timeout: 5000 });
  await p.waitForTimeout(2500);
  assert(!(await p.$('.row')), 'a row came back after Stop');
  await done(p);
});

await test('the tool search finds tools by other words, and "Show all" opens long groups on a phone', async () => {
  const p = await page('/da/', { viewport: { width: 390, height: 844 } });
  const visible = () => p.evaluate(() => [...document.querySelectorAll('.tool-grid li')].filter(li => li.offsetParent).map(li => li.textContent.trim()));
  assert((await visible()).length < 40, 'long groups are not folded');
  for (const b of await p.$$('.tg-more')) await b.click();
  assert((await visible()).length === 52, 'Show all did not open the group');
  await p.fill('#toolFind', 'signature');
  assert((await visible()).join('|') === 'Underskriv PDF', 'search: ' + (await visible()).join('|'));
  await p.fill('#toolFind', 'zzzz');
  assert(await p.isVisible('#toolNone'), 'no "nothing found" message');
  await done(p);
});

await test('a finished PDF shows a page preview and can go straight on to the next tool', async () => {
  const p = await page('/merge-pdf/');
  await p.setInputFiles('#fileInput', [file('a.pdf', OLD), file('b.pdf', NEW)]);
  await p.click('#targetRow .tgt.preset');
  const row = p.locator('.row.done').first(); await row.waitFor({ timeout: 60000 });
  await p.waitForSelector('.row.done .thumb img.page', { timeout: 20000 });
  assert(/4/.test(await row.locator('.meta').innerText()), 'no page count: ' + await row.locator('.meta').innerText());
  await row.locator('[data-next="shrink"]').click();
  await p.waitForFunction(() => document.querySelectorAll('.row.done').length >= 2, null, { timeout: 60000 });
  await done(p);
});

await test('unsaved work in the editor survives a reload and can be discarded', async () => {
  const p = await page('/edit-pdf/');
  await p.setInputFiles('#fileInput', file('agreement.pdf', OLD));
  await p.waitForSelector('#edReverse', { timeout: 30000 });
  await p.click('#edReverse');
  await p.waitForTimeout(1600);
  await p.reload();
  await p.waitForSelector('.draft-bar', { timeout: 10000 });
  assert(/agreement\.pdf/.test(await p.innerText('.draft-bar')), 'offer does not name the file');
  await p.click('.draft-bar [data-d="go"]');
  await p.waitForSelector('#edReverse', { timeout: 30000 });
  await p.waitForFunction(() => !document.querySelector('#edUndo')?.disabled, null, { timeout: 5000 });
  await p.click('#edCancel'); await p.click('#edDiscard');
  await p.waitForTimeout(300); await p.reload(); await p.waitForTimeout(800);
  assert(!(await p.$('.draft-bar')), 'draft still offered after discarding');
  await done(p);
});

await test('a dropped folder adds the files inside it, in number order, and skips what can\'t be used', async () => {
  const p = await page('/');
  await p.evaluate(() => {
    const file = (name, type) => ({ isFile: true, isDirectory: false, name, file: ok => ok(new File(['x'], name, { type })) });
    const dir = (name, kids) => ({ isFile: false, isDirectory: true, name, createReader: () => { let done = false; return { readEntries: ok => { ok(done ? [] : kids); done = true; } }; } });
    const root = dir('scans', [file('scan10.jpg', 'image/jpeg'), file('scan2.jpg', 'image/jpeg'), file('notes.xyz', ''), file('.DS_Store', ''), dir('more', [file('scan1.jpg', 'image/jpeg')])]);
    const e = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'dataTransfer', { value: { types: ['Files'], files: [], items: [{ webkitGetAsEntry: () => root }] } });
    window.dispatchEvent(e);
  });
  await p.waitForFunction(() => document.querySelectorAll('#tray .chip').length === 3, null, { timeout: 5000 });
  const names = await p.$$eval('#tray .chip .nm', els => els.map(e => e.textContent));
  assert(names.join(',') === 'scan1.jpg,scan2.jpg,scan10.jpg', 'order: ' + names.join(','));
  await done(p);
});

await test('files waiting to be merged show their first page and can be moved earlier without dragging', async () => {
  const p = await page('/merge-pdf/');
  await p.setInputFiles('#fileInput', [file('a.pdf', OLD), file('b.pdf', NEW), file('c.pdf', OLD)]);
  await p.waitForFunction(() => document.querySelectorAll('#tray .chip-pg').length === 3, null, { timeout: 20000 });
  await p.click('#tray .chip:nth-child(3) .chip-up');
  assert((await p.$$eval('#tray .nm', e => e.map(x => x.textContent))).join() === 'a.pdf,c.pdf,b.pdf', 'order after moving');
  await done(p);
});

await test('results say how much smaller they got, and a locked PDF offers Unlock instead of a dead end', async () => {
  let p = await page('/compress-image/');
  await p.setInputFiles('#fileInput', jpg('photo.jpg', await photo()));
  await p.waitForSelector('.img-dialog'); await p.click('.img-dialog [value="ok"]');
  const st = p.locator('.row.done .state').first(); await st.waitFor({ timeout: 60000 });
  assert(/→ .*% smaller/.test(await st.innerText()), 'no saving shown: ' + await st.innerText());
  await done(p);
  p = await page('/compress-pdf/');
  await p.setInputFiles('#fileInput', join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'locked.pdf'));
  await p.waitForSelector('.row.err .unlock', { timeout: 60000 });
  await p.click('.row.err .unlock');
  await p.waitForSelector('dialog[open] input[type="password"]', { timeout: 10000 });
  p.errors = []; await done(p);
});

await test('the search at the top finds a tool, and "Clear everything" empties the page', async () => {
  let p = await page('/da/');
  await p.fill('#topFind', 'underskrift');
  await p.waitForSelector('#topHits a');
  assert(/Underskriv PDF/.test(await p.innerText('#topHits')), 'top search: ' + await p.innerText('#topHits'));
  await p.press('#topFind', 'Enter'); await p.waitForURL(/underskriv/);
  await done(p);
  p = await page('/compress-pdf/');
  await p.setInputFiles('#fileInput', file('a.pdf', OLD)); await p.waitForSelector('.row.done');
  await p.click('#clearAll'); await p.waitForSelector('dialog[open]'); await p.click('dialog[open] [value="ok"]');
  await p.waitForFunction(() => !document.querySelector('.row') && !document.querySelector('#tray .chip'));
  await done(p);
});

await test('a PDF opened from Windows shows straight away, and the editor can save back over it', async () => {
  const p = await page('/');
  // what launchQueue hands over: the file and its handle (a stand-in that records what is written)
  await p.evaluate(async b64 => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), file = new File([bytes], 'agreement.pdf', { type: 'application/pdf' });
    window.__written = null;
    const handle = { name: 'agreement.pdf', kind: 'file', requestPermission: async () => 'granted', createWritable: async () => { const parts = []; return { write: async x => parts.push(x), close: async () => { window.__written = await new Blob(parts).arrayBuffer().then(a => a.byteLength); } }; } };
    (await window.LVLoadViewer()).open(file, handle);
  }, OLD.toString('base64'));
  await p.waitForSelector('#viewer .vw-page canvas', { timeout: 30000 });
  await p.waitForSelector('#viewer .textLayer span', { timeout: 15000 });
  assert(/Service agreement/.test(await p.innerText('#viewer .vw-page')), 'text layer has no text');
  assert(/2/.test(await p.innerText('#vwInfo')), 'page count: ' + await p.innerText('#vwInfo'));
  await p.click('#vwEdit');
  await p.waitForSelector('#edSave', { timeout: 30000 });
  await p.click('#edReverse');
  await p.click('#edSave');
  await p.waitForSelector('dialog[open] input[value="over"]');
  assert(/agreement\.pdf/.test(await p.innerText('dialog[open]')), 'no file name in the save choice');
  await p.click('dialog[open] [value="ok"]');
  await p.waitForFunction(() => window.__written > 1000, null, { timeout: 30000 });
  await done(p);
});

await test('a computer gets a note that LunaVerta can be installed, its button opens the install window, and it stays away once closed', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('lunaverta-welcome', '1'); localStorage.setItem('lunaverta-tour', '1'); } catch (e) {}
    Object.defineProperty(navigator, 'userAgentData', { get: () => ({ brands: [{ brand: 'Microsoft Edge', version: '130' }], mobile: false }) });
    addEventListener('load', () => setTimeout(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__prompted = 1; }; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); dispatchEvent(e); }, 200));
  });
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  await p.goto(BASE + '/da/');
  await p.waitForSelector('#installHint', { timeout: 8000 });
  await p.click('#installHint [data-ih="go"]');
  assert(await p.evaluate(() => window.__prompted === 1), 'install window not opened');
  await p.reload(); await p.waitForTimeout(3500);
  assert(!(await p.$('#installHint')), 'card came back after it was closed');
  await done(p);
});

await test('Add % to prices: 8 % on a quote recalculates lines, subtotal, VAT and total in the saved PDF', async () => {
  const p = await page('/da/rediger-pdf/');
  await p.setInputFiles('#fileInput', join(ROOT, 'samples', 'tilbud.pdf'));
  await p.waitForSelector('#edMarkup', { timeout: 30000 });
  await p.click('#edMarkup');
  await p.waitForSelector('.mk-dialog[open]', { timeout: 30000 });
  assert((await p.$$('.mk-pct input')).length === 4, 'quote lines found: ' + (await p.$$('.mk-pct input')).length);
  await p.fill('#mkAll', '8'); await p.click('#mkAllGo');
  assert(/10\.123,65/.test(await p.innerText('#mkSums')), 'sums: ' + await p.innerText('#mkSums'));
  await p.click('.mk-dialog [value="ok"]');
  await p.waitForSelector('.ed-edit', { timeout: 15000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edSave')]);
  const txt = (await pdfText(await readFile(await dl.path()))).replace(/\s+/g, ' ');
  for (const v of ['2.046,60', '730,08', '8.098,92', '2.024,73', '10.123,65']) assert(txt.includes(v), `missing ${v}: ` + txt.slice(0, 300));
  for (const v of ['7.499,00', '9.373,75']) assert(!txt.includes(v), `old amount still there: ${v}`);
  await done(p);
});

await test('Add % to prices as its own line: the prices stay, a "Tillæg 8 %" line is added and the sums include it', async () => {
  const p = await page('/da/rediger-pdf/');
  await p.setInputFiles('#fileInput', join(ROOT, 'samples', 'tilbud.pdf'));
  await p.waitForSelector('#edMarkup', { timeout: 30000 });
  await p.click('#edMarkup');
  await p.waitForSelector('.mk-dialog[open]', { timeout: 30000 });
  await p.check('input[name="mkMode"][value="line"]');
  await p.fill('#mkAll', '8');
  const sums = await p.innerText('#mkSums');
  assert(/Tillæg 8 %/.test(sums) && /599,92/.test(sums) && /10\.123,65/.test(sums), 'sums: ' + sums);
  await p.click('.mk-dialog [value="ok"]');
  await p.waitForSelector('.ed-text textarea', { timeout: 15000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edSave')]);
  const txt = (await pdfText(await readFile(await dl.path()))).replace(/\s+/g, ' ');
  for (const v of ['Tillæg 8 %', '599,92', '8.098,92', '2.024,73', '10.123,65']) assert(txt.includes(v), `missing ${v}: ` + txt.slice(0, 400));
  assert(!txt.includes('2.046,60'), 'a line price was changed');
  assert(!txt.includes('9.373,75'), 'old total still there');
  await done(p);
});

await test('Add % to prices as its own line with a different % per line: the markups are added together', async () => {
  const p = await page('/da/rediger-pdf/');
  await p.setInputFiles('#fileInput', join(ROOT, 'samples', 'tilbud.pdf'));
  await p.waitForSelector('#edMarkup', { timeout: 30000 }); await p.click('#edMarkup');
  await p.waitForSelector('.mk-dialog[open]', { timeout: 30000 });
  await p.check('input[name="mkMode"][value="line"]');
  const ins = await p.$$('.mk-pct input'); const pct = ['5', '10', '0', '8'];
  for (let i = 0; i < ins.length; i++) await ins[i].fill(pct[i]);
  // 2.136,00 × 5 % + 1.895,00 × 10 % + 2.792,00 × 8 % = 106,80 + 189,50 + 223,36 = 519,66
  const sums = await p.innerText('#mkSums');
  assert(/Tillæg\s/.test(sums) && /519,66/.test(sums) && /8\.018,66/.test(sums), 'sums: ' + sums);
  await p.click('.mk-dialog [value="ok"]');
  await p.waitForSelector('.ed-text textarea', { timeout: 15000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edSave')]);
  const txt = (await pdfText(await readFile(await dl.path()))).replace(/\s+/g, ' ');
  for (const v of ['519,66', '8.018,66', '2.004,67', '10.023,33', '2.136,00']) assert(txt.includes(v), `missing ${v}: ` + txt.slice(0, 400));
  await done(p);
});

await test('every language has every interface text, with the same {placeholders} as English', async () => {
  const { runInNewContext } = await import('node:vm');
  const ctx = { window: {} };
  for (const f of ['strings', 'strings-sv', 'strings-no', 'strings-de', 'strings-es', 'strings-fr']) runInNewContext(await readFile(join(ROOT, 'assets', f + '.js'), 'utf8'), ctx);
  const S = ctx.window.LV_STR, en = S.en, holes = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join();
  const problems = [];
  for (const L of ['da', 'sv', 'no', 'de', 'es', 'fr']) for (const k of Object.keys(en)) {
    if (!(k in S[L])) problems.push(`${L}: missing ${k}`);
    else if (holes(S[L][k]) !== holes(en[k])) problems.push(`${L}: ${k} has {${holes(S[L][k])}}, English has {${holes(en[k])}}`);
  }
  assert(!problems.length, problems.slice(0, 8).join(' | ') + (problems.length > 8 ? ` (+${problems.length - 8} more)` : ''));
});

await test('Add % to prices understands order confirmations: discount rows, 3-decimal unit prices, sums by value', async () => {
  // Two made-up documents laid out like real supplier confirmations (none of their data).
  const mk = async rows => { const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica), pg = d.addPage([595, 842]);
    for (const [y, items] of rows) for (const [x, str, right] of items) pg.drawText(str, { x: right ? x - f.widthOfTextAtSize(str, 9) : x, y, size: 9, font: f });
    return Buffer.from(await d.save()); };
  const R = 560;
  const blockDoc = await mk([[700, [[40, 'Pos. Artikelnummer'], [300, 'Antal'], [380, 'Pris'], [R, 'Nettobeløb', 1]]],
    [680, [[40, '10'], [60, '3514019003'], [300, '465,216'], [340, 'M2'], [420, '176,40', 1], [R, '82.064,10', 1]]], [668, [[60, '34-Murfilt 190x267x1210']]],
    [656, [[80, 'Produktrabat'], [470, '-32,00 %', 1], [R, '-26.260,51', 1]]], [644, [[80, 'Kvantumsrabat'], [470, '-20,75 %', 1], [R, '-11.579,24', 1]]],
    [632, [[80, 'Projektrabat'], [470, '-12,00 %', 1], [R, '-5.306,92', 1]]], [620, [[80, 'netto pris'], [420, '83,65', 1], [R, '38.917,43', 1]]],
    [580, [[380, 'Nettobeløb:'], [R, '38.917,43', 1]]]]);
  const vatDoc = await mk([[700, [[40, 'Beskrivelse'], [300, 'Antal'], [420, 'Salgspris'], [R, 'Beløb', 1]]],
    [680, [[40, 'Lecablok 49x19x10 cm - 6 lag'], [250, '2562420'], [330, '1.080', 1], [340, 'stk'], [420, '10,988', 1], [R, '11.867,04', 1]]],
    [665, [[40, 'Olie- og energitillæg 6% - Blokke'], [250, '2617520'], [330, '1', 1], [340, 'Ialt'], [420, '1.130,22', 1], [R, '1.130,22', 1]]],
    [620, [[380, 'I alt DKK'], [R, '12.997,26', 1]]], [606, [[380, '25% moms'], [R, '3.249,32', 1]]], [592, [[380, 'I alt DKK inkl. moms'], [R, '16.246,58', 1]]]]);
  const run = async (buf, pcts) => {
    const p = await page('/da/rediger-pdf/');
    await p.setInputFiles('#fileInput', file('doc.pdf', buf));
    await p.waitForSelector('#edMarkup', { timeout: 30000 }); await p.click('#edMarkup');
    await p.waitForSelector('.mk-dialog[open]', { timeout: 30000 });
    const ins = await p.$$('.mk-pct input'); assert(ins.length === pcts.length, `lines found: ${ins.length}, expected ${pcts.length}`);
    for (let i = 0; i < pcts.length; i++) await ins[i].fill(String(pcts[i]));
    await p.click('.mk-dialog [value="ok"]'); await p.waitForSelector('.ed-edit', { timeout: 15000 });
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#edSave')]);
    const txt = (await pdfText(await readFile(await dl.path()))).replace(/\s+/g, ' ');
    await done(p); return txt;
  };
  let txt = await run(blockDoc, [8]);
  for (const v of ['190,51', '88.628,30', '-28.361,05', '-12.505,45', '-5.731,41', '90,34', '42.030,39', '465,216', '-32,00']) assert(txt.includes(v), `block: missing ${v}`);
  assert(!txt.includes('38.917,43'), 'block: old net still there');
  txt = await run(vatDoc, [8, 0]);
  for (const v of ['11,867', '12.816,36', '1.080', '1.130,22', '13.946,58', '3.486,65', '17.433,23']) assert(txt.includes(v), `VAT doc: missing ${v}: ` + txt.slice(0, 300));
});

await test('"Open with LunaVerta" in a Danish browser keeps the PDF (no jump to /da/), and a plain start still goes to /da/', async () => {
  const launch = async withFile => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'da-DK' });
    await ctx.addInitScript(([withFile, b64]) => {
      try { localStorage.setItem('lunaverta-welcome', '1'); localStorage.setItem('lunaverta-tour', '1'); } catch (e) {}
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      const mm = window.matchMedia.bind(window);
      window.matchMedia = q => /display-mode: standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q);
      // what Windows hands the app: launchQueue with the file's handle
      Object.defineProperty(window, 'launchQueue', { configurable: true, value: { setConsumer(fn) { setTimeout(() => {
        if (!withFile || location.pathname !== '/') return fn({ files: [] });
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        fn({ files: [{ kind: 'file', name: 'ordre.PDF', getFile: async () => new File([bytes], 'ordre.PDF', { type: 'application/pdf' }) }] });
      }, 50); } } });
    }, [withFile, OLD.toString('base64')]);
    const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
    await p.goto(BASE + '/');
    return p;
  };
  let p = await launch(true);
  await p.waitForSelector('#viewer .vw-page canvas', { timeout: 30000 });
  assert(new URL(p.url()).pathname === '/', 'jumped to ' + p.url());
  assert(/Rediger/.test(await p.innerText('#vwTools')), 'viewer not in Danish: ' + await p.innerText('#vwTools'));
  await done(p);
  p = await launch(false);
  await p.waitForURL(/\/da\/$/, { timeout: 5000 });
  await done(p);
});

await test('the home page works on a phone', async () => {
  const p = await page('/da/', { viewport: { width: 390, height: 844 } });
  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  assert(wide <= 391, 'page scrolls sideways: ' + wide + 'px');
  await done(p);
});

await browser.close(); server.close();
const failed = results.filter(r => !r[0]).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
