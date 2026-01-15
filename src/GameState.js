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
    
    gold: 100, // <--- СТАРТОВЫЙ КАПИТАЛ
    
    mapData: null,
    currentFloor: 0,
    currentNode: null,
    mapGenerated: false,
    
    level: 1
};
