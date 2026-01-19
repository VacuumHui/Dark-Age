// Файл: src/data/enchants.js

export const ENCHANTS_DB = {
    // --- COMMON (Обычные) ---
    "sharpen": {
        name: "Точило",
        desc: "+3 Урона",
        rarity: "common",
        type: "stat_modifier",
        targetParam: "damage",
        value: 3
    },
    "rivet": {
        name: "Заклепка",
        desc: "Дает 3 Блока",
        rarity: "common",
        type: "add_action",
        // target: 'self' означает применить к игроку
        action: { type: "block", value: 3, target: "self" }
    },
    "lightweight": {
        name: "Облегчение",
        desc: "-1 Мана",
        rarity: "rare",
        type: "stat_modifier",
        targetParam: "cost",
        value: -1
    },

    // --- RARE (Редкие) ---
    "fire_rune": {
        name: "Руна Огня",
        desc: "Накладывает 2 Яда", 
        rarity: "rare",
        type: "add_action",
        action: { type: "apply_status", status: "poison", value: 2 }
    },
    "ice_rune": {
        name: "Руна Льда",
        desc: "Накладывает Слабость",
        rarity: "rare",
        type: "add_action",
        action: { type: "apply_status", status: "weak", value: 1 }
    },
    "stone_rune": {
        name: "Руна Камня",
        desc: "Дает 1 Уязвимость",
        rarity: "rare",
        type: "add_action",
        action: { type: "apply_status", status: "vulnerable", value: 1 }
    },

    // --- LEGENDARY (Легендарные) ---
    "vampire_rune": {
        name: "Руна Крови",
        desc: "Лечит 3 ХП",
        rarity: "legendary",
        type: "add_action",
        // ИСПРАВЛЕНО: type: "heal" (вместо heal_owner) и target: "self"
        action: { type: "heal", value: 3, target: "self" }
    },
    "midas_touch": {
        name: "Золотая пыль",
        desc: "+1 Мана",
        rarity: "legendary",
        type: "add_action",
        action: { type: "restore_mana", value: 1, target: "self" }
    }
};
