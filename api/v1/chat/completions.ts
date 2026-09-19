import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Production counterpart of the `/v1` proxy in vite.config.ts.
 * Reached through the rewrite in vercel.json:
 *   /v1/chat/completions  ->  /api/v1/chat/completions
 *
 * This endpoint streams SSE, so the upstream body is piped through chunk by
 * chunk. Buffering it (e.g. `await upstream.text()`) would defeat
 * token-by-token rendering in the client.
 *
 * Header logic is intentionally duplicated from `models.ts` — see the note there.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const base = process.env.API_BASE?.replace(/\/+$/, '')
  if (!base) {
    res.status(500).json({
      error:
        'API_BASE is not set. Add it to the Vercel project environment variables ' +
        '(Settings -> Environment Variables) and redeploy.',
    })
    return
  }
  const key = process.env.API_KEY

  // Stop the upstream generation if the browser goes away (Stop button, reload,
  // tab close). Listen on `res`, not `req`: an IncomingMessage emits 'close' as
  // soon as its body has been consumed, which is before we finish streaming.
  const controller = new AbortController()
  res.on('close', () => controller.abort())

  try {
    const upstream = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        // Identify as a Claude CLI client — the endpoint rejects unrecognized
        // clients with an "unauthorized client" error. Mirrors vite.config.ts.
        'User-Agent': 'claude-cli/2.0.0 (external, cli)',
        'x-app': 'cli',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      // Vercel's Node runtime has already parsed a JSON body into req.body.
      // Re-serializing is a little wasteful for large image attachments, but it
      // keeps the proxy independent of how the platform consumed the stream.
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}),
      signal: controller.signal,
    })

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '')
      res.status(upstream.status || 502).send(detail || 'Upstream returned no body')
      return
    }

    res.status(upstream.status)
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'text/event-stream',
    )
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    // Tell any intermediary not to buffer the stream (nginx-style proxies).
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const reader = upstream.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
    res.end()
  } catch (err) {
    if (controller.signal.aborted) {
      // Client disconnected mid-stream — partial output was already flushed.
      res.end()
      return
    }
    if (!res.headersSent) {
      res.status(502).json({
        error: `Proxy could not reach API_BASE (${base}): ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      })
    } else {
      res.end()
    }
  }
}
