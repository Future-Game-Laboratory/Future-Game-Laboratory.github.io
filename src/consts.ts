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
    href: '/',
    label: '首页',
  },
  {
    href: '/blog',
    label: '资讯',
  },
  {
    href: '/works',
    label: '项目',
  },
  {
    href: '/about',
    label: '研究所',
  },
  {
    href: '/contact',
    label: '联系',
  },
]

// 联系方式配置：填写后显示；SNS 链接留空时不会渲染对应按钮。
export const CONTACT = {
  email: '',
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

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
