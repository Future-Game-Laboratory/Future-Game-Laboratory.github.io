import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: '未来游戏研究所',
  description: '未来游戏研究所的研究、开发记录与游戏创作实践。',
  href: 'https://future-game-laboratory.github.io/',
  author: '未来游戏研究所',
  locale: 'zh-CN',
  featuredPostCount: 6,
  postsPerPage: 5,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/blog',
    label: 'NEWS',
  },
  {
    href: '/works',
    label: 'WORKS',
  },
  {
    href: '/about',
    label: 'ABOUT',
  },
  {
    href: '/contact',
    label: 'CONTACT',
  },
]

// 联系方式配置：填写后显示；SNS 链接留空时不会渲染对应按钮。
// email 同时作为首页明文邮箱和默认 FormSubmit 收件人；formEndpoint 可覆盖为自有表单服务地址。
export const CONTACT = {
  email: '',
  formEndpoint: '',
  socials: [
    {
      label: '小红书',
      href: '',
      icon: 'xiaohongshu',
    },
    {
      label: 'X',
      href: '',
      icon: 'x-social',
    },
    {
      label: '哔哩哔哩',
      href: '',
      icon: 'bilibili',
    },
  ],
} as const

// 首页侧栏公告：只维护标题与正文，不与 NEWS 文章内容耦合。
export const HOME_ANNOUNCEMENT = {
  title: '公告',
  body: '未来游戏研究所的最新活动、研究计划与网站更新将在这里发布。',
} as const

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
