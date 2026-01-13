// Файл: src/scenes/BattleScene.js

import { Unit } from '../prefabs/Unit.js';
import { Card } from '../prefabs/Card.js';
import { CARDS_DB } from '../data/cards.js';
import { RELICS_DB } from '../data/relics.js'; // <-- ИМПОРТ БАЗЫ РЕЛИКВИЙ
import { executeAction } from '../managers/ActionManager.js';
import { EffectManager } from '../managers/EffectManager.js';
import { GameState } from '../GameState.js';
import { RewardManager } from '../managers/RewardManager.js';
import { StatusManager } from '../managers/StatusManager.js';
import { RelicManager } from '../managers/RelicManager.js'; // <-- ИМПОРТ МЕНЕДЖЕРА

export class BattleScene extends Phaser.Scene {
    constructor() { super({ key: 'BattleScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.isBattleActive = true;

        // --- 1. ГЕНЕРАЦИЯ ТЕКСТУР ---
        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }
        
        // --- 2. ИНИЦИАЛИЗАЦИЯ МЕНЕДЖЕРОВ ---
        this.effectManager = new EffectManager(this);
        this.rewardManager = new RewardManager();
        this.statusManager = new StatusManager(this);
        this.relicManager = new RelicManager(this); // <-- СОЗДАЕМ МЕНЕДЖЕР РЕЛИКВИЙ


        // --- 3. КОЛОДА ---
        this.drawPile = Phaser.Utils.Array.Shuffle([...GameState.deck]); 
        this.discardPile = [];
        this.hand = [];

        // --- 4. ИНТЕРФЕЙС ---
        this.createUI(GW, GH);
        this.createRelicUI(); // <-- РИСУЕМ ИКОНКИ РЕЛИКВИЙ

        // --- 5. ЮНИТЫ ---
        this.player = new Unit(this, GW * 0.25, GH * 0.45, null, true);
        this.player.hp = GameState.currentHp;
        this.player.maxHp = GameState.maxHp;
        this.player.updateUI();
        this.add.existing(this.player);

        this.startNewBattle("slime");

        // --- ТРИГГЕР: НАЧАЛО БОЯ ---
        // Здесь сработает Гантеля и даст Силу
        this.relicManager.trigger('onBattleStart');

        // --- 6. СТАРТ ---
        this.drawCards(5);
        this.setupInput();
    }

    // =========================================================
    // ЛОГИКА ИГРЫ
    // =========================================================

    startNewBattle(enemyKey) {
        if (this.enemy) this.enemy.destroy();
        const GW = this.scale.width; 
        const GH = this.scale.height;
        
        this.enemy = new Unit(this, GW * 0.75, GH * 0.45, enemyKey, false);
        this.add.existing(this.enemy);
        
        this.enemy.chooseIntent();
        this.isBattleActive = true;
    }

    drawCards(amount) {
        const GW = this.scale.width;
        for (let i = 0; i < amount; i++) {
            if (this.hand.length >= 6) break;

            if (this.drawPile.length === 0) {
                if (this.discardPile.length > 0) {
                    this.drawPile = Phaser.Utils.Array.Shuffle([...this.discardPile]);
                    this.discardPile = [];
                    this.showFloatingText(100, 500, "Reshuffle!", 0xaaaaaa);
                } else {
                    break;
                }
            }

            const cardKey = this.drawPile.pop();
            const card = new Card(this, GW/2, this.scale.height + 200, cardKey);
            this.add.existing(card);
            this.hand.push(card);
        }
        this.updateDeckUI();
        this.rearrangeHand();
    }

    playCard(card, target) {
        const data = card.cardData;
        if (data.actions) { 
            data.actions.forEach(action => { 
                executeAction(this, action, this.player, target); 
            }); 
        }
        this.spendMana(data.cost);
        this.discardCard(card);
    }

    discardCard(card) {
        const key = Object.keys(CARDS_DB).find(k => CARDS_DB[k].name === card.cardData.name);
        if (key) this.discardPile.push(key);
        
        this.hand = this.hand.filter(c => c !== card);
        
        this.tweens.add({ 
            targets: card, 
            x: this.trashZone.x, y: this.trashZone.y, 
            alpha: 0, scale: 0.1, duration: 300, 
            onComplete: () => { card.destroy(); this.rearrangeHand(); } 
        });
        this.updateDeckUI();
    }

    // --- КОНЕЦ ХОДА ---
    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();

        // 1. Враг атакует
        this.enemy.executeIntent(this.player);

        if (!this.player.alive) return;

        // 2. Подготовка следующего хода
        this.time.delayedCall(1000, () => {
            if (!this.isBattleActive) return;
            
            // --- СТАТУСЫ ---
            if (this.statusManager) {
                this.statusManager.onTurnEnd(this.player);   // Сгорает сила
                this.statusManager.onTurnStart(this.player); // Тикает яд
            }

            // --- ТРИГГЕР: НАЧАЛО ХОДА ---
            // Здесь сработает Шипастый щит или Кольцо регенерации
            this.relicManager.trigger('onTurnStart'); 

            if (!this.player.alive) return;
            
            this.player.resetShield(); 
            this.enemy.resetShield();
            this.enemy.chooseIntent();
            
            this.mana = this.maxMana; 
            this.updateManaUI();
            
            const cardsNeeded = 5 - this.hand.length;
            if (cardsNeeded > 0) {
                this.drawCards(cardsNeeded);
            } else {
                this.rearrangeHand();
            }
        });
    }

    // =========================================================
    // СОБЫТИЯ
    // =========================================================

    handleUnitDeath(unit) {
        const GW = this.scale.width; 
        const GH = this.scale.height;

        if (unit.isPlayer) {
            // ПОРАЖЕНИЕ
            this.isBattleActive = false;
            this.cameras.main.flash(500, 255, 0, 0);
            
            this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.8).setDepth(2000);
            this.add.text(GW/2, GH/2 - 50, "YOU DIED", { fontSize: '64px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
            
            const btn = this.add.rectangle(GW/2, GH/2 + 50, 200, 60, 0xffffff).setInteractive().setDepth(2001);
            this.add.text(GW/2, GH/2 + 50, "RESTART", { fontSize: '24px', color: '#000' }).setOrigin(0.5).setDepth(2001);
            
            btn.on('pointerdown', () => { 
                GameState.deck = ["strike", "strike", "strike", "defend", "defend", "defend"];
                GameState.relics = []; // Сброс реликвий
                GameState.currentHp = 50;
                this.scene.restart(); 
            });
        } else {
            // ВРАГ УМЕР
            // --- ТРИГГЕР: УБИЙСТВО ---
            // Здесь сработает Амулет Вампира
            this.relicManager.trigger('onKill', { victim: unit });

            this.handleVictory();
        }
    }

    handleVictory() {
        this.isBattleActive = false;
        this.discardHandVisual(); 

        const GW = this.scale.width;
        const GH = this.scale.height;

        GameState.currentHp = this.player.hp;
        GameState.level++;

        const bg = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.9).setDepth(2000).setInteractive();
        this.add.text(GW/2, 100, "VICTORY! CHOOSE A CARD:", { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);

        const rewards = this.rewardManager.getRewardOptions(3);

        rewards.forEach((cardKey, index) => {
            const xOffset = (index - 1) * 140;
            const card = new Card(this, GW/2 + xOffset, GH/2, cardKey);
            card.setDepth(2002);
            this.add.existing(card);

            card.bg.setInteractive();
            card.bg.on('pointerdown', () => {
                GameState.deck.push(cardKey);
                this.scene.restart();
            });
            card.bg.removeAllListeners('pointerup');
        });
        
        const skipBtn = this.add.text(GW/2, GH - 100, "[ Skip Reward ]", { fontSize: '20px', color: '#666' }).setOrigin(0.5).setDepth(2001).setInteractive();
        skipBtn.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    // =========================================================
    // UI И ВВОД
    // =========================================================

    createUI(GW, GH) {
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85).setVisible(false).setDepth(900).setInteractive();
        this.dimmer.on('pointerdown', () => this.unzoomCard());
        
        const PADDING = 50; 

        this.mana = 3; this.maxMana = 3;
        this.manaText = this.add.text(PADDING, GH - 60, `Mana: ${this.mana}/${this.maxMana}`, { 
            fontSize: '32px', color: '#00ffff', fontStyle: 'bold' 
        }).setDepth(10);
        
        this.endTurnBtn = this.add.rectangle(GW - 120, GH - 160, 160, 60, 0xd04040).setInteractive().setDepth(10).setStrokeStyle(2, 0xffffff);
        this.add.text(GW - 120, GH - 160, "END TURN", { fontSize: '22px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
        this.endTurnBtn.on('pointerdown', () => this.endTurn());

        this.trashZone = this.add.zone(GW - 80, GH - 60, 110, 110).setRectangleDropZone(110, 110);
        this.trashZone.name = "discard_zone";
        const trashG = this.add.graphics().lineStyle(2, 0x666666);
        trashG.strokeRect(this.trashZone.x - 55, this.trashZone.y - 55, 110, 110);
        this.add.text(this.trashZone.x, this.trashZone.y, "TRASH", { fontSize: '14px', color: '#666' }).setOrigin(0.5);
        
        this.deckText = this.add.text(PADDING, GH - 110, `Deck: ${this.drawPile.length}`, { fontSize: '18px', color: '#aaa' });
        this.discardText = this.add.text(GW - 80, GH - 110, `0`, { fontSize: '18px', color: '#aaa' }).setOrigin(0.5);
    }

    

    setupInput() {
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.isBattleActive) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;
            if (Date.now() - card.pressStartTime > 200) { card.x = pointer.x; card.y = pointer.y - 80; card.setDepth(100); }
        });
        this.input.on('dragend', (pointer, gameObject, dropped// НОВОЕ: ОТРИСОВКА РЕЛИКВИЙ (ИСПРАВЛЕННАЯ)
    createRelicUI() {
        const startX = 50;  // Отступ от левого края
        const startY = 40;  // Отступ сверху
        const gap = 50;     // Расстояние между иконками

        // Рисуем каждую реликвию из инвентаря
        GameState.relics.forEach((relicId, index) => {
            const data = RELICS_DB[relicId];
            if (!data) return;

            const x = startX + (index * gap);
            
            // Рамка иконки
            this.add.rectangle(x, startY, 40, 40, 0x222222).setStrokeStyle(2, 0x666666);
            
            // Сама иконка
            const icon = this.add.text(x, startY, data.icon, { fontSize: '26px' }).setOrigin(0.5);
            
            // Делаем иконку интерактивной
            icon.setInteractive();
            icon.on('pointerdown', () => {
                // ПОДСКАЗКА
                // setOrigin(0, 0) означает, что текст рисуется ОТ точки нажатия ВПРАВО и ВНИЗ.
                // Это гарантирует, что текст не уйдет за левый край экрана.
                const txt = this.add.text(x + 25, startY + 20, data.desc, { 
                    fontSize: '20px', 
                    fontStyle: 'bold', 
                    color: '#ffffff', 
                    backgroundColor: '#000000', // Черный фон для читаемости
                    padding: { x: 10, y: 10 }
                }).setOrigin(0, 0).setDepth(3000);

                // Текст исчезнет сам через 3 секунды
                this.tweens.add({
                    targets: txt,
                    alpha: 0,
                    duration: 500,
                    delay: 2500,
                    onComplete: () => txt.destroy()
                });
            });
        });
        }) => {
            if (!this.isBattleActive) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;
            if (Date.now() - card.pressStartTime < 250) return;
            card.setDepth(0);
            if (!dropped) this.returnCardToHand(card);
        });
        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (!this.isBattleActive) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;
            const data = card.cardData;
            if (dropZone.name === "discard_zone") { this.discardCard(card); return; }

            let validTarget = null;
            if (dropZone.name === "enemy_target" && this.enemy.alive) {
                if (data.target === 'enemy' || data.target === 'any') validTarget = this.enemy;
                else this.showFloatingText(card.x, card.y, "Только на себя!", 0xffaaaa);
            }
            else if (dropZone.name === "player_target" && this.player.alive) {
                if (data.target === 'self' || data.target === 'any') validTarget = this.player;
                else this.showFloatingText(card.x, card.y, "Только на врага!", 0xffaaaa);
            }

            if (validTarget) {
                if (this.mana < data.cost) {
                    this.showFloatingText(card.x, card.y, "No Mana!", 0x00ffff);
                    this.returnCardToHand(card); return;
                }
                this.playCard(card, validTarget);
            } else { this.returnCardToHand(card); }
        });
    }

    // --- ВСПОМОГАТЕЛЬНЫЕ ---
    spendMana(amount) { this.mana -= amount; this.updateManaUI(); }
    
    discardHandVisual() { 
        this.hand.forEach(card => card.destroy()); 
        this.hand = []; 
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
    updateManaUI() { this.manaText.setText(`${this.mana}/${this.maxMana}`); }
    
    updateDeckUI() {
        this.deckText.setText(`Deck: ${this.drawPile.length}`);
        this.discardText.setText(`${this.discardPile.length}`);
    }
    
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
