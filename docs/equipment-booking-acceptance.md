# Equipment booking v1 acceptance

Delivery is split across [PR-1](https://github.com/ruiguo08/perovskite-fabrication-workflow-UI2.0/pull/25)
(backend) and [PR-2](https://github.com/ruiguo08/perovskite-fabrication-workflow-UI2.0/pull/26)
(calendar/owner workflows), followed by the management and acceptance PR containing
this document. The PRs are stacked to preserve their individual review boundaries.
No production deployment, group invitation or real account grant is performed.

## Acceptance evidence

| Requirement | Evidence |
|---|---|
| Existing accounts keep fabrication access exactly once; all new roles default to booking only | Real Alembic-chain PostgreSQL test, explicit test fixture grants, booking API and route tests |
| Teacher and equipment-manager status do not grant fabrication access | Backend permission tests; React route tests for every global role; real browser manager and teacher checks |
| Revocation applies to an existing logged-in session, including direct APIs | Backend guard tests plus administrator browser grant/revoke with the same instructor HTTP session before and after |
| Auth, CSRF, account administration and booking remain independent | Auth regressions, every booking mutation's CSRF dependency assertion, real browser writes under the production CSP |
| Exactly 20 stable units; independent location/template; closed without an active manager | Idempotent catalog tests; database checks; browser equipment count and profile/editor checks |
| Only system administrators assign managers; management is per equipment | Backend cross-equipment and inactive-manager tests, frontend controls test, browser assigned-unit scope |
| PostgreSQL overlap exclusion, half-open adjacency, different units, maintenance and single in-use row | Eight real PostgreSQL booking/migration checks, including independent transaction races and runtime-role checks |
| Owner lifecycle, repeated requests, no status rollback or duplicate ledger | Backend state/idempotency tests; owner browser creates, starts and ends a real persisted reservation |
| Ending for later completion leaves completed + draft and frees in-use state | Backend transaction checks and browser assertion of completed state, actual end and pending ledger before follow-up submission |
| Managers cancel with reason and notification; no-show only after end; forced ending preserves the owner ledger | Backend permission/state/audit tests; real browser performs all three actions and inspects persisted results |
| Template/version/units snapshots, six glovebox values, ALD integer/pressure, evaporation layers and general usage | Backend strict schema/snapshot tests, dynamic form tests, actual browser glovebox submission; invalid types/NaN/infinity rejected server-side |
| Main calendar hides released states; history retains them | Backend calendar tests, React split of occupied/history states, browser manager history and maintenance release |
| Shanghai time independent of browser timezone; day/week/month and linked filters | Offset storage/query regression; calendar boundary/lane tests; real browser view/filter transitions and API timestamp comparison |
| Notices support validity, pin, withdrawal and notification horizon; inbox/read persists and deduplicates | Backend notice/dedup tests; scoped historical access tests; browser publication/pin/unpin/withdraw and repeated recipient read assertions |
| Ledger reads allow owner, assigned manager, instructors and administrator; editing remains owner-only | Backend cross-user/cross-equipment tests, frontend private-fetch/read-only tests; instructor supervision has a separate all-user ledger with equipment/pending filters and no writes |
| Grant reads never imply revocation when pending or failed, and older responses cannot overwrite newer grants | User-directory regression tests cover unknown/disabled state, retry, overlapping writes and out-of-order reads, metadata independence and a failed read after a successful save |
| Native bilingual behavior, units/material names unchanged, drafts retained and narrow layouts usable | Existing i18n regression; booking form language tests; real Chrome 320px flow; synthetic before/after screenshots |
| Original fabrication behavior remains intact | Full Ubuntu and Windows regression workflows, frontend suite, static checks, Vite proxy, wheel and bundle-freshness checks |

## Executed checks and CI boundaries

- Local frontend: TypeScript, ESLint, 425 Vitest tests, production build.
- Local booking backend: 22 synthetic tests. Local real Chrome: three complete
  acceptance scenarios; the final combined regression is recorded in the PR body.
- Local Python static checks: repository ruff, strict core mypy, strict app/database
  mypy. The same checks run again in CI.
- PR-1 final head `72242466a974c94894932a8277e2743430d057e9`: both required workflows
  succeeded, including 38 PostgreSQL checks without skips. Linux ran 724 tests
  with 38 skips; Windows ran 724 with 57 skips. Skips belong to dedicated
  PostgreSQL/frontend/wheel jobs or the deliberate Windows browser opt-out.
- PR-2 head `f582223e2cc71f7a31a0eda12c494e0709394dce`: frontend, PostgreSQL and
  static-check jobs succeeded on the first run. Ubuntu's first full regression
  hit an existing Chrome startup failure (no CDP page target); only that failed
  job was retried on the unchanged commit. Final workflow conclusions and PR-3
  final-head checks are recorded in their PR descriptions after completion.
- Local Node is 26, outside this repository's supported engine range. CI runs
  Node 24, installs the lockfile and requires the generated assets to match the
  committed bundle. Local checks do not replace that gate.
- Local PostgreSQL is unavailable. PostgreSQL acceptance relies on the dedicated
  real service job with migration/runtime roles, never on SQLite exclusion checks.

Synthetic visual records are stored under ignored `.run/booking-*.png`, including
the same booking and management routes before and after implementation, the
English month view and the Chinese form/profile. They contain only generated test
accounts and test messages. Existing untracked user mockups are not modified.

## Integration and rollout boundary

Review and integrate the stacked PRs in dependency order only when both required
workflows are green for each final head. These changes do not merge themselves or
open booking to the group. Deployment requires the migration role to install
`btree_gist` and migration 0017, normal runtime database permissions, and explicit
active-manager assignments before equipment is made bookable. Keep disk/backup
encryption and existing authentication settings in the deployment configuration.
No experimental provenance links, billing, approvals, hardware interlocks, mail
or external messaging are introduced.
