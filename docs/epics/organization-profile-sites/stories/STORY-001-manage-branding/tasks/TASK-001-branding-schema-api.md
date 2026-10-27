---
title: "Add validated branding fields and admin API"
work_id: "EPIC-organization-profile-sites/STORY-001/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-organization-profile-sites/STORY-001"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Add validated branding fields and admin API

Parent User Story: [EPIC-organization-profile-sites/STORY-001](../index.md)

## Overview and acceptance coverage

Add organization branding fields and an admin-only read/update API.

## Requirements and current state

Organization.model.js currently defines name, organizationUsername and email. organization-auth.js already exposes requireOrganizationAdmin using OrganizationMembers.isAdmin. There is no live data: fold branding into the existing initial organization migrations instead of adding a new migration. Keep the migration schema and Organization.model.js aligned. Add DNS-safe unique lowercase slug derived from organizationUsername; reject reserved names/collisions. Validate hex colors, fixed font/template allow-lists, HTTPS links/emails. Use existing media upload pipeline; never accept markup.

## Implementation steps

1. Keep branding columns, the non-null slug and unique slug index in `20260417130000-add-organization-username.js`, which already finalizes the Organizations schema after the baseline. Its rollback removes those fields and indexes.
2. Keep the Organization model compatible with `sequelize.sync`; reuse fixed font/template validation allow-lists.
3. Populate startup/demo organization seed rows with valid slugs, representative branding and JSON-serialized social/contact links; leave unseeded logo/cover media null.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| backend/server/models/Organization.model.js | Define slug and constrained branding attributes. | Match the initial migration schema and shared allow-lists. |
| backend/server/migrations/20260417130000-add-organization-username.js | Define branding columns and unique slug index alongside organizationUsername. | Existing migration only; no new migration file. |
| backend/server/seeders/20260212222654-startup-org-and-admin.js | Brand `/o/martinllc`. | Null logo/cover; valid JSON links. |
| backend/server/seeders/20260214193720-demo-experiences.js | Brand `/o/testcompany1`, `/o/testcompany2`, `/o/testcompany3` with three templates. | Do not execute against the shared database. |

## Dependencies

Foundation for editor and public site; no external dependency.

## Testing

- Unit: Jest: slug normalization, reserved names, collisions, colors, font/template allow-lists, HTTPS and email validation.
- Integration: Jest API tests: admin write succeeds; non-admin/non-member writes are 403; response excludes private fields.
- Manual/UX: Migration only on isolated test DB; do not touch shared Docker DB.
- Regression coverage: Existing organization creation and organizer routes remain compatible.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Branding is folded into the existing `20260417130000-add-organization-username.js`; the separate branding migration was deleted. `DEPLOYMENT.md` lists seeded demo URLs and defers Cloudflare setup until production launch.

## Progress and completion evidence

Completed. Follow-up verification: backend full Jest suite passed (28 suites, 303 tests), including mocked initial migration/schema parity, rollback and organization seed validation. Both seeders provide valid slugs/colors/fonts/taglines/about/links/templates. Mocked tests execute no database operations; no migrations or seeders were run against the shared dev database.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-organization-profile-sites/STORY-001/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
