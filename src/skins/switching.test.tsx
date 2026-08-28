// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import i18n from '../i18n'
import { TOKEN_CSS_VARS } from '../logic/theme'
import { SKINS } from './registry'

// Switching skin or mode is a presentation change: it must move the URL and
// the painted tokens, and nothing else.

beforeAll(async () => {
  await Promise.all(Object.values(SKINS).map((skin) => skin.load()))
})

async function renderApp() {
  const result = render(<App />)
  await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
  return result
}

const root = () => document.documentElement
const cssVar = (name: string) => root().style.getPropertyValue(name)

beforeEach(async () => {
  window.history.replaceState(null, '', '/')
  await i18n.changeLanguage('en')
})

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

describe('choosing a skin', () => {
  it('writes ?skin=, keeps every other param, and preserves core state', async () => {
    window.history.replaceState(null, '', '/?lang=en&price=820000&region=regional&route=lmi')
    await renderApp()
    const before = root().dataset.coreInstance

    fireEvent.click(screen.getByRole('button', { name: 'Plain' }))

    await waitFor(() => expect(root().dataset.skin).toBe('plain'))
    // The incoming skin is a lazy chunk; wait for it to be on the page.
    await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
    expect(window.location.search).toBe(
      '?lang=en&price=820000&region=regional&route=lmi&skin=plain',
    )
    // The calculator state came through the switch untouched...
    expect((document.getElementById('price') as HTMLInputElement).value).toBe('820000')
    expect((document.getElementById('route') as HTMLSelectElement).value).toBe('lmi')
    expect((document.getElementById('region') as HTMLSelectElement).value).toBe('regional')
    // ...and the hooks holding it were never remounted.
    expect(root().dataset.coreInstance).toBe(before)
  })

  it('paints the chosen skin’s tokens', async () => {
    window.history.replaceState(null, '', '/?lang=en')
    await renderApp()
    expect(cssVar(TOKEN_CSS_VARS.colorBg)).toBe(SKINS.default.tokens.light.colorBg)

    fireEvent.click(screen.getByRole('button', { name: 'Plain' }))
    await waitFor(() =>
      expect(cssVar(TOKEN_CSS_VARS.colorBg)).toBe(SKINS.plain.tokens.light.colorBg),
    )
    expect(cssVar(TOKEN_CSS_VARS.radiusSm)).toBe(SKINS.plain.tokens.light.radiusSm)
  })
})

describe('choosing a colour mode', () => {
  it('writes ?mode=, keeps every other param, and preserves core state', async () => {
    window.history.replaceState(null, '', '/?lang=en&price=820000&skin=plain')
    await renderApp()
    const before = root().dataset.coreInstance

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))

    await waitFor(() => expect(root().dataset.mode).toBe('dark'))
    expect(window.location.search).toBe('?lang=en&mode=dark&price=820000&skin=plain')
    await waitFor(() => expect(document.getElementById('price')).not.toBeNull())
    expect(cssVar(TOKEN_CSS_VARS.colorBg)).toBe(SKINS.plain.tokens.dark.colorBg)
    expect((document.getElementById('price') as HTMLInputElement).value).toBe('820000')
    expect(root().dataset.coreInstance).toBe(before)
    // The skin is unchanged: the two axes are independent.
    expect(root().dataset.skin).toBe('plain')
  })

  it('follows the operating system while no mode is chosen', async () => {
    window.history.replaceState(null, '', '/?lang=en')
    await renderApp()
    // The jsdom stub reports no match for (prefers-color-scheme: dark).
    expect(root().dataset.mode).toBe('light')
    expect(window.location.search).toBe('?lang=en')
  })
})

describe('unknown values', () => {
  it('falls back to the plain skin and rewrites the URL', async () => {
    window.history.replaceState(null, '', '/?lang=en&skin=neon')
    await renderApp()
    await waitFor(() => expect(window.location.search).toBe('?lang=en&skin=plain'))
    expect(root().dataset.skin).toBe('plain')
  })

  it('falls back to the system mode and drops the param', async () => {
    window.history.replaceState(null, '', '/?lang=en&mode=sepia')
    await renderApp()
    await waitFor(() => expect(window.location.search).toBe('?lang=en'))
    expect(root().dataset.mode).toBe('light')
  })

  it('keeps the calculator params while rewriting an unknown skin', async () => {
    window.history.replaceState(null, '', '/?lang=en&price=620000&skin=neon')
    await renderApp()
    await waitFor(() => expect(window.location.search).toBe('?lang=en&price=620000&skin=plain'))
  })
})
