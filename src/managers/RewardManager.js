// src/managers/RewardManager.js
import { CARDS_DB } from '../data/cards.js';

export class RewardManager {
    constructor() {
        // Разбиваем базу карт на списки по редкости
        this.common = [];
        this.rare = [];
        this.legendary = [];

        for (const [key, card] of Object.entries(CARDS_DB)) {
            if (card.rarity === 'legendary') this.legendary.push(key);
            else if (card.rarity === 'rare') this.rare.push(key);
            else this.common.push(key); // Все остальное - common
        }
    }

    // Получить 3 случайные карты для выбора
    getRewardOptions(count = 3) {
        const options = [];
        
        for (let i = 0; i < count; i++) {
            const rarity = this.rollRarity();
            let pool = this.common;

            if (rarity === 'legendary' && this.legendary.length > 0) pool = this.legendary;
            else if (rarity === 'rare' && this.rare.length > 0) pool = this.rare;
            
            // Выбираем случайную карту из пула
            const randomKey = pool[Math.floor(Math.random() * pool.length)];
            options.push(randomKey);
        }
        
        return options;
    }

    // "Рулетка" редкости
    rollRarity() {
        const rand = Math.random() * 100; // 0..100
        
        if (rand < 10) return 'legendary'; // 10% шанс (0-10)
        if (rand < 40) return 'rare';      // 30% шанс (10-40)
        return 'common';                   // 60% шанс (40-100)
    }
}
