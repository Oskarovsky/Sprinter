# S-02 Sprinter Draft Tasks — Plan Brief

> Full plan: `context/changes/sprinter-draft-tasks/plan.md`
> Research: F-03 archive — `context/archive/2026-05-29-ai-provider-fallback/plan-brief.md`

## What & Why

S-02 delivers **Sprinter Draft** on the planning session page: facilitators paste raw notes, get AI-proposed (or fallback) task drafts, and apply one to the create-task form — without auto-creating tasks. This satisfies US-02 and unblocks faster session prep while keeping human confirmation in the loop.

## Starting Point

S-01 provides `SessionRoom` with a manual create form (title + description). F-03 provides `POST /api/ai/draft` returning structured drafts with AC and open questions. No Draft UI exists yet; task schema stores only title and description.

## Desired End State

On `/session`, when users can create a task, a **Sprinter Draft** panel appears above the form. Paste notes → Generate → pick a card → **Use this task** prefills the form → user clicks **Create task**. Notes stay private until a task is created.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| AC / open questions | Append as markdown sections in description | Preserves full draft without DB migration | Plan |
| Structure | Extract `SprinterDraftPanel` component | Keeps SessionRoom maintainable; mirrors future Coach panel | Plan |
| Placement | Panel above create form | Natural notes → drafts → apply → submit flow | Plan |
| Loading | Separate `isGeneratingDrafts` state | Don't block manual create during ~8s AI call | Plan |
| Draft display | Card per draft with Use this task | Scannable multi-draft output | Plan |
| Fallback UX | Show API warning banner | Surfaces degraded mode from F-03 `warning` field | Plan |
| Locale | English UI copy | Matches existing SessionRoom | Plan |
| Testing | Unit tests for helpers + mocked fetch | Matches repo vitest patterns without new RTL dep | Plan |

## Scope

**In scope:**

- `src/lib/session/draft-format.ts` and `draft-client.ts`
- `src/components/session/SprinterDraftPanel.tsx`
- SessionRoom integration when `showCreateForm`
- Unit tests for formatter and fetch client

**Out of scope:**

- Coach UI (S-03), Analyst (S-04)
- DB/schema changes for AC or open questions
- F-03 API changes
- Auto-submit on apply
- i18n for Polish F-03 warnings

## Architecture / Approach

```
SessionRoom (showCreateForm)
  ↓
SprinterDraftPanel
  ↓ POST /api/ai/draft { notes }
F-03 DraftResult → draft cards
  ↓ Use this task
formatDraftForForm → setNewTitle / setNewDescription
  ↓ user clicks Create task
POST /api/session/tasks (unchanged)
```

Draft state is React-local only — no Realtime, no persistence until task create.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Client helpers | Formatter + fetch wrapper + unit tests | Markdown format conventions for AC/questions |
| 2. SprinterDraftPanel | Notes UI, generate, cards, apply callback | Styling drift from SessionRoom |
| 3. SessionRoom integration | End-to-end flow on `/session` | Panel visibility tied to `showCreateForm` edge cases |

**Prerequisites:** S-01 and F-03 merged; user authenticated on `/session`.

**Estimated effort:** ~2 focused sessions across 3 phases.

## Open Risks & Assumptions

- Long descriptions with full AC/questions may feel dense in the textarea — acceptable for MVP prep aid.
- F-03 fallback warnings remain Polish while panel labels are English — mixed locale until i18n.
- `acceptanceCriteria` / `openQuestions` are not structured in DB — lost if user clears description after apply.

## Success Criteria (Summary)

- User can generate drafts from notes and apply one to the create form without auto-submit.
- Full create → vote → reveal flow unaffected; Draft panel hidden during active voting.
- Lint, coverage, and build pass.
