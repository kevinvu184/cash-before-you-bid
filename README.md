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

## Shareable URLs

Everything the user can change is stored in the URL query string — copy the
address bar (or use the **Copy link** button) and the link reproduces the
exact same view. The query string is the single source of truth and the only
persistence layer: parsing and serialising live in `src/logic/urlState.ts`,
and `useUrlState` (`src/hooks/useUrlState.ts`) binds them to React Router's
`useSearchParams`.

Params equal to their default are omitted, keys are written alphabetically,
booleans are `1`/`0`, and every value is validated on read (numbers clamped
to their range, enums whitelisted, anything invalid falling back to the
default). Unknown keys are ignored. A fully non-default state is ~150
characters, far below the 2000-character URL limit.

| Param     | Field                    | Type    | Allowed values                  | Default  |
| --------- | ------------------------ | ------- | ------------------------------- | -------- |
| `adj`     | Settlement adjustments   | number  | 0 – 1,000,000                   | `800`    |
| `bp`      | Building and pest        | number  | 0 – 1,000,000                   | `550`    |
| `bufm`    | Buffer months            | number  | 0 – 24                          | `3`      |
| `caplmi`  | Capitalise LMI           | boolean | `1` / `0`                       | `0`      |
| `conv`    | Conveyancing             | number  | 0 – 1,000,000                   | `1600`   |
| `dep`     | Deposit %                | number  | 0 – 100 (min 5 scheme, 2 htb)   | `5`      |
| `fhb`     | First home buyer         | boolean | `1` / `0`                       | `1`      |
| `foreign` | Foreign purchaser        | boolean | `1` / `0`                       | `0`      |
| `ins`     | Building insurance       | number  | 0 – 1,000,000                   | `1500`   |
| `lender`  | Lender fees              | number  | 0 – 1,000,000                   | `300`    |
| `move`    | Moving and set-up        | number  | 0 – 1,000,000                   | `4000`   |
| `newhome` | New home                 | boolean | `1` / `0`                       | `0`      |
| `otp`     | Off-the-plan construction| number  | 0 – 100,000,000                 | `0`      |
| `ppr`     | Owner-occupier           | boolean | `1` / `0`                       | `1`      |
| `price`   | Purchase price           | number  | 0 – 100,000,000                 | `750000` |
| `rate`    | Interest rate % p.a.     | number  | 0 – 25                          | `6.2`    |
| `region`  | Region                   | enum    | `metro`, `regional`             | `metro`  |
| `route`   | Deposit route            | enum    | `scheme`, `lmi`, `nolmi`, `htb` | `scheme` |

Continuous inputs (typed numbers) update the URL with `replace` debounced at
300 ms; discrete choices (selects, checkboxes) `push`, so the back button
steps through them.

## Project structure

```
├── index.html          # SPA entry point
├── public/             # Static assets served as-is
├── src/
│   ├── main.tsx        # React root mount
│   ├── App.tsx         # Root application component
│   ├── App.css         # Component styles
│   └── index.css       # Global styles
├── vite.config.ts      # Vite configuration
└── tsconfig*.json      # TypeScript configuration
```
