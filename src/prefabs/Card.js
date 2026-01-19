// Файл: src/prefabs/Card.js

import { CARDS_DB } from '../data/cards.js';
import { getComputedCard } from '../managers/CardLogic.js';

export class Card extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardInstance) {
        super(scene, x, y);
        this.scene = scene;
        this.cardInstance = cardInstance; 
        
        // 1. ПОЛУЧАЕМ ВСЕ ДАННЫЕ ИЗ ЛОГИКИ
        this.computedData = getComputedCard(cardInstance);
        const baseData = CARDS_DB[cardInstance.id];
        
        this.isZoomed = false;
        
        const w = 180, h = 252;
        
        // Цвет рамки (редкость + зачарование)
        let strokeColor = 0x999999;
        if (baseData.rarity === 'rare') strokeColor = 0x0088ff;
        if (baseData.rarity === 'legendary') strokeColor = 0xffaa00;
        
        if (cardInstance.enchants && cardInstance.enchants.length > 0) {
            strokeColor = 0xff00ff; // Фиолетовый, если есть чары
        }

        this.bg = scene.add.rectangle(0, 0, w, h, 0x222222).setStrokeStyle(2, strokeColor);
        this.art = scene.add.rectangle(0, -30, 80, 60, baseData.color);
        
        this.title = scene.add.text(0, -5, this.computedData.name, { fontSize: '13px', fontStyle:'bold' }).setOrigin(0.5);
        
        // 2. ВЫВОДИМ СГЕНЕРИРОВАННЫЙ ТЕКСТ
        // Он уже содержит правильные цифры (9 урона вместо 6) и новые эффекты
        this.shortDesc = scene.add.text(0, 40, this.computedData.generatedDesc, { 
            fontSize: '11px', color: '#ccc', align: 'center', wordWrap: {width: 90} 
        }).setOrigin(0.5);
        
        this.costCircle = scene.add.circle(-40, -60, 12, 0x00ffff);
        
        // 3. ВЫВОДИМ СТОИМОСТЬ (ПРАВИЛЬНУЮ)
        // Если стоимость изменилась, красим в зеленый
        let costColor = '#000';
        if (this.computedData.cost < baseData.cost) costColor = '#008800'; 
        
        this.costText = scene.add.text(-40, -60, this.computedData.cost, { 
            fontSize: '16px', color: costColor, fontStyle: 'bold' 
        }).setOrigin(0.5);
        
        // Полное описание для зума (тоже берем сгенерированное)
        this.fullDesc = scene.add.text(0, 50, this.computedData.generatedDesc, { 
            fontSize: '14px', color: '#fff', align: 'center', wordWrap: { width: 150 } 
        }).setOrigin(0.5).setVisible(false);

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
        // При зуме меняем рамку на голубую, при возврате - на родную
        let strokeColor = this.bg.strokeColor; // Запоминаем текущий
        
        if (isZoomed) { 
            this.shortDesc.setVisible(false); 
            this.fullDesc.setVisible(true); 
            this.bg.setStrokeStyle(2, 0x00ffff); 
        } else { 
            this.shortDesc.setVisible(true); 
            this.fullDesc.setVisible(false); 
            
            // Восстанавливаем цвет рамки
            const baseData = CARDS_DB[this.cardInstance.id];
            strokeColor = 0x999999;
            if (baseData.rarity === 'rare') strokeColor = 0x0088ff;
            if (baseData.rarity === 'legendary') strokeColor = 0xffaa00;
            if (this.cardInstance.enchants.length > 0) strokeColor = 0xff00ff;
            
            this.bg.setStrokeStyle(2, strokeColor); 
        }
    }
}
