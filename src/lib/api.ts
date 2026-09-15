import type { ChatCompletionMessage } from '../types'
import { readSSE } from './sse'

/** Used when the endpoint's /v1/models can't be reached */
export const FALLBACK_MODELS = [
  'glm-5.3',
  'deepseek-v4-flash',
  'claude-opus-5',
  'claude-opus-4-8',
  'gpt-5.6-sol',
  'gpt-6-astra',
]

/** Fetch the list of available model ids from /v1/models */
export async function listModels(): Promise<string[]> {
  const res = await fetch('/v1/models')
  if (!res.ok) {
    throw new Error(`Failed to list models (HTTP ${res.status})`)
  }
  const json = (await res.json()) as { data?: Array<{ id?: string }> }
  const models = (json.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id))
  if (models.length === 0) throw new Error('No models returned')
  return models
}

export interface StreamChatOptions {
  messages: ChatCompletionMessage[]
  model: string
  onDelta: (delta: string) => void
  /** Receives the model's chain-of-thought tokens (reasoning models only) */
  onReasoning?: (delta: string) => void
  signal: AbortSignal
}

/**
 * Streams a chat completion from the OpenAI-compatible endpoint.
 * Calls onDelta for each token chunk; resolves when the stream ends.
 * Reasoning-model "reasoning_content" chunks are routed to onReasoning.
 */
export async function streamChat({
  messages,
  model,
  onDelta,
  onReasoning,
  signal,
}: StreamChatOptions): Promise<void> {
  const res = await fetch('/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `The server responded with HTTP ${res.status}. ${text.slice(0, 300)}`,
    )
  }

  await readSSE(res, (data) => {
    if (data === '[DONE]') return
    try {
      const json = JSON.parse(data) as {
        choices?: Array<{
          delta?: { content?: string; reasoning_content?: string }
        }>
      }
      const delta = json.choices?.[0]?.delta
      if (delta?.reasoning_content) onReasoning?.(delta.reasoning_content)
      if (delta?.content) onDelta(delta.content)
    } catch {
      // Malformed or keep-alive chunk — skip it
    }
  })
}
