export function formatMoney(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('en-AU')
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100) / 100}%`
}

// The original table renders negatives as a minus sign before an absolute value.
export function formatRowAmount(amount: number): string {
  return (amount < 0 ? '−' : '') + formatMoney(Math.abs(amount))
}
