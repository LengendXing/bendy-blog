# 维护记录

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

## v0.1.2 - 2026-10-17

### 变更内容

- 结构整改（REQ-202610-1035）：将 339 行的管理端内容页拆为工具栏、导入面板、新建弹窗、文章列表组件与 `useContentPage` 状态钩子。
- 将 688 行的管理端设置页拆为站点、Webhook、邮件、管理员四个面板及 `useSettingsPage` 状态钩子。
- 新增 `lib/blog-visibility.ts` 作为“已发布”可见性的唯一服务端入口，博客列表、文章详情、评论、统计、站点地图与 RSS 统一复用。
- 新增 `lib/site.ts`、`lib/blog-title.ts`，统一站点 URL 与标题占位值判断，删除 5 处 siteUrl 与 2 处标题占位逻辑重复。
- 像素色板收敛为 `styles/globals.css` 中的 RGB 设计令牌，Tailwind 通过 CSS 变量引用；移除重复十六进制色值和两处硬编码阴影颜色。
- 删除根目录重复的 `schema.prisma`，保留 `prisma/schema.prisma` 作为 Prisma CLI 唯一入口。
- 清理 `lib/auth.ts` 中注释掉的旧 `callbacks`/`events` 配置块及未使用的 `signIn` 参数。
- 为新增纯逻辑补充 `node:test` 单元测试，覆盖站点 URL、标题解析、可见性过滤、内容分页、schema 位置与 auth 配置。

### 影响范围

- 管理端内容管理、设置页交互与数据加载。
- 博客列表、文章详情、评论、统计、sitemap、robots、RSS 的公开可见性判断。
- 全局像素主题色板与构建配置。

### 验证情况

- `npm test`：29 项通过。
- `npx tsc --noEmit`：通过。
- `NODE_ENV=production npm run build`：通过。
- `git diff --check`：通过。
