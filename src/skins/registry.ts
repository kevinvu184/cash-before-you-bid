import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ColorMode, SkinId } from '../logic/skins'
import type { FieldManifest, SkinModule, ThemeTokens } from '../types/skin'
import type { AppViewModel } from '../types/viewModel'
import { meta as defaultMeta } from './default/meta'
import { meta as plainMeta } from './plain/meta'

// The registry. Tokens and the field manifest load eagerly — they are a few
// hundred bytes of data and the tokens have to be paintable the instant the
// skin becomes active. The components, which are the bulk of a skin, load on
// demand: only the active skin's chunk is ever fetched.

export interface SkinRegistryEntry {
  id: SkinId
  nameKey: string
  tokens: Record<ColorMode, ThemeTokens>
  renders: FieldManifest
  Root: LazyExoticComponent<ComponentType<{ vm: AppViewModel }>>
  /** Loads the whole module — used by the tests, which render every skin. */
  load(): Promise<SkinModule>
}

function entry(
  meta: typeof defaultMeta,
  load: () => Promise<{ default: SkinModule }>,
): SkinRegistryEntry {
  return {
    id: meta.id,
    nameKey: meta.nameKey,
    tokens: meta.tokens,
    renders: meta.renders,
    Root: lazy(() => load().then((module) => ({ default: module.default.components.Root }))),
    load: () => load().then((module) => module.default),
  }
}

export const SKINS: Readonly<Record<SkinId, SkinRegistryEntry>> = {
  default: entry(defaultMeta, () => import('./default')),
  plain: entry(plainMeta, () => import('./plain')),
}
