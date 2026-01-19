// Файл: src/scenes/MenuScene.js

import { GameState } from '../GameState.js';
// Убрали импорт createCardInstance, чтобы не рисковать

export class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // Фон
        this.add.rectangle(0, 0, GW, GH, 0x110f0a).setOrigin(0);

        // Частицы
        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffaa00, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }

        const particles = this.add.particles(0, 0, 'flare', {
            x: { min: 0, max: GW },
            y: GH + 50,
            speedY: { min: -20, max: -50 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 4000,
            quantity: 2,
            blendMode: 'ADD'
        });

        // Заголовок
        this.add.text(GW/2, GH * 0.3, "DARK AGE", { 
            fontSize: '80px', fontStyle: 'bold', color: '#ff4400', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(GW/2, GH * 0.38, "Roguelite Deckbuilder", { 
            fontSize: '24px', color: '#888' 
        }).setOrigin(0.5);

        // Кнопка
        const startBtn = this.createButton(GW/2, GH * 0.6, "NEW GAME", 0x44aa44);
        
        startBtn.on('pointerdown', () => {
            // Небольшая задержка для визуального эффекта нажатия
            this.time.delayedCall(100, () => {
                this.startNewGame();
            });
        });
    }

    createButton(x, y, text, color) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 300, 80, color).setStrokeStyle(4, 0xffffff).setInteractive();
        const label = this.add.text(0, 0, text, { fontSize: '32px', fontStyle: 'bold' }).setOrigin(0.5);
        container.add([bg, label]);

        bg.on('pointerover', () => container.setScale(1.05));
        bg.on('pointerout', () => container.setScale(1));
        bg.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.95, duration: 50, yoyo: true });
        });
        return bg;
    }

    // ВНУТРЕННЯЯ ФУНКЦИЯ СОЗДАНИЯ КАРТЫ (Безопасная)
    _createCard(id) {
        return {
            id: id,
            uid: Date.now() + Math.random(), // Уникальный ID
            enchants: []
        };
    }

    startNewGame() {
        try {
            console.log("Starting new game...");

            // 1. Создаем колоду, используя ВНУТРЕННЮЮ функцию
            GameState.deck = [
                this._createCard("strike"), 
                this._createCard("strike"), 
                this._createCard("strike"),
                this._createCard("defend"), 
                this._createCard("defend"), 
                this._createCard("defend")
            ];
            
            // 2. Сбрасываем все параметры
            GameState.relics = [];
            GameState.maxHp = 50;
            GameState.currentHp = 50;
            GameState.gold = 100;
            
            GameState.level = 1;
            GameState.act = 1;
            
            // 3. Обнуляем карту, чтобы она пересоздалась
            GameState.mapData = null;
            GameState.mapGenerated = false;
            GameState.currentFloor = 0;
            GameState.currentNode = null;

            // 4. Запускаем сцену карты
            this.scene.start('MapScene');

        } catch (error) {
            // Если всё равно упадет, мы увидим почему
            alert("Error in startNewGame: " + error.message);
            console.error(error);
        }
    }
}
