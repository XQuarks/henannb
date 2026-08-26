# 开发文档 · 统一之路

> 面向接手维护/二次开发的工程师。游戏本体是**一个 `index.html` 文件**（HTML+CSS+JS，约 8000 行），无构建、无依赖、无网络请求。

---

## 1. 总体架构

```
index.html
├─ <style>    全部 CSS（主题变量 --yel/--ink 等；移动端 safe-area；动效）
├─ <body>     全部 DOM（HUD / 各全屏页 overlay / canvas#cv）
└─ <script>   全部逻辑，自上而下分四大段：
   ├─ 数据层   CFG · CAMP_UNITS · SKILLS · EQ_* · RACE_TREES · SKEL · CAMPAIGNS …（纯数据表，改表即改平衡）
   ├─ 模拟层   buildMap → update(dt)（产兵/球实体/战斗结算/AI/事件/胜负判定）
   ├─ 表现层   draw()（世界坐标渲染 + 导演标注 + 绝地反击光环）+ Sfx（WebAudio 合成音效/BGM）
   └─ UI 层    Screen Manager（SCREEN_IDS 注册表）+ 各屏幕渲染函数 + 事件绑定
```

两阶段开局：`stageBattle()` 只布图不开打（剧情对话背后就是实战地图）→ `launchBattle()` 开战。

---

## 2. 关键锚点（行号为 v5 版本近似值，改动后请以搜索为准）

| 模块 | 行号 | 说明 |
|------|------|------|
 | 存档 `getProg/saveProg` | ~1270 | localStorage `rtu_prog_v1`；字段归一化都在 getProg 里做 |
| 渐进解锁 `RACE_UNLOCK_AT / featOK` | ~1340 | 种族分段解锁 + 系统门控唯一判定入口 |
| 成就 `ACH_DEFS` | ~1358 | 数据驱动；`prog:p=>[cur,max]` 提供进度条 |
| `CFG` 核心数值表 | ~1045 | growthRate/fleetSpeed/emitDur/towerCap/bossPulseR/recallWin/races |
| `CAMP_UNITS` 16 兵种 | ~1081 | remote/mage/rogue/siege × 四族 |
| `SKILLS` / `EQ_STATS` | ~1114 / ~1132 | 技能表 / 装备词条 |
| 空间哈希网格 GRID | ~1549 | 分离力/近战/索敌/对撞/溅射五大热点的性能基座 |
| **绝地反击状态 `lastStand`** | ~1537 | 触发判定在 update §1.5；视觉在 draw §5.9 |
| 骨架池 `SKEL` | ~2001 | 模板+修饰词组合；教学关 `tutBridge` 带 seed |
| 战役数据 `CAMPAIGNS` | ~2048 | 四族×10关：name/skel/foes/d(对话)/win/dir(导演剧本) |
| `buildMap / tryBuildMap` | ~2297 / ~2347 | 建图管线；兵营门控与放置顺序在此 |
| `send(from,to,keep,half)` | ~2618 | 半军参数 half=true → cnt=Math.round(avail/2)，始终留守≥1 |
| `arriveBall` 战斗结算 | ~2753 | 消融模型/种族被动/货栈熔炉/成就钩子/**guideEvent('capture')** |
| `aiStep` AI 决策 | ~3200 | 回防/破僵局/挑软柿子/多线出兵 |
| `update(dt)` 主模拟 | ~3271 | §0 网格重建 → §1 产兵 → §1.5 绝地反击 → §4.7 Boss脉冲 → §7 AI(**aiFrozen**) → §7.9 坚守计时 → §8 胜负 |
| `draw()` 渲染 | ~3785 | §5.6 悬停高亮 → §5.7 威胁环 → §5.9 剧情/绝地反击层 → §9 多指拖拽引导 |
| 输入 `drags Map`（多指） | ~6230 | pointerId 隔离；HALF_MS=400 长按半军 + `halfMode` ½ 钮常开（dragSend 统一出口）；guideEvent('send') |
| 召回 `tryRecall` | ~6315 | 窗口 `recallWindow()`=CFG.recallWin 3s（人类树 6s）；超时点击弹反馈；成功时 guideEvent('recall') |
| 技能 `doCast` | ~6290 | 施放成功 guideEvent('skill') |
| **军师引导 GUIDES/guide** | ~6470 | 对白卡打字机/步骤定义/事件推进/自动步 4s/完成存 prog.tut |
| 导演系统 v4（暂停简报） | ~7212 | dirBuildQueue/fireDirector/dirResolveFocus；与 guide 互补 |
| `stageBattle/launchBattle` | ~6504/~6580 | 引导触发接线在 launchBattle（等 dirBusy 解除） |
| `endGame` 结算 | ~6660 | 奖励/掉落/**种族解锁播报**/战报时间轴 |
| 选族 `buildFactionCards` | ~7717 | 🔒 锁卡渲染 + pickRace 拦截 |

---

## 3. 数据结构与存档

```js
// localStorage["rtu_prog_v1"]
{
  gold, skill,
  uni:   { hp,atk,rate,move,prod,cap,start },      // 军政厅强化等级
  drill: 0..2, drillPick,                           // 步兵操典
  races: { human:{t:{node:lv}…}, goblin:{…}, dragon:{…}, dwarf:{…} }, // 种族分支树
  equips:[{id,rar,stat,val}], load:[6×id|null],     // 背包+穿戴
  camp:  { human:1..10, goblin:…, dragon:…, dwarf:… },   // 各族战役进度（stage=当前可挑战关）
  ach:   { id:timestamp }, stats:{ kills,wins,winStreak },
  unlockAll: false,                                  // 设置页一键解锁
  tut:    { l2:1, l3:1, … }                          // 可操控引导完成标记
}
```

兼容规则：旧档缺字段一律在 `getProg()` 归一化补齐，不做破坏性迁移。

---

## 4. 渐进解锁实现要点

- **唯一判定入口**：`raceUnlocked(r)` / `featOK(f)`。所有 UI 与建图过滤都走这两个函数，不要在调用点手写进度比较。
- 门控只作用于 `lastMode==='camp'`（自由对战全开放）；`unlockAll` 一票通过。
- 兵营门控在 `tryBuildMap` 的 counts 计算之后统一置零——未解锁类型直接不出图。
- 重械营放置排在 campPool 消耗顺序**第一位**：小图中立格不足时最后一位会被挤掉（v5 前 siege 甚至从未被放置——循环漏列，已修）。
- 种族解锁播报在 `endGame` 胜利分支：对比 saveCampaign 前后人类进度跨过 `RACE_UNLOCK_AT` 阈值即弹 Toast。

## 5. 可操控引导（guide）vs 导演简报（director）

| | director（v4 已有） | guide（v5.1 军师对白） |
|---|---|---|
| 形态 | 暂停战斗 + NPC 对白 + 镜头推拉 | 不暂停、可操作；「军师」对白卡（打字机）+ 金圈标注 |
| 用途 | 剧情演出、特殊规则介绍 | 操作教学（半军/召回/技能/占营） |
| 数据 | `CAMPAIGNS[r].dir[]` 内联剧本 | `GUIDES{key:steps[]}` |
| 推进 | 点击对白 | 玩家完成动作（wait 事件）；无等待句 4s 自动步，点击卡补全打字/跳过信息句 |
| AI | 暂停中自然冻结 | 运行但 `aiFrozen=true` 冻结决策 |

- 事件源：endDrag→`send`、tryRecall→`recall`、doCast→`skill`、arriveBall 翻色→`capture{node}`。
- 触发接线：launchBattle 按 `{2:'l2',3:'l3',5:'l5',6:'l6',7:'l7'}` 映射，仅限 `human && lastMode==='camp'` 且未完成；若本关有开场导演简报则轮询等 `dirBusy=false` 再挂载。
- 完成标记 `prog.tut[key]`；`freezeGame()`（回菜单/开新局）会清 guide 与 aiFrozen。

## 6. 固定地图（seed）

`mods.seed != null` 时 `MAP_RNG = mulberry32(seed)`，建图路径上所有随机（genSkeleton/rand/shuffleArr/capTiers）全部走 MAP_RNG → **同一设备同一视口下布局完全确定**。教学关 L2 使用 `SKEL.tutBridge {tpl:M3, mods:{seed:20260826}}`。

---

## 7. 测试体系（无头 node，全部直跑）

所有 e2e 共用一套手法：DOM/canvas/localStorage 打桩 → 正则提取 `<script>` 内容 eval → 在 eval 作用域内驱动真实函数并断言。

| 文件 | 覆盖 |
|------|------|
| `e2e-v5.js` | 解锁阈值/系统门控/兵营过滤/siege 放置/seed 确定性/半军数值边界/绝地反击触发·倍率·一次性/guide 状态机/launchBattle 接线 |
| `e2e-flow.js` | 开机→选族→选关→对话→徽章→开战全链路 |
| `e2e-camp.js` | hostileOf 语义/同族配色/索敌跳过友军/结算/AI 不内斗 |
| `e2e-director.js` | 修饰词生效/焦点解析/同盟反水/坚守计时/斩首王帐/掠夺额度/种族专属建筑 |
| `e2e-tree.js` | 存档迁移/购买流/机制节点效果/装备叠加递减/保底稀有 |
| `e2e-draft.js` | 选族卡片/技能选择 UI/敌方阵容固定 |
| `test-gold-smoke.js` | 金币入账/军械库独立页/两段式开局/演出回调 |
| `check-ids / check-dup / check-tags` | DOM 引用完整性 / id 重复 / div 平衡 |

运行：`node <文件>.js`。全绿标准 `RESULT fail=0` / `ALL PASS` / `ALL OK`。
**注意**：改了核心玩法至少跑 v5+flow+camp 三件套；测试里若需要未解锁内容，先 `getProg().unlockAll=true`（等价设置页一键解锁）。

## 8. 修改惯例（务必遵守）

1. **先备份**：改 index.html 前 `Copy-Item index.html index.backup-YYYYMMDD-pN.html`（N=当日序号）。
2. **数值进表**：任何可调数值放 CFG/CAMP_UNITS/SKILLS 等数据表，禁止散落硬编码。
3. **护城河自查**：新功能不得引入局内二级资源、不得把单局拉超 6 分钟、不得违背一指操作、不要求玩家读说明书（渐进提示优先）。
4. **解锁判定走 raceUnlocked/featOK**，不要散写进度比较。
5. **每加一个系统配一条业务断言**进对应 e2e 文件；修 bug 先写复现断言再修。
6. 移动端改动需自查：safe-area、命中容错、双指、DPR≤2、失焦暂停。

## 9. 性能备忘

- 空间哈希网格（GRID.cs=56）支撑分离力/近战/索敌/对撞/溅射，后期数百球不掉帧的关键，勿回退成 O(n²)。
- DPR 上限 2；渐变按尺寸缓存；HUD DOM 写值前脏检查；远程锁定目标存活期内不重扫网格。
