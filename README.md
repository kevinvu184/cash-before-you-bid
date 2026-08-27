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
│   ├── App.tsx         # Root application component
│   ├── App.css         # Component styles
│   └── index.css       # Global styles
├── vite.config.ts      # Vite configuration
└── tsconfig*.json      # TypeScript configuration
```
