/* ============================================================
   Gemeinsame Helfer der Test-Suiten.

   Das Spiel legt seine Module bewusst global in `window.Saga` ab
   (klassische Skripte, kein Build) — genau darüber lesen die Tests
   den Zustand, statt Pixel zu vergleichen.
   ============================================================ */
'use strict';

const path = require('node:path');
const { expect } = require('@playwright/test');

/* Kompletter Spielzustand in einem Rutsch — nur Skalare. */
async function snap(page) {
  return page.evaluate(() => {
    const S = window.Saga.State;
    const body = S.player && S.player.body ? S.player.body : null;
    return {
      mode: S.mode,
      hp: S.hp,
      maxHp: S.maxHp,
      level: S.level,
      xp: S.xp,
      xpToNext: S.xpToNext,
      weapon: S.weapon,
      kills: S.kills,
      waveState: S.waveState,
      wave: S.waveIndex + 1,
      enemies: S.enemies.length,
      facing: S.facing,
      vx: body ? Math.round(body.velocity.x) : 0,
      vy: body ? Math.round(body.velocity.y) : 0,
      x: S.player ? Math.round(S.player.x) : 0,
      y: S.player ? Math.round(S.player.y) : 0,
      grounded: !!(body && (body.blocked.down || body.touching.down)),
      padNull: S.pad === null,
      speed: window.Saga.Progress.playerSpeed(),
      jumpVelocity: window.Saga.Data.JUMP_VELOCITY,
      children: S.scene ? S.scene.children.list.length : 0,
      texts: S.scene ? S.scene.children.list.filter(o => typeof o.text === 'string').map(o => o.text) : []
    };
  });
}

/* Lädt die Seite und wartet, bis Szene und Spieler stehen. */
async function boot(page, opts = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  if (opts.pad) await page.addInitScript({ path: path.join(__dirname, 'pad-stub.js') });

  await page.goto('index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Saga && Saga.State && Saga.State.scene && Saga.State.player);
  return errors;
}

async function press(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms || 350);
  await page.keyboard.up(key);
}

/* Hält eine Richtung und wartet, bis die Geschwindigkeit steht. */
async function hold(page, key) {
  await page.keyboard.down(key);
  await page.waitForFunction(() => window.Saga.State.player.body.velocity.x !== 0);
}

/* Springt (Taste oder Pad-Knopf) und wartet auf Absprung und Landung.

   Über die Höhe geprüft statt über vy: In der Landungsphase kann eine
   Erwartung auf vy < −200 ins Leere laufen (Aufstiegsfenster verpasst
   oder Drucktaste von einem Settle-Frame gefressen — auf der Live-Seite
   drei Läufe in Folge). Die Höhe über dem Startpunkt bleibt über den
   größten Teil der Sprungzeit stabil und beweist denselben Sachverhalt. */
async function jumpAndLand(page, pressFn) {
  await page.waitForTimeout(300); /* Landung setzen lassen, bevor der Druck feuert */
  const start = (await snap(page)).y;
  await pressFn(page);
  await expect.poll(async () => (await snap(page)).y, { timeout: 5000 }).toBeLessThan(start - 40);
  await expect.poll(async () => (await snap(page)).grounded, { timeout: 5000 }).toBe(true);
}

/* Hält J oder X gedrückt los, bis der Gegner fällt (max. ~20 s). */
async function attackUntil(page, done, pressKey, maxMs) {
  const deadline = Date.now() + (maxMs || 20000);
  let presses = 0;
  while (Date.now() < deadline) {
    const state = await snap(page);
    if (done(state)) return { satisfied: true, presses };
    await pressKey(page);
    presses++;
    await page.waitForTimeout(80);
  }
  return { satisfied: false, presses };
}

async function padButton(page, index, down) {
  await page.evaluate(({ index, down }) => window.__pad.setButton(index, down), { index, down });
}

/* Haltdauer über dem schlimmsten zu erwartenden Frame-Intervall halten:
   Bei parallelen Workern kann ein Frame-Look deutlich über 200 ms liegen —
   ein kürzerer Druck fällt dann komplett in die Lücke und Phaser sieht
   die Kante nie (auf Live zweimal beobachtet). Kanten feuern pro Druck
   genau einmal, ein längerer Halt ändert am Verhalten also nichts. */
async function tapPad(page, index, ms) {
  await padButton(page, index, true);
  await page.waitForTimeout(ms || 300);
  await padButton(page, index, false);
}

async function setStick(page, value) {
  await page.evaluate(v => window.__pad.setStick(0, v), value);
}

/* Abstecken: mit DOM-Event (Browser-Normalfall) oder still (kein Event). */
async function unplug(page, opts = {}) {
  await page.evaluate(({ withEvent }) => {
    window.__pad.setLive(false);
    if (withEvent) window.__pad.dispatch('gamepaddisconnected');
  }, { withEvent: !!opts.withEvent });
}

async function replug(page) {
  await page.evaluate(() => {
    window.__pad.setLive(true);
    window.__pad.dispatch('gamepadconnected');
  });
}

/* Wartet darauf, dass der Griff frei ist und nichts mehr steuert. */
async function expectNoSteering(page) {
  await expect.poll(async () => (await snap(page)).padNull, { timeout: 5000 }).toBe(true);
  await expect.poll(async () => (await snap(page)).vx, { timeout: 5000 }).toBe(0);
  const before = (await snap(page)).x;
  await page.waitForTimeout(700);
  const after = (await snap(page)).x;
  expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
  return { before, after };
}

module.exports = { snap, boot, press, hold, jumpAndLand, attackUntil, padButton, tapPad, setStick, unplug, replug, expectNoSteering };
