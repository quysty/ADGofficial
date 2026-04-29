# FRONTEND_CLEANUP_SUMMARY.md

## 作用

本文件记录 ANU Dorm Guide 当前前端工程整理阶段的总结。

它不是功能说明书，而是当前项目结构、已完成事项、剩余风险和下一阶段路线的状态记录。

---

## 当前阶段结论

当前项目已经从 AI 拼装式静态前端，整理为具有基础工程边界的静态前端项目。

已经完成的关键变化包括：

- Git 版本管理和可回退机制
- 基础工程文档
- 宿舍数据集中化
- 首页核心 UI 组件拆分
- 首页路径选项配置迁移
- Information 页面数据化
- 数据检查脚本
- 图片路径统一迁移到 assets/images/
- Legacy data.js 删除
- Explore 重构计划
- 测试清单和维护记录

当前项目仍然不是完整平台级项目，也不是后端项目。它仍然是静态前端项目，但已经具备继续扩展的基础。

---

## 已完成的工程安全层

### Git 工作流

已经完成：

- 初始化 Git
- 保存重构前可运行版本
- 添加 .gitignore
- 清理 .DS_Store
- 每个稳定阶段单独 commit
- 形成可回退的版本历史

当前规则：

每次新阶段开始前，先运行：

git status

必须在 clean 状态下开始。

每次修改后，先测试，再 commit。

---

## 已完成的文档体系

当前文档包括：

- PROJECT_MAP.md
- DATA_SCHEMA.md
- BUG_LOG.md
- ROADMAP.md
- CHANGELOG.md
- TESTING_CHECKLIST.md
- IMAGE_PATH_MIGRATION_PLAN.md
- EXPLORE_REFACTOR_PLAN.md
- FRONTEND_CLEANUP_SUMMARY.md

这些文档分别负责：

- 项目结构说明
- 数据字段说明
- Bug 与技术债记录
- 未来路线规划
- 稳定修改记录
- 手动测试流程
- 图片迁移计划与状态
- Explore 重构计划
- 当前阶段总结

维护规则：

以后每完成一个稳定阶段，都应更新 CHANGELOG.md。  
如果涉及数据结构，更新 DATA_SCHEMA.md。  
如果涉及文件职责，更新 PROJECT_MAP.md。  
如果产生 bug 或技术债，更新 BUG_LOG.md。  
如果改变未来路线，更新 ROADMAP.md。

---

## 已完成的数据结构整理

### 宿舍主数据

当前唯一宿舍主数据文件：

src/data/dorms.js

旧文件已删除：

data.js

当前数据暴露方式：

window.DORM_DATA

当前已登记宿舍：

- Lena Karmel Lodge
- Warrumbul Lodge
- Wright Hall
- Kinloch Lodge
- Davey Lodge

其中：

- Lena / Warrumbul / Wright 当前可用于首页和 Information
- Kinloch / Davey 当前作为隐藏 map-linked placeholder records

当前可见性字段：

- isHomeCandidate
- isInformationVisible
- isMapLinked

当前规则：

首页只读取 isHomeCandidate 不等于 false 的宿舍。  
Information 页面只读取 isInformationVisible 不等于 false 的宿舍。  
isMapLinked 用于标记宿舍是否已经和 Explore 地图关联。

---

## 已完成的首页结构整理

当前首页核心数据与组件分工：

src/data/dorms.js  
负责宿舍数据。

src/data/path-options.js  
负责 Explore by Path 的 Major、Lifestyle、Requirements 选项配置。

src/components/DormCard.js  
负责单张宿舍卡片 HTML。

src/components/DormList.js  
负责宿舍卡片列表 HTML。

src/components/DormSummary.js  
负责 selected dorm quick summary HTML。

script.js  
负责首页状态、拖拽、渲染流程、事件绑定、排序、Continue、Reset 和页面跳转。

当前判断：

首页低风险结构整理已经基本完成。  
暂时不建议继续拆 FilterBar，因为 Major / Lifestyle / Requirements 与状态、拖拽和按钮启用逻辑强绑定，继续拆分风险高于收益。

---

## 已完成的 Information 页面整理

Information 页面已经从静态 placeholder 变成数据驱动页面。

当前状态：

information.html  
作为 Information 总览页。

information.html?dorm=lena  
显示 Lena 宿舍详情。

information.html?dorm=warrumbul  
显示 Warrumbul 宿舍详情。

information.html?dorm=wright  
显示 Wright 宿舍详情。

information.html?dorm=kinloch  
当前显示 fallback，因为 Kinloch isInformationVisible 为 false。

已知限制：

Information 页面功能正常，但 UI polish 尚未完成。

该问题已作为技术债记录，不在当前数据结构整理阶段修复。

---

## 已完成的图片路径整理

当前统一图片目录：

assets/images/

旧目录已删除：

Photo images/

当前已迁移：

- 宿舍数据图片
- HTML placeholder 图片
- Information overview fallback 图片
- Explore guided dorm 图片
- style.css 背景图

维护规则：

以后新增图片应放入 assets/images/。  
不要重新创建 Photo images/。  
如果出现图片 404，优先检查 assets/images/ 路径和大小写。

---

## 已完成的数据检查工具

当前数据检查脚本：

tools/validate-dorm-data.js

运行命令：

node tools/validate-dorm-data.js

用途：

检查 src/data/dorms.js 是否符合当前数据结构要求。

每次修改 src/data/dorms.js 后，必须先运行该脚本，再做浏览器测试。

---

## 当前最高风险区域

### explore.js

风险等级：最高。

原因：

explore.js 同时负责 Three.js、GeoJSON、地图渲染、标签、按钮、详情栏、guided mode 和页面跳转。

当前状态：

已建立 EXPLORE_REFACTOR_PLAN.md，但尚未开始拆分。

规则：

不要无计划修改 explore.js。  
不要把 Explore 重构和 CSS 拆分、数据结构、图片路径或部署混在同一个 commit 中。

---

### style.css

风险等级：高。

原因：

style.css 仍然是全局大文件，包含大量布局、页面样式和后期 override。

当前状态：

只完成了图片路径迁移。尚未进行 CSS 模块化。

规则：

不要随手整理 CSS。  
CSS 拆分应作为独立高风险阶段处理。

---

## 当前不建议继续做的事

当前不建议马上做：

- 拆 FilterBar
- 大规模拆 explore.js
- 大规模拆 style.css
- 引入后端
- 引入数据库
- 引入登录系统
- 引入复杂推荐算法
- 直接部署
- 重做 UI 视觉

原因：

这些任务要么高风险，要么属于下一阶段，不应和当前 cleanup 收尾混在一起。

---

## 可选下一阶段路线

### 路线 A：Information UI polish

目标：

修复 Information 页面当前的排版和体验问题。

风险：

中。

建议：

只改 information.html、src/pages/information.js 和必要的局部 CSS。  
不要碰 Explore。  
不要大改全局 style.css。

---

### 路线 B：Explore 轻量重构

目标：

按照 EXPLORE_REFACTOR_PLAN.md，从低风险部分开始拆。

建议第一步：

只抽 guided mode / URL 参数 helper。

风险：

中到高。

注意：

必须严格测试 Explore。

---

### 路线 C：CSS modularization planning

目标：

先写 CSS 拆分计划，不直接拆 CSS。

风险：

低。

适合：

如果暂时不想碰高风险代码，但希望继续工程化。

---

### 路线 D：数据内容补全

目标：

补充真实宿舍信息，例如 Kinloch、Davey 的 description、pros、cons、locationFeel 等。

风险：

低到中。

注意：

需要区分 verified data 和 placeholder data。  
如果涉及 ANU 官方住宿信息，应优先查官方来源。

---

### 路线 E：部署准备

目标：

检查静态路径、托管平台、自定义域名和部署结构。

风险：

中。

注意：

部署前必须确认所有相对路径在目标平台可用。

---

## 当前推荐下一步

推荐优先做：

路线 A：Information UI polish

理由：

- 当前 Information 功能已接上，但体验明显不完整。
- 它的范围比 Explore 和 CSS 全局拆分更可控。
- 修好后用户从首页点击 Information 不会觉得页面仍是半成品。
- 可以作为一个独立 UI polish commit，不影响数据结构。

备选：

如果不想碰 UI，则做路线 C：CSS modularization planning，只写计划，不改 CSS。
