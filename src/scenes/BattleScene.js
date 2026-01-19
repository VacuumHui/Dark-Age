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

export class BattleScene extends Phaser.Scene {
    constructor() { super({ key: 'BattleScene' }); }

    init(data) {
        this.enemyKey = data.enemyKey || "slime";
    }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;
        this.isBattleActive = true;

        if (!this.scene.isActive('UIScene')) { this.scene.launch('UIScene'); }
        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }
        
        this.effectManager = new EffectManager(this);
        this.rewardManager = new RewardManager();
        this.statusManager = new StatusManager(this);
        this.relicManager = new RelicManager(this); 

        this.drawPile = Phaser.Utils.Array.Shuffle([...GameState.deck]); 
        this.discardPile = [];
        this.hand = [];
        
        // НОВОЕ: Стек для комбо (какие карты мы сейчас тащим)
        this.activeStack = []; 

        this.createUI(GW, GH);
        this.createRelicUI(); 

        this.player = new Unit(this, GW * 0.25, GH * 0.45, null, true);
        this.player.hp = GameState.currentHp;
        this.player.maxHp = GameState.maxHp;
        this.player.updateUI();
        this.add.existing(this.player);

        this.startNewBattle(this.enemyKey);

        this.relicManager.trigger('onBattleStart');
        this.updateGlobalUI();

        this.drawCards(5);
        this.setupInput();
    }

    // =========================================================
    // ЛОГИКА "МАГНИТНОГО СТЕКА" (SETUP INPUT)
    // =========================================================

    setupInput() {
        this.input.on('dragstart', (pointer, gameObject) => {
            if (!this.isBattleActive) return;
            const card = gameObject.parentContainer;
            if (this.zoomedCard) return;

            // 1. Инициализируем стек
            // Если мы схватили карту, она становится "Лидером" стека
            this.activeStack = [card];
            
            // Поднимаем лидера наверх
            card.setDepth(100);
            
            // Запоминаем время для клика
            card.pressStartTime = Date.now();
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.isBattleActive) return;
            if (this.deckContainer && this.deckContainer.visible) return;
            const leaderCard = gameObject.parentContainer;
            
            // 2. Двигаем Лидера за пальцем
            // Если это был просто клик, мы не двигаем сразу (защита от тряски)
            if (Date.now() - leaderCard.pressStartTime > 150) {
                leaderCard.x = pointer.x;
                leaderCard.y = pointer.y - 80;
                
                // 3. МАГНИТ: Проверяем, коснулись ли мы других карт в руке?
                // Мы идем с конца, чтобы брать верхние карты
                for (let i = this.hand.length - 1; i >= 0; i--) {
                    const otherCard = this.hand[i];
                    
                    // Не проверяем самого себя и тех, кто уже в стеке
                    if (this.activeStack.includes(otherCard)) continue;

                    // Простая проверка дистанции (если центры карт близко)
                    const dist = Phaser.Math.Distance.Between(leaderCard.x, leaderCard.y, otherCard.x, otherCard.y);
                    
                    // Если дистанция меньше 100 пикселей - ХВАТАЕМ!
                    if (dist < 100) {
                        this.activeStack.push(otherCard); // Добавляем в пачку
                        otherCard.setDepth(99 - this.activeStack.length); // Чуть ниже лидера
                        
                        // Удаляем из логической "руки", чтобы не мешались при перестроении
                        // Но пока оставим в массиве hand, удалим при дропе.
                    }
                }

                // 4. Двигаем "хвост" (прилипшие карты)
                this.updateStackVisuals();
            }
        });

        this.input.on('dragend', (pointer, gameObject, dropped) => {
            if (!this.isBattleActive) return;
            
            // Если это был клик (стек 1 карта и быстро отпустили) -> Зум
            if (this.activeStack.length === 1 && Date.now() - this.activeStack[0].pressStartTime < 250) {
                this.returnStackToHand();
                return;
            }

            // Сбрасываем глубину
            this.activeStack.forEach(c => c.setDepth(0));

            // Если бросили мимо зоны
            if (!dropped) {
                this.returnStackToHand();
            }
        });

        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (!this.isBattleActive) return;
            const leaderCard = gameObject.parentContainer;
            
            // Если бросили в сброс - сбрасываем весь стек
            if (dropZone.name === "discard_zone") { 
                this.discardStack(); 
                return; 
            }

            // Проверяем валидность цели и ману ДЛЯ ВСЕГО СТЕКА
            let totalCost = 0;
            let allValid = true;

            // Считаем общую стоимость и проверяем цели
            this.activeStack.forEach(card => {
                const computed = getComputedCard(card.cardInstance);
                totalCost += computed.cost;

                // Проверка цели для каждой карты
                // Если хоть одна карта не подходит к зоне (например, Атака на Игрока) - отменяем всё?
                // Или умная логика: Атаки летят во врага, Баффы в себя.
                
                // Давай используем нашу "Умную систему" из playCard.
                // Если мы бросили на Врага, а карта "Блок" (Self) - playCard сама перенаправит её на игрока.
                // Главное, чтобы зона в принципе подходила под ТИП карты.
                // Но у нас универсальные зоны. 
                // Упрощение: Если бросили на Врага или Игрока - считаем, что игрок хочет разыграть комбо.
            });

            // Проверка Маны
            if (this.mana < totalCost) {
                this.showFloatingText(leaderCard.x, leaderCard.y, "Not enough Mana!", 0xff0000);
                this.returnStackToHand();
                return;
            }

            // ОПРЕДЕЛЯЕМ ГЛОБАЛЬНУЮ ЦЕЛЬ БРОСКА
            let dropTargetUnit = null;
            if (dropZone.name === "enemy_target" && this.enemy.alive) dropTargetUnit = this.enemy;
            else if (dropZone.name === "player_target" && this.player.alive) dropTargetUnit = this.player;

            if (dropTargetUnit) {
                // ИГРАЕМ ВЕСЬ СТЕК!
                // Важно: играем копию массива, так как playCard будет удалять их
                const cardsToPlay = [...this.activeStack];
                this.activeStack = []; // Очищаем текущий стек

                cardsToPlay.forEach((card, index) => {
                    // Небольшая задержка между картами для красоты (100мс)
                    this.time.delayedCall(index * 200, () => {
                        this.playCard(card, dropTargetUnit);
                    });
                });
            } else {
                this.returnStackToHand();
            }
        });
    }

    // Двигаем карты в стеке, чтобы они висели "лесенкой" под лидером
    updateStackVisuals() {
        if (this.activeStack.length < 2) return;

        const leader = this.activeStack[0];
        
        for (let i = 1; i < this.activeStack.length; i++) {
            const follower = this.activeStack[i];
            
            // Смещение: каждая следующая карта чуть ниже и правее (эффект веера)
            const offsetX = i * 20; 
            const offsetY = i * 40; 

            // Плавно двигаем к точке за лидером
            // (Простая интерполяция для мягкости)
            follower.x += ((leader.x + offsetX) - follower.x) * 0.3;
            follower.y += ((leader.y + offsetY) - follower.y) * 0.3;
        }
    }

    // Возврат всей пачки в руку
    returnStackToHand() {
        this.activeStack.forEach(card => {
            this.tweens.add({ targets: card, x: card.baseX, y: card.baseY, duration: 200 });
        });
        this.activeStack = [];
    }

    // Сброс всей пачки (если кинули в мусорку)
    discardStack() {
        const cardsToDiscard = [...this.activeStack];
        this.activeStack = [];
        cardsToDiscard.forEach(card => this.discardCard(card));
    }


    // =========================================================
    // ОСТАЛЬНЫЕ МЕТОДЫ (БЕЗ ИЗМЕНЕНИЙ)
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

    playCard(card, target) {
        const computedData = getComputedCard(card.cardInstance);
        if (computedData.actions) { 
            computedData.actions.forEach(action => { 
                let finalTarget = target;
                // Умный таргетинг: Если карта требует Self, игнорируем, куда её бросили
                if (action.target === 'self') finalTarget = this.player;
                
                executeAction(this, action, this.player, finalTarget); 
            }); 
        }
        this.spendMana(computedData.cost);
        this.discardCard(card);
        this.updateGlobalUI();
    }

    discardCard(card) {
        this.discardPile.push(card.cardInstance);
        this.hand = this.hand.filter(c => c !== card);
        this.tweens.add({ targets: card, x: this.trashZone.x, y: this.trashZone.y, alpha: 0, scale: 0.1, duration: 300, onComplete: () => { card.destroy(); this.rearrangeHand(); } });
        this.updateDeckUI();
    }

    endTurn() {
        if (!this.isBattleActive) return;
        if (this.zoomedCard) this.unzoomCard();

        if (this.statusManager) this.statusManager.onTurnStart(this.enemy); 
        this.enemy.resetShield();

        let skipEnemyTurn = false;
        if (this.statusManager) skipEnemyTurn = this.statusManager.checkTurnSkip(this.enemy);

        if (!skipEnemyTurn) this.enemy.executeIntent(this.player);
        else console.log("Враг заморожен");
        
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
        const GW = this.scale.width; const GH = this.scale.height;
        this.updateGlobalUI();

        if (unit.isPlayer) {
            this.isBattleActive = false;
            this.cameras.main.flash(500, 255, 0, 0);
            this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.8).setDepth(2000);
            this.add.text(GW/2, GH/2 - 50, "YOU DIED", { fontSize: '64px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
            const btn = this.add.rectangle(GW/2, GH/2 + 50, 200, 60, 0xffffff).setInteractive().setDepth(2001);
            this.add.text(GW/2, GH/2 + 50, "RESTART", { fontSize: '24px', color: '#000' }).setOrigin(0.5).setDepth(2001);
            btn.on('pointerdown', () => { 
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
            this.showActClearScreen(GW, GH);
            return;
        }

        const bg = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.9).setDepth(2000).setInteractive();
        this.add.text(GW/2, 100, "VICTORY! CHOOSE A CARD:", { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
        const rewardKeys = this.rewardManager.getRewardOptions(3);
        rewardKeys.forEach((cardKey, index) => {
            const xOffset = (index - 1) * 200;
            const tempInstance = { id: cardKey, uid: Math.random(), enchants: [] };
            const card = new Card(this, GW/2 + xOffset, GH/2 + 50, tempInstance);
            card.setDepth(2002);
            this.add.existing(card);
            card.bg.setInteractive();
            card.bg.on('pointerdown', () => {
                GameState.deck.push({ id: cardKey, uid: Date.now(), enchants: [] });
                this.scene.start('MapScene');
            });
            card.bg.removeAllListeners('pointerup');
        });
        const skipBtn = this.add.text(GW/2, GH - 100, "[ Skip Reward ]", { fontSize: '20px', color: '#666' }).setOrigin(0.5).setDepth(2001).setInteractive();
        skipBtn.on('pointerdown', () => { this.scene.start('MapScene'); });
    }

    showActClearScreen(GW, GH) {
        const bg = this.add.rectangle(GW/2, GH/2, GW, GH, 0x110000, 0.95).setDepth(3000).setInteractive();
        this.add.text(GW/2, GH/2 - 100, `ACT ${GameState.act} CLEARED!`, { fontSize: '60px', fontStyle: 'bold', color: '#ffaa00', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(3001);
        const nextBtn = this.add.text(GW/2, GH/2 + 50, "[ ENTER NEXT ACT ]", { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3001).setInteractive();
        nextBtn.on('pointerdown', () => {
            GameState.act++; GameState.level = 1; GameState.mapData = null; GameState.currentFloor = 0; GameState.currentHp = GameState.maxHp;
            this.scene.start('MapScene');
        });
    }

    updateGlobalUI() { if (this.player) GameState.currentHp = this.player.hp; this.game.events.emit('UPDATE_UI'); }
    updateManaUI() { this.manaText.setText(`${this.mana}/${this.maxMana}`); this.updateGlobalUI(); }
    
    createUI(GW, GH) {
        this.dimmer = this.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.85).setVisible(false).setDepth(900).setInteractive();
        this.dimmer.on('pointerdown', () => { if (this.zoomedCard) this.unzoomCard(); else if (this.deckContainer && this.deckContainer.visible) this.closeDeckView(); });
        
        const PADDING = 50; 
        this.mana = 3; this.maxMana = 3;
        this.manaText = this.add.text(PADDING, GH - 60, `Mana: ${this.mana}/${this.maxMana}`, { fontSize: '32px', color: '#00ffff', fontStyle: 'bold' }).setDepth(10);
        this.endTurnBtn = this.add.rectangle(GW - 120, GH - 160, 160, 60, 0xd04040).setInteractive().setDepth(10).setStrokeStyle(2, 0xffffff);
        this.add.text(GW - 120, GH - 160, "END TURN", { fontSize: '22px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
        this.endTurnBtn.on('pointerdown', () => this.endTurn());
        this.trashZone = this.add.zone(GW - 80, GH - 60, 110, 110).setRectangleDropZone(110, 110);
        this.trashZone.name = "discard_zone";
        const trashG = this.add.graphics().lineStyle(2, 0x666666);
        trashG.strokeRect(this.trashZone.x - 55, this.trashZone.y - 55, 110, 110);
        this.add.text(this.trashZone.x, this.trashZone.y, "TRASH", { fontSize: '14px', color: '#666' }).setOrigin(0.5);
        const deckBtnX = PADDING + 40; const deckBtnY = GH - 120;
        this.deckBtn = this.add.rectangle(deckBtnX, deckBtnY, 140, 40, 0x333333).setInteractive().setStrokeStyle(2, 0x888888);
        this.deckText = this.add.text(deckBtnX, deckBtnY, `Deck: ${this.drawPile.length}`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        this.deckBtn.on('pointerdown', () => this.openDeckView());
        this.discardText = this.add.text(GW - 80, GH - 110, `0`, { fontSize: '18px', color: '#aaa' }).setOrigin(0.5);
    }
    createRelicUI() {
        const startX = 50; const startY = 80; const gap = 50;    
        GameState.relics.forEach((relicId, index) => {
            const data = RELICS_DB[relicId]; if (!data) return;
            const x = startX + (index * gap);
            this.add.rectangle(x, startY, 40, 40, 0x222222).setStrokeStyle(2, 0x666666);
            const icon = this.add.text(x, startY, data.icon, { fontSize: '26px' }).setOrigin(0.5);
            icon.setInteractive();
            icon.on('pointerdown', () => {
                const txt = this.add.text(x + 25, startY + 20, data.desc, { fontSize: '20px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#000000', padding: { x: 10, y: 10 } }).setOrigin(0, 0).setDepth(3000);
                this.tweens.add({ targets: txt, alpha: 0, duration: 500, delay: 2500, onComplete: () => txt.destroy() });
            });
        });
    }
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
    
    // --- ЗУМ И ТД (БЕЗ ИЗМЕНЕНИЙ) ---
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
