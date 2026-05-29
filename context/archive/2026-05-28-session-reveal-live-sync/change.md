---
change_id: session-reveal-live-sync
title: Fix live reveal sync for peer session participants
status: archived
created: 2026-05-28
updated: 2026-05-29
archived_at: 2026-05-29T13:54:41Z
---

## Notes

When the task creator clicks Reveal, peer browsers stay on masked voting UI despite showing Live. Root cause: Realtime WebSocket connects without JWT (`setAuth`), so RLS silently drops `tasks` UPDATE events. Fix: authenticate Realtime before subscribe; bootstrap token from SSR session.
