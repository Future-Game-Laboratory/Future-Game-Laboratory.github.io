export type FrontmatterValue = string | boolean | number | string[]

export type ParsedDocument = {
  attributes: Record<string, FrontmatterValue>
  body: string
}

const parseValue = (value: string): FrontmatterValue => {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed)

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const result = JSON.parse(trimmed.replace(/'/g, '"'))
      if (Array.isArray(result)) return result.map(String)
    } catch {}
  }

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    try {
      if (trimmed.startsWith('"')) return JSON.parse(trimmed)
      return trimmed.slice(1, -1).replace(/''/g, "'")
    } catch {}
  }

  return trimmed
}

export const parseDocument = (source: string): ParsedDocument => {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---\n')) {
    return { attributes: {}, body: normalized.trim() }
  }

  const closing = normalized.indexOf('\n---\n', 4)
  if (closing === -1) return { attributes: {}, body: normalized.trim() }

  const frontmatter = normalized.slice(4, closing)
  const attributes: Record<string, FrontmatterValue> = {}
  frontmatter.split('\n').forEach((line) => {
    const match = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/)
    if (match) attributes[match[1]] = parseValue(match[2])
  })

  return {
    attributes,
    body: normalized.slice(closing + 5).trim(),
  }
}

const serializeValue = (value: FrontmatterValue) => {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value)
  }
  if (Array.isArray(value)) return JSON.stringify(value)
  return JSON.stringify(value.trim())
}

export const serializeDocument = (
  attributes: Record<string, FrontmatterValue | undefined>,
  body: string,
) => {
  const lines = Object.entries(attributes)
    .filter((entry): entry is [string, FrontmatterValue] => entry[1] !== undefined)
    .map(([key, value]) => `${key}: ${serializeValue(value)}`)

  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`
}

export const commaList = (value: FrontmatterValue | undefined) =>
  Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : ''

export const splitCommaList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const repositoryPathToSlug = (path: string) => {
  const match = path.match(/^src\/content\/blog\/(.+?)\/(?:index\.)?mdx?$/)
  if (match) return match[1]
  return path.split('/').pop()?.replace(/\.mdx?$/, '') ?? path
}
