/* ============================================================
   Saga.Waves — Eigentümer des Kapitel-/Wellenablaufs:
   Zusammensetzung, gestaffeltes Erscheinen von rechts, Erkennen
   des Wellenendes, Kapitel-Abschluss mit Bonus und die Pause
   vor dem nächsten Kapitel.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Waves = (function () {
  /* n = 1-basierte Kapitelnummer */
  function composition(n) {
    var list = [];
    if (n === 1) {
      list.push('kk', 'kk', 'kk');
    } else if (n === 2) {
      list.push('kk', 'mh', 'kk', 'mh', 'kk');
    } else if (n === 3) {
      list.push('mh', 'kk', 'ik', 'kk', 'mh', 'mh');
    } else {
      var cards = Math.min(2 + (n - 3), 6);
      var reminders = Math.min(n - 1, 6);
      var collectors = Math.min(Math.floor((n - 1) / 2), 3);
      for (var i = 0; i < cards; i++) list.push('kk');
      for (var j = 0; j < reminders; j++) list.push('mh');
      for (var k = 0; k < collectors; k++) list.push('ik');
    }
    for (var m = list.length - 1; m > 0; m--) {
      var swap = Math.floor(Math.random() * (m + 1));
      var tmp = list[m];
      list[m] = list[swap];
      list[swap] = tmp;
    }
    return list;
  }

  function start(scene, n) {
    var S = Saga.State;
    S.waveIndex = n;
    S.waveState = 'running';
    S.waveQueue = composition(n + 1);
    Saga.Hud.setChapter(n + 1);
    Saga.Hud.chapterBanner(scene, n + 1);
    spawnFromQueue(scene);
  }

  function spawnFromQueue(scene) {
    var S = Saga.State;
    if (S.mode !== 'play' || S.waveState !== 'running') return;
    var type = S.waveQueue.shift();
    if (type) {
      Saga.Enemies.spawn(scene, type);
      if (S.waveQueue.length > 0) {
        scene.time.delayedCall(Saga.Data.WAVE_SPAWN_INTERVAL_MS, function () { spawnFromQueue(scene); });
      }
    }
  }

  /* Alles tot und nichts mehr in der Warteschlange → Kapitel geschafft */
  function checkClear(scene) {
    var S = Saga.State;
    if (S.waveState !== 'running') return;
    if (S.waveQueue.length > 0 || S.enemies.length > 0) return;
    chapterComplete(scene);
  }

  function chapterComplete(scene) {
    var S = Saga.State;
    var D = Saga.Data;
    if (!scene || S.mode !== 'play') return;

    S.waveState = 'intermission';
    var bonus = D.WAVE_CLEAR_BONUS_XP + S.waveIndex * 5;
    Saga.Progress.gainXp(bonus);
    var heal = Math.round(S.maxHp * D.WAVE_CLEAR_HEAL);
    S.hp = Math.min(S.maxHp, S.hp + heal);
    Saga.Hud.updateHp();

    var panel = Saga.Hud.chapterPanel(scene, {
      chapter: S.waveIndex + 1,
      bonus: bonus,
      heal: heal,
      kills: S.kills
    });

    scene.time.delayedCall(D.WAVE_INTERMISSION_MS, function () {
      if (S.mode !== 'play' || S.scene !== scene) return;
      panel.hide();
      start(scene, S.waveIndex + 1);
    });
  }

  return {
    composition: composition,
    start: start,
    checkClear: checkClear
  };
})();
