# Schedule Widget Parallel Development Plan

## Goal

Build a single schedule widget that can aggregate and render timeblocks from arbitrary sources (initially Experiences and Services, then external providers like Outlook) while enabling multiple teams to develop in parallel with minimal coupling.

## Non-Goals (Initial Iteration)

- No full migration of all legacy Experience endpoints before widget delivery.
- No forced schema unification day-one.
- No provider-specific UI behavior in the core widget.

## Success Criteria

- Widget renders normalized timeblocks from at least 2 internal sources (`experience`, `service`) plus 1 external source (`outlook`) behind feature flags.
- Adding a new source requires implementing an adapter contract only (no changes to widget core).
- Query latency for merged schedule remains within acceptable UX budget (target: <= 500ms p95 for one-week window, excluding cold external token refresh).
- Conflict markers and source provenance are visible per timeblock.
- Contract tests exist for adapter compliance.

---

## Why this can be done in parallel now

Current code already has reusable pieces:

- Experience scheduling data model and APIs
  - `ScheduledExperiences`, reservations, capacity logic
- Existing organizer workspace context where schedule-like summaries are already consumed in frontend
- Frontend has calendar/session rendering patterns that can be generalized without waiting for full backend rewrite

The main blocker for parallelization is **lack of a shared source contract**. This plan fixes that first.

---

## Architectural Direction

### 1) Canonical `Timeblock` contract (shared language)

Define one normalized domain object used by widget and aggregation APIs.

```ts
type TimeblockSourceType = 'experience' | 'service' | 'outlook' | 'google' | 'manual';

type TimeblockStatus =
  | 'available'
  | 'booked'
  | 'busy'
  | 'blocked'
  | 'tentative'
  | 'cancelled';

interface NormalizedTimeblock {
  id: string;
  sourceType: TimeblockSourceType;
  sourceId: string;
  organizerId?: string;
  organizationId?: string;

  startsAtUtc: string;
  endsAtUtc: string;
  timezone: string;

  title: string;
  subtitle?: string;
  status: TimeblockStatus;
  capacity?: number;
  availableSpots?: number;

  bookable: boolean;
  conflict: boolean;
  metadata?: Record<string, unknown>;
}
```

### 2) Source Adapter interface (parallel team boundary)

Each source team owns one adapter implementing this contract.

```ts
interface TimeblockSourceAdapter {
  sourceType: string;

  listTimeblocks(params: {
    organizerId?: string;
    organizationId?: string;
    rangeStartUtc: string;
    rangeEndUtc: string;
    timezone: string;
  }): Promise<NormalizedTimeblock[]>;

  getCapabilities(): {
    supportsWrite: boolean;
    supportsRealtimeSync: boolean;
    supportsAvailability: boolean;
  };
}
```

### 3) Aggregation service (single merge point)

- Input: query window + filters.
- Calls enabled adapters in parallel.
- Normalizes and merges results.
- Computes conflict flags and optional dedupe.
- Returns a stable response sorted by time.

### 4) Widget stays source-agnostic

- Widget accepts `NormalizedTimeblock[]` only.
- No adapter/source-specific branching in UI core.
- Provider-specific actions appear through extension points (e.g., action renderer map by `sourceType`).

---

## Prioritized Actionables (for immediate execution)

## Priority 0 (Week 1): Unblock Parallel Teams

1. **Publish canonical contracts**
   - Deliver: `NormalizedTimeblock` schema + adapter interface + response envelope schema.
   - Owner: platform/architecture.

2. **Add aggregation API shell**
   - New endpoint (example): `GET /api/schedule/timeblocks`
   - Supports filters: `organizerId`, `organizationId`, `rangeStart`, `rangeEnd`, `timezone`, `sources[]`.
   - Returns merged list + metadata (`partialSources`, `errorsBySource`).

3. **Build Experience adapter (read-only first)**
   - Map `ScheduledExperiences` into normalized blocks.
   - Reuse existing timezone and schedule query logic.
   - Do not block on reservation model refactor.

4. **Scaffold Service adapter with mock provider**
   - Implement adapter shape with fixture data first.
   - Enables frontend progress before full service backend exists.

5. **Create widget package/component contract**
   - Input props and event handlers fixed (`onSelectBlock`, `onRangeChange`).
   - Team starts UI implementation immediately against mock + experience data.

## Priority 1 (Week 2-3): Functional Vertical Slice

1. **Service backend MVP (bookable slots)**
   - Basic Service entity + slot table + organizer assignment.
   - Service adapter wired to real data.

2. **Outlook adapter MVP (read busy blocks)**
   - OAuth token model + minimal sync/read endpoint.
   - Start with busy/free only; no write-back.

3. **Conflict engine v1**
   - Mark overlap per organizer across all sources.
   - First rule: overlap if `max(startA,startB) < min(endA,endB)`.

4. **Caching + timeout policy**
   - Per-source timeout and stale cache fallback.
   - Aggregator returns partial results if one source fails.

## Priority 2 (Week 4+): Scale + Hardening

1. **Incremental sync jobs for external sources**
2. **Webhook ingestion (Outlook/Graph subscriptions)**
3. **Write actions by capability (create block, block off time)**
4. **SLA metrics and error budget per source**

---

## Parallel Workstream Split

## Track A - Contracts & Aggregator Core

- Define schemas and validation.
- Build adapter registry and orchestrator.
- Add source-level telemetry and circuit breaker.

## Track B - Experience Adapter

- Map existing Experience schedule payloads to normalized blocks.
- Preserve source IDs for drill-down (`experienceId`, `scheduledExperienceId`).
- Add contract tests.

## Track C - Service Domain + Adapter

- Create `Service` + `ServiceTimeblock` model (or equivalent).
- Implement read adapter first, then booking semantics.

## Track D - External Integrations (Outlook)

- OAuth/connect flow.
- Busy-time fetch and normalization.
- Token refresh and failure handling.

## Track E - Schedule Widget UI

- Build source-agnostic calendar/list views.
- Render conflict state and source badges.
- Implement loading/partial/error states per source.

## Track F - QA/Observability

- Contract tests for adapters.
- Integration tests for aggregator partial failures.
- Dashboards: latency, source failure rate, stale data age.

---

## API Contract Proposal

### Request

`GET /api/schedule/timeblocks?organizerId=123&rangeStart=2026-03-01T00:00:00Z&rangeEnd=2026-03-08T00:00:00Z&timezone=America/Mexico_City&sources=experience,service,outlook`

### Response

```json
{
  "errors": [],
  "data": {
    "elements": [],
    "metadata": {
      "rangeStartUtc": "2026-03-01T00:00:00.000Z",
      "rangeEndUtc": "2026-03-08T00:00:00.000Z",
      "timezone": "America/Mexico_City",
      "sourcesRequested": ["experience", "service", "outlook"],
      "sourcesReturned": ["experience", "service"],
      "partialSources": ["outlook"],
      "errorsBySource": {
        "outlook": "timeout"
      }
    }
  }
}
```

---

## Data Model Guidance for Services (minimum to integrate widget)

For rapid integration, model only what the widget needs first:

- `Services`
  - `id`, `title`, `duration`, `OrganizationId`, `LocationId`, `status`
- `ScheduledServices` (or `ServiceTimeblocks`)
  - `id`, `ServiceId`, `OrganizerId`, `dateTime`, `endDateTime`, `capacity`, `availableSpots`, `status`

Keep naming close to existing Experience concepts to reduce mapping complexity.

---

## Risk Register (specific to multi-source schedule)

1. **Tight coupling to existing Experience naming**
   - Mitigation: normalize at adapter boundary, not in widget.

2. **External source latency causing poor UX**
   - Mitigation: timeout + partial results + async refresh indicator.

3. **Timezone drift across sources**
   - Mitigation: enforce UTC storage + explicit timezone in query and response.

4. **Conflict false positives**
   - Mitigation: single overlap rule in v1, improve with source confidence metadata later.

5. **Auth scope mismatch for external calendars**
   - Mitigation: per-organizer connection status and capability flags.

---

## Testing Strategy

1. **Adapter contract test suite**
   - Any adapter must pass standard cases: mapping, timezone, empty range, failure mode.

2. **Aggregator integration tests**
   - Full success, partial source failure, timeout behavior, sort determinism, conflict tagging.

3. **Widget tests**
   - Source badge rendering, conflict rendering, empty/loading/partial states.

4. **E2E scenarios**
   - Experience-only, Experience+Service overlap, Experience+Outlook busy overlap.

---

## Rollout Plan

1. Feature flag `schedule_widget_v2` behind organizer profile only.
2. Release with Experience adapter + mock Service adapter.
3. Swap mock Service with real adapter.
4. Enable Outlook source for pilot organizers.
5. Expand to wider audience after latency/error SLOs are green.

---

## Definition of Done for “Parallel-Ready Platform”

- Canonical `Timeblock` schema is published and versioned.
- Adapter registry supports adding a source without widget code changes.
- At least 3 adapters wired (`experience`, `service`, `outlook` stub or real).
- Aggregator supports partial results and source-level errors.
- Widget renders merged data and source/conflict indicators.
- Documentation includes onboarding steps for new source adapters.

---

## Immediate Next 10 Tasks (ordered)

1. Create `schedule-domain` schema module in backend.
2. Implement `GET /api/schedule/timeblocks` with adapter registry.
3. Build Experience adapter and contract tests.
4. Add Service adapter mock implementation.
5. Create frontend `ScheduleWidget` component accepting normalized blocks.
6. Wire Organizer Profile to consume new schedule endpoint under flag.
7. Add source badges + conflict indicator UI.
8. Add source timeout + partial response metadata handling.
9. Add Outlook connector placeholder + connection status API.
10. Publish “How to add a new schedule source” developer doc.
