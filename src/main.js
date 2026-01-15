
// src/main.js
import { BattleScene } from './scenes/BattleScene.js';
import { MapScene } from './scenes/MapScene.js';
import { RestScene } from './scenes/RestScene.js'; // <-- Добавили

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
    // Добавляем RestScene в список
    scene: [MapScene, BattleScene, RestScene] 
};

const game = new Phaser.Game(config);
