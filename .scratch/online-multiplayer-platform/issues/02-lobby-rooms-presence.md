# 02 — Lobby: create / list / join by game_slug + waiting room + presence

**What to build:** For a chosen `game_slug` (Space Board uses `space-board`), the user sees a **lobby of rooms for that game only**, can **create** a room (becomes host with a player seat + avatar/display name), **join as player** or **spectator**, and see **who is connected** via presence. Host can add AI seats, kick, and Start (≥2 players, max 4 for Space Board v1). After Start, new joins are **spectator-only**; room stays listed as in progress. Waiting-room chat may exist but follows session-ephemeral display (see ticket 05); lobby priority is presence. Platform APIs stay game-agnostic (filter by `game_slug`).

**Blocked by:** 01 — Online entry: Supabase platform client + device identity + Offline/Online

**Status:** done

- [x] Room list filters by `game_slug`; each room stores which game it belongs to.
- [x] Create room → host member + player seat; join player (while `waiting` + free seat) or spectator.
- [x] Presence shows currently connected members in the room.
- [x] Host: add AI, kick, Start; after Start only spectator join is allowed.
- [x] No game-rule tables added; member/avatar fields remain generic strings/flags.
- [x] Demoable with two browsers against the same Supabase project.

## Comments

Implemented game-agnostic lobby/room APIs + UI wired after Online connect success (`gameSlug` from registry id, e.g. `space-board`).

- `src/online/rooms.ts`: `listRooms`, `createRoom`, `joinRoom`, `addAiSeat`, `kickMember`, `startRoom`, `listMembers`, `fetchRoom`
- `src/online/presence.ts`: Realtime channel `room:{id}` presence subscribe/track
- `src/online/Lobby.tsx` + `WaitingRoom.tsx`: list/create/join + host controls + connected presence
- PlaySession/OnlineEntry pass `gameSlug`; no Space Board imports under `src/online/*`
- Chat (05), envelopes (03), visibility (04), host-disconnect pause (06) not implemented
- Avatar pick left optional (`avatar_id` nullable); no game-specific picker yet
- Vitest `src/online`: 35 passed; `tsc -b` clean
