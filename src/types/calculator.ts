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
  /** Cash the bidder can actually reach. Never negative. */
  savings: number
  /**
   * A pre-approved loan amount, or `null` for "not yet pre-approved".
   * `null` is not zero: it suppresses the finance check rather than failing
   * it, because a bidder without a pre-approval has not been told no — they
   * have not asked yet.
   */
  preApprovedLoan: number | null
  propertiesConsidered: number
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
  | 'fhbResidency'
  | 'fhogPriceCap'
  | 'genuineSavings'
  | 'serviceability'
  // Why the finance check matters at an auction, and why it was not run.
  | 'financeUnconditional'
  | 'noPreApproval'

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

/**
 * Which pocket a check draws on. The two are not interchangeable: a home loan
 * funds the balance of the purchase price and nothing else, so a cash gap and
 * a loan gap have different remedies and are never netted against each other.
 */
export type VerdictPocket = 'cash' | 'loan'

export type VerdictCheckCode = 'auctionDayCash' | 'settlementCash' | 'settlementLoan'

export interface PocketCheck {
  code: VerdictCheckCode
  pocket: VerdictPocket
  /** What this moment demands of that pocket. */
  required: number
  /** What the user has told us is in it. */
  available: number
  /** `required - available`, or 0 when the pocket covers it. */
  shortfall: number
}

/** The two moments a bidder has to survive. */
export type VerdictCode = 'auctionDay' | 'atSettlement'

export interface Verdict {
  code: VerdictCode
  /** The timing band this verdict reads its requirement from. */
  band: TimingBand
  checks: readonly PocketCheck[]
  covered: boolean
  /** The sum of this verdict's shortfalls; 0 when covered. */
  shortfall: number
}

export interface Readiness {
  /** Two verdicts, in the order the purchase runs. Never merged into one. */
  verdicts: readonly Verdict[]
  /**
   * Whether this purchase needs a loan at all. False on a 100% deposit, where
   * there is no balance to fund and so nothing for a finance check to ask.
   */
  loanRequired: boolean
  /**
   * True only when the loan check actually ran — a loan is needed *and* a
   * pre-approval was entered to test it against. False leaves the check absent
   * from the settlement verdict rather than failing it, and the UI must not
   * let that absence read as a pass.
   */
  financeChecked: boolean
}

/**
 * Which pocket runs out first at the safe maximum bid — the lever that moves
 * the number. `both` is the crossing case, where more savings and a bigger
 * pre-approval would each have to come at once; `none` means nothing in the
 * figures caps the bid below the search ceiling.
 */
export type SafeMaxBidBinding = 'cash' | 'loan' | 'both' | 'none'

/**
 * `bound` is the ordinary answer. `unaffordable` means even a price of nothing
 * leaves a check short — the costs that do not move with the price already
 * exceed the savings — so there is no price to report. `unbounded` means the
 * search reached the highest price the calculator takes with every check still
 * covered.
 */
export type SafeMaxBidStatus = 'bound' | 'unaffordable' | 'unbounded'

/**
 * The highest price that clears both verdicts. See src/logic/safeMaxBid.ts for
 * how it is solved and why it rounds down.
 */
export interface SafeMaxBidResult {
  /** The answer: covered, and a multiple of the bid rounding unit. */
  price: number
  /** The same ceiling solved to the cent, before the conservative rounding. */
  exact: number
  binding: SafeMaxBidBinding
  status: SafeMaxBidStatus
  /** Bisection steps taken; bounded, so a pathological input still returns. */
  iterations: number
}

/**
 * The pre-auction spend, per property and across a whole search. See
 * src/logic/sunkCost.ts for which rows count and why.
 */
export interface SunkCostSummary {
  /** Pre-auction costs for one property. */
  perProperty: number
  /** Properties bid on, after clamping. */
  properties: number
  /** perProperty × properties. */
  expectedTotal: number
  /** What the auctions you do not win cost: expectedTotal − perProperty. */
  onPropertiesNotWon: number
}

export interface CalculationResult {
  appliedDepositPct: number
  flags: Flag[]
  tiles: CalculationTiles
  rows: TableRow[]
  totals: CalculationTotals
  readiness: Readiness
  sunkCost: SunkCostSummary
}
