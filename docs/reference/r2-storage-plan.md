---
sidebar_label: R2 storage plan
sidebar_position: 2
---

# R2 Storage Plan and API Contract

## Scope

This plan maps the current PUERTO VALLARTA TODAY data model to a production-ready R2 usage pattern for image and blob storage.

## 1) What stays in DB vs R2

### Keep in MySQL (source of truth)
- User identity, auth, role, memberships, org/admin flags
- Event, hotel, reservation, schedule, pricing, ticket tiers
- Ownership/authorization metadata for files
- Search/sort/filter fields

### Store in R2 (blob payload)
- User profile images
- Event thumbnails and gallery images
- Hotel gallery images (if you move from static app assets to uploads)
- Organization logos/banners (recommended)
- Optional future blobs: ticket PDFs, invoice/receipt PDFs, CSV exports

## 2) Current model mapping

### `Users.profilePicture`
- Current: string URL/path
- Recommended: store canonical R2 object key in DB (or CDN URL if preferred)
- Suggested key pattern: `users/{userId}/profile/{uuid}.{ext}`

### `Events.thumbnail`
- Current: string URL/path
- Recommended: R2 key for tile image
- Suggested key pattern: `orgs/{orgId}/events/{eventId}/thumbnail/{uuid}.{ext}`

### `Events.images` (JSON array)
- Current: array of URLs/paths
- Recommended: array of R2 keys (or public URLs derived from keys)
- Suggested key pattern: `orgs/{orgId}/events/{eventId}/gallery/{uuid}.{ext}`

### `Hotels.images` (JSON array)
- Current: array of static URLs/paths
- Recommended: for admin-uploaded hotel media, move to R2 keys
- Suggested key pattern: `hotels/{hotelId}/gallery/{uuid}.{ext}`

### New recommended fields (optional, high value)
- `Organizations.logo` (string)
- `Organizations.bannerImage` (string)
- Suggested key patterns:
  - `orgs/{orgId}/branding/logo/{uuid}.{ext}`
  - `orgs/{orgId}/branding/banner/{uuid}.{ext}`

## 3) Optional normalization (phase 2)

If media usage expands, add a `MediaAssets` table instead of keeping JSON arrays only.

### `MediaAssets` proposal
- `id` (PK)
- `ownerType` (`user|organization|event|hotel|reservation`)
- `ownerId` (FK by convention)
- `kind` (`thumbnail|gallery|profile|logo|ticket|invoice`)
- `objectKey` (R2 key)
- `contentType`
- `byteSize`
- `etag`
- `isPublic` (boolean)
- `createdByUserId`
- timestamps

This keeps ownership, lifecycle, and auditing clean while R2 stores only blob bytes.

## 4) API contract (recommended)

Base path: `/api/media`

### 4.1 Create upload URL
`POST /api/media/upload-url`

Request body:
- `ownerType`
- `ownerId`
- `kind`
- `fileName`
- `contentType`
- `byteSize`

Server behavior:
- Validate auth + authorization (e.g., only org admins can upload org/experience images)
- Validate MIME and max size
- Generate key by policy
- Return signed upload URL (or worker direct upload token)

Response:
- `objectKey`
- `uploadUrl`
- `expiresAt`
- optional `headers` required for upload

### 4.2 Finalize upload
`POST /api/media/finalize`

Request body:
- `objectKey`
- `ownerType`
- `ownerId`
- `kind`

Server behavior:
- Verify object exists in R2
- Read metadata (`etag`, size, contentType)
- Persist metadata and update owner field(s)

Response:
- `asset` metadata
- `publicUrl` (if public)

### 4.3 Read/download URL
`GET /api/media/read-url?objectKey=...`

Server behavior:
- Validate caller can read object
- Return signed read URL (private) or canonical public URL

### 4.4 Delete asset
`DELETE /api/media/:id` (or by `objectKey`)

Server behavior:
- Validate ownership/admin rights
- Soft-delete metadata record (recommended) and remove object from R2

## 5) Security and lifecycle rules

- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `application/pdf` (if docs)
- Max size by kind (example): profile `<=5MB`, gallery `<=10MB`, docs `<=20MB`
- Enforce org boundary in object keys (`orgs/{orgId}/...`)
- Prefer private buckets + signed URLs for user-generated content
- Add TTL cleanup job for orphaned uploads not finalized
- Use immutable keys (`uuid`) to avoid race/overwrite bugs

## 6) Caching and delivery

- For public images: use Cloudflare caching + long cache headers
- For frequently replaced assets (profile/logo): keep immutable key and update DB pointer
- For thumbnails: generate standardized sizes and store separately
  - Example: `.../thumbnail/640w/{uuid}.webp`

## 7) Migration plan from current state

### Phase A (low risk)
- Keep existing schema (`thumbnail`, `images`, `profilePicture`)
- Start storing new uploads as R2 keys/URLs
- Backward-compatible read logic: if local `/images/...`, still serve old path

### Phase B
- Add upload/finalize/read API endpoints
- Update frontend forms to upload files (not raw URLs)
- Keep existing URL-input fallback for admin migration window

### Phase C
- Backfill old local images to R2 and update DB pointers
- Remove URL-only flows where appropriate

### Phase D (optional)
- Introduce `MediaAssets` table and migrate high-growth entities first (`Events`, `Users`)

## 8) What else is worth storing in R2 (beyond images)

Good fits:
- Ticket PDFs and invoice/receipt PDFs
- Event export files (CSV/JSON)
- Temporary import files for batch operations
- Audit snapshots and data export bundles

Not good fits (keep in DB):
- Anything queried relationally for filtering/sorting
- High-frequency mutable counters/flags
- Permission matrices and membership relations

## 9) Immediate implementation recommendation for this repo

1. Use R2 for `Users.profilePicture`, `Experiences.thumbnail`, and `Experiences.images` first.
2. Keep DB schema unchanged initially (store R2 key or public URL in existing string/JSON fields).
3. Add `/api/media/upload-url` + `/api/media/finalize` + `/api/media/read-url` endpoints.
4. Update create/edit experience UI to upload images to R2 and save returned keys.
5. Add org branding fields next (`Organizations.logo`, `Organizations.bannerImage`).

This sequence gives immediate value with minimal disruption.
