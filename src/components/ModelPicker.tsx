import { useEffect, useRef, useState } from 'react'
import { FALLBACK_MODELS, listModels } from '../lib/api'
import { CheckIcon, ChevronDownIcon } from './icons'

interface ModelPickerProps {
  model: string
  onChange: (model: string) => void
}

export function ModelPicker({ model, onChange }: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Fetch model list the first time the dropdown opens
  useEffect(() => {
    if (!open || models.length > 0 || loading) return
    setLoading(true)
    listModels()
      .then(setModels)
      .catch(() => setModels(FALLBACK_MODELS))
      .finally(() => setLoading(false))
  }, [open, models.length, loading])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const options = models.length > 0 ? models : FALLBACK_MODELS

  return (
    <div ref={rootRef} className="relative">
      <button
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
        onClick={() => setOpen((o) => !o)}
        title="Choose model"
      >
        <span className="max-w-44 truncate font-medium">{model}</span>
        <ChevronDownIcon width={14} height={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-xl border border-edge bg-canvas py-1 shadow-lg">
          {loading && models.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">Loading models…</p>
          )}
          {options.map((m) => (
            <button
              key={m}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-surface hover:text-ink"
              onClick={() => {
                onChange(m)
                setOpen(false)
              }}
            >
              <span className="truncate">{m}</span>
              {m === model && <CheckIcon width={14} height={14} className="shrink-0 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
