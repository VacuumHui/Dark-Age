// Файл: src/scenes/MapScene.js (ТЕСТОВЫЙ)
import { GameState } from '../GameState.js';

export class MapScene extends Phaser.Scene {
    constructor() { super({ key: 'MapScene' }); }

    create() {
        this.add.text(100, 100, "MAP SCENE WORKS!", { fontSize: '40px', color: '#00ff00' });
        
        // Временная кнопка для теста боя
        const btn = this.add.text(100, 200, "[ GO TO BATTLE ]", { fontSize: '30px', backgroundColor: '#333' })
            .setInteractive()
            .on('pointerdown', () => this.scene.start('BattleScene'));
    }
}
