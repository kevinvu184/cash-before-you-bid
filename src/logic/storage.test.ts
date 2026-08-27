import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../data/defaults'
import { deserializeInputs, serializeInputs } from './storage'

describe('serializeInputs / deserializeInputs', () => {
  it('round-trips the default inputs', () => {
    expect(deserializeInputs(serializeInputs(DEFAULT_INPUTS), DEFAULT_INPUTS)).toEqual(
      DEFAULT_INPUTS,
    )
  })

  it('writes the original page storage shape (element ids, string values)', () => {
    const stored = JSON.parse(serializeInputs(DEFAULT_INPUTS)) as Record<string, unknown>
    expect(stored).toEqual({
      price: '750000',
      route: 'scheme',
      dep: '5',
      region: 'metro',
      fhb: true,
      ppr: true,
      newhome: false,
      otp: '0',
      foreign: false,
      rate: '6.2',
      conv: '1600',
      bp: '550',
      lender: '300',
      adj: '800',
      ins: '1500',
      move: '4000',
      bufm: '3',
      caplmi: false,
    })
  })

  it('reads data saved by the original page', () => {
    const raw = JSON.stringify({
      price: '820000',
      route: 'lmi',
      dep: '12',
      region: 'regional',
      fhb: false,
      ppr: true,
      newhome: false,
      otp: '0',
      foreign: false,
      rate: '5.9',
      conv: '1800',
      bp: '600',
      lender: '350',
      adj: '900',
      ins: '1600',
      move: '4500',
      bufm: '6',
      caplmi: true,
    })
    const parsed = deserializeInputs(raw, DEFAULT_INPUTS)
    expect(parsed.price).toBe(820_000)
    expect(parsed.route).toBe('lmi')
    expect(parsed.depositPct).toBe(12)
    expect(parsed.region).toBe('regional')
    expect(parsed.firstHomeBuyer).toBe(false)
    expect(parsed.bufferMonths).toBe(6)
    expect(parsed.capitaliseLmi).toBe(true)
  })

  it('falls back to defaults for missing storage, bad JSON, or non-objects', () => {
    expect(deserializeInputs(null, DEFAULT_INPUTS)).toEqual(DEFAULT_INPUTS)
    expect(deserializeInputs('not json', DEFAULT_INPUTS)).toEqual(DEFAULT_INPUTS)
    expect(deserializeInputs('42', DEFAULT_INPUTS)).toEqual(DEFAULT_INPUTS)
  })

  it('merges partial data onto defaults, like the original per-field restore', () => {
    const parsed = deserializeInputs(JSON.stringify({ price: '600000' }), DEFAULT_INPUTS)
    expect(parsed.price).toBe(600_000)
    expect(parsed.route).toBe('scheme')
    expect(parsed.conveyancing).toBe(1600)
  })

  it('rejects unknown route or region values', () => {
    const parsed = deserializeInputs(
      JSON.stringify({ route: 'jetski', region: 'moon' }),
      DEFAULT_INPUTS,
    )
    expect(parsed.route).toBe('scheme')
    expect(parsed.region).toBe('metro')
  })

  it('clamps a stored deposit below the route minimum', () => {
    const parsed = deserializeInputs(
      JSON.stringify({ route: 'scheme', dep: '3' }),
      DEFAULT_INPUTS,
    )
    expect(parsed.depositPct).toBe(5)
  })
})
