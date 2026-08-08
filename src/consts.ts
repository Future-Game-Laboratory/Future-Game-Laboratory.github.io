import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'Future Game Laboratory',
  description:
    'Future Game Laboratory 的研究、开发记录与游戏创作实践。',
  href: 'https://future-game-laboratory.github.io/FGL-Blog/',
  author: 'Future Game Laboratory',
  locale: 'zh-CN',
  featuredPostCount: 2,
  postsPerPage: 3,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/blog',
    label: '文章',
  },
  {
    href: '/about',
    label: '关于',
  },
  {
    href: '/editor',
    label: '写作',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/Future-Game-Laboratory',
    label: 'GitHub',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
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
