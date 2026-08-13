# GitHub OAuth 交换服务

`/edits/` 部署在 GitHub Pages，浏览器端不能安全保存 GitHub OAuth App 的
`client_secret`。本目录提供一个最小 Cloudflare Worker，只负责把 GitHub 回调的
临时 `code` 换成访问令牌。

## 部署

1. 在 GitHub 组织中创建 OAuth App：
   - Homepage URL：`https://future-game-laboratory.github.io/`
   - Authorization callback URL：`https://future-game-laboratory.github.io/edits/`
2. 安装 Wrangler 并登录 Cloudflare：`npx wrangler login`。
3. 在本目录保存两个 secret：
   - `npx wrangler secret put GITHUB_CLIENT_ID`
   - `npx wrangler secret put GITHUB_CLIENT_SECRET`
4. 确认 `wrangler.toml` 的 `ALLOWED_ORIGIN` 和 `CALLBACK_URL` 与正式站点一致，然后执行
   `npx wrangler deploy`。
5. 把返回的 Worker 地址写入仓库变量 `PUBLIC_GITHUB_OAUTH_PROXY`，例如：
   `https://fgl-github-oauth.example.workers.dev`。

Worker 不保存令牌，不读取仓库内容，并为所有响应设置 `no-store`。实际仓库权限
仍由 `/edits/` 登录后调用 GitHub Repository API 检查；只有
`permissions.push`、`maintain` 或 `admin` 为真才进入管理界面。
