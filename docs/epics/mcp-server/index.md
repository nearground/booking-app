---
title: "Public booking MCP server"
work_id: "EPIC-mcp-server"
work_type: epic
template_version: 1
status: done
parent: null
branch: "epic/mcp-server"
depends_on: ["EPIC-mcp-booking-assistant"]
---

# Public booking MCP server

## Outcome and MVP traceability

Deliver the first working MCP server requested after the completed API research phase: an MCP client can discover public experiences through the existing REST API without database access or booking-account credentials.

## Scope and non-goals

Implement stdio transport using the official MCP SDK; expose public experience search, detail and scheduled dates. Include a simple real MCP client/server smoke test against an isolated HTTP fixture and technical operating documentation.

Non-goals: Streamable HTTP hosting, delegated authentication, password/session handling, account or organization tools, cart/checkout/reservation writes, private receipts, Discord runtime and payment integration. The completed research Epic remains closed; this Epic owns implementation.

## Acceptance criteria

- [x] An MCP client initializes the stdio server, lists the three tools and successfully invokes public discovery tools.
- [x] Tools validate inputs, use only configured REST-origin public paths, bound HTTP requests, and return allowlisted public data without credentials or raw diagnostics.
- [x] A database-free real client/server smoke test and failure regressions pass; existing backend behavior remains unchanged.
- [x] Setup, configuration, simple client test, tool contracts and security limitations are documented.

## Branch independence and ownership

- Baseline: current checked-out repository after MCP research closure; implementation is delivered on the current task branch, not by switching branches.
- Owned paths: `backend/server/mcp/**`, `backend/tests/mcp/**`, backend package scripts/dependency lock, this Epic subtree and `docs/reference/mcp-server.md`.
- Shared files/contracts and owner: REST owners retain route/controller behavior; this server consumes public HTTP only. Backend package metadata has a single implementation owner.
- Parallel-ready assessment: research is complete; server/test implementation and documentation have separate ownership.

## Dependencies and integration

Depends on [MCP research](../mcp-booking-assistant/index.md) and its [API inventory](../../reference/contracts/api/inventory.md). No live API or database is required for automated protocol tests. Real discovery requires a separately running booking API.

## User Stories

The requested implementation is delivered as one user-valued Story with runtime and protocol-verification Tasks.

<!-- children:start -->
- [STORY-001: Discover booking experiences through MCP](stories/STORY-001-public-discovery/index.md)
<!-- children:end -->

## Risks, assumptions and open questions

- Public schedule GETs may populate/synchronize sessions; the dates tool must disclose this and not claim guaranteed read-only/idempotent behavior.
- Stdio is a local trusted-host boundary, not a remotely hosted authenticated service. The API origin is operator configuration, not model input.
- API text remains untrusted content, not instructions. Allowlisting fields does not make descriptions trustworthy.
- Checkout has no client idempotency contract; account linking, consent and private tools require separate implementation approval.

## Verification and completion evidence

2026-10-27: Official SDK stdio implementation delivered with three public tools and a real SDK client smoke test. `npm --prefix /home/runner/work/booking-app/booking-app/backend run test:mcp` passed 24 checks. The existing backend Jest suite passed 342 tests across 34 suites. Targeted existing ESLint and formatting checks passed for the new runtime/tests.

All 66 planning documents validated; all 7 planner tests and 7 work-dashboard attribution tests passed. Documentation production build succeeded. Runtime tests used Node.js 24 and localhost HTTP fixtures, not a live database/API. MCP operation is documented for Node.js 22.12+; Node.js 18 compatibility was not verified. See [operating reference](../../reference/mcp-server.md).

Security verification: dependency advisory checks found no known vulnerabilities in the added direct SDK/Zod versions; changed-file secret scanning found no secrets. Read-only code review reported no significant issues, and post-commit JavaScript CodeQL analysis found zero alerts.

## Progress and decisions

- 2026-10-27: User requested MCP server implementation and a basic test. Selected stdio plus public discovery as the smallest useful implementation consistent with the research safety boundaries.
- 2026-10-27: Reviewed each acceptance criterion explicitly after delivery. Original API research remains closed; authenticated/write tools and Discord implementation remain separate work.