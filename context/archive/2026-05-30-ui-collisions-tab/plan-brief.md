# Session AI aids progressive disclosure — Plan Brief

> Full plan: `context/changes/ui-collisions-tab/plan.md`
> Frame brief: `context/changes/ui-collisions-tab/frame.md`

## What & Why

Sprinter Draft was shipped as always-visible inline UI above the create-task form, which presents a preparation aid as default session chrome and competes with the human-first create flow — not that Draft itself is wrong. This change adds progressive disclosure via a tab switch so facilitators choose when to use Draft.

## Starting Point

`SessionRoom` mounts `SprinterDraftPanel` whenever `showCreateForm` is true, stacked above the manual create form with equal visual weight. Draft generation and apply are already opt-in at the workflow level; only **visibility** is default-on. `RepoLinkModal` already uses button-triggered disclosure for optional session features.

## Desired End State

On `/session`, users land on a **Create task** tab (title, description, affected paths). **Sprinter Draft** is one click away on a second tab; notes and generated drafts persist when switching tabs. **Use this task** prefills the form and switches back to Create task for edit and submit. Poker flow and APIs unchanged.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scope | Draft disclosure only | Frame leading concern; smallest diff; Analyst deferred | Frame + Plan |
| Disclosure pattern | Tab switch (Create \| Draft) | Matches user intent; same-page flow without modal overlay | Plan |
| Default tab | Create task | Human-first create path per reframe | Frame |
| Draft state on switch | Preserve (keep mounted) | Avoid losing pasted notes when checking the form | Plan |
| After apply | Switch to Create tab | Natural edit-and-submit handoff | Plan |
| Analyst opt-in | Out of scope | Requires migration + FR-020 change; separate dimension | Frame |

## Scope

**In scope:**

- Tab control in `SessionRoom` when `showCreateForm`
- Hidden-but-mounted `SprinterDraftPanel` on Draft tab
- Auto-switch to Create tab on apply
- Basic tab accessibility (`tablist` / `aria-selected`)
- Lint, coverage, build, manual QA

**Out of scope:**

- Per-task Analyst checkbox / API / migration
- Repo link modal changes
- F-03 or `SprinterDraftPanel` generate logic changes
- Coach UI, schema changes, i18n

## Architecture / Approach

```
showCreateForm
  → Tab control [ Create task | Sprinter Draft ]  (default: Create)
  → Panel A (visible): create form
  → Panel B (hidden, mounted): SprinterDraftPanel
  → onApplyDraft → prefill form + switch to Create tab
```

Client-only; no new routes or Supabase columns.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Create-task tab shell | Tab UI, default Create, Draft on second tab, preserved mount | Accidental unmount loses Draft state |
| 2. Apply polish & verification | Auto-switch on apply, a11y, manual QA | Tab pattern unfamiliar in SessionRoom |

**Prerequisites:** S-02 Draft UI and S-01 session room merged.

**Estimated effort:** ~1 focused session across 2 phases.

## Open Risks & Assumptions

- Draft panel stays mounted on Create tab — acceptable DOM cost; required for state preservation.
- Analyst still auto-runs when repo linked — documented scope boundary until follow-on change.
- No React Testing Library — UI verified manually (consistent with S-02).

## Success Criteria (Summary)

- Create task form is the default view; Draft requires explicit tab selection.
- Full US-02 path works: generate → apply → create; notes stay private until task exists.
- Blind voting and reveal flows unchanged; lint, coverage, and build pass.
