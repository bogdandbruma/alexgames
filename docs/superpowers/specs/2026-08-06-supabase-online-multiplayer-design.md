# Supabase online multiplayer (Space Board + shared platform)

**Date:** 2026-08-06  
**Status:** approved design (pending implementation plan)  
**App:** single Vite/React client (`demo`) — Offline (unchanged) + Online  
**Backend:** one Supabase project for this game and future games

## Goals

- Play Space Board **online** with friends via **rooms** (lobby list → join as player or spectator).
- **No classic auth** — identity is `device_id` + player-chosen **username**.
- Keep current **offline** hot-seat + AI mode.
- Show **who is connected**; simple **in-room chat** with text + fixed emoji set.
- **Host** owns the room (start, kick, add AI, close).
- After Start: join only as **spectator**.
- Host disconnect: **pause ~90s** waiting for same `device_id`, then **close** room.
- Preserve **all character animations** for every client (own + others).
- Visibility rules for interactions (trivia/mystery public; shop purchase secret).

## Non-goals (v1)

- Email/Google/password auth, matchmaking, ranked play
- Server-authoritative game rules / anti-cheat
- Voice chat, custom emoji uploads, infinite chat history
- Second game implementation (schema only supports `game_slug`)
- Separate backend app or second client — Supabase is managed BaaS, not a second codebase

## Architecture choice

**Host-authoritative + Supabase Realtime** (simplest path).

```
[Player / Spectator clients]  ←→  Supabase (Postgres + Realtime)  ←→  [Host client]
```

| Concern | Where it lives |
|--------|----------------|
| Game rules, dice, AI, inventory, pendingEvent | **Host client** (existing Zustand engine) |
| Lobby rooms, members, chat, profiles | **Postgres** |
| Presence, action messages, game snapshots / UI events | **Realtime** (channel per room) |
| Offline mode | Local Zustand + `localStorage` only — **no Supabase calls** |

Rejected for v1: full server authority (too much port of logic/AI); hybrid DB checkpoints (extra complexity without needed fairness).

### Single app

One frontend. Mode switch: Offline | Online. Deploy frontend wherever later (e.g. Vercel) — still one app. Supabase dashboard project is configuration, not a second application we maintain as code (except SQL migrations / optional Edge Functions later).

### MCP

Supabase MCP is **optional** (schema helpers in Cursor). Not required. Need: Project URL + `anon` key. Never put `service_role` in the client.

---

## Identity

1. On first launch, generate UUID `device_id`, persist in `localStorage`.
2. User sets `username` (same constraints as current player name, e.g. max 10 chars).
3. Upsert into `profiles` when entering Online / creating-joining a room.
4. Reconnect = same `device_id` (host pause/resume relies on this).

No Supabase Auth email flow in v1. Access control is soft (anon key + RLS keyed by `device_id` claims we send). Accept casual trust: friends game, host is source of truth.

---

## Lobby & rooms

### Room list

Visible rooms for `game_slug = 'space-board'` (and later other slugs) with:

- name, host username, status (`waiting` | `playing` | `paused`), player count / max, spectator count

### Roles

| Role | Capabilities |
|------|----------------|
| **Host** | Create room, add AI seats, kick, Start, close; also plays if seated as player |
| **Player** | Seat 0–3, send game actions on their turn; chat |
| **Spectator** | Watch full board + animations + public overlays; chat; no game actions |

### Flow

1. Create room → creator is host (and takes a player seat), picks **username + avatar** like offline setup.
2. Others Join as **player** (if `waiting` and free human seat; pick avatar) or **spectator**.
3. Host may fill empty seats with **AI** (AI gets display name + avatar).
4. Host Start when ≥2 total players (humans + AI), max 4 players (same as offline).
5. After Start: status `playing`; **player join closed**; spectator join still allowed; room stays on lobby list as in-progress.
6. Presence channel shows connected devices in the room.

### Host disconnect

1. Presence: host leaves → room `paused`, clients show banner, game actions blocked.
2. Wait **~90 seconds** for host `device_id` to reconnect and reclaim.
3. If timeout → any still-connected client may set status `closed` (first write wins); all clients exit to lobby.
4. While paused, only host reconnect restores `playing`; no host transfer.

---

## Game sync (host-authoritative)

### Action path

1. Non-host (or host UI) sends action on room Realtime channel, e.g. `rollDice`, `answerTrivia`, `buyShopItem`, `closeShop`, `pickMysteryCard`, `acknowledgeMystery`, `resolveTrap`, `useInventoryItem`, `endTurn`.
2. Host validates: member is `player` (not spectator), correct turn / pendingEvent, etc.
3. Host applies via existing store APIs.
4. Host broadcasts:
   - **`game_state`** — serializable snapshot aligned with `PersistedState` (+ whatever clients need for UI), with **shop privacy filter** for non-owner views where applicable
   - **`ui_events`** — animation / overlay cues so remotes play the same walks, dice rolls, portals, coin bursts for **every** character

Clients that are not host: **do not** run authoritative mutations; they apply snapshots + play `ui_events`. Host runs AI hooks locally; others only see resulting state/events.

### Animations (hard requirement)

Every client must see animations for **all** player characters (local and remote): walk paths, dice, portals, coin bursts, etc. Sync must carry enough timing/path data (or deterministic replay from state deltas + event ids) so remotes do not “teleport” while host animates.

Reuse / extend existing `activePlayerWalk`, dice anim flags, portal transition, coin bursts as broadcastable UI events. Prefer event stream + lightweight state over silently snapping `positionIndex`.

### Interaction visibility

| Interaction | What everyone sees | Secret |
|-------------|-------------------|--------|
| **Trivia** | Question, options, who answers, correct/wrong, coin effect | — |
| **Mystery** | Which card was drawn + description/effect | — |
| **Shop** | Optional: player is “in shop” | **Which item was bought**; inventory stays private on each player's UI until an item is **used** (use is public) |
| **Trap / portals / coins** | Public as today | — |

Implementation note: host holds full state. Other clients receive filtered payloads (omit others' inventory contents and purchase item ids). Coin totals may still change after shop (cost), without revealing item identity.

`pendingEvent` (already designed for persistence) is the wire-ready “current interaction” for trivia/mystery/portal/trap; shop pending is shown fully only to the shopping player (+ host).

---

## Chat

- Table `room_messages`: short text + optional emoji from a **fixed** picker set.
- Who can write: host, players, spectators — in lobby waiting and during play.
- Live via Realtime; keep ~last 100 messages per room (trim or delete older).
- Collapsible chat panel in online room / in-game UI.

---

## Data model (Postgres)

### `profiles`

| Column | Type | Notes |
|--------|------|--------|
| `device_id` | uuid PK | Client-generated |
| `username` | text | Display name |
| `updated_at` | timestamptz | |

### `rooms`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `game_slug` | text | e.g. `space-board` |
| `name` | text | |
| `host_device_id` | uuid | FK logical to profiles |
| `status` | text | `waiting` \| `playing` \| `paused` \| `closed` |
| `max_players` | int | default 4 |
| `created_at` / `updated_at` | timestamptz | |

### `room_members`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `room_id` | uuid | |
| `device_id` | uuid nullable | null for pure AI rows |
| `role` | text | `host` \| `player` \| `spectator` |
| `seat` | int nullable | 0–3 for players; null spectators |
| `is_ai` | boolean | |
| `display_name` | text | username or AI name |
| `avatar_id` | text nullable | same avatar ids as offline; null for spectators if unused |
| `connected` | boolean | mirrored from presence where useful |
| unique | `(room_id, seat)` where seat not null | |

### `room_messages`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `room_id` | uuid | |
| `device_id` | uuid | |
| `username` | text | denormalized for display |
| `body` | text | length-capped |
| `created_at` | timestamptz | |

Game snapshot is **not** normalized into many tables in v1 — Realtime broadcast. Optional later: persist last snapshot on `rooms` for faster spectator join.

### Realtime

- Postgres changes: room list, members, messages (replication / subscriptions).
- Broadcast + Presence on `room:{id}`: actions, `game_state`, `ui_events`, connected roster.

### RLS (sketch)

- Anon clients can read open rooms / messages for rooms they joined.
- Insert/update scoped by `device_id` matching the acting profile (passed/stored carefully — document exact RLS in implementation plan; v1 may start permissive on private project and tighten).

---

## Client module boundaries

| Module | Responsibility |
|--------|----------------|
| `src/game/*` | Keep pure offline engine; avoid Supabase imports inside core reducers |
| `src/online/identity` | device_id + username |
| `src/online/supabaseClient` | createClient from env |
| `src/online/lobby` | list/create/join rooms, members |
| `src/online/roomChannel` | presence, actions, broadcast apply |
| `src/online/chat` | send/list messages |
| `src/games/space-board/*` | UI: mode picker, lobby, presence strip, chat, pause banner; host wires store ↔ channel |

Offline path must remain testable without network.

---

## Error handling

| Case | Behavior |
|------|----------|
| Supabase unreachable in Online | Clear error; stay in lobby/menu; Offline still works |
| Invalid action (wrong turn / spectator) | Host ignores; optional toast to sender |
| Duplicate seat join | Reject; offer spectator |
| Refresh mid-game | Rejoin via `device_id`; host re-broadcasts latest state + pendingEvent |
| Host timeout | Room `closed` |

---

## Testing (implementation phase)

- Unit: action validation helpers, shop filter for broadcasts, identity persistence
- Integration: mock channel — host applies action → remote sees state + ui event
- Manual: 2 browsers, create/join, spectator after start, trivia/mystery public, shop secret, host tab close → pause → reopen

---

## Setup checklist (human + agent)

1. Create Supabase project (user has account).
2. Provide **Project URL** + **anon key** via `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Run SQL migrations for tables + Realtime publication.
4. Optional: enable Supabase MCP in Cursor later.
5. Implement Online UI + host sync; keep Offline default path.

---

## Decisions log

| Topic | Decision |
|-------|----------|
| Multiplayer shape | Rooms + lobby; join player or spectator |
| Auth | device_id + username only |
| Offline | Keep current mode |
| Room control | Host |
| AI | Humans default; host may add AI |
| After Start | Spectator-only join |
| Host drop | Pause ~90s then close |
| Sync model | Host-authoritative + Realtime |
| Apps | One client + one Supabase project |
| Animations | All characters animated on all clients |
| Trivia / mystery | Fully public |
| Shop | Purchase + inventory private until item use |
| Chat | Text + fixed emojis; players + spectators |
| Platform | One Supabase; `game_slug` for future games |
