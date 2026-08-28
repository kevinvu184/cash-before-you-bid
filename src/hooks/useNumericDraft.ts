import { useState } from 'react'
import { formatNumberInput, parseLocaleNumber } from '../logic/format'

// A cleared or unparseable field reads as 0, mirroring the original page's
// `+value || 0`. It has to be a real number rather than NaN because the query
// string is the persistence layer, and `?price=NaN` would not survive a round
// trip. Parsing is locale-lenient — a vi user types `1.234,5`.
const parseDraft = (raw: string, locale: string): number => parseLocaleNumber(raw, locale) ?? 0

export interface NumericDraft {
  draft: string
  onDraftChange: (raw: string) => void
}

const formatOrEmpty = (value: number | null, locale: string): string =>
  value === null ? '' : formatNumberInput(value, locale)

/**
 * Keeps the raw keystrokes a number field is holding, so a half-typed figure
 * survives a round trip through state: `6.` would otherwise come back as `6`
 * and eat the decimal point before `6.2` could be finished. An emptied field
 * stays empty rather than showing the `0` it counts as, and a typo stays
 * visible so it can be corrected.
 *
 * The draft only stands while it still means `value`. Once the calculator
 * reports something else — the deposit route minimums rewrite the deposit, and
 * the back button rewrites everything — `value` wins, reformatted with the
 * locale's decimal separator (vi shows `6,2`); state always stores plain
 * dot-decimal numbers.
 */
export function useNumericDraft(
  value: number,
  onChange: (next: number) => void,
  locale: string,
): NumericDraft {
  const [draft, setDraft] = useState(() => formatNumberInput(value, locale))

  const onDraftChange = (raw: string) => {
    setDraft(raw)
    onChange(parseDraft(raw, locale))
  }

  return {
    draft: parseDraft(draft, locale) === value ? draft : formatNumberInput(value, locale),
    onDraftChange,
  }
}

/**
 * The same draft, for a field where empty is an answer rather than a zero: an
 * unentered pre-approved loan means "not yet pre-approved", and the finance
 * check is not run at all. Clearing the field must therefore report `null`,
 * not the `0` that would fail the check on a figure the user never gave.
 *
 * Unparseable text reports `null` for the same reason — a half-typed or
 * mistyped figure leaves the check unrun rather than silently failing it.
 */
export function useOptionalNumericDraft(
  value: number | null,
  onChange: (next: number | null) => void,
  locale: string,
): NumericDraft {
  const [draft, setDraft] = useState(() => formatOrEmpty(value, locale))

  const onDraftChange = (raw: string) => {
    setDraft(raw)
    onChange(parseLocaleNumber(raw, locale))
  }

  return {
    draft: parseLocaleNumber(draft, locale) === value ? draft : formatOrEmpty(value, locale),
    onDraftChange,
  }
}
