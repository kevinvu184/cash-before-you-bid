import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LANG, LANGS } from './logic/lang'
import { LOCALE_PATH, SITE_BASE } from './logic/site'

// Which document the worker answers a navigation with, run rather than read.
//
// src/installable.test.ts greps public/sw.js, which is enough to prove the
// locale list is there and has not drifted from site.ts. It is not enough to
// prove the routing is right: `new URL('./', url)` reads '/en' as a file and
// resolved it to the scope root, so a navigation to the English URL without
// its trailing slash was answered with the Vietnamese document — and the
// host's redirect could not correct it, because a worker answering the
// navigation is exactly why the request never reaches the host.
//
// So the worker is loaded into a sandbox with the globals it opens with and
// its routing is called directly. It is a script, not a module, which is what
// makes this possible: a top-level function declaration lands on the sandbox's
// global object and can be called from out here.

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ORIGIN = 'https://kevinvu184.github.io'
const SCOPE = `${ORIGIN}${SITE_BASE}`

interface WorkerGlobals {
  shellFor(url: URL): string
}

function loadWorker(): WorkerGlobals {
  const sandbox = {
    URL,
    self: {
      registration: { scope: SCOPE },
      location: { origin: ORIGIN },
      // The worker registers three listeners as it loads; none of them runs
      // here, so collecting them and doing nothing is the whole stub.
      addEventListener: () => {},
      skipWaiting: () => {},
      clients: { claim: () => {} },
    },
    caches: {},
    fetch: () => {
      throw new Error('the routing decision must not need the network')
    },
  }
  const context = createContext(sandbox)
  runInContext(readFileSync(join(ROOT, 'public', 'sw.js'), 'utf8'), context)
  return context as unknown as WorkerGlobals
}

describe('the shell a navigation is answered with', () => {
  const { shellFor } = loadWorker()
  const shellOf = (path: string) => shellFor(new URL(path, ORIGIN))

  it.each(LANGS)('serves %s its own document', (lang) => {
    expect(shellOf(`${SITE_BASE}${LOCALE_PATH[lang]}`)).toBe(`${SCOPE}${LOCALE_PATH[lang]}`)
  })

  it.each(LANGS.filter((lang) => lang !== DEFAULT_LANG))(
    'serves %s its own document without the trailing slash too',
    (lang) => {
      const withoutSlash = `${SITE_BASE}${LOCALE_PATH[lang]}`.replace(/\/$/, '')
      expect(shellOf(withoutSlash)).toBe(`${SCOPE}${LOCALE_PATH[lang]}`)
    },
  )

  it('ignores the query string, which is where all the app’s state lives', () => {
    expect(shellOf(`${SITE_BASE}en/?price=900000&lang=en`)).toBe(`${SCOPE}en/`)
    expect(shellOf(`${SITE_BASE}?price=900000`)).toBe(SCOPE)
  })

  it('falls back to the root document for a path that is not one', () => {
    // A deep link the app never produces, or a document removed by a later
    // build. The app is a single page, so the root shell is the right answer.
    expect(shellOf(`${SITE_BASE}fr/`)).toBe(SCOPE)
    expect(shellOf(`${SITE_BASE}en/deeper/`)).toBe(SCOPE)
  })

  it('never answers one locale’s URL with another locale’s document', () => {
    const byLang = new Map(LANGS.map((lang) => [lang, `${SCOPE}${LOCALE_PATH[lang]}`]))
    for (const lang of LANGS) {
      const served = shellOf(`${SITE_BASE}${LOCALE_PATH[lang]}`)
      for (const [other, shell] of byLang) {
        if (other !== lang) expect(served).not.toBe(shell)
      }
    }
  })
})
