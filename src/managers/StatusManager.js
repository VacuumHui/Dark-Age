// src/managers/StatusManager.js

export class StatusManager {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Наложить статус на юнита
     */
    applyStatus(target, type, value) {
        if (!target.alive) return;

        // Если статус уже есть, увеличиваем значение (стаки)
        if (target.statuses[type]) {
            target.statuses[type] += value;
        } else {
            target.statuses[type] = value;
        }

        this.scene.showFloatingText(target.x, target.y - 80, `+${type.toUpperCase()}`, 0xff00ff);
        target.updateStatusUI();
    }

    /**
     * Расчет урона с учетом Силы, Слабости и Уязвимости
     */
    calculateDamage(source, target, baseDamage) {
        let finalDamage = baseDamage;

        // 1. Бонусы атакующего (Сила)
        if (source.statuses['strength']) {
            finalDamage += source.statuses['strength'];
        }

        // 2. Дебаффы атакующего (Слабость -25%)
        if (source.statuses['weak']) {
            finalDamage = Math.floor(finalDamage * 0.75);
        }

        // 3. Дебаффы защитника (Уязвимость +50%)
        if (target.statuses['vulnerable']) {
            finalDamage = Math.floor(finalDamage * 1.5);
        }

        return Math.max(0, finalDamage); // Урон не может быть отрицательным
    }

    /**
     * Событие: Начало хода (DoT эффекты)
     */
    onTurnStart(unit) {
        // ЯД (Poison): Наносит урон и уменьшается на 1
        if (unit.statuses['poison'] > 0) {
            const dmg = unit.statuses['poison'];
            this.scene.showFloatingText(unit.x, unit.y - 100, "POISON!", 0x00ff00);
            unit.takeDamage(dmg); // Урон игнорирует щит (обычно в роглайтах так)
            
            unit.statuses['poison']--; // Уменьшаем стаки
            if (unit.statuses['poison'] <= 0) delete unit.statuses['poison'];
        }
        
        unit.updateStatusUI();
    }

    /**
     * Событие: Конец хода (Сгорание временных баффов)
     */
    onTurnEnd(unit) {
        // СИЛА (Strength): Сгорает в конце хода (по твоей заявке)
        if (unit.statuses['strength']) {
            delete unit.statuses['strength'];
        }

        // СЛАБОСТЬ / УЯЗВИМОСТЬ: Тикают таймеры
        ['weak', 'vulnerable'].forEach(stat => {
            if (unit.statuses[stat] > 0) {
                unit.statuses[stat]--;
                if (unit.statuses[stat] <= 0) delete unit.statuses[stat];
            }
        });

        unit.updateStatusUI();
    }

    /**
     * Событие: При получении урона (Реактивные эффекты)
     */
    onTakeDamage(unit, amount) {
        // ЯРОСТЬ (Rage): Если получили урон -> получаем Силу на следующий ход
        if (unit.statuses['rage'] > 0 && amount > 0) {
            // Накладываем 1 силы за каждый удар
            this.applyStatus(unit, 'strength', 1); 
            this.scene.showFloatingText(unit.x, unit.y - 100, "RAGE!", 0xff0000);
        }
    }
}
