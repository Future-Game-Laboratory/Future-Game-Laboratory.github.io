const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export function withBase(path: string): string {
  if (!path.startsWith('/') || (base && path.startsWith(`${base}/`))) return path
  return `${base}${path}`
}
