# Existing booking API inventory for MCP research

This inventory reflects route registrations, controller/service behavior and middleware in the current `backend/server/` tree. It describes the REST API as found; it does not propose or implement contract changes. Route base paths come from `server/app.js`. Source-specific details and unresolved behavior are called out rather than inferred.

Refreshed 2026-10-27 after the [Guest Checkout Epic](../../../epics/guest-checkout/index.md) completed and public chat endpoint was added. The database-free contract test checks selected method/path registrations and mount prefixes, not every middleware detail or response schema.

## Authentication, CSRF, errors, and limits

- `server/routes/users.js` mounts at `/api/users`; `POST /api/users/login` and `PUT /api/users/register` are public. Protected `authUser` in `middlewares/auth.js` reads only `req.cookies._token`; it does not accept an Authorization/Bearer header. Missing token returns 401 `{data:{isAuthenticated:false,userDetails:{}},errors:[...]}`; invalid token returns 403 `{status:"Validation of token failed"}`.
- Login accepts `{username,password,organizationUsername?}`. It sets `_token` as HttpOnly cookie and a readable CSRF cookie (default `_csrf_token`) and returns `{data:{token},errors:[]}`. `generateNewToken` signs a JWT with a one-hour expiry; auth cookie max-age is 15 minutes. Cookie `secure` defaults to production mode, `sameSite` defaults to `lax`, and `COOKIE_DOMAIN` optionally sets domain. The token response body is sensitive even though the cookie is HttpOnly; do not expose it to an agent model. Registration validates fields in `utils/validators.js` and returns 201 `{errors:[],data:{status:"Registration Successful"}}`; it does not issue a session.
- `middlewares/csrf.js` is global in `app.js`, after cookie parsing. GET/HEAD/OPTIONS bypass it. For other methods with `_token` cookie present, request must carry matching `_csrf_token` cookie and `x-csrf-token` or `x-xsrf-token` header; failure is 403 `{errors:["Invalid or missing CSRF token"],data:{}}`. Unauthenticated writes pass this middleware but may then be rejected by route auth. CORS allows configured origins and credentials; default origins are localhost:3000, localhost, and frontend.
- Standard `sendError` responses are `{errors:[message],data:{...requestId?}}`; many validation paths also return `{errors:[...],data:{}}`. Not every legacy handler uses the envelope (e.g. logout success, auth middleware invalid-token branch), so callers must not assume uniformity. `requestId` is returned by `sendError` only when supplied; app sets `X-Request-Id` on requests.
- Fixed-window rate-limit middleware uses Redis when available and in-memory fallback otherwise. Login: default 10 / 15 min, keyed by username or IP if absent. Registration: 10 / hour / IP. Organizer onboarding start/complete: 8 / hour / IP. Invite resolution: 30 / 15 min / IP. Invite create/resend/cancel: default 20 / 15 min (environment-overridable). Public chat: default 20 / 15 min / IP. The limiter key is requesting user + organization for create (organization ID is in the request body), but resend/cancel requests have no organizationId body field and therefore share the requesting user's `unknown-org` bucket. Limits return 429, `Retry-After`, `{errors:[message],data:{limit,windowMs}}`. No explicit rate limiter is registered on experience management, cart, checkout, or order lookup routes.

## Public website chat

| Method and route | Handler / auth | Request | Success and notable errors |
|---|---|---|---|
| `POST /api/chat` | `routes/chat.js`; public + chat rate limiter (default 20 / 15 min / IP) | `{messages:[{role:"user"|"assistant",content}]}`. Must alternate roles, start/end with user, at most 15 messages, 1200 characters per message and 6000 characters total. | 200 `{errors:[],data:{message}}`; 400 for invalid conversation, 429 for rate limit, 502 for provider/upstream failure, 503 if `OPENAI_API_KEY` is not configured. Messages and public experience data are sent to OpenAI; conversation is not persisted. The LangChain agent has only the three public MCP experience discovery tools and cannot book, charge payment, access accounts, or retrieve private information. |

## Login and registration

| Method and route | Handler / auth | Request | Success and notable errors |
|---|---|---|---|
| `PUT /api/users/register` | `User.controller.registerUser` â†’ `User.service.createUser`; public + registration limiter | JSON: `firstName`, `lastName`, `email`, `username`, `password`, `phoneNumber`, `country`. Validator requires all; username 3â€“30 chars `[a-z0-9._-]`, phone is US-style 10 digits with optional punctuation, password at least 8 chars including lower/upper/digit and one of `$@#&!`. | 201 `{errors:[],data:{status:"Registration Successful"}}`; validation 400, duplicate/other service errors vary through `sendError`. Does not authenticate automatically. |
| `POST /api/users/login` | `User.controller.loginUser` â†’ `User.service.authenticateUser`; public + login limiter | JSON `{username,password,organizationUsername?}`; missing username/password gives 400. | 200 `{data:{token},errors:[]}` plus `_token` and CSRF cookies. Auth/service failures are `sendError`; limiter 429. `organizationUsername` is passed to the service, but its selection behavior is not further specified here. |

## Wave 1 account verification and recovery

Emails are trimmed/lowercased and unique across customer and organizer registrations (validator plus database unique index). Registration starts email verification without creating a session; sign-in merges the cookie-backed guest cart into the account cart without duplicating selections.

| Method and route | Handler / auth | Request | Success and notable errors |
|---|---|---|---|
| `POST /api/users/email-verification/request` | Public, shared forgot-password limiter (default 8/hour/IP); `{email}` | 200 generic anti-enumeration message regardless of missing/already-verified account. Sends an unverified account a 24-hour verification link; only its token hash is stored. Delivery failure behavior is service-specific; unexpected failure 500; limiter 429. |
| `POST /api/users/email-verification/confirm` | Public capability exchange; `{token}` (32–256 characters) | 200 `{errors:[],data:{emailVerified:true,claimedOrderCount}}`. Purpose-specific hashed tokens expire after 24 hours. Claiming is transactional and transfers unclaimed orders matching normalized `mainContactEmail`, excluding orders explicitly opted out with `saveBookingForLater:false`. Invalid, used or expired token 400; does not log in the caller. |
| `POST /api/users/forgot-password` | Public, forgot-password limiter; `{email}` | 200 generic response for existing/unknown addresses; missing email 400. Reset token expires after one hour. |
| `GET /api/users/reset-password/{token}` | Public token validation | 200 `{errors:[],data:{valid,...}}`; invalid/expired links do not authorize a reset. |
| `POST /api/users/reset-password` | Public capability exchange; `{token,newPassword,email?}` | 200 `data.status:"Password updated"`; new password minimum six characters. Optional email constrains the token account after normalization; invalid/expired/reused tokens rejected. `/api/users/reset` is a compatibility alias outside the target route subset. |

Email links use configured `FRONTEND_BASE_URL` (development default `http://localhost:8080`), with legacy `FRONTEND_URL` fallback. Unlike browser navigation, emailed links cannot infer the recipient device's hostname.

These are user-mediated email proof flows, not a Discord-account or agent grant. Email equality alone is not ownership proof. Global CSRF applies to either public POST when an auth cookie is present.

## Organization creation/onboarding and invitations

There is no standalone organization-create route. Creation is the `mode:"create"` branch of onboarding completion; `mode:"invite"` accepts a member into an existing organization.

| Method and route | Handler / auth | Request | Success and notable errors |
|---|---|---|---|
| `POST /api/organizers/onboarding/start` | `Organizer.controller.startOnboarding` â†’ `Organizer.service.startOnboardingService`; public + onboarding limiter | `{mode:"create"|"invite",email,inviteToken?,inviteCode?}`. Invite mode requires one invite credential; email is normalized. | 200 returns `{errors:[],data:{mode,email}}` for create, or invite organization/role/token details for invite. Invalid/existing user: 400/409; missing/inactive invite: 404. |
| `POST /api/organizers/onboarding/complete` | `Organizer.controller.completeOnboarding` â†’ `completeOnboardingService`; public + onboarding limiter | User fields: `firstName,lastName,email,username,password,phoneNumber,country`; also `mode`, optional `organizerDescription`, invite credential for invite mode; create mode requires `organization:{name,email,organizationUsername?,locationId?}` (location is optional per service). | 201 `{errors:[],data:{userId,organizationId,isAdmin}}`; sets auth and CSRF cookies. Validation/eligibility failures use `{errors,data:{}}`; create branch validates name/email and username (3â€“30 lowercase alphanumeric); invite branch uses matching active invite. |
| `GET /api/organizers/invites/resolve` | `Organizer.controller.resolveInvite` â†’ `resolveInviteService`; public + invite-resolution limiter | Query `token` or `code`; optional `email`. | 200 `{errors:[],data:{organization:{id,name,email},email,role,expiresAt,token,code}}`; malformed/missing credential 400, absent/expired/used invite 404. |
| `POST /api/organizers/invites` | `createInvite` â†’ `createInviteService`; `authUser`, then limiter; service requires organization admin | `{organizationId,email,role?="member",expiresInDays?=7}`; roles `member|admin`, duration clamped 1â€“30 days. | 201 includes invite ID, org ID/name, email, code, token, URL, expiry, delivery result. 400/403/404 for invalid input, non-admin, or missing organization. Invite code/token are sensitive capabilities. |
| `POST /api/organizers/invites/{id}/resend` | `resendInvite` â†’ `resendInviteService`; authenticated, service checks org admin | Path invite ID; no body fields consumed by controller. | 200 `{errors:[],data:{inviteId,email,delivery}}`; 400 used/expired or invalid ID; 403/404. |
| `DELETE /api/organizers/invites/{id}` | `cancelInvite` â†’ `cancelInviteService`; authenticated, service checks org admin | Path invite ID. | 200 `{errors:[],data:{deleted:true}}`; used invite rejected; 403/404. |

## Experiences and management

`/api/experiences` routes and middleware are in `routes/experiences.js`; handlers are split across `Experience.controller.js`, `ExperienceManage.controller.js`, `offering-manage.shared.js`, and `Scheduler.service.js`. Public discovery/enquiry/schedule routes have no `authUser` middleware. Management routes require cookie auth and organization-admin membership (`organization-auth.js` for create; `experience-auth.js` for edit/read/delete/most experience-ID actions). Schedule-lock route has `authUser` and checks admin membership in its controller.

| Method and route | Handler / auth | Request and response evidence |
|---|---|---|
| `GET /api/experiences/` | `getAllExperiences`; public | Query/filter/pagination details are implemented in controller; success returns experience list envelope. Exact supported query contract needs per-filter documentation; see unknowns. |
| `GET /api/experiences/verticalFilters`, `/availableCities`, `/nearbyExperiences` | `getVerticalFilters`, `getCities`, `getNearbyExperiences`; public | Query parameters are controller-defined; response is JSON discovery/filter data. Exact schemas are not established in this Epic. |
| `GET /api/experiences/{experienceCode}` | `getExperienceByCode`; public | Path `experienceCode`; returns experience detail or error envelope. |
| `GET /api/experiences/{experienceCode}/schedule` and `/schedule/calendar` | `getScheduledExperiences`, `getScheduledExperiencesCalendarSummary`; public | Schedule query: `currentPage` (default 1), `pageSize` (default 6), `startDate` (date in schedule timezone); returns `{elements,paging:{currentPage,totalPages,pageSize},metadata:{totalResults,timezone}}`. Calendar query: `month` (`YYYY-MM`); returns `{elements:[{date,status:"open"|"full"}],metadata:{month,timezone,totalDays}}`. Neither uses the common `errors/data` success envelope. Both may synchronize/populate schedules when no sessions are found: GET is not a guarantee of no backend writes. |
| `GET /api/experiences/{experienceCode}/booking/enquiry` | `getExperienceBookingEnquiry`; public | Path code; returns enquiry data. Request query schema not fully specified in this inventory. |
| `POST /api/experiences/{experienceCode}/reservations` | `createExperienceReservation`; public route, DB-backed reservation controller | Supports new flow `{scheduledExperienceId,mainContact,ticketSelections,billing,...}` and legacy `attendees` + `mainContactIndex`. Billing and phone validation are required. Controller calculates ticket totals and validates selected tiers. Success/error shapes use `errors` and `data`; do not assume client-supplied `totalPrice` is authoritative. This is a separate direct reservation contract, not `/cart/checkout`. |
| `POST /api/experiences/manage` | `createExperience`; `authUser` + `requireOrganizationAdmin` | Body normalized from `title,capacity,duration,subtitle,description,thumbnail,images,ratings,organizationId,locationId`, optional `userQuestionnary,schedules,ticketTiers`. Organization in payload must match admin context; location must belong to org. 201 `{errors:[],data:{experience}}`. |
| `GET /api/experiences/manage/{experienceId}` | `getExperienceForEdit`; auth + experience-org-admin | Path numeric ID. Returns `data.experience` including fields, Location, TicketTiers, ScheduleTemplates, PickedOccurrences, Organizers. |
| `PATCH /api/experiences/manage/{experienceId}` / `DELETE .../{experienceId}` | `updateExperience` / `deleteExperience`; auth + experience-org-admin | Patch supports normalized base fields and optional `userQuestionnary`, replacement `schedules`, and replacement `ticketTiers`; delete removes experience only under controller/service constraints. Both return `{errors,data}`. |
| `PATCH /api/experiences/manage/{experienceId}/assign-organizers` | shared assign-organizers handler; auth + experience-org-admin | Assignment payload specifics in `offering-manage.shared.js`; response shape comes from that handler. |
| `POST /api/experiences/manage/{experienceId}/sync-schedule` | shared managed schedule handler; auth + experience-org-admin | Triggers managed schedule sync; body/response details live in shared handler. |
| `POST /api/experiences/manage/{experienceId}/schedule/preview-populate` and `/schedule/populate` | `previewPopulateSchedule` / `populateSchedule`; auth + experience-org-admin | Body `{templateId,startDate,endDate}`; preview is dry run, populate mutates schedule. Returns `{errors:[],data:<scheduler result>}`. |
| `POST /api/experiences/manage/{experienceId}/schedule/preview-start-date` and `/schedule/update-start-date` | `previewStartDate` / `confirmStartDate`; auth + experience-org-admin | Body `{newStartDate}`; confirmation also consumes `cancelEmptySessions` boolean. Preview is non-mutating; update applies changes. |
| `PATCH /api/experiences/manage/{experienceId}/auto-sync` | `toggleAutoSync`; auth + experience-org-admin | `{enabled:boolean}`; returns `data.autoSyncEnabled`. |
| `PATCH /api/experiences/manage/{experienceId}/lookahead` | `updateLookahead`; auth + experience-org-admin | `{days:integer}` in 1â€“730; returns `data.scheduleLookaheadDays`. |
| `PATCH /api/experiences/manage/scheduled-experiences/{sessionId}/sync-lock` | `toggleSessionSyncLock`; auth; controller verifies organization admin | `{locked:boolean}`; returns `data.syncLocked`. |

## Experience comments and media support routes

The Epic scope also names comments and media route modules because experience profiles and management may link to these services. These are adjacent routes, not a confirmation-code receipt API. They have no explicit rate limiter unless noted by the comment service result.

| Method and route | Handler / auth | Request / response evidence |
|---|---|---|
| `GET /api/comments/received/{commentableType}/{commentableId}` | `getCommentsBySource`; public | Controller currently reads only `req.params.userId`, which this route does not define; actual behavior for its advertised source IDs is a code-level mismatch requiring correction/verification. Query accepts `currentPage` (default 1), `pageSize` (default 5). Success returns `{errors,data,metadata,paging}`. |
| `GET /api/comments/sent/{userId}` | `getCommentsBySource`; public | Path `userId`; query `currentPage` (default 1), `pageSize` (default 5). Returns `{errors,data,metadata,paging}`. |
| `GET /api/comments/parent/{parentId}/replies` | `getRepliesByParent`; public | Path `parentId`; query `page` (default 1), `pageSize` (default 100), optional `limit`. Returns `{errors,data,metadata,paging}`. |
| `GET /api/comments/eligibility` | `getReviewEligibility`; `authUser` | Query requires `commentableType` and `commentableId`. Controller returns service JSON directly; precise shape is not declared in this handler. |
| `POST /api/comments/{commentableType}/{commentableId}` | `postComment`; `authUser` | Body fields consumed: `stars,title,comment,ParentId,anonymity,images`. Success 201 `{errors,data}`; service may return 429 `{errors:[...]}`; several non-success responses omit `data`. |
| `PUT /api/comments/{id}` / `DELETE /api/comments/{id}` | `updateComment` / `deleteComment`; `authUser` | Update body consumes `comment,title,stars,anonymity,images`. Delete can return 204 empty response. Service performs operation-specific authorization; endpoint is not rate-limited in router. |
| `PUT /api/media/upload` | `uploadMedia`; `authUser` | Raw JPEG/PNG/WebP/GIF/AVIF or MP4 bytes, body limit 6 MB; query `ownerType=user,ownerId,kind?`. Only own user ID is allowed; supported kinds include `asset,profile,experience-thumbnail,experience-gallery,review-image,organization-logo,organization-cover`. Unsupported content type is 415; successful upload returns 201 `{errors:[],data:{objectKey,url,contentType,size}}`. No route-level limiter. |
| `GET /api/media/object/*` | `getMediaObject`; public | Wildcard object key; validates allowed key prefixes and reads through configured storage worker. Returns binary media with content type/cache headers; unavailable storage gives 500/502, unknown object 404. |
## Cart, checkout, and receipt/order lookup

Cart handlers in `Cart.controller.js` accept authenticated customers and anonymous cookie-backed carts. Checkout uses optional cookie auth; guests must possess the cart session cookie. These routes have no explicit rate limiter. No client-supplied idempotency key is read by the checkout controller/service. New cart items and checkout support experience tickets only; historical hotel/service orders remain readable.

| Method and route | Handler / auth | Request | Success and notable errors |
|---|---|---|---|
| `GET /api/cart` | `getCart`; optional cookie auth | No body. Uses an existing `_cart_session`; without owner/session returns null and does not create a cart cookie. | 200 `{errors:[],data:{cart,notice?}}`. Loading an active cart removes legacy hotel/service items and recomputes totals, returning a notice; this GET can mutate state. |
| `POST /api/cart/items` | `addItem`; optional cookie auth | `{ProductType:"Experience",ProductId?,description,unitPrice,quantity?=1,metadata}`. Requires positive `ScheduledExperienceId`, non-empty `ticketSelections` (positive tier IDs/quantities), with quantities summing to item quantity. Non-experience items are rejected. The phone check rejects truthy whitespace-only `mainContact.phone`, not every missing phone. | 201 `{errors:[],data:{item,cartTotal}}`; input errors 400. Creates `_cart_session` when needed (HttpOnly, SameSite=Lax, secure in production, 30 days). |
| `PATCH /api/cart/items/{id}` | `updateItem`; optional cookie auth | `{quantity?,metadata?}`; active owned cart required. | 200 `{errors:[],data:{item}}`; 401/404/400 as applicable. |
| `DELETE /api/cart/items/{id}` / `DELETE /api/cart` | `removeItem` / `clearCart`; optional cookie auth | No body; active owned cart required. | 200 data message; missing session/cart/item errors use `sendError`. |
| `POST /api/cart/checkout` | `Order.controller.initiateCheckout` → `Checkout.service.checkoutCart`; optional cookie auth | `{cartId,billingInfo:{email,name,address,city,state,postalCode,...},contact?,saveBookingForLater?}`. Boolean guest preference defaults true; non-boolean is 400. Ownership is checked by customer ID or guest session. | 201 returns `orderId,orderNumber,status,totalAmount,mainContactName,mainContactPhone,mainContactEmail,items,confirmationEmail`; guests additionally receive `guestReceiptToken` and `saveBookingForLater`. Empty/missing cart or non-experience items 400; insufficient inventory 409; no guest cart session 401. Receipt capability is random, stored as a SHA-256 hash with 30-day expiry, and must remain private. SMTP is attempted after commit with bounded timeouts; failure records status but does not invalidate the pending order. |
| `POST /api/orders/guest-receipt` | `Order.controller.getGuestOrder`; no customer session required, no explicit route limiter | `{orderNumber,receiptToken}` in JSON (never URL); token is returned once at checkout and persisted as a hash | 200 `{errors:[],data:{order}}` for an unclaimed (`CustomerId:null`) order with matching unexpired token. Private metadata/hash are omitted; response includes confirmation email status. Missing input 400; invalid/expired/claimed/missing order 404; unexpected failure 500. Requires neither cart cookie nor account session; CSRF applies if `_token` is present. |
| `GET /api/orders/{orderNumber}/confirmation` | `getOrderConfirmation`; `authUser` | Path order number; constrained to `CustomerId=req.user.id`. | 200 returns order ID/number/status/amount/contact/items. 404 for other/missing orders; no lookup by reservation confirmation code. |
| `GET /api/orders/{orderNumber}` and `GET /api/orders` | `getOrder`, `listOrders`; `authUser` | Path order number; list accepts `page` (default 1) and `limit` (default 10, max 50). | 200 order or paginated list `{orders,pagination}`; 404 or standard error. These are customer-scoped. |

## Verified gaps / unknowns

- No route in the inspected `users`, `organizers`, `experiences`, `cart`, or `orders` routers accepts Bearer JWT credentials; current auth is cookie-only. The exported `getToken` helper parses Bearer but `authUser` does not use it.
- No route queries a receipt/reservation by reservation `confirmationCode`. The existing order confirmation route takes `orderNumber` and requires the authenticated customer. `confirmationCode` is generated for reservation records and included inside order-item reservation relations.
- Cart session identity and CSRF both rely on cookies. An agent operating without a cookie jar cannot directly use cart operations; authenticated unsafe requests need a CSRF cookie/header pair.
- No idempotency key is handled by checkout. A separate payment webhook has event/payment-reference handling, but it is not the client checkout contract and is not included in the MCP-facing spec.
- Guest checkout, capability-based receipt access, and email-verified ownership transfer are implemented as described above. Email equality or an order/reservation number alone is not proof: guest reading needs the receipt capability; account association requires the verification token and excludes explicit linking opt-outs. These flows do not provide lookup by reservation confirmation code alone, delegated agent credentials, or Discord account linking. Diagnostic email failure banners appear only in development builds; persisted statuses/logs remain available in production.
- Exact discovery filter schemas, complete `schedules`/`ticketTiers` nested validation, organizer-assignment payload, managed schedule-sync payload, checkout contact nesting, and all validation/error variants need additional source-level or runtime verification before client SDK generation. A GET-only development smoke is intentionally separate from DB-backed contract tests.

## Public organization sites and branding

| Method and route | Auth / contract |
|---|---|
| `GET /api/organization-sites/{slug}` | Public. Lowercases incoming slug and rejects reserved/invalid values. Selects only ID/name and branding fields, plus experiences with upcoming `scheduled` sessions. Returns `{errors:[],data:{organization,experiences}}`; unknown site 404; valid empty sites return 200. No private member/account email is included; explicitly published contact links are public. |
| `GET /api/organization-sites/admin/{organizationId}/branding` | `authUser` plus organization-admin membership. Returns safe branding attributes only. |
| `PATCH /api/organization-sites/admin/{organizationId}/branding` | Same admin guard plus global CSRF. Partial fields: `slug,logoMediaKey,coverMediaKey,coverMediaType,primaryColor,accentColor,font,tagline,about,socialLinks,contactLinks,layoutTemplate`. Unknown fields rejected (400); unique slug conflict 409. Media references must be uploaded by the acting admin. Hex colors; supported font/layout allow-lists; tagline <=160 and about <=4000 chars; contact/social links validated (HTTPS except email/phone); no arbitrary HTML/CSS. |

Public browser pages use `/o/{slug}` on localhost/LAN and the active origin for experience links. Experience detail exposes only `Organization.name` and `Organization.slug` for its host profile link. Production wildcard DNS/tunnel activation remains explicitly deferred to launch.

## Running the database-free route check in Docker

From the repository root, mount the contract documents read-only for a disposable backend test container:

```powershell
docker compose run --rm --no-deps -v "${PWD}\docs:/contracts:ro" -e API_CONTRACT_DOCS_ROOT=/contracts backend npx jest tests/api-openapi-contract.test.js --runInBand
```

The test parses route source and the JSON subset of YAML without initializing the application or database. It covers the explicit target operation set, not every route or runtime authorization behavior.
