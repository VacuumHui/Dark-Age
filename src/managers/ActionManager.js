// Файл: src/managers/ActionManager.js

export const ACTIONS = {
    // 1. Урон + Эффект удара
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            target.takeDamage(action.value);
            // Запускаем искры!
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y);
        }
    },

    // 2. Блок + Эффект щита
    block: (scene, action, source, target) => {
        if (target && target.addShield) {
            target.addShield(action.value);
            // Запускаем вспышку!
            if (scene.effectManager) scene.effectManager.playBlock(target.x, target.y);
        }
    },

    // 3. Лечение + Эффект
    heal: (scene, action, source, target) => {
        if (target && target.heal) {
            target.heal(action.value);
            // Запускаем пузырьки!
            if (scene.effectManager) scene.effectManager.playHeal(target.x, target.y);
        }
    },

    // Лечение владельца (Вампиризм)
    heal_source: (scene, action, source, target) => {
        if (source && source.heal) {
            source.heal(action.value);
            if (scene.effectManager) scene.effectManager.playHeal(source.x, source.y);
        }
    },
    
    // Восстановление маны
    restore_mana: (scene, action, source, target) => {
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        scene.showFloatingText(source.x, source.y - 60, `+${action.value} Mana`, 0x00ffff);
    },

    // Добор карт
    draw: (scene, action, source, target) => {
        scene.drawCards(action.value);
        scene.showFloatingText(source.x, source.y - 80, `Draw +${action.value}`, 0xffffff);
    }
};

export function executeAction(scene, action, source, target) {
    const actionFunc = ACTIONS[action.type];
    if (actionFunc) {
        actionFunc(scene, action, source, target);
    } else {
        console.warn(`Неизвестное действие: ${action.type}`);
    }
}
