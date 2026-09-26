/* ============================================================
   Playwright-Konfiguration.

   Zwei Projekte:
   - `local`: fährt den Arbeitsbaum über tests/serve.mjs
   - `live` : fährt https://chrismindpower369.github.io/epsche-schulden-saga/
              (erst nach `node tests/deploy-ready.mjs`)
   ============================================================ */
'use strict';

const { defineConfig, devices } = require('@playwright/test');
const { cpus } = require('node:os');

/* PORT kann als "0" oder leer vererbt werden — dann gilt der Standardport. */
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 8123;
const LIVE_URL = process.env.LIVE_URL || 'https://chrismindpower369.github.io/epsche-schulden-saga/';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 8000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    /* Software-WebGL (SwiftShader) ist der Flaschenhals bei parallelen
       Läufen: ohne GPU fällt Phaser.AUTO auf den Canvas-Renderer zurück —
       deutlich billiger, keine GL-Stalls beim Context-Close. Die Suites
       prüfen Spielzustand, nie Pixel, daher ist der Renderer-Tausch
       verhaltenstechnisch neutral. */
    launchOptions: { args: ['--disable-gpu'] }
  },

  /* Jeder Test bekommt einen eigenen Kontext (frisches localStorage,
     eigener Pad-Stub) — nichts wird geteilt, also darf die gesamte
     Datei parallel laufen. Die Worker-Zahl ist ein Messergebnis:
     jede Headless-Instanz rendert Phaser auf Software-canvas, und die
     Kanten-Tests (Sprung/Angriff feuern pro Druck genau einmal) fressen
     einen Druck, wenn ein Frame-Look den Zeitraum überspannt. Gemessen:
     9 Worker → 9 Timeouts, 4 Worker → schwankend (ein Lauf 13/13 grün,
     der nächste 4 Fehlschläge bei identischer Konfiguration),
     2 Worker → stabil über drei Folgeläufe. Der Suite ist
     wall-clock-dominiert (Angriffs-Deadlines), deshalb ist der
     Parallelgewinn begrenzt — Stabilität schlägt hier Geschwindigkeit.
     CI: ebenfalls 2 (4-vCPU-Runner, ein Projekt je Job). */
  fullyParallel: true,
  workers: process.env.CI ? 2 : Math.min(2, cpus().length),

  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },

  projects: [
    {
      name: 'local',
      testMatch: /local\.spec\.js/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${PORT}/` }
    },
    {
      name: 'live',
      testMatch: /live\.spec\.js/,
      use: { ...devices['Desktop Chrome'], baseURL: LIVE_URL }
    }
  ]
});
