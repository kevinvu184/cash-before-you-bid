import { useTranslation } from 'react-i18next'
import type { ActionField, ChoiceInputField } from '../../types/viewModel'

interface ChoiceButtonsProps<T extends string> {
  field: ChoiceInputField<T>
}

/**
 * A choice as a row of plain buttons, each a 44px tap target, no hover
 * required: the active option is carried by aria-pressed and the ink fill.
 * Used for all three of language, skin and colour mode.
 */
export function ChoiceButtons<T extends string>({ field }: ChoiceButtonsProps<T>) {
  const { t } = useTranslation()
  return (
    <div
      className="choice-switch"
      role="group"
      aria-label={t(field.labelKey)}
      data-field={field.id}
      data-importance={field.importance}
    >
      {field.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="choice-option"
          aria-pressed={field.value === option.value}
          aria-label={option.a11yLabelKey ? t(option.a11yLabelKey) : undefined}
          lang={option.lang}
          onClick={() => field.onChange(option.value)}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}

/**
 * A control that does something rather than choosing something: the same
 * 44px ink-outlined target as a choice option, but a single button with no
 * pressed state, since there is nothing to stay selected.
 */
export function ActionButton({ field }: { field: ActionField }) {
  const { t } = useTranslation()
  return (
    <div className="choice-switch" data-field={field.id} data-importance={field.importance}>
      <button type="button" className="choice-option" onClick={field.onActivate}>
        {t(field.labelKey)}
      </button>
    </div>
  )
}
