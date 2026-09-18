const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 900,
  height: 620,
  backgroundColor: "#11182f",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  input: {
    gamepad: true
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config);

let player;
let enemy;
let cursors;
let pad = null;
let playerHP = 100;
let enemyHP = 100;
let playerHPText;
let enemyHPText;

function preload() {
  // Keine externen Assets nötig, Figuren werden mit Rectangles dargestellt
}

function create() {
  const scene = this;

  const colors = {
    cyan: 0x29e7ff,
    red: 0xff5e6c,
    green: 0x52e38f,
    dark: 0x11182f,
    panel: 0x1a2547,
    white: 0xf1f5ff
  };

  scene.add.rectangle(450, 310, 900, 620, colors.dark);

  scene.add.text(450, 34, "EPSCHE SCHULDEN SAGA", {
    fontFamily: "Arial, sans-serif",
    fontSize: "32px",
    fontStyle: "bold",
    color: "#29e7ff"
  }).setOrigin(0.5);

  scene.add.text(450, 76, "Top-Down Hack & Slash · Prototyp", {
    fontFamily: "Arial, sans-serif",
    fontSize: "18px",
    color: "#dce8ff"
  }).setOrigin(0.5);

  scene.add.rectangle(450, 350, 820, 330, colors.panel, 0.86)
    .setStrokeStyle(2, colors.cyan, 0.35);

  // Spieler (DU) als Rectangle mit Physics
  const playerRect = scene.add.rectangle(450, 380, 26, 60, colors.cyan);
  scene.physics.add.existing(playerRect);
  player = playerRect;
  player.body.setCollideWorldBounds(true);

  // Gegner (KREDITKARTE) als Rectangle mit Physics
  const enemyRect = scene.add.rectangle(680, 260, 26, 60, colors.red);
  scene.physics.add.existing(enemyRect);
  enemy = enemyRect;
  enemy.body.setCollideWorldBounds(true);

  // Labels
  scene.add.text(220, 165, "DU", {
    fontFamily: "Arial, sans-serif",
    fontSize: "22px",
    fontStyle: "bold",
    color: "#29e7ff"
  }).setOrigin(0.5);

  scene.add.text(680, 165, "KREDITKARTE", {
    fontFamily: "Arial, sans-serif",
    fontSize: "22px",
    fontStyle: "bold",
    color: "#ff5e6c"
  }).setOrigin(0.5);

  playerHPText = scene.add.text(220, 208, "HP: 100", {
    fontFamily: "Arial, sans-serif",
    fontSize: "16px",
    color: "#ffffff"
  }).setOrigin(0.5);

  enemyHPText = scene.add.text(680, 208, "HP: 100", {
    fontFamily: "Arial, sans-serif",
    fontSize: "16px",
    color: "#ffffff"
  }).setOrigin(0.5);

  // Kollision / Overlap: Spieler erhält Schaden bei Berührung mit Gegner
  scene.physics.add.overlap(player, enemy, () => {
    playerHP = Math.max(0, playerHP - 1);
    playerHPText.setText("HP: " + playerHP);
  });

  // Keyboard-Input (WASD + Pfeiltasten)
  cursors = scene.input.keyboard.createCursorKeys();
  scene.input.keyboard.addKeys("W,A,S,D");

  // Gamepad-Setup (wird aktiv, sobald ein Controller verbunden wird)
  scene.input.gamepad.once("connected", (gamepad) => {
    pad = gamepad;
  });

  // Info-Text
  scene.add.text(
    450,
    590,
    "Bewege dich mit WASD / Pfeilen. Gamepad-Stick funktioniert ebenfalls, wenn ein Controller verbunden ist.",
    {
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      color: "#aab9d8"
    }
  ).setOrigin(0.5);
}

function update(time, delta) {
  if (!player || !enemy) return;

  const scene = this;

  // Geschwindigkeit zurücksetzen
  player.body.setVelocity(0);

  // Keyboard-Bewegung
  const keyA = scene.input.keyboard.addKey("A");
  const keyD = scene.input.keyboard.addKey("D");
  const keyW = scene.input.keyboard.addKey("W");
  const keyS = scene.input.keyboard.addKey("S");

  if (cursors.left.isDown || keyA.isDown) {
    player.body.setVelocityX(-200);
  } else if (cursors.right.isDown || keyD.isDown) {
    player.body.setVelocityX(200);
  }

  if (cursors.up.isDown || keyW.isDown) {
    player.body.setVelocityY(-200);
  } else if (cursors.down.isDown || keyS.isDown) {
    player.body.setVelocityY(200);
  }

  // Diagonale Bewegung normalisieren
  if (player.body.velocity.length() > 0) {
    player.body.velocity.normalize().scale(200);
  }

  // Gamepad-Bewegung (falls ein Pad verbunden ist)
  if (pad) {
    const axisX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
    const axisY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;

    if (Math.abs(axisX) > 0.1 || Math.abs(axisY) > 0.1) {
      player.body.setVelocity(axisX * 200, axisY * 200);
    }
  }

  // Gegner bewegt sich langsam auf den Spieler zu
  scene.physics.moveToObject(enemy, player, 80);

  // Simple Niederlagenlogik
  if (playerHP <= 0) {
    scene.add.text(450, 300, "NIEDERLAGE", {
      fontFamily: "Arial, sans-serif",
      fontSize: "32px",
      fontStyle: "bold",
      color: "#ff5e6c"
    }).setOrigin(0.5);
    scene.scene.pause();
  }
}
