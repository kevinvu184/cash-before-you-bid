import {
  FHB_CONCESSION_CEILING,
  FHB_EXEMPTION_CEILING,
  firstHomeConcessionApplies,
  type PurchaserStatus,
} from '../data/rates'
import {
  CLIFF_DESCRIPTION_KEY,
  CLIFF_TERM_KEY,
  CLIFFS_LABEL_KEY,
  PRICE_SLIDER_LABEL_KEY,
} from './fieldLabels'
import { PRICE_MAX } from './urlState'
import type { PriceMarker, PriceSliderField } from '../types/viewModel'

/**
 * The price slider and the two duty cliffs on its track.
 *
 * Victorian first home buyer duty is not a curve; it is a step. Nothing is
 * payable up to the exemption ceiling, a sliding concession runs from there to
 * the concession ceiling, and above it the full duty applies. Between the last
 * dollar under a ceiling and the first dollar over it the total on this page
 * moves by tens of thousands, which is invisible in a bare number field: the
 * user has to happen to type across the threshold to find out it was there.
 *
 * **Every position on this track is read from `data/rates.ts`.** The two
 * ceilings are the config's own constants, so moving a threshold there moves
 * the marker with it and nothing here needs editing — that is the whole reason
 * this waited on the versioned rate config. No figure below is written twice.
 */

/**
 * How far one arrow-key press moves the slider. Big enough that crossing the
 * concession band is a few seconds of holding a key, small enough that a
 * bidder can settle on a real bidding increment — and a divisor of both
 * ceilings, so the thumb can land exactly on a cliff rather than straddling
 * it, which a test asserts against the config's own figures.
 *
 * A price the user *typed* need not be a multiple of it, and a browser snaps
 * the thumb to the nearest one when it is not. That is display only — the
 * price itself is whatever was typed, and the thumb is at most half a step
 * out, well under a pixel on this track — and it is the behaviour worth
 * having: a price the slider produces is always a figure that can be called
 * out at an auction, the same instinct as the safe maximum bid's rounding.
 */
export const PRICE_SLIDER_STEP = 5_000


/**
 * The track's usual top end. Deliberately *not* derived from the first home
 * buyer ceilings: if it were, the markers would sit at the same fraction of
 * the track whatever the config said, and a threshold moving would not be
 * visible. Fixed, the ceilings move along a stable ruler.
 *
 * $1.5m covers the great majority of Victorian residential sales and leaves
 * both cliffs in the left half of the track, where their labels have room.
 */
export const PRICE_SLIDER_BASE_MAX = 1_500_000

/** The bottom of the track. A price below it is not a price. */
export const PRICE_SLIDER_MIN = 0

/**
 * The track's top end for a given price. It grows to cover a price above the
 * base maximum, rounded up to a whole step, so the thumb always represents the
 * real value: a track that stopped short would park the thumb at its end, and
 * the next nudge would silently drag a $3m price down to $1.5m — the slider
 * fighting the field, which is exactly what must not happen.
 *
 * Capped at `PRICE_MAX`, the ceiling the price itself is clamped to, so the
 * track can never offer a price the URL codec would clamp away.
 */
export function priceSliderMax(price: number): number {
  if (!Number.isFinite(price) || price <= PRICE_SLIDER_BASE_MAX) return PRICE_SLIDER_BASE_MAX
  const stepped = Math.ceil(price / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP
  return Math.min(PRICE_MAX, stepped)
}

/**
 * The price, as a point the track can actually represent.
 *
 * The number field takes anything that parses — a leading minus, a figure past
 * `PRICE_MAX` on the way to a longer one — and deliberately does not snap it.
 * A range control cannot hold those: a browser silently clamps an out-of-range
 * value, which would leave the thumb parked at an end while the price says
 * otherwise, and the next nudge would drag the typed price to that end. That
 * is the fight this pairing exists to avoid, so the clamp is stated here
 * rather than left to the browser. The price itself is untouched — only what
 * the slider can show is bounded.
 */
function clampToTrack(price: number, max: number): number {
  if (!Number.isFinite(price)) return PRICE_SLIDER_MIN
  return Math.min(max, Math.max(PRICE_SLIDER_MIN, price))
}

/** Where a threshold sits along a track running from 0 to `max`, as a percent. */
function positionPct(value: number, max: number): number {
  return max <= 0 ? 0 : (value / max) * 100
}

/**
 * The cliffs this purchaser is actually standing on.
 *
 * Eligibility is `firstHomeConcessionApplies`, the rule stated once in the rate
 * config beside the thresholds it gates: someone who is not a first home
 * buyer, is not buying to live in it, or is a foreign purchaser gets neither
 * the exemption nor the concession, so neither cliff is theirs. Showing them
 * a marker for a threshold that cannot apply to them would be a lie about
 * their own duty, and the empty list is the honest answer.
 *
 * A threshold beyond the end of the track is dropped rather than pinned to the
 * edge: a marker has to point at a place on the track it is drawn on.
 */
export function buildPriceMarkers(
  purchaser: PurchaserStatus,
  max: number,
): readonly PriceMarker[] {
  if (!firstHomeConcessionApplies(purchaser)) return []
  const markers: PriceMarker[] = [
    {
      id: 'fhbExemption',
      value: FHB_EXEMPTION_CEILING,
      positionPct: positionPct(FHB_EXEMPTION_CEILING, max),
      labelKey: CLIFF_TERM_KEY.fhbExemption,
      description: {
        key: CLIFF_DESCRIPTION_KEY.fhbExemption,
        // Both are statutory ceilings rather than computed figures, so they
        // are quoted exactly: a rounded threshold would be the wrong number
        // to bid just under.
        params: { price: { format: 'moneyExact', value: FHB_EXEMPTION_CEILING } },
      },
    },
    {
      id: 'fhbConcession',
      value: FHB_CONCESSION_CEILING,
      positionPct: positionPct(FHB_CONCESSION_CEILING, max),
      labelKey: CLIFF_TERM_KEY.fhbConcession,
      description: {
        key: CLIFF_DESCRIPTION_KEY.fhbConcession,
        params: {
          from: { format: 'moneyExact', value: FHB_EXEMPTION_CEILING },
          price: { format: 'moneyExact', value: FHB_CONCESSION_CEILING },
        },
      },
    },
  ]
  return markers.filter((marker) => marker.value <= max)
}

/**
 * The slider itself: the same price the number field holds, on a track whose
 * top end covers it and carrying whichever cliffs apply.
 *
 * It reports whole prices through `onChange` and never touches the field's
 * draft, so a half-typed figure is never rewritten by the slider being there;
 * the draft's own rule (see `useNumericDraft`) reformats from the value only
 * once the value has actually changed under it.
 */
export function buildPriceSliderField(
  price: number,
  purchaser: PurchaserStatus,
  onChange: (next: number) => void,
): PriceSliderField {
  const max = priceSliderMax(price)
  return {
    id: 'priceSlider',
    controlId: 'price-slider',
    labelKey: PRICE_SLIDER_LABEL_KEY,
    value: clampToTrack(price, max),
    kind: 'money',
    importance: 'primary',
    min: PRICE_SLIDER_MIN,
    max,
    step: PRICE_SLIDER_STEP,
    markersLabelKey: CLIFFS_LABEL_KEY,
    markers: buildPriceMarkers(purchaser, max),
    onChange,
  }
}
