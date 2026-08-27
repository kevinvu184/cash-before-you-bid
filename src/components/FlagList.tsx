import type { Flag, FlagKind } from '../types/calculator'

// Ledger has no alert or toast component, so the flags are rule-divided strips
// with the state carried by a mono label in one of the desaturated semantics.
const LABELS: Record<FlagKind, string> = {
  warn: 'WARNING',
  note: 'NOTE',
  ok: 'CHECK',
}

interface FlagListProps {
  flags: Flag[]
}

export function FlagList({ flags }: FlagListProps) {
  if (flags.length === 0) return null

  return (
    <div className="flags" role="region" aria-label="Warnings and notes">
      {flags.map((flag) => (
        <p className={`flag ${flag.kind}`} key={`${flag.kind}:${flag.message}`}>
          <span className="flag-label">{LABELS[flag.kind]}</span>
          <span className="flag-text">{flag.message}</span>
        </p>
      ))}
    </div>
  )
}
