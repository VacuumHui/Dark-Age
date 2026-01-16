// Файл: src/scenes/MenuScene.js

import { GameState } from '../GameState.js';

export class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // 1. Фон
        this.add.rectangle(0, 0, GW, GH, 0x110f0a).setOrigin(0);

        // 2. Частицы на фоне (атмосфера)
        // Генерируем текстуру, если её нет (на случай, если Меню - первая сцена)
        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffaa00, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }

        const particles = this.add.particles(0, 0, 'flare', {
            x: { min: 0, max: GW },
            y: GH + 50,
            speedY: { min: -20, max: -50 }, // Летят вверх
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 9000,
            quantity: 2,
            blendMode: 'ADD'
        });

        // 3. Заголовок
        this.add.text(GW/2, GH * 0.3, "DARK AGE", { 
            fontSize: '80px', 
            fontStyle: 'bold', 
            color: '#ff4400',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(GW/2, GH * 0.38, "______________________", { 
            fontSize: '24px', color: '#888' 
        }).setOrigin(0.5);

        // 4. Кнопка NEW GAME
        const startBtn = this.createButton(GW/2, GH * 0.6, "NEW GAME", 0x44aa44);
        
        startBtn.on('pointerdown', () => {
            this.startNewGame();
        });

        // 5. Кнопка CONTINUE (Пока неактивна, если нет сохранений, но на будущее)
        // const continueBtn = this.createButton(GW/2, GH * 0.75, "CONTINUE", 0x444444);
    }

    createButton(x, y, text, color) {
        const container = this.add.container(x, y);
        
        const bg = this.add.rectangle(0, 0, 300, 80, color)
            .setStrokeStyle(4, 0xffffff)
            .setInteractive();
            
        const label = this.add.text(0, 0, text, { 
            fontSize: '32px', fontStyle: 'bold' 
        }).setOrigin(0.5);

        container.add([bg, label]);

        // Анимация нажатия
        bg.on('pointerover', () => container.setScale(1.05));
        bg.on('pointerout', () => container.setScale(1));
        bg.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.95, duration: 50, yoyo: true });
        });

        return bg;
    }

    startNewGame() {
        // СБРОС ВСЕГО СОСТОЯНИЯ
        GameState.deck = [
            this.createCard("strike"), this.createCard("strike"), this.createCard("strike"),
            this.createCard("defend"), this.createCard("defend"), this.createCard("defend")
        ];
        GameState.relics = [];
        GameState.maxHp = 50;
        GameState.currentHp = 50;
        GameState.gold = 100;
        GameState.level = 1;
        
        // Сброс карты
        GameState.mapData = null;
        GameState.mapGenerated = false;
        GameState.currentFloor = 0;

        // Переход на Карту (а не в бой сразу!)
        this.scene.start('MapScene');
    }

    // Вспомогательная функция для создания объекта карты (как в GameState.js)
    createCard(id) {
        return { id: id, uid: Date.now() + Math.random(), enchants: [] };
    }
}
