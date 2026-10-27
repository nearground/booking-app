---
title: MVP planning workflow
sidebar_position: 1
---

# MVP to independently deliverable work

Select **MVP Planner** in the chat agent picker and provide plain-text MVP requests.
The project agent is versioned in `.github/agents/mvp-planner.agent.md`. A
user-profile entry points to that source rather than duplicating its rules.
Restart/reload the chat agent picker if a newly created agent is not visible.

## Planning stages

1. **MVP request → Epics:** derive user outcomes, measurable acceptance criteria,
   scope, unresolved decisions and branch boundaries. This is the default.
2. **Selected Epic → User Stories:** request expansion explicitly; define
   user-valued slices and acceptance criteria mapped to the Epic.
3. **Selected Story → Tasks:** request expansion explicitly; define implementation
   steps, owned files, tests, dependencies and evidence of completion.

Example requests:

> Plan Epics for this MVP: organizers can publish experiences, travelers can book
> a session, and organizers can review attendee lists. Do not expand children yet.

> Expand Epic EPIC-organizer-publishing into User Stories.

> Expand STORY-001 in EPIC-organizer-publishing into Tasks.

The agent reads relevant code before proposing implementation details. Ambiguous
requirements become questions or explicit assumptions, not invented requirements.
Planning alone does not authorize implementation, branch changes or commits.

## Source layout

```text
docs/
  planning/workflow.md
  templates/{EPIC,USER_STORY,TASK}_TEMPLATE.md
  epics/<epic-slug>/index.md
  epics/<epic-slug>/stories/STORY-001-<story-slug>/index.md
  epics/<epic-slug>/stories/STORY-001-<story-slug>/tasks/TASK-001-<task-slug>.md
  reference/
  legacy/tasks/        # archived; not published on the docs site
```

Each Epic owns its complete document subtree. IDs are scoped:
`EPIC-<slug>`, `STORY-001` within an Epic, and `TASK-001` within a Story.
Stable paths do not depend on changing display titles.

## Templates and commands

All new work documents are scaffolded from the versioned
[Epic](../templates/EPIC_TEMPLATE.md),
[User Story](../templates/USER_STORY_TEMPLATE.md), and
[Task](../templates/TASK_TEMPLATE.md) templates. From the repository root:

```bash
node scripts/planning.mjs create epic organizer-publishing --title "Organizer publishing"
node scripts/planning.mjs create story publish-experience --parent EPIC-organizer-publishing --title "Publish an experience"
node scripts/planning.mjs create task validate-fields --parent EPIC-organizer-publishing/STORY-001 --title "Validate publishing fields"
node scripts/planning.mjs validate
node --test scripts/planning.test.mjs
```

Scaffolds start as drafts. Replace instructional placeholders with grounded
content before marking a document ready. Validation checks identity, parent
links, status, branch inheritance, dependencies and placeholder completion; it
cannot determine whether the plan is substantively correct.

## Independent branches

- Declare one baseline commit/branch for parallel-ready Epics.
- Use `epic/<epic-slug>` branches and separate worktrees for simultaneous work.
- Assign shared migrations, configuration, APIs and schemas a single owner.
- Define contracts before downstream implementation. If work requires unmerged
  code from another branch, record a dependency and integration wave instead of
  claiming full independence.
- Keep dependencies acyclic. Children inherit branch boundaries and contracts;
  coordination must be explicitly agreed.
- Avoid shared registries or hand-maintained sidebars. Docusaurus discovers docs,
  and the [Epics index](../epics/index.mdx) is generated from Epic front matter.

## Tracking

Use `draft`, `ready`, `in-progress`, `blocked`, `done`, or `cancelled`.
Record progress, decisions and verification evidence in the owning document.
A completed Task does not automatically complete its Story or Epic.

## Task documents and Git history are the work record

Committed Epic/Story/Task documents are authoritative for scope, ownership,
acceptance criteria and current status. Git commit history is authoritative for
implementation evidence and change history. Docusaurus reads these sources;
it does not maintain a separate database or infer task state from commit count.

Every implementation commit includes a `Work-Item` trailer for each Task it
advances:

```text
Implement attendee list export

Work-Item: EPIC-attendee-tools/STORY-001/TASK-001
```

For multiple Tasks, add multiple trailers. Use the full Task work ID exactly as
shown in its front matter. The dashboard attaches commits only to exact
`Work-Item` matches. It never guesses associations from subjects, changed files,
author, or dates. Commits without trailers remain visible in the general Git
history but are not attributed to tasks. Historical task docs and old commits
are preserved as-is; no false relationships are invented.

Update Task status and completion evidence in the Task document in a commit.
The dashboard displays that status alongside linked commit evidence. A commit
does not by itself mark a Task done.

During development use the **Work dashboard** at
`http://localhost:8080/internal/docs/work/` to browse current work and recent
Git history; the **Planning** menu (Workflow, Epics, Templates) and **Reference**
provide document navigation.
Commit history refreshes when the dashboard is refreshed. If repository Git
metadata is missing/unavailable, the dashboard reports that clearly rather than
showing an empty history as if no work exists. GitHub links are shown only for
commits present on a remote branch; local-only commits still display their SHA
and subject.

Historical plans stay archived in `docs/legacy/` (not published on the docs
site) and reference material in Reference. Preserve their completion claims;
do not invent parent Epics or Stories retroactively.

## Browse during development

The Docker development stack starts Docusaurus with the frontend. Open
`http://localhost:8080/internal/docs/`, or use **Internal docs** in the app
navigation. The documentation navbar links back to the app. Deep links and reloads
remain under this prefix.

For host development (Node.js 22.12 or newer), run two terminals:

```bash
cd docs-site
npm ci
npm start
```

```bash
npm --prefix frontend run dev
```

Vite proxies `/internal/docs/` to port 3100 by default; Docker points it to the
docs service. A stopped docs service returns a proxy error, not a blank app page.
Production and tunnel builds exclude the docs service and documents. "Internal"
is not authentication: anyone who can reach the development server can read
these docs. Never put secrets here or expose the dev stack publicly.
