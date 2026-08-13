import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseDocument,
  repositoryPathToSlug,
  serializeDocument,
  splitCommaList,
} from '../src/lib/content-formats.ts'
import {
  canPushRepository,
  decodeBase64,
  encodeBase64,
  encodeBytesBase64,
  GitHubApiError,
} from '../src/lib/github-editor.ts'
import oauthWorker from '../workers/github-oauth/src/index.ts'
import { readFileSync } from 'node:fs'

test('repository access requires a GitHub write-capable permission', () => {
  const base = {
    full_name: 'Future-Game-Laboratory/Future-Game-Laboratory.github.io',
    default_branch: 'main',
    html_url: 'https://github.com/Future-Game-Laboratory/Future-Game-Laboratory.github.io',
  }

  assert.equal(canPushRepository({ ...base, permissions: { pull: true } }), false)
  assert.equal(canPushRepository({ ...base, permissions: { triage: true } }), false)
  assert.equal(canPushRepository({ ...base, permissions: { push: true } }), true)
  assert.equal(canPushRepository({ ...base, permissions: { maintain: true } }), true)
  assert.equal(canPushRepository({ ...base, permissions: { admin: true } }), true)
})

test('GitHub API errors retain their HTTP status for conflict handling', () => {
  const error = new GitHubApiError(409, 'sha does not match', 'https://docs.github.com/')
  assert.equal(error.name, 'GitHubApiError')
  assert.equal(error.status, 409)
  assert.equal(error.message, 'sha does not match')
  assert.equal(error.documentationUrl, 'https://docs.github.com/')
})

test('content format preserves unicode frontmatter and markdown', () => {
  const source = `---
title: '未来游戏研究所'
description: "一段摘要"
date: 2026-08-13
tags: ['研究', 'game-design']
draft: false
---

## 正文

保留中文与 emoji 🎮。
`
  const parsed = parseDocument(source)
  assert.equal(parsed.attributes.title, '未来游戏研究所')
  assert.deepEqual(parsed.attributes.tags, ['研究', 'game-design'])
  assert.equal(parsed.attributes.draft, false)

  const serialized = serializeDocument(parsed.attributes, parsed.body)
  const roundtrip = parseDocument(serialized)
  assert.deepEqual(roundtrip, parsed)
})

test('content helpers normalize lists and repository slugs', () => {
  assert.deepEqual(splitCommaList('研究, game-design, ,tools'), [
    '研究',
    'game-design',
    'tools',
  ])
  assert.equal(
    repositoryPathToSlug('src/content/blog/future-notes/index.mdx'),
    'future-notes',
  )
  assert.equal(repositoryPathToSlug('src/content/projects/game-a.md'), 'game-a')
})

test('GitHub content encoding preserves unicode', () => {
  const source = 'Future Game Laboratory / 未来游戏研究所 🎮'
  assert.equal(decodeBase64(encodeBase64(source)), source)
})

test('GitHub binary encoding preserves image bytes', () => {
  const bytes = Uint8Array.from([0, 1, 2, 127, 128, 254, 255])
  assert.deepEqual(
    Uint8Array.from(Buffer.from(encodeBytesBase64(bytes), 'base64')),
    bytes,
  )
})

test('GitHub binary encoding handles upload-sized buffers in chunks', () => {
  const bytes = Uint8Array.from({ length: 96 * 1024 }, (_, index) => index % 256)
  assert.deepEqual(
    Uint8Array.from(Buffer.from(encodeBytesBase64(bytes), 'base64')),
    bytes,
  )
})

test('project frontmatter supports an unpublished draft state', () => {
  const source = serializeDocument(
    {
      name: '未公开项目',
      description: '仍在整理',
      tags: ['prototype'],
      image: '../../../public/static/1200x630.png',
      link: 'https://example.com',
      draft: true,
    },
    '',
  )
  const parsed = parseDocument(source)
  assert.equal(parsed.attributes.draft, true)
  assert.deepEqual(parsed.attributes.tags, ['prototype'])
})

const oauthEnv = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGIN: 'https://future-game-laboratory.github.io',
  CALLBACK_URL: 'https://future-game-laboratory.github.io/edits/',
}

test('OAuth worker rejects invalid state and emits a fixed GitHub callback', async () => {
  const invalid = await oauthWorker.fetch(
    new Request('https://oauth.example/authorize?state=short'),
    oauthEnv,
  )
  assert.equal(invalid.status, 400)
  assert.equal(invalid.headers.get('cache-control'), 'no-store')

  const state = 'a'.repeat(64)
  const challenge = 'b'.repeat(43)
  const redirect = await oauthWorker.fetch(
    new Request(
      `https://oauth.example/authorize?state=${state}&code_challenge=${challenge}`,
    ),
    oauthEnv,
  )
  assert.equal(redirect.status, 302)
  assert.equal(redirect.headers.get('cache-control'), 'no-store')
  assert.equal(redirect.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(redirect.headers.get('x-content-type-options'), 'nosniff')
  const location = new URL(redirect.headers.get('location') || '')
  assert.equal(location.origin, 'https://github.com')
  assert.equal(location.pathname, '/login/oauth/authorize')
  assert.equal(location.searchParams.get('redirect_uri'), oauthEnv.CALLBACK_URL)
  assert.equal(location.searchParams.get('scope'), 'read:user public_repo')
  assert.equal(location.searchParams.get('state'), state)
  assert.equal(location.searchParams.get('code_challenge'), challenge)
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256')
})

test('OAuth worker enforces origin and exchanges only the supplied code', async () => {
  const denied = await oauthWorker.fetch(
    new Request('https://oauth.example/token', {
      method: 'POST',
      headers: { Origin: 'https://attacker.example' },
      body: JSON.stringify({
        code: 'stolen-code',
        code_verifier: 'v'.repeat(64),
      }),
    }),
    oauthEnv,
  )
  assert.equal(denied.status, 403)

  const wrongContentType = await oauthWorker.fetch(
    new Request('https://oauth.example/token', {
      method: 'POST',
      headers: {
        Origin: oauthEnv.ALLOWED_ORIGIN,
        'Content-Type': 'text/plain',
      },
      body: '{}',
    }),
    oauthEnv,
  )
  assert.equal(wrongContentType.status, 415)

  const originalFetch = globalThis.fetch
  let exchangeBody: Record<string, string> | undefined
  globalThis.fetch = async (_input, init) => {
    exchangeBody = JSON.parse(String(init?.body)) as Record<string, string>
    return Response.json({
      access_token: 'temporary-token',
      scope: 'read:user,public_repo',
      token_type: 'bearer',
    })
  }

  try {
    const response = await oauthWorker.fetch(
      new Request('https://oauth.example/token', {
        method: 'POST',
        headers: {
          Origin: oauthEnv.ALLOWED_ORIGIN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'single-use-code',
          code_verifier: 'v'.repeat(64),
        }),
      }),
      oauthEnv,
    )
    assert.equal(response.status, 200)
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      oauthEnv.ALLOWED_ORIGIN,
    )
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(exchangeBody, {
      client_id: oauthEnv.GITHUB_CLIENT_ID,
      client_secret: oauthEnv.GITHUB_CLIENT_SECRET,
      code: 'single-use-code',
      code_verifier: 'v'.repeat(64),
      redirect_uri: oauthEnv.CALLBACK_URL,
    })
    assert.deepEqual(await response.json(), {
      access_token: 'temporary-token',
      scope: 'read:user,public_repo',
      token_type: 'bearer',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('editor implementation keeps the repository permission and content gates wired', () => {
  const manager = readFileSync(
    new URL('../src/components/content-manager.tsx', import.meta.url),
    'utf8',
  )
  const api = readFileSync(
    new URL('../src/lib/github-editor.ts', import.meta.url),
    'utf8',
  )
  const workflow = readFileSync(
    new URL('../.github/workflows/deploy-pages.yml', import.meta.url),
    'utf8',
  )

  assert.match(manager, /if \(!canPushRepository\(nextAccess\)\)/)
  assert.match(api, /permissions\?\.push/)
  assert.match(api, /permissions\?\.maintain/)
  assert.match(api, /permissions\?\.admin/)
  for (const path of [
    'src/data/home.json',
    'src/data/contact.json',
    'public/static/carousel/',
    'src/content/pages/about.md',
    'src/content/pages/works.md',
    'src/content/blog/',
    'src/content/projects/',
    'src/content/authors/',
  ]) {
    assert.match(manager, new RegExp(path.replace(/[./]/g, '\\$&')))
  }
  assert.match(workflow, /PUBLIC_GITHUB_OAUTH_PROXY:/)
})

test('site typecheck excludes the editor-only dependency stubs', () => {
  const tsconfig = JSON.parse(
    readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'),
  ) as { exclude?: string[] }
  const editorTypecheck = readFileSync(
    new URL('./typecheck-editor.mjs', import.meta.url),
    'utf8',
  )

  assert.ok(tsconfig.exclude?.includes('tests/types/editor-stubs.d.ts'))
  assert.match(editorTypecheck, /tests\/types\/editor-stubs\.d\.ts/)
})
