/* ============================================================
   Saga.Enemies — Eigentümer aller Gegner: Erzeugen, Verfolgen,
   Treffer auflösen (Schaden, Flash, Betäubung, Knockback),
   Tod und Sterbe-Animation.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Enemies = (function () {
  /* Gegner erscheinen rechts außerhalb des Bildes */
  function spawn(scene, typeId) {
    if (!scene) return;
    var S = Saga.State;
    var type = Saga.Data.ENEMY_TYPES[typeId];
    var chapter = S.waveIndex + 1;
    var scaleHp = 1 + (chapter >= 4 ? (chapter - 3) * Saga.Data.ENEMY_HP_GROWTH : 0);
    var hp = Math.round(type.hp * scaleHp);

    var enemy = scene.add.rectangle(Saga.Data.GAME_W + 60, Saga.Data.GROUND_TOP - type.h / 2, type.w, type.h, type.color);
    scene.physics.add.existing(enemy);
    enemy.etype = typeId;
    enemy.baseColor = type.color;   /* Treffer-Flash muss die Typfarbe zurücksetzen, nicht immer Rot */
    enemy.hp = hp;
    enemy.hpMax = hp;
    enemy.stunUntil = 0;

    enemy.kindLabel = scene.add.text(enemy.x, enemy.y - type.h / 2 - 14, type.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#' + type.color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    enemy.hpBarBg = scene.add.rectangle(enemy.x - 22, enemy.y - type.h / 2 - 6, 44, 5, 0x000000, 0.5)
      .setOrigin(0, 0.5).setDepth(3);
    enemy.hpBar = scene.add.rectangle(enemy.x - 22, enemy.y - type.h / 2 - 6, 44, 5, Saga.Data.COLORS.red)
      .setOrigin(0, 0.5).setDepth(4);

    S.enemies.push(enemy);
    S.enemyGroup.add(enemy);   /* Kollision & Overlaps laufen über die Gruppe */
    return enemy;
  }

  /* Verfolgung nur horizontal; Betäubung lässt den Knockback wirken */
  function updateAll(scene) {
    var S = Saga.State;
    S.enemies.forEach(function (enemy) {
      if (!enemy.body) return;
      var type = Saga.Data.ENEMY_TYPES[enemy.etype];
      var dir = enemy.x > S.player.x ? -1 : 1;
      if (!enemy.stunUntil || scene.time.now >= enemy.stunUntil) {
        enemy.body.setVelocityX(dir * type.speed);
      }
      enemy.kindLabel.setPosition(enemy.x, enemy.y - type.h / 2 - 14);
      if (enemy.hpBarBg) {
        enemy.hpBarBg.setPosition(enemy.x - 22, enemy.y - type.h / 2 - 6);
        enemy.hpBar.setPosition(enemy.x - 22, enemy.y - type.h / 2 - 6);
      }
      /* Sicherheitsnetz: Gegner darf nie unter die Welt fallen */
      if (enemy.y > Saga.Data.GAME_H + 300) {
        enemy.setPosition(Saga.Data.GAME_W + 60, Saga.Data.GROUND_TOP - type.h / 2);
        enemy.body.setVelocity(0, 0);
      }
    });
  }

  function hit(enemy, dmg, dir) {
    var scene = Saga.State.scene;
    enemy.hp -= dmg;
    enemy.setFillStyle(0xffffff);                 /* Treffer-Flash */
    scene.time.delayedCall(90, function () {
      if (enemy.active) enemy.setFillStyle(enemy.baseColor || Saga.Data.COLORS.red);
    });
    enemy.body.setVelocityX(dir * Saga.Data.KNOCKBACK_X);   /* Knockback weg vom Spieler */
    enemy.body.setVelocityY(Saga.Data.KNOCKBACK_Y);
    enemy.stunUntil = scene.time.now + Saga.Data.HIT_STUN_MS;
    updateBar(enemy);
    if (enemy.hp <= 0) kill(scene, enemy);
  }

  function updateBar(enemy) {
    if (enemy.hpBar) enemy.hpBar.scaleX = Math.max(0, enemy.hp / enemy.hpMax);
  }

  function kill(scene, enemy) {
    if (!scene) return;
    var S = Saga.State;
    S.kills++;
    Saga.Hud.updateKills();
    Saga.Progress.gainXp(Saga.Data.ENEMY_TYPES[enemy.etype].xp);

    var index = S.enemies.indexOf(enemy);
    if (index !== -1) S.enemies.splice(index, 1);
    if (S.enemyGroup) S.enemyGroup.remove(enemy);
    enemy.body.enable = false;
    if (enemy.hpBar) enemy.hpBar.destroy();
    if (enemy.hpBarBg) enemy.hpBarBg.destroy();
    if (enemy.kindLabel) enemy.kindLabel.destroy();
    enemy.hpBar = enemy.hpBarBg = null;

    /* Todesanimation: verblassen + kippen */
    scene.tweens.add({
      targets: enemy, alpha: 0, angle: (Math.random() < 0.5 ? -1 : 1) * 50, duration: 280,
      ease: 'Quad.Out',
      onComplete: function () { enemy.destroy(); }
    });

    Saga.Waves.checkClear(scene);
  }

  /* Nächster Gegner zum Spieler — Hook-Zugriff muss eindeutig sein, nicht "letzter im Array" */
  function nearest() {
    var S = Saga.State;
    if (!S.player || !S.enemies.length) return null;
    return S.enemies.reduce(function (best, enemy) {
      var d = Math.abs(enemy.x - S.player.x);
      return (!best || d < Math.abs(best.x - S.player.x)) ? enemy : best;
    }, null);
  }

  return {
    spawn: spawn,
    updateAll: updateAll,
    hit: hit,
    kill: kill,
    nearest: nearest
  };
})();
