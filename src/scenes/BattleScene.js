// src/scenes/BattleScene.js

import { Unit } from '../prefabs/Unit.js';
import { Card } from '../prefabs/Card.js';
import { CARDS_DB } from '../data/cards.js';
import { executeAction } from '../managers/ActionManager.js'; // <-- НОВЫЙ ИМПОРТ

export class BattleScene extends Phaser.Scene {
    constructor() { super({ key: 'BattleScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.isBattleActive = true;

        // UI: Затемнение для просмотра карт
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85).setVisible(false).setDepth(900).setInteractive();
        this.dimmer.on('pointerdown', () => this.unzoomCard());
        this.zoomedCard = null;

        // UI: Мана
        this.mana = 3; this.maxMana = 3;
        this.manaText = this.add.text(20, GH - 50, `Mana: ${this.mana}/${this.maxMana}`, { fontSize: '32px', color: '#00ffff', fontStyle: 'bold' }).setDepth(10);
        
        // UI: Кнопка Конец хода
        this.endTurnBtn = this.add.rectangle(GW - 80, GH - 150, 140, 60, 0xd04040).setInteractive().setDepth(10).setStrokeStyle(2, 0xffffff);
        this.add.text(GW - 80, GH - 150, "END TURN", { fontSize: '20px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
        this.endTurnBtn.on('pointerdown', () => this.endTurn());

        // UI: Зона сброса
        this.trashZone = this.add.zone(GW - 60, GH - 50, 100, 100).setRectangleDropZone(100, 100);
        this.trashZone.name = "discard_zone";
        const trashG = this.add.graphics().lineStyle(2, 0x666666);
        trashG.strokeRect(this.trashZone.x - 50, this.trashZone.y - 50, 100, 100);
        this.add.text(this.trashZone.x, this.trashZone.y, "TRASH", { fontSize: '12px', color: '#666' }).setOrigin(0.5);

        // Инициализация игрока
        this.player = new Unit(this, GW * 0.25, GH * 0.45, null, true);
        this.add.existing(this.player);
        
        // Спавн первого врага
        this.startNewBattle("slime");

        this.hand = [];
        this.drawCards(5);

        // --- ОБРАБОТКА ВВОДА ---
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.isBattleActive) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;
            // Задержка чтобы отличить клик от драга
            if (Date.now() - card.pressStartTime > 200) {
                 card.x = pointer.x; card.y = pointer.y - 80; card.setDepth(100);
            }
        });

        this.input.on('dragend', (pointer, gameObject, dropped) => {
            if (!this.isBattleActive) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;
            if (Date.now() - card.pressStartTime < 250) return; // Это был клик
            card.setDepth(0);
            if (!dropped) this.returnCardToHand(card);
        });

        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (!this.isBattleActive) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;
            
            const data = card.cardData;
            if (dropZone.name === "discard_zone") { this.discardCard(card); return; }

            // ОПРЕДЕЛЕНИЕ ВАЛИДНОЙ ЦЕЛИ
            let validTarget = null;
            
            // 1. Бросили на Врага
            if (dropZone.name === "enemy_target" && this.enemy.alive) {
                if (data.target === 'enemy' || data.target === 'any') validTarget = this.enemy;
                else this.showFloatingText(card.x, card.y, "Только на себя!", 0xffaaaa);
            }
            // 2. Бросили на Игрока
            else if (dropZone.name === "player_target" && this.player.alive) {
                if (data.target === 'self' || data.target === 'any') validTarget = this.player;
                else this.showFloatingText(card.x, card.y, "Только на врага!", 0xffaaaa);
            }

            if (validTarget) {
                // Проверка маны
                if (this.mana < data.cost) {
                    this.showFloatingText(card.x, card.y, "No Mana!", 0x00ffff);
                    this.returnCardToHand(card);
                    return;
                }
                // РОЗЫГРЫШ КАРТЫ
                this.playCard(card, validTarget);
            } else {
                this.returnCardToHand(card);
            }
        });
    }

    // --- ГЛАВНАЯ ЛОГИКА РОЗЫГРЫША ---
    playCard(card, target) {
        const data = card.cardData;
        
        // Делегируем выполнение эффектов менеджеру
        if (data.actions) {
            data.actions.forEach(action => {
                // this.player выступает как source (источник)
                executeAction(this, action, this.player, target);
            });
        }

        this.spendMana(data.cost);
        this.discardCard(card);
    }
    // --------------------------------

    startNewBattle(enemyKey) {
        if (this.enemy) this.enemy.destroy();
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.enemy = new Unit(this, GW * 0.75, GH * 0.45, enemyKey, false);
        this.add.existing(this.enemy);
        this.enemy.chooseIntent();
        this.isBattleActive = true;
    }

    handleUnitDeath(unit) {
        const GW = this.scale.width; const GH = this.scale.height;
        if (unit.isPlayer) {
            this.isBattleActive = false;
            this.cameras.main.flash(500, 255, 0, 0);
            this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.8).setDepth(2000);
            this.add.text(GW/2, GH/2 - 50, "YOU DIED", { fontSize: '64px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
            const btn = this.add.rectangle(GW/2, GH/2 + 50, 200, 60, 0xffffff).setInteractive().setDepth(2001);
            this.add.text(GW/2, GH/2 + 50, "TRY AGAIN", { fontSize: '24px', color: '#000' }).setOrigin(0.5).setDepth(2001);
            btn.on('pointerdown', () => { location.reload(); });
        } else {
            this.isBattleActive = false;
            const bg = this.add.rectangle(GW/2, GH/2, GW, 150, 0x000000, 0.7).setDepth(2000);
            const txt = this.add.text(GW/2, GH/2 - 30, "VICTORY!", { fontSize: '48px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
            const btn = this.add.rectangle(GW/2, GH/2 + 30, 200, 50, 0x44aa44).setInteractive().setDepth(2001).setStrokeStyle(2, 0xffffff);
            this.add.text(GW/2, GH/2 + 30, "NEXT BATTLE >>", { fontSize: '20px', color: '#fff' }).setOrigin(0.5).setDepth(2001);
            btn.on('pointerdown', () => {
                bg.destroy(); txt.destroy(); btn.destroy();
                const nextEnemy = Math.random() > 0.5 ? "knight" : "slime";
                this.startNewBattle(nextEnemy);
                this.player.heal(10);
                this.mana = this.maxMana; this.updateManaUI();
                this.discardHand(); this.drawCards(5);
            });
        }
    }
    
    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();
        this.enemy.executeIntent(this.player);
        if (!this.player.alive) return;
        this.time.delayedCall(1000, () => {
            if (!this.isBattleActive) return;
            this.player.resetShield(); this.enemy.resetShield();
            this.enemy.chooseIntent();
            this.mana = this.maxMana; this.updateManaUI();
            const toDraw = 5 - this.hand.length; if (toDraw > 0) this.drawCards(toDraw);
        });
    }

    spendMana(amount) { this.mana -= amount; this.updateManaUI(); }
    discardHand() { this.hand.forEach(card => card.destroy()); this.hand = []; }
    
    drawCards(amount) {
        const GW = this.scale.width;
        const keys = Object.keys(CARDS_DB);
        for (let i = 0; i < amount; i++) {
            if (this.hand.length >= 6) break;
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            const card = new Card(this, GW/2, this.scale.height + 200, randomKey);
            this.add.existing(card);
            this.hand.push(card);
        }
        this.rearrangeHand();
    }
    
    rearrangeHand() {
        const GW = this.scale.width; const GH = this.scale.height;
        const cardW = 90; const totalW = this.hand.length * cardW;
        const startX = (GW - totalW) / 2 + (cardW / 2);
        this.hand.forEach((card, index) => {
            card.baseX = startX + (index * cardW); card.baseY = GH - 80;
            if (card !== this.zoomedCard) { this.tweens.add({ targets: card, x: card.baseX, y: card.baseY, angle: (index - (this.hand.length/2)) * 3, duration: 300 }); }
        });
    }
    
    returnCardToHand(card) { this.tweens.add({ targets: card, x: card.baseX, y: card.baseY, duration: 200 }); }
    
    discardCard(card) {
        this.hand = this.hand.filter(c => c !== card);
        this.tweens.add({ targets: card, x: this.trashZone.x, y: this.trashZone.y, alpha: 0, scale: 0.1, duration: 300, onComplete: () => { card.destroy(); this.rearrangeHand(); } });
    }
    
    updateManaUI() { this.manaText.setText(`${this.mana}/${this.maxMana}`); }
    
    showFloatingText(x, y, message, color) {
        const txt = this.add.text(x, y, message, { fontSize: '24px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        txt.setTint(color);
        this.tweens.add({ targets: txt, y: y - 80, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });
    }
    
    zoomCard(card) {
        if (this.zoomedCard) return; this.zoomedCard = card;
        this.dimmer.setVisible(true); this.children.bringToTop(this.dimmer); this.children.bringToTop(card);
        card.savedX = card.x; card.savedY = card.y; card.savedAngle = card.angle; card.savedScale = card.scale;
        card.toggleMode(true);
        this.tweens.add({ targets: card, x: this.scale.width / 2, y: this.scale.height / 2, angle: 0, scale: 2.5, duration: 300, ease: 'Back.out' });
    }
    
    unzoomCard() {
        if (!this.zoomedCard) return; const card = this.zoomedCard;
        this.zoomedCard = null; this.dimmer.setVisible(false); card.toggleMode(false);
        this.tweens.add({ targets: card, x: card.savedX, y: card.savedY, angle: card.savedAngle, scale: 1, duration: 250, ease: 'Power2' });
    }
}
