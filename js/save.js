/* ============================================================
   Saga.Save — einziger Zugang zu LocalStorage.
   Speichert nur den Fortschritt (level, xp, xpToNext). Alle
   Zugriffe sind gekapselt, damit das Spiel auch ohne Storage
   läuft (privater Modus, file://-Aufruf).
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Save = {
  /* Persistierten Fortschritt einmalig beim Laden übernehmen */
  load: function () {
    try {
      var raw = localStorage.getItem(Saga.Data.SAVE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (typeof d.level === 'number' && d.level >= 1) Saga.State.level = Math.min(50, Math.floor(d.level));
      if (typeof d.xp === 'number' && d.xp >= 0) Saga.State.xp = Math.floor(d.xp);
      if (typeof d.xpToNext === 'number' && d.xpToNext > 0) Saga.State.xpToNext = Math.floor(d.xpToNext);
    } catch (e) { /* korrupte/gesperrte Daten ignorieren */ }
  },

  persist: function () {
    try {
      localStorage.setItem(Saga.Data.SAVE_KEY, JSON.stringify({
        level: Saga.State.level,
        xp: Saga.State.xp,
        xpToNext: Saga.State.xpToNext
      }));
    } catch (e) { /* z. B. privater Modus: Spiel läuft ohne Save weiter */ }
  },

  clearStorage: function () {
    try { localStorage.removeItem(Saga.Data.SAVE_KEY); } catch (e) {}
  }
};

/* Fortschritt sofort übernehmen, noch vor dem Szenenaufbau */
Saga.Save.load();
