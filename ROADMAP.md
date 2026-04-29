cat > ROADMAP.md <<'EOF'
# ROADMAP.md

## 作用

本文件记录未来功能规划，并限制当前阶段不要乱加功能。

当前目标不是做平台级项目，而是先把现有前端整理成稳定、可维护、可扩展的基础版本。

## 当前阶段：前端清理与工程基础建设

当前要做：

- 保存当前能跑的版本
- 建立 Git 回退机制
- 建立基础工程文档
- 集中宿舍数据
- 拆出必要的可复用组件
- 保持现有视觉效果和功能
- 降低后续 AI 修改造成 bug 的概率

当前不做：

- 后端
- 数据库
- 登录系统
- 用户系统
- 评论系统
- 复杂推荐算法
- Docker
- 大规模视觉重设计
- 完整 CSS 重写
- Explore 地图大重构

## Phase 1 - Git 安全与工程文档

状态：In progress

任务：

- 保存当前可运行版本
- 添加 .gitignore
- 移除 .DS_Store 的 Git 追踪
- 创建基础工程文档

文档包括：

- PROJECT_MAP.md
- DATA_SCHEMA.md
- BUG_LOG.md
- ROADMAP.md
- CHANGELOG.md

建议 commit message：

- Add project map and documentation files

完成标准：

- git status 显示干净
- 五个文档存在
- 没有改动网页运行代码

## Phase 2 - 集中宿舍数据

状态：Not started

目标：
把宿舍数据从多个文件中集中出来。

目标文件：

- src/data/dorms.js

暂时不要动：

- explore.js
- style.css
- GeoJSON 文件

建议 commit message：

- Move dorm data into centralized data file

完成标准：

- 首页能加载
- ranked cards 正常
- compare table 正常
- selected summary 正常
- Explore 按钮跳转正常
- Console 没有数据字段错误

## Phase 3 - 拆出首页可复用组件

状态：Not started

目标：
减少首页重复 UI 渲染代码。

可能组件：

- DormCard
- DormList
- DormSummary
- FilterBar

原则：
只拆真正有维护价值的部分，不为了显得高级而过度拆分。

建议 commit message：

- Create reusable dorm components

## Phase 4 - Information 页面读取宿舍数据

状态：Not started

目标：
让 information.html?dorm=lena 显示对应宿舍内容。

前提：
必须先完成宿舍数据集中化。

建议 commit message：

- Render dorm information page from centralized data

## Phase 5 - Explore 地图数据清理

状态：Not started

目标：
减少 explore.js、detail-content.json、宿舍数据文件之间的重复内容。

注意：
这是高风险阶段，必须等首页数据稳定后再做。

建议 commit message：

- Connect Explore dorm details to centralized data

## Phase 6 - 图片路径整理

状态：Not started

当前目录：

- Photo images/

未来目标：

- assets/images/

注意：
不要和数据重构混在一个 commit 里。

建议 commit message：

- Move image assets into assets directory

## Phase 7 - CSS 模块化

状态：Not started

未来可能拆成：

- styles/base.css
- styles/nav.css
- styles/home.css
- styles/explore.css
- styles/subpages.css

注意：
CSS 是高风险阶段，不能早期做。

## Phase 8 - 正式部署准备

状态：Not started

目标：
让网站从 VS Code 本地预览走向正式可访问地址。

可能任务：

- 检查相对路径
- 检查图片路径
- 检查 JSON / GeoJSON fetch 路径
- 选择托管平台
- 绑定自定义域名
- 写部署文档
EOF
---

## Phase 3 progress note - DormCard 已完成

状态：
In progress

已完成：

- 创建 src/components/DormCard.js
- 将首页宿舍卡片 HTML 生成逻辑从 script.js 拆出
- 保持首页视觉和功能不变
- 保持 Explore 页面正常

尚未完成：

- DormSummary
- DormList
- FilterBar

下一步建议：

优先拆 DormSummary，因为它范围小、风险低、和首页 selected summary 强相关。

暂时不要拆：

- Explore 地图组件
- CSS 模块
- 图片路径
- data.js

---

## Phase 3 progress note - DormSummary 已完成

状态：
In progress

已完成：

- 创建 src/components/DormSummary.js
- 将 selected dorm quick summary 的 HTML 生成逻辑从 script.js 拆出
- 保持首页 summary 功能不变
- 保持 Explore 页面正常

当前已完成组件：

- DormCard
- DormSummary

尚未完成：

- DormList
- FilterBar

下一步建议：

先建立 TESTING_CHECKLIST.md，把每次前端重构后的固定测试流程写下来。之后再决定是否继续拆 DormList。

暂时不要拆：

- Explore 地图组件
- CSS 模块
- 图片路径
- data.js

---

## Phase 3 progress note - DormList 已完成

状态：
In progress

已完成：

- 创建 src/components/DormList.js
- 将首页宿舍卡片列表 HTML 生成逻辑从 script.js 拆出
- DormList.js 复用 DormCardComponent
- 保持首页 Featured dorm cards 和 Ranked dorm cards 功能不变
- 保持 Explore 页面正常

当前已完成组件：

- DormCard
- DormSummary
- DormList

尚未完成：

- FilterBar

当前判断：

暂时不要急着拆 FilterBar。Major / Lifestyle / Requirements 选择区与状态、拖拽、按钮启用逻辑强绑定，继续拆分风险高于收益。

下一步建议：

先审查 script.js 中剩余逻辑，判断是否需要整理函数顺序或补充注释，而不是继续机械拆组件。

暂时不要拆：

- Explore 地图组件
- CSS 模块
- 图片路径
- data.js
- Major / Lifestyle / Requirements 选择面板

---

## Phase 3 progress note - Path options 已迁移

状态：
Completed for current scope

已完成：

- 创建 src/data/path-options.js
- 将首页 Explore by Path 的 Major、Lifestyle、Requirements 选项配置从 script.js 拆出
- script.js 改为读取 window.PATH_OPTIONS
- 保持首页选择、拖拽、Continue、Reset、ranked dorm cards 和 compare table 正常
- 保持 Explore 页面正常

当前结构：

- src/data/dorms.js 负责宿舍数据
- src/data/path-options.js 负责首页路径选项配置
- script.js 负责首页交互流程

当前判断：

首页低风险结构整理已经基本完成。暂时不建议继续拆 FilterBar，因为 Major、Lifestyle、Requirements 与状态、拖拽和按钮启用逻辑强绑定，继续拆分风险高于收益。

下一步建议：

进入一次阶段性收尾：

- 运行数据检查脚本
- 按 TESTING_CHECKLIST.md 做完整测试
- 更新文档
- 确认当前版本可作为 frontend cleanup milestone

暂时不要做：

- Explore 地图拆分
- CSS 模块化
- 图片路径迁移
- 删除 data.js
- 部署

---

## Frontend cleanup milestone - 当前阶段收尾

状态：
Completed for current baseline

当前阶段已完成：

- Git 安全回退机制
- 基础工程文档
- 首页宿舍数据集中化
- 宿舍数据可见性字段
- 首页核心组件拆分
- 首页路径选项配置迁移
- Information 页面数据化
- 宿舍数据检查脚本
- 前端测试清单
- script.js 结构注释

当前项目状态：

项目已经从 AI 拼装式静态前端，整理为有基本工程边界的静态前端项目。

当前不再建议继续在首页低风险区域反复拆分。下一阶段应选择一条明确路线，而不是同时推进多个方向。

可选下一阶段：

1. Information UI polish
   修复 Information 页面排版和体验问题。

2. Image path cleanup
   将 Photo images/ 整理为 assets/images/。

3. Legacy data cleanup
   审查并决定是否删除旧 data.js。

4. Explore map refactor planning
   先写 Explore 拆分计划，不直接改 explore.js。

5. CSS modularization planning
   先写 CSS 拆分计划，不直接拆 style.css。

6. Deployment preparation
   检查静态路径、托管平台和自定义域名部署要求。

建议优先级：

短期优先做 Legacy data cleanup 或 Image path cleanup，因为它们比 Explore 和 CSS 拆分风险低。

暂时不要做：

- 大规模重写 explore.js
- 大规模拆分 style.css
- 引入后端
- 引入数据库
- 引入登录系统
- 上复杂推荐算法

---

## Legacy data cleanup - 已完成

状态：
Completed

已完成：

- 审查旧根目录 data.js 是否仍被页面或脚本引用
- 确认页面已改为加载 src/data/dorms.js
- 确认旧 data.js 没有被其他脚本依赖
- 删除旧 data.js
- 运行宿舍数据检查脚本
- 完成首页、Information、Explore 快速测试

结果：

宿舍数据源已经统一到 src/data/dorms.js。

后续不要重新引入根目录 data.js。

---

## Image path cleanup planning - 已建立计划

状态：
Planned

已完成：

- 新增 IMAGE_PATH_MIGRATION_PLAN.md
- 明确当前图片目录 Photo images/
- 明确未来目标目录 assets/images/
- 明确图片迁移必须分阶段执行
- 明确当前阶段不移动图片、不改路径

后续执行建议：

1. 复制图片到 assets/images/
2. 先迁移 src/data/dorms.js 中的宿舍图片路径
3. 测试首页和 Information 页面
4. 单独 commit
5. 再迁移 HTML placeholder 图片
6. 再迁移 CSS 图片路径
7. 最后确认是否可以删除 Photo images/

注意：

不要在同一轮里同时迁移图片、拆 CSS、改 Explore、改数据结构。


---

## Image path cleanup - 已完成

状态：
Completed

已完成：

- 规划图片路径迁移
- 建立 assets/images/
- 分阶段迁移 dorm 数据图片、HTML placeholder 图片、Information fallback 图片、Explore guided 图片、style.css 背景图
- 删除旧 Photo images/ 目录
- 完成页面测试和数据检查

结果：

项目图片路径已经统一到 assets/images/。

后续不要重新引入 Photo images/。


---

## Explore refactor planning - 已建立计划

状态：
Planned

已完成：

- 新增 EXPLORE_REFACTOR_PLAN.md
- 梳理 explore.js 当前职责
- 标记 Explore 为最高风险区域
- 规划未来可能拆分方向
- 明确当前阶段不直接修改 explore.js

后续建议：

如果要开始 Explore 重构，优先选择低风险步骤，例如 guided mode helper 或配置读取 helper。

暂时不要直接拆：

- Three.js scene 渲染
- GeoJSON 坐标转换
- 建筑体块渲染
- label 点击逻辑
- style.css 中的 Explore 布局


---

## Frontend cleanup summary - 已建立阶段总结

状态：
Completed

已完成：

- 新增 FRONTEND_CLEANUP_SUMMARY.md
- 总结当前工程整理成果
- 标记当前最高风险区域
- 列出下一阶段可选路线

当前推荐下一步：

优先考虑 Information UI polish，因为 Information 页面功能已经接入数据，但视觉和体验仍不完整。

备选路线：

- Explore 轻量重构
- CSS modularization planning
- 数据内容补全
- 部署准备
