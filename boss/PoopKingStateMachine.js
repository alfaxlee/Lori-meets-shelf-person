// === 請屎皇 狀態機與 AI 邏輯模組 ===
// 負責請屎皇 的血量、受擊/死亡、以及靠近玩家追逐 AI 邏輯，並包含低於 200HP 的北極熊騎士模式
// 新增程式碼皆附上中文註解

import { startPoopKingAttacks, stopPoopKingAttacks } from './PoopKingAttacks.js';
import { playerState } from '../player/PlayerController.js';

// 請屎皇 的狀態資料
export const poopKingState = {
    hp: 500,             // 請屎皇血量 (修改為 500)
    maxHp: 500,
    isAttacking: false,  // 是否正在發動招式
    isKnightMode: false, // 是否已進入北極熊騎士模式 (新增中文註解：定義請屎皇是否進入騎士狀態)
    isCooldown: false    // 是否處於五秒輸出冷卻期 (新增)
};

// 共享的遊戲物件參考
let refs = {};

/**
 * 初始化狀態機所需的遊戲物件參考
 */
export function initPoopKingStateRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 處理請屎皇 受到的傷害
 */
export function handlePoopKingHit(scene, bullet, force, stunTime, damage, originX, originY) {
    // 檢查請屎皇 Sprite 是否存在且處於 active 狀態
    if (!refs.poopKing || !refs.poopKing.active) {
        if (bullet) bullet.destroy();
        return;
    }

    // 如果在騎士模式的 Combo 攻擊中，請屎皇為無敵狀態，不扣血亦不受子彈傷害
    // 但盾牌直接碰撞（bullet 為 null）不在此限，任何時候都應給予擊退 (修改)
    if (poopKingState.isKnightMode && poopKingState.isAttacking && bullet !== null) {
        if (bullet) bullet.destroy();
        return;
    }

    const srcX = bullet ? bullet.x : (originX ?? refs.poopKing.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.poopKing.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.poopKing.x, refs.poopKing.y);

    // 扣除血量
    poopKingState.hp -= damage;
    if (refs.poopKingHPText) {
        refs.poopKingHPText.setText(`請屎皇血量: ${poopKingState.hp}`);
    }

    // 判斷是否死亡
    if (poopKingState.hp <= 0) {
        handlePoopKingDeath(scene);
    } else {
        // 檢查是否需要進入騎士模式 (血量低於 200 且尚未進入) (新增中文註解：判定進入騎士模式)
        if (poopKingState.hp < 200 && !poopKingState.isKnightMode) {
            poopKingState.isKnightMode = true;

            // 1. 喊話字幕特效 (新增中文註解：請屎皇大喊字體)
            const shoutText = scene.add.text(refs.poopKing.x, refs.poopKing.y - 120, '請屎皇騎北極熊！', {
                fontSize: '38px',
                fill: '#00ff00',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6
            }).setOrigin(0.5);
            shoutText.setDepth(99999);

            scene.tweens.add({
                targets: shoutText,
                y: '-=60',
                alpha: 0,
                duration: 2000,
                onComplete: () => { shoutText.destroy(); }
            });

            // 2. 震動相機 (新增中文註解：震動相機加強轉場氣勢)
            scene.cameras.main.shake(500, 0.02);

            // 3. 啟動北極熊顯示與動畫 (新增中文註解：播放北極熊走路動畫)
            if (refs.polarBear) {
                refs.polarBear.setVisible(true);
                refs.polarBear.play('polar_bear_walk', true);
            }

            // 4. 調整碰撞箱與偏移，解決 Phaser setSize 使用 local 紋理尺寸乘上 scale 的問題 (新增中文註解：依比例換算 local 紋理尺寸)
            // 將請屎皇 Y 軸向上提 55px，防止因為碰撞箱突然向下變大而卡入地板
            refs.poopKing.y -= 55;

            // 換算 55px 世界座標高度到 unscaled 本地紋理高度 (新增中文註解：除以 scale 取得 unscaled 本地長度)
            const localHeightIncrease = 55 / refs.poopKing.scaleY;
            
            // setSize 使用 unscaled 紋理寬高：寬為 refs.poopKing.width，高為 refs.poopKing.height + 換算增加值
            refs.poopKing.body.setSize(refs.poopKing.width, refs.poopKing.height + localHeightIncrease, false);
            refs.poopKing.body.setOffset(0, 0);
            
            // 5. 設定渲染順序，確保北極熊在請屎皇後方，不會遮擋請屎皇 (新增中文註解：設定深度確保北極熊在後)
            refs.poopKing.setDepth(10);
            if (refs.polarBear) refs.polarBear.setDepth(9);

            // 6. 進入騎士模式玩家能量條長度改為 330 點（可衝刺 10 次）並立刻補滿 (新增中文註解：將玩家衝刺上限設為 10 次並補滿)
            playerState.maxDashEnergy = 330;
            playerState.dashEnergy = playerState.maxDashEnergy;
        }

        // 受擊後退並閃紅：
        // - 盾牌碰撞（bullet 為 null）：任何時候都給予完整擊退力道（與蘿莉受盾牌打擊一致），不受 isAttacking 限制 (修改)
        // - 子彈命中：非攻擊中才給予 0.5 倍衰減擊退
        if (!bullet) {
            // 盾牌全力擊退，無視是否正在 Combo (修改)
            refs.poopKing.body.setImmovable(false); // 暫時解除 Immovable 讓速度生效 (新增)
            refs.poopKing.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force - 100);
            refs.poopKing.setTint(0xff0000);
            scene.time.delayedCall(150, () => {
                if (refs.poopKing && refs.poopKing.active) refs.poopKing.clearTint();
                // 若仍在 Combo 中，擊退閃光結束後恢復 Immovable (新增)
                if (refs.poopKing && refs.poopKing.active && poopKingState.isAttacking) {
                    refs.poopKing.body.setImmovable(true);
                }
            });
        } else if (!poopKingState.isAttacking) {
            // 子彈命中，非 Combo 中才給予擊退 (修改)
            refs.poopKing.setVelocity(Math.cos(angle) * force * 0.5, Math.sin(angle) * force * 0.5 - 100);
            refs.poopKing.setTint(0xff0000);
            scene.time.delayedCall(150, () => {
                if (refs.poopKing && refs.poopKing.active && !poopKingState.isAttacking) refs.poopKing.clearTint();
            });
        }
        scene.cameras.main.shake(100, 0.005);
    }

    if (bullet) bullet.destroy();
}

/**
 * 處理請屎皇 死亡
 */
export function handlePoopKingDeath(scene) {
    // 隱藏並禁用請屎皇的物理本體與北極熊
    refs.poopKing.setActive(false).setVisible(false).body.enable = false;
    if (refs.polarBear) {
        refs.polarBear.setVisible(false);
    }
    scene.cameras.main.flash(500, 255, 0, 0);

    // 停止攻擊排程與清理
    stopPoopKingAttacks();
    cleanupPoopKing(scene);

    // 延遲 3 秒後重生
    scene.time.delayedCall(3000, () => {
        if (refs.onPoopKingDeath) {
            refs.onPoopKingDeath(scene);
        } else {
            respawnPoopKing(scene);
        }
    });
}

/**
 * 重生請屎皇
 */
export function respawnPoopKing(scene) {
    poopKingState.hp = poopKingState.maxHp;
    poopKingState.isAttacking = false;
    poopKingState.isKnightMode = false; // 重置騎士模式 (新增中文註解)
    poopKingState.isCooldown = false;   // 重置冷卻狀態 (新增)
    if (refs.polarBear) {
        refs.polarBear.setVisible(false);
    }
    if (refs.poopKing && refs.poopKing.body) {
        // 還原原始碰撞箱尺寸與偏移 (採用 unscaled 紋理寬高並置中) (新增中文註解)
        refs.poopKing.body.setSize(refs.poopKing.width, refs.poopKing.height, true);
        refs.poopKing.body.setOffset(0, 0);
        refs.poopKing.body.setImmovable(false); // 重生時還原為可推擠狀態 (新增)
        refs.poopKing.setDepth(0); // 還原預設深度 (新增中文註解)
    }

    // 還原玩家衝刺上限與能量到 100 (新增中文註解：還原玩家最大衝刺能量上限)
    playerState.maxDashEnergy = 100;
    if (playerState.dashEnergy > 100) playerState.dashEnergy = 100;

    if (refs.poopKingHPText) {
        refs.poopKingHPText.setText(`請屎皇血量: ${poopKingState.hp}`);
    }
    // 重新啟用請屎皇
    refs.poopKing.setActive(true).setVisible(true).body.enable = true;
    // 設定重生位置在畫面左側
    refs.poopKing.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 110);
    refs.poopKing.clearTint();

    startPoopKingAttacks(scene);
}

/**
 * 清理請屎皇 狀態
 */
export function cleanupPoopKing(scene) {
    stopPoopKingAttacks();
    poopKingState.isAttacking = false;
    poopKingState.isKnightMode = false; // 重置騎士模式 (新增中文註解)
    poopKingState.isCooldown = false;   // 重置冷卻狀態 (新增)
    if (refs.polarBear) {
        refs.polarBear.setVisible(false);
    }
    if (refs.poopKing && refs.poopKing.body) {
        // 還原原始碰撞箱尺寸與偏移 (採用 unscaled 紋理寬高並置中) (新增中文註解)
        refs.poopKing.body.setSize(refs.poopKing.width, refs.poopKing.height, true);
        refs.poopKing.body.setOffset(0, 0);
        refs.poopKing.body.setImmovable(false); // 清理時還原為可推擠狀態 (新增)
        refs.poopKing.setDepth(0); // 還原預設深度 (新增中文註解)
    }

    // 還原玩家衝刺上限與能量到 100 (新增中文註解：還原玩家最大衝刺能量上限)
    playerState.maxDashEnergy = 100;
    if (playerState.dashEnergy > 100) playerState.dashEnergy = 100;
}

/**
 * 每幀更新請屎皇 的 AI 移動決策
 */
export function updatePoopKingStateMachine(scene, time, delta) {
    if (!refs.poopKing || !refs.poopKing.active) return;
    if (!refs.player || !refs.player.active) return;

    // 根據需求：在非攻擊狀態下，盡量靠近玩家，速度跟大叔一樣 (大叔地面追逐速度 150~400，跳躍力 -600)
    if (!poopKingState.isAttacking) {
        const poopKing = refs.poopKing;
        const player = refs.player;
        const dx = player.x - poopKing.x;
        const dist = Math.abs(dx);
        const dir = Math.sign(dx);

        // 左右追逐玩家，速度設為大叔物理解算的中間值 280 (新增中文註解：朝玩家方向追逐移動)
        const chaseSpeed = 280;
        poopKing.setVelocityX(dir * chaseSpeed);

        // 翻轉 Sprite 朝向
        poopKing.setFlipX(dir === -1);

        // 如果玩家在高處且距離較遠，有一定機率跳躍追趕 (新增中文註解：跳躍追趕判定)
        const jumpChance = dist > 300 ? 0.02 : 0.005; // 每一幀的機率 (約每秒 30% - 70%)
        if (poopKing.body.touching.down && Math.random() < jumpChance) {
            poopKing.setVelocityY(-600); // 跳躍力 -600 (同大叔)
        }
    }

    // 騎士模式下更新北極熊精靈的位置與朝向 (新增中文註解：同步北極熊與請屎皇位置)
    if (poopKingState.isKnightMode && refs.polarBear) {
        refs.polarBear.x = refs.poopKing.x;
        
        // 依照數學精準公式，將北極熊的 Y 對齊在 poopKing.y + (displayHeight / 2) + 35 處
        // 使其熊掌恰好緊貼地面不穿地，且坐騎外觀緊密貼合 (新增中文註解：北極熊貼合地面不穿地)
        const halfDisplayHeight = refs.poopKing.displayHeight / 2;
        refs.polarBear.y = refs.poopKing.y + halfDisplayHeight + 35; 
        
        refs.polarBear.setFlipX(refs.poopKing.flipX);
        refs.polarBear.setVisible(refs.poopKing.visible && refs.poopKing.active);
        
        // 設定渲染順序，確保北極熊在請屎皇後方，不會遮擋請屎皇 (新增中文註解：同步深度確保不遮擋)
        refs.poopKing.setDepth(10);
        refs.polarBear.setDepth(9);
    }
}
