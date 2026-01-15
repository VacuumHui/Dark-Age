// Файл: src/managers/ActionManager.js

export const ACTIONS = {
    // --- БОЕВЫЕ ДЕЙСТВИЯ ---

    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
            target.takeDamage(dmg);
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y);
        }
    },

    block: (scene, action, source, target) => {
        if (target && target.addShield) {
            target.addShield(action.value);
            if (scene.effectManager) scene.effectManager.playBlock(target.x, target.y);
        }
    },

    heal: (scene, action, source, target) => {
        if (target && target.heal) {
            target.heal(action.value);
            if (scene.effectManager) scene.effectManager.playHeal(target.x, target.y);
        }
    },

    // ИСПРАВЛЕНО: Теперь имя совпадает с базой (heal_owner)
    heal_owner: (scene, action, source, target) => {
        // source - это тот, кто сыграл карту (Игрок)
        if (source && source.heal) {
            source.heal(action.value);
            if (scene.effectManager) scene.effectManager.playHeal(source.x, source.y);
        }
    },

    // --- РЕСУРСЫ ---

    restore_mana: (scene, action, source, target) => {
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        scene.showFloatingText(source.x, source.y - 60, `+${action.value} Mana`, 0x00ffff);
    },

    draw: (scene, action, source, target) => {
        scene.drawCards(action.value);
        scene.showFloatingText(source.x, source.y - 80, `Draw +${action.value}`, 0xffffff);
    },

    // --- СТАТУСЫ ---
    
    apply_status: (scene, action, source, target) => {
        if (scene.statusManager) {
            scene.statusManager.applyStatus(target, action.status, action.value);
        }
    },

    increase_max_hp: (scene, action, source, target) => {
        if (target) {
            target.maxHp += action.value;
            target.hp += action.value;
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
        // ТЕПЕРЬ ИГРА СКАЖЕТ ТЕБЕ, ЕСЛИ ТЫ ОШИБСЯ В НАЗВАНИИ
        console.error(`CRITICAL: Действие "${action.type}" не найдено в ActionManager! Проверь cards.js или enchants.js`);
    }
}
