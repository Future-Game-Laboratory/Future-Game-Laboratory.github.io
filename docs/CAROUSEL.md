# 首页海报轮播

首页会自动读取 `public/static/carousel/` 中的图片，并按文件名进行自然排序后循环播放。

支持 `.png`、`.jpg`、`.jpeg`、`.webp` 和 `.avif`。建议用两位数字作为文件名前缀明确顺序：

```text
public/static/carousel/
├── 01-first-poster.webp
├── 02-second-poster.png
└── 03-third-poster.jpg
```

拥有仓库编辑权限的成员可以直接进入 `/edits/`，使用 GitHub 账号登录后在「首页管理」中添加、覆盖或删除轮播图片。也可以继续手动维护上述目录并提交到 `main`。两种方式都会触发 GitHub Actions，构建完成后首页轮播自动更新。

后台接受 AVIF、JPEG、PNG 和 WebP，单张上限为 10 MB；为减小页面加载量，仍建议将图片优化到 1 MB 左右。轮播使用固定画框和 `object-fit: contain`，不会裁切纵向或横向海报。
