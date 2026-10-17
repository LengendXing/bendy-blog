# 维护记录

## 2026-10-17 - REQ-202610-1026 项目排序稳定与重排

### 变更内容

- 新增 `lib/project-order.ts`：统一项目排序规则（`sortOrder` → `createdAt` → `id`），提供 `nextProjectSortOrder`、`sortProjects`、`moveProjectId` 与创建/更新载荷校验。
- `app/api/projects`：GET 增加 `createdAt`、`id` 次级排序，消除默认 0 并列时的数据库返回顺序不稳定；POST 未显式指定排序时按当前最大值 +1 自动追加；PUT 改为白名单字段校验；新增 PATCH 全量重排接口，在事务内按顺序重编号。
- `app/admin/projects`：新建项目不再提交默认 0，保存后按统一规则排序；列表增加上移/下移按钮，通过 PATCH 持久化新顺序。
- 新增 `lib/project-order.test.ts` 7 项单元测试，覆盖自动追加、稳定排序、重排边界、载荷校验与不可变更新。

### 影响范围

- 用户端 `/projects` 列表顺序与后台项目管理操作；接口字段、数据库结构与环境变量未变。
- 已有并列 `sortOrder` 的历史数据无需迁移：前台按创建时间稳定展示，后台执行一次上移/下移后会重编号为连续序号。

### 验证情况

- `npm test`：13/13 通过；`npx tsc --noEmit`：0 error；`NODE_ENV=production npm run build`：通过。

## v0.1.1 - 2026-08-31

### 变更内容

- 增加全局像素风页面切换过渡，并在用户偏好减少动态效果或持续低帧率时自动降级。
- 为博客列表、项目页、关于页、文章详情和评论区增加骨架屏及平滑内容切换。
- 列表请求采用 1.5 秒延迟阈值，快速响应不闪现骨架屏。
- 统一图片加载组件，提供懒加载、异步解码、占位图、错误态和尺寸约束，降低布局偏移。
- 修正所有像素贪吃蛇加载器的轨道，使蛇沿外圈运动并避开中英文标语。
- 补充加载阈值与蛇形轨道纯逻辑测试，升级 Next.js 与受影响依赖并移除未使用依赖。

### 影响范围

- 用户端博客列表、项目、关于、文章详情及评论展示。
- 管理端头像、项目图标、评论图片和 Markdown 预览。
- 构建依赖与 Next.js App Router 参数类型。

### 验证情况

- `npm ci --include=dev`（`NODE_ENV=development`）通过。
- `npm audit --audit-level=high`、`npx tsc --noEmit`、`npm run test`、`NODE_ENV=production npm run build` 通过。
- Chrome 桌面与 390px 移动宽度截图确认加载器文字和外圈轨道布局。
