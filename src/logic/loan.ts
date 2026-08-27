import { LOAN_TERM_MONTHS } from '../data/constants'

// Principal-and-interest repayment over 30 years.
export function monthlyRepayment(principal: number, annualRate: number): number {
  const monthlyRate = annualRate / 12
  if (monthlyRate === 0) return principal / LOAN_TERM_MONTHS
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -LOAN_TERM_MONTHS))
}
