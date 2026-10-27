# Seed factory decision and seeder rewrite plan

**Status:** Spike recommendation; implementation of existing production/development seeders is a follow-on.
**Scope:** Development/demo and test data only. Never run destructive cleanup against production.
**Code baseline inspected:** `backend/server/models/index.js`, model files, both `backend/server/seeders/*.js`, `backend/server/routes/media.js`, `backend/server/controllers/Media.controller.js`, `r2-local/src/index.js`, and `frontend/cypress/fixtures/*.json`.

## Decision

Adopt **`@faker-js/faker` (MIT) for synthetic values plus an in-house, schema-driven correlation/persistence layer over the existing Sequelize models**. Pin the Faker release and seed explicitly; keep graph structure, references, overrides, traits, idempotency, and cleanup policy in the application-owned layer. The spike pins `@faker-js/faker` 9.9.0 and adds no third-party factory or ORM dependency.

This split matches this app better than adopting an all-purpose ORM factory abstraction: the current graph includes a Sequelize many-to-many organization membership through `OrganizationMembers`, polymorphic comments, schedule templates and generated sessions, loosely typed order item product links, JSON media references, and a scheduler hook. Those behaviors need explicit repository semantics; Faker can provide synthetic values without owning associations or database lifecycle.

### Alternatives considered

| Option | Strengths | Trade-offs for this repository | Decision |
| --- | --- | --- | --- |
| Faker + in-house correlation layer | Small surface; explicit Sequelize calls and relationship order; explicit locale/seed; MIT; no ORM adapter dependency | Team maintains graph descriptors, validators and persistence/cleanup code; Faker is a value generator, not a model factory | **Recommended.** Spike proves the shape and keeps model rules visible. |
| Fishery + Faker | Modern composable JS/TS factory primitives, traits and transient params; MIT; can return Sequelize instances if the project writes the adapter | Does not provide a built-in Sequelize persistence/association lifecycle; still need our correlation store, deterministic seed policy, ordering, and cleanup. Two abstractions instead of one for this repository | Reconsider if consumers need object-level factory composition in application tests; not justified for the current seeder graph. |
| factory-girl + Sequelize adapter | Familiar persistence-oriented factories and a Sequelize adapter; can reduce boilerplate for individual model creation | Binds fixture behavior to a separate adapter and its maintenance/release compatibility; graph-wide idempotency, cleanup, polymorphic links and cross-seed reproducibility still need custom work. Verify repository health before adopting | Not selected; avoid assuming the adapter solves graph lifecycle. |
| Raw Sequelize seed scripts + `Math.random()` | No added dependency and straightforward for one-off SQL inserts | Repeats relationship logic, offers no central schema contract, makes correlated samples non-reproducible, and makes reuse/cleanup inconsistent; the current demo seeder already demonstrates these limits | Retain only for one-time, non-repeatable migrations if needed, not ongoing demo/test fixtures. |

Project links for license/maintenance verification: [Faker source and license](https://github.com/faker-js/faker), [Fishery source and license](https://github.com/thoughtbot/fishery), [factory-girl](https://github.com/aexmachina/factory-girl), and [factory-girl Sequelize adapter](https://github.com/aexmachina/factory-girl-sequelize). Confirm current releases and license obligations during dependency review; this recommendation does not promise a third party's future maintenance.

## Spike contract and API

The spike lives only under `backend/server/seed-factory/`; existing seeders are unchanged. `generateSeedGraph({ seed, counts, traits, overrides })` returns normalized logical records with stable keys, model names, attributes and explicit references. Faker receives a hash of the supplied seed. A fixed generation clock and deterministic generated usernames/order numbers keep the output stable across repeated calls. Missing seeds and excessive/invalid counts fail early.

Supported graph (topological insert order):

1. `Organization` and `Location`.
2. `User` members and `OrganizationMembers` join records.
3. `Experience` linked to organization/location/creator.
4. `ScheduleTemplate` and `ScheduledExperience` rows linked to each experience.
5. `TicketTier` rows linked to each experience.
6. `Order` linked to a seeded customer and `OrderItem` linked to its order and experience product.
7. `Comment` rows linked to an experience and member.

`SEED_SCHEMA` describes the model and reference fields. `validateSeedGraph` checks unique logical keys, resolved references and expected target record types before persistence. Example:

```js
const graph = generateSeedGraph({
  seed: 'pv-demo-2026-01',
  counts: { members: 4, experiences: 3, sessionsPerExperience: 2 },
  traits: { experience: { capacity: 8, autoSyncEnabled: false } },
  overrides: { organization: { name: 'Local Demo Organization' } },
});
```

Traits and field overrides are data overlays by record type; explicit overrides are applied after traits. Count controls are bounded to avoid accidental bulk creation. Persist through `materializeSeedGraph(graph, store, { mode: 'skip' | 'replace' })`; the injected store owns transaction execution and durable seed manifests. `cleanupSeedGraph(seedKey, store)` must delete only rows listed by that seed's manifest and run transactionally. The spike tests these semantics against an in-memory store, not MySQL.

### Production persistence adapter requirements (not implemented here)

Before replacing live seeders, implement and test a real Sequelize store with transaction support, model/field allowlists, deterministic graph dependency ordering, and an explicit durable `SeedRun` manifest (or equivalent dedicated seed ownership table). A durable manifest must retain exact created primary keys and generated media object keys; cleanup must refuse an unknown seed key and delete only manifest-owned rows, in reverse dependency order. Do not infer ownership by email/name, broad `LIKE` matching, timestamps, or generated IDs. Skip must return a prior completed manifest without duplicate inserts; replace must delete the old manifest-owned graph and insert the replacement atomically. If a failure occurs, roll back DB changes and clean up any uploaded object that was not committed. This needs a reviewed migration and an explicit environment guard; it is not part of this spike.

Existing model hooks require special care: `Experience.afterCreate` asynchronously syncs schedules unless `autoSyncEnabled: false`; spike experiences disable it and sessions are explicit. `Order.beforeCreate` overwrites `orderNumber` using wall clock and `Math.random()`, so the future persistence adapter must either use an approved deterministic-safe persistence path (for example a bulk insert that deliberately bypasses hooks) or change that hook in a separately reviewed implementation. Never silently claim the current hook preserves seed determinism.

The `OrderItem.ProductId` field is polymorphic rather than an enforced FK in `models/index.js`; the spike records the logical product key but the durable adapter must validate `ProductType` and resolve product IDs via an allowlisted product type. The current spike does not create booking reservations or attendees. Add those only when a consumer scenario requires them and account for the `ExperienceReservation` capacity hooks.

## Media pipeline decision and limitation

Use the existing API, not direct object-store writes. The spike's injectable `createMediaPipelineUploader` sends the authenticated `PUT /api/media/upload?ownerType=user&ownerId=…&kind=asset` request with the `_token` cookie required by `authUser`. In deployed development, `Media.controller.js` validates the request, forwards bytes to `R2_WORKER_BASE_URL` (the Compose service is `r2-local`), and the worker stores the object through its bucket binding. The adapter persists the returned object key as a string in a persisted `Experience.images` JSON array, matching existing app storage; it returns URL/type/size metadata to the caller but does not store a descriptor object in that array. A stubbed test verifies both the route request contract and the database-model update seam without a network or DB.

**Important model mismatch:** inspection found no standalone `Media` Sequelize model or media table. The current upload API stores an object in R2 and returns metadata; it does not create a relational Media row. This spike therefore persists an object-key reference on the Experience row, consistent with the existing `images` JSON format; it does not persist a normalized descriptor or separate media row. If “DB media record” is intended to mean a separate normalized `Media` row, that requires a product decision, schema migration and API ownership change outside this Epic; do not imply it already exists.

The current upload route accepts JPEG, PNG, WebP, GIF and AVIF only, with a 6 MiB request limit and user-owned upload authorization. It does **not** accept video/MP4. The `tacos-hero.mp4` follow-on seed must first define an authenticated video upload policy (allowed MIME/size, R2 validation, metadata persistence and cleanup), then exercise that real route. Do not bypass these restrictions by writing directly to R2 or silently expand route validation in this Epic. The media adapter is injectable so image/video policy can be added without coupling graph generation to transport.

## Full seeder/fixture rewrite plan

The spike is intentionally not the migration. Execute follow-on work in order, preserving current behavior until each stage is verified:

| Current source / consumer | Replacement using the factory | Migration and rollback |
| --- | --- | --- |
| `backend/server/seeders/20260212222654-startup-org-and-admin.js` — Martin LLC HQ/location, organization, static admin account, membership and organizer; current lookup-and-insert flow | A `startup` scenario with stable explicit seed and safe per-environment overrides. Read admin email/password material from local secret/config input and hash passwords through existing auth utilities; never preserve the hard-coded sample password or hash as a shared account. Model the org-location relation and membership explicitly | First add manifest-backed store and dry-run diff; run against a disposable test DB. Back up or tag the legacy rows before migration. Rollback removes only manifest rows, with FK-safe reverse order; preserve user-owned data and require manual review for collisions. |
| `backend/server/seeders/20260214193720-demo-experiences.js` — 24 demo users, seven locations, organization/experiences, sessions/tiers/comments and random coordinates/values | A `demo` schema with explicit seed, bounded counts, profile/location traits and stable date windows. Review all remaining lines in the legacy seeder during migration; keep individual graph properties in schema, not duplicated `Math.random()` loops | Generate a deterministic preview and compare record counts/associations; apply into an empty disposable DB, then a named demo namespace. Revert by manifest cleanup; leave legacy seeder executable until new results are accepted. |
| `frontend/cypress/fixtures/experiences.json` — four named examples with durations, capacities and ticket tiers; `users.json`, `booking.json`, `profile.json` are additional Cypress payload fixtures | Convert DB-backed scenarios to schema/count/trait inputs with explicit seeds. Keep request/response payload snapshots that are not database records as ordinary Cypress fixtures. Preserve named experiences/prices as stable override inputs rather than randomizing assertions | Migrate one Cypress spec group at a time; compare exact asserted fields. Roll back by restoring its fixture loader/import while leaving the factory available. |
| `backend/tests/integration/user-register.test.js`, Jest unit tests and `backend/tests/setup.js` | Use pure generated attributes for isolated unit tests; use a test-database adapter and disposable transaction/manifest for true relational integration tests. Do not create shared global fixture rows in setup | Introduce test store and independent test DB config first. Run focused tests, then full backend suite. Roll back test helper imports without changing runtime data. |
| Cypress booking specs under `frontend/cypress/e2e/booking/**` | Seed required experience/session/tier/order records once per isolated spec or spec group; use unique explicit seeds and manifest cleanup; use fixture-only stubs for UI-only tests | Confirm Cypress DB reset/isolation policy before enabling parallel runs. Start serially; test cleanup and retries; keep live seeded rows out of shared dev DB. |
| Future `EPIC-single-date-experience` | Schema trait sets `ScheduleTemplate.ruleType = 'datetime'` with one explicit date, plus one corresponding `ScheduledExperience`; validate date uniqueness/timezone | Integrate only after the factory contract is merged. Test normal schedule sync interaction; `autoSyncEnabled: false` where generated sessions are explicitly managed. |
| Future `EPIC-pinned-experience-comments` | Comment overrides with exact target experience, `CommentableType: 'Experience'`, `CommentableId`, `UserId`, and optional ParentId only for actual replies | Test target associations and idempotent replacement; do not rely on random generated comments or commentsCount alone. |
| Future `EPIC-hero-gallery-display-template` (`tacos-hero.mp4`) | Add media profile and `Experience.images` entry only after a supported authenticated video path exists; images use current pipeline now | Gate video seed on video MIME/size/security policy and durable manifest object cleanup; rollback deletes the owned object and DB descriptor. |

### Suggested implementation waves

1. **Foundation:** approve store manifest schema, environment guards, seed ownership, media record interpretation, and test DB isolation. Add and test the Sequelize store without changing either current seeder.
2. **Startup scenario:** introduce deterministic startup graph in parallel with legacy rows; compare organization, location, user, membership and organizer links. Review secret handling and collisions before opting in.
3. **Demo scenario:** migrate the broad demo seeder with fixed-seed snapshots, model validations, schedule sync disabled where explicit sessions are provided, and count/relationship checks.
4. **Test adoption:** migrate backend integration tests and Cypress database-backed specs; retain request-only JSON fixtures. Verify per-test cleanup and worker safety before Cypress parallelization.
5. **Feature examples:** single-date, pinned comments, then hero gallery after the video pipeline decision. Each follow-on Epic contributes named schema traits/overrides and tests; none edits the shared factory internals without contract coordination.
6. **Retirement:** after a release window and reproducibility evidence, remove old seeder entry points in a dedicated change. Keep rollback manifests/backups until environment owners approve their expiry.

### Rollback and safety gates

- Never seed or clean production by default. Require `NODE_ENV`/environment allowlist and an explicit opt-in flag; reject production mode unless a separately reviewed policy exists.
- The first rollout uses a disposable, isolated MySQL database and never the shared `react-booking-app` stack as a test database.
- DB graph changes and manifest writes are transactional. R2 uploads cannot participate in SQL transactions; record object keys, delete uploaded but unreferenced objects on failed commit, and make cleanup retryable.
- Cleanup is manifest-only, reverse dependency order, idempotent, and logs a dry-run list before deletion. Unknown manifests, external references, or row-count mismatch stop the cleanup rather than widening its target.
- Keep legacy migration files until replacements pass count, association, stable-seed, repeat-run, failure rollback and fresh-database checks. Do not make a migration's `down` delete data it did not create.

## Risks, assumptions and user decisions

1. **Media schema meaning:** current code has only `Experience.images` JSON and no Media row. Confirm whether that satisfies “DB media record,” or approve a separate Media table/API Epic.
2. **Video upload:** current API only accepts image MIME types and 6 MiB. The hero video seed is blocked on an explicit upload policy and endpoint support.
3. **Admin bootstrap secrets:** the current startup seeder contains a fixed development admin account/password hash. Decide local-only bootstrap credentials/secret source before replacing it.
4. **Cypress reset model:** inspect existing Cypress tasks/CI setup before selecting per-spec seeding, shared scenario reuse or parallel workers; current fixtures are JSON input, not a proven DB reset contract.
5. **DB materializer:** spike defines and tests a transactional persistence interface only. Durable manifest migration and a Sequelize adapter require a separate implementation and disposable DB validation.
6. **Order hooks and IDs:** current order hook introduces runtime randomness; generic `ProductId` is not a declared FK. Resolve deterministic insert and product type validation in the adapter before migrating orders.

## Verification evidence

- `backend/tests/seed-factory/seed-factory.test.js`: 5 passing Jest tests (determinism, schema references, traits/overrides, in-memory idempotency/cleanup, stubbed media upload and Experience JSON persistence).
- Not run: full backend suite, MySQL integration/materialization, actual Express/R2 upload, Cypress suite, or video upload. The shared development database/containers were not used.
