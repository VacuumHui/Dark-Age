// src/managers/RelicManager.js

import { RELICS_DB } from '../data/relics.js';
import { GameState } from '../GameState.js';
import { executeAction } from './ActionManager.js';

export class RelicManager {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Главный метод: Вызвать событие
     * @param {String} eventName - Имя события (например, 'onBattleStart')
     * @param {Object} context - Данные контекста (кто убил, кого убили)
     */
    trigger(eventName, context = {}) {
        // Проходимся по всем реликвиям в инвентаре игрока
        GameState.relics.forEach(relicId => {
            const relicData = RELICS_DB[relicId];
            
            // Если у реликвии есть реакция на это событие
            if (relicData.triggers && relicData.triggers[eventName]) {
                
                // Выполняем все действия
                relicData.triggers[eventName].forEach(action => {
                    this.executeRelicAction(action, context, relicData.name);
                });
            }
        });
    }

    executeRelicAction(action, context, relicName) {
        // Определяем цель (target)
        let targetUnit = null;

        if (action.target === 'player') targetUnit = this.scene.player;
        else if (action.target === 'enemy') targetUnit = this.scene.enemy;
        
        // Спецэффект: Показать имя реликвии, которая сработала
        if (targetUnit) {
            this.scene.showFloatingText(targetUnit.x, targetUnit.y - 120, `${relicName}!`, 0xffd700);
            
            // Делегируем выполнение в ActionManager (он уже всё умеет!)
            // source = player (реликвии принадлежат игроку)
            executeAction(this.scene, action, this.scene.player, targetUnit);
        }
    }

    // Метод добавления реликвии (для магазинов и наград)
    addRelic(relicId) {
        GameState.relics.push(relicId);
        // Сразу вызываем триггер 'onPickup' (для Клубники и т.д.)
        // Контекст пока пустой
        const relicData = RELICS_DB[relicId];
        if (relicData.triggers && relicData.triggers['onPickup']) {
             relicData.triggers['onPickup'].forEach(action => {
                 this.executeRelicAction(action, {}, relicData.name);
             });
        }
    }
}
