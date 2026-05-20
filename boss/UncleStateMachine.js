// === 猥瑣大叔狀態機與 AI 邏輯模組 ===
// 負責猥瑣大叔的血量、狀態切換（一般/過載模式）與受傷處理
import { startUncleAttacks, cleanupHammer, cleanupAllSpikes, cleanupBallRush } from './UncleAttacks.js';

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
    overloadContainer: null, // 過載模式視覺容器
    overloadEyes: null,      // 過載模式眼睛
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
 */
function enterOverloadMode(scene) {
    if (uncleState.isOverload) return;
    uncleState.isOverload = true;

    // 震動螢幕表示進入強化狀態
    scene.cameras.main.shake(500, 0.01);
    
    // 建立過載模式的視覺容器
    const container = scene.add.container(refs.uncle.x, refs.uncle.y);
    container.setDepth(refs.uncle.depth + 1); 
    uncleState.overloadContainer = container;

    // 隱藏原本的大叔 Sprite (實體仍然存在用於物理碰撞)
    refs.uncle.setVisible(false);

    // --- 1. 頭部 (對應要求中原本黃色的部分，放入大叔照片) ---
    const headWidth = 160;
    const headHeight = 100;
    const head = scene.add.image(0, -80, '猥瑣大叔');
    head.setDisplaySize(headWidth, headHeight);
    container.add(head);

    // 在頭部大叔圖案上面重疊兩個黑色眼睛
    const eyeRadius = 25;
    const leftEye = scene.add.circle(-40, -90, eyeRadius, 0x000000);
    const rightEye = scene.add.circle(40, -90, eyeRadius, 0x000000);
    container.add([leftEye, rightEye]);
    uncleState.overloadEyes = [leftEye, rightEye];

    // --- 2. 身體與四肢 (使用長方形、三角形，關節處不相連) ---
    const gfx = scene.add.graphics();
    container.add(gfx);

    // 繪製黑色的幾何體
    gfx.fillStyle(0x000000, 1);

    // 軀幹 (黑色正方形)
    gfx.fillRect(-50, -30, 100, 100);

    // 軀幹內的白色裝飾 (白色正方形)
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(-30, -10, 60, 60);
    
    // 白色正方形內的黑色小圖案 (圓形與三角形)
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(0, 20, 10);
    // 上下左右的小三角形
    gfx.fillTriangle(-5, 0, 5, 0, 0, -8);  // 上
    gfx.fillTriangle(-5, 40, 5, 40, 0, 48); // 下
    gfx.fillTriangle(-15, 25, -15, 15, -23, 20); // 左
    gfx.fillTriangle(15, 25, 15, 15, 23, 20);  // 右

    // --- 3. 四肢 (根據圖片中的分離設計) ---
    // 左臂 (上抬) - 兩段式
    const armL_Upper = scene.add.graphics().fillStyle(0x000000, 1);
    armL_Upper.fillRect(-20, -40, 15, 60);
    armL_Upper.fillTriangle(-20, -10, -20, 10, -35, 0); // 側邊小刺
    
    const armL_Lower = scene.add.graphics().fillStyle(0x000000, 1);
    armL_Lower.fillRect(-25, -80, 20, 70);
    // 手部 (月亮/爪子形狀)
    const claw = scene.add.graphics().fillStyle(0x000000, 1);
    claw.beginPath();
    claw.arc(-15, -100, 40, 0, Math.PI * 2);
    claw.fillPath();
    claw.fillStyle(0xffffff, 1); // 用白色挖掉中間變成月亮感
    claw.fillCircle(-15, -120, 30);
    claw.fillStyle(0x000000, 1);

    const armL_Group = scene.add.container(-70, 20, [armL_Upper, armL_Lower, claw]);
    armL_Group.setAngle(-20);
    container.add(armL_Group);

    // 右臂 (向下延伸的尖刃)
    const armR = scene.add.graphics().fillStyle(0x000000, 1);
    // 繪製一個長三角形刃
    armR.fillTriangle(0, 0, 40, 40, 150, 150);
    // 加入側邊的尖刺
    armR.fillTriangle(30, 30, 50, 50, 70, 20);
    armR.fillTriangle(80, 80, 100, 100, 120, 70);
    
    const armR_Group = scene.add.container(70, 20, [armR]);
    container.add(armR_Group);

    // 下半身/腿部 (尖刺狀)
    const leg = scene.add.graphics().fillStyle(0x000000, 1);
    leg.fillTriangle(-40, 0, 40, 0, 0, 120);
    leg.fillTriangle(0, 40, 0, 70, 40, 60); // 側邊刺
    
    const leg_Group = scene.add.container(0, 80, [leg]);
    container.add(leg_Group);

    // --- 4. 動畫效果 ---
    // 讓四肢與頭部有不同的不穩定晃動
    scene.tweens.add({
        targets: [armL_Group, head],
        y: '+=10',
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
        targets: [armR_Group, leg_Group],
        y: '-=10',
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    uncleState.overloadLimbs = { armL_Group, armR_Group, leg_Group };

    // 過載模式屬性提升
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
        
        // 清理過載模式視覺
        if (uncleState.overloadContainer) {
            uncleState.overloadContainer.destroy();
            uncleState.overloadContainer = null;
        }
        if (uncleState.overloadEyes) {
            uncleState.overloadEyes.forEach(e => e.destroy());
            uncleState.overloadEyes = null;
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
    
    if (uncleState.overloadContainer) {
        uncleState.overloadContainer.destroy();
        uncleState.overloadContainer = null;
    }
    if (uncleState.overloadEyes) {
        uncleState.overloadEyes.forEach(e => e.destroy());
        uncleState.overloadEyes = null;
    }

    if (refs.uncleHPText) refs.uncleHPText.setText(`猥瑣大叔血量: ${uncleState.hp}`);
    const spawnX = x ?? (3 * scene.cameras.main.width / 4);
    const spawnY = y ?? (scene.cameras.main.height - 150);
    refs.uncle.setActive(true).setVisible(true).body.enable = true;
    refs.uncle.setPosition(spawnX, spawnY);
    refs.uncle.clearTint();
    
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

    // 更新過載模式視覺位置
    if (uncleState.isOverload) {
        if (uncleState.overloadContainer) {
            uncleState.overloadContainer.setPosition(refs.uncle.x, refs.uncle.y);
            // 輕微晃動效果，增加不穩定感
            uncleState.overloadContainer.x += Math.sin(time / 50) * 2;
        }
        if (uncleState.overloadEyes) {
            uncleState.overloadEyes[0].setPosition(refs.uncle.x - 20, refs.uncle.y - 40);
            uncleState.overloadEyes[1].setPosition(refs.uncle.x + 20, refs.uncle.y - 40);
        }
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
        uncleState.moveTimer -= delta;
        if (uncleState.moveTimer <= 0) {
            const speedBase = uncleState.isOverload ? 300 : 150;
            const speedMax = uncleState.isOverload ? 600 : 400;
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
    } else if (uncleState.isAttacking) {
        refs.uncle.setVelocityX(0);
    }
}
