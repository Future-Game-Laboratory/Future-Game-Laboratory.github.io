# 未来游戏研究所 Blog

未来游戏研究所的研究、开发记录与游戏创作实践。

线上地址：<https://future-game-laboratory.github.io/>

## 技术栈

- Astro 6 + MDX
- React 19（内容编辑器）
- Tailwind CSS 4
- GitHub Actions + GitHub Pages
- npm 锁定依赖

## 本地开发

```bash
npm ci
npm run dev
```

本地服务默认运行在 <http://localhost:1234/>。

生产构建：

```bash
npm run build
npm run preview
```

## 内容编辑器

访问 `/edits/` 可以使用 GitHub 账号进入独立内容管理后台。后台登录后会检查当前账号对
`Future-Game-Laboratory/Future-Game-Laboratory.github.io` 的写权限；无写权限的账号会被拒绝。后台支持：

- 首页轮播、公告与 SNS 链接管理
- NEWS 文章和草稿的新建、编辑、预览与删除
- WORKS 页面和项目档案管理
- AUTHORS 作者档案、ABOUT 正文与 CONTACT 表单配置
- 通过 GitHub OAuth 直接提交仓库并触发部署

完整说明见 [docs/EDITOR.md](docs/EDITOR.md)。

## 联系方式

首页 SNS 和公告位于 `src/data/home.json`，轮播图片位于
`public/static/carousel/`，CONTACT 页配置位于 `src/data/contact.json`，均可在
`/edits/` 中维护：

- `email` 作为默认 FormSubmit 收件地址，不在首页 SNS 区显示。
- `formEndpoint` 可以覆盖为自有表单服务地址；两者都为空时，Contact 表单保留但发送按钮禁用。
- SNS 链接填写后在首页显示对应黑白图标按钮；留空则不渲染，RSS 按钮始终保留。
- 默认 FormSubmit 第一次使用时，需要在收件邮箱完成一次激活确认。

完整配置说明见 [docs/CONTACT.md](docs/CONTACT.md)。

About 页正文位于 `src/content/pages/about.md`，可直接使用 Markdown 维护。

首页轮播图放在 `public/static/carousel/`，按文件名自然排序。完整说明见 [docs/CAROUSEL.md](docs/CAROUSEL.md)。

## 部署

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会执行内容检查、
生产构建并发布 `dist` 到 GitHub Pages。首次使用需要在仓库的
**Settings → Pages** 中把 Source 设置为 **GitHub Actions**。

启用后台登录还需要部署 `workers/github-oauth/`，并在 Actions Repository Variables
中设置 `PUBLIC_GITHUB_OAUTH_PROXY`，完整步骤见 [docs/EDITOR.md](docs/EDITOR.md)。

完整说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 内容目录

```text
src/content/blog/<article-slug>/index.mdx
src/content/authors/<author-id>.md
src/content/projects/<project-id>.md
```

文章 frontmatter：

```yaml
---
title: '标题'
description: '可选摘要；留空时列表会只显示标题'
date: 2026-08-08
tags: ['game-design', 'research']
authors: ['author-id']
draft: true
---
```

设置 `draft: false` 后，文章会出现在首页、文章列表、RSS 和站点地图中。
`description` 可以省略或留空；文章正文仍为必填。

## License

[MIT](LICENSE)
