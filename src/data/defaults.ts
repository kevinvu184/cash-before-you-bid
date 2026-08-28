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
  // 1 keeps the whole-search figures equal to the per-property ones, so the
  // calculator behaves exactly as it did for anyone who ignores the field.
  propertiesConsidered: 1,
}
