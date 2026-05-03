# Frontend — Vite + React + TypeScript

This is a Vite + React 19 app, not Next.js. Single-page demo for the CommonGround map UI.

- Dev server: `npm run dev` (binds 0.0.0.0:3000 for Docker compatibility)
- Build: `npm run build`
- Lint: `npm run lint`
- Styling: Tailwind v4 via `@tailwindcss/vite` (no separate PostCSS config)
- State: Zustand
- Map: MapLibre GL JS

Env vars are exposed to the client only when prefixed `VITE_` (e.g. `VITE_MAPTILER_KEY`). Put local secrets in `.env.local`.
