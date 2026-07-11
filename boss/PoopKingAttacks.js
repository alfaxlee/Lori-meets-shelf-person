// === 請屎皇 攻擊模組 ===
// 負責請屎皇的所有攻擊實作（綠色斬擊、三槍連刺、以及騎士模式的究極九連擊 Combo）
// 新增程式碼皆附上中文註解

import { playerState } from '../player/PlayerController.js';

let refs = {};
let attackTimer = null; // 招式選擇計時器

/**
 * 初始化攻擊模組所需的遊戲物件與狀態參考
 */
export function initPoopKingAttackRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 排程下一次攻擊 (支援自訂冷卻時間，Combo 完後為 5 秒)
 */
function scheduleNextAttack(scene, customCooldown = 500) {
    stopPoopKingAttacks();

    // 如果冷卻時間是 5000ms，說明剛完成了 Combo，將 isCooldown 設為 true 進入輸出喘息期 (新增)
    if (customCooldown === 5000 && refs.poopKingState) {
        refs.poopKingState.isCooldown = true;
        if (refs.poopKing && refs.poopKing.active) {
            refs.poopKing.setTint(0x88ccff); // 設為冰藍色，代表冷卻喘息中 (新增)
        }
    }

    // 依據傳入的冷卻時間排程下一次攻擊 (新增中文註解：依冷卻時間排程下一次攻擊)
    attackTimer = scene.time.delayedCall(customCooldown, () => {
        // 冷卻結束，關閉 isCooldown 狀態 (新增)
        if (refs.poopKingState) {
            refs.poopKingState.isCooldown = false;
        }
        if (refs.poopKing && refs.poopKing.active) {
            refs.poopKing.clearTint(); // 結束冷卻，清除藍色 (新增)
        }

        if (refs.poopKing && refs.poopKing.active && refs.player && refs.player.active) {
            if (refs.poopKingState && refs.poopKingState.isAttacking) return;

            // 騎士模式下，只會使用 Combo 連段攻擊
            if (refs.poopKingState && refs.poopKingState.isKnightMode) {
                console.log("[請屎皇 AI] ➡️ 騎士模式，只發動：究極連擊 (Combo)");
                triggerKnightCombo(scene);
            } else {
                const r = Math.random();
                if (r < 0.5) {
                    console.log("[請屎皇 AI] ➡️ 發動：綠色斬擊");
                    triggerGreenSlash(scene);
                } else {
                    console.log("[請屎皇 AI] ➡️ 發動：三槍連刺");
                    triggerThreeSpears(scene);
                }
            }
        }
    });
}

/**
 * 啟動招式排程器：開局延遲 1 秒後發動首招
 */
export function startPoopKingAttacks(scene) {
    stopPoopKingAttacks();

    if (!refs.poopKingState) {
        // 安全起見，從狀態機模組引入資料
        import('./PoopKingStateMachine.js').then((m) => {
            refs.poopKingState = m.poopKingState;
        });
    }

    // 開局稍微延遲 1 秒後發動首招 (新增中文註解：開局延遲 1 秒)
    attackTimer = scene.time.delayedCall(1000, () => {
        if (refs.poopKing && refs.poopKing.active && refs.player && refs.player.active) {
            // 騎士模式下，只會使用 Combo 連段攻擊 (修改)
            if (refs.poopKingState && refs.poopKingState.isKnightMode) {
                triggerKnightCombo(scene);
            } else {
                const r = Math.random();
                if (r < 0.5) {
                    triggerGreenSlash(scene);
                } else {
                    triggerThreeSpears(scene);
                }
            }
        }
    });
}

/**
 * 停止所有攻擊排程
 */
export function stopPoopKingAttacks() {
    if (attackTimer) {
        attackTimer.destroy();
        attackTimer = null;
    }
}

/**
 * 輔助函數：執行盾牌碰撞判定，若被格擋則銷毀護盾並重置無敵狀態，若沒防住則觸發當機
 * 返回 true 代表被成功防住，false 代表防禦失敗
 */
function checkPlayerBlock(scene) {
    if (playerState.isInvincible) {
        console.log("[請屎皇 Combo] 🛡️ 玩家成功用衝刺盾牌防住了一擊！");
        if (scene.currentDashShield) {
            scene.currentDashShield.destroy();
        }
        playerState.isInvincible = false;
        refs.player.setAlpha(1);
        scene.cameras.main.flash(100, 0, 255, 255); // 藍色防禦閃光
        return true;
    } else {
        console.log("[請屎皇 Combo] 💥 玩家防禦失敗被擊中！觸發當機！");
        scene.triggerCrash();
        return false;
    }
}

/**
 * 騎士模式專屬：究極九連擊 Combo 連段招式
 * 招式結構：溝爪抓人(1) -> 雙刀斬擊(2) -> 長矛五連刺(5) -> 投擲長矛擊退(1)，每一段攻擊皆需要對應一次衝刺防禦。
 */
function triggerKnightCombo(scene) {
    const poopKing = refs.poopKing;
    const player = refs.player;
    const state = refs.poopKingState;

    if (!poopKing || !player || !poopKing.active || !player.active) return;

    if (state) state.isAttacking = true;

    // 1. 初始化 Combo 狀態，使玩家定身，關閉重力，確保指示燈為熄滅狀態
    playerState.cannotMove = true;
    playerState.isDashIndicatorLit = false;
    poopKing.body.allowGravity = false;
    poopKing.body.setImmovable(true); // 設定請屎皇為不可推擠狀態，防範被子彈或玩家推擠 (新增)
    poopKing.setVelocity(0, 0);

    // 每一段攻擊的排程列表
    const comboSteps = [];

    // --- 連段 1：溝爪把玩家溝近 ---
    comboSteps.push((next) => {
        poopKing.setTint(0xff00ff); // 紫色警告
        playerState.isDashIndicatorLit = true; // 亮起衝刺警示紅燈
        scene.time.delayedCall(800, () => { // 間距時間拉慢至 800ms
            if (!poopKing.active || !player.active) {
                playerState.isDashIndicatorLit = false;
                return;
            }
            poopKing.clearTint();

            // 畫出溝爪鍊線
            const chainGfx = scene.add.graphics();
            chainGfx.setDepth(9999);

            const hookObj = { x: poopKing.x, y: poopKing.y };
            scene.tweens.add({
                targets: hookObj,
                x: player.x,
                y: player.y,
                duration: 180,
                onUpdate: () => {
                    if (!chainGfx.active) return;
                    chainGfx.clear();
                    // 繪製鐵鍊 (黑白雙色虛線效果)
                    chainGfx.lineStyle(6, 0x333333, 1.0);
                    chainGfx.lineBetween(poopKing.x, poopKing.y, hookObj.x, hookObj.y);
                    chainGfx.lineStyle(2, 0xdddddd, 1.0);
                    chainGfx.lineBetween(poopKing.x, poopKing.y, hookObj.x, hookObj.y);

                    // 繪製爪頭 (三角形)
                    chainGfx.fillStyle(0xdddddd, 1.0);
                    chainGfx.lineStyle(2, 0x333333, 1.0);
                    chainGfx.beginPath();
                    const angle = Phaser.Math.Angle.Between(poopKing.x, poopKing.y, hookObj.x, hookObj.y);
                    chainGfx.moveTo(hookObj.x + Math.cos(angle) * 15, hookObj.y + Math.sin(angle) * 15);
                    chainGfx.lineTo(hookObj.x + Math.cos(angle + Math.PI * 0.7) * 12, hookObj.y + Math.sin(angle + Math.PI * 0.7) * 12);
                    chainGfx.lineTo(hookObj.x + Math.cos(angle - Math.PI * 0.7) * 12, hookObj.y + Math.sin(angle - Math.PI * 0.7) * 12);
                    chainGfx.closePath();
                    chainGfx.fillPath();
                    chainGfx.strokePath();
                },
                onComplete: () => {
                    chainGfx.destroy();
                    playerState.isDashIndicatorLit = false; // 判定發起，熄滅警示紅燈
                    if (!poopKing.active || !player.active) return;

                    // 碰撞判定，玩家必須在此刻衝刺格擋 (防禦成功則不拉近，失敗則被勾過來)
                    const blocked = checkPlayerBlock(scene);
                    if (!blocked) {
                        // 沒擋住：被勾過去
                        const pullX = poopKing.x + (poopKing.x < player.x ? 120 : -120);
                        scene.tweens.add({
                            targets: player,
                            x: pullX,
                            y: poopKing.y,
                            duration: 150,
                            ease: 'Cubic.easeOut',
                            onComplete: () => { next(); }
                        });
                    } else {
                        // 擋住了：不拉近，但請屎皇直接突進過去貼身繼續 combo (確保 combo 連續性)
                        const dashX = player.x + (poopKing.x < player.x ? -120 : 120);
                        scene.tweens.add({
                            targets: poopKing,
                            x: dashX,
                            y: player.y - 55, // 對齊玩家底部
                            duration: 150,
                            ease: 'Cubic.easeOut',
                            onComplete: () => { next(); }
                        });
                    }
                }
            });
        });
    });

    // --- 連段 2 & 3：雙刀斬擊 (從下往上、從上往下) ---
    // 重構以支援在中間點 (Apex) 精準判定格擋 (新增中文註解：引進 midpoint 與 complete 回呼)
    const drawSlashEffect = (angle, isUpward, onMidpoint, onComplete) => {
        const slashGfx = scene.add.graphics();
        slashGfx.setDepth(9999);
        let progress = 0;
        const slashPoints = [];
        const radius = 170;
        let checked = false;

        const startSweepAngle = isUpward ? (angle + 1.3) : (angle - 1.3);
        const endSweepAngle = isUpward ? (angle - 1.3) : (angle + 1.3);

        const slashTimer = scene.time.addEvent({
            delay: 16,
            callback: () => {
                progress += 0.1;
                if (!slashGfx.active) return;
                slashGfx.clear();

                const currentAngle = startSweepAngle + (endSweepAngle - startSweepAngle) * progress;
                const tipX = poopKing.x + Math.cos(currentAngle) * radius;
                const tipY = poopKing.y + Math.sin(currentAngle) * radius;

                slashPoints.push({ x: tipX, y: tipY });
                if (slashPoints.length > 8) slashPoints.shift();

                for (let i = 1; i < slashPoints.length; i++) {
                    const ratio = i / slashPoints.length;
                    const alpha = ratio * 0.7;
                    const thickness = 16 * ratio;
                    slashGfx.lineStyle(thickness, 0x00ff00, alpha);
                    slashGfx.lineBetween(slashPoints[i-1].x, slashPoints[i-1].y, slashPoints[i].x, slashPoints[i].y);
                    slashGfx.lineStyle(thickness * 0.35, 0xffffff, alpha);
                    slashGfx.lineBetween(slashPoints[i-1].x, slashPoints[i-1].y, slashPoints[i].x, slashPoints[i].y);
                }

                // 在斬擊軌跡達中間點時，執行格擋判定，確保視覺與邏輯 100% 對齊 (新增)
                if (progress >= 0.5 && !checked) {
                    checked = true;
                    if (onMidpoint) onMidpoint();
                }

                if (progress >= 1.0) {
                    scene.tweens.add({
                        targets: slashGfx,
                        alpha: 0,
                        duration: 100,
                        onComplete: () => {
                            slashGfx.destroy();
                            slashTimer.destroy();
                            if (onComplete) onComplete();
                        }
                    });
                }
            },
            loop: true
        });
    };

    // 連段 2: 第一斬 (從下往上)
    comboSteps.push((next) => {
        poopKing.setTint(0x00ff00); // 閃爍綠色
        playerState.isDashIndicatorLit = true; // 亮起警示紅燈
        scene.time.delayedCall(800, () => { // 間距時間拉慢至 800ms
            playerState.isDashIndicatorLit = false; // 判定發起，熄滅警示紅燈
            if (!poopKing.active || !player.active) return;
            poopKing.clearTint();

            const angle = Phaser.Math.Angle.Between(poopKing.x, poopKing.y, player.x, player.y);
            
            // 斬擊不破盾：不呼叫 checkPlayerBlock，動畫結束後直接繼續 Combo (修改)
            drawSlashEffect(angle, true,
                () => {}, // 中點回呼：不進行任何格擋判定 (修改)
                () => {
                    scene.time.delayedCall(450, next); // 動畫結束後直接繼續下一擊 (修改)
                }
            );
        });
    });

    // 連段 3: 第二斬 (從上往下)
    comboSteps.push((next) => {
        poopKing.setTint(0x00ff00); // 閃爍綠色
        playerState.isDashIndicatorLit = true; // 亮起警示紅燈
        scene.time.delayedCall(800, () => { // 間距時間拉慢至 800ms
            playerState.isDashIndicatorLit = false; // 判定發起，熄滅警示紅燈
            if (!poopKing.active || !player.active) return;
            poopKing.clearTint();

            const angle = Phaser.Math.Angle.Between(poopKing.x, poopKing.y, player.x, player.y);
            
            // 斬擊不破盾：不呼叫 checkPlayerBlock，動畫結束後直接繼續 Combo (修改)
            drawSlashEffect(angle, false,
                () => {}, // 中點回呼：不進行任何格擋判定 (修改)
                () => {
                    scene.time.delayedCall(450, next); // 動畫結束後直接繼續下一擊 (修改)
                }
            );
        });
    });

    // --- 連段 4 至 8：長矛刺五下 ---
    // 重構以支援在最長點 (Apex) 精準判定格擋 (新增中文註解：引進 onApex 與 onComplete 回呼)
    const performSpearThrustEffect = (angle, onApex, onComplete) => {
        const spearGfx = scene.add.graphics();
        spearGfx.setDepth(9999);
        let length = 0;
        let thrusting = true;

        const thrustTimer = scene.time.addEvent({
            delay: 16,
            callback: () => {
                if (thrusting) {
                    length += 70;
                    if (length >= 260) {
                        length = 260;
                        thrusting = false;
                        // 槍尖伸至最長點 (Apex)，進行格擋判定！此時才是真正擊中玩家的時機 (新增)
                        if (onApex) onApex();
                    }
                } else {
                    length -= 70;
                    if (length <= 0) {
                        length = 0;
                        spearGfx.destroy();
                        thrustTimer.destroy();
                        if (onComplete) onComplete();
                        return;
                    }
                }

                if (!spearGfx.active) return;
                spearGfx.clear();

                // 畫主槍桿與發光核
                spearGfx.lineStyle(6, 0x7f8c8d, 1.0);
                const tipX = poopKing.x + Math.cos(angle) * length;
                const tipY = poopKing.y + Math.sin(angle) * length;
                const tipLength = Math.min(length, 60);
                const xBase = poopKing.x + Math.cos(angle) * (length - tipLength);
                const yBase = poopKing.y + Math.sin(angle) * (length - tipLength);
                spearGfx.lineBetween(poopKing.x, poopKing.y, xBase, yBase);
                spearGfx.lineStyle(3, 0x00ff00, 1.0);
                spearGfx.lineBetween(poopKing.x, poopKing.y, xBase, yBase);

                // 畫大鑽石槍刃
                if (length > 0) {
                    const wing1X = xBase + Math.cos(angle + Math.PI * 0.5) * 20;
                    const wing1Y = yBase + Math.sin(angle + Math.PI * 0.5) * 20;
                    const wing2X = xBase + Math.cos(angle - Math.PI * 0.5) * 20;
                    const wing2Y = yBase + Math.sin(angle - Math.PI * 0.5) * 20;

                    spearGfx.fillStyle(0x00ff00, 1.0);
                    spearGfx.lineStyle(3, 0xffffff, 1.0);
                    spearGfx.beginPath();
                    spearGfx.moveTo(tipX, tipY);
                    spearGfx.lineTo(wing1X, wing1Y);
                    spearGfx.lineTo(xBase, yBase);
                    spearGfx.lineTo(wing2X, wing2Y);
                    spearGfx.closePath();
                    spearGfx.fillPath();
                    spearGfx.strokePath();
                }
            },
            loop: true
        });
    };

    // --- 連段最後一擊：投擲長矛擊退到地圖邊界 (取代五連長矛，改為單一飛矛收尾) (修改) ---
    comboSteps.push((next) => {
        // 先取消 PlayerController 殘留的衝刺無敵倒數計時器，避免蓋掉保護 (修改)
        if (scene.invincibilityTimer) {
            scene.invincibilityTimer.remove();
            scene.invincibilityTimer = null;
        }

        // 啟動重複計時器，每 50ms 強制把 isInvincible 設為 true
        // 不論任何外部程式把它關掉，都會立刻被重設回來，直到本步驟結束 (新增)
        playerState.isInvincible = true;
        const lastStepProtectTimer = scene.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
                playerState.isInvincible = true; // 持續強制維持無敵狀態 (新增)
                if (scene.invincibilityTimer) {   // 同時持續取消衝刺結束計時器 (新增)
                    scene.invincibilityTimer.remove();
                    scene.invincibilityTimer = null;
                }
            }
        });

        // 停止保護並解除無敵的共用函式 (新增)
        const stopProtection = () => {
            if (lastStepProtectTimer) lastStepProtectTimer.remove();
            playerState.isInvincible = false;
        };

        poopKing.setTint(0xffa500); // 橘色警告
        playerState.isDashIndicatorLit = true; // 亮起警示紅燈
        scene.time.delayedCall(800, () => { // 800ms 蓄力警告
            if (!poopKing.active || !player.active) {
                playerState.isDashIndicatorLit = false;
                stopProtection();
                return;
            }
            poopKing.clearTint();

            // 投擲長矛飛射物 Graphics
            const spearProjGfx = scene.add.graphics();
            spearProjGfx.setDepth(9999);

            const startX = poopKing.x;
            const startY = poopKing.y;
            const angle = Phaser.Math.Angle.Between(poopKing.x, poopKing.y, player.x, player.y);

            const projObj = { distance: 0 };
            const spearTween = scene.tweens.add({
                targets: projObj,
                distance: 800,
                duration: 350,
                onUpdate: () => {
                    if (!spearProjGfx.active) return;
                    spearProjGfx.clear();

                    const currentX = startX + Math.cos(angle) * projObj.distance;
                    const currentY = startY + Math.sin(angle) * projObj.distance;

                    // 繪製飛行的長矛
                    spearProjGfx.lineStyle(4, 0xffffff, 1.0);
                    const backX = currentX - Math.cos(angle) * 80;
                    const backY = currentY - Math.sin(angle) * 80;
                    spearProjGfx.lineBetween(backX, backY, currentX, currentY);

                    // 矛頭三角形
                    const wing1X = backX + Math.cos(angle) * 30 + Math.cos(angle + Math.PI * 0.5) * 15;
                    const wing1Y = backY + Math.sin(angle) * 30 + Math.sin(angle + Math.PI * 0.5) * 15;
                    const wing2X = backX + Math.cos(angle) * 30 + Math.cos(angle - Math.PI * 0.5) * 15;
                    const wing2Y = backY + Math.sin(angle) * 30 + Math.sin(angle - Math.PI * 0.5) * 15;
                    spearProjGfx.fillStyle(0x00ff00, 1.0);
                    spearProjGfx.beginPath();
                    spearProjGfx.moveTo(currentX, currentY);
                    spearProjGfx.lineTo(wing1X, wing1Y);
                    spearProjGfx.lineTo(wing2X, wing2Y);
                    spearProjGfx.closePath();
                    spearProjGfx.fillPath();

                    // 飛射物碰撞判定
                    const distToPlayer = Phaser.Math.Distance.Between(currentX, currentY, player.x, player.y);
                    if (distToPlayer < 40) {
                        spearTween.stop(); // 停止飛矛 Tween，防範雙重呼叫 next()
                        spearProjGfx.destroy();
                        playerState.isDashIndicatorLit = false;

                        // 擊退至邊界，到達後才解除無敵並結束 Combo (修改)
                        const pushTargetX = poopKing.x < player.x ? (scene.cameras.main.width - 60) : 60;
                        scene.tweens.add({
                            targets: player,
                            x: pushTargetX,
                            duration: 400,
                            ease: 'Cubic.easeOut',
                            onComplete: () => {
                                stopProtection(); // 玩家到達邊緣，此時才停止保護 (修改)
                                next(); // 結束 Combo，進入冷卻
                            }
                        });
                    }
                },
                onComplete: () => {
                    // 飛矛沒打中玩家，直接結束 Combo
                    spearProjGfx.destroy();
                    playerState.isDashIndicatorLit = false;
                    stopProtection();
                    next();
                }
            });
        });
    });

    // --- 連段執行遞迴器 ---
    let currentStep = 0;
    const executeNextStep = () => {
        if (currentStep < comboSteps.length) {
            comboSteps[currentStep](() => {
                currentStep++;
                executeNextStep();
            });
        } else {
            // 9 連擊 Combo 結束（含被最後長矛擊退完畢）：正式進入 5 秒冷卻 (修改)
            console.log("[請屎皇 Combo] 🎉 Combo 完全結束，解除無敵，進入 5 秒冷卻！");
            playerState.cannotMove = false;
            playerState.isInvincible = false; // 確保無敵狀態已在此時解除（以防萬一）(新增)
            player.setAlpha(1); // 確保玩家恢復完整透明度 (新增)
            playerState.isDashIndicatorLit = false; // 確保熄滅指示燈
            poopKing.body.allowGravity = true;
            poopKing.body.setImmovable(false); // 還原為可推擠狀態
            if (state) state.isAttacking = false;
            scheduleNextAttack(scene, 5000); // 5 秒冷卻時間，此時才開始 (修改)
        }
    };

    // 開始執行 Combo
    executeNextStep();
}

/**
 * 攻擊招式一：綠色斬擊 (一般模式使用)
 */
function triggerGreenSlash(scene) {
    const poopKing = refs.poopKing;
    const player = refs.player;
    const state = refs.poopKingState;

    if (!poopKing || !player || !poopKing.active || !player.active) return;

    if (state) state.isAttacking = true;

    // 1. 預備動作：閃爍綠光警示玩家，並使玩家定身
    poopKing.setTint(0x00ff00);
    playerState.cannotMove = true; // 給予玩家定身效果 (新增中文註解：定身玩家，逼迫其進行盾牌防禦判定)
    poopKing.body.allowGravity = false; // 暫時關閉請屎皇重力以配合玩家高度

    scene.time.delayedCall(500, () => {
        if (!poopKing.active || !player.active) {
            playerState.cannotMove = false;
            poopKing.body.allowGravity = true;
            if (state) state.isAttacking = false;
            return;
        }
        poopKing.clearTint();

        // 2. 確切衝刺到玩家身旁 (距離 120px) (新增中文註解：斬擊也確切以 Tween 衝刺至玩家身旁，並考量騎士模式高度差補償)
        const targetX = player.x + (poopKing.x < player.x ? -120 : 120);
        // 騎士模式下剛體較高，Y 軸須往上提 55px 以對齊玩家底部防穿地 (修改)
        const targetY = player.y + (state && state.isKnightMode ? -55 : 0);

        scene.tweens.add({
            targets: poopKing,
            x: targetX,
            y: targetY,
            duration: 160, // 快速突進
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!poopKing.active || !player.active) {
                    playerState.cannotMove = false;
                    poopKing.body.allowGravity = true;
                    if (state) state.isAttacking = false;
                    return;
                }
                poopKing.setVelocity(0, 0);

                // 3. 進行從上至下的斬擊
                const angle = Phaser.Math.Angle.Between(poopKing.x, poopKing.y, player.x, player.y);
                const slashGfx = scene.add.graphics();
                slashGfx.setDepth(9999);

                let progress = 0;
                const slashPoints = []; // 儲存斬擊軌跡點 (新增中文註解：儲存綠色斬擊軌跡以繪製平滑拖尾)
                const radius = 170; // 擴大斬擊範圍

                // 設定斬擊掃掠範圍：從上到下 (角度 -1.3 到 +1.3)
                const startSweepAngle = angle - 1.3;
                const endSweepAngle = angle + 1.3;

                const drawSlashSweep = () => {
                    if (!slashGfx.active) return;
                    slashGfx.clear();

                    // 計算當前斬擊尖端位置
                    const currentAngle = startSweepAngle + (endSweepAngle - startSweepAngle) * progress;
                    const tipX = poopKing.x + Math.cos(currentAngle) * radius;
                    const tipY = poopKing.y + Math.sin(currentAngle) * radius;

                    // 紀錄軌跡點 (新增中文註解：加入目前斬擊軌跡點)
                    slashPoints.push({ x: tipX, y: tipY });
                    if (slashPoints.length > 10) {
                        slashPoints.shift(); // 限制最多存在 10 個軌跡點以形成殘影拖尾
                    }

                    // 繪製殘影拖尾：厚度遞增且漸顯至白熱核心
                    for (let i = 1; i < slashPoints.length; i++) {
                        const ratio = i / slashPoints.length;
                        const alpha = ratio * 0.7;
                        const thickness = 16 * ratio;

                        // 外圍綠色光暈
                        slashGfx.lineStyle(thickness, 0x00ff00, alpha);
                        slashGfx.lineBetween(slashPoints[i-1].x, slashPoints[i-1].y, slashPoints[i].x, slashPoints[i].y);

                        // 內圈白色熱核 (新增中文註解：繪製白熱核心使斬擊更有力量感)
                        slashGfx.lineStyle(thickness * 0.35, 0xffffff, alpha);
                        slashGfx.lineBetween(slashPoints[i-1].x, slashPoints[i-1].y, slashPoints[i].x, slashPoints[i].y);
                    }
                };

                const slashTimer = scene.time.addEvent({
                    delay: 16,
                    callback: () => {
                        progress += 0.08;
                        drawSlashSweep();
                        if (progress >= 1.0) {
                            // 讓殘影漸漸消失
                            scene.tweens.add({
                                targets: slashGfx,
                                alpha: 0,
                                duration: 150,
                                onComplete: () => {
                                    slashGfx.destroy();
                                    slashTimer.destroy();
                                }
                            });
                        }
                    },
                    loop: true
                });

                // 4. 碰撞判定：斬擊半徑為 170px
                const dist = Phaser.Math.Distance.Between(poopKing.x, poopKing.y, player.x, player.y);
                if (dist <= 170) {
                    if (playerState.isInvincible && scene.currentDashShield) {
                        console.log("[請屎皇 攻擊] 🛡️ 玩家使用盾牌防禦！但綠色斬擊立刻讓盾牌破裂！");
                        scene.currentDashShield.destroy();
                        playerState.isInvincible = false;
                        player.setAlpha(1);
                        scene.cameras.main.flash(150, 255, 255, 255);
                    } else {
                        console.log("[請屎皇 攻擊] 💥 玩家被綠色斬擊命中！觸發當機！");
                        scene.triggerCrash();
                    }
                }

                // 結束攻擊狀態，還原定身與重力，並排程下一次 0.5s 冷卻的攻擊 (新增中文註解)
                scene.time.delayedCall(400, () => {
                    playerState.cannotMove = false;
                    poopKing.body.allowGravity = true;
                    if (state) state.isAttacking = false;
                    scheduleNextAttack(scene); // 斬擊結束後進行下一次冷卻與攻擊排程
                });
            }
        });
    });
}

/**
 * 攻擊招式二：三槍連刺 (一般模式使用)
 */
function triggerThreeSpears(scene) {
    const poopKing = refs.poopKing;
    const player = refs.player;
    const state = refs.poopKingState;

    if (!poopKing || !player || !poopKing.active || !player.active) return;

    if (state) state.isAttacking = true;

    // 1. 預備動作：閃爍黃綠光警示玩家，並使玩家定身，暫時關閉請屎皇重力
    poopKing.setTint(0x00ff00);
    playerState.cannotMove = true; // 給予玩家定身效果 (新增中文註解：定身玩家，逼迫其進行盾牌防禦判定)
    poopKing.body.allowGravity = false;

    scene.time.delayedCall(500, () => {
        if (!poopKing.active || !player.active) {
            playerState.cannotMove = false;
            poopKing.body.allowGravity = true;
            if (state) state.isAttacking = false;
            return;
        }
        poopKing.clearTint();

        // 2. 確切衝刺到玩家身旁 (距離 120px) (新增中文註解：使用平滑 Tween 精確衝刺至玩家身旁，並考量騎士模式高度差補償)
        const targetX = player.x + (poopKing.x < player.x ? -120 : 120);
        // 騎士模式下剛體較高，Y 軸須往上提 55px 以對齊玩家底部防穿地 (修改)
        const targetY = player.y + (state && state.isKnightMode ? -55 : 0);

        scene.tweens.add({
            targets: poopKing,
            x: targetX,
            y: targetY,
            duration: 160, // 極速衝刺
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (!poopKing.active || !player.active) {
                    playerState.cannotMove = false;
                    poopKing.body.allowGravity = true;
                    if (state) state.isAttacking = false;
                    return;
                }
                poopKing.setVelocity(0, 0);

                // 3. 開始以「超快速度」戳三槍
                let spearCount = 0;

                const performThrust = () => {
                    if (!poopKing.active || !player.active) {
                        playerState.cannotMove = false;
                        poopKing.body.allowGravity = true;
                        if (state) state.isAttacking = false;
                        return;
                    }

                    // 每次突刺微小地朝玩家位置前推 60px
                    const angle = Phaser.Math.Angle.Between(poopKing.x, poopKing.y, player.x, player.y);
                    const lungeX = poopKing.x + Math.cos(angle) * 60;
                    const lungeY = poopKing.y + Math.sin(angle) * 60;
                    scene.tweens.add({
                        targets: poopKing,
                        x: lungeX,
                        y: lungeY,
                        duration: 80,
                        yoyo: true,
                        ease: 'Sine.easeOut'
                    });

                    // 建立長槍 Graphics
                    const spearGfx = scene.add.graphics();
                    spearGfx.setDepth(9999);

                    let length = 0;
                    let thrusting = true;
                    const spearHistory = []; // 儲存長槍殘影歷史記錄 (新增中文註解)

                    const updateSpear = () => {
                        if (!spearGfx.active) return;
                        spearGfx.clear();

                        // 紀錄長槍長度以繪製殘影
                        spearHistory.push(length);
                        if (spearHistory.length > 5) {
                            spearHistory.shift();
                        }

                        // A. 繪製長槍殘影 (新增中文註解：繪製突刺殘影效果)
                        spearHistory.forEach((prevLength, index) => {
                            const ratio = index / spearHistory.length;
                            const alpha = ratio * 0.35;
                            const thickness = 3 * ratio;

                            spearGfx.lineStyle(thickness, 0x00ff00, alpha);
                            const rx2 = poopKing.x + Math.cos(angle) * prevLength;
                            const ry2 = poopKing.y + Math.sin(angle) * prevLength;
                            spearGfx.lineBetween(poopKing.x, poopKing.y, rx2, ry2);

                            // 殘影槍刃 (空心綠色三角形，修復變數拼寫錯誤並將之極其清晰呈現)
                            if (prevLength > 0) {
                                const rTipX = rx2 + Math.cos(angle) * 20;
                                const rTipY = ry2 + Math.sin(angle) * 20;
                                const rWing1X = rx2 + Math.cos(angle + Math.PI * 0.5) * 12;
                                const rWing1Y = ry2 + Math.sin(angle + Math.PI * 0.5) * 12;
                                const rWing2X = rx2 + Math.cos(angle - Math.PI * 0.5) * 12;
                                const rWing2Y = ry2 + Math.sin(angle - Math.PI * 0.5) * 12;
                                spearGfx.beginPath();
                                spearGfx.moveTo(rTipX, rTipY);
                                spearGfx.lineTo(rWing1X, rWing1Y);
                                spearGfx.lineTo(rWing2X, rWing2Y);
                                spearGfx.closePath();
                                spearGfx.strokePath();
                            }
                        });

                        // B. 繪製當前主長槍 (槍身)
                        spearGfx.lineStyle(7, 0x7f8c8d, 1.0); // 鐵灰色外框
                        const tipX = poopKing.x + Math.cos(angle) * length;
                        const tipY = poopKing.y + Math.sin(angle) * length;
                        const tipLength = Math.min(length, 60); // 槍尖長度限制
                        const xBase = poopKing.x + Math.cos(angle) * (length - tipLength);
                        const yBase = poopKing.y + Math.sin(angle) * (length - tipLength);
                        spearGfx.lineBetween(poopKing.x, poopKing.y, xBase, yBase);

                        spearGfx.lineStyle(3, 0x00ff00, 1.0); // 綠色發光核心
                        spearGfx.lineBetween(poopKing.x, poopKing.y, xBase, yBase);

                        // C. 繪製精緻的巨大鑽石型矛頭 (寬度與對比度調高，確保肉眼可清晰看見)
                        if (length > 0) {
                            // 槍尖左右雙翼 (角度正交 Math.PI * 0.5)
                            const wing1X = xBase + Math.cos(angle + Math.PI * 0.5) * 20;
                            const wing1Y = yBase + Math.sin(angle + Math.PI * 0.5) * 20;
                            const wing2X = xBase + Math.cos(angle - Math.PI * 0.5) * 20;
                            const wing2Y = yBase + Math.sin(angle - Math.PI * 0.5) * 20;

                            // 槍頭外輪廓 (填充亮綠色，白色描邊，新增中文註解：大尺寸高對比槍刃)
                            spearGfx.fillStyle(0x00ff00, 1.0);
                            spearGfx.lineStyle(3, 0xffffff, 1.0);
                            spearGfx.beginPath();
                            spearGfx.moveTo(tipX, tipY);
                            spearGfx.lineTo(wing1X, wing1Y);
                            spearGfx.lineTo(xBase, yBase);
                            spearGfx.lineTo(wing2X, wing2Y);
                            spearGfx.closePath();
                            spearGfx.fillPath();
                            spearGfx.strokePath();

                            // 內核白色發光寶石 (新增中文註解：寶石發光內核)
                            const coreTipX = poopKing.x + Math.cos(angle) * (length - tipLength / 4);
                            const coreTipY = poopKing.y + Math.sin(angle) * (length - tipLength / 4);
                            const coreBaseX = poopKing.x + Math.cos(angle) * (length - tipLength * 3/4);
                            const coreBaseY = poopKing.y + Math.sin(angle) * (length - tipLength * 3/4);
                            const cWing1X = coreBaseX + Math.cos(angle + Math.PI * 0.5) * 8;
                            const cWing1Y = coreBaseY + Math.sin(angle + Math.PI * 0.5) * 8;
                            const cWing2X = coreBaseX + Math.cos(angle - Math.PI * 0.5) * 8;
                            const cWing2Y = coreBaseY + Math.sin(angle - Math.PI * 0.5) * 8;

                            spearGfx.fillStyle(0xffffff, 1.0);
                            spearGfx.beginPath();
                            spearGfx.moveTo(coreTipX, coreTipY);
                            spearGfx.lineTo(cWing1X, cWing1Y);
                            spearGfx.lineTo(coreBaseX, coreBaseY);
                            spearGfx.lineTo(cWing2X, cWing2Y);
                            spearGfx.closePath();
                            spearGfx.fillPath();
                        }

                        // 4. 碰撞判定：長槍尖端線段與玩家判定
                        const spearLine = new Phaser.Geom.Line(poopKing.x, poopKing.y, tipX, tipY);
                        const playerRect = player.getBounds();
                        if (Phaser.Geom.Intersects.LineToRectangle(spearLine, playerRect)) {
                            if (!playerState.isInvincible) {
                                console.log("[請屎皇 攻擊] 💥 玩家被長槍刺中！觸發當機！");
                                scene.triggerCrash();
                            }
                        }
                    };

                    // 超高速度突刺動畫
                    const thrustTimer = scene.time.addEvent({
                        delay: 16,
                        callback: () => {
                            if (thrusting) {
                                length += 75; // 超快刺出
                                if (length >= 260) {
                                    length = 260;
                                    thrusting = false;
                                }
                            } else {
                                length -= 80; // 超快收回
                                if (length <= 0) {
                                    length = 0;
                                    spearGfx.destroy();
                                    thrustTimer.destroy();
                                }
                            }
                            updateSpear();
                        },
                        loop: true
                    });

                    spearCount++;

                    // 縮短突刺間隔時間
                    if (spearCount < 3) {
                        scene.time.delayedCall(180, performThrust);
                    } else {
                        // 三槍完畢，重新恢復重力、玩家定身解除，並排程下一次 0.5s 冷卻的攻擊 (新增中文註解)
                        scene.time.delayedCall(300, () => {
                            playerState.cannotMove = false;
                            poopKing.body.allowGravity = true;
                            if (state) state.isAttacking = false;
                            scheduleNextAttack(scene); // 刺擊結束後進行下一次冷卻與攻擊排程
                        });
                    }
                };

                performThrust();
            }
        });
    });
}
