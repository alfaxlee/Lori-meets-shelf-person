const config = {
    type: Phaser.AUTO,
    // 設定固定邏輯解析度，確保所有裝置看到的空間一致
    width: 1280,
    height: 720,
    backgroundColor: '#ffffff',
    scale: {
        // 使用 FIT 模式自動等比例縮放以填滿螢幕
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player; 
let loli; 
let keys;
let platforms;
let ground;
let mgBullets;
let sgBullets;
let snBullets; 

// --- 彈弓系統變數 ---
let mgAmmo = 72; 
let mgMaxAmmo = 72; 
let mgIsReloading = false;
let lastMgFired = 0;
let mgFireRate = 100;
let mgText;

// --- 霰彈槍系統變數 ---
let sgAmmo = 5;
let sgMaxAmmo = 5;
let sgIsReloading = false;
let lastSgFired = 0;
let sgFireRate = 500;
let sgText;

// --- 狙擊槍系統變數 ---
let snAmmo = 5;
let snMaxAmmo = 5;
let snIsReloading = false;
let lastSnFired = 0;
let snFireRate = 1500; 
let snText;
let shockwaves; // 衝擊波群組
let lasers;    // 雷射攻擊群組
let enemyBalls; // 敵人彈跳球群組

// --- 衝刺系統變數 (新增) ---
let dashEnergy = 100;
let maxDashEnergy = 100;
let dashCost = 33; // 減少衝刺消耗，在不回復的情況下可衝刺三次 (修改)
let energyRegen = 0.5;
let isDashing = false;
let isInvincible = false; // 新增：衝刺無敵狀態
let energyBar;
let dashEnergyColor = 0x00ffff; // 衝刺能量條顏色 (新增)

// --- 蘿莉遇櫃人 血量與狀態變數 ---
let loliHP = 600;
let loliMaxHP = 600;
let loliHPText;

// --- 控制變數 ---
let isActuallyMobile = false; // 真實手機偵測
let forceControls = true;     // 是否強制顯示搖桿 (依要求設為 true)
let mobileInput = { left: false, right: false, up: false, fireMg: false, fireSg: false, fireSn: false, reload: false, dash: false };
let joystickBase;
let joystickThumb;

function preload() {
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
    this.load.image('shabi', './assets/images/shabi.png');
    this.load.image('蘿莉遇櫃人', './assets/images/羅莉抓人.png');
    this.load.image('loliWin', './assets/images/蘿莉過關圖.png'); // 載入狂暴模式背景圖 (蘿莉過關圖)
}

function create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // 啟用多點觸控 (最多支援 5 點同時操作)
    this.input.addPointer(5);

    // 更好的手機偵測方式：結合 UserAgent 與觸控支援
    isActuallyMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || !this.sys.game.device.os.desktop;

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

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(loli, platforms); 
    
    // 子彈碰撞邏輯
    this.physics.add.collider(mgBullets, platforms);
    this.physics.add.collider(sgBullets, platforms);
    this.physics.add.collider(snBullets, platforms, (bullet) => { bullet.destroy(); });

    // 敵人彈跳球碰撞邏輯
    this.physics.add.collider(enemyBalls, platforms); // 碰到地板會反彈
    this.physics.add.collider(enemyBalls, [mgBullets, sgBullets, snBullets], (ball, bullet) => {
        bullet.destroy(); // 玩家子彈消失
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
    const triggerCrash = () => {
        if (isInvincible) return; // 衝刺/護盾期間無敵 (修改)
        this.physics.pause();
        this.scene.pause();
        const crashScreen = document.createElement('div');
        crashScreen.className = 'bsod-container'; // 使用 CSS class
        crashScreen.innerHTML = `
            <div class="bsod-content">
                <div class="bsod-smiley">:(</div>
                <h1 class="bsod-message">不明錯誤，我們將盡力幫您修復，若無法修復請上: <a href="https://alfaxlee.github.io/problemsolving/">https://alfaxlee.github.io/problemsolving/</a></h1>
                <div id="progress-row" class="bsod-progress">修復中<span id="progress-percent">0</span>% 完成</div>
                <div class="bsod-footer">
                    <img src="./assets/images/qr%20code.png" class="bsod-qr">
                    <div class="bsod-details">
                        <p>搜尋此錯誤:</p>
                        <p class="bsod-error-code">CRITICAL_PROCESS_DIED_BY_LOLI</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(crashScreen);
        let percent = 0;
        const startTime = Date.now();
        const updatePercent = () => {
            percent = Math.min(Math.floor(((Date.now() - startTime) / 5000) * 100), 100);
            const progressPercent = document.getElementById('progress-percent');
            if (progressPercent) progressPercent.innerText = percent;

            if (percent < 100) {
                requestAnimationFrame(updatePercent);
            } else {
                // 當修復到 100% 時，背景切換為彩色電視，並將文字改為「錯誤」
                crashScreen.classList.add('tv-background'); 
                const progressRow = document.getElementById('progress-row');
                if (progressRow) {
                    progressRow.innerText = '錯誤';
                    progressRow.style.color = 'black'; // 背景變彩色後，黑色文字可能更清楚
                }
            }
        };
        requestAnimationFrame(updatePercent);
    };
    this.triggerCrash = triggerCrash; // 將當機函式掛載到場景，供外部雷射函式使用 (新增)

    this.physics.add.collider(player, loli, () => {
        if (!loli.isBerserk) triggerCrash(); // 狂暴模式下碰到玩家沒事
    });
    this.physics.add.overlap(player, shockwaves, triggerCrash); // 玩家碰到衝擊波也會當機
    this.physics.add.overlap(player, lasers, triggerCrash);     // 玩家碰到紫色雷射也會當機
    this.physics.add.overlap(player, enemyBalls, triggerCrash); // 玩家碰到彈跳球也會當機

    // 設定隨機雷射計時器 (3-7 秒觸發一次)
    scheduleNextLaser(this);

    // 設定敵人彈跳球計時器 (一般模式頻率降低)
    const scheduleNextBall = () => {
        const delay = loli.isBerserk ? 2000 : Phaser.Math.Between(15000, 25000); // 一般模式從 10-15s 增加到 15-25s (修改)
        this.time.delayedCall(delay, () => {
            // 暫時取消狂暴模式的丟球攻擊，僅在一般模式執行 (修改)
            if (!loli.isBerserk) {
                spawnEnemyBall(this);
            } else {
                // spawnEnemyBall(this); // 狂暴模式丟球暫時註解，之後會加回去
            }
            scheduleNextBall();
        });
    };
    scheduleNextBall();

    // 監聽視窗縮放事件，自動調整手機控制項位置 (新增)
    this.scale.on('resize', () => {
        repositionMobileControls(this);
    });

    // 只有在真實手機裝置上才建立控制項 (修改：確保電腦版不顯示)
    if (isActuallyMobile) {
        setupMobileControls(this);
    }

    // UI
    mgText = this.add.text(20, 20, `Slingshot: ${mgAmmo}/${mgMaxAmmo}`, { fontSize: '20px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
    sgText = this.add.text(width - 20, 20, `Shotgun: ${sgAmmo}/${sgMaxAmmo}`, { fontSize: '20px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0);
    snText = this.add.text(width / 2, 20, `Sniper: ${snAmmo}/${snMaxAmmo}`, { fontSize: '20px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
    loliHPText = this.add.text(width / 2, 60, `蘿莉血量: ${loliHP}`, { fontSize: '30px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);

    // 能量條 UI (新增)
    energyBar = this.add.graphics();

    this.physics.add.collider(loli, mgBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 600, 200, 5); });
    this.physics.add.collider(loli, sgBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 400, 150, 25); });
    this.physics.add.collider(loli, snBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 1500, 500, 50); });

    function handleLoliHit(scene, target, bullet, force, stunTime, damage) {
        if (!target.active) return;
        const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
        loliHP -= damage;
        loliHPText.setText(`蘿莉血量: ${loliHP}`);
        
        if (loliHP <= 0) {
            handleLoliDeath(scene, target);
        } else {
            target.isHit = true; 
            target.hitStunTimer = stunTime;
            target.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force - 200);
            target.setTint(0xff0000); 
            scene.cameras.main.shake(100, 0.005);
        }
        bullet.destroy();
    }

    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        reload: Phaser.Input.Keyboard.KeyCodes.R,
        dash: Phaser.Input.Keyboard.KeyCodes.Q // 將衝刺鍵改為 Q
    });
}

function setupMobileControls(scene) {
    const height = scene.cameras.main.height;
    const width = scene.cameras.main.width;
    // 縮小為 2/3 (底座 133, 搖桿頭 67)
    joystickBase = scene.add.circle(180, height - 180, 133, 0x888888, 0.5).setScrollFactor(0).setDepth(1000);
    joystickThumb = scene.add.circle(180, height - 180, 67, 0xcccccc, 0.8).setScrollFactor(0).setDepth(1001).setInteractive();
    scene.input.setDraggable(joystickThumb);
    scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (gameObject === joystickThumb) {
            // 計算拖拽距離與角度，支援多點觸控下的獨立操作
            const dx = dragX - joystickBase.x; 
            const dy = dragY - joystickBase.y;
            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 107);
            const angle = Math.atan2(dy, dx);
            
            gameObject.x = joystickBase.x + Math.cos(angle) * dist;
            gameObject.y = joystickBase.y + Math.sin(angle) * dist;
            
            // 更新移動狀態
            mobileInput.left = (dx < -40); 
            mobileInput.right = (dx > 40); 
            mobileInput.up = (dy < -40);
        }
    });
    scene.input.on('dragend', () => {
        joystickThumb.x = joystickBase.x; joystickThumb.y = joystickBase.y;
        mobileInput.left = mobileInput.right = mobileInput.up = false;
    });
    // 按鈕縮小為 2/3 (半徑改為 93)
    const rx = width - 150; const ry = height - 150;
    createBtn(scene, rx, ry - 240, 'MG', 0xffff00, 'fireMg');
    createBtn(scene, rx - 200, ry - 170, 'SG', 0x00ff00, 'fireSg');
    createBtn(scene, rx - 240, ry, 'SN', 0x00ffff, 'fireSn');
    createBtn(scene, rx, ry, 'RE', 0xff00ff, 'reload');
    createBtn(scene, rx - 440, ry, 'DASH', 0x00ffff, 'dash'); // 新增衝刺按鈕 (新增)
}

function createBtn(scene, x, y, label, color, key) {
    // 按鈕半徑縮小至 93
    const b = scene.add.circle(x, y, 93, color, 0.6).setScrollFactor(0).setDepth(1000).setInteractive();
    // 文字縮小至 27px
    const t = scene.add.text(x, y, label, { fontSize: '27px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    
    // 支援多點觸控的按鈕邏輯
    b.on('pointerdown', (pointer) => { 
        mobileInput[key] = true; 
        b.setAlpha(0.9); 
    });
    b.on('pointerup', (pointer) => { 
        mobileInput[key] = false; 
        b.setAlpha(0.6); 
    });
    b.on('pointerout', (pointer) => { 
        mobileInput[key] = false; 
        b.setAlpha(0.6); 
    });
    
    if (!scene.mobileButtons) scene.mobileButtons = [];
    scene.mobileButtons.push({ btn: b, txt: t, originalOffsetX: scene.cameras.main.width - x, originalOffsetY: scene.cameras.main.height - y });
}

function repositionMobileControls(scene) {
    const width = scene.cameras.main.width; const height = scene.cameras.main.height;
    if (joystickBase) { joystickBase.setPosition(120, height - 120); joystickThumb.setPosition(120, height - 120); }
    if (scene.mobileButtons) {
        scene.mobileButtons.forEach(item => {
            item.btn.setPosition(width - item.originalOffsetX, height - item.originalOffsetY);
            item.txt.setPosition(width - item.originalOffsetX, height - item.originalOffsetY);
        });
    }
}

function update(time, delta) {
    // 能量條 UI 更新 (新增)
    energyBar.clear();
    energyBar.fillStyle(0x888888, 0.8);
    energyBar.fillRect(20, 100, 200, 20); // 灰色背景框
    energyBar.fillStyle(dashEnergyColor, 1); // 使用變數決定顏色 (修改)
    energyBar.fillRect(20, 100, 200 * (dashEnergy / maxDashEnergy), 20); // 前進條

    // 能量回復 (新增)
    if (dashEnergy < maxDashEnergy) {
        dashEnergy = Math.min(maxDashEnergy, dashEnergy + energyRegen);
    }

    // 衝刺觸發偵測 (新增)
    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.dash) || mobileInput.dash;
    if (dashPressed) {
        if (dashEnergy >= dashCost && !isDashing) {
            // 執行衝刺
            dashEnergy -= dashCost;
            isDashing = true;
            isInvincible = true; // 開啟無敵 (新增)
            player.setAlpha(0.5); // 變透明表示衝刺中

            // 決定衝刺方向與動能 (修正：電腦版根據距離決定動能)
            let angle;
            let speed = 1600; // 預設速度
            if (mobileInput.dash) {
                // 手機按鈕觸發：固定往敵人的反方向衝刺
                angle = Phaser.Math.Angle.Between(loli.x, loli.y, player.x, player.y);
            } else {
                // 鍵盤 Q 鍵觸發：朝向滑鼠位置，並根據距離決定動能 (新增)
                const mousePointer = this.input.activePointer;
                angle = Phaser.Math.Angle.Between(player.x, player.y, mousePointer.x, mousePointer.y);
                
                // 計算距離並將其映射至速度 (範圍 800 ~ 2400)
                const dist = Phaser.Math.Distance.Between(player.x, player.y, mousePointer.x, mousePointer.y);
                speed = Phaser.Math.Clamp(dist * 4, 800, 2400); // 距離越遠衝越快
            }
            
            player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            player.body.allowGravity = false; // 衝刺時無視重力

            // 產生反方向的塵埃效果 (新增)
            createDashDust(this, player.x, player.y, angle);
            
            // 產生衝刺防護網效果 (新增)
            createDashShield(this, player, angle);

            // 清除舊的無敵結束計時器 (如果有的話) (新增)
            if (this.invincibilityTimer) this.invincibilityTimer.remove();

            // 150 毫秒後結束物理衝刺狀態，但保持無敵 (修改)
            this.time.delayedCall(150, () => {
                isDashing = false; // 恢復控制
                player.body.allowGravity = true;
                player.setAlpha(0.7); // 稍微變淡表示仍有無敵效果
                
                // 1000 毫秒後真正結束無敵狀態 (新增)
                this.invincibilityTimer = this.time.delayedCall(1000, () => {
                    isInvincible = false;
                    player.setAlpha(1);
                });
            });
        } else if (dashEnergy < dashCost && !isDashing) {
            // 能量不足回饋：變紅並震動
            this.tweens.add({
                targets: energyBar,
                x: '+=5',
                duration: 50,
                yoyo: true,
                repeat: 3,
                onStart: () => { dashEnergyColor = 0xff0000; }, // 改用顏色變數 (修正錯誤)
                onComplete: () => { energyBar.x = 0; dashEnergyColor = 0x00ffff; } // 恢復顏色 (修正錯誤)
            });
        }
        mobileInput.dash = false;
    }

    if (!isDashing) {
        if (this.keys.left.isDown || mobileInput.left) player.setVelocityX(-400);
        else if (this.keys.right.isDown || mobileInput.right) player.setVelocityX(400);
        else player.setVelocityX(0);

        if ((this.keys.up.isDown || mobileInput.up) && player.body.touching.down) player.setVelocityY(-550);
    }

    const pointer = this.input.activePointer;
    
    // 發射邏輯判斷：如果是手機，則完全忽略螢幕點擊 (pointer.leftButtonDown)，只看虛擬按鍵
    const triggerMg = isActuallyMobile ? mobileInput.fireMg : (pointer.leftButtonDown() || mobileInput.fireMg);
    if (triggerMg && !mgIsReloading && mgAmmo > 0) {
        if (time > lastMgFired + mgFireRate) { fireMG(this, pointer, mobileInput.fireMg); lastMgFired = time; }
    }
    
    const triggerSg = isActuallyMobile ? mobileInput.fireSg : (pointer.rightButtonDown() || mobileInput.fireSg);
    if (triggerSg && !sgIsReloading && sgAmmo > 0 && time > lastSgFired + sgFireRate) {
        fireSG(this, pointer, mobileInput.fireSg); lastSgFired = time;
    }
    
    const triggerSn = isActuallyMobile ? mobileInput.fireSn : (pointer.middleButtonDown() || mobileInput.fireSn);
    if (triggerSn && !snIsReloading && snAmmo > 0 && time > lastSnFired + snFireRate) {
        fireSN(this, pointer, mobileInput.fireSn); lastSnFired = time;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.reload) || mobileInput.reload) {
        triggerReload(this); mobileInput.reload = false;
    }

    if (loli.active) {
        // --- 雷射即時碰撞判定 (優化) ---
        // Arcade 物理的 overlap 在靜止物體生成時可能漏判，這裡手動檢查矩形重疊 (新增)
        lasers.getChildren().forEach(laser => {
            const playerBounds = player.getBounds();
            const laserBounds = laser.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, laserBounds)) {
                this.triggerCrash();
            }
        });

        // --- 狂暴模式狀態偵測 ---
        if (loliHP < 150 && !loli.isBerserk) {
            loli.isBerserk = true;
            loli.body.allowGravity = false; // 進入飛行模式，取消重力
            loli.setTint(0xff0000);        // 變色提醒

            // 建立狂暴模式背景 (#ff00ff)
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;

            // 設置狂暴背景圖 (使用蘿莉過關圖)
            this.berserkBg = this.add.image(width / 2, height / 2, 'loliWin').setDepth(-1);
            this.berserkBg.setDisplaySize(width, height);
            
            // 建立上方天花板
            this.berserkCeiling = this.add.rectangle(width / 2, 10, width, 20, 0xff00ff);
            this.physics.add.existing(this.berserkCeiling, true); // 靜態物體
            
            // 建立下方地板 (覆蓋原本的地板)
            this.berserkFloor = this.add.rectangle(width / 2, height - 50, width, 40, 0xff00ff);
            this.physics.add.existing(this.berserkFloor, true); // 靜態物體

            // 設置玩家與羅莉與新地板/天花板的碰撞
            this.physics.add.collider(player, [this.berserkCeiling, this.berserkFloor]);
            this.physics.add.collider(loli, [this.berserkCeiling, this.berserkFloor]);

            // 設置敵人彈跳球碰到天花板消失 (新增)
            this.physics.add.collider(enemyBalls, this.berserkCeiling, (ball) => {
                ball.destroy(); // 碰到狂暴模式天花板時銷毀
            });
            this.physics.add.collider(enemyBalls, this.berserkFloor); // 碰到地板維持反彈

            // 建立左右兩側的紫色雷射槍 (修改：細管長度加倍至 80，總長維持 400)
            this.berserkGunLeft = this.add.container(0, height / 2);
            const bodyLeft = this.add.rectangle(60, 0, 320, 80, 0xff00ff);
            const barrelLeft = this.add.rectangle(260, 0, 80, 30, 0xff00ff);
            this.berserkGunLeft.add([bodyLeft, barrelLeft]);

            this.berserkGunRight = this.add.container(width, height / 2);
            const bodyRight = this.add.rectangle(-60, 0, 320, 80, 0xff00ff);
            const barrelRight = this.add.rectangle(-260, 0, 80, 30, 0xff00ff);
            this.berserkGunRight.add([bodyRight, barrelRight]);

            // 設定狂暴雷射槍攻擊循環 (修改：頻率改成每兩秒一次，輪流射擊：右 -> 左 -> 右)
            let nextIsLeft = false; // 追蹤下一次該哪邊射擊 (false 為右, true 為左)
            const scheduleBerserkGunAttack = () => {
                if (!loli.active || !loli.isBerserk) return;

                // 決定哪一邊的雷射槍射擊，並切換下一次的目標
                const isLeft = nextIsLeft;
                const targetGun = isLeft ? this.berserkGunLeft : this.berserkGunRight;
                nextIsLeft = !nextIsLeft; // 切換下一次的開火方

                // 1. 隨機決定目標角度 (最大 45 度)
                const targetAngle = Phaser.Math.Between(-45, 45);

                // 2. 快速轉向目標角度 (0.3 秒)
                this.tweens.add({
                    targets: targetGun,
                    angle: targetAngle,
                    duration: 300,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        if (!loli.active || !loli.isBerserk) return;

                        // 3. 射出雷射光 (使用世界座標，避免 Container 內的物理衝突導致光束掉落)
                        const rad = Phaser.Math.DegToRad(targetGun.angle);
                        const offsetX = isLeft ? 260 : -260; // 槍管在 Container 內的偏移量
                        const worldX = targetGun.x + Math.cos(rad) * offsetX;
                        const worldY = targetGun.y + Math.sin(rad) * offsetX;
                        
                        // 1. 預警階段：在發射路徑上先出現一條細紅線 (新增)
                        const laserOrigin = isLeft ? 0 : 1;
                        const warningLine = this.add.rectangle(worldX, worldY, 1500, 2, 0xff0000, 0.5).setOrigin(laserOrigin, 0.5);
                        warningLine.setAngle(targetGun.angle);

                        // 0.5 秒預警後發射正式雷射 (新增)
                        this.time.delayedCall(500, () => {
                            warningLine.destroy(); // 移除預警線

                            if (!loli.active || !loli.isBerserk) return;

                            // 2. 攻擊階段：射出正式雷射光
                            const laser = this.add.rectangle(worldX, worldY, 1500, 20, 0xff00ff, 0.8).setOrigin(laserOrigin, 0.5);
                            laser.setAngle(targetGun.angle); // 設定與槍枝相同的角度
                            
                            this.physics.add.existing(laser);
                            lasers.add(laser);

                            // 確保玩家碰到雷射會觸發當機
                            this.physics.add.overlap(player, laser, this.triggerCrash);

                            // 必須在加入群組後設定物理屬性，確保不被群組預設值覆蓋
                            if (laser.body) {
                                laser.body.allowGravity = false; // 禁用重力，防止光束往下掉
                                laser.body.immovable = true;     // 確保光束固定
                                laser.body.setVelocity(0, 0);    // 強制速度為零
                            }

                            // 3. 殘留 0.5 秒後消失
                            this.time.delayedCall(500, () => {
                                laser.destroy();
                                
                                // 4. 每兩秒循環一次 (轉向 0.3s + 預警 0.5s + 殘留 0.5s + 延遲 0.7s = 2.0s) (修改延遲)
                                if (loli.isBerserk) {
                                    this.time.delayedCall(700, scheduleBerserkGunAttack);
                                }
                            });
                        });
                    }
                });
            };
            scheduleBerserkGunAttack();

            // 立即啟動狂暴模式的連鎖雷射
            spawnLaser(this);
        }

        if (loli.isHit) {
            loli.hitStunTimer -= delta; if (loli.hitStunTimer <= 0) { loli.isHit = false; loli.isBerserk ? loli.setTint(0xff0000) : loli.clearTint(); }
        } else if (loli.isBerserk) {
            // --- 狂暴飛行移動模式 ---
            // 使用正弦波產生在空中的飛行軌跡 (x: 左右, y: 上下)
            loli.setVelocityX(Math.sin(time / 500) * 400);
            loli.setVelocityY(Math.cos(time / 1000) * 200);
        } else {
            // --- 一般地面移動模式 ---
            if (loli.x < player.x) loli.setVelocityX(200); else if (loli.x > player.x) loli.setVelocityX(-200);
            else loli.setVelocityX(0);
            
            // 偵測落地
            if (loli.body.touching.down) {
                if (loli.wasInAir) {
                    const fallDistance = Math.max(0, loli.y - loli.highestY);
                    createShockwaves(this, loli.x, loli.y + loli.displayHeight / 2, fallDistance);
                    loli.wasInAir = false;
                }
            } else {
                if (!loli.wasInAir) {
                    loli.highestY = loli.y; // 開始跳躍/墜落時記錄起始高度
                    loli.wasInAir = true;
                } else {
                    loli.highestY = Math.min(loli.highestY, loli.y); // 記錄在空中的最高點
                }
            }

            if (player.y < loli.y - 50 && loli.body.touching.down) loli.setVelocityY(-275);
        }
    }
}

// 建立落地衝擊波 (根據摔落高度決定大小)
function createShockwaves(scene, x, y, fallHeight) {
    // 根據高度計算縮放係數 (基本 0.5, 每 100 像素增加一些)
    const scaleFactor = Math.min(2.5, 0.5 + (fallHeight / 200));
    const directions = [-1, 1];
    const angleRad = Phaser.Math.DegToRad(25); // 設定為 25 度
    
    directions.forEach(dir => {
        // 基礎尺寸 80x40，再乘以縮放係數
        const sw = scene.add.rectangle(x, y - 20, 80 * scaleFactor, 40 * scaleFactor, 0xffffff, 0.8);
        scene.physics.add.existing(sw);
        shockwaves.add(sw);
        
        sw.body.allowGravity = false;
        // 速度隨高度增加，並使用三角函數計算 25 度角的分量
        const speed = 400 + (fallHeight * 0.6);
        sw.body.setVelocity(dir * speed * Math.cos(angleRad), -speed * Math.sin(angleRad));
        
        // 旋轉矩形使其對齊移動方向 (25 度)
        // dir 為 1 時（右邊）旋轉為負，dir 為 -1 時（左邊）旋轉為正
        const rotation = dir === 1 ? -angleRad : angleRad;
        sw.setRotation(rotation);
        
        // 衝擊波生命週期：變大並淡出
        scene.tweens.add({
            targets: sw,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 500 + (fallHeight * 0.5),
            onComplete: () => {
                sw.destroy();
            }
        });
    });
}

function triggerReload(scene, weaponType) {
    // 彈弓填裝 (Slingshot / MG)
    if ((!weaponType || weaponType === 'mg') && mgAmmo < mgMaxAmmo && !mgIsReloading) {
        mgIsReloading = true; mgText.setText('RELOADING...');
        scene.time.delayedCall(3000, () => { 
            mgAmmo = mgMaxAmmo; mgIsReloading = false; 
            mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`); 
        });
    }
    // 霰彈槍填裝 (Shotgun / SG)
    if ((!weaponType || weaponType === 'sg') && sgAmmo < sgMaxAmmo && !sgIsReloading) {
        sgIsReloading = true; sgText.setText('RELOADING...');
        scene.time.delayedCall(1000, () => { 
            sgAmmo = sgMaxAmmo; sgIsReloading = false; 
            sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`); 
        });
    }
    // 狙擊槍填裝 (Sniper / SN)
    if ((!weaponType || weaponType === 'sn') && snAmmo < snMaxAmmo && !snIsReloading) {
        snIsReloading = true; snText.setText('RELOADING...');
        scene.time.delayedCall(5000, () => { 
            snAmmo = snMaxAmmo; snIsReloading = false; 
            snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`); 
        });
    }
}

function fireMG(scene, pointer, autoAim) {
    let angle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = mgBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.05).setVelocity(Math.cos(angle) * 1200, Math.sin(angle) * 1200).setCollideWorldBounds(true).setBounce(1);
        bullet.body.onWorldBounds = true; mgAmmo--; mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`);
        if (mgAmmo <= 0) triggerReload(scene, 'mg'); // 只填裝彈弓
    }
}

function fireSG(scene, pointer, autoAim) {
    let centerAngle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const spread = Phaser.Math.DegToRad(18);
    for (let i = -2; i <= 2; i++) {
        const angle = centerAngle + (i * spread);
        const bullet = sgBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
        if (bullet) {
            bullet.setScale(0.05).setVelocity(Math.cos(angle) * 700, Math.sin(angle) * 700).body.allowGravity = false;
            bullet.setCollideWorldBounds(true).setBounce(0.9); bullet.body.onWorldBounds = true;
        }
    }
    sgAmmo -= 5; if (sgAmmo < 0) sgAmmo = 0; sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`);
    if (sgAmmo <= 0) triggerReload(scene, 'sg'); // 只填裝霰彈槍
}

function fireSN(scene, pointer, autoAim) {
    let angle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = snBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.1, 0.025).setRotation(angle).setVelocity(Math.cos(angle) * 1500, Math.sin(angle) * 1500).body.allowGravity = false;
        bullet.setCollideWorldBounds(true); bullet.body.onWorldBounds = true; snAmmo--; snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`);
        if (snAmmo <= 0) triggerReload(scene, 'sn'); // 只填裝狙擊槍
    }
}

/**
 * 隨機天降雷射攻擊
 * @param {Phaser.Scene} scene - Phaser 場景實例
 */
function spawnLaser(scene) {
    if (!loli.active) return;

    // 狂暴模式固定 1 個雷射，一般模式隨機 1 到 3 個
    const laserCount = loli.isBerserk ? 1 : Phaser.Math.Between(1, 3); 
    const height = scene.cameras.main.height;
    const width = scene.cameras.main.width;
    
    // 狂暴模式下預警時間約 0.5s，一般模式約 1s (修改)
    const warningDuration = loli.isBerserk ? 85 : 167; // 配合 yoyo 和 repeat: 5 (共 6 段)

    for (let i = 0; i < laserCount; i++) {
        const randomX = Phaser.Math.Between(50, 1230); // 隨機 X 位置

        // 預警階段：閃爍的紅線 (縱向)
        const warningLineV = scene.add.rectangle(randomX, height / 2, 2, height, 0xff0000, 0.5);
        
        // 快速閃爍效果 (縱向)
        scene.tweens.add({
            targets: warningLineV,
            alpha: 0,
            duration: warningDuration,
            yoyo: true,
            repeat: 5, 
            onComplete: () => {
                warningLineV.destroy(); // 移除預警線

                // 攻擊階段：降下雷射 (寬 25px，使用要求的顏色 #ff00ff)
                const laserV = scene.add.rectangle(randomX, height / 2, 25, height, 0xff00ff);
                scene.physics.add.existing(laserV);
                lasers.add(laserV);

                // 確保玩家碰到天降雷射也會當機 (新增)
                scene.physics.add.overlap(player, laserV, scene.triggerCrash);

                laserV.body.allowGravity = false;
                laserV.body.setImmovable(true);

                // 雷射攻擊持續 0.5 秒後消失
                scene.time.delayedCall(500, () => {
                    laserV.destroy();
                    
                    // 狂暴模式：射完立刻提醒下一個雷射 (連鎖觸發)
                    if (loli.isBerserk && i === laserCount - 1) {
                        spawnLaser(scene);
                    }
                });
            }
        });
    }
}

/**
 * 隨機投擲彈跳球攻擊
 * @param {Phaser.Scene} scene - Phaser 場景實例
 */
function spawnEnemyBall(scene) {
    if (!loli.active) return;
    
    // 狂暴模式一次丟 5 顆，一般模式 1 顆
    const ballCount = loli.isBerserk ? 5 : 1;
    
    for (let i = 0; i < ballCount; i++) {
        // 從敵人的位置出發
        const x = loli.x;
        const y = loli.y;
        
        // 建立 ff00ff 的圓球 (半徑 15)
        const ball = scene.add.circle(x, y, 15, 0xff00ff);
        scene.physics.add.existing(ball);
        enemyBalls.add(ball);
        
        // 隨機角度投擲 (0 到 360 度)
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = 400;
        
        // 設定物理屬性
        ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        ball.body.setBounce(1, 1); // 完全彈跳
        ball.body.setCollideWorldBounds(true);
        ball.body.onWorldBounds = true; // 觸發事件以利碰到牆壁銷毀
    }
}

/**
 * 建立衝刺塵埃效果
 * @param {Phaser.Scene} scene - Phaser 場景實例
 * @param {number} x - 塵埃產生的 X 座標
 * @param {number} y - 塵埃產生的 Y 座標
 * @param {number} dashAngle - 衝刺的角度 (弧度)
 */
function createDashDust(scene, x, y, dashAngle) {
    const dustCount = 32; // 增加塵埃數量 (從 12 增加到 32)
    const oppositeAngle = dashAngle + Math.PI; // 塵埃噴向衝刺的反方向

    for (let i = 0; i < dustCount; i++) {
        // 隨機擴散角度、初速與粒子尺寸
        const spread = Phaser.Math.FloatBetween(-0.6, 0.6); // 增加擴散範圍
        const speed = Phaser.Math.Between(100, 600);       // 增加速度範圍
        const size = Phaser.Math.Between(6, 12);           // 增加尺寸 (從 4-8 增加到 6-12)
        
        // 建立灰黑色塵埃粒子 (使用矩形模擬) (修改顏色)
        const dust = scene.add.rectangle(x, y, size, size, 0x333333, 0.8);
        scene.physics.add.existing(dust);
        
        dust.body.allowGravity = false; // 塵埃不受重力影響
        dust.body.setVelocity(
            Math.cos(oppositeAngle + spread) * speed,
            Math.sin(oppositeAngle + spread) * speed
        );

        // 隨機初始旋轉角度
        dust.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

        // 漸變消失動畫
        scene.tweens.add({
            targets: dust,
            alpha: 0,
            scale: 0.2,
            duration: Phaser.Math.Between(400, 800),
            ease: 'Cubic.easeOut',
            onComplete: () => {
                dust.destroy(); // 動畫結束後銷毀粒子
            }
        });
    }
}

/**
 * 建立衝刺防護網效果 (新增)
 * @param {Phaser.Scene} scene - Phaser 場景實例
 * @param {Phaser.GameObjects.Sprite} player - 玩家實例
 * @param {number} angle - 衝刺的角度 (弧度)
 */
function createDashShield(scene, player, angle) {
    const shield = scene.add.graphics();
    let hasHit = false; // 確保每次衝刺只會對蘿莉造成一次傷害
    let alive = true; // 新增：控制護盾生命週期
    
    // 150ms 衝刺 + 1000ms 殘留 = 1150ms (新增)
    scene.time.delayedCall(1150, () => {
        alive = false;
    });

    // 使用 update 事件讓護盾跟隨玩家
    const onUpdate = () => {
        if (!alive || !player.active) { // 修改：改用 alive 判斷
            shield.destroy();
            scene.events.off('update', onUpdate);
            return;
        }

        shield.clear();
        shield.lineStyle(2, 0x00ffff, 0.6); // 使用 #00ffff 防護網顏色

        // 調整護盾位置：向衝刺方向偏移，使其不碰到玩家 (新增偏移)
        const offset = 35;
        const centerX = player.x + Math.cos(angle) * offset;
        const centerY = player.y + Math.sin(angle) * offset;

        const radius = 65; // 稍微加大護盾半徑
        const arcRange = Math.PI / 1.2; // 約 150 度
        const startAngle = angle - arcRange / 2;
        const endAngle = angle + arcRange / 2;

        // 畫出網格感
        // 1. 多重圓弧線
        for (let r = 25; r <= radius; r += 20) {
            shield.beginPath();
            shield.arc(centerX, centerY, r, startAngle, endAngle);
            shield.strokePath();
        }

        // 2. 放射狀網格線
        const segments = 6;
        for (let i = 0; i <= segments; i++) {
            const currentAngle = startAngle + (arcRange / segments) * i;
            const x1 = centerX + Math.cos(currentAngle) * 15;
            const y1 = centerY + Math.sin(currentAngle) * 15;
            const x2 = centerX + Math.cos(currentAngle) * radius;
            const y2 = centerY + Math.sin(currentAngle) * radius;
            shield.lineBetween(x1, y1, x2, y2);
        }
        
        // 增加發光感
        shield.lineStyle(1, 0x00ffff, 1);
        shield.beginPath();
        shield.arc(centerX, centerY, radius, startAngle, endAngle);
        shield.strokePath();

        // --- 碰撞偵測 (新增) ---
        if (!hasHit && loli.active) {
            const dist = Phaser.Math.Distance.Between(centerX, centerY, loli.x, loli.y);
            // 當蘿莉靠近護盾中心點且在護盾範圍內時觸發
            if (dist < radius + 40) {
                // 模擬狙擊槍的擊退與傷害 (傷害 25)
                const hitAngle = Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y);
                const force = 1500; // 狙擊槍強度的擊退
                const stunTime = 500;
                const damage = 25;

                loliHP -= damage;
                loliHPText.setText(`蘿莉血量: ${loliHP}`);
                
                loli.isHit = true;
                loli.hitStunTimer = stunTime;
                loli.setVelocity(Math.cos(hitAngle) * force, Math.sin(hitAngle) * force - 200);
                loli.setTint(0xff0000);
                scene.cameras.main.shake(100, 0.005);
                
                // 如果血量歸零，觸發全域死亡邏輯 (修正 Bug)
                if (loliHP <= 0) {
                    handleLoliDeath(scene, loli);
                }

                hasHit = true; // 標記已命中
            }
        }
    };

    scene.events.on('update', onUpdate);
}

/**
 * 處理蘿莉死亡與重生邏輯 (新增)
 * @param {Phaser.Scene} scene 
 * @param {Phaser.GameObjects.Sprite} target 
 */
function handleLoliDeath(scene, target) {
    target.setActive(false).setVisible(false).body.enable = false;
    scene.cameras.main.flash(500, 255, 0, 0);

    // 羅莉死後立刻清除羅莉發出的所有攻擊
    if (shockwaves) shockwaves.clear(true, true);
    if (lasers) lasers.clear(true, true);
    if (enemyBalls) enemyBalls.clear(true, true);

    scene.time.delayedCall(3000, () => {
        loliHP = loliMaxHP; 
        loliHPText.setText(`蘿莉血量: ${loliHP}`);
        target.setActive(true).setVisible(true).body.enable = true;
        target.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 150);
        
        // 復活後取消狂暴模式並清除相關場景物件
        target.isBerserk = false;
        if (scene.berserkBg) { scene.berserkBg.destroy(); scene.berserkBg = null; }
        if (scene.berserkCeiling) { scene.berserkCeiling.destroy(); scene.berserkCeiling = null; }
        if (scene.berserkFloor) { scene.berserkFloor.destroy(); scene.berserkFloor = null; }
        if (scene.berserkGunLeft) { scene.berserkGunLeft.destroy(); scene.berserkGunLeft = null; }
        if (scene.berserkGunRight) { scene.berserkGunRight.destroy(); scene.berserkGunRight = null; }

        target.body.allowGravity = true; // 恢復重力
        target.clearTint();              // 清除受擊顏色
        scheduleNextLaser(scene);        // 重啟一般模式雷射計時器
    });
}

/**
 * 設定隨機雷射計時器 (原本在 create 內，改為全域)
 * @param {Phaser.Scene} scene 
 */
function scheduleNextLaser(scene) {
    // 如果進入狂暴模式，雷射邏輯會轉由 spawnLaser 內部連鎖觸發
    if (loli.isBerserk) return; 

    const delay = Phaser.Math.Between(3000, 7000);
    scene.time.delayedCall(delay, () => {
        spawnLaser(scene);
        scheduleNextLaser(scene);
    });
}
