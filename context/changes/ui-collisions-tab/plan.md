# Session AI aids progressive disclosure — Implementation Plan

## Overview

Implement progressive disclosure for **Sprinter Draft** on `/session`: the manual create-task form is the default view; Draft is available via an explicit **Create task | Sprinter Draft** tab switch. Preserves US-02 workflow (paste → generate → Use this task → Create task) without always-visible Draft chrome. Analyst opt-in is **out of scope** for this change (separate follow-on per frame brief).

**Frame ref:** `context/changes/ui-collisions-tab/frame.md` · **PRD refs:** US-02, FR-013, FR-014 (unchanged)

## Current State Analysis

- **Draft always visible:** When `showCreateForm` is true, `SessionRoom.tsx:457-465` mounts `SprinterDraftPanel` unconditionally above the create `<form>`.
- **Visual competition:** Draft and create form share equal card styling; Draft appears first in reading order on the narrow session page (`session.astro:78`, `max-w-xl`).
- **S-02 intent:** Archived plan chose inline panel above form for discoverability (`context/archive/2026-05-29-sprinter-draft-tasks/plan-brief.md:24`) — not a PRD mandate.
- **Convention to follow:** Optional session features use explicit reveal (`RepoLinkModal` button → modal, `SessionRoom.tsx:419-449`).
- **No SessionRoom RTL tests:** Existing Draft coverage is in `draft-format.test.ts` and `draft-client.test.ts` only.

### Key Discoveries

- Draft *usage* is already opt-in (`SprinterDraftPanel.tsx:84-93` Generate, `126-134` Use this task); pain is **visibility default-on** (frame hypothesis STRONG).
- `SprinterDraftPanel` owns local React state (notes, drafts, loading) — unmounting on tab switch would violate the “preserve state” decision.
- `onApplyDraft` already prefills `newTitle` / `newDescription` in `SessionRoom.tsx:460-463`; extend to switch active tab to manual create.
- Poker flow gates (`showCreateForm = !task || isRevealed`) remain unchanged; Draft hidden during voting/reveal-active task states as today.

## Desired End State

When a user can create a task on `/session`:

1. They land on the **Create task** tab by default — title, description, optional affected paths, **Create task** button only.
2. They may switch to **Sprinter Draft** to paste notes, generate, and apply a draft; switching back preserves in-progress notes and generated cards.
3. **Use this task** prefills the form and **switches to the Create task** tab for edit + submit.
4. Full create → start voting → reveal flow unchanged; no API or schema changes.

**Verify:** Open `/session` → Create tab visible, no Draft textarea → switch to Draft → generate → apply → Create tab prefilled → create task → voting works.

## What We're NOT Doing

- Per-task Sprinter Analyst opt-in (checkbox, migration, FR-020 change) — deferred to a follow-on change
- Repo link modal or Analyst pipeline changes
- F-03 `/api/ai/draft` or `SprinterDraftPanel` generate/apply logic changes (except mount visibility)
- Persisting Draft notes server-side
- Sprinter Coach UI (S-03)
- Auto-submit on apply
- i18n for F-03 Polish fallback warnings

## Implementation Approach

Add a segmented tab control to the create-task region in `SessionRoom` when `showCreateForm` is true. Default tab: **Create task**. Render **both** tab panels in the DOM but show only the active one (CSS `hidden` or equivalent) so `SprinterDraftPanel` internal state survives tab switches. On `onApplyDraft`, set form fields, clear banner error, and set active tab to **Create task**. Match existing SessionRoom card/button styling; use accessible tab semantics (`tablist` / `tab` / `tabpanel`, `aria-selected`).

Optional extraction: small `CreateTaskTabs.tsx` wrapper if `SessionRoom` grows — not required if the diff stays localized.

## Critical Implementation Details

**Do not conditionally mount `SprinterDraftPanel` with `{activeTab === 'draft' && ...}`** — that destroys notes/drafts when switching to Create task. Keep the panel mounted whenever `showCreateForm` is true; toggle visibility only. Reset active tab to **Create task** when `showCreateForm` transitions from false → true (e.g., after reveal opens “Start next task”), but do not reset `SprinterDraftPanel` internal state unless the whole create region unmounts (task enters voting — acceptable, same as today).

## Phase 1: Create-task tab shell

### Overview

Introduce tab switch UI; default to manual create form; show Draft only on Sprinter Draft tab; preserve Draft panel mount/state across switches.

### Changes Required:

#### 1. Tab state and control in SessionRoom

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: Replace always-visible Draft stack with a two-tab create region where manual entry is the default path.

**Contract**:
- Add local state `createTaskTab: 'manual' | 'draft'`, default `'manual'`.
- When `showCreateForm` becomes true after being false, reset `createTaskTab` to `'manual'` (useEffect on `showCreateForm` edge or derive reset on task status transition).
- Render a segmented control (two buttons) labeled **Create task** and **Sprinter Draft** above the tab panels, with `role="tablist"` and per-tab `role="tab"` + `aria-selected`.
- **Manual tab panel** (`role="tabpanel"`): existing create `<form>` unchanged (title, description, affected paths, submit).
- **Draft tab panel**: `SprinterDraftPanel` with existing `onApplyDraft` callback (tab switch deferred to Phase 2).
- Both panels remain mounted while `showCreateForm`; inactive panel uses `hidden` (or `className` equivalent) — not conditional unmount.
- Remove the current pattern of rendering `SprinterDraftPanel` above the form in a single stack (`SessionRoom.tsx:457-465`).

#### 2. Visual styling

**File**: `src/components/session/SessionRoom.tsx` (or extracted component)

**Intent**: Tab control reads as secondary chrome; create form remains the primary card when selected.

**Contract**: Reuse existing border/purple accent patterns from vote buttons and repo link button. Active tab: distinct border/background; inactive: muted. No new npm dependencies.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` succeeds

#### Manual Verification:

- `/session` with no active task shows **Create task** tab selected; no Draft notes textarea visible until user clicks **Sprinter Draft**
- Switching Create ↔ Draft preserves pasted notes and generated draft cards without reset
- Create task → start voting → reveal → “Start next task” returns to **Create task** tab default

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Apply flow polish and verification

### Overview

Complete the apply-to-create handoff; finalize accessibility; document manual QA for the full US-02 path.

### Changes Required:

#### 1. Auto-switch tab on apply

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: After user picks a draft, land them on the prefilled create form immediately.

**Contract**: In `onApplyDraft`, after `setNewTitle` / `setNewDescription` / `setBannerError(null)`, set `createTaskTab` to `'manual'`. Draft panel stays mounted (hidden) with its state intact.

#### 2. Accessibility pass

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: Tab control is keyboard- and screen-reader usable.

**Contract**: Active tab has `aria-selected="true"`; inactive `false`. Tab panels use `aria-labelledby` pointing at tab buttons. Optional: ArrowLeft/ArrowRight between tabs (nice-to-have; not blocking if roving tabindex is omitted for MVP).

#### 3. Manual QA checklist (document in plan progress only)

**Intent**: Lock acceptance for US-02 privacy and poker regression.

**Contract**: Manual steps cover — Draft notes not visible to second browser until task created; apply → create → vote → reveal unchanged; fallback warning banner still shows on Draft tab when `source === 'fallback'`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` succeeds

#### Manual Verification:

- **Use this task** switches to Create tab with prefilled fields; user can edit and submit
- Second participant never sees Draft notes during Draft-only work on creator browser
- Analyst reference card and repo link unaffected (regression smoke)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before marking the change implemented.

---

## Testing Strategy

### Unit Tests:

- No new pure helpers required; existing `draft-format` / `draft-client` tests unchanged.
- If a tab-id constant or tiny helper is extracted, add focused unit tests; otherwise defer to manual UI verification (matches S-02 integration approach).

### Integration Tests:

- None required — no API contract changes.

### Manual Testing Steps:

1. Fresh session → Create tab default → create task manually → full poker cycle.
2. Switch to Draft tab → paste notes → generate → apply → confirm Create tab + prefilled fields → submit.
3. Switch Draft → paste text → switch Create → switch back Draft → notes still present.
4. Two browsers: peer does not see Draft UI state on creator screen during prep.
5. With linked repo: Analyst still runs on start-voting (unchanged behavior — document as known scope boundary).

## Performance Considerations

Keeping `SprinterDraftPanel` mounted while on Create tab adds negligible cost (empty textarea DOM). No additional network calls until user generates drafts.

## Migration Notes

None — client-only UI change.

## References

- Frame brief: `context/changes/ui-collisions-tab/frame.md`
- Prior Draft plan: `context/archive/2026-05-29-sprinter-draft-tasks/plan.md`
- `src/components/session/SessionRoom.tsx:399,457-465`
- `src/components/session/SprinterDraftPanel.tsx`
- `src/components/session/RepoLinkModal.tsx` (progressive disclosure precedent)
- PRD US-02: `context/foundation/prd.md:77-89`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Create-task tab shell

#### Automated

- [x] 1.1 `npm run lint` passes — c755c37
- [x] 1.2 `npm run test:coverage` passes with coverage table printed to stdout — c755c37
- [x] 1.3 `npm run build` succeeds — c755c37

#### Manual

- [x] 1.4 Create tab default; Draft hidden until tab click; state preserved across tab switches — c755c37
- [x] 1.5 After reveal, “Start next task” defaults to Create tab — c755c37

### Phase 2: Apply flow polish and verification

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npm run test:coverage` passes with coverage table printed to stdout
- [x] 2.3 `npm run build` succeeds

#### Manual

- [x] 2.4 Use this task switches to Create tab with prefilled fields
- [x] 2.5 US-02 privacy + poker regression smoke (two-browser optional)
