// Файл: src/managers/ActionManager.js

import { GameState } from '../GameState.js';

export const ACTIONS = {
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
            // Передаем source для шипов
            target.takeDamage(dmg, source);
            
            // ЭФФЕКТ УДАРА
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y);
        }
    },

    block: (scene, action, source, target) => {
        if (target && target.addShield) {
            target.addShield(action.value);
            // ЭФФЕКТ ЩИТА
            if (scene.effectManager) scene.effectManager.playBlock(target.x, target.y);
        }
    },

    heal: (scene, action, source, target) => {
        if (target && target.heal) {
            target.heal(action.value);
            // ЭФФЕКТ ЛЕЧЕНИЯ
            if (scene.effectManager) scene.effectManager.playHeal(target.x, target.y);
        }
    },

    apply_status: (scene, action, source, target) => {
        if (scene.statusManager) {
            scene.statusManager.applyStatus(target, action.status, action.value);
            
            // СПЕЦИАЛЬНЫЕ ЭФФЕКТЫ ДЛЯ СТАТУСОВ
            if (scene.effectManager) {
                if (action.status === 'poison') scene.effectManager.playPoison(target.x, target.y);
                if (action.status === 'strength' || action.status === 'rage') scene.effectManager.playBuff(target.x, target.y);
            }
        }
    },

    restore_mana: (scene, action, source, target) => {
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        // Эффект баффа (мана)
        if (scene.effectManager) scene.effectManager.playBuff(source.x, source.y);
        
        if (target) scene.ui.showFloatingText(target.x, target.y - 60, `+${action.value} Mana`, 0x00ffff);
    },

    draw: (scene, action, source, target) => {
        if (scene.handManager) {
            scene.handManager.drawCards(action.value);
        } else {
            scene.drawCards(action.value);
        }
        if (target) {
            scene.ui.showFloatingText(target.x, target.y - 80, `Draw +${action.value}`, 0xffffff);
        }
    },

    increase_max_hp: (scene, action, source, target) => {
        GameState.maxHp += action.value;
        GameState.currentHp += action.value;

        if (scene.player) {
            scene.player.maxHp = GameState.maxHp;
            scene.player.hp = GameState.currentHp;
            scene.player.updateUI();
            scene.effectManager.playHeal(scene.player.x, scene.player.y); // Эффект
            scene.ui.showFloatingText(scene.player.x, scene.player.y - 60, `Max HP +${action.value}`, 0x00ff00);
        } else {
            scene.game.events.emit('UPDATE_UI');
        }
    },

    increase_max_mana: (scene, action, source, target) => {
        GameState.maxMana += action.value;
        scene.maxMana = GameState.maxMana;
        scene.mana += action.value; 
        scene.updateManaUI();
        scene.effectManager.playBuff(source.x, source.y); // Эффект
        scene.ui.showFloatingText(source.x, source.y - 80, `MAX MANA UP!`, 0x00aaff);
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
