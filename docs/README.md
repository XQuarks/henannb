# 文档索引 · 统一之路

> 玩法说明、运行方式、测试命令见仓库根目录的 `README.md`，本文只做**文档导航**，不重复正文。

## 先看哪一份？

| 我想…… | 打开 |
|---|---|
| 知道接下来做什么、进度到哪了 | **`ACTION-PLAN.md`** |
| 查玩法规则与数值 | `GAMEPLAY.md` |
| 改代码 / 找函数在哪一行 | `DEVELOPMENT.md` |
| 了解下一阶段的关卡与新机制方案 | `GAME-UPDATE-PLAN.md` |
| 了解地图与四族生态的设计思路 | `MAP-REDESIGN-PROPOSAL.md` |
| 了解 40 关的剧情盘点与历史批次 | `LEVEL-DESIGN-PROPOSAL.md` |

## 文档清单

| 文档 | 内容 | 读者 | 更新频率 |
|------|------|------|---------|
| `ACTION-PLAN.md` | **进度看板**：已落地/未落地实测清单、技术债、P0→P4 计划表、文档整理记录 | 黎总 / 开发 | 每批做完更新一次 |
| `GAMEPLAY.md` | 完整玩法说明：核心循环、四族/16 兵种、技能装备、战役与解锁线、全部胜利条件 | 玩家 / 策划 | 玩法改动时 |
| `DEVELOPMENT.md` | 代码架构导览（含行号锚点）、数据表位置、存档结构、测试体系、修改惯例 | 开发者 | 结构改动时 |
| `GAME-UPDATE-PLAN.md` | 下一阶段总方案：三族 40 关重构去同质化、新地形/兵种/建筑、叙事演出系统（机制编号 ①~㉔） | 策划 / 开发 | 方案拍板时 |
| `HUMAN-CAMPAIGN-REDESIGN.md` | 人类线 10 关重设计：L1 教学 / L2 堡垒关（H-2 关隘堡垒）、一关一机制一关一色、实施批次 H-A→H-C | 黎总 / 策划 | 拍板与每批完成时 |
| `AI-DESIGN-PROPOSAL.md` | 敌人与友军 AI 升级：指挥官人格（A）/ 战术动作（B）/ **机制意识（C）**/ 友军互动（D）/ 意图可读（E）/ 士气（F） | 策划 / 开发 | 拍板与每批完成时 |
| `MAP-REDESIGN-PROPOSAL.md` | 地图整体重设计：大陆架轮廓层 S1~S6、四族生态皮肤、地理叙事线、交互与导航（批次 A–D） | 策划 / 黎总 | 设计拍板时 |
| `LEVEL-DESIGN-PROPOSAL.md` | 40 关剧情盘点与「承诺 vs 兑现」分析，历史批次（第一批~第三批）实施记录 | 策划 / 开发 | 批次完成时 |

## 阅读顺序建议

1. 新人接手：`README.md` → `DEVELOPMENT.md` → `ACTION-PLAN.md`
2. 要做**人类线**关卡：`ACTION-PLAN.md` → **`HUMAN-CAMPAIGN-REDESIGN.md`** → `GAMEPLAY.md`
3. 要做**其他三族**关卡：`ACTION-PLAN.md` → `GAME-UPDATE-PLAN.md` → `LEVEL-DESIGN-PROPOSAL.md`
4. 要改地图观感：`MAP-REDESIGN-PROPOSAL.md` → `DEVELOPMENT.md §6`（固定地图管线）

## 约定

- **代码为准**：文档与 `index.html` 冲突时，以代码为准，并回来改文档（尤其是关卡名、数值、行号锚点）。
- **零死链**：文档里不引用已被清理的文件（如 `index.backup-*.html`、各类预览 HTML）。
- **状态四段块**：每份文档开头写「概述 / 状态 / 读者 / 关联」，方便其他 AI 打开即懂。
- 删/合并任何文档前，先出方案由黎总拍板。
