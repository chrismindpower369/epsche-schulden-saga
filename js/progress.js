/* ============================================================
   Saga.Progress — Regeln für XP, Level und abgeleitete Werte.
   Einzige Stelle, an der Level, XP-Schwellen und die daraus
   folgenden Spielerwerte (Schaden, Tempo, maxHP) entstehen.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Progress = (function () {
  function playerDamage() { return Saga.Data.ATTACK_DAMAGE + (Saga.State.level - 1) * Saga.Data.LEVEL_DMG_BONUS; }
  function playerSpeed()  { return Saga.Data.PLAYER_SPEED  + (Saga.State.level - 1) * Saga.Data.LEVEL_SPEED_BONUS; }
  function playerMaxHp()  { return 100 + (Saga.State.level - 1) * Saga.Data.LEVEL_HP_BONUS; }

  function gainXp(amount) {
    var S = Saga.State;
    S.xp += amount;
    var leveled = false;
    while (S.xp >= S.xpToNext) {
      S.xp -= S.xpToNext;
      S.level++;
      S.xpToNext = Math.round(S.xpToNext * Saga.Data.LEVEL_XP_GROWTH);
      leveled = true;
    }
    if (leveled && S.player) {
      S.maxHp = playerMaxHp();
      S.hp = Math.min(S.maxHp, S.hp + Saga.Data.LEVEL_HP_BONUS);
      Saga.Hud.updateHp();
      Saga.Player.onLevelUp(S.scene, S.level);
    }
    Saga.Save.persist();
    Saga.Hud.updateXp();
  }

  /* Fortschritt verwerfen (Debug-Hook) und Spielerwerte zurück auf Start */
  function reset() {
    var S = Saga.State;
    Saga.Save.clearStorage();
    S.level = 1;
    S.xp = 0;
    S.xpToNext = Saga.Data.LEVEL_BASE_XP;
    S.maxHp = playerMaxHp();
    S.hp = S.maxHp;
    Saga.Hud.updateHp();
    Saga.Hud.updateXp();
  }

  return {
    playerDamage: playerDamage,
    playerSpeed: playerSpeed,
    playerMaxHp: playerMaxHp,
    gainXp: gainXp,
    reset: reset
  };
})();
