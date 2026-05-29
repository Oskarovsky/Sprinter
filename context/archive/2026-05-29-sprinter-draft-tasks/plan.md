# S-02 Sprinter Draft Tasks — Implementation Plan

## Overview

Implement roadmap **S-02** (`sprinter-draft-tasks`): Sprinter Draft UI on `/session` so authenticated users paste raw notes, generate planning-poker-ready task proposals via F-03 (`POST /api/ai/draft`), and apply a chosen draft to the existing create-task form without auto-submitting (US-02, FR-013, FR-014).

**Roadmap refs:** S-02 · **PRD refs:** US-02, FR-013, FR-014 · **Prerequisites:** S-01, F-03 (both done)

## Current State Analysis

- **Session task UX:** Inline create form in `SessionRoom.tsx` — title + optional description only; shown when no active task or task is `revealed` (`showCreateForm`).
- **Task persistence:** `POST /api/session/tasks` accepts `{ title, description? }`; DB `tasks` table has no AC/open-questions columns.
- **F-03 ready:** `POST /api/ai/draft` returns `DraftResult` with `drafts[]` (`title`, `description`, `acceptanceCriteria[]`, `openQuestions[]`), `source`, optional `warning`.
- **No Draft UI:** No notes panel, no `/api/ai` client calls, no “Use this task” flow.
- **Privacy:** Notes and draft results stay client-local until user creates a task (PRD AC).

### Key Discoveries

- `SessionRoom.tsx:335-368` — create form pattern to prefill via `setNewTitle` / `setNewDescription`.
- `SessionRoom.tsx:68-71` — `readError()` + `bannerError` for API failures (reuse for draft errors or panel-local errors).
- `src/lib/ai/types.ts` — `DraftTaskDraft` / `DraftResult` safe to import in client code (no server env).
- Session UI copy is **English**; F-03 fallback `warning` may be Polish — display as-is from API.

## Desired End State

On `/session`, when the create-task form is visible:

1. User sees a **Sprinter Draft** panel above the manual create form.
2. User pastes notes, clicks **Generate tasks**, and sees loading state without blocking manual create.
3. API returns draft cards; fallback shows a warning banner when `source === "fallback"`.
4. User clicks **Use this task** on a card → title and description fields prefill (description includes AC + open questions as markdown sections).
5. User edits if needed and clicks **Create task** — existing flow unchanged; notes never broadcast to other participants.

**Verify:** Paste multi-paragraph notes → generate → apply draft → form prefilled → create task → poker flow continues.

## What We're NOT Doing

- Sprinter Coach UI (S-03)
- DB schema changes for acceptance criteria / open questions columns
- Auto-submitting task creation on “Use this task”
- Persisting pasted notes server-side
- Streaming AI responses
- Changes to `/api/ai/draft` or F-03 lib (unless bugfix discovered during integration)
- i18n pass for F-03 Polish warning strings

## Implementation Approach

Extract `SprinterDraftPanel` as a focused React component under `src/components/session/`. Add a small client helper module for formatting drafts into form fields and calling `/api/ai/draft`. Mount the panel in `SessionRoom` only when `showCreateForm` is true, passing an `onApplyDraft({ title, description })` callback that updates form state. Unit-test the formatting helper and fetch wrapper with mocked `fetch`.

## Phase 1: Client helpers

### Overview

Pure functions and a thin fetch wrapper for the Draft API — testable without React.

### Changes Required:

#### 1. Draft-to-form formatter

**File**: `src/lib/session/draft-format.ts`

**Intent**: Map `DraftTaskDraft` into the two fields the create form and API accept, preserving AC and open questions per planning decision.

**Contract**: Export `formatDraftForForm(draft: DraftTaskDraft): { title: string; description: string }`. Title = trimmed `draft.title`. Description = trimmed `draft.description`, then optional markdown sections `## Acceptance criteria` (bulleted list) and `## Open questions` (bulleted list) when arrays non-empty. Join with blank lines.

#### 2. Draft API client

**File**: `src/lib/session/draft-client.ts`

**Intent**: Encapsulate `POST /api/ai/draft` for the React panel.

**Contract**: Export `fetchDraftsFromNotes(notes: string): Promise<DraftResult>`. `fetch("/api/ai/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }) })`. Parse JSON; on non-2xx throw `Error` with message from `{ error }` or status text. Same-origin cookies apply automatically.

#### 3. Unit tests — helpers

**File**: `src/lib/session/draft-format.test.ts`

**Intent**: Lock formatting behavior for AC/questions append and edge cases.

**Contract**: Cases — description only; AC only; questions only; both sections; empty arrays omitted.

**File**: `src/lib/session/draft-client.test.ts`

**Intent**: Mock global `fetch` — success 200, 400, 401 responses.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on new files
- `npm run test:coverage` passes with coverage table printed to stdout

#### Manual Verification:

- Import `formatDraftForForm` in dev console or test output shows expected markdown structure for a sample draft

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: SprinterDraftPanel component

### Overview

Build the Draft UI panel: notes input, generate action, results display, apply callback.

### Changes Required:

#### 1. SprinterDraftPanel

**File**: `src/components/session/SprinterDraftPanel.tsx`

**Intent**: Self-contained Draft prep UI matching SessionRoom card styling.

**Contract**:
- Props: `onApplyDraft: (fields: { title: string; description: string }) => void`
- Local state: `notes`, `drafts: DraftTaskDraft[] | null`, `source`, `warning`, `panelError`, `isGeneratingDrafts`
- UI: card with heading “Sprinter Draft”; textarea for notes; **Generate tasks** button (disabled when notes blank or loading)
- On generate: call `fetchDraftsFromNotes`, populate drafts; set `panelError` on failure
- When `source === "fallback"` and `warning` present: amber/neutral info banner above results
- Each draft in a sub-card: title, description preview, AC/questions as read-only lists, **Use this task** button → `onApplyDraft(formatDraftForForm(draft))`
- English copy throughout; styling aligned with SessionRoom (`rounded-xl border border-white/10 bg-white/5`, purple primary button)
- Do not call task create API

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Panel renders in isolation story or temporary mount (optional) — or defer to Phase 3 integration smoke

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: SessionRoom integration

### Overview

Wire Sprinter Draft panel into the planning session page above the create form.

### Changes Required:

#### 1. SessionRoom mount

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: Show Draft panel only when manual create form is available.

**Contract**: When `showCreateForm`, render `<SprinterDraftPanel onApplyDraft={...} />` immediately **above** the existing create `<form>`. Handler sets `newTitle` and `newDescription` from applied draft; clears `bannerError` optionally; does **not** set `isSubmitting` or POST tasks.

#### 2. Error boundaries

**File**: `src/components/session/SessionRoom.tsx` (or panel only)

**Intent**: Keep draft errors scoped — panel shows `panelError` inline; session `bannerError` remains for task/vote/reveal failures.

**Contract**: Draft generate failures do not need to populate global `bannerError` unless desired — default panel-local error only.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` passes

#### Manual Verification:

- On `/session` with no active task: paste notes → Generate → see draft cards → Use this task → form prefilled → Create task succeeds
- With OpenRouter key: `source: "ai"` drafts work; without key: fallback warning + usable drafts
- During active voting task: Draft panel hidden (`showCreateForm` false)
- After reveal: Draft panel visible again for next task
- Other participants do not see pasted notes (no server broadcast)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests

- `formatDraftForForm`: AC/questions markdown sections, empty arrays, whitespace trim
- `fetchDraftsFromNotes`: mocked fetch success, 400, 401

### Integration Tests

- None in CI — manual two-browser check optional for privacy AC (notes not visible to peer)

### Manual Testing Steps

1. Sign in → `/session` → paste multi-paragraph notes → Generate → multiple draft cards
2. Use this task → verify title/description prefilled with AC/questions in description
3. Create task → start voting → confirm Draft panel hidden
4. Reveal → confirm Draft panel returns for next task
5. Generate with empty notes → Generate disabled or validation message
6. Fallback mode (no API key) → warning banner visible, drafts still usable

## Performance Considerations

- Draft generate may take up to ~8s (F-03 timeout); separate loading state avoids blocking create submit.
- No polling or Realtime for draft state — purely local until task POST.

## Migration Notes

- None.

## References

- PRD US-02, FR-013, FR-014: `context/foundation/prd.md`
- Roadmap S-02: `context/foundation/roadmap.md`
- F-03 archive: `context/archive/2026-05-29-ai-provider-fallback/plan-brief.md`
- Draft API: `src/lib/ai/post-draft.ts`, `src/pages/api/ai/draft.ts`
- Session create form: `src/components/session/SessionRoom.tsx`
- Lessons (coverage): `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Client helpers

#### Automated

- [x] 1.1 `npm run lint` passes on new files — 2b1104a
- [x] 1.2 `npm run test:coverage` passes with coverage table printed to stdout — 2b1104a

#### Manual

- [x] 1.3 `formatDraftForForm` produces expected markdown for sample draft with AC and questions — 2b1104a

### Phase 2: SprinterDraftPanel component

#### Automated

- [x] 2.1 `npm run lint` passes — 2820302
- [x] 2.2 `npm run build` passes — 2820302

#### Manual

- [x] 2.3 Panel UI matches SessionRoom styling (visual check on `/session` or component mount) — 2820302

### Phase 3: SessionRoom integration

#### Automated

- [x] 3.1 `npm run lint` passes — 795749b
- [x] 3.2 `npm run test:coverage` passes with coverage table printed to stdout — 795749b
- [x] 3.3 `npm run build` passes — 795749b

#### Manual

- [x] 3.4 Full flow: generate → Use this task → Create task on `/session` — 795749b
- [x] 3.5 Draft panel hidden during voting; visible after reveal for next task — 795749b
- [x] 3.6 Fallback warning shown when AI unavailable; drafts still usable — 795749b
