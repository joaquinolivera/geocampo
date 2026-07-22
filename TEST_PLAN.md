# GeoCampo — Test Plan (Phases B2b · I · H · C · J)

**Coverage**: unit + integration (Jest), E2E (Playwright), manual QA.

---

## 1. Run automated tests

### 1A — Jest unit tests (web)

```bash
# From repo root
cd apps/web
pnpm test              # runs all Jest tests (jest.config.js)
pnpm test --watch      # watch mode during development
```

Key test files and what they cover:

| File | Phase | Coverage |
|------|-------|----------|
| `src/__tests__/farm-store.erp.test.ts` | I, B2b | `addEmployee`, `addFuelLog`, `addExpense`, `addMachine`, `updatePasture(coordinates)` |
| `src/__tests__/api-chat.test.ts` | J | `pastureToText`, `herdToText`, `healthRecordToText` serializers |
| `src/__tests__/farm-store.updatePasture.test.ts` | B2 | `updatePasture` partial field updates |
| `src/__tests__/farm-store.addPasture.test.ts` | B1 | `addPasture`, area calculation |
| `src/__tests__/farm-store.weight.test.ts` | A1 | `addWeightRecord` |
| `src/__tests__/farm-store.health.test.ts` | A2 | `addHealthRecord` |
| `src/__tests__/farm-store.movement.test.ts` | A3 | `moveHerd` |

### 1B — Jest unit tests (shared package)

```bash
cd packages/shared
pnpm test
```

Covers `calculateStockingRate`, `buildLoadAlert`, `calculateADG`, geospatial helpers.

### 1C — Playwright E2E tests (web)

```bash
# Ensure dev server is running on port 3001 (or let Playwright start it)
cd apps/web
npx playwright install chromium   # first time only
npx playwright test               # headless
npx playwright test --ui          # with UI explorer
npx playwright test --headed      # watch the browser
```

Test files:

| File | Coverage |
|------|----------|
| `e2e/auth.spec.ts` | Login page, demo mode detection, wizard redirect |
| `e2e/dashboard.spec.ts` | TopBar metrics, map render, ERP panel, Chat panel, language toggle |

---

## 2. TypeScript check

```bash
# Each package
cd apps/web    && pnpm typecheck
cd apps/mobile && npx tsc --noEmit
cd packages/shared && npx tsc --noEmit
```

All must exit 0 before shipping.

---

## 3. Manual QA checklist

Run in a browser after `pnpm dev:web` (port 3001). Check each item and mark ✅ / ❌.

### 3A — Auth / Demo mode

| # | Step | Expected |
|---|------|----------|
| 1 | Open http://localhost:3001 with empty Supabase env vars | Redirect to `/login` |
| 2 | Login page renders | GeoCampo logo, demo-mode badge visible |
| 3 | Click "Explorar demo" / demo button | Redirect to `/setup` or demo farm page |
| 4 | Complete the farm setup wizard (name + at least 1 pasture drawn on map) | Redirects to farm dashboard |
| 5 | Reload page | Farm data persists (localStorage) |

### 3B — Map & Pastures (Phase B2b)

| # | Step | Expected |
|---|------|----------|
| 6 | Click a pasture polygon on the map | `ParcelDetailPanel` slides in from right |
| 7 | Click "🗺 Redibujar límite del potrero" | Panel closes; HUD shows "Dibujá el nuevo límite…" |
| 8 | Click 3+ points on the map | Drawn polygon preview appears |
| 9 | Click "Guardar nuevo límite" | HUD closes; pasture polygon on map updates to new shape |
| 10 | Reload — click the redrawn pasture | `areaHectares` in the detail panel matches the new polygon |
| 11 | Click "Cancelar" during redraw | HUD dismisses; original polygon unchanged |

### 3C — ERP Panel (Phase I)

| # | Step | Expected |
|---|------|----------|
| 12 | Click "🏢 ERP" in TopBar | ERPPanel slides in, replaces sidebar; shows 4 sub-tabs |
| 13 | Click "🏢 ERP" again | ERPPanel closes; sidebar returns |
| 14 | In ERPPanel → Empleados → "Agregar empleado" | Modal opens |
| 15 | Fill name + role + salary → Save | Employee appears in list immediately |
| 16 | Reload page → open ERP → Empleados | Saved employee still visible |
| 17 | Combustible tab → "Agregar" | Fuel log modal opens |
| 18 | Add fuel log (litros + costo/litro) → Save | Entry appears; total cost auto-calculated |
| 19 | Gastos tab → "Agregar" | Expense modal with category select |
| 20 | Add expense → Save | Expense appears in list; running total updates |
| 21 | Maquinaria tab → "Agregar" | Machinery modal opens |
| 22 | Add machine → Save | Machine appears in list |
| 23 | Reload → all 4 ERP entities still present | Data persisted in localStorage |

### 3D — AI Chat (Phase J)

| # | Step | Expected |
|---|------|----------|
| 24 | Click "🤖 IA" in TopBar | ChatPanel slides in from right; welcome message visible |
| 25 | Suggestion chips visible | 4 preset questions shown |
| 26 | Click a suggestion chip | Chip text sent as message; typing indicator (3 dots) appears |
| 27 | Wait for response (demo mode) | Demo explanation streams in word-by-word |
| 28 | Type a custom question and press Enter | Message appears; streaming response follows |
| 29 | Click × close button | ChatPanel dismisses; map/sidebar visible again |
| 30 | Click "🏢 ERP" while chat is open | Chat closes; ERP opens (they don't stack) |

### 3E — Landing page (Phase H)

| # | Step | Expected |
|---|------|----------|
| 31 | `pnpm dev:landing` → http://localhost:3000 (check port in apps/landing/package.json) | Landing page loads |
| 32 | Nav links: Features, Precios, Testimonials | Smooth-scroll to sections |
| 33 | "Empezar gratis" CTA button | Navigates to web app login |
| 34 | Pricing section | 3 tiers (Starter $29, Pro $79, Enterprise) |
| 35 | Mobile viewport (375px) | Nav collapses; hero text legible; no horizontal scroll |
| 36 | `pnpm build` in apps/landing | Exits 0 with no errors |

### 3F — Mobile (Phase C) — requires physical device or simulator

| # | Step | Expected |
|---|------|----------|
| 37 | `pnpm dev:mobile` → Expo Go or simulator | App loads; no crash |
| 38 | First launch: notification permission dialog | System permission prompt appears (iOS/Android) |
| 39 | Turn off Wi-Fi → navigate within app | Yellow "Sin conexión" banner appears |
| 40 | Re-enable Wi-Fi | Banner changes to green "Sincronizando…" then disappears |
| 41 | `OfflineQueue.enqueue('sync_weight', {...})` via dev console | Action stored in SQLite |
| 42 | Reconnect → queue flushes | `OfflineQueue.count()` returns 0 |

### 3G — Full typecheck + build (CI gate)

| # | Step | Expected |
|---|------|----------|
| 43 | `cd apps/web && pnpm typecheck` | Exit 0 |
| 44 | `cd apps/web && pnpm build` | Exit 0, no TS/build errors |
| 45 | `cd apps/landing && pnpm build` | Exit 0 |
| 46 | `cd packages/shared && npx tsc --noEmit` | Exit 0 |

---

## 4. Known limitations (demo mode)

- **AI Chat**: returns a canned stream until `OPENAI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` are set. Set them in `apps/web/.env.local` to enable real RAG responses.
- **ERP data**: stored only in `localStorage`; a second browser tab won't see changes until page reload.
- **Offline queue** (mobile): `defaultExecutor` is a no-op — each action type must be wired in `apps/mobile/app/_layout.tsx → defaultExecutor`.
- **Push notifications** (mobile): requires a real device + Expo account with `EXPO_PROJECT_ID` set in app config.

---

## 5. Security reminders

- Rotate the Mapbox **Secret** Access Token at https://account.mapbox.com/access-tokens — it was previously exposed in git commit `0ef276cc`.
- Never commit `.env.local`. Verify: `git ls-files apps/web/.env.local` must return nothing.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — it must **never** appear in a `NEXT_PUBLIC_` variable.
