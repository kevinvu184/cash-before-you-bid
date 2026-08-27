import { describe, expect, it } from 'vitest'
import { formatMoney, formatPercent, formatRowAmount } from './format'

describe('formatMoney', () => {
  it('rounds and groups like the original fmt()', () => {
    expect(formatMoney(102621.16439248709)).toBe('$102,621')
    expect(formatMoney(40070)).toBe('$40,070')
    expect(formatMoney(4363.841464162364)).toBe('$4,364')
    expect(formatMoney(0)).toBe('$0')
  })
})

describe('formatPercent', () => {
  it('rounds to two decimals like the original pct()', () => {
    expect(formatPercent(95)).toBe('95%')
    expect(formatPercent(6.270618666666667)).toBe('6.27%')
    expect(formatPercent(9.200000000000001)).toBe('9.2%')
    expect(formatPercent(6.2)).toBe('6.2%')
  })
})

describe('formatRowAmount', () => {
  it('renders negatives as a typographic minus before the absolute value', () => {
    expect(formatRowAmount(-10000)).toBe('−$10,000')
    expect(formatRowAmount(37500)).toBe('$37,500')
  })
})
