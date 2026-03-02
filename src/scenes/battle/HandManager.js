// Файл: src/scenes/battle/HandManager.js

import { Card } from '../../prefabs/Card.js';
import { GameState } from '../../GameState.js';
import { getComputedCard } from '../../managers/CardLogic.js';
// executeAction больше не нужен здесь напрямую, так как мы передаем выполнение в BattleScene

export class HandManager {
    constructor(scene) {
        this.scene = scene;
        this.drawPile = Phaser.Utils.Array.Shuffle([...GameState.deck]); 
        this.discardPile = [];
        this.hand = [];
        this.activeStack = []; 
    }

    // --- ОСНОВНЫЕ ОПЕРАЦИИ ---

    drawCards(amount) {
        const GW = this.scene.scale.width;
        
        for (let i = 0; i < amount; i++) {
            if (this.hand.length >= 6) break;

            if (this.drawPile.length === 0) {
                if (this.discardPile.length > 0) {
                    this.drawPile = Phaser.Utils.Array.Shuffle([...this.discardPile]);
                    this.discardPile = [];
                    this.scene.ui.showFloatingText(100, 500, "Reshuffle!", 0xaaaaaa);
                } else {
                    break;
                }
            }

            const cardInstance = this.drawPile.pop();
            const card = new Card(this.scene, GW/2, this.scene.scale.height + 200, cardInstance);
            this.scene.add.existing(card);
            this.hand.push(card);
        }
        
        this.scene.updateDeckUI();
        this.rearrangeHand();
    }

    // Метод для программного розыгрыша (если понадобится)
    playCard(card, target) {
        // Делегируем логику выполнения Сцене, так как там обрабатываются AOE и массивы врагов
        this.scene.playCard(card, target);
    }

    discardCard(card) {
        this.discardPile.push(card.cardInstance);
        this.hand = this.hand.filter(c => c !== card);
        
        this.scene.tweens.add({ 
            targets: card, 
            x: this.scene.ui.trashZone.x, 
            y: this.scene.ui.trashZone.y, 
            alpha: 0, scale: 0.1, duration: 300, 
            onComplete: () => { card.destroy(); this.rearrangeHand(); } 
        });
        this.scene.updateDeckUI();
    }

    consumeCard(card) {
        this.hand = this.hand.filter(c => c !== card);
        const index = GameState.deck.findIndex(c => c.uid === card.cardInstance.uid);
        if (index > -1) GameState.deck.splice(index, 1);

        this.scene.tweens.add({
            targets: card, alpha: 0, scale: 0, angle: 360, duration: 600,
            onComplete: () => { card.destroy(); this.scene.updateDeckUI(); this.rearrangeHand(); }
        });
    }

    discardHandVisual() { 
        this.hand.forEach(card => card.destroy()); 
        this.hand = []; 
        this.activeStack = [];
    }

    rearrangeHand() {
        const GW = this.scene.scale.width; 
        const GH = this.scene.scale.height;
        const cardW = 150; 
        const totalW = this.hand.length * cardW;
        const startX = (GW - totalW) / 2 + (cardW / 2);
        
        this.hand.forEach((card, index) => {
            // Если карта в стеке или зуме - не трогаем её анимацией
            if (this.activeStack.includes(card)) return;
            if (card === this.scene.zoomedCard) return;

            card.baseX = startX + (index * cardW); 
            card.baseY = GH - 110;
            
            this.scene.tweens.add({ 
                targets: card, 
                x: card.baseX, 
                y: card.baseY, 
                angle: (index - (this.hand.length/2)) * 2, 
                duration: 300 
            }); 
        });
    }

    // =========================================================
    // ВВОД (ИСПРАВЛЕНО ДЛЯ РАБОТЫ С МАССИВОМ ВРАГОВ)
    // =========================================================

    setupInput() {
        // 1. DRAG START
        this.scene.input.on('dragstart', (pointer, gameObject) => {
            if (!this.scene.isBattleActive) return;
            
            // --- ЗАЩИТА ---
            if (this.scene.ui.deckContainer && this.scene.ui.deckContainer.visible) return;
            if (this.scene.zoomedCard) return;
            // --------------

            const card = gameObject.parentContainer;
            this.activeStack = [card];
            card.setDepth(100); 
            card.pressStartTime = Date.now();
        });

        // 2. DRAG MOVE
        this.scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.scene.isBattleActive) return;
            if (this.scene.zoomedCard) return;
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
                
                // Магнит
                const lastInStack = this.activeStack[this.activeStack.length - 1];
                for (let i = this.hand.length - 1; i >= 0; i--) {
                    const otherCard = this.hand[i];
                    if (this.activeStack.includes(otherCard)) continue;
                    
                    const dist = Phaser.Math.Distance.Between(lastInStack.x, lastInStack.y, otherCard.x, otherCard.y);
                    
                    if (dist < 130) { 
                        this.activeStack.push(otherCard);
                        otherCard.setDepth(100 - this.activeStack.length); 
                        this.scene.tweens.add({ targets: otherCard, scale: { from: 1.1, to: 1 }, duration: 100 });
                    }
                }
                this.updateStackVisuals();
            }
        });

        // 3. DRAG END
        this.scene.input.on('dragend', (pointer, gameObject, dropped) => {
            if (!this.scene.isBattleActive) return;
            if (this.scene.zoomedCard) return;
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

        // 4. DROP (САМОЕ ВАЖНОЕ ОБНОВЛЕНИЕ)
        this.scene.input.on('drop', (pointer, gameObject, dropZone) => {
            if (!this.scene.isBattleActive) return;

            if (this.scene.zoomedCard) return;
            
            // Если кинули в мусорку
            if (dropZone.name === "discard_zone") { 
                this.discardStack(); 
                return; 
            }

            // Проверка маны
            let totalCost = 0;
            this.activeStack.forEach(card => {
                const computed = getComputedCard(card.cardInstance);
                totalCost += computed.cost;
            });

            if (this.scene.mana < totalCost) {
                this.scene.ui.showFloatingText(this.activeStack[0].x, this.activeStack[0].y, "Not enough Mana!", 0xff0000);
                this.returnStackToHand();
                return;
            }

            // --- НОВАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ ЦЕЛИ ---
            let dropTargetUnit = null;

            // Мы ищем свойство parentUnit, которое мы добавили в классе Unit
            if (dropZone.parentUnit) {
                const unit = dropZone.parentUnit;
                
                // Проверяем, жив ли юнит
                if (unit.alive) {
                    // Разрешаем бросать карту на него
                    dropTargetUnit = unit;
                }
            }

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

            // Анимация подлета к цели
            // Если цель - игрок, подлетаем слева, если враг - справа (примерно)
            const hoverX = target.x + (target.isPlayer ? 250 : -100); 
            const hoverY = target.y - 50;

            this.scene.tweens.add({
                targets: card, x: hoverX, y: hoverY, scale: 1.3,
                angle: (target.isPlayer ? -15 : 15), duration: 400, delay: index * stepDelay, ease: 'Power2',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: card, x: target.x, y: target.y, duration: 120, ease: 'Quad.easeIn',
                        onComplete: () => { 
                            this.playCardLogic(card, target); 
                        }
                    });
                }
            });
        });
    }
        // Пооверка после хода 
    updateDynamicCards() {
        this.hand.forEach(card => {
            if (card.refreshDynamicText) {
                card.refreshDynamicText();
            }
        });
    }
    

    playCardLogic(card, target) {
        
        
        this.scene.playCard(card, target);

        
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
}
