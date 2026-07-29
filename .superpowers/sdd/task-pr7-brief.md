# PR 7 — Store extraction (7a + 7b)

**Goal:** Decompose `src/game/store.ts` without changing behavior. Keep public API: `import { useGameStore, ...types } from "../game/store"` unchanged (store.ts remains entry or re-exports).

## 7a — portalAck
- Create `src/game/store/portalAck.ts`: class or module `PortalAcknowledgement` with `waitForAcknowledgement(portalId)`, `completeAcknowledgement(portalId?)` — NO module-level mutable closures like current `resolvePortalAcknowledgement`.
- Export singleton `portalAcknowledgement` used by store.
- Create `src/game/store/portalTransitionId.ts`: `export function nextPortalTransitionId(): number`
- Move `createPortalTransition` to use `nextPortalTransitionId` (in helpers or portal file).

## 7b — types + helpers + rollDice
- Create `src/game/store/types.ts`: all exported types/constants currently in store.ts (`PlayerSetup`, `GamePlayer`, `GameState`, `PersistedState`, `GameToast`, pending types, `PLAYER_NAME_MAX_LENGTH`, re-exports of AvatarId burst if needed).
- Create `src/game/store/helpers.ts`: pure helpers moved from store.ts — sleep, dice timing, getNextPlayerIndex, getPlayerName, inventory helpers, toasts, createEndTurnState, createFinishedState, clearFinishedInteractiveState, purchaseShopItem, removeInventoryItem, applyPositionResultToPlayer, createPortalTransition, createPendingRoomActionState, shouldPauseForRoomAction, applyMysteryPlayersToStore, resolvePlayerRoomEntry, normalizePlayerSetup, normalizePlayerRuntimeState, defaultPlayers, initialPersistedState, getAffordableShopItems, hasRolledThisTurn, timing constants MYSTERY_COIN_TOAST_MS etc.
- Create `src/game/store/migrate.ts`: `migratePersistedState`
- Create `src/game/store/rollDice.ts`: export `async function executeRollDice(deps: { get: () => GameState; set: StoreSet }): Promise<void>` containing the full current rollDice body. Use `get().pickMysteryCard`, `get().acknowledgePortalTransition`, `get().acknowledgeMystery` for AI flows.
- Slim `src/game/store.ts`: imports, `create` + `persist`, wire actions calling helpers + `executeRollDice`, re-export all types from `./store/types`.

## Constraints
- No gameplay changes
- All tests pass (64+)
- build + lint
- One or two commits: `refactor: extract portal acknowledgement from store` and `refactor: extract rollDice and store helpers`

Do NOT touch unrelated WIP files (ConfirmLeaveGameModal, index.css, etc.)
