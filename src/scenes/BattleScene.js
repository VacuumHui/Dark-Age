// src/scenes/BattleScene.js

import { Unit } from '../prefabs/Unit.js';
import { Card } from '../prefabs/Card.js';
import { CARDS_DB } from '../data/cards.js';
import { executeAction } from '../managers/ActionManager.js';
import { EffectManager } from '../managers/EffectManager.js';
import { GameState } from '../GameState.js';           // <-- НОВОЕ
import { RewardManager } from '../managers/RewardManager.js'; // <-- НОВОЕ

export class BattleScene extends Phaser.Scene {
    constructor() { super({ key: 'BattleScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.isBattleActive = true;

        // Менеджеры
        this.effectManager = new EffectManager(this);
        this.rewardManager = new RewardManager();

        // --- Инициализация КОЛОДЫ БОЯ ---
        // 1. Копируем колоду игрока из сохранения
        // 2. Перемешиваем её
        this.drawPile = Phaser.Utils.Array.Shuffle([...GameState.deck]); 
        this.discardPile = []; // Сброс пуст
        this.hand = [];        // Рука пуста

        // UI
        this.createUI(GW, GH);

        // ЮНИТЫ
        // Игрок загружается с HP из GameState
        this.player = new Unit(this, GW * 0.25, GH * 0.45, null, true);
        this.player.hp = GameState.currentHp;
        this.player.maxHp = GameState.maxHp;
        this.player.updateUI();
        this.add.existing(this.player);

        // Враг
        this.startNewBattle("slime");

        // Первый добор
        this.drawCards(5);

        // Ивенты ввода (Drag & Drop)
        this.setupInput();
    }

    // --- ЛОГИКА КОЛОДЫ (ГЛАВНОЕ ИЗМЕНЕНИЕ) ---
    drawCards(amount) {
        const GW = this.scale.width;
        
        for (let i = 0; i < amount; i++) {
            if (this.hand.length >= 6) break; // Макс 6 карт в руке

            // Если колода пуста - замешиваем сброс
            if (this.drawPile.length === 0) {
                if (this.discardPile.length > 0) {
                    this.drawPile = Phaser.Utils.Array.Shuffle([...this.discardPile]);
                    this.discardPile = [];
                    this.showFloatingText(100, 500, "Reshuffle!", 0xaaaaaa);
                } else {
                    break; // Карт больше нет вообще
                }
            }

            // Берем карту сверху колоды
            const cardKey = this.drawPile.pop();
            const card = new Card(this, GW/2, this.scale.height + 200, cardKey);
            this.add.existing(card);
            this.hand.push(card);
        }
        this.updateDeckUI(); // Обновить счетчики
        this.rearrangeHand();
    }

    discardCard(card) {
        // Добавляем ключ карты в сброс
        // card.cardData - это объект данных, нам нужно найти ключ. 
        // Но проще хранить ключ внутри карты. Давай считать, что мы знаем ключ.
        // Для простоты: у нас есть CARDS_DB. Найдем ключ по имени (или передадим его в конструктор Card в будущем).
        // ХАК: Пока просто ищем ключ перебором, чтобы не менять Card.js
        const key = Object.keys(CARDS_DB).find(k => CARDS_DB[k].name === card.cardData.name);
        
        this.discardPile.push(key);
        
        this.hand = this.hand.filter(c => c !== card);
        this.tweens.add({ 
            targets: card, 
            x: this.trashZone.x, y: this.trashZone.y, 
            alpha: 0, scale: 0.1, duration: 300, 
            onComplete: () => { card.destroy(); this.rearrangeHand(); } 
        });
        this.updateDeckUI();
    }

    // --- ЭКРАН ПОБЕДЫ И ВЫБОРА КАРТ ---
    handleVictory() {
        this.isBattleActive = false;
        const GW = this.scale.width;
        const GH = this.scale.height;

        // Сохраняем HP игрока
        GameState.currentHp = this.player.hp;
        GameState.level++;

        // Затемнение
        const bg = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.9).setDepth(2000).setInteractive();
        const title = this.add.text(GW/2, 100, "VICTORY! CHOOSE A CARD:", { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);

        // Получаем 3 карты на выбор
        const rewards = this.rewardManager.getRewardOptions(3);

        rewards.forEach((cardKey, index) => {
            // Рисуем карты по центру
            const xOffset = (index - 1) * 120;
            const card = new Card(this, GW/2 + xOffset, GH/2, cardKey);
            card.setDepth(2002);
            this.add.existing(card);

            // Клик по карте = Выбор награды
            card.bg.on('pointerdown', () => {
                // 1. Добавляем в глобальную колоду
                GameState.deck.push(cardKey);
                
                // 2. Анимация выбора
                this.tweens.add({
                    targets: card, scale: 1.5, alpha: 0, duration: 300,
                    onComplete: () => {
                        // 3. Рестарт сцены (Новый бой)
                        this.scene.restart();
                    }
                });
            });
            
            // Чтобы не зумились, а выбирались, отключим старую логику зума
            card.bg.removeAllListeners('pointerdown');
            card.bg.removeAllListeners('pointerup');
            // Добавляем простую анимацию наведения
            card.bg.setInteractive();
            card.bg.on('pointerdown', () => {
                GameState.deck.push(cardKey);
                this.scene.restart();
            });
        });
        
        // Кнопка "Skip" (если ничего не нравится)
        const skipBtn = this.add.text(GW/2, GH - 100, "[ Skip Reward ]", { fontSize: '20px', color: '#666' }).setOrigin(0.5).setDepth(2001).setInteractive();
        skipBtn.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    // --- ОСТАЛЬНОЕ (Стандартная логика) ---
    
    startNewBattle(enemyKey) {
        if (this.enemy) this.enemy.destroy();
        const GW = this.scale.width; const GH = this.scale.height;
        this.enemy = new Unit(this, GW * 0.75, GH * 0.45, enemyKey, false);
        this.add.existing(this.enemy);
        this.enemy.chooseIntent();
        this.isBattleActive = true;
    }

    handleUnitDeath(unit) {
        const GW = this.scale.width; const GH = this.scale.height;
        if (unit.isPlayer) {
            // GAME OVER
            this.isBattleActive = false;
            this.cameras.main.flash(500, 255, 0, 0);
            this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.8).setDepth(2000);
            this.add.text(GW/2, GH/2 - 50, "YOU DIED", { fontSize: '64px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
            const btn = this.add.rectangle(GW/2, GH/2 + 50, 200, 60, 0xffffff).setInteractive().setDepth(2001);
            this.add.text(GW/2, GH/2 + 50, "RESTART", { fontSize: '24px', color: '#000' }).setOrigin(0.5).setDepth(2001);
            
            // Сброс прогресса
            btn.on('pointerdown', () => { 
                GameState.deck = ["strike", "strike", "strike", "defend", "defend", "defend"];
                GameState.currentHp = 50;
                this.scene.restart(); 
            });
        } else {
            // ВМЕСТО ПРОСТОГО NEXT BATTLE -> ЭКРАН НАГРАД
            this.handleVictory();
        }
    }

    createUI(GW, GH) {
        // UI
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85).setVisible(false).setDepth(900).setInteractive();
        this.dimmer.on('pointerdown', () => this.unzoomCard());
        
        this.mana = 3; this.maxMana = 3;
        this.manaText = this.add.text(20, GH - 50, `Mana: ${this.mana}/${this.maxMana}`, { fontSize: '32px', color: '#00ffff', fontStyle: 'bold' }).setDepth(10);
        
        this.endTurnBtn = this.add.rectangle(GW - 80, GH - 150, 140, 60, 0xd04040).setInteractive().setDepth(10).setStrokeStyle(2, 0xffffff);
        this.add.text(GW - 80, GH - 150, "END TURN", { fontSize: '20px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
        this.endTurnBtn.on('pointerdown', () => this.endTurn());

        this.trashZone = this.add.zone(GW - 60, GH - 50, 100, 100).setRectangleDropZone(100, 100);
        this.trashZone.name = "discard_zone";
        const trashG = this.add.graphics().lineStyle(2, 0x666666);
        trashG.strokeRect(this.trashZone.x - 50, this.trashZone.y - 50, 100, 100);
        this.add.text(this.trashZone.x, this.trashZone.y, "TRASH", { fontSize: '12px', color: '#666' }).setOrigin(0.5);
        
        // Счетчики колоды
        this.deckText = this.add.text(20, GH - 100, `Deck: ${this.drawPile.length}`, { fontSize: '16px', color: '#aaa' });
        this.discardText = this.add.text(GW - 60, GH - 100, `0`, { fontSize: '16px', color: '#aaa' }).setOrigin(0.5);
    }
    
    updateDeckUI() {
        this.deckText.setText(`Deck: ${this.drawPile.length}`);
        this.discardText.setText(`${this.discardPile.length}`);
    }

    setupInput() {
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.isBattleActive) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;
            if (Date.now() - card.pressStartTime > 200) { card.x = pointer.x; card.y = pointer.y - 80; card.setDepth(100); }
        });
        this.input.on('dragend', (pointer, gameObject, dropped) => {
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

    playCard(card, target) {
        const data = card.cardData;
        if (data.actions) { data.actions.forEach(action => { executeAction(this, action, this.player, target); }); }
        this.spendMana(data.cost);
        this.discardCard(card);
    }
    
    // Враг атакует
    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();
        this.enemy.executeIntent(this.player);
        this.discardHand(); // В конце хода рука сбрасывается!
        if (!this.player.alive) return;
        this.time.delayedCall(1000, () => {
            if (!this.isBattleActive) return;
            this.player.resetShield(); this.enemy.resetShield();
            this.enemy.chooseIntent();
            this.mana = this.maxMana; this.updateManaUI();
            this.drawCards(5);
        });
    }

    spendMana(amount) { this.mana -= amount; this.updateManaUI(); }
    discardHand() { 
        // Копия массива, чтобы не ломать цикл
        const cardsToDiscard = [...this.hand];
        cardsToDiscard.forEach(card => this.discardCard(card));
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
