---
title: "Identify MCP client capabilities and safety boundaries"
work_id: "EPIC-mcp-booking-assistant/STORY-002"
work_type: story
template_version: 1
status: in-progress
parent: "EPIC-mcp-booking-assistant"
branch: "epic/mcp-booking-assistant"
depends_on: []
---

# Identify MCP client capabilities and safety boundaries

Parent Epic: [EPIC-mcp-booking-assistant](../../index.md)

## User value

As a product owner planning an MCP booking assistant, I want a source-grounded gap and safety analysis, so that future tool scope and consent rules reflect what this API can actually support.

## Scope and non-goals

Describe capability gaps for non-browser clients, including cookie-only auth, CSRF, anonymous cart cookie, lack of checkout idempotency, and the missing confirmation-code lookup contract. Recommend candidate MCP tools, the credential boundary between agent and host, and actions requiring explicit user confirmation. Treat guest checkout and receipt claim as pending another Epic; do not propose them as existing endpoints and do not implement MCP behavior.

## Acceptance criteria

- [ ] Given the documented current API, when a future implementer reads the memo, then supported, blocked, and deferred capabilities are distinguished with no speculative route contracts.
- [ ] Given each proposed write/financial or organization-management action, when the tool catalogue is reviewed, then its required user confirmation and credential handling are explicit.
- [ ] Epic acceptance coverage: a gap analysis and MCP recommendation memo are published and linked from the Epic.

## Ownership and dependencies

Owns `docs/reference/contracts/api/mcp-gap-analysis.md` and the link/progress entry in the Epic. The inventory Story supplies verified API details; receipt-claim support remains dependent on the Guest Checkout Epic. This Story is research-only and does not change application behavior.

## Tasks

<!-- children:start -->
- [TASK-001: Recommend MCP tools and client safety model](tasks/TASK-001-mcp-gap-analysis.md)
<!-- children:end -->

## Verification and completion evidence

Review the memo against `inventory.md` and backend middleware/controller source, then run `node scripts/planning.mjs validate`. Evidence should cite the concrete route/middleware gaps and clearly label future proposals as recommendations.

## Progress and decisions

- Expanded from the API research Epic; tool scope is deliberately recommended incrementally, not implemented here.
