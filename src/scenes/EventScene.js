// src/scenes/EventScene.js

import { EVENTS_DB } from '../data/events.js';
import { GameState, createCardInstance } from '../GameState.js';

export class EventScene extends Phaser.Scene {
    constructor() { super({ key: 'EventScene' }); }

    create() {
        const GW = this.scale.width;
        const GH = this.scale.height;

        // Фон
        this.add.rectangle(0, 0, GW, GH, 0x112233).setOrigin(0);

        // Выбираем случайное событие
        const keys = Object.keys(EVENTS_DB);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const eventData = EVENTS_DB[randomKey];

        // --- ВИЗУАЛ ---
        // Картинка (эмодзи пока)
        this.add.text(GW/2, 150, eventData.image, { fontSize: '100px' }).setOrigin(0.5);
        
        // Заголовок
        this.add.text(GW/2, 250, eventData.title, { 
            fontSize: '40px', fontStyle: 'bold', color: '#ffcc00' 
        }).setOrigin(0.5);

        // Текст истории
        this.add.text(GW/2, 350, eventData.text, { 
            fontSize: '24px', color: '#ccc', align: 'center', wordWrap: { width: 800 } 
        }).setOrigin(0.5);

        // --- КНОПКИ ВЫБОРА ---
        let startY = 500;
        
        eventData.choices.forEach((choice, index) => {
            const btn = this.add.container(GW/2, startY + (index * 80));
            
            const bg = this.add.rectangle(0, 0, 600, 60, 0x333333).setStrokeStyle(2, 0xffffff).setInteractive();
            const text = this.add.text(0, 0, choice.text, { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
            
            btn.add([bg, text]);

            // Логика нажатия
            bg.on('pointerdown', () => {
                this.handleChoice(choice);
            });
            
            // Ховер
            bg.on('pointerover', () => bg.setFillStyle(0x555555));
            bg.on('pointerout', () => bg.setFillStyle(0x333333));
        });
    }

    handleChoice(choice) {
        // 1. Проверка на выход
        if (choice.action === 'leave') {
            this.scene.start('MapScene');
            return;
        }
        
        if (choice.action === 'fight') {
            this.scene.start('BattleScene'); // Начинаем бой с заглушкой
            return;
        }

        // 2. Бросок кубика (Шанс)
        const roll = Math.random();
        const success = roll <= choice.chance;

        if (success) {
            // УСПЕХ
            this.applyResult(choice.action, choice.success);
            alert("УСПЕХ!"); // Временная обратная связь
        } else {
            // НЕУДАЧА (Если есть штраф)
            if (choice.fail) {
                this.applyResult('fail_damage', choice.fail); // Пример
                alert("НЕУДАЧА! Вы получили урон.");
            } else {
                alert("Ничего не произошло.");
            }
        }

        // Возвращаемся на карту
        this.time.delayedCall(1000, () => this.scene.start('MapScene'));
    }

    applyResult(actionType, data) {
        // Простая логика эффектов (можно потом перенести в ActionManager)
        if (actionType === 'heal_full') {
            GameState.currentHp = GameState.maxHp;
        } 
        else if (actionType === 'get_potion') {
            // Добавляем карту "Зелье"
            GameState.deck.push(createCardInstance('heal_potion'));
        }
        else if (actionType === 'steal_gold' && data) {
            // Успешная кража (data = {type: 'gold', value: 50})
            if (data.type === 'gold') GameState.gold += data.value;
        }
        
        // Обработка провала
        if (data && data.type === 'damage') {
            GameState.currentHp -= data.value;
            if (GameState.currentHp < 1) GameState.currentHp = 1; // Не убиваем в эвенте пока что
        }
    }
}
