---
title: "Resolve organization sites across hosts"
work_id: "EPIC-organization-profile-sites/STORY-003"
work_type: story
template_version: 1
status: in-progress
parent: "EPIC-organization-profile-sites"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Resolve organization sites across hosts

Parent Epic: [EPIC-organization-profile-sites](../../index.md)

## User value

As a a traveler, I want open the organization site using its short address, so that the correct public page loads on a subdomain or local development URL.

## Scope and non-goals

Resolve one-level *.puertovallarta.today hosts and /o/:slug fallback without intercepting reserved hosts or other app routes. Configure Vite allowedHosts and production nginx wildcard. Document manual Cloudflare wildcard DNS/tunnel ingress. Keep cookies host-only.

## Acceptance criteria

- [ ] Given I visit {slug}.puertovallarta.today or localhost/o/{slug}, when the frontend resolves the request, then the organization site loads, while unknown/reserved slugs show not-found and unrelated app routes retain existing behavior..
- Epic acceptance coverage: Covers host/path resolution, reserved/unknown host rejection, fallback route, wildcard development/production config and Cloudflare instructions.

## Ownership and dependencies

Owns frontend route resolution, organization-site route folder, Vite allowedHosts, production nginx server_name and DEPLOYMENT.md. Do not change COOKIE_DOMAIN.

## Tasks

<!-- children:start -->
- [TASK-001: Resolve hostnames and local slug routes](tasks/TASK-001-route-resolution.md)
- [TASK-002: Configure wildcard hosts and deployment guidance](tasks/TASK-002-site-host-deployment.md)
<!-- children:end -->

## Verification and completion evidence

Vitest/Cypress covers host extraction, reserved names, path resolution and empty states. Manually check /o/{slug}; Cloudflare setup remains manual.

## Progress and decisions

- In progress: implementation is underway on epic/organization-profile-sites.