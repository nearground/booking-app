---
title: "Verify email before claiming guest receipts"
work_id: "EPIC-guest-checkout/STORY-003/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-guest-checkout/STORY-003"
branch: "epic/guest-checkout"
depends_on: [EPIC-guest-checkout/STORY-002/TASK-001]
---

# Verify email before claiming guest receipts

Parent User Story: [EPIC-guest-checkout/STORY-003](../index.md)

## Overview and acceptance coverage

Implements STORY-003(a): receipt email equality does not transfer ownership unless the user proves control of that email.

## Requirements and current state

User model has isEmailVerified default false, but User.controller registration/service provide no email verification endpoint. PasswordReset is a separate purpose and must not be reused for account verification. Guest orders need a verified-email claim path that atomically assigns only orders with matching normalized mainContactEmail and no CustomerId, and must be idempotent.

## Implementation steps

1. Add dedicated verification token model/migration and anti-enumeration request/confirm endpoints; send verification link; upon single-use non-expired token confirmation set isEmailVerified and transactionally claim matching eligible guest orders; invalidate token on use.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| backend/server/services/User.service.js | Implement purpose-specific verification and transactional guest-receipt claim service with hashed token storage. | Do not mark email verified at registration; token is random, hashed, expiring, single use; existing secure cookies, JWT validation and CSRF middleware remain intact. |

## Dependencies

Depends on EPIC-guest-checkout/STORY-002/TASK-001 for guest order email and receipt capability contract.

## Testing

- Unit: Jest tests for token expiry/replay, mismatched email, anti-enumeration, unverified status and idempotent claim.
- Integration: Registration ? verify link ? signed-in order list shows receipt; before verification it does not; attempt to claim another user email fails.
- Manual/UX: Verify outbound link configuration without exposing tokens in application logs.
- Regression coverage: Existing registration, login, password reset and authenticated order authorization tests.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Document the 24-hour verification flow and baseline-schema table; do not seed ephemeral verification secrets.

## Progress and completion evidence

Done. Verification token expiry/replay, normalized-email claim behavior, transactional ownership and anti-enumeration are covered by Jest. Full backend validation: 34 suites and 330 tests passed.

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-guest-checkout/STORY-003/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.