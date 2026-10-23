// Copies the browser builds of every helper library and font into docs/,
// so the live site never loads anything from a third-party server.
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const nm = (...p) => join('node_modules', ...p);
const VENDOR = {
  'pdf.min.js': nm('pdfjs-dist/build/pdf.min.js'),
  'pdf.worker.min.js': nm('pdfjs-dist/build/pdf.worker.min.js'),
  'jspdf.umd.min.js': nm('jspdf/dist/jspdf.umd.min.js'),
  'jszip.min.js': nm('jszip/dist/jszip.min.js'),
  'xlsx.full.min.js': nm('xlsx/dist/xlsx.full.min.js'),
  'mammoth.browser.min.js': nm('mammoth/mammoth.browser.min.js'),
  'marked.min.js': nm('marked/marked.min.js'),
  'lame.min.js': nm('lamejs/lame.min.js'),
  'turndown.js': nm('turndown/dist/turndown.js'),
  'libheif.js': nm('libheif-js/libheif-wasm/libheif.js'),
  'libheif.wasm': nm('libheif-js/libheif-wasm/libheif.wasm'),
  'docx-preview.min.js': nm('docx-preview/dist/docx-preview.min.js'),
  'html2canvas.min.js': nm('html2canvas/dist/html2canvas.min.js')
};
const FONTS = [
  ['bricolage-grotesque', [500, 700]],
  ['ibm-plex-sans', [400, 500, 600]],
  ['ibm-plex-mono', [400, 500]]
];

mkdirSync('docs/vendor', { recursive: true });
mkdirSync('docs/fonts', { recursive: true });
for (const [out, src] of Object.entries(VENDOR)) copyFileSync(src, join('docs/vendor', out));
for (const [fam, weights] of FONTS)
  for (const w of weights)
    for (const sub of ['latin', 'latin-ext']) {
      const f = `${fam}-${sub}-${w}-normal.woff2`;
      copyFileSync(nm('@fontsource', fam, 'files', f), join('docs/fonts', f));
    }
console.log('Copied', Object.keys(VENDOR).length, 'libraries and fonts into docs/');
