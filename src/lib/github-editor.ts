export type GitHubUser = {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

export type RepositoryAccess = {
  full_name: string
  default_branch: string
  html_url: string
  permissions?: {
    admin?: boolean
    maintain?: boolean
    push?: boolean
    triage?: boolean
    pull?: boolean
  }
}

export type RepositoryFile = {
  path: string
  sha: string
  size: number
}

export type RepositoryFileContent = {
  path: string
  sha: string
  content: string
}

type GitHubError = {
  message?: string
  documentation_url?: string
}

export class GitHubApiError extends Error {
  status: number
  documentationUrl?: string
  requestId?: string
  rateLimitRemaining?: number
  oauthScopes?: string
  sso?: string

  constructor(
    status: number,
    message: string,
    documentationUrl?: string,
    metadata: {
      requestId?: string
      rateLimitRemaining?: number
      oauthScopes?: string
      sso?: string
    } = {},
  ) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.documentationUrl = documentationUrl
    this.requestId = metadata.requestId
    this.rateLimitRemaining = metadata.rateLimitRemaining
    this.oauthScopes = metadata.oauthScopes
    this.sso = metadata.sso
  }
}

const API_VERSION = '2022-11-28'

const headersFor = (token: string, json = false): HeadersInit => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': API_VERSION,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
})

const apiRequest = async <T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...headersFor(token, Boolean(init.body)),
      ...init.headers,
    },
  })
  const result = (await response.json().catch(() => ({}))) as T & GitHubError

  if (!response.ok) {
    const remainingHeader = response.headers.get('x-ratelimit-remaining')
    const remaining = remainingHeader === null ? undefined : Number(remainingHeader)
    throw new GitHubApiError(
      response.status,
      result.message || `GitHub 请求失败（${response.status}）`,
      result.documentation_url,
      {
        requestId: response.headers.get('x-github-request-id') || undefined,
        rateLimitRemaining: Number.isFinite(remaining) ? remaining : undefined,
        oauthScopes: response.headers.get('x-oauth-scopes') || undefined,
        sso: response.headers.get('x-github-sso') || undefined,
      },
    )
  }

  return result
}

export const getAuthenticatedUser = (token: string) =>
  apiRequest<GitHubUser>(token, '/user')

export const getRepositoryAccess = (
  token: string,
  owner: string,
  repo: string,
) =>
  apiRequest<RepositoryAccess>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  )

export const canPushRepository = (repository: RepositoryAccess) =>
  Boolean(
    repository.permissions?.push ||
      repository.permissions?.maintain ||
      repository.permissions?.admin,
  )

export const githubErrorMessage = (reason: unknown, fallback: string) => {
  if (!(reason instanceof GitHubApiError)) {
    return reason instanceof Error ? reason.message : fallback
  }

  if (reason.status === 401) {
    return 'GitHub 登录已失效，请退出编辑后台后重新登录。'
  }

  if (reason.status === 403) {
    if (
      reason.rateLimitRemaining === 0 ||
      /rate limit|secondary rate/i.test(reason.message)
    ) {
      return `GitHub API 配额暂时用尽：${reason.message}。请稍后重试。`
    }
    if (
      reason.sso ||
      /oauth|organization|integration|saml|sso|resource not accessible/i.test(
        reason.message,
      )
    ) {
      return `GitHub 已拒绝组织仓库写入：${reason.message}。请确认 OAuth App 已获 Future-Game-Laboratory 组织批准，然后退出并重新登录。`
    }
    return `GitHub 已拒绝写入：${reason.message}。请检查当前账号权限和仓库规则。`
  }

  if (reason.status === 409) {
    return '远端内容已经变化，当前版本无法直接覆盖。请复制未保存内容，重新打开该文件后再提交。'
  }

  if (reason.status === 422) {
    if (/sha|fast forward|reference update/i.test(reason.message)) {
      return `远端内容刚刚发生变化：${reason.message}。请刷新仓库状态后重试。`
    }
    return `GitHub 无法接受这次内容变更：${reason.message}`
  }

  return reason.message || fallback
}

export const listRepositoryFiles = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<RepositoryFile[]> => {
  const tree = await apiRequest<{
    truncated: boolean
    tree: Array<{ path: string; type: string; sha: string; size?: number }>
  }>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  )

  if (tree.truncated) {
    throw new Error('仓库文件列表过大，GitHub 未返回完整结果。')
  }

  return tree.tree
    .filter((entry) => entry.type === 'blob')
    .map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size ?? 0,
    }))
}

export const decodeBase64 = (value: string) => {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export const encodeBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  return encodeBytesBase64(bytes)
}

export const encodeBytesBase64 = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export const getRepositoryFile = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<RepositoryFileContent> => {
  const result = await apiRequest<{
    path: string
    sha: string
    content: string
    encoding: string
  }>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}?ref=${encodeURIComponent(branch)}`,
  )

  if (result.encoding !== 'base64') {
    throw new Error(`无法读取 ${path}：GitHub 返回了未知编码。`)
  }

  return {
    path: result.path,
    sha: result.sha,
    content: decodeBase64(result.content),
  }
}

export const saveRepositoryFile = async (options: {
  token: string
  owner: string
  repo: string
  branch: string
  path: string
  content: string
  message: string
  sha?: string
}) => {
  const { token, owner, repo, branch, path, content, message, sha } = options
  return apiRequest<{
    content: { sha: string }
    commit: { html_url: string; sha: string }
  }>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encodeBase64(content),
        branch,
        ...(sha ? { sha } : {}),
      }),
    },
  )
}

export const saveRepositoryBinaryFile = async (options: {
  token: string
  owner: string
  repo: string
  branch: string
  path: string
  content: Uint8Array
  message: string
  sha?: string
}) => {
  const { token, owner, repo, branch, path, content, message, sha } = options
  return apiRequest<{
    content: { sha: string }
    commit: { html_url: string; sha: string }
  }>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encodeBytesBase64(content),
        branch,
        ...(sha ? { sha } : {}),
      }),
    },
  )
}

export const deleteRepositoryFile = async (options: {
  token: string
  owner: string
  repo: string
  branch: string
  path: string
  sha: string
  message: string
}) => {
  const { token, owner, repo, branch, path, sha, message } = options
  return apiRequest<{ commit: { html_url: string; sha: string } }>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch }),
    },
  )
}

export type RepositoryTextChange = {
  path: string
  content: string | null
}

export const commitRepositoryChanges = async (options: {
  token: string
  owner: string
  repo: string
  branch: string
  message: string
  changes: RepositoryTextChange[]
}) => {
  const { token, owner, repo, branch, message, changes } = options
  if (!changes.length) throw new Error('没有需要提交的仓库变更。')

  const uniquePaths = new Set(changes.map((change) => change.path))
  if (uniquePaths.size !== changes.length) {
    throw new Error('同一次提交中包含重复的文件路径。')
  }

  const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const branchPath = encodeURIComponent(branch)
  const reference = await apiRequest<{ object: { sha: string } }>(
    token,
    `${repositoryPath}/git/ref/heads/${branchPath}`,
  )
  const head = await apiRequest<{ tree: { sha: string } }>(
    token,
    `${repositoryPath}/git/commits/${encodeURIComponent(reference.object.sha)}`,
  )

  const contentShas: Record<string, string> = {}
  const treeEntries = await Promise.all(
    changes.map(async (change) => {
      if (change.content === null) {
        return {
          path: change.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: null,
        }
      }

      const blob = await apiRequest<{ sha: string }>(
        token,
        `${repositoryPath}/git/blobs`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: encodeBase64(change.content),
            encoding: 'base64',
          }),
        },
      )
      contentShas[change.path] = blob.sha
      return {
        path: change.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      }
    }),
  )

  const tree = await apiRequest<{ sha: string }>(
    token,
    `${repositoryPath}/git/trees`,
    {
      method: 'POST',
      body: JSON.stringify({ base_tree: head.tree.sha, tree: treeEntries }),
    },
  )
  const commit = await apiRequest<{ sha: string; html_url: string }>(
    token,
    `${repositoryPath}/git/commits`,
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [reference.object.sha],
      }),
    },
  )
  await apiRequest<{ ref: string }>(
    token,
    `${repositoryPath}/git/refs/heads/${branchPath}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false }),
    },
  )

  return { commit, contentShas }
}
