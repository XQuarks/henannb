# 开发文档 · 统一之路

> 面向接手维护/二次开发的工程师。游戏本体是**一个 `index.html` 文件**（HTML+CSS+JS，约 11000 行），无构建、无依赖、无网络请求。

---

## 1. 总体架构

```
index.html
├─ <style>    全部 CSS（主题变量 --yel/--ink 等；移动端 safe-area；动效）
├─ <body>     全部 DOM（HUD / 各全屏页 overlay / canvas#cv）
└─ <script>   全部逻辑，自上而下分四大段：
   ├─ 数据层   CFG · CAMP_UNITS · SKILLS · EQ_* · RACE_TREES · SKEL · CAMPAIGNS …（纯数据表，改表即改平衡）
   ├─ 模拟层   buildMap(总入口) → buildFixedMap(M6固定图) / tryBuildMap(随机图) → update(dt)（产兵/球实体/战斗结算/AI/事件/胜负判定）
   ├─ 表现层   draw()（世界坐标渲染 + 导演标注 + 绝地反击光环）+ Sfx（WebAudio 合成音效/BGM）
   └─ UI 层    Screen Manager（SCREEN_IDS 注册表）+ 各屏幕渲染函数 + 事件绑定
```

两阶段开局：`stageBattle()` 只布图不开打（剧情对话背后就是实战地图）→ `launchBattle()` 开战。

---

## 2. 关键锚点（2026-09-08 用 `index.html` 实测复核，按行号升序；改动后请重新搜索校准）

> 数据层 → 模拟层 → 表现层/UI。带 ✅ 的是 V11 新增或本轮校准过的锚点。

| 行号 | 模块 | 说明 |
|------|------|------|
| 1223 | `CFG` 核心数值表 | growthRate/fleetSpeed/emitDur/towerCap/bossPulseR/recallWin/races |
| 1274 | `CAMP_UNITS` 16 兵种 | remote/mage/rogue/siege × 四族 |
| 1307 / 1325 | `SKILLS` / `EQ_STATS` | 技能表 / 装备词条 |
| 1487 / 1524 | 存档 `getProg` / `saveProg` | localStorage `rtu_prog_v1`；字段归一化都在 getProg 里做；saveProg 有 try/catch（存储不可写时降级） |
| 1544 / 1552 | 渐进解锁 `RACE_UNLOCK_AT` / `featOK` | 种族分段解锁 + 系统门控**唯一**判定入口 |
| 1561 | 成就 `ACH_DEFS` | 数据驱动（共 12 枚）；`prog:p=>[cur,max]` 提供进度条 |
| 1780 | ✅ **绝地反击 `lastStand`** | 触发判定在 `update` §1.5；视觉在 `draw` §5.9 |
| 1785 / 1956 / 2233 | `mulberry32` / `clipPolyW` / `genSkeleton` | 种子 RNG / 多边形裁剪（带权重版）/ 骨架生成（随机图用） |
| 1795 | 空间哈希网格 `GRID` | 分离力/近战/索敌/对撞/溅射五大热点的性能基座 |
| 2367 / 2447 / 2523 | `genCoastSpine` / `buildCoast` / `carveFixedCoast` | V11 有机海岸线管线（固定地图外形雕刻） |
| 2723 | 骨架池 `SKEL` | 模板+修饰词组合；`teach` 用 `tpl:'M6'` 固定图 |
| 2796 | 战役数据 `CAMPAIGNS` | 四族×10关：name/skel/foes/d(对话)/win/dir(导演剧本)/**outro(尾声幕)**/**midCine(局中演出)**/**revive(败局反转)** |
| 3288 | ✅ 固定地图数据 `LEVEL_MAPS` | 手写网格（h1/dusk/g1/…）+ `void` 背景语义 |
| 3382 | ✅ `resolveFixedMapId` | 关号 → 手写图 id（h1/g1/b1/d1…） |
| 3408 | ✅ `buildFixedMap` | V11 固定地图：手写网格 + `carveFixedCoast` 雕刻 + 加权 Voronoi 填充；全 40 关战役 + 教学关 |
| 3639 | `buildMap` | 建图总入口（stageBattle 调用）；`tpl:'M6'` 走 buildFixedMap，其余走 tryBuildMap；状态归位 |
| 3761 | `tryBuildMap` | 随机树状大陆（泊松+Voronoi+Chaikin，密度 ladder），仅自由对战 / 兜底 |
| 4204 | `send(from,to,keep,half)` | 半军参数 half=true → cnt=Math.round(avail/2)，始终留守≥1 |
| 4348 | `arriveBall` 战斗结算 | 消融模型/种族被动/货栈熔炉/成就钩子/**guideEvent('capture')** |
| 4618 | `update(dt)` 主模拟 | §0 网格重建 → §1 产兵 → §1.5 绝地反击 → §4.7 Boss脉冲 → §7 AI(**aiFrozen**) → §7.9 坚守计时 → §8 胜负 |
| 4868 | `aiStep` AI 决策 | 回防/破僵局/挑软柿子/多线出兵 |
| 4940 / 4953 / 4969 | `goldLeafTick` / `barnRotTick` / `tollCheck` | 经济三件套：刮金箔 / 麦仓腐烂 / 过路费（独立函数，e2e 直测） |
| 4990 | `burnBridge` 烧桥 | 按阵营过滤邻接 `adjOf(n,who)`：敌上不了桥、玩家畅通 |
| 5631 | `draw()` 渲染 | §5.6 悬停高亮 → §5.7 威胁环 → §5.9 剧情/绝地反击层 → §9 多指拖拽引导 |
| 5656 | `BIOMES` 生态皮肤 | 四族五件套（水色/地色/障碍/装饰/粒子），战役按族解析 |
| 5972 | 输入 `drags Map`（多指） | pointerId 隔离；HALF_MS=400 长按半军 + `halfMode` ½ 钮常开（dragSend 统一出口）；guideEvent('send') |
| 8682 | `tickDemolish` 拆塔 | 占领箭塔后长按 1.5s 夷为平地 |
| 8701 | 召回 `tryRecall` | 窗口 `recallWindow()`=CFG.recallWin 3s（人类树 6s）；超时点击弹反馈；成功时 guideEvent('recall') |
| 8792 | 技能 `doCast` | 施放成功 guideEvent('skill') |
| 8909 | **军师引导 `GUIDES`** | 对白卡打字机/步骤定义/事件推进/自动步 4s/完成存 prog.tut（挂载映射见 9098 附近 `{1:'l1',2:'l2',3:'l3',5:'l5',6:'l6',7:'l7'}`） |
| 8985 | `guideEvent` | 引导事件总线：send/recall/skill/capture |
| 9004 / 9085 | `stageBattle` / `launchBattle` | 引导触发接线在 launchBattle（等 dirBusy 解除） |
| 9209 | `endGame` 结算 | 奖励/掉落/**种族解锁播报**/战报时间轴 |
| 9888 / 9902 / 9936 | ✅ 导演系统 v4（暂停简报） | `dirBuildQueue` / `dirResolveFocus` / `fireDirector`；与 guide 互补 |
| 9976 / 10071 | ✅ 局中演出 `midCine` / `midTick` | 触发器→slowmo/运镜/vfx/对白/mapEdit；每关 ≤3 条，每条只触发一次 |
| 10590 | 选族 `buildFactionCards` | 🔒 锁卡渲染 + pickRace 拦截 |

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
- 兵营门控在 `buildMap` 建图前阶段统一置零（`buildFixedMap` 固定图与 `tryBuildMap` 随机图共用，未解锁类型直接不出图）。
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
- 触发接线：launchBattle 按 `{1:'l1',2:'l2',3:'l3',5:'l5',6:'l6',7:'l7'}` 映射，仅限 `human && lastMode==='camp'` 且未完成；若本关有开场导演简报则轮询等 `dirBusy=false` 再挂载。**L1/L2/L7 现已加开场导演简报（剧情渲染），故同样走"导演先讲、再进引导"**。
- 完成标记 `prog.tut[key]`；`freezeGame()`（回菜单/开新局）会清 guide 与 aiFrozen。

## 6. 固定地图（M6 · V11）

战役全 40 关 + 教学关统一走 `tpl:'M6'` 固定地图：`buildMap()` 解析到 `mapId` 后调 `buildFixedMap()`（~3408），由**手写网格 + 有机海岸雕刻 `carveFixedCoast`**（加权 Voronoi 填充）生成——布局写死、按关定制，不再依赖随机种子复现。`resolveFixedMapId(md)` 把关号映射到 `h1/g1/b1/d1…` 等手写图；自由对战无关号时不套定制图，直接走 `tryBuildMap` 随机兜底。`buildFixedMap` 失败（极少见）才退回随机建图，保证必定有图可打。

> 历史说明：`MAP_RNG`（`mulberry32`，~1785）仍在 `buildMap` 内按 `md.seed` 提供可选的种子确定性，但固定图主线已不靠它复现。改地图时先确认目标在 `buildFixedMap`（手写网格，~3408）还是 `tryBuildMap`（随机管线，~3761）——两者的数学与锚点完全不同。

---

## 7. 测试体系（无头 node，全部直跑）

所有 e2e 共用一套手法：DOM/canvas/localStorage 打桩 → 正则提取 `<script>` 内容 eval → 在 eval 作用域内驱动真实函数并断言。

| 文件 | 覆盖 |
|------|------|
| **e2e 玩法回归** | |
| `e2e-v5.js` | 解锁阈值/系统门控/兵营过滤/siege 放置/半军数值边界/绝地反击触发·倍率·一次性/guide 状态机/launchBattle 接线 |
| `e2e-flow.js` | 开机→选族→选关→对话→徽章→开战全链路 |
| `e2e-camp.js` | hostileOf 语义/同族配色/索敌跳过友军/结算/AI 不内斗 |
| `e2e-director.js` | 修饰词生效/焦点解析/同盟反水/坚守计时/斩首王帐/掠夺额度/种族专属建筑/拆塔/过路费/刮金箔/麦仓腐烂 |
| `e2e-tree.js` | 存档迁移/购买流/机制节点效果/装备叠加递减/保底稀有 |
| `e2e-draft.js` | 选族卡片/技能选择 UI/敌方阵容固定 |
| `test-gold-smoke.js` | 金币入账/军械库独立页/两段式开局/演出回调 |
| `e2e-terrain.js` | 地形模板 M0–M6 / 桥碉堡 / 挖湖 / 走廊 / 烧桥几何断言（批次 A/B/C 主回归） |
| `e2e-fixed-bridge.js` | 固定桥关（M6）桥面/碉堡/过路费/桥闩 |
| `e2e-bridge-burn.js` | 焚桥 `burnBridge` 按阵营过滤：敌上不了桥/玩家畅通/全图可达 |
| `e2e-bunker-stable.js` | 桥头碉堡稳定性：×2 抵消/选格靠敌侧/不挤占 |
| `e2e-m3-geometry.js` | 双陆桥 M3 几何/咽喉割点/基地分侧 |
| `e2e-m4.js` | 中央堡垒 M4 几何/终章落点枢纽度 |
| `e2e-boss-pulse.js` | Boss 脉冲人格化（四族：圣光/龙息/偷金/符文崩塌） |
| `e2e-difficulty.js` | 难度曲线 L9/L10 单调不降、倒挂已修 |
| **check · DOM/几何完整性** | |
| `check-ids.js` / `check-dup.js` / `check-tags.js` | DOM 引用完整性 / id 重复 / div 平衡 |
| `check-geom.js` | 几何自检（零面积/自交/开缝）；**依赖快照，须先跑 `gen-final-map.js`** |
| `check-all-levels.js` | 全 40 关 `buildFixedMap` 建图连通性遍历 |
| **gen · 预览生成** | |
| `gen-preview.js` | 批量出固定图预览图 |
| `gen-biome-preview.js` | 四族生态皮肤（BIOMES）静态预览 |
| `gen-final-map.js` | 终章/全图预览生成 |
| `gen-map-organic.js` | 有机海岸固定图预览生成 |
| **落地脚本** | |
| `apply-v11.js` | V11 固定地图落地：把手写网格注入 `buildFixedMap` |

运行：`node <文件>.js`。全绿标准 `RESULT fail=0` / `ALL PASS` / `ALL OK`。

```bash
# 几何自检有先后顺序（快照文件不入库）
node tests/gen-final-map.js && node tests/check-geom.js
```

**注意**：
- 改了核心玩法至少跑 v5+flow+camp 三件套；测试里若需要未解锁内容，先 `getProg().unlockAll=true`（等价设置页一键解锁）。
- `check-geom.js` 直接跑会抛「找不到快照 `_snaps_final.json`」——先跑 `gen-final-map.js` 生成；该脚本会在仓库根目录产出 `map-final-preview.html`，用完请自行删除，别提交。
- 当前唯一已知红灯：`e2e-terrain.js` 的「缩放锚点不动（锚点下世界点保持）」，属历史遗留，见 `ACTION-PLAN.md` §2 D-2。

## 8. 修改惯例（务必遵守）

1. **先备份**：改 `index.html` 前，**自行另存一份副本到仓库之外**（如桌面 `index.html.bak`）——仓库当前**不再保留** `index.backup-*.html` 历史快照（已于 2026-09-08 清理归档），请依赖你自己的副本或 `git log` 回退，不要再往仓库里写备份文件。
2. **数值进表**：任何可调数值放 CFG/CAMP_UNITS/SKILLS 等数据表，禁止散落硬编码。
3. **护城河自查**：新功能不得引入局内二级资源、不得把单局拉超 6 分钟、不得违背一指操作、不要求玩家读说明书（渐进提示优先）。
4. **解锁判定走 raceUnlocked/featOK**，不要散写进度比较。
5. **每加一个系统配一条业务断言**进对应 e2e 文件；修 bug 先写复现断言再修。
6. 移动端改动需自查：safe-area、命中容错、双指、DPR≤2、失焦暂停。

## 9. 性能备忘

- 空间哈希网格（GRID.cs=56）支撑分离力/近战/索敌/对撞/溅射，后期数百球不掉帧的关键，勿回退成 O(n²)。
- DPR 上限 2；渐变按尺寸缓存；HUD DOM 写值前脏检查；远程锁定目标存活期内不重扫网格。
