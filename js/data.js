/* ============================================================
   Saga.Data — feste Werte: Konfiguration, Tabellen, Farben.
   Hier wird nur gepflegt, was sich nicht zur Laufzeit ändert:
   keine Logik, kein Zustand.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Data = {
  /* Spielfeld & Physik */
  GAME_W: 960,
  GAME_H: 540,
  GROUND_TOP: 480,
  GRAVITY: 900,
  PLAYER_SPEED: 260,
  JUMP_VELOCITY: 560,
  CONTACT_DAMAGE: 8,
  INVULN_MS: 600,

  /* Nahkampf */
  ATTACK_DAMAGE: 10,
  KNOCKBACK_X: 200,
  KNOCKBACK_Y: -140,
  HIT_STUN_MS: 220,

  /* Gegnertypen & Wellen (Kapitel) */
  ENEMY_TYPES: {
    kk: { name: 'KREDITKARTE', w: 40, h: 26, hp: 30, speed: 70, xp: 12, color: 0xff5e6c },
    mh: { name: 'MAHNUNG', w: 30, h: 22, hp: 18, speed: 135, xp: 10, color: 0xffd166 },
    ik: { name: 'INKASSO', w: 56, h: 44, hp: 80, speed: 45, xp: 30, color: 0xb28dff }
  },
  ENEMY_HP_GROWTH: 0.08,        /* +8% Gegner-HP pro Kapitel ab Kapitel 4 */
  WAVE_SPAWN_INTERVAL_MS: 900,
  WAVE_INTERMISSION_MS: 4200,
  WAVE_CLEAR_BONUS_XP: 15,
  WAVE_CLEAR_HEAL: 0.2,         /* 20% maxHP Heilung pro Kapitelabschluss */

  /* Level & Speicherung */
  LEVEL_BASE_XP: 40,            /* XP für Level 1→2 */
  LEVEL_XP_GROWTH: 1.35,
  LEVEL_DMG_BONUS: 2,
  LEVEL_HP_BONUS: 10,
  LEVEL_SPEED_BONUS: 8,
  SAVE_KEY: 'epsche-schulden-saga-save-v1',

  /* Feuerkünstler-Waffen (Shapes + Tweens, solange keine Sprites da sind) */
  WEAPONS: {
    sword: { name: 'Feuerschwert', color: 0xff7a3c, offX: 38, w: 74, h: 40, cooldown: 300, dmgMult: 1.0, anim: 'slash' },
    dragon: { name: 'Dragon Staff', color: 0xffd166, offX: 52, w: 96, h: 28, cooldown: 460, dmgMult: 1.25, anim: 'spin' },
    contact: { name: 'Contact Staff', color: 0xb28dff, offX: 44, w: 82, h: 44, cooldown: 380, dmgMult: 1.1, anim: 'spin' },
    poi: { name: 'Poi', color: 0x52e38f, offX: 34, w: 100, h: 66, cooldown: 520, dmgMult: 0.8, anim: 'circle' },
    dart: { name: 'Rope Dart', color: 0x29e7ff, offX: 62, w: 120, h: 16, cooldown: 600, dmgMult: 1.5, anim: 'thrust' }
  },
  WEAPON_ORDER: ['sword', 'dragon', 'contact', 'poi', 'dart'],

  COLORS: {
    cyan: 0x29e7ff,
    red: 0xff5e6c,
    yellow: 0xffd166,
    purple: 0xb28dff,
    green: 0x52e38f,
    panel: 0x1a2547,
    dark: 0x11182f,
    white: 0xf1f5ff
  }
};
