import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import vi from '../locales/vi.json'
import { NETWORK_CALLERS, PRIVACY_STATEMENT, THIRD_PARTY_HOSTS } from './privacy'

// The half of #24 that can go wrong: wording drifts from reality silently, and
// a claim that has quietly become false is worse than no claim at all. So this
// file checks code rather than the sentence.
//
// What it checks, exactly: the sources the build is made from — `index.html`,
// `src/`, `public/` — not `dist/`. Two tripwires, both pointed at privacy.ts,
// which is where the wording lives. A host `index.html` references must be
// declared there, and a file that opens a connection must be declared there.
// Neither can be satisfied without reading the copy next to the declaration,
// which is the whole mechanism: someone adding a request has to walk past the
// sentence it would falsify.
//
// What it does not check, and what covers that instead. Nothing here inspects
// build output or `node_modules`, so it would not catch a request introduced
// by a dependency or injected by a build plugin. Only loading the built page
// catches those, which is a manual audit — recorded in the pull request that
// added this file, and the thing to repeat before believing the claim again
// after a dependency or build-config change. Treat these tests as the guard
// on everyday edits, not as proof about the deployed bundle.

const SRC = dirname(dirname(fileURLToPath(import.meta.url)))
const ROOT = dirname(SRC)

const lookup = (strings: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((value, part) => {
    if (typeof value !== 'object' || value === null) return undefined
    return (value as Record<string, unknown>)[part]
  }, strings)

const statementKeys = (): string[] => [
  PRIVACY_STATEMENT.labelKey,
  ...PRIVACY_STATEMENT.value.flatMap((point) => [point.termKey, point.bodyKey]),
]

// The build's inputs: source and static asset alike. `dist/` is skipped even
// though it is precisely what a visitor loads — it is generated, absent in a
// fresh checkout, and stale whenever it is present, so asserting against it
// would pass or fail on whether someone had run a build rather than on what
// the repository says. The manual audit covers the output; this covers the
// inputs. node_modules is out of scope for the same reason it is out of the
// claim's reach: see the header.
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage'])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (/\.(ts|tsx|js|mjs|css|html|webmanifest)$/.test(entry.name)) return [path]
    return []
  })
}

const repoPath = (file: string): string => relative(ROOT, file).split(sep).join('/')

/** Test files name the things they forbid, and none of them is bundled. */
const notATest = (name: string): boolean => !/\.test\.(ts|tsx)$/.test(name)

// Comments describe requests in prose — this file and sw.js both do — so only
// code is scanned.
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const NETWORK_APIS = /\b(fetch\s*\(|XMLHttpRequest|sendBeacon|EventSource|WebSocket)\b/

describe('the privacy statement', () => {
  it('says something in both locales, from keys and never sentences', () => {
    for (const key of statementKeys()) {
      expect(key).toMatch(/^privacy\.[A-Za-z]+$/)
      for (const [name, strings] of [
        ['en', en],
        ['vi', vi],
      ] as const) {
        const value = lookup(strings as unknown as Record<string, unknown>, key)
        expect(typeof value === 'string' && value.length > 0, `${name}: ${key}`).toBe(true)
      }
    }
  })

  it('carries the field id both skins declare, as points rather than a blob', () => {
    expect(PRIVACY_STATEMENT.id).toBe('inputsPrivacy')
    // Primary: it is the reason someone types a savings balance in at all.
    expect(PRIVACY_STATEMENT.importance).toBe('primary')
    expect(PRIVACY_STATEMENT.value.length).toBeGreaterThan(0)
    for (const point of PRIVACY_STATEMENT.value) {
      expect(point.termKey).not.toBe(point.bodyKey)
    }
  })

  it('covers each thing the audit found, in both locales', () => {
    // The four are the whole audit: where the sums run, where the figures end
    // up (the URL, then this device), and what the page fetches from a third
    // party. Dropping one would leave a claim with a hole in it.
    const terms = PRIVACY_STATEMENT.value.map((point) => point.termKey)
    expect(terms).toEqual([
      'privacy.localTerm',
      'privacy.linkTerm',
      'privacy.storageTerm',
      'privacy.thirdPartyTerm',
    ])
  })

  it('claims only what the audit supports — figures, not everything', () => {
    // "Nothing leaves your browser" would be false while index.html loads a
    // font from Google; "your figures never leave your browser" is not. The
    // claim must therefore be about what the user typed, and must not promise
    // that the page itself is silent.
    for (const [name, strings] of [
      ['en', en],
      ['vi', vi],
    ] as const) {
      const claim = lookup(strings as unknown as Record<string, unknown>, 'privacy.claim')
      expect(typeof claim, name).toBe('string')
      expect(String(claim).length, name).toBeLessThan(90)
    }
    expect(String(lookup(en as unknown as Record<string, unknown>, 'privacy.claim'))).toMatch(
      /figures.*never leave/i,
    )
  })

  it('names no analytics, because there are none to name', () => {
    // Requirement 5 of the ticket, as a fact about the sources rather than a
    // sentence: nothing we wrote reports a page view, an event or an input
    // value. A vendor pulled in transitively would not show up here — see the
    // header on what this does and does not reach.
    const analytics =
      /gtag|googletagmanager|google-analytics|plausible|posthog|mixpanel|segment\.(io|com)|hotjar|sentry|amplitude|matomo|clarity\.ms/i
    const offenders = sourceFiles(ROOT)
      .map(repoPath)
      .filter(notATest)
      .filter((name) => analytics.test(stripComments(readFileSync(join(ROOT, name), 'utf8'))))
    expect(offenders).toEqual([])
  })
})

describe('what the sources say the page will contact', () => {
  it('references no host in index.html that privacy.ts has not declared', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
    const hosts = [...html.matchAll(/https?:\/\/([^/"'\s>]+)/g)].map((match) => match[1])
    const undeclared = [...new Set(hosts)].filter(
      (host) => !Object.hasOwn(THIRD_PARTY_HOSTS, host),
    )
    // Adding a host here means editing privacy.ts, where privacy.thirdPartyBody
    // sits — which is the point. Declare it, then make the wording true again.
    expect(undeclared).toEqual([])
  })

  it('opens a connection from no file privacy.ts has not declared', () => {
    const offenders = sourceFiles(ROOT)
      .map((file) => [repoPath(file), readFileSync(file, 'utf8')] as const)
      .filter(([name]) => notATest(name) && !Object.hasOwn(NETWORK_CALLERS, name))
      .filter(([, source]) => NETWORK_APIS.test(stripComments(source)))
      .map(([name]) => name)
    expect(offenders).toEqual([])
  })

  it('declares a reason for every host and every caller', () => {
    for (const [host, why] of Object.entries(THIRD_PARTY_HOSTS)) {
      expect(host, why).toMatch(/^[a-z0-9.-]+$/)
      expect(why.length, host).toBeGreaterThan(10)
    }
    for (const [file, why] of Object.entries(NETWORK_CALLERS)) {
      expect(why.length, file).toBeGreaterThan(10)
    }
  })
})
