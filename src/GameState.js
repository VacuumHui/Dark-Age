// Файл: src/GameState.js

export function createCardInstance(cardId) {
    return {
        id: cardId,
        uid: Date.now() + Math.random(),
        enchants: []
    };
}

export const GameState = {
    deck: [],
    relics: [],
    maxHp: 50,
    currentHp: 50,
    gold: 100,
    maxMana: 3,
    eventFightBonusGold: 0,
    
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

    // ПОЛНЫЙ СБРОС
    reset: function() {
        this.deck = [
            createCardInstance("strike"), createCardInstance("strike"), createCardInstance("strike"),
            createCardInstance("defend"), createCardInstance("defend"), createCardInstance("defend"),
            
            createCardInstance("shield_bash"),createCardInstance("poison_dagger"),createCardInstance("cleave"),
            createCardInstance("entrench"),createCardInstance("despair"),createCardInstance("blood_blade"),
            createCardInstance("execute"),
        ];
        this.relics = [];
        this.maxHp = 50;
        this.currentHp = 50; // <--- ВАЖНО: Сбрасываем на 50
        this.gold = 100;
        this.maxMana = 3;
        
        this.level = 1;
        this.act = 1;
        
        this.mapData = null;
        this.mapGenerated = false;
        this.currentFloor = 0;
        this.currentNode = null;
    }
};
