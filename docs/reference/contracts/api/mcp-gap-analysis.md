# MCP client gap analysis and recommended tool catalogue

## Executive finding

The API is a browser-oriented REST surface rather than an agent-client contract. Some public reads are directly callable, but authenticated routes depend on cookies and CSRF; anonymous cart state is also cookie-bound. Checkout has no client idempotency key. Customer orders are account-scoped; guest receipts use a private, expiring receipt capability, and verified email ownership can claim eligible opted-in guest orders. No endpoint looks up a receipt by reservation confirmation code alone. This memo was refreshed on 2026-10-27 after the Guest Checkout Epic completed.

This is a research recommendation, not an authorization to build an MCP server or change REST behavior. The current checked-in route evidence is in [inventory.md](inventory.md), and route coverage is recorded in [openapi.yaml](openapi.yaml).

## What an external non-browser client can and cannot do today

| Capability | Current API evidence | Non-browser implication |
|---|---|---|
| Public discovery | Experience list/detail, cities/filters, nearby, schedules, booking enquiry are public GET routes in `routes/experiences.js`. | Direct HTTP is feasible, but exact filter/query schemas need additional verification before stable typed tools. Schedule/calendar reads may synchronize sessions when empty; do not promise backend non-mutation. Schedule success uses `elements/paging/metadata`, calendar uses `elements/metadata`, not the common envelope. |
| Login and account creation | `PUT /api/users/register` and `POST /api/users/login`; login accepts username/password, sets `_token` + CSRF cookies and also returns the JWT in JSON. | A client would need to retain cookies. `authUser` reads only `_token`; it does not accept Bearer tokens. Never put passwords or returned JWTs in model-visible tool inputs/outputs. |
| Organization onboarding | `POST /api/organizers/onboarding/start` and `/complete`; completion can create an organization or accept an invite, then sets auth/CSRF cookies. | Requires sensitive account fields and creates an authenticated account and/or organization. No isolated service-account / agent grant API exists. |
| Organization invites | Resolve is public; create, resend and cancel require cookie auth and service-level org-admin authorization. | Admin operations need cookie jar + CSRF and are not directly usable by stateless API clients. Invite token/code are bearer-like capabilities and must not be surfaced to the model. |
| Experience management | Create/read/update/delete and schedule/organizer-management routes require authenticated organization-admin membership (some controller checks follow `authUser`). | Browser session + CSRF required. Creation/update schemas are partly normalized and some nested schedule/assignment schemas need more contract detail. No explicit route rate limiter is registered. |
| Cart | `GET /api/cart` and item routes support optional auth; anonymous carts use the HttpOnly `_cart_session` cookie. Only experience tickets can be added/checked out. | Host must isolate and safely retain each user's cookie jar. GET cart can remove legacy hotel/service items and recompute totals; it is not side-effect-free. Cart edits have no idempotency key. |
| Checkout | `POST /api/cart/checkout` supports customer auth or the owning guest cart session, plus `cartId`, billing details and optional `saveBookingForLater` (default true). Creates a pending order; guests receive a one-time `guestReceiptToken`; responses include `confirmationEmail` status. | Requires private session storage, billing PII and CSRF when an auth cookie is present. Keep receipt capability inside trusted host storage, never model output. No client idempotency key: do not retry blindly after timeout. This is not a payment-capture contract. |
| Receipt/order lookup | Customer order reads remain cookie-authenticated and customer scoped. `POST /api/orders/guest-receipt` accepts `{orderNumber,receiptToken}` for an unclaimed order with matching unexpired capability (30 days); response omits private metadata/hash. | Receipt access is capability-protected. Keep tokens, receipt PII and full order data out of public chat. Reservation confirmation-code-only lookup is unsupported. |
| Verified guest claim | `POST /api/users/email-verification/request` starts email proof; `/confirm` consumes `{token}`, verifies email and transactionally transfers matching unclaimed orders, excluding explicit linking opt-outs. | Existing user-mediated browser/email flow, not an account-link or agent grant. Email equality, order number and Discord identity alone are not proof. Verification is single-use, expires after 24 hours, does not log in the caller, and must stay outside model context. |
| Public organization profiles | `GET /api/organization-sites/{slug}` returns public branding/experiences; admin branding reads/writes require organization admin membership. | Public reads are feasible. Writes need linked identity, CSRF and explicit confirmation; no arbitrary HTML/CSS is supported. |

### Cookie, JWT, CSRF and error constraints

- `authUser` reads `req.cookies._token` only; no Authorization header, OAuth grant, or agent credential is accepted. `getToken()` can parse a Bearer value but is not used by the middleware.
- Login signs a JWT with one-hour `exp`, but sets an auth cookie with 15-minute max age. The `_token` cookie is HttpOnly; defaults are `SameSite=Lax` and secure only in production (both configurable). Login nevertheless includes the token as `data.token` in its JSON response. A client adapter must suppress this field from model output and keep the credential in a trusted process boundary.
- Authenticated unsafe methods require matching readable CSRF cookie (default `_csrf_token`) and `x-csrf-token` or `x-xsrf-token`. Safe GET/HEAD/OPTIONS bypass CSRF. Cookie jar and CSRF synchronization must be owned by the trusted MCP host, not delegated to the model.
- Anonymous cart uses `_cart_session`, also HttpOnly, SameSite=Lax by default, with a 30-day max age. Clearing or losing that cookie loses the anonymous cart handle.
- Standard errors use `{errors:[...],data:{...}}`, but auth's invalid-JWT response and some success responses differ. Agent tool adapters should normalize failures and avoid returning full internal diagnostics.
- Checkout has no idempotency key. Payment webhook idempotency behavior is for a separate server-to-server route, not a substitute for client checkout idempotency.
- Guest receipt and email verification tokens are distinct capabilities. Guest access stops when an order is claimed (`CustomerId` is no longer null); email verification proves the account email and transfers orders matching normalized `mainContactEmail`. Do not substitute billing email, confirmation codes, or Discord identity for that proof.

## Recommended future MCP tool catalogue

The list below is a design input for later implementation. “Existing route” means there is a current candidate backing route, not that an MCP tool exists today.

| Candidate tool | Current backing route(s) | Availability and recommended consent |
|---|---|---|
| `search_experiences`, `get_experience`, `list_experience_dates`, `get_booking_enquiry` | Public `GET /api/experiences...` routes | User-facing reads; no confirmation, but report unavailable filter semantics honestly and disclose schedule synchronization side effects. Preserve returned timezone. |
| `get_current_account` | `GET /api/users/auth-user` | Requires a user-linked session; disclose only minimum necessary profile fields. |
| `get_organization_workspace`, `resolve_organization_invite` | `GET /api/organizers/workspace`, `GET /api/organizers/invites/resolve` | Read-only but workspace contains member/org information; require linked identity and protect invite details. Do not pass invite token/code to the model unless necessary; preferably resolve inside trusted host. |
| `create_organization_invite`, `resend_organization_invite`, `cancel_organization_invite` | `POST /api/organizers/invites`, `POST .../{id}/resend`, `DELETE .../{id}` | Require explicit confirmation naming organization, recipient, role, expiry or invite to cancel; enforce backend admin authorization. Never expose invite capability token/code in the model response. |
| `create_experience`, `get_experience_for_edit`, `update_experience`, `delete_experience` | `POST /api/experiences/manage`, `GET/PATCH/DELETE .../manage/{experienceId}` | Reads may be unconfirmed; create/update/delete require explicit confirmation with changed values and affected organization. Delete should require a stronger confirmation. |
| `assign_experience_organizers`, `preview_schedule_change`, `populate_experience_schedule`, `update_experience_start_date`, `set_experience_auto_sync`, `set_schedule_lookahead`, `set_session_sync_lock` | Experience management routes | Preview calls are read-only; all applied schedule/organizer/lock changes require explicit confirmation with target and scope. Preserve the controller's admin checks. |
| `get_cart`, `add_cart_item`, `update_cart_item`, `remove_cart_item`, `clear_cart` | `/api/cart` and `/api/cart/items` routes | Host owns an isolated account/guest session. Experience tickets only. Confirm changes if not directly requested; always confirm destructive clear/remove. Warn that GET cart can automatically remove legacy non-experience items. |
| `get_experience_comments`, `post_review_comment`, `edit_own_comment`, `delete_own_comment` | `/api/comments/...` | Reads are available but the `received/{commentableType}/{commentableId}` handler currently reads a different parameter (`userId`); verify/fix before a dependable read tool. Posting/editing/deleting requires linked auth and explicit confirmation for publishing user-generated content. |
| `upload_user_media` | `PUT /api/media/upload` | Authenticated raw image/MP4 upload for the current user only (maximum 6 MB, limited types/kinds). Organization branding uses user-owned organization-logo/organization-cover keys, not a separate org owner type. Confirm any upload before publishing/attaching media. |
| `checkout_cart` | `POST /api/cart/checkout` | Explicit confirmation is mandatory. Before submit, show exact products/experience session, ticket quantities, total/currency, billing/contact data, and that checkout may create a pending order. Never auto-retry without an idempotency contract; ideally add server-side idempotency before exposing this tool. |
| `list_orders`, `get_order`, `get_order_confirmation` | `GET /api/orders`, `GET /api/orders/{orderNumber}`, `GET .../{orderNumber}/confirmation` | User-linked session required; read-only and customer scoped. Redact unnecessary PII from model results. |
| `get_guest_receipt` | `POST /api/orders/guest-receipt` | Candidate host-mediated read using a privately stored order number/capability pair. Never ask the model or Discord chat to collect or return the token; minimize receipt PII. No explicit route limiter exists; add abuse controls before a public adapter exposes it. |
| `claim_guest_receipt` | Email-verification request/confirm routes | User-mediated email verification only, not a model-invoked token exchange. Explain the default linking preference, honor explicit opt-out and keep links/tokens outside model/chat/log context. |
| `lookup_receipt_by_confirmation_code` | **No current backing route** | Deferred; reservation confirmation code alone remains insufficient proof of ownership and must not be conflated with an order number or private receipt capability. |
| `register_account`, `login` | `PUT /api/users/register`, `POST /api/users/login` | Do not implement as model-invoked tools accepting passwords. Use a user-mediated secure sign-in/link flow outside model context. |
| `create_organizer_account_or_organization` | Onboarding start/complete | User-mediated flow only. Explicit consent before account/organization creation; never request credentials in model-visible tool arguments. |

## Recommended agent authentication and credential boundary

1. Do not send user passwords, raw JWTs, cookies, CSRF values, invite tokens, guest receipt capabilities, email-verification tokens, or payment secrets to the language model. Do not place them in prompts, tool outputs, logs, traces, or MCP resources.
2. Prefer a future user-consented OAuth 2.1 / PKCE authorization flow with short-lived, audience-bound, least-privilege delegated grants and revocation. Current API does not support this; it would need an API-side auth adapter or a trusted gateway. Do not claim `Authorization: Bearer` works today.
3. Until a first-party agent grant exists, any prototype must use an explicitly user-linked session in a trusted MCP host. The host—not the model—performs browser-mediated sign-in, stores the cookie jar securely, acquires/sends CSRF values for writes, and makes API calls. Session renewal, logout across devices, consent scope, audit logging, tenant selection and revocation remain design questions.
4. Restrict tools to the linked user's authorization and organization memberships. Continue enforcing server-side membership checks; never rely on the model to enforce tenant or role boundaries. Minimize PII returned to the model and record auditable tool intent/results without secrets.
5. Do not treat the public login JSON token as an acceptable MCP credential transport. If a host consumes the current login endpoint during a prototype, it must capture and protect the token without returning it to the model, while recognizing that the backend still requires cookie auth.

## Explicit confirmation policy

Always obtain an explicit, fresh user confirmation before creating/canceling/resending invitations; creating, editing, deleting, publishing, or assigning experiences; changing schedules or synchronization settings; mutating a cart when the specific change was not clearly requested; and submitting checkout/reservations. Confirmation must summarize organization/resource, changes, selected date/session, quantities, total/currency, and any PII being sent. Read-only public discovery and scoped order-history reads can proceed without confirmation once the user has linked the account. Account creation, organization creation, and sign-in require a separate user-mediated consent/authentication interaction; never ask the model to collect passwords.

## Open design questions for later implementation

- Will a first implementation use stdio or Streamable HTTP, and where does the trusted credential store live?
- What scopes and approval UI bind an agent to a specific user and organization? How are grants revoked and audited?
- Should a future adapter expose private guest receipts at all, given capability/PII handling and the lack of an explicit receipt route limiter? How will capability storage, revocation and abuse controls work?
- Does the product still require reservation-confirmation-code lookup, separate from the implemented order-number/capability and verified-email flows? A new contract would need ownership proof and enumeration protections.
- How should a future MCP host securely store and expire guest receipt capabilities and hand off verified-email ownership without exposing tokens to the model? Current receipt and verification contracts are documented; confirmation-code-only lookup remains unsupported.
- Can REST checkout gain an idempotency key and stable payment outcome/status contract before an agent invokes it?
- Which nested experience schedule, assignment, reservation and checkout schemas should be formalized before typed tools are generated?

## Research completion and handoff

The research phase is complete, not an MCP implementation. The current inventory, 51-operation OpenAPI subset, selected method/path and mount-prefix checks, and this memo are its deliverables. Tests do not establish runtime schema/auth correctness or discover every newly added route; refresh the explicit target set through source review when REST contracts change.

The follow-up basic social/Discord interface should start with public experience discovery, detail and dates plus a handoff to the booking website. It can call REST directly without an MCP server, user credentials or receipt capabilities. In-chat purchase, account linking and private receipt tools are separate scope decisions, not implied by this research completion.
