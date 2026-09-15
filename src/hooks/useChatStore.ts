import { useEffect, useRef, useState } from 'react'
import type { Conversation } from '../types'

const STORAGE_KEY = 'chat.conversations'

export function uid(): string {
  return crypto.randomUUID()
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Conversation[]
  } catch {
    return []
  }
}

export function useChatStore() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch {
      // Quota exceeded (e.g. large image data URLs) — retry without
      // the heavy attachment payloads so history isn't lost entirely
      try {
        const light = conversations.map((c) => ({
          ...c,
          messages: c.messages.map((m) => ({
            ...m,
            attachments: m.attachments?.map((a) => ({
              ...a,
              dataUrl: undefined,
              text: undefined,
            })),
          })),
        }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(light))
      } catch {
        // Storage unavailable — drop silently
      }
    }
  }, [conversations])

  // Mirror of the latest state, so async callbacks can read fresh data
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations

  const active =
    conversations.find((c) => c.id === activeId) ?? null

  function getConversation(id: string): Conversation | null {
    return conversationsRef.current.find((c) => c.id === id) ?? null
  }

  function updateConversation(id: string, updater: (c: Conversation) => Conversation) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? updater(c) : c)),
    )
  }

  function createConversation(): Conversation {
    const conv: Conversation = {
      id: uid(),
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations((prev) => [conv, ...prev])
    return conv
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function renameConversation(id: string, title: string) {
    updateConversation(id, (c) => ({ ...c, title: title.trim() || c.title }))
  }

  return {
    conversations,
    activeId,
    active,
    setActiveId,
    getConversation,
    updateConversation,
    createConversation,
    deleteConversation,
    renameConversation,
  }
}
