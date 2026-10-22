// Gives the service worker a cache name derived from the site's contents,
// so every deploy with changed files replaces the old offline copy. The same
// hash is shown on the page itself (package.json version + short hash), so
// anyone looking at the live site can tell exactly which build they're on.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STAMPED = new Set(['docs\\sw.js', 'docs/sw.js', 'docs\\index.html', 'docs/index.html']);
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })('docs');
const h = createHash('sha256');
for (const f of files.sort()) if (!STAMPED.has(f)) h.update(f).update(readFileSync(f));
const version = h.digest('hex').slice(0, 10);

const sw = readFileSync('docs/sw.js', 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
writeFileSync('docs/sw.js', sw);

const pkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const buildDate = new Date().toISOString().slice(0, 10);
const html = readFileSync('docs/index.html', 'utf8').replace(
  /(<span id="buildVer"[^>]*>)[^<]*(<\/span>)/,
  `<span id="buildVer" title="Built ${buildDate}">v${pkgVersion}+${version.slice(0, 7)}</span>`
);
writeFileSync('docs/index.html', html);

console.log('Build version', `v${pkgVersion}+${version.slice(0, 7)}`, '/ service worker cache', version);
