# 012 — Email-Based Username Lookup

**Estimated Difficulty:** 3

## Overview

Implement an email-based username lookup endpoint using the spacemail mailserver. Given an email address, the system returns the associated username(s). If the email matches multiple accounts (allowed per task 001), all matching usernames are returned. If any matching account is an organizer, the response also includes the corresponding `organizationUsername`.

**Depends on:** Task 001 (Update Login Process — adds `username` to User, `organizationUsername` to Organization), Task 013 (Password Recovery — establishes spacemail email infrastructure).

## Requirements

### Functional Requirements

1. New endpoint: `POST /api/users/lookup-username` — body: `{ email }`.
2. The system looks up all User records matching the given email.
3. For each matching user:
   - Includes `username`.
   - If the user is an organizer (has an `Organizer` profile and `OrganizationMembers` entry), also includes `organizationUsername`.
4. The result (username or list of usernames) is **sent to the email address via spacemail** — never returned directly in the API response. This prevents email enumeration attacks.
5. API response is always a generic success message: *"If an account with that email exists, you will receive an email with your username(s)."*
6. The email contains: *"Here are the usernames associated with this email: [username1], [username2]. If any of these are organizer accounts: [username] belongs to organization [organizationUsername]."*
7. Rate-limited to prevent abuse.

### Non-Functional Requirements

- The endpoint must not reveal whether an email exists in the system (anti-enumeration).
- Rate limiting: max 3 requests per email per hour.
- Email sending is asynchronous (fire-and-forget).

## Current State

- **User model**: Currently has unique `email`. Task 001 will add `username` and relax the uniqueness constraint.
- **Organization model**: Currently has `name`. Task 001 will add `organizationUsername`.
- **No username lookup endpoint** exists.
- **No email sending infrastructure** exists (task 013 establishes it).

## Implementation Steps

### Backend Changes

#### 1. Add `lookupUsernameByEmail()` to `User.service.js`
- Query: `User.findAll({ where: { email }, include: [{ model: Organizer, include: [{ model: Organization }] }] })`.
- Map results to `[{ username, organizationUsername? }]`.
- If no matches, return empty array (but the API still returns the generic message).

#### 2. Create Username Lookup Email Template
- Create `backend/server/templates/username-lookup.js`.
- Template accepts: `usernames: [{ username, organizationUsername? }]`.
- Lists usernames, indicating which ones are organizer accounts and their org usernames.

#### 3. Add `sendUsernameLookupEmail()` to Email Service
- Compose and send the email using the template.
- Fire-and-forget with error logging.

#### 4. Add Endpoint and Controller Handler
- Route: `POST /api/users/lookup-username`.
- Controller: `lookupUsername()` in `User.controller.js`.
- Validates email format.
- Calls `lookupUsernameByEmail()`.
- If results exist, calls `sendUsernameLookupEmail()`.
- Always returns: `{ status: 200, data: { message: "If an account with that email exists, you will receive an email with your username(s)." } }`.

#### 5. Add Rate Limiting
- Apply a specific rate limiter: 3 requests per email per hour.
- Use the existing `createFixedWindowRateLimiter()` with `keyResolver: (req) => req.body.email`.

### Frontend Changes

#### 6. Create Username Lookup UI
- Add a "Forgot Username?" link on the Login page (below the username field).
- Clicking it navigates to a simple form page or modal: email input + submit button.
- On submit, calls `POST /api/users/lookup-username`.
- Displays the generic success message regardless of result.

#### 7. Add Route (if full page)
- Route: `/forgot-username` or integrate into the existing `/forgot-password` page as a tab.

## Files to Create or Modify

| Action | File |
|--------|------|
| Modify | `backend/server/services/User.service.js` |
| Modify | `backend/server/controllers/User.controller.js` |
| Modify | `backend/server/routes/users.js` |
| Create | `backend/server/templates/username-lookup.js` |
| Modify | `backend/server/services/Email.service.js` (add `sendUsernameLookupEmail`) |
| Create or Modify | `frontend/src/routes/login/Login.jsx` (add "Forgot Username?" link) |
| Create | `frontend/src/routes/forgot-username/ForgotUsername.jsx` (or modal) |
| Modify (optional) | `frontend/src/main.jsx` (add route) |

## Definition of Done

- [ ] `POST /api/users/lookup-username` endpoint exists and is rate-limited.
- [ ] Endpoint never reveals whether an email exists (anti-enumeration).
- [ ] Matching usernames are emailed to the provided address.
- [ ] Organizer accounts include `organizationUsername` in the email.
- [ ] Multiple accounts per email are all listed.
- [ ] Frontend has a "Forgot Username?" flow accessible from the login page.
- [ ] All existing tests pass; new tests cover lookup logic.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/user-service.test.js` | `lookupUsernameByEmail()` returns usernames for matching email; includes organizationUsername for organizer accounts; returns empty array for non-existent email; handles multiple accounts per email |
| `tests/unit/user-controller.test.js` | `lookupUsername()` always returns 200 with generic message; calls email service when matches found; does not call email service when no matches; validates email format; rate limits by email |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `ForgotUsername.test.jsx` | Renders email input and submit button; calls API on submit; displays generic success message; validates email format before submission |

### Integration Tests

- Submit existing email → verify email is sent with correct usernames.
- Submit non-existent email → verify same 200 response, no email sent.
- Submit 4 times in 1 hour → verify rate limit triggers on 4th attempt.

### Manual Verification

1. From login page, click "Forgot Username?" → enter email → submit → verify generic message.
2. Check email inbox → verify username(s) listed correctly.
3. For organizer account → verify org username included in email.

## Documentation Updates

- **`backend/docs/`**: Document the `/api/users/lookup-username` endpoint with request/response schema.
- **`docs/architecture-diagrams.md`**: Add the route to the Backend API Route Map.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
