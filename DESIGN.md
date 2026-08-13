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
    fontFamily: 'Geist, Arial Black, PingFang SC, sans-serif'
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

站点首先是一份可阅读的社团刊物，而不是一台仪器。真正的纯白画布、全大写英文栏目标题、冷静的黑色结构线与大面积留白构成主体；青与洋红像印刷套色偶尔偏移，只在文字切换、焦点和当前状态中短暂出现。社团提供的中文标识是唯一品牌主角，不以 `FGL` 字母或抽象技术图替代。

界面借鉴 Steins;Gate 官网的排版张力与遮罩显影，但不复制其人物、标志、文案或纹理。首页以社团作品海报的顺序轮播作为主视觉，栏目骨架参考晓 Records 的「品牌导航—主视觉—News 时间流」关系；SNS 与公告组成 News 右侧的信息栏，Contact 只负责表单。Edits 仅通过直接访问 `/edits/` 使用，不在公开页面提供入口。不设置 Discography、Music 或独立 SNS 内容分区。

## 2. Colors

- **Paper White `#FFFFFF`：** 全站页面画布与常规界面表面。禁止用米白、灰白或全站深色主题替代；移动端全屏导航是唯一黑色覆盖层例外。
- **Ink Black `#090909`：** 正文、边线与移动端全屏导航的背景色。
- **Quiet Gray `#575B60`：** 次要说明。
- **Structural Gray `#B8BEC4`：** 输入框和非关键分隔线。
- **Chromatic Cyan `#00C6D7` / Magenta `#E2007A`：** 仅用于成对色差、焦点和短暂切换反馈。
- **Nixie Amber `#FF7A1A`：** 只属于启动加载器，页面稳定后不作为常规强调色。

每个视口只保留一个主要色差事件。静止内容以黑白为主，颜色必须有状态含义。

## 3. Typography

- **英文展示字：** Geist。用于导航、页面标题与关键栏目，并统一使用全大写。
- **中文内容标题：** Songti SC / STSong / Noto Serif SC。只用于文章与正文内容自身的中文标题。
- **正文：** PingFang SC / Noto Sans SC / Microsoft YaHei。长文控制在约 68–72ch，行高 1.8。
- **短标签：** Geist Mono。只用于英文导航代码、日期、编号和短状态，不把正文伪装成终端。

页面标题使用双层黑白遮罩显影，并以一次性的 `0 / 1 / × / ·` 字符解析显示最终文字。减弱动效模式直接显示最终文字。

## 4. Composition

- 全站外框最大宽度为 `64rem`，扣除页边距后接近 Notion / 飞书文档的默认内容宽度；长文仍收敛到约 68–72ch。
- 首页保留作品海报轮播，并在其下使用左宽右窄的信息分栏：左侧为日期驱动的 News 动态流，右侧依次为 SNS 按钮与独立公告；移动端改为单栏并让 SNS、公告先于 News 显示。不设置四格目录或底部宣言。
- News 是首页正文中的唯一内容入口；Works、About 与 Contact 表单只通过全站导航访问。
- 参考站的滚动框、媒体与商店栏目不照搬；页面只呈现本站真实内容。
- 信息页以大标题和留白建立层级；页面标题本身不附加横向规则，分割线只用于列表行、媒体边界或真实章节转换。
- 文章归档以年份与横向条目组织；项目和联系页保持同一目录语言。
- 卡片只在内容确实需要独立容器时使用；普通信息优先用分隔线和排版关系。
- 圆角不超过 4px；常规表面无环境阴影。

## 5. Motion

- **Label Resolve：** 约 340ms，只用于少量短标签的一次性字符显影。
- **Title Reveal：** 约 720ms，黑白遮罩横向扫过标题，同时短暂解析字符；必须在辉光管加载层退出后启动。
- **Menu Toggle：** 移动端右上角使用 `2.75rem`、4px 圆角且无描边的正方形按钮。关闭状态为黑底、三条等粗 2px 白线，并以青/洋红错位阴影形成短促的故障边缘；打开后切换为白底、2px 黑色叉号。图标在约 260ms 内无弹跳地变形，关闭时沿相同路径反向还原，减弱动效模式立即切换。
- **Poster Cycle：** 海报以约 5.2 秒间隔按文件名顺序循环，使用克制的透明度转场；悬停或键盘聚焦时暂停。
- **Nixie Boot：** 纯白环境中的八枚细长冷阴极辉光管以 `XX.XXXXXX` 显示加载百分比；白热阴极核心、琥珀扩散光、烟色玻璃高光、阳极网、层叠电极、黑色插座与管脚共同安装在横向银色金属机箱上。加载层只显示装置本体，计数约 1.65 秒，同一会话只出现一次。

所有运动都必须可中断，不阻塞页面内容，并完整支持 `prefers-reduced-motion`。

## 6. Components

- **Navigation：** 不显示 Home 项；点击页宽左侧的社团标识返回首页，桌面导航靠同一页宽的右上角显示，其他栏目只显示全大写英文名称。移动端右上角以正方形汉堡按钮打开目录，按钮在相同位置切换为叉号；目录使用 `#090909` 全屏背景、白色品牌标识与白色大标题。公开页面与菜单均不提供 Edits 入口，站点页脚不重复任何导航入口。
- **Homepage Carousel：** 自动读取 `public/static/carousel/`，按文件名自然排序并循环；海报在固定画框内保持完整比例，不叠加标语与按钮。
- **News Feed：** 日期、标题、摘要和目标箭头组成紧凑横向条目；内容增长后仍保持按时间扫描。
- **About Document：** 内容来自独立 Markdown，使用简单标题、段落、图片与链接。
- **Homepage SNS：** 使用统一尺寸的黑底白字图标按钮；RSS 始终显示，小红书、X、哔哩哔哩仅在链接非空时逐项渲染。邮箱不混入首页 SNS，仍作为 Contact 表单的收件配置。
- **Homepage Announcement：** 位于 SNS 下方，仅使用可配置标题与一段正文，不从 News 文章中复用内容。
- **Contact Form：** 单列姓名、回信邮箱、组织、电话和咨询字段，以黑色全宽按钮提交；未配置收件地址时保留表单但禁用发送。
- **Buttons：** 4px 圆角，黑白反色。悬停可出现 1–2px 青/洋红套色偏移，但不持续发光。
- **Article Lists：** 列表只在起点和条目之间使用 1px 分割线；不让相邻组件重复画线，也不用上下边线框住单独的内容块。
- **Fields：** 纯白表面、黑色文字、1px 边线与清晰焦点环，最小高度 44px。
- **Brand Mark：** 页眉使用社团提供的横向 `future-game-laboratory-lockup.png` 标识并保持完整比例，不再裁切方形素材；About 页面仍可使用 `future-game-institute.png`。
- **Nixie Loader：** 背景固定为 `#FFFFFF`，八枚独立细长管体组成两位整数和六位小数，并安装在一体式银色金属机箱上；数字使用白热核心、近场橙光和远场琥珀光三层发光，玻璃、插座和金属面板只反射这些真实光源。除辉光管装置和小数点外不显示标题、状态、轨道或跳过按钮。

## 7. Do / Don't

### Do

- 保留清楚的信息层级、日期、来源与阅读宽度。
- 让标题切换、遮罩和色差服务于叙事或状态。
- 保留现有路由、RSS、内容模型、GitHub Pages 和编辑器发布功能。
- 让页面画布和常规界面表面保持真正的白色；仅移动端全屏导航使用黑色覆盖层。

### Don't

- 不使用超大 `FGL` 字母、观测仪表、坐标网格或无意义技术图表。
- 不添加 Discography、Music、独立 SNS 导航或全站社交图标列表。
- 不使用渐变文字、厚彩色侧边条、玻璃拟态和持续霓虹。
- 不复刻 Steins;Gate 或其他参考站点的专有素材。
