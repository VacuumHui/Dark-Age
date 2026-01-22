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

        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');

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

        // Ресурсы
        this.mana = 3;
        this.maxMana = GameState.maxMana || 3;

        // UI
        this.ui.createHUD(GW, GH);
        this.ui.createRelicUI(); 
        this.updateManaUI();

        // Юниты
        this.player = new Unit(this, GW * 0.25, GH * 0.45, null, true);
        
        // --- !!! ЗАЩИТА ОТ БАГА С 0 ХП !!! ---
        if (GameState.currentHp <= 0) {
            console.warn("Emergency Heal Activated!");
            GameState.currentHp = 50; // Насильно лечим
        }
        // -------------------------------------
        
        this.player.hp = GameState.currentHp;
        this.player.maxHp = GameState.maxHp;
        this.player.updateUI();
        this.add.existing(this.player);

        this.startNewBattle(this.enemyKey);

        this.relicManager.trigger('onBattleStart');
        this.updateGlobalUI();

        // Старт: сбрасываем руку и берем 5 карт
        this.handManager.hand = []; 
        this.handManager.drawCards(5);
        this.handManager.setupInput();
        
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85).setVisible(false).setDepth(900).setInteractive();
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

    // --- МОСТЫ ---
    spendMana(amount) { this.mana -= amount; this.updateManaUI(); }

    updateManaUI() {
        this.ui.updateMana(this.mana, this.maxMana);
        this.updateGlobalUI();
    }

    updateGlobalUI() {
        if (this.player) GameState.currentHp = this.player.hp;
        this.game.events.emit('UPDATE_UI');
    }

    updateDeckUI() {
        this.ui.updateDeckCount(
            this.handManager.drawPile.length, 
            this.handManager.discardPile.length
        );
    }

    showFloatingText(x, y, message, color) {
        this.ui.showFloatingText(x, y, message, color);
    }

    openDeckView() { this.ui.openDeckView(); }
    closeDeckView() { this.ui.closeDeckView(); }
    
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
        card.savedX = card.x; card.savedY = card.y; card.savedScale = card.scale;
        card.toggleMode(true);
        this.tweens.add({ targets: card, x: this.scale.width / 2, y: this.scale.height / 2, scale: 2.5, duration: 300, ease: 'Back.out' });
    }
    
    unzoomCard() {
        if (!this.zoomedCard) return; const card = this.zoomedCard;
        this.zoomedCard = null; card.toggleMode(false);
        this.tweens.add({ targets: card, x: card.savedX, y: card.savedY, scale: 1, duration: 250, ease: 'Power2', onComplete: () => {
            if (this.parentContainerRef) { this.parentContainerRef.add(card); card.x = card.savedContainerX; card.y = card.savedContainerY; this.parentContainerRef = null; }
            if (this.ui.deckContainer && this.ui.deckContainer.visible) this.dimmer.setDepth(2999); else this.dimmer.setVisible(false);
            card.setDepth(0);
        }});
    }

    // --- ЛОГИКА ХОДА (FIXED) ---

    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();

        // 1. Ход Врага
        if (this.statusManager) this.statusManager.onTurnStart(this.enemy); 
        this.enemy.resetShield();

        let skipEnemyTurn = false;
        if (this.statusManager) skipEnemyTurn = this.statusManager.checkTurnSkip(this.enemy);

        if (!skipEnemyTurn) {
            this.enemy.executeIntent(this.player);
        } else {
            console.log("Враг заморожен");
        }
        
        this.updateGlobalUI();

        if (!this.player.alive) return; // Ждем обработчик смерти

        // 2. Передача хода
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
            
            // --- ДОБОР КАРТ (FIXED) ---
            const cardsInHand = this.handManager.hand.length;
            const cardsNeeded = 5 - cardsInHand;
            
            // Добираем только если меньше 5
            if (cardsNeeded > 0) {
                this.handManager.drawCards(cardsNeeded);
            } else {
                this.handManager.rearrangeHand();
            }
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
        this.handManager.discardHandVisual(); 

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
