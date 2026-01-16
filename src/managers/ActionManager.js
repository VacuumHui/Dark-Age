// Файл: src/managers/ActionManager.js

import { GameState } from '../GameState.js'; // <-- Добавили импорт

export const ACTIONS = {
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

    apply_status: (scene, action, source, target) => {
        if (scene.statusManager) {
            scene.statusManager.applyStatus(target, action.status, action.value);
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

    heal_owner: (scene, action, source, target) => {
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
    },

    // --- ИСПРАВЛЕННОЕ УВЕЛИЧЕНИЕ ХП (КЛУБНИКА) ---
    increase_max_hp: (scene, action, source, target) => {
        // 1. Обновляем Глобальное состояние (чтобы сохранилось навсегда)
        GameState.maxHp += action.value;
        GameState.currentHp += action.value;

        // 2. Если мы в бою и есть юнит игрока — обновляем его визуально
        if (scene.player) {
            scene.player.maxHp = GameState.maxHp;
            scene.player.hp = GameState.currentHp;
            scene.player.updateUI();
            scene.showFloatingText(scene.player.x, scene.player.y - 60, `Max HP +${action.value}`, 0x00ff00);
        } 
        // 3. Если мы в магазине (юнита нет) — просто обновляем UI сцены
        else {
            scene.game.events.emit('UPDATE_UI'); // Обновить верхнюю полоску
        }
    }
};

export function executeAction(scene, action, source, target) {
    const actionFunc = ACTIONS[action.type];
    if (actionFunc) {
        actionFunc(scene, action, source, target);
    } else {
        console.warn(`ActionManager: Unknown action "${action.type}"`);
    }
}
