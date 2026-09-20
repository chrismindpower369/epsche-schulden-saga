/* ============================================================
   Saga.Player — Eigentümer des Spielers: Körper, Bewegung,
   Sprung, Angriff (inkl. Hitbox und Waffen-Effekten), Waffe
   wechseln und Schadenseingang mit Unverwundbarkeitsfenster.
   Was ein Treffer bei einem Gegner auslöst, gehört Saga.Enemies.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Player = (function () {
  function create(scene) {
    var S = Saga.State;
    var player = scene.add.rectangle(140, Saga.Data.GROUND_TOP - 60, 26, 56, Saga.Data.COLORS.cyan);
    scene.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    S.player = player;
    S.facing = 1;
    return player;
  }

  /* Laufen: nur X-Achse; Gamepad übersteuert die Tastatur */
  function move() {
    var S = Saga.State;
    var keys = S.keys;
    var cursors = S.cursors;
    var speed = Saga.Progress.playerSpeed();
    var vx = 0;

    if (keys.A.isDown || cursors.left.isDown) vx = -speed;
    else if (keys.D.isDown || cursors.right.isDown) vx = speed;

    if (S.pad) {
      var ax = Saga.Input.padAxisX();
      if (Math.abs(ax) > 0.15) vx = ax * speed;
      if (Saga.Input.padDown(14)) vx = -speed;   /* D-Pad links */
      if (Saga.Input.padDown(15)) vx = speed;    /* D-Pad rechts */
    }

    S.player.body.setVelocityX(vx);
    if (vx < 0) S.facing = -1; else if (vx > 0) S.facing = 1;
  }

  function isGrounded() {
    var body = Saga.State.player.body;
    return body.blocked.down || body.touching.down;
  }

  function jump() {
    Saga.State.player.body.setVelocityY(-Saga.Data.JUMP_VELOCITY);
  }

  /* Nahkampfangriff: kurze Hitbox vor dem Spieler, trifft jeden Gegner max. 1× pro Schwung */
  function attack() {
    var S = Saga.State;
    var scene = S.scene;
    if (!scene || S.mode !== 'play' || !S.player) return;

    var now = scene.time.now;
    var weapon = Saga.Data.WEAPONS[S.weapon];
    if (now < S.attackCooldownUntil) return;
    S.attackCooldownUntil = now + weapon.cooldown;
    S.swingId++;

    var dmg = Math.round(Saga.Progress.playerDamage() * weapon.dmgMult);
    var hx = S.player.x + S.facing * weapon.offX;
    var hy = S.player.y - 4;

    spawnFx(scene, weapon, hx, hy);

    var hitbox = scene.add.rectangle(hx, hy, weapon.w, weapon.h, 0xffffff, 0.001);
    scene.physics.add.existing(hitbox);
    hitbox.body.setAllowGravity(false);

    var overlap = scene.physics.add.overlap(hitbox, S.enemyGroup, function (hb, enemy) {
      if (enemy && enemy.active && enemy.lastSwingHit !== S.swingId) {
        enemy.lastSwingHit = S.swingId;
        Saga.Enemies.hit(enemy, dmg, S.facing);
      }
    });

    scene.time.delayedCall(130, function () {
      if (overlap && overlap.active) scene.physics.world.removeCollider(overlap);
      hitbox.destroy();
    });
  }

  /* Sichtbare Waffen-Effekte (Shapes + Tweens, bis echte Sprites kommen) */
  function spawnFx(scene, weapon, hx, hy) {
    var px = Saga.State.player.x;
    var py = Saga.State.player.y - 4;
    var facing = Saga.State.facing;

    if (weapon.anim === 'slash') {
      /* Feuerschwert: Balken schwingt vor den Spieler */
      var slash = scene.add.rectangle(hx, hy, weapon.w - 12, 10, weapon.color, 0.9).setDepth(4);
      scene.tweens.add({
        targets: slash, alpha: 0, scaleX: 1.6, angle: facing * 26, duration: 160,
        onComplete: function () { slash.destroy(); }
      });
    } else if (weapon.anim === 'spin') {
      /* Staff: langes Rechteck rotiert um den Spieler */
      for (let i = 0; i < 2; i++) {
        const staff = scene.add.rectangle(px, py, weapon.w - 20, 8, weapon.color, 0.9).setDepth(4).setAngle(i * 180);
        scene.tweens.add({
          targets: staff, angle: staff.angle + facing * 360, alpha: 0, duration: 280, ease: 'Cubic.Out',
          onComplete: function () { staff.destroy(); }
        });
      }
    } else if (weapon.anim === 'circle') {
      /* Poi: zwei Kreise kreisen um den Spieler */
      var orb = { a: 0 };
      var c1 = scene.add.circle(px, py, 7, weapon.color, 0.95).setDepth(4);
      var c2 = scene.add.circle(px, py, 7, weapon.color, 0.95).setDepth(4);
      var radius = 48;
      scene.tweens.add({
        targets: orb, a: facing * Math.PI * 2, duration: 320, ease: 'Cubic.Out',
        onUpdate: function () {
          if (!c1.active) return;
          c1.setPosition(px + Math.cos(orb.a) * radius, py + Math.sin(orb.a) * radius * 0.55);
          c2.setPosition(px - Math.cos(orb.a) * radius, py - Math.sin(orb.a) * radius * 0.55);
        },
        onComplete: function () { c1.destroy(); c2.destroy(); }
      });
    } else if (weapon.anim === 'thrust') {
      /* Rope Dart: schmaler langer Strahl schießt nach vorn */
      var dart = scene.add.rectangle(px + facing * 8, py, weapon.w, 10, weapon.color, 0.9)
        .setOrigin(0, 0.5).setDepth(4).setScale(0.25, 1);
      if (facing < 0) dart.setAngle(180);
      scene.tweens.add({
        targets: dart, scaleX: 1, alpha: 0, duration: 200, ease: 'Quad.Out',
        onComplete: function () { dart.destroy(); }
      });
    }
  }

  function switchWeapon(id) {
    var S = Saga.State;
    var weapons = Saga.Data.WEAPONS;
    if (!weapons[id] || S.weapon === id) return;
    S.weapon = id;
    Saga.Hud.updateWeapon();
    /* kleiner Wechsel-Effekt am Spieler */
    if (S.player && S.scene) {
      S.player.setFillStyle(weapons[id].color);
      S.scene.time.delayedCall(180, function () {
        if (S.player.active) S.player.setFillStyle(Saga.Data.COLORS.cyan);
      });
    }
  }

  function cycleWeapon() {
    var order = Saga.Data.WEAPON_ORDER;
    var next = order[(order.indexOf(Saga.State.weapon) + 1) % order.length];
    switchWeapon(next);
  }

  /* Schaden mit Unverwundbarkeitsfenster (i-Frames) */
  function takeDamage(amount) {
    var S = Saga.State;
    var scene = S.scene;
    if (!scene || S.mode !== 'play') return;

    var now = scene.time.now;
    if (now < S.invulnUntil || S.hp <= 0) return;

    S.hp = Math.max(0, S.hp - amount);
    S.invulnUntil = now + Saga.Data.INVULN_MS;
    scene.tweens.add({
      targets: S.player, alpha: 0.35, duration: 90, yoyo: true, repeat: 3,
      onComplete: function () { if (S.player) S.player.setAlpha(1); }
    });
    Saga.Hud.updateHp();
    if (S.hp <= 0) Saga.Scene.gameOver();
  }

  /* Level-Up: Spieler leuchtet kurz auf und meldet den neuen Level */
  function onLevelUp(scene, level) {
    var S = Saga.State;
    if (!scene || !S.player) return;
    Saga.Hud.levelUpText(scene, S.player.x, S.player.y - 64, level);
    S.player.setFillStyle(Saga.Data.COLORS.yellow);
    scene.time.delayedCall(220, function () {
      if (S.player.active) S.player.setFillStyle(Saga.Data.COLORS.cyan);
    });
  }

  return {
    create: create,
    move: move,
    isGrounded: isGrounded,
    jump: jump,
    attack: attack,
    switchWeapon: switchWeapon,
    cycleWeapon: cycleWeapon,
    takeDamage: takeDamage,
    onLevelUp: onLevelUp
  };
})();
