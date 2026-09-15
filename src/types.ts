export type Role = 'user' | 'assistant' | 'system'

export interface Attachment {
  id: string
  name: string
  mime: string
  size: number
  kind: 'image' | 'text'
  /** Data URL for images */
  dataUrl?: string
  /** Decoded text content for text files */
  text?: string
}

export interface Message {
  id: string
  role: Role
  content: string
  createdAt: number
  attachments?: Attachment[]
  /** Chain-of-thought tokens from reasoning models, shown collapsed */
  reasoning?: string
  /** Marks a failed generation so it renders as an error bubble */
  error?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

/** Shape sent to the OpenAI-compatible /v1/chat/completions endpoint.
 *  Content is either plain text or multimodal parts (text + image_url). */
export type ChatCompletionContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >

export interface ChatCompletionMessage {
  role: Role
  content: ChatCompletionContent
}
