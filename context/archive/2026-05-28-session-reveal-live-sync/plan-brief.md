# Session reveal live sync — Plan Brief

> Full plan: `context/changes/session-reveal-live-sync/plan.md`

## Problem

Peer users see **Live** but do not auto-update after creator **Reveal**. Creator refetches locally after `POST /api/session/reveal`; peers rely on Realtime `tasks` UPDATE → refetch, which never fires because the browser client subscribes without `realtime.setAuth()`.

## Fix

1. `ensureRealtimeAuth(supabase)` — `getSession()` + `realtime.setAuth(access_token)` before subscribe.
2. Pass SSR `accessToken` from `session.astro` to `SessionRoom` to avoid subscribe-before-session race.
3. Re-subscribe auth on `TOKEN_REFRESHED` via `onAuthStateChange`.
4. Unit tests for auth helper; manual two-browser reveal ≤3s.

## Out of scope

Broadcast channels, HTTP polling, new roadmap slice, reopening S-01/F-02 archives.
