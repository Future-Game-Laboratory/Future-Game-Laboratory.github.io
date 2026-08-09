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
  assert.doesNotMatch(sitemap, /\/editor\//)
  assert.doesNotMatch(sitemap, /\/edits\//)
})

test('editor page contains its hydrated app and publishing controls', () => {
  const editor = readFileSync(join(dist, 'edits/index.html'), 'utf8')
  assert.match(editor, /内容编辑器/)
  assert.match(editor, /正文（Markdown \/ MDX）/)
  assert.match(editor, /提交并触发构建/)
  assert.match(editor, /content-editor\.[^"']+\.js/)
})

test('nixie loader renders an eight-tube six-decimal progress display', () => {
  const homepage = readFileSync(join(dist, 'index.html'), 'utf8')
  const tubes = homepage.match(/<span class="nixie-tube"[^>]+data-nixie-tube/g)
  const cathodes = homepage.match(/data-digit="[0-9]"/g)

  assert.equal(tubes?.length, 8)
  assert.equal(cathodes?.length, 80)
  assert.match(homepage, /role="progressbar"/)
  assert.match(homepage, /aria-valuetext="加载进度 00\.000000%"/)
  assert.doesNotMatch(homepage, /nixie-loader__track|nixie-timecode/)
})

test('homepage keeps the cover and a single announcement entry point', () => {
  const homepage = readFileSync(join(dist, 'index.html'), 'utf8')
  assert.match(homepage, /\/static\/forked-light-cover\.webp/)
  assert.match(homepage, /class="announcement-panel"/)
  assert.doesNotMatch(
    homepage,
    /class="(?:front-hero|front-directory|front-sidebar|front-closing)"/,
  )
})

test('contact hides unconfigured SNS links and about renders Markdown', () => {
  const contact = readFileSync(join(dist, 'contact/index.html'), 'utf8')
  const about = readFileSync(join(dist, 'about/index.html'), 'utf8')
  assert.doesNotMatch(contact, /href=""/)
  assert.doesNotMatch(contact, /class="social-buttons"/)
  assert.match(about, /<h1 id="关于">关于<\/h1>/)
  assert.match(about, /<h2 id="-成员">■ 成员<\/h2>/)
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
