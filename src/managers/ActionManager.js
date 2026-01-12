// src/managers/ActionManager.js

export const ACTIONS = {
    // 1. Нанесение урона
    damage: (scene, source, target, value) => {
        // Тут можно будет позже добавить проверку на 'Силу' или 'Уязвимость'
        target.takeDamage(value);
    },

    // 2. Блок / Щит
    block: (scene, source, target, value) => {
        target.addShield(value);
    },

    // 3. Лечение
    heal: (scene, source, target, value) => {
        target.heal(value);
    },

    // 4. Лечение владельца (для Вампиризма)
    heal_owner: (scene, source, target, value) => {
        source.heal(value);
    },

    // 5. Восстановление маны
    restore_mana: (scene, source, target, value) => {
        scene.mana += value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        scene.showFloatingText(source.x, source.y - 60, `+${value} Mana`, 0x00ffff);
    },

    // --- НОВЫЕ МЕХАНИКИ (Легко добавлять!) ---

    // 6. Добор карт (Draw Cards)
    draw: (scene, source, target, value) => {
        scene.drawCards(value);
        scene.showFloatingText(source.x, source.y - 80, `Draw +${value}`, 0xffffff);
    },

    // 7. Урон самому себе (Sacrifice)
    self_damage: (scene, source, target, value) => {
        source.takeDamage(value);
    }
};

// Главная функция, которая запускает действие
export function executeAction(scene, action, source, target) {
    const actionFunc = ACTIONS[action.type];
    
    if (actionFunc) {
        actionFunc(scene, source, target, action.value);
    } else {
        console.warn(`Неизвестный тип действия: ${action.type}`);
    }
}
