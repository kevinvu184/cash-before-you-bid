import { describe, expect, it } from 'vitest'
import { DEFAULT_URL_STATE, parsePresentation, parseUrlState, serialiseUrlState } from './urlState'

const parse = (query: string) => parsePresentation(new URLSearchParams(query))

describe('parsePresentation', () => {
  it('defaults to the default skin and the operating system mode', () => {
    expect(parse('')).toEqual({ skin: 'default', mode: 'system' })
  })

  it('reads a known skin and mode', () => {
    expect(parse('skin=plain&mode=dark')).toEqual({
      skin: 'plain',
      mode: 'dark',
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
      presentation: { skin: 'plain' as const, mode: 'dark' as const },
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
