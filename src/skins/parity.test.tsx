// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { COLOR_MODES, type ColorMode } from '../logic/skins'
import { viewModelFixture } from '../testing/viewModelFixture'
import type { SkinModule } from '../types/skin'
import { ALL_FIELD_IDS, type AppViewModel, type FieldId } from '../types/viewModel'
import { SKINS } from './registry'
import { estimateMoney, estimateRowAmount } from './shared/text'

// Information parity. Every registered skin, in every mode and both locales,
// renders the same fixed view model and must put exactly the same set of
// fields in the DOM: the whole FieldId set, nothing missing, nothing invented.
//
// The suite iterates Object.values(SKINS), so a third skin is covered the
// moment it is registered — this file never needs editing to add one.

const SKIN_LIST = Object.values(SKINS)

const modules = new Map<string, SkinModule>()

beforeAll(async () => {
  for (const entry of SKIN_LIST) modules.set(entry.id, await entry.load())
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

function fieldElements(root: HTMLElement): Map<FieldId, HTMLElement[]> {
  const found = new Map<FieldId, HTMLElement[]>()
  for (const element of root.querySelectorAll<HTMLElement>('[data-field]')) {
    const id = element.dataset.field as FieldId
    const list = found.get(id)
    if (list) list.push(element)
    else found.set(id, [element])
  }
  return found
}

/**
 * What a field's rendered text must contain, formatted for the locale. Returns
 * null for fields whose content is a translated string with no figure in it —
 * those are covered by the id set, not by a value assertion.
 */
function expectedText(vm: AppViewModel, id: FieldId, locale: string): string | null {
  const stat = vm.results.stats.find((candidate) => candidate.id === id)
  if (stat) return estimateMoney(stat.value, locale)
  const line = vm.results.lines.find((candidate) => candidate.id === id)
  if (line) return estimateRowAmount(line.value, locale)
  return null
}

const numericDrafts = (vm: AppViewModel): Map<FieldId, string> => {
  const drafts = new Map<FieldId, string>()
  const collect = (field: { id: FieldId; kind: string; draft?: string }) => {
    if (field.draft !== undefined) drafts.set(field.id, field.draft)
  }
  const i = vm.inputs
  for (const field of [
    i.price,
    i.depositPct,
    i.offThePlanConstruction,
    i.interestRatePct,
    i.savings,
    i.preApprovedLoan,
  ])
    collect(field)
  for (const field of i.assumptions.value) collect(field)
  return drafts
}

async function renderSkin(id: string, locale: Lang, mode: ColorMode) {
  await i18n.changeLanguage(locale)
  const vm = viewModelFixture({
    locale,
    skinId: SKINS.default.id,
    resolvedMode: mode,
  })
  const module = modules.get(id)
  if (!module) throw new Error(`skin not loaded: ${id}`)
  const Root = module.components.Root
  const { container } = render(<Root vm={vm} />)
  return { container, vm }
}

describe.each(SKIN_LIST.map((entry) => entry.id))('skin %s', (skinId) => {
  describe.each(COLOR_MODES)('in %s mode', (mode) => {
    it.each(LANGS)('renders every field, and only known fields, in %s', async (locale) => {
      const { container, vm } = await renderSkin(skinId, locale, mode)
      const found = fieldElements(container)

      expect([...found.keys()].sort()).toEqual([...ALL_FIELD_IDS].sort())

      for (const [id, elements] of found) {
        for (const element of elements) {
          expect(element.dataset.importance).toMatch(/^(primary|secondary)$/)
        }
        const expected = expectedText(vm, id, locale)
        if (expected !== null) {
          expect(elements.some((element) => element.textContent?.includes(expected))).toBe(true)
        }
      }

      // Numeric inputs show the draft the core handed them, verbatim.
      for (const [id, draft] of numericDrafts(vm)) {
        const element = found.get(id)?.[0]
        const input = element?.querySelector<HTMLInputElement>('input')
        expect(input?.value).toBe(draft)
      }
    })

    it(`declares a manifest matching what it renders (${mode})`, async () => {
      const { container } = await renderSkin(skinId, 'en', mode)
      const entry = SKIN_LIST.find((candidate) => candidate.id === skinId)
      expect(Object.keys(entry?.renders ?? {}).sort()).toEqual(
        [...fieldElements(container).keys()].sort(),
      )
    })

    it(`keeps disclosed fields in the document while collapsed (${mode})`, async () => {
      const { container } = await renderSkin(skinId, 'en', mode)
      const disclosures = container.querySelectorAll<HTMLDetailsElement>('details')
      for (const details of disclosures) {
        expect(details.open).toBe(false)
        // Every field inside is already in the DOM — that is the contract.
        expect(details.querySelectorAll('[data-field]').length).toBeGreaterThan(0)
        const summary = details.querySelector('summary')
        expect(summary).not.toBeNull()
        if (summary) {
          // jsdom does not implement the native summary toggle.
          fireEvent.click(summary)
          details.open = true
        }
        expect(details.open).toBe(true)
      }
    })
  })
})

describe('cross-skin parity', () => {
  it.each(COLOR_MODES)('renders identical field sets in every skin (%s)', async (mode) => {
    const sets: string[][] = []
    for (const entry of SKIN_LIST) {
      const { container } = await renderSkin(entry.id, 'en', mode)
      sets.push([...fieldElements(container).keys()].sort())
      cleanup()
    }
    for (const set of sets) expect(set).toEqual(sets[0])
    expect(sets[0]).toEqual([...ALL_FIELD_IDS].sort())
  })
})
