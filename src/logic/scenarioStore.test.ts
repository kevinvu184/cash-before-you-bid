import { describe, expect, it } from 'vitest'
import {
  MAX_NAME_LENGTH,
  MAX_QUERY_LENGTH,
  MAX_SCENARIOS,
  newScenarioId,
  normaliseName,
  parseScenarios,
  serialiseScenarios,
  type SavedScenario,
} from './scenarioStore'

const scenario = (over: Partial<SavedScenario> = {}): SavedScenario => ({
  id: 'a',
  name: '12 Rose St',
  query: 'price=820000&route=lmi',
  savedAt: 1_756_000_000_000,
  ...over,
})

const stored = (scenarios: unknown) => JSON.stringify({ version: 1, scenarios })

describe('normaliseName', () => {
  it('trims, collapses runs of whitespace and caps the length', () => {
    expect(normaliseName('  12   Rose   St  ')).toBe('12 Rose St')
    expect(normaliseName('x'.repeat(MAX_NAME_LENGTH + 40))).toHaveLength(MAX_NAME_LENGTH)
  })
})

describe('newScenarioId', () => {
  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 200 }, newScenarioId))
    expect(ids.size).toBe(200)
  })
})

describe('parseScenarios', () => {
  it('round-trips what serialiseScenarios writes', () => {
    const list = [scenario(), scenario({ id: 'b', name: 'Union Rd' })]
    expect(parseScenarios(serialiseScenarios(list))).toEqual(list)
  })

  it('reads nothing from an empty or absent value', () => {
    expect(parseScenarios(null)).toEqual([])
    expect(parseScenarios('')).toEqual([])
  })

  it('reads nothing from a payload that is not JSON', () => {
    // What a half-finished hand edit, or another app's key collision, leaves.
    expect(parseScenarios('{"version":1,"scenarios":[')).toEqual([])
    expect(parseScenarios('not json at all')).toEqual([])
  })

  it('reads nothing from JSON of the wrong shape', () => {
    expect(parseScenarios('null')).toEqual([])
    expect(parseScenarios('42')).toEqual([])
    expect(parseScenarios('{"version":1}')).toEqual([])
    expect(parseScenarios('{"version":1,"scenarios":"nope"}')).toEqual([])
  })

  it('accepts a bare array, which is what a hand edit tends to produce', () => {
    expect(parseScenarios(JSON.stringify([scenario()]))).toEqual([scenario()])
  })

  it('keeps the readable entries and drops only the broken ones', () => {
    const raw = stored([
      scenario({ id: 'ok' }),
      null,
      'a string',
      { id: 'no-query', name: 'x' },
      { id: 42, name: 'x', query: '' },
      { id: 'blank-name', name: '   ', query: 'price=1' },
      { id: 'no-name', query: 'price=1' },
      scenario({ id: 'also-ok', name: 'Union Rd' }),
    ])
    expect(parseScenarios(raw).map((entry) => entry.id)).toEqual(['ok', 'also-ok'])
  })

  it('normalises names read back from storage', () => {
    const raw = stored([scenario({ name: `  spaced   out  ${'x'.repeat(MAX_NAME_LENGTH)}` })])
    const [entry] = parseScenarios(raw)
    expect(entry.name).toHaveLength(MAX_NAME_LENGTH)
    expect(entry.name.startsWith('spaced out ')).toBe(true)
  })

  it('replaces a missing or nonsense timestamp with 0 rather than dropping the entry', () => {
    const raw = stored([
      scenario({ id: 'a', savedAt: undefined as unknown as number }),
      scenario({ id: 'b', savedAt: 'yesterday' as unknown as number }),
      scenario({ id: 'c', savedAt: Number.NaN }),
    ])
    expect(parseScenarios(raw).map((entry) => entry.savedAt)).toEqual([0, 0, 0])
  })

  it('keeps the first of two entries sharing an id', () => {
    const raw = stored([scenario({ name: 'first' }), scenario({ name: 'second' })])
    expect(parseScenarios(raw).map((entry) => entry.name)).toEqual(['first'])
  })

  it('stops at the cap, however many are in storage', () => {
    const raw = stored(
      Array.from({ length: MAX_SCENARIOS + 10 }, (_, i) => scenario({ id: `s${i}` })),
    )
    expect(parseScenarios(raw)).toHaveLength(MAX_SCENARIOS)
  })

  it('drops a query string too long to have come from this app', () => {
    const raw = stored([scenario({ query: 'x'.repeat(MAX_QUERY_LENGTH + 1) })])
    expect(parseScenarios(raw)).toEqual([])
  })

  it('keeps a query string it cannot make sense of, for the URL codec to clamp', () => {
    // A scenario written by an older version: parameters that no longer exist,
    // values outside today's ranges. parseUrlState falls back on read, so the
    // scenario is still worth keeping.
    const raw = stored([scenario({ query: 'price=abc&route=gone&removedParam=7' })])
    expect(parseScenarios(raw)[0].query).toBe('price=abc&route=gone&removedParam=7')
  })
})
