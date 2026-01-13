// src/managers/ActionManager.js

export const ACTIONS = {
    // --- БОЙ ---
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            // ВАЖНО: Считаем урон через StatusManager!
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }

            target.takeDamage(dmg);
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y);
        }
    },

    // --- НОВОЕ: СТАТУСЫ ---
    apply_status: (scene, action, source, target) => {
        // action.status = "poison", "strength" и т.д.
        // action.value = количество
        // action.target = "self" или "enemy" (определяется уровнем выше)
        
        if (scene.statusManager) {
            scene.statusManager.applyStatus(target, action.status, action.value);
        }
    },

    // --- ОСТАЛЬНОЕ (Без изменений) ---
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
    heal_source: (scene, action, source, target) => {
        if (source && source.heal) {
            source.heal(action.value);
            if (scene.effectManager) scene.effectManager.playHeal(source.x, source.y);
        }
    },
    restore_mana: (scene, action, source, target) => {
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        scene.showFloatingText(source.x, source.y - 60, `+${action.value} Mana`, 0x00ffff);
    },
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
        console.warn(`Unknown action: ${action.type}`);
    }
}
