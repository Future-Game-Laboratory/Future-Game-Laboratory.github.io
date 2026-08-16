import { useCallback, useRef, useState } from 'react'
import {
  Bold,
  Code2,
  ExternalLink,
  FileText,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Strikethrough,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Tabs, Toolbar } from 'radix-ui'
import remarkGfm from 'remark-gfm'
import {
  applyMarkdownAction,
  continueMarkdownList,
  createMarkdownLinkEdit,
  type MarkdownAction,
  type MarkdownEdit,
} from '@/lib/markdown-editor'

export type MarkdownEditorMode = 'edit' | 'preview'

type MarkdownKeyboardEvent = {
  nativeEvent: { isComposing?: boolean }
  currentTarget: HTMLTextAreaElement
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  preventDefault: () => void
}

type MarkdownClipboardEvent = {
  currentTarget: HTMLTextAreaElement
  clipboardData: { getData: (type: string) => string }
  preventDefault: () => void
}

const markdownActions: Array<{
  action: MarkdownAction
  label: string
  shortcut?: string
  keyshortcuts?: string
  icon: typeof Bold
  separatorBefore?: boolean
}> = [
  { action: 'heading', label: '标题', icon: Heading2 },
  {
    action: 'bold',
    label: '粗体',
    shortcut: '⌘B',
    keyshortcuts: 'Meta+B Control+B',
    icon: Bold,
  },
  {
    action: 'italic',
    label: '斜体',
    shortcut: '⌘I',
    keyshortcuts: 'Meta+I Control+I',
    icon: Italic,
  },
  { action: 'strikethrough', label: '删除线', icon: Strikethrough },
  { action: 'quote', label: '引用', icon: Quote, separatorBefore: true },
  { action: 'code', label: '代码', icon: Code2 },
  {
    action: 'link',
    label: '链接',
    shortcut: '⌘K',
    keyshortcuts: 'Meta+K Control+K',
    icon: LinkIcon,
  },
  { action: 'image', label: '图片', icon: ImagePlus },
  {
    action: 'unordered-list',
    label: '无序列表',
    icon: List,
    separatorBefore: true,
  },
  { action: 'ordered-list', label: '有序列表', icon: ListOrdered },
  { action: 'task-list', label: '任务列表', icon: ListChecks },
]

function MarkdownPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return (
      <div className="admin-markdown-preview__empty">
        <FileText aria-hidden="true" />
        <strong>还没有可预览的正文</strong>
        <span>切回“撰写”开始输入 Markdown。</span>
      </div>
    )
  }

  return (
    <div className="admin-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {source}
      </ReactMarkdown>
    </div>
  )
}

export default function MarkdownEditor({
  value,
  mode,
  onChange,
  onModeChange,
  onSave,
}: {
  value: string
  mode: MarkdownEditorMode
  onChange: (value: string) => void
  onModeChange: (mode: MarkdownEditorMode) => void
  onSave: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef({ start: 0, end: 0 })
  const [announcement, setAnnouncement] = useState('')

  const commitEdit = useCallback(
    (edit: MarkdownEdit, message: string) => {
      const scrollTop = textareaRef.current?.scrollTop ?? 0
      selectionRef.current = {
        start: edit.selectionStart,
        end: edit.selectionEnd,
      }
      onChange(edit.value)
      setAnnouncement(message)
      window.requestAnimationFrame(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.focus()
        textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd)
        textarea.scrollTop = scrollTop
      })
    },
    [onChange],
  )

  const runAction = useCallback(
    (action: MarkdownAction, label: string) => {
      const selection = selectionRef.current ?? { start: 0, end: 0 }
      const start = Math.min(selection.start, value.length)
      const end = Math.min(selection.end, value.length)
      commitEdit(
        applyMarkdownAction(value, start, end, action),
        `已应用${label}格式`,
      )
    },
    [commitEdit, value],
  )

  const handleKeyDown = (event: MarkdownKeyboardEvent) => {
    if (event.nativeEvent.isComposing) return
    const modifier = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()

    if (modifier && event.key === 'Enter') {
      event.preventDefault()
      onSave()
      return
    }

    const shortcutAction =
      key === 'b'
        ? (['bold', '粗体'] as const)
        : key === 'i'
          ? (['italic', '斜体'] as const)
          : key === 'k'
            ? (['link', '链接'] as const)
            : null
    if (modifier && shortcutAction) {
      event.preventDefault()
      runAction(shortcutAction[0], shortcutAction[1])
      return
    }

    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !modifier &&
      event.currentTarget.selectionStart === event.currentTarget.selectionEnd
    ) {
      const continuation = continueMarkdownList(
        value,
        event.currentTarget.selectionStart,
      )
      if (continuation) {
        event.preventDefault()
        commitEdit(continuation, '已继续列表')
      }
    }
  }

  const handlePaste = (event: MarkdownClipboardEvent) => {
    const textarea = event.currentTarget
    if (textarea.selectionStart === textarea.selectionEnd) return
    const pasted = event.clipboardData.getData('text/plain').trim()
    if (!/^https?:\/\/\S+$/i.test(pasted)) return
    event.preventDefault()
    commitEdit(
      createMarkdownLinkEdit(
        value,
        textarea.selectionStart,
        textarea.selectionEnd,
        pasted,
      ),
      '已把所选文字转换为链接',
    )
  }

  const lineCount = value ? value.split('\n').length : 0

  return (
    <div className="admin-form-field admin-form-field--wide admin-markdown-field">
      <div className="admin-markdown-field__label">
        <span>正文（Markdown / MDX）</span>
        <small>⌘/Ctrl + Enter 保存</small>
      </div>

      <Tabs.Root
        className="admin-markdown-editor"
        value={mode}
        onValueChange={(nextMode: string) =>
          onModeChange(nextMode as MarkdownEditorMode)
        }
      >
        <div className="admin-markdown-editor__header">
          <Tabs.List className="admin-markdown-tabs" aria-label="正文编辑视图">
            <Tabs.Trigger value="edit">撰写</Tabs.Trigger>
            <Tabs.Trigger value="preview">预览</Tabs.Trigger>
          </Tabs.List>

          {mode === 'edit' && (
            <Toolbar.Root
              className="admin-markdown-toolbar"
              aria-label="Markdown 格式工具栏"
              loop
            >
              {markdownActions.flatMap((item) => {
                const Icon = item.icon
                return [
                  item.separatorBefore ? (
                    <Toolbar.Separator
                      className="admin-markdown-toolbar__separator"
                      key={`${item.action}-separator`}
                    />
                  ) : null,
                  <Toolbar.Button
                    className="admin-markdown-toolbar__button"
                    key={item.action}
                    type="button"
                    aria-label={item.label}
                    aria-keyshortcuts={item.keyshortcuts}
                    title={`${item.label}${item.shortcut ? `（${item.shortcut}）` : ''}`}
                    onClick={() => runAction(item.action, item.label)}
                  >
                    <Icon aria-hidden="true" />
                  </Toolbar.Button>,
                ]
              })}
            </Toolbar.Root>
          )}
        </div>

        <Tabs.Content
          className="admin-markdown-editor__panel"
          value="edit"
          forceMount
          hidden={mode !== 'edit'}
        >
          <textarea
            ref={textareaRef}
            className="admin-textarea admin-source-editor admin-markdown-textarea"
            rows={24}
            value={value}
            onChange={(event) => {
              const textarea = event.target
              selectionRef.current = {
                start: textarea.selectionStart,
                end: textarea.selectionEnd,
              }
              onChange(textarea.value)
            }}
            onSelect={(event: { currentTarget: HTMLTextAreaElement }) => {
              selectionRef.current = {
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              }
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="使用 Markdown 编写正文。选中文字后可用工具栏或快捷键添加格式。"
            aria-label="正文（Markdown / MDX）"
            spellCheck
          />
        </Tabs.Content>

        <Tabs.Content
          className="admin-markdown-editor__panel admin-markdown-preview"
          value="preview"
          forceMount
          hidden={mode !== 'preview'}
        >
          <MarkdownPreview source={value} />
          <p className="admin-markdown-preview__note">
            此处按 GitHub Flavored Markdown 安全预览；MDX
            组件、数学公式和站点插件以最终发布页面为准。
          </p>
        </Tabs.Content>
      </Tabs.Root>

      <div className="admin-markdown-field__footer">
        <span>{lineCount} 行 · {value.length} 字符</span>
        <a
          href="https://docs.github.com/zh/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
          target="_blank"
          rel="noreferrer"
        >
          Markdown 帮助 <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <span className="admin-visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
