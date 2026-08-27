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

## Design

The interface follows the **Ledger** design system: warm ink on warm cream,
structure drawn with 1px hairline rules, Libre Franklin for reading and Source
Code Pro for metadata, and a single rust accent reserved for links and focus.
`src/styles/ledger.css` is vendored from the design system — take colours,
fonts, spacing and radii from its `var(--*)` tokens rather than hard-coding
values.

Light and dark both follow the operating system by default; setting
`data-theme="light"` or `data-theme="dark"` on `:root` overrides it.
