// === 哆啦噩夢狀態機與 AI 邏輯模組 ===
// 負責哆啦噩夢的血量、領域展開技能（減慢玩家與子彈速度）、受傷/死亡處理與逃跑 AI 邏輯
// 攻擊邏輯已分離至 DoraAttacks.js 模組
import { startDoraAttacks, stopDoraAttacks, triggerCloneAttack, spawnTrueDomainInitialClones } from './DoraAttacks.js';

// 哆啦噩夢的狀態資料
export const doraState = {
    hp: 400,              // 哆啦噩夢血量 (降為 400 以降低難度)
    maxHp: 400,
    isDomainExpanded: false, // 是否已經領域展開
    domainCircle: null,   // 領域展開圓形特效
    domainOverlay: null,  // 全螢幕藍色渲染覆蓋層
    sniperTimer: null,    // 招式排程定時器 (由 DoraAttacks 管理)
    isTeleporting: false, // 是否正在進行瞬移攻擊
    isTrueDomainExpanded: false,      // 是否已經啟動真領域展開
    isTrueDomainTransitioning: false, // 是否正在執行真領域展開過場動畫
    trueDomainOverlay: null,          // 真領域展開的深藍/紫色覆蓋層
    trueDomainBg: null,               // 真領域展開的背景圖片
    clones: [],                       // 儲存分身的陣列
    activeSniperCount: 0              // 當前正在使用狙擊的哆啦噩夢人數 (主體 + 分身)
};

// 共享的遊戲物件參考
let refs = {};

/**
 * 初始化狀態機所需的遊戲物件參考
 */
export function initDoraStateRefs(gameRefs) {
    refs = gameRefs;
}

// ========================================
// 領域展開
// ========================================

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

// ========================================
// 受傷與死亡處理
// ========================================

/**
 * 處理哆啦噩夢受到的傷害
 */
export function handleDoraHit(scene, bullet, force, stunTime, damage, originX, originY) {
    if (!refs.dora || !refs.dora.active) {
        if (bullet) bullet.destroy();
        return;
    }

    // 真領域展開過場動畫中，Boss 處於無敵狀態，不受任何傷害
    if (doraState.isTrueDomainTransitioning) {
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
        // 當血量降至 125 以下且尚未啟動真領域展開時，觸發真領域展開過場
        if (doraState.hp <= 125 && !doraState.isTrueDomainExpanded && !doraState.isTrueDomainTransitioning) {
            startTrueDomainExpansion(scene);
        }

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

    // 停止所有攻擊排程
    stopDoraAttacks();

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

// ========================================
// 重生與清理
// ========================================

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

    // 啟動攻擊排程器 (由 DoraAttacks 模組管理)
    startDoraAttacks(scene);
}

/**
 * 清理領域展開狀態與視覺覆蓋層
 */
export function cleanupDora(scene) {
    doraState.isDomainExpanded = false;
    scene.isDoraDomainActive = false;
    doraState.isTeleporting = false; // 重設瞬移狀態
    doraState.isTrueDomainTransitioning = false; // 重設過場動畫狀態

    // 停止所有攻擊排程
    stopDoraAttacks();

    // 銷毀所有分身及其定時器，並播放消散特效
    if (doraState.clones && doraState.clones.length > 0) {
        doraState.clones.forEach(clone => {
            if (clone.timer) clone.timer.destroy();
            
            // 播放消散特效，讓分身消失時更為自然
            const puff = scene.add.circle(clone.x, clone.y, 0, 0x00aaff, 0.6);
            puff.setDepth(9999);
            scene.tweens.add({
                targets: puff,
                radius: 50,
                alpha: 0,
                duration: 200,
                onComplete: () => { puff.destroy(); }
            });

            clone.destroy();
        });
    }
    doraState.clones = [];
    doraState.activeSniperCount = 0;

    // 隱藏分身的血量 UI 文字
    if (refs.clone1HPText) refs.clone1HPText.setVisible(false);
    if (refs.clone2HPText) refs.clone2HPText.setVisible(false);

    if (doraState.domainCircle) {
        doraState.domainCircle.destroy();
        doraState.domainCircle = null;
    }
    if (doraState.domainOverlay) {
        doraState.domainOverlay.destroy();
        doraState.domainOverlay = null;
    }
    // 清理真領域展開的覆蓋層與背景
    if (doraState.trueDomainOverlay) {
        doraState.trueDomainOverlay.destroy();
        doraState.trueDomainOverlay = null;
    }
    if (doraState.trueDomainBg) {
        doraState.trueDomainBg.destroy();
        doraState.trueDomainBg = null;
    }
    // 重置真領域狀態 (下次重生可再觸發)
    doraState.isTrueDomainExpanded = false;
}

// ========================================
// AI 移動決策 (每幀更新)
// ========================================

/**
 * 每幀更新哆啦噩夢的 AI 移動決策
 */
export function updateDoraStateMachine(scene, time, delta) {
    if (!refs.dora || !refs.dora.active) return;

    const player = refs.player;
    const dora = refs.dora;

    // 如果正在執行真領域展開過場動畫，停止所有 AI (包含玩家和 Boss)
    if (doraState.isTrueDomainTransitioning) {
        dora.setVelocityX(0);
        return;
    }

    // 如果正在進行瞬移藍球引導，停止常規的移動 AI，使其站在原地蓄力投擲
    if (doraState.isTeleporting) {
        dora.setVelocityX(0);
    } else {
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

    // 更新分身的 AI 移動與跳躍 (與本體邏輯一致，避開玩家)
    if (doraState.clones && doraState.clones.length > 0) {
        doraState.clones.forEach(clone => {
            if (clone.active && clone.body) {
                const moveSpeed = 160;
                if (player.x < clone.x) {
                    clone.setVelocityX(moveSpeed);
                    clone.setFlipX(false);
                } else {
                    clone.setVelocityX(-moveSpeed);
                    clone.setFlipX(true);
                }

                if (clone.body.bottom <= player.body.bottom && clone.body.touching.down) {
                    clone.setVelocityY(-825);
                }
            }
        });
    }
}

// ========================================
// 真領域展開 (血量≤ 125 時觸發)
// ========================================

/**
 * 真領域展開過場動畫：
 * 1. 暂停所有攻擊與玩家移動
 * 2. 原領域崩壞破碎效果
 * 3. 覆蓋更深的藍色渲染
 * 4. 替換背景圖片
 * 5. 恢復遊戲
 */
function startTrueDomainExpansion(scene) {
    if (doraState.isTrueDomainTransitioning || doraState.isTrueDomainExpanded) return;
    doraState.isTrueDomainTransitioning = true;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const player = refs.player;
    const dora = refs.dora;

    // === 階段 0: 凍結玩家與 Boss 的移動 ===
    // 停止攻擊排程
    stopDoraAttacks();

    // 立即清除畫面上所有正在進行的攻擊物件（狙擊虛線、火箭、太陽球、驚嘆號等）
    scene.children.list.slice().forEach(child => {
        if (child.name === 'warning' || child.name === 'warningLine') {
            child.destroy();
        }
        if (child.type === 'Text' && child.text === '!') {
            child.destroy();
        }
    });
    // 凍結玩家 (將速度歸零並禁用物理運動)
    if (player && player.body) {
        player.setVelocity(0, 0);
        player.body.moves = false; // 禁用物理引擎的移動更新
    }
    // 凍結 Boss
    if (dora && dora.body) {
        dora.setVelocity(0, 0);
        dora.body.moves = false;
    }

    // === 階段 1: 原領域崩壞破碎效果 (0 ~ 1500ms) ===
    // 讓原本的藍色覆蓋層開始閃爍抖動
    if (doraState.domainOverlay) {
        scene.tweens.add({
            targets: doraState.domainOverlay,
            alpha: { from: 0.2, to: 0.05 },
            duration: 150,
            yoyo: true,
            repeat: 4, // 閃爍 5 次
            ease: 'Sine.easeInOut'
        });
    }

    // 生成破碎碎片效果：從螢幕中心飛散出多個藍色碎片
    const numShards = 20; // 碎片數量
    for (let i = 0; i < numShards; i++) {
        // 隨機大小的三角形/矩形碎片
        const shardW = Phaser.Math.Between(15, 50);
        const shardH = Phaser.Math.Between(10, 35);
        const shard = scene.add.rectangle(
            Phaser.Math.Between(50, width - 50),
            Phaser.Math.Between(50, height - 50),
            shardW, shardH, 0x00aaff, 0.6
        );
        shard.setDepth(10001);
        shard.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

        // 碎片往隨機方向飛散、旋轉並淡出
        scene.tweens.add({
            targets: shard,
            x: shard.x + Phaser.Math.Between(-200, 200),
            y: shard.y + Phaser.Math.Between(-200, 200),
            angle: Phaser.Math.Between(-360, 360),
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: Phaser.Math.Between(800, 1400),
            ease: 'Quad.easeOut',
            onComplete: () => { shard.destroy(); }
        });
    }

    // 螢幕劇烈震動代表領域崩壞
    scene.cameras.main.shake(1000, 0.02);
    // 白色閃光表示崩壞瞬間
    scene.cameras.main.flash(500, 255, 255, 255);

    // === 階段 2: 銷毀原領域覆蓋層，短暫黑屏 (1500ms 後) ===
    scene.time.delayedCall(1500, () => {
        // 銷毀原領域特效
        if (doraState.domainCircle) {
            doraState.domainCircle.destroy();
            doraState.domainCircle = null;
        }
        if (doraState.domainOverlay) {
            doraState.domainOverlay.destroy();
            doraState.domainOverlay = null;
        }

        // 瞬間黑屏過渡
        const blackScreen = scene.add.rectangle(0, 0, width, height, 0x000000, 1);
        blackScreen.setOrigin(0, 0);
        blackScreen.setScrollFactor(0);
        blackScreen.setDepth(10002);

        // === 階段 3: 在黑屏中替換背景，然後淡出黑屏 (500ms 後) ===
        scene.time.delayedCall(500, () => {
            // 加入真領域展開背景圖 (depth 設為 -10，確保在所有遊戲物件之下)
            const bg = scene.add.image(width / 2, height / 2, 'doraTrueBg');
            bg.setDisplaySize(width, height);
            bg.setDepth(-10); // 放在所有物件之下 (地板、玩家、Boss 等預設 depth 為 0)
            doraState.trueDomainBg = bg;

            // 覆蓋一層更深的紫色渲染 (透明度 0.35，主題色變為紫色 0x6600cc)
            const trueOverlay = scene.add.rectangle(0, 0, width, height, 0x6600cc, 0.35);
            trueOverlay.setOrigin(0, 0);
            trueOverlay.setScrollFactor(0);
            trueOverlay.setDepth(9998);
            doraState.trueDomainOverlay = trueOverlay;

            // 淡出黑屏，揭曉真領域
            scene.tweens.add({
                targets: blackScreen,
                alpha: 0,
                duration: 1000,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    blackScreen.destroy();

                    // === 階段 4: 解凍玩家與 Boss，恢復遊戲 ===
                    doraState.isTrueDomainExpanded = true;
                    doraState.isTrueDomainTransitioning = false;

                    // 動畫結束後，血量以 125 開始 (重新鎖定為 125 並更新 UI)
                    doraState.hp = 125;
                    if (refs.doraHPText) {
                        refs.doraHPText.setText(`哆啦噩夢血量: ${doraState.hp}`);
                    }

                    // 實體外觀變為有紫色渲染的哆啦噩夢 (0xaa55ff)
                    dora.setTint(0xaa55ff);

                    // 恢復玩家移動
                    if (player && player.body) {
                        player.body.moves = true;
                    }
                    // 恢復 Boss 移動
                    if (dora && dora.body) {
                        dora.body.moves = true;
                    }

                    // 丟出兩顆紫色的分身傳送球以製造分身 (原本的 Boss 不會消失)
                    spawnTrueDomainInitialClones(scene);

                    // 重新啟動本尊的攻擊排程
                    startDoraAttacks(scene);

                    // 總結：真領域展開完成，相機再次震動宣告
                    scene.cameras.main.shake(300, 0.01);
                    console.log("[哆啦噩夢 AI] ✨ 真領域展開完成，紫色主題啟動！");
                }
            });
        });
    });
}

/**
 * 在指定位置生成一個藍色渲染的哆啦噩夢分身
 */
export function spawnClone(scene, x, y) {
    if (!refs.dora || !refs.dora.active) return null;

    // 決定分身索引 (1 或 2，看哪個編號目前空著)
    let cloneIndex = 1;
    if (doraState.clones.some(c => c.cloneIndex === 1)) {
        cloneIndex = 2;
    }

    const clone = scene.physics.add.sprite(x, y, 'dora');
    clone.setDisplaySize(refs.dora.displayWidth, refs.dora.displayHeight);
    clone.setCollideWorldBounds(true);
    clone.setBounce(0.1);
    clone.setTint(0x00aaff); // 分身外觀只有藍色渲染
    clone.hp = 125;          // 分身擁有與本尊一樣的 125 點血量
    clone.isClone = true;    // 標記為分身
    clone.cloneIndex = cloneIndex; // 紀錄分身編號
    clone.name = 'warning';  // 設為 warning 可以在場景清理時自動銷毀

    // 顯示並更新對應分身的血量 UI 文字
    if (cloneIndex === 1 && refs.clone1HPText) {
        refs.clone1HPText.setText(`分身1血量: ${clone.hp}`);
        refs.clone1HPText.setVisible(true);
    } else if (cloneIndex === 2 && refs.clone2HPText) {
        refs.clone2HPText.setText(`分身2血量: ${clone.hp}`);
        refs.clone2HPText.setVisible(true);
    }

    // 啟用分身與地板/平台的碰撞
    if (refs.platforms) {
        scene.physics.add.collider(clone, refs.platforms);
    }

    // 啟用分身與玩家子彈的碰撞 (使用 refs 傳遞的子彈群組)
    if (refs.mgBullets) scene.physics.add.collider(clone, refs.mgBullets, (c, b) => { handleCloneHit(scene, c, b, 5); });
    if (refs.sgBullets) scene.physics.add.collider(clone, refs.sgBullets, (c, b) => { handleCloneHit(scene, c, b, 25); });
    if (refs.snBullets) scene.physics.add.collider(clone, refs.snBullets, (c, b) => { handleCloneHit(scene, c, b, 50); });

    // 啟動分身獨立的隨機招式計時器 (每 2 秒一次)
    clone.timer = scene.time.addEvent({
        delay: 2000,
        callback: () => {
            if (clone.active) {
                triggerCloneAttack(scene, clone);
            }
        },
        loop: true
    });

    doraState.clones.push(clone);
    return clone;
}

/**
 * 處理分身受傷邏輯
 */
export function handleCloneHit(scene, clone, bullet, damage) {
    if (bullet) bullet.destroy();
    if (!clone || !clone.active) return;

    clone.hp -= damage;

    // 即時更新對應分身的血量 UI 文字
    if (clone.cloneIndex === 1 && refs.clone1HPText) {
        refs.clone1HPText.setText(`分身1血量: ${Math.max(0, clone.hp)}`);
    } else if (clone.cloneIndex === 2 && refs.clone2HPText) {
        refs.clone2HPText.setText(`分身2血量: ${Math.max(0, clone.hp)}`);
    }

    // 受傷閃紅
    clone.setTint(0xff0000);
    scene.time.delayedCall(150, () => {
        if (clone.active) clone.setTint(0x00aaff); // 恢復藍色渲染
    });

    // 分身血量歸零時銷毀
    if (clone.hp <= 0) {
        // 播放精緻的藍色消散圈特效
        const puff = scene.add.circle(clone.x, clone.y, 0, 0x00aaff, 0.6);
        puff.setDepth(9999);
        scene.tweens.add({
            targets: puff,
            radius: 50,
            alpha: 0,
            duration: 200,
            onComplete: () => { puff.destroy(); }
        });

        // 隱藏對應分身的血量 UI 文字
        if (clone.cloneIndex === 1 && refs.clone1HPText) {
            refs.clone1HPText.setVisible(false);
        } else if (clone.cloneIndex === 2 && refs.clone2HPText) {
            refs.clone2HPText.setVisible(false);
        }

        // 停止分身的定時器
        if (clone.timer) {
            clone.timer.destroy();
        }

        // 從分身管理陣列中移除並銷毀 Sprite
        doraState.clones = doraState.clones.filter(c => c !== clone);
        clone.destroy();
    }
}
