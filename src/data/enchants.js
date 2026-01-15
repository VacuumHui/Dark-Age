// src/data/enchants.js

export const ENCHANTS_DB = {
    // --- ИЗМЕНЕНИЕ ЦИФР ---
    "sharpen": {
        name: "Точило",
        desc: "+3 Урона",
        rarity: "common",
        type: "stat_modifier",
        targetParam: "damage",
        value: 3
    },
    "feather": {
        name: "Перо",
        desc: "-1 Мана",
        rarity: "rare",
        type: "stat_modifier",
        targetParam: "cost",
        value: -1
    },

    // --- НОВЫЕ ЭФФЕКТЫ (С ЯВНЫМ УКАЗАНИЕМ ЦЕЛИ) ---
    
    "rivet": {
        name: "Заклепка",
        desc: "Дает 3 Блока", // Текст для игрока
        rarity: "common",
        type: "add_action",
        // ВАЖНО: target: 'self' означает "применить к тому, кто сыграл карту"
        action: { type: "block", value: 3, target: "self" } 
    },

    "fire_rune": {
        name: "Руна Огня",
        desc: "Накладывает 2 Яда",
        rarity: "rare",
        type: "add_action",
        // target: 'default' (или отсутствие) означает "применить к цели карты"
        action: { type: "apply_status", status: "poison", value: 2 } 
    },

    "vampire_rune": {
        name: "Руна Крови",
        desc: "Лечит 3 ХП",
        rarity: "legendary",
        type: "add_action",
        action: { type: "heal", value: 3, target: "self" } // Хил применяем на себя
    },
    
    "midas_touch": {
        name: "Золотая пыль",
        desc: "+1 Мана",
        rarity: "legendary",
        type: "add_action",
        action: { type: "restore_mana", value: 1, target: "self" }
    }
};
