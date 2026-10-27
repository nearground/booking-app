---
title: Epic template
---

The generator scaffolds documents from the fenced template below. Keep required
section names and template version stable.

```markdown
---
title: "{{title}}"
work_id: "{{id}}"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "{{branch}}"
depends_on: []
---

# {{title}}

## Outcome and MVP traceability

{{outcome}}

## Scope and non-goals

{{scope}}

## Acceptance criteria

- [ ] {{acceptance_criteria}}

## Branch independence and ownership

- Baseline: {{baseline}}
- Owned paths: {{owned_paths}}
- Shared files/contracts and owner: {{shared_contracts}}
- Parallel-ready assessment: {{parallel_ready}}

## Dependencies and integration

{{integration}}

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

{{questions}}

## Verification and completion evidence

{{verification}}

## Progress and decisions

- Draft created; not approved for implementation.
```
