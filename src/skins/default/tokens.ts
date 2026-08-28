import type { ColorMode } from '../../logic/skins'
import type { ThemeTokens } from '../../types/skin'

/**
 * The Ledger palette the app has always used: warm cream paper, near-black
 * ink, one rust accent, hairline rules, no shadows. Both modes are the design
 * system's own — the dark set is the `[data-theme="dark"]` inversion Ledger
 * ships, not a mechanical derivation.
 *
 * Two values were moved for WCAG AA, and only those two: the note and check
 * markers (`#8f6d33` and `#5f7355`) sat at 4.30:1 and 4.33:1 against the two
 * paper tones, under the 4.5:1 body-text threshold the contrast test enforces.
 * They are darkened by 7% and 3% respectively — the smallest step that clears
 * it on both surfaces.
 *
 * `colorControlBorder` was added for the same reason and is the only value
 * here with no Ledger original. Every input, select and outlined button drew
 * its resting edge in `colorHairlineStrong`, which is a hairline tone: 1.62:1
 * on paper in light mode and 1.95:1 in dark, against the 3:1 WCAG 1.4.11 asks
 * for the boundary of a control. The hairlines keep their tone, because a rule
 * between two paragraphs is decoration; the control edges get one of their own,
 * a step lighter than `colorBorderHover` so hover is still a visible change.
 */
export const light: ThemeTokens = {
  colorBg: '#f7f3e8',
  colorSurface: '#f0ebdd',
  colorText: '#201c15',
  colorTextMuted: '#5d574a',
  colorInk: '#201c15',
  colorOnInk: '#f7f3e8',
  colorOnInkMuted: '#bbb7ad',
  colorHairline: '#e0d9c6',
  colorHairlineStrong: '#c9c1ab',
  colorControlBorder: '#878170',
  colorBorderHover: '#7d7666',
  colorAccent: '#9c4a21',
  colorAccentStrong: '#7c3916',
  colorAccentTint: '#f1e3d4',
  colorSuccess: '#5c7052',
  colorWarning: '#85652f',
  colorError: '#93413a',

  fontBody: '"Libre Franklin", "Be Vietnam Pro", "Public Sans", "Noto Sans", Arial, sans-serif',
  fontHeading: '"Libre Franklin", "Be Vietnam Pro", "Public Sans", "Noto Sans", Arial, sans-serif',
  fontMono: '"Source Code Pro", "IBM Plex Mono", "Noto Sans Mono", ui-monospace, monospace',
  fontWeightNormal: '400',
  fontWeightStrong: '600',
  fontSizeMicro: '11px',
  fontSizeSmall: '12px',
  fontSizeCompact: '14px',
  fontSizeFigure: '13.5px',
  fontSizeBase: '16px',
  fontSizeLead: '16px',
  fontSizeHeading: '20px',
  fontSizeStat: '20px',
  fontSizeStatLarge: '24px',
  fontSizeTitle: '28px',
  fontSizeTitleWide: '39px',
  lineHeightBase: '1.65',
  lineHeightSnug: '1.5',
  lineHeightTight: '1.4',
  letterSpacingLabel: '0.06em',
  letterSpacingTitle: '-0.02em',
  textTransformLabel: 'uppercase',

  space1: '4px',
  space2: '8px',
  space3: '12px',
  space4: '16px',
  space6: '24px',
  space8: '32px',
  space12: '48px',

  radiusSm: '4px',
  radiusMd: '6px',

  borderWidth: '1px',
  borderStrongWidth: '2px',

  shadowSm: 'none',
  shadowMd: 'none',

  focusRingWidth: '2px',
  focusRingColor: '#9c4a21',
  focusRingOffset: '2px',

  motionFast: '0.18s',
}

export const dark: ThemeTokens = {
  ...light,
  colorBg: '#1f1b13',
  colorSurface: '#282318',
  colorText: '#ece4d1',
  colorTextMuted: '#a89f8b',
  colorInk: '#ece4d1',
  colorOnInk: '#1f1b13',
  colorOnInkMuted: '#585348',
  colorHairline: '#3a3425',
  colorHairlineStrong: '#514a36',
  colorControlBorder: '#7d7355',
  colorBorderHover: '#9a917c',
  colorAccent: '#cd8a52',
  colorAccentStrong: '#dda06d',
  colorAccentTint: '#33281c',
  colorSuccess: '#8ba37c',
  colorWarning: '#c2a05e',
  colorError: '#c07b6d',
  focusRingColor: '#cd8a52',
}

export const tokens: Record<ColorMode, ThemeTokens> = { light, dark }
