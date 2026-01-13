// src/GameState.js

export const GameState = {
    // Стартовая колода: 3 Удара, 3 Обороны
    deck: ["strike", "strike", "strike", "defend", "defend", "defend"], 
    
    // Здоровье героя (чтобы сохранялось между боями)
    maxHp: 50,
    currentHp: 50,
    
    // Текущий уровень (можно использовать для усиления врагов)
    level: 1
};
