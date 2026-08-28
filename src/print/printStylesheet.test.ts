import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// jsdom has no print medium and evaluates no media query, so the component
// test above can only prove what is on the sheet, never that it reaches paper.
// These read the stylesheet itself and hold it to the four things the printed
// page depends on — each of which fails silently and invisibly in a browser.

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = dirname(HERE)

const printCss = readFileSync(join(HERE, 'print.css'), 'utf8')
const indexCss = readFileSync(join(SRC, 'index.css'), 'utf8')

/** The body of the `@media print` block, brace-matched so `@page` survives. */
function printBlock(css: string): string {
  const start = css.indexOf('@media print')
  if (start === -1) throw new Error('print.css declares no @media print block')
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    if (css[i] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(open + 1, i)
    }
  }
  throw new Error('unbalanced braces in print.css')
}

/** The declarations of the first rule whose selector list contains `selector`. */
function rule(css: string, selector: string): string {
  const pattern = new RegExp(
    `(?:^|[},])\\s*([^{}]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{}]*)\\{([^{}]*)\\}`,
  )
  const found = pattern.exec(css)
  if (found === null) throw new Error(`no rule for ${selector}`)
  return found[2]
}

const block = printBlock(printCss)

describe('the print stylesheet', () => {
  it('takes the live page off the paper in one rule, not a list that goes stale', () => {
    // Everything the ticket asks to hide — the inputs panel, the sticky total,
    // the language, skin and colour-mode switchers, the translation notice —
    // is inside .app-screen, and so is anything a later ticket adds.
    expect(rule(block, '.app-screen')).toMatch(/display:\s*none/)
    // Transparent on screen: the wrapper must not become a box of its own.
    expect(rule(indexCss, '.app-screen')).toMatch(/display:\s*contents/)
  })

  it('reveals the one-pager, which is hidden everywhere else', () => {
    expect(rule(block, '.print-sheet[hidden]')).toMatch(/display:\s*block/)
    // Only the print medium may show it; nothing outside the block does.
    expect(printCss.replace(block, '')).not.toMatch(/\.print-sheet\[hidden\]/)
  })

  it('pins ink and paper, so a dark-mode page does not print white on white', () => {
    const ground = rule(block, '.print-sheet *')
    expect(ground).toMatch(/background:\s*#ffffff\s*!important/)
    expect(ground).toMatch(/color:\s*#000000\s*!important/)
    // The root's colour-scheme follows the viewer's mode and would otherwise
    // darken system colours on paper too.
    expect(rule(block, ':root')).toMatch(/color-scheme:\s*light/)
  })

  it('keeps the three figures and their caveats on one page', () => {
    for (const selector of ['.print-headline', '.print-caveats']) {
      const declarations = rule(block, selector)
      expect(declarations).toMatch(/break-inside:\s*avoid/)
      // The legacy alias, for print engines that never adopted break-inside.
      expect(declarations).toMatch(/page-break-inside:\s*avoid/)
    }
  })

  it('takes the skin\u2019s typography off, so every skin prints the same sheet', () => {
    // Both skins style bare `p`, `li`, `td`, `th` at (0,1,1); without a reset
    // that out-specifies them the same markup sets in a different size under
    // each skin. Found in a browser, not in jsdom, which computes neither.
    const reset = rule(block, '.print-sheet.print-sheet *')
    expect(reset).toMatch(/font-size:\s*inherit/)
    expect(reset).toMatch(/line-height:\s*inherit/)
    // A typeface is the most visible part of a theme, so paper pins its own
    // rather than inheriting var(--font-body) from whichever skin is active.
    expect(block).toMatch(/\.print-sheet\.print-sheet\s*\{[^}]*font-family:\s*'Libre Franklin'/)
  })

  it('constrains the table rather than letting prose widen it off the sheet', () => {
    const lines = rule(block, '.print-lines')
    expect(lines).toMatch(/table-layout:\s*fixed/)
    expect(lines).toMatch(/width:\s*100%/)
    // Vietnamese runs about a third longer than English; it wraps, not spills.
    // Anchored on the sheet's own rule, not the reset that shares its prefix.
    expect(block).toMatch(/\.print-sheet\.print-sheet\s*\{[^}]*overflow-wrap:\s*break-word/)
  })

  it('prints the address of every link, since paper cannot be tapped', () => {
    expect(rule(block, '.print-sheet a::after')).toMatch(/content:.*attr\(href\)/)
  })
})
