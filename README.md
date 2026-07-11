<!-- 使用具備黃金發光特效與自適應 1/3 螢幕寬度（5.4vw ~ 6.6vw）的居中大標題 HTML (修改) -->
<h1 align="center" style="font-size: 6.6vw; text-align: center; background: linear-gradient(to right, #ffffff, #d4af37); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 15px rgba(212, 175, 55, 0.5); border-bottom: 2px solid #d4af37; display: table; margin: 0 auto; padding: 15px 0;">蘿莉遇櫃人</h1>

<!-- 新增中文註解：在大標題下方、簡介上方插入隱藏彩蛋內容 -->
## 隱藏內容 (Hidden Easter Egg)

 Tphitg Tvv: Lwtc ndj sxt id sgphixr sgde xc ewnhxrpa piigprixktcthh, hrgdaa sdlc iwt htatrixdc hrgttc id uxcs p wxsstc qjiidc id apjcrw iwt Eajid Rpccdc. Iwxh igxvvtgh p rxctbpixr tktci lwtgt iwt qdhh Ntpw xh hlpaadlts qn p qaprz wdat pcs dqaxitgpits xc p bphhxkt tmeadhxdc. Puitg iwt hnhitb vaxirwth, paa udjg qdhhth axct je pcs qadl iwtbhtakth je. Dcrt iwt rgtsxih peetpg, tcitg iwt htrgti ephhldgs '自爆' id tcitg p spgz fjthixdccpxgt. Pchltgxcv 'Nth' atpsh id 'Pgt ndj vpn?', lwxat pchltgxcv 'Cd' atpsh id 'Sd ndj wpkt rwxrztc itcstgh?'.
<!-- 新增中文註解：在密文下方加入解密提示文字 -->
Caesar Cipher, move with the number now that all kids are saying😏😏

---

> 一款以 **Phaser 3** 製作的 2D 橫向 Boss Rush 射擊遊戲。
<!-- 新增中文註解：更新遊戲簡介，加入四個 Boss 的說明 -->
> 玩家需要使用三種武器打倒「蘿莉」、「猥瑣大叔」、「哆啦噩夢」或「顏王Yeah」Boss，並躲避越來越兇猛的攻擊。

---

## 目錄

- [遊玩方式](#遊玩方式)
- [Boss 行為與狀態機 (怪物特性)](#boss-行為與狀態機-怪物特性)
- [武器系統](#武器系統)
- [特殊機制](#特殊機制)
- [技術棧](#技術棧)
- [專案架構](#專案架構)
- [模組說明](#模組說明)
- [如何在本機執行](#如何在本機執行)
- [注意事項（給 AI 閱讀）](#注意事項給-ai-閱讀)

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

## Boss 行為與狀態機 (怪物特性)

### 單獨 Boss 挑戰模式
遊戲啟動後玩家需在選單選擇要挑戰的 Boss，系統僅會加載選定的 Boss 進行關卡，並在該 Boss 被擊敗後 **3 秒重生同一個 Boss**，不再進行原本的關卡輪替。

### 第一階段：蘿莉 Boss（HP: 600）

Boss「蘿莉」具備多種狀態模式，狀態之間依 HP 閾值自動切換。

#### 一般模式（HP ≥ 150）

- **移動 AI**
  - 追著玩家水平移動
  - 玩家跳高則 Boss 跳躍追擊
  - 落地時依落差產生衝擊波

- **攻擊招式**
  - **垂直雷射**（每 3~7 秒）：投下 1~3 道垂直雷射
  - **彈跳球**（每 15~25 秒）：丟出一顆彈跳球
  - **跳躍攻擊**（每 5~7 秒）：以拋物線跳到玩家頭上

- **受擊硬直**：被擊退 + 閃紅色，持續 stunTime ms

#### 狂暴模式（HP < 150）

HP 降至 150 以下時觸發狂暴模式。

- **外觀變化**
  - 背景換成狂暴圖
  - 新增天花板/地板（粉紅色）

- **移動 AI**
  - 飄移移動（正弦波速度）

- **攻擊招式**
  - **大型雷射砲**：畫面兩側各出現一把，左右交替射擊
  - **垂直雷射**：持續發動，頻率提高

#### 超級無敵 → 癱瘓（HP 降至 50 以下觸發，一次性）

- **超級無敵階段**
  - HP 鎖定在 49，Boss 進入無敵狀態
  - 飛向畫面中上方，放大身體
  - 發動全螢幕旋轉雷射
  - 切換為究極狂暴模式 7 秒

- **癱瘓階段**（超級無敵結束後）
  - 倒在地板，停止移動，碰到不會死亡
  - 玩家可繼續輸出剩餘 50 HP 擊敗 Boss

#### HP 閾值事件

| HP | 事件 |
|----|------|
| 600 → 150 | 一般模式 |
| < 150 | 觸發狂暴模式 |
| 降到 50 以下（一次性） | 鎖定在 49 HP，觸發超級無敵 |
| 超級無敵結束 7 秒後 | 癱瘓，玩家可打完剩餘 50 HP |
| ≤ 0 | Boss 死亡 → 3 秒後重生 |

#### 受擊機制

| 項目 | 說明 |
|------|------|
| 擊退 | 正常擊退 + 閃紅 |
| 硬直時間 | stunTime ms |

---

### 第二階段：猥瑣大叔 Boss（HP: 800）

選定大叔關卡後，猥瑣大叔直接於左側登場。大叔體型為蘿莉的 1.5 倍，具備獨立的 AI 與攻擊系統。

#### 一般模式（HP ≥ 200）

- **移動 AI**
  - 70% 機率主動衝向玩家
  - 具備跳躍追擊功能
  - 攻擊期間停止移動

- **攻擊系統**：大槌攻擊、召喚地刺、黑球衝刺共用攻擊佇列，同一時間只能執行一種攻擊，結束後延遲 0.1 秒執行下一個。

- **攻擊招式**
  - **大槌攻擊**（每 2~4 秒）：生成 T 字形黑色大槌，智慧轉向（離牆太近自動改變方向），揮下後在地面生成地刺（高度為畫面 1/4），地刺升起後維持 2 秒再降下消失
  - **召喚地刺**（每 5~6 秒）：施法期間大叔變黑（深灰色 Tint），0.2 秒後生成三組成對地刺（左右各一根，間隔 0.6 秒依序出現），地刺高度等同大叔身高、寬度為大叔一半，升起 → 停留 0.5 秒 → 降下消失，全部消失後大叔恢復外觀
  - **黑球衝刺**（每 4~5 秒）：大叔消失變成帶刺黑球（8 根刺），目標位置顯示橘色驚嘆號警示，以 900 速度直線衝向玩家，高速旋轉，碰到邊界後重新現身

- **地刺機制**
  - 耐久度：每根 10 HP，被擊中時顏色從黑色逐漸變白（線性插值），HP 歸零時破碎消失
  - 碰撞：具備物理碰撞箱（immovable），玩家碰到 → 當機，衝刺無法穿越，子彈碰到 → 子彈消失 + 地刺扣血
  - 邊界檢查：生成前檢查地圖範圍，超出邊界自動取消

#### 過載模式（HP < 200）— Overload Mode

HP 降至 200 以下時觸發過載模式，大叔進入強化型態。

- **外觀變化**
  - 螢幕震動 + 黑色閃爍
  - 隱藏原始 Sprite，切換背景為專屬背景圖
  - 生成「黑暗實體」：黑色圓角軀幹 + 深紫色紋路 + 核心十字圖案、肩膀黑刺（左右各 3 根）、頭頂黑刺（3 根向上發散）、下半身尖刺裙擺、大叔照片頭部（加深色 Tint）、紅色脈動眼睛、帶五指爪子的雙臂（含呼吸擺動動畫）
  - 碰撞箱放大（寬 1.5 倍、高 2 倍）

- **移動 AI**
  - 取消重力，改為漂浮狀態
  - 持續跟隨在玩家上方 150 像素處
  - 平滑移動（速度 200），移動速度增加 50%

- **攻擊系統**：每 1 秒從攻擊池隨機選擇一種攻擊，冷卻時間在攻擊「完全結束」後才開始計算，正在攻擊時不計算冷卻。

- **攻擊招式**
  - **超級地刺**（Super Spike）：雙手高舉 + 往上飄移 150px → 橘色警告刺閃爍覆蓋地面（預留安全區 = 玩家寬度 1.5 倍）→ 2 秒後暗紅色超級地刺從地面升起（Back.easeOut 彈性效果），高度為地板到牆面 4/5，HP = 30，無敵穿越也無法閃過 → 停留 1.5 秒後降下
  - **超級刺球**（Super Spike Ball）：蓄力雙手內縮（400ms）→ 釋放雙手打開（200ms）→ 從中心往 5 個向下角度各發射 1 顆刺球（4 黑 + 1 暗紅），速度 400~700，碰邊界消失。暗紅色特殊刺球碰邊界時爆炸，往 8 方向散射碎刺（速度 600）
  - **三角形導彈**（Triangle Missile）：將身上三角形拆卸轉為導彈，以 400~600 速度飛向玩家（持續微追蹤），具備 2px 白色描邊，飛行 1.5 秒後消失並在 0.1 秒內飛回身體

#### HP 閾值事件

| HP | 事件 |
|----|------|
| 800 → 200 | 一般模式 |
| < 200 | 觸發過載模式 |
| ≤ 0 | Boss 死亡 → 3 秒後重生 |

#### 受擊機制

| 項目 | 一般模式 | 過載模式 |
|------|----------|----------|
| 擊退力減免 | ÷ 2 | ÷ 4 |
| 攻擊中受擊 | 暫停移動、閃紅 | 僅閃紅（不打斷攻擊） |
| 移動方式 | 地面追蹤 | 空中漂浮跟隨 |

---

<!-- 新增中文註解：在 README.md 中新增第三階段：哆啦噩夢 Boss 說明 -->
### 第三階段：哆啦噩夢 Boss（HP: 400）

哆啦噩夢體型普通，具備獨特的領域展開能力，善於逃跑並使用遠程大威力武器壓制玩家。

#### 一般模式

- **移動 AI**
  - 主動逃離玩家（若玩家在左則往右移動，反之亦然）
  - 若高低落差合適，在落地時會高跳（跳躍力 -825）以躲避玩家

- **攻擊招式**（每 2 秒隨機從攻擊池選擇一種，在一般領域下）：
  - **狙擊攻擊 (60%)**：主動瞄準玩家並顯示紅色虛線彈道預警，短暫延遲後發射高速狙擊雷射。
  - **火箭筒攻擊 (20%)**：朝玩家發射大範圍的高速火箭彈。
  - **瞬移太陽球 (20%)**：向玩家投擲一顆藍色傳送引導球，引導成功後瞬移到該處。

- **領域展開 (Domain Expansion)**：
  - **觸發條件**：Boss 登場或重生 0.5 秒後自動釋放。
  - **視覺效果**：Boss 位置發射擴散藍色圓圈，隨後全螢幕渲染成 20% 透明度的藍色覆蓋層。
  - **影響效果**：場景重力與玩家、子彈的速度減半（包括已射出的彈幕），使彈道變為慢速漂浮。

#### 真領域展開 (HP ≤ 125) — True Domain Expansion

當血量降至 125 以下時觸發真領域展開，進入究極對決型態。

- **過場動畫**
  - 暫停全場所有攻擊與玩家移動，Boss 處於無敵狀態。
  - 播放原領域崩壞破碎的故障特效，隨後覆蓋深藍/紫色漸變層與新背景。
- **真領域效果**
  - 恢復遊戲後，Boss 取消「傳送球」攻擊，改為 **75% 狙擊、25% 火箭筒**。
  - 召喚 **2 個鏡像分身**（分身帶有獨立血量 UI 條），與本體一同進行逃跑並使用狙擊/火箭筒瘋狂壓制玩家。
  - 當分身血量歸零時，播放消散特效並消失。

#### HP 閾值事件

| HP | 事件 |
|----|------|
| 400 → 125 | 一般模式 + 自動維持「領域展開」 |
| ≤ 125 | 觸發「真領域展開」過場，召喚 2 個分身加入戰鬥 |
| ≤ 0 | Boss 死亡 → 3 秒後重生 |

#### 受擊機制

| 項目 | 說明 |
|------|------|
| 受擊效果 | 閃紅、輕微後退、相機抖動 |
| 無敵狀態 | 在「真領域展開」過場動畫期間為完全無敵 |

---

<!-- 新增中文註解：在 README.md 中新增第四階段：顏王 Yeah Boss 說明 -->
### 第四階段：顏王 Yeah Boss（HP: 1000）

顏王 Yeah 擁有極高的血量與獨特的神聖魔法能量機制，不具備常規招式，但玩家必須透過收集能量球來應對其必殺絕招。

#### 運作機制

- **移動 AI**
  - 落地時會主動計算玩家方向，往玩家方向進行連續高跳追逐（跳躍力 -583）。
  - 水平移動受限：只能在跳躍於空中的時候進行水平移動，在地上時水平速度為 0，落地後隨即再次起跳，形成連續蹦跳的鬼畜移動。

- **能量球生成**
  - 登場後，Boss 每 0.5 秒會在畫面隨機位置定點生成 3 顆黃色能量球（最多同時存在 8 顆）。
  - 能量球半徑 12px，具有白色邊框與呼吸微縮放動畫。

- **神盛魔法能量 (holyEnergy)**
  - 玩家必須主動移動去「重疊碰撞」黃色能量球以收集它們，每收集一顆會引發畫面金黃色閃爍。
  - 總共需要收集 **8 顆** 才能填滿 100% 能量條。

- **神聖魔法必殺動畫 (Holy Cinematic)**
  - **觸發條件**：玩家收集滿 8 顆能量球（能量條 100%）。
  - **必殺過程**：
    1. **凍結世界**：世界靜止，玩家與 Boss 凍結移動，玩家進入無敵狀態，清空場上剩餘的球。
    2. **祈禱文字**：畫面淡入為全黑，並在正中央以極大金黃色字體逐行顯示五句祈禱文（最後一行為特大金色光暈字「顏值崩壞」並特寫放大 1.5 倍）。
    3. **神聖光束**：黑幕與文字淡出，天降金色巨型魔法陣光束持續轟擊 4 秒，隨後彈出選擇畫面，提供「當機」與「死亡」兩個按鈕給玩家。<!-- 新增中文註解：更正為彈出死亡與當機選擇畫面 -->

<!-- 新增中文註解：已移除顏王隱藏彩蛋明文，保持其僅以密文形式出現在 README 頂端 -->
#### HP 閾值事件

| HP | 事件 |
|----|------|
| 1000 | 初始狀態，開始定時生成能量球 |
| ≤ 0 | Boss 死亡 → 3 秒後重生 |

#### 受擊機制

| 項目 | 說明 |
|------|------|
| 受擊效果 | 受到傷害時會閃紅、輕微後退、相機抖動 |

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

### 適應性縱橫比填滿 (物件不拉伸)
遊戲畫面採用適應性比例縮放策略，固定邏輯高度為 `720`，寬高比則根據瀏覽器視窗自動向兩側延伸計算（至少 `1280`）。此做法能讓遊戲在任何裝置上均完美滿版，且所有角色、武器與子彈皆維持原始等比例（不會變扁或變胖），只將左右空間與地板向外拉長。

### 全域文字防截斷修復 (Text Padding)
為遊戲中所有 HUD 文字（大標題、選卡標題、角色名字、子彈數、Boss 血量文字等）加上適當的 `padding` 內距緩衝。此舉徹底修復了 Phaser 在部分平台或粗描邊（stroke）下造成字頂與邊緣被 Canvas 邊界截斷遮蓋的排版缺陷。

### 當機機制（BSOD）轉場重構
- 玩家被擊中當機後，畫面的進度條會在 **3 秒** 內從 0% 跑至 100%。
- 當達到 100% 顯示「錯誤」後，延遲 **0.5 秒** 執行以下動作：
  1. **文字全數消失**：隱藏所有字體與 QR code 圖片。
  2. **強迫全螢幕 (僅一次)**：整個遊戲生命週期內強迫進入全螢幕一次。
  3. **切換電視背景**：背景切換為彩色電視畫面。

---

## 技術棧

| 項目 | 內容 |
|------|------|
| 遊戲引擎 | [Phaser 3.55.2](https://phaser.io/) (CDN 載入) |
| 語言 | 原生 JavaScript（ES Module） |
| 物理引擎 | Phaser Arcade Physics（重力 y: 1000） |
| 解析度 | 動態邏輯寬度 × 固定高度 720，FIT 等比縮放 |
| 模組系統 | ES Module（需 HTTP 伺服器，例如 VS Code Live Server） |
| 樣式 | 原生 CSS（`style.css`） |

---

## 專案架構

```
curseforge/
├── index.html              # 遊戲入口 HTML（載入 Phaser CDN + main.js）
├── readme.html             # 說明文件動態渲染網頁 (動態編譯 README.md)
├── main.js                 # 遊戲設定與 Phaser.Game 初始化
├── style.css               # 全域樣式（包含 BSOD 藍屏畫面 CSS）
├── assets/
│   └── images/             # 遊戲圖片素材
│       ├── shabi.png           # 子彈貼圖
│       ├── 羅莉抓人.png        # Boss「蘿莉」Sprite
│       ├── 蘿莉過關圖.png      # 狂暴模式背景圖
│       ├── qr code.png         # 當機畫面 QR Code
│       ├── 彩色電視.png        # 當機完成後背景圖
│       └── uncleOverloadBg.webp # 猥瑣大叔過載模式背景圖 (本地資源)
├── scenes/
│   ├── MainMenuScene.js    # 主選單與 Boss 選擇場景 (金色高質感動態界面)
│   └── GameScene.js        # 主遊戲場景（協調所有模組）
├── player/
│   ├── PlayerController.js # 玩家移動、衝刺與無敵邏輯
│   └── DashEffects.js      # 衝刺粉塵視覺效果
├── boss/
│   ├── LoliStateMachine.js # 蘿莉 Boss AI 狀態機（HP、狀態切換、傷害處理）
│   ├── LoliAttacks.js      # 蘿莉 Boss 攻擊實作（衝擊波、雷射、彈跳球、跳躍攻擊）
│   ├── UncleStateMachine.js# 猥瑣大叔狀態機（HP、一般/過載模式切換、AI 移動）
│   ├── UncleAttacks.js     # 猥瑣大叔攻擊系統（大槌、地刺、黑球衝刺、超級地刺、超級刺球）
│   ├── DoraStateMachine.js  # 哆啦噩夢狀態機（HP、領域展開、真領域展開過場、分身召喚） (新增中文註解：加入哆啦狀態機)
│   ├── DoraAttacks.js       # 哆啦噩夢攻擊實作（狙擊雷射、火箭筒、瞬移太陽球） (新增中文註解：加入哆啦攻擊)
│   ├── YeahStateMachine.js  # 顏王Yeah狀態機（HP、連續跳躍AI、黃色能量球生成與收集） (新增中文註解：加入顏王狀態機)
│   └── YeahAttacks.js       # 顏王Yeah攻擊實作（結構佔位符） (新增中文註解：加入顏王攻擊)
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
- 動態計算並建立與瀏覽器一致的 Phaser 邏輯解析度。
- 引入並註冊所有場景，以 `MainMenuScene` 作為第一入口啟動。

### `scenes/MainMenuScene.js`
- **主選單**：金色漸變發光大標題、金色動態粒子背景、Glassmorphism 金色描邊按鈕。
- **Boss 選擇**：展示等比例頭像選卡，提供單獨 Boss 重生戰鬥模式的選擇。

### `readme.html`
- 利用 Marked.js 與 GitHub Markdown CSS 動態載入並編譯 `README.md`，提供玩家高質感的說明網頁直觀檢視。

### `scenes/GameScene.js`
- 遊戲主場景，實作 `preload()` / `create()` / `update()` 三階段
- **分支加載**：在 `init` 階段接收選定 Boss。若為大叔局，則完全隱藏並關閉蘿莉（包含其雷射/海嘯/彈跳球計時器）。
- **重複重生**：大叔或蘿莉被擊敗後 3 秒，重生同一個 Boss，不再自動進行輪替。

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

### `boss/UncleStateMachine.js`
- 猥瑣大叔的狀態管理模組，維護 `uncleState` 全域狀態物件
- `handleUncleHit()`：處理受傷、擊退、HP 閾值觸發（< 200 時進入過載模式）
- `enterOverloadMode()`：進入過載模式的完整流程（切換為本地 `uncleOverloadBg.webp` 背景、隱藏原 Sprite、建立黑暗實體容器）
- `updateUncleStateMachine()`：每幀更新 AI 移動（一般模式地面追蹤 / 過載模式漂浮跟隨）
- `respawnUncle()`：重置大叔的所有狀態與碰撞箱，並清理過載背景

### `boss/UncleAttacks.js`
- 猥瑣大叔 Boss 的所有攻擊實作
- **一般模式攻擊**：大槌攻擊、召喚地刺、黑球衝刺
- **過載模式攻擊**：超級地刺、超級刺球、三角形導彈（自帶 2px 白色描邊，在暗色背景下更容易被玩家看清）

<!-- 新增中文註解：在模組說明中新增哆啦噩夢與顏王Yeah的檔案說明 -->
### `boss/DoraStateMachine.js`
- 控制哆啦噩夢「避開玩家逃跑」的移動 AI 與跳躍避險邏輯。
- 負責領域展開（全螢幕藍色減速渲染）與真領域展開（HP ≤ 125 時召喚 2 個帶血條分身一同戰鬥）。

### `boss/DoraAttacks.js`
- 哆啦噩夢的所有招式實作（狙擊雷射、火箭筒、瞬移太陽球）與每 2 秒發動一次的攻擊排程器。

### `boss/YeahStateMachine.js`
- 負責顏王Yeah 的血量、受傷/死亡、以及「空中才能水平移動」的蹦跳追捕 AI。
- 負責每 0.5 秒隨機在畫面上定點生成 3 顆黃色能量球。

### `boss/YeahAttacks.js`
- 顏王Yeah 攻擊模組的結構佔位符。

### `weapons/WeaponManager.js`
- 維護三把武器的彈藥量、射速、換彈時間
- `fireMG` / `fireSG` / `fireSN`：各武器的射擊實作
- `triggerReload()`：執行換彈（彈藥空時自動觸發）

### `ui/HUD.js`
- 顯示 Boss 血量文字（畫面正上方中間，已加上 padding 防止描邊截斷）
- 每幀繪製玩家衝刺能量條（左上角）

### `ui/MobileControls.js`
- 偵測手機裝置建立虛擬搖桿與動作按鈕，並在視窗縮放時自動重新定位控制項。

### `ui/CrashScreen.js`
- 玩家死亡時觸發 3 秒修復動畫、0.5秒後文字全數隱藏、強迫全螢幕一次、轉至彩色電視畫面。

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
    ├── boss/UncleStateMachine.js
    │   └── boss/UncleAttacks.js       （import 攻擊啟停與清理函式）
    ├── boss/UncleAttacks.js
    │   └── boss/UncleStateMachine.js  （只 import uncleState）
    ├── boss/DoraStateMachine.js       （新增中文註解：加入哆啦噩夢依賴關係）
    │   ├── boss/DoraAttacks.js
    │   └── ui/HUD.js
    ├── boss/DoraAttacks.js
    │   └── boss/DoraStateMachine.js
    ├── boss/YeahStateMachine.js       （新增中文註解：加入顏王Yeah依賴關係）
    │   └── scenes/GameScene.js        （呼叫 triggerHolyCinematic 必殺動畫）
    └── boss/YeahAttacks.js
```

> ⚠️ `LoliAttacks.js` 與 `LoliStateMachine.js` 之間存在**部分循環引用**。
> `LoliAttacks` 只 import `bossState`（純資料物件），
> `LoliStateMachine` import `LoliAttacks` 的函式。
> 避免循環依賴的方式是透過 `initAttackRefs()` / `initBossRefs()` 在 `create` 階段注入物件參考，而非直接 import。

> ⚠️ `UncleAttacks.js` 與 `UncleStateMachine.js` 之間也存在**部分循環引用**。
> `UncleAttacks` 只 import `uncleState`（純資料物件），
> `UncleStateMachine` import `UncleAttacks` 的攻擊啟停與清理函式。
> 同樣透過 `initUncleRefs()` / `initUncleStateRefs()` 注入共享參考。

### 共享物件注入模式

四個 Boss 模組均使用 `refs` 模式：

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
initUncleStateRefs({ uncle, uncleHPText, onUncleDeath, player });
initDoraStateRefs({ dora, player, doraHPText, clone1HPText, clone2HPText, platforms, mgBullets, sgBullets, snBullets, onDoraDeath }); // 新增中文註解：注入哆啦狀態參考
initDoraAttackRefs({ dora, player, doraHPText, clone1HPText, clone2HPText, platforms }); // 新增中文註解：注入哆啦攻擊參考
initYeahStateRefs({ yeah, yeahHPText, yeahEnergyBar, yeahEnergyBalls, onYeahDeath }); // 新增中文註解：注入顏王狀態參考
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
| `yeahEnergyBalls` | 顏王黃色能量球 | 碰玩家消失，累積 8 顆觸發神聖魔法必殺 (新增中文註解：物理群組表格加入能量球) |

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
| `isAttacking` | 正在執行攻擊（大槌、地刺、黑球衝刺或過載攻擊），期間停止移動 |
| `isHit` | 受擊硬直中，擊退力減半（過載模式下再減半） |
| `isOverload` | 是否處於過載模式（HP < 200 時觸發） |
| `overloadContainer` | 過載模式的一體化視覺容器（Container） |
| `overloadLimbs` | 過載模式的四肢引用 `{ armL_Group, armR_Group }` |
| `moveSpeedMultiplier` | 移動速度倍率（過載模式為 1.5） |
| `attackQueue` | 攻擊佇列陣列，儲存待執行的攻擊類型 |
| `hammer` | 當前大槌 Graphics 物件參考 |
| `spikes` | 當前所有地刺物件陣列 |

<!-- 新增中文註解：在注意事項新增哆啦與顏王的狀態旗標速查表格 -->
### doraState 狀態旗標速查（哆啦噩夢）

| 旗標 | 說明 |
|------|------|
| `isDomainExpanded` | 是否已展開一般領域（登場 0.5 秒後自動啟動，玩家/子彈/重力速度減半） |
| `isTrueDomain` | 是否處於真領域展開狀態（HP ≤ 125 時啟動） |
| `isTrueDomainTransition` | 是否處於真領域展開的過場動畫（此時無敵、全螢幕靜止） |
| `isHit` | 是否處於受擊硬直中（會閃紅與後退） |
| `clones` | 儲存 2 個真領域召喚分身 `{ clone1, clone2 }` 的物理 Sprite 與狀態引用 |

### yeahState 狀態旗標速查（顏王Yeah）

| 旗標 | 說明 |
|------|------|
| `holyEnergy` | 當前的神聖魔法能量值 (0 ~ 100) |
| `collectedBalls` | 玩家目前已收集到的黃色能量球數量 (最高 8 顆，集滿觸發必殺) |
| `isHit` | 是否處於受擊硬直中（閃紅、後退、震動） |




