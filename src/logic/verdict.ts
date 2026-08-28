import type {
  CalculationTotals,
  PocketCheck,
  Readiness,
  TimingBand,
  TableRow,
  Verdict,
  VerdictCheckCode,
  VerdictPocket,
} from '../types/calculator'
import { groupRowsByBand } from './bands'

/**
 * The verdict: given what the purchase costs and what the bidder has, is each
 * moment covered, or short by how much.
 *
 * Two checks, kept separate on purpose. A home loan funds the balance of the
 * purchase price; it does not fund duty, fees or the deposit. Netting a large
 * pre-approval against a cash gap would tell a bidder with no savings that
 * they are fine, and an auction contract is unconditional — there is no
 * finance clause and no cooling-off period to discover that in.
 *
 * The requirements are read off the calculator's timing bands (`bands.ts`),
 * never re-derived here: which costs fall due when is decided in exactly one
 * place, and this only asks each band for its subtotal.
 *
 * Issue #18 (safe maximum bid) inverts this. Everything it needs is a pure
 * function of a `CalculationResult` at a candidate price plus the two figures
 * below, so it can solve for the price at which every check reaches zero
 * shortfall without duplicating any of this arithmetic.
 */

/** Float noise only — half a cent. Below this, a gap is not a gap. */
const EPSILON = 0.005

/**
 * What the assessment reads from a calculation: the banded rows and the loan
 * the engine settled on. A whole `CalculationResult` satisfies it, and so does
 * a hand-built pair — which is what keeps this callable from a test fixture
 * and, later, from the safe-maximum-bid search.
 */
export interface ReadinessSource {
  rows: readonly TableRow[]
  totals: CalculationTotals
}

export interface ReadinessInputs {
  savings: number
  /** `null` means "not yet pre-approved": the finance check does not run. */
  preApprovedLoan: number | null
}

const orZero = (n: number): number => (Number.isFinite(n) ? n : 0)

/**
 * A band's subtotal, or 0 when the band has no rows. Clamped at zero: a band
 * whose grant outweighs its costs demands no cash, it does not hand any back.
 */
function bandRequirement(rows: readonly TableRow[], band: TimingBand): number {
  const group = groupRowsByBand(rows).find((candidate) => candidate.band === band)
  return Math.max(0, group?.subtotal ?? 0)
}

function pocketCheck(
  code: VerdictCheckCode,
  pocket: VerdictPocket,
  required: number,
  available: number,
): PocketCheck {
  const gap = required - available
  return { code, pocket, required, available, shortfall: gap > EPSILON ? gap : 0 }
}

function verdict(code: Verdict['code'], band: TimingBand, checks: PocketCheck[]): Verdict {
  const shortfall = checks.reduce((sum, check) => sum + check.shortfall, 0)
  return { code, band, checks, covered: shortfall === 0, shortfall }
}

export function assessReadiness(result: ReadinessSource, inputs: ReadinessInputs): Readiness {
  const savings = Math.max(0, orZero(inputs.savings))
  const preApproved =
    inputs.preApprovedLoan === null ? null : Math.max(0, orZero(inputs.preApprovedLoan))

  // On the day: the deposit falls due the moment the hammer drops, and only
  // cash pays it.
  const deposit = bandRequirement(result.rows, 'auctionDay')
  const onTheDay = verdict('auctionDay', 'auctionDay', [
    pocketCheck('auctionDayCash', 'cash', deposit, savings),
  ])

  // At settlement: the statutory band is cash, and it is the cash left after
  // the deposit has already gone. Clamped at zero so a shortfall on the day is
  // reported once, by the day's verdict, rather than counted again here.
  const settlementCash = bandRequirement(result.rows, 'atSettlement')
  const checks = [
    pocketCheck('settlementCash', 'cash', settlementCash, Math.max(0, savings - deposit)),
  ]

  // The loan funds the balance of the price. `totals.loan` is that balance as
  // the engine already computes it — less any government equity share, plus
  // LMI when `capitaliseLmi` puts the premium in the loan. That is also why
  // capitalised LMI is never counted twice: the same setting drops the LMI row
  // to zero, so it leaves the settlement cash band as it enters the loan.
  if (preApproved !== null) {
    checks.push(pocketCheck('settlementLoan', 'loan', result.totals.loan, preApproved))
  }

  return {
    verdicts: [onTheDay, verdict('atSettlement', 'atSettlement', checks)],
    financeChecked: preApproved !== null,
  }
}
