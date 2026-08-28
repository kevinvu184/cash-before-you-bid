import { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import type { Display, DisplaySettings } from '../../logic/display'

// Currency and rate are ambient: almost every leaf that prints a figure needs
// them, and none of them decide them. Context rather than two props threaded
// through components that would otherwise only pass them on.
//
// The locale is not stored here. It comes from i18next at the point of use, so
// figures re-format on the same render as the words around them — reading it
// from the view model instead would re-format money a beat before the language
// bundle it sits in has swapped.
//
// A skin publishes what the view model handed it (see DisplayProvider); the
// shell does not, because the parity suite renders a skin's Root on its own.

export const DisplayContext = createContext<DisplaySettings | null>(null)

export function useDisplay(): Display {
  const settings = useContext(DisplayContext)
  if (settings === null) {
    throw new Error('useDisplay must be used inside a DisplayProvider')
  }
  const { i18n } = useTranslation()
  return { locale: i18n.language, currency: settings.currency, rate: settings.rate }
}
