// src/scenes/RestScene.js
import { GameState } from '../GameState.js';
import { Card } from '../prefabs/Card.js';
import { ENCHANTS_DB } from '../data/enchants.js';

export class RestScene extends Phaser.Scene {
    constructor() { super({ key: 'RestScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        this.add.rectangle(0, 0, GW, GH, 0x221100).setOrigin(0);
        this.add.circle(GW/2, GH/2 - 50, 100, 0xff4400, 0.2);
        this.tweens.add({ targets: this.add.text(GW/2, GH/2 - 80, "🔥", { fontSize: '120px' }).setOrigin(0.5), scale: 1.1, duration: 1000, yoyo: true, repeat: -1 });
        this.add.text(GW/2, 120, "CAMPFIRE", { fontSize: '60px', fontStyle: 'bold', color: '#ffaa00' }).setOrigin(0.5);

        const healAmount = Math.floor(GameState.maxHp * 0.3);
        const restBtn = this.createButton(GW/2 - 250, GH/2 + 150, "REST", `Heal ${healAmount} HP`, 0x008800);
        restBtn.on('pointerdown', () => {
            GameState.currentHp += healAmount;
            if (GameState.currentHp > GameState.maxHp) GameState.currentHp = GameState.maxHp;
            this.cameras.main.flash(500, 0, 255, 0);
            this.time.delayedCall(1000, () => this.scene.start('MapScene'));
        });

        const smithBtn = this.createButton(GW/2 + 250, GH/2 + 150, "SMITH", "Enchant a Card", 0xaa4400);
        smithBtn.on('pointerdown', () => { this.openCardSelection(); });
    }

    createButton(x, y, title, desc, color) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 350, 140, color).setStrokeStyle(4, 0xffffff).setInteractive();
        const t1 = this.add.text(0, -25, title, { fontSize: '40px', fontStyle: 'bold' }).setOrigin(0.5);
        const t2 = this.add.text(0, 30, desc, { fontSize: '20px', color: '#ddd' }).setOrigin(0.5);
        container.add([bg, t1, t2]);
        bg.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.05, duration: 100 }));
        bg.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 100 }));
        return bg;
    }

    openCardSelection() {
        const GW = this.scale.width; const GH = this.scale.height;
        this.overlay = this.add.rectangle(0, 0, GW, GH, 0x000000, 0.95).setOrigin(0).setInteractive();
        this.add.text(GW/2, 60, "SELECT A CARD TO ENCHANT", { fontSize: '32px', color: '#ffaa00' }).setOrigin(0.5);
        const validCards = GameState.deck.filter(c => c.enchants.length < 2);
        
        const startX = 150; const startY = 180; const gapX = 130;
        const cardsPerRow = Math.floor((GW - 200) / gapX);
        this.cardContainer = this.add.container(0, 0);

        validCards.forEach((cardInstance, index) => {
            const col = index % cardsPerRow; const row = Math.floor(index / cardsPerRow);
            const x = startX + (col * gapX); const y = startY + (row * 180);
            const card = new Card(this, x, y, cardInstance);
            this.input.setDraggable(card.bg, false);
            card.bg.setInteractive();
            card.bg.on('pointerdown', () => { this.showEnchantOptions(cardInstance); });
            this.cardContainer.add(card);
        });
        const cancelBtn = this.add.text(GW/2, GH - 50, "[ CANCEL ]", { fontSize: '24px', color: '#fff' }).setOrigin(0.5).setInteractive();
        cancelBtn.on('pointerdown', () => this.scene.restart());
    }

    showEnchantOptions(cardInstance) {
        this.cardContainer.destroy();
        const GW = this.scale.width; const GH = this.scale.height;
        this.add.text(GW/2, 100, `Enchanting:`, { fontSize: '24px', color: '#aaa' }).setOrigin(0.5);
        const displayCard = new Card(this, GW/2, 200, cardInstance);
        this.input.setDraggable(displayCard.bg, false);
        this.add.text(GW/2, 320, "Choose an Upgrade:", { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        const options = this.rollEnchants(3);
        const startX = GW/2 - 350; const gap = 350;

        options.forEach((enchantKey, index) => {
            const data = ENCHANTS_DB[enchantKey];
            const x = startX + (index * gap);
            const y = 500;
            let color = 0x666666; if (data.rarity === 'rare') color = 0x0088ff; if (data.rarity === 'legendary') color = 0xffaa00;
            const btn = this.add.container(x, y);
            const bg = this.add.rectangle(0, 0, 300, 200, 0x222222).setStrokeStyle(4, color).setInteractive();
            const title = this.add.text(0, -50, data.name, { fontSize: '28px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5);
            const desc = this.add.text(0, 10, data.desc, { fontSize: '18px', color: '#ccc', align: 'center', wordWrap: {width: 280} }).setOrigin(0.5);
            const rarityText = this.add.text(0, 70, data.rarity.toUpperCase(), { fontSize: '14px', color: '#888' }).setOrigin(0.5);
            btn.add([bg, title, desc, rarityText]);
            bg.on('pointerdown', () => {
                cardInstance.enchants.push(enchantKey);
                this.cameras.main.flash(500, 255, 255, 255);
                this.time.delayedCall(800, () => this.scene.start('MapScene'));
            });
            bg.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.1, duration: 100 }));
            bg.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 100 }));
        });
    }

    rollEnchants(count) {
        const keys = [];
        const allEnchants = Object.keys(ENCHANTS_DB);
        const pool = { common: [], rare: [], legendary: [] };
        allEnchants.forEach(k => pool[ENCHANTS_DB[k].rarity].push(k));
        for (let i = 0; i < count; i++) {
            const rand = Math.random();
            let selectedRarity = 'common';
            if (rand < 0.10) selectedRarity = 'legendary'; else if (rand < 0.40) selectedRarity = 'rare';
            let pickPool = pool[selectedRarity].length > 0 ? pool[selectedRarity] : pool['common'];
            const pick = pickPool[Math.floor(Math.random() * pickPool.length)];
            keys.push(pick);
        }
        return keys;
    }
}
