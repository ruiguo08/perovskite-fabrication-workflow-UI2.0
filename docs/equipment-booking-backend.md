# Equipment booking backend (PR-1)

This adds a laboratory equipment ledger alongside the fabrication registry.
Booking records have no links to experiments, fabrication batches, devices or
results. PR-2 supplies the calendar and user actions; PR-3 supplies management
screens. Do not invite the whole group until those interfaces and acceptance
checks are complete. The existing bilingual frontend is unchanged in PR-1.

## Deployment and migration

1. Back up the PostgreSQL database and verify the backup. Stop old application
   workers while upgrading so account creation cannot straddle the migration.
2. Run `alembic upgrade head` with the existing migration role. Revision
   `0017_equipment_booking` installs the trusted `btree_gist` extension, six
   tables, the overlap exclusion constraint and the single-in-use index.
   Deployments that restrict extension installation must provision `btree_gist`
   with their database administrator before this step. Never give extension or
   DDL privileges to the application role.
3. The migration grants **every existing account**, including instructors,
   administrators and inactive accounts, a `workflow_access` row and a migration
   audit event. Inactive accounts still cannot authenticate. Alembic performs
   this backfill once, when crossing 0017; application startup and catalogue
   initialization never backfill grants. New accounts of every global role
   default to booking access only.
4. The migration initializes the 20 specified units with no manager and with
   booking disabled. `perovskite-workflow-admin seed-equipment` can safely be
   repeated to restore missing catalogue entries; it never overwrites existing
   equipment settings or grants workflow access.
5. Start the new application. A system administrator assigns each equipment
   manager and enables booking through the API. A fresh deployment's first
   administrator can manage users, equipment and workflow grants without
   already having workflow access. Revocation applies to the next request of
   an already logged-in user.

`booking_schema_v1.py` and `booking_catalog_v1.py` are frozen migration contracts.
Future schema or template changes require a forward migration and a new version,
not edits to those files. Downgrading 0017 drops the booking/access tables and
their contents; recover from a verified backup if reversing deployment. Normal
operation uses forward migrations. The shared extension remains installed.

SQLite retains isolated development/test schema creation. It has the unique
in-use index and service overlap checks, but PostgreSQL is the concurrency
authority. Synthetic accounts supplied through the explicitly test-only
`_test_user` hook receive a fixture grant; PostgreSQL rejects that hook. Other
legacy workflow fixtures explicitly grant their accounts in the test code.

Business data uses the application's existing relational storage. Password
hashing does not encrypt booking records. Disk and backup encryption remain
deployment responsibilities.

## Authorization and transactions

The existing `student`, `instructor`, `administrator` roles retain their meaning.
An independent, current `workflow_access` grant gates **all** routes composed by
`web.routes.create_router`, including catalogs, queries, analysis, uploads,
results and the legacy PDF/JSON download URLs. Passing this module guard still
requires the original ownership and role checks. No instructor or equipment
manager bypass exists. Authentication, account administration and booking are
outside this guard. `/api/session` and JSON login include `workflow_access` for
the later navigation work.

Equipment managers are assigned only by system administrators, one active user
per open unit. They can manage only their assigned equipment; administrators
retain audited emergency actions. Account deactivation atomically pauses all
equipment assigned to that manager and records an `equipment.pause` event.
Reactivation does not automatically reopen units. Owners alone can start use
and edit their ledger. Managers and system administrators can read the relevant
ledger and pending list, and can end abandoned use with a reason.

State-changing booking operations own one transaction and share its connection
with `repository.booking.BookingStore` and the existing audit writer. Equipment
row locks precede reservation and usage locks. Manager reassignment locks the
target user before the equipment, matching account deactivation. User locks use
PostgreSQL `FOR NO KEY UPDATE`, allowing audit foreign keys to take key-share
locks on another administrator without a lock cycle. Conditional
state updates, a partial unique in-use index, and a unique usage/reservation
constraint prevent state reversal and duplicate ledger records. PostgreSQL's
GiST exclusion constraint additionally protects direct independent transactions.

Time occupancy is `[starts_at, ends_at)`. `planned`, `in_use`, `completed` and
`blocked` occupy the original interval; `cancelled`, `no_show` and `released`
release it. Ending use never changes planned times. An overrun leaves later
reservations intact but prevents another start until the old use is closed.
Maintenance conflicts are rejected; managers must explicitly resolve bookings.

## API contract

All endpoints below require an active existing login. Every POST, PUT and PATCH
also requires the existing `X-CSRF-Token` header and same-origin protection.
The prefix is `/api/booking`. Request/response schemas are in OpenAPI when the
deployment enables documentation. Dates use timezone-bearing ISO 8601. Inputs
and calendar bounds normalize to UTC before storage/query, preserving offsets
even with SQLite's timezone-naive adapter; responses also return UTC. The later UI displays the laboratory calendar
in `Asia/Shanghai`.

| Method / suffix | Behavior and permission |
| --- | --- |
| GET `/equipment` | Equipment catalogue for every active user. |
| PATCH `/equipment/{id}` | Equipment manager or administrator edits name, description, group, type, location, template, units and booking availability. Only a system administrator may change `manager_id`, including removal. |
| GET `/reservations` | Team calendar: `starts_at`, `ends_at`, optional `equipment_id`, `history`, `offset`. At most 93 days and 1,000 rows per page. Includes equipment, times, status and reservation-holder name, not private ledger fields or notes. `history=true` includes cancelled/no-show/released records. |
| POST `/reservations` | Create own booking, or an equipment manager's maintenance block. Requires `equipment_id`, `starts_at`, `ends_at`, `request_key`; `kind` defaults to `booking`. Maintenance requires `reason`. No past creation. |
| GET `/reservations/{id}` | Detailed reservation including cancellation/emergency reason; owner, assigned manager or administrator only. |
| PATCH `/reservations/{id}/time` | Owner reschedules a planned, not-yet-started booking, with conflict revalidation. |
| POST `/reservations/{id}/actions` | Lifecycle command described below. |
| GET / PUT `/reservations/{id}/usage` | Private usage snapshot. Read by owner/manager/administrator, written by owner only. PUT replaces the `fields` object and `notes`, with `submit=false` for drafts or `true` for completed-use submission/amendment. |
| GET `/ledger` | Owner/assigned-manager/administrator scope is applied in SQL. Optional `equipment_id`, `pending`, `offset`; 1,000 rows per page. Pending means reservation completed and ledger not submitted. |
| GET / POST `/notices` | Read effective non-withdrawn notices, optionally by equipment and offset; create for managed equipment. POST accepts body, pinned, valid_from, valid_until, request_key and optional notify_until. |
| PATCH `/notices/{id}` | Assigned manager/administrator pins/unpins or withdraws a notice. |
| GET `/notifications` | Recipient's persistent inbox with offset paging, 1,000 rows per page. |
| POST `/notifications/{id}/read` | Recipient marks a notification read; retries preserve the first read time. |
| GET `/workflow-access` | System administrator lists grant/revocation metadata. |
| PUT `/workflow-access/{user_id}` | System administrator grants/revokes with `{"enabled": true/false}`; actor and time are audited. |

Booking and notice creation keys are scoped to the authenticated actor. Repeating
an identical creation returns the original record; reusing its key for different
input returns 409. Callers must preserve the key across retries. Notifications
have database-enforced deduplication keys. A cancellation and its notification,
or a notice and its selected recipients, commit together.

Lifecycle POST uses `{"action": "...", "reason": "..."}`:

| Action | Rule |
| --- | --- |
| `start` | Owner, planned, inside the reserved time window; device must have no in-use record. |
| `cancel` | Owner may cancel a planned booking. Manager/administrator cancellation of another user's booking must precede the start and include a reason; one notification is saved. |
| `no_show` | Manager/administrator, planned booking after its window ends, reason required. |
| `release` | Manager/administrator releases a maintenance block, reason required. |
| `end` | Owner ends current use; optional validated draft fields/notes, leaving a completed reservation and pending ledger. |
| `submit_and_end` | Owner supplies complete fields (or an already complete saved draft); ledger submission and end occur in one transaction. Invalid submission leaves the reservation in use. |
| `force_end` | Assigned manager/administrator closes in-use reservation, reason required, preserving the user's ledger. |

Completed/cancelled/no-show states cannot be reset. Repeating an already-applied
action returns its terminal record without another transition. Later ledger
submission uses the usage PUT, rather than repeating the end command. Submitted
records cannot be turned back into drafts; amendments record actor/time and
before/after values in `audit_events`.

Conflicts and invalid transitions return 409 with a business message. PostgreSQL
deadlock/serialization aborts also return a retryable 409 after transaction
rollback; a direct exclusion-constraint race may abort its losing participant
this way rather than with an exclusion-violation code. Permission
failures 403, unknown records 404, and invalid input 422. Authentication failures
retain the existing API 401 contract. Raw database diagnostics are not returned.

## Usage templates and units

Every ordinary reservation gets exactly one draft usage snapshot at creation.
The equipment explicitly selects the template; GB locations and code prefixes
do not select it. Configuration changes affect future reservations only.
Drafts permit missing fields but validate every supplied value and reject extra
fields. Final submission requires every field below. `notes` is optional.

| Template | Required `fields` | Saved default units |
| --- | --- | --- |
| `glovebox` | before_h2o, after_h2o, before_o2, after_o2, before_temperature, after_temperature | h2o ppm, o2 ppm, temperature °C |
| `ald` | material, cycles, initial_temperature, chamber_pressure | cycles cycle, temperature °C, pressure Pa |
| `evaporation` | layers (nonempty array of material/thickness pairs), vacuum, initial_temperature | thickness nm, temperature °C, pressure Pa |
| `general` | usage (nonblank text) | none |

Pressure configuration may explicitly choose Pa/mbar/Torr; thickness may choose
nm/Å. Water and oxygen are separate nonnegative numbers. Cycles are positive
integers. Numbers reject booleans, strings, NaN and infinity. No value-based
unit guessing or conversion occurs. ALD at GB-7 and TE units at GB-8/GB-10 keep
their dedicated templates.

Notice body and user-entered text remain in the original language. Notices sort
pinned first, support effective/expiry dates and withdrawal. On publication,
`notify_until` may select booking holders within the next 31 days; each recipient
receives one persistent event even if they have several affected reservations.
There is no email, SMS or external messaging integration.

## Verification and remaining delivery

Local checks:

```text
python -m unittest tests.test_booking tests.test_booking_postgresql tests.test_migrations -v
python -m unittest discover -s tests -v
ruff check .
mypy
mypy --follow-imports=silent src/web/app.py src/web/database.py
```

`tests.test_booking_postgresql` explicitly skips when real PostgreSQL URLs are
absent. The Tests workflow's PostgreSQL job runs it after migrations and
`alembic check`, with separate migration/runtime roles. Two independent database
transactions race overlapping inserts and in-use transitions. Other tests cover
adjacency, different equipment, booking/maintenance exclusion, released states,
completion occupancy, operation retries and unique usage rows. A disposable
schema runs the real Alembic chain with legacy accounts of every role, then
creates new accounts and repeats `upgrade head` to verify no new grants.

PR-2 remains: day/week/month calendar, equipment filters, owner lifecycle and
dynamic usage forms, announcements/inbox, `booking.*` resources in the existing
i18n system, and navigation that uses `workflow_access` and defaults booking-only
users to booking. Reuse Noto Sans SC and the existing terminology guide.

PR-3 remains: equipment/manager, notice/maintenance, no-show/cancellation and
emergency-use management screens, pending-ledger views, workflow-grant management
UI and end-to-end group acceptance. The backend permissions above already apply.
Both final-commit Ubuntu and Windows workflows must pass before merge.
