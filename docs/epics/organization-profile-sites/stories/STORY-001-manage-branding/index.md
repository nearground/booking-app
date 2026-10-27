---
title: "Manage organization branding"
work_id: "EPIC-organization-profile-sites/STORY-001"
work_type: story
template_version: 1
status: in-progress
parent: "EPIC-organization-profile-sites"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Manage organization branding

Parent Epic: [EPIC-organization-profile-sites](../../index.md)

## User value

As a an organization admin, I want customize my organization site, so that travelers recognize our brand and contact us.

## Scope and non-goals

Grounded scope: Organization.model.js plus organization-auth.js admin path.

## Acceptance criteria

- [ ] Given I am an authenticated organization member without admin rights, when I attempt to save branding, then the API returns 403 and leaves settings unchanged; an admin can save validated settings and see them in the editor..
- Epic acceptance coverage: Covers validated branding fields, admin-only editing, safe defaults and the existing media upload pipeline.

## Ownership and dependencies

Owns Organization branding schema, migration, validation/admin API and organizer editor. Public site reads belong to STORY-002. Do not widen COOKIE_DOMAIN.

## Tasks

<!-- children:start -->
- [TASK-001: Add validated branding fields and admin API](tasks/TASK-001-branding-schema-api.md)
- [TASK-002: Build the organizer branding editor](tasks/TASK-002-branding-editor.md)
<!-- children:end -->

## Verification and completion evidence

Jest covers slug syntax/reserved names, branding validators, API authorization and media upload compatibility. Frontend component tests cover defaults, validation and save/error states.

## Progress and decisions

- In progress: implementation is underway on epic/organization-profile-sites.