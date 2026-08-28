/* Offline for an inspection with no signal.
 *
 * The app is a static SPA: it calculates in the browser, sends nothing, and
 * fetches nothing at runtime. So the whole job here is to keep the shell and
 * its build assets, and the whole risk is stranding someone on a stale bundle
 * after a redeploy. The two rules that follow from that:
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
 * One caveat that comes with them, and with everything else in public/ — the
 * icons, the manifest, the favicon. Those URLs are not fingerprinted, so the
 * "a given URL's bytes never change" reasoning above is a promise the build
 * cannot keep for them; it is kept by hand. Replacing any of those files means
 * bumping VERSION below in the same commit, or a returning visitor keeps the
 * old bytes until something else evicts the cache. src/fonts.css says so where
 * it explains how to regenerate the font files.
 *
 * Scope comes from the registration rather than a hardcoded path, so the
 * GitHub Pages base ('/cash-before-you-bid/') needs no mention here.
 */

const VERSION = 'v1'
const CACHE = `cbyb-${VERSION}`
const SCOPE = self.registration.scope
const SHELL = new URL('./', SCOPE).toString()

// Enough to launch from the home screen with no network on the first run.
const PRECACHE = ['./', './manifest.webmanifest', './favicon.svg', './icons/icon-192.png']

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
    const cached = await caches.match(SHELL)
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

  // A navigation is the document, whatever the query string says; the app's
  // whole state is in the query string, so every one of them is the shell.
  event.respondWith(request.mode === 'navigate' ? networkFirst(SHELL) : cacheFirst(request))
})
