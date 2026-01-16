// Файл: src/scenes/ShopScene.js

import { GameState, createCardInstance } from '../GameState.js';
import { CARDS_DB } from '../data/cards.js';
import { RELICS_DB } from '../data/relics.js';
import { Card } from '../prefabs/Card.js';

export class ShopScene extends Phaser.Scene {
    constructor() { super({ key: 'ShopScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // 1. Запуск глобального UI
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        this.game.events.emit('UPDATE_UI');

        // Фон
        this.add.rectangle(0, 0, GW, GH, 0x2a1a0a).setOrigin(0);
        this.add.text(GW/2, 80, `MERCHANT`, { fontSize: '50px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);

        // --- ЗАТЕМНЕНИЕ ДЛЯ ЗУМА (НОВОЕ) ---
        this.dimmer = this.add.rectangle(0, 0, GW, GH, 0x000000, 0.85)
            .setOrigin(0)
            .setVisible(false)
            .setDepth(900)
            .setInteractive();
            
        this.dimmer.on('pointerdown', () => this.unzoomCard());
        this.zoomedCard = null;

        // Кнопка "Уйти"
        const exitBtn = this.add.text(GW - 100, GH - 50, "[ LEAVE ]", { fontSize: '30px' }).setOrigin(0.5).setInteractive();
        exitBtn.on('pointerdown', () => this.scene.start('MapScene'));

        // --- ГЕНЕРАЦИЯ ТОВАРОВ ---
        this.generateCards(GW, GH);
        this.generateRelic(GW, GH);
    }

    generateCards(GW, GH) {
        const keys = Object.keys(CARDS_DB);
        
        // Рисуем 3 карты
        for (let i = 0; i < 3; i++) {
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            const data = CARDS_DB[randomKey];
            
            // Расчет цены
            let price = 50;
            if (data.rarity === 'rare') price = 100;
            if (data.rarity === 'legendary') price = 200;

            const x = 300 + (i * 280); // Чуть шире расставим
            const y = 350;

            // Визуал карты (временный инстанс)
            const tempInstance = createCardInstance(randomKey);
            const card = new Card(this, x, y, tempInstance);
            this.add.existing(card);
            
            // Ценник
            const priceTag = this.add.text(x, y + 110, `${price} G`, { 
                fontSize: '28px', color: '#ffd700', backgroundColor: '#000', padding: { x: 5, y: 5 }
            }).setOrigin(0.5).setInteractive();

            // Логика покупки (Клик по ЦЕНЕ)
            priceTag.on('pointerdown', () => {
                if (GameState.gold >= price) {
                    GameState.gold -= price;
                    GameState.deck.push(createCardInstance(randomKey));
                    
                    // Обновляем UI золота
                    this.game.events.emit('UPDATE_UI');

                    // Визуал покупки
                    priceTag.destroy();
                    card.destroy();
                    this.add.text(x, y, "SOLD", { fontSize: '32px', color: '#00ff00' }).setOrigin(0.5);
                } else {
                    this.cameras.main.shake(100, 0.005); // Денег нет
                }
            });
        }
    }

    generateRelic(GW, GH) {
        const keys = Object.keys(RELICS_DB);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const data = RELICS_DB[randomKey];
        
        const x = GW - 300;
        const y = 350;
        const price = data.price || 150;

        // Иконка
        this.add.rectangle(x, y, 80, 80, 0x444444).setStrokeStyle(2, 0xffaa00);
        this.add.text(x, y, data.icon, { fontSize: '50px' }).setOrigin(0.5);
        this.add.text(x, y - 80, data.name, { fontSize: '20px', color: '#fff' }).setOrigin(0.5);

        // Ценник
        const priceTag = this.add.text(x, y + 80, `${price} G`, { 
            fontSize: '28px', color: '#ffd700', backgroundColor: '#000', padding: { x: 5, y: 5 }
        }).setOrigin(0.5).setInteractive();

        priceTag.on('pointerdown', () => {
            if (GameState.gold >= price) {
                if (GameState.relics.includes(randomKey)) {
                    // Если реликвия уникальная, можно запретить, но у нас стакаются, так что ок
                }

                GameState.gold -= price;
                GameState.relics.push(randomKey); 
                
                // Обновляем UI золота
                this.game.events.emit('UPDATE_UI');
                
                priceTag.destroy();
                this.add.text(x, y, "SOLD", { fontSize: '32px', color: '#00ff00' }).setOrigin(0.5);
            } else {
                this.cameras.main.shake(100, 0.005);
            }
        });
    }

    // --- МЕТОДЫ ЗУМА (ИХ НЕ БЫЛО, ПОЭТОМУ БЫЛА ОШИБКА) ---

    zoomCard(card) {
        if (this.zoomedCard) return; 
        this.zoomedCard = card;
        
        this.dimmer.setVisible(true).setDepth(900);
        card.setDepth(901); // Поднимаем карту

        card.savedX = card.x; 
        card.savedY = card.y; 
        card.savedScale = card.scale;
        
        card.toggleMode(true);
        
        this.tweens.add({ 
            targets: card, 
            x: this.scale.width / 2, 
            y: this.scale.height / 2, 
            scale: 2.5, 
            duration: 300, 
            ease: 'Back.out' 
        });
    }
    
    unzoomCard() {
        if (!this.zoomedCard) return; 
        const card = this.zoomedCard;
        this.zoomedCard = null; 
        
        this.dimmer.setVisible(false);
        card.toggleMode(false);
        
        this.tweens.add({ 
            targets: card, 
            x: card.savedX, 
            y: card.savedY, 
            scale: 1, 
            duration: 250, 
            ease: 'Power2',
            onComplete: () => {
                card.setDepth(0); // Возвращаем обычный слой
            }
        });
    }
}
