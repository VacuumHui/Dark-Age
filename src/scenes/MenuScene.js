// Файл: src/scenes/MenuScene.js

import { GameState, createCardInstance } from '../GameState.js';

export class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }

    create() {
        // --- ДИАГНОСТИКА ---
        console.log("Checking scenes...");
        const mapScene = this.scene.manager.keys['MapScene'];
        if (!mapScene) {
            alert("КРИТИЧЕСКАЯ ОШИБКА: Файл MapScene.js сломан или не загружен! Проверь скобки в конце файла.");
            return;
        }
        if (typeof createCardInstance !== 'function') {
            alert("ОШИБКА: GameState.js не экспортирует createCardInstance!");
            return;
        }
        // -------------------
        
        const GW = this.scale.width;
        const GH = this.scale.height;

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

        // Текст
        this.add.text(GW/2, GH * 0.3, "DARK AGE", { 
            fontSize: '80px', fontStyle: 'bold', color: '#ff4400', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(GW/2, GH * 0.38, "-----------------", { 
            fontSize: '24px', color: '#888' 
        }).setOrigin(0.5);

        // Кнопка Старта
        const startBtn = this.createButton(GW/2, GH * 0.6, "NEW GAME", 0x44aa44);
        
        startBtn.on('pointerdown', () => {
            this.startNewGame();
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

    startNewGame() {
        // --- ЗАЩИТА ОТ ОШИБОК ---
        try {
            // Проверка: загрузилась ли функция?
            if (typeof createCardInstance !== 'function') {
                throw new Error("createCardInstance is not a function! Check GameState.js export.");
            }

            console.log("Starting new game...");

            // 1. Создаем колоду
            GameState.deck = [
                createCardInstance("strike"), createCardInstance("strike"), createCardInstance("strike"),
                createCardInstance("defend"), createCardInstance("defend"), createCardInstance("defend")
            ];
            
            // 2. Сброс статов
            GameState.relics = [];
            GameState.maxHp = 50;
            GameState.currentHp = 50;
            GameState.gold = 100;
            
            // 3. Сброс карты
            GameState.level = 1;
            GameState.act = 1;
            GameState.mapData = null;
            GameState.mapGenerated = false;
            GameState.currentFloor = 0;
            GameState.currentNode = null;

            // 4. Переход
            this.scene.start('MapScene');

        } catch (err) {
            // ВЫВОД ОШИБКИ НА ЭКРАН (Чтобы ты увидел её на телефоне)
            alert(`CRASH: ${err.message}`);
            console.error(err);
        }
    }
}
