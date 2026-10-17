# 维护记录

## 2026-10-17 — /api/config 写入白名单与值校验

### 变更内容

- 新增 `lib/site-config.ts`：集中定义站点配置键白名单与值规则（文本长度、布尔、HTTP(S) URL、GitHub owner/repo）。
- `app/api/config/route.ts` 的 PUT 在写库前校验请求体：未知键、类型错误、非法 URL 或仓库名返回 400，不再静默落库；多键写入改为事务。
- 新增 11 项单元测试，覆盖白名单、类型、URL/仓库格式、长度上限与空值清理。

### 影响范围

- 仅管理端设置页保存（PUT /api/config）与站点配置写入；GET 行为、数据库结构与环境变量未变。

### 验证情况

- `npm test`：17/17 通过；`npx tsc --noEmit`：0 error；`NODE_ENV=production npm run build`：通过。

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
