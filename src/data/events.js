// src/data/events.js

export const EVENTS_DB = {
    "mysterious_fountain": {
        title: "Загадочный фонтан",
        text: "Вы находите фонтан с мутной водой. Он пахнет магией... и немного тухлятиной.",
        image: "⛲", // Заглушка, потом будет спрайт
        choices: [
            {
                text: "Пить (Восстановить все HP)",
                action: "heal_full",
                chance: 1.0 // 100% успех
            },
            {
                text: "Набрать воды (Получить Зелье)",
                action: "get_potion",
                chance: 1.0
            },
            {
                text: "Уйти",
                action: "leave",
                chance: 1.0
            }
        ]
    },
    "scary_thief": {
        title: "Вор в тени",
        text: "Вы видите гоблина, который считает золото. Он вас не заметил.",
        image: "👺",
        choices: [
            {
                text: "Ограбить (50% шанс: +50 золота / -10 ХП)",
                action: "steal_gold",
                chance: 0.5, // 50% успеха
                success: { type: "gold", value: 50 },
                fail: { type: "damage", value: 10 }
            },
            {
                text: "Напасть (Начать бой)",
                action: "fight",
                chance: 1.0
            },
            {
                text: "Пройти мимо",
                action: "leave",
                chance: 1.0
            }
        ]
    }
};
