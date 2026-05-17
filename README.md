# 蘿莉遇櫃人

> 一款以 **Phaser 3** 製作的 2D 橫向 Boss Rush 射擊遊戲。
> 玩家需要使用三種武器依序打倒「蘿莉」與「猥瑣大叔」兩位 Boss，並躲避越來越兇猛的攻擊。

---

## 目錄

- [技術棧](#技術棧)
- [專案架構](#專案架構)
- [模組說明](#模組說明)
- [遊玩方式](#遊玩方式)
- [Boss 行為與狀態機](#boss-行為與狀態機)
- [武器系統](#武器系統)
- [特殊機制](#特殊機制)
- [如何在本機執行](#如何在本機執行)
- [注意事項（給 AI 閱讀）](#注意事項給-ai-閱讀)

---

## 技術棧

| 項目 | 內容 |
|------|------|
| 遊戲引擎 | [Phaser 3.55.2](https://phaser.io/) (CDN 載入) |
| 語言 | 原生 JavaScript（ES Module） |
| 物理引擎 | Phaser Arcade Physics（重力 y: 1000） |
| 解析度 | 固定邏輯解析度 1280 × 720，FIT 等比縮放 |
| 模組系統 | ES Module（需 HTTP 伺服器，例如 VS Code Live Server） |
| 樣式 | 原生 CSS（`style.css`） |

---

## 專案架構

```
curseforge/
├── index.html              # 遊戲入口 HTML（載入 Phaser CDN + main.js）
├── main.js                 # 遊戲設定與 Phaser.Game 初始化
├── style.css               # 全域樣式（包含 BSOD 藍屏畫面 CSS）
├── assets/
│   └── images/             # 遊戲圖片素材
│       ├── shabi.png           # 子彈貼圖
│       ├── 羅莉抓人.png        # Boss「蘿莉」Sprite
│       ├── 蘿莉過關圖.png      # 狂暴模式背景圖
│       ├── qr code.png         # 當機畫面 QR Code
│       └── 彩色電視.png        # 當機完成後背景圖
├── scenes/
│   └── GameScene.js        # 主遊戲場景（協調所有模組）
├── player/
│   ├── PlayerController.js # 玩家移動、衝刺與無敵邏輯
│   └── DashEffects.js      # 衝刺粉塵視覺效果
├── boss/
│   ├── LoliStateMachine.js # 蘿莉 Boss AI 狀態機（HP、狀態切換、傷害處理）
│   ├── LoliAttacks.js      # 蘿莉 Boss 攻擊實作（衝擊波、雷射、彈跳球、跳躍攻擊）
│   └── UncleAttacks.js     # 猥瑣大叔 Boss AI、攻擊系統與碰撞判定
├── weapons/
│   └── WeaponManager.js    # 三把武器的彈藥、射擊、換彈邏輯
└── ui/
    ├── HUD.js              # Boss 血量文字 + 玩家衝刺能量條
    ├── MobileControls.js   # 手機觸控搖桿與按鈕
    └── CrashScreen.js      # 玩家死亡時的 BSOD 藍屏動畫
```

---

## 模組說明

### `main.js`
- 建立 Phaser 遊戲設定（解析度、縮放模式、物理引擎重力）
- 僅引入 `GameScene` 並啟動

### `scenes/GameScene.js`
- 遊戲主場景，實作 `preload()` / `create()` / `update()` 三階段
- **協調所有模組**：在 `create` 呼叫各模組的初始化函式（`initAttackRefs`、`initBossRefs`、`initUncleRefs`、`createWeaponUI`、`createHUD` 等）
- 處理所有物理碰撞器（玩家 vs 地板、子彈 vs Boss、玩家 vs 攻擊物）
- 衝刺護盾（`createDashShield`）的實作也在此檔案
- **Boss 輪替機制**：蘿莉死亡後透過 `onLoliDeath` 回呼清理蘿莉資源並生成猥瑣大叔

### `player/PlayerController.js`
- 維護 `playerState`（衝刺能量、衝刺冷卻、無敵狀態）
- `updatePlayer()`：每幀處理 WASD 移動 + Q 衝刺
- 衝刺時短暫關閉重力、進入無敵、播放粉塵特效

### `player/DashEffects.js`
- `createDashDust()`：產生 32 顆往衝刺反方向散射的粉塵粒子

### `boss/LoliStateMachine.js`
- 維護 `bossState`（hp、isBerserk、isUltimateBerserk、isSuperInvincible、isExhausted 等）
- `handleLoliHit()`：處理 Boss 受傷、擊退、特殊 HP 閾值觸發
- `updateLoliStateMachine()`：每幀依狀態決定 Boss 行為（追逐 / 狂暴飄移 / 無敵飛行 / 癱瘓靜止）
- HP 降至 **150** 以下觸發狂暴模式
- HP 降至 **50** 以下觸發超級無敵 → 究極狂暴模式

### `boss/LoliAttacks.js`
- 所有蘿莉 Boss 攻擊的具體實作，透過 `initAttackRefs()` 注入共享物件
- 攻擊種類：垂直雷射、衝擊波、彈跳球、跳躍攻擊、究極模式四砲台雷射、究極雷射、海嘯

### `boss/UncleAttacks.js`
- 猥瑣大叔 Boss 的所有狀態管理、AI 決策與攻擊實作
- 透過 `initUncleRefs()` 注入共享物件（player、uncle、uncleHPText、子彈群組等）
- **攻擊佇列系統**：`attackQueue` 陣列搭配 `tryExecuteNextAttack` 處理器，確保多重攻擊排隊執行
- **大槌攻擊**：T 字形 Graphics 繪製，每 2~4 秒觸發，具備智慧轉向（避免朝牆外打）
- **召喚地刺**：每 5~6 秒觸發，施法期間大叔變黑，依序生成三組成對地刺
- **地刺耐久度**：每根地刺有 10 HP，被子彈擊中後逐漸從黑色變白直至破碎
- **地刺碰撞箱**：所有地刺具備物理碰撞體，可阻擋玩家衝刺與子彈
- **邊界檢查**：所有地刺生成前會檢查是否在地圖範圍內，避免生成在界外
- **動態 AI**：70% 機率主動衝向玩家，具備跳躍追擊功能

### `weapons/WeaponManager.js`
- 維護三把武器的彈藥量、射速、換彈時間
- `fireMG` / `fireSG` / `fireSN`：各武器的射擊實作
- `triggerReload()`：執行換彈（彈藥空時自動觸發）

### `ui/HUD.js`
- 顯示 Boss 血量文字（畫面正上方中間）
- 每幀繪製玩家衝刺能量條（左上角）

### `ui/MobileControls.js`
- 偵測手機裝置（User Agent + Desktop 判斷）
- 建立虛擬搖桿（左下角）與射擊/換彈/衝刺按鈕（右下角）
- 透過 `mobileInput` 物件與其他模組共享輸入狀態

### `ui/CrashScreen.js`
- 玩家死亡時暫停物理與場景
- 在 DOM 疊加一個 Windows BSOD 藍屏畫面
- 進度條從 0% 動畫到 100%，完成後背景切換為「彩色電視」圖

---

## 遊玩方式

### 鍵盤（桌機）

| 按鍵 | 功能 |
|------|------|
| `W` | 跳躍（落地時才能跳） |
| `A` | 向左移動 |
| `D` | 向右移動 |
| `Q` | **衝刺**（朝滑鼠方向，帶無敵） |
| 滑鼠左鍵 | 發射彈弓（MG） |
| 滑鼠右鍵 | 發射霰彈槍（SG） |
| 滑鼠中鍵 | 發射狙擊槍（SN） |
| `R` | 手動換彈（三把同時換） |

### 手機觸控

| 控制項 | 功能 |
|--------|------|
| 左下搖桿 | 移動（左/右/跳躍） |
| `MG` 按鈕 | 發射彈弓（自動瞄準 Boss） |
| `SG` 按鈕 | 發射霰彈槍（自動瞄準 Boss） |
| `SN` 按鈕 | 發射狙擊槍（自動瞄準 Boss） |
| `RE` 按鈕 | 換彈 |
| `DASH` 按鈕 | 衝刺（朝遠離 Boss 方向） |

### 畫面資訊

- **左上角**：彈弓彈藥量（黃色），衝刺能量條（青色）
- **右上角**：霰彈槍彈藥量（綠色）
- **上方中間**：狙擊槍彈藥量（青色），Boss 血量（紅色）

---

## Boss 行為與狀態機

### 第一階段：蘿莉 Boss（HP: 600）

Boss「蘿莉」有以下幾種狀態，優先順序由上到下：

```
isSuperInvincible（超級無敵）
    → 飛向畫面中上方，放大身體，發動全螢幕旋轉雷射
    → 切換為究極狂暴模式（isUltimateBerserk）7 秒
    → 7 秒後進入 isExhausted（癱瘓）

isExhausted（癱瘓）
    → 倒在地板，停止移動，此時碰到不會死亡
    → 玩家可繼續輸出剩餘 50 HP 擊敗 Boss

isBerserk（狂暴）（HP < 150 觸發）
    → 背景換成狂暴圖，新增天花板/地板（粉紅色）
    → 飄移移動（正弦波速度）
    → 畫面兩側各出現一把大型雷射砲（左右交替射擊）
    → 同時持續發動垂直雷射（頻率提高）

isHit（受擊硬直）
    → 被擊退 + 閃紅色，持續 stunTime ms

一般模式（HP >= 150）
    → 追著玩家水平移動
    → 玩家跳高則 Boss 跳躍追擊
    → 落地時依落差產生衝擊波
    → 每 3-7 秒投下 1-3 道垂直雷射
    → 每 15-25 秒丟出一顆彈跳球
    → 每 5-7 秒發動跳躍攻擊（拋物線跳到玩家頭上）
```

#### HP 閾值事件

| HP | 事件 |
|----|------|
| 600 → 150 | 一般模式 |
| < 150 | 觸發狂暴模式（isBerserk = true） |
| 降到 50 以下（一次性） | 鎖定在 49 HP，觸發超級無敵（isSuperInvincible） |
| 超級無敵結束 7 秒後 | 癱瘓（isExhausted），玩家可打完剩餘 50 HP |
| ≤ 0 | Boss 死亡 → 進入第二階段（猥瑣大叔登場） |

### 第二階段：猥瑣大叔 Boss（HP: 800）

蘿莉被擊敗後，猥瑣大叔在蘿莉的出生位置登場。大叔體型為蘿莉的 1.5 倍，具備獨立的 AI 與攻擊系統。

```
攻擊佇列模式
    → 大槌攻擊與召喚地刺共用攻擊佇列
    → 同一時間只能執行一種攻擊
    → 攻擊結束後自動延遲 0.1 秒執行下一個排隊中的攻擊

大槌攻擊（每 2~4 秒）
    → 攻擊時大叔停止移動
    → 生成 T 字形黑色大槌（Graphics 繪製）
    → 智慧轉向：離牆壁太近時自動改變揮打方向
    → 揮下後在地面生成地刺（高度為畫面高度 1/4）
    → 地刺升起後維持 2 秒再降下消失

召喚地刺（每 5~6 秒）
    → 施法期間大叔變黑（深灰色 Tint 效果）
    → 0.2 秒後開始生成三組成對地刺（左右各一根）
    → 三組地刺間隔 0.6 秒依序出現
    → 地刺高度等同大叔身高，寬度為大叔一半
    → 地刺升起 → 停留 0.5 秒 → 降下消失
    → 所有地刺消失後大叔恢復正常外觀

地刺耐久度系統
    → 每根地刺有 10 HP
    → 被子彈擊中時顏色從黑色(#000000)逐漸變白
    → 顏色隨受傷比例線性插值：黑 → 灰 → 淺灰 → 白
    → HP 歸零時地刺立即破碎消失
    → 所有種類的子彈（MG/SG/SN）均可擊中地刺

地刺碰撞機制
    → 地刺具備物理碰撞箱（immovable）
    → 玩家碰到地刺 → 當機
    → 玩家衝刺時無法穿越地刺
    → 子彈碰到地刺 → 子彈消失 + 地刺扣血

邊界智慧檢查
    → 所有地刺生成前檢查是否在地圖範圍內
    → 大槌攻擊離牆太近時自動改變方向
    → 超出邊界的地刺自動取消生成

移動 AI
    → 70% 機率主動衝向玩家
    → 具備跳躍追擊功能
    → 受擊時擊退力減半
    → 攻擊期間停止移動
```

---

## 武器系統

| 武器 | 按鍵 | 彈藥 | 射速 | 換彈 | 傷害 | 擊退力 | 特性 |
|------|------|------|------|------|------|--------|------|
| 彈弓（MG） | 左鍵 | 72 發 | 100ms | 3 秒 | 5 | 600 | 高速彈、會反彈 |
| 霰彈槍（SG） | 右鍵 | 5 組（每組消耗 5 發） | 500ms | 1 秒 | 25 | 400 | 5 發散射（±18°），不受重力 |
| 狙擊槍（SN） | 中鍵 | 5 發 | 1.5 秒 | 5 秒 | 50 | 1500 | 極速、高傷害、高擊退 |

### 衝刺護盾（Dash Shield）

- 衝刺時在玩家前方生成弧形護盾（青色）
- 護盾持續約 **1.15 秒**
- 若護盾接觸 Boss（距離 < radius + 40），對 Boss 造成 **25 傷害、1500 擊退**

---

## 特殊機制

### 衝刺系統

- 衝刺消耗 **33 能量**（共 100 點，最多衝 3 次）
- 衝刺期間 **完全無敵**（包含碰觸 Boss 本體）
- 無敵持續：衝刺結束後再延續 **1 秒**
- 能量不足時，能量條抖動並閃紅
- 究極狂暴模式期間：能量上限翻倍為 200，消耗減半，回復加快
- **注意**：衝刺無法穿越猥瑣大叔的地刺

### 跳躍攻擊（Jump Attack）— 蘿莉專屬

- 冷卻：每 **5–7 秒**觸發一次（超級無敵/癱瘓期間停止）
- 流程：
  1. 顯示拋物線預警路徑（紅色虛線）及落點驚嘆號
  2. Boss 靜止 1 秒
  3. 沿拋物線旋轉 360° 飛向玩家附近落地
  4. 落地產生巨型咖啡色衝擊波（向左右斜上飛出）
  5. 螢幕兩側海嘯同步向中心移動，1.5 秒後在中央消失

### 究極狂暴模式攻擊 — 蘿莉專屬

- **四砲台雷射**：左上（TL）、左下（BL）、右上（TR）、右下（BR）四把砲台，同時朝中心方向±45°掃射，每 2 秒一輪
- **每秒彈跳球**：每秒從 Boss 位置噴出 10 顆全向彈跳球
- **隨機全域雷射**：在全畫面隨機位置以隨機角度發射長達 3000px 的雷射

### 猥瑣大叔攻擊系統

- **大槌攻擊**：每 2~4 秒，T 字形大槌揮擊地面並生成地刺
- **召喚地刺**：每 5~6 秒，施法變黑，三組地刺依序從地面升起
- **地刺耐久度**：10 HP，被子彈擊中逐漸變白後破碎，子彈同時消失
- **攻擊佇列**：多重攻擊自動排隊，間隔 0.1 秒依序執行

### 死亡機制（BSOD）

- 碰到 Boss 本體（蘿莉一般/狂暴模式、猥瑣大叔）→ 當機
- 碰到衝擊波 → 當機
- 碰到彈跳球 → 當機
- 碰到大槌或地刺 → 當機
- 雷射打到玩家 → 當機
- **衝刺無敵期間**，上述攻擊均無效（但無法穿越地刺）

---

## 如何在本機執行

此專案使用 ES Module，**必須透過 HTTP 伺服器**執行（直接開啟 `index.html` 會因 CORS 失敗）。

**推薦方式：VS Code + Live Server 擴充套件**

1. 安裝 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. 在 VS Code 中開啟 `curseforge/` 資料夾
3. 右鍵點選 `index.html` → **Open with Live Server**
4. 瀏覽器自動開啟，遊戲開始載入

**其他方式：**

```bash
# 使用 Python 內建伺服器
python -m http.server 8080
# 開啟 http://localhost:8080
```

---

## 注意事項（給 AI 閱讀）

> 以下是給協助編輯本專案的 AI 需要了解的重要架構與規則。

### 模組依賴關係

```
main.js
└── scenes/GameScene.js
    ├── ui/MobileControls.js    （mobileInput 共享物件）
    ├── ui/CrashScreen.js
    ├── ui/HUD.js
    ├── weapons/WeaponManager.js
    ├── player/DashEffects.js
    ├── player/PlayerController.js
    │   ├── ui/MobileControls.js
    │   └── ui/HUD.js
    ├── boss/LoliStateMachine.js
    │   ├── ui/HUD.js
    │   ├── player/PlayerController.js
    │   └── boss/LoliAttacks.js    （部分 import，注意循環依賴）
    ├── boss/LoliAttacks.js
    │   └── boss/LoliStateMachine.js   （只 import bossState）
    └── boss/UncleAttacks.js       （獨立模組，無循環依賴）
```

> ⚠️ `LoliAttacks.js` 與 `LoliStateMachine.js` 之間存在**部分循環引用**。
> `LoliAttacks` 只 import `bossState`（純資料物件），
> `LoliStateMachine` import `LoliAttacks` 的函式。
> 避免循環依賴的方式是透過 `initAttackRefs()` / `initBossRefs()` 在 `create` 階段注入物件參考，而非直接 import。

### 共享物件注入模式

三個 Boss 模組均使用 `refs` 模式：

```js
let refs = {};
export function initXxxRefs(gameRefs) { refs = gameRefs; }
// 之後的函式皆透過 refs.loli、refs.player、refs.lasers 等存取
```

在 `GameScene.create()` 中必須同時呼叫：

```js
initAttackRefs({ loli, player, shockwaves, lasers, enemyBalls });
initBossRefs({ loli, player, lasers, enemyBalls, shockwaves, onLoliDeath });
initUncleRefs({ uncle, uncleHPText, onUncleDeath, player, mgBullets, sgBullets, snBullets });
```

### 物理群組

| 群組變數 | 內容 | 說明 |
|----------|------|------|
| `mgBullets` | 彈弓子彈 | 反彈，碰牆消失，碰地刺消失 |
| `sgBullets` | 霰彈子彈 | 不受重力，碰牆消失，碰地刺消失 |
| `snBullets` | 狙擊子彈 | 碰地板消失，碰地刺消失 |
| `shockwaves` | 衝擊波 | 碰牆消失 |
| `lasers` | 雷射/海嘯等 | body.enable = false（僅碰撞偵測用） |
| `enemyBalls` | 彈跳球 | 碰地板反彈，碰天花板/牆消失 |

### 編碼規則

- **所有新增程式碼請加上中文註解**（`GEMINI.md` 規定）
- 圖片素材放在 `assets/images/` 目錄
- 新功能請以獨立函式（或新模組）實作，再透過 `initXxxRefs` 注入，避免循環引用
- 手機觸控控制透過 `mobileInput` 物件傳遞，不要直接存取 DOM 事件

### 遊戲物件 URL 說明

- 玩家圖片：從 YouTube 頭像 URL 遠端載入（`胖嘟嘟發電機`）
- 地板圖片：從 Bing 圖片 URL 遠端載入（`地板`）
- 猥瑣大叔圖片：從 Bing 圖片 URL 遠端載入（`猥瑣大叔`）
- 其餘素材：本地 `assets/images/` 目錄

### bossState 狀態旗標速查（蘿莉）

| 旗標 | 觸發條件 | 效果 |
|------|----------|------|
| `isBerserk` | HP < 150 | 狂暴模式開始，兩側砲台出現 |
| `isSuperInvincible` | HP 降至 50 | Boss 飛向中央，無法受傷 |
| `isUltimateBerserk` | 超級無敵完成縮放後 | 四砲台+彈跳球+隨機雷射 |
| `isExhausted` | 究極模式 7 秒後 | Boss 倒地，玩家打完剩餘 HP |
| `isHit` | 受到傷害時 | 擊退動畫硬直 |
| `isScaling` | 超級無敵放大時 | 防止多次觸發放大動畫 |

### uncleState 狀態旗標速查（猥瑣大叔）

| 旗標 | 說明 |
|------|------|
| `isAttacking` | 正在執行攻擊（大槌或召喚地刺），期間停止移動 |
| `isHit` | 受擊硬直中，擊退力減半 |
| `attackQueue` | 攻擊佇列陣列，儲存待執行的攻擊類型 |
| `hammer` | 當前大槌 Graphics 物件參考 |
| `spikes` | 當前所有地刺物件陣列 |
