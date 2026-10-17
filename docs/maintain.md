# 维护记录

## v0.1.2 - 2026-10-17

### 变更内容

- 修复刷新后 RTL 方向丢失：在 hydration 前读取本地语言并恢复 `dir`/`lang`，语言切换时同步更新文档属性（REQ-202610-1034，B-08）。
- 保持 viewport 允许用户缩放，未设置 `maximumScale` 或 `userScalable: false`（B-19）。
- 补齐 zh/en/mn/ug/bo/ar/ru/ja/ko 九种语言的全部界面词条，小语种不再逐键回退英文（B-18）。
- 关于页内容回退改为「请求语言 → 英文 → 中文」，管理端按语言编辑时使用 `fallback=0`，避免把回退内容写回当前语言。
- README 语言列表补充藏语（bo）。

### 影响范围

- 全局布局、语言切换器、关于页 API 与管理端。
- 所有界面文案与 README 多语言说明。

### 验证情况

- `npx tsc --noEmit`、`npm test`、`NODE_ENV=production npm run build` 通过。

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
