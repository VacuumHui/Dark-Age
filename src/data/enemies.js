// src/data/enemies.js

export const ENEMIES_DB = {
    "slime": {
        name: "Ядовитый Слайм", 
        hp: 40, 
        color: 0x00aa44,
        moves: [
            // Обычная атака
            { 
                name: "Тычок", 
                chance: 0.5,
                actions: [ { type: "damage", value: 6 } ]
            },
            // Отравление (Урон + Яд)
            { 
                name: "Плевок", 
                chance: 0.3, 
                actions: [ 
                    { type: "damage", value: 3 },
                    { type: "apply_status", status: "poison", value: 2 } 
                ]
            },
            // Защита
            { 
                name: "Сжаться", 
                chance: 0.2, 
                target: "self", // Применяем на себя!
                actions: [ { type: "block", value: 5 } ]
            }
        ]
    },
    "knight": {
        name: "Рыцарь", 
        hp: 80, 
        color: 0x440088,
        moves: [
            { 
                name: "Рубящий удар", 
                chance: 0.5, 
                actions: [ { type: "damage", value: 10 } ]
            },
            { 
                name: "Боевой клич", 
                chance: 0.25, 
                target: "self",
                actions: [ 
                    { type: "apply_status", status: "strength", value: 3 }, // Бафф силы!
                    { type: "block", value: 5 }
                ]
            },
            {
                name: "Блок щитом",
                chance: 0.25,
                target: "self",
                actions: [ { type: "block", value: 12 } ]
            }
        ]
    }
};
