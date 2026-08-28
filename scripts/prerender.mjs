// Writes the served HTML, one document per locale, after `vite build`.
//
// Why this exists. index.html shipped a single static title, description and
// <html lang>, and App.tsx overwrote all three in an effect once the bundle
// had parsed. Search engines do run JavaScript, but served HTML is what is
// indexed fastest and most reliably — and the served lang attribute was wrong
// for one of the two locales in every case, which is an accessibility defect
// as much as an SEO one. A reader also got an empty <div id="root"> as the
// entire first paint.
//
// Why it is a script and not a framework. A static host cannot pick a document
// by query string, so each locale needs a path: the default locale at the base
// and the other under a directory (src/logic/site.ts states which). That is
// two files. Two files do not need a server, an SSR framework or a router —
// they need a render, twice, at build time, which is all this does. The app is
// untouched: it still mounts with createRoot, discards this markup and takes
// over.
//
// What it writes into dist/:
//
//   index.html      the default locale, with the prerendered shell
//   <locale>/…      one directory per further locale, same shape
//   robots.txt      announces the sitemap
//   sitemap.xml     both locale URLs, cross-linked with hreflang
//
// Usage: it is the last step of `npm run build`. Run it on its own only after
// a build, against the dist/ that build produced.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DIST = join(ROOT, 'dist')
const MANIFEST = join(DIST, '.vite', 'manifest.json')

function fail(message) {
  console.error(`\n  prerender: ${message}\n`)
  process.exit(1)
}

/**
 * The default skin's built assets. Its chunk is lazily imported, so Vite puts
 * neither its stylesheet nor its JavaScript in the document — the stylesheet
 * arrives only once the chunk has been fetched and executed, which would leave
 * the prerendered shell painting unstyled for the whole of that round trip.
 * Linking the stylesheet here is what makes the shell worth painting at all;
 * the modulepreload is the same round trip started earlier. Vite's own preload
 * helper checks for an existing link before injecting one, so neither is
 * fetched twice.
 */
function defaultSkinAssets(base) {
  let manifest
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  } catch {
    fail(`no build manifest at ${MANIFEST}. Run \`vite build\` first.`)
  }
  const entry = manifest['src/skins/default/index.ts']
  if (entry === undefined) fail('the build manifest has no entry for the default skin')
  const links = (entry.css ?? []).map(
    (file) => `<link rel="stylesheet" crossorigin href="${base}${file}" />`,
  )
  links.push(`<link rel="modulepreload" crossorigin href="${base}${entry.file}" />`)
  return links.join('\n    ')
}

function documentFor(template, { lang, body, title, description }, replaceHead, skinAssets) {
  const opening = /<html[^>]*>/
  if (!opening.test(template)) fail('dist/index.html has no <html> tag to localise')
  const root = '<div id="root"></div>'
  if (!template.includes(root)) fail(`dist/index.html has no empty ${root} to render into`)

  return replaceHead(template, { lang, title, description })
    // data-doc-lang is what the inline script in <body> reads to decide
    // whether the shell below it belongs to the URL being visited.
    .replace(opening, `<html lang="${lang}" data-doc-lang="${lang}">`)
    .replace('</head>', `  ${skinAssets}\n  </head>`)
    .replace(root, `<div id="root">${body}</div>`)
}

/**
 * The output is the deliverable — a document with the wrong lang, or a
 * canonical pointing at the other locale, is invisible in the source diff and
 * only wrong once deployed. So the build checks its own work rather than
 * leaving that to a test that would have to run a build first.
 */
function verify(html, { lang, title }, canonical) {
  const problems = []
  if (!html.includes(`<html lang="${lang}" data-doc-lang="${lang}">`)) {
    problems.push('the document does not declare its own language')
  }
  if (!html.includes(`<link rel="canonical" href="${canonical}" />`)) {
    problems.push(`the canonical link is not ${canonical}`)
  }
  if (!html.includes(`<title>${title}</title>`) && !html.includes('<title>')) {
    problems.push('there is no title')
  }
  if (/<div id="root">\s*<\/div>/.test(html)) problems.push('the shell was not rendered into it')
  if (!html.includes('rel="stylesheet"')) problems.push('no stylesheet is linked')
  if (problems.length > 0) fail(`${lang}: ${problems.join('; ')}`)
}

async function main() {
  const server = await createServer({
    configFile: join(ROOT, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'warn',
  })

  try {
    const { LANGS, DEFAULT_LANG } = await server.ssrLoadModule('/src/logic/lang.ts')
    const { localeDocument, localeUrl } = await server.ssrLoadModule('/src/logic/site.ts')
    const { headMarkup, replaceHead, HEAD_START, HEAD_END } =
      await server.ssrLoadModule('/src/prerender/head.ts')
    const { robotsTxt, sitemapXml } = await server.ssrLoadModule('/src/prerender/siteFiles.ts')
    const { renderLocale } = await server.ssrLoadModule('/src/prerender/entry.ts')

    const base = server.config.base
    const template = readFileSync(join(DIST, 'index.html'), 'utf8')
    const skinAssets = defaultSkinAssets(base)

    const written = []
    for (const lang of LANGS) {
      const locale = await renderLocale(lang)
      const html = documentFor(template, locale, replaceHead, skinAssets)
      verify(html, locale, localeUrl(lang))
      const file = join(DIST, localeDocument(lang))
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, html)
      written.push([localeDocument(lang), locale.title])

      // The checked-in copy in index.html is the default locale's block, and
      // it is what the dev server and any build that skipped this step serve.
      // Saying so here beats finding out from a test failure with no fix in it.
      if (lang === DEFAULT_LANG) {
        const source = readFileSync(join(ROOT, 'index.html'), 'utf8')
        const start = source.indexOf(HEAD_START)
        const end = source.indexOf(HEAD_END)
        const current = start === -1 ? '' : source.slice(start, end + HEAD_END.length)
        const fresh = headMarkup(locale)
        if (current !== fresh) {
          console.warn(
            `\n  prerender: index.html's head block is behind src/prerender/head.ts.` +
              `\n  Paste this between the markers:\n\n${fresh}\n`,
          )
        }
      }
    }

    const lastmod = new Date().toISOString().slice(0, 10)
    writeFileSync(join(DIST, 'robots.txt'), robotsTxt())
    writeFileSync(join(DIST, 'sitemap.xml'), sitemapXml(lastmod))
    written.push(['robots.txt', ''], ['sitemap.xml', lastmod])

    // Build-time only; nothing at runtime reads it, so it is not deployed.
    rmSync(join(DIST, '.vite'), { recursive: true, force: true })

    console.log('\nPrerendered')
    for (const [file, note] of written) console.log(`  dist/${file}${note ? `  — ${note}` : ''}`)
    console.log()
  } finally {
    await server.close()
  }
}

await main()
