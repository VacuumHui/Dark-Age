// src/GameState.js

// Помощник для создания уникальной карты
export function createCardInstance(cardId) {
    return {
        id: cardId,                 // Ссылка на базу данных (например, "strike")
        uid: Date.now() + Math.random(), // Уникальный номер (чтобы отличать эту карту от других таких же)
        enchants: []                // Место под будущие зачарования
    };
}

export const GameState = {
    // ТЕПЕРЬ ЭТО МАССИВ ОБЪЕКТОВ, А НЕ СТРОК
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
    gold: 0,
    
    // Карта
    mapData: null,
    currentFloor: 0,
    currentNode: null,
    mapGenerated: false,
    
    level: 1
};
