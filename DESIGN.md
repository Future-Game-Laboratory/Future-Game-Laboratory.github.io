---
name: 未来游戏研究所
description: 纯白标题页上的研究刊物——克制、戏剧化、带有轻微的未来错位
colors:
  paper-white: '#FFFFFF'
  ink-black: '#090909'
  quiet-gray: '#575B60'
  structural-gray: '#B8BEC4'
  chromatic-cyan: '#00C6D7'
  chromatic-magenta: '#E2007A'
  nixie-amber: '#FF7A1A'
typography:
  display:
    fontFamily: 'Songti SC, STSong, Noto Serif SC, Source Han Serif SC, serif'
    fontSize: 'clamp(2.5rem, 7vw, 5.5rem)'
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: '-0.04em'
  body:
    fontFamily: 'PingFang SC, Noto Sans SC, Microsoft YaHei, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: normal
  label:
    fontFamily: 'Geist Mono, SFMono-Regular, Consolas, monospace'
    fontSize: '0.72rem'
    fontWeight: 560
    lineHeight: 1.4
    letterSpacing: '0.08em'
rounded:
  signal: '2px'
  control: '4px'
  surface: '4px'
spacing:
  compact: '8px'
  control: '12px'
  content: '24px'
  section: '64px'
components:
  button-primary:
    backgroundColor: '{colors.ink-black}'
    textColor: '{colors.paper-white}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '12px 18px'
  button-secondary:
    backgroundColor: '{colors.paper-white}'
    textColor: '{colors.ink-black}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '12px 18px'
  field:
    backgroundColor: '{colors.paper-white}'
    textColor: '{colors.ink-black}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '12px 14px'
---

# Design System: 未来游戏研究所

## 1. Overview

**Creative North Star: “来自未来的白色标题页”**

站点首先是一份可阅读的社团刊物，而不是一台仪器。真正的纯白画布、书宋体中文标题、冷静的黑色结构线与大面积留白构成主体；青与洋红像印刷套色偶尔偏移，只在文字切换、焦点和当前状态中短暂出现。社团提供的中文标识是唯一品牌主角，不以 `FGL` 字母或抽象技术图替代。

界面借鉴 Steins;Gate 官网的排版张力与遮罩显影，但不复制其人物、标志、文案或纹理。首页直接采用社团提供的《歧光》作品图作为完整封面，栏目骨架参考晓 Records 的「品牌导航—主视觉—Information 时间流」关系；项目、研究所和联系只保留在全站导航中，不在首页重复出现。Edits 是主导航之外的工具入口。不设置 Discography、Music 或独立 SNS 内容分区。

## 2. Colors

- **Paper White `#FFFFFF`：** 浅色主题页面和主要表面。禁止用米白或灰白替代。
- **Ink Black `#090909`：** 正文、边线、反色章节与深色主题底色。
- **Quiet Gray `#575B60`：** 次要说明；深色主题使用足够对比度的浅灰。
- **Structural Gray `#B8BEC4`：** 输入框和非关键分隔线。
- **Chromatic Cyan `#00C6D7` / Magenta `#E2007A`：** 仅用于成对色差、焦点和短暂切换反馈。
- **Nixie Amber `#FF7A1A`：** 只属于启动加载器，页面稳定后不作为常规强调色。

每个视口只保留一个主要色差事件。静止内容以黑白为主，颜色必须有状态含义。

## 3. Typography

- **中文展示字：** Songti SC / STSong / Noto Serif SC。用于首页命题、页面标题与关键章节，形成文学性和戏剧停顿。
- **正文：** PingFang SC / Noto Sans SC / Microsoft YaHei。长文控制在约 68–72ch，行高 1.8。
- **短标签：** Geist Mono。只用于英文导航代码、日期、编号和短状态，不把正文伪装成终端。

内页标题使用双层黑白遮罩显影，短英文标签可使用一次性的 `0 / 1` 字符解析。减弱动效模式直接显示最终文字。

## 4. Composition

- 首页只保留一张完整作品封面和一个日期驱动的 Information 公告流，不再设置左右分栏、四格目录、栏目侧栏或底部宣言。
- Information 是首页正文中的唯一内容入口；Works、About、Contact 只通过全站导航访问。
- 参考站的滚动框、媒体与商店栏目不照搬；页面只呈现本站真实内容。
- 信息页像杂志目录：大标题、非对称留白、横向规则和列表，不使用技术仪表板。
- 文章归档以年份与横向条目组织；项目和联系页保持同一目录语言。
- 卡片只在内容确实需要独立容器时使用；普通信息优先用分隔线和排版关系。
- 圆角不超过 4px；常规表面无环境阴影。

## 5. Motion

- **Label Resolve：** 约 340ms，只用于少量短标签的一次性字符显影。
- **Title Wipe：** 约 760ms，黑白遮罩横向扫过内页标题。
- **Theme Reveal：** 支持 View Transitions 时，从主题按钮中心以 480ms 圆形揭示；否则以约 240ms 同步淡变颜色、背景和边框。
- **Nixie Boot：** 纯白环境中的八枚冷阴极辉光管以 `XX.XXXXXX` 显示加载百分比；玻璃罩、阳极网、电极残影、胶木底座和琥珀阴极辉光共同建立真实感。计数约 1.65 秒，可跳过，同一会话只出现一次。

所有运动都必须可中断，不阻塞页面内容，并完整支持 `prefers-reduced-motion`。

## 6. Components

- **Navigation：** 中文名称为主、英文代码为辅；移动端为深色全屏目录。Edits 仅出现在目录页脚和站点页脚。
- **Homepage Cover：** 《歧光》保持完整宽高比、占满内容宽度，不叠加额外标语与按钮。
- **Information Feed：** 日期、标题、摘要和目标箭头组成紧凑横向条目；内容增长后仍保持按时间扫描。
- **About Document：** 内容来自独立 Markdown，使用简单标题、段落、图片与链接。
- **Contact Channels：** 邮箱明文显示；小红书、X、哔哩哔哩按非空配置渲染圆形图标按钮。
- **Buttons：** 4px 圆角，黑白反色。悬停可出现 1–2px 青/洋红套色偏移，但不持续发光。
- **Article Lists：** 使用上下边线和图文节奏，不堆叠重复圆角卡片。
- **Fields：** 纯白或纯黑表面、1px 边线、清晰焦点环，最小高度 44px。
- **Brand Mark：** 只使用 `future-game-institute.png` 提供的「未来游戏研究所」标识；深色主题允许整体反相。
- **Nixie Loader：** 背景固定为 `#FFFFFF`，八枚独立管体组成两位整数和六位小数；不使用深色卡片或普通发光数字冒充辉光管。

## 7. Do / Don't

### Do

- 保留清楚的信息层级、日期、来源与阅读宽度。
- 让标题切换、遮罩和色差服务于叙事或状态。
- 保留现有路由、RSS、内容模型、GitHub Pages 和编辑器发布功能。
- 让浅色主题每个主要表面都保持真正的白色。

### Don't

- 不使用超大 `FGL` 字母、观测仪表、坐标网格或无意义技术图表。
- 不添加 Discography、Music、独立 SNS 导航或全站社交图标列表。
- 不使用渐变文字、厚彩色侧边条、玻璃拟态和持续霓虹。
- 不复刻 Steins;Gate 或其他参考站点的专有素材。
