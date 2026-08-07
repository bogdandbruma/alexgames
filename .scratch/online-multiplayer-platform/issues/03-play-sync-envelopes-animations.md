# 03 — Play sync: RoomEnvelope actions/state/ui_events + all-character animations

**What to build:** Once a Space Board room is `playing`, clients exchange **versioned JSON `RoomEnvelope`** messages (`kind`: `action` | `state` | `ui_event`) on the room Realtime channel. Host validates actions, runs the existing offline engine, and broadcasts state + UI events. Remotes do not authoritatively mutate; they apply snapshots and play **animations for every character** (walk, dice, portals, coin bursts — no silent teleports). AI runs on the host only. Envelope shape is **reusable for future games**; Space Board-specific fields live only inside `payload`.

**Blocked by:** 02 — Lobby: create / list / join by game_slug + waiting room + presence

**Status:** done

- [x] Shared `RoomEnvelope` type (`v`, `game_slug`, `kind`, `room_id`, `sent_at`, `sender_device_id?`, `payload`) lives in platform online module.
- [x] Space Board adapter maps roll / move / endTurn (and host AI turns) through envelopes end-to-end.
- [x] Second browser sees the other players’ characters animate, not only final positions.
- [x] Spectators receive state/ui_events but cannot successfully apply game actions.
- [x] Platform code does not hardcode Space Board payload fields into DB.
- [x] Offline single-device play remains intact.

## Comments

Host-authoritative play sync via versioned `RoomEnvelope` on `room:{id}` broadcast.

**Platform (`src/online/*`)**
- `envelope.ts`: `RoomEnvelope` + create/parse (opaque `payload`)
- `roomChannel.ts`: subscribe/broadcast `envelope` event
- `rooms.saveRoomLastState` / `fetchRoomLastState`: opaque `last_state` jsonb only
- `playSurface.ts`: game-agnostic `OnlinePlaySurface` prop; WaitingRoom mounts it when `playing` (no Space Board imports in platform)
- Persist gate so Online does not clobber Offline localStorage saves

**Space Board (`src/games/space-board/online/*`)**
- Payloads: `roll` | `move` | `endTurn` actions; `dice` | `walk` | `portal` | `coin_burst` ui_events; state snapshot
- `hostSession`: validates seat/turn; ignores spectators; emits ui_events then state
- `storeEngine` + `engineBridge`: host runs Zustand engine; AI turns on host only
- `remoteSession` + hydrate: remotes apply ui_events (animations) then state
- `OnlinePlay` wired from registry → PlaySession → WaitingRoom after Start

**Out of scope (later issues):** shop privacy (04), chat (05), host disconnect pause (06)

**Verify:** vitest `src/online` + `src/games/space-board/online` + persist gate — 51 passed; `tsc -b` clean
