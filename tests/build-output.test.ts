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
