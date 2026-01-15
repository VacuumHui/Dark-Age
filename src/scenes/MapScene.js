// Файл: src/scenes/MapScene.js

import { Unit } from '../prefabs/Unit.js'; 
import { Card } from '../prefabs/Card.js'; 
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

        const startX = 150;
        const startY = 100;
        const stepX = 250; 
        const stepY = 120;

        const mapWidth = startX + (GameState.mapData.length * stepX) + 400;
        const mapHeight = this.scale.height;

        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        this.add.rectangle(0, 0, mapWidth, mapHeight, 0x110f0a).setOrigin(0);
        
        // --- ИСПРАВЛЕНИЕ 1: УМНЫЙ КЛИК ПО ЗАТЕМНЕНИЮ ---
        this.dimmer = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.85)
            .setOrigin(0)
            .setScrollFactor(0)
            .setVisible(false)
            .setDepth(900)
            .setInteractive();
            
        this.dimmer.on('pointerdown', () => {
            // Если карта приближена — убираем зум
            if (this.zoomedCard) {
                this.unzoomCard();
            } 
            // Иначе, если открыта колода — закрываем колоду
            else if (this.deckContainer && this.deckContainer.visible) {
                this.closeDeckView();
            }
        });

        this.zoomedCard = null;

        this.add.text(50, 50, "MAP", { fontSize: '40px', color: '#444' }).setScrollFactor(0);

        const deckBtn = this.add.rectangle(this.scale.width - 150, 60, 200, 60, 0x333333)
            .setScrollFactor(0)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive();
            
        this.add.text(this.scale.width - 150, 60, `DECK (${GameState.deck.length})`, { 
            fontSize: '24px', fontStyle: 'bold' 
        }).setOrigin(0.5).setScrollFactor(0);

        deckBtn.on('pointerdown', () => this.openDeckView());

        // --- ОТРИСОВКА КАРТЫ ---
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x665544);

        const nodePositions = {};

        GameState.mapData.forEach((layer) => {
            layer.forEach((node) => {
                nodePositions[node.id] = { 
                    x: startX + (node.x * stepX), 
                    y: startY + (node.y * stepY) 
                };
            });
        });

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

        GameState.mapData.forEach(layer => {
            layer.forEach(node => {
                if (!node.visible) return;
                const pos = nodePositions[node.id];
                this.drawNode(node, pos.x, pos.y);
            });
        });

        const currentX = startX + (GameState.currentFloor * stepX);
        const centerX = currentX - (this.scale.width / 2);
        this.cameras.main.scrollX = Math.max(0, centerX);

        // Логика свайпа
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

    // --- ЛОГИКА КОЛОДЫ ---
    
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

        const sortedDeck = [...GameState.deck].sort(); 

        sortedDeck.forEach((cardKey, index) => {
            const col = index % cardsPerRow;
            const row = Math.floor(index / cardsPerRow);

            const x = startX + (col * gapX);
            const y = startY + (row * gapY);

            const card = new Card(this, x, y, cardKey);
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

    // --- ИСПРАВЛЕНИЕ 2: ЗУМ С "ВЫРЫВАНИЕМ" КАРТЫ ---
    zoomCard(card) {
        if (this.zoomedCard) return; 
        this.zoomedCard = card;
        
        // ВАЖНО: Если карта внутри контейнера (Колоды), она будет под затемнением.
        // Нужно временно перенести её на сцену.
        if (card.parentContainer) {
            this.parentContainerRef = card.parentContainer; // Запоминаем родителя
            
            // Запоминаем координаты внутри контейнера
            card.savedContainerX = card.x;
            card.savedContainerY = card.y;

            // Вычисляем мировые координаты (где она на экране)
            const worldPos = card.getWorldTransformMatrix();
            card.x = worldPos.tx;
            card.y = worldPos.ty;

            // Удаляем из контейнера и добавляем на сцену
            card.parentContainer.remove(card);
            this.add.existing(card);
        }

        // Теперь карта на сцене, ставим её поверх всего
        this.dimmer.setDepth(2000).setVisible(true);
        card.setDepth(2001);
        card.setScrollFactor(0);

        // Сохраняем параметры для анимации
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
                // Если карта была в контейнере — возвращаем её домой
                if (this.parentContainerRef) {
                    this.parentContainerRef.add(card);
                    card.x = card.savedContainerX;
                    card.y = card.savedContainerY;
                    this.parentContainerRef = null;
                }

                // Возвращаем слой затемнения на место (если колода открыта)
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

                if (node.type === 'battle' || node.type === 'start' || node.type === 'boss') {
                    this.scene.start('BattleScene');
                } else {
                    alert("Заглушка: " + node.type);
                    this.scene.start('BattleScene');
                }
            });
        }
    }
}        let isDown = false;
        let startDragX = 0;
        let startCameraX = 0;
        this.isDragging = false;

        this.input.on('pointerdown', (pointer) => {
            // Если открыт просмотр колоды или зум - не двигаем карту
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

    // --- ЛОГИКА ПРОСМОТРА КОЛОДЫ (НОВОЕ) ---
    
    openDeckView() {
        // Если контейнер еще не создан
        if (!this.deckContainer) {
            this.deckContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);
        }
        
        // Очищаем старое (на случай если колода изменилась)
        this.deckContainer.removeAll(true);
        this.deckContainer.setVisible(true);
        this.dimmer.setVisible(true).setDepth(999); // Фон

        // Заголовок
        const title = this.add.text(this.scale.width/2, 50, "YOUR DECK", { 
            fontSize: '40px', fontStyle: 'bold', color: '#ffffff' 
        }).setOrigin(0.5);
        this.deckContainer.add(title);

        // Сетка карт
        const startX = 150;
        const startY = 150;
        const gapX = 120;
        const gapY = 160;
        const cardsPerRow = Math.floor((this.scale.width - 100) / gapX);

        // Сортируем колоду (по стоимости, потом по имени)
        // Копируем, чтобы не менять порядок в GameState
        const sortedDeck = [...GameState.deck].sort(); 

        sortedDeck.forEach((cardKey, index) => {
            const col = index % cardsPerRow;
            const row = Math.floor(index / cardsPerRow);

            const x = startX + (col * gapX);
            const y = startY + (row * gapY);

            const card = new Card(this, x, y, cardKey);
            // Отключаем драг, оставляем только клик (зум)
            this.input.setDraggable(card.bg, false);
            
            this.deckContainer.add(card);
        });

        // Кнопка закрытия
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

    // --- ЗУМ КАРТ (Копия из BattleScene, нужна для работы Card.js) ---
    zoomCard(card) {
        if (this.zoomedCard) return; 
        
        // Если карта внутри контейнера (колоды), нужно учесть это при анимации
        // Но пока просто зумим по центру экрана
        
        this.zoomedCard = card;
        
        // Переносим карту из контейнера в сцену (временно), чтобы она была поверх всего
        if (card.parentContainer && card.parentContainer !== this) {
            card.originalParent = card.parentContainer;
            card.originalIndex = card.parentContainer.getIndex(card);
            // Конвертируем координаты из локальных в глобальные
            const worldPos = card.parentContainer.getBounds(); // Это грубо, лучше просто запомнить x,y
            // Так как контейнер на 0,0 и scrollFactor 0, локальные = глобальные
        }

        // Поднимаем слой затемнения еще выше
        this.dimmer.setDepth(2000).setVisible(true);
        card.setDepth(2001);
        // Если карта была в контейнере с ScrollFactor 0, она и так не скроллится. 
        // Если нет (будущие механики), надо ставить scrollFactor(0).
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
        
        // Если открыта колода, затемнение остается (слой 999), иначе убираем
        if (this.deckContainer && this.deckContainer.visible) {
            this.dimmer.setDepth(999); 
        } else {
            this.dimmer.setVisible(false);
        }

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
                // Если карта была частью контейнера, можно вернуть её в иерархию, 
                // но Phaser Container сложный. Пока оставим так, 
                // визуально она вернется на место.
                card.setDepth(0);
            }
        });
    }

    // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ КАРТЫ ---

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
