import { DEFAULT_INPUTS } from '../data/defaults'
import { DEFAULT_LANG, LANGS, type Lang } from './lang'
import type { CalculatorInputs, DepositRoute, Region } from '../types/calculator'
import { clampDepositPct, defaultDepositPctForRoute } from './deposit'
import {
  DEFAULT_SKIN_ID,
  FALLBACK_SKIN_ID,
  isColorMode,
  isSkinId,
  type ColorMode,
  type SkinId,
} from './skins'
import { PROPERTIES_MAX, PROPERTIES_MIN } from './sunkCost'

// The URL query string is the persistence layer for everything the user can
// change. Param names reuse the original page's element ids so links stay
// short and stable. The full table (name, type, allowed values, default) is
// documented in README.md.
//
//   adj bids bp bufm caplmi conv dep fhb foreign ins lang lender loan move
//   newhome otp ppr price rate region route save
//
// Params equal to their default are omitted; keys are emitted alphabetically
// so the same state always produces the same URL. Booleans are 1/0.

// The UI language rides in the same query string as the calculator inputs
// (?lang=vi / ?lang=en) so a shared link keeps its language.
export interface AppState extends CalculatorInputs {
  lang: Lang
}

export const DEFAULT_APP_STATE: AppState = { ...DEFAULT_INPUTS, lang: DEFAULT_LANG }

const ROUTES: readonly DepositRoute[] = ['scheme', 'lmi', 'nolmi', 'htb']
const REGIONS: readonly Region[] = ['metro', 'regional']

// Allowed ranges; values outside them are clamped on read. Exported because
// the inputs panel takes its min/max from here too: a field that accepts a
// figure this codec would clamp shows the user their number snapping to
// something else a moment after they typed it.
export const PRICE_MAX = 100_000_000
export const COST_MAX = 1_000_000
export const RATE_MAX = 25
export const PCT_MAX = 100
export const BUFFER_MONTHS_MAX = 24
// Savings and a pre-approval are both money the bidder holds, so they share
// the price ceiling rather than the per-cost one.
export const SAVINGS_MAX = PRICE_MAX
export const PRE_APPROVED_LOAN_MAX = PRICE_MAX

function readNumber(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = params.get(name)
  if (raw === null || raw.trim() === '') return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/**
 * An optional figure: absent or blank reads as `null` ("not answered"), which
 * is not the same as a `0` the user actually typed. Anything unparseable is
 * treated as absent rather than as zero, so a mangled link never invents a
 * pre-approval of nothing and fails the finance check on it.
 */
function readOptionalNumber(
  params: URLSearchParams,
  name: string,
  min: number,
  max: number,
): number | null {
  const raw = params.get(name)
  if (raw === null || raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

function readBoolean(params: URLSearchParams, name: string, fallback: boolean): boolean {
  const raw = params.get(name)
  if (raw === '1') return true
  if (raw === '0') return false
  return fallback
}

function readEnum<T extends string>(
  params: URLSearchParams,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = params.get(name)
  return allowed.includes(raw as T) ? (raw as T) : fallback
}

export function parseParams(searchParams: URLSearchParams): AppState {
  const d = DEFAULT_INPUTS
  const route = readEnum(searchParams, 'route', ROUTES, d.route)
  const inputs: AppState = {
    price: readNumber(searchParams, 'price', d.price, 0, PRICE_MAX),
    route,
    // The deposit's default follows the route (2% for HTB, 20% for no-LMI),
    // matching what changing the route in the UI resets it to.
    depositPct: readNumber(searchParams, 'dep', defaultDepositPctForRoute(route), 0, PCT_MAX),
    region: readEnum(searchParams, 'region', REGIONS, d.region),
    firstHomeBuyer: readBoolean(searchParams, 'fhb', d.firstHomeBuyer),
    ownerOccupier: readBoolean(searchParams, 'ppr', d.ownerOccupier),
    newHome: readBoolean(searchParams, 'newhome', d.newHome),
    offThePlanConstruction: readNumber(searchParams, 'otp', d.offThePlanConstruction, 0, PRICE_MAX),
    foreignPurchaser: readBoolean(searchParams, 'foreign', d.foreignPurchaser),
    interestRatePct: readNumber(searchParams, 'rate', d.interestRatePct, 0, RATE_MAX),
    conveyancing: readNumber(searchParams, 'conv', d.conveyancing, 0, COST_MAX),
    buildingAndPest: readNumber(searchParams, 'bp', d.buildingAndPest, 0, COST_MAX),
    lenderFees: readNumber(searchParams, 'lender', d.lenderFees, 0, COST_MAX),
    settlementAdjustments: readNumber(searchParams, 'adj', d.settlementAdjustments, 0, COST_MAX),
    buildingInsurance: readNumber(searchParams, 'ins', d.buildingInsurance, 0, COST_MAX),
    movingCosts: readNumber(searchParams, 'move', d.movingCosts, 0, COST_MAX),
    bufferMonths: readNumber(searchParams, 'bufm', d.bufferMonths, 0, BUFFER_MONTHS_MAX),
    propertiesConsidered: readNumber(
      searchParams,
      'bids',
      d.propertiesConsidered,
      PROPERTIES_MIN,
      PROPERTIES_MAX,
    ),
    capitaliseLmi: readBoolean(searchParams, 'caplmi', d.capitaliseLmi),
    savings: readNumber(searchParams, 'save', d.savings, 0, SAVINGS_MAX),
    preApprovedLoan: readOptionalNumber(searchParams, 'loan', 0, PRE_APPROVED_LOAN_MAX),
    lang: readEnum(searchParams, 'lang', LANGS, DEFAULT_LANG),
  }
  return { ...inputs, depositPct: clampDepositPct(inputs.route, inputs.depositPct) }
}

export function serialiseParams(state: AppState): URLSearchParams {
  const d = DEFAULT_INPUTS
  const entries: Array<[string, string]> = []
  const num = (name: string, value: number, fallback: number) => {
    if (value !== fallback) entries.push([name, String(value)])
  }
  const bool = (name: string, value: boolean, fallback: boolean) => {
    if (value !== fallback) entries.push([name, value ? '1' : '0'])
  }
  const str = (name: string, value: string, fallback: string) => {
    if (value !== fallback) entries.push([name, value])
  }
  num('adj', state.settlementAdjustments, d.settlementAdjustments)
  num('bids', state.propertiesConsidered, d.propertiesConsidered)
  num('bp', state.buildingAndPest, d.buildingAndPest)
  num('bufm', state.bufferMonths, d.bufferMonths)
  bool('caplmi', state.capitaliseLmi, d.capitaliseLmi)
  num('conv', state.conveyancing, d.conveyancing)
  num('dep', state.depositPct, defaultDepositPctForRoute(state.route))
  bool('fhb', state.firstHomeBuyer, d.firstHomeBuyer)
  bool('foreign', state.foreignPurchaser, d.foreignPurchaser)
  num('ins', state.buildingInsurance, d.buildingInsurance)
  str('lang', state.lang, DEFAULT_LANG)
  num('lender', state.lenderFees, d.lenderFees)
  // Omitted when it is null, which is the default: an absent `loan` param is
  // exactly "not yet pre-approved".
  if (state.preApprovedLoan !== null) entries.push(['loan', String(state.preApprovedLoan)])
  num('move', state.movingCosts, d.movingCosts)
  bool('newhome', state.newHome, d.newHome)
  num('otp', state.offThePlanConstruction, d.offThePlanConstruction)
  bool('ppr', state.ownerOccupier, d.ownerOccupier)
  num('price', state.price, d.price)
  num('rate', state.interestRatePct, d.interestRatePct)
  str('region', state.region, d.region)
  num('save', state.savings, d.savings)
  str('route', state.route, d.route)
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return new URLSearchParams(entries)
}

// ── presentation state ───────────────────────────────────────────────────────
//
// The skin and the colour mode ride in the same query string as everything
// else, so a shared link reproduces the exact view. They are kept beside the
// calculator state rather than inside it: `AppState` is what `calculate()`
// reads, and neither of these changes a number.
//
//   skin  <id>          omitted when it is the default skin
//   mode  light | dark  omitted while following the operating system

/** `'system'` means "no ?mode=": follow prefers-color-scheme, and keep following it. */
export type ModePreference = ColorMode | 'system'

export interface PresentationState {
  skin: SkinId
  mode: ModePreference
}

export const DEFAULT_PRESENTATION: PresentationState = {
  skin: DEFAULT_SKIN_ID,
  mode: 'system',
}

export interface UrlState {
  app: AppState
  presentation: PresentationState
}

export const DEFAULT_URL_STATE: UrlState = {
  app: DEFAULT_APP_STATE,
  presentation: DEFAULT_PRESENTATION,
}

export function parsePresentation(searchParams: URLSearchParams): PresentationState {
  const rawSkin = searchParams.get('skin')
  const rawMode = searchParams.get('mode')
  return {
    // Absent means the default skin; present-but-unknown means the plain
    // baseline, which is always renderable. Either way serialisePresentation
    // writes back the id that was actually used, and useUrlState rewrites the
    // query string with `replace`.
    skin: rawSkin === null ? DEFAULT_SKIN_ID : isSkinId(rawSkin) ? rawSkin : FALLBACK_SKIN_ID,
    mode: isColorMode(rawMode) ? rawMode : 'system',
  }
}

export function serialisePresentation(state: PresentationState): Array<[string, string]> {
  const entries: Array<[string, string]> = []
  if (state.skin !== DEFAULT_SKIN_ID) entries.push(['skin', state.skin])
  if (state.mode !== 'system') entries.push(['mode', state.mode])
  return entries
}

export function parseUrlState(searchParams: URLSearchParams): UrlState {
  return {
    app: parseParams(searchParams),
    presentation: parsePresentation(searchParams),
  }
}

export function serialiseUrlState(state: UrlState): URLSearchParams {
  const entries = [...serialiseParams(state.app), ...serialisePresentation(state.presentation)]
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return new URLSearchParams(entries)
}
