cat > CHANGELOG.md <<'EOF'
# CHANGELOG.md

## 作用

本文件记录项目每个稳定阶段做了什么。

Git 保存精确文件历史；CHANGELOG 用人能看懂的方式解释每次稳定变化的意义。

## 记录格式

每次稳定修改建议记录：

- 日期
- commit message
- 修改内容
- 影响文件
- 测试方式
- 后续注意事项

## 2026-04-27 - 保存重构前的当前可运行版本

Commit message:
Save current working version before frontend refactor

Summary:
在开始前端结构整理前，把当前能够在 VS Code / 浏览器中预览运行的版本保存为 Git 基线。

Affected files:
- 当前项目已有文件

Testing:
提交前项目已经能在本地浏览器预览中显示。

Notes:
这是重构前的安全底线。如果后续 AI 修改把项目改坏，可以回到这个版本。

## 2026-04-27 - 添加 macOS 系统文件忽略规则

Commit message:
Add Git ignore rules for macOS metadata

Summary:
添加 .gitignore，让 Git 忽略 .DS_Store，并把已经进入 Git 追踪的 .DS_Store 移除。

Affected files:
- .gitignore
- .DS_Store
- Photo images/.DS_Store
- topo/.DS_Store

Testing:
运行 git status。

Expected result:
nothing to commit, working tree clean

Notes:
这一步不影响网页运行，只是清理 Git 追踪内容。

## 2026-04-27 - 添加基础工程文档

Commit message:
Add project map and documentation files

Summary:
添加项目地图、数据字段说明、bug 记录、路线图和变更记录，作为后续前端结构整理的基础。

Affected files:
- PROJECT_MAP.md
- DATA_SCHEMA.md
- BUG_LOG.md
- ROADMAP.md
- CHANGELOG.md

Testing:
不需要浏览器测试，因为 Markdown 文件不会被网页加载。

Required Git check:
运行 git status。

Expected result after commit:
nothing to commit, working tree clean

Notes:
这个阶段只加文档，不改 HTML / CSS / JS，不应该影响当前页面。

## Planned - 集中宿舍数据

Commit message:
Move dorm data into centralized data file

Summary:
把宿舍数据从页面脚本中移动到统一数据文件，减少重复和字段不一致。

Expected affected files:
- script.js
- data.js 或 src/data/dorms.js
- 可能包括 index.html

Testing:
- 首页 ranked cards 正常
- compare table 正常
- selected summary 正常
- Explore 跳转正常
- Console 没有 undefined 字段错误

## Planned - 拆出可复用宿舍组件

Commit message:
Create reusable dorm components

Summary:
把重复的宿舍卡片、列表、summary 渲染逻辑拆成更清楚的可复用函数或文件。

Expected affected files:
- script.js
- src/components/ 下的新文件

Testing:
- 页面视觉不变
- ranked cards 仍然可点击
- summary 仍然更新

## Planned - 连接 Information 页面与宿舍数据

Commit message:
Render dorm information page from centralized data

Summary:
让 information.html?dorm=... 根据 URL 参数显示对应宿舍详情。

Expected affected files:
- information.html
- information.js
- 宿舍数据文件

Testing:
- information.html?dorm=lena
- information.html?dorm=wright
- 无效 dorm id fallback
EOF
## 2026-04-27 - 首页宿舍数据迁移到集中数据文件

Commit message:
Move home dorm data into centralized data file

Summary:
将首页正在使用的宿舍推荐数据从 script.js 移动到 src/data/dorms.js。首页现在通过 window.DORM_DATA 读取宿舍数据，script.js 不再直接保存首页宿舍列表。

Affected files:
- index.html
- script.js
- src/data/dorms.js

Testing:
已完成以下测试：

- 首页正常加载
- ranked dorm cards 正常显示
- compare table 正常显示
- selected summary 正常更新
- Continue / Reset 正常
- Explore 按钮跳转正常
- Information 按钮跳转正常
- Explore 页面 3D 地图正常显示
- Explore 页面 3D / 2D 按钮正常
- Explore 页面 Numbers 按钮正常
- Explore 页面 Reset 按钮正常
- Explore 页面绿色宿舍标签可点击

Notes:
本次只迁移首页宿舍数据，不代表全项目宿舍数据已经完全统一。

data.js 暂时保留，不删除。原因是项目中可能仍存在隐藏依赖，且本轮目标不是清理所有旧数据源。

style.css 在本轮中不应被修改。曾经出现 style.css 被误改后 Explore 页面失效的问题，因此本阶段明确禁止把 CSS 修改混入首页数据重构。


## 2026-04-27 - 拆出 DormCard 可复用组件

Commit message:
Create reusable dorm card component

Summary:
将首页宿舍卡片的 HTML 生成逻辑从 script.js 拆出到 src/components/DormCard.js。script.js 仍然负责首页状态、排序、渲染流程和按钮事件绑定；DormCard.js 只负责根据 dorm 数据返回卡片 HTML 字符串。

Affected files:
- index.html
- script.js
- src/components/DormCard.js

Testing:
- 首页正常加载
- Featured dorm cards 正常显示
- Ranked dorm cards 正常显示
- 宿舍图片正常显示
- Explore 按钮正常跳转
- Information 按钮正常跳转
- Continue / Reset 正常
- Compare table 正常
- selected summary 正常
- Explore 页面 3D 地图正常
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常

Notes:
本次只拆 DormCard 组件，不拆 DormList、DormSummary、FilterBar，也不修改 style.css、explore.js、data.js。

## 2026-04-27 - 拆出 DormSummary 可复用组件

Commit message:
Create reusable dorm summary component

Summary:
将首页 selected dorm quick summary 的 HTML 生成逻辑从 script.js 拆出到 src/components/DormSummary.js。script.js 仍然负责状态变化和 DOM 更新时机；DormSummary.js 只负责根据 dorm 数据返回 summary HTML 字符串。

Affected files:
- index.html
- script.js
- src/components/DormSummary.js

Testing:
- 首页正常加载
- 初始 selected summary 显示 No dorm selected yet
- 选择宿舍后 summary 正常显示对应宿舍
- Continue / Reset 正常
- ranked dorm cards 正常
- compare table 正常
- Explore 页面 3D 地图正常
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常

Notes:
本次只拆 DormSummary 组件，不改宿舍数据、不改 style.css、不改 explore.js、不改 data.js。

## 2026-04-27 - 添加前端重构测试清单

Commit message:
Add frontend cleanup testing checklist

Summary:
新增 TESTING_CHECKLIST.md，用于记录每次前端结构整理后的固定测试流程。该清单覆盖首页、宿舍卡片、selected summary、compare table、Explore 地图、Information 页面、Question 页面、导航、Console 和 Git 状态检查。

Affected files:
- TESTING_CHECKLIST.md
- CHANGELOG.md

Testing:
不需要浏览器测试，因为本次只新增文档，不改网页运行代码。

Required Git check:
运行 git status，确认提交后 working tree clean。

Notes:
以后每次代码重构完成后，都应先按 TESTING_CHECKLIST.md 测试，再 commit。

## 2026-04-27 - 拆出 DormList 可复用组件

Commit message:
Create reusable dorm list component

Summary:
将首页宿舍卡片列表的 HTML 生成逻辑从 script.js 拆出到 src/components/DormList.js。DormList.js 负责把 dorms 数组转换成宿舍卡片 HTML，并复用 DormCardComponent。script.js 仍然负责排序、DOM 插入、按钮事件绑定和页面跳转。

Affected files:
- index.html
- script.js
- src/components/DormList.js

Testing:
- 首页正常加载
- Featured dorm cards 正常显示
- Continue 后 ranked dorm cards 正常显示
- ranked cards 的 #1 / #2 / #3 排名正常
- 宿舍图片正常显示
- Explore 按钮正常跳转
- Information 按钮正常跳转
- selected summary 正常
- compare table 正常
- Explore 页面 3D 地图正常
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常

Notes:
本次只拆 DormList 组件，不改宿舍数据、不改 style.css、不改 explore.js、不改 data.js。DormList.js 不负责排序、事件绑定、跳转或状态管理。

## 2026-04-27 - 添加 script.js 内部结构注释

Commit message:
Add structure comments to home page script

Summary:
为 script.js 添加功能分区注释，明确工具函数、宿舍查找、选择状态、拖拽交互、偏好面板渲染、宿舍排序、卡片列表、对比表和主流程控制的边界。本次不改变任何运行逻辑，只改善后续维护定位。

Affected files:
- script.js
- CHANGELOG.md

Testing:
- 首页基础功能正常
- Ranked dorm cards 正常
- Selected summary 正常
- Compare table 正常
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常
- Console 无红色错误

Notes:
本次只是代码结构注释，不拆新组件，不改 style.css，不改 explore.js，不改 data.js。

---

## 2026-04-27 - 添加宿舍数据可见性字段

Commit message:
Refine dorm data visibility fields

Summary:
为 src/data/dorms.js 中的宿舍对象添加用途控制字段，包括 isHomeCandidate、isInformationVisible 和 isMapLinked。首页现在只显示 isHomeCandidate 不等于 false 的宿舍；Information 页面只显示 isInformationVisible 不等于 false 的宿舍。

Affected files:
- src/data/dorms.js
- script.js
- src/pages/information.js

Testing:
- 首页正常加载
- Featured dorm cards 仍然显示 3 张
- Ranked dorm cards 仍然显示 3 张
- selected summary 正常
- compare table 正常
- Explore / Information 按钮正常
- information.html 显示 dorm overview
- information.html?dorm=lena 正常
- information.html?dorm=warrumbul 正常
- information.html?dorm=wright 正常
- information.html?dorm=wrong 显示 fallback
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常

Notes:
本次不是新增宿舍，也不是 UI polish。它的目的只是让宿舍主数据表具备可控显示范围，避免未来加入更多宿舍后自动破坏首页推荐区或 Information 页面。

---

## 2026-04-27 - 添加宿舍数据检查脚本

Commit message:
Add dorm data validation script

Summary:
新增 tools/validate-dorm-data.js，用于检查 src/data/dorms.js 中的宿舍数据结构。脚本会检查必填字段、重复 id、重复 buildingId、重复 mapFocus、图片路径是否存在、tags / pros / cons 是否为数组，以及 isHomeCandidate、isInformationVisible、isMapLinked 是否为布尔值。

Affected files:
- tools/validate-dorm-data.js

Testing:
已运行以下命令：

node tools/validate-dorm-data.js

预期结果：

Dorm data validation passed. Checked 3 dorm records.

Notes:
这个脚本不影响网页运行。它是维护工具，用于在修改宿舍数据后提前发现低级数据错误。以后每次修改 src/data/dorms.js 后，都应先运行该脚本，再进行浏览器页面测试。

---

## 2026-04-27 - 迁移首页路径选项配置

Commit message:
Move path options into centralized data file

Summary:
将首页 Explore by Path 的 Major、Lifestyle、Requirements 选项配置从 script.js 迁移到 src/data/path-options.js。script.js 现在从 window.PATH_OPTIONS 读取配置，继续负责状态管理、拖拽、渲染流程、Continue、Reset、排序和跳转。

Affected files:
- index.html
- script.js
- src/data/path-options.js

Testing:
- 首页正常加载
- Major 选项正常显示并可点击
- Lifestyle 选项正常显示、可选择、可排序
- Requirements 选项正常显示并可选择
- Continue 正常
- Reset 正常
- ranked dorm cards 正常
- compare table 正常
- Console 没有 PATH_OPTIONS is missing 报错
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常

Notes:
本次只迁移首页路径选项配置，不改推荐算法、不改拖拽逻辑、不改 style.css、不改 explore.js、不改 data.js。

---

## 2026-04-27 - Frontend cleanup milestone

Commit message:
Mark frontend cleanup milestone

Summary:
完成当前阶段的前端结构整理基线。项目已经从 AI 拼装式静态前端整理为具备 Git 回退、工程文档、集中宿舍数据、路径选项数据、基础组件拆分、Information 数据化页面、数据检查脚本和测试清单的可维护版本。

Completed in this milestone:
- 建立 Git 基础版本管理
- 添加 .gitignore 并清理 macOS metadata
- 创建 PROJECT_MAP.md、DATA_SCHEMA.md、BUG_LOG.md、ROADMAP.md、CHANGELOG.md
- 创建 TESTING_CHECKLIST.md
- 建立 src/data、src/components、src/utils、src/pages、tools 目录
- 将首页宿舍数据迁移到 src/data/dorms.js
- 添加 isHomeCandidate、isInformationVisible、isMapLinked 数据可见性字段
- 添加隐藏的 map-linked dorm records：Kinloch 和 Davey
- 拆出 DormCard、DormList、DormSummary 组件
- 将首页路径选项配置迁移到 src/data/path-options.js
- 让 Information 页面读取集中宿舍数据
- 添加 tools/validate-dorm-data.js 数据检查脚本
- 为 script.js 添加结构注释

Testing:
- 已运行 node tools/validate-dorm-data.js
- 首页基础功能通过
- 首页 Explore by Path 功能通过
- ranked dorm cards 功能通过
- selected summary 功能通过
- compare table 功能通过
- Information overview 和 dorm detail 功能通过
- Explore 3D / 2D / Numbers / Reset / dorm label 功能通过
- Question 页面基础显示通过
- Navigation drawer 功能通过
- Console 无阻断性红色错误

Known limitations:
- Information 页面功能正常，但 UI polish 尚未完成
- style.css 仍然是全局大文件，存在后期 override
- explore.js 仍然是高风险大文件，尚未模块化
- 图片路径仍然使用 Photo images/，尚未迁移到 assets/images/
- data.js 暂时保留为 legacy 文件，尚未删除
- 推荐算法仍然是 placeholder，不是正式评分模型

Notes:
该版本可以作为当前 frontend cleanup 的稳定基线。后续新阶段应从 clean Git 状态开始，并避免把 Explore、CSS、图片路径、部署等高风险任务混在同一个 commit 中。

---

## 2026-04-27 - 删除旧根目录宿舍数据文件

Commit message:
Remove legacy root dorm data file

Summary:
删除旧的根目录 data.js。项目现在正式只使用 src/data/dorms.js 作为宿舍主数据源，避免旧数据文件继续误导后续维护或 AI 修改。

Affected files:
- data.js

Testing:
- 已确认 HTML 页面不再加载 data.js
- 已确认旧 data.js 没有被其他脚本依赖
- 已运行 node tools/validate-dorm-data.js
- 首页正常加载
- 首页推荐卡片仍然显示 3 张
- selected summary 正常
- compare table 正常
- Information 页面正常
- information.html?dorm=lena 正常
- information.html?dorm=kinloch 显示 fallback
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常

Notes:
删除 data.js 后，宿舍数据源正式统一到 src/data/dorms.js。以后不要重新创建根目录 data.js，也不要让页面直接读取旧式全局 dorms 变量。

---

## 2026-04-27 - 添加图片路径迁移计划

Commit message:
Add image path migration plan

Summary:
新增 IMAGE_PATH_MIGRATION_PLAN.md，用于规划未来从 Photo images/ 迁移到 assets/images/ 的步骤。当前阶段只建立计划，不移动图片、不修改图片路径、不改页面代码。

Affected files:
- IMAGE_PATH_MIGRATION_PLAN.md
- PROJECT_MAP.md
- ROADMAP.md
- CHANGELOG.md

Testing:
不需要浏览器测试，因为本次只新增和更新文档，不改网页运行代码。

Notes:
图片路径迁移涉及 HTML、CSS、JavaScript、src/data/dorms.js 和 Explore 页面，必须作为独立阶段处理。

---

## 2026-04-27 - 迁移宿舍数据图片路径到 assets 目录

Commit message:
Update dorm image paths to assets directory

Summary:
创建 assets/images/ 目录，并复制原 Photo images/ 中的宿舍图片。将 src/data/dorms.js 中的 dorm.image 路径从 Photo images/ 更新为 assets/images/。本次只迁移宿舍数据使用的图片路径，不修改 HTML placeholder 图片、不修改 style.css、不修改 explore.js、不删除旧 Photo images/ 目录。

Affected files:
- src/data/dorms.js
- assets/images/

Testing:
- 已运行 node tools/validate-dorm-data.js
- 首页 Featured dorm cards 图片正常
- 首页 Ranked dorm cards 图片正常
- selected summary 正常
- compare table 正常
- Information dorm detail 图片正常
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常
- Console / Network 没有 assets/images 相关 404

Notes:
这是图片路径迁移的第一阶段。旧 Photo images/ 目录仍然保留，因为 HTML、CSS 或 Explore 相关代码中可能仍有旧路径引用。


---

## 2026-04-27 - 迁移 placeholder 图片路径到 assets 目录

Commit message:
Update placeholder image paths to assets directory

Summary:
将 information.html、question.html 和 src/pages/information.js 中的 placeholder / overview 图片路径从 Photo images/ 更新为 assets/images/。本次不修改 style.css、不修改 explore.js、不删除旧 Photo images/ 目录。

Affected files:
- information.html
- question.html
- src/pages/information.js

Testing:
- information.html 正常打开
- Information overview 图片正常显示
- information.html?dorm=lena 正常
- information.html?dorm=wright 正常
- information.html?dorm=kinloch fallback 正常
- question.html placeholder 图片正常显示
- 首页 dorm cards 图片正常
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常
- Console / Network 没有 assets/images 相关 404

Notes:
这是图片路径迁移的第二阶段。当前仍未迁移 style.css 和 explore.js 中的旧图片路径，Photo images/ 旧目录必须继续保留。


---

## 2026-04-27 - 迁移 Explore guided 图片路径到 assets 目录

Commit message:
Update Explore guided image paths to assets directory

Summary:
将 explore.js 中 GUIDED_DORM_IMAGE_MAP 的旧图片路径从 Photo images/ 更新为 assets/images/。本次只修改 guided dorm detail 使用的图片路径，不修改 Three.js 地图逻辑、不修改 style.css、不修改宿舍数据结构。

Affected files:
- explore.js

Testing:
- explore.html 正常打开
- 3D 地图正常显示
- 3D / 2D 按钮正常
- Numbers 按钮正常
- Reset 正常
- 绿色宿舍标签可点击
- 从首页点击 Explore 进入 guided mode 后，详情图片正常显示
- Console / Network 没有 assets/images 相关 404
- 首页 dorm cards 图片正常
- Information dorm detail 图片正常

Notes:
Explore 图片路径迁移已经完成。当前旧 Photo images/ 引用主要还剩 style.css 中的背景图，以及 src/data/dorms.js 中的过时注释。


---

## 2026-04-27 - 迁移 stylesheet 图片路径到 assets 目录

Commit message:
Update stylesheet image path to assets directory

Summary:
将 style.css 中的旧背景图路径从 Photo images/IMG_6288.jpeg 更新为 assets/images/IMG_6288.jpeg。本次只修改图片路径，不拆分 CSS、不修改布局、不修改 Explore 逻辑。

Affected files:
- style.css

Testing:
- 首页正常打开
- Hero 背景图正常显示
- dorm cards 图片正常
- ranked dorm cards 正常
- selected summary 正常
- compare table 正常
- Explore 页面 3D / 2D、Numbers、Reset、绿色宿舍标签均正常
- Console / Network 没有 assets/images/IMG_6288.jpeg 相关 404

Notes:
这是图片路径迁移的第三阶段。style.css 仍然是高风险全局样式文件，本次只修改图片路径，不进行 CSS 模块化。


---

## 2026-04-27 - 删除旧 Photo images 图片目录

Commit message:
Remove legacy photo images directory

Summary:
在确认 HTML、CSS、JavaScript 文件均不再引用 Photo images/ 后，删除旧图片目录 Photo images/。当前项目图片资源已经统一迁移到 assets/images/。同时清理了 src/data/dorms.js 中关于旧图片目录的过时注释。

Affected files:
- Photo images/
- src/data/dorms.js

Testing:
- 已确认 grep 检查中没有运行文件继续引用 Photo images/
- 已运行 node tools/validate-dorm-data.js
- 首页 Hero 背景图正常
- 首页 dorm cards 图片正常
- ranked dorm cards 图片正常
- Information overview 图片正常
- Information dorm detail 图片正常
- Question placeholder 图片正常
- Explore 3D / 2D、Numbers、Reset、绿色宿舍标签正常
- Explore guided mode 图片正常
- Console / Network 没有 Photo images 或 assets/images 相关 404

Notes:
图片路径迁移已经完成。后续新增图片应放入 assets/images/，不要重新创建 Photo images/ 目录。


---

## 2026-04-27 - 添加 Explore 重构计划

Commit message:
Add Explore refactor planning document

Summary:
新增 EXPLORE_REFACTOR_PLAN.md，用于规划未来 Explore 页面和 explore.js 的重构顺序。当前阶段只写计划，不修改 explore.js、不修改 explore.html、不修改 style.css、不修改地图数据。

Affected files:
- EXPLORE_REFACTOR_PLAN.md
- PROJECT_MAP.md
- ROADMAP.md
- CHANGELOG.md

Testing:
不需要浏览器测试，因为本次只新增和更新文档，不改网页运行代码。

Notes:
Explore 是当前项目最高风险区域。后续如果要重构，应先从 guided mode 或配置读取等低风险部分开始，不应直接拆 Three.js 渲染和 GeoJSON 处理。


---

## 2026-04-27 - 添加前端整理阶段总结

Commit message:
Add frontend cleanup summary

Summary:
新增 FRONTEND_CLEANUP_SUMMARY.md，用于总结当前前端工程整理阶段的已完成事项、当前结构、剩余风险和下一阶段可选路线。该文档标记当前项目已经从 AI 拼装式静态前端进入有基础工程边界的静态前端项目状态。

Affected files:
- FRONTEND_CLEANUP_SUMMARY.md
- CHANGELOG.md
- ROADMAP.md
- PROJECT_MAP.md

Testing:
不需要浏览器测试，因为本次只新增和更新文档，不改网页运行代码。

Notes:
该文档可作为后续继续开发前的状态入口。新阶段开始前应先阅读 FRONTEND_CLEANUP_SUMMARY.md、PROJECT_MAP.md 和 ROADMAP.md。
