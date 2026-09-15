import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatView } from './components/ChatView'
import { Composer } from './components/Composer'
import { ModelPicker } from './components/ModelPicker'
import { Sidebar } from './components/Sidebar'
import { ThemeToggle } from './components/ThemeToggle'
import { WelcomeScreen } from './components/WelcomeScreen'
import { uid, useChatStore } from './hooks/useChatStore'
import { useTheme } from './hooks/useTheme'
import { streamChat } from './lib/api'
import { toApiContent } from './lib/attachments'
import type {
  Attachment,
  ChatCompletionMessage,
  Conversation,
  Message,
} from './types'

const MODEL_KEY = 'chat.model'
const DEFAULT_MODEL = 'glm-5.3'

function loadModel(): string {
  return localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL
}

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const {
    conversations,
    activeId,
    active,
    setActiveId,
    updateConversation,
    createConversation,
    deleteConversation,
    renameConversation,
  } = useChatStore()

  const [model, setModel] = useState<string>(loadModel)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    localStorage.setItem(MODEL_KEY, model)
  }, [model])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /**
   * Runs a completion for the given conversation, using the message history
   * *including* `history` (caller passes the up-to-date message list).
   * Streams the reply into a new assistant message.
   */
  const runCompletion = useCallback(
    async (convId: string, history: Message[]) => {
      const assistantMessage: Message = {
        id: uid(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      }

      updateConversation(convId, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: [...c.messages, assistantMessage],
      }))

      const payload: ChatCompletionMessage[] = history
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: toApiContent(m) }))

      const controller = new AbortController()
      abortRef.current = controller
      setIsStreaming(true)
      setStreamingMessageId(assistantMessage.id)

      let received = ''
      let reasoning = ''
      const appendDelta = (delta: string) => {
        received += delta
        updateConversation(convId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map((m) =>
            m.id === assistantMessage.id ? { ...m, content: received } : m,
          ),
        }))
      }
      const appendReasoning = (delta: string) => {
        reasoning += delta
        updateConversation(convId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map((m) =>
            m.id === assistantMessage.id ? { ...m, reasoning } : m,
          ),
        }))
      }

      try {
        await streamChat({
          model,
          messages: payload,
          onDelta: appendDelta,
          onReasoning: appendReasoning,
          signal: controller.signal,
        })
      } catch (err) {
        const aborted =
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError')
        if (!aborted) {
          const detail =
            err instanceof TypeError
              ? 'Could not reach the model server. Is it running, and does API_BASE in .env point to it?'
              : err instanceof Error
                ? err.message
                : 'Something went wrong.'
          updateConversation(convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMessage.id
                ? {
                    ...m,
                    error: true,
                    content: `⚠️ ${detail}`,
                  }
                : m,
            ),
          }))
        }
        // If aborted mid-stream, keep whatever partial content arrived
      } finally {
        abortRef.current = null
        setIsStreaming(false)
        setStreamingMessageId(null)
      }
    },
    [model, updateConversation],
  )

  const handleSend = useCallback(
    async (text: string, attachments: Attachment[] = []) => {
      if (isStreaming) return

      let conv: Conversation | null = active
      if (!conv) {
        conv = createConversation()
        setActiveId(conv.id)
      }

      const userMessage: Message = {
        id: uid(),
        role: 'user',
        content: text,
        createdAt: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
      }

      const history = [...conv.messages, userMessage]
      const convId = conv.id

      // Auto-title from the first message (or its first attachment)
      const rawTitle = text.trim() || attachments[0]?.name || 'New chat'
      const title = rawTitle.length > 42 ? `${rawTitle.slice(0, 42)}…` : rawTitle

      updateConversation(convId, (c) => ({
        ...c,
        title: c.messages.length === 0 ? title : c.title,
        updatedAt: Date.now(),
        messages: [...c.messages, userMessage],
      }))

      await runCompletion(convId, history)
    },
    [active, createConversation, isStreaming, runCompletion, setActiveId, updateConversation],
  )

  const handleRegenerate = useCallback(async () => {
    if (!active || isStreaming) return
    const messages = active.messages
    // Drop trailing assistant messages, re-run from the last user message
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user')
    if (lastUserIndex === -1) return
    const history = messages.slice(0, lastUserIndex + 1)

    updateConversation(active.id, (c) => ({
      ...c,
      messages: history,
    }))

    await runCompletion(active.id, history)
  }, [active, isStreaming, runCompletion, updateConversation])

  const handleNewChat = useCallback(() => {
    stop()
    setActiveId(null)
  }, [setActiveId, stop])

  const handleDelete = useCallback(
    (id: string) => {
      if (id === activeId) stop()
      deleteConversation(id)
    },
    [activeId, deleteConversation, stop],
  )

  return (
    <div className="flex h-full overflow-hidden bg-canvas font-sans text-ink">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onNewChat={handleNewChat}
        onSelect={setActiveId}
        onRename={renameConversation}
        onDelete={handleDelete}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-13 shrink-0 items-center justify-between border-b border-edge px-4 py-2.5">
          <h2 className="truncate text-sm font-medium text-muted">
            {active ? active.title : 'New chat'}
          </h2>
          <div className="flex items-center gap-1">
            <ModelPicker model={model} onChange={setModel} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {active && active.messages.length > 0 ? (
          <>
            <ChatView
              conversation={active}
              isStreaming={isStreaming}
              streamingMessageId={streamingMessageId}
              onRegenerate={handleRegenerate}
            />
            <div className="shrink-0 px-4 pb-4 pt-2">
              <div className="mx-auto w-full max-w-3xl">
                <Composer isStreaming={isStreaming} onSend={handleSend} onStop={stop} />
              </div>
            </div>
          </>
        ) : (
          <WelcomeScreen isStreaming={isStreaming} onSend={handleSend} onStop={stop} />
        )}
      </div>
    </div>
  )
}
