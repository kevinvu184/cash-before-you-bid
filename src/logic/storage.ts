import type { CalculatorInputs, DepositRoute, Region } from '../types/calculator'
import { clampDepositPct } from './deposit'

// The original page persists under the same key using its element ids as field
// names, with number-input values stored as strings. Keeping that shape means
// stored data round-trips with the original page.
interface StoredInputs {
  price: string
  route: DepositRoute
  dep: string
  region: Region
  fhb: boolean
  ppr: boolean
  newhome: boolean
  otp: string
  foreign: boolean
  rate: string
  conv: string
  bp: string
  lender: string
  adj: string
  ins: string
  move: string
  bufm: string
  caplmi: boolean
}

const ROUTES: readonly DepositRoute[] = ['scheme', 'lmi', 'nolmi', 'htb']
const REGIONS: readonly Region[] = ['metro', 'regional']

const isRoute = (v: unknown): v is DepositRoute => ROUTES.includes(v as DepositRoute)
const isRegion = (v: unknown): v is Region => REGIONS.includes(v as Region)

export function serializeInputs(inputs: CalculatorInputs): string {
  const stored: StoredInputs = {
    price: String(inputs.price),
    route: inputs.route,
    dep: String(inputs.depositPct),
    region: inputs.region,
    fhb: inputs.firstHomeBuyer,
    ppr: inputs.ownerOccupier,
    newhome: inputs.newHome,
    otp: String(inputs.offThePlanConstruction),
    foreign: inputs.foreignPurchaser,
    rate: String(inputs.interestRatePct),
    conv: String(inputs.conveyancing),
    bp: String(inputs.buildingAndPest),
    lender: String(inputs.lenderFees),
    adj: String(inputs.settlementAdjustments),
    ins: String(inputs.buildingInsurance),
    move: String(inputs.movingCosts),
    bufm: String(inputs.bufferMonths),
    caplmi: inputs.capitaliseLmi,
  }
  return JSON.stringify(stored)
}

export function deserializeInputs(raw: string | null, defaults: CalculatorInputs): CalculatorInputs {
  if (raw === null) return defaults
  let stored: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return defaults
    stored = parsed as Record<string, unknown>
  } catch {
    return defaults
  }
  const num = (key: string, fallback: number): number => {
    if (!(key in stored)) return fallback
    const n = Number(stored[key])
    return Number.isFinite(n) ? n : fallback
  }
  const bool = (key: string, fallback: boolean): boolean =>
    key in stored ? Boolean(stored[key]) : fallback
  const route = isRoute(stored.route) ? stored.route : defaults.route
  const inputs: CalculatorInputs = {
    price: num('price', defaults.price),
    route,
    depositPct: num('dep', defaults.depositPct),
    region: isRegion(stored.region) ? stored.region : defaults.region,
    firstHomeBuyer: bool('fhb', defaults.firstHomeBuyer),
    ownerOccupier: bool('ppr', defaults.ownerOccupier),
    newHome: bool('newhome', defaults.newHome),
    offThePlanConstruction: num('otp', defaults.offThePlanConstruction),
    foreignPurchaser: bool('foreign', defaults.foreignPurchaser),
    interestRatePct: num('rate', defaults.interestRatePct),
    conveyancing: num('conv', defaults.conveyancing),
    buildingAndPest: num('bp', defaults.buildingAndPest),
    lenderFees: num('lender', defaults.lenderFees),
    settlementAdjustments: num('adj', defaults.settlementAdjustments),
    buildingInsurance: num('ins', defaults.buildingInsurance),
    movingCosts: num('move', defaults.movingCosts),
    bufferMonths: num('bufm', defaults.bufferMonths),
    capitaliseLmi: bool('caplmi', defaults.capitaliseLmi),
  }
  return { ...inputs, depositPct: clampDepositPct(inputs.route, inputs.depositPct) }
}
