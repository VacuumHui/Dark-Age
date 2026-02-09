// src/managers/EnemyFactory.js
 
import { Unit } from '../prefabs/Unit.js';
import { ENEMIES_DB } from '../data/enemies.js';
import { GameState } from '../GameState.js';
 
export class EnemyFactory {
     
    static createEnemies(scene, enemyKey = null) {
        const difficulty = GameState.currentFloor + 1; 
        const actMultiplier = GameState.act; 
        
        // БЮДЖЕТ: 1 этаж = 2 очка. 2 этаж = 3 очка.
        let budget = difficulty + 1 + (actMultiplier - 1) * 2;
        
        // Шанс 50% увеличить бюджет на 1, чтобы было сложнее
        if (Math.random() < 0.5) budget += 1;

        if (budget > 12) budget = 12;

        // 1. Ручной спавн (Босс)
        if (enemyKey) {
            if (ENEMIES_DB[enemyKey].tier === 'boss') {
                const boss = new Unit(scene, scene.scale.width * 0.75, scene.scale.height * 0.55, enemyKey, false);
                return [boss];
            }
            const unit = new Unit(scene, scene.scale.width * 0.75, scene.scale.height * 0.55, enemyKey, false);
            return [unit];
        }

        // 2. Генерация
        const squad = [];
        const allEnemies = Object.keys(ENEMIES_DB).filter(k => ENEMIES_DB[k].tier !== 'boss');
        
        let attempts = 0;
        
        console.log(`--- SPAWN START (Budget: ${budget}) ---`);

        while (budget > 0 && squad.length < 4 && attempts < 100) {
            attempts++;

            // ФИЛЬТР: Берем тех, кто по карману.
            // ВАЖНО: Добавлена защита (cost || 1), если в базе забыли указать цену
            const affordableEnemies = allEnemies.filter(key => {
                const cost = ENEMIES_DB[key].cost || 1; 
                return cost <= budget;
            });

            if (affordableEnemies.length === 0) {
                console.log("No affordable enemies left.");
                break;
            }

            const randKey = Phaser.Utils.Array.GetRandom(affordableEnemies);
            const data = ENEMIES_DB[randKey];
            const cost = data.cost || 1; // Защита

            squad.push(randKey);
            budget -= cost;
        }

        // Если все сломалось - даем хотя бы слайма
        if (squad.length === 0) squad.push('slime');

        // 3. Создание объектов
        const enemies = [];
        const positions = this.getPositions(squad.length, scene.scale.width, scene.scale.height);

        squad.forEach((key, index) => {
            const pos = positions[index];
            const enemy = new Unit(scene, pos.x, pos.y, key, false);
            
            const hpMultiplier = 1 + (difficulty * 0.05); 
            enemy.maxHp = Math.floor(enemy.maxHp * hpMultiplier);
            enemy.hp = enemy.maxHp;
            enemy.difficultyMultiplier = hpMultiplier; 
            enemy.updateUI();

            enemies.push(enemy);
        });

        console.log(`Spawned: ${squad.join(', ')}`);
        return enemies;
    }

    static getPositions(count, GW, GH) {
        const centerY = GH * 0.55; 
        const stepX = 170; 

        const positions = [];
        const totalGroupWidth = (count - 1) * stepX;
        const groupCenterX = GW * 0.75;
        const startX = groupCenterX - (totalGroupWidth / 2);

        for (let i = 0; i < count; i++) {
            const x = startX + (i * stepX);
            const yOffset = (i % 2 === 0) ? -30 : 30;
            const y = centerY + yOffset;
            positions.push({ x, y });
        }
        return positions;
    }
}
