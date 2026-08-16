import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isStarterContentPath,
  isValidContentSlug,
  normalizeContentSlug,
  parseDocument,
  publicPathForSlug,
  repositoryPathForSlug,
  repositoryPathToSlug,
  serializeDocument,
  splitCommaList,
} from '../src/lib/content-formats.ts'
import {
  canPushRepository,
  commitRepositoryChanges,
  decodeBase64,
  encodeBase64,
  encodeBytesBase64,
  GitHubApiError,
  githubErrorMessage,
} from '../src/lib/github-editor.ts'
import {
  applyMarkdownAction,
  continueMarkdownList,
  createMarkdownLinkEdit,
} from '../src/lib/markdown-editor.ts'
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
  const error = new GitHubApiError(
    409,
    'sha does not match',
    'https://docs.github.com/',
    { requestId: 'request-1', rateLimitRemaining: 42 },
  )
  assert.equal(error.name, 'GitHubApiError')
  assert.equal(error.status, 409)
  assert.equal(error.message, 'sha does not match')
  assert.equal(error.documentationUrl, 'https://docs.github.com/')
  assert.equal(error.requestId, 'request-1')
  assert.equal(error.rateLimitRemaining, 42)
  assert.match(
    githubErrorMessage(
      new GitHubApiError(403, 'Resource not accessible by integration'),
      '保存失败。',
    ),
    /OAuth App.*组织批准/,
  )
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
  assert.equal(
    repositoryPathToSlug('src/content/blog/parent/child.mdx'),
    'parent/child',
  )
  assert.equal(normalizeContentSlug(' Cloud 09 '), 'cloud-09')
  assert.equal(normalizeContentSlug('歧光'), '歧光')
  assert.equal(isValidContentSlug('研究-notes-2'), true)
  assert.equal(isValidContentSlug('unfinished-'), false)
  assert.equal(
    repositoryPathForSlug('author', 'cloud09'),
    'src/content/authors/cloud09.md',
  )
  assert.equal(publicPathForSlug('news', '研究-notes'), '/blog/研究-notes/')
  assert.equal(
    isStarterContentPath('src/content/authors/enscribe.md'),
    true,
  )
})

test('Markdown editor actions preserve selections and toggle common formatting', () => {
  const bold = applyMarkdownAction('研究记录', 0, 4, 'bold')
  assert.deepEqual(bold, {
    value: '**研究记录**',
    selectionStart: 2,
    selectionEnd: 6,
  })
  assert.deepEqual(
    applyMarkdownAction(
      bold.value,
      bold.selectionStart,
      bold.selectionEnd,
      'bold',
    ),
    { value: '研究记录', selectionStart: 0, selectionEnd: 4 },
  )

  const tasks = applyMarkdownAction('原型\n测试', 0, 5, 'task-list')
  assert.equal(tasks.value, '- [ ] 原型\n- [ ] 测试')
  assert.equal(
    applyMarkdownAction(
      tasks.value,
      tasks.selectionStart,
      tasks.selectionEnd,
      'task-list',
    ).value,
    '原型\n测试',
  )

  const code = applyMarkdownAction('const 游戏 = true\nreturn 游戏', 0, 26, 'code')
  assert.match(code.value, /^```\n[\s\S]+\n```$/)
})

test('Markdown editor creates links and continues GitHub-style lists', () => {
  assert.deepEqual(createMarkdownLinkEdit('项目主页', 0, 4, 'https://example.com'), {
    value: '[项目主页](https://example.com)',
    selectionStart: 7,
    selectionEnd: 26,
  })

  const continued = continueMarkdownList('2. 第二项', 6)
  assert.deepEqual(continued, {
    value: '2. 第二项\n3. ',
    selectionStart: 10,
    selectionEnd: 10,
  })
  assert.deepEqual(continueMarkdownList('- [ ] ', 6), {
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
  })
})

test('multi-file repository changes update one Git reference atomically', async () => {
  const originalFetch = globalThis.fetch
  const requests: Array<{ url: string; method: string; body?: unknown }> = []
  let blobIndex = 0
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const method = init?.method || 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    requests.push({ url, method, body })

    if (url.endsWith('/git/ref/heads/main')) {
      return Response.json({ object: { sha: 'head-sha' } })
    }
    if (url.endsWith('/git/commits/head-sha')) {
      return Response.json({ tree: { sha: 'base-tree-sha' } })
    }
    if (url.endsWith('/git/blobs')) {
      blobIndex += 1
      return Response.json({ sha: `blob-${blobIndex}` })
    }
    if (url.endsWith('/git/trees')) {
      return Response.json({ sha: 'next-tree-sha' })
    }
    if (url.endsWith('/git/commits')) {
      return Response.json({
        sha: 'next-commit-sha',
        html_url: 'https://github.com/example/commit/next-commit-sha',
      })
    }
    if (url.endsWith('/git/refs/heads/main')) {
      return Response.json({ ref: 'refs/heads/main' })
    }
    return Response.json({ message: 'Unexpected request' }, { status: 500 })
  }

  try {
    const result = await commitRepositoryChanges({
      token: 'token',
      owner: 'Future-Game-Laboratory',
      repo: 'Future-Game-Laboratory.github.io',
      branch: 'main',
      message: '迁移作者地址',
      changes: [
        { path: 'src/content/authors/cloud09.md', content: 'content' },
        { path: 'src/content/authors/enscribe.md', content: null },
      ],
    })

    assert.equal(result.contentShas['src/content/authors/cloud09.md'], 'blob-1')
    const treeRequest = requests.find(
      (request) => request.url.endsWith('/git/trees') && request.method === 'POST',
    )
    assert.deepEqual(treeRequest?.body, {
      base_tree: 'base-tree-sha',
      tree: [
        {
          path: 'src/content/authors/cloud09.md',
          mode: '100644',
          type: 'blob',
          sha: 'blob-1',
        },
        {
          path: 'src/content/authors/enscribe.md',
          mode: '100644',
          type: 'blob',
          sha: null,
        },
      ],
    })
    const refUpdate = requests.find(
      (request) =>
        request.url.endsWith('/git/refs/heads/main') && request.method === 'PATCH',
    )
    assert.deepEqual(refUpdate?.body, { sha: 'next-commit-sha', force: false })
  } finally {
    globalThis.fetch = originalFetch
  }
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
  const formats = readFileSync(
    new URL('../src/lib/content-formats.ts', import.meta.url),
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
    assert.match(
      `${manager}\n${formats}`,
      new RegExp(path.replace(/[./]/g, '\\$&')),
    )
  }
  assert.match(manager, /后台界面已经部署，但尚未连接 GitHub OAuth 服务/)
  assert.match(manager, /PUBLIC_GITHUB_OAUTH_PROXY/)
  assert.match(manager, /docs\/EDITOR\.md/)
  assert.match(manager, /保存并更新地址/)
  assert.match(manager, /这是随站点附带的示例模板/)
  assert.match(manager, /查看部署状态/)
  assert.match(manager, /commitRepositoryChanges/)
  assert.match(workflow, /PUBLIC_GITHUB_OAUTH_PROXY:/)
})

test('editor keeps NEWS summaries optional and exposes the GitHub-style composer', () => {
  const manager = readFileSync(
    new URL('../src/components/content-manager.tsx', import.meta.url),
    'utf8',
  )
  const contentConfig = readFileSync(
    new URL('../src/content.config.ts', import.meta.url),
    'utf8',
  )
  const composer = readFileSync(
    new URL('../src/components/markdown-editor.tsx', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(manager, /请填写文章摘要/)
  assert.match(manager, /news: \['description', 'image'\]/)
  assert.match(manager, /摘要（可选）/)
  assert.match(composer, /admin-markdown-toolbar/)
  assert.match(composer, /ReactMarkdown/)
  assert.match(composer, /remarkGfm/)
  assert.match(contentConfig, /description: z\.string\(\)\.default\(''\)/)
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
