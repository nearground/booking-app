---
title: "Branded organization profile sites"
work_id: "EPIC-organization-profile-sites"
work_type: epic
template_version: 1
status: in-progress
parent: null
branch: "epic/organization-profile-sites"
depends_on: []
---

# Branded organization profile sites

## Outcome and MVP traceability

Each organization has a branded public landing site at `{slug}.puertovallarta.today` listing its experiences, using one of several hardcoded layout templates tied to the Organization object.

## Scope and non-goals

Organization currently has `name`, `organizationUsername`, `email` in `backend/server/models/Organization.model.js`; Experience association is in `models/index.js`. Organizer profile UI is under `frontend/src/routes/organizer-profile/`; organization API in `backend/server/routes/organizers.js` and `controllers/Organizer.controller.js`. No public org site or branding model exists yet.

Decisions (user, 2026-10-26): subdomain URLs `{slug}.puertovallarta.today`; initial branding fields: logo, cover image/video, primary and accent colors, font choice (from a fixed list), tagline/about text, social and contact links, layout template choice.

In scope: Organization branding fields + migration with safe defaults; admin editor (org admins only); public read API returning branding and visible experiences; host-based routing so `{slug}.puertovallarta.today` renders the org landing page (with a `/o/{slug}` path fallback for local dev and LAN); 2-3 hardcoded layout templates. No arbitrary HTML/CSS/script.

## Acceptance criteria

- [ ] `{slug}.puertovallarta.today` (and `/o/{slug}` in dev) resolves an organization and renders its chosen template with its branding and visible experiences linking to the main site's experience details/booking.
- [ ] Org admins can edit all branding fields and choose a template; non-admins cannot; colors, fonts and links are validated, media goes through the existing upload pipeline.
- [ ] Missing/invalid branding renders safe defaults; no executable markup can be injected.
- [ ] Unknown or reserved subdomains (`www`, `api`, `admin`, `internal`, etc.) do not resolve to organizations; slugs are unique and validated.
- [ ] Tests cover host/slug resolution, public read privacy, admin-only writes, validation, templates and empty states.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/routes/organization-site/**` (new) and template components/styles; host-resolution logic in the frontend router; Organization model + migration; public read/admin write controller/routes; tests; Vite `allowedHosts` and production nginx `server_name` for the wildcard; Cloudflare Tunnel guidance in `DEPLOYMENT.md`.
- Shared files/contracts and owner: This Epic owns Organization branding schema and the public landing response. Hero Epic owns Experience display template. Cookie/auth domain changes coordinate with guest-checkout.
- Parallel-ready assessment: Parallel-ready from `main`.

## Dependencies and integration

No formal dependency. The Cloudflare side needs a wildcard DNS record `*.puertovallarta.today` and a wildcard ingress rule in the tunnel; this is a manual Cloudflare dashboard step documented by this Epic.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
- [STORY-001: Manage organization branding](stories/STORY-001-manage-branding/index.md)
- [STORY-002: Present a public organization site](stories/STORY-002-publish-organization-site/index.md)
- [STORY-003: Resolve organization sites across hosts](stories/STORY-003-resolve-organization-sites/index.md)
<!-- children:end -->

## Risks, assumptions and open questions

- Risk: subdomains are cross-origin to the main site. Booking/checkout should link to `puertovallarta.today`, keeping auth cookies host-only; do not widen `COOKIE_DOMAIN` without a security review.
- Risk: Cloudflare Universal SSL covers one level of wildcard (`*.puertovallarta.today`), which fits; deeper subdomains would need Advanced Certificate Manager.
- Which experiences are listed: published and upcoming only? Recommendation: published, with sold-out shown as such and past hidden.
- Is `organizationUsername` the slug, or a new `slug` field? Recommendation: new lowercase DNS-safe `slug` defaulted from username.
- Should org sites be indexed by search engines? Recommendation: yes.

## Verification and completion evidence

Backend tests for slug/host resolution, privacy and admin-only writes; UI tests for templates and states; manual check via `/o/{slug}` in dev and a wildcard subdomain through the tunnel.

## Progress and decisions

- 2026-10-26: User chose subdomain URLs and the initial branding field set.
- 2026-10-26: Expanded into three stories and six tasks; implementation underway.
