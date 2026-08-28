import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DisplayViewModel, ExchangeRateField } from '../../types/viewModel'
import { useDisplay } from '../shared/display'
import { quotedRate, rateDraft, rateStamp, refText } from '../shared/text'
import { ChoiceButtons } from './Controls'

/**
 * Heads the results with the currency the figures below are written in.
 *
 * It sits with the results rather than with the inputs on purpose: the switch
 * changes nothing that was calculated, only how it is read. The rate line
 * comes with it, and only while a conversion is actually in force — under the
 * base currency the core hands over no rate at all, because quoting one would
 * suggest the figures had been through it.
 */
export function CurrencyBar({ display }: { display: DisplayViewModel }) {
  const { t } = useTranslation()
  return (
    <div className="curbar">
      <div className="curbar-top">
        {/* The switch group already carries this as its accessible name, so
            the visible copy is decoration for people reading it. */}
        <span className="ctl-label" aria-hidden="true">
          {t(display.currency.labelKey)}
        </span>
        <ChoiceButtons field={display.currency} />
      </div>
      {display.rate === null ? null : <RateLine field={display.rate} />}
    </div>
  )
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
function RateLine({ field }: { field: ExchangeRateField }) {
  const { t } = useTranslation()
  const display = useDisplay()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const formId = useId()

  // Focus moves into the field when it opens, rather than leaving a keyboard
  // reader to tab past the control they just activated to reach what it
  // revealed.
  useEffect(() => {
    if (editing) {
      input.current?.focus()
      input.current?.select()
    }
  }, [editing])

  const open = () => {
    // Seeds with the rate in force, so a small correction does not mean
    // retyping the figure from scratch.
    setDraft(rateDraft(field.value, display))
    setEditing(true)
  }

  // The form unmounts on close, and the control that had focus goes with it —
  // which would drop focus to <body> and lose a keyboard reader their place.
  // Focus goes back to the control that opened it, before the state change
  // that removes the form, so there is no frame in between.
  const close = () => {
    trigger.current?.focus()
    setEditing(false)
  }

  const apply = (event: React.FormEvent) => {
    event.preventDefault()
    // An unusable figure closes the field without changing the rate rather
    // than raising an error: the rate on screen is still a working one.
    field.onOverride(draft)
    close()
  }

  const base = t(field.baseSymbolKey)
  const quoted = quotedRate(field.value, display)

  return (
    <div
      className="rateline-block"
      data-field={field.id}
      data-importance={field.importance}
    >
      <div className="rateline">
        <button
          type="button"
          className="ratebtn"
          ref={trigger}
          aria-expanded={editing}
          // Only while the form exists: aria-controls naming an id that is not
          // in the document is a dangling reference, which validators flag and
          // some assistive tech follows to nothing. aria-expanded carries the
          // collapsed state on its own.
          aria-controls={editing ? formId : undefined}
          onClick={() => (editing ? close() : open())}
        >
          <span className="ratebtn-rate">{t(field.lineKey, { base, quoted })}</span>
          <span className="ratebtn-sep" aria-hidden="true">
            ·
          </span>
          <span className="ratebtn-source">{refText(field.source, t, display)}</span>
          {field.updatedAt === null ? null : (
            <>
              <span className="ratebtn-sep" aria-hidden="true">
                ·
              </span>
              <span className="ratebtn-stamp">{rateStamp(field.updatedAt, display.locale)}</span>
            </>
          )}
        </button>
        {field.manual ? (
          <>
            <span className="tag">{t(field.actionKeys.manualTag)}</span>
            <button type="button" className="linkbtn" onClick={field.onReset}>
              {t(field.actionKeys.reset)}
            </button>
          </>
        ) : null}
      </div>
      {editing ? (
        <form className="rateedit" id={formId} onSubmit={apply}>
          {/* The stable id the view model hands every skin, so label and
              control pair the same way here as in the plain skin. formId
              stays the form's own, for the aria-controls reference above. */}
          <label htmlFor={field.controlId}>{t(field.actionKeys.overrideLabel, { base })}</label>
          <div className="re-row">
            <input
              id={field.controlId}
              ref={input}
              // Text with a decimal keypad, not type="number": a vi reader
              // types the separators of their own locale, and a number input
              // would reject them, as every other numeric field here does.
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') close()
              }}
            />
            <span className="unit" aria-hidden="true">
              {t(field.symbolKey)}
            </span>
            <button type="submit" className="re-btn primary">
              {t(field.actionKeys.apply)}
            </button>
            <button type="button" className="re-btn tertiary" onClick={close}>
              {t(field.actionKeys.cancel)}
            </button>
          </div>
        </form>
      ) : null}
      {/* The fields keep asking for Australian dollars whatever is on display
          here, and someone reading a page full of đồng needs telling before
          they type a đồng figure into one. */}
      <p className="curnote">
        {t(field.noteKey, { currency: t(field.symbolKey), provider: field.providerName })}
      </p>
    </div>
  )
}
