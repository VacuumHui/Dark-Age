// Файл: src/scenes/battle/BattleUIManager.js

import { Card } from '../../prefabs/Card.js';
import { RELICS_DB } from '../../data/relics.js';
import { GameState } from '../../GameState.js';

export class BattleUIManager {
    constructor(scene) {
        this.scene = scene;
        
        // Ссылки на текстовые объекты
        this.manaText = null;
        this.deckText = null;
        this.discardText = null;
        this.endTurnBtn = null;
        this.trashZone = null;
    }

    createHUD(GW, GH) {
        const PADDING = 50; 

        // 1. Мана
        this.manaText = this.scene.add.text(PADDING, GH - 60, `Mana: 0/0`, { 
            fontSize: '32px', color: '#00ffff', fontStyle: 'bold' 
        }).setDepth(10);
        
        // 2. Кнопка Конец Хода
        this.endTurnBtn = this.scene.add.rectangle(GW - 120, GH - 160, 160, 60, 0xd04040)
            .setInteractive().setDepth(10).setStrokeStyle(2, 0xffffff);
        this.scene.add.text(GW - 120, GH - 160, "END TURN", { fontSize: '22px', fontStyle: 'bold' })
            .setOrigin(0.5).setDepth(10);
            
        // Привязываем клик к методу сцены
        this.endTurnBtn.on('pointerdown', () => this.scene.endTurn());

        // 3. Мусорка (Trash)
        this.trashZone = this.scene.add.zone(GW - 80, GH - 60, 110, 110).setRectangleDropZone(110, 110);
        this.trashZone.name = "discard_zone";
        const trashG = this.scene.add.graphics().lineStyle(2, 0x666666);
        trashG.strokeRect(this.trashZone.x - 55, this.trashZone.y - 55, 110, 110);
        this.scene.add.text(this.trashZone.x, this.trashZone.y, "TRASH", { fontSize: '14px', color: '#666' }).setOrigin(0.5);
        
        // 4. Кнопка Колоды
        const deckBtnX = PADDING + 40; 
        const deckBtnY = GH - 120;
        const deckBtn = this.scene.add.rectangle(deckBtnX, deckBtnY, 140, 40, 0x333333)
            .setInteractive().setStrokeStyle(2, 0x888888);
        this.deckText = this.scene.add.text(deckBtnX, deckBtnY, `Deck: 0`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        
        deckBtn.on('pointerdown', () => this.scene.openDeckView());

        // 5. Счетчик сброса
        this.discardText = this.scene.add.text(GW - 80, GH - 110, `0`, { fontSize: '18px', color: '#aaa' }).setOrigin(0.5);
    }

    createRelicUI() {
        const startX = 50;
        const startY = 80; 
        const gap = 50;    

        GameState.relics.forEach((relicId, index) => {
            const data = RELICS_DB[relicId];
            if (!data) return;

            const x = startX + (index * gap);
            this.scene.add.rectangle(x, startY, 40, 40, 0x222222).setStrokeStyle(2, 0x666666);
            const icon = this.scene.add.text(x, startY, data.icon, { fontSize: '26px' }).setOrigin(0.5);
            icon.setInteractive();
            icon.on('pointerdown', () => {
                this.showFloatingText(x, startY + 50, data.desc, 0xffffff);
            });
        });
    }

    // --- ОБНОВЛЕНИЕ ЗНАЧЕНИЙ ---

    updateMana(current, max) {
        if (this.manaText) this.manaText.setText(`${current}/${max}`);
    }

    updateDeckCount(drawPileCount, discardPileCount) {
        if (this.deckText) this.deckText.setText(`Deck: ${drawPileCount}`);
        if (this.discardText) this.discardText.setText(`${discardPileCount}`);
    }

    // --- ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ---

    showFloatingText(x, y, message, color) {
        const randomX = x + (Math.random() * 40 - 20);
        const txt = this.scene.add.text(randomX, y, message, { 
            fontSize: '28px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5).setDepth(2000);
        txt.setTint(color);
        this.scene.tweens.add({ 
            targets: txt, y: y - 100, alpha: 0, duration: 1500, ease: 'Power2', 
            onComplete: () => txt.destroy() 
        });
    }

    // --- ЭКРАНЫ ПОБЕДЫ И ПОРАЖЕНИЯ ---

    showDefeatScreen(onRestart) {
        const GW = this.scene.scale.width;
        const GH = this.scene.scale.height;

        this.scene.cameras.main.flash(500, 255, 0, 0);
        this.scene.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.8).setDepth(2000);
        this.scene.add.text(GW/2, GH/2 - 60, "YOU DIED", { fontSize: '80px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(2001);
        
        const btn = this.scene.add.rectangle(GW/2, GH/2 + 60, 300, 70, 0xffffff).setInteractive().setDepth(2001);
        this.scene.add.text(GW/2, GH/2 + 60, "RETURN TO MENU", { fontSize: '28px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
        
        btn.on('pointerdown', onRestart);
    }

    showVictoryScreen(rewardKeys, onCardSelect, onSkip) {
        const GW = this.scene.scale.width;
        const GH = this.scene.scale.height;

        this.scene.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.9).setDepth(2000).setInteractive();
        this.scene.add.text(GW/2, 100, "VICTORY! CHOOSE A CARD:", { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);

        rewardKeys.forEach((cardKey, index) => {
            const xOffset = (index - 1) * 200;
            // Создаем временный инстанс для отображения
            const tempInstance = { id: cardKey, uid: Math.random(), enchants: [] };
            
            const card = new Card(this.scene, GW/2 + xOffset, GH/2 + 50, tempInstance);
            card.setDepth(2002);
            this.scene.add.existing(card);

            card.bg.setInteractive();
            card.bg.on('pointerdown', () => onCardSelect(cardKey));
            card.bg.removeAllListeners('pointerup'); // Отключаем зум
        });
        
        const skipBtn = this.scene.add.text(GW/2, GH - 100, "[ Skip Reward ]", { fontSize: '20px', color: '#666' })
            .setOrigin(0.5).setDepth(2001).setInteractive();
        skipBtn.on('pointerdown', onSkip);
    }

    showActClearScreen(actNumber, onNextAct) {
        const GW = this.scene.scale.width;
        const GH = this.scene.scale.height;

        this.scene.add.rectangle(GW/2, GH/2, GW, GH, 0x110000, 0.95).setDepth(3000).setInteractive();
        this.scene.add.text(GW/2, GH/2 - 100, `ACT ${actNumber} CLEARED!`, { 
            fontSize: '60px', fontStyle: 'bold', color: '#ffaa00', stroke: '#000', strokeThickness: 6 
        }).setOrigin(0.5).setDepth(3001);

        const nextBtn = this.scene.add.text(GW/2, GH/2 + 50, "[ ENTER NEXT ACT ]", { 
            fontSize: '40px', color: '#fff', fontStyle: 'bold' 
        }).setOrigin(0.5).setDepth(3001).setInteractive();

        nextBtn.on('pointerdown', onNextAct);
    }
}
