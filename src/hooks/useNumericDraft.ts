import { useState } from 'react'

const toDraft = (value: number): string => (Number.isFinite(value) ? String(value) : '')

// An empty field means "no figure" rather than zero; the calculator treats a
// non-finite input as zero, exactly like the original's `+value || 0`.
const parseDraft = (raw: string): number => (raw.trim() === '' ? Number.NaN : Number(raw))

export interface NumericDraft {
  draft: string
  onDraftChange: (raw: string) => void
}

/**
 * Keeps the raw keystrokes a number field is holding, so a half-typed figure
 * survives a round trip through state: `6.` would otherwise come back as `6`
 * and eat the decimal point before `6.2` could be finished.
 *
 * When the calculator rewrites a value we just sent — the deposit route
 * minimums do this — the field follows it, which is how the original page
 * behaved when it wrote the clamped deposit back into the input.
 */
export function useNumericDraft(value: number, onChange: (next: number) => void): NumericDraft {
  const [draft, setDraft] = useState(() => toDraft(value))
  const [sent, setSent] = useState(value)

  if (!Object.is(value, sent)) {
    setSent(value)
    if (!Object.is(parseDraft(draft), value)) setDraft(toDraft(value))
  }

  const onDraftChange = (raw: string) => {
    setDraft(raw)
    const next = parseDraft(raw)
    setSent(next)
    onChange(next)
  }

  return { draft, onDraftChange }
}
