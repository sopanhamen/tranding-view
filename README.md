# tranding-view

A working Nuxt clone of Aurum with all seven screens and the existing FastAPI workflows.

## Run

Node 22.21+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the local URL, then Connection → Connect backend. Enter your FastAPI URL and MT5 account (type, login, trading password, server). The API needs no key: `POST /api/v1/mt5/connections` logs the worker into that account and returns the `connection_id` sent with every other request. The password is not kept in the page. Starts in simulated demo mode.

Targets the Gold Market & MT5 API v0.2.0 (`/openapi.json`). Its CORS allows `http://localhost:3000` by default, so run the dev server on port 3000 or add your origin on the server. Copy `.env.example` to `.env` to prefill the API URL (`NUXT_PUBLIC_API_BASE`). If the worker is offline or still logging in (202), the app opens in history-only mode and polls `GET /api/v1/mt5/connections` until the connection is `active`; a failed login (`terminal.error`) is shown in the connection banner.

```sh
npm run typecheck
npm run lint
npm run generate
```

Static output: `.output/public`. `npm run build` also supports Node hosting.

## Stack and architecture

Nuxt 4.6.3, Vue, TypeScript, Tailwind CSS 4, motion-v, ESLint, tailwind-merge and Nuxt `$fetch`. Versions are pinned by package-lock.json. Tailwind uses the Vite plugin; its preflight is omitted to preserve the original visual reset. Motion provides a reduced-motion-aware entrance.

All seven screens are now native Vue. Each route is a file-based page under `app/pages/` (`index`, `analysis`, `plans`, `positions`, `activity`, `connection`, `api`) rendered through `app/layouts/default.vue` (sidebar + topbar). Shared UI lives in `app/components/` (chart, tables, analysis card, modal host, toast). All application state and actions — demo simulation, API sync, polling, trade/position flows, modals — live in the reactive store `app/composables/useWorkspace.ts`, which replaces the former global-state-plus-manual-render controller. Framework-agnostic logic (API client, record merging, formatting, chart SVG) sits in `app/utils/`. Navigation is Vue Router path-based (`/`, `/analysis`, …), not hash-based. The original `aurum.css` class names are reused unchanged, so the visuals are identical.

The previous controller files (`public/app.js`, `public/api.js`, `public/workspace.js`) have been removed; their behavior is preserved in the store, utils and components above.

All API calls use Nuxt `$fetch` through the adapter with retries disabled, including GET requests. Mutation idempotency keys and multipart screenshots are preserved. Backend credentials, Neon and MT5 configuration remain server-side. Live execution has not been tested.

Original FastAPI backend remains compatible and is distributed separately. No backend migration is required.
