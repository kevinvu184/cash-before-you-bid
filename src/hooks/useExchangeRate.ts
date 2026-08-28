import { useEffect, useState } from 'react'
import { BASE_CURRENCY, type DisplayCurrency } from '../logic/currencyConfig'
import {
  FALLBACK_RATES,
  isValidRate,
  parseQuote,
  RATE_ENDPOINT,
  RATE_MAX_AGE_MS,
  type Quote,
} from '../logic/exchangeRate'

// Live rates for the display switch, with the assumption that the network is
// slow, flaky, or absent. There is always a rate to show — the bundled
// indicative one — so nothing here can leave the page without figures; what
// changes is only how the rate line describes where the number came from.

export type RateStatus =
  /** No conversion needed: the display currency is the one amounts are held in. */
  | 'base'
  /** A request is in flight and nothing cached was good enough to show. */
  | 'loading'
  /** A quote from the provider, live this session or cached from a recent one. */
  | 'live'
  /** The bundled indicative rate, because the network failed or was refused. */
  | 'fallback'

export interface ExchangeRate {
  rate: number
  status: RateStatus
  /** When the provider repriced, for a 'live' rate. */
  updatedAt: number | null
}

const CACHE_PREFIX = 'cbyb_rate_'

interface CachedQuote extends Quote {
  /** When we stored it, which is what staleness is measured against. */
  fetchedAt: number
}

// Private mode and disabled site data both throw on access rather than
// returning empty, so every touch of storage is guarded and a failure just
// means we fetch again next time.
function readCache(currency: DisplayCurrency): CachedQuote | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + currency)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { rate, updatedAt, fetchedAt } = parsed as Record<string, unknown>
    if (!isValidRate(rate)) return null
    if (typeof updatedAt !== 'number' || typeof fetchedAt !== 'number') return null
    if (!Number.isFinite(updatedAt) || !Number.isFinite(fetchedAt)) return null
    return { rate, updatedAt, fetchedAt }
  } catch {
    return null
  }
}

// The base currency needs no quote at all, so it never consults the cache.
function cachedFor(currency: DisplayCurrency): CachedQuote | null {
  return currency === BASE_CURRENCY ? null : readCache(currency)
}

function writeCache(currency: DisplayCurrency, quote: CachedQuote): void {
  try {
    localStorage.setItem(CACHE_PREFIX + currency, JSON.stringify(quote))
  } catch {
    // A rate we cannot cache is still a rate we can show.
  }
}

/**
 * The rate to convert base-currency amounts into `currency`.
 *
 * Nothing is fetched for the base currency itself, so the default view costs
 * no request at all; the first switch to another currency is what goes to the
 * network. A cached quote renders immediately and is refreshed in the
 * background once it ages past RATE_MAX_AGE_MS.
 */
export function useExchangeRate(currency: DisplayCurrency): ExchangeRate {
  const [quote, setQuote] = useState<CachedQuote | null>(() => cachedFor(currency))
  const [failed, setFailed] = useState(false)
  const [quotedFor, setQuotedFor] = useState<DisplayCurrency>(currency)

  // A switch of currency invalidates the quote held for the previous one.
  // Adjusted during render rather than in an effect so no frame is ever
  // painted with one currency's rate under another currency's symbol; the
  // cache makes the replacement immediate where there is one to read.
  if (quotedFor !== currency) {
    setQuotedFor(currency)
    setQuote(cachedFor(currency))
    setFailed(false)
  }

  useEffect(() => {
    if (currency === BASE_CURRENCY) return

    const cached = readCache(currency)
    if (cached !== null && Date.now() - cached.fetchedAt < RATE_MAX_AGE_MS) return

    const controller = new AbortController()
    let stale = false
    const load = async () => {
      try {
        const response = await fetch(RATE_ENDPOINT, { signal: controller.signal })
        if (!response.ok) throw new Error(`rate request failed: ${response.status}`)
        const fresh = parseQuote(await response.json(), currency)
        if (fresh === null) throw new Error('rate response was not usable')
        if (stale) return
        const stored: CachedQuote = { ...fresh, fetchedAt: Date.now() }
        writeCache(currency, stored)
        setQuote(stored)
        setFailed(false)
      } catch {
        // Includes the abort on unmount, which is not worth distinguishing:
        // the component is gone and nothing reads the flag.
        if (!stale) setFailed(true)
      }
    }
    void load()

    return () => {
      stale = true
      controller.abort()
    }
  }, [currency])

  if (currency === BASE_CURRENCY) {
    return { rate: 1, status: 'base', updatedAt: null }
  }
  if (quote !== null) {
    return { rate: quote.rate, status: 'live', updatedAt: quote.updatedAt }
  }
  return {
    rate: FALLBACK_RATES[currency],
    status: failed ? 'fallback' : 'loading',
    updatedAt: null,
  }
}
