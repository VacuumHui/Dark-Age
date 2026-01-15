// Файл: src/prefabs/Card.js

import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js'; // <--- НОВЫЙ ИМПОРТ
import { getComputedCard } from '../managers/CardLogic.js';

export class Card extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardInstance) {
        super(scene, x, y);
        this.scene = scene;
        this.cardInstance = cardInstance; 
        
        // Получаем финальные цифры
        this.cardData = getComputedCard(cardInstance);
        const baseData = CARDS_DB[cardInstance.id];
        
        this.isZoomed = false;
        
        const w = 100, h = 140;
        let strokeColor = 0x999999;
        if (baseData.rarity === 'rare') strokeColor = 0x0088ff;
        if (baseData.rarity === 'legendary') strokeColor = 0xffaa00;
        
        // --- ФОРМИРОВАНИЕ ОПИСАНИЯ ---
        let descText = this.cardData.desc;
        
        // Если есть зачарования, добавляем их описание
        if (cardInstance.enchants && cardInstance.enchants.length > 0) {
            strokeColor = 0xff00ff; // Фиолетовая рамка
            
            cardInstance.enchants.forEach(enchantId => {
                const enchant = ENCHANTS_DB[enchantId];
                if (enchant) {
                    // Добавляем текст: "Руна Огня: +2 Яда"
                    descText += `\n[${enchant.desc}]`;
                }
            });
        }
        // ------------------------------

        this.bg = scene.add.rectangle(0, 0, w, h, 0x222222).setStrokeStyle(2, strokeColor);
        this.art = scene.add.rectangle(0, -30, 80, 60, baseData.color);
        
        this.title = scene.add.text(0, -5, this.cardData.name, { fontSize: '13px', fontStyle:'bold' }).setOrigin(0.5);
        this.shortDesc = scene.add.text(0, 40, descText, { fontSize: '10px', color: '#ccc', align: 'center', wordWrap: {width: 90} }).setOrigin(0.5);
        this.costCircle = scene.add.circle(-40, -60, 12, 0x00ffff);
        
        let costColor = '#000';
        if (this.cardData.cost < baseData.cost) costColor = '#008800'; 
        
        this.costText = scene.add.text(-40, -60, this.cardData.cost, { fontSize: '16px', color: costColor, fontStyle: 'bold' }).setOrigin(0.5);
        this.fullDesc = scene.add.text(0, 50, this.cardData.fullDesc, { fontSize: '9px', color: '#fff', align: 'center', wordWrap: { width: 90 } }).setOrigin(0.5).setVisible(false);

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
            this.fullDesc.setVisible(true); 
            this.bg.setStrokeStyle(2, 0x00ffff); 
        } else { 
            this.shortDesc.setVisible(true); 
            this.fullDesc.setVisible(false); 
            this.bg.setStrokeStyle(2, strokeColor); 
        }
    }
}
