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

```
├── index.html          # SPA entry point
├── public/             # Static assets served as-is
├── src/
│   ├── main.tsx        # React root mount
│   ├── App.tsx         # Page shell: masthead, inputs column, results column
│   ├── components/     # Presentational pieces (fields, flags, stats, table)
│   ├── hooks/          # useCalculator plus small UI hooks
│   ├── logic/          # Pure calculation modules, unit-tested
│   ├── data/           # Rates, caps and default inputs
│   ├── types/          # Shared calculator types
│   ├── styles/
│   │   └── ledger.css  # Vendored Ledger design-system tokens and classes
│   ├── App.css         # Page layout, built on the Ledger tokens
│   └── index.css       # Global base and the automatic dark-mode mapping
├── vite.config.ts      # Vite configuration
└── tsconfig*.json      # TypeScript configuration
```

## URL parameters

Every input lives in the query string, so a link reproduces a scenario exactly.
A parameter equal to its default is omitted, keys are emitted alphabetically,
booleans are `1`/`0`, and numbers outside the allowed range are clamped on
read. The codec is `src/logic/urlState.ts`.

| Param     | Type              | Allowed values                        | Default  |
| --------- | ----------------- | ------------------------------------- | -------- |
| `price`   | number            | 0 – 100,000,000                       | 750000   |
| `route`   | enum              | `scheme`, `lmi`, `nolmi`, `htb`       | `scheme` |
| `dep`     | number (%)        | 0 – 100, raised to the route minimum  | route    |
| `region`  | enum              | `metro`, `regional`                   | `metro`  |
| `fhb`     | boolean           | `1`, `0`                              | `1`      |
| `ppr`     | boolean           | `1`, `0`                              | `1`      |
| `newhome` | boolean           | `1`, `0`                              | `0`      |
| `otp`     | number            | 0 – 100,000,000                       | 0        |
| `foreign` | boolean           | `1`, `0`                              | `0`      |
| `rate`    | number (% p.a.)   | 0 – 25                                | 6.2      |
| `conv`    | number            | 0 – 1,000,000                         | 1600     |
| `bp`      | number            | 0 – 1,000,000                         | 550      |
| `bids`    | number            | 1 – 50                                | 1        |
| `lender`  | number            | 0 – 1,000,000                         | 300      |
| `adj`     | number            | 0 – 1,000,000                         | 800      |
| `ins`     | number            | 0 – 1,000,000                         | 1500     |
| `move`    | number            | 0 – 1,000,000                         | 4000     |
| `bufm`    | number (months)   | 0 – 24                                | 3        |
| `caplmi`  | boolean           | `1`, `0`                              | `0`      |
| `lang`    | enum              | `en`, `vi`                            | `vi`     |

`dep` defaults to the deposit route's own minimum (5% scheme, 2% Help to Buy,
20% no-LMI, 5% LMI), matching what selecting that route resets the field to.

`bids` is the number of properties bid on before winning one. It multiplies the
pre-auction costs (`conv`, `bp`) and nothing else — see
`src/logic/sunkCost.ts`.
