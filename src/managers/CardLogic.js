// Файл: src/managers/CardLogic.js
import { CARDS_DB } from '../data/cards.js';
import { ENCHANTS_DB } from '../data/enchants.js';
import { GameState } from '../GameState.js'; // Нам нужен стейт для ХП вне боя

export function getComputedCard(cardInstance, player = null) {
    const baseData = CARDS_DB[cardInstance.id];
    if (!baseData) return null;

    // Копируем базу
    let finalCard = JSON.parse(JSON.stringify(baseData));
    
    // --- 1. ПРИМЕНЯЕМ ЗАЧАРОВАНИЯ ---
    let bonusDescriptions = [];
    if (cardInstance.enchants && cardInstance.enchants.length > 0) {
        cardInstance.enchants.forEach(enchantId => {
            const enchant = ENCHANTS_DB[enchantId];
            if (!enchant) return;
            bonusDescriptions.push(`[+] ${enchant.desc}`);

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

    // --- 2. ДИНАМИЧЕСКОЕ ОПИСАНИЕ (Зависит от Игрока) ---
    // Формируем базовое описание
    finalCard.generatedDesc = finalCard.desc;
    // Это поле для цвета текста на мини-карте
    finalCard.dynamicColor = '#ffffff'; 

    // Берем ХП и Щит из Игрока (в бою) или из GameState (на карте/в магазине)
    const currentHp = player ? player.hp : GameState.currentHp;
    const maxHp = player ? player.maxHp : GameState.maxHp;
    const shield = player ? player.shield : 0;

    // Проверяем спец. формулы
    if (finalCard.actions) {
        finalCard.actions.forEach(action => {
            
            // УДАР ЩИТОМ
            if (action.type === 'dmg_from_block') {
                finalCard.generatedDesc = `Урон: ${shield}\n(От Щита)`;
                if (shield > 0) finalCard.dynamicColor = '#00ffff'; // Голубой, если есть урон
            }
            
            // ОТЧАЯНИЕ
            else if (action.type === 'dynamic_dmg' && action.formula === 'despair') {
                const hpPercent = currentHp / maxHp;
                let dmg = 2;
                if (hpPercent <= 0.1) {
                    dmg = 15;
                    finalCard.dynamicColor = '#ff00ff'; // Фиолетовый (Критически мало ХП)
                } 
                else if (hpPercent <= 0.5) {
                    dmg = 10;
                    finalCard.dynamicColor = '#0088ff'; // Синий (Мало ХП)
                }
                finalCard.generatedDesc = `${dmg} Урона\n(Зависит от ХП)`;
            }
            
            // БАГРОВОЕ ЛЕЗВИЕ
            else if (action.type === 'dynamic_dmg' && action.formula === 'red_blade') {
                const missingHp = maxHp - currentHp;
                const dmg = Math.floor(missingHp * 0.25);
                finalCard.generatedDesc = `Урон: ${dmg}\n(25% от потерь)`;
                if (dmg > 5) finalCard.dynamicColor = '#ff4444'; // Красный, если бьет больно
            }
        });
    }

    // --- 3. СБОРКА ТЕКСТА ---
    if (bonusDescriptions.length > 0) {
        finalCard.generatedDesc += "\n" + bonusDescriptions.join("\n");
    }

    return finalCard;
}
