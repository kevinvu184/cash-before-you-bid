import type { ColorMode } from '../../logic/skins'
import type { ThemeTokens } from '../../types/skin'

/**
 * The baseline: black on white, white on black, and one link/focus blue that
 * clears 4.5:1 in its own mode. Nothing decorative — radius, shadow and motion
 * are set to zero-equivalents rather than left out, so the skin still has to
 * declare what it is not doing.
 *
 * Greys exist only as hairlines, which are the text colour at reduced opacity
 * flattened against the background (42% and 54%); `colorHairlineStrong` already
 * clears 3:1 in both modes, so `colorControlBorder` is the same value rather
 * than a fourth grey. The default skin needs the two apart because its hairline
 * tone is a paper tint; this one does not.
 */
export const light: ThemeTokens = {
  colorBg: '#ffffff',
  colorSurface: '#ffffff',
  colorText: '#000000',
  colorTextMuted: '#000000',
  colorInk: '#000000',
  colorOnInk: '#ffffff',
  colorOnInkMuted: '#ffffff',
  colorHairline: '#949494',
  colorHairlineStrong: '#767676',
  colorControlBorder: '#767676',
  colorBorderHover: '#000000',
  colorAccent: '#0645ad',
  colorAccentStrong: '#0645ad',
  colorAccentTint: '#ffffff',
  colorSuccess: '#000000',
  colorWarning: '#000000',
  colorError: '#000000',

  fontBody:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  fontHeading:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  fontMono:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  fontWeightNormal: '400',
  fontWeightStrong: '500',
  fontSizeMicro: '1rem',
  fontSizeSmall: '1rem',
  fontSizeCompact: '1rem',
  fontSizeFigure: '1rem',
  fontSizeBase: '1rem',
  fontSizeLead: '1rem',
  fontSizeHeading: '1.25rem',
  fontSizeStat: '1.125rem',
  fontSizeStatLarge: '1.125rem',
  fontSizeTitle: '1.5rem',
  fontSizeTitleWide: '1.5rem',
  lineHeightBase: '1.5',
  lineHeightSnug: '1.5',
  lineHeightTight: '1.4',
  letterSpacingLabel: 'normal',
  letterSpacingTitle: 'normal',
  textTransformLabel: 'none',

  space1: '4px',
  space2: '8px',
  space3: '12px',
  space4: '16px',
  space6: '24px',
  space8: '32px',
  space12: '48px',

  radiusSm: '0',
  radiusMd: '0',

  borderWidth: '1px',
  borderStrongWidth: '1px',

  shadowSm: 'none',
  shadowMd: 'none',

  focusRingWidth: '2px',
  focusRingColor: '#0645ad',
  focusRingOffset: '2px',

  motionFast: '0s',
}

export const dark: ThemeTokens = {
  ...light,
  colorBg: '#000000',
  colorSurface: '#000000',
  colorText: '#ffffff',
  colorTextMuted: '#ffffff',
  colorInk: '#ffffff',
  colorOnInk: '#000000',
  colorOnInkMuted: '#000000',
  colorHairline: '#6b6b6b',
  colorHairlineStrong: '#949494',
  colorControlBorder: '#949494',
  colorBorderHover: '#ffffff',
  colorAccent: '#8ab4ff',
  colorAccentStrong: '#8ab4ff',
  colorAccentTint: '#000000',
  colorSuccess: '#ffffff',
  colorWarning: '#ffffff',
  colorError: '#ffffff',
  focusRingColor: '#8ab4ff',
}

export const tokens: Record<ColorMode, ThemeTokens> = { light, dark }
