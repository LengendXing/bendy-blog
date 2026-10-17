# 维护记录

## REQ-202610-1008 - 2026-10-17

### 变更内容

- `lib/github.ts` 的读写请求统一检查 `res.ok`，失败抛出带 HTTP 状态与 GitHub 原始信息的 `GitHubApiError`。
- `saveFileContent` / `deleteFile` 失败不再静默；`getFileContent` 仅在 404 时返回 `null`，鉴权、限流、网络错误会向上抛出。
- 文章创建/更新/删除与批量导入在 GitHub 写入失败时返回 502，且不会继续写数据库；数据库写入失败时回滚已写入的仓库文件（新建则删除，更新则恢复旧内容）。
- 管理端删除、导入与保存失败均展示服务端错误信息。
- 新增 `lib/reconcile.ts` 与 `scripts/reconcile-content.ts`，支持 `npm run content:reconcile` 对账 DB 与 GitHub 内容仓库。

### 验证情况

- `npx tsc --noEmit`、`npm run test`、`NODE_ENV=production npm run build` 通过。
- `lib/github.test.ts` 覆盖成功、401/403/404/422、网络错误与配置缺失；`lib/reconcile.test.ts` 覆盖缺失文件、孤儿文件、重复路径与非法路径。

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
