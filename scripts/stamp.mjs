// Gives the service worker a cache name derived from the site's contents,
// so every deploy with changed files replaces the old offline copy.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })('public');
const h = createHash('sha256');
for (const f of files.sort()) if (!f.endsWith('sw.js')) h.update(f).update(readFileSync(f));
const version = h.digest('hex').slice(0, 10);
const sw = readFileSync('public/sw.js', 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
writeFileSync('public/sw.js', sw);
console.log('Service worker cache version', version);
