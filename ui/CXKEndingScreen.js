// === 蔡徐坤擊敗通關結尾畫面模組 (CXKEndingScreen.js) ===
// 負責在玩家成功擊敗第二階段蔡徐坤時，進入黑色背景展示推薦歌曲與倒數計時，倒數完畢後展示「一句話跟你說 / 雞你太美」結束畫面
// 新增程式碼皆附上中文註解

/**
 * 顯示蔡徐坤擊敗通關結尾畫面 (新增中文註解：黑色背景推薦歌曲清單 + 5秒倒數 + 雞你太美大字結束)
 * @param {Phaser.Scene} scene - 遊戲主場景
 */
export function showCXKEndingScreen(scene) {
    // 暫停遊戲物理與場景 (新增中文註解)
    if (scene.physics) scene.physics.pause();
    if (scene.scene) scene.scene.pause();

    // 建立全螢幕純黑 DOM 容器 (新增中文註解：通關純黑底色)
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10005',
        fontFamily: "'Courier New', Courier, monospace, 'Microsoft JhengHei', sans-serif",
        color: '#ffffff',
        padding: '30px',
        boxSizing: 'border-box',
        userSelect: 'none',
        opacity: '0',
        transition: 'opacity 0.5s ease'
    });

    // 第一階段內容容器：推薦歌曲與倒數秒數 (新增中文註解)
    const step1Container = document.createElement('div');
    Object.assign(step1Container.style, {
        maxWidth: '850px',
        width: '90vw',
        padding: '20px',
        lineHeight: '1.8',
        fontSize: '22px',
        textAlign: 'left',
        transition: 'opacity 0.4s ease'
    });

    let countdown = 246; // 正式倒數時間設為 246 秒 (修改)

    step1Container.innerHTML = `
        <p style="margin: 0 0 20px 0; font-weight: bold; font-size: 28px; color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.6);">
            我推薦的歌：
        </p>
        <p style="margin: 0 0 12px 0;">
            雞勇者 <a href="https://www.youtube.com/watch?v=3nr1sKPXPq4" target="_blank" style="color: #00ffff; text-decoration: underline; word-break: break-all;">https://www.youtube.com/watch?v=3nr1sKPXPq4</a>
        </p>
        <p style="margin: 0 0 12px 0;">
            雞在叫，唱跳的人是我 <a href="https://www.youtube.com/watch?v=Pr-NJEg6-to" target="_blank" style="color: #00ffff; text-decoration: underline; word-break: break-all;">https://www.youtube.com/watch?v=Pr-NJEg6-to</a>
        </p>
        <p style="margin: 0 0 25px 0;">
            唱跳rap大男孩 <a href="https://www.youtube.com/watch?v=4zPmzuUj7Pc" target="_blank" style="color: #00ffff; text-decoration: underline; word-break: break-all;">https://www.youtube.com/watch?v=4zPmzuUj7Pc</a>
        </p>
        <p style="font-weight: bold; font-size: 26px; color: #ff5555; margin-top: 30px; text-shadow: 0 0 10px rgba(255, 85, 85, 0.5);">
            確保你所有都聽完，倒數 <span class="cxk-countdown" style="font-size: 36px; color: #ffff00; text-shadow: 0 0 15px #ffd700;">${countdown}</span> 秒
        </p>
    `;

    overlay.appendChild(step1Container);
    document.body.appendChild(overlay);

    // 淡入黑幕 (新增中文註解)
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 50);

    const countdownEl = step1Container.querySelector('.cxk-countdown');

    // 倒數計時器 (新增中文註解：每秒倒數)
    const timer = setInterval(() => {
        countdown--;
        if (countdownEl) {
            countdownEl.innerText = countdown;
        }

        if (countdown <= 0) {
            clearInterval(timer);
            // 倒數結束，進到下一步 (新增中文註解：切換至「一句話跟你說 / 雞你太美」)
            step1Container.style.opacity = '0';
            setTimeout(() => {
                step1Container.remove();
                showFinalStep(overlay, scene);
            }, 400);
        }
    }, 1000);
}

/**
 * 顯示結尾最後一步（上面「一句話跟你說」，下面大大「雞你太美」）(新增中文註解)
 */
function showFinalStep(overlay, scene) {
    const step2Container = document.createElement('div');
    Object.assign(step2Container.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity: '0',
        transition: 'opacity 0.6s ease'
    });

    step2Container.innerHTML = `
        <div style="font-size: 32px; color: #ffffff; margin-bottom: 30px; letter-spacing: 4px; text-shadow: 0 0 12px rgba(255, 255, 255, 0.6);">
            一句話跟你說
        </div>
        <div style="font-size: 80px; font-weight: bold; color: #ffd700; letter-spacing: 8px; text-shadow: 0 0 25px rgba(255, 215, 0, 0.9), 0 0 50px rgba(255, 100, 0, 0.6); margin-bottom: 50px;">
            雞你太美
        </div>
        <button class="cxk-restart-btn" style="
            padding: 12px 36px;
            font-size: 20px;
            font-weight: bold;
            background-color: transparent;
            color: #ffd700;
            border: 2px solid #ffd700;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
            font-family: inherit;
            transition: all 0.2s ease;
        ">重新挑戰</button>
    `;

    overlay.appendChild(step2Container);

    const restartBtn = step2Container.querySelector('.cxk-restart-btn');
    if (restartBtn) {
        restartBtn.onmouseover = () => {
            restartBtn.style.backgroundColor = '#ffd700';
            restartBtn.style.color = '#000000';
            restartBtn.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.9)';
            restartBtn.style.transform = 'scale(1.05)';
        };
        restartBtn.onmouseout = () => {
            restartBtn.style.backgroundColor = 'transparent';
            restartBtn.style.color = '#ffd700';
            restartBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.3)';
            restartBtn.style.transform = 'scale(1)';
        };
        restartBtn.onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                window.location.reload(); // 重新載入遊戲
            }, 400);
        };
    }

    setTimeout(() => {
        step2Container.style.opacity = '1';
    }, 50);
}
