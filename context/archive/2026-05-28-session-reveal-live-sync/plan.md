# Session reveal live sync — Implementation Plan

## Overview

Hotfix for peer browsers not auto-updating when the task creator reveals votes. Builds on F-02 Realtime + S-01 SessionRoom. **Symptom:** second user shows **Live** but UI stays pre-reveal until manual refresh. **Cause:** Realtime channel `SUBSCRIBED` without JWT → RLS filters `postgres_changes` on `tasks`/`votes`.

## Current State Analysis

- `SessionRoom` subscribes via `subscribeToSessionTask` on mount when `liveTaskId` is set.
- `createBrowserClient()` does not call `realtime.setAuth()` before subscribe.
- Creator reveal path: `POST /api/session/reveal` → local `refetchState` — works for actor only.
- Peers depend on `tasks` UPDATE Realtime event → `refetchState` — blocked without auth.
- Badge **Live** only reflects WebSocket status, not RLS-authenticated Realtime.

## Desired End State

1. Before any Realtime subscribe, browser client sets Realtime JWT from Supabase session.
2. `SessionRoom` receives SSR access token bootstrap from `session.astro`.
3. Token refresh updates Realtime auth via `onAuthStateChange`.
4. Two browsers: creator reveals → peer sees points + average within ~3s without refresh.

## What We're NOT Doing

- New roadmap slice
- Broadcast / polling fallback
- RLS policy changes (reveal path uses `tasks` SELECT for all authenticated users)
- Migrations beyond `20260528100000_votes_touch_task_for_realtime.sql` (vote→task `updated_at` bump for Realtime only)

## Phase 1: Realtime auth before subscribe

### Changes Required

#### 1. Auth helper

**File**: `src/lib/session/realtime-auth.ts`

**Intent**: Centralize Realtime JWT wiring.

**Contract**: `ensureRealtimeAuth(supabase, accessToken?)` — use optional bootstrap token, else `auth.getSession()`; call `realtime.setAuth`; return boolean.

#### 2. Subscribe helper update

**File**: `src/lib/session/realtime.ts`

**Intent**: Export async `connectSessionRoomRealtime` that awaits auth, registers `watchRealtimeAuth` (refreshes `setAuth` on auth state changes), then subscribes to session-scoped `tasks` UPDATE (`planning-session:{sessionId}` filter by `session_id`).

#### 3. SessionRoom + session.astro

**Files**: `src/components/session/SessionRoom.tsx`, `src/pages/session.astro`

**Intent**: Pass `realtimeAccessToken` and `planningSessionId` from server; use async `connectSessionRoomRealtime` in `useEffect`; set connection error when auth missing.

#### 4. Tests

**Files**: `src/lib/session/realtime-auth.test.ts`, update `realtime.test.ts` if needed

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed
- `npm run build` passes

#### Manual Verification

- Two browsers, two users: after creator Reveal, peer UI updates without refresh (points + average)
- Peer Network tab shows `GET /api/session/state` triggered without manual refresh
- Badge remains **Live** during voting and after reveal

## Phase 2: Vote + new-round live sync

### Changes Required

#### 1. Vote→task Realtime bump

**File**: `supabase/migrations/20260528100000_votes_touch_task_for_realtime.sql`

**Intent**: AFTER INSERT/UPDATE/DELETE on `votes`, trigger bumps parent `tasks.updated_at` so peers receive `tasks` UPDATE (votes RLS hides peer rows pre-reveal).

#### 2. Session-scoped subscribe (same files as Phase 1)

**Files**: `src/lib/session/realtime.ts`, `src/components/session/SessionRoom.tsx`, `src/pages/session.astro`

**Intent**: Subscribe by `planningSessionId` (not per-task id) so vote bumps and new voting rounds refetch `/api/session/state` for all peers.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed
- `npm run build` passes
- Migration `20260528100000_votes_touch_task_for_realtime.sql` applies cleanly

#### Manual Verification

- Two browsers: A votes → B sees A in who-voted without refresh
- Two browsers: A creates task + starts voting → B sees new voting UI without refresh

## Progress

### Phase 1: Realtime auth before subscribe

#### Automated

- [x] 1.1 `npm run lint` passes
- [x] 1.2 `npm run test:coverage` passes with coverage table printed
- [x] 1.3 `npm run build` passes

#### Manual

- [x] 1.4 Two-browser reveal sync without refresh
- [x] 1.5 Peer `GET /api/session/state` fires automatically on reveal

### Phase 2: Vote + new-round live sync

#### Automated

- [x] 2.1 `npm run lint` passes on changed files
- [x] 2.2 `npm run test:coverage` passes with coverage table printed
- [x] 2.3 `npm run build` passes
- [x] 2.4 Migration `20260528100000_votes_touch_task_for_realtime.sql` applies cleanly

#### Manual

- [x] 2.5 Two browsers: A votes → B sees A in who-voted without refresh
- [x] 2.6 Two browsers: A creates task + starts voting → B sees new voting UI without refresh
