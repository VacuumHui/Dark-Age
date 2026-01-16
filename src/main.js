// src/main.js

import { MenuScene } from './scenes/MenuScene.js';   // <-- Убедись, что импортировал
import { MapScene } from './scenes/MapScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { RestScene } from './scenes/RestScene.js';
import { EventScene } from './scenes/EventScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { UIScene } from './scenes/UIScene.js';

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
    // ВАЖНО: MenuScene ОБЯЗАНА БЫТЬ ПЕРВОЙ (индекс 0)
    scene: [MenuScene, MapScene, BattleScene, RestScene, EventScene, ShopScene, UIScene] 
};

const game = new Phaser.Game(config);
