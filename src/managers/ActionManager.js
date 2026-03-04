// Файл: src/managers/ActionManager.js
import { GameState } from '../GameState.js';

export const ACTIONS = {
    // --- БАЗОВЫЕ ДЕЙСТВИЯ ---
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
            target.takeDamage(dmg, source);
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y, target.isPlayer);
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
            if (action.status === 'poison' || action.status === 'wound') scene.effectManager.playPoison(target.x, target.y);
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
        if (scene.handManager) scene.handManager.drawCards(action.value);
        else scene.drawCards(action.value);
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
            if (typeof scene.mana === 'number') scene.mana = Math.min(scene.mana + action.value, scene.maxMana);
            if (scene.updateManaUI) scene.updateManaUI();
        }
        if (scene.effectManager && source) scene.effectManager.playBuff(source.x, source.y);
        if (scene.ui && scene.ui.showFloatingText && source) {
            scene.ui.showFloatingText(source.x, source.y - 80, `MAX MANA UP!`, 0x00aaff);
        } else if (scene.game && scene.game.events) {
            scene.game.events.emit('UPDATE_UI');
        }
    },

    // --- НОВЫЕ ХАРДКОРНЫЕ ДЕЙСТВИЯ ---
    
    // 1. Урон от Блока (Удар Щитом)
    dmg_from_block: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = source.shield || 0;
            if (dmg > 0) {
                if (scene.statusManager) {
                    dmg = scene.statusManager.calculateDamage(source, target, dmg);
                }
                target.takeDamage(dmg, source);
                if (scene.effectManager) scene.effectManager.playHit(target.x, target.y, target.isPlayer);
            } else {
                scene.ui.showFloatingText(source.x, source.y - 80, "Нет щита!", 0xaaaaaa);
            }
        }
    },

    // 2. Умножение Блока (Окоп)
    multiply_block: (scene, action, source, target) => {
        const actualTarget = target || source; // Обычно применяется к себе
        if (actualTarget && actualTarget.shield > 0) {
            const extra = Math.floor(actualTarget.shield * 0.4); // +40%
            actualTarget.addShield(extra);
            if (scene.effectManager) scene.effectManager.playBlock(actualTarget.x, actualTarget.y);
        }
    },

    // 3. Динамический урон от ХП (Отчаяние, Лезвие)
    dynamic_dmg: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value || 0;
            
            // Расчет Отчаяния
            if (action.formula === 'despair') {
                const hpPercent = source.hp / source.maxHp;
                if (hpPercent <= 0.1) dmg = 15;
                else if (hpPercent <= 0.5) dmg = 10;
                else dmg = 2;
            } 
            // Расчет Лезвия
            else if (action.formula === 'red_blade') {
                const missing = source.maxHp - source.hp;
                dmg = Math.floor(missing * 0.25);
            }

            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
            target.takeDamage(dmg, source);
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y, target.isPlayer);
        }
    },

    // 4. МАССОВЫЙ УРОН (Рассечение)
    aoe_dmg: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
            target.takeDamage(dmg, source);
            if (scene.effectManager) scene.effectManager.playHit(target.x, target.y, target.isPlayer);
        }
    },
    
    // 5. Метка (Добивание)
    mark_target: (scene, action, source, target) => {
        if (target && scene.statusManager) {
            scene.statusManager.applyStatus(target, 'doom_mark', 1);
            scene.ui.showFloatingText(target.x, target.y - 120, "МЕТКА!", 0xff00ff);
        }
    }
};

export function executeAction(scene, action, source, target) {
    const actionFunc = ACTIONS[action.type];
    if (actionFunc) {
        actionFunc(scene, action, source, target);
    } else {
        // ВОТ ЗДЕСЬ ИГРА РУГАЕТСЯ, ЕСЛИ ЭКШЕН НЕ НАЙДЕН
        console.error(`CRITICAL: Неизвестное действие "${action.type}"!`);
        if (scene.ui) scene.ui.showFloatingText(source.x, source.y, "ERROR: Action Missing", 0xff0000);
    }
}
