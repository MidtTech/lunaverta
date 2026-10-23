// LunaVerta language handling. Most pages are written in one language at build
// time (data-page-lang on <html>), with the other language at its own address;
// the switch goes there. Pages without a fixed language (privacy, licences)
// swap their texts in place.
(() => {
'use strict';
const STR = window.LV_STR;

const KEY = 'lunaverta-lang';
function detect() {
  try { const saved = localStorage.getItem(KEY); if (saved && STR[saved]) return saved; } catch (e) {}
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  return langs.some(l => /^da\b/i.test(l)) ? 'da' : 'en';
}
const pageLang = STR[document.documentElement.dataset.pageLang] ? document.documentElement.dataset.pageLang : null;
// The other language's address, on whatever host this page is served from.
const altUrl = l => { const a = document.querySelector(`link[rel="alternate"][hreflang="${l}"]`); return a ? new URL(a.href).pathname : null; };
let lang = pageLang || detect();
// A Danish browser arriving at an English page goes to the Danish version,
// unless the visitor has chosen a language. Never the other way round: search
// engines read pages with English settings and must be able to see /da/.
if (pageLang === 'en') {
  let saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (!saved && detect() === 'da' && altUrl('da') && !navigator.webdriver) location.replace(altUrl('da'));
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
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(pair => { const [a, k] = pair.split(':'); if (a && k) el.setAttribute(a.trim(), t(k.trim())); }));
  root.querySelectorAll('[data-lang]').forEach(el => { el.hidden = el.dataset.lang !== lang; });
  root.querySelectorAll('[data-set-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
  const title = document.querySelector('[data-i18n-title]');
  if (title) document.title = title.dataset.i18nTitle === 'title' ? t('title') : t(title.dataset.i18nTitle) + ' · LunaVerta';
}
function setLang(l) {
  if (!STR[l]) return;
  try { localStorage.setItem(KEY, l); } catch (e) {}
  if (pageLang) { const u = altUrl(l); if (u && l !== pageLang) location.href = u; return; }
  if (l === lang) return;
  lang = l;
  apply();
  document.dispatchEvent(new CustomEvent('lv-lang', { detail: l }));
}
document.addEventListener('click', e => { const b = e.target.closest('[data-set-lang]'); if (b) setLang(b.dataset.setLang); });
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
window.LV = { t, apply, setLang, get lang() { return lang; } };
function start() { notice(); apply(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
