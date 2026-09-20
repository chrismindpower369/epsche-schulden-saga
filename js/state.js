/* ============================================================
   Saga.State — einziger Eigentümer des Laufzeit-Zustands.
   Niemand sonst hält veränderliche Spielwerte: Wer etwas ändern
   will, ändert es hier (Saga.State.…). Level/XP überleben einen
   Szenen-Neustart, alles andere wird pro Szene zurückgesetzt.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.State = {
  /* Szene & Objekte */
  scene: null,
  player: null,
  solids: [],
  enemyGroup: null,
  enemies: [],
  keys: null,
  cursors: null,
  pad: null,

  /* Eingabe-Historie (Flankenerkennung) */
  edgePrev: {},

  /* Spieler */
  facing: 1,
  hp: 100,
  maxHp: 100,
  invulnUntil: 0,
  mode: 'play',            /* 'play' | 'over' */

  /* Angriff */
  attackCooldownUntil: 0,
  swingId: 0,
  kills: 0,
  weapon: 'sword',

  /* Wellen / Kapitel */
  waveIndex: 0,            /* 0-basiert */
  waveQueue: [],
  waveState: 'idle',       /* 'idle' | 'running' | 'intermission' */

  /* Fortschritt (wird aus LocalStorage geladen) */
  xp: 0,
  level: 1,
  xpToNext: Saga.Data.LEVEL_BASE_XP,

  /* Pro Szenenstart (auch nach scene.restart): Level/XP bleiben erhalten */
  resetForNewScene: function () {
    this.enemies = [];
    this.solids = [];
    this.attackCooldownUntil = 0;
    this.swingId = 0;
    this.kills = 0;
    this.maxHp = Saga.Progress.playerMaxHp();
    this.hp = this.maxHp;
    this.invulnUntil = 0;
    this.mode = 'play';
  }
};
