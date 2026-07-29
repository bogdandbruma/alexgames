# PR 3 Report — UI shell split

## Status
**Complete.** Merge criteria met. PR3 review blocker (victory overlay anchoring) fixed.

## Summary
Split the monolithic `SpaceBoardGame` into a thin layout shell, a message/HUD-focused `SpaceBoardPanel`, and a `memo`’d `BoardViewport` that owns `GameScene` and scene-adjacent overlays (dice tray, big roll, toast, map FAB, minimap, **victory overlay**). Shop, mystery, portal, target, and trivia modals render as siblings under `main`, each with its own store selectors. Dice UI lives under `src/games/space-board/dice/`.

## Changes

### `SpaceBoardPanel.tsx` (new)
- Left panel: setup flow and playing HUD.
- Subscribes to `message` and other panel fields; does not import `GameScene`.
- Inventory targeting calls `onRequestTargetItem` (orchestrator-owned `targetItemId`).

### `BoardViewport.tsx` (new)
- `React.memo` wrapper around `scene-container`, `GameScene`, `DiceTray`, `BigDiceRollOverlay`, `SceneToast`, map FAB, minimap modal, **`VictoryOverlay`** (uses `position: absolute` against `scene-container`).
- Store selectors: phase, players, dice fields, `uiToast`, `pendingTrivia` — **not** `message`.
- Accepts `onExit` for victory “In lobby” action.

### `SpaceBoardGame.tsx`
- Shell `main` class from `phase` only; `useAiDiceRoll`; `targetItemId` state.
- Renders `SpaceBoardPanel`, `BoardViewport`, and modal siblings.

### Modals (`modals/`)
- `VictoryOverlay` (rendered inside `BoardViewport` / `scene-container`), `PortalOverlay`, `MysteryOverlay`, `ShopOverlay`, `TargetOverlay` extracted from the old scene column.
- `MysteryCardDescription` shared helper for mystery copy.

### `dice/`
- `dicePips.ts`, `DiceFace`, `DiceCube`, `DiceTray`, `BigDiceRollOverlay` — behavior unchanged from pre-split inline code.

### `CoinAmount.tsx`, `useAiDiceRoll.ts`
- Shared coin markup for panel/toast; AI auto-roll hook lifted from the old root component.

### `BoardViewport.test.tsx` (new)
- Mocks `GameScene` / `SpaceMinimap`; asserts viewport render count unchanged when only `message` updates.

## Verification
| Command | Result |
|---------|--------|
| `npm test` | 63/63 passed (11 files) |
| `npm run build` | Success |
| `npm run lint` | Success (pre-existing warning in `TriviaAnswerTimer.tsx`) |

Post–review-blocker fix (same commands re-run): all green.

## Merge criteria
- `message` updates re-render `SpaceBoardPanel` only; `BoardViewport` covered by unit test (no extra renders on message-only `setState`).

## Commits (not pushed)
| SHA | Message |
|-----|---------|
| `87d906c` | `refactor: split space board panel, viewport, and modals` |
| `949f939` | `refactor: extract dice overlay components` |
| `ebea9f4` | `test: board viewport ignores message-only store updates` |
| `7dfbe2b` | `fix: add trapped field in BoardViewport test fixture` |
| `09262db` | `Revert "updates flav icon"` (unrelated favicon commit removed from branch) |
| `3eadb4e` | `fix: scope victory overlay to scene viewport` |

## Notes
- Victory overlay uses `position: absolute` and must live inside `scene-container`; other modals use `position: fixed` at `main` level.
- `TargetOverlay` still needs orchestrator state for `targetItemId` because the panel triggers targeting.
