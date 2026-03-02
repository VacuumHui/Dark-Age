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
        desc: "10 урона", 
        fullDesc: "Медленный, но мощный удар.",
        actions: [ 
            { type: "damage", value: 10} 
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
        cost: 2,
        rarity: "common",
        target: "enemy",
        color: 0x444444, // Темно-серый
        desc: "2 урона.\nНакладывает Слабость.",
        fullDesc: "Подлый удар в уязвимое место.\nВраг наносит на 25% меньше урона в течение 2 ходов.",
        actions: [
            { type: "damage", value: 2 },
            { type: "apply_status", status: "weak", value: 2 }
        ]
    },

    "iron_barrier": {
        name: "Железная завеса",
        cost: 4,
        rarity: "common",
        target: "self",
        color: 0x003366,
        desc: "15 блока",
        fullDesc: "Тяжелая защита.\nДает много блока, но стоит дорого.",
        actions: [ { type: "block", value: 15 } ]
    },

    "spiked_armor": {
        name: "Шипастая броня",
        cost: 2,
        rarity: "rare",
        target: "self",
        color: 0x225522,
        desc: "5 Блока\n3 Шипов",
        fullDesc: "Враг пожалеет, что тронул вас.\nШипы наносят урон атакующему.",
        actions: [
            { type: "block", value: 5 },
            { type: "apply_status", status: "thorns", value: 3 }
        ]
    },

    
    // --- ЛЕГЕНДАРНЫЕ (LEGENDARY) ---

     "mana_crystal": {
        name: "Кристалл Маны",
        cost: 3, // Бесплатно сыграть
        rarity: "legendary",
        target: "self",
        consume: true, // <--- НОВЫЙ ФЛАГ: УДАЛИТЬ ИЗ КОЛОДЫ ПРИ ИСПОЛЬЗОВАНИИ
        color: 0x00ffff, // Голубой
        desc: "Макс. Мана +1\nУдаляется из колоды",
        fullDesc: "Древний источник силы.\nУвеличивает вашу Максимальную Ману на 1.\nКарта исчезает после использования.",
        actions: [
            { type: "increase_max_mana", value: 1 }
        ]
},
    
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
    },
        // --- НОВЫЕ КАРТЫ (ОБЫЧНЫЕ) ---
    "shield_bash": {
        name: "Удар щитом",
        cost: 2,
        rarity: "common",
        target: "enemy",
        color: 0x5555aa,
        desc: "Урон = Блоку",
        fullDesc: "Наносит урон, равный вашему текущему показателю Щита.",
        actions: [ { type: "dmg_from_block" } ]
    },
    "poison_dagger": {
        name: "Кинжал Яда",
        cost: 2,
        rarity: "common",
        target: "enemy",
        color: 0x44aa44,
        desc: "1 Урона\n2 Яда",
        fullDesc: "Наносит 1 единицу урона и накладывает 2 стака Яда.",
        actions: [
            { type: "damage", value: 1 },
            { type: "apply_status", status: "poison", value: 2 }
        ]
    },

    // --- НОВЫЕ КАРТЫ (РЕДКИЕ) ---
    "cleave": {
        name: "Рассечение",
        cost: 3,
        rarity: "rare",
        target: "all_enemies", // Бьет всех
        color: 0xaa4444,
        desc: "4 Урона ВСЕМ\n+Рана",
        fullDesc: "Наносит 4 урона всем врагам. Накладывает Глубокую Рану (потеря 1 ХП каждый ход) на 5 ходов.",
        actions: [
            { type: "aoe_dmg", value: 4 },
            { type: "apply_status", status: "wound", value: 5 } // Наша замена кровотечению
        ]
    },
    "entrench": {
        name: "Окоп",
        cost: 2,
        rarity: "rare",
        target: "self",
        color: 0x224488,
        desc: "+40% к Щиту",
        fullDesc: "Окапываемся. Увеличивает ваш ТЕКУЩИЙ Щит на 40%.",
        actions: [ { type: "multiply_block" } ]
    },
    "despair": {
        name: "Отчаяние",
        cost: 2,
        rarity: "rare",
        target: "enemy",
        color: 0x550055,
        desc: "Динамичный урон",
        fullDesc: "Наносит 2 урона. Если ХП < 50%, наносит 10 урона. Если ХП < 10%, наносит 15 урона.",
        actions: [ { type: "dynamic_dmg", formula: "despair", value: 0 } ]
    },

    // --- НОВЫЕ КАРТЫ (ЛЕГЕНДАРНЫЕ) ---
    "blood_blade": {
        name: "Багровое Лезвие",
        cost: 1,
        rarity: "legendary",
        target: "enemy",
        color: 0xaa0000,
        desc: "Урон от потерь",
        fullDesc: "Наносит урон, равный 25% от вашего недостающего здоровья.",
        actions: [ { type: "dynamic_dmg", formula: "red_blade", value: 0 } ]
    },
    "execute": {
        name: "Добивание",
        cost: 2,
        rarity: "legendary",
        target: "enemy",
        color: 0x000000,
        desc: "Метка слабости",
        fullDesc: "Накладывает Метку на 1 ход. Если у цели меньше 20% ХП, любой следующий урон мгновенно уничтожит её.",
        actions: [ { type: "mark_target" } ]
    },
};
