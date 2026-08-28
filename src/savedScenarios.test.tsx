// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import i18n from './i18n'
import { SCENARIOS_KEY, parseScenarios } from './logic/scenarioStore'
import { SKINS } from './skins/registry'

// Saving and restoring, through the real app rather than the hook: the round
// trip only holds if what "save" writes is exactly what the URL codec produces
// and what "load" applies goes back through the same codec.

beforeAll(async () => {
  await Promise.all(Object.values(SKINS).map((skin) => skin.load()))
})

async function renderApp() {
  const result = render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
  await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
  return result
}

const input = (id: string) => document.getElementById(id) as HTMLInputElement
const select = (id: string) => document.getElementById(id) as HTMLSelectElement
const panel = (field: string) =>
  document.querySelector(`[data-field="${field}"]`) as HTMLElement

/** The row's controls, in DOM order: load, then rename, then delete. */
function rowButtons(): HTMLButtonElement[] {
  return Array.from(panel('scenarioList').querySelectorAll('li button'))
}

function saveAs(name: string) {
  const save = panel('scenarioSave')
  fireEvent.change(save.querySelector('input') as HTMLInputElement, { target: { value: name } })
  fireEvent.click(save.querySelector('button') as HTMLButtonElement)
}

function seed(scenarios: unknown) {
  window.localStorage.setItem(SCENARIOS_KEY, JSON.stringify({ version: 1, scenarios }))
}

beforeEach(async () => {
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
  await i18n.changeLanguage('vi')
})

afterEach(cleanup)

describe('saving a scenario', () => {
  it('stores the query string the URL codec produced, not a copy of the inputs', async () => {
    window.history.replaceState(null, '', '/?dep=12&price=820000&route=lmi')
    await renderApp()
    saveAs('12 Rose St')

    const [saved] = parseScenarios(window.localStorage.getItem(SCENARIOS_KEY))
    expect(saved.name).toBe('12 Rose St')
    expect(saved.query).toBe('dep=12&price=820000&route=lmi')
    expect(saved.savedAt).toBeGreaterThan(0)
  })

  it('clears the name box and lists the scenario', async () => {
    await renderApp()
    saveAs('12 Rose St')
    const box = panel('scenarioSave').querySelector('input') as HTMLInputElement
    expect(box.value).toBe('')
    expect(panel('scenarioList').textContent).toContain('12 Rose St')
  })

  it('will not save an unnamed scenario', async () => {
    await renderApp()
    const button = panel('scenarioSave').querySelector('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(window.localStorage.getItem(SCENARIOS_KEY)).toBeNull()
  })
})

describe('restoring a scenario', () => {
  it('puts back every input the scenario was saved with', async () => {
    window.history.replaceState(null, '', '/?dep=12&fhb=0&price=820000&route=lmi')
    await renderApp()
    saveAs('12 Rose St')

    // Move on to the next property, as a buyer would the following Saturday.
    fireEvent.change(select('route'), { target: { value: 'htb' } })
    fireEvent.change(select('region'), { target: { value: 'regional' } })
    expect(input('price').value).toBe('820000')
    expect(select('route').value).toBe('htb')

    fireEvent.click(rowButtons()[0])

    await waitFor(() => expect(select('route').value).toBe('lmi'))
    expect(input('price').value).toBe('820000')
    expect(input('dep').value).toBe('12')
    expect(input('fhb').checked).toBe(false)
    expect(select('region').value).toBe('metro')
    expect(window.location.search).toBe('?dep=12&fhb=0&price=820000&route=lmi')
  })

  it('keeps the language being read rather than the one it was saved in', async () => {
    await renderApp()
    saveAs('12 Rose St')
    fireEvent.change(select('route'), { target: { value: 'htb' } })

    // The scenario was saved in vi; the reader has since switched to en.
    window.history.replaceState(null, '', '/?lang=en&route=htb')
    cleanup()
    await renderApp()
    await waitFor(() => expect(i18n.language).toBe('en'))

    fireEvent.click(rowButtons()[0])
    await waitFor(() => expect(select('route').value).toBe('scheme'))
    expect(window.location.search).toBe('?lang=en')
    expect(i18n.language).toBe('en')
  })

  it('falls back to today’s defaults for a query string that no longer parses', async () => {
    // What an older version of the app might have written: a parameter that no
    // longer exists, a route that was renamed, a price that is not a number.
    seed([
      {
        id: 'old',
        name: 'saved last winter',
        query: 'price=abc&route=gone&removedParam=7&dep=999',
        savedAt: 1_756_000_000_000,
      },
    ])
    await renderApp()
    fireEvent.click(rowButtons()[0])

    // The unknown parameter and the renamed route are gone, the unreadable
    // price is back to its default, and 999% is clamped to the codec's
    // maximum — exactly what the same query string does in the address bar.
    await waitFor(() => expect(window.location.search).toBe('?dep=100'))
    expect(input('price').value).toBe('750000')
    expect(select('route').value).toBe('scheme')
    expect(input('dep').value).toBe('100')
  })
})

describe('a scenario with no usable date', () => {
  it('renders the row without printing 1 January 1970', async () => {
    // savedAt 0 is what a hand edit, or a version that did not record one,
    // leaves behind. The row is still worth showing; the date is not.
    seed([
      { id: 'dated', name: 'has a date', query: 'price=820000', savedAt: 1_756_000_000_000 },
      { id: 'undated', name: 'no date', query: 'price=690000', savedAt: 0 },
    ])
    await renderApp()

    const rows = panel('scenarioList').querySelectorAll('li')
    expect(rows).toHaveLength(2)
    expect(rows[0].querySelector('.scenario-date')).not.toBeNull()
    expect(rows[1].querySelector('.scenario-date')).toBeNull()
    expect(rows[1].textContent).toContain('no date')
    expect(panel('scenarioList').textContent).not.toContain('1970')

    // And it still loads.
    fireEvent.click(rowButtons()[3])
    await waitFor(() => expect(window.location.search).toBe('?price=690000'))
  })
})

describe('renaming and deleting', () => {
  it('renames from the row, and keeps the query untouched', async () => {
    window.history.replaceState(null, '', '/?price=820000')
    await renderApp()
    saveAs('12 Rose St')

    fireEvent.click(rowButtons()[1])
    const box = panel('scenarioList').querySelector('li input') as HTMLInputElement
    fireEvent.change(box, { target: { value: '12 Rose St, Preston' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    expect(panel('scenarioList').textContent).toContain('12 Rose St, Preston')
    const [saved] = parseScenarios(window.localStorage.getItem(SCENARIOS_KEY))
    expect(saved.name).toBe('12 Rose St, Preston')
    expect(saved.query).toBe('price=820000')
  })

  it('leaves the rename open when the name has been cleared to nothing', async () => {
    await renderApp()
    saveAs('12 Rose St')
    fireEvent.click(rowButtons()[1])
    const box = panel('scenarioList').querySelector('li input') as HTMLInputElement
    fireEvent.change(box, { target: { value: '   ' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    expect(panel('scenarioList').querySelector('li input')).not.toBeNull()
    expect(parseScenarios(window.localStorage.getItem(SCENARIOS_KEY))[0].name).toBe('12 Rose St')
  })

  it('asks before deleting, and deletes only on the second press', async () => {
    await renderApp()
    saveAs('12 Rose St')

    fireEvent.click(rowButtons()[2])
    expect(parseScenarios(window.localStorage.getItem(SCENARIOS_KEY))).toHaveLength(1)

    // The row is now the question and its two answers; cancel puts it back.
    fireEvent.click(rowButtons()[1])
    expect(panel('scenarioList').textContent).toContain('12 Rose St')

    fireEvent.click(rowButtons()[2])
    fireEvent.click(rowButtons()[0])
    expect(parseScenarios(window.localStorage.getItem(SCENARIOS_KEY))).toEqual([])
    expect(panel('scenarioList').textContent).toContain(i18n.t('scenarios.empty'))
  })
})

describe('when storage will not cooperate', () => {
  it('renders the page and the panel with a corrupt payload in storage', async () => {
    window.localStorage.setItem(SCENARIOS_KEY, '{"scenarios":[{"id":')
    await renderApp()
    expect(panel('scenarioList').textContent).toContain(i18n.t('scenarios.empty'))
    // The feature still works: the corrupt payload is simply overwritten.
    saveAs('12 Rose St')
    expect(parseScenarios(window.localStorage.getItem(SCENARIOS_KEY))).toHaveLength(1)
  })
})
