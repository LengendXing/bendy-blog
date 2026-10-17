# 维护记录

## 2026-10-17 - 公开面安全基线（REQ-202610-1029）

### 变更内容

- 上传与图片代理：上传接口仅管理员可用；限制请求体与文件大小（5 MB）、MIME 白名单与 magic bytes 校验；移除 base64 兜底，存储未配置返回 503；图片代理限制上游大小、超时、拒绝重定向与 SVG/HTML，并补 `nosniff` 与沙箱 CSP。
- 评论：新增 `lib/comment-policy.ts`，统一校验 postId/parentId/replyId、正文长度（2000）、图片 URL（仅 `/api/image?` 或 HTTPS，≤2048 字符）；按用户与 IP 双重限流；禁止普通用户附加图片；GET 匿名请求必须携带合法 `postId`，避免全站评论一次性导出。
- 统计：新增 `lib/stats-policy.ts`，事件仅 `view` / `share`，slug 长度与控制字符校验，Redis `SET NX EX 600` 访客去重，按 IP + 事件 + 文章限流，通知只在实际计数时触发。
- 公开输入统一：新增 `lib/public-input.ts`，统一 slug（≤200，拒绝路径/URL 元字符与控制字符）、实体 id（≤64，cuid 形态）、locale、标题/描述/正文长度与日期解析；`/api/blog`、`/api/comments`、`/api/stats`、`/api/about`、`/api/image`、`/api/import` 均已接入。
- 后台文章接口：创建时校验 slug 并处理重复（409），更新/删除校验 id、标题、描述、日期与栏目 id，避免非法值落库或拼进 GitHub 路径。

### 影响范围

- 公开接口：`/api/blog`、`/api/comments`、`/api/stats`、`/api/about`、`/api/image`。
- 后台接口：`/api/upload`（管理员限定）、`/api/import`（slug 校验）、`/api/blog` 写操作。
- 无数据库结构变更，无新增环境变量。

### 验证情况

- `npm test`：49/49 通过。
- `npx tsc --noEmit`：0 error。
- `NODE_ENV=production npm run build`：通过。

## 2026-10-17 - /api/stats 防刷与通知面收敛（REQ-202610-1010）

### 变更内容

- 新增 `lib/stats-policy.ts`：事件白名单（仅 `view` / `share`）、slug 长度与控制字符校验、10 分钟访客去重键、按事件区分的限流参数、通知触发规则。
- `app/api/stats/route.ts`：未知事件直接 400；使用 Redis `SET NX EX 600` 做 IP/登录会话去重，同一访客对同一文章 10 分钟内只计一次；按 IP + 事件 + 文章限流（view 20 次/小时、share 5 次/小时），超限返回 429；仅实际计数时更新数据库与统计缓存；通知只由 `share` 或每 100 次 `view` 触发，移除不可达的 `comment` 分支。
- 新增 `lib/stats-policy.test.ts` 纯逻辑测试，覆盖事件白名单、slug 校验、去重键、访客身份、通知规则与限流预算。

### 影响范围

- 公开统计接口 `POST /api/stats`；后台 `GET /api/stats` 鉴权与返回结构不变。
- 无数据库结构变更，无新增环境变量。

### 验证情况

- `npm test`、`npx tsc --noEmit`、`NODE_ENV=production npm run build` 通过。

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
