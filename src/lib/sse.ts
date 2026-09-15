/**
 * Reads a Server-Sent Events stream from a fetch Response body and emits
 * each event's `data:` payload. Handles chunk boundaries by buffering.
 */
export async function readSSE(
  response: Response,
  onEvent: (data: string) => void,
): Promise<void> {
  if (!response.body) throw new Error('Response has no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines; keep the trailing partial line in the buffer
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data:')) {
          onEvent(trimmed.slice(5).trim())
        }
        // Lines starting with ":" are keep-alive comments — ignored
      }
    }
    // Flush any remaining buffered line
    const trimmed = buffer.trim()
    if (trimmed.startsWith('data:')) {
      onEvent(trimmed.slice(5).trim())
    }
  } finally {
    reader.releaseLock()
  }
}
