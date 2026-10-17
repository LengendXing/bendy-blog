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

## REQ-202610-1032 - 2026-10-17

### 变更内容

- 测试运行器从 Node 内置 `node:test` 迁移到 Vitest，新增 `vitest.config.ts` 与 `test:watch`、`typecheck` 命令。
- 将既有加载阈值与像素轨道测试迁移为 Vitest 断言，行为覆盖不变。
- 新增纯逻辑测试：文章排序/日期回退、文章日期格式化、通知模板变量替换。
- 抽取 `lib/format-date.ts` 与 `lib/notify-template.ts`，用户端列表/详情日期展示与 Webhook/Email 模板共用同一实现。
- 新增 `GET /api/blog` 与 `GET /api/timeline` 的关键 API 冒烟测试（Mock Prisma 与会话，覆盖匿名/管理员分支）。
- 新增 `.github/workflows/ci.yml`：push / pull request 触发，依次执行类型检查、Vitest 与生产构建。

### 影响范围

- 用户端博客列表与文章详情的日期展示（无效日期显示为 `—`）。
- 通知模板的 `{{title}}` / `{{url}}` / `{{views}}` / `{{event}}` 渲染，支持占位符内空白与保留未知占位符。
- 测试命令、CI 门禁与依赖锁文件；无数据库结构、接口契约或环境变量变更。

### 验证情况

- `npm test`：Vitest 全部用例通过。
- `npm run typecheck`：0 error。
- `NODE_ENV=production npm run build`：通过。
- 本地按 CI 步骤执行 `npm ci --legacy-peer-deps` 验证锁文件可复现安装。
