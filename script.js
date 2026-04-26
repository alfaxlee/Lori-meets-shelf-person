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

// --- 蘿莉遇櫃人 血量與狀態變數 ---
let loliHP = 600;
let loliMaxHP = 600;
let loliHPText;

// --- 控制變數 ---
let isActuallyMobile = false; // 真實手機偵測
let forceControls = true;     // 是否強制顯示搖桿 (依要求設為 true)
let mobileInput = { left: false, right: false, up: false, fireMg: false, fireSg: false, fireSn: false, reload: false };
let joystickBase;
let joystickThumb;

function preload() {
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
    this.load.image('shabi', './assets/images/shabi.png');
    this.load.image('蘿莉遇櫃人', './assets/images/羅莉抓人.png');
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

    loli = this.physics.add.sprite(width / 4, height - 150, '蘿莉遇櫃人');
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

    this.physics.world.on('worldbounds', (body) => {
        const obj = body.gameObject;
        if (obj && (mgBullets.contains(obj) || sgBullets.contains(obj) || snBullets.contains(obj) || shockwaves.contains(obj) || enemyBalls.contains(obj))) {
            obj.destroy(); // 子彈或彈跳球碰到牆壁 (世界邊界) 就消失
        }
    });

    // 當機畫面 (處理玩家死亡/受傷)
    const triggerCrash = () => {
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

    this.physics.add.collider(player, loli, () => {
        if (!loli.isBerserk) triggerCrash(); // 狂暴模式下碰到玩家沒事
    });
    this.physics.add.overlap(player, shockwaves, triggerCrash); // 玩家碰到衝擊波也會當機
    this.physics.add.overlap(player, lasers, triggerCrash);     // 玩家碰到紫色雷射也會當機
    this.physics.add.overlap(player, enemyBalls, triggerCrash); // 玩家碰到彈跳球也會當機

    // 設定隨機雷射計時器 (3-7 秒觸發一次)
    const scheduleNextLaser = () => {
        // 如果進入狂暴模式，雷射邏輯會轉由 spawnLaser 內部連鎖觸發
        if (loli.isBerserk) return; 

        const delay = Phaser.Math.Between(3000, 7000);
        this.time.delayedCall(delay, () => {
            spawnLaser(this);
            scheduleNextLaser();
        });
    };
    scheduleNextLaser();

    // 設定敵人彈跳球計時器 (狂暴模式頻率上升)
    const scheduleNextBall = () => {
        const delay = loli.isBerserk ? 2000 : Phaser.Math.Between(10000, 15000);
        this.time.delayedCall(delay, () => {
            spawnEnemyBall(this);
            scheduleNextBall();
        });
    };
    scheduleNextBall();

    // 只有在手機上才建立控制項，電腦上隱藏
    if (isActuallyMobile) {
        setupMobileControls(this);
    }

    // UI
    mgText = this.add.text(20, 20, `Slingshot: ${mgAmmo}/${mgMaxAmmo}`, { fontSize: '20px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
    sgText = this.add.text(width - 20, 20, `Shotgun: ${sgAmmo}/${sgMaxAmmo}`, { fontSize: '20px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0);
    snText = this.add.text(width / 2, 20, `Sniper: ${snAmmo}/${snMaxAmmo}`, { fontSize: '20px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
    loliHPText = this.add.text(width / 2, 60, `蘿莉血量: ${loliHP}`, { fontSize: '30px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);

    this.physics.add.collider(loli, mgBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 600, 200, 5); });
    this.physics.add.collider(loli, sgBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 400, 150, 25); });
    this.physics.add.collider(loli, snBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 1500, 500, 50); });

    function handleLoliHit(scene, target, bullet, force, stunTime, damage) {
        if (!target.active) return;
        const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
        loliHP -= damage;
        loliHPText.setText(`蘿莉血量: ${loliHP}`);
        if (loliHP <= 0) {
            target.setActive(false).setVisible(false).body.enable = false;
            scene.cameras.main.flash(500, 255, 0, 0);

            // 羅莉死後立刻清除羅莉發出的所有攻擊，但不清除玩家的子彈
            if (shockwaves) shockwaves.clear(true, true);
            if (lasers) lasers.clear(true, true);
            if (enemyBalls) enemyBalls.clear(true, true);

            scene.time.delayedCall(3000, () => {
                loliHP = loliMaxHP; loliHPText.setText(`蘿莉血量: ${loliHP}`);
                target.setActive(true).setVisible(true).body.enable = true;
                target.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 150);
                
                // 復活後取消狂暴模式
                target.isBerserk = false;
                target.body.allowGravity = true; // 恢復重力
                target.clearTint();              // 清除紅色濾鏡
                scheduleNextLaser();             // 重啟一般模式雷射計時器
            });
        }
        target.isHit = true; target.hitStunTimer = stunTime;
        target.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force - 200);
        target.setTint(0xff0000); scene.cameras.main.shake(100, 0.005);
        bullet.destroy();
    }

    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        reload: Phaser.Input.Keyboard.KeyCodes.R
    });

    // 移除手動 resize 監聽器，讓 FIT 模式自動處理縮放，保持 1280x720 的物體比例一致
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
    if (this.keys.left.isDown || mobileInput.left) player.setVelocityX(-400);
    else if (this.keys.right.isDown || mobileInput.right) player.setVelocityX(400);
    else player.setVelocityX(0);
    if ((this.keys.up.isDown || mobileInput.up) && player.body.touching.down) player.setVelocityY(-550);

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
        // --- 狂暴模式狀態偵測 ---
        if (loliHP < 150 && !loli.isBerserk) {
            loli.isBerserk = true;
            loli.body.allowGravity = false; // 進入飛行模式，取消重力
            loli.setTint(0xff0000);        // 變色提醒
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
    
    // 狂暴模式下預警時間減半 (0.5s)，一般模式 1s
    const warningDuration = loli.isBerserk ? 50 : 100; // 配合 yoyo 和 repeat

    for (let i = 0; i < laserCount; i++) {
        const randomX = Phaser.Math.Between(50, 1230); // 隨機 X 位置

        // 預警階段：閃爍的紅線
        const warningLine = scene.add.rectangle(randomX, height / 2, 2, height, 0xff0000, 0.5);
        
        // 快速閃爍效果
        scene.tweens.add({
            targets: warningLine,
            alpha: 0,
            duration: warningDuration,
            yoyo: true,
            repeat: 5, 
            onComplete: () => {
                warningLine.destroy(); // 移除預警線

                // 攻擊階段：降下雷射 (寬 25px，使用要求的顏色 #ff00ff)
                const laser = scene.add.rectangle(randomX, height / 2, 25, height, 0xff00ff);
                scene.physics.add.existing(laser);
                lasers.add(laser);

                laser.body.allowGravity = false;
                laser.body.setImmovable(true);

                // 雷射攻擊持續 0.5 秒後消失
                scene.time.delayedCall(500, () => {
                    laser.destroy();
                    
                    // 狂暴模式：射完立刻提醒下一個雷射 (連鎖觸發)
                    // 為了避免瞬間產生過多物件，只讓循環中的最後一個觸發下一次
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
