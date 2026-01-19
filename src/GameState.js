// Файл: src/GameState.js

// ВАЖНО: слово export обязательно!
export function createCardInstance(cardId) {
    return {
        id: cardId,
        uid: Date.now() + Math.random(), // Уникальный ID
        enchants: [] // Место для зачарований
    };
}

export const GameState = {
    // Стартовая колода
    deck: [
        createCardInstance("strike"), 
        createCardInstance("strike"), 
        createCardInstance("strike"),
        createCardInstance("defend"), 
        createCardInstance("defend"), 
        createCardInstance("defend")
    ],
    
    relics: [],
    
    maxHp: 50,
    currentHp: 50,
    gold: 100, // Стартовое золото
    
    // Карта
    mapData: null,
    currentFloor: 0,
    currentNode: null,
    mapGenerated: false,
    
    level: 1,
    act: 1,

    // Боссы
    bosses: {
        1: "boss_dragon",
        2: "boss_knight", // Заглушка
        3: "boss_slime_king" // Заглушка
    }
};
