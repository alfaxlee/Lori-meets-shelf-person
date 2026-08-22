// === HUD 介面模組 ===
// 負責蘿莉血量文字和衝刺能量條的顯示與更新
import { playerState } from '../player/PlayerController.js';

// --- UI 元素參考 ---
let loliHPText;  // 蘿莉血量文字
let energyBar;   // 衝刺能量條 Graphics
let dashIndicatorText; // 衝刺時機警示文字 (新增中文註解)

/**
 * 建立 HUD 介面元素（在 create 階段呼叫）
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {number} loliHP - 蘿莉目前血量
 */
export function createHUD(scene, loliHP) {
    const width = scene.cameras.main.width;
    loliHPText = scene.add.text(width / 2, 60, `蘿莉血量: ${loliHP}`, { 
        fontSize: '30px', 
        fill: '#ff00ff', // 紫色/品紅色 (修改為蘿莉主顏色)
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 4,
        padding: { left: 10, right: 10, top: 8, bottom: 8 } // 加上 padding 避免描邊與字頂被截斷 (修改)
    }).setOrigin(0.5, 0);
    energyBar = scene.add.graphics();

    // 建立五倍大小的衝刺警示文字 (放置於能量條下方，右移避開大圓圈) (新增中文註解：建立大型警示文字)
    dashIndicatorText = scene.add.text(150, 182, '衝刺警示', {
        fontSize: '32px',
        fill: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 6
    });
}

/**
 * 更新蘿莉血量文字
 * @param {number} hp - 目前血量
 */
export function updateLoliHP(hp) {
    if (loliHPText) loliHPText.setText(`蘿莉血量: ${hp}`);
}

/**
 * 切換蘿莉血量文字的顯示/隱藏（Boss 輪替時使用）
 * @param {boolean} visible - 是否顯示
 */
export function showLoliHPText(visible) {
    if (loliHPText) loliHPText.setVisible(visible);
}

/**
 * 每幀繪製衝刺能量條
 * @param {number} dashEnergy - 目前能量
 * @param {number} maxDashEnergy - 最大能量
 * @param {number} dashEnergyColor - 能量條顏色
 * @param {boolean} isPoopKing - 是否正在與請屎皇戰鬥 (新增中文註解：僅在與請屎皇戰鬥時顯示衝刺警示)
 */
export function drawEnergyBar(dashEnergy, maxDashEnergy, dashEnergyColor, isPoopKing = false) {
    if (!energyBar) return;
    energyBar.clear();

    // 只有在與請屎皇戰鬥時才顯示衝刺警示文字 (新增中文註解)
    if (dashIndicatorText) {
        dashIndicatorText.setVisible(energyBar.visible && isPoopKing);
    }

    if (!energyBar.visible) return;

    energyBar.fillStyle(0x888888, 0.8);
    const barWidth = maxDashEnergy * 2;
    energyBar.fillRect(20, 100, barWidth, 20);
    energyBar.fillStyle(dashEnergyColor, 1);
    energyBar.fillRect(20, 100, barWidth * (dashEnergy / maxDashEnergy), 20);

    // 只有在與請屎皇戰鬥時才繪製衝刺警示圓圈 (新增中文註解)
    if (isPoopKing) {
        const indicatorX = 75; // 位於能量條下方
        const indicatorY = 200;

        // 繪製圓形黑外圈 (線寬 10，半徑 60)
        energyBar.lineStyle(10, 0x000000, 1.0);
        energyBar.strokeCircle(indicatorX, indicatorY, 60);

        // 如果亮燈，則填滿紅色核心 (半徑 40)
        if (playerState.isDashIndicatorLit) {
            energyBar.fillStyle(0xff0000, 1.0);
            energyBar.fillCircle(indicatorX, indicatorY, 40);
        }
    }
}

/**
 * 取得能量條 Graphics 物件（供衝刺模組做抖動動畫用）
 * @returns {Phaser.GameObjects.Graphics}
 */
export function getEnergyBar() {
    return energyBar;
}
