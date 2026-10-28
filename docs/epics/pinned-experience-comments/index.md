---
title: "Pinned comments on experience pages"
work_id: "EPIC-pinned-experience-comments"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "epic/pinned-experience-comments"
depends_on: [EPIC-correlated-seed-factory, EPIC-comment-photo-editing]
---

# Pinned comments on experience pages

## Outcome and MVP traceability

Authorized experience owners can feature a comment above regular comments, demonstrated by a preconfigured seeded example.

## Scope and non-goals

The experience editor now supports pinning and unpinning up to three eligible five-star top-level reviews for any details template. Selection order is persisted in `Experience.detailsMetadata.overrides.pinnedCommentIds`; the public page renders the selection once and excludes those reviews from the ordinary preview. The editor loads eligible reviews from the admin-only manage endpoint. This does not add Comment-level pin fields or a separate pin API; broader comment-list controls remain future work. Preserve sort, pagination, replies and edit rules. Seed example follows Epic 2 approach.

## Acceptance criteria

- [ ] Organizers (members of the experience's owning organization, via `OrganizationMembers`) and organization admins (`OrganizationMembers.isAdmin`) can pin/unpin an eligible comment; all other callers are rejected. The check lives in one authorization helper (e.g. `canPinComment(user, experience)`) so it can later be replaced by ACL rules without touching routes or UI.
- [ ] Multiple comments can be pinned per experience with an explicit order; organizers can reorder pins; pinned comments appear in that order above regular comments without duplicate appearance or breaking replies, pagination, sort, or counts.
- [ ] Pin state (`pinnedAt`, `pinOrder`, `pinnedBy`) is enforced consistently in persistence, API and UI; at most **3** pinned comments per experience, rejected server-side with a clear message and reflected in the UI (pin action disabled with explanation when 3 are pinned).
- [ ] Seeded experience demonstrates pinned comment; tests cover roles, state transitions, display and seed reproducibility.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/components/comments/CommentsSection.jsx`, `CommentCard.jsx`; comment model/service/controller/route and focused migration if required; sample seed; tests.
- Shared files/contracts and owner: This Epic owns pin state/API/authorization. Schema changes are limited to comment pin metadata and coordinated with Epic 1 service edits. Epic 2 owns seed format; pin authority must use organization role checks.
- Parallel-ready assessment: Depends on Epic 2 and Epic 1 (comment-photo-editing). The comment-photo Epic establishes the shared image-edit/validation baseline; afterward keep pin changes in comment components and pin-specific API/schema paths.

## Dependencies and integration

Epic 2 and Epic 1 -> this Epic. Integrate pin API/model before concurrent details-page UI work. Coordinate whether pin action lives in CommentCard or experience management UI.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Decided: organizers of the owning organization and organization admins can pin. Future: ACL-compatible permission (e.g. `comment:pin` on an experience) replaces the helper's internals; keep the API and UI permission-name based (the API returns a `canPin` flag) so the switch is non-breaking.
- Decided: multiple ordered pins, maximum 3.
- Can replies be pinned? Recommendation: top-level experience comments only.
- Assumption: no general moderation feature is requested.

## Verification and completion evidence

Backend tests for authorized/unauthorized pin state; frontend tests for pinned-first layout, no duplication, pagination/sort; ensure seeder creates configured sample.

## Progress and decisions

- Draft created; not approved for implementation. Open decisions remain; no implementation evidence recorded.
- 2026-10-26: User decided pin authority: organizers and admins of the owning organization, ACL-compatible later.
- 2026-10-28: The food-tour experience template supports a metadata-selected showcase of up to three ordered, five-star, top-level experience comments at the bottom of the page. Dedicated frontend tests cover ordering, the three-comment limit, ineligible comments, explicit selection rather than inferred pins, and anonymity. The showcase uses the persisted metadata ID list as its single pin source; general pin/unpin/reorder UI/API and Comment-level pin fields are not part of this showcase. The full Epic remains open.
- 2026-10-27: Experience create/edit now exposes up to three eligible five-star reviews independent of template; the manager endpoint returns review text only to authorized organization admins. Pins render for default, event and food-tour pages and remain stored as ordered metadata IDs.
