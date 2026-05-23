// === 猥瑣大叔狀態機與 AI 邏輯模組 ===
// 負責猥瑣大叔的血量、狀態切換（一般/過載模式）與受傷處理
import { startUncleAttacks, stopUncleAttacks, scheduleNextSuperSpike, cleanupHammer, cleanupAllSpikes, cleanupBallRush } from './UncleAttacks.js';

// 猥瑣大叔的狀態
export const uncleState = {
    hp: 800,            // 猥瑣大叔血量
    maxHp: 800,
    isHit: false,       // 是否處於受擊硬直
    hitStunTimer: 0,    // 受擊硬直倒數計時
    moveTimer: 0,       // 隨機移動計時器
    isAttacking: false, // 是否正在進行攻擊
    hammer: null,       // 大槌物件
    spikes: [],         // 地刺物件陣列
    attackQueue: [],    // 攻擊佇列
    isOverload: false,  // 是否處於過載模式
    overloadContainer: null, // 過載模式視覺容器（一體化，所有元件都在內）
    moveSpeedMultiplier: 1.0
};

let refs = {};

/**
 * 初始化狀態機所需的遊戲物件參考
 */
export function initUncleStateRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 進入過載模式 (Overload Mode)
 * 此模式在血量小於 200 時啟動
 * 進入時：取消所有攻擊 → 隱藏大叔 Sprite → 建立一體化的黑暗實體容器
 */
function enterOverloadMode(scene) {
    if (uncleState.isOverload) return;
    uncleState.isOverload = true;

    // === 先取消所有進行中的攻擊 ===
    uncleState.isAttacking = false;
    uncleState.attackQueue = [];        // 清空攻擊佇列
    stopUncleAttacks();                 // 停止所有攻擊排程計時器
    cleanupHammer();                    // 清除大槌
    cleanupAllSpikes();                 // 清除所有地刺
    cleanupBallRush();                  // 清除黑球衝刺
    
    // 啟動過載模式專屬攻擊排程
    scheduleNextSuperSpike(scene);

    // 震動螢幕表示進入強化狀態
    scene.cameras.main.shake(500, 0.01);
    // 閃爍黑色代表黑暗力量甦醒
    scene.cameras.main.flash(300, 0, 0, 0, true);
    
    // === 隱藏原本的大叔 Sprite（物理碰撞體仍然存在） ===
    refs.uncle.setVisible(false);

    // === 建立過載模式的一體化視覺容器 ===
    // 所有部件（頭、軀幹、四肢、刺、眼睛）全部放入同一個 Container
    const container = scene.add.container(refs.uncle.x, refs.uncle.y);
    container.setDepth(refs.uncle.depth + 1);
    uncleState.overloadContainer = container;

    // === 加大碰撞箱與設為飄浮 ===
    refs.uncle.body.allowGravity = false;
    // 碰撞箱變大以涵蓋巨大的黑暗實體，避免下半身插在地板裡
    refs.uncle.body.setSize(refs.uncle.width * 1.5, refs.uncle.height * 2, true);

    // --- 繪製主體 Graphics（軀幹+刺+下半身） ---
    const bodyGfx = scene.add.graphics();
    container.add(bodyGfx);

    // ========== 軀幹 ==========
    // 黑色主軀幹（圓角矩形效果，用圓形+矩形組合）
    bodyGfx.fillStyle(0x111111, 1);
    bodyGfx.fillRoundedRect(-55, -35, 110, 110, 12); // 軀幹主體
    // 軀幹內的深紫色紋路裝飾
    bodyGfx.fillStyle(0x220033, 1);
    bodyGfx.fillRoundedRect(-35, -15, 70, 70, 8);
    // 核心圖案：黑色圓形 + 十字紋
    bodyGfx.fillStyle(0x000000, 1);
    bodyGfx.fillCircle(0, 20, 12);
    // 十字紋（上下左右小三角）
    bodyGfx.fillTriangle(-6, 0, 6, 0, 0, -10);   // 上
    bodyGfx.fillTriangle(-6, 40, 6, 40, 0, 50);   // 下
    bodyGfx.fillTriangle(-18, 26, -18, 14, -28, 20); // 左
    bodyGfx.fillTriangle(18, 26, 18, 14, 28, 20);   // 右

    // ========== 肩膀黑刺（左右各 3 根） ==========
    const drawShoulderSpikes = (side) => {
        // side: 1=右, -1=左
        const baseX = side * 55; // 肩膀外緣
        for (let i = 0; i < 3; i++) {
            const angle = (side > 0)
                ? (-Math.PI / 4 + i * Math.PI / 8) // 右邊：從 -45° 到 0°
                : (Math.PI + Math.PI / 4 - i * Math.PI / 8); // 左邊：從 225° 到 180°
            const spikeLen = 30 + i * 8;  // 每根刺長度不同
            const tipX = baseX + Math.cos(angle) * spikeLen;
            const tipY = -20 + i * 15 + Math.sin(angle) * spikeLen;
            const perpX = Math.cos(angle + Math.PI / 2) * 4;
            const perpY = Math.sin(angle + Math.PI / 2) * 4;
            bodyGfx.fillStyle(0x000000, 1);
            bodyGfx.fillTriangle(
                baseX + perpX, -20 + i * 15 + perpY,
                baseX - perpX, -20 + i * 15 - perpY,
                tipX, tipY
            );
        }
    };
    drawShoulderSpikes(1);  // 右肩
    drawShoulderSpikes(-1); // 左肩

    // ========== 頭頂黑刺（3 根向上發散） ==========
    for (let i = -1; i <= 1; i++) {
        const angle = -Math.PI / 2 + i * Math.PI / 8; // 向上偏左/中/偏右
        const spikeLen = 35 + Math.abs(i) * 5;
        const baseY = -85;
        const tipX = Math.cos(angle) * spikeLen;
        const tipY = baseY + Math.sin(angle) * spikeLen;
        const perpX = Math.cos(angle + Math.PI / 2) * 4;
        const perpY = Math.sin(angle + Math.PI / 2) * 4;
        bodyGfx.fillStyle(0x000000, 1);
        bodyGfx.fillTriangle(
            perpX, baseY + perpY,
            -perpX, baseY - perpY,
            tipX, tipY
        );
    }

    // ========== 下半身（尖刺裙擺） ==========
    bodyGfx.fillStyle(0x111111, 1);
    // 中央大三角
    bodyGfx.fillTriangle(-50, 75, 50, 75, 0, 160);
    // 左右小刺
    bodyGfx.fillTriangle(-50, 75, -30, 75, -55, 130);
    bodyGfx.fillTriangle(50, 75, 30, 75, 55, 130);

    // --- 頭部 ---
    // 在軀幹上方放置大叔照片作為頭部
    const headWidth = 140;
    const headHeight = 90;
    const head = scene.add.image(0, -80, '猥瑣大叔');
    head.setDisplaySize(headWidth, headHeight);
    // 頭部加上深色 tint，讓它和黑暗主題融合
    head.setTint(0x666666);
    container.add(head);

    // 在頭部上面疊加兩個發光紅色眼睛
    const eyeRadius = 8;
    const leftEye = scene.add.circle(-25, -85, eyeRadius, 0xff0000);
    const rightEye = scene.add.circle(25, -85, eyeRadius, 0xff0000);
    leftEye.setAlpha(0.9);
    rightEye.setAlpha(0.9);
    container.add([leftEye, rightEye]);

    // 紅色眼睛脈動效果（在 container 內，不會晃來晃去）
    scene.tweens.add({
        targets: [leftEye, rightEye],
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // --- 左臂：帶五指爪手 ---
    const armLGfx = scene.add.graphics();
    // 上臂（從肩膀往外下延伸）
    armLGfx.fillStyle(0x111111, 1);
    armLGfx.fillRect(-12, -5, 18, 55);    // 上臂主體
    // 前臂（稍微彎曲向下）
    armLGfx.fillRect(-15, 50, 18, 50);    // 前臂主體
    // 手掌（黑色圓形）
    armLGfx.fillStyle(0x000000, 1);
    armLGfx.fillCircle(-6, 105, 14);      // 手掌圓形
    // 五根手指（爪子形狀，向下扇形展開）
    for (let f = 0; f < 5; f++) {
        // 5 根手指從 -60° 到 60° 均勻分布
        const fingerAngle = Math.PI / 2 + (-2 + f) * (Math.PI / 8);
        const fingerLen = 20 + (f === 2 ? 5 : 0); // 中指最長
        const fx = -6 + Math.cos(fingerAngle) * 14;
        const fy = 105 + Math.sin(fingerAngle) * 14;
        const ftx = fx + Math.cos(fingerAngle) * fingerLen;
        const fty = fy + Math.sin(fingerAngle) * fingerLen;
        // 每根手指畫成細長三角形
        const pAngle = fingerAngle + Math.PI / 2;
        const pw = 3; // 手指寬度
        armLGfx.fillTriangle(
            fx + Math.cos(pAngle) * pw, fy + Math.sin(pAngle) * pw,
            fx - Math.cos(pAngle) * pw, fy - Math.sin(pAngle) * pw,
            ftx, fty
        );
    }
    // 上臂側邊小刺
    armLGfx.fillStyle(0x000000, 1);
    armLGfx.fillTriangle(-12, 15, -12, 30, -25, 22);

    // 左臂容器（定位在軀幹左肩外側）
    const armL_Group = scene.add.container(-65, -10, [armLGfx]);
    armL_Group.setAngle(-15); // 微微向外張開
    container.add(armL_Group);

    // --- 右臂：帶五指爪手（鏡像） ---
    const armRGfx = scene.add.graphics();
    // 上臂
    armRGfx.fillStyle(0x111111, 1);
    armRGfx.fillRect(-6, -5, 18, 55);
    // 前臂
    armRGfx.fillRect(-3, 50, 18, 50);
    // 手掌
    armRGfx.fillStyle(0x000000, 1);
    armRGfx.fillCircle(6, 105, 14);
    // 五根手指（鏡像方向）
    for (let f = 0; f < 5; f++) {
        const fingerAngle = Math.PI / 2 + (-2 + f) * (Math.PI / 8);
        const fingerLen = 20 + (f === 2 ? 5 : 0);
        const fx = 6 + Math.cos(fingerAngle) * 14;
        const fy = 105 + Math.sin(fingerAngle) * 14;
        const ftx = fx + Math.cos(fingerAngle) * fingerLen;
        const fty = fy + Math.sin(fingerAngle) * fingerLen;
        const pAngle = fingerAngle + Math.PI / 2;
        const pw = 3;
        armRGfx.fillTriangle(
            fx + Math.cos(pAngle) * pw, fy + Math.sin(pAngle) * pw,
            fx - Math.cos(pAngle) * pw, fy - Math.sin(pAngle) * pw,
            ftx, fty
        );
    }
    // 上臂側邊小刺（鏡像）
    armRGfx.fillStyle(0x000000, 1);
    armRGfx.fillTriangle(18, 15, 18, 30, 31, 22);

    // 右臂容器
    const armR_Group = scene.add.container(65, -10, [armRGfx]);
    armR_Group.setAngle(15); // 微微向外張開（鏡像）
    container.add(armR_Group);

    // 將四肢引用存入狀態中，供攻擊動畫讀取與控制
    uncleState.overloadLimbs = { armL_Group, armR_Group };

    // --- 動畫效果 ---
    // 雙臂簡單擺動，確認使用肩膀為關節（容器的 0,0 即為肩膀紅點處）
    scene.tweens.add({
        targets: armL_Group,
        angle: { from: -25, to: 10 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
        targets: armR_Group,
        angle: { from: 25, to: -10 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // 過載模式屬性提升：移動速度增加 50%
    uncleState.moveSpeedMultiplier = 1.5;
}

/**
 * 處理猥瑣大叔受到的傷害
 */
export function handleUncleHit(scene, bullet, force, stunTime, damage, originX, originY) {
    if (!refs.uncle || !refs.uncle.active) {
        if (bullet) bullet.destroy();
        return;
    }

    const srcX = bullet ? bullet.x : (originX ?? refs.uncle.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.uncle.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.uncle.x, refs.uncle.y);

    uncleState.hp -= damage;
    if (refs.uncleHPText) {
        refs.uncleHPText.setText(`猥瑣大叔血量: ${uncleState.hp}`);
    }

    // 檢查是否觸發過載模式
    if (uncleState.hp < 200 && !uncleState.isOverload) {
        enterOverloadMode(scene);
    }

    if (uncleState.hp <= 0) {
        // 死亡處理
        refs.uncle.setActive(false).setVisible(false).body.enable = false;
        scene.cameras.main.flash(500, 255, 0, 0);
        
        // 清理過載模式視覺容器（一體化，銷毀容器即可清除所有內部元件）
        if (uncleState.overloadContainer) {
            uncleState.overloadContainer.destroy();
            uncleState.overloadContainer = null;
            uncleState.overloadLimbs = null;
        }

        uncleState.isAttacking = false;
        uncleState.attackQueue = [];
        cleanupHammer();
        cleanupAllSpikes();
        cleanupBallRush();

        scene.time.delayedCall(3000, () => {
            if (refs.onUncleDeath) {
                refs.onUncleDeath(scene);
            } else {
                respawnUncle(scene);
            }
        });
    } else {
        refs.uncle.setTint(0xff0000);
        
        if (uncleState.isAttacking) {
            scene.time.delayedCall(100, () => {
                if (!uncleState.isHit && refs.uncle.active) refs.uncle.clearTint();
            });
        } else {
            uncleState.isHit = true;
            uncleState.hitStunTimer = stunTime;
            // 過載模式下擊退力減免更多
            const forceReduction = uncleState.isOverload ? 4 : 2;
            const finalForce = force / forceReduction;
            refs.uncle.setVelocity(Math.cos(angle) * finalForce, Math.sin(angle) * finalForce - 100);
            scene.cameras.main.shake(100, 0.005);
        }
    }

    if (bullet) bullet.destroy();
}

/**
 * 重生猥瑣大叔（重置狀態）
 */
export function respawnUncle(scene, x, y) {
    uncleState.hp = uncleState.maxHp;
    uncleState.isOverload = false;
    uncleState.moveSpeedMultiplier = 1.0;
    
    // 清理過載模式視覺容器
    if (uncleState.overloadContainer) {
        uncleState.overloadContainer.destroy();
        uncleState.overloadContainer = null;
        uncleState.overloadLimbs = null;
    }

    if (refs.uncleHPText) refs.uncleHPText.setText(`猥瑣大叔血量: ${uncleState.hp}`);
    const spawnX = x ?? (3 * scene.cameras.main.width / 4);
    const spawnY = y ?? (scene.cameras.main.height - 150);
    refs.uncle.setActive(true).setVisible(true).body.enable = true;
    refs.uncle.setPosition(spawnX, spawnY);
    refs.uncle.clearTint();
    
    // 恢復原本的碰撞箱與重力
    refs.uncle.body.setSize(refs.uncle.width, refs.uncle.height, true);
    refs.uncle.body.allowGravity = true;
    
    uncleState.isAttacking = false;
    uncleState.isHit = false;
    uncleState.attackQueue = [];
    cleanupHammer();
    cleanupAllSpikes();
    cleanupBallRush();
    startUncleAttacks(scene);
}

/**
 * 每幀更新狀態機邏輯
 */
export function updateUncleStateMachine(scene, time, delta) {
    if (!refs.uncle || !refs.uncle.active) return;

    // 更新過載模式視覺位置（容器一體化，直接跟隨大叔物理體位置）
    if (uncleState.isOverload && uncleState.overloadContainer) {
        uncleState.overloadContainer.setPosition(refs.uncle.x, refs.uncle.y);
    }

    // 更新大叔原本的 update 邏輯 (移動、硬直等)
    // 這裡直接調用原有的 updateUncle 邏輯，但為了整合，我們將其核心移動邏輯搬移或保持呼叫
    // 為了模組化，我們讓 updateUncle 只負責攻擊相關的跟隨，AI 移動則放在這裡
    
    // 受擊硬直恢復
    if (uncleState.isHit) {
        uncleState.hitStunTimer -= delta;
        if (uncleState.hitStunTimer <= 0) {
            uncleState.isHit = false;
            refs.uncle.clearTint();
        }
    }

    // AI 移動邏輯
    if (!uncleState.isAttacking && !uncleState.isHit) {
        if (uncleState.isOverload) {
            // 過載模式：漂浮移動，持續跟隨在玩家上方
            if (refs.player && refs.player.active) {
                const targetX = refs.player.x;
                const targetY = refs.player.y - 150; // 漂浮在玩家上方 150 像素處
                
                const dx = targetX - refs.uncle.x;
                const dy = targetY - refs.uncle.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                
                // 緩慢平滑地向目標點漂浮
                const speed = 200;
                refs.uncle.setVelocityX((dx / dist) * speed);
                refs.uncle.setVelocityY((dy / dist) * speed);
            }
        } else {
            // 一般模式：地上隨機移動
            uncleState.moveTimer -= delta;
            if (uncleState.moveTimer <= 0) {
                const speedBase = 150;
                const speedMax = 400;
                uncleState.moveTimer = Phaser.Math.Between(500, 1500);
                
                if (refs.player && refs.player.active) {
                    const dir = Math.sign(refs.player.x - refs.uncle.x);
                    const dist = Math.abs(refs.player.x - refs.uncle.x);

                    if (Phaser.Math.Between(0, 100) < 70) {
                        refs.uncle.setVelocityX(dir * Phaser.Math.Between(speedBase, speedMax));
                    } else {
                        refs.uncle.setVelocityX(-dir * Phaser.Math.Between(100, 200));
                    }

                    const jumpChance = dist > 300 ? 50 : 20;
                    if (refs.uncle.body.touching.down && Phaser.Math.Between(0, 100) < jumpChance) {
                        refs.uncle.setVelocityY(-600);
                    }
                }
            }
        }
    } else if (uncleState.isAttacking) {
        refs.uncle.setVelocity(0, 0);
    }
}
