# Supabase 官网发布权限边界

这个文档说明 ANU Explore 管理后台第一版的后端发布边界。

## Supabase 管理员允许修改什么

第一版只开放三个已经相对成熟的数据区域：

- 宿舍详情文字和标签：`public.building_label_overrides`，并且只允许 `display_mode = 'dorm'`、`type_key = 'dorm'` 的行。
- 建筑高度调整：`public.building_height_overrides`。
- 官网页面配置：只允许发布 `config/published/site-pages.json`，用于控制官网页面的显示 / 隐藏和菜单顺序。

其他内容仍然归本地工程文件 / GitHub 工作流管理，不能通过 Supabase 管理后台直接改：

- 入口。
- 道路。
- 圈地区域。
- 摄像机预设。
- 建筑几何和地图源文件。
- `topo-lab` 原始地图数据。

在前面的 admin 表都已经建好之后，运行：

```text
supabase/patch-public-page-publish-requests.sql
```

它会新增：

- `public.public_page_publish_requests`
- 一个发布请求 RPC：`public.enqueue_public_page_publish(scope, details)`
- 数据库侧工程日志：写入 `public.admin_operation_logs`
- 一个安全触发器：阻止已登录管理员修改非宿舍标签行，也会锁住宿舍行里不该动的字段

## 允许写入 public 官网仓库的文件

Supabase Edge Function 只能向 public GitHub Pages 仓库写入下面这些生成文件：

- `config/published/dorm-details.json`
- `config/published/building-heights.json`
- `config/published/site-pages.json`
- `config/published/publish-manifest.json`

这个函数不能写地图源文件、入口文件、道路文件，也不能改网页代码。

## Edge Function 设置

函数文件路径：

```text
supabase/functions/publish-public-pages/index.ts
```

需要配置的环境变量：

```text
SUPABASE_URL=https://gjigfyndgqpxzqmprptr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>
GITHUB_OWNER=quysty
GITHUB_REPO=ANUdormguide
GITHUB_BRANCH=main
GITHUB_TOKEN=<GitHub token scoped to the public Pages repo>
```

浏览器里的 admin 页面永远不会拿到 `GITHUB_TOKEN` 或 `SUPABASE_SERVICE_ROLE_KEY`。

Edge Function 还要求请求头里带有已登录管理员的 `Authorization` token。它会先检查 `auth.users` 和 `public.admin_users`，确认是管理员之后才会碰 GitHub。

## 工程日志

每一个管理员动作都应该在 `public.admin_operation_logs` 里留下一条记录。

发布流程是：

1. Admin 页面调用 `enqueue_public_page_publish`。
2. RPC 在 `public_page_publish_requests` 里创建一条 `queued` 发布请求。
3. RPC 同时写入一条 `request_public_pages_publish` 工程日志。
4. Edge Function 把发布请求更新为 `running`、`succeeded` 或 `failed`。
5. Edge Function 再写入 `complete_public_pages_publish` 或 `fail_public_pages_publish` 工程日志。

这样工程日志就能显示：谁在什么时候做了什么、操作的是哪张表/哪个对象、最终成功还是失败。
