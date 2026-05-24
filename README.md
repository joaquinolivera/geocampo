# GeoCampo

Offline-first livestock management platform (AgTech/GIS) built with Expo, Supabase, and PowerSync.

## Overview

GeoCampo manages the core biological asset — cattle — through an offline-first mobile and web application. All data syncs with Supabase when online, but works fully offline in the field.

## Tech Stack

- **Frontend:** Expo (React Native + Web), TypeScript
- **Backend:** Supabase (PostgreSQL + PostGIS)
- **Sync:** PowerSync (offline-first SQLite sync)
- **UI:** Tamagui (Neon Lime `#DEFF9A` on Charcoal Black `#0A0A0B`)
- **Maps:** Mapbox (Phase 2)
- **Geospatial:** Turf.js (Phase 2)

## Project Structure

```
geocampo/
├── apps/
│   └── mobile/              # Expo app (Expo Router)
├── packages/
│   ├── database/            # PowerSync + SQLite schema
│   ├── shared/              # Types, utilities
│   └── ui/                  # Tamagui config + components
├── supabase/
│   └── schema.sql           # PostGIS schema
├── src/
│   └── features/            # Feature-based folders
│       ├── farms/
│       ├── pastures/
│       ├── herds/
│       ├── weights/
│       └── health/
└── tests/                   # Root-level tests
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Start Expo dev server
pnpm dev

# Start Expo web dev server
pnpm dev:web
```

## Database Schema

The Supabase schema (`supabase/schema.sql`) includes:

- **farms** — Farm and ranch locations (PostGIS Point)
- **pastures** — Pasture boundaries (PostGIS Polygon, auto-computed area)
- **herds** — Cattle groups with status tracking
- **weights** — Weight records with averages
- **health** — Treatment and vaccination records
- **movements** — Audit trail of herd movements between pastures

All tables sync bidirectionally with the local SQLite database via PowerSync.

## Development Conventions

- **TDD mandatory** — Every feature requires a `.test.ts` file
- **Feature-based structure** — Code organized by domain, not layer
- **English naming** — All tables, types, and identifiers in English

## Phases

- ✅ **Phase 0** — Structure & Data (folder structure, PostGIS schema)
- ✅ **Phase 1** — Project Init (Expo monorepo, PowerSync, local schema)
- ✅ **Phase 2** — GIS Core & Herd Management (Mapbox MapCanvas, drag & drop, Turf.js validation)
- ⏳ **Phase 3** — Quality & Optimization

## License

MIT
