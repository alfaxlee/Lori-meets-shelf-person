// === 哆啦噩夢攻擊模組 ===
// 負責哆啦噩夢的所有攻擊實作（狙擊、火箭筒、瞬移太陽球）以及招式排程器
import { doraState, spawnClone } from './DoraStateMachine.js';
import { playerState } from '../player/PlayerController.js';

// --- 共享參考 ---
let refs = {};

/**
 * 初始化攻擊模組所需的遊戲物件參考
 * @param {object} gameRefs - 包含 dora, player, doraHPText, platforms 等物件
 */
export function initDoraAttackRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 啟動招式排程器：每 2 秒隨機選擇一個招式
 * (60% 狙擊、20% 火箭筒、20% 瞬移太陽球)
 */
export function startDoraAttacks(scene) {
    // 先清除舊的定時器
    stopDoraAttacks();

    // 建立新的招式選擇計時器 (與本體 AI 一致)
    doraState.sniperTimer = scene.time.addEvent({
        delay: 2000,
        callback: () => {
            if (refs.dora && refs.dora.active) {
                // 如果正在進行瞬移攻擊，先不發動新攻擊，專心引導瞬移藍球
                if (doraState.isTeleporting) return;

                const r = Math.random();
                console.log(`[哆啦噩夢 AI] 招式隨機判定，隨機數 r = ${r.toFixed(3)}`);
                
                // 真領域展開後，本尊不能再使用傳送球 (只有最初的兩顆生成分身傳送球)。此時只有 75% 狙擊、25% 火箭筒
                if (doraState.isTrueDomainExpanded) {
                    if (r < 0.75) {
                        // 狙擊攻擊限制為最多 2 人同時使用
                        if (doraState.activeSniperCount < 2) {
                            console.log("[哆啦噩夢 AI] ➡️ (真領域) 決定發動狙擊攻擊 (75% 機率)");
                            triggerSniperAttack(scene);
                        } else {
                            console.log("[哆啦噩夢 AI] ➡️ (真領域) 狙擊人數已達上限，改為發動火箭筒攻擊");
                            triggerRocketAttack(scene);
                        }
                    } else {
                        console.log("[哆啦噩夢 AI] ➡️ (真領域) 決定發動火箭筒攻擊 (25% 機率)");
                        triggerRocketAttack(scene);
                    }
                    return;
                }

                // 正常領域狀態下的招式選擇 (60% 狙擊、20% 火箭筒、20% 傳送球)
                if (r < 0.60) {
                    if (doraState.activeSniperCount < 2) {
                        console.log("[哆啦噩夢 AI] ➡️ 決定發動狙擊攻擊 (60% 機率)");
                        triggerSniperAttack(scene);
                    } else {
                        console.log("[哆啦噩夢 AI] ➡️ 狙擊人數已達上限，改為發動火箭筒攻擊");
                        triggerRocketAttack(scene);
                    }
                } else if (r < 0.80) {
                    console.log("[哆啦噩夢 AI] ➡️ 決定發動火箭筒攻擊 (20% 機率)");
                    triggerRocketAttack(scene);
                } else {
                    console.log("[哆啦噩夢 AI] ➡️ 決定發動瞬移太陽球攻擊 (20% 機率)");
                    triggerTeleportAttack(scene);
                }
            }
        },
        loop: true
    });
}

/**
 * 停止所有攻擊排程
 */
export function stopDoraAttacks() {
    if (doraState.sniperTimer) {
        doraState.sniperTimer.destroy();
        doraState.sniperTimer = null;
    }
}

// ========================================
// 輔助函式
// ========================================

/**
 * 輔助畫虛線的函式 (以紅色虛線警示玩家)
 */
function drawDashedLine(graphics, x1, y1, x2, y2, dashLength = 10, gapLength = 8) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    let currentDistance = 0;
    while (currentDistance < distance) {
        const startX = x1 + Math.cos(angle) * currentDistance;
        const startY = y1 + Math.sin(angle) * currentDistance;
        currentDistance += dashLength;
        if (currentDistance > distance) currentDistance = distance;
        const endX = x1 + Math.cos(angle) * currentDistance;
        const endY = y1 + Math.sin(angle) * currentDistance;
        graphics.lineBetween(startX, startY, endX, endY);
        currentDistance += gapLength;
    }
}

// ========================================
// 狙擊攻擊
// ========================================

/**
 * 狙擊攻擊：瞄準玩家 0.5 秒，生成紅色/紫色虛線警示，發射高速狙擊子彈，且盾牌無敵無效 (強制當機)
 */
export function triggerSniperAttack(scene, attacker = refs.dora) {
    if (!attacker || !attacker.active || !refs.player || !refs.player.active) return;

    const player = refs.player;

    // 建立虛線警示線，深度設為最上層
    const warningLine = scene.add.graphics();
    warningLine.setDepth(9999);
    warningLine.name = 'warning'; // 死亡或過場時可自動搜尋銷毀

    // 累加當前狙擊人數
    doraState.activeSniperCount++;
    let decremented = false;
    const decrement = () => {
        if (!decremented) {
            doraState.activeSniperCount = Math.max(0, doraState.activeSniperCount - 1);
            decremented = true;
        }
    };
    warningLine.once('destroy', decrement);

    // 初始瞄準角度：隨機偏移 45 度 (約 0.8 弧度)
    const initialTargetAngle = Phaser.Math.Angle.Between(attacker.x, attacker.y, player.x, player.y);
    const randomOffset = Phaser.Math.FloatBetween(-0.8, 0.8);
    let currentAngle = initialTargetAngle + randomOffset;

    const updateLine = (time, delta) => {
        if (!attacker.active || !player.active || !warningLine.active) {
            scene.events.off('update', updateLine);
            warningLine.destroy();
            return;
        }

        // 計算即時的玩家角度
        const targetAngle = Phaser.Math.Angle.Between(attacker.x, attacker.y, player.x, player.y);

        // 以固定的角速度 5.2 弧度每秒轉向玩家
        const angularSpeed = 5.2;
        const step = angularSpeed * (delta / 1000);
        currentAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, step);

        // 繪製虛線 (真領域展開後，虛線顏色變為紫色 0xaa00ff)
        warningLine.clear();
        const lineColor = doraState.isTrueDomainExpanded ? 0xaa00ff : 0xff0000;
        warningLine.lineStyle(2, lineColor, 0.85);
        
        const lineLength = 2000;
        const endX = attacker.x + Math.cos(currentAngle) * lineLength;
        const endY = attacker.y + Math.sin(currentAngle) * lineLength;
        drawDashedLine(warningLine, attacker.x, attacker.y, endX, endY);
    };

    scene.events.on('update', updateLine);

    // 瞄準 0.5 秒後，鎖定軌跡並發射高速狙擊子彈
    scene.time.delayedCall(500, () => {
        scene.events.off('update', updateLine);
        warningLine.destroy();

        if (!attacker.active || !player.active) return;

        const fireAngle = currentAngle;
        const speed = 3500;

        // 建立子彈 (真領域展開後，外觀變為紫色 0xaa00ff)
        const bulletColor = doraState.isTrueDomainExpanded ? 0xaa00ff : 0x0055ff;
        const bullet = scene.add.rectangle(attacker.x + Math.cos(fireAngle) * 40, attacker.y + Math.sin(fireAngle) * 40, 60, 4, bulletColor);
        bullet.setDepth(9999);
        bullet.name = 'warning';
        scene.physics.add.existing(bullet);
        bullet.setRotation(fireAngle);
        bullet.body.allowGravity = false;
        bullet.body.setVelocity(Math.cos(fireAngle) * speed, Math.sin(fireAngle) * speed);

        // 與牆壁/平台碰撞時銷毀
        if (refs.platforms) {
            scene.physics.add.collider(bullet, refs.platforms, () => {
                bullet.destroy();
            });
        }

        // 穿牆漏判 (Tunneling) 線段碰撞檢查
        let prevX = bullet.x;
        let prevY = bullet.y;

        const checkTunneling = () => {
            if (!bullet.active) {
                scene.events.off('update', checkTunneling);
                return;
            }
            if (!player.active) {
                bullet.destroy();
                scene.events.off('update', checkTunneling);
                return;
            }

            const line = new Phaser.Geom.Line(prevX, prevY, bullet.x, bullet.y);
            const playerRect = player.getBounds();

            if (Phaser.Geom.Intersects.LineToRectangle(line, playerRect)) {
                playerState.isInvincible = false; // 強制解除玩家無敵/護盾
                scene.triggerCrash(true);        // 狙擊強制當機
                bullet.destroy();
                scene.events.off('update', checkTunneling);
                return;
            }

            if (bullet.x < 0 || bullet.x > scene.cameras.main.width || bullet.y < 0 || bullet.y > scene.cameras.main.height) {
                bullet.destroy();
                scene.events.off('update', checkTunneling);
                return;
            }

            prevX = bullet.x;
            prevY = bullet.y;
        };

        scene.events.on('update', checkTunneling);
        bullet.once('destroy', () => {
            scene.events.off('update', checkTunneling);
        });
    });
}

// ========================================
// 火箭筒攻擊
// ========================================

/**
 * 火箭筒攻擊：朝玩家方向一次發射三枚扇形火箭 (偏左 45°、正中、偏右 45°)，
 * 外觀為長方形本體加前端三角形，速度與玩家霰彈槍一致。
 * 只要玩家進入火箭筒半徑內即觸發大爆炸且必中玩家。
 */
/**
 * 火箭筒攻擊：發射者向玩家方向一次發射三枚扇形火箭 (偏左 45°、正中、偏右 45°)。
 */
export function triggerRocketAttack(scene, attacker = refs.dora) {
    if (!attacker || !attacker.active || !refs.player || !refs.player.active) return;

    const player = refs.player;

    // 鎖定玩家當下角度為發射的中心角度
    const baseAngle = Phaser.Math.Angle.Between(attacker.x, attacker.y, player.x, player.y);
    const spread = Phaser.Math.DegToRad(45); // 45 度偏角

    // 一次發射三枚火箭 (偏左 45 度、正中、偏右 45 度)
    for (let i = -1; i <= 1; i++) {
        const fireAngle = baseAngle + (i * spread);

        // 建立火箭筒 Container
        const rocket = scene.add.container(attacker.x + Math.cos(fireAngle) * 40, attacker.y + Math.sin(fireAngle) * 40);
        rocket.setDepth(9999);
        rocket.name = 'warning'; // 死亡時自動銷毀

        // 使用 Graphics 繪製外觀 (真領域展開後為紫色 0xaa00ff 與粉紅 0xff00ff)
        const bodyColor = doraState.isTrueDomainExpanded ? 0xaa00ff : 0x0055ff;
        const tipColor = doraState.isTrueDomainExpanded ? 0xff00ff : 0x00aaff;

        const rocketGfx = scene.add.graphics();
        rocketGfx.fillStyle(bodyColor, 1);
        rocketGfx.fillRect(-21, -8, 30, 16);
        rocketGfx.fillStyle(tipColor, 1);
        rocketGfx.beginPath();
        rocketGfx.moveTo(9, -8);
        rocketGfx.lineTo(9, 8);
        rocketGfx.lineTo(21, 0);
        rocketGfx.closePath();
        rocketGfx.fillPath();

        rocket.add(rocketGfx);

        // 啟動物理剛體並設定尺寸
        scene.physics.add.existing(rocket);
        rocket.body.setSize(42, 16);
        rocket.body.allowGravity = false;
        rocket.setRotation(fireAngle);

        // 火箭不受領域展開的減速影響，維持滿速 700
        const speed = 700;
        rocket.body.setVelocity(Math.cos(fireAngle) * speed, Math.sin(fireAngle) * speed);

        // 與實體平台碰撞銷毀並爆炸
        if (refs.platforms) {
            scene.physics.add.collider(rocket, refs.platforms, () => {
                explodeRocket(scene, rocket);
            });
        }

        // 每影格進行玩家距離偵測
        const checkProximity = () => {
            if (!rocket.active) {
                scene.events.off('update', checkProximity);
                return;
            }
            if (!player.active) {
                rocket.destroy();
                scene.events.off('update', checkProximity);
                return;
            }

            const dist = Phaser.Math.Distance.Between(rocket.x, rocket.y, player.x, player.y);
            const explosionRadius = 200;

            if (dist <= explosionRadius) {
                explodeRocket(scene, rocket, true); // true 代表強迫命中
                scene.events.off('update', checkProximity);
                return;
            }

            if (rocket.x < 0 || rocket.x > scene.cameras.main.width || rocket.y < 0 || rocket.y > scene.cameras.main.height) {
                rocket.destroy();
                scene.events.off('update', checkProximity);
            }
        };

        scene.events.on('update', checkProximity);
        rocket.once('destroy', () => {
            scene.events.off('update', checkProximity);
        });
    }
}

/**
 * 執行火箭筒爆炸：生成藍色/紫色擴散波視覺效果
 */
function explodeRocket(scene, rocket, forceHitPlayer = false) {
    if (!rocket.active) return;

    const player = refs.player;
    const rx = rocket.x;
    const ry = rocket.y;

    rocket.destroy();

    // 建立爆炸波效果 (真領域展開後，顏色改為紫色 0xaa00ff)
    const blastColor = doraState.isTrueDomainExpanded ? 0xaa00ff : 0x00aaff;
    const blast = scene.add.circle(rx, ry, 0, blastColor, 0.6);
    blast.setDepth(9999);
    scene.tweens.add({
        targets: blast,
        radius: 200,
        alpha: 0,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => { blast.destroy(); }
    });

    scene.cameras.main.shake(200, 0.01);

    // 火箭判定：防禦後不強制當機
    if (forceHitPlayer) {
        scene.triggerCrash();
    } else if (player && player.active) {
        const dist = Phaser.Math.Distance.Between(rx, ry, player.x, player.y);
        if (dist <= 200) {
            scene.triggerCrash();
        }
    }
}

// ========================================
// 瞬移太陽球攻擊
// ========================================

/**
 * 瞬移太陽球攻擊：在畫面上隨機生成一個點，出現驚嘆號警示。
 * 丟出一顆有著十二道旋轉陽光光束的藍色太陽球，球以物理拋物線飛向該點。
 * 球落地時，哆啦噩夢瞬移過去，引爆一個半徑 250 像素的巨型破防爆炸！
 */
/**
 * 瞬移太陽球攻擊：朝隨機點發射拋物線太陽球並引爆，
 * isCloneLaunch = true 代表是真領域展開啟動時發射的分身生成球，此球落地後不移動本體，而是生成一個分身。
 */
export function triggerTeleportAttack(scene, attacker = refs.dora, isCloneLaunch = false) {
    if (!attacker || !attacker.active || !refs.player || !refs.player.active) return;

    const player = refs.player;

    // 如果是本尊且不是分身生成球，才設定正在瞬移的狀態旗標
    if (attacker === refs.dora && !isCloneLaunch) {
        doraState.isTeleporting = true;
    }

    // 隨機在螢幕上選定一個地面高度的目標點
    const targetX = Phaser.Math.Between(100, scene.cameras.main.width - 100);
    const targetY = scene.cameras.main.height - 110;

    // 在目標落點生成紅色驚嘆號
    const exclamation = scene.add.text(targetX, targetY - 40, '!', { 
        fontSize: '64px', 
        fill: '#ff0000', 
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5);
    exclamation.name = 'warning';

    // 建立太陽球 Container
    const sunball = scene.add.container(attacker.x, attacker.y - 30);
    sunball.setDepth(9999);
    sunball.name = 'warning';

    // 使用向量繪圖畫出球體 (真領域展開後變為紫色核心 0x8800ff 與粉紅光束 0xff00ff)
    const coreColor = doraState.isTrueDomainExpanded ? 0x8800ff : 0x00aaff;
    const rayColor = doraState.isTrueDomainExpanded ? 0xff00ff : 0x00ffff;

    const ballGfx = scene.add.graphics();
    ballGfx.fillStyle(coreColor, 1);
    ballGfx.fillCircle(0, 0, 16);
    ballGfx.lineStyle(3, rayColor, 0.8);
    const numRays = 12;
    const innerRad = 18;
    const outerRad = 28;
    for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2;
        const x1 = Math.cos(angle) * innerRad;
        const y1 = Math.sin(angle) * innerRad;
        const x2 = Math.cos(angle) * outerRad;
        const y2 = Math.sin(angle) * outerRad;
        ballGfx.lineBetween(x1, y1, x2, y2);
    }
    sunball.add(ballGfx);

    // 光線旋轉
    scene.tweens.add({
        targets: sunball,
        angle: 360,
        duration: 1000,
        repeat: -1
    });

    scene.physics.add.existing(sunball);
    sunball.body.allowGravity = true;

    // 計算拋物線初始速度
    const Dx = targetX - attacker.x;
    const Dy = (targetY - 30) - (attacker.y - 30);
    const vx = Dx;
    const vy = Dy - 500;
    
    sunball.body.setVelocity(vx, vy);

    // 1 秒後落地
    scene.time.delayedCall(1000, () => {
        exclamation.destroy();
        sunball.destroy();

        if (!attacker.active || !player.active) {
            if (attacker === refs.dora) doraState.isTeleporting = false;
            return;
        }

        // 如果是分身發射或是真領域啟動的雙重分身球，不瞬移本體，而是直接在該位置生成分身
        if (isCloneLaunch) {
            spawnClone(scene, targetX, targetY);
        } else {
            // 正常情況下：瞬移發射者
            attacker.setPosition(targetX, targetY);
            if (attacker === refs.dora) {
                doraState.isTeleporting = false; // 解除瞬移鎖定
            }
        }

        // 在落地點引爆大爆炸 (真領域為紫色 0xaa00ff，否則藍色)
        const blastColor = doraState.isTrueDomainExpanded ? 0xaa00ff : 0x00aaff;
        const blast = scene.add.circle(targetX, targetY, 0, blastColor, 0.6);
        blast.setDepth(9999);
        scene.tweens.add({
            targets: blast,
            radius: 250,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => { blast.destroy(); }
        });

        scene.cameras.main.shake(300, 0.015);

        // 判定玩家是否在大爆炸半徑 (250 像素) 內
        const dist = Phaser.Math.Distance.Between(targetX, targetY, player.x, player.y);
        if (dist <= 250) {
            scene.triggerCrash(); // 盾牌/無敵可防禦
        }
    });
}

/**
 * 真領域展開過場結束時，朝兩個隨機點拋射紫色太陽球以召喚 2 個分身 (本體不消失)
 */
export function spawnTrueDomainInitialClones(scene) {
    if (!refs.dora || !refs.dora.active) return;
    
    console.log("[哆啦噩夢 AI] 🔮 丟出兩顆紫色傳送球以製造分身！");
    // 第一顆球 (立刻丟出)
    triggerTeleportAttack(scene, refs.dora, true);
    // 第二顆球 (延遲 150ms 丟出，增加視覺層次感)
    scene.time.delayedCall(150, () => {
        if (refs.dora && refs.dora.active) {
            triggerTeleportAttack(scene, refs.dora, true);
        }
    });
}

/**
 * 分身的隨機攻擊排程器：每 2 秒一次，限制狙擊人數最多 2 位，若超限改為火箭筒
 */
export function triggerCloneAttack(scene, clone) {
    if (!clone || !clone.active) return;

    const r = Math.random();
    if (r < 0.60) {
        // 如果目前使用狙擊的人數小於 2，則發動狙擊
        if (doraState.activeSniperCount < 2) {
            triggerSniperAttack(scene, clone);
        } else {
            // 否則改用火箭筒
            triggerRocketAttack(scene, clone);
        }
    } else {
        triggerRocketAttack(scene, clone);
    }
}
