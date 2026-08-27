import { useNumericDraft } from '../hooks/useNumericDraft'

interface NumberFieldProps {
  id: string
  label: string
  value: number
  onChange: (next: number) => void
  hint?: string
  step?: number
  min?: number
  max?: number
}

// No figure on this page is negative, so 0 is the floor unless a field sets a
// higher one. The ceilings come from the URL codec's own limits.
export function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  step,
  min = 0,
  max,
}: NumberFieldProps) {
  const { draft, onDraftChange } = useNumericDraft(value, onChange)
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {/* autoComplete is off by choice, not by omission: these are one-off
          figures for a calculation, and no autocomplete token describes a
          purchase price or an interest rate. Offering to fill a saved value
          into one would be wrong every time. */}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        step={step}
        min={min}
        max={max}
        aria-describedby={hintId}
        onChange={(event) => onDraftChange(event.target.value)}
      />
      {hint ? (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}

interface SelectFieldProps<T extends string> {
  id: string
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (next: T) => void
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {/* Native select on purpose: the phone's own picker beats anything we
          could build, so only the frame is styled. */}
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface CheckboxFieldProps {
  id: string
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}

export function CheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    // The box itself paints at 18px, so the label wraps it and takes the whole
    // row as the tap target — anywhere on the line toggles it.
    <label className="field field-inline" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
