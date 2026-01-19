// Файл: src/scenes/MenuScene.js

// ВАЖНО: Импортируем createCardInstance, чтобы карты создавались правильно (с ID и зачарованиями)
import { GameState, createCardInstance } from '../GameState.js';

export class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // 1. Фон
        this.add.rectangle(0, 0, GW, GH, 0x110f0a).setOrigin(0);

        // 2. Атмосфера (Частицы)
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

        // 3. Заголовок
        this.add.text(GW/2, GH * 0.3, "DARK AGE", { 
            fontSize: '80px', 
            fontStyle: 'bold', 
            color: '#ff4400',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(GW/2, GH * 0.38, "-----------------", { 
            fontSize: '24px', color: '#888' 
        }).setOrigin(0.5);

        // 4. Кнопка NEW GAME
        const startBtn = this.createButton(GW/2, GH * 0.6, "NEW GAME", 0x44aa44);
        
        startBtn.on('pointerdown', () => {
            this.startNewGame();
        });
    }

    createButton(x, y, text, color) {
        const container = this.add.container(x, y);
        
        const bg = this.add.rectangle(0, 0, 300, 80, color)
            .setStrokeStyle(4, 0xffffff)
            .setInteractive();
            
        const label = this.add.text(0, 0, text, { 
            fontSize: '32px', fontStyle: 'bold', fontFamily: 'monospace'
        }).setOrigin(0.5);

        container.add([bg, label]);

        bg.on('pointerover', () => container.setScale(1.05));
        bg.on('pointerout', () => container.setScale(1));
        bg.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.95, duration: 50, yoyo: true });
        });

        return bg;
    }

    startNewGame() {
        // --- СБРОС ВСЕГО СОСТОЯНИЯ ---
        
        // 1. Создаем колоду ПРАВИЛЬНО (через функцию, чтобы это были объекты, а не строки)
        GameState.deck = [
            createCardInstance("strike"), 
            createCardInstance("strike"), 
            createCardInstance("strike"),
            createCardInstance("defend"), 
            createCardInstance("defend"), 
            createCardInstance("defend")
        ];
        
        // 2. Сбрасываем ресурсы
        GameState.relics = [];
        GameState.maxHp = 50;
        GameState.currentHp = 50;
        GameState.gold = 100;
        
        // 3. Сбрасываем прогресс карты
        GameState.level = 1;
        GameState.act = 1;
        GameState.mapData = null;
        GameState.mapGenerated = false;
        GameState.currentFloor = 0;
        GameState.currentNode = null;

        // 4. Переход на Карту
        this.scene.start('MapScene');
    }
}
