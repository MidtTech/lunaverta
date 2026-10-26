# LunaVerta

Free, private file conversion and PDF editing in the browser: [lunaverta.com](https://lunaverta.com)

Everything happens on your own device. Files are never uploaded, there are no accounts, cookies, trackers or ads, and it works offline once loaded. Available in English and Danish.

## What it does

- **Convert** images (including HEIC), PDFs, Word documents, spreadsheets, audio and video. Drop files on the page and pick a format from the ring.
- **Edit PDFs**: reorder, rotate and delete pages, add pages from other PDFs, correct or delete existing text, add text, fill in forms. Scroll through all pages and edit any of them.
- **Remove sensitive information**: suggestions for prices, VAT and payment details, CPR, account and card numbers, e-mails, phone numbers, addresses, dates and order numbers. Toggle each mark on the page, click any text or line to add it, drag a box over anything else, then save a new version. Removed text is deleted from the file, not just covered.
- **Black out** areas by hand, **protect** a PDF with a password (AES-256) or **unlock** one, **merge**, **split** and **compress** PDFs, and strip hidden data from PDFs and photos.

## How it is built

A static site with no server code: plain HTML, CSS and JavaScript, with self-hosted libraries (PDF.js, pdf-lib, qpdf, jsPDF, SheetJS, Mammoth, docx-preview, libheif, lamejs and others, see `docs/licenses.html` and `THIRD_PARTY_NOTICES.md`). A strict Content Security Policy lets pages connect only to their own site.

```
docs/                 the website (published as is)
src/template.html     page template
scripts/              build-pages.mjs (pages in both languages, sitemap, llms.txt, version),
                      site-content.mjs (page texts), vendor.mjs (copies libraries into docs/)
```

## Run and build

```
npm install
npm run build        # copies the libraries and writes all pages
npm run serve        # http://localhost:8080
```

Service workers only run on `localhost` or HTTPS, so open it through the server, not as a file.

## License

MIT, see `LICENSE`. The bundled libraries and fonts keep their own licenses.

Made by [Midt-Tech](https://midttech.com/), CVR 34256276.
