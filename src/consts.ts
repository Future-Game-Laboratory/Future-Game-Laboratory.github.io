import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: '未来游戏研究所',
  description: '未来游戏研究所的研究、开发记录与游戏创作实践。',
  href: 'https://future-game-laboratory.github.io/',
  author: '未来游戏研究所',
  locale: 'zh-CN',
  featuredPostCount: 5,
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

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
