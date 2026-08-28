// The skin and colour-mode axes, as pure data. Kept in logic/ (not types/) so
// the URL codec can validate them without importing anything React-shaped.
// Skin and mode are independent: any skin renders in any mode.

export type ColorMode = 'light' | 'dark'

export const COLOR_MODES: readonly ColorMode[] = ['light', 'dark']

export type SkinId = 'default' | 'plain'

export const SKIN_IDS: readonly SkinId[] = ['default', 'plain']

// No ?skin= at all means the app looks the way it always has.
export const DEFAULT_SKIN_ID: SkinId = 'default'

// An unknown ?skin= — a typo, a link to a skin that has since been removed, or
// a skin whose chunk fails to load — lands on the plain baseline rather than a
// blank page. It is the one skin with nothing that can go wrong in it.
export const FALLBACK_SKIN_ID: SkinId = 'plain'

export function isSkinId(value: string | null): value is SkinId {
  return SKIN_IDS.includes(value as SkinId)
}

export function isColorMode(value: string | null): value is ColorMode {
  return COLOR_MODES.includes(value as ColorMode)
}
