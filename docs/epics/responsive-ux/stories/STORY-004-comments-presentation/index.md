---
title: "Read and write comments comfortably across devices"
work_id: "EPIC-responsive-ux/STORY-004"
work_type: story
template_version: 1
status: done
parent: "EPIC-responsive-ux"
branch: "epic/responsive-ux"
depends_on: ["EPIC-comment-photo-editing"]
---

# Read and write comments comfortably across devices

Parent Epic: [EPIC-responsive-ux](../../index.md)

## User value

As a a traveler or organizer participating in a discussion, I want read threads, view comment photos, and write comments on a phone, so that discussion remains readable and actions remain comfortable on narrow screens.

## Scope and non-goals

Responsive presentation changes to comment cards, thread indentation, photo grid/viewer, composer, and edit/delete affordances after the comment-photo-editing merge. No comment data/API/auth contract changes; pinned comments remain a later Epic.

## Acceptance criteria

- [x] Given the comment-photo-editing branch has merged and its interface is stable, when comments are rendered or composed at 360px and desktop widths, then threads remain readable, photos fit, the composer is usable within reduced viewport heights, and actions meet touch target guidance.
- Epic acceptance coverage: Comment cards, threads, photo thumbnails/viewer, composer, loading/empty/error states, and 44px touch targets. Real-device virtual keyboard testing remains a manual launch check; browser tests simulate reduced available height.

## Ownership and dependencies

Owns responsive comment presentation and the related shared gallery/modal affordances. Comment-photo-editing is merged; canonical media keys and existing authorization/submission contracts are preserved.

## Tasks

<!-- children:start -->
- [TASK-001: Adapt comment threads, photos, and affordances for narrow screens](tasks/TASK-001-comments-layout.md)
- [TASK-002: Keep the comment composer usable with mobile keyboards](tasks/TASK-002-comment-composer.md)
<!-- children:end -->

## Verification and completion evidence

Comments, galleries and modal unit tests pass. `comments-viewport.cy.js` passes 11 checks: long unbroken text and thread/photo/dialog presentation at all eight matrix sizes, plus editing/removing a photo/saving at 360x420, 844x390 and desktop. Controlled API fixtures isolate layout; live booking and reset flows are verified separately.

## Progress and decisions

- Completed on main for Wave 1 after the comment-photo-editing merge. Nested dialogs trap/restore focus, close one level at a time, and restore page scrolling. Composer controls are labeled, wrap naturally, and remain scrollable without fixed-height clipping.