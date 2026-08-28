# Cash Before You Bid

A React single-page application, built with [Vite](https://vite.dev/), [React 19](https://react.dev/), and TypeScript.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173 with hot module replacement.

## Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the development server                     |
| `npm run build`   | Type-check and build for production into `dist/` |
| `npm run preview` | Preview the production build locally             |
| `npm run lint`    | Lint the codebase with oxlint                    |

## Project structure

The app is a headless core with swappable presentation skins. Three layers,
and the boundaries between them are enforced by tests:

```
├── index.html          # SPA entry point; paints the ground colours pre-mount
├── public/             # Static assets served as-is
│   ├── manifest.webmanifest  # Install metadata; every path relative to the base
│   ├── sw.js           # Offline shell worker; scope comes from the registration
│   └── icons/          # Install icons, 192/512/maskable/apple-touch
├── src/
│   ├── main.tsx        # React root mount
│   ├── App.tsx         # Shell: owns every hook, hands a skin the view model
│   ├── hooks/          # Core state: URL sync, drafts, colour mode, view model
│   ├── logic/          # Pure modules — calculation, formatting, URL codec
│   ├── data/           # Rates, caps and default inputs
│   ├── types/
│   │   ├── calculator.ts  # Calculation inputs and results
│   │   ├── viewModel.ts   # The core <-> skin contract: FieldId, Field<T>
│   │   └── skin.ts        # ThemeTokens, SkinModule, the field manifest
│   ├── skins/
│   │   ├── registry.ts    # SKINS: tokens eager, components lazy
│   │   ├── shared/        # Presentation helpers both skins use
│   │   ├── default/       # The Ledger look — tokens, components, skin.css
│   │   └── plain/         # The black-and-white baseline
│   ├── testing/        # The fixed view-model fixture the parity test renders
│   └── index.css       # The one skin-agnostic stylesheet
├── vite.config.ts      # Vite configuration
└── tsconfig*.json      # TypeScript configuration
```

**Core** (`src/logic/`, `src/hooks/`) does the calculating, validation, state,
URL sync and formatting rules. No JSX, no DOM, no styling, no display strings.

**Contract** (`src/types/viewModel.ts`) names every field the user can see.
Each field carries data, a translation key and a semantic role — never a
formatted string. `FieldId` is a string union; adding a member is a compile
error until the id list and every skin's manifest cover it.

**Skins** (`src/skins/<id>/`) are React components that consume the view model.
A skin picks layout, element, order, grouping and colour. It may not calculate,
fetch, touch the URL, mutate state, or invent or omit a field.

## URL parameters

Everything the user can change lives in the query string, so a link reproduces
the exact view. Params equal to their default are omitted and keys are sorted,
so the same state always produces the same URL.

| Param  | Values             | Default    | Meaning                                 |
| ------ | ------------------ | ---------- | --------------------------------------- |
| `skin` | `default`, `plain` | `default`  | Which skin renders the screen           |
| `mode` | `light`, `dark`    | _(absent)_ | Colour mode; absent follows the OS      |
| `lang` | `en`, `vi`         | `vi`       | UI language                             |
| `cur`  | `AUD`, `VND`       | `AUD`      | Currency the figures are **written** in |
| `fx`   | number             | _(absent)_ | A typed rate, used only while `cur=VND`  |

`cur` and `fx` change how the results are written, never what was worked out —
see [Display currency](#display-currency) below. An unknown `cur` falls back to
`AUD`; an `fx` outside the sane band (or unparseable) is treated as absent
rather than clamped, because clamping would price the figures at a rate the
reader never typed.

`fx` only does anything while `cur=VND`, because the base currency is never
converted. It survives a switch back to `AUD` rather than being dropped —
someone checking the dollar figure mid-plan should not have to retype the rate
their bank quoted them — so a link like `?fx=20000` on its own is valid, shows
dollars, and applies the rate the moment ₫ is chosen.

The calculator's own params are read and written by `src/logic/urlState.ts`.
Booleans are `1`/`0`, and a number outside its allowed range is clamped on read.

| Param     | Type            | Allowed values                       | Default  |
| --------- | --------------- | ------------------------------------ | -------- |
| `price`   | number          | 0 – 100,000,000                      | 750000   |
| `route`   | enum            | `scheme`, `lmi`, `nolmi`, `htb`      | `scheme` |
| `dep`     | number (%)      | 0 – 100, raised to the route minimum | route    |
| `region`  | enum            | `metro`, `regional`                  | `metro`  |
| `fhb`     | boolean         | `1`, `0`                             | `1`      |
| `ppr`     | boolean         | `1`, `0`                             | `1`      |
| `newhome` | boolean         | `1`, `0`                             | `0`      |
| `otp`     | number          | 0 – 100,000,000                      | 0        |
| `foreign` | boolean         | `1`, `0`                             | `0`      |
| `rate`    | number (% p.a.) | 0 – 25                               | 6.2      |
| `save`    | number          | 0 – 100,000,000                      | 0        |
| `loan`    | number          | 0 – 100,000,000                      | _absent_ |
| `conv`    | number          | 0 – 1,000,000                        | 1600     |
| `bp`      | number          | 0 – 1,000,000                        | 550      |
| `bids`    | number          | 1 – 50                               | 1        |
| `lender`  | number          | 0 – 1,000,000                        | 300      |
| `adj`     | number          | 0 – 1,000,000                        | 800      |
| `ins`     | number          | 0 – 1,000,000                        | 1500     |
| `move`    | number          | 0 – 1,000,000                        | 4000     |
| `bufm`    | number (months) | 0 – 24                               | 3        |
| `caplmi`  | boolean         | `1`, `0`                             | `0`      |

`dep` defaults to the deposit route's own minimum (5% scheme, 2% Help to Buy,
20% no-LMI, 5% LMI), matching what selecting that route resets the field to.

`bids` is the number of properties bid on before winning one. It multiplies the
pre-auction costs (`conv`, `bp`) and nothing else — see `src/logic/sunkCost.ts`.

`loan` is the one param whose absence is not the same as `0`. Absent — or blank,
or unparseable — means "not yet pre-approved", and the finance check is not run
at all; `loan=0` is a figure the user entered, and the check runs and fails on
it. See `src/logic/verdict.ts`.

**A shared link carries whatever was typed into `save` and `loan`.** No figure
is ever sent anywhere — the query string is the whole persistence layer, and the
one request the app makes carries none of it (see
[the one outbound request](#the-one-outbound-request)) — but a link pasted into
a chat carries the sender's savings balance with it.

An unknown `?skin=` falls back to `plain` — the baseline that always renders —
and the URL is rewritten with `replace`. An unknown `?mode=` falls back to
following `prefers-color-scheme`, and the param is dropped.

## Display currency

The results can be read in Australian dollars or Vietnamese đồng. It is a
**display conversion only**: every amount is entered, stored and calculated in
AUD at full precision, and the currency changes nothing but how the figures are
written. Switching to đồng and back reproduces the dollar figures byte for
byte, because the conversion is skipped entirely for the base currency.

`src/logic/exchangeRate.ts` holds the rate rules and `src/hooks/useExchangeRate.ts`
fetches them. `src/logic/display.ts` is the formatter's view of "what currency,
at what rate", and `src/skins/shared/text.ts` is where a key and its numbers
become a sentence — including the statutory thresholds those sentences quote,
which come from `src/data/constants.ts` rather than from the locale files. That
is not tidiness: a threshold left as a literal `$600,000` beside a converted
amount renders an equation subtracting dollars from đồng.
`src/skins/currency.test.tsx` fails on any dollar marker left in the money
surface of a converted page.

Statutory constants read exactly in dollars, and become rounded estimates once
a rate has been through them — a `$600,000` cap put through an exchange rate is
no longer exact, and printing it to the đồng would claim a precision the rate
does not have. Zero is the exception, being the one figure no rate can move.

### The one outbound request

**The rate is fetched from a third party.** `https://open.er-api.com` is
keyless and CORS-open, and it stamps the quote itself rather than the request.
Nothing about the reader or their figures is sent — it is a plain `GET` of a
public rate table — but it is still a request to a host other than the one
serving the page, and it is the only one this app makes:

- **Nothing is fetched in the default view.** Dollars need no conversion, so
  the request happens on the first switch to đồng and not before.
- The rate is cached in `localStorage` for 12 hours, inside try/catch, so a
  returning reader stays off the network and a browser that refuses storage
  still works.
- A bundled indicative rate (`FALLBACK_RATES`, sampled 28 Aug 2026) covers a
  failed or absent network, so figures are never missing. A cached quote that
  has aged past 12 hours and whose refresh then fails is **kept** rather than
  discarded — a real quote a few hours old beats a constant compiled into the
  bundle — but the rate line stops calling it current.
- The rate line names which of the four states is in force, and the note under
  it names the provider, so the request is disclosed where it happens.

## Saved scenarios

Auction buyers look at properties for months, and the query string only holds
one of them. A saved scenario is a name and **the query string itself**, kept in
`localStorage` under `cbyb.scenarios.v1`:

```json
{ "version": 1, "scenarios": [{ "id": "…", "name": "12 Rose St", "query": "price=820000&route=lmi", "savedAt": 1787000000000 }] }
```

Saving is "remember this URL under a name"; loading is "apply this query
string". `src/logic/urlState.ts` therefore stays the single serialisation
format — a new calculator input added to the codec is saved and restored with
no change here — and reading leans on the codec's existing clamping and
fallbacks, so a scenario written by an older version of the app loads as far as
it still parses and takes today's defaults for the rest.

Loading keeps the language, skin and colour mode currently on screen: those are
how the reader likes to be shown a property, not part of the property.

`src/logic/scenarioStore.ts` is the pure half (shape, validation, limits) and
`src/hooks/useSavedScenarios.ts` the storage half. Every read and write is
wrapped: a browser that refuses storage makes the panel say so and leaves the
rest of the page working. **Nothing is uploaded.** These are somebody's savings
figures; they stay in the browser that typed them.

## Installable and offline

The app is a static SPA, so it works with no signal at an inspection once it has
been opened online. Its one network call — the exchange rate — is not a
dependency: the figures are all in AUD until someone asks for đồng, and a
failed fetch falls back to a bundled indicative rate rather than to nothing.

- `public/manifest.webmanifest` — states every path relatively, because Vite
  does not rewrite URLs inside a manifest and the app is served from
  `/cash-before-you-bid/`. `src/installable.test.ts` holds it to that.
- `public/sw.js` — caches the shell. Navigations are network-first, so a
  redeploy is picked up on the next online visit rather than stranding anyone
  on a stale bundle; fingerprinted build assets are cache-first, because a
  given URL's bytes never change. Nothing cross-origin is cached, so the web
  fonts fall back to the system stack offline.
- It registers in production only (`src/serviceWorker.ts`); in development it
  would serve a cached shell over Vite's module graph.

## Adding a skin

Three files, one line in the registry, and one line in each locale. No test
file needs editing: the suites iterate `Object.values(SKINS)`.

1. Add the id to `SkinId` and `SKIN_IDS` in `src/logic/skins.ts`.
2. Create `src/skins/<id>/tokens.ts` exporting `light` and `dark` `ThemeTokens`
   and `tokens: Record<ColorMode, ThemeTokens>`. Every token is required; use
   zero-equivalents (`'0'`, `'none'`, `'0s'`) rather than leaving one out. This
   is the only file in the skin allowed to contain a literal colour.
3. Create `src/skins/<id>/meta.ts` exporting `meta: SkinMeta` — id, `nameKey`,
   `tokens`, and a `renders` manifest listing every `FieldId`.
4. Create `src/skins/<id>/skin.css`, with every selector scoped to
   `[data-skin='<id>']`, reading only `var(--token)`.
5. Create `src/skins/<id>/Root.tsx` and `src/skins/<id>/index.ts`, the latter
   default-exporting `{ ...meta, components: { Root } }`. Every rendered field
   element needs `data-field="<FieldId>"` and
   `data-importance="primary|secondary"`.
6. Register it in `src/skins/registry.ts` and add `skins.<id>` to
   `src/locales/en.json` and `src/locales/vi.json`.
7. Add the skin's ground colours (`colorBg`, `colorText`, both modes) to the
   `GROUND` table in `index.html`, so there is no flash before React mounts.

`npm test` then holds the new skin to information parity with every other skin,
WCAG AA contrast in both modes, a 1.4 minimum line height, token-only styling,
and a `[data-skin]`-scoped stylesheet.
