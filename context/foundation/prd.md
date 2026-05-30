---
project: "10xSprinter"
version: 3
status: draft
created: 2026-05-20
updated: 2026-05-30
context_type: greenfield
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

During Scrum work in a company dev team, there is no web tool that unifies popular Scrum ceremonies in one place. The market lacks a universal web application that supports planning-poker voting and retro boards together, with durable history of past votes, task lists, and retro stickies.

The gap is a **missing capability**, not merely friction inside an otherwise adequate toolchain. Teams currently tolerate good-enough free poker tools and do not push for a unified product until they also need retro and historical continuity in the same place. Longer-term vision (post-MVP): combine poker and retro with stored history. MVP focuses on planning poker only; retro, browsing past votes, mobile apps, and multi-room support are explicitly deferred.

MVP also lets the session facilitator link an external GitHub or GitLab repository so **Sprinter Analyst** can produce a **reference-only** story-point vote from code-complexity signals after reveal — separate from the human team average.

## User & Persona

### Primary persona: Facilitator

**Role:** Scrum Master or tech lead on a company dev team.

**Context:** Runs planning / estimation sessions for the team. Optionally links the team's external repository (GitHub or GitLab), enters the task (name required, description optional), starts voting, and reads the aggregated result (human average, per-participant votes, and optional Sprinter Analyst reference vote).

**Moment they reach for the product:** The team is about to estimate work; the facilitator needs a shared session where participants can vote on story points without juggling separate tools.

**Secondary users (MVP):** Team members who join the session and cast votes. They are not the primary design target for v1 — the facilitator's flow (create task → run vote → see outcome) defines success.

## Success Criteria

### Primary

End-to-end planning-poker session in a single shared room:

1. Participant registers or logs in (email + password or Google SSO).
2. Participant joins the shared session.
3. A participant creates a task (title required, description optional) and starts voting.
4. Other participants select story points for that task.
5. Individual votes remain hidden until the task creator triggers **Reveal**.
6. After reveal, the app shows each participant's vote and the calculated **human** average (Sprinter Analyst vote, if present, is shown separately and excluded from that average).

Session data (votes for the current task/session) is persisted only to support the live flow — not for browsing past sessions in MVP.

### Secondary

Before reveal, participants can see **who has voted** (e.g. count or names) but **not** which story points they selected.

### Guardrails

- **Blind voting until reveal:** No participant (including the task creator) sees others' point selections until the creator clicks Reveal (or equivalent).
- **No history UI in MVP:** Browsing previous votes/sessions remains out of scope; storage serves the active session only.
- **Single room:** No multi-room / multi-team support in MVP (per seed non-goals).
- **Analyst is reference-only:** Sprinter Analyst may show a story-point vote after reveal but it never enters the human team average and is never visible before reveal.

## User Stories

### US-01: Task creator runs a blind planning-poker vote

- **Given** two or more authenticated users in the shared planning session (via email/password or Google SSO)
- **When** one user creates a task (title required, description optional), starts voting, each participant selects a story-point value, and the task creator clicks Reveal
- **Then** every participant sees each person's vote and the calculated human average, and no point values were visible before reveal

#### Acceptance Criteria

- Before reveal, participants can see who has voted but not which points were selected
- After reveal, the human average is shown alongside individual human votes
- Votes are stored only for the active session (no past-session browser)

### US-02: Facilitator generates planning tasks from raw notes (Sprinter Draft)

- Given an authenticated user on the planning session page with raw notes (epic summary, meeting notes, backlog snippet)
- When they paste the notes and request task generation
- Then the system proposes one or more planning-poker-ready tasks, each with a title, description, acceptance criteria, and open questions, and the user can apply a proposal to the task creation form

### Acceptance Criteria

- Generated tasks include at least a title; description and lists may be empty but the structure is present
- User explicitly chooses Use this task — nothing is auto-created without confirmation
- Generation works for any authenticated session participant (flat roles); primary persona remains the facilitator
- If AI is unavailable, a deterministic fallback still returns usable task drafts from the pasted notes
- Pasted notes are not shown to other participants unless the user creates a task from them

### US-03: Team gets discussion prompts after divergent votes (Sprinter Coach)

- Given a task in revealed status with at least two story-point votes that meet the divergence threshold
- When a participant requests discussion prompts (or the panel is shown after reveal — dopasuj do implementacji)
- Then the system returns a short summary and 3–5 questions to align scope and assumptions — without recommending a final story-point value

#### Acceptance Criteria

- Coach appears only after reveal, never during blind voting
- Coach is offered when vote spread indicates divergence (e.g. max − min ≥ 3, or max ≥ 2× min)
- Prompts reference the task title/description and the revealed vote distribution, not hidden votes
- AI does not output a “correct” or “recommended” story-point estimate
- If AI is unavailable, fallback questions are still shown

### US-04: Facilitator links a repo; Sprinter Analyst provides a reference vote after reveal

- **Given** the session facilitator has linked one external GitHub or GitLab repository to the planning session and a task is in voting or revealed status
- **When** voting completes and the task creator clicks Reveal
- **Then** every participant sees human votes and the human team average, plus a visually distinct **Sprinter Analyst** story-point vote with a short rationale derived from code-complexity analysis — and the Analyst vote is **not** included in the average

#### Acceptance Criteria

- Only the session facilitator (who linked the repo) can connect, update, or disconnect the repository; other participants cannot
- MVP supports GitHub and GitLab (`gitlab.com` and self-managed instances with facilitator-supplied base URL) repository URLs only; local filesystem paths are out of scope
- Repository access credentials are stored server-side; repo contents and tokens are not exposed to other participants before reveal
- Analyst vote uses the same Fibonacci-style scale as human voters
- Analyst vote and rationale appear only after reveal, never during blind voting
- Team average is computed from **human votes only**; Analyst vote is labeled as reference-only
- If the repo is unreachable, access is denied, or AI analysis fails, human voting and reveal still succeed without an Analyst vote (graceful degradation)
- Linking a repo is optional; sessions without a linked repo behave as in US-01

## Functional Requirements

### Authentication

- FR-001: User can register with email and password. Priority: must-have
  > Socrates: Counter-argument considered: "registration friction kills adoption when teams want a 30-second join." Resolution: kept; email/password is the shaped access-control decision for MVP.
- FR-002: User can log in with email and password. Priority: must-have
  > Socrates: Counter-argument considered: "auth is overhead for a ceremony tool used weekly." Resolution: kept; accounts required for identified votes in the live session.
- FR-012: User can register or log in with Google SSO. Priority: must-have
  > Socrates: No counter-argument; it stands as written.
- FR-013: User can paste raw notes and generate draft planning-poker tasks (title, description, acceptance criteria, open questions). Priority: must-have
- FR-014: User can apply a generated draft to the task creation form without auto-submitting. Priority: must-have
- FR-015: After reveal, when votes are divergent, user can request AI-generated discussion questions for the team. Priority: must-have
- FR-016: System uses a server-side AI provider when configured; otherwise serves a non-AI fallback with the same response shape. Priority: must-have

### Session & tasks

- FR-003: User can join the shared planning session (single room). Priority: must-have
  > Socrates: Counter-argument considered: "single global room breaks when two teams use the app concurrently." Resolution: kept as MVP trade-off; multi-room explicitly deferred (non-goal).
- FR-004: User can create a task with a required title, optional description, and optional affected paths/modules hints for Sprinter Analyst. Priority: must-have
  > Socrates: No counter-argument; it stands as written.
- FR-005: User can start voting on a task they created. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

### Repository & Sprinter Analyst

- FR-017: Session facilitator can link one external GitHub or GitLab repository URL to the planning session (`gitlab.com` or self-managed with facilitator-supplied instance base URL). Priority: must-have
- FR-018: Session facilitator can update or disconnect the linked repository. Priority: must-have
- FR-019: System verifies repository access server-side: public repos without a token, or private repos via GitHub/GitLab OAuth authorized by the facilitator when linking. The facilitator chooses public vs private access mode at link time. Priority: must-have
- FR-020: When a repository is linked, system computes a sealed Sprinter Analyst story-point vote from code-complexity analysis scoped to the active task (title/description inference, narrowed by optional path hints). Priority: must-have
- FR-021: After reveal, system shows the Analyst vote and a short rationale (complexity signals, affected areas) separately from human votes. Priority: must-have
- FR-022: Team average excludes the Analyst vote; only authenticated human participants count toward the average. Priority: must-have
- FR-023: Local filesystem project paths are not supported in MVP. Priority: must-have

### Voting

- FR-006: User can select a story-point value for the active task. Priority: must-have
  > Socrates: No counter-argument; it stands as written.
- FR-007: User can see who has voted without seeing point values before reveal. Priority: must-have
  > Socrates: No counter-argument; it stands as written.
- FR-008: Task creator can reveal all votes for a task. Priority: must-have
  > Socrates: No counter-argument; it stands as written.
- FR-009: User can see each participant's vote and the calculated human average after reveal. Priority: must-have
  > Socrates: No counter-argument; it stands as written.
- FR-010: System hides story-point values until the task creator reveals. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

### Persistence

- FR-011: System persists votes for the current session only with no history browsing UI. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

## Non-Functional Requirements

- Story-point values remain invisible to all participants until the task creator reveals; a refresh or new tab must not expose others' selections early.
- Within 3 seconds of the creator triggering Reveal, every participant in the session sees the same human numeric average, sorted human vote list, and (when a repo is linked and analysis succeeded) the same Sprinter Analyst reference vote and rationale.
- Within 3 seconds of a participant submitting a vote, other participants see that person's name (or equivalent) in the "who voted" indicator — without seeing the point value.
- MVP supports current Chrome, Firefox, Safari, and Edge on desktop; mobile native apps are out of scope.
- Participant email addresses are not shown to other users in the session UI; only display names appear alongside votes.

## Business Logic

### Human team average

The app computes the team average from blind individual story-point selections by **authenticated human participants only**.

**Inputs:** Active task (title and optional description), each human participant's story-point selection, participant identity (user name), and the task creator's reveal action.

**Output:** After reveal — a numeric average of human story-point votes, a sorted list of human votes paired with user names, and (during voting) a list of who has voted without exposing point values.

**How the user encounters it:** Before reveal, participants only see who has voted (not point values). After the task creator clicks Reveal, all participants see the full sorted human vote list and the computed human average.

### Sprinter Analyst reference vote

When the session facilitator has linked an external GitHub or GitLab repository, the system produces one Analyst story-point vote from server-side code-complexity analysis scoped to the active task.

**Inputs:** Linked repository (URL + server-side access; public or OAuth-authorized private), active task (title and optional description), optional **affected paths/modules** hints on the task form. Server may reuse a persisted repo snapshot/index for repos the facilitator has linked before, instead of re-fetching the full tree on every session.

**Output:** After reveal only — one Fibonacci-style story-point value labeled **Sprinter Analyst**, plus a short rationale summary (e.g. files touched, complexity signals). The Analyst vote is **excluded** from the human team average.

**How the user encounters it:** Analyst output is invisible before reveal. After reveal it appears as a separate reference row/panel, visually distinct from human voters. If analysis fails, reveal proceeds without Analyst output.

## Access Control

**Authentication:** Two sign-in paths in MVP, both leading to the same user account:

1. **Email and password** — register and log in with credentials.
2. **Google SSO** — sign in with a Google account (Google only in MVP; no other OAuth providers).

Every participant must be authenticated before joining a voting session.

**Roles:** Flat — no separate facilitator, admin, or guest roles in MVP. Permissions are the same for all authenticated users for voting and task creation. The facilitator persona is a usage pattern: whoever creates the task and starts voting leads the session.

**Repository linking (facilitator-only exception):** Only the user who linked the external repository to the session may connect, update, or disconnect it. Other participants cannot view repo credentials or trigger repo fetch; they only see Analyst output after reveal when linking succeeded.

**Note vs. seed notes:** Original idea notes proposed username-only login; shaped decision is email + password plus Google SSO.

## Non-Goals

- **Session history UI:** MVP does not let users browse or search previous votes or past sessions — storage serves the live session only.
- **Retro ceremonies:** No sticky-note / retrospective board in MVP; planning poker only.
- **Native mobile apps:** Desktop browser only; no iOS/Android clients in MVP.
- **Custom story-point algorithm:** No proprietary estimation logic — standard Fibonacci-style (or fixed) point scale only; the product averages human selections, it does not invent points for the team average.
- **AI in the human average:** Sprinter Analyst may show a reference story-point vote after reveal when a repo is linked, but that vote never enters the human team average and is never visible before reveal. Sprinter Draft and Sprinter Coach remain preparation/discussion aids only — they do not replace human planning poker.
- **Local project paths:** MVP does not read code from a facilitator's local filesystem; only external GitHub or GitLab repository URLs.

## Open Questions

1. **target_scale ballparks** — Input specifies `users: small` (~10 users on one dev team). `qps` and `data_volume` ballparks were not captured. Owner: user. By: before stack selection.

## Resolved Questions

2. **Repository auth mechanism** — **Resolved 2026-05-30:** GitHub/GitLab OAuth for private repos; public repos without token; facilitator selects public vs private when linking. Persist credentials and a server-side repo snapshot/index so repeat sessions on the same repo avoid full re-fetch.
3. **Task-to-code scope** — **Resolved 2026-05-30:** Title/description inference plus optional affected-path hints on the task form.
4. **GitLab self-hosted** — **Resolved 2026-05-30:** `gitlab.com` and self-managed GitLab; facilitator supplies instance base URL.
5. **MVP timeline impact** — **Resolved 2026-05-30:** Sprinter Analyst stays in MVP; ship after Sprinter Coach (S-03).
