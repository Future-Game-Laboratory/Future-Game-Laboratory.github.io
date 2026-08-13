# Contact 表单与首页联系方式

首页公告与 SNS 位于 `src/data/home.json`，也可以在 `/edits/` 的“首页”区域维护。
只有填写链接的平台会显示，RSS 按钮始终保留。

CONTACT 页配置位于 `src/data/contact.json`：

```json
{
  "intro": "感谢你访问未来游戏研究所。",
  "email": "hello@example.com",
  "formEndpoint": ""
}
```

- `intro` 使用空行分隔段落，显示在联系表单上方。
- `email` 是默认 FormSubmit 收件地址，不在首页 SNS 区显示。
- `formEndpoint` 留空时使用 FormSubmit；已有表单服务时可填写完整接口 URL。
- `email` 与 `formEndpoint` 都为空时，表单保留但发送按钮禁用。

使用 FormSubmit 时，首次提交会向收件地址发送激活邮件。完成确认后，后续表单内容才会
转发到该邮箱。
