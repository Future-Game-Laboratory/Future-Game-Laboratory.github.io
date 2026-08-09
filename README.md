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

访问 `/edits/` 可以编写、预览和发布文章。旧的 `/editor/` 会自动跳转到新地址。编辑器支持：

- 文章元数据和 Markdown/MDX 正文编辑
- 阅读视图与完整 MDX 源码预览
- 浏览器本地自动保存草稿
- 下载或复制 MDX
- 使用 GitHub fine-grained token 直接提交到仓库

完整说明见 [docs/EDITOR.md](docs/EDITOR.md)。

## 联系方式

在 `src/consts.ts` 的 `CONTACT` 中配置表单收件地址、公开邮箱、小红书、X 和哔哩哔哩链接：

- `email` 会在首页右下角明文显示，并作为默认 FormSubmit 收件地址。
- `formEndpoint` 可以覆盖为自有表单服务地址；两者都为空时，Contact 表单保留但发送按钮禁用。
- SNS 链接填写后在首页显示对应图标按钮；留空则不渲染。
- 默认 FormSubmit 第一次使用时，需要在收件邮箱完成一次激活确认。

完整配置说明见 [docs/CONTACT.md](docs/CONTACT.md)。

About 页正文位于 `src/content/pages/about.md`，可直接使用 Markdown 维护。

首页轮播图放在 `public/static/carousel/`，按文件名自然排序。完整说明见 [docs/CAROUSEL.md](docs/CAROUSEL.md)。

## 部署

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会执行内容检查、
生产构建并发布 `dist` 到 GitHub Pages。首次使用需要在仓库的
**Settings → Pages** 中把 Source 设置为 **GitHub Actions**。

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
description: '不超过 155 字的摘要'
date: 2026-08-08
tags: ['game-design', 'research']
authors: ['author-id']
draft: true
---
```

设置 `draft: false` 后，文章会出现在首页、文章列表、RSS 和站点地图中。

## License

[MIT](LICENSE)
