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
let loli; // 宣告 蘿莉遇櫃人 為全域變數
let keys;
let platforms;
let ground;
let mgBullets;
let sgBullets;
let snBullets; // 狙擊槍彈藥群組

// --- 彈弓 (原機關槍) 系統變數 ---
let mgAmmo = 72; // 將上限改為 72
let mgMaxAmmo = 72; // 將上限改為 72
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
let snFireRate = 1500; // 1.5 秒一發
let snText;

function preload() {
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
    // 修改路徑為相對路徑，並將鍵名改為英文以避免編碼問題
    this.load.image('shabi', './assets/images/shabi.png');
    // 載入 "蘿莉遇櫃人" 圖片
    this.load.image('蘿莉遇櫃人', './assets/images/羅莉抓人.png');

    // --- 載入偵錯監聽器 ---
    this.load.on('complete', () => {
        console.log('所有資源載入完成');
    });
    this.load.on('filecomplete', (key) => {
        console.log('載入完成: ' + key);
    });
    this.load.on('loaderror', (file) => {
        console.error('載入失敗: ' + file.key, file.src);
    });
}

function create() {
    // 檢查紋理是否成功載入
    if (this.textures.exists('shabi')) {
        console.log('鯊比紋理已成功載入並存在於快取中');
    } else {
        console.error('鯊比紋理不存在於快取中！');
    }

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

    // 新增 "蘿莉遇櫃人" 物理 Sprite，並放大尺寸
    loli = this.physics.add.sprite(width / 4, height - 150, '蘿莉遇櫃人');
    loli.setScale(0.3); // 放大尺寸
    loli.setCollideWorldBounds(true);
    loli.setBounce(0.1);

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(loli, platforms); // 讓蘿莉與地板碰撞
    this.physics.add.collider(mgBullets, platforms);
    this.physics.add.collider(mgBullets, mgBullets);
    this.physics.add.collider(sgBullets, platforms);
    
    this.physics.add.collider(snBullets, platforms, (bullet) => {
        bullet.destroy();
    });

    // --- 蘿莉遇櫃人 與 鯊比子彈 的碰撞邏輯 ---
    const bulletGroups = [mgBullets, sgBullets, snBullets];
    bulletGroups.forEach(group => {
        this.physics.add.collider(loli, group, (loli, bullet) => {
            // 計算撞擊方向（從子彈到蘿莉）
            const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, loli.x, loli.y);
            
            // 僅給予一個瞬間的衝量 (Velocity)，不直接修改 x, y 坐標，防止穿越地面
            // 增加推力值使效果更明顯
            loli.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);
            
            bullet.destroy(); // 銷毀子彈
        });
    });

    // --- 建立 UI ---
    // 左上角彈弓 UI (黃色)
    mgText = this.add.text(20, 20, `Slingshot: ${mgAmmo}/${mgMaxAmmo}`, { 
        fontSize: '22px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    });

    // 右上角霰彈槍 UI (綠色)
    sgText = this.add.text(width - 20, 20, `Shotgun: ${sgAmmo}/${sgMaxAmmo}`, { 
        fontSize: '22px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(1, 0);

    // 正上方狙擊槍 UI (青藍色)
    snText = this.add.text(width / 2, 20, `Sniper: ${snAmmo}/${snMaxAmmo}`, { 
        fontSize: '22px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5, 0);

    this.physics.world.on('worldbounds', (body) => {
        const obj = body.gameObject;
        if (obj && (mgBullets.contains(obj) || sgBullets.contains(obj) || snBullets.contains(obj))) {
            obj.destroy();
        }
    });

    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
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
    });
}

function update(time) {
    const pointer = this.input.activePointer;
    
    // 彈弓 (左鍵)
    if (pointer.leftButtonDown() && !mgIsReloading && mgAmmo > 0) {
        if (time > lastMgFired + mgFireRate) {
            fireMG(this, pointer);
            lastMgFired = time;
        }
    }
    
    // 霰彈槍 (右鍵)
    if (pointer.rightButtonDown() && !sgIsReloading && sgAmmo > 0) {
        if (time > lastSgFired + sgFireRate) {
            fireSG(this, pointer);
            lastSgFired = time;
        }
    }

    // 狙擊槍 (中鍵)
    if (pointer.middleButtonDown() && !snIsReloading && snAmmo > 0) {
        if (time > lastSnFired + snFireRate) {
            fireSN(this, pointer);
            lastSnFired = time;
        }
    }

    if (this.keys.left.isDown) player.setVelocityX(-400);
    else if (this.keys.right.isDown) player.setVelocityX(400);
    else player.setVelocityX(0);

    if (this.keys.up.isDown && player.body.touching.down) player.setVelocityY(-550);

    // --- 蘿莉遇櫃人 AI 追蹤邏輯 ---
    // 水平移動：朝向胖嘟嘟發電機
    if (loli.x < player.x) {
        loli.setVelocityX(200); // 向右移動
    } else if (loli.x > player.x) {
        loli.setVelocityX(-200); // 向左移動
    } else {
        loli.setVelocityX(0);
    }

    // 跳躍邏輯：如果胖嘟嘟發電機比她高（Y 座標較小）且她在地面上，則跳躍
    if (player.y < loli.y - 50 && loli.body.touching.down) {
        loli.setVelocityY(-275); // 跳躍力與玩家比例為 1:2 (玩家為 -550)
    }
}

function fireMG(scene, pointer) {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = mgBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.05); // 調回原比例
        // 射擊力道增加 1.5 倍 (原 800 * 1.5 = 1200)
        bullet.setVelocity(Math.cos(angle) * 1200, Math.sin(angle) * 1200);
        bullet.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;
        // 彈跳幅度增加 1.5 倍 (原 0.9 * 1.5 = 1.35)
        bullet.setBounce(1.35);
        mgAmmo--;
        updateMgUI();
        if (mgAmmo <= 0) {
            mgIsReloading = true;
            mgText.setText('RELOADING...');
            scene.time.delayedCall(3000, () => { mgAmmo = mgMaxAmmo; mgIsReloading = false; updateMgUI(); });
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
            bullet.setScale(0.05); // 調回原比例
            bullet.body.allowGravity = false;
            bullet.setVelocity(Math.cos(angle) * 700, Math.sin(angle) * 700);
            bullet.setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;
            bullet.setBounce(0.9);
        }
    }
    sgAmmo -= 5;
    if (sgAmmo < 0) sgAmmo = 0;
    updateSgUI();
    if (sgAmmo <= 0) {
        sgIsReloading = true;
        sgText.setText('RELOADING...');
        scene.time.delayedCall(1000, () => { sgAmmo = sgMaxAmmo; sgIsReloading = false; updateSgUI(); });
    }
}

function fireSN(scene, pointer) {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = snBullets.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.1, 0.025); // 調回原比例
        bullet.setRotation(angle);
        bullet.body.allowGravity = false;
        bullet.setVelocity(Math.cos(angle) * 1500, Math.sin(angle) * 1500);
        bullet.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;
        snAmmo--;
        updateSnUI();
        if (snAmmo <= 0) {
            snIsReloading = true;
            snText.setText('RELOADING...');
            scene.time.delayedCall(5000, () => { snAmmo = snMaxAmmo; snIsReloading = false; updateSnUI(); });
        }
    }
}

function updateMgUI() { mgText.setText(`Slingshot: ${mgAmmo}/${mgMaxAmmo}`); }
function updateSgUI() { sgText.setText(`Shotgun: ${sgAmmo}/${sgMaxAmmo}`); }
function updateSnUI() { snText.setText(`Sniper: ${snAmmo}/${snMaxAmmo}`); }