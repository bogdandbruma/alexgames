# PR 2 Report — Single `players` commit per dice move

## Status
**Complete.** All merge criteria met.

## Changes

### Task 2.1 — Movement timing
- Added `src/game/movementConstants.ts` with `AVATAR_STEP_MS = 1_560`.
- Added `src/game/movementTiming.ts` with `getWalkDurationMs(stepCount)` matching the legacy loop (N step sleeps + one landing sleep when `stepCount > 0`).
- Added `src/game/movementTiming.test.ts` (legacy parity for 5 steps, zero/negative steps).

### Task 2.2 — `rollDice`
- Removed per-step `set` loop in `src/game/store.ts`; replaced with `await sleep(getWalkDurationMs(stepCount))` before landing resolution.
- **Win path fix:** `finished` outcome now sets `positionIndex: landingIndex` in the same `set` (previously relied on the step loop).
- Added `store.test.ts` case: subscribe during `rollDice`, assert at most two distinct `positionIndex` values for the moving player.
- Adjusted portal test: no longer expects intermediate board position mid-walk; asserts `pendingPortal` while avatar position stays at start until post-portal landing `set`.

## Verification
| Command | Result |
|---------|--------|
| `npm test` | 62/62 passed (10 files) |
| `npm run build` | Success |
| `npm run lint` | Success (pre-existing warning in `TriviaAnswerTimer.tsx`, unrelated) |

## Manual / 3D
Not run in this session. Avatar still receives a single `roomId` jump per landing `set`; walk duration unchanged, so route animation in `Avatar.tsx` should still cover the full path.

## Concerns
1. **Portal UX:** While `pendingPortal` is open, store position remains at the pre-move room until acknowledgement and the final landing `set`. Previously, intermediate steps showed the portal tile before ack. UI may need a follow-up if the overlay should reflect the portal room before teleport.
2. **Win path** was a latent dependency on the step loop; explicitly setting `positionIndex` on `finished` is required for correct persisted state after this refactor.

## Commit
Message: `perf: apply board position once per dice move after walk duration`  
SHA: `c18e58e`

---

## Follow-up fix — walk animation timing (task review)

### Status
**Complete.** Walk animation plays during `getWalkDurationMs` wait again; no per-step `positionIndex` updates.

### Change
- After `DICE_POST_REVEAL_MS`, when `stepCount > 0`: one `set` moves the active player to `landingIndex` (pre-portal tile), then `await sleep(getWalkDurationMs(stepCount))` so `Avatar` can animate on `roomId` change.
- Post-portal / room-entry `set` still applies `turnResult.positionId` (up to three distinct indices on portal rolls: start → portal tile → destination).
- Portal test: while `pendingPortal` is set, `positionIndex` is `21` (room 22 / portal source), not the pre-roll tile.

### Verification (2026-07-30)
| Command | Result |
|---------|--------|
| `npm test` | 62/62 passed (10 files) |
| `npm run build` | Success |
| `npm run lint` | Success (pre-existing `TriviaAnswerTimer.tsx` warning) |

### Commits
- `c18e58e` — `perf: apply board position once per dice move after walk duration`
- `063c825` — `fix: start walk position before timed wait`
