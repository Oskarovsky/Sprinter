# Review triage follow-ups (2026-05-29)

- If `20260528100000_votes_touch_task_for_realtime.sql` was already applied before REVOKE/COMMENT edits, run the tail of that migration manually or add a one-off migration with the `COMMENT` + `REVOKE` statements.
- `scripts/sync-roadmap-to-github.mjs`: `_graphqlRequest` is unused dead code — remove when touching that script next.
