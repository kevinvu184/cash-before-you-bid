import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SKINS } from './registry'

// The hardcoded-colour check. A skin component or stylesheet may only read
// var(--token); the literal values live in exactly one place per skin, its
// tokens.ts. This walks the real source tree rather than shelling out to grep,
// so it runs the same way in CI and on a developer's machine.

const SRC = dirname(dirname(fileURLToPath(import.meta.url)))
const ROOT = dirname(SRC)

const COLOUR_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ['hex colour', /#[0-9a-fA-F]{3,8}\b/],
  ['rgb()/hsl()', /\b(rgba?|hsla?)\s*\(/],
  [
    'colour keyword',
    /(?:^|[:\s,])(?:white|black|red|green|blue|grey|gray|silver|navy|teal|orange|yellow|purple|pink|brown)\s*(?:;|$|,|\s)/,
  ],
  ['color-mix()', /\bcolor-mix\s*\(/],
]

// tokens.ts is where colours are allowed to be literal; index.html carries the
// pre-paint ground pair and has its own test holding it to the token objects.
const ALLOWED = new Set(Object.values(SKINS).map((entry) => join('skins', entry.id, 'tokens.ts')))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name)
    if (item.isDirectory()) return sourceFiles(path)
    if (/\.(ts|tsx|css)$/.test(item.name) && !/\.test\.(ts|tsx)$/.test(item.name)) return [path]
    return []
  })
}

describe('hardcoded colours', () => {
  it('appear only in each skin’s tokens.ts', () => {
    const offenders: Record<string, string[]> = {}
    for (const file of sourceFiles(SRC)) {
      const name = relative(SRC, file)
      if (ALLOWED.has(name)) continue
      const found: string[] = []
      // Comments describe colours in prose; only code is scanned. A
      // `--color-*` custom property name is not a colour value either.
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      for (const line of code.split('\n')) {
        const stripped = line.replace(/--[a-z-]+/g, '')
        for (const [label, pattern] of COLOUR_PATTERNS) {
          if (pattern.test(stripped)) found.push(`${label}: ${line.trim()}`)
        }
      }
      if (found.length > 0) offenders[name.split(sep).join('/')] = found
    }
    expect(offenders).toEqual({})
  })
})

describe('every skin stylesheet', () => {
  const sheets = Object.values(SKINS).map(
    (entry) => [entry.id, readFileSync(join(SRC, 'skins', entry.id, 'skin.css'), 'utf8')] as const,
  )

  it.each(sheets)('scopes %s to its own [data-skin] attribute', (id, css) => {
    const selectors = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('}')
      .flatMap((block) => block.split('{')[0].split(','))
      .map((selector) => selector.trim())
      .filter((selector) => selector !== '' && !selector.startsWith('@'))
    for (const selector of selectors) {
      expect(`${id}: ${selector}`).toContain(`[data-skin='${id}']`)
    }
  })

  it.each(sheets)('%s gives interactive controls a 44px minimum', (_id, css) => {
    expect(css).toContain('44px')
  })

  /**
   * The focus ring lives in index.css and every skin inherits it. A skin may
   * add to it — the default skin also changes a border colour — but it may not
   * take it away: both places that did drew a 1px accent border instead, and on
   * a control filled with ink that border sat at 2.26:1, under the 3:1 WCAG
   * 1.4.11 asks of a focus indicator. There is no way to check "and replaced it
   * with something that passes" from a stylesheet, so the rule is simply that
   * a skin does not remove it.
   */
  it.each(sheets)('%s never cancels the shared focus ring', (id, css) => {
    const offenders = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('}')
      .filter((block) => block.includes(':focus') && /outline:\s*(none|0)\b/.test(block))
      .map((block) => `${id}: ${block.split('{')[0].trim()}`)
    expect(offenders).toEqual([])
  })
})

describe('index.html', () => {
  it('does not disable user zoom', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
    expect(html).not.toMatch(/user-scalable\s*=\s*no|maximum-scale/)
  })
})
