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
    
    // 點擊畫面時嘗試進入全螢幕
    this.input.on('pointerdown', () => {
        if (!this.scale.isFullscreen) {
            this.scale.startFullscreen();
        }
    });

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

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(loli, platforms); 
    
    // 子彈碰撞邏輯
    this.physics.add.collider(mgBullets, platforms);
    this.physics.add.collider(sgBullets, platforms);
    this.physics.add.collider(snBullets, platforms, (bullet) => { bullet.destroy(); });

    this.physics.world.on('worldbounds', (body) => {
        const obj = body.gameObject;
        if (obj && (mgBullets.contains(obj) || sgBullets.contains(obj) || snBullets.contains(obj))) {
            obj.destroy();
        }
    });

    // 當機畫面
    this.physics.add.collider(player, loli, () => {
        this.physics.pause();
        this.scene.pause();
        const crashScreen = document.createElement('div');
        crashScreen.style.position = 'fixed';
        crashScreen.style.top = '0';
        crashScreen.style.left = '0';
        crashScreen.style.width = '100vw';
        crashScreen.style.height = '100vh';
        crashScreen.style.backgroundColor = '#0000ff';
        crashScreen.style.zIndex = '10000';
        crashScreen.style.overflow = 'hidden';
        crashScreen.innerHTML = `
            <div id="bsod-content" style="padding: 10%; color: white; font-family: sans-serif;">
                <div style="font-size: 80px; line-height: 1;">:(</div>
                <h1 style="font-size: 24px; font-weight: 300;">您的電腦發生問題，必須重新啟動。</h1>
                <div style="margin-top: 30px; font-size: 20px;"><span id="progress-percent">0</span>% 完成</div>
                <div style="margin-top: 40px; display: flex;">
                    <img src="./assets/images/遊戲QR code.png?t=${Date.now()}" style="width: 100px; height: 100px; background: white; padding: 5px;">
                    <div style="margin-left: 20px; font-size: 14px;">
                        <p>搜尋此錯誤:</p>
                        <p style="font-weight: bold;">CRITICAL_PROCESS_DIED_BY_LOLI</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(crashScreen);
        let percent = 0;
        const startTime = Date.now();
        const updatePercent = () => {
            percent = Math.min(Math.floor(((Date.now() - startTime) / 5000) * 100), 100);
            document.getElementById('progress-percent').innerText = percent;
            if (percent < 100) requestAnimationFrame(updatePercent);
            else {
                document.getElementById('bsod-content').style.display = 'none';
                // 將背景設為純藍色並移除嚇人圖片
                crashScreen.style.backgroundImage = 'none';
                crashScreen.style.backgroundColor = '#0000ff';
            }
        };
        requestAnimationFrame(updatePercent);
        throw new Error("Game Over");
    });

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
            scene.time.delayedCall(3000, () => {
                loliHP = loliMaxHP; loliHPText.setText(`蘿莉血量: ${loliHP}`);
                target.setActive(true).setVisible(true).body.enable = true;
                target.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 150);
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
            const dx = dragX - joystickBase.x; const dy = dragY - joystickBase.y;
            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 107);
            const angle = Math.atan2(dy, dx);
            gameObject.x = joystickBase.x + Math.cos(angle) * dist;
            gameObject.y = joystickBase.y + Math.sin(angle) * dist;
            mobileInput.left = (dx < -40); mobileInput.right = (dx > 40); mobileInput.up = (dy < -40);
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
    b.on('pointerdown', () => { mobileInput[key] = true; b.setAlpha(0.9); });
    b.on('pointerup', () => { mobileInput[key] = false; b.setAlpha(0.6); });
    b.on('pointerout', () => { mobileInput[key] = false; b.setAlpha(0.6); });
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
        if (loli.isHit) {
            loli.hitStunTimer -= delta; if (loli.hitStunTimer <= 0) { loli.isHit = false; loli.clearTint(); }
        } else {
            if (loli.x < player.x) loli.setVelocityX(200); else if (loli.x > player.x) loli.setVelocityX(-200);
            else loli.setVelocityX(0);
            if (player.y < loli.y - 50 && loli.body.touching.down) loli.setVelocityY(-275);
        }
    }
}

function triggerReload(scene) {
    if (mgAmmo < mgMaxAmmo && !mgIsReloading) {
        mgIsReloading = true; mgText.setText('RELOADING...');
        scene.time.delayedCall(3000, () => { mgAmmo = mgMaxAmmo; mgIsReloading = false; mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`); });
    }
    if (sgAmmo < sgMaxAmmo && !sgIsReloading) {
        sgIsReloading = true; sgText.setText('RELOADING...');
        scene.time.delayedCall(1000, () => { sgAmmo = sgMaxAmmo; sgIsReloading = false; sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`); });
    }
    if (snAmmo < snMaxAmmo && !snIsReloading) {
        snIsReloading = true; snText.setText('RELOADING...');
        scene.time.delayedCall(5000, () => { snAmmo = snMaxAmmo; snIsReloading = false; snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`); });
    }
}

function fireMG(scene, pointer, autoAim) {
    let angle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = mgBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.05).setVelocity(Math.cos(angle) * 1200, Math.sin(angle) * 1200).setCollideWorldBounds(true).setBounce(1);
        bullet.body.onWorldBounds = true; mgAmmo--; mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`);
        if (mgAmmo <= 0) triggerReload(scene);
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
    if (sgAmmo <= 0) triggerReload(scene);
}

function fireSN(scene, pointer, autoAim) {
    let angle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = snBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.1, 0.025).setRotation(angle).setVelocity(Math.cos(angle) * 1500, Math.sin(angle) * 1500).body.allowGravity = false;
        bullet.setCollideWorldBounds(true); bullet.body.onWorldBounds = true; snAmmo--; snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`);
        if (snAmmo <= 0) triggerReload(scene);
    }
}
