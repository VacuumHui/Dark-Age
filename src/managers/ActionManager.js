// Файл: src/managers/ActionManager.js

import { GameState } from '../GameState.js';

export const ACTIONS = {
    // --- БОЙ ---
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            let dmg = action.value;
            if (scene.statusManager) {
                dmg = scene.statusManager.calculateDamage(source, target, dmg);
            }
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

    // --- РЕСУРСЫ ---
    restore_mana: (scene, action, source, target) => {
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        // Используем UI сцены для текста
        scene.ui.showFloatingText(source.x, source.y - 60, `+${action.value} Mana`, 0x00ffff);
    },

    draw: (scene, action, source, target) => {
        // Вызываем метод через handManager, если он есть, иначе через сцену
        if (scene.handManager) {
            scene.handManager.drawCards(action.value);
        } else {
            scene.drawCards(action.value);
        }
        
        if (target) {
            scene.ui.showFloatingText(target.x, target.y - 80, `Draw +${action.value}`, 0xffffff);
        }
    },

    // --- ГЛОБАЛЬНЫЕ УЛУЧШЕНИЯ ---

    increase_max_hp: (scene, action, source, target) => {
        GameState.maxHp += action.value;
        GameState.currentHp += action.value;

        if (scene.player) {
            scene.player.maxHp = GameState.maxHp;
            scene.player.hp = GameState.currentHp;
            scene.player.updateUI();
            scene.ui.showFloatingText(scene.player.x, scene.player.y - 60, `Max HP +${action.value}`, 0x00ff00);
        } else {
            scene.game.events.emit('UPDATE_UI');
        }
    },

    // ВОТ ЭТОГО НЕ ХВАТАЛО!
    increase_max_mana: (scene, action, source, target) => {
        // 1. Обновляем глобальное сохранение
        GameState.maxMana += action.value;
        
        // 2. Обновляем текущую битву
        scene.maxMana = GameState.maxMana;
        
        // (Опционально) Восстанавливаем текущую ману на величину прироста
        scene.mana += action.value; 
        
        // 3. Обновляем визуальную полоску
        scene.updateManaUI();
        
        // 4. Красивый текст
        scene.ui.showFloatingText(source.x, source.y - 80, `MAX MANA UP!`, 0x00aaff);
    }
};

export function executeAction(scene, action, source, target) {
    const actionFunc = ACTIONS[action.type];
    
    if (actionFunc) {
        actionFunc(scene, action, source, target);
    } else {
        console.error(`CRITICAL: Неизвестное действие "${action.type}"! Проверь написание в cards.js.`);
    }
}
