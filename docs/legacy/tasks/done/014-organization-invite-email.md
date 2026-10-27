# 014 — Organization Invite Email

**Status: COMPLETED**

**Estimated Difficulty:** 3

## Implementation Notes

### Key Finding
The invite email was **already being sent** during `createInviteService` via `sendNotification({ template: 'organizer-invite', ... })`. The `Notification.service.js` already had a complete `organizer-invite` template with invite code, link, expiry, and role.

### What Was Added
1. **Resend Invite endpoint**: `POST /api/organizers/invites/:id/resend` — validates invite is active, checks admin auth, resends the notification email
2. **`resendInviteService()`** in `Organizer.service.js` — looks up invite by ID, validates not expired/used, checks admin permission, sends email via `sendNotification`
3. **`resendInvite` controller handler** in `Organizer.controller.js`
4. **"Resend Email" button** in `OrganizationAccordion.jsx` — shown next to Copy Link/Copy Code for the latest invite
5. **`resendOrganizationInvite` handler** in `OrganizerProfile.jsx` — calls API, shows toast

### Deviations from Plan
- No separate `Email.service.js` or template files needed — `Notification.service.js` already handles everything
- No separate `sendOrganizationInviteEmail()` function needed — reused existing `sendNotification` with `organizer-invite` template

### Files Modified
- `backend/server/services/Organizer.service.js` — Added `resendInviteService()`
- `backend/server/controllers/Organizer.controller.js` — Added `resendInvite` handler
- `backend/server/routes/organizers.js` — Added `POST /invites/:id/resend` route
- `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` — Added Resend button, `resendOrganizationInvite` prop
- `frontend/src/routes/organizer-profile/OrganizerProfile.jsx` — Added `resendOrganizationInvite` function

### Files Created
- `backend/tests/unit/organizer-invite-resend.test.js` — 6 tests

### Test Results
- 6 new tests, all passing
- 177 total backend tests across 14 suites, all passing

## Overview

Send an email notification when an organization invite is created, delivering the invite details (organization name, role, invite code/link, expiration) to the invitee's email address via spacemail.

**Depends on:** Task 013 (Password Recovery) — establishes the `Email.service.js` infrastructure.

## Requirements

### Functional Requirements

1. When `POST /api/organizers/invites` creates an `OrganizationInvite`, an email is sent to the invite's `email` address.
2. The email includes:
   - Organization name.
   - Role being offered (e.g., "Member", "Admin").
   - Who sent the invite (inviter's name).
   - Invite link: `{FRONTEND_URL}/organizer-signup/invite?token={token}&code={code}`.
   - Expiration date/time.
   - Instructions: *"Click the link to accept the invite and join [Organization Name]."*
3. The email is sent asynchronously (fire-and-forget).
4. If the email fails, the invite is still created — the error is logged.
5. An optional "Resend Invite" action from the Organization tab resends the email.

### Non-Functional Requirements

- Email template is HTML with plain-text fallback.
- Reuses the `Email.service.js` from task 013.
- No rate limiting beyond what's already on the invite creation endpoint.

## Current State

- **`Organizer.service.js`**: `createInviteService()` generates an `OrganizationInvite` with `token`, `code`, `expiresAt`, `email`, `role`, `invitedByUserId`. No email is sent.
- **`OrganizationInvite` model**: Has `id`, `OrganizationId`, `email`, `role`, `code`, `token`, `expiresAt`, `invitedByUserId`.
- **`Organizer.controller.js`**: `createInvite()` calls the service and returns the invite. No email trigger.
- **Frontend**: `OrganizationAccordion.jsx` (to become `OrgMembersPanel` per task 002) has invite management UI with a send invite form.
- **No email is sent** on invite creation currently.

## Implementation Steps

### Backend Changes

#### 1. Create Invite Email Template
- Create `backend/server/templates/organization-invite.js`.
- Template accepts: `organizationName`, `role`, `inviterName`, `inviteLink`, `expiresAt`.
- Renders an HTML email with a prominent "Accept Invite" button linking to the invite URL.
- Include plain-text fallback.

#### 2. Add `sendOrganizationInviteEmail()` to Email Service
- Add function to `backend/server/services/Email.service.js`.
- Composes the email using the template and calls `sendEmail()`.
- Returns a promise (fire-and-forget).

#### 3. Update `Organizer.service.js` — `createInviteService()`
- After creating the `OrganizationInvite`, call `sendOrganizationInviteEmail()`.
- Resolve the inviter's name from `invitedByUserId` (via User lookup).
- Compose the invite link: `${FRONTEND_URL}/organizer-signup/invite?token=${token}&code=${code}`.
- Wrap email sending in try-catch (don't fail the invite creation on email error).

#### 4. Add Resend Invite Endpoint
- `POST /api/organizers/invites/:id/resend`.
- Looks up the `OrganizationInvite` by ID.
- Validates: invite is not expired, not already accepted.
- Calls `sendOrganizationInviteEmail()` again.
- Returns success.
- Requires organization admin.

#### 5. Update `Organizer.controller.js`
- Add `resendInvite()` handler.
- Wire to route.

### Frontend Changes

#### 6. Add "Resend" Button to Invite List
- In the invite management UI (`OrgMembersPanel` per task 002 or `OrganizationAccordion`), add a "Resend" button next to each pending invite.
- Calls `POST /api/organizers/invites/:id/resend`.
- Shows a success toast on completion.
- Disable the button for expired invites.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `backend/server/templates/organization-invite.js` |
| Modify | `backend/server/services/Email.service.js` |
| Modify | `backend/server/services/Organizer.service.js` |
| Modify | `backend/server/controllers/Organizer.controller.js` |
| Modify | `backend/server/routes/organizers.js` |
| Modify | `frontend/src/routes/organizer-profile/components/OrgMembersPanel.jsx` (or `OrganizationAccordion.jsx`) |

## Definition of Done

- [ ] Organization invite email is sent to the invitee when an invite is created.
- [ ] Email contains organization name, role, inviter's name, invite link, and expiration.
- [ ] Email is sent asynchronously — invite creation is not blocked by email failure.
- [ ] "Resend" action exists for pending, non-expired invites.
- [ ] Email template is HTML with plain-text fallback.
- [ ] All existing tests pass; new tests cover invite email sending.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/email-service.test.js` | `sendOrganizationInviteEmail()` composes correct email with org name, role, link, expiration; handles missing fields gracefully |
| `tests/unit/organizer-service.test.js` | `createInviteService()` calls email service after invite creation; invite creation succeeds even when email fails; resend looks up invite and sends email; resend rejects expired invites |
| `tests/unit/organizer-controller.test.js` | `resendInvite()` returns 200 on success; returns 404 for non-existent invite; returns 400 for expired invite; requires org admin |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `OrgMembersPanel.test.jsx` | Renders "Resend" button for pending invites; clicking calls resend API; shows success toast; disables button for expired invites |

### Integration Tests

- Create invite → verify email sent with correct link.
- Click invite link → verify it resolves to the signup page with correct token/code.
- Resend → verify email sent again with same link.

### Manual Verification

1. Send an invite from the Organization tab → check invitee's email inbox.
2. Verify email content (org name, role, link, expiration).
3. Click the invite link → verify it opens the organizer signup page.
4. Click "Resend" on the invite → verify email resent.

## Documentation Updates

- **`backend/docs/`**: Document the `POST /api/organizers/invites/:id/resend` endpoint.
- **`backend/docs/email-infrastructure.md`** (created in task 013): Add `sendOrganizationInviteEmail()` to the list of available email functions.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
