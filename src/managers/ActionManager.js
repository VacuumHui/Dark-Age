// Файл: src/managers/ActionManager.js

import { GameState } from '../GameState.js';

export const ACTIONS = {
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
            // Здесь передаем source для шипов
            target.takeDamage(dmg, source);
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

    apply_status: (scene, action, source, target) => {
        if (scene.statusManager) {
            scene.statusManager.applyStatus(target, action.status, action.value);
        }
    },

    restore_mana: (scene, action, source, target) => {
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        
        // ИСПРАВЛЕНО: scene.ui
        if (target) {
            scene.ui.showFloatingText(target.x, target.y - 60, `+${action.value} Mana`, 0x00ffff);
        }
    },

    draw: (scene, action, source, target) => {
        // Тут мы используем HandManager, который доступен через сцену, но метод там называется drawCards
        // 
        if (scene.handManager) {
             scene.handManager.drawCards(action.value);
        } else {
             // Фолбек для старой версии, если менеджера нет
             scene.drawCards(action.value);
        }
    },

    increase_max_hp: (scene, action, source, target) => {
        GameState.maxHp += action.value;
        GameState.currentHp += action.value;

        if (scene.player) {
            scene.player.maxHp = GameState.maxHp;
            scene.player.hp = GameState.currentHp;
            scene.player.updateUI();
            // ИСПРАВЛЕНО: scene.ui
            scene.ui.showFloatingText(scene.player.x, scene.player.y - 60, `Max HP +${action.value}`, 0x00ff00);
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
        console.error(`CRITICAL: Неизвестное действие "${action.type}"!`);
    }
}
