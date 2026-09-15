import { useEffect, useRef, useState } from 'react'
import type { Conversation } from '../types'
import {
  ChatIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from './icons'

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  collapsed: boolean
  onToggleCollapse: () => void
  onNewChat: () => void
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

function timeGroup(ts: number): string {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = 86_400_000
  if (ts >= startOfDay) return 'Today'
  if (ts >= startOfDay - day) return 'Yesterday'
  if (ts >= startOfDay - 7 * day) return 'Previous 7 days'
  if (ts >= startOfDay - 30 * day) return 'Previous 30 days'
  return 'Older'
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older']

interface ItemProps {
  conversation: Conversation
  active: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}

function ConversationItem({ conversation, active, onSelect, onRename, onDelete }: ItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(conversation.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== conversation.title) {
      onRename(draft)
    } else {
      setDraft(conversation.title)
    }
  }

  return (
    <div
      className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-colors ${
        active
          ? 'bg-surface-hover text-ink'
          : 'text-ink-soft hover:bg-surface-hover/60'
      }`}
      onClick={() => !editing && onSelect()}
    >
      <ChatIcon className="shrink-0 text-muted" width={14} height={14} />
      {editing ? (
        <input
          ref={inputRef}
          className="min-w-0 flex-1 rounded border border-edge bg-canvas px-1 py-0.5 text-sm text-ink outline-none focus:border-accent"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(conversation.title)
              setEditing(false)
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
      )}
      {!editing && (
        <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            title="Rename"
            className="rounded p-1 text-muted hover:bg-canvas hover:text-ink"
            onClick={(e) => {
              e.stopPropagation()
              setDraft(conversation.title)
              setEditing(true)
            }}
          >
            <PencilIcon width={13} height={13} />
          </button>
          <button
            title="Delete"
            className="rounded p-1 text-muted hover:bg-canvas hover:text-ink"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <TrashIcon width={13} height={13} />
          </button>
        </span>
      )}
    </div>
  )
}

export function Sidebar({
  conversations,
  activeId,
  collapsed,
  onToggleCollapse,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}: SidebarProps) {
  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-edge bg-surface py-3">
        <button
          title="Expand sidebar"
          className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-ink"
          onClick={onToggleCollapse}
        >
          <PanelLeftIcon />
        </button>
        <button
          title="New chat"
          className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-ink"
          onClick={onNewChat}
        >
          <PlusIcon />
        </button>
      </div>
    )
  }

  // Group conversations by recency (newest first within and across groups)
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
  const groups = new Map<string, Conversation[]>()
  for (const conv of sorted) {
    const label = timeGroup(conv.updatedAt)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(conv)
  }

  return (
    <div className="flex w-[260px] shrink-0 flex-col border-r border-edge bg-surface">
      <div className="flex items-center justify-between px-3 py-3">
        <button
          title="Collapse sidebar"
          className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-ink"
          onClick={onToggleCollapse}
        >
          <PanelLeftIcon />
        </button>
      </div>

      <div className="px-3">
        <button
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
          onClick={onNewChat}
        >
          <PlusIcon />
          New chat
        </button>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
        {conversations.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-muted">No conversations yet</p>
        )}
        {GROUP_ORDER.filter((label) => groups.has(label)).map((label) => (
          <div key={label} className="mb-3">
            <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted">{label}</p>
            <div className="flex flex-col gap-0.5">
              {groups.get(label)!.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  active={conv.id === activeId}
                  onSelect={() => onSelect(conv.id)}
                  onRename={(title) => onRename(conv.id, title)}
                  onDelete={() => onDelete(conv.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )
}
