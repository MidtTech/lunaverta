// Writes every LunaVerta page as finished HTML in English and Danish:
// the front page, one page per tool, sitemap.xml and llms.txt. Search engines
// and AI crawlers read the text without running JavaScript.
// Run with: node scripts/build-pages.mjs  (npm run build does it too)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import vm from 'node:vm';
import { SITE, COMPANY, HOME, LABELS, TOOLS, KINDS, TOOL_TARGETS, REPO } from './site-content.mjs';

const ctx = { window: {} };
vm.runInNewContext(readFileSync('docs/assets/strings.js', 'utf8'), ctx);
const STR = ctx.window.LV_STR;
const LANGS = ['en', 'da'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const t = (lang, key, vars) => { let s = STR[lang][key] ?? STR.en[key] ?? key; if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m); return s; };
const label = (lang, tg) => (TOOL_TARGETS.includes(tg) ? t(lang, 'tgt.' + tg) : tg).toUpperCase();
const path = (lang, slug) => (lang === 'en' ? '/' : '/da/') + (slug ? slug + '/' : '');
const url = (lang, slug) => SITE + path(lang, slug);

// ---------- static texts by key (data-i18n, data-i18n-html, data-i18n-attr) ----------
function fillTexts(html, lang) {
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, _txt, close) => open + esc(t(lang, key)) + close);
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\sdata-i18n-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, key, _txt, close) => open + t(lang, key) + close);
  html = html.replace(/<[a-z0-9]+\b[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, tagHtml => {
    let out = tagHtml;
    for (const pair of tagHtml.match(/data-i18n-attr="([^"]+)"/)[1].split(';')) {
      const [attr, key] = pair.split(':').map(x => x.trim());
      out = out.replace(new RegExp(`\\s${attr}="[^"]*"`), ` ${attr}="${esc(t(lang, key))}"`);
    }
    return out;
  });
  // the GIF option labels and the quality output are set by the app; write them in the right language
  html = html.replace(/<option value="(\d+)" class="gifN"( selected)?>[^<]*<\/option>/g, (m, n, sel) => `<option value="${n}" class="gifN"${sel || ''}>${esc(t(lang, 'opt.gifN', { n }))}</option>`);
  return html;
}

// ---------- sections ----------
const refGrid = lang => Object.entries(KINDS).map(([id, k]) => `<div class="kind" style="--k:var(${k.color})"><h3>${esc(t(lang, 'kind.' + id))}</h3>
  <p class="from">${esc(t(lang, 'ref.from'))} ${k.exts.map(e => e.toUpperCase()).join(' · ')}</p>
  <p class="to">${esc(t(lang, 'ref.to'))} <b>${k.targets.map(x => esc(label(lang, x))).join(' · ')}</b></p><p class="note">${esc(t(lang, 'note.' + id))}</p></div>`).join('');

const GENERAL_FAQ = [1, 2, 3, 4, 5, 6, 7, 8];
function faqSection(lang, toolFaq, toolName) {
  const items = [...(toolFaq || []).map(([q, a]) => ({ q, a })), ...GENERAL_FAQ.filter(i => !toolFaq || [1, 2, 5].includes(i)).map(i => ({ q: t(lang, 'faq.q' + i), a: t(lang, 'faq.a' + i), key: i }))];
  const html = `  <section class="faq" aria-labelledby="h-faq">
    <h2 id="h-faq">${esc(toolName ? LABELS[lang].faqTool.replace('{name}', toolName) : t(lang, 'faq.h'))}</h2>
    <div class="faq-list">
${items.map((it, i) => `      <details${toolFaq && i === 0 ? ' open' : ''}><summary${it.key ? ` data-i18n="faq.q${it.key}"` : ''}>${esc(it.q)}</summary><p${it.key ? ` data-i18n-html="faq.a${it.key}"` : ''}>${it.key ? it.a : esc(it.a)}</p></details>`).join('\n')}
    </div>
  </section>`;
  return { html, items };
}
function toolsSection(lang, currentId) {
  const L = LABELS[lang];
  return `  <nav class="tools" aria-labelledby="h-tools">
    <h2 id="h-tools">${esc(L.tools)}</h2>
    <ul class="tool-grid">
${TOOLS.map(tl => `      <li><a href="${path(lang, tl.slug[lang])}"${tl.id === currentId ? ' aria-current="page"' : ''}>${esc(tl[lang].name)}</a></li>`).join('\n')}
    </ul>
  </nav>`;
}
function aboutSection(lang) {
  const L = LABELS[lang];
  return `  <section class="about" aria-labelledby="h-about">
    <h2 id="h-about">${esc(L.about)}</h2>
    <p>${esc(L.aboutText)}</p>
    <dl class="facts">
${L.facts.map(([k, v]) => `      <div><dt>${esc(k)}</dt><dd>${k === L.facts[6][0] ? `<a href="${REPO}" rel="noopener">${esc(v)}</a>` : esc(v)}</dd></div>`).join('\n')}
    </dl>
  </section>`;
}
function howtoSection(lang, tool) {
  const d = tool[lang];
  return `  <section class="howto" aria-labelledby="h-howto">
    <h2 id="h-howto">${esc(LABELS[lang].howto.replace('{name}', d.name))}</h2>
    <ol>
${d.steps.map(s => `      <li>${esc(s)}</li>`).join('\n')}
    </ol>
  </section>`;
}

// ---------- structured data ----------
const org = { '@type': 'Organization', '@id': SITE + '/#org', name: COMPANY.name, url: COMPANY.url, email: COMPANY.email, vatID: 'DK' + COMPANY.cvr,
  address: { '@type': 'PostalAddress', streetAddress: COMPANY.street, postalCode: COMPANY.zip, addressLocality: COMPANY.city, addressCountry: COMPANY.country } };
function jsonLd(lang, page, faqItems) {
  const graph = [org,
    { '@type': 'WebSite', '@id': SITE + '/#site', name: 'LunaVerta', url: SITE + '/', inLanguage: ['en', 'da'], publisher: { '@id': SITE + '/#org' } },
    { '@type': 'WebApplication', name: page.tool ? `LunaVerta · ${page.tool[lang].name}` : 'LunaVerta', url: page.url, inLanguage: lang,
      applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (runs in the browser)', browserRequirements: 'A modern web browser with JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'DKK' }, isAccessibleForFree: true, description: page.desc, publisher: { '@id': SITE + '/#org' },
      featureList: page.tool ? undefined : TOOLS.map(tl => tl[lang].name) },
    { '@type': 'FAQPage', inLanguage: lang, mainEntity: faqItems.map(it => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a.replace(/<[^>]+>/g, '') } })) }
  ];
  if (page.tool) {
    graph.push({ '@type': 'HowTo', name: page.tool[lang].h1, inLanguage: lang, totalTime: 'PT1M', step: page.tool[lang].steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })) });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: LABELS[lang].home, item: url(lang) },
      { '@type': 'ListItem', position: 2, name: page.tool[lang].name, item: page.url }] });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, (k, v) => (v === undefined ? undefined : v));
}

// ---------- pages ----------
const template = readFileSync('src/template.html', 'utf8');
function render(lang, page) {
  const other = lang === 'en' ? 'da' : 'en';
  const faq = faqSection(lang, page.tool && page.tool[lang].faq, page.tool && page.tool[lang].name);
  const L = LABELS[lang];
  const hero = page.tool
    ? `  <section class="hero">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${path(lang)}">${esc(L.home)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(page.tool[lang].name)}</span></nav>
    <h1>${esc(page.tool[lang].h1)}</h1>
    <p class="lead">${esc(page.tool[lang].lead)}</p>
  </section>`
    : `  <section class="hero">
    <h1>${esc(HOME[lang].h1)}</h1>
    <p class="lead">${esc(HOME[lang].lead)}</p>
  </section>`;
  const preset = page.tool ? page.tool.preset : '';
  const dock = !page.tool ? `<p data-i18n-html="dock.hint">${HOME[lang].dock}</p>`
    : `<p>${preset === 'merge' ? L.dockMerge : preset === 'edit' ? L.dockEdit : L.dock.replace('{t}', esc(label(lang, preset)))}</p>`;
  const vals = {
    LANG: lang, TITLE: esc(page.title), DESC: esc(page.desc), CANONICAL: page.url, HOME: path(lang),
    ALTERNATES: [`<link rel="alternate" hreflang="${lang}" href="${page.url}">`, `<link rel="alternate" hreflang="${other}" href="${page.alt}">`, `<link rel="alternate" hreflang="x-default" href="${lang === 'en' ? page.url : page.alt}">`].join('\n'),
    OG_LOCALE: lang === 'da' ? 'da_DK' : 'en_GB', OG_LOCALE_ALT: lang === 'da' ? 'en_GB' : 'da_DK',
    JSONLD: jsonLd(lang, page, faq.items).replace(/</g, '\\u003c'),
    EN_PRESSED: String(lang === 'en'), DA_PRESSED: String(lang === 'da'),
    HERO: hero, PRESET: preset, MODE: (page.tool && page.tool.mode) || '', DOCK_HINT: dock, REFGRID: refGrid(lang),
    HOWTO: page.tool ? howtoSection(lang, page.tool) : '', FAQ: faq.html, TOOLS: toolsSection(lang, page.tool && page.tool.id), ABOUT: aboutSection(lang),
    NOSCRIPT: esc(L.noscript), VERSION: '{{VERSION}}', BUILD_DATE: '{{BUILD_DATE}}'
  };
  let html = template.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vals ? vals[k] : m));
  return fillTexts(html, lang);
}

const pages = [];
for (const lang of LANGS) {
  const other = lang === 'en' ? 'da' : 'en';
  pages.push({ lang, file: lang === 'en' ? 'docs/index.html' : 'docs/da/index.html', url: url(lang), alt: url(other), title: HOME[lang].title, desc: HOME[lang].desc });
  for (const tool of TOOLS) pages.push({ lang, tool, file: `docs${path(lang, tool.slug[lang])}index.html`, url: url(lang, tool.slug[lang]), alt: url(other, tool.slug[other]), title: tool[lang].title, desc: tool[lang].desc });
}
for (const p of pages) { mkdirSync(dirname(p.file), { recursive: true }); writeFileSync(p.file, render(p.lang, p)); }

// ---------- sitemap.xml (with language alternates) ----------
const today = new Date().toISOString().slice(0, 10);
const extra = [{ loc: SITE + '/privacy.html' }, { loc: SITE + '/licenses.html' }];
writeFileSync('docs/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(p => `  <url><loc>${p.url}</loc><lastmod>${today}</lastmod><xhtml:link rel="alternate" hreflang="${p.lang}" href="${p.url}"/><xhtml:link rel="alternate" hreflang="${p.lang === 'en' ? 'da' : 'en'}" href="${p.alt}"/><xhtml:link rel="alternate" hreflang="x-default" href="${p.lang === 'en' ? p.url : p.alt}"/></url>`).join('\n')}
${extra.map(e => `  <url><loc>${e.loc}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);

// ---------- llms.txt (a plain summary for AI assistants) ----------
writeFileSync('docs/llms.txt', `# LunaVerta

> ${LABELS.en.aboutText}

LunaVerta is available in English (${SITE}/) and Danish (${SITE}/da/). It converts images (HEIC, JPG, PNG, WebP, AVIF, GIF, BMP, SVG), PDF, Word (DOCX), Markdown, text, HTML, spreadsheets (XLSX, XLS, ODS, CSV, TSV, JSON), audio (MP3, WAV, OGG, FLAC, M4A, AAC) and video (MP4, WebM, MOV). It also edits PDFs (correct text, add text, fill in forms, reorder, rotate and delete pages), merges, splits and compresses PDFs, and removes GPS location and other hidden data from photos without changing the image.

Key facts:
${LABELS.en.facts.map(([k, v]) => `- ${k}: ${v}`).join('\n')}
- Privacy: no uploads, no cookies, no tracking, no ads; fonts and libraries are self-hosted
- Not supported: video-to-video re-encoding (e.g. to MP4) and legacy .doc/.ppt files

## Tools (English)
${TOOLS.map(tl => `- [${tl.en.name}](${url('en', tl.slug.en)}): ${tl.en.desc}`).join('\n')}

## Værktøjer (dansk)
${TOOLS.map(tl => `- [${tl.da.name}](${url('da', tl.slug.da)}): ${tl.da.desc}`).join('\n')}

## About
- [Privacy](${SITE}/privacy.html): what is (not) stored and who is behind LunaVerta
- [Open-source licenses](${SITE}/licenses.html)
- [Source code](${REPO})
- Publisher: ${COMPANY.name}, ${COMPANY.street}, ${COMPANY.zip} ${COMPANY.city}, Denmark, CVR ${COMPANY.cvr}, ${COMPANY.email}
`);

// ---------- version stamp (content hash of everything except the pages themselves) ----------
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })('docs');
const h = createHash('sha256');
for (const f of files.sort()) if (!/\.html$|sw\.js$|sitemap\.xml$/.test(f)) h.update(f).update(readFileSync(f));
h.update(readFileSync('src/template.html')).update(readFileSync('scripts/site-content.mjs'));
const version = h.digest('hex').slice(0, 10);
const pkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const label7 = `v${pkgVersion}+${version.slice(0, 7)}`;
// Asset addresses carry the version, so a new page never runs with old CSS or
// scripts from a browser or offline cache.
const bust = html => html.replace(/((?:\/|")assets\/[\w.-]+\.(?:css|js))(?:\?v=\w+)?"/g, `$1?v=${version}"`);
for (const p of pages) writeFileSync(p.file, bust(readFileSync(p.file, 'utf8').replace('{{VERSION}}', label7).replace('{{BUILD_DATE}}', today)));
for (const f of ['docs/privacy.html', 'docs/licenses.html']) writeFileSync(f, bust(readFileSync(f, 'utf8')));
writeFileSync('docs/sw.js', readFileSync('docs/sw.js', 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`));
console.log(`Wrote ${pages.length} pages, sitemap.xml and llms.txt · ${label7}`);
