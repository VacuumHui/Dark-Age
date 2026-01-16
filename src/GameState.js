// src/GameState.js

export function createCardInstance(cardId) {
    return {
        id: cardId,
        uid: Date.now() + Math.random(),
        enchants: []
    };
}

export const GameState = {
    deck: [
        createCardInstance("strike"), createCardInstance("strike"), createCardInstance("strike"),
        createCardInstance("defend"), createCardInstance("defend"), createCardInstance("defend")
    ],
    relics: [],
    
    maxHp: 50,
    currentHp: 50,
    gold: 100,
    
    mapData: null,
    currentFloor: 0,
    currentNode: null,
    mapGenerated: false,
    
    level: 1,
    act: 1, // <--- ТЕКУЩИЙ АКТ
    
    // КОНФИГУРАЦИЯ БОССОВ (Масштабируемость!)
    // Ключ: Номер Акта, Значение: ID врага из enemies.js
    bosses: {
        1: "boss_dragon",
        2: "boss_lich",
        3: "boss_test"
    }
};
