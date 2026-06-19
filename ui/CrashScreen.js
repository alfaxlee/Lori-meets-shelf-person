// 確保強迫全螢幕在整個遊戲生命週期中只被觸發一次
let hasEnteredFullscreen = false;

/**
 * 建立並顯示當機畫面（藍屏）
 * 包含進度條動畫，完成後切換為彩色電視背景
 * @param {Phaser.Scene} scene - 遊戲場景（用於暫停物理和場景）
 */
export function showCrashScreen(scene) {
    // 暫停遊戲物理與場景
    scene.physics.pause();
    scene.scene.pause();

    // 建立藍屏 DOM 元素
    const crashScreen = document.createElement('div');
    crashScreen.className = 'bsod-container'; // 使用 CSS class
    crashScreen.innerHTML = `
        <div class="bsod-content">
            <div class="bsod-smiley">:(</div>
            <h1 class="bsod-message">不明錯誤，我們將盡力幫您修復，若無法修復請上: <a href="https://alfaxlee.github.io/problemsolving/">https://alfaxlee.github.io/problemsolving/</a></h1>
            <div class="bsod-progress">修復中<span class="progress-percent">0</span>% 完成</div>
            <div class="bsod-footer">
                <img src="./assets/images/qr%20code.png" class="bsod-qr">
                <div class="bsod-details">
                    <p>搜尋此錯誤:</p>
                    <p class="bsod-error-code">CRITICAL_PROCESS_DIED_BY_LOLI</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(crashScreen);

    // 使用局部選擇器，避免多個當機畫面時的 ID 衝突
    const progressPercent = crashScreen.querySelector('.progress-percent');
    const progressRow = crashScreen.querySelector('.bsod-progress');

    // 進度條動畫（3 秒內從 0% 到 100%）(修改)
    let percent = 0;
    const startTime = Date.now();
    const updatePercent = () => {
        percent = Math.min(Math.floor(((Date.now() - startTime) / 3000) * 100), 100);

        if (progressPercent) progressPercent.innerText = percent;

        if (percent < 100) {
            requestAnimationFrame(updatePercent);
        } else {
            // 當修復到 100% 的瞬間，將進度列文字改為「錯誤」
            if (progressRow) {
                progressRow.innerText = '錯誤';
                progressRow.style.color = 'black'; // 文字變為黑色以在未來電視背景下可讀
            }

            // 顯示出錯誤後 0.5 秒 (500 毫秒) 執行後續動作 (修改)
            setTimeout(() => {
                // 1. 讓所有字與 QR code 隱藏消失
                const bsodContent = crashScreen.querySelector('.bsod-content');
                if (bsodContent) {
                    bsodContent.style.display = 'none';
                }

                // 2. 強迫進入全螢幕 (整個遊戲僅限觸發一次，並捕獲可能的安全限制錯誤)
                if (!hasEnteredFullscreen) {
                    hasEnteredFullscreen = true;
                    const docEl = document.documentElement;
                    if (docEl.requestFullscreen) {
                        docEl.requestFullscreen().catch(err => {
                            console.warn('全螢幕請求被瀏覽器安全政策拒絕:', err);
                        });
                    }
                }

                // 3. 背景轉換為彩色電視畫面
                crashScreen.classList.add('tv-background');
            }, 500);
        }
    };
    requestAnimationFrame(updatePercent);
}
