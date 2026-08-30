// === 遊戲主場景模組 ===
// 包含所有遊戲邏輯（後續步驟將逐步拆分至獨立模組）
import { mobileInput, isActuallyMobile, forceControls, detectMobile, setupMobileControls, repositionMobileControls } from '../ui/MobileControls.js';
import { showCrashScreen } from '../ui/CrashScreen.js';
import { createHUD, updateLoliHP, drawEnergyBar, getEnergyBar, showLoliHPText } from '../ui/HUD.js';
import { createWeaponUI, getWeaponState, triggerReload, fireMG, fireSG, fireSN, setWeaponUIVisible } from '../weapons/WeaponManager.js';
import { createDashDust } from '../player/DashEffects.js';
import { playerState, updatePlayer } from '../player/PlayerController.js';
import { initBossRefs, bossState, handleLoliHit, updateLoliStateMachine, respawnLoli } from '../boss/LoliStateMachine.js';
import { initAttackRefs, spawnEnemyBall, scheduleNextLaser, rememberLoliBody, scheduleJumpAttack } from '../boss/LoliAttacks.js';
import { initUncleRefs, startUncleAttacks, updateUncleAttacks } from '../boss/UncleAttacks.js';
import { initUncleStateRefs, uncleState, handleUncleHit, updateUncleStateMachine, respawnUncle } from '../boss/UncleStateMachine.js';
import { initDoraStateRefs, doraState, handleDoraHit, updateDoraStateMachine, respawnDora, cleanupDora, handleCloneHit } from '../boss/DoraStateMachine.js';
import { initDoraAttackRefs } from '../boss/DoraAttacks.js';
import { initYeahStateRefs, yeahState, handleYeahHit, updateYeahStateMachine, respawnYeah, cleanupYeah } from '../boss/YeahStateMachine.js';
import { initYeahAttackRefs } from '../boss/YeahAttacks.js';
import { initPoopKingStateRefs, poopKingState, handlePoopKingHit, updatePoopKingStateMachine, respawnPoopKing, cleanupPoopKing } from '../boss/PoopKingStateMachine.js';
import { initPoopKingAttackRefs } from '../boss/PoopKingAttacks.js';
import { initNoGGStateRefs, noGGState, handleNoGGHit, updateNoGGStateMachine, respawnNoGG, cleanupNoGG, triggerCXKDeathQuiz } from '../boss/NoGGStateMachine.js';
import { initNoGGAttackRefs } from '../boss/NoGGAttacks.js';
import { initGorillaStateRefs, gorillaState, handleGorillaHit, updateGorilla, respawnGorilla, cleanupGorilla } from '../boss/GorillaStateMachine.js';
import { initGorillaAttackRefs } from '../boss/GorillaAttacks.js';

let player;
let loli;
let keys;
let platforms;
let ground;
let mgBullets;
let sgBullets;
let snBullets;
let uncle;         // 猥瑣大叔 Sprite
let uncleHPText;   // 猥瑣大叔血量文字
let dora;          // 哆啦噩夢 Sprite
let doraHPText;    // 哆啦噩夢血量文字
let clone1HPText;  // 哆啦噩夢分身 1 血量文字
let clone2HPText;  // 哆啦噩夢分身 2 血量文字
let yeah;          // 顏王Yeah Sprite
let yeahHPText;    // 顏王Yeah 血量文字
let yeahEnergyBalls; // 顏王Yeah 隨機生成的黃色能量球群組
let yeahEnergyText; // 顏王Yeah 神聖魔法能量條文字
let yeahEnergyBar;  // 顏王Yeah 神聖魔法能量條 Graphics
let poopKing;          // 請屎皇 Sprite (新增中文註解：定義請屎皇精靈)
let poopKingHPText;    // 請屎皇 血量文字 (新增中文註解：定義請屎皇血量顯示文字)
let polarBear;         // 北極熊 Sprite (新增中文註解：定義北極熊精靈)
let noGG;                  // 我沒有GG Sprite (新增中文註解：定義我沒有GG精靈)
let noGGHPText;            // 我沒有GG 血量文字 (新增中文註解：定義我沒有GG血量顯示文字)
let dickKnives;            // 迪克小刀攻擊群組 (新增中文註解：定義迪克小刀攻擊群組)
let gorilla;               // 大猩猩 Sprite (新增中文註解：定義大猩猩精靈)
let gorillaHPText;         // 大猩猩 血量文字 (新增中文註解：定義大猩猩血量顯示文字)

// --- 武器系統變數 --- (已搬移至 weapons/WeaponManager.js)
let shockwaves; // 衝擊波群組
let lasers;    // 雷射攻擊群組
let enemyBalls; // 敵人彈跳球群組

// 衝刺系統變數已搬移至 player/PlayerController.js

// 蘿莉遇櫃人 血量與狀態變數已搬移至 boss/LoliStateMachine.js


// Body 工具函式已搬移至 boss/LoliAttacks.js

// --- 控制變數 --- (已搬移至 ui/MobileControls.js)

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
    // 載入請屎皇 圖片 (新增中文註解：載入請屎皇 Boss 圖片)
    this.load.image('poopKing', './assets/images/請屎皇.jpg');
    // 載入我沒有GG 圖片 (新增中文註解：載入我沒有GG Boss 圖片)
    this.load.image('noGG', './assets/images/我沒有GG.jpg');
    // 載入大猩猩 圖片 (新增中文註解：載入新 Boss 大猩猩圖片)
    this.load.image('gorilla', './assets/images/無敵大猩猩.jpg');
    // 載入迪克小刀 圖片 (新增中文註解：載入迪克小刀攻擊素材)
    this.load.image('dickKnife', './assets/images/迪克小刀.jpg');
    // 載入蔡徐坤第二階段 4 張圖片素材 (獨立於 cxk_frames 資料夾) (新增中文註解：載入蔡徐坤階段換圖素材)
    this.load.image('cxk_1', './assets/images/cxk_frames/cxk_1.jpg');
    this.load.image('cxk_2', './assets/images/cxk_frames/cxk_2.jpg');
    this.load.image('cxk_3', './assets/images/cxk_frames/cxk_3.jpg');
    this.load.image('cxk_4', './assets/images/cxk_frames/cxk_4.jpg');
    // 載入蔡徐坤中分頭爆炸圖片素材 (新增中文註解：載入中分頭絕招圖片)
    this.load.image('cxk_explode', './assets/images/cxk_frames/cxk_explode.jpg');
    // 載入蔡徐坤被擊敗後 3 張動作圖片 (獨立於 cxk_death_frames 資料夾) 與籃球素材 (新增中文註解)
    this.load.image('cxk_death_1', './assets/images/cxk_death_frames/cxk_death_1.jpg');
    this.load.image('cxk_death_2', './assets/images/cxk_death_frames/cxk_death_2.jpg');
    this.load.image('cxk_death_3', './assets/images/cxk_death_frames/cxk_death_3.jpg');
    this.load.image('basketball', './assets/images/籃球.png');

    // 載入北極熊走路 gif 拆解的 16 個影格 (新增中文註解：載入北極熊動畫格)
    for (let i = 0; i < 16; i++) {
        this.load.image(`polar_bear_${i}`, `./assets/images/polar_bear/frame_${i}.png`);
    }

    // 載入「我看了魔」影片拆解的 111 個影格 (新增中文註解：載入我看了魔逐格動畫素材)
    for (let i = 0; i < 111; i++) {
        this.load.image(`cxk_demon_${i}`, `./assets/images/demon_frames/frame_${i}.png`);
    }
}

// 建立遊戲場景（由 GameScene.create 委派呼叫）
function createScene() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 啟用多點觸控 (最多支援 5 點同時操作)
    this.input.addPointer(5);

    // 標記目前是否處於神聖魔法必殺動畫中
    this.isCinematicActive = false;


    // 偵測手機裝置（邏輯已搬至 MobileControls 模組）
    detectMobile(this);

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
    dickKnives = this.physics.add.group(); // 初始化迪克小刀攻擊群組 (新增中文註解)

    player = this.physics.add.sprite(width / 2, height - 150, '胖嘟嘟發電機');
    player.setScale(0.1);
    player.setCollideWorldBounds(true);
    player.setBounce(0.1);

    // 重置玩家狀態，避免跨場景或重新載入時狀態殘留 (新增中文註解：重置玩家狀態機屬性)
    playerState.cannotMove = false;
    playerState.isInvincible = false;
    playerState.isDashing = false;
    playerState.dashEnergy = 100;
    playerState.maxDashEnergy = 100; // 重置最大衝刺能量條 (新增)
    playerState.isDashIndicatorLit = false; // 重置警示燈狀態 (新增)

    // 將蘿莉初始位置下移至 height - 110，使其出生就在地板上 (修改)
    loli = this.physics.add.sprite(width / 4, height - 110, '蘿莉遇櫃人');
    loli.setScale(0.3);
    loli.setCollideWorldBounds(true);
    loli.setBounce(0.1);
    loli.isHit = false;
    loli.hitStunTimer = 0;
    // 呼叫 rememberLoliBody 記住原始碰撞箱大小，以便在癱瘓模式翻轉
    rememberLoliBody(loli);

    // 建立猥瑣大叔（出生在畫面右側 3/4 處，大小為蘿莉的 1.5 倍）
    uncle = this.physics.add.sprite(3 * width / 4, height - 110, '猥瑣大叔');
    // 使用 setDisplaySize 確保視覺大小為蘿莉的 1.5 倍（不依賴原圖尺寸）
    uncle.setDisplaySize(loli.displayWidth * 1.5, loli.displayHeight * 1.5);
    uncle.setCollideWorldBounds(true);
    uncle.setBounce(0.1);
    // 猥瑣大叔初始隱藏，等蘿莉被打敗後才出現
    uncle.setActive(false);
    uncle.setVisible(false);
    uncle.body.enable = false;

    // 建立哆啦噩夢
    dora = this.physics.add.sprite(3 * width / 4, height - 110, 'dora');
    // 使用 setDisplaySize 確保視覺大小與碰撞箱跟蘿莉完全一致（不依賴原圖尺寸）
    dora.setDisplaySize(loli.displayWidth, loli.displayHeight);
    dora.setCollideWorldBounds(true);
    dora.setBounce(0.1);
    dora.setActive(false);
    dora.setVisible(false);
    dora.body.enable = false;

    // 建立顏王Yeah
    yeah = this.physics.add.sprite(3 * width / 4, height - 110, 'yeah');
    // 使用 setDisplaySize 確保視覺大小與碰撞箱與蘿莉完全一致
    yeah.setDisplaySize(loli.displayWidth, loli.displayHeight);
    yeah.setCollideWorldBounds(true);
    yeah.setBounce(0.1);
    yeah.setActive(false);
    web_application_development:
    yeah.setVisible(false);
    yeah.body.enable = false;

    // 建立請屎皇 (新增中文註解：建立請屎皇的 Sprite 與設定物理屬性)
    poopKing = this.physics.add.sprite(width / 4, height - 110, 'poopKing'); // 修改為畫面左側，避免開局玩家往右跑直接撞死 (修改)
    poopKing.setDisplaySize(loli.displayWidth, loli.displayHeight);
    poopKing.body.setSize(poopKing.width, poopKing.height, true); // 初始化物理剛體大小為圖片原始尺寸以配合縮放 (修改)
    poopKing.setCollideWorldBounds(true);
    poopKing.setBounce(0.1);
    poopKing.setActive(false);
    poopKing.setVisible(false);
    poopKing.body.enable = false;

    // 建立我沒有GG (新增中文註解：建立我沒有GG的 Sprite，初始放於畫面外遠處 (-500, -500) 防止開局瞬間與玩家重疊)
    noGG = this.physics.add.sprite(-500, -500, 'noGG');
    noGG.setDisplaySize(loli.displayWidth, loli.displayHeight);
    noGG.body.setSize(noGG.width, noGG.height, true); // 初始化物理剛體大小為圖片原始尺寸以配合縮放 (修改)
    noGG.setCollideWorldBounds(true);
    noGG.setBounce(0.1);
    noGG.setActive(false);
    noGG.setVisible(false);
    noGG.body.enable = false;

    // 建立大猩猩 (新增中文註解：建立大猩猩 Sprite，初始放於畫面外遠處 (-500, -500))
    gorilla = this.physics.add.sprite(-500, -500, 'gorilla');
    gorilla.setDisplaySize(loli.displayWidth * 1.25, loli.displayHeight * 1.25);
    gorilla.body.setSize(gorilla.width, gorilla.height, true);
    gorilla.body.allowGravity = false; // 關閉重力防止插入地板 (新增中文註解)
    gorilla.setImmovable(true);        // 設定固定剛體 (新增中文註解)
    gorilla.setCollideWorldBounds(true);
    gorilla.setBounce(0.1);
    gorilla.setActive(false);
    gorilla.setVisible(false);
    gorilla.body.enable = false;

    // 建立大猩猩血量顯示文字 (移至 Y=100 避開頂部狙擊槍彈藥 HUD) (新增中文註解)
    gorillaHPText = this.add.text(width / 2, 100, '大猩猩血量: 200', {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
    }).setOrigin(0.5).setVisible(false);

    // 建立北極熊 Sprite (預設不啟用與隱藏) (新增中文註解：建立北極熊精靈，縮小至 0.55 倍保持原比例且略大於請屎皇)
    polarBear = this.add.sprite(0, 0, 'polar_bear_0');
    polarBear.setScale(0.55); // 縮小至 0.55 倍，保持比例且稍大於請屎皇 (修改)
    polarBear.setOrigin(0.5, 0.5);
    polarBear.setVisible(false);

    // 建立北極熊走路動畫 (新增中文註解：建立北極熊走動的動畫資源)
    const polarFrames = [];
    for (let i = 0; i < 16; i++) {
        polarFrames.push({ key: `polar_bear_${i}` });
    }
    this.anims.create({
        key: 'polar_bear_walk',
        frames: polarFrames,
        frameRate: 15,
        repeat: -1
    });

    // 初始化狀態機與攻擊模組的共享參考
    initAttackRefs({ loli, player, shockwaves, lasers, enemyBalls });
    // 傳入 onLoliDeath 回呼：蘿莉死亡後重生同一個蘿莉 (不再輪替)
    initBossRefs({ loli, player, lasers, enemyBalls, shockwaves, onLoliDeath: (scene) => {
        respawnLoli(scene);
    }});

    // 當機畫面 (處理玩家死亡/受傷)
    let isCrashed = false; // 防止多次觸發當機
    const triggerCrash = (force = false) => {
        // 確保 force 真的是布林值 true，因為 Phaser 的 collider 會傳入兩個遊戲物件(Truthy)
        const isForced = force === true;
        // 衝刺/護盾期間無敵 (若 isForced 為 true 則無視無敵)，或已當機則跳過
        if ((playerState.isInvincible && !isForced) || isCrashed) return; 
        isCrashed = true;
        playerState.cannotMove = false; // 當機時解決定身狀態，避免復活或重啟時仍被定身 (新增中文註解)
        showCrashScreen(this); // 委派給 CrashScreen 模組處理 DOM 與動畫
    };
    this.triggerCrash = triggerCrash; // 將當機函式掛載到場景，供外部雷射/地刺使用

    // 初始化大猩猩狀態機與攻擊模組參考 (新增中文註解：傳入 shockwaves、platforms、lasers 與各武器子彈群組)
    initGorillaAttackRefs({ gorilla, player, shockwaves, platforms, lasers, triggerCrash: (force) => triggerCrash(force) });
    initGorillaStateRefs({ gorilla, gorillaHPText, loli, player, mgBullets, sgBullets, snBullets, triggerCrash: (force) => triggerCrash(force) });

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(loli, platforms);
    this.physics.add.collider(uncle, platforms); // 猥瑣大叔與地板碰撞
    this.physics.add.collider(dora, platforms);  // 哆啦噩夢與地板碰撞
    this.physics.add.collider(yeah, platforms);  // 顏王Yeah與地板碰撞

    // 哆啦噩夢的子彈碰撞
    this.physics.add.collider(dora, mgBullets, (obj1, obj2) => { handleDoraHit(this, obj2, 600, 200, 5); });
    this.physics.add.collider(dora, sgBullets, (obj1, obj2) => { handleDoraHit(this, obj2, 400, 150, 25); });
    this.physics.add.collider(dora, snBullets, (obj1, obj2) => { handleDoraHit(this, obj2, 1500, 500, 50); });

    // 顏王Yeah的子彈碰撞
    this.physics.add.collider(yeah, mgBullets, (obj1, obj2) => { handleYeahHit(this, obj2, 600, 200, 5); });
    this.physics.add.collider(yeah, sgBullets, (obj1, obj2) => { handleYeahHit(this, obj2, 400, 150, 25); });
    this.physics.add.collider(yeah, snBullets, (obj1, obj2) => { handleYeahHit(this, obj2, 1500, 500, 50); });

    this.physics.add.collider(poopKing, platforms);  // 請屎皇與地板碰撞 (新增中文註解)

    // 請屎皇的子彈碰撞 (新增中文註解：設定請屎皇被玩家武器子彈擊中時的傷害判定)
    this.physics.add.collider(poopKing, mgBullets, (obj1, obj2) => { handlePoopKingHit(this, obj2, 600, 200, 5); });
    this.physics.add.collider(poopKing, sgBullets, (obj1, obj2) => { handlePoopKingHit(this, obj2, 400, 150, 25); });
    this.physics.add.collider(poopKing, snBullets, (obj1, obj2) => { handlePoopKingHit(this, obj2, 1500, 500, 50); });

    this.physics.add.collider(noGG, platforms);  // 我沒有GG與地板碰撞 (新增中文註解)

    // 我沒有GG的子彈碰撞 (新增中文註解：設定我沒有GG被玩家武器子彈擊中時的傷害判定)
    this.physics.add.collider(noGG, mgBullets, (obj1, obj2) => { handleNoGGHit(this, obj2, 600, 200, 5); });
    this.physics.add.collider(noGG, sgBullets, (obj1, obj2) => { handleNoGGHit(this, obj2, 400, 150, 25); });
    this.physics.add.collider(noGG, snBullets, (obj1, obj2) => { handleNoGGHit(this, obj2, 1500, 500, 50); });

    this.physics.add.collider(gorilla, platforms);  // 大猩猩與地板碰撞 (新增中文註解)

    // 大猩猩的子彈碰撞 (新增中文註解：設定大猩猩被玩家武器子彈擊中時的傷害判定)
    this.physics.add.collider(gorilla, mgBullets, (obj1, obj2) => { handleGorillaHit(this, obj2, 0, 0, 5); });
    this.physics.add.collider(gorilla, sgBullets, (obj1, obj2) => { handleGorillaHit(this, obj2, 0, 0, 25); });
    this.physics.add.collider(gorilla, snBullets, (obj1, obj2) => { handleGorillaHit(this, obj2, 0, 0, 50); });

    // 迪克小刀碰撞邏輯 (新增中文註解：第一階段迪克小刀碰到地板銷毀，碰到玩家直接當機，不進入考題)
    this.physics.add.collider(dickKnives, platforms, (knife) => { knife.destroy(); });
    this.physics.add.overlap(player, dickKnives, triggerCrash);

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

    this.physics.add.collider(player, loli, () => {
        if (bossState.isSuperInvincible || bossState.isExhausted) return; // 究極狂暴與癱瘓模式下，碰到蘿莉不會死掉
        triggerCrash(); // 一般或狂暴模式下，碰到玩家均觸發當機
    });
    // 碰到猥瑣大叔也會當機
    this.physics.add.collider(player, uncle, () => {
        triggerCrash();
    });
    // 碰到哆啦噩夢也會當機
    this.physics.add.collider(player, dora, () => {
        triggerCrash();
    });
    // 碰到顏王Yeah也會當機 (碰觸即死)
    this.physics.add.collider(player, yeah, () => {
        triggerCrash();
    });
    // 碰到顏王Yeah也會當機 (碰觸即死)
    this.physics.add.collider(player, yeah, () => {
        triggerCrash();
    });
    // 碰到請屎皇也會當機 (碰觸即死) (新增中文註解：玩家碰撞請屎皇即死判定)
    this.physics.add.collider(player, poopKing, () => {
        // 如果正在 Combo 定身中，或處於五秒冷卻喘息期，完全忽略即死判定 (修改)
        if (playerState.cannotMove || poopKingState.isCooldown) return;
        // 護盾防禦所有傷害（包含請屎皇身體碰觸），交由 triggerCrash 的 isInvincible 判斷統一處理
        // 不在此消耗護盾：盾牌只有在主動擊退 Boss 時才消耗（createDashShield 的距離判定），讓護盾真正全面防禦 (修改)
        triggerCrash();
    });
    // 碰到我沒有GG / 蔡徐坤 (新增中文註解：第一階段直接當機保持神秘感；第二階段蔡徐坤觸發全黑神秘試題考驗)
    this.physics.add.collider(player, noGG, () => {
        if (playerState.cannotMove || playerState.isInvincible || playerState.isDashing) return;
        if (noGGState.isPhase2) {
            triggerCXKDeathQuiz(this); // 第二階段死於蔡徐坤進入全黑神秘試題
        } else {
            triggerCrash(); // 第一階段我沒有GG直接當機，保持神秘感
        }
    });
    // 碰到大猩猩 (新增中文註解：玩家碰觸大猩猩觸發當機)
    this.physics.add.collider(player, gorilla, () => {
        if (playerState.cannotMove || playerState.isInvincible || playerState.isDashing) return;
        triggerCrash();
    });
    this.physics.add.overlap(player, shockwaves, triggerCrash); // 玩家碰到衝擊波也會當機
    this.physics.add.overlap(player, enemyBalls, triggerCrash); // 玩家碰到彈跳球也會當機

    // 只有在選定挑戰的 Boss 是蘿莉時，才啟動蘿莉的專屬攻擊計時器
    if (this.selectedBoss === 'loli') {
        // 設定隨機雷射計時器 (3-7 秒觸發一次)
        scheduleNextLaser(this);
        // 設定跳躍攻擊計時器 (10-15 秒一次)
        scheduleJumpAttack(this);

        // 設定敵人彈跳球計時器 (一般模式頻率降低)
        const scheduleNextBall = () => {
            // 額外檢查：如果玩家中途切換或 Boss 已不存在則不再排程
            if (this.selectedBoss !== 'loli' || !loli.active) return;
            const delay = bossState.isBerserk ? 2000 : Phaser.Math.Between(15000, 25000); // 一般模式從 10-15s 增加到 15-25s (修改)
            this.time.delayedCall(delay, () => {
                // 僅在一般模式執行丟球攻擊，狂暴模式已依要求關閉 (修正)
                if (!bossState.isBerserk) {
                    spawnEnemyBall(this);
                }
                scheduleNextBall();
            });
        };
        scheduleNextBall();
    }

    // 監聽視窗縮放事件，自動調整手機控制項位置 (新增)
    this.scale.on('resize', () => {
        repositionMobileControls(this);
    });

    // 只有在真實手機裝置上才建立控制項 (修正：支援 forceControls)
    if (isActuallyMobile || forceControls) {
        setupMobileControls(this);
    }

    // 武器 UI 建立（委派給 WeaponManager 模組）
    createWeaponUI(this);
    // HUD 介面建立（蘿莉血量文字 + 衝刺能量條）
    createHUD(this, bossState.hp);
    // 猥瑣大叔血量文字（初始隱藏，顯示在蘿莉血量下方）
    uncleHPText = this.add.text(width / 2, 100, `猥瑣大叔血量: 800`, { 
        fontSize: '30px', 
        fill: '#888888', // 灰色 (修改為大叔主顏色)
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 4,
        padding: { left: 10, right: 10, top: 8, bottom: 8 } // 加上 padding 避免描邊與字頂被截斷 (修改)
    }).setOrigin(0.5, 0);
    uncleHPText.setVisible(false); // 初始隱藏

    // 哆啦噩夢血量文字 (初始隱藏，顯示位置同大叔，降為 400 減少挑戰難度)
    doraHPText = this.add.text(width / 2, 100, `哆啦噩夢血量: 400`, { 
        fontSize: '30px', 
        fill: '#00aaff', 
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 4,
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
    }).setOrigin(0.5, 0);
    doraHPText.setVisible(false);

    // 分身 1 血量文字 (初始隱藏，位於本尊血量下方 35px)
    clone1HPText = this.add.text(width / 2, 135, `分身1血量: 125`, { 
        fontSize: '24px', 
        fill: '#00aaff', 
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 3,
        padding: { left: 10, right: 10, top: 4, bottom: 4 }
    }).setOrigin(0.5, 0);
    clone1HPText.setVisible(false);

    // 分身 2 血量文字 (初始隱藏，位於分身 1 血量下方 35px)
    clone2HPText = this.add.text(width / 2, 170, `分身2血量: 125`, { 
        fontSize: '24px', 
        fill: '#00aaff', 
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 3,
        padding: { left: 10, right: 10, top: 4, bottom: 4 }
    }).setOrigin(0.5, 0);
    clone2HPText.setVisible(false);

    // 顏王Yeah血量文字 (初始隱藏，設定血量為 1000)
    yeahHPText = this.add.text(width / 2, 100, `顏王Yeah血量: 1000`, { 
        fontSize: '30px', 
        fill: '#ffd700', // 金黃色
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 4,
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
    }).setOrigin(0.5, 0);
    yeahHPText.setVisible(false);

    // 請屎皇血量文字 (初始隱藏，設定血量為 500，顏色為綠色) (新增中文註解：建立請屎皇 HP 文字並設為綠色，修改血量為 500)
    poopKingHPText = this.add.text(width / 2, 100, `請屎皇血量: 500`, { 
        fontSize: '30px', 
        fill: '#00ff00', // 綠色
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 4,
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
    }).setOrigin(0.5, 0);
    poopKingHPText.setVisible(false);

    // 我沒有GG血量文字 (初始隱藏，設定第一階段血量為 100，顏色為粉紅/紫色) (新增中文註解：建立我沒有GG HP 文字)
    noGGHPText = this.add.text(width / 2, 100, `我沒有GG血量: 100`, { 
        fontSize: '30px', 
        fill: '#ff00ff', // 粉紅/紫色
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 4,
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
    }).setOrigin(0.5, 0);
    noGGHPText.setVisible(false);

    // 顏王Yeah神聖魔法能量條文字標籤
    yeahEnergyText = this.add.text(width / 2, 140, `神聖魔法能量條`, { 
        fontSize: '18px', 
        fill: '#ffd700', 
        fontStyle: 'bold', 
        stroke: '#000', 
        strokeThickness: 3,
        padding: { left: 10, right: 10, top: 4, bottom: 4 }
    }).setOrigin(0.5, 0);
    yeahEnergyText.setVisible(false);

    // 顏王Yeah神聖魔法能量條 Graphics 繪圖元件
    yeahEnergyBar = this.add.graphics();
    yeahEnergyBar.setVisible(false);

    // 顏王Yeah神聖魔法能量球群組 (Physics Group)
    yeahEnergyBalls = this.physics.add.group();

    // 玩家碰到能量球的重疊碰撞判定
    this.physics.add.overlap(player, yeahEnergyBalls, (p, ball) => {
        // 碰到後消失
        ball.destroy();

        // 總共需要碰到 8 顆球來填滿能量條
        if (yeahState.collectedBalls < 8) {
            yeahState.collectedBalls++;
            yeahState.holyEnergy = (yeahState.collectedBalls / 8) * 100;
        }

        // 收集時螢幕發出淡淡的金黃色閃爍光芒
        this.cameras.main.flash(100, 255, 215, 0, false);

        // 收集滿 8 顆能量球後，觸發神聖魔法必殺動畫
        if (yeahState.collectedBalls >= 8) {
            triggerHolyCinematic(this, player, yeah);
        }
    });

    // 初始化哆啦噩夢狀態機與參考 (傳入 platforms 以便子彈能做碰撞銷毀判定，傳入子彈群組供分身碰撞偵測，傳入分身血量文字)
    initDoraStateRefs({ dora, player, doraHPText, clone1HPText, clone2HPText, platforms, mgBullets, sgBullets, snBullets, onDoraDeath: (scene) => {
        respawnDora(scene);
    }});
    // 初始化哆啦噩夢攻擊模組參考 (與狀態機使用相同的遊戲物件)
    initDoraAttackRefs({ dora, player, doraHPText, clone1HPText, clone2HPText, platforms });

    // 初始化顏王Yeah狀態機與參考 (傳入能量條文字、繪圖與能量球群組物件，以便控制顯示與重置)
    initYeahStateRefs({ yeah, player, yeahHPText, yeahEnergyText, yeahEnergyBar, yeahEnergyBalls, platforms, onYeahDeath: (scene) => {
        respawnYeah(scene);
    }});
    // 初始化顏王Yeah攻擊模組參考
    initYeahAttackRefs({ yeah, player, yeahHPText, platforms });

    // 初始化請屎皇狀態機與參考 (新增中文註解：初始化請屎皇的狀態機參考，傳入 polarBear 以供騎士模式騎乘顯示)
    initPoopKingStateRefs({ poopKing, player, poopKingHPText, platforms, polarBear, onPoopKingDeath: (scene) => {
        respawnPoopKing(scene);
    }});
    // 初始化請屎皇攻擊模組參考 (新增中文註解：初始化請屎皇的攻擊模組參考，傳入 poopKingState 以便控制攻擊狀態)
    initPoopKingAttackRefs({ poopKing, player, poopKingHPText, platforms, poopKingState });

    // 初始化我沒有GG狀態機參考 (新增中文註解：初始化我沒有GG與蔡徐坤的狀態機參考，傳入 dickKnives 與 loli)
    initNoGGStateRefs({ noGG, player, noGGHPText, platforms, dickKnives, loli, onNoGGDeath: (scene) => {
        respawnNoGG(scene);
    }});
    // 初始化我沒有GG攻擊模組參考 (新增中文註解：初始化我沒有GG與蔡徐坤的攻擊模組參考)
    initNoGGAttackRefs({ noGG, player, noGGHPText, platforms, dickKnives, loli });

    // 初始化猥瑣大叔狀態機參考
    initUncleStateRefs({ uncle, uncleHPText, onUncleDeath: (scene) => {
        // 擊敗大叔後在大叔左側出生點直接重生大叔 (不再輪替)
        const spawnX = scene.cameras.main.width / 4;
        const spawnY = scene.cameras.main.height - 150;
        respawnUncle(scene, spawnX, spawnY);
    }, player, mgBullets, sgBullets, snBullets });

    // 初始化猥瑣大叔攻擊模組參考
    initUncleRefs({ uncle, uncleHPText, onUncleDeath: (scene) => {
        // 擊敗大叔後直接重生大叔 (保持一致性)
        const spawnX = scene.cameras.main.width / 4;
        const spawnY = scene.cameras.main.height - 150;
        respawnUncle(scene, spawnX, spawnY);
    }, player, mgBullets, sgBullets, snBullets });

    // 蘿莉的子彈碰撞
    this.physics.add.collider(loli, mgBullets, (obj1, obj2) => { handleLoliHit(this, obj2, 600, 200, 5); });
    this.physics.add.collider(loli, sgBullets, (obj1, obj2) => { handleLoliHit(this, obj2, 400, 150, 25); });
    this.physics.add.collider(loli, snBullets, (obj1, obj2) => { handleLoliHit(this, obj2, 1500, 500, 50); });

    // 猥瑣大叔的子彈碰撞（後座力在 handleUncleHit 內部自動減半）
    this.physics.add.collider(uncle, mgBullets, (obj1, obj2) => { handleUncleHit(this, obj2, 600, 200, 5); });
    this.physics.add.collider(uncle, sgBullets, (obj1, obj2) => { handleUncleHit(this, obj2, 400, 150, 25); });
    this.physics.add.collider(uncle, snBullets, (obj1, obj2) => { handleUncleHit(this, obj2, 1500, 500, 50); });

    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        reload: Phaser.Input.Keyboard.KeyCodes.R,
        dash: Phaser.Input.Keyboard.KeyCodes.Q
    });

    // 根據選定要挑战 的 Boss 進行分支初始化
    if (this.selectedBoss === 'uncle') {
        // 隱藏並完全停用其它 Boss
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        dora.setActive(false); dora.setVisible(false); dora.body.enable = false;
        yeah.setActive(false); yeah.setVisible(false); yeah.body.enable = false;
        poopKing.setActive(false); poopKing.setVisible(false); poopKing.body.enable = false; // 新增 (新增中文註解：在大叔選定時停用請屎皇)
        noGG.setActive(false); noGG.setVisible(false); noGG.body.enable = false; // 新增我沒有GG 停用 (新增中文註解)

        // 隱藏蘿莉 HP，顯示大叔 HP，並直接生成大叔在左側
        showLoliHPText(false);
        uncleHPText.setVisible(true);
        yeahHPText.setVisible(false);
        poopKingHPText.setVisible(false); // 新增
        noGGHPText.setVisible(false);     // 新增
        const spawnX = width / 4;
        const spawnY = height - 150;
        respawnUncle(this, spawnX, spawnY);
    } else if (this.selectedBoss === 'dora') {
        // 隱藏其它 Boss
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        uncle.setActive(false); uncle.setVisible(false); uncle.body.enable = false;
        yeah.setActive(false); yeah.setVisible(false); yeah.body.enable = false;
        poopKing.setActive(false); poopKing.setVisible(false); poopKing.body.enable = false; // 新增 (新增中文註解：在哆啦選定時停用請屎皇)
        noGG.setActive(false); noGG.setVisible(false); noGG.body.enable = false; // 新增我沒有GG 停用 (新增中文註解)
        
        showLoliHPText(false);
        uncleHPText.setVisible(false);
        yeahHPText.setVisible(false);
        poopKingHPText.setVisible(false); // 新增
        noGGHPText.setVisible(false);     // 新增
        doraHPText.setVisible(true); // 顯示哆啦噩夢 HP
        
        // 重置領域狀態與重新產生哆啦噩夢
        cleanupDora(this);
        respawnDora(this);
    } else if (this.selectedBoss === 'yeah') {
        // 隱藏其它 Boss
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        uncle.setActive(false); uncle.setVisible(false); uncle.body.enable = false;
        dora.setActive(false); dora.setVisible(false); dora.body.enable = false;
        poopKing.setActive(false); poopKing.setVisible(false); poopKing.body.enable = false; // 新增 (新增中文註解：在顏王選定時停用請屎皇)
        noGG.setActive(false); noGG.setVisible(false); noGG.body.enable = false; // 新增我沒有GG 停用 (新增中文註解)

        showLoliHPText(false);
        uncleHPText.setVisible(false);
        doraHPText.setVisible(false);
        poopKingHPText.setVisible(false); // 新增
        noGGHPText.setVisible(false);     // 新增
        yeahHPText.setVisible(true);       // 顯示顏王Yeah HP
        yeahEnergyText.setVisible(true);   // 顯示顏王Yeah 神聖魔法能量條文字

        // 重新產生顏王Yeah
        cleanupYeah(this);
        respawnYeah(this);
    } else if (this.selectedBoss === 'poopKing') {
        // 隱藏其它 Boss (新增中文註解：隱藏請屎皇以外的所有 Boss)
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        uncle.setActive(false); uncle.setVisible(false); uncle.body.enable = false;
        dora.setActive(false); dora.setVisible(false); dora.body.enable = false;
        yeah.setActive(false); yeah.setVisible(false); yeah.body.enable = false;
        noGG.setActive(false); noGG.setVisible(false); noGG.body.enable = false; // 新增我沒有GG 停用 (新增中文註解)

        showLoliHPText(false);
        uncleHPText.setVisible(false);
        doraHPText.setVisible(false);
        yeahHPText.setVisible(false);
        noGGHPText.setVisible(false);     // 新增
        yeahEnergyText.setVisible(false);
        if (yeahEnergyBar) {
            yeahEnergyBar.clear();
            yeahEnergyBar.setVisible(false);
        }

        poopKingHPText.setVisible(true); // 顯示請屎皇 HP (新增中文註解)

        // 重生請屎皇 (新增中文註解：重置並生成請屎皇)
        cleanupPoopKing(this);
        respawnPoopKing(this);
    } else if (this.selectedBoss === 'noGG') {
        // 隱藏其它 Boss (新增中文註解：隱藏我沒有GG以外的所有 Boss)
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        uncle.setActive(false); uncle.setVisible(false); uncle.body.enable = false;
        dora.setActive(false); dora.setVisible(false); dora.body.enable = false;
        yeah.setActive(false); yeah.setVisible(false); yeah.body.enable = false;
        poopKing.setActive(false); poopKing.setVisible(false); poopKing.body.enable = false;

        showLoliHPText(false);
        uncleHPText.setVisible(false);
        doraHPText.setVisible(false);
        yeahHPText.setVisible(false);
        poopKingHPText.setVisible(false);
        yeahEnergyText.setVisible(false);
        if (yeahEnergyBar) {
            yeahEnergyBar.clear();
            yeahEnergyBar.setVisible(false);
        }

        noGGHPText.setVisible(true); // 顯示我沒有GG HP (新增中文註解)

        // 重置玩家出生點至左側 (width / 4)，避免與中央 (width / 2) 的我沒有GG 重疊撞死 (新增中文註解：設定玩家在左側出生)
        player.setPosition(width / 4, height - 150);

        // 重生我沒有GG (新增中文註解：重置並生成我沒有GG)
        cleanupNoGG(this);
        respawnNoGG(this);
    } else if (this.selectedBoss === 'gorilla') {
        // 隱藏其它 Boss (新增中文註解：隱藏大猩猩以外的所有 Boss)
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        uncle.setActive(false); uncle.setVisible(false); uncle.body.enable = false;
        dora.setActive(false); dora.setVisible(false); dora.body.enable = false;
        yeah.setActive(false); yeah.setVisible(false); yeah.body.enable = false;
        poopKing.setActive(false); poopKing.setVisible(false); poopKing.body.enable = false;
        noGG.setActive(false); noGG.setVisible(false); noGG.body.enable = false;

        showLoliHPText(false);
        uncleHPText.setVisible(false);
        doraHPText.setVisible(false);
        yeahHPText.setVisible(false);
        poopKingHPText.setVisible(false);
        noGGHPText.setVisible(false);
        yeahEnergyText.setVisible(false);
        if (yeahEnergyBar) {
            yeahEnergyBar.clear();
            yeahEnergyBar.setVisible(false);
        }

        gorillaHPText.setVisible(true); // 顯示大猩猩 HP (新增中文註解)

        // 重置玩家出生點至左側 (width / 4) (新增中文註解)
        player.setPosition(width / 4, height - 150);

        // 重生大猩猩 (新增中文註解：重置並生成大猩猩，站在原地不動)
        cleanupGorilla(this);
        respawnGorilla(this);
    } else {
        // 預設為蘿莉局：顯示蘿莉 HP，大叔與其它 Boss 保持隱藏與停用
        showLoliHPText(true);
        uncleHPText.setVisible(false);
        doraHPText.setVisible(false);
        yeahHPText.setVisible(false);
        yeahEnergyText.setVisible(false);  // 隱藏顏王Yeah 能量條文字
        if (yeahEnergyBar) {
            yeahEnergyBar.clear();         // 清除能量條
            yeahEnergyBar.setVisible(false);
        }
        dora.setActive(false); dora.setVisible(false); dora.body.enable = false;
        yeah.setActive(false); yeah.setVisible(false); yeah.body.enable = false;
        poopKing.setActive(false); poopKing.setVisible(false); poopKing.body.enable = false;
        poopKingHPText.setVisible(false);
        noGG.setActive(false); noGG.setVisible(false); noGG.body.enable = false; // 新增我沒有GG 停用 (新增中文註解)
        noGGHPText.setVisible(false);     // 新增
        gorilla.setActive(false); gorilla.setVisible(false); gorilla.body.enable = false; // 停用大猩猩 (新增中文註解)
        gorillaHPText.setVisible(false);
    }
}

// setupMobileControls / createBtn / repositionMobileControls 已搬移至 ui/MobileControls.js

// 每幀更新邏輯（由 GameScene.update 委派呼叫）
function updateScene(time, delta) {
    if (this.isCinematicActive) {
        // 動畫期間強行凍結玩家與顏王Yeah，不允許任何輸入與移動，且不受到重力影響
        player.setVelocity(0, 0);
        if (player.body) player.body.allowGravity = false;
        if (yeah && yeah.active) {
            yeah.setVelocity(0, 0);
            if (yeah.body) yeah.body.allowGravity = false;
        }
        return;
    }

    // 依據當前選定 Boss 決定自動瞄準目標與碰撞對象 (新增中文註解：加入大猩猩到 activeBoss 的判定)
    const activeBoss = this.selectedBoss === 'uncle' ? uncle : (this.selectedBoss === 'dora' ? dora : (this.selectedBoss === 'yeah' ? yeah : (this.selectedBoss === 'poopKing' ? poopKing : (this.selectedBoss === 'noGG' ? noGG : (this.selectedBoss === 'gorilla' ? gorilla : loli)))));

    // 繪製衝刺能量條（委派給 HUD 模組，僅在請屎皇戰鬥中繪製衝刺警示）(修改)
    drawEnergyBar(playerState.dashEnergy, playerState.maxDashEnergy, playerState.dashEnergyColor, this.selectedBoss === 'poopKing');

    // 玩家移動與衝刺控制（委派給 PlayerController 模組）
    updatePlayer(this, player, activeBoss, createDashShield);

    const pointer = this.input.activePointer;
    const ws = getWeaponState(); // 取得武器狀態

    // 彈弓射擊
    const triggerMg = isActuallyMobile ? mobileInput.fireMg : (pointer.leftButtonDown() || mobileInput.fireMg);
    if (triggerMg && !ws.mg.reloading && ws.mg.ammo > 0) {
        if (time > ws.mg.lastFired + ws.mg.fireRate) { fireMG(this, player, activeBoss, mgBullets, pointer, mobileInput.fireMg); ws.mg.lastFired = time; }
    }

    // 霸彈槍射擊
    const triggerSg = isActuallyMobile ? mobileInput.fireSg : (pointer.rightButtonDown() || mobileInput.fireSg);
    if (triggerSg && !ws.sg.reloading && ws.sg.ammo > 0 && time > ws.sg.lastFired + ws.sg.fireRate) {
        fireSG(this, player, activeBoss, sgBullets, pointer, mobileInput.fireSg); ws.sg.lastFired = time;
    }

    // 狙擊槍射擊
    const triggerSn = isActuallyMobile ? mobileInput.fireSn : (pointer.middleButtonDown() || mobileInput.fireSn);
    if (triggerSn && !ws.sn.reloading && ws.sn.ammo > 0 && time > ws.sn.lastFired + ws.sn.fireRate) {
        fireSN(this, player, activeBoss, snBullets, pointer, mobileInput.fireSn); ws.sn.lastFired = time;
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

        // 將蘿莉的狀態與行為決策委派給 LoliStateMachine 處理
        updateLoliStateMachine(this, time, delta);
    }

    // 更新猥瑣大叔邏輯（狀態機 AI 與 攻擊跟隨）
    updateUncleStateMachine(this, time, delta);
    updateUncleAttacks(this);

    // 更新哆啦噩夢邏輯
    if (dora && dora.active) {
        updateDoraStateMachine(this, time, delta);
    }

    // 更新顏王Yeah邏輯
    if (yeah && yeah.active) {
        updateYeahStateMachine(this, time, delta);
        
        // 僅呼叫繪製函數 (能量的增長已改由玩家碰撞能量球觸發)
        
        // 繪製神聖魔法能量條
        drawYeahEnergyBar(this);
    }

    // 更新請屎皇邏輯 (新增中文註解：當請屎皇 active 時呼叫其狀態機更新)
    if (poopKing && poopKing.active) {
        updatePoopKingStateMachine(this, time, delta);
    }

    // 更新我沒有GG邏輯 (新增中文註解：當我沒有GG active 時呼叫其狀態機更新)
    if (noGG && noGG.active) {
        updateNoGGStateMachine(this, time, delta);
    }

    // 更新大猩猩邏輯 (新增中文註解：當大猩猩 active 時呼叫其狀態機更新)
    if (gorilla && gorilla.active) {
        updateGorilla(this);
    }
}

/**
 * 繪製顏王Yeah 的神聖魔法能量條 (金黃色發光質感進度條)
 */
function drawYeahEnergyBar(scene) {
    if (!yeahEnergyBar) return;
    yeahEnergyBar.clear();

    if (!yeah || !yeah.active) {
        yeahEnergyBar.setVisible(false);
        return;
    }

    yeahEnergyBar.setVisible(true);

    const width = scene.cameras.main.width;
    const barWidth = 300; // 能量條總寬度 300px
    const barHeight = 16; // 能量條高度 16px
    const x = width / 2 - barWidth / 2; // 居中對齊
    const y = 175; // 位於神聖魔法能量條文字 (Y=140) 下方的 Y=175 處

    // 1. 繪製能量條背景 (深灰色半透明底板，呈現高級磨砂感)
    yeahEnergyBar.fillStyle(0x222222, 0.8);
    yeahEnergyBar.fillRect(x, y, barWidth, barHeight);

    // 2. 繪製金黃色充能部分 (根據 holyEnergy 比例繪製)
    const progressWidth = barWidth * (yeahState.holyEnergy / 100);
    if (progressWidth > 0) {
        yeahEnergyBar.fillStyle(0xffd700, 1.0); // 純金黃色代表神聖能量
        yeahEnergyBar.fillRect(x, y, progressWidth, barHeight);
    }

    // 3. 繪製外框 (細白色半透明邊框)
    yeahEnergyBar.lineStyle(2, 0xffffff, 0.8);
    yeahEnergyBar.strokeRect(x, y, barWidth, barHeight);
}

/**
 * 神聖魔法必殺動畫 ── 收集滿 8 顆能量球後觸發
 * 流程：凍結玩家 → 畫面變全黑 + 祈禱文字 (加大字型) → 傳送角色與 Boss → 魔法陣 + 天降光束 → 延遲後電腦當機
 */
function triggerHolyCinematic(scene, playerSprite, yeahSprite) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // === 第一階段：進入必殺動畫狀態，凍結玩家與 Boss ===
    // 立即手動更新繪製能量條，確保畫面上能看到能量條完全填滿的 100% 狀態
    drawYeahEnergyBar(scene);

    scene.isCinematicActive = true;

    playerSprite.setVelocity(0, 0);
    playerSprite.body.allowGravity = false; // 暫時取消重力讓玩家定住
    playerState.isInvincible = true;        // 動畫期間無敵

    // 清除場上殘留的能量球
    if (yeahEnergyBalls) yeahEnergyBalls.clear(true, true);

    // 凍結顏王Yeah 的移動
    if (yeahSprite && yeahSprite.active) {
        yeahSprite.setVelocity(0, 0);
        yeahSprite.body.allowGravity = false;
    }

    // === 第二階段：黑幕遮罩 (完全黑色) + 祈禱文字逐行顯示 ===
    // 必須將 fillAlpha 設為 1.0，改由 GameObject 的 alpha 控制淡入，否則填滿透明度為 0 時即使改變 global alpha 也依然透明
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1.0);
    overlay.setAlpha(0); // 初始全透明
    overlay.setDepth(9998);

    // 淡入黑幕到完全黑色 (不透明度 1.0)
    scene.tweens.add({
        targets: overlay,
        alpha: 1.0,
        duration: 500,
        onComplete: () => {
            // 祈禱文字的五行內容
            const lines = [
                '在此為胖嘟嘟發電機獻上祈禱',
                '請賜予我聖靈之力',
                '傾聽我的願望',
                '萬物歸盡',
                '顏值崩壞'
            ];

            let currentLine = 0;

            // 逐行顯示函式
            const showNextLine = () => {
                if (currentLine >= lines.length) {
                    // 所有文字顯示完畢，進入第三階段
                    scene.time.delayedCall(500, () => {
                        // 淡出黑幕，同時讓卡在螢幕上的 "顏值崩壞" 字幕一起淡出
                        const fadeTargets = [overlay];
                        if (scene.cinematicText) {
                            fadeTargets.push(scene.cinematicText);
                        }

                        scene.tweens.add({
                            targets: fadeTargets,
                            alpha: 0,
                            duration: 300,
                            onComplete: () => {
                                overlay.destroy();
                                if (scene.cinematicText) {
                                    scene.cinematicText.destroy();
                                    scene.cinematicText = null;
                                }
                                // 進入傳送與魔法陣光束階段
                                triggerDivineBeam(scene, playerSprite, yeahSprite);
                            }
                        });
                    });
                    return;
                }

                const isLastLine = currentLine === lines.length - 1;
                const displayDuration = isLastLine ? 2000 : 1000; // 最後一行顯示 2 秒，其他 1 秒

                // 建立祈禱文字 (極大字型，鋪滿螢幕寬度，呈現史詩感)
                const textStyle = {
                    fontSize: isLastLine ? '120px' : '80px', // 所有文字大幅度放大
                    fill: '#ffd700',
                    fontStyle: 'bold',
                    stroke: isLastLine ? '#ffaa00' : '#000',
                    strokeThickness: isLastLine ? 15 : 10, // 配合大字體加粗邊框
                    padding: { left: 20, right: 20, top: 20, bottom: 20 }
                };

                // 如果是最後一行，加入金色光暈陰影效果
                if (isLastLine) {
                    textStyle.shadow = {
                        color: '#ffd700',
                        fill: true,
                        offsetX: 0,
                        offsetY: 0,
                        blur: 35
                    };
                }

                const lineText = scene.add.text(width / 2, height / 2, lines[currentLine], textStyle)
                    .setOrigin(0.5)
                    .setDepth(9999)
                    .setAlpha(0);

                // 淡入文字
                scene.tweens.add({
                    targets: lineText,
                    alpha: 1,
                    duration: 300,
                    onComplete: () => {
                        // 如果是最後一行，加入一路變大不縮回的特寫放大動畫
                        if (isLastLine) {
                            scene.tweens.add({
                                targets: lineText,
                                scaleX: 1.5, // 最終放大到 1.5 倍
                                scaleY: 1.5,
                                duration: 2000, // 用滿整行字幕顯示的 2 秒時間
                                ease: 'Quad.easeOut' // 平滑漸緩放大
                            });
                        }

                        // 等待指定時間後淡出並顯示下一行 (若為最後一行則保留卡在畫面上)
                        scene.time.delayedCall(displayDuration, () => {
                            if (isLastLine) {
                                scene.cinematicText = lineText; // 暫存到場景物件上，後續光束打下時淡出銷毀
                                currentLine++;
                                showNextLine();
                            } else {
                                scene.tweens.add({
                                    targets: lineText,
                                    alpha: 0,
                                    duration: 200,
                                    onComplete: () => {
                                        lineText.destroy();
                                        currentLine++;
                                        showNextLine();
                                    }
                                });
                            }
                        });
                    }
                });
            };

            // 開始顯示第一行
            showNextLine();
        }
    });
}

/**
 * 神聖光束攻擊 ── 祈禱文字結束後觸發
 * 流程：傳送角色與 Boss → 生成上下黃色魔法陣 → 天降金色巨大光束 4 秒 (加長) → 觸發當機
 */
function triggerDivineBeam(scene, playerSprite, yeahSprite) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // === 第三階段：傳送角色與 Boss ===
    // 顏王Yeah 傳送到戰場的左側旁邊
    if (yeahSprite && yeahSprite.active) {
        yeahSprite.setPosition(150, height - 110);
        yeahSprite.body.allowGravity = false; // 保持關閉重力，防止他移動或落下
    }

    // 玩家被傳送到畫面的最中間
    playerSprite.setPosition(width / 2, height - 110);

    // 重新取得傳送後的玩家座標，以精確繪製魔法陣和光束
    const px = playerSprite.x;
    const py = playerSprite.y;

    // 初始化儲存魔法陣與鎖鏈元件的群組陣列
    const magicCircles = [];

    // === 0. 建立由上黃（金色）到下黑的垂直漸層背景 ===
    const bgGradient = scene.add.graphics();
    // fillGradientStyle(topLeftColor, topRightColor, bottomLeftColor, bottomRightColor, topLeftAlpha, topRightAlpha, bottomLeftAlpha, bottomRightAlpha)
    bgGradient.fillGradientStyle(0xffd700, 0xffd700, 0x000000, 0x000000, 0.9, 0.9, 0.9, 0.9);
    bgGradient.fillRect(0, 0, width, height);
    bgGradient.setDepth(9980); // 置於魔法陣與光束下方，但高於原有地圖背景與物件
    bgGradient.setAlpha(0);    // 初始透明
    magicCircles.push(bgGradient);

    // 漸層背景淡入
    scene.tweens.add({
        targets: bgGradient,
        alpha: 1.0,
        duration: 400
    });

    // 提升玩家與顏王Yeah 的渲染層級，使他們高於漸層背景 (9980) 並且顯示在漸層之上，確保不會跟著地板一起消失
    playerSprite.setDepth(9985);
    playerSprite.setVisible(true);
    playerSprite.setAlpha(1.0); // 確保玩家在施法開始時完全不透明
    if (yeahSprite && yeahSprite.active) {
        yeahSprite.setDepth(9985);
        yeahSprite.setVisible(true);
        yeahSprite.setAlpha(1.0);
    }

    // === 1. 上方浮空魔法陣：高高在天空且有很多層 (5 層) ===
    const skyLayers = 5;
    for (let i = 0; i < skyLayers; i++) {
        // Y 座標高高在天空中，間距為 60px (範圍約 -120 到 -360)
        const yOffset = -120 - i * 60;

        // 使用 Graphics 繪製魔法陣圓環
        const circle = scene.add.graphics();
        circle.setDepth(9990);

        // 調整寬度為螢幕寬度的 1/2，每一層向上稍微縮小以呈現漸層縮小疊加感 (最底層 0.6 倍，最頂層 1.0 倍)
        const ellipseWidth = (width / 2) * (0.6 + i * 0.1);
        const ellipseHeight = ellipseWidth * 0.25;

        // 外圈
        circle.lineStyle(3, 0xffd700, 0.9);
        circle.strokeEllipse(px, py + yOffset, ellipseWidth, ellipseHeight);
        // 內圈
        circle.lineStyle(2, 0xffaa00, 0.6);
        circle.strokeEllipse(px, py + yOffset, ellipseWidth * 0.6, ellipseHeight * 0.6);
        // 核心圈
        circle.lineStyle(1, 0xffffff, 0.5);
        circle.strokeEllipse(px, py + yOffset, ellipseWidth * 0.3, ellipseHeight * 0.3);

        circle.setAlpha(0);
        magicCircles.push(circle);

        // 浮空魔法陣淡入動畫
        scene.tweens.add({
            targets: circle,
            alpha: 1,
            duration: 400,
            delay: i * 100 // 依序淡入
        });
    }

    // === 2. 下方地面魔法陣：只需要一層，位於玩家所在地的地上 ===
    const groundYOffset = 40; // 位於玩家腳底下方的地面高度
    const groundCircle = scene.add.graphics();
    groundCircle.setDepth(9990);

    const groundWidth = width / 2; // 寬度精準為螢幕的 1/2
    const groundHeight = groundWidth * 0.25;

    // 繪製地面魔法陣外圈
    groundCircle.lineStyle(4, 0xffd700, 0.95);
    groundCircle.strokeEllipse(px, py + groundYOffset, groundWidth, groundHeight);
    // 繪製地面魔法陣內圈
    groundCircle.lineStyle(2, 0xffaa00, 0.75);
    groundCircle.strokeEllipse(px, py + groundYOffset, groundWidth * 0.6, groundHeight * 0.6);
    // 繪製地面魔法陣核心圈
    groundCircle.lineStyle(1, 0xffffff, 0.6);
    groundCircle.strokeEllipse(px, py + groundYOffset, groundWidth * 0.3, groundHeight * 0.3);

    groundCircle.setAlpha(0);
    magicCircles.push(groundCircle);

    // 地面魔法陣淡入
    scene.tweens.add({
        targets: groundCircle,
        alpha: 1,
        duration: 400,
        delay: 500
    });

    // === 3. 旁邊生成五個直立金色鎖鏈，連接最頂層與最底層地面魔法陣 ===
    const chainGfx = scene.add.graphics();
    chainGfx.setDepth(9989); // 位於魔法陣正下方
    chainGfx.setAlpha(0);

    // 繪製單條黃金鎖鏈的輔助函式 (由多個金黃色橢圓環扣環組成)
    const drawChainLink = (x1, y1, x2, y2) => {
        const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const steps = Math.max(5, Math.floor(dist / 14));
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const cx = x1 + (x2 - x1) * t;
            const cy = y1 + (y2 - y1) * t;
            chainGfx.lineStyle(3, 0xffd700, 0.9); // 金黃色鏈環
            chainGfx.strokeEllipse(cx, cy, 14, 8);
            chainGfx.lineStyle(1, 0xffffff, 0.6);  // 鏈條高光
            chainGfx.strokeEllipse(cx, cy, 10, 5);
        }
    };

    // 3D透視感四個角落的鎖鏈角度 (兩個前面/外側較寬，兩個後面/內側較窄，避免在2D投影上X軸重合)
    const angles = [
        0.05 * Math.PI,    // 前右 (外側右)
        0.95 * Math.PI,    // 前左 (外側左)
        1.35 * Math.PI,    // 後左 (內側左)
        1.65 * Math.PI     // 後右 (內側右)
    ];

    angles.forEach(angle => {
        // 最上層天空魔法陣 (第 5 層，索引 4) 的 Y 位移為 -120 - 4 * 60 = -360
        const yOffsetTop = -360;

        // 鎖鏈起點：最上層天空魔法陣的橢圓周界點
        const xStart = px + (groundWidth / 2) * Math.cos(angle);
        const yStart = (py + yOffsetTop) + (groundHeight / 2) * Math.sin(angle);

        // 鎖鏈終點：直立向下連接到最底層地面魔法陣的對應橢圓周界點 (x 座標相同，呈現筆直效果)
        const xEnd = px + (groundWidth / 2) * Math.cos(angle);
        const yEnd = (py + groundYOffset) + (groundHeight / 2) * Math.sin(angle);

        drawChainLink(xStart, yStart, xEnd, yEnd);
    });

    magicCircles.push(chainGfx); // 將鎖鏈元件加入清除清單，在結束時一併銷毀

    // 鎖鏈淡入動畫
    scene.tweens.add({
        targets: chainGfx,
        alpha: 1,
        duration: 500,
        delay: 600
    });

    // === 4. 顏王Yeah 往玩家/魔法陣方向散發出黃色粒子光芒 ===
    // 在 scene 中動態生成一個圓形粒子材質 (方便 tint 黃色)
    if (!scene.textures.exists('yellowParticle')) {
        const pGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
        pGraphics.fillStyle(0xffffff, 1.0);
        pGraphics.fillCircle(3, 3, 3);
        pGraphics.generateTexture('yellowParticle', 6, 6);
    }

    const particles = scene.add.particles('yellowParticle');
    particles.setDepth(9995); // 粒子顯示在最上層

    // 計算從顏王Yeah 到玩家/地面魔法陣中心的角度
    const angleRad = Phaser.Math.Angle.Between(yeahSprite.x, yeahSprite.y, px, py + groundYOffset);
    const angleDeg = Phaser.Math.RadToDeg(angleRad);

    // 建立粒子發射器，朝魔法陣呈寬度 80 度的扇形噴灑金色粒子光芒 (更大、更多、更遠！)
    const emitter = particles.createEmitter({
        x: yeahSprite.x,
        y: yeahSprite.y,
        speed: { min: 250, max: 750 }, // 提升粒子速度，使傳播速度更快、更具能量感
        angle: { min: angleDeg - 40, max: angleDeg + 40 }, // 左右各張開 40 度，形成明顯的 80 度扇形覆蓋
        scale: { start: 4.5, end: 0 }, // 大幅調大粒子大小 (由原本的 2.0 提升到 4.5)
        blendMode: 'ADD',
        lifespan: 1800, // 增加生命週期 (1.2秒提升到1.8秒)，使粒子能飛越整個螢幕/魔法陣中心
        frequency: 6, // 縮短發射頻率，由 15ms 改為 6ms，使粒子密度暴增
        quantity: 2, // 每次發射 2 顆粒子，進一步增加粒子數量
        tint: 0xffd700 // 金黃色粒子
    });

    magicCircles.push(particles); // 將粒子系統一併加入清除清單

    // 螢幕閃白代表魔法蓄力完成
    scene.time.delayedCall(800, () => {
        scene.cameras.main.flash(300, 255, 255, 200, false);
    });

    // === 1 秒後天降巨大金色光束打在玩家身上，持續 4 秒 (拉長生存衝擊感) ===
    scene.time.delayedCall(1000, () => {
        // 讓玩家漸漸變透明，配合光束打下去的 4 秒時間，在死掉 (當機) 的瞬間剛好完全透明
        scene.tweens.add({
            targets: playerSprite,
            alpha: 0,
            duration: 4000, // 4 秒內完全透明 (與光束持續時間完美契合)
            ease: 'Linear'
        });

        // 建立光束 Graphics (新增中文註解：建立漸漸變粗光束的畫筆)
        const beam = scene.add.graphics();
        beam.setDepth(9991);
        beam.setAlpha(0);

        // 初始粗度與目標最大粗度 (與地面魔法陣 groundWidth = width / 2 相同) (新增中文註解：設定初始粗度與魔法陣同寬的目標值)
        let currentBeamWidth = 20;
        const targetBeamWidth = width / 2;

        // 繪製神聖光束的內部函式 (新增中文註解：動態更新並繪製金色變粗光束與核心)
        const drawHolyBeam = () => {
            if (!beam || !beam.active) return;
            beam.clear();
            const beamX = px - currentBeamWidth / 2;

            // 1. 光束外層擴散 (淡金色)
            beam.fillStyle(0xffd700, 0.15);
            beam.fillRect(beamX - 25, 0, currentBeamWidth + 50, py + 50);
            
            // 2. 光束主體 (金黃色半透明)
            beam.fillStyle(0xffd700, 0.65);
            beam.fillRect(beamX, 0, currentBeamWidth, py + 50);
            
            // 3. 光束核心 (更亮的白金色)
            beam.fillStyle(0xffffff, 0.45);
            beam.fillRect(beamX + currentBeamWidth * 0.15, 0, currentBeamWidth * 0.7, py + 50);
        };

        // 監聽每幀 update 事件以進行動態重繪 (新增中文註解：監聽每幀重繪以更新雷射粗度)
        const onBeamUpdate = () => {
            drawHolyBeam();
        };
        scene.events.on('update', onBeamUpdate);

        // 光束漸漸變粗動畫 (4秒內粗到跟魔法陣一樣寬) (新增中文註解：啟動膨脹動畫)
        scene.tweens.add({
            targets: { w: 20 },
            w: targetBeamWidth,
            duration: 4000,
            ease: 'Quad.easeIn', // 越後期膨脹速度越快
            onUpdate: (tween, target) => {
                currentBeamWidth = target.w;
            }
        });

        // 光束淡入動畫 (新增中文註解：淡入光束)
        scene.tweens.add({
            targets: beam,
            alpha: 1,
            duration: 200
        });

        // 光束閃爍脈衝效果 (延長為 4 秒)
        scene.tweens.add({
            targets: beam,
            alpha: { from: 0.7, to: 1.0 },
            duration: 150,
            yoyo: true,
            repeat: 24, // 增加脈衝閃爍次數
            delay: 200
        });

        // 螢幕持續震動代表強烈衝擊 (延長為 4 秒)
        scene.cameras.main.shake(4000, 0.015);

        // 4 秒後清除光束與魔法陣，觸發當機畫面
        scene.time.delayedCall(4000, () => {
            // 移除 update 監聽器，避免殘留繪製 (新增中文註解：移除每幀重繪監聽)
            scene.events.off('update', onBeamUpdate);

            // 清除所有魔法陣、鎖鏈與粒子系統
            magicCircles.forEach(c => { if (c && c.destroy) c.destroy(); });

            // 淡出光束
            scene.tweens.add({
                targets: beam,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    beam.destroy();

                    // 恢復玩家重力 (雖然馬上要當機了)
                    playerSprite.body.allowGravity = true;
                    playerState.isInvincible = false;

                    // 被光束打死後，進入選擇畫面 (當機 or 死亡) (新增中文註解：進入選擇選單)
                    showDeathSelectionScreen(scene);
                }
            });
        });
    });
}

/**
 * 死亡選擇畫面 ── 玩家被光束擊碎後觸發
 * 流程：暫停遊戲 → 進入全黑背景 → 打字機效果字體 → 提供「當機」與「死亡」兩個按鈕 → 滾輪滑動 10 秒後可觸發隱藏「冥王炮」按鍵
 */
function showDeathSelectionScreen(scene) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // 暫停遊戲物理與場景 (新增中文註解：暫停遊戲以進行動畫過場)
    if (scene.physics) {
        scene.physics.pause();
    }
    scene.scene.pause();

    // 建立黑色背景的全螢幕 DOM 容器，並允許縱向滾動 (新增中文註解：創建黑色滾動底板)
    const selectContainer = document.createElement('div');
    selectContainer.className = 'death-select-container';
    
    // 直接套用 inline style 確保跨平台/跨瀏覽器視覺效果一致且免除快取問題 (新增中文註解：設定滾動區樣式)
    Object.assign(selectContainer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000', // 全黑背景
        color: '#ffd700', // 金黃色文字
        fontFamily: "'Courier New', Courier, monospace, 'Microsoft JhengHei', sans-serif",
        overflowY: 'scroll', // 允許縱向滾動，讓玩家可以滑動去找隱藏按鈕
        zIndex: '10005', // 高於一切 Dom 層級
        boxSizing: 'border-box',
        scrollBehavior: 'smooth'
    });

    // 建立超長內容容器 (12000px)，需要玩家用滑鼠滾輪往下滑動約 10 秒 (新增中文註解：超長滾動條以隱藏冥王炮)
    const scrollContent = document.createElement('div');
    Object.assign(scrollContent.style, {
        width: '100%',
        height: '12000px', // 極高高度
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    });
    selectContainer.appendChild(scrollContent);

    // === 第一頁面 (0px - 100vh)：顯示原來的當機/死亡選擇 === (新增中文註解：第一頁面的初始死亡選單)
    const firstPage = document.createElement('div');
    Object.assign(firstPage.style, {
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: '0px',
        left: '0px',
        padding: '40px',
        boxSizing: 'border-box'
    });
    scrollContent.appendChild(firstPage);

    // 建立文字內容容器 (放置於第一頁面) (新增中文註解：打字效果的文字框)
    const textElement = document.createElement('div');
    Object.assign(textElement.style, {
        fontSize: '28px',
        lineHeight: '1.6',
        maxWidth: '800px',
        textAlign: 'center',
        marginBottom: '50px',
        minHeight: '150px', // 固定最小高度，防止打字換行時內容抖動
        textShadow: '0 0 10px rgba(255, 215, 0, 0.5)', // 金黃色微發光
        fontWeight: 'bold'
    });
    firstPage.appendChild(textElement);

    // 建立按鈕容器 (放置於第一頁面) (新增中文註解：按鈕包裝框)
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex',
        gap: '40px',
        opacity: '0',
        transition: 'opacity 0.5s ease'
    });

    // 當機按鈕 (新增中文註解：當機選項)
    const crashBtn = document.createElement('button');
    crashBtn.innerText = '當機';
    Object.assign(crashBtn.style, {
        padding: '12px 36px',
        fontSize: '22px',
        backgroundColor: 'transparent',
        color: '#ff4d4d', // 紅色按鈕
        border: '3px solid #ff4d4d',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 8px rgba(255, 77, 77, 0.3)'
    });
    // 滑鼠懸停動畫 (新增中文註解：當機按鈕滑鼠懸停)
    crashBtn.onmouseover = () => {
        crashBtn.style.backgroundColor = '#ff4d4d';
        crashBtn.style.color = '#000000';
        crashBtn.style.boxShadow = '0 0 20px #ff4d4d';
    };
    crashBtn.onmouseout = () => {
        crashBtn.style.backgroundColor = 'transparent';
        crashBtn.style.color = '#ff4d4d';
        crashBtn.style.boxShadow = '0 0 8px rgba(255, 77, 77, 0.3)';
    };

    // 死亡按鈕 (新增中文註解：死亡選項)
    const deathBtn = document.createElement('button');
    deathBtn.innerText = '死亡';
    Object.assign(deathBtn.style, {
        padding: '12px 36px',
        fontSize: '22px',
        backgroundColor: 'transparent',
        color: '#ffd700', // 金色按鈕
        border: '3px solid #ffd700',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 8px rgba(255, 215, 0, 0.3)'
    });
    // 滑鼠懸停動畫 (新增中文註解：死亡按鈕滑鼠懸停)
    deathBtn.onmouseover = () => {
        deathBtn.style.backgroundColor = '#ffd700';
        deathBtn.style.color = '#000000';
        deathBtn.style.boxShadow = '0 0 20px #ffd700';
    };
    deathBtn.onmouseout = () => {
        deathBtn.style.backgroundColor = 'transparent';
        deathBtn.style.color = '#ffd700';
        deathBtn.style.boxShadow = '0 0 8px rgba(255, 215, 0, 0.3)';
    };

    btnContainer.appendChild(crashBtn);
    btnContainer.appendChild(deathBtn);
    firstPage.appendChild(btnContainer);
    document.body.appendChild(selectContainer);

    // === 中間段落：有趣的滾動導引文字 === (新增中文註解：引導往下滾動的深淵提示)
    const addScrollPrompt = (text, topY) => {
        const prompt = document.createElement('div');
        prompt.innerText = text;
        Object.assign(prompt.style, {
            position: 'absolute',
            top: topY + 'px',
            fontSize: '24px',
            color: '#444444', // 暗灰色，增加探索的神祕感
            textShadow: '0 0 5px rgba(255, 215, 0, 0.1)',
            textAlign: 'center',
            width: '100%',
            fontWeight: 'bold'
        });
        scrollContent.appendChild(prompt);
    };

    addScrollPrompt("▼ 往下滾動...", 900);
    addScrollPrompt("（嗯？這下方好像還藏有別的空間...）", 2000);
    addScrollPrompt("（別放棄，繼續朝著黑暗的最深處滾動...）", 4000);
    addScrollPrompt("（熱量正在流逝... 快要突破天王星 the average temperature 了...）", 6000);
    addScrollPrompt("（在無盡的深淵中，似乎有一股綠色的能量在呼喚...）", 8000); // 配合綠色主題修改提示文字為綠色能量
    addScrollPrompt("（就是這裡！釋放被崩解的憤怒吧！）", 10000);

    // === 最底部頁面 (11000px - 12000px)：放置「使用冥王炮」隱藏按鍵 === (新增中文註解：底部隱藏的綠色冥王炮按鍵)
    const lastPage = document.createElement('div');
    Object.assign(lastPage.style, {
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: '11000px',
        left: '0px',
        boxSizing: 'border-box'
    });
    scrollContent.appendChild(lastPage);

    // 建立冥王炮按鍵 (新增中文註解：使用冥王炮綠色按鈕)
    const plutoBtn = document.createElement('button');
    plutoBtn.innerText = '使用冥王炮';
    Object.assign(plutoBtn.style, {
        padding: '20px 60px',
        fontSize: '32px',
        backgroundColor: 'transparent',
        color: '#00ff00', // 綠色代表冥王星新主題色
        border: '4px solid #00ff00',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 15px rgba(0, 255, 0, 0.4)',
        textShadow: '0 0 5px rgba(0, 255, 0, 0.5)'
    });
    // 滑鼠懸停動畫 (新增中文註解：冥王炮按鈕懸停效果)
    plutoBtn.onmouseover = () => {
        plutoBtn.style.backgroundColor = '#00ff00';
        plutoBtn.style.color = '#000000';
        plutoBtn.style.boxShadow = '0 0 35px #00ff00';
    };
    plutoBtn.onmouseout = () => {
        plutoBtn.style.backgroundColor = 'transparent';
        plutoBtn.style.color = '#00ff00';
        plutoBtn.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.4)';
    };
    lastPage.appendChild(plutoBtn);

    // 打字效果實作 (新增中文註解：打字機文字與進度)
    const fullText = "顏值崩壞後，你的顏值已低於天王星的平均溫度，全身又被崩解了(雞柳條也一樣)，請選擇您要就此放棄讓遊戲當掉還是，接受死亡畫面";
    let index = 0;
    
    const typeWriter = () => {
        if (index < fullText.length) {
            textElement.textContent += fullText.charAt(index);
            index++;
            setTimeout(typeWriter, 50); // 每 50 毫秒打一個字
        } else {
            // 打字完畢後漸顯按鈕容器
            btnContainer.style.opacity = '1';
        }
    };

    // 啟動打字效果 (新增中文註解：啟動打字動畫)
    typeWriter();

    // 當機點擊事件 (新增中文註解：除以零製造當機錯誤)
    crashBtn.onclick = () => {
        const result = 1 / 0;
        console.log("Division by zero result: " + result);
        
        setTimeout(() => {
            throw new Error("DivByZeroCrash: " + result);
        }, 0);

        while(true) {}
    };

    // 死亡點擊事件 (新增中文註解：直接進入正常的死亡畫面)
    deathBtn.onclick = () => {
        selectContainer.remove();
        if (scene.triggerCrash) {
            scene.triggerCrash(true);
        }
    };

    // 秘技：冥王炮點擊事件！(進入綠色火焰字幕動畫 + 超華麗綠色爆炸) (新增中文註解：觸發超華麗綠色冥王炮連環特效)
    plutoBtn.onclick = () => {
        // 將網頁 Body 背景暫時設為黑色，防止 Phaser Canvas 兩側露出白色 (新增中文註解：將 Body 背景暫時變黑防漏白)
        document.body.style.backgroundColor = 'black';

        // 1. 關閉滾動並固定在最上方以進行過場
        selectContainer.style.overflowY = 'hidden';
        selectContainer.scrollTop = 0;
        
        // 2. 清空 scrollContent 內的全部元素，為全黑過場字幕做準備
        scrollContent.innerHTML = '';
        scrollContent.style.height = '100vh'; // 將長度縮回為一倍螢幕高度

        // 3. 動態注入綠色火焰燃燒字型 CSS 樣式 (防快取/動態樣式) (新增中文註解：注入酷炫燃燒綠色火焰動畫 CSS)
        if (!document.getElementById('pluto-burning-styles')) {
            const styles = document.createElement('style');
            styles.id = 'pluto-burning-styles';
            styles.innerText = `
                @keyframes green-fire {
                    0% { text-shadow: 0 0 8px #32cd32, 0 -3px 10px #00ff00, 0 -6px 18px #00ff7f, 0 -10px 30px #006400; }
                    50% { text-shadow: 0 0 12px #32cd32, 0 -5px 15px #00ff00, 0 -10px 25px #00ff7f, 0 -15px 40px #006400; }
                    100% { text-shadow: 0 0 8px #32cd32, 0 -3px 10px #00ff00, 0 -6px 18px #00ff7f, 0 -10px 30px #006400; }
                }
                .burning-line {
                    color: #ffffff;
                    font-weight: bold;
                    font-size: 38px;
                    text-align: center;
                    opacity: 0;
                    transform: scale(0.8);
                    transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    margin: 25px 0;
                    letter-spacing: 5px;
                    font-family: 'Microsoft JhengHei', sans-serif;
                    position: absolute; /* 修改為絕對定位以實現疊加淡出效果 */
                }
                .burning-line.active {
                    opacity: 1;
                    transform: scale(1.0);
                    animation: green-fire 0.8s infinite alternate;
                }
                .burning-line.highlight {
                    font-size: 96px;
                    color: #ccffcc;
                    letter-spacing: 14px;
                    margin-top: 40px;
                }
                @keyframes green-fire-strong {
                    0% { text-shadow: 0 0 20px #adff2f, 0 -8px 30px #00ff00, 0 -16px 50px #00ff7f, 0 -24px 70px #008000, 0 0 80px rgba(0,255,0,0.3); }
                    50% { text-shadow: 0 0 35px #adff2f, 0 -12px 45px #00ff00, 0 -24px 65px #00ff7f, 0 -36px 90px #008000, 0 0 120px rgba(0,255,0,0.4); }
                    100% { text-shadow: 0 0 20px #adff2f, 0 -8px 30px #00ff00, 0 -16px 50px #00ff7f, 0 -24px 70px #008000, 0 0 80px rgba(0,255,0,0.3); }
                }
                .burning-line.highlight.active {
                    animation: green-fire-strong 0.6s infinite alternate;
                }
            `;
            document.head.appendChild(styles);
        }

        // 4. 建立置中的文字展示容器 (新增中文註解：建立字幕定位框)
        const textContainer = document.createElement('div');
        Object.assign(textContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100vh',
            boxSizing: 'border-box',
            position: 'relative', // 為了讓粒子絕對定位
            overflow: 'hidden'
        });
        scrollContent.appendChild(textContainer);

        // 字幕逐行顯示排程，新增 duration 參數以控制淡出時機 (新增中文註解：定義字幕排程與淡出時間)
        const lyrics = [
            { text: "我花多年終於", delay: 800, duration: 1000, highlight: false },
            { text: "掌控了體內的迪克拉", delay: 2000, duration: 1000, highlight: false },
            { text: "現在已經可以對你用", delay: 3200, duration: 1000, highlight: false },
            { text: "！！超究極冥王炮！！", delay: 4500, duration: 2000, highlight: true }
        ];

        // 修正：使用全域的 setTimeout 代替 scene.time.delayedCall，因為場景被 pause 後 Phaser 內部時鐘會暫停！ (新增中文註解：使用原生 setTimeout 避開 Phaser 暫停機制)
        lyrics.forEach(item => {
            // 淡入字幕 (新增中文註解：設定延遲時間淡入字幕)
            setTimeout(() => {
                const lineDiv = document.createElement('div');
                lineDiv.innerText = item.text;
                lineDiv.className = 'burning-line' + (item.highlight ? ' highlight' : '');
                textContainer.appendChild(lineDiv);
                
                // 少量延遲以完美觸發 CSS 縮放進場效果 (新增中文註解：延遲啟用 active 類以套用 CSS 動畫)
                setTimeout(() => {
                    lineDiv.classList.add('active');
                }, 50);

                // 如果是最後一句，啟動更大更狂暴的綠色粒子火焰 (新增中文註解：最後一句字幕啟用高頻率、更大粒徑的綠色粒子火焰噴射)
                if (item.highlight) {
                    let particleInterval = setInterval(() => {
                        if (!textContainer || !textContainer.parentNode) {
                            clearInterval(particleInterval);
                            return;
                        }
                        const p = document.createElement('div');
                        const colors = ['#00ff00', '#32cd32', '#00ff7f', '#adff2f'];
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        // 超大粒徑，讓火焰粒子更有壓迫感
                        const size = Math.random() * 40 + 25; // 最大 65px 的巨型火焰粒子
                        
                        Object.assign(p.style, {
                            position: 'absolute',
                            width: size + 'px',
                            height: size + 'px',
                            backgroundColor: color,
                            borderRadius: '50%',
                            left: (Math.random() * 60 + 20) + '%', // 文字周圍隨機 X
                            top: (Math.random() * 40 + 30) + '%', // 文字高度範圍 Y
                            opacity: Math.random() * 0.7 + 0.3,
                            boxShadow: `0 0 25px ${color}, 0 0 50px ${color}, 0 0 80px ${color}`,
                            pointerEvents: 'none',
                            transition: 'all 1.8s ease-out'
                        });
                        textContainer.appendChild(p);
                        
                        // 使粒子向上噴散淡出 (新增中文註解：使粒子產生向上的拋物飄散與縮小淡出效果)
                        setTimeout(() => {
                            p.style.transform = `translate(${(Math.random() * 600 - 300)}px, ${(Math.random() * -700 - 300)}px) scale(0.1)`;
                            p.style.opacity = '0';
                        }, 50);
                        
                        setTimeout(() => { p.remove(); }, 1900);
                    }, 20); // 縮短至 20ms 一顆，使粒子量暴增
                }

                // 淡出字幕 (新增中文註解：在 duration 結束後使該行字幕淡出並清除元件)
                setTimeout(() => {
                    lineDiv.style.opacity = '0';
                    lineDiv.style.transform = 'scale(0.8)';
                    // 漸顯完畢後移除元素，避免影響後續排版
                    setTimeout(() => {
                        lineDiv.remove();
                    }, 600);
                }, item.duration);

            }, item.delay);
        });

        // 5. 字幕播放完畢後 (6.5秒)，回到遊戲釋放超華麗綠色大爆炸 (新增中文註解：使用原生 setTimeout 延時觸發回到場景大爆炸)
        setTimeout(() => {
            // 移除 DOM 容器
            selectContainer.remove();

            // 恢復場景，這樣 Phaser 才可以更新並繪製爆炸與粒子，但維持 physics 暫停 (新增中文註解：重新啟動場景刷新以便繪製粒子動畫)
            scene.scene.resume();
            scene.isCinematicActive = true; // 強制設為 true，不允許玩家移動或繪製原有的 HUD/EnergyBar！

            // 隱藏所有血量與子彈數量的字幕 (新增中文註解：清除所有 Boss HP 與玩家彈藥 HUD 介面)
            showLoliHPText(false);
            if (uncleHPText) uncleHPText.setVisible(false);
            if (doraHPText) doraHPText.setVisible(false);
            if (clone1HPText) clone1HPText.setVisible(false);
            if (clone2HPText) clone2HPText.setVisible(false);
            if (yeahHPText) yeahHPText.setVisible(false);
            if (yeahEnergyText) yeahEnergyText.setVisible(false);
            if (yeahEnergyBar) yeahEnergyBar.setVisible(false);
            const eBar = getEnergyBar();
            if (eBar) eBar.setVisible(false);
            if (typeof setWeaponUIVisible === 'function') {
                setWeaponUIVisible(false);
            }

            // 提升玩家與顏王Yeah 的渲染層級，使他們高於白色背景 (9980) (新增中文註解：提昇玩家與Boss層級使他們不被白色背景遮擋)
            // 修正：依據新要求，玩家傳送到「戰場右側的空中」 (width - 150, height - 300)！
            if (player) {
                player.setDepth(9985);
                player.setVisible(true);
                player.setAlpha(1.0);
                player.setPosition(width - 150, height - 300); // 傳送至右側空中
                if (player.body) {
                    player.body.enable = false; // 關閉物理，使其能懸浮
                }
            }
            if (yeah && yeah.active) {
                yeah.setDepth(9985);
                yeah.setVisible(true);
                yeah.setAlpha(1.0);
                yeah.setPosition(150, height - 110); // 顏王Yeah 傳送至左側地上
                if (yeah.body) {
                    yeah.body.enable = false;
                }
            }

            // 釋放最華麗的綠色爆炸 (新增中文註解：發射綠色究極爆炸)
            triggerSuperPlutoExplosion(scene);
        }, 6500);
    };
}

/**
 * 超究極華麗綠色爆炸 ── 冥王炮擊中顏王Yeah時觸發
 * 特效包含：多色閃光、強烈震動、巨型斜向雷射光束射線、多組高密度的擴散綠色彩色粒子 (新增中文註解：全綠色主題的超華麗核爆特效)
 */
function triggerSuperPlutoExplosion(scene) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // 重新獲取精準的玩家座標與顏王座標 (用於斜向雷射與衝刺軌跡) (新增中文註解：獲取雙方座標繪製對角線巨砲)
    const playerX = width - 150;
    const playerY = height - 300;
    const yeahX = 150;
    const yeahY = height - 110;

    // 建立斜向蓄力與發射時的鏡頭不規則傾斜效果 (新增中文註解：登錄每幀 update 監聽，使鏡頭在蓄力與發射時產生不規則傾斜)
    let tiltTime = 0;
    const onCameraTilt = () => {
        tiltTime += 0.15;
        if (isFiring) {
            // 發射階段：劇烈且不規則的傾斜波動 (波動範圍約 -4 到 +4 度，配合隨機抖動)
            scene.cameras.main.rotation = Math.sin(tiltTime * 0.9) * 0.07 + (Math.random() * 0.03 - 0.015);
        } else {
            // 蓄力階段：較緩慢且沈重的偏轉擺動 (波動範圍約 -2.2 到 +2.2 度)
            scene.cameras.main.rotation = Math.sin(tiltTime * 0.4) * 0.038;
        }
    };
    scene.events.on('update', onCameraTilt);

    // 1. 建立全螢幕黑色底色以襯托綠色魔法陣，並將邊界四邊各向外加大 500 像素以防搖晃漏白 (層級設為 9980 最底層) (新增中文註解：超大黑色底層)
    const whiteBg = scene.add.graphics();
    whiteBg.setDepth(9980);
    whiteBg.fillStyle(0x000000, 1.0);
    whiteBg.fillRect(-500, -500, width + 1000, height + 1000);

    // 2. 暫時隱藏地板與平台以製造深空效果 (新增中文註解：隱藏初始地底平台與地板)
    if (ground) {
        ground.setVisible(false);
    }
    if (platforms) {
        platforms.setVisible(false);
        platforms.getChildren().forEach(child => {
            child.setVisible(false);
        });
    }

    // 3. 建立旋轉綠色科技魔法陣 (放在右側玩家前，大小比之前大 2.2 倍，且有更豐富的細節與射線) (層級 9991) (新增中文註解：玩家前方的特大科技魔法陣)
    const magicCircle = scene.add.graphics();
    magicCircle.setDepth(9991);
    magicCircle.setPosition(playerX, playerY);
    
    // 繪製極具科技感的複雜魔法陣樣式 (多重同心圓 + 8向輻射線與終端小圓 + 八角星) (新增中文註解：繪製超華麗科技魔法陣線條)
    magicCircle.lineStyle(4.5, 0x00ff00, 0.95);
    magicCircle.strokeCircle(0, 0, 160); // 最外層大圈
    
    magicCircle.lineStyle(3.0, 0x00ff7f, 0.85);
    magicCircle.strokeCircle(0, 0, 130); // 中間運行軌道
    
    magicCircle.lineStyle(2.0, 0xadff2f, 0.75);
    magicCircle.strokeCircle(0, 0, 100); // 內層能量圈
    
    magicCircle.lineStyle(1.5, 0xffffff, 0.65);
    magicCircle.strokeCircle(0, 0, 70);  // 核心圈
    
    // 繪製兩組互相旋轉 45 度的正方形，形成八角星 (Octagram) (新增中文註解：繪製神聖八角星防護)
    magicCircle.lineStyle(2.0, 0x00ff00, 0.8);
    magicCircle.strokeRect(-90, -90, 180, 180);
    
    // 繪製第二個正方形 (旋轉 45 度) (新增中文註解：繪製旋轉 45 度的第二個正方形)
    magicCircle.beginPath();
    const size = 90;
    for (let j = 0; j < 4; j++) {
        const rad = (j * Math.PI / 2) + (Math.PI / 4);
        const sx = Math.cos(rad) * size * Math.sqrt(2);
        const sy = Math.sin(rad) * size * Math.sqrt(2);
        if (j === 0) magicCircle.moveTo(sx, sy);
        else magicCircle.lineTo(sx, sy);
    }
    magicCircle.closePath();
    magicCircle.strokePath();

    // 繪製 8 條向外延伸的能量射線，並在末端繪製發光小圓球 (新增中文註解：繪製 8 方向發光輻射線)
    magicCircle.lineStyle(2, 0x00ff7f, 0.85);
    for (let d = 0; d < 8; d++) {
        const angle = (d * Math.PI) / 4;
        const endX = Math.cos(angle) * 160;
        const endY = Math.sin(angle) * 160;
        magicCircle.lineBetween(0, 0, endX, endY);
        magicCircle.strokeCircle(endX, endY, 6);
    }
    
    // 讓魔法陣快速旋轉與縮放 (加大至 2.2 倍) (新增中文註解：魔法陣高速旋轉與向外擴展動畫)
    magicCircle.setScale(0.1);
    scene.tweens.add({
        targets: magicCircle,
        angle: 720, // 旋轉兩圈
        scaleX: 2.2, // 1.5 -> 2.2 倍，極致大魔法陣
        scaleY: 2.2,
        duration: 1500,
        ease: 'Back.easeOut'
    });

    // 3.5 蓄能期間的相機漸進震動與收縮震波環，創造極致蓄能感 (新增中文註解：相機漸進震動與收縮波環)
    scene.cameras.main.shake(1500, 0.006); // 初始輕微晃動
    setTimeout(() => {
        if (scene && scene.sys) scene.cameras.main.shake(500, 0.015); // 蓄力完畢激烈晃動
    }, 1000);

    // 5 個向內收縮的「逆向向心震波環」 (Imploding Shockwave Rings) (新增中文註解：生成向心收縮的高能震波環)
    for (let j = 0; j < 6; j++) {
        setTimeout(() => {
            if (!scene || !scene.sys) return;
            const implodeRing = scene.add.graphics();
            implodeRing.setDepth(9993);
            implodeRing.lineStyle(3, 0x00ff7f, 0.8);
            implodeRing.strokeCircle(0, 0, 300);
            implodeRing.setPosition(playerX, playerY);
            scene.tweens.add({
                targets: implodeRing,
                scaleX: 0.05,
                scaleY: 0.05,
                alpha: 0,
                duration: 800,
                ease: 'Cubic.easeIn',
                onComplete: () => { implodeRing.destroy(); }
            });
        }, j * 220);
    }

    // 4. 收集四周的綠色能量球 (Condensation Phase，粒子球數從 80 大幅增至 200 個！) (新增中文註解：高達 200 顆彩色能量球凝聚至魔法陣)
    const energyBalls = [];
    const chargeDuration = 1500;
    const ballCount = 200; // 80 -> 200，華麗度飆升！
    for (let i = 0; i < ballCount; i++) {
        const startX = Phaser.Math.Between(0, width);
        const startY = Phaser.Math.Between(0, height - 100);
        const ball = scene.add.graphics();
        ball.setDepth(9992);
        
        // 能量球色彩在綠、亮綠、翠綠、青藍之間閃爍交織 (新增中文註解：交織漸變色彩以增加色彩層次)
        const colors = [0x00ff00, 0x00ff7f, 0xadff2f, 0x00ffff];
        const color = colors[i % colors.length];
        ball.fillStyle(color, Phaser.Math.FloatBetween(0.7, 0.95));
        
        const r = Phaser.Math.Between(5, 12); // 大小隨機
        ball.fillCircle(0, 0, r);
        ball.setPosition(startX, startY);
        energyBalls.push(ball);

        // 飛向魔法陣中心縮小淡出
        scene.tweens.add({
            targets: ball,
            x: playerX,
            y: playerY,
            scaleX: 0.05,
            scaleY: 0.05,
            alpha: 0.1,
            duration: chargeDuration - Phaser.Math.Between(0, 450),
            ease: 'Sine.easeIn',
            onComplete: () => {
                ball.destroy();
            }
        });
    }

    // 5. 建立畫面上冥王炮衝擊光束 (玩家發射向 Yeah，斜向發射) (層級 9990，高於人物) (新增中文註解：綠色斜向雷射衝擊波)
    const beamGfx = scene.add.graphics();
    beamGfx.setDepth(9990);

    // 建立用於 Yeah 爆炸粒子效果的粒子系統
    const particles = scene.add.particles('plutoParticle');
    particles.setDepth(9995); // 粒子層級 9995

    // 計算斜向雷射的精確角度 (用於引導噴射流)
    const angleRad = Phaser.Math.Angle.Between(playerX, playerY, yeahX, yeahY);
    const angleDeg = Phaser.Math.RadToDeg(angleRad);

    // 粒子發射器 1：Yeah 處的大爆炸 (綠色粒子數量暴增至 300 顆) (新增中文註解：核心綠色巨量噴射粒子)
    const emitter1 = particles.createEmitter({
        x: yeahX,
        y: yeahY,
        speed: { min: 300, max: 1200 },
        angle: { min: 0, max: 360 },
        scale: { start: 7.0, end: 0 },
        blendMode: 'ADD',
        lifespan: 1600,
        quantity: 300,
        frequency: -1,
        tint: 0x00ff00
    });

    // 粒子發射器 2：Yeah 處裝飾爆炸 (亮黃綠色耀眼火花，200 顆) (新增中文註解：外層黃綠爆散星芒)
    const emitter2 = particles.createEmitter({
        x: yeahX,
        y: yeahY,
        speed: { min: 120, max: 900 },
        angle: { min: 0, max: 360 },
        scale: { start: 5.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 1400,
        quantity: 200,
        frequency: -1,
        tint: 0xadff2f
    });

    // 粒子發射器 3：從玩家空中發射源頭，隨著玩家衝刺動態移動，往顏王Yeah 方向噴灑的金色/青色粒子射流 (新增中文註解：源頭斜向噴發的粒子流)
    const emitter3 = particles.createEmitter({
        x: playerX,
        y: playerY,
        speed: { min: 400, max: 1300 },
        angle: { min: angleDeg - 15, max: angleDeg + 15 },
        scale: { start: 4.8, end: 0 },
        blendMode: 'ADD',
        lifespan: 1200,
        frequency: -1, // 初始不自動噴發，等待衝刺時再啟用
        tint: 0x00ffff
    });

    // 粒子發射器 4：Yeah 處的超高速擴散翠綠火花，形成震撼星環 (數量增加至 250 顆) (新增中文註解：高速翠綠星環粒子)
    const emitter4 = particles.createEmitter({
        x: yeahX,
        y: yeahY,
        speed: { min: 500, max: 1400 },
        angle: { min: 0, max: 360 },
        scale: { start: 4.0, end: 0 },
        blendMode: 'ADD',
        lifespan: 900,
        quantity: 250,
        frequency: -1,
        tint: 0x00ff7f
    });

    // 釋放扁平衝擊波圈 (新增中文註解：繪製扁平擴散的綠色等離子震波圈)
    const spawnRing = (x, y) => {
        const ring = scene.add.graphics();
        ring.setDepth(9993);
        ring.lineStyle(4, 0x00ff7f, 0.95);
        ring.strokeCircle(0, 0, 10);
        ring.setPosition(x, y);
        
        scene.tweens.add({
            targets: ring,
            scaleX: 20,
            scaleY: 10,
            alpha: 0,
            duration: 800,
            ease: 'Quad.easeOut',
            onComplete: () => {
                ring.destroy();
            }
        });
    };

    // 建立用於 Yeah 處吸入的漩渦粒子物件
    const vortexParticles = scene.add.particles('plutoParticle');

    // 延時發射雷射與爆炸效果 (1.5秒凝聚能量後，玩家化為綠光衝向顏王) (新增中文註解：設定 1.5秒 蓄能後玩家化為綠光衝向顏王)
    let isFiring = false;
    setTimeout(() => {
        isFiring = true;

        // 啟動 Emitter 3 伴隨玩家衝刺的藍綠噴流粒子軌跡 (新增中文註解：啟用衝刺粒子流)
        emitter3.setFrequency(8);

        // 讓玩家化身為綠色極光，以 350ms 極速斜向俯衝撞擊顏王 Yeah (新增中文註解：玩家衝刺補間動畫)
        if (player) {
            scene.tweens.add({
                targets: player,
                x: yeahX,
                y: yeahY,
                duration: 350,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    // 撞擊瞬間隱藏玩家，並觸發核爆
                    player.setVisible(false);

                    // 關閉 Emitter 3 的發射
                    emitter3.setFrequency(-1);

                    // 爆發大核爆粒子
                    emitter1.explode();
                    emitter2.explode();
                    emitter4.explode();

                    // 1. 建立代表黑洞的視覺圖形與跟隨的位置座標 (新增中文註解：建立黑洞圖形與位置座標)
                    const blackHoleGfx = scene.add.graphics();
                    blackHoleGfx.setDepth(9996);
                    const bhPos = { x: yeahX, y: yeahY };

                    // 繪製黑洞視覺效果的輔助函數 (新增中文註解：繪製多層綠色黑洞吸積盤效果)
                    const drawBlackHole = (scale = 1.0) => {
                        blackHoleGfx.clear();
                        
                        // 外圍發光暈 (綠色半透明)
                        blackHoleGfx.fillStyle(0x00ff00, 0.15 * scale);
                        blackHoleGfx.fillCircle(0, 0, 75 * scale);
                        
                        // 中層吸積盤發光圈 (萊姆綠)
                        blackHoleGfx.fillStyle(0xadff2f, 0.35 * scale);
                        blackHoleGfx.fillCircle(0, 0, 45 * scale);
                        
                        // 內層超強引力圈 (亮綠)
                        blackHoleGfx.fillStyle(0x00ff7f, 0.7 * scale);
                        blackHoleGfx.fillCircle(0, 0, 25 * scale);
                        
                        // 核心事件視界 (純黑)
                        blackHoleGfx.fillStyle(0x000000, 1.0);
                        blackHoleGfx.fillCircle(0, 0, 18 * scale);
                        
                        // 旋轉吸積電漿弧線細節
                        blackHoleGfx.lineStyle(2, 0x00ff00, 0.8);
                        const segments = 3;
                        const time = scene.time.now * 0.005;
                        for(let a = 0; a < segments; a++) {
                            const startAng = time + (a * Math.PI * 2 / segments);
                            blackHoleGfx.beginPath();
                            blackHoleGfx.arc(0, 0, 30 * scale, startAng, startAng + Math.PI * 0.6);
                            blackHoleGfx.strokePath();
                        }
                    };

                    drawBlackHole(1.0);
                    blackHoleGfx.setPosition(bhPos.x, bhPos.y);

                    // 觸發顏王 Yeah 處的翠綠黑洞吸入漩渦粒子 (新增中文註解：黑洞產生向心旋轉吸入粒子效果)
                    vortexParticles.setDepth(9996);
                    const emitterVortex = vortexParticles.createEmitter({
                        x: bhPos.x,
                        y: bhPos.y,
                        speed: { min: 100, max: 300 },
                        scale: { start: 3.5, end: 0 },
                        blendMode: 'ADD',
                        lifespan: 1200,
                        quantity: 6,
                        frequency: 15,
                        tint: 0x00ff00
                    });

                    let vortexAngle = 0;
                    const vortexTimer = setInterval(() => {
                        if (!vortexParticles.active) {
                            clearInterval(vortexTimer);
                            return;
                        }
                        vortexAngle += 0.3;
                        const r = 80 * (1 - (vortexAngle / 20));
                        if (r > 0) {
                            // 粒子跟隨黑洞中心位置 bhPos
                            emitterVortex.setPosition(bhPos.x + Math.cos(vortexAngle) * r, bhPos.y + Math.sin(vortexAngle) * r);
                        }
                    }, 16);

                    // 2. 漸漸飛到螢幕中間 (新增中文註解：將黑洞平滑移動至螢幕正中心)
                    scene.tweens.add({
                        targets: bhPos,
                        x: width / 2,
                        y: height / 2,
                        duration: 1800,
                        ease: 'Cubic.easeInOut',
                        onUpdate: () => {
                            blackHoleGfx.setPosition(bhPos.x, bhPos.y);
                            drawBlackHole(1.0);
                        },
                        onComplete: () => {
                            // 3. 到達螢幕中間後，開始劇烈顫抖臨界膨脹 (新增中文註解：黑洞到達中心，觸發顫抖膨脹臨界狀態)
                            scene.tweens.add({
                                targets: { scale: 1.0 },
                                scale: 2.8,
                                duration: 400,
                                ease: 'Quad.easeIn',
                                onUpdate: (tween, target) => {
                                    const shakeX = (Math.random() - 0.5) * 15;
                                    const shakeY = (Math.random() - 0.5) * 15;
                                    blackHoleGfx.setPosition(width / 2 + shakeX, height / 2 + shakeY);
                                    drawBlackHole(target.scale);
                                },
                                onComplete: () => {
                                    // 4. 超級超級超級大爆炸！(新增中文註解：釋放終極華麗的超級超級超級大爆炸)
                                    // 銷毀黑洞圖形與粒子
                                    blackHoleGfx.destroy();
                                    vortexParticles.destroy();
                                    clearInterval(vortexTimer);

                                    // 鏡頭劇烈震動與極強大閃光 (新增中文註解：終極爆炸震動與三色色溫大閃光)
                                    scene.cameras.main.shake(2500, 0.08);
                                    scene.cameras.main.flash(500, 0, 255, 0); // 螢光綠閃光
                                    
                                    scene.time.delayedCall(200, () => {
                                        scene.cameras.main.flash(400, 255, 255, 255); // 白色閃光
                                    });
                                    scene.time.delayedCall(500, () => {
                                        scene.cameras.main.flash(400, 255, 215, 0); // 金黃色閃光
                                    });

                                    // 生成 3 組有時間差的等離子大震波圈 (新增中文註解：連環擴散 3 組巨型等離子震波圈)
                                    for (let w = 0; w < 3; w++) {
                                        scene.time.delayedCall(w * 150, () => {
                                            const shockwaveGfx = scene.add.graphics();
                                            shockwaveGfx.setDepth(9999);
                                            
                                            // 主題色閃爍
                                            const waveColors = [0x00ff00, 0xadff2f, 0x00ffff];
                                            const wColor = waveColors[w];
                                            
                                            scene.tweens.add({
                                                targets: { r: 10, alpha: 1.0 },
                                                r: 2500,
                                                alpha: 0,
                                                duration: 1600,
                                                ease: 'Cubic.easeOut',
                                                onUpdate: (tween, target) => {
                                                    shockwaveGfx.clear();
                                                    
                                                    shockwaveGfx.lineStyle(60 * target.alpha, wColor, target.alpha * 0.8);
                                                    shockwaveGfx.strokeCircle(width / 2, height / 2, target.r);
                                                    
                                                    shockwaveGfx.lineStyle(30 * target.alpha, 0xffffff, target.alpha * 0.95);
                                                    shockwaveGfx.strokeCircle(width / 2, height / 2, target.r - 50);
                                                },
                                                onComplete: () => {
                                                    shockwaveGfx.destroy();
                                                }
                                            });
                                        });
                                    }

                                    // 爆發 1200 顆超巨型、超高速粒子 (新增中文註解：爆發四色 1200 顆超大超高速核爆粒子)
                                    const megaParticles = scene.add.particles('plutoParticle');
                                    megaParticles.setDepth(10000);
                                    
                                    const tints = [0x00ff00, 0xadff2f, 0x00ffff, 0xffffff];
                                    const megaEmitters = tints.map(tint => {
                                        return megaParticles.createEmitter({
                                            x: width / 2,
                                            y: height / 2,
                                            speed: { min: 250, max: 1700 },
                                            angle: { min: 0, max: 360 },
                                            scale: { start: 9.5, end: 0 },
                                            blendMode: 'ADD',
                                            lifespan: { min: 1400, max: 2600 },
                                            quantity: 300,
                                            frequency: -1,
                                            tint: tint
                                        });
                                    });
                                    
                                    megaEmitters.forEach(e => e.explode());
                                    
                                    setTimeout(() => {
                                        megaParticles.destroy();
                                    }, 2800);
                                }
                            });
                        }
                    });

                    // 撞擊時強烈多重色溫大閃光與激震 (新增中文註解：斜向轟擊造成核爆閃光與激震)
                    scene.cameras.main.flash(450, 0, 255, 0); // 螢光綠閃光
                    scene.cameras.main.shake(1800, 0.05);

                    // 額外追加多重色溫閃光，增強粒子爆炸華麗層次
                    scene.time.delayedCall(300, () => {
                        scene.cameras.main.flash(300, 173, 255, 47); // 萊姆綠閃光
                    });
                    scene.time.delayedCall(600, () => {
                        scene.cameras.main.flash(300, 0, 255, 255); // 青色閃光
                    });
                }
            });
        }

        // 在發射時，每隔 200ms 產生一個能量環 (共 4 個) (新增中文註解：連環發射等離子擴散波)
        for (let r = 0; r < 4; r++) {
            setTimeout(() => {
                spawnRing(playerX, playerY);
            }, r * 200);
        }

    }, chargeDuration);

    // 繪製與隨時間膨脹的斜向衝擊光束 (終點綁定在 player 的當前 X/Y，呈現雷射追隨衝刺拉伸效果) (新增中文註解：斜向雷射追隨玩家衝刺)
    let beamWidth = 20;
    let arcTime = 0;
    const updateBeam = () => {
        if (!isFiring || !beamGfx.active) return;
        beamGfx.clear();
        arcTime += 0.25;

        // 雷射尾端跟隨玩家當前的 X/Y 座標
        const currentEndX = player.x;
        const currentEndY = player.y;

        // 計算斜向雷射線段的法向量 (Perpendicular Vector nx, ny)，用於繪製正弦高壓電弧
        const dx = currentEndX - playerX;
        const dy = currentEndY - playerY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        // 1. 外圍暗綠能量暈 (新增中文註解：外層深綠色能量擴散效果，繪製斜向線條)
        beamGfx.lineStyle(beamWidth + 50, 0x003300, 0.35);
        beamGfx.lineBetween(playerX, playerY, currentEndX, currentEndY);
        
        // 2. 主光波 (亮綠) (新增中文註解：中層螢光綠斜向主雷射波)
        beamGfx.lineStyle(beamWidth, 0x00ff00, 0.85);
        beamGfx.lineBetween(playerX, playerY, currentEndX, currentEndY);
        
        // 3. 光波核心 (超亮白綠色) (新增中文註解：內層白綠色核心雷射)
        beamGfx.lineStyle(beamWidth / 2, 0xe6ffe6, 0.95);
        beamGfx.lineBetween(playerX, playerY, currentEndX, currentEndY);

        // 4. 繪製兩條螺旋纏繞在斜向雷射兩側的綠色高壓正弦電弧 (新增中文註解：繪製正弦高壓電弧圍繞斜向光束)
        beamGfx.lineStyle(3, 0x00ff7f, 0.95);
        beamGfx.beginPath();
        const segments = 55;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const bx = playerX + dx * t;
            const by = playerY + dy * t;
            const wave = Math.sin(t * Math.PI * 6 + arcTime) * (beamWidth / 2 + 15);
            const x = bx + nx * wave;
            const y = by + ny * wave;
            if (i === 0) beamGfx.moveTo(x, y);
            else beamGfx.lineTo(x, y);
        }
        beamGfx.strokePath();

        // 另一條反相正弦電弧
        beamGfx.lineStyle(2, 0xadff2f, 0.85);
        beamGfx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const bx = playerX + dx * t;
            const by = playerY + dy * t;
            const wave = Math.sin(t * Math.PI * 6 - arcTime + Math.PI) * (beamWidth / 2 + 12);
            const x = bx + nx * wave;
            const y = by + ny * wave;
            if (i === 0) beamGfx.moveTo(x, y);
            else beamGfx.lineTo(x, y);
        }
        beamGfx.strokePath();

        // 當發射啟用時，粒子噴射源頭跟隨玩家位置 (新增中文註解：將噴流粒子發射點鎖定至衝刺玩家)
        if (player) {
            emitter3.setPosition(player.x, player.y);
        }
    };
    scene.events.on('update', updateBeam);

    // 光束寬度膨脹動畫 (新增中文註解：雷射主體膨脹動畫)
    scene.tweens.add({
        targets: { w: 20 },
        w: 120,
        duration: 400,
        delay: chargeDuration,
        onUpdate: (tween, target) => {
            beamWidth = target.w;
        }
    });

    // 光束主體與魔法陣淡出銷毀，並進入 1/0 系統崩壞矩陣故障效果 (新增中文註解：淡出主雷射束並觸發數字矩陣系統崩毀效果)
    scene.tweens.add({
        targets: beamGfx,
        alpha: 0,
        duration: 1500,
        delay: chargeDuration,
        ease: 'Power2',
        onComplete: () => {
            scene.events.off('update', updateBeam);
            scene.events.off('update', onCameraTilt); // 卸載相機偏轉監聽器 (新增中文註解：卸載相機旋轉監聽)
            beamGfx.destroy();
            particles.destroy();
            magicCircle.destroy(); // 銷毀魔法陣

            // 恢復鏡頭旋轉至 0 (新增中文註解：重置鏡頭旋轉)
            scene.tweens.add({
                targets: scene.cameras.main,
                rotation: 0,
                duration: 300,
                ease: 'Quad.easeOut'
            });
            
            // 讓原本的顏王與玩家隱藏，準備進入「排排站自爆」劇本 (新增中文註解：隱藏原來的顏王與玩家，準備大集體演出)
            if (yeah) {
                yeah.setActive(false).setVisible(false);
                if (yeah.body) yeah.body.enable = false;
            }
            if (player) {
                player.setActive(false).setVisible(false);
            }
        }
    });

    // 5. 系統崩解 Matrix 故障效果 (在雷射光波淡出時觸發，模擬 1/0 計算崩潰) (新增中文註解：雷射消退時在白屏上渲染螢光綠色塊與橫向噪點線條)
    setTimeout(() => {
        const glitchGfx = scene.add.graphics();
        glitchGfx.setDepth(10001); // 設在最上層
        
        let glitchTicks = 0;
        const glitchTimer = setInterval(() => {
            if (glitchTicks > 15) {
                clearInterval(glitchTimer);
                glitchGfx.destroy();
                
                // 6. === 執行全新劇本：所有 Boss 排成一排，下一秒依序從左至右大爆炸 === (新增中文註解：故障效果結束後，執行 Boss 集體排排站與七彩大核爆劇本)
                triggerBossAlignAndExplodeScript(scene);
                return;
            }
            glitchGfx.clear();
            glitchGfx.fillStyle(0x00ff00, 0.4);
            // 繪製隨機綠色塊 (代表顯卡/系統崩壞)
            for (let g = 0; g < 7; g++) {
                const gw = Phaser.Math.Between(60, 450);
                const gh = Phaser.Math.Between(6, 35);
                const gx = Phaser.Math.Between(0, width - gw);
                const gy = Phaser.Math.Between(0, height - gh);
                glitchGfx.fillRect(gx, gy, gw, gh);
            }
            // 繪製橫向掃描噪點線
            glitchGfx.lineStyle(2, 0x00ff7f, 0.7);
            for (let l = 0; l < 4; l++) {
                const ly = Phaser.Math.Between(0, height);
                glitchGfx.lineBetween(0, ly, width, ly);
            }
            glitchTicks++;
        }, 80);
    }, chargeDuration + 4350); // 配合黑洞移動與臨界超級大爆炸後的淡出時機
}

function triggerBossAlignAndExplodeScript(scene) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // 將網頁 Body 背景還原為白色，與 Phaser 白色底色對齊 (新增中文註解：Body 背景還原為白色)
    document.body.style.backgroundColor = 'white';

    // 先行隱藏所有可能存在的殘留子彈或特效，確保場景乾淨 (新增中文註解：清空所有殘留彈幕)
    if (mgBullets) mgBullets.clear(true, true);
    if (sgBullets) sgBullets.clear(true, true);
    if (snBullets) snBullets.clear(true, true);

    // 重新建立全螢幕白色底色，並向外加大 500 像素以防相機搖晃漏白 (新增中文註解：將背景還原為超大白色背景)
    const restoreWhiteBg = scene.add.graphics();
    restoreWhiteBg.setDepth(9980);
    restoreWhiteBg.fillStyle(0xffffff, 1.0);
    restoreWhiteBg.fillRect(-500, -500, width + 1000, height + 1000);

    // 還原顯示地底平台與地板 (新增中文註解：還原顯示地板與平台)
    if (ground) {
        ground.setVisible(true);
        ground.setDepth(9981);
    }
    if (platforms) {
        platforms.setVisible(true);
        platforms.setDepth(9981);
        platforms.getChildren().forEach(child => {
            child.setVisible(true);
            child.setDepth(9981);
        });
    }

    // 1. 所有 Boss 出場並排成一排 (站在地板上 height - 110)
    // 蘿莉 (紫色), 猥瑣大叔 (黑色/暗灰), 哆啦噩夢 (藍色), 顏王Yeah (黃色), 請屎皇 (綠色), 我沒有GG (紫色), 大猩猩 (橘紅) (新增中文註解：七位 Boss 進行排排站定位)
    // 修正：必須強制設定 .setDepth(9985) 使其顯示高於白色背景與地板之上！ (新增中文註解：提昇深度至 9985 避免被白色背景與地板遮擋)
    setTimeout(() => {
        if (loli) {
            loli.setPosition(width * 0.125, height - 110);
            loli.setVisible(true).setAlpha(0).setDepth(9985);
            if (loli.body) loli.body.enable = false; // 關閉物理，避免因重力掉落
            scene.tweens.add({ targets: loli, alpha: 1, duration: 400 });
        }
    }, 100);

    setTimeout(() => {
        if (uncle) {
            uncle.setPosition(width * 0.25, height - 110);
            uncle.setVisible(true).setAlpha(0).setDepth(9985);
            if (uncle.body) uncle.body.enable = false;
            scene.tweens.add({ targets: uncle, alpha: 1, duration: 400 });
        }
    }, 300);

    setTimeout(() => {
        if (dora) {
            dora.setPosition(width * 0.375, height - 110);
            dora.setVisible(true).setAlpha(0).setDepth(9985);
            if (dora.body) dora.body.enable = false;
            scene.tweens.add({ targets: dora, alpha: 1, duration: 400 });
        }
    }, 500);

    setTimeout(() => {
        if (yeah) {
            yeah.setPosition(width * 0.5, height - 110);
            yeah.setVisible(true).setAlpha(0).setDepth(9985);
            if (yeah.body) yeah.body.enable = false;
            scene.tweens.add({ targets: yeah, alpha: 1, duration: 400 });
        }
    }, 700);

    setTimeout(() => {
        if (poopKing) {
            poopKing.setPosition(width * 0.625, height - 110);
            poopKing.setVisible(true).setAlpha(0).setDepth(9985);
            if (poopKing.body) poopKing.body.enable = false;
            scene.tweens.add({ targets: poopKing, alpha: 1, duration: 400 });
        }
    }, 900);

    setTimeout(() => {
        if (noGG) {
            noGG.setPosition(width * 0.75, height - 110);
            noGG.setVisible(true).setAlpha(0).setDepth(9985);
            if (noGG.body) noGG.body.enable = false;
            scene.tweens.add({ targets: noGG, alpha: 1, duration: 400 });
        }
    }, 1100);

    setTimeout(() => {
        if (gorilla) {
            gorilla.setPosition(width * 0.875, height - 110);
            gorilla.setVisible(true).setAlpha(0).setDepth(9985);
            if (gorilla.body) gorilla.body.enable = false;
            scene.tweens.add({ targets: gorilla, alpha: 1, duration: 400 });
        }
    }, 1300);

    // 2. 獨立 Boss 主題色爆炸輔助函式 (新增中文註解：定義個別 Boss 專屬主題色爆炸粒子與相機閃光函數)
    const triggerIndividualExplosion = (bossSprite, tintColor, flashColor) => {
        if (!bossSprite) return; // 移除 .active 檢查，以確保被暫停停用的 Boss 也能順利自爆
        const bx = bossSprite.x;
        const by = bossSprite.y;

        // 隱藏 Boss
        bossSprite.setVisible(false);

        // 生成粒子材質
        const pGfx = scene.make.graphics({ x: 0, y: 0, add: false });
        pGfx.fillStyle(0xffffff, 1.0);
        pGfx.fillCircle(3, 3, 3);
        const textureKey = 'bossExplodePart_' + tintColor;
        if (!scene.textures.exists(textureKey)) {
            pGfx.generateTexture(textureKey, 6, 6);
        }
        const bParticles = scene.add.particles(textureKey);
        bParticles.setDepth(10010); // 置於最頂層

        // 噴散粒子 (更大、更多粒子)
        const bEmitter = bParticles.createEmitter({
            x: bx,
            y: by,
            speed: { min: 120, max: 700 },
            angle: { min: 0, max: 360 },
            scale: { start: 4.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 1200,
            quantity: 120,
            frequency: -1,
            tint: tintColor
        });

        // 針對大叔的黑色/暗灰色，使用 NORMAL 混合模式以避免 ADD 在白底上看不清 (新增中文註解：黑色爆炸在白色背景下使用 NORMAL 混合模式以清楚呈現)
        if (tintColor === 0x111111) {
            bEmitter.setBlendMode('NORMAL');
            bEmitter.setTint(0x1a1a1a); // 使用深黑灰色粒子
        }

        bEmitter.explode();

        // 爆炸時鏡頭產生隨機側傾 (不規則傾斜)，隨後恢復 (新增中文註解：Boss 爆炸鏡頭產生不規則傾斜與復位)
        const randomTilt = (Math.random() > 0.5 ? 1 : -1) * Phaser.Math.FloatBetween(0.04, 0.08);
        scene.tweens.add({
            targets: scene.cameras.main,
            rotation: randomTilt,
            duration: 80,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                scene.cameras.main.rotation = 0;
            }
        });

        // 銷毀粒子物件
        setTimeout(() => {
            bParticles.destroy();
        }, 1500);
    };

    // 3. 一秒後 (在 500ms + 700ms 後再等待 1.2秒，即 1900ms) 讓七位 Boss 從左到右一一自爆！ (新增中文註解：Boss 全員對齊後一秒，七位從左到右依序大自爆！)
    const startExplodeTime = 1900;
    
    setTimeout(() => {
        triggerIndividualExplosion(loli, 0xff00ff, 0xff00ff); // 蘿莉：紫色自爆
        scene.cameras.main.flash(200, 255, 0, 255); // 紫色閃光
        scene.cameras.main.shake(250, 0.02);
    }, startExplodeTime);

    setTimeout(() => {
        triggerIndividualExplosion(uncle, 0x111111, 0x111111); // 大叔：暗黑自爆
        scene.cameras.main.flash(200, 56, 56, 56); // 暗灰色閃光
        scene.cameras.main.shake(250, 0.02);
    }, startExplodeTime + 300);

    setTimeout(() => {
        triggerIndividualExplosion(dora, 0x0000ff, 0x0000ff); // 哆啦：藍色自爆
        scene.cameras.main.flash(200, 0, 0, 255); // 藍色閃光
        scene.cameras.main.shake(250, 0.02);
    }, startExplodeTime + 600);

    setTimeout(() => {
        triggerIndividualExplosion(yeah, 0xffff00, 0xffff00); // 顏王：黃色自爆
        scene.cameras.main.flash(350, 255, 215, 0); // 黃金色終結閃光
        scene.cameras.main.shake(350, 0.03);
    }, startExplodeTime + 900);

    setTimeout(() => {
        triggerIndividualExplosion(poopKing, 0x00ff00, 0x00ff00); // 請屎皇：綠色自爆 (新增中文註解：請屎皇綠色粒子自爆)
        scene.cameras.main.flash(350, 0, 255, 0); // 綠色終結閃光
        scene.cameras.main.shake(350, 0.03);
    }, startExplodeTime + 1200);

    setTimeout(() => {
        triggerIndividualExplosion(noGG, 0xff00ff, 0xff00ff); // 我沒有GG：粉紅色/紫色自爆 (新增中文註解：我沒有GG紫色粒子自爆)
        scene.cameras.main.flash(350, 255, 0, 255); // 紫色終結閃光
        scene.cameras.main.shake(350, 0.03);
    }, startExplodeTime + 1500);

    setTimeout(() => {
        triggerIndividualExplosion(gorilla, 0xff4500, 0xff4500); // 大猩猩：烈焰橘紅色自爆 (新增中文註解：大猩猩橘紅色粒子自爆)
        scene.cameras.main.flash(350, 255, 69, 0); // 橘紅色終結閃光
        scene.cameras.main.shake(350, 0.03);
    }, startExplodeTime + 1800);

    // 4. 爆炸完後，顯現最終感性/鬼畜的字幕與 Alfa-X 作者署名 (新增中文註解：定時觸發最終感性結局字幕，延後至 3100ms)
    setTimeout(() => {
        showFinalEndingCredits(scene);
    }, startExplodeTime + 3100);
}

/**
 * 終極感性結局字幕與作者署名 ── 爆炸結束後觸發
 * 流程：漸顯黑幕 → 逐字打字機特效顯示感性對話 → 下一秒瞬間彈出特大紅光 "DRIVE!!!!!!" 與作者署名 (新增中文註解：終極結局感性字幕與彩蛋)
 */
function showFinalEndingCredits(scene) {
    // 建立全螢幕遮罩 DOM
    const endContainer = document.createElement('div');
    endContainer.className = 'final-ending-container';
    Object.assign(endContainer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000', // 漸顯全黑
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Courier New', Courier, monospace, 'Microsoft JhengHei', sans-serif",
        zIndex: '10006',
        opacity: '0',
        transition: 'opacity 1.2s ease',
        boxSizing: 'border-box',
        padding: '40px'
    });
    document.body.appendChild(endContainer);

    // 漸顯黑幕
    setTimeout(() => {
        endContainer.style.opacity = '1';
    }, 100);

    // 建立打字文字框 (新增中文註解：打字效果文字元件)
    const typeTextDiv = document.createElement('div');
    Object.assign(typeTextDiv.style, {
        fontSize: '28px',
        lineHeight: '1.8',
        maxWidth: '850px',
        textAlign: 'center',
        marginBottom: '50px',
        color: '#ffd700', // 金黃色代表終焉的祈禱
        textShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
        minHeight: '120px',
        fontWeight: 'bold'
    });
    endContainer.appendChild(typeTextDiv);

    // 欲顯示的打字字幕
    const fullMsg = "所有Boss已被消滅，你要做什麼，人生意義為Emotional Damage，我建議你放下3C去睡覺吧，除非你真的很想要被...";
    let charIdx = 0;

    // 字幕打字排程
    setTimeout(() => {
        const typeInterval = setInterval(() => {
            if (charIdx < fullMsg.length) {
                typeTextDiv.textContent += fullMsg.charAt(charIdx);
                charIdx++;
            } else {
                clearInterval(typeInterval);

                // 打字完成後等待 1 秒 (「下一秒」)，震撼呈現特大 "DRIVE!!!!!!" 與作者署名
                setTimeout(() => {
                    // DRIVE 字幕 (新增中文註解：紅色特大 DRIVE 字幕)
                    const driveDiv = document.createElement('div');
                    driveDiv.innerText = "DRIVE!!!!!!";
                    Object.assign(driveDiv.style, {
                        fontSize: '110px',
                        fontWeight: 'bold',
                        color: '#ff0000', // 強烈鮮紅
                        textShadow: '0 0 20px #ff0000, 0 0 45px #ff0000',
                        animation: 'drive-glitch 0.12s infinite alternate',
                        marginBottom: '15px', // 從 30px 縮小至 15px，讓 Alfa-X 往上移 (新增中文註解：縮小邊距使作者署名上移)
                        opacity: '0',
                        transform: 'scale(0.4)',
                        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    });

                    // 動態載入 DRIVE 抖動/噪點動畫 CSS (新增中文註解：動態載入 DRIVE Glitch 動畫)
                    if (!document.getElementById('drive-ending-styles')) {
                        const styleSheet = document.createElement('style');
                        styleSheet.id = 'drive-ending-styles';
                        styleSheet.innerText = `
                            @keyframes drive-glitch {
                                0% { transform: translate(2px, 1px) rotate(0deg); }
                                10% { transform: translate(-1px, -2px) rotate(-1.5deg); }
                                20% { transform: translate(-3px, 0px) rotate(1.5deg); }
                                30% { transform: translate(0px, 2px) rotate(0deg); }
                                40% { transform: translate(1px, -1px) rotate(1.5deg); }
                                50% { transform: translate(-1px, 2px) rotate(-1.5deg); }
                                60% { transform: translate(-3px, 1px) rotate(0deg); }
                                70% { transform: translate(2px, 1px) rotate(-1.5deg); }
                                80% { transform: translate(-1px, -1px) rotate(1.5deg); }
                                90% { transform: translate(2px, 2px) rotate(0deg); }
                                100% { transform: translate(1px, -2px) rotate(-1.5deg); }
                            }
                        `;
                        document.head.appendChild(styleSheet);
                    }

                    // 作者署名 (新增中文註解：作者署名)
                    const authorDiv = document.createElement('div');
                    authorDiv.innerText = "by. Alfa-X";
                    Object.assign(authorDiv.style, {
                        fontSize: '32px',
                        color: '#a0a0a0',
                        textShadow: '0 0 6px rgba(255, 255, 255, 0.25)',
                        opacity: '0',
                        transition: 'opacity 0.8s ease',
                        fontWeight: 'bold',
                        letterSpacing: '2px'
                    });

                    // 提示文字 (新增中文註解：密碼提示文字)
                    const hintDiv = document.createElement('div');
                    hintDiv.innerText = "提示：Driver團團長的絕招是什麼？";
                    Object.assign(hintDiv.style, {
                        fontSize: '20px',
                        color: '#888888',
                        marginTop: '15px',
                        marginBottom: '10px',
                        opacity: '0',
                        transition: 'opacity 0.8s ease',
                        fontStyle: 'italic',
                        fontFamily: "'Microsoft JhengHei', sans-serif"
                    });

                    // 建立密碼輸入框容器 (新增中文註解：建立輸入框與按鈕容器)
                    const inputContainer = document.createElement('div');
                    Object.assign(inputContainer.style, {
                        display: 'flex',
                        gap: '15px',
                        alignItems: 'center',
                        marginTop: '40px',
                        opacity: '0',
                        transition: 'opacity 1.0s ease, transform 0.2s ease-out'
                    });

                    // 密碼輸入文字框 (新增中文註解：建立密碼輸入文字框元件)
                    const passwordInput = document.createElement('input');
                    passwordInput.type = 'text';
                    passwordInput.placeholder = '請輸入密碼...';
                    Object.assign(passwordInput.style, {
                        padding: '12px 20px',
                        fontSize: '18px',
                        borderRadius: '8px',
                        border: '2px solid #ffd700',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: '#ffd700',
                        outline: 'none',
                        boxShadow: '0 0 10px rgba(255, 215, 0, 0.2)',
                        fontFamily: "'Microsoft JhengHei', sans-serif"
                    });

                    // 確認按鈕 (新增中文註解：建立確認按鈕)
                    const confirmBtn = document.createElement('button');
                    confirmBtn.innerText = '確認';
                    Object.assign(confirmBtn.style, {
                        padding: '12px 24px',
                        fontSize: '18px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#ffd700',
                        color: '#000000',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 0 15px rgba(255, 215, 0, 0.4)',
                        fontFamily: "'Microsoft JhengHei', sans-serif",
                        transition: 'background-color 0.2s, box-shadow 0.2s'
                    });

                    // 滑鼠移入按鈕懸停動畫 (新增中文註解：按鈕懸停與離開時的樣式切換)
                    confirmBtn.onmouseover = () => {
                        confirmBtn.style.backgroundColor = '#ffea70';
                        confirmBtn.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.7)';
                    };
                    confirmBtn.onmouseout = () => {
                        confirmBtn.style.backgroundColor = '#ffd700';
                        confirmBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.4)';
                    };

                    // 確認按鈕點擊事件 (新增中文註解：點擊確認按鈕進行密碼驗證與頁面跳轉)
                    confirmBtn.onclick = () => {
                        if (passwordInput.value.trim() === '自爆') {
                            // 密碼正確，淡出結語頁面所有內容 (新增中文註解：密碼正確，淡出結局畫面並過渡)
                            endContainer.style.transition = 'opacity 1.5s ease';
                            endContainer.style.opacity = '0';
                            
                            setTimeout(() => {
                                // 移除結語 container
                                endContainer.remove();
                                
                                // 建立一個全新的黑色頁面 (新增中文註解：建立全新純黑頁面)
                                const blackPage = document.createElement('div');
                                Object.assign(blackPage.style, {
                                    position: 'fixed',
                                    top: '0',
                                    left: '0',
                                    width: '100vw',
                                    height: '100vh',
                                    backgroundColor: '#000000',
                                    zIndex: '10007',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: '#ffffff',
                                    fontFamily: "'Microsoft JhengHei', sans-serif",
                                    fontSize: '24px'
                                });
                                document.body.appendChild(blackPage);
                                
                                // 建立內容容器 (新增中文註解：建立新頁面文字與按鈕的 Flex 容器)
                                const contentWrapper = document.createElement('div');
                                Object.assign(contentWrapper.style, {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '30px',
                                    textAlign: 'center',
                                    maxWidth: '850px',
                                    padding: '20px',
                                    opacity: '0',
                                    transition: 'opacity 1.0s ease'
                                });
                                blackPage.appendChild(contentWrapper);

                                // 標題文字 (新增中文註解：結局恭喜與引導文字)
                                const mainTitle = document.createElement('div');
                                mainTitle.innerText = "恭喜你破到這個結局，有一個問題要問你，請先回答在看問題";
                                Object.assign(mainTitle.style, {
                                    fontSize: '26px',
                                    color: '#00ff00',
                                    fontWeight: 'bold',
                                    textShadow: '0 0 10px rgba(0, 255, 0, 0.4)',
                                    lineHeight: '1.6'
                                });
                                contentWrapper.appendChild(mainTitle);

                                // 按鈕容器 (新增中文註解：按鈕 Flex 容器)
                                const btnContainer = document.createElement('div');
                                Object.assign(btnContainer.style, {
                                    display: 'flex',
                                    gap: '40px',
                                    marginTop: '20px'
                                });
                                contentWrapper.appendChild(btnContainer);

                                // "是" 按鈕 (新增中文註解：是按鈕)
                                const yesBtn = document.createElement('button');
                                yesBtn.innerText = "是";
                                Object.assign(yesBtn.style, {
                                    padding: '15px 40px',
                                    fontSize: '22px',
                                    borderRadius: '10px',
                                    border: '2px solid #00ff00',
                                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                    color: '#00ff00',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 0 15px rgba(0, 255, 0, 0.2)',
                                    fontFamily: "'Microsoft JhengHei', sans-serif",
                                    transition: 'all 0.2s'
                                });

                                // "沒有" 按鈕 (新增中文註解：沒有按鈕)
                                const noBtn = document.createElement('button');
                                noBtn.innerText = "沒有";
                                Object.assign(noBtn.style, {
                                    padding: '15px 40px',
                                    fontSize: '22px',
                                    borderRadius: '10px',
                                    border: '2px solid #ff3333',
                                    backgroundColor: 'rgba(255, 51, 51, 0.1)',
                                    color: '#ff3333',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 0 15px rgba(255, 51, 51, 0.2)',
                                    fontFamily: "'Microsoft JhengHei', sans-serif",
                                    transition: 'all 0.2s'
                                });

                                // 按鈕懸停效果 (新增中文註解：為兩個按鈕綁定 Hover 動態發光與配色特效)
                                yesBtn.onmouseover = () => {
                                    yesBtn.style.backgroundColor = '#00ff00';
                                    yesBtn.style.color = '#000000';
                                    yesBtn.style.boxShadow = '0 0 25px rgba(0, 255, 0, 0.6)';
                                };
                                yesBtn.onmouseout = () => {
                                    yesBtn.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
                                    yesBtn.style.color = '#00ff00';
                                    yesBtn.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.2)';
                                };

                                noBtn.onmouseover = () => {
                                    noBtn.style.backgroundColor = '#ff3333';
                                    noBtn.style.color = '#000000';
                                    noBtn.style.boxShadow = '0 0 25px rgba(255, 51, 51, 0.6)';
                                };
                                noBtn.onmouseout = () => {
                                    noBtn.style.backgroundColor = 'rgba(255, 51, 51, 0.1)';
                                    noBtn.style.color = '#ff3333';
                                    noBtn.style.boxShadow = '0 0 15px rgba(255, 51, 51, 0.2)';
                                };

                                btnContainer.appendChild(yesBtn);
                                btnContainer.appendChild(noBtn);

                                // 漸顯第一階段內容 (新增中文註解：漸顯淡入第一階段問題內容)
                                setTimeout(() => {
                                    contentWrapper.style.opacity = '1';
                                }, 100);

                                // 切換到第二階段問題的輔助函式 (新增中文註解：點擊按鈕後淡出當前內容並顯示新問題)
                                const showNextQuestion = (questionText, textColor) => {
                                    contentWrapper.style.opacity = '0';
                                    setTimeout(() => {
                                        // 清空容器以重新寫入新問題
                                        contentWrapper.innerHTML = '';
                                        
                                        // 建立終極問題元件 (新增中文註解：建立終極問題元件)
                                        const finalQuestion = document.createElement('div');
                                        finalQuestion.innerText = questionText;
                                        Object.assign(finalQuestion.style, {
                                            fontSize: '56px',
                                            color: textColor,
                                            fontWeight: 'bold',
                                            textShadow: `0 0 30px ${textColor}`,
                                            lineHeight: '1.4'
                                        });
                                        contentWrapper.appendChild(finalQuestion);

                                        // 淡入新問題 (新增中文註解：淡入終極問題)
                                        contentWrapper.style.opacity = '1';

                                        // 盯著看兩秒後，跳出解密題目選擇 (新增中文註解：盯著問題看兩秒後，淡入顯示謎題版本選擇)
                                        setTimeout(() => {
                                            contentWrapper.style.opacity = '0';
                                            setTimeout(() => {
                                                // 清空容器並建立選擇介面 (新增中文註解：清空容器並建立謎題選擇介面)
                                                contentWrapper.innerHTML = '';

                                                // 選擇標題 (新增中文註解：建立謎題選擇標題)
                                                const choiceTitle = document.createElement('div');
                                                choiceTitle.innerText = "請選擇要挑戰的謎題版本：";
                                                Object.assign(choiceTitle.style, {
                                                    fontSize: '28px',
                                                    color: '#ffd700',
                                                    fontWeight: 'bold',
                                                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                                                    marginBottom: '20px'
                                                });
                                                contentWrapper.appendChild(choiceTitle);

                                                // 按鈕容器 (新增中文註解：建立選擇按鈕容器)
                                                const choiceBtnContainer = document.createElement('div');
                                                Object.assign(choiceBtnContainer.style, {
                                                    display: 'flex',
                                                    gap: '40px',
                                                    marginTop: '10px'
                                                });
                                                contentWrapper.appendChild(choiceBtnContainer);

                                                // 輔助函式：顯示具體謎題內容 (新增中文註解：顯示具體謎題的輔助函式)
                                                const showSelectedPuzzle = (puzzleText) => {
                                                    contentWrapper.style.opacity = '0';
                                                    setTimeout(() => {
                                                        contentWrapper.innerHTML = '';
                                                        
                                                        // 第一行文字：好啦，給你點有用、好笑的。 (新增中文註解：建立第一行謎題文字)
                                                        const line1 = document.createElement('div');
                                                        line1.innerText = "好啦，給你點有用、好笑的。";
                                                        Object.assign(line1.style, {
                                                            fontSize: '28px',
                                                            color: '#ffd700',
                                                            fontWeight: 'bold',
                                                            textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                                                            marginBottom: '15px'
                                                        });
                                                        
                                                        // 第二行文字：請破解這段謎題 (新增中文註解：建立第二行謎題文字)
                                                        const line2 = document.createElement('div');
                                                        line2.innerText = "請破解這段謎題";
                                                        Object.assign(line2.style, {
                                                            fontSize: '34px',
                                                            color: '#00ff00',
                                                            fontWeight: 'bold',
                                                            textShadow: '0 0 15px rgba(0, 255, 0, 0.6)',
                                                            marginBottom: '25px'
                                                        });
                                                        
                                                        // 第三行文字：謎題內容 (新增中文註解：建立第三行謎題內容)
                                                        const line3 = document.createElement('div');
                                                        line3.innerText = puzzleText;
                                                        Object.assign(line3.style, {
                                                            fontSize: '24px', // 因新謎題字數非常多，縮小字級防止超出排版 (修改)
                                                            color: '#ff3333',
                                                            fontWeight: 'bold',
                                                            textShadow: '0 0 25px rgba(255, 51, 51, 0.8)',
                                                            lineHeight: '1.5',
                                                            maxWidth: '800px',
                                                            wordBreak: 'break-all'
                                                        });
                                                        
                                                        contentWrapper.appendChild(line1);
                                                        contentWrapper.appendChild(line2);
                                                        contentWrapper.appendChild(line3);
                                                        
                                                        // 淡入顯示謎題 (新增中文註解：淡入謎題)
                                                        contentWrapper.style.opacity = '1';
                                                     }, 1000);
                                                 };

                                                 // 原本的謎題按鈕 (新增中文註解：建立原本的謎題按鈕)
                                                 const origBtn = document.createElement('button');
                                                 origBtn.innerText = "原本的謎題";
                                                 Object.assign(origBtn.style, {
                                                     padding: '12px 30px',
                                                     fontSize: '18px',
                                                     borderRadius: '8px',
                                                     border: '2px solid #00ff00',
                                                     backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                                     color: '#00ff00',
                                                     fontWeight: 'bold',
                                                     cursor: 'pointer',
                                                     boxShadow: '0 0 12px rgba(0, 255, 0, 0.2)',
                                                     fontFamily: "'Microsoft JhengHei', sans-serif",
                                                     transition: 'all 0.2s'
                                                 });
                                                 origBtn.onmouseover = () => {
                                                     origBtn.style.backgroundColor = '#00ff00';
                                                     origBtn.style.color = '#000000';
                                                     origBtn.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6)';
                                                 };
                                                 origBtn.onmouseout = () => {
                                                     origBtn.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
                                                     origBtn.style.color = '#00ff00';
                                                     origBtn.style.boxShadow = '0 0 12px rgba(0, 255, 0, 0.2)';
                                                 };
                                                 origBtn.onclick = () => {
                                                     showSelectedPuzzle("爸爸堅強又偉大八極大狂風大牛比較懶高高翹起博愛座");
                                                 };

                                                 // 新的謎題按鈕 (新增中文註解：建立新的謎題按鈕)
                                                 const newBtn = document.createElement('button');
                                                 newBtn.innerText = "新的謎題";
                                                 Object.assign(newBtn.style, {
                                                     padding: '12px 30px',
                                                     fontSize: '18px',
                                                     borderRadius: '8px',
                                                     border: '2px solid #00ffff',
                                                     backgroundColor: 'rgba(0, 255, 255, 0.1)',
                                                     color: '#00ffff',
                                                     fontWeight: 'bold',
                                                     cursor: 'pointer',
                                                     boxShadow: '0 0 12px rgba(0, 255, 255, 0.2)',
                                                     fontFamily: "'Microsoft JhengHei', sans-serif",
                                                     transition: 'all 0.2s'
                                                 });
                                                 newBtn.onmouseover = () => {
                                                     newBtn.style.backgroundColor = '#00ffff';
                                                     newBtn.style.color = '#000000';
                                                     newBtn.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.6)';
                                                 };
                                                 newBtn.onmouseout = () => {
                                                     newBtn.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
                                                     newBtn.style.color = '#00ffff';
                                                     newBtn.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.2)';
                                                 };
                                                 newBtn.onclick = () => {
                                                     showSelectedPuzzle("高高舉起博愛座了不起博愛做完高鐵的工人上帝掉皮包皮包大特賣金色狂風七人對金色狂風直升機大好的山中美景");
                                                 };

                                                 choiceBtnContainer.appendChild(origBtn);
                                                 choiceBtnContainer.appendChild(newBtn);

                                                 contentWrapper.style.opacity = '1';
                                             }, 1000);
                                         }, 2000);
                                     }, 1000);
                                 };

                                // 綁定點擊事件 (新增中文註解：為是與沒有按鈕綁定跳轉終極問題的點擊事件)
                                yesBtn.onclick = () => {
                                    showNextQuestion("你是甲嗎？", "#00ffff"); // 亮青色
                                };

                                noBtn.onclick = () => {
                                    showNextQuestion("你有雞柳條嗎？", "#ff00ff"); // 桃紅色
                                };
                            }, 1500);
                        } else {
                            // 密碼錯誤，輸入框紅框閃爍 (新增中文註解：密碼錯誤時的震動與變紅提示)
                            passwordInput.style.borderColor = '#ff0000';
                            passwordInput.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.6)';
                            passwordInput.placeholder = '密碼錯誤！請重新輸入';
                            passwordInput.value = '';
                            
                            // 抖動輸入容器 (新增中文註解：觸發容器位移抖動動畫)
                            inputContainer.style.transform = 'translateX(10px)';
                            setTimeout(() => { inputContainer.style.transform = 'translateX(-10px)'; }, 50);
                            setTimeout(() => { inputContainer.style.transform = 'translateX(5px)'; }, 100);
                            setTimeout(() => { inputContainer.style.transform = 'translateX(-5px)'; }, 150);
                            setTimeout(() => { inputContainer.style.transform = 'translateX(0)'; }, 200);

                            // 還原輸入框樣式 (新增中文註解：1.5秒後重設為黃金框樣式)
                            setTimeout(() => {
                                passwordInput.style.borderColor = '#ffd700';
                                passwordInput.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.2)';
                                passwordInput.placeholder = '請輸入密碼...';
                            }, 1500);
                        }
                    };

                    inputContainer.appendChild(passwordInput);
                    inputContainer.appendChild(confirmBtn);

                    endContainer.appendChild(driveDiv);
                    endContainer.appendChild(authorDiv);
                    endContainer.appendChild(hintDiv); // 加入提示文字 (新增中文註解：將提示文字附加至結局容器)
                    endContainer.appendChild(inputContainer);

                    // 啟用漸顯與縮放，並引發相機大震動
                    setTimeout(() => {
                        driveDiv.style.opacity = '1';
                        driveDiv.style.transform = 'scale(1)';
                        scene.cameras.main.shake(450, 0.035);
                    }, 50);

                    // 稍微延後漸顯作者署名與提示文字，隨後淡入密碼輸入區 (新增中文註解：依序淡入署名、提示與輸入框)
                    setTimeout(() => {
                        authorDiv.style.opacity = '1';
                        hintDiv.style.opacity = '1'; // 提示文字與署名同步淡入 (新增中文註解：提示字體與署名同步淡入)
                        setTimeout(() => {
                            inputContainer.style.opacity = '1';
                        }, 800);
                    }, 500);

                }, 1000);
            }
        }, 65); // 每個字打字間隔 65 毫秒
    }, 800);
}

function createDashShield(scene, player, angle) {
    const shield = scene.add.graphics(); let hasHitLoli = false; let hasHitUncle = false; let hasHitDora = false; let hasHitYeah = false; let hasHitPoopKing = false; let hasHitNoGG = false; let hasHitGorilla = false; let alive = true;
    scene.time.delayedCall(1150, () => { alive = false; });

    // 儲存護盾參考至場景，以便後續可以被「請屎皇」斬擊立刻擊碎 (新增中文註解：儲存目前護盾參考以便外部調用銷毀)
    scene.currentDashShield = {
        destroy: () => {
            alive = false;
        }
    };

    const onUpdate = () => {
        if (!alive || !player.active) { 
            shield.destroy(); 
            scene.events.off('update', onUpdate); 
            if (scene.currentDashShield) {
                scene.currentDashShield = null;
            }
            return; 
        }
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
        // 護盾碰撞蘿莉
        if (!hasHitLoli && loli.active) {
            const dist = Phaser.Math.Distance.Between(centerX, centerY, loli.x, loli.y);
            if (dist < radius + 40) {
                handleLoliHit(scene, null, 1500, 500, 25, centerX, centerY);
                hasHitLoli = true;
            }
        }
        // 護盾碰撞猥瑣大叔（後座力在 handleUncleHit 內部自動減半）
        if (!hasHitUncle && uncle && uncle.active) {
            const distU = Phaser.Math.Distance.Between(centerX, centerY, uncle.x, uncle.y);
            if (distU < radius + 40) {
                handleUncleHit(scene, null, 1500, 500, 25, centerX, centerY);
                hasHitUncle = true;
            }
        }
        // 護盾碰撞哆啦噩夢
        if (!hasHitDora && dora && dora.active) {
            const distD = Phaser.Math.Distance.Between(centerX, centerY, dora.x, dora.y);
            if (distD < radius + 40) {
                handleDoraHit(scene, null, 1500, 500, 25, centerX, centerY);
                hasHitDora = true;
            }
        }
        // 護盾碰撞顏王Yeah
        if (!hasHitYeah && yeah && yeah.active) {
            const distY = Phaser.Math.Distance.Between(centerX, centerY, yeah.x, yeah.y);
            if (distY < radius + 40) {
                handleYeahHit(scene, null, 1500, 500, 25, centerX, centerY);
                hasHitYeah = true;
            }
        }
        // 護盾碰撞請屎皇 (新增中文註解：護盾碰撞請屎皇判定，使其可被盾牌攻擊)
        if (!hasHitPoopKing && poopKing && poopKing.active) {
            const distPK = Phaser.Math.Distance.Between(centerX, centerY, poopKing.x, poopKing.y);
            if (distPK < radius + 40) {
                handlePoopKingHit(scene, null, 1500, 500, 25, centerX, centerY);
                hasHitPoopKing = true;
            }
        }
        // 護盾碰撞我沒有GG (新增中文註解：護盾碰撞我沒有GG判定，第二階段蔡徐坤如同石頭免疫護盾傷害與擊退，阻擋玩家)
        if (!hasHitNoGG && noGG && noGG.active) {
            const distNGG = Phaser.Math.Distance.Between(centerX, centerY, noGG.x, noGG.y);
            if (distNGG < radius + 40) {
                // 第二階段蔡徐坤為石頭剛體，不會死也不會被護盾擊退，實體阻擋玩家 (修改)
                if (!noGGState.isPhase2) {
                    handleNoGGHit(scene, null, 1500, 500, 25, centerX, centerY);
                }
                hasHitNoGG = true;
            }
        }
        // 護盾碰撞大猩猩 (新增中文註解：一階段或二階段7秒破防虛弱期造成傷害與受擊反饋，平時防禦狀態如岩石阻擋)
        if (!hasHitGorilla && gorilla && gorilla.active) {
            const distG = Phaser.Math.Distance.Between(centerX, centerY, gorilla.x, gorilla.y);
            if (distG < radius + 40) {
                if (!gorillaState.isPhase2 || gorillaState.isVulnerable) {
                    handleGorillaHit(scene, null, 1500, 500, 25);
                }
                hasHitGorilla = true;
            }
        }
        // 護盾阻擋並銷毀迪克小刀 (新增中文註解：護盾阻擋迪克小刀判定，阻擋彈幕)
        if (dickKnives && dickKnives.getChildren().length > 0) {
            dickKnives.getChildren().forEach(knife => {
                if (knife.active) {
                    const distK = Phaser.Math.Distance.Between(centerX, centerY, knife.x, knife.y);
                    if (distK < radius + 30) {
                        knife.destroy();
                    }
                }
            });
        }
        // 護盾碰撞分身 (分身會受到 25 點傷害)
        if (doraState.clones && doraState.clones.length > 0) {
            doraState.clones.forEach(clone => {
                if (clone.active) {
                    const distC = Phaser.Math.Distance.Between(centerX, centerY, clone.x, clone.y);
                    if (distC < radius + 40) {
                        handleCloneHit(scene, clone, null, 25);
                    }
                }
            });
        }
    };
    scene.events.on('update', onUpdate);
}

// scheduleUltimateGunAttack / scheduleUltimateBalls / spawnUltimateLaser 已搬移至 boss/LoliAttacks.js

// === 場景類別定義 ===
// 使用 class-based scene 取代 function-based scene
// 透過 .call(this) 將 this 上下文正確傳遞給原有函式
export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene'); // 場景名稱
    }

    // 初始化階段，接收並存儲來自前一場景傳入的選定 Boss
    init(data) {
        this.selectedBoss = data.selectedBoss || 'loli';
    }

    // 載入素材階段
    preload() {
        preloadAssets.call(this);
    }

    // 建立場景階段
    create() {
        createScene.call(this);
    }

    // 每幀更新階段
    update(time, delta) {
        updateScene.call(this, time, delta);
    }
}
