// Файл: src/scenes/BattleScene.js

import { Unit } from '../prefabs/Unit.js';
import { Card } from '../prefabs/Card.js';
import { CARDS_DB } from '../data/cards.js';
import { RELICS_DB } from '../data/relics.js';
import { ENEMIES_DB } from '../data/enemies.js';
import { executeAction } from '../managers/ActionManager.js';
import { EffectManager } from '../managers/EffectManager.js';
import { GameState } from '../GameState.js';
import { RewardManager } from '../managers/RewardManager.js';
import { StatusManager } from '../managers/StatusManager.js';
import { RelicManager } from '../managers/RelicManager.js';
import { getComputedCard } from '../managers/CardLogic.js'; 
import { EnemyFactory } from '../managers/EnemyFactory.js'; 
import { BattleUIManager } from './battle/BattleUIManager.js';
import { HandManager } from './battle/HandManager.js';

export class BattleScene extends Phaser.Scene {
    constructor() { super({ key: 'BattleScene' }); }

    init(data) {
        this.enemyKey = data.enemyKey || "slime";
    }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.isBattleActive = true;

        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }

        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }
        
        this.ui = new BattleUIManager(this);
        this.handManager = new HandManager(this);
        
        this.effectManager = new EffectManager(this);
        this.rewardManager = new RewardManager();
        this.statusManager = new StatusManager(this);
        this.relicManager = new RelicManager(this); 

        this.drawPile = Phaser.Utils.Array.Shuffle([...GameState.deck]); 
        this.discardPile = [];
        this.hand = [];
        this.activeStack = [];

        this.mana = 3;
        this.maxMana = GameState.maxMana || 3;

        this.ui.createHUD(GW, GH);
        this.ui.createRelicUI(); 
        this.updateManaUI();

        this.player = new Unit(this, GW * 0.25, GH * 0.45, null, true);
        this.player.hp = GameState.currentHp;
        this.player.maxHp = GameState.maxHp;
        this.player.updateUI();
        this.add.existing(this.player);

        this.startNewBattle(this.enemyKey);

        this.relicManager.trigger('onBattleStart');
        this.updateGlobalUI();

        this.handManager.drawCards(5);
        this.setupInput();
        
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85)
            .setVisible(false).setDepth(900).setInteractive();
            
        this.dimmer.on('pointerdown', () => {
            if (this.zoomedCard) this.unzoomCard();
            else if (this.ui.deckContainer && this.ui.deckContainer.visible) this.ui.closeDeckView();
        });
    }

    startNewBattle(enemyKey) {
        if (this.enemy) this.enemy.destroy();
        const GW = this.scale.width; 
        const GH = this.scale.height;
        this.enemy = EnemyFactory.createEnemy(this, GW * 0.75, GH * 0.45, enemyKey);
        this.add.existing(this.enemy);
        this.enemy.chooseIntent();
        this.isBattleActive = true;
    }

    // =========================================================
    // ВВОД (ИСПРАВЛЕНО)
    // =========================================================

    setupInput() {
        this.input.on('dragstart', (pointer, gameObject) => {
            if (!this.isBattleActive) return;
            if (this.ui.deckContainer && this.ui.deckContainer.visible) return;
            
            // ЗАЩИТА: Если карта увеличена, запрещаем начало драга
            if (this.zoomedCard) return;

            const card = gameObject.parentContainer;
            this.activeStack = [card];
            card.setDepth(100); 
            card.pressStartTime = Date.now();
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.isBattleActive) return;
            
            // ЗАЩИТА: Если карта увеличена, игнорируем движения
            if (this.zoomedCard) return;
            
            // ЗАЩИТА: Если стек пуст (из-за бага или зума), выходим
            if (!this.activeStack || this.activeStack.length === 0) return;

            const leaderCard = gameObject.parentContainer;
            
            if (Date.now() - leaderCard.pressStartTime > 80) {
                const gap = 35; 
                const centerOffset = ((this.activeStack.length - 1) * gap) / 2;
                const verticalOffset = this.activeStack.length > 1 ? 110 : 80;

                this.targetPointerX = pointer.x;
                this.targetPointerY = pointer.y - verticalOffset;

                leaderCard.x = pointer.x - centerOffset;
                leaderCard.y = pointer.y - verticalOffset;
                
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
            
            // ЗАЩИТА
            if (this.zoomedCard) return;
            if (!this.activeStack || this.activeStack.length === 0) return;

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
            
            // ЗАЩИТА
            if (this.zoomedCard) {
                this.returnStackToHand(); // На всякий случай возвращаем
                return;
            }
            if (!this.activeStack || this.activeStack.length === 0) return;

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
                this.showFloatingText(this.activeStack[0].x, this.activeStack[0].y, "Not enough Mana!", 0xff0000);
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

    // --- ОСТАЛЬНЫЕ МЕТОДЫ БЕЗ ИЗМЕНЕНИЙ ---

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
                        onComplete: () => { 
                            this.playCard(card, target); 
                        }
                    });
                }
            });
        });
    }

    returnStackToHand() {
        this.activeStack.forEach(card => {
            card.setDepth(0);
        });
        this.activeStack = [];
        this.rearrangeHand();
    }

    discardStack() {
        const cardsToDiscard = [...this.activeStack];
        this.activeStack = [];
        this.hand = this.hand.filter(c => !cardsToDiscard.includes(c));
        cardsToDiscard.forEach(card => this.discardCard(card));
        this.rearrangeHand();
    }

    playCard(card, target) {
        const computedData = getComputedCard(card.cardInstance);
        if (computedData.actions) { 
            computedData.actions.forEach(action => { 
                let finalTarget = target;
                if (action.target === 'self') finalTarget = this.player;
                executeAction(this, action, this.player, finalTarget); 
            }); 
        }
        this.spendMana(computedData.cost);
        if (computedData.consume) {
            this.consumeCard(card);
        } else {
            this.discardCard(card);
        }
        this.updateGlobalUI();
    }

    consumeCard(card) {
        this.hand = this.hand.filter(c => c !== card);
        const index = GameState.deck.findIndex(c => c.uid === card.cardInstance.uid);
        if (index > -1) {
            GameState.deck.splice(index, 1);
        }
        this.tweens.add({
            targets: card, alpha: 0, scale: 0, angle: 360, duration: 600,
            onComplete: () => { card.destroy(); this.updateDeckUI(); this.rearrangeHand(); }
        });
    }

    discardCard(card) {
        this.discardPile.push(card.cardInstance);
        this.hand = this.hand.filter(c => c !== card);
        this.tweens.add({ 
            targets: card, 
            x: this.trashZone.x, y: this.trashZone.y, 
            alpha: 0, scale: 0.1, duration: 300, 
            onComplete: () => { card.destroy(); this.rearrangeHand(); } 
        });
        this.updateDeckUI();
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
                } else { break; }
            }
            const cardInstance = this.drawPile.pop();
            const card = new Card(this, GW/2, this.scale.height + 200, cardInstance);
            this.add.existing(card);
            this.hand.push(card);
        }
        this.updateDeckUI();
        this.rearrangeHand();
    }

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

    returnCardToHand(card) { this.tweens.add({ targets: card, x: card.baseX, y: card.baseY, duration: 200 }); }

    spendMana(amount) { this.mana -= amount; this.updateManaUI(); }

    updateManaUI() {
        this.ui.updateMana(this.mana, this.maxMana);
        this.updateGlobalUI();
    }

    updateGlobalUI() {
        if (this.player) {
            GameState.currentHp = this.player.hp;
        }
        this.game.events.emit('UPDATE_UI');
    }

    updateDeckUI() {
        this.ui.updateDeckCount(this.handManager ? this.handManager.drawPile.length : this.drawPile.length, this.handManager ? this.handManager.discardPile.length : this.discardPile.length);
    }

    showFloatingText(x, y, message, color) {
        this.ui.showFloatingText(x, y, message, color);
    }

    openDeckView() { this.ui.openDeckView(); }
    closeDeckView() { this.ui.closeDeckView(); }

    // --- ZOOM ---
    zoomCard(card) {
        if (this.zoomedCard) return; 
        this.zoomedCard = card;
        
        // ВАЖНО: Отключаем драг у самой карты
        this.input.setDraggable(card.bg, false);

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

        this.dimmer.setDepth(2999).setVisible(true);
        card.setDepth(3001); 
        card.setScrollFactor(0);
        card.savedX = card.x; 
        card.savedY = card.y; 
        card.savedScale = card.scale;
        card.toggleMode(true);
        
        this.tweens.add({ 
            targets: card, 
            x: this.scale.width / 2, 
            y: this.scale.height / 2, 
            scale: 2.5, 
            duration: 300, 
            ease: 'Back.out' 
        });
    }
    
    unzoomCard() {
        if (!this.zoomedCard) return; 
        const card = this.zoomedCard;
        this.zoomedCard = null; 
        
        // ВКЛЮЧАЕМ ДРАГ ОБРАТНО
        this.input.setDraggable(card.bg, true);

        card.toggleMode(false);
        
        this.tweens.add({ 
            targets: card, 
            x: card.savedX, 
            y: card.savedY, 
            scale: card.savedScale || 1, 
            duration: 250, 
            ease: 'Power2',
            onComplete: () => {
                if (this.parentContainerRef) {
                    this.parentContainerRef.add(card);
                    card.x = card.savedContainerX;
                    card.y = card.savedContainerY;
                    this.parentContainerRef = null;
                }
                
                if (this.ui.deckContainer && this.ui.deckContainer.visible) {
                    this.dimmer.setDepth(2999);
                } else {
                    this.dimmer.setVisible(false);
                }
                card.setDepth(0);
            }
        });
    }

    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();

        if (this.statusManager) {
            this.statusManager.onTurnStart(this.enemy); 
        }
        
        this.enemy.resetShield();

        let skipEnemyTurn = false;
        if (this.statusManager) {
            skipEnemyTurn = this.statusManager.checkTurnSkip(this.enemy);
        }

        if (!skipEnemyTurn) {
            this.enemy.executeIntent(this.player);
        } else {
            console.log("Враг заморожен");
        }
        
        this.updateGlobalUI();

        if (!this.player.alive) return;

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
        this.updateGlobalUI();
        if (unit.isPlayer) {
            this.isBattleActive = false;
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
            this.ui.showActClearScreen(GameState.act, () => {
                GameState.act++; GameState.level = 1; GameState.mapData = null; GameState.currentFloor = 0; GameState.currentHp = GameState.maxHp;
                this.scene.start('MapScene');
            });
            return;
        }

        const rewardKeys = this.rewardManager.getRewardOptions(3);
        
        this.ui.showVictoryScreen(
            rewardKeys,
            (cardKey) => {
                GameState.deck.push({ id: cardKey, uid: Date.now(), enchants: [] });
                this.scene.start('MapScene');
            },
            () => { this.scene.start('MapScene'); }
        );
    }
}
