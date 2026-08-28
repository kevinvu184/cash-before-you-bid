// Saved scenarios, as data. Persistence lives in src/hooks/useSavedScenarios.ts;
// this module is the pure half — what a stored payload looks like, and how to
// read one back that may have been written by an older version of the app, by
// hand, or by something else entirely.
//
// A scenario is a name and a URL query string. It is *not* a record with a
// field per calculator input: the query string is produced by
// serialiseUrlState() and read back by parseUrlState(), so the URL codec stays
// the single serialisation format and every input added there is saved and
// restored without touching this file.

export interface SavedScenario {
  id: string
  name: string
  /** A query string as produced by serialiseUrlState(), without the leading "?". */
  query: string
  /** Epoch milliseconds; shown beside the name so two Saturdays can be told apart. */
  savedAt: number
}

/** The localStorage key. Versioned so a future incompatible shape can coexist. */
export const SCENARIOS_KEY = 'cbyb.scenarios.v1'

/**
 * How many scenarios are kept. A phone's localStorage quota is measured in
 * megabytes and a scenario is a couple of hundred bytes, so this is not about
 * space — it is about a list that stays scannable on a 360px screen, and about
 * refusing unbounded growth on a device the user shares.
 */
export const MAX_SCENARIOS = 20

/** Long enough for "12 Rose St, Preston — 5% deposit", short enough to render. */
export const MAX_NAME_LENGTH = 60

/**
 * A query string longer than this is not something this app wrote. Parsing it
 * would still be safe — the codec clamps and falls back on every param — but
 * storing it wastes the quota that real scenarios need.
 */
export const MAX_QUERY_LENGTH = 2000

interface StoredPayload {
  version: 1
  scenarios: SavedScenario[]
}

/** Trims, collapses runs of whitespace, and caps the length. */
export function normaliseName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH)
}

/**
 * A collision-resistant id without a dependency. crypto.randomUUID is not
 * available on http:// origins or in older Safari, so it is used when present
 * and a timestamp-plus-random string stands in when it is not.
 */
export function newScenarioId(): string {
  const uuid = globalThis.crypto?.randomUUID
  if (typeof uuid === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readEntry(value: unknown): SavedScenario | null {
  if (typeof value !== 'object' || value === null) return null
  const entry = value as Record<string, unknown>
  if (typeof entry.id !== 'string' || entry.id === '') return null
  if (typeof entry.query !== 'string' || entry.query.length > MAX_QUERY_LENGTH) return null
  if (typeof entry.name !== 'string') return null
  const name = normaliseName(entry.name)
  if (name === '') return null
  // A hand-edited or missing timestamp sorts last rather than rejecting an
  // otherwise usable scenario; the figures are the part worth keeping.
  const savedAt =
    typeof entry.savedAt === 'number' && Number.isFinite(entry.savedAt) ? entry.savedAt : 0
  return { id: entry.id, name, query: entry.query, savedAt }
}

function readList(parsed: unknown): unknown[] {
  // The current payload is { version, scenarios }; a bare array is accepted
  // too, since that is the obvious thing someone editing this by hand writes.
  if (Array.isArray(parsed)) return parsed
  if (typeof parsed !== 'object' || parsed === null) return []
  const scenarios = (parsed as { scenarios?: unknown }).scenarios
  return Array.isArray(scenarios) ? scenarios : []
}

/**
 * Reads whatever is in storage. Anything unreadable — absent, not JSON, the
 * wrong shape, an entry missing its query — yields the entries that *are*
 * readable rather than an error: a corrupt payload must not take the page
 * down, and dropping one bad row is better than dropping the other nineteen.
 *
 * The query strings themselves are not validated here. parseUrlState() already
 * clamps every number and falls back on every unknown enum, so a scenario
 * written by an older version of the app loads as far as it still parses and
 * takes the current defaults for the rest.
 */
export function parseScenarios(raw: string | null): SavedScenario[] {
  if (raw === null || raw === '') return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const list = readList(parsed)
  const seen = new Set<string>()
  const scenarios: SavedScenario[] = []
  for (const value of list) {
    const entry = readEntry(value)
    if (entry === null || seen.has(entry.id)) continue
    seen.add(entry.id)
    scenarios.push(entry)
    if (scenarios.length === MAX_SCENARIOS) break
  }
  return scenarios
}

export function serialiseScenarios(scenarios: readonly SavedScenario[]): string {
  const payload: StoredPayload = { version: 1, scenarios: [...scenarios] }
  return JSON.stringify(payload)
}
