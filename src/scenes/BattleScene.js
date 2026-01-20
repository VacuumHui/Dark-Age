// Файл: src/scenes/BattleScene.js

import { Unit } from '../prefabs/Unit.js';
import { Card } from '../prefabs/Card.js';
import { CARDS_DB } from '../data/cards.js';
import { RELICS_DB } from '../data/relics.js';
import { ENEMIES_DB } from '../data/enemies.js';
import { EffectManager } from '../managers/EffectManager.js';
import { GameState } from '../GameState.js';
import { RewardManager } from '../managers/RewardManager.js';
import { StatusManager } from '../managers/StatusManager.js';
import { RelicManager } from '../managers/RelicManager.js';
import { EnemyFactory } from '../managers/EnemyFactory.js'; 

// Подключаем наши новые под-менеджеры
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

        // 0. Запуск глобального UI
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }

        // 1. Генерация текстур (если нет)
        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }
        
        // 2. Инициализация Менеджеров
        this.ui = new BattleUIManager(this);          // Визуал
        this.handManager = new HandManager(this);     // Карты и Рука
        
        this.effectManager = new EffectManager(this);
        this.rewardManager = new RewardManager();
        this.statusManager = new StatusManager(this);
        this.relicManager = new RelicManager(this); 

        // 3. Ресурсы сцены
        this.mana = 3;
        this.maxMana = 3;

        // 4. Отрисовка Интерфейса (через менеджер)
        this.ui.createHUD(GW, GH);
        this.ui.createRelicUI(); 
        this.updateManaUI(); // Обновить текст маны сразу

        // 5. Создание Юнитов
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

        // 6. Старт игры (Раздача карт через менеджер)
        this.handManager.drawCards(5);
        this.handManager.setupInput();
        
        // Затемнение для зума (оставляем в сцене, так как оно перекрывает всё)
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85)
            .setVisible(false).setDepth(900).setInteractive();
            
        this.dimmer.on('pointerdown', () => {
            if (this.zoomedCard) this.unzoomCard();
            else if (this.deckContainer && this.deckContainer.visible) this.closeDeckView();
        });
    }

    // =========================================================
    // ЛОГИКА БОЯ (TURN FLOW)
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

    // Метод вызывается кнопкой "END TURN"
    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();

        // 1. НАЧАЛО ХОДА ВРАГА
        if (this.statusManager) {
            this.statusManager.onTurnStart(this.enemy); // Яд
        }
        
        // СБРОС ЩИТА ВРАГА (Перед его действием)
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

        // 2. ПЕРЕДАЧА ХОДА ИГРОКУ (Задержка)
        this.time.delayedCall(1000, () => {
            if (!this.isBattleActive) return;
            
            // Завершение эффектов врага
            if (this.statusManager) this.statusManager.onTurnEnd(this.enemy);

            // Начало хода игрока (Яд, Сила)
            if (this.statusManager) {
                this.statusManager.onTurnEnd(this.player);   
                this.statusManager.onTurnStart(this.player); 
            }
            this.relicManager.trigger('onTurnStart'); 
            
            this.updateGlobalUI();

            if (!this.player.alive) return;
            
            // СБРОС ЩИТА ИГРОКА
            this.player.resetShield(); 
            
            // Враг планирует
            this.enemy.chooseIntent();
            
            // Восстановление маны
            this.mana = this.maxMana; 
            this.updateManaUI();
            
            // Добор карт (через HandManager)
            const cardsNeeded = 5 - this.handManager.hand.length;
            if (cardsNeeded > 0) this.handManager.drawCards(cardsNeeded);
            else this.handManager.rearrangeHand();
        });
    }

    // =========================================================
    // СВЯЗУЮЩИЕ МЕТОДЫ (BRIDGE)
    // Эти методы вызывают другие менеджеры, поэтому они должны быть в сцене
    // =========================================================

    spendMana(amount) { 
        this.mana -= amount; 
        this.updateManaUI(); 
    }

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

    // Вызывается из HandManager при сбросе/доборе
    updateDeckUI() {
        this.ui.updateDeckCount(
            this.handManager.drawPile.length, 
            this.handManager.discardPile.length
        );
    }

    // =========================================================
    // СОБЫТИЯ СМЕРТИ И ПОБЕДЫ
    // =========================================================

    handleUnitDeath(unit) {
        this.updateGlobalUI();

        if (unit.isPlayer) {
            this.isBattleActive = false;
            // Показываем экран поражения через UI Manager
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

        const GW = this.scale.width; 
        const GH = this.scale.height;

        GameState.currentHp = this.player.hp;
        GameState.level++;
        GameState.gold += 20;
        this.updateGlobalUI();

        // Проверка на Босса
        const enemyData = ENEMIES_DB[this.enemyKey];
        if (enemyData && enemyData.tier === 'boss') {
            this.ui.showActClearScreen(GameState.act, () => {
                GameState.act++; 
                GameState.level = 1; 
                GameState.mapData = null; 
                GameState.currentFloor = 0; 
                GameState.currentHp = GameState.maxHp;
                this.scene.start('MapScene');
            });
            return;
        }

        // Выбор наград
        const rewardKeys = this.rewardManager.getRewardOptions(3);
        
        // Показываем экран победы через UI Manager
        this.ui.showVictoryScreen(
            rewardKeys,
            (cardKey) => { // onSelect
                GameState.deck.push({ id: cardKey, uid: Date.now(), enchants: [] });
                this.scene.start('MapScene');
            },
            () => { // onSkip
                this.scene.start('MapScene'); 
            }
        );
    }

    // =========================================================
    // ПРОСМОТР КОЛОДЫ И ЗУМ
    // (Оставлено в Сцене, так как Card.js зависит от scene.zoomCard)
    // =========================================================

    // Перенаправляем вызов из UI кнопки в этот метод
    openDeckView() {
        const GW = this.scale.width;
        
        if (!this.deckContainer) {
            this.deckContainer = this.add.container(0, 0).setDepth(3000).setScrollFactor(0);
        }
        this.deckContainer.removeAll(true);
        this.deckContainer.setVisible(true);
        this.dimmer.setDepth(2999).setVisible(true);

        const title = this.add.text(GW/2, 50, `FULL DECK (${GameState.deck.length})`, { 
            fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);
        this.deckContainer.add(title);

        const startX = 150; 
        const startY = 250; 
        const gapX = 120; 
        const gapY = 230;
        const cardsPerRow = Math.floor((GW - 200) / gapX);

        // Сортировка
        const sortedDeck = [...GameState.deck].sort((a, b) => a.id.localeCompare(b.id)); 

        sortedDeck.forEach((cardInstance, index) => {
            const col = index % cardsPerRow;
            const row = Math.floor(index / cardsPerRow);
            const x = startX + (col * gapX);
            const y = startY + (row * gapY);

            // Создаем карту для просмотра
            const card = new Card(this, x, y, cardInstance);
            this.input.setDraggable(card.bg, false); // Драгать нельзя
            this.deckContainer.add(card);
        });

        const closeBtn = this.add.text(GW/2, this.scale.height - 80, "[ CLOSE VIEW ]", { 
            fontSize: '30px', color: '#ff5555', fontStyle: 'bold', backgroundColor: '#000' 
        }).setOrigin(0.5).setInteractive();
        
        closeBtn.on('pointerdown', () => this.closeDeckView());
        this.deckContainer.add(closeBtn);
    }

    closeDeckView() {
        if (this.deckContainer) this.deckContainer.setVisible(false);
        this.dimmer.setVisible(false);
        this.unzoomCard();
    }

    zoomCard(card) {
        if (this.zoomedCard) return; 
        this.zoomedCard = card;
        
        // Если карта в контейнере (в колоде) - выносим её на сцену для зума
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
        card.toggleMode(true); // Показать подробный текст
        
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
        
        card.toggleMode(false);
        
        this.tweens.add({ 
            targets: card, 
            x: card.savedX, 
            y: card.savedY, 
            scale: card.savedScale || 1, // Возвращаем исходный масштаб
            duration: 250, 
            ease: 'Power2',
            onComplete: () => {
                // Возвращаем в контейнер, если была там
                if (this.parentContainerRef) {
                    this.parentContainerRef.add(card);
                    card.x = card.savedContainerX;
                    card.y = card.savedContainerY;
                    this.parentContainerRef = null;
                }
                
                // Убираем затемнение, если колода не открыта
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
