import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clipboard,
  Download,
  Eye,
  FileText,
  KeyRound,
  LoaderCircle,
  Send,
} from 'lucide-react'
import {
  makeMdx,
  slugify,
  toBase64,
  validateDraft,
  type EditorDraft,
} from '@/lib/editor'

type PublishSettings = {
  owner: string
  repo: string
  branch: string
  token: string
}

const today = new Date().toISOString().slice(0, 10)

const initialDraft: EditorDraft = {
  title: '',
  description: '',
  slug: '',
  date: today,
  tags: '',
  authors: '',
  draft: true,
  body: '从这里开始写作。\n',
}

const initialSettings: PublishSettings = {
  owner: 'Future-Game-Laboratory',
  repo: 'Future-Game-Laboratory.github.io',
  branch: 'main',
  token: '',
}

function ReadingPreview({ draft }: { draft: EditorDraft }) {
  const lines = draft.body.split('\n')

  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <header className="not-prose editor-reading-head mb-8 border-b pb-6">
        <p className="signal-label mb-3">PREVIEW / {draft.date}</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {draft.title || '无标题文章'}
        </h2>
        <p className="text-muted-foreground mt-3 leading-7">
          {draft.description || '文章摘要会显示在这里。'}
        </p>
      </header>
      {lines.map((line, index) => {
        if (line.startsWith('### ')) return <h3 key={index}>{line.slice(4)}</h3>
        if (line.startsWith('## ')) return <h2 key={index}>{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={index}>{line.slice(2)}</h1>
        if (line.startsWith('- ')) return <li key={index}>{line.slice(2)}</li>
        if (line.startsWith('> '))
          return <blockquote key={index}>{line.slice(2)}</blockquote>
        if (!line.trim()) return <div className="h-3" key={index} />
        return <p key={index}>{line}</p>
      })}
    </article>
  )
}

export default function ContentEditor() {
  const [draft, setDraft] = useState<EditorDraft>(initialDraft)
  const [settings, setSettings] = useState<PublishSettings>(initialSettings)
  const [view, setView] = useState<'preview' | 'source'>('preview')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const mdx = useMemo(() => makeMdx(draft), [draft])

  useEffect(() => {
    const savedDraft = localStorage.getItem('fgl-editor-draft')
    const savedSettings = localStorage.getItem('fgl-editor-settings')
    const token = sessionStorage.getItem('fgl-editor-token') ?? ''

    if (savedDraft) {
      try {
        setDraft({ ...initialDraft, ...JSON.parse(savedDraft) })
      } catch {}
    }
    if (savedSettings) {
      try {
        setSettings({ ...initialSettings, ...JSON.parse(savedSettings), token })
      } catch {}
    } else {
      setSettings((current) => ({ ...current, token }))
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('fgl-editor-draft', JSON.stringify(draft))
  }, [draft, hydrated])

  useEffect(() => {
    if (!hydrated) return
    const { token, ...safeSettings } = settings
    localStorage.setItem('fgl-editor-settings', JSON.stringify(safeSettings))
    if (token) sessionStorage.setItem('fgl-editor-token', token)
    else sessionStorage.removeItem('fgl-editor-token')
  }, [settings, hydrated])

  const updateDraft = <K extends keyof EditorDraft>(
    key: K,
    value: EditorDraft[K],
  ) => {
    setMessage('')
    setError('')
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const updateSetting = <K extends keyof PublishSettings>(
    key: K,
    value: PublishSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }))

  const download = () => {
    const issue = validateDraft(draft)
    if (issue) return setError(issue)
    const blob = new Blob([mdx], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${draft.slug}.mdx`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('MDX 文件已下载。')
  }

  const copy = async () => {
    await navigator.clipboard.writeText(mdx)
    setMessage('MDX 源码已复制。')
  }

  const publish = async () => {
    setError('')
    setMessage('')
    const issue = validateDraft(draft)
    if (issue) return setError(issue)
    if (
      !settings.owner ||
      !settings.repo ||
      !settings.branch ||
      !settings.token
    )
      return setError('请完整填写 GitHub 发布设置。')

    setBusy(true)
    const path = `src/content/blog/${draft.slug}/index.mdx`
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${path}`
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${settings.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    }

    try {
      const existing = await fetch(
        `${apiUrl}?ref=${encodeURIComponent(settings.branch)}`,
        {
          headers,
        },
      )
      let sha: string | undefined
      if (existing.ok) sha = (await existing.json()).sha
      else if (existing.status !== 404) {
        const detail = await existing.json().catch(() => ({}))
        throw new Error(detail.message || `GitHub 返回 ${existing.status}`)
      }

      if (
        sha &&
        !window.confirm(
          `文章路径 ${draft.slug} 已存在。确定要用当前内容覆盖它吗？`,
        )
      ) {
        setMessage('已取消更新，仓库内容没有变化。')
        return
      }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${sha ? '更新' : '发布'}文章：${draft.title.trim()}`,
          content: toBase64(mdx),
          branch: settings.branch,
          ...(sha ? { sha } : {}),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok)
        throw new Error(result.message || `GitHub 返回 ${response.status}`)

      setMessage(
        `文章已${sha ? '更新' : '发布'}到 ${settings.branch}，GitHub Actions 将自动构建站点。`,
      )
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '发布失败，请稍后重试。',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="editor-workspace space-y-8">
      <section className="editor-grid grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <div className="editor-form space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">标题</span>
              <input
                value={draft.title}
                onChange={(event) => {
                  const title = event.target.value
                  updateDraft('title', title)
                  if (!draft.slug) updateDraft('slug', slugify(title))
                }}
                placeholder="一篇值得被读完的文章"
                className="bg-background w-full rounded-md border px-3 py-2.5"
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">摘要</span>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  updateDraft('description', event.target.value)
                }
                maxLength={155}
                rows={2}
                placeholder="用一两句话告诉读者这篇文章解决什么问题"
                className="bg-background w-full resize-y rounded-md border px-3 py-2.5"
              />
              <span className="text-muted-foreground block text-right text-xs">
                {draft.description.length}/155
              </span>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">文章路径</span>
              <input
                value={draft.slug}
                onChange={(event) =>
                  updateDraft('slug', slugify(event.target.value))
                }
                placeholder="article-slug"
                className="bg-background w-full rounded-md border px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">发布日期</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft('date', event.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2.5"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">标签</span>
              <input
                value={draft.tags}
                onChange={(event) => updateDraft('tags', event.target.value)}
                placeholder="game-design, research"
                className="bg-background w-full rounded-md border px-3 py-2.5"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">作者 ID</span>
              <input
                value={draft.authors}
                onChange={(event) => updateDraft('authors', event.target.value)}
                placeholder="author-id"
                className="bg-background w-full rounded-md border px-3 py-2.5"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium">正文（Markdown / MDX）</span>
            <textarea
              value={draft.body}
              onChange={(event) => updateDraft('body', event.target.value)}
              rows={22}
              spellCheck
              className="bg-background min-h-[34rem] w-full resize-y rounded-md border px-4 py-3 font-mono text-sm leading-6"
            />
          </label>

          <label className="editor-draft-toggle flex items-center gap-3 border px-4 py-3">
            <input
              type="checkbox"
              checked={draft.draft}
              onChange={(event) => updateDraft('draft', event.target.checked)}
              className="size-4"
            />
            <span>
              <span className="block text-sm font-medium">保存为草稿</span>
              <span className="text-muted-foreground text-xs">
                草稿会提交到仓库，但不会出现在公开文章列表中。
              </span>
            </span>
          </label>
        </div>

        <div className="editor-preview lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="editor-view-toggle flex border p-1">
              <button
                type="button"
                onClick={() => setView('preview')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm ${view === 'preview' ? 'is-active bg-muted font-medium' : 'text-muted-foreground'}`}
              >
                <Eye className="size-4" /> 阅读预览
              </button>
              <button
                type="button"
                onClick={() => setView('source')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm ${view === 'source' ? 'is-active bg-muted font-medium' : 'text-muted-foreground'}`}
              >
                <FileText className="size-4" /> MDX 源码
              </button>
            </div>
          </div>
          <div className="editor-preview-surface bg-background min-h-[38rem] overflow-auto border p-6">
            {view === 'preview' ? (
              <ReadingPreview draft={draft} />
            ) : (
              <pre className="font-mono text-xs leading-6 break-words whitespace-pre-wrap">
                {mdx}
              </pre>
            )}
          </div>
        </div>
      </section>

      <section className="editor-publish space-y-5 border-t pt-8">
        <div>
          <h2 className="text-xl font-semibold">发布到 GitHub</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
            使用具有该仓库 Contents 读写权限的 fine-grained token。Token
            只保存在当前浏览器标签页，关闭标签页后自动清除。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['owner', 'repo', 'branch'] as const).map((key) => (
            <label className="space-y-2" key={key}>
              <span className="text-sm font-medium">
                {key === 'owner'
                  ? '组织 / 用户'
                  : key === 'repo'
                    ? '仓库'
                    : '分支'}
              </span>
              <input
                value={settings[key]}
                onChange={(event) => updateSetting(key, event.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2.5"
              />
            </label>
          ))}
          <label className="space-y-2">
            <span className="text-sm font-medium">Fine-grained token</span>
            <input
              type="password"
              autoComplete="off"
              value={settings.token}
              onChange={(event) => updateSetting('token', event.target.value)}
              placeholder="github_pat_…"
              className="bg-background w-full rounded-md border px-3 py-2.5 font-mono"
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="editor-alert text-destructive border px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="editor-alert flex items-center gap-2 border px-4 py-3 text-sm"
          >
            <CheckCircle2 className="size-4" /> {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={publish}
            disabled={busy}
            className="signal-control bg-primary text-primary-foreground border-primary flex min-h-11 items-center gap-2 border px-[18px] py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {busy ? '正在发布…' : '提交并触发构建'}
          </button>
          <button
            type="button"
            onClick={download}
            className="signal-control hover:bg-muted flex min-h-11 items-center gap-2 border px-[18px] py-2.5 text-sm font-medium"
          >
            <Download className="size-4" /> 下载 MDX
          </button>
          <button
            type="button"
            onClick={copy}
            className="signal-control hover:bg-muted flex min-h-11 items-center gap-2 border px-[18px] py-2.5 text-sm font-medium"
          >
            <Clipboard className="size-4" /> 复制源码
          </button>
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-2 px-2 py-2.5 text-sm"
          >
            <KeyRound className="size-4" /> 创建 token
          </a>
        </div>
      </section>
    </div>
  )
}
