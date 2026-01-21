// Файл: src/managers/StatusManager.js

export class StatusManager {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Наложить статус на юнита
     */
    applyStatus(target, type, value) {
        if (!target.alive) return;

        // Если статус уже есть, увеличиваем значение
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

        return Math.max(0, finalDamage);
    }

    /**
     * Событие: Начало хода (DoT эффекты)
     */
    onTurnStart(unit) {
        // ЯД
        if (unit.statuses['poison'] > 0) {
            const dmg = unit.statuses['poison'];
            this.scene.showFloatingText(unit.x, unit.y - 100, "POISON!", 0x00ff00);
            
            // Передаем null, так как у яда нет физического атакующего
            unit.takeDamage(dmg, null);
            
            unit.statuses['poison']--;
            if (unit.statuses['poison'] <= 0) delete unit.statuses['poison'];
        }
        
        unit.updateStatusUI();
    }
    
     //Событие: Конец хода (Сгорание временных баффов)
     
    onTurnEnd(unit) {
        // СИЛА сгорает
        if (unit.statuses['strength']) {
            delete unit.statuses['strength'];
        }

        // Таймеры дебаффов
        ['weak', 'vulnerable'].forEach(stat => {
            if (unit.statuses[stat] > 0) {
                unit.statuses[stat]--;
                if (unit.statuses[stat] <= 0) delete unit.statuses[stat];
            }
        });

        unit.updateStatusUI();
    }

    /**
     * Событие: При получении урона
     */
    onTakeDamage(unit, amount) {
        // ЯРОСТЬ
        if (unit.statuses['rage'] > 0 && amount > 0) {
            this.applyStatus(unit, 'strength', 1); 
            this.scene.showFloatingText(unit.x, unit.y - 100, "RAGE!", 0xff0000);
        }
    }

    /**
     * НОВЫЙ МЕТОД: Проверка на пропуск хода (Заморозка)
     * Именно его не хватало!
     */
    checkTurnSkip(unit) {
        // ЗАМОРОЗКА
        if (unit.statuses['freeze'] > 0) {
            const chance = 0.5; // 50% шанс
            
            if (Math.random() < chance) {
                this.scene.showFloatingText(unit.x, unit.y - 100, "FROZEN! ❄️", 0x00ffff);
                this.scene.cameras.main.shake(200, 0.01);
                
                // Уменьшаем счетчик
                unit.statuses['freeze']--;
                if (unit.statuses['freeze'] <= 0) delete unit.statuses['freeze'];
                
                unit.updateStatusUI();
                return true; // ПРОПУСТИТЬ ХОД
            } else {
                this.scene.showFloatingText(unit.x, unit.y - 100, "ICE CRACKED!", 0xcccccc);
            }
        }
        
        return false; // НЕ ПРОПУСКАТЬ
    }
}
