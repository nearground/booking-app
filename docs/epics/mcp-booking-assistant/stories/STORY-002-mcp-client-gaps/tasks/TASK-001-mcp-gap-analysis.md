---
title: "Recommend MCP tools and client safety model"
work_id: "EPIC-mcp-booking-assistant/STORY-002/TASK-001"
work_type: task
template_version: 1
status: in-progress
parent: "EPIC-mcp-booking-assistant/STORY-002"
branch: "epic/mcp-booking-assistant"
depends_on: []
---

# Recommend MCP tools and client safety model

Parent User Story: [EPIC-mcp-booking-assistant/STORY-002](../index.md)

## Overview and acceptance coverage

Publish a gap-analysis memo distinguishing what a non-browser client can currently do from what is blocked, deferred, or only recommended. Catalogue future tools, safe authentication boundaries and actions that require explicit user confirmation. This covers Story 002's two acceptance criteria and the Epic memo acceptance criterion.

## Requirements and current state

Current auth middleware is cookie-only; unsafe authenticated methods require CSRF cookie/header; anonymous carts use `_cart_session`; checkout has no client idempotency key; current order confirmation requires customer cookie auth and order number; there is no confirmation-code lookup route. The Guest Checkout Epic owns guest checkout and receipt claim. The memo must not assert future routes exist or encourage the model to receive passwords, JWTs, invite tokens, or other reusable capabilities.

## Implementation steps

1. Compare the inventory with middleware/controller code and list browser-only assumptions and API gaps.
2. Propose a least-privilege, host-managed MCP authentication boundary that keeps credentials and cookie state out of model context.
3. Catalogue read and write tool candidates and state explicit confirmation requirements for account/org changes, publishing/schedule edits, booking/cart changes and checkout.
4. Label endpoint/schema gaps that require future contract work, including receipt lookup and guest claim.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `docs/reference/contracts/api/mcp-gap-analysis.md` | Publish gaps, recommended tools and auth/confirmation model | Research-only; recommendations clearly separated from current behavior |
| `docs/epics/mcp-booking-assistant/index.md` | Link memo and record progress | Only this Epic folder may be edited |

## Child documents

<!-- children:start -->
<!-- children:end -->

## Dependencies

No prerequisite for recommendation; relies on inventory from Story 001/TASK-001. Guest receipt lookup/claim is blocked on the separate Guest Checkout Epic contract.

## Testing

- Unit: Not applicable; documentation task.
- Integration: Cross-check all claims against inventory and backend middleware/controller source.
- Manual/UX: Ensure every proposed mutating/financial tool has a clear confirmation label and credential boundary.
- Regression coverage: Confirm no production behavior is changed.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

The memo is an input to future MCP implementation planning, not authorization to create a server or new REST contracts.

## Progress and completion evidence

In progress; complete after review against `inventory.md` and Epic planning validation.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-mcp-booking-assistant/STORY-002/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
