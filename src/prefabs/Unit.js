// Файл: src/prefabs/Unit.js

import { ENEMIES_DB } from '../data/enemies.js';
import { executeAction } from '../managers/ActionManager.js'; 

export class Unit extends Phaser.GameObjects.Container {
    constructor(scene, x, y, key, isPlayer = false) {
        super(scene, x, y);
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.shield = 0;
        this.alive = true;
        
        this.statuses = {}; 

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

        this.hpBarBg = scene.add.rectangle(0, -60, 70, 10, 0x000000);
        this.hpBar = scene.add.rectangle(0, -60, 70, 10, 0xff0000);
        this.hpText = scene.add.text(0, -80, `${this.hp}/${this.maxHp}`, { fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);
        this.shieldText = scene.add.text(0, 0, "", { fontSize: '24px', color: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
        
        this.statusText = scene.add.text(0, -95, "", { fontSize: '14px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);

        this.intentIcon = scene.add.text(0, -120, "", { fontSize: '24px' }).setOrigin(0.5);
        this.intentValue = scene.add.text(20, -120, "", { fontSize: '18px', fontStyle: 'bold', color: '#ffaaaa' }).setOrigin(0.5);

        this.add([this.hpBarBg, this.hpBar, this.hpText, this.shieldText, this.statusText, this.intentIcon, this.intentValue]);

        this.sprite.setInteractive();
        this.sprite.input.dropZone = true;
        this.sprite.name = isPlayer ? "player_target" : "enemy_target";
    }

    updateStatusUI() {
        let text = "";
        if (this.statuses['strength']) text += `💪${this.statuses['strength']} `;
        if (this.statuses['poison']) text += `☠️${this.statuses['poison']} `;
        if (this.statuses['weak']) text += `💔${this.statuses['weak']} `;
        if (this.statuses['vulnerable']) text += `👁️${this.statuses['vulnerable']} `;
        if (this.statuses['rage']) text += `😡 `;
        if (this.statuses['freeze']) text += `❄️ `;
        if (this.statuses['thorns']) text += `🌵${this.statuses['thorns']} `;
        
        this.statusText.setText(text);
    }

    takeDamage(amount) {
        if (!this.alive) return;
        
        // Шипы (Ответный урон атакующему)
        if (this.statuses['thorns']) {
            // Нам нужно знать атакующего, но takeDamage пока не принимает source.
            // Можно доработать, но пока опустим для простоты.
        }

        if (this.scene.statusManager) {
            this.scene.statusManager.onTakeDamage(this, amount);
        }

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
        this.updateStatusUI(); 
    }

    // --- AI ВРАГА (ИЗМЕНЕНО) ---
    
    chooseIntent() {
        if (this.isPlayer || !this.alive) return;
        
        // 1. Выбираем действие
        const rand = Math.random();
        let cumulative = 0;
        let chosenMove = this.moves[0];
        for (let move of this.moves) {
            cumulative += move.chance;
            if (rand <= cumulative) { chosenMove = move; break; }
        }
        this.currentIntent = chosenMove;
        this.showIntentUI();

        // --- НОВОЕ: МГНОВЕННОЕ ПРИМЕНЕНИЕ (Щит, Баффы) ---
        // Если действие защитное (на себя), применяем его СРАЗУ
        if (this.currentIntent.actions) {
            this.currentIntent.actions.forEach(action => {
                // Если действие: Блок, Хил, или Статус на себя
                if (action.type === 'block' || action.type === 'heal' || (action.type === 'apply_status' && this.currentIntent.target === 'self')) {
                    
                    // Выполняем!
                    let target = this; // self
                    executeAction(this.scene, action, this, target);
                }
            });
        }
    }
    
    showIntentUI() {
        if (!this.currentIntent) return;
        const move = this.currentIntent;
        
        let icon = "❓";
        let val = "";
        
        if (move.actions && move.actions.length > 0) {
            // Пытаемся понять, что делает враг, чтобы нарисовать иконку
            const firstAction = move.actions[0];
            if (firstAction.type === 'damage') { icon = "⚔️"; val = firstAction.value; }
            else if (firstAction.type === 'block') { icon = "🛡️"; val = firstAction.value; }
            else if (firstAction.type === 'apply_status') { 
                // Если статус на себя - это бафф
                if (move.target === 'self') icon = "💪"; // Бафф
                else icon = "🤮"; // Дебафф (яд)
            }
        }

        this.intentIcon.setText(icon);
        this.intentValue.setText(val);
    }
    
    // ВЫПОЛНЕНИЕ НАМЕРЕНИЯ (ТОЛЬКО АТАКИ)
    executeIntent(playerTarget) {
        if (!this.currentIntent || !this.alive) return;
        
        const move = this.currentIntent;
        
        // Выводим название приема
        this.scene.showFloatingText(this.x, this.y - 60, move.name, 0xffaa00);
        
        let hasAttacked = false;

        if (move.actions) {
            move.actions.forEach(action => {
                // --- НОВОЕ: ФИЛЬТР ---
                // Выполняем только АТАКУЮЩИЕ действия (урон, дебаффы на врага)
                // Защитные мы уже выполнили в chooseIntent
                
                const isDefensive = (action.type === 'block' || action.type === 'heal' || (action.type === 'apply_status' && move.target === 'self'));
                
                if (!isDefensive) {
                    executeAction(this.scene, action, this, playerTarget);
                    
                    if (action.type === 'damage') hasAttacked = true;
                }
            });
        }
        
        if (hasAttacked) {
            this.scene.tweens.add({ targets: this, x: this.x - 50, duration: 100, yoyo: true });
        }

        this.currentIntent = null;
        this.intentIcon.setText(""); this.intentValue.setText("");
    }
}
