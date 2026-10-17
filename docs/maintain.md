# 维护记录

## 2026-10-17 - REQ-202610-1024 viewport 可缩放性回归防护

### 变更内容

- 确认 `app/layout.tsx` 的 viewport 未设置 `maximumScale` 或 `userScalable: false`（缩放限制已在 f1d4fc1 移除），本次补充回归测试防止重新引入。
- 新增 `lib/viewport.test.ts`，校验 `width=device-width`、`initialScale: 1` 存在，且不出现禁止缩放的配置。

### 影响范围

- 仅新增回归测试与维护记录；页面渲染、接口与数据结构均未改动。

### 验证情况

- `npm test` 7/7 通过；`npx tsc --noEmit` 0 error；`NODE_ENV=production npm run build` 成功。
- 生产构建输出的 viewport meta 为 `width=device-width, initial-scale=1`，未包含 `maximum-scale`。

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
