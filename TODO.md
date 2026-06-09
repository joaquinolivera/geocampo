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

- [x] **D1** Schema design — migrations 001–004 run in Supabase (farms, pastures, herds,
      weight_records, health_records, movements, cattle, employees, expenses, fuel_logs,
      machinery + RLS policies + drop handle_new_user trigger)
- [x] **D2** Supabase Auth + multi-tenant session — browser/server clients, farm_members
      join, farm selection via sessionStorage, sign-up + sign-in + sign-out
- [x] **D3a** Supabase READS — FarmDataContext fetches farms/pastures/herds from Supabase
      when IS_DEMO_MODE=false; falls back to localStorage for offline/demo users
- [x] **D3b** Supabase WRITES — persist weight_records, health_records, movements to
      Supabase on every mutation (currently localStorage-only); keep localStorage as
      write-behind offline cache
- [x] **D4** Real-time sync — `supabase.channel()` in FarmDataContext
      (weight_records, health_records, movements, herds); requires realtime enabled
      in Supabase dashboard per table
- [ ] **D5** Role-based access control (RBAC) — hide destructive actions based on role
      - owner: full access
      - manager: all except billing and user management
      - vet: health records + cattle view only
      - employee: weight + movement entry only
      - viewer: read-only

---

## Phase E — Reporting & export

- [x] **E1** Weight gain chart — WeightGainChart (ADG/GPD, LineChart) in ParcelDetailPanel
- [x] **E2** Stocking history — StockingChart (AreaChart, heads per herd over time) in Sidebar
- [x] **E3** PDF export — farm summary (pastures, herds, weights, health); jsPDF + jspdf-autotable, client-side
- [x] **E4** CSV export — weight records, health records, movement history; ExportMenu in TopBar
- [ ] **E5** Weekly email digest — farm summary sent every Monday via Resend
      - Configurable per farm: on/off, recipients, language

---

## Phase F — UX improvements

- [x] **F1** Onboarding — empty state in Sidebar when no pastures (OnboardingEmptyState component)
- [ ] **F2** Dark-mode time picker fix on mobile Safari
- [ ] **F3** Accessibility audit (WCAG 2.1 AA) — keyboard nav, ARIA roles, contrast
- [ ] **F4** Offline indicator — banner when offline (web service worker)
- [ ] **F5** i18n: add Portuguese (pt-BR) — largest regional cattle market

---

## Phase G — Individual cattle tracking (DIOB / SENACSA chip)

Paraguay Law 7221/2023 + SENACSA Resolution 2103/2024 mandate a DIOB chip per animal.

**DIOB spec:** ISO 11784/11785 FDX-B microchip (134.2 kHz) · left ear
Managed through SINIP (Sistema Nacional de Identificación y Productividad)

- [x] **G1** `Cattle` entity + farm-store functions (addCattle, removeCattle, updateCattle)
- [ ] **G2** Chip scan entry — manual entry or QR/RFID reader input (mobile)
- [ ] **G3** Weight records per individual animal (`cattleId`) in addition to herd-level
- [ ] **G4** Health records per individual animal
- [x] **G5** SINIP export — `/api/export/sinip` endpoint + download button in CattlePanel
- [x] **G6** Trazabilidad timeline per animal — CattleDetailPanel with lifecycle history

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

## Auth UX refactor (pending)

- [x] **Auth-1** `/register` page — email + password + confirm + optional farm name; success → check email screen
- [x] **Auth-2** `/login` cleaned — login-only, "¿No tenés cuenta? Registrate" → /register
- [x] **Auth-3** `/register` added to `PUBLIC_PATHS` in middleware
- [ ] **Auth-4** Landing page "Empezar gratis" CTA already links to `/register?plan=starter`
      — verify it works end-to-end after Auth-1 is built

_Rationale: signup (acquisition) belongs on the landing/register route; the app login page
is for returning users only. Standard SaaS pattern (Notion, Linear, etc.)._

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

## Phase K — Role-Based Access Control (RBAC)

Three roles per farm. The permission model is **restrictive by default** — a new
invite defaults to Employee until explicitly upgraded. Role is stored on the
`farm_memberships` table alongside `farm_id` and `user_id`.

### Roles

| Capability | Admin (Propietario) | Capataz (Encargado) | Empleado |
|---|---|---|---|
| Account & billing | ✅ | ❌ | ❌ |
| Invite / remove users | ✅ | ❌ | ❌ |
| Change user roles | ✅ | ❌ | ❌ |
| Farm configuration (name, plan) | ✅ | ❌ | ❌ |
| Add / edit / delete pastures | ✅ | ✅ | ❌ |
| Add / edit / delete herds | ✅ | ✅ | ❌ |
| Add / edit infrastructure | ✅ | ✅ | ❌ |
| View map & pastures (read) | ✅ | ✅ | ✅ |
| Register movements | ✅ | ✅ | ✅ |
| Register health records | ✅ | ✅ | ✅ |
| Register weight entries | ✅ | ✅ | ✅ |
| See financial data (prices, costs) | ✅ | ✅ | ❌ |
| ERP (employees, expenses, P&L) | ✅ | ✅ | ❌ |
| Machinery module | ✅ | ✅ | ❌ |
| Herd economics (buying/selling) | ✅ | ✅ | ❌ |
| Export reports (PDF, CSV) | ✅ | ✅ | ❌ |
| AI assistant | ✅ | ✅ | ❌ |

- [ ] **K1** DB migration — `farm_memberships` table (`farm_id`, `user_id`, `role`, `invited_at`, `accepted_at`)
      - RLS: users can only read/write their own farm data based on membership role
      - Role enum: `owner` | `capataz` | `empleado`
- [ ] **K2** Invitation flow
      - Admin sends invite by email → generates token → user registers or logs in → accepted
      - `/invite/[token]` route (public) resolves invitation and links account
      - Email template: "Te invitaron a GeoCampo — Estancia Las Pampas"
- [ ] **K3** Team management UI (`/[slug]/settings/team`)
      - List current members + roles
      - Invite new member (email + role selector)
      - Remove member / change role (Admin only)
- [ ] **K4** Role enforcement in frontend
      - `useRole()` hook returns current user's role for the active farm
      - Conditionally hide/disable: add pasture button, ERP tab, financial columns
      - Empleado sees a simplified view: map + movement/health/weight forms only
- [ ] **K5** Role enforcement in API routes + middleware
      - All mutations check role server-side (not just UI hiding)
      - Supabase RLS policies enforce per-column visibility (financial fields hidden for empleado)
- [ ] **K6** Empleado mobile-first experience
      - Dedicated simplified layout when role = empleado
      - Large touch targets, only 3 actions: Movimiento / Sanidad / Pesaje
      - Cannot navigate to ERP, Reports, Machinery, Settings

---

## Phase L — Pricing Plans & Feature Gates

Three tiers. Billing is already wired (Stripe + middleware). This phase adds
per-feature gates driven by `subscription_plan` on the `farms` table.

### Plan Comparison

| Feature | Básico ($29/mo) | Pro ($79/mo) | Estancia ($179/mo) |
|---|---|---|---|
| Farms | 1 | 1 | Up to 5 |
| Users | 3 (Admin + 2) | 10 | Unlimited |
| Roles | Admin only | All 3 roles | All 3 roles |
| Pastures | Up to 10 | Unlimited | Unlimited |
| Map & pasture management | ✅ | ✅ | ✅ |
| Movements, health, weights | ✅ | ✅ | ✅ |
| ERP (expenses, P&L) | ❌ | ✅ | ✅ |
| Herd economics (lotes) | ❌ | ✅ | ✅ |
| Machinery module | ❌ | ✅ | ✅ |
| AI assistant | ❌ | ✅ | ✅ |
| SINIP / trazabilidad export | ❌ | ✅ | ✅ |
| PDF / CSV reports | Limited | Full | Full + custom |
| Multi-farm dashboard | ❌ | ❌ | ✅ |
| Priority support | ❌ | ❌ | ✅ |
| 14-day free trial | ✅ | ✅ | ✅ |

- [ ] **L1** Update Stripe products — create `basico`, `pro`, `estancia` price IDs
      - Monthly and annual pricing (annual = 2 months free)
- [ ] **L2** `usePlan()` hook — reads `subscription_plan` from farm context
      - Returns `{ plan, canUse: (feature: Feature) => boolean }`
      - Feature flags: `erp`, `herdEconomics`, `machinery`, `ai`, `sinip`, `advancedReports`, `multiFarm`
- [ ] **L3** Plan gate component `<RequiresPlan feature="erp">` 
      - Shows upgrade prompt if current plan doesn't include the feature
      - Upgrade CTA links to `/billing` with pre-selected plan
- [ ] **L4** Update `/billing` page with all 3 plans + annual toggle
- [ ] **L5** Multi-farm support (Estancia plan)
      - `farms` table: one user can own multiple farms
      - Farm selector in TopBar (currently shows one farm name)
      - Multi-farm dashboard: aggregate overview across all farms

---

## Phase M — Herd Economics ("Lotes Comerciales")

This is the revenue-generating insight feature. A **Lote Comercial** is a batch
of cattle tracked from purchase to sale. Think of it as the P&L of a group of
animals over their entire time on the farm.

### Data model

```
lote_comercial:
  id, farm_id, name, status (open|closed)
  species, category (ternero|novillo|vaca|toro|etc.)
  opened_at, closed_at

lote_entrada (purchase / birth):
  lote_id, date, head_count, total_weight_kg
  price_per_kg | price_per_head, total_cost
  vendor, origin_certificate, notes

lote_salida (sale / death / transfer):
  lote_id, date, head_count, total_weight_kg
  price_per_kg | price_per_head, total_revenue
  buyer, destination, notes

lote_gasto (costs accrued while in ownership):
  lote_id, date, category (feed|health|labor|transport|other)
  amount, description
  links to: health_record_id | expense_id (optional)
```

- [ ] **M1** DB migration — `lotes_comerciales`, `lote_entradas`, `lote_salidas`, `lote_gastos`
- [ ] **M2** Lotes list page (`/[slug]/lotes`)
      - Table: name, category, # heads, opened date, status (open/closed)
      - Open vs closed filter tabs
      - "Nuevo lote" CTA
- [ ] **M3** Open a lote (purchase/ingreso)
      - Form: name, species, category, head count, entry weight (total or per head)
      - Cost: price per kg OR price per head, vendor, date
      - Optional: link to existing herd in a pasture
- [ ] **M4** Lote detail page
      - Header: name, status, heads, days open, total cost to date
      - Timeline: entries, exits, weight records, health costs, feed costs
      - Current metrics:
        - Average daily gain (ADG): (current weight − entry weight) / days
        - Cost per kg of gain: total costs / kg gained
        - Break-even sale price: total costs / current weight
- [ ] **M5** Record weight gain (link to existing weight entry system)
      - Weight records feed into ADG calculation for the lote
- [ ] **M6** Close a lote (sale/egreso)
      - Form: date, head count sold, exit weight, sale price per kg, buyer
      - Can do partial sales (sell 30 of 50 heads → lote stays open)
      - Remaining heads continue to accumulate costs
- [ ] **M7** Lote closed — P&L summary card
      - Revenue: total kg × sale price
      - Costs: purchase + health + feed + transport + labor
      - Gross profit / loss in $ and %
      - ROI per day (annualized)
      - Profit per head
- [ ] **M8** Analytics dashboard
      - All closed lotes: compare profit per head by category/breed/pasture
      - Best and worst performing lotes
      - Historical price trends: purchase price/kg vs sale price/kg over time
      - ADG benchmark by pasture (which pasture fattens best)

---

## Phase N — Machinery & Fleet Management

Dedicated module for all motorized assets. Stands alone — not bolted onto ERP
expenses — because it has its own lifecycle: registration → usage → maintenance
→ depreciation → sale.

### Data model

```
machinery:
  id, farm_id, name, type (tractor|truck|sprayer|mower|pump|atv|other)
  brand, model, year, serial_number, license_plate
  purchase_date, purchase_price, current_value
  fuel_type (diesel|gasoline|electric)
  status (active|in_maintenance|inactive)

fuel_log:
  machinery_id, date, liters, price_per_liter, total_cost
  hours_at_fillup, odometer_km (optional), notes

maintenance_record:
  machinery_id, date, type (oil|filter|tire|belt|brake|general|repair)
  description, cost, performed_by (internal|external), workshop
  hours_at_service, next_service_hours | next_service_date

machinery_usage:
  machinery_id, date, hours_used, task, pasture_id (optional), operator
  fuel_consumed_liters (estimated from rate)
```

- [ ] **N1** DB migration — `machinery`, `fuel_logs`, `maintenance_records`, `machinery_usage`
- [ ] **N2** Machinery registry page (`/[slug]/maquinaria`)
      - Card grid: equipment name, type icon, status badge
      - "Agregar equipo" CTA
      - Equipment form: name, type, brand/model, year, purchase price, fuel type
- [ ] **N3** Equipment detail page
      - Header: name, type, current status
      - Stats: total hours, total fuel cost, total maintenance cost, cost/hour
      - Tabs: Combustible | Mantenimiento | Uso
- [ ] **N4** Fuel log
      - Quick entry: date, liters, price/liter → auto-calculates total cost
      - Monthly fuel cost chart
      - Alert: consumption spike vs. rolling average (flags engine issues)
- [ ] **N5** Maintenance tracker
      - Log: date, type, cost, who did it, hours at service
      - Schedule next service: X hours OR specific date
      - Dashboard widget: equipment overdue or due-soon for service
      - Full service history exportable as PDF (useful when selling equipment)
- [ ] **N6** Usage log
      - Log daily use: hours, task (arado/siembra/transporte/fumigación/otro), operator
      - Link to pasture (optional) — know which field was worked
- [ ] **N7** Fleet summary dashboard
      - Total fleet replacement value
      - Monthly costs: fuel + maintenance per machine
      - Utilization rate: hours used / available hours
      - Maintenance calendar (upcoming services next 30/60/90 days)
- [ ] **N8** Depreciation tracker
      - Straight-line or declining balance per asset
      - Current book value per machine
      - Fleet total book value (for insurance / financial reporting)

---

## Phase O — ERP Overhaul (Full Financial Dashboard)

Phase I built the ERP UI scaffolding. Phase O turns it into a real financial
command center with dashboards, reports, and cross-module data aggregation.

### The complete income & expense picture

All cost sources feed into one ledger:
- **Direct inputs**: manual expenses (Phase I)
- **Herd costs**: linked from lote_gastos (Phase M)
- **Machinery costs**: fuel + maintenance from Phase N
- **Employee labor**: payroll from Phase I
- **Health treatments**: auto-linked from health records

- [ ] **O1** Unified expense ledger
      - All expense sources aggregated: ERP manual + lote costs + machinery + employee
      - Category taxonomy: Sanidad | Alimentación | Combustible | Mano de obra |
        Maquinaria | Infraestructura | Impuestos | Seguros | Otros
      - Filterable by category, date range, pasture
- [ ] **O2** P&L dashboard (full overhaul)
      - Monthly view: income bars vs expense bars, net margin line
      - Annual summary with month-by-month breakdown
      - Income sources: cattle sales + other (rent, services, subsidies)
      - Expense breakdown: donut chart by category
- [ ] **O3** Cost per head (live calculation)
      - Rolling cost per animal on farm: (all expenses YTD) / (current head count)
      - Break-even price per kg: cost per head / average weight
      - Trend: cost per head this month vs last 6 months
- [ ] **O4** Cash flow projection
      - Known upcoming expenses: scheduled maintenance, employee salaries
      - Expected income: open lotes projected at current ADG × market price
      - 90-day cash flow forecast chart
- [ ] **O5** Budget module
      - Set annual budget by category
      - Budget vs actual tracking — red/yellow/green indicators
      - Alert when a category exceeds 80% of budget mid-period
- [ ] **O6** Tax preparation export
      - Annual income/expense report formatted for contador
      - Itemized list with dates, amounts, categories
      - Export as PDF + XLSX
- [ ] **O7** Pasture profitability report
      - Which pastures generate best weight gain per hectare
      - Cost per hectare: infrastructure + maintenance + water
      - Revenue attributed to each pasture via lote tracking
- [ ] **O8** Employee module (full)
      - Payroll: base salary, hours worked, overtime, deductions
      - Attendance calendar
      - Task log: who worked which day on which pasture/task
      - IPS contributions (Paraguay social security) tracker

---

## Phase P — Auth & Account Management

- [ ] **P1** Password reset / change password flow
      - "Forgot password?" link on /login → send reset email via Supabase Auth
      - /reset-password page: verifies token, lets user set new password
      - "Change password" section in a /account settings page
      - On registration: show "check your email to confirm" state

## Phase Q — Map & UX Polish

- [ ] **Q1** Polygon self-intersection validation
      - When user draws a pasture polygon, validate that no edges cross each other
      - Detect duplicate/overlapping area with existing pastures on the same farm
      - Show real-time visual warning (red highlight) if invalid before allowing save
      - Consider using Turf.js `kinks()` for self-intersection detection

- [ ] **Q2** Double-click pasture to navigate
      - Double-clicking a pasture polygon on the map opens its detail panel
      - Currently single-click selects; double-click should open full parcel view
      - Consider long-press equivalent for mobile

- [ ] **Q3** Herd appears in lot/pasture path (bidirectional link)
      - When a herd is defined and assigned to a pasture, it should appear in:
        (a) the Lotes Comerciales list — so a commercial lot can reference the herd
        (b) the herd's movement history / trazabilidad timeline
      - Add optional `lote_id` FK on `herds` table so a herd can be tied to a lote
      - When a lote is opened, show the linked herd with current pasture and head count

---

_Last updated: 2026-06-09 — Added Phases P (Auth), Q (Map & UX Polish) from manual QA.
Also fixed: RLS recursion, login loop, ERP nav, FarmDataProvider layouts, currencies._
