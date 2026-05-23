// === 猥瑣大叔攻擊模組 ===
// 負責猥瑣大叔的攻擊實作（大槌、地刺、黑球衝刺）
import { uncleState } from './UncleStateMachine.js';

// --- 共享參考 ---
let refs = {};
let hammerTimerEvent = null;
let summonSpikeTimerEvent = null;
let ballRushTimerEvent = null;  // 黑球衝刺攻擊計時器

// --- 黑球衝刺攻擊全域暫存 ---
let ballRushContainer = null;   // 黑球容器 (Graphics + 刺碰撞體)
let ballRushSpikeBodies = [];   // 刺的碰撞體陣列
let ballRushTween = null;       // 旋轉 Tween 參考

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
export function cleanupHammer() {
    if (uncleState.hammer) {
        uncleState.hammer.destroy();
        uncleState.hammer = null;
    }
}

/**
 * 清理所有地刺物件
 */
export function cleanupAllSpikes() {
    uncleState.spikes.forEach(spike => {
        if (spike) spike.destroy();
    });
    uncleState.spikes = [];
}

/**
 * 處理子彈擊中地刺的邏輯
 */
function handleSpikeHit(obj1, obj2) {
    let bullet, spike;
    
    // 透過屬性判斷哪個是地刺，哪個是子彈 (因為 Phaser 碰撞回呼參數順序不固定)
    if (obj1.spikeHp !== undefined) {
        spike = obj1;
        bullet = obj2;
    } else if (obj2.spikeHp !== undefined) {
        spike = obj2;
        bullet = obj1;
    } else {
        return;
    }

    if (bullet && bullet.active) bullet.destroy();
    if (!spike || !spike.active) return;

    spike.spikeHp -= 1;
    
    if (spike.spikeHp <= 0) {
        spike.destroy();
        uncleState.spikes = uncleState.spikes.filter(s => s !== spike);
    } else {
        // 血量為 10，每扣一滴血，顏色按比例朝白色 (#ffffff) 變淡
        const maxHp = 10;
        const damageTaken = maxHp - spike.spikeHp; 
        const colorVal = Math.floor((damageTaken / maxHp) * 255);
        const hexColor = (colorVal << 16) | (colorVal << 8) | colorVal;
        spike.setFillStyle(hexColor);
    }
}

/**
 * 啟動大叔的所有攻擊計時迴圈
 */
export function startUncleAttacks(scene) {
    if (hammerTimerEvent) hammerTimerEvent.remove();
    if (summonSpikeTimerEvent) summonSpikeTimerEvent.remove();
    if (ballRushTimerEvent) ballRushTimerEvent.remove();
    if (overloadAttackTimerEvent) overloadAttackTimerEvent.remove();
    scheduleNextHammer(scene);
    scheduleNextSummonSpike(scene);
    scheduleNextBallRush(scene); // 啟動黑球衝刺攻擊排程
}

let overloadAttackTimerEvent = null; // 超級地刺計時器

export function stopUncleAttacks() {
    if (hammerTimerEvent) { hammerTimerEvent.remove(); hammerTimerEvent = null; }
    if (summonSpikeTimerEvent) { summonSpikeTimerEvent.remove(); summonSpikeTimerEvent = null; }
    if (ballRushTimerEvent) { ballRushTimerEvent.remove(); ballRushTimerEvent = null; }
    if (overloadAttackTimerEvent) { overloadAttackTimerEvent.remove(); overloadAttackTimerEvent = null; }
}

function scheduleNextHammer(scene) {
    if (!refs.uncle || !refs.uncle.active) return;
    // 攻擊頻率改為 2~4 秒
    hammerTimerEvent = scene.time.delayedCall(Phaser.Math.Between(2000, 4000), () => {
        if (!uncleState.isOverload) {
            uncleState.attackQueue.push('hammer');
            tryExecuteNextAttack(scene);
            scheduleNextHammer(scene);
        }
    });
}

function scheduleNextSummonSpike(scene) {
    if (!refs.uncle || !refs.uncle.active) return;
    // 攻擊頻率為 5~6 秒
    summonSpikeTimerEvent = scene.time.delayedCall(Phaser.Math.Between(5000, 6000), () => {
        if (!uncleState.isOverload) {
            uncleState.attackQueue.push('summonSpike');
            tryExecuteNextAttack(scene);
            scheduleNextSummonSpike(scene);
        }
    });
}

export function scheduleNextOverloadAttack(scene) {
    console.log('scheduleNextOverloadAttack triggered!');
    if (!refs.uncle || !refs.uncle.active) return;
    // 每 3 秒發動一次過載模式隨機攻擊
    overloadAttackTimerEvent = scene.time.delayedCall(3000, () => {
        if (uncleState.isOverload) {
            const attacks = ['superSpike', 'superSpikeBall']; // 目前過載模式專屬攻擊
            const randomAttack = Phaser.Utils.Array.GetRandom(attacks);
            uncleState.attackQueue.push(randomAttack);
            tryExecuteNextAttack(scene);
        }
    });
}

/**
 * 處理攻擊佇列
 */
function tryExecuteNextAttack(scene) {
    if (!refs.uncle || !refs.uncle.active || uncleState.isAttacking) return;
    if (uncleState.attackQueue.length === 0) return;

    const nextAttack = uncleState.attackQueue.shift();
    if (nextAttack === 'hammer') {
        spawnHammerAttack(scene);
    } else if (nextAttack === 'summonSpike') {
        spawnSummonSpikeAttack(scene);
    } else if (nextAttack === 'ballRush') {
        // 執行黑球衝刺攻擊
        spawnBallRushAttack(scene);
    } else if (nextAttack === 'superSpike') {
        spawnSuperSpikeAttack(scene);
    } else if (nextAttack === 'superSpikeBall') {
        spawnSuperSpikeBallAttack(scene);
    }
}

/**
 * 結束當前攻擊並觸發佇列中下一個攻擊
 */
function endAttack(scene) {
    uncleState.isAttacking = false;
    if (refs.uncle && refs.uncle.active) {
        scene.time.delayedCall(100, () => {
            tryExecuteNextAttack(scene);
            
            // 如果在過載模式且攻擊佇列為空，排程下一次過載攻擊 (3秒後)
            if (uncleState.isOverload && uncleState.attackQueue.length === 0) {
                scheduleNextOverloadAttack(scene);
            }
        });
    }
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
    const mapWidth = scene.cameras.main.width;
    let hitLeft = Phaser.Math.Between(0, 1) === 0;
    
    // 如果大叔離左邊界太近，強制向右打，避免在界外耍笨
    if (refs.uncle.x < 300) hitLeft = false;
    // 如果大叔離右邊界太近，強制向左打
    else if (refs.uncle.x > mapWidth - 300) hitLeft = true;
    
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
                spawnHammerSpike(scene, hitLeft);
                cleanupHammer(); // 敲擊地板後大槌立刻消失
                endAttack(scene); // 結束攻擊狀態並觸發下一個攻擊
            }
        });
    });
}

/**
 * 發動大槌地刺攻擊（接在大槌之後）
 */
export function spawnHammerSpike(scene, hitLeft) {
    if (!refs.uncle || !refs.uncle.active) {
        return;
    }

    // 計算擊中點與地刺尺寸
    const offsetX = hitLeft ? -280 : 280;
    const spikeX = refs.uncle.x + offsetX;
    const spikeHeight = scene.cameras.main.height / 4; // 大槌打出來的地刺高度減半
    const spikeWidth = refs.uncle.displayWidth / 2;
    const floorY = scene.cameras.main.height - 70; // 地板上緣約在此

    const mapWidth = scene.cameras.main.width;
    if (spikeX - spikeWidth / 2 < 0 || spikeX + spikeWidth / 2 > mapWidth) {
        return; // 在地圖外就不生成地刺
    }

    // 建立黑色三角形地刺（初始藏在地板下）
    const spike = scene.add.polygon(spikeX, floorY + spikeHeight / 2, [
        { x: 0, y: spikeHeight },
        { x: spikeWidth / 2, y: 0 },
        { x: spikeWidth, y: spikeHeight }
    ], 0x000000);
    uncleState.spikes.push(spike);

    // 加入物理碰撞體，防止玩家衝刺直接穿過
    scene.physics.add.existing(spike);
    spike.body.immovable = true;
    spike.body.allowGravity = false;
    spike.body.setSize(spikeWidth, spikeHeight);
    scene.physics.add.collider(refs.player, spike, () => {
        if (scene.triggerCrash) scene.triggerCrash();
    });
    // 子彈擊中地刺會減少其血量
    spike.spikeHp = 10;
    if (refs.mgBullets) scene.physics.add.collider(refs.mgBullets, spike, handleSpikeHit);
    if (refs.sgBullets) scene.physics.add.collider(refs.sgBullets, spike, handleSpikeHit);
    if (refs.snBullets) scene.physics.add.collider(refs.snBullets, spike, handleSpikeHit);

    // 地刺升起
    scene.tweens.add({
        targets: spike,
        y: floorY - spikeHeight / 2, // 往上移動 spikeHeight 的距離，使尖端露出
        duration: 150,
        ease: 'Linear',
        onComplete: () => {
            // 維持兩秒
            scene.time.delayedCall(2000, () => {
                if (spike && spike.active) {
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
 * 發動召喚地刺 (Summon Spike) 新技能
 */
export function spawnSummonSpikeAttack(scene) {
    if (!refs.uncle || !refs.uncle.active) return;

    uncleState.isAttacking = true;
    refs.uncle.setVelocity(0, 0);
    refs.uncle.setTint(0x444444); // 施法變黑 (使用深灰色 Tint 保留細節，不會變成純黑剪影)

    // 0.2 秒後生成第一組地刺
    scene.time.delayedCall(200, () => {
        if (!refs.uncle || !refs.uncle.active) return;

        // 第 1 組：向外 150 像素
        createSummonSpikePair(scene, 150);

        // 第 2 組：延遲 0.6 秒後
        scene.time.delayedCall(600, () => {
            if (!refs.uncle || !refs.uncle.active) return;
            createSummonSpikePair(scene, 300);
        });

        // 第 3 組：延遲 1.2 秒後
        scene.time.delayedCall(1200, () => {
            if (!refs.uncle || !refs.uncle.active) return;
            createSummonSpikePair(scene, 450);
            
            // 獨立定時器：地刺升起(150)+停留(500)+降下(150) = 800ms 後結束攻擊
            scene.time.delayedCall(800, () => {
                if (refs.uncle && refs.uncle.active) {
                    refs.uncle.clearTint();
                }
                endAttack(scene);
            });
        });
    });
}

/**
 * 建立左右成對的召喚地刺
 */
function createSummonSpikePair(scene, offset) {
    createSingleSummonSpike(scene, offset);
    createSingleSummonSpike(scene, -offset);
}

/**
 * 建立單個召喚地刺
 */
function createSingleSummonSpike(scene, offset) {
    if (!refs.uncle || !refs.uncle.active) return;

    const spikeX = refs.uncle.x + offset;
    const spikeHeight = refs.uncle.displayHeight; // 高度為大叔高度
    const spikeWidth = refs.uncle.displayWidth / 2; // 寬度為大叔一半
    const floorY = scene.cameras.main.height - 70;

    const mapWidth = scene.cameras.main.width;
    // 若地刺在邊界外，取消生成
    if (spikeX - spikeWidth / 2 < 0 || spikeX + spikeWidth / 2 > mapWidth) {
        return;
    }

    const spike = scene.add.polygon(spikeX, floorY + spikeHeight / 2, [
        { x: 0, y: spikeHeight },
        { x: spikeWidth / 2, y: 0 },
        { x: spikeWidth, y: spikeHeight }
    ], 0x000000);
    uncleState.spikes.push(spike);

    // 加入物理碰撞體，防止玩家衝刺直接穿過
    scene.physics.add.existing(spike);
    spike.body.immovable = true;
    spike.body.allowGravity = false;
    spike.body.setSize(spikeWidth, spikeHeight);
    scene.physics.add.collider(refs.player, spike, () => {
        if (scene.triggerCrash) scene.triggerCrash();
    });
    // 子彈擊中地刺會減少其血量
    spike.spikeHp = 10;
    if (refs.mgBullets) scene.physics.add.collider(refs.mgBullets, spike, handleSpikeHit);
    if (refs.sgBullets) scene.physics.add.collider(refs.sgBullets, spike, handleSpikeHit);
    if (refs.snBullets) scene.physics.add.collider(refs.snBullets, spike, handleSpikeHit);

    // 升起 (150ms)
    scene.tweens.add({
        targets: spike,
        y: floorY - spikeHeight / 2,
        duration: 150,
        ease: 'Linear',
        onComplete: () => {
            // 停留 0.5s
            scene.time.delayedCall(500, () => {
                if (!spike || !spike.active) {
                    return;
                }
                // 降下 (150ms)
                scene.tweens.add({
                    targets: spike,
                    y: floorY + spikeHeight / 2,
                    duration: 150,
                    onComplete: () => {
                        spike.destroy();
                        uncleState.spikes = uncleState.spikes.filter(s => s !== spike);
                    }
                });
            });
        }
    });
}

/**
 * 每幀更新大叔攻擊跟隨邏輯
 */
export function updateUncleAttacks(scene) {
    if (!refs.uncle || !refs.uncle.active) return;

    // 大槌握柄末端一直跟隨猥瑣大叔中央
    if (uncleState.hammer && uncleState.hammer.active) {
        uncleState.hammer.setPosition(refs.uncle.x, refs.uncle.y);
    }

    // 玩家碰到大槌或地刺死亡的判定 (黑球衝刺已包含在自身邏輯)
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
    }
}

// ============================================================
// === 黑球衝刺攻擊 ===
// ============================================================

/**
 * 排程下一次黑球衝刺攻擊（每 4~5 秒一次）
 */
function scheduleNextBallRush(scene) {
    if (!refs.uncle || !refs.uncle.active) return;
    // 每 4~5 秒觸發一次黑球衝刺
    ballRushTimerEvent = scene.time.delayedCall(Phaser.Math.Between(4000, 5000), () => {
        if (!uncleState.isOverload) {
            uncleState.attackQueue.push('ballRush');
            tryExecuteNextAttack(scene);
            scheduleNextBallRush(scene);
        }
    });
}

/**
 * 清理黑球衝刺相關物件（旋轉 Tween、容器、刺碰撞體）
 */
export function cleanupBallRush() {
    // 停止旋轉動畫
    if (ballRushTween) {
        ballRushTween.stop();
        ballRushTween = null;
    }
    // 銷毀刺的獨立碰撞體矩形
    ballRushSpikeBodies.forEach(b => { if (b && b.active) b.destroy(); });
    ballRushSpikeBodies = [];
    // 銷毀球體容器（含內部 Graphics）
    if (ballRushContainer && ballRushContainer.active) {
        ballRushContainer.destroy();
        ballRushContainer = null;
    }
}

/**
 * 建立帶刺黑球的視覺容器
 */
function createSpikeBallGraphics(scene, x, y, color = 0x000000) {
    const radius = 40;       // 球半徑
    const spikeCount = 8;    // 刺的數量
    const spikeLen = 28;     // 刺的長度
    const spikeBase = 8;     // 刺底部的寬度（三角形底邊）

    const gfx = scene.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillCircle(0, 0, radius);

    for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2;
        const tipX = Math.cos(angle) * (radius + spikeLen);
        const tipY = Math.sin(angle) * (radius + spikeLen);
        const perpX = Math.cos(angle + Math.PI / 2) * spikeBase;
        const perpY = Math.sin(angle + Math.PI / 2) * spikeBase;
        const baseX = Math.cos(angle) * radius;
        const baseY = Math.sin(angle) * radius;

        gfx.fillStyle(color, 1);
        gfx.fillTriangle(
            baseX + perpX, baseY + perpY,
            baseX - perpX, baseY - perpY,
            tipX, tipY
        );
    }

    const container = scene.add.container(x, y, [gfx]);
    container.setDepth(10); 
    return container;
}

/**
 * 發動黑球衝刺攻擊
 */
export function spawnBallRushAttack(scene) {
    if (!refs.uncle || !refs.uncle.active) return;

    uncleState.isAttacking = true;
    refs.uncle.setVelocity(0, 0);

    const targetX = refs.player ? refs.player.x : refs.uncle.x;
    const targetY = refs.player ? refs.player.y : refs.uncle.y;

    refs.uncle.setVisible(false); 

    ballRushContainer = createSpikeBallGraphics(scene, refs.uncle.x, refs.uncle.y);

    const ballPhysics = scene.add.circle(refs.uncle.x, refs.uncle.y, 40, 0x000000, 0); 
    scene.physics.add.existing(ballPhysics);
    ballPhysics.body.allowGravity = false;   
    ballPhysics.body.setCircle(40);          
    ballPhysics.body.setCollideWorldBounds(true); 
    ballRushSpikeBodies.push(ballPhysics);   

    scene.physics.add.overlap(refs.player, ballPhysics, () => {
        if (scene.triggerCrash) scene.triggerCrash();
    });

    const exclamation = scene.add.text(
        targetX, targetY - 60,    
        '!',
        {
            fontSize: '64px',
            color: '#ff8800',     
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }
    ).setOrigin(0.5).setDepth(20);

    scene.tweens.add({
        targets: exclamation,
        alpha: 0,
        duration: 100,
        yoyo: true,
        repeat: 1  
    });

    scene.time.delayedCall(200, () => {
        if (exclamation && exclamation.active) exclamation.destroy();

        if (!refs.uncle || !refs.uncle.active || !ballRushContainer) {
            endAttack(scene);
            return;
        }

        const startX = ballRushContainer.x;
        const startY = ballRushContainer.y;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 900; 
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        ballPhysics.body.setVelocity(vx, vy);

        const rushDuration = 800; 

        ballRushTween = scene.tweens.add({
            targets: ballRushContainer,
            angle: '+=720',          
            duration: rushDuration,
            ease: 'Linear'
        });

        scene.tweens.add({
            targets: { t: 0 },
            t: 1,
            duration: rushDuration,
            ease: 'Linear',
            onUpdate: () => {
                if (ballRushContainer && ballRushContainer.active && ballPhysics && ballPhysics.active) {
                    ballRushContainer.setPosition(ballPhysics.x, ballPhysics.y);
                }
            },
            onComplete: () => {
                const finalX = (ballPhysics && ballPhysics.active) ? ballPhysics.x : refs.uncle.x;
                const finalY = (ballPhysics && ballPhysics.active) ? ballPhysics.y : refs.uncle.y;
                if (ballPhysics && ballPhysics.active) ballPhysics.destroy();
                cleanupBallRush();
                if (refs.uncle && refs.uncle.active) {
                    refs.uncle.setPosition(finalX, finalY);
                    refs.uncle.setVisible(true);
                    refs.uncle.clearTint();
                }
                endAttack(scene);
            }
        });
    });
}


// ============================================================
// === 超級地刺攻擊 (過載模式專用) ===
// ============================================================

export function spawnSuperSpikeAttack(scene) {
    if (!refs.uncle || !refs.uncle.active || !uncleState.overloadLimbs) return;

    uncleState.isAttacking = true;
    refs.uncle.setVelocity(0, 0);

    const arms = uncleState.overloadLimbs;
    
    // 停止原本的呼吸擺動動畫，準備舉手
    scene.tweens.killTweensOf(arms.armL_Group);
    scene.tweens.killTweensOf(arms.armR_Group);

    // 1. 大叔往上移動，避免擋住安全區，並同時舉起雙手
    scene.tweens.add({
        targets: refs.uncle,
        y: '-=150',
        duration: 500,
        ease: 'Cubic.easeOut'
    });
    
    scene.tweens.add({
        targets: arms.armL_Group,
        angle: -150, // 左手高舉
        duration: 500,
        ease: 'Cubic.easeOut'
    });
    
    scene.tweens.add({
        targets: arms.armR_Group,
        angle: 150, // 右手高舉
        duration: 500,
        ease: 'Cubic.easeOut'
    });

    // 2. 延遲 0.5 秒後生成橘色警告刺
    scene.time.delayedCall(500, () => {
        if (!refs.uncle || !refs.uncle.active) {
            endAttack(scene);
            return;
        }

        const mapWidth = scene.cameras.main.width;
        const floorY = scene.cameras.main.height - 70;
        const spikeWidth = refs.uncle.displayWidth / 2; // 普通地刺寬度
        const spikeHeight = floorY * 0.8; // 地刺高度為地板到天花板的 4/5
        
        // 確保安全區夠大（玩家寬度的 1.5 倍）
        const playerWidth = refs.player ? refs.player.displayWidth : 50;
        const safeZoneWidth = playerWidth * 1.5;
        // 決定安全區的起始位置 (保證安全區在畫面內)
        const safeZoneStartX = Phaser.Math.Between(0, mapWidth - safeZoneWidth);
        const safeZoneEndX = safeZoneStartX + safeZoneWidth;
        
        const warningSpikes = [];

        // 生成橘色警告刺
        for (let x = 0; x < mapWidth; x += spikeWidth) {
            const spikeLeft = x;
            const spikeRight = x + spikeWidth;
            
            // 如果地刺範圍與安全區有任何重疊，則不生成此警告刺（留下安全的空位）
            if (spikeRight > safeZoneStartX && spikeLeft < safeZoneEndX) continue;

            const spikeX = x + spikeWidth / 2;
            
            // 建立橘色警告刺
            const warningSpike = scene.add.polygon(spikeX, floorY, [
                { x: 0, y: spikeHeight },
                { x: spikeWidth / 2, y: 0 },
                { x: spikeWidth, y: spikeHeight }
            ], 0xffa500); 
            
            warningSpike.setAlpha(0.6); 
            
            // 讓警告刺閃爍
            scene.tweens.add({
                targets: warningSpike,
                alpha: 0.2,
                duration: 250,
                yoyo: true,
                repeat: -1
            });
            
            warningSpikes.push(warningSpike);
        }

        // 3. 警告維持 2 秒後，銷毀警告刺並生成真正的暗紅色超級地刺
        scene.time.delayedCall(2000, () => {
            // 清除警告刺
            warningSpikes.forEach(w => w.destroy());

            if (!refs.uncle || !refs.uncle.active) {
                endAttack(scene);
                return;
            }

            const currentSpikes = [];

            // 生成真實地刺
            for (let x = 0; x < mapWidth; x += spikeWidth) {
                const spikeLeft = x;
                const spikeRight = x + spikeWidth;
                
                // 如果地刺範圍與安全區重疊，則不生成真實地刺
                if (spikeRight > safeZoneStartX && spikeLeft < safeZoneEndX) continue;

                const spikeX = x + spikeWidth / 2;
                
                // 建立暗紅色超級地刺 (藏在地板下)
                const spike = scene.add.polygon(spikeX, floorY + spikeHeight / 2, [
                    { x: 0, y: spikeHeight },
                    { x: spikeWidth / 2, y: 0 },
                    { x: spikeWidth, y: spikeHeight }
                ], 0x8b0000); 
                
                uncleState.spikes.push(spike);
                currentSpikes.push(spike);

                // 加入物理碰撞
                scene.physics.add.existing(spike);
                spike.body.immovable = true;
                spike.body.allowGravity = false;
                spike.body.setSize(spikeWidth, spikeHeight);
                
                // 玩家碰到超級地刺，強制當機
                scene.physics.add.collider(refs.player, spike, () => {
                    if (scene.triggerCrash) scene.triggerCrash(true); 
                });
                
                spike.spikeHp = 30; 
                if (refs.mgBullets) scene.physics.add.collider(refs.mgBullets, spike, handleSpikeHit);
                if (refs.sgBullets) scene.physics.add.collider(refs.sgBullets, spike, handleSpikeHit);
                if (refs.snBullets) scene.physics.add.collider(refs.snBullets, spike, handleSpikeHit);

                // 地刺升起動畫
                scene.tweens.add({
                    targets: spike,
                    y: floorY - spikeHeight / 2,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
            }

            // 4. 地刺停留 1.5 秒後降下
            scene.time.delayedCall(1500, () => {
                currentSpikes.forEach(spike => {
                    if (spike && spike.active) {
                        scene.tweens.add({
                            targets: spike,
                            y: floorY + spikeHeight / 2,
                            duration: 200,
                            onComplete: () => {
                                spike.destroy();
                                uncleState.spikes = uncleState.spikes.filter(s => s !== spike);
                            }
                        });
                    }
                });

                // 5. 動畫結束，雙手放下並恢復呼吸動畫
                if (refs.uncle && refs.uncle.active && uncleState.overloadLimbs) {
                    scene.tweens.add({
                        targets: arms.armL_Group,
                        angle: -25,
                        duration: 500,
                        ease: 'Cubic.easeInOut'
                    });
                    scene.tweens.add({
                        targets: arms.armR_Group,
                        angle: 25,
                        duration: 500,
                        ease: 'Cubic.easeInOut',
                        onComplete: () => {
                            if (!refs.uncle || !refs.uncle.active) return;
                            scene.tweens.add({
                                targets: arms.armL_Group,
                                angle: { from: -25, to: 10 },
                                duration: 1500,
                                yoyo: true,
                                repeat: -1,
                                ease: 'Sine.easeInOut'
                            });
                            scene.tweens.add({
                                targets: arms.armR_Group,
                                angle: { from: 25, to: -10 },
                                duration: 1500,
                                yoyo: true,
                                repeat: -1,
                                ease: 'Sine.easeInOut'
                            });
                            endAttack(scene);
                        }
                    });
                } else {
                    endAttack(scene);
                }
            });
        });
    });
}


// ============================================================
// === 超級刺球攻擊 (過載模式專用) ===
// ============================================================

export function spawnSuperSpikeBallAttack(scene) {
    console.log('spawnSuperSpikeBallAttack triggered!');
    if (!refs.uncle || !refs.uncle.active || !uncleState.overloadLimbs) return;

    uncleState.isAttacking = true;
    refs.uncle.setVelocity(0, 0);

    const arms = uncleState.overloadLimbs;
    
    // 停止呼吸擺動動畫
    scene.tweens.killTweensOf(arms.armL_Group);
    scene.tweens.killTweensOf(arms.armR_Group);

    // 1. 蓄力：雙手往內縮
    scene.tweens.add({
        targets: arms.armL_Group,
        angle: -10, 
        duration: 400,
        ease: 'Cubic.easeIn'
    });
    
    scene.tweens.add({
        targets: arms.armR_Group,
        angle: 10, 
        duration: 400,
        ease: 'Cubic.easeIn',
        onComplete: () => {
            // 2. 釋放：雙手往外打開
            scene.tweens.add({
                targets: arms.armL_Group,
                angle: -100,
                duration: 200,
                ease: 'Cubic.easeOut'
            });
            scene.tweens.add({
                targets: arms.armR_Group,
                angle: 100,
                duration: 200,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // 3. 發射超級刺球
                    fireSuperSpikeBalls(scene);
                    
                    // 4. 動畫結束，雙手放下並恢復呼吸動畫
                    scene.tweens.add({
                        targets: arms.armL_Group,
                        angle: -25,
                        duration: 500,
                        ease: 'Cubic.easeInOut'
                    });
                    scene.tweens.add({
                        targets: arms.armR_Group,
                        angle: 25,
                        duration: 500,
                        ease: 'Cubic.easeInOut',
                        onComplete: () => {
                            if (!refs.uncle || !refs.uncle.active) return;
                            scene.tweens.add({
                                targets: arms.armL_Group,
                                angle: { from: -25, to: 10 },
                                duration: 1500,
                                yoyo: true,
                                repeat: -1,
                                ease: 'Sine.easeInOut'
                            });
                            scene.tweens.add({
                                targets: arms.armR_Group,
                                angle: { from: 25, to: -10 },
                                duration: 1500,
                                yoyo: true,
                                repeat: -1,
                                ease: 'Sine.easeInOut'
                            });
                            endAttack(scene);
                        }
                    });
                }
            });
        }
    });
}

function fireSuperSpikeBalls(scene) {
    console.log('fireSuperSpikeBalls triggered!');
    if (!refs.uncle || !refs.uncle.active) return;
    
    const startX = refs.uncle.x;
    const startY = refs.uncle.y;
    const mapWidth = scene.cameras.main.width;
    const floorY = scene.cameras.main.height - 70;
    
    const specialIndex = Phaser.Math.Between(0, 4);
    const balls = [];
    
    // 生成 5 顆刺球
    for (let i = 0; i < 5; i++) {
        // 隨機往下的角度 (Math.PI/6 到 Math.PI * 5/6)
        const angle = Phaser.Math.FloatBetween(Math.PI / 6, Math.PI * 5 / 6);
        const isSpecial = (i === specialIndex);
        const color = isSpecial ? 0x8b0000 : 0x000000;
        
        const container = createSpikeBallGraphics(scene, startX, startY, color);
        const physicsBody = scene.add.circle(startX, startY, 40, 0x000000, 0);
        scene.physics.add.existing(physicsBody);
        physicsBody.body.allowGravity = false;
        physicsBody.body.setCircle(40);
        
        const speed = Phaser.Math.Between(400, 700);
        physicsBody.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        
        scene.physics.add.overlap(refs.player, physicsBody, () => {
            if (scene.triggerCrash) scene.triggerCrash();
        });
        
        balls.push({
            container,
            physicsBody,
            isSpecial,
            active: true
        });
    }
    
    // 讓刺球旋轉
    const spinTweens = balls.map(b => scene.tweens.add({
        targets: b.container,
        angle: 360,
        duration: 800,
        repeat: -1,
        ease: 'Linear'
    }));
    
    // 每幀檢查刺球邊界與位置同步
    const updateEvent = scene.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
            let allDead = true;
            
            balls.forEach((b, index) => {
                if (!b.active) return;
                allDead = false;
                
                if (b.container && b.physicsBody) {
                    b.container.setPosition(b.physicsBody.x, b.physicsBody.y);
                }
                
                // 碰到左右牆壁或地板
                if (b.physicsBody.x <= 40 || b.physicsBody.x >= mapWidth - 40 || b.physicsBody.y >= floorY - 40 || b.physicsBody.y <= 40) {
                    b.active = false;
                    const crashX = b.physicsBody.x;
                    const crashY = b.physicsBody.y;
                    
                    b.physicsBody.destroy();
                    b.container.destroy();
                    spinTweens[index].stop();
                    
                    if (b.isSpecial) {
                        spawnExplosionSpikes(scene, crashX, crashY, mapWidth, floorY);
                    }
                }
            });
            
            if (allDead) {
                updateEvent.remove();
            }
        }
    });
}

function spawnExplosionSpikes(scene, startX, startY, mapWidth, floorY) {
    const spikeCount = 8;
    const spikeLen = 30;
    const spikeBase = 10;
    
    const explosionSpikes = [];
    
    for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2;
        
        const spike = scene.add.polygon(startX, startY, [
            { x: 0, y: -spikeLen },
            { x: spikeBase, y: spikeLen },
            { x: -spikeBase, y: spikeLen }
        ], 0x8b0000); // 暗紅色碎刺
        
        spike.rotation = angle + Math.PI / 2;
        
        scene.physics.add.existing(spike);
        spike.body.allowGravity = false;
        spike.body.setCircle(spikeBase);
        
        const speed = 600; 
        spike.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        
        scene.physics.add.overlap(refs.player, spike, () => {
            if (scene.triggerCrash) scene.triggerCrash();
        });
        
        explosionSpikes.push(spike);
    }
    
    const shardEvent = scene.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
            let allDead = true;
            explosionSpikes.forEach(s => {
                if (s && s.active) {
                    allDead = false;
                    // 若碰到邊界則徹底銷毀
                    if (s.x <= 0 || s.x >= mapWidth || s.y >= floorY || s.y <= 0) {
                        s.destroy();
                    }
                }
            });
            
            if (allDead) {
                shardEvent.remove();
            }
        }
    });
}
