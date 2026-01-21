// Файл: src/GameState.js

// Функция создания карты (для использования в других местах)
export function createCardInstance(cardId) {
    return {
        id: cardId,
        uid: Date.now() + Math.random(),
        enchants: []
    };
}

// Начальные значения (Константа, чтобы не потерять)
const INITIAL_STATE = {
    maxHp: 50,
    currentHp: 50,
    gold: 100,
    level: 1,
    act: 1,
    relics: []
};

export const GameState = {
    deck: [],
    relics: [],
    maxHp: 50,
    currentHp: 50,
    gold: 100,
    
    mapData: null,
    currentFloor: 0,
    currentNode: null,
    mapGenerated: false,
    
    level: 1,
    act: 1,

    bosses: {
        1: "boss_dragon",
        2: "boss_knight", 
        3: "boss_slime"
    },

    // ФУНКЦИЯ ПОЛНОГО СБРОСА
    reset: function() {
        this.deck = [
            createCardInstance("strike"), createCardInstance("strike"), createCardInstance("dirty_trick"),
            createCardInstance("defend"), createCardInstance("defend"), createCardInstance("defend")
        ];
        this.relics = [];
        this.maxHp = INITIAL_STATE.maxHp;
        this.currentHp = INITIAL_STATE.currentHp;
        this.gold = INITIAL_STATE.gold;
        this.level = INITIAL_STATE.level;
        this.act = INITIAL_STATE.act;
        
        this.mapData = null;
        this.mapGenerated = false;
        this.currentFloor = 0;
        this.currentNode = null;
    }
};
