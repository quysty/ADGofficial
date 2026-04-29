# EXPLORE_REFACTOR_PLAN.md

## 作用

本文件记录 Explore 页面未来重构计划。

当前阶段只做规划，不直接修改 explore.js。

explore.js 是当前项目最高风险文件之一。它同时负责 Three.js 场景、GeoJSON 加载、建筑渲染、标签渲染、2D / 3D 切换、detail panel、guided mode、URL 参数和页面跳转。任何大改都可能导致地图死机、按钮失效或详情栏异常。

---

## 当前 Explore 文件状态

核心页面：

- explore.html

核心脚本：

- explore.js

相关配置：

- config/building-types.json
- config/functional-buildings.json
- config/detail-content.json

相关地图数据：

- topo/buildings.geojson
- topo/roads.geojson
- topo/green.geojson
- topo/trees.geojson
- topo/water0.geojson
- topo/water2.geojson

相关样式：

- style.css

---

## 当前 explore.js 的主要职责

explore.js 当前至少包含这些职责：

1. Three.js scene 初始化
2. camera / renderer / controls 管理
3. GeoJSON 数据加载
4. 建筑 polygon 转 3D 体块
5. 道路、绿地、水体、树木图层渲染
6. 建筑类型配置读取
7. functional building 映射
8. 建筑标签和编号标签渲染
9. 3D / 2D 模式切换
10. Numbers 标签开关
11. Reset 视角
12. 地图点击和选中状态
13. 右侧 overview panel
14. 右侧 detail panel
15. guided mode URL 参数处理
16. 从首页 Explore 按钮进入地图聚焦
17. 从地图跳转到 Information 页面

问题不是这些功能不能放在一个文件里，而是它们现在混在一个高风险大文件中，后续维护成本高。

---

## 重构原则

Explore 重构必须遵守以下原则：

1. 一次只改一个职责区域。
2. 每次修改前必须 git status clean。
3. 每次修改后必须测试 Explore 基础功能。
4. 不要同时修改 explore.js 和 style.css。
5. 不要同时修改地图逻辑和图片路径。
6. 不要同时修改数据加载和 UI panel。
7. 不要同时修改 guided mode 和建筑渲染。
8. GeoJSON 文件默认只读，不手动编辑。
9. config 文件修改必须单独 commit。
10. 如果 Explore 页面死机，优先 git restore，而不是继续叠加修复。

---

## 未来目标目录结构

未来可以考虑逐步拆成：

src/explore/
- explore-state.js
- explore-config.js
- map-data-loader.js
- scene-setup.js
- render-buildings.js
- render-map-layers.js
- render-labels.js
- detail-panel.js
- guided-mode.js
- explore-navigation.js

注意：

这只是未来目标，不代表下一步要一次性创建所有文件。

---

## 推荐拆分顺序

### Step 1 - 只整理常量和配置读取

目标：

把明显的常量、URL 参数 key、基础配置读取逻辑从 explore.js 中分离。

可能文件：

- src/explore/explore-config.js

风险：

低到中。

原因：

只移动静态配置，不碰 Three.js 渲染。

---

### Step 2 - 拆 guided mode 逻辑

目标：

把 guided mode 的 URL 参数解析、focus dorm 逻辑、from=ranked 判断拆出。

可能文件：

- src/explore/guided-mode.js

风险：

中。

原因：

guided mode 连接首页 Explore 按钮，必须测试首页到地图跳转。

---

### Step 3 - 拆 detail panel 渲染逻辑

目标：

把右侧 detail panel 内容生成、overview/detail 切换逻辑拆出。

可能文件：

- src/explore/detail-panel.js

风险：

中到高。

原因：

detail panel 与 CSS 布局强相关，但可以先只拆 JS 内容生成，不改 CSS。

---

### Step 4 - 拆 map data loader

目标：

把 GeoJSON / JSON fetch 逻辑集中到数据加载模块。

可能文件：

- src/explore/map-data-loader.js

风险：

中到高。

原因：

路径错误会直接导致地图不显示。

---

### Step 5 - 拆 label 渲染

目标：

把建筑编号 label、功能建筑 label、dorm label 的创建逻辑拆出。

可能文件：

- src/explore/render-labels.js

风险：

高。

原因：

label 与点击、交互、CSS、地图坐标都有关。

---

### Step 6 - 拆建筑和地图图层渲染

目标：

拆建筑体块、道路、绿地、水体、树木渲染。

可能文件：

- src/explore/render-buildings.js
- src/explore/render-map-layers.js

风险：

最高。

原因：

这部分直接涉及 Three.js 几何体、坐标转换、图层顺序和性能。

---

## 每次 Explore 修改后的必测项目

每次修改 Explore 相关代码后，必须测试：

1. explore.html 正常打开
2. 3D 地图正常显示
3. 2D / 3D 切换正常
4. Numbers 按钮正常
5. Reset 按钮正常
6. 绿色宿舍标签可点击
7. detail panel 正常显示
8. Return to Explore 正常
9. 从首页点击 Explore 进入 guided mode 正常
10. guided dorm 图片正常
11. Information 跳转正常
12. Console 没有红色错误
13. Network 没有 JSON / GeoJSON / image 404

---

## 当前建议

当前不建议立刻拆 Three.js 渲染逻辑。

下一步如果要真正动 Explore，最安全的第一步是：

只抽出 guided mode 和 URL 参数解析逻辑。

原因：

这部分相对独立，并且可以通过首页 Explore 按钮快速测试。

建议 commit message：

Extract Explore guided mode helpers

不建议第一步做：

- 拆建筑渲染
- 拆 GeoJSON 坐标转换
- 拆 style.css
- 拆 label 点击逻辑
