// Registers the offline shell worker (public/sw.js).
//
// Production only: in development the worker would serve a cached shell over
// Vite's module graph and hot reloading would stop matching the source. The
// path is built from BASE_URL so it lands under the GitHub Pages base, which
// is also the worker's scope — a worker cannot control pages above its own
// directory.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  // After load, so registering never competes with the first paint.
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Unsupported, blocked by the browser, or served from a context that
      // forbids workers. Offline is the only thing lost.
    })
  })
}
