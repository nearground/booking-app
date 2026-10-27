# 001 — Update Login Process

**Estimated Difficulty:** 13

## Overview

Overhaul the authentication login flow to use **username + password** for regular users, and **organization username + username + password** for organizers. Add a `username` field to the User model and a non-nullable `organizationUsername` field (as a unique key) to the Organization model. Organizer accounts are scoped to a single organization but a single email may own multiple accounts. Update seeder files to populate the new `organizationUsername` field derived from the Organization name (lowercased, no spaces).

## Requirements

### Functional Requirements

1. **User model** gains a `username` field (unique, non-nullable for new registrations).
2. **Organization model** gains an `organizationUsername` field (unique, non-nullable). This serves as a human-readable primary key for organization-scoped login.
3. **Regular user login** accepts `{ username, password }` instead of `{ email, password }`.
4. **Organizer login** accepts `{ organizationUsername, username, password }`. The system first resolves the organization by `organizationUsername`, then authenticates the user within that organization's members.
5. An organizer account cannot belong to more than one organization (enforced at the model level).
6. A single email may be associated with multiple user accounts (the current `email` unique constraint on User must be relaxed or scoped).
7. **Seeder files** generate `organizationUsername` from the Organization `name`: lowercased, spaces removed (e.g., "Martin LLC" → "martinllc").
8. Registration flow updated to collect `username`.

### Non-Functional Requirements

- Backward-compatible migration: existing users receive a generated `username` (derived from email prefix or name).
- Login rate limiting (`createLoginRateLimiter()`) continues to function, keyed by username instead of email.
- JWT payload updated to include `username`.

## Current State

- **Login endpoint** (`POST /api/users/login`): accepts `{ email, password }`, calls `UserService.authenticateUser(email, password)`, returns JWT in `_token` cookie.
- **User model**: `email` is unique; no `username` field exists.
- **Organization model**: has `id` (PK), `name` (unique), `email`, `LocationId`. No `organizationUsername` field.
- **OrganizationMembers** join table: `{ UserId, OrganizationId, isAdmin }` — no constraint preventing a user from belonging to multiple organizations.
- **Seeders**: `20260212222654-startup-org-and-admin.js` creates admin user with email-based login; `20260214193720-demo-experiences.js` creates 24 test users with emails like `user1@test.com`.
- **Frontend Login.jsx**: two fields — Email and Password. Submits to `api/users/login`.
- **AuthContext.js**: calls `api/users/auth-user` on mount; stores `userDetails` including `organizerProfile`.

## Implementation Steps

### Backend Changes

#### 1. Migration: Add `username` to User Model
- Create migration `add-username-to-users.js`.
- Add `username` column: `STRING`, unique, allowNull initially true (for backfill).
- Backfill existing users: set `username = LOWER(REPLACE(firstName + lastName, ' ', ''))` with a numeric suffix for collisions.
- After backfill, alter column to `allowNull: false`.

#### 2. Migration: Add `organizationUsername` to Organization Model
- Create migration `add-organization-username-to-organizations.js`.
- Add `organizationUsername` column: `STRING`, unique, non-nullable.
- Backfill: `organizationUsername = LOWER(REPLACE(name, ' ', ''))`.

#### 3. Migration: Restrict Organizer to Single Organization
- Add a unique constraint on `OrganizationMembers.UserId` so a user can only appear in one organization.

#### 4. Update User Model Definition
- Add `username` field with validation: `is: /^[a-z0-9._-]+$/i`, `len: [3, 30]`.
- Relax or remove unique constraint on `email` field (allow multiple accounts per email).

#### 5. Update Organization Model Definition
- Add `organizationUsername` field with validation: `is: /^[a-z0-9]+$/`, `len: [3, 30]`.

#### 6. Update `User.service.js` — `authenticateUser()`
- Change signature to `authenticateUser({ username, password, organizationUsername? })`.
- If `organizationUsername` is provided: resolve Organization by `organizationUsername`, then find User where `username` matches AND `UserId` exists in `OrganizationMembers` for that org.
- If not provided: find User by `username` directly.
- Ensure bcrypt comparison remains unchanged.

#### 7. Update `User.controller.js` — `loginUser()`
- Accept `{ username, password }` or `{ organizationUsername, username, password }` from `req.body`.
- Validate required fields; if `organizationUsername` is present, require all three.
- Pass to updated `authenticateUser()`.

#### 8. Update `User.controller.js` — `registerUser()`
- Accept and validate new `username` field.
- Check for username uniqueness.

#### 9. Update `auth-helpers.js` — `generateNewToken()`
- Include `username` in JWT payload alongside `name` and `id`.

#### 10. Update Seeder Files
- `20260212222654-startup-org-and-admin.js`: add `username: 'admin'` to admin user; add `organizationUsername: 'martinllc'` to Martin LLC org.
- `20260214193720-demo-experiences.js`: generate usernames for test users (e.g., `user1`, `user2`, …, `user24`); generate `organizationUsername` for each test org from its name.

### Frontend Changes

#### 11. Update `Login.jsx`
- Replace "Email" field with "Username" field.
- Add an "Organizer Login" toggle/checkbox that reveals a third field: "Organization Username".
- Update form submission to send `{ username, password }` or `{ organizationUsername, username, password }`.

#### 12. Update `Register.jsx`
- Add "Username" field to the Formik schema and `Schemas.signupSchema`.
- Validate: 3–30 chars, alphanumeric + `.` `_` `-`.

#### 13. Update `AuthContext.js`
- Store `username` in `userDetails`.
- No change to `triggerAuthCheck()` flow (it still calls `GET /api/users/auth-user`).

#### 14. Update `OrganizerSignup` Flow
- During onboarding, auto-generate `organizationUsername` suggestion from org name.
- Allow organizer to customize before submission.
- Send `organizationUsername` in onboarding payload.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `backend/server/migrations/XXXXXX-add-username-to-users.js` |
| Create | `backend/server/migrations/XXXXXX-add-organization-username-to-organizations.js` |
| Create | `backend/server/migrations/XXXXXX-restrict-organizer-single-org.js` |
| Modify | `backend/server/models/User.js` |
| Modify | `backend/server/models/Organization.js` |
| Modify | `backend/server/models/OrganizationMembers.js` |
| Modify | `backend/server/services/User.service.js` |
| Modify | `backend/server/controllers/User.controller.js` |
| Modify | `backend/server/utils/auth-helpers.js` |
| Modify | `backend/server/seeders/20260212222654-startup-org-and-admin.js` |
| Modify | `backend/server/seeders/20260214193720-demo-experiences.js` |
| Modify | `frontend/src/routes/login/Login.jsx` |
| Modify | `frontend/src/routes/register/Register.jsx` |
| Modify | `frontend/src/contexts/AuthContext.js` |
| Modify | `frontend/src/routes/organizer-signup/OrganizerSignup.jsx` |
| Modify | `frontend/src/utils/validation-schemas.js` |

## Definition of Done

- [ ] Regular users can log in with `username` + `password`.
- [ ] Organizers can log in with `organizationUsername` + `username` + `password`.
- [ ] `organizationUsername` is unique and non-nullable on Organization.
- [ ] `username` is unique and non-nullable on User.
- [ ] Organizer accounts belong to exactly one organization (constraint enforced).
- [ ] A single email address may be used across multiple user accounts.
- [ ] Seeder files produce valid `username` and `organizationUsername` values.
- [ ] Existing users receive a backfilled `username` via migration.
- [ ] JWT token includes `username`.
- [ ] Login rate limiter keys on `username`.
- [ ] Frontend login form supports both regular and organizer login modes.
- [ ] Registration form collects and validates `username`.
- [ ] All existing tests pass; new tests cover the new flows.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/user-service.test.js` | `authenticateUser()` with username only; with orgUsername + username; wrong password returns error; non-existent username returns error; orgUsername not found returns error |
| `tests/unit/user-controller.test.js` | `loginUser()` with valid username/password returns 200 + token; with orgUsername/username/password returns 200; missing fields returns 400; rate limiting triggers after threshold |
| `tests/unit/user-model.test.js` | Validate `username` format (alphanumeric, dots, dashes); reject duplicates; reject too-short/too-long values |
| `tests/unit/organization-model.test.js` | Validate `organizationUsername` format; reject duplicates; backfill logic produces correct slugs |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `frontend/src/routes/login/Login.test.jsx` | Renders username field; toggle shows org username field; form submits correct payload for regular user; form submits correct payload for organizer; validation errors display |
| `frontend/src/routes/register/Register.test.jsx` | Username field renders; validation rejects invalid usernames; successful submission includes username |

### Integration Tests

- End-to-end login flow: register with username → login with username → verify auth-user returns profile.
- Organizer login flow: create org with organizationUsername → add member → login with all three fields.
- Migration test: run migration on seeded DB, verify all existing users have generated usernames.

### Manual Verification

1. Register a new user with a username; log in with username + password.
2. Create an organizer account; log in with org username + username + password.
3. Attempt to add the same user to two organizations — verify rejection.
4. Verify seeded data has correct `organizationUsername` values.

## Documentation Updates

- **`docs/architecture-diagrams.md`**: Update "Backend API Route Map" section to reflect new login endpoint fields. Update "Authentication & Guest Cart Flow" diagram to show username-based lookup.
- **`backend/docs/`**: Create or update an auth API doc covering the new login request/response schema, the `organizationUsername` field, and the username uniqueness rules.
- **`README.md`** / **`QUICKSTART.md`**: Update any login examples to use username instead of email.
- **Seeder docs**: Note the `organizationUsername` generation convention (lowercase, no spaces from org name).
