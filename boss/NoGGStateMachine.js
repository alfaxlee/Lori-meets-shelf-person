// === 我沒有GG 狀態機與 AI 邏輯模組 ===
// 負責新 Boss「我沒有GG」的血量、受擊擊退、地心引力下墜、發射迪克小刀攻擊、死亡自爆以及重生機制
// 新增程式碼皆附上中文註解

// 狀態資料 (新增中文註解：定義我沒有GG的血量狀態)
export const noGGState = {
    hp: 500,             // 我沒有GG血量
    maxHp: 500
};

// 共享的遊戲物件參考
let refs = {};
let attackTimer = null; // 發射迪克小刀的定時器 (新增中文註解：迪克小刀攻擊定時器)

/**
 * 初始化狀態機所需的遊戲物件參考 (新增中文註解)
 */
export function initNoGGStateRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 啟動發射迪克小刀攻擊排程 (新增中文註解：定時向玩家發射迪克小刀)
 */
export function startNoGGAttacks(scene) {
    stopNoGGAttacks();
    
    // 每 2.5 到 3.5 秒隨機發射一次迪克小刀 (新增中文註解：開啟迪克小刀攻擊排程)
    const scheduleNextAttack = () => {
        if (!refs.noGG || !refs.noGG.active) return;
        
        const delay = Phaser.Math.Between(2500, 3500);
        attackTimer = scene.time.delayedCall(delay, () => {
            if (refs.noGG && refs.noGG.active && refs.player && refs.player.active) {
                shootDickKnife(scene);
            }
            scheduleNextAttack();
        });
    };
    
    scheduleNextAttack();
}

/**
 * 停止發射迪克小刀攻擊 (新增中文註解)
 */
export function stopNoGGAttacks() {
    if (attackTimer) {
        attackTimer.remove();
        attackTimer = null;
    }
}

/**
 * 向玩家位置發射迪克小刀 (新增中文註解：發射迪克小刀攻擊函數)
 */
function shootDickKnife(scene) {
    if (!refs.noGG || !refs.noGG.active || !refs.player || !refs.player.active || !refs.dickKnives) return;

    // 計算 Boss 到玩家的角度
    const angle = Phaser.Math.Angle.Between(refs.noGG.x, refs.noGG.y, refs.player.x, refs.player.y);

    // 建立迪克小刀物理精靈
    const knife = refs.dickKnives.create(refs.noGG.x, refs.noGG.y, 'dickKnife');
    if (knife) {
        knife.setDisplaySize(120, 120); // 放大迪克小刀 (修改：尺寸從 45 放大至 120)
        
        // 假設原圖蠟燭尖端（火）朝向正上方，為了讓火朝向飛行方向，旋轉角度需加上 90 度 (Math.PI / 2)
        knife.setRotation(angle + Math.PI / 2); 

        // 將碰撞箱設為只有中央蠟燭與火的部分，盡量貼合 (剔除背景無碰撞箱)，設為原圖 40% 大小並置中
        knife.body.setSize(knife.width * 0.4, knife.height * 0.4);
        knife.body.setOffset(knife.width * 0.3, knife.height * 0.3);

        knife.body.allowGravity = false; // 直線飛行，不受重力影響
        scene.physics.velocityFromRotation(angle, 550, knife.body.velocity); // 以 550 速度直線飛向玩家

        // 提示紅光發光效果 (新增中文註解：迪克小刀紅光發光反饋)
        knife.setTint(0xff6666);

        // 5 秒後自動銷毀，避免佔用資源
        scene.time.delayedCall(5000, () => {
            if (knife && knife.active) knife.destroy();
        });
    }
}

/**
 * 處理我沒有GG 受到的傷害 (新增中文註解：處理受擊傷害、血量更新、擊退效果與死亡判定)
 */
export function handleNoGGHit(scene, bullet, force, stunTime, damage, originX, originY) {
    // 檢查 Sprite 是否存在且處於 active 狀態
    if (!refs.noGG || !refs.noGG.active) {
        if (bullet) bullet.destroy();
        return;
    }

    // 計算受擊方向角度
    const srcX = bullet ? bullet.x : (originX ?? refs.noGG.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.noGG.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.noGG.x, refs.noGG.y);

    // 扣除血量
    noGGState.hp -= damage;
    if (refs.noGGHPText) {
        refs.noGGHPText.setText(`我沒有GG血量: ${noGGState.hp}`);
    }

    // 判斷是否死亡
    if (noGGState.hp <= 0) {
        handleNoGGDeath(scene);
    } else {
        // 受擊後退並閃紅：配合地心引力 allowGravity = true，被擊退後會向上/向後飛出並自然往下墜落 (新增中文註解：給予受擊擊退速度，受重力影響墜落)
        refs.noGG.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force - 100);
        refs.noGG.setTint(0xff0000);
        scene.time.delayedCall(150, () => {
            if (refs.noGG && refs.noGG.active) refs.noGG.clearTint();
        });
        scene.cameras.main.shake(100, 0.005);
    }

    if (bullet) bullet.destroy();
}

/**
 * 處理我沒有GG 死亡 (新增中文註解)
 */
export function handleNoGGDeath(scene) {
    // 隱藏並禁用物理本體
    refs.noGG.setActive(false).setVisible(false).body.enable = false;
    scene.cameras.main.flash(500, 255, 0, 255); // 播放紫色閃光

    stopNoGGAttacks();
    cleanupNoGG(scene);

    // 延遲 3 秒後重生
    scene.time.delayedCall(3000, () => {
        if (refs.onNoGGDeath) {
            refs.onNoGGDeath(scene);
        } else {
            respawnNoGG(scene);
        }
    });
}

/**
 * 重生我沒有GG (新增中文註解：重置血量、開啟地心引力受重力往下墜、啟動迪克小刀攻擊排程)
 */
export function respawnNoGG(scene) {
    noGGState.hp = noGGState.maxHp;
    
    if (refs.noGG && refs.noGG.body) {
        // 還原與顯示尺寸一致的碰撞箱尺寸 (新增中文註解：修正碰撞箱尺寸為 displayWidth, displayHeight 避免過大覆蓋螢幕)
        refs.noGG.body.setSize(refs.noGG.width, refs.noGG.height, true);
        refs.noGG.body.setOffset(0, 0);
        refs.noGG.body.allowGravity = true; // 開啟地心引力判定，使其受重力影響會往下墜落 (修改)
        refs.noGG.body.setImmovable(false); // 設為可移動，以便能被子彈或盾牌推開
        
        // 設定水平阻力，使被擊退後能在地面滑動後停下
        refs.noGG.setDrag(400, 0); // (修改)
    }

    if (refs.noGGHPText) {
        refs.noGGHPText.setText(`我沒有GG血量: ${noGGState.hp}`);
    }
    
    // 重新啟用精靈並定位在畫面中央偏高處 (height - 350)，開局/重生時會自然受地心引力往下墜落落在地板上
    refs.noGG.setActive(true).setVisible(true).body.enable = true;
    refs.noGG.setPosition(scene.cameras.main.width / 2, scene.cameras.main.height - 350); // (修改)
    refs.noGG.setVelocity(0, 0);
    refs.noGG.clearTint();

    // 啟動迪克小刀攻擊排程 (新增中文註解：啟動攻擊排程)
    startNoGGAttacks(scene);
}

/**
 * 每幀更新邏輯 (新增中文註解)
 */
export function updateNoGGStateMachine(scene, time, delta) {
    // 受到物理引擎地心引力控制，自然碰撞與下墜
}

/**
 * 清理我沒有GG 狀態 (新增中文註解)
 */
export function cleanupNoGG(scene) {
    stopNoGGAttacks();
    if (refs.noGG) {
        refs.noGG.clearTint();
    }
    if (refs.dickKnives) {
        refs.dickKnives.clear(true, true);
    }
}
