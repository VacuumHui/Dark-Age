// Файл: src/managers/CardLogic.js

import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js';

export function getComputedCard(cardInstance) {
    const baseData = CARDS_DB[cardInstance.id];
    if (!baseData) return null;

    // Копируем базу
    let finalCard = JSON.parse(JSON.stringify(baseData));
    
    // Сюда будем собирать текст добавок
    let bonusDescriptions = [];

    if (cardInstance.enchants && cardInstance.enchants.length > 0) {
        cardInstance.enchants.forEach(enchantId => {
            const enchant = ENCHANTS_DB[enchantId];
            if (!enchant) return;

            // Добавляем описание зачарования в список бонусов
            // Пример: "+3 Урона" или "Дает 3 Блока"
            bonusDescriptions.push(`[+] ${enchant.desc}`);

            // Применяем логику (цифры)
            if (enchant.type === 'stat_modifier') {
                if (enchant.targetParam === 'cost') {
                    finalCard.cost += enchant.value;
                    if (finalCard.cost < 0) finalCard.cost = 0;
                } else {
                    const action = finalCard.actions.find(a => a.type === enchant.targetParam);
                    if (action) action.value += enchant.value;
                }
            } 
            else if (enchant.type === 'add_action') {
                finalCard.actions.push(JSON.parse(JSON.stringify(enchant.action)));
            }
        });
    }

    // ФОРМИРУЕМ ИТОГОВЫЙ ТЕКСТ
    // Сначала база, потом бонусы с новой строки
    finalCard.generatedDesc = baseData.desc;
    
    if (bonusDescriptions.length > 0) {
        finalCard.generatedDesc += "\n" + bonusDescriptions.join("\n");
    }

    return finalCard;
}
