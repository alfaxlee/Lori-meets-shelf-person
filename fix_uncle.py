import sys

file_path = "d:/Gemini-Cli/curseforge/boss/UncleAttacks.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# find the start of spawnExplosionSpikes
# The file was corrupted around spawnExplosionSpikes or just after updateEvent.remove() in superSpikeBallAttack
# Let's truncate everything after superSpikeBallAttack finishes

target_string = """            if (allDead) {
                updateEvent.remove();
            }
        }
    });
}"""

idx = content.find(target_string)
if idx == -1:
    print("Could not find the target string!")
    sys.exit(1)

# Keep everything up to and including the target_string
clean_content = content[:idx + len(target_string)]

append_code = """

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

// ============================================================
// === 三角形導彈攻擊 (過載模式專用) ===
// ============================================================

export function spawnTriangleMissileAttack(scene) {
    if (!refs.uncle || !refs.uncle.active || !uncleState.overloadLimbs) return;

    uncleState.isAttacking = true;
    refs.uncle.setVelocity(0, 0);

    // 張開雙手動畫
    const arms = uncleState.overloadLimbs;
    scene.tweens.killTweensOf(arms.armL_Group);
    scene.tweens.killTweensOf(arms.armR_Group);
    
    scene.tweens.add({
        targets: arms.armL_Group,
        angle: -90, // 左手張開
        duration: 300,
        ease: 'Cubic.easeOut'
    });
    
    scene.tweens.add({
        targets: arms.armR_Group,
        angle: 90, // 右手張開
        duration: 300,
        ease: 'Cubic.easeOut'
    });

    // 隱藏身上的三角形 Graphics
    if (uncleState.spikeGraphics) {
        uncleState.spikeGraphics.forEach(gfx => gfx.setVisible(false));
    }

    const missiles = [];
    const targetX = refs.player ? refs.player.x : refs.uncle.x;
    const targetY = refs.player ? refs.player.y : refs.uncle.y;

    // 取得當前大叔與雙臂的世界轉換矩陣
    const bodyMatrix = uncleState.overloadContainer.getWorldTransformMatrix();
    const armLMatrix = uncleState.overloadLimbs.armL_Group.getWorldTransformMatrix();
    const armRMatrix = uncleState.overloadLimbs.armR_Group.getWorldTransformMatrix();

    // 根據記錄的形狀發射導彈
    if (uncleState.spikeDefs) {
        uncleState.spikeDefs.forEach(def => {
            let matrix;
            if (def.group === 'body') matrix = bodyMatrix;
            else if (def.group === 'armL') matrix = armLMatrix;
            else if (def.group === 'armR') matrix = armRMatrix;
            
            // 計算三角形中心點
            const p = def.p;
            const cx = (p[0] + p[2] + p[4]) / 3;
            const cy = (p[1] + p[3] + p[5]) / 3;
            
            // 轉換至世界座標
            const worldPos = matrix.transformPoint(cx, cy);

            // 將頂點轉換為相對於中心點的座標
            const relPoints = [
                { x: p[0] - cx, y: p[1] - cy },
                { x: p[2] - cx, y: p[3] - cy },
                { x: p[4] - cx, y: p[5] - cy }
            ];

            const poly = scene.add.polygon(worldPos.x, worldPos.y, relPoints, def.color);
            poly.rotation = matrix.rotation;
            
            scene.physics.add.existing(poly);
            poly.body.allowGravity = false;
            
            // 設定物理碰撞箱為小圓形，並與玩家進行碰撞偵測
            poly.body.setCircle(10, -10, -10); // 簡單調整 offset
            scene.physics.add.overlap(refs.player, poly, () => {
                if (scene.triggerCrash) scene.triggerCrash();
            });

            // 給予導彈專屬速度屬性，供後續追蹤更新使用
            poly.speed = Phaser.Math.Between(400, 600);
            const angle = Phaser.Math.Angle.Between(worldPos.x, worldPos.y, targetX, targetY);
            poly.body.setVelocity(Math.cos(angle) * poly.speed, Math.sin(angle) * poly.speed);
            
            // 給予些微旋轉讓導彈更有動態感
            poly.spinSpeed = Phaser.Math.Between(-15, 15) * 0.02;

            missiles.push(poly);
        });
    }

    // 更新導彈旋轉與追蹤玩家
    const updateMissiles = () => {
        const px = refs.player ? refs.player.x : refs.uncle.x;
        const py = refs.player ? refs.player.y : refs.uncle.y;
        missiles.forEach(m => {
            if (m && m.active) {
                m.rotation += m.spinSpeed;
                // 持續更新速度方向以追蹤玩家
                const angle = Phaser.Math.Angle.Between(m.x, m.y, px, py);
                m.body.setVelocity(Math.cos(angle) * m.speed, Math.sin(angle) * m.speed);
            }
        });
    };
    scene.events.on('update', updateMissiles);

    // 飛行 1.5 秒後消失，然後從身體中央長回來
    scene.time.delayedCall(1500, () => {
        scene.events.off('update', updateMissiles);
        missiles.forEach(m => {
            if (m && m.active) m.destroy();
        });
        
        growBackSpikes(scene);
    });
}

function growBackSpikes(scene) {
    if (!refs.uncle || !refs.uncle.active || !uncleState.overloadLimbs) {
        // 大叔可能已經死亡，提早結束
        endAttack(scene);
        return;
    }

    const growPolys = [];
    const bodyMatrix = uncleState.overloadContainer.getWorldTransformMatrix();
    const armLMatrix = uncleState.overloadLimbs.armL_Group.getWorldTransformMatrix();
    const armRMatrix = uncleState.overloadLimbs.armR_Group.getWorldTransformMatrix();
    
    // 大叔身體中央
    const centerX = refs.uncle.x;
    const centerY = refs.uncle.y;

    if (uncleState.spikeDefs) {
        uncleState.spikeDefs.forEach(def => {
            let matrix;
            if (def.group === 'body') matrix = bodyMatrix;
            else if (def.group === 'armL') matrix = armLMatrix;
            else if (def.group === 'armR') matrix = armRMatrix;
            
            const p = def.p;
            const cx = (p[0] + p[2] + p[4]) / 3;
            const cy = (p[1] + p[3] + p[5]) / 3;
            
            // 目標長回的位置（世界座標）
            const targetWorldPos = matrix.transformPoint(cx, cy);

            const relPoints = [
                { x: p[0] - cx, y: p[1] - cy },
                { x: p[2] - cx, y: p[3] - cy },
                { x: p[4] - cx, y: p[5] - cy }
            ];

            const poly = scene.add.polygon(centerX, centerY, relPoints, def.color);
            poly.setScale(0); // 初始大小為 0
            poly.rotation = matrix.rotation;
            
            growPolys.push({ poly, targetX: targetWorldPos.x, targetY: targetWorldPos.y });
        });
    }

    // 恢復雙臂擺動動畫
    const arms = uncleState.overloadLimbs;
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

    // 0.1 秒內從中央移動到目標位置，並放大到原始大小
    scene.tweens.add({
        targets: { t: 0 },
        t: 1,
        duration: 100, // 0.1 秒長回來
        onUpdate: (tween, target) => {
            const t = target.t;
            growPolys.forEach(g => {
                if (g.poly && g.poly.active) {
                    g.poly.x = Phaser.Math.Linear(centerX, g.targetX, t);
                    g.poly.y = Phaser.Math.Linear(centerY, g.targetY, t);
                    g.poly.setScale(t);
                }
            });
        },
        onComplete: () => {
            growPolys.forEach(g => {
                if (g.poly && g.poly.active) g.poly.destroy();
            });
            
            // 恢復原本繪製的 Graphics 顯示
            if (uncleState.spikeGraphics) {
                uncleState.spikeGraphics.forEach(gfx => gfx.setVisible(true));
            }
            
            endAttack(scene);
        }
    });
}
"""

final_content = clean_content + append_code

with open(file_path, "w", encoding="utf-8") as f:
    f.write(final_content)

print("Fix applied successfully.")
