// === 大猩猩（無敵大猩猩）狀態機模組 ===
// 負責大猩猩的血量、狀態管理與受傷判定
// 目前設定：血量 200，攻擊模式為瘋狂跳躍與落地震波 (新增中文註解)

import { startGorillaAttacks, stopGorillaAttacks, isGorillaJumping } from './GorillaAttacks.js';

export const gorillaState = {
    hp: 200,                   // 大猩猩初始血量 (新增中文註解：大猩猩血量200)
    maxHp: 200,                // 最大血量
    isInvincible: false,       // 是否處於無敵狀態
    isAttacking: false         // 當前是否處於攻擊狀態
};

// 共享的遊戲物件參考 (新增中文註解)
let refs = {};

/**
 * 初始化狀態機所需的遊戲物件參考 (新增中文註解)
 */
export function initGorillaStateRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 處理大猩猩受擊與受傷判定 (新增中文註解：受到玩家武器子彈攻擊扣血與反饋)
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {Phaser.GameObjects.GameObject} bullet - 命中大猩猩的子彈
 * @param {number} force - 擊退力道
 * @param {number} upward - 向上拋力
 * @param {number} damage - 造成的傷害值
 */
export function handleGorillaHit(scene, bullet, force = 0, upward = 0, damage = 5) {
    if (!refs.gorilla || !refs.gorilla.active) return;

    // 扣除大猩猩血量 (新增中文註解)
    gorillaState.hp -= damage;
    if (refs.gorillaHPText) {
        refs.gorillaHPText.setText(`大猩猩血量: ${Math.max(0, gorillaState.hp)}`);
    }

    // 受擊閃紅反饋 (新增中文註解)
    refs.gorilla.setTint(0xff5555);
    scene.time.delayedCall(120, () => {
        if (refs.gorilla && refs.gorilla.active) {
            refs.gorilla.clearTint();
        }
    });
    scene.cameras.main.shake(80, 0.004);

    // 死亡判定 (新增中文註解)
    if (gorillaState.hp <= 0) {
        handleGorillaDeath(scene);
    }

    if (bullet) bullet.destroy();
}

/**
 * 處理大猩猩被擊敗 (新增中文註解：停止攻擊、播放金光並重生大猩猩)
 */
export function handleGorillaDeath(scene) {
    if (!refs.gorilla) return;
    stopGorillaAttacks(); // 停止所有跳躍攻擊排程 (新增中文註解)

    refs.gorilla.setActive(false).setVisible(false);
    if (refs.gorilla.body) refs.gorilla.body.enable = false;

    scene.cameras.main.flash(600, 255, 215, 0); // 播放金色閃光

    // 1.5 秒後重新生成大猩猩 (新增中文註解)
    scene.time.delayedCall(1500, () => {
        respawnGorilla(scene);
    });
}

/**
 * 重生/重置大猩猩狀態 (新增中文註解：重置血量為200並啟動瘋狂跳躍攻擊)
 */
export function respawnGorilla(scene) {
    gorillaState.hp = 200;
    gorillaState.maxHp = 200;
    gorillaState.isInvincible = false;
    gorillaState.isAttacking = false;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const groundTop = height - 70; // 地板頂部 Y 座標 (新增中文註解)

    if (refs.gorilla) {
        refs.gorilla.setActive(true).setVisible(true);
        if (refs.loli) {
            refs.gorilla.setDisplaySize(refs.loli.displayWidth * 1.25, refs.loli.displayHeight * 1.25);
        }
        const halfHeight = refs.gorilla.displayHeight / 2;
        // 設定大猩猩出生在右側地面上，底部精準貼齊地板 (新增中文註解)
        refs.gorilla.setPosition(3 * width / 4, groundTop - halfHeight);
        refs.gorilla.setAngle(0);
        
        if (refs.gorilla.body) {
            refs.gorilla.body.enable = true;
            refs.gorilla.body.allowGravity = false; // 關閉重力防止插入地板 (新增中文註解)
            refs.gorilla.body.setSize(refs.gorilla.width, refs.gorilla.height, true);
            refs.gorilla.setVelocity(0, 0);
            refs.gorilla.setImmovable(true); // 剛體固定 (新增中文註解)
        }
        refs.gorilla.clearTint();
    }

    if (refs.gorillaHPText) {
        refs.gorillaHPText.setText(`大猩猩血量: ${gorillaState.hp}`);
        refs.gorillaHPText.setVisible(true);
    }

    // 啟動瘋狂跳躍攻擊 (新增中文註解)
    startGorillaAttacks(scene);
}

/**
 * 每幀更新大猩猩邏輯 (新增中文註解：非跳躍時維持貼地穩定)
 */
export function updateGorilla(scene) {
    if (!refs.gorilla || !refs.gorilla.active) return;
    
    // 若不在空中跳躍中，維持貼地 (新增中文註解)
    if (!isGorillaJumping()) {
        const height = scene.cameras.main.height;
        const groundTop = height - 70;
        const halfHeight = refs.gorilla.displayHeight / 2;
        refs.gorilla.y = groundTop - halfHeight;
        if (refs.gorilla.body) {
            refs.gorilla.body.allowGravity = false;
            refs.gorilla.body.setVelocity(0, 0);
        }
    }
}

/**
 * 清理大猩猩狀態 (新增中文註解：離開或切換 Boss 時調用)
 */
export function cleanupGorilla(scene) {
    stopGorillaAttacks(); // 停止所有攻擊與計時器 (新增中文註解)

    if (refs.gorilla) {
        refs.gorilla.setActive(false).setVisible(false);
        if (refs.gorilla.body) refs.gorilla.body.enable = false;
        refs.gorilla.clearTint();
        refs.gorilla.setAngle(0);
    }
    if (refs.gorillaHPText) {
        refs.gorillaHPText.setVisible(false);
    }
}
