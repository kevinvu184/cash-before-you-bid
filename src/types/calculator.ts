export type DepositRoute = 'scheme' | 'lmi' | 'nolmi' | 'htb'

export type Region = 'metro' | 'regional'

export interface CalculatorInputs {
  price: number
  route: DepositRoute
  depositPct: number
  region: Region
  firstHomeBuyer: boolean
  ownerOccupier: boolean
  newHome: boolean
  offThePlanConstruction: number
  foreignPurchaser: boolean
  interestRatePct: number
  conveyancing: number
  buildingAndPest: number
  lenderFees: number
  settlementAdjustments: number
  buildingInsurance: number
  movingCosts: number
  bufferMonths: number
  capitaliseLmi: boolean
}

export type FlagKind = 'warn' | 'note' | 'ok'

// Logic emits codes and numeric params, never display text; the UI maps each
// code to a translation and formats the params for the active locale.
export type FlagCode =
  | 'schemeNotNeeded'
  | 'schemeCapExceeded'
  | 'schemeResidency'
  | 'schemeOwnerOccupier'
  | 'htbCapExceeded'
  | 'htbCitizenship'
  | 'htbDetails'
  | 'guarantorGap'
  | 'fhogPriceCap'
  | 'genuineSavings'
  | 'serviceability'

export interface Flag {
  kind: FlagKind
  code: FlagCode
  params?: Readonly<Record<string, number>>
}

export type DutyHowCode =
  | 'dutyFhbExempt'
  | 'dutyFhbConcession'
  | 'dutyFhbAboveCap'
  | 'dutyPpr'
  | 'dutyGeneral'

export type HowCode =
  | DutyHowCode
  | 'foreignDuty'
  | 'transferFee'
  | 'mortgageFeeLoan'
  | 'mortgageFeeNoLoan'
  | 'pexaBoth'
  | 'pexaTransferOnly'
  | 'lmiHtb'
  | 'lmiScheme'
  | 'lmiLvrUnder80'
  | 'lmiGuarantor'
  | 'lmiCharged'
  | 'lmiChargedCapitalised'
  | 'yourFigure'
  | 'conveyancing'
  | 'settlementAdjustments'
  | 'buildingInsurance'
  | 'grant'
  | 'deposit'
  | 'costsSubtotal'
  | 'buffer'
  | 'noBuffer'
  | 'total'

// The off-the-plan concession prefixes the stamp-duty working; carried as
// data so the UI can render the prefix and the working as one sentence.
export interface OffThePlanHow {
  price: number
  construction: number
  dutiableValue: number
}

export interface RowHow {
  code: HowCode
  params?: Readonly<Record<string, number>>
  offThePlan?: OffThePlanHow | null
}

export type RowCode =
  | 'deposit'
  | 'stampDuty'
  | 'foreignDuty'
  | 'transferFee'
  | 'mortgageFee'
  | 'pexaFees'
  | 'lmi'
  | 'conveyancing'
  | 'buildingAndPest'
  | 'lenderFees'
  | 'settlementAdjustments'
  | 'buildingInsurance'
  | 'grant'
  | 'costsSubtotal'
  | 'moving'
  | 'buffer'
  | 'total'

/**
 * When the money actually leaves the account. Ordered as a purchase runs:
 * inspections and the contract review are spent win or lose, the deposit falls
 * due on the hammer, everything statutory settles weeks later, and the last
 * band is what you still need afterwards.
 */
export type TimingBand = 'preAuction' | 'auctionDay' | 'atSettlement' | 'afterSettlement'

export interface TableRow {
  code: RowCode
  amount: number
  how: RowHow | null
  emphasis: boolean
  /**
   * `null` for summary rows (`costsSubtotal`, `total`), which sit outside the
   * timing bands because they add across them.
   */
  band: TimingBand | null
}

export interface CalculationTiles {
  total: { value: number; deposit: number; costs: number; moving: number; buffer: number }
  deposit: { value: number; pct: number; price: number }
  // pctOfPrice is null when there is no price to take a share of.
  costs: { value: number; pctOfPrice: number | null }
  loan: { value: number; lvrPct: number; governmentEquity: number }
  repayment: { value: number; ratePct: number; assessedRatePct: number; assessedValue: number }
}

export interface CalculationTotals {
  deposit: number
  purchaseCosts: number
  loan: number
  lvrPct: number
  monthlyRepayment: number
  assessedRepayment: number
  buffer: number
  totalCash: number
  governmentEquity: number
  lmiPremium: number
  lmiCash: number
  stampDuty: number
  dutiableValue: number
  grant: number
}

export interface CalculationResult {
  appliedDepositPct: number
  flags: Flag[]
  tiles: CalculationTiles
  rows: TableRow[]
  totals: CalculationTotals
}
