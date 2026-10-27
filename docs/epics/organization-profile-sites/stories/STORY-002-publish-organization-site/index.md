---
title: "Present a public organization site"
work_id: "EPIC-organization-profile-sites/STORY-002"
work_type: story
template_version: 1
status: in-progress
parent: "EPIC-organization-profile-sites"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Present a public organization site

Parent Epic: [EPIC-organization-profile-sites](../../index.md)

## User value

As a a traveler, I want browse an organization-branded public site, so that I can discover upcoming experiences and continue to the main booking site.

## Scope and non-goals

Expose an unauthenticated slug-keyed read endpoint with public branding and published upcoming experiences only. Hide past/unpublished listings, flag sold-out listings, and exclude memberships, user details, reservations and private organization data. Render fixed templates with safe defaults and links to the main site.

## Acceptance criteria

- [ ] Given an organization has published upcoming experiences, when I open its public site, then I see approved branding and only visible experiences; sold-out items are labeled and actions link to puertovallarta.today..
- Epic acceptance coverage: Covers privacy-safe public reads, visible experience filtering, sold-out state, fixed templates, safe defaults and no executable markup.

## Ownership and dependencies

Owns the public site response contract and fixed template components. Consumes branding from STORY-001 and route resolution from STORY-003.

## Tasks

<!-- children:start -->
- [TASK-001: Expose privacy-safe organization site data](tasks/TASK-001-public-site-api.md)
- [TASK-002: Render branded sites and experience cards](tasks/TASK-002-site-templates.md)
<!-- children:end -->

## Verification and completion evidence

Jest asserts response projection, visibility filtering and sold-out flags. Vitest component tests cover templates and empty states.

## Progress and decisions

- In progress: implementation is underway on epic/organization-profile-sites.