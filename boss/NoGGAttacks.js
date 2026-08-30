// === 我沒有GG / 蔡徐坤 攻擊模組 (NoGGAttacks.js) ===
// 負責新 Boss「我沒有GG」的第一階段迪克小刀射擊，
// 以及第二階段「蔡徐坤」的唱跳換圖衝刺「雞你太美」、5~7秒隨機技能（「我看了魔」減傷Debuff + 灰色擴散愛心、「超究極華麗灰色中分頭大爆炸」無視盾牌）、以及擊敗後的狂暴彈跳籃球 5 秒躲避挑戰
// 遵循架構規範：每一個 Boss 均獨立具備 Attacks.js 與 StateMachine.js (新增中文註解)

import { noGGState, triggerCXKDeathQuiz } from './NoGGStateMachine.js';
import { playerState } from '../player/PlayerController.js';

// 共享的遊戲物件參考 (新增中文註解)
let refs = {};

// 定時器與狀態變數 (新增中文註解)
let attackTimer = null;           // 發射迪克小刀的定時器 (新增中文註解)
let cxkAnimTimer = null;          // 蔡徐坤四張圖片切換定時器 (新增中文註解)
let skillTimer = null;            // 隨機技能排程定時器 (中分頭爆炸 / 我看了魔) (新增中文註解)
let explosionTimer = null;        // 相容別名定時器
let demonDebuffTimer = null;      // 「我看了魔」Debuff 倒數定時器 (新增中文註解)
let activeBasketballs = [];       // 當前活躍的籃球物件陣列 (新增中文註解)
let activeBasketballTrails = [];  // 當前活躍的籃球殘影陣列 (新增中文註解)
let basketballWorldBoundsHandler = null; // 籃球邊界碰撞偏差監聽器 (新增中文註解)
let cxkFrameIndex = 0;            // 蔡徐坤當前播放影格索引

// 蔡徐坤圖片序列：1 -> 2 -> 3 -> 4 -> 1 -> 2 -> 3 -> 4 (第四張播完回到第一張重新開始) (新增中文註解)
const cxkSequence = ['cxk_1', 'cxk_2', 'cxk_3', 'cxk_4'];

/**
 * 初始化我沒有GG攻擊模組所需的遊戲物件參考 (新增中文註解)
 */
export function initNoGGAttackRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 徹底清除畫面上所有的籃球與殘影物件 (新增中文註解：5秒結束或死亡時立即銷毀全部籃球並解除碰撞監聽)
 */
export function cleanupAllBasketballs(scene) {
    if (scene && scene.physics && scene.physics.world && basketballWorldBoundsHandler) {
        scene.physics.world.off('worldbounds', basketballWorldBoundsHandler);
        basketballWorldBoundsHandler = null;
    }
    if (activeBasketballs && activeBasketballs.length > 0) {
        activeBasketballs.forEach(b => {
            if (b) {
                if (b.body) b.body.enable = false;
                if (b.destroy) b.destroy();
            }
        });
        activeBasketballs = [];
    }
    if (activeBasketballTrails && activeBasketballTrails.length > 0) {
        activeBasketballTrails.forEach(t => {
            if (t && t.destroy) t.destroy();
        });
        activeBasketballTrails = [];
    }
}

/**
 * 啟動發射迪克小刀攻擊排程 (新增中文註解：第一階段定時向玩家發射迪克小刀)
 */
export function startNoGGAttacks(scene) {
    stopNoGGAttacks();
    
    // 每 2.0 到 3.2 秒隨機發射一次迪克小刀 (新增中文註解：開啟迪克小刀攻擊排程)
    const scheduleNextAttack = () => {
        if (!refs.noGG || !refs.noGG.active || noGGState.isPhase2) return;
        
        const delay = Phaser.Math.Between(2000, 3200);
        attackTimer = scene.time.delayedCall(delay, () => {
            if (refs.noGG && refs.noGG.active && refs.player && refs.player.active && !noGGState.isPhase2) {
                shootDickKnife(scene);
            }
            scheduleNextAttack();
        });
    };
    
    scheduleNextAttack();
}

/**
 * 停止發射迪克小刀攻擊 (新增中文註解)
 */
export function stopNoGGAttacks() {
    if (attackTimer) {
        attackTimer.remove();
        attackTimer = null;
    }
}

/**
 * 向玩家位置發射迪克小刀 (新增中文註解：第一階段發射迪克小刀攻擊函數)
 */
export function shootDickKnife(scene) {
    if (!refs.noGG || !refs.noGG.active || !refs.player || !refs.player.active || !refs.dickKnives || noGGState.isPhase2) return;

    // 計算 Boss 到玩家的角度 (新增中文註解)
    const angle = Phaser.Math.Angle.Between(refs.noGG.x, refs.noGG.y, refs.player.x, refs.player.y);

    // 建立迪克小刀物理精靈 (新增中文註解)
    const knife = refs.dickKnives.create(refs.noGG.x, refs.noGG.y, 'dickKnife');
    if (knife) {
        knife.setDisplaySize(120, 120); // 放大迪克小刀 (120x120) (新增中文註解)
        
        // 蠟燭火焰尖端朝向發射運動方向，補正 +135 度 (新增中文註解)
        knife.setRotation(angle + 3 * Math.PI / 4); 

        // 將碰撞箱設為緊密貼合中央蠟燭與火焰區域 (新增中文註解)
        knife.body.setSize(knife.width * 0.45, knife.height * 0.45);
        knife.body.setOffset(knife.width * 0.275, knife.height * 0.275);

        knife.body.allowGravity = false; // 直線飛行，不受重力影響 (新增中文註解)
        scene.physics.velocityFromRotation(angle, 1100, knife.body.velocity); // 2倍速直線飛向玩家 (新增中文註解)

        // 提示紅光發光效果 (新增中文註解)
        knife.setTint(0xff6666);

        // 5 秒後自動銷毀 (新增中文註解)
        scene.time.delayedCall(5000, () => {
            if (knife && knife.active) knife.destroy();
        });
    }
}

/**
 * 彈出「雞你太美」喊話文字特效 (新增中文註解：在 Boss 上方生成漂浮發光的雞你太美字幕)
 */
export function showChickenShout(scene, x, y) {
    if (!scene || !scene.add) return;
    const shout = scene.add.text(x, y - 60, "雞你太美！", {
        fontSize: '32px',
        fill: '#ffff00',
        fontStyle: 'bold',
        stroke: '#ff0000',
        strokeThickness: 5,
        shadow: { color: '#ff6600', fill: true, blur: 10 }
    }).setOrigin(0.5);
    shout.setDepth(1000);

    scene.tweens.add({
        targets: shout,
        y: y - 130,
        scale: 1.25,
        alpha: 0,
        duration: 550,
        ease: 'Power2',
        onComplete: () => {
            shout.destroy();
        }
    });
}

/**
 * 啟動蔡徐坤換圖動畫與第3、4張衝刺喊話 (新增中文註解：四張圖片依序播放，第3、4張直接衝向玩家並喊出「雞你太美」，動態貼齊碰撞箱並防止插入地板)
 */
export function startCXKAnimation(scene) {
    stopCXKAnimation();
    cxkFrameIndex = 0;

    // 每 180 毫秒切換一次圖片 (新增中文註解)
    cxkAnimTimer = scene.time.addEvent({
        delay: 180,
        callback: () => {
            if (!refs.noGG || !refs.noGG.active || !noGGState.isPhase2 || noGGState.isExploding || noGGState.isQuizActive) return;
            
            const frameKey = cxkSequence[cxkFrameIndex];
            refs.noGG.setTexture(frameKey);
            
            // 保持顯示尺寸與大叔/蘿莉等級的大尺寸視覺 (新增中文註解)
            if (refs.loli) {
                refs.noGG.setDisplaySize(refs.loli.displayWidth * 1.35, refs.loli.displayHeight * 1.35);
            }

            // 動態校準碰撞箱，確保與每張切換圖片的外型完美貼齊 (新增中文註解)
            if (refs.noGG.body) {
                refs.noGG.body.setSize(refs.noGG.width, refs.noGG.height, true);
            }

            // 防插入地板校準：換圖縮放時若底部低於地板，立刻向上修正對齊地板表面 (新增中文註解)
            const groundTop = scene.cameras.main.height - 70;
            const halfHeight = refs.noGG.displayHeight / 2;
            if (refs.noGG.y + halfHeight > groundTop) {
                refs.noGG.y = groundTop - halfHeight;
                if (refs.noGG.body && refs.noGG.body.velocity.y > 0) {
                    refs.noGG.setVelocityY(0);
                }
            }

            // 判斷是否為第三張 (cxk_3) 或第四張 (cxk_4) (新增中文註解：第3、4張衝向玩家並喊出「雞你太美」)
            if (cxkFrameIndex === 2 || cxkFrameIndex === 3) {
                if (refs.player && refs.player.active) {
                    const angle = Phaser.Math.Angle.Between(refs.noGG.x, refs.noGG.y, refs.player.x, refs.player.y);
                    // 高速直接衝向玩家（速度調為 3 倍 2250，衝刺距離 3 倍）(新增中文註解)
                    let vx = Math.cos(angle) * 2250;
                    let vy = Math.sin(angle) * 2250;

                    // 若已經在地面上且目標偏向下方，限制向下速度為 0 避免撞入地板 (新增中文註解)
                    if (refs.noGG.y + halfHeight >= groundTop - 4 && vy > 0) {
                        vy = 0;
                    }
                    refs.noGG.setVelocity(vx, vy);
                }
                // 彈出「雞你太美」文字特效 (新增中文註解)
                showChickenShout(scene, refs.noGG.x, refs.noGG.y);
            } else {
                // 第 1、2 張稍作緩衝或減速 (新增中文註解)
                refs.noGG.setVelocity(refs.noGG.body.velocity.x * 0.4, refs.noGG.body.velocity.y * 0.4);
            }
            
            // 推進至下一格 (第四張播完回到第一張重新開始) (新增中文註解)
            cxkFrameIndex = (cxkFrameIndex + 1) % cxkSequence.length;
        },
        loop: true
    });
}

/**
 * 停止蔡徐坤換圖動畫 (新增中文註解)
 */
export function stopCXKAnimation() {
    if (cxkAnimTimer) {
        cxkAnimTimer.remove();
        cxkAnimTimer = null;
    }
}

/**
 * 啟動蔡徐坤隨機技能排程定時器 (新增中文註解：隨機 5~7 秒排程施放「中分頭爆炸」或「我看了魔」)
 */
export function startCXKSkillScheduler(scene) {
    stopCXKSkillScheduler();
    if (!noGGState.isPhase2) return;

    const delay = Phaser.Math.Between(5000, 7000);
    skillTimer = scene.time.delayedCall(delay, () => {
        if (!refs.noGG || !refs.noGG.active || !noGGState.isPhase2 || noGGState.isQuizActive || noGGState.isExploding || noGGState.isDemonActive) return;
        
        // 5~7秒隨機二選一：50% 中分頭爆炸，50% 我看了魔 (新增中文註解)
        const isExplosion = Math.random() < 0.5;
        if (isExplosion) {
            triggerCenterPartExplosion(scene);
        } else {
            triggerDemonSkill(scene);
        }
    });
}

/**
 * 停止蔡徐坤技能排程定時器 (新增中文註解)
 */
export function stopCXKSkillScheduler() {
    if (skillTimer) {
        skillTimer.remove();
        skillTimer = null;
    }
    if (explosionTimer) {
        explosionTimer.remove();
        explosionTimer = null;
    }
}

// 保持向下相容的別名 (新增中文註解)
export const startCXKExplosionScheduler = startCXKSkillScheduler;
export const stopCXKExplosionScheduler = stopCXKSkillScheduler;

/**
 * 發動「我看了魔」技能 (新增中文註解：播放3秒動畫、蔡徐坤無敵、出現灰色愛心、玩家衝刺能量條砍半變灰、傷害砍半5->2, 25->12, 50->25)
 */
export function triggerDemonSkill(scene) {
    if (!refs.noGG || !refs.noGG.active || !noGGState.isPhase2 || noGGState.isQuizActive) return;

    noGGState.isDemonActive = true;
    noGGState.isSkillInvincible = true; // 技能期間蔡徐坤無敵 (新增中文註解)
    noGGState.isDemonDebuffActive = true; // 玩家傷害砍半 (新增中文註解)

    stopCXKAnimation(); // 暫停常規換圖與衝刺 (新增中文註解)

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // 1. 玩家衝刺能量條砍半並變為灰色 (Debuff 持續 5 秒) (新增中文註解)
    playerState.maxDashEnergy = 50;
    playerState.dashEnergy = Math.min(playerState.dashEnergy, 50);
    playerState.dashEnergyColor = 0x888888; // 顏色變灰色 (新增中文註解)

    // 2. 畫面上方顯示「💀 我 看 了 魔 💀」暗黑標題與 5 秒 Debuff 提示 (新增中文註解)
    const demonTitle = scene.add.text(width / 2, 70, "💀 我 看 了 魔 💀", {
        fontSize: '34px',
        fill: '#aaaaaa',
        fontStyle: 'bold',
        stroke: '#111111',
        strokeThickness: 6,
        shadow: { color: '#666666', fill: true, blur: 15 }
    }).setOrigin(0.5).setDepth(1800);

    const demonSub = scene.add.text(width / 2, 110, "⚡ 衝刺能量減半(灰) · 武器傷害減半（動畫後持續 5 秒）⚡", {
        fontSize: '18px',
        fill: '#999999',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(1800);

    const titleTween = scene.tweens.add({
        targets: [demonTitle, demonSub],
        alpha: 0.65,
        scale: 1.05,
        duration: 400,
        yoyo: true,
        repeat: -1
    });

    // 3. 蔡徐坤 3 秒無敵防護罩光環 (新增中文註解：灰色防護光圈)
    const shieldGfx = scene.add.graphics().setDepth(1200);
    const updateShield = () => {
        if (!shieldGfx || !shieldGfx.active || !refs.noGG || !refs.noGG.active) return;
        shieldGfx.clear();
        shieldGfx.lineStyle(4, 0xaaaaaa, 0.85);
        shieldGfx.strokeCircle(refs.noGG.x, refs.noGG.y, 80);
        shieldGfx.lineStyle(2, 0xffffff, 0.6);
        shieldGfx.strokeCircle(refs.noGG.x, refs.noGG.y, 90);
    };

    // 4. 特效：愛心從蔡徐坤中間擴散出來然後淡出 (新增中文註解)
    const emitExpandingHeart = (delayMs = 0) => {
        scene.time.delayedCall(delayMs, () => {
            if (!refs.noGG || !refs.noGG.active) return;
            const heartContainer = scene.add.container(refs.noGG.x, refs.noGG.y).setDepth(1400);
            const heartGfx = scene.add.graphics();
            heartGfx.fillStyle(0x777777, 0.7);
            heartGfx.lineStyle(4, 0xdddddd, 0.95);

            // 繪製心形 (新增中文註解)
            heartGfx.fillCircle(-14, -10, 18);
            heartGfx.strokeCircle(-14, -10, 18);
            heartGfx.fillCircle(14, -10, 18);
            heartGfx.strokeCircle(14, -10, 18);
            heartGfx.fillTriangle(-30, -5, 30, -5, 0, 30);
            heartGfx.lineBetween(-30, -5, 0, 30);
            heartGfx.lineBetween(30, -5, 0, 30);
            heartGfx.fillRect(-20, -10, 40, 18);

            heartContainer.add(heartGfx);
            heartContainer.setScale(0.4);
            heartContainer.setAlpha(0.95);

            // 從蔡徐坤中間不斷擴散放大並漸變淡出 (新增中文註解)
            scene.tweens.add({
                targets: heartContainer,
                scaleX: 7.0,
                scaleY: 7.0,
                alpha: 0,
                duration: 1600,
                ease: 'Cubic.easeOut',
                onComplete: () => { heartContainer.destroy(); }
            });
        });
    };

    // 在技能期間發射多波從中心擴散淡出的灰色愛心 (新增中文註解)
    emitExpandingHeart(0);
    emitExpandingHeart(600);
    emitExpandingHeart(1300);
    emitExpandingHeart(2000);

    // 5. 3 秒逐格動畫播放 (新增中文註解：播放 111 張逐格影格，播放 3 秒)
    let demonFrameIndex = 0;
    const totalFrames = 111;
    const frameDelay = 3000 / totalFrames; // 約 27ms 每幀
    const demonAnimTimer = scene.time.addEvent({
        delay: frameDelay,
        repeat: totalFrames - 1, // 執行 111 次
        callback: () => {
            if (!refs.noGG || !refs.noGG.active || !noGGState.isDemonActive) return;
            
            const frameKey = `cxk_demon_${demonFrameIndex}`;
            if (scene.textures.exists(frameKey)) {
                refs.noGG.setTexture(frameKey);
                if (refs.loli) {
                    refs.noGG.setDisplaySize(refs.loli.displayWidth * 1.6, refs.loli.displayHeight * 1.35);
                }
                if (refs.noGG.body) {
                    refs.noGG.body.setSize(refs.noGG.width, refs.noGG.height, true);
                }
            } else {
                refs.noGG.setTexture(cxkSequence[demonFrameIndex % cxkSequence.length]);
                refs.noGG.setTint(0x888888);
            }

            demonFrameIndex = (demonFrameIndex + 1) % totalFrames;
            updateShield();
        }
    });

    // 6. 3 秒結束：蔡徐坤解除無敵，恢復常態四圖循環與衝刺 (新增中文註解)
    scene.time.delayedCall(3000, () => {
        noGGState.isDemonActive = false;
        noGGState.isSkillInvincible = false; // 蔡徐坤 3 秒無敵結束 (新增中文註解)
        shieldGfx.destroy();
        demonAnimTimer.remove();

        if (refs.noGG && refs.noGG.active && noGGState.isPhase2) {
            refs.noGG.clearTint();
            if (refs.loli) {
                refs.noGG.setDisplaySize(refs.loli.displayWidth * 1.35, refs.loli.displayHeight * 1.35);
            }
            // 恢復正常四圖循環動畫與衝刺 (新增中文註解)
            startCXKAnimation(scene);
            // 重新排程下一次 5~7 秒隨機技能 (中分頭爆炸 / 我看了魔) (新增中文註解)
            startCXKSkillScheduler(scene);
        }
    });

    // 7. 動畫播完後再持續 5 秒（總計 8 秒）：玩家攻擊傷害與衝刺能量條 Debuff 徹底還原 (新增中文註解)
    if (demonDebuffTimer) {
        demonDebuffTimer.remove();
        demonDebuffTimer = null;
    }
    demonDebuffTimer = scene.time.delayedCall(8000, () => {
        noGGState.isDemonDebuffActive = false; // 解除玩家傷害砍半 (新增中文註解)

        // 還原玩家衝刺能量上限與顏色 (新增中文註解)
        playerState.maxDashEnergy = 100;
        playerState.dashEnergyColor = 0x00ffff;

        // 清理 Debuff UI 標題 (新增中文註解)
        if (titleTween) titleTween.stop();
        demonTitle.destroy();
        demonSub.destroy();
        demonDebuffTimer = null;
    });
}

/**
 * 發動「超究極華麗灰色中分頭爆炸」絕招 (新增中文註解：以最短路徑直線移動到中心點空中鎖定蓄力2秒，全螢幕超華麗灰色同心光環與魔法陣核爆，無視盾牌防禦)
 */
export function triggerCenterPartExplosion(scene) {
    if (!refs.noGG || !refs.noGG.active || !noGGState.isPhase2 || noGGState.isQuizActive) return;

    noGGState.isExploding = true;
    stopCXKAnimation(); // 暫停常規換圖與衝刺 (新增中文註解)

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const targetCenterX = width / 2;
    const targetCenterY = height / 2 - 40;

    // 更換為中分頭爆炸專屬圖片並放大兩倍 (新增中文註解)
    refs.noGG.setTexture('cxk_explode');
    if (refs.loli) {
        refs.noGG.setDisplaySize(refs.loli.displayWidth * 2.7, refs.loli.displayHeight * 2.7);
    }
    if (refs.noGG.body) {
        refs.noGG.body.setSize(refs.noGG.width, refs.noGG.height, true);
    }

    // 1. 蓄力預警：頂部預警橫幅與左右下角安全區立即亮起 (新增中文註解)
    const warningText = scene.add.text(width / 2, 70, "⚠️ 中分頭爆炸蓄力中！立即躲入左右下角安全區！⚠️", {
        fontSize: '26px',
        fill: '#ff3333',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
        shadow: { color: '#ff0000', fill: true, blur: 15 }
    }).setOrigin(0.5).setDepth(1500);

    scene.tweens.add({
        targets: warningText,
        scale: 1.1,
        alpha: 0.6,
        duration: 250,
        yoyo: true,
        repeat: -1
    });

    // 繪製左右下角安全區高亮 (新增中文註解)
    const safeZoneGfx = scene.add.graphics().setDepth(500);
    const drawSafeZones = (alpha = 0.5) => {
        safeZoneGfx.clear();
        // 左下角安全區 (寬170, 高200) (新增中文註解)
        safeZoneGfx.fillStyle(0x00ff88, alpha * 0.25);
        safeZoneGfx.fillRoundedRect(0, height - 200, 170, 200, 16);
        safeZoneGfx.lineStyle(3, 0x00ff88, alpha);
        safeZoneGfx.strokeRoundedRect(0, height - 200, 170, 200, 16);

        // 右下角安全區 (寬170, 高200) (新增中文註解)
        safeZoneGfx.fillStyle(0x00ff88, alpha * 0.25);
        safeZoneGfx.fillRoundedRect(width - 170, height - 200, 170, 200, 16);
        safeZoneGfx.lineStyle(3, 0x00ff88, alpha);
        safeZoneGfx.strokeRoundedRect(width - 170, height - 200, 170, 200, 16);
    };
    drawSafeZones(0.7);

    const safeTextL = scene.add.text(85, height - 100, "🟢 安全區", {
        fontSize: '20px', fill: '#00ff88', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(1500);

    const safeTextR = scene.add.text(width - 85, height - 100, "🟢 安全區", {
        fontSize: '20px', fill: '#00ff88', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(1500);

    // 2. 關閉重力並以最短直線路徑移動到中心點 (新增中文註解)
    if (refs.noGG.body) {
        refs.noGG.body.allowGravity = false; // 關閉重力，防止蓄力時往下掉 (新增中文註解)
    }
    refs.noGG.setVelocity(0, 0);
    const distToCenter = Phaser.Math.Distance.Between(refs.noGG.x, refs.noGG.y, targetCenterX, targetCenterY);
    const moveDuration = Math.max(250, Math.min(500, distToCenter * 0.8));

    scene.tweens.add({
        targets: refs.noGG,
        x: targetCenterX,
        y: targetCenterY,
        duration: moveDuration,
        ease: 'Linear', // 最短直線均勻路徑 (新增中文註解)
        onComplete: () => {
            if (!refs.noGG || !refs.noGG.active || !noGGState.isPhase2) {
                warningText.destroy();
                safeZoneGfx.destroy();
                safeTextL.destroy();
                safeTextR.destroy();
                return;
            }

            // 到達中心點後完全定住 (新增中文註解)
            refs.noGG.setVelocity(0, 0);
            refs.noGG.setPosition(targetCenterX, targetCenterY);
            if (refs.noGG.body) {
                refs.noGG.body.allowGravity = false;
            }

            // === 3. 超究極華麗蓄能特效 === (新增中文註解)
            scene.cameras.main.shake(2000, 0.008);

            // 旋轉銀灰科技中分魔法陣 (新增中文註解)
            const magicCircle = scene.add.graphics().setDepth(800);
            magicCircle.setPosition(targetCenterX, targetCenterY);
            
            // 繪製多同心環 (新增中文註解)
            magicCircle.lineStyle(4, 0xffffff, 0.95);
            magicCircle.strokeCircle(0, 0, 170);
            magicCircle.lineStyle(3, 0xd0d0d0, 0.85);
            magicCircle.strokeCircle(0, 0, 140);
            magicCircle.lineStyle(2, 0x888888, 0.75);
            magicCircle.strokeCircle(0, 0, 105);
            magicCircle.lineStyle(1.5, 0x555555, 0.65);
            magicCircle.strokeCircle(0, 0, 70);

            // 繪製八角星圖騰 (新增中文註解)
            magicCircle.lineStyle(2, 0xdddddd, 0.8);
            magicCircle.strokeRect(-95, -95, 190, 190);
            magicCircle.beginPath();
            const sqSize = 95;
            for (let j = 0; j < 4; j++) {
                const rad = (j * Math.PI / 2) + (Math.PI / 4);
                const sx = Math.cos(rad) * sqSize * Math.sqrt(2);
                const sy = Math.sin(rad) * sqSize * Math.sqrt(2);
                if (j === 0) magicCircle.moveTo(sx, sy);
                else magicCircle.lineTo(sx, sy);
            }
            magicCircle.closePath();
            magicCircle.strokePath();

            // 繪製 12 條能量射線 (新增中文註解)
            magicCircle.lineStyle(2, 0xffffff, 0.85);
            for (let d = 0; d < 12; d++) {
                const ang = (d * Math.PI * 2) / 12;
                const ex = Math.cos(ang) * 170;
                const ey = Math.sin(ang) * 170;
                magicCircle.lineBetween(0, 0, ex, ey);
                magicCircle.strokeCircle(ex, ey, 5);
            }

            magicCircle.setScale(0.1);
            scene.tweens.add({
                targets: magicCircle,
                angle: 720,
                scaleX: 1.8,
                scaleY: 1.8,
                duration: 2000,
                ease: 'Cubic.easeOut',
                onComplete: () => { magicCircle.destroy(); }
            });

            // 6 組向心收縮震波環 (新增中文註解)
            const chargeRings = [];
            for (let j = 0; j < 6; j++) {
                scene.time.delayedCall(j * 300, () => {
                    if (!refs.noGG || !refs.noGG.active || !noGGState.isPhase2) return;
                    const ring = scene.add.graphics().setDepth(850);
                    ring.lineStyle(3, 0xffffff, 0.9);
                    ring.strokeCircle(0, 0, 320);
                    ring.setPosition(targetCenterX, targetCenterY);
                    chargeRings.push(ring);

                    scene.tweens.add({
                        targets: ring,
                        scaleX: 0.05,
                        scaleY: 0.05,
                        alpha: 0,
                        duration: 850,
                        ease: 'Cubic.easeIn',
                        onComplete: () => { ring.destroy(); }
                    });
                });
            }

            // 200 顆能量流星光球向中心匯聚 (新增中文註解)
            const condensationBalls = [];
            const grayPalette = [0xffffff, 0xe0e0e0, 0xb0b0b0, 0x888888, 0x444444, 0xffd700];
            for (let i = 0; i < 200; i++) {
                const startX = Phaser.Math.Between(0, width);
                const startY = Phaser.Math.Between(0, height - 60);
                const ball = scene.add.graphics().setDepth(820);
                const color = grayPalette[i % grayPalette.length];
                ball.fillStyle(color, Phaser.Math.FloatBetween(0.7, 0.95));
                const r = Phaser.Math.Between(4, 11);
                ball.fillCircle(0, 0, r);
                ball.setPosition(startX, startY);
                condensationBalls.push(ball);

                scene.tweens.add({
                    targets: ball,
                    x: targetCenterX,
                    y: targetCenterY,
                    scaleX: 0.05,
                    scaleY: 0.05,
                    alpha: 0.1,
                    duration: 2000 - Phaser.Math.Between(0, 600),
                    ease: 'Sine.easeIn',
                    onComplete: () => { ball.destroy(); }
                });
            }

            // 蓄力 2.0 秒後大爆炸 (新增中文註解)
            scene.time.delayedCall(2000, () => {
                magicCircle.destroy();
                warningText.destroy();
                condensationBalls.forEach(b => { if (b && b.active) b.destroy(); });
                chargeRings.forEach(r => { if (r && r.active) r.destroy(); });

                if (!refs.noGG || !refs.noGG.active || !noGGState.isPhase2) {
                    safeZoneGfx.destroy();
                    safeTextL.destroy();
                    safeTextR.destroy();
                    return;
                }

                // 執行中心大爆炸 (新增中文註解)
                executeExplosionBurst(scene, width, height, targetCenterX, targetCenterY, safeZoneGfx, safeTextL, safeTextR);
            });
        }
    });
}

/**
 * 執行中分頭超究極大爆炸 (新增中文註解：引爆超華麗灰色特效與無視護盾致命判定)
 */
export function executeExplosionBurst(scene, width, height, cx, cy, safeZoneGfx, safeTextL, safeTextR) {
    // 1. 全螢幕灰白強光閃爍與核爆級巨大震動 (新增中文註解)
    scene.cameras.main.flash(850, 220, 220, 220);
    scene.cameras.main.shake(800, 0.05);

    // 2. 爆炸中心文字 (新增中文註解)
    const boomText = scene.add.text(cx, cy, "💥 蔡 徐 坤 · 中 分 頭 究 極 大 爆 炸 💥", {
        fontSize: '44px',
        fill: '#ffffff',
        fontStyle: 'bold',
        stroke: '#222222',
        strokeThickness: 8,
        shadow: { color: '#ffd700', fill: true, blur: 30 }
    }).setOrigin(0.5).setDepth(2000);

    scene.tweens.add({
        targets: boomText,
        scale: 1.5,
        alpha: 0,
        duration: 1100,
        ease: 'Power2',
        onComplete: () => { boomText.destroy(); }
    });

    // 3. 多重灰色同心衝擊波光環與 24 條全螢幕穿透光束 (新增中文註解)
    const explodeGfx = scene.add.graphics().setDepth(1200);
    const ringColors = [0xffffff, 0xf0f0f0, 0xd0d0d0, 0xaaaaaa, 0x888888, 0x555555, 0x333333, 0x111111];
    const maxRadius = Math.max(width, height) * 1.25;

    scene.tweens.addCounter({
        from: 10,
        to: maxRadius,
        duration: 950,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
            const currentR = tween.getValue();
            const alpha = 1 - (currentR / maxRadius);
            explodeGfx.clear();

            // 繪製 8 層灰色同心衝擊環 (新增中文註解)
            ringColors.forEach((color, idx) => {
                const r = currentR - idx * 30;
                if (r > 0) {
                    explodeGfx.lineStyle(10 - idx, color, alpha * 0.95);
                    explodeGfx.strokeCircle(cx, cy, r);
                }
            });

            // 繪製 24 條放射狀能量光束 (新增中文註解)
            explodeGfx.lineStyle(3.5, 0xffffff, alpha * 0.85);
            for (let i = 0; i < 24; i++) {
                const ang = (Math.PI * 2 / 24) * i;
                const rx1 = cx + Math.cos(ang) * (currentR * 0.15);
                const ry1 = cy + Math.sin(ang) * (currentR * 0.15);
                const rx2 = cx + Math.cos(ang) * currentR;
                const ry2 = cy + Math.sin(ang) * currentR;
                explodeGfx.lineBetween(rx1, ry1, rx2, ry2);
            }
        },
        onComplete: () => {
            explodeGfx.destroy();
        }
    });

    // 4. 灰色煙塵與碎屑爆炸粒子 (新增中文註解)
    for (let i = 0; i < 180; i++) {
        const p = scene.add.graphics().setDepth(1100);
        const pColor = ringColors[Phaser.Math.Between(0, ringColors.length - 1)];
        const pSize = Phaser.Math.Between(4, 12);
        p.fillStyle(pColor, 1);
        p.fillCircle(0, 0, pSize);
        p.x = cx;
        p.y = cy;

        const pAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const pSpeed = Phaser.Math.Between(350, 1100);
        const pDuration = Phaser.Math.Between(600, 1250);

        scene.tweens.add({
            targets: p,
            x: p.x + Math.cos(pAngle) * pSpeed,
            y: p.y + Math.sin(pAngle) * pSpeed + 180, // 受重力下墜
            alpha: 0,
            scale: 0.1,
            duration: pDuration,
            ease: 'Power2',
            onComplete: () => { p.destroy(); }
        });
    }

    // 5. 致命碰撞判定 (無視盾牌防禦，必須躲入左右下角安全區) (新增中文註解)
    if (refs.player && refs.player.active) {
        const px = refs.player.x;
        const py = refs.player.y;

        const inLeftSafeZone = (px <= 170 && py >= height - 200);
        const inRightSafeZone = (px >= width - 170 && py >= height - 200);

        if (!inLeftSafeZone && !inRightSafeZone) {
            // 不在安全區內：觸發死亡問答考驗 (新增中文註解)
            if (safeZoneGfx && safeZoneGfx.active) safeZoneGfx.destroy();
            if (safeTextL && safeTextL.active) safeTextL.destroy();
            if (safeTextR && safeTextR.active) safeTextR.destroy();
            triggerCXKDeathQuiz(scene);
        } else {
            // 在安全區內成功存活 (新增中文註解)
            const safeSuccess = scene.add.text(px, py - 50, "🛡️ 成功避難！", {
                fontSize: '22px', fill: '#00ff88', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(2000);
            scene.tweens.add({
                targets: safeSuccess,
                y: py - 90,
                alpha: 0,
                duration: 800,
                onComplete: () => { safeSuccess.destroy(); }
            });
        }
    }

    // 6. 結束絕招並恢復蔡徐坤狀態 (新增中文註解)
    scene.time.delayedCall(1200, () => {
        safeZoneGfx.destroy();
        safeTextL.destroy();
        safeTextR.destroy();

        if (!refs.noGG || !refs.noGG.active || !noGGState.isPhase2) return;

        noGGState.isExploding = false;
        if (refs.noGG && refs.noGG.body) {
            refs.noGG.body.allowGravity = true; // 恢復重力 (新增中文註解)
        }
        // 恢復正常尺寸
        if (refs.loli) {
            refs.noGG.setDisplaySize(refs.loli.displayWidth * 1.35, refs.loli.displayHeight * 1.35);
        }
        // 恢復四張圖片循環與衝刺 (新增中文註解)
        startCXKAnimation(scene);
        // 重新排程下一次 5~7 秒隨機技能 (新增中文註解)
        startCXKSkillScheduler(scene);
    });
}

/**
 * 觸發蔡徐坤狂暴彈跳籃球 5 秒躲避挑戰 (新增中文註解：擊敗蔡徐坤後丟出籃球，無視盾牌，玩家需生存 5 秒通關)
 */
export function triggerCXKBasketballDodge(scene, onComplete, onFail) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const startX = (refs.noGG && refs.noGG.active) ? refs.noGG.x : width / 2;
    const startY = (refs.noGG && refs.noGG.active) ? refs.noGG.y : height / 2;

    // 建立狂暴彈跳籃球物理精靈 (新增中文註解)
    const basketball = scene.physics.add.sprite(startX, startY, 'basketball');
    basketball.setDisplaySize(80, 80);
    basketball.setDepth(2000);
    basketball.setCollideWorldBounds(true);
    basketball.body.onWorldBounds = true; // 啟用邊界碰撞事件 (新增中文註解)
    basketball.setBounce(1, 1); // 完美彈性碰撞 (新增中文註解)
    activeBasketballs.push(basketball);

    // 每次投擲完全隨機 360 度初始方向 (新增中文註解)
    const initAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const ballSpeed = 1900; // 球速 1900 (新增中文註解)
    basketball.setVelocity(Math.cos(initAngle) * ballSpeed, Math.sin(initAngle) * ballSpeed);

    // 撞牆隨機偏差 (新增中文註解)
    if (basketballWorldBoundsHandler && scene.physics && scene.physics.world) {
        scene.physics.world.off('worldbounds', basketballWorldBoundsHandler);
    }
    basketballWorldBoundsHandler = (body) => {
        if (body && body.gameObject === basketball && basketball.active) {
            const currentVx = basketball.body.velocity.x;
            const currentVy = basketball.body.velocity.y;
            let currentAngle = Math.atan2(currentVy, currentVx);
            const angleDeviation = Phaser.Math.FloatBetween(0.35, 0.78) * (Math.random() < 0.5 ? 1 : -1);
            currentAngle += angleDeviation;
            basketball.setVelocity(Math.cos(currentAngle) * ballSpeed, Math.sin(currentAngle) * ballSpeed);
        }
    };
    scene.physics.world.on('worldbounds', basketballWorldBoundsHandler);

    // 籃球旋轉動畫 (新增中文註解)
    const ballSpinTween = scene.tweens.add({
        targets: basketball,
        angle: 360,
        duration: 250,
        repeat: -1
    });

    // 籃球殘影粒子 (新增中文註解)
    const trailTimer = scene.time.addEvent({
        delay: 30,
        repeat: 165,
        callback: () => {
            if (!basketball || !basketball.active) return;
            const trail = scene.add.sprite(basketball.x, basketball.y, 'basketball');
            trail.setDisplaySize(70, 70);
            trail.setAlpha(0.5);
            trail.setTint(0xffaa00);
            trail.setDepth(1990);
            activeBasketballTrails.push(trail);
            scene.tweens.add({
                targets: trail,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: 200,
                onComplete: () => { 
                    const idx = activeBasketballTrails.indexOf(trail);
                    if (idx !== -1) activeBasketballTrails.splice(idx, 1);
                    trail.destroy(); 
                }
            });
        }
    });

    // 5 秒躲避警示橫幅與倒數 (新增中文註解)
    let dodgeCountdown = 5;
    const dodgeText = scene.add.text(width / 2, 75, `🏀 瘋狂躲避狂暴籃球！剩餘 ${dodgeCountdown} 秒 🏀`, {
        fontSize: '30px',
        fill: '#ffaa00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { color: '#ff6600', fill: true, blur: 15 }
    }).setOrigin(0.5).setDepth(2500);

    const dodgeSub = scene.add.text(width / 2, 115, "⚠️ 籃球無視盾牌！被擊中直接當機，無法復活！⚠️", {
        fontSize: '18px',
        fill: '#ff3333',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(2500);

    const countdownTimer = scene.time.addEvent({
        delay: 1000,
        repeat: 4,
        callback: () => {
            dodgeCountdown--;
            if (dodgeText && dodgeText.active) {
                dodgeText.setText(`🏀 瘋狂躲避狂暴籃球！剩餘 ${dodgeCountdown} 秒 🏀`);
            }
        }
    });

    // 籃球致命碰撞偵測 (無視盾牌) (新增中文註解)
    let hasHitPlayer = false;
    const ballCollider = scene.physics.add.overlap(refs.player, basketball, () => {
        if (hasHitPlayer) return;
        hasHitPlayer = true;

        if (ballCollider) scene.physics.world.removeCollider(ballCollider);
        if (ballSpinTween) ballSpinTween.stop();
        if (trailTimer) trailTimer.remove();
        if (countdownTimer) countdownTimer.remove();
        dodgeText.destroy();
        dodgeSub.destroy();
        cleanupAllBasketballs(scene);

        if (onFail) onFail();
    });

    // 5 秒成功躲避結束流程 (新增中文註解)
    scene.time.delayedCall(5000, () => {
        if (hasHitPlayer) return;

        if (ballCollider) scene.physics.world.removeCollider(ballCollider);
        if (ballSpinTween) ballSpinTween.stop();
        if (trailTimer) trailTimer.remove();
        if (countdownTimer) countdownTimer.remove();
        if (dodgeText && dodgeText.active) dodgeText.destroy();
        if (dodgeSub && dodgeSub.active) dodgeSub.destroy();
        cleanupAllBasketballs(scene);

        if (onComplete) onComplete();
    });
}
