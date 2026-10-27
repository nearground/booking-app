---
title: "Verify real MCP client and server interoperability"
work_id: "EPIC-mcp-server/STORY-001/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-mcp-server/STORY-001"
branch: "epic/mcp-server"
depends_on: ["EPIC-mcp-server/STORY-001/TASK-001"]
---

# Verify real MCP client and server interoperability

Parent User Story: [EPIC-mcp-server/STORY-001](../index.md)

## Overview and acceptance coverage

Prove a simple MCP client can initialize the actual server process, list tools and invoke public discovery end to end through HTTP, covering the Story's protocol and safe-failure criteria.

## Requirements and current state

Use the official SDK client/stdio transport and Node's built-in test runner, already used in this repository. A localhost HTTP fixture supplies API responses; no database or externally hosted MCP service is needed.

## Implementation steps

1. Start a local REST fixture and connect an SDK client to the real stdio process.
2. Verify tool discovery, successful calls, REST path/query mapping and public-field filtering.
3. Cover validation/upstream failures and always clean up processes/transports/listeners.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `backend/tests/mcp/**` | Protocol smoke and adapter regressions | `.test.mjs` avoids the existing Jest `.test.js` matcher; no external network |
| `backend/package.json` | `test:mcp` command | Built-in Node test runner; no additional test dependency |
| `docs/reference/mcp-server.md` | Simple client test instructions | Distinguish fixture verification from live API smoke |

## Dependencies

Requires TASK-001's runtime; commits may advance both Tasks coherently using both full Work-Item trailers.

## Child documents

<!-- children:start -->
<!-- children:end -->

## Testing

- Unit: Validation/configuration/error/redaction checks.
- Integration: Real initialize/listTools/callTool exchanges over stdio with a localhost API fixture.
- Manual/UX: Follow documented start/test commands.
- Regression coverage: Full existing backend Jest suite; planning/dashboard tests and docs publication checks.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Document what the smoke proves and how a separately running development API can be used by a real host; never describe the fixture as a live booking.

## Progress and completion evidence

2026-10-27: `backend/tests/mcp/stdio.test.mjs` runs a simple official SDK client against the actual stdio process plus a localhost HTTP fixture. It initializes, lists tools and calls search/detail/dates, verifying HTTP paths/queries and response allowlists. Regressions cover invalid identifiers/arguments/origins, HTTP/JSON/schema errors, private nested fields, redirects, oversize bodies and streaming timeout. `limits.test.mjs` checks tightened one-byte response bounds, header/body timeout and cancellation/cleanup.

`npm --prefix /home/runner/work/booking-app/booking-app/backend run test:mcp`: 24 passed. Existing Jest: 342 tests / 34 suites passed. Scoped ESLint and formatting passed. Planning: 66 documents validated; 7 planner and 7 dashboard tests passed; docs production build succeeded. No live booking API or database was used, and this is not a purchase/authentication test.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-mcp-server/STORY-001/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.