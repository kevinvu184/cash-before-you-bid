import { useState } from 'react'
import { formatNumberInput, parseLocaleNumber } from '../logic/format'

// An empty or unparseable field means "no figure" rather than zero; the
// calculator treats a non-finite input as zero, exactly like the original's
// `+value || 0`.
const parseDraft = (raw: string, locale: string): number =>
  parseLocaleNumber(raw, locale) ?? Number.NaN

export interface NumericDraft {
  draft: string
  onDraftChange: (raw: string) => void
}

/**
 * Keeps the raw keystrokes a number field is holding, so a half-typed figure
 * survives a round trip through state: `6.` would otherwise come back as `6`
 * and eat the decimal point before `6.2` could be finished. Values are typed
 * and shown with the locale's decimal separator (vi: `6,2`) and parsed
 * leniently by parseLocaleNumber; state always stores a plain dot-decimal
 * number.
 *
 * When the calculator rewrites a value we just sent — the deposit route
 * minimums do this — the field follows it, which is how the original page
 * behaved when it wrote the clamped deposit back into the input. A locale
 * switch reformats the draft the same way.
 */
export function useNumericDraft(
  value: number,
  onChange: (next: number) => void,
  locale: string,
): NumericDraft {
  const [draft, setDraft] = useState(() => formatNumberInput(value, locale))
  const [sent, setSent] = useState(value)
  const [lastLocale, setLastLocale] = useState(locale)

  if (locale !== lastLocale) {
    setLastLocale(locale)
    setDraft(formatNumberInput(value, locale))
    setSent(value)
  } else if (!Object.is(value, sent)) {
    setSent(value)
    if (!Object.is(parseDraft(draft, locale), value)) setDraft(formatNumberInput(value, locale))
  }

  const onDraftChange = (raw: string) => {
    setDraft(raw)
    const next = parseDraft(raw, locale)
    setSent(next)
    onChange(next)
  }

  return { draft, onDraftChange }
}
