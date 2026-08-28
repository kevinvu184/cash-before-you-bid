import { useTranslation } from 'react-i18next'
import { useDisplay } from '../hooks/useDisplay'
import type { Flag, FlagKind } from '../types/calculator'
import { flagText } from './resultText'

// Ledger has no alert or toast component, so the flags are rule-divided strips
// with the state carried by a mono label in one of the desaturated semantics.
const KIND_KEYS: Record<FlagKind, string> = {
  warn: 'flagKinds.warn',
  note: 'flagKinds.note',
  ok: 'flagKinds.ok',
}

interface FlagListProps {
  flags: Flag[]
}

export function FlagList({ flags }: FlagListProps) {
  const { t } = useTranslation()
  const display = useDisplay()
  if (flags.length === 0) return null

  return (
    <div className="flags" role="region" aria-label={t('results.flagsLabel')}>
      {flags.map((flag) => (
        <p className={`flag ${flag.kind}`} key={`${flag.kind}:${flag.code}`}>
          <span className="flag-label">{t(KIND_KEYS[flag.kind])}</span>
          <span className="flag-text">{flagText(flag, t, display)}</span>
        </p>
      ))}
    </div>
  )
}
