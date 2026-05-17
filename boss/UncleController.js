// === 猥瑣大叔控制模組 ===
// 負責猥瑣大叔的基本狀態、受傷處理、AI 移動與大槌地刺攻擊

// --- 共享參考 ---
let refs = {};
let attackTimerEvent = null;

// 猥瑣大叔的狀態
export const uncleState = {
    hp: 800,            // 猥瑣大叔血量
    maxHp: 800,
    isHit: false,       // 是否處於受擊硬直
    hitStunTimer: 0,    // 受擊硬直倒數計時
    moveTimer: 0,       // 隨機移動計時器
    isAttacking: false, // 是否正在進行大槌攻擊
    hammer: null,       // 大槌物件
    spikes: []          // 地刺物件陣列 (因為可能同時存在多個)
};

/**
 * 初始化猥瑣大叔所需的遊戲物件參考
 * @param {object} gameRefs - 包含 uncle, player, uncleHPText, onUncleDeath 的物件
 */
export function initUncleRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 清理大槌物件
 */
function cleanupHammer() {
    if (uncleState.hammer) {
        uncleState.hammer.destroy();
        uncleState.hammer = null;
    }
}

/**
 * 清理所有地刺物件
 */
function cleanupAllSpikes() {
    uncleState.spikes.forEach(spike => {
        if (spike) spike.destroy();
    });
    uncleState.spikes = [];
}

/**
 * 排程大槌攻擊（每 4~6 秒）
 */
export function scheduleUncleAttack(scene) {
    if (!refs.uncle || !refs.uncle.active) return;
    if (attackTimerEvent) attackTimerEvent.remove();
    // 攻擊頻率改為 2~4 秒
    attackTimerEvent = scene.time.delayedCall(Phaser.Math.Between(2000, 4000), () => spawnHammerAttack(scene));
}

/**
 * 發動大槌攻擊
 */
export function spawnHammerAttack(scene) {
    if (!refs.uncle || !refs.uncle.active) return;

    uncleState.isAttacking = true;
    refs.uncle.setVelocity(0, 0); // 攻擊時不能動

    // 建立黑色 T 字大槌（使用 Graphics 繪製）
    const h = scene.add.graphics({ x: refs.uncle.x, y: refs.uncle.y });
    h.fillStyle(0x000000, 1);
    // 繪製握把 (從原點往上)
    h.fillRect(-20, -400, 40, 400); 
    // 繪製槌頭 (在握把最上方橫放)
    h.fillRect(-100, -440, 200, 80);
    h.angle = 0;         // 初始直立
    uncleState.hammer = h;

    // 決定向左或向右打 (轉 45 度往下打，表示旋轉到 ±135 度)
    const hitLeft = Phaser.Math.Between(0, 1) === 0;
    const endAngle = hitLeft ? -135 : 135;

    // 短暫延遲後揮下 (縮短延遲與揮下時間，讓動作更俐落)
    scene.time.delayedCall(300, () => {
        if (!h.active || !uncleState.isAttacking) return;
        scene.tweens.add({
            targets: h,
            angle: endAngle,
            duration: 150, // 敲下去的速度變快
            ease: 'Cubic.easeIn',
            onComplete: () => {
                spawnFloorSpike(scene, hitLeft);
                cleanupHammer(); // 敲擊地板後大槌立刻消失
                uncleState.isAttacking = false; // 大叔可以恢復自由移動
                scheduleUncleAttack(scene); // 排程下一次攻擊
            }
        });
    });
}

/**
 * 發動地刺攻擊（接在大槌之後）
 */
export function spawnFloorSpike(scene, hitLeft) {
    if (!refs.uncle || !refs.uncle.active) {
        return;
    }

    // 計算擊中點與地刺尺寸
    const offsetX = hitLeft ? -280 : 280;
    const spikeX = refs.uncle.x + offsetX;
    const spikeHeight = scene.cameras.main.height / 2;
    const spikeWidth = refs.uncle.displayWidth / 2;
    const floorY = scene.cameras.main.height - 70; // 地板上緣約在此

    // 建立黑色三角形地刺（初始藏在地板下）
    const spike = scene.add.polygon(spikeX, floorY + spikeHeight / 2, [
        { x: 0, y: spikeHeight },
        { x: spikeWidth / 2, y: 0 },
        { x: spikeWidth, y: spikeHeight }
    ], 0x000000);
    uncleState.spikes.push(spike);

    // 地刺升起
    scene.tweens.add({
        targets: spike,
        y: floorY - spikeHeight / 2, // 往上移動 spikeHeight 的距離，使尖端露出
        duration: 150,
        ease: 'Linear',
        onComplete: () => {
            // 維持兩秒
            scene.time.delayedCall(2000, () => {
                if (spike) {
                    // 地刺墜回地下
                    scene.tweens.add({
                        targets: spike,
                        y: floorY + spikeHeight / 2,
                        duration: 150,
                        onComplete: () => {
                            if (spike) {
                                spike.destroy();
                                uncleState.spikes = uncleState.spikes.filter(s => s !== spike);
                            }
                        }
                    });
                }
            });
        }
    });
}

/**
 * 處理猥瑣大叔受到的傷害
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {Phaser.GameObjects.Sprite|null} bullet - 擊中的子彈
 * @param {number} force - 原始擊退力道（會自動減半）
 * @param {number} stunTime - 硬直時間（毫秒）
 * @param {number} damage - 傷害值
 * @param {number} [originX] - 攻擊來源 X
 * @param {number} [originY] - 攻擊來源 Y
 */
export function handleUncleHit(scene, bullet, force, stunTime, damage, originX, originY) {
    if (!refs.uncle || !refs.uncle.active) {
        if (bullet) bullet.destroy();
        return;
    }

    const srcX = bullet ? bullet.x : (originX ?? refs.uncle.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.uncle.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.uncle.x, refs.uncle.y);

    uncleState.hp -= damage;
    if (refs.uncleHPText) {
        refs.uncleHPText.setText(`猥瑣大叔血量: ${uncleState.hp}`);
    }

    if (uncleState.hp <= 0) {
        // 死亡處理：隱藏並清理攻擊
        refs.uncle.setActive(false).setVisible(false).body.enable = false;
        scene.cameras.main.flash(500, 255, 0, 0);
        uncleState.isAttacking = false;
        if (attackTimerEvent) attackTimerEvent.remove();
        cleanupHammer();
        cleanupAllSpikes();

        scene.time.delayedCall(3000, () => {
            if (refs.onUncleDeath) {
                refs.onUncleDeath(scene);
            } else {
                respawnUncle(scene);
            }
        });
    } else {
        refs.uncle.setTint(0xff0000);
        
        // 攻擊時不能動，所以不套用擊退力道與一般硬直
        if (uncleState.isAttacking) {
            scene.time.delayedCall(100, () => {
                if (!uncleState.isHit && refs.uncle.active) refs.uncle.clearTint();
            });
        } else {
            uncleState.isHit = true;
            uncleState.hitStunTimer = stunTime;
            const halfForce = force / 2;
            refs.uncle.setVelocity(Math.cos(angle) * halfForce, Math.sin(angle) * halfForce - 100);
            scene.cameras.main.shake(100, 0.005);
        }
    }

    if (bullet) bullet.destroy();
}

/**
 * 重生猥瑣大叔（重置 HP 並顯示在指定位置）
 */
export function respawnUncle(scene, x, y) {
    uncleState.hp = uncleState.maxHp;
    if (refs.uncleHPText) refs.uncleHPText.setText(`猥瑣大叔血量: ${uncleState.hp}`);
    const spawnX = x ?? (3 * scene.cameras.main.width / 4);
    const spawnY = y ?? (scene.cameras.main.height - 150);
    refs.uncle.setActive(true).setVisible(true).body.enable = true;
    refs.uncle.setPosition(spawnX, spawnY);
    refs.uncle.clearTint();
    
    uncleState.isAttacking = false;
    uncleState.isHit = false;
    cleanupHammer();
    cleanupAllSpikes();
    scheduleUncleAttack(scene);
}

/**
 * 每幀更新猥瑣大叔邏輯
 */
export function updateUncle(scene, time, delta) {
    if (!refs.uncle || !refs.uncle.active) return;

    // 大槌握柄末端一直跟隨猥瑣大叔中央
    if (uncleState.hammer && uncleState.hammer.active) {
        uncleState.hammer.setPosition(refs.uncle.x, refs.uncle.y);
    }

    // 玩家碰到大槌或地刺死亡的判定
    if (refs.player && refs.player.active) {
        const playerRect = refs.player.getBounds();

        // 偵測大槌碰撞 (使用多邊形偵測槌頭與握把)
        if (uncleState.hammer && uncleState.hammer.active) {
            const h = uncleState.hammer;
            const rad = Phaser.Math.DegToRad(h.angle);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const headPoints = [
                { x: -100, y: -440 }, { x: 100, y: -440 },
                { x: 100, y: -360 }, { x: -100, y: -360 }
            ];
            const handlePoints = [
                { x: -20, y: -400 }, { x: 20, y: -400 },
                { x: 20, y: 0 }, { x: -20, y: 0 }
            ];

            const getPoly = (pts) => {
                const corners = pts.map(p => ({
                    x: h.x + p.x * cos - p.y * sin,
                    y: h.y + p.x * sin + p.y * cos
                }));
                return new Phaser.Geom.Polygon(corners);
            };

            const headPoly = getPoly(headPoints);
            const handlePoly = getPoly(handlePoints);

            const testPoints = [
                { x: refs.player.x, y: refs.player.y },
                { x: playerRect.left, y: playerRect.top },
                { x: playerRect.right, y: playerRect.top },
                { x: playerRect.right, y: playerRect.bottom },
                { x: playerRect.left, y: playerRect.bottom }
            ];

            const isHit = testPoints.some(p => 
                Phaser.Geom.Polygon.Contains(headPoly, p.x, p.y) || 
                Phaser.Geom.Polygon.Contains(handlePoly, p.x, p.y)
            );

            if (isHit) {
                if (scene.triggerCrash) scene.triggerCrash();
            }
        }

        // 偵測地刺碰撞 (支援多個地刺)
        if (uncleState.spikes.length > 0) {
            uncleState.spikes.forEach(spike => {
                if (spike && spike.active) {
                    const spikeRect = spike.getBounds();
                    if (Phaser.Geom.Intersects.RectangleToRectangle(playerRect, spikeRect)) {
                        if (scene.triggerCrash) scene.triggerCrash();
                    }
                }
            });
        }
    }

    // 受擊硬直恢復
    if (uncleState.isHit) {
        uncleState.hitStunTimer -= delta;
        if (uncleState.hitStunTimer <= 0) {
            uncleState.isHit = false;
            refs.uncle.clearTint();
        }
    }

    // 主動追蹤玩家與跳躍邏輯 (未攻擊且未硬直時)
    if (!uncleState.isAttacking && !uncleState.isHit) {
        uncleState.moveTimer -= delta;
        if (uncleState.moveTimer <= 0) {
            uncleState.moveTimer = Phaser.Math.Between(500, 1500); // 更新頻率提高為 0.5~1.5 秒
            
            if (refs.player && refs.player.active) {
                const dir = Math.sign(refs.player.x - refs.uncle.x);
                const dist = Math.abs(refs.player.x - refs.uncle.x);

                // 70% 機率朝玩家方向移動，30% 機率稍微反方向走
                if (Phaser.Math.Between(0, 100) < 70) {
                    refs.uncle.setVelocityX(dir * Phaser.Math.Between(150, 400));
                } else {
                    refs.uncle.setVelocityX(-dir * Phaser.Math.Between(100, 200));
                }

                // 如果距離玩家較遠，跳躍機率提升至 50%
                const jumpChance = dist > 300 ? 50 : 20;
                if (refs.uncle.body.touching.down && Phaser.Math.Between(0, 100) < jumpChance) {
                    refs.uncle.setVelocityY(-600);
                }
            } else {
                // 如果抓不到玩家，才隨機走動
                const r = Phaser.Math.Between(0, 2);
                if (r === 0) refs.uncle.setVelocityX(-200);
                else if (r === 1) refs.uncle.setVelocityX(200);
                else refs.uncle.setVelocityX(0);

                if (refs.uncle.body.touching.down && Phaser.Math.Between(0, 100) < 30) {
                    refs.uncle.setVelocityY(-600);
                }
            }
        }
    } else if (uncleState.isAttacking) {
        // 攻擊時保持不動
        refs.uncle.setVelocityX(0);
    }
}

