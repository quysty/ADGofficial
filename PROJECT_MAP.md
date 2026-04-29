# PROJECT_MAP.md

## 1. 项目名称

ANU Dorm Guide

中文定位：ANU 宿舍推荐与校园住宿信息辅助网站。

当前项目不是平台级系统，而是一个静态前端项目。当前重点不是继续加功能，而是把已经能运行的 AI 拼装代码整理成可维护、可回退、可扩展的工程结构。

---

## 2. 当前项目类型

这是一个静态前端项目，主要由以下内容组成：

- HTML 页面
- CSS 样式
- JavaScript 脚本
- JSON 配置数据
- GeoJSON 地图数据
- 本地图片资源
- Three.js CDN 地图库

当前项目不是：

- React 项目
- Vue 项目
- Next.js 项目
- 后端项目
- 数据库项目
- 登录系统
- Docker 项目

当前原则：

- 不引入复杂框架
- 不重写整个项目
- 不大幅改变现有视觉效果
- 不一次性移动太多文件
- 每个稳定阶段都用 Git commit 保存

---

## 3. 当前核心页面文件

### index.html

作用：

首页文件。负责展示网站入口、偏好选择区、宿舍推荐结果和对比表。

当前包含：

- Hero 首页大图区域
- Explore by Path 偏好选择系统
- Major / Lifestyle / Requirements 三个选择面板
- Ranked dorm results 宿舍排序结果
- Selected dorm summary 选中宿舍摘要
- Mini Compare Snapshot 对比表
- 全站导航挂载点 site-nav-root

加载的文件：

- style.css
- data.js
- nav.js
- script.js

风险等级：高。

原因：

index.html 和 script.js 强绑定。很多 DOM id 被 JavaScript 精确读取，例如：

- majorOptions
- habitOptions
- requirementOptions
- rankedDormGrid
- selectedDormSummary
- compare-body
- pathContinueBtn
- pathResetBtn

规则：

不要随便改 index.html 里的 id。如果必须改，必须同步修改 script.js，并完整测试首页功能。

---

### explore.html

作用：

Explore 地图页。负责提供 3D / 2D 校园地图的页面结构。

当前包含：

- Three.js import map
- 3D / 2D 切换按钮
- Numbers 标签显示按钮
- Reset 重置按钮
- 地图容器 map3dContainer
- 左侧地图区域
- 右侧 overviewPanel
- 右侧 detailPanel
- Return to Explore 返回按钮

加载的文件：

- style.css
- nav.js
- explore.js

风险等级：非常高。

原因：

explore.html 与 explore.js、Three.js、GeoJSON 数据、JSON 配置、CSS 布局强绑定。任何 DOM id 改动都可能导致地图加载、按钮交互或详情栏失效。

规则：

第一轮重构不要动 explore.html 和 explore.js。Explore 地图是单独阶段，必须在首页数据结构稳定后再处理。

---

### information.html

作用：

Information 信息页，目前是占位页面。

当前包含：

- 页面标题
- placeholder 图片
- 简单说明文字
- 全站导航挂载点

加载的文件：

- style.css
- nav.js

风险等级：低。

当前限制：

虽然其他页面可能跳转到类似：

information.html?dorm=lena

但 information.html 目前没有读取 dorm 参数，也不会根据不同宿舍渲染不同内容。

规则：

不要误以为 Information 页面已经是真正详情页。它目前只是未来详情页的入口占位。

---

### question.html

作用：

Question 问题页，目前是占位页面。

当前包含：

- 页面标题
- placeholder 图片
- 简单说明文字
- 全站导航挂载点

加载的文件：

- style.css
- nav.js

风险等级：低。

当前限制：

还没有 FAQ、问答系统、推荐问卷或用户输入逻辑。

规则：

当前阶段不做 Question 页面功能。等数据结构稳定后再扩展。

---

## 4. 当前 JavaScript 文件

### script.js

作用：

首页主逻辑文件。

当前负责：

- 首页按钮滚动
- Major / Lifestyle / Requirements 选项渲染
- 三个偏好面板的拖拽排序
- Lifestyle 已选标签排序
- Continue / Reset 按钮状态
- 推荐宿舍卡片渲染
- Compare table 渲染
- Selected summary 渲染
- Explore 页面跳转
- Information 页面跳转
- 首页内部状态管理
- 部分宿舍数据

风险等级：非常高。

核心问题：

script.js 同时承担了数据、状态、渲染、事件、跳转和排序逻辑。职责过多，是当前首页后续维护成本上升的主要原因。

重构规则：

第一步只做数据集中化。不要一上来重写整个 script.js。不要和 CSS、Explore 地图一起改。

---

### data.js

作用：

当前已有的宿舍数据文件。

当前问题：

项目里已经存在 data.js，但 script.js 里也有自己的宿舍数据。也就是说，数据并没有真正统一。

已知风险：

字段名可能不一致，例如：

- tradeoff
- tradeOff

JavaScript 区分大小写，所以这两个字段不是同一个字段。

风险等级：中到高。

重构规则：

不能简单把 data.js 接入 script.js。必须先统一字段结构，再让首页读取统一数据源。

---

### nav.js

作用：

全站抽屉导航组件。

当前负责：

- 生成左上角菜单按钮
- 生成抽屉导航
- 生成遮罩层
- 根据 body[data-page] 判断当前页面
- 控制导航打开和关闭

风险等级：低到中。

评价：

nav.js 是当前项目里最接近“可复用组件”的文件，职责相对清楚。

规则：

当前不需要优先重构 nav.js。后续如果建立 src/components，可以再考虑移动或改名。

---

### explore.js

作用：

Explore 地图页主逻辑文件。

当前负责：

- 创建 Three.js 场景
- 加载 GeoJSON 地图数据
- 加载 JSON 配置
- 生成建筑体块
- 生成道路、绿地、水体、树木等地图图层
- 生成建筑标签
- 处理 3D / 2D 切换
- 处理 Numbers 标签开关
- 处理 Reset
- 处理地图点击
- 处理右侧详情栏
- 处理 guided mode URL 参数
- 处理从地图跳转到 Information 页面

风险等级：极高。

原因：

explore.js 文件很大，混合了地图渲染、数据加载、几何处理、UI 状态、URL 参数和页面跳转。它是当前项目最高风险文件之一。

规则：

第一轮不要重构 explore.js。最多只做非常小、非常明确、能单独测试的修改。

---

## 5. 当前 CSS 文件

### style.css

作用：

全站全局样式文件。

当前负责：

- 全局基础样式
- 首页 Hero
- 首页路径选择系统
- 宿舍推荐卡片
- Compare table
- 抽屉导航
- Information / Question 占位页
- Explore 地图布局
- Explore 工具栏
- Explore 标签样式
- Explore detail panel
- 多段后期 override 补丁

风险等级：非常高。

核心问题：

style.css 很长，并且存在多段重复选择器和后期覆盖补丁。某些视觉效果依赖 CSS 的顺序和 !important。

规则：

不要在数据重构阶段整理 CSS。CSS 模块化应作为后续单独阶段处理。

未来可能拆分为：

- styles/base.css
- styles/nav.css
- styles/home.css
- styles/explore.css
- styles/subpages.css

---

## 6. 当前数据与配置文件

### config/building-types.json

作用：

定义地图建筑类型的视觉样式。

当前类型包括：

- dorm
- academic
- retail

用于：

- Explore 地图建筑颜色
- 建筑标签样式
- 选中状态样式

风险等级：中。

规则：

不要随便改 dorm、academic、retail 这些 key。它们可能被 explore.js 和 functional-buildings.json 使用。

---

### config/functional-buildings.json

作用：

把地图建筑编号连接到具体功能建筑。

当前字段包括：

- buildingId
- type
- name
- shortName
- interactive

用于：

- 判断哪些建筑可点击
- 判断哪些是 dorm
- 判断地图 label 显示什么
- 判断点击后打开什么详情

风险等级：高。

规则：

不要随便改 buildingId。它会影响首页跳转到 Explore 的 focus 参数，也会影响地图详情。

---

### config/detail-content.json

作用：

存储部分地图详情面板内容。

当前包含：

- dorm 详情占位内容
- academic 详情占位内容
- retail 详情占位内容

风险等级：中。

当前问题：

Explore 页的详情内容不一定完全来自 detail-content.json。explore.js 里可能仍然存在 hard-coded guided dorm content。

规则：

后续应逐步减少 detail-content.json 和 explore.js 之间的数据重复，但不要在第一轮首页数据重构中处理。

---

## 7. 当前地图数据文件

### topo/buildings.geojson

作用：

Explore 地图建筑轮廓数据。

风险等级：极高。

规则：

不要手动修改。除非明确要修地图几何数据。

---

### topo/roads.geojson

作用：

道路图层数据。

风险等级：中。

规则：

作为只读地图数据处理。

---

### topo/green.geojson

作用：

绿地图层数据。

风险等级：中。

规则：

作为只读地图数据处理。

---

### topo/trees.geojson

作用：

树木图层数据。

风险等级：中。

规则：

作为只读地图数据处理。

---

### topo/water0.geojson 和 topo/water2.geojson

作用：

水体图层数据。

风险等级：中。

规则：

作为只读地图数据处理。

---

### anu_buildings.geojson

作用：

可能是备用建筑数据或旧版地图数据。

当前判断：

如果 explore.js 没有引用它，就暂时不要删除。

规则：

没有确认用途前，不删文件。

---

## 8. 当前图片资源

当前图片目录：

Photo images/

已知图片路径分散在：

- style.css
- index.html
- information.html
- question.html
- script.js
- explore.js
- data.js

当前问题：

图片目录名包含空格。它在本地浏览器中通常可用，但后续部署、路径迁移或 JS 动态加载时更容易出错。

风险等级：高。

规则：

第一轮不要移动图片。先完成宿舍数据集中化，再单独处理图片路径。

未来目标目录：

assets/images/

---

## 9. 当前页面跳转关系

### 首页到 Explore

当前可能使用：

explore.html?mode=guided&focus=dorm_lena&from=ranked

含义：

- mode=guided 表示从推荐结果进入地图导览
- focus=dorm_lena 表示聚焦某个宿舍建筑
- from=ranked 表示来源是首页推荐结果

风险：

focus 值必须和地图系统里的 buildingId 对得上。

---

### 首页到 Information

当前可能使用：

information.html?dorm=lena

含义：

- dorm=lena 表示 Information 页面应该显示 Lena 的内容

当前限制：

Information 页面还没有真正读取 dorm 参数。

---

### Explore 到 Information

Explore 页也可能跳转到：

information.html?dorm=...

当前限制：

目标页面仍然是静态 placeholder。

---

## 10. 当前高风险文件清单

### 最高风险

- explore.js
- style.css
- script.js

原因：

这些文件又大又复杂，且承担多个职责。

### 中高风险

- config/functional-buildings.json
- config/detail-content.json
- data.js
- 图片路径

原因：

它们涉及页面跳转、地图建筑 id、宿舍详情和资源加载。

### 低风险

- information.html
- question.html
- nav.js

原因：

这些文件目前功能较简单，改动影响范围较小。

---

## 11. 当前最安全的改动顺序

推荐顺序：

1. Git 保存当前稳定版本
2. 添加工程文档
3. 建立基础目录结构
4. 集中宿舍数据
5. 让首页读取集中宿舍数据
6. 抽出首页宿舍卡片相关组件
7. 测试首页
8. 再考虑 Information 页面动态化
9. 最后再碰 Explore 和 CSS

禁止顺序：

- 不要先重写 explore.js
- 不要先拆 style.css
- 不要先移动图片
- 不要一次性把所有文件放进 src
- 不要同时做数据、样式、地图、页面跳转四类改动

---

## 12. 当前下一步

当前已完成：

- Git 初始化
- 当前可运行版本 commit
- .gitignore 清理
- 基础工程文档创建

下一步建议：

先确认 Git 干净，然后建立基础目录结构：

- src/data
- src/components
- src/utils

之后再开始最小数据重构。


---

## 13. 当前组件文件记录

### src/components/DormCard.js

作用：

首页宿舍卡片组件文件。

当前负责：

- 生成 Featured dorm cards 的卡片 HTML
- 生成 Ranked dorm cards 的卡片 HTML
- 处理宿舍卡片中的图片 fallback
- 对输出到 HTML 的文本做基础转义，降低 HTML 注入风险

不负责：

- 不负责宿舍数据读取
- 不负责排序
- 不负责筛选
- 不负责按钮事件绑定
- 不负责页面跳转
- 不负责 DOM 插入
- 不负责样式

由谁调用：

- script.js

当前职责边界：

- src/data/dorms.js 负责宿舍数据
- src/components/DormCard.js 负责宿舍卡片 HTML
- script.js 负责首页状态、排序、渲染流程和事件绑定

风险等级：低到中。

规则：

不要把排序、跳转、筛选逻辑写进 DormCard.js。这个文件只应该生成卡片结构。

---

## 14. DormSummary 组件记录

### src/components/DormSummary.js

作用：

首页 selected dorm quick summary 组件文件。

当前负责：

- 生成默认 summary 内容
- 生成已选宿舍 summary 内容
- 展示 dorm.name
- 展示 dorm.bestFor
- 展示 dorm.locationFeel
- 展示 dorm.tradeOff
- 展示 dorm.summary
- 对输出到 HTML 的文本做基础转义

不负责：

- 不负责读取宿舍数据
- 不负责决定哪个宿舍被选中
- 不负责按钮事件
- 不负责页面跳转
- 不负责 DOM 插入
- 不负责样式

由谁调用：

- script.js

当前职责边界：

- src/data/dorms.js 负责宿舍数据
- src/components/DormSummary.js 负责 summary HTML
- script.js 负责首页状态变化和 DOM 更新时机

风险等级：低。

规则：

不要把选择逻辑、排序逻辑或跳转逻辑写进 DormSummary.js。这个文件只应该生成 summary 展示结构。

---

## 15. DormList 组件记录

### src/components/DormList.js

作用：

首页宿舍卡片列表组件文件。

当前负责：

- 接收 dorms 数组
- 调用 DormCardComponent.createDormCard
- 生成 Featured dorm cards 的列表 HTML
- 生成 Ranked dorm cards 的列表 HTML
- 在需要时生成 #1 / #2 / #3 排名标签

不负责：

- 不负责宿舍数据读取
- 不负责排序
- 不负责筛选
- 不负责按钮事件绑定
- 不负责页面跳转
- 不负责 DOM 插入
- 不负责样式

由谁调用：

- script.js

依赖关系：

- DormList.js 依赖 DormCard.js
- index.html 中 DormCard.js 必须先于 DormList.js 加载
- script.js 必须晚于 DormList.js 加载

当前职责边界：

- src/data/dorms.js 负责宿舍数据
- src/components/DormCard.js 负责单张宿舍卡片 HTML
- src/components/DormList.js 负责宿舍卡片列表 HTML
- src/components/DormSummary.js 负责 selected summary HTML
- script.js 负责首页状态、排序、DOM 插入、事件绑定和页面跳转

风险等级：低到中。

规则：

不要把排序、筛选、点击事件、跳转逻辑写进 DormList.js。这个文件只负责把数组渲染成卡片列表 HTML。

---

## 16. 宿舍数据可见性控制

当前 src/data/dorms.js 已经不再只是首页三张卡片的数据来源，而是开始向宿舍主数据表过渡。

新增字段：

- isHomeCandidate
- isInformationVisible
- isMapLinked

### isHomeCandidate

控制宿舍是否进入首页推荐区域。

使用位置：

- script.js

当前规则：

首页只使用 isHomeCandidate 不等于 false 的宿舍。

### isInformationVisible

控制宿舍是否进入 Information 页面。

使用位置：

- src/pages/information.js

当前规则：

Information 页面只使用 isInformationVisible 不等于 false 的宿舍。

### isMapLinked

标记宿舍是否已经和 Explore 地图建立关联。

当前用途：

目前主要作为数据结构标记。后续可以用它控制是否显示 Explore 按钮，或者是否允许 guided map 跳转。

维护规则：

以后新增宿舍时，必须同时判断：

- 是否进入首页推荐
- 是否进入 Information 页面
- 是否已经有地图关联

如果宿舍数据还不完整，优先设置为：

isHomeCandidate: false
isInformationVisible: false
isMapLinked: false

---

## 17. 工具脚本记录

### tools/validate-dorm-data.js

作用：

宿舍数据完整性检查脚本。

当前负责检查：

- src/data/dorms.js 是否存在
- window.DORM_DATA 是否为数组
- 每个宿舍是否包含必填字段
- id 是否唯一
- buildingId 是否唯一
- mapFocus 是否唯一
- image 指向的本地图片是否存在
- tags 是否为数组
- pros 是否为数组
- cons 是否为数组
- isHomeCandidate 是否为布尔值
- isInformationVisible 是否为布尔值
- isMapLinked 是否为布尔值

运行命令：

node tools/validate-dorm-data.js

使用时机：

每次修改 src/data/dorms.js 后，都应先运行该脚本。脚本通过后，再进行浏览器页面测试。

风险等级：

低。

原因：

该脚本只读取数据并输出检查结果，不会修改网页文件，不会影响页面运行。

维护规则：

不要把网页渲染逻辑写进 tools/validate-dorm-data.js。这个文件只负责数据检查。

---

## 18. 首页路径选项配置文件

### src/data/path-options.js

作用：

首页 Explore by Path 的选项配置文件。

当前负责：

- Major 面板的选项配置
- Lifestyle 面板的选项配置
- Requirements 面板的选项配置
- 为 script.js 提供 window.PATH_OPTIONS

不负责：

- 不负责按钮点击事件
- 不负责拖拽排序
- 不负责 DOM 渲染
- 不负责 Continue / Reset
- 不负责宿舍推荐算法
- 不负责页面跳转
- 不负责样式

由谁调用：

- script.js

加载要求：

index.html 必须在 script.js 之前加载 src/data/path-options.js。

当前职责边界：

- src/data/dorms.js 负责宿舍数据
- src/data/path-options.js 负责首页路径选项配置
- src/components/DormCard.js 负责单张宿舍卡片 HTML
- src/components/DormList.js 负责宿舍卡片列表 HTML
- src/components/DormSummary.js 负责 selected summary HTML
- script.js 负责首页状态、拖拽、渲染流程、事件绑定、排序和跳转

风险等级：低到中。

维护规则：

以后如果只是修改 Major、Lifestyle、Requirements 的选项文字或选项数量，优先修改 src/data/path-options.js，不要直接改 script.js。

不要把事件逻辑、推荐逻辑或 DOM 操作写进 path-options.js。这个文件只保存配置数据。

---

## 19. Legacy data.js 已删除

旧根目录 data.js 已经删除。

当前宿舍数据主来源：

- src/data/dorms.js

当前规则：

- 不再使用根目录 data.js
- 不再使用旧的 const dorms 全局变量
- 页面应通过 src/data/dorms.js 提供的 window.DORM_DATA 读取宿舍数据

受影响页面：

- index.html 加载 src/data/dorms.js
- information.html 加载 src/data/dorms.js

维护规则：

以后新增、修改、隐藏、显示宿舍信息，都应修改 src/data/dorms.js。

不要重新创建根目录 data.js。否则项目会再次出现两套宿舍数据源，增加维护风险。

---

## 20. 图片路径迁移计划

当前图片目录仍然是：

Photo images/

未来目标目录是：

assets/images/

当前阶段只新增迁移计划，不移动图片。

计划文件：

- IMAGE_PATH_MIGRATION_PLAN.md

维护规则：

图片路径迁移不能和 Explore、CSS、数据结构、部署混在同一个 commit 中。

未来迁移时，应先复制图片到 assets/images/，再分阶段修改 src/data/dorms.js、HTML placeholder 图片、style.css 中的路径。

在确认没有任何文件继续引用 Photo images/ 之前，不要删除旧图片目录。

---

## 21. assets/images 图片目录

当前项目已新增图片资源目录：

- assets/images/

当前用途：

- src/data/dorms.js 中的宿舍主图已经改为读取 assets/images/ 下的图片。

仍未迁移：

- HTML 文件中直接写死的 placeholder 图片
- style.css 中的背景图
- explore.js 中可能存在的图片路径
- 旧 Photo images/ 目录

维护规则：

以后 dorm.image 字段应优先使用 assets/images/ 路径。

不要删除 Photo images/，直到确认以下命令没有任何旧路径引用：

grep -R "Photo images" . --include="*.html" --include="*.css" --include="*.js" --exclude-dir=".git"

图片迁移必须继续分阶段执行，不要一次性修改 HTML、CSS、Explore 和数据文件。


---

## 22. Placeholder 图片路径迁移状态

当前已迁移到 assets/images/ 的图片引用：

- src/data/dorms.js 中的 dorm.image
- information.html 中的 placeholder 图片
- question.html 中的 placeholder 图片
- src/pages/information.js 中的 Information overview fallback 图片

仍未迁移：

- style.css 中的图片路径
- explore.js 中的图片路径
- 旧 Photo images/ 目录

维护规则：

不要删除 Photo images/，直到确认 HTML、CSS、JS 文件中不再引用该目录。

检查命令：

grep -R "Photo images" . --include="*.html" --include="*.css" --include="*.js" --exclude-dir=".git"

如果仍有输出，说明旧目录仍然被项目使用，不能删除。


---

## 23. Explore guided 图片路径迁移状态

当前 explore.js 中的 GUIDED_DORM_IMAGE_MAP 已迁移到 assets/images/。

已迁移位置：

- explore.js 中 Lena / Warrumbul / Wright 的 guided dorm 图片路径

当前仍未迁移：

- style.css 中的背景图路径
- src/data/dorms.js 中关于 Photo images/ 的过时注释
- 旧 Photo images/ 目录

维护规则：

Explore 是高风险文件。以后修改 explore.js 时，必须明确区分图片路径、地图渲染、详情面板、guided mode、建筑数据加载，不要把这些改动混在同一个 commit 中。


---

## 24. style.css 图片路径迁移状态

style.css 中的旧背景图路径已经迁移到 assets/images/。

已迁移位置：

- style.css 中的 Hero / 背景图片路径

当前仍需检查：

- src/data/dorms.js 中是否还有关于 Photo images/ 的过时注释
- 项目中是否仍有真实文件引用 Photo images/

维护规则：

style.css 仍然是高风险全局样式文件。以后不要把图片路径修改、布局修改、CSS 模块化混在同一个 commit 中。


---

## 25. 图片资源目录最终状态

当前项目图片资源目录已经统一为：

assets/images/

旧目录已经删除：

Photo images/

当前规则：

- 宿舍数据图片使用 assets/images/
- HTML placeholder 图片使用 assets/images/
- Information overview fallback 图片使用 assets/images/
- Explore guided dorm 图片使用 assets/images/
- style.css 背景图使用 assets/images/

维护规则：

以后新增图片时，应放入 assets/images/。

不要重新创建 Photo images/ 目录。

如果页面出现图片 404，优先检查：

- 图片文件是否存在于 assets/images/
- 路径大小写是否一致
- HTML / CSS / JS 中是否写错相对路径
- Network 面板是否显示 404


---

## 26. Explore 重构计划

当前新增计划文件：

- EXPLORE_REFACTOR_PLAN.md

Explore 当前核心文件：

- explore.html
- explore.js
- style.css
- config/
- topo/

当前判断：

explore.js 是项目最高风险文件之一。它同时负责地图渲染、数据加载、标签、按钮、详情栏、guided mode 和页面跳转。

维护规则：

不要在没有计划的情况下直接重写 explore.js。

不要把 Explore 重构和 CSS 拆分、图片路径、数据结构、部署混在同一个 commit 中。

后续如需重构 Explore，应优先参考 EXPLORE_REFACTOR_PLAN.md。


---

## 27. 前端整理阶段总结文档

当前新增阶段总结文件：

- FRONTEND_CLEANUP_SUMMARY.md

作用：

记录当前前端工程整理阶段的完成状态、剩余风险和下一阶段路线。

使用规则：

后续重新开始开发前，应优先阅读：

- FRONTEND_CLEANUP_SUMMARY.md
- PROJECT_MAP.md
- ROADMAP.md
- TESTING_CHECKLIST.md

该文档不参与网页运行，只作为项目维护入口。
