# Equipment booking interface

The React application uses the existing same-origin client, session, CSRF token,
language preference and Noto Sans SC font. `/app/booking` is the default landing
page for accounts without `workflow_access`; the fabrication routes and navigation
also require that independent grant. Administrator account management remains
available separately. The backend checks the current grant on every fabrication
request; frontend session refresh on navigation, window focus and visibility
updates the navigation after a grant or revocation.

Day view shows equipment columns on a 24-hour timeline. Week view shows Monday
through Sunday with equipment codes and non-overlapping lanes for simultaneous
events. Month view shows six complete weeks, counts and occupied equipment-hours
relative to the selected equipment capacity. Selecting a day opens day view.
All dates and datetime inputs use Asia/Shanghai independently of browser timezone.
The intervals remain half-open, including events clipped across midnight.

Equipment filters apply to the three calendar views, notices and personal ledger.
The history disclosure can include cancelled bookings, no-shows and released
maintenance; those states never appear as occupied blocks on the main calendar.
Purple, cyan, green and amber represent reserved, in use, completed and maintenance.
Text labels accompany color. Narrow screens retain horizontal timeline scrolling.

Owners can book, reschedule future reservations, cancel, start inside the scheduled
window, save usage drafts, submit and end atomically, or end with a draft and fill
in later. Actual times come from the server. Usage forms come from each record's
template, version and units snapshot, including six separate glovebox values and
repeatable evaporation layers. Completed drafts appear in the pending list and do
not block new bookings. Managers can inspect their equipment's private records;
editing another owner's usage remains forbidden. Submitted amendments remain
audited by the backend.

Booking and notice request keys survive a retry for the same form input. Controls
disable while writes are pending. Conflicts keep the form visible and provide a
refresh/retry path. Language changes use `booking.*` resources in the existing
store and preserve mounted form values. Equipment names, materials, notes and
notices remain in their authored language. No experimental provenance links exist.

The inbox persists server notifications and read state. Management, notice history
and complete browser acceptance are delivered in the next independent PR. This
feature is not a production rollout or an invitation to the full laboratory group.

## PR-2 verification

- Local TypeScript, ESLint and all 417 Vitest tests passed, including laboratory
  timezone boundaries, week/month ranges, half-open midnight clipping, event lanes,
  booking-only routes for all global roles, language/form preservation, booking
  timestamps, filter persistence, private-detail isolation and ending with a draft.
- Production bundle built from the locked dependencies. Local Node is 26; CI uses
  the repository-supported Node 24 and must verify committed bundle freshness.
- Synthetic demo review at `/app/booking` records before/after screenshots in
  ignored `.run/booking-before.png` and `.run/booking-pr2-*.png`. No real identities,
  data or user mockups are committed.
