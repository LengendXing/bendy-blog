# 维护记录

## 2026-10-17 - 评论列表分页与字段收敛（REQ-202610-1020）

### 变更内容

- `GET /api/comments` 改为分页响应：默认 `page=1`、`pageSize=20`，`pageSize` 上限 100；匿名请求必须提供 `postId`，管理员可不带 `postId` 跨文章分页读取。
- 公开响应改为字段白名单：仅返回 `id`、`content`、`imageUrl`、`parentId`、`replyToId`、`createdAt` 与评论者的 `name`、`image`、`githubUsername`，不再返回文章标题、`postId`、`updatedAt` 等内部字段。
- 文章详情评论区与后台评论管理页接入分页响应，支持“加载更多评论”。

### 影响范围

- 评论读取接口、文章详情评论区、后台评论管理页。

### 验证情况

- `npm test` 16/16 通过；`npx tsc --noEmit` 0 error；`NODE_ENV=production npm run build` 成功。

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
