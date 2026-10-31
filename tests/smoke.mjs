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
