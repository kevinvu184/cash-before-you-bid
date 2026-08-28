// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { SCENARIOS_KEY } from '../logic/scenarioStore'
import { SKIN_IDS, type SkinId } from '../logic/skins'
import { SKINS } from '../skins/registry'

/**
 * Focus through the saved-scenario row's three shapes, in both skins.
 *
 * Choosing rename or delete unmounts the button that was activated to choose
 * it, and before this was handled the default skin dropped focus on `<body>`:
 * a keyboard reader was returned to the top of the document and had to tab
 * back through the whole page. Each assertion below is a step of the path a
 * keyboard reader actually takes, so a regression reads as the step it broke.
 */

beforeAll(async () => {
  await Promise.all(Object.values(SKINS).map((skin) => skin.load()))
})

beforeEach(() => {
  window.localStorage.clear()
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
}

const panel = (field: string) => document.querySelector(`[data-field="${field}"]`) as HTMLElement
const rowButtons = () =>
  Array.from(panel('scenarioList').querySelectorAll<HTMLButtonElement>('li button'))
const nameBox = () => document.getElementById('scenario-name') as HTMLInputElement

/** Matches on the accessible label, which names the scenario; keys differ. */
const button = (fragment: string) =>
  rowButtons().find((candidate) =>
    (candidate.getAttribute('aria-label') ?? candidate.textContent ?? '').includes(fragment),
  ) as HTMLButtonElement

function saveOne(name: string) {
  fireEvent.change(nameBox(), { target: { value: name } })
  fireEvent.click(panel('scenarioSave').querySelector('button') as HTMLButtonElement)
}

const cases = SKIN_IDS.flatMap((skin) => LANGS.map((locale) => [skin, locale] as const))
const NAME = '12 Rose St'

describe.each(cases)('a saved-scenario row in the %s skin (%s)', (skin, locale) => {
  it('moves focus into the rename box, and back to the button that opened it', async () => {
    await renderApp(skin, locale)
    saveOne(NAME)

    const rename = button(i18n.t('scenarios.rename'))
    rename.focus()
    fireEvent.click(rename)

    // The row's own rename box, not the panel's save box.
    const renameBox = panel('scenarioList').querySelector('input') as HTMLInputElement
    expect(renameBox).not.toBeNull()
    expect(document.activeElement).toBe(renameBox)

    const cancel = rowButtons().find(
      (candidate) => candidate.textContent === i18n.t('scenarios.cancel'),
    ) as HTMLButtonElement
    fireEvent.click(cancel)
    expect(document.activeElement).toBe(button(i18n.t('scenarios.rename')))
  })

  it('moves focus to the delete confirmation, and describes it with the question', async () => {
    await renderApp(skin, locale)
    saveOne(NAME)

    fireEvent.click(button(i18n.t('scenarios.remove')))

    const confirm = document.activeElement as HTMLButtonElement
    expect(confirm.tagName).toBe('BUTTON')
    expect(confirm.textContent).toBe(i18n.t('scenarios.remove'))
    const describedBy = confirm.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    expect(document.getElementById(describedBy as string)?.textContent).toContain(NAME)
  })

  // The one transition the row cannot catch: it is gone by the time focus has
  // to move, so the panel puts it on the box that is always there.
  it('falls back to the name box once the row it was on is removed', async () => {
    await renderApp(skin, locale)
    saveOne(NAME)

    fireEvent.click(button(i18n.t('scenarios.remove')))
    fireEvent.click(document.activeElement as HTMLButtonElement)

    expect(rowButtons()).toHaveLength(0)
    expect(document.activeElement).toBe(nameBox())
  })

  it('leaves focus alone when a scenario is saved rather than removed', async () => {
    await renderApp(skin, locale)
    const price = document.getElementById('price') as HTMLInputElement
    price.focus()
    saveOne(NAME)
    expect(document.activeElement).toBe(price)
    expect(window.localStorage.getItem(SCENARIOS_KEY)).not.toBeNull()
  })
})
