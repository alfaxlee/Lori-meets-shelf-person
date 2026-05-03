// === 蘿莉攻擊模組 ===
// 負責所有蘿莉的攻擊邏輯（衝擊波、雷射、彈跳球、究極模式攻擊）
// 以及 Body 工具函式和場景清理函式

// --- 共享參考 ---
// 透過 initAttackRefs() 在 create 階段注入，避免循環引用
let refs = {};

/**
 * 初始化攻擊模組所需的遊戲物件參考
 * @param {object} gameRefs - 包含 loli, shockwaves, lasers, enemyBalls 的物件
 */
export function initAttackRefs(gameRefs) {
    refs = gameRefs;
}

// --- Body 工具函式 ---

/** 記住蘿莉的原始碰撞體大小 */
export function rememberLoliBody(sprite) {
    sprite.baseBodySize = { width: sprite.body.sourceWidth, height: sprite.body.sourceHeight };
}

/** 設定蘿莉為站立碰撞體 */
export function setLoliUprightBody(sprite) {
    if (!sprite.baseBodySize) return;
    sprite.setSize(sprite.baseBodySize.width, sprite.baseBodySize.height, true);
}

/** 設定蘿莉為癱瘓（倒地）碰撞體 */
export function setLoliExhaustedBody(sprite) {
    if (!sprite.baseBodySize) return;
    sprite.setSize(sprite.baseBodySize.height, sprite.baseBodySize.width, true);
}

/** 保持 Sprite 底部位置不變 */
export function keepSpriteBottom(sprite, bottom) {
    sprite.y += bottom - sprite.getBounds().bottom;
}

// --- 攻擊函式 ---

/** 產生衝擊波（蘿莉落地時觸發） */
export function createShockwaves(scene, x, y, fallHeight) {
    const scaleFactor = Math.min(2.5, 0.5 + (fallHeight / 200));
    const directions = [-1, 1];
    const angleRad = Phaser.Math.DegToRad(25); 
    directions.forEach(dir => {
        const sw = scene.add.rectangle(x, y - 20, 80 * scaleFactor, 40 * scaleFactor, 0xffffff, 0.8);
        scene.physics.add.existing(sw);
        refs.shockwaves.add(sw);
        sw.body.allowGravity = false;
        const speed = 400 + (fallHeight * 0.6);
        sw.body.setVelocity(dir * speed * Math.cos(angleRad), -speed * Math.sin(angleRad));
        sw.setRotation(dir === 1 ? -angleRad : angleRad);
        scene.tweens.add({ targets: sw, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500 + (fallHeight * 0.5), onComplete: () => { sw.destroy(); } });
    });
}

/** 產生垂直雷射攻擊 */
export function spawnLaser(scene) {
    if (!refs.loli.active) return;
    const laserCount = refs.loli.isBerserk ? 1 : Phaser.Math.Between(1, 3); 
    const height = scene.cameras.main.height;
    const warningDuration = refs.loli.isBerserk ? 85 : 167; 
    for (let i = 0; i < laserCount; i++) {
        const randomX = Phaser.Math.Between(50, 1230);
        const warningLineV = scene.add.rectangle(randomX, height / 2, 2, height, 0xff0000, 0.5);
        warningLineV.name = 'warningLine';
        scene.tweens.add({
            targets: warningLineV, alpha: 0, duration: warningDuration, yoyo: true, repeat: 5, 
            onComplete: () => {
                if (refs.loli.isSuperInvincible) { if (warningLineV) warningLineV.destroy(); return; }
                warningLineV.destroy();
                const laserV = scene.add.rectangle(randomX, height / 2, 25, height, 0xff00ff);
                scene.physics.add.existing(laserV);
                refs.lasers.add(laserV);
                laserV.body.allowGravity = false;
                laserV.body.setImmovable(true);
                scene.time.delayedCall(500, () => {
                    laserV.destroy();
                    if (refs.loli.isBerserk && i === laserCount - 1 && !refs.loli.isSuperInvincible) spawnLaser(scene);
                });
            }
        });
    }
}

/** 產生敵人彈跳球 */
export function spawnEnemyBall(scene) {
    if (!refs.loli.active) return;
    const ballCount = refs.loli.isBerserk ? 5 : 1;
    for (let i = 0; i < ballCount; i++) {
        const ball = scene.add.circle(refs.loli.x, refs.loli.y, 15, 0xff00ff);
        scene.physics.add.existing(ball);
        refs.enemyBalls.add(ball);
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = 400;
        ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        ball.body.setBounce(1, 1); ball.body.setCollideWorldBounds(true); ball.body.onWorldBounds = true;
    }
}

/** 排程一般模式的隨機雷射 */
export function scheduleNextLaser(scene) {
    if (refs.loli.isBerserk || !refs.loli.active || refs.loli.isSuperInvincible) return;
    const delay = Phaser.Math.Between(3000, 7000);
    scene.time.delayedCall(delay, () => {
        if (refs.loli.active && !refs.loli.isBerserk && !refs.loli.isSuperInvincible) {
            spawnLaser(scene);
            scheduleNextLaser(scene);
        }
    });
}

// --- 究極狂暴模式攻擊 ---

/** 究極模式：左右雷射槍掃射 */
export function scheduleUltimateGunAttack(scene) {
    if (!refs.loli.active || !refs.loli.isUltimateBerserk) return;
    const fireGun = (gun, isLeft) => {
        const startAngle = Phaser.Math.Between(-45, 45);
        const endAngle = startAngle + Phaser.Math.Between(-90, 90);
        gun.setAngle(startAngle);
        const rad = Phaser.Math.DegToRad(startAngle);
        const offsetX = isLeft ? 260 : -260; 
        const worldX = gun.x + Math.cos(rad) * offsetX;
        const worldY = gun.y + Math.sin(rad) * offsetX;
        const laserOrigin = isLeft ? 0 : 1;
        const warningLine = scene.add.rectangle(worldX, worldY, 1500, 2, 0xff0000, 0.5).setOrigin(laserOrigin, 0.5);
        warningLine.name = 'warningLine';
        warningLine.setAngle(startAngle);
        scene.time.delayedCall(500, () => {
            if (warningLine) warningLine.destroy(); 
            if (!refs.loli.active || !refs.loli.isUltimateBerserk) return;
            const laser = scene.add.rectangle(worldX, worldY, 1500, 25, 0xff00ff, 0.8).setOrigin(laserOrigin, 0.5);
            laser.setAngle(gun.angle); 
            scene.physics.add.existing(laser);
            refs.lasers.add(laser);
            if (laser.body) laser.body.enable = false;
            scene.tweens.add({
                targets: gun, angle: endAngle, duration: 1000, ease: 'Linear',
                onUpdate: () => { if (!laser.active) return; const curRad = Phaser.Math.DegToRad(gun.angle); laser.x = gun.x + Math.cos(curRad) * offsetX; laser.y = gun.y + Math.sin(curRad) * offsetX; laser.setAngle(gun.angle); },
                onComplete: () => { laser.destroy(); }
            });
        });
    };
    if (scene.berserkGunLeft) fireGun(scene.berserkGunLeft, true);
    if (scene.berserkGunRight) fireGun(scene.berserkGunRight, false);
    scene.time.delayedCall(2000, () => scheduleUltimateGunAttack(scene));
}

/** 究極模式：持續產生彈跳球 */
export function scheduleUltimateBalls(scene) {
    if (!refs.loli.active || !refs.loli.isUltimateBerserk) return;
    spawnEnemyBall(scene); 
    scene.time.delayedCall(1000, () => scheduleUltimateBalls(scene));
}

/** 究極模式：隨機角度雷射 */
export function spawnUltimateLaser(scene) {
    if (!refs.loli.active || !refs.loli.isUltimateBerserk) return;
    const laserCount = Phaser.Math.Between(3, 5); 
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    for (let i = 0; i < laserCount; i++) {
        const randomX = Phaser.Math.Between(0, width);
        const randomY = Phaser.Math.Between(0, height);
        const randomAngle = Phaser.Math.Between(0, 360);
        const warningLine = scene.add.rectangle(randomX, randomY, 3000, 2, 0xff0000, 0.5);
        warningLine.name = 'warningLine'; 
        warningLine.setAngle(randomAngle);
        scene.tweens.add({
            targets: warningLine, alpha: 0, duration: 100, yoyo: true, repeat: 5, 
            onComplete: () => {
                if (warningLine) warningLine.destroy();
                if (!refs.loli.active || !refs.loli.isUltimateBerserk) return;
                const laser = scene.add.rectangle(randomX, randomY, 3000, 25, 0xff00ff);
                laser.setAngle(randomAngle);
                scene.physics.add.existing(laser);
                refs.lasers.add(laser);
                laser.body.allowGravity = false;
                laser.body.setImmovable(true);
                scene.time.delayedCall(500, () => { if (laser) laser.destroy(); });
            }
        });
    }
    scene.time.delayedCall(Phaser.Math.Between(1000, 2000), () => spawnUltimateLaser(scene));
}

/** 清除畫面上所有攻擊物件與警告線 */
export function clearAllAttacks(scene) {
    if (refs.shockwaves) refs.shockwaves.clear(true, true);
    if (refs.lasers) refs.lasers.clear(true, true);
    if (refs.enemyBalls) refs.enemyBalls.clear(true, true);
    scene.children.list.forEach(child => { if (child.name === 'warningLine') child.destroy(); });
}

/** 清除狂暴模式場景物件 */
export function cleanupBerserkScene(scene) {
    if (scene.berserkBg) { scene.berserkBg.destroy(); scene.berserkBg = null; }
    if (scene.berserkCeiling) { scene.berserkCeiling.destroy(); scene.berserkCeiling = null; }
    if (scene.berserkFloor) { scene.berserkFloor.destroy(); scene.berserkFloor = null; }
    if (scene.berserkGunLeft) { scene.berserkGunLeft.destroy(); scene.berserkGunLeft = null; }
    if (scene.berserkGunRight) { scene.berserkGunRight.destroy(); scene.berserkGunRight = null; }
}
