import { describe, expect, it } from 'vitest'
import {
  clampDepositPct,
  defaultDepositPctForRoute,
  depositHint,
  governmentEquityShare,
  regionPriceCap,
} from './deposit'

describe('regionPriceCap', () => {
  it('matches the scheme caps per region', () => {
    expect(regionPriceCap('metro')).toBe(950_000)
    expect(regionPriceCap('regional')).toBe(650_000)
  })
})

describe('clampDepositPct', () => {
  it('enforces the 5% scheme minimum', () => {
    expect(clampDepositPct('scheme', 3)).toBe(5)
    expect(clampDepositPct('scheme', 5)).toBe(5)
    expect(clampDepositPct('scheme', 10)).toBe(10)
  })

  it('enforces the 2% Help to Buy minimum', () => {
    expect(clampDepositPct('htb', 0)).toBe(2)
    expect(clampDepositPct('htb', 8)).toBe(8)
  })

  it('leaves other routes alone', () => {
    expect(clampDepositPct('lmi', 3)).toBe(3)
    expect(clampDepositPct('nolmi', 10)).toBe(10)
  })
})

describe('defaultDepositPctForRoute', () => {
  it('matches the original route-change handler', () => {
    expect(defaultDepositPctForRoute('scheme')).toBe(5)
    expect(defaultDepositPctForRoute('htb')).toBe(2)
    expect(defaultDepositPctForRoute('nolmi')).toBe(20)
    expect(defaultDepositPctForRoute('lmi')).toBe(10)
  })
})

describe('governmentEquityShare', () => {
  it('is 40% for new homes and 30% for existing under Help to Buy', () => {
    expect(governmentEquityShare('htb', true)).toBe(0.4)
    expect(governmentEquityShare('htb', false)).toBe(0.3)
  })

  it('is zero on every other route', () => {
    expect(governmentEquityShare('scheme', true)).toBe(0)
    expect(governmentEquityShare('lmi', false)).toBe(0)
  })
})

describe('depositHint', () => {
  it('matches the original hint text per route', () => {
    expect(depositHint('scheme')).toBe('Minimum 5% under the scheme')
    expect(depositHint('htb')).toBe('Minimum 2% under Help to Buy')
    expect(depositHint('nolmi')).toBe('20% avoids LMI without a guarantor')
    expect(depositHint('lmi')).toBe('Under 20%; LMI charged')
  })
})
