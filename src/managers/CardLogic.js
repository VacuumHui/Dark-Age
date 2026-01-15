// src/managers/CardLogic.js

import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js';

export function getComputedCard(cardInstance) {
    // 1. Берем базовые данные из базы (Копируем их, чтобы не испортить оригинал!)
    const baseData = CARDS_DB[cardInstance.id];
    
    // Глубокая копия объекта (хак через JSON), чтобы действия не ссылались на базу
    let finalCard = JSON.parse(JSON.stringify(baseData));

    // Если зачарований нет - возвращаем как есть
    if (!cardInstance.enchants || cardInstance.enchants.length === 0) {
        return finalCard;
    }

    // 2. Применяем зачарования
    cardInstance.enchants.forEach(enchantId => {
        const enchant = ENCHANTS_DB[enchantId];
        if (!enchant) return;

        // Вариант А: Изменение цифр (Урон, Блок, Стоимость)
        if (enchant.type === 'stat_modifier') {
            
            // Если меняем стоимость
            if (enchant.targetParam === 'cost') {
                finalCard.cost += enchant.value;
                if (finalCard.cost < 0) finalCard.cost = 0; // Не может быть меньше 0
            } 
            // Если меняем Урон или Блок (ищем нужное действие в массиве)
            else {
                finalCard.actions.forEach(action => {
                    if (action.type === enchant.targetParam) {
                        action.value += enchant.value;
                    }
                });
            }
        } 
        // Вариант Б: Добавление эффекта (Яд, Вампиризм)
        else if (enchant.type === 'add_action') {
            finalCard.actions.push(enchant.action);
        }
    });

    return finalCard;
}
