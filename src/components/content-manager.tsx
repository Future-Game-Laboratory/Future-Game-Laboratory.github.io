import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BookOpenText,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderKanban,
  Home,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  RefreshCw,
  Rss,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import {
  canPushRepository,
  deleteRepositoryFile,
  getAuthenticatedUser,
  getRepositoryAccess,
  getRepositoryFile,
  listRepositoryFiles,
  saveRepositoryFile,
  saveRepositoryBinaryFile,
  GitHubApiError,
  type GitHubUser,
  type RepositoryAccess,
  type RepositoryFile,
} from '@/lib/github-editor'
import {
  commaList,
  parseDocument,
  repositoryPathToSlug,
  serializeDocument,
  splitCommaList,
  type FrontmatterValue,
} from '@/lib/content-formats'

type RepositorySettings = {
  owner: string
  repo: string
  branch: string
}

type Props = {
  repository: RepositorySettings
  oauthProxy: string
}

type Section =
  | 'dashboard'
  | 'home'
  | 'news'
  | 'works'
  | 'authors'
  | 'about'
  | 'contact'
type EditorKind = 'news' | 'project' | 'author' | 'page'

type EditableFile = {
  path: string
  sha?: string
  source: string
  attributes: Record<string, FrontmatterValue>
  body: string
  kind: EditorKind
  isNew: boolean
}

type HomeSettings = {
  announcement: { title: string; body: string }
  socials: Array<{ label: string; href: string; icon: string }>
}

type ContactSettings = {
  intro: string
  email: string
  formEndpoint: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isHomeSettings = (value: unknown): value is HomeSettings =>
  isRecord(value) &&
  isRecord(value.announcement) &&
  typeof value.announcement.title === 'string' &&
  typeof value.announcement.body === 'string' &&
  Array.isArray(value.socials) &&
  value.socials.every(
    (social) =>
      isRecord(social) &&
      typeof social.label === 'string' &&
      typeof social.href === 'string' &&
      typeof social.icon === 'string',
  )

const isContactSettings = (value: unknown): value is ContactSettings =>
  isRecord(value) &&
  typeof value.intro === 'string' &&
  typeof value.email === 'string' &&
  typeof value.formEndpoint === 'string'

const TOKEN_KEY = 'fgl-editor-oauth-token'
const STATE_KEY = 'fgl-editor-oauth-state'
const VERIFIER_KEY = 'fgl-editor-oauth-verifier'
const HOME_PATH = 'src/data/home.json'
const CONTACT_PATH = 'src/data/contact.json'
const ABOUT_PATH = 'src/content/pages/about.md'
const WORKS_PATH = 'src/content/pages/works.md'
const CAROUSEL_DIRECTORY = 'public/static/carousel/'
const CAROUSEL_MIME_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const sections: Array<{
  id: Section
  label: string
  description: string
  icon: typeof LayoutDashboard
}> = [
  {
    id: 'dashboard',
    label: '概览',
    description: '仓库与内容状态',
    icon: LayoutDashboard,
  },
  { id: 'home', label: '首页', description: '公告与 SNS', icon: Home },
  { id: 'news', label: 'NEWS', description: '文章与草稿', icon: BookOpenText },
  { id: 'works', label: 'WORKS', description: '页面与项目', icon: FolderKanban },
  { id: 'authors', label: 'AUTHORS', description: '作者档案', icon: UserRound },
  { id: 'about', label: 'ABOUT', description: '研究所介绍', icon: Users },
  { id: 'contact', label: 'CONTACT', description: '联系页与表单', icon: Mail },
]

const fieldValue = (
  attributes: Record<string, FrontmatterValue>,
  key: string,
) => {
  const value = attributes[key]
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

const randomState = () => {
  const bytes = new Uint8Array(32)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const base64Url = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const createPkce = async () => {
  const verifierBytes = new Uint8Array(64)
  window.crypto.getRandomValues(verifierBytes)
  const verifier = base64Url(verifierBytes)
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )
  return { verifier, challenge: base64Url(new Uint8Array(digest)) }
}

const filename = (path: string) =>
  path.split('/').pop()?.replace(/\.mdx?$/, '') ?? path

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const fileTitle = (file: RepositoryFile) => {
  if (file.path === WORKS_PATH) return 'WORKS 页面'
  return repositoryPathToSlug(file.path)
}

const githubErrorMessage = (reason: unknown, fallback: string) => {
  if (reason instanceof GitHubApiError) {
    if (reason.status === 401) return 'GitHub 登录已失效，请退出后重新登录。'
    if (reason.status === 403) {
      return 'GitHub 拒绝了此次操作，请确认仓库权限、分支保护和 API 配额。'
    }
    if (reason.status === 409 || reason.status === 422) {
      return '远端内容已经变化，当前版本无法直接覆盖。请复制未保存内容，重新打开该文件后再提交。'
    }
  }
  return reason instanceof Error ? reason.message : fallback
}

const serializeEditableDocument = (active: EditableFile) => {
  const optionalStringFields: Partial<Record<EditorKind, string[]>> = {
    news: ['image'],
    project: ['startDate', 'endDate'],
    author: [
      'pronouns',
      'bio',
      'mail',
      'website',
      'twitter',
      'github',
      'linkedin',
      'discord',
    ],
  }
  const optionalFields = new Set(optionalStringFields[active.kind] ?? [])
  const attributes = Object.fromEntries(
    Object.entries(active.attributes).filter(
      ([key, value]) =>
        !(
          (optionalFields.has(key) &&
            typeof value === 'string' &&
            !value.trim()) ||
          (active.kind === 'news' && key === 'order' && value === '')
        ),
    ),
  )
  return serializeDocument(attributes, active.body)
}

function StatusNotice({
  kind,
  children,
}: {
  kind: 'error' | 'success' | 'info'
  children: React.ReactNode
}) {
  const Icon = kind === 'error' ? CircleAlert : kind === 'success' ? CheckCircle2 : Bell
  return (
    <div className={`admin-notice admin-notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

function LoginScreen({
  repository,
  setupGuideUrl,
  oauthReady,
  busy,
  error,
  onLogin,
}: {
  repository: string
  setupGuideUrl: string
  oauthReady: boolean
  busy: boolean
  error: string
  onLogin: () => void
}) {
  return (
    <div className="admin-login">
      <section className="admin-login__panel" aria-labelledby="admin-login-title">
        <div className="admin-login__mark" aria-hidden="true">
          <ShieldCheck />
        </div>
        <p className="admin-login__product">未来游戏研究所</p>
        <h1 id="admin-login-title">内容管理后台</h1>
        <p className="admin-login__description">
          使用 GitHub 账号登录。系统会在登录后检查你对
          <strong> {repository} </strong>
          仓库的写入权限，没有编辑权限的账号无法进入。
        </p>

        {error && <StatusNotice kind="error">{error}</StatusNotice>}
        {!oauthReady && (
          <StatusNotice kind="info">
            后台界面已经部署，但尚未连接 GitHub OAuth 服务。请先部署
            <code> workers/github-oauth </code>，再把 Worker 地址设置为仓库 Actions
            变量 <code>PUBLIC_GITHUB_OAUTH_PROXY</code> 并重新运行 Pages 部署。
            <a href={setupGuideUrl} target="_blank" rel="noreferrer">
              查看完整配置步骤
            </a>
            。
          </StatusNotice>
        )}

        <button
          type="button"
          className="admin-button admin-button--primary admin-login__button"
          onClick={onLogin}
          disabled={busy || !oauthReady}
        >
          {busy ? <LoaderCircle className="admin-spin" /> : <KeyRound />}
          {busy ? '正在验证账号…' : '使用 GitHub 登录'}
        </button>
        <p className="admin-login__security">
          登录令牌只保存在当前标签页的会话存储中，关闭标签页后自动清除。
        </p>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  mono,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  mono?: boolean
}) {
  return (
    <label className="admin-form-field">
      <span>
        {label} {required && <i aria-hidden="true">*</i>}
      </span>
      <input
        className={`admin-field${mono ? ' admin-mono' : ''}`}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}

function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="admin-preview">
      {source.split('\n').map((line, index) => {
        if (line.startsWith('### ')) return <h3 key={index}>{line.slice(4)}</h3>
        if (line.startsWith('## ')) return <h2 key={index}>{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={index}>{line.slice(2)}</h1>
        if (line.startsWith('- ')) return <li key={index}>{line.slice(2)}</li>
        if (line.startsWith('> ')) return <blockquote key={index}>{line.slice(2)}</blockquote>
        if (!line.trim()) return <div className="admin-preview__space" key={index} />
        return <p key={index}>{line}</p>
      })}
    </div>
  )
}

export default function ContentManager({ repository, oauthProxy }: Props) {
  const oauthReady = isHttpUrl(oauthProxy)
  const [token, setToken] = useState('')
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [access, setAccess] = useState<RepositoryAccess | null>(null)
  const [files, setFiles] = useState<RepositoryFile[]>([])
  const [section, setSection] = useState<Section>('dashboard')
  const [mobileNavigation, setMobileNavigation] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authBusy, setAuthBusy] = useState(oauthReady)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [document, setDocument] = useState<EditableFile | null>(null)
  const [documentOriginal, setDocumentOriginal] = useState('')
  const [editorTab, setEditorTab] = useState<'edit' | 'preview' | 'source'>('edit')
  const [homeSettings, setHomeSettings] = useState<HomeSettings | null>(null)
  const [homeOriginal, setHomeOriginal] = useState('')
  const [homeSha, setHomeSha] = useState('')
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null)
  const [contactOriginal, setContactOriginal] = useState('')
  const [contactSha, setContactSha] = useState('')
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null)
  const mobileDrawerRef = useRef<HTMLElement>(null)

  const repositoryName = `${repository.owner}/${repository.repo}`
  const setupGuideUrl = `https://github.com/${repository.owner}/${repository.repo}/blob/${repository.branch}/docs/EDITOR.md`

  const refreshFiles = useCallback(
    async (activeToken: string) => {
      const nextFiles = await listRepositoryFiles(
        activeToken,
        repository.owner,
        repository.repo,
        repository.branch,
      )
      setFiles(nextFiles)
    },
    [repository],
  )

  const authenticate = useCallback(
    async (activeToken: string) => {
      const [nextUser, nextAccess] = await Promise.all([
        getAuthenticatedUser(activeToken),
        getRepositoryAccess(activeToken, repository.owner, repository.repo),
      ])

      if (!canPushRepository(nextAccess)) {
        throw new Error(
          `GitHub 账号 @${nextUser.login} 没有 ${repositoryName} 的编辑权限。`,
        )
      }

      await refreshFiles(activeToken)
      setToken(activeToken)
      setUser(nextUser)
      setAccess(nextAccess)
      sessionStorage.setItem(TOKEN_KEY, activeToken)
    },
    [refreshFiles, repository, repositoryName],
  )

  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const returnedState = url.searchParams.get('state')
      const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error')
      const savedToken = sessionStorage.getItem(TOKEN_KEY)

      if (!code && !oauthError && !savedToken) {
        setAuthBusy(false)
        return
      }

      setAuthBusy(true)
      setAuthError('')

      try {
        if (code || oauthError) {
          const expectedState = sessionStorage.getItem(STATE_KEY)
          if (!expectedState || returnedState !== expectedState) {
            throw new Error('GitHub 登录状态校验失败，请重新登录。')
          }
          const verifier = sessionStorage.getItem(VERIFIER_KEY)
          sessionStorage.removeItem(STATE_KEY)
          sessionStorage.removeItem(VERIFIER_KEY)
          if (oauthError) throw new Error(oauthError)
          if (!oauthReady) throw new Error('GitHub OAuth 服务尚未正确配置。')
          if (!verifier) throw new Error('GitHub 登录校验信息已失效，请重新登录。')

          const response = await fetch(`${oauthProxy}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, code_verifier: verifier }),
          })
          const result = (await response.json().catch(() => ({}))) as {
            access_token?: string
            error?: string
          }
          if (!response.ok || !result.access_token) {
            throw new Error(result.error || 'GitHub 登录失败。')
          }

          window.history.replaceState({}, '', window.location.pathname)
          if (!cancelled) await authenticate(result.access_token)
          return
        }

        if (savedToken && !cancelled) await authenticate(savedToken)
      } catch (reason) {
        sessionStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(STATE_KEY)
        sessionStorage.removeItem(VERIFIER_KEY)
        if (code || oauthError) {
          window.history.replaceState({}, '', window.location.pathname)
        }
        if (!cancelled) {
          setToken('')
          setUser(null)
          setAccess(null)
          setAuthError(reason instanceof Error ? reason.message : '登录失败。')
        }
      } finally {
        if (!cancelled) setAuthBusy(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [authenticate, oauthProxy, oauthReady])

  const beginLogin = async () => {
    if (!oauthReady) return
    setAuthBusy(true)
    setAuthError('')
    try {
      const state = randomState()
      const { verifier, challenge } = await createPkce()
      sessionStorage.setItem(STATE_KEY, state)
      sessionStorage.setItem(VERIFIER_KEY, verifier)
      window.location.assign(
        `${oauthProxy}/authorize?state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(challenge)}`,
      )
    } catch {
      sessionStorage.removeItem(STATE_KEY)
      sessionStorage.removeItem(VERIFIER_KEY)
      setAuthBusy(false)
      setAuthError('当前浏览器无法启动安全登录，请确认已启用安全上下文后重试。')
    }
  }

  const logout = () => {
    const hasUnsavedChanges = Boolean(
      (document &&
        serializeEditableDocument(document) !== documentOriginal) ||
        (homeSettings &&
          `${JSON.stringify(homeSettings, null, 2)}\n` !== homeOriginal) ||
        (contactSettings &&
          `${JSON.stringify(contactSettings, null, 2)}\n` !== contactOriginal),
    )
    if (
      hasUnsavedChanges &&
      !window.confirm('当前内容尚未保存，确定要退出登录吗？')
    ) {
      return
    }
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(STATE_KEY)
    sessionStorage.removeItem(VERIFIER_KEY)
    setToken('')
    setUser(null)
    setAccess(null)
    setFiles([])
    setDocument(null)
    setDocumentOriginal('')
    setHomeSettings(null)
    setHomeOriginal('')
    setContactSettings(null)
    setContactOriginal('')
    setSelectedPath('')
    setSearch('')
    setError('')
    setMessage('')
  }

  const closeMobileNavigation = useCallback((restoreFocus = true) => {
    setMobileNavigation(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus())
    }
  }, [])

  useEffect(() => {
    if (!mobileNavigation) return
    const pageDocument = globalThis.document
    const previousOverflow = pageDocument.body.style.overflow
    const wideViewport = window.matchMedia('(min-width: 841px)')
    pageDocument.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => mobileCloseButtonRef.current?.focus())

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileNavigation()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(
        mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0)
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && pageDocument.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && pageDocument.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) closeMobileNavigation(false)
    }

    pageDocument.addEventListener('keydown', handleKeydown)
    wideViewport.addEventListener('change', handleViewportChange)
    return () => {
      pageDocument.body.style.overflow = previousOverflow
      pageDocument.removeEventListener('keydown', handleKeydown)
      wideViewport.removeEventListener('change', handleViewportChange)
    }
  }, [closeMobileNavigation, mobileNavigation])

  const selectSection = (next: Section) => {
    if (next === section) {
      if (mobileNavigation) closeMobileNavigation()
      return
    }
    const hasDocumentChanges =
      section !== 'home' &&
      section !== 'contact' &&
      document &&
      serializeActiveDocument(document) !== documentOriginal
    const hasHomeChanges =
      section === 'home' &&
      homeSettings &&
      `${JSON.stringify(homeSettings, null, 2)}\n` !== homeOriginal
    const hasContactChanges =
      section === 'contact' &&
      contactSettings &&
      `${JSON.stringify(contactSettings, null, 2)}\n` !== contactOriginal
    if (hasDocumentChanges || hasHomeChanges || hasContactChanges) {
      if (!window.confirm('当前内容尚未保存，确定要离开吗？')) return
    }
    if (hasHomeChanges) {
      setHomeSettings(JSON.parse(homeOriginal) as HomeSettings)
    }
    if (hasContactChanges) {
      setContactSettings(JSON.parse(contactOriginal) as ContactSettings)
    }
    setSection(next)
    if (mobileNavigation) closeMobileNavigation()
    else setMobileNavigation(false)
    setSelectedPath('')
    setDocument(null)
    setDocumentOriginal('')
    setError('')
    setMessage('')
    setSearch('')
  }

  const newsFiles = useMemo(
    () =>
      files
        .filter((file) => /^src\/content\/blog\/.+\.mdx?$/.test(file.path))
        .sort((left, right) => left.path.localeCompare(right.path)),
    [files],
  )

  const projectFiles = useMemo(
    () =>
      files
        .filter((file) => /^src\/content\/projects\/.+\.mdx?$/.test(file.path))
        .sort((left, right) => left.path.localeCompare(right.path)),
    [files],
  )

  const carouselFiles = useMemo(
    () =>
      files
        .filter(
          (file) =>
            file.path.startsWith(CAROUSEL_DIRECTORY) &&
            /\.(?:avif|jpe?g|png|webp)$/i.test(file.path),
        )
        .sort((left, right) =>
          left.path.localeCompare(right.path, 'zh-CN', {
            numeric: true,
            sensitivity: 'base',
          }),
        ),
    [files],
  )

  const authorFiles = useMemo(
    () =>
      files
        .filter((file) => /^src\/content\/authors\/.+\.mdx?$/.test(file.path))
        .sort((left, right) => left.path.localeCompare(right.path)),
    [files],
  )

  const visibleFiles = useMemo(() => {
    const source =
      section === 'news'
        ? newsFiles
        : section === 'authors'
          ? authorFiles
          : projectFiles
    const query = search.trim().toLowerCase()
    return query
      ? source.filter((file) => file.path.toLowerCase().includes(query))
      : source
  }, [authorFiles, newsFiles, projectFiles, search, section])

  const serializeActiveDocument = (active: EditableFile) =>
    serializeEditableDocument(active)

  const loadDocument = useCallback(
    async (path: string, kind: EditorKind) => {
      if (!token) return
      if (document && serializeActiveDocument(document) !== documentOriginal) {
        if (!window.confirm('当前内容尚未保存，确定要打开其他内容吗？')) return
      }

      setLoading(true)
      setError('')
      setMessage('')
      try {
        const file = await getRepositoryFile(
          token,
          repository.owner,
          repository.repo,
          repository.branch,
          path,
        )
        const parsed = parseDocument(file.content)
        setSelectedPath(path)
        setDocument({
          path,
          sha: file.sha,
          source: file.content,
          attributes: parsed.attributes,
          body: parsed.body,
          kind,
          isNew: false,
        })
        setDocumentOriginal(
          serializeEditableDocument({
            path,
            sha: file.sha,
            source: file.content,
            attributes: parsed.attributes,
            body: parsed.body,
            kind,
            isNew: false,
          }),
        )
        setEditorTab('edit')
      } catch (reason) {
        setError(githubErrorMessage(reason, '内容读取失败。'))
      } finally {
        setLoading(false)
      }
    },
    [document, documentOriginal, repository, token],
  )

  const loadHome = useCallback(async () => {
    if (!token || homeSettings) return
    setLoading(true)
    setError('')
    try {
      const file = await getRepositoryFile(
        token,
        repository.owner,
        repository.repo,
        repository.branch,
        HOME_PATH,
      )
      const parsed: unknown = JSON.parse(file.content)
      if (!isHomeSettings(parsed)) {
        throw new Error('首页配置格式不完整，请检查 src/data/home.json。')
      }
      setHomeSettings(parsed)
      setHomeOriginal(`${JSON.stringify(parsed, null, 2)}\n`)
      setHomeSha(file.sha)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '首页配置读取失败。')
    } finally {
      setLoading(false)
    }
  }, [homeSettings, repository, token])

  const loadContact = useCallback(async () => {
    if (!token || contactSettings) return
    setLoading(true)
    setError('')
    try {
      const file = await getRepositoryFile(
        token,
        repository.owner,
        repository.repo,
        repository.branch,
        CONTACT_PATH,
      )
      const parsed: unknown = JSON.parse(file.content)
      if (!isContactSettings(parsed)) {
        throw new Error('联系页配置格式不完整，请检查 src/data/contact.json。')
      }
      setContactSettings(parsed)
      setContactOriginal(`${JSON.stringify(parsed, null, 2)}\n`)
      setContactSha(file.sha)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '联系页配置读取失败。')
    } finally {
      setLoading(false)
    }
  }, [contactSettings, repository, token])

  useEffect(() => {
    if (section === 'home') void loadHome()
    if (section === 'contact') void loadContact()
  }, [loadContact, loadHome, section])

  useEffect(() => {
    if (section !== 'about' || document) return
    void loadDocument(ABOUT_PATH, 'page')
  }, [document, loadDocument, section])

  const createDocument = (kind: 'news' | 'project' | 'author') => {
    if (document && serializeActiveDocument(document) !== documentOriginal) {
      if (!window.confirm('当前内容尚未保存，确定要新建内容吗？')) return
    }
    const today = new Date().toISOString().slice(0, 10)
    const next: EditableFile = {
      path: '',
      source: '',
      attributes:
        kind === 'news'
          ? {
              title: '',
              description: '',
              date: today,
              tags: [],
              authors: [],
              draft: true,
            }
          : kind === 'project'
            ? {
                name: '',
                description: '',
                tags: [],
                image: '../../../public/static/1200x630.png',
                link: 'https://',
                startDate: today,
                draft: true,
              }
            : {
                name: '',
                avatar: '/static/logo.png',
                bio: '',
                draft: true,
              },
      body: '',
      kind,
      isNew: true,
    }
    setSelectedPath('')
    setDocument(next)
    setDocumentOriginal('')
    setNewSlug('')
    setEditorTab('edit')
    setError('')
    setMessage('')
  }

  const updateAttribute = (key: string, value: FrontmatterValue) => {
    setDocument((current) =>
      current
        ? { ...current, attributes: { ...current.attributes, [key]: value } }
        : current,
    )
    setError('')
    setMessage('')
  }

  const [newSlug, setNewSlug] = useState('')

  useEffect(() => {
    if (!document?.isNew) setNewSlug('')
  }, [document?.isNew, document?.kind])

  const validateDocument = (active: EditableFile) => {
    if (active.kind === 'news') {
      if (!fieldValue(active.attributes, 'title').trim()) return '请填写文章标题。'
      if (!fieldValue(active.attributes, 'description').trim()) return '请填写文章摘要。'
      if (!fieldValue(active.attributes, 'date')) return '请选择发布日期。'
      if (!active.body.trim()) return '文章正文不能为空。'
    }
    if (active.kind === 'project') {
      if (!fieldValue(active.attributes, 'name').trim()) return '请填写项目名称。'
      if (!fieldValue(active.attributes, 'description').trim()) return '请填写项目摘要。'
      if (!isHttpUrl(fieldValue(active.attributes, 'link').trim())) {
        return '请填写完整的 http(s) 项目链接。'
      }
      if (!fieldValue(active.attributes, 'image').trim()) return '请填写项目图片路径。'
      const startDate = fieldValue(active.attributes, 'startDate')
      const endDate = fieldValue(active.attributes, 'endDate')
      if (startDate && endDate && endDate < startDate) {
        return '项目结束日期不能早于开始日期。'
      }
    }
    if (active.kind === 'author') {
      if (!fieldValue(active.attributes, 'name').trim()) return '请填写作者名称。'
      const avatar = fieldValue(active.attributes, 'avatar').trim()
      if (!avatar || (!avatar.startsWith('/') && !isHttpUrl(avatar))) {
        return '头像必须是站内根路径或完整的 http(s) URL。'
      }
      const mail = fieldValue(active.attributes, 'mail').trim()
      if (mail && !/^\S+@\S+\.\S+$/.test(mail)) return '请填写有效的作者邮箱。'
      const invalidUrlField = [
        'website',
        'twitter',
        'github',
        'linkedin',
        'discord',
      ].find((key) => {
        const value = fieldValue(active.attributes, key).trim()
        return value && !isHttpUrl(value)
      })
      if (invalidUrlField) return `${invalidUrlField} 必须是完整的 http(s) URL。`
    }
    if (active.kind === 'page') {
      if (!fieldValue(active.attributes, 'title').trim()) return '请填写页面标题。'
      if (!fieldValue(active.attributes, 'description').trim()) return '请填写页面摘要。'
      if (!active.body.trim()) return '页面正文不能为空。'
    }

    if (active.isNew && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSlug)) {
      return '新内容路径仅支持小写字母、数字和连字符。'
    }
    return ''
  }

  const saveDocument = async () => {
    if (!token || !document) return
    const issue = validateDocument(document)
    if (issue) return setError(issue)

    const path = document.isNew
      ? document.kind === 'news'
        ? `src/content/blog/${newSlug}/index.mdx`
        : document.kind === 'project'
          ? `src/content/projects/${newSlug}.md`
          : `src/content/authors/${newSlug}.md`
      : document.path
    const content = serializeActiveDocument({ ...document, path })
    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (document.isNew && files.some((file) => file.path === path)) {
        throw new Error(`仓库中已存在 ${path}。`)
      }
      const title = fieldValue(
        document.attributes,
        document.kind === 'project' || document.kind === 'author'
          ? 'name'
          : 'title',
      )
      const result = await saveRepositoryFile({
        token,
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch,
        path,
        content,
        sha: document.sha,
        message: `${document.isNew ? '创建' : '更新'}${
          document.kind === 'news'
            ? '文章'
            : document.kind === 'project'
              ? '项目'
              : document.kind === 'author'
                ? '作者'
                : '页面'
        }：${title}`,
      })
      const nextSha = result.content.sha
      setDocument((current) =>
        current
          ? { ...current, path, sha: nextSha, source: content, isNew: false }
          : current,
      )
      setDocumentOriginal(content)
      setSelectedPath(path)
      setMessage('内容已提交到 GitHub，部署工作流将自动更新网站。')
      try {
        await refreshFiles(token)
      } catch (reason) {
        setError(
          `内容已成功提交，但仓库列表刷新失败：${
            reason instanceof Error ? reason.message : '请稍后手动刷新。'
          }`,
        )
      }
    } catch (reason) {
      setError(githubErrorMessage(reason, '保存失败。'))
    } finally {
      setSaving(false)
    }
  }

  const removeDocument = async () => {
    if (!token || !document?.sha || document.kind === 'page') return
    if (!window.confirm(`确定删除 ${document.path} 吗？此操作会提交到 GitHub。`)) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await deleteRepositoryFile({
        token,
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch,
        path: document.path,
        sha: document.sha,
        message: `删除${
          document.kind === 'news'
            ? '文章'
            : document.kind === 'project'
              ? '项目'
              : '作者'
        }：${filename(document.path)}`,
      })
      setDocument(null)
      setDocumentOriginal('')
      setSelectedPath('')
      setMessage('内容已从仓库删除。')
      try {
        await refreshFiles(token)
      } catch (reason) {
        setError(
          `删除已成功提交，但仓库列表刷新失败：${
            reason instanceof Error ? reason.message : '请稍后手动刷新。'
          }`,
        )
      }
    } catch (reason) {
      setError(githubErrorMessage(reason, '删除失败。'))
    } finally {
      setSaving(false)
    }
  }

  const saveHome = async () => {
    if (!token || !homeSettings) return
    if (!homeSettings.announcement.title.trim() || !homeSettings.announcement.body.trim()) {
      return setError('请完整填写公告标题和正文。')
    }
    const invalidSocial = homeSettings.socials.find(
      (social) => social.href.trim() && !isHttpUrl(social.href.trim()),
    )
    if (invalidSocial) {
      return setError(`请为 ${invalidSocial.label} 填写完整的 http(s) 链接。`)
    }
    const content = `${JSON.stringify(homeSettings, null, 2)}\n`
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await saveRepositoryFile({
        token,
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch,
        path: HOME_PATH,
        content,
        sha: homeSha,
        message: '更新首页公告与 SNS',
      })
      setHomeSha(result.content.sha)
      setHomeOriginal(content)
      setMessage('首页设置已提交到 GitHub。')
      try {
        await refreshFiles(token)
      } catch (reason) {
        setError(
          `首页设置已成功提交，但仓库列表刷新失败：${
            reason instanceof Error ? reason.message : '请稍后手动刷新。'
          }`,
        )
      }
    } catch (reason) {
      setError(githubErrorMessage(reason, '首页设置保存失败。'))
    } finally {
      setSaving(false)
    }
  }

  const uploadCarouselFile = async (file: File) => {
    if (!token) return
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:avif|jpe?g|png|webp)$/i.test(file.name)) {
      return setError(
        '轮播文件名只能使用字母、数字、点、下划线和连字符，并以 AVIF/JPEG/PNG/WebP 结尾。',
      )
    }
    if (file.size > 10 * 1024 * 1024) {
      return setError('单张轮播图片不能超过 10MB。')
    }
    if (file.type && !CAROUSEL_MIME_TYPES.has(file.type.toLowerCase())) {
      return setError('轮播图片的文件类型必须是 AVIF、JPEG、PNG 或 WebP。')
    }

    const path = `${CAROUSEL_DIRECTORY}${file.name}`
    const existing = carouselFiles.find((item) => item.path === path)
    if (existing && !window.confirm(`轮播中已存在 ${file.name}，确定覆盖吗？`)) {
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await saveRepositoryBinaryFile({
        token,
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch,
        path,
        content: new Uint8Array(await file.arrayBuffer()),
        sha: existing?.sha,
        message: `${existing ? '更新' : '添加'}首页轮播：${file.name}`,
      })
      setMessage(`轮播图片 ${file.name} 已提交到 GitHub。`)
      try {
        await refreshFiles(token)
      } catch (reason) {
        setError(
          `轮播图片已成功提交，但仓库列表刷新失败：${
            reason instanceof Error ? reason.message : '请稍后手动刷新。'
          }`,
        )
      }
    } catch (reason) {
      setError(githubErrorMessage(reason, '轮播图片上传失败。'))
    } finally {
      setSaving(false)
    }
  }

  const removeCarouselFile = async (file: RepositoryFile) => {
    if (!token) return
    const name = file.path.slice(CAROUSEL_DIRECTORY.length)
    if (!window.confirm(`确定删除轮播图片 ${name} 吗？`)) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await deleteRepositoryFile({
        token,
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch,
        path: file.path,
        sha: file.sha,
        message: `删除首页轮播：${name}`,
      })
      setMessage(`轮播图片 ${name} 已从仓库删除。`)
      try {
        await refreshFiles(token)
      } catch (reason) {
        setError(
          `轮播图片已成功删除，但仓库列表刷新失败：${
            reason instanceof Error ? reason.message : '请稍后手动刷新。'
          }`,
        )
      }
    } catch (reason) {
      setError(githubErrorMessage(reason, '轮播图片删除失败。'))
    } finally {
      setSaving(false)
    }
  }

  const saveContact = async () => {
    if (!token || !contactSettings) return
    if (!contactSettings.intro.trim()) {
      return setError('请填写联系页介绍。')
    }
    if (contactSettings.email && !/^\S+@\S+\.\S+$/.test(contactSettings.email)) {
      return setError('请填写有效的表单收件邮箱。')
    }
    if (
      contactSettings.formEndpoint &&
      !isHttpUrl(contactSettings.formEndpoint.trim())
    ) {
      return setError('自定义表单接口必须是完整的 http(s) URL。')
    }

    const content = `${JSON.stringify(contactSettings, null, 2)}\n`
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await saveRepositoryFile({
        token,
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch,
        path: CONTACT_PATH,
        content,
        sha: contactSha,
        message: '更新联系页与表单配置',
      })
      setContactSha(result.content.sha)
      setContactOriginal(content)
      setMessage('联系页设置已提交到 GitHub。')
      try {
        await refreshFiles(token)
      } catch (reason) {
        setError(
          `联系页设置已成功提交，但仓库列表刷新失败：${
            reason instanceof Error ? reason.message : '请稍后手动刷新。'
          }`,
        )
      }
    } catch (reason) {
      setError(githubErrorMessage(reason, '联系页设置保存失败。'))
    } finally {
      setSaving(false)
    }
  }

  const serializedDocument = document ? serializeActiveDocument(document) : ''
  const documentDirty = Boolean(document && serializedDocument !== documentOriginal)
  const homeDirty = Boolean(
    homeSettings && `${JSON.stringify(homeSettings, null, 2)}\n` !== homeOriginal,
  )
  const contactDirty = Boolean(
    contactSettings &&
      `${JSON.stringify(contactSettings, null, 2)}\n` !== contactOriginal,
  )

  useEffect(() => {
    if (!documentDirty && !homeDirty && !contactDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [contactDirty, documentDirty, homeDirty])

  const refreshRepository = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await refreshFiles(token)
      setMessage('仓库内容列表已刷新。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '仓库刷新失败。')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !access || !token) {
    return (
      <LoginScreen
        repository={repositoryName}
        setupGuideUrl={setupGuideUrl}
        oauthReady={oauthReady}
        busy={authBusy}
        error={authError}
        onLogin={beginLogin}
      />
    )
  }

  const currentSection = sections.find((item) => item.id === section) ?? sections[0]

  return (
    <div className={`admin-shell${sidebarCollapsed ? ' is-collapsed' : ''}`}>
      <aside
        ref={mobileDrawerRef}
        id="admin-navigation-drawer"
        className={`admin-sidebar${mobileNavigation ? ' is-mobile-open' : ''}`}
        aria-label="编辑后台导航"
        aria-modal={mobileNavigation ? true : undefined}
        role={mobileNavigation ? 'dialog' : undefined}
      >
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-mark">未</span>
          <div>
            <strong>未来游戏研究所</strong>
            <span>CONTENT ADMIN</span>
          </div>
          <button
            ref={mobileCloseButtonRef}
            type="button"
            className="admin-sidebar__mobile-close"
            onClick={() => closeMobileNavigation()}
            aria-label="关闭导航"
          >
            <X />
          </button>
        </div>

        <nav className="admin-navigation" aria-label="编辑后台导航">
          {sections.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={item.id === section ? 'is-active' : ''}
                onClick={() => selectSection(item.id)}
                aria-current={item.id === section ? 'page' : undefined}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <ChevronRight className="admin-navigation__arrow" aria-hidden="true" />
              </button>
            )
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            <span>查看公开网站</span>
          </a>
        </div>
      </aside>

      {mobileNavigation && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="关闭导航"
          onClick={() => closeMobileNavigation()}
        />
      )}

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__leading">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              className="admin-topbar__menu"
              onClick={() => setMobileNavigation(true)}
              aria-label="打开导航"
              aria-controls="admin-navigation-drawer"
              aria-expanded={mobileNavigation}
            >
              <Menu />
            </button>
            <button
              type="button"
              className="admin-topbar__collapse"
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
            >
              <PanelLeftClose />
            </button>
            <div>
              <h1>{currentSection.label}</h1>
              <p>{currentSection.description}</p>
            </div>
          </div>

          <div className="admin-topbar__account">
            <a href={access.html_url} target="_blank" rel="noreferrer" className="admin-repository-status">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>可编辑</strong>
                <small>{repository.branch}</small>
              </span>
            </a>
            <img src={user.avatar_url} alt="" width="36" height="36" />
            <div className="admin-account-name">
              <strong>{user.name || user.login}</strong>
              <small>@{user.login}</small>
            </div>
            <button type="button" className="admin-topbar__logout" onClick={logout} aria-label="退出登录">
              <LogOut />
            </button>
          </div>
        </header>

        <div className="admin-content">
          {error && <StatusNotice kind="error">{error}</StatusNotice>}
          {message && <StatusNotice kind="success">{message}</StatusNotice>}

          {section === 'dashboard' && (
            <Dashboard
              repository={repositoryName}
              branch={repository.branch}
              newsCount={newsFiles.length}
              projectCount={projectFiles.length}
              authorCount={authorFiles.length}
              user={user}
              onNavigate={selectSection}
              refreshing={loading}
              onRefresh={() => void refreshRepository()}
            />
          )}

          {section === 'home' && (
            <HomeEditor
              settings={homeSettings}
              carouselFiles={carouselFiles}
              loading={loading}
              saving={saving}
              dirty={homeDirty}
              onChange={setHomeSettings}
              onSave={saveHome}
              onUploadCarousel={(file) => void uploadCarouselFile(file)}
              onDeleteCarousel={(file) => void removeCarouselFile(file)}
            />
          )}

          {section === 'news' && (
            <CollectionWorkspace
              title="NEWS 内容"
              description="管理公开文章与草稿。所有保存操作都会直接提交到 GitHub。"
              files={visibleFiles}
              search={search}
              selectedPath={selectedPath}
              document={document?.kind === 'news' ? document : null}
              documentDirty={documentDirty}
              loading={loading}
              saving={saving}
              editorTab={editorTab}
              newSlug={newSlug}
              onSearch={setSearch}
              onSelect={(path) => void loadDocument(path, 'news')}
              onCreate={() => createDocument('news')}
              onUpdateAttribute={updateAttribute}
              onUpdateBody={(body) => setDocument((current) => (current ? { ...current, body } : current))}
              onSlugChange={(value) =>
                setNewSlug(
                  value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-{2,}/g, '-')
                    .replace(/^-+/, ''),
                )
              }
              onEditorTab={setEditorTab}
              onSave={saveDocument}
              onDelete={removeDocument}
            />
          )}

          {section === 'works' && (
            <WorksWorkspace
              files={visibleFiles}
              search={search}
              selectedPath={selectedPath}
              document={document}
              documentDirty={documentDirty}
              loading={loading}
              saving={saving}
              editorTab={editorTab}
              newSlug={newSlug}
              onSearch={setSearch}
              onSelectPage={() => void loadDocument(WORKS_PATH, 'page')}
              onSelectProject={(path) => void loadDocument(path, 'project')}
              onCreate={() => createDocument('project')}
              onUpdateAttribute={updateAttribute}
              onUpdateBody={(body) => setDocument((current) => (current ? { ...current, body } : current))}
              onSlugChange={(value) =>
                setNewSlug(
                  value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-{2,}/g, '-')
                    .replace(/^-+/, ''),
                )
              }
              onEditorTab={setEditorTab}
              onSave={saveDocument}
              onDelete={removeDocument}
            />
          )}

          {section === 'authors' && (
            <CollectionWorkspace
              title="AUTHORS 内容"
              description="管理文章署名使用的作者档案与公开状态。"
              files={visibleFiles}
              search={search}
              selectedPath={selectedPath}
              document={document?.kind === 'author' ? document : null}
              documentDirty={documentDirty}
              loading={loading}
              saving={saving}
              editorTab={editorTab}
              newSlug={newSlug}
              onSearch={setSearch}
              onSelect={(path) => void loadDocument(path, 'author')}
              onCreate={() => createDocument('author')}
              onUpdateAttribute={updateAttribute}
              onUpdateBody={(body) =>
                setDocument((current) =>
                  current ? { ...current, body } : current,
                )
              }
              onSlugChange={(value) =>
                setNewSlug(
                  value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-{2,}/g, '-')
                    .replace(/^-+/, ''),
                )
              }
              onEditorTab={setEditorTab}
              onSave={saveDocument}
              onDelete={removeDocument}
              createLabel="新建作者"
              emptyText="从左侧选择一位作者，或创建新作者档案。"
            />
          )}

          {section === 'about' && (
            <StandalonePageEditor
              document={document?.path === ABOUT_PATH ? document : null}
              loading={loading}
              saving={saving}
              dirty={documentDirty}
              editorTab={editorTab}
              onUpdateAttribute={updateAttribute}
              onUpdateBody={(body) => setDocument((current) => (current ? { ...current, body } : current))}
              onEditorTab={setEditorTab}
              onSave={saveDocument}
            />
          )}

          {section === 'contact' && (
            <ContactEditor
              settings={contactSettings}
              loading={loading}
              saving={saving}
              dirty={contactDirty}
              onChange={setContactSettings}
              onSave={saveContact}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Dashboard({
  repository,
  branch,
  newsCount,
  projectCount,
  authorCount,
  user,
  onNavigate,
  refreshing,
  onRefresh,
}: {
  repository: string
  branch: string
  newsCount: number
  projectCount: number
  authorCount: number
  user: GitHubUser
  onNavigate: (section: Section) => void
  refreshing: boolean
  onRefresh: () => void
}) {
  return (
    <div className="admin-dashboard">
      <section className="admin-welcome">
        <div>
          <p>你好，{user.name || user.login}</p>
          <h2>网站内容已经连接到 GitHub</h2>
          <span>你对 {repository} 具有写入权限。所有修改将提交到 {branch} 分支并触发部署。</span>
        </div>
        <button
          type="button"
          className="admin-button"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? 'admin-spin' : undefined} />
          {refreshing ? '正在刷新…' : '刷新仓库状态'}
        </button>
      </section>

      <div className="admin-stat-row">
        <button type="button" onClick={() => onNavigate('news')}>
          <BookOpenText />
          <span><strong>{newsCount}</strong><small>NEWS 文件</small></span>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => onNavigate('works')}>
          <FolderKanban />
          <span><strong>{projectCount}</strong><small>项目文件</small></span>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => onNavigate('authors')}>
          <UserRound />
          <span><strong>{authorCount}</strong><small>作者档案</small></span>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => onNavigate('home')}>
          <Rss />
          <span><strong>RSS</strong><small>首页订阅始终开启</small></span>
          <ChevronRight />
        </button>
      </div>

      <section className="admin-quick-actions">
        <header><h2>内容入口</h2><p>选择需要维护的网站区域。</p></header>
        <div>
          {sections.slice(1).map((item) => {
            const Icon = item.icon
            return (
              <button type="button" key={item.id} onClick={() => onNavigate(item.id)}>
                <Icon />
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                <ChevronRight />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function HomeEditor({
  settings,
  carouselFiles,
  loading,
  saving,
  dirty,
  onChange,
  onSave,
  onUploadCarousel,
  onDeleteCarousel,
}: {
  settings: HomeSettings | null
  carouselFiles: RepositoryFile[]
  loading: boolean
  saving: boolean
  dirty: boolean
  onChange: React.Dispatch<React.SetStateAction<HomeSettings | null>>
  onSave: () => void
  onUploadCarousel: (file: File) => void
  onDeleteCarousel: (file: RepositoryFile) => void
}) {
  if (loading && !settings) return <AdminSkeleton />
  if (!settings) return <AdminEmpty text="无法读取首页设置。" />

  return (
    <div className="admin-editor-stack">
      <EditorHeading
        title="首页信息"
        description="维护首页右侧的公告与 SNS 链接。GitHub 与 RSS 按钮由系统固定显示。"
        dirty={dirty}
        saving={saving}
        onSave={onSave}
      />
      <section className="admin-panel admin-form-section">
        <header>
          <div>
            <h2>首页轮播</h2>
            <p>文件名按自然顺序排列；建议使用 01-、02- 作为顺序前缀。</p>
          </div>
          <label className={`admin-button${saving ? ' is-disabled' : ''}`}>
            <FilePlus2 aria-hidden="true" />
            上传图片
            <input
              className="admin-file-input"
              type="file"
              accept="image/avif,image/jpeg,image/png,image/webp"
              disabled={saving}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onUploadCarousel(file)
                event.target.value = ''
              }}
            />
          </label>
        </header>
        {carouselFiles.length ? (
          <ol className="admin-carousel-list">
            {carouselFiles.map((file, index) => (
              <li key={file.path}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{file.path.slice(CAROUSEL_DIRECTORY.length)}</strong>
                  <small>{(file.size / 1024).toFixed(1)} KB</small>
                </div>
                <button
                  type="button"
                  className="admin-button admin-button--danger"
                  onClick={() => onDeleteCarousel(file)}
                  disabled={saving}
                  aria-label={`删除 ${file.path.slice(CAROUSEL_DIRECTORY.length)}`}
                >
                  <Trash2 aria-hidden="true" />
                  删除
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="admin-inline-empty">尚未添加首页轮播图片。</div>
        )}
      </section>
      <section className="admin-panel admin-form-section">
        <header><div><h2>公告</h2><p>显示在首页 SNS 区块下方。</p></div></header>
        <div className="admin-form-grid">
          <Field
            label="公告标题"
            value={settings.announcement.title}
            onChange={(title) => onChange((current) => current ? { ...current, announcement: { ...current.announcement, title } } : current)}
            required
          />
          <label className="admin-form-field admin-form-field--wide">
            <span>公告正文 <i aria-hidden="true">*</i></span>
            <textarea
              className="admin-textarea"
              rows={5}
              value={settings.announcement.body}
              onChange={(event) => onChange((current) => current ? { ...current, announcement: { ...current.announcement, body: event.target.value } } : current)}
            />
          </label>
        </div>
      </section>

      <section className="admin-panel admin-form-section">
        <header>
          <div>
            <h2>SNS 账号</h2>
            <p>
              只有填写链接的平台才会出现在首页；GitHub 与 RSS 无需配置。
            </p>
          </div>
        </header>
        <div className="admin-social-list">
          {settings.socials.map((social) => (
            <div key={social.icon}>
              <span>{social.label}</span>
              <input
                className="admin-field"
                type="url"
                placeholder="https://"
                value={social.href}
                onChange={(event) =>
                  onChange((current) => {
                    if (!current) return current
                    const socials = current.socials.map((item) =>
                      item.icon === social.icon
                        ? { ...item, href: event.target.value }
                        : item,
                    )
                    return { ...current, socials }
                  })
                }
              />
            </div>
          ))}
          <div className="is-readonly">
            <span>GitHub</span>
            <input
              className="admin-field"
              value="https://github.com/Future-Game-Laboratory"
              disabled
              readOnly
            />
          </div>
          <div className="is-readonly">
            <span>RSS</span>
            <input
              className="admin-field"
              value="/rss.xml"
              disabled
              readOnly
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function ContactEditor({
  settings,
  loading,
  saving,
  dirty,
  onChange,
  onSave,
}: {
  settings: ContactSettings | null
  loading: boolean
  saving: boolean
  dirty: boolean
  onChange: React.Dispatch<React.SetStateAction<ContactSettings | null>>
  onSave: () => void
}) {
  if (loading && !settings) return <AdminSkeleton />
  if (!settings) return <AdminEmpty icon={Mail} text="无法读取联系页设置。" />

  return (
    <div className="admin-editor-stack">
      <EditorHeading
        title="联系页与表单"
        description="维护 CONTACT 页介绍和表单接收方式。邮箱与自定义接口至少配置一项后，发送按钮才会启用。"
        dirty={dirty}
        saving={saving}
        onSave={onSave}
      />
      <section className="admin-panel admin-form-section">
        <header>
          <div>
            <h2>页面介绍</h2>
            <p>使用空行分隔段落，显示在联系表单上方。</p>
          </div>
        </header>
        <div className="admin-form-grid">
          <label className="admin-form-field admin-form-field--wide">
            <span>
              介绍文字 <i aria-hidden="true">*</i>
            </span>
            <textarea
              className="admin-textarea"
              rows={7}
              value={settings.intro}
              onChange={(event) =>
                onChange((current) =>
                  current ? { ...current, intro: event.target.value } : current,
                )
              }
            />
          </label>
        </div>
      </section>
      <section className="admin-panel admin-form-section">
        <header>
          <div>
            <h2>表单接收</h2>
            <p>自定义接口优先；未填写时使用收件邮箱对应的 FormSubmit 地址。</p>
          </div>
        </header>
        <div className="admin-form-grid">
          <Field
            label="表单收件邮箱"
            type="email"
            value={settings.email}
            placeholder="hello@example.com"
            onChange={(email) =>
              onChange((current) => (current ? { ...current, email } : current))
            }
          />
          <Field
            label="自定义表单接口"
            type="url"
            value={settings.formEndpoint}
            placeholder="https://"
            onChange={(formEndpoint) =>
              onChange((current) =>
                current ? { ...current, formEndpoint } : current,
              )
            }
          />
        </div>
      </section>
    </div>
  )
}

function EditorHeading({
  title,
  description,
  dirty,
  saving,
  onSave,
  onDelete,
}: {
  title: string
  description: string
  dirty: boolean
  saving: boolean
  onSave: () => void
  onDelete?: () => void
}) {
  return (
    <header className="admin-editor-heading">
      <div><h2>{title}</h2><p>{description}</p></div>
      <div>
        {dirty && <span className="admin-unsaved">未保存</span>}
        {onDelete && <button type="button" className="admin-button admin-button--danger" onClick={onDelete} disabled={saving}><Trash2 />删除</button>}
        <button type="button" className="admin-button admin-button--primary" onClick={onSave} disabled={saving || !dirty}>
          {saving ? <LoaderCircle className="admin-spin" /> : <Save />}
          {saving ? '正在提交…' : '保存并发布'}
        </button>
      </div>
    </header>
  )
}

function CollectionWorkspace(props: {
  title: string
  description: string
  files: RepositoryFile[]
  search: string
  selectedPath: string
  document: EditableFile | null
  documentDirty: boolean
  loading: boolean
  saving: boolean
  editorTab: 'edit' | 'preview' | 'source'
  newSlug: string
  onSearch: (value: string) => void
  onSelect: (path: string) => void
  onCreate: () => void
  onUpdateAttribute: (key: string, value: FrontmatterValue) => void
  onUpdateBody: (value: string) => void
  onSlugChange: (value: string) => void
  onEditorTab: (tab: 'edit' | 'preview' | 'source') => void
  onSave: () => void
  onDelete: () => void
  createLabel?: string
  emptyText?: string
}) {
  return (
    <div className="admin-collection">
      <ContentList
        title={props.title}
        description={props.description}
        files={props.files}
        search={props.search}
        selectedPath={props.selectedPath}
        onSearch={props.onSearch}
        onSelect={props.onSelect}
        onCreate={props.onCreate}
        createLabel={props.createLabel ?? '新建文章'}
      />
      <div className="admin-collection__editor">
        {props.loading ? <AdminSkeleton /> : props.document ? (
          <DocumentEditor
            document={props.document}
            documentDirty={props.documentDirty}
            saving={props.saving}
            editorTab={props.editorTab}
            newSlug={props.newSlug}
            onUpdateAttribute={props.onUpdateAttribute}
            onUpdateBody={props.onUpdateBody}
            onSlugChange={props.onSlugChange}
            onEditorTab={props.onEditorTab}
            onSave={props.onSave}
            onDelete={props.onDelete}
          />
        ) : (
          <AdminEmpty
            icon={props.createLabel ? UserRound : FileText}
            text={
              props.emptyText ?? '从左侧选择一篇文章，或创建新文章。'
            }
          />
        )}
      </div>
    </div>
  )
}

function WorksWorkspace(props: {
  files: RepositoryFile[]
  search: string
  selectedPath: string
  document: EditableFile | null
  documentDirty: boolean
  loading: boolean
  saving: boolean
  editorTab: 'edit' | 'preview' | 'source'
  newSlug: string
  onSearch: (value: string) => void
  onSelectPage: () => void
  onSelectProject: (path: string) => void
  onCreate: () => void
  onUpdateAttribute: (key: string, value: FrontmatterValue) => void
  onUpdateBody: (value: string) => void
  onSlugChange: (value: string) => void
  onEditorTab: (tab: 'edit' | 'preview' | 'source') => void
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <div className="admin-collection">
      <aside className="admin-content-list">
        <header><div><h2>WORKS 内容</h2><p>页面正文与项目档案。</p></div><button type="button" className="admin-button" onClick={props.onCreate}><FilePlus2 />新建项目</button></header>
        <button type="button" className={`admin-page-entry${props.selectedPath === WORKS_PATH ? ' is-active' : ''}`} onClick={props.onSelectPage}>
          <FileText /><span><strong>WORKS 页面</strong><small>{WORKS_PATH}</small></span><ChevronRight />
        </button>
        <div className="admin-list-separator"><span>项目档案</span></div>
        <label className="admin-search"><Search aria-hidden="true" /><input aria-label="搜索项目路径" value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="搜索项目路径" /></label>
        <div className="admin-file-list">
          {props.files.map((file) => (
            <button type="button" key={file.path} className={props.selectedPath === file.path ? 'is-active' : ''} onClick={() => props.onSelectProject(file.path)}>
              <FolderKanban /><span><strong>{fileTitle(file)}</strong><small>{file.path}</small></span><ChevronRight />
            </button>
          ))}
        </div>
      </aside>
      <div className="admin-collection__editor">
        {props.loading ? <AdminSkeleton /> : props.document ? (
          <DocumentEditor
            document={props.document}
            documentDirty={props.documentDirty}
            saving={props.saving}
            editorTab={props.editorTab}
            newSlug={props.newSlug}
            onUpdateAttribute={props.onUpdateAttribute}
            onUpdateBody={props.onUpdateBody}
            onSlugChange={props.onSlugChange}
            onEditorTab={props.onEditorTab}
            onSave={props.onSave}
            onDelete={props.onDelete}
          />
        ) : <AdminEmpty icon={FolderKanban} text="选择 WORKS 页面或一个项目档案。" />}
      </div>
    </div>
  )
}

function ContentList({
  title,
  description,
  files,
  search,
  selectedPath,
  onSearch,
  onSelect,
  onCreate,
  createLabel,
}: {
  title: string
  description: string
  files: RepositoryFile[]
  search: string
  selectedPath: string
  onSearch: (value: string) => void
  onSelect: (path: string) => void
  onCreate: () => void
  createLabel: string
}) {
  return (
    <aside className="admin-content-list">
      <header><div><h2>{title}</h2><p>{description}</p></div><button type="button" className="admin-button" onClick={onCreate}><FilePlus2 />{createLabel}</button></header>
      <label className="admin-search"><Search aria-hidden="true" /><input aria-label={`搜索${title}`} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="搜索文件路径" /></label>
      <div className="admin-file-list">
        {files.length ? files.map((file) => (
          <button type="button" key={file.path} className={selectedPath === file.path ? 'is-active' : ''} onClick={() => onSelect(file.path)}>
            <FileText /><span><strong>{fileTitle(file)}</strong><small>{file.path}</small></span><ChevronRight />
          </button>
        )) : <p className="admin-file-list__empty">没有匹配的内容。</p>}
      </div>
    </aside>
  )
}

function StandalonePageEditor(props: {
  document: EditableFile | null
  loading: boolean
  saving: boolean
  dirty: boolean
  editorTab: 'edit' | 'preview' | 'source'
  onUpdateAttribute: (key: string, value: FrontmatterValue) => void
  onUpdateBody: (value: string) => void
  onEditorTab: (tab: 'edit' | 'preview' | 'source') => void
  onSave: () => void
}) {
  if (props.loading || !props.document) return <AdminSkeleton />
  return (
    <div className="admin-editor-stack">
      <DocumentEditor
        document={props.document}
        documentDirty={props.dirty}
        saving={props.saving}
        editorTab={props.editorTab}
        newSlug=""
        onUpdateAttribute={props.onUpdateAttribute}
        onUpdateBody={props.onUpdateBody}
        onSlugChange={() => undefined}
        onEditorTab={props.onEditorTab}
        onSave={props.onSave}
      />
    </div>
  )
}

function DocumentEditor({
  document,
  documentDirty,
  saving,
  editorTab,
  newSlug,
  onUpdateAttribute,
  onUpdateBody,
  onSlugChange,
  onEditorTab,
  onSave,
  onDelete,
}: {
  document: EditableFile
  documentDirty: boolean
  saving: boolean
  editorTab: 'edit' | 'preview' | 'source'
  newSlug: string
  onUpdateAttribute: (key: string, value: FrontmatterValue) => void
  onUpdateBody: (value: string) => void
  onSlugChange: (value: string) => void
  onEditorTab: (tab: 'edit' | 'preview' | 'source') => void
  onSave: () => void
  onDelete?: () => void
}) {
  const titleKey =
    document.kind === 'project' || document.kind === 'author'
      ? 'name'
      : 'title'
  const title = fieldValue(document.attributes, titleKey) || (document.isNew ? '新内容' : filename(document.path))
  const source = serializeEditableDocument(document)
  return (
    <div className="admin-editor-stack">
      <EditorHeading
        title={title}
        description={document.isNew ? '填写内容并提交到 GitHub。' : document.path}
        dirty={documentDirty}
        saving={saving}
        onSave={onSave}
        onDelete={!document.isNew && document.kind !== 'page' ? onDelete : undefined}
      />

      <div className="admin-editor-tabs" role="tablist" aria-label="编辑视图">
        {(['edit', 'preview', 'source'] as const).map((tab) => (
          <button type="button" role="tab" id={`editor-tab-${tab}`} aria-controls={`editor-panel-${tab}`} key={tab} aria-selected={editorTab === tab} className={editorTab === tab ? 'is-active' : ''} onClick={() => onEditorTab(tab)}>
            {tab === 'edit' ? '编辑' : tab === 'preview' ? '预览' : '源文件'}
          </button>
        ))}
      </div>

      {editorTab === 'edit' ? (
        <section id="editor-panel-edit" role="tabpanel" aria-labelledby="editor-tab-edit" className="admin-panel admin-form-section">
          <div className="admin-form-grid">
            <Field label={document.kind === 'project' ? '项目名称' : document.kind === 'author' ? '作者名称' : '标题'} value={fieldValue(document.attributes, titleKey)} onChange={(value) => onUpdateAttribute(titleKey, value)} required />
            {document.kind !== 'author' && <Field label="摘要" value={fieldValue(document.attributes, 'description')} onChange={(value) => onUpdateAttribute('description', value)} required />}
            {document.isNew && <Field label="文件路径" value={newSlug} onChange={onSlugChange} placeholder="lowercase-slug" required mono />}
            {document.kind === 'news' && <>
              <Field label="发布日期" type="date" value={fieldValue(document.attributes, 'date')} onChange={(value) => onUpdateAttribute('date', value)} required />
              <Field label="封面路径" value={fieldValue(document.attributes, 'image')} onChange={(value) => onUpdateAttribute('image', value)} placeholder="./banner.png" mono />
              <Field label="子文章顺序" type="number" value={fieldValue(document.attributes, 'order')} onChange={(value) => onUpdateAttribute('order', value ? Number(value) : '')} placeholder="可选" />
              <Field label="标签" value={commaList(document.attributes.tags)} onChange={(value) => onUpdateAttribute('tags', splitCommaList(value))} placeholder="game-design, research" />
              <Field label="作者 ID" value={commaList(document.attributes.authors)} onChange={(value) => onUpdateAttribute('authors', splitCommaList(value))} placeholder="author-id" />
              <label className="admin-checkbox"><input type="checkbox" checked={Boolean(document.attributes.draft)} onChange={(event) => onUpdateAttribute('draft', event.target.checked)} /><span><strong>保存为草稿</strong><small>草稿会提交到仓库，但不会出现在公开列表。</small></span></label>
            </>}
            {document.kind === 'project' && <>
              <Field label="项目链接" type="url" value={fieldValue(document.attributes, 'link')} onChange={(value) => onUpdateAttribute('link', value)} required />
              <Field label="图片路径" value={fieldValue(document.attributes, 'image')} onChange={(value) => onUpdateAttribute('image', value)} mono />
              <Field label="开始日期" type="date" value={fieldValue(document.attributes, 'startDate')} onChange={(value) => onUpdateAttribute('startDate', value)} />
              <Field label="结束日期" type="date" value={fieldValue(document.attributes, 'endDate')} onChange={(value) => onUpdateAttribute('endDate', value)} />
              <Field label="标签" value={commaList(document.attributes.tags)} onChange={(value) => onUpdateAttribute('tags', splitCommaList(value))} />
              <label className="admin-checkbox"><input type="checkbox" checked={Boolean(document.attributes.draft)} onChange={(event) => onUpdateAttribute('draft', event.target.checked)} /><span><strong>保存为草稿</strong><small>草稿会提交到仓库，但不会显示在公开 WORKS 页面。</small></span></label>
            </>}
            {document.kind === 'author' && <>
              <Field label="头像路径" value={fieldValue(document.attributes, 'avatar')} onChange={(value) => onUpdateAttribute('avatar', value)} placeholder="/static/logo.png" required mono />
              <Field label="称谓 / 代词" value={fieldValue(document.attributes, 'pronouns')} onChange={(value) => onUpdateAttribute('pronouns', value)} />
              <Field label="公开简介" value={fieldValue(document.attributes, 'bio')} onChange={(value) => onUpdateAttribute('bio', value)} />
              <Field label="邮箱" type="email" value={fieldValue(document.attributes, 'mail')} onChange={(value) => onUpdateAttribute('mail', value)} />
              <Field label="个人网站" type="url" value={fieldValue(document.attributes, 'website')} onChange={(value) => onUpdateAttribute('website', value)} placeholder="https://" />
              <Field label="GitHub" type="url" value={fieldValue(document.attributes, 'github')} onChange={(value) => onUpdateAttribute('github', value)} placeholder="https://github.com/" />
              <Field label="X / Twitter" type="url" value={fieldValue(document.attributes, 'twitter')} onChange={(value) => onUpdateAttribute('twitter', value)} placeholder="https://" />
              <Field label="LinkedIn" type="url" value={fieldValue(document.attributes, 'linkedin')} onChange={(value) => onUpdateAttribute('linkedin', value)} placeholder="https://" />
              <Field label="Discord 链接" type="url" value={fieldValue(document.attributes, 'discord')} onChange={(value) => onUpdateAttribute('discord', value)} placeholder="https://" />
              <label className="admin-checkbox"><input type="checkbox" checked={Boolean(document.attributes.draft)} onChange={(event) => onUpdateAttribute('draft', event.target.checked)} /><span><strong>隐藏作者档案</strong><small>隐藏后作者不会出现在公开作者页面，但文章中的署名 ID 仍会保留。</small></span></label>
            </>}
            {(document.kind === 'news' || document.kind === 'page') && (
              <label className="admin-form-field admin-form-field--wide">
                <span>{document.kind === 'news' ? '正文（Markdown / MDX）' : '页面正文（Markdown）'}</span>
                <textarea className="admin-textarea admin-source-editor" rows={24} value={document.body} onChange={(event) => onUpdateBody(event.target.value)} spellCheck />
              </label>
            )}
          </div>
        </section>
      ) : editorTab === 'preview' ? (
        <section id="editor-panel-preview" role="tabpanel" aria-labelledby="editor-tab-preview" className="admin-panel admin-preview-panel"><MarkdownPreview source={document.body} /></section>
      ) : (
        <section id="editor-panel-source" role="tabpanel" aria-labelledby="editor-tab-source" className="admin-panel admin-source-panel"><pre>{source}</pre></section>
      )}
    </div>
  )
}

function AdminSkeleton() {
  return <div className="admin-skeleton" aria-label="正在加载"><span /><span /><span /><span /></div>
}

function AdminEmpty({ text, icon: Icon = FileText }: { text: string; icon?: typeof FileText }) {
  return <div className="admin-empty"><Icon aria-hidden="true" /><p>{text}</p></div>
}
