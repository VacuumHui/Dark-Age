// src/managers/EffectManager.js

export class EffectManager {
    constructor(scene) {
        this.scene = scene;
    }

    // Эффект физического удара (Искры и осколки)
    playHit(x, y) {
        // Создаем эмиттер (источник частиц)
        const emitter = this.scene.add.particles(x, y, 'flare', {
            speed: { min: 150, max: 350 },  // Скорость разлета
            angle: { min: 0, max: 360 },    // Во все стороны
            scale: { start: 0.5, end: 0 },  // От 0.5 до исчезновения
            blendMode: 'ADD',               // Режим наложения (для свечения)
            lifespan: 300,                  // Живут 0.3 секунды
            gravityY: 500,                  // Падают вниз
            quantity: 10,                   // Количество частиц за раз
            emitting: false                 // Не сыпать постоянно!
        });

        // БАБАХ! (Выпускаем 10-15 частиц единоразово)
        emitter.explode(15);

        // ВАЖНО: Удаляем эмиттер через секунду, чтобы память не забивалась
        this.scene.time.delayedCall(1000, () => {
            emitter.destroy();
        });
    }

    // Эффект лечения (Зеленые крестики или пузырьки, летящие вверх)
    playHeal(x, y) {
        const emitter = this.scene.add.particles(x, y, 'flare', {
            speed: { min: 50, max: 100 },
            angle: { min: 250, max: 290 }, // Строго вверх (угол ~270)
            scale: { start: 0.4, end: 0.8 },
            alpha: { start: 1, end: 0 },   // Исчезают прозрачностью
            tint: 0x00ff00,                // ЗЕЛЕНЫЙ ЦВЕТ
            lifespan: 800,
            quantity: 5,
            emitting: false
        });

        emitter.explode(10);
        
        this.scene.time.delayedCall(1500, () => emitter.destroy());
    }

    // Эффект получения щита (Синяя вспышка)
    playBlock(x, y) {
        const emitter = this.scene.add.particles(x, y, 'flare', {
            speed: 50,
            scale: { start: 1, end: 2 },   // Резко расширяется
            alpha: { start: 0.8, end: 0 },
            tint: 0x00ffff,                // ГОЛУБОЙ
            lifespan: 400,
            emitting: false
        });

        emitter.explode(1); // Одна большая вспышка
        this.scene.time.delayedCall(1000, () => emitter.destroy());
    }
}
