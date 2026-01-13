// src/main.js
import { BattleScene } from './scenes/BattleScene.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        // FIT растягивает игру, сохраняя пропорции
        mode: Phaser.Scale.FIT, 
        // Центрируем игру на экране
        autoCenter: Phaser.Scale.CENTER_BOTH,
        
        // --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
        // Было: 800x600 (4:3) -> Квадратное
        // Стало: 1280x720 (16:9) -> Широкоэкранное (как YouTube)
        width: 1280, 
        height: 720
    },
    // Делаем фон черным, чтобы сливался с рамками на очень длинных телефонах
    backgroundColor: '#000000', 
    pixelArt: true,
    scene: [BattleScene]
};

const game = new Phaser.Game(config);
