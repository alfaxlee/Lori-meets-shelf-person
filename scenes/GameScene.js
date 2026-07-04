// === 遊戲主場景模組 ===
// 包含所有遊戲邏輯（後續步驟將逐步拆分至獨立模組）
import { mobileInput, isActuallyMobile, forceControls, detectMobile, setupMobileControls, repositionMobileControls } from '../ui/MobileControls.js';
import { showCrashScreen } from '../ui/CrashScreen.js';
import { createHUD, updateLoliHP, drawEnergyBar, getEnergyBar, showLoliHPText } from '../ui/HUD.js';
import { createWeaponUI, getWeaponState, triggerReload, fireMG, fireSG, fireSN } from '../weapons/WeaponManager.js';
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
let yeahEnergyText; // 顏王Yeah 神聖魔法能量條文字
let yeahEnergyBar;  // 顏王Yeah 神聖魔法能量條 Graphics
let yeahEnergyBalls; // 顏王Yeah 隨機生成的黃色能量球群組

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
    yeah.setVisible(false);
    yeah.body.enable = false;

    // 初始化狀態機與攻擊模組的共享參考
    initAttackRefs({ loli, player, shockwaves, lasers, enemyBalls });
    // 傳入 onLoliDeath 回呼：蘿莉死亡後重生同一個蘿莉 (不再輪替)
    initBossRefs({ loli, player, lasers, enemyBalls, shockwaves, onLoliDeath: (scene) => {
        respawnLoli(scene);
    }});

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
    let isCrashed = false; // 防止多次觸發當機
    const triggerCrash = (force = false) => {
        // 確保 force 真的是布林值 true，因為 Phaser 的 collider 會傳入兩個遊戲物件(Truthy)
        const isForced = force === true;
        // 衝刺/護盾期間無敵 (若 isForced 為 true 則無視無敵)，或已當機則跳過
        if ((playerState.isInvincible && !isForced) || isCrashed) return; 
        isCrashed = true;
        showCrashScreen(this); // 委派給 CrashScreen 模組處理 DOM 與動畫
    };
    this.triggerCrash = triggerCrash; // 將當機函式掛載到場景，供外部雷射/地刺使用

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
        fill: '#ff00ff', 
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

    // 根據選定要挑战的 Boss 進行分支初始化
    if (this.selectedBoss === 'uncle') {
        // 隱藏並完全停用其它 Boss
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        dora.setActive(false); dora.setVisible(false); dora.body.enable = false;
        yeah.setActive(false); yeah.setVisible(false); yeah.body.enable = false;

        // 隱藏蘿莉 HP，顯示大叔 HP，並直接生成大叔在左側
        showLoliHPText(false);
        uncleHPText.setVisible(true);
        yeahHPText.setVisible(false);
        const spawnX = width / 4;
        const spawnY = height - 150;
        respawnUncle(this, spawnX, spawnY);
    } else if (this.selectedBoss === 'dora') {
        // 隱藏其它 Boss
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        uncle.setActive(false); uncle.setVisible(false); uncle.body.enable = false;
        yeah.setActive(false); yeah.setVisible(false); yeah.body.enable = false;
        
        showLoliHPText(false);
        uncleHPText.setVisible(false);
        yeahHPText.setVisible(false);
        doraHPText.setVisible(true); // 顯示哆啦噩夢 HP
        
        // 重置領域狀態與重新產生哆啦噩夢
        cleanupDora(this);
        respawnDora(this);
    } else if (this.selectedBoss === 'yeah') {
        // 隱藏其它 Boss
        loli.setActive(false); loli.setVisible(false); loli.body.enable = false;
        uncle.setActive(false); uncle.setVisible(false); uncle.body.enable = false;
        dora.setActive(false); dora.setVisible(false); dora.body.enable = false;

        showLoliHPText(false);
        uncleHPText.setVisible(false);
        doraHPText.setVisible(false);
        yeahHPText.setVisible(true);       // 顯示顏王Yeah HP
        yeahEnergyText.setVisible(true);   // 顯示顏王Yeah 神聖魔法能量條文字

        // 重新產生顏王Yeah
        cleanupYeah(this);
        respawnYeah(this);
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

    // 依據當前選定 Boss 決定自動瞄準目標與碰撞對象
    const activeBoss = this.selectedBoss === 'uncle' ? uncle : (this.selectedBoss === 'dora' ? dora : (this.selectedBoss === 'yeah' ? yeah : loli));

    // 繪製衝刺能量條（委派給 HUD 模組）
    drawEnergyBar(playerState.dashEnergy, playerState.maxDashEnergy, playerState.dashEnergyColor);

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
                        // 淡出黑幕
                        scene.tweens.add({
                            targets: overlay,
                            alpha: 0,
                            duration: 300,
                            onComplete: () => {
                                overlay.destroy();
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

                        // 等待指定時間後淡出並顯示下一行
                        scene.time.delayedCall(displayDuration, () => {
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

    // 均勻分佈 5 個方向的鎖鏈角度 (對應橢圓圓周)
    const angles = [
        0,                 // 右
        0.4 * Math.PI,     // 前右
        0.8 * Math.PI,     // 前左
        1.2 * Math.PI,     // 後左
        1.6 * Math.PI      // 後右
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

    // 建立粒子發射器，朝魔法陣呈寬度 80 度的扇形噴灑金色粒子光芒
    const emitter = particles.createEmitter({
        x: yeahSprite.x,
        y: yeahSprite.y,
        speed: { min: 150, max: 450 }, // 擴大速度範圍，使得扇形粒子分布在徑向上更有層次
        angle: { min: angleDeg - 40, max: angleDeg + 40 }, // 左右各張開 40 度，形成明顯的 80 度扇形覆蓋
        scale: { start: 2.0, end: 0 },
        blendMode: 'ADD',
        lifespan: 1200,
        frequency: 15, // 縮短發射間隔，增加扇形粒子密度
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

        // 建立光束 Graphics
        const beam = scene.add.graphics();
        beam.setDepth(9991);

        // 繪製從天花板到玩家位置的巨大光束 (寬度 80px 的金色半透明矩形)
        const beamWidth = 80;
        const beamX = px - beamWidth / 2;

        // 光束主體 (金黃色半透明)
        beam.fillStyle(0xffd700, 0.7);
        beam.fillRect(beamX, 0, beamWidth, py + 50);
        // 光束核心 (更亮的白金色)
        beam.fillStyle(0xffffff, 0.4);
        beam.fillRect(beamX + 15, 0, beamWidth - 30, py + 50);
        // 光束外層擴散 (淡金色)
        beam.fillStyle(0xffd700, 0.2);
        beam.fillRect(beamX - 20, 0, beamWidth + 40, py + 50);

        beam.setAlpha(0);

        // 光束淡入動畫
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

                    // 觸發電腦當機畫面 (force = true 強制當機，無視無敵)
                    if (scene.triggerCrash) {
                        scene.triggerCrash(true);
                    }
                }
            });
        });
    });
}

// createShockwaves / spawnLaser / spawnEnemyBall / createDashDust 已搬移至 boss/LoliAttacks.js 和 player/DashEffects.js


function createDashShield(scene, player, angle) {
    const shield = scene.add.graphics(); let hasHitLoli = false; let hasHitUncle = false; let hasHitDora = false; let hasHitYeah = false; let alive = true;
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
