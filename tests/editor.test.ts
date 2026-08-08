import assert from 'node:assert/strict'
import test from 'node:test'
import {
  makeMdx,
  slugify,
  splitList,
  toBase64,
  validateDraft,
  type EditorDraft,
} from '../src/lib/editor.ts'

const validDraft: EditorDraft = {
  title: '测试 "标题"',
  description: '一段摘要',
  slug: 'test-post',
  date: '2026-08-08',
  tags: 'game-design, research',
  authors: 'fgl',
  draft: true,
  body: '## 开始\n\n正文',
}

test('normalizes article slugs', () => {
  assert.equal(slugify(' Hello, Astro 6! '), 'hello-astro-6')
  assert.equal(slugify('中文标题'), '')
})

test('normalizes comma-separated fields', () => {
  assert.deepEqual(splitList('game-design, research, ,tools'), [
    'game-design',
    'research',
    'tools',
  ])
})

test('generates schema-compatible MDX frontmatter', () => {
  const mdx = makeMdx(validDraft)
  assert.match(mdx, /^---\ntitle: "测试 \\"标题\\""/)
  assert.match(mdx, /tags: \["game-design","research"\]/)
  assert.match(mdx, /authors: \["fgl"\]/)
  assert.match(mdx, /draft: true\n---\n\n## 开始/)
})

test('validates required fields and slug format', () => {
  assert.equal(validateDraft(validDraft), '')
  assert.equal(
    validateDraft({ ...validDraft, slug: '中文路径' }),
    '文章路径仅支持小写字母、数字和连字符。',
  )
})

test('base64 encoding preserves unicode content', () => {
  const encoded = toBase64('Future Game Lab / 未来游戏实验室')
  assert.equal(
    Buffer.from(encoded, 'base64').toString('utf8'),
    'Future Game Lab / 未来游戏实验室',
  )
})
