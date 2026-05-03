// === 衝刺特效模組 ===
// 負責衝刺粉塵的視覺效果

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
