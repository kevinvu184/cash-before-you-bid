import { describe, expect, it } from 'vitest'
import {
  dutyFromBrackets,
  FHB_CONCESSION_BAND,
  FHB_CONCESSION_CEILING,
  FHB_EXEMPTION_CEILING,
  firstHomeConcessionApplies,
  FOREIGN_PURCHASER_DUTY_RATE,
  GENERAL_DUTY_BRACKETS,
  PPR_CONCESSION_CEILING,
  PPR_DUTY_BRACKETS,
  RATES_AS_AT,
  SRO_DUTY_CALCULATOR_URL,
  type DutyBracket,
} from './rates'

// The config is only worth having if it is well-formed and if it reproduces
// the published tables. `duty.test.ts` proves the figures the engine returns;
// this proves the tables those figures come out of.

const TABLES: ReadonlyArray<readonly [string, readonly DutyBracket[]]> = [
  ['general', GENERAL_DUTY_BRACKETS],
  ['ppr', PPR_DUTY_BRACKETS],
]

describe.each(TABLES)('the %s duty table', (_name, brackets) => {
  it('runs upward and ends open, so every value lands in exactly one bracket', () => {
    const ceilings = brackets.map((bracket) => bracket.upTo)
    expect(ceilings.at(-1)).toBeNull()
    expect(ceilings.slice(0, -1)).not.toContain(null)
    const bounded = ceilings.slice(0, -1) as number[]
    expect(bounded).toEqual([...bounded].sort((a, b) => a - b))
  })

  it('measures each excess from inside or below its own bracket', () => {
    // `over` above the bracket's own ceiling would make duty fall as value
    // rises — the one shape of error a rate table can hide.
    for (const bracket of brackets) {
      if (bracket.upTo !== null) expect(bracket.over).toBeLessThanOrEqual(bracket.upTo)
      expect(bracket.rate).toBeGreaterThan(0)
    }
  })

  it('never charges less duty on a higher value', () => {
    let previous = -1
    for (let value = 0; value <= 2_500_000; value += 5_000) {
      const duty = dutyFromBrackets(value, brackets)
      expect(duty).toBeGreaterThanOrEqual(previous)
      previous = duty
    }
  })
})

describe('dutyFromBrackets', () => {
  it('reproduces the published general rates at every bracket edge', () => {
    // State Revenue Office, land transfer duty (non-PPR), current rates.
    const table = dutyFromBrackets
    expect(table(25_000, GENERAL_DUTY_BRACKETS)).toBeCloseTo(350, 6)
    expect(table(130_000, GENERAL_DUTY_BRACKETS)).toBeCloseTo(2870, 6)
    expect(table(960_000, GENERAL_DUTY_BRACKETS)).toBeCloseTo(52_670, 6)
    expect(table(2_000_000, GENERAL_DUTY_BRACKETS)).toBeCloseTo(110_000, 6)
    expect(table(2_500_000, GENERAL_DUTY_BRACKETS)).toBeCloseTo(142_500, 6)
  })

  it('reproduces the published PPR rates at every bracket edge', () => {
    // State Revenue Office, land transfer duty (PPR), current rates.
    expect(dutyFromBrackets(130_000, PPR_DUTY_BRACKETS)).toBeCloseTo(2870, 6)
    expect(dutyFromBrackets(440_000, PPR_DUTY_BRACKETS)).toBeCloseTo(18_370, 6)
    expect(dutyFromBrackets(PPR_CONCESSION_CEILING, PPR_DUTY_BRACKETS)).toBeCloseTo(24_970, 6)
  })

  it('refuses a table it cannot place a value in rather than returning nil duty', () => {
    expect(() => dutyFromBrackets(1_000_000, [{ upTo: 100, base: 0, rate: 0.01, over: 0 }])).toThrow()
  })
})

describe('first home buyer thresholds', () => {
  it('exempts to $600k and phases out over the $150k band to $750k', () => {
    expect(FHB_EXEMPTION_CEILING).toBe(600_000)
    expect(FHB_CONCESSION_CEILING).toBe(750_000)
    expect(FHB_CONCESSION_BAND).toBe(150_000)
  })
})

describe('firstHomeConcessionApplies', () => {
  const buyer = { firstHomeBuyer: true, ownerOccupier: true, foreignPurchaser: false }

  it('applies to an owner-occupier first home buyer who is not a foreign purchaser', () => {
    expect(firstHomeConcessionApplies(buyer)).toBe(true)
  })

  // The rule issue #14 fixed, now stated in config beside the thresholds.
  it('withholds it from a foreign purchaser', () => {
    expect(firstHomeConcessionApplies({ ...buyer, foreignPurchaser: true })).toBe(false)
  })

  it('withholds it from an investor and from a repeat buyer', () => {
    expect(firstHomeConcessionApplies({ ...buyer, ownerOccupier: false })).toBe(false)
    expect(firstHomeConcessionApplies({ ...buyer, firstHomeBuyer: false })).toBe(false)
  })
})

describe('the rates version stamp', () => {
  it('carries an ISO date the interface can format', () => {
    expect(RATES_AS_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(new Date(`${RATES_AS_AT}T00:00:00Z`).getTime())).toBe(false)
  })

  it('points at the State Revenue Office over https, so a reader can check it', () => {
    expect(SRO_DUTY_CALCULATOR_URL).toMatch(/^https:\/\/(www\.)?sro\.vic\.gov\.au\//)
  })

  it('states the foreign purchaser additional duty rate as 8%', () => {
    expect(FOREIGN_PURCHASER_DUTY_RATE).toBeCloseTo(0.08, 10)
  })
})
