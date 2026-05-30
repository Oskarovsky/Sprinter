# Frame Brief: Session AI aids progressive disclosure

> Framing step before /10x-plan. This document captures what is *actually*
> at issue, separated from what was initially assumed.

## Reported Observation

On the planning session page, Sprinter Draft is always visible above the
create-task form whenever a user can create a task. The user also observed
that Sprinter Analyst story-point estimation runs without an explicit
creator opt-in (when a repo is linked), and wants more facilitator control
over which AI aids appear during refinement/planning. Repo linking may stay
available, but AI estimation should not be assumed for every straightforward
task.

## Initial Framing (preserved)

- **User's stated cause or approach**: AI features (Draft panel, Analyst
  points poker) are treated as default-visible or default-on when they should
  be optional opt-ins controlled by the task creator/facilitator.
- **User's proposed direction**: Hide Sprinter Draft by default and show it
  only after clicking a tab or similar; add a checkbox so the creator can
  opt into AI Analyst estimation; keep repo linking but don't always run
  estimation from the UI for simple tasks.
- **Pre-dispatch narrowing**: **Leading concern is Sprinter Draft always
  visible above the create-task form.** Analyst opt-in and repo linking are
  related observations but secondary for this frame.

## Dimension Map

The observation could originate at any of these dimensions:

1. **Visual hierarchy / UX clutter** — Draft panel is a full card stacked
   above the create form with equal visual weight; it reads as the primary
   workflow even when the user only wants manual task entry.
2. **S-02 implementation default** — S-02 explicitly chose “panel above
   create form” whenever `showCreateForm` is true; always-visible inline UI
   is a shipped planning decision, not a PRD mandate. ← user's current framing
   (partially — user attributes to “should be optional” product intent)
3. **PRD / product intent** — PRD describes Draft as a preparation aid with
   opt-in *usage* (paste → generate → “Use this task”) but is silent on
   whether the panel must be visible by default.
4. **Analyst auto-trigger (related, secondary)** — When voting starts, Analyst
   runs automatically if a repo is linked (`start-voting` →
   `runAnalystForTask`); no per-task checkbox. Same “AI default-on” class as
   Draft visibility, but a different axis (backend trigger vs UI chrome).

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| Visual hierarchy: Draft competes with create form | `SessionRoom.tsx:399,457-465` mounts `SprinterDraftPanel` unconditionally when `showCreateForm`; panel uses same card styling as form (`SprinterDraftPanel.tsx:62-93`); draft appears first in reading order on narrow `max-w-xl` page (`session.astro:78`); can grow large after generation | **STRONG** |
| S-02 implementation default (inline above form) | `plan-brief.md:16,24` “panel appears above the form”; `plan.md:28,154` contract to render immediately above create `<form>`; no tab/modal alternative documented | **STRONG** |
| PRD mandates always-visible Draft | US-02/FR-013–FR-014 specify workflow only; no placement language (`prd.md:77-89,132-133`); Non-Goals call Draft a “preparation/discussion aid” (`prd.md:225`) | **NONE** (for mandate) / **WEAK** (for “contradiction”) |
| Analyst auto-trigger without creator opt-in | `start-voting.ts:29-34` always schedules Analyst; no UI flag or task field; FR-020 says compute when repo linked (`prd.md:151`); `SessionRoom.tsx:517-528` start-voting has no toggle | **STRONG** (as related sub-dimension) |

## Narrowing Signals

Step 3 evidence is conclusive for the leading concern; Step 4 questioning
skipped.

- User confirmed **Sprinter Draft visibility** is the leading concern, not
  Analyst or repo linking.
- Draft *usage* is already opt-in (Generate → Use this task); the pain is
  **panel visibility default-on**, not unwanted auto-generation.
- `RepoLinkModal` already establishes progressive disclosure for optional
  session features (`SessionRoom.tsx:419-449`, `RepoLinkModal.tsx:191-212`);
  Draft is the outlier with no dismiss/tab/modal pattern.
- Roadmap describes AI aids as **optional** at product level
  (`roadmap.md:20`); S-02 chose inline visibility for discoverability
  (`plan-brief.md:24`).

## Cross-System Convention

Optional session capabilities in this codebase use **explicit reveal** (button
→ modal), not permanent inline chrome. Repo linking follows that pattern.
Draft was intentionally placed inline for “notes → drafts → apply → submit”
flow (`plan-brief.md:24`), but PRD and roadmap frame Draft as a prep aid,
not core ceremony UI. Hiding Draft behind a tab/button/modal aligns with
repo-link UX and “optional AI aids” roadmap language without removing US-02
capability.

Analyst opt-in is **not** covered by the same convention today: FR-020 and
S-04 plan require automatic analysis when a repo is linked
(`sprinter-analyst-vote/plan-brief.md:25`). A per-task checkbox would be a
**product requirement change**, not a UI-placement fix.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: Sprinter Draft was shipped as
> always-visible inline UI above the create-task form (S-02 placement
> decision), which presents a preparation aid as default session chrome and
> competes with the human-first create flow — not that the Draft feature
> itself is wrong or unwanted.

The user’s instinct (“optional and hidden until I click something”) matches
evidence: workflow is already opt-in, but **visibility is default-on**.
Progressive disclosure (tab, button, modal, or collapse — pattern TBD in
/10x-plan) addresses the leading concern. Bundling Analyst per-task opt-in
into the same change is a **separate dimension**: it requires API/schema/PRD
alignment (FR-020 currently implies auto-run when repo linked), not just
SessionRoom layout.

## Confidence

**HIGH** for the Draft visibility reframe (strong code + plan evidence,
matches existing RepoLinkModal convention, user confirmed leading concern).

**MEDIUM** for treating Analyst checkbox as in-scope for the same change —
evidence supports the observation, but PRD/plan currently specify automatic
Analyst when repo is linked; that needs explicit product decision before
/10x-plan.

If planning Analyst opt-in: verify whether FR-020 should change to “when
repo linked **and** creator opts in” vs keeping auto-run with UI-only hide.

## What Changes for /10x-plan

Primary scope: **progressive disclosure for Sprinter Draft** on the session
create-task path — default view shows manual create form; Draft revealed only
after explicit facilitator action. Reuse or mirror `RepoLinkModal` interaction
patterns where sensible.

Secondary (separate plan slice or explicit phase): **per-task Analyst
opt-in** — checkbox on create form or start-voting, API flag, and PRD/FR-020
update if automatic analysis is no longer desired. Do not conflate with Draft
UI unless the user explicitly wants one combined change after reading this
brief.

Repo linking stays as-is; optional path hints field can remain for tasks
where Analyst is enabled.

## References

- Source files: `src/components/session/SessionRoom.tsx:399,457-465`;
  `src/components/session/SprinterDraftPanel.tsx:62-93`;
  `src/components/session/RepoLinkModal.tsx:191-212`;
  `src/pages/api/session/tasks/[taskId]/start-voting.ts:27-42`;
  `src/lib/repo/run-analyst.ts:85-96`
- Archived S-02: `context/archive/2026-05-29-sprinter-draft-tasks/plan-brief.md`,
  `context/archive/2026-05-29-sprinter-draft-tasks/plan.md`
- PRD: `context/foundation/prd.md` (US-02, FR-013–014, FR-020, Non-Goals)
- Roadmap: `context/foundation/roadmap.md:20`
- Investigation tasks: visual-hierarchy (fbd7bedc), PRD intent (213e2dae),
  S-02 default (e5ce18cd), Analyst opt-in (8a0c9f6d)
