// @vitest-environment jsdom
import { StrictMode, useLayoutEffect } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useExchangeRate } from './useExchangeRate'
import { FALLBACK_RATES, RATE_MAX_AGE_MS } from '../logic/exchangeRate'
import type { DisplayCurrency } from '../logic/currencyConfig'

// A probe that renders what the hook returns, so the assertions read as what a
// component would actually show. Every committed value is also recorded, so a
// test can inspect the frames the user would have seen and not just the last.
function Probe({ currency, commits }: { currency: DisplayCurrency; commits?: string[] }) {
  const { rate, status } = useExchangeRate(currency)
  const shown = `${status}:${rate}`
  useLayoutEffect(() => {
    commits?.push(shown)
  })
  return <output data-testid="out">{shown}</output>
}

const out = () => screen.getByTestId('out').textContent

const CACHED_RATE = 16_000
const LIVE_RATE = 17_500

function seedCache(ageMs: number, rate = CACHED_RATE) {
  localStorage.setItem(
    'cbyb_rate_VND',
    JSON.stringify({ rate, updatedAt: Date.now() - ageMs, fetchedAt: Date.now() - ageMs }),
  )
}

function respondWith(rate: number) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ result: 'success', base_code: 'AUD', time_last_update_unix: 1_800_000_000, rates: { VND: rate } }),
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('rate provenance', () => {
  it('reports a fresh cached quote as live without going to the network', async () => {
    seedCache(1000)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<Probe currency="VND" />)

    expect(out()).toBe(`live:${CACHED_RATE}`)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshes a stale cached quote and reports the new one as live', async () => {
    seedCache(RATE_MAX_AGE_MS + 1000)
    vi.stubGlobal('fetch', respondWith(LIVE_RATE))

    render(<Probe currency="VND" />)

    // The stale quote shows immediately rather than a spinner...
    expect(out()).toBe(`live:${CACHED_RATE}`)
    // ...and is replaced once the refresh lands.
    await waitFor(() => expect(out()).toBe(`live:${LIVE_RATE}`))
  })

  it('keeps a stale quote but marks it stale when the refresh fails', async () => {
    seedCache(RATE_MAX_AGE_MS + 1000)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    render(<Probe currency="VND" />)

    // The figure stays the real provider quote — the bundled constant only
    // ages further, so swapping to it would be a downgrade — but the status
    // stops claiming the quote is current.
    await waitFor(() => expect(out()).toBe(`stale:${CACHED_RATE}`))
    expect(out()).not.toContain(String(FALLBACK_RATES.VND))
  })

  it('falls back to the bundled rate when there is no cache and the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    render(<Probe currency="VND" />)

    await waitFor(() => expect(out()).toBe(`fallback:${FALLBACK_RATES.VND}`))
  })

  it('costs no request in the base currency', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<Probe currency="AUD" />)

    expect(out()).toBe('base:1')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('switching currency', () => {
  // The hook adjusts state during render when the currency changes, which is
  // React's documented "adjusting state when a prop changes" pattern. These
  // two tests pin the behaviour that pattern exists for, so a later move into
  // an effect cannot pass silently.
  it('paints no frame between currencies showing a rate it has a cache for', () => {
    seedCache(1000)
    vi.stubGlobal('fetch', respondWith(LIVE_RATE))
    const commits: string[] = []

    const { rerender } = render(<Probe currency="AUD" commits={commits} />)
    expect(out()).toBe('base:1')

    commits.length = 0
    rerender(<Probe currency="VND" commits={commits} />)

    // The switch commits the cached đồng quote directly. Adjusting this in an
    // effect instead would commit an intermediate frame first — 'loading' at
    // the bundled rate — and only then correct itself, which is the flash this
    // render-phase adjustment exists to prevent. Asserting on the committed
    // frames rather than the final DOM is what makes that difference visible:
    // act() flushes effects before the final state is read, so the two are
    // indistinguishable from the last frame alone.
    expect(commits).toEqual([`live:${CACHED_RATE}`])
  })

  it('runs clean under StrictMode, whose double render exercises the adjustment', async () => {
    seedCache(1000)
    vi.stubGlobal('fetch', respondWith(LIVE_RATE))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = render(
      <StrictMode>
        <Probe currency="AUD" />
      </StrictMode>,
    )
    await act(async () => {
      rerender(
        <StrictMode>
          <Probe currency="VND" />
        </StrictMode>,
      )
    })

    expect(out()).toBe(`live:${CACHED_RATE}`)
    expect(errors).not.toHaveBeenCalled()
  })
})
