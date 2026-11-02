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
  for (const [L, word] of [['da', 'Vælg filer'], ['sv', 'Välj filer'], ['no', 'Velg filer'], ['de', 'Dateien wählen']]) {
    await p.goto(`${BASE}/${L}/`);
    assert((await p.locator('#btnChoose, [data-i18n="btn.choose"]').first().innerText()).trim() === word, `${L}: choose button not translated`);
    assert(await p.locator('.lang-menu a').count() === 5, `${L}: language menu should have 5 languages`);
    assert(await p.evaluate(l => !!(window.LV_STR && window.LV_STR[l]), L), `${L}: texts not loaded`);
  }
  await done(p);
});

// OCR in each language: a "scan" (a picture of text, no text layer) is read back with the right letters.
const SCANS = [
  ['sv', '/sv/gor-pdf-sokbar/', 'Kära kund, fakturan för måndag är betald. Tack för köpet och välkommen åter.', ['Kära', 'måndag', 'köpet', 'välkommen']],
  ['no', '/no/gjor-pdf-sokbar/', 'Kjære kunde, fødselsnummeret må ikke deles. Vi ønsker deg en fin søndag på kontoret.', ['Kjære', 'fødselsnummeret', 'ønsker', 'søndag']],
  ['de', '/de/pdf-durchsuchbar-machen/', 'Sehr geehrte Damen und Herren, die Größe der Lieferung für Grüße aus Köln ist gemäß Übersicht.', ['Größe', 'Grüße', 'Köln', 'Übersicht']]
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
