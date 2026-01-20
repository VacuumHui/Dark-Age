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

        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }

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
    // ЛОГИКА ВВОДА И СТЕКА
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
                // --- НАСТРОЙКИ ---
                const gap = 40; // Расстояние между картами
                const verticalOffset = this.activeStack.length > 1 ? 180 : 60;

                // Считаем ширину всего веера
                const totalFanWidth = (this.activeStack.length - 1) * gap;
                
                // Сдвигаем ЛИДЕРА влево на половину ширины.
                // Теперь палец указывает ровно в центр группы.
                leaderCard.x = pointer.x - (totalFanWidth / 2);
                leaderCard.y = pointer.y - verticalOffset;
                
                // --- МАГНИТ (Без изменений) ---
                const lastInStack = this.activeStack[this.activeStack.length - 1];
                for (let i = this.hand.length - 1; i >= 0; i--) {
                    const otherCard = this.hand[i];
                    if (this.activeStack.includes(otherCard)) continue;
                    
                    // Увеличил радиус магнита для удобства (140)
                    const dist = Phaser.Math.Distance.Between(lastInStack.x, lastInStack.y, otherCard.x, otherCard.y);
                    
                    if (dist < 140) { 
                        this.activeStack.push(otherCard);
                        // Важно: Лидер (0) сверху (слой 100), остальные под ним (99, 98...)
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
                this.showFloatingText(this.activeStack[0].x, this.activeStack[0].y, "Not enough Mana!", 0xff0000);
                this.returnStackToHand();
                return;
            }

            let dropTargetUnit = null;
            if (dropZone.name === "enemy_target" && this.enemy.alive) dropTargetUnit = this.enemy;
            else if (dropZone.name === "player_target" && this.player.alive) dropTargetUnit = this.player;

            if (dropTargetUnit) {
                const cardsToPlay = [...this.activeStack];
                this.activeStack = []; 
                this.playStackSequence(dropTargetUnit);
            } else {
                this.returnStackToHand();
            }
        });
    }

 // --- ИЗМЕНЕННЫЙ МЕТОД: ВЕЕР (ТЕПЕРЬ КРУТИТ И ПЕРВУЮ КАРТУ) ---
    updateStackVisuals() {
        if (this.activeStack.length === 0) return;

        const leader = this.activeStack[0];
        
        // Настройки веера
        const gap = 40;       // Отступ по X
        const angleStep = 10; // Угол поворота (уменьшил, чтобы не было "каши")
        const arcStrength = 15; // Насколько сильно карты опускаются по краям (Арка)

        // Центр веера (индекс середины)
        const centerIndex = (this.activeStack.length - 1) / 2;

        for (let i = 0; i < this.activeStack.length; i++) {
            const card = this.activeStack[i];
            
            // 1. Рассчитываем УГОЛ
            // (i - center) дает нам: -1.5, -0.5, 0.5, 1.5 и т.д.
            const targetAngle = (i - centerIndex) * angleStep;
            
            // 2. Рассчитываем ПОЗИЦИЮ Y (Арка)
            // Карты по краям ниже, чем в центре
            const distFromCenter = Math.abs(i - centerIndex);
            const offsetY = distFromCenter * arcStrength; 

            // 3. Рассчитываем ПОЗИЦИЮ X
            const offsetX = i * gap;

            // --- ПРИМЕНЯЕМ ---
            // Угол применяем плавно (для красоты)
            card.angle += (targetAngle - card.angle) * 0.3;

            // Позицию применяем ЖЕСТКО (без интерполяции), чтобы карты не отставали от пальца
            if (i === 0) {
                // Лидера по X/Y не трогаем, им управляет setupInput
            } else {
                card.x = leader.x + offsetX;
                card.y = leader.y + offsetY;
            }
        }
    }

    // --- ИЗМЕНЕННЫЙ МЕТОД: АНИМАЦИЯ АТАКИ ---
    playStackSequence(target) {
        const stackToPlay = [...this.activeStack];
        this.activeStack = []; 
        
        this.hand = this.hand.filter(c => !stackToPlay.includes(c));
        this.rearrangeHand();

        const stepDelay = Math.max(150, 600 - (stackToPlay.length * 100));

        stackToPlay.forEach((card, index) => {
            card.setDepth(2000 + index);

            // НАСТРОЙКА ПОЗИЦИИ ПЕРЕД УДАРОМ
            // target.isPlayer ? 220 : -220  ---> Отодвинули дальше (было 100)
            // target.y - 50                 ---> Чуть выше центра врага
            const hoverX = target.x + (target.isPlayer ? 250 : -250); 
            const hoverY = target.y - 50;

            this.tweens.add({
                targets: card,
                x: hoverX, 
                y: hoverY,
                scale: 1.3, // Сделали карту чуть крупнее перед ударом
                angle: (target.isPlayer ? -15 : 15), // Наклонили в сторону врага
                duration: 400,
                delay: index * stepDelay,
                ease: 'Power2',
                onComplete: () => {
                    // УДАР (Резкое движение в центр цели)
                    this.tweens.add({
                        targets: card,
                        x: target.x,
                        y: target.y,
                        duration: 120, // Быстрый удар
                        ease: 'Quad.easeIn', // Ускорение
                        onComplete: () => {
                            this.playCardLogic(card, target);
                        }
                    });
                }
            });
        });
    }

    // Внутренняя логика (без анимаций руки, так как мы их уже убрали)
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
        
        // Отправляем в сброс (с анимацией исчезновения)
        this.discardPile.push(card.cardInstance);
        this.tweens.add({
            targets: card,
            alpha: 0,
            scale: 0.5,
            y: card.y - 50,
            duration: 300,
            onComplete: () => { card.destroy(); this.updateDeckUI(); }
        });
        
        this.updateGlobalUI();
    }

    // =========================================================
    // ОБЫЧНЫЕ МЕТОДЫ
    // =========================================================

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
        // Удаляем из руки
        this.hand = this.hand.filter(c => !cardsToDiscard.includes(c));
        
        cardsToDiscard.forEach(card => {
            this.discardPile.push(card.cardInstance);
            this.tweens.add({
                targets: card,
                x: this.trashZone.x, y: this.trashZone.y,
                alpha: 0, scale: 0.1, duration: 300,
                onComplete: () => card.destroy()
            });
        });
        this.updateDeckUI();
        this.rearrangeHand();
    }

    // Старый метод playCard переименован и разделен, 
    // но на случай, если он вызывается откуда-то еще, оставим простую версию
    playCard(card, target) {
        // Если вдруг вызовется по-старому (не через стек), перенаправляем
        this.activeStack = [card];
        this.playStackSequence(target);
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
            // Если карта в стеке - не трогаем
            if (this.activeStack.includes(card)) return;
            if (card === this.zoomedCard) return;

            card.baseX = startX + (index * cardW); 
            card.baseY = GH - 110;
            
            this.tweens.add({ 
                targets: card, 
                x: card.baseX, 
                y: card.baseY, 
                angle: (index - (this.hand.length/2)) * 2, 
                duration: 300 
            }); 
        });
    }

    // --- ОСТАЛЬНОЕ БЕЗ ИЗМЕНЕНИЙ ---
    
    spendMana(amount) { this.mana -= amount; this.updateManaUI(); }
    discardHandVisual() { this.hand.forEach(card => card.destroy()); this.hand = []; }
    returnCardToHand(card) { this.tweens.add({ targets: card, x: card.baseX, y: card.baseY, duration: 200 }); }
    updateManaUI() { this.manaText.setText(`${this.mana}/${this.maxMana}`); this.updateGlobalUI(); }
    updateDeckUI() { this.deckText.setText(`Deck: ${this.drawPile.length}`); this.discardText.setText(`${this.discardPile.length}`); }
    
    showFloatingText(x, y, message, color) {
        const randomX = x + (Math.random() * 40 - 20);
        const txt = this.add.text(randomX, y, message, { fontSize: '28px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(1000);
        txt.setTint(color);
        this.tweens.add({ targets: txt, y: y - 100, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => txt.destroy() });
    }

    // ... endTurn, handleVictory, handleUnitDeath, createUI ...
    // (Код этих методов не менялся, но я включу их для целостности)

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
            const btn = this.add.rectangle(GW/2, GH/2 + 50, 300, 70, 0xffffff).setInteractive().setDepth(2001);
            this.add.text(GW/2, GH/2 + 50, "RETURN TO MENU", { fontSize: '28px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
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
    showFloatingText(x, y, message, color) {
        const randomX = x + (Math.random() * 40 - 20);
        const txt = this.add.text(randomX, y, message, { fontSize: '28px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(1000);
        txt.setTint(color);
        this.tweens.add({ targets: txt, y: y - 100, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => txt.destroy() });
    }
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
