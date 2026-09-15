import { useEffect, useRef, useState } from 'react'
import {
  classifyFile,
  isWithinSizeLimit,
  readAttachment,
} from '../lib/attachments'
import type { Attachment } from '../types'
import { FileTextIcon, PaperclipIcon, SendIcon, StopIcon, XIcon } from './icons'

interface ComposerProps {
  isStreaming: boolean
  onSend: (text: string, attachments: Attachment[]) => void
  onStop: () => void
  placeholder?: string
  autoFocus?: boolean
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment
  onRemove: () => void
}) {
  if (attachment.kind === 'image' && attachment.dataUrl) {
    return (
      <div className="group/att relative">
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="h-16 w-16 rounded-lg border border-edge object-cover"
        />
        <button
          title={`Remove ${attachment.name}`}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-canvas opacity-0 transition-opacity group-hover/att:opacity-100"
          onClick={onRemove}
        >
          <XIcon width={11} height={11} />
        </button>
      </div>
    )
  }
  return (
    <div className="group/att relative flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-xs text-ink-soft">
      <FileTextIcon width={13} height={13} className="shrink-0 text-muted" />
      <span className="max-w-40 truncate">{attachment.name}</span>
      <button
        title={`Remove ${attachment.name}`}
        className="ml-0.5 rounded p-0.5 text-muted hover:text-ink"
        onClick={onRemove}
      >
        <XIcon width={11} height={11} />
      </button>
    </div>
  )
}

export function Composer({
  isStreaming,
  onSend,
  onStop,
  placeholder = 'Reply to Claude…',
  autoFocus = false,
}: ComposerProps) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-grow the textarea to fit its content
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [text])

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  async function addFiles(files: FileList | File[]) {
    const accepted: Attachment[] = []
    for (const file of Array.from(files)) {
      const kind = classifyFile(file)
      if (!kind) continue // Unsupported type (e.g. PDF, binary) — skipped
      if (!isWithinSizeLimit(file, kind)) continue
      try {
        accepted.push(await readAttachment(file, kind))
      } catch {
        // Unreadable file — skipped
      }
    }
    if (accepted.length > 0) setAttachments((prev) => [...prev, ...accepted])
  }

  function submit() {
    const trimmed = text.trim()
    if (isStreaming || (!trimmed && attachments.length === 0)) return
    onSend(trimmed, attachments)
    setText('')
    setAttachments([])
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <div
      className={`rounded-2xl border bg-canvas shadow-sm transition-colors dark:bg-bubble ${
        dragging ? 'border-accent' : 'border-edge focus-within:border-muted/60'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files.length > 0) void addFiles(e.dataTransfer.files)
      }}
    >
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((a) => (
            <AttachmentChip
              key={a.id}
              attachment={a}
              onRemove={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
            />
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        className="max-h-60 w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-muted"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />

      <div className="flex items-center justify-between px-3 pb-2.5">
        <div className="flex items-center gap-1">
          <button
            title="Attach files (images or text)"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon width={15} height={15} />
          </button>
          <span className="text-xs text-muted">
            {text ? 'Enter to send · Shift+Enter for new line' : ''}
          </span>
        </div>
        {isStreaming ? (
          <button
            title="Stop generating"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-canvas transition-opacity hover:opacity-80"
            onClick={onStop}
          >
            <StopIcon width={14} height={14} />
          </button>
        ) : (
          <button
            title="Send"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              text.trim() || attachments.length > 0
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-surface text-muted'
            }`}
            onClick={submit}
            disabled={!text.trim() && attachments.length === 0}
          >
            <SendIcon width={15} height={15} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.md,.json,.csv,.tsv,.xml,.yaml,.yml,.toml,.ini,.log,.js,.ts,.tsx,.jsx,.py,.java,.c,.h,.cpp,.cs,.go,.rs,.rb,.php,.sh,.bat,.ps1,.sql,.css,.scss,.html,.htm,.astro,.vue,.svelte,.kt,.swift,.r,.m"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void addFiles(e.target.files)
          }
          e.target.value = '' // Allow re-selecting the same file
        }}
      />
    </div>
  )
}
