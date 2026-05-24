# GeoCampo — Agent Quickstart

This repo is a pre-MVP scaffold for **GeoCampo**, an offline-first livestock management platform (AgTech/GIS). Cattle (the biological asset) is the core domain.

## Declared Stack (implemented through Phase 1)

- **Frontend:** Expo (React Native + Web), TypeScript
- **Backend:** Supabase (PostgreSQL + PostGIS)
- **Sync:** PowerSync (offline-first SQLite sync)
- **UI:** Tamagui (Neon Lime `#DEFF9A` on Charcoal Black `#0A0A0B`)
- **Maps:** Mapbox (Phase 2)
- **Geospatial:** Turf.js (Phase 2)

## Conventions That Differ from Defaults

- **TDD is mandatory.** Do not write production code without an accompanying `.test.ts` file.
- **Feature-based folder structure**, not layer-based.
- **Karpaty's 4 Rules** (declared in master prompt):
  1. Standard libraries first (Turf.js, PowerSync, Mapbox)
  2. Data/geometry before logic (PostGIS, GeoJSON)
  3. TDD for all functionality
  4. Short feedback loops — test in simulator before integration

## Monorepo Structure

```
geocampo/
├── apps/
│   └── mobile/              # Expo app (Expo Router, supports Web/Mobile)
├── packages/
│   ├── database/            # PowerSync + SQLite schema (@geocampo/database)
│   ├── shared/              # Types, utilities (@geocampo/shared)
│   └── ui/                  # Tamagui config + components (@geocampo/ui)
├── supabase/
│   └── schema.sql           # Supabase PostGIS schema
├── src/                     # Feature-based folders (ready for Phase 2)
│   └── features/
│       ├── farms/
│       ├── pastures/
│       ├── herds/
│       ├── weights/
│       └── health/
└── tests/                   # Root-level tests (schema validation, structure)
```

## Developer Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm test` | Run all tests (root + workspace packages) |
| `pnpm dev` | Start Expo dev server |
| `pnpm dev:web` | Start Expo web dev server |
| `pnpm typecheck` | Run TypeScript checks |

## Current State

- **Phase 0 ✅ COMPLETE** — Feature-based folder structure + `schema.sql` for Supabase (PostGIS, tables: `farms`, `pastures`, `herds`, `weights`, `health`, `movements`)
- **Phase 1 ✅ COMPLETE** — Expo monorepo initialized with TypeScript, PowerSync SDK installed, local SQLite schema implemented
- **Phase 2 ✅ COMPLETE** — GIS Core & Herd Management (MapCanvas with Mapbox, Drag & Drop between pastures, Turf.js Point-in-Polygon validation, PowerSync movement recording)
- **Phase 3 ⏳ PENDING** — Quality & Optimization (memory audit, sync conflict resolution)

## Test Results

- **77 tests passing** across all packages
- Root tests: Supabase schema validation (24 tests), Mobile structure validation (7 tests)
- Package tests: Database schema (13 tests), PowerSync setup (4 tests), Shared utilities (8 tests), Geo validation (11 tests)
- Mobile tests: Movements service (4 tests), Herd drag-drop hook (2 tests), MapCanvas logic (4 tests)

## Agentic Workflow Origin

This repo was bootstrapped with a "Swarm of Models" concept:
- GLM-5.1 → architecture / brainstorm
- Kimi K2.6 → TDD coding / `developTDD`
- DeepSeek V4-Pro → review / `executeReview`

Future agents should be aware this was the intended collaboration pattern.

## References

- `GeoCampo_Master_Agent_Prompt.md` — master prompt with full architecture and skill definitions
- `.docx` master files (unreadable by standard tools) contain detailed source of truth for business strategy, product ops, design system, technical architecture, and dev framework
