# 首页海报轮播

首页会自动读取 `public/static/carousel/` 中的图片，并按文件名进行自然排序后循环播放。

支持 `.png`、`.jpg`、`.jpeg`、`.webp` 和 `.avif`。建议用两位数字作为文件名前缀明确顺序：

```text
public/static/carousel/
├── 01-first-poster.webp
├── 02-second-poster.png
└── 03-third-poster.jpg
```

添加、替换或删除图片后提交到 `main`，GitHub Actions 下一次构建会自动更新轮播。轮播使用固定画框和 `object-fit: contain`，因此不会裁切纵向或横向海报；为减小页面加载量，建议单张图片控制在 1 MB 左右。
