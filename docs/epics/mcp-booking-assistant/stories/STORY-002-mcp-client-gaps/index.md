---
title: "Identify MCP client capabilities and safety boundaries"
work_id: "EPIC-mcp-booking-assistant/STORY-002"
work_type: story
template_version: 1
status: done
parent: "EPIC-mcp-booking-assistant"
branch: "epic/mcp-booking-assistant"
depends_on: []
---

# Identify MCP client capabilities and safety boundaries

Parent Epic: [EPIC-mcp-booking-assistant](../../index.md)

## User value

As a product owner planning an MCP booking assistant, I want a source-grounded gap and safety analysis, so that future tool scope and consent rules reflect what this API can actually support.

## Scope and non-goals

Describe capability gaps for non-browser clients, including cookie-only auth, CSRF, anonymous cart cookie, lack of checkout idempotency, and the missing confirmation-code lookup contract. Recommend candidate MCP tools, the credential boundary between agent and host, and actions requiring explicit user confirmation. Document implemented guest checkout, capability receipt access and email-verified ownership transfer without conflating them with confirmation-code lookup. Do not implement MCP behavior.

## Acceptance criteria

- [x] Given the documented current API, when a future implementer reads the memo, then supported, blocked, and deferred capabilities are distinguished with no speculative route contracts.
- [x] Given each proposed write/financial or organization-management action, when the tool catalogue is reviewed, then its required user confirmation and credential handling are explicit.
- [x] Epic acceptance coverage: a gap analysis and MCP recommendation memo are published and linked from the Epic.

## Ownership and dependencies

Owns `docs/reference/contracts/api/mcp-gap-analysis.md` and the link/progress entry in the Epic. The inventory Story supplies verified API details, including the completed Guest Checkout Epic contracts. This Story is research-only and does not change application behavior.

## Tasks

<!-- children:start -->
- [TASK-001: Recommend MCP tools and client safety model](tasks/TASK-001-mcp-gap-analysis.md)
<!-- children:end -->

## Verification and completion evidence

Reviewed the memo against `inventory.md` and backend middleware/controller source; `node scripts/planning.mjs validate` passed. The memo distinguishes unavailable confirmation-code lookup and host-managed auth recommendations from current routes.

2026-10-27: Re-reviewed against refreshed inventory and guest receipt/email-verification controller/service source. Existing guest capabilities/claims are distinguished from unsupported confirmation-code lookup and future delegated auth. Documented GET side effects, capability isolation, private receipt/claim handling, and a public REST discovery handoff for a future Discord bot. Revalidated both Story acceptance criteria; no production behavior changed.

## Progress and decisions

- Expanded from the API research Epic; tool scope is deliberately recommended incrementally, not implemented here.
