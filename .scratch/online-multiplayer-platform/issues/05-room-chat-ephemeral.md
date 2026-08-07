# 05 — Room chat (session-ephemeral UI, scoped to game room)

**What to build:** Chat is **tied to the room** (and thus to that room’s `game_slug` / game session), available in waiting room and during play for host, players, and spectators. Text + fixed emoji set. **UI shows only messages received while the user is present** — joining mid-session must **not** dump full history. Rows may still be written to generic `room_messages` for persistence/ops, but display is session-ephemeral. Lobby can emphasize presence; chat is optional under the same rule.

**Blocked by:** 02 — Lobby: create / list / join by game_slug + waiting room + presence

**Status:** done

- [x] Send/receive chat inside a room for players and spectators.
- [x] Fixed emoji picker works; body length capped.
- [x] On join, UI does not load prior history; only live messages after join appear.
- [x] Chat is not global across games — always room-scoped.
- [x] Collapsible chat panel in online room UI.
- [x] Uses generic `room_messages` only (no game-specific chat tables).

## Comments

Platform chat module + collapsible UI mounted from WaitingRoom (waiting + play wrapper). No Space Board online files touched.

- `src/online/chat.ts`: `sendRoomMessage` → `room_messages` insert; `subscribeRoomMessages` → postgres_changes INSERT only (`room-messages:{id}`); never SELECTs history; `CHAT_BODY_MAX_LENGTH=200`; fixed `CHAT_EMOJI`
- `src/online/RoomChat.tsx`: collapsible panel, text + emoji picker, session-ephemeral message list
- `WaitingRoom` mounts `RoomChat` in waiting UI and beside `OnlinePlay` when playing (platform-side slot; avoids `src/games/space-board/online` conflicts)
- Migration `20260806010000_room_messages_realtime.sql` adds `room_messages` to `supabase_realtime` publication (apply in Supabase)
- Vitest `src/online`: chat + RoomChat + WaitingRoom green; `tsc -b` clean
