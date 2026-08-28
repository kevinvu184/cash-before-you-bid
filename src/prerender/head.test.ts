import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import vi from '../locales/vi.json'
import { DEFAULT_LANG, LANGS } from '../logic/lang'
import { localeUrl } from '../logic/site'
import { DEFAULT_SKIN_ID } from '../logic/skins'
import { HEAD_END, HEAD_START, escapeHtml, headMarkup, replaceHead } from './head'

// The served HTML has to be right per locale before any JavaScript runs, which
// makes index.html two things at once: the template the build localises, and
// the document the dev server serves as-is. These hold the checked-in copy to
// the generator, and the generator to what each locale actually needs.

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')

const TITLES = { en: en.app.pageTitle, vi: vi.app.pageTitle }
const DESCRIPTIONS = { en: en.app.metaDescription, vi: vi.app.metaDescription }

const facts = (lang: 'en' | 'vi') => ({
  lang,
  title: TITLES[lang],
  description: DESCRIPTIONS[lang],
})

describe('index.html', () => {
  it('carries the generated block for the default locale, unedited', () => {
    const start = html.indexOf(HEAD_START)
    const end = html.indexOf(HEAD_END)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(html.slice(start, end + HEAD_END.length)).toBe(headMarkup(facts(DEFAULT_LANG)))
  })

  it('declares the default locale, which the build then overwrites per document', () => {
    expect(html).toMatch(new RegExp(`<html lang="${DEFAULT_LANG}"`))
  })

  it('has an empty #root for the prerendered shell to be written into', () => {
    expect(html).toContain('<div id="root"></div>')
  })
})

describe('the script that drops a shell the URL did not ask for', () => {
  // It runs before the bundle and therefore cannot import anything, so it
  // restates the default language and the prerendered skin as literals. This
  // is the same bargain the ground-colour script makes, and the same guard:
  // the literals are held to the modules they came from.
  const script = html.slice(html.indexOf('<div id="root">'))

  it('treats the app’s default language as the one the root document serves', () => {
    expect(script).toContain(`if (docLang !== '${DEFAULT_LANG}')`)
  })

  it('knows every language the app has', () => {
    for (const lang of LANGS) expect(script).toContain(`lang !== '${lang}'`)
  })

  it('keeps the shell only for the skin that was prerendered', () => {
    expect(script).toContain(`(params.get('skin') || '${DEFAULT_SKIN_ID}') !== '${DEFAULT_SKIN_ID}'`)
  })

  it('keeps the shell only for the colour mode that was prerendered', () => {
    // The shell paints the mode switch, and a build cannot know which of its
    // three buttons to mark pressed — it says 'system', which is right only
    // when there is no ?mode= at all. So ?mode= is state like any other here,
    // and lang and skin are the only two keys the scan forgives.
    expect(script).toContain(`if (key !== 'lang' && key !== 'skin') stale = true`)
  })

  it('discards the shell rather than hiding it, so React is not fighting CSS', () => {
    expect(script).toContain(`document.getElementById('root').replaceChildren()`)
  })
})

describe('the head block', () => {
  it.each(LANGS)('canonicalises %s to its own path', (lang) => {
    expect(headMarkup(facts(lang))).toContain(`<link rel="canonical" href="${localeUrl(lang)}" />`)
  })

  it.each(LANGS)('lists every locale as an alternate from %s, itself included', (lang) => {
    const markup = headMarkup(facts(lang))
    for (const other of LANGS) {
      expect(markup).toContain(`hreflang="${other}" href="${localeUrl(other)}"`)
    }
    expect(markup).toContain(`hreflang="x-default" href="${localeUrl(DEFAULT_LANG)}"`)
  })

  // Through escapeHtml, because that is what the generator writes. Spelling
  // the strings out raw would turn the day someone puts an ampersand in a
  // title into a red test about nothing. It does not make this circular: the
  // escaping itself is checked below against a hardcoded expectation, so a
  // broken escapeHtml fails there rather than hiding behind both sides of
  // this comparison. What is asserted here is which locale's string lands in
  // which tag.
  it.each(LANGS)('carries %s’s own title and description', (lang) => {
    const markup = headMarkup(facts(lang))
    const title = escapeHtml(TITLES[lang])
    const description = escapeHtml(DESCRIPTIONS[lang])
    expect(markup).toContain(`<title>${title}</title>`)
    expect(markup).toContain(`<meta name="description" content="${description}" />`)
    expect(markup).toContain(`<meta property="og:title" content="${title}" />`)
    expect(markup).toContain(`<meta name="twitter:title" content="${title}" />`)
  })

  it('gives each locale its own Open Graph locale, and names the other', () => {
    expect(headMarkup(facts('en'))).toContain('<meta property="og:locale" content="en_AU" />')
    expect(headMarkup(facts('en'))).toContain(
      '<meta property="og:locale:alternate" content="vi_VN" />',
    )
    expect(headMarkup(facts('vi'))).toContain('<meta property="og:locale" content="vi_VN" />')
  })

  it('declares a preview image with its dimensions, so a card renders it', () => {
    const markup = headMarkup(facts('en'))
    expect(markup).toMatch(/<meta property="og:image" content="https:[^"]+\.png" \/>/)
    expect(markup).toContain('<meta property="og:image:width" content="512" />')
    expect(markup).toContain('<meta name="twitter:card" content="summary" />')
  })

  it('escapes anything that would break out of an attribute', () => {
    const markup = headMarkup({ lang: 'en', title: 'a "quoted" & <angled>', description: 'x' })
    expect(markup).toContain('content="a &quot;quoted&quot; &amp; &lt;angled&gt;"')
  })
})

describe('replaceHead', () => {
  it('swaps the block in place and leaves the rest of the document alone', () => {
    const swapped = replaceHead(html, facts('en'))
    expect(swapped).toContain(`<link rel="canonical" href="${localeUrl('en')}" />`)
    expect(swapped).not.toContain(`<link rel="canonical" href="${localeUrl(DEFAULT_LANG)}" />`)
    expect(swapped).toContain('<div id="root"></div>')
    expect(swapped).toContain('rel="manifest"')
  })

  it('fails loudly rather than silently writing an unlocalised document', () => {
    expect(() => replaceHead('<html><head></head></html>', facts('en'))).toThrow(/markers/)
  })
})
