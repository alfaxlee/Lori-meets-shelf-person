// === 玩家控制與狀態模組 ===
// 負責玩家的移動、衝刺邏輯與相關狀態管理
import { mobileInput, isActuallyMobile } from '../ui/MobileControls.js';
import { getEnergyBar } from '../ui/HUD.js';
import { createDashDust } from './DashEffects.js';

export const playerState = {
    dashEnergy: 100,
    maxDashEnergy: 100,
    dashCost: 33, // 減少衝刺消耗，在不回復的情況下可衝刺三次
    energyRegen: 0.5,
    isDashing: false,
    isInvincible: false, // 衝刺無敵狀態
    dashEnergyColor: 0x00ffff, // 衝刺能量條顏色
    cannotMove: false, // 限制玩家移動狀態 (新增中文註解：定義玩家是否被定身)
    isDashIndicatorLit: false // 衝刺時機指示器是否亮起 (新增中文註解)
};

/**
 * 每幀更新玩家邏輯 (包含移動與衝刺)
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {Phaser.GameObjects.Sprite} player - 玩家 Sprite
 * @param {Phaser.GameObjects.Sprite} boss - 當前 Boss Sprite (用於自動瞄準衝刺)
 * @param {Function} createDashShieldFn - 產生護盾的 callback
 */
export function updatePlayer(scene, player, boss, createDashShieldFn) {
    const s = playerState;

    if (s.dashEnergy < s.maxDashEnergy) {
        s.dashEnergy = Math.min(s.maxDashEnergy, s.dashEnergy + s.energyRegen);
    }

    // 檢查是否處於靜止狀態，且在 combo 之外 (定身狀態為 combo 期間，故須排他) (新增中文註解：靜止 0.5 秒回滿能量條邏輯)
    const isStill = Math.abs(player.body.velocity.x) < 0.1 && 
                    Math.abs(player.body.velocity.y) < 0.1 && 
                    !s.isDashing && 
                    !s.cannotMove;

    if (isStill) {
        if (!s.stillStartTime) {
            s.stillStartTime = scene.time.now;
        } else if (scene.time.now - s.stillStartTime >= 500) {
            s.dashEnergy = s.maxDashEnergy; // 立即回滿能量
        }
    } else {
        s.stillStartTime = null; // 移開或移動時重置計時器
    }

    const dashPressed = Phaser.Input.Keyboard.JustDown(scene.keys.dash) || mobileInput.dash;
    if (dashPressed) {
        if (s.dashEnergy >= s.dashCost && !s.isDashing) {
            s.dashEnergy -= s.dashCost;
            s.isDashing = true;
            s.isInvincible = true; 
            player.setAlpha(0.5); 

            let angle;
            let speed = 2400; 
            // 如果哆啦噩夢的領域展開啟動，衝刺速度減半
            if (scene.isDoraDomainActive) {
                speed *= 0.5;
            }
            if (mobileInput.dash) {
                angle = Phaser.Math.Angle.Between(boss.x, boss.y, player.x, player.y);
            } else {
                const mousePointer = scene.input.activePointer;
                angle = Phaser.Math.Angle.Between(player.x, player.y, mousePointer.x, mousePointer.y);
                const dist = Phaser.Math.Distance.Between(player.x, player.y, mousePointer.x, mousePointer.y);
                speed = Phaser.Math.Clamp(dist * 6, 1200, 3600); 
                // 再次針對自訂速度進行領域減速
                if (scene.isDoraDomainActive) {
                    speed *= 0.5;
                }
            } // 補回被誤刪的 else 區間結尾括號 (修改)
            
            // 如果處於定身/Combo 期間，衝刺速度設為 0 以防移動位置 (修改)
            if (s.cannotMove) {
                speed = 0;
            }
            
            player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            player.body.allowGravity = false; 

            createDashDust(scene, player.x, player.y, angle);
            if (createDashShieldFn) createDashShieldFn(scene, player, angle);

            if (scene.invincibilityTimer) scene.invincibilityTimer.remove();

            scene.time.delayedCall(150, () => {
                s.isDashing = false; 
                player.body.allowGravity = true;
                player.setAlpha(0.7); 
                
                scene.invincibilityTimer = scene.time.delayedCall(1000, () => {
                    s.isInvincible = false;
                    player.setAlpha(1);
                });
            });
        } else if (s.dashEnergy < s.dashCost && !s.isDashing) {
            scene.tweens.add({
                targets: getEnergyBar(),
                x: '+=5',
                duration: 50,
                yoyo: true,
                repeat: 3,
                onStart: () => { s.dashEnergyColor = 0xff0000; }, 
                onComplete: () => { getEnergyBar().x = 0; s.dashEnergyColor = 0x00ffff; } 
            });
        }
        mobileInput.dash = false;
    }

    // 如果哆啦噩夢的領域展開啟動，下墜（重力）速度也同樣會變慢 (降為原本的 0.25 倍以維持相同的拋物線軌跡，僅時間變慢)
    if (scene.isDoraDomainActive) {
        player.body.gravity.y = -750; // 世界重力是 1000，加上 -750 使其有效重力為 250
    } else {
        player.body.gravity.y = 0;
    }

    if (!s.isDashing) {
        if (s.cannotMove) {
            player.setVelocityX(0); // 限制移動速度為 0 (新增中文註解：玩家被請屎皇定身無法左右與跳躍)
        } else {
            // 如果哆啦噩夢的領域展開啟動，移動速度減慢
            const currentMoveSpeed = scene.isDoraDomainActive ? 200 : 400;
            const currentJumpSpeed = scene.isDoraDomainActive ? -275 : -550;

            if (scene.keys.left.isDown || mobileInput.left) player.setVelocityX(-currentMoveSpeed);
            else if (scene.keys.right.isDown || mobileInput.right) player.setVelocityX(currentMoveSpeed);
            else player.setVelocityX(0);

            if ((scene.keys.up.isDown || mobileInput.up) && player.body.touching.down) player.setVelocityY(currentJumpSpeed);
        }
    }
}
