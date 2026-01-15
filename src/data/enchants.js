// src/data/enchants.js

export const ENCHANTS_DB = {
    // --- COMMON (Обычные - 60%) ---
    "sharpen": {
        name: "Точило",
        desc: "Урон +3",
        rarity: "common",
        type: "stat_modifier",
        targetParam: "damage",
        value: 3
    },
    "rivet": {
        name: "Заклепка",
        desc: "Блок +3",
        rarity: "common",
        type: "stat_modifier",
        targetParam: "block",
        value: 3
    },
    "lightweight": {
        name: "Облегчение",
        desc: "Стоимость -1 (минимум 0)",
        rarity: "rare", // Пусть будет редким, это сильно
        type: "stat_modifier",
        targetParam: "cost",
        value: -1
    },

    // --- RARE (Редкие - 30%) ---
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
        desc: "Дает 1 Уязвимость врагу",
        rarity: "rare",
        type: "add_action",
        action: { type: "apply_status", status: "vulnerable", value: 1 }
    },

    // --- LEGENDARY (Легендарные - 10%) ---
    "vampire_rune": {
        name: "Руна Крови",
        desc: "Лечит 3 ХП при использовании",
        rarity: "legendary",
        type: "add_action",
        action: { type: "heal_owner", value: 3 }
    },
    "midas_touch": {
        name: "Золотая пыль",
        desc: "Дает 1 Ману",
        rarity: "legendary",
        type: "add_action",
        action: { type: "restore_mana", value: 1 }
    }
};
