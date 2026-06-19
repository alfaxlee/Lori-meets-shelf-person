// === 遊戲主入口 ===
// 負責建立 Phaser 遊戲設定並啟動遊戲
import { GameScene } from './scenes/GameScene.js';
import { MainMenuScene, BossSelectScene } from './scenes/MainMenuScene.js';

// 動態計算邏輯寬度，保持邏輯高度為 720 像素，並依瀏覽器比例延伸空間與地板（寬度至少 1280）
const dynamicWidth = Math.max(1280, 720 * (window.innerWidth / window.innerHeight));

const config = {
    type: Phaser.AUTO,
    width: dynamicWidth,
    height: 720,
    backgroundColor: '#ffffff',
    scale: {
        // 使用 FIT 模式自動等比例縮放以填滿螢幕，因為寬高比已與視窗一致，因此不會產生空白或變形
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
    // 註冊所有遊戲場景，並將主選單放在最前面做為第一入口
    scene: [MainMenuScene, BossSelectScene, GameScene]
};

// 建立並啟動遊戲
const game = new Phaser.Game(config);
