import { useState } from 'react'

const toDraft = (value: number): string => (Number.isFinite(value) ? String(value) : '')

// A cleared field reads as 0, mirroring the original page's `+value || 0`. It
// has to be a real number rather than NaN because the query string is the
// persistence layer, and `?price=NaN` would not survive a round trip.
const parseDraft = (raw: string): number => {
  const parsed = Number(raw)
  return raw.trim() === '' || !Number.isFinite(parsed) ? 0 : parsed
}

export interface NumericDraft {
  draft: string
  onDraftChange: (raw: string) => void
}

/**
 * Keeps the raw keystrokes a number field is holding, so a half-typed figure
 * survives a round trip through state: `6.` would otherwise come back as `6`
 * and eat the decimal point before `6.2` could be finished. An emptied field
 * stays empty rather than showing the `0` it counts as.
 *
 * The draft only stands while it still means `value`. Once the calculator
 * reports something else — the deposit route minimums rewrite the deposit, and
 * the back button rewrites everything — `value` wins, which is how the original
 * page behaved when it wrote a clamped figure back into the input.
 */
export function useNumericDraft(value: number, onChange: (next: number) => void): NumericDraft {
  const [draft, setDraft] = useState(() => toDraft(value))

  const onDraftChange = (raw: string) => {
    setDraft(raw)
    onChange(parseDraft(raw))
  }

  return { draft: parseDraft(draft) === value ? draft : toDraft(value), onDraftChange }
}
