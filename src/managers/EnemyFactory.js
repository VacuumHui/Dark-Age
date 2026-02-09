// src/managers/EnemyFactory.js
 
import { Unit } from '../prefabs/Unit.js';
import { ENEMIES_DB } from '../data/enemies.js';
import { GameState } from '../GameState.js';
 
export class EnemyFactory {
     
    static createEnemies(scene, enemyKey = null) {
        // difficulty начинается с 1 (GameState.currentFloor + 1)
        const difficulty = GameState.currentFloor + 1; 
        const actMultiplier = GameState.act; // 1, 2, 3...
        
        // --- БАЛАНС БЮДЖЕТА ---
        // difficulty 1 (1 этаж) -> Бюджет 2 (Гарантированно 2 Слайма)
        // difficulty 2 (2 этаж) -> Бюджет 3 (1 Рыцарь ИЛИ 3 Слайма)
        let budget = difficulty + 1 + (actMultiplier - 1) * 2;
        
        // Небольшой рандом: с 40% шансом добавляем +1 к бюджету, чтобы было веселее
        if (Math.random() < 0.4) budget += 1;

        // Хард-кап (не больше 12 очков, чтобы не зависло и влезло на экран)
        if (budget > 12) budget = 12;

        // 1. ЕСЛИ ВРАГ ЗАДАН ВРУЧНУЮ (Например, Босс или Тест)
        if (enemyKey) {
            // Если это босс
            if (ENEMIES_DB[enemyKey].tier === 'boss') {
                const boss = new Unit(scene, scene.scale.width * 0.75, scene.scale.height * 0.55, enemyKey, false);
                return [boss];
            }
            // Если обычный
            const unit = new Unit(scene, scene.scale.width * 0.75, scene.scale.height * 0.55, enemyKey, false);
            return [unit];
        }

        // 2. ГЕНЕРАЦИЯ ОТРЯДА
        const squad = [];
        // Берем всех врагов, кроме боссов
        const allEnemies = Object.keys(ENEMIES_DB).filter(k => ENEMIES_DB[k].tier !== 'boss');
        
        let attempts = 0;
        
        // Пока есть деньги и место (макс 4 врага)
        while (budget > 0 && squad.length < 4 && attempts < 100) {
            attempts++;

            // ВАЖНО: Фильтруем врагов, которые нам по карману прямо сейчас
            const affordableEnemies = allEnemies.filter(key => ENEMIES_DB[key].cost <= budget);

            // Если никого не можем купить (бюджет остался, например 0.5, а минимум стоит 1) - выходим
            if (affordableEnemies.length === 0) break;

            // Выбираем случайного из доступных
            const randKey = Phaser.Utils.Array.GetRandom(affordableEnemies);
            const data = ENEMIES_DB[randKey];

            squad.push(randKey);
            budget -= data.cost;
        }

        // Защита от пустого массива (на всякий случай)
        if (squad.length === 0) squad.push('slime');

        // 3. СОЗДАНИЕ ЮНИТОВ И РАССТАНОВКА
        const enemies = [];
        const positions = this.getPositions(squad.length, scene.scale.width, scene.scale.height);

        squad.forEach((key, index) => {
            const pos = positions[index];
            const enemy = new Unit(scene, pos.x, pos.y, key, false);
            
            // Скейлинг ХП от этажа
            // Чуть уменьшаем рост ХП, так как врагов теперь больше
            const hpMultiplier = 1 + (difficulty * 0.05); 
            
            enemy.maxHp = Math.floor(enemy.maxHp * hpMultiplier);
            enemy.hp = enemy.maxHp;
            enemy.difficultyMultiplier = hpMultiplier; 
            enemy.updateUI();

            enemies.push(enemy);
        });

        console.log(`Spawn Squad: [${squad.join(', ')}] | Floor: ${GameState.currentFloor} | Remaining Budget: ${budget}`);
        return enemies;
    }

    // Расчет позиций (Центрирование группы)
    static getPositions(count, GW, GH) {
        const centerY = GH * 0.55; 
        const stepX = 170; // Расстояние между врагами

        const positions = [];
        
        // Считаем общую ширину группы
        const totalGroupWidth = (count - 1) * stepX;
        
        // Центр группы должен быть на 75% ширины экрана
        const groupCenterX = GW * 0.75;
        
        // Находим координату X для первого врага (самого левого)
        const startX = groupCenterX - (totalGroupWidth / 2);

        for (let i = 0; i < count; i++) {
            const x = startX + (i * stepX);
            // Зигзаг: -30, +30, -30... чтобы они не стояли в скучную линию
            const yOffset = (i % 2 === 0) ? -30 : 30;
            const y = centerY + yOffset;
            
            positions.push({ x, y });
        }
        return positions;
    }
}
