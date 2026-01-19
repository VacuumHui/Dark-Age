// Файл: src/scenes/UIScene.js

import { GameState } from '../GameState.js';
import { RELICS_DB } from '../data/relics.js';

export class UIScene extends Phaser.Scene {
    constructor() { super({ key: 'UIScene' }); }

    create() {
        const GW = this.scale.width;
        
        // --- ВЕРХНЯЯ ПАНЕЛЬ ---
        this.add.rectangle(0, 0, GW, 60, 0x000000, 0.8).setOrigin(0);

        this.hpText = this.add.text(20, 20, "HP: 50/50", { fontSize: '24px', fontStyle: 'bold', color: '#ff4444' });
        this.goldText = this.add.text(GW / 2, 20, "GOLD: 0", { fontSize: '24px', fontStyle: 'bold', color: '#ffd700' }).setOrigin(0.5, 0);
        this.floorText = this.add.text(GW - 80, 20, "Lvl: 1", { fontSize: '24px', color: '#aaaaaa' }).setOrigin(1, 0);

        this.createStatsPanel(GW);

        // ВАЖНО: Подписка на событие
        this.game.events.on('UPDATE_UI', this.updateUI, this);
        
        // ВАЖНО: При закрытии сцены нужно ОТПИСАТЬСЯ, иначе будет ошибка при рестарте
        this.events.on('shutdown', this.shutdown, this);
        
        this.updateUI();
    }
    
    // МЕТОД ОЧИСТКИ (FIX CRASH)
    shutdown() {
        this.game.events.off('UPDATE_UI', this.updateUI, this);
    }

    createStatsPanel(GW) {
        this.statsPanel = this.add.container(GW, 0);
        const bg = this.add.rectangle(0, 0, 350, this.scale.height, 0x111111, 0.98).setOrigin(0).setStrokeStyle(2, 0x444444);
        const title = this.add.text(175, 40, "HERO SUMMARY", { fontSize: '28px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.statsContent = this.add.text(20, 90, "", { fontSize: '18px', color: '#ccc', lineSpacing: 8 });

        this.toggleBtn = this.add.container(-40, 100);
        const btnBg = this.add.rectangle(0, 0, 40, 80, 0x333333).setOrigin(0).setStrokeStyle(1, 0x666666).setInteractive();
        this.arrowText = this.add.text(20, 40, "<", { fontSize: '24px' }).setOrigin(0.5);
        
        this.toggleBtn.add([btnBg, this.arrowText]);
        this.statsPanel.add([bg, title, this.statsContent, this.toggleBtn]);

        this.isPanelOpen = false;
        
        btnBg.on('pointerdown', () => {
            this.isPanelOpen = !this.isPanelOpen;
            this.tweens.add({
                targets: this.statsPanel,
                x: this.isPanelOpen ? GW - 350 : GW,
                duration: 300,
                ease: 'Power2'
            });
            this.arrowText.setText(this.isPanelOpen ? ">" : "<");
            if (this.isPanelOpen) this.refreshStats(); 
        });
    }

    updateUI() {
        // Проверка на всякий случай, если сцена уже уничтожена
        if (!this.scene.isActive()) return;

        this.hpText.setText(`HP: ${GameState.currentHp}/${GameState.maxHp}`);
        this.goldText.setText(`GOLD: ${GameState.gold}`);
        this.floorText.setText(`Lvl: ${GameState.level}`);
        
        if (this.isPanelOpen) this.refreshStats();
    }

    refreshStats() {
        let totalStrength = 0;
        let totalThorns = 0;
        let startBlock = 0;

        GameState.relics.forEach(relicId => {
            const data = RELICS_DB[relicId];
            if (!data || !data.triggers) return;

            if (data.triggers.onBattleStart) {
                data.triggers.onBattleStart.forEach(action => {
                    if (action.type === 'apply_status' && action.status === 'strength') totalStrength += action.value;
                });
            }
            if (data.triggers.onTurnStart) {
                data.triggers.onTurnStart.forEach(action => {
                    if (action.type === 'apply_status' && action.status === 'thorns') totalThorns += action.value;
                    if (action.type === 'block') startBlock += action.value;
                });
            }
        });

        let text = "--- 📊 STATS ---\n";
        text += `Max HP: ${GameState.maxHp}\n`;
        if (totalStrength > 0) text += `Strength: +${totalStrength} (Start)\n`;
        if (totalThorns > 0)   text += `Thorns: +${totalThorns}\n`;
        if (startBlock > 0)    text += `Block/Turn: +${startBlock}\n`;
        if (totalStrength === 0 && totalThorns === 0 && startBlock === 0) text += "No passive bonuses.\n";

        text += "\n--- 🎒 INVENTORY ---\n";
        if (GameState.relics.length === 0) {
            text += "(Empty)\n";
        } else {
            const counts = {};
            GameState.relics.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
            for (const [key, count] of Object.entries(counts)) {
                const name = RELICS_DB[key] ? RELICS_DB[key].name : key;
                text += `• ${name} ${count > 1 ? '(x'+count+')' : ''}\n`;
            }
        }
        text += `\n--- 🃏 DECK (${GameState.deck.length}) ---\n`;
        this.statsContent.setText(text);
    }
}
