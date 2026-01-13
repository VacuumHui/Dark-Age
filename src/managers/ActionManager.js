// Файл: src/managers/ActionManager.js

export const ACTIONS = {
    // --- БОЕВЫЕ ДЕЙСТВИЯ ---

    // Нанесение урона
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            // Расчет через StatusManager (если он есть)
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }

            target.takeDamage(dmg);
            
            // Эффект удара
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y);
        }
    },

    // Наложение статуса (Яд, Сила и т.д.)
    apply_status: (scene, action, source, target) => {
        if (scene.statusManager) {
            scene.statusManager.applyStatus(target, action.status, action.value);
        }
    },

    // Блок (Щит)
    block: (scene, action, source, target) => {
        if (target && target.addShield) {
            target.addShield(action.value);
            if (scene.effectManager) scene.effectManager.playBlock(target.x, target.y);
        }
    },

    // Лечение
    heal: (scene, action, source, target) => {
        if (target && target.heal) {
            target.heal(action.value);
            if (scene.effectManager) scene.effectManager.playHeal(target.x, target.y);
        }
    },

    // Лечение владельца (для вампиризма)
    heal_source: (scene, action, source, target) => {
        if (source && source.heal) {
            source.heal(action.value);
            if (scene.effectManager) scene.effectManager.playHeal(source.x, source.y);
        }
    },

    // --- РЕСУРСЫ ---

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
    },

    // --- НОВОЕ: ДЛЯ РЕЛИКВИЙ ---
    
    // Увеличение Максимального ХП (например, для Клубники)
    increase_max_hp: (scene, action, source, target) => {
        if (target) {
            target.maxHp += action.value;
            target.hp += action.value; // Увеличиваем и текущее здоровье тоже
            target.updateUI();
            
            scene.showFloatingText(target.x, target.y - 60, `Max HP +${action.value}`, 0x00ff00);
        }
    }
};

// Функция запуска
export function executeAction(scene, action, source, target) {
    const actionFunc = ACTIONS[action.type];
    
    if (actionFunc) {
        actionFunc(scene, action, source, target);
    } else {
        console.warn(`ActionManager: Неизвестный тип действия "${action.type}"`);
    }
}
