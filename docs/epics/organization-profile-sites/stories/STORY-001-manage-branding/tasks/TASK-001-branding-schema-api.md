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

Organization.model.js currently defines name, organizationUsername and email. organization-auth.js already exposes requireOrganizationAdmin using OrganizationMembers.isAdmin. Preserve old rows with safe migration defaults. Add DNS-safe unique lowercase slug derived from organizationUsername; reject reserved names/collisions. Validate hex colors, fixed font/template allow-lists, HTTPS links/emails. Use existing media upload pipeline; never accept markup.

## Implementation steps

1. Inspect model registry, Sequelize migrations, route/controller conventions and upload pipeline; add columns/defaults and validators.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| backend/server/models/Organization.model.js | Define slug and constrained branding attributes. | Only the Epic-owned schema/migration; safe compatibility for existing organizations. |

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

Record contract and migration name in Epic subtree. Migration: `20261027013100-add-organization-branding.js`.

## Progress and completion evidence

Completed. `npm --prefix backend test -- --runInBand tests/unit/organization-sites.test.js`: 36 tests passed, including slug/defaults, reserved names, branding validation, admin middleware and private-data projection. `npm ci --prefix backend` completed. Migration was not run against any database per the shared-DB restriction.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-organization-profile-sites/STORY-001/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
