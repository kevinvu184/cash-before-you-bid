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
 * Nothing cross-origin is touched: the web fonts fall back to the system stack
 * offline, which is what font-display: swap already does on a slow connection,
 * and the exchange rate falls back to its own bundled indicative figure. A
 * rate cached here would be worse than either — it has its own 12-hour
 * expiry in localStorage, which a cache-first rule would silently outlive.
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
