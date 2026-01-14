// src/main.js
import { BattleScene } from './scenes/BattleScene.js';
import { MapScene } from './scenes/MapScene.js'; // <--- ВАЖНО: Импорт новой сцены

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1600,
        height: 720
    },
    backgroundColor: '#000000',
    pixelArt: true,
    // ВАЖНО: MapScene должна быть ПЕРВОЙ в списке!
    // Первая сцена в массиве запускается автоматически при старте.
    scene: [MapScene, BattleScene] 
};

const game = new Phaser.Game(config);
