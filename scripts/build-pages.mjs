// Writes every LunaVerta page as finished HTML in every language (English,
// Danish, and the extra languages in scripts/lang/):
// the front page, one page per tool, sitemap.xml and llms.txt. Search engines
// and AI crawlers read the text without running JavaScript.
// Run with: node scripts/build-pages.mjs  (npm run build does it too)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import vm from 'node:vm';
import { SITE, COMPANY, HOME, LABELS, TOOLS, KINDS, TOOL_TARGETS } from './site-content.mjs';
import { GUIDES, GUIDE_INDEX } from './guides.mjs';
import { GUIDE_TEXT, GUIDE_INDEX_EXTRA } from './guides-extra.mjs';
Object.assign(GUIDE_INDEX, GUIDE_INDEX_EXTRA);
for (const [L, texts] of Object.entries(GUIDE_TEXT)) for (const g of GUIDES) { if (!texts[g.id]) throw new Error(`${L}: no guide ${g.id}`); g[L] = texts[g.id]; }

// Extra languages: page texts in scripts/lang/<code>.mjs, interface texts in docs/assets/strings-<code>.js
const EXTRA = [];
for (const f of readdirSync('scripts/lang').filter(f => f.endsWith('.mjs')).sort()) EXTRA.push((await import('./lang/' + f)).default);
const ctx = { window: {} };
vm.runInNewContext(readFileSync('docs/assets/strings.js', 'utf8'), ctx);
for (const x of EXTRA) vm.runInNewContext(readFileSync(`docs/assets/strings-${x.code}.js`, 'utf8'), ctx);
const STR = ctx.window.LV_STR;
// Language facts: name in its own language, the code shown in the switch, Open Graph locale and date format
const META = {
  en: { name: 'English', og: 'en_GB' },
  da: { name: 'Dansk', og: 'da_DK' },
  ...Object.fromEntries(EXTRA.map(x => [x.code, { name: x.name, og: x.og }]))
};
for (const x of EXTRA) {
  HOME[x.code] = x.home; LABELS[x.code] = x.labels;
  for (const tl of TOOLS) {
    const tr = x.tools[tl.id]; if (!tr) throw new Error(`${x.code}: no text for tool ${tl.id}`);
    const { slug, ...rest } = tr; tl.slug[x.code] = slug; tl[x.code] = rest;
  }
}
const LANGS = ['en', 'da', ...EXTRA.map(x => x.code)];
const extra = code => EXTRA.find(x => x.code === code);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const t = (lang, key, vars) => { let s = STR[lang][key] ?? STR.en[key] ?? key; if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m); return s; };
const label = (lang, tg) => (TOOL_TARGETS.includes(tg) ? t(lang, 'tgt.' + tg) : tg).toUpperCase();
const path = (lang, slug) => (lang === 'en' ? '/' : `/${lang}/`) + (slug ? slug + '/' : '');
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
const chip = (lang, x) => TOOL_TARGETS.includes(x) ? `<span class="fmt tool">${esc(t(lang, 'tgt.' + x))}</span>` : `<span class="fmt">${esc(x.toUpperCase())}</span>`;
const refGrid = lang => Object.entries(KINDS).map(([id, k]) => `<div class="kind" style="--k:var(${k.color})"><h3>${esc(t(lang, 'kind.' + id))}</h3>
  <p class="note">${esc(t(lang, 'note.' + id))}</p>
  <div class="kind-row"><span class="kind-lbl">${esc(t(lang, 'ref.from'))}</span><span class="fmts from">${k.exts.map(e => `<span class="fmt">${esc(e.toUpperCase())}</span>`).join('')}</span></div>
  <div class="kind-row"><span class="kind-lbl">${esc(t(lang, 'ref.to'))}</span><span class="fmts to">${k.targets.map(x => chip(lang, x)).join('')}</span></div></div>`).join('');

const GENERAL_FAQ = [1, 2, 3, 4, 5, 9, 10, 6, 8]; // 7 (no MP4 / .doc) now lives in the format notes
function faqSection(lang, toolFaq, toolName) {
  const items = [...(toolFaq || []).map(([q, a]) => ({ q, a })), ...GENERAL_FAQ.filter(i => !toolFaq || [1, 2, 5, 9, 10].includes(i)).map(i => ({ q: t(lang, 'faq.q' + i), a: t(lang, 'faq.a' + i), key: i }))];
  const html = `  <section class="faq" aria-labelledby="h-faq">
    <h2 id="h-faq">${esc(toolName ? LABELS[lang].faqTool.replace('{name}', toolName) : t(lang, 'faq.h'))}</h2>
    <div class="faq-list">
${items.map((it, i) => `      <details${toolFaq && i === 0 ? ' open' : ''}><summary${it.key ? ` data-i18n="faq.q${it.key}"` : ''}>${esc(it.q)}</summary><p${it.key ? ` data-i18n-html="faq.a${it.key}"` : ''}>${it.key ? it.a : esc(it.a)}</p></details>`).join('\n')}
    </div>
  </section>`;
  return { html, items };
}
// All tools, grouped by what they work on, so the list can be scanned.
const TOOL_GROUPS = [
  ['pdf', '--c-doc', { en: 'PDF', da: 'PDF' }, ['edit-pdf', 'sign-pdf', 'fill-pdf-form', 'flatten-pdf', 'make-fillable-pdf', 'redact-pdf', 'remove-prices', 'merge-pdf', 'alternate-merge-pdf', 'split-pdf', 'extract-pages', 'delete-pages', 'remove-blank-pages', 'rotate-pdf', 'crop-pdf', 'compress-pdf', 'greyscale-pdf', 'page-numbers', 'pdf-booklet', 'watermark-pdf', 'pdf-header-footer', 'protect-pdf', 'unlock-pdf', 'repair-pdf', 'ocr', 'clean-pdf', 'edit-pdf-metadata', 'compare-pdf', 'pdf-to-word', 'pdf-to-excel', 'pdf-to-jpg', 'pdf-to-png', 'extract-images-from-pdf', 'pdf-to-text']],
  ['image', '--c-image', { en: 'Images', da: 'Billeder' }, ['heic-to-jpg', 'compress-image', 'resize-image', 'crop-image', 'images-to-pdf', 'scan-to-pdf', 'png-to-jpg', 'webp-to-jpg', 'remove-photo-location', 'qr-code-generator']],
  ['data', '--c-data', { en: 'Documents and data', da: 'Dokumenter og data' }, ['word-to-pdf', 'powerpoint-to-pdf', 'excel-to-pdf', 'excel-to-csv', 'csv-to-excel']],
  ['media', '--c-video', { en: 'Video and audio', da: 'Video og lyd' }, ['compress-video', 'video-to-gif', 'video-to-mp3']]
];
function toolsSection(lang, currentId) {
  const L = LABELS[lang];
  const grouped = new Set(TOOL_GROUPS.flatMap(g => g[3]));
  const rest = TOOLS.filter(tl => !grouped.has(tl.id)).map(tl => tl.id);
  const group = ([key, col, name, ids]) => `      <section class="tg tg-${key}" style="--k:var(${col})">
        <h3>${esc(name[lang] || extra(lang).groups[key])} <small>${ids.length}</small></h3>
        <ul class="tool-grid">
${ids.map(id => TOOLS.find(x => x.id === id)).filter(Boolean).map(tl => `          <li><a href="${path(lang, tl.slug[lang])}"${tl.id === currentId ? ' aria-current="page"' : ''}>${esc(tl[lang].name)}</a></li>`).join('\n')}
        </ul>
      </section>`;
  const g = TOOL_GROUPS.map(x => x[0] === 'pdf' && rest.length ? [x[0], x[1], x[2], [...x[3], ...rest]] : x);
  return `  <nav class="tools" aria-labelledby="h-tools">
    <h2 id="h-tools">${esc(L.tools)}</h2>
    <div class="tool-groups">
${group(g[0])}
${group(g[1])}
      <div class="tg-stack">
${group(g[2])}
${group(g[3])}
      </div>
    </div>
  </nav>`;
}
function aboutSection(lang) {
  const L = LABELS[lang];
  const last = L.facts.length - 1; // the last fact is who made it, linked to their site; the one before is the source code, linked to GitHub
  return `  <section class="about" aria-labelledby="h-about">
    <div class="about-text">
      <h2 id="h-about">${esc(L.about)}</h2>
      <p>${esc(L.aboutText)}</p>
    </div>
    <dl class="facts">
${L.facts.map(([k, v], i) => `      <div><dt>${esc(k)}</dt><dd>${i === last ? `<a href="${COMPANY.url}" target="_blank" rel="noopener">${esc(v)}</a>` : i === last - 1 ? `<a href="https://github.com/MidtTech/lunaverta" rel="noopener">${esc(v)}</a>` : esc(v)}</dd></div>`).join('\n')}
    </dl>
  </section>`;
}
// Short how-to videos (English voice, subtitles in every language), shown on their tool pages.
const VIDEO_FOR = { 'extract-pages': 'extract', 'crop-image': 'crop', 'scan-to-pdf': 'scan', 'edit-pdf': 'edit', 'remove-prices': 'redact', 'redact-pdf': 'redact', 'sign-pdf': 'sign', 'merge-pdf': 'merge' };
// Share image: the page's own one (docs/og/<lang>/<name>.jpg, made by make-share-images.mjs) when it exists, otherwise the site's
const ogFor = (lang, name) => { try { return `${SITE}/og/${lang}/${name}.jpg?v=` + createHash('sha1').update(readFileSync(`docs/og/${lang}/${name}.jpg`)).digest('hex').slice(0, 8); } catch (e) { return SITE + (lang === 'da' ? '/og-da.png' : '/og.png') + '?v=2'; } };
// a short fingerprint of each video file, so a changed video is fetched afresh instead of an old copy kept in the browser
const vv = f => { try { return '?v=' + createHash('sha1').update(readFileSync('docs/videos/' + f)).digest('hex').slice(0, 8); } catch (e) { return ''; } };
function videoFigure(lang, key, caption) {
  const vl = lang === 'da' ? 'da' : 'en'; // the videos exist in Danish and English; other languages get the English one
  // subtitles in every language, the page's own first and on by default
  const tracks = [lang, ...LANGS.filter(L => L !== lang)]
    .map((L, i) => `<track kind="subtitles" srclang="${L}" label="${META[L].name}" src="/videos/${key}.${L}.vtt${vv(`${key}.${L}.vtt`)}"${i === 0 ? ' default' : ''}>`).join('');
  return `<figure class="howto-video"><video controls playsinline preload="none" width="1280" height="720" poster="/videos/${key}-${vl}.jpg${vv(`${key}-${vl}.jpg`)}"><source src="/videos/${key}-${vl}.mp4${vv(`${key}-${vl}.mp4`)}" type="video/mp4">${tracks}</video>${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
}
function howtoSection(lang, tool) {
  const d = tool[lang], key = VIDEO_FOR[tool.id];
  return `  <section class="howto" aria-labelledby="h-howto">
    <h2 id="h-howto">${esc(LABELS[lang].howto.replace('{name}', d.name))}</h2>
    ${key ? videoFigure(lang, key, t(lang, 'howto.caption')) : ''}
    <ol>
${d.steps.map(s => `      <li>${esc(s)}</li>`).join('\n')}
    </ol>${GUIDE_INDEX[lang] && GUIDES[0][lang] ? GUIDES.filter(g => g.tool === tool.id).map(g => `\n    <p class="howto-guide">${esc(t(lang, 'howto.guide'))}${lang === 'fr' ? ' : ' : ': '}<a href="${path(lang, GUIDE_INDEX[lang].slug + '/' + g[lang].slug)}">${esc(g[lang].h1)}</a></p>`).join('') : ''}
  </section>`;
}

// The six tools most people come for, as big shortcuts on the front page.
const POPULAR = [
  ['edit-pdf', 'PDF', '--c-doc', { en: 'Fix text directly', da: 'Ret tekst direkte' }],
  ['redact-pdf', '■■', '--ink', { en: 'Remove text for good', da: 'Fjern tekst permanent' }],
  ['merge-pdf', '+', '--c-doc', { en: 'Join several files', da: 'Saml flere filer' }],
  ['compress-pdf', '↓', '--c-audio', { en: 'Smaller file for e-mail', da: 'Mindre fil til mail' }],
  ['heic-to-jpg', 'JPG', '--c-image', { en: 'Photos from iPhone', da: 'Billeder fra iPhone' }],
  ['pdf-to-jpg', 'IMG', '--c-image', { en: 'Every page as a picture', da: 'Hver side som billede' }]
];
function popularSection(lang) {
  return `  <nav class="pop" aria-labelledby="h-pop">
    <h2 id="h-pop"><span data-i18n="pop.h">${esc(t(lang, 'pop.h'))}</span> <small data-i18n="pop.sub">${esc(t(lang, 'pop.sub'))}</small><span class="pop-links"><button type="button" class="pop-watch" data-howto="${lang}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/></svg>${esc(t(lang, 'howto.watch'))}</button><a class="pop-all" href="#h-tools">${esc(t(lang, 'pop.all', { n: TOOLS.length }))} ↓</a></span></h2>
    <ul class="pop-grid">
${POPULAR.map(([id, ico, col, line]) => { const tl = TOOLS.find(x => x.id === id); return `      <li><a href="${path(lang, tl.slug[lang])}"><span class="pop-ico" style="--k:var(${col})" aria-hidden="true">${ico}</span><b>${esc(tl[lang].name)}</b><span>${esc(line[lang] || extra(lang).popular[id])}</span></a></li>`; }).join('\n')}
    </ul>
  </nav>`;
}

const RECIPE_IDS = [['photos-pdf'], ['share-photos'], ['pdf-send'], ['scan-search'], ['docs-one-pdf']];
function recipesSection(lang) {
  return `\n  <section class="recipes" aria-labelledby="h-rec">
    <h2 id="h-rec"><span data-i18n="recipe.h">${esc(t(lang, 'recipe.h'))}</span> <small data-i18n="recipe.sub">${esc(t(lang, 'recipe.sub'))}</small></h2>
    <ul class="rec-grid">
${RECIPE_IDS.map(([id]) => `      <li><button type="button" data-recipe="${id}"><b data-i18n="recipe.${id}.t">${esc(t(lang, 'recipe.' + id + '.t'))}</b><span data-i18n="recipe.${id}.d">${esc(t(lang, 'recipe.' + id + '.d'))}</span></button></li>`).join('\n')}
    </ul>
  </section>`;
}

// ---------- structured data ----------
const DAY = new Date().toISOString().slice(0, 10); // the build date, used as dateModified
// The price is 0 everywhere; the currency follows the page's country, which also tells search engines who the page is for.
const CURRENCY = { en: 'EUR', da: 'DKK', sv: 'SEK', no: 'NOK', de: 'EUR', es: 'EUR', fr: 'EUR' };
const ENGLISH_NAME = { en: 'English', da: 'Danish', sv: 'Swedish', no: 'Norwegian', de: 'German', es: 'Spanish', fr: 'French' };
const org = { '@type': 'Organization', '@id': SITE + '/#org', name: COMPANY.name, url: COMPANY.url, email: COMPANY.email, vatID: 'DK' + COMPANY.cvr,
  address: { '@type': 'PostalAddress', addressLocality: COMPANY.city, addressCountry: COMPANY.country },
  areaServed: 'Worldwide', knowsLanguage: LANGS, brand: { '@type': 'Brand', name: 'LunaVerta' } };
function jsonLd(lang, page, faqItems) {
  const graph = [org,
    { '@type': 'WebSite', '@id': SITE + '/#site', name: 'LunaVerta', url: SITE + '/', inLanguage: LANGS, publisher: { '@id': SITE + '/#org' } },
    { '@type': 'WebApplication', name: page.tool ? `LunaVerta · ${page.tool[lang].name}` : 'LunaVerta', url: page.url, inLanguage: lang,
      applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (runs in the browser)', browserRequirements: 'A modern web browser with JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: CURRENCY[lang] || 'EUR' }, isAccessibleForFree: true, description: page.desc, publisher: { '@id': SITE + '/#org' },
      dateModified: DAY, image: page.tool ? ogFor(lang, page.tool.slug[lang]) : undefined, isPartOf: { '@id': SITE + '/#site' },
      license: 'https://www.gnu.org/licenses/agpl-3.0.html', sameAs: 'https://github.com/MidtTech/lunaverta',
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
// The language menu: real links to the same page in each language
function langMenu(lang, page) {
  return `<details class="lang-menu"><summary><span class="sr-only" data-i18n="lang.label">Language</span> <span lang="${lang}">${lang.toUpperCase()}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></summary>
          <ul>${LANGS.map(L => `<li><a href="${new URL(page.alts[L]).pathname}" hreflang="${L}" lang="${L}" data-set-lang="${L}"${L === lang ? ' aria-current="true"' : ''}><b>${L.toUpperCase()}</b>${esc(META[L].name)}</a></li>`).join('')}</ul></details>`;
}
function render(lang, page) {
  const faq = faqSection(lang, page.tool && page.tool[lang].faq, page.tool && page.tool[lang].name);
  const L = LABELS[lang];
  const hero = page.tool
    ? `  <section class="hero" aria-labelledby="h-page">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${path(lang)}">${esc(L.home)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(page.tool[lang].name)}</span></nav>
    <h1 id="h-page">${esc(page.tool[lang].h1)}</h1>
    <p class="lead">${esc(page.tool[lang].lead)}</p>
  </section>`
    : `  <section class="hero" aria-labelledby="h-page">
    <h1 id="h-page">${esc(HOME[lang].h1)}</h1>
    <p class="lead">${esc(HOME[lang].lead)}</p>
  </section>`;
  const preset = page.tool ? page.tool.preset : '';
  const dock = !page.tool ? ''
    : `<p class="dock-sub">${preset === 'merge' ? L.dockMerge : preset === 'compare' ? L.dockCompare : (preset === 'edit' || preset === 'redact' || preset === 'prices') ? L.dockEdit : L.dockDo[preset] ? L.dockAct.replace('{d}', esc(L.dockDo[preset])) : L.dock.replace('{t}', esc(label(lang, preset === 'docx' ? 'Word' : preset)))}</p>`;
  const vals = {
    LANG: lang, TITLE: esc(page.title), DESC: esc(page.desc), CANONICAL: page.url, HOME: path(lang),
    ALTERNATES: [...LANGS.map(L => `<link rel="alternate" hreflang="${L}" href="${page.alts[L]}">`), `<link rel="alternate" hreflang="x-default" href="${page.alts.en}">`].join('\n'),
    OG_IMAGE: page.tool ? ogFor(lang, page.tool.slug[lang]) : SITE + (lang === 'da' ? '/og-da.png' : '/og.png') + '?v=2',
    OG_LOCALE: META[lang].og, OG_LOCALE_ALT: LANGS.filter(L => L !== lang).map(L => META[L].og).join('">\n<meta property="og:locale:alternate" content="'),
    LANG_MENU: langMenu(lang, page), LANG_STRINGS: extra(lang) ? `\n<script src="/assets/strings-${lang}.js"></script>` : '',
    JSONLD: jsonLd(lang, page, faq.items).replace(/</g, '\\u003c'),
    HERO: hero, PRESET: preset, MODE: (page.tool && page.tool.mode) || '', DOCK_HINT: dock, REFGRID: refGrid(lang),
    // the coffee button (MobilePay) on every page; the English text says it only works in Denmark
    COFFEE: `    <button type="button" class="coffee" data-coffee><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c0 1.2 1 1.4 1 2.6M12 3c0 1.2 1 1.4 1 2.6"/></svg><span data-i18n="coffee.btn">Buy us a coffee</span></button>\n`,
    POPULAR: page.tool ? '' : popularSection(lang), RECIPES: page.tool ? '' : recipesSection(lang),
    REFSUM: esc(t(lang, 'ref.sum', { n: new Set(Object.values(KINDS).flatMap(k => k.exts)).size, m: new Set(Object.values(KINDS).flatMap(k => k.targets)).size })),
    HOWTO: page.tool ? howtoSection(lang, page.tool) : '', FAQ: faq.html, TOOLS: toolsSection(lang, page.tool && page.tool.id), ABOUT: aboutSection(lang),
    GUIDES_URL: path(lang, GUIDE_INDEX[lang].slug), NOSCRIPT: esc(L.noscript), VERSION: '{{VERSION}}', BUILD_DATE: '{{BUILD_DATE}}'
  };
  let html = template.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vals ? vals[k] : m));
  return fillTexts(html, lang);
}

const pages = [];
for (const lang of LANGS) {
  pages.push({ lang, file: `docs${path(lang)}index.html`, url: url(lang), alts: Object.fromEntries(LANGS.map(L => [L, url(L)])), title: HOME[lang].title, desc: HOME[lang].desc });
  for (const tool of TOOLS) pages.push({ lang, tool, file: `docs${path(lang, tool.slug[lang])}index.html`, url: url(lang, tool.slug[lang]), alts: Object.fromEntries(LANGS.map(L => [L, url(L, tool.slug[L])])), title: tool[lang].title, desc: tool[lang].desc });
}
for (const p of pages) { mkdirSync(dirname(p.file), { recursive: true }); writeFileSync(p.file, render(p.lang, p)); }

// ---------- guides (English and Danish): short how-tos for everyday jobs, each pointing to its tool ----------
const GLANGS = Object.keys(GUIDE_INDEX); // every language with guides
const toolUrl = (lang, id) => { const tl = TOOLS.find(x => x.id === id); return path(lang, tl.slug[lang]); };
const gPath = (lang, slug) => path(lang, GUIDE_INDEX[lang].slug + (slug ? '/' + slug : ''));
const headPart = template.slice(0, template.indexOf('<body>'));
const headerPart = template.slice(template.indexOf('<div class="wrap">'), template.indexOf('</header>') + '</header>'.length)
  .replace(/<nav class="head-nav"[\s\S]*?<\/nav>/, `<nav class="head-nav" aria-label="Sections"><a href="{{HOME}}#h-tools" data-i18n="nav.tools">All tools</a><a href="{{GUIDES}}">{{GUIDES_LABEL}}</a></nav>`);
const footerPart = template.slice(template.indexOf('  <footer>'), template.indexOf('</footer>') + '</footer>'.length);
function guideHtml(lang, g, main, ld) {
  const alts = g.alts;
  const vals = {
    LANG: lang, TITLE: esc(g.title), DESC: esc(g.desc), CANONICAL: SITE + g.path, HOME: path(lang), GUIDES: gPath(lang), GUIDES_LABEL: esc(GUIDE_INDEX[lang].guides),
    ALTERNATES: [...GLANGS.map(L => `<link rel="alternate" hreflang="${L}" href="${SITE + alts[L]}">`), `<link rel="alternate" hreflang="x-default" href="${SITE + alts.en}">`].join('\n'),
    OG_IMAGE: g.og ? ogFor(lang, g.og) : SITE + (lang === 'da' ? '/og-da.png' : '/og.png') + '?v=2', OG_LOCALE: META[lang].og, OG_LOCALE_ALT: GLANGS.filter(L => L !== lang).map(L => META[L].og).join('">\n<meta property="og:locale:alternate" content="'),
    LANG_MENU: `<details class="lang-menu"><summary><span class="sr-only" data-i18n="lang.label">Language</span> <span lang="${lang}">${lang.toUpperCase()}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></summary>
          <ul>${GLANGS.map(L => `<li><a href="${alts[L]}" hreflang="${L}" lang="${L}" data-set-lang="${L}"${L === lang ? ' aria-current="true"' : ''}><b>${L.toUpperCase()}</b>${esc(META[L].name)}</a></li>`).join('')}</ul></details>`,
    JSONLD: JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, ...ld] }).replace(/</g, '\\u003c'),
    COFFEE: '', GUIDES_URL: gPath(lang), VERSION: '{{VERSION}}', BUILD_DATE: '{{BUILD_DATE}}'
  };
  const html = `${headPart}<body>\n<a class="skip" href="#main" data-i18n="skip">Skip to content</a>\n${headerPart}\n  <main class="prose guide" id="main" tabindex="-1">\n${main}\n  </main>\n${footerPart}\n</div>\n<script src="/assets/strings.js"></script>${extra(lang) ? `\n<script src="/assets/strings-${lang}.js"></script>` : ''}\n<script src="/assets/i18n.js"></script>\n</body>\n</html>\n`;
  return fillTexts(html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vals ? vals[k] : m)), lang);
}
const guidePages = [];
for (const lang of GLANGS) {
  const I = GUIDE_INDEX[lang], links = { merge: toolUrl(lang, 'merge-pdf'), compress: toolUrl(lang, 'compress-pdf') };
  const crumbs = extra => `    <nav class="crumbs" aria-label="Breadcrumb"><a href="${path(lang)}">${esc(LABELS[lang].home)}</a> <span aria-hidden="true">›</span> ${extra}</nav>`;
  for (const g of GUIDES) {
    const d = g[lang], tool = toolUrl(lang, g.tool), fill = x => x.replace(/\{t:([a-z-]+)\}/g, (m, id) => toolUrl(lang, id)).replace(/\{(tool|merge|compress)\}/g, (m, k) => (k === 'tool' ? tool : links[k]));
    const body = d.body.map(b => typeof b === 'string' ? `    <p>${fill(b)}</p>` : b.h ? `    <h2>${esc(b.h)}</h2>` : b.ol ? `    <ol>${b.ol.map(x => `<li>${fill(x)}</li>`).join('')}</ol>` : `    <ul>${b.ul.map(x => `<li>${fill(x)}</li>`).join('')}</ul>`).join('\n');
    const others = GUIDES.filter(o => o !== g).map(o => `<li><a href="${gPath(lang, o[lang].slug)}">${esc(o[lang].h1)}</a></li>`).join('');
    const main = `${crumbs(`<a href="${gPath(lang)}">${esc(I.guides)}</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(d.h1)}</span>`)}
    <h1>${esc(d.h1)}</h1>
    <p class="lead">${esc(d.lead)}</p>
${body}
    <p><a class="btn primary" href="${tool}">${esc(I.open)}${lang === 'fr' ? ' : ' : ': '}${esc(TOOLS.find(x => x.id === g.tool)[lang].name)}</a></p>
    <h2>${esc(I.all)}</h2>
    <ul class="guide-more">${others}</ul>`;
    const steps = (d.body.find(b => b.ol) || { ol: [] }).ol.map((x, i) => ({ '@type': 'HowToStep', position: i + 1, text: x.replace(/<[^>]+>/g, '') }));
    const pg = { path: gPath(lang, d.slug), og: 'guide-' + d.slug, title: d.title, desc: d.desc, alts: Object.fromEntries(GLANGS.map(L => [L, gPath(L, g[L].slug)])) };
    const ld = [{ '@type': 'Article', headline: d.h1, description: d.desc, inLanguage: lang, dateModified: DAY, mainEntityOfPage: SITE + pg.path,
        image: ogFor(lang, pg.og), author: { '@id': SITE + '/#org' }, publisher: { '@id': SITE + '/#org' }, about: { '@type': 'WebApplication', name: 'LunaVerta · ' + TOOLS.find(x => x.id === g.tool)[lang].name, url: SITE + tool } },
      { '@type': 'HowTo', name: d.h1, description: d.desc, inLanguage: lang, step: steps },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: LABELS[lang].home, item: url(lang) }, { '@type': 'ListItem', position: 2, name: I.guides, item: SITE + gPath(lang) }, { '@type': 'ListItem', position: 3, name: d.h1, item: SITE + pg.path }] }];
    guidePages.push({ file: `docs${pg.path}index.html`, html: guideHtml(lang, pg, main, ld), url: SITE + pg.path, alts: Object.fromEntries(GLANGS.map(L => [L, SITE + pg.alts[L]])) });
  }
  const idx = { path: gPath(lang), title: I.title, desc: I.desc, alts: Object.fromEntries(GLANGS.map(L => [L, gPath(L)])) };
  const main = `${crumbs(`<span aria-current="page">${esc(I.guides)}</span>`)}
    <h1>${esc(I.h1)}</h1>
    <p class="lead">${esc(I.lead)}</p>
    <ul class="guide-list">${GUIDES.map(g => `<li><a href="${gPath(lang, g[lang].slug)}"><b>${esc(g[lang].h1)}</b><span>${esc(g[lang].lead)}</span></a></li>`).join('')}</ul>`;
  guidePages.push({ file: `docs${idx.path}index.html`, html: guideHtml(lang, idx, main, [{ '@type': 'CollectionPage', name: I.h1, inLanguage: lang, url: SITE + idx.path }]), url: SITE + idx.path, alts: Object.fromEntries(GLANGS.map(L => [L, SITE + idx.alts[L]])) });
}
for (const p of guidePages) { mkdirSync(dirname(p.file), { recursive: true }); writeFileSync(p.file, p.html); }

// ---------- sitemap.xml (with language alternates) ----------
const today = DAY;
const staticPages = [{ loc: SITE + '/no-upload.html' }, { loc: SITE + '/privacy.html' }, { loc: SITE + '/licenses.html' }];
writeFileSync('docs/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(p => `  <url><loc>${p.url}</loc><lastmod>${today}</lastmod>${LANGS.map(L => `<xhtml:link rel="alternate" hreflang="${L}" href="${p.alts[L]}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${p.alts.en}"/></url>`).join('\n')}
${guidePages.map(p => `  <url><loc>${p.url}</loc><lastmod>${today}</lastmod>${GLANGS.map(L => `<xhtml:link rel="alternate" hreflang="${L}" href="${p.alts[L]}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${p.alts.en}"/></url>`).join('\n')}
${staticPages.map(e => `  <url><loc>${e.loc}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);

// ---------- llms.txt (a plain summary for AI assistants) ----------
writeFileSync('docs/llms.txt', `# LunaVerta

> ${LABELS.en.aboutText}

LunaVerta is available in ${LANGS.map(L => `${ENGLISH_NAME[L] || META[L].name} (${url(L)})`).join(', ')}. It converts images (HEIC, JPG, PNG, WebP, AVIF, GIF, BMP, SVG), PDF, Word (DOCX), Markdown, text, HTML, spreadsheets (XLSX, XLS, ODS, CSV, TSV, JSON), audio (MP3, WAV, OGG, FLAC, M4A, AAC) and video (MP4, WebM, MOV). It also edits PDFs (correct text, add text, fill in forms, reorder, rotate and delete pages), merges, splits and compresses PDFs, and removes GPS location and other hidden data from photos without changing the image.

Key facts:
${LABELS.en.facts.map(([k, v]) => `- ${k}: ${v}`).join('\n')}
- Privacy: no uploads, no cookies, no tracking, no ads; fonts and libraries are self-hosted
- Source code: https://github.com/MidtTech/lunaverta (AGPL-3.0), so the no-upload claim can be checked
- Not supported: converting between video formats (only making MP4/MOV videos smaller, GIFs, sound and still frames), and legacy .doc/.ppt files (save them as .docx/.pptx first)
- Full details of every tool (steps and questions): ${SITE}/llms-full.txt

## Tools (English)
${TOOLS.map(tl => `- [${tl.en.name}](${url('en', tl.slug.en)}): ${tl.en.desc}`).join('\n')}

## Værktøjer (dansk)
${TOOLS.map(tl => `- [${tl.da.name}](${url('da', tl.slug.da)}): ${tl.da.desc}`).join('\n')}
${EXTRA.map(x => `
## ${x.toolsHeading}
${TOOLS.map(tl => `- [${tl[x.code].name}](${url(x.code, tl.slug[x.code])}): ${tl[x.code].desc}`).join('\n')}
`).join('')}
## Guides
${GUIDES.map(g => `- [${g.en.h1}](${SITE}${gPath('en', g.en.slug)})` + GLANGS.filter(L => L !== 'en').map(L => ` · [${g[L].h1}](${SITE}${gPath(L, g[L].slug)})`).join('')).join('\n')}

## About
- [Why nothing is uploaded](${SITE}/no-upload.html): how files are processed on the device, and how to check it yourself
- [Privacy](${SITE}/privacy.html): what is (not) stored and who is behind LunaVerta
- [Open-source licenses](${SITE}/licenses.html)
- Publisher: ${COMPANY.name}, ${COMPANY.city}, Denmark, CVR ${COMPANY.cvr}, ${COMPANY.email}
`);

// ---------- version stamp (content hash of everything except the pages themselves) ----------
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })('docs');
const h = createHash('sha256');
for (const f of files.sort()) if (!/\.html$|sw\.js$|sitemap\.xml$|\.min\.(js|css)$/.test(f)) h.update(f).update(readFileSync(f));
h.update(readFileSync('src/template.html')).update(readFileSync('scripts/site-content.mjs'));
const version = h.digest('hex').slice(0, 10);
const pkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const label7 = `v${pkgVersion}+${version.slice(0, 7)}`;
// Asset addresses carry the version, so a new page never runs with old CSS or
// scripts from a browser or offline cache.
// Compact copies of the scripts and styles (name.min.js / name.min.css next to the originals, which stay readable).
// Whitespace and syntax only: function names are kept, so error reports still say where something went wrong.
// Without esbuild installed, the pages simply use the originals.
let MIN = new Set();
try {
  const { transformSync } = await import('esbuild');
  for (const f of readdirSync('docs/assets').filter(f => /\.(js|css)$/.test(f) && !/\.min\./.test(f))) {
    const src = readFileSync('docs/assets/' + f, 'utf8'), loader = f.endsWith('.css') ? 'css' : 'js';
    const out = transformSync(src, { loader, minifyWhitespace: true, minifySyntax: true, legalComments: 'none', target: loader === 'js' ? 'es2020' : undefined }).code;
    writeFileSync('docs/assets/' + f.replace(/\.(js|css)$/, '.min.$1'), out); MIN.add(f);
  }
} catch (e) { console.warn('No esbuild: pages use the full scripts (' + e.message.split('\n')[0] + ')'); MIN = new Set(); }
const minName = f => (MIN.has(f.split('/').pop()) ? f.replace(/\.(js|css)$/, '.min.$1') : f);
const bust = html => html.replace(/((?:\/|")assets\/[\w.-]+\.(?:css|js))(?:\?v=\w+)?"/g, (m, a) => `${minName(a.replace(/\.min\.(js|css)$/, '.$1'))}?v=${version}"`);
// Old addresses that moved: a tiny page that sends visitors (and search engines) to the new one.
const MOVED = { 'da/overstreg-pdf': '/da/anonymiser-pdf/' };
for (const [from, to] of Object.entries(MOVED)) {
  mkdirSync(`docs/${from}`, { recursive: true });
  writeFileSync(`docs/${from}/index.html`, `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>LunaVerta</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}${to}"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p><a href="${to}">${SITE}${to}</a></p></body></html>\n`);
}
for (const p of [...pages, ...guidePages]) writeFileSync(p.file, bust(readFileSync(p.file, 'utf8').replace('{{VERSION}}', label7).replace('{{BUILD_DATE}}', today)));
for (const f of ['docs/privacy.html', 'docs/licenses.html', 'docs/no-upload.html', 'docs/404.html']) writeFileSync(f, bust(readFileSync(f, 'utf8')));
writeFileSync('docs/sw.js', readFileSync('docs/sw.js', 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
  .replace(/'assets\/([\w-]+)(?:\.min)?\.(js|css)'/g, (m, n, x) => `'assets/${minName(n + '.' + x)}'`));
// ---------- llms-full.txt: every tool and guide in full (English), for AI assistants that want the details ----------
const plain = x => String(x).replace(/<[^>]+>/g, '').replace(/\{(?:t:[a-z-]+|tool|merge|compress)\}/g, '').replace(/\s+/g, ' ').trim();
writeFileSync('docs/llms-full.txt', `# LunaVerta: full reference

> ${LABELS.en.aboutText}

This file describes every LunaVerta tool and guide in full. The short version is ${SITE}/llms.txt. Every tool page also exists in ${LANGS.filter(L => L !== 'en').map(L => ENGLISH_NAME[L]).join(', ')}; the addresses are listed in llms.txt.

## How LunaVerta works
- Files are opened, converted and saved by the browser on the user's own device. LunaVerta has no server that receives files, so nothing is uploaded. This can be checked by going offline or watching the browser's network tab.
- No account, no cookies, no tracking, no ads. Free to use.
- Works offline after the first visit; some tools fetch a helper library (for example OCR language data) the first time they are used.
- Large files are limited only by the memory of the user's device.
- Made and run by ${COMPANY.name}, ${COMPANY.city}, Denmark (CVR ${COMPANY.cvr}). Contact: ${COMPANY.email}.

## Tools
${TOOLS.map(tl => { const d = tl.en; return `
### ${d.name}
${url('en', tl.slug.en)}

${d.lead}

Steps:
${d.steps.map((x, i) => `${i + 1}. ${plain(x)}`).join('\n')}
${d.faq && d.faq.length ? `
Questions:
${d.faq.map(([q, an]) => `- ${q} ${plain(an)}`).join('\n')}` : ''}`; }).join('\n')}

## Guides
${GUIDES.map(g => { const d = g.en; return `
### ${d.h1}
${SITE}${gPath('en', d.slug)}

${d.lead}

${d.body.map(b => typeof b === 'string' ? plain(b) : b.h ? `${b.h}:` : (b.ol || b.ul).map((x, i) => `${b.ol ? (i + 1) + '.' : '-'} ${plain(x)}`).join('\n')).join('\n')}`; }).join('\n')}
`);

console.log(`Wrote ${pages.length} pages, sitemap.xml and llms.txt · ${label7}`);
