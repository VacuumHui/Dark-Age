// Файл: src/managers/StatusManager.js

export class StatusManager {
    constructor(scene) {
        this.scene = scene;
    }

    applyStatus(target, type, value) {
        if (!target.alive) return;

        if (target.statuses[type]) {
            target.statuses[type] += value;
        } else {
            target.statuses[type] = value;
        }

        // ИСПРАВЛЕНО: this.scene.ui
        this.scene.ui.showFloatingText(target.x, target.y - 80, `+${type.toUpperCase()}`, 0xff00ff);
        target.updateStatusUI();
    }

    calculateDamage(source, target, baseDamage) {
        let finalDamage = baseDamage;

        if (source.statuses['strength']) {
            finalDamage += source.statuses['strength'];
        }
        if (source.statuses['weak']) {
            finalDamage = Math.floor(finalDamage * 0.75);
        }
        if (target.statuses['vulnerable']) {
            finalDamage = Math.floor(finalDamage * 1.5);
        }

        return Math.max(0, finalDamage);
    }

        onTurnStart(unit) {
        // ЯД (наносит урон = стакам, стаки падают на 1)
        if (unit.statuses['poison'] > 0) {
            const dmg = unit.statuses['poison'];
            this.scene.ui.showFloatingText(unit.x, unit.y - 100, "ЯД!", 0x00ff00);
            unit.takeDamage(dmg, null);
            
            unit.statuses['poison']--;
            if (unit.statuses['poison'] <= 0) delete unit.statuses['poison'];
        }
        
        // КРОВОТЕЧЕНИЕ (наносит 1 урон, длительность падает на 1)
        if (unit.statuses['bleed'] > 0 && unit.alive) {
            this.scene.ui.showFloatingText(unit.x, unit.y - 80, "КРОВОТЕЧЕНИЕ!", 0xff0000);
            unit.takeDamage(1, null); // Всегда 1 урон
            
            unit.statuses['bleed']--;
            if (unit.statuses['bleed'] <= 0) delete unit.statuses['bleed'];
        }

        unit.updateStatusUI();
    }


        onTurnEnd(unit) {
        ['weak', 'vulnerable', 'execute_mark'].forEach(stat => {
            if (unit.statuses[stat] > 0) {
                // Если это метка добивания игрока, она висит 1 ход и пропадает
                unit.statuses[stat]--;
                if (unit.statuses[stat] <= 0) delete unit.statuses[stat];
            }
        });
        unit.updateStatusUI();
    }


        onTakeDamage(unit, amount) {
        // Ярость
        if (unit.statuses['rage'] > 0 && amount > 0) {
            this.applyStatus(unit, 'strength', 1); 
            this.scene.ui.showFloatingText(unit.x, unit.y - 100, "ЯРОСТЬ!", 0xffaa00);
        }

        // ДОБИВАНИЕ (Если висит метка, ХП <= 20% и урон > 0)
        if (unit.statuses['execute_mark'] > 0 && amount > 0 && unit.alive) {
            const hpPercent = unit.hp / unit.maxHp;
            if (hpPercent <= 0.2) {
                this.scene.ui.showFloatingText(unit.x, unit.y - 140, "ФАТАЛИТИ!", 0xaa00ff);
                this.scene.cameras.main.shake(300, 0.02);
                unit.hp = 0; // Мгновенная смерть
            }
        }
    }


    checkTurnSkip(unit) {
        if (unit.statuses['freeze'] > 0) {
            const chance = 0.4; 
            
            if (Math.random() < chance) {
                // ИСПРАВЛЕНО
                this.scene.ui.showFloatingText(unit.x, unit.y - 100, "FROZEN! ❄️", 0x00ffff);
                this.scene.cameras.main.shake(200, 0.01);
                
                unit.statuses['freeze']--;
                if (unit.statuses['freeze'] <= 0) delete unit.statuses['freeze'];
                
                unit.updateStatusUI();
                return true; 
            } else {
                // ИСПРАВЛЕНО
                this.scene.ui.showFloatingText(unit.x, unit.y - 100, "ICE CRACKED!", 0xcccccc);
            }
        }
        return false;
    }
}
