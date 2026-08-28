import { describe, expect, it } from 'vitest'
import { DEFAULT_URL_STATE, parsePresentation, parseUrlState, serialiseUrlState } from './urlState'

const parse = (query: string) => parsePresentation(new URLSearchParams(query))

describe('parsePresentation', () => {
  it('defaults to the default skin and the operating system mode', () => {
    expect(parse('')).toEqual({
      skin: 'default',
      mode: 'system',
      currency: 'AUD',
      manualRate: null,
    })
  })

  it('reads a known skin and mode', () => {
    expect(parse('skin=plain&mode=dark')).toEqual({
      skin: 'plain',
      mode: 'dark',
      currency: 'AUD',
      manualRate: null,
    })
  })

  it('falls back to the plain skin for an unknown id', () => {
    expect(parse('skin=neon').skin).toBe('plain')
  })

  it('falls back to the system mode for an unknown value', () => {
    expect(parse('mode=sepia').mode).toBe('system')
  })
})

describe('serialiseUrlState', () => {
  it('omits the default skin and the system mode', () => {
    expect(serialiseUrlState(DEFAULT_URL_STATE).toString()).toBe('')
  })

  it('writes the skin and mode alongside the calculator params, sorted', () => {
    const state = {
      app: { ...DEFAULT_URL_STATE.app, price: 900_000, lang: 'en' as const },
      presentation: {
        ...DEFAULT_URL_STATE.presentation,
        skin: 'plain' as const,
        mode: 'dark' as const,
      },
    }
    expect(serialiseUrlState(state).toString()).toBe('lang=en&mode=dark&price=900000&skin=plain')
  })

  it('rewrites an unknown skin to the fallback and drops an unknown mode', () => {
    const cleaned = serialiseUrlState(parseUrlState(new URLSearchParams('skin=neon&mode=sepia')))
    expect(cleaned.toString()).toBe('skin=plain')
  })

  it('round-trips through the URL', () => {
    const state = parseUrlState(new URLSearchParams('mode=light&price=620000&skin=plain'))
    expect(parseUrlState(serialiseUrlState(state))).toEqual(state)
  })
})

// The display currency and any rate override travel with the skin and mode:
// they change how the figures are written, not what was worked out, and a
// shared link has to reproduce what the sender was looking at.
describe('the display currency and rate', () => {
  it('defaults to the base currency and no override', () => {
    expect(parse('')).toMatchObject({ currency: 'AUD', manualRate: null })
  })

  it('reads a known currency and a usable rate', () => {
    expect(parse('cur=VND&fx=18700')).toMatchObject({ currency: 'VND', manualRate: 18_700 })
  })

  it('falls back to the base currency for one it cannot show', () => {
    expect(parse('cur=USD').currency).toBe('AUD')
    expect(parse('cur=nonsense').currency).toBe('AUD')
  })

  it('normalises a rate to the precision the page shows it at', () => {
    // A link carrying decimals would otherwise price every figure at a rate
    // the rate line rounds before showing; the codec writes the normalised
    // value back, so the link comes to agree with what it displays.
    expect(parse('fx=18707.672741').manualRate).toBe(18_708)
    const cleaned = serialiseUrlState(parseUrlState(new URLSearchParams('cur=VND&fx=18707.672741')))
    expect(cleaned.toString()).toBe('cur=VND&fx=18708')
  })

  it('treats an unusable rate as absent rather than clamping it', () => {
    // Clamping would show the reader figures priced at a rate they never
    // typed; dropping it falls back to the fetched one, which is honest.
    expect(parse('fx=0').manualRate).toBeNull()
    expect(parse('fx=-1').manualRate).toBeNull()
    expect(parse('fx=1e12').manualRate).toBeNull()
    expect(parse('fx=abc').manualRate).toBeNull()
    expect(parse('fx=').manualRate).toBeNull()
  })

  it('writes both alongside everything else, sorted', () => {
    const state = {
      app: { ...DEFAULT_URL_STATE.app, price: 900_000 },
      presentation: {
        ...DEFAULT_URL_STATE.presentation,
        currency: 'VND' as const,
        manualRate: 20_000,
      },
    }
    expect(serialiseUrlState(state).toString()).toBe('cur=VND&fx=20000&price=900000')
  })

  it('omits the base currency, and an override that is not in force', () => {
    expect(serialiseUrlState(DEFAULT_URL_STATE).toString()).toBe('')
  })

  it('round-trips a converted view', () => {
    const state = parseUrlState(new URLSearchParams('cur=VND&fx=17500&price=900000'))
    expect(parseUrlState(serialiseUrlState(state))).toEqual(state)
  })
})
