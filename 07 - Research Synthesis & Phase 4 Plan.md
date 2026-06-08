# GeoCampo — Research Synthesis & Next Phase Plan

**Date:** June 2026  
**Sources:** Master documents 01–06 (Business Strategy, Product & Operations, Design System, Technical Architecture, Development Framework, Innovation Roadmap) + AGENTS.md, test suite  
**Research question:** What should Phase 4 build, and in what order?  
**Confidence:** High — all sources are first-party strategy documents corroborated by the codebase state.

---

## Research Overview

Four completed phases have produced a solid technical scaffold: an Expo monorepo with offline-first PowerSync sync, a PostGIS/Supabase backend, a Mapbox MapCanvas with drag-and-drop herd movements, Turf.js GIS validation, and 97 passing tests. The infrastructure is genuinely strong.

The problem is that almost none of the user-facing operational features declared in the Product Master (Doc 02) have been built. The gap between the technical foundation and a working product is large.

---

## Key Findings

### Finding 1 — The product is a scaffold, not an MVP

**Statement:** The app lets users move herds on a map, but delivers no daily operational value to a rancher.

**Evidence:** The PRD (Doc 02) lists four core features: drag-and-drop movements ✅, weight recording ❌, critical load alerts ❌, offline-first mode ✅. The `weights` and `health` tables exist in the schema and are validated by 24 schema tests, but no UI or service layer has been built for them. A user can drag a herd to a new pasture but cannot record a weight, check a vaccination schedule, or be warned that a pasture is overstocked.

**Frequency:** Every master document (02, 04, 06) references operational features that depend on this data existing. The gap appears across all sources.

**Impact:** Critical. Without weight recording and health management, the app has no retention value in the field. Ranchers will abandon it after the novelty of the map wears off.

**Confidence:** High.

---

### Finding 2 — Regulatory compliance is the strategic moat, and it hasn't been touched

**Statement:** The differentiation against AgriWebb and JetBov is SITRAP/SIGOR compliance. This is completely unstarted.

**Evidence:** Doc 01 explicitly names regulatory compliance with SITRAP/SIGOR as the primary competitive differentiator from the two main competitors. No file in the codebase references SITRAP or SIGOR. The movement audit trail (the `movements` table) exists at the database level but has no export or certification layer.

**Frequency:** Mentioned in the business strategy document as the core strategic argument. Repeated in the monetization model (traceability certification for export).

**Impact:** Critical for strategy. If GeoCampo ships without SITRAP/SIGOR and AgriWebb adds compliance coverage first, the differentiator disappears. This is the highest strategic risk in the roadmap.

**Confidence:** High.

---

### Finding 3 — The monetization model is not yet unlockable

**Statement:** Both revenue streams (SaaS per head of cattle + traceability certification) require features that don't exist yet.

**Evidence:** The SaaS model (Doc 01) charges per head of cattle, which requires a reliable cattle census — counting animals by category, age, and provenance. Doc 02 names stock management (categories, ages, provenance) as a core operational feature. The traceability certification stream requires the health and movement audit trail to be formatted and exportable for regulatory bodies. Neither the stock management UI nor the certification export exists.

**Frequency:** Both revenue streams are documented in Doc 01. The enabling features are in Doc 02.

**Impact:** High. The business can't charge for the product until these exist. Phase 4 is a prerequisite for commercial viability.

**Confidence:** High.

---

### Finding 4 — Phase 3 optimized before the product existed

**Statement:** The quality-and-optimization phase (memory audits, LWW conflict resolution) improved a product that is not yet usable. This created a polished shell with no operational substance.

**Evidence:** Phase 3 produced MapCanvas memory optimization (useMemo/React.memo) and Last Write Wins sync conflict resolution. These are the right concerns — but for a product that ranchers use daily. Right now, the sync conflict resolution governs herd movement data, but there's no weight data, health data, or alert state to conflict-resolve. The optimization work is not wasted, but it got ahead of content.

**Impact:** Medium. The Phase 3 work will be valuable once Phase 4 fills in the operational features. No rework is needed — it just sets the ordering expectation: Phase 4 must fill the product before Phase 5 considers further optimization or innovation.

**Confidence:** High.

---

### Finding 5 — The innovation roadmap is sequenced backward relative to data dependencies

**Statement:** Priorities A and B in the innovation roadmap (GeoCampo AI and computer vision weight estimation) require rich operational data that doesn't exist yet.

**Evidence:** Doc 06 Priority A — "chat with your farm data" — requires that farm data exists: weights, health records, movement history, production analytics. Priority B — weight estimation via camera — requires baseline weight records to validate and calibrate the ML model. If these are built before the data layer is populated by real use, they will have nothing to work with.

**Priority C** (virtual fences / GPS collars) and **Priority D** (blockchain traceability) are less dependent on prior data and could be scheduled without the same sequencing constraint.

**Impact:** Medium-high. Building AI on an empty database produces demos, not value. Delays Priority A/B delivery until operational data is real.

**Confidence:** High.

---

### Finding 6 — Satellite imagery is configured but unused

**Statement:** Sentinel Hub is listed as configured infrastructure (Doc 04) but has no implementation in any phase.

**Evidence:** Doc 04 Infrastructure section lists Sentinel Hub alongside Mapbox and Sentry. Mapbox is implemented (Phase 2). Sentry is a monitoring service. Sentinel Hub provides satellite imagery — the most natural use case is pasture health visualization (NDVI indexes to detect pasture degradation), which directly addresses the core problem statement from Doc 01 ("pasture degradation in areas without signal").

**Impact:** Medium. Satellite-derived pasture health is a strong differentiator and directly serves the stated problem. It's also infrastructure already paid for.

**Confidence:** Medium (inferred from configuration; no explicit implementation plan found in documents).

---

## User Segment Analysis

The documents describe one primary user — the **field rancher** operating in low/no-connectivity conditions — and one secondary stakeholder:

**Field rancher** (primary): Uses the app on mobile in the field. Needs large touch targets, dark mode for sun, haptic feedback, and offline reliability. Core jobs: record weights, track herd locations, manage health/vaccination, get load alerts before overstocking a pasture. Currently cannot do any of this except move herds on a map.

**Export compliance officer** (secondary, B2B): Needs certified, formatted reports of animal movements, health treatments, and provenance for SITRAP/SIGOR filing or export certification. This person is the buyer in the traceability revenue stream.

---

## Opportunity Areas

Ranked by impact × feasibility:

**1. Weight and production analytics** — Weight recording UI + ADG (Average Daily Gain) calculation. Directly serves the field rancher and enables the per-head SaaS billing model. The schema, tests, and sync infrastructure are already in place. This is the easiest, highest-impact feature to build.

**2. Health and vaccination management** — Vaccination calendar, treatment recording per lot. The `health` table exists. This closes the "daily value" gap and enables vet audit trails.

**3. Critical load alerts** — Alert when a pasture's stocking density exceeds safe limits based on EV (Cow Equivalents) and Materia Seca (Dry Matter) calculations. The domain vocabulary is defined in Doc 02. This is the feature that prevents economic damage (overgrazing) and is a unique operational value proposition.

**4. SITRAP/SIGOR compliance export** — Format the existing movement and health audit trail into the regulatory report formats. This is the strategic moat and unlocks the traceability certification revenue stream.

**5. Pasture health visualization (Sentinel Hub NDVI)** — Overlay satellite vegetation index on the map. Turns the map from a herd tracker into a pasture management tool, directly addressing the core problem (degradation detection in offline zones via cached satellite data).

---

## Recommendations for Phase 4

### Scope

Phase 4 should be called **"Operational MVP"** — the set of features that makes GeoCampo genuinely useful to a field rancher on a daily basis.

**Phase 4 — Recommended build order:**

1. **Weight recording and ADG dashboard** — Form to record weight per herd lot, calculated ADG, comparison trend chart. Unlocks the billing model and gives ranchers immediate daily value.

2. **Health and vaccination calendar** — Treatment logging per lot, vaccination schedule with due-date alerts. Completes the cattle asset management trifecta (location + weight + health).

3. **Critical load alerts** — Real-time alert when herd EV exceeds pasture capacity. Requires EV and Dry Matter data entry per pasture (stocking rate configuration). This is the "save money today" feature for ranchers.

4. **Stock management module** — Cattle inventory by category (breeding cow, heifer, bull, steer), age class, and provenance. Required for accurate per-head billing and for SITRAP/SIGOR provenance fields.

### What Phase 4 is NOT

- GeoCampo AI (Priority A) — wait until data exists.
- Camera weight estimation (Priority B) — wait until weight baselines exist.
- Blockchain (Priority D) — wait for compliance export first.
- Virtual fences (Priority C) — can be explored in parallel as a separate track, but not Phase 4 core.

---

## Phase 5 Preview (Post-Operational MVP)

Once Phase 4 data is flowing from real use:

- **SITRAP/SIGOR compliance export** — the strategic moat.
- **Sentinel Hub pasture health overlay** — the map becomes a pasture degradation tool.
- **GeoCampo AI** — "chat" with real weight, health, and movement data.

---

## Open Questions

- **SITRAP/SIGOR format specs** — The regulatory format for Uruguay/Argentina (the likely target market) needs to be sourced. Are these publicly documented APIs or PDF report formats?
- **EV and Dry Matter inputs** — Critical load alerts require pasture capacity data. What is the UX for entering this? Does GeoCampo define it, or does it import from a regional standard?
- **Monetization inflection point** — At what cattle-head count does the SaaS model become compelling vs. spreadsheets? A pricing model doc would help sequence the billing feature.
- **GPS collar vendor status** — Priority C lists Shenzhen Eelink and ReachFar. Have these been evaluated or sampled? This determines whether virtual fences can be a near-term track or are contingent on hardware procurement.
- **Sentinel Hub access** — Is the subscription active? What satellite cadence and resolution is available for the target geography?

---

## Summary Priority Matrix

| Opportunity | Users affected | Frequency | Severity | Strategic value | Recommended phase |
|---|---|---|---|---|---|
| Weight recording + ADG | All field ranchers | Daily | Blocker | Unlocks billing | Phase 4 |
| Health / vaccination | All field ranchers | Weekly | High | Retention + vet audit | Phase 4 |
| Critical load alerts | All field ranchers | Per movement | High | Core value prop | Phase 4 |
| Stock management | All + compliance | Weekly | High | Enables billing model | Phase 4 |
| SITRAP/SIGOR export | Export compliance | Monthly | High | Strategic moat | Phase 5 |
| Sentinel Hub NDVI | All field ranchers | Weekly | Medium | Differentiator | Phase 5 |
| GeoCampo AI | All ranchers | Daily | Medium | Innovation | Phase 5+ |
| Camera weight estimation | Field ranchers | Weekly | Medium | Innovation | Phase 5+ |
| Virtual fences | Tech-forward ranchers | Continuous | High | New capability | Phase 5+ |
| Blockchain traceability | Export / premium | Per shipment | Low-medium | Revenue upsell | Phase 6 |
