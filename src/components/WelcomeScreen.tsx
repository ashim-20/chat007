import { Composer } from './Composer'

interface WelcomeScreenProps {
  isStreaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Up late?'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const SUGGESTIONS = [
  'Write a Python function that checks if a string is a palindrome',
  'Explain how HTTP status codes work, with a table',
  'Draft a friendly follow-up email after a job interview',
  'Brainstorm names for a coffee subscription app',
]

export function WelcomeScreen({ isStreaming, onSend, onStop }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
      <h1 className="mb-8 font-serif text-4xl text-ink">{greeting()}</h1>
      <div className="w-full max-w-2xl">
        <Composer isStreaming={isStreaming} onSend={onSend} onStop={onStop} autoFocus />
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="rounded-full border border-edge px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-muted hover:text-ink"
              onClick={() => onSend(s)}
              disabled={isStreaming}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
