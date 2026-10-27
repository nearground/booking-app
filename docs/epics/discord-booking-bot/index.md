---
title: "Basic Discord booking API interface"
work_id: "EPIC-discord-booking-bot"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "epic/discord-booking-bot"
depends_on: ["EPIC-mcp-booking-assistant"]
---

# Basic Discord booking API interface

## Outcome and MVP traceability

Users can discover experiences, inspect an experience and its scheduled dates in Discord, then follow a trusted link to finish booking in the existing web application. This is the requested basic social-media/Discord interface between users and the booking REST API, following the completed [MCP API research Epic](../mcp-booking-assistant/index.md).

MVP assumption for approval: Discord is the first social platform and browser booking handoff satisfies the basic booking interface. In-Discord purchases and additional platforms require separate approval and scope.

## Scope and non-goals

In scope:

- A small Discord slash-command interface for experience search, detail and dates. Candidate names: `/experiences search`, `/experiences show`, `/experiences dates`; finalize names when Stories are expanded.
- A narrow REST adapter using existing public `GET /api/experiences`, `GET /api/experiences/{experienceCode}` and `GET /api/experiences/{experienceCode}/schedule` (calendar summary only if needed). Verify the selected query/response fields from controllers before implementation; do not generate a client from partial schemas.
- Bounded/paginated results, timezone-aware dates, empty/error states, and a booking link to the configured frontend origin. The existing frontend route is `/experience/:experienceId`; confirm the correct API-to-route identifier mapping rather than assuming a reservation confirmation code works.
- Platform-neutral result mapping separated from Discord formatting, without building a multi-platform framework.
- Command registration, secrets/configuration, deployment and operational documentation, plus adapter/interaction regression tests.

Non-goals: MCP server or transport, LLM integration, account linking/login/registration, password collection, organization administration, cart/reservation/checkout writes, payments, private order/receipt lookup, email-verification or invite handling, other social platforms, direct database access, and changes to production REST contracts.

## Acceptance criteria

- [ ] Given a valid search command, the bot calls the verified public experience-list contract and returns bounded results with explicit paging; empty results and invalid input receive useful responses.
- [ ] Given a valid experience identifier, detail and dates commands return the expected public fields, distinguish missing data from API failures, and display dates in the API-provided timezone. Schedule and detail response envelopes are mapped separately.
- [ ] Given a result, its booking link uses only the configured trusted frontend origin and validated experience identifier; following it opens the correct experience page to continue booking.
- [ ] Given a timeout, upstream 429/5xx, malformed response or Discord/API outage, the bot produces a controlled response, respects platform acknowledgement deadlines, and uses bounded retries/backoff for approved public reads only.
- [ ] Given untrusted experience text, formatting prevents unintended mentions and unsafe link injection. Only allowlisted public fields are rendered; credentials, cookies, receipt capabilities and customer PII never enter messages or logs.
- [ ] Given deployment configuration, command registration and a controlled test guild, the documented discovery → detail/dates → website handoff smoke succeeds. Automated tests cover success, empty results, pagination, invalid IDs, response variants, timezones and failure/redaction cases.
- [ ] Operator documentation covers configuration/secrets, command registration/removal, health/error diagnostics without sensitive data, API/Discord rate limits, deployment/rollback and smoke verification. No booking-account session or shared user cookie jar is introduced.

## Branch independence and ownership

- Baseline: `main` containing the completed MCP research; record the exact baseline commit before implementation. This planning change creates no branch or runtime.
- Owned paths: this Epic subtree; proposed isolated `integrations/discord-bot/**` for runtime, tests, package/configuration and operator documentation. Confirm the new integration boundary when expanding Stories; scaffold with standard ecosystem tools.
- Shared files/contracts and owner: REST owners retain `backend/server/**`; the MCP research owns `docs/reference/contracts/api/**`. Consume those contracts without modifying routes, auth, schemas, frontend routing or shared deployment configuration. Negotiate any shared-file change explicitly.
- Parallel-ready assessment: research dependency is complete; planning can proceed. Runtime implementation waits for draft decisions and Story/Task approval. The isolated integration can then proceed without unmerged MCP runtime work.

## Dependencies and integration

Depends on `EPIC-mcp-booking-assistant` for verified route evidence and safety boundaries, not on an MCP implementation. Consume the [API inventory](../../reference/contracts/api/inventory.md), [OpenAPI subset](../../reference/contracts/api/openapi.yaml), and [MCP safety memo](../../reference/contracts/api/mcp-gap-analysis.md).

No dependency on authenticated checkout or guest receipt capabilities for this slice. Calls go through REST only, using a fixed configured API origin and allowlisted paths/query parameters; do not follow user-supplied URLs or send Discord credentials to the booking API.

Schedule GETs may trigger server-side schedule synchronization when empty. The bot submits no explicit booking mutations, but must not claim these endpoints are side-effect-free. Restrict retries, cache/coalesce requests where appropriate, and agree request limits with the API owner.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Approval needed: does discovery plus browser handoff satisfy “basic,” or is an in-Discord booking action required? The latter needs separate identity/session isolation, consent, PII and non-idempotent checkout design.
- Decide Discord interaction transport/library, hosting and operational owner, command names, guild-only versus wider availability, and application permissions before implementation. Prefer slash commands and least privilege; do not require message-content access without a demonstrated need.
- The Discord application token and any interaction verification material remain server-side in deployment secrets, never committed, logged or sent to the booking API. Verify incoming interactions according to the chosen transport and bind any interactive paging controls to the initiating user/context.
- Discord identity is not booking-account ownership. Do not collect login passwords, receipt tokens, verification links or billing information in chat, including direct messages.
- Existing discovery schemas are partial. Confirm exact search filters, pagination, detail envelope, date fields and identifiers against controller source and tests; show unavailable information honestly.
- Untrusted API text and command inputs require length limits, mention suppression, safe formatting and strict URL construction. Apply bounded request rates/timeouts and avoid logging full interaction payloads.
- Availability shown by the bot is informational, not an inventory hold, price guarantee or successful booking. The website remains the authoritative checkout.

## Verification and completion evidence

Planning artifact only; no bot exists yet and no implementation acceptance criteria are marked complete. Scaffolded with `scripts/planning.mjs` from the versioned Epic template.

2026-10-27 planning verification: 62 work documents validated; all 7 planner tests and 7 work-dashboard Git attribution tests passed; the Docusaurus production build succeeded. The generated index discovers this Epic and its completed research dependency without a manual registry edit. These checks validate publication/tracking, not a Discord runtime.

Before delivery, record exact approved commands/contracts, existing project-supported automated test results, a controlled Discord test-guild smoke with website handoff, security/secret checks, and operational documentation in the owning Tasks. Expand into independently verifiable Stories/Tasks only when requested; use exact full Task `Work-Item:` trailers on implementation commits per the [workflow](../../planning/workflow.md).

## Progress and decisions

- Draft created; not approved for implementation.
- 2026-10-27: Follow-up Epic requested during MCP research closure. Proposed the smallest public REST interface, with explicit browser handoff and private-account/write operations excluded pending approval. No child Stories/Tasks were expanded; no package dependencies, Discord runtime or credentials were installed or provisioned.