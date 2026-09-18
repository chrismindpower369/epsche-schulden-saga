// Epsche Schulden Saga - Stickman Combat MVP
// Phaser 3 Game Configuration

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#16213e',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);

// Game Variables
let player;
let enemy;
let playerHP = 100;
let enemyHP = 100;
let playerHPBar;
let enemyHPBar;
let comboCount = 0;
let comboText;
let scoreText;
let canAttack = true;
let attackCooldown = 300;

const enemyTypes = [
    { name: 'Kreditkarte', hp: 100, damage: 15, color: 0xff6b6b },
    { name: 'Mahnung', hp: 50, damage: 10, color: 0xffa502 },
    { name: 'Uberziehungszinsen', hp: 200, damage: 8, color: 0xff7f50 }
];

let currentEnemy = enemyTypes[0];

function preload() {
    this.load.image('player', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjI1IiBjeT0iMTUiIHI9IjE1IiBmaWxsPSIjMDBmZmZmIi8+PHJlY3QgeD0iMTUiIHk9IjMwIiB3aWR0aD0iMjAiIGhlaWdodD0iNDAiIGZpbGw9IiMwMGZmZmYiLz48bGluZSB4MT0iMTUiIHkxPSIzNSIgeDI9IjUiIHkyPSI2MCIgc3Ryb2tlPSIjMDBmZmZmIiBzdHJva2Utd2lkdGg9IjUiLz48bGluZSB4MT0iMzUiIHkxPSIzNSIgeDI9IjQ1IiB5Mj0iNjAiIHN0cm9rZT0iIzAwZmZmZiIgc3Ryb2tlLXdpZHRoPSI1Ii8+PGxpbmUgeDE9IjIwIiB5MT0iNzAiIHgyPSIyMCIgeTI9IjEwMCIgc3Ryb2tlPSIjMDBmZmZmIiBzdHJva2Utd2lkdGg9IjUiLz48bGluZSB4MT0iMzAiIHkxPSI3MCIgeDI9IjMwIiB5Mj0iMTAwIiBzdHJva2U9IiMwMGZmZmYiIHN0cm9rZS13aWR0aD0iNSIvPjwvc3ZnPg==');
    this.load.image('enemy', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjI1IiBjeT0iMTUiIHI9IjE1IiBmaWxsPSIjZmY2YjZiIi8+PHJlY3QgeD0iMTUiIHk9IjMwIiB3aWR0aD0iMjAiIGhlaWdodD0iNDAiIGZpbGw9IiNmZjZiNmIiLz48bGluZSB4MT0iMTUiIHkxPSIzNSIgeDI9IjUiIHkyPSI2MCIgc3Ryb2tlPSIjZmY2YjZiIiBzdHJva2Utd2lkdGg9IjUiLz48bGluZSB4MT0iMzUiIHkxPSIzNSIgeDI9IjQ1IiB5Mj0iNjAiIHN0cm9rZT0iI2ZmNmI2YiIgc3Ryb2tlLXdpZHRoPSI1Ii8+PGxpbmUgeDE9IjIwIiB5MT0iNzAiIHgyPSIyMCIgeTI9IjEwMCIgc3Ryb2tlPSIjZmY2YjZiIiBzdHJva2Utd2lkdGg9IjUiLz48bGluZSB4MT0iMzAiIHkxPSI3MCIgeDI9IjMwIiB5Mj0iMTAwIiBzdHJva2U9IiNmZjZiNmIiIHN0cm9rZS13aWR0aD0iNSIvPjwvc3ZnPg==');
}

function create() {
    this.add.text(400, 30, 'EPSCHE SCHULDEN SAGA', { fontSize: '28px', fill: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(400, 55, 'Stickman Combat - Kapitel 1: Kreditkarte', { fontSize: '16px', fill: '#ffffff' }).setOrigin(0.5);

    player = this.add.sprite(200, 400, 'player').setScale(2);
    enemy = this.add.sprite(600, 400, 'enemy').setScale(2);

    this.add.text(150, 250, 'DU', { fontSize: '18px', fill: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5);
    playerHPBar = this.add.rectangle(200, 280, 200, 20, 0x00ff00).setOrigin(0.5);
    this.add.rectangle(200, 280, 200, 20, 0x000000).setStrokeStyle(2, 0xffffff).setOrigin(0.5);

    this.add.text(600, 250, currentEnemy.name, { fontSize: '18px', fill: '#ff6b6b', fontStyle: 'bold' }).setOrigin(0.5);
    enemyHPBar = this.add.rectangle(600, 280, 200, 20, 0xff0000).setOrigin(0.5);
    this.add.rectangle(600, 280, 200, 20, 0x000000).setStrokeStyle(2, 0xffffff).setOrigin(0.5);

    comboText = this.add.text(400, 350, 'Combo: 0x', { fontSize: '24px', fill: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
    scoreText = this.add.text(400, 380, 'Schaden: 0', { fontSize: '18px', fill: '#ffffff' }).setOrigin(0.5);
    this.add.text(400, 550, 'Klicke auf den Gegner zum Angreifen!', { fontSize: '16px', fill: '#aaaaaa' }).setOrigin(0.5);

    enemy.setInteractive({ useHandCursor: true });
    enemy.on('pointerdown', () => { if (canAttack && enemyHP > 0) playerAttack(); });

    this.time.addEvent({ delay: 2000, callback: enemyAttack, callbackScope: this, loop: true });
}

function update() {
    if (playerHP > 0 && enemyHP > 0) {
        player.y = 400 + Math.sin(Date.now() / 500) * 5;
        enemy.y = 400 + Math.sin(Date.now() / 500 + Math.PI) * 5;
    }
}

function playerAttack() {
    canAttack = false;
    comboCount++;
    const damage = 10 + (comboCount * 2);
    enemyHP = Math.max(0, enemyHP - damage);
    comboText.setText('Combo: ' + comboCount + 'x');
    scoreText.setText('Schaden: ' + (comboCount * 10));
    enemyHPBar.width = (enemyHP / 100) * 200;
    enemy.setTint(0xffffff);
    this.time.delayedCall(100, () => { enemy.clearTint(); });
    if (enemyHP <= 0) { victory(); return; }
    this.time.delayedCall(attackCooldown, () => {
        canAttack = true;
        this.time.delayedCall(3000, () => { if (comboCount > 0) { comboCount = 0; comboText.setText('Combo: 0x'); } });
    });
}

function enemyAttack() {
    if (enemyHP > 0 && playerHP > 0) {
        const damage = currentEnemy.damage;
        playerHP = Math.max(0, playerHP - damage);
        playerHPBar.width = (playerHP / 100) * 200;
        player.setTint(0xff0000);
        this.time.delayedCall(100, () => { player.clearTint(); });
        if (playerHP <= 0) defeat();
    }
}

function victory() {
    this.add.text(400, 300, 'SIEG!', { fontSize: '48px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5);
    this.add.text(400, 360, 'Kreditkarte besiegt!', { fontSize: '24px', fill: '#ffffff' }).setOrigin(0.5);
    this.add.text(400, 420, 'Combo Bonus: ' + (comboCount * 5) + ' XP', { fontSize: '20px', fill: '#ffff00' }).setOrigin(0.5);
    enemy.setTint(0x00ff00);
    enemy.disableInteractive();
}

function defeat() {
    this.add.text(400, 300, 'NIEDERLAGE', { fontSize: '48px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5);
    this.add.text(400, 360, 'Die Schulden gewinnen...', { fontSize: '24px', fill: '#ffffff' }).setOrigin(0.5);
    this.add.text(400, 420, 'Klicke zum Neustart', { fontSize: '18px', fill: '#aaaaaa' }).setOrigin(0.5);
    player.setTint(0xff0000);
    this.input.on('pointerdown', () => { location.reload(); });
}
