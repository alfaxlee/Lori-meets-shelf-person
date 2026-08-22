// === 蔡徐坤死亡問答考驗模組 (CXKQuizModal.js) ===
// 負責在玩家死於第二階段蔡徐坤時，畫面瞬間像睜眼閉眼般極速閃白，時間暫停並切換至全黑神秘打字機試題頁面
// 試題分為兩批輪替出現（死第1次給第一批、第2次給第二批、第3次給第一批...依此類推）
// 無任何多餘標題或題名以保持神秘感。每批三題全選第一個選項方可復活並恢復時間與給予2秒無敵，選錯任一題立即引發 triggerCrash 當機
// 新增程式碼皆附上中文註解

// 記錄玩家死亡次數以輪替題組 (新增中文註解：死亡次數輪替計數器)
let quizDeathCount = 0;

/**
 * 重設問答死亡次數計數器 (新增中文註解)
 */
export function resetQuizDeathCount() {
    quizDeathCount = 0;
}

/**
 * 顯示蔡徐坤全黑神秘問答界面 (新增中文註解：瞬間極速閃白 + 時間暫停 + 全黑打字機問答，兩批輪替)
 * @param {Phaser.Scene} scene - 遊戲主場景
 * @param {Function} onReviveSuccess - 全部答對時的復活回呼函數
 * @param {Function} onFail - 答錯時的立即當機回呼函數
 */
export function showCXKQuizModal(scene, onReviveSuccess, onFail) {
    // 1. 極速全白閃爍遮罩（如睜眼閉眼般瞬間閃白，持續約 120ms）(新增中文註解)
    const flashEl = document.createElement('div');
    Object.assign(flashEl.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff', // 極速全白閃爍
        zIndex: '10010',
        opacity: '1',
        pointerEvents: 'none',
        transition: 'opacity 0.12s cubic-bezier(0.1, 0.9, 0.2, 1)'
    });
    document.body.appendChild(flashEl);

    setTimeout(() => {
        flashEl.style.opacity = '0';
        setTimeout(() => {
            flashEl.remove();
        }, 120);
    }, 40);

    // 2. 暫停遊戲時間與物理 (新增中文註解：時間暫停)
    if (scene.physics) scene.physics.pause();
    if (scene.scene) scene.scene.pause();

    // 試題資料庫：分成兩批（第一批3題，第二批3題）(新增中文註解)
    const batch1 = [
        {
            text: "你有姬姬嗎？",
            options: [
                { text: "有", correct: true },
                { text: "沒有", correct: false }
            ]
        },
        {
            text: "姬姬太美嗎？",
            options: [
                { text: "太美", correct: true },
                { text: "不美", correct: false }
            ]
        },
        {
            text: "你會唱跳rap籃球嗎？",
            options: [
                { text: "會", correct: true },
                { text: "不會", correct: false }
            ]
        }
    ];

    const batch2 = [
        {
            text: "你覺得怎樣",
            options: [
                { text: "我看了魔", correct: true },
                { text: "我沒荔枝", correct: false }
            ]
        },
        {
            text: "背帶滑落會怎樣",
            options: [
                { text: "敗北", correct: true },
                { text: "沒事", correct: false }
            ]
        },
        {
            text: "姬在叫",
            options: [
                { text: "唱跳的人是我", correct: true },
                { text: "我沒有姬姬", correct: false }
            ]
        }
    ];

    // 死第 1 次給第一批，第 2 次給第二批，第 3 次給第一批...依此類推 (新增中文註解：兩批輪替出現)
    const questions = (quizDeathCount % 2 === 0) ? batch1 : batch2;
    quizDeathCount++;

    let currentQuestionIndex = 0;
    let isTyping = false;
    let typeTimer = null;

    // 建立純黑全螢幕 DOM 容器 (新增中文註解：全黑背景直接轉場)
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000', // 純黑背景
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10005',
        fontFamily: "'Courier New', Courier, monospace, 'Microsoft JhengHei', sans-serif", // 顏值崩壞同款字體
        color: '#ffd700', // 金黃色微發光文字
        padding: '20px',
        boxSizing: 'border-box',
        userSelect: 'none',
        opacity: '0',
        transition: 'opacity 0.3s ease'
    });

    // 建立打字機題目文字容器 (新增中文註解：顏值崩壞同款大字體與金黃發光特效)
    const questionEl = document.createElement('div');
    Object.assign(questionEl.style, {
        fontSize: '32px',
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: '1.6',
        maxWidth: '800px',
        minHeight: '70px',
        color: '#ffffff',
        textShadow: '0 0 12px rgba(255, 215, 0, 0.8), 0 0 25px rgba(255, 215, 0, 0.4)',
        letterSpacing: '2px',
        marginBottom: '40px'
    });
    container.appendChild(questionEl);

    // 建立選項按鈕容器 (新增中文註解)
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex',
        gap: '40px',
        opacity: '0',
        transition: 'opacity 0.3s ease'
    });
    container.appendChild(btnContainer);

    document.body.appendChild(container);

    // 漸變淡入純黑畫面 (新增中文註解)
    setTimeout(() => {
        container.style.opacity = '1';
        renderQuestion(0);
    }, 60);

    /**
     * 執行打字機動畫顯示題目文字 (新增中文註解：顏值崩壞同款逐字打字動畫)
     */
    function typeWriter(text, onComplete) {
        if (typeTimer) clearInterval(typeTimer);
        questionEl.innerText = '';
        let charIndex = 0;
        isTyping = true;
        btnContainer.style.opacity = '0';

        typeTimer = setInterval(() => {
            if (charIndex < text.length) {
                questionEl.innerText += text.charAt(charIndex);
                charIndex++;
            } else {
                clearInterval(typeTimer);
                typeTimer = null;
                isTyping = false;
                if (onComplete) onComplete();
            }
        }, 50); // 每 50ms 出一字
    }

    /**
     * 渲染指定題目的按鈕與打字效果 (新增中文註解)
     */
    function renderQuestion(index) {
        const q = questions[index];
        btnContainer.innerHTML = '';
        btnContainer.style.opacity = '0';

        // 建立兩個選項按鈕 (顏值崩壞同款發光邊框按鈕) (新增中文註解)
        q.options.forEach((opt, optIdx) => {
            const btn = document.createElement('button');
            btn.innerText = opt.text;
            Object.assign(btn.style, {
                padding: '12px 36px',
                fontSize: '22px',
                fontWeight: 'bold',
                fontFamily: "'Courier New', Courier, monospace, 'Microsoft JhengHei', sans-serif",
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '2px solid #ffd700',
                borderRadius: '8px',
                cursor: 'pointer',
                letterSpacing: '2px',
                boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
                transition: 'all 0.2s ease',
                outline: 'none'
            });

            // 懸停動畫 (新增中文註解：金色發光擴散)
            btn.onmouseover = () => {
                btn.style.backgroundColor = '#ffd700';
                btn.style.color = '#000000';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.9)';
                btn.style.transform = 'scale(1.08)';
            };
            btn.onmouseout = () => {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '#ffffff';
                btn.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
                btn.style.transform = 'scale(1)';
            };

            // 點擊事件 (新增中文註解：選第一個繼續，選第二個直接當機)
            btn.onclick = () => {
                if (isTyping) return; // 打字未完成不可點擊

                if (opt.correct) {
                    // 選對了：進行下一題或成功復活
                    currentQuestionIndex++;
                    if (currentQuestionIndex < questions.length) {
                        btnContainer.style.opacity = '0';
                        setTimeout(() => {
                            renderQuestion(currentQuestionIndex);
                        }, 200);
                    } else {
                        // 當前批次題目全部答對：黑幕淡出並成功復活
                        container.style.opacity = '0';
                        setTimeout(() => {
                            container.remove();
                            if (onReviveSuccess) onReviveSuccess();
                        }, 300);
                    }
                } else {
                    // 選錯了：黑幕移除並立刻當機！
                    if (typeTimer) clearInterval(typeTimer);
                    container.remove();
                    if (onFail) onFail();
                }
            };

            btnContainer.appendChild(btn);
        });

        // 啟動打字機顯示題目 (新增中文註解)
        typeWriter(q.text, () => {
            btnContainer.style.opacity = '1';
        });
    }
}
