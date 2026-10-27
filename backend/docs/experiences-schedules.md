# Experience Scheduling API

This document describes the `schedules` payload accepted by the Experience create and update endpoints. The backend normalizes two kinds of schedule sources:

- `template` — a schedule template that can be recurring (cron) or a single datetime rule. Stored in `ScheduleTemplates`.
- `picked` — an explicit organizer-picked occurrence (single date/time). Stored in `PickedOccurrences`.

These sources are materialized into `ScheduledExperiences` by the scheduler service. The create and update endpoints accept a `schedules` array which can contain both kinds.

## Endpoints

- `POST /api/experiences` — create an Experience. Accepts `schedules` in the request body.
- `PUT  /api/experiences/:id` — update an Experience. If `schedules` is provided it replaces the existing templates/picks for the Experience.

## `schedules` payload

The `schedules` property is an array of schedule items. Each item must include `kind` with value `template` or `picked`.

Common fields:

- `kind` (string, required): `template` or `picked`.
- `name` (string, optional): Human-friendly label for the template/pick.
- `capacity` (integer, optional): Optional capacity for occurrences created from this source.

Example envelope (partial request body):

```json
{
  "title": "Sunset Kayak Tour",
  "description": "2-hour guided kayak tour",
  "schedules": [ /* array of schedule items (see below) */ ]
}
```

### Template item (`kind: "template"`)

Template items describe recurring or single-datetime rules.

Required fields for templates:

- `ruleType` (string, required): `cron` or `datetime`.

If `ruleType` is `cron`:

- `ruleCron` (string, required): a cron expression (cron-parser compatible) defining recurrence (e.g., `0 18 * * 5` for every Friday at 18:00).
- `timezone` (string, optional): IANA timezone name used for cron expansion (defaults to server timezone if omitted).
- `startDate` / `endDate` (ISO date strings, optional): bounds to limit expansion.
- `maxOccurrences` (integer, optional): safety cap when expanding. Scheduler respects this when materializing occurrences.

If `ruleType` is `datetime`:

- `ruleDateTime` (string, required): ISO 8601 datetime (single occurrence rule). Optionally paired with `durationMinutes`.

Optional fields for templates:

- `durationMinutes` (integer): length of the event in minutes. Used to compute `endDateTime` for materialized `ScheduledExperiences`.
- `capacity` (integer): default capacity for occurrences from this template.

Example template item (cron):

```json
{
  "kind": "template",
  "name": "Weekly Friday Evening",
  "ruleType": "cron",
  "ruleCron": "0 18 * * 5",
  "timezone": "America/Mazatlan",
  "durationMinutes": 120,
  "capacity": 12
}
```

Example template item (single datetime):

```json
{
  "kind": "template",
  "name": "Holiday Special",
  "ruleType": "datetime",
  "ruleDateTime": "2026-12-24T10:00:00-07:00",
  "durationMinutes": 90
}
```

### Picked occurrence item (`kind: "picked"`)

Picked occurrences are explicit date/times chosen by the organizer.

Required fields for picks:

- `dateTime` (string, required): ISO 8601 datetime for the occurrence.

Optional fields:

- `endDateTime` (string): ISO 8601 end datetime. If omitted, `durationMinutes` from the experience or template may be used.
- `capacity` (integer): capacity for this specific picked occurrence.
- `note` (string): optional note visible to organizers in admin tools.

Example picked item:

```json
{
  "kind": "picked",
  "dateTime": "2026-07-03T17:00:00-07:00",
  "capacity": 8,
  "note": "Special one-time sunset tour"
}
```

## Behavior and validation

- If the request body omits `schedules`, the existing templates and picked occurrences are unchanged (on update) or none are created (on create).
- If `schedules` is provided on update, the server will replace the Experience's templates and picks with the provided array (transactionally).
- The server validates the payload shape and returns a JSON error envelope for validation failures. Example response shape on validation errors:

```json
{ "errors": ["schedules[0].ruleCron is required for cron templates"] }
```

- After successfully creating or updating templates/picks, the scheduler service runs a non-blocking sync that materializes `ScheduledExperiences` from templates and picks. Materialization is idempotent and deduplicates by `ExperienceId` + exact start datetime.

## Notes for frontend implementers

- Send ISO 8601 datetimes including timezone offsets when possible.
- Use `ruleType: "cron"` for recurring rules and `ruleType: "datetime"` for single UTC/local datetimes.
- When updating an experience and you want to remove all schedules, send `schedules: []` in the PUT payload.

For additional implementation detail, see the model files: `backend/server/models/ScheduleTemplate.model.js` and `backend/server/models/PickedOccurrence.model.js`.

---
Generated: 2026-03-25
