// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { FHB_EXEMPTION_CEILING } from '../data/rates'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { PRICE_SLIDER_STEP, buildPriceSliderField } from '../logic/priceMarkers'
import { viewModelFixture } from '../testing/viewModelFixture'
import type { SkinModule } from '../types/skin'
import type { AppViewModel } from '../types/viewModel'
import { SKINS } from './registry'
import { exactMoney } from './shared/text'

// The price slider, as a reader meets it. Parity proves the field is in the DOM
// in every skin; this proves it is a real range control bound to the price,
// that the cliffs are described in words in both locales, and that a purchaser
// with no first home buyer thresholds is shown none of them.

const SKIN_LIST = Object.values(SKINS)
const modules = new Map<string, SkinModule>()

beforeAll(async () => {
  for (const entry of SKIN_LIST) modules.set(entry.id, await entry.load())
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

async function renderSkin(id: string, locale: Lang, adjust: (vm: AppViewModel) => void = () => {}) {
  await i18n.changeLanguage(locale)
  const module = modules.get(id)
  if (!module) throw new Error(`skin not loaded: ${id}`)
  const vm = viewModelFixture({ locale })
  adjust(vm)
  const { container } = render(<module.components.Root vm={vm} />)
  const field = container.querySelector<HTMLElement>('[data-field="priceSlider"]')
  if (field === null) throw new Error(`skin ${id} rendered no price slider`)
  const input = field.querySelector<HTMLInputElement>('input[type="range"]')
  if (input === null) throw new Error(`skin ${id} rendered no range control`)
  return { field, input, vm }
}

describe.each(SKIN_LIST.map((entry) => entry.id))('price slider in skin %s', (skinId) => {
  it('binds a range control to the same price the field holds', async () => {
    const { input, vm } = await renderSkin(skinId, 'en')

    expect(input.value).toBe(String(vm.inputs.priceSlider.value))
    expect(input.value).toBe(vm.inputs.price.draft)
    expect(input.min).toBe(String(vm.inputs.priceSlider.min))
    expect(input.max).toBe(String(vm.inputs.priceSlider.max))
    expect(input.step).toBe(String(PRICE_SLIDER_STEP))
  })

  it('pairs the control with a visible label', async () => {
    const { field, input } = await renderSkin(skinId, 'en')
    const label = field.querySelector('label')

    expect(label?.getAttribute('for')).toBe(input.id)
    expect(label?.textContent?.length).toBeGreaterThan(0)
  })

  it.each(LANGS)('speaks the price as money rather than digits, in %s', async (locale) => {
    const { input } = await renderSkin(skinId, locale)

    expect(input.getAttribute('aria-valuetext')).toBe(exactMoney(820_000, locale))
  })

  it('reports the price it was dragged to, and nothing else', async () => {
    const onChange = vi.fn()
    const { input } = await renderSkin(skinId, 'en', (vm) => {
      vm.inputs.priceSlider = { ...vm.inputs.priceSlider, onChange }
    })

    fireEvent.change(input, { target: { value: '605000' } })

    expect(onChange).toHaveBeenCalledWith(605_000)
    // The number field's draft is the field's own; the slider never writes it.
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it.each(LANGS)('says what changes at each cliff, in %s', async (locale) => {
    const { field, vm } = await renderSkin(skinId, locale)
    const text = field.textContent ?? ''

    for (const marker of vm.inputs.priceSlider.markers) {
      expect(text).toContain(exactMoney(marker.value, locale))
    }
    // A missing translation renders as the key itself.
    expect(text).not.toContain('cliffs.')
    expect(text).not.toContain('inputs.priceSlider')
  })

  it('describes the control with the cliffs it carries', async () => {
    const { field, input } = await renderSkin(skinId, 'en')
    const describedBy = input.getAttribute('aria-describedby')

    expect(describedBy).not.toBeNull()
    expect(field.querySelector(`#${describedBy}`)?.textContent?.length).toBeGreaterThan(0)
  })

  it('shows no cliffs to a purchaser the thresholds do not apply to', async () => {
    const { field, input } = await renderSkin(skinId, 'en', (vm) => {
      vm.inputs.priceSlider = buildPriceSliderField(
        vm.inputs.priceSlider.value,
        { firstHomeBuyer: false, ownerOccupier: true, foreignPurchaser: false },
        () => {},
      )
    })

    // The slider stays; only the first home buyer markers go.
    expect(input.type).toBe('range')
    expect(field.querySelectorAll('li')).toHaveLength(0)
    expect(input.getAttribute('aria-describedby')).toBeNull()
    // From the config, not a figure written here: this must keep testing the
    // exemption ceiling wherever the config moves it to.
    expect(field.textContent).not.toContain(exactMoney(FHB_EXEMPTION_CEILING, 'en'))
  })
})
