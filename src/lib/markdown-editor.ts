export type MarkdownAction =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'quote'
  | 'code'
  | 'link'
  | 'image'
  | 'unordered-list'
  | 'ordered-list'
  | 'task-list'

export type MarkdownEdit = {
  value: string
  selectionStart: number
  selectionEnd: number
}

const replaceSelection = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  replacement: string,
  nextSelectionStart: number,
  nextSelectionEnd: number,
): MarkdownEdit => ({
  value: `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`,
  selectionStart: nextSelectionStart,
  selectionEnd: nextSelectionEnd,
})

const wrapSelection = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  opening: string,
  closing: string,
  placeholder: string,
): MarkdownEdit => {
  const selected = value.slice(selectionStart, selectionEnd)
  const hasOuterMarkers =
    value.slice(selectionStart - opening.length, selectionStart) === opening &&
    value.slice(selectionEnd, selectionEnd + closing.length) === closing

  if (hasOuterMarkers) {
    const replacementStart = selectionStart - opening.length
    const replacementEnd = selectionEnd + closing.length
    return replaceSelection(
      value,
      replacementStart,
      replacementEnd,
      selected,
      replacementStart,
      replacementStart + selected.length,
    )
  }

  const content = selected || placeholder
  const replacement = `${opening}${content}${closing}`
  const contentStart = selectionStart + opening.length
  return replaceSelection(
    value,
    selectionStart,
    selectionEnd,
    replacement,
    contentStart,
    contentStart + content.length,
  )
}

const lineBounds = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
) => {
  const start = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1
  const nextLineBreak = value.indexOf('\n', selectionEnd)
  return {
    start,
    end: nextLineBreak === -1 ? value.length : nextLineBreak,
  }
}

type LineAction =
  'heading' | 'quote' | 'unordered-list' | 'ordered-list' | 'task-list'

const toggleLineAction = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: LineAction,
): MarkdownEdit => {
  const bounds = lineBounds(value, selectionStart, selectionEnd)
  const lines = value.slice(bounds.start, bounds.end).split('\n')
  const meaningfulLines = lines.filter((line) => line.trim())
  const activePattern =
    action === 'heading'
      ? /^##\s+/
      : action === 'quote'
        ? /^>\s?/
        : action === 'unordered-list'
          ? /^[-+*]\s+/
          : action === 'ordered-list'
            ? /^\d+\.\s+/
            : /^[-+*]\s+\[[ xX]\]\s+/
  const isActive =
    meaningfulLines.length > 0 &&
    meaningfulLines.every((line) => activePattern.test(line))
  let orderedIndex = 0

  const transformedLines = lines.map((line) => {
    if (!line.trim()) return line
    if (isActive) return line.replace(activePattern, '')

    if (action === 'heading') {
      return `## ${line.replace(/^#{1,6}\s+/, '')}`
    }
    if (action === 'quote') return `> ${line.replace(/^>\s?/, '')}`
    if (action === 'unordered-list') {
      return `- ${line.replace(/^(?:[-+*]|\d+\.)\s+/, '')}`
    }
    if (action === 'ordered-list') {
      orderedIndex += 1
      return `${orderedIndex}. ${line.replace(/^(?:[-+*]|\d+\.)\s+/, '')}`
    }
    return `- [ ] ${line.replace(/^[-+*]\s+(?:\[[ xX]\]\s+)?/, '')}`
  })

  const replacement = transformedLines.join('\n')
  const collapsed = selectionStart === selectionEnd
  const firstLineDelta = transformedLines[0].length - lines[0].length
  const nextStart = collapsed
    ? Math.max(bounds.start, selectionStart + firstLineDelta)
    : bounds.start
  const nextEnd = collapsed ? nextStart : bounds.start + replacement.length

  return replaceSelection(
    value,
    bounds.start,
    bounds.end,
    replacement,
    nextStart,
    nextEnd,
  )
}

export const createMarkdownLinkEdit = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  url = 'https://',
): MarkdownEdit => {
  const selected = value.slice(selectionStart, selectionEnd) || '链接文字'
  const replacement = `[${selected}](${url})`
  const urlStart = selectionStart + selected.length + 3
  return replaceSelection(
    value,
    selectionStart,
    selectionEnd,
    replacement,
    urlStart,
    urlStart + url.length,
  )
}

export const applyMarkdownAction = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: MarkdownAction,
): MarkdownEdit => {
  if (
    action === 'heading' ||
    action === 'quote' ||
    action === 'unordered-list' ||
    action === 'ordered-list' ||
    action === 'task-list'
  ) {
    return toggleLineAction(value, selectionStart, selectionEnd, action)
  }

  if (action === 'bold') {
    return wrapSelection(
      value,
      selectionStart,
      selectionEnd,
      '**',
      '**',
      '粗体文字',
    )
  }
  if (action === 'italic') {
    return wrapSelection(
      value,
      selectionStart,
      selectionEnd,
      '_',
      '_',
      '斜体文字',
    )
  }
  if (action === 'strikethrough') {
    return wrapSelection(
      value,
      selectionStart,
      selectionEnd,
      '~~',
      '~~',
      '删除线文字',
    )
  }
  if (action === 'link') {
    return createMarkdownLinkEdit(value, selectionStart, selectionEnd)
  }
  if (action === 'image') {
    const selected = value.slice(selectionStart, selectionEnd) || '图片说明'
    const replacement = `![${selected}](图片地址)`
    const addressStart = selectionStart + selected.length + 4
    return replaceSelection(
      value,
      selectionStart,
      selectionEnd,
      replacement,
      addressStart,
      addressStart + 4,
    )
  }

  const selected = value.slice(selectionStart, selectionEnd)
  if (selected.includes('\n')) {
    const replacement = `\`\`\`\n${selected}\n\`\`\``
    return replaceSelection(
      value,
      selectionStart,
      selectionEnd,
      replacement,
      selectionStart + 4,
      selectionStart + 4 + selected.length,
    )
  }
  return wrapSelection(value, selectionStart, selectionEnd, '`', '`', '代码')
}

export const continueMarkdownList = (
  value: string,
  cursor: number,
): MarkdownEdit | null => {
  const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1
  const beforeCursor = value.slice(lineStart, cursor)
  const match = beforeCursor.match(
    /^(\s*)([-+*]|\d+\.)(\s+)(\[[ xX]\]\s+)?(.*)$/,
  )
  if (!match) return null

  const [, indentation, marker, spacing, task, content] = match
  if (!content.trim()) {
    return replaceSelection(value, lineStart, cursor, '', lineStart, lineStart)
  }

  const nextMarker = /^\d+\.$/.test(marker)
    ? `${Number.parseInt(marker, 10) + 1}.`
    : marker
  const nextTask = task ? '[ ] ' : ''
  const insertion = `\n${indentation}${nextMarker}${spacing}${nextTask}`
  const nextCursor = cursor + insertion.length
  return replaceSelection(
    value,
    cursor,
    cursor,
    insertion,
    nextCursor,
    nextCursor,
  )
}
