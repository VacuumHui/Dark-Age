// Файл: src/prefabs/Card.js

import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js';
import { getComputedCard } from '../managers/CardLogic.js';

export class Card extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardInstance) {
        super(scene, x, y);
        this.scene = scene;
        this.cardInstance = cardInstance; 
        
        this.cardData = getComputedCard(cardInstance);
        const baseData = CARDS_DB[cardInstance.id];
        
        this.isZoomed = false;
        
        // --- РАЗМЕР КАРТЫ ---
        const w = 140; 
        const h = 200;
        
        let strokeColor = 0x999999;
        if (baseData.rarity === 'rare') strokeColor = 0x0088ff;
        if (baseData.rarity === 'legendary') strokeColor = 0xffaa00;
        if (cardInstance.enchants && cardInstance.enchants.length > 0) {
            strokeColor = 0xff00ff;
        }

        // Фон
        this.bg = scene.add.rectangle(0, 0, w, h, 0x222222).setStrokeStyle(2, strokeColor);
        
        // Арт
        this.art = scene.add.rectangle(0, -35, 120, 80, baseData.color);
        
        // Заголовок
        this.title = scene.add.text(0, -90, this.cardData.name, { 
            fontSize: '16px', 
            fontStyle: 'bold',
            align: 'center',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Текст для миниатюры
        let descText = this.cardData.generatedDesc || this.cardData.desc;
        
        this.shortDesc = scene.add.text(0, 50, descText, { 
            fontSize: '13px', 
            color: '#e0e0e0', 
            align: 'center', 
            fontStyle: 'bold',
            wordWrap: { width: 130 } 
        }).setOrigin(0.5);
        
        // Текст для ЗУМА (Полное описание из базы + бонусы)
        // Собираем полный текст: Художественное описание + Техническое
        let fullTextContent = baseData.fullDesc || baseData.desc;
        if (this.cardData.generatedDesc !== baseData.desc) {
             // Если есть зачарования, добавляем тех. описание бонусов
             fullTextContent += "\n\n" + this.cardData.generatedDesc;
        }

        this.fullDesc = scene.add.text(0, 30, fullTextContent, { 
            fontSize: '18px', // Базовый размер для зума
            color: '#fff', 
            align: 'center', 
            wordWrap: { width: 160 } 
        }).setOrigin(0.5).setVisible(false);

        // Мана
        this.costCircle = scene.add.circle(-60, -90, 16, 0x00ffff);
        
        let costColor = '#000';
        if (this.cardData.cost < baseData.cost) costColor = '#008800'; 
        
        this.costText = scene.add.text(-60, -90, this.cardData.cost, { 
            fontSize: '20px', color: costColor, fontStyle: 'bold' 
        }).setOrigin(0.5);

        this.add([this.bg, this.art, this.title, this.shortDesc, this.fullDesc, this.costCircle, this.costText]);

        this.bg.setInteractive();
        scene.input.setDraggable(this.bg);
        this.bg.parentContainer = this;
        this.pressStartTime = 0;

        this.bg.on('pointerdown', () => {
            if (this.isZoomed) this.scene.unzoomCard();
            else { this.pressStartTime = Date.now(); this.scene.children.bringToTop(this); }
        });
        this.bg.on('pointerup', () => {
            if (this.isZoomed) return;
            if (Date.now() - this.pressStartTime < 250) this.scene.zoomCard(this);
        });
    }

    toggleMode(isZoomed) {
        this.isZoomed = isZoomed;
        let strokeColor = 0x999999;
        const baseData = CARDS_DB[this.cardInstance.id];
        if (baseData.rarity === 'rare') strokeColor = 0x0088ff;
        if (baseData.rarity === 'legendary') strokeColor = 0xffaa00;
        if (this.cardInstance.enchants.length > 0) strokeColor = 0xff00ff;

        if (isZoomed) { 
            this.shortDesc.setVisible(false);
            this.art.setVisible(false); // Скрываем картинку, чтобы было больше места для текста
            
            this.fullDesc.setVisible(true); 
            
            // --- ДИНАМИЧЕСКИЙ РАЗМЕР ШРИФТА ---
            // Если текст очень длинный (> 100 символов), уменьшаем шрифт
            if (this.fullDesc.text.length > 100) {
                this.fullDesc.setFontSize(14);
            } else if (this.fullDesc.text.length > 50) {
                this.fullDesc.setFontSize(16);
            } else {
                this.fullDesc.setFontSize(20);
            }
            
            this.bg.setStrokeStyle(3, 0x00ffff); 
        } else { 
            this.shortDesc.setVisible(true); 
            this.art.setVisible(true);
            this.fullDesc.setVisible(false); 
            this.bg.setStrokeStyle(2, strokeColor); 
        }
    }
}
