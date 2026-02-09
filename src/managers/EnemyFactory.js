// src/managers/EnemyFactory.js
 
import { Unit } from '../prefabs/Unit.js';
import { ENEMIES_DB } from '../data/enemies.js';
import { GameState } from '../GameState.js';
 
export class EnemyFactory {
     
    static createEnemies(scene, enemyKey = null) {
        // 1. ПРЯМОЙ СПАВН (БОССЫ)
        if (enemyKey) {
            const isBoss = ENEMIES_DB[enemyKey] && ENEMIES_DB[enemyKey].tier === 'boss';
            // Босса ставим по центру, обычного (если вдруг) чуть правее
            const x = isBoss ? scene.scale.width * 0.75 : scene.scale.width * 0.75;
            const y = isBoss ? scene.scale.height * 0.55 : scene.scale.height * 0.55;
            
            const unit = new Unit(scene, x, y, enemyKey, false);
            return [unit];
        }

        // 2. ГЕНЕРАЦИЯ ОТРЯДА (БЕЗ КЛЮЧА)
        const difficulty = (GameState.currentFloor || 0) + 1; 
        
        // --- НОВАЯ АГРЕССИВНАЯ ФОРМУЛА ---
        // Этаж 1: 3 очка (3 Слайма или 1 Рыцарь)
        // Этаж 2: 4 очка (1 Рыцарь + 1 Слайм)
        // Мы даем БАЗУ 2 очка + номер этажа.
        let budget = 2 + difficulty; 
        
        // Рандомный бонус (+0..2 очка), чтобы врагов было больше
        budget += Math.floor(Math.random() * 3);

        // Хард-кап на экран (чтобы не вылезли за пределы)
        if (budget > 12) budget = 12;

        const squad = [];
        const allEnemies = Object.keys(ENEMIES_DB).filter(k => ENEMIES_DB[k].tier !== 'boss');
        
        console.log(`--- SPAWN LOGIC START (Budget: ${budget}) ---`);

        // --- ЛОГИКА НАБОРА ---
        let attempts = 0;
        
        // Пытаемся набрать врагов
        while (budget > 0 && squad.length < 4 && attempts < 50) {
            attempts++;
            
            // Фильтруем тех, кого можем купить
            const affordable = allEnemies.filter(key => {
                const cost = ENEMIES_DB[key].cost || 1; // Защита от undefined
                return cost <= budget;
            });

            if (affordable.length === 0) break; // Денег нет ни на кого

            // Выбираем случайного
            const randKey = Phaser.Utils.Array.GetRandom(affordable);
            const cost = ENEMIES_DB[randKey].cost || 1;

            squad.push(randKey);
            budget -= cost;
        }

        // --- ГАРАНТИЯ МИНИМУМ 2 ВРАГОВ ---
        // Если вдруг заспавнился всего 1 враг (например, 1 Рыцарь на все деньги),
        // а мы хотим экшена -> добавляем ему в помощь маленького Слайма бесплатно.
        if (squad.length === 1 && difficulty > 0) {
            console.log("Only 1 enemy spawned. Adding a support Slime!");
            squad.push('slime');
        }

        // Защита от пустоты (если вообще все сломалось)
        if (squad.length === 0) squad.push('slime', 'slime');

        // 3. СОЗДАНИЕ ОБЪЕКТОВ
        const enemies = [];
        const positions = this.getPositions(squad.length, scene.scale.width, scene.scale.height);

        squad.forEach((key, index) => {
            const pos = positions[index];
            const enemy = new Unit(scene, pos.x, pos.y, key, false);
            
            // Увеличиваем ХП от этажа
            const hpMultiplier = 1 + (difficulty * 0.05); 
            enemy.maxHp = Math.floor(enemy.maxHp * hpMultiplier);
            enemy.hp = enemy.maxHp;
            enemy.difficultyMultiplier = hpMultiplier; 
            enemy.updateUI();

            enemies.push(enemy);
        });

        console.log(`Final Squad: ${squad.join(' + ')}`);
        return enemies;
    }

    // РАССТАНОВКА (Центрирование по вертикали и горизонтали)
    static getPositions(count, GW, GH) {
        const centerY = GH * 0.5; // Центр по высоте
        const stepX = 160; 
        const stepY = 60;  // Смещение по высоте для "глубины"

        const positions = [];
        
        // Правая половина экрана (от 50% до 90%)
        const areaCenterX = GW * 0.7; 
        
        // Начальная точка X (чтобы группа была по центру areaCenterX)
        const totalWidth = (count - 1) * stepX;
        const startX = areaCenterX - (totalWidth / 2);

        for (let i = 0; i < count; i++) {
            const x = startX + (i * stepX);
            // Зигзаг: четные выше, нечетные ниже
            const yOffset = (i % 2 === 0) ? -stepY : stepY;
            
            positions.push({ x: x, y: centerY + yOffset });
        }
        return positions;
    }
}
