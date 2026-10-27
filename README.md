# tranding-view

A working Nuxt clone of Aurum with all seven screens and the existing FastAPI workflows.

## Run

Node 22.21+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the local URL, then Connection → Connect backend. Enter your FastAPI URL and owner key. Allow the frontend origin in FastAPI CORS. Keys stay in memory. Starts in simulated demo mode.

```sh
npm run typecheck
npm run lint
npm run generate
```

Static output: `.output/public`. `npm run build` also supports Node hosting.

## Stack and migration boundary

Nuxt 4.6.3, Vue, TypeScript, Tailwind CSS 4, motion-v, ESLint, tailwind-merge and Nuxt `$fetch`. Versions are pinned by package-lock.json. Tailwind uses the Vite plugin; its preflight is omitted to preserve the original visual reset. Motion provides a reduced-motion-aware entrance.

This is a compatibility migration: Nuxt owns the application mount, styling and fetch transport. The existing tested JavaScript controller and hash navigation remain in `public/app.js`, `public/api.js`, and `public/workspace.js` to preserve all existing workflows. Screens are not yet rewritten as native Vue components. TypeScript covers the Nuxt shell and utilities; the retained controller remains JavaScript. Do not mount the controller twice in one document.

All API calls use Nuxt `$fetch` through the adapter with retries disabled, including GET requests. Mutation idempotency keys and multipart screenshots are preserved. Backend credentials, Neon and MT5 configuration remain server-side. Live execution has not been tested.

Original FastAPI backend remains compatible and is distributed separately. No backend migration is required.
