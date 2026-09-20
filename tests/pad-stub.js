/* ============================================================
   Fake-Gamepad für Tests: ersetzt navigator.getGamepads().
   Wird per addInitScript VOR den Spielskripten injiziert.

   Zwei Details sind Pflicht, sonst ist der Stub still wirkungslos:
   - `timestamp` muss bei jedem Poll steigen. Phaser verwirft in
     Gamepad.update() alles mit `pad.timestamp < gamepad._created`.
   - Verbinden/Trennen läuft nur über DOM-Events, das Event braucht
     ein `gamepad`-Property (sonst stürzt Phasers Queue ab).
   ============================================================ */
(() => {
  const pad = {
    id: 'Test Pad (stub)',
    index: 0,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }))
  };

  /* live=false stellt den Browser nach, der das Pad nicht mehr führt */
  let live = true;

  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: function () {
      if (!live) return [null, null, null, null];
      pad.timestamp = performance.now();
      pad.connected = true;
      return [pad, null, null, null];
    }
  });

  window.__pad = {
    pad: pad,
    isLive: function () { return live; },
    setStick: function (axis, value) { pad.axes[axis] = value; },
    setButton: function (index, down) {
      const b = pad.buttons[index];
      b.pressed = !!down;
      b.value = down ? 1 : 0;
      b.touched = !!down;
    },
    setLive: function (value) { live = !!value; },
    reset: function () {
      pad.axes.fill(0);
      pad.buttons.forEach(function (b) { b.pressed = false; b.value = 0; b.touched = false; });
    },
    /* so feuert der Browser gamepadconnected / gamepaddisconnected */
    dispatch: function (type) {
      const e = new Event(type);
      Object.defineProperty(e, 'gamepad', { value: pad });
      window.dispatchEvent(e);
    }
  };
})();
