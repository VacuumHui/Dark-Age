// src/scenes/UIScene.js

import { GameState } from '../GameState.js';

export class UIScene extends Phaser.Scene {
    constructor() { super({ key: 'UIScene' }); }

    create() {
        const GW = this.scale.width;
        
        // --- ВЕРХНЯЯ ПАНЕЛЬ (HUD) ---
        // Фон панели (полупрозрачный)
        this.add.rectangle(0, 0, GW, 60, 0x000000, 0.8).setOrigin(0);

        // 1. Здоровье (Слева)
        this.hpText = this.add.text(20, 20, "HP: 50/50", { 
            fontSize: '24px', fontStyle: 'bold', color: '#ff4444' 
        });

        // 2. Золото (По центру)
        this.goldText = this.add.text(GW / 2, 20, "GOLD: 0", { 
            fontSize: '24px', fontStyle: 'bold', color: '#ffd700' 
        }).setOrigin(0.5, 0);

        // 3. Этаж (Справа)
        this.floorText = this.add.text(GW - 80, 20, "Lvl: 1", { 
            fontSize: '24px', color: '#aaaaaa' 
        }).setOrigin(1, 0);

        // --- ВЫДВИЖНАЯ ПАНЕЛЬ СТАТОВ (SLIDER) ---
        this.createStatsPanel(GW);

        // ПОДПИСКА НА СОБЫТИЯ
        // Другие сцены будут кричать "UPDATE_UI", а эта сцена будет обновляться
        this.game.events.on('UPDATE_UI', this.updateUI, this);
        
        // Первичное обновление
        this.updateUI();
    }

    createStatsPanel(GW) {
        // Контейнер панели (находится за правой границей экрана)
        this.statsPanel = this.add.container(GW, 0);
        
        // Фон шторки (на всю высоту)
        const bg = this.add.rectangle(0, 0, 300, this.scale.height, 0x111111, 0.95)
            .setOrigin(0).setStrokeStyle(2, 0x444444);
        
        // Заголовок
        const title = this.add.text(150, 40, "HERO STATS", { fontSize: '28px', color: '#fff' }).setOrigin(0.5);
        
        // Текст статов (будем менять его содержимое)
        this.statsContent = this.add.text(20, 90, "", { 
            fontSize: '20px', color: '#ccc', lineSpacing: 10 
        });

        // КНОПКА ОТКРЫТИЯ/ЗАКРЫТИЯ [<]
        this.toggleBtn = this.add.container(-40, 100); // Торчит слева от панели
        const btnBg = this.add.rectangle(0, 0, 40, 80, 0x333333).setOrigin(0).setStrokeStyle(1, 0x666666).setInteractive();
        this.arrowText = this.add.text(20, 40, "<", { fontSize: '24px' }).setOrigin(0.5);
        
        this.toggleBtn.add([btnBg, this.arrowText]);
        
        this.statsPanel.add([bg, title, this.statsContent, this.toggleBtn]);

        // Логика анимации
        this.isPanelOpen = false;
        
        btnBg.on('pointerdown', () => {
            this.isPanelOpen = !this.isPanelOpen;
            
            this.tweens.add({
                targets: this.statsPanel,
                x: this.isPanelOpen ? GW - 300 : GW, // Выезжаем или прячемся
                duration: 300,
                ease: 'Power2'
            });
            
            this.arrowText.setText(this.isPanelOpen ? ">" : "<");
            if (this.isPanelOpen) this.refreshStats(); // Обновляем данные при открытии
        });
    }

    updateUI() {
        this.hpText.setText(`HP: ${GameState.currentHp}/${GameState.maxHp}`);
        this.goldText.setText(`GOLD: ${GameState.gold}`);
        this.floorText.setText(`Lvl: ${GameState.level}`);
        
        if (this.isPanelOpen) this.refreshStats();
    }

    refreshStats() {
        // Здесь мы собираем инфу о герое
        // Пока у нас есть только Реликвии и базовые статы.
        // В будущем сюда добавим данные из StatusManager (Сила, Ловкость).
        
        let text = "";
        
        // 1. Реликвии
        text += "--- RELICS ---\n";
        if (GameState.relics.length === 0) text += "None\n";
        GameState.relics.forEach(r => {
            text += `• ${r}\n`; // Можно сделать красивые названия
        });
        
        text += "\n--- DECK ---\n";
        text += `Total Cards: ${GameState.deck.length}\n`;
        
        // Тут можно добавить вывод Силы, если она глобальная
        // text += `Strength: ${GameState.baseStrength || 0}\n`;

        this.statsContent.setText(text);
    }
}
