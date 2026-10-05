# UI Redesign Proposal — Web Console

Date: 2026-10-03 · Scope: `frontend/` (React 19 + Vite, production bundle served from
`src/web/static-app`) · Method: booted an isolated SQLite demo instance with seeded
campaign/experiment/batch/J-V data and reviewed every key page at 1440×900 in a real
browser. Screenshots: `scratch_ui_demo/screens/*.png` (scratch, not for release).
Companion mock-ups: `docs/mockups/ui-redesign-directions.html`.

Follows [ui-design-review.md](ui-design-review.md) (2026-08-29), whose roadmap
(tokens, self-hosted IBM Plex, style split, page split) has fully landed. That
review's guiding rule was *"visual intent does not change"* — the system under the
UI is now clean, but the intent itself was never re-examined. This document does
that, in response to the owner's verdict that the UI has "never been quite right"
across **visual polish, information architecture, recording efficiency, and data
presentation**.

## 1. Diagnosis

### 1.1 What already works (keep)

- Coherent, domain-meaningful palette (ITO cyan = active/process, perovskite violet
  = planned/config) and IBM Plex typography; no AI-default gradient look.
- Accessibility foundation (skip link, focus-visible, reduced-motion, focus traps).
- The result-detail KPI strip (substrates/devices/traces/best PCE) is the right
  idea; the J-V publication-figure tab renders well.
- The five-step experiment builder is the correct mental model for plan authoring.

### 1.2 Findings

**Visual (V).**
- **V1 Panel soup.** Every block is a bordered white panel, panels nest panels
  (page → panel → table → boxed rows → badges). Borders do the hierarchy work that
  weight, size, and color should do. Overview, run sheet, and materials pages all
  read as "forms in boxes".
- **V2 Tiny, monotone type.** Body 13–14px, tables 12–13px, headers 11px uppercase.
  Hierarchy is expressed almost entirely through uppercase + size; weight and color
  barely participate. Everything has equal visual loudness.
- **V3 Badge confetti.** Cyan/violet/amber/green/red pill badges on every row of
  every table; plus teal buttons, teal links, teal active nav, teal KPI borders.
  With ~8 colors in play at 11–12px, no single state stands out.
- **V4 System values leak into the UI.** Recipe/source hashes (`309f30c35363…`,
  `2ab4212d25…`), "Schema v7", "8823 bytes", "Result file 1 · text/csv", and a
  DEVICES column that renders a bare `,` on the run sheet. Internal artifacts are
  not user language.
- **V5 Verbose en-US timestamps** ("Oct 03, 2026, 12:31 AM") in every list row;
  relative time ("2 h ago") would scan faster and shorten rows.
- **V6 Dead space.** List pages with few rows dissolve into a large empty porcelain
  void (batches: 3 cards; results: 1 card) while run-sheet executions waste the
  opposite — ~90px of vertical card per record.

**Information architecture (N).**
- **N1 The nav does not express the pipeline.** The domain workflow is Campaign →
  Plan → Batch → Result, but the sidebar is three administrative groups
  (Laboratory / Library / Management). Nothing shows where "now" is in the
  pipeline or what stage comes next.
- **N2 Naming drift.** Sidebar "Experiments" ↔ page "Experiment records"; "Results"
  ↔ "Characterization results"; batches page greets with "Every fabrication batch
  authorized for your role, newest first." (authorization-speak, not task-speak).
- **N3 No breadcrumbs / odd depth.** Batch detail lives at
  `/app/experiments/1/batches/1` while batches also appear as a top-level nav item;
  navigation between related entities is via "Back to plan" / "Back to records"
  buttons and re-scanning lists.
- **N4 Raw-id filters.** The results list filters are literal "Experiment id" and
  "Fabrication batch id" text inputs — the user must know internal row ids.
- **N5 Overview is a link list.** "Next actions" (5 numbered links), three count
  cards, a badges row, and a recent-experiments table. It doesn't answer "where do
  things stand" at a glance.

**Recording efficiency (E).**
- **E1 The run sheet is card-per-record.** 16 executions × ~90px cards, each with a
  redundant "Recorded" badge, plus 6 preparation cards above. The operational core
  of the app scrolls for screensful; a compact status table would fit one screen.
- **E2 Status machines leak as clicking labor.** Completing one batch requires
  walking every preparation planned→preparing→ready→consumed and every execution
  ready→running→completed through separate dialogs (seeding via API needed ~82
  calls for one batch). The UI should offer one-click "record as planned" for a
  whole stage with per-row override, not per-row ceremonies.
- **E3 JSON textareas in primary forms.** Deviation form has "Planned value (JSON)"
  and "Actual value (JSON)"; materials has a raw "Specification" JSON textarea.
- **E4 Create-forms permanently expanded** at the top of library pages (ADD
  MATERIAL panel is always open), pushing browsing content below the fold.
- **E5 Layer stack building is dropdown-by-dropdown** (choose preset → add, choose
  blank type → add) with the same-material-only drag caveat spelled out in prose;
  no visual stack composer.

**Data presentation (D).**
- **D1 No measurement data in any list.** Experiments/batches tables show statuses
  and hashes but zero PCE/Jsc figures; you must open result detail to see a single
  performance number anywhere.
- **D2 Numbers set like prose.** All table columns left-aligned proportional text;
  numeric columns need right-aligned `tabular-nums`, units in headers.
- **D3 Analysis is tab-buried.** Statistics / J-V / Uniformity live behind tabs on
  result detail; cross-experiment comparison doesn't exist (condition comparison
  shows "IDENTICAL" rows for the demo plan — useful, but lists-as-accordions).
- **D4 Chart controls are utilitarian** ("Select all / Plot selected / Clear", SVG/
  PDF/TIFF buttons) around an otherwise good figure.

## 2. Redesign directions

Three directions, ordered by scope. Each keeps the existing palette personality
and accessibility baseline. Mock-ups render the same seeded data in all three.

### Direction A — Refined console (evolutionary)

Keep IA and page structure; rebuild the visual system.

- One surface, not nested boxes: sections separated by whitespace and a single
  hairline; tables lose their enclosing panel border.
- Hierarchy via type: 15–16px body, 13px dense tables, weight 600 vs 450, color
  reserved for state. Uppercase eyebrows only for section labels.
- Status = colored dot + text (one accent per row max); teal reserved for primary
  action and active nav.
- Hashes/bytes/schema removed from list views (moved to a "Provenance" disclosure);
  relative timestamps; numeric columns right-aligned tabular-nums.
- PCE/Jsc columns added to experiment/batch lists (fixes D1/D2 for free).
- Cost: low (CSS + small component changes). Fixes: V1–V6, D1, D2. Doesn't fix:
  N1–N5, E1–E5.

### Direction B — Pipeline workspace (structural) ← recommended

Reorganize around the lifecycle and make recording a table, not a card walk.

- A persistent pipeline header on all Laboratory pages: **Plans → Fabrication →
  Characterization** with live counts; the Overview becomes a pipeline board
  (stage columns with cards, aging, and the single next action per item).
- Campaign workspace with master–detail: left rail lists the campaign's
  experiments/batches/results grouped by stage; the right pane shows the selected
  entity with contextual breadcrumbs (Campaign › Experiment › Batch).
- **Run sheet as a checklist table**: one row per preparation/execution, status
  pill cycles on click, "Record all as planned" bulk action with per-row override,
  deviations as a row-level drawer with structured fields (no JSON textareas).
- Create-forms move into dialogs/drawers; library pages become dense tables.
- Includes all of Direction A's visual fixes.
- Cost: medium-high (layout + several new components, backend API unchanged).
  Fixes: V*, N1–N4, E1–E4. Partially: E5, D3.

### Direction C — Bench-first studio (ambitious)

B as a base, plus:

- Overview as a live kanban of the whole campaign portfolio with PCE sparklines
  and per-stage aging.
- "Bench mode": a full-screen, touch-friendly run sheet (≥44px targets, big
  current-step card) designed for use at the fume hood on a tablet.
- An analysis workbench across results: overlay J-V curves from multiple
  experiments, condition-comparison matrix, export directly to publication figures.
- Cost: high. Fixes: everything, including E5/D3/D4. Risk: scope; bench-mode
  hardware assumptions; tablet adaptation was explicitly deferred before.

**Owner decision (2026-10-03):** bench mode is out of scope. The portfolio board
and the analysis workbench are both wanted; the board's priority is below the B
roadmap, the workbench is needed. C is therefore not adopted as a starting
direction — its two surviving pieces are scheduled as post-B phases (see §3).

## 3. Recommendation

**Direction B**, executed in phases that each ship value independently:

0. **Foundation** (A's visual system): tokens for type/weight/dot-badges, table
   styles, de-noise (hashes, timestamps). Safe, immediate improvement.
1. **Run sheet checklist** + bulk recording (E1/E2) — the highest daily-friction
   fix.
2. **Pipeline header + campaign workspace** (N1–N3) — navigation restructure.
3. **Analysis workbench** (from C; needed): overlay J-V curves across experiments,
   condition-comparison matrix — all web-side, rendering through the existing
   publication-figure services.
4. **Portfolio board** (from C; lower priority): the Overview pipeline kanban
   with per-stage aging and measured PCE pulled forward.

**Owner constraints (2026-10-03):**

- **Backend plotting is frozen.** Data visualization stays server-side Python
  (matplotlib) with the current top-journal style and palette; that pipeline and
  its aesthetics do not change. Presentation-layer work (D1/D2 list metrics,
  web-side figure controls, layout around figures) remains in scope — D findings
  apply to the web tier only.
- Data-presentation work beyond what phases 0–3 already carry is deprioritized.

Constraint notes: desktop-first stays (the 720px breakpoint and touch guardrails
remain); CSP/self-hosted fonts unchanged; no component library introduced; public
release parity handled per the release checklist when these land.

Follow-ups (2026-10-03, during phase 0):

- Font: the owner chose the OS system font stack (SF Pro on macOS, Segoe UI
  Variable on Windows) over self-hosted IBM Plex to complete the direction A
  look — this revises "self-hosted fonts unchanged" above. The woff2 files
  stay in the tree for a one-line revert; CSP needs no font-src entry.
- Component library: "no component library introduced" still holds for phase 0
  (direction A, zero dependencies); a hand-rolled vs themed-MUI spike for the
  phase 1 run sheet decides whether the constraint is relaxed in phase 1.

## 4. Evidence index

| Screenshot | Page | Notes |
|---|---|---|
| 02-overview.png | Overview | next-actions list, count cards, badge row |
| 03-experiments.png | Experiments | filter panel, hash-ish columns, badge confetti |
| 04-experiment-detail.png | Experiment detail | plan summary, layer chips, actions |
| 05-builder.png / 13-builder-layers.png | Builder steps 1/3 | wizard, right rail |
| 06-batches.png | Batches | card list, hash column, "No batch notes." |
| 07/08-run-sheet*.png | Run sheet | batch status, frozen conditions, card-per-execution, JSON deviation form |
| 09-results.png | Results | raw-id filters, bytes/hash/schema values |
| 10/11-result-*.png | Result detail | KPI strip, tabs, J-V curves |
| 12-materials.png | Materials | always-open create form, JSON spec, card-per-material |

## 5. Stabilization review (2026-10-04)

Repairs follow the existing stack: phase 2 (#14), phase 3 (#15), then phase 4
(#16). Each later branch incorporates the preceding repairs before its own
changes, preserving incremental PR diffs.

Phase 1/2 stabilization shares the existing bulk-record confirmation and save
handler with the checklist, uses the same PATCH contract as the Advanced forms,
and preserves entered actual snapshots when cycling statuses. Advanced remains
open by default. Workspace state is explicit in text and accessible selection
attributes; its columns collapse at 720px. List best PCE means the highest valid,
assigned, non-excluded forward scan, independently of a manually pinned
representative; Jsc comes from that same scan.

The default strict mypy gate covers the core package. A separate strict check
now covers the SPA entrypoint and Database boundary; the wider web typing
migration remains pending. Browser checks must exercise the checklist controls
and populated new pages, as the earlier Advanced-form checks did not cover them.

The checklist and Advanced forms share mutation behavior, but retain two
presentations. A later consolidation should reuse recording controls and remove
duplicate editing surfaces only after split, merge, full snapshots, and browser
coverage have equivalent support in the checklist. This is follow-up maintenance,
outside the five redesign phases.
