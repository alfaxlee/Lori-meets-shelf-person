// === 我沒有GG / 蔡徐坤 狀態機與 AI 邏輯模組 (NoGGStateMachine.js) ===
// 負責新 Boss「我沒有GG」與第二階段「蔡徐坤」的生命週期管理（血量狀態、階段切換、受擊傷害、死亡問答、自爆/重生機制、防插入地板保護）
// 攻擊邏輯已模組化抽離至 NoGGAttacks.js，符合每個 Boss 均具備 Attacks.js 與 StateMachine.js 之規範 (新增中文註解)

import { showCXKQuizModal } from '../ui/CXKQuizModal.js';
import { showCXKEndingScreen } from '../ui/CXKEndingScreen.js';
import { playerState } from '../player/PlayerController.js';
import {
    initNoGGAttackRefs,
    startNoGGAttacks,
    stopNoGGAttacks,
    startCXKAnimation,
    stopCXKAnimation,
    startCXKSkillScheduler,
    stopCXKSkillScheduler,
    startCXKExplosionScheduler,
    stopCXKExplosionScheduler,
    triggerCXKBasketballDodge,
    cleanupAllBasketballs
} from './NoGGAttacks.js';

// 狀態資料 (新增中文註解：定義我沒有GG與蔡徐坤的血量狀態、階段標記與技能Debuff狀態)
export const noGGState = {
    hp: 100,                  // 當前血量 (第一階段 100, 第二階段 3000)
    maxHp: 100,               // 最大血量
    isPhase2: false,          // 是否進入第二階段「蔡徐坤」
    isExploding: false,       // 是否正在施放「中分頭爆炸」
    isDemonActive: false,     // 是否正在施放「我看了魔」
    isSkillInvincible: false, // 技能期間蔡徐坤是否無敵
    isDemonDebuffActive: false,// 玩家是否處於傷害砍半狀態
    isDefeatedSequenceActive: false, // 是否正在進行擊敗後籃球動作流程 (新增中文註解)
    isQuizActive: false       // 是否正在進行死亡問答考驗
};

// 共享的遊戲物件參考 (新增中文註解)
let refs = {};

// 向下相容匯出攻擊相關函式 (新增中文註解)
export {
    startNoGGAttacks,
    stopNoGGAttacks,
    startCXKAnimation,
    stopCXKAnimation,
    startCXKSkillScheduler,
    stopCXKSkillScheduler,
    startCXKExplosionScheduler,
    stopCXKExplosionScheduler,
    cleanupAllBasketballs
};

/**
 * 初始化狀態機與攻擊模組所需的遊戲物件參考 (新增中文註解)
 */
export function initNoGGStateRefs(gameRefs) {
    refs = gameRefs;
    initNoGGAttackRefs(gameRefs); // 同步初始化攻擊模組之參考 (新增中文註解)
}

/**
 * 處理死於蔡徐坤/我沒有GG時的死亡攔截問答 (新增中文註解：攔截死亡並彈出三道考驗題目)
 * @param {Phaser.Scene} scene - 遊戲場景
 */
export function triggerCXKDeathQuiz(scene) {
    if (noGGState.isQuizActive) return;
    noGGState.isQuizActive = true;

    // 彈出蔡徐坤問答考驗 (新增中文註解)
    showCXKQuizModal(
        scene,
        // 全部答對時的復活回呼 (新增中文註解：全部選第一個題目成功復活)
        () => {
            noGGState.isQuizActive = false;
            // 重新開始時間與物理 (新增中文註解)
            if (scene.scene) scene.scene.resume();
            if (scene.physics) scene.physics.resume();

            if (refs.player && refs.player.active) {
                const width = scene.cameras.main.width;
                const height = scene.cameras.main.height;
                // 重置玩家到左側安全位置 (新增中文註解)
                refs.player.setPosition(width / 4, height - 150);
                refs.player.setVelocity(0, 0);

                // 若死前處於「我看了魔」Debuff 期間，復活後繼續維持 Debuff 狀態 (上限50且為灰色) (新增中文註解)
                if (noGGState.isDemonDebuffActive) {
                    playerState.maxDashEnergy = 50;
                    playerState.dashEnergyColor = 0x888888;
                } else {
                    playerState.maxDashEnergy = 100;
                    playerState.dashEnergyColor = 0x00ffff;
                }

                // 復活時立即回滿當前上限的衝刺能量條 (新增中文註解：復活回滿能量)
                playerState.dashEnergy = playerState.maxDashEnergy;

                // 給予 1 秒無敵狀態，阻止一死再死 (新增中文註解：無敵時間調整為1秒)
                playerState.isInvincible = true;
                playerState.cannotMove = false;

                // 徹底終止任何先前在玩家身上的舊動畫 (新增中文註解)
                scene.tweens.killTweensOf(refs.player);
                refs.player.setAlpha(1.0);

                // 建立精確執行 1 秒（5次循環共1000ms）的閃爍無敵動畫，結束後自動銷毀並還原 (新增中文註解)
                scene.tweens.add({
                    targets: refs.player,
                    alpha: 0.25,
                    duration: 100,
                    yoyo: true,
                    repeat: 4, // 5 個循環共 1000ms
                    onComplete: () => {
                        playerState.isInvincible = false;
                        if (refs.player && refs.player.active) {
                            refs.player.setAlpha(1.0); // 確保閃爍結束後完全還原不透明
                        }
                    }
                });

                // 備用定時器雙重保險：1050ms 後強制清除與確保 alpha = 1.0 (新增中文註解)
                scene.time.delayedCall(1050, () => {
                    playerState.isInvincible = false;
                    scene.tweens.killTweensOf(refs.player);
                    if (refs.player && refs.player.active) {
                        refs.player.setAlpha(1.0);
                    }
                });

                // 若死於擊敗後的籃球階段，復活後重新啟動擊敗動作與狂暴籃球躲避挑戰 (新增中文註解)
                if (noGGState.hp <= 0 && noGGState.isPhase2) {
                    scene.time.delayedCall(500, () => {
                        noGGState.isDefeatedSequenceActive = false;
                        handleNoGGDeath(scene);
                    });
                } else if (refs.noGG && refs.noGG.active && noGGState.isPhase2 && !noGGState.isExploding && !noGGState.isDemonActive) {
                    if (refs.loli) {
                        refs.noGG.setDisplaySize(refs.loli.displayWidth * 1.35, refs.loli.displayHeight * 1.35);
                    }
                    if (refs.noGG.body) {
                        refs.noGG.body.allowGravity = true; // 恢復重力落回地面
                        refs.noGG.body.setSize(refs.noGG.width, refs.noGG.height, true);
                    }
                    refs.noGG.setVelocity(0, 0);
                    startCXKAnimation(scene);
                }

                // 畫面上彈出金色復活文字 (新增中文註解)
                const reviveNotice = scene.add.text(width / 2, height / 2 - 80, "✨ 唱跳Rap籃球認證！成功復活！✨", {
                    fontSize: '32px',
                    fill: '#ffd700',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 6,
                    shadow: { color: '#ffb700', fill: true, blur: 15 }
                }).setOrigin(0.5).setDepth(3000);

                scene.tweens.add({
                    targets: reviveNotice,
                    scale: 1.2,
                    alpha: 0,
                    duration: 1500,
                    ease: 'Power2',
                    onComplete: () => { reviveNotice.destroy(); }
                });
            }
        },
        // 答錯時的立即當機回呼 (新增中文註解：選錯任一題立即引發 triggerCrash)
        () => {
            noGGState.isQuizActive = false;
            if (scene.triggerCrash) {
                scene.triggerCrash(true); // 強制觸發當機藍屏
            }
        }
    );
}

/**
 * 進入第二階段「蔡徐坤」 (新增中文註解：第一階段血量歸零後變身為第二階段蔡徐坤，設定姬姬長度3000km，設為堅硬石頭剛體，啟動隨機技能排程)
 */
export function enterPhase2CXK(scene) {
    noGGState.isPhase2 = true;
    noGGState.hp = 3000;
    noGGState.maxHp = 3000;
    noGGState.isExploding = false;
    noGGState.isDemonActive = false;
    noGGState.isSkillInvincible = false;
    noGGState.isDemonDebuffActive = false;

    // 變身特效：金黃色全螢幕閃光與震動 (新增中文註解：播放變身特效)
    scene.cameras.main.flash(600, 255, 215, 0);
    scene.cameras.main.shake(400, 0.02);

    if (refs.noGGHPText) {
        refs.noGGHPText.setText(`姬姬長度：${noGGState.hp}km`);
        refs.noGGHPText.setFill('#ffd700'); // 切換為金黃色字體 (新增中文註解)
    }

    if (refs.noGG && refs.noGG.body) {
        refs.noGG.clearTint();
        // 確保碰撞箱與當前圖片貼齊 (新增中文註解)
        refs.noGG.body.setSize(refs.noGG.width, refs.noGG.height, true);
        // 設定為堅硬石頭剛體特性 (immovable)：在玩家無敵時如同石頭般擋住玩家，不會被推散 (新增中文註解)
        refs.noGG.body.setImmovable(true);
        // 變身時稍微彈跳提升氣勢 (新增中文註解)
        refs.noGG.setVelocityY(-250);
    }

    // 停止第一階段小刀攻擊 (新增中文註解：第二階段不發射小刀)
    stopNoGGAttacks();

    // 啟動蔡徐坤四張圖片循環換圖與衝刺喊話動畫 (新增中文註解)
    startCXKAnimation(scene);

    // 啟動蔡徐坤隨機技能定時排程 (新增中文註解：隨機 5~7 秒施放「中分頭爆炸」或「我看了魔」)
    startCXKSkillScheduler(scene);
}

/**
 * 處理我沒有GG / 蔡徐坤 受到的傷害 (新增中文註解：處理受擊傷害、技能無敵免疫、傷害砍半Debuff、階段判定、姬姬長度更新與受傷反饋)
 */
export function handleNoGGHit(scene, bullet, force, stunTime, damage, originX, originY) {
    // 檢查 Sprite 是否存在且處於 active 狀態 (新增中文註解)
    if (!refs.noGG || !refs.noGG.active) {
        if (bullet) bullet.destroy();
        return;
    }

    // 技能無敵期間（例如「我看了魔」6秒期間），完全免疫子彈傷害 (新增中文註解)
    if (noGGState.isSkillInvincible) {
        if (bullet) bullet.destroy();
        const immuneNotice = scene.add.text(refs.noGG.x, refs.noGG.y - 45, "🛡️ 無敵", {
            fontSize: '18px', fill: '#cccccc', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(1600);
        scene.tweens.add({
            targets: immuneNotice,
            y: refs.noGG.y - 75,
            alpha: 0,
            duration: 350,
            onComplete: () => { immuneNotice.destroy(); }
        });
        return;
    }

    // 計算實際傷害：若處於「我看了魔」Debuff 弱化期間，傷害砍半 (5->2, 25->12, 50->25) (新增中文註解)
    let actualDamage = damage;
    if (noGGState.isDemonDebuffActive) {
        if (damage === 5) actualDamage = 2;
        else if (damage === 25) actualDamage = 12;
        else if (damage === 50) actualDamage = 25;
        else actualDamage = Math.max(1, Math.floor(damage / 2));
    }

    // 計算受擊方向角度 (新增中文註解)
    const srcX = bullet ? bullet.x : (originX ?? refs.noGG.x - 1);
    const srcY = bullet ? bullet.y : (originY ?? refs.noGG.y);
    const angle = Phaser.Math.Angle.Between(srcX, srcY, refs.noGG.x, refs.noGG.y);

    // 扣除血量 (km 當作純數值扣除) (新增中文註解)
    noGGState.hp -= actualDamage;
    if (refs.noGGHPText) {
        if (noGGState.isPhase2) {
            refs.noGGHPText.setText(`姬姬長度：${noGGState.hp}km`);
        } else {
            refs.noGGHPText.setText(`我沒有GG血量: ${noGGState.hp}`);
        }
    }

    // 判斷是否死亡或進入第二階段 (新增中文註解)
    if (noGGState.hp <= 0) {
        if (!noGGState.isPhase2) {
            // 第一階段戰渣死亡，進入第二階段「蔡徐坤」 (新增中文註解)
            enterPhase2CXK(scene);
        } else {
            // 第二階段蔡徐坤死亡，觸發最終死亡流程 (新增中文註解)
            handleNoGGDeath(scene);
        }
    } else {
        // 第一階段可被擊退；第二階段為石頭剛體，受擊時僅閃紅反饋 (新增中文註解)
        if (!noGGState.isPhase2) {
            refs.noGG.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force - 100);
        }
        refs.noGG.setTint(0xff0000);
        scene.time.delayedCall(150, () => {
            if (refs.noGG && refs.noGG.active && !noGGState.isDemonActive) refs.noGG.clearTint();
        });
        scene.cameras.main.shake(100, 0.005);
    }

    if (bullet) bullet.destroy();
}

/**
 * 處理第二階段蔡徐坤最終死亡通關 (新增中文註解：播放金光、播放三張動作圖、觸發狂暴籃球挑戰、進入黑色通關推薦歌曲畫面)
 */
export function handleNoGGDeath(scene) {
    if (noGGState.isDefeatedSequenceActive) return;
    noGGState.isDefeatedSequenceActive = true;

    stopCXKAnimation();
    stopCXKSkillScheduler();
    stopNoGGAttacks();

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // 禁用蔡徐坤物理碰撞，定在空中或地面播放動作 (新增中文註解)
    if (refs.noGG && refs.noGG.body) {
        refs.noGG.body.setVelocity(0, 0);
        refs.noGG.body.allowGravity = false;
        refs.noGG.body.enable = false;
    }

    // 播放擊敗金色閃光與震動 (新增中文註解)
    scene.cameras.main.flash(500, 255, 215, 0);
    scene.cameras.main.shake(300, 0.015);

    // 1. 依序播放 3 張動作圖片（每張 1 秒 = 1000ms）(新增中文註解)
    // 第 1 張動作圖 (0 ~ 1000ms)
    refs.noGG.setTexture('cxk_death_1');
    if (refs.loli) {
        refs.noGG.setDisplaySize(refs.loli.displayWidth * 1.5, refs.loli.displayHeight * 1.5);
    }

    // 第 2 張動作圖 (1000ms ~ 2000ms) (新增中文註解)
    scene.time.delayedCall(1000, () => {
        if (!refs.noGG || !refs.noGG.active) return;
        refs.noGG.setTexture('cxk_death_2');
        if (refs.loli) {
            refs.noGG.setDisplaySize(refs.loli.displayWidth * 1.5, refs.loli.displayHeight * 1.5);
        }
    });

    // 第 3 張動作圖 (2000ms ~ 3000ms) (新增中文註解)
    scene.time.delayedCall(2000, () => {
        if (!refs.noGG || !refs.noGG.active) return;
        refs.noGG.setTexture('cxk_death_3');
        if (refs.loli) {
            refs.noGG.setDisplaySize(refs.loli.displayWidth * 1.5, refs.loli.displayHeight * 1.5);
        }
    });

    // 2. 3 秒後丟出瘋狂彈跳籃球，玩家必須瘋狂躲避 5 秒 (無視盾牌防禦) (新增中文註解)
    scene.time.delayedCall(3000, () => {
        if (!refs.noGG || !refs.noGG.active) return;

        // 隱藏蔡徐坤本體 (新增中文註解)
        refs.noGG.setVisible(false);

        // 呼叫 Attacks 模組執行 5 秒籃球躲避挑戰 (新增中文註解)
        triggerCXKBasketballDodge(
            scene,
            // 成功躲過 5 秒通關回呼 (新增中文註解)
            () => {
                cleanupNoGG(scene);
                showCXKEndingScreen(scene);
            },
            // 失敗被打到回呼 (新增中文註解)
            () => {
                if (scene.triggerCrash) {
                    scene.triggerCrash(true); // 無法復活直接當機
                }
            }
        );
    });
}

/**
 * 重生我沒有GG (新增中文註解：重置回第一階段戰渣狀態、血量100、開啟地心引力、啟動攻擊排程)
 */
export function respawnNoGG(scene) {
    noGGState.isPhase2 = false;
    noGGState.isExploding = false;
    noGGState.isQuizActive = false;
    noGGState.hp = 100;
    noGGState.maxHp = 100;

    stopCXKAnimation();
    stopCXKExplosionScheduler();

    if (refs.noGG) {
        refs.noGG.setTexture('noGG'); // 還原為第一階段貼圖 (新增中文註解)
        if (refs.loli) {
            refs.noGG.setDisplaySize(refs.loli.displayWidth, refs.loli.displayHeight);
        }
    }

    if (refs.noGG && refs.noGG.body) {
        refs.noGG.body.setSize(refs.noGG.width, refs.noGG.height, true);
        refs.noGG.body.setOffset(0, 0);
        refs.noGG.body.allowGravity = true; // 開啟地心引力判定，使其受重力影響會往下墜落 (新增中文註解)
        refs.noGG.body.setImmovable(false); // 第一階段設為可移動擊退 (新增中文註解)
        
        // 設定水平阻力，使被擊退後能在地面滑動後停下 (新增中文註解)
        refs.noGG.setDrag(400, 0);
    }

    if (refs.noGGHPText) {
        refs.noGGHPText.setText(`我沒有GG血量: ${noGGState.hp}`);
        refs.noGGHPText.setFill('#ff00ff'); // 第一階段桃紅色字體 (新增中文註解)
    }
    
    // 重新啟用精靈並定位在畫面中央偏高處 (height - 350)，開局/重生時會自然受地心引力往下墜落落在地板上 (新增中文註解)
    refs.noGG.setActive(true).setVisible(true).body.enable = true;
    refs.noGG.setPosition(scene.cameras.main.width / 2, scene.cameras.main.height - 350);
    refs.noGG.setVelocity(0, 0);
    refs.noGG.clearTint();

    // 啟動迪克小刀攻擊排程 (新增中文註解：啟動攻擊排程)
    startNoGGAttacks(scene);
}

/**
 * 每幀更新邏輯 (新增中文註解：嚴格防止插入地板)
 */
export function updateNoGGStateMachine(scene, time, delta) {
    if (!refs.noGG || !refs.noGG.active) return;

    // 爆炸蓄力與施放期間或問答中不強制貼地 (新增中文註解)
    if (noGGState.isExploding || noGGState.isQuizActive) return;

    const groundTop = scene.cameras.main.height - 70;
    const halfHeight = refs.noGG.displayHeight / 2;

    // 防止插入地板保護：每幀嚴格限制底部不得穿透地板 (新增中文註解)
    if (refs.noGG.y + halfHeight > groundTop) {
        refs.noGG.y = groundTop - halfHeight;
        if (refs.noGG.body && refs.noGG.body.velocity.y > 0) {
            refs.noGG.setVelocityY(0);
        }
    }
}

/**
 * 清理我沒有GG 狀態 (新增中文註解：清理所有計時器並重置 Debuff)
 */
export function cleanupNoGG(scene) {
    stopCXKAnimation();
    stopCXKSkillScheduler();
    stopNoGGAttacks();
    noGGState.isQuizActive = false;
    noGGState.isExploding = false;
    noGGState.isDemonActive = false;
    noGGState.isSkillInvincible = false;
    noGGState.isDemonDebuffActive = false;

    // 還原玩家衝刺能量上限與顏色 (新增中文註解)
    playerState.maxDashEnergy = 100;
    playerState.dashEnergyColor = 0x00ffff;

    if (refs.noGG) {
        refs.noGG.clearTint();
    }
    if (refs.dickKnives) {
        refs.dickKnives.clear(true, true);
    }
    // 清除所有可能殘留的籃球與殘影 (新增中文註解)
    cleanupAllBasketballs(scene);
}
