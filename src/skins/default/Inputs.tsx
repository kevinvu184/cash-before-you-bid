import { useTranslation } from 'react-i18next'
import type {
  AnyInputField,
  BooleanInputField,
  ChoiceInputField,
  InputsViewModel,
  NumberInputField,
  PrivacyField,
} from '../../types/viewModel'

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
