/* ============================================================
   Saga.Debug — Test-Hook window.__saga für automatisierte Checks.
   Reine Weiterleitung an die Module: keine eigene Logik, kein
   eigener Zustand. Ob dieser Hook ausgeliefert wird, entscheidet
   ein späterer Durchgang — dann genügt das Löschen dieser Datei.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

window.__saga = {
  get player() { return Saga.State.player; },
  get enemy() { return Saga.Enemies.nearest(); },
  get enemies() { return Saga.State.enemies.slice(); },
  get hp() { return Saga.State.hp; },
  get maxHP() { return Saga.State.maxHp; },
  get state() { return Saga.State.mode; },
  get facing() { return Saga.State.facing; },
  get level() { return Saga.State.level; },
  get xp() { return Saga.State.xp; },
  get xpNext() { return Saga.State.xpToNext; },
  get wave() { return Saga.State.waveIndex + 1; },
  get waveState() { return Saga.State.waveState; },
  get weapon() { return Saga.State.weapon; },
  get kills() { return Saga.State.kills; },
  get enemyHp() { var nearest = Saga.Enemies.nearest(); return nearest ? nearest.hp : null; },
  get dmg() { return Saga.Progress.playerDamage(); },

  setWeapon: function (id) { Saga.Player.switchWeapon(id); },
  attack: function () { Saga.Player.attack(); },
  waveComposition: function (n) { return Saga.Waves.composition(n); },
  giveXP: function (n) { Saga.Progress.gainXp(n); },
  resetSave: function () { Saga.Progress.reset(); },
  scene: function () { return Saga.State.scene; }
};
