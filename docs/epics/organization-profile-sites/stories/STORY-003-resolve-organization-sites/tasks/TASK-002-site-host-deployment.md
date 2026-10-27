---
title: "Configure wildcard hosts and deployment guidance"
work_id: "EPIC-organization-profile-sites/STORY-003/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-organization-profile-sites/STORY-003"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Configure wildcard hosts and deployment guidance

Parent User Story: [EPIC-organization-profile-sites/STORY-003](../index.md)

## Overview and acceptance coverage

Permit the wildcard host in development and production; document Cloudflare tunnel setup.

## Requirements and current state

Set frontend/vite.config.mjs allowedHosts narrowly to .puertovallarta.today and frontend/nginx.conf.template server_name wildcard. Document wildcard DNS and ingress in DEPLOYMENT.md. Never alter COOKIE_DOMAIN.

## Implementation steps

1. Inspect nginx server block and deployment guide; add wildcard domain without allowing arbitrary hosts.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/vite.config.mjs | Add narrowly scoped Vite allowedHosts. | Do not widen COOKIE_DOMAIN; allow only app apex/wildcard as needed. |

## Dependencies

Independent configuration/documentation task in this Story.

## Testing

- Unit: Run Vite build/config checks and host-resolver tests.
- Integration: Validate available nginx config checks only; never start/stop/rebuild shared Docker.
- Manual/UX: Operator manually adds wildcard DNS and tunnel ingress in Cloudflare.
- Regression coverage: Confirm COOKIE_DOMAIN unchanged and app apex remains served.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Add explicit Cloudflare dashboard instructions to DEPLOYMENT.md.

## Progress and completion evidence

Completed. Vite server/preview allow the apex and wildcard host; nginx accepts the apex and one-level wildcard. DEPLOYMENT.md documents manual wildcard DNS and tunnel ingress. Frontend production build passed; COOKIE_DOMAIN was not changed. Cloudflare dashboard configuration was not performed.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-organization-profile-sites/STORY-003/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
