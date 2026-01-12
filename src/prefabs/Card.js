import { CARDS_DB } from '../data/cards.js';

export class Card extends Phaser.GameObjects.Container {
    constructor(scene, x, y, key) {
        super(scene, x, y);
        this.scene = scene;
        this.cardData = CARDS_DB[key];
        this.isZoomed = false;
        
        const w = 100, h = 140;
        let strokeColor = 0x999999;
        if (this.cardData.rarity === 'rare') strokeColor = 0x0088ff;
        if (this.cardData.rarity === 'legendary') strokeColor = 0xffaa00;

        this.bg = scene.add.rectangle(0, 0, w, h, 0x222222).setStrokeStyle(2, strokeColor);
        this.art = scene.add.rectangle(0, -30, 80, 60, this.cardData.color);
        this.title = scene.add.text(0, -5, this.cardData.name, { fontSize: '13px', fontStyle:'bold' }).setOrigin(0.5);
        this.shortDesc = scene.add.text(0, 40, this.cardData.desc, { fontSize: '11px', color: '#ccc', align: 'center', wordWrap: {width: 90} }).setOrigin(0.5);
        this.costCircle = scene.add.circle(-40, -60, 12, 0x00ffff);
        this.costText = scene.add.text(-40, -60, this.cardData.cost, { fontSize: '16px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
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
        let strokeColor = (this.cardData.rarity === 'rare') ? 0x0088ff : 0x999999;
        if (this.cardData.rarity === 'legendary') strokeColor = 0xffaa00;

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
