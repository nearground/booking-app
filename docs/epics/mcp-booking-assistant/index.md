---
title: "MCP booking assistant: API research"
work_id: "EPIC-mcp-booking-assistant"
work_type: epic
template_version: 1
status: done
parent: null
branch: "epic/mcp-booking-assistant"
depends_on: []
---

# MCP booking assistant: API research

## Outcome and MVP traceability

Initial phase produces a verified map of the existing REST API that a future MCP server would wrap, so MCP tool scope can be decided incrementally as features land. Target capabilities (MVP item 8): login/registration, organization creation, organization invites, experiences and their management, ticket purchase, receipt lookup by confirmation code.

## Scope and non-goals

Decision (user, 2026-10-26): MCP agent scope is worked out as work progresses; initial planning focuses on researching the API itself.

In scope:

- API inventory: for each target capability, verified routes in `backend/server/routes/` (`users.js`, `organizers.js`, `experiences.js`, `cart.js`, `orders.js`), controller/service, auth middleware (`auth.js`, `organization-auth.js`, `experience-auth.js`, CSRF), request/response shapes, error format, rate limits and cookie/JWT behavior.
- Machine-readable OpenAPI spec for these routes, with a Jest check against actual Express route definitions that needs no database.
- Gap analysis: cookie-only account auth, CSRF assumptions, missing idempotency keys, implemented guest checkout/receipt/email-verification contracts, and the still-missing reservation-confirmation-code lookup endpoint.
- Recommendation memo: candidate MCP tool list per capability, suggested auth model for agent clients and which actions need explicit user confirmation, as input for later Stories.

Non-goals for this phase: building the MCP server, changing REST contracts, issuing agent credentials, or changing production behavior.

## Acceptance criteria

- [x] API inventory covers every target capability with verified route, auth requirement, inputs, outputs and errors; unknowns are listed, not guessed.
- [x] OpenAPI spec for those routes exists and an automated database-free test detects selected route/method drift against Express router definitions.
- [x] Gap analysis and MCP recommendation memo are published and linked from this Epic.
- [x] No production code behavior changes in this phase.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `docs/reference/contracts/api/**` (inventory, OpenAPI, memo); a read-only API contract test under `backend/tests/`.
- Shared files/contracts and owner: REST owners remain authoritative; this Epic documents them. Guest-checkout Epic owns receipt claim/lookup; its landed contracts are now included in the inventory, spec and memo.
- Parallel-ready assessment: Parallel-ready now; read-only with respect to application code.

## Dependencies and integration

No prerequisite for research. Receipt/checkout portions have been refreshed after the completed guest-checkout Epic. MCP server implementation remains a separate future scope decision; this Epic's completion does not imply a running MCP server.

## User Stories

<!-- children:start -->
- [STORY-001: Understand the existing booking API contracts](stories/STORY-001-api-contract-inventory/index.md)
- [STORY-002: Identify MCP client capabilities and safety boundaries](stories/STORY-002-mcp-client-gaps/index.md)
<!-- children:end -->

## Risks, assumptions and open questions

- Assumption: future MCP tools call the REST API, never the database directly, and never expose passwords or reusable JWTs to the model.
- Risk: spec drift as other Epics change routes; mitigated by the automated contract check.
- Deferred until implementation: transport (stdio vs. Streamable HTTP), agent identity/consent model, implementation of the recommended confirmation policy, and any new confirmation-code-only lookup contract.

## Deliverables

- [API inventory](../../reference/contracts/api/inventory.md)
- [OpenAPI route subset](../../reference/contracts/api/openapi.yaml)
- [MCP gap analysis and tool recommendation](../../reference/contracts/api/mcp-gap-analysis.md)
- `backend/tests/api-openapi-contract.test.js` (database-free route/method drift check)

## Verification and completion evidence

2026-10-27: Both Stories and all three Tasks were reviewed explicitly against the four acceptance criteria after refreshing current REST contracts. The 51-operation OpenAPI subset and DB-free registration test cover selected method/path pairs in their owning routers plus mount prefixes, not runtime response/schema/auth validation or automatic discovery of new routes. Full backend Jest passed (34 suites, 342 tests); scoped contract tests passed (3 tests); planning validation and all 7 planner tests passed. Changed-test ESLint passed with Jest globals enabled. No production source was changed.

No runtime smoke was performed or required. GET cart and schedule endpoints can mutate backend state, so GET-only is not equivalent to side-effect-free. The memo remains input to future MCP scope approval; this Epic does not implement a server. Task attribution uses exact `Work-Item:` trailers in Git, as required by the planning SOP; no manual commit registry is added.

## Progress and decisions

- 2026-10-27: Completed research closure: consumed guest-checkout contracts, corrected stale auth/cart/receipt findings, refreshed safety recommendations, and verified parent acceptance independently of child statuses. Follow-up direction: a basic Discord REST discovery interface with browser booking handoff; bot implementation and private account operations are not part of this Epic.
- 2026-10-26: Expanded Epic into two Stories and three Tasks; the API inventory, OpenAPI route contract/test, and MCP gap/tool recommendation are complete; planning validation and all 265 backend Jest tests pass. No production behavior was changed.
- 2026-10-26: Scope narrowed by user to API research first; MCP scope decided incrementally.
