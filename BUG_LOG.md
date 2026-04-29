cat > BUG_LOG.md <<'EOF'
# BUG_LOG.md

## 作用

本文件记录 bug、原因、影响文件、修复方式和测试方式。

目标：避免同一个问题反复出现，尤其是 AI 修改代码后制造的新 bug。

## 记录格式

每个 bug 建议记录：

- 日期
- 状态
- 现象
- 原因
- 影响文件
- 修复方式
- 测试方式
- 后续风险

## 2026-04-27 - macOS .DS_Store 文件被 Git 追踪

状态：Fixed / Watching

现象：
第一次 Git commit 时包含了 .DS_Store 文件。

原因：
macOS 会自动生成 .DS_Store，用于记录 Finder 文件夹显示设置。这不是项目代码，不应该进入 Git。

影响文件：

- .DS_Store
- Photo images/.DS_Store
- topo/.DS_Store
- .gitignore

修复方式：
添加 .gitignore，并用 git rm --cached 移除已经被 Git 追踪的 .DS_Store。

测试方式：
运行 git status。

理想结果：
nothing to commit, working tree clean

风险：
如果以后出现新的系统垃圾文件，先检查 .gitignore，不要直接 commit。

## 2026-04-27 - 宿舍数据分散在多个文件

状态：Open

现象：
宿舍信息不是从一个统一数据源读取，而是分散在 script.js、data.js、explore.js、detail-content.json 等文件里。

原因：
项目是逐步由 AI 辅助拼装出来的，每个功能可能复制了一份自己的数据。

影响文件：

- script.js
- data.js
- explore.js
- detail-content.json
- functional-buildings.json

计划修复：
建立统一宿舍数据文件，例如 src/data/dorms.js。

测试方式：
数据重构后检查：

- 首页 ranked cards 正常
- compare table 正常
- selected summary 正常
- Explore 按钮跳转正常
- Information 按钮跳转正常
- 浏览器 Console 没有 undefined 错误

## 2026-04-27 - 字段名 tradeoff / tradeOff 不一致

状态：Open

现象：
同一含义字段可能有不同写法。

原因：
数据没有统一 schema。

影响文件：

- data.js
- script.js

计划修复：
统一使用 tradeOff。

测试方式：
检查 compare table 的 Main Trade-off 和 selected summary 的 Main trade-off 是否正常显示。

## 2026-04-27 - Information 页面还没有真正读取 dorm 参数

状态：Known limitation

现象：
information.html?dorm=lena 可以打开，但页面仍然是静态 placeholder。

原因：
Information 页面还没有连接宿舍数据，也没有解析 URL 参数。

影响文件：

- information.html
- 未来的 information.js

计划修复：
等宿舍数据集中化后，再实现 Information 页面动态渲染。

## 2026-04-27 - style.css 存在大量后期覆盖补丁

状态：Watching

现象：
style.css 很长，存在重复选择器和 override，尤其集中在 Explore 地图布局。

原因：
样式是逐步补丁式加入的。

影响文件：

- style.css

处理原则：
现在不要清理 CSS。等数据和 JS 结构稳定后，再单独做 CSS 模块化。

风险：
当前视觉效果可能依赖 CSS 顺序和 !important，过早整理容易破坏页面。
EOF
## 2026-04-27 - 首页数据重构曾意外影响 Explore 页面

状态：
Fixed / Watching

现象：
首页数据迁移后，Explore 页面一度出现 3D 效果消失、按钮不灵、地图交互异常的问题。

原因：
本轮 git status 显示 style.css 被修改，同时 data.js 被删除。由于本轮任务只应该影响首页数据，不应该修改 Explore 或 CSS，因此判断为非目标文件变动导致的副作用风险。

当时异常状态包括：

- data.js 被删除
- style.css 被修改
- index.html 被修改
- script.js 被修改
- src/data/dorms.js 新增

影响文件：
- style.css
- data.js
- explore.html
- explore.js
- index.html
- script.js
- src/data/dorms.js

修复方式：
恢复不该在本轮修改的文件：

- 恢复 data.js
- 恢复 style.css
- 保留 index.html、script.js、src/data/dorms.js 的首页数据迁移改动

最终保留的改动只有：

- index.html
- script.js
- src/data/dorms.js

测试方式：
修复后重新测试 Explore 页面：

- 3D 地图正常显示
- 3D / 2D 按钮正常
- Numbers 按钮正常
- Reset 按钮正常
- 绿色宿舍标签可点击

风险：
以后做首页数据重构时，不要同时删除 data.js，不要修改 style.css，不要修改 explore.js。Explore 相关文件应作为独立阶段处理。


## 2026-04-27 - Information 页面功能正常但 UI 仍需 polish

状态：
Watching

现象：
Information 页面已经能够根据 URL 参数显示宿舍信息，也能在无参数时显示宿舍总览。但页面中仍存在若干排版和体验问题，例如局部间距、信息层级、列表样式或视觉统一性不足。

原因：
本轮目标是让 Information 页面接入集中宿舍数据，而不是进行 UI 设计优化。页面仍然复用 placeholder-card 等旧样式，因此功能已经接上，但视觉体验还没有完成专门 polish。

影响文件：
- information.html
- src/pages/information.js
- style.css（未来可能需要，但本轮不修改）

处理原则：
暂时不修。不要为了局部美观问题打断当前数据结构整理。Information 页面 UI polish 应作为后续单独阶段处理。

后续修复方向：
- 单独设计 Information overview 的卡片列表样式
- 单独设计 dorm detail 的信息层级
- 统一 Pros / Cons 的列表视觉
- 避免直接把详情内容塞进旧 placeholder 样式
- 必要时再修改 style.css，但必须作为独立 commit

风险：
如果现在边修数据边修 UI，容易重新引入 style.css 误改风险，并影响 Explore 页面布局稳定性。
