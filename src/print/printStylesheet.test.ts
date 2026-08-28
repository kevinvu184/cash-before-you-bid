import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// jsdom has no print medium and evaluates no media query, so the component
// test above can only prove what is on the sheet, never that it reaches paper.
// These read the stylesheet itself and hold it to the things the printed page
// depends on — each of which fails silently and invisibly in a browser.

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = dirname(HERE)

const printCss = readFileSync(join(HERE, 'print.css'), 'utf8')
const indexCss = readFileSync(join(SRC, 'index.css'), 'utf8')

interface Rule {
  /** The selector list, comments removed, one space between tokens. */
  selectors: string[]
  /** The declarations, verbatim, so an assertion can read what is written. */
  body: string
}

const COMMENT = /\/\*[\s\S]*?\*\//g

/**
 * The top-level rules of a stylesheet, with any nested at-rule body kept whole
 * as the rule's own body.
 *
 * It steps over comments and quoted strings rather than counting braces
 * blindly, so a brace inside a comment or a `content: '{'` cannot throw the
 * nesting out and fail these tests for a reason that has nothing to do with
 * printing.
 */
function rules(css: string): Rule[] {
  const found: Rule[] = []
  let index = 0
  let depth = 0
  let selectorStart = 0
  let bodyStart = 0

  while (index < css.length) {
    const char = css[index]
    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      index = end === -1 ? css.length : end + 2
    } else if (char === '"' || char === "'") {
      index += 1
      while (index < css.length && css[index] !== char) {
        index += css[index] === '\\' ? 2 : 1
      }
      index += 1
    } else if (char === '{') {
      depth += 1
      if (depth === 1) bodyStart = index + 1
      index += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        found.push({
          selectors: css
            .slice(selectorStart, bodyStart - 1)
            .replace(COMMENT, '')
            .split(',')
            .map((selector) => selector.trim().replace(/\s+/g, ' '))
            .filter((selector) => selector.length > 0),
          body: css.slice(bodyStart, index),
        })
        selectorStart = index + 1
      }
      index += 1
    } else {
      index += 1
    }
  }
  return found
}

/** The declarations of the rule listing `selector` — exactly, not as a substring. */
function rule(css: string, selector: string): string {
  const found = rules(css).find((candidate) => candidate.selectors.includes(selector))
  if (found === undefined) throw new Error(`no rule for ${selector}`)
  return found.body
}

/**
 * The rule whose whole selector list is `selector` and nothing else. The sheet
 * root is also the first selector of the reset that follows it, so asking for
 * the rule that lists it would find the reset instead.
 */
function soleRule(css: string, selector: string): string {
  const found = rules(css).find(
    (candidate) => candidate.selectors.length === 1 && candidate.selectors[0] === selector,
  )
  if (found === undefined) throw new Error(`no rule whose only selector is ${selector}`)
  return found.body
}

const printBlock = rules(printCss).find((candidate) => candidate.selectors.includes('@media print'))
if (printBlock === undefined) throw new Error('print.css declares no @media print block')
const block = printBlock.body

describe('the print stylesheet', () => {
  it('takes the live page off the paper in one rule, not a list that goes stale', () => {
    // Everything the ticket asks to hide — the inputs panel, the sticky total,
    // the language, skin and colour-mode switchers, the translation notice —
    // is inside .app-screen, and so is anything a later ticket adds.
    expect(rule(block, '.app-screen')).toMatch(/display:\s*none/)
    // Transparent on screen: the wrapper must not become a box of its own.
    expect(rule(indexCss, '.app-screen')).toMatch(/display:\s*contents/)
  })

  it('reveals the one-pager for paper, and keeps it off the screen otherwise', () => {
    // Two author rules, the print one second, so the cascade settles it with
    // nothing to disagree about. Not the `hidden` attribute: that is defined
    // as "not to be rendered", and revealing the sheet would then mean
    // overriding a user-agent rule inside the one medium where being wrong
    // prints a blank page.
    expect(soleRule(printCss.replace(block, ''), '.print-sheet')).toMatch(/display:\s*none/)
    expect(soleRule(block, '.print-sheet')).toMatch(/display:\s*block/)
    expect(printCss).not.toMatch(/\[hidden\]/)
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
    for (const selector of [
      '.print-sheet.print-sheet .print-headline',
      '.print-sheet.print-sheet .print-caveats',
    ]) {
      const declarations = rule(block, selector)
      expect(declarations).toMatch(/break-inside:\s*avoid/)
      // The legacy alias, for print engines that never adopted break-inside.
      expect(declarations).toMatch(/page-break-inside:\s*avoid/)
    }
  })

  it('takes the skin’s typography off, so every skin prints the same sheet', () => {
    // Both skins style bare `p`, `li`, `td`, `th` at (0,1,1); without a reset
    // that out-specifies them the same markup sets in a different size under
    // each skin. Found in a browser, not in jsdom, which computes neither.
    const reset = rule(block, '.print-sheet.print-sheet *')
    expect(reset).toMatch(/font-size:\s*inherit/)
    expect(reset).toMatch(/line-height:\s*inherit/)
    // A typeface is the most visible part of a theme, so paper pins its own
    // rather than inheriting var(--font-body) from whichever skin is active.
    expect(soleRule(block, '.print-sheet.print-sheet')).toMatch(/font-family:\s*'Libre Franklin'/)
  })

  it('constrains the table rather than letting prose widen it off the sheet', () => {
    const lines = rule(block, '.print-sheet.print-sheet .print-lines')
    expect(lines).toMatch(/table-layout:\s*fixed/)
    expect(lines).toMatch(/width:\s*100%/)
    // Vietnamese runs about a third longer than English; it wraps, not spills.
    expect(soleRule(block, '.print-sheet.print-sheet')).toMatch(/overflow-wrap:\s*break-word/)
  })

  it('prints the address of a citation, since paper cannot be tapped', () => {
    expect(rule(block, '.print-sheet.print-sheet .print-cite::after')).toMatch(
      /content:.*attr\(href\)/,
    )
    // Not every link: an address printed in full reads as an authority the
    // bidder can go and check, so it is spelled out only where following it
    // actually verifies a figure on this page.
    expect(() => rule(block, '.print-sheet.print-sheet a::after')).toThrow()
  })
})

describe('the rule scanner these tests rely on', () => {
  it('steps over braces inside comments and quoted strings', () => {
    const parsed = rules(`
      /* a comment with a stray { brace */
      .a::after { content: '}{'; color: red }
      .b, .c { display: none }
    `)

    expect(parsed.map((entry) => entry.selectors)).toEqual([['.a::after'], ['.b', '.c']])
    expect(parsed[1]?.body).toMatch(/display:\s*none/)
  })

  it('matches a selector exactly, never as a substring of a longer one', () => {
    const css = '.print-sheet.print-sheet * { font-size: inherit } .print-sheet * { color: red }'

    expect(rule(css, '.print-sheet *')).toMatch(/color/)
    expect(rule(css, '.print-sheet.print-sheet *')).toMatch(/font-size/)
  })

  it('tells a rule apart from one that merely lists its selector alongside others', () => {
    const css = '.a, .a * { margin: 0 } .a { font-size: 9pt }'

    expect(rule(css, '.a')).toMatch(/margin/)
    expect(soleRule(css, '.a')).toMatch(/font-size/)
  })
})
