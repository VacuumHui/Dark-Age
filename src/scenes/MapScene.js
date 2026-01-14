// src/scenes/MapScene.js

import { GameState } from '../GameState.js';
import { MapManager } from '../managers/MapManager.js';

export class MapScene extends Phaser.Scene {
    constructor() { super({ key: 'MapScene' }); }

    create() {
        // Генерация, если карты нет
        if (!GameState.mapGenerated) {
            const manager = new MapManager();
            GameState.mapData = manager.generateMap();
            GameState.mapGenerated = true;
        }

        // Фон
        this.add.rectangle(0, 0, 3000, 1000, 0x110f0a).setOrigin(0);
        this.add.text(50, 50, "MAP (Select a node)", { fontSize: '32px', color: '#fff' });

        const startX = 150;
        const startY = this.scale.height / 2;
        const stepX = 200;
        const stepY = 120;

        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x554433);

        const nodePositions = {};

        // 1. Расчет позиций
        GameState.mapData.forEach((layer) => {
            const layerHeight = (layer.length - 1) * stepY;
            const yOffset = startY - (layerHeight / 2);
            layer.forEach((node) => {
                nodePositions[node.id] = { x: startX + (node.x * stepX), y: yOffset + (node.y * stepY) };
            });
        });

        // 2. Линии
        GameState.mapData.forEach(layer => {
            layer.forEach(node => {
                if (node.visible && node.connections) {
                    node.connections.forEach(targetId => {
                        const targetNode = this.findNodeById(targetId);
                        if (targetNode && targetNode.visible) {
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

        // Камера
        const currentX = startX + (GameState.currentFloor * stepX);
        this.cameras.main.scrollX = currentX - 150;
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
            color = 0xdd8800; stroke = 0xffffff;
            interactive = true;
            this.tweens.add({ targets: this.add.circle(x, y, 30, 0xdd8800, 0.3), scale: 1.5, alpha: 0, duration: 1500, repeat: -1 });
        }

        const circle = this.add.circle(x, y, 25, color).setStrokeStyle(3, stroke);
        
        let icon = "❓";
        if (node.type === 'start') icon = "🏠";
        if (node.type === 'battle') icon = "⚔️";
        if (node.type === 'boss') icon = "👹";
        if (node.type === 'shop') icon = "💰";
        if (node.type === 'rest') icon = "🔥";

        this.add.text(x, y, icon, { fontSize: '24px' }).setOrigin(0.5);

        if (interactive) {
            circle.setInteractive();
            circle.on('pointerdown', () => {
                // Логика выбора
                GameState.currentNode = node.id;
                GameState.currentFloor = node.x;
                MapManager.unlockNextLayer(GameState.mapData, node.id);

                if (node.type === 'battle' || node.type === 'start' || node.type === 'boss') {
                    this.scene.start('BattleScene');
                } else {
                    alert("Пока здесь пусто, идем в бой!");
                    this.scene.start('BattleScene');
                }
            });
        }
    }
}
