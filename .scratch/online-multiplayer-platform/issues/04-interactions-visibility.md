# 04 — Space Board interactions sync + visibility rules

**What to build:** Online Space Board sync covers interactive rooms with the agreed visibility: **trivia** and **mystery** are fully public (question/card, outcome); **shop** purchase and inventories stay **private** until an item is **used** (use is public); trap/portal behave publicly as offline. Filtering happens in the Space Board adapter when building `state` / `ui_event` payloads — still no per-game DB tables.

**Blocked by:** 03 — Play sync: RoomEnvelope actions/state/ui_events + all-character animations

**Status:** done

- [x] Trivia: all clients see question, options, answerer, correct/wrong, coin effect.
- [x] Mystery: all clients see which card was drawn and its effect text.
- [x] Shop: others do not learn which item was bought; inventories not shown for other players; item **use** is visible.
- [x] Trap/portal (and related public overlays) sync for players and spectators.
- [x] Animations/overlays for these flows still play on remote clients.
- [x] Privacy rules enforced in outbound payloads (not via new Postgres columns).

## Comments

Space Board adapter filters outbound `state` per viewer; interaction actions route through host envelopes.

**Visibility (`visibility.ts`)**
- `filterSpaceBoardStateForViewer(state, viewerPlayerId)`: keep own inventory; strip others; mask `shopStock` so privately held items look available to non-holders; trivia/mystery/trap/portal `pendingEvent` unchanged; armed flags stay public
- Host emits one filtered `state` per seated player + a public `viewerPlayerId: null` snapshot (last_state / spectators)

**Payloads / host**
- Actions: `answerTrivia`, `pickMystery`, `acknowledgeMystery`, `buyShopItem`, `closeShop`, `useInventoryItem`, `resolveTrap`, `acknowledgePortal`
- `ui_event` `item_use` (public) from inventory diffs in `engineBridge`
- `storeEngine` + `OnlinePlay` wire interactions; overlays use `onlineActionsContext` (no local authoritative mutations online)

**Verify:** vitest 171 passed; `tsc -b` clean. No new Postgres columns.
