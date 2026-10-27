---
title: "Implement public REST-backed stdio tools"
work_id: "EPIC-mcp-server/STORY-001/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-mcp-server/STORY-001"
branch: "epic/mcp-server"
depends_on: []
---

# Implement public REST-backed stdio tools

Parent User Story: [EPIC-mcp-server/STORY-001](../index.md)

## Overview and acceptance coverage

Deliver a real stdio MCP server exposing public experience search, detail and dates, satisfying the Story's interoperability and public-data boundaries.

## Requirements and current state

Existing public experience routes have mixed response envelopes. The schedule route can synchronize sessions on GET. Use the official MCP SDK with Zod validation; no cookie jar, login, database import or arbitrary URL-fetch tool.

## Implementation steps

1. Register three narrowly scoped tools and connect a stdio entrypoint.
2. Validate trusted operator configuration and model arguments; bound requests and reject redirects.
3. Return only allowed public fields and generic tool errors; reserve stdout for protocol messages.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `backend/server/mcp/**` | REST adapter, tool registration, stdio entrypoint | No REST behavior changes, credentials or direct database access |
| `backend/package.json`, `backend/package-lock.json` | Official SDK/Zod and start/test scripts | Package-manager-generated lock; advisory checked before adding dependencies |
| `docs/reference/mcp-server.md` | Operating reference | Configuration, tools and security limitations |

## Dependencies

Completed MCP API research. Official SDK and Zod dependency versions are advisory-checked before installation. No authenticated API flow is required.

## Child documents

<!-- children:start -->
<!-- children:end -->

## Testing

- Unit: Input/configuration rejection and response/error filtering in focused MCP tests.
- Integration: Actual SDK stdio client against the entrypoint and localhost REST fixture.
- Manual/UX: Inspect documented client launch configuration; no live production calls.
- Regression coverage: Existing backend Jest suite and scoped existing ESLint.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Publish an MCP operating reference and link it from this Epic; preserve the historical research-only scope.

## Progress and completion evidence

2026-10-27: Delivered `backend/server/mcp/index.js` and `server.js` with official SDK 1.32.2 and Zod 4.6.7 (direct dependencies advisory-checked before installation). `mcp:start` launches the stdio entrypoint; `BOOKING_API_BASE_URL` defaults to `http://localhost:4000`. Three validated public tools use fixed paths, reject redirects, omit credentials, strip unknown fields recursively and return generic tool errors. Production request bounds are 5 seconds and 1 MiB; factory-only overrides can tighten, not relax, these bounds.

Implementation-agent validation: 24 MCP checks passed; existing backend Jest 342 tests / 34 suites passed; focused ESLint/formatting passed. No existing REST handler or database schema changed. Node.js 24 was tested; operating docs recommend 22.12+ rather than promising legacy Node.js 18 support.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-mcp-server/STORY-001/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.