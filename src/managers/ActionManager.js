// Файл: src/managers/ActionManager.js

import { GameState } from '../GameState.js';

export const ACTIONS = {
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
            // Урон + Шипы
            target.takeDamage(dmg, source);
            
            // ЭФФЕКТ УДАРА С НАПРАВЛЕНИЕМ
            // Передаем true, если цель - игрок, false если враг
            if (scene.effectManager) {
                scene.effectManager.playHit(target.x, target.y, target.isPlayer);
            }
        }
    },

    block: (scene, action, source, target) => {
        if (target && target.addShield) {
            target.addShield(action.value);
            if (scene.effectManager) scene.effectManager.playBlock(target.x, target.y);
        }
    },

    heal: (scene, action, source, target) => {
        const actualTarget = target || scene.player;
        if (actualTarget && actualTarget.heal) {
            actualTarget.heal(action.value);
            if (scene.effectManager) scene.effectManager.playHeal(actualTarget.x, actualTarget.y);
        } else {
            GameState.currentHp = Math.min(GameState.maxHp, GameState.currentHp + action.value);
            if (scene.game && scene.game.events) scene.game.events.emit('UPDATE_UI');
        }
    },

    apply_status: (scene, action, source, target) => {
        if (!target || !scene.statusManager) return;
        scene.statusManager.applyStatus(target, action.status, action.value);
        
        if (scene.effectManager) {
            if (action.status === 'poison') scene.effectManager.playPoison(target.x, target.y);
            if (action.status === 'strength' || action.status === 'rage') scene.effectManager.playBuff(target.x, target.y);
        }
    },

    restore_mana: (scene, action, source, target) => {
        if (typeof scene.mana !== 'number' || typeof scene.maxMana !== 'number') return;
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        if (scene.updateManaUI) scene.updateManaUI();
        if (scene.effectManager && source) scene.effectManager.playBuff(source.x, source.y);
        const displayTarget = target || source || scene.player;
        if (displayTarget && scene.ui && scene.ui.showFloatingText) {
            scene.ui.showFloatingText(displayTarget.x, displayTarget.y - 60, `+${action.value} Mana`, 0x00ffff);
        }
    },

    draw: (scene, action, source, target) => {
        if (scene.handManager) {
            scene.handManager.drawCards(action.value);
        } else {
            scene.drawCards(action.value);
        }
        if (target && scene.ui && scene.ui.showFloatingText) {
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
            scene.effectManager.playHeal(scene.player.x, scene.player.y);
            scene.ui.showFloatingText(scene.player.x, scene.player.y - 60, `Max HP +${action.value}`, 0x00ff00);
        } else {
            scene.game.events.emit('UPDATE_UI');
        }
    },

    increase_max_mana: (scene, action, source, target) => {
        GameState.maxMana += action.value;
        if (typeof scene.maxMana === 'number') {
            scene.maxMana = GameState.maxMana;
            if (typeof scene.mana === 'number') {
                scene.mana = Math.min(scene.mana + action.value, scene.maxMana);
            }
            if (scene.updateManaUI) scene.updateManaUI();
        }
        if (scene.effectManager && source) scene.effectManager.playBuff(source.x, source.y);
        if (scene.ui && scene.ui.showFloatingText && source) {
            scene.ui.showFloatingText(source.x, source.y - 80, `MAX MANA UP!`, 0x00aaff);
        } else if (scene.game && scene.game.events) {
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
