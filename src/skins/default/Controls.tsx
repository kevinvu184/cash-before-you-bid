import { useTranslation } from 'react-i18next'
import type { ChoiceInputField } from '../../types/viewModel'

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
