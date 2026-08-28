import type { ComponentType } from 'react'
import type { ColorMode, SkinId } from '../logic/skins'
import type { AppViewModel, FieldId } from './viewModel'

/**
 * Every token a skin must supply, for every mode. There are no optional
 * fields on purpose: a skin that wants no shadow says so with `'none'` and a
 * skin that wants square corners says so with `'0'`, rather than leaving the
 * token out and inheriting whatever the previous skin happened to set.
 *
 * Values are raw CSS values. They become custom properties on the app root
 * (see src/logic/theme.ts for the token -> `--var` mapping); skin stylesheets
 * may only read `var(--token)`.
 */
export interface ThemeTokens {
  // — surfaces and ink —
  colorBg: string
  colorSurface: string
  colorText: string
  colorTextMuted: string
  /** Background of an inverted block (the default skin's total strip). */
  colorInk: string
  colorOnInk: string
  /** Pre-blended quiet text on `colorInk`; a real colour so it can be tested. */
  colorOnInkMuted: string

  // — structure —
  colorHairline: string
  colorHairlineStrong: string
  colorBorderHover: string

  // — the one accent: links, focus, selection —
  colorAccent: string
  colorAccentStrong: string
  colorAccentTint: string

  // — semantics —
  colorSuccess: string
  colorWarning: string
  colorError: string

  // — typography —
  fontBody: string
  fontHeading: string
  fontMono: string
  fontWeightNormal: string
  fontWeightStrong: string
  fontSizeMicro: string
  fontSizeSmall: string
  fontSizeCompact: string
  fontSizeFigure: string
  fontSizeBase: string
  fontSizeLead: string
  fontSizeHeading: string
  fontSizeStat: string
  fontSizeStatLarge: string
  fontSizeTitle: string
  /** The title once there is room for it (>= 820px). */
  fontSizeTitleWide: string
  /** Every line-height token is >= 1.4 so Vietnamese tone marks never clip. */
  lineHeightBase: string
  lineHeightSnug: string
  lineHeightTight: string
  letterSpacingLabel: string
  letterSpacingTitle: string
  textTransformLabel: string

  // — spacing —
  space1: string
  space2: string
  space3: string
  space4: string
  space6: string
  space8: string
  space12: string

  // — shape —
  radiusSm: string
  radiusMd: string

  // — border —
  borderWidth: string
  borderStrongWidth: string

  // — shadow —
  shadowSm: string
  shadowMd: string

  // — focus ring —
  focusRingWidth: string
  focusRingColor: string
  focusRingOffset: string

  // — motion —
  motionFast: string
}

export interface SkinComponents {
  /**
   * The whole screen. A skin owns its own decomposition below this point; the
   * shell only knows how to hand it a view model.
   */
  Root: ComponentType<{ vm: AppViewModel }>
}

/**
 * The manifest of fields a skin claims to render. `Record<FieldId, true>` is
 * the compile-time seam: adding a `FieldId` breaks every skin's manifest until
 * it is added there, and the parity test proves the manifest is not lying by
 * comparing it with the `data-field` attributes actually in the DOM.
 */
export type FieldManifest = Readonly<Record<FieldId, true>>

/** Everything about a skin that is cheap enough to load eagerly. */
export interface SkinMeta {
  id: SkinId
  nameKey: string
  tokens: Record<ColorMode, ThemeTokens>
  renders: FieldManifest
}

export interface SkinModule extends SkinMeta {
  components: SkinComponents
}
