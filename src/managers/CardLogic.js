// Файл: src/managers/CardLogic.js

import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js';

export function getComputedCard(cardInstance) {
    // 1. Берем шаблон из базы
    const baseData = CARDS_DB[cardInstance.id];
    
    if (!baseData) {
        console.error(`Card ID "${cardInstance.id}" not found in DB!`);
        return null;
    }

    // 2. Делаем ПОЛНУЮ КОПИЮ данных (чтобы не испортить базу)
    // Это гарантирует, что мы работаем с уникальным набором действий
    let finalCard = JSON.parse(JSON.stringify(baseData));

    // Если зачарований нет - отдаем чистую копию
    if (!cardInstance.enchants || cardInstance.enchants.length === 0) {
        return finalCard;
    }

    // 3. Применяем каждое зачарование по очереди
    cardInstance.enchants.forEach(enchantId => {
        const enchant = ENCHANTS_DB[enchantId];
        if (!enchant) return;

        // ТИП А: Изменение цифр (Урон, Блок, Стоимость)
        if (enchant.type === 'stat_modifier') {
            
            // Снижение стоимости
            if (enchant.targetParam === 'cost') {
                finalCard.cost += enchant.value;
                if (finalCard.cost < 0) finalCard.cost = 0;
            } 
            // Увеличение Урона или Блока
            else {
                // Ищем действие в массиве (например, 'damage') и меняем его value
                const actionToMod = finalCard.actions.find(a => a.type === enchant.targetParam);
                if (actionToMod) {
                    actionToMod.value += enchant.value;
                }
            }
        } 
        
        // ТИП Б: Добавление НОВОГО действия (Хил, Яд)
        else if (enchant.type === 'add_action') {
            // Создаем копию действия из зачарования
            const newAction = JSON.parse(JSON.stringify(enchant.action));
            finalCard.actions.push(newAction);
        }
    });

    return finalCard;
}
