---
title: Epics
---

# Epics

MVP Epics are drafts; remaining open questions are recorded in each document. All Epic branches start from `main`. No User Stories or Tasks have been generated.

| ID | Epic | Document | Branch | Depends on |
|---|---|---|---|---|
| `EPIC-guest-checkout` | Guest-first checkout and cart continuity | [guest-checkout](./guest-checkout/index.md) | `epic/guest-checkout` | - |
| `EPIC-comment-photo-editing` | Comment privacy and photo editing | [comment-photo-editing](./comment-photo-editing/index.md) | `epic/comment-photo-editing` | - |
| `EPIC-correlated-seed-factory` | Correlated seed factory spike | [correlated-seed-factory](./correlated-seed-factory/index.md) | `epic/correlated-seed-factory` | - |
| `EPIC-single-date-experience` | Single-date experience presentation | [single-date-experience](./single-date-experience/index.md) | `epic/single-date-experience` | `EPIC-correlated-seed-factory`, `EPIC-hero-gallery-display-template` |
| `EPIC-pinned-experience-comments` | Pinned comments on experience pages | [pinned-experience-comments](./pinned-experience-comments/index.md) | `epic/pinned-experience-comments` | `EPIC-correlated-seed-factory`, `EPIC-comment-photo-editing` |
| `EPIC-hero-gallery-display-template` | Hero gallery display template | [hero-gallery-display-template](./hero-gallery-display-template/index.md) | `epic/hero-gallery-display-template` | `EPIC-correlated-seed-factory` |
| `EPIC-spanish-localization` | Spanish localization | [spanish-localization](./spanish-localization/index.md) | `epic/spanish-localization` | `EPIC-guest-checkout`, `EPIC-comment-photo-editing`, `EPIC-single-date-experience`, `EPIC-pinned-experience-comments`, `EPIC-hero-gallery-display-template`, `EPIC-organization-profile-sites` |
| `EPIC-docusaurus-frontend-migration` | Targeted Docusaurus integration | [docusaurus-frontend-migration](./docusaurus-frontend-migration/index.md) | `epic/docusaurus-frontend-migration` | - |
| `EPIC-mcp-booking-assistant` | MCP booking assistant: API research | [mcp-booking-assistant](./mcp-booking-assistant/index.md) | `epic/mcp-booking-assistant` | - |
| `EPIC-organization-profile-sites` | Branded organization profile sites | [organization-profile-sites](./organization-profile-sites/index.md) | `epic/organization-profile-sites` | - |
| `EPIC-responsive-ux` | Responsive UX across device shapes | [responsive-ux](./responsive-ux/index.md) | `epic/responsive-ux` | - |

See the [planning workflow](../planning/workflow.md) for branch independence, templates and progress tracking.
