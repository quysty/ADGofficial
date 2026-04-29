cat > DATA_SCHEMA.md <<'EOF'
# DATA_SCHEMA.md

## 作用

本文件记录宿舍数据的字段结构，防止后续数据分散、字段名混乱、页面读取错误。

当前目标：以后新增或修改宿舍信息时，优先修改一个集中数据文件，而不是在多个 HTML / JS 文件里手动改。

## 当前问题

宿舍数据目前分散在多个位置：

- script.js
- data.js
- explore.js
- detail-content.json
- functional-buildings.json

主要风险是同一类数据可能出现不同字段名。例如：

- tradeoff
- tradeOff

JavaScript 区分大小写，所以这两个不是同一个字段。后续统一使用：

- tradeOff

## 目标数据文件

未来建议使用：

- src/data/dorms.js

如果暂时不移动目录，也可以先整理现有 data.js，但长期目标是独立的宿舍数据文件。

## 推荐宿舍字段

每个宿舍对象建议包含：

- id：宿舍内部 id，例如 lena
- buildingId：地图建筑 id，例如 dorm_lena
- name：完整名称
- shortName：短名称
- image：主图路径
- pricePerWeek：每周价格，不知道就写 null
- type：住宿类型
- location：位置描述
- distance：距离或通勤描述
- tags：标签数组，用于未来筛选和推荐
- description：简短介绍
- bestFor：适合人群
- locationFeel：位置感受
- tradeOff：主要取舍或缺点
- pros：优点数组
- cons：缺点数组
- ranking：不同模式下的排序
- score：未来推荐算法可用的分数

## 字段规则

id 必须唯一，使用小写英文，不要有空格。

buildingId 必须和地图系统中的 id 对应，不要随便改。

image 暂时保留现有 Photo images/ 路径，不要在数据重构阶段同时移动图片。

pricePerWeek 不要编造。没有官方来源时写 null。

tradeOff 必须保持这个大小写，不要写成 tradeoff。

## URL 对应关系

Information 页面使用：

- information.html?dorm=lena

这里对应 dorm.id。

Explore 页面使用：

- explore.html?mode=guided&focus=dorm_lena&from=ranked

这里对应 dorm.buildingId。

## 重构优先级

第一步：统一首页宿舍数据。

第二步：让 ranked cards 和 compare table 读取同一份数据。

第三步：让 Information 页面读取 URL 参数。

第四步：再处理 Explore 地图详情数据。

第五步：最后再整理图片路径。
EOF
---

## 数据可见性字段

为了让 src/data/dorms.js 从“首页三张卡片数据”升级为“宿舍主数据表”，每个宿舍对象现在增加三个用途控制字段。

### isHomeCandidate

作用：控制该宿舍是否进入首页推荐卡片、ranked results 和 compare table。

true：可以出现在首页推荐区域。

false：该宿舍存在于主数据表中，但暂时不进入首页推荐区域。

当前首页 script.js 的规则是：只排除 isHomeCandidate 明确等于 false 的宿舍。也就是说，如果没有写 false，就默认可以进入首页。

### isInformationVisible

作用：控制该宿舍是否出现在 Information 页面总览和详情页中。

true：可以在 Information 页面显示。

false：暂时隐藏，不出现在 Information 总览页，也不作为正常详情页展示对象。

当前 Information 页面规则是：只排除 isInformationVisible 明确等于 false 的宿舍。

### isMapLinked

作用：标记该宿舍是否已经和 Explore 地图建筑建立关联。

true：该宿舍已有 buildingId 或 mapFocus，可以和 Explore 地图联动。

false：该宿舍暂时只有文字数据，还没有完成地图关联。

维护规则：

以后新增宿舍时，不要只写 name 和 description。必须同时判断：

- 是否进入首页推荐：isHomeCandidate
- 是否进入 Information 页面：isInformationVisible
- 是否已经连接地图：isMapLinked

如果某个宿舍数据还没写完整，建议先写：

isHomeCandidate: false
isInformationVisible: false
isMapLinked: false

等数据补全后，再逐步打开。

---

## 数据检查脚本

当前项目已经新增宿舍数据检查脚本：

tools/validate-dorm-data.js

运行命令：

node tools/validate-dorm-data.js

该脚本用于检查 src/data/dorms.js 是否符合当前数据 schema。

当前会检查：

- 必填字段是否存在
- id 是否唯一
- buildingId 是否唯一
- mapFocus 是否唯一
- 图片路径是否存在
- tags 是否为数组
- pros 是否为数组
- cons 是否为数组
- isHomeCandidate 是否为 true 或 false
- isInformationVisible 是否为 true 或 false
- isMapLinked 是否为 true 或 false

维护规则：

以后修改 src/data/dorms.js 时，不能只靠浏览器页面肉眼检查。必须先运行数据检查脚本，再做页面测试。

如果脚本报 ERROR，不要 commit。

如果脚本报 WARNING，应判断是否为可接受的临时状态，并在必要时记录到 BUG_LOG.md。

---

## 首页路径选项数据

当前项目已经将首页 Explore by Path 的选项配置迁移到：

src/data/path-options.js

该文件通过 window.PATH_OPTIONS 向 script.js 提供配置。

当前包含三个主要配置区：

- major
- habit
- requirement

### major

作用：

表示用户的学习方向或专业倾向。

当前规则：

Major 是单选。用户选择一个 major 后，当前 placeholder 推荐算法会根据该选择调整首页 ranked dorms 的顺序。

### habit

作用：

表示用户的生活方式偏好。

当前规则：

Lifestyle 可以多选，并且已选标签支持排序。

当前阶段：

Lifestyle 已经被界面记录，但推荐算法还没有完全使用它。后续可以把它接入评分模型。

### requirement

作用：

表示用户的住宿要求。

当前规则：

Requirements 可以多选，但不排序。

当前阶段：

Requirements 已经被界面记录，但推荐算法还没有完全使用它。后续可以把它接入筛选或评分逻辑。

维护规则：

如果只是修改首页选项内容，优先修改 src/data/path-options.js。

不要在 src/data/path-options.js 中写 DOM 操作、事件绑定、拖拽逻辑或推荐算法。

如果未来要新增筛选维度，应先更新 path-options.js，再更新 script.js 中对应的状态和渲染逻辑。

---

## 当前唯一宿舍数据源

旧根目录 data.js 已删除。

当前唯一宿舍主数据文件是：

src/data/dorms.js

该文件通过 window.DORM_DATA 向页面提供宿舍数据。

维护规则：

- 新增宿舍：修改 src/data/dorms.js
- 修改宿舍字段：修改 src/data/dorms.js
- 控制首页是否显示：修改 isHomeCandidate
- 控制 Information 是否显示：修改 isInformationVisible
- 控制是否连接地图：修改 isMapLinked

不要重新创建根目录 data.js。

每次修改 src/data/dorms.js 后，必须运行：

node tools/validate-dorm-data.js
