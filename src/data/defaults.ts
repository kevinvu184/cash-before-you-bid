import type { CalculatorInputs } from '../types/calculator'

export const DEFAULT_INPUTS: CalculatorInputs = {
  price: 750_000,
  route: 'scheme',
  depositPct: 5,
  region: 'metro',
  firstHomeBuyer: true,
  ownerOccupier: true,
  newHome: false,
  offThePlanConstruction: 0,
  foreignPurchaser: false,
  interestRatePct: 6.2,
  conveyancing: 1600,
  buildingAndPest: 550,
  lenderFees: 300,
  settlementAdjustments: 800,
  buildingInsurance: 1500,
  movingCosts: 4000,
  bufferMonths: 3,
  capitaliseLmi: false,
  // No plausible default exists for someone else's bank balance, and inventing
  // one would tell a bidder they are covered on a figure they never entered.
  savings: 0,
  // Null, not 0: "not yet pre-approved" suppresses the finance check.
  preApprovedLoan: null,
  // 1 keeps the whole-search figures equal to the per-property ones, so the
  // calculator behaves exactly as it did for anyone who ignores the field.
  propertiesConsidered: 1,
}
