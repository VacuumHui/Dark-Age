export const CARDS_DB = {
    "strike": { 
        name: "Удар", cost: 1, rarity: "common", target: "enemy", color: 0xaa0000, 
        desc: "6 урона", fullDesc: "Базовая атака.\nНаносит 6 единиц урона.",
        actions: [ { type: "damage", value: 6 } ]
    },
    "defend": { 
        name: "Оборона", cost: 1, rarity: "common", target: "self", color: 0x0055aa, 
        desc: "5 блока", fullDesc: "Поднять щиты!\nДает 5 защиты.",
        actions: [ { type: "block", value: 5 } ]
    },
    "heavy_strike": { 
        name: "Тяж. Удар", cost: 2, rarity: "common", target: "enemy", color: 0x880000, 
        desc: "12 урона", fullDesc: "Медленный, но мощный удар.",
        actions: [ { type: "damage", value: 12 } ]
    },
    "heal_potion": { 
        name: "Зелье", cost: 1, rarity: "rare", target: "any", color: 0x00aa00, 
        desc: "Лечит 6 HP", fullDesc: "Магическое варево.\nВосстанавливает 6 здоровья.",
        actions: [ { type: "heal", value: 6 } ]
    },
    "blood_ritual": { 
        name: "Ритуал", cost: 0, rarity: "rare", target: "self", color: 0x550000, 
        desc: "5 урона себе\n+2 маны", fullDesc: "Запретная магия.\nНаносит 5 урона ГЕРОЮ.\nВосстанавливает 2 маны.",
        actions: [ { type: "damage", value: 5 }, { type: "restore_mana", value: 2 } ]
    },
    "vampirism": {
        name: "Укус", cost: 1, rarity: "legendary", target: "enemy", color: 0x880088,
        desc: "4 урона\n4 хила вам", fullDesc: "Вампиризм.\nНаносит 4 урона врагу.\nЛечит вас на 4 HP.",
        actions: [ { type: "damage", value: 4 }, { type: "heal_owner", value: 4 } ]
    }
};
