// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { LANGS } from '../logic/lang'
import { viewModelFixture } from '../testing/viewModelFixture'
import type { SkinModule } from '../types/skin'
import { SKINS } from './registry'

// The privacy statement, as a reader meets it. Parity proves the field is in
// the DOM in every skin; this proves it is in the right place — beside the
// savings box, where someone hesitates — that it says something in both
// locales, and that a phone can read it without hovering over anything.

const SKIN_LIST = Object.values(SKINS)
const modules = new Map<string, SkinModule>()

beforeAll(async () => {
  for (const entry of SKIN_LIST) modules.set(entry.id, await entry.load())
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

async function renderSkin(id: string, locale: (typeof LANGS)[number]) {
  await i18n.changeLanguage(locale)
  const module = modules.get(id)
  if (!module) throw new Error(`skin not loaded: ${id}`)
  const Root = module.components.Root
  return render(<Root vm={viewModelFixture({ locale })} />).container
}

/**
 * What a reader sees having tapped nothing: the page with the body of every
 * closed disclosure removed, its summary left where it is.
 */
function textBeforeAnyTap(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement
  for (const details of clone.querySelectorAll('details')) {
    if (details.open) continue
    for (const child of [...details.children]) {
      if (child.tagName !== 'SUMMARY') child.remove()
    }
  }
  return clone.textContent ?? ''
}

describe.each(SKIN_LIST.map((entry) => entry.id))('privacy statement in skin %s', (skinId) => {
  it.each(LANGS)('spells out all four points in %s', async (locale) => {
    const container = await renderSkin(skinId, locale)
    const privacy = container.querySelector('[data-field="inputsPrivacy"]')
    expect(privacy).not.toBeNull()
    expect(privacy?.querySelectorAll('li').length).toBe(4)
    // Not an empty shell of <strong> markers: every point has a body too.
    expect((privacy?.textContent ?? '').length).toBeGreaterThan(200)
  })

  it('sits in the inputs panel, next to the two figures it is about', async () => {
    const container = await renderSkin(skinId, 'en')
    const privacy = container.querySelector('[data-field="inputsPrivacy"]')
    const savings = container.querySelector('[data-field="savings"]')
    const loan = container.querySelector('[data-field="preApprovedLoan"]')
    expect(privacy).not.toBeNull()
    expect(savings).not.toBeNull()
    expect(loan).not.toBeNull()

    // Same panel as the savings field — not the notes at the foot of the page.
    const panel = savings?.closest('aside, section')
    expect(panel?.contains(privacy as Node)).toBe(true)

    // And after both money-you-have fields, so it reads as a note on them.
    const order = Node.DOCUMENT_POSITION_FOLLOWING
    expect((savings as Node).compareDocumentPosition(privacy as Node) & order).toBe(order)
    expect((loan as Node).compareDocumentPosition(privacy as Node) & order).toBe(order)
  })

  it('reads the claim without any interaction at all', async () => {
    // Whatever a skin does with the detail, the claim itself must be on screen
    // unopened: a promise behind a tap is a promise nobody reads. A closed
    // <details> shows only its <summary>, so the claim may live there — but it
    // may not be one of the points inside.
    const container = await renderSkin(skinId, 'en')
    expect(textBeforeAnyTap(container)).toContain('never leave your browser')
  })

  it('is opened by a control, or by nothing at all — never by hover', async () => {
    const container = await renderSkin(skinId, 'en')
    const privacy = container.querySelector('[data-field="inputsPrivacy"]')
    const details = privacy?.closest('details')
    if (details === null || details === undefined) {
      // Nothing to open: the plain skin puts every point on the page.
      expect(privacy?.querySelectorAll('li').length).toBe(4)
      return
    }
    // A native <summary> is a button to a screen reader and a Tab stop for a
    // keyboard, and the points are in the DOM while it is shut.
    const summary = details.querySelector('summary')
    expect(summary).not.toBeNull()
    expect(details.open).toBe(false)
    expect(details.querySelectorAll('[data-field="inputsPrivacy"] li').length).toBe(4)
  })
})
