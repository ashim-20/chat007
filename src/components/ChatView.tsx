import { useEffect, useRef } from 'react'
import type { Conversation } from '../types'
import { Message, TypingIndicator } from './Message'
import { RefreshIcon, SparkIcon } from './icons'

interface ChatViewProps {
  conversation: Conversation
  isStreaming: boolean
  streamingMessageId: string | null
  onRegenerate: () => void
}

export function ChatView({
  conversation,
  isStreaming,
  streamingMessageId,
  onRegenerate,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  // Keep pinned to the bottom while streaming / on new messages,
  // unless the user has scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [conversation.messages, isStreaming])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const messages = conversation.messages
  const lastMessage = messages[messages.length - 1]
  const lastIsAssistant = lastMessage?.role === 'assistant'
  const awaitingFirstToken =
    isStreaming &&
    lastIsAssistant &&
    !lastMessage.content &&
    !lastMessage.reasoning &&
    !lastMessage.error
  const canRegenerate = !isStreaming && lastIsAssistant

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.map((m) => (
            <Message
              key={m.id}
              message={m}
              isStreamingMessage={isStreaming && m.id === streamingMessageId}
            />
          ))}
          {awaitingFirstToken && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge bg-surface text-accent">
                <SparkIcon width={13} height={13} />
              </div>
              <TypingIndicator />
            </div>
          )}
          {canRegenerate && (
            <div className="flex">
              <button
                className="flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface hover:text-ink"
                onClick={onRegenerate}
              >
                <RefreshIcon width={13} height={13} />
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
