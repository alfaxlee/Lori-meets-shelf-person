// === 衝刺特效模組 ===
// 負責衝刺粉塵與護盾的視覺效果和碰撞判定
import { state } from '../SharedState.js';

/**
 * 建立衝刺粉塵效果
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {number} x - 粉塵起始 X 座標
 * @param {number} y - 粉塵起始 Y 座標
 * @param {number} dashAngle - 衝刺方向角度
 */
export function createDashDust(scene, x, y, dashAngle) {
    const dustCount = 32; const oppositeAngle = dashAngle + Math.PI;
    for (let i = 0; i < dustCount; i++) {
        const spread = Phaser.Math.FloatBetween(-0.6, 0.6); const speed = Phaser.Math.Between(100, 600); const size = Phaser.Math.Between(6, 12);
        const dust = scene.add.rectangle(x, y, size, size, 0x333333, 0.8);
        scene.physics.add.existing(dust);
        dust.body.allowGravity = false;
        dust.body.setVelocity(Math.cos(oppositeAngle + spread) * speed, Math.sin(oppositeAngle + spread) * speed);
        dust.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        scene.tweens.add({ targets: dust, alpha: 0, scale: 0.2, duration: Phaser.Math.Between(400, 800), ease: 'Cubic.easeOut', onComplete: () => { dust.destroy(); } });
    }
}

/**
 * 建立衝刺護盾效果（帶碰撞判定，可對蘿莉造成傷害）
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {Phaser.GameObjects.Sprite} playerSprite - 玩家 Sprite
 * @param {number} angle - 護盾方向角度
 */
export function createDashShield(scene, playerSprite, angle) {
    // 取得處理蘿莉受傷/死亡/無敵模式所需的外部函式
    const { handleLoliHit, handleLoliDeath, triggerInvincibleMode } = scene._bossFunctions || {};

    const shield = scene.add.graphics(); let hasHit = false; let alive = true;
    scene.time.delayedCall(1150, () => { alive = false; });
    const onUpdate = () => {
        if (!alive || !playerSprite.active) { shield.destroy(); scene.events.off('update', onUpdate); return; }
        shield.clear(); shield.lineStyle(2, 0x00ffff, 0.6);
        const offset = 35; const centerX = playerSprite.x + Math.cos(angle) * offset; const centerY = playerSprite.y + Math.sin(angle) * offset;
        const radius = 65; const arcRange = Math.PI / 1.2; const startAngle = angle - arcRange / 2; const endAngle = angle + arcRange / 2;
        for (let r = 25; r <= radius; r += 20) { shield.beginPath(); shield.arc(centerX, centerY, r, startAngle, endAngle); shield.strokePath(); }
        const segments = 6;
        for (let i = 0; i <= segments; i++) {
            const currentAngle = startAngle + (arcRange / segments) * i;
            shield.lineBetween(centerX + Math.cos(currentAngle) * 15, centerY + Math.sin(currentAngle) * 15, centerX + Math.cos(currentAngle) * radius, centerY + Math.sin(currentAngle) * radius);
        }
        shield.lineStyle(1, 0x00ffff, 1); shield.beginPath(); shield.arc(centerX, centerY, radius, startAngle, endAngle); shield.strokePath();

        const loli = state.loli;
        if (!hasHit && loli && loli.active) {
            const dist = Phaser.Math.Distance.Between(centerX, centerY, loli.x, loli.y);
            if (dist < radius + 40) {
                if (loli.isSuperInvincible) return; // 無敵模式下不受護盾傷害

                const hitAngle = Phaser.Math.Angle.Between(playerSprite.x, playerSprite.y, loli.x, loli.y);
                
                let willBeInvincible = false;
                if (state.loliHP >= 50 && (state.loliHP - 25) < 50) {
                    state.loliHP = 49;
                    willBeInvincible = true;
                } else {
                    state.loliHP -= 25; 
                }
                
                if (scene._hud) scene._hud.updateLoliHP();
                
                if (state.loliHP <= 0) {
                    if (handleLoliDeath) handleLoliDeath(scene, loli);
                } else if (willBeInvincible) {
                    if (triggerInvincibleMode) triggerInvincibleMode(scene, loli);
                } else {
                    loli.isHit = true; loli.hitStunTimer = 500; loli.setVelocity(Math.cos(hitAngle) * 1500, Math.sin(hitAngle) * 1500 - 200); loli.setTint(0xff0000);
                    scene.cameras.main.shake(100, 0.005); 
                }
                hasHit = true;
            }
        }
    };
    scene.events.on('update', onUpdate);
}
