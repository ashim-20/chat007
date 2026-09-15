import type { Attachment, ChatCompletionContent, Message } from '../types'

const IMAGE_MAX = 5 * 1024 * 1024 // 5 MB
const TEXT_MAX = 200 * 1024 // 200 KB

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'xml', 'yaml', 'yml', 'toml',
  'ini', 'log', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'h', 'cpp', 'cs',
  'go', 'rs', 'rb', 'php', 'sh', 'bat', 'ps1', 'sql', 'css', 'scss', 'html',
  'htm', 'astro', 'vue', 'svelte', 'kt', 'swift', 'r', 'm',
])

export function classifyFile(file: File): Attachment['kind'] | null {
  if (file.type.startsWith('image/')) return 'image'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (file.type.startsWith('text/') || TEXT_EXTENSIONS.has(ext) || file.type === 'application/json') {
    return 'text'
  }
  return null
}

export function isWithinSizeLimit(file: File, kind: Attachment['kind']): boolean {
  return kind === 'image' ? file.size <= IMAGE_MAX : file.size <= TEXT_MAX
}

export function readAttachment(file: File, kind: Attachment['kind']): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.onload = () => {
      const result = reader.result as string
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        kind,
        dataUrl: kind === 'image' ? result : undefined,
        text: kind === 'text' ? result : undefined,
      })
    }
    if (kind === 'image') {
      reader.readAsDataURL(file)
    } else {
      reader.readAsText(file)
    }
  })
}

/**
 * Builds the API message content for a stored message: images become
 * image_url parts (OpenAI vision format); text files are appended to the
 * prompt text inside delimited sections.
 */
export function toApiContent(message: Message): ChatCompletionContent {
  const attachments = message.attachments ?? []
  const images = attachments.filter(
    (a): a is Attachment & { dataUrl: string } => a.kind === 'image' && !!a.dataUrl,
  )
  const textFiles = attachments.filter(
    (a): a is Attachment & { text: string } => a.kind === 'text' && !!a.text,
  )

  if (images.length === 0 && textFiles.length === 0) return message.content

  let text = message.content
  for (const file of textFiles) {
    text += `\n\n--- Start of attached file: ${file.name} ---\n${file.text}\n--- End of ${file.name} ---`
  }

  if (images.length === 0) return text
  return [
    { type: 'text' as const, text },
    ...images.map((a) => ({
      type: 'image_url' as const,
      image_url: { url: a.dataUrl },
    })),
  ]
}
