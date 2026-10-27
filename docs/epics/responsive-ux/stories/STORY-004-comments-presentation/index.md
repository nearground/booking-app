---
title: "Read and write comments comfortably across devices"
work_id: "EPIC-responsive-ux/STORY-004"
work_type: story
template_version: 1
status: draft
parent: "EPIC-responsive-ux"
branch: "epic/responsive-ux"
depends_on: []
---

# Read and write comments comfortably across devices

Parent Epic: [EPIC-responsive-ux](../../index.md)

## User value

As a a traveler or organizer participating in a discussion, I want read threads, view comment photos, and write comments on a phone, so that discussion remains readable and actions remain comfortable on narrow screens.

## Scope and non-goals

Deferred implementation: responsive presentation-only changes to comment cards, thread indentation, photo grid/viewer, composer, and edit/delete/pin affordances after the comment-photo-editing branch merges. No comment data/API/auth logic changes.

## Acceptance criteria

- [ ] Given the comment-photo-editing branch has merged and its interface is stable, when comments are rendered or composed at 360px and desktop widths, then threads remain readable, photos fit, the composer is usable with the mobile keyboard, and actions meet touch target guidance.
- Epic acceptance coverage: Covers comment cards, threads, photo thumbnails/viewer, composer, loading/empty/error states, and 44px touch targets; not implemented in this pass.

## Ownership and dependencies

Pending. Do not edit frontend/src/components/comments/** in this pass. Start after comment-photo-editing merges and coordinate before pinned-comments integration.

## Tasks

<!-- children:start -->
- [TASK-001: Adapt comment threads, photos, and affordances for narrow screens](tasks/TASK-001-comments-layout.md)
- [TASK-002: Keep the comment composer usable with mobile keyboards](tasks/TASK-002-comment-composer.md)
<!-- children:end -->

## Verification and completion evidence

Pending dependency merge. Then run comments component tests and viewport checks at 360px and desktop widths.

## Progress and decisions

- Draft created; not approved for implementation.