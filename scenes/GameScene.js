// === 遊戲主場景模組 ===
// 包含所有遊戲邏輯（後續步驟將逐步拆分至獨立模組）
import { mobileInput, isActuallyMobile, forceControls, detectMobile, setupMobileControls, repositionMobileControls } from '../ui/MobileControls.js';
import { showCrashScreen } from '../ui/CrashScreen.js';
import { createHUD, updateLoliHP, drawEnergyBar, getEnergyBar } from '../ui/HUD.js';
import { createWeaponUI, getWeaponState, triggerReload, fireMG, fireSG, fireSN } from '../weapons/WeaponManager.js';
import { createDashDust } from '../player/DashEffects.js';
import { playerState, updatePlayer } from '../player/PlayerController.js';
import { initAttackRefs, rememberLoliBody, setLoliUprightBody, setLoliExhaustedBody, keepSpriteBottom, createShockwaves, spawnLaser, spawnEnemyBall, scheduleNextLaser, scheduleUltimateGunAttack, scheduleUltimateBalls, spawnUltimateLaser, clearAllAttacks, cleanupBerserkScene } from '../boss/LoliAttacks.js';

let player; 
let loli; 
let keys;
let platforms;
let ground;
let mgBullets;
let sgBullets;
let snBullets; 

// --- 武器系統變數 --- (已搬移至 weapons/WeaponManager.js)
let shockwaves; // 衝擊波群組
let lasers;    // 雷射攻擊群組
let enemyBalls; // 敵人彈跳球群組

// 衝刺系統變數已搬移至 player/PlayerController.js

// --- 蘿莉遇櫃人 血量與狀態變數 ---
let loliHP = 600;
let loliMaxHP = 600;
// loliHPText 已搬移至 ui/HUD.js

// Body 工具函式已搬移至 boss/LoliAttacks.js

// --- 控制變數 --- (已搬移至 ui/MobileControls.js)

// 載入遊戲素材（由 GameScene.preload 委派呼叫）
function preloadAssets() {
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
    this.load.image('shabi', './assets/images/shabi.png');
    this.load.image('蘿莉遇櫃人', './assets/images/羅莉抓人.png');
    this.load.image('loliWin', './assets/images/蘿莉過關圖.png'); // 載入狂暴模式背景圖 (蘿莉過關圖)
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
    loli.wasInAir = false; // 追蹤蘿莉是否在空中
    loli.highestY = 0;     // 追蹤在空中的最高點 (Y 越小越高)
    loli.isBerserk = false; // 狂暴模式標記
    loli.isSuperInvincible = false; // 新增：無敵模式標記
    rememberLoliBody(loli);

    // 初始化攻擊模組的共享參考（注入 loli 和攻擊群組）
    initAttackRefs({ loli, shockwaves, lasers, enemyBalls });

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(loli, platforms); 
    
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
    const triggerCrash = () => {
        if (playerState.isInvincible || isCrashed) return; // 衝刺/護盾期間無敵，或已當機則跳過
        isCrashed = true;
        showCrashScreen(this); // 委派給 CrashScreen 模組處理 DOM 與動畫
    };
    this.triggerCrash = triggerCrash; // 將當機函式掛載到場景，供外部雷射函式使用 (新增)

    this.physics.add.collider(player, loli, () => {
        if (loli.isSuperInvincible || loli.isExhausted) return; // 究極狂暴與癱瘓模式下，碰到蘿莉不會死掉
        triggerCrash(); // 一般或狂暴模式下，碰到玩家均觸發當機
    });
    this.physics.add.overlap(player, shockwaves, triggerCrash); // 玩家碰到衝擊波也會當機
    this.physics.add.overlap(player, enemyBalls, triggerCrash); // 玩家碰到彈跳球也會當機

    // 設定隨機雷射計時器 (3-7 秒觸發一次)
    scheduleNextLaser(this);

    // 設定敵人彈跳球計時器 (一般模式頻率降低)
    const scheduleNextBall = () => {
        const delay = loli.isBerserk ? 2000 : Phaser.Math.Between(15000, 25000); // 一般模式從 10-15s 增加到 15-25s (修改)
        this.time.delayedCall(delay, () => {
            // 僅在一般模式執行丟球攻擊，狂暴模式已依要求關閉 (修正)
            if (!loli.isBerserk) {
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
    createHUD(this, loliHP);

    this.physics.add.collider(loli, mgBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 600, 200, 5); });
    this.physics.add.collider(loli, sgBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 400, 150, 25); });
    this.physics.add.collider(loli, snBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 1500, 500, 50); });

    function handleLoliHit(scene, target, bullet, force, stunTime, damage) {
        if (!target.active) return;
        if (target.isSuperInvincible) { // 如果處於無敵模式，不受傷害
            if (bullet) bullet.destroy();
            return;
        }

        const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
        
        let willBeInvincible = false;
        if (loliHP >= 50 && (loliHP - damage) < 50) {
            loliHP = 49; // 確保血量剛好低於50
            willBeInvincible = true;
        } else {
            loliHP -= damage;
        }
        
        updateLoliHP(loliHP);
        
        if (loliHP <= 0) {
            handleLoliDeath(scene, target);
        } else if (willBeInvincible) {
            triggerInvincibleMode(scene, target);
        } else {
            target.isHit = true; 
            target.hitStunTimer = stunTime;
            target.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force - 200);
            target.setTint(0xff0000); 
            scene.cameras.main.shake(100, 0.005);
        }
        if (bullet) bullet.destroy();
    }

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

        if (loliHP < 150 && !loli.isBerserk) {
            loli.isBerserk = true;
            loli.body.allowGravity = false; 
            loli.setTint(0xff0000);        

            const width = this.cameras.main.width;
            const height = this.cameras.main.height;

            this.berserkBg = this.add.image(width / 2, height / 2, 'loliWin').setDepth(-1);
            this.berserkBg.setDisplaySize(width, height);
            this.berserkCeiling = this.add.rectangle(width / 2, 10, width, 20, 0xff00ff);
            this.physics.add.existing(this.berserkCeiling, true); 
            this.berserkFloor = this.add.rectangle(width / 2, height - 50, width, 40, 0xff00ff);
            this.physics.add.existing(this.berserkFloor, true); 

            this.physics.add.collider(player, [this.berserkCeiling, this.berserkFloor]);
            this.physics.add.collider(loli, [this.berserkCeiling, this.berserkFloor]);

            this.physics.add.collider(enemyBalls, this.berserkCeiling, (ball) => { ball.destroy(); });
            this.physics.add.collider(enemyBalls, this.berserkFloor); 

            this.berserkGunLeft = this.add.container(0, height / 2);
            const bodyLeft = this.add.rectangle(60, 0, 320, 80, 0xff00ff);
            const barrelLeft = this.add.rectangle(260, 0, 80, 30, 0xff00ff);
            this.berserkGunLeft.add([bodyLeft, barrelLeft]);

            this.berserkGunRight = this.add.container(width, height / 2);
            const bodyRight = this.add.rectangle(-60, 0, 320, 80, 0xff00ff);
            const barrelRight = this.add.rectangle(-260, 0, 80, 30, 0xff00ff);
            this.berserkGunRight.add([bodyRight, barrelRight]);

            let nextIsLeft = false; 
            const scheduleBerserkGunAttack = () => {
                if (!loli.active || !loli.isBerserk || loli.isSuperInvincible) return; // 新增：無敵模式下不排程
                const isLeft = nextIsLeft;
                const targetGun = isLeft ? this.berserkGunLeft : this.berserkGunRight;
                nextIsLeft = !nextIsLeft; 
                const targetAngle = Phaser.Math.Between(-45, 45);

                this.tweens.add({
                    targets: targetGun,
                    angle: targetAngle,
                    duration: 300,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        if (!loli.active || !loli.isBerserk || loli.isSuperInvincible) return; // 新增：無敵模式下不繼續
                        const rad = Phaser.Math.DegToRad(targetGun.angle);
                        const offsetX = isLeft ? 260 : -260; 
                        const worldX = targetGun.x + Math.cos(rad) * offsetX;
                        const worldY = targetGun.y + Math.sin(rad) * offsetX;
                        const laserOrigin = isLeft ? 0 : 1;
                        const warningLine = this.add.rectangle(worldX, worldY, 1500, 2, 0xff0000, 0.5).setOrigin(laserOrigin, 0.5);
                        warningLine.name = 'warningLine'; // 標記警告線
                        warningLine.setAngle(targetGun.angle);

                        this.time.delayedCall(500, () => {
                            if (loli.isSuperInvincible) {
                                if (warningLine) warningLine.destroy();
                                return; // 無敵模式下取消發射
                            }
                            warningLine.destroy(); 
                            if (!loli.active || !loli.isBerserk) return;
                            const laser = this.add.rectangle(worldX, worldY, 1500, 20, 0xff00ff, 0.8).setOrigin(laserOrigin, 0.5);
                            laser.setAngle(targetGun.angle); 
                            this.physics.add.existing(laser);
                            lasers.add(laser);
                            if (laser.body) laser.body.enable = false;
                            this.time.delayedCall(500, () => {
                                laser.destroy();
                                if (loli.isBerserk && !loli.isSuperInvincible) this.time.delayedCall(700, scheduleBerserkGunAttack);
                            });
                        });
                    }
                });
            };
            scheduleBerserkGunAttack();
            spawnLaser(this);
        }

        if (loli.isSuperInvincible) {
            // 在無敵模式下，檢查是否到達螢幕偏上方 (高度 1/4 處，即距離底部 3/4)
            const centerX = this.cameras.main.width / 2;
            const centerY = this.cameras.main.height / 4;
            const distance = Phaser.Math.Distance.Between(loli.x, loli.y, centerX, centerY);
            
            if (distance < 15) {
                loli.body.reset(centerX, centerY); // 停止在定點
                loli.setVelocity(0, 0);
                
                // 到達定點後慢慢放大到原本的 1.5 倍
                if (!loli.isScaling) {
                    loli.isScaling = true;
                    this.tweens.add({
                        targets: loli,
                        scale: 0.3 * 1.5, // 放大到 0.45
                        duration: 2000,   // 緩慢放大 (2秒)
                        ease: 'Linear',
                        onComplete: () => {
                            // 膨脹完畢，觸發超快速 360 度雷射
                            const laserLength = 1500; // 確保長度能完全掃到邊界
                            const laserY = loli.y - 10; // 從蘿莉頭部稍微偏上射出
                            const ultimateLaser = this.add.rectangle(loli.x, laserY, laserLength, 40, 0xff00ff, 0.9).setOrigin(0, 0.5);
                            this.physics.add.existing(ultimateLaser);
                            lasers.add(ultimateLaser);
                            if (ultimateLaser.body) ultimateLaser.body.enable = false; // 依靠現有的多邊形碰撞偵測
                            
                            // 超快速轉 360 度 (0.6 秒一圈)
                            this.tweens.add({
                                targets: ultimateLaser,
                                angle: 360,
                                duration: 600, // 超快速旋轉
                                onComplete: () => {
                                    ultimateLaser.destroy();
                                    
                                    // 射完 360 度雷射後，給予玩家超級 Buff
                                    playerState.maxDashEnergy = 200; // 能量條變成兩倍長
                                    playerState.dashEnergy = playerState.maxDashEnergy; // 立刻補滿能量
                                    playerState.dashCost = 33 / 2; // 消耗變 1/2 (原本是 33)
                                    playerState.energyRegen = 1.0; // 回復能量效率變兩倍 (原本是 0.5)
                                    player.setTint(0x00ffff); // 玩家獲得衝刺 buff 時外觀稍微變色

                                    // 啟動究極狂暴模式攻擊
                                    loli.isUltimateBerserk = true;
                                    scheduleUltimateGunAttack(loli.scene);
                                    scheduleUltimateBalls(loli.scene);
                                    spawnUltimateLaser(loli.scene);

                                    // 7 秒後癱瘓
                                    loli.scene.time.delayedCall(7000, () => {
                                        if (!loli.active || !loli.isUltimateBerserk) return;
                                        
                                        loli.isUltimateBerserk = false;
                                        loli.isSuperInvincible = false; // 解除無敵，可以被攻擊了
                                        loli.isExhausted = true; // 新增癱瘓狀態
                                        loli.body.allowGravity = true; // 恢復重力讓她掉到地上
                                        loli.body.setImmovable(false); // 恢復可被擊退的狀態
                                        loli.setScale(0.3); // 蘿莉體型變回剛開始的樣子
                                        setLoliUprightBody(loli);
                                        
                                        // 取消玩家的衝刺 buff 與外觀
                                        player.clearTint();
                                        playerState.maxDashEnergy = 100;
                                        playerState.dashCost = 33;
                                        playerState.energyRegen = 0.5;
                                        if (playerState.dashEnergy > playerState.maxDashEnergy) playerState.dashEnergy = playerState.maxDashEnergy;
                                        
                                        // 移除狂暴模式的背景、天空、地板、兩把雷射槍
                                        if (loli.scene.berserkBg) { loli.scene.berserkBg.destroy(); loli.scene.berserkBg = null; }
                                        if (loli.scene.berserkCeiling) { loli.scene.berserkCeiling.destroy(); loli.scene.berserkCeiling = null; }
                                        if (loli.scene.berserkFloor) { loli.scene.berserkFloor.destroy(); loli.scene.berserkFloor = null; }
                                        if (loli.scene.berserkGunLeft) { loli.scene.berserkGunLeft.destroy(); loli.scene.berserkGunLeft = null; }
                                        if (loli.scene.berserkGunRight) { loli.scene.berserkGunRight.destroy(); loli.scene.berserkGunRight = null; }
                                        
                                        // 清除畫面上所有的攻擊與警告線
                                        if (shockwaves) shockwaves.clear(true, true);
                                        if (lasers) lasers.clear(true, true);
                                        if (enemyBalls) enemyBalls.clear(true, true);
                                        loli.scene.children.list.forEach(child => {
                                            if (child.name === 'warningLine') child.destroy();
                                        });

                                        // 轉一圈癱倒在地
                                        loli.scene.tweens.add({
                                            targets: loli,
                                            angle: loli.angle + 360, // 轉 360 度
                                            duration: 1000,
                                            ease: 'Cubic.easeOut',
                                            onComplete: () => {
                                                const currentBottom = loli.getBounds().bottom;
                                                loli.setAngle(90); // 倒在地上 (轉 90 度看起來像趴著)
                                                setLoliExhaustedBody(loli);
                                                keepSpriteBottom(loli, currentBottom);
                                                loli.clearTint(); // 恢復正常顏色
                                                
                                                // 墜落地板產生一道咖啡色、無傷害的衝擊波
                                                const swColor = 0x8B4513; // 咖啡色
                                                const swLeft = loli.scene.add.rectangle(loli.x, loli.y + loli.displayHeight / 2 - 20, 100, 40, swColor, 0.8);
                                                const swRight = loli.scene.add.rectangle(loli.x, loli.y + loli.displayHeight / 2 - 20, 100, 40, swColor, 0.8);
                                                
                                                loli.scene.physics.add.existing(swLeft);
                                                loli.scene.physics.add.existing(swRight);
                                                swLeft.body.allowGravity = false;
                                                swRight.body.allowGravity = false;
                                                
                                                // 往左右擴散
                                                swLeft.body.setVelocity(-600, -50);
                                                swRight.body.setVelocity(600, -50);
                                                
                                                loli.scene.tweens.add({
                                                    targets: [swLeft, swRight], 
                                                    alpha: 0, 
                                                    scaleX: 2.5, 
                                                    scaleY: 1.5, 
                                                    duration: 1000,
                                                    onComplete: () => { 
                                                        swLeft.destroy(); 
                                                        swRight.destroy(); 
                                                    }
                                                });
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            } else {
                // 每幀持續往目標移動
                this.physics.moveTo(loli, centerX, centerY, 500); 
            }
        } else if (loli.isHit) {
            loli.hitStunTimer -= delta; if (loli.hitStunTimer <= 0) { loli.isHit = false; loli.isBerserk ? loli.setTint(0xff0000) : loli.clearTint(); }
        } else if (loli.isExhausted) {
            // 癱瘓在地，無法移動 (水平速度歸零，但垂直速度受重力影響，受到攻擊會被擊退)
            loli.setVelocityX(0);
        } else if (loli.isBerserk) {
            loli.setVelocityX(Math.sin(time / 500) * 400);
            loli.setVelocityY(Math.cos(time / 1000) * 200);
        } else {
            if (loli.x < player.x) loli.setVelocityX(200); else if (loli.x > player.x) loli.setVelocityX(-200);
            else loli.setVelocityX(0);
            
            if (loli.body.touching.down) {
                if (loli.wasInAir) {
                    const fallDistance = Math.max(0, loli.y - loli.highestY);
                    createShockwaves(this, loli.x, loli.y + loli.displayHeight / 2, fallDistance);
                    loli.wasInAir = false;
                }
            } else {
                if (!loli.wasInAir) { loli.highestY = loli.y; loli.wasInAir = true; }
                else loli.highestY = Math.min(loli.highestY, loli.y);
            }
            if (player.y < loli.y - 50 && loli.body.touching.down) loli.setVelocityY(-275);
        }
    }
}

// createShockwaves / spawnLaser / spawnEnemyBall / createDashDust 已搬移至 boss/LoliAttacks.js 和 player/DashEffects.js


function createDashShield(scene, player, angle) {
    const shield = scene.add.graphics(); let hasHit = false; let alive = true;
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
        if (!hasHit && loli.active) {
            const dist = Phaser.Math.Distance.Between(centerX, centerY, loli.x, loli.y);
            if (dist < radius + 40) {
                if (loli.isSuperInvincible) return; // 無敵模式下不受護盾傷害

                const hitAngle = Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y);
                
                let willBeInvincible = false;
                if (loliHP >= 50 && (loliHP - 25) < 50) {
                    loliHP = 49;
                    willBeInvincible = true;
                } else {
                    loliHP -= 25; 
                }
                
                updateLoliHP(loliHP);
                
                if (loliHP <= 0) {
                    handleLoliDeath(scene, loli);
                } else if (willBeInvincible) {
                    triggerInvincibleMode(scene, loli);
                } else {
                    loli.isHit = true; loli.hitStunTimer = 500; loli.setVelocity(Math.cos(hitAngle) * 1500, Math.sin(hitAngle) * 1500 - 200); loli.setTint(0xff0000);
                    scene.cameras.main.shake(100, 0.005); 
                }
                hasHit = true;
            }
        }
    };
    scene.events.on('update', onUpdate);
}

function handleLoliDeath(scene, target) {
    target.setActive(false).setVisible(false).body.enable = false;
    scene.cameras.main.flash(500, 255, 0, 0);
    if (shockwaves) shockwaves.clear(true, true); if (lasers) lasers.clear(true, true); if (enemyBalls) enemyBalls.clear(true, true);
    scene.time.delayedCall(3000, () => {
        loliHP = loliMaxHP; updateLoliHP(loliHP);
        target.setActive(true).setVisible(true).body.enable = true;
        target.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 150);
        target.isBerserk = false;
        target.isSuperInvincible = false; // 重置無敵狀態
        target.isUltimateBerserk = false; // 重置究極狂暴狀態
        target.isExhausted = false; // 重置癱瘓狀態
        target.setAngle(0); // 確保角度歸正 (因為癱瘓時會倒下)
        target.isScaling = false; // 重置放大狀態
        target.setScale(0.3); // 重置為原本的體型
        setLoliUprightBody(target);
        target.body.setImmovable(false); // 重置為可被擊退的狀態
        cleanupBerserkScene(scene);
        target.body.allowGravity = true; target.clearTint();
        scheduleNextLaser(scene); 
    });
}

// scheduleNextLaser 已搬移至 boss/LoliAttacks.js


// 觸發無敵模式並移動到畫面中間偏上
function triggerInvincibleMode(scene, target) {
    target.isSuperInvincible = true;
    target.isHit = false; // 取消受擊狀態
    target.setTint(0x800080); // 變紫效果
    target.body.allowGravity = false; // 取消重力
    target.body.setImmovable(true); // 變成不動的物體 (就像空中的地板，玩家可以站上去，不會被物理擊退)
    target.isScaling = false; // 初始化放大標記
    
    // 清除畫面上所有的攻擊與警告線（委派給 LoliAttacks 模組）
    clearAllAttacks(scene);
    
    // 最近路徑走到螢幕中心偏上 (高度 1/4 處，即距離底部 3/4)
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 4;
    scene.physics.moveTo(target, centerX, centerY, 500); // 以速度 500 移動
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
