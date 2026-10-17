# 备份、恢复与双存储对账

本文覆盖笨迪博客的两类持久化数据：

- **PostgreSQL**：Prisma schema 中的 11 张表（用户、会话、文章、评论、栏目、项目、关于页、站点配置、通知配置等）。
- **内容仓库**：GitHub 内容仓库中的 `posts/*.md` 文件。数据库 `BlogPost.githubPath` 指向这些文件。

备份文件包含用户邮箱、评论内容等个人信息，**禁止提交到 Git、禁止放进公开制品库**。本地备份目录 `backups/` 与报告目录 `reports/` 已加入 `.gitignore`。

## 1. 逻辑备份

```bash
# 默认写入 backups/，保留最近 14 份
npm run db:backup

# 指定目录、标签与保留数量
npm run db:backup -- --out backups --label pre-import --keep 30
```

备份文件为 `db-backup-<ISO 时间戳>.json`，权限 `0600`，包含：

| 字段 | 说明 |
| --- | --- |
| `format` / `version` | 固定为 `bendy-blog-db-backup` / `1` |
| `createdAt` | 备份时间（ISO 8601） |
| `label` | 可选标签，如 `scheduled`、`pre-import` |
| `schemaSha256` | 生成备份时 Prisma 实际读取的 schema 文件哈希（优先根目录，回退 `prisma/schema.prisma`） |
| `tables` | 每张表的行数与完整行数据 |
| `checksum` | 对 `tables` 做键排序后计算的 SHA-256，用于校验文件完整性 |

脚本按固定主键顺序读取数据，因此同一份数据多次备份会得到相同 checksum。

### 定期备份

`.github/workflows/backup-reconcile.yml` 每天 03:17 UTC 运行一次，也可以在 Actions 页面手动触发。需要在仓库 Secrets 中配置：

| Secret | 用途 |
| --- | --- |
| `DATABASE_URL` | 生产 PostgreSQL 连接串 |
| `GITHUB_CONTENT_REPO` | 内容仓库，格式 `owner/repo` |
| `CONTENT_REPO_TOKEN` | 可读内容仓库的 GitHub Token（公开仓库可留空） |

工作流会把备份与对账报告作为 Actions artifact 保存 30 天。**artifact 只是短期副本**；生产环境应定期把 `backups/` 同步到私有对象存储或加密归档，并单独保管解密密钥。

## 2. 恢复

恢复默认是 **dry-run**：只校验文件格式、checksum、表行数与 schema 哈希，不会写数据库。

```bash
# 1) 校验备份
npm run db:restore -- --file backups/db-backup-2026-10-17T03-17-00-000Z.json

# 2) 恢复到 DATABASE_URL 指向的数据库（必须显式确认）
npm run db:restore -- --file backups/db-backup-2026-10-17T03-17-00-000Z.json --execute

# 3) 恢复到临时库（推荐先演练）
npm run db:restore -- --file backups/db-backup-2026-10-17T03-17-00-000Z.json \
  --target-url postgresql://user:pass@host:5432/bendy_blog_restore --execute
```

安全约束：

- 目标库与 `DATABASE_URL` 相同时，必须追加 `--allow-production`；否则脚本拒绝执行。
- 恢复在**单个事务**内完成：按依赖逆序清空 11 张表，再按依赖顺序写回；任一步失败会整体回滚，不会留下半套数据。
- 评论按 `parentId` 拓扑排序后写入，避免自引用外键失败。
- 恢复后逐表比对行数，不一致会报错。
- 备份的 `schemaSha256` 与当前 schema 不一致时会告警。跨 schema 版本恢复前，应先在临时库验证并执行必要的 `prisma migrate` / `db push`。
- 恢复会覆盖目标库全部业务数据。执行前应停止写入（维护窗口），并确认目标连接串没有指错环境。

### 单条数据的回滚

恢复脚本是整库恢复。若只需要找回单篇文章或单条评论：

1. 把备份恢复到临时库；
2. 在临时库中按 `id` / `slug` 查出目标行；
3. 通过 Prisma Studio 或 SQL 把目标行写回生产库；
4. 内容仓库文件用 `git log` / `git revert` 找回。

## 3. 恢复演练

演练必须使用独立临时数据库，禁止指向生产库：

```bash
# 1) 准备一个空库，例如 createdb bendy_blog_drill
export DRILL_DATABASE_URL='postgresql://user:pass@host:5432/bendy_blog_drill'

# 2) 先给演练库建表（脚本不会自动改 schema）
DATABASE_URL="$DRILL_DATABASE_URL" npx prisma db push --skip-generate

# 3) 执行真实恢复演练
npm run db:restore:drill -- --file backups/db-backup-2026-10-17T03-17-00-000Z.json
```

脚本会完成真实恢复并逐表校验行数；输出 `恢复演练通过` 才算成功。建议每季度至少演练一次，并记录：

| 日期 | 备份文件 | 演练库 | 结果 | 执行人 |
| --- | --- | --- | --- | --- |
| 2026-10-17 | db-backup-2026-10-17T03-17-00-000Z.json | bendy_blog_drill | 通过 | — |

演练完成后删除临时库，避免残留含个人信息的数据。

## 4. 内容仓库对账

```bash
# 通过 GitHub API 读取 GITHUB_CONTENT_REPO 的 posts/ 目录
npm run reconcile:content -- --out reports/content-reconciliation.md

# 使用本地内容仓库检出（离线或排查时）
npm run reconcile:content -- --content-dir ../bendy-blog-content --out reports/content-reconciliation.md

# CI 门禁：发现不一致时退出码为 1
npm run reconcile:content -- --strict
```

报告字段与处理建议：

| 类型 | 含义 | 处理建议 |
| --- | --- | --- |
| `missing_in_repo` | 数据库有文章，内容仓库缺少对应文件 | 从 Git 历史/备份恢复文件；确认不是误删 |
| `missing_in_db` | 内容仓库有 `posts/*.md`，数据库没有记录 | 通过后台导入或补建 `BlogPost`，核对 slug |
| `path_mismatch` | `githubPath` 不等于 `posts/<slug>.md` | 统一路径；历史文件可保留但需登记 |
| `duplicate_github_path` | 多篇文章共用同一个文件 | 合并/拆分文章，保证一篇文章一个文件 |
| `invalid_github_path` | `githubPath` 为空 | 补全路径或重新导入 |

报告同时输出汇总计数（数据库文章数、仓库文件数、匹配数、各类不一致数）与逐条明细，可直接作为运维对账记录归档。

## 5. 关键操作回滚

以下操作执行前必须先做一次带标签的备份：

- 批量导入 Markdown（`/api/import`）；
- 批量删除/重建栏目；
- 修改 `BlogPost.githubPath` 或迁移内容仓库；
- 任何直接写数据库的运维脚本。

```bash
npm run db:backup -- --label pre-<操作名>
```

回滚路径：

1. **内容仓库**：内容以 Git 提交为准，使用 `git log -- posts/<slug>.md` 找到上一个版本，`git revert` 或恢复文件；
2. **数据库**：使用对应时间点的备份执行整库恢复；单条数据按第 2 节的方法从临时库回填；
3. **双存储一致性**：回滚后立即运行一次对账，确认 `missing_in_repo` / `missing_in_db` 均为 0。

## 6. 已知边界

- 备份是逻辑备份，不包含 PostgreSQL 角色、扩展、数据库级权限；这些属于基础设施配置，需单独备份。
- 备份不包含 Dufs/GitHub 图片仓库中的图片文件；图片由各自存储负责版本管理。
- GitHub Actions artifact 30 天后自动删除，不能作为唯一备份介质。
- 恢复脚本不会自动执行 schema 迁移；跨版本恢复必须先确认目标库 schema 与备份一致。
