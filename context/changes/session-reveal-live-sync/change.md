---
change_id: session-reveal-live-sync
title: Fix live reveal sync for peer session participants
status: implemented
created: 2026-05-28
updated: 2026-05-28
archived_at: null
---

## Notes

When the task creator clicks Reveal, peer browsers stay on masked voting UI despite showing Live. Root cause: Realtime WebSocket connects without JWT (`setAuth`), so RLS silently drops `tasks` UPDATE events. Fix: authenticate Realtime before subscribe; bootstrap token from SSR session.
