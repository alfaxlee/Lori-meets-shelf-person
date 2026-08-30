// === 大猩猩（無敵大猩猩）攻擊模組 ===
// 負責大猩猩的一階段瘋狂跳躍落地震波，二階段「超大範圍雙手協同攻擊（拍地+光束，可直達最邊緣防止卡角老六，空間小塞不下立刻壓死，無視盾牌，攻擊間隔 150~280ms 極速連發）；狂暴黑色高壓電流全程常駐激發；重複五次後進入 4 秒破防虛弱期（所有黑方塊與電流全部消失，大猩猩懸浮空中受擊扣血，4秒後環繞方塊立刻回來，雙手從兩側飛入，到位後爆發黑色高壓電流，等電流完全顯現後才開始攻擊）」
// 以及第三階段「狂暴無差別攻擊模式」—— 血量變成 ？？？，形成電流圓圈並四散 5 道旋轉死光電流，起始角度自動避開玩家確保位於安全空隙正中央（附 600ms 預警充電緩衝）；死光以走路可跟上的慢速旋轉（轉向後持續平穩遠離行走，解決邊界反覆抽搐抖動問題），中途可能隨機再度轉向；【嚴格規則】：當空間縮小到快要塞不下玩家（距離 <85px 且射線朝玩家逼近）或邊緣受壓時必定立刻往回轉向，無視盾牌（碰到直接死亡），持續 10 秒；10 秒結束後爆發全螢幕華麗雷電大爆炸，玩家只要此時開盾即可存活，大猩猩隨之徹底毀滅死亡！ (新增中文註解)

import { gorillaState, cleanupBlockArms, cleanupOrbitingBlocks, createConvergingBlackBlocks, createChunkyBlockArmsWithFlyIn, handleGorillaDeath } from './GorillaStateMachine.js';
import { playerState } from '../player/PlayerController.js';

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

// 第三階段狂暴超載旋轉死光與大爆炸變數 (新增中文註解)
let overloadGfx = null;
let overloadUpdateHandler = null;
let overloadCountdownTimer = null;
let overloadText = null;
let overloadChargeGfx = null;

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
    if (!refs.gorilla || !refs.gorilla.active || gorillaState.isTransforming || gorillaState.isPhase2 || gorillaState.isFinalPhase) return;

    // 開局 250ms 後立刻發動瘋狂跳躍 (新增中文註解)
    jumpTimer = scene.time.delayedCall(250, () => {
        if (refs.gorilla && refs.gorilla.active && !gorillaState.isTransforming && !gorillaState.isPhase2 && !gorillaState.isFinalPhase) {
            spawnGorillaFrenzyJump(scene);
        }
    });
}

/**
 * 執行大猩猩一階段瘋狂跳躍攻擊 (新增中文註解)
 */
export function spawnGorillaFrenzyJump(scene) {
    if (!refs.gorilla || !refs.gorilla.active || gorillaState.isTransforming || gorillaState.isPhase2 || gorillaState.isFinalPhase) return;

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

        if (!refs.gorilla || !refs.gorilla.active || gorillaState.isTransforming || gorillaState.isPhase2 || gorillaState.isFinalPhase) return;

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
                if (!refs.gorilla || !refs.gorilla.active || gorillaState.isTransforming || gorillaState.isPhase2 || gorillaState.isFinalPhase) return;

                refs.gorilla.setPosition(targetX, targetY);
                refs.gorilla.setAngle(0);

                // 觸發落地巨型震波 (新增中文註解)
                triggerGorillaShockwaves(scene, targetX, targetY);

                // 下一次跳躍延遲 (新增中文註解)
                const nextDelay = Phaser.Math.Between(80, 150);
                jumpTimer = scene.time.delayedCall(nextDelay, () => {
                    if (refs.gorilla && refs.gorilla.active && !gorillaState.isTransforming && !gorillaState.isPhase2 && !gorillaState.isFinalPhase) {
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
 * 啟動第二階段「超大範圍雙手協同組合攻擊（一隻手重拍地面 + 另一隻手發射毀滅光束，間隔緊湊，重複5次後進入4秒破防虛弱期）」 (新增中文註解)
 */
export function startPhase2HandSlamAttacks(scene) {
    if (slamTimer) {
        slamTimer.remove(false);
        slamTimer = null;
    }
    if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming || gorillaState.isVulnerable || gorillaState.isFinalPhase) return;

    // 開局 200ms 後極速啟動第一波高速雙手協同攻擊 (新增中文註解)
    slamTimer = scene.time.delayedCall(200, () => {
        if (refs.gorilla && refs.gorilla.active && gorillaState.isPhase2 && !gorillaState.isTransforming && !gorillaState.isVulnerable && !gorillaState.isFinalPhase) {
            spawnPhase2DualAttack(scene);
        }
    });
}

/**
 * 執行第二階段雙手協同攻擊：超大攻擊範圍、直達最邊緣防止老六卡角 (反應時間 0.7 秒，間隔緊湊) (新增中文註解)
 */
export function spawnPhase2DualAttack(scene) {
    if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming || gorillaState.isVulnerable || gorillaState.isFinalPhase) return;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const groundTop = height - 70;

    const slamWarnWidth = 360; // 大幅增加拍地危險寬度，覆蓋超廣區域 (新增中文註解)
    const laserWarnWidth = 320; // 大幅增加雷射光束危險寬度 (新增中文註解)

    let slamTargetX;
    let laserTargetX;

    const px = (refs.player && refs.player.active) ? refs.player.x : width / 2;

    // 1. 防老六機制：若玩家貼在最左側或最右側邊緣(角落地帶)，高機率直接鎖定該邊緣發動毀滅打擊 (新增中文註解)
    if (px < 180 && Math.random() < 0.75) {
        // 玩家蹲在最左側角落：拍地直接砸最左側邊界 x=0 (新增中文註解)
        slamTargetX = 60;
    } else if (px > width - 180 && Math.random() < 0.75) {
        // 玩家蹲在最右側角落：拍地直接砸最右側邊界 x=width (新增中文註解)
        slamTargetX = width - 60;
    } else if (Math.random() < 0.5) {
        // 追蹤玩家當前位置並加入隨機微幅偏差，可直達全地圖 0 ~ width (新增中文註解)
        slamTargetX = Phaser.Math.Clamp(px + Phaser.Math.Between(-100, 100), 0, width);
    } else {
        // 全地圖完全連續動態隨機分佈 (包含最邊緣與中央) (新增中文註解)
        slamTargetX = Phaser.Math.FloatBetween(0, width);
    }

    // 根據落點位置動態決定左手/右手拍地（偏左由左手下拍、偏右由右手下拍） (新增中文註解)
    let slamHand = (slamTargetX <= width * 0.5) ? 'left' : 'right';
    let laserHand = (slamHand === 'left') ? 'right' : 'left';

    // 光束目標位置同樣支援直達最邊緣，且留有生還空隙 (新增中文註解)
    if (laserHand === 'right') {
        // 右側光束覆蓋最右側邊界 [slamTargetX + 220, width]
        const minLaserX = Math.min(width - 100, slamTargetX + 220);
        laserTargetX = Phaser.Math.FloatBetween(minLaserX, width);
    } else {
        // 左側光束覆蓋最左側邊界 [0, slamTargetX - 220]
        const maxLaserX = Math.max(100, slamTargetX - 220);
        laserTargetX = Phaser.Math.FloatBetween(0, maxLaserX);
    }

    // 計算拍地精確覆蓋邊界（若靠近邊界直接延伸至 0 或 width，完全不留角落死角） (新增中文註解)
    let warnLeft = slamTargetX - slamWarnWidth / 2;
    let warnRight = slamTargetX + slamWarnWidth / 2;
    if (slamTargetX <= slamWarnWidth / 2) {
        warnLeft = 0;
        warnRight = Math.min(width, slamWarnWidth);
    }
    if (slamTargetX >= width - slamWarnWidth / 2) {
        warnLeft = Math.max(0, width - slamWarnWidth);
        warnRight = width;
    }

    // 計算光束精確覆蓋邊界 (新增中文註解)
    let laserLeft = laserTargetX - laserWarnWidth / 2;
    let laserRight = laserTargetX + laserWarnWidth / 2;
    if (laserTargetX <= laserWarnWidth / 2) {
        laserLeft = 0;
        laserRight = Math.min(width, laserWarnWidth);
    }
    if (laserTargetX >= width - laserWarnWidth / 2) {
        laserLeft = Math.max(0, width - laserWarnWidth);
        laserRight = width;
    }

    const isLeftSlam = (slamHand === 'left');
    gorillaState.slamState.active = true;
    gorillaState.slamState.hand = slamHand;
    gorillaState.slamState.targetX = slamTargetX;
    gorillaState.slamState.warnLeft = warnLeft;
    gorillaState.slamState.warnRight = warnRight;
    gorillaState.slamState.phase = 'telegraph';
    gorillaState.slamState.progress = 0;
    gorillaState.slamState.isCrushing = false;

    gorillaState.laserState.active = true;
    gorillaState.laserState.hand = laserHand;
    gorillaState.laserState.targetX = laserTargetX;
    gorillaState.laserState.targetY = groundTop;
    gorillaState.laserState.isFiring = false;
    gorillaState.laserState.phase = 'aiming';

    // 2. 繪製超大攻擊危險區：拍地危險區 (紅框) 與 光束預警瞄準區 (紫色光圈) (新增中文註解)
    const slamWarnGfx = scene.add.graphics().setDepth(9970);
    slamWarnGfx.fillStyle(0xff1100, 0.42);
    slamWarnGfx.fillRect(warnLeft, groundTop - 40, warnRight - warnLeft, 45);
    slamWarnGfx.lineStyle(2.5, 0xff3300, 0.95);
    slamWarnGfx.strokeRect(warnLeft, groundTop - 40, warnRight - warnLeft, 45);

    const slamWarnText = scene.add.text((warnLeft + warnRight) / 2, groundTop - 70, '⚠️ 重壓區！', {
        fontSize: '22px',
        color: '#ff2200',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(9971);

    // 光束危險預警區 (新增中文註解)
    const laserWarnGfx = scene.add.graphics().setDepth(9970);
    laserWarnGfx.fillStyle(0xcc00ff, 0.38);
    laserWarnGfx.fillRect(laserLeft, groundTop - 40, laserRight - laserLeft, 45);
    laserWarnGfx.lineStyle(2.5, 0xff00ff, 0.9);
    laserWarnGfx.strokeRect(laserLeft, groundTop - 40, laserRight - laserLeft, 45);

    const laserWarnText = scene.add.text((laserLeft + laserRight) / 2, groundTop - 70, '⚠️ 毀滅光束！', {
        fontSize: '22px',
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

    // 3. 雙手蓄力動作 (反應時間 0.7 秒 700ms) (新增中文註解)
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

            if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming || gorillaState.isVulnerable || gorillaState.isFinalPhase) {
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
                    const impactCircle = scene.add.circle(slamTargetX, groundTop, 110, 0xff2200, 0.85).setDepth(9996);
                    scene.tweens.add({
                        targets: impactCircle,
                        scaleX: 5.2,
                        scaleY: 1.4,
                        alpha: 0,
                        duration: 280,
                        onComplete: () => impactCircle.destroy()
                    });

                    // 5. 地面停留與光束持續 200ms (縮短停留，緊湊連招) (新增中文註解)
                    scene.time.delayedCall(200, () => {
                        gorillaState.slamState.isCrushing = false; // 解除重壓判定
                        gorillaState.laserState.isFiring = false;  // 光束熄滅

                        if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming || gorillaState.isVulnerable || gorillaState.isFinalPhase) {
                            gorillaState.slamState.active = false;
                            gorillaState.laserState.active = false;
                            return;
                        }

                        // 6. 雙手極速向上拉起復位 (120ms 極速拉起) (新增中文註解)
                        gorillaState.slamState.phase = 'lifting';
                        gorillaState.laserState.phase = 'idle';

                        scene.tweens.add({
                            targets: gorillaState.slamState,
                            progress: 0,
                            duration: 120,
                            ease: 'Cubic.easeInOut',
                            onComplete: () => {
                                gorillaState.slamState.active = false;
                                gorillaState.slamState.phase = 'idle';
                                gorillaState.laserState.active = false;

                                // 累計攻擊次數 (新增中文註解)
                                gorillaState.attackCycleCount++;

                                // 若已重複攻擊五次，進入 4 秒破防虛弱期（所有黑方塊與電流全部消失） (新增中文註解)
                                if (gorillaState.attackCycleCount >= 5) {
                                    startPhase2VulnerabilityPhase(scene);
                                } else {
                                    // 否則排程下一輪雙手組合攻擊 (攻擊間隔大幅縮短至 150 ~ 280ms，黑色電流全程常駐不中斷) (新增中文註解)
                                    const delay = Phaser.Math.Between(150, 280);
                                    slamTimer = scene.time.delayedCall(delay, () => {
                                        if (refs.gorilla && refs.gorilla.active && gorillaState.isPhase2 && !gorillaState.isTransforming && !gorillaState.isVulnerable && !gorillaState.isFinalPhase) {
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
 * 啟動二階段 4 秒破防虛弱期（大猩猩懸浮空中，所有黑方塊與電流消失，玩家可全力輸出扣血；4秒後環繞方塊立刻回來，雙手從兩邊飛入，隨後爆發黑色電流，等電流顯現後才開始攻擊） (新增中文註解)
 */
export function startPhase2VulnerabilityPhase(scene) {
    if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isTransforming || gorillaState.isFinalPhase) return;

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

    // 顯示 4 秒破防提示倒數文字 (新增中文註解)
    let remainingSeconds = 4;
    if (vulnerabilityText) vulnerabilityText.destroy();

    vulnerabilityText = scene.add.text(width / 2, 60, `💥 防護破除！全力輸出！(${remainingSeconds}s)`, {
        fontSize: '28px',
        color: '#ffdd00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
    }).setOrigin(0.5).setDepth(9998);

    // 每秒倒數計時器 (新增中文註解)
    const countdownEvent = scene.time.addEvent({
        delay: 1000,
        repeat: 3,
        callback: () => {
            remainingSeconds--;
            if (vulnerabilityText && vulnerabilityText.active && remainingSeconds >= 0) {
                vulnerabilityText.setText(`💥 防護破除！全力輸出！(${remainingSeconds}s)`);
            }
        }
    });

    // 4 秒虛弱期結束後：1.環繞方塊立刻回來 → 2.雙手從兩邊飛過來 → 3.到位後爆發黑色高壓電流 → 4.等電流顯現後才開始攻擊 (新增中文註解)
    vulnerabilityTimer = scene.time.delayedCall(4000, () => {
        countdownEvent.remove(false);
        if (vulnerabilityText) {
            vulnerabilityText.destroy();
            vulnerabilityText = null;
        }

        if (hoverTween) hoverTween.stop();

        if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isFinalPhase || gorillaState.hp <= 0) return;

        // 結束虛弱狀態 (恢復防禦姿態準備組裝) (新增中文註解)
        gorillaState.isVulnerable = false;
        gorillaState.isLightningActive = false;

        refs.gorilla.setPosition(width / 2, 120);
        scene.cameras.main.flash(400, 255, 50, 0);
        scene.cameras.main.shake(600, 0.01);

        // 1. 環繞方塊立刻回來聚攏 (新增中文註解)
        createConvergingBlackBlocks(scene, width, height, width / 2, 120);

        // 2. 雙手從螢幕左右兩邊飛過來，完全到位後才爆發黑色電流，且等待電流顯現後才回調啟動攻擊 (新增中文註解)
        createChunkyBlockArmsWithFlyIn(scene, width, height, () => {
            if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isPhase2 || gorillaState.isFinalPhase || gorillaState.hp <= 0) return;

            gorillaState.attackCycleCount = 0;

            // 3. 電流已常駐顯現！現在才開始發動下一輪雙手協同攻擊！ (新增中文註解)
            startPhase2HandSlamAttacks(scene);
        });
    });
}

/**
 * 激發大猩猩手掌發射的超大毀滅雷射光束 (新增中文註解)
 */
function fireGorillaPalmBeam(scene, laserHand, targetX, targetY) {
    const nodes = gorillaState.armJointNodes;
    if (!nodes) return;

    const palm = (laserHand === 'left') ? nodes.left.palm : nodes.right.palm;
    const beamGfx = scene.add.graphics().setDepth(9992);
    currentLaserGfx = beamGfx;
    const duration = 200; // 光束持續時間與地面停留同步為 200ms (新增中文註解)

    const beamUpdate = () => {
        if (!beamGfx || !beamGfx.active || !gorillaState.laserState.isFiring) {
            scene.events.off('update', beamUpdate);
            if (beamGfx && beamGfx.destroy) beamGfx.destroy();
            return;
        }

        beamGfx.clear();

        // 核心黑紫粗光束 (加大至 68px) (新增中文註解)
        beamGfx.lineStyle(68, 0x110022, 0.95);
        beamGfx.lineBetween(palm.x, palm.y, targetX, targetY);

        // 內核深紅高能射線 (加大至 36px) (新增中文註解)
        beamGfx.lineStyle(36, 0xff0044, 1.0);
        beamGfx.lineBetween(palm.x, palm.y, targetX, targetY);

        // 中心白色強烈等離子柱 (加大至 16px) (新增中文註解)
        beamGfx.lineStyle(16, 0xffffff, 1.0);
        beamGfx.lineBetween(palm.x, palm.y, targetX, targetY);

        // 光束末端地面等離子爆轟光圈 (加大至 50px) (新增中文註解)
        beamGfx.fillStyle(0xff0055, 0.85);
        beamGfx.fillCircle(targetX, targetY, 50);
        beamGfx.fillStyle(0xffffff, 1.0);
        beamGfx.fillCircle(targetX, targetY, 26);

        // 光束命中玩家判定 (無視任何盾牌與無敵狀態，一律強制當機死亡！) (新增中文註解)
        if (refs.player && refs.player.active) {
            const px = refs.player.x;
            const py = refs.player.y;
            const distToBeam = distPointToLine(px, py, palm.x, palm.y, targetX, targetY);

            if (distToBeam < 65) {
                if (refs.triggerCrash) {
                    refs.triggerCrash(true); // 傳入 true 強制無視盾牌與無敵狀態直接當機！ (新增中文註解)
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
 * 啟動第三階段「狂暴無差別攻擊模式」：
 * 形成中央電流圓圈，並四散 5 道旋轉死光電流，起始角度自動避開玩家確保位於安全空隙正中央（附 600ms 預警充電緩衝）；
 * 轉向後持續平穩遠離行走（解決邊界反覆抽搐抖動問題），中途可能隨機再度轉向；
 * 【嚴格規則】：當空間縮小到快要塞不下玩家（距離 <85px 且射線朝玩家逼近）或邊緣受壓時必定立刻往回反轉，無視盾牌（碰到直接死亡），持續 10 秒；
 * 10 秒結束後爆發全螢幕華麗雷電大爆炸，只要此時開盾即可存活，大猩猩隨後徹底死亡！ (新增中文註解)
 */
export function startFinalOverloadAttack(scene, gx, gy) {
    stopFinalOverloadAttack(scene);

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const beamCount = 5; // 5 道旋轉高壓死光，留有生還走位空隙 (新增中文註解)
    const beamLength = Math.max(width, height) * 1.5;
    const centralRingRadius = 110;
    const stepAngle = (Math.PI * 2) / beamCount;

    // 1. 【安全起始距離機制】：精準計算玩家當前相對於大猩猩的角度，將初始死光旋轉角度設為兩道射線的正中間，確保開局時玩家身處最大安全空隙正中央！ (新增中文註解)
    const px0 = (refs.player && refs.player.active) ? refs.player.x : width / 2;
    const py0 = (refs.player && refs.player.active) ? refs.player.y : height - 100;
    const playerAngle0 = Phaser.Math.Angle.Between(gx, gy, px0, py0);
    let currentAngle = playerAngle0 + (stepAngle / 2); // 射線距離玩家兩側各 36 度 (約 240px 超大安全距離)

    let timeElapsed = 0;
    let remainingSeconds = 10;
    let isLethal = false; // 前 600ms 為安全預警蓄力期，不觸發致命碰撞 (新增中文註解)

    // 2. 【慢速旋轉與智慧反轉參數】：轉向後持續行走，中途有機率再度轉向 (新增中文註解)
    let rotDirection = 1; // 1 = 順時針, -1 = 逆時針 (新增中文註解)
    let currentRotSpeed = 0.0075;
    let lastReverseTime = 0;
    let nextMidwayReverseTime = 2500; // 下一次可能觸發中途反轉的時間點 (新增中文註解)

    overloadGfx = scene.add.graphics().setDepth(9997);

    // 顯示預警與倒數計時文字 (新增中文註解)
    if (overloadText) overloadText.destroy();
    overloadText = scene.add.text(width / 2, 70, `⚡ 核心超載！死光充能中...`, {
        fontSize: '26px',
        color: '#ffcc00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
    }).setOrigin(0.5).setDepth(9998);

    // 600ms 預警充能完成後，正式啟動 10 秒計時與致命判定 (新增中文註解)
    scene.time.delayedCall(600, () => {
        if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isFinalPhase) return;
        isLethal = true;
        scene.cameras.main.flash(200, 200, 0, 255);
        scene.cameras.main.shake(300, 0.012);

        if (overloadText && overloadText.active) {
            overloadText.setText(`⚡ 核心超載狂暴！避開旋轉死光！(${remainingSeconds}s)`);
            overloadText.setColor('#ff0055');
        }

        // 每秒倒數計時器 (新增中文註解)
        overloadCountdownTimer = scene.time.addEvent({
            delay: 1000,
            repeat: 9,
            callback: () => {
                remainingSeconds--;
                if (overloadText && overloadText.active && remainingSeconds >= 0) {
                    overloadText.setText(`⚡ 核心超載狂暴！避開旋轉死光！(${remainingSeconds}s)`);
                }
            }
        });
    });

    // 每幀更新旋轉死光束、轉向後持續走、逼近玩家才轉向（防原地卡住抖動） (新增中文註解)
    overloadUpdateHandler = (time, delta) => {
        if (!overloadGfx || !overloadGfx.active || !gorillaState.isFinalPhase) return;

        timeElapsed += delta;
        const deltaFactor = Math.min(2.0, delta / 16.666);

        const px = (refs.player && refs.player.active) ? refs.player.x : width / 2;
        const py = (refs.player && refs.player.active) ? refs.player.y : height - 100;
        const currentPlayerAngle = Phaser.Math.Angle.Between(gx, gy, px, py);

        // 計算 5 道射線端點並找出與玩家的最近距離與對應角度 (新增中文註解)
        const beamEnds = [];
        let minBeamDist = Infinity;
        let closestBeamAngle = 0;

        for (let b = 0; b < beamCount; b++) {
            const angle = currentAngle + (b * stepAngle);
            const endX = gx + Math.cos(angle) * beamLength;
            const endY = gy + Math.sin(angle) * beamLength;
            beamEnds.push({ endX, endY, angle });

            const dist = distPointToLine(px, py, gx, gy, endX, endY);
            if (dist < minBeamDist) {
                minBeamDist = dist;
                closestBeamAngle = angle;
            }
        }

        // 3. 【精準逼近判定】：計算死光當前是否正在朝玩家方向逼近 (新增中文註解)
        // angleDiff: 玩家角度相對於最近射線角度的相對旋轉差
        const angleDiff = Phaser.Math.Angle.Wrap(currentPlayerAngle - closestBeamAngle);
        // 若 angleDiff > 0 且 rotDirection > 0，表示射線順時針追趕玩家；若 angleDiff < 0 且 rotDirection < 0，表示射線逆時針追趕玩家
        const isClosingIn = (angleDiff * rotDirection > 0);

        // 邊界壓迫判定：只有在玩家處於左右邊界且射線正朝著邊界逼近時成立 (新增中文註解)
        const isNearLeftWall = (px < 130 && rotDirection === -1);
        const isNearRightWall = (px > width - 130 && rotDirection === 1);
        const isEdgeCrowded = (isNearLeftWall || isNearRightWall) && isClosingIn;

        // 空間快要塞不下玩家判定 (距離小於 85px 且射線正向玩家逼近) (新增中文註解)
        const isSpaceTooTight = (minBeamDist < 85 && isClosingIn);

        if (isLethal) {
            if (isSpaceTooTight || isEdgeCrowded) {
                // 【核心強制規則】：只有當死光向玩家逼近且快要塞不下時，才轉向！
                // 轉向後射線變為遠離玩家 (isClosingIn = false)，且持續朝新方向行走完整路徑，絕不剛拉開距離就立刻折返回頭！ (新增中文註解)
                if (timeElapsed - lastReverseTime > 1200) { // 1200ms 反轉保護期
                    rotDirection = -rotDirection; // 立刻轉向遠離玩家！ (新增中文註解)
                    lastReverseTime = timeElapsed;
                    nextMidwayReverseTime = timeElapsed + 4500; // 反轉後至少持續行走 4.5 秒，不隨意回頭 (新增中文註解)
                    scene.cameras.main.shake(70, 0.004);
                }
            } else if (timeElapsed > nextMidwayReverseTime) {
                // 只有在持續行走超長平穩路徑 (4.5 秒以上) 且遠離玩家時，才可能在中途自然換向 (新增中文註解)
                if (Math.random() < 0.4) {
                    rotDirection = -rotDirection;
                    lastReverseTime = timeElapsed;
                    scene.cameras.main.shake(50, 0.003);
                }
                nextMidwayReverseTime = timeElapsed + 4500;
            }
        }

        // 4. 【轉向後持續平穩行走】：目標速度為 rotDirection * 0.0075，走路即可輕鬆跟上 (新增中文註解)
        const targetSpeed = rotDirection * 0.0075;
        currentRotSpeed = Phaser.Math.Linear(currentRotSpeed, targetSpeed, 0.08 * deltaFactor);
        currentAngle += currentRotSpeed * deltaFactor;

        overloadGfx.clear();

        // 1. 繪製中央狂暴電流圓圈 (新增中文註解)
        const ringSegments = 24;
        overloadGfx.beginPath();
        for (let i = 0; i <= ringSegments; i++) {
            const rad = (i / ringSegments) * Math.PI * 2;
            const jitter = (Math.random() - 0.5) * 16;
            const rx = gx + Math.cos(rad) * (centralRingRadius + jitter);
            const ry = gy + Math.sin(rad) * (centralRingRadius + jitter);
            if (i === 0) overloadGfx.moveTo(rx, ry);
            else overloadGfx.lineTo(rx, ry);
        }
        overloadGfx.lineStyle(14, 0xaa00ff, isLethal ? 0.85 : 0.45);
        overloadGfx.strokePath();

        overloadGfx.lineStyle(5, 0x000000, isLethal ? 1.0 : 0.5);
        overloadGfx.strokePath();

        // 2. 繪製 5 道四散旋轉死光電流 (新增中文註解)
        for (let b = 0; b < beamEnds.length; b++) {
            const bEnd = beamEnds[b];

            // 繪製多層死光射線 (新增中文註解)
            // 外層暗黑紫色等離子電暈 (寬度 22px)
            overloadGfx.lineStyle(22, 0x9900ff, isLethal ? 0.85 : 0.35);
            overloadGfx.lineBetween(gx, gy, bEnd.endX, bEnd.endY);

            // 中層霓虹紫芒 (寬度 10px)
            overloadGfx.lineStyle(10, 0xff00ff, isLethal ? 0.95 : 0.5);
            overloadGfx.lineBetween(gx, gy, bEnd.endX, bEnd.endY);

            // 內層純黑高壓電弧 (寬度 4px)
            overloadGfx.lineStyle(4, 0x000000, isLethal ? 1.0 : 0.5);
            overloadGfx.lineBetween(gx, gy, bEnd.endX, bEnd.endY);

            // 沿射線繪製暗能量方塊與分叉電弧 (新增中文註解)
            if (isLethal) {
                for (let step = 1; step <= 8; step++) {
                    const distT = step / 8;
                    const nodeX = gx + (bEnd.endX - gx) * distT + (Math.random() - 0.5) * 15;
                    const nodeY = gy + (bEnd.endY - gy) * distT + (Math.random() - 0.5) * 15;

                    overloadGfx.fillStyle(0x000000, 1.0);
                    overloadGfx.fillRect(nodeX - 6, nodeY - 6, 12, 12);
                    overloadGfx.lineStyle(1.8, 0xbf00ff, 0.95);
                    overloadGfx.strokeRect(nodeX - 6, nodeY - 6, 12, 12);
                }
            }
        }

        // 3. 碰撞檢測：僅在預熱完成 (isLethal = true) 後觸發，碰到中央圓圈或旋轉死光無視盾牌立即死亡！ (新增中文註解)
        if (isLethal && refs.player && refs.player.active) {
            // 中央圓圈碰觸檢測 (新增中文註解)
            const distToCenter = Phaser.Math.Distance.Between(px, py, gx, gy);
            if (distToCenter < (centralRingRadius + 20)) {
                if (refs.triggerCrash) {
                    refs.triggerCrash(true); // 無視盾牌直接死亡！ (新增中文註解)
                    return;
                }
            }

            // 5 道旋轉死光碰觸檢測 (新增中文註解)
            for (let b = 0; b < beamEnds.length; b++) {
                const bEnd = beamEnds[b];
                const distToRay = distPointToLine(px, py, gx, gy, bEnd.endX, bEnd.endY);
                if (distToRay < 28) { // 精準射線碰撞半徑 (新增中文註解)
                    if (refs.triggerCrash) {
                        refs.triggerCrash(true); // 無視盾牌直接死亡！ (新增中文註解)
                        return;
                    }
                }
            }
        }
    };

    scene.events.on('update', overloadUpdateHandler);

    // 10.6 秒總持續時間（600ms 預警充能 + 10 秒狂暴旋轉）結束後，觸發全螢幕雷電華麗大爆炸！ (新增中文註解)
    scene.time.delayedCall(10600, () => {
        if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isFinalPhase) return;

        // 停止旋轉死光更新 (新增中文註解)
        if (overloadUpdateHandler) {
            scene.events.off('update', overloadUpdateHandler);
            overloadUpdateHandler = null;
        }
        if (overloadGfx && overloadGfx.destroy) {
            overloadGfx.destroy();
            overloadGfx = null;
        }
        if (overloadCountdownTimer) {
            overloadCountdownTimer.remove(false);
            overloadCountdownTimer = null;
        }

        // 4. 蓄力倒數提示：終極雷電大爆炸！立刻開盾！ (新增中文註解)
        if (overloadText && overloadText.active) {
            overloadText.setText('⚠️ 終極全螢幕雷電爆轟！立刻開盾！');
            overloadText.setColor('#ffff00');
            overloadText.setScale(1.2);
        }

        // 能量向大猩猩胸口強烈收縮聚攏蓄力 (850ms) (新增中文註解)
        overloadChargeGfx = scene.add.graphics().setDepth(9998);
        scene.cameras.main.shake(850, 0.018);

        const chargeTween = scene.tweens.addCounter({
            from: 100,
            to: 0,
            duration: 850,
            onUpdate: (tween) => {
                if (!overloadChargeGfx || !overloadChargeGfx.active) return;
                const r = (tween.getValue() / 100) * 400;
                overloadChargeGfx.clear();
                overloadChargeGfx.lineStyle(10, 0xff00ff, 0.9);
                overloadChargeGfx.strokeCircle(gx, gy, r);
                overloadChargeGfx.lineStyle(4, 0xffffff, 1.0);
                overloadChargeGfx.strokeCircle(gx, gy, r * 0.7);
            },
            onComplete: () => {
                if (overloadChargeGfx && overloadChargeGfx.destroy) {
                    overloadChargeGfx.destroy();
                    overloadChargeGfx = null;
                }

                if (!refs.gorilla || !refs.gorilla.active || !gorillaState.isFinalPhase) return;

                // 5. 【終極電流華麗大爆炸】：全螢幕雷電爆轟！ (新增中文註解)
                triggerGrandElectricSuperExplosion(scene, gx, gy);
            }
        });
    });
}

/**
 * 觸發全螢幕電流主題華麗大爆炸：
 * 只要此時開盾即可存活，若無開盾則直接被炸死；爆炸結束後大猩猩徹底死亡！ (新增中文註解)
 */
function triggerGrandElectricSuperExplosion(scene, gx, gy) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // 1. 全螢幕強烈白紫閃光與巨型震動 (新增中文註解)
    scene.cameras.main.flash(900, 255, 255, 255);
    scene.cameras.main.shake(1400, 0.045);

    // 2. 繪製全螢幕向外擴散的華麗雷電衝擊波與電弧群 (新增中文註解)
    const shockwaveGfx = scene.add.graphics().setDepth(9999);
    let explodeRadius = 20;

    const explodeEvent = scene.time.addEvent({
        delay: 16,
        repeat: 45,
        callback: () => {
            if (!shockwaveGfx || !shockwaveGfx.active) return;
            explodeRadius += 30;
            shockwaveGfx.clear();

            // 多層擴散能量環 (新增中文註解)
            shockwaveGfx.lineStyle(18, 0xaa00ff, 0.85);
            shockwaveGfx.strokeCircle(gx, gy, explodeRadius);

            shockwaveGfx.lineStyle(10, 0xff00cc, 0.95);
            shockwaveGfx.strokeCircle(gx, gy, explodeRadius * 0.85);

            shockwaveGfx.lineStyle(5, 0xffffff, 1.0);
            shockwaveGfx.strokeCircle(gx, gy, explodeRadius * 0.7);

            // 數十道向全螢幕四面八方擴散的黑色閃電 (新增中文註解)
            for (let f = 0; f < 18; f++) {
                const fAngle = (f / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
                const fx1 = gx + Math.cos(fAngle) * (explodeRadius * 0.3);
                const fy1 = gy + Math.sin(fAngle) * (explodeRadius * 0.3);
                const fx2 = gx + Math.cos(fAngle) * explodeRadius;
                const fy2 = gy + Math.sin(fAngle) * explodeRadius;

                shockwaveGfx.lineStyle(4, 0x000000, 1.0);
                shockwaveGfx.lineBetween(fx1, fy1, fx2, fy2);
                shockwaveGfx.lineStyle(2, 0xbf00ff, 0.9);
                shockwaveGfx.lineBetween(fx1, fy1, fx2, fy2);
            }
        }
    });

    // 3. 【生死判定】：只要此時盾牌有開就可以活下來！未開盾直接當機死亡！ (新增中文註解)
    const isPlayerShielding = (playerState.isInvincible || !!scene.currentDashShield);
    if (!isPlayerShielding) {
        // 未開盾：直接當機死亡！ (新增中文註解)
        if (refs.triggerCrash) {
            refs.triggerCrash(true);
        }
    } else {
        // 有開盾：成功抵擋終極大爆炸！產生金色護盾格擋火花與文字 (新增中文註解)
        if (refs.player) {
            const px = refs.player.x;
            const py = refs.player.y;
            for (let k = 0; k < 6; k++) {
                const spark = scene.add.circle(px + Phaser.Math.Between(-30, 30), py + Phaser.Math.Between(-30, 30), 12, 0xffdd00, 1.0).setDepth(9999);
                scene.tweens.add({
                    targets: spark,
                    scaleX: 2.5,
                    scaleY: 2.5,
                    alpha: 0,
                    duration: 350,
                    onComplete: () => spark.destroy()
                });
            }

            const surviveText = scene.add.text(px, py - 60, '🛡️ 完美格擋終極爆轟！', {
                fontSize: '24px',
                color: '#00ffcc',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5
            }).setOrigin(0.5).setDepth(9999);

            scene.tweens.add({
                targets: surviveText,
                y: py - 110,
                alpha: 0,
                duration: 1200,
                onComplete: () => surviveText.destroy()
            });
        }
    }

    // 4. 爆炸完成後大猩猩徹底死亡！ (新增中文註解)
    scene.time.delayedCall(900, () => {
        explodeEvent.remove(false);
        if (shockwaveGfx && shockwaveGfx.destroy) shockwaveGfx.destroy();
        if (overloadText) {
            overloadText.destroy();
            overloadText = null;
        }

        // 大猩猩灰飛煙滅，觸發真正死亡 (新增中文註解)
        handleGorillaDeath(scene);
    });
}

/**
 * 停止第三階段狂暴超載攻擊 (新增中文註解)
 */
export function stopFinalOverloadAttack(scene) {
    if (overloadUpdateHandler) {
        scene.events.off('update', overloadUpdateHandler);
        overloadUpdateHandler = null;
    }
    if (overloadCountdownTimer) {
        overloadCountdownTimer.remove(false);
        overloadCountdownTimer = null;
    }
    if (overloadGfx && overloadGfx.destroy) {
        overloadGfx.destroy();
        overloadGfx = null;
    }
    if (overloadChargeGfx && overloadChargeGfx.destroy) {
        overloadChargeGfx.destroy();
        overloadChargeGfx = null;
    }
    if (overloadText) {
        overloadText.destroy();
        overloadText = null;
    }
}

/**
 * 計算點到線段的最短距離 (新增中文註解：用於光束與旋轉死光碰撞檢測)
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
 * 停止大猩猩所有攻擊與計時器 (新增中文註解：清理攻擊補間與計時器，不影響二階段常駐黑色電流)
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
