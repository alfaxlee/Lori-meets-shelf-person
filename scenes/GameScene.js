// === 遊戲主場景模組 ===
// 包含所有遊戲邏輯（後續步驟將逐步拆分至獨立模組）
import { mobileInput, isActuallyMobile, forceControls, detectMobile, setupMobileControls, repositionMobileControls } from '../ui/MobileControls.js';
import { showCrashScreen } from '../ui/CrashScreen.js';
import { createHUD, updateLoliHP, drawEnergyBar, getEnergyBar, showLoliHPText } from '../ui/HUD.js';
import { createWeaponUI, getWeaponState, triggerReload, fireMG, fireSG, fireSN } from '../weapons/WeaponManager.js';
import { createDashDust } from '../player/DashEffects.js';
import { playerState, updatePlayer } from '../player/PlayerController.js';
import { initBossRefs, bossState, handleLoliHit, updateLoliStateMachine, respawnLoli } from '../boss/LoliStateMachine.js';
import { initAttackRefs, spawnEnemyBall, scheduleNextLaser, rememberLoliBody, scheduleJumpAttack } from '../boss/LoliAttacks.js';
import { initUncleRefs, startUncleAttacks, updateUncleAttacks } from '../boss/UncleAttacks.js';
import { initUncleStateRefs, uncleState, handleUncleHit, updateUncleStateMachine, respawnUncle } from '../boss/UncleStateMachine.js';

let player;
let loli;
let keys;
let platforms;
let ground;
let mgBullets;
let sgBullets;
let snBullets;
let uncle;         // 猥瑣大叔 Sprite
let uncleHPText;   // 猥瑣大叔血量文字

// --- 武器系統變數 --- (已搬移至 weapons/WeaponManager.js)
let shockwaves; // 衝擊波群組
let lasers;    // 雷射攻擊群組
let enemyBalls; // 敵人彈跳球群組

// 衝刺系統變數已搬移至 player/PlayerController.js

// 蘿莉遇櫃人 血量與狀態變數已搬移至 boss/LoliStateMachine.js


// Body 工具函式已搬移至 boss/LoliAttacks.js

// --- 控制變數 --- (已搬移至 ui/MobileControls.js)

// 載入遊戲素材（由 GameScene.preload 委派呼叫）
function preloadAssets() {
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
    this.load.image('shabi', './assets/images/shabi.png');
    this.load.image('蘿莉遇櫃人', './assets/images/羅莉抓人.png');
    this.load.image('loliWin', './assets/images/蘿莉過關圖.png'); // 載入狂暴模式背景圖 (蘿莉過關圖)
    // 載入猥瑣大叔圖片
    this.load.image('猥瑣大叔', 'https://tse3.mm.bing.net/th/id/OIP.m_x1TY2hKDnQjwvLi8DWWAHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3');
    // 載入猥瑣大叔過載模式背景圖
    this.load.image('uncleOverloadBg', 'https://techwiser.com/wp-content/uploads/2025/12/Inspector-Rules-in-Scary-Shawarma-Kiosk-1024x620.webp');
}

// 建立遊戲場景（由 GameScene.create 委派呼叫）
function createScene() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 啟用多點觸控 (最多支援 5 點同時操作)
    this.input.addPointer(5);

    // 偵測手機裝置（邏輯已搬至 MobileControls 模組）
    detectMobile(this);

    this.input.mouse.disableContextMenu();
    this.physics.world.setBounds(0, 0, width, height);

    platforms = this.physics.add.staticGroup();
    ground = platforms.create(width / 2, height - 50, '地板');
    ground.setDisplaySize(width, 40);
    ground.refreshBody();

    mgBullets = this.physics.add.group();
    sgBullets = this.physics.add.group();
    snBullets = this.physics.add.group();
    shockwaves = this.physics.add.group(); // 初始化衝擊波群組
    lasers = this.physics.add.group();     // 初始化雷射攻擊群組
    enemyBalls = this.physics.add.group(); // 初始化敵人彈跳球群組

    player = this.physics.add.sprite(width / 2, height - 150, '胖嘟嘟發電機');
    player.setScale(0.1);
    player.setCollideWorldBounds(true);
    player.setBounce(0.1);

    // 將蘿莉初始位置下移至 height - 110，使其出生就在地板上 (修改)
    loli = this.physics.add.sprite(width / 4, height - 110, '蘿莉遇櫃人');
    loli.setScale(0.3);
    loli.setCollideWorldBounds(true);
    loli.setBounce(0.1);
    loli.isHit = false;
    loli.hitStunTimer = 0;
    // 呼叫 rememberLoliBody 記住原始碰撞箱大小，以便在癱瘓模式翻轉
    rememberLoliBody(loli);

    // 建立猥瑣大叔（出生在畫面右側 3/4 處，大小為蘿莉的 1.5 倍）
    uncle = this.physics.add.sprite(3 * width / 4, height - 110, '猥瑣大叔');
    // 使用 setDisplaySize 確保視覺大小為蘿莉的 1.5 倍（不依賴原圖尺寸）
    uncle.setDisplaySize(loli.displayWidth * 1.5, loli.displayHeight * 1.5);
    uncle.setCollideWorldBounds(true);
    uncle.setBounce(0.1);
    // 猥瑣大叔初始隱藏，等蘿莉被打敗後才出現
    uncle.setActive(false);
    uncle.setVisible(false);
    uncle.body.enable = false;

    // 初始化狀態機與攻擊模組的共享參考
    initAttackRefs({ loli, player, shockwaves, lasers, enemyBalls });
    // 傳入 onLoliDeath 回呼：蘿莉死亡後生成猥瑣大叔
    initBossRefs({ loli, player, lasers, enemyBalls, shockwaves, onLoliDeath: (scene) => {
        // 隱藏蘿莉血量，顯示猥瑣大叔血量
        showLoliHPText(false);
        uncleHPText.setVisible(true);
        // 在蘿莉出生位置生成猥瑣大叔
        const spawnX = scene.cameras.main.width / 4;
        const spawnY = scene.cameras.main.height - 150;
        respawnUncle(scene, spawnX, spawnY);
    }});

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(loli, platforms);
    this.physics.add.collider(uncle, platforms); // 猥瑣大叔與地板碰撞

    // 子彈碰撞邏輯
    this.physics.add.collider(mgBullets, platforms);
    this.physics.add.collider(sgBullets, platforms);
    this.physics.add.collider(snBullets, platforms, (bullet) => { bullet.destroy(); });

    // 敵人彈跳球碰撞邏輯
    this.physics.add.collider(enemyBalls, platforms); // 碰到地板會反彈
    this.physics.add.collider(enemyBalls, [mgBullets, sgBullets, snBullets], (ball, bullet) => {
        bullet.destroy(); // 玩家子彈消失 (修正語法錯誤)
        // ball 會因為 collider 自然反彈
    });

    this.physics.world.on('worldbounds', (body, up, down, left, right) => {
        const obj = body.gameObject;
        if (!obj) return;

        // 子彈或衝擊波碰到牆壁 (世界邊界) 就消失
        if (mgBullets.contains(obj) || sgBullets.contains(obj) || snBullets.contains(obj) || shockwaves.contains(obj)) {
            obj.destroy();
        }
        // 敵人彈跳球碰到天花板或牆壁就消失
        else if (enemyBalls.contains(obj)) {
            if (up || left || right) {
                obj.destroy(); // 碰到天花板或左右牆壁時銷毀
            }
        }
    });

    // 當機畫面 (處理玩家死亡/受傷)
    let isCrashed = false; // 防止多次觸發當機
    const triggerCrash = (force = false) => {
        // 確保 force 真的是布林值 true，因為 Phaser 的 collider 會傳入兩個遊戲物件(Truthy)
        const isForced = force === true;
        // 衝刺/護盾期間無敵 (若 isForced 為 true 則無視無敵)，或已當機則跳過
        if ((playerState.isInvincible && !isForced) || isCrashed) return; 
        isCrashed = true;
        showCrashScreen(this); // 委派給 CrashScreen 模組處理 DOM 與動畫
    };
    this.triggerCrash = triggerCrash; // 將當機函式掛載到場景，供外部雷射/地刺使用

    this.physics.add.collider(player, loli, () => {
        if (bossState.isSuperInvincible || bossState.isExhausted) return; // 究極狂暴與癱瘓模式下，碰到蘿莉不會死掉
        triggerCrash(); // 一般或狂暴模式下，碰到玩家均觸發當機
    });
    // 碰到猥瑣大叔也會當機
    this.physics.add.collider(player, uncle, () => {
        triggerCrash();
    });
    this.physics.add.overlap(player, shockwaves, triggerCrash); // 玩家碰到衝擊波也會當機
    this.physics.add.overlap(player, enemyBalls, triggerCrash); // 玩家碰到彈跳球也會當機

    // 設定隨機雷射計時器 (3-7 秒觸發一次)
    scheduleNextLaser(this);
    // 設定跳躍攻擊計時器 (10-15 秒一次)
    scheduleJumpAttack(this);


    // 設定敵人彈跳球計時器 (一般模式頻率降低)
    const scheduleNextBall = () => {
        const delay = bossState.isBerserk ? 2000 : Phaser.Math.Between(15000, 25000); // 一般模式從 10-15s 增加到 15-25s (修改)
        this.time.delayedCall(delay, () => {
            // 僅在一般模式執行丟球攻擊，狂暴模式已依要求關閉 (修正)
            if (!bossState.isBerserk) {
                spawnEnemyBall(this);
            }
            scheduleNextBall();
        });
    };
    scheduleNextBall();

    // 監聽視窗縮放事件，自動調整手機控制項位置 (新增)
    this.scale.on('resize', () => {
        repositionMobileControls(this);
    });

    // 只有在真實手機裝置上才建立控制項 (修正：支援 forceControls)
    if (isActuallyMobile || forceControls) {
        setupMobileControls(this);
    }

    // 武器 UI 建立（委派給 WeaponManager 模組）
    createWeaponUI(this);
    // HUD 介面建立（蘿莉血量文字 + 衝刺能量條）
    createHUD(this, bossState.hp);
    // 猥瑣大叔血量文字（初始隱藏，顯示在蘿莉血量下方）
    uncleHPText = this.add.text(width / 2, 100, `猥瑣大叔血量: 800`, { fontSize: '30px', fill: '#ff00ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);
    uncleHPText.setVisible(false); // 初始隱藏
    // 初始化猥瑣大叔狀態機參考
    initUncleStateRefs({ uncle, uncleHPText, onUncleDeath: (scene) => {
        uncleHPText.setVisible(false);
        showLoliHPText(true);
        respawnLoli(scene);
    }, player, mgBullets, sgBullets, snBullets });

    // 初始化猥瑣大叔攻擊模組參考
    initUncleRefs({ uncle, uncleHPText, onUncleDeath: (scene) => {
        // 這裡的邏輯與上面的 initUncleStateRefs 相同，確保一致性
        uncleHPText.setVisible(false);
        showLoliHPText(true);
        respawnLoli(scene);
    }, player, mgBullets, sgBullets, snBullets });

    // 蘿莉的子彈碰撞
    this.physics.add.collider(loli, mgBullets, (obj1, obj2) => { handleLoliHit(this, obj2, 600, 200, 5); });
    this.physics.add.collider(loli, sgBullets, (obj1, obj2) => { handleLoliHit(this, obj2, 400, 150, 25); });
    this.physics.add.collider(loli, snBullets, (obj1, obj2) => { handleLoliHit(this, obj2, 1500, 500, 50); });

    // 猥瑣大叔的子彈碰撞（後座力在 handleUncleHit 內部自動減半）
    this.physics.add.collider(uncle, mgBullets, (obj1, obj2) => { handleUncleHit(this, obj2, 600, 200, 5); });
    this.physics.add.collider(uncle, sgBullets, (obj1, obj2) => { handleUncleHit(this, obj2, 400, 150, 25); });
    this.physics.add.collider(uncle, snBullets, (obj1, obj2) => { handleUncleHit(this, obj2, 1500, 500, 50); });

    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        reload: Phaser.Input.Keyboard.KeyCodes.R,
        dash: Phaser.Input.Keyboard.KeyCodes.Q
    });
}

// setupMobileControls / createBtn / repositionMobileControls 已搬移至 ui/MobileControls.js

// 每幀更新邏輯（由 GameScene.update 委派呼叫）
function updateScene(time, delta) {
    // 繪製衝刺能量條（委派給 HUD 模組）
    drawEnergyBar(playerState.dashEnergy, playerState.maxDashEnergy, playerState.dashEnergyColor);

    // 玩家移動與衝刺控制（委派給 PlayerController 模組）
    updatePlayer(this, player, loli, createDashShield);

    const pointer = this.input.activePointer;
    const ws = getWeaponState(); // 取得武器狀態

    // 彈弓射擊
    const triggerMg = isActuallyMobile ? mobileInput.fireMg : (pointer.leftButtonDown() || mobileInput.fireMg);
    if (triggerMg && !ws.mg.reloading && ws.mg.ammo > 0) {
        if (time > ws.mg.lastFired + ws.mg.fireRate) { fireMG(this, player, loli, mgBullets, pointer, mobileInput.fireMg); ws.mg.lastFired = time; }
    }

    // 霸彈槍射擊
    const triggerSg = isActuallyMobile ? mobileInput.fireSg : (pointer.rightButtonDown() || mobileInput.fireSg);
    if (triggerSg && !ws.sg.reloading && ws.sg.ammo > 0 && time > ws.sg.lastFired + ws.sg.fireRate) {
        fireSG(this, player, loli, sgBullets, pointer, mobileInput.fireSg); ws.sg.lastFired = time;
    }

    // 狙擊槍射擊
    const triggerSn = isActuallyMobile ? mobileInput.fireSn : (pointer.middleButtonDown() || mobileInput.fireSn);
    if (triggerSn && !ws.sn.reloading && ws.sn.ammo > 0 && time > ws.sn.lastFired + ws.sn.fireRate) {
        fireSN(this, player, loli, snBullets, pointer, mobileInput.fireSn); ws.sn.lastFired = time;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.reload) || mobileInput.reload) {
        triggerReload(this); mobileInput.reload = false;
    }

    if (loli.active) {
        const playerRect = player.getBounds();
        lasers.getChildren().forEach(laser => {
            if (!laser.active) return;

            if (Math.abs(laser.angle) < 0.1) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(playerRect, laser.getBounds())) {
                    this.triggerCrash();
                }
                return;
            }

            try {
                const rad = laser.rotation;
                const length = 1500;
                const ox = laser.originX;
                const oy = laser.originY;
                const w = laser.width;
                const h = laser.height;
                const lx = laser.x;
                const ly = laser.y;
                const direction = (ox === 0) ? 1 : -1;

                const line = new Phaser.Geom.Line(lx, ly, lx + Math.cos(rad) * length * direction, ly + Math.sin(rad) * length * direction);

                if (Phaser.Geom.Intersects.LineToRectangle(line, playerRect)) {
                    this.triggerCrash();
                    return;
                }

                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const points = [
                    { x: -ox * w, y: -oy * h },
                    { x: (1 - ox) * w, y: -oy * h },
                    { x: (1 - ox) * w, y: (1 - oy) * h },
                    { x: -ox * w, y: (1 - oy) * h }
                ];
                const corners = points.map(p => ({
                    x: lx + p.x * cos - p.y * sin,
                    y: ly + p.x * sin + p.y * cos
                }));
                const laserPoly = new Phaser.Geom.Polygon(corners);

                const testPoints = [
                    { x: player.x, y: player.y },
                    { x: playerRect.left, y: playerRect.top },
                    { x: playerRect.right, y: playerRect.top },
                    { x: playerRect.right, y: playerRect.bottom },
                    { x: playerRect.left, y: playerRect.bottom }
                ];

                // 修正：使用正確的 Phaser API (Phaser.Geom.Polygon.Contains) 代替不存在的方法
                if (testPoints.some(p => Phaser.Geom.Polygon.Contains(laserPoly, p.x, p.y))) {
                    this.triggerCrash();
                }
            } catch (e) {
            }
        });

        // 將蘿莉的狀態與行為決策委派給 LoliStateMachine 處理
        updateLoliStateMachine(this, time, delta);
    }

    // 更新猥瑣大叔邏輯（狀態機 AI 與 攻擊跟隨）
    updateUncleStateMachine(this, time, delta);
    updateUncleAttacks(this);
}

// createShockwaves / spawnLaser / spawnEnemyBall / createDashDust 已搬移至 boss/LoliAttacks.js 和 player/DashEffects.js


function createDashShield(scene, player, angle) {
    const shield = scene.add.graphics(); let hasHitLoli = false; let hasHitUncle = false; let alive = true;
    scene.time.delayedCall(1150, () => { alive = false; });
    const onUpdate = () => {
        if (!alive || !player.active) { shield.destroy(); scene.events.off('update', onUpdate); return; }
        shield.clear(); shield.lineStyle(2, 0x00ffff, 0.6);
        const offset = 35; const centerX = player.x + Math.cos(angle) * offset; const centerY = player.y + Math.sin(angle) * offset;
        const radius = 65; const arcRange = Math.PI / 1.2; const startAngle = angle - arcRange / 2; const endAngle = angle + arcRange / 2;
        for (let r = 25; r <= radius; r += 20) { shield.beginPath(); shield.arc(centerX, centerY, r, startAngle, endAngle); shield.strokePath(); }
        const segments = 6;
        for (let i = 0; i <= segments; i++) {
            const currentAngle = startAngle + (arcRange / segments) * i;
            shield.lineBetween(centerX + Math.cos(currentAngle) * 15, centerY + Math.sin(currentAngle) * 15, centerX + Math.cos(currentAngle) * radius, centerY + Math.sin(currentAngle) * radius);
        }
        shield.lineStyle(1, 0x00ffff, 1); shield.beginPath(); shield.arc(centerX, centerY, radius, startAngle, endAngle); shield.strokePath();
        // 護盾碰撞蘿莉
        if (!hasHitLoli && loli.active) {
            const dist = Phaser.Math.Distance.Between(centerX, centerY, loli.x, loli.y);
            if (dist < radius + 40) {
                handleLoliHit(scene, null, 1500, 500, 25, centerX, centerY);
                hasHitLoli = true;
            }
        }
        // 護盾碰撞猥瑣大叔（後座力在 handleUncleHit 內部自動減半）
        if (!hasHitUncle && uncle && uncle.active) {
            const distU = Phaser.Math.Distance.Between(centerX, centerY, uncle.x, uncle.y);
            if (distU < radius + 40) {
                handleUncleHit(scene, null, 1500, 500, 25, centerX, centerY);
                hasHitUncle = true;
            }
        }
    };
    scene.events.on('update', onUpdate);
}

// scheduleUltimateGunAttack / scheduleUltimateBalls / spawnUltimateLaser 已搬移至 boss/LoliAttacks.js

// === 場景類別定義 ===
// 使用 class-based scene 取代 function-based scene
// 透過 .call(this) 將 this 上下文正確傳遞給原有函式
export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene'); // 場景名稱
    }

    // 載入素材階段
    preload() {
        preloadAssets.call(this);
    }

    // 建立場景階段
    create() {
        createScene.call(this);
    }

    // 每幀更新階段
    update(time, delta) {
        updateScene.call(this, time, delta);
    }
}
