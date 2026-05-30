# MinTrack Database Schema

This document describes:

- the runtime dependencies used for persistence and sync
- the Supabase database schema the app expects
- the exact fields stored in the database
- the browser-only storage that does not live in Supabase

## Persistence Dependencies

### App dependencies

| Dependency | Purpose |
| --- | --- |
| `@supabase/supabase-js` | Auth, remote database reads/writes, cloud sync |
| `localforage` | Offline queues stored in IndexedDB |
| `react` | UI/state runtime |
| `react-dom` | Browser rendering |

### External platform dependency

The app depends on a Supabase project with:

- `auth.users` for user identity
- a `profiles` table keyed by `auth.users.id`
- a `subjects` table keyed by subject id and linked to a user
- a `sessions` table keyed by session id and linked to a subject

## Entity Relationship

```text
auth.users (Supabase Auth)
  1 -> 1 profiles
  1 -> many subjects
subjects
  1 -> many sessions
```

## Remote Database Tables

### 1. `profiles`

One row per signed-in user.

| Column | Type | Required | Stored by app | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | yes | yes | Same value as `auth.users.id` |
| `term_start_date` | `timestamptz` | no | yes | Academic term start date |
| `term_end_date` | `timestamptz` | no | yes | Academic term end date |

What this table stores:

- which user owns the profile
- the active term range for planning daily targets

What it does not store:

- subject progress totals
- active timer state
- paused time counters

### 2. `subjects`

One row per tracked subject for a user.

| Column | Type | Required | Stored by app | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | yes | yes | Generated client-side with `crypto.randomUUID()` |
| `user_id` | `uuid` | yes | yes | Owner user id |
| `name` | `text` | yes | yes | Subject name such as "Calculus" |
| `target_hours` | `numeric(10,2)` | yes | yes | Total goal hours for the term |
| `valid_hours` | `numeric(10,2)` | yes | yes | Counted study hours accumulated so far |

What this table stores:

- subject identity
- ownership
- target hours
- synced valid/completed study hours

What the app keeps only in local browser state for each subject:

- `carryover`
- `completed_today`
- `paused_time_total`
- `paused_time_today`

Those four values are used in UI calculations, but they are not written to Supabase anywhere in the current code.

### 3. `sessions`

One row per logged study session.

| Column | Type | Required | Stored by app | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | yes | yes | Generated client-side before sync |
| `subject_id` | `uuid` | yes | yes | Linked subject |
| `start_time` | `timestamptz` | yes | yes | Session start time |
| `end_time` | `timestamptz` | yes | yes | Session end time |
| `duration_minutes` | `integer` | yes | yes | Duration in minutes |
| `is_discarded` | `boolean` | yes | yes | `true` if user discarded the session |

What this table stores:

- every synced manual log
- every synced finished timer session
- discarded sessions as explicit rows when the user discards a session

Important behavior:

- `subjects.valid_hours` is also updated after a non-discarded session sync
- deleting a subject deletes its sessions first in app logic

## Exact Remote Data Currently Written

### Writes to `profiles`

The app writes:

```json
{
  "id": "user-uuid",
  "term_start_date": "2026-05-01T00:00:00.000Z",
  "term_end_date": "2026-08-31T00:00:00.000Z"
}
```

### Writes to `subjects`

The app writes:

```json
{
  "id": "subject-uuid",
  "user_id": "user-uuid",
  "name": "Calculus",
  "target_hours": 100,
  "valid_hours": 12.5
}
```

### Writes to `sessions`

The app writes:

```json
{
  "id": "session-uuid",
  "subject_id": "subject-uuid",
  "start_time": "2026-05-21T08:00:00.000Z",
  "end_time": "2026-05-21T09:30:00.000Z",
  "duration_minutes": 90,
  "is_discarded": false
}
```

## Browser-Only Storage

These values are stored locally and are not part of the remote database schema.

### `localStorage`

Key: `mintrack_state`

Stored shape:

```json
{
  "term": {
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-08-31T00:00:00.000Z"
  },
  "subjects": [
    {
      "id": "subject-uuid",
      "name": "Calculus",
      "target_hours": 100,
      "valid_hours": 12.5,
      "carryover": 0,
      "completed_today": 1.5,
      "paused_time_total": 0.25,
      "paused_time_today": 0.1
    }
  ],
  "activeSession": {
    "subjectId": "subject-uuid",
    "startTime": 1747814400000,
    "startedAt": "2026-05-21T08:00:00.000Z",
    "ui": {
      "focusLength": 25,
      "breakLength": 5,
      "cycles": 4
    },
    "lastNotifiedPhaseId": null,
    "isPaused": false,
    "pausedAt": null,
    "totalPausedMs": 0
  },
  "last_updated_date": "2026-05-21T00:00:00.000Z"
}
```

Other localStorage keys:

- `theme`
- `seen_update_<APP_VERSION>`

### IndexedDB via `localforage`

Database name: `MinTrack`

Stores:

1. `session_queue`
   Used for unsynced session inserts.

   Stored fields:
   - `id`
   - `subject_id`
   - `start_time`
   - `end_time`
   - `duration_minutes`
   - `is_discarded`
   - `new_valid_hours`

2. `action_queue`
   Used for unsynced subject/profile operations.

   Stored fields:
   - `id`
   - `type`
   - `timestamp`
   - `payload`
   - `subjectId`
   - `userId`

## Recommended SQL Types

The companion SQL file lives at:

- [supabase/schema.sql](/C:/Users/Anuj/Alexandria/supabase/schema.sql)

## Current Data Gaps

These fields are used in the app but are not persisted remotely:

- `carryover`
- `completed_today`
- `paused_time_total`
- `paused_time_today`
- `activeSession`
- `last_updated_date`

If you want, we can make a follow-up migration that stores those in Supabase too, but the current codebase does not sync them.
