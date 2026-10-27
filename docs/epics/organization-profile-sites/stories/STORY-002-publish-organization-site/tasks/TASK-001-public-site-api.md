---
title: "Expose privacy-safe organization site data"
work_id: "EPIC-organization-profile-sites/STORY-002/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-organization-profile-sites/STORY-002"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Expose privacy-safe organization site data

Parent User Story: [EPIC-organization-profile-sites/STORY-002](../index.md)

## Overview and acceptance coverage

Provide public organization site data by slug with only public branding and visible experiences.

## Requirements and current state

Use existing Express route/controller and Sequelize associations. Include published upcoming experiences only; omit past/unpublished and flag sold-out. Exclude memberships, reservations, user and private fields. Unknown/reserved slug is not-found; explicitly project public fields.

## Implementation steps

1. Inspect Experience publish/status/date/availability fields and organization association; implement public slug endpoint with safe field projection and visibility filtering.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| backend/server/routes/** and backend/server/controllers/** | Add public site read route/controller. | No private member/reservation fields; writes use organization admin middleware. |

## Dependencies

Depends on STORY-001/TASK-001 branding schema.

## Testing

- Unit: Jest: slug, reserved names, visibility, sold-out state and response projection.
- Integration: API integration test asserts public fields only and excludes private records.
- Manual/UX: Test populated, empty, past-only and reserved slug cases on isolated data.
- Regression coverage: Existing public experience APIs retain behavior.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Documented the public response projection in `backend/server/utils/organization-site-response.js`; it contains organization branding and visible experience cards only.

## Progress and completion evidence

Completed. Jest verified the read query selects only public organization/experience fields and includes scheduled future sessions only; response projection excludes membership, reservation, email and username data. 36 targeted backend tests passed.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-organization-profile-sites/STORY-002/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
