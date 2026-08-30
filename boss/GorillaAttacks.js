// === 大猩猩（無敵大猩猩）攻擊模組 ===
// 負責大猩猩的瘋狂跳躍攻擊、落地震波與攻擊排程 (新增中文註解)

let refs = {};
let jumpTimer = null;
let currentJumpTween = null;
let currentPathTween = null;
let isJumping = false;

/**
 * 初始化大猩猩攻擊模組參考 (新增中文註解)
 */
export function initGorillaAttackRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 啟動大猩猩瘋狂跳躍攻擊循環 (新增中文註解：開局延遲0.8秒後進入瘋狂跳躍)
 */
export function startGorillaAttacks(scene) {
    stopGorillaAttacks();
    if (!refs.gorilla || !refs.gorilla.active) return;

    // 開局 250ms 後立刻發動瘋狂跳躍 (新增中文註解)
    jumpTimer = scene.time.delayedCall(250, () => {
        if (refs.gorilla && refs.gorilla.active) {
            spawnGorillaFrenzyJump(scene);
        }
    });
}

/**
 * 執行大猩猩瘋狂跳躍攻擊 (新增中文註解：超高頻率連續跳躍、高空拋物線翻滾躍擊、落地強力震波)
 */
export function spawnGorillaFrenzyJump(scene) {
    if (!refs.gorilla || !refs.gorilla.active) return;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const player = refs.player;
    const groundTop = height - 70;
    const halfHeight = refs.gorilla.displayHeight / 2;
    const targetY = groundTop - halfHeight;

    // 1. 計算目標落點 (高度隨機化：涵蓋全螢幕大跨度跳躍、玩家大範圍偏差與對側飛撲) (新增中文註解)
    let targetX;
    const randType = Phaser.Math.Between(1, 10);
    if (randType <= 4 && player) {
        // 40% 機率撲向玩家周圍 (帶有 ±280px 大範圍偏差) (新增中文註解)
        targetX = player.x + Phaser.Math.Between(-280, 280);
    } else if (randType <= 7) {
        // 30% 機率飛撲至地圖另一側 (大跨度對角大跳) (新增中文註解)
        targetX = (refs.gorilla.x < width / 2) 
            ? Phaser.Math.Between(width * 0.55, width - 100) 
            : Phaser.Math.Between(100, width * 0.45);
    } else {
        // 30% 機率完全全圖隨機跳躍 (新增中文註解)
        targetX = Phaser.Math.Between(100, width - 100);
    }
    
    // 確保落點在安全邊界內，且與起跳點保持至少 150px 跨度 (新增中文註解)
    targetX = Phaser.Math.Clamp(targetX, 100, width - 100);
    if (Math.abs(targetX - refs.gorilla.x) < 150) {
        targetX = (targetX > width / 2) ? targetX - 250 : targetX + 250;
        targetX = Phaser.Math.Clamp(targetX, 100, width - 100);
    }

    const startX = refs.gorilla.x;
    const startY = refs.gorilla.y;

    // 2. 繪製極速起跳預警 (紅色落點標記與路徑線，120ms 極速反應) (新增中文註解)
    const warnGfx = scene.add.graphics();
    warnGfx.lineStyle(2, 0xff3300, 0.7);
    const controlX = (startX + targetX) / 2;
    // 大幅增加跳躍高度：控制頂點提高 550~750 像素，直衝螢幕頂部高空 (新增中文註解)
    const controlY = Math.min(startY, targetY) - Phaser.Math.Between(550, 750);
    const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(startX, startY),
        new Phaser.Math.Vector2(controlX, controlY),
        new Phaser.Math.Vector2(targetX, targetY)
    );

    // 繪製虛線路徑
    const points = curve.getPoints(16);
    warnGfx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
        if (i % 2 === 0) {
            warnGfx.moveTo(points[i].x, points[i].y);
            warnGfx.lineTo(points[i + 1].x, points[i + 1].y);
        }
    }
    warnGfx.strokePath();

    // 地面紅色驚嘆號與警告光圈 (新增中文註解)
    const exclamation = scene.add.text(targetX, targetY - 40, '!', {
        fontSize: '48px',
        color: '#ff2200',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5);

    // 起跳準備極速下蹲蓄力 (100ms) (新增中文註解)
    scene.tweens.add({
        targets: refs.gorilla,
        scaleY: refs.gorilla.scaleY * 0.85,
        duration: 100,
        yoyo: true
    });

    // 3. 120ms 極速預警後立刻騰空起跳 (超高頻率瘋狂連跳) (新增中文註解)
    jumpTimer = scene.time.delayedCall(120, () => {
        warnGfx.destroy();
        exclamation.destroy();
        if (!refs.gorilla || !refs.gorilla.active) return;

        isJumping = true;
        if (refs.gorilla.body) {
            refs.gorilla.body.allowGravity = false;
        }

        // 騰空翻滾旋轉 (新增中文註解)
        const rotDirection = targetX >= startX ? 360 : -360;
        currentJumpTween = scene.tweens.add({
            targets: refs.gorilla,
            angle: refs.gorilla.angle + rotDirection,
            duration: 480,
            ease: 'Cubic.easeInOut'
        });

        // 沿高拋物線高速躍向目標 (480ms 快速翻滾躍擊) (新增中文註解)
        const pathDummy = { t: 0 };
        currentPathTween = scene.tweens.add({
            targets: pathDummy,
            t: 1,
            duration: 480,
            ease: 'Cubic.easeInOut',
            onUpdate: () => {
                if (refs.gorilla && refs.gorilla.active) {
                    const p = curve.getPoint(pathDummy.t);
                    refs.gorilla.setPosition(p.x, p.y);
                }
            },
            onComplete: () => {
                isJumping = false;
                if (!refs.gorilla || !refs.gorilla.active) return;

                // 4. 落地鎖定回地面
                refs.gorilla.setPosition(targetX, targetY);
                refs.gorilla.setAngle(0);
                if (refs.gorilla.body) {
                    refs.gorilla.body.setVelocity(0, 0);
                }

                // 落地鏡頭強烈震動 (新增中文註解)
                scene.cameras.main.shake(220, 0.009);

                // 落地金色與土褐色衝擊波擴散特效 (新增中文註解)
                createLandingShockwaves(scene, targetX, groundTop);

                // 5. 落地後極速連跳 (僅 80ms~150ms 喘息)，實現狂暴高頻狂跳 (新增中文註解)
                const nextDelay = Phaser.Math.Between(80, 150);
                jumpTimer = scene.time.delayedCall(nextDelay, () => {
                    if (refs.gorilla && refs.gorilla.active) {
                        spawnGorillaFrenzyJump(scene);
                    }
                });
            }
        });
    });
}

/**
 * 產生類似蘿莉落地的雙向地表震波 (新增中文註解：生成向左與向右擴散的物理傷害震波)
 */
function createLandingShockwaves(scene, x, groundTop) {
    if (!refs.shockwaves) return;

    // 落地超大砸地金色光環 (新增中文註解：加大光環半徑至 70px，向外擴散 6 倍)
    const slamCircle = scene.add.circle(x, groundTop, 70, 0xd4af37, 0.85);
    scene.tweens.add({
        targets: slamCircle,
        scaleX: 6.0,
        scaleY: 1.8,
        alpha: 0,
        duration: 400,
        onComplete: () => slamCircle.destroy()
    });

    // 雙向發射超巨型土褐色震波 (向左與向右擴散，高度加倍、寬度加倍) (新增中文註解)
    const directions = [-1, 1];
    const angleRad = Phaser.Math.DegToRad(18);
    const speed = 800;

    directions.forEach(dir => {
        // 建立超巨型衝擊波本體 (260x120 超大尺寸) (新增中文註解：超大震波實體)
        const shockwave = scene.add.rectangle(x, groundTop - 45, 260, 120, 0x8B4513, 0.9);
        scene.physics.add.existing(shockwave);
        refs.shockwaves.add(shockwave);

        if (shockwave.body) {
            shockwave.body.allowGravity = false;
            shockwave.body.setSize(260, 120, true);
            shockwave.body.setVelocity(dir * speed * Math.cos(angleRad), -speed * Math.sin(angleRad));
        }
        shockwave.setRotation(dir === 1 ? -angleRad : angleRad);

        // 衝擊波巨大化擴散淡出 (縮放至 2.2 倍，高度可覆蓋半螢幕) (新增中文註解)
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
 * 停止大猩猩所有跳躍與計時器 (新增中文註解)
 */
export function stopGorillaAttacks() {
    if (jumpTimer) {
        jumpTimer.remove(false);
        jumpTimer = null;
    }
    if (currentJumpTween) {
        currentJumpTween.stop();
        currentJumpTween = null;
    }
    if (currentPathTween) {
        currentPathTween.stop();
        currentPathTween = null;
    }
    isJumping = false;
}

/**
 * 取得大猩猩目前是否正在空中跳躍 (新增中文註解)
 */
export function isGorillaJumping() {
    return isJumping;
}
