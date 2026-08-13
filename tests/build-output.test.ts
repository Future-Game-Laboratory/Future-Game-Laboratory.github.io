import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import test from 'node:test'

const root = new URL('../', import.meta.url).pathname
const dist = join(root, 'dist')
const base = '/'
const origin = 'https://future-game-laboratory.github.io'

const walk = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })

const resolvesToOutput = (pathname: string) => {
  const decoded = decodeURIComponent(pathname)
  const relativePath = decoded
    .slice(base.length)
    .replace(/^\//, '')
    .replace(/\/$/, '')
  const exact = join(dist, relativePath)
  return (
    existsSync(exact) ||
    existsSync(join(exact, 'index.html')) ||
    (!extname(exact) && existsSync(`${exact}.html`))
  )
}

test('all generated internal links and assets resolve inside dist', () => {
  assert.ok(existsSync(dist), 'dist is missing; run npm run build first')
  const files = walk(dist).filter((file) => /\.(?:html|css)$/.test(file))
  const missing: string[] = []

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const references = [
      ...source.matchAll(/(?:href|src)=["']([^"']+)["']/g),
      ...source.matchAll(/url\(["']?([^"')]+)["']?\)/g),
    ].map((match) => match[1])

    for (const reference of references) {
      if (
        reference.startsWith('#') ||
        reference.startsWith('data:') ||
        reference.startsWith('mailto:')
      )
        continue

      let pathname: string
      if (reference.startsWith(origin)) pathname = new URL(reference).pathname
      else if (reference.startsWith('/')) pathname = reference.split(/[?#]/)[0]
      else continue

      if (!pathname.startsWith(base) || !resolvesToOutput(pathname)) {
        missing.push(`${relative(dist, file)} -> ${reference}`)
      }
    }
  }

  assert.deepEqual(missing, [])
})

test('private editor is noindex and absent from sitemap', () => {
  const editor = readFileSync(join(dist, 'edits/index.html'), 'utf8')
  const sitemap = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8')
  assert.match(editor, /<meta name="robots" content="noindex, nofollow">/)
  assert.equal(existsSync(join(dist, 'editor/index.html')), false)
  assert.doesNotMatch(sitemap, /\/editor\//)
  assert.doesNotMatch(sitemap, /\/edits\//)
})

test('editor page contains its hydrated app and publishing controls', () => {
  const editor = readFileSync(join(dist, 'edits/index.html'), 'utf8')
  assert.match(editor, /内容管理后台/)
  assert.match(editor, /使用 GitHub 登录/)
  assert.match(editor, /没有编辑权限的账号无法进入/)
  assert.match(editor, /content-manager\.[^"']+\.js/)
  assert.doesNotMatch(editor, /fgl-editor-token|Personal Access Token/)
})

test('nixie loader renders an eight-tube six-decimal progress display', () => {
  const homepage = readFileSync(join(dist, 'index.html'), 'utf8')
  const tubes = homepage.match(/<span class="nixie-tube"[^>]+data-nixie-tube/g)
  const cathodes = homepage.match(/data-digit="[0-9]"/g)
  const glows = homepage.match(/class="nixie-tube__glow"/g)
  const glassLayers = homepage.match(/class="nixie-tube__glass"/g)
  const chassis = homepage.match(/class="nixie-loader__chassis"/g)

  assert.equal(tubes?.length, 8)
  assert.equal(cathodes?.length, 80)
  assert.equal(glows?.length, 8)
  assert.equal(glassLayers?.length, 8)
  assert.equal(chassis?.length, 1)
  assert.match(homepage, /role="progressbar"/)
  assert.match(homepage, /aria-valuetext="加载进度 00\.000000%"/)
  assert.doesNotMatch(
    homepage,
    /nixie-loader__(?:header|telemetry|skip|rail|track)|nixie-timecode/,
  )
})

test('generated pages keep the single white theme and omit breadcrumbs', () => {
  const pages = walk(dist).filter((file) => file.endsWith('.html'))

  for (const page of pages) {
    const source = readFileSync(page, 'utf8')
    assert.doesNotMatch(source, /id="theme-toggle"/)
    assert.doesNotMatch(source, /data-slot="breadcrumb"/)
    assert.doesNotMatch(source, /data-theme="dark"/)
  }
})

test('homepage keeps the ordered carousel, NEWS entry point, and lean footer', () => {
  const homepage = readFileSync(join(dist, 'index.html'), 'utf8')
  const footer = homepage.match(
    /<footer class="site-footer"[\s\S]*?<\/footer>/,
  )?.[0]
  assert.match(homepage, /\/static\/future-game-laboratory-lockup\.png/)
  const brandLink = homepage.match(
    /<a[^>]*href="\/"[^>]*class="[^"]*brand-lockup[^"]*"[^>]*>/,
  )?.[0]
  assert.ok(brandLink)
  assert.match(brandLink, /data-astro-reload/)
  assert.match(homepage, /\/static\/carousel\/01-forked-light-cover\.webp/)
  assert.match(homepage, /data-poster-carousel/)
  assert.match(homepage, /class="announcement-panel"/)
  assert.match(homepage, /class="home-information"/)
  assert.match(homepage, /class="home-sidebar"/)
  const homeSocials = homepage.match(
    /<section class="home-socials"[\s\S]*?<\/section>/,
  )?.[0]
  assert.ok(homeSocials)
  assert.match(
    homeSocials,
    /href="https:\/\/github\.com\/Future-Game-Laboratory"/,
  )
  assert.match(homeSocials, /href="\/rss\.xml"/)
  assert.ok(
    homeSocials.indexOf('aria-label="GitHub"') <
      homeSocials.indexOf('aria-label="RSS"'),
  )
  assert.doesNotMatch(homeSocials, /<span>|title=/)
  assert.match(homepage, /class="news-triangle"/)
  const homepageNews = homepage.match(/<ol class="news-list">([\s\S]*?)<\/ol>/)
  assert.ok((homepageNews?.[1].match(/<li>/g) ?? []).length <= 5)
  assert.match(homepage, /id="announcement-title">公告</)
  assert.match(homepage, /data-title-reveal/)
  const menuTrigger = homepage.match(
    /<button[^>]*class="[^"]*menu-trigger[^"]*"[\s\S]*?<\/button>/,
  )?.[0]
  assert.ok(menuTrigger)
  assert.match(menuTrigger, /aria-label="打开导航"/)
  assert.match(menuTrigger, /aria-expanded="false"/)
  assert.equal((menuTrigger.match(/menu-icon__line/g) ?? []).length, 3)
  assert.doesNotMatch(menuTrigger, />MENU</)
  assert.ok(footer)
  assert.doesNotMatch(footer, /<nav|href=/)
  assert.doesNotMatch(footer, /FUTURE GAME LABORATORY|signal-label/)
  assert.match(
    footer,
    /© 2026 未来游戏研究所 All Rights Reserved\./,
  )
  assert.doesNotMatch(footer, /持续研究|公开过程/)
  for (const label of ['NEWS', 'WORKS', 'ABOUT', 'CONTACT']) {
    assert.match(homepage, new RegExp(`>${label}<`))
  }
  assert.doesNotMatch(homepage, />HOME</)
  assert.doesNotMatch(homepage, />INFORMATION</)
  assert.doesNotMatch(homepage, /href="\/edits\/?"/)
  assert.doesNotMatch(homepage, /class="home-contact"/)
  assert.doesNotMatch(homepage, /mailto:/)
  assert.doesNotMatch(
    homepage,
    /class="(?:front-hero|front-directory|front-sidebar|front-closing)"/,
  )
})

test('contact renders the email form while unconfigured channels stay hidden', () => {
  const contact = readFileSync(join(dist, 'contact/index.html'), 'utf8')
  const about = readFileSync(join(dist, 'about/index.html'), 'utf8')
  const form = contact.match(/<form[\s\S]*?>/)?.[0]

  assert.ok(form)
  assert.match(form, /method="POST"/)
  assert.doesNotMatch(form, /action=/)
  for (const field of ['name', 'email', 'organization', 'phone', 'message']) {
    assert.match(contact, new RegExp(`name="${field}"`))
  }
  assert.match(contact, /<button[^>]*disabled[^>]*>/)
  assert.match(contact, /表单收件地址正在配置中/)
  assert.doesNotMatch(contact, /href=""/)
  assert.doesNotMatch(contact, /class="social-buttons"/)
  assert.match(about, /data-title-text="ABOUT"/)
  assert.match(about, /<h2 id="institute">INSTITUTE<\/h2>/)
  assert.match(about, /<h2 id="members">MEMBERS<\/h2>/)
  assert.match(about, /<h2 id="links">LINKS<\/h2>/)
})

test('compiled styles use the narrow document-width frame', () => {
  const styles = walk(dist)
    .filter((file) => file.endsWith('.css'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')

  assert.match(styles, /--site-max:\s*64rem/)
  assert.match(
    styles,
    /\.desktop-navigation[^\{]*\{[^\}]*margin-left:\s*auto/,
  )
  assert.match(
    styles,
    /\.navigation-controls[^\{]*\{[^\}]*display:\s*none/,
  )
  assert.match(
    styles,
    /\.site-menu[^\{]*\{[^\}]*background:\s*#090909[^\}]*color:\s*#(?:fff|ffffff)/,
  )
  assert.match(styles, /\.menu-toggle[^\{]*\{[^\}]*border:\s*0/)
  assert.match(
    styles,
    /\.menu-trigger[^\{]*\{[^\}]*background:\s*#090909[^\}]*color:\s*#(?:fff|ffffff)[^\}]*box-shadow:\s*var\(--signal-shadow\)/,
  )
  assert.match(
    styles,
    /\.menu-icon__line[^\{]*\{[^\}]*height:\s*2px/,
  )
})

test('section headers omit decorative labels and redundant rules', () => {
  const news = readFileSync(join(dist, 'blog/index.html'), 'utf8')
  const works = readFileSync(join(dist, 'works/index.html'), 'utf8')

  assert.doesNotMatch(news, /NEWS ARCHIVE \/ PAGE|class="signal-label"/)
  assert.doesNotMatch(works, /WORKS \/ PROJECTS|W \/ 001|class="signal-label"/)
})

test('draft sample projects stay out of the public WORKS page', () => {
  const works = readFileSync(join(dist, 'works/index.html'), 'utf8')
  assert.doesNotMatch(works, /Project [ABC]/)
  assert.doesNotMatch(works, /PROJECT \/ EXTERNAL/)
})

test('template author and draft template posts are not generated', () => {
  assert.equal(existsSync(join(dist, 'authors/enscribe/index.html')), false)
  assert.equal(existsSync(join(dist, 'blog/2023-post/index.html')), false)
  assert.equal(existsSync(join(dist, 'blog/2024-post/index.html')), false)
})

test('RSS and robots use the GitHub Pages production base', () => {
  const rss = readFileSync(join(dist, 'rss.xml'), 'utf8')
  const robots = readFileSync(join(dist, 'robots.txt'), 'utf8')
  assert.match(
    rss,
    /https:\/\/future-game-laboratory\.github\.io\/blog\/welcome\//,
  )
  assert.match(
    robots,
    /https:\/\/future-game-laboratory\.github\.io\/sitemap-index\.xml/,
  )
})
