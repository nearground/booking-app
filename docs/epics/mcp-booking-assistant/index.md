---
title: "MCP booking assistant: API research"
work_id: "EPIC-mcp-booking-assistant"
work_type: epic
template_version: 1
status: draft
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

- API inventory: for each target capability, the routes in `backend/server/routes/` (`users.js`, `organizers.js`, `experiences.js`, `cart.js`, `orders.js`, `comments.js`, `media.js`), controller/service, auth middleware (`middlewares/auth.js`, `organization-auth.js`, `experience-auth.js`), request/response shapes, error format, rate limits and cookie/JWT behavior.
- Machine-readable spec: an OpenAPI document generated from or verified against the real routes, kept in `docs/reference/contracts/` (see the Docusaurus Epic), with a check that flags drift.
- Gap analysis: what a non-browser client cannot do today (cookie-only auth, CSRF assumptions, missing idempotency keys, guest checkout and receipt lookup contracts pending in the guest-checkout Epic, no confirmation-code lookup endpoint, etc.).
- Recommendation memo: candidate MCP tool list per capability, suggested auth model for agent clients and which actions need explicit user confirmation, as input for later Stories.

Non-goals for this phase: building the MCP server, changing REST contracts, issuing agent credentials.

## Acceptance criteria

- [ ] API inventory covers every target capability with verified route, auth requirement, inputs, outputs and errors; unknowns are listed, not guessed.
- [ ] OpenAPI spec for those routes exists and is checked against the running backend in an automated test.
- [ ] Gap analysis and MCP recommendation memo are published and linked from this Epic.
- [ ] No production code behavior changes in this phase.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `docs/reference/contracts/api/**` (inventory, OpenAPI, memo); a read-only API contract test under `backend/tests/`.
- Shared files/contracts and owner: REST owners remain authoritative; this Epic documents them. Guest-checkout Epic owns receipt claim/lookup; the spec is updated when that contract lands.
- Parallel-ready assessment: Parallel-ready now; read-only with respect to application code.

## Dependencies and integration

No prerequisite for research. Receipt/checkout portions are refreshed after the guest-checkout Epic publishes its contract. MCP server implementation Epics/Stories are added later from the memo.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Assumption: future MCP tools call the REST API, never the database directly, and never expose passwords or reusable JWTs to the model.
- Risk: spec drift as other Epics change routes; mitigated by the automated contract check.
- Deferred until implementation: transport (stdio vs. Streamable HTTP), agent identity/consent model, confirmation policy, receipt-code proof.

## Verification and completion evidence

Contract test passes against the development stack; memo reviewed by the user before any MCP implementation scope is approved.

## Progress and decisions

- 2026-10-26: Scope narrowed by user to API research first; MCP scope decided incrementally.
