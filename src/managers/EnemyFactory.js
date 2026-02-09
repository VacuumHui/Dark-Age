// src/managers/EnemyFactory.js
 
import { Unit } from '../prefabs/Unit.js';
import { ENEMIES_DB } from '../data/enemies.js';
import { GameState } from '../GameState.js';
 
export class EnemyFactory {
     
    // Теперь возвращает МАССИВ врагов
    static createEnemies(scene, enemyKey = null) {
        const difficulty = GameState.currentFloor + 1; // 1..12
        const actMultiplier = GameState.act; // 1, 2, 3...
        
        // Базовый бюджет схватки
        // Этаж 1: бюджет ~2 (2 слайма или 1 слайм)
        // Этаж 5: бюджет ~5 (1 рыцарь + 2 слайма)
        let budget = Math.floor(difficulty * 0.8) + 1 + (actMultiplier - 1) * 2;
        if (budget < 1) budget = 1;

        // Если передан конкретный ключ (например, босс), игнорируем бюджет
        if (enemyKey) {
            // Если это босс, он один
            if (ENEMIES_DB[enemyKey].tier === 'boss') {
                const boss = new Unit(scene, 1200, 350, enemyKey, false);
                return [boss];
            }
            // Если обычный враг передан вручную
            const unit = new Unit(scene, 1200, 350, enemyKey, false);
            return [unit];
        }

        // --- ГЕНЕРАЦИЯ ОТРЯДА ---
        const squad = [];
        const possibleEnemies = Object.keys(ENEMIES_DB).filter(k => ENEMIES_DB[k].tier !== 'boss');
        
        // Пока есть бюджет и место (макс 4 врага)
        let attempts = 0;
        while (budget > 0 && squad.length < 4 && attempts < 100) {
            attempts++;
            const randKey = Phaser.Utils.Array.GetRandom(possibleEnemies);
            const data = ENEMIES_DB[randKey];

            if (data.cost <= budget) {
                squad.push(randKey);
                budget -= data.cost;
            }
        }

        // Если вдруг бюджет кончился, а врагов нет (редкий случай) -> добавляем Слайма
        if (squad.length === 0) squad.push('slime');

        // --- СОЗДАНИЕ ЮНИТОВ И РАССТАНОВКА ---
        const enemies = [];
        const positions = this.getPositions(squad.length, scene.scale.width, scene.scale.height);

        squad.forEach((key, index) => {
            const pos = positions[index];
            const enemy = new Unit(scene, pos.x, pos.y, key, false);
            
            // Скейлинг сложности (ХП)
            const hpMultiplier = 1 + (difficulty * 0.05); 
            enemy.maxHp = Math.floor(enemy.maxHp * hpMultiplier);
            enemy.hp = enemy.maxHp;
            enemy.difficultyMultiplier = hpMultiplier; // Для урона
            enemy.updateUI();

            enemies.push(enemy);
        });

        console.log(`Спавн отряда: ${squad.join(', ')} (Бюджет ост: ${budget})`);
        return enemies;
    }

    // Расчет позиций (чтобы враги стояли красиво)
    static getPositions(count, GW, GH) {
        const centerY = GH * 0.55; // Чуть ниже центра
        const startX = GW * 0.6;   // Начинаем справа
        const stepX = 180;         // Расстояние между врагами

        const positions = [];
        
        // Центрируем группу
        // Если 1 враг -> x = startX + 200
        // Если 3 врага -> распределяем
        
        for (let i = 0; i < count; i++) {
            // Сдвигаем каждого следующего правее
            // И немного меняем Y, чтобы создать эффект перспективы (зигзаг или линия)
            const x = startX + (i * stepX);
            const y = centerY + (i % 2 === 0 ? 0 : 40); // Каждый второй чуть ниже
            positions.push({ x, y });
        }
        return positions;
    }
}
