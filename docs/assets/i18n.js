// LunaVerta texts in English and Danish. The page follows the browser's
// language (Danish for "da", English otherwise) until the visitor picks one.
(() => {
'use strict';
const STR = {
  en: {
    'title': 'LunaVerta · Private file converter',
    'tag': 'Drop files, pick a format from the ring, save the result. Everything converts on your own device.',
    'privacy.badge': 'Nothing is uploaded',
    'net.offline': 'Offline',
    'lang.label': 'Language',
    'files.h': 'Files to convert',
    'btn.clear': 'Clear',
    'dock.hint': '<strong>Drag files anywhere on the page.</strong> A ring of formats opens under your cursor. Drop on a format to convert straight away, or drop in the middle to keep them here. You can also paste files.',
    'btn.choose': 'Choose files',
    'convertAll': 'Convert all to',
    'opt.aria': 'Conversion settings',
    'opt.quality': 'Image quality',
    'opt.size': 'Longest side',
    'opt.keep': 'Keep original',
    'opt.kbps': 'MP3 bitrate',
    'opt.gif': 'GIF from video',
    'opt.gifN': 'First {n} s',
    'opt.merge': 'Merge images into one PDF',
    'opt.pdfq': 'Word to PDF',
    'opt.pdfq.best': 'Best quality',
    'opt.pdfq.small': 'Small file',
    'out.h': 'Converted',
    'out.empty': 'Converted files appear here, ready to save.',
    'out.saveAll': 'Save all as .zip',
    'out.zipping': 'Zipping…',
    'out.clear': 'Clear list',
    'out.converting': '{n} converting',
    'out.ready': '{n} ready',
    'ref.h': 'What converts to what',
    'ref.from': 'From',
    'ref.to': 'To',
    'faq.h': 'Questions',
    'faq.q1': 'Are my files uploaded anywhere?',
    'faq.a1': 'No. LunaVerta has no server that receives files. Every conversion runs in your browser, on your device, and the result is saved straight to your downloads.',
    'faq.q2': 'Does it work offline?',
    'faq.a2': 'Yes. After your first visit the app is stored on your device. Helpers for PDF, Word, Excel, MP3 and HEIC are saved the first time you use them, then work offline too.',
    'faq.q3': 'Can I install it?',
    'faq.a3': 'In Chrome, Edge and other Chromium browsers, click the install icon at the right end of the address bar. Once installed, you can open files with LunaVerta from your file manager. On iPhone and iPad, use Share, then Add to Home Screen.',
    'faq.q4': 'Is there a size limit?',
    'faq.a4': 'Only your device\'s memory. Large videos and long audio take longer and use more memory, so convert them a few at a time.',
    'faq.q5': 'What does it cost?',
    'faq.a5': 'Nothing. There are no accounts, ads, cookies or trackers.',
    'faq.q6': 'Can it remove the location from my photos?',
    'faq.a6': 'Yes. Choose <b>Clean</b> for a photo, and LunaVerta removes the GPS location, camera details and other hidden data without re-saving the image, so the quality stays the same.',
    'faq.q7': 'Why can\'t it convert video to MP4 or open DOC files?',
    'faq.a7': 'Those need large engines like FFmpeg and LibreOffice that are heavy to run in a browser. LunaVerta sticks to conversions that run quickly and reliably on any device.',
    'foot.tag': 'Free, private file conversion',
    'nav.converter': 'Converter',
    'nav.privacy': 'Privacy',
    'nav.licenses': 'Open-source licenses',
    'tray.empty': 'No files yet. Drop some here, paste them, or use Choose files.',
    'tray.remove': 'Remove {name}',
    'tray.drag': 'Drag to change the order',
    'ring.aria': 'Choose a format',
    'ring.file.one': 'file',
    'ring.file.other': 'files',
    'ring.convertTo': 'Convert to {t}',
    'job.converting': 'Converting',
    'job.save': 'Save',
    'job.saved': 'Saved',
    'job.dismiss': 'Dismiss',
    'job.files': 'files',
    'job.zip': '{n} files in a zip',
    'job.empty': 'Nothing came out of this conversion.',
    'job.failed': 'Something went wrong while converting this file.',
    'toast.unsupported': '{name} isn\'t a format LunaVerta can convert yet.',
    'toast.skipped.one': '1 file can\'t become {t} and was skipped.',
    'toast.skipped.other': '{n} files can\'t become {t} and were skipped.',
    'toast.pasted.one': 'Added 1 pasted file.',
    'toast.pasted.other': 'Added {n} pasted files.',
    'toast.mergeTwo': 'Merging needs at least two PDFs or images, including at least one PDF.',
    'toast.installed': 'LunaVerta is installed. You can open files with it from your computer.',
    'toast.updated': 'LunaVerta was updated. It will use the new version next time you open it.',
    'kind.image': 'Images', 'kind.pdf': 'PDF', 'kind.doc': 'Documents', 'kind.data': 'Spreadsheets & data', 'kind.audio': 'Audio', 'kind.video': 'Video',
    'note.image': 'HEIC photos from iPhones work too. Clean removes the location and other hidden data without losing quality.',
    'note.pdf': 'Merge PDFs (and images) into one, split into single pages, shrink, or turn pages into images or text.',
    'note.doc': 'Word to PDF keeps the page layout, fonts, colours, tables, images, headers and footers, and the text stays searchable.',
    'note.data': 'Workbooks with several sheets give one CSV per sheet.',
    'note.audio': 'Decoding uses your browser, so formats vary slightly by browser.',
    'note.video': 'Make a GIF from the opening seconds, pull the soundtrack, or grab a frame.',
    'tgt.merge': 'Merge', 'tgt.split': 'Split', 'tgt.shrink': 'Shrink', 'tgt.clean': 'Clean',
    'shrink.saved': '{p}% smaller',
    'shrink.kept': 'Already as small as it gets, so the original was kept',
    'clean.gps': 'Location and other hidden data removed',
    'clean.some': 'Hidden data removed',
    'clean.none': 'No hidden data found',
    'merge.name': 'merged',
    'err.lib.online': 'A helper for this conversion failed to load. Reload the page and try again.',
    'err.lib.offline': 'This conversion needs a helper that is not saved for offline use yet. Go online once and try again.',
    'err.write': 'Your browser cannot write {type}.',
    'err.heic.load': 'The HEIC helper could not be loaded.',
    'err.heic.none': 'This HEIC file contains no image LunaVerta can read.',
    'err.heic.decode': 'This HEIC photo could not be decoded.',
    'err.image': 'This image could not be read. It may be damaged, or your browser does not support the format.',
    'err.noSound': 'This video has no soundtrack your browser can read.',
    'err.audio': 'Your browser cannot decode this audio file.',
    'err.video': 'Your browser cannot play this video format, so it cannot be converted here.',
    'err.json': 'This JSON file has a syntax error, so it cannot be turned into a table.',
    'err.pdf.locked': 'This PDF is password-protected, so it cannot be changed.',
    'err.pdf.read': 'This PDF could not be read. It may be damaged.'
  },
  da: {
    'title': 'LunaVerta · Privat filkonvertering',
    'tag': 'Slip filer, vælg et format i ringen, og gem resultatet. Alt konverteres på din egen enhed.',
    'privacy.badge': 'Intet bliver uploadet',
    'net.offline': 'Offline',
    'lang.label': 'Sprog',
    'files.h': 'Filer der skal konverteres',
    'btn.clear': 'Ryd',
    'dock.hint': '<strong>Træk filer hen hvor som helst på siden.</strong> En ring med formater åbner under markøren. Slip på et format for at konvertere med det samme, eller slip i midten for at lægge filerne her. Du kan også indsætte filer.',
    'btn.choose': 'Vælg filer',
    'convertAll': 'Konvertér alle til',
    'opt.aria': 'Indstillinger for konvertering',
    'opt.quality': 'Billedkvalitet',
    'opt.size': 'Længste side',
    'opt.keep': 'Behold original',
    'opt.kbps': 'MP3-bitrate',
    'opt.gif': 'GIF fra video',
    'opt.gifN': 'Første {n} sek.',
    'opt.merge': 'Saml billeder i én PDF',
    'opt.pdfq': 'Word til PDF',
    'opt.pdfq.best': 'Bedste kvalitet',
    'opt.pdfq.small': 'Lille fil',
    'out.h': 'Konverteret',
    'out.empty': 'Konverterede filer vises her, klar til at blive gemt.',
    'out.saveAll': 'Gem alle som .zip',
    'out.zipping': 'Pakker…',
    'out.clear': 'Ryd listen',
    'out.converting': '{n} konverteres',
    'out.ready': '{n} klar',
    'ref.h': 'Hvad kan konverteres til hvad',
    'ref.from': 'Fra',
    'ref.to': 'Til',
    'faq.h': 'Spørgsmål',
    'faq.q1': 'Bliver mine filer uploadet?',
    'faq.a1': 'Nej. LunaVerta har ingen server, der modtager filer. Alle konverteringer sker i din browser, på din egen enhed, og resultatet gemmes direkte i dine overførsler.',
    'faq.q2': 'Virker det uden internet?',
    'faq.a2': 'Ja. Efter dit første besøg ligger appen på din enhed. Hjælpeværktøjerne til PDF, Word, Excel, MP3 og HEIC gemmes første gang, du bruger dem, og virker derefter også uden internet.',
    'faq.q3': 'Kan jeg installere den?',
    'faq.a3': 'I Chrome, Edge og andre Chromium-browsere klikker du på installationsikonet yderst til højre i adresselinjen. Når den er installeret, kan du åbne filer med LunaVerta direkte fra Stifinder. På iPhone og iPad bruger du Del og derefter Føj til hjemmeskærm.',
    'faq.q4': 'Er der en størrelsesgrænse?',
    'faq.a4': 'Kun din enheds hukommelse. Store videoer og lange lydfiler tager længere tid og bruger mere hukommelse, så konvertér gerne nogle få ad gangen.',
    'faq.q5': 'Hvad koster det?',
    'faq.a5': 'Ingenting. Der er ingen konti, reklamer, cookies eller sporing.',
    'faq.q6': 'Kan den fjerne placeringen fra mine billeder?',
    'faq.a6': 'Ja. Vælg <b>Rens</b> for et billede, så fjerner LunaVerta GPS-placering, kameraoplysninger og andre skjulte data uden at gemme billedet om, så kvaliteten er uændret.',
    'faq.q7': 'Hvorfor kan den ikke lave video om til MP4 eller åbne DOC-filer?',
    'faq.a7': 'Det kræver store programmer som FFmpeg og LibreOffice, der er tunge at køre i en browser. LunaVerta holder sig til konverteringer, der kører hurtigt og pålideligt på alle enheder.',
    'foot.tag': 'Gratis, privat filkonvertering',
    'nav.converter': 'Konverter',
    'nav.privacy': 'Privatliv',
    'nav.licenses': 'Open source-licenser',
    'tray.empty': 'Ingen filer endnu. Slip nogle her, indsæt dem, eller brug Vælg filer.',
    'tray.remove': 'Fjern {name}',
    'tray.drag': 'Træk for at ændre rækkefølgen',
    'ring.aria': 'Vælg et format',
    'ring.file.one': 'fil',
    'ring.file.other': 'filer',
    'ring.convertTo': 'Konvertér til {t}',
    'job.converting': 'Konverterer',
    'job.save': 'Gem',
    'job.saved': 'Gemt',
    'job.dismiss': 'Luk',
    'job.files': 'filer',
    'job.zip': '{n} filer i en zip',
    'job.empty': 'Konverteringen gav ikke noget resultat.',
    'job.failed': 'Noget gik galt under konverteringen af filen.',
    'toast.unsupported': '{name} er ikke et format, LunaVerta kan konvertere endnu.',
    'toast.skipped.one': '1 fil kan ikke blive til {t} og blev sprunget over.',
    'toast.skipped.other': '{n} filer kan ikke blive til {t} og blev sprunget over.',
    'toast.pasted.one': 'Tilføjede 1 indsat fil.',
    'toast.pasted.other': 'Tilføjede {n} indsatte filer.',
    'toast.mergeTwo': 'For at samle skal der være mindst to PDF\'er eller billeder, heraf mindst én PDF.',
    'toast.installed': 'LunaVerta er installeret. Du kan nu åbne filer med den fra din computer.',
    'toast.updated': 'LunaVerta er opdateret. Den nye version bruges, næste gang du åbner den.',
    'kind.image': 'Billeder', 'kind.pdf': 'PDF', 'kind.doc': 'Dokumenter', 'kind.data': 'Regneark og data', 'kind.audio': 'Lyd', 'kind.video': 'Video',
    'note.image': 'HEIC-billeder fra iPhone virker også. Rens fjerner placering og andre skjulte data uden at miste kvalitet.',
    'note.pdf': 'Saml PDF\'er (og billeder) i én, del op i enkelte sider, gør filen mindre, eller lav siderne om til billeder eller tekst.',
    'note.doc': 'Word til PDF bevarer sidelayout, skrifttyper, farver, tabeller, billeder, sidehoveder og sidefødder, og teksten kan stadig søges i.',
    'note.data': 'Projektmapper med flere ark giver én CSV pr. ark.',
    'note.audio': 'Afkodningen sker i din browser, så hvilke formater der virker, varierer lidt fra browser til browser.',
    'note.video': 'Lav en GIF af de første sekunder, træk lydsporet ud, eller gem et enkelt billede.',
    'tgt.merge': 'Saml', 'tgt.split': 'Del op', 'tgt.shrink': 'Mindre', 'tgt.clean': 'Rens',
    'shrink.saved': '{p} % mindre',
    'shrink.kept': 'Var allerede så lille som muligt, så originalen er beholdt',
    'clean.gps': 'Placering og andre skjulte data fjernet',
    'clean.some': 'Skjulte data fjernet',
    'clean.none': 'Ingen skjulte data fundet',
    'merge.name': 'samlet',
    'err.lib.online': 'Et hjælpeværktøj til denne konvertering kunne ikke indlæses. Genindlæs siden, og prøv igen.',
    'err.lib.offline': 'Denne konvertering kræver et hjælpeværktøj, der endnu ikke er gemt til brug uden internet. Gå online én gang, og prøv igen.',
    'err.write': 'Din browser kan ikke skrive {type}.',
    'err.heic.load': 'Hjælpeværktøjet til HEIC kunne ikke indlæses.',
    'err.heic.none': 'Denne HEIC-fil indeholder ikke et billede, LunaVerta kan læse.',
    'err.heic.decode': 'Dette HEIC-billede kunne ikke afkodes.',
    'err.image': 'Billedet kunne ikke læses. Det kan være beskadiget, eller din browser understøtter ikke formatet.',
    'err.noSound': 'Videoen har intet lydspor, din browser kan læse.',
    'err.audio': 'Din browser kan ikke afkode denne lydfil.',
    'err.video': 'Din browser kan ikke afspille dette videoformat, så det kan ikke konverteres her.',
    'err.json': 'JSON-filen har en syntaksfejl, så den kan ikke laves om til en tabel.',
    'err.pdf.locked': 'Denne PDF er beskyttet med adgangskode, så den kan ikke ændres.',
    'err.pdf.read': 'Denne PDF kunne ikke læses. Den kan være beskadiget.'
  }
};

const KEY = 'lunaverta-lang';
function detect() {
  try { const saved = localStorage.getItem(KEY); if (saved && STR[saved]) return saved; } catch (e) {}
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  return langs.some(l => /^da\b/i.test(l)) ? 'da' : 'en';
}
let lang = detect();

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
  if (!STR[l] || l === lang) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch (e) {}
  apply();
  document.dispatchEvent(new CustomEvent('lv-lang', { detail: l }));
}
document.addEventListener('click', e => { const b = e.target.closest('[data-set-lang]'); if (b) setLang(b.dataset.setLang); });
window.LV = { t, apply, setLang, get lang() { return lang; } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply()); else apply();
})();
