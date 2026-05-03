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
    dashEnergyColor: 0x00ffff // 衝刺能量條顏色
};

/**
 * 每幀更新玩家邏輯 (包含移動與衝刺)
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {Phaser.GameObjects.Sprite} player - 玩家 Sprite
 * @param {Phaser.GameObjects.Sprite} loli - 蘿莉 Sprite (用於自動瞄準衝刺)
 * @param {Function} createDashShieldFn - 產生護盾的 callback
 */
export function updatePlayer(scene, player, loli, createDashShieldFn) {
    const s = playerState;

    if (s.dashEnergy < s.maxDashEnergy) {
        s.dashEnergy = Math.min(s.maxDashEnergy, s.dashEnergy + s.energyRegen);
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
            if (mobileInput.dash) {
                angle = Phaser.Math.Angle.Between(loli.x, loli.y, player.x, player.y);
            } else {
                const mousePointer = scene.input.activePointer;
                angle = Phaser.Math.Angle.Between(player.x, player.y, mousePointer.x, mousePointer.y);
                const dist = Phaser.Math.Distance.Between(player.x, player.y, mousePointer.x, mousePointer.y);
                speed = Phaser.Math.Clamp(dist * 6, 1200, 3600); 
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

    if (!s.isDashing) {
        if (scene.keys.left.isDown || mobileInput.left) player.setVelocityX(-400);
        else if (scene.keys.right.isDown || mobileInput.right) player.setVelocityX(400);
        else player.setVelocityX(0);

        if ((scene.keys.up.isDown || mobileInput.up) && player.body.touching.down) player.setVelocityY(-550);
    }
}
