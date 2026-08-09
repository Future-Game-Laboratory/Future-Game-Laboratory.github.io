---
name: Future Game Laboratory
description: 未校准的未来信号——精密、实验性、神秘的游戏研究界面
colors:
  observation-white: '#F4F6F3'
  carbon-ink: '#0B0D10'
  instrument-gray: '#5B626A'
  structural-line: '#B8BEC4'
  ion-cyan: '#00C6D7'
  ion-cyan-ink: '#00646D'
  anomaly-magenta: '#E2007A'
  anomaly-magenta-ink: '#9C0055'
  nixie-amber: '#FF7A1A'
  chamber-black: '#0D1014'
  chamber-white: '#F0F3EF'
  chamber-muted: '#A8AFB8'
typography:
  display:
    fontFamily: 'Geist, Arial Black, sans-serif'
    fontSize: 'clamp(3rem, 8vw, 6rem)'
    fontWeight: 760
    lineHeight: 0.9
    letterSpacing: '-0.04em'
  headline:
    fontFamily: 'Geist, PingFang SC, Noto Sans SC, sans-serif'
    fontSize: 'clamp(2rem, 5vw, 4.5rem)'
    fontWeight: 680
    lineHeight: 1.02
    letterSpacing: '-0.035em'
  body:
    fontFamily: 'PingFang SC, Noto Sans SC, Microsoft YaHei, Geist, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: 'normal'
  label:
    fontFamily: 'Geist Mono, SFMono-Regular, Consolas, monospace'
    fontSize: '0.75rem'
    fontWeight: 560
    lineHeight: 1.4
    letterSpacing: '0.08em'
rounded:
  signal: '2px'
  control: '4px'
  surface: '6px'
spacing:
  hairline: '4px'
  compact: '8px'
  control: '12px'
  content: '24px'
  section: '64px'
components:
  button-primary:
    backgroundColor: '{colors.carbon-ink}'
    textColor: '{colors.observation-white}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '12px 18px'
  button-secondary:
    backgroundColor: '{colors.observation-white}'
    textColor: '{colors.carbon-ink}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '12px 18px'
  field:
    backgroundColor: '{colors.observation-white}'
    textColor: '{colors.carbon-ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '12px 14px'
  signal-chip:
    backgroundColor: '{colors.carbon-ink}'
    textColor: '{colors.observation-white}'
    typography: '{typography.label}'
    rounded: '{rounded.signal}'
    padding: '6px 9px'
---

# Design System: Future Game Laboratory

## 1. Overview

**Creative North Star: “未校准的未来信号”**

界面像一台正在运行、尚未完全校准的研究仪器：主体是强对比的冷白与碳黑，信息被细线、编号、坐标和明确的阅读宽度精密组织；离子青与异常洋红仅在关键状态发生轻微色差，让访客感到系统背后仍有未知变量。它借用复古科幻设备的物理感，但拒绝把页面装扮成影视道具。

首页允许不对称的大尺度构图，正文与编辑器则回到克制、稳定的工作表面。一次编排式首屏入场和少量滚动揭示负责建立气氛，内容始终默认可见。辉光管加载器是唯一的暖色仪式：短暂点亮后完全退出，不把琥珀色扩散为通用强调色。

**Key Characteristics:**

- 冷白画布、碳黑结构和 1px—1.5px 仪器线。
- 青/洋红色差信号稀少且有明确语义。
- 首页不对称，长文稳定，编辑器密集但不拥挤。
- 小圆角、平面表面、状态驱动的物理位移。
- 中等动效强度，完整支持减弱动效。

**The Signal Budget Rule.** 每个视口只允许一个主要色差信号；当青与洋红同时出现时，它们必须属于同一交互或同一标题。

## 2. Colors

冷白与碳黑构成可信的观测环境；青与洋红标记失真，琥珀橙只属于辉光管启动阶段。

### Primary

- **碳墨黑 / Carbon Ink:** 主文字、主要按钮、技术分区与结构性大色块。
- **观测白 / Observation White:** 主要画布与浅色表面；保持中性，不使用米黄纸张感。

### Secondary

- **离子青 / Ion Cyan:** 左向色差、焦点辅助信号和少量数据状态；正文链接使用更深的 Ion Cyan Ink。
- **异常洋红 / Anomaly Magenta:** 右向色差、活动状态和错误之外的异常提示；白底文字使用更深的 Anomaly Magenta Ink。

### Tertiary

- **辉光琥珀 / Nixie Amber:** 仅用于加载器数字、玻璃管余辉和对应进度线。页面完成加载后不得作为常规 CTA 色。

### Neutral

- **仪器灰 / Instrument Gray:** 次要说明与元数据。
- **结构线 / Structural Line:** 浅色主题分隔线、输入框边界与网格。
- **腔体黑 / Chamber Black:** 深色主题底色与全屏导航。
- **腔体白 / Chamber White:** 深色主题主文字。
- **腔体灰 / Chamber Muted:** 深色主题次要信息。

**The Warmth Is Temporal Rule.** 琥珀橙只在“系统正在启动”的时间段出现；如果页面静止后仍有橙色装饰，设计即不合格。

## 3. Typography

**Display Font:** Geist（回退 Arial Black / sans-serif）

**Body Font:** PingFang SC / Noto Sans SC / Microsoft YaHei（回退 Geist / sans-serif）

**Label/Mono Font:** Geist Mono（回退 SFMono-Regular / Consolas / monospace）

**Character:** 粗重、紧凑的拉丁显示字像仪器铭牌，中文正文则保持成熟的系统无衬线阅读体验。等宽字体只服务于坐标、编号、时间、代码与短标签，不把所有内容伪装成终端。

### Hierarchy

- **Display**（760，`clamp(3rem, 8vw, 6rem)`，0.9）：首页 FGL 标识和唯一的超大命题。
- **Headline**（680，`clamp(2rem, 5vw, 4.5rem)`，1.02）：页面标题与文章标题。
- **Title**（640，`clamp(1.25rem, 2vw, 1.75rem)`，1.2）：文章卡片和模块标题。
- **Body**（400，1rem，1.8）：正文限定在 68ch—72ch，中文段落使用自然字距。
- **Label**（560，0.75rem，0.08em）：仅用于短英文标签、时间、序号、状态和坐标。

**The Two Voices Rule.** 显示字负责“观测系统的声音”，正文负责“研究者的声音”；不得把整页正文压缩成全大写或等宽文本。

## 4. Elevation

系统默认完全平面，以结构线、反色区块、错位色影和内容层级建立深度。常规卡片没有环境阴影；按钮和可点击文章在悬停或键盘聚焦时产生 2px 青/洋红反向错位，像打印套色短暂失准。辉光只属于辉光管加载器。

### Shadow Vocabulary

- **Signal Offset**（`2px 2px 0 rgba(226,0,122,.72), -2px -2px 0 rgba(0,198,215,.72)`）：主要交互的悬停与焦点反馈。
- **Nixie Bloom**（`0 0 8px rgba(255,122,26,.85), 0 0 24px rgba(255,122,26,.38)`）：加载器发光数字，不得用于常规文本。

**The Flat Until Touched Rule.** 表面静止时保持平面；只有用户交互或系统状态变化才允许出现影子。

## 5. Components

### Buttons

- **Shape:** 紧凑、近方形边缘（4px）。
- **Primary:** 碳黑底、观测白字，标签字体，12px × 18px 内边距。
- **Hover / Focus:** 轻微上移 1px，并出现 Signal Offset；焦点同时保留 2px 可见轮廓。
- **Secondary / Ghost:** 透明或观测白底、1px 结构线；不得变成圆形胶囊。

### Chips

- **Style:** 2px 小圆角、1px 边线或碳黑反色，使用 `#`、计数或短状态文本。
- **State:** 当前筛选使用反色并附带单侧 1px 色差信号；未选中状态保持平面。

### Cards / Containers

- **Corner Style:** 6px 或无圆角，取决于是否为可独立操作的容器。
- **Background:** 与画布同色；深色专题区使用 Chamber Black。
- **Shadow Strategy:** 静止无阴影；交互时才使用 Signal Offset。
- **Border:** 1px—1.5px 碳黑/结构线完整边框，禁止彩色侧边条。
- **Internal Padding:** 16px—24px；文章列表可用横向规则而不是重复卡片盒。

### Inputs / Fields

- **Style:** 冷白底、1px 结构线、4px 圆角，最小高度 44px。
- **Focus:** 边界转为碳黑并出现外层青色焦点环，不删除浏览器可见焦点。
- **Error / Disabled:** 错误使用文字、图标和边界共同表达；禁用状态仍保证文字可读。

### Navigation

桌面导航是细线结构的顶部仪器栏；活动页以实心文字和小型信号刻度标记。移动端展开为深色全屏导航，项目按大字级垂直排列并带短编号，支持 Escape、焦点管理和滚动锁定。

### Nixie Boot Sequence

由三组辉光管字符组成，显示 `FGL`、阶段编号和短时间码。加载层在文档解析时即出现，最长约 1.4 秒，可点击“跳过”；不锁住辅助技术，页面内容在其后已可用。`prefers-reduced-motion: reduce` 下不执行数字翻转和位移，仅做不超过 120ms 的淡出。

## 6. Do's and Don'ts

### Do:

- **Do** 用不对称首页构图表达实验室品牌，用稳定的 68ch—72ch 阅读列承载长文。
- **Do** 让青/洋红色差与导航、焦点、状态或标题揭示建立明确关系。
- **Do** 保留现有路由、RSS、主题、内容模型、GitHub Pages 与编辑器发布行为。
- **Do** 为所有动效提供 `prefers-reduced-motion` 替代，并保证内容默认可见。
- **Do** 让辉光管加载器可跳过、短暂且只出现暖色时间信号。

### Don't:

- **Don't** 做成“通用 SaaS 落地页模板与可替换品牌名的卡片网格”。
- **Don't** 使用“纯黑底、满屏霓虹与持续发光的廉价赛博朋克视觉”。
- **Don't** 直接复刻“动漫角色官网、Steins;Gate 标志、角色、文案、图像或专有纹理”。
- **Don't** 使用“为装饰而使用的玻璃拟态、渐变文字和无意义技术图表”。
- **Don't** 使用渐变文字、彩色粗侧边条、重复小型大写眉题或无信息意义的章节编号。
- **Don't** 让标题在任何视口溢出，或让加载动画阻塞阅读、键盘和辅助技术。
