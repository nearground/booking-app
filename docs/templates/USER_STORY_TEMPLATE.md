---
title: User Story template
---

The generator scaffolds documents from the fenced template below. Version 1.

```markdown
---
title: "{{title}}"
work_id: "{{id}}"
work_type: story
template_version: 1
status: draft
parent: "{{parent_id}}"
branch: "{{branch}}"
depends_on: []
---

# {{title}}

Parent Epic: [{{parent_id}}]({{parent_link}})

## User value

As a {{persona}}, I want {{capability}}, so that {{benefit}}.

## Scope and non-goals

{{scope}}

## Acceptance criteria

- [ ] Given {{context}}, when {{action}}, then {{observable_result}}.
- Epic acceptance coverage: {{epic_criteria}}

## Ownership and dependencies

{{ownership}}

## Tasks

<!-- children:start -->
<!-- children:end -->

## Verification and completion evidence

{{verification}}

## Progress and decisions

- Draft created; not approved for implementation.
```
