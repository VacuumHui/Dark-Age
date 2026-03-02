// Файл: src/prefabs/Card.js

import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js';
import { getComputedCard } from '../managers/CardLogic.js';

export class Card extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardInstance, playerContext = null) {
        super(scene, x, y);
        this.scene = scene;
        this.cardInstance = cardInstance;
        this.playerContext = playerContext; // Сохраняем ссылку на игрока
        
        this.cardData = getComputedCard(cardInstance, playerContext);
        const baseData = CARDS_DB[cardInstance.id];
        
        this.isZoomed = false;
        
        // --- 1. РАЗМЕР КАРТЫ ---
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
        this.art = scene.add.rectangle(0, -50, 120, 70, baseData.color);
        
        // --- ЗАГОЛОВОК ---
        this.title = scene.add.text(15, -85, this.cardData.name, { 
            fontSize: '14px', 
            fontStyle: 'bold',
            align: 'right',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2,
            wordWrap: { width: 95 } 
        }).setOrigin(0.5);
        
        // --- ТЕКСТ НА МИНИАТЮРЕ (Оставляем как есть) ---
        let descText = this.cardData.generatedDesc || this.cardData.desc;
        
        this.shortDesc = scene.add.text(0, 30, descText, { 
            fontSize: '14px', 
            color: '#ffffff', 
            align: 'center', 
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 2,
            wordWrap: { width: 130 } 
        }).setOrigin(0.5, 0); 
        
        // --- ПОЛНОЕ ОПИСАНИЕ (ИСПРАВЛЕНО - HD КАЧЕСТВО) ---
        let fullTextContent = baseData.fullDesc || baseData.desc;
        if (this.cardData.generatedDesc !== baseData.desc) {
             fullTextContent += "\n\n" + this.cardData.generatedDesc;
        }

        // ТРЮК: Делаем шрифт ОГРОМНЫМ (24px), но уменьшаем масштаб объекта (.setScale)
        // При зуме карты качество сохранится.
        this.fullDesc = scene.add.text(0, 25, fullTextContent, { 
            fontSize: '24px', // Крупный исходник
            color: '#fff', 
            align: 'center',
            // Увеличиваем ширину переноса, так как текст сжат
            // Ширина карты 130px / 0.35 (масштаб) = ~370px
            wordWrap: { width: 360 } 
        })
        .setOrigin(0.5, 0)
        .setScale(0.35) // Сжимаем текст, чтобы влез
        .setVisible(false);

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

        // --- НОВЫЙ МЕТОД ---
    refreshDynamicText() {
        // Пересчитываем данные с учетом текущего состояния игрока
        this.cardData = getComputedCard(this.cardInstance, this.playerContext);
        const baseData = CARDS_DB[this.cardInstance.id];
        
        let descText = this.cardData.generatedDesc || this.cardData.desc;
        
        // Обновляем текст и цвет на миниатюре
        this.shortDesc.setText(descText);
        if (this.cardData.dynamicColor) {
            this.shortDesc.setColor(this.cardData.dynamicColor);
        }

        // Обновляем полное описание (на случай, если открыт зум)
        let fullTextContent = baseData.fullDesc || baseData.desc;
        if (this.cardData.generatedDesc !== baseData.desc) {
             fullTextContent += "\n\n" + this.cardData.generatedDesc;
        }
        this.fullDesc.setText(fullTextContent);
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
            // Больше не меняем размер шрифта вручную, масштаб карты сам сделает его крупным
            
            this.bg.setStrokeStyle(3, 0x00ffff); 
        } else { 
            this.shortDesc.setVisible(true); 
            this.fullDesc.setVisible(false); 
            this.bg.setStrokeStyle(2, strokeColor); 
        }
    }
}
