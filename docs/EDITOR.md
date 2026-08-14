# 内容管理后台

后台位于站点的 `/edits/` 路由，正式地址为：

<https://future-game-laboratory.github.io/edits/>

该路由不会出现在公开导航与 sitemap 中，并使用 `noindex, nofollow`。这不是安全边界；
真正的访问控制由 GitHub 登录和仓库权限检查完成。

如果 `/edits/` 已显示“内容管理后台”，但登录按钮不可用并提示尚未连接 OAuth，说明后台
界面本身已经部署成功，只是生产构建没有拿到 `PUBLIC_GITHUB_OAUTH_PROXY`。`/edits/` 就是
后台入口，不需要再维护一套独立编辑页；完成下方的一次性配置并重新运行 Pages 部署即可。

## 后台能管理什么

- 首页轮播图片、公告与小红书、X、哔哩哔哩链接；RSS 始终显示。
- NEWS 文章与草稿：新建、编辑、预览源码、删除。
- WORKS 页面正文与项目档案。
- AUTHORS 作者档案与公开状态。
- ABOUT 页面正文。
- CONTACT 页介绍、FormSubmit 收件邮箱或自定义表单接口。

每次保存都会通过 GitHub Contents API 直接提交到 `main`，随后触发 GitHub Pages
部署。后台不在站点服务器中另存一份内容。

## 登录与权限

用户点击“使用 GitHub 登录”后完成 GitHub OAuth + PKCE 授权。随机 `state` 防止伪造
回调，当前标签页保存的 PKCE verifier 防止被截获的授权码单独换取令牌。后台会同时读取登录用户和目标
仓库信息，只有目标仓库返回以下任一权限时才允许进入：

- `permissions.push`
- `permissions.maintain`
- `permissions.admin`

仅有 `pull` 或 `triage` 权限的账号不能进入。OAuth 令牌只保存在当前标签页的
`sessionStorage` 中，关闭标签页后清除；Worker 不保存令牌。

## 为什么需要 OAuth Worker

GitHub Pages 是纯静态托管，浏览器端不能安全保存 OAuth App 的 `client_secret`。
`workers/github-oauth/` 提供最小 Cloudflare Worker：

- `GET /authorize` 跳转到 GitHub 授权页面。
- `POST /token` 将一次性 `code` 换成访问令牌。
- 严格校验允许的 Origin，并给响应设置 `no-store`。
- 不读取或保存仓库内容。

## 一次性部署配置

### 1. 创建 GitHub OAuth App

在 GitHub 的 **Settings → Developer settings → OAuth Apps** 中创建应用：

- Application name：例如 `FGL Content Admin`
- Homepage URL：`https://future-game-laboratory.github.io/`
- Authorization callback URL：`https://future-game-laboratory.github.io/edits/`

记录 Client ID，并生成 Client Secret。不要把 Secret 提交到仓库。

### 2. 部署 Cloudflare Worker

确认 `workers/github-oauth/wrangler.toml` 中的 `ALLOWED_ORIGIN` 与 `CALLBACK_URL`
对应正式站点，然后在 `workers/github-oauth/` 下执行：

```bash
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler deploy
```

更完整的 Worker 说明见 `workers/github-oauth/README.md`。

### 3. 配置 GitHub Actions 变量

打开仓库 **Settings → Secrets and variables → Actions → Variables**，新增：

```text
PUBLIC_GITHUB_OAUTH_PROXY=https://<worker-name>.<account>.workers.dev
```

`.github/workflows/deploy-pages.yml` 会在 Astro 构建时注入该变量。设置完成后重新运行
Pages 工作流；未配置时 `/edits/` 会显示配置提示并禁用登录按钮。

## 本地调试

复制 `.env.example` 为 `.env`，把变量改成已部署的 Worker 地址，再运行：

```bash
npm ci
npm run dev
```

本地调试需要把 Worker 的 `ALLOWED_ORIGIN` 暂时设为 `http://localhost:1234`，并为
本地回调创建单独的 OAuth App，或在调试结束后立即恢复正式配置。OAuth App 的回调地址
必须与 Worker 的 `CALLBACK_URL` 完全一致。

## 内容与发布行为

- 新 NEWS 文件：`src/content/blog/<slug>/index.mdx`
- 新 WORKS 项目：`src/content/projects/<slug>.md`
- 新 AUTHORS 档案：`src/content/authors/<slug>.md`
- `draft: true` 的 NEWS 会提交到仓库，但不会出现在公开页面与 RSS。
- NEWS 编辑器支持封面路径以及子文章的可选排序值；正文仍可使用 Markdown / MDX。
- `draft: true` 的 WORKS 项目和 AUTHORS 档案不会出现在各自公开页面。
- 保存已有文件时后台使用 Contents API 返回的最新文件 SHA，以支持连续编辑。
- 删除 NEWS、项目、作者档案或首页轮播图片会直接产生一次 Git 提交；ABOUT、WORKS 页面正文不可在后台删除。

保存前请确认页面顶部的“未保存”状态已经消失。GitHub 的分支保护规则仍然有效；如果
未来要求审核后发布，应把保存行为改为创建分支和 Pull Request，而不是扩大 OAuth 权限。
