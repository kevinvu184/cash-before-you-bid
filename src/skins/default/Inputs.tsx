import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AnyInputField,
  BooleanInputField,
  ChoiceInputField,
  InputsViewModel,
  NumberInputField,
  PriceSliderField,
  PrivacyField,
} from '../../types/viewModel'
import { useDisplay } from '../shared/display'
import { exactMoney, inputMoney, refText } from '../shared/text'

/**
 * A text field with a keypad, not `type="number"`: number inputs reject the
 * locale's typed separators, and a vi user must be able to enter `1.234,5`.
 * Which keypad is the core's call (`keypad`) — a whole count asks for the
 * digits-only one. The raw keystrokes come from the view model as `draft`;
 * parsing happens in the core.
 */
function NumberRow({ field }: { field: NumberInputField }) {
  const { t } = useTranslation()
  const hintId = field.hintKey ? `${field.controlId}-hint` : undefined

  return (
    <div className="field" data-field={field.id} data-importance={field.importance}>
      <label htmlFor={field.controlId}>{t(field.labelKey)}</label>
      {/* autoComplete is off by choice, not by omission: these are one-off
          figures for a calculation, and no autocomplete token describes a
          purchase price or an interest rate. Offering to fill a saved value
          into one would be wrong every time. */}
      <input
        id={field.controlId}
        type="text"
        inputMode={field.keypad}
        autoComplete="off"
        value={field.draft}
        aria-describedby={hintId}
        onChange={(event) => field.onDraftChange(event.target.value)}
      />
      {field.hintKey ? (
        <span className="field-hint" id={hintId}>
          {t(field.hintKey)}
        </span>
      ) : null}
    </div>
  )
}

/**
 * The price on a track, with the first home buyer duty thresholds on it.
 *
 * Not a step: the concession formula is continuous at both ceilings (see
 * `logic/priceMarkers.ts`, which explains what these actually mark). What is
 * worth seeing is the band between them, where the whole duty bill phases in
 * over a narrow range of price — invisible in a bare number field until you
 * happen to type across it. The ticks put both ends of that band where they
 * can be aimed at; the notes under the track say what changes at each.
 *
 * The slider reports whole prices and never touches the number field's draft,
 * so a half-typed figure is never snapped by it — see `useNumericDraft`.
 */
function PriceSlider({ field }: { field: PriceSliderField }) {
  const { t } = useTranslation()
  const display = useDisplay()
  const hasMarkers = field.markers.length > 0
  const notesId = hasMarkers ? `${field.controlId}-cliffs` : undefined

  return (
    <div className="field price-slider" data-field={field.id} data-importance={field.importance}>
      <label htmlFor={field.controlId}>{t(field.labelKey)}</label>
      <input
        id={field.controlId}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={field.value}
        // Without this a screen reader reads the raw number. In the base
        // currency, like the price box this mirrors: the inputs are in dollars
        // whatever the results are being shown in.
        aria-valuetext={inputMoney(field.value, display.locale)}
        aria-describedby={notesId}
        onChange={(event) => field.onChange(Number(event.target.value))}
      />
      {/* The ticks are for the eye only: the same thresholds reach a screen
          reader as the notes below, which are text rather than a position.
          The rail is inset by half the thumb, so a marker's percentage lands
          exactly where the thumb's centre does at that price. Each tick drops
          to its own row — at 360px the two cliffs sit close enough together
          that side by side their labels would collide. */}
      {hasMarkers ? (
        <div className="price-cliff-rail" aria-hidden="true">
          {field.markers.map((marker, index) => (
            <span
              key={marker.id}
              className="price-cliff"
              style={{ left: `${marker.positionPct}%`, '--cliff-row': index } as CSSProperties}
            >
              {exactMoney(marker.value, display)}
            </span>
          ))}
        </div>
      ) : null}
      {hasMarkers ? (
        <ul className="price-cliff-notes" id={notesId} aria-label={t(field.markersLabelKey)}>
          {field.markers.map((marker) => (
            <li key={marker.id}>
              <strong>{t(marker.labelKey)}</strong>
              {refText(marker.description, t, display)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SelectRow<T extends string>({ field }: { field: ChoiceInputField<T> }) {
  const { t } = useTranslation()
  return (
    <div className="field" data-field={field.id} data-importance={field.importance}>
      <label htmlFor={field.controlId}>{t(field.labelKey)}</label>
      {/* Native select on purpose: the phone's own picker beats anything we
          could build, so only the frame is styled. */}
      <select
        id={field.controlId}
        value={field.value}
        onChange={(event) => field.onChange(event.target.value as T)}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  )
}

function CheckboxRow({ field }: { field: BooleanInputField }) {
  const { t } = useTranslation()
  return (
    // The box itself paints at 18px, so the label wraps it and takes the whole
    // row as the tap target — anywhere on the line toggles it.
    <label
      className="field field-inline"
      htmlFor={field.controlId}
      data-field={field.id}
      data-importance={field.importance}
    >
      <input
        id={field.controlId}
        type="checkbox"
        checked={field.value}
        onChange={(event) => field.onChange(event.target.checked)}
      />
      <span>{t(field.labelKey)}</span>
    </label>
  )
}

function InputRow({ field }: { field: AnyInputField }) {
  return field.kind === 'boolean' ? <CheckboxRow field={field} /> : <NumberRow field={field} />
}

/**
 * The privacy statement, directly under the two fields it is about. The claim
 * itself is the summary, so it is on screen unopened — someone hesitating over
 * the savings box reads it without tapping anything — and the specifics behind
 * it are one tap away rather than four sentences in the way.
 *
 * `data-field` goes on the list, not the `<details>`: the same arrangement the
 * band guidance uses, so the points are in the DOM whether or not it is open.
 */
function PrivacyNote({ privacy }: { privacy: PrivacyField }) {
  const { t } = useTranslation()
  return (
    <details className="privacy">
      <summary>{t(privacy.labelKey)}</summary>
      <ul className="small" data-field={privacy.id} data-importance={privacy.importance}>
        {privacy.value.map((point) => (
          <li key={point.termKey}>
            <strong>{t(point.termKey)}</strong>
            {t(point.bodyKey)}
          </li>
        ))}
      </ul>
    </details>
  )
}

export function InputsPanel({ inputs }: { inputs: InputsViewModel }) {
  const { t } = useTranslation()

  return (
    // A named region, not <aside>: these are the calculator's primary content,
    // and "complementary" would tell a screen reader they are supporting
    // material it is safe to skip.
    <section className="panel" aria-label={t(inputs.regionLabelKey)}>
      <h2
        className="section-mark"
        data-field={inputs.heading.id}
        data-importance={inputs.heading.importance}
      >
        {t(inputs.heading.labelKey)}
      </h2>

      <NumberRow field={inputs.price} />
      <PriceSlider field={inputs.priceSlider} />
      <SelectRow field={inputs.route} />
      <NumberRow field={inputs.depositPct} />
      <SelectRow field={inputs.region} />
      <CheckboxRow field={inputs.firstHomeBuyer} />
      <CheckboxRow field={inputs.ownerOccupier} />
      <CheckboxRow field={inputs.newHome} />
      <NumberRow field={inputs.offThePlanConstruction} />
      <CheckboxRow field={inputs.foreignPurchaser} />
      <NumberRow field={inputs.interestRatePct} />

      {/* What you have, not what it costs. Primary fields, in front of the
          disclosure: without them there is no verdict to show. */}
      <NumberRow field={inputs.savings} />
      <NumberRow field={inputs.preApprovedLoan} />

      {/* Placed here on purpose: the promise is only worth anything at the
          moment someone is deciding whether to type a savings balance in. */}
      <PrivacyNote privacy={inputs.privacy} />

      {/* Progressive disclosure: the fields stay in the document when closed,
          so the parity contract holds whether or not it has been opened. */}
      <details
        className="assumptions"
        data-field={inputs.assumptions.id}
        data-importance={inputs.assumptions.importance}
      >
        <summary>{t(inputs.assumptions.labelKey)}</summary>
        {inputs.assumptions.value.map((field) => (
          <InputRow key={field.id} field={field} />
        ))}
      </details>

      <p
        className="panel-foot"
        data-field={inputs.foot.id}
        data-importance={inputs.foot.importance}
      >
        {t(inputs.foot.labelKey)}
      </p>
    </section>
  )
}
