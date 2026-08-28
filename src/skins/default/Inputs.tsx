import { useTranslation } from 'react-i18next'
import type {
  AnyInputField,
  BooleanInputField,
  ChoiceInputField,
  InputsViewModel,
  NumberInputField,
} from '../../types/viewModel'

/**
 * A text field with the decimal keypad, not `type="number"`: number inputs
 * reject the locale's typed separators, and a vi user must be able to enter
 * `1.234,5`. The raw keystrokes come from the view model as `draft`; parsing
 * happens in the core.
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
        inputMode="decimal"
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

export function InputsPanel({ inputs }: { inputs: InputsViewModel }) {
  const { t } = useTranslation()

  return (
    <aside className="panel" aria-label={t(inputs.regionLabelKey)}>
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
    </aside>
  )
}
