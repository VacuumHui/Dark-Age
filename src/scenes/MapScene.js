// src/scenes/MapScene.js

import { GameState } from '../GameState.js';
import { MapManager } from '../managers/MapManager.js';

export class MapScene extends Phaser.Scene {
    constructor() { super({ key: 'MapScene' }); }

    create() {
        // 1. Проверяем, есть ли карта. Если нет - генерируем.
        if (!GameState.mapData) {
            const manager = new MapManager();
            GameState.mapData = manager.generateMap();
        }

        // Фон
        this.add.rectangle(0, 0, 3000, 1000, 0x110f0a).setOrigin(0);

        // Настройки отрисовки
        const startX = 150;
        const startY = this.scale.height / 2;
        const stepX = 200; // Шаг между этажами
        const stepY = 120; // Шаг между узлами

        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x554433);

        // Словарь координат для рисования линий
        const nodePositions = {};

        // --- РАСЧЕТ КООРДИНАТ ---
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

        // --- ОТРИСОВКА ЛИНИЙ (Только к ВИДИМЫМ узлам) ---
        GameState.mapData.forEach(layer => {
            layer.forEach(node => {
                if (node.visible && node.connections) {
                    node.connections.forEach(targetId => {
                        // Рисуем линию только если целевой узел тоже видим
                        // Или можно рисовать "в туман", но прерывистой. Пока просто рисуем.
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

        // --- ОТРИСОВКА УЗЛОВ ---
        GameState.mapData.forEach(layer => {
            layer.forEach(node => {
                if (!node.visible) return; // ТУМАН ВОЙНЫ: Не рисуем скрытые

                const pos = nodePositions[node.id];
                this.drawNode(node, pos.x, pos.y);
            });
        });

        // --- КАМЕРА (Следим за текущим этажом) ---
        // Сдвигаем камеру так, чтобы текущий этаж был слева, а будущий справа
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
        let color = 0x444444; // Locked
        let stroke = 0x000000;
        let interactive = false;

        if (node.status === 'completed') {
            color = 0x222222; stroke = 0x555555; // Пройден
        } else if (node.status === 'available') {
            color = 0xdd8800; stroke = 0xffffff; // Доступен
            interactive = true;
            
            // Пульсация
            this.tweens.add({
                targets: this.add.circle(x, y, 30, 0xdd8800, 0.3),
                scale: 1.5, alpha: 0, duration: 1500, repeat: -1
            });
        }

        const circle = this.add.circle(x, y, 25, color).setStrokeStyle(3, stroke);
        
        // Иконки
        let icon = "";
        if (node.type === 'start') icon = "🏠";
        else if (node.type === 'battle') icon = "⚔️";
        else if (node.type === 'boss') icon = "👹";
        else if (node.type === 'shop') icon = "💰";
        else if (node.type === 'rest') icon = "🔥";
        else if (node.type === 'event') icon = "❓";

        this.add.text(x, y, icon, { fontSize: '24px' }).setOrigin(0.5);

        if (interactive) {
            circle.setInteractive();
            circle.on('pointerdown', () => this.selectNode(node));
        }
    }

    selectNode(node) {
        // Сохраняем выбор
        GameState.currentNode = node.id;
        GameState.currentFloor = node.x;

        // Открываем туман для следующего шага (заранее, чтобы при возврате было видно)
        MapManager.unlockNextLayer(GameState.mapData, node.id);

        // Переход в сцену
        if (node.type === 'battle' || node.type === 'start' || node.type === 'boss') {
            // Если босс - передаем ключ босса (пока заглушка)
            this.scene.start('BattleScene');
        } else {
            // ЗАГЛУШКА ДЛЯ ДРУГИХ КОМНАТ
            alert(`Вы зашли в комнату: ${node.type.toUpperCase()}\n(Механика в разработке, идем в бой)`);
            this.scene.start('BattleScene');
        }
    }
}
