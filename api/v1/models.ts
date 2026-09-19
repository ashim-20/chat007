import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Production counterpart of the `/v1` proxy in vite.config.ts.
 *
 * Vercel serves files in `api/` at `/api/*`, so this function lives at
 * `/api/v1/models` and is reached through the rewrite in vercel.json:
 *   /v1/models  ->  /api/v1/models
 *
 * The upstream header logic is intentionally duplicated in
 * `chat/completions.ts` rather than shared from a helper module: keeping each
 * function self-contained means nothing outside `api/` has to be bundled, and
 * avoids relying on Vercel's handling of underscore-prefixed modules or on
 * ESM import-extension resolution. Keep the two in sync.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
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

  try {
    const upstream = await fetch(`${base}/v1/models`, {
      headers: {
        Accept: 'application/json',
        // Identify as a Claude CLI client — the endpoint rejects unrecognized
        // clients with an "unauthorized client" error. Mirrors vite.config.ts.
        'User-Agent': 'claude-cli/2.0.0 (external, cli)',
        'x-app': 'cli',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
    })

    const body = await upstream.text()
    res.status(upstream.status)
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/json',
    )
    res.send(body)
  } catch (err) {
    res.status(502).json({
      error: `Proxy could not reach API_BASE (${base}): ${
        err instanceof Error ? err.message : 'unknown error'
      }`,
    })
  }
}
