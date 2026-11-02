// Makes the share images (Open Graph, 1200×630) for every tool page and guide, in each page's language.
// Run after changing tool names or guides:  NODE_PATH=$(npm root -g) node scripts/make-share-images.mjs
// (uses Playwright's Chromium). Images go to docs/og/<lang>/<slug>.jpg; build-pages.mjs uses them when they exist.
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { TOOLS } from './site-content.mjs';
import { GUIDES } from './guides.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
for (const L of ['sv', 'no', 'de']) { const x = (await import(`./lang/${L}.mjs`)).default; for (const tl of TOOLS) { const { slug, ...rest } = x.tools[tl.id]; tl.slug[L] = slug; tl[L] = rest; } }

const ROOT = new URL('../docs/', import.meta.url).pathname;
const ctx = { window: {} };
vm.runInNewContext(readFileSync(ROOT + 'assets/strings.js', 'utf8'), ctx);
for (const L of ['sv', 'no', 'de']) vm.runInNewContext(readFileSync(ROOT + `assets/strings-${L}.js`, 'utf8'), ctx);
const STR = ctx.window.LV_STR, t = (L, k) => STR[L][k] ?? STR.en[k];
const LANGS = ['en', 'da', 'sv', 'no', 'de'];
const GUIDE_WORD = { en: 'Guide', da: 'Vejledning' };
const MAKER = { en: 'A product by', da: 'Et produkt fra', sv: 'En produkt från', no: 'Et produkt fra', de: 'Ein Produkt von' };
const WHERE = { en: 'Aarhus, Denmark', da: 'Aarhus, Danmark', sv: 'Aarhus, Danmark', no: 'Aarhus, Danmark', de: 'Aarhus, Dänemark' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const firstSentence = s => { const m = String(s).match(/^.{20,140}?[.!?](?=\s|$)/); return m ? m[0] : String(s).slice(0, 120); };

const font = (fam, file, w) => `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${readFileSync(ROOT + 'fonts/' + file).toString('base64')}) format('woff2');font-weight:${w}}`;
const CSS = [font('Bricolage', 'bricolage-grotesque-latin-700-normal.woff2', 700), font('Bricolage', 'bricolage-grotesque-latin-ext-700-normal.woff2', 700),
  font('Plex', 'ibm-plex-sans-latin-400-normal.woff2', 400), font('Plex', 'ibm-plex-sans-latin-600-normal.woff2', 600), font('Plex', 'ibm-plex-sans-latin-ext-400-normal.woff2', 400), font('Plex', 'ibm-plex-sans-latin-ext-600-normal.woff2', 600),
  font('Mono', 'ibm-plex-mono-latin-500-normal.woff2', 500), font('Mono', 'ibm-plex-mono-latin-ext-500-normal.woff2', 500)].join('') + `
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#e9ecf1;font-family:Plex,sans-serif;color:#151a2d;display:flex;align-items:center;padding:0 64px 0 72px;gap:56px}
.l{flex:1;min-width:0}.brand{display:flex;align-items:center;gap:14px;font:700 36px Bricolage;margin-bottom:34px}.brand svg{width:48px;height:48px}
h1{font:700 60px/1.06 Bricolage;letter-spacing:-.02em;margin:0 0 20px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
h1.long{font-size:50px}p{font-size:24px;line-height:1.38;color:#5d6478;margin:0 0 26px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.pill{display:inline-flex;align-items:center;gap:10px;background:#d6ead9;color:#26733a;font-weight:600;font-size:21px;padding:11px 20px;border-radius:999px}.pill svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2}
.by{margin-top:22px;font-size:19px;color:#5d6478}.by b{color:#151a2d}
.r{width:420px;height:440px;border:3px dashed #a9b0c2;border-radius:26px;background:#f6f7fa;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;flex:none;padding:24px}
.up{width:84px;height:84px;border-radius:18px;background:#dfe3fb;display:grid;place-items:center}.up svg{width:40px;height:40px;fill:none;stroke:#2f45c9;stroke-width:2.4;stroke-linecap:round}
.btn{background:#2f45c9;color:#fff;font:600 26px Plex;padding:20px 40px;border-radius:14px;box-shadow:0 10px 26px rgba(47,69,201,.35)}
.chip{font:500 20px Mono;border:1.5px solid #c9cedb;border-radius:10px;padding:9px 16px;background:#fff;max-width:360px;text-align:center}`;
const BRAND = `<svg viewBox="0 0 64 64"><defs><mask id="lm"><rect width="64" height="64" fill="#fff"/><circle cx="37" cy="27.5" r="9.5" fill="#000"/></mask></defs><circle cx="32" cy="32" r="24" fill="none" stroke="#2f45c9" stroke-width="7" stroke-dasharray="14 4.8" transform="rotate(-80 32 32)"/><circle cx="32" cy="32" r="12" fill="#e2a23b" mask="url(#lm)"/></svg>`;
const page = (L, h1, sub, chip) => `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body>
<div class="l"><div class="brand">${BRAND}LunaVerta</div><h1${h1.length > 34 ? ' class="long"' : ''}>${esc(h1)}</h1><p>${esc(sub)}</p>
<span class="pill"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>${esc(t(L, 'privacy.pill'))}</span>
<div class="by">${esc(MAKER[L])} <b>Midt-Tech</b> · ${esc(WHERE[L])}</div></div>
<div class="r"><div class="up"><svg viewBox="0 0 24 24"><path d="M12 15V4m0 0-4.5 4.5M12 4l4.5 4.5M5 19h14"/></svg></div><div class="btn">${esc(t(L, 'btn.choose'))}</div><div class="chip">${esc(chip)}</div></div></body>`;

const jobs = [];
for (const L of LANGS) for (const tl of TOOLS) jobs.push({ L, file: `${ROOT}og/${L}/${tl.slug[L]}.jpg`, html: page(L, tl[L].h1, firstSentence(tl[L].desc), tl[L].name) });
for (const L of ['en', 'da']) for (const g of GUIDES) jobs.push({ L, file: `${ROOT}og/${L}/guide-${g[L].slug}.jpg`, html: page(L, g[L].h1, firstSentence(g[L].lead), GUIDE_WORD[L]) });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const j of jobs) {
  mkdirSync(j.file.slice(0, j.file.lastIndexOf('/')), { recursive: true });
  await p.setContent(j.html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: j.file, type: 'jpeg', quality: 72 });
}
await b.close();
console.log('share images:', jobs.length, existsSync(ROOT + 'og') ? 'in docs/og' : '');
