import { useMemo, type ReactNode } from 'react'
import type { DisplaySettings } from '../../logic/display'
import { DisplayContext } from './display'

/** Puts the currency and rate every figure is written with in reach of a tree. */
export function DisplayProvider({
  settings,
  children,
}: {
  settings: DisplaySettings
  children: ReactNode
}) {
  const { currency, rate } = settings
  const value = useMemo(() => ({ currency, rate }), [currency, rate])
  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>
}
