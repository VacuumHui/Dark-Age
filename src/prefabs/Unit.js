import { ENEMIES_DB } from '../data/enemies.js';

export class Unit extends Phaser.GameObjects.Container {
    constructor(scene, x, y, key, isPlayer = false) {
        super(scene, x, y);
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.shield = 0;
        this.alive = true;

        if (isPlayer) {
            this.name = "Герой";
            this.maxHp = 50;
            this.hp = 50;
            this.color = 0x2222ff;
        } else {
            const data = ENEMIES_DB[key];
            this.name = data.name;
            this.maxHp = data.hp;
            this.hp = data.hp;
            this.color = data.color;
            this.moves = data.moves;
            this.currentIntent = null;
        }
        
        this.sprite = scene.add.rectangle(0, 0, 80, 100, this.color).setStrokeStyle(2, 0xffffff);
        this.add(this.sprite);

        // UI Полоски
        this.hpBarBg = scene.add.rectangle(0, -60, 70, 10, 0x000000);
        this.hpBar = scene.add.rectangle(0, -60, 70, 10, 0xff0000);
        this.hpText = scene.add.text(0, -80, `${this.hp}/${this.maxHp}`, { fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);
        this.shieldText = scene.add.text(0, 0, "", { fontSize: '24px', color: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
        
        this.intentIcon = scene.add.text(0, -110, "", { fontSize: '24px' }).setOrigin(0.5);
        this.intentValue = scene.add.text(20, -110, "", { fontSize: '18px', fontStyle: 'bold', color: '#ffaaaa' }).setOrigin(0.5);

        this.add([this.hpBarBg, this.hpBar, this.hpText, this.shieldText, this.intentIcon, this.intentValue]);

        this.sprite.setInteractive();
        this.sprite.input.dropZone = true;
        this.sprite.name = isPlayer ? "player_target" : "enemy_target";
    }

    takeDamage(amount) {
        if (!this.alive) return;
        let damage = amount;
        if (this.shield > 0) {
            if (this.shield >= damage) { this.shield -= damage; damage = 0; } 
            else { damage -= this.shield; this.shield = 0; }
        }
        this.hp -= damage;
        if (this.hp <= 0) { this.hp = 0; this.die(); }
        this.updateUI();
        if (damage > 0) {
            this.scene.showFloatingText(this.x, this.y - 40, `-${damage}`, 0xff0000);
            this.scene.cameras.main.shake(100, 0.005);
        } else {
            this.scene.showFloatingText(this.x, this.y - 40, `Blocked`, 0xaaaaff);
        }
    }

    die() {
        this.alive = false;
        this.scene.tweens.add({
            targets: this, alpha: 0, scale: 0.8, y: this.y + 20, duration: 500,
            onComplete: () => { this.visible = false; this.scene.handleUnitDeath(this); }
        });
    }

    heal(amount) { 
        if(!this.alive) return;
        this.hp += amount; if(this.hp > this.maxHp) this.hp = this.maxHp; 
        this.updateUI(); this.scene.showFloatingText(this.x, this.y - 40, `+${amount}`, 0x00ff00); 
    }
    
    addShield(amount) { 
        if(!this.alive) return;
        this.shield += amount; this.updateUI(); this.scene.showFloatingText(this.x, this.y - 40, `+${amount} Shield`, 0x00ffff); 
    }
    
    resetShield() { this.shield = 0; this.updateUI(); }
    
    updateUI() {
        this.hpText.setText(`${this.hp}/${this.maxHp}`);
        this.hpBar.width = 70 * (this.hp / this.maxHp);
        if (this.shield > 0) { this.shieldText.setText(`[${this.shield}]`); this.sprite.setStrokeStyle(4, 0x00ffff); }
        else { this.shieldText.setText(""); this.sprite.setStrokeStyle(2, 0xffffff); }
    }
    
    chooseIntent() {
        if (this.isPlayer || !this.alive) return;
        const rand = Math.random();
        let cumulative = 0;
        let chosenMove = this.moves[0];
        for (let move of this.moves) {
            cumulative += move.chance;
            if (rand <= cumulative) { chosenMove = move; break; }
        }
        this.currentIntent = chosenMove;
        this.showIntentUI();
    }
    
    showIntentUI() {
        if (!this.currentIntent) return;
        const move = this.currentIntent;
        let icon = (move.type === "defend") ? "🛡️" : "⚔️";
        this.intentIcon.setText(icon);
        this.intentValue.setText(move.value);
    }
    
    executeIntent(target) {
        if (!this.currentIntent || !this.alive) return;
        const move = this.currentIntent;
        this.scene.showFloatingText(this.x, this.y - 40, move.name, 0xffaa00);
        if (move.type.includes("attack")) {
            target.takeDamage(move.value);
            this.scene.tweens.add({ targets: this, x: this.x - 50, duration: 100, yoyo: true });
        } else if (move.type === "defend") {
            this.addShield(move.value);
        }
        this.currentIntent = null;
        this.intentIcon.setText(""); this.intentValue.setText("");
    }
}
