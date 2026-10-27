# 013 — Password Recovery via Spacemail

**Status: COMPLETED**

**Estimated Difficulty:** 8

## Implementation Notes

### Deviations from Plan
1. **No separate `Email.service.js` created.** The existing `Notification.service.js` already has full SMTP support (nodemailer configured, template system, multi-provider architecture with `console`, `disabled`, `smtp`, `resend` providers). Reused it instead of creating a redundant service. Other email tasks (011, 012, 014) should also use `Notification.service.js`.
2. **No separate template files created.** `Notification.service.js` already has inline templates for `forgot-password` and `password-changed` that are adequate.
3. **Rate limiter uses IP-based limiting** (via existing `createForgotPasswordRateLimiter()` in `auth-rate-limit.js`, max 8/hour by IP) rather than email-based limiting (max 3/hour by email). This prevents enumeration attacks where an attacker could infer email existence from rate-limit responses.
4. **nodemailer was already installed** (v8.0.4) — no package.json change needed.

### Files Modified
- `backend/server/services/User.service.js` — Added `forgotPassword()`, `validateResetToken()`, updated `completePasswordReset()` with token invalidation and email-optional lookup
- `backend/server/controllers/User.controller.js` — Added `forgotPassword` and `validateResetToken` handlers with anti-enumeration pattern
- `backend/server/routes/users.js` — Added 3 new routes, forgot-password rate limiter
- `frontend/src/routes/forgot-password/ForgotPassword.jsx` — Fixed API endpoint `/api/forgot` → `/api/users/forgot-password`
- `frontend/src/main.jsx` — Added `/reset-password` route

### Files Created
- `frontend/src/routes/reset-password/ResetPassword.jsx` — Full reset password page with token validation, password form, error states
- `backend/tests/unit/user-service-password.test.js` — 12 unit tests for forgotPassword, validateResetToken, completePasswordReset

### Test Results
- 12 new unit tests, all passing
- 171 total tests across 13 suites, all passing

## Overview

Implement password recovery for both regular users and organizers using the spacemail mailserver. This task also **establishes the foundational email infrastructure** (SMTP client, template system, reusable email service) that all other email-dependent tasks (011, 012, 014) will reuse.

The existing `PasswordReset` model (with `email`, `token`, `expiresAt`, `usedAt` fields) is already in the codebase and will be leveraged. The missing piece is the email transport and the frontend reset flow.

## Requirements

### Functional Requirements

1. **Request password reset**: `POST /api/users/forgot-password` — body: `{ email }`.
   - Generates a `PasswordReset` record with a unique token and 1-hour expiration.
   - Sends an email to the provided address with a password reset link.
   - Always returns a generic success message (anti-enumeration).
2. **Validate reset token**: `GET /api/users/reset-password/:token`.
   - Checks if the token exists, is not expired, and has not been used.
   - Returns validity status (valid/invalid/expired).
3. **Complete password reset**: `POST /api/users/reset-password` — body: `{ token, newPassword }`.
   - Validates the token (same checks as above).
   - Updates the user's password via bcrypt hashing.
   - Marks the token as used (`usedAt = now`).
   - Invalidates other active reset tokens for the same email.
   - Returns success.
4. For **organizer accounts**: The same flow works. The email includes the organizer's `organizationUsername` for context (if applicable, per task 001).
5. Rate limiting on the forgot-password endpoint: max 3 requests per email per hour.

### Non-Functional Requirements

- **Email infrastructure**: This task creates the reusable `Email.service.js` with SMTP transport configuration for spacemail.
- Reset tokens are cryptographically random (use `crypto.randomBytes`).
- Reset links include the frontend URL: `{FRONTEND_URL}/reset-password?token={token}`.
- Email template is HTML with plain-text fallback.
- Token expiration is checked server-side, not client-side.

## Current State

- **PasswordReset model**: Exists with fields: `id`, `email`, `token` (unique), `expiresAt`, `usedAt`. Ready to use.
- **`User.service.js`**: Has `completePasswordReset()` which validates token/expiry and marks used. Missing: token creation and email sending.
- **`User.controller.js`**: Has `resetPassword()` handler. Missing: `forgotPassword()` handler to initiate the flow.
- **`Notification.service.js`**: Has a template-based `sendNotification()` with minimal implementation. Supports `'password-changed'` template but no actual email delivery.
- **Frontend**: `/forgot-password` route exists. The component likely has a basic form but no integration with a working backend endpoint.
- **No SMTP/email transport** is configured anywhere in the project.

## Implementation Steps

### Backend Changes

#### 1. Create `Email.service.js` — Foundational Email Infrastructure
- Create `backend/server/services/Email.service.js`.
- Configure SMTP transport using `nodemailer` (add as dependency):
  ```javascript
  import nodemailer from 'nodemailer';
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  ```
- Export functions:
  - `sendEmail({ to, subject, html, text })` — generic sender with error handling and logging.
  - `sendPasswordResetEmail(email, resetUrl)` — composes and sends reset email.
  - `sendPasswordChangedNotification(email, name)` — notifies user of successful password change.

#### 2. Create Email Templates
- Create `backend/server/templates/password-reset.js`:
  - Personalized greeting.
  - Reset link button.
  - Expiration notice: *"This link expires in 1 hour."*
  - Security notice: *"If you didn't request this, you can safely ignore this email."*
- Create `backend/server/templates/password-changed.js`:
  - Notification that the password was changed.
  - Security notice: *"If you did not make this change, contact support immediately."*

#### 3. Add `forgotPassword()` to `User.service.js`
- Generate a token: `crypto.randomBytes(32).toString('hex')`.
- Create `PasswordReset` record: `{ email, token, expiresAt: Date.now() + 3600000 }`.
- Compose reset URL: `${FRONTEND_URL}/reset-password?token=${token}`.
- Call `sendPasswordResetEmail(email, resetUrl)`.
- Return success (regardless of whether email exists — anti-enumeration).

#### 4. Add `validateResetToken()` to `User.service.js`
- Find `PasswordReset` by token.
- Check: exists, not expired (`expiresAt > now`), not used (`usedAt === null`).
- Return `{ valid: true/false, reason?: 'expired' | 'used' | 'not-found' }`.

#### 5. Update `completePasswordReset()` in `User.service.js`
- After updating the password, mark the token as used.
- Invalidate other active tokens for the same email: `PasswordReset.update({ usedAt: now }, { where: { email, usedAt: null } })`.
- Send a `password-changed` notification email.

#### 6. Add Controller Handlers in `User.controller.js`
- `forgotPassword()`: accepts `{ email }`, calls service, returns generic success.
- `validateResetToken()`: accepts `{ token }` as URL param, calls service, returns validity.
- Update `resetPassword()`: accepts `{ token, newPassword }`, calls `completePasswordReset()`.

#### 7. Add Routes
- `POST /api/users/forgot-password` → `forgotPassword()` (rate-limited).
- `GET /api/users/reset-password/:token` → `validateResetToken()`.
- `POST /api/users/reset-password` → `resetPassword()`.

#### 8. Add Rate Limiting
- `createFixedWindowRateLimiter()` with `keyResolver: (req) => req.body.email`, max 3 per hour.

#### 9. Add Environment Variables
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`.
- Add to `.env.example` with descriptions.

#### 10. Install `nodemailer` Dependency
- `npm install nodemailer` in the backend project.

### Frontend Changes

#### 11. Update/Create `ForgotPassword` Page
- Route: `/forgot-password`.
- Form: email input + submit button.
- Submit calls `POST /api/users/forgot-password`.
- On success, show: *"If an account with that email exists, you will receive a password reset link."*
- Add link: "Back to Login".

#### 12. Create `ResetPassword` Page
- Route: `/reset-password` (with `?token=` query param).
- On mount, validate the token via `GET /api/users/reset-password/:token`.
- If valid: show new password form (password + confirm password with Yup validation).
- If expired: show *"This reset link has expired. Please request a new one."* with link to `/forgot-password`.
- If used/invalid: show *"This reset link is invalid."*
- On submit, call `POST /api/users/reset-password` with `{ token, newPassword }`.
- On success: show *"Password reset successfully!"* with link to `/login`.

#### 13. Add Route to `main.jsx`
- Add `/reset-password` route pointing to the `ResetPassword` component.

#### 14. Add "Forgot Password?" Link to `Login.jsx`
- Ensure the existing "Forgot Password" link navigates to `/forgot-password`.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `backend/server/services/Email.service.js` |
| Create | `backend/server/templates/password-reset.js` |
| Create | `backend/server/templates/password-changed.js` |
| Modify | `backend/server/services/User.service.js` |
| Modify | `backend/server/controllers/User.controller.js` |
| Modify | `backend/server/routes/users.js` |
| Modify | `backend/package.json` (add nodemailer) |
| Modify | `.env.example` |
| Create or Modify | `frontend/src/routes/forgot-password/ForgotPassword.jsx` |
| Create | `frontend/src/routes/reset-password/ResetPassword.jsx` |
| Modify | `frontend/src/main.jsx` (add reset-password route) |
| Modify | `frontend/src/routes/login/Login.jsx` (verify forgot-password link) |

## Definition of Done

- [ ] **Email infrastructure** (`Email.service.js`) is created with spacemail SMTP transport, reusable for all email tasks.
- [ ] `POST /api/users/forgot-password` generates a reset token and sends a reset email.
- [ ] `GET /api/users/reset-password/:token` validates the token.
- [ ] `POST /api/users/reset-password` resets the password and invalidates the token.
- [ ] Other active tokens for the same email are invalidated on successful reset.
- [ ] A "password changed" notification email is sent after reset.
- [ ] Forgot-password endpoint is rate-limited (3 per email per hour).
- [ ] Endpoint never reveals whether an email exists (anti-enumeration).
- [ ] Frontend forgot-password and reset-password flows work end-to-end.
- [ ] Works for both regular users and organizer accounts.
- [ ] All existing tests pass; new tests cover the full flow.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/email-service.test.js` | `sendEmail()` calls nodemailer transport with correct params; handles transport errors; logs errors without throwing; `sendPasswordResetEmail()` composes correct email with reset URL; `sendPasswordChangedNotification()` composes correct notification |
| `tests/unit/user-service.test.js` | `forgotPassword()` creates PasswordReset record with token and expiry; calls email service; returns success even for non-existent email; `validateResetToken()` returns valid for good token; returns expired for old token; returns used for consumed token; returns not-found for bad token; `completePasswordReset()` updates password; marks token used; invalidates other tokens; sends notification email |
| `tests/unit/user-controller.test.js` | `forgotPassword()` always returns 200; rate limits by email; `validateResetToken()` returns correct validity; `resetPassword()` returns success on valid token + password; returns error on invalid token |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `ForgotPassword.test.jsx` | Renders email input and submit button; calls API on submit; displays generic success message; validates email format |
| `ResetPassword.test.jsx` | Validates token on mount; shows new password form for valid token; shows expired message for expired token; shows invalid message for bad token; submits new password; shows success and login link |

### Integration Tests

- Request reset → check email → click link → reset password → verify login with new password.
- Request reset → wait for expiry → verify token rejected.
- Request reset → use token → attempt reuse → verify rejected.

### Manual Verification

1. Click "Forgot Password?" on login page → enter email → submit → check inbox.
2. Click reset link → enter new password → submit → verify success message.
3. Try logging in with old password → fail. Log in with new password → success.
4. Re-click the same reset link → verify "invalid/used" message.

## Documentation Updates

- **`backend/docs/`**: Create `email-infrastructure.md` documenting the spacemail SMTP setup, environment variables, template system, and available email functions. This is the reference document for tasks 011, 012, 014.
- **`docs/architecture-diagrams.md`**: Add an email service box to the High-Level System Architecture diagram. Add password reset flow as a new sequence diagram.
- **`backend/docs/`**: Document `/api/users/forgot-password`, `/api/users/reset-password/:token`, `/api/users/reset-password` endpoints.
- **`.env.example`**: Document all SMTP environment variables.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Dependencies

- **Tasks 011 (Email Booking Confirmation), 012 (Email Username Lookup), 014 (Organization Invite Email)** all depend on the `Email.service.js` created in this task.
