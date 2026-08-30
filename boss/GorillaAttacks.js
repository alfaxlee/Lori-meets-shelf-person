// === 大猩猩（無敵大猩猩）攻擊模組 ===
// 負責大猩猩的一階段瘋狂跳躍落地震波，以及二階段「雙手協同攻擊（拍地+光束）重複五次後進入 7 秒破防虛弱期（所有黑方塊與電流全部消失，大猩猩懸浮空中受擊扣血）」攻擊循環 (新增中文註解)

import { gorillaState, cleanupBlockArms, cleanupOrbitingBlocks, createConvergingBlackBlocks, createChunkyBlockArmsWithFlyIn } from './GorillaStateMachine.js';

let refs = {};
let jumpTimer = null;
let currentJumpTween = null;
let currentPathTween = null;
let isJumping = false;

// 二階段雙手協同拍地與光束攻擊計時 (新增中文註解)
let slamTimer = null;
let currentSlamTween = null;
let currentLaserGfx = null;
let vulnerabilityTimer = null;
let vulnerabilityText = null;

/**
 * 初始化大猩猩攻擊模組參考 (新增中文註解)
 */
export function initGorillaAttackRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 啟動大猩猩一階段瘋狂跳躍攻擊循環 (新增中文註解)
 */
export function startGorillaAttacks(scene) {
    stopGorillaAttacks();
    if (!refs.gorilla || !refs.gorilla.active || gorillaState.isTransforming || gorillaState.isPhase2) return;

    // 開局 250ms 後立刻發動瘋狂跳躍 (新增中文註解)
    jumpTimer = scene.time.delayedCall(250, () => {
        if (refs.gorilla && refs.gorilla.active && !gorillaState.isTransforming && !gorillaState.isPhase2) {
            spawnGorillaFrenzyJump(scene);
        }
    });
}

/**
 * 執行大猩猩一階段瘋狂跳躍攻擊 (新增中文註解)
 */
export function spawnGorillaFrenzyJump(scene) {
    if (!refs.gorilla || !refs.gorilla.active || gorillaState.isTransforming || gorillaState.isPhase2) return;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const player = refs.player;
    const groundTop = height - 70;
    const halfHeight = refs.gorilla.displayHeight / 2;
    const targetY = groundTop - halfHeight;

    // 計算目標落點 (新增中文註解)
    let targetX;
    const randType = Phaser.Math.Between(1, 10);
    if (randType <= 4 && player) {
        targetX = player.x + Phaser.Math.Between(-280, 280);
    } else if (randType <= 7) {
        targetX = (refs.gorilla.x < width / 2) 
            ? Phaser.Math.Between(width * 0.55, width - 100) 
            : Phaser.Math.Between(100, width * 0.45);
    } else {
        targetX = Phaser.Math.Between(100, width - 100);
    }
    
    targetX = Phaser.Math.Clamp(targetX, 100, width - 100);
    if (Math.abs(targetX - refs.gorilla.x) < 150) {
        targetX = (targetX > width / 2) ? targetX - 250 : targetX + 250;
        targetX = Phaser.Math.Clamp(targetX, 100, width - 100);
    }

    const startX = refs.gorilla.x;
    const startY = refs.gorilla.y;

    // 起跳預警線與驚嘆號 (新增中文註解)
    const warnGfx = scene.add.graphics();
    warnGfx.lineStyle(2, 0xff3300, 0.7);
    const controlX = (startX + targetX) / 2;
    const controlY = Math.min(startY, targetY) - Phaser.Math.Between(550, 750);
    const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(startX, startY),
        new Phaser.Math.Vector2(controlX, controlY),
        new Phaser.Math.Vector2(targetX, targetY)
    );

    const points = curve.getPoints(16);
    warnGfx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
        if (i % 2 === 0) {
            warnGfx.moveTo(points[i].x, points[i].y);
            warnGfx.lineTo(points[i + 1].x, points[i + 1].y);
        }
    }
    warnGfx.strokePath();

    const exclamation = scene.add.text(targetX, targetY - 40, '!', {
        fontSize: '48px',
        color: '#ff2200',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
    }).setOrigin(0.5).setDepth(999);

    scene.tweens.add({
        targets: exclamation,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 100,
        yoyo: true
    });

    // 120ms 預警結束後起跳 (新增中文註解)
    scene.time.delayedCall(120, () => {
        warnGfx.destroy();
        exclamation.destroy();

        if (!refs.gorilla || !refs.gorilla.active || gorillaState.isTransforming || gorillaState.isPhase2) return;

        isJumping = true;
        const progressObj = { t: 0 };
        const jumpDuration = 480;

        currentJumpTween = scene.tweens.add({
            targets: refs.gorilla,
            angle: (targetX > startX ? 360 : -360),
            duration: jumpDuration,
            ease: 'Linear'
        });

        currentPathTween = scene.tweens.add({
            targets: progressObj,
            t: 1,
            duration: jumpDuration,
            ease: 'Quad.easeInOut',
            onUpdate: () => {
                if (refs.gorilla && refs.gorilla.active) {
                    const pt = curve.getPoint(progressObj.t);
                    refs.gorilla.setPosition(pt.x, pt.y);
                }
            },
            onComplete: () => {
                isJumping = false;
                if (!refs.gorilla || !refs.gorilla.active || gorillaState.isTransforming || gorillaState.isPhase2) return;

                refs.gorilla.setPosition(targetX, targetY);
                refs.gorilla.setAngle(0);

                // 觸發落地巨型震波 (新增中文註解)
                triggerGorillaShockwaves(scene, targetX, targetY);

                // 下一次跳躍延遲 (新增中文註解)
                const nextDelay = Phaser.Math.Between(80, 150);
                jumpTimer = scene.time.delayedCall(nextDelay, () => {
                    if (refs.gorilla && refs.gorilla.active && !gorillaState.isTransforming && !gorillaState.isPhase2) {
                        spawnGorillaFrenzyJump(scene);
                    }
                });
            }
        });
    });
}

/**
 * 觸發一階段大猩猩落地超大雙向震波 (新增中文註解)
 */
function triggerGorillaShockwaves(scene, gx, gy) {
    scene.cameras.main.shake(180, 0.016);
    scene.cameras.main.flash(100, 255, 100, 0);

    const groundTop = scene.cameras.main.height - 70;
    const slamCircle = scene.add.circle(gx, groundTop, 70, 0xff2200, 0.85);
    slamCircle.setDepth(999);
    scene.tweens.add({
        targets: slamCircle,
        scaleX: 6.0,
        scaleY: 1.8,
        alpha: 0,
        duration: 350,
        onComplete: () => slamCircle.destroy()
    });

    if (!refs.shockwaves) return;

    [-1, 1].forEach(dir => {
        const shockwave = scene.add.rectangle(
            gx + dir * 60,
            groundTop - 50,
            260,
            120,
            0xff3300,
            0.9
        );
        shockwave.setStrokeStyle(3, 0xffffff, 1);
        shockwave.setDepth(998);

        const speed = 400;
        const angleRad = 0.08;

        scene.physics.add.existing(shockwave);
        refs.shockwaves.add(shockwave);

        if (shockwave.body) {
            shockwave.body.allowGravity = false;
            shockwave.body.setSize(260, 120, true);
            shockwave.body.setVelocity(dir * speed * Math.cos(angleRad), -speed * Math.sin(angleRad));
        }
        shockwave.setRotation(dir === 1 ? -angleRad : angleRad);

        scene.tweens.add({
            targets: shockwave,
            alpha: 0,
            scaleX: 2.2,
            scaleY: 2.0,
            duration: 800,
            onComplete: () => {
                if (shockwave && shockwave.active) {
                    shockwave.destroy();
                }
            }
        });
    });
}

/**
 * 啟動第二階段「雙手協同組合攻擊（一隻手重拍地面 + 另一隻手發射毀滅光束，重複5次後進入7秒破防虛弱期）」 (新增中文註解)
 */
export function startPhase2HandSlamAttacks(scene) {
    stopGorillaAttacks();
    if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming) return;

    // 開局 0.6 秒後啟動第一波高速雙手協同攻擊 (新增中文註解)
    slamTimer = scene.time.delayedCall(600, () => {
        if (refs.gorilla && refs.gorilla.active && gorillaState.isPhase2 && !gorillaState.isTransforming && !gorillaState.isVulnerable) {
            spawnPhase2DualAttack(scene);
        }
    });
}

/**
 * 執行第二階段雙手協同攻擊：一隻手向下拍地重壓，另一隻手瞄準特定區域發射雷射光束 (反應時間 0.7 秒) (新增中文註解)
 */
export function spawnPhase2DualAttack(scene) {
    if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming || gorillaState.isVulnerable) return;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const groundTop = height - 70;

    // 1. 完全連續動態隨機落點（非固定點位，涵蓋全螢幕任意座標） (新增中文註解)
    const minSlamX = width * 0.15;
    const maxSlamX = width * 0.85;
    let slamTargetX;

    // 50% 機率鎖定玩家周圍隨機偏差，50% 機率全螢幕連續均勻隨機 (新增中文註解)
    if (refs.player && refs.player.active && Math.random() < 0.5) {
        slamTargetX = Phaser.Math.Clamp(
            refs.player.x + Phaser.Math.Between(-140, 140),
            minSlamX,
            maxSlamX
        );
    } else {
        slamTargetX = Phaser.Math.FloatBetween(minSlamX, maxSlamX);
    }

    // 根據落點位置動態決定左手/右手拍地（偏左由左手下拍、偏右由右手下拍） (新增中文註解)
    let slamHand = (slamTargetX <= width * 0.5) ? 'left' : 'right';
    let laserHand = (slamHand === 'left') ? 'right' : 'left';

    // 光束目標位置同樣動態連續隨機在對側空間，確保每次落點皆不重複且留有走位空隙 (新增中文註解)
    let laserTargetX;
    if (laserHand === 'right') {
        const minLaserX = Math.min(width * 0.82, slamTargetX + 220);
        laserTargetX = Phaser.Math.FloatBetween(minLaserX, width * 0.90);
    } else {
        const maxLaserX = Math.max(width * 0.18, slamTargetX - 220);
        laserTargetX = Phaser.Math.FloatBetween(width * 0.10, maxLaserX);
    }

    const isLeftSlam = (slamHand === 'left');
    gorillaState.slamState.active = true;
    gorillaState.slamState.hand = slamHand;
    gorillaState.slamState.targetX = slamTargetX;
    gorillaState.slamState.phase = 'telegraph';
    gorillaState.slamState.progress = 0;
    gorillaState.slamState.isCrushing = false;

    gorillaState.laserState.active = true;
    gorillaState.laserState.hand = laserHand;
    gorillaState.laserState.targetX = laserTargetX;
    gorillaState.laserState.targetY = groundTop;
    gorillaState.laserState.isFiring = false;
    gorillaState.laserState.phase = 'aiming';

    // 2. 僅繪製攻擊危險區：拍地危險區 (紅框) 與 光束預警瞄準區 (紫色光圈) (未標示處即為安全區) (新增中文註解)
    const warnWidth = 230;
    const slamWarnGfx = scene.add.graphics().setDepth(9970);
    slamWarnGfx.fillStyle(0xff1100, 0.4);
    slamWarnGfx.fillRect(slamTargetX - warnWidth / 2, groundTop - 40, warnWidth, 45);
    slamWarnGfx.lineStyle(2.5, 0xff3300, 0.95);
    slamWarnGfx.strokeRect(slamTargetX - warnWidth / 2, groundTop - 40, warnWidth, 45);

    const slamWarnText = scene.add.text(slamTargetX, groundTop - 70, '⚠️ 重壓區！', {
        fontSize: '20px',
        color: '#ff2200',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(9971);

    // 光束危險預警區 (新增中文註解)
    const laserWarnGfx = scene.add.graphics().setDepth(9970);
    laserWarnGfx.fillStyle(0xcc00ff, 0.35);
    laserWarnGfx.fillRect(laserTargetX - 100, groundTop - 40, 200, 45);
    laserWarnGfx.lineStyle(2.5, 0xff00ff, 0.9);
    laserWarnGfx.strokeRect(laserTargetX - 100, groundTop - 40, 200, 45);

    const laserWarnText = scene.add.text(laserTargetX, groundTop - 70, '⚠️ 毀滅光束！', {
        fontSize: '20px',
        color: '#ff00ff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(9971);

    scene.tweens.add({
        targets: [slamWarnGfx, slamWarnText, laserWarnGfx, laserWarnText],
        alpha: 0.9,
        duration: 175,
        yoyo: true,
        repeat: 3
    });

    // 3. 雙手蓄力動作 (反應時間調整為精準 0.7 秒 700ms) (新增中文註解)
    scene.tweens.add({
        targets: gorillaState.slamState,
        progress: 0.35,
        duration: 700,
        ease: 'Quad.easeOut',
        onComplete: () => {
            slamWarnGfx.destroy();
            slamWarnText.destroy();
            laserWarnGfx.destroy();
            laserWarnText.destroy();

            if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming || gorillaState.isVulnerable) {
                gorillaState.slamState.active = false;
                gorillaState.laserState.active = false;
                return;
            }

            // 4. 同時引爆：一隻手 110ms 極速猛砸拍地，另一隻手爆發毀滅光束！ (新增中文註解)
            gorillaState.slamState.phase = 'slamming';
            gorillaState.slamState.isCrushing = true;

            gorillaState.laserState.phase = 'firing';
            gorillaState.laserState.isFiring = true;

            // 觸發毀滅光束實體 (新增中文註解)
            fireGorillaPalmBeam(scene, laserHand, laserTargetX, groundTop);

            scene.tweens.add({
                targets: gorillaState.slamState,
                progress: 1.0,
                duration: 110,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    gorillaState.slamState.phase = 'down';

                    // 地面重擊強震與閃光 (新增中文註解)
                    scene.cameras.main.shake(260, 0.026);
                    scene.cameras.main.flash(120, 255, 60, 0);

                    // 拍地衝擊波特效
                    const impactCircle = scene.add.circle(slamTargetX, groundTop, 90, 0xff2200, 0.85).setDepth(9996);
                    scene.tweens.add({
                        targets: impactCircle,
                        scaleX: 4.8,
                        scaleY: 1.3,
                        alpha: 0,
                        duration: 280,
                        onComplete: () => impactCircle.destroy()
                    });

                    // 5. 地面停留與光束持續 420ms (新增中文註解)
                    scene.time.delayedCall(420, () => {
                        gorillaState.slamState.isCrushing = false; // 解除重壓判定
                        gorillaState.laserState.isFiring = false;  // 光束熄滅

                        if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming || gorillaState.isVulnerable) {
                            gorillaState.slamState.active = false;
                            gorillaState.laserState.active = false;
                            return;
                        }

                        // 6. 雙手緩慢抬起復位 (360ms 抬起) (新增中文註解)
                        gorillaState.slamState.phase = 'lifting';
                        gorillaState.laserState.phase = 'idle';

                        scene.tweens.add({
                            targets: gorillaState.slamState,
                            progress: 0,
                            duration: 360,
                            ease: 'Cubic.easeInOut',
                            onComplete: () => {
                                gorillaState.slamState.active = false;
                                gorillaState.slamState.phase = 'idle';
                                gorillaState.laserState.active = false;

                                // 累計攻擊次數 (新增中文註解)
                                gorillaState.attackCycleCount++;

                                // 若已重複攻擊五次，進入 7 秒破防虛弱期（所有黑方塊與電流全部消失） (新增中文註解)
                                if (gorillaState.attackCycleCount >= 5) {
                                    startPhase2VulnerabilityPhase(scene);
                                } else {
                                    // 否則排程下一輪雙手組合攻擊 (間隔 900 ~ 1500ms) (新增中文註解)
                                    const delay = Phaser.Math.Between(900, 1500);
                                    slamTimer = scene.time.delayedCall(delay, () => {
                                        if (refs.gorilla && refs.gorilla.active && gorillaState.isPhase2 && !gorillaState.isTransforming && !gorillaState.isVulnerable) {
                                            spawnPhase2DualAttack(scene);
                                        }
                                    });
                                }
                            }
                        });
                    });
                }
            });
        }
    });
}

/**
 * 啟動二階段 7 秒破防虛弱期（大猩猩懸浮空中，所有黑方塊與電流消失，玩家可全力輸出扣血） (新增中文註解)
 */
export function startPhase2VulnerabilityPhase(scene) {
    if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming) return;

    gorillaState.isVulnerable = true;
    gorillaState.attackCycleCount = 0;

    // 清理所有黑方塊手臂、旋轉防護環與黑色電流 (全部消失！) (新增中文註解)
    cleanupBlockArms();
    cleanupOrbitingBlocks();

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // 金色破防能量震波與閃光 (新增中文註解)
    scene.cameras.main.flash(600, 255, 220, 0);
    scene.cameras.main.shake(500, 0.015);

    // 大猩猩平穩懸浮於空中 (Y=120) 伴隨輕微呼吸浮動 (新增中文註解)
    refs.gorilla.setPosition(width / 2, 120);
    const hoverTween = scene.tweens.add({
        targets: refs.gorilla,
        y: 135,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // 顯示 7 秒破防提示倒數文字 (新增中文註解)
    let remainingSeconds = 7;
    if (vulnerabilityText) vulnerabilityText.destroy();

    vulnerabilityText = scene.add.text(width / 2, 60, `💥 防護破除！全力輸出！(${remainingSeconds}s)`, {
        fontSize: '26px',
        color: '#ffdd00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
    }).setOrigin(0.5).setDepth(9998);

    // 每秒倒數計時器 (新增中文註解)
    const countdownEvent = scene.time.addEvent({
        delay: 1000,
        repeat: 6,
        callback: () => {
            remainingSeconds--;
            if (vulnerabilityText && vulnerabilityText.active && remainingSeconds >= 0) {
                vulnerabilityText.setText(`💥 防護破除！全力輸出！(${remainingSeconds}s)`);
            }
        }
    });

    // 7 秒虛弱期結束後：重新組裝黑方塊與手臂，繼續進行下一輪 5 次攻擊 (新增中文註解)
    vulnerabilityTimer = scene.time.delayedCall(7000, () => {
        countdownEvent.remove(false);
        if (vulnerabilityText) {
            vulnerabilityText.destroy();
            vulnerabilityText = null;
        }

        if (hoverTween) hoverTween.stop();

        if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.hp <= 0) return;

        // 重新組裝動畫：大猩猩居中，黑方塊從四面八方聚攏，手臂從兩側飛入爆發電流 (新增中文註解)
        refs.gorilla.setPosition(width / 2, 120);
        scene.cameras.main.flash(400, 255, 50, 0);
        scene.cameras.main.shake(600, 0.01);

        createConvergingBlackBlocks(scene, width, height, width / 2, 120);
        createChunkyBlockArmsWithFlyIn(scene, width, height);

        // 1.2 秒組裝完畢後，解除虛弱狀態並重新啟動攻擊 (新增中文註解)
        scene.time.delayedCall(1200, () => {
            if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.hp <= 0) return;

            gorillaState.isVulnerable = false;
            gorillaState.attackCycleCount = 0;

            // 啟動下一輪雙手協同攻擊 (新增中文註解)
            startPhase2HandSlamAttacks(scene);
        });
    });
}

/**
 * 激發大猩猩手掌發射的毀滅雷射光束 (新增中文註解)
 */
function fireGorillaPalmBeam(scene, laserHand, targetX, targetY) {
    const nodes = gorillaState.armJointNodes;
    if (!nodes) return;

    const palm = (laserHand === 'left') ? nodes.left.palm : nodes.right.palm;
    const beamGfx = scene.add.graphics().setDepth(9992);
    currentLaserGfx = beamGfx;

    const duration = 420;

    const beamUpdate = () => {
        if (!beamGfx || !beamGfx.active || !gorillaState.laserState.isFiring) {
            scene.events.off('update', beamUpdate);
            if (beamGfx && beamGfx.destroy) beamGfx.destroy();
            return;
        }

        beamGfx.clear();

        // 核心黑紫粗光束 (新增中文註解)
        beamGfx.lineStyle(46, 0x110022, 0.95);
        beamGfx.lineBetween(palm.x, palm.y, targetX, targetY);

        // 內核深紅高能射線 (新增中文註解)
        beamGfx.lineStyle(24, 0xff0044, 1.0);
        beamGfx.lineBetween(palm.x, palm.y, targetX, targetY);

        // 中心白色強烈等離子柱 (新增中文註解)
        beamGfx.lineStyle(10, 0xffffff, 1.0);
        beamGfx.lineBetween(palm.x, palm.y, targetX, targetY);

        // 光束末端地面等離子爆轟光圈 (新增中文註解)
        beamGfx.fillStyle(0xff0055, 0.8);
        beamGfx.fillCircle(targetX, targetY, 35);
        beamGfx.fillStyle(0xffffff, 1.0);
        beamGfx.fillCircle(targetX, targetY, 18);

        // 光束命中玩家判定 (新增中文註解：未開盾玩家若身處光束軌跡內，直接擊殺當機)
        if (refs.player && refs.player.active) {
            const px = refs.player.x;
            const py = refs.player.y;
            const distToBeam = distPointToLine(px, py, palm.x, palm.y, targetX, targetY);

            if (distToBeam < 35) {
                if (refs.triggerCrash) {
                    refs.triggerCrash();
                }
            }
        }
    };

    scene.events.on('update', beamUpdate);

    scene.time.delayedCall(duration, () => {
        scene.events.off('update', beamUpdate);
        if (beamGfx && beamGfx.destroy) beamGfx.destroy();
    });
}

/**
 * 計算點到線段的最短距離 (新增中文註解：用於光束碰撞檢測)
 */
function distPointToLine(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return Phaser.Math.Distance.Between(px, py, projX, projY);
}

/**
 * 停止大猩猩所有攻擊與計時器 (新增中文註解)
 */
export function stopGorillaAttacks() {
    if (jumpTimer) {
        jumpTimer.remove(false);
        jumpTimer = null;
    }
    if (slamTimer) {
        slamTimer.remove(false);
        slamTimer = null;
    }
    if (vulnerabilityTimer) {
        vulnerabilityTimer.remove(false);
        vulnerabilityTimer = null;
    }
    if (vulnerabilityText) {
        vulnerabilityText.destroy();
        vulnerabilityText = null;
    }
    if (currentJumpTween) {
        currentJumpTween.stop();
        currentJumpTween = null;
    }
    if (currentPathTween) {
        currentPathTween.stop();
        currentPathTween = null;
    }
    if (currentSlamTween) {
        currentSlamTween.stop();
        currentSlamTween = null;
    }
    if (currentLaserGfx && currentLaserGfx.destroy) {
        currentLaserGfx.destroy();
        currentLaserGfx = null;
    }
    isJumping = false;
    if (gorillaState) {
        gorillaState.attackCycleCount = 0;
        gorillaState.isVulnerable = false;
        if (gorillaState.slamState) {
            gorillaState.slamState.active = false;
            gorillaState.slamState.phase = 'idle';
            gorillaState.slamState.progress = 0;
            gorillaState.slamState.isCrushing = false;
        }
        if (gorillaState.laserState) {
            gorillaState.laserState.active = false;
            gorillaState.laserState.phase = 'idle';
            gorillaState.laserState.isFiring = false;
        }
    }
}

/**
 * 取得大猩猩目前是否正在空中跳躍 (新增中文註解)
 */
export function isGorillaJumping() {
    return isJumping;
}
