/* ============================================================
   Saga.Hud — einziger Eigentümer aller Bildschirm-Elemente
   (Leisten, Texte, Banner, Panels, Niederlage-Overlay).
   Die Objekte liegen bewusst nur in diesem Modul: Nach einem
   scene.restart werden sie über reset()/build() komplett neu
   aufgebaut, statt auf zerstörte Objekte zu zeigen.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Hud = (function () {
  var refs = {};

  function font(size, extra) {
    var style = { fontFamily: 'Arial, sans-serif', fontSize: size, color: '#ffffff' };
    if (extra) {
      for (var key in extra) { if (extra.hasOwnProperty(key)) style[key] = extra[key]; }
    }
    return style;
  }

  function build(scene) {
    var C = Saga.Data.COLORS;
    var W = Saga.Data.GAME_W;
    var H = Saga.Data.GAME_H;

    refs.hpBarBg = scene.add.rectangle(130, 28, 220, 18, 0x000000, 0.55)
      .setStrokeStyle(1, C.cyan, 0.5).setDepth(5);
    refs.hpBar = scene.add.rectangle(22, 21, 216, 12, C.cyan).setOrigin(0, 0).setDepth(6);
    refs.hpText = scene.add.text(24, 20, '', font('12px')).setDepth(6);
    refs.killsText = scene.add.text(W - 16, 18, 'Kills: 0',
      font('12px', { color: '#8fa3c8' })).setOrigin(1, 0).setDepth(5);
    refs.weaponText = scene.add.text(24, 78, '',
      font('12px', { color: '#ffd166' })).setDepth(6);
    refs.chapterText = scene.add.text(W / 2, 18, '',
      font('14px', { fontStyle: 'bold', color: '#29e7ff' })).setOrigin(0.5).setDepth(6);
    refs.levelText = scene.add.text(24, 44, '',
      font('12px', { color: '#b28dff' })).setDepth(6);
    refs.xpBarBg = scene.add.rectangle(22, 62, 220, 10, 0x000000, 0.55).setOrigin(0, 0)
      .setStrokeStyle(1, C.purple, 0.5).setDepth(5);
    refs.xpBar = scene.add.rectangle(24, 64, 216, 6, C.purple).setOrigin(0, 0).setDepth(6);
    refs.helpText = scene.add.text(W / 2, H - 14,
      'A/D laufen · W/↑/Leertaste springen · J/K angreifen · 1–5/Q Waffe · Gamepad: Stick, A springen, X angreifen, LB/RB Waffe',
      font('12px', { color: '#aab9d8' })).setOrigin(0.5).setDepth(5);

    updateHp();
    updateXp();
    updateWeapon();
  }

  /* Objekte der vorherigen Szene vergessen (nach scene.restart zerstört) */
  function reset() {
    refs = {};
  }

  function updateHp() {
    if (!refs.hpBar || !refs.hpText) return;
    var C = Saga.Data.COLORS;
    var pct = Math.max(0, Saga.State.hp / Saga.State.maxHp);
    refs.hpBar.setSize(Math.round(216 * pct), 12);
    refs.hpBar.setFillStyle(pct > 0.5 ? C.cyan : (pct > 0.25 ? C.yellow : C.red));
    refs.hpText.setText('HP ' + Saga.State.hp + '/' + Saga.State.maxHp);
  }

  function updateXp() {
    if (refs.levelText) refs.levelText.setText('LV ' + Saga.State.level + ' · XP ' + Saga.State.xp + '/' + Saga.State.xpToNext);
    if (refs.xpBar) refs.xpBar.scaleX = Math.max(0, Math.min(1, Saga.State.xp / Saga.State.xpToNext));
  }

  function updateWeapon() {
    if (refs.weaponText) refs.weaponText.setText('Waffe: ' + Saga.Data.WEAPONS[Saga.State.weapon].name + '  (1–5 / Q)');
  }

  function updateKills() {
    if (refs.killsText) refs.killsText.setText('Kills: ' + Saga.State.kills);
  }

  function setChapter(number) {
    if (refs.chapterText) refs.chapterText.setText('Kapitel ' + number);
  }

  /* Kapitel-Banner beim Start einer Welle */
  function chapterBanner(scene, number) {
    var banner = scene.add.text(Saga.Data.GAME_W / 2, 150, 'KAPITEL ' + number,
      font('34px', { fontStyle: 'bold', color: '#29e7ff' })).setOrigin(0.5).setDepth(8);
    scene.tweens.add({
      targets: banner, alpha: 0, y: 120, duration: 1500, delay: 600, ease: 'Quad.Out',
      onComplete: function () { banner.destroy(); }
    });
  }

  /* Abschluss-Panel einer Welle; hide() räumt es wieder weg */
  function chapterPanel(scene, summary) {
    var C = Saga.Data.COLORS;
    var cx = Saga.Data.GAME_W / 2;
    var cy = Saga.Data.GAME_H / 2;
    var panel = scene.add.rectangle(cx, cy, 480, 156, 0x000000, 0.72)
      .setStrokeStyle(2, C.cyan, 0.6).setDepth(9);
    var title = scene.add.text(cx, cy - 42, 'KAPITEL ' + summary.chapter + ' GESCHAFFT!',
      font('26px', { fontStyle: 'bold', color: '#52e38f' })).setOrigin(0.5).setDepth(10);
    var stats = scene.add.text(cx, cy + 2,
      'Bonus: +' + summary.bonus + ' XP · +' + summary.heal + ' HP · Kills: ' + summary.kills,
      font('15px', { color: '#dce8ff' })).setOrigin(0.5).setDepth(10);
    var hint = scene.add.text(cx, cy + 38,
      'Waffe wechseln (1–5/Q) … nächstes Kapitel startet gleich',
      font('13px', { color: '#8fa3c8' })).setOrigin(0.5).setDepth(10);

    return {
      hide: function () {
        [panel, title, stats, hint].forEach(function (o) { o.destroy(); });
      }
    };
  }

  /* Niederlage-Overlay */
  function gameOver(scene) {
    scene.add.rectangle(Saga.Data.GAME_W / 2, Saga.Data.GAME_H / 2, Saga.Data.GAME_W, Saga.Data.GAME_H, 0x000000, 0.6).setDepth(10);
    scene.add.text(Saga.Data.GAME_W / 2, Saga.Data.GAME_H / 2 - 24, 'NIEDERLAGE',
      font('40px', { fontStyle: 'bold', color: '#ff5e6c' })).setOrigin(0.5).setDepth(11);
    scene.add.text(Saga.Data.GAME_W / 2, Saga.Data.GAME_H / 2 + 22,
      'Die Schulden waren schneller. · R oder Start für Neustart',
      font('16px', { color: '#dce8ff' })).setOrigin(0.5).setDepth(11);
  }

  /* Aufsteigender Text beim Level-Up */
  function levelUpText(scene, x, y, level) {
    var text = scene.add.text(x, y, 'LEVEL UP! · LV ' + level,
      font('18px', { fontStyle: 'bold', color: '#ffd166' })).setOrigin(0.5).setDepth(7);
    scene.tweens.add({
      targets: text, y: text.y - 42, alpha: 0, duration: 1100, ease: 'Quad.Out',
      onComplete: function () { text.destroy(); }
    });
  }

  return {
    build: build,
    reset: reset,
    updateHp: updateHp,
    updateXp: updateXp,
    updateWeapon: updateWeapon,
    updateKills: updateKills,
    setChapter: setChapter,
    chapterBanner: chapterBanner,
    chapterPanel: chapterPanel,
    gameOver: gameOver,
    levelUpText: levelUpText
  };
})();
