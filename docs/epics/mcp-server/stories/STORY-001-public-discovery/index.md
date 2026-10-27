---
title: "Discover booking experiences through MCP"
work_id: "EPIC-mcp-server/STORY-001"
work_type: story
template_version: 1
status: done
parent: "EPIC-mcp-server"
branch: "epic/mcp-server"
depends_on: []
---

# Discover booking experiences through MCP

Parent Epic: [EPIC-mcp-server](../../index.md)

## User value

As an MCP client user, I want to search experiences, inspect details and list dates, so that I can explore booking options without exposing account credentials.

## Scope and non-goals

Three public REST-backed tools over stdio, with validated input and minimal public outputs. Include a real MCP client smoke test and operating reference. No direct database access, account auth, booking writes or Discord bot.

## Acceptance criteria

- [x] Given the stdio entrypoint, an SDK client initializes, discovers tools and calls each tool successfully through REST.
- [x] Given invalid arguments, upstream failure or unexpected/private response fields, the server rejects safely or returns sanitized errors without credential disclosure.
- [x] Given a fresh backend installation, documented start and test commands run without new test frameworks or a database.
- Epic acceptance coverage: transport interoperability, public REST boundary, safe failure handling, regression tests and operating documentation.

## Ownership and dependencies

Owns the MCP runtime and focused tests, backend dependency metadata, and the MCP operating reference. Consumes the completed research and existing public REST routes without modifying their behavior.

## Tasks

<!-- children:start -->
- [TASK-001: Implement public REST-backed stdio tools](tasks/TASK-001-stdio-server.md)
- [TASK-002: Verify real MCP client and server interoperability](tasks/TASK-002-protocol-smoke.md)
<!-- children:end -->

## Verification and completion evidence

2026-10-27: All three tools were discovered and invoked over a real stdio client/server connection. The MCP suite passed 24 tests, including private-field stripping, invalid input/configuration, malformed/error/oversize responses, redirect prevention, timeouts and cleanup. Existing backend Jest passed 342 tests / 34 suites; focused lint passed. Both Tasks record evidence below; the reference documents host setup, exact commands and public-only boundaries.

## Progress and decisions

- 2026-10-27: Expanded as the first implementation slice explicitly requested by the user.
- 2026-10-27: Runtime and protocol smoke delivered; all Story acceptance criteria reviewed independently of Task status.