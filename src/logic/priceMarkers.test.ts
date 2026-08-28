import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FHB_CONCESSION_CEILING,
  FHB_EXEMPTION_CEILING,
  type PurchaserStatus,
} from '../data/rates'
import {
  PRICE_SLIDER_BASE_MAX,
  PRICE_SLIDER_MIN,
  PRICE_SLIDER_STEP,
  buildPriceMarkers,
  buildPriceSliderField,
  priceSliderMax,
} from './priceMarkers'
import { PRICE_MAX } from './urlState'

// The duty cliffs, as positions on a track. Two things are being held here:
// that the markers come from the rate config rather than from figures typed
// into this feature, and that they are shown only to a purchaser the config
// says those thresholds actually apply to.

const eligible: PurchaserStatus = {
  firstHomeBuyer: true,
  ownerOccupier: true,
  foreignPurchaser: false,
}

const markersFor = (purchaser: Partial<PurchaserStatus>) =>
  buildPriceMarkers({ ...eligible, ...purchaser }, PRICE_SLIDER_BASE_MAX)

describe('the duty cliff markers', () => {
  it('sits each marker at the rate config’s own threshold', () => {
    const [exemption, concession] = markersFor({})

    expect(exemption.value).toBe(FHB_EXEMPTION_CEILING)
    expect(concession.value).toBe(FHB_CONCESSION_CEILING)
  })

  it('places each marker at its threshold’s share of the track', () => {
    const max = PRICE_SLIDER_BASE_MAX
    const [exemption, concession] = buildPriceMarkers(eligible, max)

    // Derived from the config value and the track, not from a stored figure:
    // move a threshold in the config and the marker moves with it.
    expect(exemption.positionPct).toBeCloseTo((FHB_EXEMPTION_CEILING / max) * 100, 10)
    expect(concession.positionPct).toBeCloseTo((FHB_CONCESSION_CEILING / max) * 100, 10)
    expect(exemption.positionPct).toBeLessThan(concession.positionPct)
  })

  it('re-places the markers when the track grows under them', () => {
    const wide = priceSliderMax(3_000_000)
    const [exemption] = buildPriceMarkers(eligible, wide)
    const [onBaseTrack] = buildPriceMarkers(eligible, PRICE_SLIDER_BASE_MAX)

    expect(wide).toBeGreaterThan(PRICE_SLIDER_BASE_MAX)
    expect(exemption.value).toBe(onBaseTrack.value)
    expect(exemption.positionPct).toBeLessThan(onBaseTrack.positionPct)
  })

  it('writes neither threshold into this module', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'priceMarkers.ts'),
      'utf8',
    )
    // The whole reason this feature waited on the versioned rate config: a
    // threshold written here would stop tracking the config the day it moved.
    for (const threshold of [FHB_EXEMPTION_CEILING, FHB_CONCESSION_CEILING]) {
      expect(source).not.toContain(String(threshold))
      expect(source).not.toContain(String(threshold).replace(/\B(?=(\d{3})+$)/g, '_'))
    }
  })

  it('drops a threshold that would fall off the end of the track', () => {
    // A track shorter than the concession ceiling has nowhere to draw it; a
    // marker pinned to the edge would point at the wrong price.
    const markers = buildPriceMarkers(eligible, FHB_EXEMPTION_CEILING)

    expect(markers.map((marker) => marker.value)).toEqual([FHB_EXEMPTION_CEILING])
  })
})

describe('who sees the cliffs', () => {
  it('shows both to an eligible first home buyer', () => {
    expect(markersFor({}).map((marker) => marker.id)).toEqual(['fhbExemption', 'fhbConcession'])
  })

  it.each([
    ['not a first home buyer', { firstHomeBuyer: false }],
    ['not buying to live in it', { ownerOccupier: false }],
    // A foreign purchaser gets neither the exemption nor the concession, so
    // neither cliff is theirs — showing one would misstate their own duty.
    ['a foreign purchaser', { foreignPurchaser: true }],
  ])('shows none to %s', (_case, purchaser) => {
    expect(markersFor(purchaser)).toEqual([])
  })
})

describe('the slider’s track', () => {
  it('runs to the base maximum for an ordinary price', () => {
    expect(priceSliderMax(0)).toBe(PRICE_SLIDER_BASE_MAX)
    expect(priceSliderMax(820_000)).toBe(PRICE_SLIDER_BASE_MAX)
    expect(priceSliderMax(PRICE_SLIDER_BASE_MAX)).toBe(PRICE_SLIDER_BASE_MAX)
  })

  it('grows to cover a price above it, so the thumb still means the value', () => {
    // A track that stopped short would park the thumb at its end, and the next
    // nudge would drag the typed price down to the end of the track.
    expect(priceSliderMax(3_000_000)).toBe(3_000_000)
    // Rounded up to a whole step, so the track's own end is a callable price.
    expect(priceSliderMax(2_000_001)).toBe(2_005_000)
    expect(priceSliderMax(3_000_000) % PRICE_SLIDER_STEP).toBe(0)
  })

  it('never offers a price the URL codec would clamp away', () => {
    expect(priceSliderMax(PRICE_MAX)).toBe(PRICE_MAX)
    expect(priceSliderMax(PRICE_MAX * 2)).toBe(PRICE_MAX)
  })

  it('falls back to the base maximum for a price that is not a number', () => {
    expect(priceSliderMax(Number.NaN)).toBe(PRICE_SLIDER_BASE_MAX)
  })
})

describe('the price slider field', () => {
  it('carries the price, its bounds and the markers that apply', () => {
    const field = buildPriceSliderField(700_000, eligible, () => {})

    expect(field.id).toBe('priceSlider')
    expect(field.value).toBe(700_000)
    expect(field.min).toBe(PRICE_SLIDER_MIN)
    expect(field.max).toBe(PRICE_SLIDER_BASE_MAX)
    expect(field.step).toBe(PRICE_SLIDER_STEP)
    expect(field.markers).toHaveLength(2)
  })

  it.each([
    // The number field takes anything that parses and deliberately does not
    // snap it; the track cannot hold either of these, and a browser would
    // clamp them silently — leaving the thumb at an end while the price says
    // otherwise, so the next nudge would drag the typed price there.
    ['a negative price', -5, PRICE_SLIDER_MIN],
    ['a price past the codec ceiling', PRICE_MAX * 2, PRICE_MAX],
    ['a price that is not a number', Number.NaN, PRICE_SLIDER_MIN],
  ])('shows %s as the nearest point the track can represent', (_case, price, expected) => {
    const field = buildPriceSliderField(price, eligible, () => {})

    expect(field.value).toBe(expected)
    expect(field.value).toBeGreaterThanOrEqual(field.min)
    expect(field.value).toBeLessThanOrEqual(field.max)
  })

  it('leaves a price the track can represent exactly as it is', () => {
    // Only what the slider shows is bounded; the price itself is untouched.
    for (const price of [0, 1, 749_000, PRICE_SLIDER_BASE_MAX, 3_000_000]) {
      expect(buildPriceSliderField(price, eligible, () => {}).value).toBe(price)
    }
  })

  it('reports a price through onChange and nothing else', () => {
    const seen: number[] = []
    buildPriceSliderField(700_000, eligible, (next) => seen.push(next)).onChange(605_000)

    expect(seen).toEqual([605_000])
  })

  it('lands the step on both thresholds, so a bid can sit exactly on one', () => {
    // A step that straddled a ceiling would make the one price that matters
    // unreachable with the keyboard.
    expect(FHB_EXEMPTION_CEILING % PRICE_SLIDER_STEP).toBe(0)
    expect(FHB_CONCESSION_CEILING % PRICE_SLIDER_STEP).toBe(0)
  })
})
