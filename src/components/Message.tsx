import { useEffect, useState } from 'react'
import type { Message as MessageType } from '../types'
import { Markdown } from './Markdown'
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
  SparkIcon,
} from './icons'

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2 pl-1">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
    </div>
  )
}

interface ReasoningProps {
  text: string
  /** Still streaming with no answer yet — show as active "Thinking…" */
  active: boolean
}

function Reasoning({ text, active }: ReasoningProps) {
  const [open, setOpen] = useState(false)

  // Auto-expand while the model is actively thinking, collapse when done
  useEffect(() => {
    setOpen(active)
  }, [active])

  return (
    <div className="mb-2">
      <button
        className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink"
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDownIcon
          width={12}
          height={12}
          className={`shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        {active ? 'Thinking…' : 'Thought process'}
      </button>
      {open && (
        <div className="mt-1.5 whitespace-pre-wrap border-l-2 border-edge pl-3 text-[13px] italic leading-relaxed text-muted">
          {text}
        </div>
      )}
    </div>
  )
}

interface MessageProps {
  message: MessageType
  /** This message is the one currently streaming in */
  isStreamingMessage?: boolean
}

export function Message({ message, isStreamingMessage = false }: MessageProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable — no-op
    }
  }

  if (message.role === 'user') {
    const attachments = message.attachments ?? []
    return (
      <div className="group flex flex-col items-end">
        {attachments.length > 0 && (
          <div className="mb-1.5 flex max-w-[80%] flex-wrap justify-end gap-2">
            {attachments.map((a) =>
              a.kind === 'image' && a.dataUrl ? (
                <img
                  key={a.id}
                  src={a.dataUrl}
                  alt={a.name}
                  className="h-24 w-24 rounded-xl border border-edge object-cover"
                />
              ) : (
                <span
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-lg border border-edge bg-bubble px-2.5 py-1.5 text-xs text-ink-soft"
                >
                  <FileTextIcon width={13} height={13} className="shrink-0 text-muted" />
                  <span className="max-w-44 truncate">{a.name}</span>
                </span>
              ),
            )}
          </div>
        )}
        {message.content && (
          <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-bubble px-4 py-2.5 text-[15px] leading-relaxed text-ink">
            {message.content}
          </div>
        )}
      </div>
    )
  }

  const thinking = isStreamingMessage && !message.content && !!message.reasoning
  const showCaret = isStreamingMessage && !!message.content

  return (
    <div className="group flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge bg-surface text-accent">
        <SparkIcon width={13} height={13} />
      </div>
      <div className="min-w-0 flex-1">
        {message.error ? (
          <div className="rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-ink-soft">
            {message.content}
          </div>
        ) : (
          <>
            {message.reasoning && (
              <Reasoning text={message.reasoning} active={thinking} />
            )}
            <Markdown content={message.content} />
            {showCaret && <span className="streaming-caret" />}
          </>
        )}
        {!showCaret && !message.error && message.content && (
          <div className="mt-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-ink"
              onClick={copy}
              title="Copy message"
            >
              {copied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
