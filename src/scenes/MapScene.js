// Файл: src/scenes/MapScene.js

import { Card } from '../prefabs/Card.js'; 
import { GameState } from '../GameState.js';
import { MapManager } from '../managers/MapManager.js';

export class MapScene extends Phaser.Scene {
    constructor() { super({ key: 'MapScene' }); }

    create() {
        // 1. Запуск глобального UI
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        this.game.events.emit('UPDATE_UI');

        // 2. Генерация карты, если её нет
        if (!GameState.mapGenerated) {
            const manager = new MapManager();
            GameState.mapData = manager.generateMap();
            GameState.mapGenerated = true;
            GameState.currentFloor = 0;
        }

        // Параметры отрисовки
        const startX = 150;
        const startY = 100;
        const stepX = 250; 
        const stepY = 120;

        const mapWidth = startX + (GameState.mapData.length * stepX) + 400;
        const mapHeight = this.scale.height;

        // Камера и фон
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        this.add.rectangle(0, 0, mapWidth, mapHeight, 0x110f0a).setOrigin(0);
        
        // --- ЗАТЕМНЕНИЕ (для зума и колоды) ---
        this.dimmer = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.85)
            .setOrigin(0)
            .setScrollFactor(0)
            .setVisible(false)
            .setDepth(900)
            .setInteractive();
            
        this.dimmer.on('pointerdown', () => {
            if (this.zoomedCard) {
                this.unzoomCard();
            } else if (this.deckContainer && this.deckContainer.visible) {
                this.closeDeckView();
            }
        });

        this.zoomedCard = null;

        // Заголовок (показывает текущий Акт)
        this.add.text(50, 80, `ACT ${GameState.act} MAP`, { fontSize: '40px', color: '#444' }).setScrollFactor(0);

        // --- КНОПКА КОЛОДЫ ---
        const deckBtn = this.add.rectangle(this.scale.width - 150, 130, 200, 60, 0x333333)
            .setScrollFactor(0)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive();
            
        this.add.text(this.scale.width - 150, 130, `DECK (${GameState.deck.length})`, { 
            fontSize: '24px', fontStyle: 'bold' 
        }).setOrigin(0.5).setScrollFactor(0);

        deckBtn.on('pointerdown', () => this.openDeckView());

        // --- ОТРИСОВКА ЛИНИЙ ---
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x665544);

        const nodePositions = {};

        // 1. Координаты
        GameState.mapData.forEach((layer) => {
            layer.forEach((node) => {
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

        // Центрируем камеру на текущем этаже
        const currentX = startX + (GameState.currentFloor * stepX);
        const centerX = currentX - (this.scale.width / 2);
        this.cameras.main.scrollX = Math.max(0, centerX);

        // --- УПРАВЛЕНИЕ СВАЙПОМ ---
        let isDown = false;
        let startDragX = 0;
        let startCameraX = 0;
        this.isDragging = false;

        this.input.on('pointerdown', (pointer) => {
            if (this.deckContainer && this.deckContainer.visible) return;
            if (this.zoomedCard) return;

            isDown = true;
            this.isDragging = false;
            startDragX = pointer.x;
            startCameraX = this.cameras.main.scrollX;
        });

        this.input.on('pointermove', (pointer) => {
            if (isDown) {
                const diff = startDragX - pointer.x;
                if (Math.abs(diff) > 10) {
                    this.isDragging = true;
                    this.cameras.main.scrollX = startCameraX + diff;
                }
            }
        });

        this.input.on('pointerup', () => { isDown = false; });
        this.input.on('pointerout', () => { isDown = false; });
    }

    // --- КОЛОДА ---
    
    openDeckView() {
        if (!this.deckContainer) {
            this.deckContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);
        }
        
        this.deckContainer.removeAll(true);
        this.deckContainer.setVisible(true);
        this.dimmer.setVisible(true).setDepth(999); 

        const title = this.add.text(this.scale.width/2, 50, "YOUR DECK", { 
            fontSize: '40px', fontStyle: 'bold', color: '#ffffff' 
        }).setOrigin(0.5);
        this.deckContainer.add(title);

        const startX = 150;
        const startY = 150;
        const gapX = 120;
        const gapY = 160;
        const cardsPerRow = Math.floor((this.scale.width - 100) / gapX);

        // Сортируем объекты (по ID)
        const sortedDeck = [...GameState.deck].sort((a, b) => a.id.localeCompare(b.id)); 

        sortedDeck.forEach((cardInstance, index) => {
            const col = index % cardsPerRow;
            const row = Math.floor(index / cardsPerRow);
            const x = startX + (col * gapX);
            const y = startY + (row * gapY);

            const card = new Card(this, x, y, cardInstance);
            this.input.setDraggable(card.bg, false);
            
            this.deckContainer.add(card);
        });

        const closeBtn = this.add.text(this.scale.width/2, this.scale.height - 50, "[ CLOSE ]", { 
            fontSize: '30px', color: '#ff5555' 
        }).setOrigin(0.5).setInteractive();
        
        closeBtn.on('pointerdown', () => this.closeDeckView());
        this.deckContainer.add(closeBtn);
    }

    closeDeckView() {
        if (this.deckContainer) {
            this.deckContainer.setVisible(false);
        }
        this.dimmer.setVisible(false);
        this.unzoomCard();
    }

    // --- ЗУМ ---
    zoomCard(card) {
        if (this.zoomedCard) return; 
        this.zoomedCard = card;
        
        if (card.parentContainer) {
            this.parentContainerRef = card.parentContainer;
            card.savedContainerX = card.x;
            card.savedContainerY = card.y;
            const worldPos = card.getWorldTransformMatrix();
            card.x = worldPos.tx;
            card.y = worldPos.ty;
            card.parentContainer.remove(card);
            this.add.existing(card);
        }

        this.dimmer.setDepth(2000).setVisible(true);
        card.setDepth(2001);
        card.setScrollFactor(0);

        card.savedX = card.x; 
        card.savedY = card.y; 
        card.savedAngle = card.angle; 
        card.savedScale = card.scale;
        
        card.toggleMode(true);
        
        this.tweens.add({ 
            targets: card, 
            x: this.scale.width / 2, 
            y: this.scale.height / 2, 
            angle: 0, 
            scale: 2.5, 
            duration: 300, 
            ease: 'Back.out' 
        });
    }
    
    unzoomCard() {
        if (!this.zoomedCard) return; 
        const card = this.zoomedCard;
        this.zoomedCard = null; 
        
        card.toggleMode(false);
        
        this.tweens.add({ 
            targets: card, 
            x: card.savedX, 
            y: card.savedY, 
            angle: card.savedAngle, 
            scale: 1, 
            duration: 250, 
            ease: 'Power2',
            onComplete: () => {
                if (this.parentContainerRef) {
                    this.parentContainerRef.add(card);
                    card.x = card.savedContainerX;
                    card.y = card.savedContainerY;
                    this.parentContainerRef = null;
                }
                if (this.deckContainer && this.deckContainer.visible) {
                    this.dimmer.setDepth(999); 
                } else {
                    this.dimmer.setVisible(false);
                }
                card.setDepth(0);
            }
        });
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
                if (this.isDragging) return;

                GameState.currentNode = node.id;
                GameState.currentFloor = node.x;
                MapManager.unlockNextLayer(GameState.mapData, node.id);

                // --- ЛОГИКА ПЕРЕХОДОВ ---
                if (node.type === 'battle' || node.type === 'start') {
                    // Обычный бой
                    this.scene.start('BattleScene', { enemyKey: "slime" }); // Или рандом
                } 
                else if (node.type === 'boss') {
                    // БОСС ТЕКУЩЕГО АКТА
                    // Берем ID из конфига, если нет - ставим дефолт
                    const bossId = GameState.bosses[GameState.act] || "boss_dragon";
                    this.scene.start('BattleScene', { enemyKey: bossId });
                }
                else if (node.type === 'rest') {
                    this.scene.start('RestScene');
                } else if (node.type === 'event') {
                    this.scene.start('EventScene');
                } else if (node.type === 'shop') {
                    this.scene.start('ShopScene');
                } else {
                    alert("Заглушка: " + node.type);
                    this.scene.start('BattleScene');
                }
            });
        }
    }
}
