const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    scene: {
        preload: preload,
        create: create
    }
};

const game = new Phaser.Game(config);

let player; 

function preload() {
    // 載入指定的圖片
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
}

function create() {
    this.player = this.physics.add.group({
        key: '胖嘟嘟發電機'
    });
    this.player.setScale(0.05)
    // 如果您想顯示圖片，可以在這裡使用：
    // this.add.image(400, 300, '胖嘟嘟發電機');
}