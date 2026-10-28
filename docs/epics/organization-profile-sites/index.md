---
title: "Branded organization profile sites"
work_id: "EPIC-organization-profile-sites"
work_type: epic
template_version: 1
status: done
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

In scope: Organization branding fields in existing initial migrations with safe defaults (no new migration files); admin editor (org admins only); public read API returning branding and visible experiences; host-based routing so `{slug}.puertovallarta.today` renders the org landing page (with a `/o/{slug}` path fallback for local dev and LAN); 2-3 hardcoded layout templates. No arbitrary HTML/CSS/script.

## Acceptance criteria

- [x] Application host resolution and `/o/{slug}` resolve an organization and render its chosen template with branding and visible experiences linking to experience details/booking. Production wildcard DNS/tunnel activation and external-host verification are explicitly deferred to launch, not claimed by this development release.
- [x] Org admins can edit all branding fields and choose a template; non-admins cannot; colors, fonts and links are validated, media goes through the existing upload pipeline.
- [x] Missing/invalid branding renders safe defaults; no executable markup can be injected.
- [x] Unknown or reserved subdomains (`www`, `api`, `admin`, `internal`, etc.) do not resolve to organizations; slugs are unique and validated.
- [x] Tests cover host/slug resolution, public read privacy, admin-only writes, validation, templates and empty states.

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

Backend full suite passed (28 suites, 303 tests), including mocked schema/rollback and branding seed validation. Focused organization-site frontend suite passed (14 tests); production build passed. Full frontend unit suite had 237 passing tests and one unrelated pre-existing failure in `Login.test.jsx` (`Username: user1` hint is not rendered); no changed login files. A simultaneous build/test attempt hit memory pressure; the build passed when rerun alone. No migrations or seeders were executed against the shared dev database. Cloudflare wildcard DNS/tunnel ingress and live-host checks are deferred to production launch.

## Progress and decisions

- 2026-10-26: User chose subdomain URLs and the initial branding field set.
- 2026-10-26: Expanded into three stories and six tasks; implementation underway.
- 2026-10-27: Implemented branding persistence, public API, editor, templates, hostname routing and wildcard configuration. `COOKIE_DOMAIN` remains unchanged. Manual Cloudflare setup and live-host verification are pending.

- 2026-10-27 follow-up: With no live data, removed the separate branding migration and folded its columns/index into existing `20260417130000-add-organization-username.js`. Startup/demo seeders now brand `/o/martinllc` and `/o/testcompany1` through `/o/testcompany3`. The public API permits branded empty sites. No shared DB or Cloudflare changes were made.
- Wave 1 closeout: all six scoped Tasks are merged and complete. Organization unit/privacy/admin tests pass in the full backend suite; frontend templates/host resolver pass in the full unit suite. Experience browser coverage verifies a same-host link from Hosted By to the public organization profile and suppresses missing/invalid slugs. No DNS, tunnel or cookie-domain changes were made.
- 2026-10-28 showcase follow-up (priority: high): Existing organization templates now use a branded hero carousel combining uploaded cover media with photos from their upcoming experiences. Navigation supports keyboard arrows, explicit pause/play, focus/hover pausing, and reduced-motion preferences; video covers require explicit native playback. The public organization read API projects resolved experience gallery URLs and thumbnails only, preserving future-session visibility and privacy filtering. Default experience settings, experience controllers/schema, DNS, and cookie configuration are unchanged. Scoped verification: organization-site frontend suites (30 tests), organization public API suite (39 tests), focused frontend lint, and production frontend build passed; this is not a full-suite or live-host verification.
