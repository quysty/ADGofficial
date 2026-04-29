# TESTING_CHECKLIST.md

## 作用

本文件记录每次前端结构整理后的固定测试流程。

以后每次修改代码后，不要只看页面“好像能打开”，而是按本清单逐项检查。只有测试通过后，才允许 commit。

---

## 1. Git 状态检查

修改前必须先执行：

git status

理想状态：

nothing to commit, working tree clean

如果不是 clean，不要开始新一轮修改。先确认上一次修改是否已经 commit，或者是否需要回退。

---

## 2. 首页基础加载测试

打开：

index.html

检查：

- 页面能正常打开
- Hero 区域显示正常
- Explore by Path 区域显示正常
- Major / Lifestyle / Requirements 三个面板显示正常
- Continue 按钮存在
- Reset 按钮存在
- 页面没有明显布局错位

---

## 3. 首页偏好选择测试

检查：

- Major 标签可以点击
- Lifestyle 标签可以选择
- Requirements 标签可以选择
- Reset 按钮在选择后变为可用
- Reset 后选择状态被清空
- Continue 后能滚动或跳转到 ranked results 区域

---

## 4. Ranked dorm cards 测试

检查：

- ranked dorm cards 正常显示
- 至少显示 3 个宿舍卡片
- 卡片图片正常加载
- 卡片标题正常
- 卡片 summary 正常
- 排名数字正常显示
- Explore 按钮存在
- Information 按钮存在

---

## 5. Selected summary 测试

检查：

- 初始状态显示 No dorm selected yet
- 选择宿舍后，summary 更新为对应宿舍
- Best for 正常显示
- Location feel 正常显示
- Main trade-off 正常显示
- 不出现 undefined
- 不出现空白字段

---

## 6. Compare table 测试

检查：

- Compare table 正常显示
- 表格至少有 3 行宿舍数据
- Default 按钮可用
- Quiet-first 按钮可用
- City-first 按钮可用
- Value-first 按钮可用
- 切换模式后排序或显示结果正常
- 不出现 undefined

---

## 7. 首页跳转测试

检查每张宿舍卡片的按钮：

Explore 按钮应跳转到类似：

explore.html?mode=guided&focus=dorm_lena&from=ranked

Information 按钮应跳转到类似：

information.html?dorm=lena

注意：

Information 页面目前仍是 placeholder。只检查 URL 是否正确，不要求它显示真实宿舍详情。

---

## 8. Explore 页面基础测试

打开：

explore.html

检查：

- 3D 地图正常显示
- 3D / 2D 按钮正常
- Numbers 按钮正常
- Reset 按钮正常
- 绿色宿舍标签正常显示
- 绿色宿舍标签可点击
- 右侧 overview panel 正常显示
- 点击宿舍后 detail panel 正常显示
- Return to Explore 按钮正常

---

## 9. Explore guided mode 测试

从首页点击宿舍卡片的 Explore 按钮进入 Explore 页面。

检查：

- URL 中包含 mode=guided
- URL 中包含 focus=dorm_xxx
- Explore 页面没有死机
- 地图仍然可以操作
- 详情内容或聚焦状态没有破坏基础地图功能

---

## 10. Information 页面测试

打开：

information.html

检查：

- 页面正常显示
- placeholder 图片正常
- 抽屉导航正常

打开类似：

information.html?dorm=lena

检查：

- 页面仍然正常显示
- URL 参数不会导致页面报错

注意：

Information 页面目前不是正式宿舍详情页。真实动态详情属于后续阶段。

---

## 11. Question 页面测试

打开：

question.html

检查：

- 页面正常显示
- placeholder 图片正常
- 抽屉导航正常

---

## 12. 导航测试

在每个页面检查：

- 左上角菜单按钮正常显示
- 点击后抽屉导航打开
- 点击遮罩或关闭按钮后抽屉关闭
- 当前页面高亮正常
- 首页 / Explore / Information / Question 链接正常

---

## 13. 浏览器 Console 测试

打开浏览器开发者工具 Console。

检查：

- 没有红色 JavaScript 报错
- 没有 Dorm data is missing
- 没有 DormCardComponent is missing
- 没有 DormSummaryComponent is missing
- 没有 undefined 相关错误
- 没有明显资源 404 错误

如果出现红色错误，不要 commit。先记录错误内容。

---

## 14. 文件改动范围检查

修改后执行：

git status --short

确认只改了本轮计划中的文件。

如果本轮只拆首页组件，不应该出现：

- M style.css
- M explore.js
- M explore.html
- D data.js
- M topo/...
- M config/...

如果出现这些，先停，不要 commit。

---

## 15. Commit 前最终检查

commit 前必须满足：

- 首页测试通过
- Explore 测试通过
- Console 没有红色错误
- git status --short 只显示本轮预期文件
- 没有误改高风险文件

通过后再执行：

git add ...
git commit -m "具体说明本轮完成了什么"

---

## 16. 回退原则

如果本轮修改失败，且还没有 commit，可以使用：

git restore .

注意：

这会丢弃所有已追踪文件的未提交修改。

如果本轮新增了 untracked 文件，例如：

src/components/NewComponent.js

git restore . 不一定会删除它，需要手动删除：

rm src/components/NewComponent.js

不要在页面坏掉后继续盲目叠加修改。优先恢复到上一个 clean commit。

---

## 17. 宿舍数据检查脚本

每次修改 src/data/dorms.js 后，必须运行宿舍数据检查脚本。

命令：

node tools/validate-dorm-data.js

理想结果：

Dorm data validation passed. Checked 3 dorm records.

如果出现 ERROR：

不要 commit。先修复 src/data/dorms.js 中的数据问题。

常见 ERROR 类型：

- 缺少必填字段
- id 重复
- buildingId 重复
- mapFocus 重复
- image 路径不存在
- tags 不是数组
- pros 不是数组
- cons 不是数组
- isHomeCandidate 不是 true 或 false
- isInformationVisible 不是 true 或 false
- isMapLinked 不是 true 或 false

如果出现 WARNING：

先判断是否可以暂时接受。WARNING 不一定会导致页面坏掉，但应该记录原因。

推荐顺序：

1. 修改 src/data/dorms.js
2. 运行 node tools/validate-dorm-data.js
3. 打开首页测试
4. 打开 Information 页面测试
5. 打开 Explore 页面测试
6. Console 无红色错误后再 commit
