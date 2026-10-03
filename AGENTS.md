# UI 2.0 refactor — repository guidance

This repository (formerly the public `perovskite-fabrication-workflow`, made
private and renamed on 2026-10-03) is the dedicated workspace for the UI 2.0
refactor. All user-interface redesign work happens here until it is stable.

- The system of record for non-UI work remains
  `perovskite-fabrication-workflow-internal`. Stabilized UI work migrates back
  there **by content only** (fresh commits or cherry-picks). Never push or
  merge this repository's branches or history into the internal repository,
  and never pull internal branches or history into this one — the two
  histories stay independent so this tree can later be re-published cleanly.
- Work lands through feature branches and pull requests. CI is **deliberate,
  once per PR** (owner decision 2026-10-03): right before merging, run
  Actions → Tests (Ubuntu: unit, PostgreSQL, frontend, ruff+mypy) and
  Actions → Windows validation on the PR branch, and merge once both are
  green. Nothing runs automatically on pushes; draft PRs stay CI-free.
- The design record lives in `docs/ui-redesign-proposal.md` (diagnosis,
  phases 0-4, owner decisions of 2026-10-03: direction B as the base, the
  portfolio board and analysis workbench adopted as later phases, bench mode
  out of scope, the backend matplotlib publication-figure pipeline frozen)
  with interactive mock-ups in `docs/mockups/`. Phase 0 starts from
  `main` (the final public release tree, PR #10).
- UI verification uses the seeded demo harness in `scratch_ui_demo/`
  (gitignored, regenerable): run `serve_demo.py` and open
  `http://127.0.0.1:8765/app/` as `admin` / `Adm1n!password`. Take
  before/after screenshots of the same pages for every phase.
