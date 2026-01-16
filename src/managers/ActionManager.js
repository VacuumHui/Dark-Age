// Файл: src/managers/ActionManager.js

import { GameState } from '../GameState.js';

export const ACTIONS = {
    // 1. УРОН
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value;
            // Учитываем статусы (Сила, Слабость)
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
            target.takeDamage(dmg);
            // Эффект
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y);
        }
    },

    // 2. БЛОК
    block: (scene, action, source, target) => {
        if (target && target.addShield) {
            target.addShield(action.value);
            if (scene.effectManager) scene.effectManager.playBlock(target.x, target.y);
        }
    },

    // 3. ЛЕЧЕНИЕ (Один универсальный метод!)
    heal: (scene, action, source, target) => {
        if (target && target.heal) {
            target.heal(action.value);
            if (scene.effectManager) scene.effectManager.playHeal(target.x, target.y);
        }
    },

    // 4. СТАТУСЫ
    apply_status: (scene, action, source, target) => {
        if (scene.statusManager) {
            scene.statusManager.applyStatus(target, action.status, action.value);
        }
    },

    // 5. МАНА
    restore_mana: (scene, action, source, target) => {
        // Мана обычно глобальная, но визуально привязана к игроку
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        
        // Показываем текст над тем, кто восстановил (обычно игрок)
        if (target) {
            scene.showFloatingText(target.x, target.y - 60, `+${action.value} Mana`, 0x00ffff);
        }
    },

    // 6. ДОБОР КАРТ
    draw: (scene, action, source, target) => {
        scene.drawCards(action.value);
        if (target) {
            scene.showFloatingText(target.x, target.y - 80, `Draw +${action.value}`, 0xffffff);
        }
    },

    // 7. МАКС ХП (Для реликвий)
    increase_max_hp: (scene, action, source, target) => {
        GameState.maxHp += action.value;
        GameState.currentHp += action.value;

        if (scene.player) {
            scene.player.maxHp = GameState.maxHp;
            scene.player.hp = GameState.currentHp;
            scene.player.updateUI();
            scene.showFloatingText(scene.player.x, scene.player.y - 60, `Max HP +${action.value}`, 0x00ff00);
        } else {
            scene.game.events.emit('UPDATE_UI');
        }
    }
};

export function executeAction(scene, action, source, target) {
    const actionFunc = ACTIONS[action.type];
    
    if (actionFunc) {
        actionFunc(scene, action, source, target);
    } else {
        console.error(`CRITICAL: Неизвестное действие "${action.type}"! Проверь cards.js.`);
    }
}
