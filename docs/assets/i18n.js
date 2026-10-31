// LunaVerta language handling. Most pages are written in one language at build
// time (data-page-lang on <html>), with the other language at its own address;
// the switch goes there. Pages without a fixed language (privacy, licences)
// swap their texts in place.
(() => {
'use strict';
const STR = window.LV_STR;

const KEY = 'lunaverta-lang';
// Every language the site has pages in. A page only loads its own language's texts (plus English).
const SUPPORTED = ['en', 'da', 'sv', 'no', 'de'];
const browserLang = l => (/^(nb|nn|no)\b/i.test(l) ? 'no' : l.slice(0, 2).toLowerCase());
function detect() {
  try { const saved = localStorage.getItem(KEY); if (saved && SUPPORTED.includes(saved)) return saved; } catch (e) {}
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  for (const l of langs) { const c = browserLang(l); if (SUPPORTED.includes(c)) return c; }
  return 'en';
}
const pageLang = STR[document.documentElement.dataset.pageLang] ? document.documentElement.dataset.pageLang : null;
// The other language's address, on whatever host this page is served from.
const altUrl = l => { const a = document.querySelector(`link[rel="alternate"][hreflang="${l}"]`); return a ? new URL(a.href).pathname : null; };
// Pages without a fixed language (privacy, licences) only have English and Danish texts.
let lang = pageLang || (STR[detect()] ? detect() : 'en');
// A Danish (Swedish, Norwegian, German) browser arriving at an English page goes
// to its own language, unless the visitor has chosen a language. Never the other
// way round: search engines read pages with English settings and must see them all.
if (pageLang === 'en') {
  let saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  const want = detect();
  if (!saved && want !== 'en' && altUrl(want) && !navigator.webdriver) location.replace(altUrl(want));
}

function t(key, vars) {
  const d = STR[lang] || STR.en;
  let s;
  if (vars && typeof vars.n === 'number') s = d[key + (vars.n === 1 ? '.one' : '.other')] ?? STR.en[key + (vars.n === 1 ? '.one' : '.other')];
  if (s === undefined) s = d[key] ?? STR.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
}

// Static texts: data-i18n (text), data-i18n-html (trusted markup from above),
// data-i18n-attr="attr:key;attr:key". Blocks with data-lang show for one language.
function apply(root = document) {
  document.documentElement.lang = lang;
  const has = k => k in (STR[lang] || {}) || k in STR.en;
  const tx = k => (has(k) ? t(k) : null);
  // A missing text keeps what the page already says rather than showing its key.
  root.querySelectorAll('[data-i18n]').forEach(el => { const s = tx(el.dataset.i18n); if (s !== null) el.textContent = s; });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { const s = tx(el.dataset.i18nHtml); if (s !== null) el.innerHTML = s; });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(pair => { const [a, k] = pair.split(':'); const s = a && k && tx(k.trim()); if (s) el.setAttribute(a.trim(), s); }));
  root.querySelectorAll('[data-lang]').forEach(el => { el.hidden = el.dataset.lang !== lang; });
  // pages without a fixed language (privacy, licences): links to the front page go to this language's front page
  if (!pageLang) root.querySelectorAll('a[href="/"], a[data-home]').forEach(a => { a.dataset.home = '1'; a.setAttribute('href', lang === 'en' ? '/' : `/${lang}/`); });
  root.querySelectorAll('button[data-set-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
  const title = document.querySelector('[data-i18n-title]');
  if (title) document.title = title.dataset.i18nTitle === 'title' ? t('title') : t(title.dataset.i18nTitle) + ' · LunaVerta';
}
function setLang(l) {
  if (!SUPPORTED.includes(l)) return;
  try { localStorage.setItem(KEY, l); } catch (e) {}
  if (pageLang) { const u = altUrl(l); if (u && l !== pageLang) location.href = u; return; }
  if (l === lang || !STR[l]) return;
  lang = l;
  apply();
  document.dispatchEvent(new CustomEvent('lv-lang', { detail: l }));
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-set-lang]');
  if (b && b.tagName === 'A') { try { localStorage.setItem(KEY, b.dataset.setLang); } catch (x) {} return; } // a link in the language menu: remember, then follow it
  if (b) setLang(b.dataset.setLang);
  // the language menu closes when you click outside it
  document.querySelectorAll('details.lang-menu[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('details.lang-menu[open]').forEach(d => { d.open = false; d.querySelector('summary').focus(); }); });
// A one-time note that the site uses no cookies. Nothing to consent to: the
// only things stored are the visitor's own settings and the offline copy.
const NOTICE = 'lunaverta-notice';
function notice() {
  try { if (localStorage.getItem(NOTICE)) return; } catch (e) {}
  if (document.getElementById('cookieNote')) return;
  const el = document.createElement('div');
  el.id = 'cookieNote'; el.className = 'cookie-note'; el.setAttribute('role', 'region'); el.setAttribute('data-i18n-attr', 'aria-label:notice.aria');
  el.innerHTML = '<p><span data-i18n="notice.text"></span> <a href="/privacy.html" data-i18n="notice.more"></a></p><button type="button" class="btn sm primary" data-i18n="notice.ok"></button>';
  el.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem(NOTICE, '1'); } catch (e) {}
    el.remove();
  });
  document.body.appendChild(el);
}
// "Report a problem": a ready-made e-mail with the page and browser, nothing else
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('[data-report]'); if (!a) return;
  const v = (document.getElementById('buildVer') || {}).title || '';
  const body = t('report.body').replace('{url}', location.href.split('#')[0]).replace('{ua}', navigator.userAgent).replace('{v}', v);
  a.href = 'mailto:lee@midttech.com?subject=' + encodeURIComponent(t('report.subject')) + '&body=' + encodeURIComponent(body);
});
window.LV = { t, apply, setLang, get lang() { return lang; } };
function start() { apply(); } // no cookie note: the footer says it, and there is nothing to consent to
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
