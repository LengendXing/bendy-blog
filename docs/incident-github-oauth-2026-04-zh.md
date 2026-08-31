# GitHub OAuth 登录事故复盘（2026-04）

## 事故结论

生产站 GitHub 登录失败的主要触发因素，是 GitHub 在 2026-04-09 UTC 左右逐步启用 OAuth 2.0 Authorization Server Issuer Identification（RFC 9207）后，在授权回调中增加了 `iss` 参数。

旧版本项目使用 NextAuth v4 的 GitHub Provider，但没有显式声明 issuer。底层 `openid-client` 无法确认回调中的发行方，于是拒绝了回调。NextAuth 随后把这类服务端错误统一显示为：

```text
Try signing in with a different account.
```

这不是 GitHub 的 Homepage URL 把用户跳错了，也不是 GitHub 不支持多个环境回调；真正失败发生在 GitHub 已经完成授权、请求回到本站之后。

## 影响范围

- 通过 GitHub OAuth 新登录或重新登录的用户可能无法完成回调。
- 管理员无法进入 `/admin`，后台发布和配置操作受影响。
- 博客公开页面、文章阅读和已有的公开访问不受这次 OAuth 回调故障直接影响。
- 浏览器错误页信息过于通用，不能仅凭这句话判断是账号、回调地址还是服务端配置问题。

## 时间线

1. 项目原先使用 NextAuth v4 和 GitHub OAuth，登录流程正常。
2. GitHub 开始在 OAuth 回调中附加 `iss=https://github.com/login/oauth`。
3. 项目原有 Provider 未配置 issuer，回调被 NextAuth/openid-client 拒绝。
4. 浏览器被重定向到 NextAuth 通用错误页，显示 `Try signing in with a different account.`。
5. 定位到 `iss` 校验和依赖兼容性问题后，提交 `ddec781` 修复配置与适配器。
6. 提交 `35ece5c` 增加了 [GitHub OAuth 流程说明](github-oauth-flow-zh.md)。

## 根因分析

### 主要根因：回调新增 `iss` 与旧 Provider 配置不匹配

事故前回调大致是：

```text
/api/auth/callback/github?code=...&state=...
```

变更后可能是：

```text
/api/auth/callback/github?code=...&state=...&iss=https://github.com/login/oauth
```

`iss` 用来标识授权服务器。项目没有声明预期发行方，旧版 NextAuth 的 OAuth 客户端因此报告类似以下错误：

```text
unexpected "iss" (issuer) response parameter value
issuer must be configured on the issuer
```

GitHub 后续曾回滚相关 rollout，但应用仍应显式配置 issuer，不能依赖 GitHub 永久不发送该参数。

### 次要问题：依赖和管理员匹配存在隐患

- 项目运行在 NextAuth v4，却使用了面向 Auth.js 新版本的 `@auth/prisma-adapter`，存在 Adapter API 和依赖版本不兼容风险。
- 管理员名单原先使用区分大小写的字符串比较。GitHub 用户名大小写变化或环境变量多余空格都可能导致登录成功但没有管理员权限。

这些问题不一定是本次回调报错的唯一触发点，但会放大故障排查难度，因此一并修复。

## 修复内容

提交 `ddec781` 包含以下改动：

- GitHub Provider 显式设置 `issuer: "https://github.com/login/oauth"`。
- 将 Prisma Adapter 切换为与 NextAuth v4 匹配的 `@next-auth/prisma-adapter@1.0.7`，并锁定依赖版本。
- 管理员 GitHub 用户名统一去空格并转小写后比较，兼容账号大小写差异。
- 未登录或非管理员访问配置接口时只返回公开配置，并为响应增加 `private, no-store` 缓存控制。
- 图片代理和通知接口不再向客户端暴露敏感运行时配置。

## 验证清单

部署后应按以下顺序验证：

1. GitHub OAuth App 中保留精确的生产回调地址：
   `https://blog.sunchengxin.com/api/auth/callback/github`。
2. Vercel Production 的 `NEXTAUTH_URL` 必须是：
   `https://blog.sunchengxin.com`。
3. 使用无痕窗口从 `/admin` 发起 GitHub 登录，确认回调回到同一环境的 `/admin`。
4. 确认管理员账号在 `ADMIN_GITHUB_USERNAMES` 中，且大小写和空格不再影响匹配。
5. 出错时只记录错误页的 `error=` 值和服务端 callback 日志；不要复制或分享 OAuth `code`、`state`、Cookie。

## 预防措施

- 锁定 NextAuth、Adapter 和 OAuth 客户端依赖版本，升级时先在预览环境验证。
- 为 GitHub OAuth 增加生产、测试和本地环境的回调 smoke test，覆盖额外回调参数。
- 监控 `/api/auth/callback/github` 的服务端错误，并保留具体错误类型，不用通用错误页代替日志。
- 每个环境只登记精确、受控的 Callback URL；Homepage URL 只作为应用展示主页，不参与回调匹配。
- 对 GitHub OAuth Secret、内容仓库 Token、图片仓库 Token 和外部存储凭据定期轮换；凭据曾在聊天、日志或构建输出中出现时应立即撤销并重新生成。

## 参考

- [NextAuth issue #13409：GitHub OAuth provider no longer works](https://github.com/nextauthjs/next-auth/issues/13409)
- [Langfuse issue #13091：GitHub OAuth `iss` 参数兼容性记录](https://github.com/langfuse/langfuse/issues/13091)
- [RFC 9207：OAuth 2.0 Authorization Server Issuer Identification](https://www.rfc-editor.org/rfc/rfc9207)
- [本项目 GitHub OAuth 流程说明](github-oauth-flow-zh.md)
