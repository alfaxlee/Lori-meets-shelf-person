const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#ffffff',
    scale: {
        mode: Phaser.Scale.RESIZE,
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

function preload() {
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
    this.load.image('shabi', './assets/images/shabi.png');
    this.load.image('蘿莉遇櫃人', './assets/images/羅莉抓人.png');
}

function create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.input.mouse.disableContextMenu();
    this.physics.world.setBounds(0, 0, width, height, true, true, true, false);

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
    
    // --- 死亡碰撞：碰到蘿莉就讓網頁「當機」 ---
    this.physics.add.collider(player, loli, () => {
        // 暫停物理引擎與場景更新 (停止遊戲)
        this.physics.pause();
        this.scene.pause();
        
        // 建立一個覆蓋全螢幕的當機畫面
        const crashScreen = document.createElement('div');
        crashScreen.id = 'crash-screen';
        crashScreen.style.position = 'fixed';
        crashScreen.style.top = '0';
        crashScreen.style.left = '0';
        crashScreen.style.width = '100vw';
        crashScreen.style.height = '100vh';
        crashScreen.style.backgroundColor = '#0078d7'; // 初始為 Windows 藍屏色
        crashScreen.style.color = 'white';
        crashScreen.style.padding = '10%';
        crashScreen.style.fontFamily = '"Segoe UI", "Microsoft JhengHei", Arial, sans-serif';
        crashScreen.style.zIndex = '10000';
        crashScreen.style.cursor = 'none';
        crashScreen.style.overflow = 'hidden';
        
        // 加入動態百分比與 BSOD 內容
        crashScreen.innerHTML = `
            <div id="bsod-content" style="transition: transform 0.05s; position: relative; z-index: 2;">
                <div style="font-size: 140px; margin-bottom: 20px; line-height: 1;">:(</div>
                <h1 style="font-size: 32px; font-weight: 300; line-height: 1.4; max-width: 800px;">
                    您的電腦發生問題，因此必須重新啟動。<br>
                    我們剛好正在收集某些錯誤資訊，接著我們會為您重新啟動。
                </h1>
                <div style="margin-top: 40px; font-size: 28px; font-weight: 300;">
                    <span id="progress-percent">0</span>% 完成
                </div>
                <div style="margin-top: 60px; display: flex; align-items: flex-start;">
                    <div style="width: 120px; height: 120px; background-color: white; margin-right: 30px; overflow: hidden;">
                        <!-- 使用真實的 QR Code 圖片 (加入時間戳防止緩存) -->
                        <img src="./assets/images/遊戲QR code.png?t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="font-size: 16px; line-height: 1.6;">
                        <p style="margin: 0;">如需詳細資訊，稍後可以搜尋此錯誤:</p>
                        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: 600;">CRITICAL_PROCESS_DIED_BY_LOLI</p>
                    </div>
                </div>
            </div>
            <!-- 故障層 -->
            <div id="glitch-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 255, 0, 0.03)); background-size: 100% 4px, 3px 100%; z-index: 3;"></div>
        `;
        
        document.body.appendChild(crashScreen);

        // --- 逼真動態效果實作 ---
        let percent = 0;
        const percentElement = document.getElementById('progress-percent');
        const contentElement = document.getElementById('bsod-content');
        
        const startTime = Date.now();
        const duration = 5000; // 5 秒內跑完

        // 1. 五秒百分比進度邏輯
        const updatePercent = () => {
            const elapsed = Date.now() - startTime;
            percent = Math.min(Math.floor((elapsed / duration) * 100), 100);
            percentElement.innerText = percent;
            
            if (percent < 100) {
                requestAnimationFrame(updatePercent);
            } else {
                // --- 進度到達 100% 時切換背景並隱藏文字 ---
                contentElement.style.display = 'none'; // 隱藏所有文字與 QR Code
                crashScreen.style.backgroundColor = 'transparent';
                crashScreen.style.backgroundImage = 'url("./assets/images/猴塞雷jumpscare.png")';
                crashScreen.style.backgroundSize = 'cover';
                crashScreen.style.backgroundPosition = 'center';
                
                // 加強閃爍效果
                triggerFinalGlitch();
                clearInterval(glitchInterval); // 停止故障效果計時器
            }
        };
        requestAnimationFrame(updatePercent);

        // 2. 隨機畫面閃爍 (Glitch Effect)
        const glitchInterval = setInterval(() => {
            if (Math.random() > 0.9) {
                contentElement.style.transform = `translate(${Math.random() * 6 - 3}px, ${Math.random() * 6 - 3}px)`;
                if (percent < 100) {
                    crashScreen.style.filter = `hue-rotate(${Math.random() * 10 - 5}deg) brightness(${1 + Math.random() * 0.1})`;
                }
            } else {
                contentElement.style.transform = 'translate(0,0)';
                if (percent < 100) crashScreen.style.filter = 'none';
            }
        }, 50);

        // 3. 最終閃爍 (切換圖片時)
        function triggerFinalGlitch() {
            let count = 0;
            const finalGlitch = setInterval(() => {
                crashScreen.style.filter = count % 2 === 0 ? 'invert(1) contrast(2)' : 'none';
                count++;
                if (count > 6) {
                    clearInterval(finalGlitch);
                    crashScreen.style.filter = 'none';
                }
            }, 50);
        }

        // 拋出一個錯誤來中斷執行
        console.error("KERNEL_SECURITY_CHECK_FAILURE (loli.sys)");
        throw new Error("System Crash: Player caught by loli.");
    });

    this.physics.add.collider(mgBullets, platforms);
    this.physics.add.collider(sgBullets, platforms);
    this.physics.add.collider(snBullets, platforms, (bullet) => { bullet.destroy(); });

    // --- 建立 UI ---
    mgText = this.add.text(20, 20, `Slingshot: ${mgAmmo}/${mgMaxAmmo}`, { fontSize: '22px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
    sgText = this.add.text(width - 20, 20, `Shotgun: ${sgAmmo}/${sgMaxAmmo}`, { fontSize: '22px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0);
    snText = this.add.text(width / 2, 20, `Sniper: ${snAmmo}/${snMaxAmmo}`, { fontSize: '22px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
    loliHPText = this.add.text(width / 2, 60, `蘿莉血量: ${loliHP}`, { fontSize: '36px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);

    // --- 碰撞邏輯 ---
    this.physics.add.collider(loli, mgBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 600, 200, 5); });
    this.physics.add.collider(loli, sgBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 400, 150, 25); });
    this.physics.add.collider(loli, snBullets, (obj1, obj2) => { handleLoliHit(this, obj1, obj2, 1500, 500, 50); });

    function handleLoliHit(scene, target, bullet, force, stunTime, damage) {
        if (!target.active) return;
        const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
        
        loliHP -= damage;
        if (loliHP < 0) loliHP = 0;
        loliHPText.setText(`蘿莉血量: ${loliHP}`);

        if (loliHP <= 0) {
            target.setActive(false).setVisible(false);
            target.body.enable = false;
            scene.cameras.main.flash(500, 255, 0, 0);
            scene.time.delayedCall(3000, () => {
                loliHP = loliMaxHP;
                loliHPText.setText(`蘿莉血量: ${loliHP}`);
                target.setActive(true).setVisible(true);
                target.body.enable = true;
                target.setPosition(scene.cameras.main.width / 4, scene.cameras.main.height - 150);
            });
        }

        target.isHit = true;
        target.hitStunTimer = stunTime;
        target.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force - 200);
        target.setTint(0xff0000);
        scene.cameras.main.shake(100, 0.005);
        bullet.destroy();
    }

    this.physics.world.on('worldbounds', (body) => {
        const obj = body.gameObject;
        if (obj && (mgBullets.contains(obj) || sgBullets.contains(obj) || snBullets.contains(obj))) {
            obj.destroy();
        }
    });

    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        reload: Phaser.Input.Keyboard.KeyCodes.R
    });

    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        this.scale.resize(newWidth, newHeight);
        this.physics.world.setBounds(0, 0, newWidth, newHeight, true, true, true, false);
        ground.setPosition(newWidth / 2, newHeight - 50);
        ground.setDisplaySize(newWidth, 40);
        ground.refreshBody();
        sgText.setX(newWidth - 20);
        snText.setX(newWidth / 2);
        loliHPText.setX(newWidth / 2);
    });
}

function update(time, delta) {
    const pointer = this.input.activePointer;
    
    // 射擊邏輯
    if (pointer.leftButtonDown() && !mgIsReloading && mgAmmo > 0) {
        if (time > lastMgFired + mgFireRate) { fireMG(this, pointer); lastMgFired = time; }
    }
    if (pointer.rightButtonDown() && !sgIsReloading && sgAmmo > 0) {
        if (time > lastSgFired + sgFireRate) { fireSG(this, pointer); lastSgFired = time; }
    }
    if (pointer.middleButtonDown() && !snIsReloading && snAmmo > 0) {
        if (time > lastSnFired + snFireRate) { fireSN(this, pointer); lastSnFired = time; }
    }

    // 玩家移動
    if (this.keys.left.isDown) player.setVelocityX(-400);
    else if (this.keys.right.isDown) player.setVelocityX(400);
    else player.setVelocityX(0);

    if (this.keys.up.isDown && player.body.touching.down) player.setVelocityY(-550);

    // --- 手動換彈 (R 鍵) ---
    if (Phaser.Input.Keyboard.JustDown(this.keys.reload)) {
        if (mgAmmo < mgMaxAmmo && !mgIsReloading) {
            mgIsReloading = true;
            mgText.setText('RELOADING...');
            this.time.delayedCall(3000, () => { mgAmmo = mgMaxAmmo; mgIsReloading = false; mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`); });
        }
        if (sgAmmo < sgMaxAmmo && !sgIsReloading) {
            sgIsReloading = true;
            sgText.setText('RELOADING...');
            this.time.delayedCall(1000, () => { sgAmmo = sgMaxAmmo; sgIsReloading = false; sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`); });
        }
        if (snAmmo < snMaxAmmo && !snIsReloading) {
            snIsReloading = true;
            snText.setText('RELOADING...');
            this.time.delayedCall(5000, () => { snAmmo = snMaxAmmo; snIsReloading = false; snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`); });
        }
    }

    // --- 蘿莉 AI ---
    if (loli.active) {
        if (loli.isHit) {
            loli.hitStunTimer -= delta;
            if (loli.hitStunTimer <= 0) { loli.isHit = false; loli.clearTint(); }
        } else {
            if (loli.x < player.x) loli.setVelocityX(200);
            else if (loli.x > player.x) loli.setVelocityX(-200);
            else loli.setVelocityX(0);

            if (player.y < loli.y - 50 && loli.body.touching.down) loli.setVelocityY(-275);
        }
    }
}

function fireMG(scene, pointer) {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = mgBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.05).setVelocity(Math.cos(angle) * 1200, Math.sin(angle) * 1200);
        bullet.setCollideWorldBounds(true).setBounce(1.35);
        bullet.body.onWorldBounds = true;
        mgAmmo--;
        mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`);
        if (mgAmmo <= 0) {
            mgIsReloading = true;
            mgText.setText('RELOADING...');
            scene.time.delayedCall(3000, () => { mgAmmo = mgMaxAmmo; mgIsReloading = false; mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`); });
        }
    }
}

function fireSG(scene, pointer) {
    const centerAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const spread = Phaser.Math.DegToRad(18);
    for (let i = -2; i <= 2; i++) {
        const angle = centerAngle + (i * spread);
        const bullet = sgBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
        if (bullet) {
            bullet.setScale(0.05).setVelocity(Math.cos(angle) * 700, Math.sin(angle) * 700);
            bullet.body.allowGravity = false;
            bullet.setCollideWorldBounds(true).setBounce(0.9);
            bullet.body.onWorldBounds = true;
        }
    }
    sgAmmo -= 5;
    if (sgAmmo < 0) sgAmmo = 0;
    sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`);
    if (sgAmmo <= 0) {
        sgIsReloading = true;
        sgText.setText('RELOADING...');
        scene.time.delayedCall(1000, () => { sgAmmo = sgMaxAmmo; sgIsReloading = false; sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`); });
    }
}

function fireSN(scene, pointer) {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = snBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.1, 0.025).setRotation(angle).setVelocity(Math.cos(angle) * 1500, Math.sin(angle) * 1500);
        bullet.body.allowGravity = false;
        bullet.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;
        snAmmo--;
        snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`);
        if (snAmmo <= 0) {
            snIsReloading = true;
            snText.setText('RELOADING...');
            scene.time.delayedCall(5000, () => { snAmmo = snMaxAmmo; snIsReloading = false; snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`); });
        }
    }
}
