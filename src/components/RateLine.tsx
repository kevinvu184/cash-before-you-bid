import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BASE_CURRENCY, type DisplayCurrency } from '../logic/currencyConfig'
import { formatMoney, formatNumberInput, parseLocaleNumber } from '../logic/format'
import { isValidRate, RATE_PROVIDER } from '../logic/exchangeRate'
import type { RateStatus } from '../hooks/useExchangeRate'
import { SYMBOL_KEYS } from './currencyLabels'

interface RateLineProps {
  currency: DisplayCurrency
  rate: number
  status: RateStatus
  updatedAt: number | null
  manualRate: number | null
  setManualRate: (rate: number | null) => void
}

/**
 * Says which rate the converted figures were produced at, where it came from,
 * and when it was quoted — then lets the reader replace it.
 *
 * The override exists because this rate is not the one they will be given.
 * Someone comparing a bank's transfer quote, or planning against a rate they
 * have already locked, needs the page to speak in their number rather than a
 * mid-market one it fetched.
 */
export function RateLine({
  currency,
  rate,
  status,
  updatedAt,
  manualRate,
  setManualRate,
}: RateLineProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const formId = useId()

  // Focus moves into the field when it opens — the button that opened it is
  // about to be replaced by the form, so leaving focus behind would drop it
  // to the top of the document.
  useEffect(() => {
    if (editing) {
      input.current?.focus()
      input.current?.select()
    }
  }, [editing])

  const open = () => {
    // Seeds with the rate in force, so a small correction does not mean
    // retyping the figure from scratch.
    setDraft(formatNumberInput(Math.round(rate), locale))
    setEditing(true)
  }

  const apply = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = parseLocaleNumber(draft, locale)
    // An unusable figure closes the field without changing the rate rather
    // than raising an error: the rate on screen is still a working one.
    if (parsed !== null && isValidRate(parsed)) setManualRate(parsed)
    setEditing(false)
  }

  const manual = manualRate !== null
  // Whole units: a rate carried to six decimals reads as precision this
  // conversion does not have, and the đồng has no minor unit to spend them on.
  const quoted = formatMoney(Math.round(rate), currency, locale, { round: false })
  const base = t(SYMBOL_KEYS[BASE_CURRENCY])

  const provenance = manual
    ? t('currency.sourceManual')
    : status === 'loading'
      ? t('currency.sourceLoading')
      : status === 'fallback'
        ? t('currency.sourceFallback')
        : status === 'stale'
          ? t('currency.sourceStale', { provider: RATE_PROVIDER })
          : t('currency.sourceLive', { provider: RATE_PROVIDER })

  return (
    <div className="rateline-block">
      <div className="rateline">
        <button
          type="button"
          className="ratebtn"
          aria-expanded={editing}
          // Only while the form exists: aria-controls naming an id that is not
          // in the document is a dangling reference, which validators flag and
          // some assistive tech follows to nothing. aria-expanded carries the
          // collapsed state on its own.
          aria-controls={editing ? formId : undefined}
          onClick={() => (editing ? setEditing(false) : open())}
        >
          <span className="ratebtn-rate">{t('currency.rateLine', { base, quoted })}</span>
          <span className="ratebtn-sep" aria-hidden="true">
            ·
          </span>
          <span className="ratebtn-source">{provenance}</span>
          {updatedAt !== null && !manual ? (
            <>
              <span className="ratebtn-sep" aria-hidden="true">
                ·
              </span>
              <span className="ratebtn-stamp">{formatStamp(updatedAt, locale)}</span>
            </>
          ) : null}
        </button>
        {manual ? (
          <>
            <span className="tag">{t('currency.manualTag')}</span>
            <button type="button" className="linkbtn" onClick={() => setManualRate(null)}>
              {t('currency.reset')}
            </button>
          </>
        ) : null}
      </div>
      {editing ? (
        <form className="rateedit" id={formId} onSubmit={apply}>
          <label htmlFor={`${formId}-input`}>{t('currency.overrideLabel', { base })}</label>
          <div className="re-row">
            <input
              id={`${formId}-input`}
              ref={input}
              // Text with a decimal keypad, not type="number": a vi reader
              // types the separators of their own locale, and a number input
              // would reject them (see NumberField).
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setEditing(false)
              }}
            />
            <span className="unit" aria-hidden="true">
              {t(SYMBOL_KEYS[currency])}
            </span>
            <button type="submit" className="re-btn primary">
              {t('currency.apply')}
            </button>
            <button type="button" className="re-btn tertiary" onClick={() => setEditing(false)}>
              {t('currency.cancel')}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

// The provider stamps the quote in UTC; it is shown in the reader's own zone,
// which is the only one they can check it against.
function formatStamp(at: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(at),
  )
}
