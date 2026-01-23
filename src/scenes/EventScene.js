// Файл: src/scenes/EventScene.js

import { EVENTS_DB } from '../data/events.js';
import { GameState, createCardInstance } from '../GameState.js';

export class EventScene extends Phaser.Scene {
    constructor() { super({ key: 'EventScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // 1. UI
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        this.game.events.emit('UPDATE_UI');

        // Фон
        this.add.rectangle(0, 0, GW, GH, 0x112233).setOrigin(0);

        // Данные события
        const keys = Object.keys(EVENTS_DB);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const eventData = EVENTS_DB[randomKey];

        // --- ВИЗУАЛ (КОМПАКТНЫЙ) ---
        
        // 1. Картинка (Эмодзи) - Сверху (15% высоты)
        this.add.text(GW/2, GH * 0.15, eventData.image, { fontSize: '80px' }).setOrigin(0.5);
        
        // 2. Заголовок - Чуть ниже (25% высоты)
        this.add.text(GW/2, GH * 0.25, eventData.title, { 
            fontSize: '40px', fontStyle: 'bold', color: '#ffcc00', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        // 3. Текст истории - Центр (35% высоты)
        this.add.text(GW/2, GH * 0.35, eventData.text, { 
            fontSize: '22px', color: '#ccc', align: 'center', 
            wordWrap: { width: GW * 0.7 } // Ширина текста = 70% экрана
        }).setOrigin(0.5, 0); // Origin сверху, чтобы текст рос вниз

        // --- КНОПКИ ВЫБОРА ---
        // Начинаем рисовать кнопки с 55% высоты экрана
        const startY = GH * 0.55;
        const gap = 80; // Расстояние между кнопками

        eventData.choices.forEach((choice, index) => {
            const btn = this.add.container(GW/2, startY + (index * gap));
            
            // Кнопка стала чуть уже и ниже
            const bg = this.add.rectangle(0, 0, GW * 0.6, 60, 0x222222).setStrokeStyle(3, 0xffffff).setInteractive();
            const text = this.add.text(0, 0, choice.text, { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
            
            btn.add([bg, text]);

            bg.on('pointerdown', () => {
                this.handleChoice(choice);
            });
            
            bg.on('pointerover', () => { bg.setFillStyle(0x444444); });
            bg.on('pointerout', () => { bg.setFillStyle(0x222222); });
        });
    }

    handleChoice(choice) {
        this.input.enabled = false;

        if (choice.action === 'leave') {
            this.scene.start('MapScene');
            return;
        }
        
        if (choice.action === 'fight') {
            if (choice.fightBonusGold) {
                GameState.eventFightBonusGold = choice.fightBonusGold;
            }
            this.scene.start('BattleScene');
            return;
        }

        const roll = Math.random();
        const success = roll <= choice.chance;

        let message = "";
        let color = "#ffffff";

        if (success) {
            this.applyResult(choice.action, choice.success);
            message = "SUCCESS!";
            color = "#00ff00";
        } else {
            if (choice.fail) {
                this.applyResult('fail_damage', choice.fail);
                message = "FAILURE!\n(Took Damage)";
                color = "#ff0000";
            } else {
                message = "NOTHING HAPPENED...";
                color = "#aaaaaa";
            }
        }
        
        this.game.events.emit('UPDATE_UI');
        this.showFeedback(message, color);
    }

    showFeedback(text, colorStr) {
        const GW = this.scale.width;
        const GH = this.scale.height;

        this.add.rectangle(0, 0, GW, GH, 0x000000, 0.8).setOrigin(0).setDepth(100);

        const bg = this.add.rectangle(GW/2, GH/2, 500, 200, 0x000000)
            .setStrokeStyle(4, 0xffffff)
            .setDepth(101);

        this.add.text(GW/2, GH/2, text, {
            fontSize: '40px',
            fontStyle: 'bold',
            color: colorStr,
            align: 'center',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(102);

        this.time.delayedCall(1500, () => {
            this.input.enabled = true;
            this.scene.start('MapScene');
        });
    }

    applyResult(actionType, data) {
        if (actionType === 'heal_full') {
            GameState.currentHp = GameState.maxHp;
        } 
        else if (actionType === 'get_potion') {
            GameState.deck.push(createCardInstance('heal_potion'));
        }
        else if (actionType === 'steal_gold' && data) {
            if (data.type === 'gold') GameState.gold += data.value;
        }
        
        if (data && data.type === 'damage') {
            GameState.currentHp -= data.value;
            if (GameState.currentHp < 1) GameState.currentHp = 1; 
        }
    }
}
