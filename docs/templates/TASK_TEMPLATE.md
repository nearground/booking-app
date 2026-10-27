---
title: Task template
---

The generator scaffolds documents from the fenced template below. Version 1.
This retains the existing task template's implementation and verification detail.

```markdown
---
title: "{{title}}"
work_id: "{{id}}"
work_type: task
template_version: 1
status: draft
parent: "{{parent_id}}"
branch: "{{branch}}"
depends_on: []
---

# {{title}}

Parent User Story: [{{parent_id}}]({{parent_link}})

## Overview and acceptance coverage

{{overview}}

## Requirements and current state

{{requirements}}

## Implementation steps

1. {{implementation}}

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| {{path}} | {{change}} | {{constraints}} |

## Dependencies

{{dependencies}}

## Testing

- Unit: {{unit_tests}}
- Integration: {{integration_tests}}
- Manual/UX: {{manual_tests}}
- Regression coverage: {{regression_tests}}

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

{{documentation}}

## Progress and completion evidence

{{evidence}}

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: {{id}}` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
```
