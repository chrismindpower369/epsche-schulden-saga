/* ============================================================
   Minimaler Static-Server für die Tests: keine Dependencies,
   liefert genau die Bytes aus dem Arbeitsbaum und setzt
   `cache-control: no-store` — damit die Tests nie auf die alte
   Fassung aus dem Browser-Cache laufen (der Fallstrick, der die
   manuelle Verifikation mehrfach Runden gekostet hat).
   ============================================================ */
'use strict';

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.argv[2] || 8123);
const root = process.cwd();
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\]|\.\.[/\\])+/, '');
  let file = join(root, rel === '' ? 'index.html' : rel);

  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': types[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(body);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log('serving ' + root + ' on http://127.0.0.1:' + port);
});
