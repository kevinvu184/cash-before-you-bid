import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../data/defaults'
import type { CalculatorInputs } from '../types/calculator'
import { parseParams, serialiseParams } from './urlState'

const parse = (query: string) => parseParams(new URLSearchParams(query))

describe('serialiseParams', () => {
  it('serialises the default state to an empty query string', () => {
    expect(serialiseParams(DEFAULT_INPUTS).toString()).toBe('')
  })

  it('only includes params that differ from their default', () => {
    const state: CalculatorInputs = { ...DEFAULT_INPUTS, price: 900_000, route: 'lmi' }
    expect(serialiseParams(state).toString()).toBe('price=900000&route=lmi')
  })

  it('sorts keys alphabetically so equal states produce identical URLs', () => {
    const state: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      route: 'htb',
      depositPct: 2,
      region: 'regional',
      price: 620_000,
      bufferMonths: 6,
    }
    expect(serialiseParams(state).toString()).toBe(
      'bufm=6&dep=2&price=620000&region=regional&route=htb',
    )
  })

  it('writes booleans as 1/0', () => {
    const state: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      firstHomeBuyer: false,
      capitaliseLmi: true,
    }
    expect(serialiseParams(state).toString()).toBe('caplmi=1&fhb=0')
  })

  it('keeps a fully non-default state well under the 2000-character URL limit', () => {
    const state: CalculatorInputs = {
      price: 12_345_678,
      route: 'lmi',
      depositPct: 12.5,
      region: 'regional',
      firstHomeBuyer: false,
      ownerOccupier: false,
      newHome: true,
      offThePlanConstruction: 1_234_567,
      foreignPurchaser: true,
      interestRatePct: 7.85,
      conveyancing: 2500,
      buildingAndPest: 990,
      lenderFees: 750,
      settlementAdjustments: 1250,
      buildingInsurance: 2200,
      movingCosts: 8000,
      bufferMonths: 12,
      capitaliseLmi: true,
    }
    expect(serialiseParams(state).toString().length).toBeLessThan(300)
  })
})

describe('parseParams', () => {
  it('returns the defaults for an empty query string', () => {
    expect(parse('')).toEqual(DEFAULT_INPUTS)
  })

  it('reads every param', () => {
    const parsed = parse(
      'adj=900&bp=600&bufm=6&caplmi=1&conv=1800&dep=12&fhb=0&foreign=1&ins=1600' +
        '&lender=350&move=4500&newhome=1&otp=50000&ppr=0&price=820000&rate=5.9' +
        '&region=regional&route=lmi',
    )
    expect(parsed).toEqual({
      price: 820_000,
      route: 'lmi',
      depositPct: 12,
      region: 'regional',
      firstHomeBuyer: false,
      ownerOccupier: false,
      newHome: true,
      offThePlanConstruction: 50_000,
      foreignPurchaser: true,
      interestRatePct: 5.9,
      conveyancing: 1800,
      buildingAndPest: 600,
      lenderFees: 350,
      settlementAdjustments: 900,
      buildingInsurance: 1600,
      movingCosts: 4500,
      bufferMonths: 6,
      capitaliseLmi: true,
    })
  })

  it('falls back to the default for non-numeric numbers', () => {
    expect(parse('price=abc').price).toBe(DEFAULT_INPUTS.price)
    expect(parse('rate=NaN').interestRatePct).toBe(DEFAULT_INPUTS.interestRatePct)
    expect(parse('price=Infinity').price).toBe(DEFAULT_INPUTS.price)
    expect(parse('price=').price).toBe(DEFAULT_INPUTS.price)
  })

  it('clamps out-of-range numbers to the allowed range', () => {
    expect(parse('price=-5').price).toBe(0)
    expect(parse('price=999999999999').price).toBe(100_000_000)
    expect(parse('dep=250').depositPct).toBe(100)
    expect(parse('rate=99').interestRatePct).toBe(25)
    expect(parse('bufm=100').bufferMonths).toBe(24)
  })

  it('falls back to the default for unknown enum values', () => {
    expect(parse('route=jetski').route).toBe(DEFAULT_INPUTS.route)
    expect(parse('region=moon').region).toBe(DEFAULT_INPUTS.region)
  })

  it('treats anything but 1/0 as the boolean default', () => {
    expect(parse('fhb=0').firstHomeBuyer).toBe(false)
    expect(parse('caplmi=1').capitaliseLmi).toBe(true)
    expect(parse('fhb=true').firstHomeBuyer).toBe(DEFAULT_INPUTS.firstHomeBuyer)
    expect(parse('caplmi=yes').capitaliseLmi).toBe(DEFAULT_INPUTS.capitaliseLmi)
  })

  it('ignores unknown keys', () => {
    expect(parse('utm_source=share&junk=1&price=800000')).toEqual({
      ...DEFAULT_INPUTS,
      price: 800_000,
    })
  })

  it('clamps a deposit below the route minimum', () => {
    expect(parse('dep=3').depositPct).toBe(5)
    expect(parse('dep=1&route=htb').depositPct).toBe(2)
    expect(parse('dep=3&route=lmi').depositPct).toBe(3)
  })
})

describe('round-trip', () => {
  const states: Array<[string, CalculatorInputs]> = [
    ['defaults', DEFAULT_INPUTS],
    ['non-default numbers', { ...DEFAULT_INPUTS, price: 1_050_000, interestRatePct: 5.85 }],
    [
      'htb route',
      { ...DEFAULT_INPUTS, route: 'htb', depositPct: 2, newHome: true, region: 'regional' },
    ],
    [
      'everything flipped',
      {
        price: 12_345_678,
        route: 'nolmi',
        depositPct: 20,
        region: 'regional',
        firstHomeBuyer: false,
        ownerOccupier: false,
        newHome: true,
        offThePlanConstruction: 200_000,
        foreignPurchaser: true,
        interestRatePct: 7.25,
        conveyancing: 2000,
        buildingAndPest: 700,
        lenderFees: 500,
        settlementAdjustments: 1000,
        buildingInsurance: 1800,
        movingCosts: 6000,
        bufferMonths: 12,
        capitaliseLmi: true,
      },
    ],
  ]

  it.each(states)('parse(serialise(x)) === x for %s', (_name, state) => {
    expect(parseParams(serialiseParams(state))).toEqual(state)
  })

  it('serialise(parse(q)) is canonical: sorted, validated, defaults omitted', () => {
    const cleaned = serialiseParams(parse('junk=1&route=lmi&price=abc&dep=250&fhb=1'))
    expect(cleaned.toString()).toBe('dep=100&route=lmi')
  })
})
