# 维护记录

## 2026-10-17 — schema.prisma 去重

### 变更内容

- 删除根目录历史遗留的 `schema.prisma`，仅保留 Prisma CLI 实际读取的 `prisma/schema.prisma`。
- 新增 `lib/schema-location.test.ts`，断言根副本不存在且 `prisma/schema.prisma` 保留栏目名约束注释，防止重复文件再次出现。

### 影响范围

- Prisma CLI、`prisma generate` 与 `prisma db push` 均默认读取 `prisma/schema.prisma`，行为不变。
- 两份文件此前仅相差一行注释（`// max 6 chars enforced in API`），无字段或索引差异。

### 验证情况

- `npm test` 全部通过。
- `npx prisma validate` 通过（使用占位 `DATABASE_URL`）。
- `NODE_ENV=production npm run build` 通过。

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
