# GeoCampo — Feature Backlog

This file tracks every feature to implement, organized by phase.
Each phase is TDD-first: tests written before implementation, committed after all tests green.

---

## Phase A — Data entry from the dashboard

- [x] **A1** `addWeightRecord()` store function + 6 unit tests
- [x] **A1** `WeightEntryModal` component + 9 component tests
- [x] **A1** "Registrar pesaje" button wired in `ParcelDetailPanel`
- [x] **A1** `FarmDataContext.refresh()` — re-reads localStorage after any mutation
- [x] **A2** `addHealthRecord()` — log vaccination / deworming / checkup from the dashboard
      - Form: date, treatmentType, productName, dosage, administeredBy, nextDueDate, notes
      - Clears the health alert once recorded
      - Same TDD pattern: store fn → component → wire button
- [x] **A3** `moveHerd()` — move a herd from one pasture to another
      - Form: select destination pasture, movement date, notes
      - Updates `herd.pastureId` + `herd.entryDate`, appends to `movements[]`
      - Resets days-in-pasture counter

---

## Phase B — Edit / add pastures from the dashboard

- [x] **B1** "Agregar potrero" button on the dashboard map (floating "+" button)
      - Click "+" → drawing mode (crosshair cursor, click-to-place vertices, dashed preview)
      - ≥3 points → "Finalizar potrero" → `PastureFormModal` (name, capacity, grassType, waterSupply, notes)
      - `addPasture()` with 9 unit tests (TDD) — area auto-calculated from drawn polygon
      - `refresh()` called → new pasture instantly visible on map and in sidebar
- [ ] **B2** "Editar potrero" in `ParcelDetailPanel`
      - Edit polygon shape (redraw), grass type, water supply, carrying capacity, notes
      - Updates existing pasture via `updatePasture()`
- [ ] **B3** "Eliminar potrero" (with confirmation) via `removePasture()`

---

## Phase C — Mobile app parity (Expo)

- [ ] **C1** Wire weight entry into the mobile Herds screen
      - Same `addWeightRecord()` from `packages/shared` or direct localStorage
- [ ] **C2** Wire health record entry into mobile Health screen
- [ ] **C3** Move herd from mobile Map screen
- [ ] **C4** Add/edit pastures from mobile Map screen

---

## Phase D — Supabase backend

- [ ] **D1** Supabase schema migration (already drafted in `supabase/schema.sql`)
- [ ] **D2** Replace `localStorage` reads/writes with Supabase queries behind a feature flag
      - `IS_DEMO_MODE` already detected — flip to Supabase when env vars are real
- [ ] **D3** Real-time sync — subscribe to farm changes across devices
- [ ] **D4** Multi-user / invites — share farm with a vet, employee, or partner

---

## Phase E — Reporting & export

- [ ] **E1** Weight gain chart — plot ADG over time per herd (recharts or Chart.js)
- [ ] **E2** Stocking history — chart of heads per pasture over the year
- [ ] **E3** PDF export of a farm summary (pastures, herds, recent weights, health)
- [ ] **E4** CSV export of weight records

---

## Phase F — UX improvements (no regressions to existing UI)

- [ ] **F1** Onboarding — first-time empty state on the dashboard with "Configurar mi campo" CTA
- [ ] **F2** Dark-mode time picker improvement on mobile Safari
- [ ] **F3** Keyboard navigation / accessibility audit (WCAG 2.1 AA)
- [ ] **F4** Offline indicator — banner when user is offline (relevant for field use)

---

## Phase G — Individual cattle tracking (DIOB / SENACSA chip)

Paraguay Law 7221/2023 + SENACSA Resolution 2103/2024 mandate a DIOB (Dispositivo Individual
Oficial Bovino) per animal for "Carimbo 5" cattle destined for export or slaughter.

**DIOB spec:**
- Left ear: ISO 11784/11785 FDX-B microchip, 134.2 kHz — readable with standard RFID readers
- Right ear: Visual tag (printed ID number)
- Managed through the SINIP system (Sistema Nacional de Identificación y Productividad)

**Features to implement:**
- [ ] **G1** `Cattle` entity — individual animal within a herd (chip ID, visual tag, sex, breed, DOB)
      - Schema: `id`, `herdId`, `chipId` (EID/ISO), `visualTagId`, `sex`, `breed`, `dob`, `status`
      - `StoredFarm.cattle[]` array; Supabase table `cattle`
- [ ] **G2** Chip scan entry — manual entry or QR/RFID reader input (mobile)
- [ ] **G3** Weight records linked to individual animal (`cattleId`) not just herd
- [ ] **G4** Health records linked to individual animal
- [ ] **G5** SINIP export — generate compliant CSV/XML report for SENACSA submission
- [ ] **G6** Trazabilidad timeline per animal — full lifecycle history

---

## Discovered during development (add here, don't forget)

- [ ] Demo mode: "Registrar pesaje" button hidden because `isCustomFarm = false` —
      consider showing it with a "Try in demo mode" affordance that pre-fills sample data
- [ ] `weighedBy` field defaults to "Usuario" — should default to the logged-in user's name
      once Supabase auth is wired (Phase D)
- [ ] Health records: `upcomingHealth` filter was too narrow (excluded records without `nextDueDate`);
      fixed in Phase A bug-fix pass — now shows full history + separate alerts strip
- [ ] `addPasture()` colors cycle through `PASTURE_COLORS[]` — if farm has >7 pastures,
      colors repeat; consider deriving from hue rotation or letting user pick in `PastureFormModal`

---

- [ ] Movement history: `fromPastureId`/`toPastureId` added to `Movement` interface — old records
      without these fields fall back to name-based matching (backward compatible)
- [ ] `addHerd()` and `addPasture()` don't validate for duplicate names — could add a check later

---

_Last updated: 2026-06-08 — Phase A (38 tests) + B1 (9 tests) + addHerd (10 tests) complete; Bug fixes: health history, movement history in both pastures, species field on herds_
