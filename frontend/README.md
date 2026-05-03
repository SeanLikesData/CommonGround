# Frontend — CommonGround Map UI

Vite + React 19 + TypeScript single-page demo. Renders the AO LIONHEART tactical picture on MapLibre.

## Dev

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm lint
pnpm build
```

## Env

Copy `.env.example` to `.env.local` and fill in:

- `VITE_MAPTILER_KEY` — MapTiler dev-tier API key for satellite + terrain tiles

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind v4 (via `@tailwindcss/vite`)
- Zustand (client state)
- MapLibre GL JS (basemap, layers)
