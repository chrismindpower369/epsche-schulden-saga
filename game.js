/* ============================================================
   EPSCHE SCHULDEN SAGA — Side-Scroller Hack & Slash (Phaser 3)
   Phase 1–5: Seitenansicht · Gravity · Gegner von rechts ·
            Nahkampfangriff · XP/Level · Waffen · Wellen & Kapitel
   ------------------------------------------------------------
   Tastatur:
     A / D  oder  ← / →    : laufen
     W / ↑ / Leertaste     : springen
     J / K                 : Nahkampfangriff
     1–5 / Q               : Waffe wechseln
     R                     : Neustart (nach Niederlage)
   Gamepad:
     Linker Stick / D-Pad  : laufen
     A (unterer Button)    : springen
     X (linker Button)     : Nahkampfangriff (B funktioniert auch)
     LB / RB               : Waffe wechseln
     Start                 : Neustart
   ============================================================ */

'use strict';

/* ---------- Konstanten ---------- */
const GAME_W = 960;
const GAME_H = 540;
const GROUND_TOP = 480;          // y-Position der Bodenoberkante
const GRAVITY = 900;
const PLAYER_SPEED = 260;
const JUMP_VELOCITY = 560;
const CONTACT_DAMAGE = 8;        // Schaden pro Berührung (mit i-Frames, statt -1 pro Frame)
const INVULN_MS = 600;

/* Phase 2: Angriff (Basis; Waffen-Details siehe WEAPONS) */
const ATTACK_DAMAGE = 10;
const KNOCKBACK_X = 200;
const KNOCKBACK_Y = -140;

/* Phase 5: Gegnertypen & Wellen (Kapitel) */
const ENEMY_TYPES = {
  kk: { name: 'KREDITKARTE', w: 40, h: 26, hp: 30, speed: 70,  xp: 12, color: 0xff5e6c },
  mh: { name: 'MAHNUNG',     w: 30, h: 22, hp: 18, speed: 135, xp: 10, color: 0xffd166 },
  ik: { name: 'INKASSO',     w: 56, h: 44, hp: 80, speed: 45,  xp: 30, color: 0xb28dff }
};
const ENEMY_HP_GROWTH = 0.08;      // +8% Gegner-HP pro Kapitel ab Kapitel 4
const WAVE_SPAWN_INTERVAL_MS = 900;
const WAVE_INTERMISSION_MS = 4200;
const WAVE_CLEAR_BONUS_XP = 15;
const WAVE_CLEAR_HEAL = 0.2;       // 20% maxHP Heilung pro Kapitelabschluss

/* Phase 3: XP & Level */
const LEVEL_BASE_XP = 40;        // XP für Level 1→2
const LEVEL_XP_GROWTH = 1.35;    // xpToNext steigt pro Level
const LEVEL_DMG_BONUS = 2;       // +2 Schaden pro Level
const LEVEL_HP_BONUS = 10;       // +10 maxHP pro Level
const LEVEL_SPEED_BONUS = 8;     // +8 px/s Laufspeed pro Level
const SAVE_KEY = 'epsche-schulden-saga-save-v1';

/* Phase 4: Feuerkünstler-Waffen (solange keine Sprites: Shapes + Tweens) */
const WEAPONS = {
  sword:   { name: 'Feuerschwert',   color: 0xff7a3c, offX: 38, w: 74,  h: 40, cooldown: 300, dmgMult: 1.0,  anim: 'slash' },
  dragon:  { name: 'Dragon Staff',   color: 0xffd166, offX: 52, w: 96,  h: 28, cooldown: 460, dmgMult: 1.25, anim: 'spin'  },
  contact: { name: 'Contact Staff',  color: 0xb28dff, offX: 44, w: 82,  h: 44, cooldown: 380, dmgMult: 1.1,  anim: 'spin'  },
  poi:     { name: 'Poi',            color: 0x52e38f, offX: 34, w: 100, h: 66, cooldown: 520, dmgMult: 0.8,  anim: 'circle'},
  dart:    { name: 'Rope Dart',      color: 0x29e7ff, offX: 62, w: 120, h: 16, cooldown: 600, dmgMult: 1.5,  anim: 'thrust'}
};
const WEAPON_ORDER = ['sword', 'dragon', 'contact', 'poi', 'dart'];

const COLORS = {
  cyan:   0x29e7ff,
  red:    0xff5e6c,
  yellow: 0xffd166,
  purple: 0xb28dff,
  green:  0x52e38f,
  panel:  0x1a2547,
  dark:   0x11182f,
  white:  0xf1f5ff
};

/* ---------- Spielzustand (Modul-Scope) ---------- */
let activeScene = null;
let player = null;
let enemies = [];              // Phase 5: alle aktiven Gegner der Welle
let enemyGroup = null;
let facing = 1;                // 1 = rechts, -1 = links
let keys = null;
let cursors = null;
let staticSolids = [];         // Boden + Plattformen
let pad = null;
const edgePrev = {};           // eigene Edge-Detection (unabhängig von Phaser JustDown)

/* Pressed-Status eines Gamepad-Buttons */
function padDown(index) {
  return !!(pad && pad.buttons[index] && pad.buttons[index].pressed);
}

/* Flankenerkennung: true nur beim Übergang nicht-gedrückt → gedrückt */
function edge(name, pressed) {
  const was = edgePrev[name] || false;
  edgePrev[name] = !!pressed;
  return pressed && !was;
}
let playerHP = 100;
let playerMaxHP = 100;
let invulnUntil = 0;
let gameState = 'play';        // 'play' | 'over'
let hpBar = null, hpBarBg = null, hpText = null;

/* Phase 2: Angriffs- & Gegnerzustand */
let attackCooldownUntil = 0;
let swingId = 0;
let kills = 0;
let killsText = null;

/* Phase 4: Waffenzustand */
let currentWeapon = 'sword';
let weaponText = null;

/* Phase 5: Wellen-/Kapitelzustand */
let waveIndex = 0;             // 0-basiert
let waveQueue = [];
let waveState = 'idle';        // 'idle' | 'running' | 'intermission'
let waveText = null;

/* Phase 3: XP-/Levelzustand (wird aus LocalStorage geladen) */
let xp = 0;
let level = 1;
let xpToNext = LEVEL_BASE_XP;
let levelText = null, xpBar = null, xpBarBg = null;

/* Persistierten Fortschritt einmalig beim Laden des Spiels übernehmen */
(function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (typeof d.level === 'number' && d.level >= 1) level = Math.min(50, Math.floor(d.level));
    if (typeof d.xp === 'number' && d.xp >= 0) xp = Math.floor(d.xp);
    if (typeof d.xpToNext === 'number' && d.xpToNext > 0) xpToNext = Math.floor(d.xpToNext);
  } catch (e) { /* korrupte/gesperrte Daten ignorieren */ }
})();

/* ---------- Szene ---------- */
class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    const s = this;
    activeScene = s;

    // Zustand zurücksetzen (auch nach Restart); Level/XP bleiben erhalten
    enemies = [];
    attackCooldownUntil = 0;
    playerMaxHP = playerMaxHp();
    playerHP = playerMaxHP;
    invulnUntil = 0;
    gameState = 'play';

    s.physics.world.setBounds(0, 0, GAME_W, GAME_H);

    /* Boden + Plattformen (statisch) */
    staticSolids = [];
    const ground = s.add.rectangle(GAME_W / 2, GROUND_TOP + 45, GAME_W + 300, 90, COLORS.panel);
    s.physics.add.existing(ground, true);
    staticSolids.push(ground);
    s.add.rectangle(GAME_W / 2, GROUND_TOP + 1, GAME_W, 3, COLORS.cyan, 0.5).setDepth(1);

    [[240, 360, 170], [660, 320, 170]].forEach(function (p) {
      const plat = s.add.rectangle(p[0], p[1], p[2], 16, COLORS.panel, 0.95)
        .setStrokeStyle(1, COLORS.cyan, 0.35);
      s.physics.add.existing(plat, true);
      staticSolids.push(plat);
    });

    /* Spieler */
    player = s.add.rectangle(140, GROUND_TOP - 60, 26, 56, COLORS.cyan);
    s.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    facing = 1;

    /* Gegner-Gruppe: alle Gegner einer Welle kommen von rechts */
    enemyGroup = s.physics.add.group();

    /* Kollisionen */
    staticSolids.forEach(function (solid) {
      s.physics.add.collider(player, solid);
      s.physics.add.collider(enemyGroup, solid);
    });
    s.physics.add.overlap(player, enemyGroup, function (pl, en) { damagePlayer(CONTACT_DAMAGE); });

    /* Kapitel 1 starten */
    startWave(0);

    /* Eingaben */
    keys = s.input.keyboard.addKeys('W,A,S,D,SPACE,J,K,R,Q,ONE,TWO,THREE,FOUR,FIVE');
    cursors = s.input.keyboard.createCursorKeys();
    if (s.input.gamepad) {
      s.input.gamepad.removeAllListeners();
      s.input.gamepad.on('connected', function (p) { pad = p; });
      if (s.input.gamepad.pad1) pad = s.input.gamepad.pad1; // falls schon verbunden
    }

    /* HUD */
    hpBarBg = s.add.rectangle(130, 28, 220, 18, 0x000000, 0.55)
      .setStrokeStyle(1, COLORS.cyan, 0.5).setDepth(5);
    hpBar = s.add.rectangle(22, 21, 216, 12, COLORS.cyan).setOrigin(0, 0).setDepth(6);
    hpText = s.add.text(24, 20, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#ffffff'
    }).setDepth(6);
    kills = 0;
    killsText = s.add.text(GAME_W - 16, 18, 'Kills: 0', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#8fa3c8'
    }).setOrigin(1, 0).setDepth(5);

    /* Waffen-HUD */
    weaponText = s.add.text(24, 78, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#ffd166'
    }).setDepth(6);

    /* Kapitel-Anzeige oben mittig */
    waveText = s.add.text(GAME_W / 2, 18, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#29e7ff'
    }).setOrigin(0.5).setDepth(6);

    /* Level-/XP-HUD unter der HP-Leiste */
    levelText = s.add.text(24, 44, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#b28dff'
    }).setDepth(6);
    xpBarBg = s.add.rectangle(22, 62, 220, 10, 0x000000, 0.55).setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.purple, 0.5).setDepth(5);
    xpBar = s.add.rectangle(24, 64, 216, 6, COLORS.purple).setOrigin(0, 0).setDepth(6);
    s.add.text(GAME_W / 2, GAME_H - 14,
      'A/D laufen · W/↑/Leertaste springen · J/K angreifen · 1–5/Q Waffe · Gamepad: Stick, A springen, X angreifen, LB/RB Waffe',
      { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#aab9d8' }
    ).setOrigin(0.5).setDepth(5);

    updateHPHud();
    updateXPText();
    updateWeaponHud();
  }

  update(time, delta) {
    if (!activeScene) return;
    const s = activeScene;

    /* Neustart (immer verfügbar) */
    if (edge('restart', keys.R.isDown || padDown(9))) {
      s.scene.restart();
      return;
    }
    if (gameState === 'over') {
      player.body.setVelocity(0);
      enemies.forEach(function (e) { if (e.body) e.body.setVelocity(0); });
      return;
    }

    /* Spieler-Bewegung: nur X-Achse */
    let vx = 0;
    const speed = playerSpeed();
    if (keys.A.isDown || cursors.left.isDown) vx = -speed;
    else if (keys.D.isDown || cursors.right.isDown) vx = speed;

    if (pad) {
      const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      if (Math.abs(ax) > 0.15) vx = ax * speed;
      if (padDown(14)) vx = -speed; // D-Pad links
      if (padDown(15)) vx = speed;  // D-Pad rechts
    }
    player.body.setVelocityX(vx);
    if (vx < 0) facing = -1; else if (vx > 0) facing = 1;

    /* Springen nur mit Bodenkontakt, per Flankenerkennung */
    const jumpHeld =
      keys.W.isDown || keys.SPACE.isDown || cursors.up.isDown ||
      padDown(0) || padDown(12);
    const grounded = player.body.blocked.down || player.body.touching.down;
    if (edge('jump', jumpHeld) && grounded) {
      player.body.setVelocityY(-JUMP_VELOCITY);
    }

    /* Phase 2: Nahkampfangriff (Flankenerkennung) */
    const attackHeld = keys.J.isDown || keys.K.isDown || padDown(2) || padDown(1);
    if (edge('attack', attackHeld)) tryAttack();

    /* Phase 4: Waffenwechsel — Tasten 1–5, Q = weiter, LB/RB am Gamepad */
    if (edge('w1', keys.ONE.isDown)) switchWeapon('sword');
    if (edge('w2', keys.TWO.isDown)) switchWeapon('dragon');
    if (edge('w3', keys.THREE.isDown)) switchWeapon('contact');
    if (edge('w4', keys.FOUR.isDown)) switchWeapon('poi');
    if (edge('w5', keys.FIVE.isDown)) switchWeapon('dart');
    if (edge('wCycle', keys.Q.isDown || padDown(4) || padDown(5))) {
      switchWeapon(WEAPON_ORDER[(WEAPON_ORDER.indexOf(currentWeapon) + 1) % WEAPON_ORDER.length]);
    }

    /* Gegner: horizontale Verfolgung (alle kommen von rechts) */
    enemies.forEach(function (e) {
      if (!e.body) return;
      const t = ENEMY_TYPES[e.etype];
      const dir = e.x > player.x ? -1 : 1;
      e.body.setVelocityX(dir * t.speed);
      e.kindLabel.setPosition(e.x, e.y - t.h / 2 - 14);
      if (e.hpBarBg) {
        e.hpBarBg.setPosition(e.x - 22, e.y - t.h / 2 - 6);
        e.hpBar.setPosition(e.x - 22, e.y - t.h / 2 - 6);
      }
      /* Sicherheitsnetz: Gegner darf nie unter die Welt fallen */
      if (e.y > GAME_H + 300) {
        e.setPosition(GAME_W + 60, GROUND_TOP - t.h / 2);
        e.body.setVelocity(0, 0);
      }
    });
  }
}

/* ---------- Phaser-Config ---------- */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#11182f',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: GRAVITY }, debug: false }
  },
  input: { gamepad: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene]
};

const game = new Phaser.Game(config);

/* ---------- Helper ---------- */
function damagePlayer(amount) {
  const s = activeScene;
  if (!s || gameState !== 'play') return;
  const now = s.time.now;
  if (now < invulnUntil || playerHP <= 0) return;
  playerHP = Math.max(0, playerHP - amount);
  invulnUntil = now + INVULN_MS;
  s.tweens.add({
    targets: player, alpha: 0.35, duration: 90, yoyo: true, repeat: 3,
    onComplete: function () { if (player) player.setAlpha(1); }
  });
  updateHPHud();
  if (playerHP <= 0) gameOver();
}

function updateHPHud() {
  const pct = Math.max(0, playerHP / playerMaxHP);
  hpBar.setSize(Math.round(216 * pct), 12);
  hpBar.setFillStyle(pct > 0.5 ? COLORS.cyan : (pct > 0.25 ? COLORS.yellow : COLORS.red));
  hpText.setText('HP ' + playerHP + '/' + playerMaxHP);
}

function gameOver() {
  const s = activeScene;
  gameState = 'over';
  s.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setDepth(10);
  s.add.text(GAME_W / 2, GAME_H / 2 - 24, 'NIEDERLAGE', {
    fontFamily: 'Arial, sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#ff5e6c'
  }).setOrigin(0.5).setDepth(11);
  s.add.text(GAME_W / 2, GAME_H / 2 + 22, 'Die Schulden waren schneller. · R oder Start für Neustart', {
    fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#dce8ff'
  }).setOrigin(0.5).setDepth(11);
}

/* ---------- Phase 2+4: Angriff, Hitbox, Waffen ---------- */
function switchWeapon(id) {
  if (!WEAPONS[id] || currentWeapon === id) return;
  currentWeapon = id;
  updateWeaponHud();
  /* kleiner Wechsel-Effekt am Spieler */
  if (player && activeScene) {
    player.setFillStyle(WEAPONS[id].color);
    activeScene.time.delayedCall(180, function () { if (player.active) player.setFillStyle(COLORS.cyan); });
  }
}

function updateWeaponHud() {
  if (weaponText) {
    const w = WEAPONS[currentWeapon];
    weaponText.setText('Waffe: ' + w.name + '  (1–5 / Q)');
  }
}

function tryAttack() {
  const s = activeScene;
  if (!s || gameState !== 'play' || !player) return;
  const now = s.time.now;
  const w = WEAPONS[currentWeapon];
  if (now < attackCooldownUntil) return;
  attackCooldownUntil = now + w.cooldown;
  swingId++;

  const dmg = Math.round(playerDamage() * w.dmgMult);
  const hx = player.x + facing * w.offX;
  const hy = player.y - 4;

  spawnWeaponFx(s, w, hx, hy);

  /* unsichtbare, kurzlebige Hitbox; trifft jeden Gegner max. 1× pro Schwung */
  const hitbox = s.add.rectangle(hx, hy, w.w, w.h, 0xffffff, 0.001);
  s.physics.add.existing(hitbox);
  hitbox.body.setAllowGravity(false);
  const col = s.physics.add.overlap(hitbox, enemyGroup, function (hb, en) {
    if (en && en.active && en.lastSwingHit !== swingId) {
      en.lastSwingHit = swingId;
      hitEnemy(en, dmg, facing);
    }
  });
  s.time.delayedCall(130, function () {
    if (col && col.active) s.physics.world.removeCollider(col);
    hitbox.destroy();
  });
}

/* Sichtbare Waffen-Effekte (Shapes + Tweens, bis echte Sprites kommen) */
function spawnWeaponFx(s, w, hx, hy) {
  const px = player.x, py = player.y - 4;

  if (w.anim === 'slash') {
    /* Feuerschwert: roter/orangener Balken schwingt vor den Spieler */
    const fx = s.add.rectangle(hx, hy, w.w - 12, 10, w.color, 0.9).setDepth(4);
    s.tweens.add({
      targets: fx, alpha: 0, scaleX: 1.6, angle: facing * 26, duration: 160,
      onComplete: function () { fx.destroy(); }
    });
  } else if (w.anim === 'spin') {
    /* Staff: langes Rechteck rotiert um den Spieler */
    for (let i = 0; i < 2; i++) {
      const fx = s.add.rectangle(px, py, w.w - 20, 8, w.color, 0.9).setDepth(4).setAngle(i * 180);
      s.tweens.add({
        targets: fx, angle: fx.angle + facing * 360, alpha: 0, duration: 280, ease: 'Cubic.Out',
        onComplete: function () { fx.destroy(); }
      });
    }
  } else if (w.anim === 'circle') {
    /* Poi: zwei Kreise kreisen um den Spieler */
    const orb = { a: 0 };
    const c1 = s.add.circle(px, py, 7, w.color, 0.95).setDepth(4);
    const c2 = s.add.circle(px, py, 7, w.color, 0.95).setDepth(4);
    const r = 48;
    s.tweens.add({
      targets: orb, a: facing * Math.PI * 2, duration: 320, ease: 'Cubic.Out',
      onUpdate: function () {
        if (!c1.active) return;
        c1.setPosition(px + Math.cos(orb.a) * r, py + Math.sin(orb.a) * r * 0.55);
        c2.setPosition(px - Math.cos(orb.a) * r, py - Math.sin(orb.a) * r * 0.55);
      },
      onComplete: function () { c1.destroy(); c2.destroy(); }
    });
  } else if (w.anim === 'thrust') {
    /* Rope Dart: schmaler langer Strahl schießt nach vorn */
    const fx = s.add.rectangle(px + facing * 8, py, w.w, 10, w.color, 0.9)
      .setOrigin(0, 0.5).setDepth(4).setScale(0.25, 1);
    if (facing < 0) fx.setAngle(180);
    s.tweens.add({
      targets: fx, scaleX: 1, alpha: 0, duration: 200, ease: 'Quad.Out',
      onComplete: function () { fx.destroy(); }
    });
  }
}

function hitEnemy(e, dmg, dir) {
  e.hp -= dmg;
  e.setFillStyle(0xffffff);                    /* Treffer-Flash */
  activeScene.time.delayedCall(90, function () { if (e.active) e.setFillStyle(COLORS.red); });
  e.body.setVelocityX(dir * KNOCKBACK_X);      /* Knockback weg vom Spieler */
  e.body.setVelocityY(KNOCKBACK_Y);
  updateEnemyBar(e);
  if (e.hp <= 0) killEnemy(e);
}

function updateEnemyBar(e) {
  if (e.hpBar) e.hpBar.scaleX = Math.max(0, e.hp / e.hpMax);
}

function killEnemy(e) {
  const s = activeScene;
  if (!s) return;
  kills++;
  if (killsText) killsText.setText('Kills: ' + kills);
  gainXP(ENEMY_TYPES[e.etype].xp);
  const idx = enemies.indexOf(e);
  if (idx !== -1) enemies.splice(idx, 1);
  if (enemyGroup) enemyGroup.remove(e);
  e.body.enable = false;
  if (e.hpBar) e.hpBar.destroy();
  if (e.hpBarBg) e.hpBarBg.destroy();
  if (e.kindLabel) e.kindLabel.destroy();
  e.hpBar = e.hpBarBg = null;
  /* Todesanimation: verblassen + kippen */
  s.tweens.add({
    targets: e, alpha: 0, angle: (Math.random() < 0.5 ? -1 : 1) * 50, duration: 280,
    ease: 'Quad.Out',
    onComplete: function () { e.destroy(); }
  });
  checkWaveClear();
}

/* ---------- Phase 5: Wellen & Kapitel ---------- */
function waveComposition(n) {   // n = 1-basierte Kapitelnummer
  const list = [];
  if (n === 1) {
    list.push('kk', 'kk', 'kk');
  } else if (n === 2) {
    list.push('kk', 'mh', 'kk', 'mh', 'kk');
  } else if (n === 3) {
    list.push('mh', 'kk', 'ik', 'kk', 'mh', 'mh');
  } else {
    const k = Math.min(2 + (n - 3), 6);
    const m = Math.min(n - 1, 6);
    const t = Math.min(Math.floor((n - 1) / 2), 3);
    for (let i = 0; i < k; i++) list.push('kk');
    for (let i = 0; i < m; i++) list.push('mh');
    for (let i = 0; i < t; i++) list.push('ik');
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
  }
  return list;
}

function startWave(n) {
  const s = activeScene;
  if (!s) return;
  waveIndex = n;
  waveState = 'running';
  waveQueue = waveComposition(n + 1);
  if (waveText) waveText.setText('Kapitel ' + (n + 1));
  /* Kapitel-Banner einblenden */
  const banner = s.add.text(GAME_W / 2, 150, 'KAPITEL ' + (n + 1), {
    fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#29e7ff'
  }).setOrigin(0.5).setDepth(8);
  s.tweens.add({
    targets: banner, alpha: 0, y: 120, duration: 1500, delay: 600, ease: 'Quad.Out',
    onComplete: function () { banner.destroy(); }
  });
  spawnFromQueue(s);
}

function spawnFromQueue(s) {
  if (gameState !== 'play' || waveState !== 'running') return;
  const type = waveQueue.shift();
  if (type) {
    spawnEnemy(s, type);
    if (waveQueue.length > 0) {
      s.time.delayedCall(WAVE_SPAWN_INTERVAL_MS, function () { spawnFromQueue(s); });
    }
  }
}

function spawnEnemy(s, typeId) {
  if (!s) return;
  const t = ENEMY_TYPES[typeId];
  const chapter = waveIndex + 1;
  const scaleHp = 1 + (chapter >= 4 ? (chapter - 3) * ENEMY_HP_GROWTH : 0);
  const hp = Math.round(t.hp * scaleHp);
  const e = s.add.rectangle(GAME_W + 60, GROUND_TOP - t.h / 2, t.w, t.h, t.color);
  s.physics.add.existing(e);
  e.etype = typeId;
  e.hp = hp;
  e.hpMax = hp;
  e.kindLabel = s.add.text(e.x, e.y - t.h / 2 - 14, t.name, {
    fontFamily: 'Arial, sans-serif', fontSize: '11px',
    color: '#' + t.color.toString(16).padStart(6, '0')
  }).setOrigin(0.5);
  e.hpBarBg = s.add.rectangle(e.x - 22, e.y - t.h / 2 - 6, 44, 5, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(3);
  e.hpBar = s.add.rectangle(e.x - 22, e.y - t.h / 2 - 6, 44, 5, COLORS.red).setOrigin(0, 0.5).setDepth(4);
  enemies.push(e);
  enemyGroup.add(e);   /* Kollision & Overlaps laufen über die Gruppe */
}

function checkWaveClear() {
  if (waveState !== 'running') return;
  if (waveQueue.length > 0 || enemies.length > 0) return;
  chapterComplete();
}

function chapterComplete() {
  const s = activeScene;
  if (!s || gameState !== 'play') return;
  waveState = 'intermission';
  const bonus = WAVE_CLEAR_BONUS_XP + waveIndex * 5;
  gainXP(bonus);
  const heal = Math.round(playerMaxHP * WAVE_CLEAR_HEAL);
  playerHP = Math.min(playerMaxHP, playerHP + heal);
  updateHPHud();
  /* Kapitel-Abschluss-Panel */
  const panel = s.add.rectangle(GAME_W / 2, GAME_H / 2, 480, 156, 0x000000, 0.72)
    .setStrokeStyle(2, COLORS.cyan, 0.6).setDepth(9);
  const t1 = s.add.text(GAME_W / 2, GAME_H / 2 - 42, 'KAPITEL ' + (waveIndex + 1) + ' GESCHAFFT!', {
    fontFamily: 'Arial, sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#52e38f'
  }).setOrigin(0.5).setDepth(10);
  const t2 = s.add.text(GAME_W / 2, GAME_H / 2 + 2,
    'Bonus: +' + bonus + ' XP · +' + heal + ' HP · Kills: ' + kills, {
    fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#dce8ff'
  }).setOrigin(0.5).setDepth(10);
  const t3 = s.add.text(GAME_W / 2, GAME_H / 2 + 38,
    'Waffe wechseln (1–5/Q) … nächstes Kapitel startet gleich', {
    fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#8fa3c8'
  }).setOrigin(0.5).setDepth(10);
  s.time.delayedCall(WAVE_INTERMISSION_MS, function () {
    if (gameState !== 'play' || activeScene !== s) return;
    [panel, t1, t2, t3].forEach(function (o) { o.destroy(); });
    startWave(waveIndex + 1);
  });
}

/* ---------- Phase 3: XP, Level & Speicherung ---------- */
function playerDamage() { return ATTACK_DAMAGE + (level - 1) * LEVEL_DMG_BONUS; }
function playerSpeed()   { return PLAYER_SPEED + (level - 1) * LEVEL_SPEED_BONUS; }
function playerMaxHp()   { return 100 + (level - 1) * LEVEL_HP_BONUS; }

function gainXP(amount) {
  xp += amount;
  let leveled = false;
  while (xp >= xpToNext) {
    xp -= xpToNext;
    level++;
    xpToNext = Math.round(xpToNext * LEVEL_XP_GROWTH);
    leveled = true;
  }
  if (leveled && player) {
    playerMaxHP = playerMaxHp();
    playerHP = Math.min(playerMaxHP, playerHP + LEVEL_HP_BONUS);
    updateHPHud();
    levelUpFx();
  }
  saveProgress();
  updateXPText();
}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ level: level, xp: xp, xpToNext: xpToNext }));
  } catch (e) { /* z. B. privater Modus: Spiel läuft ohne Save weiter */ }
}

function updateXPText() {
  if (levelText) levelText.setText('LV ' + level + ' · XP ' + xp + '/' + xpToNext);
  if (xpBar) xpBar.scaleX = Math.max(0, Math.min(1, xp / xpToNext));
}

function levelUpFx() {
  const s = activeScene;
  if (!s || !player) return;
  const t = s.add.text(player.x, player.y - 64, 'LEVEL UP! · LV ' + level, {
    fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffd166'
  }).setOrigin(0.5).setDepth(7);
  s.tweens.add({
    targets: t, y: t.y - 42, alpha: 0, duration: 1100, ease: 'Quad.Out',
    onComplete: function () { t.destroy(); }
  });
  player.setFillStyle(COLORS.yellow);
  s.time.delayedCall(220, function () { if (player.active) player.setFillStyle(COLORS.cyan); });
}

function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  level = 1; xp = 0; xpToNext = LEVEL_BASE_XP;
  playerMaxHP = playerMaxHp();
  playerHP = playerMaxHP;
  updateHPHud();
  updateXPText();
}

/* ---------- Phase 4: Waffen-Ende ---------- */

/* ---------- Debug-/Test-Hook (für automatisierte Checks) ---------- */
window.__saga = {
  get player() { return player; },
  get enemy() { return enemies.length ? enemies[enemies.length - 1] : null; },
  get enemies() { return enemies.slice(); },
  get hp() { return playerHP; },
  get maxHP() { return playerMaxHP; },
  get state() { return gameState; },
  get facing() { return facing; },
  get level() { return level; },
  get xp() { return xp; },
  get xpNext() { return xpToNext; },
  get wave() { return waveIndex + 1; },
  get waveState() { return waveState; },
  get weapon() { return currentWeapon; },
  setWeapon: function (id) { switchWeapon(id); },
  get kills() { return kills; },
  get enemyHp() { return enemies.length ? enemies[enemies.length - 1].hp : null; },
  get dmg() { return playerDamage(); },
  attack: function () { tryAttack(); },
  waveComposition: function (n) { return waveComposition(n); },
  giveXP: function (n) { gainXP(n); },
  resetSave: function () { resetSave(); },
  scene: function () { return activeScene; }
};
