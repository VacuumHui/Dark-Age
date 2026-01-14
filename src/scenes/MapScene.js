// src/scenes/MapScene.js

import { GameState } from '../GameState.js';
import { MapManager } from '../managers/MapManager.js';

export class MapScene extends Phaser.Scene {
    constructor() { super({ key: 'MapScene' }); }

    create() {
        if (!GameState.mapGenerated) {
            const manager = new MapManager();
            GameState.mapData = manager.generateMap();
            GameState.mapGenerated = true;
            GameState.currentFloor = 0;
        }

        // Параметры
        const startX = 150;
        const startY = 100; // Отступ сверху
        const stepX = 250;  // Шире шаг, чтобы было место
        const stepY = 120; 

        // Расчет размеров
        const mapWidth = startX + (GameState.mapData.length * stepX) + 400;
        const mapHeight = this.scale.height; // Высота фиксирована экраном

        // Камера и Фон
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        this.add.rectangle(0, 0, mapWidth, mapHeight, 0x110f0a).setOrigin(0);
        
        // Текст (не скроллится)
        this.add.text(50, 50, "MAP", { fontSize: '40px', color: '#444' }).setScrollFactor(0);

        // --- ОТРИСОВКА ---
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x665544);

        const nodePositions = {};

        // 1. Координаты
        GameState.mapData.forEach((layer) => {
            layer.forEach((node) => {
                // y зависит от node.y (который мы центрировали в генераторе)
                nodePositions[node.id] = { 
                    x: startX + (node.x * stepX), 
                    y: startY + (node.y * stepY) 
                };
            });
        });

        // 2. Линии
        GameState.mapData.forEach(layer => {
            layer.forEach(node => {
                if (node.visible && node.connections) {
                    node.connections.forEach(targetId => {
                        const targetNode = this.findNodeById(targetId);
                        // Рисуем, если целевой узел видим ИЛИ если мы стоим в текущем узле (показываем путь вперед)
                        if (targetNode && (targetNode.visible || node.status === 'completed')) {
                            const start = nodePositions[node.id];
                            const end = nodePositions[targetId];
                            graphics.lineBetween(start.x, start.y, end.x, end.y);
                        }
                    });
                }
            });
        });

        // 3. Узлы
        GameState.mapData.forEach(layer => {
            layer.forEach(node => {
                if (!node.visible) return;
                const pos = nodePositions[node.id];
                this.drawNode(node, pos.x, pos.y);
            });
        });

        // --- УПРАВЛЕНИЕ КАМЕРОЙ ---
        
        // Центрируем камеру на текущем этаже при старте
        const currentX = startX + (GameState.currentFloor * stepX);
        const centerX = currentX - (this.scale.width / 2);
        this.cameras.main.scrollX = Math.max(0, centerX);

        // Логика свайпа
        let isDown = false;
        let startDragX = 0;
        let startCameraX = 0;
        this.isDragging = false; // Флаг: мы двигаем карту или кликаем?

        this.input.on('pointerdown', (pointer) => {
            isDown = true;
            this.isDragging = false; // Сброс
            startDragX = pointer.x;
            startCameraX = this.cameras.main.scrollX;
        });

        this.input.on('pointermove', (pointer) => {
            if (isDown) {
                const diff = startDragX - pointer.x;
                // Если палец сдвинулся больше чем на 10px, считаем это скроллом
                if (Math.abs(diff) > 10) {
                    this.isDragging = true;
                    this.cameras.main.scrollX = startCameraX + diff;
                }
            }
        });

        this.input.on('pointerup', () => { isDown = false; });
        this.input.on('pointerout', () => { isDown = false; });
    }

    findNodeById(id) {
        for (let layer of GameState.mapData) {
            const found = layer.find(n => n.id === id);
            if (found) return found;
        }
        return null;
    }

    drawNode(node, x, y) {
        let color = 0x444444; 
        let stroke = 0x000000;
        let interactive = false;

        if (node.status === 'completed') {
            color = 0x222222; stroke = 0x555555;
        } else if (node.status === 'available') {
            color = 0xffaa00; stroke = 0xffffff;
            interactive = true;
            // Пульсация только для доступных
            this.tweens.add({ targets: this.add.circle(x, y, 35, 0xffaa00, 0.2), scale: 1.3, alpha: 0, duration: 1000, repeat: -1 });
        }

        const circle = this.add.circle(x, y, 28, color).setStrokeStyle(3, stroke);
        
        let icon = "❓";
        if (node.type === 'start') icon = "🏠";
        if (node.type === 'battle') icon = "⚔️";
        if (node.type === 'boss') icon = "👹";
        if (node.type === 'shop') icon = "💰";
        if (node.type === 'rest') icon = "🔥";
        if (node.type === 'event') icon = "❕";

        this.add.text(x, y, icon, { fontSize: '26px' }).setOrigin(0.5);

        if (interactive) {
            circle.setInteractive();
            circle.on('pointerup', () => {
                // ВАЖНО: Если мы скроллили карту (isDragging), клик НЕ должен сработать
                if (this.isDragging) return;

                GameState.currentNode = node.id;
                GameState.currentFloor = node.x;
                MapManager.unlockNextLayer(GameState.mapData, node.id);

                if (node.type === 'battle' || node.type === 'start' || node.type === 'boss') {
                    this.scene.start('BattleScene');
                } else {
                    alert("Заглушка: " + node.type);
                    this.scene.start('BattleScene');
                }
            });
        }
    }
}
