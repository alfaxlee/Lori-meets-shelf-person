// 載入遊戲素材（由 GameScene.preload 委派呼叫）
function preloadAssets() {
    this.load.image('胖嘟嘟發電機', 'https://yt3.googleusercontent.com/aET0nIXYzBzTkqili3s14Ks_9Vkp6910Ug4ZAP2r_UfkD5dj-Ed-aSqoH52Wv4vbT2MlWtsguQ=s900-c-k-c0x00ffffff-no-rj');
    this.load.image('地板', 'https://tse1.explicit.bing.net/th/id/OIP.PU9mfnoeDIY56du54-AHxAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3');
    this.load.image('shabi', './assets/images/shabi.png');
    this.load.image('蘿莉遇櫃人', './assets/images/羅莉抓人.png');
    this.load.image('loliWin', './assets/images/蘿莉過關圖.png'); // 載入狂暴模式背景圖 (蘿莉過關圖)
    // 載入猥瑣大叔圖片
    this.load.image('猥瑣大叔', 'https://tse3.mm.bing.net/th/id/OIP.m_x1TY2hKDnQjwvLi8DWWAHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3');
    // 載入猥瑣大叔過載模式背景圖 (本地資源以避免 CORS 載入失敗)
    this.load.image('uncleOverloadBg', './assets/images/uncleOverloadBg.webp');
    // 載入哆啦噩夢圖片
    this.load.image('dora', './assets/images/哆啦噩夢.png');
    // 載入哆啦噩夢真領域展開背景圖 (本地資源以避免 CORS 載入失敗)
    this.load.image('doraTrueBg', './assets/images/doraTrueBg.jpg');
    // 載入顏王Yeah 圖片 (使用本地下載的圖片以避開 CORS)
    this.load.image('yeah', './assets/images/Yeah.jpg');
}

// 建立遊戲場景（由 GameScene.create 委派呼叫）
function createScene() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 啟用多點觸控 (最多支援 5 點同時操作)
    this.input.addPointer(5);

    // 標記目前是否處於神聖魔法必殺動畫中
    this.isCinematicActive = false;
