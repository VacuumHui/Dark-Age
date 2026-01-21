// Файл: src/GameState.js

export function createCardInstance(cardId) {
    return {
        id: cardId,
        uid: Date.now() + Math.random(),
        enchants: []
    };
}

const INITIAL_STATE = {
    maxHp: 50,
    currentHp: 50,
    gold: 100,
    maxMana: 3, // <--- ДОБАВИЛИ БАЗОВУЮ МАНУ
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
    
    maxMana: 3, // <--- ТЕКУЩИЙ ЛИМИТ МАНЫ
    
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

    reset: function() {
        this.deck = [
            createCardInstance("mana_crystal"), createCardInstance("mana_crystal"), createCardInstance("strike"),
            createCardInstance("defend"), createCardInstance("defend"), createCardInstance("defend")
        ];
        this.relics = [];
        this.maxHp = INITIAL_STATE.maxHp;
        this.currentHp = INITIAL_STATE.currentHp;
        this.gold = INITIAL_STATE.gold;
        this.maxMana = INITIAL_STATE.maxMana; // Сбрасываем ману при рестарте
        this.level = INITIAL_STATE.level;
        this.act = INITIAL_STATE.act;
        
        this.mapData = null;
        this.mapGenerated = false;
        this.currentFloor = 0;
        this.currentNode = null;
    }
};
