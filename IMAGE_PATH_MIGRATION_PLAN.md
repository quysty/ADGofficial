# IMAGE_PATH_MIGRATION_PLAN.md

## 作用

本文件记录项目图片路径迁移计划。

当前项目图片目录为：

Photo images/

未来目标目录为：

assets/images/

当前阶段只写计划，不移动图片，不修改路径。

---

## 当前问题

当前图片路径存在几个维护风险：

1. 图片目录名包含空格

当前目录名是：

Photo images/

这个路径在本地浏览器中可以工作，但在部署、脚本处理、URL 编码、路径迁移时更容易出错。

2. 图片引用分散

当前图片路径可能出现在：

- HTML 文件
- CSS 文件
- JavaScript 文件
- src/data/dorms.js
- Explore 相关脚本

这意味着不能只改一个地方。

3. Explore 页面可能依赖现有路径

Explore 页面之前对路径和样式变化比较敏感。因此图片迁移不能和 Explore、CSS、数据结构重构混在同一个 commit 中。

---

## 未来目标结构

目标图片目录：

assets/images/

未来图片路径示例：

assets/images/IMG_6336.jpeg
assets/images/IMG_6944.jpeg
assets/images/IMG_7082.jpeg

---

## 当前不执行的操作

当前阶段不要执行：

- 不移动 Photo images/
- 不删除 Photo images/
- 不批量替换图片路径
- 不修改 style.css
- 不修改 explore.js
- 不修改 src/data/dorms.js
- 不修改 HTML 图片路径

本阶段只做计划。

---

## 迁移前审查命令

真正迁移前，应先运行：

grep -R "Photo images" . --include="*.html" --include="*.css" --include="*.js" --exclude-dir=".git"

目标是列出所有仍然引用旧路径的位置。

---

## 推荐迁移顺序

### Step 1 - 创建新目录并复制图片

建议先复制，不要直接移动：

mkdir -p assets/images
cp "Photo images"/*.jpeg assets/images/

原因：

复制比移动更安全。如果新路径出错，旧路径仍然能让页面保持运行。

### Step 2 - 只更新宿舍数据图片路径

先改：

src/data/dorms.js

把宿舍卡片和 Information 页面使用的图片路径从：

Photo images/IMG_xxxx.jpeg

改成：

assets/images/IMG_xxxx.jpeg

不要同时改 CSS 背景图和 Explore 图片。

### Step 3 - 运行数据检查脚本

运行：

node tools/validate-dorm-data.js

确认 src/data/dorms.js 中的新图片路径都存在。

### Step 4 - 测试首页和 Information

检查：

- 首页卡片图片正常
- Information 页面图片正常
- Console 没有图片 404
- 首页推荐卡片仍然正常
- Information dorm detail 仍然正常

### Step 5 - 单独 commit

建议 commit message：

Update dorm image paths to assets directory

### Step 6 - 再处理 HTML placeholder 图片

后续单独处理：

- information.html
- question.html
- index.html 中直接写死的图片路径

不要和 src/data/dorms.js 同一轮混改。

### Step 7 - 再处理 CSS 图片路径

最后再处理：

style.css

原因：

style.css 是高风险文件，里面可能包含背景图和布局补丁。CSS 图片路径迁移应单独 commit。

### Step 8 - 确认旧目录是否可以删除

只有当以下命令没有任何输出时，才考虑删除旧目录：

grep -R "Photo images" . --include="*.html" --include="*.css" --include="*.js" --exclude-dir=".git"

如果仍有输出，不要删除旧目录。

---

## 测试清单

图片路径迁移后必须检查：

首页：

- Hero 图片正常
- Featured dorm card 图片正常
- Ranked dorm card 图片正常

Information：

- Overview 页面正常
- Dorm detail 图片正常
- Placeholder 图片正常

Question：

- Placeholder 图片正常

Explore：

- 3D 地图正常
- 3D / 2D 正常
- Numbers 正常
- Reset 正常
- 绿色宿舍标签可点击
- Guided dorm 图片正常

浏览器 Console / Network：

- 没有图片 404
- 没有红色 JavaScript 错误

---

## 回退原则

如果图片迁移失败，且还没有 commit，可以使用：

git restore .

如果新增了 assets/images/，git restore 不一定删除未追踪文件。必要时手动删除：

rm -rf assets

注意：

rm -rf assets 会删除整个 assets 文件夹。只有确认 assets 是本轮新增且不需要保留时才能执行。

---

## 当前结论

图片迁移可以做，但不能现在和其他结构改动混在一起。

推荐未来单独阶段执行：

1. 复制图片到 assets/images/
2. 先迁移 src/data/dorms.js
3. 测试并 commit
4. 再迁移 HTML placeholder 图片
5. 测试并 commit
6. 最后迁移 CSS 图片路径
7. 确认旧 Photo images/ 无引用后再删除

---

## Progress update - Step 1 completed

状态：
Completed

已完成：

- 创建 assets/images/
- 将 Photo images/ 中的 jpeg 图片复制到 assets/images/
- 将 src/data/dorms.js 中的 dorm.image 路径更新为 assets/images/
- 运行 node tools/validate-dorm-data.js
- 完成首页、Information、Explore 快速测试

尚未完成：

- HTML placeholder 图片路径迁移
- style.css 图片路径迁移
- explore.js 图片路径审查
- 删除旧 Photo images/ 目录

当前规则：

旧 Photo images/ 目录必须继续保留。只有当所有 HTML、CSS、JS 文件都不再引用 Photo images/ 时，才可以考虑删除旧目录。

下一步建议：

迁移 HTML placeholder 图片路径。该阶段应只修改 HTML 文件，不修改 CSS、不修改 explore.js、不删除旧目录。


---

## Progress update - Step 2 completed

状态：
Completed

已完成：

- 将 information.html 中的 placeholder 图片路径迁移到 assets/images/
- 将 question.html 中的 placeholder 图片路径迁移到 assets/images/
- 将 src/pages/information.js 中的 Information overview fallback 图片路径迁移到 assets/images/
- 完成 Information、Question、首页、Explore 快速测试

尚未完成：

- style.css 图片路径迁移
- explore.js 图片路径审查与迁移
- src/data/dorms.js 中过时注释清理
- 删除旧 Photo images/ 目录

当前规则：

Photo images/ 目录仍然不能删除，因为 explore.js 和 style.css 可能仍然引用旧路径。

下一步建议：

先审查 explore.js 中的图片路径用途。Explore 是高风险文件，不能直接批量替换；应先确认这些路径是否只用于 guided dorm image map，再决定是否迁移。


---

## Progress update - Step 3 completed

状态：
Completed

已完成：

- 审查 explore.js 中的 Photo images/ 引用
- 确认旧路径只出现在 GUIDED_DORM_IMAGE_MAP
- 将 GUIDED_DORM_IMAGE_MAP 图片路径迁移到 assets/images/
- 完成 Explore 页面和首页 guided mode 测试

尚未完成：

- style.css 图片路径迁移
- src/data/dorms.js 中过时注释清理
- 删除旧 Photo images/ 目录

当前规则：

Explore 图片路径已迁移，但不要因此删除 Photo images/。style.css 仍可能依赖旧目录。

下一步建议：

迁移 style.css 中的背景图路径。该阶段必须单独进行，只修改 style.css，并重点测试首页 Hero 背景和 Explore 页面是否受影响。


---

## Progress update - Step 4 completed

状态：
Completed

已完成：

- 将 style.css 中的背景图路径迁移到 assets/images/
- 保持首页 Hero 背景正常
- 完成首页和 Explore 快速测试

尚未完成：

- src/data/dorms.js 中过时注释清理
- 确认是否可以删除旧 Photo images/ 目录

当前规则：

style.css 图片路径已迁移，但不要进行 CSS 模块化。CSS 拆分应作为独立高风险阶段处理。


---

## Final update - Image path migration completed

状态：
Completed

已完成：

- 创建 assets/images/
- 复制旧图片到 assets/images/
- 迁移 src/data/dorms.js 中的 dorm.image 路径
- 迁移 information.html 和 question.html 中的 placeholder 图片路径
- 迁移 src/pages/information.js 中的 Information overview fallback 图片路径
- 迁移 explore.js 中的 guided dorm 图片路径
- 迁移 style.css 中的背景图路径
- 清理 src/data/dorms.js 中关于 Photo images/ 的过时注释
- 确认运行文件不再引用 Photo images/
- 删除旧 Photo images/ 目录

当前统一图片目录：

assets/images/

维护规则：

以后新增图片时，默认放入 assets/images/。

不要重新创建 Photo images/。

如果未来再次迁移图片目录，必须分阶段处理，并分别测试首页、Information、Question、Explore 和 Network 404。
