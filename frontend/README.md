# Kora Frontend

Shared codebase for the Kora web (and later desktop) app. See the system architecture doc for the full picture.

## Layout

```
frontend/
  shared/   # ~95% of the app — modules, state, api, auth, platform interface, seed, i18n, lib
  web/      # thin Vite shell — browser Platform impl + main.tsx
  desktop/  # thin Tauri 2 shell — desktop Platform impl + src-tauri/ (Rust)
```

## Scripts (run from `frontend/`)

- `pnpm install` — install all workspaces
- `pnpm proto:gen` — regenerate Connect-ES clients from `../proto` into `shared/src/api/gen`
- `pnpm dev:web` — start the web dev server
- `pnpm build:web` — production build (web)
- `pnpm dev:desktop` — start the desktop app (Tauri; requires Rust toolchain + WebView2 on Windows)
- `pnpm build:desktop` — build the desktop installer
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm e2e`

### Desktop prerequisites

- **Rust** via [rustup](https://rustup.rs/)
- **Windows**: WebView2 (preinstalled on Win11) + Visual Studio Build Tools (Desktop development with C++)
- Generate icons once before the first `build:desktop`: `cd desktop && pnpm tauri icon path/to/icon-1024.png`

## Conventions

1. ~95% of code lives in `shared/`. `web/` is a thin shell that only provides the Platform implementation and mounts the app.
2. **Permission-driven rendering.** Nav, Home, dashboards, and modules derive from the user's effective permissions — never from role-name string checks.
3. **Proto-generated API only.** All backend calls go through `shared/src/api/gen` + `shared/src/api/client.ts`.
4. **Platform interface only.** Shared code never touches browser/OS APIs directly — only `platform.*`.
5. **Seed-data-first.** Every screen is built against `shared/src/seed` (shaped to `api/gen` types); integration = swap the data source.
6. TypeScript strict, Zod at boundaries, i18n from day one (EN/FR/RW), tests with the code.
