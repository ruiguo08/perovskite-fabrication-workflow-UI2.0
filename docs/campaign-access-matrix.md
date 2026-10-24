# Campaign access control — permission matrix (v1)

Status: implementation contract for the campaign-membership PR. Three
independent layers decide every request; no layer implies another:

1. **System role** — `student` / `instructor` / `administrator` (account
   attribute, managed by administrators).
2. **Fabrication workflow access** — the `workflow_access` grant from the
   booking module. Without it the whole workflow API surface is closed,
   regardless of anything below.
3. **Campaign membership** — per-campaign role granted to a user:
   `reader`, `participant`, or `manager`.

Equipment booking permissions (owner / equipment manager / instructor
supervision) are governed by the booking module and are deliberately NOT
affected by campaign membership in either direction.

## Roles

| Campaign role | Meaning |
|---|---|
| `reader` | View the campaign and all of its records. No writes. |
| `participant` | Reader rights **plus** creating experiments in the campaign and maintaining experiments they own. |
| `manager` | Reader rights plus review/approval and management actions for the campaign. Never a content editor of other members' experiments. |
| *(none)* | The campaign and its data do not exist for this user (uniform 404). |
| administrator (system role) | Sees every campaign (read + analysis) for system maintenance; approves, manages memberships and campaign lifecycle everywhere; **does not** gain content-edit rights on experiments they do not own. |

## Matrix

| Capability | reader | participant | manager | administrator | non-member |
|---|---|---|---|---|---|
| View campaign, its experiments, conditions, batches, run sheets, execution records, results, figures, exports, analysis | ✓ | ✓ | ✓ | ✓ | 404 |
| Create an experiment in the campaign | ✗ 403 | ✓ (becomes its owner) | ✓ (becomes its owner) | ✗ 403 (grant yourself membership first) | 404 |
| Edit **own** experiment content: recipe/conditions, batches, preparations, executions, deviations, result upload, result assignment, representative scans — while the lifecycle allows | ✗ 403 | ✓ owner | ✓ owner | ✓ owner | 404 |
| Edit **someone else's** experiment content (any indirect path: batch ids, condition ids, result ids, device ids) | ✗ 403 | ✗ 403 | ✗ 403 (review only) | ✗ 403 (recovery = audited admin ops / CLI, never the generic edit API) | 404 |
| Plan lifecycle — owner actions: draft → pending approval, withdraw to cancelled, released → in progress, in progress → completed | ✗ 403 | ✓ owner | ✓ owner | ✓ owner | 404 |
| Plan lifecycle — review actions: approve (with digest), release, reject/cancel during review | ✗ 403 | ✗ 403 | ✓ own campaign | ✓ | 404 |
| Substrate-exception request | ✗ 403 | ✓ owner | ✓ owner | ✓ owner | 404 |
| Substrate-exception decision | ✗ 403 | ✗ 403 | ✓ own campaign | ✓ | 404 |
| Cancel a fabrication batch | ✗ 403 | ✓ owner | ✓ own campaign | ✓ | 404 |
| List campaigns | own memberships | own memberships | own memberships | all | (empty list) |
| Create campaign | ✗ | ✗ | ✗ | system role `instructor`+ (unchanged); creator automatically becomes its manager | — |
| Update campaign (name/description/status/close/archive) | ✗ 403 | ✗ 403 | ✓ | ✓ | 404 |
| View member roster | ✓ (member) | ✓ (member) | ✓ (member) | ✓ | 404 |
| Grant/change `reader`/`participant` memberships | ✗ 403 | ✗ 403 | ✓ own campaign | ✓ | 404 |
| Grant/change `manager` memberships; remove a manager | ✗ | ✗ | ✗ (no self-escalation) | ✓ | 404 |
| Remove member / revoke own-role memberships | ✗ | ✗ | ✓ (not managers, not the last manager) | ✓ (last active manager guard applies) | 404 |

## Consistency rules

- **404 vs 403:** a resource the caller cannot *see* (non-member, unknown
  id, cross-campaign id) returns the uniform 404 with no existence leak; a
  visible resource the caller may not *change* returns 403. In-transaction
  checks repeat the same decision under the row lock.
- **Owner is singular:** each experiment has exactly one owner
  (`created_by_id`). There are no collaborators, no edit ACLs, and no
  co-editing features — by explicit product decision.
- **Membership checks read current database state on every request.**
  Revoking a membership (or a workflow grant) affects already-authenticated
  sessions immediately; no permission is cached in a session.
- **Re-grant semantics:** a revoked membership row is kept (audit);
  re-granting is an explicit administrator/manager action recorded as a new
  audit event. No startup, seed, or migration resurrects a revoked
  membership. Bootstrap/seed code only creates memberships that never
  existed.
- **Last manager guard:** a campaign always keeps at least one active
  `manager`; removal/demotion that would violate this is refused (409).
- **Shared catalogs stay global:** materials, layer presets, baselines
  (personal/shared scope), device layouts, and editor config keep their
  existing personal/shared/review rules and are not campaign-scoped.
- **Migration 0019 derivation:** each campaign's creator becomes its
  `manager`; each distinct experiment owner becomes a `participant` of that
  experiment's campaign. No other implicit memberships are created; in
  particular instructors are never bulk-added to campaigns.

## Maintenance boundaries for administrators

Administrators do not receive a generic right to edit members' experiment
content. Where the legacy flow needs privileged intervention it stays a
distinct, audited capability: batch cancellation, plan approval/release,
substrate-exception decisions, membership and campaign lifecycle
management. Anything deeper is an administrator-CLI / deployment-level
recovery operation, outside the API.
