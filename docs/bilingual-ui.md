# Bilingual workflow UI

The React application supports Chinese and English. A fresh browser starts in
Chinese; the language control on the login page and authenticated topbar saves
the choice in that browser. Language changes update mounted views, the document
language and title, dates, and known application messages without replacing the
router or clearing form state. Other open app tabs follow a changed preference.
Storage restrictions fall back to an in-memory choice for the current session.

## Translation scope

The shared mechanism covers navigation, login, workflow counts, statuses,
confirmation dialogs, and loading/error states. Business-page copy covers the
overview, workflow guide, experiment series, experiment planning and details,
fabrication batches and recording, materials, layer presets, baselines, layouts,
users, results, and analysis. The workflow guide has Chinese and English SVG
previews; the enlargement link opens the selected language.

Core terminology follows [the approved inventory](ui-strings-en-zh.md):
实验系列, 制备记录单, 创建制备批次, 条件关联, 发布已批准计划, and 原液.
Use 正式 / 反式 for device structures. Units, chemical/material names, scientific
abbreviations, identifiers, user-entered names and notes remain literal.

Server-generated publication figures and PDF/JSON exports keep their existing
language and data contracts. The browser language preference is not sent as a
request to regenerate or translate them. Unknown backend diagnostics are retained
verbatim; the application does not guess translations or call an external
translation service.

Equipment booking is still represented by the separate mockups. Its future
implementation should reuse this language mechanism while keeping booking and
fabrication access controls separate. This change grants no new permissions.

## Maintaining translations

- Add stable, descriptive keys with an English/Chinese pair to
  `frontend/src/i18n/messages.ts` or `businessMessages.ts`. Keep existing keys
  stable when revising wording. The Markdown inventory is the editorial record;
  the TypeScript resources drive the UI.
- Subscribe a component with `useLanguage()`. Render `t(key, parameters)` or use
  the shared `translate` function in application-owned presentation helpers.
  Interpolation is a single pass; inserted record names are not translated or
  interpreted as HTML or additional placeholders.
- Use `useLocalizedMemo` only for memoized results that contain translated labels
  or dates. Ordinary data-only memoization and data-loading dependencies should
  not change when the language changes.
- Use `enumLabel` and the appropriate status context for schema-owned enums.
  Account `active` means 已启用, catalog `active` means 可用, and workflow `active`
  means 进行中. Form values, API payloads, route identifiers, React keys, and
  test attributes must retain their original values.
- `inventoryMessages.ts` and `localizeAppText` support known application-owned
  labels and legacy validation/notification messages at explicit display
  boundaries. Never apply that helper to arbitrary material names, notes, data
  values, or API objects. Unrecognized messages fall back to their source text.
- Keep data placeholders in both languages. English-only plural suffix
  placeholders such as `{s}` may be absent from Chinese.

## Validation

The frontend suite includes language preference persistence and unavailable
storage, cross-tab updates, page metadata, contextual statuses, dates, placeholder
integrity, retained login inputs, retained routed drafts, role authorization, and
Chinese form submissions that preserve API enums and user content. Existing
behavior tests explicitly select English. Browser regression infrastructure also
uses an explicit English preference by default; passing `language=None` exercises
the production default.

Local visual checks use the same seeded demo data before and after the change.
Chinese/English overview and result-page checks, preference retention after reload,
an unsaved experiment-series form, and 320px layouts were checked. A table scroller
now contains its absolutely positioned accessible labels, preventing document-wide
horizontal overflow at that width.

Run type checking, lint, the frontend suite, and a production build with the
repository's Node 24 runtime before publishing. The two manual GitHub workflows
must both pass on the final PR head before merge or synchronization to internal.
