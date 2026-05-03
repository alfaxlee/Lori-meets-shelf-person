// === 共享遊戲狀態模組 ===
// 集中管理所有模組需要共用的遊戲物件參考
// 避免模組之間循環引用，所有共享狀態都從這裡存取

/**
 * 遊戲共享狀態物件
 * 在 GameScene.create() 中初始化，各模組透過 import 存取
 */
export const state = {
    // --- 核心物件 ---
    player: null,       // 玩家 Sprite
    loli: null,         // 蘿莉 Boss Sprite
    platforms: null,    // 平台群組
    ground: null,       // 地板

    // --- 子彈群組 ---
    mgBullets: null,    // 彈弓子彈群組
    sgBullets: null,    // 霰彈槍子彈群組
    snBullets: null,    // 狙擊槍子彈群組

    // --- 敵人攻擊群組 ---
    shockwaves: null,   // 衝擊波群組
    lasers: null,       // 雷射攻擊群組
    enemyBalls: null,   // 敵人彈跳球群組

    // --- 蘿莉血量 ---
    loliHP: 600,        // 目前血量
    loliMaxHP: 600,     // 最大血量

    // --- 衝刺系統 ---
    dashEnergy: 100,        // 衝刺能量
    maxDashEnergy: 100,     // 最大衝刺能量
    dashCost: 33,           // 衝刺消耗
    energyRegen: 0.5,       // 能量回復速率
    isDashing: false,       // 是否正在衝刺
    isInvincible: false,    // 衝刺無敵狀態
    dashEnergyColor: 0x00ffff, // 能量條顏色
};
