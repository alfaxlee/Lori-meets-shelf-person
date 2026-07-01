// === 哆啦噩夢狀態機與 AI 邏輯模組 ===
// 負責哆啦噩夢的血量、領域展開技能（減慢玩家與子彈速度）與受傷/逃跑 AI 邏輯
import { playerState } from '../player/PlayerController.js';

export const doraState = {
    hp: 400,              // 哆啦噩夢血量 (降為 400 以降低難度)
    maxHp: 400,
    isDomainExpanded: false, // 是否已經領域展開
    domainCircle: null,   // 領域展開圓形特效
    domainOverlay: null,  // 全螢幕藍色渲染覆蓋層
    sniperTimer: null     // 狙擊定時器
};

let refs = {};

/**
 * 初始化狀態機所需的遊戲物件參考
 */
export function initDoraStateRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 領域展開：生成0.5秒後執行，以圓圈散發藍色渲染，使螢幕變藍，並將玩家和子彈速度減半
 */
export function startDomainExpansion(scene) {
    if (doraState.isDomainExpanded) return;
    doraState.isDomainExpanded = true;

    // 從哆啦噩夢當前位置開始擴散
    const startX = refs.dora.x;
    const startY = refs.dora.y;

    // 建立藍色渲染圓圈特效，初始半徑為0，覆蓋於上層
    const circle = scene.add.circle(startX, startY, 0, 0x00aaff, 0.25);
    circle.setDepth(9999);
    doraState.domainCircle = circle;

    // 建立全螢幕藍色覆蓋矩形，初始完全透明
    const overlay = scene.add.rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height, 0x0055ff, 0);
    overlay.setOrigin(0, 0);
    overlay.setScrollFactor(0); // 鎖定在螢幕上，不隨相機滾動
    overlay.setDepth(9998);
    doraState.domainOverlay = overlay;

    // 動態放大圓圈
    scene.tweens.add({
        targets: circle,
        radius: Math.max(scene.cameras.main.width, scene.cameras.main.height) * 1.5,
        duration: 1500,
        ease: 'Quad.easeOut'
    });

    // 動態將全螢幕渲染成藍色
    scene.tweens.add({
        targets: overlay,
        alpha: 0.2, // 整個螢幕的所有東西都會變得比較藍
        duration: 1500,
        ease: 'Quad.easeOut',
        onComplete: () => {
            // 領域展開完成，啟用速度減半標誌
            scene.isDoraDomainActive = true;

            // 減半畫面上已存在的子彈速度與重力（掉落變慢，以維持原有軌跡）
            if (scene.mgBullets) {
                scene.mgBullets.getChildren().forEach(b => {
                    if (b.body) { 
                        b.body.velocity.x *= 0.5; 
                        b.body.velocity.y *= 0.5; 
                        b.body.gravity.y = -750;
                    }
                });
            }
            if (scene.sgBullets) {
                scene.sgBullets.getChildren().forEach(b => {
                    if (b.body) { b.body.velocity.x *= 0.5; b.body.velocity.y *= 0.5; }
                });
            }
            if (scene.snBullets) {
                scene.snBullets.getChildren().forEach(b => {
                    if (b.body) { b.body.velocity.x *= 0.5; b.body.velocity.y *= 0.5; }
                });
            }
        }
    });
}

/**
 * 處理哆啦噩夢受到的傷害
 */
export function handleDoraHit(scene, bullet, force, stunTime, damage, originX, originY) {
    if (!refs.dora || !refs.dora.active) {
        if (bullet) bullet.destroy();
        return;
    }

    const srcX = bullet ? bullet.x : (originX ?? refs.dora.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.dora.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.dora.x, refs.dora.y);

    doraState.hp -= damage;
    if (refs.doraHPText) {
        refs.doraHPText.setText(`哆啦噩夢血量: ${doraState.hp}`);
    }

    if (doraState.hp <= 0) {
        handleDoraDeath(scene);
    } else {
        // 受擊微小後退並閃紅
        refs.dora.setVelocity(Math.cos(angle) * force * 0.5, Math.sin(angle) * force * 0.5 - 100);
        refs.dora.setTint(0xff0000);
        scene.time.delayedCall(150, () => {
            if (refs.dora && refs.dora.active) refs.dora.clearTint();
        });
        scene.cameras.main.shake(100, 0.005);
    }

    if (bullet) bullet.destroy();
}

/**
 * 處理哆啦噩夢死亡
 */
export function handleDoraDeath(scene) {
    refs.dora.setActive(false).setVisible(false).body.enable = false;
    scene.cameras.main.flash(500, 255, 0, 0);

    // 銷毀狙擊定時器
    if (doraState.sniperTimer) {
        doraState.sniperTimer.destroy();
        doraState.sniperTimer = null;
    }

    // 清理領域展開效果
    cleanupDora(scene);

    // 清除畫面上所有的警告線與驚嘆號
    scene.children.list.slice().forEach(child => {
        if (child.name === 'warningLine' || child.name === 'warning') {
            child.destroy();
        }
        if (child.type === 'Text' && child.text === '!') {
            child.destroy();
        }
    });

    scene.time.delayedCall(3000, () => {
        if (refs.onDoraDeath) {
            refs.onDoraDeath(scene);
        } else {
            respawnDora(scene);
        }
    });
}

/**
 * 重生哆啦噩夢
 */
export function respawnDora(scene) {
    doraState.hp = doraState.maxHp;
    if (refs.doraHPText) {
        refs.doraHPText.setText(`哆啦噩夢血量: ${doraState.hp}`);
    }
    refs.dora.setActive(true).setVisible(true).body.enable = true;
    refs.dora.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 110);
    refs.dora.clearTint();

    // 重生 0.5 秒後自動執行一次領域展開
    scene.time.delayedCall(500, () => {
        if (refs.dora && refs.dora.active) {
            startDomainExpansion(scene);
        }
    });

    // 啟動招式選擇計時器，每 2 秒隨機選擇一個招式 (70% 隨選狙擊，15% 火箭筒，15% 無攻擊移動)
    if (doraState.sniperTimer) {
        doraState.sniperTimer.destroy();
    }
    doraState.sniperTimer = scene.time.addEvent({
        delay: 2000,
        callback: () => {
            if (refs.dora && refs.dora.active) {
                const r = Math.random();
                console.log(`[哆啦噩夢 AI] 招式隨機判定，隨機數 r = ${r.toFixed(3)}`);
                if (r < 0.70) {
                    console.log("[哆啦噩夢 AI] ➡️ 決定發動狙擊攻擊 (70% 機率)");
                    triggerSniperAttack(scene);
                } else if (r < 0.85) {
                    console.log("[哆啦噩夢 AI] ➡️ 決定發動火箭筒攻擊 (15% 機率)");
                    triggerRocketAttack(scene);
                } else {
                    console.log("[哆啦噩夢 AI] ➡️ 決定保持閒置/純移動 (15% 機率)");
                }
            }
        },
        loop: true
    });
}

/**
 * 清理領域展開狀態與視覺覆蓋層
 */
export function cleanupDora(scene) {
    doraState.isDomainExpanded = false;
    scene.isDoraDomainActive = false;

    // 銷毀狙擊定時器
    if (doraState.sniperTimer) {
        doraState.sniperTimer.destroy();
        doraState.sniperTimer = null;
    }

    if (doraState.domainCircle) {
        doraState.domainCircle.destroy();
        doraState.domainCircle = null;
    }
    if (doraState.domainOverlay) {
        doraState.domainOverlay.destroy();
        doraState.domainOverlay = null;
    }
}

/**
 * 每幀更新哆啦噩夢的 AI 移動決策
 */
export function updateDoraStateMachine(scene, time, delta) {
    if (!refs.dora || !refs.dora.active) return;

    const player = refs.player;
    const dora = refs.dora;

    // 移動邏輯：盡量避開玩家 (當玩家在左邊則往右走，反之亦然)
    const moveSpeed = 160; 
    if (player.x < dora.x) {
        dora.setVelocityX(moveSpeed);
        dora.setFlipX(false); // 面向逃跑方向 (右邊)
    } else {
        dora.setVelocityX(-moveSpeed);
        dora.setFlipX(true);  // 面向逃跑方向 (左邊)
    }

    // 跳躍邏輯：使用剛體底部 (body.bottom) 代替中心 y 座標進行比較，以消除兩者體積大小不同造成的誤差。
    // 當哆啦噩夢的底部高於或等於玩家的底部（即 body.bottom <= player.body.bottom，值越小代表在畫面上越高），且踩在地上時瘋狂跳躍。
    if (dora.body && player.body && dora.body.bottom <= player.body.bottom && dora.body.touching.down) {
        dora.setVelocityY(-825); // 蘿莉基本跳躍力是 -275，三倍為 -825
    }
}

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

/**
 * 狙擊攻擊：瞄準玩家 0.5 秒，生成紅色虛線警示，發射速度為玩家 2 倍的子彈，且盾牌無敵無效 (強制當機)
 */
export function triggerSniperAttack(scene) {
    if (!refs.dora || !refs.dora.active || !refs.player || !refs.player.active) return;

    const dora = refs.dora;
    const player = refs.player;

    // 建立紅色虛線警示線，深度設為最上層
    const warningLine = scene.add.graphics();
    warningLine.setDepth(9999);
    warningLine.name = 'warning'; // 當 Boss 死亡或清理時，可被自動搜尋並銷毀

    // 初始瞄準角度：隨機偏移 45 度 (約 0.8 弧度)，使其不直接鎖定玩家，產生掃描線轉向玩家的動態效果
    const initialTargetAngle = Phaser.Math.Angle.Between(dora.x, dora.y, player.x, player.y);
    const randomOffset = Phaser.Math.FloatBetween(-0.8, 0.8);
    let currentAngle = initialTargetAngle + randomOffset;

    const updateLine = (time, delta) => {
        if (!dora.active || !player.active || !warningLine.active) {
            scene.events.off('update', updateLine);
            warningLine.destroy();
            return;
        }

        // 計算即時的玩家角度
        const targetAngle = Phaser.Math.Angle.Between(dora.x, dora.y, player.x, player.y);

        // 以固定的角速度 (4 弧度每秒) 慢慢將瞄準線轉向玩家，使其瞄準速度變慢以降低難度
        const angularSpeed = 4; // 慢速轉向
        const step = angularSpeed * (delta / 1000);
        currentAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, step);

        // 繪製從 Boss 出發、沿著當前旋轉角度繪製的紅色虛線
        warningLine.clear();
        warningLine.lineStyle(2, 0xff0000, 0.85);
        
        const lineLength = 2000;
        const endX = dora.x + Math.cos(currentAngle) * lineLength;
        const endY = dora.y + Math.sin(currentAngle) * lineLength;
        drawDashedLine(warningLine, dora.x, dora.y, endX, endY);
    };

    scene.events.on('update', updateLine);

    // 瞄準 0.5 秒後，鎖定軌跡並發射高速狙擊子彈
    scene.time.delayedCall(500, () => {
        scene.events.off('update', updateLine);
        warningLine.destroy();

        if (!dora.active || !player.active) return;

        // 發射角度為 0.5 秒時間截止時，虛線實際轉到的角度 (非直接鎖定玩家當時的位置，玩家可藉由快速衝刺閃避)
        const fireAngle = currentAngle;

        // 速度是玩家狙擊子彈的兩倍。玩家狙擊速度在正常是 1500，領域內是 750
        // 故 Boss 狙擊速度正常是 3000，領域內變 1500
        const baseSpeed = 3000;
        const speed = scene.isDoraDomainActive ? baseSpeed * 0.5 : baseSpeed;

        // 建立子彈，外觀為與渲染覆蓋層一致的純藍色長方形 (大小與原本狙擊子彈一致為 60x4)
        const bullet = scene.add.rectangle(dora.x + Math.cos(fireAngle) * 40, dora.y + Math.sin(fireAngle) * 40, 60, 4, 0x0055ff);
        bullet.setDepth(9999);
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

        // 為防止子彈速度過快導致穿牆漏判 (Tunneling)，每幀使用連續線段 (Line Sweep) 做精準的碰撞交叉檢查
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

            // 使用前後兩點拉出線段，與玩家剛體矩形進行相交檢測
            const line = new Phaser.Geom.Line(prevX, prevY, bullet.x, bullet.y);
            const playerRect = player.getBounds();

            if (Phaser.Geom.Intersects.LineToRectangle(line, playerRect)) {
                playerState.isInvincible = false; // 強制解除玩家無敵/衝刺護盾狀態
                scene.triggerCrash(true); // 傳入 true 以強迫當機，使衝刺無敵/盾牌無效！
                bullet.destroy();
                scene.events.off('update', checkTunneling);
                return;
            }

            // 若飛出邊界則自動銷毀，避免資源洩漏
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

/**
 * 火箭筒攻擊：朝玩家方向發射，外觀為長方形本體加前端三角形，速度與玩家霰彈槍一致。
 * 只要玩家進入火箭筒半徑內即觸發大爆炸且必中玩家。
 */
export function triggerRocketAttack(scene) {
    if (!refs.dora || !refs.dora.active || !refs.player || !refs.player.active) return;

    const dora = refs.dora;
    const player = refs.player;

    // 鎖定玩家當下角度發射
    const fireAngle = Phaser.Math.Angle.Between(dora.x, dora.y, player.x, player.y);

    // 建立火箭筒 Container
    const rocket = scene.add.container(dora.x + Math.cos(fireAngle) * 40, dora.y + Math.sin(fireAngle) * 40);
    rocket.setDepth(9999);
    rocket.name = 'warning'; // 死亡時自動銷毀

    // 使用 Graphics 精準繪製無縫貼合且垂直置中的火箭外觀 (本體長方形 + 前端三角形彈頭)
    const rocketGfx = scene.add.graphics();
    // 畫長方形本體 (寬度 30，高度 16，水平置中偏左)
    rocketGfx.fillStyle(0x0055ff, 1);
    rocketGfx.fillRect(-21, -8, 30, 16);
    // 畫三角形彈頭 (基底寬度 16，長度 12，與長方形右側邊界完美無縫貼合，且上下對稱垂直置中)
    rocketGfx.fillStyle(0x00aaff, 1);
    rocketGfx.beginPath();
    rocketGfx.moveTo(9, -8);   // 三角形左上角 (剛好對齊長方形右上角 9, -8)
    rocketGfx.lineTo(9, 8);    // 三角形左下角 (剛好對齊長方形右下角 9, 8)
    rocketGfx.lineTo(21, 0);   // 三角形前端頂尖 (剛好在 0 水平線上，長度延伸至 21)
    rocketGfx.closePath();
    rocketGfx.fillPath();

    rocket.add(rocketGfx);

    // 啟動物理剛體，設定尺寸為整體外型大小 (42x16)，並設為不受重力影響
    scene.physics.add.existing(rocket);
    rocket.body.setSize(42, 16);
    rocket.body.allowGravity = false;
    rocket.setRotation(fireAngle);

    // 速度與玩家霰彈槍一致 (正常模式 700，領域模式 350)
    const baseSpeed = 700;
    const speed = scene.isDoraDomainActive ? baseSpeed * 0.5 : baseSpeed;
    rocket.body.setVelocity(Math.cos(fireAngle) * speed, Math.sin(fireAngle) * speed);

    // 與實體平台碰撞銷毀並爆炸
    if (refs.platforms) {
        scene.physics.add.collider(rocket, refs.platforms, () => {
            explodeRocket(scene, rocket);
        });
    }

    // 每影格進行玩家距離偵測 (半徑判定)
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
        const explosionRadius = 200; // 火箭筒感應半徑 (改為 200 像素)

        // 只要玩家進入感應半徑之內，立即觸發爆炸且必定炸到玩家
        if (dist <= explosionRadius) {
            explodeRocket(scene, rocket, true); // true 代表強迫命中
            scene.events.off('update', checkProximity);
            return;
        }

        // 若超出邊界則自我回收
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

/**
 * 執行火箭筒爆炸：生成藍色擴散波視覺效果，並執行玩家受擊判定 (強制或半徑內必中)
 */
function explodeRocket(scene, rocket, forceHitPlayer = false) {
    if (!rocket.active) return;

    const player = refs.player;
    const rx = rocket.x;
    const ry = rocket.y;

    // 銷毀火箭剛體
    rocket.destroy();

    // 建立爆炸波效果 (藍色能量圈擴大並淡出，半徑調整至 200 像素以貼合判定範圍)
    const blast = scene.add.circle(rx, ry, 0, 0x00aaff, 0.6);
    blast.setDepth(9999);
    scene.tweens.add({
        targets: blast,
        radius: 200,
        alpha: 0,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => { blast.destroy(); }
    });

    // 震動相機增加打擊感
    scene.cameras.main.shake(200, 0.01);

    // 火箭判定：若強迫命中或玩家依然在爆炸濺射半徑 (200 像素，使判定與感應半徑一致) 內，觸發當機
    if (forceHitPlayer) {
        playerState.isInvincible = false; // 強制解除玩家無敵/衝刺護盾狀態
        scene.triggerCrash(true); // 強制撞擊 (盾牌/無敵無效)
    } else if (player && player.active) {
        const dist = Phaser.Math.Distance.Between(rx, ry, player.x, player.y);
        if (dist <= 200) {
            playerState.isInvincible = false; // 強制解除玩家無敵/衝刺護盾狀態
            scene.triggerCrash(true);
        }
    }
}
