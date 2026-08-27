import { LMI_DUTY_MULTIPLIER, LMI_RATE_POINTS } from '../data/constants'

// Linear interpolation between the indicative premium points.
export function lmiRate(lvrPct: number): number {
  if (lvrPct <= 80) return 0
  for (let i = 0; i < LMI_RATE_POINTS.length - 1; i++) {
    const [a, rateA] = LMI_RATE_POINTS[i]
    const [b, rateB] = LMI_RATE_POINTS[i + 1]
    if (lvrPct <= b) return rateA + ((rateB - rateA) * (lvrPct - a)) / (b - a)
  }
  return 0.05
}

export function lmiPremium(loan: number, lvrPct: number): number {
  return loan * lmiRate(lvrPct) * LMI_DUTY_MULTIPLIER
}
