/* ============================================================
   Saga.Input — einziger Ort, an dem Tasten und Gamepad zu
   Absichten werden. Flanken werden genau einmal pro Frame
   abgefragt (edge), damit kein Frame eine Eingabe verschluckt.
   ============================================================ */
'use strict';

window.Saga = window.Saga || {};

Saga.Input = (function () {
  /* Tasten des Gamepads, auf die das Spiel hört */
  var PAD = {
    jump: [0, 12],     /* A (unten) / D-Pad hoch */
    attack: [2, 1],    /* X (links) / B (rechts) */
    left: 14,
    right: 15,
    weaponPrev: 4,     /* LB */
    weaponNext: 5,     /* RB */
    restart: 9         /* Start */
  };

  var WEAPON_KEYS = [
    ['ONE', 'sword'],
    ['TWO', 'dragon'],
    ['THREE', 'contact'],
    ['FOUR', 'poi'],
    ['FIVE', 'dart']
  ];

  function padDown(index) {
    var pad = Saga.State.pad;
    return !!(pad && pad.buttons[index] && pad.buttons[index].pressed);
  }

  /* Flankenerkennung: true nur beim Übergang nicht-gedrückt → gedrückt */
  function edge(name, pressed) {
    var prev = Saga.State.edgePrev;
    var was = prev[name] || false;
    prev[name] = !!pressed;
    return pressed && !was;
  }

  function anyPadDown(list) {
    for (var i = 0; i < list.length; i++) {
      if (padDown(list[i])) return true;
    }
    return false;
  }

  return {
    padDown: padDown,
    edge: edge,

    /* Tastatur & Gamepad an die laufende Szene binden */
    bind: function (scene) {
      Saga.State.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE,J,K,R,Q,ONE,TWO,THREE,FOUR,FIVE');
      Saga.State.cursors = scene.input.keyboard.createCursorKeys();
      if (scene.input.gamepad) {
        scene.input.gamepad.removeAllListeners();
        scene.input.gamepad.on('connected', function (p) { Saga.State.pad = p; });
        /* Beim Trennen den Griff lösen: Phaser behält den Gamepad-Wrapper und
           friert dessen letzte Werte ein, sonst läuft der Stickman mit dem
           zuletzt gehaltenen Stick/Steuerkreuz endlos weiter. */
        scene.input.gamepad.on('disconnected', function (p) {
          if (!p || p === Saga.State.pad) Saga.State.pad = null;
        });
        if (scene.input.gamepad.pad1) Saga.State.pad = scene.input.gamepad.pad1;  /* falls schon verbunden */
      }
    },

    restartPressed: function () {
      return edge('restart', Saga.State.keys.R.isDown || padDown(PAD.restart));
    },

    jumpPressed: function () {
      var k = Saga.State.keys, c = Saga.State.cursors;
      return edge('jump', k.W.isDown || k.SPACE.isDown || c.up.isDown || anyPadDown(PAD.jump));
    },

    attackPressed: function () {
      var k = Saga.State.keys;
      return edge('attack', k.J.isDown || k.K.isDown || anyPadDown(PAD.attack));
    },

    /* Alle Waffentasten einer Frame — Reihenfolge wie im Original (1–5, dann Q) */
    weaponPressed: function () {
      var k = Saga.State.keys;
      var chosen = [];
      for (var i = 0; i < WEAPON_KEYS.length; i++) {
        if (edge('w' + (i + 1), k[WEAPON_KEYS[i][0]].isDown)) chosen.push(WEAPON_KEYS[i][1]);
      }
      return chosen;
    },

    cyclePressed: function () {
      return edge('wCycle', Saga.State.keys.Q.isDown || padDown(PAD.weaponPrev) || padDown(PAD.weaponNext));
    },

    /* Linker Stick, X-Achse (0 ohne Gamepad) */
    padAxisX: function () {
      var pad = Saga.State.pad;
      if (!pad) return 0;
      return pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
    }
  };
})();
