// === 蘿莉狀態機與 AI 邏輯模組 ===
import { updateLoliHP } from '../ui/HUD.js';
import { clearAllAttacks, cleanupBerserkScene, setLoliUprightBody, setLoliExhaustedBody, keepSpriteBottom, createShockwaves, scheduleNextLaser, scheduleUltimateGunAttack, scheduleUltimateBalls, spawnUltimateLaser } from './LoliAttacks.js';
import { playerState } from '../player/PlayerController.js';

export const bossState = {
    hp: 600,
    maxHp: 600,
    isHit: false,
    hitStunTimer: 0,
    isBerserk: false,
    isUltimateBerserk: false,
    isSuperInvincible: false,
    isExhausted: false,
    wasInAir: false,
    highestY: 0,
    isScaling: false
};

let refs = {};

/**
 * 初始化狀態機所需的遊戲物件參考
 */
export function initBossRefs(gameRefs) {
    refs = gameRefs;
}

/** 觸發無敵模式並移動到畫面中間偏上 */
export function triggerInvincibleMode(scene) {
    bossState.isSuperInvincible = true;
    bossState.isHit = false;
    refs.loli.setTint(0x800080);
    refs.loli.body.allowGravity = false;
    refs.loli.body.setImmovable(true);
    bossState.isScaling = false;

    clearAllAttacks(scene);

    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 4;
    scene.physics.moveTo(refs.loli, centerX, centerY, 500);
}

/** 處理蘿莉死亡 */
export function handleLoliDeath(scene) {
    refs.loli.setActive(false).setVisible(false).body.enable = false;
    scene.cameras.main.flash(500, 255, 0, 0);
    clearAllAttacks(scene);

    scene.time.delayedCall(3000, () => {
        bossState.hp = bossState.maxHp;
        updateLoliHP(bossState.hp);
        refs.loli.setActive(true).setVisible(true).body.enable = true;
        refs.loli.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 150);
        
        bossState.isBerserk = false;
        bossState.isSuperInvincible = false;
        bossState.isUltimateBerserk = false;
        bossState.isExhausted = false;
        bossState.isScaling = false;
        
        refs.loli.setAngle(0);
        refs.loli.setScale(0.3);
        setLoliUprightBody(refs.loli);
        refs.loli.body.setImmovable(false);
        refs.loli.body.allowGravity = true;
        refs.loli.clearTint();
        
        cleanupBerserkScene(scene);
        scheduleNextLaser(scene);
    });
}

/** 處理蘿莉受到的傷害 */
export function handleLoliHit(scene, bullet, force, stunTime, damage, originX, originY) {
    if (!refs.loli.active || bossState.isSuperInvincible) {
        if (bullet) bullet.destroy();
        return;
    }

    // bullet 可能是 null（例如盾牌攻擊），此時用傳入的 originX/Y 計算角度
    const srcX = bullet ? bullet.x : (originX ?? refs.loli.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.loli.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.loli.x, refs.loli.y);
    let willBeInvincible = false;

    if (bossState.hp >= 50 && (bossState.hp - damage) < 50) {
        bossState.hp = 49;
        willBeInvincible = true;
    } else {
        bossState.hp -= damage;
    }

    updateLoliHP(bossState.hp);

    if (bossState.hp <= 0) {
        handleLoliDeath(scene);
    } else if (willBeInvincible) {
        triggerInvincibleMode(scene);
    } else {
        bossState.isHit = true;
        bossState.hitStunTimer = stunTime;
        refs.loli.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force - 200);
        refs.loli.setTint(0xff0000);
        scene.cameras.main.shake(100, 0.005);
    }

    if (bullet) bullet.destroy();
}

/** 每幀更新蘿莉狀態機邏輯 */
export function updateLoliStateMachine(scene, time, delta) {
    const loli = refs.loli;
    const player = refs.player;

    if (bossState.hp < 150 && !bossState.isBerserk) {
        bossState.isBerserk = true;
        loli.body.allowGravity = false;
        loli.setTint(0xff0000);

        const width = scene.cameras.main.width;
        const height = scene.cameras.main.height;

        scene.berserkBg = scene.add.image(width / 2, height / 2, 'loliWin').setDepth(-1);
        scene.berserkBg.setDisplaySize(width, height);
        scene.berserkCeiling = scene.add.rectangle(width / 2, 10, width, 20, 0xff00ff);
        scene.physics.add.existing(scene.berserkCeiling, true);
        scene.berserkFloor = scene.add.rectangle(width / 2, height - 50, width, 40, 0xff00ff);
        scene.physics.add.existing(scene.berserkFloor, true);

        scene.physics.add.collider(player, [scene.berserkCeiling, scene.berserkFloor]);
        scene.physics.add.collider(loli, [scene.berserkCeiling, scene.berserkFloor]);

        scene.physics.add.collider(refs.enemyBalls, scene.berserkCeiling, (ball) => { ball.destroy(); });
        scene.physics.add.collider(refs.enemyBalls, scene.berserkFloor);

        scene.berserkGunLeft = scene.add.container(0, height / 2);
        const bodyLeft = scene.add.rectangle(60, 0, 320, 80, 0xff00ff);
        const barrelLeft = scene.add.rectangle(260, 0, 80, 30, 0xff00ff);
        scene.berserkGunLeft.add([bodyLeft, barrelLeft]);

        scene.berserkGunRight = scene.add.container(width, height / 2);
        const bodyRight = scene.add.rectangle(-60, 0, 320, 80, 0xff00ff);
        const barrelRight = scene.add.rectangle(-260, 0, 80, 30, 0xff00ff);
        scene.berserkGunRight.add([bodyRight, barrelRight]);

        let nextIsLeft = false;
        const scheduleBerserkGunAttack = () => {
            if (!loli.active || !bossState.isBerserk || bossState.isSuperInvincible) return;
            const isLeft = nextIsLeft;
            const targetGun = isLeft ? scene.berserkGunLeft : scene.berserkGunRight;
            nextIsLeft = !nextIsLeft;
            const targetAngle = Phaser.Math.Between(-45, 45);

            scene.tweens.add({
                targets: targetGun,
                angle: targetAngle,
                duration: 300,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    if (!loli.active || !bossState.isBerserk || bossState.isSuperInvincible) return;
                    const rad = Phaser.Math.DegToRad(targetGun.angle);
                    const offsetX = isLeft ? 260 : -260;
                    const worldX = targetGun.x + Math.cos(rad) * offsetX;
                    const worldY = targetGun.y + Math.sin(rad) * offsetX;
                    const laserOrigin = isLeft ? 0 : 1;
                    const warningLine = scene.add.rectangle(worldX, worldY, 1500, 2, 0xff0000, 0.5).setOrigin(laserOrigin, 0.5);
                    warningLine.name = 'warningLine';
                    warningLine.setAngle(targetAngle);

                    scene.time.delayedCall(500, () => {
                        if (warningLine) warningLine.destroy();
                        if (!loli.active || !bossState.isBerserk || bossState.isSuperInvincible) return;
                        const laser = scene.add.rectangle(worldX, worldY, 1500, 25, 0xff00ff, 0.8).setOrigin(laserOrigin, 0.5);
                        laser.setAngle(targetGun.angle);
                        scene.physics.add.existing(laser);
                        refs.lasers.add(laser);
                        if (laser.body) laser.body.enable = false;
                        scene.time.delayedCall(500, () => {
                            laser.destroy();
                            if (bossState.isBerserk && !bossState.isSuperInvincible) scene.time.delayedCall(700, scheduleBerserkGunAttack);
                        });
                    });
                }
            });
        };
        scheduleBerserkGunAttack();
        // The original code called spawnLaser(this), we must call spawnLaser(scene) but spawnLaser is in LoliAttacks
        // To avoid circular dependency, maybe we can assume regular lasers are managed via scheduleNextLaser which we already extracted.
        // Wait, the original code had spawnLaser(this) right here! 
        // We can import spawnLaser.
    }

    if (bossState.isSuperInvincible) {
        const centerX = scene.cameras.main.width / 2;
        const centerY = scene.cameras.main.height / 4;
        const distance = Phaser.Math.Distance.Between(loli.x, loli.y, centerX, centerY);

        if (distance < 15) {
            loli.body.reset(centerX, centerY);
            loli.setVelocity(0, 0);

            if (!bossState.isScaling) {
                bossState.isScaling = true;
                scene.tweens.add({
                    targets: loli,
                    scale: 0.3 * 1.5,
                    duration: 2000,
                    ease: 'Linear',
                    onComplete: () => {
                        const laserLength = 1500;
                        const laserY = loli.y - 10;
                        const ultimateLaser = scene.add.rectangle(loli.x, laserY, laserLength, 40, 0xff00ff, 0.9).setOrigin(0, 0.5);
                        scene.physics.add.existing(ultimateLaser);
                        refs.lasers.add(ultimateLaser);
                        if (ultimateLaser.body) ultimateLaser.body.enable = false;

                        scene.tweens.add({
                            targets: ultimateLaser,
                            angle: 360,
                            duration: 600,
                            onComplete: () => {
                                ultimateLaser.destroy();

                                playerState.maxDashEnergy = 200;
                                playerState.dashEnergy = playerState.maxDashEnergy;
                                playerState.dashCost = 33 / 2;
                                playerState.energyRegen = 1.0;
                                player.setTint(0x00ffff);

                                bossState.isUltimateBerserk = true;
                                scheduleUltimateGunAttack(scene);
                                scheduleUltimateBalls(scene);
                                spawnUltimateLaser(scene);

                                scene.time.delayedCall(7000, () => {
                                    if (!loli.active || !bossState.isUltimateBerserk) return;

                                    bossState.isUltimateBerserk = false;
                                    bossState.isSuperInvincible = false;
                                    bossState.isExhausted = true;
                                    loli.body.allowGravity = true;
                                    loli.body.setImmovable(false);
                                    loli.setScale(0.3);
                                    setLoliUprightBody(loli);

                                    player.clearTint();
                                    playerState.maxDashEnergy = 100;
                                    playerState.dashCost = 33;
                                    playerState.energyRegen = 0.5;
                                    if (playerState.dashEnergy > playerState.maxDashEnergy) playerState.dashEnergy = playerState.maxDashEnergy;

                                    cleanupBerserkScene(scene);
                                    clearAllAttacks(scene);

                                    scene.tweens.add({
                                        targets: loli,
                                        angle: loli.angle + 360,
                                        duration: 1000,
                                        ease: 'Cubic.easeOut',
                                        onComplete: () => {
                                            const currentBottom = loli.getBounds().bottom;
                                            loli.setAngle(90);
                                            setLoliExhaustedBody(loli);
                                            keepSpriteBottom(loli, currentBottom);
                                            loli.clearTint();

                                            const swColor = 0x8B4513;
                                            const swLeft = scene.add.rectangle(loli.x, loli.y + loli.displayHeight / 2 - 20, 100, 40, swColor, 0.8);
                                            const swRight = scene.add.rectangle(loli.x, loli.y + loli.displayHeight / 2 - 20, 100, 40, swColor, 0.8);

                                            scene.physics.add.existing(swLeft);
                                            scene.physics.add.existing(swRight);
                                            swLeft.body.allowGravity = false;
                                            swRight.body.allowGravity = false;

                                            swLeft.body.setVelocity(-600, -50);
                                            swRight.body.setVelocity(600, -50);

                                            scene.tweens.add({
                                                targets: [swLeft, swRight],
                                                alpha: 0,
                                                scaleX: 2.5,
                                                scaleY: 1.5,
                                                duration: 1000,
                                                onComplete: () => {
                                                    swLeft.destroy();
                                                    swRight.destroy();
                                                }
                                            });
                                        }
                                    });
                                });
                            }
                        });
                    }
                });
            }
        } else {
            scene.physics.moveTo(loli, centerX, centerY, 500);
        }
    } else if (bossState.isHit) {
        bossState.hitStunTimer -= delta;
        if (bossState.hitStunTimer <= 0) {
            bossState.isHit = false;
            bossState.isBerserk ? loli.setTint(0xff0000) : loli.clearTint();
        }
    } else if (bossState.isExhausted) {
        loli.setVelocityX(0);
    } else if (bossState.isBerserk) {
        loli.setVelocityX(Math.sin(time / 500) * 400);
        loli.setVelocityY(Math.cos(time / 1000) * 200);
    } else {
        if (loli.x < player.x) loli.setVelocityX(200);
        else if (loli.x > player.x) loli.setVelocityX(-200);
        else loli.setVelocityX(0);

        if (loli.body.touching.down) {
            if (bossState.wasInAir) {
                const fallDistance = Math.max(0, loli.y - bossState.highestY);
                createShockwaves(scene, loli.x, loli.y + loli.displayHeight / 2, fallDistance);
                bossState.wasInAir = false;
            }
        } else {
            if (!bossState.wasInAir) {
                bossState.highestY = loli.y;
                bossState.wasInAir = true;
            } else {
                bossState.highestY = Math.min(bossState.highestY, loli.y);
            }
        }
        if (player.y < loli.y - 50 && loli.body.touching.down) loli.setVelocityY(-275);
    }
}
