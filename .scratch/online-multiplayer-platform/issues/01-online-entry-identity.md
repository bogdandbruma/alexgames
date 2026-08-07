# 01 — Online entry: Supabase platform client + device identity + Offline/Online

**What to build:** From the main menu the user can choose **Offline** (unchanged, works with no network) or **Online**. Online loads env-based Supabase config, ensures a stable `device_id`, lets the user set a **username**, upserts a generic `profiles` row, and confirms the platform connection works. Schema created in this ticket is **only** the reusable platform tables (at least `profiles`; rooms/members/messages may be included here or completed in 02 — prefer shipping the full generic migration once so DB never needs game-specific alterations). No Space Board rules in Postgres.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `.env.local` pattern documented; env files gitignored; app reads Project URL + publishable key.
- [x] SQL migration creates **generic** tables only (`profiles`, and ideally `rooms` / `room_members` / `room_messages` with `game_slug` on rooms) — zero Space Board-specific columns/tables.
- [x] Client generates and persists `device_id`; username can be set and upserted to `profiles`.
- [x] UI offers Offline vs Online; Offline path never requires Supabase.
- [x] Online shows a clear success/failure if Supabase is unreachable.
- [x] Tests or smoke check cover identity persistence and “offline without keys still boots”.

## Comments

**Outcome:** Shipped `src/online/*` platform entry — identity, env config, Supabase client factory, profile upsert + connection verify, Offline/Online chooser (`PlaySession`) wired from `App`, Online entry UI (RO), full generic SQL migration, `.env.example` + README notes. No lobby/sync/chat beyond identity connect.

**Tests run:** `npx vitest run src/online/` → 7 files, 16 passed. `npx tsc -b` clean.

**Blockers:** None. Applying the SQL migration + filling `.env.local` is required for a live Online connect outside tests.
