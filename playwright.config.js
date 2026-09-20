/* ============================================================
   Playwright-Konfiguration.

   Zwei Projekte:
   - `local`: fährt den Arbeitsbaum über tests/serve.mjs
   - `live` : fährt https://chrismindpower369.github.io/epsche-schulden-saga/
              (erst nach `node tests/deploy-ready.mjs`)
   ============================================================ */
'use strict';

const { defineConfig, devices } = require('@playwright/test');

/* PORT kann als "0" oder leer vererbt werden — dann gilt der Standardport. */
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 8123;
const LIVE_URL = process.env.LIVE_URL || 'https://chrismindpower369.github.io/epsche-schulden-saga/';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 8000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },

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
