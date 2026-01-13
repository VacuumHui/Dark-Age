// src/GameState.js

export const GameState = {
    // Стартовая колода: 2 Удара, 3 Обороны
    deck: ["strike", "strike", "defend", "defend", "defend"], 

    relics: [], // <-- СПИСОК ID РЕЛИКВИЙ (например, ["strawberry", "dumbbell"])
    // Здоровье героя (чтобы сохранялось между боями)
    maxHp: 50,
    currentHp: 50,
    gold: 0,    // <-- ВАЛЮТА
    
    // Текущий уровень (можно использовать для усиления врагов)
    level: 1
};
