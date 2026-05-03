// === 當機畫面（藍屏）模組 ===
// 負責建立和顯示 BSOD 風格的當機畫面 UI

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

    // 進度條動畫（5 秒內從 0% 到 100%）
    let percent = 0;
    const startTime = Date.now();
    const updatePercent = () => {
        percent = Math.min(Math.floor(((Date.now() - startTime) / 5000) * 100), 100);

        if (progressPercent) progressPercent.innerText = percent;

        if (percent < 100) {
            requestAnimationFrame(updatePercent);
        } else {
            // 當修復到 100% 時，背景切換為彩色電視，並將文字改為「錯誤」
            crashScreen.classList.add('tv-background');
            if (progressRow) {
                progressRow.innerText = '錯誤';
                progressRow.style.color = 'black'; // 背景變彩色後，黑色文字可能更清楚
            }
        }
    };
    requestAnimationFrame(updatePercent);
}
