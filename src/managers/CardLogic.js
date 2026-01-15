// Файл: src/managers/CardLogic.js

import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js';

// Словарь: как переводить код действия в текст
const ACTION_TEXTS = {
    damage: (val) => `Урон: ${val}`,
    block: (val) => `Блок: ${val}`,
    heal: (val) => `Хил: ${val}`,
    heal_owner: (val) => `Вампиризм: ${val}`,
    restore_mana: (val) => `Мана: +${val}`,
    draw: (val) => `Добор: ${val}`,
    increase_max_hp: (val) => `Макс ХП: +${val}`,
    
    // Для статусов нужна доп. логика имен
    apply_status: (val, status) => {
        const names = {
            poison: "Яд",
            weak: "Слабость",
            vulnerable: "Уязвимость",
            strength: "Сила",
            thorns: "Шипы",
            rage: "Ярость"
        };
        return `${names[status] || status}: ${val}`;
    }
};

export function getComputedCard(cardInstance) {
    // 1. Берем базу
    const baseData = CARDS_DB[cardInstance.id];
    if (!baseData) return null;

    // 2. Глубокая копия (чтобы не портить базу)
    let finalCard = JSON.parse(JSON.stringify(baseData));

    // 3. ПРИМЕНЯЕМ ЗАЧАРОВАНИЯ
    if (cardInstance.enchants && cardInstance.enchants.length > 0) {
        cardInstance.enchants.forEach(enchantId => {
            const enchant = ENCHANTS_DB[enchantId];
            if (!enchant) return;

            // Изменение цифр
            if (enchant.type === 'stat_modifier') {
                if (enchant.targetParam === 'cost') {
                    finalCard.cost += enchant.value;
                    if (finalCard.cost < 0) finalCard.cost = 0;
                } else {
                    // Ищем действие и меняем его значение
                    const action = finalCard.actions.find(a => a.type === enchant.targetParam);
                    if (action) action.value += enchant.value;
                }
            } 
            // Добавление новых действий
            else if (enchant.type === 'add_action') {
                // Копируем действие из зачарования и добавляем в список
                finalCard.actions.push(JSON.parse(JSON.stringify(enchant.action)));
            }
        });
    }

    // 4. ГЕНЕРАЦИЯ ОПИСАНИЯ (Dynamic Description)
    // Мы полностью игнорируем текст из базы (desc) и собираем его заново по фактам.
    
    let descriptionLines = [];

    if (finalCard.actions) {
        finalCard.actions.forEach(action => {
            let textGenerator = ACTION_TEXTS[action.type];
            if (textGenerator) {
                // Если это статус, передаем еще и имя статуса
                if (action.type === 'apply_status') {
                    descriptionLines.push(textGenerator(action.value, action.status));
                } else {
                    descriptionLines.push(textGenerator(action.value));
                }
            }
        });
    }

    // Сохраняем сгенерированный текст в объект
    finalCard.generatedDesc = descriptionLines.join("\n");

    return finalCard;
}
