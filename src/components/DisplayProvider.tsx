import { useMemo, type ReactNode } from 'react'
import { DisplayContext, type DisplaySettings } from '../hooks/useDisplay'

interface DisplayProviderProps extends DisplaySettings {
  children: ReactNode
}

/** Puts the currency and rate every figure is written with in reach of the tree. */
export function DisplayProvider({ currency, rate, children }: DisplayProviderProps) {
  const value = useMemo(() => ({ currency, rate }), [currency, rate])
  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>
}
