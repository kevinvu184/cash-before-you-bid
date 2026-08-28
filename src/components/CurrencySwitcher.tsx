import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DISPLAY_CURRENCIES, type DisplayCurrency } from '../logic/currencyConfig'
// The control shows the symbol alone; the currency is named in the accessible
// label, so no flag or ISO code is needed and the same control renders
// identically in both languages.
import { NAME_KEYS, SYMBOL_KEYS } from './currencyLabels'

interface CurrencySwitcherProps {
  currency: DisplayCurrency
  setCurrency: (currency: DisplayCurrency) => void
  /** Marks the copy inside the ink sticky strip, which inverts the palette. */
  compact?: boolean
}

/**
 * A segmented radio group, each segment a 44px tap target. Selection is
 * instant and carries no animation: the figures behind it change on the same
 * frame, and a transition on the control would imply they had not.
 *
 * Radios, not toggle buttons: choosing a currency is picking one of a set, and
 * the group takes a single tab stop with the arrow keys moving inside it —
 * the pattern a screen reader user expects from role="radiogroup".
 */
export function CurrencySwitcher({ currency, setCurrency, compact }: CurrencySwitcherProps) {
  const { t } = useTranslation()
  const group = useRef<HTMLDivElement>(null)

  // Re-picking the active currency is a no-op: setCurrency pushes to history,
  // and an identical entry would pollute the back button.
  const choose = (next: DisplayCurrency) => {
    if (next !== currency) setCurrency(next)
  }

  // Arrow keys move the selection and the focus together, wrapping at the
  // ends. The DOM order is the reading order, so it is what the keys follow.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const at = DISPLAY_CURRENCIES.indexOf(currency)
    const size = DISPLAY_CURRENCIES.length
    const next = DISPLAY_CURRENCIES[(at + step + size) % size]
    choose(next)
    group.current?.querySelector<HTMLButtonElement>(`[data-currency="${next}"]`)?.focus()
  }

  return (
    <div
      className={compact ? 'seg2 compact' : 'seg2'}
      role="radiogroup"
      aria-label={t('currency.switcherLabel')}
      ref={group}
      onKeyDown={onKeyDown}
    >
      {DISPLAY_CURRENCIES.map((code) => {
        const active = code === currency
        return (
          <button
            key={code}
            type="button"
            role="radio"
            data-currency={code}
            aria-checked={active}
            aria-label={t(NAME_KEYS[code])}
            // One tab stop for the group: focus enters on the active segment
            // and the arrow keys take over from there.
            tabIndex={active ? 0 : -1}
            onClick={() => choose(code)}
          >
            {t(SYMBOL_KEYS[code])}
          </button>
        )
      })}
    </div>
  )
}
