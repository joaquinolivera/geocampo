# GeoCampo — Feature Backlog

This file tracks every feature to implement, organized by phase.
Each phase is TDD-first: tests written before implementation, committed after all tests green.

---

## Architecture Overview

GeoCampo is a **multi-tenant SaaS** with three products sharing one backend:

```
┌─────────────────────────────────────────────────────────────────┐
│  geocampo.com  (Landing — Next.js, separate app)                │
│  Marketing · Pricing · Signup · Payments (Stripe) · Blog        │
│  → redirects logged-in users to app.geocampo.com               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│  app.geocampo.com  (Web App — this codebase, apps/web)          │
│  Full dashboard · Map · Pastures · Herds · Reports · ERP        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│  GeoCampo Mobile  (Expo, apps/mobile)                           │
│  Offline-first · Field data entry · Background sync             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│  Supabase Backend                                               │
│  PostgreSQL + RLS (tenant isolation per farm_id)                │
│  pgvector (RAG / AI embeddings)                                 │
│  Supabase Auth · Edge Functions · Realtime · Storage            │
└─────────────────────────────────────────────────────────────────┘
```

**Multi-tenancy pattern:** Row-Level Security on every table.
Every row carries a `farm_id`. Supabase RLS policies enforce that
users only see rows where `farm_id = auth.jwt() → farm_id`.

**Roles per farm:** owner · manager · vet · employee · viewer

---

## Phase A — Data entry from the dashboard ✅ COMPLETE

- [x] A1 `addWeightRecord()` + WeightEntryModal + wire button
- [x] A2 `addHealthRecord()` + HealthEntryModal + wire button
- [x] A3 `moveHerd()` + MoveHerdModal + wire button
- [x] Bug fixes: health history visibility, movement history bidirectional,
      species field on herds

---

## Phase B — Edit / add pastures from the dashboard ✅ COMPLETE

- [x] B1 "Agregar potrero" — drawing mode on map + PastureFormModal + addPasture() TDD
- [x] B2 EditPastureModal — edit name, capacity, grassType, waterSupply, notes
      (polygon shape redraw deferred to B2b below)
- [x] B3 "Eliminar potrero" — two-step inline confirmation, blocks if has_herd

- [ ] **B2b** Polygon redraw — let user redraw the polygon of an existing pasture
      (same drawing mode as B1 but pre-selects the existing pasture and replaces coordinates)

---

## Phase C — Mobile app parity (Expo)

- [ ] **C1** Wire weight entry — `addWeightRecord()` from shared store, same form as web
- [ ] **C2** Wire health record entry — `addHealthRecord()` from shared store
- [ ] **C3** Move herd from mobile Map screen — `moveHerd()` + destination picker
- [ ] **C4** Add/edit pastures from mobile Map screen — drawing mode equivalent
- [ ] **C5** Offline queue — store mutations in SQLite when offline, replay on reconnect
      - Use Expo SQLite + a `pending_mutations[]` queue
      - On reconnect: flush queue to Supabase in order, resolve conflicts (last-write-wins)
- [ ] **C6** Sync indicator — banner/icon showing "offline · X changes pending"
- [ ] **C7** Push notifications — Expo Push for rotation alerts, overdue vaccines, weight targets

---

## Phase D — Supabase backend (multi-tenant)

- [ ] **D1** Schema design
      - Every table has `farm_id uuid references farms(id)` + RLS policy
      - Tables: `farms`, `farm_members` (role per user), `pastures`, `herds`,
        `weight_records`, `health_records`, `movements`, `cattle` (Phase G),
        `employees`, `expenses`, `fuel_logs`, `machinery` (Phase ERP)
      - Audit log table: `audit_events (farm_id, table_name, row_id, action, changed_by, changed_at, diff jsonb)`
- [ ] **D2** Supabase Auth + multi-tenant session
      - JWT custom claim: `farm_id` + `role` injected at login
      - Invitation flow: owner invites employees by email → role assignment
- [ ] **D3** Replace localStorage reads/writes with Supabase queries
      - Feature flag: `IS_DEMO_MODE` → localStorage; real credentials → Supabase
      - Keep localStorage as offline cache (read-through, write-behind)
- [ ] **D4** Real-time sync — `supabase.channel()` subscriptions for collaborative edits
- [ ] **D5** Role-based access control (RBAC)
      - owner: full access
      - manager: all except billing and user management
      - vet: health records + cattle view only
      - employee: weight + movement entry only
      - viewer: read-only

---

## Phase E — Reporting & export

- [ ] **E1** Weight gain chart — ADG over time per herd (recharts)
- [ ] **E2** Stocking history — heads per pasture over the year (area chart)
- [ ] **E3** PDF export — farm summary (pastures, herds, weights, health, financials)
- [ ] **E4** CSV export — weight records, health records, movement history
- [ ] **E5** Weekly email digest — farm summary sent every Monday via Resend
      - Configurable per farm: on/off, recipients, language

---

## Phase F — UX improvements

- [ ] **F1** Onboarding — empty state on dashboard with "Configurar mi campo" CTA
- [ ] **F2** Dark-mode time picker fix on mobile Safari
- [ ] **F3** Accessibility audit (WCAG 2.1 AA) — keyboard nav, ARIA roles, contrast
- [ ] **F4** Offline indicator — banner when offline (web service worker)
- [ ] **F5** i18n: add Portuguese (pt-BR) — largest regional cattle market

---

## Phase G — Individual cattle tracking (DIOB / SENACSA chip)

Paraguay Law 7221/2023 + SENACSA Resolution 2103/2024 mandate a DIOB chip per animal.

**DIOB spec:** ISO 11784/11785 FDX-B microchip (134.2 kHz) · left ear
Managed through SINIP (Sistema Nacional de Identificación y Productividad)

- [ ] **G1** `Cattle` entity — individual animal within a herd
      Schema: `id`, `herdId`, `chipId` (EID/ISO), `visualTagId`, `sex`, `breed`, `dob`, `status`
- [ ] **G2** Chip scan entry — manual entry or QR/RFID reader input (mobile)
- [ ] **G3** Weight records per individual animal (`cattleId`) in addition to herd-level
- [ ] **G4** Health records per individual animal
- [ ] **G5** SINIP export — compliant CSV/XML for SENACSA submission
- [ ] **G6** Trazabilidad timeline per animal — full lifecycle history on web + mobile

---

## Phase H — Landing page (geocampo.com)

Separate Next.js app (`apps/landing`) targeting CEOs, farm owners, investors.

- [ ] **H1** Scaffold `apps/landing` — Next.js + Tailwind, separate deployment
- [ ] **H2** Hero section — value proposition, satellite map animation, CTA
- [ ] **H3** Features section — pasture management, herd tracking, ERP, AI assistant
- [ ] **H4** Pricing page — Free / Pro / Enterprise tiers
      - Free: 1 farm, 3 pastures, 1 user, no exports
      - Pro: unlimited pastures, up to 5 users, PDF/CSV export, AI assistant
      - Enterprise: unlimited users, custom domain, SINIP export, dedicated support
- [ ] **H5** Signup flow — create account → create first farm → redirect to app
- [ ] **H6** Payment integration (Stripe)
      - Subscription management, billing portal, invoices
      - Webhook handler for subscription lifecycle events
- [ ] **H7** Blog / resources — SEO content for "gestión ganadera", "SENACSA", "DIOB"
- [ ] **H8** Login → redirect to app.geocampo.com (if session exists, skip login)

---

## Phase I — ERP (Establishment Management)

Full operational picture of the farm as a business.

- [ ] **I1** Employee management
      - Add/edit employees: name, role, CUIL/cédula, hire date, salary, contact
      - Daily attendance log
      - Task assignment (who worked which potrero, which day)
- [ ] **I2** Fuel tracking
      - Log fuel fill-ups: date, liters, cost, vehicle/equipment, purpose
      - Dashboard: fuel cost per month, per hectare, per animal
      - Waste detection: flag unusual consumption vs. historical average
- [ ] **I3** Veterinary & input expenses
      - Log: date, product, quantity, unit cost, supplier, applied to (herd/individual)
      - Auto-links to health records when a treatment is logged
      - Cost per animal, cost per herd, cost per pasture
- [ ] **I4** Machinery & equipment registry
      - Assets: tractor, plow, hay baler, water pump, horses, ATVs
      - Maintenance log per machine: service date, cost, next service due
      - Depreciation tracker
- [ ] **I5** Cost per animal dashboard
      - Rolling cost per head: feed, vet, labor, fuel, infrastructure ÷ animal count
      - Break-even calculator: what price/kg needed to cover costs
- [ ] **I6** Income tracking
      - Log sales: date, herd/animals sold, weight, price/kg, buyer
      - Connects to movement records (sale = movement out of farm)
- [ ] **I7** P&L summary — monthly/annual profit & loss per farm
- [ ] **I8** Infrastructure management
      - Log maintenance: fence repair, water system, corrals, buildings
      - Asset value tracking

---

## Phase J — AI Assistant (RAG on farm data)

Uses Supabase pgvector to embed all farm events (weights, health, movements,
expenses) and answer natural-language questions about the farm.

- [ ] **J1** Embedding pipeline — on every write to Supabase, embed the event into pgvector
      - Edge Function triggered by database webhook
      - Embed: weight records, health records, movements, expenses
- [ ] **J2** Query interface — chat widget in the web app sidebar
      - User types: "¿Cuánto mejoró el lote Laguna en los últimos 3 meses?"
      - RAG retrieves relevant embeddings → passes to Claude API → returns answer
- [ ] **J3** Canned reports with AI narrative
      - "Generar informe mensual" → AI summarizes the month in prose + tables
      - "Estado sanitario del campo" → AI reads all health records and flags risks
- [ ] **J4** Proactive alerts
      - AI notices: ADG dropped 30% in Lote Norte → suggests causes (overstocking, parasite load)
      - Flags: no weighing in 45 days for a herd → reminds owner
- [ ] **J5** Knowledge base — embed FAQs, SENACSA regulations, breed guides
      - Lets AI answer "¿Cuándo debo vacunar contra aftosa?" with regulatory context

---

## Discovered during development

- [ ] Demo mode: "Registrar pesaje" button hidden because `isCustomFarm = false` —
      consider showing it with a "Try in demo mode" affordance
- [ ] `weighedBy` defaults to "Usuario" — should default to logged-in user's name (Phase D)
- [ ] `addPasture()` colors cycle through 7 — consider hue rotation for >7 pastures
- [ ] `addHerd()` and `addPasture()` don't validate for duplicate names
- [ ] Movement history: old records without `fromPastureId`/`toPastureId` fall back to
      name-based matching (backward compatible)

---

_Last updated: 2026-06-08 — Architecture expanded: multi-tenant SaaS, ERP (Phase I),
AI assistant (Phase J), landing page (Phase H). Phase A + B complete (38 + 18 tests)._
