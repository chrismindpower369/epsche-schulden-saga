/* ============================================================
   Ausgelieferter Stand auf GitHub Pages.

   Läuft erst, nachdem `tests/deploy-ready.mjs` belegt hat, dass die
   ausgelieferten Bytes exakt diesem Commit entsprechen. Damit wird
   zum ersten Mal die echte Live-Seite gefahren — bisher war sie nur
   über Byte-Vergleiche geprüft.
   ============================================================ */
'use strict';

const { test, expect } = require('@playwright/test');
const { snap, boot, press, hold, jumpAndLand, attackUntil, tapPad, setStick } = require('./helpers');

test.describe('GitHub Pages', () => {
  test('startet mit HUD, ohne Dev-Hook und ohne Konsolenfehler', async ({ page }) => {
    const errors = await boot(page);
    const s = await snap(page);

    expect(s.mode).toBe('play');
    expect(s.texts).toContain('Kapitel 1');
    expect(s.texts.join(' | ')).toContain('Waffe: Feuerschwert');
    expect(s.texts.join(' | ')).toContain('LV 1 · XP 0/');
    expect(await page.locator('script[src^="./js/"]').count()).toBe(11);
    expect(await page.locator('#status').textContent()).toBe('Spiel geladen');

    // Der Test-Hook aus den früheren Phasen darf produktiv nicht existieren.
    expect(await page.evaluate(() => typeof window.__saga)).toBe('undefined');

    expect(errors).toEqual([]);
  });

  test('Tastatur: läuft und springt', async ({ page }) => {
    await boot(page);
    const speed = (await snap(page)).speed;

    await hold(page, 'd');
    await expect.poll(async () => (await snap(page)).vx).toBe(speed);
    await page.keyboard.up('d');
    await expect.poll(async () => (await snap(page)).vx).toBe(0);

    await expect.poll(async () => (await snap(page)).grounded, { timeout: 5000 }).toBe(true);
    await jumpAndLand(page, p => press(p, 'w', 200));
  });

  test('Gamepad: wird ohne Event übernommen und tötet', async ({ page }) => {
    test.setTimeout(60000);
    await boot(page, { pad: true });
    await expect.poll(async () => (await snap(page)).padNull, { timeout: 5000 }).toBe(false);

    const speed = (await snap(page)).speed;
    await setStick(page, 1);
    await expect.poll(async () => (await snap(page)).vx).toBe(speed);
    await setStick(page, 0);

    const before = await page.evaluate(() => {
      window.Saga.Progress.gainXp(300);
      return { kills: window.Saga.State.kills, xp: window.Saga.State.xp };
    });
    const run = await attackUntil(page, s => s.kills > before.kills, p => tapPad(p, 2), 25000);
    expect(run.satisfied, 'kein Kill im Zeitfenster').toBe(true);
    expect((await snap(page)).xp).toBeGreaterThan(before.xp);
  });

  test('Neustart nach Niederlage baut die Szene neu auf', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.Saga.Player.takeDamage(9999));

    await expect.poll(async () => (await snap(page)).mode, { timeout: 5000 }).toBe('over');
    expect((await snap(page)).texts).toContain('NIEDERLAGE');

    await press(page, 'r', 200);
    await expect.poll(async () => (await snap(page)).mode, { timeout: 10000 }).toBe('play');
    const alive = await snap(page);
    expect(alive.texts).toContain('Kapitel 1');
    expect(alive.children).toBeGreaterThan(10);
  });
});
