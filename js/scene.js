/* ============================================================
   Saga.Scene — Eigentümer des Szenen-Lebenszyklus: Welt aufbauen,
   Objekte verdrahten (Kollisionen, Overlaps), HUD aufbauen und
   das erste Kapitel starten. Hier laufen die Fäden zusammen,
   die Spiellogik selbst liegt in den anderen Modulen.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Scene = (function () {
  /* Boden + Plattformen (statisch) */
  function buildWorld(scene) {
    var D = Saga.Data;
    var C = D.COLORS;
    var S = Saga.State;

    scene.physics.world.setBounds(0, 0, D.GAME_W, D.GAME_H);

    var ground = scene.add.rectangle(D.GAME_W / 2, D.GROUND_TOP + 45, D.GAME_W + 300, 90, C.panel);
    scene.physics.add.existing(ground, true);
    S.solids.push(ground);
    scene.add.rectangle(D.GAME_W / 2, D.GROUND_TOP + 1, D.GAME_W, 3, C.cyan, 0.5).setDepth(1);

    [[240, 360, 170], [660, 320, 170]].forEach(function (p) {
      var platform = scene.add.rectangle(p[0], p[1], p[2], 16, C.panel, 0.95)
        .setStrokeStyle(1, C.cyan, 0.35);
      scene.physics.add.existing(platform, true);
      S.solids.push(platform);
    });
  }

  function gameOver() {
    Saga.State.mode = 'over';
    Saga.Hud.gameOver(Saga.State.scene);
  }

  class GameScene extends Phaser.Scene {
    constructor() { super('game'); }

    create() {
      var S = Saga.State;

      S.scene = this;

      /* Zustand zurücksetzen (auch nach Restart); Level/XP bleiben erhalten.
         Erst die alten HUD-Referenzen vergessen, dann alles neu aufbauen. */
      Saga.Hud.reset();
      S.resetForNewScene();

      buildWorld(this);
      Saga.Player.create(this);

      S.enemyGroup = this.physics.add.group();

      S.solids.forEach(function (solid) {
        this.physics.add.collider(S.player, solid);
        this.physics.add.collider(S.enemyGroup, solid);
      }, this);
      this.physics.add.overlap(S.player, S.enemyGroup, function () {
        Saga.Player.takeDamage(Saga.Data.CONTACT_DAMAGE);
      });

      Saga.Input.bind(this);
      Saga.Hud.build(this);

      /* Kapitel 1 startet zuletzt, damit HUD und Kapitel-Label bereits existieren */
      Saga.Waves.start(this, 0);
    }

    update(time, delta) {
      var S = Saga.State;
      if (!S.scene) return;

      /* Neustart (immer verfügbar, auch nach Niederlage) */
      if (Saga.Input.restartPressed()) {
        S.scene.scene.restart();
        return;
      }
      if (S.mode === 'over') {
        S.player.body.setVelocity(0);
        S.enemies.forEach(function (enemy) { if (enemy.body) enemy.body.setVelocity(0); });
        return;
      }

      Saga.Player.move();

      if (Saga.Input.jumpPressed() && Saga.Player.isGrounded()) Saga.Player.jump();
      if (Saga.Input.attackPressed()) Saga.Player.attack();

      Saga.Input.weaponPressed().forEach(function (id) { Saga.Player.switchWeapon(id); });
      if (Saga.Input.cyclePressed()) Saga.Player.cycleWeapon();

      Saga.Enemies.updateAll(S.scene);
    }
  }

  return {
    GameScene: GameScene,
    gameOver: gameOver
  };
})();
