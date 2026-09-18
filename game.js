/* ============================================================
   EPSCHE SCHULDEN SAGA — Side-Scroller Hack & Slash (Phaser 3)
   Phase 1+2: Seitenansicht · Gravity · Boden & Plattformen ·
            Springen · Gegner von rechts · Nahkampfangriff mit Hitbox
   ------------------------------------------------------------
   Tastatur:
     A / D  oder  ← / →    : laufen
     W / ↑ / Leertaste     : springen
     J / K                 : Nahkampfangriff
     R                     : Neustart (nach Niederlage)
   Gamepad:
     Linker Stick / D-Pad  : laufen
     A (unterer Button)    : springen
     X (linker Button)     : Nahkampfangriff (B funktioniert auch)
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
const ENEMY_BASE_SPEED = 70;
const CONTACT_DAMAGE = 8;        // Schaden pro Berührung (mit i-Frames, statt -1 pro Frame)
const INVULN_MS = 600;

/* Phase 2: Angriff */
const ATTACK_DAMAGE = 10;
const ATTACK_COOLDOWN_MS = 320;
const ATTACK_HITBOX = { offX: 36, w: 56, h: 46 }; // vor dem Spieler, in Blickrichtung
const ENEMY_MAX_HP = 30;
const ENEMY_RESPAWN_MS = 1400;   // neue Kreditkarte läuft nach (Wellen folgen in Phase 5)
const KNOCKBACK_X = 200;
const KNOCKBACK_Y = -140;

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
let enemy = null;              // Phase 1: genau ein Gegner
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

/* ---------- Szene ---------- */
class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    const s = this;
    activeScene = s;

    // Zustand zurücksetzen (auch nach Restart)
    playerMaxHP = 100;
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

    /* Gegner: spawnt rechts außerhalb des sichtbaren Bereichs und läuft nach links */
    spawnEnemy(s);

    /* Kollisionen */
    staticSolids.forEach(function (solid) {
      s.physics.add.collider(player, solid);
      s.physics.add.collider(enemy, solid);
    });
    s.physics.add.overlap(player, enemy, function () { damagePlayer(CONTACT_DAMAGE); });

    /* Eingaben */
    keys = s.input.keyboard.addKeys('W,A,S,D,SPACE,J,K,R');
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
    killsText = s.add.text(GAME_W - 16, 18, 'Kills: 0 · Phase 2 · Hack & Slash', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#8fa3c8'
    }).setOrigin(1, 0).setDepth(5);
    s.add.text(GAME_W / 2, GAME_H - 14,
      'A/D laufen · W/↑/Leertaste springen · J/K angreifen · Gamepad: Stick + A springen, X angreifen',
      { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#aab9d8' }
    ).setOrigin(0.5).setDepth(5);

    updateHPHud();
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
      if (enemy && enemy.body) enemy.body.setVelocity(0);
      return;
    }

    /* Spieler-Bewegung: nur X-Achse */
    let vx = 0;
    if (keys.A.isDown || cursors.left.isDown) vx = -PLAYER_SPEED;
    else if (keys.D.isDown || cursors.right.isDown) vx = PLAYER_SPEED;

    if (pad) {
      const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      if (Math.abs(ax) > 0.15) vx = ax * PLAYER_SPEED;
      if (padDown(14)) vx = -PLAYER_SPEED; // D-Pad links
      if (padDown(15)) vx = PLAYER_SPEED;  // D-Pad rechts
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

    /* Gegner: horizontale Verfolgung (kommt von rechts) */
    if (enemy && enemy.body) {
      const dir = enemy.x > player.x ? -1 : 1;
      enemy.body.setVelocityX(dir * ENEMY_BASE_SPEED);
      enemy.kindLabel.setPosition(enemy.x, enemy.y - 26);
      if (enemy.hpBarBg) {
        enemy.hpBarBg.setPosition(enemy.x - 22, enemy.y - 44);
        enemy.hpBar.setPosition(enemy.x - 22, enemy.y - 44);
      }
      /* Sicherheitsnetz: Gegner darf nie unter die Welt fallen */
      if (enemy.y > GAME_H + 300) {
        enemy.setPosition(GAME_W + 60, GROUND_TOP - 40);
        enemy.body.setVelocity(0, 0);
      }
      /* Falls der Gegner links aus dem Bild läuft: von rechts neu anlaufen lassen */
      if (enemy.x < -60) enemy.setPosition(GAME_W + 60, GROUND_TOP - 40);
    }
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

/* ---------- Phase 2: Angriff, Hitbox, Gegner-HP & Tod ---------- */
function tryAttack() {
  const s = activeScene;
  if (!s || gameState !== 'play' || !player) return;
  const now = s.time.now;
  if (now < attackCooldownUntil) return;
  attackCooldownUntil = now + ATTACK_COOLDOWN_MS;
  swingId++;

  const hx = player.x + facing * ATTACK_HITBOX.offX;
  const hy = player.y - 4;

  /* sichtbarer Slash-Effekt */
  const slash = s.add.rectangle(hx, hy, ATTACK_HITBOX.w - 10, 9, COLORS.yellow, 0.85).setDepth(4);
  s.tweens.add({
    targets: slash, alpha: 0, scaleX: 1.6, angle: facing * 24, duration: 150,
    onComplete: function () { slash.destroy(); }
  });

  /* unsichtbare, kurzlebige Hitbox; trifft jeden Gegner max. 1× pro Schwung */
  const hitbox = s.add.rectangle(hx, hy, ATTACK_HITBOX.w, ATTACK_HITBOX.h, 0xffffff, 0.001);
  s.physics.add.existing(hitbox);
  hitbox.body.setAllowGravity(false);
  const col = s.physics.add.overlap(hitbox, enemy, function () {
    if (enemy && enemy.active && enemy.lastSwingHit !== swingId) {
      enemy.lastSwingHit = swingId;
      hitEnemy(enemy, ATTACK_DAMAGE, facing);
    }
  });
  s.time.delayedCall(130, function () {
    if (col && col.active) s.physics.world.removeCollider(col);
    hitbox.destroy();
  });
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
  if (e.hpBar) e.hpBar.scaleX = Math.max(0, e.hp / ENEMY_MAX_HP);
}

function killEnemy(e) {
  const s = activeScene;
  if (!s) return;
  kills++;
  if (killsText) killsText.setText('Kills: ' + kills + ' · Phase 2 · Hack & Slash');
  e.body.enable = false;
  (e.colliders || []).forEach(function (c) { if (c && c.active) s.physics.world.removeCollider(c); });
  if (e.hpBar) e.hpBar.destroy();
  if (e.hpBarBg) e.hpBarBg.destroy();
  if (e.kindLabel) e.kindLabel.destroy();
  e.hpBar = e.hpBarBg = null;
  if (enemy === e) enemy = null;
  /* Todesanimation: verblassen + kippen */
  s.tweens.add({
    targets: e, alpha: 0, angle: (Math.random() < 0.5 ? -1 : 1) * 50, duration: 280,
    ease: 'Quad.Out',
    onComplete: function () { e.destroy(); }
  });
  /* Nächste Kreditkarte läuft nach (bis Phase 5 richtige Wellen kommen) */
  s.time.delayedCall(ENEMY_RESPAWN_MS, function () {
    if (gameState === 'play' && activeScene === s) spawnEnemy(s);
  });
}

function spawnEnemy(s) {
  if (!s || enemy) return;
  enemy = s.add.rectangle(GAME_W + 60, GROUND_TOP - 40, 40, 26, COLORS.red);
  s.physics.add.existing(enemy);
  enemy.hp = ENEMY_MAX_HP;
  enemy.kindLabel = s.add.text(enemy.x, enemy.y - 30, 'KREDITKARTE', {
    fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#ff5e6c'
  }).setOrigin(0.5);
  enemy.hpBarBg = s.add.rectangle(enemy.x - 22, enemy.y - 44, 44, 5, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(3);
  enemy.hpBar = s.add.rectangle(enemy.x - 22, enemy.y - 44, 44, 5, COLORS.red).setOrigin(0, 0.5).setDepth(4);
  /* Kollisionen mit Boden/Plattformen + Kontaktschaden am Spieler neu registrieren */
  enemy.colliders = staticSolids.map(function (solid) { return s.physics.add.collider(enemy, solid); });
  enemy.colliders.push(s.physics.add.overlap(player, enemy, function () { damagePlayer(CONTACT_DAMAGE); }));
}

/* ---------- Debug-/Test-Hook (für automatisierte Checks) ---------- */
window.__saga = {
  get player() { return player; },
  get enemy() { return enemy; },
  get enemies() { return enemy ? [enemy] : []; },
  get hp() { return playerHP; },
  get maxHP() { return playerMaxHP; },
  get state() { return gameState; },
  get facing() { return facing; },
  get level() { return null; },
  get wave() { return null; },
  get weapon() { return null; },
  get kills() { return kills; },
  get enemyHp() { return enemy ? enemy.hp : null; },
  attack: function () { tryAttack(); },
  scene: function () { return activeScene; }
};
