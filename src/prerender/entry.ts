import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import i18n from '../i18n'
import type { Lang } from '../logic/lang'
import { PrerenderRoot } from './Shell'

/**
 * The build-time half of the SEO baseline. scripts/prerender.mjs loads this
 * through Vite's SSR pipeline once per locale and writes the result into the
 * document Vite built.
 *
 * There is no server here and nothing renders per request: this runs once, in
 * `npm run build`, and produces two static files. The app is unchanged — it
 * still mounts with `createRoot`, discards this markup and takes over.
 */

export interface PrerenderedLocale {
  lang: Lang
  /** The markup that goes inside `<div id="root">`. */
  body: string
  title: string
  description: string
}

export async function renderLocale(lang: Lang): Promise<PrerenderedLocale> {
  // Awaited, so the strings below and the markup are never a mix of the
  // outgoing and the incoming language's bundles.
  await i18n.changeLanguage(lang)
  return {
    lang,
    body: renderToStaticMarkup(createElement(PrerenderRoot, { lang })),
    title: i18n.t('app.pageTitle'),
    description: i18n.t('app.metaDescription'),
  }
}
