---
title: "Assert responsive route controls and overflow in Cypress"
work_id: "EPIC-responsive-ux/STORY-003/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-responsive-ux/STORY-003"
branch: "epic/responsive-ux"
depends_on: []
---

# Assert responsive route controls and overflow in Cypress

Parent User Story: [EPIC-responsive-ux/STORY-003](../index.md)

## Overview and acceptance coverage

Add automated, non-mutating viewport checks across key customer routes; covers Epic automated visual/layout acceptance.

## Requirements and current state

Cypress e2e config is frontend/cypress.config.js with baseUrl localhost:3000. Existing tests and fixtures live under frontend/cypress/e2e and frontend/cypress/fixtures. New spec belongs under frontend/cypress/e2e/responsive/. Matrix coverage must check document scroll width against client width and visible primary route controls.

## Implementation steps

1. Add a route/viewport Cypress spec that loops documented dimensions, visits key routes without submitting forms, and asserts no document-level horizontal overflow and visible key controls when page state permits.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/cypress/e2e/responsive/responsive-viewport.cy.js | Add Cypress e2e matrix assertions and route-specific selectors. | Do not edit protected comments or experience-details source logic. Use stable accessible labels/test IDs; avoid changing route state. |

## Dependencies

STORY-003/TASK-001 matrix definitions.

## Testing

- Unit: N/A for e2e spec.
- Integration: Run via npx cypress run --e2e --spec cypress/e2e/responsive/responsive-viewport.cy.js against worktree server or shared main only as labeled baseline.
- Manual/UX: Open key routes on at least one real phone; emulate landscape and safe areas.
- Regression coverage: Compare baseline overflow failures to worktree results and record routes/viewports.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Reference matrix document for exact route list and expected visibility.

## Progress and completion evidence

Completed: 80 Cypress checks passed across 8 viewports, covering 9 route entries, horizontal overflow, visible controls/touch sizing, and focus wrapping/restoration. Baseline on localhost:8080 had no horizontal overflow assertion failures but failed the 44px navigation-target assertion on the pre-change main checkout.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-003/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
