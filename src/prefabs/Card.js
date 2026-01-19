// Файл: src/prefabs/Card.js

import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js';
import { getComputedCard } from '../managers/CardLogic.js';

export class Card extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardInstance) {
        super(scene, x, y);
        this.scene = scene;
        this.cardInstance = cardInstance; 
        
        // Получаем финальные цифры и текст
        this.cardData = getComputedCard(cardInstance);
        const baseData = CARDS_DB[cardInstance.id];
        
        this.isZoomed = false;
        
        // --- 1. НОВЫЕ РАЗМЕРЫ ---
        const w = 180;
        const h = 252;
        
        // Цвет рамки
        let strokeColor = 0x999999;
        if (baseData.rarity === 'rare') strokeColor = 0x0088ff;
        if (baseData.rarity === 'legendary') strokeColor = 0xffaa00;
        if (cardInstance.enchants && cardInstance.enchants.length > 0) {
            strokeColor = 0xff00ff;
        }

        // --- 2. ЭЛЕМЕНТЫ КАРТЫ (Адаптированы под 180x252) ---

        // Фон
        this.bg = scene.add.rectangle(0, 0, w, h, 0x222222).setStrokeStyle(3, strokeColor);
        
        // Арт (Картинка) - смещаем вверх
        // Центр был 0, теперь -40, размер увеличили
        this.art = scene.add.rectangle(0, -40, 150, 100, baseData.color);
        
        // Заголовок - под маной, над артом или поверх арта?
        // Ставим над артом, ближе к верху
        this.title = scene.add.text(0, -105, this.cardData.name, { 
            fontSize: '18px', 
            fontStyle: 'bold',
            align: 'center',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Текст описания
        // Берем сгенерированный текст из CardLogic
        let descText = this.cardData.generatedDesc || this.cardData.desc;
        
        // Основное описание (внизу карты)
        this.shortDesc = scene.add.text(0, 60, descText, { 
            fontSize: '14px', 
            color: '#ccc', 
            align: 'center', 
            wordWrap: { width: 160 } // Ширина текста под новую ширину карты
        }).setOrigin(0.5);
        
        // Кружок маны (Левый верхний угол)
        // Координаты от центра: x = -w/2 + отступ, y = -h/2 + отступ
        // -90 + 15 = -75
        // -126 + 15 = -111
        this.costCircle = scene.add.circle(-75, -111, 20, 0x00ffff);
        
        let costColor = '#000';
        if (this.cardData.cost < baseData.cost) costColor = '#008800'; 
        
        this.costText = scene.add.text(-75, -111, this.cardData.cost, { 
            fontSize: '24px', 
            color: costColor, 
            fontStyle: 'bold' 
        }).setOrigin(0.5);
        
        // Полное описание для зума (можно сделать шрифт еще крупнее)
        this.fullDesc = scene.add.text(0, 50, descText, { 
            fontSize: '18px', 
            color: '#fff', 
            align: 'center', 
            wordWrap: { width: 160 } 
        }).setOrigin(0.5).setVisible(false);

        // Добавляем всё в контейнер
        this.add([this.bg, this.art, this.title, this.shortDesc, this.fullDesc, this.costCircle, this.costText]);

        // --- ИНТЕРАКТИВНОСТЬ ---
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
            this.bg.setStrokeStyle(4, 0x00ffff); // Толще рамка при зуме
        } else { 
            this.shortDesc.setVisible(true); 
            this.fullDesc.setVisible(false); 
            this.bg.setStrokeStyle(3, strokeColor); 
        }
    }
}
