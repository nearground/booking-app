# Offerings Unification Migration Plan

## Goal
Unify parallel `Experiences` and `Services` feature stacks into one extensible `Offerings` platform, while keeping production risk low and preserving current URLs/APIs during migration.

## Guiding Principles
- Keep public routes and payload contracts stable until compatibility shims are in place.
- Migrate in thin vertical slices (backend shared logic first, then frontend shared flows, then schema).
- Prefer adapter/config driven differences over duplicated files.
- Keep rollback simple at each phase.

## Phase 0 — Discovery & Guardrails (Complete)
- Inventory duplicated backend controllers/routes and frontend creation/listing pages.
- Define migration direction: shared offering platform with type adapters.

## Phase 1 — Application Layer Unification (In Progress)
### Objective
Reduce maintenance duplication without changing database schema yet.

### Backend scope
- Introduce shared manage-flow utilities for common create/update validation.
- Extract common organizer assignment logic into a reusable handler factory.
- Extract common managed schedule sync logic into a reusable handler factory.
- Keep type-specific behavior in controllers:
  - `Experience`: ticket tiers, questionnaire, comment/city/nearby endpoints.
  - `Service`: current service-specific reservation schedule behaviors.

### Frontend scope (next slice after backend refactor)
- Prepare reusable offering create/list primitives.
- Preserve `/create-experience` and `/create-service` routes as wrappers.

### Exit criteria
- New shared utilities are used by both Experience and Service manage controllers.
- No API path changes required by existing clients.

## Phase 2 — Unified API Surface
### Objective
Introduce normalized offering endpoints while preserving compatibility.

### Scope
- Add `/api/offerings` endpoints with `type` capability config.
- Keep `/api/experiences` and `/api/services` as compatibility facades.
- Add contract tests for both old and new endpoints.

### Exit criteria
- New feature development can target only offering endpoints.

## Phase 3 — Unified Frontend Flows
### Objective
Consolidate creation/discovery/detail UIs into configurable offering screens.

### Scope
- Replace duplicated pages with `CreateOffering`, `OfferingsList`, `OfferingDetails`.
- Route wrappers continue to preserve existing URLs.

### Exit criteria
- Shared UI flow used by both types, with type capability flags.

## Phase 4 — Persistence Unification
### Objective
Consolidate storage into shared offering tables.

### Scope
- Migrate from parallel tables (`Experiences`, `Services`, etc.) to shared offering schema.
- Backfill and dual-write period with data validation.
- Remove legacy tables after verification window.

### Exit criteria
- Single persistence model supports all current and future offering types.

## Phase 5 — Cleanup & Future Type Onboarding
### Objective
Harden plugin model and remove legacy compatibility code.

### Scope
- Remove no-longer-used facades.
- Add onboarding docs for adding new offering type adapters.
- Add observability dashboards by offering type.

## Current Execution Slice
This change set starts **Phase 1 backend unification** by extracting shared manage-flow logic and wiring both Experience and Service manage controllers to it.