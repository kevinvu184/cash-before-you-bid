import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// CLAUDE.md has stated a page-weight budget since the repo started and nothing
// measured it, which made it prose rather than a budget. perf-budget.json is
// the machine-readable copy that scripts/check-bundle-size.mjs enforces on
// every pull request — so there are now two numbers, and this holds them
// together. Raising the ceiling means editing CLAUDE.md, which is the point:
// it should be a decision, not a quiet bump in a config file.

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const KIB = 1024

interface Budget {
  name: string
  select: string
  extension?: string
  maxGzipBytes: number
  why: string
}

const budgets = (
  JSON.parse(readFileSync(join(ROOT, 'perf-budget.json'), 'utf8')) as { budgets: Budget[] }
).budgets

describe('the enforced budget', () => {
  it('states the JavaScript ceiling CLAUDE.md does', () => {
    const claude = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')
    const stated = /total JS < (\d+)KB gzipped/.exec(claude.replace(/\s+/g, ' '))
    expect(stated).not.toBeNull()
    const js = budgets.find((budget) => budget.name === 'JavaScript')
    expect(js?.maxGzipBytes).toBe(Number(stated?.[1]) * KIB)
  })

  it('says why each ceiling is the number it is', () => {
    expect(budgets.length).toBeGreaterThan(0)
    for (const budget of budgets) {
      expect(budget.why.length).toBeGreaterThan(40)
      expect(budget.maxGzipBytes).toBeGreaterThan(0)
    }
  })
})
