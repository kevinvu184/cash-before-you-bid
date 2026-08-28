import type { ThemeTokens } from '../types/skin'

// The single mapping from a token name to the custom property skins read.
// A `Record<keyof ThemeTokens, string>` so a new token is a compile error here
// until it has a variable name, and a removed one is a compile error too.
export const TOKEN_CSS_VARS: Readonly<Record<keyof ThemeTokens, string>> = {
  colorBg: '--color-bg',
  colorSurface: '--color-surface',
  colorText: '--color-text',
  colorTextMuted: '--color-text-muted',
  colorInk: '--color-ink',
  colorOnInk: '--color-on-ink',
  colorOnInkMuted: '--color-on-ink-muted',
  colorHairline: '--color-hairline',
  colorHairlineStrong: '--color-hairline-strong',
  colorControlBorder: '--color-control-border',
  colorBorderHover: '--color-border-hover',
  colorAccent: '--color-accent',
  colorAccentStrong: '--color-accent-strong',
  colorAccentTint: '--color-accent-tint',
  colorSuccess: '--color-success',
  colorWarning: '--color-warning',
  colorError: '--color-error',
  fontBody: '--font-body',
  fontHeading: '--font-heading',
  fontMono: '--font-mono',
  fontWeightNormal: '--font-weight-normal',
  fontWeightStrong: '--font-weight-strong',
  fontSizeMicro: '--font-size-micro',
  fontSizeSmall: '--font-size-small',
  fontSizeCompact: '--font-size-compact',
  fontSizeFigure: '--font-size-figure',
  fontSizeBase: '--font-size-base',
  fontSizeLead: '--font-size-lead',
  fontSizeHeading: '--font-size-heading',
  fontSizeStat: '--font-size-stat',
  fontSizeStatLarge: '--font-size-stat-large',
  fontSizeTitle: '--font-size-title',
  fontSizeTitleWide: '--font-size-title-wide',
  lineHeightBase: '--line-height-base',
  lineHeightSnug: '--line-height-snug',
  lineHeightTight: '--line-height-tight',
  letterSpacingLabel: '--letter-spacing-label',
  letterSpacingTitle: '--letter-spacing-title',
  textTransformLabel: '--text-transform-label',
  space1: '--space-1',
  space2: '--space-2',
  space3: '--space-3',
  space4: '--space-4',
  space6: '--space-6',
  space8: '--space-8',
  space12: '--space-12',
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  borderWidth: '--border-width',
  borderStrongWidth: '--border-strong-width',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  focusRingWidth: '--focus-ring-width',
  focusRingColor: '--focus-ring-color',
  focusRingOffset: '--focus-ring-offset',
  motionFast: '--motion-fast',
}

export const TOKEN_NAMES = Object.keys(TOKEN_CSS_VARS) as ReadonlyArray<keyof ThemeTokens>

/** The colour tokens, for the contrast tests and the hardcoded-colour check. */
export const COLOR_TOKEN_NAMES = TOKEN_NAMES.filter((name) =>
  TOKEN_CSS_VARS[name].startsWith('--color-'),
)

/** Line-height tokens, which a test holds to >= 1.4 for Vietnamese diacritics. */
export const LINE_HEIGHT_TOKEN_NAMES: ReadonlyArray<keyof ThemeTokens> = [
  'lineHeightBase',
  'lineHeightSnug',
  'lineHeightTight',
]

export function tokensToCssVars(tokens: ThemeTokens): Array<[string, string]> {
  return TOKEN_NAMES.map((name) => [TOKEN_CSS_VARS[name], tokens[name]])
}
