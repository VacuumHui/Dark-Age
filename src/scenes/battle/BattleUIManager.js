// Файл: src/scenes/battle/BattleUIManager.js

import { Card } from '../../prefabs/Card.js';
import { RELICS_DB } from '../../data/relics.js';
import { GameState } from '../../GameState.js';

export class BattleUIManager {
    constructor(scene) {
        this.scene = scene;
        this.manaText = null;
        this.deckText = null;
        this.discardText = null;
        this.endTurnBtn = null;
        this.trashZone = null;
        
        // Контейнер для просмотра колоды
        this.deckContainer = null;
    }

    createHUD(GW, GH) {
        const PADDING = 50; 

        // Мана
        this.manaText = this.scene.add.text(PADDING, GH - 60, `Mana: 0/0`, { 
            fontSize: '32px', color: '#00ffff', fontStyle: 'bold' 
        }).setDepth(10);
        
        // Кнопка Конец Хода
        this.endTurnBtn = this.scene.add.rectangle(GW - 120, GH - 160, 160, 60, 0xd04040)
            .setInteractive().setDepth(10).setStrokeStyle(2, 0xffffff);
        this.scene.add.text(GW - 120, GH - 160, "END TURN", { fontSize: '22px', fontStyle: 'bold' })
            .setOrigin(0.5).setDepth(10);
        
        this.endTurnBtn.on('pointerdown', () => this.scene.endTurn());

        // Мусорка
        this.trashZone = this.scene.add.zone(GW - 80, GH - 60, 110, 110).setRectangleDropZone(110, 110);
        this.trashZone.name = "discard_zone";
        const trashG = this.scene.add.graphics().lineStyle(2, 0x666666);
        trashG.strokeRect(this.trashZone.x - 55, this.trashZone.y - 55, 110, 110);
        this.scene.add.text(this.trashZone.x, this.trashZone.y, "TRASH", { fontSize: '14px', color: '#666' }).setOrigin(0.5);
        
        // Кнопка Колоды
        const deckBtnX = PADDING + 40; 
        const deckBtnY = GH - 120;
        const deckBtn = this.scene.add.rectangle(deckBtnX, deckBtnY, 140, 40, 0x333333)
            .setInteractive().setStrokeStyle(2, 0x888888);
        this.deckText = this.scene.add.text(deckBtnX, deckBtnY, `Deck: 0`, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        
        deckBtn.on('pointerdown', () => this.scene.openDeckView());

        // Сброс
        this.discardText = this.scene.add.text(GW - 80, GH - 110, `0`, { fontSize: '18px', color: '#aaa' }).setOrigin(0.5);
    }

    createRelicUI() {
        const startX = 50; const startY = 80; const gap = 50;    
        GameState.relics.forEach((relicId, index) => {
            const data = RELICS_DB[relicId]; if (!data) return;
            const x = startX + (index * gap);
            this.scene.add.rectangle(x, startY, 40, 40, 0x222222).setStrokeStyle(2, 0x666666);
            const icon = this.scene.add.text(x, startY, data.icon, { fontSize: '26px' }).setOrigin(0.5);
            icon.setInteractive();
            icon.on('pointerdown', () => {
                this.showFloatingText(x, startY + 50, data.desc, 0xffffff);
            });
        });
    }

    // --- ПРОСМОТР КОЛОДЫ (ИСПРАВЛЕНО) ---
    openDeckView() {
        const GW = this.scene.scale.width;
        const GH = this.scene.scale.height;

        if (!this.deckContainer) {
            // Используем this.scene.add
            this.deckContainer = this.scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
        }
        
        this.deckContainer.removeAll(true);
        this.deckContainer.setVisible(true);
        
        // Включаем затемнение
        if (this.scene.dimmer) {
            this.scene.dimmer.setDepth(2999).setVisible(true);
        }

        const title = this.scene.add.text(GW/2, 50, `FULL DECK (${GameState.deck.length})`, { 
            fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);
        this.deckContainer.add(title);

        const startX = 150; const startY = 250; const gapX = 120; const gapY = 230;
        const cardsPerRow = Math.floor((GW - 200) / gapX);

        const sortedDeck = [...GameState.deck].sort((a, b) => a.id.localeCompare(b.id)); 

        sortedDeck.forEach((cardInstance, index) => {
            const col = index % cardsPerRow;
            const row = Math.floor(index / cardsPerRow);
            const x = startX + (col * gapX);
            const y = startY + (row * gapY);

            const card = new Card(this.scene, x, y, cardInstance);
            this.scene.input.setDraggable(card.bg, false); 
            this.deckContainer.add(card);
        });

        // --- ВОТ ЗДЕСЬ БЫЛА ОШИБКА ---
        // Было: this.add.rectangle (Ошибка!)
        // Стало: this.scene.add.rectangle (Правильно!)
        
        const closeBtnBg = this.scene.add.rectangle(GW/2, GH - 80, 200, 60, 0x990000)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive();

        const closeBtnText = this.scene.add.text(GW/2, GH - 80, "CLOSE", { 
            fontSize: '24px', fontStyle: 'bold', color: '#ffffff' 
        }).setOrigin(0.5);

        closeBtnBg.on('pointerover', () => closeBtnBg.setScale(1.05));
        closeBtnBg.on('pointerout', () => closeBtnBg.setScale(1));
        
        // Кнопка закрытия вызывает метод закрытия
        closeBtnBg.on('pointerdown', () => this.closeDeckView());

        this.deckContainer.add([closeBtnBg, closeBtnText]);
    }

    closeDeckView() {
        if (this.deckContainer) {
            this.deckContainer.setVisible(false);
        }
        if (this.scene.dimmer) {
            this.scene.dimmer.setVisible(false);
        }
        this.scene.unzoomCard();
    }

    // --- ОБНОВЛЕНИЕ ЗНАЧЕНИЙ ---
    updateMana(current, max) { if (this.manaText) this.manaText.setText(`${current}/${max}`); }
    updateDeckCount(draw, discard) {
        if (this.deckText) this.deckText.setText(`Deck: ${draw}`);
        if (this.discardText) this.discardText.setText(`${discard}`);
    }

    showFloatingText(x, y, message, color) {
        const randomX = x + (Math.random() * 40 - 20);
        const txt = this.scene.add.text(randomX, y, message, { 
            fontSize: '28px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5).setDepth(2000);
        txt.setTint(color);
        this.scene.tweens.add({ targets: txt, y: y - 100, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => txt.destroy() });
    }

    showDefeatScreen(onRestart) {
        const GW = this.scene.scale.width;
        const GH = this.scene.scale.height;

        this.scene.cameras.main.flash(500, 255, 0, 0);
        this.scene.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.8).setDepth(2000);
        this.scene.add.text(GW/2, GH/2 - 60, "YOU DIED", { fontSize: '80px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(2001);
        
        const btn = this.scene.add.rectangle(GW/2, GH/2 + 60, 300, 70, 0xffffff).setInteractive().setDepth(2001);
        this.scene.add.text(GW/2, GH/2 + 60, "RETURN TO MENU", { fontSize: '28px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
        
        btn.on('pointerdown', onRestart);
    }

    showVictoryScreen(rewardKeys, onCardSelect, onSkip) {
        const GW = this.scene.scale.width;
        const GH = this.scene.scale.height;

        this.scene.add.rectangle(GW/2, GH/2, GW, GH, 0x000000, 0.9).setDepth(2000).setInteractive();
        this.scene.add.text(GW/2, 100, "VICTORY! CHOOSE A CARD:", { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);

        rewardKeys.forEach((cardKey, index) => {
            const xOffset = (index - 1) * 200;
            const tempInstance = { id: cardKey, uid: Math.random(), enchants: [] };
            const card = new Card(this.scene, GW/2 + xOffset, GH/2 + 50, tempInstance);
            card.setDepth(2002);
            this.scene.add.existing(card);
            card.bg.setInteractive();
            card.bg.on('pointerdown', () => onCardSelect(cardKey));
            card.bg.removeAllListeners('pointerup');
        });
        
        const skipBtn = this.scene.add.text(GW/2, GH - 100, "[ Skip Reward ]", { fontSize: '20px', color: '#666' })
            .setOrigin(0.5).setDepth(2001).setInteractive();
        skipBtn.on('pointerdown', onSkip);
    }

    showActClearScreen(actNumber, onNextAct) {
        const GW = this.scene.scale.width;
        const GH = this.scene.scale.height;
        this.scene.add.rectangle(GW/2, GH/2, GW, GH, 0x110000, 0.95).setDepth(3000).setInteractive();
        this.scene.add.text(GW/2, GH/2 - 100, `ACT ${actNumber} CLEARED!`, { fontSize: '60px', fontStyle: 'bold', color: '#ffaa00', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(3001);
        const nextBtn = this.scene.add.text(GW/2, GH/2 + 50, "[ ENTER NEXT ACT ]", { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3001).setInteractive();
        nextBtn.on('pointerdown', onNextAct);
    }
            // --- ОБНОВЛЕННЫЙ МЕТОД: ИНФО О ЮНИТЕ (RU, Compact, Animated) ---
    showUnitInfo(unit) {
        const GW = this.scene.scale.width;
        const GH = this.scene.scale.height;

        // 1. Убираем старое окно, если есть
        if (this.infoPanel) {
             this.infoPanel.destroy();
             this.infoPanel = null;
        }
        
        // 2. Рассчитываем позицию "РЯДОМ" с юнитом
        // По умолчанию ставим справа сверху от врага
        let popX = unit.x + 160;
        let popY = unit.y - 50;

        // Если враг слишком близко к правому краю, показываем окно СЛЕВА
        if (popX + 150 > GW) {
            popX = unit.x - 160;
        }
        // Если слишком высоко
        if (popY - 150 < 0) {
            popY = 180;
        }

        // 3. Создаем контейнер
        const panel = this.scene.add.container(popX, popY).setDepth(4001);
        this.infoPanel = panel;

        // 4. Прозрачная подложка на весь экран (чтобы закрыть кликом в любое место)
        const clickCloser = this.scene.add.rectangle(-popX, -popY, GW * 2, GH * 2, 0x000000, 0.01)
            .setInteractive().setOrigin(0);
        
        clickCloser.on('pointerdown', () => {
            // Анимация закрытия
            this.scene.tweens.add({
                targets: panel, scale: 0, alpha: 0, duration: 150, ease: 'Back.in',
                onComplete: () => panel.destroy()
            });
            this.infoPanel = null;
        });
        panel.add(clickCloser); // Добавляем первым, чтобы лежал "под" окном

        // 5. ФОН ОКНА (Компактный)
        const w = 320;
        const h = 340;
        const bg = this.scene.add.rectangle(0, 0, w, h, 0x1a1a1a)
            .setStrokeStyle(3, unit.color || 0xffffff);
        
        // Тень для красоты
        const shadow = this.scene.add.rectangle(10, 10, w, h, 0x000000, 0.5);

        // --- ЗАГОЛОВОК ---
        const title = this.scene.add.text(0, -140, unit.name.toUpperCase(), { 
            fontSize: '22px', fontStyle: 'bold', color: '#ffffff' 
        }).setOrigin(0.5);

        // Полоса разделитель
        const line = this.scene.add.rectangle(0, -120, w - 40, 2, 0x555555);

        // --- ХАРАКТЕРИСТИКИ ---
        const statsText = this.scene.add.text(0, -90, `ЗДОРОВЬЕ: ${unit.hp}/${unit.maxHp}\nЩИТ: ${unit.shield}`, {
            fontSize: '18px', color: '#00ffff', align: 'center', lineSpacing: 5
        }).setOrigin(0.5);

        // --- НАМЕРЕНИЕ (INTENT) ---
        let intentDesc = "Думает...";
        let intentColor = '#aaaaaa';

        if (unit.currentIntent && unit.currentIntent.actions) {
            const act = unit.currentIntent.actions[0];
            
            if (act.type === 'damage') {
                intentColor = '#ff5555';
                let val = act.value; 
                let info = `База: ${val}`;
                
                // Математика
                if (unit.difficultyMultiplier > 1) {
                    val = Math.floor(val * unit.difficultyMultiplier);
                    info += `\n+ Этаж: ${val}`;
                }
                if (unit.statuses['strength']) {
                    val += unit.statuses['strength'];
                    info += `\n+ Сила: ${val}`;
                }
                if (unit.statuses['weak']) {
                    val = Math.floor(val * 0.75);
                    info += `\n- Слабость (x0.75)`;
                }
                
                intentDesc = `${info}\n-----------------\nИТОГ: ${val} УРОНА`;
            } 
            else if (act.type === 'block') {
                intentColor = '#55ffff';
                intentDesc = `Намерение: ЗАЩИТА\nПолучит +${act.value} Щита`;
            }
            else if (act.type === 'apply_status') {
                intentColor = '#ffff55';
                const statusName = this.getStatusNameRU(act.status);
                intentDesc = `Намерение: ЭФФЕКТ\nНакладывает "${statusName}"`;
            }
        }

        const intentObj = this.scene.add.text(0, 0, intentDesc, {
            fontSize: '16px', color: intentColor, align: 'center', fontStyle: 'bold', wordWrap: { width: w - 40 }
        }).setOrigin(0.5);

        // --- СТАТУСЫ ---
        let statusList = "";
        const ruDesc = {
            'strength': "Сила: +Урон",
            'weak': "Слабость: -25% Урона",
            'vulnerable': "Уязвимость: +50% Входящего урона",
            'poison': "Яд: Урон каждый ход",
            'thorns': "Шипы: Возврат урона",
            'rage': "Ярость: Бьют -> Растет Сила",
            'freeze': "Заморозка: Может пропустить ход"
        };

        if (Object.keys(unit.statuses).length > 0) {
            statusList = "--- ЭФФЕКТЫ ---\n";
            for (const [stat, val] of Object.entries(unit.statuses)) {
                const desc = ruDesc[stat] || stat;
                statusList += `${desc} (${val})\n`;
            }
        } else {
            statusList = "(Нет эффектов)";
        }

        const statusObj = this.scene.add.text(0, 110, statusList, {
            fontSize: '14px', color: '#cccccc', align: 'center', lineSpacing: 4
        }).setOrigin(0.5);

        // Собираем всё вместе
        panel.add([shadow, bg, title, line, statsText, intentObj, statusObj]);

        // 6. АНИМАЦИЯ ПОЯВЛЕНИЯ (POP-UP)
        panel.setScale(0);
        panel.setAlpha(0);
        this.scene.tweens.add({
            targets: panel,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.out' // Эффект пружины
        });
    }

    // Вспомогательный метод для перевода названий (можно добавить внутрь класса)
    getStatusNameRU(key) {
        const map = {
            'strength': 'Сила', 'weak': 'Слабость', 'vulnerable': 'Уязвимость',
            'poison': 'Яд', 'thorns': 'Шипы', 'block': 'Щит'
        };
        return map[key] || key.toUpperCase();
    }
    
}
