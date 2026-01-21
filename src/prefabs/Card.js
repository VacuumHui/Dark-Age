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
        
        // --- 1. РАЗМЕР КАРТЫ ---
        // 140x200 - это наш стандарт.
        // Координаты идут от центра (0,0).
        // Верхний край: -100, Нижний: +100.
        // Левый край: -70, Правый: +70.
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
        
        // Арт (Картинка)
        // Смещаем чуть выше центра (-40)
        this.art = scene.add.rectangle(0, -40, 120, 80, baseData.color);
        
        // --- ЗАГОЛОВОК (ИСПРАВЛЕНО) ---
        // y: -85 (был -90) -> Чуть ниже, чтобы не лип к верху
        // x: 20 (был 0) -> Сдвиг вправо, чтобы не наезжать на ману
        // wordWrap: 100 -> Если название длинное, оно перенесется
        this.title = scene.add.text(20, -85, this.cardData.name, { 
            fontSize: '14px', 
            fontStyle: 'bold',
            align: 'right',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2,
            wordWrap: { width: 95 } 
        }).setOrigin(0.5);
        
        // --- ТЕКСТ ОПИСАНИЯ (ИСПРАВЛЕНО) ---
        let descText = this.cardData.generatedDesc || this.cardData.desc;
        
        // Маленький текст (на карте в руке)
        this.shortDesc = scene.add.text(0, 55, descText, { 
            fontSize: '11px', // Помельче, чтобы влезало
            color: '#e0e0e0', 
            align: 'center', 
            wordWrap: { width: 120 } 
        }).setOrigin(0.5, 0); // Origin сверху (растет вниз)
        
        // Мана (Левый верхний угол)
        this.costCircle = scene.add.circle(-60, -90, 16, 0x00ffff);
        
        let costColor = '#000';
        if (this.cardData.cost < baseData.cost) costColor = '#008800'; 
        
        this.costText = scene.add.text(-60, -90, this.cardData.cost, { 
            fontSize: '20px', color: costColor, fontStyle: 'bold' 
        }).setOrigin(0.5);
        
        // --- ПОЛНОЕ ОПИСАНИЕ (ДЛЯ ЗУМА) ---
        // Собираем текст
        let fullTextContent = baseData.fullDesc || baseData.desc;
        if (this.cardData.generatedDesc !== baseData.desc) {
             fullTextContent += "\n\n" + this.cardData.generatedDesc;
        }

        // y: 25 -> Начинаем писать сразу под картинкой (было 55)
        // Это дает нам больше места снизу
        this.fullDesc = scene.add.text(0, 25, fullTextContent, { 
            fontSize: '14px', 
            color: '#fff', 
            align: 'center', 
            wordWrap: { width: 125 } // Отступы по бокам (140 - 15 = 125)
        }).setOrigin(0.5, 0).setVisible(false);

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
            // Картинку НЕ скрываем
            
            this.fullDesc.setVisible(true); 
            
            // --- УМНЫЙ РАЗМЕР ШРИФТА ---
            const len = this.fullDesc.text.length;
            if (len > 120) {
                this.fullDesc.setFontSize(10); // Очень много текста -> мелкий шрифт
                this.fullDesc.setLineSpacing(0);
            } else if (len > 80) {
                this.fullDesc.setFontSize(12); // Средний текст
                this.fullDesc.setLineSpacing(2);
            } else {
                this.fullDesc.setFontSize(14); // Мало текста -> нормальный шрифт
                this.fullDesc.setLineSpacing(4);
            }
            
            this.bg.setStrokeStyle(3, 0x00ffff); 
        } else { 
            this.shortDesc.setVisible(true); 
            this.fullDesc.setVisible(false); 
            this.bg.setStrokeStyle(2, strokeColor); 
        }
    }
}
