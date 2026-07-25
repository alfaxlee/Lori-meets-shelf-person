// === 主選單與 Boss 選擇場景 ===
// 包含 MainMenuScene 與 BossSelectScene 類別，供遊戲入口切換
// 已升級為精緻的金色發光、漸層背景與微動態粒子背景

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    preload() {
        // 預載選擇畫面需要的 Boss 圖片素材
        this.load.image('loliSelect', './assets/images/羅莉抓人.png');
        this.load.image('uncleSelect', 'https://tse3.mm.bing.net/th/id/OIP.m_x1TY2hKDnQjwvLi8DWWAHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3');
        this.load.image('doraSelect', './assets/images/哆啦噩夢.png');
        // 預載顏王Yeah 的選擇圖片 (使用本地下載的圖片以避開 CORS)
        this.load.image('yeahSelect', './assets/images/Yeah.jpg');
        // 預載請屎皇的選擇圖片 (新增中文註解：載入新 Boss 請屎皇的圖片)
        this.load.image('poopKingSelect', './assets/images/請屎皇.jpg');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 設定漸層深色底板，從極深灰至微黑，提升視覺質感
        const bgGfx = this.add.graphics();
        bgGfx.fillGradientStyle(0x1a1a1a, 0x1a1a1a, 0x050505, 0x050505, 1);
        bgGfx.fillRect(0, 0, width, height);

        // === 建立背景金色微動態粒子特效 ===
        const particles = this.add.graphics();
        const stars = [];
        for (let i = 0; i < 45; i++) {
            stars.push({
                x: Phaser.Math.Between(0, width),
                y: Phaser.Math.Between(0, height),
                size: Phaser.Math.Between(1, 3),
                alpha: Phaser.Math.FloatBetween(0.15, 0.7),
                speed: Phaser.Math.FloatBetween(0.2, 0.8)
            });
        }

        // 動態更新光點位置，營造螢火般緩緩升起的魔幻金色氛圍
        const updateParticles = () => {
            particles.clear();
            stars.forEach(star => {
                star.y -= star.speed;
                if (star.y < -10) {
                    star.y = height + 10;
                    star.x = Phaser.Math.Between(0, width);
                }
                particles.fillStyle(0xd4af37, star.alpha); // 黃金色
                particles.fillCircle(star.x, star.y, star.size);
            });
        };
        this.events.on('update', updateParticles);

        // 確保場景切換銷毀時，移除更新監聽器
        this.events.once('shutdown', () => {
            this.events.off('update', updateParticles);
        });

        // 建立大標題 Container，用以整合標題文字與金色底線，使其共同上下浮動 (修改)
        const titleContainer = this.add.container(width / 2, height / 3 - 35);

        // 建立遊戲大標題文字 (放大至 110px，增強金色描邊與發光效果)
        const title = this.add.text(0, 0, '蘿 莉 遇 櫃 人', {
            fontSize: '110px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#d4af37', // 經典黃金色
            strokeThickness: 7, // 加粗描邊
            padding: { left: 40, right: 40, top: 40, bottom: 40 }, // 大幅增加 padding 防止金色發光外框被截斷
            shadow: {
                color: '#ffb700', // 金黃色發光
                fill: true,
                offsetX: 0,
                offsetY: 0,
                blur: 30 // 加強模糊半徑
            }
        }).setOrigin(0.5);

        // 標題下方的金色漸層精緻分割線
        const line = this.add.graphics();
        line.fillGradientStyle(0x000000, 0xd4af37, 0x000000, 0xd4af37, 1);
        line.fillRect(-250, 75, 500, 4); // 相對座標定位在標題下方

        titleContainer.add([title, line]);

        // 建立標題組平滑的呼吸式上下浮動特效
        this.tweens.add({
            targets: titleContainer,
            y: height / 3 - 50, // 向上微幅浮動 15 像素
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 建立「開始遊戲」按鈕
        this.createButton(width / 2, height / 2 + 30, '開始遊戲', () => {
            this.scene.start('BossSelectScene');
        });

        // 建立「查看規則」按鈕
        this.createButton(width / 2, height / 2 + 115, '查看規則', () => {
            // 將 _blank 改為固定視窗名稱 'game_rules_window'，確保在相同分頁中載入最新內容，避免多次點擊開啟一堆新分頁 (修改)
            window.open('./readme.html?v=' + Date.now(), 'game_rules_window');
        });
    }

    // 輔助函式：建立具備金色發光與懸停動畫的質感按鈕 (Glassmorphism 視覺風格)
    createButton(x, y, label, callback) {
        const bg = this.add.graphics();
        
        // 預設狀態：金色細框與半透明暗底
        const drawDefault = () => {
            bg.clear();
            bg.fillStyle(0x1a1a1a, 0.85);
            bg.fillRoundedRect(-150, -25, 300, 50, 12);
            bg.lineStyle(2, 0xd4af37, 0.7); // 輕金色
            bg.strokeRoundedRect(-150, -25, 300, 50, 12);
        };
        
        // 懸停狀態：高亮金色粗框與微亮底色
        const drawHover = () => {
            bg.clear();
            bg.fillStyle(0x2a2a2a, 0.95);
            bg.fillRoundedRect(-150, -25, 300, 50, 12);
            bg.lineStyle(2.5, 0xffd700, 1); // 亮黃金
            bg.strokeRoundedRect(-150, -25, 300, 50, 12);
        };
        
        drawDefault();

        const txt = this.add.text(0, 0, label, {
            fontSize: '22px',
            fill: '#ffffff',
            fontStyle: 'bold',
            padding: { top: 8, bottom: 8 } // 避免頂部裁切
        }).setOrigin(0.5);

        const container = this.add.container(x, y, [bg, txt]);
        container.setSize(300, 50);
        container.setInteractive({ useHandCursor: true });

        // 滑鼠懸停效果 (放大 + 框發光 + 文字金黃發光)
        container.on('pointerover', () => {
            drawHover();
            txt.setFill('#ffd700');
            txt.setShadow(0, 0, '#ffb700', 12, true, true);
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 100,
                ease: 'Power1'
            });
        });

        // 滑鼠移開效果 (回復原樣)
        container.on('pointerout', () => {
            drawDefault();
            txt.setFill('#ffffff');
            txt.setShadow(0, 0, '#000000', 0, false, false);
            this.tweens.add({
                targets: container,
                scale: 1.0,
                duration: 100,
                ease: 'Power1'
            });
        });

        container.on('pointerdown', callback);
        return container;
    }
}

export class BossSelectScene extends Phaser.Scene {
    constructor() {
        super('BossSelectScene');
    }
    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const sceneHeight = 920; // 新增中文註解：定義包含滾動範圍的場景總高度，使背景與金色粒子完全覆蓋滾動後的區域

        // 設定漸層背景以保持視覺風格一致
        const bgGfx = this.add.graphics();
        bgGfx.fillGradientStyle(0x1a1a1a, 0x1a1a1a, 0x050505, 0x050505, 1);
        bgGfx.fillRect(0, 0, width, sceneHeight); // 新增中文註解：改為填滿 sceneHeight 920 像素

        // === 同步建立金光點背景特效 ===
        const particles = this.add.graphics();
        const stars = [];
        for (let i = 0; i < 45; i++) {
            stars.push({
                x: Phaser.Math.Between(0, width),
                y: Phaser.Math.Between(0, sceneHeight), // 新增中文註解：粒子生成高度改為 sceneHeight 920 像素
                size: Phaser.Math.Between(1, 3),
                alpha: Phaser.Math.FloatBetween(0.15, 0.7),
                speed: Phaser.Math.FloatBetween(0.2, 0.8)
            });
        }
        const updateParticles = () => {
            particles.clear();
            stars.forEach(star => {
                star.y -= star.speed;
                if (star.y < -10) {
                    star.y = sceneHeight + 10; // 新增中文註解：超出頂部時重置回 sceneHeight 底部
                    star.x = Phaser.Math.Between(0, width);
                }
                particles.fillStyle(0xd4af37, star.alpha);
                particles.fillCircle(star.x, star.y, star.size);
            });
        };
        this.events.on('update', updateParticles);
        this.events.once('shutdown', () => {
            this.events.off('update', updateParticles);
        });

        // 標題文字 (加深金色描邊)
        this.add.text(width / 2, 80, '選擇要挑戰的 Boss', {
            fontSize: '44px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#d4af37',
            strokeThickness: 4,
            padding: { left: 15, right: 15, top: 15, bottom: 15 }, // 加上 padding 防止邊界描邊截斷 (修改)
            shadow: {
                color: '#ffb700',
                fill: true,
                offsetX: 0,
                offsetY: 0,
                blur: 15
            }
        }).setOrigin(0.5);

        // === 建立 Boss 選卡 (新增中文註解：設定滑動滾動與大卡片尺寸 (240x320)，避免與標題或返回按鈕重疊) ===
        // 設定水平與垂直間距，回到原本大尺寸卡片排版
        const colSpacing = 300; // 卡片中心水平間距
        const firstRowY = 290;  // 第一排 Y 座標 (頂部 Y=130，與 Y=80 的標題保持安全距離)
        const secondRowY = 670; // 第二排 Y 座標 (卡片到底 Y=830)

        // 啟用滑動機制：場景邊界設為 0, 0, width, 920，最大 scrollY 設為 200 (新增中文註解：啟用相機滑動)
        this.cameras.main.setBounds(0, 0, width, 920);

        // 建立滑動提示文字 (新增中文註解：在下方建立一個指示有更多內容的提示文字)
        const scrollHint = this.add.text(width / 2, height - 30, '▼ 向下滾動以查看更多 Boss', {
            fontSize: '16px',
            fill: '#ffd700',
            fontStyle: 'bold',
            shadow: { color: '#000000', fill: true, blur: 5 }
        }).setOrigin(0.5);
        scrollHint.setScrollFactor(0); // 固定在螢幕底端，不受滾動影響

        // 提示文字呼吸動畫 (新增中文註解：文字呼吸動畫)
        this.tweens.add({
            targets: scrollHint,
            alpha: 0.3,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // 滾輪滾動事件 (新增中文註解：設定滑鼠滾輪滾動相機)
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + deltaY * 0.5, 0, 200);
            if (this.cameras.main.scrollY > 30) {
                scrollHint.setVisible(false);
            } else {
                scrollHint.setVisible(true);
            }
        });

        // 手勢拖曳（適用於行動裝置或滑鼠拖曳，新增中文註解：設定滑鼠/觸控拖曳背景滾動相機）
        let dragStartY = 0;
        let isDragging = false;
        this.input.on('pointerdown', (pointer) => {
            const hits = this.input.manager.hitTest(pointer, this.children.list, this.cameras.main);
            // 只有點擊背景時才啟動拖曳滾動
            if (hits.length === 0) {
                isDragging = true;
                dragStartY = pointer.y;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (isDragging) {
                const diffY = dragStartY - pointer.y;
                this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + diffY, 0, 200);
                dragStartY = pointer.y;
                if (this.cameras.main.scrollY > 30) {
                    scrollHint.setVisible(false);
                } else {
                    scrollHint.setVisible(true);
                }
            }
        });

        this.input.on('pointerup', () => {
            isDragging = false;
        });

        // 第一排三個卡片以螢幕中心為基準緊湊排列
        this.createBossCard(width / 2 - colSpacing, firstRowY, 'loliSelect', '蘿莉', () => {
            this.scene.start('GameScene', { selectedBoss: 'loli' });
        });

        // 建立「猥瑣大叔」Boss 選卡
        this.createBossCard(width / 2, firstRowY, 'uncleSelect', '猥瑣大叔', () => {
            this.scene.start('GameScene', { selectedBoss: 'uncle' });
        });

        // 建立「哆啦噩夢」Boss 選卡
        this.createBossCard(width / 2 + colSpacing, firstRowY, 'doraSelect', '哆啦噩夢', () => {
            this.scene.start('GameScene', { selectedBoss: 'dora' });
        });

        // 第二排兩個卡片 (新增中文註解：不置中，與第一排的左邊和中間卡片對齊)
        this.createBossCard(width / 2 - colSpacing, secondRowY, 'yeahSelect', '顏王Yeah', () => {
            this.scene.start('GameScene', { selectedBoss: 'yeah' });
        });

        // 建立「請屎皇」Boss 選卡
        this.createBossCard(width / 2, secondRowY, 'poopKingSelect', '請屎皇', () => {
            this.scene.start('GameScene', { selectedBoss: 'poopKing' });
        });

        // 返回主選單按鈕 (改至左上角 X=130, Y=50，並固定在畫面上不受滾動影響)
        this.createBackButton(130, 50, '返回主選單', () => {
            this.scene.start('MainMenuScene');
        });
    }

    // 輔助函式：建立 Boss 選卡 (等比例圖片 + 金色描邊發光卡片)
    // 新增中文註解：卡片尺寸回到原本的 240x320，適用於可捲動版面
    createBossCard(x, y, textureKey, bossName, callback) {
        const cardBg = this.add.graphics();
        
        // 預設卡片框線 (新增中文註解：設定尺寸為 240x320)
        const drawDefault = () => {
            cardBg.clear();
            cardBg.fillStyle(0x1a1a1a, 0.9);
            cardBg.fillRoundedRect(-120, -160, 240, 320, 15);
            cardBg.lineStyle(2, 0xd4af37, 0.6); // 輕金色
            cardBg.strokeRoundedRect(-120, -160, 240, 320, 15);
        };
        
        // 懸停高亮框線 (新增中文註解：設定尺寸為 240x320)
        const drawHover = () => {
            cardBg.clear();
            cardBg.fillStyle(0x2a2a2a, 0.95);
            cardBg.fillRoundedRect(-120, -160, 240, 320, 15);
            cardBg.lineStyle(2.5, 0xffd700, 1); // 亮金
            cardBg.strokeRoundedRect(-120, -160, 240, 320, 15);
        };

        drawDefault();

        // Boss 圖片 (等比例縮放以防止形變，新增中文註解：圖片最大寬高回到 180，位置為 0, -30)
        const bossImg = this.add.image(0, -30, textureKey);
        const maxW = 180;
        const maxH = 180;
        const scaleX = maxW / bossImg.width;
        const scaleY = maxH / bossImg.height;
        const scale = Math.min(scaleX, scaleY);
        bossImg.setScale(scale);

        // Boss 名稱 (新增中文註解：字型大小回到 28px，位置在 Y: 100)
        const nameText = this.add.text(0, 100, bossName, {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            padding: { top: 6, bottom: 6 } // 加上 padding 避免字型頂部被截斷 (修改)
        }).setOrigin(0.5);

        const cardContainer = this.add.container(x, y, [cardBg, bossImg, nameText]);
        cardContainer.setSize(240, 320);
        cardContainer.setInteractive({ useHandCursor: true });

        // 懸停效果
        cardContainer.on('pointerover', () => {
            drawHover();
            nameText.setFill('#ffd700');
            nameText.setShadow(0, 0, '#ffb700', 10, true, true);
            this.tweens.add({
                targets: cardContainer,
                scale: 1.05,
                duration: 100,
                ease: 'Power1'
            });
        });

        // 移開效果
        cardContainer.on('pointerout', () => {
            drawDefault();
            nameText.setFill('#ffffff');
            nameText.setShadow(0, 0, '#000000', 0, false, false);
            this.tweens.add({
                targets: cardContainer,
                scale: 1.0,
                duration: 100,
                ease: 'Power1'
            });
        });

        cardContainer.on('pointerdown', callback);
        return cardContainer;
    }

    // 建立返回按鈕 (金色矮型樣式)
    // 新增中文註解：在按鈕中繪製金色返回箭頭圖示，並使按鈕不受螢幕滾動影響
    createBackButton(x, y, label, callback) {
        const bg = this.add.graphics();
        const drawDefault = () => {
            bg.clear();
            bg.fillStyle(0x1e1e1e, 0.85);
            bg.fillRoundedRect(-100, -20, 200, 40, 8);
            bg.lineStyle(1.5, 0xd4af37, 0.5); // 金色邊框
            bg.strokeRoundedRect(-100, -20, 200, 40, 8);
            
            // 繪製箭頭 (新增中文註解：在預設狀態繪製返回箭頭線條)
            bg.lineStyle(2, 0xd4af37, 0.8);
            bg.beginPath();
            bg.moveTo(-50, 0);
            bg.lineTo(-35, -7);
            bg.moveTo(-50, 0);
            bg.lineTo(-35, 7);
            bg.moveTo(-50, 0);
            bg.lineTo(-15, 0);
            bg.strokePath();
        };
        const drawHover = () => {
            bg.clear();
            bg.fillStyle(0x2d2d2d, 0.95);
            bg.fillRoundedRect(-100, -20, 200, 40, 8);
            bg.lineStyle(2, 0xffd700, 1);
            bg.strokeRoundedRect(-100, -20, 200, 40, 8);
            
            // 繪製發光箭頭 (新增中文註解：在懸停狀態下繪製發光的返回箭頭)
            bg.lineStyle(2.5, 0xffd700, 1);
            bg.beginPath();
            bg.moveTo(-50, 0);
            bg.lineTo(-35, -7);
            bg.moveTo(-50, 0);
            bg.lineTo(-35, 7);
            bg.moveTo(-50, 0);
            bg.lineTo(-15, 0);
            bg.strokePath();
        };
        drawDefault();

        const txt = this.add.text(20, 0, label, { // 新增中文註解：往右偏 20 像素避開左側的箭頭圖示
            fontSize: '18px',
            fill: '#dddddd',
            fontStyle: 'bold',
            padding: { top: 6, bottom: 6 } // 避免截斷
        }).setOrigin(0.5);

        const container = this.add.container(x, y, [bg, txt]);
        container.setSize(200, 40);
        container.setInteractive({ useHandCursor: true });
        container.setScrollFactor(0); // 新增中文註解：返回按鈕固定在畫面上不受滾動影響

        container.on('pointerover', () => {
            drawHover();
            txt.setFill('#ffd700');
            txt.setShadow(0, 0, '#ffb700', 8, true, true);
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 100,
                ease: 'Power1'
            });
        });

        container.on('pointerout', () => {
            drawDefault();
            txt.setFill('#dddddd');
            txt.setShadow(0, 0, '#000000', 0, false, false);
            this.tweens.add({
                targets: container,
                scale: 1.0,
                duration: 100,
                ease: 'Power1'
            });
        });

        container.on('pointerdown', callback);
        return container;
    }
}
