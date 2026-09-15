# Chat

A polished AI chat application inspired by Claude's interface, featuring a warm ivory and terracotta design, streaming responses, markdown rendering with syntax-highlighted code blocks, file attachments, model discovery, and persistent conversation history.

Built with **React + Vite + TypeScript + Tailwind CSS v4**, talking to any **OpenAI-compatible endpoint** (Ollama, LM Studio, OpenRouter, …) through a dev-server proxy.

## Getting started

```bash
npm install
cp .env.example .env   # adjust API_BASE / API_KEY for your endpoint
npm run dev
```

Open http://localhost:5173.

### Connecting a model

The app expects an OpenAI-compatible server. Configure it in `.env`:

| Server | API_BASE | API_KEY |
|---|---|---|
| Ollama | `http://localhost:11434` | *(empty)* |
| LM Studio | `http://localhost:1234` | *(empty)* |
| OpenRouter | `https://openrouter.ai` | your OpenRouter key |

The API key is only read by the Vite dev proxy and forwarded as an
`Authorization: Bearer` header — it never appears in the browser bundle.

With Ollama, pull a model first, e.g.:

```bash
ollama pull llama3.2
```

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
src/
├── App.tsx              # layout shell + streaming orchestration
├── index.css            # Tailwind v4 theme (Claude palette), markdown & hljs styles
├── types.ts             # Message / Conversation types
├── lib/
│   ├── api.ts           # listModels() + streamChat() for OpenAI-compatible APIs
│   └── sse.ts           # SSE stream reader
├── hooks/
│   ├── useChatStore.ts  # conversations state + localStorage persistence
│   └── useTheme.ts      # dark/light toggle
└── components/          # Sidebar, WelcomeScreen, ChatView, Message,
                         # Markdown, Composer, ModelPicker, ThemeToggle, icons
```
# chat007
