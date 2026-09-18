const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 900,
  height: 620,
  backgroundColor: '#11182f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 900,
    height: 620
  },
  scene: { create }
};

new Phaser.Game(config);

function create() {
  const scene = this;
  let playerHP = 100;
  let enemyHP = 100;
  let combo = 0;
  let totalDamage = 0;
  let gameOver = false;
  let lastAttackAt = 0;

  const colors = {
    cyan: 0x29e7ff,
    red: 0xff5e6c,
    green: 0x52e38f,
    yellow: 0xffdd57,
    dark: 0x11182f,
    panel: 0x1a2547,
    white: 0xf1f5ff
  };

  scene.add.rectangle(450, 310, 900, 620, colors.dark);
  scene.add.text(450, 34, 'EPSCHE SCHULDEN SAGA', {
    fontFamily: 'Arial, sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#29e7ff'
  }).setOrigin(0.5);
  scene.add.text(450, 76, 'Kapitel 1 · Kampf gegen die Kreditkarte', {
    fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#dce8ff'
  }).setOrigin(0.5);
  scene.add.rectangle(450, 350, 820, 330, colors.panel, 0.86).setStrokeStyle(2, colors.cyan, 0.35);

  const player = drawStickman(scene, 220, 390, colors.cyan, false);
  const enemy = drawStickman(scene, 680, 390, colors.red, true);

  scene.add.text(220, 165, 'DU', {
    fontFamily: 'Arial, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#29e7ff'
  }).setOrigin(0.5);
  scene.add.text(680, 165, 'KREDITKARTE', {
    fontFamily: 'Arial, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ff5e6c'
  }).setOrigin(0.5);

  const playerHPLabel = scene.add.text(220, 208, '100 / 100 HP', {
    fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffffff'
  }).setOrigin(0.5);
  const enemyHPLabel = scene.add.text(680, 208, '100 / 100 HP', {
    fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffffff'
  }).setOrigin(0.5);
  const playerBar = createHealthBar(scene, 220, 190, colors.green);
  const enemyBar = createHealthBar(scene, 680, 190, colors.red);

  const comboText = scene.add.text(450, 260, 'Combo: 0×', {
    fontFamily: 'Arial, sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffdd57'
  }).setOrigin(0.5);
  const damageText = scene.add.text(450, 298, 'Gesamtschaden: 0', {
    fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#dce8ff'
  }).setOrigin(0.5);

  const attackButton = scene.add.rectangle(450, 540, 280, 58, colors.cyan, 1)
    .setStrokeStyle(2, colors.white, 0.8).setInteractive({ useHandCursor: true });
  const attackLabel = scene.add.text(450, 540, 'ANGREIFEN', {
    fontFamily: 'Arial, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#10182f'
  }).setOrigin(0.5);
  scene.add.text(450, 590, 'Klicke auf den Gegner oder auf ANGRIFFEN.', {
    fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#aab9d8'
  }).setOrigin(0.5);

  enemy.setSize(130, 190).setInteractive({ useHandCursor: true });

  const attack = () => {
    if (gameOver) return;
    const now = scene.time.now;
    combo = now - lastAttackAt < 1500 ? combo + 1 : 1;
    lastAttackAt = now;
    const damage = Math.min(32, 8 + combo * 3);
    totalDamage += damage;
    enemyHP = Math.max(0, enemyHP - damage);
    comboText.setText(`Combo: ${combo}×`);
    damageText.setText(`Gesamtschaden: ${totalDamage}`);
    updateHealthBar(enemyBar, enemyHP);
    enemyHPLabel.setText(`${enemyHP} / 100 HP`);
    scene.tweens.add({ targets: enemy, x: enemy.x + 28, duration: 60, yoyo: true, repeat: 2 });
    scene.cameras.main.flash(70, 255, 255, 255, false);
    if (enemyHP <= 0) {
      gameOver = true;
      enemy.disableInteractive();
      attackButton.disableInteractive();
      attackButton.setFillStyle(colors.green);
      attackLabel.setText('SIEG!');
      showResult(scene, 'SIEG!', 'Kreditkarte besiegt. Du erhältst 50 XP.', '#52e38f', () => restart(scene));
    }
  };

  attackButton.on('pointerdown', attack);
  enemy.on('pointerdown', attack);

  scene.time.addEvent({
    delay: 2000,
    loop: true,
    callback: () => {
      if (gameOver) return;
      const damage = 9;
      playerHP = Math.max(0, playerHP - damage);
      updateHealthBar(playerBar, playerHP);
      playerHPLabel.setText(`${playerHP} / 100 HP`);
      scene.tweens.add({ targets: player, x: player.x - 24, duration: 65, yoyo: true, repeat: 2 });
      if (playerHP <= 0) {
        gameOver = true;
        enemy.disableInteractive();
        attackButton.disableInteractive();
        attackButton.setFillStyle(colors.red);
        attackLabel.setText('NEUSTART');
        showResult(scene, 'NIEDERLAGE', 'Die Kreditkarte war stärker. Starte neu und versuche es wieder.', '#ff5e6c', () => restart(scene));
      }
    }
  });

  scene.time.addEvent({
    delay: 250,
    loop: true,
    callback: () => {
      if (!gameOver && scene.time.now - lastAttackAt > 1500 && combo !== 0) {
        combo = 0;
        comboText.setText('Combo: 0×');
      }
    }
  });
}

function createHealthBar(scene, x, y, color) {
  scene.add.rectangle(x, y, 250, 24, 0x090d1b).setStrokeStyle(2, 0xffffff, 0.7);
  const fill = scene.add.rectangle(x - 123, y, 246, 18, color).setOrigin(0, 0.5);
  return { fill };
}

function updateHealthBar(bar, hp) {
  bar.fill.width = 246 * Phaser.Math.Clamp(hp / 100, 0, 1);
}

function drawStickman(scene, x, y, color, facingLeft) {
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  const direction = facingLeft ? -1 : 1;
  graphics.lineStyle(9, color, 1);
  graphics.fillStyle(color, 1);
  graphics.fillCircle(0, -70, 24);
  graphics.lineBetween(0, -44, 0, 36);
  graphics.lineBetween(0, -22, direction * 42, 5);
  graphics.lineBetween(0, -22, direction * -36, 10);
  graphics.lineBetween(0, 36, direction * 30, 88);
  graphics.lineBetween(0, 36, direction * -30, 88);
  container.add(graphics);
  container.setSize(130, 190);
  return container;
}

function showResult(scene, title, message, color, restart) {
  const overlay = scene.add.container(450, 350);
  const panel = scene.add.rectangle(0, 0, 580, 220, 0x090d1b, 0.96)
    .setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color, 1);
  const heading = scene.add.text(0, -55, title, {
    fontFamily: 'Arial, sans-serif', fontSize: '46px', fontStyle: 'bold', color
  }).setOrigin(0.5);
  const body = scene.add.text(0, 0, message, {
    fontFamily: 'Arial, sans-serif', fontSize: '19px', color: '#ffffff', align: 'center', wordWrap: { width: 500 }
  }).setOrigin(0.5);
  const button = scene.add.rectangle(0, 72, 190, 42, 0xffffff, 1).setInteractive({ useHandCursor: true });
  const buttonLabel = scene.add.text(0, 72, 'NEU STARTEN', {
    fontFamily: 'Arial, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#10182f'
  }).setOrigin(0.5);
  button.on('pointerdown', restart);
  overlay.add([panel, heading, body, button, buttonLabel]);
}

function restart(scene) {
  scene.scene.restart();
}
