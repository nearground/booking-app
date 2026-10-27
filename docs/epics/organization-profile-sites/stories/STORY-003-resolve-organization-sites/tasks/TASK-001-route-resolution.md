---
title: "Resolve hostnames and local slug routes"
work_id: "EPIC-organization-profile-sites/STORY-003/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-organization-profile-sites/STORY-003"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Resolve hostnames and local slug routes

Parent User Story: [EPIC-organization-profile-sites/STORY-003](../index.md)

## Overview and acceptance coverage

Resolve production subdomains and /o/:slug local/LAN fallback.

## Requirements and current state

Add hostname extraction and route selection without disrupting router behavior. Reject reserved labels; unknown sites are not-found. Keep experience links on main origin; do not broaden cookie domain.

## Implementation steps

1. Inspect frontend router; add pure host resolver and /o/:slug route wiring to organization site components.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/routes/organization-site/** and frontend router | Add host/path resolver and site route registration. | Only one label beneath puertovallarta.today; reserved/malformed names fail closed. |

## Dependencies

Depends on STORY-002 public site components/API.

## Testing

- Unit: Vitest: host extraction, reserved domains, unknown slugs, localhost path fallback and unrelated route preservation.
- Integration: Routing tests verify subdomain and /o/:slug render organization content.
- Manual/UX: Check /o/{slug} on localhost/LAN; production requires DNS/tunnel.
- Regression coverage: Existing app routes and authentication unchanged.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Document local resolution in Epic subtree.

## Progress and completion evidence

Completed. The frontend routes /o/:slug and resolves one-level *.puertovallarta.today hosts; reserved/malformed names fail closed. Vitest resolver suite passed (9 tests), organization templates passed, and production build passed. Full browser/manual deployment verification remains an operator step.

Experience details also expose a small organization profile link in the Hosted By section, using the current host's /o/:slug route. The public experience API includes only the organization's name and slug. Missing organizations and missing/invalid public slugs do not render a link; individual organizer cards remain unchanged. The experience-browse Cypress suite covers profile navigation and these unavailable-profile cases.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-organization-profile-sites/STORY-003/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
