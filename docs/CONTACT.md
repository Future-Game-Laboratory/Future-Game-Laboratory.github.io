# Contact 表单与首页联系方式

联系方式统一在 `src/consts.ts` 的 `CONTACT` 中维护：

```ts
export const CONTACT = {
  email: 'hello@example.com',
  formEndpoint: '',
  socials: [
    { label: '小红书', href: 'https://...', icon: 'xiaohongshu' },
    { label: 'X', href: 'https://x.com/...', icon: 'x-social' },
    {
      label: '哔哩哔哩',
      href: 'https://space.bilibili.com/...',
      icon: 'bilibili',
    },
  ],
} as const
```

- `email` 会在首页右下角明文显示，并作为 Contact 表单的默认收件地址。
- `formEndpoint` 留空时，表单使用 FormSubmit；如已有自己的表单服务，可在此填写完整提交地址。
- 邮箱或 SNS 链接留空时，对应入口不会显示。全部留空时，首页不会渲染联系方式区域。
- `email` 与 `formEndpoint` 都为空时，Contact 表单仍可预览，但提交按钮会被禁用。

使用 FormSubmit 时，首次提交会向收件地址发送激活邮件。完成确认后，后续表单内容才会转发到该邮箱。
