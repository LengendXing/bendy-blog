# 维护记录

## 2026-10-17 - REQ-202610-1028 可观测性与失败告警

### 变更内容

- 新增 `lib/observability.ts`：统一 JSON 结构化日志，敏感字段自动脱敏，日志写入失败不影响业务。
- 新增 `lib/ops.ts` 与 `lib/alert-throttle.ts`：关键链路失败统一记录并按指纹节流，经现有通知中心（Webhook / 邮件）发送告警。
- `lib/github.ts` 改为对非 2xx 响应抛出 `GitHubApiError`，不再把写入失败静默当作成功；发布、删除、导入、文章读取和管理端 GitHub 读取均接入失败日志与告警。
- 上传接口为 Dufs / GitHub 图床增加超时与状态码检查；后端失败时记录 `upload.backend_failed`，回退 base64 时记录 `upload.fallback_used` 并告警。
- 新增 `lib/reconcile.ts`、`lib/reconcile-runner.ts`、`scripts/reconcile-content.ts` 与 `/api/cron/reconcile`：对账数据库 `BlogPost.githubPath` 与内容仓库 `posts/` 文件，支持缺失、孤儿、重复路径和非法路径检查。
- `vercel.json` 增加每日 03:17（UTC）对账任务；新增 `CRON_SECRET`、`OPS_ALERT_COOLDOWN_SECONDS`、`SERVICE_NAME` 环境变量说明。
- 新增结构化日志、告警节流、通知模板转义、对账逻辑和 GitHub 客户端测试。

### 影响范围

- 管理端发布、编辑、删除、批量导入与图片上传。
- 文章详情页与管理端 GitHub 文件读取。
- 通知中心发送逻辑（保持原有 Webhook / 邮件配置格式，模板变量仍为 `{{event}}` 等）。
- Vercel Cron 与运维对账脚本。

### 验证情况

- `npm test`：35 项全部通过。
- `npx tsc --noEmit`：通过。
- `NODE_ENV=production npm run build`：通过（使用占位环境变量）。

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
