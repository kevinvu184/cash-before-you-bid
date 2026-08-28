import { useEffect } from 'react'
import { tokensToCssVars } from '../logic/theme'
import type { ColorMode, SkinId } from '../logic/skins'
import type { ModePreference } from '../logic/urlState'
import type { ThemeTokens } from '../types/skin'
import { useMediaQuery } from './useMediaQuery'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Resolves the mode and paints the active skin's tokens onto the app root.
 *
 * While `?mode=` is absent the operating system decides, and keeps deciding —
 * the media query is subscribed, not sampled once. The moment the user picks a
 * mode the param wins and the OS is ignored.
 *
 * Skin and mode are independent: the tokens come from `tokens[mode]` for
 * whichever skin is active, so any skin renders in any mode.
 */
export function useColorMode(
  preference: ModePreference,
  skinId: SkinId,
  tokens: Record<ColorMode, ThemeTokens>,
): ColorMode {
  const prefersDark = useMediaQuery(DARK_QUERY)
  const resolved: ColorMode =
    preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference
  const active = tokens[resolved]

  useEffect(() => {
    const root = document.documentElement
    const previousSkin = root.dataset.skin
    const previousMode = root.dataset.mode
    const vars = tokensToCssVars(active)

    root.dataset.skin = skinId
    root.dataset.mode = resolved
    // `color-scheme` is what makes form controls, scrollbars and the canvas
    // behind the page follow the mode; without it a dark skin keeps a white
    // scrollbar and a white overscroll area.
    root.style.setProperty('color-scheme', resolved)
    for (const [name, value] of vars) root.style.setProperty(name, value)

    return () => {
      for (const [name] of vars) root.style.removeProperty(name)
      root.style.removeProperty('color-scheme')
      if (previousSkin === undefined) delete root.dataset.skin
      else root.dataset.skin = previousSkin
      if (previousMode === undefined) delete root.dataset.mode
      else root.dataset.mode = previousMode
    }
  }, [active, resolved, skinId])

  return resolved
}
