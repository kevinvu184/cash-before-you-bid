// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import App from '../App'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { SKIN_IDS, type SkinId } from '../logic/skins'
import { SKINS } from '../skins/registry'
import { RESULTS_ANCHOR_ID } from './anchors'

/**
 * The structural half of the WCAG audit, as assertions.
 *
 * It renders the real shell — not a skin in isolation — because half of what
 * it checks is the seam between them: the skip link belongs to the shell, its
 * target to the skin, and neither is worth anything without the other. Every
 * registered skin is covered in both locales, so a third skin is held to the
 * same rules the moment it is registered.
 *
 * These are the checks a tool would make. They are not the audit: nothing here
 * can tell you whether a label reads sensibly or whether the reading order
 * makes sense, which is what the manual passes recorded in the pull request
 * were for. What they do is stop the ones that are mechanical from coming
 * back.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, details, [tabindex]:not([tabindex="-1"])'

beforeAll(async () => {
  await Promise.all(Object.values(SKINS).map((skin) => skin.load()))
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

async function renderApp(skin: SkinId, locale: Lang) {
  window.history.replaceState(null, '', `/?skin=${skin}&lang=${locale}`)
  await i18n.changeLanguage(locale)
  render(<App />)
  await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
  return document.body
}

/**
 * Enough of the accessible name computation for the elements this app has:
 * aria-label, aria-labelledby, an associated or wrapping <label>, and finally
 * the element's own text. jsdom implements none of it, and pulling in a full
 * accname engine to check "does this control have a name at all" would be a
 * dependency for one boolean.
 */
function accessibleName(element: Element): string {
  const aria = element.getAttribute('aria-label')
  if (aria) return aria.trim()

  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    return labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
  }

  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
    if (label?.textContent?.trim()) return label.textContent.trim()
  }

  const wrapping = element.closest('label')
  if (wrapping?.textContent?.trim()) return wrapping.textContent.trim()

  if (element.tagName === 'TABLE') {
    const caption = element.querySelector('caption')
    if (caption?.textContent?.trim()) return caption.textContent.trim()
    return ''
  }

  return (element.textContent ?? '').trim()
}

const cases = SKIN_IDS.flatMap((skin) => LANGS.map((locale) => [skin, locale] as const))

describe.each(cases)('the %s skin in %s', (skin, locale) => {
  it('has exactly one first-level heading', async () => {
    const body = await renderApp(skin, locale)
    expect(body.querySelectorAll('h1')).toHaveLength(1)
  })

  it('never skips a heading level', async () => {
    const body = await renderApp(skin, locale)
    const levels = [...body.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) =>
      Number(heading.tagName.slice(1)),
    )
    expect(levels[0]).toBe(1)
    const skips = levels
      .map((level, index) => ({ level, previous: levels[index - 1] ?? level }))
      .filter((step) => step.level > step.previous + 1)
    expect(skips).toEqual([])
  })

  // The inputs used to sit outside <main> — in the default skin inside an
  // <aside>, which announces the calculator's own fields as supporting
  // material. One main landmark, over all of it.
  it('puts the inputs and the results inside one main landmark', async () => {
    const body = await renderApp(skin, locale)
    const mains = body.querySelectorAll('main, [role="main"]')
    expect(mains).toHaveLength(1)
    const main = mains[0]
    expect(main.querySelector('#price')).not.toBeNull()
    expect(main.querySelector(`#${RESULTS_ANCHOR_ID}`)).not.toBeNull()
  })

  it('gives the results landmark a name and a focus target for the skip link', async () => {
    const body = await renderApp(skin, locale)
    const results = body.querySelector(`#${RESULTS_ANCHOR_ID}`)
    expect(results).not.toBeNull()
    expect(results?.getAttribute('tabindex')).toBe('-1')
    expect(accessibleName(results as Element)).not.toBe('')
  })

  it('offers the skip link as the first focusable element', async () => {
    const body = await renderApp(skin, locale)
    const first = body.querySelector(FOCUSABLE)
    expect(first?.className).toBe('skip-link')
    expect(first?.getAttribute('href')).toBe(`#${RESULTS_ANCHOR_ID}`)
    expect(accessibleName(first as Element)).not.toBe('')
  })

  it('names every input and select', async () => {
    const body = await renderApp(skin, locale)
    const controls = [...body.querySelectorAll('input, select, textarea')]
    expect(controls.length).toBeGreaterThan(10)
    expect(controls.filter((control) => accessibleName(control) === '')).toEqual([])
  })

  it('names every button and link', async () => {
    const body = await renderApp(skin, locale)
    const controls = [...body.querySelectorAll('button, a[href]')]
    expect(controls.filter((control) => accessibleName(control) === '')).toEqual([])
  })

  it('names every table', async () => {
    const body = await renderApp(skin, locale)
    const tables = [...body.querySelectorAll('table')]
    expect(tables.length).toBeGreaterThan(0)
    expect(tables.filter((table) => accessibleName(table) === '')).toEqual([])
  })

  // A positive tabindex takes an element out of document order and puts it in
  // front of everything that has none, which is a trap by another name.
  it('uses no positive tabindex', async () => {
    const body = await renderApp(skin, locale)
    const positive = [...body.querySelectorAll('[tabindex]')].filter(
      (element) => Number(element.getAttribute('tabindex')) > 0,
    )
    expect(positive).toEqual([])
  })

  it('resolves every aria reference to an element that exists', async () => {
    const body = await renderApp(skin, locale)
    const dangling: string[] = []
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const element of body.querySelectorAll(`[${attribute}]`)) {
        for (const id of (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)) {
          if (!document.getElementById(id)) dangling.push(`${attribute}="${id}"`)
        }
      }
    }
    expect(dangling).toEqual([])
  })

  it('issues every id exactly once', async () => {
    const body = await renderApp(skin, locale)
    const seen = new Set<string>()
    const duplicates = [...body.querySelectorAll('[id]')]
      .map((element) => element.id)
      .filter((id) => (seen.has(id) ? true : (seen.add(id), false)))
    expect(duplicates).toEqual([])
  })

  it('publishes result changes through one polite, atomic status region', async () => {
    const body = await renderApp(skin, locale)
    const announcer = body.querySelector('p[role="status"][aria-live="polite"]')
    expect(announcer).not.toBeNull()
    expect(announcer?.getAttribute('aria-atomic')).toBe('true')
    // Silent on arrival: the figures a reader lands on are read by the page.
    expect(announcer?.textContent).toBe('')
  })
})
