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

export interface Flag {
  kind: FlagKind
  message: string
}

export interface TableRow {
  label: string
  amount: number
  formatted: string
  how: string
  emphasis: boolean
}

export interface Tile {
  value: string
  sub: string
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
  depositHint: string
  flags: Flag[]
  tiles: {
    total: Tile
    deposit: Tile
    costs: Tile
    loan: Tile
    repayment: Tile
  }
  rows: TableRow[]
  totals: CalculationTotals
}
