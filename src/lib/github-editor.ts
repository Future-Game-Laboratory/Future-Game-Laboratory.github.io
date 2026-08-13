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

  constructor(status: number, message: string, documentationUrl?: string) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.documentationUrl = documentationUrl
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
    throw new GitHubApiError(
      response.status,
      result.message || `GitHub 请求失败（${response.status}）`,
      result.documentation_url,
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
