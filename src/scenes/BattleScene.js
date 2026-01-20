// Файл: src/scenes/BattleScene.js

import { Unit } from '../prefabs/Unit.js';
import { Card } from '../prefabs/Card.js';
import { CARDS_DB } from '../data/cards.js';
import { ENEMIES_DB } from '../data/enemies.js';
import { executeAction } from '../managers/ActionManager.js';
import { EffectManager } from '../managers/EffectManager.js';
import { GameState } from '../GameState.js';
import { RewardManager } from '../managers/RewardManager.js';
import { StatusManager } from '../managers/StatusManager.js';
import { RelicManager } from '../managers/RelicManager.js';
import { getComputedCard } from '../managers/CardLogic.js'; 
import { EnemyFactory } from '../managers/EnemyFactory.js'; 
import { BattleUIManager } from './battle/BattleUIManager.js'; // <-- МЕНЕДЖЕР ИНТЕРФЕЙСА

export class BattleScene extends Phaser.Scene {
    constructor() { super({ key: 'BattleScene' }); }

    init(data) {
        this.enemyKey = data.enemyKey || "slime";
    }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.isBattleActive = true;

        // --- 0. Глобальный UI ---
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }

        // --- 1. Текстуры ---
        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }
        
        // --- 2. Менеджеры ---
        this.ui = new BattleUIManager(this); // Подключаем UI
        this.effectManager = new EffectManager(this);
        this.rewardManager = new RewardManager();
        this.statusManager = new StatusManager(this);
        this.relicManager = new RelicManager(this); 

        // --- 3. Данные ---
        this.drawPile = Phaser.Utils.Array.Shuffle([...GameState.deck]); 
        this.discardPile = [];
        this.hand = [];
        this.activeStack = []; // Стек для комбо

        // --- 4. Интерфейс ---
        this.ui.createHUD(GW, GH); // Отрисовка через менеджер
        this.ui.createRelicUI(); 

        // --- 5. Юниты ---
        this.player = new Unit(this, GW * 0.25, GH * 0.45, null, true);
        this.player.hp = GameState.currentHp;
        this.player.maxHp = GameState.maxHp;
        this.player.updateUI();
        this.add.existing(this.player);

        // Спавн врага
        this.startNewBattle(this.enemyKey);

        // Триггеры старта
        this.relicManager.trigger('onBattleStart');
        this.updateGlobalUI();

        // --- 6. Старт ---
        this.drawCards(5);
        this.setupInput();
        
        // Затемнение для зума/колоды (нужно хранить в сцене для управления)
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85).setVisible(false).setDepth(900).setInteractive();
        this.dimmer.on('pointerdown', () => {
            if (this.zoomedCard) this.unzoomCard();
            else if (this.deckContainer && this.deckContainer.visible) this.closeDeckView();
        });
    }

    // =========================================================
    // ЛОГИКА ИГРЫ
    // =========================================================

    startNewBattle(enemyKey) {
        if (this.enemy) this.enemy.destroy();
        const GW = this.scale.width; 
        const GH = this.scale.height;
        
        this.enemy = EnemyFactory.createEnemy(this, GW * 0.75, GH * 0.45, enemyKey);
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
                    this.ui.showFloatingText(100, 500, "Reshuffle!", 0xaaaaaa);
                } else {
                    break;
                }
            }

            const cardInstance = this.drawPile.pop();
            const card = new Card(this, GW/2, this.scale.height + 200, cardInstance);
            this.add.existing(card);
            this.hand.push(card);
        }
        this.updateDeckUI();
        this.rearrangeHand();
    }

    // =========================================================
    // ВВОД И СТЕК КАРТ (Drag & Drop)
    // =========================================================

    setupInput() {
        this.input.on('dragstart', (pointer, gameObject) => {
            if (!this.isBattleActive) return;
            if (this.deckContainer && this.deckContainer.visible) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;

            this.activeStack = [card];
            card.setDepth(100); 
            card.pressStartTime = Date.now();
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.isBattleActive) return;
            const leaderCard = gameObject.parentContainer;
            
            if (Date.now() - leaderCard.pressStartTime > 80) {
                // Центровка веера относительно пальца
                const gap = 35; 
                const centerOffset = ((this.activeStack.length - 1) * gap) / 2;
                const verticalOffset = this.activeStack.length > 1 ? 110 : 80;

                this.targetPointerX = pointer.x;
                this.targetPointerY = pointer.y - verticalOffset;

                leaderCard.x = pointer.x - centerOffset;
                leaderCard.y = pointer.y - verticalOffset;
                
                // Магнит
                const lastInStack = this.activeStack[this.activeStack.length - 1];
                for (let i = this.hand.length - 1; i >= 0; i--) {
                    const otherCard = this.hand[i];
                    if (this.activeStack.includes(otherCard)) continue;
                    
                    const dist = Phaser.Math.Distance.Between(lastInStack.x, lastInStack.y, otherCard.x, otherCard.y);
                    
                    if (dist < 130) { 
                        this.activeStack.push(otherCard);
                        otherCard.setDepth(100 - this.activeStack.length); 
                        this.tweens.add({ targets: otherCard, scale: { from: 1.1, to: 1 }, duration: 100 });
                    }
                }
                this.updateStackVisuals();
            }
        });

        this.input.on('dragend', (pointer, gameObject, dropped) => {
            if (!this.isBattleActive) return;
            
            if (this.activeStack.length === 1 && Date.now() - this.activeStack[0].pressStartTime < 250) {
                this.activeStack = []; 
                this.returnStackToHand(); 
                return;
            }

            this.activeStack.forEach(c => c.setDepth(0));

            if (!dropped) {
                this.returnStackToHand();
            }
        });

        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (!this.isBattleActive) return;
            
            if (dropZone.name === "discard_zone") { 
                this.discardStack(); 
                return; 
            }

            let totalCost = 0;
            this.activeStack.forEach(card => {
                const computed = getComputedCard(card.cardInstance);
                totalCost += computed.cost;
            });

            if (this.mana < totalCost) {
                this.ui.showFloatingText(this.activeStack[0].x, this.activeStack[0].y, "Not enough Mana!", 0xff0000);
                this.returnStackToHand();
                return;
            }

            let dropTargetUnit = null;
            if (dropZone.name === "enemy_target" && this.enemy.alive) dropTargetUnit = this.enemy;
            else if (dropZone.name === "player_target" && this.player.alive) dropTargetUnit = this.player;

            if (dropTargetUnit) {
                this.playStackSequence(dropTargetUnit);
            } else {
                this.returnStackToHand();
            }
        });
    }

    updateStackVisuals() {
        if (this.activeStack.length === 0) return;
        const anchorX = this.targetPointerX || this.activeStack[0].x;
        const anchorY = this.targetPointerY || this.activeStack[0].y;
        const gap = 40;     
        const angleStep = 10; 
        const startX = anchorX - ((this.activeStack.length - 1) * gap) / 2;
        const centerAngleIndex = (this.activeStack.length - 1) / 2;

        for (let i = 0; i < this.activeStack.length; i++) {
            const card = this.activeStack[i];
            const targetX = startX + (i * gap);
            const distFromCenter = Math.abs(i - centerAngleIndex);
            const targetY = anchorY + (distFromCenter * 10); 
            const speed = (i === 0) ? 0.6 : 0.4;
            
            card.x += (targetX - card.x) * speed;
            card.y += (targetY - card.y) * speed;

            const targetAngle = (i - centerAngleIndex) * angleStep;
            card.angle += (targetAngle - card.angle) * 0.3;
        }
    }

    playStackSequence(target) {
        const stackToPlay = [...this.activeStack];
        this.activeStack = []; 
        this.hand = this.hand.filter(c => !stackToPlay.includes(c));
        this.rearrangeHand();
        const stepDelay = Math.max(100, 500 - (stackToPlay.length * 80));

        stackToPlay.forEach((card, index) => {
            card.setDepth(2000 + index);
            const hoverX = target.x + (target.isPlayer ? 250 : -250); 
            const hoverY = target.y - 50;

            this.tweens.add({
                targets: card, x: hoverX, y: hoverY, scale: 1.3,
                angle: (target.isPlayer ? -15 : 15), duration: 400, delay: index * stepDelay, ease: 'Power2',
                onComplete: () => {
                    this.tweens.add({
                        targets: card, x: target.x, y: target.y, duration: 120, ease: 'Quad.easeIn',
                        onComplete: () => { this.playCardLogic(card, target); }
                    });
                }
            });
        });
    }

    playCardLogic(card, target) {
        const computedData = getComputedCard(card.cardInstance);
        if (computedData.actions) { 
            computedData.actions.forEach(action => { 
                let finalTarget = target;
                if (action.target === 'self') finalTarget = this.player;
                executeAction(this, action, this.player, finalTarget); 
            }); 
        }
        this.spendMana(computedData.cost);
        this.discardPile.push(card.cardInstance);
        this.tweens.add({
            targets: card, alpha: 0, scale: 0.5, y: card.y - 50, duration: 300,
            onComplete: () => { card.destroy(); this.updateDeckUI(); }
        });
        this.updateGlobalUI();
    }

    // =========================================================
    // ОСТАЛЬНЫЕ МЕТОДЫ
    // =========================================================

    returnStackToHand() {
        this.activeStack.forEach(card => {
            this.tweens.add({ targets: card, x: card.baseX, y: card.baseY, duration: 200 });
        });
        this.activeStack = [];
    }

    discardStack() {
        const cardsToDiscard = [...this.activeStack];
        this.activeStack = [];
        this.hand = this.hand.filter(c => !cardsToDiscard.includes(c));
        cardsToDiscard.forEach(card => {
            this.discardPile.push(card.cardInstance);
            this.tweens.add({ targets: card, x: this.trashZone.x, y: this.trashZone.y, alpha: 0, scale: 0.1, duration: 300, onComplete: () => card.destroy() });
        });
        this.updateDeckUI();
        this.rearrangeHand();
    }

    spendMana(amount) { this.mana -= amount; this.updateManaUI(); }
    discardHandVisual() { this.hand.forEach(card => card.destroy()); this.hand = []; }
    
    rearrangeHand() {
        const GW = this.scale.width; const GH = this.scale.height;
        const cardW = 150; const totalW = this.hand.length * cardW;
        const startX = (GW - totalW) / 2 + (cardW / 2);
        this.hand.forEach((card, index) => {
            if (this.activeStack.includes(card)) return;
            if (card === this.zoomedCard) return;
            card.baseX = startX + (index * cardW); 
            card.baseY = GH - 110;
            this.tweens.add({ targets: card, x: card.baseX, y: card.baseY, angle: (index - (this.hand.length/2)) * 2, duration: 300 }); 
        });
    }

    updateGlobalUI() { if (this.player) GameState.currentHp = this.player.hp; this.game.events.emit('UPDATE_UI'); }
    
    updateManaUI() { 
        this.ui.updateMana(this.mana, this.maxMana);
        this.updateGlobalUI(); 
    }
    
    updateDeckUI() { 
        this.ui.updateDeckCount(this.drawPile.length, this.discardPile.length);
    }

    // --- КОНЕЦ ХОДА (ИСПРАВЛЕНО) ---
    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();

        // 1. Старт хода врага
        if (this.statusManager) this.statusManager.onTurnStart(this.enemy); 
        this.enemy.resetShield();

        let skipEnemyTurn = false;
        if (this.statusManager) skipEnemyTurn = this.statusManager.checkTurnSkip(this.enemy);

        if (!skipEnemyTurn) this.enemy.executeIntent(this.player);
        else console.log("Враг заморожен");
        
        this.updateGlobalUI();
        if (!this.player.alive) return;

        // 2. Передача хода игроку
        this.time.delayedCall(1000, () => {
            if (!this.isBattleActive) return;
            
            if (this.statusManager) this.statusManager.onTurnEnd(this.enemy);
            if (this.statusManager) {
                this.statusManager.onTurnEnd(this.player);   
                this.statusManager.onTurnStart(this.player); 
            }
            this.relicManager.trigger('onTurnStart'); 
            this.updateGlobalUI();

            if (!this.player.alive) return;
            
            this.player.resetShield(); 
            this.enemy.chooseIntent();
            
            this.mana = this.maxMana; 
            this.updateManaUI();
            
            const cardsNeeded = 5 - this.hand.length;
            if (cardsNeeded > 0) this.drawCards(cardsNeeded);
            else this.rearrangeHand();
        });
    }

    handleUnitDeath(unit) {
        const GW = this.scale.width; const GH = this.scale.height;
        this.updateGlobalUI();

        if (unit.isPlayer) {
            this.isBattleActive = false;
            // Вызов экрана поражения через UI
            this.ui.showDefeatScreen(() => {
                this.scene.stop('UIScene');
                this.scene.start('MenuScene'); 
            });
        } else {
            this.relicManager.trigger('onKill', { victim: unit });
            this.handleVictory();
        }
    }

    handleVictory() {
        this.isBattleActive = false;
        this.discardHandVisual(); 

        const GW = this.scale.width; const GH = this.scale.height;
        GameState.currentHp = this.player.hp;
        GameState.level++;
        GameState.gold += 20;
        this.updateGlobalUI();

        const enemyData = ENEMIES_DB[this.enemyKey];
        if (enemyData && enemyData.tier === 'boss') {
            // Вызов экрана босса через UI
            this.ui.showActClearScreen(GameState.act, () => {
                GameState.act++; GameState.level = 1; GameState.mapData = null; GameState.currentFloor = 0; GameState.currentHp = GameState.maxHp;
                this.scene.start('MapScene');
            });
            return;
        }

        const rewardKeys = this.rewardManager.getRewardOptions(3);
        
        // Вызов экрана победы через UI
        this.ui.showVictoryScreen(
            rewardKeys,
            (cardKey) => {
                GameState.deck.push({ id: cardKey, uid: Date.now(), enchants: [] });
                this.scene.start('MapScene');
            },
            () => { this.scene.start('MapScene'); }
        );
    }

    // --- ПРОСМОТР КОЛОДЫ (Оставили локально, т.к. требует взаимодействия с инпутом) ---
    openDeckView() {
        const GW = this.scale.width; const GH = this.scale.height;
        if (!this.deckContainer) { this.deckContainer = this.add.container(0, 0).setDepth(3000).setScrollFactor(0); }
        this.deckContainer.removeAll(true); this.deckContainer.setVisible(true);
        this.dimmer.setDepth(2999).setVisible(true);
        const title = this.add.text(GW/2, 50, `FULL DECK (${GameState.deck.length})`, { fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        this.deckContainer.add(title);
        
        const startX = 150; const startY = 250; const gapX = 120; const gapY = 230;
        const cardsPerRow = Math.floor((GW - 200) / gapX);
        const sortedDeck = [...GameState.deck].sort((a, b) => a.id.localeCompare(b.id)); 
        
        sortedDeck.forEach((cardInstance, index) => {
            const col = index % cardsPerRow; const row = Math.floor(index / cardsPerRow);
            const x = startX + (col * gapX); const y = startY + (row * gapY);
            const card = new Card(this, x, y, cardInstance);
            this.input.setDraggable(card.bg, false);
            this.deckContainer.add(card);
        });
        const closeBtn = this.add.text(GW/2, GH - 80, "[ CLOSE VIEW ]", { fontSize: '30px', color: '#ff5555', fontStyle: 'bold', backgroundColor: '#000' }).setOrigin(0.5).setInteractive();
        closeBtn.on('pointerdown', () => this.closeDeckView());
        this.deckContainer.add(closeBtn);
    }
    closeDeckView() { if (this.deckContainer) this.deckContainer.setVisible(false); this.dimmer.setVisible(false); this.unzoomCard(); }

    zoomCard(card) {
        if (this.zoomedCard) return; this.zoomedCard = card;
        if (card.parentContainer) {
            this.parentContainerRef = card.parentContainer;
            card.savedContainerX = card.x; card.savedContainerY = card.y;
            const worldPos = card.getWorldTransformMatrix();
            card.x = worldPos.tx; card.y = worldPos.ty;
            card.parentContainer.remove(card);
            this.add.existing(card);
        }
        this.dimmer.setDepth(2999).setVisible(true);
        card.setDepth(3001); card.setScrollFactor(0);
        card.savedX = card.x; card.savedY = card.y; card.savedAngle = card.angle; card.savedScale = card.scale;
        card.toggleMode(true);
        this.tweens.add({ targets: card, x: this.scale.width / 2, y: this.scale.height / 2, angle: 0, scale: 2.5, duration: 300, ease: 'Back.out' });
    }
    unzoomCard() {
        if (!this.zoomedCard) return; const card = this.zoomedCard;
        this.zoomedCard = null; card.toggleMode(false);
        this.tweens.add({ targets: card, x: card.savedX, y: card.savedY, angle: card.savedAngle, scale: 1, duration: 250, ease: 'Power2', onComplete: () => {
            if (this.parentContainerRef) { this.parentContainerRef.add(card); card.x = card.savedContainerX; card.y = card.savedContainerY; this.parentContainerRef = null; }
            if (this.deckContainer && this.deckContainer.visible) this.dimmer.setDepth(2999); else this.dimmer.setVisible(false);
            card.setDepth(0);
        }});
    }
}
