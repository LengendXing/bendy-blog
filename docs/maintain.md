# 维护记录

## 2026-10-17 - REQ-202610-1025 博客标题占位判断去重

### 变更内容

- 新增 `lib/blog-title.ts`：集中维护默认标题与三组历史占位标题，提供 `isPlaceholderBlogTitle` / `resolveBlogTitle`，空值与纯空白标题统一按占位处理。
- `app/(blog)/layout.tsx` 与 `app/admin/settings/page.tsx` 改用共享函数，删除各自的字面量判断；后台设置页默认值同步引用 `DEFAULT_BLOG_TITLE`。
- 新增 `lib/blog-title.test.ts` 4 项单元测试，覆盖空值、大小写与首尾空白、历史占位标题及自定义标题。

### 影响范围

- 用户端页头博客标题与后台设置页标题回填；接口、数据库结构与环境变量未变。
- 纯空白标题此前在页头会原样渲染、在后台却被忽略，现在两处统一回退为默认标题。

### 验证情况

- `npm test`：10/10 通过；`npx tsc --noEmit`：0 error；`NODE_ENV=production npm run build`：通过。

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
