// src/managers/EnemyFactory.js
 
import { Unit } from '../prefabs/Unit.js';
import { ENEMIES_DB } from '../data/enemies.js';
import { GameState } from '../GameState.js';
 
export class EnemyFactory {
     
    static createEnemies(scene, enemyKey = null) {
        // 1. РУЧНОЙ СПАВН (БОССЫ ИЛИ ТЕСТ)
        if (enemyKey) {
            const isBoss = ENEMIES_DB[enemyKey] && ENEMIES_DB[enemyKey].tier === 'boss';
            
            // Босса ставим чуть дальше, чем обычного
            const x = scene.scale.width * 0.75; 
            const y = scene.scale.height * 0.55;
            
            const unit = new Unit(scene, x, y, enemyKey, false);
            return [unit];
        }

        // 2. ГЕНЕРАЦИЯ ПО СЛОЖНОСТИ
        const difficulty = (GameState.currentFloor || 0) + 1; 
        const actMultiplier = GameState.act;

        // --- ФОРМУЛА БЮДЖЕТА ---
        // База: 1.5 + (0.8 за этаж). 
        // Этаж 1: ~2.3 (Хватит на 2 Слаймов)
        // Этаж 2: ~3.1 (Хватит на 1 Рыцаря или 3 Слаймов)
        // Этаж 5: ~5.5 (Рыцарь + 2 Слайма)
        let budgetCalc = 1.5 + (difficulty * 0.8) + ((actMultiplier - 1) * 2);
        
        // Рандомный разброс (-1 .. +1), чтобы бои были непредсказуемыми
        const variance = (Math.random() * 2) - 1; 
        
        let budget = Math.floor(budgetCalc + variance);

        // Минимальный бюджет всегда 1 (чтобы хоть кто-то появился)
        if (budget < 1) budget = 1;
        // Максимальный бюджет 12 (техническое ограничение, чтобы не зависло)
        if (budget > 12) budget = 12;

        const squad = [];
        // Получаем всех врагов, кроме боссов
        const allEnemies = Object.keys(ENEMIES_DB).filter(k => ENEMIES_DB[k].tier !== 'boss');
        
        console.log(`Generating Squad... Floor: ${difficulty}, Budget: ${budget}`);

        let attempts = 0;
        
        // Набираем врагов, пока есть деньги и место (макс 4 слота)
        while (budget > 0 && squad.length < 4 && attempts < 50) {
            attempts++;
            
            // Фильтруем тех, кого можем купить на оставшиеся деньги
            const affordable = allEnemies.filter(key => {
                const cost = ENEMIES_DB[key].cost || 1; 
                return cost <= budget;
            });

            // Если денег не осталось даже на самого дешевого - выходим
            if (affordable.length === 0) break; 

            // Выбираем случайного из доступных
            const randKey = Phaser.Utils.Array.GetRandom(affordable);
            const cost = ENEMIES_DB[randKey].cost || 1;

            squad.push(randKey);
            budget -= cost;
        }

        // Защита: Если вдруг массив пуст (например, бюджет был < 1 из-за бага), даем Слайма
        if (squad.length === 0) squad.push('slime');

        // 3. СОЗДАНИЕ ОБЪЕКТОВ
        const enemies = [];
        const positions = this.getPositions(squad.length, scene.scale.width, scene.scale.height);

        squad.forEach((key, index) => {
            const pos = positions[index];
            const enemy = new Unit(scene, pos.x, pos.y, key, false);
            
            // Небольшой рост ХП с уровнем (3% за этаж)
            // Чтобы враги на 10 этаже были чуть жирнее врагов на 1 этаже
            const hpMultiplier = 1 + (difficulty * 0.03); 
            
            enemy.maxHp = Math.floor(enemy.maxHp * hpMultiplier);
            enemy.hp = enemy.maxHp;
            enemy.difficultyMultiplier = hpMultiplier; 
            
            enemy.updateUI(); // Обновляем полоску ХП

            enemies.push(enemy);
        });
        
        console.log(`Spawned: [${squad.join(', ')}]`);

        return enemies;
    }

    // РАССТАНОВКА (Центрирование группы)
    static getPositions(count, GW, GH) {
        const centerY = GH * 0.55; 
        const stepX = 170; // Расстояние между врагами
        const positions = [];
        
        // Вычисляем ширину всей группы, чтобы отцентрировать её
        const totalWidth = (count - 1) * stepX;
        
        // Центр группы должен быть на 75% ширины экрана
        const groupCenterX = GW * 0.75;
        
        // Находим позицию первого (левого) врага
        const startX = groupCenterX - (totalWidth / 2);

        for (let i = 0; i < count; i++) {
            const x = startX + (i * stepX);
            // Зигзаг: четные выше, нечетные ниже (для визуального объема)
            const yOffset = (i % 2 === 0) ? 0 : 40;
            
            positions.push({ x: x, y: centerY + yOffset });
        }
        return positions;
    }
}
