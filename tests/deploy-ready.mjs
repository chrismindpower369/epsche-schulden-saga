/* ============================================================
   Wartet, bis GitHub Pages genau die Bytes dieses Checkouts
   ausliefert — die manuelle Prüfung ("jede Datei aus index.html
   byte-identisch zum Commit") als Skript.

   Kein API-Token nötig: verglichen werden die ausgelieferten Bytes.
   Aufruf: node tests/deploy-ready.mjs   (cwd = Repo-Wurzel)
   ============================================================ */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const BASE = process.env.LIVE_URL || 'https://chrismindpower369.github.io/epsche-schulden-saga';
const TIMEOUT_MS = Number(process.env.DEPLOY_TIMEOUT_MS || 8 * 60 * 1000);
const INTERVAL_MS = Number(process.env.DEPLOY_POLL_MS || 10000);
const root = process.cwd();

/* CRLF im Arbeitsbaum darf nicht als Unterschied zählen (Pages liefert die Blobs). */
const sha = buffer => createHash('sha256').update(buffer.toString('binary').replace(/\r\n/g, '\n'), 'binary').digest('hex');
const local = file => sha(readFileSync(join(root, file)));

const html = readFileSync(join(root, 'index.html'), 'utf8');
const refs = [...new Set([...html.matchAll(/\.\/js\/([a-z]+)\.js/g)].map(m => `js/${m[1]}.js`))];
const wanted = new Map([['index.html', local('index.html')], ...refs.map(f => [f, local(f)])]);
const token = (html.match(/js\/input\.js\?v=[a-z0-9]+/) || ['?v unklar'])[0];

console.log(`erwartet: ${wanted.size} Dateien, Stand ${token}`);
for (const [file, want] of wanted) console.log(`  ${want.slice(0, 12)}  ${file}`);

const fetchBytes = async path => {
  const res = await fetch(`${BASE}/${path}?cb=${Date.now()}`, { cache: 'no-store' });
  return { status: res.status, hash: res.ok ? sha(Buffer.from(await res.arrayBuffer())) : null };
};

const started = Date.now();
let attempt = 0;
let last = 'noch kein Versuch';

while (Date.now() - started < TIMEOUT_MS) {
  attempt++;
  const problems = [];
  for (const [file, want] of wanted) {
    try {
      const got = await fetchBytes(file);
      if (got.status !== 200) problems.push(`${file}: HTTP ${got.status}`);
      else if (got.hash !== want) problems.push(`${file}: noch die alte Fassung`);
    } catch (e) {
      problems.push(`${file}: ${e.message}`);
    }
  }
  if (problems.length === 0) {
    // game.js wurde in einer früheren Phase gelöscht und darf nicht zurückkommen
    const gone = await fetchBytes('game.js');
    if (gone.status !== 404) problems.push(`game.js: HTTP ${gone.status} statt 404`);
  }

  if (problems.length === 0) {
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`Deploy ist live nach ${seconds}s (${attempt} Versuche): ${wanted.size} Dateien byte-identisch, game.js 404.`);
    process.exit(0);
  }

  last = problems.slice(0, 3).join('; ') + (problems.length > 3 ? ` (+${problems.length - 3} weitere)` : '');
  console.log(`Versuch ${attempt}: noch nicht bereit — ${last}`);
  await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
}

console.error(`Deploy passte nach ${Math.round(TIMEOUT_MS / 1000)}s nicht zu diesem Commit. Zuletzt: ${last}`);
process.exit(1);
