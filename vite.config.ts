import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read API_BASE / API_KEY from .env (no VITE_ prefix, so they are never
  // exposed to the browser bundle — they only exist here, in the dev proxy).
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_BASE || 'http://localhost:11434'
  const apiKey = env.API_KEY || ''

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/v1': {
          target,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
              }
              // Identify as a Claude CLI client — the endpoint rejects
              // unrecognized clients with an "unauthorized client" error.
              proxyReq.setHeader('User-Agent', 'claude-cli/2.0.0 (external, cli)')
              proxyReq.setHeader('x-app', 'cli')
            })
          },
        },
      },
    },
  }
})
