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

        // 設定漸層背景以保持視覺風格一致
        const bgGfx = this.add.graphics();
        bgGfx.fillGradientStyle(0x1a1a1a, 0x1a1a1a, 0x050505, 0x050505, 1);
        bgGfx.fillRect(0, 0, width, height);

        // === 同步建立金光點背景特效 ===
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
        const updateParticles = () => {
            particles.clear();
            stars.forEach(star => {
                star.y -= star.speed;
                if (star.y < -10) {
                    star.y = height + 10;
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

        // 建立「蘿莉」Boss 選卡 (修改為五等分水平排列，以容納四位 Boss)
        this.createBossCard(width / 5, height / 2, 'loliSelect', '蘿莉', () => {
            this.scene.start('GameScene', { selectedBoss: 'loli' });
        });

        // 建立「猥瑣大叔」Boss 選卡
        this.createBossCard(2 * width / 5, height / 2, 'uncleSelect', '猥瑣大叔', () => {
            this.scene.start('GameScene', { selectedBoss: 'uncle' });
        });

        // 建立「哆啦噩夢」Boss 選卡
        this.createBossCard(3 * width / 5, height / 2, 'doraSelect', '哆啦噩夢', () => {
            this.scene.start('GameScene', { selectedBoss: 'dora' });
        });

        // 建立「顏王Yeah」Boss 選卡
        this.createBossCard(4 * width / 5, height / 2, 'yeahSelect', '顏王Yeah', () => {
            this.scene.start('GameScene', { selectedBoss: 'yeah' });
        });

        // 返回主選單按鈕 (改為金色矮型按鈕)
        this.createBackButton(width / 2, height - 80, '返回主選單', () => {
            this.scene.start('MainMenuScene');
        });
    }

    // 輔助函式：建立 Boss 選卡 (等比例圖片 + 金色描邊發光卡片)
    createBossCard(x, y, textureKey, bossName, callback) {
        const cardBg = this.add.graphics();
        
        // 預設卡片框線
        const drawDefault = () => {
            cardBg.clear();
            cardBg.fillStyle(0x1a1a1a, 0.9);
            cardBg.fillRoundedRect(-120, -160, 240, 320, 15);
            cardBg.lineStyle(2, 0xd4af37, 0.6); // 輕金色
            cardBg.strokeRoundedRect(-120, -160, 240, 320, 15);
        };
        
        // 懸停高亮框線
        const drawHover = () => {
            cardBg.clear();
            cardBg.fillStyle(0x2a2a2a, 0.95);
            cardBg.fillRoundedRect(-120, -160, 240, 320, 15);
            cardBg.lineStyle(2.5, 0xffd700, 1); // 亮金
            cardBg.strokeRoundedRect(-120, -160, 240, 320, 15);
        };

        drawDefault();

        // Boss 圖片 (等比例縮放以防止形變)
        const bossImg = this.add.image(0, -30, textureKey);
        const maxW = 180;
        const maxH = 180;
        const scaleX = maxW / bossImg.width;
        const scaleY = maxH / bossImg.height;
        const scale = Math.min(scaleX, scaleY);
        bossImg.setScale(scale);

        // Boss 名稱
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
    createBackButton(x, y, label, callback) {
        const bg = this.add.graphics();
        const drawDefault = () => {
            bg.clear();
            bg.fillStyle(0x1e1e1e, 0.85);
            bg.fillRoundedRect(-100, -20, 200, 40, 8);
            bg.lineStyle(1.5, 0xd4af37, 0.5); // 金色邊框
            bg.strokeRoundedRect(-100, -20, 200, 40, 8);
        };
        const drawHover = () => {
            bg.clear();
            bg.fillStyle(0x2d2d2d, 0.95);
            bg.fillRoundedRect(-100, -20, 200, 40, 8);
            bg.lineStyle(2, 0xffd700, 1);
            bg.strokeRoundedRect(-100, -20, 200, 40, 8);
        };
        drawDefault();

        const txt = this.add.text(0, 0, label, {
            fontSize: '18px',
            fill: '#dddddd',
            fontStyle: 'bold',
            padding: { top: 6, bottom: 6 } // 避免截斷
        }).setOrigin(0.5);

        const container = this.add.container(x, y, [bg, txt]);
        container.setSize(200, 40);
        container.setInteractive({ useHandCursor: true });

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
