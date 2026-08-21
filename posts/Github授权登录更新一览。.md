# Github授权登录更新！新增Redirecturls配置

Start writing...# GitHub OAuth 登录流程

本文说明 Homepage URL、Callback URL、`redirect_uri` 和登录完成后的最终页面分别负责什么。

## 先记住结论

- `Homepage URL` 是 GitHub 授权页面展示的应用主页链接，不决定 OAuth 自动跳转。
- `Callback URL` 是 GitHub 授权完成后发送一次性授权码的地址。
- `redirect_uri` 是本次登录请求选择的具体 Callback URL。
- 登录完成后回到 `/admin` 等页面，由应用（本项目使用 NextAuth）决定。

GitHub OAuth App 和 GitHub App 都可以登记多个 Callback URL（最多 10 个）。同一个产品的生产、测试和本地环境可以共用一个 OAuth 应用；互不相关的产品建议使用不同的 OAuth 应用。

## 本地开发环境的完整流程

假设本地地址是 `http://127.0.0.1:3000`，你从后台开始登录：

### 1. 打开本地后台

```text
http://127.0.0.1:3000/admin
```

### 2. 应用生成 GitHub 授权请求

NextAuth 会把当前环境的回调地址放入请求：

```text
https://github.com/login/oauth/authorize
  ?client_id=CLIENT_ID
  &redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fauth%2Fcallback%2Fgithub
  &state=随机值
  &scope=read%3Auser%20user%3Aemail
```

关键字段是：

```text
redirect_uri=http://127.0.0.1:3000/api/auth/callback/github
```

GitHub 会把这个地址与 OAuth 应用中登记的 Callback URL 进行匹配。`Homepage URL` 不参与这一步。

### 3. 用户在 GitHub 授权

GitHub 授权页面可能展示：

```text
Homepage URL: https://blog.sunchengxin.com
```

这是应用的识别信息和可点击主页链接。用户点击这个链接时会打开生产主页，但它不会改变当前 OAuth 流程的回调地址。

### 4. GitHub 跳回本地 Callback URL

授权完成后，GitHub 会访问：

```text
http://127.0.0.1:3000/api/auth/callback/github
  ?code=一次性授权码
  &state=刚才的随机值
  &iss=https%3A%2F%2Fgithub.com%2Flogin%2Foauth
```

### 5. NextAuth 处理回调

本地 NextAuth 会验证 `state` 和 `iss`，使用授权码向 GitHub 换取令牌，获取用户资料，并创建本地登录会话。

### 6. 应用跳回最初页面

因为登录从本地 `/admin` 开始，NextAuth 最后会跳回：

```text
http://127.0.0.1:3000/admin
```

完整链路是：

```text
本地 /admin
  -> GitHub 授权页
  -> 本地 /api/auth/callback/github
  -> 本地 /admin
```

## 三个环境的配置示例

同一个产品可以登记多个环境的 Callback URL：

```text
Homepage URL:
https://blog.sunchengxin.com

Callback URLs:
https://blog.sunchengxin.com/api/auth/callback/github
https://test.example.com/api/auth/callback/github
http://127.0.0.1:3000/api/auth/callback/github
```

三个环境各自的流程如下：

| 环境 | 登录入口 | `redirect_uri` | 最终页面 |
| --- | --- | --- | --- |
| 生产 | `https://blog.sunchengxin.com/admin` | `https://blog.sunchengxin.com/api/auth/callback/github` | 生产 `/admin` |
| 测试 | `https://test.example.com/admin` | `https://test.example.com/api/auth/callback/github` | 测试 `/admin` |
| 本地 | `http://127.0.0.1:3000/admin` | `http://127.0.0.1:3000/api/auth/callback/github` | 本地 `/admin` |

本地、测试和生产不会因为共用一个 OAuth 应用而互相跳转。每次授权请求携带的 `redirect_uri` 决定 GitHub 把授权码送到哪个环境。

## 环境变量要求

每个环境的 `NEXTAUTH_URL` 应指向该环境自身的根地址：

```env
# Production
NEXTAUTH_URL=https://blog.sunchengxin.com

# Development
NEXTAUTH_URL=http://127.0.0.1:3000
```

Callback URL 必须精确匹配协议、域名、端口和路径。以下地址不是同一个地址：

```text
http://localhost:3000/api/auth/callback/github
http://127.0.0.1:3000/api/auth/callback/github
```

测试环境也应使用固定、受控制的域名。不要为了覆盖任意 Vercel 预览域名而开启宽泛通配符，否则可能扩大授权码泄露风险。

## 什么时候应该创建多个 OAuth 应用

多个环境共用一个 OAuth 应用适合：

- 同一个博客或产品
- 同一套登录用途和权限
- 生产、测试、本地只是部署环境不同

以下情况建议创建不同 OAuth 应用：

- 两个完全不同的产品
- 需要不同的应用名称、图标或授权说明
- 需要相互隔离 Secret、授权记录和撤销权限

共用 OAuth 应用意味着这些环境共享 Client ID、Client Secret、授权展示身份和安全边界。一个环境泄露 Secret，其他环境也需要一起处理。