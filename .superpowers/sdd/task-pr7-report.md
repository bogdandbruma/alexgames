# PR 7 Report — Store extraction (7a + 7b)

## Status
**Complete.** Merge criteria met.

## Summary
Decomposed `src/game/store.ts` into focused modules under `src/game/store/` without changing gameplay. Public imports remain `from "../game/store"` via re-exports from `./store/types`.

## Changes

### 7a — Portal acknowledgement
- `src/game/store/portalAck.ts` — `PortalAcknowledgement` class and `portalAcknowledgement` singleton (`waitForAcknowledgement`, `completeAcknowledgement`).
- `src/game/store/portalTransitionId.ts` — `nextPortalTransitionId()`.
- `store.ts` wired to use these instead of module-level ack closures and `portalTransitionId` counter.

### 7b — Types, helpers, migrate, rollDice
- `src/game/store/types.ts` — game/store types, `PLAYER_NAME_MAX_LENGTH`, avatar/coin burst re-exports, `GameStoreSet`.
- `src/game/store/helpers.ts` — pure helpers (toasts, turn state, shop/inventory, portal transition factory, mystery application, timing constants).
- `src/game/store/migrate.ts` — `migratePersistedState`.
- `src/game/store/rollDice.ts` — `executeRollDice({ get, set })` with full former `rollDice` body.
- `src/game/store.ts` — slim zustand `create` + `persist`, actions delegating to helpers and `executeRollDice`.

## Verification
| Command | Result |
|---------|--------|
| `npm test` | 65/65 passed (13 files) |
| `npm run build` | Success |
| `npm run lint` | Success (pre-existing warning in `TriviaAnswerTimer.tsx`) |

## Merge criteria
- No gameplay changes; store public API unchanged.
- All tests, build, and lint pass.

## Commits (not pushed)
| SHA | Message |
|-----|---------|
| `8bb3ff4` | `refactor: extract portal acknowledgement from store` |
| `1d11b72` | `refactor: extract rollDice and store helpers` |

## Notes
- Unrelated WIP (modals, CSS, etc.) left unstaged per brief.
