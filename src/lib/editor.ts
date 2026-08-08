export type EditorDraft = {
  title: string
  description: string
  slug: string
  date: string
  tags: string
  authors: string
  draft: boolean
  body: string
}

export const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const yamlString = (value: string) => JSON.stringify(value)
const yamlList = (value: string) => JSON.stringify(splitList(value))

export const makeMdx = (draft: EditorDraft) => `---
title: ${yamlString(draft.title.trim())}
description: ${yamlString(draft.description.trim())}
date: ${draft.date}
tags: ${yamlList(draft.tags)}
authors: ${yamlList(draft.authors)}
draft: ${draft.draft}
---

${draft.body.trim()}\n`

export const validateDraft = (draft: EditorDraft) => {
  if (!draft.title.trim()) return '请填写文章标题。'
  if (!draft.description.trim()) return '请填写文章摘要。'
  if (!draft.date) return '请选择发布日期。'
  if (!draft.slug.trim()) return '请填写文章路径。'
  if (!draft.body.trim()) return '文章正文不能为空。'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug))
    return '文章路径仅支持小写字母、数字和连字符。'
  return ''
}

export const toBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary)
}
