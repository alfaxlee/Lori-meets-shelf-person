// === 遊戲主入口 ===
// 負責建立 Phaser 遊戲設定並啟動遊戲
import { GameScene } from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    // 設定固定邏輯解析度，確保所有裝置看到的空間一致
    width: 1280,
    height: 720,
    backgroundColor: '#ffffff',
    scale: {
        // 使用 FIT 模式自動等比例縮放以填滿螢幕
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    // 使用 class-based 場景取代 function-based 場景
    scene: [GameScene]
};

// 建立並啟動遊戲
const game = new Phaser.Game(config);
