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

        ['weak', 'vulnerable'].forEach(stat => {
            if (unit.statuses[stat] > 0) {
                unit.statuses[stat]--;
                if (unit.statuses[stat] <= 0) delete unit.statuses[stat];
            }
        });

        unit.updateStatusUI();
    }

    onTakeDamage(unit, amount) {
        if (unit.statuses['rage'] > 0 && amount > 0) {
            this.applyStatus(unit, 'strength', 1); 
            // ИСПРАВЛЕНО
            this.scene.ui.showFloatingText(unit.x, unit.y - 100, "RAGE!", 0xff0000);
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
