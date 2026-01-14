// Файл: src/scenes/MapScene.js

import { GameState } from '../GameState.js';
import { MapManager } from '../managers/MapManager.js';

export class MapScene extends Phaser.Scene {
    constructor() { super({ key: 'MapScene' }); }

    create() {
        // 1. Генерация (если нужно)
        if (!GameState.mapGenerated) {
            const manager = new MapManager();
            GameState.mapData = manager.generateMap();
            GameState.mapGenerated = true;
            GameState.currentFloor = 0;
        }

        // Параметры сетки
        const startX = 150;
        const startY = this.scale.height / 2;
        const stepX = 200; 
        const stepY = 120;

        // Вычисляем ширину всей карты для границ камеры
        // 10 этажей * 200px + отступы
        const mapWidth = startX + (GameState.mapData.length * stepX) + 300;
        const mapHeight = this.scale.height;

        // --- НАСТРОЙКА КАМЕРЫ И ФОНА ---
        
        // Задаем границы мира (чтобы нельзя было ускроллить в пустоту)
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        
        // Фон (растягиваем на всю ширину карты)
        this.add.rectangle(0, 0, mapWidth, mapHeight, 0x110f0a).setOrigin(0);
        
        // Подсказка (фиксированная на экране, не скроллится)
        const title = this.add.text(50, 50, "MAP (Swipe to scroll)", { fontSize: '32px', color: '#ffd700' })
            .setScrollFactor(0); // Важно: 0 значит "не двигайся с камерой"

        // --- ОТРИСОВКА ---

        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x554433);

        const nodePositions = {};

        // 1. Координаты
        GameState.mapData.forEach((layer) => {
            const layerHeight = (layer.length - 1) * stepY;
            const yOffset = startY - (layerHeight / 2);
            layer.forEach((node) => {
                nodePositions[node.id] = { 
                    x: startX + (node.x * stepX), 
                    y: yOffset + (node.y * stepY) 
                };
            });
        });

        // 2. Линии
        GameState.mapData.forEach(layer => {
            layer.forEach(node => {
                if (node.visible && node.connections) {
                    node.connections.forEach(targetId => {
                        const targetNode = this.findNodeById(targetId);
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

        // --- УПРАВЛЕНИЕ КАМЕРОЙ (СВАЙПЫ) ---
        
        let isDown = false;
        let startDragX = 0;
        let startCameraX = 0;

        this.input.on('pointerdown', (pointer) => {
            isDown = true;
            startDragX = pointer.x;
            startCameraX = this.cameras.main.scrollX;
        });

        this.input.on('pointermove', (pointer) => {
            if (isDown) {
                // Вычисляем, насколько сдвинули палец
                const diff = startDragX - pointer.x;
                // Двигаем камеру
                this.cameras.main.scrollX = startCameraX + diff;
            }
        });

        this.input.on('pointerup', () => { isDown = false; });
        this.input.on('pointerout', () => { isDown = false; });

        // --- НАЧАЛЬНАЯ ПОЗИЦИЯ ---
        // Плавно наводим камеру на текущий этаж, но не блокируем её
        const currentX = startX + (GameState.currentFloor * stepX) - 200;
        this.cameras.main.scrollX = Math.max(0, currentX); 
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
            this.tweens.add({ targets: this.add.circle(x, y, 30, 0xffaa00, 0.3), scale: 1.5, alpha: 0, duration: 1500, repeat: -1 });
        }

        const circle = this.add.circle(x, y, 25, color).setStrokeStyle(3, stroke);
        
        let icon = "❓";
        if (node.type === 'start') icon = "🏠";
        else if (node.type === 'battle') icon = "⚔️";
        else if (node.type === 'boss') icon = "👹";
        else if (node.type === 'shop') icon = "💰";
        else if (node.type === 'rest') icon = "🔥";

        this.add.text(x, y, icon, { fontSize: '24px' }).setOrigin(0.5);

        if (interactive) {
            circle.setInteractive();
            circle.on('pointerdown', () => {
                // Если мы драгали карту, клик по узлу не должен срабатывать
                // (маленькая защита от случайного входа)
                
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
