---
title: "Add media pipeline adapter and stub verification"
work_id: "EPIC-correlated-seed-factory/STORY-002/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-correlated-seed-factory/STORY-002"
branch: "epic/correlated-seed-factory"
depends_on: []
---

# Add media pipeline adapter and stub verification

Parent User Story: [EPIC-correlated-seed-factory/STORY-002](../index.md)

## Overview and acceptance coverage

Provide a replaceable upload adapter that calls the real authenticated media route, plus an attach step which persists the returned object key in an existing Experience row. Cover the media acceptance criterion without starting R2 or using a real database.

## Requirements and current state

`backend/server/routes/media.js` exposes `PUT /api/media/upload`, with auth middleware and image-only raw payload limits; `Media.controller.js` forwards bytes to `R2_WORKER_BASE_URL`, normally `r2-local`, and returns `objectKey`, URL, MIME type and size. There is no standalone Media model/table. Experience `images` is JSON and is the existing persistence location for uploaded media references. Restrict spike upload to supported image assets; MP4 is not currently accepted.

## Implementation steps

1. Add an HTTP uploader factory that accepts base URL, access token and injectable `fetch` implementation.
2. Add a separate attach helper that appends the returned object key as a string to a persisted Experience instance's `images` JSON attribute.
3. Unit test HTTP route URL/auth headers and durable-model update behavior with stubs.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `backend/server/seed-factory/media.js` | Injectable API uploader and Experience media attach helper | Calls existing `/api/media/upload`; must not bypass media route or R2 worker. |
| `backend/tests/seed-factory/seed-factory.test.js` | Stub upload and persisted Experience update | No real token, network or DB. |
| `docs/reference/contracts/seed-factory.md` | Document model limitation and follow-on video requirement | Do not imply a dedicated Media table exists. |

## Dependencies

Uses existing media route and `Experience.images` JSON field; does not add schema or modify routes/controller/worker.

## Testing

- Unit: Stubbed fetch returns route response and verifies cookie auth, supported content type, object key and `experience.update({images})`.
- Integration: Real Express/R2 route not run.
- Manual/UX: Confirm stored object-key strings match the existing `Experience.images` format.
- Regression coverage: Existing frontend upload contract and media API are not modified.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Documented the absence of a Media model and the separate follow-up required for the hero-video seed.

## Progress and completion evidence

Done. Focused test suite passes all 5 tests, including media URL/auth and JSON persistence using stubs.

## Child work items

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-correlated-seed-factory/STORY-002/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
