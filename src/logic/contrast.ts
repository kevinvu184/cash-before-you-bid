// WCAG 2.1 relative luminance and contrast ratio. Pure arithmetic over sRGB
// hex strings; used by the per-skin, per-mode contrast tests.

export const AA_BODY_TEXT = 4.5
export const AA_LARGE_TEXT = 3
export const AA_UI_COMPONENT = 3

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Parses `#rgb` or `#rrggbb` into 0-255 triples. Throws on anything else. */
export function parseHex(hex: string): [number, number, number] {
  const body = hex.trim().replace(/^#/, '')
  const full =
    body.length === 3
      ? body
          .split('')
          .map((c) => c + c)
          .join('')
      : body
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: ${hex}`)
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}
