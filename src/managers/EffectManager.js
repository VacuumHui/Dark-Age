// Файл: src/managers/EffectManager.js

export class EffectManager {
    constructor(scene) {
        this.scene = scene;
    }

    // ⚔️ ФИЗИЧЕСКИЙ УДАР (С НАПРАВЛЕНИЕМ)
    playHit(x, y, isTargetPlayer) {
        // 1. Вспышка (Взрыв на месте)
        const burst = this.scene.add.particles(x, y, 'flare', {
            speed: { min: 50, max: 150 },
            scale: { start: 2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 200,
            blendMode: 'ADD',
            quantity: 1
        });
        burst.explode();

        // 2. Искры (Летят конусом за спину жертвы)
        
        // Логика углов:
        // Если бьем Игрока (он слева) -> Искры летят ВЛЕВО (120...240 градусов)
        // Если бьем Врага (он справа) -> Искры летят ВПРАВО (-60...60 градусов)
        
        const minAngle = isTargetPlayer ? 120 : -60;
        const maxAngle = isTargetPlayer ? 240 : 60;

        const sparks = this.scene.add.particles(x, y, 'spark', {
            speed: { min: 300, max: 600 }, // Быстрый разлет
            angle: { min: minAngle, max: maxAngle }, // НАПРАВЛЕННЫЙ КОНУС
            scale: { start: 0.6, end: 0 },
            tint: 0xffaa00,
            lifespan: 350,
            gravityY: 500, // Немного падают вниз
            blendMode: 'ADD',
            quantity: 20
        });
        sparks.explode();

        // Тряска
        this.scene.cameras.main.shake(150, 0.01);

        this.cleanup([burst, sparks], 1000);
    }

    // 🛡️ БЛОК
    playBlock(x, y) {
        const shield = this.scene.add.particles(x, y, 'flare', {
            speed: 100,
            lifespan: 500,
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: 0x00ffff,
            blendMode: 'ADD',
            quantity: 10
        });
        shield.explode();
        this.cleanup([shield], 1000);
    }

    // ❤️ ЛЕЧЕНИЕ
    playHeal(x, y) {
        const hearts = this.scene.add.particles(x, y, 'flare', {
            speedY: { min: -50, max: -100 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.5, end: 1 },
            alpha: { start: 0.6, end: 0 },
            tint: 0x00ff00,
            lifespan: 1000,
            quantity: 8,
            frequency: 100,
            stopAfter: 8
        });
        this.cleanup([hearts], 2000);
    }

    // ☠️ ЯД
    playPoison(x, y) {
        const bubbles = this.scene.add.particles(x, y - 40, 'drop', {
            speedY: { min: 50, max: 150 },
            speedX: { min: -10, max: 10 },
            scale: { start: 0.8, end: 0 },
            color: [0x00aa00, 0x88ff00],
            lifespan: 800,
            quantity: 10,
            gravityY: 200
        });
        bubbles.explode();
        this.cleanup([bubbles], 1500);
    }

    // 💪 БАФФ
    playBuff(x, y) {
        const glow = this.scene.add.particles(x, y + 40, 'spark', {
            speedY: { min: -100, max: -200 },
            scale: { start: 0.5, end: 2 },
            alpha: { start: 1, end: 0 },
            tint: 0xff4400,
            lifespan: 800,
            blendMode: 'ADD',
            quantity: 12
        });
        glow.explode();
        this.cleanup([glow], 1500);
    }

    cleanup(emitters, delay) {
        this.scene.time.delayedCall(delay, () => {
            emitters.forEach(e => e.destroy());
        });
    }
}
