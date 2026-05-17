// === 猥瑣大叔控制模組 ===
// 負責猥瑣大叔的基本狀態與受傷處理（目前無 AI，僅有物理與受傷反應）

// --- 共享參考 ---
let refs = {};

// 猥瑣大叔的狀態
export const uncleState = {
    hp: 800,       // 猥瑣大叔血量
    maxHp: 800,
    isHit: false,       // 是否處於受擊硬直
    hitStunTimer: 0,    // 受擊硬直倒數計時
};

/**
 * 初始化猥瑣大叔所需的遊戲物件參考
 * @param {object} gameRefs - 包含 uncle 的物件
 */
export function initUncleRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 處理猥瑣大叔受到的傷害
 * 後座力（force）為蘿莉的一半
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {Phaser.GameObjects.Sprite|null} bullet - 擊中的子彈（盾牌攻擊時為 null）
 * @param {number} force - 原始擊退力道（會自動減半）
 * @param {number} stunTime - 硬直時間（毫秒）
 * @param {number} damage - 傷害值
 * @param {number} [originX] - 攻擊來源 X（盾牌攻擊用）
 * @param {number} [originY] - 攻擊來源 Y（盾牌攻擊用）
 */
export function handleUncleHit(scene, bullet, force, stunTime, damage, originX, originY) {
    if (!refs.uncle || !refs.uncle.active) {
        if (bullet) bullet.destroy();
        return;
    }

    // 計算擊退角度（bullet 為 null 時使用 originX/Y）
    const srcX = bullet ? bullet.x : (originX ?? refs.uncle.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.uncle.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.uncle.x, refs.uncle.y);

    // 扣血
    uncleState.hp -= damage;

    // 更新血量文字
    if (refs.uncleHPText) {
        refs.uncleHPText.setText(`猥瑣大叔血量: ${uncleState.hp}`);
    }

    if (uncleState.hp <= 0) {
        // 死亡處理：隱藏並閃紅
        refs.uncle.setActive(false).setVisible(false).body.enable = false;
        scene.cameras.main.flash(500, 255, 0, 0);

        scene.time.delayedCall(3000, () => {
            if (refs.onUncleDeath) {
                // Boss 輪替模式：通知外部處理（不自動重生）
                refs.onUncleDeath(scene);
            } else {
                // 預設行為：自動重生猥瑣大叔
                respawnUncle(scene);
            }
        });
    } else {
        // 受擊硬直
        uncleState.isHit = true;
        uncleState.hitStunTimer = stunTime;
        // 後座力減半（force / 2）
        const halfForce = force / 2;
        refs.uncle.setVelocity(Math.cos(angle) * halfForce, Math.sin(angle) * halfForce - 100);
        refs.uncle.setTint(0xff0000); // 閃紅
        scene.cameras.main.shake(100, 0.005);
    }

    if (bullet) bullet.destroy();
}

/**
 * 重生猥瑣大叔（重置 HP 並顯示在指定位置）
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {number} [x] - 重生 X 座標（預設畫面 3/4 處）
 * @param {number} [y] - 重生 Y 座標（預設地板上方）
 */
export function respawnUncle(scene, x, y) {
    uncleState.hp = uncleState.maxHp;
    if (refs.uncleHPText) refs.uncleHPText.setText(`猥瑣大叔血量: ${uncleState.hp}`);
    const spawnX = x ?? (3 * scene.cameras.main.width / 4);
    const spawnY = y ?? (scene.cameras.main.height - 150);
    refs.uncle.setActive(true).setVisible(true).body.enable = true;
    refs.uncle.setPosition(spawnX, spawnY);
    refs.uncle.clearTint();
}

/**
 * 每幀更新猥瑣大叔邏輯
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {number} time - 遊戲時間
 * @param {number} delta - 幀間隔
 */
export function updateUncle(scene, time, delta) {
    if (!refs.uncle || !refs.uncle.active) return;

    // 受擊硬直恢復
    if (uncleState.isHit) {
        uncleState.hitStunTimer -= delta;
        if (uncleState.hitStunTimer <= 0) {
            uncleState.isHit = false;
            refs.uncle.clearTint(); // 恢復原色
        }
    }
    // 目前沒有意識，不會主動移動
}
