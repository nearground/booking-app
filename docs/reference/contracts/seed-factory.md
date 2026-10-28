# Deterministic seed factory

**Status:** Durable development/test implementation. The Wave 1 Epic delivered the original research/spike; the subsequently authorized rework replaces both legacy seeders.

## Architecture

Pinned `@faker-js/faker` 9.9.0 (MIT) provides synthetic values. The application owns the graph, reference validation, scenario definitions, Sequelize persistence and cleanup. No additional factory/ORM dependency is needed. Fishery would still require this persistence layer; factory-girl's adapter would not solve polymorphic links, ownership, scheduling hooks or media compensation.

Implementation:

- [Graph API](../../../backend/server/seed-factory/index.js): `generateSeedGraph`, `validateSeedGraph`, `materializeSeedGraph`, `cleanupSeedGraph`.
- [Scenarios](../../../backend/server/seed-factory/scenarios.js) and [stable catalog](../../../backend/server/seed-factory/catalog.js).
- [Sequelize store](../../../backend/server/seed-factory/store.js), [runner](../../../backend/server/seed-factory/runner.js) and [CLI](../../../backend/server/scripts/seed.js).

### Scenarios and preserved examples

| Scenario | Data |
|---|---|
| `startup` | Martin LLC, headquarters, configured administrator, organization membership and organizer profile |
| `demo` | 25 users (24 `userN` accounts plus the dedicated password-reset account), 3 branded organizations, 7 locations, 22 organizer profiles, 4 named experiences, 16 ticket tiers, 96 experience reviews, 506 organizer reviews, organizer links and 90 days of explicit sessions |
| `showcase` | Three additive organizations and four showcase experiences, three registered owners plus consenting guests, two one-date parties, two four-tier tour catalogs, 90-day tour schedules, pinned reviews, and owner-scoped images/video/poster |

Each showcase Experience stores versioned `detailsMetadata` with a template (`event`, `food-tour`, or `default`) and validated per-template `overrides.copy`. The food-tour record additionally stores uploaded `heroVideoKey`, `heroPosterKey`, and ordered `pinnedCommentIds`; the event records demonstrate distinct free/paid ticket behavior and public-attendance consent. The free/paid distinction is booking data, not a layout flag.

The four experience titles, capacities, durations, public image paths, ticket prices, age/ID questions, organization routes and three branding layouts remain stable. Synthetic names/coordinates/reviews are now reproducible rather than using `Math.random()`. Descriptions are curated catalog data. Mixology retains three picked occurrences; the other examples retain their daily/weekday cron schedules. Sessions are locked to their explicit source and automatic schedule synchronization is disabled for factory-owned experiences.

The smaller configurable graph also supports draft orders/items. It does not pretend those drafts are completed bookings or create reservation/attendee rows implicitly. Tests of actual checkout create reservations through the real application.

### Input and determinism

```js
const graph = generateSeedGraph({
  seed: 'explicit-test-scenario',
  counts: { members: 4, experiences: 3, sessionsPerExperience: 2 },
  traits: { experience: { capacity: 8, autoSyncEnabled: false } },
  overrides: { experience: { title: 'Stable example', capacity: 10 } },
});
```

Counts are bounded; graphs exceeding 5,000 records are rejected. References must resolve to the declared model type. Polymorphic comments/order products are allowlisted. Organization headquarters are explicit deferred links, resolving the organization/location cycle.

Named scenarios take `scenario`, `seed`, an explicit `clock`, administrator email and a bcrypt password hash. Equal inputs produce equal logical attributes/relationships. CLI clock defaults to the current UTC date; use `--clock=2026-10-27` for exact replay. The same scenario/seed identifies a durable run even when the clock advances: ordinary reruns **skip**, preserving the original dates and IDs. Different scenarios have different seed namespaces. Pin/change seed or explicitly replace to advance a demo's date window.

Database-generated IDs/timestamps, salted password hashes and media upload IDs are intentionally not byte-identical across fresh materializations. Logical scenario determinism is not a promise of identical SQL dumps.

## Ownership and safety

Every mutating command requires all of:

- `NODE_ENV=development` or `test`; production is rejected without an override path.
- `SEED_FACTORY_ENABLED=true`.
- `SEED_DATABASE` equal to the exact configured `MYSQL_DATABASE`.

The store creates its own `SeedRuns` and `SeedAssets` bookkeeping tables directly from service definitions, without running or adding migrations. Application schema initialization uses model definitions only, and the `init` command refuses a nonempty application database. No automatic schema alteration/reset is performed on an existing development database.

`SeedRuns` stores exact primary keys (including composite join keys), record digests, scenario/version/clock and owned media keys. It stores no plaintext passwords or access tokens. A locked sentinel row serializes factory writers until transaction commit, including concurrent first materializations.

- **skip:** return the existing completed manifest without duplicate inserts or rewriting user changes; incompatible scenario/version manifests fail explicitly.
- **replace:** validate the old manifest, remove its exact rows and insert the replacement in one transaction. Failure restores the old graph and manifest.
- **cleanup-preview:** inspect ownership and list the exact rows/object keys without deleting them.
- **cleanup:** reject unknown manifests, changed/missing owned rows, unexpected row counts and external references. Never infer ownership from names, email, `LIKE` patterns or timestamps.

The CLI emits the exact cleanup plan to stderr before deleting rows, including replacement runs. Library callers can provide an `onCleanupPlan` audit callback.

Cleanup checks database foreign keys, polymorphic product/comment references, email-based password-reset/verification records and external JSON/string media references. It deletes in reverse graph order and breaks only the known headquarters cycle. User-created bookings, reviews, carts or edits therefore block replacement instead of being silently discarded.

The adapter validates model fields and values while bypassing application creation/update hooks deliberately: seeded schedules are explicit and deterministic order numbers must not be overwritten. Normal application hooks are unchanged.

### Existing legacy databases

Both original Sequelize seeder filenames remain as thin compatibility entry points into this factory; their former random generation and broad undo routines are removed. A separate child process closes its own Sequelize/Redis resources after each CLI entry point.

Existing rows created by the old seeders have **no ownership manifest**. They are not adopted or deleted automatically. A colliding email/username/organization causes a transaction failure, leaving existing data intact. Use a fresh development database for the first factory population, or obtain explicit approval to discard/rebuild a legacy development database. The regular shared development database is not a test-reset target.

## Local commands

Run from the repository root. Set bootstrap credentials in your local shell/secret configuration, not source code:

- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` for `startup`.
- `SEED_DEMO_PASSWORD` for `demo`.
- `SEED_DEMO_PASSWORD` for `showcase`.
- Passwords must contain at least 10 characters.

Pass these existing shell variables into Docker without embedding their values in commands:

```powershell
docker compose exec -T -e SEED_FACTORY_ENABLED=true -e SEED_DATABASE=staybooker -e SEED_ADMIN_EMAIL -e SEED_ADMIN_PASSWORD backend node server/scripts/seed.js preview startup
docker compose exec -T -e SEED_FACTORY_ENABLED=true -e SEED_DATABASE=staybooker -e SEED_ADMIN_EMAIL -e SEED_ADMIN_PASSWORD backend node server/scripts/seed.js apply startup
docker compose exec -T -e SEED_FACTORY_ENABLED=true -e SEED_DATABASE=staybooker -e SEED_DEMO_PASSWORD backend node server/scripts/seed.js apply demo --clock=2026-10-27
docker compose exec -T -e SEED_FACTORY_ENABLED=true -e SEED_DATABASE=staybooker -e SEED_DEMO_PASSWORD backend node server/scripts/seed.js preview showcase
docker compose exec -T -e SEED_FACTORY_ENABLED=true -e SEED_DATABASE=staybooker -e SEED_DEMO_PASSWORD backend node server/scripts/seed.js apply showcase
docker compose exec -T -e SEED_FACTORY_ENABLED=true -e SEED_DATABASE=staybooker backend node server/scripts/seed.js cleanup-preview demo
```

Replace `staybooker` with the exact intended database. `init` creates model tables in an empty application database. `preview` prints only scenario identity/counts, never record/password attributes; it may create the two bookkeeping tables. Cleanup does not require the original credentials. A reviewed replacement is `apply demo --mode=replace`; preview cleanup first. Both operations still refuse edits/external references.

## Media lifecycle

Optional `--media=<local-json-path>` accepts:

```json
[
  {
    "recordKey": "experience-3",
    "ownerId": 17,
    "file": "/seed-media/tacos-hero.mp4",
    "contentType": "video/mp4"
  }
]
```

Paths are local to the process/container. Configure `SEED_MEDIA_API_URL` and `SEED_MEDIA_ACCESS_TOKEN` for an existing authenticated upload owner, plus `R2_WORKER_BASE_URL`/`R2_DEV_TOKEN` for cleanup. Tokens stay in configuration and are never saved in manifests.

Uploads use the real authenticated `PUT /api/media/upload`, not direct object-store writes. Images and MP4 share the 6 MiB limit in Express and the local R2 worker. No separate application Media entity is introduced: owned keys are attached to `Experience.images`.

For development/test only, `X-Seed-Upload-Id` supplies a validated random upload identity. The normal owner/authentication/MIME/size guards remain in force; production rejects the header. The factory can journal the resulting exact key **before** transmitting bytes, covering a lost upload response or process crash.

Successful graph commit marks assets active in the SQL transaction. Rollback queues their removal. Replacing/cleaning a graph queues its previous assets transactionally. Storage deletion uses the worker's authenticated DELETE and checks that no remaining application row references the key. Failures are explicit and retryable; committed SQL plus pending media cleanup is reported as such, not as a rollback.

Run `node server/scripts/seed.js media-cleanup` to reclaim abandoned staged uploads and retry queued deletions. Tombstones are retained and swept again, so a delayed upload can be reconciled on the next sweep. SQL and object storage are not a distributed transaction; cleanup after a crash requires that recovery command. Do not remove bookkeeping tables while their media recovery is pending.

## Backend and browser test adoption

Pure factory tests need no database. Existing mocked HTTP request fixtures remain request fixtures rather than being converted to SQL records. Branding tests now inspect generated scenarios. Real relational coverage lives in [SQL lifecycle tests](../../../backend/tests/seed-factory/sql-lifecycle.test.mjs).

The browser's `seedDb` and `resetDb` tasks now use factory scenarios and a guarded model-schema reset, **not migration/legacy seeder undo commands**. Both require `SEED_TEST_RESET=true`, exact database acknowledgement, and a `seed_factory_test_*` database. They refuse the regular development database. Pending factory media is cleaned before a disposable reset.

The DB-backed experience JSON fixture is replaced by a `seedCatalog` task reading the same catalog as the factory. Request-only users/booking/profile fixtures remain unchanged.

From the repository root:

```powershell
node scripts\seed-e2e.mjs --sql
node scripts\seed-e2e.mjs "cypress/e2e/booking/**/*.cy.js,cypress/e2e/auth/password-reset.cy.js"
```

The runner starts uniquely named MySQL, Redis and local R2 worker containers, plus a temporary API/frontend for browser runs. It uses generated bootstrap secrets and console-only notifications, reuses installed application dependencies, and mounts `frontend/public` read-only as seed media. Its R2 state is private to the run. It removes its exact containers and anonymous data volumes afterward. It never resets or writes to the shared development database or storage worker. Keep tests within a run serial; separate runner invocations have separate databases, storage and caches.

## Additive template showcases

The `showcase` scenario is separate from `startup` and `demo`. It adds three
organizations (`house-party`, `food-tours`, `default-tours`) without replacing
the original `testcompany1` through `testcompany3` graph. Each scenario has an
independent ownership manifest; repeated applies skip an existing manifest.

The showcase integrates the experience templates delivered in PR #6: single-date
parties with free and paid ticket examples and explicitly consenting checked-in
guests, food tours with video/poster and pinned reviews, and a default coastal-tour
photo carousel.
Apply the experience metadata migration before seeding.

Checked-in showcase images/video are uploaded by the trusted seed process through
the shared storage transport; the known keys are journaled before uploads and
included in the scenario's durable media ownership. Unlike optional `--media`
inputs, this bootstrap path does not require a running API or a user login token.
It requires the real local storage worker, its matching `R2_DEV_TOKEN`, and
`SHOWCASE_MEDIA_ASSETS_DIR` (Compose mounts `frontend/public` at `/demo-assets`).
Uploads are not simulated and missing assets/storage failures stop seeding.

The Sequelize compatibility entry point is
`backend/server/seeders/20261028020000-showcase-experience-details.js`; the usual
`db:seed:all` sequence runs it after startup and generic demo seeding.
With the development stack's storage and database running:

```powershell
docker compose run --rm --no-deps -e SEED_FACTORY_ENABLED=true backend node server/scripts/seed.js apply showcase
```

The usual migration + `db:seed:all` command includes the showcase after the
startup and generic demo scenarios. Production DNS/tunnel activation and
production fixture policy remain outside this rework.
