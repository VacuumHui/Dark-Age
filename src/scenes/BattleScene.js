// Файл: src/scenes/BattleScene.js

import { Unit } from '../prefabs/Unit.js';
import { Card } from '../prefabs/Card.js';
import { CARDS_DB } from '../data/cards.js';
import { RELICS_DB } from '../data/relics.js';
import { executeAction } from '../managers/ActionManager.js';
import { EffectManager } from '../managers/EffectManager.js';
import { GameState } from '../GameState.js';
import { RewardManager } from '../managers/RewardManager.js';
import { StatusManager } from '../managers/StatusManager.js';
import { RelicManager } from '../managers/RelicManager.js';

export class BattleScene extends Phaser.Scene {
    constructor() { super({ key: 'BattleScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.isBattleActive = true;

        // --- 1. ТЕКСТУРЫ ---
        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }
        
        // --- 2. МЕНЕДЖЕРЫ ---
        this.effectManager = new EffectManager(this);
        this.rewardManager = new RewardManager();
        this.statusManager = new StatusManager(this);
        this.relicManager = new RelicManager(this); 

        // --- 3. ДАННЫЕ ---
        // Важно: drawPile - это ТЕКУЩАЯ стопка добора в бою.
        // GameState.deck - это ПОЛНАЯ колода игрока (для просмотра).
        this.drawPile = Phaser.Utils.Array.Shuffle([...GameState.deck]); 
        this.discardPile = [];
        this.hand = [];

        // --- 4. ИНТЕРФЕЙС ---
        this.createUI(GW, GH);
        this.createRelicUI(); 

        // --- 5. ЮНИТЫ ---
        this.player = new Unit(this, GW * 0.25, GH * 0.45, null, true);
        this.player.hp = GameState.currentHp;
        this.player.maxHp = GameState.maxHp;
        this.player.updateUI();
        this.add.existing(this.player);

        this.startNewBattle("slime");

        // Триггер: Начало боя
        this.relicManager.trigger('onBattleStart');

        // --- 6. СТАРТ ---
        this.drawCards(5);
        this.setupInput();
    }

    // =========================================================
    // ПРОСМОТР КОЛОДЫ (НОВОЕ!)
    // =========================================================

    openDeckView() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // Создаем контейнер, если его нет
        if (!this.deckContainer) {
            this.deckContainer = this.add.container(0, 0).setDepth(3000).setScrollFactor(0);
        }
        
        this.deckContainer.removeAll(true); // Чистим старое
        this.deckContainer.setVisible(true);
        
        // Затемнение (очень высокое)
        this.dimmer.setDepth(2999).setVisible(true);

        // Заголовок
        const title = this.add.text(GW/2, 50, `FULL DECK (${GameState.deck.length})`, { 
            fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);
        this.deckContainer.add(title);

        // Рисуем сетку карт
        const startX = 150;
        const startY = 150;
        const gapX = 120;
        const gapY = 160;
        const cardsPerRow = Math.floor((GW - 200) / gapX);

        // Сортируем для красоты
        const sortedDeck = [...GameState.deck].sort(); 

        sortedDeck.forEach((cardKey, index) => {
            const col = index % cardsPerRow;
            const row = Math.floor(index / cardsPerRow);

            const x = startX + (col * gapX);
            const y = startY + (row * gapY);

            // Создаем карту визуально
            const card = new Card(this, x, y, cardKey);
            // Отключаем перетаскивание, оставляем только зум
            this.input.setDraggable(card.bg, false);
            
            this.deckContainer.add(card);
        });

        // Кнопка закрытия
        const closeBtn = this.add.text(GW/2, GH - 80, "[ CLOSE VIEW ]", { 
            fontSize: '30px', color: '#ff5555', fontStyle: 'bold', backgroundColor: '#000'
        }).setOrigin(0.5).setInteractive();
        
        closeBtn.on('pointerdown', () => this.closeDeckView());
        this.deckContainer.add(closeBtn);
    }

    closeDeckView() {
        if (this.deckContainer) {
            this.deckContainer.setVisible(false);
        }
        this.dimmer.setVisible(false);
        this.unzoomCard();
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

    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();

        this.enemy.executeIntent(this.player);

        if (!this.player.alive) return;

        this.time.delayedCall(1000, () => {
            if (!this.isBattleActive) return;
            
            if (this.statusManager) {
                this.statusManager.onTurnEnd(this.player);   
                this.statusManager.onTurnStart(this.player); 
            }

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
            this.isBattleActive = false;
            this.cameras.main.flash(500, 255, 0, 0);
            
            this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.8).setDepth(2000);
            this.add.text(GW/2, GH/2 - 50, "YOU DIED", { fontSize: '64px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
            
            const btn = this.add.rectangle(GW/2, GH/2 + 50, 200, 60, 0xffffff).setInteractive().setDepth(2001);
            this.add.text(GW/2, GH/2 + 50, "RESTART", { fontSize: '24px', color: '#000' }).setOrigin(0.5).setDepth(2001);
            
            btn.on('pointerdown', () => { 
                GameState.deck = ["strike", "strike", "strike", "defend", "defend", "defend"];
                GameState.relics = []; 
                GameState.currentHp = 50;
                GameState.mapData = null;
                this.scene.start('MapScene'); 
            });
        } else {
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
                this.scene.start('MapScene');
            });
            card.bg.removeAllListeners('pointerup');
        });
        
        const skipBtn = this.add.text(GW/2, GH - 100, "[ Skip Reward ]", { fontSize: '20px', color: '#666' }).setOrigin(0.5).setDepth(2001).setInteractive();
        skipBtn.on('pointerdown', () => {
            this.scene.start('MapScene');
        });
    }

    // =========================================================
    // UI И ВВОД
    // =========================================================

    createUI(GW, GH) {
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85).setVisible(false).setDepth(900).setInteractive();
        
        // Умный клик по затемнению (закрывает зум ИЛИ колоду)
        this.dimmer.on('pointerdown', () => {
            if (this.zoomedCard) this.unzoomCard();
            else if (this.deckContainer && this.deckContainer.visible) this.closeDeckView();
        });
        
        const PADDING = 50; 

        // Мана
        this.mana = 3; this.maxMana = 3;
        this.manaText = this.add.text(PADDING, GH - 60, `Mana: ${this.mana}/${this.maxMana}`, { 
            fontSize: '32px', color: '#00ffff', fontStyle: 'bold' 
        }).setDepth(10);
        
        // Кнопка Конец Хода
        this.endTurnBtn = this.add.rectangle(GW - 120, GH - 160, 160, 60, 0xd04040).setInteractive().setDepth(10).setStrokeStyle(2, 0xffffff);
        this.add.text(GW - 120, GH - 160, "END TURN", { fontSize: '22px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
        this.endTurnBtn.on('pointerdown', () => this.endTurn());

        // Мусорка
        this.trashZone = this.add.zone(GW - 80, GH - 60, 110, 110).setRectangleDropZone(110, 110);
        this.trashZone.name = "discard_zone";
        const trashG = this.add.graphics().lineStyle(2, 0x666666);
        trashG.strokeRect(this.trashZone.x - 55, this.trashZone.y - 55, 110, 110);
        this.add.text(this.trashZone.x, this.trashZone.y, "TRASH", { fontSize: '14px', color: '#666' }).setOrigin(0.5);
        
        // КНОПКА "VIEW DECK" (НОВОЕ!)
        const deckBtnX = PADDING + 40; 
        const deckBtnY = GH - 120;
        this.deckBtn = this.add.rectangle(deckBtnX, deckBtnY, 140, 40, 0x333333).setInteractive().setStrokeStyle(2, 0x888888);
        this.deckText = this.add.text(deckBtnX, deckBtnY, `Deck: ${this.drawPile.length}`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        
        // При клике открываем ПОЛНУЮ колоду
        this.deckBtn.on('pointerdown', () => this.openDeckView());

        // Счетчик сброса
        this.discardText = this.add.text(GW - 80, GH - 110, `0`, { fontSize: '18px', color: '#aaa' }).setOrigin(0.5);
    }

    createRelicUI() {
        const startX = 50;
        const startY = 40; 
        const gap = 50;    

        GameState.relics.forEach((relicId, index) => {
            const data = RELICS_DB[relicId];
            if (!data) return;

            const x = startX + (index * gap);
            
            this.add.rectangle(x, startY, 40, 40, 0x222222).setStrokeStyle(2, 0x666666);
            
            const icon = this.add.text(x, startY, data.icon, { fontSize: '26px' }).setOrigin(0.5);
            
            icon.setInteractive();
            icon.on('pointerdown', () => {
                const txt = this.add.text(x + 25, startY + 20, data.desc, { 
                    fontSize: '20px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#000000', padding: { x: 10, y: 10 }
                }).setOrigin(0, 0).setDepth(3000);

                this.tweens.add({ targets: txt, alpha: 0, duration: 500, delay: 2500, onComplete: () => txt.destroy() });
            });
        });
    }

    setupInput() {
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.isBattleActive) return;
            // Блокируем, если открыта колода
            if (this.deckContainer && this.deckContainer.visible) return;
            
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
        // Текст на кнопке показывает сколько карт в колоде добора (Draw Pile)
        this.deckText.setText(`Deck: ${this.drawPile.length}`);
        this.discardText.setText(`${this.discardPile.length}`);
    }
    
    showFloatingText(x, y, message, color) {
        const txt = this.add.text(x, y, message, { fontSize: '24px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        txt.setTint(color);
        this.tweens.add({ targets: txt, y: y - 80, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });
    }
    
    // --- ЗУМ КАРТЫ С "ВЫРЫВАНИЕМ" ИЗ КОНТЕЙНЕРА (ЧТОБЫ БЫЛА ПОВЕРХ ЗАТЕМНЕНИЯ) ---
    zoomCard(card) {
        if (this.zoomedCard) return; 
        this.zoomedCard = card;
        
        // Если карта в контейнере колоды - выносим её на сцену
        if (card.parentContainer) {
            this.parentContainerRef = card.parentContainer;
            card.savedContainerX = card.x;
            card.savedContainerY = card.y;
            
            const worldPos = card.getWorldTransformMatrix();
            card.x = worldPos.tx;
            card.y = worldPos.ty;
            
            card.parentContainer.remove(card);
            this.add.existing(card);
        }

        this.dimmer.setDepth(2999).setVisible(true); // Затемнение под картой
        card.setDepth(3001); // Карта поверх всего
        card.setScrollFactor(0);

        card.savedX = card.x; 
        card.savedY = card.y; 
        card.savedAngle = card.angle; 
        card.savedScale = card.scale;
        
        card.toggleMode(true);
        
        this.tweens.add({ 
            targets: card, 
            x: this.scale.width / 2, 
            y: this.scale.height / 2, 
            angle: 0, 
            scale: 2.5, 
            duration: 300, 
            ease: 'Back.out' 
        });
    }
    
    unzoomCard() {
        if (!this.zoomedCard) return; 
        const card = this.zoomedCard;
        this.zoomedCard = null; 
        
        card.toggleMode(false);
        
        this.tweens.add({ 
            targets: card, 
            x: card.savedX, 
            y: card.savedY, 
            angle: card.savedAngle, 
            scale: 1, 
            duration: 250, 
            ease: 'Power2',
            onComplete: () => {
                // Возвращаем в контейнер
                if (this.parentContainerRef) {
                    this.parentContainerRef.add(card);
                    card.x = card.savedContainerX;
                    card.y = card.savedContainerY;
                    this.parentContainerRef = null;
                }
                
                // Если открыта колода - затемнение остается
                if (this.deckContainer && this.deckContainer.visible) {
                    this.dimmer.setDepth(2999);
                } else {
                    this.dimmer.setVisible(false);
                }
                card.setDepth(0);
            }
        });
    }
}
