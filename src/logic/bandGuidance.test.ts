import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import vi from '../locales/vi.json'
import { DEFAULT_INPUTS } from '../data/defaults'
import { calculate } from './calculate'
import { BAND_GUIDANCE } from './fieldLabels'
import { buildLineFields } from './lineFields'

// The deposit figure is only half of what a bidder needs on the day: the money
// also has to be in a form the agent will take. This holds the guidance to the
// auction-day band, and holds both locales to the same key set — a missing key
// would fall back to English mid-sentence rather than fail visibly.

const groups = () => buildLineFields(calculate(DEFAULT_INPUTS).rows).lineGroups

const guidanceKeys = (): string[] => {
  const entry = BAND_GUIDANCE.auctionDay
  if (entry === undefined) throw new Error('the auction-day band has no guidance')
  return [entry.labelKey, ...entry.value.flatMap((point) => [point.termKey, point.bodyKey])]
}

const lookup = (strings: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((value, part) => {
    if (typeof value !== 'object' || value === null) return undefined
    return (value as Record<string, unknown>)[part]
  }, strings)

describe('band guidance', () => {
  it('hangs off the auction-day band and no other', () => {
    for (const group of groups()) {
      expect(group.band === 'auctionDay' ? group.guidance !== null : group.guidance === null).toBe(
        true,
      )
    }
  })

  it('carries the field id both skins declare, as points rather than a blob', () => {
    const guidance = groups().find((group) => group.band === 'auctionDay')?.guidance
    expect(guidance?.id).toBe('guidanceAuctionDay')
    expect(guidance?.value.length).toBeGreaterThan(0)
    for (const point of guidance?.value ?? []) {
      expect(point.termKey).not.toBe(point.bodyKey)
    }
  })

  it('names only keys, never sentences', () => {
    for (const key of guidanceKeys()) expect(key).toMatch(/^guidance\.[A-Za-z]+$/)
  })

  it('resolves every key in both locales', () => {
    for (const key of guidanceKeys()) {
      for (const [name, strings] of [
        ['en', en],
        ['vi', vi],
      ] as const) {
        const value = lookup(strings as unknown as Record<string, unknown>, key)
        expect(typeof value === 'string' && value.length > 0, `${name}: ${key}`).toBe(true)
      }
    }
  })

  it('states why a deposit bond is the exception, in both locales', () => {
    // The reason is the persuasive part, and the legislation name stays in
    // English in the Vietnamese copy (see TRANSLATION.md).
    for (const strings of [en, vi]) {
      const body = lookup(strings as unknown as Record<string, unknown>, 'guidance.bondBody')
      expect(body).toContain('Section 27')
      expect(body).toContain('Sale of Land Act 1962')
    }
  })

  it('frames the deposit percentage as the contract’s, in every route hint', () => {
    for (const [strings, contract] of [
      [en, '10%'],
      [vi, '10%'],
    ] as const) {
      const hints = lookup(strings as unknown as Record<string, unknown>, 'hints') as Record<
        string,
        string
      >
      for (const route of ['scheme', 'lmi', 'nolmi', 'htb']) {
        expect(hints[route], route).toContain(contract)
      }
    }
  })
})
