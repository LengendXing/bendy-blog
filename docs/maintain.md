# 维护记录

## 2026-10-17 - 备份恢复与双存储对账（REQ-202610-1031）

### 变更内容

- 新增逻辑备份/恢复能力：`lib/backup.ts` 定义 11 张表的稳定序列化、SHA-256 checksum、schema 哈希与备份文档校验；`scripts/backup-db.ts` 支持 `--out`、`--label`、`--keep`，备份文件权限 `0600`。
- 新增事务式恢复：`scripts/restore-db.ts` 默认 dry-run，`--execute` 才写入；按依赖逆序清空、正序写回，评论按 `parentId` 拓扑排序；恢复后逐表校验行数，目标为生产库时强制 `--allow-production`。
- 新增恢复演练：`scripts/restore-drill.ts` 只接受独立演练库（`DRILL_DATABASE_URL` 或 `--target-url`），拒绝与 `DATABASE_URL` 相同。
- 新增内容仓库对账：`lib/reconcile.ts` 与 `scripts/reconcile-content.ts` 检测 `missing_in_repo`、`missing_in_db`、`path_mismatch`、`duplicate_github_path`、`invalid_github_path`，支持 GitHub API / 本地目录两种数据源、Markdown/JSON 报告与 `--strict` 退出码。
- 新增 `.github/workflows/backup-reconcile.yml`：每天 03:17 UTC 自动备份并上传 artifact（保留 30 天），同时生成对账报告。
- 新增 `docs/backup-restore.md`，并在 README 增加 Backup & Recovery 入口；`.env.example` 补充 `RESTORE_DATABASE_URL`、`DRILL_DATABASE_URL`，`.gitignore` 忽略 `backups/`、`reports/`。

### 影响范围

- 仅新增运维脚本、工作流与文档；不改动现有 API、页面与 Prisma schema。
- 新增 npm scripts：`db:backup`、`db:restore`、`db:restore:drill`、`reconcile:content`。
- 备份文件含用户邮箱、评论等个人信息，禁止入库或放入公开制品存储。

### 验证情况

- `npm test`：26/26 通过（备份格式/checksum/校验、恢复顺序、评论拓扑排序、对账分类与报告格式）。
- `npx tsc --noEmit`：0 error；`NODE_ENV=production npm run build`：通过。
- 使用一次性 PostgreSQL 16 容器完成真实链路：备份 11 张表 17 行 → 人为删除/篡改数据 → dry-run 不写库 → `--execute --allow-production` 全量恢复且评论父子关系完整 → 独立 `bendy_drill` 库恢复演练通过（11 张表行数一致）。
- 对账实测：本地 `posts/` 与测试库完全匹配时报告通过；加入孤立文件后正确报 `missing_in_db`，`--strict` 退出码为 1。

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
