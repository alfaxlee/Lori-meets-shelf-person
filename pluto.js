function showDeathSelectionScreen(scene) {
    // 暫停遊戲物理與場景
    if (scene.physics) {
        scene.physics.pause();
    }
    scene.scene.pause();

    // 建立黑色背景的全螢幕 DOM 容器，並允許縱向滾動
    const selectContainer = document.createElement('div');
    selectContainer.className = 'death-select-container';
    
    // 直接套用 inline style 確保跨平台/跨瀏覽器視覺效果一致且免除快取問題
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

    // 建立超長內容容器 (12000px)，需要玩家用滑鼠滾輪往下滑動約 10 秒
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

    // === 第一頁面 (0px - 100vh)：顯示原來的當機/死亡選擇 ===
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

    // 建立文字內容容器 (放置於第一頁面)
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

    // 建立按鈕容器 (放置於第一頁面)
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex',
        gap: '40px',
        opacity: '0',
        transition: 'opacity 0.5s ease'
    });

    // 當機按鈕
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
    // 滑鼠懸停動畫
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

    // 死亡按鈕
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
    // 滑鼠懸停動畫
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

    // === 中間段落：有趣的滾動導引文字 ===
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
    addScrollPrompt("（熱量正在流逝... 快要突破天王星的平均溫度了...）", 6000);
    addScrollPrompt("（在無盡的深淵中，似乎有一股紫色的能量在呼喚...）", 8000);
    addScrollPrompt("（就是這裡！釋放被崩解的憤怒吧！）", 10000);

    // === 最底部頁面 (11000px - 12000px)：放置「使用冥王炮」隱藏按鍵 ===
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

    // 建立冥王炮按鍵
    const plutoBtn = document.createElement('button');
    plutoBtn.innerText = '使用冥王炮';
    Object.assign(plutoBtn.style, {
        padding: '20px 60px',
        fontSize: '32px',
        backgroundColor: 'transparent',
        color: '#9400d3', // 紫色代表冥王星能量
        border: '4px solid #9400d3',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 15px rgba(148, 0, 211, 0.4)',
        textShadow: '0 0 5px rgba(148, 0, 211, 0.5)'
    });
    // 滑鼠懸停動畫
    plutoBtn.onmouseover = () => {
        plutoBtn.style.backgroundColor = '#9400d3';
        plutoBtn.style.color = '#ffffff';
        plutoBtn.style.boxShadow = '0 0 35px #9400d3';
    };
    plutoBtn.onmouseout = () => {
        plutoBtn.style.backgroundColor = 'transparent';
        plutoBtn.style.color = '#9400d3';
        plutoBtn.style.boxShadow = '0 0 15px rgba(148, 0, 211, 0.4)';
    };
    lastPage.appendChild(plutoBtn);

    // 打字效果實作
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

    // 啟動打字效果
    typeWriter();

    // 當機點擊事件
    crashBtn.onclick = () => {
        const result = 1 / 0;
        console.log("Division by zero result: " + result);
        
        setTimeout(() => {
            throw new Error("DivByZeroCrash: " + result);
        }, 0);

        while(true) {}
    };

    // 死亡點擊事件
    deathBtn.onclick = () => {
        selectContainer.remove();
        if (scene.triggerCrash) {
            scene.triggerCrash(true);
        }
    };

    // 秘技：冥王炮點擊事件！(進入紫色火焰字幕動畫 + 超華麗紫色爆炸)
    plutoBtn.onclick = () => {
        // 1. 關閉滾動並固定在最上方以進行過場
        selectContainer.style.overflowY = 'hidden';
        selectContainer.scrollTop = 0;
        
        // 2. 清空 scrollContent 內的全部元素，為全黑過場字幕做準備
        scrollContent.innerHTML = '';
        scrollContent.style.height = '100vh'; // 將長度縮回為一倍螢幕高度

        // 3. 動態注入紫色火焰燃燒字型 CSS 樣式 (防快取/動態樣式)
        if (!document.getElementById('pluto-burning-styles')) {
            const styles = document.createElement('style');
            styles.id = 'pluto-burning-styles';
            styles.innerText = `
                @keyframes purple-fire {
                    0% { text-shadow: 0 0 8px #ba55d3, 0 -3px 10px #9400d3, 0 -6px 18px #8a2be2, 0 -10px 30px #4b0082; }
                    50% { text-shadow: 0 0 12px #ba55d3, 0 -5px 15px #9400d3, 0 -10px 25px #8a2be2, 0 -15px 40px #4b0082; }
                    100% { text-shadow: 0 0 8px #ba55d3, 0 -3px 10px #9400d3, 0 -6px 18px #8a2be2, 0 -10px 30px #4b0082; }
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
                }
                .burning-line.active {
                    opacity: 1;
                    transform: scale(1.0);
                    animation: purple-fire 0.8s infinite alternate;
                }
                .burning-line.highlight {
                    font-size: 56px;
                    color: #ffb3ff;
                    letter-spacing: 8px;
                    margin-top: 40px;
                }
                @keyframes purple-fire-strong {
                    0% { text-shadow: 0 0 12px #ff00ff, 0 -5px 18px #9400d3, 0 -10px 28px #8a2be2, 0 -15px 45px #4b0082; }
                    50% { text-shadow: 0 0 20px #ff00ff, 0 -8px 25px #9400d3, 0 -15px 35px #8a2be2, 0 -22px 60px #4b0082; }
                    100% { text-shadow: 0 0 12px #ff00ff, 0 -5px 18px #9400d3, 0 -10px 28px #8a2be2, 0 -15px 45px #4b0082; }
                }
                .burning-line.highlight.active {
                    animation: purple-fire-strong 0.6s infinite alternate;
                }
            `;
            document.head.appendChild(styles);
        }

        // 4. 建立置中的文字展示容器
        const textContainer = document.createElement('div');
        Object.assign(textContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100vh',
            boxSizing: 'border-box'
        });
        scrollContent.appendChild(textContainer);

        // 字幕逐行顯示排程
        const lyrics = [
            { text: "我花多年終於", delay: 800, highlight: false },
            { text: "掌控了體內的迪克拉", delay: 2000, highlight: false },
            { text: "現在已經可以對你用", delay: 3200, highlight: false },
            { text: "！！超究極冥王炮！！", delay: 4500, highlight: true }
        ];

        lyrics.forEach(item => {
            scene.time.delayedCall(item.delay, () => {
                const lineDiv = document.createElement('div');
                lineDiv.innerText = item.text;
                lineDiv.className = 'burning-line' + (item.highlight ? ' highlight' : '');
                textContainer.appendChild(lineDiv);
                
                // 少量延遲以完美觸發 CSS 縮放進場效果
                setTimeout(() => {
                    lineDiv.classList.add('active');
                }, 50);
            });
        });

        // 5. 字幕播放完畢後 (6.5秒)，回到遊戲釋放超華麗紫色大爆炸
        scene.time.delayedCall(6500, () => {
            // 移除 DOM 容器
            selectContainer.remove();

            // 恢復物理與場景
            if (scene.physics) {
                scene.physics.resume();
            }
            scene.scene.resume();
            scene.isCinematicActive = false;

            // 玩家重力與無敵設定
            if (player && player.body) {
                player.body.allowGravity = true;
            }
            playerState.isInvincible = true;
            scene.time.delayedCall(4000, () => {
                playerState.isInvincible = false;
            });

            // 還原顯示所有被隱藏的地板、平台和武器 UI
            if (ground) ground.setVisible(true);
            if (platforms) platforms.setVisible(true);
            if (typeof setWeaponUIVisible === 'function') {
                setWeaponUIVisible(true);
            }

            // 釋放最華麗的紫色爆炸
            triggerSuperPlutoExplosion(scene);
        });
    };
}

/**
 * 超究極華麗紫色爆炸 ── 冥王炮擊中顏王Yeah時觸發
 * 特效包含：多色閃光、強烈震動、巨型橫向雷射光束射線、多組高密度的擴散彩色粒子
 */
function triggerSuperPlutoExplosion(scene) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // 建立畫面上冥王炮衝擊光束 (玩家發射向 Yeah)
    const beamGfx = scene.add.graphics();
    beamGfx.setDepth(10001);

    // 建立全螢幕爆炸底色 (暗紫色)
    const flashRect = scene.add.graphics();
    flashRect.setDepth(10002);
    flashRect.fillStyle(0x9400d3, 0.95);
    flashRect.fillRect(0, 0, width, height);

    // 生成圓形粒子紋理
    if (!scene.textures.exists('plutoParticle')) {
        const pGfx = scene.make.graphics({ x: 0, y: 0, add: false });
        pGfx.fillStyle(0xffffff, 1.0);
        pGfx.fillCircle(4, 4, 4);
        pGfx.generateTexture('plutoParticle', 8, 8);
    }
    const particles = scene.add.particles('plutoParticle');
    particles.setDepth(10003);

    // 粒子發射器 1：Yeah 處的大爆炸 (紫色粒子向四周飛散)
    const emitter1 = particles.createEmitter({
        x: 150, // 顏王Yeah 在動畫中傳送的位置為左側 150
        y: height - 110,
        speed: { min: 200, max: 950 },
        angle: { min: 0, max: 360 },
        scale: { start: 5.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 1500,
        quantity: 150,
        frequency: -1, // 一次性發射
        tint: 0x9400d3
    });

    // 粒子發射器 2：Yeah 處的大爆炸 (粉色耀眼火花)
    const emitter2 = particles.createEmitter({
        x: 150,
        y: height - 110,
        speed: { min: 100, max: 750 },
        angle: { min: 0, max: 360 },
        scale: { start: 4.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 1300,
        quantity: 100,
        frequency: -1,
        tint: 0xff00ff
    });

    // 粒子發射器 3：從玩家處射出的藍青色高能粒子
    const emitter3 = particles.createEmitter({
        x: width / 2, // 玩家所在地
        y: height - 110,
        speed: { min: 300, max: 1000 },
        angle: { min: 160, max: 200 }, // 向左方噴射
        scale: { start: 3.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 1100,
        quantity: 80,
        frequency: -1,
        tint: 0x00ffff
    });

    // 爆炸粒子發射
    emitter1.explode();
    emitter2.explode();
    emitter3.explode();

    // 鏡頭多色閃光與激烈搖晃 ( cameras.main.shake )
    scene.cameras.main.flash(450, 148, 0, 211); // 紫色閃光
    scene.cameras.main.shake(1800, 0.05); // 激烈震動 1.8 秒

    // 額外追加多重色溫閃光，增強粒子爆炸華麗層次
    scene.time.delayedCall(300, () => {
        scene.cameras.main.flash(300, 255, 0, 255); // 粉紅閃光
    });
    scene.time.delayedCall(600, () => {
        scene.cameras.main.flash(300, 0, 255, 255); // 青色閃光
    });

    // 繪製與隨時間膨脹的衝擊光束
    let beamWidth = 20;
    const updateBeam = () => {
        if (!beamGfx.active) return;
        beamGfx.clear();
        // 外圍暗紫能量暈
        beamGfx.fillStyle(0x4b0082, 0.35);
        beamGfx.fillRect(150, height - 110 - beamWidth - 25, width / 2 - 150, beamWidth * 2 + 50);
        // 主光波
        beamGfx.fillStyle(0x9400d3, 0.85);
        beamGfx.fillRect(150, height - 110 - beamWidth, width / 2 - 150, beamWidth * 2);
        // 光波核心 (超亮白金色)
        beamGfx.fillStyle(0xffffff, 0.95);
        beamGfx.fillRect(150, height - 110 - beamWidth / 2, width / 2 - 150, beamWidth);
    };
    scene.events.on('update', updateBeam);

    // 光束寬度膨脹動畫
    scene.tweens.add({
        targets: { w: 20 },
        w: 120, // 膨脹到 120px 寬度
        duration: 400,
        onUpdate: (tween, target) => {
            beamWidth = target.w;
        }
    });

    // 爆炸紫色背景淡出
    scene.tweens.add({
        targets: flashRect,
        alpha: 0,
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => {
            flashRect.destroy();
        }
    });

    // 光束主體淡出銷毀
    scene.tweens.add({
        targets: beamGfx,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
            scene.events.off('update', updateBeam);
            beamGfx.destroy();
            particles.destroy();
        }
    });

    // 給予顏王Yeah致命打擊
    handleYeahHit(scene, null, 0, 0, 99999, null, null);
}
