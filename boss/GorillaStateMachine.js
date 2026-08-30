// === 大猩猩（無敵大猩猩）狀態機模組 ===
// 負責大猩猩的血量、狀態管理與受傷判定
// 目前設定：
// 一階段血量 200，攻擊模式為瘋狂跳躍與落地震波
// 二階段血量 888，過場動畫依序播放：大猩猩先到位 → 黑方塊圍繞、手臂從兩側飛入、到位後爆發黑色高壓電流、等電流完全顯現後才開始攻擊；二階段攻擊模式為超大範圍雙手協同組合技（一隻手重拍地面 + 另一隻手瞄準發射毀滅光束，反應時間 0.7 秒，攻擊間隔極短緊湊，攻擊區域覆蓋全螢幕且可直達最邊緣角落防止老六卡角，空間太小塞不下玩家判定立刻壓死，開盾撞擊時確保絕不將玩家壓入地板穿模）；每重複五次攻擊後，會進入 3 秒大猩猩懸浮空中、所有黑色方塊與電流全部消失的破防虛弱時間（玩家可趁機全力輸出攻擊扣血），3秒結束後環繞方塊立刻回來，雙手從兩邊飛入，隨後爆發黑色高壓電流，等電流完全顯現後才恢復攻擊繼續戰鬥！
// 第三階段（二階段血量歸零後觸發）：血量變為 ？？？，大猩猩移至中央開啟「狂暴無差別攻擊模式」—— 形成電流圓圈並四散 5 道旋轉死光電流，無規律左右旋轉，無視盾牌（碰到直接死亡），玩家需跟隨空隙左右走位閃避持續 10 秒；10 秒結束後爆發全螢幕華麗雷電大爆炸，玩家只要此時開盾即可存活，大猩猩隨之徹底毀滅死亡！ (新增中文註解)

import { startGorillaAttacks, stopGorillaAttacks, isGorillaJumping, startPhase2HandSlamAttacks, startFinalOverloadAttack, stopFinalOverloadAttack } from './GorillaAttacks.js';
import { playerState } from '../player/PlayerController.js';

export const gorillaState = {
    hp: 200,                   // 當前血量 (一階 200, 二階 888, 三階 ？？？) (新增中文註解)
    maxHp: 200,                // 最大血量
    isPhase2: false,           // 是否處於第二階段 (新增中文註解)
    isFinalPhase: false,       // 是否處於第三階段狂暴無差別攻擊模式 (新增中文註解)
    isTransforming: false,     // 是否處於變身過場動畫中 (新增中文註解)
    isInvincible: false,       // 是否處於無敵狀態
    isAttacking: false,        // 當前是否處於攻擊狀態
    attackCycleCount: 0,       // 二階段攻擊次數累計 (重複 5 次後進入 3 秒破防虛弱期) (新增中文註解)
    isVulnerable: false,       // 是否處於 3 秒所有黑方塊消失的虛弱期 (新增中文註解)
    isLightningActive: false,  // 黑色高壓電流是否已啟動（手臂飛入到位後才顯現） (新增中文註解)
    leftArm: null,             // 由黑方塊組成的三段式左手臂 Graphics (新增中文註解)
    rightArm: null,            // 由黑方塊組成的三段式右手臂 Graphics (新增中文註解)
    lightningGfx: null,        // 全方位狂暴黑色高壓電流 Graphics (新增中文註解)
    orbitingBlocks: [],        // 環繞大猩猩的黑方塊陣列 (新增中文註解)
    orbitAngle: 0,             // 環繞旋轉角度 (新增中文註解)
    jointSwayTime: 0,          // 關節自然微動計時 (新增中文註解)
    armJointNodes: null,       // 兩隻手臂各段的世界座標節點，用於精準碰撞檢測 (新增中文註解)
    slamState: {               // 二階段單手向下重砸拍地狀態 (新增中文註解)
        active: false,
        hand: 'left',          // 'left' or 'right'
        targetX: 0,            // 拍擊地面目標 X 座標 (支援螢幕正中間、兩側及最邊緣角落 0~width) (新增中文註解)
        warnLeft: 0,           // 拍地危險區左邊界 (新增中文註解)
        warnRight: 0,          // 拍地危險區右邊界 (新增中文註解)
        phase: 'idle',         // 'telegraph', 'slamming', 'down', 'lifting'
        progress: 0,           // 補間進度 0 ~ 1
        isCrushing: false      // 是否處於壓死判定狀態 (新增中文註解)
    },
    laserState: {              // 二階段另一隻手發射毀滅光束狀態 (新增中文註解)
        active: false,
        hand: 'right',         // 'left' or 'right'
        targetX: 0,            // 光束瞄準地面目標 X (支援最邊緣 0~width) (新增中文註解)
        targetY: 0,            // 光束瞄準地面目標 Y (新增中文註解)
        phase: 'idle',         // 'aiming', 'firing' (新增中文註解)
        isFiring: false        // 是否正在射擊 (新增中文註解)
    }
};

// 共享的遊戲物件參考 (新增中文註解)
let refs = {};

/**
 * 初始化狀態機所需的遊戲物件參考 (新增中文註解)
 */
export function initGorillaStateRefs(gameRefs) {
    refs = gameRefs;
}

/**
 * 計算點到線段的最短距離 (新增中文註解：用於手臂黑方塊骨骼的精準碰撞檢測)
 */
function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return Phaser.Math.Distance.Between(px, py, projX, projY);
}

/**
 * 計算點在線段上的最近投影點 (新增中文註解：用於開盾撞擊石頭剛體的推開反彈計算)
 */
function closestPointOnSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return { x: x1, y: y1 };
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
    };
}

/**
 * 建立黑方塊吸收/消滅子彈的暗黑火花特效 (新增中文註解)
 */
function createBlockAbsorbSpark(scene, x, y) {
    const spark = scene.add.graphics();
    spark.setDepth(9995);
    spark.fillStyle(0x111111, 1);
    spark.fillRect(-10, -10, 20, 20);
    spark.lineStyle(1.5, 0x444444, 0.9);
    spark.strokeRect(-10, -10, 20, 20);
    spark.setPosition(x, y);

    scene.tweens.add({
        targets: spark,
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0,
        angle: 45,
        duration: 200,
        onComplete: () => spark.destroy()
    });
}

/**
 * 建立玩家開盾撞擊黑方塊石頭剛體的金屬/岩石火花反彈特效 (新增中文註解)
 */
function createStoneImpactSpark(scene, x, y) {
    const spark = scene.add.graphics();
    spark.setDepth(9996);
    spark.fillStyle(0xdddddd, 1);
    spark.fillRect(-8, -8, 16, 16);
    spark.lineStyle(2, 0xffffff, 1);
    spark.strokeRect(-8, -8, 16, 16);
    spark.setPosition(x, y);

    scene.tweens.add({
        targets: spark,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        angle: 60,
        duration: 180,
        onComplete: () => spark.destroy()
    });
}

/**
 * 繪製多重分叉、狂暴厚實的高壓黑色電流束 (新增中文註解：黑色核心電弧搭配深紫黑芒與暗黑粒子，超高對比、絕不消失)
 */
function drawBlackLightning(gfx, x1, y1, x2, y2, arcCount = 8, jitterAmt = 22) {
    const segments = 10;
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    const perp = angle + Math.PI / 2;

    for (let arc = 0; arc < arcCount; arc++) {
        const pts = [{ x: x1, y: y1 }];

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const jitter = (Math.random() - 0.5) * jitterAmt;
            const bx = x1 + (x2 - x1) * t + Math.cos(perp) * jitter;
            const by = y1 + (y2 - y1) * t + Math.sin(perp) * jitter;
            pts.push({ x: bx, y: by });

            // 電流隨機分叉小電弧 (新增中文註解)
            if (Math.random() < 0.45) {
                const forkLen = Phaser.Math.Between(15, 32);
                const forkAngle = angle + (Math.random() > 0.5 ? 0.9 : -0.9);
                gfx.beginPath();
                gfx.moveTo(bx, by);
                gfx.lineTo(bx + Math.cos(forkAngle) * forkLen, by + Math.sin(forkAngle) * forkLen);
                gfx.lineStyle(2.0, 0xaa00ff, 0.9);
                gfx.strokePath();
            }

            // 黑色電流暗物質能量方塊點 (新增中文註解)
            if (i % 2 === 0) {
                gfx.fillStyle(0x000000, 1.0);
                gfx.fillRect(bx - 5, by - 5, 10, 10);
                gfx.lineStyle(1.8, 0xbf00ff, 0.95);
                gfx.strokeRect(bx - 5, by - 5, 10, 10);
            }
        }

        pts.push({ x: x2, y: y2 });

        // 1. 外層暗黑高壓紫光電暈 (超亮高對比) (新增中文註解)
        gfx.beginPath();
        gfx.moveTo(pts[0].x, pts[0].y);
        for (let p = 1; p < pts.length; p++) {
            gfx.lineTo(pts[p].x, pts[p].y);
        }
        gfx.lineStyle(arc === 0 ? 8.5 : (arc === 1 ? 6.0 : 4.0), 0x9900ff, 0.85);
        gfx.strokePath();

        // 2. 內層純黑高壓電弧核心 (粗黑閃電柱) (新增中文註解)
        gfx.beginPath();
        gfx.moveTo(pts[0].x, pts[0].y);
        for (let p = 1; p < pts.length; p++) {
            gfx.lineTo(pts[p].x, pts[p].y);
        }
        gfx.lineStyle(arc === 0 ? 5.0 : (arc === 1 ? 3.5 : 2.0), 0x000000, 1.0);
        gfx.strokePath();
    }
}

/**
 * 處理大猩猩受擊與受傷判定 (新增中文註解：受到玩家武器子彈攻擊扣血與反饋)
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {Phaser.GameObjects.GameObject} bullet - 命中大猩猩的子彈
 * @param {number} force - 擊退力道
 * @param {number} upward - 向上拋力
 * @param {number} damage - 造成的傷害值
 */
export function handleGorillaHit(scene, bullet, force = 0, upward = 0, damage = 5) {
    if (!refs.gorilla || !refs.gorilla.active || gorillaState.isInvincible || gorillaState.isTransforming || gorillaState.isFinalPhase) {
        if (bullet) {
            createBlockAbsorbSpark(scene, bullet.x, bullet.y);
            bullet.destroy();
        }
        return;
    }

    // 第二模式下：若處於防禦狀態 (非 3 秒破防虛弱期)，黑方塊包圍吸收消滅所有子彈且不扣血 (新增中文註解)
    if (gorillaState.isPhase2 && !gorillaState.isVulnerable) {
        if (bullet) {
            createBlockAbsorbSpark(scene, bullet.x, bullet.y);
            bullet.destroy();
        }
        return;
    }

    // 扣除大猩猩血量 (一階段或二階段 3 秒虛弱期) (新增中文註解)
    gorillaState.hp -= damage;
    if (refs.gorillaHPText) {
        refs.gorillaHPText.setText(`大猩猩血量: ${Math.max(0, gorillaState.hp)}`);
    }

    // 受擊閃紅反饋 (新增中文註解)
    refs.gorilla.setTint(0xff5555);
    scene.time.delayedCall(120, () => {
        if (refs.gorilla && refs.gorilla.active) {
            refs.gorilla.clearTint();
        }
    });
    scene.cameras.main.shake(80, 0.004);

    // 死亡/轉階段判定 (新增中文註解)
    if (gorillaState.hp <= 0) {
        if (!gorillaState.isPhase2) {
            // 一階段血量歸零，觸發第二階段變身動畫 (新增中文註解)
            triggerGorillaPhase2(scene);
        } else if (!gorillaState.isFinalPhase) {
            // 二階段被擊敗，觸發第三階段（狂暴超載無差別攻擊模式，血量變 ？？？） (新增中文註解)
            triggerGorillaFinalPhase(scene);
        } else {
            // 真正死亡 (新增中文註解)
            handleGorillaDeath(scene);
        }
    }

    if (bullet) bullet.destroy();
}

/**
 * 觸發第二階段變身過場動畫 (新增中文註解)
 * 嚴格順序：
 * 1. 定住玩家、停止攻擊、清理舊物件
 * 2. 大猩猩單獨移動到螢幕正中央上方(Y=120)
 * 3. 大猩猩完全到位後，才啟動：
 *    - 黑色方塊從四面八方飛來圍繞大猩猩
 *    - 兩隻手臂從螢幕兩邊邊緣外平滑飛入
 *    - 手臂到位瞬間才爆發黑色高壓電流
 * 4. 等黑色電流顯現完畢（展示 0.7 秒狂暴電流）後，血量變 888，解除玩家定身，並啟動雙手協同攻擊循環
 */
export function triggerGorillaPhase2(scene) {
    if (gorillaState.isTransforming) return;
    gorillaState.isTransforming = true;
    gorillaState.isInvincible = true;

    // 1. 停止一階跳躍攻擊排程 (新增中文註解)
    stopGorillaAttacks();
    cleanupBlockArms();
    cleanupOrbitingBlocks();

    // 2. 定身凍結玩家 (新增中文註解：定身、取消重力、無敵)
    playerState.cannotMove = true;
    if (refs.player) {
        refs.player.setVelocity(0, 0);
        if (refs.player.body) {
            refs.player.body.allowGravity = false;
        }
    }

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const gorillaTargetY = 120; // 大猩猩停留在螢幕正中央的頂部上方 (新增中文註解)

    // 暗黑閃光與鏡頭微震 (新增中文註解)
    scene.cameras.main.flash(500, 20, 0, 40);
    scene.cameras.main.shake(800, 0.006);

    // 3. 先由大猩猩單獨平滑移動至螢幕正中央上方 (其他所有動畫都在到位後才開始！) (新增中文註解)
    refs.gorilla.setAngle(0);
    scene.tweens.add({
        targets: refs.gorilla,
        x: width / 2,
        y: gorillaTargetY,
        duration: 1100,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
            if (!refs.gorilla || !refs.gorilla.active) return;

            // 大猩猩完全到位！此時才爆發暗黑能量閃光與震動 (新增中文註解)
            scene.cameras.main.flash(600, 255, 30, 0);
            scene.cameras.main.shake(1000, 0.012);

            // A. 四面八方黑方塊立刻飛來圍繞大猩猩 (新增中文註解)
            createConvergingBlackBlocks(scene, width, height, width / 2, gorillaTargetY);

            // B. 兩隻手臂從螢幕兩邊飛過來，到位後爆發黑色電流，且等電流顯現後才回調 (新增中文註解)
            createChunkyBlockArmsWithFlyIn(scene, width, height, () => {
                if (!refs.gorilla || !refs.gorilla.active) return;

                gorillaState.hp = 888;
                gorillaState.maxHp = 888;
                gorillaState.isPhase2 = true;
                gorillaState.isTransforming = false;
                gorillaState.isInvincible = false;
                gorillaState.attackCycleCount = 0;
                gorillaState.isVulnerable = false;

                if (refs.gorillaHPText) {
                    refs.gorillaHPText.setText(`大猩猩血量: 888`);
                }

                // 解除玩家定身與重力恢復 (新增中文註解)
                playerState.cannotMove = false;
                if (refs.player && refs.player.body) {
                    refs.player.body.allowGravity = true;
                }

                // 爆發完成閃光 (新增中文註解)
                scene.cameras.main.flash(400, 255, 255, 255);
                scene.cameras.main.shake(400, 0.008);

                // 電流已完全顯現！啟動第二階段雙手協同攻擊循環 (新增中文註解)
                startPhase2HandSlamAttacks(scene);
            });
        }
    });
}

/**
 * 觸發第三階段（二階段血量歸零後觸發）：血量變為 ？？？，大猩猩移至中央，開啟「狂暴無差別攻擊模式」 (新增中文註解)
 */
export function triggerGorillaFinalPhase(scene) {
    if (gorillaState.isFinalPhase) return;
    gorillaState.isFinalPhase = true;
    gorillaState.isInvincible = true;
    gorillaState.isVulnerable = false;

    // 1. 停止二階段攻擊排程與計時器 (新增中文註解)
    stopGorillaAttacks();
    cleanupBlockArms();
    cleanupOrbitingBlocks();

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const centerX = width / 2;
    const centerY = height * 0.38; // 大猩猩停在螢幕半空中央 (新增中文註解)

    // 血量變成 ？？？ (新增中文註解)
    if (refs.gorillaHPText) {
        refs.gorillaHPText.setText('大猩猩血量: ？？？');
        refs.gorillaHPText.setColor('#ff0055');
    }

    // 狂暴能量紫色強烈閃光與震動 (新增中文註解)
    scene.cameras.main.flash(600, 180, 0, 255);
    scene.cameras.main.shake(800, 0.02);

    // 大猩猩移動至螢幕半空正中央 (新增中文註解)
    refs.gorilla.setAngle(0);
    scene.tweens.add({
        targets: refs.gorilla,
        x: centerX,
        y: centerY,
        duration: 800,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
            if (!refs.gorilla || !refs.gorilla.active) return;

            // 啟動狂暴無差別攻擊模式 (持續 10 秒無規律旋轉四散死光 + 華麗雷電大爆炸) (新增中文註解)
            startFinalOverloadAttack(scene, centerX, centerY);
        }
    });
}

/**
 * 建立加粗厚實的三段式黑方塊巨手，並從螢幕兩邊外側平滑飛入，到位後才爆發黑色高壓電流，且等電流顯現後才回調 (新增中文註解)
 */
export function createChunkyBlockArmsWithFlyIn(scene, width, height, onCompleteCallback = null) {
    cleanupBlockArms();

    const leftGfx = scene.add.graphics().setDepth(9988);
    const rightGfx = scene.add.graphics().setDepth(9988);
    const lightningGfx = scene.add.graphics().setDepth(9995); // 提升層級確保清晰可見 (新增中文註解)

    gorillaState.leftArm = leftGfx;
    gorillaState.rightArm = rightGfx;
    gorillaState.lightningGfx = lightningGfx;
    gorillaState.isLightningActive = false; // 飛入過程中不顯示電流 (新增中文註解)

    // 初始繪製手臂本體 (新增中文註解)
    renderChunkyArms(scene, 0);

    // 手臂從螢幕左右兩邊外側飛入 (新增中文註解)
    leftGfx.x = -width * 0.55;
    scene.tweens.add({
        targets: leftGfx,
        x: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onComplete: () => {
            // 手臂完全到位後，才啟動並爆發黑色高壓電流！ (新增中文註解)
            gorillaState.isLightningActive = true;
            scene.cameras.main.flash(250, 60, 0, 100);
            scene.cameras.main.shake(350, 0.01);

            // 等電流顯現後（展示 700ms 狂暴電流效果）才回調啟動後續攻擊 (新增中文註解)
            scene.time.delayedCall(700, () => {
                if (onCompleteCallback) onCompleteCallback();
            });
        }
    });

    rightGfx.x = width * 0.55;
    scene.tweens.add({
        targets: rightGfx,
        x: 0,
        duration: 800,
        ease: 'Cubic.easeOut'
    });
}

/**
 * 動態渲染厚實三段式手臂（支援雙手協同：一隻手下拍、另一隻手瞄準發射光束與關節微動，支援覆蓋最邊緣角落） (新增中文註解)
 */
export function renderChunkyArms(scene, swayOffset = 0) {
    if (!gorillaState.leftArm || !gorillaState.rightArm) return;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const groundTop = height - 70;
    const blockSize = 24; // 加大方塊尺寸，粗壯厚重 (新增中文註解)
    const blockGap = 4;
    const step = blockSize + blockGap;

    // 關節微動偏移 (新增中文註解)
    const elbowSwayY = Math.sin(swayOffset) * 10;
    const wristSwayY = Math.cos(swayOffset * 1.2) * 8;
    const wristSwayX = Math.sin(swayOffset * 0.8) * 6;

    // 基礎懸浮姿態節點 (新增中文註解)
    let leftElbowX = 0;
    let leftElbowY = height * 0.38 + elbowSwayY;
    let leftWristX = width * 0.20 + wristSwayX;
    let leftWristY = height * 0.52 + wristSwayY;
    let leftPalmX = width * 0.24 + wristSwayX;
    let leftPalmY = height * 0.54 + wristSwayY;

    let rightElbowX = width;
    let rightElbowY = height * 0.38 + elbowSwayY;
    let rightWristX = width * 0.80 - wristSwayX;
    let rightWristY = height * 0.52 + wristSwayY;
    let rightPalmX = width * 0.76 - wristSwayX;
    let rightPalmY = height * 0.54 + wristSwayY;

    // 1. 拍地手臂的骨骼動態插值（支援大跨度拍擊，包含直達最邊緣 x=0 或 x=width） (新增中文註解)
    const slam = gorillaState.slamState;
    if (slam && slam.active) {
        const isLeftSlam = (slam.hand === 'left');
        const p = slam.progress;
        const targetX = (slam.targetX !== undefined) ? slam.targetX : (isLeftSlam ? width * 0.35 : width * 0.65);

        if (slam.phase === 'telegraph') {
            // 蓄力抬高手臂 (新增中文註解)
            if (isLeftSlam) {
                leftElbowY = Phaser.Math.Linear(leftElbowY, height * 0.28, p);
                leftWristY = Phaser.Math.Linear(leftWristY, height * 0.38, p);
                leftPalmY = Phaser.Math.Linear(leftPalmY, height * 0.40, p);
            } else {
                rightElbowY = Phaser.Math.Linear(rightElbowY, height * 0.28, p);
                rightWristY = Phaser.Math.Linear(rightWristY, height * 0.38, p);
                rightPalmY = Phaser.Math.Linear(rightPalmY, height * 0.40, p);
            }
        } else {
            // 猛砸拍向地面：前臂與爪掌大跨度伸向 targetX，可直達螢幕最邊緣角落 (新增中文註解)
            if (isLeftSlam) {
                const targetWristX = Math.max(0, targetX - 45);
                const targetPalmX = Math.max(15, targetX);
                const targetElbowX = Math.min(width * 0.16, targetX * 0.25);

                leftElbowX = Phaser.Math.Linear(0, targetElbowX, p);
                leftElbowY = Phaser.Math.Linear(height * 0.38, height * 0.48, p);
                leftWristX = Phaser.Math.Linear(width * 0.20, targetWristX, p);
                leftWristY = Phaser.Math.Linear(height * 0.52, groundTop - 35, p);
                leftPalmX = Phaser.Math.Linear(width * 0.24, targetPalmX, p);
                leftPalmY = Phaser.Math.Linear(height * 0.54, groundTop - 25, p);
            } else {
                const targetWristX = Math.min(width, targetX + 45);
                const targetPalmX = Math.min(width - 15, targetX);
                const targetElbowX = Math.max(width * 0.84, width - (width - targetX) * 0.25);

                rightElbowX = Phaser.Math.Linear(width, targetElbowX, p);
                rightElbowY = Phaser.Math.Linear(height * 0.38, height * 0.48, p);
                rightWristX = Phaser.Math.Linear(width * 0.80, targetWristX, p);
                rightWristY = Phaser.Math.Linear(height * 0.52, groundTop - 35, p);
                rightPalmX = Phaser.Math.Linear(width * 0.76, targetPalmX, p);
                rightPalmY = Phaser.Math.Linear(height * 0.54, groundTop - 25, p);
            }
        }
    }

    // 2. 光束手臂的瞄準姿態（掌心朝向瞄準目標點 targetX, targetY） (新增中文註解)
    const laser = gorillaState.laserState;
    if (laser && laser.active) {
        const isLeftLaser = (laser.hand === 'left');
        if (isLeftLaser) {
            leftElbowY = height * 0.34;
            leftWristX = width * 0.24;
            leftWristY = height * 0.44;
            leftPalmX = width * 0.28;
            leftPalmY = height * 0.46;
        } else {
            rightElbowY = height * 0.34;
            rightWristX = width * 0.76;
            rightWristY = height * 0.44;
            rightPalmX = width * 0.72;
            rightPalmY = height * 0.46;
        }
    }

    const leftGorillaSide = { x: width / 2 - 60, y: 120 };
    const leftElbow = { x: leftElbowX, y: leftElbowY };

    const rightGorillaSide = { x: width / 2 + 60, y: 120 };
    const rightElbow = { x: rightElbowX, y: rightElbowY };

    // 上半手臂長度占比：45% 為狂暴黑色高壓電流束，後 55% 為實體黑方塊上臂 (新增中文註解)
    const electricRatio = 0.45;
    const leftShoulderBlockStart = {
        x: leftGorillaSide.x + (leftElbow.x - leftGorillaSide.x) * electricRatio,
        y: leftGorillaSide.y + (leftElbow.y - leftGorillaSide.y) * electricRatio
    };
    const rightShoulderBlockStart = {
        x: rightGorillaSide.x + (rightElbow.x - rightGorillaSide.x) * electricRatio,
        y: rightGorillaSide.y + (rightElbow.y - rightGorillaSide.y) * electricRatio
    };

    // 1. 左臂骨骼節點 (新增中文註解)
    const leftNodes = {
        gorillaSide:        leftGorillaSide,
        shoulderBlockStart: leftShoulderBlockStart,
        elbow:              leftElbow,
        wrist:              { x: leftWristX, y: leftWristY },
        palm:               { x: leftPalmX, y: leftPalmY }
    };

    // 2. 右臂骨骼節點 (新增中文註解)
    const rightNodes = {
        gorillaSide:        rightGorillaSide,
        shoulderBlockStart: rightShoulderBlockStart,
        elbow:              rightElbow,
        wrist:              { x: rightWristX, y: rightWristY },
        palm:               { x: rightPalmX, y: rightPalmY }
    };

    gorillaState.armJointNodes = { left: leftNodes, right: rightNodes };

    // 3. 繪製全方位高壓黑色電流 (手臂飛入到位後才顯示) (新增中文註解)
    if (gorillaState.lightningGfx) {
        gorillaState.lightningGfx.clear();

        if (gorillaState.isLightningActive && !gorillaState.isVulnerable && !gorillaState.isFinalPhase) {
            const leftArmOffset = gorillaState.leftArm ? gorillaState.leftArm.x : 0;
            const rightArmOffset = gorillaState.rightArm ? gorillaState.rightArm.x : 0;

            // 3.1 上半手臂 45% 長度占比的狂暴黑色高壓電流束 (新增中文註解)
            drawBlackLightning(gorillaState.lightningGfx, leftNodes.gorillaSide.x, leftNodes.gorillaSide.y, leftNodes.shoulderBlockStart.x + leftArmOffset, leftNodes.shoulderBlockStart.y, 8, 20);
            drawBlackLightning(gorillaState.lightningGfx, rightNodes.gorillaSide.x, rightNodes.gorillaSide.y, rightNodes.shoulderBlockStart.x + rightArmOffset, rightNodes.shoulderBlockStart.y, 8, 20);

            // 3.2 肘關節空格處跳躍黑色電弧 (新增中文註解)
            const leftElbowConn = { x: leftNodes.elbow.x + 18 + leftArmOffset, y: leftNodes.elbow.y + 10 };
            const rightElbowConn = { x: rightNodes.elbow.x - 18 + rightArmOffset, y: rightNodes.elbow.y + 10 };
            drawBlackLightning(gorillaState.lightningGfx, leftNodes.elbow.x + leftArmOffset, leftNodes.elbow.y, leftElbowConn.x, leftElbowConn.y, 4, 10);
            drawBlackLightning(gorillaState.lightningGfx, rightNodes.elbow.x + rightArmOffset, rightNodes.elbow.y, rightElbowConn.x, rightElbowConn.y, 4, 10);

            // 3.3 手腕關節空格處跳躍黑色電弧 (新增中文註解)
            const leftWristConn = { x: leftNodes.wrist.x + 14 + leftArmOffset, y: leftNodes.wrist.y + 4 };
            const rightWristConn = { x: rightNodes.wrist.x - 14 + rightArmOffset, y: rightNodes.wrist.y + 4 };
            drawBlackLightning(gorillaState.lightningGfx, leftNodes.wrist.x + leftArmOffset, leftNodes.wrist.y, leftWristConn.x, leftWristConn.y, 4, 10);
            drawBlackLightning(gorillaState.lightningGfx, rightNodes.wrist.x + rightArmOffset, rightNodes.wrist.y, rightWristConn.x, rightWristConn.y, 4, 10);

            // 3.4 大猩猩與環繞旋轉黑方塊之間的電流交織 (新增中文註解)
            if (gorillaState.orbitingBlocks && gorillaState.orbitingBlocks.length > 0) {
                for (let b = 0; b < 6; b++) {
                    const blockItem = gorillaState.orbitingBlocks[b * 7 % gorillaState.orbitingBlocks.length];
                    if (blockItem && blockItem.gfx && blockItem.gfx.active) {
                        drawBlackLightning(gorillaState.lightningGfx, width / 2, 120, blockItem.gfx.x, blockItem.gfx.y, 2, 8);
                    }
                }
            }
        }
    }

    // 繪製加粗 3~4 排的厚重方塊鏈條 (新增中文註解)
    const drawThickChain = (gfx, p1, p2, widthRows = 3) => {
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        const count = Math.max(1, Math.floor(dist / step));
        const angle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);
        const perp = angle + Math.PI / 2;

        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const cx = p1.x + (p2.x - p1.x) * t;
            const cy = p1.y + (p2.y - p1.y) * t;

            for (let r = 0; r < widthRows; r++) {
                const rOffset = (r - (widthRows - 1) / 2) * step;
                const bx = cx + Math.cos(perp) * rOffset;
                const by = cy + Math.sin(perp) * rOffset;

                gfx.fillStyle(0x080808, 1);
                gfx.fillRect(bx - blockSize / 2, by - blockSize / 2, blockSize, blockSize);
                gfx.lineStyle(1.5, 0x3d3d3d, 0.95);
                gfx.strokeRect(bx - blockSize / 2, by - blockSize / 2, blockSize, blockSize);
            }
        }
    };

    // 繪製單隻厚重手臂 (新增中文註解)
    const drawFullArm = (gfx, nodes, isLeft) => {
        gfx.clear();

        // 段1：上臂實體黑方塊段 (從黑色電流終點處斜向延伸至螢幕邊緣肘部，寬度 3 排) (新增中文註解)
        drawThickChain(gfx, nodes.shoulderBlockStart, nodes.elbow, 3);

        // 肘關節空格處 (從邊界肘部留出轉動空隙) (新增中文註解)
        const elbowConnect = {
            x: nodes.elbow.x + (isLeft ? 18 : -18),
            y: nodes.elbow.y + 10
        };

        // 段2：前臂 (3 排方塊加粗厚重，從邊界肘部斜向內下延伸至手腕) (新增中文註解)
        drawThickChain(gfx, elbowConnect, nodes.wrist, 3);

        // 腕關節空格處 (新增中文註解)
        const wristConnect = {
            x: nodes.wrist.x + (isLeft ? 14 : -14),
            y: nodes.wrist.y + 4
        };

        // 段3：厚重手掌底座 (4 排方塊加寬，強烈厚重感) (新增中文註解)
        drawThickChain(gfx, wristConnect, nodes.palm, 4);

        // 手指段：5 根厚實爪指 (新增中文註解)
        const isSlammingThisHand = (slam && slam.active && slam.hand === (isLeft ? 'left' : 'right') && slam.phase !== 'telegraph');
        const isLaserThisHand = (laser && laser.active && laser.hand === (isLeft ? 'left' : 'right'));
        const baseAngle = isLeft ? 0 : Math.PI;

        const fingers = [
            { angleOffset: -0.72, len: 3 },
            { angleOffset: -0.36, len: 4 },
            { angleOffset:  0.00, len: 4 },
            { angleOffset:  0.36, len: 4 },
            { angleOffset:  0.72, len: 3 }
        ];

        fingers.forEach(f => {
            let fAngle = baseAngle + f.angleOffset;
            if (isSlammingThisHand && slam.progress > 0.8) {
                fAngle = baseAngle + f.angleOffset * 0.4;
            } else if (isLaserThisHand) {
                // 光束瞄準時手指如砲口般大角度張開 (新增中文註解)
                fAngle = baseAngle + f.angleOffset * 1.15;
            }

            for (let seg = 1; seg <= f.len; seg++) {
                const fx = nodes.palm.x + Math.cos(fAngle) * (seg * step);
                let fy = nodes.palm.y + Math.sin(fAngle) * (seg * step);
                if (isSlammingThisHand && slam.progress > 0.8) {
                    fy = Math.min(groundTop - 15, fy);
                }

                gfx.fillStyle(0x050505, 1);
                gfx.fillRect(fx - blockSize / 2, fy - blockSize / 2, blockSize, blockSize);
                gfx.lineStyle(1.5, 0x444444, 0.95);
                gfx.strokeRect(fx - blockSize / 2, fy - blockSize / 2, blockSize, blockSize);
            }
        });
    };

    drawFullArm(gorillaState.leftArm, leftNodes, true);
    drawFullArm(gorillaState.rightArm, rightNodes, false);
}

/**
 * 四面八方飛來黑方塊包圍頂部大猩猩 (新增中文註解)
 */
export function createConvergingBlackBlocks(scene, width, height, gx, gy) {
    cleanupOrbitingBlocks();

    const blockCount = 45;
    const blocks = [];

    for (let i = 0; i < blockCount; i++) {
        // 從螢幕四面八方邊界外生成 (新增中文註解)
        const angle = (i / blockCount) * Math.PI * 2;
        const spawnDist = Math.max(width, height) * 0.7;
        const startX = gx + Math.cos(angle) * spawnDist;
        const startY = gy + Math.sin(angle) * spawnDist;

        const bSize = Phaser.Math.Between(14, 24);
        const blockGfx = scene.add.graphics();
        blockGfx.setDepth(9989);
        blockGfx.fillStyle(0x080808, 1);
        blockGfx.fillRect(-bSize / 2, -bSize / 2, bSize, bSize);
        blockGfx.lineStyle(1.5, 0x444444, 0.9);
        blockGfx.strokeRect(-bSize / 2, -bSize / 2, bSize, bSize);
        blockGfx.setPosition(startX, startY);

        // 飛向頂部大猩猩並聚攏在其周圍形成防護環 (新增中文註解)
        const orbitRadius = Phaser.Math.Between(75, 115);
        const targetAngle = angle;
        const delay = Phaser.Math.Between(40, 350);

        scene.tweens.add({
            targets: blockGfx,
            x: gx + Math.cos(targetAngle) * orbitRadius,
            y: gy + Math.sin(targetAngle) * orbitRadius,
            duration: 700,
            delay: delay,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                blocks.push({
                    gfx: blockGfx,
                    radius: orbitRadius,
                    baseAngle: targetAngle,
                    speed: Phaser.Math.FloatBetween(0.02, 0.045)
                });
            }
        });
    }

    gorillaState.orbitingBlocks = blocks;
}

/**
 * 處理大猩猩被擊敗 (新增中文註解：停止攻擊、清理肢體方塊、播放金光並重生大猩猩)
 */
export function handleGorillaDeath(scene) {
    if (!refs.gorilla) return;
    stopGorillaAttacks(); // 停止所有攻擊排程 (新增中文註解)
    stopFinalOverloadAttack(scene);
    cleanupBlockArms();
    cleanupOrbitingBlocks();

    refs.gorilla.setActive(false).setVisible(false);
    if (refs.gorilla.body) refs.gorilla.body.enable = false;

    scene.cameras.main.flash(800, 255, 215, 0); // 播放金色閃光

    // 1.5 秒後重新生成大猩猩 (新增中文註解)
    scene.time.delayedCall(1500, () => {
        respawnGorilla(scene);
    });
}

/**
 * 重生/重置大猩猩狀態 (新增中文註解：重置回第一階段血量 200)
 */
export function respawnGorilla(scene) {
    gorillaState.hp = 200;
    gorillaState.maxHp = 200;
    gorillaState.isPhase2 = false;
    gorillaState.isFinalPhase = false;
    gorillaState.isTransforming = false;
    gorillaState.isInvincible = false;
    gorillaState.isAttacking = false;
    gorillaState.attackCycleCount = 0;
    gorillaState.isVulnerable = false;
    gorillaState.isLightningActive = false;
    gorillaState.orbitAngle = 0;
    gorillaState.jointSwayTime = 0;
    gorillaState.armJointNodes = null;
    gorillaState.slamState.active = false;
    gorillaState.slamState.targetX = 0;
    gorillaState.slamState.warnLeft = 0;
    gorillaState.slamState.warnRight = 0;
    gorillaState.slamState.phase = 'idle';
    gorillaState.slamState.progress = 0;
    gorillaState.slamState.isCrushing = false;
    gorillaState.laserState.active = false;
    gorillaState.laserState.phase = 'idle';
    gorillaState.laserState.isFiring = false;

    stopFinalOverloadAttack(scene);
    cleanupBlockArms();
    cleanupOrbitingBlocks();

    // 確保玩家未處於定身狀態 (新增中文註解)
    playerState.cannotMove = false;
    if (refs.player && refs.player.body) {
        refs.player.body.allowGravity = true;
    }

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const groundTop = height - 70; // 地板頂部 Y 座標 (新增中文註解)

    if (refs.gorilla) {
        refs.gorilla.setActive(true).setVisible(true);
        if (refs.loli) {
            refs.gorilla.setDisplaySize(refs.loli.displayWidth * 1.25, refs.loli.displayHeight * 1.25);
        }
        const halfHeight = refs.gorilla.displayHeight / 2;
        // 設定大猩猩出生在右側地面上，底部精準貼齊地板 (新增中文註解)
        refs.gorilla.setPosition(3 * width / 4, groundTop - halfHeight);
        refs.gorilla.setAngle(0);
        
        if (refs.gorilla.body) {
            refs.gorilla.body.enable = true;
            refs.gorilla.body.allowGravity = false; // 關閉重力防止插入地板 (新增中文註解)
            refs.gorilla.body.setSize(refs.gorilla.width, refs.gorilla.height, true);
            refs.gorilla.setVelocity(0, 0);
            refs.gorilla.setImmovable(true); // 剛體固定 (新增中文註解)
        }
        refs.gorilla.clearTint();
    }

    if (refs.gorillaHPText) {
        refs.gorillaHPText.setText(`大猩猩血量: ${gorillaState.hp}`);
        refs.gorillaHPText.setColor('#ffffff');
        refs.gorillaHPText.setVisible(true);
    }

    // 啟動瘋狂跳躍攻擊 (新增中文註解)
    startGorillaAttacks(scene);
}

/**
 * 每幀更新大猩猩邏輯 (新增中文註解：二階段黑方塊手臂與防護盾實體碰撞箱檢測，拍地時空間小塞不下立刻壓死判定，防止玩家穿入地板)
 */
export function updateGorilla(scene) {
    if (!refs.gorilla || !refs.gorilla.active) return;

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const groundTop = height - 70;
    const playerHalfHeight = (refs.player && refs.player.displayHeight) ? refs.player.displayHeight / 2 : 25;
    const maxFloorY = groundTop - playerHalfHeight;

    // 若處於第三階段狂暴超載，由超載模組接管更新 (新增中文註解)
    if (gorillaState.isFinalPhase) return;

    // 若不在空中跳躍中且是一階段，維持貼地 (新增中文註解)
    if (!isGorillaJumping() && !gorillaState.isPhase2 && !gorillaState.isTransforming) {
        const halfHeight = refs.gorilla.displayHeight / 2;
        refs.gorilla.y = groundTop - halfHeight;
        if (refs.gorilla.body) {
            refs.gorilla.body.allowGravity = false;
            refs.gorilla.body.setVelocity(0, 0);
        }
    }

    // 二階段（包含變身中與戰鬥中）：更新全方位黑色遠端電流與厚實手臂，吸收消滅子彈，檢測玩家黑方塊實體碰撞箱與壓死判定 (新增中文註解)
    if (gorillaState.isPhase2 || gorillaState.isTransforming) {
        const gorillaX = width / 2;
        const gorillaY = refs.gorilla.y;

        if (!gorillaState.isTransforming) {
            refs.gorilla.x = gorillaX;
            refs.gorilla.setAngle(0);
            if (refs.gorilla.body) {
                refs.gorilla.body.allowGravity = false;
                refs.gorilla.body.setVelocity(0, 0);
            }
        }

        // 黑方塊環繞旋轉跟隨頂部大猩猩 (新增中文註解)
        gorillaState.orbitAngle += 0.03;
        if (gorillaState.orbitingBlocks && gorillaState.orbitingBlocks.length > 0) {
            gorillaState.orbitingBlocks.forEach(item => {
                if (item.gfx && item.gfx.active) {
                    const curAng = item.baseAngle + gorillaState.orbitAngle;
                    item.gfx.setPosition(
                        gorillaX + Math.cos(curAng) * item.radius,
                        gorillaY + Math.sin(curAng) * item.radius
                    );
                    item.gfx.setRotation(curAng);
                }
            });
        }

        // 若處於 3 秒虛弱期：黑方塊全部消失，大猩猩純懸浮於空中無防護，不執行手臂碰撞與電流 (新增中文註解)
        if (gorillaState.isVulnerable) {
            return;
        }

        // 手臂關節自然微動與黑色遠端高壓電流渲染 (每幀必定流暢執行) (新增中文註解)
        gorillaState.jointSwayTime += 0.05;
        renderChunkyArms(scene, gorillaState.jointSwayTime);

        // 若處於過場動畫中，暫不執行子彈吸收與碰撞傷害 (新增中文註解)
        if (gorillaState.isTransforming) {
            return;
        }

        const nodes = gorillaState.armJointNodes;

        // 吸收消滅所有觸碰到黑色方塊或厚重手臂的子彈 (新增中文註解)
        const bulletGroups = [refs.mgBullets, refs.sgBullets, refs.snBullets];
        bulletGroups.forEach(group => {
            if (!group) return;
            group.getChildren().forEach(bullet => {
                if (bullet && bullet.active) {
                    const distToGorilla = Phaser.Math.Distance.Between(bullet.x, bullet.y, gorillaX, gorillaY);
                    let isTouchingArm = false;

                    if (nodes) {
                        // 檢測左右臂黑方塊骨骼（不含純電流段） (新增中文註解)
                        const dL1 = distToSegment(bullet.x, bullet.y, nodes.left.shoulderBlockStart.x, nodes.left.shoulderBlockStart.y, nodes.left.elbow.x, nodes.left.elbow.y);
                        const dL2 = distToSegment(bullet.x, bullet.y, nodes.left.elbow.x, nodes.left.elbow.y, nodes.left.wrist.x, nodes.left.wrist.y);
                        const dL3 = distToSegment(bullet.x, bullet.y, nodes.left.wrist.x, nodes.left.wrist.y, nodes.left.palm.x, nodes.left.palm.y);

                        const dR1 = distToSegment(bullet.x, bullet.y, nodes.right.shoulderBlockStart.x, nodes.right.shoulderBlockStart.y, nodes.right.elbow.x, nodes.right.elbow.y);
                        const dR2 = distToSegment(bullet.x, bullet.y, nodes.right.elbow.x, nodes.right.elbow.y, nodes.right.wrist.x, nodes.right.wrist.y);
                        const dR3 = distToSegment(bullet.x, bullet.y, nodes.right.wrist.x, nodes.right.wrist.y, nodes.right.palm.x, nodes.right.palm.y);

                        isTouchingArm = (Math.min(dL1, dL2, dL3, dR1, dR2, dR3) < 55);
                    }

                    if (distToGorilla < 140 || isTouchingArm) {
                        createBlockAbsorbSpark(scene, bullet.x, bullet.y);
                        bullet.destroy();
                    }
                }
            });
        });

        // 玩家實體碰撞箱與壓死檢測 (新增中文註解)
        if (refs.player && refs.player.active) {
            const px = refs.player.x;
            const py = refs.player.y;
            const pRadius = 25; // 玩家碰撞半徑
            const armThickness = 38; // 手臂碰撞半寬

            // 判斷玩家當前是否處於開盾/衝刺無敵防禦狀態 (新增中文註解)
            const isShielding = (playerState.isInvincible || !!scene.currentDashShield);
            const slam = gorillaState.slamState;

            // 【核心壓死檢測】：拍地時若玩家被壓在巨手與地面之間，空間小塞不下立刻死亡！無視任何盾牌與無敵狀態 (新增中文註解)
            if (slam && slam.isCrushing && nodes) {
                const isLeftSlam = (slam.hand === 'left');
                const slamNodes = isLeftSlam ? nodes.left : nodes.right;

                // 使用精準邊界涵蓋範圍 (包含直達螢幕 0 或 width 最邊緣) (新增中文註解)
                const minSlamX = (slam.warnLeft !== undefined) ? slam.warnLeft - 10 : (slam.targetX - 170);
                const maxSlamX = (slam.warnRight !== undefined) ? slam.warnRight + 10 : (slam.targetX + 170);

                // 若玩家水平處於拍地範圍內
                if (px >= minSlamX && px <= maxSlamX) {
                    // 計算巨手下緣到地面的垂直空間 (新增中文註解)
                    const handBottomY = Math.max(slamNodes.wrist.y, slamNodes.palm.y) + armThickness;
                    const availableSpace = groundTop - handBottomY; // 巨手與地面之間的殘留垂直間隙

                    // 玩家站立高度約 50px。若空間小於 35px 塞不下玩家，且玩家位於手部下方，判定為被巨手壓碎！ (新增中文註解)
                    if (availableSpace < 35 && py >= (handBottomY - 50)) {
                        if (refs.triggerCrash) {
                            // 空間小塞不下，直接壓碎當機死亡（無視任何盾牌與無敵狀態！） (新增中文註解)
                            refs.triggerCrash(true);
                            return;
                        }
                    }
                }
            }

            // 定義所有實體黑方塊碰撞骨骼段 (新增中文註解)
            const solidSegments = [];
            if (nodes) {
                // 左臂實體黑方塊段 (上臂、前臂、手掌手指) (新增中文註解)
                solidSegments.push([nodes.left.shoulderBlockStart, nodes.left.elbow]);
                solidSegments.push([nodes.left.elbow, nodes.left.wrist]);
                solidSegments.push([nodes.left.wrist, nodes.left.palm]);

                // 右臂實體黑方塊段 (上臂、前臂、手掌手指) (新增中文註解)
                solidSegments.push([nodes.right.shoulderBlockStart, nodes.right.elbow]);
                solidSegments.push([nodes.right.elbow, nodes.right.wrist]);
                solidSegments.push([nodes.right.wrist, nodes.right.palm]);
            }

            let collidedSegment = null;
            let minDistance = Infinity;
            let closestPt = null;

            solidSegments.forEach(seg => {
                const dist = distToSegment(px, py, seg[0].x, seg[0].y, seg[1].x, seg[1].y);
                if (dist < (armThickness + pRadius) && dist < minDistance) {
                    minDistance = dist;
                    collidedSegment = seg;
                    closestPt = closestPointOnSegment(px, py, seg[0].x, seg[0].y, seg[1].x, seg[1].y);
                }
            });

            // 大猩猩中央防護環碰撞 (新增中文註解)
            const centerShieldDist = Phaser.Math.Distance.Between(px, py, gorillaX, gorillaY);
            const centerShieldCollided = (centerShieldDist < (110 + pRadius));

            if (collidedSegment || centerShieldCollided) {
                if (!isShielding) {
                    // 未開盾狀態碰觸實體黑方塊：引發當機 (新增中文註解)
                    if (refs.triggerCrash) {
                        refs.triggerCrash();
                    }
                } else {
                    // 開盾狀態碰觸實體黑方塊：如同撞到堅硬石頭，實體反彈與推開，絕不壓入地板 (新增中文註解)
                    let normalX = 0;
                    let normalY = 0;
                    let contactX = px;
                    let contactY = py;

                    if (collidedSegment && closestPt) {
                        const dist = Math.max(0.1, minDistance);
                        normalX = (px - closestPt.x) / dist;
                        normalY = (py - closestPt.y) / dist;

                        // 防止向下推擠穿透地板：若推力朝下且玩家接近地板，強制改為水平向兩側推開 (新增中文註解)
                        if (normalY > 0 && py > groundTop - 65) {
                            normalY = 0;
                            normalX = (px >= closestPt.x) ? 1 : -1;
                        }

                        contactX = closestPt.x + normalX * armThickness;
                        contactY = closestPt.y + normalY * armThickness;

                        // 將玩家推擠到黑方塊碰撞箱外側 (新增中文註解)
                        refs.player.x = closestPt.x + normalX * (armThickness + pRadius + 2);
                        refs.player.y = closestPt.y + normalY * (armThickness + pRadius + 2);
                    } else if (centerShieldCollided) {
                        const dist = Math.max(0.1, centerShieldDist);
                        normalX = (px - gorillaX) / dist;
                        normalY = (py - gorillaY) / dist;
                        contactX = gorillaX + normalX * 110;
                        contactY = gorillaY + normalY * 110;

                        // 將玩家推擠到防護環外側 (新增中文註解)
                        refs.player.x = gorillaX + normalX * (110 + pRadius + 2);
                        refs.player.y = gorillaY + normalY * (110 + pRadius + 2);
                    }

                    // 嚴格地板約束：強制鎖定玩家底部不能低於地板 (防止穿模卡地板) (新增中文註解)
                    if (refs.player.y > maxFloorY) {
                        refs.player.y = maxFloorY;
                    }

                    // 剛體撞擊反彈速度反射 (新增中文註解)
                    if (refs.player.body) {
                        const vx = refs.player.body.velocity.x;
                        const vy = refs.player.body.velocity.y;
                        const vDotN = vx * normalX + vy * normalY;
                        if (vDotN < 0) {
                            refs.player.body.setVelocity(
                                vx - 1.5 * vDotN * normalX,
                                vy - 1.5 * vDotN * normalY
                            );
                        }
                    }

                    // 產生撞擊石頭的火花反饋與鏡頭微震 (新增中文註解)
                    createStoneImpactSpark(scene, contactX, contactY);
                    scene.cameras.main.shake(60, 0.003);
                }
            }

            // 全局地板高度安全約束 (防止任何外力將玩家壓入地板) (新增中文註解)
            if (refs.player && refs.player.y > maxFloorY) {
                refs.player.y = maxFloorY;
                if (refs.player.body && refs.player.body.velocity.y > 0) {
                    refs.player.body.setVelocityY(0);
                }
            }
        }
    }
}

/**
 * 清理黑方塊手臂與電流 (新增中文註解)
 */
export function cleanupBlockArms() {
    gorillaState.isLightningActive = false;
    if (gorillaState.leftArm) {
        gorillaState.leftArm.destroy();
        gorillaState.leftArm = null;
    }
    if (gorillaState.rightArm) {
        gorillaState.rightArm.destroy();
        gorillaState.rightArm = null;
    }
    if (gorillaState.lightningGfx) {
        gorillaState.lightningGfx.destroy();
        gorillaState.lightningGfx = null;
    }
    gorillaState.armJointNodes = null;
}

/**
 * 清理環繞黑方塊 (新增中文註解)
 */
export function cleanupOrbitingBlocks() {
    if (gorillaState.orbitingBlocks && gorillaState.orbitingBlocks.length > 0) {
        gorillaState.orbitingBlocks.forEach(item => {
            if (item.gfx && item.gfx.destroy) {
                item.gfx.destroy();
            }
        });
        gorillaState.orbitingBlocks = [];
    }
}

/**
 * 清理大猩猩狀態 (新增中文註解：離開或切換 Boss 時調用)
 */
export function cleanupGorilla(scene) {
    stopGorillaAttacks(); // 停止所有攻擊與計時器 (新增中文註解)
    stopFinalOverloadAttack(scene);
    cleanupBlockArms();
    cleanupOrbitingBlocks();

    gorillaState.hp = 200;
    gorillaState.isPhase2 = false;
    gorillaState.isFinalPhase = false;
    gorillaState.isTransforming = false;
    gorillaState.isInvincible = false;
    gorillaState.attackCycleCount = 0;
    gorillaState.isVulnerable = false;
    gorillaState.isLightningActive = false;

    // 確保玩家未處於定身狀態 (新增中文註解)
    playerState.cannotMove = false;
    if (refs.player && refs.player.body) {
        refs.player.body.allowGravity = true;
    }

    if (refs.gorilla) {
        refs.gorilla.setActive(false).setVisible(false);
        if (refs.gorilla.body) refs.gorilla.body.enable = false;
        refs.gorilla.clearTint();
        refs.gorilla.setAngle(0);
    }
    if (refs.gorillaHPText) {
        refs.gorillaHPText.setColor('#ffffff');
        refs.gorillaHPText.setVisible(false);
    }
}
