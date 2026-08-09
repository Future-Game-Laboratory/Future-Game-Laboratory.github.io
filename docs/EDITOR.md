# 内容编辑器

编辑器位于站点的 `/edits/` 路由。在当前 GitHub Pages 配置下，完整地址为：

<https://future-game-laboratory.github.io/edits/>

## 写作与本地草稿

标题、摘要、日期、路径、标签、作者和正文会自动保存在浏览器的
`localStorage` 中。它适合避免页面刷新造成的内容丢失，但不应当被当作唯一备份。

编辑器可以下载单个 `.mdx` 文件或复制完整源码。下载的文件应放到：

```text
src/content/blog/<article-slug>/index.mdx
```

如果文章包含图片，可在文章目录下创建 `assets/`，并在正文中使用相对路径：

```md
![图片说明](./assets/example.png)
```

## 直接发布到 GitHub

编辑器使用 GitHub Contents API 创建或更新文章文件。它不需要独立服务器，适合
部署在纯静态 GitHub Pages 上。

创建 fine-grained personal access token 时：

1. 将 **Repository access** 限制为 `Future-Game-Laboratory.github.io`。
2. 只授予 **Contents: Read and write** 权限。
3. 使用较短的过期时间，并定期轮换。
4. 不要把 token 写进文章、提交、Issue 或截图。

Token 只写入当前标签页的 `sessionStorage`，关闭标签页后会被浏览器清除。组织、仓库和
分支信息保存在 `localStorage`，但 token 不会进入长期存储，也不会发送给博客服务器。
发布时 token 仅发送到 `https://api.github.com`。

点击“提交并触发构建”后：

1. 编辑器检查 `src/content/blog/<slug>/index.mdx` 是否已存在。
2. 不存在时创建文件；存在时带 SHA 更新文件。
3. 提交进入所选分支。
4. 当分支是 `main` 时，GitHub Actions 自动重新构建并部署站点。

## 草稿与公开发布

- `draft: true`：文件会进入仓库，但不会生成公开文章页面。
- `draft: false`：构建后出现在文章列表、标签、作者聚合和 RSS 中。

建议首次提交保持草稿状态，确认源码和图片路径后再取消草稿。

## 安全边界

这是一个无后端的仓库编辑器，因此无法像服务端 OAuth 应用那样隐藏凭证或实施多人角色
权限。对团队公开使用时，优先让成员使用各自的 fine-grained token，并通过 GitHub
组织权限控制写入者。若将来需要审核流、多人角色或媒体库，应增加 OAuth 服务和 Pull
Request 发布模式，而不是扩大个人 token 的权限。
