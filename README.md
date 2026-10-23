# LunaVerta

A private file converter that runs entirely in the browser. It also edits PDFs (reorder, rotate and delete pages, add text, fill in forms), merges, splits and shrinks PDFs, removes hidden location data from photos, and is available in English and Danish (following the browser's language, with a switch at the top). Drop files on a ring of formats and convert images, PDFs, Word documents, spreadsheets, audio and video. Nothing is uploaded, there are no cookies or trackers, and it works offline once loaded.

Live site (once deployed): https://lunaverta.com

## What's in the box

```
docs/                   ← the whole website. Deploy this folder, nothing else.
  index.html            converter
  privacy.html          GDPR-style privacy notice (no cookies, no uploads)
  licenses.html         open-source credits
  404.html
  assets/app.js, app.css, i18n.js (all texts in English and Danish), editor.js (PDF editor)
  vendor/               self-hosted helper libraries (PDF.js, jsPDF, SheetJS, Mammoth, lamejs, libheif …)
  fonts/                self-hosted fonts (no Google Fonts calls, which matters for GDPR)
  icons/, og.png        app icons, install screenshots and social-share image
  manifest.webmanifest  makes it installable, and lets the installed app open files from the OS
  sw.js                 service worker for offline use
  _headers              security and caching headers (Netlify, Cloudflare Pages)
  robots.txt, sitemap.xml
vercel.json             same headers for Vercel
netlify.toml            tells Netlify to publish docs/
scripts/                vendor.mjs (refresh libraries), stamp.mjs (cache version)
```

There is no build step and no server code. Any static host works.

## Before you go live

1. **Register the domain.** `lunaverta.com` showed no registration in the .com registry on 22 October 2026. Register it before anything else.
2. **Set up the privacy mailbox.** `docs/privacy.html` lists `privacy@lunaverta.com`. Create that address, or change it.
3. **If you use a different domain**, search and replace `lunaverta.com` in `docs/index.html`, `docs/robots.txt` and `docs/sitemap.xml`.
4. **Stamp the cache version** each time you change files: `npm run build` (or `node scripts/stamp.mjs`). This makes returning visitors pick up the new version.

## Run it locally

```
npm run serve        # http://localhost:8080
```

Service workers only run on `localhost` or HTTPS, so open it through the server, not as a file.

## Deploy

Pick one. All are free for a site this size and serve HTTPS automatically.

**Cloudflare Pages** (EU-friendly, fast everywhere)
1. Push this folder to a GitHub repository.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build command: leave empty. Build output directory: `docs`.
4. Add your custom domain under the project's Custom domains tab.
Or from the command line: `npx wrangler pages deploy docs --project-name lunaverta`

**Netlify**
1. Netlify → Add new site → Import from Git (it reads `netlify.toml`), or drag the `docs` folder onto app.netlify.com/drop.
2. Domain settings → Add custom domain.

**Vercel**
1. Vercel → Add New → Project → import the repository. It reads `vercel.json` (output directory `docs`).
2. Settings → Domains → add your domain.

**GitHub Pages** (current setup)
1. Push to the `main` branch.
2. Settings → Pages → Source: **Deploy from a branch**, Branch: `main`, folder: `/docs`, then Save.
3. Settings → Pages → Custom domain. GitHub Pages can't send custom headers, so the security policy comes from the `<meta>` tag in each page instead. Everything still works.

## Updating the libraries

Versions are pinned in `package.json`. To update:

```
npm install
npm run build        # copies fresh files into docs/vendor and docs/fonts, stamps the cache
```

Test HEIC, PDF, Word, Excel and MP3 conversions afterwards.

## Notes

- **Security policy:** scripts only load from the site itself. `'wasm-unsafe-eval'` is allowed so the HEIC decoder (WebAssembly) can run; plain `eval` is not.
- **Licenses:** LunaVerta's code is MIT. lamejs and libheif are LGPL-3.0 and are served as separate, unmodified files, which LGPL allows. See `THIRD_PARTY_NOTICES.md`.
- **Browser support:** current Chrome, Edge, Firefox and Safari. "Open with LunaVerta" from the file manager needs an installed app in Chrome or Edge on desktop.
- **Not included:** video-to-video re-encoding and legacy Office formats (DOC, PPT). Those need FFmpeg or LibreOffice, which are very heavy in a browser.
