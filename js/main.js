/* ============================================================
   Saga.main — Einstiegspunkt: Phaser-Konfiguration und Start.
   Als letzte Datei geladen, weil sie alle anderen Module kennt.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: Saga.Data.GAME_W,
  height: Saga.Data.GAME_H,
  backgroundColor: '#11182f',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: Saga.Data.GRAVITY }, debug: false }
  },
  input: { gamepad: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Saga.Scene.GameScene]
});
