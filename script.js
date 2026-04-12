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
            gravity: { y: 800 },
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
let cursors;
let platforms;
let ground; // 將地板設為全域變數方便調整

function preload() {
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
}

function create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 設定世界邊界：(x, y, 寬, 高, 檢查左, 檢查右, 檢查上, 檢查下)
    // 我們將「檢查下 (checkDown)」設為 false，避免跟地板衝突
    this.physics.world.setBounds(0, 0, width, height, true, true, true, false);

    platforms = this.physics.add.staticGroup();

    // 將地板稍微往上移動一點 (height - 50)，不要死貼著最下面
    ground = platforms.create(width / 2, height - 50, '地板');
    ground.setDisplaySize(width, 40);
    ground.refreshBody();

    player = this.physics.add.sprite(width / 2, height - 150, '胖嘟嘟發電機');
    player.setScale(0.15);
    player.setCollideWorldBounds(true); // 角色仍會撞到左右牆壁和天花板
    player.setBounce(0.1);

    this.physics.add.collider(player, platforms);

    cursors = this.input.keyboard.createCursorKeys();
    
    this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT
    ]);

    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        this.scale.resize(newWidth, newHeight);
        
        // 更新邊界，同樣關閉底部檢查
        this.physics.world.setBounds(0, 0, newWidth, newHeight, true, true, true, false);
        
        ground.setPosition(newWidth / 2, newHeight - 50);
        ground.setDisplaySize(newWidth, 40);
        ground.refreshBody();
    });
}

function update() {
    if (cursors.left.isDown) {
        player.setVelocityX(-250);
    } else if (cursors.right.isDown) {
        player.setVelocityX(250);
    } else {
        player.setVelocityX(0);
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-550); // 稍微增加跳躍力
    }
}