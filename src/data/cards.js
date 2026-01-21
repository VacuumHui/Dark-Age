// Файл: src/data/cards.js

export const CARDS_DB = {
    // --- ОБЫЧНЫЕ (COMMON) ---
    "strike": { 
        name: "Удар", 
        cost: 1, 
        rarity: "common", 
        target: "enemy", // Главная цель - враг
        color: 0xaa0000, 
        desc: "6 урона", 
        fullDesc: "Базовая атака.\nНаносит 6 единиц урона.",
        actions: [ 
            { type: "damage", value: 6 } // Бьет главную цель (врага)
        ]
    },
    
    "defend": { 
        name: "Оборона", 
        cost: 1, 
        rarity: "common", 
        target: "self", // Главная цель - я сам
        color: 0x0055aa, 
        desc: "5 блока", 
        fullDesc: "Поднять щиты!\nДает 5 защиты.",
        actions: [ 
            { type: "block", value: 5 } // Накладывает на главную цель (себя)
        ]
    },

    "heavy_strike": { 
        name: "Тяж. Удар", 
        cost: 2, 
        rarity: "common", 
        target: "enemy", 
        color: 0x880000, 
        desc: "12 урона", 
        fullDesc: "Медленный, но мощный удар.",
        actions: [ 
            { type: "damage", value: 12 } 
        ]
    },

    // --- РЕДКИЕ (RARE) ---
    "heal_potion": { 
        name: "Зелье", 
        cost: 1, 
        rarity: "rare", 
        target: "any", // Можно кинуть на кого угодно
        color: 0x00aa00, 
        desc: "Лечит 6 HP", 
        fullDesc: "Магическое варево.\nВосстанавливает 6 здоровья.",
        actions: [ 
            { type: "heal", value: 6 } // Лечит того, на кого кинули
        ]
    },

    "blood_ritual": { 
        name: "Ритуал", 
        cost: 0, 
        rarity: "rare", 
        target: "self", // Применяется на себя
        color: 0x550000, 
        desc: "5 урона себе\n+2 маны", 
        fullDesc: "Запретная магия.\nНаносит 5 урона ВАМ.\nВосстанавливает 2 маны.",
        actions: [ 
            { type: "damage", value: 5 },       // Бьет главную цель (себя)
            { type: "restore_mana", value: 2 }  // Дает ману главной цели (себе)
        ]
    },

    "dirty_trick": {
        name: "Грязный приём",
        cost: 1,
        rarity: "common",
        target: "enemy",
        color: 0x444444, // Темно-серый
        desc: "2 урона.\nНакладывает 2 Слабости.",
        fullDesc: "Подлый удар в уязвимое место.\nВраг наносит на 25% меньше урона в течение 2 ходов.",
        actions: [
            { type: "damage", value: 2 },
            { type: "apply_status", status: "weak", value: 2 }
        ]
    },

    // --- ЛЕГЕНДАРНЫЕ (LEGENDARY) ---
    "vampirism": {
        name: "Укус", 
        cost: 1, 
        rarity: "legendary", 
        target: "enemy", // Кидаем во ВРАГА
        color: 0x880088,
        desc: "4 урона\n4 хила вам", 
        fullDesc: "Вампиризм.\nНаносит 4 урона врагу.\nЛечит вас на 4 HP.",
        actions: [ 
            { type: "damage", value: 4 },               // Бьет врага
            { type: "heal", value: 4, target: "self" }  // ВАЖНО: Лечит СЕБЯ (используем target: self)
        ]
    },

    "adrenaline": {
        name: "Адреналин", 
        cost: 0, 
        rarity: "legendary", 
        target: "self", 
        color: 0xffaa00,
        desc: "Взять 2 карты\n5 урона себе", 
        fullDesc: "Рискованный маневр.\nВы берете 2 карты, но получаете 5 урона.",
        actions: [
            { type: "draw", value: 2 },
            { type: "damage", value: 5 }
        ]
    }
};
