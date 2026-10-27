---
title: "Define responsive breakpoints and rebuild the shared shell"
work_id: "EPIC-responsive-ux/STORY-001/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-responsive-ux/STORY-001"
branch: "epic/responsive-ux"
depends_on: []
---

# Define responsive breakpoints and rebuild the shared shell

Parent User Story: [EPIC-responsive-ux/STORY-001](../index.md)

## Overview and acceptance coverage

Set the shared responsive foundation, navigation and footer behavior, plus accessible focus/touch defaults. Covers STORY-001 and the shell portions of Epic acceptance.

## Requirements and current state

Tailwind 3 is configured in frontend/tailwind.config.js with defaults only. Shared shell is frontend/src/components/global-navbar/GlobalNavbar.jsx and global-navbar.scss, HamburgerMenu.jsx, and GlobalFooter.jsx. Vite entry imports frontend/src/index.scss. The navbar currently absolutely positions profiles and a clickable FontAwesome icon, while menu links are padded but no global focus-visible, reduced-motion, or safe-area conventions exist.

## Implementation steps

1. Extend Tailwind with documented responsive container widths and named breakpoints only where needed; retain defaults where they already represent device boundaries.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/tailwind.config.js | Add responsive theme container widths / breakpoint tokens and safe-area utility support if needed. | Shared foundation owner; preserve existing design tokens and Tailwind 3 syntax. |

## Dependencies

None. Coordinate against concurrent organizer and experience-details changes by restricting this task to shared shell and styles.

## Testing

- Unit: Existing Vitest suite plus focused component tests for any changed interactive menu behavior.
- Integration: Cypress responsive route checks once the viewport spec task lands.
- Manual/UX: Keyboard tab/shift-tab, visible focus, menu toggle at phone/tablet/desktop, reduced-motion preference, notch inset emulation.
- Regression coverage: Confirm existing auth navigation, menu links, and responsive desktop navigation remain unchanged.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Record breakpoints and container rules in docs/reference/responsive-device-matrix.md.

## Progress and completion evidence

Completed: Tailwind breakpoints/containers, shared shell, language slot, footer, base main region, visible focus, reduced motion, and touch sizing implemented. Verified by successful production build, responsive Cypress matrix, and targeted ESLint.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-001/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
