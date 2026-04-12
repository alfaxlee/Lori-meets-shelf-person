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
            debug: false // 關閉物理偵錯模式
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
let cursors;
let platforms;
let ground;
let bullets;

// --- 機關槍與霰彈槍系統變數 ---
let ammo = 30; // 目前彈藥數
let maxAmmo = 30; // 彈藥上限
let isReloading = false; // 是否冷卻中
let lastFired = 0; // 上次發射時間
let fireRate = 100; // 機關槍發射間隔 (0.1 秒)
let shotgunRate = 500; // 霰彈槍發射間隔 (0.5 秒)
let ammoText; // 彈藥 UI 文字

function preload() {
    // 載入玩家圖片
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    // 載入地板圖片
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
    // 載入發射物的圖片
    this.load.image('鯊比', 'assets/images/鯊比.png');
}

function create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 停用瀏覽器右鍵選單
    this.input.mouse.disableContextMenu();

    // 設定世界邊界，關閉底部碰撞以便讓地板接手
    this.physics.world.setBounds(0, 0, width, height, true, true, true, false);

    // 建立平台靜態群組
    platforms = this.physics.add.staticGroup();
    ground = platforms.create(width / 2, height - 50, '地板');
    ground.setDisplaySize(width, 40);
    ground.refreshBody();

    // 初始化彈藥物理群組
    bullets = this.physics.add.group();

    // 建立玩家
    player = this.physics.add.sprite(width / 2, height - 150, '胖嘟嘟發電機');
    player.setScale(0.1);
    player.setCollideWorldBounds(true);
    player.setBounce(0.1);

    // 設定碰撞
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(bullets, platforms);
    this.physics.add.collider(bullets, bullets); // 鯊比與鯊比之間依然會互撞彈開

    // 建立彈藥顯示 UI
    ammoText = this.add.text(20, 20, `Ammo: ${ammo}/${maxAmmo}`, { 
        fontSize: '28px', 
        fill: '#ff0000',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4
    });

    // 監聽物理邊界碰撞，讓鯊比撞到牆壁後銷毀
    this.physics.world.on('worldbounds', (body) => {
        if (body.gameObject && bullets.contains(body.gameObject)) {
            body.gameObject.destroy();
        }
    });

    // 初始化鍵盤控制 (WASD)
    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });
    
    // 攔截 W, A, D 鍵
    this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.D
    ]);

    // 處理視窗大小改變
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        this.scale.resize(newWidth, newHeight);
        this.physics.world.setBounds(0, 0, newWidth, newHeight, true, true, true, false);
        ground.setPosition(newWidth / 2, newHeight - 50);
        ground.setDisplaySize(newWidth, 40);
        ground.refreshBody();
    });
}

function update(time) {
    // --- 射擊邏輯 ---
    const pointer = this.input.activePointer;
    
    if (!isReloading && ammo > 0) {
        // 左鍵：機關槍掃射
        if (pointer.leftButtonDown()) {
            if (time > lastFired + fireRate) {
                fireBullet(this, pointer);
                lastFired = time;
            }
        }
        // 右鍵：霰彈槍掃射 (一次 5 發，間隔 18 度)
        else if (pointer.rightButtonDown()) {
            if (time > lastFired + shotgunRate) {
                fireShotgun(this, pointer);
                lastFired = time;
            }
        }
    }

    // --- 玩家移動邏輯 (使用 WASD) ---
    if (this.keys.left.isDown) {
        player.setVelocityX(-400);
    } else if (this.keys.right.isDown) {
        player.setVelocityX(400);
    } else {
        player.setVelocityX(0);
    }

    // 跳躍 (W 鍵)
    if (this.keys.up.isDown && player.body.touching.down) {
        player.setVelocityY(-550);
    }
}

// 單發子彈發射 (機關槍)
function fireBullet(scene, pointer) {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const spawnX = player.x + Math.cos(angle) * 40;
    const spawnY = player.y + Math.sin(angle) * 40;

    const bullet = bullets.create(spawnX, spawnY, '鯊比');
    if (bullet) {
        bullet.setScale(0.05);
        const speed = 800;
        bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        bullet.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;
        bullet.setBounce(0.9);

        ammo--;
        updateAmmoText();
        checkReload(scene);
    }
}

// 霰彈槍發射 (右鍵)
function fireShotgun(scene, pointer) {
    const centerAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const spread = Phaser.Math.DegToRad(18); // 18 度轉弧度
    
    // 一次產生 5 顆子彈
    for (let i = -2; i <= 2; i++) {
        const angle = centerAngle + (i * spread);
        const spawnX = player.x + Math.cos(angle) * 40;
        const spawnY = player.y + Math.sin(angle) * 40;

        const bullet = bullets.create(spawnX, spawnY, '鯊比');
        if (bullet) {
            bullet.setScale(0.05);
            const speed = 700; // 霰彈槍速度稍慢
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;
            bullet.setBounce(0.9);
        }
    }
    
    ammo -= 5; // 消耗 5 發彈藥
    if (ammo < 0) ammo = 0;
    updateAmmoText();
    checkReload(scene);
}

function updateAmmoText() {
    ammoText.setText(`Ammo: ${ammo}/${maxAmmo}`);
}

function checkReload(scene) {
    if (ammo <= 0 && !isReloading) {
        isReloading = true;
        ammoText.setText('RELOADING...');
        scene.time.delayedCall(3000, () => {
            ammo = maxAmmo;
            isReloading = false;
            updateAmmoText();
        });
    }
}