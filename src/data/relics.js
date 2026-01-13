// src/data/relics.js

export const RELICS_DB = {
    // --- ОБЫЧНЫЕ ---
    "strawberry": {
        name: "Клубника",
        desc: "+5 Макс. ХП при поднятии.",
        rarity: "common",
        price: 150,
        icon: "🍓", // Пока эмодзи, потом спрайт
        triggers: {
            "onPickup": [
                { type: "increase_max_hp", value: 5 },
                { type: "heal", target: "player", value: 5 }
            ]
        }
    },
    "dumbbell": {
        name: "Гантеля",
        desc: "В начале боя дает 1 Силу.",
        rarity: "common",
        price: 100,
        icon: "🏋️",
        triggers: {
            "onBattleStart": [
                { type: "apply_status", target: "player", status: "strength", value: 1 }
            ]
        }
    },

    // --- РЕДКИЕ ---
    "vampire_amulet": {
        name: "Амулет Вампира",
        desc: "Лечит 3 ХП при убийстве врага.",
        rarity: "rare",
        price: 250,
        icon: "🧛",
        triggers: {
            "onKill": [
                { type: "heal", target: "player", value: 3 }
            ]
        }
    },
    "spiked_shield": {
        name: "Шипастый щит",
        desc: "В начале хода дает 2 Шипов.",
        rarity: "rare",
        price: 200,
        icon: "🌵",
        triggers: {
            "onTurnStart": [ // Срабатывает в начале хода ИГРОКА
                { type: "apply_status", target: "player", status: "thorns", value: 2 } // "thorns" надо будет добавить в StatusManager
            ]
        }
    }
};
