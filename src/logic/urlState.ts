import { DEFAULT_INPUTS } from '../data/defaults'
import type { CalculatorInputs, DepositRoute, Region } from '../types/calculator'
import { clampDepositPct } from './deposit'

// The URL query string is the persistence layer for everything the user can
// change. Param names reuse the original page's element ids so links stay
// short and stable. The full table (name, type, allowed values, default) is
// documented in README.md.
//
//   adj bp bufm caplmi conv dep fhb foreign ins lender move newhome otp ppr
//   price rate region route
//
// Params equal to their default are omitted; keys are emitted alphabetically
// so the same state always produces the same URL. Booleans are 1/0.

export type AppState = CalculatorInputs

const ROUTES: readonly DepositRoute[] = ['scheme', 'lmi', 'nolmi', 'htb']
const REGIONS: readonly Region[] = ['metro', 'regional']

// Allowed ranges; values outside them are clamped on read.
const PRICE_MAX = 100_000_000
const COST_MAX = 1_000_000
const RATE_MAX = 25
const PCT_MAX = 100
const BUFFER_MONTHS_MAX = 24

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
    depositPct: readNumber(searchParams, 'dep', d.depositPct, 0, PCT_MAX),
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
    capitaliseLmi: readBoolean(searchParams, 'caplmi', d.capitaliseLmi),
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
  num('bp', state.buildingAndPest, d.buildingAndPest)
  num('bufm', state.bufferMonths, d.bufferMonths)
  bool('caplmi', state.capitaliseLmi, d.capitaliseLmi)
  num('conv', state.conveyancing, d.conveyancing)
  num('dep', state.depositPct, d.depositPct)
  bool('fhb', state.firstHomeBuyer, d.firstHomeBuyer)
  bool('foreign', state.foreignPurchaser, d.foreignPurchaser)
  num('ins', state.buildingInsurance, d.buildingInsurance)
  num('lender', state.lenderFees, d.lenderFees)
  num('move', state.movingCosts, d.movingCosts)
  bool('newhome', state.newHome, d.newHome)
  num('otp', state.offThePlanConstruction, d.offThePlanConstruction)
  bool('ppr', state.ownerOccupier, d.ownerOccupier)
  num('price', state.price, d.price)
  num('rate', state.interestRatePct, d.interestRatePct)
  str('region', state.region, d.region)
  str('route', state.route, d.route)
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return new URLSearchParams(entries)
}
