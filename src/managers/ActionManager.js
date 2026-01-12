// src/managers/ActionManager.js

export const ACTIONS = {
    // --- БАЗОВЫЕ МЕХАНИКИ ---

    // Нанесение урона (по тому, на кого сыграли карту)
    damage: (scene, action, source, target) => {
        if (target && target.takeDamage) {
            target.takeDamage(action.value);
        }
    },

    // Наложение щита (на того, на кого сыграли карту)
    block: (scene, action, source, target) => {
        if (target && target.addShield) {
            target.addShield(action.value);
        }
    },

    // Лечение (того, на кого сыграли карту)
    heal: (scene, action, source, target) => {
        if (target && target.heal) {
            target.heal(action.value);
        }
    },

    // --- РЕСУРСЫ И КОЛОДА ---

    // Восстановление маны
    restore_mana: (scene, action, source, target) => {
        scene.mana += action.value;
        if (scene.mana > scene.maxMana) scene.mana = scene.maxMana;
        scene.updateManaUI();
        scene.showFloatingText(source.x, source.y - 60, `+${action.value} Mana`, 0x00ffff);
    },

    // Добор карт (Draw)
    draw: (scene, action, source, target) => {
        scene.drawCards(action.value);
        scene.showFloatingText(source.x, source.y - 80, `Draw +${action.value}`, 0xffffff);
    },

    // --- СПЕЦИАЛЬНЫЕ ЭФФЕКТЫ ---

    // Лечение ИСТОЧНИКА (того, кто сыграл карту). Нужно для Вампиризма.
    heal_source: (scene, action, source, target) => {
        if (source && source.heal) {
            source.heal(action.value);
        }
    },

    // Урон ИСТОЧНИКУ (того, кто сыграл карту). Нужно для карт типа "Жертва", если мы кидаем их во врага.
    damage_source: (scene, action, source, target) => {
        if (source && source.takeDamage) {
            source.takeDamage(action.value);
        }
    }
};

/**
 * Главная функция выполнения действия
 * @param {Phaser.Scene} scene - Ссылка на сцену боя
 * @param {Object} action - Объект действия из базы ({ type: 'damage', value: 5 })
 * @param {Unit} source - Кто применил (обычно Игрок)
 * @param {Unit} target - На кого применили (Враг или Игрок)
 */
export function executeAction(scene, action, source, target) {
    const actionFunc = ACTIONS[action.type];
    
    if (actionFunc) {
        actionFunc(scene, action, source, target);
    } else {
        console.warn(`ActionManager: Неизвестный тип действия "${action.type}"`);
    }
}
