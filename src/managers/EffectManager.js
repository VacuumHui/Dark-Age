// Файл: src/managers/EffectManager.js

export class EffectManager {
    constructor(scene) {
        this.scene = scene;
    }

    // ⚔️ ФИЗИЧЕСКИЙ УДАР (Резкий, быстрый)
    playHit(x, y) {
        // Вспышка
        const burst = this.scene.add.particles(x, y, 'flare', {
            speed: { min: 80, max: 110 },
            scale: { start: 3, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            quantity: 1
        });
        burst.explode();

        // Разлет искр
        const sparks = this.scene.add.particles(x, y, 'spark', {
            speed: { min: 230, max: 400 },
            angle: { min: -70, max: 70 },
            scale: { start: 1, end: 0 },
            tint: 0xffaa00, // Оранжевый
            lifespan: 500,
            gravityY: 0,  // Искры падают вниз
            blendMode: 'ADD',
            quantity: 70
        });
        sparks.explode();

        // Тряска экрана (Juice!)
        this.scene.cameras.main.shake(150, 0.04);

        // Очистка
        this.cleanup([burst, sparks], 1000);
    }

    // 🛡️ БЛОК (Силовое поле)
    playBlock(x, y) {
        // Расширяющееся кольцо (иллюзия через частицы)
        const shield = this.scene.add.particles(x, y, 'flare', {
            speed: 100,
            lifespan: 500,
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: 0x00ffff, // Голубой
            blendMode: 'ADD',
            quantity: 10
        });
        shield.explode();

        this.cleanup([shield], 1000);
    }

    // ❤️ ЛЕЧЕНИЕ (Мягкое, вверх)
    playHeal(x, y) {
        const hearts = this.scene.add.particles(x, y, 'flare', {
            speedY: { min: -50, max: -100 }, // Летят вверх
            speedX: { min: -20, max: 20 },
            scale: { start: 0.5, end: 1 },
            alpha: { start: 0.6, end: 0 },
            tint: 0x00ff00, // Зеленый
            lifespan: 1000,
            quantity: 8,
            frequency: 100, // Вылетают не сразу, а очередью
            stopAfter: 8
        });

        this.cleanup([hearts], 2000);
    }

    // ☠️ ЯД (Капает вниз, пузырится)
    playPoison(x, y) {
        const bubbles = this.scene.add.particles(x, y - 40, 'drop', {
            speedY: { min: 50, max: 150 }, // Падают вниз
            speedX: { min: -10, max: 10 },
            scale: { start: 0.8, end: 0 },
            color: [0x00aa00, 0x88ff00], // От темно-зеленого к светлому
            lifespan: 800,
            quantity: 10,
            gravityY: 200
        });
        bubbles.explode();
        
        this.cleanup([bubbles], 1500);
    }

    // 💪 БАФФ (Сила/Энергия - свечение снизу вверх)
    playBuff(x, y) {
        const glow = this.scene.add.particles(x, y + 40, 'spark', {
            speedY: { min: -100, max: -200 },
            scale: { start: 0.5, end: 2 },
            alpha: { start: 1, end: 0 },
            tint: 0xff4400, // Красный/Огненный
            lifespan: 800,
            blendMode: 'ADD',
            quantity: 12
        });
        glow.explode();
        
        this.cleanup([glow], 1500);
    }

    // Вспомогательный метод для удаления эмиттеров
    cleanup(emitters, delay) {
        this.scene.time.delayedCall(delay, () => {
            emitters.forEach(e => e.destroy());
        });
    }
}
