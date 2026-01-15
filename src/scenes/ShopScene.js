// src/scenes/ShopScene.js

import { GameState, createCardInstance } from '../GameState.js';
import { CARDS_DB } from '../data/cards.js';
import { RELICS_DB } from '../data/relics.js';
import { Card } from '../prefabs/Card.js';

export class ShopScene extends Phaser.Scene {
    constructor() { super({ key: 'ShopScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // Фон
        this.add.rectangle(0, 0, GW, GH, 0x2a1a0a).setOrigin(0);
        this.add.text(GW/2, 50, `MERCHANT (Gold: ${GameState.gold})`, { fontSize: '40px', color: '#ffd700' }).setOrigin(0.5);

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

            const x = 300 + (i * 250);
            const y = 300;

            // Визуал карты (временный инстанс)
            const tempInstance = createCardInstance(randomKey);
            const card = new Card(this, x, y, tempInstance);
            this.add.existing(card);
            
            // Ценник
            const priceTag = this.add.text(x, y + 100, `${price} G`, { 
                fontSize: '24px', color: '#ffd700', backgroundColor: '#000' 
            }).setOrigin(0.5).setInteractive();

            // Логика покупки
            priceTag.on('pointerdown', () => {
                if (GameState.gold >= price) {
                    GameState.gold -= price;
                    GameState.deck.push(createCardInstance(randomKey));
                    
                    // Визуал покупки
                    priceTag.destroy();
                    card.destroy();
                    this.add.text(x, y, "SOLD", { fontSize: '32px', color: '#00ff00' }).setOrigin(0.5);
                    this.updateHeader();
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
        const y = 300;
        const price = data.price || 150;

        // Иконка
        this.add.rectangle(x, y, 60, 60, 0x444444).setStrokeStyle(2, 0xffaa00);
        this.add.text(x, y, data.icon, { fontSize: '40px' }).setOrigin(0.5);
        this.add.text(x, y - 60, data.name, { fontSize: '16px' }).setOrigin(0.5);

        // Ценник
        const priceTag = this.add.text(x, y + 60, `${price} G`, { 
            fontSize: '24px', color: '#ffd700', backgroundColor: '#000' 
        }).setOrigin(0.5).setInteractive();

        priceTag.on('pointerdown', () => {
            if (GameState.gold >= price) {
                // Проверка на дубликаты (опционально, но реликвии обычно уникальны)
                if (GameState.relics.includes(randomKey)) {
                    alert("Уже есть!");
                    return;
                }

                GameState.gold -= price;
                GameState.relics.push(randomKey); // Добавляем только ID
                
                priceTag.destroy();
                this.add.text(x, y, "SOLD", { fontSize: '32px', color: '#00ff00' }).setOrigin(0.5);
                this.updateHeader();
            } else {
                this.cameras.main.shake(100, 0.005);
            }
        });
    }

    updateHeader() {
        // Обновляем текст золота (ленивый способ - перерисовать сцену или хранить ссылку на текст)
        // Для простоты оставим как есть, в реальной игре надо обновлять this.goldText
    }
}
