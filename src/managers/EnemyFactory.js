
 // src/managers/EnemyFactory.js
 
 import { Unit } from '../prefabs/Unit.js';
 import { ENEMIES_DB } from '../data/enemies.js';
 import { GameState } from '../GameState.js';
 
 export class EnemyFactory {
     
     static createEnemy(scene, x, y, enemyKey) {
         // 1. Получаем уровень сложности (текущий этаж + уровень акта)
         // Для простоты берем номер комнаты на карте (GameState.currentFloor)
         const difficulty = GameState.currentFloor + 1; // 1..10
 
         // 2. Рассчитываем множитель (Синусоида + Линейный рост)
-        // Линейно: каждый этаж враги сильнее на 10%
+        // Линейно: каждый этаж враги сильнее на 8%
         // Синусоида: каждые 3 этажа скачок сложности, потом спад
         
-        const linearGrowth = 1 + (difficulty * 0.10); 
-        const wave = Math.sin(difficulty) * 0.2; // Колебание +/- 20%
+        const linearGrowth = 1 + (difficulty * 0.08); 
+        const wave = Math.sin(difficulty) * 0.12; // Колебание +/- 12%
         
         // Итоговый множитель (не может быть меньше 1)
         const multiplier = Math.max(1, linearGrowth + wave);
 
         console.log(`Спавн врага: Уровень ${difficulty}, Множитель: x${multiplier.toFixed(2)}`);
 
         // 3. Создаем юнита
         const enemy = new Unit(scene, x, y, enemyKey, false);
 
         // 4. Применяем множитель к статам
         enemy.maxHp = Math.floor(enemy.maxHp * multiplier);
         enemy.hp = enemy.maxHp;
 
         // Также можно усиливать урон в moves (это сложнее, так как они в массиве)
         // Мы сделаем хитро: мы будем умножать урон прямо во время удара в Unit.js,
         // добавив врагу скрытый стат "level_strength".
         
         enemy.difficultyMultiplier = multiplier; // Запоминаем для расчетов урона
         enemy.updateUI();
 
         return enemy;
     }
 }
