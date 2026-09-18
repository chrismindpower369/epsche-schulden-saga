/* ============================================================
   EPSCHE SCHULDEN SAGA — Side-Scroller Hack & Slash (Phaser 3)
   Phase 1: Seitenansicht · Gravity · Boden & Plattformen ·
            Springen · Gegner kommt von rechts · Gamepad-Support
   ------------------------------------------------------------
   Tastatur:
     A / D  oder  ← / →    : laufen
     W / ↑ / Leertaste     : springen
     R                     : Neustart (nach Niederlage)
   Gamepad:
     Linker Stick / D-Pad  : laufen
     A (unterer Button)    : springen
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
    enemy = s.add.rectangle(GAME_W + 60, GROUND_TOP - 40, 40, 26, COLORS.red);
    s.physics.add.existing(enemy);
    enemy.kindLabel = s.add.text(enemy.x, enemy.y - 30, 'KREDITKARTE', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#ff5e6c'
    }).setOrigin(0.5);

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
    s.add.text(GAME_W - 16, 18, 'Phase 1 · Side-Scroller', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#8fa3c8'
    }).setOrigin(1, 0).setDepth(5);
    s.add.text(GAME_W / 2, GAME_H - 14,
      'A/D oder Pfeiltasten laufen · W/↑/Leertaste springen · Gamepad: Linker Stick + A',
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

    /* Gegner: horizontale Verfolgung (kommt von rechts) */
    if (enemy && enemy.body) {
      const dir = enemy.x > player.x ? -1 : 1;
      enemy.body.setVelocityX(dir * ENEMY_BASE_SPEED);
      enemy.kindLabel.setPosition(enemy.x, enemy.y - 26);
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
  scene: function () { return activeScene; }
};
