# Chat

A polished AI chat application inspired by Claude's interface, featuring a warm ivory and terracotta design, streaming responses, markdown rendering with syntax-highlighted code blocks, file attachments, model discovery, and persistent conversation history.

Built with **React + Vite + TypeScript + Tailwind CSS v4**, talking to an **OpenAI-compatible endpoint** through a server-side proxy.

## Getting started

```bash
npm install
cp .env.example .env   # PowerShell: Copy-Item .env.example .env
npm run dev
```

Then set `API_BASE` and `API_KEY` in `.env` before starting (see below). Open
http://localhost:5173.

### Connecting a model

The app talks to exactly one OpenAI-compatible endpoint, configured in `.env`:

| Variable | Meaning |
|---|---|
| `API_BASE` | Base URL of your endpoint, **without** the trailing `/v1` |
| `API_KEY` | Sent as `Authorization: Bearer <key>`; may be empty if your endpoint needs no auth |

The proxies append `/v1/models` and `/v1/chat/completions` to `API_BASE`, so

```
API_BASE=https://your-endpoint.example
```

produces requests to `https://your-endpoint.example/v1/chat/completions`.

`API_BASE` is **required** — there is no fallback. If it is missing, `npm run dev`
refuses to start and the deployed functions return a `500` naming the variable,
rather than silently aiming at an upstream that does not exist.

The API key is only read by the server-side proxy (Vite dev server locally, the
`api/` functions in production) and forwarded as an `Authorization: Bearer`
header — it never appears in the browser bundle.

## Deploying to Vercel

The client always calls **relative** paths (`/v1/models`, `/v1/chat/completions`),
so something server-side has to serve them. There are two implementations of that
proxy:

| Environment | Proxy |
|---|---|
| `npm run dev` | `vite.config.ts` → `server.proxy['/v1']` |
| Vercel | `api/v1/models.ts` + `api/v1/chat/completions.ts`, routed by `rewrites` in `vercel.json` |

Vercel serves files in `api/` at `/api/*`, which is why `vercel.json` rewrites
`/v1/models` → `/api/v1/models` and `/v1/chat/completions` → `/api/v1/chat/completions`.

**You must set the environment variables in Vercel.** `.env` is gitignored and is
not part of the deployment, so the deployed proxy has no upstream until you add
them: **Settings → Environment Variables** → `API_BASE` and `API_KEY`. Do not add a
`VITE_` prefix — that would inline the key into the client bundle. Without
`API_BASE` the functions return a `500` naming the variable; if `API_BASE` is set
but unreachable they return a `502` naming the URL they tried.

Two things to know about the deployed proxy:

- **It is publicly reachable.** Anyone with the URL can send prompts through your
  deployment, spending your API key's quota. Vercel's **Deployment Protection**
  (Settings → Deployment Protection) is the simplest guard; anything more granular
  means adding real auth.
- **`API_BASE` must be reachable from the internet.** A serverless function cannot
  reach a service bound to your own machine, so an endpoint on `localhost` or your
  LAN will not work in production.

## Features

- 💬 Streaming replies (SSE) with typing indicator, blinking caret, and a stop button
- 🧠 Reasoning-model support — chain-of-thought streams into a collapsible "Thinking…" section
- 📎 File attachments — drag & drop or paperclip: images are sent as vision inputs (if the model supports them), text/code files are inlined into the prompt
- 📝 Markdown rendering: headings, lists, tables, and code blocks with language label + copy button
- 🗂 Sidebar with conversation history grouped by date, inline rename, delete — persisted to localStorage
- 🎨 Light/dark theme (persisted), Claude-style warm palette
- 🤖 Model picker that discovers models from the endpoint's `/v1/models` (with fallback list)
- 🔁 Regenerate last response, copy messages

## Project structure

```
vercel.json              # rewrites /v1/* to the api/ functions, pins the build output
api/
└── v1/                  # Vercel proxy — production counterpart of the dev proxy
    ├── models.ts        #   GET  /v1/models
    └── chat/completions.ts  # POST /v1/chat/completions (SSE, streamed through)

src/
├── App.tsx              # layout shell + streaming orchestration
├── index.css            # Tailwind v4 theme (Claude palette), markdown & hljs styles
├── types.ts             # Message / Conversation types
├── lib/
│   ├── api.ts           # listModels() + streamChat() for OpenAI-compatible APIs
│   ├── sse.ts           # SSE stream reader
│   └── attachments.ts   # file classification, size limits, Message -> API content
├── hooks/
│   ├── useChatStore.ts  # conversations state + localStorage persistence
│   └── useTheme.ts      # dark/light toggle
└── components/          # Sidebar, WelcomeScreen, ChatView, Message,
                         # Markdown, Composer, ModelPicker, ThemeToggle, icons
```

