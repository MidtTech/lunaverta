# Contributing to LunaVerta

Thanks for helping. A few things keep LunaVerta what it is:

- **Nothing leaves the device.** No change may send file contents, file names or usage data anywhere. No analytics, no third-party scripts, fonts or CDNs. Libraries are self-hosted in `docs/vendor` and copied there by `scripts/vendor.mjs`.
- **No framework, no backend.** Plain HTML, CSS and JavaScript, served as static files.
- **Every language at once.** Interface texts live in `docs/assets/strings.js` (English and Danish) and `docs/assets/strings-<code>.js`. A new text needs a key in every language file; missing keys fall back to English.

## Reporting a problem

Open an issue with the browser and device, what you did, and what happened. If a file is involved, please don't attach anything private: a small made-up file that shows the problem is perfect.

## Translations

Native speakers checking the Spanish and French texts are especially welcome. Page texts are in `scripts/lang/<code>.mjs`, guides in `scripts/guides-extra.mjs` and `scripts/guides-esfr.mjs`, interface texts in `docs/assets/strings-<code>.js`.

## Making a change

```
npm install
npm run build
npm test
```

Run the tests before opening a pull request, and keep pull requests small and focused. By contributing you agree that your contribution is licensed under the AGPL-3.0, like the rest of LunaVerta.
