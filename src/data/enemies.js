// src/data/enemies.js

export const ENEMIES_DB = {
    // --- ОБЫЧНЫЕ ---
    "slime": {
        name: "Ядовитый Слайм", hp: 40, color: 0x00aa44,
        moves: [
            { name: "Тычок", chance: 0.5, actions: [{ type: "damage", value: 6 }] },
            { name: "Плевок", chance: 0.3, actions: [{ type: "damage", value: 3 }, { type: "apply_status", status: "poison", value: 2 }] },
            { name: "Сжаться", chance: 0.2, target: "self", actions: [{ type: "block", value: 5 }] }
        ]
    },
    "knight": {
        name: "Рыцарь", hp: 80, color: 0x440088,
        moves: [
            { name: "Удар", chance: 0.5, actions: [{ type: "damage", value: 10 }] },
            { name: "Клич", chance: 0.25, target: "self", actions: [{ type: "apply_status", status: "strength", value: 3 }, { type: "block", value: 5 }] },
            { name: "Блок", chance: 0.25, target: "self", actions: [{ type: "block", value: 12 }] }
        ]
    },

    // --- БОССЫ ---
    "boss_dragon": {
        name: "Древний Дракон", 
        hp: 250, 
        color: 0xff4400, // Оранжевый
        tier: "boss",    // МЕТКА БОССА
        moves: [
            // 1. Мощная атака
            { 
                name: "Огненное дыхание", 
                chance: 0.4, 
                actions: [ 
                    { type: "damage", value: 15 },
                    { type: "apply_status", status: "vulnerable", value: 2 } // Делает тебя уязвимым
                ] 
            },
            // 2. Бафф
            { 
                name: "Взлет", 
                chance: 0.3, 
                target: "self",
                actions: [ 
                    { type: "block", value: 20 },
                    { type: "apply_status", status: "strength", value: 2 }
                ] 
            },
            // 3. Мульти-атака (Когти)
            {
                name: "Когти",
                chance: 0.3,
                actions: [ { type: "damage", value: 8 } ] // Бьет слабее, но часто (можно прописать логику мультиудара позже)
            }
        ]
    }
};
