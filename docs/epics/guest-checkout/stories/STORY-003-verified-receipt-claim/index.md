---
title: "Claim guest receipts through verified accounts"
work_id: "EPIC-guest-checkout/STORY-003"
work_type: story
template_version: 1
status: done
parent: "EPIC-guest-checkout"
branch: "epic/guest-checkout"
depends_on: []
---

# Claim guest receipts through verified accounts

Parent Epic: [EPIC-guest-checkout](../../index.md)

## User value

As a guest who later decides to create an account, I want claim prior receipts only after verifying the same email address, so that my account securely shows my guest bookings without relying on email equality alone.

## Scope and non-goals

Add purpose-bound email verification tokens for newly registered users who need to claim receipts, atomically assign eligible guest orders to the verified user, make claims idempotent and prevent claims by a different address, and present claimed orders plus first-login welcome UX. Existing unrelated verification behavior must not be weakened.

## Acceptance criteria

- [x] Given an account was created using the guest receipt email but its email has not been verified, when the user requests or completes a receipt claim, then the receipt remains unclaimed until a valid one-time verification token is confirmed; after verification it appears through the authenticated orders panel and repeated claims do not duplicate ownership.
- Epic acceptance coverage: email equality alone is insufficient to claim; verified account ownership grants authenticated receipt visibility; checkout-time registration supports first-login welcome UX

## Ownership and dependencies

This story owns User.service.js/User.controller.js verification endpoints/token persistence and notifications, Order ownership updates, account order-panel welcome behavior, and corresponding security tests. Do not expose order data through email-only lookup.

## Tasks

<!-- children:start -->
- [TASK-001: Verify email before claiming guest receipts](tasks/TASK-001-verified-claim.md)
- [TASK-002: Show claimed receipts and first-login welcome](tasks/TASK-002-welcome-first-login.md)
<!-- children:end -->

## Verification and completion evidence

Test verification-token entropy, expiry, one-time use, email mismatch, token replay, claim idempotency, unauthorized order access, first-login behavior and existing registration/login flows.

## Progress and decisions

- Done. Guest orders are claimed only after transactional confirmation of a single-use, hashed verification token for the matching email; the authenticated bookings panel shows claimed orders and the first-login Welcome is dismissible. The token table is folded into the existing baseline migration, with no token seeder. Focused claim, verification, confirmation and profile tests pass; Cypress E2E is written but not run against the shared stack.