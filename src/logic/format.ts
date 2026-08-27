// Locale-aware formatting and parsing. Amounts are always Australian dollars;
// only the digits, separators and currency marker follow the UI locale.

/**
 * Whole-dollar AUD for the given UI locale ('en' or 'vi'). Prefers the
 * locale's own symbol when it is unambiguous ("A$1,235" for en); when the
 * symbol Intl produces does not read as clearly Australian (vi renders
 * "AU$", and some data would show a bare "$"), it falls back to the ISO code
 * ("1.235 AUD") so the currency can never be misread as đồng.
 */
export function formatAud(amount: number, locale: string): string {
  const withSymbol = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
  if (withSymbol.includes('A$') || withSymbol.includes('AUD')) return withSymbol
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'AUD',
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(amount)
}

// The original table renders negatives as a typographic minus before the
// absolute value; kept, with the amount itself in locale AUD.
export function formatRowAmount(amount: number, locale: string): string {
  return (amount < 0 ? '−' : '') + formatAud(Math.abs(amount), locale)
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

// Mirrors the original pct(): up to two decimals, no trailing zeros. NaN
// formats as "NaN%", which the zero-price edge case relies on.
export function formatPercent(value: number, locale: string): string {
  return `${formatNumber(value, locale)}%`
}

interface LocaleSeparators {
  group: string
  decimal: string
}

function separatorsFor(locale: string): LocaleSeparators {
  const parts = new Intl.NumberFormat(locale).formatToParts(11111.1)
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  }
}

/**
 * Parses a number the way a person in the given locale would type it,
 * accepting both "," and "." so a vi user can enter "1.234,5" and an en user
 * "1,234.5". Returns null when the text is not a number.
 *
 * Rules, in order:
 * - Both separators present: the last one typed is the decimal separator and
 *   the other must group digits in threes.
 * - One separator, appearing more than once: it groups digits in threes.
 * - One separator, appearing once: the locale's decimal separator is a
 *   decimal point; the locale's grouping separator is grouping only when it
 *   is followed by exactly three digits ("1.234" in vi is 1234, "6.2" is 6.2).
 */
export function parseLocaleNumber(input: string, locale: string): number | null {
  const cleaned = input.trim().replace(/[\s  ]/g, '')
  if (cleaned === '') return null

  const sign = cleaned.startsWith('-') || cleaned.startsWith('+') ? cleaned[0] : ''
  const digits = sign ? cleaned.slice(1) : cleaned
  if (digits === '') return null

  const { decimal } = separatorsFor(locale)
  const hasComma = digits.includes(',')
  const hasDot = digits.includes('.')

  let decimalSep: string | null = null
  if (hasComma && hasDot) {
    decimalSep = digits.lastIndexOf(',') > digits.lastIndexOf('.') ? ',' : '.'
    // The other separator must appear before the decimal one.
    const groupSep = decimalSep === ',' ? '.' : ','
    if (digits.lastIndexOf(groupSep) > digits.lastIndexOf(decimalSep)) return null
  } else if (hasComma || hasDot) {
    const sep = hasComma ? ',' : '.'
    const occurrences = digits.split(sep).length - 1
    if (occurrences > 1) {
      decimalSep = null // repeated: can only be grouping
    } else if (sep === decimal) {
      decimalSep = sep
    } else {
      // A single use of the locale's grouping character: grouping when it
      // marks a group of three, a decimal point otherwise.
      const after = digits.length - digits.indexOf(sep) - 1
      decimalSep = after === 3 ? null : sep
    }
  }

  let integerPart = digits
  let fractionPart = ''
  if (decimalSep !== null) {
    const at = digits.lastIndexOf(decimalSep)
    integerPart = digits.slice(0, at)
    fractionPart = digits.slice(at + 1)
    if (!/^\d*$/.test(fractionPart)) return null
  }

  const groupSep = decimalSep === '.' ? ',' : decimalSep === ',' ? '.' : hasComma ? ',' : '.'
  if (integerPart.includes(groupSep)) {
    // Grouped integers must be 1-3 digits, then groups of exactly three.
    const escaped = groupSep === '.' ? '\\.' : groupSep
    if (!new RegExp(`^\\d{1,3}(${escaped}\\d{3})+$`).test(integerPart)) return null
    integerPart = integerPart.split(groupSep).join('')
  } else if (!/^\d*$/.test(integerPart)) {
    return null
  }

  if (integerPart === '' && fractionPart === '') return null
  const value = Number(`${sign}${integerPart || '0'}${fractionPart ? `.${fractionPart}` : ''}`)
  return Number.isFinite(value) ? value : null
}

/**
 * Serialises a number for editing in a text field: the locale's decimal
 * separator, no grouping, so what the field shows is what parseLocaleNumber
 * reads back.
 */
export function formatNumberInput(value: number, locale: string): string {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 10,
  }).format(value)
}
