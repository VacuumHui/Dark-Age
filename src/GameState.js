// src/GameState.js

export const GameState = {
    // Стартовая колода: 2 Удара, 3 Обороны
    deck: ["strike", "strike", "defend", "defend", "defend"], 

    relics: [], // <-- СПИСОК ID РЕЛИКВИЙ (например, ["strawberry", "dumbbell"])
    // Здоровье героя (чтобы сохранялось между боями)
    maxHp: 50,
    currentHp: 50,
    gold: 0,    // <-- ВАЛЮТА

    // --- КАРТА (НОВОЕ) ---
    mapData: null,      // Здесь будет лежать вся структура (массив этажей)
    currentFloor: 0,    // На каком мы этаже (0..9)
    currentNode: null,  // ID узла, где мы стоим сейчас (для сохранения пути)
    mapGenerated: false, // Флаг генерации
    
    // Текущий уровень (можно использовать для усиления врагов)
    level: 1
};
