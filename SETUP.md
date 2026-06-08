# GeoCampo — Setup & End-to-End Test Guide

This guide takes you from zero to a fully running GeoCampo instance — web dashboard and mobile app, with offline sync between them.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| Expo Go | latest | [App Store](https://apps.apple.com/app/expo-go/id982107779) / [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) |

---

## 1 — Clone and install

```bash
git clone <your-repo-url> geocampo
cd geocampo
pnpm install
```

This installs all workspaces: `packages/i18n`, `packages/shared`, `packages/database`, `packages/ui`, `apps/web`, `apps/mobile`.

---

## 2 — Demo mode (no Supabase required)

**Both the web dashboard and mobile app work without any backend in demo mode.**

Demo mode activates automatically when environment variables are absent.  
Skip to step 5 to run the apps right now.

---

## 3 — Production setup: Supabase (optional)

### 3.1 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Choose a strong database password — save it somewhere safe.
3. Wait ~2 minutes for the project to spin up.

### 3.2 Run the schema

In the Supabase dashboard → **SQL Editor** → paste and run `supabase/schema.sql`.

This creates:
- `farms` — farm records with slug-based routing
- `pastures` — pasture polygons (PostGIS geometry)
- `herds` — livestock groups
- `weights` — weight records
- `health` — treatment/vaccination records
- `movements` — herd movements between pastures
- `infrastructure_features` — water, fences, corrals, buildings
- Row-level security policies for all tables

### 3.3 Create a farm record

In Supabase → **Table Editor** → `farms` → Insert row:

```json
{
  "name": "Estancia Las Pampas",
  "owner_name": "Roberto Álvarez",
  "total_area_hectares": 320.5,
  "slug": "estancia-las-pampas"
}
```

Then link it to an auth user:
1. Go to **Authentication** → Users → Create a test user.
2. Copy the user UUID.
3. Update the farm row: set `owner_id` to that UUID.

---

## 4 — Environment variables

### Web dashboard (`apps/web/.env.local`)

```bash
# Required for production Supabase auth
# Leave empty to use demo mode
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Required to show the satellite map
# Get a free token at mapbox.com
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiLi4uIn0...
```

To find your Supabase values: Project Settings → API.

### Mobile app (`apps/mobile/.env`)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# PowerSync endpoint (optional — for offline sync)
EXPO_PUBLIC_POWERSYNC_URL=https://your-instance.powersync.journeyapps.com
```

**Demo mode:** leave all variables empty. The apps will use local seed data.

---

## 5 — Run the apps

### Web dashboard

```bash
pnpm dev:dashboard
# Opens at http://localhost:3001
```

### Mobile app (Expo)

```bash
pnpm dev
# Scan the QR code with Expo Go on your phone
```

### Mobile — web preview

```bash
pnpm --filter mobile dev:web
# Opens at http://localhost:8081
```

---

## 6 — End-to-end test flow

Follow these steps to verify the complete system works.

### Step 1 — Login

1. Open `http://localhost:3001/login`
2. In **demo mode**: enter any email and password → click **Enter the field**
3. In **production mode**: use the email/password you created in Supabase
4. ✅ You should land on `/estancia-las-pampas`

### Step 2 — Farm dashboard (web)

On the farm dashboard you should see:
- **TopBar**: cattle count (105), 3 pastures, 320 ha, alert badge (Este is overloaded)
- **Sidebar → Pastures**: three pasture cards with colour-coded stocking bars
  - Norte: lime (normal load)
  - Sur: lime (normal load)  
  - Este: red (overloaded — 28 cattle, capacity 25)
- **Alerts panel**: "Sobrecarga · 28/25 cab. (112%)" for Potrero Este
- **Movements log**: 5 recent herd movements

### Step 3 — Map interaction

1. Click any green pasture polygon → sidebar highlights, detail panel slides in from right
2. Detail panel shows: herd name, stocking bar, ADG, days occupied, weight history
3. Click a 💧 water marker → infrastructure detail panel opens
4. Click × or another area to deselect

### Step 4 — Language toggle

1. In the TopBar, click **EN** → all UI text switches to English instantly
2. Click **ES** → switches back to Spanish
3. Refresh the page → your language preference is remembered (localStorage)

### Step 5 — Infrastructure panel

1. Click the **🏗️ Infra** tab in the sidebar
2. Click "Tajamar Norte" (water) → detail panel shows: condition Buena, coordinates
3. Click "Límite Este" (fence, condition Regular) → shows maintenance warning
4. Click × to close

### Step 6 — Mobile app

1. Open Expo Go on your phone, scan the QR from `pnpm dev`
2. Home screen shows: farm stats, load alerts, health alerts, ADG section
3. Tap **Lotes / Herds** tab → see 3 herd cards with weight/ADG metrics
4. Tap a herd card → weight recording modal opens
   - Enter a total weight (e.g. 5000)
   - Enter cattle count (e.g. 45)
   - Tap **Guardar pesaje / Save weighing**
5. Tap **Sanidad / Health** tab → upcoming treatments with urgency badges

### Step 7 — Language toggle (mobile)

1. In the top-right corner of any tab, tap **EN**
2. Tab labels and all screen content switch to English
3. Tap **ES** to switch back

### Step 8 — Offline sync test (requires PowerSync setup)

1. Enable airplane mode on your phone
2. Open the mobile app — it loads from local SQLite (offline)
3. Record a weight or health treatment
4. Disable airplane mode
5. PowerSync syncs the change to Supabase automatically
6. Refresh the web dashboard — the new record appears

---

## 7 — Test-driven development (TDD)

GeoCampo's business logic lives in pure TypeScript functions so it can be fully unit-tested without a database or a phone. Tests are written first, then implementation — the classic Red → Green → Refactor cycle.

### Running tests

```bash
# Run all tests from repo root
pnpm test

# Watch mode (re-runs on save)
pnpm test:watch

# Run only shared business-logic tests
pnpm --filter @geocampo/shared test

# Run only mobile tests
pnpm --filter mobile test
```

### What's tested

| File | What it covers |
|------|---------------|
| `packages/shared/tests/alerts.test.ts` | `calculateStockingRate`, `getLoadStatus`, `buildLoadAlert`, `getActiveAlerts`, `calculateADG`, `loadStatusLabel`, `loadStatusColor` |
| `apps/mobile/src/services/weights.ts` | `recordWeight`, `getWeightsForHerd`, `getLatestWeight` |
| `apps/mobile/src/services/health.ts` | `treatmentTypeLabel`, `daysUntilDue`, `getDueStatus`, `dueStatusColor` |

### TDD workflow — adding a new feature

Follow this pattern for any new business logic:

**1. Write the failing test first**

```typescript
// packages/shared/tests/rotation.test.ts
import { shouldRotate } from '../src/utils/rotation';

describe('shouldRotate', () => {
  it('recommends rotation after 30 days', () => {
    expect(shouldRotate(31)).toBe(true);
  });
  it('does not recommend rotation at 30 days or fewer', () => {
    expect(shouldRotate(30)).toBe(false);
  });
});
```

Run `pnpm test` → test fails (Red).

**2. Implement the minimum code to pass**

```typescript
// packages/shared/src/utils/rotation.ts
export function shouldRotate(daysOccupied: number): boolean {
  return daysOccupied > 30;
}
```

Run `pnpm test` → test passes (Green).

**3. Refactor**

Clean up, add edge cases, export from `index.ts`. Tests stay green.

### Mock database pattern

Mobile services use a dependency-injected `db` parameter so they're trivially testable:

```typescript
// Standard mock — mirrors the TDD pattern used throughout
const mockDb = {
  execute: jest.fn(),
  getAll: jest.fn(),
  getOptional: jest.fn(),
};

// Reset between tests
beforeEach(() => jest.clearAllMocks());

it('records a weight', async () => {
  mockDb.execute.mockResolvedValue({ rows: { item: () => ({ id: 'w1', ... }) } });
  const result = await recordWeight(mockDb, { herdId: 'h1', weightKg: 5000, cattleCount: 45 });
  expect(mockDb.execute).toHaveBeenCalledTimes(1);
  expect(result.averageWeightKg).toBeCloseTo(111.1, 1);
});
```

### Coverage targets

| Package | Target |
|---------|--------|
| `packages/shared` | 100% of pure utility functions |
| `apps/mobile/src/services` | 100% of service functions |
| `apps/mobile/src/hooks` | Key hooks via React Testing Library |
| `apps/web/src/lib` | Alert logic, auth helpers |

---

## 8 — Typecheck

```bash
# Web dashboard
cd apps/web && pnpm typecheck

# Mobile app
cd apps/mobile && pnpm typecheck

# Shared packages
cd packages/shared && pnpm typecheck
cd packages/i18n && pnpm typecheck
```

---

## 8 — Project structure reference

```
geocampo/
├── apps/
│   ├── web/                    # Next.js 15 — web dashboard
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── login/      # Login page
│   │   │   │   └── [slug]/     # Farm dashboard (per-client URL)
│   │   │   ├── components/     # UI components
│   │   │   └── lib/
│   │   │       ├── alerts.ts   # Stocking & health alert logic
│   │   │       ├── data.ts     # Demo data (no backend needed)
│   │   │       ├── i18n.tsx    # Language provider + useT() hook
│   │   │       ├── selection.ts # SelectionState discriminated union
│   │   │       └── supabase.ts # Dual-mode auth (demo / production)
│   │   └── .env.local          # ← create this (see step 4)
│   │
│   └── mobile/                 # Expo 52 — React Native mobile app
│       ├── app/
│       │   ├── _layout.tsx     # Root layout (LanguageProvider)
│       │   └── (tabs)/         # Tab navigation
│       └── src/
│           ├── data/seed.ts    # Demo data matching DB schema
│           ├── hooks/          # useWeights, useHealth
│           ├── lib/i18n.tsx    # Mobile language provider
│           └── services/       # Weight + health services
│
├── packages/
│   ├── i18n/                   # Shared English + Spanish translations
│   │   └── src/
│   │       ├── translations/
│   │       │   ├── en.ts       # English (canonical)
│   │       │   └── es.ts       # Spanish (mirrors en.ts)
│   │       └── index.ts        # interpolate(), getPath(), Language type
│   │
│   ├── shared/                 # Shared utilities
│   │   └── src/utils/alerts.ts # ADG, stocking rate, load status
│   │
│   ├── database/               # PowerSync schema
│   │   └── src/schema.ts
│   │
│   └── ui/                     # Tamagui design tokens
│
└── supabase/
    └── schema.sql              # Full PostgreSQL schema with RLS
```

---

## 9 — Common issues

**`Module not found: Package path . is not exported from react-map-gl`**  
→ `react-map-gl` v8 changed its entry point. Use `import Map from 'react-map-gl/mapbox'` (already fixed in `FarmMap.tsx`). If it still appears, delete `.next/` and restart: `rm -rf apps/web/.next && pnpm dev:dashboard`.

**Map shows "Mapbox token required"**  
→ Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `apps/web/.env.local`. Get a free token at [mapbox.com](https://account.mapbox.com/auth/signup/).

**Login redirects loop**  
→ In demo mode, clear cookies: DevTools → Application → Cookies → delete `geocampo_session`.

**pnpm install fails**  
→ Make sure Node ≥ 20: `node --version`. Then: `corepack enable && pnpm install`.

**Expo QR code doesn't work**  
→ Make sure your phone and computer are on the same WiFi network.

**TypeScript errors in `@types/geojson`**  
→ The mobile app uses inline GeoJSON types in `MapCanvas.tsx` to avoid this. Do not add `@types/geojson` to mobile.

---

## 10 — Adding a real farm

To add a new client farm in production:

1. Create a Supabase Auth user for the farmer.
2. Insert a `farms` row with a unique `slug` (e.g. `estancia-del-sur`).
3. Link `owner_id` to the farmer's user UUID.
4. Insert `pastures` rows with PostGIS geometry (use QGIS or a GIS tool to draw polygons).
5. Insert `herds` rows linking to pastures.
6. The farmer logs in at `app.geocampo.com` → middleware auto-redirects to `/estancia-del-sur`.
