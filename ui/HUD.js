// === HUD 介面模組 ===
// 負責蘿莉血量文字和衝刺能量條的顯示與更新

// --- UI 元素參考 ---
let loliHPText;  // 蘿莉血量文字
let energyBar;   // 衝刺能量條 Graphics

/**
 * 建立 HUD 介面元素（在 create 階段呼叫）
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {number} loliHP - 蘿莉目前血量
 */
export function createHUD(scene, loliHP) {
    const width = scene.cameras.main.width;
    loliHPText = scene.add.text(width / 2, 60, `蘿莉血量: ${loliHP}`, { fontSize: '30px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);
    energyBar = scene.add.graphics();
}

/**
 * 更新蘿莉血量文字
 * @param {number} hp - 目前血量
 */
export function updateLoliHP(hp) {
    if (loliHPText) loliHPText.setText(`蘿莉血量: ${hp}`);
}

/**
 * 每幀繪製衝刺能量條
 * @param {number} dashEnergy - 目前能量
 * @param {number} maxDashEnergy - 最大能量
 * @param {number} dashEnergyColor - 能量條顏色
 */
export function drawEnergyBar(dashEnergy, maxDashEnergy, dashEnergyColor) {
    if (!energyBar) return;
    energyBar.clear();
    energyBar.fillStyle(0x888888, 0.8);
    const barWidth = maxDashEnergy * 2;
    energyBar.fillRect(20, 100, barWidth, 20);
    energyBar.fillStyle(dashEnergyColor, 1);
    energyBar.fillRect(20, 100, barWidth * (dashEnergy / maxDashEnergy), 20);
}

/**
 * 取得能量條 Graphics 物件（供衝刺模組做抖動動畫用）
 * @returns {Phaser.GameObjects.Graphics}
 */
export function getEnergyBar() {
    return energyBar;
}
