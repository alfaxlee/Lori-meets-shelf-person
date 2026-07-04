// === 顏王Yeah 狀態機與 AI 邏輯模組 ===
// 負責顏王Yeah 的血量、受擊/死亡、以及跳躍追逐玩家的 AI 邏輯
import { startYeahAttacks, stopYeahAttacks } from './YeahAttacks.js';

// 顏王Yeah 的狀態資料
export const yeahState = {
    hp: 1000,             // 顏王Yeah 血量 (修改為 1000)
    maxHp: 1000,
    holyEnergy: 0,        // 神盛魔法能量 (0 - 100)
    collectedBalls: 0     // 玩家目前收集到的黃色能量球數量 (最多 8)
};

let ballSpawnTimer = null; // 能量球生成計時器

// 共享的遊戲物件參考
let refs = {};

/**
 * 初始化狀態機所需的遊戲物件參考
 */
export function initYeahStateRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 處理顏王Yeah 受到的傷害
 */
export function handleYeahHit(scene, bullet, force, stunTime, damage, originX, originY) {
    if (!refs.yeah || !refs.yeah.active) {
        if (bullet) bullet.destroy();
        return;
    }

    const srcX = bullet ? bullet.x : (originX ?? refs.yeah.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.yeah.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.yeah.x, refs.yeah.y);

    yeahState.hp -= damage;
    if (refs.yeahHPText) {
        refs.yeahHPText.setText(`顏王Yeah血量: ${yeahState.hp}`);
    }

    if (yeahState.hp <= 0) {
        handleYeahDeath(scene);
    } else {
        // 受擊微小後退並閃紅
        refs.yeah.setVelocity(Math.cos(angle) * force * 0.5, Math.sin(angle) * force * 0.5 - 100);
        refs.yeah.setTint(0xff0000);
        scene.time.delayedCall(150, () => {
            if (refs.yeah && refs.yeah.active) refs.yeah.clearTint();
        });
        scene.cameras.main.shake(100, 0.005);
    }

    if (bullet) bullet.destroy();
}

/**
 * 處理顏王Yeah 死亡
 */
export function handleYeahDeath(scene) {
    refs.yeah.setActive(false).setVisible(false).body.enable = false;
    scene.cameras.main.flash(500, 255, 0, 0);

    // 停止所有排程 (佔位符)
    stopYeahAttacks();
    cleanupYeah(scene);

    scene.time.delayedCall(3000, () => {
        if (refs.onYeahDeath) {
            refs.onYeahDeath(scene);
        } else {
            respawnYeah(scene);
        }
    });
}

/**
 * 重生顏王Yeah
 */
export function respawnYeah(scene) {
    yeahState.hp = yeahState.maxHp;
    yeahState.holyEnergy = 0; // 重置能量
    yeahState.collectedBalls = 0; // 重置已收集球數
    if (refs.yeahHPText) {
        refs.yeahHPText.setText(`顏王Yeah血量: ${yeahState.hp}`);
    }
    if (refs.yeahEnergyText) {
        refs.yeahEnergyText.setVisible(true);
    }
    refs.yeah.setActive(true).setVisible(true).body.enable = true;
    refs.yeah.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 110);
    refs.yeah.clearTint();

    startYeahAttacks(scene);

    // 啟動每 0.5 秒 (500 毫秒) 生成黃色能量球的計時器
    if (ballSpawnTimer) {
        ballSpawnTimer.destroy();
    }
    ballSpawnTimer = scene.time.addEvent({
        delay: 500,
        callback: () => {
            if (refs.yeah && refs.yeah.active) {
                // 每次生成 3 顆能量球，讓玩家能快速收集
                for (let i = 0; i < 3; i++) {
                    spawnYellowEnergyBall(scene);
                }
            }
        },
        loop: true
    });
}

/**
 * 清理顏王Yeah 狀態
 */
export function cleanupYeah(scene) {
    stopYeahAttacks();
    
    // 停止生成能量球的計時器
    if (ballSpawnTimer) {
        ballSpawnTimer.destroy();
        ballSpawnTimer = null;
    }

    // 清空並銷毀畫面上所有能量球
    if (refs.yeahEnergyBalls) {
        refs.yeahEnergyBalls.clear(true, true);
    }
    
    // 隱藏能量條文字與 Graphics 元件
    if (refs.yeahEnergyText) refs.yeahEnergyText.setVisible(false);
    if (refs.yeahEnergyBar) {
        refs.yeahEnergyBar.clear();
        refs.yeahEnergyBar.setVisible(false);
    }
}

/**
 * 隨機生成黃色能量球
 */
function spawnYellowEnergyBall(scene) {
    // 能量條集滿 8 顆後，就停止生成新球
    if (yeahState.collectedBalls >= 8) return;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    
    // 隨機在遊戲畫面中生成位置，保留左右邊界，且 Y 座標設定在 height - 280 到 height - 130 之間 (位置更低，玩家更容易碰到)
    const x = Phaser.Math.Between(100, width - 100);
    const y = Phaser.Math.Between(height - 280, height - 130);

    // 建立 12px 半徑的黃色能量球，白色邊框，營造發光質感
    const ball = scene.add.circle(x, y, 12, 0xffd700, 1.0);
    ball.setStrokeStyle(2, 0xffffff, 1.0);
    scene.physics.add.existing(ball);
    
    // 徹底鎖定物理屬性，防止重力或其它外力影響（定點漂浮）
    ball.body.allowGravity = false;
    ball.body.setImmovable(true);
    ball.body.moves = false; // 停止所有物理運動計算以維持在定點

    // 加上呼吸微縮放動畫效果
    scene.tweens.add({
        targets: ball,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // 加入物理群組以供重疊碰撞檢測
    if (refs.yeahEnergyBalls) {
        refs.yeahEnergyBalls.add(ball);
    }
}

/**
 * 每幀更新顏王Yeah 的 AI 移動決策
 */
export function updateYeahStateMachine(scene, time, delta) {
    if (!refs.yeah || !refs.yeah.active) return;

    const player = refs.player;
    const yeah = refs.yeah;

    // 移動邏輯：用跳的靠近玩家，只能在跳躍於空中的時候水平移動，在地上時水平速度為 0
    if (yeah.body.touching.down) {
        // 在地上時：水平速度歸零
        yeah.setVelocityX(0);

        // 往玩家方向起跳 (起跳 Y 速度為 -583，高度約為哆啦噩夢 -825 的一半)
        yeah.setVelocityY(-583);

        // 決定起跳後的水平移動方向與速度 (向玩家靠攏，速度為 200)
        const directionX = (player.x < yeah.x) ? -1 : 1;
        yeah.setVelocityX(directionX * 200);

        // 翻轉精靈面向玩家
        yeah.setFlipX(directionX === -1);
    } else {
        // 在空中時：維持原本起跳時賦予的水平速度，不額外修改 (實現只能在空中移動)
    }
}
