/* ============================================================
   Flows auf den committeten Bytes (lokaler statischer Server).

   Getestet wird über window.Saga — die Module liegen bewusst
   global (kein Build), also ist das der echte Zugang zum Spiel.
   ============================================================ */
'use strict';

const { test, expect } = require('@playwright/test');
const {
  snap, boot, press, hold, jumpAndLand, attackUntil,
  padButton, tapPad, setStick, unplug, replug, expectNoSteering
} = require('./helpers');

/* Angriffe nur, wenn der Gegner vorne steht: sonst schlägt der Test ins Leere.
   Die stärkere Figur hält die Läufe kurz und robust — geprüft wird der Ablauf,
   nicht die Balance von Level 1. */
async function powerUp(page) {
  await page.evaluate(() => window.Saga.Progress.gainXp(300));
  return snap(page);
}

test.describe('lokaler Stand', () => {
  test('lädt mit HUD, Kapitel 1 und ohne Konsolenfehler', async ({ page }) => {
    const errors = await boot(page);
    const s = await snap(page);

    expect(s.mode).toBe('play');
    expect(s.level).toBe(1);
    expect(s.texts).toContain('Kapitel 1');
    expect(s.texts.join(' | ')).toContain('Waffe: Feuerschwert');
    expect(s.texts.join(' | ')).toContain('HP 100/100');
    expect(s.texts.join(' | ')).toContain('LV 1 · XP 0/');
    expect(await page.locator('script[src^="./js/"]').count()).toBe(11);
    expect(await page.locator('#status').textContent()).toBe('Spiel geladen');
    expect(errors).toEqual([]);
  });

  test('Tastatur: läuft in beide Richtungen mit dem Level-Tempo', async ({ page }) => {
    await boot(page);
    const speed = (await snap(page)).speed;

    await hold(page, 'd');
    await expect.poll(async () => (await snap(page)).vx).toBe(speed);
    await page.keyboard.up('d');
    await expect.poll(async () => (await snap(page)).vx).toBe(0);

    await hold(page, 'a');
    await expect.poll(async () => (await snap(page)).vx).toBe(-speed);
    await page.keyboard.up('a');
    await expect.poll(async () => (await snap(page)).vx).toBe(0);
  });

  test('Tastatur: springt nur vom Boden', async ({ page }) => {
    await boot(page);
    await expect.poll(async () => (await snap(page)).grounded, { timeout: 5000 }).toBe(true);
    const before = await snap(page);

    await jumpAndLand(page, p => press(p, 'w', 200));

    // springt senkrecht: zurück am Startpunkt
    const after = await snap(page);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(2);
  });

  test('Tastatur: Waffen 1–5 und Q', async ({ page }) => {
    await boot(page);
    await press(page, '2', 200);
    await expect.poll(async () => (await snap(page)).weapon).toBe('dragon');
    await press(page, '3', 200);
    await expect.poll(async () => (await snap(page)).weapon).toBe('contact');
    await press(page, '4', 200);
    await expect.poll(async () => (await snap(page)).weapon).toBe('poi');
    await press(page, '5', 200);
    await expect.poll(async () => (await snap(page)).weapon).toBe('dart');
    await press(page, 'q', 200);
    await expect.poll(async () => (await snap(page)).weapon).toBe('sword');
  });

  test('Tastatur: Angriff tötet und gibt XP', async ({ page }) => {
    test.setTimeout(60000);
    await boot(page);
    const before = await powerUp(page);

    const run = await attackUntil(page, s => s.kills > before.kills, p => press(p, 'j', 120), 25000);
    expect(run.satisfied, 'kein Kill im Zeitfenster').toBe(true);

    const after = await snap(page);
    expect(after.kills).toBeGreaterThan(before.kills);
    expect(after.xp).toBeGreaterThan(before.xp);
  });

  test('Kapitelwechsel: Kapitel 1 wird geschafft, Kapitel 2 läuft', async ({ page }) => {
    test.setTimeout(90000);
    await boot(page);
    await powerUp(page);

    const run = await attackUntil(page, s => s.waveState !== 'running', p => press(p, 'j', 120), 60000);
    expect(run.satisfied, 'Kapitel 1 nicht geschafft').toBe(true);

    const cleared = await snap(page);
    expect(cleared.texts.join(' | ')).toContain('KAPITEL 1 GESCHAFFT!');
    expect(cleared.kills).toBeGreaterThanOrEqual(3);

    await expect.poll(async () => (await snap(page)).wave, { timeout: 30000 }).toBe(2);
    await expect.poll(async () => (await snap(page)).waveState, { timeout: 30000 }).toBe('running');
    expect((await snap(page)).texts).toContain('Kapitel 2');
  });

  test('Neustart nach Niederlage baut die Szene neu auf', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.Saga.Player.takeDamage(9999));

    await expect.poll(async () => (await snap(page)).mode, { timeout: 5000 }).toBe('over');
    const dead = await snap(page);
    expect(dead.texts).toContain('NIEDERLAGE');
    expect(dead.texts.join(' | ')).toContain('R oder Start für Neustart');

    await press(page, 'r', 200);
    await expect.poll(async () => (await snap(page)).mode, { timeout: 10000 }).toBe('play');

    const alive = await snap(page);
    expect(alive.hp).toBe(alive.maxHp);
    expect(alive.children).toBeGreaterThan(10);
    expect(alive.texts).toContain('Kapitel 1');
    expect(alive.texts).not.toContain('NIEDERLAGE');
    expect(alive.kills).toBe(0);
  });

  test('Gamepad: wird ohne DOM-Event übernommen und steuert Stick und Steuerkreuz', async ({ page }) => {
    const errors = await boot(page, { pad: true });
    await expect.poll(async () => (await snap(page)).padNull, { timeout: 5000 }).toBe(false);
    const speed = (await snap(page)).speed;

    await setStick(page, 1);
    await expect.poll(async () => (await snap(page)).vx).toBe(speed);
    await setStick(page, -1);
    await expect.poll(async () => (await snap(page)).vx).toBe(-speed);
    await setStick(page, 0);
    await expect.poll(async () => (await snap(page)).vx).toBe(0);

    await padButton(page, 14, true);
    await expect.poll(async () => (await snap(page)).vx).toBe(-speed);
    await padButton(page, 14, false);
    await padButton(page, 15, true);
    await expect.poll(async () => (await snap(page)).vx).toBe(speed);
    await padButton(page, 15, false);
    await expect.poll(async () => (await snap(page)).vx).toBe(0);

    expect(errors).toEqual([]);
  });

  test('Gamepad: A springt, X tötet, LB/RB wechseln, Start startet neu', async ({ page }) => {
    test.setTimeout(60000);
    await boot(page, { pad: true });
    const before = await powerUp(page);

    await expect.poll(async () => (await snap(page)).grounded, { timeout: 5000 }).toBe(true);
    await jumpAndLand(page, p => tapPad(p, 0));

    /* LB (4) und RB (5) sind beide an dieselbe Absicht gebunden: sie schalten
       vorwärts durch WEAPON_ORDER. Beide Richtungen zu prüfen heißt daher
       sword -> dragon -> contact. */
    await tapPad(page, 5);
    await expect.poll(async () => (await snap(page)).weapon).toBe('dragon');
    await tapPad(page, 4);
    await expect.poll(async () => (await snap(page)).weapon).toBe('contact');

    const run = await attackUntil(page, s => s.kills > before.kills, p => tapPad(p, 2), 25000);
    expect(run.satisfied, 'kein Kill im Zeitfenster').toBe(true);
    expect((await snap(page)).xp).toBeGreaterThan(before.xp);

    await tapPad(page, 9);
    await expect.poll(async () => (await snap(page)).kills, { timeout: 10000 }).toBe(0);
    const fresh = await snap(page);
    expect(fresh.mode).toBe('play');
    expect(fresh.texts).toContain('Kapitel 1');
  });

  test('Gamepad: Abstecken mit Event stoppt den Stick (0 px Drift)', async ({ page }) => {
    await boot(page, { pad: true });
    await expect.poll(async () => (await snap(page)).padNull).toBe(false);
    await setStick(page, 1);
    await expect.poll(async () => (await snap(page)).vx).toBe((await snap(page)).speed);

    await unplug(page, { withEvent: true });
    await expectNoSteering(page);
  });

  test('Gamepad: stilles Verschwinden ohne Event stoppt den Stick ebenfalls', async ({ page }) => {
    await boot(page, { pad: true });
    await expect.poll(async () => (await snap(page)).padNull).toBe(false);
    await setStick(page, 1);
    await expect.poll(async () => (await snap(page)).vx).toBe((await snap(page)).speed);

    await unplug(page, { withEvent: false });
    await expectNoSteering(page);
  });

  test('Gamepad: erneutes Anstecken übernimmt wieder', async ({ page }) => {
    await boot(page, { pad: true });
    await unplug(page, { withEvent: false });
    await expectNoSteering(page);

    await replug(page);
    await setStick(page, 1);
    await expect.poll(async () => (await snap(page)).vx).toBe((await snap(page)).speed);
    await setStick(page, 0);
  });

  test('Fortschritt überlebt ein Neuladen', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.Saga.Progress.gainXp(30));
    await expect.poll(async () => (await snap(page)).xp).toBe(30);

    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.Saga && Saga.State && Saga.State.player);

    const s = await snap(page);
    expect(s.level).toBe(1);
    expect(s.xp).toBe(30);
    expect(s.texts.join(' | ')).toContain('LV 1 · XP 30/');
  });
});
