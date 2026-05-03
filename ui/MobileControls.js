// === 手機觸控控制模組 ===
// 負責搖桿、按鈕等手機端操作介面

// --- 控制變數 ---
export let isActuallyMobile = false; // 真實手機偵測
export let forceControls = false;    // 關閉強制顯示，確保非手機不顯示 (修改)

// 手機輸入狀態（各模組共用，透過 import 存取）
export const mobileInput = {
    left: false, right: false, up: false,
    fireMg: false, fireSg: false, fireSn: false,
    reload: false, dash: false
};

// 搖桿元件參考
let joystickBase;
let joystickThumb;

/**
 * 偵測是否為手機裝置（在 create 階段呼叫）
 * @param {Phaser.Scene} scene - 遊戲場景
 */
export function detectMobile(scene) {
    // 結合 UserAgent 與觸控支援做更好的手機偵測
    isActuallyMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || !scene.sys.game.device.os.desktop;
}

/**
 * 建立手機控制介面（搖桿 + 按鈕）
 * @param {Phaser.Scene} scene - 遊戲場景
 */
export function setupMobileControls(scene) {
    const height = scene.cameras.main.height;
    const width = scene.cameras.main.width;
    // 修正：初始位置改為 120, height - 120 以符合 reposition 邏輯
    joystickBase = scene.add.circle(120, height - 120, 133, 0x888888, 0.5).setScrollFactor(0).setDepth(1000);
    joystickThumb = scene.add.circle(120, height - 120, 67, 0xcccccc, 0.8).setScrollFactor(0).setDepth(1001).setInteractive();
    scene.input.setDraggable(joystickThumb);

    // 搖桿拖曳邏輯
    scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (gameObject === joystickThumb) {
            const dx = dragX - joystickBase.x; 
            const dy = dragY - joystickBase.y;
            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 66);
            const angle = Math.atan2(dy, dx);
            
            gameObject.x = joystickBase.x + Math.cos(angle) * dist;
            gameObject.y = joystickBase.y + Math.sin(angle) * dist;
            
            mobileInput.left = (dx < -40); 
            mobileInput.right = (dx > 40); 
            mobileInput.up = (dy < -40);
        }
    });

    // 搖桿放開時重置位置與輸入
    scene.input.on('dragend', () => {
        joystickThumb.x = joystickBase.x; joystickThumb.y = joystickBase.y;
        mobileInput.left = mobileInput.right = mobileInput.up = false;
    });
    
    // 建立操作按鈕
    const rx = width - 150; const ry = height - 150;
    createBtn(scene, rx, ry - 240, 'MG', 0xffff00, 'fireMg');
    createBtn(scene, rx - 200, ry - 170, 'SG', 0x00ff00, 'fireSg');
    createBtn(scene, rx - 240, ry, 'SN', 0x00ffff, 'fireSn');
    createBtn(scene, rx, ry, 'RE', 0xff00ff, 'reload');
    createBtn(scene, rx - 440, ry, 'DASH', 0x00ffff, 'dash'); 
}

/**
 * 建立單一操作按鈕
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {number} x - 按鈕 X 座標
 * @param {number} y - 按鈕 Y 座標
 * @param {string} label - 按鈕文字
 * @param {number} color - 按鈕顏色
 * @param {string} key - 對應的 mobileInput 鍵名
 */
function createBtn(scene, x, y, label, color, key) {
    const b = scene.add.circle(x, y, 93, color, 0.6).setScrollFactor(0).setDepth(1000).setInteractive();
    const t = scene.add.text(x, y, label, { fontSize: '27px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    
    // 按下/放開/移出時切換輸入狀態
    b.on('pointerdown', (pointer) => { mobileInput[key] = true; b.setAlpha(0.9); });
    b.on('pointerup', (pointer) => { mobileInput[key] = false; b.setAlpha(0.6); });
    b.on('pointerout', (pointer) => { mobileInput[key] = false; b.setAlpha(0.6); });
    
    // 記錄按鈕位置偏移量，供 reposition 使用
    if (!scene.mobileButtons) scene.mobileButtons = [];
    scene.mobileButtons.push({ btn: b, txt: t, originalOffsetX: scene.cameras.main.width - x, originalOffsetY: scene.cameras.main.height - y });
}

/**
 * 視窗縮放時重新定位手機控制項
 * @param {Phaser.Scene} scene - 遊戲場景
 */
export function repositionMobileControls(scene) {
    const width = scene.cameras.main.width; const height = scene.cameras.main.height;
    if (joystickBase) { joystickBase.setPosition(120, height - 120); joystickThumb.setPosition(120, height - 120); }
    if (scene.mobileButtons) {
        scene.mobileButtons.forEach(item => {
            item.btn.setPosition(width - item.originalOffsetX, height - item.originalOffsetY);
            item.txt.setPosition(width - item.originalOffsetX, height - item.originalOffsetY);
        });
    }
}
