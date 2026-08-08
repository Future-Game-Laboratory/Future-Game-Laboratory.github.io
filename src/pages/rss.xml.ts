import { SITE } from '@/consts'
import rss from '@astrojs/rss'
import { getAllPosts } from '@/lib/data-utils'

export async function GET() {
  try {
    const posts = await getAllPosts()

    return rss({
      title: SITE.title,
      description: SITE.description,
      site: SITE.href,
      items: posts.map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.date,
        link: `blog/${post.id}/`,
      })),
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return new Response('Error generating RSS feed', { status: 500 })
  }
}
