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
        // Если передан конкретный ключ (например босс), используем его
        // Иначе null (фабрика сама сгенерирует отряд по бюджету)
        this.forcedEnemyKey = data.enemyKey || null;
    }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.isBattleActive = true;

        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        
        // --- 1. Менеджеры ---
        this.ui = new BattleUIManager(this);
        this.handManager = new HandManager(this);
        this.effectManager = new EffectManager(this);
        this.rewardManager = new RewardManager();
        this.statusManager = new StatusManager(this);
        this.relicManager = new RelicManager(this); 

        // --- 2. Данные ---
        this.drawPile = Phaser.Utils.Array.Shuffle([...GameState.deck]); 
        this.discardPile = [];
        this.hand = [];
        this.activeStack = []; // Для стека карт в руке
        this.maxMana = GameState.maxMana || 3;
        this.mana = this.maxMana;

        // --- 3. UI ---
        this.ui.createHUD(GW, GH);
        this.ui.createRelicUI(); 
        this.updateManaUI();

        // --- 4. Игрок ---
        // Ставим чуть левее центра
        this.player = new Unit(this, GW * 0.2, GH * 0.5, null, true); 
        this.player.hp = GameState.currentHp;
        this.player.maxHp = GameState.maxHp;
        
        // Защита от багов с 0 ХП
        if (this.player.hp <= 0) {
            this.player.hp = this.player.maxHp;
            GameState.currentHp = this.player.maxHp;
        }
        this.player.updateUI();
        this.add.existing(this.player);

        // --- 5. Враги (Массив) ---
        this.enemies = []; 
        this.startNewBattle(this.forcedEnemyKey);

        // --- 6. Триггеры и Старт ---
        this.relicManager.trigger('onBattleStart');
        this.updateGlobalUI();

        this.handManager.drawCards(5);
        this.handManager.setupInput();
        
        // Затемнение (для зума и просмотра колоды)
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85)
            .setVisible(false).setDepth(900).setInteractive();
            
        this.dimmer.on('pointerdown', () => {
            if (this.zoomedCard) this.unzoomCard();
            else if (this.ui.deckContainer && this.ui.deckContainer.visible) this.ui.closeDeckView();
        });
    }

    startNewBattle(enemyKey) {
        // Очистка старых врагов (на всякий случай)
        this.enemies.forEach(e => e.destroy());
        this.enemies = [];

        // Создаем массив врагов через фабрику (учитывая бюджет уровня)
        const newEnemies = EnemyFactory.createEnemies(this, enemyKey);
        
        newEnemies.forEach(enemy => {
            this.add.existing(enemy);
            enemy.chooseIntent(); // Враг сразу задумывает действие
            this.enemies.push(enemy);
        });

        this.isBattleActive = true;
    }

    // =========================================================
    // БЛОК 1: КАРТЫ И ЛОГИКА ПРИМЕНЕНИЯ
    // =========================================================

    playCard(card, target) {
        const computedData = getComputedCard(card.cardInstance);
        
        if (computedData.actions) { 
            computedData.actions.forEach(action => { 
                // Определяем фактическую цель (или цели)
                let finalTargets = []; 

                const actionTarget = action.target || computedData.target;
                
                if (actionTarget === 'self') {
                    // Цель - Игрок (баффы, блок, хил)
                    finalTargets.push(this.player);
                } 
                else if (actionTarget === 'all_enemies') {
                    // Атакуем ВСЕХ живых врагов (AOE)
                    finalTargets = this.enemies.filter(e => e.alive);
                }
                else {
                    // Одиночная цель (enemy) - тот, на кого скинули карту
                    if (target && target.alive) {
                        finalTargets.push(target);
                    }
                    // Фоллбек: Если кинули "в никуда" или на труп -> берем первого живого
                    else {
                         const firstAlive = this.enemies.find(e => e.alive);
                         if (firstAlive) finalTargets.push(firstAlive);
                    }
                }

                // Применяем действие ко всем найденным целям
                finalTargets.forEach(t => {
                    executeAction(this, action, this.player, t); 
                });
            }); 
        }

        // Тратим ману
        this.spendMana(computedData.cost);

        // Сжигаем или сбрасываем карту
        if (computedData.consume) {
            this.consumeCard(card);
        } else {
            this.discardCard(card);
        }
        
        this.updateGlobalUI();
    }

    consumeCard(card) {
        this.hand = this.hand.filter(c => c !== card);
        
        // Удаляем из ГЛОБАЛЬНОЙ колоды по UID
        const index = GameState.deck.findIndex(c => c.uid === card.cardInstance.uid);
        if (index > -1) GameState.deck.splice(index, 1);

        this.tweens.add({
            targets: card, alpha: 0, scale: 0, angle: 360, duration: 600,
            onComplete: () => { 
                card.destroy(); 
                this.updateDeckUI(); 
                this.handManager.rearrangeHand(); 
            }
        });
    }

    discardCard(card) {
        this.discardPile.push(card.cardInstance);
        this.hand = this.hand.filter(c => c !== card);
        this.tweens.add({ 
            targets: card, 
            x: this.ui.trashZone.x, y: this.ui.trashZone.y, 
            alpha: 0, scale: 0.1, duration: 300, 
            onComplete: () => { card.destroy(); this.handManager.rearrangeHand(); } 
        });
        this.updateDeckUI();
    }

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

    // =========================================================
    // БЛОК 3: ЛОГИКА ХОДА (ASYNC ДЛЯ ОТРЯДА)
    // =========================================================

    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();

        // Запускаем асинхронную обработку хода врагов
        this.processEnemyTurns();
    }

    async processEnemyTurns() {
        // 1. Блокируем ввод игрока
        this.input.enabled = false;

        // Фильтруем только живых врагов для хода
        const aliveEnemies = this.enemies.filter(e => e.alive);

        for (const enemy of aliveEnemies) {
            // Проверки на случай, если бой кончился посередине хода
            if (!this.isBattleActive) break;
            if (!this.player.alive) break;

            // Старт хода конкретного врага
            if (this.statusManager) this.statusManager.onTurnStart(enemy);
            
            enemy.resetShield();

            // Проверка заморозки/стана
            let skipEnemyTurn = false;
            if (this.statusManager) {
                skipEnemyTurn = this.statusManager.checkTurnSkip(enemy);
            }

            if (!skipEnemyTurn) {
                // Небольшая задержка перед атакой (чтобы игрок успел понять, кто бьет)
                await new Promise(resolve => this.time.delayedCall(300, resolve));
                
                enemy.executeIntent(this.player);
                
                // Задержка после атаки (чтобы цифры урона успели улететь)
                await new Promise(resolve => this.time.delayedCall(500, resolve));
            } else {
                // Если пропуск хода - просто пауза
                console.log(`${enemy.name} пропускает ход`);
                await new Promise(resolve => this.time.delayedCall(800, resolve));
            }

            // Конец хода врага (тикают статусы типа Weak)
            if (this.statusManager) this.statusManager.onTurnEnd(enemy);
            
            this.updateGlobalUI();
        }

        // Если игрок умер в процессе атак
        if (!this.player.alive) return;

        // 2. Возвращаем ход Игроку
        if (this.isBattleActive) {
            
            if (this.statusManager) {
                this.statusManager.onTurnEnd(this.player);   
                this.statusManager.onTurnStart(this.player); 
            }
            this.relicManager.trigger('onTurnStart'); 
            
            this.updateGlobalUI();

            if (!this.player.alive) return;
            
            this.player.resetShield(); 
            
            // Все живые враги планируют следующее действие
            this.enemies.filter(e => e.alive).forEach(e => e.chooseIntent());
            
            this.mana = this.maxMana; 
            this.updateManaUI();
            
            const cardsNeeded = 5 - this.handManager.hand.length;
            if (cardsNeeded > 0) this.handManager.drawCards(cardsNeeded);
            else this.handManager.rearrangeHand();
            
            // Разблокируем ввод
            this.input.enabled = true;
        }
    }

    // =========================================================
    // БЛОК 4: СОБЫТИЯ И ПОБЕДА/ПОРАЖЕНИЕ
    // =========================================================

    handleUnitDeath(unit) {
        this.updateGlobalUI();
        
        if (unit.isPlayer) {
            this.isBattleActive = false;
            this.ui.showDefeatScreen(() => { 
                this.scene.stop('UIScene');
                this.scene.start('MenuScene'); 
            });
        } else {
            // Умер враг
            this.relicManager.trigger('onKill', { victim: unit });
            
            // Проверяем, остался ли хоть один живой враг
            const anyAlive = this.enemies.some(e => e.alive);
            
            if (!anyAlive) {
                // Если все мертвы - Победа
                this.handleVictory();
            }
        }
    }

    handleVictory() {
        this.isBattleActive = false;
        this.handManager.discardHandVisual(); 

        const GW = this.scale.width; 
        const GH = this.scale.height;
        GameState.currentHp = this.player.hp;
        GameState.level++;
        
        // Золото: База 20 + 5 за каждого врага
        const goldReward = 20 + (this.enemies.length * 5);
        GameState.gold += goldReward;
        
        if (GameState.eventFightBonusGold > 0) {
            GameState.gold += GameState.eventFightBonusGold;
            GameState.eventFightBonusGold = 0;
        }
        this.updateGlobalUI();

        // Проверяем, был ли это Босс
        const isBossFight = this.forcedEnemyKey && ENEMIES_DB[this.forcedEnemyKey].tier === 'boss';

        if (isBossFight) {
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
