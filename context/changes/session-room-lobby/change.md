---
id: session-room-lobby
title: Session room lobby and multi-room flow
status: implemented
created: 2026-05-30
updated: 2026-05-30
---

## Notes

After reveal, show results + mock task history — not the full create form. "Start next task" (creator-only) goes to `/session/[slug]/new`. `/session` is a lobby: list rooms + join/create by kebab-case slug. Full multi-room (not just `default`). Static labeled sample history rows until real DB history is wired.
