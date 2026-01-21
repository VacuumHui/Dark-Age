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
        
        // Арт (Картинка)
        // Y=-40, Высота 80 (занимает от -80 до 0)
        this.art = scene.add.rectangle(0, -40, 120, 80, baseData.color);
        
        // Заголовок
        this.title = scene.add.text(15, -90, this.cardData.name, { 
            fontSize: '15px', 
            fontStyle: 'bold',
            align: 'right',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2,
            wordWrap: { width: 95 } 
        }).setOrigin(0.5);
        
        // --- ОПИСАНИЕ НА МИНИАТЮРЕ (ИСПРАВЛЕНО) ---
        let descText = this.cardData.generatedDesc || this.cardData.desc;
        
        // Рассчитываем размер шрифта в зависимости от длины текста
        let miniFontSize = '16px'; // Стандартный крупный
        if (descText.length > 50) miniFontSize = '14px'; // Если много текста - чуть меньше
        if (descText.length > 80) miniFontSize = '12px'; // Если очень много - еще меньше

        // Y=25: Начинаем писать сразу под картинкой (картинка кончается в 0)
        this.shortDesc = scene.add.text(0, 25, descText, { 
            fontSize: miniFontSize, 
            color: '#ffffff',  // Чисто белый для контраста
            align: 'center', 
            fontStyle: 'bold', // ЖИРНЫЙ, чтобы читалось
            wordWrap: { width: 130 },
            stroke: '#000000', // Легкая обводка для читаемости на темном фоне
            strokeThickness: 2
        }).setOrigin(0.5, 0); // Origin сверху, чтобы текст рос вниз
        
        // Мана
        this.costCircle = scene.add.circle(-60, -90, 18, 0x00ffff); // Чуть больше кружок
        
        let costColor = '#000';
        if (this.cardData.cost < baseData.cost) costColor = '#008800'; 
        
        this.costText = scene.add.text(-60, -90, this.cardData.cost, { 
            fontSize: '22px', color: costColor, fontStyle: 'bold' 
        }).setOrigin(0.5);
        
        // --- ПОЛНОЕ ОПИСАНИЕ (ДЛЯ ЗУМА) ---
        let fullTextContent = baseData.fullDesc || baseData.desc;
        if (this.cardData.generatedDesc !== baseData.desc) {
             fullTextContent += "\n\n" + this.cardData.generatedDesc;
        }

        this.fullDesc = scene.add.text(0, 25, fullTextContent, { 
            fontSize: '18px', 
            color: '#fff', 
            align: 'center', 
            wordWrap: { width: 130 } 
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
            // Картинку оставляем, так красивее
            // this.art.setVisible(false); 
            
            this.fullDesc.setVisible(true); 
            
            // Динамический шрифт для Зума
            const len = this.fullDesc.text.length;
            if (len > 120) this.fullDesc.setFontSize(12);
            else if (len > 80) this.fullDesc.setFontSize(14);
            else this.fullDesc.setFontSize(18);
            
            this.bg.setStrokeStyle(3, 0x00ffff); 
        } else { 
            this.shortDesc.setVisible(true); 
            this.fullDesc.setVisible(false); 
            this.bg.setStrokeStyle(2, strokeColor); 
        }
    }
}
