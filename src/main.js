import { BattleScene } from './scenes/BattleScene.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    backgroundColor: '#111',
    pixelArt: true,
    scene: [BattleScene]
};

const game = new Phaser.Game(config);
