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

function rememberLoliBody(sprite) {
    sprite.baseBodySize = {
        width: sprite.body.sourceWidth,
        height: sprite.body.sourceHeight
    };
}

function setLoliUprightBody(sprite) {
    if (!sprite.baseBodySize) return;
    sprite.setSize(sprite.baseBodySize.width, sprite.baseBodySize.height, true);
}

function setLoliExhaustedBody(sprite) {
    if (!sprite.baseBodySize) return;
    sprite.setSize(sprite.baseBodySize.height, sprite.baseBodySize.width, true);
}

function keepSpriteBottom(sprite, bottom) {
    sprite.y += bottom - sprite.getBounds().bottom;
}

// --- 控制變數 ---
let isActuallyMobile = false; // 真實手機偵測
let forceControls = false;    // 關閉強制顯示，確保非手機不顯示 (修改)
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
    loli.isSuperInvincible = false; // 新增：無敵模式標記
    rememberLoliBody(loli);

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
    let isCrashed = false; // 新增：防止多次觸發當機
    const triggerCrash = () => {
        if (isInvincible || isCrashed) return; // 衝刺/護盾期間無敵，或已當機則跳過 (修改)
        isCrashed = true;

        this.physics.pause();
        this.scene.pause();
        const crashScreen = document.createElement('div');
        crashScreen.className = 'bsod-container'; // 使用 CSS class
        crashScreen.innerHTML = `
            <div class="bsod-content">
                <div class="bsod-smiley">:(</div>
                <h1 class="bsod-message">不明錯誤，我們將盡力幫您修復，若無法修復請上: <a href="https://alfaxlee.github.io/problemsolving/">https://alfaxlee.github.io/problemsolving/</a></h1>
                <div class="bsod-progress">修復中<span class="progress-percent">0</span>% 完成</div>
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
        
        // 使用局部選擇器，避免多個當機畫面時的 ID 衝突 (修改)
        const progressPercent = crashScreen.querySelector('.progress-percent');
        const progressRow = crashScreen.querySelector('.bsod-progress');
        
        let percent = 0;
        const startTime = Date.now();
        const updatePercent = () => {
            percent = Math.min(Math.floor(((Date.now() - startTime) / 5000) * 100), 100);
            
            if (progressPercent) progressPercent.innerText = percent;

            if (percent < 100) {
                requestAnimationFrame(updatePercent);
            } else {
                // 當修復到 100% 時，背景切換為彩色電視，並將文字改為「錯誤」
                crashScreen.classList.add('tv-background'); 
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
        
        loliHPText.setText(`蘿莉血量: ${loliHP}`);
        
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

function setupMobileControls(scene) {
    const height = scene.cameras.main.height;
    const width = scene.cameras.main.width;
    // 修正：初始位置改為 120, height - 120 以符合 reposition 邏輯
    joystickBase = scene.add.circle(120, height - 120, 133, 0x888888, 0.5).setScrollFactor(0).setDepth(1000);
    joystickThumb = scene.add.circle(120, height - 120, 67, 0xcccccc, 0.8).setScrollFactor(0).setDepth(1001).setInteractive();
    scene.input.setDraggable(joystickThumb);
    scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (gameObject === joystickThumb) {
            const dx = dragX - joystickBase.x; 
            const dy = dragY - joystickBase.y;
            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 66);
            const angle = Math.atan2(dy, dx);
            
            gameObject.x = joystickBase.x + Math.cos(angle) * dist;
            gameObject.y = joystickBase.y + Math.sin(angle) * dist;
            
            mobileInput.left = (dx < -40); 
            mobileInput.right = (dx > 40); 
            mobileInput.up = (dy < -40);
        }
    });
    scene.input.on('dragend', () => {
        joystickThumb.x = joystickBase.x; joystickThumb.y = joystickBase.y;
        mobileInput.left = mobileInput.right = mobileInput.up = false;
    });
    
    const rx = width - 150; const ry = height - 150;
    createBtn(scene, rx, ry - 240, 'MG', 0xffff00, 'fireMg');
    createBtn(scene, rx - 200, ry - 170, 'SG', 0x00ff00, 'fireSg');
    createBtn(scene, rx - 240, ry, 'SN', 0x00ffff, 'fireSn');
    createBtn(scene, rx, ry, 'RE', 0xff00ff, 'reload');
    createBtn(scene, rx - 440, ry, 'DASH', 0x00ffff, 'dash'); 
}

function createBtn(scene, x, y, label, color, key) {
    const b = scene.add.circle(x, y, 93, color, 0.6).setScrollFactor(0).setDepth(1000).setInteractive();
    const t = scene.add.text(x, y, label, { fontSize: '27px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    
    b.on('pointerdown', (pointer) => { mobileInput[key] = true; b.setAlpha(0.9); });
    b.on('pointerup', (pointer) => { mobileInput[key] = false; b.setAlpha(0.6); });
    b.on('pointerout', (pointer) => { mobileInput[key] = false; b.setAlpha(0.6); });
    
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
    energyBar.clear();
    energyBar.fillStyle(0x888888, 0.8);
    const energyBarWidth = maxDashEnergy * 2; // 原本長度是 200，現在根據最大能量等比放大
    energyBar.fillRect(20, 100, energyBarWidth, 20); 
    energyBar.fillStyle(dashEnergyColor, 1); 
    energyBar.fillRect(20, 100, energyBarWidth * (dashEnergy / maxDashEnergy), 20); 

    if (dashEnergy < maxDashEnergy) {
        dashEnergy = Math.min(maxDashEnergy, dashEnergy + energyRegen);
    }

    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.dash) || mobileInput.dash;
    if (dashPressed) {
        if (dashEnergy >= dashCost && !isDashing) {
            dashEnergy -= dashCost;
            isDashing = true;
            isInvincible = true; 
            player.setAlpha(0.5); 

            let angle;
            let speed = 2400; 
            if (mobileInput.dash) {
                angle = Phaser.Math.Angle.Between(loli.x, loli.y, player.x, player.y);
            } else {
                const mousePointer = this.input.activePointer;
                angle = Phaser.Math.Angle.Between(player.x, player.y, mousePointer.x, mousePointer.y);
                const dist = Phaser.Math.Distance.Between(player.x, player.y, mousePointer.x, mousePointer.y);
                speed = Phaser.Math.Clamp(dist * 6, 1200, 3600); 
            }
            
            player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            player.body.allowGravity = false; 

            createDashDust(this, player.x, player.y, angle);
            createDashShield(this, player, angle);

            if (this.invincibilityTimer) this.invincibilityTimer.remove();

            this.time.delayedCall(150, () => {
                isDashing = false; 
                player.body.allowGravity = true;
                player.setAlpha(0.7); 
                
                this.invincibilityTimer = this.time.delayedCall(1000, () => {
                    isInvincible = false;
                    player.setAlpha(1);
                });
            });
        } else if (dashEnergy < dashCost && !isDashing) {
            this.tweens.add({
                targets: energyBar,
                x: '+=5',
                duration: 50,
                yoyo: true,
                repeat: 3,
                onStart: () => { dashEnergyColor = 0xff0000; }, 
                onComplete: () => { energyBar.x = 0; dashEnergyColor = 0x00ffff; } 
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
    
    // 修正：補上方法調用的括號 ()，解決語法調用錯誤
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
                                    maxDashEnergy = 200; // 能量條變成兩倍長
                                    dashEnergy = maxDashEnergy; // 立刻補滿能量
                                    dashCost = 33 / 2; // 消耗變 1/2 (原本是 33)
                                    energyRegen = 1.0; // 回復能量效率變兩倍 (原本是 0.5)
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
                                        maxDashEnergy = 100;
                                        dashCost = 33;
                                        energyRegen = 0.5;
                                        if (dashEnergy > maxDashEnergy) dashEnergy = maxDashEnergy;
                                        
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

function createShockwaves(scene, x, y, fallHeight) {
    const scaleFactor = Math.min(2.5, 0.5 + (fallHeight / 200));
    const directions = [-1, 1];
    const angleRad = Phaser.Math.DegToRad(25); 
    directions.forEach(dir => {
        const sw = scene.add.rectangle(x, y - 20, 80 * scaleFactor, 40 * scaleFactor, 0xffffff, 0.8);
        scene.physics.add.existing(sw);
        shockwaves.add(sw);
        sw.body.allowGravity = false;
        const speed = 400 + (fallHeight * 0.6);
        sw.body.setVelocity(dir * speed * Math.cos(angleRad), -speed * Math.sin(angleRad));
        const rotation = dir === 1 ? -angleRad : angleRad;
        sw.setRotation(rotation);
        scene.tweens.add({
            targets: sw, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500 + (fallHeight * 0.5),
            onComplete: () => { sw.destroy(); }
        });
    });
}

function triggerReload(scene, weaponType) {
    if ((!weaponType || weaponType === 'mg') && mgAmmo < mgMaxAmmo && !mgIsReloading) {
        mgIsReloading = true; mgText.setText('RELOADING...');
        scene.time.delayedCall(3000, () => { mgAmmo = mgMaxAmmo; mgIsReloading = false; mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`); });
    }
    if ((!weaponType || weaponType === 'sg') && sgAmmo < sgMaxAmmo && !sgIsReloading) {
        sgIsReloading = true; sgText.setText('RELOADING...');
        scene.time.delayedCall(1000, () => { sgAmmo = sgMaxAmmo; sgIsReloading = false; sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`); });
    }
    if ((!weaponType || weaponType === 'sn') && snAmmo < snMaxAmmo && !snIsReloading) {
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
        if (mgAmmo <= 0) triggerReload(scene, 'mg'); 
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
    // 修正：霰彈槍消耗應為 1，而非 5
    sgAmmo -= 1; if (sgAmmo < 0) sgAmmo = 0; sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`);
    if (sgAmmo <= 0) triggerReload(scene, 'sg'); 
}

function fireSN(scene, pointer, autoAim) {
    let angle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = snBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.1, 0.025).setRotation(angle).setVelocity(Math.cos(angle) * 1500, Math.sin(angle) * 1500).body.allowGravity = false;
        bullet.setCollideWorldBounds(true); bullet.body.onWorldBounds = true; snAmmo--; snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`);
        if (snAmmo <= 0) triggerReload(scene, 'sn'); 
    }
}

function spawnLaser(scene) {
    if (!loli.active) return;
    const laserCount = loli.isBerserk ? 1 : Phaser.Math.Between(1, 3); 
    const height = scene.cameras.main.height;
    const warningDuration = loli.isBerserk ? 85 : 167; 
    for (let i = 0; i < laserCount; i++) {
        const randomX = Phaser.Math.Between(50, 1230);
        const warningLineV = scene.add.rectangle(randomX, height / 2, 2, height, 0xff0000, 0.5);
        warningLineV.name = 'warningLine'; // 標記警告線
        scene.tweens.add({
            targets: warningLineV, alpha: 0, duration: warningDuration, yoyo: true, repeat: 5, 
            onComplete: () => {
                if (loli.isSuperInvincible) {
                    if (warningLineV) warningLineV.destroy();
                    return; // 無敵模式下取消發射
                }
                warningLineV.destroy();
                const laserV = scene.add.rectangle(randomX, height / 2, 25, height, 0xff00ff);
                scene.physics.add.existing(laserV);
                lasers.add(laserV);
                laserV.body.allowGravity = false;
                laserV.body.setImmovable(true);
                scene.time.delayedCall(500, () => {
                    laserV.destroy();
                    if (loli.isBerserk && i === laserCount - 1 && !loli.isSuperInvincible) spawnLaser(scene);
                });
            }
        });
    }
}

function spawnEnemyBall(scene) {
    if (!loli.active) return;
    const ballCount = loli.isBerserk ? 5 : 1;
    for (let i = 0; i < ballCount; i++) {
        const ball = scene.add.circle(loli.x, loli.y, 15, 0xff00ff);
        scene.physics.add.existing(ball);
        enemyBalls.add(ball);
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = 400;
        ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        ball.body.setBounce(1, 1); ball.body.setCollideWorldBounds(true); ball.body.onWorldBounds = true;
    }
}

function createDashDust(scene, x, y, dashAngle) {
    const dustCount = 32; const oppositeAngle = dashAngle + Math.PI;
    for (let i = 0; i < dustCount; i++) {
        const spread = Phaser.Math.FloatBetween(-0.6, 0.6); const speed = Phaser.Math.Between(100, 600); const size = Phaser.Math.Between(6, 12);
        const dust = scene.add.rectangle(x, y, size, size, 0x333333, 0.8);
        scene.physics.add.existing(dust);
        dust.body.allowGravity = false;
        dust.body.setVelocity(Math.cos(oppositeAngle + spread) * speed, Math.sin(oppositeAngle + spread) * speed);
        dust.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        scene.tweens.add({ targets: dust, alpha: 0, scale: 0.2, duration: Phaser.Math.Between(400, 800), ease: 'Cubic.easeOut', onComplete: () => { dust.destroy(); } });
    }
}

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
                
                loliHPText.setText(`蘿莉血量: ${loliHP}`);
                
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
        loliHP = loliMaxHP; loliHPText.setText(`蘿莉血量: ${loliHP}`);
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
        if (scene.berserkBg) { scene.berserkBg.destroy(); scene.berserkBg = null; }
        if (scene.berserkCeiling) { scene.berserkCeiling.destroy(); scene.berserkCeiling = null; }
        if (scene.berserkFloor) { scene.berserkFloor.destroy(); scene.berserkFloor = null; }
        if (scene.berserkGunLeft) { scene.berserkGunLeft.destroy(); scene.berserkGunLeft = null; }
        if (scene.berserkGunRight) { scene.berserkGunRight.destroy(); scene.berserkGunRight = null; }
        target.body.allowGravity = true; target.clearTint();
        scheduleNextLaser(scene); 
    });
}

function scheduleNextLaser(scene) {
    if (loli.isBerserk || !loli.active || loli.isSuperInvincible) return; // 新增：無敵模式下不排程
    const delay = Phaser.Math.Between(3000, 7000);
    scene.time.delayedCall(delay, () => {
        if (loli.active && !loli.isBerserk && !loli.isSuperInvincible) { // 新增：無敵模式下不觸發
            spawnLaser(scene);
            scheduleNextLaser(scene);
        }
    });
}

// 觸發無敵模式並移動到畫面中間偏上
function triggerInvincibleMode(scene, target) {
    target.isSuperInvincible = true;
    target.isHit = false; // 取消受擊狀態
    target.setTint(0x800080); // 變紫效果
    target.body.allowGravity = false; // 取消重力
    target.body.setImmovable(true); // 變成不動的物體 (就像空中的地板，玩家可以站上去，不會被物理擊退)
    target.isScaling = false; // 初始化放大標記
    
    // 清除畫面上所有的攻擊與警告線
    if (shockwaves) shockwaves.clear(true, true);
    if (lasers) lasers.clear(true, true);
    if (enemyBalls) enemyBalls.clear(true, true);
    
    // 找出所有名字是 warningLine 的物件並刪除
    scene.children.list.forEach(child => {
        if (child.name === 'warningLine') child.destroy();
    });
    
    // 最近路徑走到螢幕中心偏上 (高度 1/4 處，即距離底部 3/4)
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 4;
    scene.physics.moveTo(target, centerX, centerY, 500); // 以速度 500 移動
}

// ========================== 究極狂暴模式攻擊 ==========================

function scheduleUltimateGunAttack(scene) {
    if (!loli.active || !loli.isUltimateBerserk) return;

    const fireGun = (gun, isLeft) => {
        const startAngle = Phaser.Math.Between(-45, 45);
        const endAngle = startAngle + Phaser.Math.Between(-90, 90);
        gun.setAngle(startAngle);

        const rad = Phaser.Math.DegToRad(startAngle);
        const offsetX = isLeft ? 260 : -260; 
        const worldX = gun.x + Math.cos(rad) * offsetX;
        const worldY = gun.y + Math.sin(rad) * offsetX;
        const laserOrigin = isLeft ? 0 : 1;

        const warningLine = scene.add.rectangle(worldX, worldY, 1500, 2, 0xff0000, 0.5).setOrigin(laserOrigin, 0.5);
        warningLine.name = 'warningLine';
        warningLine.setAngle(startAngle);

        scene.time.delayedCall(500, () => {
            if (warningLine) warningLine.destroy(); 
            if (!loli.active || !loli.isUltimateBerserk) return;

            const laser = scene.add.rectangle(worldX, worldY, 1500, 25, 0xff00ff, 0.8).setOrigin(laserOrigin, 0.5);
            laser.setAngle(gun.angle); 
            scene.physics.add.existing(laser);
            lasers.add(laser);
            if (laser.body) laser.body.enable = false;

            scene.tweens.add({
                targets: gun,
                angle: endAngle,
                duration: 1000,
                ease: 'Linear',
                onUpdate: () => {
                    if (!laser.active) return;
                    const curRad = Phaser.Math.DegToRad(gun.angle);
                    laser.x = gun.x + Math.cos(curRad) * offsetX;
                    laser.y = gun.y + Math.sin(curRad) * offsetX;
                    laser.setAngle(gun.angle);
                },
                onComplete: () => {
                    laser.destroy();
                }
            });
        });
    };

    if (scene.berserkGunLeft) fireGun(scene.berserkGunLeft, true);
    if (scene.berserkGunRight) fireGun(scene.berserkGunRight, false);

    scene.time.delayedCall(2000, () => scheduleUltimateGunAttack(scene));
}

function scheduleUltimateBalls(scene) {
    if (!loli.active || !loli.isUltimateBerserk) return;
    spawnEnemyBall(scene); 
    scene.time.delayedCall(1000, () => scheduleUltimateBalls(scene));
}

function spawnUltimateLaser(scene) {
    if (!loli.active || !loli.isUltimateBerserk) return;

    const laserCount = Phaser.Math.Between(3, 5); 
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    for (let i = 0; i < laserCount; i++) {
        const randomX = Phaser.Math.Between(0, width);
        const randomY = Phaser.Math.Between(0, height);
        const randomAngle = Phaser.Math.Between(0, 360);
        
        const warningLine = scene.add.rectangle(randomX, randomY, 3000, 2, 0xff0000, 0.5);
        warningLine.name = 'warningLine'; 
        warningLine.setAngle(randomAngle);

        scene.tweens.add({
            targets: warningLine, alpha: 0, duration: 100, yoyo: true, repeat: 5, 
            onComplete: () => {
                if (warningLine) warningLine.destroy();
                if (!loli.active || !loli.isUltimateBerserk) return;

                const laser = scene.add.rectangle(randomX, randomY, 3000, 25, 0xff00ff);
                laser.setAngle(randomAngle);
                scene.physics.add.existing(laser);
                lasers.add(laser);
                laser.body.allowGravity = false;
                laser.body.setImmovable(true);
                
                scene.time.delayedCall(500, () => {
                    if (laser) laser.destroy();
                });
            }
        });
    }

    scene.time.delayedCall(Phaser.Math.Between(1000, 2000), () => spawnUltimateLaser(scene));
}
