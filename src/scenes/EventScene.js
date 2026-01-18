// Файл: src/scenes/EventScene.js

import { EVENTS_DB } from '../data/events.js';
import { GameState, createCardInstance } from '../GameState.js';

export class EventScene extends Phaser.Scene {
    constructor() { super({ key: 'EventScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // 1. Запуск глобального UI (чтобы видеть здоровье/золото)
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        this.game.events.emit('UPDATE_UI');

        // Фон
        this.add.rectangle(0, 0, GW, GH, 0x112233).setOrigin(0);

        // Выбираем случайное событие
        const keys = Object.keys(EVENTS_DB);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const eventData = EVENTS_DB[randomKey];

        // --- ВИЗУАЛ ---
        // Картинка
        this.add.text(GW/2, 180, eventData.image, { fontSize: '120px' }).setOrigin(0.5);
        
        // Заголовок
        this.add.text(GW/2, 300, eventData.title, { 
            fontSize: '50px', fontStyle: 'bold', color: '#ffcc00', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        // Текст истории
        this.add.text(GW/2, 400, eventData.text, { 
            fontSize: '28px', color: '#ccc', align: 'center', wordWrap: { width: 800 } 
        }).setOrigin(0.5, 0);

        // --- КНОПКИ ВЫБОРА ---
        const startY = 550;
        
        eventData.choices.forEach((choice, index) => {
            const btn = this.add.container(GW/2, startY + (index * 100));
            
            const bg = this.add.rectangle(0, 0, 800, 80, 0x222222).setStrokeStyle(3, 0xffffff).setInteractive();
            const text = this.add.text(0, 0, choice.text, { fontSize: '26px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
            
            btn.add([bg, text]);

            // Логика нажатия
            bg.on('pointerdown', () => {
                this.handleChoice(choice);
            });
            
            // Ховер (для ПК, но не мешает на телефоне)
            bg.on('pointerover', () => { bg.setFillStyle(0x444444); this.input.setDefaultCursor('pointer'); });
            bg.on('pointerout', () => { bg.setFillStyle(0x222222); this.input.setDefaultCursor('default'); });
        });
    }

    handleChoice(choice) {
        // Блокируем ввод, чтобы нельзя было нажать дважды
        this.input.enabled = false;

        // 1. Проверка на выход или бой
        if (choice.action === 'leave') {
            this.scene.start('MapScene');
            return;
        }
        
        if (choice.action === 'fight') {
            this.scene.start('BattleScene');
            return;
        }

        // 2. Бросок кубика (Шанс)
        const roll = Math.random();
        const success = roll <= choice.chance;

        let message = "";
        let color = "#ffffff";

        if (success) {
            // УСПЕХ
            this.applyResult(choice.action, choice.success);
            message = "SUCCESS!";
            color = "#00ff00";
        } else {
            // НЕУДАЧА
            if (choice.fail) {
                this.applyResult('fail_damage', choice.fail);
                message = "FAILURE!\n(Took Damage)";
                color = "#ff0000";
            } else {
                message = "NOTHING HAPPENED...";
                color = "#aaaaaa";
            }
        }
        
        // Обновляем UI (если изменилось ХП или золото)
        this.game.events.emit('UPDATE_UI');

        // 3. ПОКАЗЫВАЕМ РЕЗУЛЬТАТ (ВМЕСТО ALERT)
        this.showFeedback(message, color);
    }

    showFeedback(text, colorStr) {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // Затемнение всего экрана (блокирует нажатия)
        this.add.rectangle(0, 0, GW, GH, 0x000000, 0.8).setOrigin(0).setDepth(100);

        // Рамка сообщения
        const bg = this.add.rectangle(GW/2, GH/2, 500, 200, 0x000000)
            .setStrokeStyle(4, 0xffffff)
            .setDepth(101);

        // Текст
        this.add.text(GW/2, GH/2, text, {
            fontSize: '40px',
            fontStyle: 'bold',
            color: colorStr,
            align: 'center',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(102);

        // Ждем 1.5 секунды и уходим на карту
        this.time.delayedCall(1500, () => {
            this.input.enabled = true; // Разблокируем ввод (для следующей сцены)
            this.scene.start('MapScene');
        });
    }

    applyResult(actionType, data) {
        if (actionType === 'heal_full') {
            GameState.currentHp = GameState.maxHp;
        } 
        else if (actionType === 'get_potion') {
            GameState.deck.push(createCardInstance('heal_potion'));
        }
        else if (actionType === 'steal_gold' && data) {
            if (data.type === 'gold') GameState.gold += data.value;
        }
        
        // Обработка провала (урон)
        if (data && data.type === 'damage') {
            GameState.currentHp -= data.value;
            if (GameState.currentHp < 1) GameState.currentHp = 1; // Оставляем 1 ХП, чтобы не убить в ивенте
        }
    }
}
