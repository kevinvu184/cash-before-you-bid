# Cash Before You Bid — project guidelines

A Vite + React 19 + TypeScript SPA. Calculator logic lives in `src/logic/` (pure,
unit-tested), state in `src/hooks/useCalculator.ts`, UI in `src/App.tsx`.

Scripts: `npm run dev`, `npm run build` (tsc + vite), `npm run lint` (oxlint),
`npm test` (vitest).

## Mobile-first (primary audience)

Phones are the main audience. Desktop is secondary. Design and build for a
360px-wide screen first, then widen.

### Layout

- Write base CSS for mobile. Add `min-width` media queries to adapt upward.
  Never use `max-width` queries to "fix" mobile after the fact.
- Breakpoints: 360px base, 640px, 1024px. Do not add more unless the design
  needs it.
- Use flexbox/grid, `min()`, `clamp()`, and relative units. No fixed pixel
  widths on containers.
- No horizontal scroll at 360px. Every image, table, and code block must be
  constrained (`max-width: 100%`, `overflow-x: auto` on tables).
- Use `100dvh` not `100vh` for full-height sections (mobile browser address
  bar).
- Respect safe areas: `padding: env(safe-area-inset-*)` on fixed
  headers/footers.

### Touch

- Every interactive element: minimum 44×44px hit area. Pad small icons/links
  to reach it.
- No hover-only interactions. Anything revealed on hover must also work on
  tap/focus.
- Wrap hover styles in `@media (hover: hover)` so they don't stick on touch.
- Add `touch-action: manipulation` to buttons/links to remove the 300ms tap
  delay.
- Bottom-anchor primary actions where sensible (thumb reach).

### Forms

- Correct `type` and `inputmode` on every input (`email`, `tel`, `numeric`,
  `decimal`) so the right keyboard opens.
- Add `autocomplete` attributes.
- Font size on inputs ≥ 16px to stop iOS auto-zoom.
- Labels visible, not placeholder-only.

### Performance

- Target: Lighthouse mobile Performance ≥ 90, LCP < 2.5s on throttled 4G,
  total JS < 150KB gzipped.
- Lazy-load below-the-fold components with `React.lazy` + `Suspense`.
  Route-split if routing is used.
- Images: `loading="lazy"`, explicit `width`/`height` to avoid layout shift,
  `srcset`/`sizes` for responsive sources, modern formats (WebP/AVIF) with
  fallback.
- Fonts: `font-display: swap`, preload the primary font, subset if possible.
  Prefer system font stack if the original uses a generic one.
- Avoid heavy dependencies. Justify anything over 10KB gzipped.
- No layout thrash: avoid reading layout in render or effects.
- Memoise expensive pure-function results with `useMemo` only where a
  measured cost exists; do not sprinkle it everywhere.

### Motion and network

- Respect `prefers-reduced-motion`: disable or reduce animations.
- Show explicit loading and error states for every fetch. Assume slow, flaky
  connections.
- If the original stores anything locally, use `localStorage` inside a hook
  with a try/catch (private mode can throw).

### Viewport and meta

- `index.html` must include
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- Add `theme-color` meta.
- Do not disable user zoom.

### Testing on mobile

- Verify at 360×640, 390×844, and 768×1024 in Chrome DevTools device mode.
  Report any overflow or tap-target issues found.
- Run Lighthouse in mobile mode and report the four scores.
