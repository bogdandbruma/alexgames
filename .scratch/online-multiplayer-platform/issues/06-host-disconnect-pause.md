# 06 — Host disconnect: pause ~90s, reconnect, or close

**What to build:** If the host’s presence drops during an online game, the room goes **`paused`**, clients see a banner, and game actions stop. If the same `device_id` reconnects within ~90s, the host reclaims and play resumes (`playing`) with a fresh `state` envelope. If the timeout expires, any still-connected client may mark the room **`closed`** and everyone returns to the lobby. No host transfer in v1. Logic uses generic room status + presence — reusable for future games.

**Blocked by:** 03 — Play sync: RoomEnvelope actions/state/ui_events + all-character animations

**Status:** done

- [x] Host leave → `paused` + visible banner + actions blocked on all clients.
- [x] Host return with same `device_id` within ~90s → resume + state resync.
- [x] After timeout → room `closed`; clients exit to lobby (first writer wins).
- [x] No automatic host transfer.
- [x] Behavior does not require game-specific DB fields.

## Comments

Platform-owned host disconnect lifecycle via generic `rooms.status` + presence only (no game-specific DB fields; no host transfer).

**Platform (`src/online/*`)**
- `hostLifecycle.ts`: `HOST_RECLAIM_TIMEOUT_MS = 90_000`, `decideHostLifecycle` / `applyHostLifecycleDecision`, `areGameActionsAllowed`
- `rooms.pauseRoom` / `resumeRoom` (host `device_id` only) / `closeRoom` (any client; first writer wins) — never mutates `host_device_id`
- `WaitingRoom`: presence → pause/resume/close; `HostPauseBanner` while paused; exit to lobby on `closed`
- `Lobby`: **Reintră** for paused/playing using existing membership (same `device_id`)

**Space Board**
- `OnlinePlay` respects `areGameActionsAllowed` (blocks send/handle while paused); host republishes `state` on pause→playing reclaim (hydrates from opaque `last_state` when remounting)

**Verify:** vitest 195 passed; `tsc -b` clean
