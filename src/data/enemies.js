export const ENEMIES_DB = {
    "slime": {
        name: "Слайм", hp: 30, color: 0x00aa44,
        moves: [
            { type: "attack", value: 5, chance: 0.5, name: "Тычок" },
            { type: "defend", value: 5, chance: 0.3, name: "Сжаться" },
            { type: "strong_attack", value: 8, chance: 0.2, name: "Плевок" }
        ]
    },
    "knight": {
        name: "Рыцарь", hp: 60, color: 0x440088,
        moves: [
            { type: "attack", value: 10, chance: 0.6, name: "Удар мечом" },
            { type: "defend", value: 10, chance: 0.4, name: "Блок щитом" }
        ]
    }
};
