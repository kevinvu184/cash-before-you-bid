/* Offline for an inspection with no signal.
 *
 * The app is a static SPA: it calculates in the browser and sends nothing. Its
 * one runtime request — the exchange rate, on the first switch to đồng — is
 * cross-origin and handled below by being left alone. So the whole job here is
 * to keep the shell and its build assets, and the whole risk is stranding
 * someone on a stale bundle after a redeploy. The two rules that follow:
 *
 *   - The document is network-first. A redeploy changes index.html — it points
 *     at newly hashed assets — so an online visit always takes the fresh one
 *     and the cached copy is only ever the offline fallback.
 *   - Everything else same-origin is cache-first. Vite fingerprints build
 *     assets, so a given URL's bytes never change; a cache hit cannot be stale.
 *     Assets from an older build linger until the version below changes, which
 *     is what keeps the last-visited version launchable offline.
 *
 * Nothing cross-origin is touched, and since the web fonts moved onto this
 * origin (src/fonts.css, public/fonts) that no longer costs anything: the
 * cache-first rule picks them up on the first visit and the typography
 * survives offline.
 *
 * The one thing still off-origin is the exchange rate, and leaving it alone is
 * deliberate rather than incidental. Caching it here would be worse than not:
 * it carries its own 12-hour expiry in localStorage, which a cache-first rule
 * would silently outlive, and a failed fetch already falls back to a bundled
 * indicative figure.
 *
 * One caveat that comes with the fonts, and with everything else in public/ —
 * the icons, the manifest, the favicon. Those URLs are not fingerprinted, so
 * the "a given URL's bytes never change" reasoning above is a promise the
 * build cannot keep for them; it is kept by hand. Replacing any of those files
 * means bumping VERSION below in the same commit, or a returning visitor keeps
 * the old bytes until something else evicts the cache. src/fonts.css says so
 * where it explains how to regenerate the font files.
 *
 * Scope comes from the registration rather than a hardcoded path, so the
 * GitHub Pages base ('/cash-before-you-bid/') needs no mention here.
 */

const VERSION = 'v2'
const CACHE = `cbyb-${VERSION}`
const SCOPE = self.registration.scope
const SHELL = new URL('./', SCOPE).toString()

/*
 * The other locales' documents.
 *
 * The build prerenders one document per locale and a static host can only pick
 * a document by path, so the default locale is served from the scope root and
 * each other locale from a directory of its own (src/logic/site.ts states
 * which; src/installable.test.ts holds this list to it). Answering every
 * navigation with the root shell — which is what this worker did while there
 * was only one document — would serve the Vietnamese HTML to a reader who
 * asked for the English URL, and keep doing it offline. That is the one way a
 * prerender and a service worker quietly undo each other, so the navigation
 * handler picks the shell the request actually asked for.
 */
const LOCALE_SHELLS = ['./en/'].map((path) => new URL(path, SCOPE).toString())
const SHELLS = [SHELL, ...LOCALE_SHELLS]

/** The document a navigation should be answered with: its own, or the root. */
function shellFor(url) {
  // Matched on the path, with and without the trailing slash. Resolving the
  // request's directory instead would read '/en' as a file inside the scope
  // root and hand it the default locale's document — and the host's redirect
  // to '/en/' would never correct it, because a worker that responds to the
  // navigation is why the request never reaches the host at all. A navigation
  // carries the app's whole state in its query string, so the path is the only
  // part of the URL that selects a document.
  const path = url.pathname
  for (const shell of SHELLS) {
    const shellPath = new URL(shell).pathname
    if (path === shellPath || `${path}/` === shellPath) return shell
  }
  return SHELL
}

// Enough to launch from the home screen with no network on the first run, in
// either locale.
const PRECACHE = [...SHELLS, './manifest.webmanifest', './favicon.svg', './icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((path) => new URL(path, SCOPE).toString())))
      // A precache miss must not block activation: the runtime handler will
      // pick these up on the first visit instead.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function cachePut(request, response) {
  // Only complete, same-origin, successful responses are worth keeping.
  if (!response.ok || response.type !== 'basic') return
  const cache = await caches.open(CACHE)
  await cache.put(request, response.clone())
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    await cachePut(request, response)
    return response
  } catch (error) {
    // Offline: the cached copy of the same document, never another locale's.
    const cached = await caches.match(request)
    if (cached) return cached
    throw error
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  await cachePut(request, response)
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(new URL(SCOPE).pathname)) return

  // A navigation is a document, whatever the query string says; which document
  // is the locale directory's call.
  event.respondWith(request.mode === 'navigate' ? networkFirst(shellFor(url)) : cacheFirst(request))
})
