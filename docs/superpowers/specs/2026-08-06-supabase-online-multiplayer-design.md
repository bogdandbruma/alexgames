# Supabase online multiplayer platform (reusable + Space Board v1)

**Date:** 2026-08-06  
**Status:** approved design  
**App:** single Vite/React client (`demo`) — Offline (unchanged) + Online  
**Backend:** **one** Supabase project — **game-agnostic schema** reused by Space Board and future games

## Goals

### Platform (must stay reusable without DB changes)

- Generic **rooms** tagged with `game_slug` (which game the room belongs to).
- Generic **members** (host / player / spectator, optional AI seats).
- Generic **Realtime** transport: presence + **JSON envelopes** for actions / state / UI events (payload opaque to the DB).
- Generic **chat** scoped to a **room** (hence to that game’s session) — not a global cross-game chat.
- Future games plug in by: same lobby/room/members/chat + interpreting the same envelope shape with their own `payload`.

### Space Board v1 product

- Online rooms: lobby list → join as player or spectator.
- **No classic auth** — `device_id` + player-chosen **username**.
- Keep **offline** hot-seat + AI.
- Show **who is connected**; chat with text + fixed emoji set.
- **Host** controls room (start, kick, add AI, close).
- After Start: join only as **spectator**.
- Host disconnect: **pause ~90s** then **close** if no reclaim.
- **All character animations** on all clients.
- Visibility: trivia/mystery public; shop purchase + inventory private until item use.

## Non-goals (v1)

- Email/Google auth, matchmaking, ranked play, anti-cheat server
- **Game-specific Postgres tables** (no `space_board_*` columns/tables for rules, cards, shops, etc.)
- Loading full chat history on join
- Second game implementation (platform must already support it via `game_slug` + JSON)
- Separate backend codebase

## Architecture

**Host-authoritative + Supabase Realtime.**

```
[Clients]  ←→  Supabase (generic rooms/members/chat + Realtime)  ←→  [Host client]
                      ↑
         game rules live in the game app for that game_slug
```

| Concern | Where |
|--------|--------|
| Room lifecycle, members, presence, chat rows | **Postgres (generic)** |
| Actions / snapshots / UI events | **Realtime JSON envelopes** (not normalized game tables) |
| Space Board rules, AI, pendingEvent | **Host client** (`src/game/*`) |
| Offline | Local only — no Supabase |

### Single app

One frontend; Offline | Online. One Supabase project for all future games.

### MCP

Optional. Client needs Project URL + publishable/`anon` key. Never ship `service_role` / `sb_secret_*` in the client.

---

## Platform principle: no per-game DB

Postgres stores **session infrastructure** only:

- who is in which room
- which `game_slug` the room is for
- room status
- optional opaque `jsonb` blobs if useful for reconnect (still not game-schema)

All game-specific meaning lives in:

1. Client code registered for that `game_slug`
2. JSON `payload` inside the shared envelope

Adding a new game = new client module + new `game_slug` string — **no migration** for rules data.

---

## Wire format (reusable JSON)

All Realtime game traffic uses one envelope (versioned):

```ts
type RoomEnvelope = {
  v: 1;
  game_slug: string; // e.g. "space-board"
  kind: "action" | "state" | "ui_event";
  room_id: string;
  sent_at: string; // ISO timestamp
  sender_device_id?: string;
  /** Opaque to platform; interpreted only by the game client for game_slug */
  payload: unknown;
};
```

| `kind` | Meaning | Who sends |
|--------|---------|-----------|
| `action` | Player intent (roll, answer, buy, …) | Any seated player (host validates) |
| `state` | Authoritative snapshot (may be privacy-filtered per recipient policy in client) | Host |
| `ui_event` | Animation / overlay cues (walk, dice, bursts, …) | Host |

Space Board maps existing store APIs into `payload` shapes; another game defines its own `payload` types under the same envelope. Platform code never switches on Space Board field names inside Postgres.

Optional: `rooms.last_envelope` or `rooms.last_state jsonb` storing the latest host `state` envelope for late joiners — still opaque JSON.

---

## Identity

1. Generate `device_id` (UUID) → `localStorage`.
2. User sets `username` (same limits as offline player name).
3. Upsert `profiles` when entering Online.
4. Reconnect = same `device_id`.

No classic Supabase Auth in v1.

---

## Lobby & rooms

### Room list

Filter by `game_slug` (Space Board lobby shows `space-board` only). Fields: name, host, status (`waiting` | `playing` | `paused`), player/spectator counts.

### Roles

| Role | Capabilities |
|------|----------------|
| **Host** | Create, add AI, kick, Start, close; usually also a player seat |
| **Player** | Seated; send `action` envelopes on their turn; chat |
| **Spectator** | Watch; chat; no game `action`s |

### Flow (Space Board)

1. Create room with `game_slug: "space-board"` → host seat + username/avatar.
2. Join player (if `waiting` + free seat) or spectator.
3. Host may add AI seats.
4. Start when ≥2 players (humans + AI), max 4.
5. After Start: player join closed; spectators OK; room stays listed as in-progress.
6. Presence = who’s connected now.

### Host disconnect

1. Host leaves presence → `paused`, banner, block actions.
2. ~90s wait for same `device_id`.
3. Timeout → any connected client may set `closed`.
4. No host transfer in v1.

---

## Space Board sync notes

- Host runs Zustand engine; remotes apply `state` + play `ui_event`s.
- **Animations for every character** on every client (no silent teleports).
- Trivia / mystery: public in `state` / `ui_event`.
- Shop: purchase + inventory private until item **use** (use is public). Filter in Space Board adapter when building outbound `state` for others.
- `pendingEvent` is part of Space Board `payload`, not a DB column.

---

## Chat

- **Scoped to room** (and therefore to that game session via `rooms.game_slug`). Not shared across games.
- Participants: host, players, spectators.
- Text + fixed emoji picker.
- **Display policy (lobby and in-game):** show only messages received **while the user is present** in that room session. **Do not** load or show full history on join.
- Persisting rows in `room_messages` is allowed (ops/debug/moderation) but **UI is session-ephemeral**.
- Lobby emphasis: **presence** (“who’s here”); chat is optional sugar under the same display rule.
- Collapsible panel in room UI.

---

## Data model (Postgres) — generic only

### `profiles`

| Column | Type | Notes |
|--------|------|--------|
| `device_id` | uuid PK | Client-generated |
| `username` | text | |
| `updated_at` | timestamptz | |

### `rooms`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `game_slug` | text | **which game** — e.g. `space-board` |
| `name` | text | |
| `host_device_id` | uuid | |
| `status` | text | `waiting` \| `playing` \| `paused` \| `closed` |
| `max_players` | int | default 4 |
| `last_state` | jsonb nullable | optional opaque latest `state` envelope/payload |
| `created_at` / `updated_at` | timestamptz | |

### `room_members`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `room_id` | uuid | |
| `device_id` | uuid nullable | null for AI |
| `role` | text | `host` \| `player` \| `spectator` |
| `seat` | int nullable | 0–3 players; null spectators |
| `is_ai` | boolean | |
| `display_name` | text | |
| `avatar_id` | text nullable | game may ignore; opaque string |
| `connected` | boolean | |
| unique | `(room_id, seat)` where seat not null | |

### `room_messages`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `room_id` | uuid | implies game via room |
| `device_id` | uuid | |
| `username` | text | |
| `body` | text | length-capped |
| `created_at` | timestamptz | |

**Forbidden in v1 schema:** tables/columns named for Space Board rules (trivia decks, shop SKUs, room 1–67, etc.). Those stay in app content + JSON payloads.

### Realtime

- DB changes: rooms, members, messages.
- Channel `room:{id}`: Presence + Broadcast of `RoomEnvelope`.

### RLS

Start workable for private project; tighten by `device_id` / membership. Document in implementation tickets.

---

## Client module boundaries

| Module | Responsibility |
|--------|----------------|
| `src/online/*` | **Reusable platform:** identity, supabase client, lobby by `game_slug`, room channel, envelope send/recv, chat UI helpers (no Space Board imports) |
| `src/game/*` | Offline Space Board engine (no Supabase) |
| `src/games/space-board/*` | Space Board Online adapter: map store ↔ envelopes, visibility filters, game UI |

Future game: new `src/games/<slug>/` + lobby filter — **same** `src/online/*` and **same** DB.

---

## Error handling

| Case | Behavior |
|------|----------|
| Supabase down (Online) | Error in Online UI; Offline unaffected |
| Bad / wrong-turn `action` | Host ignores |
| Spectator sends `action` | Host ignores |
| Refresh | Rejoin by `device_id`; host re-sends `state` (+ optional `rooms.last_state`) |
| Host timeout | Room `closed` |

---

## Testing

- Platform: envelope round-trip with dummy `game_slug`; lobby filter by slug
- Space Board: 2 browsers — animations, trivia/mystery public, shop secret, host pause
- Chat: join mid-room → no historical dump; only live messages after join
- Regression: Offline unchanged without env keys

---

## Setup checklist

1. Supabase project (URL + publishable key).
2. `.env.local` + gitignore for env files.
3. SQL migration: generic tables only + Realtime.
4. Implement tickets in `.scratch/online-multiplayer-platform/issues/`.

---

## Decisions log

| Topic | Decision |
|-------|----------|
| DB shape | **Generic only** — rooms/members/chat/profiles; no per-game schema |
| Game identity | `rooms.game_slug` |
| Sync payload | Versioned **JSON `RoomEnvelope`**; game logic in `payload` |
| Future games | Same room/server/players/realtime pattern; new client adapter only |
| Chat scope | Per room (per game session); not global |
| Chat display | Session-ephemeral — no history UI on join; DB persist optional |
| Lobby | Presence first; chat optional under same display rule |
| Auth | device_id + username |
| Offline | Kept |
| Room control | Host; AI optional; after Start spectators only |
| Host drop | Pause ~90s then close |
| Sync model | Host-authoritative |
| Space Board visibility | Trivia/mystery public; shop secret until use |
| Animations | All characters on all clients |
