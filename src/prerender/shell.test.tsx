import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import '../i18n'
import i18n from '../i18n'
import { LANGS, type Lang } from '../logic/lang'
import { Root } from '../skins/default/Root'
import { viewModelFixture } from '../testing/viewModelFixture'
import { renderLocale } from './entry'
import { Shell } from './Shell'

// The prerendered shell is the default skin's own components, composed into a
// smaller page. Two things can go wrong with that and nothing else can: the
// wrappers it states itself could stop matching the skin's, and the render
// could stop being locale-correct. One test each.

async function markupFor(lang: Lang) {
  const rendered = await renderLocale(lang)
  return rendered
}

describe('the prerendered shell', () => {
  it('renders the same masthead and inputs markup the skin does', () => {
    const vm = viewModelFixture()
    const page = renderToStaticMarkup(createElement(Root, { vm }))
    const shell = renderToStaticMarkup(createElement(Shell, { vm }))

    // Everything between the wrappers is the skin's, verbatim. Substring
    // rather than equality on purpose: Root has the results and the scenarios
    // as well, and this is asserting that the shell invented nothing.
    const masthead = shell.slice(shell.indexOf('<header'), shell.indexOf('</header>') + 9)
    const panel = shell.slice(shell.indexOf('<section'), shell.indexOf('</section>') + 10)
    // Both are the guard that keeps this from becoming a test of two empty
    // strings when a tag name changes — which is how the move of the inputs
    // panel from <aside> to <section> was caught rather than waved through.
    expect(masthead.length).toBeGreaterThan(200)
    expect(panel.length).toBeGreaterThan(200)
    expect(page).toContain(masthead)
    expect(page).toContain(panel)
  })

  it('nests them the way the skin’s stylesheet expects', () => {
    const vm = viewModelFixture()
    const shell = renderToStaticMarkup(createElement(Shell, { vm }))
    const page = renderToStaticMarkup(createElement(Root, { vm }))
    for (const wrapper of ['<div class="page">', '<main>', '<div class="columns">']) {
      expect(shell).toContain(wrapper)
      expect(page).toContain(wrapper)
    }
  })

  it('leaves out every figure, so no reader is shown a number they did not ask for', async () => {
    const { body } = await markupFor('en')
    const page = renderToStaticMarkup(createElement(Root, { vm: viewModelFixture() }))
    // Each of these is somewhere in the skin's results — the stat row, the
    // line table, the verdict. None of them belongs in a document rendered
    // before the URL, and therefore the calculation, is known. Asserted
    // against Root as well, so a rename cannot turn this into a test of
    // nothing.
    for (const marker of ['class="stat', '<table', 'class="verdict']) {
      expect(page).toContain(marker)
      expect(body).not.toContain(marker)
    }
  })
})

describe('each locale’s document', () => {
  it.each(LANGS)('renders %s copy, and says so', async (lang) => {
    const { body, title, description } = await markupFor(lang)
    expect(i18n.getFixedT(lang)('app.pageTitle')).toBe(title)
    expect(i18n.getFixedT(lang)('app.metaDescription')).toBe(description)
    expect(body).toContain(i18n.getFixedT(lang)('app.lede'))
    expect(body).toContain(i18n.getFixedT(lang)('inputs.price'))
  })

  it('shows the machine-translation disclosure only in the locale it is about', async () => {
    const disclosure = i18n.getFixedT('vi')('notice.aiTranslation')
    expect((await markupFor('vi')).body).toContain(disclosure)
    expect((await markupFor('en')).body).not.toContain('translation-notice')
  })

  it('renders the inputs on their defaults, which is what a bare URL shows', async () => {
    const { body } = await markupFor('en')
    // A value attribute proves the fields are populated rather than empty; the
    // figures themselves are the calculator's defaults, asserted where they
    // are defined.
    expect(body).toMatch(/<input id="price"[^>]*value="[^"]+"/)
  })
})
