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

  /* Führt der Browser dieses Pad noch? Phaser behält seinen Wrapper nach dem
     Abstecken samt eingefrorenen Werten — mit oder ohne Event. */
  function isLive(pad) {
    var pads = navigator.getGamepads ? navigator.getGamepads() : null;
    for (var i = 0; pads && i < pads.length; i++) {
      if (pads[i] && pads[i].index === pad.index) return true;
    }
    return false;
  }

  /* Der Griff auf das Gamepad, nach genau einer Regel: gültig ist nur, was der
     Browser noch führt. Ohne Griff wird Phasers pad1 übernommen (Pad war schon
     vor dem Binden verbunden), ein toter Griff wird gelöst. */
  function livePad() {
    var S = Saga.State;
    var plugin = S.scene && S.scene.input && S.scene.input.gamepad;
    var candidate = S.pad || (plugin && plugin.pad1);
    if (!candidate) return null;
    if (isLive(candidate)) {
      S.pad = candidate;
      return candidate;
    }
    S.pad = null;
    return null;
  }

  function padDown(index) {
    var pad = livePad();
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
    /* Tastatur & Gamepad an die laufende Szene binden */
    bind: function (scene) {
      Saga.State.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE,J,K,R,Q,ONE,TWO,THREE,FOUR,FIVE');
      Saga.State.cursors = scene.input.keyboard.createCursorKeys();
      if (scene.input.gamepad) {
        scene.input.gamepad.removeAllListeners();
        /* Nur für einen neu angeschlossenen Pad nötig: alles andere regelt livePad()
           bei jedem Lesen, und Phasers pad1 wird nie zurückgesetzt. Auch hier gilt
           die Regel — der Griff ist nur je ein lebendes Pad. */
        scene.input.gamepad.on('connected', function (p) {
          Saga.State.pad = (p && isLive(p)) ? p : null;
        });
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
      var pad = livePad();
      if (!pad) return 0;
      return pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
    },

    /* Steuerkreuz links/rechts als -1 / 0 / 1 (0 ohne Gamepad) */
    padDpadX: function () {
      if (padDown(PAD.left)) return -1;
      if (padDown(PAD.right)) return 1;
      return 0;
    }
  };
})();
